
import {panWorkspace} from './viewport-navigation';

import {type ChunkDocument,type AssetInstance} from '../art/core/composition';

import {ComposerModel} from './composer-model';
import type {EditorDocument,PreviewResult,ComposerConfig} from './contracts';
const flatten = (doc: ChunkDocument) => { const list: { node: AssetInstance; depth: number }[] = []; const visit = (nodes: AssetInstance[], depth: number) => nodes.forEach(node => { list.push({ node, depth }); visit(node.children ?? [], depth + 1); }); visit(doc.instances, 0); return list; };
const message = (e: unknown) => e instanceof Error ? e.message : String(e);
export interface ViewportState {
 hoverId:string;
 panning?:{x:number;y:number;camera:number;scroll:number;moved:boolean;target?:string};
 pinch?:{distance:number;zoom:number};
 touches:Map<number,{x:number;y:number}>;
 dragging?:{before:ChunkDocument;pending:ChunkDocument;x:number;y:number;id:string;delta:PreviewResult['deltaToLocal'];armed:boolean;clientX:number;clientY:number};
}
export const createViewportState=():ViewportState=>({hoverId:'',touches:new Map()});

const copy=<T>(value:T):T=>structuredClone(value);
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export interface ViewportInputPort{
 navigable:() => boolean;
 viewport:ViewportState;
 sequenceNav:{ zoom: number; x: number; y: number; };
 stage:HTMLDivElement;
 canvas:HTMLCanvasElement;
 selectedId:string;
 select_:(id: string) => void;
 closePicker:() => void;
 coordinates:(event: { clientX: number; clientY: number; }) => { x: number; y: number; };
 hitTest:(point:{x:number;y:number})=>{id:string;x:number;y:number;width:number;height:number}|undefined;
 preview:PreviewResult | undefined;
 compositionDocument:() => EditorDocument | undefined;
 zoomTo:(next: number, anchor?: { clientX: number; clientY: number; }) => void;
 cameraPreview:boolean;
 draw:() => Promise<void>;
 placeHover:() => void;
 snap:number;
 config:ComposerConfig;
 dragPreviewDirty:boolean;
 notice:(text: string, error?: boolean) => void;
 refreshOptions:() => void;
 run:(action: () => void) => void;
 commitDrag?:(pending:ChunkDocument)=>void;
 validateDrag?:(pending:ChunkDocument)=>void;
 model:ComposerModel;
 placeJoined:() => void;
 compareCanvas:HTMLCanvasElement;
 editInstance:(name: string, action: (node: AssetInstance) => void) => void;
 current:() => EditorDocument | undefined;
 openPicker:() => void;
 fit:() => void;
}
export function mountViewportInput(port:ViewportInputPort){
 const abort=new AbortController();
 let dragError='';
  const panButton = (event: PointerEvent) => event.button === 1 || event.button === 2;
  const startPan = (event: PointerEvent, surface: HTMLElement, target: string | undefined) => {
    event.preventDefault();if(!port.navigable())return;
    port.viewport.panning = { x: event.clientX, y: event.clientY, camera:port.sequenceNav.x,scroll:port.sequenceNav.y, moved: false, target }; surface.setPointerCapture(event.pointerId); port.canvas.dataset.panning = ''; if (surface === port.stage) port.stage.dataset.panning = '';
  };
  /** A press on empty space: touch pans (a tap deselects on release), a mouse or pen click deselects straight away. */
  const pressEmpty = (event: PointerEvent, surface: HTMLElement) => {
    if (event.pointerType === 'touch') { startPan(event, surface, ''); if (!port.navigable() && port.selectedId) port.select_(''); return; }
    event.preventDefault(); if (port.selectedId) port.select_('');
  };
  port.stage.addEventListener('contextmenu',event => event.preventDefault(),{signal:abort.signal});
  port.stage.addEventListener('pointerdown',event => {
    if (event.target !== port.stage) return; port.closePicker();
    if (panButton(event)) startPan(event, port.stage, undefined); else if (event.button === 0) pressEmpty(event, port.stage);
  },{signal:abort.signal});
  port.stage.addEventListener('pointermove',event => { if (port.viewport.panning && event.target === port.stage) port.canvas.onpointermove?.call(port.canvas, event); },{signal:abort.signal});
  port.stage.addEventListener('pointerup',event => { if (!port.stage.hasPointerCapture(event.pointerId)) return; port.stage.releasePointerCapture(event.pointerId); delete port.stage.dataset.panning; port.canvas.onpointerup?.call(port.canvas, event); },{signal:abort.signal});
  port.stage.addEventListener('pointercancel',event => { if (port.stage.hasPointerCapture(event.pointerId)) { delete port.stage.dataset.panning; port.canvas.onpointercancel?.call(port.canvas, event); } },{signal:abort.signal});
  port.canvas.onpointerdown = event => {
    port.closePicker();
    if (event.pointerType === 'touch') { port.viewport.touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (port.viewport.touches.size === 2) { const [a, b] = [...port.viewport.touches.values()]; port.viewport.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom:port.sequenceNav.zoom};port.viewport.dragging = undefined; port.viewport.panning = undefined; return; } }
    if (panButton(event)) { startPan(event, port.canvas, undefined); return; }
    if (event.button !== 0) return;
    const point = port.coordinates(event), hit = port.hitTest(point);
    if (!hit) { pressEmpty(event, port.canvas); return; }
    event.preventDefault(); port.canvas.focus({ preventScroll: true });
    dragError='';
    if (hit.id !== port.selectedId || port.preview?.sources?.[hit.id]) port.select_(hit.id);
    const doc = port.compositionDocument(); if (!doc || !port.preview?.deltaToLocal) return;
    const deltaToLocal=port.preview.deltaToLocal;
    const before=copy(doc.value as ChunkDocument),sample=port.preview.resolved?.[hit.id]?.authored,source=flatten(before).find(n=>n.node.id===port.selectedId)?.node;if(sample&&source){source.placement.x=sample.x;source.placement.h=sample.h;}
    port.viewport.dragging = { before, pending: copy(before), x: point.x, y: point.y, id: port.selectedId, delta: (_id,dx,dy)=>deltaToLocal(hit.id,dx,dy), armed: false, clientX: event.clientX, clientY: event.clientY }; port.canvas.setPointerCapture(event.pointerId);
  };
  port.canvas.onpointermove = event => {
    if (port.viewport.touches.has(event.pointerId)) { port.viewport.touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (port.viewport.pinch && port.viewport.touches.size === 2) { const [a, b] = [...port.viewport.touches.values()]; port.zoomTo(port.viewport.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, port.viewport.pinch.distance), { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); return; } }
    if (port.viewport.panning) { const rect = port.canvas.getBoundingClientRect(), dx = event.clientX - port.viewport.panning.x, dy = event.clientY - port.viewport.panning.y; if (Math.abs(dx) + Math.abs(dy) > 3) port.viewport.panning.moved = true; if(!port.cameraPreview){const unit=port.canvas.width/rect.width/(port.preview?.workspaceScale??1);Object.assign(port.sequenceNav,panWorkspace({x:port.viewport.panning.camera,y:port.viewport.panning.scroll,zoom:port.sequenceNav.zoom},{x:dx,y:dy},unit));void port.draw();}return; }
    if (!port.viewport.dragging) { if (event.pointerType === 'mouse') { const hit = port.hitTest(port.coordinates(event)); port.canvas.dataset.hover = hit ? 'artwork' : 'empty'; if ((hit?.id ?? '') !== port.viewport.hoverId) { port.viewport.hoverId = hit?.id ?? ''; port.placeHover(); } } return; }
    if (!port.viewport.dragging.armed) { if (Math.hypot(event.clientX - port.viewport.dragging.clientX, event.clientY - port.viewport.dragging.clientY) < 3) return; port.viewport.dragging.armed = true; port.canvas.dataset.dragging = ''; }
    try { const point = port.coordinates(event), delta = port.viewport.dragging.delta!(port.viewport.dragging.id, point.x - port.viewport.dragging.x, point.y - port.viewport.dragging.y), source = flatten(port.viewport.dragging.before).find(x => x.node.id === port.viewport.dragging!.id)?.node; if(!source)throw Error('Missing drag source '+port.viewport.dragging.id+' in '+port.viewport.dragging.before.scene);const next = copy(port.viewport.dragging.before), target = flatten(next).find(x => x.node.id === port.viewport.dragging!.id)!.node; target.placement.x = port.snap ? Math.round((source.placement.x + delta.x) / port.snap) * port.snap : source.placement.x + delta.x; target.placement.h = port.snap ? Math.round((source.placement.h + delta.h) / port.snap) * port.snap : source.placement.h + delta.h; port.validateDrag?.(next);port.viewport.dragging.pending=next;dragError='';port.dragPreviewDirty=true; } catch (e) { const reason=message(e);if(reason!==dragError){dragError=reason;port.notice(reason,true);} }
  };
  port.canvas.onpointerup = event => {
    port.viewport.touches.delete(event.pointerId); if (port.viewport.touches.size < 2) port.viewport.pinch = undefined;
    if (port.viewport.panning) { const { moved, target } = port.viewport.panning; port.viewport.panning = undefined; delete port.canvas.dataset.panning; if (port.canvas.hasPointerCapture(event.pointerId)) port.canvas.releasePointerCapture(event.pointerId); if (!moved && target !== undefined) port.select_(target); else port.refreshOptions(); return; }
    if (!port.viewport.dragging) return; const pending = port.viewport.dragging.pending, unchanged = !port.viewport.dragging.armed || equal(pending, port.viewport.dragging.before); port.viewport.dragging = undefined; delete port.canvas.dataset.dragging; if (port.canvas.hasPointerCapture(event.pointerId)) port.canvas.releasePointerCapture(event.pointerId); try{if(!unchanged){if(port.commitDrag)port.commitDrag(pending);else port.run(()=>port.model.edit(port.compositionDocument()!.id,'Drag artwork',()=>pending));}}finally{port.dragPreviewDirty=true;void port.draw();}
  };
  port.canvas.onpointercancel = event => { port.viewport.touches.delete(event.pointerId); port.viewport.pinch = undefined; port.viewport.panning = undefined; delete port.canvas.dataset.panning; port.viewport.dragging = undefined; delete port.canvas.dataset.dragging; void port.draw(); };
  port.stage.addEventListener('scroll',() => { port.placeHover(); port.placeJoined(); },{...{ passive: true },signal:abort.signal});
  port.canvas.onpointerleave = () => { if (port.viewport.hoverId) { port.viewport.hoverId = ''; port.placeHover(); } };
  // The comparison picture shares the camera and never selects: a left press is empty space, middle/right drag pans both.
  port.compareCanvas.onpointerdown = event => {
    port.closePicker(); if (panButton(event)) startPan(event, port.compareCanvas, undefined); else if (event.button === 0) pressEmpty(event, port.compareCanvas);
  };
  port.compareCanvas.onpointermove = event => port.canvas.onpointermove?.call(port.canvas, event);
  port.compareCanvas.onpointerup = event => { if (port.compareCanvas.hasPointerCapture(event.pointerId)) port.compareCanvas.releasePointerCapture(event.pointerId); port.canvas.onpointerup?.call(port.canvas, event); };
  port.compareCanvas.onpointercancel = event => port.canvas.onpointercancel?.call(port.canvas, event);
  /** Maps a point on the comparison picture to the same spot on the main one (both show the same view). */
  const onMain = (event: WheelEvent) => { if (event.target !== port.compareCanvas) return event; const from = port.compareCanvas.getBoundingClientRect(), to = port.canvas.getBoundingClientRect(); return { clientX: to.left + (event.clientX - from.left) * to.width / from.width, clientY: to.top + (event.clientY - from.top) * to.height / from.height }; };
  const onWheel = (event: WheelEvent) => {
    if(!port.navigable())return;
    event.preventDefault();if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)){if(!port.cameraPreview){const rect=port.canvas.getBoundingClientRect();port.sequenceNav.x+=(event.deltaX||event.deltaY)*port.canvas.width/rect.width/(port.preview?.workspaceScale??1);void port.draw();}}else port.zoomTo(port.sequenceNav.zoom*Math.exp(-event.deltaY*.002),onMain(event));
  };
  // One listener on the stage covers both pictures and the empty area around them.
  port.stage.addEventListener('wheel',onWheel,{...{...{ passive: false },signal:abort.signal},signal:abort.signal});
  port.canvas.onkeydown = event => {
    if(event.altKey&&port.selectedId&&event.key.startsWith('Arrow')){event.preventDefault();const step=event.shiftKey?10:port.snap||1;port.editInstance('Nudge artwork',n=>{n.placement.x+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;n.placement.h+=event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0;});return;}
    if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key;
    if (key === 'Escape' && port.selectedId) { event.preventDefault(); port.select_(''); }
    else if (key.toLowerCase() === 'a' && port.current()?.kind === 'composition') { event.preventDefault(); port.openPicker(); }
    else if (port.navigable() && (key === '+' || key === '=')) { event.preventDefault(); port.zoomTo((port.sequenceNav.zoom)*1.25); }
    else if (port.navigable() && (key === '-' || key === '_')) { event.preventDefault(); port.zoomTo((port.sequenceNav.zoom)/1.25); }
    else if (port.navigable() && key === '0') { event.preventDefault(); port.zoomTo(1); }
    else if (port.navigable() && key.toLowerCase() === 'f') { event.preventDefault(); port.fit(); }
    else if (port.selectedId && ['ArrowUp','ArrowDown'].includes(key) && port.current()?.kind === 'composition') {
      event.preventDefault(); const step = event.shiftKey ? 10 : port.snap || 1, dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0, dh = key === 'ArrowUp' ? step : key === 'ArrowDown' ? -step : 0;
      port.editInstance('Nudge artwork', n => { n.placement.x += dx; n.placement.h += dh; }); port.canvas.focus();
    }
  };

return()=>{abort.abort();for(const surface of [port.canvas,port.compareCanvas]){surface.onpointerdown=null;surface.onpointermove=null;surface.onpointerup=null;surface.onpointercancel=null;surface.onpointerleave=null;surface.onkeydown=null;}port.viewport.touches.clear();port.viewport.dragging=undefined;port.viewport.panning=undefined;port.viewport.pinch=undefined;};
}
