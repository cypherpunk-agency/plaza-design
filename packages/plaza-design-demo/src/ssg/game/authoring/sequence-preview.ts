import{renderOpeningDocument}from'../story/title/render';
import{lightAt}from'../world/light';
import {frameView} from '../art/core/view';
/** Sequence authoring adapter. Cutscenes and the taxi flight draw through the one frame (runtime/sequence-frame.ts); the opening still has its own path (ROADMAP item 0, being moved). */
import { resolveComposition, compositionAppearance, type ArtRegistry, type Composition, type Properties, type Resolved } from '../art/core/composition';
import { evaluateTimeline, type TimelineContext, type MotionTrack, type TimelineFrame } from '../art/core/timeline';
import { openingFrame } from '../art/sequences/opening/glide';
import { openingTimelineContext } from '../art/sequences/opening/sequence';
import { openingGeometry } from '../art/sequences/opening/metadata';
import { cinematicGeometry } from '../art/sequences/cinematic-metadata';
import { cinematicTimelineContext, cutView } from '../art/sequences/cinematics';
import { renderSequenceFrame } from '../runtime/sequence-frame';
import { IntroSeekSession } from '../story/cutscenes/skyline-session';
import { openingDocuments } from '../story/title/documents';
import { cinematicDocuments } from '../story/cutscenes/documents';
import { renderCutsceneDocument } from '../story/cutscenes';
import type { ComposerConfig, PreviewRequest, PreviewResult } from './app';

