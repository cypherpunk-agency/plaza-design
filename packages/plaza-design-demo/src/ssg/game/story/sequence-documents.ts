import {validateTimeline,type TimelineContext} from '../art/core/timeline';
import {openingRegistry,type OpeningDocuments} from '../art/sequences/opening/sequence';
import {cinematicRegistry,type CinematicDocuments} from '../art/sequences/cinematics';
import {openingDocuments} from './title/documents';
import {cinematicDocuments} from './cutscenes/documents';
/** Private playback inputs; no module-global document is replaced during editor Play. */
export interface RuntimeSequenceDocuments {opening:OpeningDocuments;cinematics:CinematicDocuments}
export const runtimeSequenceDocuments:RuntimeSequenceDocuments={opening:openingDocuments,cinematics:cinematicDocuments};
/** Existing native sequence identities select registered controllers, not arbitrary code. */
export function createRuntimeSequenceDocuments(documents:ReadonlyMap<string,unknown>,context:TimelineContext):RuntimeSequenceDocuments{
 const need=(id:string)=>{if(!documents.has(id))throw new Error('Missing native sequence document: '+id);return documents.get(id);};
 const composition=openingRegistry.validate(need('sequence-opening'));
 const compositions=Object.fromEntries(['intro','act2','taxi'].map(id=>['sequence-'+id,cinematicRegistry.validate(need('sequence-'+id))]));
 const opening=validateTimeline(need('sequence-opening-timeline'),context),cinematics=validateTimeline(need('sequence-cinematics'),context);
 for(const[id,timeline,compositionId]of [['title',opening,'sequence-opening'],['glide',opening,'sequence-opening'],['intro',cinematics,'sequence-intro'],['act2',cinematics,'sequence-act2'],['taxi',cinematics,'sequence-taxi']]as const){
  const sequence=timeline.sequences.find(s=>s.id===id);if(!sequence||sequence.composition!==compositionId)throw new Error('Native sequence '+id+' requires its registered composition '+compositionId);
  if(['glide','intro','act2'].includes(id)&&!sequence.handoff)throw new Error('Native sequence '+id+' requires a handoff');
 }
 return structuredClone({opening:{compositionId:'sequence-opening',composition,timeline:opening},cinematics:{compositions,timeline:cinematics}});
}
