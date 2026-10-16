/**
 * Downtown and the save it had before the engine. Its progress lives in
 * the save's own fields (`handle`, `tokens`, `jump`, `controlled`, `flags.till`,
 * `flags.end`), and the scene's save (`save.scenes.downtown`) only adds what is
 * new on the street. `reconcile` makes the scene agree with those fields every
 * time it loads: a player who took 0x2F on the old terminal finds the box
 * logged in, its sector open and `vrify` on the keyring; one who cleared
 * Downtown finds the gate open. Nothing is ever taken away.
 */

import type { SceneModel } from "../../engine/model";
import type { PlayerState } from "../../runtime/player";

/** Which goals the save says are reached (the same order as level.ts `objective`). */
export function reached(s: PlayerState): Record<string, boolean> {
  return {
    handle: !!s.handle,
    till: !!s.flags.till,
    box: s.controlled.includes('0x2F'),
    install: !!s.jump,
    relay: s.controlled.includes('0x31'),
    gate: !!s.flags.end,
  };
}

/** Tick the scene's goals the save has reached (the GOAL line follows them). */
export function syncGoals(m: SceneModel, s: PlayerState) {
  for (const [id, ok] of Object.entries(reached(s))) if (ok && m.data.goals.some((g) => g.id === id)) m.goal(id);
}

/** Bring the scene in line with the save's own fields (old saves, and anything done outside the scene). */
export function reconcile(m: SceneModel, s: PlayerState) {
  const login = (dev: string, sector: string) => {
    if (!m.devices.has(dev)) return;
    m.passed.add(dev + '.login');
    if (m.sector(dev, sector)) m.opened.add(dev + '/' + sector);
  };
  if (s.flags.till) login('till', 'drawer');
  // the clues those logins took: on the keyring, as if read (the relay's password is built from `vrify`)
  if (s.controlled.includes('0x2F')) { login('box', 'maint'); m.give('vrify'); }
  if (s.controlled.includes('0x31')) { login('relay', 'maint'); m.give('rule.reverse'); }
  if (s.flags.end) {
    m.set('lock', 'open');
    m.set('routeFixed', true);
    if (m.get('dlvAt') === 'home' || m.get('dlvAt') === 'driving') m.set('dlvAt', 'gate');
  }
  syncGoals(m, s);
  m.changed();
}
