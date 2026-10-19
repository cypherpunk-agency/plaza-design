/**
 * The back yard's code side: the rules too fiddly to be data, as named
 * effects the scene file refers to (`{ "effect": "crane.grab" }`), plus what
 * the yard computes (`gateOpen`) and how it settles a save. Everything they
 * say comes from the scene's `texts`, so wording never needs a code change.
 *
 * `YARD_RULES.needs` is the contract the build checks yard.json against
 * (data/check.ts): which state keys, goals and texts this code relies on.
 * Keep it next to the code that relies on them.
 */

import type { SceneData } from "../../data/types";
import type { Effect, SceneRules } from "../../engine/rules";

/** Where the parcel can be. The crates are its starting slots. */
export type ParcelAt = 'A-3' | 'B-5' | 'C-7' | 'hook' | 'chute' | 'sliding' | 'bounced' | 'tray' | 'taken';

const YARD_EFFECTS: Record<string, Effect> = {
  /** Grab remains native until camera-collection membership and optional text reads are shared. */
  'crane.grab': (w) => {
    const m = w.m, armAt = m.get('armAt') as string;
    if (m.get('held')) return w.line('claw.grab.holding');
    if (!w.data.camera?.crates.some((k) => k.id === armAt)) return w.line('claw.grab.air');
    if (armAt !== m.get('parcelAt')) return w.line(w.has('claw.grab.wrong.' + armAt) ? 'claw.grab.wrong.' + armAt : 'claw.grab.wrong');
    m.set('held', 'parcel'); m.set('parcelAt', 'hook');
    return w.line('claw.grab.ok');
  },

  /** HINGE opens for `gateOpenMs`, then shuts on its own. */
  'hatch.open': (w) => {
    const ms = w.tune('gateOpenMs');
    w.m.scratch.gateOpenUntil = w.m.now() + ms;
    w.m.later(ms + 50, () => w.changed());
  },
};

/** Drop, chute/slide/bounce transitions, replies, goals and native events are
 * authored commands and SceneTime deadlines in gameplay.json. Checkpoint recovery
 * shares its existing state-only command with the bounce return deadline. */

// ---------- the contract with yard.json ----------

export const YARD_RULES: SceneRules = {
  effects: YARD_EFFECTS,
  panels: ['camera'],
  derived: { gateOpen: (m) => m.now() < (m.scratch.gateOpenUntil ?? 0) },
  needs: {
    state: ['found', 'armAt', 'held', 'parcel', 'parcelAt', 'gateAllowed', 'pan'],
    goals: ['find', 'chute', 'talk', 'gate', 'take'],
    texts: {
      // effects
      'claw.grab.holding': 'line', 'claw.grab.air': 'line', 'claw.grab.wrong': 'line', 'claw.grab.ok': 'line',
      'parcel.take': 'line',
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
