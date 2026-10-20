import {attachGameplayHandoffs} from '../../src/ssg/game/engine/gameplay/handoffs';
import {SCENES} from '../../src/ssg/game/scenes';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import assert from 'node:assert/strict';
import {SceneModel,type Line} from '../../src/ssg/game/engine/model';
import {SceneHost} from '../../src/ssg/game/engine/host';
import {mintFeedback,type FeedbackReceipt} from '../../src/ssg/game/engine/feedback-receipt';
import {sound} from '../../src/ssg/game/runtime/audio';
import {downtownRules} from '../../src/ssg/game/scenes/downtown/rules';
import {DOWNTOWN as downtown} from '../../src/ssg/game/data';
import fs from 'node:fs';
import type {SceneData} from '../../src/ssg/game/data/types';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const original={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,AudioContext:globalThis.AudioContext};
let clock=0,next=0;const timers=new Map<number,{at:number;run:()=>void}>(),notes:number[]=[];
(globalThis as any).setTimeout=(run:()=>void,ms=0)=>{const id=++next;timers.set(id,{at:clock+ms,run});return id;};
(globalThis as any).clearTimeout=(id:number)=>timers.delete(id);
const nowDescriptor=Object.getOwnPropertyDescriptor(performance,'now');Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});
class Audio{currentTime=0;destination={};resume(){}createOscillator(){let frequency=0;return{frequency:{setValueAtTime(f:number){frequency=f;},linearRampToValueAtTime(){}},connect(){return{connect(){}};},start(){notes.push(frequency);},stop(){}};}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
(globalThis as any).AudioContext=Audio;
function advance(ms:number){const end=clock+ms;for(;;){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!entry)break;clock=entry[1].at;timers.delete(entry[0]);entry[1].run();}clock=end;}
const history:{line:Line;receipt:FeedbackReceipt}[]=[],host:any={active:false,echo:false,def:{id:'causal'},schem:{note(){}},vision:{note(){}},locate:()=>null,print(){},store:{feedbackCue:sound.feedback}};
host.say=(SceneHost.prototype as any).say;
function hooks(){return{feedbackScope:'causal',say:(line:Line,from?:string,receipt?:FeedbackReceipt)=>{history.push({line,receipt:receipt!});host.say(line,from,receipt);},changed(){},open(){}};}
function attach(m:SceneModel,save:any,end:()=>void=()=>{}){const game:any=Object.create(Game.prototype);game.save=save;game.content={downtown:SCENES.downtown};game.hosts=new Map([['downtown',{model:m}]]);game.gameplaySessions=new Map();game.sceneDefinition=()=>SCENES.downtown;game.syncHud=()=>{};game.persistSave=()=>{};const session=game.gameplayFor('downtown',m);attachNativeGameplay(m,session);attachGameplayHandoffs(session,{schedule:(ms,run,canceled,detail)=>m.later(ms,run,detail,canceled),cutscene(){},presentation:end});return session;}
try{
 sound.toggle();notes.length=0;
 const shared:Line=['','Same response.','ok'],data:SceneData={id:'causal',name:'Causal',state:{},tuning:{},cables:[],goals:[],texts:{},devices:[{id:'device',name:'DEVICE',look:'',nouns:[{id:'act',kind:'ACT',verbs:['go'],on:{go:{do:[{effect:'burst'}]}}}]}]};
 let model:SceneModel;
 model=new SceneModel(hooks(),data,{effects:{burst:w=>{const receipt=w.receipt(shared);sound.feedback(receipt);w.say(shared);w.say(['','Second actual reply.','ok']);model.later(300,()=>{w.say(['','Delayed reply.','ok']);w.say(['','Second delayed reply.','ok']);});}}});host.model=model;
 model.act('device','act','go');assert.equal(history.length,2);assert.notEqual(history[0].receipt.id,history[1].receipt.id);assert.equal(history[0].receipt.cueId,history[1].receipt.cueId);assert.equal(timers.size,4,'one three-note cue and one native callback');advance(200);assert.deepEqual(notes,[523,659,784]);advance(300);assert.deepEqual(notes,[523,659,784,523,659,784]);assert.equal(history.length,4);assert.equal(history[2].receipt.cueId,history[3].receipt.cueId);assert.notEqual(history[0].receipt.cueId,history[2].receipt.cueId);
 model.act('device','act','go');assert.notEqual(history[0].receipt.id,history[4].receipt.id,'same reused line in another action is a fresh delivery');assert.notEqual(history[0].receipt.cueId,history[4].receipt.cueId);advance(600);assert.equal(notes.length,12);
 const before=notes.length,success=mintFeedback('causal','device','success'),error=mintFeedback('causal','device','error',success.cueId);sound.feedback(success);sound.feedback(error);assert.equal(notes.length,before+1,'error is immediate');assert.equal(notes.at(-1),140);advance(200);assert.deepEqual(notes.slice(before),[140,110],'error cancels this cause’s pending success notes');sound.feedback(success);sound.feedback(error);advance(200);assert.equal(notes.length,before+2);
 const silent=mintFeedback('causal','controller','success');sound.feedback(silent);advance(200);assert.deepEqual(notes.slice(-3),[523,659,784],'standalone controller completion keeps its cue');
 sound.feedback(mintFeedback('causal','device','success'));sound.cancelFeedback('causal');advance(200);assert.equal(timers.size,0);sound.feedback(mintFeedback('other','device','success'));sound.cancelFeedback('causal');assert.equal(timers.size,3);sound.cancelFeedback();
 sound.toggle();const muted=mintFeedback('causal','device','success');sound.feedback(muted);assert.equal(timers.size,0);sound.toggle();const n=notes.length;sound.feedback(muted);advance(200);assert.equal(notes.length,n,'muted receipt does not replay on unmute');
 // Native Downtown effects preserve actual replies and controller state while sharing the cue.
 const save=Object.assign(newSave(),{handle:'ghost',tokens:0}),grants:FeedbackReceipt[]=[],events:string[]=[];
 const rules=downtownRules({save:()=>save,persist:()=>events.push('persist'),nodes:()=>42,granted:r=>{assert(r);grants.push(r);events.push('granted');sound.feedback(r);},end:()=>events.push('end')});
 history.length=0;const native=new SceneModel({...hooks(),observe:e=>{assert.deepEqual(Object.keys(e.context).sort(),['bySignal','dev','noun','verb']);}},downtown as unknown as SceneData,rules,undefined,undefined,undefined,(save.gameplay??={}).downtown??={},SCENES.downtown.gameplay);host.model=native;const session=attach(native,save);native.guess('box','login','vrify');const controlLines=history.filter(r=>r.line[1].includes('0x2F'));assert(controlLines.length);assert.equal(history[0].receipt.cueId,controlLines.at(-1)!.receipt.cueId);history.length=0;events.length=0;advance(200);
 native.act('box','legs.so','install');assert(save.jump);assert.equal(history.length,1);assert(history[0].receipt);advance(200);
 const tillNotes=notes.length;native.act('till','drawer','open',true);assert.equal(save.tokens,3);assert(history.at(-1)!.receipt);advance(200);assert.equal(notes.length-tillNotes,3,'one source till reply cue');
 native.guess('box','login','vrify');assert(save.controlled.includes('0x2F'));assert(history.at(-1)!.receipt);session.dispose();native.reset();timers.clear();
 // The program hook receives the actual reply's reserved identity before it is delivered.
 history.length=0;let acquired:FeedbackReceipt|undefined;const programs:string[]=[];
 const acquisition=new SceneModel({...hooks(),programs:()=>programs,program:(id,r)=>{programs.push(id);acquired=r;sound.feedback(r!);}},data,{});host.model=acquisition;
 const firstNote=notes.length;acquisition.apply([{give:'scan.so'}]);assert(acquired);assert.equal(history.length,1);assert.equal(acquired,history[0].receipt);advance(200);assert.equal(notes.length-firstNote,3);assert.deepEqual(programs,['scan.so']);
 console.log('Causal feedback PASS: current model/Host/audio delivery identities, native delayed scopes, shared command outcomes, priority, mute/disposal and program acquisition.');
}finally{if(sound.enabled)sound.toggle();Object.assign(globalThis,original);if(nowDescriptor)Object.defineProperty(performance,'now',nowDescriptor);else delete (performance as any).now;}
