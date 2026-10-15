/**
 * The scene definition (`SceneDef`), and shared shapes and drawing for every
 * scene. A scene is one walkable screen: mostly data (positions, sizes, texts
 * as plain objects) plus its drawing, and, when it has devices, a data file
 * and rules on the engine (engine/). This file also holds what every scene
 * draws the same way, so they all follow ART-GUIDE.md:
 * dim far band, medium middle band, the play band brightest; signs on plates;
 * cyan only on things you can use.
 *
 * The kits to build a living place from (ART-GUIDE §10):
 *   ../characters.ts  people, cats, pigeons and robots from a seed, with idle behaviours and talk
 *   screens.ts    mounted signs and live screens (tickers, ads, cameras, Registry notices) and dry copy
 *   build.ts      stalls, booths, facades, shelves, fridges, clutter, benches, lamps
 * market.ts and shop.ts are the reference scenes that use all three.
 */

import type { Character } from '../characters';
import type { Perch } from '../companion';
import type { SceneData } from '../data/types';
import type { Player } from '../downtown/rules';
import type { EngineDraw, Line, SceneModel, SceneRules, SceneTarget } from '../engine';
import type { PanelFn } from '../engine/panels';
import type { WeatherKind } from '../weather';
import type { Caster, SceneLight, Shade } from '../sets/lighting';
import { windowLit } from '../light';

/** What a scene's draw functions get from the engine, refreshed every frame. */
export interface View {
  /** World x to screen x; `parallax` < 1 for things further away, > 1 for the foreground. */
  sx: (wx: number, parallax?: number) => number;
  /** Height above the ground to screen y. */
  y: (h: number) => number;
  t: number;
  viewW: number;
  viewH: number;
  cam: number;
  /** Screen y of the ground; the strip below it (about 54 units) is the near floor. */
  gy: number;
  /** The save's flags (read only), for doors that open later (e.g. `end`: Downtown cleared, the market gate is open). */
  flags: Readonly<Record<string, boolean>>;
}

/**
 * A way out. `to` is a scene id (a district's station exit leads to its
 * platform scene). `at` is the exit you land at there, by its id (Downtown's
 * doors are its exits too: shop, yard, capsule, metro, moth, taxi, market);
 * without one you land at its `spawn`.
 */
export interface SceneExit {
  id: string;
  x: number;
  to: string;
  label: string;
  promptH?: number;
  at?: string;
  /**
   * Not a walk: 'board' the train standing at this platform (one prompt per open
   * door, `x` is only where you land stepping off), step 'out' of the train at
   * its stop, hail a 'taxi', look at the city 'map'.
   */
  action?: 'board' | 'out' | 'taxi' | 'map';
  /** Only there while this save flag is set. */
  requires?: string;
  /**
   * An open way out (a street, an alley, a pier): no E, you leave by walking
   * into this border of the scene. `x` is then where you land arriving through
   * it (keep it a little inside the border). For outdoor connections only;
   * doors, stairs and pads keep E.
   */
  edge?: 'left' | 'right';
  /**
   * The scene's own code offers this way out: an engine target (its prompt depends on the
   * scene's state, a door that is locked first) whose `use` returns this exit's id. No prompt
   * of its own; `x` is only where you land arriving through it.
   */
  engine?: boolean;
  /** A save flag set when you leave through it (the flat's door: Pixel comes along from now on). */
  sets?: string;
  /** A keyring item it needs; without it, E is refused with these words. */
  needs?: { key: string; name: string; pages: string[]; h: number };
}

/** A bench, a bar stool or a bed: E there offers "wait until…" (clock.ts WAITS). */
export interface SceneRest { id: string; x: number; kind: 'bench' | 'stool' | 'bed'; promptH?: number; h?: number }

/** Something to read (or a person who says a line) with E. */
export interface SceneReadable { id: string; x: number; name: string; pages: string[]; label?: string; h?: number; promptH?: number }

/**
 * Something to DO in a place with E (buy, haggle, pay for a fortune): `use` runs when the player
 * presses E there and returns what is said (a bubble). It can spend tokens and set save flags.
 */
