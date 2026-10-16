/**
 * The beach's code side. Almost everything (the jukebox, SALT's mixer, the
 * lifeguard drone, the pier's lamp schedule, Moth's boat) is data/beach.json
 * on the engine. What is left here:
 *
 * - the sunbed kiosk bills by the minute: `sunbed.rent` takes the first token,
 *   the clock takes one more every `minuteMs` while the meter runs (pausing the
 *   meter is the hack), and the rental ends when the tokens do;
 * - the lifeguard drone's red flag clears itself after `dangerMs` (no threat confirmed).
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { SceneData } from "../../data/types";
import type { Effect, World, SceneRules } from "../../engine/rules";

const EFFECTS: Record<string, Effect> = {
  /** Rent sunbed 7: one token now, then one a minute (tick). */
  'sunbed.rent': (w) => {
    const m = w.m;
    if (m.get('rented')) return w.line('sunbed.already');
    if (!m.pay(1)) return w.line('sunbed.broke');
    m.set('rented', true); m.set('billed', 1);
    m.scratch.minute = 0;
    w.goal('sunbed');
    return w.line('sunbed.rented');
  },
  'sunbed.end': (w) => {
    const m = w.m;
    if (!m.get('rented')) return w.line('sunbed.none');
    const line = w.line('sunbed.ended');
    m.set('rented', false);
    return line;
  },
};

function tick(w: World, dt: number) {
  const m = w.m, s = m.scratch;
  // the meter: a token a minute while it runs
  if (m.get('rented') && m.get('billing') !== 'pause') {
    s.minute = (s.minute ?? 0) + dt;
    if (s.minute >= w.tune('minuteMs')) {
      s.minute = 0;
      if (m.pay(1)) { m.set('billed', Number(m.get('billed') ?? 0) + 1); w.say(w.line('sunbed.minute'), 'kiosk'); }
      else { m.set('rented', false); w.say(w.line('sunbed.cut'), 'kiosk'); }
      w.changed();
    }
  }
  // the drone's red flag: no threat confirmed, after a while
  if (m.get('flag') === 'danger') {
    s.danger = (s.danger ?? 0) + dt;
    if (s.danger >= w.tune('dangerMs')) { s.danger = 0; m.set('flag', 'clear'); w.say(w.line('drone.calm'), 'drone'); w.changed(); }
  } else s.danger = 0;
}

export const BEACH_RULES: SceneRules = {
  effects: EFFECTS,
  tick,
  needs: {
    state: ['rented', 'billing', 'billed', 'flag', 'lamps', 'freeDrink'],
    goals: ['sunbed', 'free', 'clear'],
    texts: {
      'sunbed.rented': 'line', 'sunbed.already': 'line', 'sunbed.broke': 'line', 'sunbed.ended': 'line',
      'sunbed.none': 'line', 'sunbed.minute': 'line', 'sunbed.cut': 'line', 'drone.calm': 'line',
      // index.ts
      'prompt.out': 'label', 'stairs.out': 'line',
    },
  },
  /** The beach's own: the jukebox talks to the mixer from the start (the optional puzzle rewires it), and the tuning the clock reads. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    if (!z.cables.some((c) => c.from === 'jukebox.songs:played' && c.to.startsWith('mixer.'))) errs.push('cables: the jukebox must talk to the mixer from the start (jukebox.songs:played → mixer.…)');
    for (const k of ['minuteMs', 'dangerMs']) if (typeof z.tuning[k] !== 'number') errs.push(`tuning.${k}: missing (the beach's clock reads it)`);
    return errs;
  },
};
