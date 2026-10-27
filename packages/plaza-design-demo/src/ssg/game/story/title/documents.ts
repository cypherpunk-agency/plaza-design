import composition from './composition.json';
import title from './title.composition.json';
import {art,type ChunkDocument} from '../../art';
import {sequenceProgram} from '../../art/core/sequence';
import type {TimelineProgram} from '../../art/core/timeline';
export interface OpeningDocuments {timeline:TimelineProgram;compositionId:string;composition:ChunkDocument;compositions:Record<string,ChunkDocument>}
const compositions={'sequence-title':art.validate(title),'sequence-opening':art.validate(composition)};
export const openingDocuments:OpeningDocuments={compositionId:'sequence-opening',composition:compositions['sequence-opening'],compositions,timeline:sequenceProgram(compositions)};