export interface SceneUse {
  id: string;
  x: number;
  /** The E prompt ("[E] BUY FISH"); a `price` is added to it ("· 1 TOKEN · YOU HAVE 7"). */
  label: string;
  /** Who speaks the answer (the bubble's name), unless `use` returns its own. */
  name: string;
  promptH?: number;
  h?: number;
  /**
   * What it costs now, in tokens (0 or none: nothing to pay this time; the florist charges only once
   * you ask). Tokens show only where you pay (Tommi, 2026-10-15): on the prompt and the popup.
   */
  price?: number | ((flags: Readonly<Record<string, boolean>>) => number);
  /** Its words in the popup, when it opens one (what you carry is offered): default the label, lower case. */
  act?: string;
  /**
   * What it takes from what you carry: while you hold one, E opens a popup with these first ("give
   * the tea") and the use itself, three at most. `use` runs as the main one does; it takes the item
   * itself (`c.take`) or keeps it.
   */
  items?: SceneItemUse[];
  use: (c: UseCtx) => SceneSaid;
}

/** What a use says: lines in its own name, or another speaker's. */
export type SceneSaid = string[] | { name: string; pages: string[] };

/** Something you carry, used on a scene's use (the tea at the crane's call box). */
export interface SceneItemUse { item: ItemId; label: string; use: (c: UseCtx) => SceneSaid }

/** "1 TOKEN · YOU HAVE 7": a price where you pay (prompts upper case; popups lower it). */
export const priceTag = (n: number, have: number) => n + ' TOKEN' + (n === 1 ? '' : 'S') + ' · YOU HAVE ' + have;

/** What a scene's `use` gets: the player's tokens and flags, and a way to pay. */
export interface UseCtx {
  tokens: number;
  /** Takes n tokens if the player has them (true), else nothing (false). */
  pay: (n: number) => boolean;
  /** Gives the player n tokens. */
  give: (n: number) => void;
  flags: Readonly<Record<string, boolean>>;
  set: (flag: string) => void;
  t: number;
  /** The weather here now (weather.ts), and the city clock's minute of the day (0–1439): for lines that change with them. */
  weather: WeatherKind;
  min: number;
  /**
   * What the player carries (the save's `items`, kept across scenes and reloads; shown where it is used):
   * `has` at least n of an item, `take` n if there are that many (true), else nothing (false),
   * `add` n (bought, given). Item ids and their names: `ITEMS`.
   */
  has: (item: ItemId, n?: number) => boolean;
  take: (item: ItemId, n?: number) => boolean;
  add: (item: ItemId, n?: number) => void;
}

/** Everything the player can carry, by id, with its name (the HUD's short "+ name" line when it comes). */
export const ITEMS = {
  fish: 'fish',
  tea: 'tea',
  basil: 'basil leaf',
  blankchip: 'blank chip',
  blue: 'BLUE',
  crisps: 'crisps',
  noodlecup: 'noodle cup',
  gum: 'gum',
  soap: 'soap',
  /** Moth's maglev pass, from the jacket in washer 3 (P13); LINE 0's emergency brake asks for it (P14). */
  'maglev.pass': 'maglev pass',
} as const;
export type ItemId = keyof typeof ITEMS;

/**
 * A scene, complete: one walkable screen. Every place in the game is one (the
 * capsule, Downtown, the market, a metro platform, the car), with the same
 * capabilities: devices on the engine (`data`, `rules`; none: zero devices,
 * hack vision shows nothing to hack), people, uses, readables, exits and its
 * own drawing. Which place it belongs to is the city's data (city.ts).
 */
export interface SceneDef {
  id: string;
  /** Shown in the HUD. */
  name: string;
  width: number;
  /** Where you land without an exit to arrive at. */
  spawn: number;
  exits: SceneExit[];
  readables?: SceneReadable[];
  /** The people who live here (characters.ts). The scene draws them; the engine makes [E] TALK targets for those with `id` and `talk`. */
  people?: Character[];
  /** Things to do here with E (buy, haggle). */
  uses?: SceneUse[];
  /**
   * What the engine draws around the scene: `sky`, its stars and ships behind everything; `city`,
   * Downtown's skyline and street walls (game.ts); `street`, the wet street floor; `weather`, the
   * district's weather (weather.ts, sets/weather.ts): it is outdoors (rain, fog, smog, heat, puddles);
   * `covers`, roofs it doesn't rain under (a platform's canopy): world x from/to and the underside's height.
   */
  ambient?: { sky?: boolean; city?: boolean; street?: boolean; weather?: boolean; covers?: { from: number; to: number; under: number }[] };

  // ---------- light (TIME.md "Light"; ART-GUIDE §8; light.ts, sets/sky.ts, sets/lighting.ts) ----------

