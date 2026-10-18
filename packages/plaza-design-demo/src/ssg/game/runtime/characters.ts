import {ConversationSession} from '../engine/gameplay/conversation';
import type {GameplaySession} from '../engine/gameplay/session';
import { drawCharacterFrame, BODIES, type Full, rnd, pick, lookFrom, type Legs, type Arms, CRITTERS, type Bot, type BotLook, BOT, CRITTER_BOT, type BotFull, botFrom, botKind, faceAt, psOf } from "../art/characters/appearance";
export { lookFrom, shade, drawPortrait } from "../art/characters/appearance";
export type { Bot, Face, BotLook } from "../art/characters/appearance";
/**
 * PEOPLE KIT: the city's people (and its cats, pigeons and robots), built from parts.
 *
 * HOW A SCENE ADDS PEOPLE
 *
 *   import { drawCharacters, type Character } from '../characters';
 *
 *   const STREET: Character[] = [
 *     { seed: 3, x: 300, act: 'walk', range: 220 },                  // a passer-by, walks 300 ⇄ 520
 *     { seed: 8, x: 410, act: 'haggle', facing: -1 },                // two people haggling...
 *     { seed: 9, x: 386, act: 'haggle', facing: 1 },                 // ...facing each other
 *     { look: { body: 'old', garb: 'coat', hair: 'brim' }, x: 600, act: 'smoke' },
 *     { look: 'cat', x: 700, act: 'sit' },                           // critters: cat pigeon gull cleaner drone courier
 *     { id: 'gran', seed: 21, x: 820, act: 'sit', h: 10, name: 'GRAN',
 *       talk: [['First visit?', 'The fish is fresh.'], ['Still here?']] },  // talks; pages cycle per visit
 *   ];
 *   export const myScene: Scene = { ..., people: STREET,                 // the engine makes [E] TALK targets
 *     drawBackdrop(x, v) { ...walls...; drawCharacters(x, v, STREET); ...counters in front... } };
 *
 * - A person is plain data: `seed` picks every part; `look` fixes some parts (the seed fills the rest).
 *   The same seed always gives the same person; neighbouring seeds give very different ones.
 * - `x` is world x (the centre of the feet), `h` the height they stand or sit on (a bench is about 10,
 *   a counter 24). `facing` 1 = right, -1 = left. `act` is what they do (see Act); walkers ('walk',
 *   'sweep', 'steal') go between `x` and `x + range` (or `range: [a, b]`), pausing at each end.
 * - `id` + `talk` make a person talkable: the scene lists them in `people` and the engine adds the
 *   [E] TALK prompt above them. `talk` is one set of pages, or a list of sets (one per visit, the last
 *   repeats). `name` heads the bubble. `key: true` marks the one person per scene with something that
 *   matters (a rumour, a hint): they get a faint speech mark so a curious player finds them.
 * - Behind a counter: use a 'tall' or 'avg' body, or lift them with `h` (a crate to stand on), so
 *   more than a forehead shows over the goods.
 * - Draw order is the scene's: call `drawCharacters` (or `drawCharacter`) where the people belong, behind a
 *   counter or in front of a stall. `ps` (pixel size, default 3 = the player's scale) and `dim` (0..1)
 *   and `parallax` put people in a back band; a back crowd is `crowd(seed, n, from, to, { ps: 2, dim: .55, parallax: .9 })`.
 * - Fast: every look and pose is baked once into a small canvas (with its rim) and blitted after that.
 * - People are never cyan (cyan = tech you can use); a rim keeps them off dark walls (ART-GUIDE §4, §6).
 *
 * ROBOTS: every one has a job you can see it doing
 *
 *   { look: 'loader', x: 1150, act: 'carry', range: [1160, 1040] },      // crate one way, forks empty back
 *   { look: { bot: 'servbot', paint: '#54406a', v: 1 }, x: 900, act: 'vend' }, // fix paint / base, seed does the rest
 *   { look: 'valet', x: 300, follow: richMan, gap: 16 },                   // walks behind someone, umbrella over them
 *   { look: 'crawler', x: 1404, h: 96, act: 'weld' },                      // on a wall or ledge at h, sparks
 *
 * - Kinds (Bot) by job: humanoids android (parcel courier on foot), valet (umbrella or bags), marshal
 *   (stop/go paddle); screen-faced box bots servbot (vendor, stocker, charging), sweeper, busker
 *   (accordion or horn, a tin), waiter (tray of drinks); carrying loader (tall frame, crate/parcels/
 *   bottles) and porter (grocery cart); security mech (wide, slow, red sensor sweep); small wheeled
 *   litterbot (grabber + hopper), deliverybot (kerb box with a flag), adbot (sandwich board, dry ads);
 *   crawler (spider maintenance bot: weld, scrub, crawl); wreck (derelict, NEED PARTS); drones
 *   minidrone (parcel), cargodrone (hanging crate), flyerdrone (warm hologram flyer). The old cleaner,
 *   drone and courier critters are robots too.
 * - The seed varies paint, trim, wear and rust drips, a sticker, a mismatched replacement part, the
 *   screen face (eyes, happy, sad, dots), lights, antennae, porcelain vs metal heads, a glitchy few.
 * - Robot acts: carry, roll, patrol, serve, crawl, hover (movers); direct, play, weld, scrub, charge,
 *   glitch, blink, slump (in place); and stand, walk, sweep, queue, vend. Drones fly their own height over `h`.
 * - Robots with `talk` talk like people. Robots without it still answer E with a short line in their own
 *   voice (game.ts: `bot:` targets from `isBot` / `botReact`). Robots are never cyan: paint is orange,
 *   paper, grey, rust; lights are red and amber. Signs on them (boards, flyers) stay dry.
 * - `crowd()` makes about one in five a robot doing a crowd job (`bots` to change the share, 0 for none).
 */

