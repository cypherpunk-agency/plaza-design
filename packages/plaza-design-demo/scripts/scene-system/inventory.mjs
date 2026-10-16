import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=process.argv.includes('--current')?'packages/plaza-design-demo/src/ssg/game':'.scene-system/baseline/source/ssg/game';
const sources=[];
function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(p.endsWith('.ts')&&!p.includes('scripts'))sources.push(p);}}
walk(root);
const canvas=/^(fillRect|strokeRect|clearRect|fillText|strokeText|drawImage|beginPath|createLinearGradient|createRadialGradient|ellipse|arc|fill|stroke|rect|moveTo|lineTo|bezierCurveTo|quadraticCurveTo)$/;
const compositionCall=/^(draw[A-Z]\w*|box|stall|booth|facade|shelf|fridge|clutter|bench|stool|lamp|bin|bollard|vending|container|stack|\w+Screen|\w+Sign)$/;
const inventory=[];
for(const file of sources){const text=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),owners=new Map();function visit(n){if(ts.isCallExpression(n)&&((ts.isPropertyAccessExpression(n.expression)&&canvas.test(n.expression.name.text))||(ts.isIdentifier(n.expression)&&compositionCall.test(n.expression.text)))){let owner=n.parent;while(owner&&!ts.isFunctionLike(owner))owner=owner.parent;const start=owner?.getStart(sf)??0;const name=owner?.name?.getText(sf)??(owner?.parent&&ts.isVariableDeclaration(owner.parent)?owner.parent.name.getText(sf):'module/anonymous');const key=start+':'+name;if(!owners.has(key))owners.set(key,{symbol:name,line:sf.getLineAndCharacterOfPosition(start).line+1,calls:0});owners.get(key).calls++;}ts.forEachChild(n,visit);}visit(sf);if(owners.size){const rel=file.replaceAll('\\','/').slice(root.length+1);const ui=/^(engine\/|citymap|netmap|menu|terminal|transport|shift-guidance|keybar|boot)/.test(rel);inventory.push({source:rel,classification:ui?'interface-review':'world',destination:ui?'classify UI/world boundaries':'art/category pending',status:'not migrated',imports:sf.statements.filter(n=>ts.isImportDeclaration(n)).map(n=>n.moduleSpecifier.text),owners:[...owners.values()]});}}
fs.mkdirSync('.scene-system/evidence',{recursive:true});
const categories={ 'scenes/build.ts':'art/furniture + architecture + props', 'scenes/kit.ts':'art/core', 'scenes/screens.ts':'art/signage + electronics', 'characters.ts':'art/characters', 'sprites.ts':'art/core/sprites', 'companion.ts':'art/characters/companion (controller stays)', 'skyline.ts':'art/environment/skyline', 'city.ts':'art/vehicles + architecture (world data stays)', 'game.ts':'art/assemblies/downtown + characters + atmosphere (UI/orchestration stays)' };
for(const file of inventory){
 const ui=/^(ui\/|engine\/|citymap|netmap|menu|terminal|transport|shift-guidance|keybar|boot)/.test(file.source)||/^(?:scenes\/)?(downtown\/camera|yard\/camera|stacks\/scope)\.ts$/.test(file.source)||/^(?:story\/)?cutscenes\/index\.ts$/.test(file.source);
 file.classification=/(^|\/)cityplan\.ts$/.test(file.source)?'non-drawing-array-fill':file.source.startsWith('art/')?'world-library':ui?'interface':'world';
 file.destination=file.classification==='non-drawing-array-fill'?'keep geometry; Array.fill is not canvas':ui?'retain interface/controller; shared world calls go through art':categories[file.source]??(file.source.startsWith('sets/')?'art/'+(/lighting|weather/.test(file.source)?'atmosphere/':'environment/')+file.source.slice(5):'art/assemblies/'+file.source.replace(/\/scene\.ts$/, '').replace(/^scenes\//,'').replace(/\.ts$/,''));
 file.scopeNote=ui?'Inspect shared world calls during migration; interface drawing remains separate.':'Extract original operations, then split independently placeable objects; destination is a category/assembly home, not permission for opaque scene wrappers.';
 if(file.classification==='world-library'){file.destination=file.source;file.status='in library; catalog/composition coverage still requires verification';}
}
fs.writeFileSync('.scene-system/evidence/'+(process.argv.includes('--current')?'current-drawing-inventory.json':'coverage-inventory.json'),JSON.stringify(inventory,null,2));
console.log(JSON.stringify({drawingFiles:inventory.length,owners:inventory.reduce((n,f)=>n+f.owners.length,0),classifications:inventory.reduce((out,f)=>(out[f.classification]=(out[f.classification]??0)+1,out),{})},null,2));