  /**
   * The compass direction the view looks toward (degrees: 0 north, 90 east, the sea). Sets where the
   * sun and the moon stand in this scene's sky and which way shadows fall. Interiors: where their
   * windows look out. Default 180.
   */
  facing?: number;
  /**
   * Outdoors (default: when `ambient.weather` or `ambient.sky`): the sky, the grade and cast shadows
   * apply. `false` for an interior, which gets the outside light through its windows (`drawPane`,
   * `windowShaft`).
   */
  outdoor?: boolean;
  /** The horizon's height over the ground (world units) for the engine's sky (`ambient.sky`); default 0. */
  horizon?: number;
  /** Light sources on the light layer (sets/lighting.ts `SceneLight`): lamps, windows, neon, screens. */
  lights?: SceneLight[];
  /** Key props that cast a shadow (people, robots and animals cast theirs anyway). */
  casters?: Caster[];
  /** The buildings that shade the street (shadows C): behind you, in front, with gaps. */
  shade?: Shade;
  /**
   * Places to sit or lie down and let time pass (TIME.md "Waiting"): E offers "wait until…" (the
   * next hour, dusk, night, morning). `bed` sleeps.
   */
  rests?: SceneRest[];
  /** What the player says on the first visit (save flag `scene:<id>`); a function when it depends on a touch screen. */
  intro?: string[] | ((touch: boolean) => string[]);
  /** Arriving keeps the way the player faces (an open street); otherwise they face into the scene. */
  keepFace?: boolean;
  /** Ledges to stand on (Downtown's low roof). */
  platforms?: { x: number; w: number; h: number }[];
  /** Pixel: 'home' where it lives (`perch`: where it wants to be), 'along' where it follows you once it does. */
  pixel?: 'home' | 'along';
  perch?: (m: SceneModel) => Perch;
  /** The engine's error lines buzz (Downtown's ACCESS DENIED, as the old terminal did). */
  buzz?: boolean;

  // ---------- on the engine ----------

  /** Its data file (devices, goals, texts). None: zero devices. */
  data?: SceneData;
  /** Its code: named effects and the rest (Downtown's are made for the player's save). */
  rules?: SceneRules | ((player: Player) => SceneRules);
  /** Panels besides the engine's `talk` (the yard's `camera`). Must match `rules.panels`. */
  panels?: Record<string, PanelFn>;
  /** Hack vision draws it in two passes: the world (muted), then the devices on top. Otherwise the game mutes round the devices' frames. */
  layers?: boolean;
  /** A device that takes no E for now (Downtown's gate once it stands open: the market's door takes its place). */
  hideDevice?: (id: string, flags: Readonly<Record<string, boolean>>) => boolean;
  /** Things to press E on besides the devices (a door its code locks, a pickup tray). */
  targets?(m: SceneModel): SceneTarget[];
  /** E on one of those. Return an exit's id (`engine` exits) to leave through it. */
  use?(id: string, m: SceneModel, say: (l: Line) => void): string | void;

  // ---------- drawing ----------

  /**
   * Everything behind the player: far, middle and play band, and the devices. `e` has the model,
   * the device under the pointer and, in hack vision, the layer: a scene that cannot split
   * draws everything for 'world' and nothing for 'devices'.
   */
  drawBackdrop: (x: CanvasRenderingContext2D, v: View, e: EngineDraw) => void;
  /** Foreground in front of the player (near pillars, passers-by). */
  drawFront?: (x: CanvasRenderingContext2D, v: View) => void;
}

/** The player sprite is 14 rows of 3 px: the unit of scale for every scene. */
export const PLAYER_H = 42;
/** A door is about 1.2× the player, a storey 1.6–2×. */
export const DOOR_H = 52;
export const STOREY = 76;

export const O = '255,136,0', RUST = '194,65,12', C = '0,255,255', PAPER = '255,217,165', RED = '255,42,68', GREEN = '34,197,94';

/** Small seeded random, so a scene looks the same on every visit. */
export const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

export const mono = (size: number, weight = '') => (weight ? weight + ' ' : '') + size + 'px "IBM Plex Mono", monospace';

export function text(x: CanvasRenderingContext2D, s: string, cx: number, cy: number, col: string, size = 7, weight = '', align: CanvasTextAlign = 'center') {
  x.save(); x.font = mono(size, weight); x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, cx, cy); x.restore();
}

/** A filled box with a 1px outline inside it. */
export function box(x: CanvasRenderingContext2D, sx: number, top: number, w: number, h: number, fill: string, stroke?: string) {
  x.fillStyle = fill; x.fillRect(sx, top, w, h);
  if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, w - 1, h - 1); }
}

export const onScreen = (v: View, sx: number, w: number) => sx + w > -4 && sx < v.viewW + 4;