import type { View } from "../scenes/kit";
import { city } from "../world/clock";
import type { TimeWindow } from "../data/types";
import { hereClimate, weatherNow, type WeatherKind } from "../world/weather";

export type Body = 'avg' | 'tall' | 'short' | 'wide' | 'slim' | 'kid' | 'old';
export type Hair = 'bald' | 'short' | 'long' | 'bun' | 'mohawk' | 'cap' | 'beanie' | 'hood' | 'brim' | 'helmet' | 'scarf';
export type Garb = 'tee' | 'jacket' | 'coat' | 'dress' | 'apron' | 'hivis' | 'suit' | 'robe';
export type Extra = 'umbrella' | 'bag' | 'backpack' | 'cyberarm' | 'visor' | 'mask' | 'phone' | 'headphones' | 'glasses' | 'cane';
export type Critter = 'cat' | 'pigeon' | 'gull' | 'cleaner' | 'drone' | 'courier';
/**
 * What a person does. In place: stand (shifts weight, looks around), sit (on whatever is at `h`),
 * lean (legs crossed, arms folded), smoke, phone, haggle (gestures; pair two facing each other),
 * argue (faster, bigger), queue, sleep (lying on `h`), dance, vend (behind a counter, offers and waits).
 * Moving between `x` and `range`: walk, sweep (with a broom), steal (sneaks to the far end, reaches, runs back).
 * Drones: 'scan' hovers and sweeps a red beam down on whoever is below.
 * Robots (they also do stand, walk, sweep, queue, vend): moving between `x` and `range`: carry (a load
 * one way, empty back), roll (wheels, stops to pick things up), patrol (slow, sensor sweeping ahead),
 * serve (tray out at each end), crawl (along a wall at `h`), hover (drones bob and drift). In place:
 * direct (stop/go paddle), play (an instrument, notes rise), weld (sparks), scrub (a brush on the
 * wall), charge (cabled to a wall socket), glitch (twitches), blink (the screen face changes mood),
 * slump (the derelict: a flicker, a twitch).
 */
export type Act = 'stand' | 'walk' | 'sit' | 'lean' | 'smoke' | 'phone' | 'haggle' | 'argue' | 'sweep' | 'queue' | 'sleep' | 'dance' | 'vend' | 'steal' | 'scan'
  | 'carry' | 'roll' | 'patrol' | 'serve' | 'crawl' | 'hover' | 'direct' | 'play' | 'weld' | 'scrub' | 'charge' | 'glitch' | 'blink' | 'slump';

