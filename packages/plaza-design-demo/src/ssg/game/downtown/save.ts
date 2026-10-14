/**
 * Downtown and the save it had before the zone engine. Its progress lives in
 * the save's own fields (`handle`, `tokens`, `jump`, `freed`, `flags.till`,
 * `flags.end`), and the zone's save (`save.zones.downtown`) only adds what is
 * new on the street. `reconcile` makes the zone agree with those fields every
 * time it loads: a player who freed 0x2F on the old terminal finds the box
 * logged in, its sector open and `vrify` on the keyring; one who cleared
 * Downtown finds the gate open. Nothing is ever taken away.
 */

import type { ZoneModel } from '../zone/model';
import type { DowntownSave } from './rules';

/** Which goals the save says are reached (the same order as level.ts `objective`). */
export function reached(s: DowntownSave): Record<string, boolean> {
  return {
    handle: !!s.handle,
    till: !!s.flags.till,
    box: s.freed.includes('0x2F'),
    install: !!s.jump,
    relay: s.freed.includes('0x31'),
    gate: !!s.flags.end,
  };
}

/** Tick the zone's goals the save has reached (the GOAL line follows them). */
export function syncGoals(m: ZoneModel, s: DowntownSave) {
  for (const [id, ok] of Object.entries(reached(s))) if (ok && m.zone.goals.some((g) => g.id === id)) m.goal(id);
}

/** Bring the zone in line with the save's own fields (old saves, and anything done outside the zone). */
export function reconcile(m: ZoneModel, s: DowntownSave) {
  const login = (dev: string, sector: string) => {
    if (!m.devices.has(dev)) return;
    m.passed.add(dev + '.login');
    if (m.sector(dev, sector)) m.opened.add(dev + '/' + sector);
  };
  if (s.flags.till) login('till', 'drawer');
  // the clues those logins took: on the keyring, as if read (the relay's password is built from `vrify`)
  if (s.freed.includes('0x2F')) { login('box', 'maint'); m.give('vrify'); }
  if (s.freed.includes('0x31')) { login('relay', 'maint'); m.give('rule.reverse'); }
  if (s.flags.end) {
    m.set('lock', 'open');
    m.set('routeFixed', true);
    if (m.get('dlvAt') === 'home' || m.get('dlvAt') === 'driving') m.set('dlvAt', 'gate');
  }
  syncGoals(m, s);
  m.changed();
}