/** Neon letters with a glow, like the street's signs. Always put a plate or bracket behind them. */
export function neon(x: CanvasRenderingContext2D, t: number, s: string, cx: number, cy: number, col: string, opt: { size?: number; dead?: number; phase?: number } = {}) {
  const size = opt.size ?? 9, dead = opt.dead ?? -1;
  const flick = (t + (opt.phase ?? 0)) % 300 > 293 && Math.floor(t) % 4 < 2;
  x.save();
  x.font = mono(size, '600'); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < s.length; i++) {
    const off = flick || i === dead;
    x.fillStyle = 'rgba(' + col + ',' + (off ? 0.15 : 0.95) + ')';
    x.shadowColor = 'rgba(' + col + ',.85)'; x.shadowBlur = off ? 0 : 7;
    x.fillText(s[i], cx + (i - (s.length - 1) / 2) * size * 0.64, cy);
  }
  x.restore();
}

/** A neon sign on its backing plate, with the glow it throws on the wall around it. */
export function sign(x: CanvasRenderingContext2D, t: number, s: string, cx: number, cy: number, col: string, opt: { size?: number; dead?: number; phase?: number; plate?: string } = {}) {
  const size = opt.size ?? 9, w = Math.round(s.length * size * 0.64 + 12), h = size + 8;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, w * 0.7);
  g.addColorStop(0, 'rgba(' + col + ',.12)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  x.fillStyle = g; x.fillRect(cx - w, cy - w * 0.5, w * 2, w);
  box(x, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h, opt.plate ?? '#0d0705', 'rgba(' + col + ',.35)');
  neon(x, t, s, cx, cy + 0.5, col, opt);
}

/** The tell for "you can use this": a small cyan LED with a slow blink (ART-GUIDE §7). */
export function tell(x: CanvasRenderingContext2D, t: number, cx: number, cy: number, phase = 0) {
  const on = Math.sin(t * 0.05 + phase) > -0.3;
  x.save();
  x.fillStyle = 'rgba(' + C + ',' + (on ? 0.95 : 0.3) + ')';
  if (on) { x.shadowColor = 'rgba(' + C + ',.9)'; x.shadowBlur = 5; }
  x.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 2);
  x.restore();
}

/** A paper notice on a board, with a cyan LED so it reads as something to read. */
export function notice(x: CanvasRenderingContext2D, t: number, cx: number, top: number, w: number, h: number, lines: string[], phase = 0) {
  box(x, cx - w / 2, top, w, h, '#1a120b', 'rgba(' + O + ',.7)');
  box(x, cx - w / 2 + 3, top + 3, w - 6, h - 6, 'rgba(' + PAPER + ',.16)');
  lines.forEach((l, i) => text(x, l, cx, top + 9 + i * 9, 'rgba(' + PAPER + ',.9)', 7, '600'));
  tell(x, t, cx + w / 2 - 5, top + h - 4, phase);
}

/** The way back to Downtown at a scene's left edge: a door in the wall with a cyan plate. */
export function exitDoor(x: CanvasRenderingContext2D, v: View, wx: number, wall: string, label = '< DOWNTOWN') {
  const sx = v.sx(wx);
  if (!onScreen(v, sx - 30, 60)) return;
  box(x, sx - 14, v.y(DOOR_H + 4), 28, DOOR_H + 4, '#020100', 'rgba(' + O + ',.75)');
  box(x, sx - 11, v.y(DOOR_H), 22, DOOR_H, wall, 'rgba(' + O + ',.45)');
  x.fillStyle = 'rgba(' + C + ',.85)'; x.fillRect(sx + 6, v.y(28), 2, 6);
  box(x, sx - 30, v.y(DOOR_H + 18), 60, 12, '#04100f', 'rgba(' + C + ',.6)');
  text(x, label, sx - 2, v.y(DOOR_H + 12), 'rgba(' + C + ',.95)', 7, '600');
  tell(x, v.t, sx + 26, v.y(DOOR_H + 12));
}

/**
 * A person in silhouette, `h` tall (the player is 42), standing on screen y `base`.
 * `step` swings the legs for walkers. `rim` is a lighter edge so a figure never
 * vanishes into a dark wall.
 */