export interface Look {
  body?: Body; hair?: Hair; garb?: Garb; extras?: Extra[];
  /** Colours (hex): skin, hair, top, bottom (trousers, skirt), acc (hat, bag, umbrella, visor). */
  skin?: string; hairCol?: string; top?: string; bottom?: string; acc?: string;
}

export interface Character {
  /** Compiled shared conversation ID; talk remains native visual metadata. */
  conversation?:string;
  /** Needed for talk (the engine's target id). */
  id?: string;
  seed?: number;
  /** A human look, a critter, or a robot (`'loader'`, or `{ bot: 'loader', paint: '#d8a03a' }`). */
  look?: Look | Critter | Bot | BotLook;
  x: number;
  h?: number;
  act?: Act;
  range?: number | [number, number];
  facing?: 1 | -1;
  /** World units per frame for walkers (the player walks 1.3). */
  speed?: number;
  name?: string;
  talk?: string[] | string[][];
  /**
   * Lines for a time or a weather (TIME.md "Lines by time and weather"), before `talk`: the first
   * whose `when` is now and whose `weather` includes the weather here is said; else `talk` as usual.
   */
  lines?: { when?: TimeWindow; weather?: WeatherKind[]; pages: string[] }[];
  /** Only here inside this window on the city clock: outside it they are not drawn and say nothing. */
  when?: TimeWindow;
  key?: boolean;
  /** Pixel size: 3 = the player's scale; 2 for a back band; 4–5 for a near foreground. */
  ps?: number;
  /** Darkens the person (0..1), for back bands. */
  dim?: number;
  parallax?: number;
  /** Walk behind this person (a valet with the umbrella, a porter with the shopping), `gap` units back. */
  follow?: Character;
  gap?: number;
}

// ---------- behaviour ----------

export interface Ready { full?: Full; critter?: Critter; bot?: BotFull; key: string; ph: number; seed: number; a: number; b: number }
const READY = new WeakMap<Character, Ready>();
let looks = 0;

function ready(p: Character): Ready {
  let R = READY.get(p);
  if (R) return R;
  const seed = p.seed ?? Math.round(p.x * 7 + 3), bk = botKind(p.look);
  const crit = typeof p.look === 'string' && p.look in CRITTERS ? p.look as Critter : undefined;
  const [a, b] = Array.isArray(p.range) ? p.range : [p.x, p.x + (p.range ?? 0)];
  R = {
    critter: crit, bot: bk ? botFrom(seed, bk, typeof p.look === 'object' ? p.look as BotLook : {}) : undefined,
    full: crit || bk ? undefined : lookFrom(seed, (p.look as Look) ?? {}), key: 'L' + looks++, ph: (seed * 97) % 997, seed, a, b,
  };
  READY.set(p, R);
  return R;
}

/** Where a walker is and which way it faces: there and back between a and b, with a pause at each end. */
function walkAt(p: Character, R: Ready, t: number, speed: number, pause: number) {
  const len = Math.abs(R.b - R.a);
  if (len < 1) return { x: R.a, face: p.facing ?? 1, moving: false, end: 0 };
  const run = len / speed, period = 2 * (run + pause), u = (t + R.ph * 3) % period, dir = R.b > R.a ? 1 : -1;
  if (u < pause) return { x: R.a, face: dir as 1 | -1, moving: false, end: -1 };
  if (u < pause + run) return { x: R.a + dir * (u - pause) * speed, face: dir as 1 | -1, moving: true, end: 0 };
  if (u < 2 * pause + run) return { x: R.b, face: -dir as 1 | -1, moving: false, end: 1 };
  return { x: R.b - dir * (u - 2 * pause - run) * speed, face: -dir as 1 | -1, moving: true, end: 0 };
}

