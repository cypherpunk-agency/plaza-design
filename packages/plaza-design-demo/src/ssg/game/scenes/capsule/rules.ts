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
const SCHEDULE = { from: 'plug.schedule:night', to: 'plug.power' };
const scheduled = (m: SceneModel) => m.links.some((l) => l.from === SCHEDULE.from && l.to === SCHEDULE.to);

const tune = (m: SceneModel, k: string) => m.data.tuning[k];
/** The router's temperature, °C. Starts calm: warm if the plug is on, room temperature if not. */
const tempOf = (m: SceneModel) => (m.scratch.temp ??= tune(m, m.get('plugOn') ? 'idleTemp' : 'roomTemp'));
/** Powered, and done booting (or rebooting). */
export const routerUp = (m: SceneModel) => !!m.get('plugOn') && m.now() >= (m.scratch.bootUntil ?? 0);

/** Where Pixel wants to be: in the sun if there is any, else on the warm router, else the bed. */
export const pixelWants = (m: SceneModel): PixelAt => (m.get('sun') ? 'sun' : m.get('plugOn') ? 'router' : 'bed');

const EFFECTS: Record<string, Effect> = {
  /** The plug came on: the router boots, and says so when it is up (if the plug is still on by then). */
  'router.boot': (w) => {
    const m = w.m, ms = w.tune('bootMs');
    m.scratch.bootUntil = m.now() + ms;
    m.later(ms + 20, () => {
      if (!routerUp(m)) return;
      // the router reacted, not the plug: its caption goes over the router
      w.say(w.line('router.online'), 'router');
      w.changed();
    });
  },

  /**
   * The plug's `off`: by hand, or by the schedule's cable. The schedule fires
   * all the time, so an `off` to a plug that is already off is silent when it
   * comes by signal (no spam every few seconds).
   */
  'plug.off': (w, c) => {
    const m = w.m;
    if (!m.get('plugOn')) return c.bySignal ? null : w.line('plug.off.already');
    m.set('plugOn', false);
    return w.line(c.bySignal ? 'plug.night' : 'plug.off');
  },

  /** Steam for a moment (the scene draws it). */
  'kettle.boil': (w) => { w.m.scratch.steamUntil = w.m.now() + w.tune('steamMs'); },
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
  if (s.clock >= tune(m, 'nightEveryMs')) { s.clock = 0; m.emit(SCHEDULE.from); }

  // the router warms up under a cat, cools without one, and reboots when it is too hot
  const up = routerUp(m), before = Math.round(tempOf(m));
  let t = tempOf(m);
  if (up && m.get('pixelAt') === 'router') t += tune(m, 'heatPerS') * dt / 1000;
  else t = Math.max(tune(m, up ? 'idleTemp' : 'roomTemp'), t - tune(m, 'coolPerS') * dt / 1000);
  s.temp = t;
  if (up && t >= tune(m, 'rebootTemp')) {
    s.bootUntil = m.now() + tune(m, 'rebootMs');
    w.say(w.line('router.reboot', { temp: Math.round(t) }), 'router');
    m.later(tune(m, 'rebootMs') + 20, () => { if (routerUp(m)) { w.say(w.line('router.online'), 'router'); w.changed(); } });
    w.changed();
  } else if (Math.floor(Math.round(t) / 5) !== Math.floor(before / 5)) w.changed();

  // Pixel takes its time, then moves to the warmest spot
  const want = pixelWants(m);
  if (want !== m.get('pixelAt')) {
    s.pixelWait = (s.pixelWait ?? 0) + dt;
    if (s.pixelWait >= tune(m, 'pixelMoveMs')) {
      s.pixelWait = 0;
      m.set('pixelAt', want);
      w.say(w.line('pixel.' + want), 'pixel');
      w.changed();
    }
  } else s.pixelWait = 0;

  // CONCIERGE unlocked the door (a net node has no place in the flat): the lock itself says so, by the door
  const open = m.get('doorOpen') ? 1 : 0;
  if (s.doorWas === 0 && open) w.say(w.line('lock.unlocked'), 'lock');
  s.doorWas = open;

  // goals only the code can see
  if (up && !scheduled(m)) w.goal('router');
  if (m.net.get('concierge') === 'connected') w.goal('concierge');
  if (m.get('pixelAt') === 'sun' && m.get('plugOn')) w.goal('pixel');
}

export const CAPSULE_RULES: SceneRules = {
  effects: EFFECTS,
  derived: {
    routerUp: (m) => routerUp(m),
    booting: (m) => !!m.get('plugOn') && !routerUp(m),
    temp: (m) => Math.round(tempOf(m)),
    /** Too hot to send anything: packets drop. */
    hot: (m) => tempOf(m) >= tune(m, 'hotTemp'),
    pixelOnRouter: (m) => m.get('pixelAt') === 'router',
  },
  tick,
  needs: {
    state: ['plugOn', 'sun', 'pixelAt', 'doorOpen'],
    goals: ['router', 'concierge', 'pixel', 'out'],
    texts: {
      'plug.off': 'line', 'plug.night': 'line', 'plug.off.already': 'line',
      'router.online': 'line', 'router.reboot': 'line',
      'pixel.router': 'line', 'pixel.sun': 'line', 'pixel.bed': 'line',
      // index.ts
      'prompt.door': 'label', 'prompt.out': 'label', 'door.locked': 'line', 'lock.unlocked': 'line',
    },
  },
  /** The flat's own: the cable the fridge note grumbles about must be there, and the tuning the clock reads. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    if (!z.cables.some((c) => c.from === SCHEDULE.from && c.to === SCHEDULE.to)) errs.push(`cables: the schedule's cable (${SCHEDULE.from} → ${SCHEDULE.to}) is P01: it must be pre-wired`);
    for (const k of ['nightEveryMs', 'bootMs', 'rebootMs', 'pixelMoveMs', 'roomTemp', 'idleTemp', 'hotTemp', 'rebootTemp', 'heatPerS', 'coolPerS', 'steamMs']) {
      if (typeof z.tuning[k] !== 'number') errs.push(`tuning.${k}: missing (the flat's clock reads it)`);
    }
    if (!['bed', 'router', 'sun'].includes(z.state.pixelAt as string)) errs.push('state.pixelAt: bed, router or sun');
    return errs;
  },
};
