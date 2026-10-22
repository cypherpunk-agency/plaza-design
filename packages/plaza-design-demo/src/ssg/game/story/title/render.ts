/** The title and editor configure the same world frame as play. */
import {renderZoneSequenceFrame,type ZoneSequenceOptions} from '../../runtime/zone-sequence-frame';
import type {OpeningDocuments} from './documents';
import type {Light} from '../../world/light';
import type {TimelineDocument,TimelineFrame} from '../../art/core/timeline';
import type {Composition} from '../../art';
export interface OpeningRenderOptions extends Partial<ZoneSequenceOptions>{composition?:Composition;timeline?:TimelineDocument;frame?:TimelineFrame}
export function renderOpeningDocument(ctx:CanvasRenderingContext2D,view:{W:number;H:number;reduced:boolean;lighting:Light},documents:OpeningDocuments,id:string,seconds:number,options:OpeningRenderOptions={}){
 return renderZoneSequenceFrame(ctx,{...documents,composition:options.composition??documents.composition,timeline:options.timeline??documents.timeline},id,seconds,{...options,width:view.W,height:view.H,reduced:view.reduced,lighting:view.lighting,ambientTime:options.ambientTime??(id==='glide'?7+seconds:seconds)});
}
