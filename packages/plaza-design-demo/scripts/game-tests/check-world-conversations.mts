import assert from 'node:assert/strict';
import {matches} from '../../src/ssg/game/engine/gameplay/queries';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {validateSceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {GameplaySession,cloneState} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {inWindow} from '../../src/ssg/game/world/clock';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const empty=validateGameplay({version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}});
const id='talk.world-dialogue.tech',cursor=id+'.cursor';
const game=validateGameplay({...empty,state:{[cursor]:{owner:id,lifetime:'save',type:'number',default:0,min:0,max:1}},commands:{advance:{sources:['conversation'],actions:[{state:cursor,set:1}]}},conversations:{[id]:{
 entry:[{when:{weather:['rain','storm']},node:'rain'},{when:{time:{from:'18:00',to:'06:00',days:['odd']}},node:'night'},{when:{state:cursor,is:0},node:'first'},{node:'last'}],
 nodes:{rain:{speaker:'TECH',pages:['Rain response']},night:{speaker:'TECH',pages:['Night shift']},first:{speaker:'TECH',pages:['First ordinary visit'],onEnter:'advance'},last:{speaker:'TECH',pages:['Last ordinary visit'],onEnter:'advance'}}
}}});
validateSceneDocument({version:1,id:'world-dialogue',name:'Context test',intro:['Arrival'],uses:[],people:[{id:'tech',name:'TECH',conversation:id}]},game);
let saved:GameplayState={flags:{},items:{},tokens:0,world:{day:1,minute:1100,weather:'rain'}};
const gp=new GameplaySession(game,{read:()=>saved,write:s=>{saved=s;}}),talk=()=>{const run=new ConversationSession(gp,'talk.world-dialogue.tech');const frame=run.frame();run.close();return frame.pages;};
assert.deepEqual(talk(),['Rain response']);assert.equal(saved.values,undefined,'context variant must not advance the ordinary visit');
saved.world={day:1,minute:1100,weather:'clear'};assert.deepEqual(talk(),['Night shift']);
saved.world={day:2,minute:120,weather:'clear'};assert.deepEqual(talk(),['Night shift'],'cross-midnight window belongs to previous odd day');
saved.world={day:2,minute:580,weather:'clear'};assert.deepEqual(talk(),['First ordinary visit']);assert.deepEqual(talk(),['Last ordinary visit']);
const reload=new GameplaySession(game,{read:()=>saved,write:s=>{saved=s;}});assert.deepEqual(new ConversationSession(reload,'talk.world-dialogue.tech').frame().pages,['Last ordinary visit']);
for(let day=1;day<=3;day++)for(let minute=0;minute<1440;minute+=30){const time={from:'18:00',to:'06:00',days:['odd' as const]};assert.equal(matches({time},{...saved,world:{day,minute,weather:'clear'}}),inWindow(time,day,minute));}
assert.equal(matches({weather:['rain']},{flags:{},items:{},tokens:0}),false,'absent live context fails closed');
assert.equal(matches({not:{weather:['rain']}},{flags:{},items:{},tokens:0}),false,'missing context cannot become permission through negation');
assert.equal(matches({any:[{flag:'allowed'},{weather:['rain']}]},{flags:{allowed:true},items:{},tokens:0}),true,'a known true alternative remains usable');
const copy=cloneState(saved);assert.notEqual(copy.world,saved.world);assert.deepEqual(copy.world,saved.world);
const bad=structuredClone(game);bad.conversations['talk.world-dialogue.tech'].entry[0].when={weather:['unreal-weather']} as any;assert.throws(()=>validateGameplay(bad),/weather/);
const malformed=structuredClone(game);malformed.conversations['talk.world-dialogue.tech'].entry[0].when={time:{from:'25:00',to:'06:00'}};assert.throws(()=>validateGameplay(malformed),/time/);
console.log('World conversations PASS: pure weather/time conditions, ordered contextual variants, 144 cross-midnight clock comparisons, unchanged cursor during variants, saved ordinary progress and invalid input rejection.');
