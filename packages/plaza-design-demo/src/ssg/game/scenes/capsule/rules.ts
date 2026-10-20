import {capsuleController,type CapsuleController} from '../../engine/controllers/capsule';
export {capsuleController} from '../../engine/controllers/capsule';
/**
 * Capsule 7B's code side: the rules too fiddly to be data. The flat's clock
 * (the plug's schedule says "night" every few seconds, because in here it is
 * always night), the router booting and warming up, and Pixel, who sleeps on
 * whatever is warm: the bed, the router (until it overheats and reboots), or
 * the sun on the floor once the blinds are open.
 *
 * Everything said comes from capsule.json's `texts`. What changes every tick
 * (the router's temperature, when it finishes booting) lives in `scratch`: it
 * is not saved, and a loaded flat starts from a calm router.
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { SceneData } from "../../data/types";
import type { Effect, World, SceneRules } from "../../engine/rules";
import type { SceneModel } from "../../engine/model";

/** Where Pixel can be in the flat. */
export type PixelAt = 'bed' | 'router' | 'sun';

export const capsuleState=(m:SceneModel,key:keyof CapsuleController['state'])=>m.get(capsuleController(m.data).state[key]);

const tune = (m: SceneModel, k:keyof CapsuleController['tuning']) => m.data.tuning[capsuleController(m.data).tuning[k]];
/** The router's temperature, °C. Starts calm: warm if the plug is on, room temperature if not. */
const tempOf = (m: SceneModel) => (m.scratch.temp ??= tune(m, capsuleState(m,'plugOn') ? 'idleTemp' : 'roomTemp'));
/** Powered, and done booting (or rebooting). */
export const routerUp = (m: SceneModel) => !!capsuleState(m,'plugOn') && m.now() >= (m.scratch.bootUntil ?? 0);

const EFFECTS: Record<string, Effect> = {
  /** The plug came on: the router boots, and says so when it is up (if the plug is still on by then). */
  'router.boot': (w) => {
    const m = w.m, ms = tune(m,'bootMs');
    m.scratch.bootUntil = m.now() + ms;
    m.later(ms + capsuleController(m.data).onlineNoticeDelayMs, () => {
      // Physical timer expiry is an input; source owns readiness and the reply.
      if (w.input('capsule.router.onlineDue').ok) w.changed();
    });
  },

  /** Steam for a moment (the scene draws it). */
  'kettle.boil': (w) => { w.m.scratch.steamUntil = w.m.now() + tune(w.m,'steamMs'); },
};

/**
 * The flat's clock, every few hundred ms while you are in it: the schedule's
 * night, the router's temperature (and its thermal reboots), Pixel finding
 * the thermal simulation. Pixel choices, door notifications and goals are source-owned.
 */
function tick(w: World, dt: number) {
  const m = w.m, s = m.scratch;

  // the router warms up under a cat, cools without one, and reboots when it is too hot
  const up = routerUp(m), before = Math.round(tempOf(m));
  // Physical frame fact: source goals observe readiness before a thermal reboot.
  s.routerUpAtTickStart = up ? 1 : 0;
  let t = tempOf(m);
  if (up && capsuleState(m,'pixelAt') === 'router') t += tune(m, 'heatPerS') * dt / 1000;
  else t = Math.max(tune(m, up ? 'idleTemp' : 'roomTemp'), t - tune(m, 'coolPerS') * dt / 1000);
  s.temp = t;
  if (up && t >= tune(m, 'rebootTemp')) {
    s.bootUntil = m.now() + tune(m, 'rebootMs');
    // Physical threshold/timing stays here; shared source owns the response and speaker.
    w.input('capsule.router.rebooted');
    m.later(tune(m, 'rebootMs') + capsuleController(m.data).onlineNoticeDelayMs, () => { if (w.input('capsule.router.onlineDue').ok) w.changed(); });
    w.changed();
  } else if (Math.floor(Math.round(t) / capsuleController(m.data).temperatureNoticeStep) !== Math.floor(before / capsuleController(m.data).temperatureNoticeStep)) w.changed();


}

export const CAPSULE_RULES: SceneRules = {
  effects: EFFECTS,
  inputs: ['capsule.router.onlineDue', 'capsule.router.rebooted'],
  derived: {
    routerUp: (m) => routerUp(m),
    routerUpAtTickStart: (m) => m.scratch.routerUpAtTickStart === 1,
    booting: (m) => !!capsuleState(m,'plugOn') && !routerUp(m),
    temp: (m) => Math.round(tempOf(m)),
    /** Too hot to send anything: packets drop. */
    hot: (m) => tempOf(m) >= tune(m, 'hotTemp'),
  },
  tick,
  // Controller-owned references are checked by the registered source contract.
  needs:{devices:[]},
  /** Mechanical tuning/state requirements; starting cables are authored scene content. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    for (const k of ['bootMs', 'rebootMs', 'roomTemp', 'idleTemp', 'hotTemp', 'rebootTemp', 'heatPerS', 'coolPerS', 'steamMs']) {
      if (typeof z.tuning[capsuleController(z).tuning[k as keyof CapsuleController['tuning']]] !== 'number') errs.push(`tuning.${k}: missing (the flat's clock reads it)`);
    }
    if (!['bed', 'router', 'sun'].includes(z.state[capsuleController(z).state.pixelAt] as string)) errs.push('state.pixelAt: bed, router or sun');
    return errs;
  },
};
