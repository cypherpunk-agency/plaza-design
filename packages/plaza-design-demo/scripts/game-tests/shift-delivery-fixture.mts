/** Small isolated native hacking fixture: the same operation as Mara's ordinary item handover. */
import type { SceneData } from '../../src/ssg/game/data/types';
import type { SceneRules } from '../../src/ssg/game/engine/rules';
import type { GameplaySession } from '../../src/ssg/game/engine/gameplay/session';
export const DELIVERY_TERMINAL:SceneData={
  id:'delivery-pilot',name:'Delivery terminal pilot',state:{},tuning:{},dialogue:{},goals:[],texts:{},
  devices:[
    {id:'scanner',name:'PARCEL SCANNER',look:'An event source. Its cable requests delivery.',status:'parcel → terminal',nouns:[{id:'parcel',layer:'hardware',function:'sense',verbs:['scan'],events:['detected'],on:{scan:{do:[{emit:'detected'}]}}}]},
    {id:'terminal',name:'DELIVERY TERMINAL',look:'The same transfer operation as the receiving clerk.',status:'requires an assignment and a carried parcel',nouns:[{id:'delivery',layer:'hardware',function:'act',verbs:['deliver'],events:['accepted','denied'],on:{deliver:{do:[{effect:'delivery.request'}]}}}]}
  ],cables:[{id:'delivery-request',from:'scanner.parcel:detected',to:'terminal.delivery',verb:'deliver'}]
};
export function deliveryTerminalRules(gameplay:GameplaySession,command='delivery.deliver'):SceneRules{return{
  effects:{'delivery.request':(world,context)=>{
    const result=gameplay.dispatch(command,context.bySignal?'signal':'interaction');
    world.emit(result.ok?'accepted':'denied');
    return['use delivery --deliver',result.ok?'DELIVERY REGISTERED.':`DELIVERY REFUSED: ${result.reason}.`,result.ok?'ok':'err'];
  }}
};}