export function figure(x: CanvasRenderingContext2D, cx: number, base: number, h: number, fill: string, step = 0, rim?: string) {
  const u = h / 14, top = base - h, c = Math.round(cx);
  const hw = Math.round(u * 1.7), sw = Math.round(u * 3), lw = Math.max(1, Math.round(u * 1.2)), sp = Math.round(step * u);
  x.fillStyle = fill;
  x.fillRect(c - hw, Math.round(top), hw * 2, Math.round(u * 3.4));
  x.fillRect(c - sw, Math.round(top + u * 3.6), sw * 2, Math.round(u * 5.6));
  x.fillRect(c - sw + 1 + sp, Math.round(top + u * 9), lw, Math.round(u * 5));
  x.fillRect(c + sw - 1 - lw - sp, Math.round(top + u * 9), lw, Math.round(u * 5));
  if (rim) {
    x.fillStyle = rim;
    x.fillRect(c - hw, Math.round(top), hw * 2, 1);
    x.fillRect(c - sw, Math.round(top + u * 3.6), 1, Math.round(u * 5.6));
  }
}

/** A row of buildings for the far or middle band, laid out once. */
export interface Tower { x: number; w: number; h: number; lit: number[] }
export function towers(seed: number, span: number, w: [number, number], h: [number, number], lit: number): Tower[] {
  const r = rng(seed), list: Tower[] = [];
  for (let wx = -40; wx < span;) {
    const tw = Math.round(w[0] + r() * (w[1] - w[0])), th = Math.round(h[0] + r() * (h[1] - h[0])), cells: number[] = [];
    for (let yy = 6; yy < th - 6; yy += 7) for (let xx = 4; xx < tw - 4; xx += 6) if (r() < lit) cells.push(xx, yy);
    list.push({ x: wx, w: tw, h: th, lit: cells });
    wx += tw + 2 + Math.round(r() * 8);
  }
  return list;
}

/**
 * Draws a tower row standing on screen y `base`. Far rows: low `alpha`; middle rows: higher.
 * `grow` adds height to every tower (for taller views), repeating its windows downward, so a
 * tall screen sees more storeys rather than a stretched row.
 */
export function drawTowers(x: CanvasRenderingContext2D, v: View, list: Tower[], parallax: number, base: number, alpha: number, fill = '#040200', win = 2, grow = 0) {
  for (const b of list) {
    const sx = v.sx(b.x, parallax), h = b.h + grow, top = base - h;
    if (!onScreen(v, sx, b.w) || base < 0) continue;
    x.fillStyle = fill; x.fillRect(sx, top, b.w, h);
    x.strokeStyle = 'rgba(' + RUST + ',' + alpha + ')'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, b.w - 1, h);
    x.fillStyle = 'rgba(' + O + ',' + (alpha * 0.9 + 0.05) + ')';
    for (let k = 0; k * b.h < h; k++) {
      const off = top + k * b.h;
      if (off > v.viewH || off + b.h < 0) continue;
      // the windows follow the city's clock (light.ts windowLit): on one by one at dusk, some off after midnight
      for (let i = 0; i < b.lit.length; i += 2) if (b.lit[i + 1] + k * b.h < h - 4 && windowLit(b.x * 31 + i + k * 7)) x.fillRect(sx + b.lit[i], off + b.lit[i + 1], win, win);
    }
  }
}

/** A wet floor: the play band's ground line and faint streaks below it. */
export function wetFloor(x: CanvasRenderingContext2D, v: View, fill = '#030201') {
  x.fillStyle = fill; x.fillRect(0, v.gy, v.viewW, v.viewH - v.gy);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, v.gy, v.viewW, 1);
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,100,0,' + (0.12 - i * 0.022) + ')'; x.fillRect(0, v.gy + 6 + i * i * 2 + i * 4, v.viewW, 1); }
}

/** A light's reflection in the wet floor, straight below it. */
export function reflect(x: CanvasRenderingContext2D, v: View, sx: number, col: string, strength = 1, w = 12) {
  if (!onScreen(v, sx - w, w * 2)) return;
  for (let i = 0; i < 9; i++) {
    const wob = Math.sin(v.t * 0.05 + i + sx * 0.1) * 1.5;
    x.fillStyle = 'rgba(' + col + ',' + 0.1 * strength * (1 - i / 9) + ')';
    x.fillRect(Math.round(sx - w / 2 + wob), v.gy + 3 + i * 4, w, 3);
  }
}

/**
 * Scenes were laid out for a view about 320 tall (the ground 266 below its top).
 * Taller views must not show a void over them: every scene draws more structure
 * up to `v.gy` (the height of the view's top edge above the ground): storeys,
 * a vault, a skylight, a roof, more sky. Calmer and dimmer than the play band.
 */
export const DESIGN_TOP = 266;
