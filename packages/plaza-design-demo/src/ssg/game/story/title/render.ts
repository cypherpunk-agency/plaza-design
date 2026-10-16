/** Controller prepares actor schedules once; library renders immutable pose inputs. */
import{evaluateTimeline}from'../../art/core/timeline';
import{renderOpeningSequence,openingTimelineContext,type OpeningDocuments,type OpeningRenderOptions}from'../../art/sequences/opening/sequence';
import{openingFrame,type GlideView}from'../../art/sequences/opening/glide';
import{openingActorSnapshots}from'./actors';
export function renderOpeningDocument(ctx:CanvasRenderingContext2D,view:GlideView,documents:OpeningDocuments,sequenceId:string,seconds:number,options:OpeningRenderOptions={}){
 const mode=options.mode??(sequenceId==='title'||sequenceId==='rise'?sequenceId:'glide'),ambient=options.ambientTime??(mode==='glide'?7+seconds:seconds),composition=options.composition??documents.composition,timeline=options.timeline??documents.timeline;
 const context=openingTimelineContext(ctx,view,{...documents,composition,timeline},ambient,sequenceId);context.registry=options.registry??context.registry;
 const originalFrame=options.frame??evaluateTimeline(timeline,sequenceId,seconds,context,{reduced:view.reduced}),frame={...originalFrame,state:{...originalFrame.state}},actors=options.actors??openingActorSnapshots(ambient,view.reduced,frame.composition);
 // Nested residents also need pose geometry in authoring overlays.
 const walk=(rows:typeof composition.instances)=>rows.forEach(n=>{if(actors[n.id])frame.state[n.id]={...frame.state[n.id],pose:actors[n.id] as unknown as import('../../art/core/composition').Value};walk(n.children??[]);});walk(frame.composition.instances);
 return renderOpeningSequence(ctx,view,documents,sequenceId,seconds,{...options,frame,actors});
}
export function nativeOpeningFrame(ctx:CanvasRenderingContext2D,view:GlideView,time:number,tau:number|null){return openingFrame(ctx,view,time,tau,{actors:openingActorSnapshots(time,view.reduced)});}