const DEFAULT_SPEED: Partial<Record<Critter | 'human', number>> = { human: 0.32, cat: 0.45, pigeon: 0.12, gull: 0.14, cleaner: 0.22, drone: 0.35, courier: 0.55 };
const MOVERS: Act[] = ['walk', 'sweep', 'steal', 'scan', 'carry', 'roll', 'patrol', 'serve', 'crawl', 'hover'];
/** How long a mover waits at each end, by act. */
const PAUSE: Partial<Record<Act, number>> = { sweep: 160, carry: 110, roll: 130, patrol: 170, serve: 150, crawl: 220, hover: 90 };

export interface Frame { x: number; face: 1 | -1; legs: Legs | string; arms: Arms; bob: number; moving: boolean }

function frameOf(p: Character, R: Ready, t: number): Frame {
  const act = p.act ?? 'stand', ph = R.ph, tt = t + ph;
  let x = p.x, face: 1 | -1 = p.facing ?? 1, moving = false, end = 0;
  if (p.follow) {
    const F = frameOf(p.follow, ready(p.follow), t);
    x = F.x - F.face * (p.gap ?? 18); face = F.face; moving = F.moving;
  } else if (MOVERS.includes(act) && R.a !== R.b) {
    const sp = p.speed ?? (R.bot ? BOT[R.bot.kind].speed : DEFAULT_SPEED[R.critter ?? 'human']) ?? 0.3;
    const w = act === 'steal' ? stealAt(R, t, sp) : walkAt(p, R, t, sp, PAUSE[act] ?? (R.critter === 'pigeon' || R.critter === 'gull' ? 200 : 70 + (ph % 90)));
    ({ x, face, moving, end } = w);
  }
  if (R.bot) return botFrame(p, R, t, x, face, moving, end);
  const step = Math.floor(tt / (act === 'steal' && moving && face !== (R.b > R.a ? 1 : -1) ? 5 : 9)) % 2 ? 'stepA' : 'stepB';
  if (R.critter) {
    const c = R.critter;
    if (c === 'cat') return { x, face, legs: moving ? (Math.floor(tt / 8) % 2 ? 'walkA' : 'walkB') : tt % 500 < 60 ? 'sitB' : 'sitA', arms: 'down', bob: 0, moving };
    if (c === 'pigeon' || c === 'gull') return { x, face: moving ? face : (Math.floor(tt / 170) % 2 ? 1 : -1), legs: moving ? (Math.floor(tt / 6) % 2 ? 'walkA' : 'walkB') : tt % 90 < 25 ? 'standB' : 'standA', arms: 'down', bob: 0, moving };
    const spin = Math.floor(tt / (c === 'drone' ? 3 : 8)) % 2 ? 'walkA' : 'walkB';
    return { x, face, legs: c === 'courier' && !moving ? 'walkA' : spin, arms: 'down', bob: c === 'drone' ? Math.round(Math.sin(tt * 0.06) * 2) : 0, moving };
  }
  const slow = (n: number) => Math.floor(tt / n);
  const shift: Legs = tt % 420 < 210 ? 'stand' : 'shift';
  switch (act) {
    case 'walk': return { x, face, legs: moving ? step : shift, arms: 'down', bob: moving && step === 'stepA' ? 1 : 0, moving };
    case 'sweep': return { x, face, legs: moving ? step : 'stand', arms: slow(12) % 2 ? 'broomA' : 'broomB', bob: 0, moving };
    case 'steal': return { x, face, legs: moving ? step : 'stand', arms: !moving && end === 1 ? (slow(14) % 2 ? 'reach' : 'out') : 'down', bob: 0, moving };
    case 'sit': { const u = tt % 360; return { x, face, legs: 'sit', arms: R.full?.extras.includes('phone') ? 'phone' : u < 70 ? 'raise' : u < 110 ? 'out' : 'down', bob: 0, moving }; }
    case 'lean': return { x, face, legs: 'cross', arms: 'fold', bob: 0, moving };
    case 'smoke': { const u = tt % 280; return { x, face, legs: shift, arms: u < 50 ? 'raise' : 'hip', bob: 0, moving }; }
    case 'phone': return { x, face, legs: shift, arms: 'phone', bob: 0, moving };
    case 'haggle': return { x, face, legs: shift, arms: (['out', 'down', 'point', 'out', 'hip', 'down'] as Arms[])[slow(34) % 6], bob: 0, moving };
    case 'argue': { const k = slow(13); return { x, face, legs: k % 5 === 0 ? 'wide' : 'stand', arms: (['point', 'out', 'up', 'out', 'point', 'hip'] as Arms[])[k % 6], bob: k % 7 === 0 ? 1 : 0, moving }; }
    case 'queue': return { x, face, legs: shift, arms: R.full?.extras.includes('phone') ? 'phone' : slow(300) % 2 ? 'fold' : 'down', bob: 0, moving };
    case 'sleep': return { x, face, legs: 'lie', arms: 'down', bob: 0, moving };
    case 'dance': { const k = slow(16); return { x, face: k % 8 < 4 ? face : (-face as 1 | -1), legs: (['wide', 'stepA', 'wide', 'stepB'] as Legs[])[k % 4], arms: (['up', 'out', 'up', 'point'] as Arms[])[k % 4], bob: k % 2, moving }; }
    case 'vend': { const u = tt % 420; return { x, face, legs: 'stand', arms: u < 60 ? 'out' : u < 120 ? 'down' : u < 170 ? 'hip' : 'down', bob: 0, moving }; }
    default: {
      // stand: shifts weight, and now and then looks the other way
      const look = tt % 700 > 640 ? -face as 1 | -1 : face;
      return { x, face: look, legs: shift, arms: 'down', bob: 0, moving };
    }
  }
}

