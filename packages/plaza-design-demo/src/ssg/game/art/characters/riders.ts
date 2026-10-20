/**
 * The people of LINE 0: who rides the metro and who waits for it. Each kind is a character-kit person
 * with their own clothes and something they are doing (a phone, a paper, a briefcase, a parcel, a nap),
 * so a car or a platform reads as people, not shadows. `phase` seeds the rest of the look (coats, hair,
 * skin), so two riders of a kind are not twins. Seated riders use the kit's `seated` pose: thighs at
 * about SEAT_H over the floor at the player's scale, which fits the benches and the train seats.
 */

import { drawDriven, type Act, type Character, type Look } from "../../runtime/characters";
import { frameView, type View } from "../core/view";
import { rng } from "../core/primitives";

/** Each kind as a kit look and act. */
const RIDERS = {
  // looking down at a phone, its light on the face
  phone: { look: { extras: ['phone'] }, act: 'phone' },
  // a paper held up in front of them
  paper: { look: { hairCol: '#6a6a6a', extras: ['glasses'] }, act: 'read' },
  // a suit and a briefcase
  suit: { look: { garb: 'suit', hair: 'short', extras: ['briefcase'] }, act: 'stand' },
  // a courier with a parcel on the shoulder
  courier: { look: { garb: 'jacket', hair: 'cap', top: '#8a4a10', extras: ['parcel'] }, act: 'stand' },
  // an old woman with a shopping bag
  elder: { look: { body: 'old', garb: 'coat', hair: 'scarf', acc: '#3a5a3a', hairCol: '#cfcfcf', extras: ['bag'] }, act: 'stand' },
  // dyed hair, a dark jacket
  punk: { look: { hair: 'mohawk', garb: 'jacket', top: '#222428', hairCol: '#8a2a6a', extras: ['headphones'] }, act: 'stand' },
  // a Registry inspector: grey uniform, red armband, visor
  inspector: { look: { body: 'tall', garb: 'coat', hair: 'cap', top: '#9aa2ac', bottom: '#222428', acc: '#5a6470', extras: ['visor', 'armband'] }, act: 'stand' },
  // asleep on their feet, head down, scarf
  sleeper: { look: { hair: 'scarf', garb: 'coat', acc: '#3a5a3a', extras: [] }, act: 'doze' },
} satisfies Record<string, { look: Look; act: Act }>;
export type RiderKind = keyof typeof RIDERS;
export const KINDS = Object.keys(RIDERS) as RiderKind[];

/** A seated rider's thighs are this high above the floor (the seat's top). */
export const SEAT_H = 9;

const PEOPLE = new Map<string, Character>();
/** One stable kit person per kind, phase, pose and size (each is baked once). */
function rider(kind: RiderKind, phase: number, sit: boolean, ps: number): Character {
  const key = kind + '|' + phase + '|' + (sit ? 1 : 0) + '|' + ps;
  let p = PEOPLE.get(key);
  if (!p) {
    const R = RIDERS[kind];
    p = { seed: 7001 + Math.floor(phase * 977), x: 0, look: { ...R.look, extras: [...(R.look.extras ?? [])] } as Look, act: R.act as Act, ps, seated: sit, shadow: false };
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
  const ps = opt.ps ?? 3, p = rider(kind, opt.phase ?? 0, !!opt.sit, ps);
  drawDriven(x, screenView(base, t), p, { x: cx, facing: opt.flip ? -1 : 1 });
}

/** A crowd picked once from a seed: `n` people, each a kind, a facing and a phase. */
export function crowd(seed: number, n: number): { kind: RiderKind; flip: boolean; phase: number; on: boolean }[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ kind: KINDS[Math.floor(r() * KINDS.length)], flip: r() < 0.5, phase: r() * 10, on: r() < 0.55 }));
}
