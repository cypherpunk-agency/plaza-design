import composition from './composition.json';
import timeline from './timeline.json';
import {art,type Composition} from '../../art';
import type {TimelineDocument} from '../../art/core/timeline';
export interface OpeningDocuments {timeline:TimelineDocument;compositionId:string;composition:Composition}
export const openingDocuments:OpeningDocuments={compositionId:'sequence-opening',composition:art.validate(composition),timeline:timeline as TimelineDocument};
