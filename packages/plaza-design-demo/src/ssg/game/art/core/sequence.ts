/** A sequence is an ordinary composition with its temporal controls in the same source. */
import type {ChunkDocument} from './composition';
import {validateTimeline,type Sequence,type TimelineContext,type TimelineProgram} from './timeline';

export type SequenceSettings = Omit<Sequence,'composition'>;
export interface SequenceComposition extends ChunkDocument { sequence:SequenceSettings }

/** Evaluation programs are derived values, never separately authored or saved documents. */
export function sequenceProgram(compositions:Readonly<Record<string,ChunkDocument>>):TimelineProgram{
  return {version:1,sequences:Object.entries(compositions).flatMap(([id,doc])=>doc.sequence?[{...structuredClone(doc.sequence),composition:id}]:[])};
}
export function validateSequence(doc:ChunkDocument,context:TimelineContext):SequenceComposition{
  if(!doc.sequence)throw Error('Sequence requires its temporal controls in the composition');
  validateTimeline(sequenceProgram({[doc.scene]:doc}),{...context,compositions:{...context.compositions,[doc.scene]:doc}});
  return doc as SequenceComposition;
}
