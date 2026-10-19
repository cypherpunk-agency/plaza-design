/** Local-only trusted runner, built under ignored .performance; never a production entry. */
import {Game} from '../../src/ssg/game/runtime/game';
import {SCENES} from '../../src/ssg/game/scenes';
import {defaultPlayFixture,fixtureSave,type PlayScene} from '../../src/ssg/game/authoring/play-fixtures';
import {gameStorage,capturePrivateStorage} from '../../src/ssg/game/runtime/storage';
import {EDITOR_PLAY,SAVE_KEY} from '../../src/ssg/game/runtime/mode';
import {setOverride,weatherNow,sceneClimate} from '../../src/ssg/game/world/weather';
import {startPerformance,stopPerformance,calibratePerformance,perfBegin,perfEnd} from '../../src/ssg/game/runtime/diagnostics/performance';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {nativeGameplayPort,attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {workshopScene} from '../../src/ssg/game/demo/workshop';
import {workload,capacity} from './workloads';
if(!EDITOR_PLAY)throw new Error('Performance frame requires private editor realm');
const source=document.querySelector<HTMLMetaElement>('meta[name=game-source]')!.content;
const send=(type:string,value?:unknown)=>parent.postMessage({channel:'performance-workloads',type,value},'*');
window.addEventListener('error',e=>send('error','Frame script error: '+(e.error?.stack??e.message)));
window.addEventListener('unhandledrejection',e=>send('error','Frame promise error: '+String(e.reason)));
const wait=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const frames=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
const key=(key:string)=>{window.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));};
let game:Game|undefined,started=false,model:SceneModel|undefined,shared:GameplaySession|undefined,tick:ReturnType<typeof setInterval>|undefined;
const visibility:{at:number;hidden:boolean}[]=[];
document.addEventListener('visibilitychange',()=>{if(visibility.length<128)visibility.push({at:performance.now(),hidden:document.hidden});});
function snapshot(){return {source,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,hardwareConcurrency:navigator.hardwareConcurrency,cpu:'unavailable',gpu:'unavailable',refreshRate:'unavailable',measurement:'CPU submission; not presented frames',backingCanvas:[document.querySelector('canvas')?.width??null,document.querySelector('canvas')?.height??null]};}
function close(){if(tick!==undefined)clearInterval(tick);tick=undefined;shared?.dispose();model?.reset();model?.setPaused(true);game?.stop();}
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.data?.channel!=='performance-workloads')return;
 if(event.data.type==='stop'){close();send('stopped',{private:EDITOR_PLAY,keys:Object.keys(capturePrivateStorage().local),frames:document.querySelectorAll('canvas').length});return;}
 if(event.data.type!=='start'||started)return;started=true;
 try{
  const w=workload(event.data.id),run=event.data.run,smoke=event.data.smoke===true;if(!Number.isInteger(run)||run<1||run>3)throw new Error('Invalid repeat');
  const initialStorage=capturePrivateStorage();if(Object.keys(initialStorage.local).length||Object.keys(initialStorage.session).length)throw new Error('Fresh realm contains private storage');
  await Promise.all([400,500,600,700].map(n=>document.fonts.load(n+' 16px "IBM Plex Mono"')));await document.fonts.ready;
  let trustedActivation:boolean|null=null;
  if(w.lane==='live-game')await new Promise<void>(resolve=>{const b=document.createElement('button');b.textContent='Begin native workload';b.style.cssText='position:fixed;top:4px;left:4px;z-index:99999;padding:12px';b.onclick=e=>{trustedActivation=e.isTrusted;b.remove();resolve();};document.body.append(b);});
  const calibration=calibratePerformance();
  const f=defaultPlayFixture(w.scene as PlayScene);f.day=1;f.seed=3;f.minute=w.minute;f.weather=w.weather;f.clock='fixed';f.flags={'opening:jacked':true,'opening:uplink':true};
  setOverride('city',w.weather);
  let actionCount=0,boardOpens=0,boardCloses=0;const visits:string[]=[];
  if(w.id==='demo-fanout'){
   const def=workshopScene(),state:GameplayState={flags:{},items:{},tokens:0,values:{sandbox:{}}};
   model=new SceneModel({say:()=>{},open:()=>{},changed:()=>{}},def.data!,def.rules as any,undefined,undefined,undefined,state.values!.sandbox);
   shared=new GameplaySession(def.gameplay!,nativeGameplayPort(def.gameplay!,{read:()=>state,write:next=>{next.values=mergeValues(state.values??={},next.values??{});Object.assign(state,next);}},()=>model!));attachNativeGameplay(model,shared);
   for(const[to,verb]of [['lamp.lamp','on'],['fan.fan','spin']]){const result=model.connect('button.button:pressed',to,verb);if(result[2]==='err')throw new Error('Fan-out fixture refused: '+result[1]);}let last=performance.now();tick=setInterval(()=>{const now=performance.now();const token=perfBegin('host.tick','isolated-demo-model');try{model!.tick(now-last,true);last=now;}finally{perfEnd(token);}},50);
  }else{
   const save=fixtureSave(f);if(w.id==='board-cycles'){const d=SCENES.library.data!;(save.gameplay??={}).library={...d.state};save.scenes.library={goals:[],links:d.cables.map(c=>({from:c.from,to:c.to,verb:c.verb})),logic:[],board:{known:d.devices.map(d=>d.id),pos:{},offsets:{}}};}
   gameStorage.setItem(SAVE_KEY,JSON.stringify(save));
   const windowEl=document.querySelector<HTMLElement>('.demo-window')!;
   game=new Game({windowEl,header:windowEl.querySelector('header')!,footer:windowEl.querySelector('footer')!,inputHost:document.getElementById('input-host')!,onExit:()=>{},setNodes:()=>{},setScene:()=>{}},SCENES,'fixed',true);
   game.start(w.scene as PlayScene);await frames();
   const canvas=windowEl.querySelector('canvas')!;canvas.focus();
   // The fixture explicitly suppresses arrival pages by advancing them through the normal E handler.
   for(let n=0;n<16&&game.inspect().dialogue;n++)key('e');
  }
  if(w.id==='private-play'){game!.checkpoint();send('running',{...snapshot(),initialStorageEmpty:true,scene:game!.inspect().scene,privateKeys:Object.keys(capturePrivateStorage().local)});return;}
  await wait(smoke?1000:w.warmupMs);
  const initial=game?.inspect(),initialModel=model?.snapshot();visibility.length=0;visibility.push({at:performance.now(),hidden:document.hidden});
  startPerformance({source,scenario:w.id+'/run-'+run,capacity,environment:{...snapshot(),trustedActivation,calibration,fixture:f,workload:w,cache:'new realm; five-second warmup; browser process/cache may be warm',initial:initial?{scene:initial.scene,paused:initial.paused,playMs:initial.save.playMs,canvasHidden:document.querySelector('canvas')?.hidden,player:initial.player,actors:initial.actors?.length,devices:SCENES[w.scene as PlayScene].data?.devices.length??0,weather:weatherNow(sceneClimate(w.scene))}:initialModel}});
  const begin=performance.now();
  if(w.id==='demo-fanout'){for(let n=0;n<(smoke?1:w.operations);n++){const token=perfBegin('workload.action','demo.button');try{model!.act('button','button','press');actionCount++;}finally{perfEnd(token);}await wait(smoke?250:Math.max(0,begin+(n+1)*1000-performance.now()));}}
  else if(w.id==='board-cycles'){for(let n=0;n<(smoke?1:w.operations);n++){let token=perfBegin('workload.action','board.open');key('b');perfEnd(token);if(!document.querySelector('#hack:not([hidden])'))throw new Error('Board failed to open');boardOpens++;await wait(smoke?100:500);token=perfBegin('workload.action','board.close');key('Escape');perfEnd(token);if(document.querySelector('#hack:not([hidden])'))throw new Error('Board failed to close');boardCloses++;await wait(smoke?100:500);}}
  else if(w.id==='scene-visits'){const ids=['catalog','shop-counter','laundry','talk-cook'];for(let n=0;n<(smoke?4:w.operations);n++){const token=perfBegin('workload.action','scene.visit');game!.reviewJump(ids[n%ids.length]);perfEnd(token);visits.push(game!.inspect().scene);await wait(smoke?100:Math.max(0,begin+(n+1)*1000-performance.now()));}}
  else await wait(smoke?2000:w.measureMs);
  if(model&&Number(model.get('count'))-Number(initialModel?.state.count??0)!==actionCount)throw Error('Fan-out shared counter did not receive every button signal');
  const report=stopPerformance()!;report.environment.smoke=smoke;report.environment.visibility=visibility;report.environment.operations={actionCount,boardOpens,boardCloses,visits};report.environment.final=model?model.snapshot():{scene:game!.inspect().scene,paused:game!.inspect().paused,playMs:game!.inspect().save.playMs,canvasHidden:document.querySelector('canvas')?.hidden};
  close();send('report',report);
 }catch(e){stopPerformance();close();send('error',String(e));}
});
send('ready');