const motionNames = ['opening.glide-distance', 'opening.drop', 'opening.tunnel-dark', 'intro.camera', 'intro.rain', 'intro.fade', 'act2.fade', 'act2.ferry', 'act2.title-one', 'act2.title-found', 'act2.title-two', 'act2.title-subtitle', 'taxi.cab-x', 'taxi.cab-y', 'taxi.fade'];
/** No DOM, fake canvas or evaluation during source validation. Runtime context supplies real view inputs. */
export function createSequenceValidationContext(registry: ArtRegistry, compositions: Record<string, Composition>, destinations: TimelineContext['destinations'] = {}): TimelineContext {
  const motionTracks: Record<string, MotionTrack> = {};
  for (const name of motionNames) motionTracks[name] = { validate(props: Properties) { if (Object.keys(props).length) throw new Error(`${name}: this exact motion formula takes no parameters`); }, evaluate() { throw new Error(`${name}: use the live sequence environment to evaluate motion`); } };
  const clips=Object.fromEntries(registry.catalog().filter(element=>Object.keys(element.animationClips??{}).length>0).map(element=>[element.type,Object.keys(element.animationClips!)]));
  return { registry,compositions,clips,destinations:{train:[],capsule:[],stacks:[],...destinations},motionTracks };
}
const finite = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
interface Rect { x: number; y: number; width: number; height: number }
function nodes(doc: Composition) { const result: Composition['instances'] = []; const visit = (xs: Composition['instances']) => xs.forEach(n => { result.push(n); visit(n.children ?? []); }); visit(doc.instances); return result; }
function transformed(rect: Rect, piece: Resolved, width: number, height: number, zoom: number, scale: number): Rect {
  const p = piece.placement, x1 = rect.x * p.scale * p.facing + p.x, x2 = (rect.x + rect.width) * p.scale * p.facing + p.x;
  const y1 = rect.y * p.scale - p.h, y2 = (rect.y + rect.height) * p.scale - p.h;
  return { x: ((Math.min(x1, x2) - width / 2) * zoom + width / 2) * scale, y: ((Math.min(y1, y2) - height / 2) * zoom + height / 2) * scale, width: Math.abs(x2 - x1) * zoom * scale, height: Math.abs(y2 - y1) * zoom * scale };
}
function result(rows: Resolved[], getRect: (row: Resolved) => Rect | undefined, width: number, height: number, zoom: number, scale: number, frame: TimelineFrame): PreviewResult {
  const appearance = compositionAppearance(frame.composition, { visibility: frame.visibility, opacity: frame.opacity });
  const bounds = rows.filter(row => appearance.get(row.instance.id)!.visible && appearance.get(row.instance.id)!.opacity !== 0).flatMap(row => { const rect = getRect(row); return rect && rect.width > 0 && rect.height > 0 ? [{ id: row.instance.id, ...transformed(rect, row, width, height, zoom, scale) }] : []; });
  return { bounds, deltaToLocal(id, dx, dy) {
    const row = rows.find(r => r.instance.id === id); if (!row) throw new Error('Missing selected sequence instance');
    const parentId = row.instance.attach?.instance ?? rows.find(r => r.instance.children?.some(child => child.id === id))?.instance.id;
    const parent = parentId ? rows.find(r => r.instance.id === parentId) : undefined;
    return { x: dx / scale / zoom / (parent?.placement.scale ?? 1) / (parent?.placement.facing ?? 1), h: -dy / scale / zoom / (parent?.placement.scale ?? 1) };
  } };
}
/** Native selection geometry, shared with registered cinematic pieces. */
export function cinematicBounds(id: 'intro' | 'act2' | 'taxi', width: number, height: number, time: number, frame: TimelineFrame, reduced: boolean): Record<string, Rect> {
  return Object.fromEntries(nodes(frame.composition).map(node => {
    const part = node.type.replace(`sequence.${id}.`, ''), state: Properties = { width, height, time, reduced, ...frame.state[node.id] };
    const bounds = cinematicGeometry(id, part, node.props, state).bounds;
    return [node.id, { x: bounds.x, y: -bounds.h, width: bounds.w, height: bounds.tall }];
  }));
}
export function createSequencePreview(registry: ArtRegistry) {
  const sessions = new Map<string, IntroSeekSession>();
  const validation = createSequenceValidationContext(registry, {});
  const timelineContext: NonNullable<ComposerConfig['timelineContext']> = (base, preview) => {
    const scale = finite(preview.environment.renderScale, 1); if (scale <= 0) throw new Error('Render scale must be positive');
    const W = preview.viewport.width / scale, H = preview.viewport.height / scale;
    const sequence = preview.timeline?.sequences.find(s => s.id === preview.sequenceId), mode = preview.sequenceId === 'title' || preview.sequenceId === 'rise' ? preview.sequenceId : 'glide';
    const time = preview.time, ambientTime = finite(preview.environment.titleOffset, mode === 'glide' ? 7 : 0) + time;
    // The opening context only reads transform scale while constructing motion formulas.
    const metricContext = { getTransform: () => ({ a: scale }) } as unknown as CanvasRenderingContext2D;
    const openingComposition = Object.values(base.compositions).find(doc => doc.scene === 'sequence-opening') ?? openingDocuments.composition;
    const opening = openingTimelineContext(metricContext, {W,H,reduced:preview.reduced,lighting:lightAt(Number(preview.environment.day??1),Number(preview.environment.minute??580),Number(preview.environment.facing??90),null)}, { ...openingDocuments, composition: openingComposition }, ambientTime, mode);
    const cinematics = cinematicTimelineContext(cutView(W,H,preview.reduced,lightAt(Number(preview.environment.day??1),Number(preview.environment.minute??580),Number(preview.environment.facing??90),null)), { timeline: preview.timeline ?? cinematicDocuments.timeline, compositions: base.compositions }, { sequenceId: sequence?.id, ambient: finite(preview.environment.ambientClock, time * 60) });
    return { ...base, destinations: { ...opening.destinations, ...cinematics.destinations, ...base.destinations }, motionTracks: { ...base.motionTracks, ...opening.motionTracks, ...cinematics.motionTracks } };
  };
  return {
    motionTracks: validation.motionTracks!,clips:validation.clips!, timelineContext,
    render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult | null {
      const scene = request.composition.scene, style = scene.replace('sequence-', '');
      if (!['opening', 'intro', 'act2', 'taxi'].includes(style)) return null;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D is unavailable');
      const scale = finite(request.environment.renderScale, 1); if (scale <= 0) throw new Error('Render scale must be positive');
      const W = canvas.width / scale, H = canvas.height / scale;
      const id = request.sequenceId ?? (style === 'opening' ? String(request.environment.sequence ?? 'glide') : style);
      const timeline = request.timeline ?? (style === 'opening' ? openingDocuments.timeline : cinematicDocuments.timeline);
      const sequence = timeline.sequences.find(s => s.id === id); if (!sequence) throw new Error(`Sequence ${id} is not in this timeline document`);
      const compositions = style === 'opening' ? { [sequence.composition]: request.composition } : { ...cinematicDocuments.compositions, [sequence.composition]: request.composition };
      const base = createSequenceValidationContext(registry, compositions);
      const context = timelineContext(base, { time: request.time, reduced: request.reduced, sequenceId: id, environment: request.environment, viewport: { width: canvas.width, height: canvas.height }, timeline });
      const frame = request.frame ?? evaluateTimeline(timeline, id, request.time, context, { reduced: request.reduced });
      const nativeView = { ...frameView(request.time*60,request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null)),viewW: W, viewH: H, gy: 0, cam: frame.camera.x, flags: {}, t: request.time * 60, sx: (x: number) => x, y: (h: number) => -h };
      const rows = resolveComposition(registry, frame.composition, { view: nativeView, state: frame.state, reduced: request.reduced });
      let output: PreviewResult;
      ctx.save();
      try {
        if (style === 'opening') {
          ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          const mode = id === 'title' || id === 'rise' ? id : 'glide', ambientTime = finite(request.environment.titleOffset, mode === 'glide' ? 7 : 0) + request.time;
          const rendered=renderOpeningDocument(ctx, {W,H,reduced:request.reduced,lighting:request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null)}, { ...openingDocuments, compositionId: sequence.composition, composition: request.composition }, id, request.time, { registry, frame, timeline, composition: request.composition, ambientTime, mode });
          const native = openingFrame(ctx, {W,H,reduced:request.reduced,lighting:request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null)}, ambientTime, mode === 'glide' ? request.time : null, { x: frame.camera.x, h: frame.camera.h });
          const g = native.geometry, whole = { x: 0, y: 0, width: native.W, height: native.H };
          output = result(rows, row => {
            const part = row.instance.type.replace('sequence.opening.', '');
            const detail=openingGeometry(part,{...native.coast,pose:rendered.frame.state[row.instance.id]?.pose as unknown as import('../runtime/characters').PreparedCharacter},row.props);if(detail){const b=detail.bounds,near=native.parts.find(p=>p.id===part)?.space==='near';return{x:b.x,y:-b.h-(near?Math.round(native.drop):0),width:b.w,height:b.tall};}
            if (part === 'tunnel-fade') return (frame.state[row.instance.id]?.dark as number ?? 0) > 0 ? whole : undefined;
            if (part === 'sun') { const top = g.sunY - g.R; return { x: g.sunX - g.R, y: top, width: g.R * 2, height: Math.max(0, Math.min(g.sunY + g.R, g.skyTop) - top) }; }
            if (part === 'spire') return { x: g.spX - 38 * g.spS, y: g.spBase - 302 * g.spS, width: 76 * g.spS, height: 302 * g.spS };
            if (part === 'sky') return { x: 0, y: 0, width: native.W, height: Math.max(0, g.skyTop) };
            if (part === 'sea') return { x: 0, y: g.seaTop, width: native.W, height: Math.max(4, g.seaBot - g.seaTop + 2) };
            if (part === 'boats') return { x: 0, y: g.seaTop - 14, width: native.W, height: 20 };
            if (part === 'rain') return request.time < 50 ? undefined : whole;
            if (native.parts.find(p => p.id === part)?.space === 'near') return { x: 0, y: g.GY - 120 - Math.round(native.drop), width: native.W, height: 160 };
            return whole;
          }, native.W, native.H, frame.camera.zoom, native.scale * scale, frame);
        } else {
          const key = `${sequence.composition}:${W}:${H}:${request.reduced}`;
          if (!sessions.has(key)) sessions.set(key, new IntroSeekSession());
          const options = {lighting:request.lighting??lightAt(Number(request.environment.day??1),Number(request.environment.minute??580),Number(request.environment.facing??90),null), registry, frame, timeline, composition: request.composition, sequenceId: id, reduced: request.reduced, seek: sessions.get(key), ambient: finite(request.environment.ambientClock, request.time * 60), destination: String(request.environment.destination ?? 'DOWNTOWN') };
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          if (style === 'intro' || style === 'act2') renderCutsceneDocument(ctx, W, H, style, request.time, { ...options, scale });
          else renderSequenceFrame(ctx, { documents: cinematicDocuments, sequenceId: id, timeline, composition: request.composition, registry, frame, scale, width: W, height: H, reduced: request.reduced, lighting: options.lighting, time: request.time, ambient: options.ambient, destination: options.destination });
          output = result(rows, row => {if(!row.instance.type.startsWith(`sequence.${style}.`)){const b=row.element.bounds(row.props,row.state,{view:nativeView,placement:row.placement});return{x:b.x,y:-b.h,width:b.w,height:b.tall};}const geometry=cinematicGeometry(style,row.instance.type.slice(`sequence.${style}.`.length),row.props,{time:request.time,ambient:options.ambient,reduced:request.reduced,width:W,height:H,cameraX:frame.camera.x,...frame.state[row.instance.id]}).bounds;return{x:geometry.x,y:-geometry.h,width:geometry.w,height:geometry.tall};}, W, H, frame.camera.zoom, scale, frame);
        }
      } finally { ctx.restore(); }
      if (request.overlays) {
        const selected = output.bounds.find(b => b.id === request.selectedId);
        if (selected) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.strokeStyle = '#72dbca'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.strokeRect(selected.x + 0.5, selected.y + 0.5, selected.width, selected.height); ctx.restore(); }
      }
      return output;
    },
  };
}
