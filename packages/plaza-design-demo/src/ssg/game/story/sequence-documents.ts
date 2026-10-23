import {sequenceProgram} from '../art/core/sequence';
import {validateTimeline,type TimelineContext} from '../art/core/timeline';
import {art} from '../art';
import type {OpeningDocuments} from './title/documents';
import {cinematicRegistry,type CinematicDocuments} from '../art/sequences/cinematics';
import {openingDocuments} from './title/documents';
import {cinematicDocuments} from './cutscenes/documents';
/** Private playback inputs; no module-global document is replaced during editor Play. */
export interface RuntimeSequenceDocuments {opening:OpeningDocuments;cinematics:CinematicDocuments}
export const runtimeSequenceDocuments:RuntimeSequenceDocuments={opening:openingDocuments,cinematics:cinematicDocuments};
/** Existing native sequence identities select registered controllers, not arbitrary code. */
export function createRuntimeSequenceDocuments(documents:ReadonlyMap<string,unknown>,context:TimelineContext):RuntimeSequenceDocuments{
 const need=(id:string)=>{if(!documents.has(id))throw new Error('Missing native sequence document: '+id);return documents.get(id);};
 const composition=art.validate(need('sequence-opening'));
 const compositions=Object.fromEntries(['intro','act2','taxi'].map(id=>['sequence-'+id,cinematicRegistry.validate(need('sequence-'+id))]));
 const openingCompositions={'sequence-title':art.validate(need('sequence-title')),'sequence-opening':composition};
 const opening=validateTimeline(sequenceProgram(openingCompositions),{...context,compositions:{...context.compositions,...openingCompositions}}),cinematics=validateTimeline(sequenceProgram(compositions),{...context,compositions:{...context.compositions,...compositions}});
 for(const[id,timeline,compositionId]of [['title',opening,'sequence-title'],['glide',opening,'sequence-opening'],['intro',cinematics,'sequence-intro'],['act2',cinematics,'sequence-act2'],['taxi',cinematics,'sequence-taxi']]as const){
  const sequence=timeline.sequences.find(s=>s.id===id);if(!sequence||sequence.composition!==compositionId)throw new Error('Native sequence '+id+' requires its registered composition '+compositionId);
  if(['glide','intro','act2'].includes(id)&&!sequence.handoff)throw new Error('Native sequence '+id+' requires a handoff');
 }
 return structuredClone({opening:{compositionId:'sequence-opening',composition,compositions:openingCompositions,timeline:opening},cinematics:{compositions,timeline:cinematics}});
}
