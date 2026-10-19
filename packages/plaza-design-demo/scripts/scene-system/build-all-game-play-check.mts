/** Technical startup acceptance, not a campaign playthrough. Uses the real packaged Play entry. */
import fs from 'node:fs';import path from 'node:path';
import {gameplayScenes} from '../../src/ssg/game/authoring/gameplay-scenes';
import {defaultPlayFixture,playScenes} from '../../src/ssg/game/authoring/play-fixtures';
import {OPENING} from '../../src/ssg/game/story/opening';
const home=path.resolve('dist-homepage'),output=path.resolve('../../.scene-system/all-game-play-check');fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(home,'editor/build-manifest.json'),'utf8')),documents=JSON.parse(fs.readFileSync(path.join(home,'editor/documents.json'),'utf8')) as {id:string;value:unknown}[],lookup=new Map(documents.map(d=>[d.id,d.value]));
const source=/name="game-source" content="([^"]+)"/.exec(fs.readFileSync(path.join(home,'editor',manifest.play.entry),'utf8'))![1];
const cases=playScenes.map(id=>{const registered=gameplayScenes.find(s=>s.id===id);if(!registered)throw new Error('Missing authored source '+id);const fixture=defaultPlayFixture(id);if(id!=='harborShift')fixture.flags=Object.fromEntries(Object.values(OPENING).map(flag=>[flag,true]));return{fixture,composition:lookup.get(id),sceneDocument:lookup.get(registered.prefix+'-scene'),gameplay:lookup.get(registered.gameplayId),...(id==='sandbox'?{behavior:lookup.get('sandbox-behavior')}:{})};});
const config={version:1,scope:'all 19 opaque private Play startups with technical opening-complete fixtures; no inputs or campaign progression',source,runtime:manifest.play,cases};fs.writeFileSync(path.join(output,'config.json'),JSON.stringify(config,null,2)+'\n');
const browser=`const config=${JSON.stringify(config).replaceAll('<','\\u003c')};
const rows=[],status=document.getElementById('status'),results=document.getElementById('results'),viewport=document.getElementById('viewport');
async function check(value,fonts){return new Promise(resolve=>{
 const frame=document.createElement('iframe');frame.name='access-denied-editor-play'+(value.fixture.scene==='harborShift'?'':value.fixture.scene==='sandbox'?':sandbox':':normal');frame.setAttribute('sandbox','allow-scripts');frame.title=value.fixture.scene+' technical startup';frame.src='./runtime/'+config.runtime.entry+'?fixture='+encodeURIComponent(value.fixture.scene);
 let loaded=false,scriptEntered=false,ready=false,running=false,states=0,paintCalls=0,nativeStorage=0,error=null,receivedScene=null,inaccessible=false,settled=false;
 const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',receive);const row={scene:value.fixture.scene,loaded,scriptEntered,ready,visibility:document.visibilityState,running,receivedScene,states,paintCalls,nativeStorage,inaccessible,sandbox:frame.sandbox.value,error};row.status=!error&&running&&states>=2&&paintCalls>0&&nativeStorage===0&&inaccessible&&row.sandbox==='allow-scripts'&&receivedScene===row.scene?'PASS':'FAIL';frame.remove();resolve(row);};
 const receive=event=>{if(event.source!==frame.contentWindow)return;const data=event.data;if(data?.channel==='editor-play'){
  if(data.type==='ready'){ready=true;try{void frame.contentWindow.document;}catch{inaccessible=true;}frame.contentWindow.postMessage({channel:'editor-play',type:'start',value:{...value,fonts}},'*');}
  else if(data.type==='running'){running=true;receivedScene=data.value.scene;}
  else if(data.type==='state'){states++;receivedScene=data.value.scene;if(states>=2&&paintCalls>0)finish();}
  else if(data.type==='error'){error=String(data.value);finish();}
 }else if(data?.channel==='all-game-play-check'){
  if(data.type==='script')scriptEntered=true;if(data.type==='paint')paintCalls=data.value;if(data.type==='storage'){nativeStorage++;error='Native storage accessed';finish();}if(data.type==='error'){error=String(data.value);finish();}
 }};
 window.addEventListener('message',receive);const timer=setTimeout(()=>{error='Startup timeout: html='+loaded+', script='+scriptEntered+', ready='+ready+', visibility='+document.visibilityState;finish();},12000);frame.onload=()=>{loaded=true;};viewport.replaceChildren(frame);
});}
async function run(){const fonts=await Promise.all([400,500,600,700].map(async weight=>({weight,bytes:await(await fetch('./fonts/ibm-plex-mono-latin-'+weight+'-normal.woff2')).arrayBuffer()})));
 for(const value of config.cases){status.textContent='Checking '+value.fixture.scene+' ('+(rows.length+1)+'/19)';const row=await check(value,fonts);rows.push(row);const item=document.createElement('li');item.textContent=row.scene+': '+row.status+(row.error?' — '+row.error:'');results.append(item);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
 const result={version:1,scope:config.scope,source:config.source,runtime:config.runtime,status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',cases:rows.length,rows};status.textContent=result.status+': '+rows.length+' private Play startups';document.title='All-scene private Play: '+result.status;
 const response=await fetch('./report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});document.getElementById('archive').textContent=response.ok?'Evidence saved: '+await response.text():'Evidence archive failed: '+response.status;viewport.replaceChildren();
}run().catch(error=>{status.textContent='ERROR '+error;document.title='All-scene private Play: ERROR';});`;
fs.writeFileSync(path.join(output,'check.js'),browser);
fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><title>All-scene private Play</title><style>body{background:#111;color:#eee;font:14px monospace}#viewport{position:fixed;top:200px;left:8px;background:#111}iframe{width:960px;height:540px;border:1px solid #555}</style></head><body><h1>All 19 private Play startups</h1><p>Real game entry, opaque frames, storage traps, paint observation. No player inputs or campaign playthrough.</p><p id="status">Starting</p><p id="archive">Evidence pending</p><ol id="results"></ol><div id="viewport"></div><script src="./check.js"></script></body></html>');
console.log('Built all-scene private Play startup check: '+output);
