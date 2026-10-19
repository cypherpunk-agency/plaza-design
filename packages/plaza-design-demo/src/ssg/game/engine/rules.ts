import type {FeedbackReceipt} from './feedback-receipt';
/**
 * What a scene's code provides to the engine, next to its data file: the named
 * effects its data calls, the panels its view implements, values it computes,
 * how it settles a save, and what it needs from the data (checked at build).
 *
 * Pure: no DOM, so the build-time check and node scripts can import it.
 */

import { ENGINE } from "../data/index";
import type { CodeContract } from '../data/check';
import type { Value, SceneData } from '../data/types';
import type { Ctx, Line, Spot, SceneModel } from './model';

export type Vars = Record<string, string | number>;

/** What an effect may touch. `emit` raises an event on the noun it runs for. */
export interface World {
  m: SceneModel;
  data: SceneData;
  line(key: string, vars?: Vars): Line;
  has(key: string): boolean;
  /** Say a line; `from` names who reacted when it is not this effect's own device (`'router'`, `'pixel'`). */
  say(l: Line, from?: string): FeedbackReceipt;
  receipt(l:Line,from?:string):FeedbackReceipt;
  changed(): void;
  goal(g: string): void;
  tune(key: string): number;
  emit(event: string): void;
}

/** A named effect: a rule too fiddly to be data. It reads its wording from texts. */
export type Effect = (w: World, c: Ctx) => Line | null | void;

export interface SceneRules {
  /** Named effects the data may run (`{ "effect": "crane.claw" }`), besides the engine's (`timer.wait`). */
  effects: Record<string, Effect>;
  /** Panels this scene's view implements, besides the engine's `talk`. */
  panels?: string[];
  /** Read-only values computed in code, usable in conditions and templates (`gateOpen`). */
  derived?: Record<string, (m: SceneModel) => Value>;
  /** For the save: turn anything in flight into where it ends up (a parcel mid-slide back on the hook). */
  settle?: (state: Record<string, Value>) => void;
  /** What the code relies on: state keys, goals it ticks, text keys it asks for. */
  needs?: { state?: string[]; goals?: string[]; texts?: Record<string, 'line' | 'label'> };
  /** Extra checks only this scene's code knows (a crate the parcel sits in). One message per problem. */
  check?: (z: SceneData) => string[];
  /**
   * The scene's own clock, every few hundred ms while the scene is on screen
   * (`dt` in ms): a schedule that fires on a rhythm, a router warming up. Keep
   * what changes every tick in `m.scratch` (not saved) and call `w.changed()`
   * only when something visible changed.
   */
  tick?: (w: World, dt: number) => void;
  /**
   * Devices that move in the world (a delivery robot driving off): where one stands now, given
   * its home from `layout.spot`; null while it is out of the world. Read every frame, so keep it cheap.
   */
  place?: (m: SceneModel, home: Spot) => Spot | null;
}

/** The engine's own texts, by kind: every scene has them (engine.json), and may override them with the same kind. */
export const ENGINE_TEXTS: Record<string, 'line' | 'label'> = Object.fromEntries(
  Object.entries(ENGINE.texts).map(([k, v]) => [k, Array.isArray(v) ? 'line' : 'label']),
);

/** The engine's panels: every scene can open `talk` (its dialogue). */
export const ENGINE_PANELS = ['talk'];

/**
 * The engine's effects, there in every scene: the shared logic modules
 * (logic.json) use them, so they cannot belong to one scene.
 */
export const ENGINE_EFFECTS: Record<string, Effect> = {
  /** TIMER's "wait 2 s": wait, then raise `done`. */
  'timer.wait': (w, c) => {
    const sec = parseInt(c.verb.split(' ')[1], 10);
    w.m.later(sec * 1000, () => w.emit('done'));
    return w.line('timer.wait', { sec });
  },
};

/** What the build checks a scene file against: the scene's code plus the engine. */
export function contractOf(r: SceneRules,routes:readonly {device:string;noun:string;verb:string}[] = []): CodeContract {
  return {
    nativeVerbs:routes.map(r=>r.device+'.'+r.noun+':'+r.verb),
    effects: [...Object.keys(ENGINE_EFFECTS), ...Object.keys(r.effects)],
    panels: [...ENGINE_PANELS, ...(r.panels ?? [])],
    state: r.needs?.state ?? [],
    derived: Object.keys(r.derived ?? {}),
    goals: r.needs?.goals ?? [],
    texts: { ...ENGINE_TEXTS, ...(r.needs?.texts ?? {}) },
  };
}
