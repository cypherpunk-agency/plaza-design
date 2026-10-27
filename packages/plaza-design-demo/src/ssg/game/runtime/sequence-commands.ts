import type {Sequence,SequenceCommand} from '../art/core/timeline';
import type {ChunkDocument} from '../art/core/composition';
export function validateSequenceHandoffs(definitions:readonly import('../engine/gameplay/types').GameplayDefinition[],ids:ReadonlySet<string>){
 for(const definition of definitions)for(const handoff of definition.handoffs??[])if(handoff.cutscene&&!ids.has(handoff.cutscene))throw Error('Unknown playable sequence '+handoff.cutscene);
}
/** Ordinary chunk artwork can carry direction, including standalone contents. Source discovery, not playback. */
export function authoredSequenceSources(scenes:Readonly<Record<string,{artwork?:ChunkDocument}>>){
 const out:Record<string,{composition:ChunkDocument;sequence:Sequence}>={};
 for(const scene of Object.values(scenes)){const composition=scene.artwork;if(!composition?.sequence)continue;
  const id=composition.sequence.id;if(Object.prototype.hasOwnProperty.call(out,id))throw Error('Duplicate world sequence '+id);
  out[id]={composition,sequence:{...composition.sequence,composition:composition.scene}};
 }return out;
}
/** Receipts belong to the current saved run; the existing playback owner supplies its time. */
export interface SequenceCommandRun {sequence:string;receipts:string[];finished?:true;failure?:SequenceCommand}
export function sequenceCommandTargets(scenes:Readonly<Record<string,{gameplay?:import('../engine/gameplay/types').GameplayDefinition}>>){
 return Object.fromEntries(Object.entries(scenes).map(([id,s])=>[id,Object.entries(s.gameplay?.commands??{}).filter(([,c])=>c.sources.includes('system')).map(([id])=>id)]));
}
/** Runtime execution only. Sampling/evaluating a timeline never calls this function. */
export function advanceSequenceCommands(sequence:Sequence,time:number,run:SequenceCommandRun,dispatch:(command:SequenceCommand)=>boolean,mode:'play'|'skipping'|'skip'|'complete'|'cancel'='play'){
 if(run.sequence!==sequence.id)throw Error('Sequence command run identity mismatch');
 const execute=(command:SequenceCommand)=>{if(run.receipts.includes(command.id))return true;
  // A command's afterCommit persistence must already see its receipt. Refusals consume nothing.
  run.receipts.push(command.id);let ok=false;try{ok=dispatch(command);if(ok)delete run.failure;else run.failure={...command};return ok;}finally{if(!ok)run.receipts.splice(run.receipts.indexOf(command.id),1);}
 };
 if(mode==='cancel'){for(const command of sequence.onCancel??[])if(!execute(command))return false;return true;}
 const skipping=mode==='skip'||mode==='skipping';
 for(const marker of sequence.commands??[]){if(marker.time>time&&!skipping)break;if(skipping&&marker.skip==='omit'){if(!run.receipts.includes(marker.id))run.receipts.push(marker.id);continue;}if(!execute(marker))return false;}
 if(mode==='complete'||mode==='skip')for(const command of sequence.onComplete??[])if(!execute(command))return false;
 return true;
}
