/** G1/G2 evidence. Run from repository root. --strict rejects every remaining finding. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root='packages/plaza-design-demo/src/ssg/game';
const posix=p=>p.replaceAll('\\','/');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.ts')?[path.join(d,e.name)]:[]);
const methods=new Set(['fillRect','strokeRect','clearRect','fillText','strokeText','drawImage','beginPath','createLinearGradient','createRadialGradient','ellipse','arc','fill','stroke','rect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo']);
const interfaces={
 'authoring/app.ts':'Composer canvas clearing',
 'authoring/selection-overlay.ts':'Composer selection and anchor overlay',
 'authoring/sequence-preview.ts':'Composer preview clearing and camera viewport overlay',
 'authoring/world-panel.ts':'Map panel background',
 'runtime/game.ts':'Interaction prompt, dialogue, HUD, tutorial/identity beat and sleep UI; world passes delegate to renderSceneFrame',
 'scenes/downtown/camera.ts':'In-terminal camera feed interface',
 'scenes/yard/camera.ts':'In-terminal camera feed interface',
 'scenes/stacks/scope.ts':'In-terminal crane scope interface',
 'story/cutscenes/index.ts':'Subtitle, letterbox and skip-prompt presentation',
 'ui/citymap.ts':'Canonical map interface, reused by composer',
 'ui/netmap.ts':'Network map interface',
 'ui/shift-guidance.ts':'Tutorial task guidance UI',
 'engine/toys/cipher.ts':'Terminal cipher toy interface',
 'engine/toys/morse.ts':'Terminal Morse toy interface',
 'engine/toys/rings.ts':'Terminal rings toy interface',
};
const pure={
 '../../world/light':new Set(['smooth','lerp','rel','FOV','RISE','SET','sunAt','moonAt','moonLit','moonPhase','moonName','lightAt','windowLit']),
 '../../world/transport/line':new Set(['clock','TRAIN','LOOP','SEG','SIDING']),
 '../../world/city':new Set(['LINE','STATIONS']),
};
const files=walk(root),findings=[],drawingOwners=[],imports=[],implicitLight=[],globals=[];
for(const p of files){
 const file=posix(p).slice(root.length+1),source=fs.readFileSync(p,'utf8'),sf=ts.createSourceFile(p,source,ts.ScriptTarget.Latest,true),art=file.startsWith('art/');
 const line=n=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
 const owner=n=>{let q=n.parent;while(q){if(ts.isFunctionLike(q)){if(q.name)return q.name.getText(sf);if(q.parent&&ts.isVariableDeclaration(q.parent))return q.parent.name.getText(sf);}q=q.parent;}return'module/anonymous';};
 const aliases=new Map();
 for(const n of sf.statements){
  if(art&&ts.isVariableStatement(n)&&!(n.declarationList.flags&ts.NodeFlags.Const))for(const d of n.declarationList.declarations){const row={file,line:line(d),name:d.name.getText(sf),initializer:d.initializer?.getText(sf),status:'mutable artwork presentation state requires explicit controller ownership'};globals.push(row);findings.push({gate:'G2',...row,kind:'mutable-module-presentation-state'});}
  if(art&&ts.isExportDeclaration(n)&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)&&!n.isTypeOnly){const target=posix(path.normalize(path.join(path.dirname(file),n.moduleSpecifier.text)));if(!target.startsWith('art/')&&(!n.exportClause||!ts.isNamedExports(n.exportClause)||n.exportClause.elements.some(e=>!e.isTypeOnly)))findings.push({gate:'G2',file,line:line(n),kind:'external-art-reexport',module:n.moduleSpecifier.text});}
  if(!art||!ts.isImportDeclaration(n)||!ts.isStringLiteral(n.moduleSpecifier))continue;
  const module=n.moduleSpecifier.text,clause=n.importClause;
  if(!module.startsWith('.')||!clause)continue;
  const resolved=posix(path.normalize(path.join(path.dirname(file),module)));
  if(resolved.startsWith('art/'))continue;
  const bindings=clause.namedBindings;
  const entries=bindings&&ts.isNamedImports(bindings)?bindings.elements.map(e=>({name:(e.propertyName??e.name).text,local:e.name.text,typeOnly:clause.isTypeOnly||e.isTypeOnly})): [{name:clause.name?.text??'*',local:clause.name?.text??'*',typeOnly:clause.isTypeOnly}];
  for(const e of entries){
   const status=e.typeOnly?'type contract':pure[module]?.has(e.name)?'pure helper or immutable metadata':'controller dependency';
   imports.push({file,line:line(n),module,resolved,symbol:e.name,status});aliases.set(e.local,e.name);
   if(status==='controller dependency')findings.push({gate:'G2',file,line:line(n),kind:'art-controller-import',symbol:e.name,module});
  }
 }
 function visit(n){
  if(art&&ts.isPropertyAccessExpression(n)&&n.name.text==='flags')findings.push({gate:'G2',file,line:line(n),owner:owner(n),kind:'art-save-flags-read'});
  if(ts.isCallExpression(n)){
   if(art&&ts.isIdentifier(n.expression)&&aliases.get(n.expression.text)==='windowLit'&&(n.arguments.length<2||n.arguments[1]?.getText(sf)==='undefined')){const row={file,line:line(n),owner:owner(n)};implicitLight.push(row);findings.push({gate:'G2',...row,kind:'implicit-global-window-light'});}
   if(ts.isPropertyAccessExpression(n.expression)&&methods.has(n.expression.name.text)){
    const receiver=n.expression.expression.getText(sf);
    // Array.fill and Popup.fill are not Canvas API calls. These exact receivers are inspected.
    const nonCanvas=(file==='world/cityplan.ts'&&n.expression.name.text==='fill'&&/^new (Float32Array|Uint8Array)\(/.test(receiver))||(file==='engine/popup.ts'&&receiver==='this'&&n.expression.name.text==='fill');
    const gameUI=file!=='runtime/game.ts'||new Set(['drawPrompt','drawBubble','drawHud','drawEnd','drawBeat','drawSleep','drawMap']).has(owner(n));
    if(!nonCanvas){const row={file,line:line(n),owner:owner(n),operation:n.expression.name.text,classification:art?'world-library':interfaces[file]&&gameUI?'interface':'unclassified',destination:art?file:interfaces[file]??null};drawingOwners.push(row);if(row.classification==='unclassified')findings.push({gate:'G1/G2',...row,kind:'unclassified-inline-drawing'});}
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(sf);
}

// Every original file receives concrete existing destinations. A scene adapter may remain,
// but its original drawing operations must belong to the library entries listed here.
const destinations={
 'characters.ts':['art/characters/appearance.ts','runtime/characters.ts'],
 'city.ts':['art/vehicles/cab.ts','art/assemblies/taxi-pad.ts','art/architecture/metro-stairs.ts','world/city.ts'],
 'companion.ts':['art/characters/pixel.ts','runtime/companion.ts'],
 'game.ts':['art/assemblies/downtown.ts','art/characters/player.ts','runtime/render-scene.ts','runtime/game.ts'],
 'title/index.ts':['art/sequences/opening/glide.ts','story/title/index.ts'],
 'scenes/build.ts':['art/assemblies/construction.ts'],'scenes/kit.ts':['art/core/primitives.ts'],
 'scenes/line.ts':['art/vehicles/platform-train.ts','art/signage/line-departures.ts','world/transport/line.ts'],
 'scenes/riders.ts':['art/characters/riders.ts'],'scenes/screens.ts':['art/signage/screens.ts'],
 'scenes/stations.ts':['art/assemblies/station-platform.ts','art/assemblies/galleria-station.ts','art/assemblies/harbor-station.ts'],
 'sprites.ts':['art/core/sprites.ts'],'skyline.ts':['art/environment/skyline.ts'],
 'sets/air-traffic.ts':['art/vehicles/air-traffic.ts'],'sets/lighting.ts':['art/atmosphere/lighting.ts'],'sets/weather.ts':['art/atmosphere/weather.ts'],
 'sets/containers.ts':['art/props/containers.ts'],'sets/crane.ts':['art/machinery/crane.ts'],'sets/palm.ts':['art/environment/palm.ts'],
 'sets/sea.ts':['art/environment/sea.ts'],'sets/sky.ts':['art/environment/sky.ts'],
 'sets/vehicles.ts':['art/vehicles/vehicles.ts'],'sets/train-car.ts':['art/vehicles/train-car.ts'],
 'sets/beach-bar.ts':['art/assemblies/beach-bar.ts'],'sets/beach-party.ts':['art/props/beach-party.ts'],
 'sets/cutaway.ts':['art/architecture/cutaway.ts'],'sets/downtown-towers.ts':['art/architecture/downtown-towers.ts'],
 'sets/galleria-dome.ts':['art/architecture/galleria-dome.ts'],'sets/line0.ts':['art/architecture/line0.ts'],
 'sets/ring-highway.ts':['art/architecture/ring-highway.ts'],'sets/spire.ts':['art/architecture/spire.ts'],
 'cutscenes/act2.ts':['art/sequences/act2.ts','story/cutscenes/index.ts'],
 'cutscenes/index.ts':['story/cutscenes/index.ts'],
};
const sceneArt={beach:'beach',capsule:'capsule-interior',downtown:'downtown',laundromat:'laundromat',library:'library',moth:'moth-interior',sandbox:'sandbox',stacks:'container-terminal',yard:'fixer-yard',harbor:'harbor-pier','harbor-shift':'dockwork',mall:'mall-details',market:'market-details',metro:'downtown-platform',shop:'corner-shop',train:'train-interior',warehouse:'warehouse'};
const argument=process.argv.indexOf('--baseline');
const baselineFile=argument>=0?process.argv[argument+1]:'.scene-system/evidence/coverage-inventory.json';
if(!baselineFile||!fs.existsSync(baselineFile))findings.push({gate:'G1',kind:'missing-original-inventory',file:baselineFile??null});
const baseline=fs.existsSync(baselineFile)?JSON.parse(fs.readFileSync(baselineFile,'utf8')):[];
const coverage=baseline.map(row=>{
 let targets=destinations[row.source];
 if(!targets&&row.source.startsWith('title/'))targets=['art/sequences/opening/'+row.source.slice(6),'story/title/index.ts'];
 const match=row.source.match(/^(?:scenes\/)?([^/]+)(?:\/scene|\/index)?\.ts$/);
 if(!targets&&match&&sceneArt[match[1]])targets=['art/assemblies/'+sceneArt[match[1]]+'.ts','scenes/'+match[1]+'/composition.ts'];
 if(!targets){const current=row.source.startsWith('engine/')?row.source:row.source==='cityplan.ts'?'world/cityplan.ts':row.source.includes('/camera.ts')||row.source==='stacks/scope.ts'?'scenes/'+row.source:['citymap.ts','netmap.ts','shift-guidance.ts'].includes(row.source)?'ui/'+row.source:null;if(current)targets=[current];}
 const missing=(targets??[]).filter(t=>!fs.existsSync(path.join(root,t)));
 const status=!targets?'unmapped':missing.length?'missing destination':'destinations present; pixel and composition evidence checked separately';
 if(status==='unmapped'||missing.length)findings.push({gate:'G1',file:row.source,kind:status,missing});
 return{source:row.source,classification:row.classification,destinations:targets??[],status,owners:row.owners.map(o=>({symbol:o.symbol,originalLine:o.line,destinations:targets??[]}))};
});
const report={schema:1,generatedFrom:'current source plus immutable original coverage inventory',counts:{originalFiles:coverage.length,originalOwners:coverage.reduce((n,r)=>n+r.owners.length,0),rawDrawingOperations:drawingOwners.length,artExternalImports:imports.length,findings:findings.length},coverage,drawingOwners,imports,implicitLight,mutableArtDeclarations:globals,findings};
fs.mkdirSync('.scene-system/evidence',{recursive:true});fs.writeFileSync('.scene-system/evidence/final-boundary-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,findings},null,2));
if(process.argv.includes('--strict')&&findings.length)process.exitCode=1;
