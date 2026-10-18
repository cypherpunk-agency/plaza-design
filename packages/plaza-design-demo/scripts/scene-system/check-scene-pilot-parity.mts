import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
/** Capture before migration, compare after: ordinary Harbor interaction results and state. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {SHIFT,SHIFT_USES,shiftGoal,shiftAttention,shiftMinute,harborShift} from '../../src/ssg/game/scenes/harbor-shift';
import {SHIFT_GAMEPLAY} from '../../src/ssg/game/scenes/harbor-shift/gameplay';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import type {UseCtx} from '../../src/ssg/game/scenes/kit';
const keys=Object.values(SHIFT),rows:unknown[]=[];
const cases=[...Array.from({length:12},(_,i)=>Object.fromEntries(keys.map((key,j)=>[key,j<i]))),...Array.from({length:32},(_,bits)=>Object.fromEntries(keys.map((key,j)=>[key,!!(bits&(1<<(j%5)))])))];
for(const flags of cases){
 rows.push({goal:shiftGoal(flags),attention:shiftAttention(flags),minute:shiftMinute(flags),visible:SHIFT_USES.filter(use=>!use.available||use.available(flags)).map(use=>use.id),intro:harborShift.intro});
 for(const use of SHIFT_USES)for(const fn of [use.use,...(use.items??[]).map(item=>item.use)])for(const carried of [false,true]){
  let state={flags:{...flags},items:carried?{'shift.tag':1,'shift.parcel':1,'shift.case':1}:{},tokens:0};
  const session=new GameplaySession(SHIFT_GAMEPLAY,{read:()=>state,write:s=>{state=s as typeof state;}});
  const ctx={gameplay:session,flags:state.flags,tokens:0,t:0,min:1120,weather:'clear',has:(id:string,n=1)=>(state.items[id as keyof typeof state.items]??0)>=n,pay:()=>false,give:()=>{},set:()=>{},take:()=>false,add:()=>{}} as UseCtx;
  rows.push({use:use.id,out:fn(ctx),state,events:session.events()});session.dispose();
 }
}
const file=fileURLToPath(new URL('./fixtures/harbor-scene-before.json.gz',import.meta.url));
const before=JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));assert.equal(rows.length,before.length);for(let i=0;i<rows.length;i++)assert.deepEqual(rows[i],before[i],'Legacy case '+i);
console.log('Harbor scene document preserves '+rows.length+' legacy objective/guidance/time/visibility/interaction/message/state/event cases.');
