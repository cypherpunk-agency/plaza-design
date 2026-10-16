/**
 * The sandbox's code side (REGISTRY QA BAY 3, sudo only): almost nothing.
 * Every station is data/sandbox.json on the engine. What is left here is the
 * little that data cannot say:
 *
 * - `sbx.pulse`: a thing reacted (a horn buzzed, a bell rang): the drawing
 *   flashes it for `pulseMs` (`pulse(m, key)`), nothing is stored;
 * - counters (`sbx.count`, `sbx.stamp`, `sbx.brew`): add one to a state key;
 * - an item used on a thing (`sbx.chip`: the chip reader takes one blank chip
 *   you carry) and a till that takes a token (`sbx.till`: `SceneModel.pay`);
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
const bump = (m: SceneModel, key: string) => { const n = Number(m.get(key) ?? 0) + 1; m.set(key, n); return n; };

/** 18:00–06:00 on the city clock (`hour` is a city key every scene reads). */
const isNight = (m: SceneModel) => { const h = Number(m.value('hour') ?? 12); return h >= 18 || h < 6; };
const SHUTS = ['rain', 'storm', 'smog'];

const EFFECTS: Record<string, Effect> = {
  'sbx.pulse': (w, c) => { mark(w.m, c); w.changed(); },
  'sbx.count': (w, c) => { mark(w.m, c); const n = bump(w.m, 'count'); w.changed(); return w.line('count.up', { n }); },
  'sbx.stamp': (w, c) => { mark(w.m, c); const n = bump(w.m, 'stamped'); w.changed(); return w.line('stamp.ok', { n }); },
  'sbx.brew': (w, c) => { mark(w.m, c); const n = bump(w.m, 'cups'); w.changed(); return w.line('brew.ok', { n }); },
  /** An item used on a thing: one blank chip from what you carry, or a refusal. */
  'sbx.chip': (w, c) => {
    const m = w.m;
    if (m.carry(CHIP) < 1) return w.line('chip.none');
    m.carry(CHIP, -1);
    mark(m, c);
    const n = bump(m, 'chips');
    w.changed();
    return w.line('chip.ok', { n });
  },
  /** A till: one token, or a refusal. */
  'sbx.till': (w, c) => {
    const m = w.m;
    if (!m.pay(1)) return w.line('till.broke');
    mark(m, c);
    const n = bump(m, 'paid');
    w.changed();
    return w.line('till.ok', { n });
  },
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
      'count.up': 'line', 'stamp.ok': 'line', 'brew.ok': 'line', 'chip.none': 'line', 'chip.ok': 'line',
      'till.broke': 'line', 'till.ok': 'line', 'night.off': 'line', 'vent.shut': 'line', 'reset.ok': 'line', 'prompt.reset': 'label',
    },
  },
  /** The bench must keep one station per feature: the build fails if a station loses what it tests. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    const nouns = [...z.devices, ...(z.nodes ?? [])].flatMap((d) => d.nouns);
    for (const k of ['SENSE', 'ACT', 'STORE', 'LINK', 'DAEMON', 'CLOCK', 'LOG', 'GUARD']) if (!nouns.some((n) => n.kind === k)) errs.push(`devices: no ${k} noun (the noun-kind station needs one of each)`);
    for (const t of ['rings', 'cipher', 'cryptex', 'morse']) if (!nouns.some((n) => n.guard?.toy === t)) errs.push(`devices: no ${t} toy guard (the guard station needs one per toy)`);
    if (!nouns.some((n) => n.guard?.password)) errs.push('devices: no password guard');
    const seals = z.devices.flatMap((d) => d.sectors ?? []).map((s) => Object.keys(s.seal)[0]);
    for (const s of ['key', 'sequence', 'if', 'guard']) if (!seals.includes(s)) errs.push(`devices: no sector sealed by "${s}"`);
    if (!z.cables.some((c) => c.fixed)) errs.push('cables: the cable station needs a fixed conduit');
    const from = new Map<string, number>();
    for (const c of z.cables) from.set(c.from, (from.get(c.from) ?? 0) + 1);
    if (![...from.values()].some((n) => n >= 3)) errs.push('cables: the cable station needs a fan-out (one event, three cables)');
    if (!z.watchdog || z.watchdog.route.length < 2) errs.push('watchdog: the watchdog station needs a route of two or more devices');
    if (typeof z.tuning.pulseMs !== 'number') errs.push('tuning.pulseMs: missing (the drawing reads it)');
    return errs;
  },
};
