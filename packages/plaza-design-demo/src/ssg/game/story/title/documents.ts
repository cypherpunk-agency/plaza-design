import composition from './composition.json';
import title from './title.composition.json';
import {art,type Composition} from '../../art';
import {sequenceProgram} from '../../art/core/sequence';
import type {TimelineProgram} from '../../art/core/timeline';
export interface OpeningDocuments {timeline:TimelineProgram;compositionId:string;composition:Composition;compositions:Record<string,Composition>}
const compositions={'sequence-title':art.validate(title),'sequence-opening':art.validate(composition)};
export const openingDocuments:OpeningDocuments={compositionId:'sequence-opening',composition:compositions['sequence-opening'],compositions,timeline:sequenceProgram(compositions)};