/** A robot's pose (legs, wheels, rotors) and state (arms, load, screen face) for its job. */
function botFrame(p: Character, R: Ready, t: number, x: number, face: 1 | -1, moving: boolean, end: number): Frame {
  const B = R.bot!, S = BOT[B.kind], act = p.act ?? 'stand', tt = t + R.ph, slow = (n: number) => Math.floor(tt / n) % 2;
  const legged = S.shape === 'android' || S.shape === 'loader' || S.shape === 'mech' || (S.shape === 'box' && B.v === 2);
  let pose = 'stand';
  if (S.fly) pose = slow(2) ? 'p0' : 'p1';
  else if (S.shape === 'crawler') pose = moving || act === 'scrub' ? (slow(10) ? 'cA' : 'cB') : 'cA';
  else if (S.shape === 'wreck') pose = tt % 520 < 40 ? 'twitch' : 'slump';
  else if (moving) pose = legged ? (slow(S.shape === 'mech' ? 16 : S.shape === 'loader' ? 12 : 9) ? 'stepA' : 'stepB') : slow(5) ? 'r0' : 'r1';
  const loaded = act !== 'carry' || (moving ? face === (R.b > R.a ? 1 : -1) : end !== 1);
  const fc = faceAt(B, act, tt);
  let st = '';
  switch (S.shape) {
    case 'android':
      st = B.kind === 'valet' ? (B.v === 0 ? 'bags' : 'umb') : B.kind === 'marshal' ? (act === 'direct' ? (slow(110) ? 'stop' : 'go') : 'down') : (act === 'walk' || act === 'carry') && loaded ? 'carry' : 'down';
      break;
    case 'box':
      st = (B.kind === 'sweeper' ? (slow(12) ? 'broomA' : 'broomB') : B.kind === 'busker' ? (act === 'play' && slow(14) ? 'playB' : 'playA')
        : act === 'carry' ? (loaded ? 'box' : 'down') : act === 'vend' || act === 'blink' ? (tt % 420 < 60 ? 'out' : 'down') : 'down') + '|' + fc;
      break;
    case 'waiter': st = (moving || act !== 'serve' ? 'tray' : 'offer') + '|' + fc; break;
    case 'ad': st = fc; break;
    case 'loader': st = act === 'carry' && loaded ? 'load' : 'empty'; break;
    case 'litter': st = moving ? 'tuck' : act === 'roll' || act === 'sweep' ? (tt % 120 < 50 ? 'reach' : 'lift') : 'tuck'; break;
    case 'crawler': st = act === 'weld' ? 'weld' : act === 'scrub' ? (slow(8) ? 'scrubA' : 'scrubB') : 'none'; break;
    case 'wreck': st = tt % 300 < 24 ? (slow(3) ? 'eyes' : 'off') : 'crack'; break;
  }
  const bob = S.fly ? Math.round(Math.sin(tt * 0.05) * 2) : moving && pose === 'stepA' && S.shape === 'android' ? 1 : 0;
  return { x, face, legs: pose, arms: st as Arms, bob, moving };
}

