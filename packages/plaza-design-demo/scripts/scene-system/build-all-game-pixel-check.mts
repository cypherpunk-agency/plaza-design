/** Local technical fixture: rasterize frozen and current native scene previews side by side. */
import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';
import {gameSourceIdentity} from './source-identity.mts';
const game=path.resolve('src/ssg/game'),baseline=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),output=path.resolve('../../.scene-system/all-game-pixel-check');
if(!fs.existsSync(path.join(baseline,'authoring/native-preview.ts')))throw new Error('Capture the immutable source baseline first');
fs.mkdirSync(output,{recursive:true});
const inventory=JSON.parse(fs.readFileSync('scripts/scene-system/fixtures/all-game-initial-inventory.json','utf8'));
const compositions=Object.fromEntries(inventory.rows.map((r:{id:string})=>[r.id,JSON.parse(fs.readFileSync(path.join(baseline,'scenes',r.id==='harborShift'?'harbor-shift':r.id,'composition.json'),'utf8'))]));
// Compare each renderer's actual source composition. Migrations may replace invisible markers
// with explicit actor records; feeding the old composition to both would skip shipping source.
const currentCompositions=Object.fromEntries(inventory.rows.map((r:{id:string})=>[r.id,JSON.parse(fs.readFileSync(path.join(game,'scenes',r.id==='harborShift'?'harbor-shift':r.id,'composition.json'),'utf8'))]));
const deviceIds=['capsule','yard','downtown','moth','beach','laundromat','library','stacks','train','sandbox'],deviceDocuments=Object.fromEntries(deviceIds.map(id=>[id,JSON.parse(fs.readFileSync(path.join(game,'scenes',id,'devices.json'),'utf8'))]));
const source=`
import {createNativePreview as oldPreview} from ${JSON.stringify(path.join(baseline,'authoring/native-preview.ts'))};
import {nativeSceneAdapters as oldAdapters} from ${JSON.stringify(path.join(baseline,'authoring/scene-adapters.ts'))};
import {createNativePreview} from ${JSON.stringify(path.join(game,'authoring/native-preview.ts'))};
import {nativeSceneAdapters} from ${JSON.stringify(path.join(game,'authoring/scene-adapters.ts'))};
import {drawCityMap as oldDrawMap,openMap as oldOpenMap} from ${JSON.stringify(path.join(baseline,'ui/citymap.ts'))};
import {drawCityMap,openMap} from ${JSON.stringify(path.join(game,'ui/citymap.ts'))};
import * as shippingCity from ${JSON.stringify(path.join(game,'world/city.ts'))};
import {createLineSystem} from ${JSON.stringify(path.join(game,'world/transport/line.ts'))};
import {applyDeviceSource} from ${JSON.stringify(path.join(game,'authoring/device-sources.ts'))};
const deviceDocuments=${JSON.stringify(deviceDocuments)};
const currentDocuments=${JSON.stringify(currentCompositions)},documents=${JSON.stringify(compositions)},old=oldPreview(oldAdapters),current=createNativePreview(nativeSceneAdapters);
const rows=[],configs=[
 {width:640,height:360,minute:580,time:0,weather:'clear',reduced:false,hack:false},
 {width:960,height:540,minute:0,time:2.25,weather:'rain',reduced:false,hack:false},
 {width:1280,height:720,minute:1100,time:5,weather:'storm',reduced:false,hack:false},
 {width:400,height:900,minute:1200,time:3.3,weather:'fog',reduced:true,hack:false},
 {width:960,height:540,minute:580,time:1,weather:'clear',reduced:false,hack:true}];
async function run(){
 await Promise.all([400,500,600,700].map(w=>document.fonts.load(w+' 12px "IBM Plex Mono"')));await document.fonts.ready;
 for(const [id,composition]of Object.entries(documents))for(let index=0;index<configs.length;index++){
  const c=configs[index],a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=c.width;a.height=b.height=c.height;
  let different=0,maxDelta=0,error=null;
  try{const request={composition,time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:index%2?Math.min(300,Number(composition.instances.find(n=>n.id==='scene')?.props.width??640)/4):0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}};
   old.render(a,request);current.render(b,{...request,composition:currentDocuments[id]});
   const before=a.getContext('2d').getImageData(0,0,c.width,c.height).data,after=b.getContext('2d').getImageData(0,0,c.width,c.height).data;
   for(let p=0;p<before.length;p+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(before[p+k]-after[p+k]);maxDelta=Math.max(maxDelta,delta);if(delta)changed=true;}if(changed)different++;}
  }catch(e){error=String(e);}
  rows.push({scene:id,case:index,...c,different,maxDelta,error});
  if(different||error){const section=document.createElement('section'),title=document.createElement('h2');title.textContent=id+' / '+index+' / '+(error??different+' differing pixels');section.append(title,a,b);document.body.append(section);}
 }
 const boundRows=[];
 for(const id of ['metro','galleriaStation','harborStation','train'])for(const [index,c]of configs.entries()){
  const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=c.width;a.height=b.height=c.height;let different=0,maxDelta=0,error=null;
  try{const request={composition:documents[id],time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}};
   oldPreview(oldAdapters).render(a,request);createNativePreview(nativeSceneAdapters,scene=>scene.bindWorld?.({city:shippingCity,metro:createLineSystem()})??scene).render(b,{...request,composition:currentDocuments[id]});
   const before=a.getContext('2d').getImageData(0,0,c.width,c.height).data,after=b.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let p=0;p<before.length;p+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(before[p+k]-after[p+k]);maxDelta=Math.max(maxDelta,delta);if(delta)changed=true;}if(changed)different++;}
  }catch(e){error=String(e);}
  boundRows.push({scene:id,case:index,...c,different,maxDelta,error});if(different||error){const section=document.createElement('section'),title=document.createElement('h2');title.textContent='Bound metro '+id+' / '+index+' / '+(error??different+' differing pixels');section.append(title,a,b);document.body.append(section);}
 }
 const deviceRows=[];
 for(const id of Object.keys(deviceDocuments))for(const [index,c]of configs.entries()){
  const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=c.width;a.height=b.height=c.height;let different=0,maxDelta=0,error=null;
  try{const request={composition:documents[id],time:c.time,reduced:c.reduced,overlays:false,environment:{day:1,minute:c.minute,seed:3,weather:c.weather,cameraX:0,zoom:1,flags:'{}',state:'{}',hack:c.hack,hover:''}};
   oldPreview(oldAdapters).render(a,request);createNativePreview(nativeSceneAdapters,(scene,request)=>applyDeviceSource(id,scene,request.composition,deviceDocuments[id])).render(b,{...request,composition:currentDocuments[id]});
   const before=a.getContext('2d').getImageData(0,0,c.width,c.height).data,after=b.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let p=0;p<before.length;p+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(before[p+k]-after[p+k]);maxDelta=Math.max(maxDelta,delta);if(delta)changed=true;}if(changed)different++;}
  }catch(e){error=String(e);}
  deviceRows.push({scene:id,case:index,...c,different,maxDelta,error});if(different||error){const section=document.createElement('section'),title=document.createElement('h2');title.textContent='Pending device source '+id+' / '+index+' / '+(error??different+' differing pixels');section.append(title,a,b);document.body.append(section);}
 }
 const mapRows=[],mapConfigs=[
  {name:'street-known',width:960,height:540,scene:'downtown',layer:'street',mode:'view',all:true},
  {name:'street-sparse',width:640,height:360,scene:'downtown',layer:'street',mode:'view',all:false},
  {name:'district-downtown',width:960,height:540,scene:'downtown',layer:'street',mode:'view',all:true,zoomed:true},
  {name:'metro-ride',width:1280,height:720,scene:'train',layer:'metro',mode:'view',all:true,ride:{from:'downtown',to:'galleria',f:.5}},
  {name:'taxi-closed',width:960,height:540,scene:'downtown',layer:'above',mode:'taxi',all:true,closed:true},
  {name:'taxi-open',width:960,height:540,scene:'harbor',layer:'above',mode:'taxi',all:true},
  {name:'below',width:960,height:540,scene:'downtown',layer:'below',mode:'view',all:true},
  {name:'portrait-flat',width:400,height:900,scene:'harbor',layer:'street',mode:'view',all:true,flat:true,reduced:true}];
 for(const [index,c]of mapConfigs.entries()){
  const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=c.width;a.height=b.height=c.height;let different=0,maxDelta=0,error=null;
  try{for(const [canvas,open,draw]of [[a,oldOpenMap,oldDrawMap],[b,openMap,drawCityMap]]){const view=open(c.mode,c.scene,c.ride?.from??null);view.layer=c.layer;view.flat=!!c.flat;view.zoomed=!!c.zoomed;view.zoomAt=0;if(c.zoomed)view.district=0;draw(canvas.getContext('2d'),c.width,c.height,{view,scene:c.scene,ride:c.ride??null,seen:id=>c.all||id==='downtown',flag:id=>!!c.all&&id.startsWith('mapped:'),gateOpen:!!c.all,exitAccess:()=>({ok:!!c.all,reason:'THE MARKET GATE IS SHUT',index:0,hidden:false}),harborOpen:!c.closed,tokens:1,t:120,reduced:!!c.reduced,touch:false,tapMin:22,avoid:null,rememberPreferences:false});}
   const before=a.getContext('2d').getImageData(0,0,c.width,c.height).data,after=b.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let p=0;p<before.length;p+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(before[p+k]-after[p+k]);maxDelta=Math.max(maxDelta,delta);if(delta)changed=true;}if(changed)different++;}
  }catch(e){error=String(e);}
  mapRows.push({case:index,...c,different,maxDelta,error});if(different||error){const section=document.createElement('section'),title=document.createElement('h2');title.textContent='Map '+c.name+' / '+(error??different+' differing pixels');section.append(title,a,b);document.body.append(section);}
 }
 const result={compositionPolicy:'frozen-original-versus-current-source',deviceCases:deviceRows.length,deviceRows,boundCases:boundRows.length,boundRows,mapCases:mapRows.length,mapRows,status:deviceRows.every(r=>!r.error&&!r.different)&&boundRows.every(r=>!r.error&&!r.different)&&rows.every(r=>!r.error&&!r.different)&&mapRows.every(r=>!r.error&&!r.different)?'PASS':'FAIL',baseline:${JSON.stringify(inventory.sourceFingerprint)},source:${JSON.stringify(gameSourceIdentity(game))},cases:rows.length,scenes:Object.keys(documents).length,rows};
 document.getElementById('result').textContent=JSON.stringify(result,null,2);
 document.title='Native raster parity: '+result.status;
 try{const saved=await fetch('/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});if(!saved.ok)throw new Error('HTTP '+saved.status);document.getElementById('archive').textContent='Evidence saved: '+(await saved.text());}catch(error){document.getElementById('archive').textContent='Evidence not archived: '+error;}
 const download=document.createElement('a');download.textContent='Download evidence JSON';download.download='all-game-raster-evidence.json';download.href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));document.body.prepend(download);
}run().catch(e=>{document.getElementById('result').textContent='ERROR '+e;});`;
await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'all-game-raster-fixture.ts',loader:'ts'},outfile:path.join(output,'check.js'),bundle:true,platform:'browser',format:'iife',target:'es2022',logLevel:'warning'});
const fontDir=path.resolve('dist-homepage/fonts');fs.mkdirSync(path.join(output,'fonts'),{recursive:true});for(const f of fs.readdirSync(fontDir))fs.copyFileSync(path.join(fontDir,f),path.join(output,'fonts',f));
const fonts=[400,500,600,700].map(w=>`@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:${w};src:url('./fonts/ibm-plex-mono-latin-${w}-normal.woff2')}`).join('\n');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Native raster parity</title><style>${fonts}\nbody{background:#111;color:#eee;font:13px monospace}canvas{max-width:48%;border:1px solid #777}pre{white-space:pre-wrap}</style></head><body><h1>Frozen baseline versus current native renderer</h1><p id="archive">Evidence pending</p><pre id="result" role="status">RUNNING</pre><script src="./check.js"></script></body></html>`);
console.log('Built 19-scene raster parity fixture: '+output);
