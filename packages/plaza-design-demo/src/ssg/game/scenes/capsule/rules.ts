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

/** The pre-wired cable the fridge note grumbles about. */
const scheduled = (m: SceneModel) => {const schedule=capsuleController(m.data).schedule;return m.links.some(l=>l.from===schedule.from&&l.to===schedule.to);};
export const capsuleState=(m:SceneModel,key:keyof CapsuleController['state'])=>m.get(capsuleController(m.data).state[key]);

const tune = (m: SceneModel, k:keyof CapsuleController['tuning']) => m.data.tuning[capsuleController(m.data).tuning[k]];
/** The router's temperature, °C. Starts calm: warm if the plug is on, room temperature if not. */
const tempOf = (m: SceneModel) => (m.scratch.temp ??= tune(m, capsuleState(m,'plugOn') ? 'idleTemp' : 'roomTemp'));
/** Powered, and done booting (or rebooting). */
export const routerUp = (m: SceneModel) => !!capsuleState(m,'plugOn') && m.now() >= (m.scratch.bootUntil ?? 0);

/** Where Pixel wants to be: in the sun if there is any, else on the warm router, else the bed. */
export const pixelWants = (m: SceneModel): PixelAt => (capsuleState(m,'sun') ? 'sun' : capsuleState(m,'plugOn') ? 'router' : 'bed');

const EFFECTS: Record<string, Effect> = {
  /** The plug came on: the router boots, and says so when it is up (if the plug is still on by then). */
  'router.boot': (w) => {
    const m = w.m, ms = tune(m,'bootMs');
    m.scratch.bootUntil = m.now() + ms;
    m.later(ms + capsuleController(m.data).onlineNoticeDelayMs, () => {
      if (!routerUp(m)) return;
      // the router reacted, not the plug: its caption goes over the router
      w.say(w.line(capsuleController(m.data).texts.online), capsuleController(m.data).devices.router);
      w.changed();
    });
  },

  /** Steam for a moment (the scene draws it). */
  'kettle.boil': (w) => { w.m.scratch.steamUntil = w.m.now() + tune(w.m,'steamMs'); },
};

/**
 * The flat's clock, every few hundred ms while you are in it: the schedule's
 * night, the router's temperature (and its thermal reboots), Pixel finding
 * the warmest spot, and the goals the code ticks.
 */
function tick(w: World, dt: number) {
  const m = w.m, s = m.scratch;

  // the schedule: it is always night in here
  s.clock = (s.clock ?? 0) + dt;
  if (s.clock >= tune(m, 'nightEveryMs')) { s.clock = 0; m.emit(capsuleController(m.data).schedule.from); }

  // the router warms up under a cat, cools without one, and reboots when it is too hot
  const up = routerUp(m), before = Math.round(tempOf(m));
  let t = tempOf(m);
  if (up && capsuleState(m,'pixelAt') === 'router') t += tune(m, 'heatPerS') * dt / 1000;
  else t = Math.max(tune(m, up ? 'idleTemp' : 'roomTemp'), t - tune(m, 'coolPerS') * dt / 1000);
  s.temp = t;
  if (up && t >= tune(m, 'rebootTemp')) {
    s.bootUntil = m.now() + tune(m, 'rebootMs');
    w.say(w.line(capsuleController(m.data).texts.reboot, { temp: Math.round(t) }), capsuleController(m.data).devices.router);
    m.later(tune(m, 'rebootMs') + capsuleController(m.data).onlineNoticeDelayMs, () => { if (routerUp(m)) { w.say(w.line(capsuleController(m.data).texts.online), capsuleController(m.data).devices.router); w.changed(); } });
    w.changed();
  } else if (Math.floor(Math.round(t) / capsuleController(m.data).temperatureNoticeStep) !== Math.floor(before / capsuleController(m.data).temperatureNoticeStep)) w.changed();

  // Pixel takes its time, then moves to the warmest spot
  const want = pixelWants(m);
  if (want !== capsuleState(m,'pixelAt')) {
    s.pixelWait = (s.pixelWait ?? 0) + dt;
    if (s.pixelWait >= tune(m, 'pixelMoveMs')) {
      s.pixelWait = 0;
      m.set(capsuleController(m.data).state.pixelAt, want);
      w.say(w.line(capsuleController(m.data).texts[want==='bed'?'pixelBed':want==='router'?'pixelRouter':'pixelSun']), capsuleController(m.data).devices.pixel);
      w.changed();
    }
  } else s.pixelWait = 0;

  // CONCIERGE unlocked the door (a net node has no place in the flat): the lock itself says so, by the door
  const open = capsuleState(m,'doorOpen') ? 1 : 0;
  if (s.doorWas === 0 && open) w.say(w.line(capsuleController(m.data).texts.unlocked), capsuleController(m.data).devices.lock);
  s.doorWas = open;

  // goals only the code can see
  if (up && !scheduled(m)) w.goal(capsuleController(m.data).goals.router);
  if (m.net.get(capsuleController(m.data).devices.concierge) === 'connected') w.goal(capsuleController(m.data).goals.concierge);
  if (capsuleState(m,'pixelAt') === 'sun' && capsuleState(m,'plugOn')) w.goal(capsuleController(m.data).goals.pixel);
}

export const CAPSULE_RULES: SceneRules = {
  effects: EFFECTS,
  derived: {
    routerUp: (m) => routerUp(m),
    booting: (m) => !!capsuleState(m,'plugOn') && !routerUp(m),
    temp: (m) => Math.round(tempOf(m)),
    /** Too hot to send anything: packets drop. */
    hot: (m) => tempOf(m) >= tune(m, 'hotTemp'),
    pixelOnRouter: (m) => capsuleState(m,'pixelAt') === 'router',
  },
  tick,
  // Controller-owned references are checked by the registered source contract.
  needs:{state:[],goals:['out'],texts:{'prompt.door':'label','prompt.out':'label','door.locked':'line'}},
  /** Mechanical tuning/state requirements; starting cables are authored scene content. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    for (const k of ['nightEveryMs', 'bootMs', 'rebootMs', 'pixelMoveMs', 'roomTemp', 'idleTemp', 'hotTemp', 'rebootTemp', 'heatPerS', 'coolPerS', 'steamMs']) {
      if (typeof z.tuning[capsuleController(z).tuning[k as keyof CapsuleController['tuning']]] !== 'number') errs.push(`tuning.${k}: missing (the flat's clock reads it)`);
    }
    if (!['bed', 'router', 'sun'].includes(z.state[capsuleController(z).state.pixelAt] as string)) errs.push('state.pixelAt: bed, router or sun');
    return errs;
  },
};
