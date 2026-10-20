import {streetSpriteHeadHeight} from '../art/characters/street-sprite';
import {actorPresentation} from '../engine/gameplay/actor-presentation';
import {actorAppearanceSeed} from '../engine/gameplay/actor-identity';
import botSource from '../engine/gameplay/bot-reactions.json';
import {ConversationSession} from '../engine/gameplay/conversation';
import type {GameplaySession} from '../engine/gameplay/session';
import { drawCharacterFrame, BODIES, type Full, rnd, pick, lookFrom, type Legs, type Arms, CRITTERS, type Bot, type BotLook, BOT, type BotFull, botFrom, botKind, faceAt, psOf } from "../art/characters/appearance";
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
 *     { seed: 3, x: 300, act: 'walk', range: 220 },                  // a passer-by, walks 300 â‡„ 520
 *     { seed: 8, x: 410, act: 'haggle', facing: -1 },                // two people haggling...
 *     { seed: 9, x: 386, act: 'haggle', facing: 1 },                 // ...facing each other
 *     { look: { body: 'old', garb: 'coat', hair: 'brim' }, x: 600, act: 'smoke' },
 *     { look: 'cat', x: 700, act: 'sit' },                           // critters: cat pigeon gull crab robogull cleaner drone courier
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
 * - People are never cyan (cyan = tech you can use); a rim keeps them off dark walls (ART-GUIDE Â§4, Â§6).
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
 *   minidrone (parcel), cargodrone (hanging crate), flyerdrone (warm hologram flyer), scandrone (Registry,
 *   rescue or port watchdog: a lens, a status light, a scan beam); djbot (a busker box with headphones and
 *   a deck). The old cleaner, drone and courier critters are robots too (the drone critter is a scandrone).
 * - A controller that moves a body itself (a device's drone, a flee arc, a flock: art/characters/flock.ts)
 *   uses `drawDriven(ctx, view, stableCharacter, { x, air, moving, act, light, beam })`.
 * - The seed varies paint, trim, wear and rust drips, a sticker, a mismatched replacement part, the
 *   screen face (eyes, happy, sad, dots), lights, antennae, porcelain vs metal heads, a glitchy few.
 * - Robot acts: carry, roll, patrol, serve, crawl, hover (movers); direct, play, weld, scrub, charge,
 *   glitch, blink, slump (in place); and stand, walk, sweep, queue, vend. Drones fly their own height over `h`.
 * - Robots with `talk` talk like people. Robots without it still answer E with a short line in their own
 *   voice (game.ts: `bot:` targets from `isBot` / shared bot conversations). Robots are never cyan: paint is orange,
 *   paper, grey, rust; lights are red and amber. Signs on them (boards, flyers) stay dry.
 * - `crowd()` makes about one in five a robot doing a crowd job (`bots` to change the share, 0 for none).
 */

import type { View } from "../scenes/kit";
import { city } from "../world/clock";
import type { TimeWindow } from "../data/types";
import type {WeatherKind} from "../world/weather";
import type { BODY_KINDS, HAIR_KINDS, GARB_KINDS, EXTRA_KINDS } from "../art/characters/parts";
import type { ArchetypeId, Facial } from "../art/characters/archetypes";
import { peopleRevision, seatedView, type SeatedView } from "../art/characters/people-style";

/** Parts (art/characters/parts.ts lists them once). */
export type Body = typeof BODY_KINDS[number];
export type Hair = typeof HAIR_KINDS[number];
export type Garb = typeof GARB_KINDS[number];
export type Extra = typeof EXTRA_KINDS[number];
export type { Facial } from "../art/characters/archetypes";
/** Pixel-frame animals and old robots. `drone` is drawn with the robot kit's scan drone (`scandrone`); `robogull` is a gull-shaped Registry drone. */
export type Critter = 'cat' | 'pigeon' | 'gull' | 'cleaner' | 'drone' | 'courier' | 'crab' | 'robogull';
/**
 * What a person does. In place: stand (shifts weight, looks around), sit (on whatever is at `h`),
 * lean (legs crossed, arms folded), smoke, phone, haggle (gestures; pair two facing each other),
 * argue (faster, bigger), queue, sleep (lying on `h`), dance, vend (behind a counter, offers and waits),
 * talk (slow gestures and a nod; standing people also switch to it while their speech bubble is open),
 * read (a newspaper held up), doze (asleep on their feet or in a seat, head down), wait (stands facing
 * the camera, shifting weight, now and then glancing aside: a queue or a crowd seen from the front).
 * `seated: true` does any in-place act sitting down (a bench, a train seat): read, phone, doze, stand.
 * Sitters face the camera, three-quarter or side on as the people-style `seated` switch says
 * (art/characters/people-style.ts), unless the person sets `sitView`.
 * Moving between `x` and `range`: walk, run (longer strides, 2.6× as fast), sweep (with a broom), steal
 * (sneaks to the far end, reaches, runs back). Walkers and runners pivot for a few frames at each end.
 * Drones: 'scan' hovers and sweeps a beam down on whoever is below (`beam` tunes it). Gulls: 'fly' (flapping;
 * a mover with `range`, or in place at `h`). Crabs: 'walk' (sideways) and 'dig'.
 * Robots (they also do stand, walk, sweep, queue, vend): moving between `x` and `range`: carry (a load
 * one way, empty back), roll (wheels, stops to pick things up), patrol (slow, sensor sweeping ahead),
 * serve (tray out at each end), crawl (along a wall at `h`), hover (drones bob and drift). In place:
 * direct (stop/go paddle), play (an instrument, notes rise), weld (sparks), scrub (a brush on the
 * wall), charge (cabled to a wall socket), glitch (twitches), blink (the screen face changes mood),
 * slump (the derelict: a flicker, a twitch).
 */
export type Act = 'stand' | 'walk' | 'run' | 'talk' | 'sit' | 'lean' | 'smoke' | 'phone' | 'haggle' | 'argue' | 'sweep' | 'queue' | 'sleep' | 'dance' | 'vend' | 'steal' | 'scan'
  | 'read' | 'doze' | 'wait' | 'dig' | 'fly'
  | 'carry' | 'roll' | 'patrol' | 'serve' | 'crawl' | 'hover' | 'direct' | 'play' | 'weld' | 'scrub' | 'charge' | 'glitch' | 'blink' | 'slump';

export interface Look {
  /** A named look (art/characters/archetypes.ts): fixes its defining parts; the seed varies the rest. */
  archetype?: ArchetypeId;
  /** Whose clothing palette (a world/city.json district id); default the city's. */
  district?: string;
  /** Shows visible tech (one or two pieces). Default: the archetype's chance. */
  kitted?: boolean;
  body?: Body; hair?: Hair; garb?: Garb; extras?: Extra[]; facial?: Facial;
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
  /** Pixel size: 3 = the player's scale; 2 for a back band; 4â€“5 for a near foreground. */
  ps?: number;
  /** Darkens the person (0..1), for back bands. */
  dim?: number;
  parallax?: number;
  /** Walk behind this person (a valet with the umbrella, a porter with the shopping), `gap` units back. */
  follow?: Character;
  gap?: number;
  /** Do the act sitting down (bench, train seat): read, phone, doze, stand. */
  seated?: boolean;
  /** How this person sits (front, three-quarter or side on), instead of the people-style `seated` switch. */
  sitView?: SeatedView;
  /** A robot's status light, drawn live over its sprite (state-driven: green, red). CSS colour. */
  light?: string;
  /** The scan beam of a scanning drone (act 'scan'). */
  beam?: Beam;
  /** false: no rim (things against the sky, e.g. a flock). */
  rim?: boolean;
  /** false: no cast shadow (flying things, people inside a window). */
  shadow?: boolean;
}

/** A scan beam: a cone from the lens down to `foot` (world height, default the ground). */
export interface Beam {
  /** 'r,g,b' (default the Registry's red). */
  rgb?: string; alpha?: number; foot?: number;
  /** Half width of the cone at its foot, and how far (px) and how fast it sweeps; `lean` shifts the foot. */
  spread?: number; sweep?: number; rate?: number; lean?: number;
  /** The bright scan line bouncing over the foot. */
  line?: boolean;
}

// ---------- behaviour ----------

/** `rev`: the people-style revision the look was dressed for (a switch change re-dresses everyone). */
export interface Ready { full?: Full; critter?: Critter; bot?: BotFull; key: string; ph: number; seed: number; a: number; b: number; rev: number }
const READY = new WeakMap<Character, Ready>();
let looks = 0;

function ready(p: Character): Ready {
  let R = READY.get(p);
  if (R && R.rev === peopleRevision()) return R;
  const seed = p.seed ?? actorAppearanceSeed(p) ?? Math.round(p.x * 7 + 3);
  const crit = typeof p.look === 'string' && p.look in CRITTERS ? p.look as Critter : undefined;
  // a critter drawn with a robot body (the old drone is the kit's scan drone) keeps its critter name, voice and heights
  const alias = crit ? CRITTERS[crit].bot : undefined, bk = alias?.bot ?? botKind(p.look);
  const [a, b] = Array.isArray(p.range) ? p.range : [p.x, p.x + (p.range ?? 0)];
  R = {
    critter: crit, bot: bk ? botFrom(seed, bk, alias ?? (typeof p.look === 'object' ? p.look as BotLook : {})) : undefined,
    full: crit || bk ? undefined : lookFrom(seed, (p.look as Look) ?? {}), key: 'L' + looks++, ph: (seed * 97) % 997, seed, a, b, rev: peopleRevision(),
  };
  READY.set(p, R);
  return R;
}

/** Where a walker is and which way it faces: there and back between a and b, with a pause at each end. */
function walkAt(p: Character, R: Ready, t: number, speed: number, pause: number) {
  const len = Math.abs(R.b - R.a);
  if (len < 1) return { x: R.a, face: p.facing ?? 1, moving: false, end: 0, since: Infinity };
  const run = len / speed, period = 2 * (run + pause), u = (t + R.ph * 3) % period, dir = R.b > R.a ? 1 : -1;
  if (u < pause) return { x: R.a, face: dir as 1 | -1, moving: false, end: -1, since: u };
  if (u < pause + run) return { x: R.a + dir * (u - pause) * speed, face: dir as 1 | -1, moving: true, end: 0 };
  if (u < 2 * pause + run) return { x: R.b, face: -dir as 1 | -1, moving: false, end: 1, since: u - pause - run };
  return { x: R.b - dir * (u - 2 * pause - run) * speed, face: -dir as 1 | -1, moving: true, end: 0 };
}

const DEFAULT_SPEED: Partial<Record<Critter | 'human', number>> = { human: 0.32, cat: 0.45, pigeon: 0.12, gull: 0.14, cleaner: 0.22, drone: 0.35, courier: 0.55, crab: 0.2, robogull: 0.4 };
const MOVERS: Act[] = ['walk', 'run', 'sweep', 'steal', 'scan', 'carry', 'roll', 'patrol', 'serve', 'crawl', 'hover', 'fly'];
/** How long a mover waits at each end, by act. */
const PAUSE: Partial<Record<Act, number>> = { run: 40, sweep: 160, carry: 110, roll: 130, patrol: 170, serve: 150, crawl: 220, hover: 90, fly: 30 };
/** Runners cover ground this many times faster than they walk. */
const RUN = 2.6;
/** Frames a walker spends pivoting (legs crossed, still facing the old way) when it turns at an end. */
const TURN = 8;

/**
 * The actions each body really animates (PEOPLE KIT). Other values still draw (as standing, or the
 * body's idle) and existing scenes keep them; the editor offers these. Keys: 'human', a critter or a robot kind.
 */
export const KIT_ACTS: Record<string, readonly Act[]> = {
  human: ['stand', 'walk', 'run', 'talk', 'sit', 'lean', 'smoke', 'phone', 'haggle', 'argue', 'sweep', 'queue', 'sleep', 'dance', 'vend', 'steal', 'read', 'doze', 'wait'],
  cat: ['stand', 'walk', 'sit'], pigeon: ['stand', 'walk'], gull: ['stand', 'walk', 'fly'], crab: ['stand', 'walk', 'dig'],
  cleaner: ['stand', 'walk'], drone: ['stand', 'hover', 'scan'], courier: ['stand', 'walk'], robogull: ['stand', 'fly', 'scan'],
  android: ['stand', 'walk', 'carry'], valet: ['stand', 'walk'], marshal: ['stand', 'walk', 'direct'],
  servbot: ['stand', 'walk', 'carry', 'vend', 'blink', 'charge', 'glitch'], sweeper: ['stand', 'walk', 'sweep'], busker: ['stand', 'walk', 'play'],
  waiter: ['stand', 'walk', 'serve'], loader: ['stand', 'walk', 'carry'], porter: ['stand', 'walk'], mech: ['stand', 'patrol'],
  litterbot: ['stand', 'roll', 'sweep'], deliverybot: ['stand', 'roll'], adbot: ['stand', 'roll', 'blink'],
  crawler: ['stand', 'crawl', 'weld', 'scrub'], wreck: ['slump', 'glitch'], minidrone: ['stand', 'hover'], cargodrone: ['stand', 'hover'], flyerdrone: ['stand', 'hover'],
  scandrone: ['stand', 'hover', 'scan'], djbot: ['stand', 'play'],
};
/** Which KIT_ACTS row a look belongs to. */
export function kitFamily(look: Character['look']): string {
  if (typeof look === 'string') return look;
  if (look && typeof look === 'object' && 'bot' in look) return (look as BotLook).bot;
  return 'human';
}

/** Who is speaking right now: the x of the open speech bubble, or null. Standing people there gesture (talk). */
let speakerX: number | null = null;
export function setSpeaker(x: number | null) { speakerX = x; }
/** Acts that switch to the talk pose while their person is speaking; movers and sitters keep theirs. */
const TALKERS: readonly Act[] = ['stand', 'talk', 'smoke', 'phone', 'queue', 'haggle', 'vend', 'lean'];

export interface Frame { x: number; face: 1 | -1; legs: Legs | string; arms: Arms; bob: number; moving: boolean }

/** `drive`: a controller owns the position (p.x) and says whether the body moves; no range walking. */
function frameOf(p: Character, R: Ready, t: number, drive?: boolean): Frame {
  const f = poseOf(p, R, t, drive);
  if (R.bot || R.critter) return f;
  // seated: an in-place act done sitting down
  if (p.seated && f.legs !== 'lie' && !f.moving) f.legs = 'sit';
  // sitting on a bench or a seat that faces the camera: the people-style switch (or the person's own sitView)
  if (f.legs === 'sit') { const view = p.sitView ?? seatedView(); if (view !== 'side') f.legs = view === 'front' ? 'sitFront' : 'sit3q'; }
  return f;
}
function poseOf(p: Character, R: Ready, t: number, drive?: boolean): Frame {
  const act = p.act ?? 'stand', ph = R.ph, tt = t + ph;
  let x = p.x, face: 1 | -1 = p.facing ?? 1, moving = drive ?? false, end = 0, since = Infinity;
  if (drive !== undefined) { /* the controller placed it */ }
  else if (p.follow) {
    const F = frameOf(p.follow, ready(p.follow), t);
    x = F.x - F.face * (p.gap ?? 18); face = F.face; moving = F.moving;
  } else if (MOVERS.includes(act) && R.a !== R.b) {
    const sp = (p.speed ?? (R.critter ? DEFAULT_SPEED[R.critter] : R.bot ? BOT[R.bot.kind].speed : DEFAULT_SPEED.human) ?? 0.3) * (act === 'run' ? RUN : 1);
    const w = act === 'steal' ? stealAt(R, t, sp) : walkAt(p, R, t, sp, PAUSE[act] ?? (R.critter === 'pigeon' || R.critter === 'gull' ? 200 : 70 + (ph % 90)));
    ({ x, face, moving, end } = w); since = 'since' in w && typeof w.since === 'number' ? w.since : Infinity;
  }
  if (R.bot) return botFrame(p, R, t, x, face, moving, end);
  const step = Math.floor(tt / (act === 'steal' && moving && face !== (R.b > R.a ? 1 : -1) ? 5 : 9)) % 2 ? 'stepA' : 'stepB';
  if (R.critter) {
    const c = R.critter;
    if (c === 'cat') return { x, face, legs: moving ? (Math.floor(tt / 8) % 2 ? 'walkA' : 'walkB') : tt % 500 < 60 ? 'sitB' : 'sitA', arms: 'down', bob: 0, moving };
    if ((c === 'gull' || c === 'robogull') && (act === 'fly' || act === 'scan' || c === 'robogull' && moving)) return { x, face, legs: Math.floor(tt / 7) % 2 ? 'flyA' : 'flyB', arms: 'down', bob: 0, moving };
    if (c === 'crab') return { x, face, legs: moving ? (Math.floor(tt / 5) % 2 ? 'walkA' : 'walkB') : act === 'dig' ? (Math.floor(tt / 12) % 2 ? 'digA' : 'digB') : 'standA', arms: 'down', bob: 0, moving };
    if (c === 'pigeon' || c === 'gull' || c === 'robogull') return { x, face: moving ? face : (Math.floor(tt / 170) % 2 ? 1 : -1), legs: moving ? (Math.floor(tt / 6) % 2 ? 'walkA' : 'walkB') : tt % 90 < 25 ? 'standB' : 'standA', arms: 'down', bob: 0, moving };
    const spin = Math.floor(tt / 8) % 2 ? 'walkA' : 'walkB';
    return { x, face, legs: c === 'courier' && !moving ? 'walkA' : spin, arms: 'down', bob: 0, moving };
  }
  const slow = (n: number) => Math.floor(tt / n);
  const shift: Legs = tt % 420 < 210 ? 'stand' : 'shift';
  // pivot at the end of a walk: a few frames with crossed legs, still facing the way they came
  if ((act === 'walk' || act === 'run') && !moving && since < TURN) return { x, face: -face as 1 | -1, legs: 'cross', arms: 'down', bob: 0, moving };
  if (speakerX !== null && Math.abs(x - speakerX) < 3 && TALKERS.includes(act)) return talkFrame(x, face, tt, shift, moving);
  switch (act) {
    case 'walk': return { x, face, legs: moving ? step : shift, arms: 'down', bob: moving && step === 'stepA' ? 1 : 0, moving };
    case 'run': { const k = slow(4) % 2; return { x, face, legs: moving ? (k ? 'wide' : 'stepB') : shift, arms: moving ? (k ? 'out' : 'hip') : 'down', bob: moving && k ? 1 : 0, moving }; }
    case 'talk': return talkFrame(x, face, tt, shift, moving);
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
    case 'read': return { x, face, legs: shift, arms: 'paper', bob: 0, moving };
    case 'doze': return { x, face, legs: 'stand', arms: 'nod', bob: Math.sin(tt * 0.02) > 0.6 ? -1 : 0, moving };
    case 'wait': {
      // facing the camera: weight from foot to foot, arms folded for a while, a glance aside now and then
      const u = tt % 900;
      return { x, face: u > 820 ? -face as 1 | -1 : face, legs: u > 700 ? 'front3q' : 'front', arms: R.full?.extras.includes('phone') ? 'phone' : slow(330) % 2 ? 'fold' : 'down', bob: 0, moving };
    }
    default: {
      // stand: shifts weight, and now and then looks the other way
      const look = tt % 700 > 640 ? -face as 1 | -1 : face;
      return { x, face: look, legs: shift, arms: 'down', bob: 0, moving };
    }
  }
}

/** Talking: slow hand gestures and a small nod, weight shifting as usual. */
function talkFrame(x: number, face: 1 | -1, tt: number, shift: Legs, moving: boolean): Frame {
  const k = Math.floor(tt / 26);
  return { x, face, legs: shift, arms: (['out', 'down', 'point', 'down', 'hip', 'out'] as Arms[])[k % 6], bob: tt % 48 < 6 ? 1 : 0, moving };
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
      st = (B.kind === 'sweeper' ? (slow(12) ? 'broomA' : 'broomB') : B.kind === 'busker' ? (act === 'play' && slow(14) ? 'playB' : 'playA') : B.kind === 'djbot' ? (act === 'play' ? (slow(8) ? 'djA' : 'djB') : 'down')
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

/**
 * What a controller says about a body it moves itself (a device's drone, a flee arc, a flock): where it is
 * now and whether it moves. `air` is the absolute height of a flying body (instead of `h` plus its flight
 * height). Everything else (how it looks, steps, flaps, scans) is the kit's. Keep `p` itself stable (a
 * module constant): its appearance is baked once per Character object.
 */
export interface Drive extends Partial<Pick<Character, 'x' | 'h' | 'facing' | 'act' | 'light' | 'beam'>> { moving?: boolean; air?: number }
/** Draw a stable kit body where a controller puts it (see Drive). */
export function drawDriven(x: CanvasRenderingContext2D, v: View, p: Character, d: Drive) {
  if (!isHere(p)) return;
  const R = ready(p), fly = R.bot && !R.critter ? BOT[R.bot.kind].fly ?? 0 : 0, { moving, air, ...rest } = d;
  const posed: Character = { ...p, ...rest, ...(air !== undefined ? { h: air - fly } : {}), range: undefined, follow: undefined };
  const f = frameOf(posed, R, v.t, moving ?? false);
  drawCharacterFrame(x, v, posed, R, psOf(p), f, characterHeight(p) + ((posed.h ?? 0) - (p.h ?? 0)));
}

/** Draw a list of people, back to front in the order given. */
export function drawCharacters(x: CanvasRenderingContext2D, v: View, list: readonly Character[]) {
  for (const p of list) drawCharacter(x, v, p);
}

/** Where a person is now (walkers move). */
export function characterX(p: Character, t: number) { if(actorPresentation(p))return p.x;return frameOf(p, ready(p), t).x; }

/** How tall a person is drawn, in world units (for prompts and bubbles). */
export function characterHeight(p: Character) {
  const recipe=actorPresentation(p);if(recipe)return(recipe.kind==='streetSprite'?streetSpriteHeadHeight(recipe):(recipe.sit?12:14)*(p.ps??3))+(p.h??0);
  const R = ready(p), ps = psOf(p);
  if (R.bot) { const S = BOT[R.bot.kind]; return S.top * ps + (R.critter ? p.h ?? CRITTERS[R.critter].h ?? 0 : (p.h ?? 0) + (S.fly ?? 0)); }
  if (R.critter) return CRITTERS[R.critter].frames[Object.keys(CRITTERS[R.critter].frames)[0]].length * ps + (p.h ?? CRITTERS[R.critter].h ?? 0);
  const B = BODIES[R.full!.body];
  return (B.leg + B.torso + B.head + 1) * ps + (p.h ?? 0);
}

const legacyRobotKinds=new Set(botSource.voices.filter(v=>v.id.startsWith('legacy.')).map(v=>v.id.slice(7)));
/** Appearance identity only; dialogue text and progress belong to the shared gameplay source. */
export function botProfile(p:Character):{voice:string;serial?:number}|null {
 const R=ready(p);return R.critter&&legacyRobotKinds.has(R.critter)?{voice:'legacy.'+R.critter}:R.bot?{voice:'robot.'+R.bot.kind,serial:100+((R.seed*37)%900)}:null;
}
export function isBot(p:Character){return botProfile(p)!==null;}

/** Shared dialogue is the only progression/variant owner for talkable actors. */
export function talkTo(p:Character,gameplay?:GameplaySession):{name:string;pages:string[];completion?:{terminalPrefill:string}}{
 if(!p.conversation||!gameplay)throw new Error('Character conversation is not registered');
 const session=new ConversationSession(gameplay,p.conversation);try{const f=session.frame();return{name:f.speaker,pages:f.pages,...(f.completion?{completion:{...f.completion}}:{})};}finally{session.close();}
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
