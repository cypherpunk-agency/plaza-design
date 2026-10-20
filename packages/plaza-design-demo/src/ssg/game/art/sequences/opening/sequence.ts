import type{OpeningActors}from'./poses';
import{validatePreparedCharacter}from'../../characters/prepared';
import {frameView} from '../../core/view';
/** Shared native dispatcher: runtime and composer evaluate these same ordered pieces. */
import { ArtRegistry, resolveComposition, drawComposition, compositionAppearance, type Composition, type Element, type Properties, type Value } from '../../core/composition';
import { evaluateTimeline, validateTimeline, type TimelineDocument, type TimelineContext, type TimelineFrame } from '../../core/timeline';
import { openingFrame, type GlideView, type OpeningPiece } from './glide';
import { glideDist, GLIDE } from './path';
import { coastPieceIds, coastMiddlePieceIds, coastFrontPieceIds } from './coast';
import { townPieceIds, townLampIds, townPeopleIds } from './town';
import { groupElement } from '../../assemblies/group';
import { openingFields, openingGeometry } from './metadata';
import type { PieceInput } from './piece-inputs';

export const openingGroups: Record<string, string[]> = { coast: coastPieceIds, town: townPieceIds, lamps: townLampIds, 'coast-mid': coastMiddlePieceIds, people: townPeopleIds, 'coast-front': coastFrontPieceIds };
export const openingPieceIds = ['sky', 'sun', 'far-shore', 'spire', 'sea', 'boats', 'breakwater', 'skyline', 'air', ...coastPieceIds.map(id => 'coast.' + id), ...townPieceIds.map(id => 'town.' + id), 'air-canyon', 'ring', 'air-over', 'line0', ...townLampIds.map(id => 'lamps.' + id), ...coastMiddlePieceIds.map(id => 'coast-mid.' + id), ...townPeopleIds.map(id => 'people.' + id), 'traffic', ...coastFrontPieceIds.map(id => 'coast-front.' + id), 'under', 'foreground', 'rain', 'tunnel-fade'];
const names: Record<string, string> = { sky: 'Dawn sky and clouds', sun: 'Slatted rising sun', 'far-shore': 'Distant bay shore', spire: 'Spire across the bay', sea: 'Dawn sea and reflections', boats: 'Distant boats', breakwater: 'Inlet breakwater', skyline: 'Downtown skyline bands', air: 'Distant air traffic', coast: 'Continuous coast and ground', town: 'Downtown architecture', 'air-canyon': 'Canyon traffic', ring: 'Elevated Ring', 'air-over': 'Traffic above the Ring', line0: 'LINE 0 and ramp', lamps: 'Town lamps', 'coast-mid': 'Coast furniture and machinery', people: 'Town people', traffic: 'Street vehicles', 'coast-front': 'Coast foreground props', under: 'Tunnel and Undercity', foreground: 'Near foreground', rain: 'Opening rain', 'tunnel-fade': 'Tunnel darkness' };
const clock = { kind: 'number' as const, label: 'Time seconds', default: 0 };
const geometryFrames = new Map<string, ReturnType<typeof openingFrame>>();
function metrics(state: Properties) {
  const key = JSON.stringify([state.width,state.height,state.reduced,state.time,state.tau,state.cameraX,state.cameraH]); let frame = geometryFrames.get(key);
  if (!frame) {
    const context = {getTransform:()=>({a:1})} as unknown as CanvasRenderingContext2D;
    frame = openingFrame(context,{W:state.width as number??420,H:state.height as number??195,reduced:!!state.reduced,lighting:frameView(0).lighting},state.time as number??0,(state.tau as number??-1)<0?null:state.tau as number,{x:state.cameraX as number??0,h:state.cameraH as number??0});
    geometryFrames.set(key,frame); if(geometryFrames.size>32)geometryFrames.delete(geometryFrames.keys().next().value!);
  } return frame;
}
export const openingElements: Element[] = openingPieceIds.map(id => ({
  type: `sequence.opening.${id}`, version: 1, label: names[id] ?? id.replace(/[.-]/g, ' '), category: 'Opening sequence', coordinates: 'world', parts: ['backdrop'], fields: openingFields(id),
  visualFields: { time: clock, tau: { ...clock, default: -1 }, reduced: { kind: 'boolean', label: 'Reduced motion', default: false }, width:{kind:'number',label:'Native viewport width',default:420,min:1},height:{kind:'number',label:'Native viewport height',default:195,min:1},cameraX: { ...clock, label: 'Camera X' }, cameraH: { ...clock, label: 'Camera drop' }, ...(/^(coast-mid|people).person-/.test(id)?{pose:{kind:'json' as const,label:'Prepared actor pose',default:{visible:false,character:{x:0}},validate:validatePreparedCharacter}}:{}),...(id==='tunnel-fade'?{dark:{...clock,label:'Darkness',min:0,max:1,animatable:true}}:{}) },
  bounds: (props, state) => {const native=metrics(state),geometry=openingGeometry(id,{...native.coast,pose:state.pose as unknown as import('../../../runtime/characters').PreparedCharacter},props);if(!geometry)return{x:0,h:0,w:native.W,tall:native.H};return{...geometry.bounds,h:geometry.bounds.h+(native.parts.find(p=>p.id===id)?.space==='near'?Math.round(native.drop):0)};},
  anchors: (props,state) => {const native=metrics(state),geometry=openingGeometry(id,{...native.coast,pose:state.pose as unknown as import('../../../runtime/characters').PreparedCharacter},props);if(!geometry)return{origin:{x:0,h:0,role:'origin'}};const drop=native.parts.find(p=>p.id===id)?.space==='near'?Math.round(native.drop):0;return Object.fromEntries(Object.entries(geometry.anchors).map(([key,anchor])=>[key,{...anchor,h:anchor.h+drop}]));},
  draw(ctx, view, props, state, _pass, placement) {
    const frame = openingFrame(ctx, { W: view.viewW, H: view.viewH, reduced: !!state.reduced,lighting:view.lighting }, state.time as number, (state.tau as number) < 0 ? null : state.tau as number, { x: state.cameraX as number, h: state.cameraH as number, ...(id === 'tunnel-fade' ? { dark: state.dark as number } : {}),actors:{},pieces:{[id]:{props,pose:state.pose as unknown as import('../../../runtime/characters').PreparedCharacter,cull:{x:placement.x,scale:placement.scale,facing:placement.facing,width:view.viewW}}} });
    const part = frame.parts.find(p => p.id === id)!;
    ctx.save(); ctx.scale(frame.scale, frame.scale); ctx.translate(placement.x, -placement.h); if (part.space === 'near') ctx.translate(0, Math.round(-frame.drop)); part.draw(); ctx.restore();
  },
}));
export const openingRegistry = new ArtRegistry().register(groupElement); openingElements.forEach(e => openingRegistry.register(e));
export interface OpeningDocuments { timeline: TimelineDocument; compositionId: string; composition: Composition }
export interface OpeningRenderOptions {
  /** Native decorative clock; it deliberately continues while the title menu waits. */
  ambientTime?: number; composition?: Composition; timeline?: TimelineDocument; frame?: TimelineFrame;
  reduced?: boolean; registry?: ArtRegistry; overlays?: boolean;
  mode?: 'title' | 'rise' | 'glide';
  actors?:OpeningActors;
}
const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
export function openingTimelineContext(ctx: CanvasRenderingContext2D, view: GlideView, documents: OpeningDocuments, ambientTime: number, sequenceId: string): TimelineContext {
  const tau = sequenceId === 'title' || sequenceId === 'rise' ? null : undefined;
  const duration = documents.timeline.sequences.find(sequence => sequence.id === sequenceId)?.duration ?? GLIDE;
  return { registry: openingRegistry, compositions: { [documents.compositionId]: documents.composition }, destinations: { train: [] }, motionTracks: {
    'opening.glide-distance': { validate: noProps, evaluate: time => glideDist(time) },
    'opening.drop': { validate: noProps, evaluate: time => openingFrame(ctx, view, ambientTime, tau === null ? null : time).drop },
    'opening.tunnel-dark': { validate: noProps, evaluate: time => smooth(duration - 1.6, duration - 0.4, time) },
  } };
}
function noProps(props: Properties) { if (Object.keys(props).length) throw new Error('This exact motion formula takes no parameters'); }
/** Timelines drive camera and ordered composition placements without changing native paint state. */
export function renderOpeningSequence(ctx: CanvasRenderingContext2D, view: GlideView, documents: OpeningDocuments, sequenceId: string, seconds: number, options: OpeningRenderOptions = {}) {
  const mode = options.mode ?? (sequenceId === 'title' || sequenceId === 'rise' ? sequenceId : 'glide');
  const ambientTime = options.ambientTime ?? (mode === 'glide' ? 7 + seconds : seconds), composition = options.composition ?? documents.composition;
  const timeline = options.timeline ?? documents.timeline, context = openingTimelineContext(ctx, view, { ...documents, composition, timeline }, ambientTime, sequenceId);
  context.registry = options.registry ?? openingRegistry;
  const frame = options.frame ?? evaluateTimeline(timeline, sequenceId, seconds, context, { reduced: view.reduced });
  const selected = frame.composition;
  const tunnel = selected.instances.find(n => n.type === 'sequence.opening.tunnel-fade');
  const dark = tunnel ? frame.state[tunnel.id]?.dark as number | undefined : undefined;
  let native = openingFrame(ctx, view, ambientTime, mode === 'glide' ? seconds : null, { actors:options.actors,x: frame.camera.x, h: frame.camera.h, ...(dark !== undefined ? { dark } : {}) });
  const state: Record<string, Properties> = {};
  const collect = (nodes: Composition['instances']) => nodes.forEach(n => { state[n.id] = n.type.startsWith('sequence.opening.') ? { time: ambientTime, tau: mode === 'glide' ? seconds : -1, reduced: view.reduced,width:native.W,height:native.H,cameraX: frame.camera.x, cameraH: frame.camera.h,...(n.type==='sequence.opening.tunnel-fade'?{dark:dark??0}:{}), ...(options.actors?.[n.id]?{pose:options.actors[n.id] as unknown as Value}:{}),...(frame.state[n.id] ?? {}) } : frame.state[n.id] ?? {}; collect(n.children ?? []); }); collect(selected.instances);
  const registry = options.registry ?? openingRegistry;
  const viewForParts = { ...frameView(ambientTime*60,view.lighting),viewW: native.W, viewH: native.H, cam: frame.camera.x, gy: 0, t: ambientTime * 60, flags: {}, sx: (x: number) => x, y: (h: number) => -h };
  const resolved = resolveComposition(registry, selected, { view: viewForParts, state, reduced: view.reduced });
  const appearance = compositionAppearance(selected, { visibility: frame.visibility, opacity: frame.opacity });
  const inputs:Record<string,PieceInput>={};
  const propertyChanges=new Map<string,boolean>();
  for(const row of resolved)if(row.instance.type.startsWith('sequence.opening.')){const p=row.placement,z=frame.camera.zoom,edited=JSON.stringify(row.props)!==JSON.stringify(registry.properties(row.instance.type,{}));propertyChanges.set(row.instance.id,edited);const changed=p.x!==0||p.scale!==1||p.facing!==1||z!==1||edited;inputs[row.instance.type.slice('sequence.opening.'.length)]={props:row.props,...(options.actors?.[row.instance.id]?{pose:options.actors[row.instance.id]}:{}),...(changed?{cull:{x:p.x*z+(1-z)*native.W/2,scale:p.scale*z,facing:p.facing,width:native.W,unculled:edited}}:{})};}
  native=openingFrame(ctx,view,ambientTime,mode==='glide'?seconds:null,{actors:options.actors,x:frame.camera.x,h:frame.camera.h,...(dark!==undefined?{dark}:{}),pieces:inputs});
  const jobs = new Map(native.parts.map(part => [part.id, part]));
  const counts=new Map<string,number>();for(const row of resolved)counts.set(row.instance.type,(counts.get(row.instance.type)??0)+1);
  ctx.save(); ctx.scale(native.scale, native.scale);
  if (frame.camera.zoom !== 1) { ctx.translate(native.W / 2, native.H / 2); ctx.scale(frame.camera.zoom, frame.camera.zoom); ctx.translate(-native.W / 2, -native.H / 2); }
  let near = false;
  try {
    for (const resolvedPiece of resolved) {
      const node = resolvedPiece.instance, partId = node.type.replace('sequence.opening.', ''); let part: OpeningPiece | undefined = jobs.get(partId);
      const look = appearance.get(node.id)!; if (!look.visible || look.opacity === 0) continue;
      if (!part) {
        if (!resolvedPiece.element.parts.length) continue;
        if (near) { ctx.restore(); near = false; }
        const standalone = { ...node, placement: resolvedPiece.placement }; delete standalone.attach; delete standalone.children;
        drawComposition(ctx, registry, { version: 1, scene: selected.scene, instances: [standalone] }, { view: viewForParts, state: frame.state, reduced: view.reduced, visibility: { [node.id]: look.visible }, opacity: { [node.id]: look.opacity }, clips: frame.clips, sequenceTime: seconds }, node.pass ?? 'backdrop');
        continue;
      }
      if ((part.space === 'near') !== near) { if (near) ctx.restore(); else { ctx.save(); ctx.translate(0, Math.round(-native.drop)); } near = part.space === 'near'; }
      const p = resolvedPiece.placement, opacity = look.opacity;
      if (p.parallax !== 1 || counts.get(node.type)!>1) part = openingFrame(ctx, view, ambientTime, mode === 'glide' ? seconds : null, { actors:options.actors,x: frame.camera.x * p.parallax, h: frame.camera.h, ...(dark !== undefined ? { dark } : {}),pieces:{...inputs,[partId]:{props:resolvedPiece.props,...(options.actors?.[node.id]?{pose:options.actors[node.id]}:{}),...(p.x!==0||p.scale!==1||p.facing!==1||frame.camera.zoom!==1||propertyChanges.get(node.id)?{cull:{x:p.x*frame.camera.zoom+(1-frame.camera.zoom)*native.W/2,scale:p.scale*frame.camera.zoom,facing:p.facing,width:native.W,unculled:propertyChanges.get(node.id)}}:{})}} }).parts.find(job => job.id === partId)!;
      const changed = p.x !== 0 || p.h !== 0 || p.scale !== 1 || p.facing !== 1 || opacity !== 1;
      if (changed) { ctx.save(); ctx.translate(p.x, -p.h); ctx.scale(p.scale * p.facing, p.scale); ctx.globalAlpha *= opacity; }
      try { part.draw(); } finally { if (changed) ctx.restore(); }
    }
    if (near) { ctx.restore(); near = false; }
    for (const fade of frame.fades) if (fade.opacity > 0) { ctx.save(); ctx.globalAlpha = fade.opacity; ctx.fillStyle = fade.color; ctx.fillRect(0, 0, native.W, native.H); ctx.restore(); }
    for (const card of frame.text) { ctx.save(); ctx.fillStyle = '#ffdfb5'; ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.fillText(card.text, card.x, -card.h); ctx.restore(); }
  } finally { if (near) ctx.restore(); ctx.restore(); }
  return { frame, scale: native.scale, width: native.W, height: native.H };
}
export function validateOpeningDocuments(ctx: CanvasRenderingContext2D, view: GlideView, documents: OpeningDocuments) {
  openingRegistry.validate(documents.composition);
  return validateTimeline(documents.timeline, openingTimelineContext(ctx, view, documents, 7, 'glide'));
}
export type SequenceValue = Value;