/** The kid's loop: sneak from a to b (the fruit), reach, then run back fast. */
function stealAt(R: Ready, t: number, sp: number) {
  const len = Math.abs(R.b - R.a), sneak = len / (sp * 0.6), grab = 70, run = len / (sp * 3), wait = 200;
  const u = (t + R.ph) % (sneak + grab + run + wait), dir = R.b > R.a ? 1 : -1;
  if (u < sneak) return { x: R.a + dir * (u / sneak) * len, face: dir as 1 | -1, moving: true, end: 0 };
  if (u < sneak + grab) return { x: R.b, face: dir as 1 | -1, moving: false, end: 1 };
  if (u < sneak + grab + run) return { x: R.b - dir * ((u - sneak - grab) / run) * len, face: -dir as 1 | -1, moving: true, end: 0 };
  return { x: R.a, face: -dir as 1 | -1, moving: false, end: -1 };
}

/** Is this person here now (their `when` on the city clock)? */
export const isHere = (p: Character) => !p.when || city.within(p.when);

export type PreparedCharacter = { visible: false; character: Character } | {
  visible: true; character: Character; ready: Ready; pixelSize: number; frame: Frame; height: number;
};

/** Resolve scheduling and pose once for an artwork binding; keep the original bake key. */
export function prepareCharacter(p: Character, t: number, override?: Partial<Pick<Character, 'act' | 'facing' | 'x' | 'h'>>): PreparedCharacter {
  const posed = override ? { ...p, ...override } : p;
  // Following affects pose evaluation, not appearance; omit that object link from the snapshot.
  const character = JSON.parse(JSON.stringify({ ...posed, follow: undefined })) as Character;
  if (!isHere(p)) return { visible: false, character };
  const R = ready(p), f = frameOf(posed, R, t);
  const defaultHeight = R.critter ? CRITTERS[R.critter].h ?? 0 : 0;
  return { visible: true, character, ready: JSON.parse(JSON.stringify(R)) as Ready,
    pixelSize: psOf(p), frame: f, height: characterHeight(p) + ((posed.h ?? defaultHeight) - (p.h ?? defaultHeight)) };
}

/** One person, as they are at time v.t (nobody, outside their `when`). */
export function drawCharacter(x: CanvasRenderingContext2D, v: View, p: Character) {
  if (!isHere(p)) return;
  const R = ready(p), ps = psOf(p), f = frameOf(p, R, v.t);
  drawCharacterFrame(x, v, p, R, ps, f, characterHeight(p));
}

/** Draw a list of people, back to front in the order given. */
export function drawCharacters(x: CanvasRenderingContext2D, v: View, list: readonly Character[]) {
  for (const p of list) drawCharacter(x, v, p);
}

/** Where a person is now (walkers move). */
export function characterX(p: Character, t: number) { return frameOf(p, ready(p), t).x; }

/** How tall a person is drawn, in world units (for prompts and bubbles). */
export function characterHeight(p: Character) {
  const R = ready(p), ps = psOf(p);
  if (R.bot) { const S = BOT[R.bot.kind]; return S.top * ps + (p.h ?? 0) + (S.fly ?? 0); }
  if (R.critter) return CRITTERS[R.critter].frames[Object.keys(CRITTERS[R.critter].frames)[0]].length * ps + (p.h ?? CRITTERS[R.critter].h ?? 0);
  const B = BODIES[R.full!.body];
  return (B.leg + B.torso + B.head + 1) * ps + (p.h ?? 0);
}

