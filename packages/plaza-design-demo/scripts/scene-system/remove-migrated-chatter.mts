/** One-time source cleanup: keep talkability metadata, remove replaced actor words. */
import ts from 'typescript';import fs from 'node:fs';
const scene=process.argv[2];
if(!['stacks','market','sandbox','beach','harbor'].includes(scene))throw new Error('Explicit migrated scene required');
const file='src/ssg/game/scenes/'+scene+(['market','harbor'].includes(scene)?'/index.ts':'/scene.ts'),source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),changes:{start:number;end:number;text:string}[]=[];
const authored=JSON.parse(fs.readFileSync('src/ssg/game/scenes/'+scene+'/scene.json','utf8'));
function visit(n:ts.Node){if(ts.isObjectLiteralExpression(n)){
 const props=n.properties.filter(ts.isPropertyAssignment),id=props.find(p=>p.name.getText(tree)==='id'),talk=props.find(p=>p.name.getText(tree)==='talk'),name=props.find(p=>p.name.getText(tree)==='name');
 if(id&&ts.isStringLiteral(id.initializer)&&talk&&!(ts.isArrayLiteralExpression(talk.initializer)&&talk.initializer.elements.length===0)){const key=id.initializer.text;
  if(!authored.people?.some((p:any)=>p.id===key))throw new Error('Missing migrated actor '+key);
  changes.push({start:talk.initializer.getStart(tree),end:talk.initializer.end,text:'[]'});
  const lines=props.find(p=>p.name.getText(tree)==='lines');if(lines)changes.push({start:lines.initializer.getStart(tree),end:lines.initializer.end,text:'[]'});
  if(name)changes.push({start:name.initializer.getStart(tree),end:name.initializer.end,text:`${scene==='market'?'MARKET_SCENE':'content.scene'}.people!.find(p=>p.id===${JSON.stringify(key)})!.name`});
 }
}ts.forEachChild(n,visit);}visit(tree);
let result=source;for(const c of changes.sort((a,b)=>b.start-a.start))result=result.slice(0,c.start)+c.text+result.slice(c.end);
fs.writeFileSync(file,(scene==='market'||source.includes("import {content} from './scene-document'")?'':"import {content} from './scene-document';\n")+result);console.log('Removed '+changes.length+' migrated actor text/name initializers from '+file);
