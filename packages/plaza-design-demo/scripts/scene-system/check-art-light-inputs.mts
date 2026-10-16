/** Prove the Light migration changes only input reads, never emitted artwork operations. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {frameView} from '../../src/ssg/game/art/core/view';
import {drawTowers,towers} from '../../src/ssg/game/art/core/primitives';
import {lightAt,setLight} from '../../src/ssg/game/world/light';
const root=path.resolve('../..'),arg=process.argv.indexOf('--source-root');
const original=arg<0?undefined:process.argv[arg+1];
const revision='094d0ab';
const files=['art/assemblies/beach.ts','art/assemblies/capsule-interior.ts','art/assemblies/downtown.ts','art/assemblies/harbor-station.ts','art/assemblies/laundromat.ts','art/assemblies/library.ts','art/assemblies/moth-interior.ts','art/environment/harbor-distance.ts','art/core/primitives.ts','art/architecture/downtown-towers.ts'];
function canonical(file:string,reverse:boolean,contents?:string){let source=contents??fs.readFileSync(file,'utf8');const sf=ts.createSourceFile(file,source,99,true);for(const n of sf.statements.filter(ts.isImportDeclaration).reverse())source=source.slice(0,n.getStart(sf))+source.slice(n.end);
 const parsed=ts.createSourceFile(file,source,99,true),factory=ts.factory;
 const transformed=ts.transform(parsed,[ctx=>node=>{
  const visit=(n:ts.Node):ts.VisitResult<ts.Node>=>{
   if(reverse){
    if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){
     if(n.expression.text==='windowLit'&&n.arguments.length===2)return factory.updateCallExpression(n,n.expression,n.typeArguments,[n.arguments[0]]);
     if(n.expression.text==='addLight'&&n.arguments.length===2)return factory.updateCallExpression(n,n.expression,n.typeArguments,[n.arguments[1]]);
     if(n.expression.text==='drawOutside'&&n.arguments.length===7)return factory.updateCallExpression(n,n.expression,n.typeArguments,n.arguments.slice(0,6));
    }
    if(ts.isFunctionDeclaration(n)&&n.name?.text==='drawOutside')return factory.updateFunctionDeclaration(n,n.modifiers,n.asteriskToken,n.name,n.typeParameters,n.parameters.filter(p=>p.name.getText(parsed)!=='lighting'),n.type,n.body&&ts.visitNode(n.body,visit) as ts.Block);
    if(ts.isPropertyAccessExpression(n)&&n.name.text==='lighting')return factory.createCallExpression(factory.createIdentifier(file.endsWith('downtown.ts')?'lightNow':'light'),undefined,[]);
    if(ts.isObjectLiteralExpression(n))return factory.updateObjectLiteralExpression(n,factory.createNodeArray(n.properties.filter(p=>!ts.isPropertyAssignment(p)||p.name.getText(parsed)!=='lighting').map(p=>ts.visitNode(p,visit) as ts.ObjectLiteralElementLike),n.properties.hasTrailingComma));
    if(ts.isIdentifier(n)&&n.text==='lighting'&&!(ts.isPropertyAccessExpression(n.parent)&&n.parent.name===n))return factory.createCallExpression(factory.createIdentifier('light'),undefined,[]);
   }
   return ts.visitEachChild(n,visit,ctx);
  };return ts.visitNode(node,visit) as ts.SourceFile;
 }]);
 const printed=ts.createPrinter({removeComments:true}).printFile(transformed.transformed[0] as ts.SourceFile);transformed.dispose();
 return ts.transpileModule(printed,{compilerOptions:{target:99,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
}
for(const file of files){const reference=original?fs.readFileSync(path.join(original,file),'utf8'):execFileSync('git',['show',revision+':packages/plaza-design-demo/src/ssg/game/'+file],{cwd:root,encoding:'utf8'});assert.equal(canonical(path.join(root,'packages/plaza-design-demo/src/ssg/game',file),true),canonical(file,false,reference),file+': artwork operation changed outside explicit light substitution');}
function record(){const ops:unknown[]=[],target:Record<string,unknown>={};const ctx=new Proxy(target,{get(t,k:string){return k in t?t[k]:(...args:unknown[])=>ops.push([k,...args]);},set(t,k:string,value){t[k]=value;ops.push([k,value]);return true;}}) as CanvasRenderingContext2D;return{ctx,ops};}
const row=towers(17,1400,[14,30],[40,100],.7),L=lightAt(1,23*60,90,null),view={...frameView(137,L),sx:(x:number,p=1)=>Math.round(x-140*p),y:(h:number)=>300-h,gy:300,cam:140,viewW:640,viewH:360};
const a=record(),b=record();setLight(lightAt(1,12*60,90,null));drawTowers(a.ctx,view,row,.7,300,.3);setLight(lightAt(5,3*60,270,null));drawTowers(b.ctx,view,row,.7,300,.3);assert.deepEqual(a.ops,b.ops,'drawTowers queried global light instead of View snapshot');
console.log('Art Light input checks: 10 complete emitted modules preserve every drawing operation after only explicit-input substitutions; tower rendering ignores changed global Light.');