/** Robots (and the old drone, cleaner and courier) answer E even without `talk`. */
export function isBot(p: Character) { const R = ready(p); return !!R.bot || (!!R.critter && R.critter in CRITTER_BOT); }

const REACTED = new Map<Character, number>();
/** A robot's [E] prompt, name and reaction line; `next` moves it on to its next line. */
export function botReact(p: Character, next = false): { label: string; name: string; pages: string[] } {
  const R = ready(p), S = R.bot ? BOT[R.bot.kind] : CRITTER_BOT[R.critter!]!, n = REACTED.get(p) ?? 0;
  if (next) REACTED.set(p, n + 1);
  return { label: S.prompt, name: p.name ?? S.name + (R.bot ? '-' + (100 + ((R.seed * 37) % 900)) : ''), pages: S.lines[n % S.lines.length] };
}

const SAID = new Map<Character, number>();
/** The pages a person says now: one set, or the next of several (the last repeats). */
export function talkTo(p: Character,gameplay?:GameplaySession): { name: string; pages: string[] } {
  if(p.conversation&&gameplay){const session=new ConversationSession(gameplay,p.conversation);try{const f=session.frame();return{name:f.speaker,pages:f.pages};}finally{session.close();}}
  const T = p.talk ?? [];
  const name = p.name ?? 'STRANGER';
  // a line for now, or for this weather, first
  if (p.lines?.length) {
    const wx = weatherNow(hereClimate()).kind;
    const l = p.lines.find((q) => (!q.when || city.within(q.when)) && (!q.weather || q.weather.includes(wx)));
    if (l) return { name, pages: l.pages };
  }
  if (!T.length || typeof T[0] === 'string') return { name, pages: T as string[] };
  const n = SAID.get(p) ?? 0;
  SAID.set(p, n + 1);
  const sets = T as string[][];
  return { name, pages: sets[Math.min(n, sets.length - 1)] };
}

/** The jobs a robot in a crowd does, each with its act. */
const CROWD_JOBS: [Bot, Act][] = [
  ['android', 'walk'], ['android', 'walk'], ['litterbot', 'roll'], ['deliverybot', 'roll'], ['loader', 'carry'], ['sweeper', 'sweep'],
  ['adbot', 'roll'], ['minidrone', 'hover'], ['servbot', 'charge'], ['mech', 'patrol'], ['marshal', 'direct'], ['flyerdrone', 'hover'], ['deliverybot', 'roll'],
];

/**
 * A crowd of distinct ambient people between `from` and `to`: walkers, a few standing about, and
 * (`bots`, default 0.2) about one in five a robot doing its job. For back bands pass { ps: 2, dim: .5, parallax: .9 }.
 */
export function crowd(seed: number, n: number, from: number, to: number, opt: { ps?: number; dim?: number; parallax?: number; h?: number; acts?: Act[]; bots?: number } = {}): Character[] {
  const r = rnd(seed), acts = opt.acts ?? ['walk', 'walk', 'walk', 'stand', 'phone', 'walk', 'smoke'], share = opt.bots ?? 0.2;
  // a foreground band gets no drones; an all-walking crowd gets only robots that move
  const front = (opt.parallax ?? 1) > 1 || (opt.h ?? 0) < 0, onlyWalk = acts.every((a) => a === 'walk');
  const jobs = CROWD_JOBS.filter(([k, a]) => !(front && BOT[k].fly) && !(onlyWalk && !MOVERS.includes(a)));
  return Array.from({ length: n }, (_, i) => {
    const x = from + r() * (to - from), human = pick(r, acts), job = pick(r, jobs), bot = r() < share && !!job;
    const act = bot ? job[1] : human, len = (r() < 0.5 ? -1 : 1) * (120 + r() * 300) * (act === 'patrol' || act === 'sweep' ? 0.5 : 1);
    return { seed: seed * 31 + i * 7, look: bot ? job[0] : undefined, x, act, range: MOVERS.includes(act) ? len : 0, facing: r() < 0.5 ? 1 : -1, ps: opt.ps, dim: opt.dim, parallax: opt.parallax, h: opt.h };
  });
}
