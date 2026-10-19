import {PlayStartup} from '../../src/ssg/game/authoring/play-startup';
import {workloads,repetitions,capacity,viewport,type Workload} from './workloads';
import {PerformanceRecorder,calibratePerformance,type PerformanceReport} from '../../src/ssg/game/runtime/diagnostics/performance';
const source=document.querySelector<HTMLMetaElement>('meta[name=game-source]')!.content;
const status=document.getElementById('status')!,results=document.getElementById('results')!,stage=document.getElementById('stage')!;
let busy=false;
let realmSerial=0;
type Packet={type:string;value?:any};
function realm(scene:string){
 const frame=document.createElement('iframe');frame.loading='eager';frame.name=scene==='sandbox'?'access-denied-editor-play:sandbox':'access-denied-editor-play:normal';frame.setAttribute('sandbox','allow-scripts');frame.width=String(viewport[0]);frame.height=String(viewport[1]);frame.style.border='0';
 const frameURL=new URL('./frame.html',location.href);frameURL.searchParams.set('realm',String(++realmSerial));
 const startup=new PlayStartup({attempt:realmSerial,scene,entry:frameURL.href});startup.fontsReady();let removed=false;
 const observe=()=>{document.getElementById('startup')!.textContent=JSON.stringify(startup.snapshot(),null,2);};
 const pending=new Map<string,{resolve:(p:Packet)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>(),early=new Map<string,Packet>();
 const fail=(error:Error)=>{startup.fail(error);observe();for(const item of pending.values()){clearTimeout(item.timer);item.reject(error);}pending.clear();early.set('error',{type:'error',value:error.message});};
 const receive=(e:MessageEvent)=>{if(removed||e.source!==frame.contentWindow||e.data?.channel!=='performance-workloads')return;const p=e.data as Packet;
  if(p.type==='startup'){if(startup.probe(p.value))observe();return;}
  if(p.type==='error'){fail(new Error(p.value));return;}
  if(p.type==='ready'){startup.runtimeReady();observe();}if(p.type==='running'){startup.running();observe();}
  const item=pending.get(p.type);if(item){clearTimeout(item.timer);pending.delete(p.type);item.resolve(p);}else early.set(p.type,p);};
 window.addEventListener('message',receive);
 const wait=(type:string)=>{if(early.has('error'))return Promise.reject(new Error(early.get('error')!.value));const found=early.get(type);if(found){early.delete(type);return Promise.resolve(found);}return new Promise<Packet>((resolve,reject)=>{if(pending.has(type))throw new Error('Duplicate frame wait: '+type);const timer=setTimeout(()=>{pending.delete(type);startup.wait();observe();reject(new Error('Missing frame '+type+' acknowledgement; waiting for '+startup.snapshot().waitingFor));},90000);pending.set(type,{resolve,reject,timer});});};
 frame.onload=()=>{if(!removed){startup.loaded();observe();}};frame.onerror=()=>{if(!removed)fail(new Error('Performance frame navigation error'));};startup.navigate();observe();frame.src=frameURL.href;stage.append(frame);
 return{wait,send:(type:string,data:object={})=>{if(removed)throw new Error('Removed performance realm');if(type==='start'){startup.startSent();observe();}frame.contentWindow!.postMessage({channel:'performance-workloads',type,...data},'*');},remove(){if(removed)return;removed=true;window.removeEventListener('message',receive);frame.onload=frame.onerror=null;for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Performance realm removed'));}pending.clear();early.clear();frame.remove();}};
}
function parentActivation(w:Workload){return new Promise<{owner:'parent';parentTrusted:boolean;childTrusted:false}>(resolve=>{const button=document.createElement('button');button.textContent='Begin '+w.id+' workload';button.onclick=event=>{const activation={owner:'parent' as const,parentTrusted:event.isTrusted,childTrusted:false as const};button.remove();resolve(activation);};stage.append(button);});}

async function archive(report:PerformanceReport){const response=await fetch('/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw new Error(await response.text());const saved=await response.json();if(saved.quality.status==='INVALID')throw new Error('Invalid recording archived at '+saved.file+': '+saved.quality.issues.join(', '));return saved.file as string;}
async function run(w:Workload,repeat:number,smoke:boolean){
 if(w.id==='private-play'){
  const calibration=calibratePerformance(),visibility=[{at:performance.now(),hidden:document.hidden}],recorder=new PerformanceRecorder({source,scenario:w.id+'/run-'+repeat,capacity,environment:{workload:w,smoke,userAgent:navigator.userAgent,viewport:[...viewport],dpr:devicePixelRatio,cpu:'unavailable',gpu:'unavailable',refreshRate:'unavailable',calibration,visibility,cache:'fresh iframe realm; browser process/cache may be warm'}}),cycles=[];
  for(let n=0;n<(smoke?1:w.operations);n++){const start=recorder.begin('play.start');const child=realm(w.scene);try{await child.wait('ready');child.send('start',{id:w.id,run:repeat,smoke});const opened=(await child.wait('running')).value;recorder.end(start);if(opened.source!==source||!opened.initialStorageEmpty)throw new Error('Private realm source/storage mismatch');const stop=recorder.begin('play.stop');child.send('stop');const stopped=(await child.wait('stopped')).value;child.remove();recorder.end(stop);cycles.push({opened,stopped,remainingFrames:stage.querySelectorAll('iframe').length});if(cycles.at(-1)!.remainingFrames!==0)throw new Error('Frame remains after Stop');}finally{child.remove();}}
  const report=recorder.stop();report.environment.cycles=cycles;return report;
 }
 const child=realm(w.scene);try{await child.wait('ready');const activation=w.lane==='live-game'?await parentActivation(w):undefined;child.send('start',{id:w.id,run:repeat,smoke,activation});return (await child.wait('report')).value as PerformanceReport;}finally{child.remove();}
}
async function suite(smoke:boolean,selected?:{id:string;repeat:number}){
 if(busy)return;busy=true;results.textContent='';const sentinel='performance-isolation-sentinel';localStorage.setItem(sentinel,source);
 try{for(const w of workloads.filter(w=>!selected||w.id===selected.id))for(let repeat=selected?.repeat??1;repeat<=(selected?.repeat??(smoke?1:repetitions));repeat++){
  status.textContent=(smoke?'Fixture validation':'Measuring')+' · '+w.id+' · '+repeat+'/'+(smoke?1:repetitions);
  const report=await run(w,repeat,smoke);if(localStorage.getItem(sentinel)!==source)throw new Error('Parent storage changed');
  if(report.source!==source||report.overflow||report.incomplete||report.invalidEnds)throw new Error('Incomplete/corrupt recording: '+report.scenario);
  const file=await archive(report),row=document.createElement('li');row.textContent=report.scenario+' · '+report.samples.length+' samples · '+file;results.append(row);await new Promise(resolve=>setTimeout(resolve,500));
 }status.textContent=smoke?'Fixture validation complete · not performance baselines':selected?'Selected repeat archived':'All six workloads archived · three repeats each';
 }catch(e){status.textContent='Stopped: '+String(e);}finally{localStorage.removeItem(sentinel);busy=false;}
}
document.getElementById('smoke')!.onclick=()=>void suite(true);
document.getElementById('run')!.onclick=()=>void suite(false);
const choices=document.getElementById('workload') as HTMLSelectElement;for(const w of workloads){const option=document.createElement('option');option.value=w.id;option.textContent=w.id;choices.append(option);}
document.getElementById('selected')!.onclick=()=>void suite(false,{id:choices.value,repeat:Number((document.getElementById('repeat') as HTMLSelectElement).value)});
