import fs from 'node:fs';import path from 'node:path';
import assert from 'node:assert/strict';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {validateSceneDocument,compileSceneDocument,rotationStateIds} from '../../src/ssg/game/engine/gameplay/scene-document';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {SCENES} from '../../src/ssg/game/scenes';
import {DEMO_COUNTER,DEMO_GAMEPLAY} from '../../src/ssg/game/demo';
const gameplay=validateGameplay({version:1,flags:[],items:[],events:[],reactions:[],conversations:{},state:{'test.cursor':{owner:'test',lifetime:'save',type:'number',default:0,min:0,max:100}},commands:{advance:{sources:['interaction'],actions:[{state:'test.cursor',add:1}]},refuse:{sources:['interaction'],actions:[{tokens:-1},{state:'test.cursor',add:1}]}}});
const source:any={version:1,id:'test',name:'Test',intro:[],uses:[{id:'tap',name:'Tap',label:'Tap',cycle:true,cycleState:'test.cursor',routes:[{command:'advance',pages:['A']},{command:'advance',pages:['B']}]}]};
assert.deepEqual(rotationStateIds(gameplay),['test.cursor']);
for(const mutate of[(d:any)=>{delete d.uses[0].cycleState;},(d:any)=>{d.uses[0].cycleState='missing';}]){const d=structuredClone(source);mutate(d);assert.throws(()=>validateSceneDocument(d,gameplay),/rotation requires/);}
for(const mutate of[(d:any)=>{d.state['test.cursor'].min=-1;},(d:any)=>{d.state['test.cursor'].integer=false;},(d:any)=>{d.state['test.cursor'].nullable=true;d.state['test.cursor'].default=null;}]){const d=structuredClone(gameplay);mutate(d);assert.throws(()=>validateSceneDocument(source,validateGameplay(d)),/rotation requires/);}
const build=()=>compileSceneDocument(validateSceneDocument(source,gameplay),{tap:0},()=>[]),first=build(),second=build();let state:any={flags:{},items:{},tokens:0};const port={read:()=>state,write:(s:any)=>{state=s;}};
let session=new GameplaySession(gameplay,port);const before=structuredClone(state);assert.equal(first.uses[0].price,undefined);assert.deepEqual(state,before);
assert.deepEqual(first.uses[0].use({gameplay:session,flags:{}} as any),['A']);assert.deepEqual(second.uses[0].use({gameplay:session,flags:{}} as any),['B'],'independently compiled scene reads the same cursor');
state=JSON.parse(JSON.stringify(state));session.dispose();session=new GameplaySession(gameplay,port);assert.deepEqual(build().uses[0].use({gameplay:session,flags:{}} as any),['A'],'rebuild/reload does not reset progress');
const failed=structuredClone(source);for(const row of failed.uses[0].routes){row.command='refuse';row.failure=['NO'];}const failure=compileSceneDocument(validateSceneDocument(failed,gameplay),{tap:0},()=>[]),saved=structuredClone(state);assert.deepEqual(failure.uses[0].use({gameplay:session,flags:{}} as any),['NO']);assert.deepEqual(state,saved,'failed commands never advance through a private fallback');
let other:any={flags:{},items:{},tokens:0};const independent=new GameplaySession(gameplay,{read:()=>other,write:s=>{other=s;}});assert.deepEqual(first.uses[0].use({gameplay:independent,flags:{}} as any),['A'],'one factory cannot leak rotation between players');independent.dispose();session.dispose();
let count=0;for(const scene of Object.values(SCENES)){const file=path.resolve('src/ssg/game/scenes',scene.id,'scene.json');const doc=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):undefined;for(const use of doc?.uses??[])if(use.cycle){assert(use.cycleState);assert(rotationStateIds(scene.gameplay!).includes(use.cycleState));count++;}}assert.equal(count,4,'all current shipping rotations were inspected');validateSceneDocument(DEMO_COUNTER,DEMO_GAMEPLAY,{manifest:true,actors:true});
console.log('Rotation state PASS: missing/invalid cursor rejection, common state across factories and reload, independent players, atomic refusal; shipping rotating uses inspected='+count+' plus demo counter.');
