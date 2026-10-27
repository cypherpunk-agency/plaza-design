/** Playback supplies time and source to the ordinary shared frame renderer. */
import {art} from '../../art';
import {renderWorldFrame} from '../../runtime/render-scene';
import type {ZoneSequenceOptions} from '../../runtime/prepare-frame';
import type {OpeningDocuments} from './documents';
import type {Light} from '../../world/light';
import type {TimelineProgram,TimelineFrame} from '../../art/core/timeline';
import type {ChunkDocument} from '../../art';
export interface OpeningRenderOptions extends Partial<ZoneSequenceOptions>{capture?:boolean;composition?:ChunkDocument;timeline?:TimelineProgram;frame?:TimelineFrame}
export function renderOpeningDocument(ctx:CanvasRenderingContext2D,view:{W:number;H:number;reduced:boolean;lighting:Light},documents:OpeningDocuments,id:string,seconds:number,options:OpeningRenderOptions={}){
 const timeline=options.timeline??documents.timeline,sequence=timeline.sequences.find(s=>s.id===id)!;
 const composition=options.composition??documents.compositions[sequence.composition];
 return renderWorldFrame({kind:'sequence',context:ctx,capture:options.capture,documents,timeline,composition,sequenceId:id,registry:art,frame:options.frame,scale:ctx.getTransform().a||1,width:view.W,height:view.H,reduced:view.reduced,lighting:view.lighting,time:seconds,world:{...options,ambientTime:options.ambientTime??(id==='glide'?7+seconds:seconds)}});
}
