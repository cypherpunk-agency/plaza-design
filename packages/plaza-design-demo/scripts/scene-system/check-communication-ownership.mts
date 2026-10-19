import {openingStoryModel} from '../../src/ssg/game/story/opening';
import assert from 'node:assert/strict';
import {Hints} from '../../src/ssg/game/ui/hints';
import {Schematic} from '../../src/ssg/game/engine/schematic';
import {SceneHost} from '../../src/ssg/game/engine/host';
import {Game} from '../../src/ssg/game/runtime/game';
import {sound} from '../../src/ssg/game/runtime/audio';
import {mintFeedback} from '../../src/ssg/game/engine/feedback-receipt';
class Element{children:Element[]=[];textContent='';hidden=false;className='';events=new Map<string,(e:any)=>void>();appendChild(e:Element){this.children.push(e);return e;}addEventListener(k:string,f:(e:any)=>void){this.events.set(k,f);}click(){this.events.get('click')?.({stopPropagation(){}});}}
const original={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,AudioContext:globalThis.AudioContext,window:globalThis.window,cancelAnimationFrame:globalThis.cancelAnimationFrame};
let nextTimer=0,notes=0;const timers=new Map<number,()=>void>();
(globalThis as any).document={createElement:()=>new Element()};
(globalThis as any).setTimeout=(f:()=>void)=>{const id=++nextTimer;timers.set(id,f);return id;};
(globalThis as any).clearTimeout=(id:number)=>timers.delete(id);
class Audio {currentTime=0;destination={};resume(){}createOscillator(){return{frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return{connect(){}};},start(){notes++;},stop(){}};}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
(globalThis as any).AudioContext=Audio;
try{
 const seen:string[]=[],h=new Hints(()=>seen),board:any={hints:h,mode:'device',open:new Set(),root:{hidden:false},hint:new Element()};
 board.only=(Schematic.prototype as any).only;board.presentHint=Schematic.prototype.presentHint;
 assert.match(h.boardHint()!,/TAP A NOUN/);assert.equal(h.boardHint(true),null);assert.equal(h.has('ctl.noun'),false);
 board.only('lamp.switch');assert(h.has('ctl.noun'));assert.match(h.boardHint()!,/ORANGE EVENT/);
 for(const result of ['err','ok'] as const){board.pending={from:'lamp.on',to:'door.latch'};board.m={noun:()=>({kind:'SWITCH',verbs:['open']}),connect:()=>['','wire reply',result]};board.say=()=>{};const verbs=(Schematic.prototype as any).verbs.call(board,'door','latch','door.latch',{x:1,y:0},true);verbs.children.find((n:Element)=>n.className.includes('sch-verb'))!.click();assert.equal(h.has('ctl.wire'),result==='ok','only actual successful connect completes wiring lesson');}
 h.sceneChanged();assert.equal(new Hints(()=>seen).boardHint(),null,'save completion survives scene/reload');
 const pending=new Hints(()=>[]);pending.show('ordinary','WALK',{sticky:true});pending.boardHint();assert.notEqual(pending.step(0)?.text,'TAP A NOUN TO OPEN ITS VERBS');
 board.hints=pending;board.presentHint(true);assert(board.hint.hidden);assert.equal(pending.notices.time,0,'board presenter never unpauses world clock');
 sound.denied();sound.granted();assert.equal(timers.size,0);sound.toggle();notes=0;
 const history:any[]=[],status:any[]=[],host:any={active:false,echo:false,def:{id:'test'},print:(...a:any[])=>history.push(a),schem:{note(){}},vision:{note(){}},locate:()=>null,store:{notice:(...a:any[])=>status.push(a),feedbackCue:sound.feedback}};
 host.say=(SceneHost.prototype as any).say;host.react=SceneHost.prototype.react;
 const owner:any={openingStory:openingStoryModel,save:{flags:{},items:{}},gameplayFor:()=>undefined,zh:host};const use:any={id:'locked',eligibility:()=>({ok:false,reason:'NO ACCESS'})};
 (Game.prototype as any).runUse.call(owner,use,()=>[]);
 assert.equal(notes,1,'actual runUse owns one immediate denial');assert.equal(timers.size,1);assert.equal(history.length,1);assert.equal(status.length,1);assert.equal(history[0][3],status[0][2]);
 const receipt=history[0][3];host.react('use:locked',['','NO ACCESS','err'],receipt);sound.feedback(receipt);assert.equal(notes,1);assert.equal(history.length,1);assert.equal(status.length,1);
 (Game.prototype as any).runUse.call(owner,use,()=>[]);assert.equal(notes,2,'second equal-text action remains distinct');assert.equal(history.length,2);assert.notEqual(history[0][3].id,history[1][3].id);
 sound.cancelFeedback('test');assert.equal(timers.size,0);sound.feedback(mintFeedback('other','device','success'));assert.equal(timers.size,3);sound.cancelFeedback('test');assert.equal(timers.size,3);sound.cancelFeedback();assert.equal(timers.size,0);
 sound.granted();assert.equal(timers.size,3);
 const noop=()=>{};(globalThis as any).document.documentElement={classList:{remove:noop}};(globalThis as any).window={removeEventListener:noop};(globalThis as any).cancelAnimationFrame=noop;
 (Game.prototype as any).stop.call({cancelStoryTransitions:(Game.prototype as any).cancelStoryTransitions,hints:h,gameplaySessions:new Map(),hosts:new Map(),keys:new Set(),syncEnginePause:noop,persistSave:noop,endTitle:noop,menu:{hide:noop},endCutscene:noop,term:{close:noop},canvas:{},save:{}});
 assert.equal(timers.size,0,'actual Game.stop cancels delayed feedback before teardown');
 sound.granted();assert.equal(timers.size,3);sound.toggle();assert.equal(timers.size,0);const before=nextTimer;sound.granted();sound.denied();assert.equal(nextTimer,before,'muted calls allocate no callback');
 console.log('Communication ownership PASS: actual Schematic noun/wire and Game.runUse/SceneHost calls; saved shared lessons, defer/no HUD echo, receipt replay versus equal-text distinct actions, scoped chime cancellation and no muted timers.');
}finally{if(sound.enabled)sound.toggle();Object.assign(globalThis,original);}
