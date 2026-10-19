/**
 * The sandbox's code side (REGISTRY QA BAY 3, sudo only): almost nothing.
 * Every station is data/sandbox.json on the engine. What is left here is the
 * little that data cannot say:
 *
 * - `sbx.pulse`: a thing reacted (a horn buzzed, a bell rang): the drawing
 *   flashes it for `pulseMs` (`pulse(m, key)`), nothing is stored;
 * Counter, stamp, brew, reader and till operations are shared commands in gameplay.json.
 * - time and weather that act by themselves (the tick): the night light goes
 *   off at 06:00, the window vent shuts when rain, storm or smog come;
 * - `night` (derived): 18:00–06:00 on the city clock, for the drawing and status.
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { SceneData, Value } from "../../data/types";
import type { Effect, SceneRules, World } from "../../engine/rules";
import type { Ctx, SceneModel } from "../../engine/model";

/** The carried item the chip reader eats (scenes/kit.ts `ITEMS`); the dispenser beside it hands them out. */
export const CHIP = 'blankchip';

/** When this thing last reacted (`dev` or `dev.noun`), for the drawing: 1 just now, fading to 0 over `pulseMs`. */
export function pulse(m: SceneModel, key: string): number {
  const at = m.scratch['pulse.' + key];
  if (at === undefined) return 0;
  const ms = Number(m.data.tuning.pulseMs) || 900;
  return Math.max(0, 1 - (m.now() - at) / ms);
}

const mark = (m: SceneModel, c: Ctx) => { m.scratch['pulse.' + c.dev] = m.scratch['pulse.' + c.dev + '.' + c.noun] = m.now(); };
/** 18:00–06:00 on the city clock (`hour` is a city key every scene reads). */
const isNight = (m: SceneModel) => { const h = Number(m.value('hour') ?? 12); return h >= 18 || h < 6; };
const SHUTS = ['rain', 'storm', 'smog'];

const EFFECTS: Record<string, Effect> = {
  'sbx.pulse': (w, c) => { mark(w.m, c); w.changed(); },

};

function tick(w: World) {
  const m = w.m;
  // the night light: 18:00–06:00 only; daylight switches it off
  if (m.get('nightLight') && !isNight(m)) { m.set('nightLight', false); w.say(w.line('night.off'), 'nightlight'); w.changed(); }
  // the vent shuts itself when the weather turns
  const weather = String(m.value('weather') ?? 'clear');
  if (m.get('ventOpen') && SHUTS.includes(weather)) { m.set('ventOpen', false); w.say(w.line('vent.shut'), 'vent'); w.changed(); }
}

export const SANDBOX_RULES: SceneRules = {
  effects: EFFECTS,
  derived: { night: (m): Value => isNight(m) },
  tick,
  needs: {
    state: ['count', 'stamped', 'cups', 'chips', 'paid', 'nightLight', 'ventOpen'],
    texts: {
      'night.off': 'line', 'vent.shut': 'line', 'reset.ok': 'line', 'prompt.reset': 'label',
    },
  },
  /** Controller tuning; the original feature inventory is verified against the frozen baseline. */
  check: (z: SceneData) => typeof z.tuning.pulseMs==='number'?[]:['tuning.pulseMs: missing (the drawing reads it)'],
};
