import {SceneModel} from '../engine/model';
import {emptyData,NO_RULES} from '../engine/host';
import {GameplaySession} from '../engine/gameplay/session';
import {mergeValues,resolveValues} from '../engine/gameplay/state';
import {sceneStateView} from '../engine/gameplay/scene-state';
import type {GameplayState} from '../engine/gameplay/types';
import type {Sequence} from '../art/core/timeline';
import type {SceneDef} from '../scenes/kit';
import {compileGameWorld} from '../world/compiled-world';
import {worldCompositionContext} from '../world/compiled-world';
import {validateWorldCompositions,worldWithMembership,editWorldMembership,compileWorldComposition,type WorldMembership} from '../world/compositions';
import worldSource from '../world/compositions.json';
import baseGraph from '../world/zone-graph.json';
import {validateZoneGraph} from '../world/zone-graph';
import {placementCoordinates,placeFrom} from '../world/zone-graph';
import {advanceSequenceCommands} from './sequence-commands';

/** Disposable reconstruction from authored starting inputs, not a playback clock. Only an explicit sample advances
 * isolated movers. No native trigger hooks, storage, UI, rewards or external observers exist.
 * Commands use the shipping reducer and paths use the shipping Movers implementation. */
export interface InspectionSeed {state:GameplayState;membership?:WorldMembership}
export function sequenceInspection(scenes:Readonly<Record<string,SceneDef>>,sequence:Sequence,ids:readonly string[],documents?:ReadonlyMap<string,unknown>,seed?:InspectionSeed){
 let time=0,state:GameplayState=seed?structuredClone(seed.state):{flags:{},items:{},tokens:0,values:{}};
 state.values??={};
 const source=validateWorldCompositions(documents?.get('world-compositions')??worldSource),base=validateZoneGraph(documents?.get('zone-graph')??baseGraph),context=worldCompositionContext(scenes);
 let membership:WorldMembership=structuredClone(seed?.membership??{}),compositions=worldWithMembership(source,membership),graph=compileGameWorld(scenes,documents);
 if(Object.keys(membership).length)graph=editWorldMembership(source,membership,[],context,base).graph;
 const models=new Map<string,SceneModel>(),sessions=new Map<string,GameplaySession>();
 const run={sequence:sequence.id,receipts:[] as string[]};
 const ensure=(id:string)=>{
  if(models.has(id))return;
  const def=scenes[id];if(!def)throw Error('Missing inspection chunk: '+id);
  if(def.gameplay)mergeValues(state.values!,resolveValues(def.gameplay,state));
  const forbidden=()=>{throw Error('Inspection cannot perform external gameplay effects');};
  const model=new SceneModel({say:forbidden,open:forbidden,changed(){}},def.data??emptyData(id,def.name),NO_RULES,undefined,undefined,undefined,sceneStateView(state.values!,id,def.gameplay),def.gameplay);
  model.now=()=>time*1000;model.wall=model.now;if(seed)model.restore({state:{...model.state},goals:[],links:[],logic:[]});else model.reset();
  if(def.level)model.peopleLevel={...def.level,vehicleZones:placementCoordinates(placeFrom(graph,id,Infinity))};
  models.set(id,model);
  if(def.gameplay){
   const session=new GameplaySession(def.gameplay,{read:()=>state,write:next=>{mergeValues(state.values!,next.values??{});state={...next,values:state.values};},prepareWorld:edits=>{
    const result=editWorldMembership(source,membership,edits,context,base);
    return{commit:()=>{membership=result.membership;compositions=result.source;graph=result.graph;
     for(const key of Object.keys(compositions.compositions))for(const chunk of compileWorldComposition(compositions,key,context).chunks)ensure(chunk.chunk);
     for(const [id,model]of models)if(model.peopleLevel)model.peopleLevel={...model.peopleLevel,vehicleZones:placementCoordinates(placeFrom(graph,id,Infinity))};
    }};
   }});
   session.domain=()=>({...model.beginDomainTransaction(),notify(){},refresh(){}});
   session.readContext=()=>({tuning:model.data.tuning,labels:model.texts,cables:model.links,sceneTime:model.now(),nativeRead:key=>model.rules.derived?.[key]?.(model)});
   sessions.set(id,session);
  }
 };
 for(const id of new Set([...ids,...(sequence.commands??[]).map(c=>c.scene)]))ensure(id);
 const advance=(to:number)=>{
  // A long seek must not exhaust a cyclic mover's zero-duration-loop guard.
  do{time=Math.min(to,time+10);for(const model of models.values())model.movers.tick();}while(time<to);
 };
 return{
  sample(to:number){
   if(!Number.isFinite(to)||to<time)throw Error('Reconstruct inspection before seeking backwards');
   for(const marker of sequence.commands??[]){if(marker.time>to)break;if(run.receipts.includes(marker.id))continue;advance(marker.time);
    if(!advanceSequenceCommands(sequence,marker.time,run,c=>sessions.get(c.scene)?.dispatch(c.command,'system').ok===true))throw Error('Inspection command refused: '+marker.id);
   }
   advance(to);return{model:(id:string)=>models.get(id),flags:state.flags,graph,compositions};
  },
  snapshot(){return{state:structuredClone(state),membership:structuredClone(membership),receipts:[...run.receipts],scenes:Object.fromEntries([...models].map(([id,model])=>{const {state,...snapshot}=model.snapshot(),movers=model.movers.snapshot();return[id,{...snapshot,movers:model.movers.snapshot(new Set(Object.keys(movers)))}];}))};},
  dispose(){for(const s of sessions.values())s.dispose();for(const m of models.values())m.dispose();models.clear();sessions.clear();},
 };
}
