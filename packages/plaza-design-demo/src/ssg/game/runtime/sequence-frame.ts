/**
 * A cinematic sequence (the intro, the ACT II card, the taxi flight) as one frame of the world: its composition is the
 * one zone's artwork, drawn by drawComposition through the normal host path of `renderWorldFrame`, and its timeline
 * directs the frame (camera, fades, cards; every play pass off: no sky, weather, light, player, prompts or bubbles).
 * This is a frame scene adapter, not a renderer: the frame is assembled only in runtime/render-scene.ts.
 */
import { drawComposition, resolveComposition, compositionAppearance, type ArtRegistry, type Composition, type Environment, type Instance, type Properties } from '../art/core/composition';
import { evaluateTimeline, type TimelineDocument, type TimelineFrame } from '../art/core/timeline';
import { frameView, type View } from '../art/core/view';
import { cinematicRegistry, cinematicTimelineContext, cutView, isScreenFade, type CinematicDocuments } from '../art/sequences/cinematics';
import type { Skyline } from '../art/environment/skyline';
import type { Light } from '../world/light';
import type { SceneDef } from '../scenes/kit';
import { directorFromTimeline, renderWorldFrame, type FrameDirector, type FramePass } from './render-scene';

/** A sequence has no sky, weather, light, player, prompts, bubbles or hack vision of its own: its pieces paint the whole picture. */
export const SEQUENCE_PASSES: Record<FramePass, false> = { sky: false, weather: false, casters: false, actors: false, shade: false, grade: false, lights: false, prompts: false, bubbles: false, vision: false };

export interface SequenceFrame {
  documents: CinematicDocuments; sequenceId: string;
  /** Pending editor documents in place of the shipping ones. */
  timeline?: TimelineDocument; composition?: Composition; registry?: ArtRegistry;
  /** An already evaluated timeline frame (the editor's scrub); else evaluated here at `time`. */
  frame?: TimelineFrame;
  scale: number; width: number; height: number; reduced: boolean; lighting: Light;
  /** Sequence seconds. */
  time: number;
  /** The decorative clock (60 per second; default `time` × 60), the flight's progress (0 → 1) and its stand's name. */
  ambient?: number; progress?: number; destination?: string;
  /** The intro's prepared skyline (story/cutscenes/skyline-session.ts). */
  skyline?: { city: Skyline; step: number };
  /** What the controller adds to the timeline's direction: the letterbox, fades after the timeline's own. */
  director?: FrameDirector;
  /** Draw the timeline's text cards as frame cards (default). A cutscene types them in its bar instead (CutscenePlay). */
  cards?: boolean;
}

const flat = (nodes: readonly Instance[]): Instance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
const own = (v: object, k: string) => Object.prototype.hasOwnProperty.call(v, k);

/** Draw a sequence at `time` through the one frame. Returns the evaluated timeline frame (for the editor's selection). */
export function renderSequenceFrame(ctx: CanvasRenderingContext2D, o: SequenceFrame): TimelineFrame {
  const timeline = o.timeline ?? o.documents.timeline, sequence = timeline.sequences.find(s => s.id === o.sequenceId);
  if (!sequence) throw new Error(`Unknown cinematic: ${o.sequenceId}`);
  const composition = o.composition ?? o.documents.compositions[sequence.composition], registry = o.registry ?? cinematicRegistry;
  const W = o.width, H = o.height, ambient = o.ambient ?? o.time * 60;
  const context = cinematicTimelineContext(cutView(W, H, o.reduced, o.lighting), { timeline, compositions: { ...o.documents.compositions, [sequence.composition]: composition } }, { sequenceId: o.sequenceId, ambient, ...(o.progress !== undefined ? { progress: o.progress } : {}), ...(o.registry ? { registry: o.registry } : {}) });
  const frame = o.frame ?? evaluateTimeline(timeline, o.sequenceId, o.time, context, { reduced: o.reduced });
  const nodes = flat(frame.composition.instances);
  // the frame's inputs each cinematic piece declares (its clock, motion preference, viewport, the flight's stand)
  const inputs: Properties = { time: o.time, ambient, reduced: o.reduced, width: W, height: H, cameraX: frame.camera.x, place: o.destination ?? '' };
  const state: Record<string, Properties> = {};
  for (const node of nodes) {
    const fields = node.type.startsWith('sequence.') ? registry.get(node.type).visualFields ?? {} : {};
    const given = Object.fromEntries(Object.entries(inputs).filter(([k]) => own(fields, k)));
    if (Object.keys(given).length || frame.state[node.id]) state[node.id] = { ...given, ...frame.state[node.id] };
  }
  // the black screen fades are the frame's fade overlays, under the timeline's own; the world leaves them out
  const fadeIds = nodes.filter(n => isScreenFade(n.type)).map(n => n.id), visibility = { ...frame.visibility, ...Object.fromEntries(fadeIds.map(id => [id, false])) };
  const view: View = { ...frameView(ambient, o.lighting), viewW: W, viewH: H, cam: 0, gy: 0, t: ambient, flags: {}, sx: x => x, y: h => -h, ...(o.skyline ? { skyline: o.skyline } : {}) };
  const env = (v: View): Environment => ({ view: v, state, visibility, opacity: frame.opacity, clips: frame.clips, sequenceTime: o.time, reduced: o.reduced, lighting: v.lighting });
  const fades: { color: string; opacity: number }[] = [];
  if (fadeIds.length) {
    const appearance = compositionAppearance(frame.composition, { visibility: frame.visibility, opacity: frame.opacity });
    for (const row of resolveComposition(registry, frame.composition, env(view))) {
      const look = appearance.get(row.instance.id)!, amount = Number(row.state.amount ?? 0);
      if (isScreenFade(row.instance.type) && look.visible && look.opacity > 0 && amount > 0) fades.push({ color: 'rgba(0,0,0,' + Math.min(1, amount) + ')', opacity: look.opacity });
    }
  }
  const scene: SceneDef = { id: composition.scene, name: sequence.id, width: W, spawn: 0, exits: [], ambient: {}, drawBackdrop: (x, v) => drawComposition(x, registry, frame.composition, env(v), 'backdrop') };
  const timed = directorFromTimeline(frame), extra = o.director ?? {};
  const director: FrameDirector = { ...timed, ...extra, passes: { ...SEQUENCE_PASSES, ...extra.passes },
    overlays: { fades: [...fades, ...timed.overlays!.fades!, ...extra.overlays?.fades ?? []], cards: o.cards === false ? extra.overlays?.cards ?? [] : [...timed.overlays!.cards!, ...extra.overlays?.cards ?? []], ...(extra.overlays?.letterbox ? { letterbox: extra.overlays.letterbox } : {}) } };
  renderWorldFrame({ context: ctx, scale: o.scale, view, scene, sceneId: scene.id, reduced: o.reduced, clock: ambient,
    host: { visionOn: false, model: { spots: () => [] } as never, draw: (x, v) => scene.drawBackdrop(x, v, {} as never) },
    weather: () => { throw new Error('A sequence has no weather pass'); }, lighting: () => o.lighting, director });
  return frame;
}
