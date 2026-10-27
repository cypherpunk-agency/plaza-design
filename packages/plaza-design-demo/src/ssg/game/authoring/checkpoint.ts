import type {SceneDef} from '../scenes/kit';
import {fixtureSave,type PlayFixture} from '../world/checkpoints';
import {fixtureSequences,pendingFixtureVocabulary} from './pending-fixtures';
import type {InspectionSeed} from '../runtime/sequence-state';
import {checkpointSequenceState} from '../world/checkpoint-state';
import {startCheckpoint} from '../runtime/play-profile';

/** Authored starting inputs, not a captured campaign save. Both preview and native Play use this seed. */
export function checkpointSeed(fixture:PlayFixture,documents:ReadonlyMap<string,unknown>,scenes:Readonly<Record<string,SceneDef>>){
 const save=fixtureSave(fixture,Object.keys(scenes),pendingFixtureVocabulary(documents,scenes),startCheckpoint().handle??'');
 const seed:InspectionSeed={state:{flags:save.flags,items:save.items,tokens:save.tokens,values:save.gameplay,world:{day:fixture.day,minute:fixture.minute,weather:fixture.weather==='forecast'?'clear':fixture.weather}},membership:save.worldMembership};
 return{save,seed};
}
/** The shipping isolated sampler is the sole reconstruction path; no trigger/storage observers exist. */
export function reconstructCheckpoint(fixture:PlayFixture,documents:ReadonlyMap<string,unknown>,scenes:Readonly<Record<string,SceneDef>>){
 const {save}=checkpointSeed(fixture,documents,scenes);
 if(!fixture.sequence)return{save,sequence:undefined};
 const {chunks,program}=fixtureSequences(documents,scenes),sequence=program.sequences.find(s=>s.id===fixture.sequence!.id);
 if(!sequence||fixture.sequence.time>sequence.duration)throw Error('Checkpoint sequence/time does not exist');
 return checkpointSequenceState(save,fixture,sequence,chunks[sequence.composition],documents,scenes);
}
