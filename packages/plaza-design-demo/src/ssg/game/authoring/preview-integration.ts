import type {ViewportState} from './viewport-input';
import type {TimelineContext} from '../art/core/timeline';

import {type Composition} from '../art/core/composition';
import {evaluateTimeline,type TimelineProgram,type TimelineFrame,type Sequence} from '../art/core/timeline';

import type {EditorDocument,PreviewRequest,PreviewResult,ComposerConfig} from './contracts';
const copy = <T>(value: T): T => structuredClone(value);
const message = (e: unknown) => e instanceof Error ? e.message : String(e);
export const createPreviewState=()=>({result:undefined as PreviewResult|undefined,resultDocument:'',previewGeneration:0,previewPending:false,renderAgain:false,workspaceAnchor:undefined as {document:string;x:number;h:number}|undefined,cropHeight:0,cropFor:'',lastPaintMs:0,renderCount:0});
export type PreviewState=ReturnType<typeof createPreviewState>;

interface PreviewPort{
 presented?:()=>void;
 reduced:boolean;
 disposed:boolean;
 painting:PreviewState;
 viewCompositionDocument:() => EditorDocument | undefined;
 previewError:HTMLDivElement;
 current:() => EditorDocument | undefined;
 canvas:HTMLCanvasElement;
 syncWorldState:() => void;
 currentTimeline:() => TimelineProgram | undefined;
 selectedDocumentId:string;
 viewport:ViewportState;
 evaluationContext:() => TimelineContext;
 sequence:() => Sequence | undefined;
 sequenceId:string;
 time:number;
 previewRequest:(composition: Composition, overlay: boolean, scale: number, frame?: TimelineFrame) => PreviewRequest;
 zoomable:() => boolean;
 crop:boolean;
 currentId:string;
 sizeCanvas:(width: number, height: number) => void;
 baseWidth:number;
 baseHeight:number;
 config:ComposerConfig;
 viewZoom:number;
 overlays:boolean;
 updateRenderStatus:() => void;
 placeHover:() => void;
 placeJoined:() => void;
 comparing:() => boolean;
 documentsForView:() => EditorDocument[];
 compareId:string;
 stage:HTMLDivElement;
 compareCanvas:HTMLCanvasElement;
}
/** Serialize native pending renders on the existing editor frame loop, coalescing overlapping requests. */
export function createPreviewRenderer(port:PreviewPort){
 const draw=async(advance=false)=>{
    if (port.disposed) return; const generation=advance?port.painting.previewGeneration:++port.painting.previewGeneration;if(port.painting.resultDocument!==port.currentId)port.painting.result=undefined; if (port.painting.previewPending) { port.painting.renderAgain = true; return; } const doc = port.viewCompositionDocument(); if (!doc) { port.painting.result = undefined; port.previewError.textContent = port.current()?.kind === 'world' ? 'World structure is read-only. Open a scene from the world panel to preview it.' : 'No composition selected.'; port.previewError.hidden = false; port.canvas.getContext('2d')?.clearRect(0, 0, port.canvas.width, port.canvas.height); return; }
    port.painting.previewPending = true; const documentId=port.currentId;
    const current=()=>!port.disposed&&generation===port.painting.previewGeneration&&documentId===port.currentId;
    try {
      port.syncWorldState();
      const timeline=port.currentTimeline(),base=(!port.selectedDocumentId||port.selectedDocumentId===doc.id?port.viewport.dragging?.pending:undefined)??doc.value as Composition,context=port.evaluationContext();
      const frame=timeline&&port.sequence()?evaluateTimeline(timeline,port.sequenceId,port.time,{...context,compositions:{...context.compositions,[doc.id]:base}},{reduced:port.reduced}):undefined;
      const composition=frame?.composition??base;
      const request = (overlay: boolean, scale: number) => port.previewRequest(composition, overlay, scale, frame);
      if (port.zoomable() && port.crop && port.painting.cropFor !== port.currentId) {
        // Measure once per document at the full frame; the floor stays anchored to the bottom edge.
        port.sizeCanvas(port.baseWidth, port.baseHeight); const measured = await port.config.preview.render(port.canvas, request(false, 1));
        if(!current())return;
        const visible = measured.bounds.filter(b => b.x + b.width > 0 && b.x < port.baseWidth && b.height > 0),top=Math.min(port.baseHeight,...visible.map(b=>b.y));
        port.painting.cropHeight = visible.length?Math.max(Math.min(port.baseHeight, 200), Math.min(port.baseHeight, Math.ceil(port.baseHeight - Math.max(0, top) + 12))):port.baseHeight; port.painting.cropFor = port.currentId;
      }
      port.sizeCanvas(port.baseWidth, port.zoomable() ? Math.round((port.crop && port.painting.cropHeight ? port.painting.cropHeight : port.baseHeight) * port.viewZoom) : port.baseHeight);
      const renderStarted=performance.now();const result=await port.config.preview.render(port.canvas,request(port.overlays,port.viewZoom));if(!current())return;port.painting.lastPaintMs=performance.now()-renderStarted;port.painting.renderCount++;port.updateRenderStatus();
      if (current()) { port.painting.result=result;port.painting.resultDocument=documentId;if(result.workspaceAnchor&&port.painting.workspaceAnchor?.document!==port.currentId)port.painting.workspaceAnchor={document:port.currentId,...result.workspaceAnchor};port.previewError.hidden=true;port.placeHover();port.placeJoined();port.presented?.(); }
      // Compare: the other version through the same renderer and request, only the composition differs.
      const other = port.comparing() ? port.documentsForView().find(d => d.id === port.compareId) : undefined;
      port.stage.classList.toggle('comparing', !!other); port.compareCanvas.hidden = !other;
      if (other && current()) {
        if (port.compareCanvas.width !== port.canvas.width || port.compareCanvas.height !== port.canvas.height) { port.compareCanvas.width = port.canvas.width; port.compareCanvas.height = port.canvas.height; }
        for (const key of ['--ratio', '--fit-ratio']) port.compareCanvas.style.setProperty(key, port.canvas.style.getPropertyValue(key));
        await port.config.preview.render(port.compareCanvas, { ...request(false, port.viewZoom), composition: copy(other.value as Composition), selectedId: undefined });
      }
    } catch (e) { if(!current())return;port.painting.result = undefined; port.presented?.(); port.previewError.textContent = `Preview unavailable: ${message(e)}`; port.previewError.hidden = false; }
    finally { port.painting.previewPending = false; if (port.painting.renderAgain&&!port.disposed) { port.painting.renderAgain = false; void draw(true); } }
  };
 return{draw};
}
