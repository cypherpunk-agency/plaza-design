import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {attachGameplayHandoffs} from '../../src/ssg/game/engine/gameplay/handoffs';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
const names=['window','document','location','performance','setTimeout','clearTimeout','requestAnimationFrame','cancelAnimationFrame'],original=new Map(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
let now=0,serial=0;const timers=new Map<number,{at:number;run:()=>void}>(),listeners=new Map<string,Set<unknown>>(),frames=new Set<number>();
const define=(key:string,value:unknown)=>Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
define('performance',{now:()=>now});define('setTimeout',(run:()=>void,ms:number)=>{const id=++serial;timers.set(id,{at:now+ms,run});return id;});define('clearTimeout',(id:number)=>timers.delete(id));define('requestAnimationFrame',()=>{const id=++serial;frames.add(id);return id;});define('cancelAnimationFrame',(id:number)=>frames.delete(id));define('location',{search:''});define('document',{documentElement:{classList:{remove(){}}}});define('window',{addEventListener:(key:string,fn:unknown)=>{if(!listeners.has(key))listeners.set(key,new Set());listeners.get(key)!.add(fn);},removeEventListener:(key:string,fn:unknown)=>listeners.get(key)?.delete(fn)});
// scene time moves on the model's tick (the game loop's frame); browser timers stay for the page itself
let ticked:{tick(ms:number,live:boolean):boolean}|undefined;
function advance(ms:number){const end=now+ms;for(;;){const first=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;now=first[1].at;timers.delete(first[0]);first[1].run();}now=end;ticked?.tick(ms,false);}
try{
 const d=validateGameplay({version:1,flags:[],items:[],events:['finished'],state:{'test.completed':{owner:'test',type:'boolean',lifetime:'save',default:false}},commands:{finish:{sources:['interaction'],actions:[{emit:'finished'}]},complete:{sources:['system'],actions:[{state:'test.completed',set:true}]}},reactions:[],conversations:{},native:{reads:{},verbs:[],events:{},goals:{}},handoffs:[{event:'finished',cutscene:'act2',after:[{ms:1000,command:'complete'}]}]});
 const model=new SceneModel({say(){},changed(){},open(){}},{id:'test',name:'Test',state:{completed:false},tuning:{},devices:[],cables:[],dialogue:{},goals:[],texts:{}},{effects:{}}),values={test:model.state};let tokens=0;
 const session=new GameplaySession(d,{read:()=>({flags:{},items:{},tokens,values}),write:s=>{mergeValues(values,s.values!);tokens=s.tokens;}});attachNativeGameplay(model,session);ticked=model;const pending=()=>model.inspect().time.pending.length;let cuts=0;attachGameplayHandoffs(session,{schedule:(ms,run,canceled,detail)=>model.later(ms,run,detail,canceled),cutscene:()=>cuts++});
 let closed=0,persisted=0;const host={model,setPaused:(on:boolean)=>model.setPaused(on),cancelAcknowledgment(){},closeAll(){closed++;},persist(){persisted++;}},game:any=Object.create(Game.prototype);
 const properties={running:true,hosts:new Map([['test',host]]),gameplaySessions:new Map([['test',session]]),hints:{sceneChanged(){}},menu:{open:false,hide(){}},canvas:{hidden:false,focus(){}},term:{close(){}},keys:new Set(),host:{windowEl:{}},onKeyDown(){},onKeyUp(){},onResize(){},syncHud(){},endTitle(){},endCutscene(){},persistSave(){},continueGame(){},reviewAllowed:()=>false};
 for(const[key,value]of Object.entries(properties))Object.defineProperty(game,key,{value,writable:true,configurable:true});
 game.bubble=null;game.say('No introduction',[],0,0);assert.equal(game.bubble,null,'an intentionally silent scene must not create an unreadable empty bubble');
 for(let cycle=0;cycle<20;cycle++){
  if(!game.running){game.start();game.syncEnginePause();}model.set('completed',false);assert(model.gameplayCommand!('finish').ok);advance(400);assert.equal(pending(),1);
  game.stop();assert.equal(game.running,false);assert.equal(game.gameplaySessions.get('test'),session,'stop must retain the source session paired with its cached host');assert.equal(model.inspect().time.paused,true);assert.equal(pending(),1,'paused work waits, it does not run');advance(9000);assert.equal(model.get('completed'),false);assert.equal([...listeners.values()].reduce((n,s)=>n+s.size,0),0);assert.equal(frames.size,0);
  game.start();assert.equal(game.running,true);game.syncEnginePause();assert.equal(model.inspect().time.paused,false);assert.equal([...listeners.values()].reduce((n,s)=>n+s.size,0),3);assert.equal(frames.size,1);advance(599);assert.equal(model.get('completed'),false);advance(1);assert.equal(model.get('completed'),true);assert.equal(pending(),0);game.stop();
 }
 assert.equal(cuts,20);assert.equal(closed,40);assert.equal(persisted,40);
 model.setPaused(false);assert(model.gameplayCommand!('finish').ok);assert.equal(pending(),1);session.dispose();assert.equal(pending(),0);assert.equal(model.gameplayCommand,undefined);advance(2000);assert.equal(cuts,21);model.setPaused(true);
 console.log('Cached Game lifecycle PASS: 20 actual stop/start cycles preserve paired source session, native hooks and remaining 600ms handoff; paused work does not run, three input listeners/one RAF return without accumulation, true session disposal cancels work and detaches hooks.');
}finally{for(const key of names){const descriptor=original.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as any)[key];}}
