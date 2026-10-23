/**
 * The people of LINE 0: who rides the metro and who waits for it. Each kind is a named look from the
 * character kit (art/characters/archetypes.ts: commuter, reader, office, courier, elder, punk, inspector,
 * sleeper) doing what it does (a phone, a paper, a briefcase, a parcel, a nap), so a car or a platform
 * reads as people, not shadows. `phase` seeds the rest of the look (build, colours, minor parts), so two
 * riders of a kind are not twins. Seated riders sit facing the camera, three-quarter or side on, as the
 * people-style `seated` switch says (art/characters/people-style.ts; default front): thighs at about
 * SEAT_H over the floor at the player's scale, which fits the benches and the train seats.
 */

import { drawDriven, type Act, type Character, type Look } from "../../runtime/characters";
import type { ArchetypeId } from "./archetypes";
import { peopleStyle } from "./people-style";
import { frameView, type View } from "../core/view";
import { rng } from "../core/primitives";

interface RiderSpec { archetype: ArchetypeId; look?: Look; act: Act; legacy: Look }
/** Each kind: its named look (plus parts it always has on the train), its act, and its look in the `legacy` people style. */
const RIDERS = {
  // looking down at a phone, its light on the face
  phone: { archetype: 'commuter', act: 'phone', legacy: { extras: ['phone'] } },
  // a paper held up in front of them
  paper: { archetype: 'reader', act: 'read', legacy: { hairCol: '#6a6a6a', extras: ['glasses'] } },
  // a suit and a briefcase
  suit: { archetype: 'office', look: { extras: ['briefcase'] }, act: 'stand', legacy: { garb: 'suit', hair: 'short', extras: ['briefcase'] } },
  // a courier with a parcel on the shoulder
  courier: { archetype: 'courier', act: 'stand', legacy: { garb: 'jacket', hair: 'cap', top: '#8a4a10', extras: ['parcel'] } },
  // an old woman in a coat and a scarf, with a shopping bag
  elder: { archetype: 'elder', look: { extras: ['bag', 'muffler'] }, act: 'stand', legacy: { body: 'old', garb: 'coat', hair: 'scarf', acc: '#3a5a3a', hairCol: '#cfcfcf', extras: ['bag'] } },
  // a dyed mohawk over a patched black jacket
  punk: { archetype: 'punk', act: 'stand', legacy: { hair: 'mohawk', garb: 'jacket', top: '#222428', hairCol: '#8a2a6a', extras: ['headphones'] } },
  // a Registry inspector: grey uniform, peaked cap, red armband, visor
  inspector: { archetype: 'inspector', act: 'stand', legacy: { body: 'tall', garb: 'coat', hair: 'cap', top: '#9aa2ac', bottom: '#222428', acc: '#5a6470', extras: ['visor', 'armband'] } },
  // asleep on their feet, head down into a scarf
  sleeper: { archetype: 'sleeper', act: 'doze', legacy: { hair: 'scarf', garb: 'coat', acc: '#3a5a3a', extras: [] } },
} satisfies Record<string, RiderSpec>;
export type RiderKind = keyof typeof RIDERS;
export const KINDS = Object.keys(RIDERS) as RiderKind[];

/** A seated rider's thighs are this high above the floor (the seat's top). */
export const SEAT_H = 9;

const PEOPLE = new Map<string, Character>();
/** One stable kit person per kind, phase, pose, size and people style (each is baked once). */
export function riderCharacter(kind: RiderKind, phase: number, sit: boolean, ps: number): Character {
  const style = peopleStyle(), key = kind + '|' + phase + '|' + (sit ? 1 : 0) + '|' + ps + '|' + style;
  let p = PEOPLE.get(key);
  if (!p) {
    const R: RiderSpec = RIDERS[kind];
    const look: Look = style === 'legacy' ? structuredClone(R.legacy) : { archetype: R.archetype, ...structuredClone(R.look ?? {}) };
    p = { seed: 7001 + Math.floor(phase * 977), x: 0, look, act: R.act, ps, seated: sit, shadow: false };
    if (PEOPLE.size > 512) PEOPLE.clear();
    PEOPLE.set(key, p);
  }
  return p;
}

/** Screen-space drawing: x is screen x, heights count up from `base`. */
let BASE: View | null = null;
function screenView(base: number, t: number): View {
  BASE ??= frameView(0);
  return { ...BASE, t, sx: (wx) => wx, y: (h) => base - h };
}

/**
 * Draws one person, standing (or sitting, `sit`) on screen y `base`, centred on `cx`. `t` animates what
 * they are doing: a phone's light, a page turned, a sleeper's nod. `ps` 3 is the player's scale; 2 for
 * people seen inside a train going past.
 */
export function drawRider(x: CanvasRenderingContext2D, kind: RiderKind, cx: number, base: number, t: number, opt: { sit?: boolean; flip?: boolean; ps?: number; phase?: number } = {}) {
  const ps = opt.ps ?? 3, p = riderCharacter(kind, opt.phase ?? 0, !!opt.sit, ps);
  drawDriven(x, screenView(base, t), p, { x: cx, facing: opt.flip ? -1 : 1 });
}

/** A crowd picked once from a seed: `n` people, each a kind, a facing and a phase. */
export function crowd(seed: number, n: number): { kind: RiderKind; flip: boolean; phase: number; on: boolean }[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ kind: KINDS[Math.floor(r() * KINDS.length)], flip: r() < 0.5, phase: r() * 10, on: r() < 0.55 }));
}
