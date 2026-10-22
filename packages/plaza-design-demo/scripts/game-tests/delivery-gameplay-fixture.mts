/** Isolated shared-gameplay laboratory. No Game construction, browser storage or global clock changes. */
import { GameplaySession, cloneState } from '../../src/ssg/game/engine/gameplay/session';
import { ConversationSession } from '../../src/ssg/game/engine/gameplay/conversation';
import { DELIVERY_TERMINAL,deliveryTerminalRules } from './shift-delivery-fixture.mts';
import { SceneModel,type Line } from '../../src/ssg/game/engine/model';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
/** Minimal transaction/cable contract, independent of campaign content. */
export const DELIVERY_GAMEPLAY=validateGameplay({version:1,
 flags:['delivery:assigned','delivery:parcel','delivery:delivered','delivery:checked','delivery:parked'],
 items:['delivery.tag','delivery.parcel'],events:['assignment.accepted','work-tag.issued','parcel.collected','parcel.transferred','delivery.completed','checkout'],
 commands:{
  'delivery.accept':{sources:['conversation'],when:{flag:'delivery:assigned',is:false},actions:[{flag:'delivery:assigned',value:true},{emit:'assignment.accepted'}]},
  'delivery.issue-tag':{sources:['system'],actions:[{item:'delivery.tag',add:1},{emit:'work-tag.issued'}]},
  'delivery.collect':{sources:['interaction'],when:{all:[{flag:'delivery:assigned'},{flag:'delivery:parcel',is:false}]},actions:[{item:'delivery.parcel',add:1},{flag:'delivery:parcel',value:true},{emit:'parcel.collected'}]},
  'delivery.deliver':{sources:['interaction','signal'],when:{item:'delivery.parcel',atLeast:1},actions:[{item:'delivery.parcel',add:-1},{emit:'parcel.transferred'}]},
  'delivery.record':{sources:['system'],actions:[{flag:'delivery:delivered',value:true},{emit:'delivery.completed'}]},
  'delivery.checkout':{sources:['interaction'],when:{flag:'delivery:parked'},actions:[{item:'delivery.tag',add:-1},{flag:'delivery:checked',value:true},{emit:'checkout'}]},
  'delivery.credit-wages':{sources:['system'],actions:[{tokens:3}]}
 },reactions:[{event:'assignment.accepted',command:'delivery.issue-tag'},{event:'parcel.transferred',command:'delivery.record'},{event:'checkout',command:'delivery.credit-wages'}],
 conversations:{supervisor:{entry:[{node:'offer'}],nodes:{offer:{speaker:'SUPERVISOR',pages:['Take the delivery?'],choices:[{id:'accept',label:'Accept',command:'delivery.accept',next:'accepted'},{id:'later',label:'Later',next:'later'}]},accepted:{speaker:'SUPERVISOR',pages:['Assigned.']},later:{speaker:'SUPERVISOR',pages:['Later.']}}}
}});
import type { GameplayState } from '../../src/ssg/game/engine/gameplay/types';
export function createDeliveryGameplayFixture(initial:GameplayState={flags:{},items:{},tokens:0},definition:unknown=DELIVERY_GAMEPLAY,deliveryCommand='delivery.deliver'){
  const baseline=cloneState(initial);
  let state=cloneState(baseline),time=0,serial=0,disposed=false;
  let pending:{at:number;serial:number;run:()=>void}[]=[];
  const lines:Line[]=[];
  const gameplay=new GameplaySession(definition,{read:()=>state,write:next=>{state=next;}});
  const model=new SceneModel({say:line=>{lines.push(line);if(lines.length>64)lines.shift();},open:()=>{},changed:()=>{}},DELIVERY_TERMINAL,deliveryTerminalRules(gameplay,deliveryCommand));
  model.now=()=>time;model.wall=()=>time;
  model.later=(ms,run,_detail,canceled)=>{if(disposed)return()=>{};if(pending.length>=256)throw new Error('Pilot callback limit');const task={at:time+ms,serial:serial++,run};pending.push(task);return()=>{const i=pending.indexOf(task);if(i>=0){pending.splice(i,1);canceled?.();}};};
  model.reset();
  function live(){if(disposed)throw new Error('Pilot disposed');}
  return{gameplay,model,lines,get time(){return time;},get pending(){return pending.length;},
    talk(id:string){live();return new ConversationSession(gameplay,id);},
    advance(ms:number){
      live();if(!Number.isFinite(ms)||ms<0||ms>10000)throw new Error('Advance must be 0..10000 ms');
      const end=time+ms;let work=0;
      try{for(;;){pending.sort((a,b)=>a.at-b.at||a.serial-b.serial);const task=pending[0];if(!task||task.at>end)break;if(++work>256)throw new Error('Pilot callback work limit');pending.shift();time=task.at;task.run();}time=end;}
      catch(error){pending=[];throw error;}
    },
    reset(){live();pending=[];time=0;serial=0;state=cloneState(baseline);lines.length=0;gameplay.clearHistory();model.reset();},
    dispose(){if(disposed)return;pending=[];model.reset();gameplay.dispose();disposed=true;},
  };
}
export type GameplayPilot=ReturnType<typeof createDeliveryGameplayFixture>;
