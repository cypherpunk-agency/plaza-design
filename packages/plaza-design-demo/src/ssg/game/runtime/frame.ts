/** Inputs to the sole renderer, shared by game, preparation and editor. No painting or simulation. */
import type {View} from '../art/core/view';
import type {SceneDef} from '../scenes/kit';
import type {SceneHost} from '../engine/host';
import type {Weather} from '../world/weather';
import type {Light} from '../world/light';
import type {TimelineFrame} from '../art/core/timeline';
import type {Composition} from '../art/core/composition';
import type {TimelineOverlay} from '../art/core/timeline-overlay';
import type {BackdropDocument} from '../world/backdrops';
export interface WorkspaceCamera {anchorX:number;anchorH:number;x:number;h:number;zoom:number}
export interface CameraGuide {x:number;y:number;width:number;height:number;scene:string;label:string;focus:{x:number;h:number;zoom:number}}
type Draw = (ctx: CanvasRenderingContext2D, view: View) => void;
/**
 * A neighbouring zone joined by a seam (world/zone-graph.ts), drawn in the same frame: its own view (the camera moved
 * by where it lies), scene, host and light (its own facing, the city's weather). Clipped to its window.
 */
export interface ZoneFrame {
  view: View; scene: SceneDef; sceneId: string;
  host: Pick<SceneHost, 'model'> & Partial<Pick<SceneHost,'draw'|'visionOn'>>;
  lighting: (weather: Weather | null) => Light;
  preparePresentation?: (view:View) => void;
  weather?: () => Weather;
  /** It lies below the zone the player is in (a quay under a raised platform): drawn first, behind that zone's own artwork. */
  below?: boolean;
}
/** A pass of the one frame that a director can switch off (all run by default, as in play). */
export type FramePass = 'sky' | 'weather' | 'casters' | 'actors' | 'shade' | 'grade' | 'lights' | 'prompts' | 'bubbles' | 'vision';
/**
 * The configuration of the one frame for a sequence (the title glide, a cutscene, the taxi flight): where the camera is,
 * which passes run, what is drawn over the world, the time of day and the pixel scale. A sequence is never a second
 * renderer; it is this frame, directed (docs/design/SEAMLESS-WORLD.md, Principles "One renderer"; decision 23).
 * Absent, the frame is drawn exactly as in play.
 */
export interface FrameDirector {
  /**
   * Camera from a timeline (world units of the frame's zone) instead of the player follow. `x` is the camera's left edge
   * (`view.cam`), `h` the timeline's camera height (the picture moves up by `h`, as the timeline's camera track has
   * always meant), `zoom` scales the world about the middle of the viewport (overlays stay unzoomed).
   */
  camera?: { x: number; h: number; zoom?: number };
  /** Which passes run (default: all on, as play). Sequences switch off what they don't have. */
  passes?: Partial<Record<FramePass, boolean>>;
  /**
   * Drawn over the world, under nothing (in logical viewport coordinates, unzoomed), in this order: full-screen fades,
   * the letterbox bars, then text cards (the glide's district names). A card without `x` is centred; `y` is the
   * alphabetic baseline from the top (default the middle).
   */
  overlays?: { fades?: { color: string; opacity: number }[]; cards?: { text: string; opacity: number; x?: number; y?: number }[]; letterbox?: { top: number; bottom: number } };
  /** Time of day for the light (city clock minute/day) when the sequence sets it: the frame's light at that minute, same facing, outdoors and weather. */
  clock?: { minute: number; day?: number };
  /** Pixel scale override (a sequence's own fit), else the game's. */
  scale?: number;
  sequence?: View['sequence'];
}
/** Does the director let this pass run? */
export const passOn = (d: FrameDirector | undefined, pass: FramePass) => d?.passes?.[pass] !== false;

/**
 * The one bridge from timelines to the frame: an evaluated timeline frame (art/core/timeline.ts `evaluateTimeline`) as
 * a director. The shot camera and the camera tracks become the camera, the timeline's fades and text cards the
 * overlays (a card's `h` is up from the viewport's top edge, as the timeline stores it), a piece's `clock` state (a city
 * minute, -1 none) the time of day. `base` adds what the timeline does not own (passes, letterbox, scale) and wins.
 */
export function directorFromTimeline(frame: Pick<TimelineFrame, 'camera' | 'fades' | 'text' | 'state'>, base: FrameDirector = {}): FrameDirector {
  const director: FrameDirector = {
    camera: { x: frame.camera.x, h: frame.camera.h, zoom: frame.camera.zoom },
    overlays: {
      fades: frame.fades.map(f => ({ color: f.color, opacity: f.opacity })),
      cards: frame.text.map(card => ({ text: card.text, opacity: 1, x: card.x, y: -card.h })),
    },
  };
  for (const state of Object.values(frame.state)) {
    const minute = state.clock;
    if (typeof minute === 'number' && Number.isFinite(minute) && minute >= 0) { director.clock = { minute, ...(typeof state.day === 'number' ? { day: state.day } : {}) }; break; }
  }
  return { ...director, ...base, overlays: { ...director.overlays, ...base.overlays } };
}

/** One frame of the world: the zone the player is in (the scene) and the zones joined to it that are on screen. */
export interface FrameInspection { scene?:SceneDef; composition?:Composition; view:View; model?:SceneHost['model']; scale:number; zoom:number }
export interface WorldFrame {
  /** Editor-only inspection metadata; gameplay supplies no workspace camera. */
  cameraGuide?:CameraGuide;workspaceScale?:number;
  evaluation?:TimelineFrame;
  capture?:boolean;
  inspection?:FrameInspection[];
  context: CanvasRenderingContext2D; scale: number; view: View; scene: SceneDef; sceneId: string;
  /** A camera zoom already folded into `scale` (the world drawn larger; `view` is in zoomed units): overlays in logical
   * viewport coordinates draw at `scale / zoom`. Default 1. */
  zoom?: number;
  host: Pick<SceneHost, 'visionOn' | 'draw' | 'model'>;
  reduced: boolean; clock: number; weather: () => Weather;
  /** Also installs native shared light/shade inputs before any artwork runs. */
  lighting: (weather: Weather | null) => Light;
  /** Caller-owned controller evaluation. All subsequent artwork consumes prepared snapshots. */
  preparePresentation?: (view:View) => void;
  reflections?: [number, string][];
  city?: Draw;
  street?: (ctx: CanvasRenderingContext2D, view: View, rain: number, lit: boolean) => void;
  roomWash?: Draw; actors?: Draw; prompts?: Draw; bubbles?: Draw;
  /** Evaluated authoring/playback overlays, in logical viewport coordinates. */
  timeline?:TimelineOverlay;
  /** Zones joined to this one by seams, on screen this frame. None: a scene drawn alone, exactly as ever. */
  joined?: readonly ZoneFrame[];
  /** Travelling artwork whose source scenery need not be resident. */
  mobiles?: readonly ZoneFrame[];
  /** A sequence's configuration of this frame (camera, passes, overlays, clock, scale). None: play. */
  director?: FrameDirector;
  backdrops?: ReadonlyMap<string,BackdropDocument>;
}
