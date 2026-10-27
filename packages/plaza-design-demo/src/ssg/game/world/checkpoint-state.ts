import type {PlayFixture} from './checkpoints';
import type {Save} from '../runtime/save';
import type {SceneDef} from '../scenes/kit';
import type {Sequence} from '../art/core/timeline';
import type {ChunkDocument} from '../art/core/composition';
import {sequenceInspection} from '../runtime/sequence-state';
import {sequenceWorldZones} from '../runtime/prepare-frame';
import {validateWorldCompositions,worldWithMembership} from './compositions';
import {art} from '../art';

/** Same source-based reconstruction for private Play and a configured fresh run. No observers,
 * storage or presentation effects execute. Already committed markers become playback receipts. */
export function checkpointSequenceState(save:Save,fixture:PlayFixture,sequence:Sequence,composition:ChunkDocument,
 documents:ReadonlyMap<string,unknown>,scenes:Readonly<Record<string,SceneDef>>){
 if(!fixture.sequence||sequence.id!==fixture.sequence.id||fixture.sequence.time>sequence.duration)throw Error('Checkpoint sequence/time does not exist');
 const next=structuredClone(save),control=composition.instances.find(n=>n.type==='sequence.world-control');
 const source=worldWithMembership(validateWorldCompositions(documents.get('world-compositions')),next.worldMembership);
 const ids=control?sequenceWorldZones(art.properties(control.type,control.props),scenes,source):[fixture.scene];
 const reconstruction=sequenceInspection(scenes,sequence,ids,documents,{membership:next.worldMembership,state:{
  flags:next.flags,items:next.items,tokens:next.tokens,values:next.gameplay,
  world:{day:next.clock.day,minute:next.clock.min,weather:fixture.weather==='forecast'?'clear':fixture.weather},
 }});
 try{
  reconstruction.sample(fixture.sequence.time);const result=reconstruction.snapshot();
  next.flags=result.state.flags;next.items=result.state.items;next.tokens=result.state.tokens;next.gameplay=result.state.values;
  next.worldMembership=result.membership;Object.assign(next.scenes,result.scenes);
  return{save:next,sequence:{id:sequence.id,time:fixture.sequence.time,receipts:result.receipts}};
 }finally{reconstruction.dispose();}
}
