/**
 * The back yard's code side: the rules too fiddly to be data, as named
 * effects the scene file refers to (`{ "effect": "crane.claw" }`), plus what
 * the yard computes (`gateOpen`) and how it settles a save. Everything they
 * say comes from the scene's `texts`, so wording never needs a code change.
 *
 * `YARD_RULES.needs` is the contract the build checks yard.json against
 * (data/check.ts): which state keys, goals and texts this code relies on.
 * Keep it next to the code that relies on them.
 */

import type { Value, SceneData } from "../../data/types";
import type { Effect, World, SceneRules } from "../../engine/rules";

/** Where the parcel can be. The crates are its starting slots. */
export type ParcelAt = 'A-3' | 'B-5' | 'C-7' | 'hook' | 'chute' | 'sliding' | 'bounced' | 'tray' | 'taken';

const YARD_EFFECTS: Record<string, Effect> = {
  /** Grab only what is under the claw; drop into the chute and the parcel slides. */
  'crane.claw': (w, c) => {
    const m = w.m, armAt = m.get('armAt') as string;
    if (c.verb === 'grab') {
      if (m.get('held')) return w.line('claw.grab.holding');
      if (!w.data.camera?.crates.some((k) => k.id === armAt)) return w.line('claw.grab.air');
      if (armAt !== m.get('parcelAt')) return w.line(w.has('claw.grab.wrong.' + armAt) ? 'claw.grab.wrong.' + armAt : 'claw.grab.wrong');
      m.set('held', 'parcel'); m.set('parcelAt', 'hook');
      return w.line('claw.grab.ok');
    }
    if (!m.get('held')) return w.line('claw.drop.empty');
    m.set('held', null);
    if (armAt !== 'chute') { m.set('parcelAt', armAt); return w.line('claw.drop.at'); }
    dropIntoChute(w);
    return w.line('claw.drop.chute');
  },

  /** HINGE opens for `gateOpenMs`, then shuts on its own. */
  'hatch.open': (w) => {
    const ms = w.tune('gateOpenMs');
    w.m.scratch.gateOpenUntil = w.m.now() + ms;
    w.m.later(ms + 50, () => w.changed());
  },
};

// ---------- the parcel's trip down the chute ----------

const gateOpen = (w: World) => w.m.now() < (w.m.scratch.gateOpenUntil ?? 0);

function dropIntoChute(w: World) {
  const m = w.m;
  m.set('parcelAt', 'chute'); w.goal('chute');
  m.later(w.tune('chuteDropMs'), () => {
    m.set('parcelAt', 'sliding'); m.scratch.slideStart = m.now(); w.changed();
    m.later(w.tune('slideMs'), () => arrive(w));
  });
  w.emit('dropped');
}

function arrive(w: World) {
  const m = w.m;
  if (gateOpen(w)) {
    m.set('parcelAt', 'tray'); w.goal('gate');
    w.say(w.line('parcel.tray'), 'gate');
  } else {
    m.set('parcelAt', 'bounced');
    w.say(w.line('parcel.bonk'), 'gate');
    m.later(w.tune('bounceBackMs'), () => { Object.assign(m.state, BACK_ON_HOOK); w.changed(); });
  }
  w.changed();
}

/** Where the crane leaves a parcel that did not make it through: on the hook, over the chute. */
const BACK_ON_HOOK = { parcelAt: 'hook', held: 'parcel', armAt: 'chute' };

/**
 * For the save: a parcel in the chute, sliding or bouncing becomes what it is
 * after a bonk (on the hook, at the chute). Timers and the hatch's open second
 * are not state, so they simply are not there after a load.
 */
export function settleYard(state: Record<string, Value>) {
  if (['chute', 'sliding', 'bounced'].includes(state.parcelAt as string)) Object.assign(state, BACK_ON_HOOK);
}

// ---------- the contract with yard.json ----------

export const YARD_RULES: SceneRules = {
  effects: YARD_EFFECTS,
  panels: ['camera'],
  derived: { gateOpen: (m) => m.now() < (m.scratch.gateOpenUntil ?? 0) },
  settle: settleYard,
  needs: {
    state: ['found', 'armAt', 'held', 'parcel', 'parcelAt', 'gateAllowed', 'pan'],
    goals: ['find', 'chute', 'talk', 'gate', 'take'],
    texts: {
      // effects
      'claw.grab.holding': 'line', 'claw.grab.air': 'line', 'claw.grab.wrong': 'line', 'claw.grab.ok': 'line',
      'claw.drop.empty': 'line', 'claw.drop.at': 'line', 'claw.drop.chute': 'line',
      'parcel.tray': 'line', 'parcel.bonk': 'line', 'parcel.take': 'line',
      // index.ts
      'prompt.exit': 'label', 'prompt.take': 'label',
      // camera.ts
      'cam.zoom': 'label', 'cam.tag': 'label',
      'cam.zoom.gravel': 'line', 'cam.zoom.crate': 'line', 'cam.zoom.parcel': 'line', 'cam.zoom.out': 'line',
      'cam.tag.none': 'line', 'cam.tag.ok': 'line', 'cam.hud': 'label', 'cam.on': 'label', 'cam.aim': 'label',
    },
  },
  /** The yard's own: the camera sees crates, and the parcel starts in one of them. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    if (!z.camera) errs.push('camera: the yard needs its crates (CAM-1 and the claw use them)');
    else if (!z.camera.crates.some((c) => c.id === z.state.parcel)) errs.push(`state.parcel: "${z.state.parcel}" is not a crate`);
    return errs;
  },
};
