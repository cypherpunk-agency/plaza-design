/**
 * The back yard's named effects: the rules too fiddly to be data. The zone
 * file refers to them by name (`{ "effect": "crane.claw" }`); everything they
 * say comes from the zone's `texts`, so wording never needs a code change.
 *
 * `YARD_CODE` at the bottom is the contract the build checks the data
 * against (data/check.ts): which effects exist, which state keys and texts
 * the code relies on. Keep it next to the code that relies on them.
 */

import type { CodeContract } from '../data/check';
import type { Value, ZoneData } from '../data/types';
import type { Ctx, Goal, Line, ParcelAt, YardModel } from './model';

export type Vars = Record<string, string | number>;

/** What an effect may touch. `emit` raises an event on the noun it runs for. */
export interface World {
  m: YardModel;
  zone: ZoneData;
  line(key: string, vars?: Vars): Line;
  has(key: string): boolean;
  say(l: Line): void;
  changed(): void;
  goal(g: Goal): void;
  tune(key: string): number;
  emit(event: string): void;
}

export type Effect = (w: World, c: Ctx) => Line | null | void;

export const YARD_EFFECTS: Record<string, Effect> = {
  /** Grab only what is under the claw; drop into the chute and the parcel slides. */
  'crane.claw': (w, c) => {
    const m = w.m;
    if (c.verb === 'grab') {
      if (m.held) return w.line('claw.grab.holding');
      if (!w.zone.camera.crates.some((k) => k.id === m.armAt)) return w.line('claw.grab.air');
      if (m.armAt !== m.parcelAt) return w.line(w.has('claw.grab.wrong.' + m.armAt) ? 'claw.grab.wrong.' + m.armAt : 'claw.grab.wrong');
      m.held = 'parcel'; m.parcelAt = 'hook';
      return w.line('claw.grab.ok');
    }
    if (!m.held) return w.line('claw.drop.empty');
    m.held = null;
    if (m.armAt !== 'chute') { m.parcelAt = m.armAt as ParcelAt; return w.line('claw.drop.at'); }
    dropIntoChute(w);
    return w.line('claw.drop.chute');
  },

  /** HINGE opens for `gateOpenMs`, then shuts on its own. */
  'hatch.open': (w) => {
    const ms = w.tune('gateOpenMs');
    w.m.gateOpenUntil = performance.now() + ms;
    w.m.later(ms + 50, () => w.changed());
  },

  /** "wait 2 s": wait, then raise `done`. */
  'timer.wait': (w, c) => {
    const sec = parseInt(c.verb.split(' ')[1], 10);
    w.m.later(sec * 1000, () => w.emit('done'));
    return w.line('timer.wait', { sec });
  },
};

// ---------- the parcel's trip down the chute ----------

function dropIntoChute(w: World) {
  const m = w.m;
  m.parcelAt = 'chute'; w.goal('chute');
  m.later(w.tune('chuteDropMs'), () => {
    m.parcelAt = 'sliding'; m.slideStart = performance.now(); w.changed();
    m.later(w.tune('slideMs'), () => arrive(w));
  });
  w.emit('dropped');
}

function arrive(w: World) {
  const m = w.m;
  if (m.gateOpen()) {
    m.parcelAt = 'tray'; w.goal('gate');
    w.say(w.line('parcel.tray'));
  } else {
    m.parcelAt = 'bounced';
    w.say(w.line('parcel.bonk'));
    m.later(w.tune('bounceBackMs'), () => { Object.assign(m, BACK_ON_HOOK); w.changed(); });
  }
  w.changed();
}

/** Where the crane leaves a parcel that did not make it through: on the hook, over the chute. */
const BACK_ON_HOOK = { parcelAt: 'hook' as ParcelAt, held: 'parcel', armAt: 'chute' };

/**
 * For the save: a parcel in the chute, sliding or bouncing becomes what it is
 * after a bonk (on the hook, at the chute). Timers and the hatch's open second
 * are not state, so they simply are not there after a load.
 */
export function settleYard(state: Record<string, Value>) {
  if (['chute', 'sliding', 'bounced'].includes(state.parcelAt as string)) Object.assign(state, BACK_ON_HOOK);
}

// ---------- the contract with yard.json ----------

export const YARD_CODE: CodeContract = {
  effects: Object.keys(YARD_EFFECTS),
  panels: ['camera', 'talk'],
  state: ['found', 'armAt', 'held', 'parcel', 'parcelAt', 'gateAllowed', 'pan'],
  derived: ['gateOpen'],
  goals: ['find', 'chute', 'talk', 'gate', 'take'],
  texts: {
    // effects and model
    'claw.grab.holding': 'line', 'claw.grab.air': 'line', 'claw.grab.wrong': 'line', 'claw.grab.ok': 'line',
    'claw.drop.empty': 'line', 'claw.drop.at': 'line', 'claw.drop.chute': 'line',
    'timer.wait': 'line', 'parcel.tray': 'line', 'parcel.bonk': 'line', 'parcel.take': 'line',
    'wire.connect': 'line', 'wire.cut': 'line',
    // index.ts
    'goals.done': 'label', 'board.empty': 'label', 'prompt.exit': 'label', 'prompt.open': 'label', 'prompt.take': 'label',
    // panels.ts
    'ui.close': 'label', 'cam.zoom': 'label', 'cam.tag': 'label',
    'cam.zoom.gravel': 'line', 'cam.zoom.crate': 'line', 'cam.zoom.parcel': 'line', 'cam.zoom.out': 'line',
    'cam.tag.none': 'line', 'cam.tag.ok': 'line', 'cam.hud': 'label', 'cam.on': 'label', 'cam.aim': 'label',
    'talk.unplug': 'label', 'talk.other': 'label', 'talk.placeholder': 'label', 'talk.aria': 'label',
  },
};
