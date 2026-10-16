/**
 * Set piece (ART-GUIDE §8, §12; TIME.md "Light", "Sun, moon, shadows"): the light over a scene,
 * from the frame's `Light` (light.ts). Register: sets/index.ts (`lighting`).
 *
 * - **Grade** (`drawGrade`): one colour grade over the outdoor world by the sun's height and the
 *   weather: night stays the game's dark (a touch cool), dawn lifts gold, noon flat grey, dusk pink;
 *   cloud greys it, rain and storm darken. Two full-screen fills (screen, multiply): cheap.
 * - **The light layer** (`drawLights`): registered light sources (`SceneLight`: windows, neon,
 *   screens, street lamps, headlights), drawn additively after the grade: weak by day, full at
 *   night. Windows switch on by the clock (light.ts `windowLit`). A scene declares its lights as
 *   data (`SceneDef.lights`); anything that moves can add one for this frame (`addLight`).
 * - **Shadows A** (`castShadow`): long hard pixel shadows along the ground for people, robots,
 *   animals and props (`SceneDef.casters`): their length from the sun's height, their direction
 *   from its azimuth against the scene's facing; softer under cloud, none in rain; at night short
 *   ones away from the nearest street lamp. Always a contact shadow. characters.ts calls it for
 *   every person; the game for the player and the casters.
 * - **Shade C** (`drawShade`): buildings between the street and the sun (`SceneDef.shade`: the
 *   row behind you and the facades in front, with the gaps where light gets through) throw bands of
 *   shade across the floor and up the walls; whoever stands in one is drawn darker (the band is
 *   laid over them).
 *
 * Everything reads the frame's light (`light()`), so a scene only declares data. Phones: glows are
 * pre-rendered sprites (one per colour and size), shadows are single polygons.
 */

import { light, smooth, windowLit, type Light } from "../../world/light";
import type { View } from "../core/view";

// ---------- the grade ----------

type RGB = number[];
const mixc = (a: RGB, b: RGB, f: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const R = Math.round, clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** The grade for a light: a lift (screen) and a tint (multiply), each a colour and an alpha. */
export function gradeOf(l: Light): { lift: RGB; liftA: number; mul: RGB; mulA: number } {
  const twi = l.morning ? [150, 90, 50] : [150, 64, 92];
  let lift = mixc([86, 92, 104], twi, l.low);
  let liftA = l.daylight * (0.5 + 0.12 * l.low) * (1 - 0.25 * l.cover);
  // under cloud the light goes grey and flat; rain and storm darken
  if (l.cover > 0) lift = mixc(lift, [96, 98, 106], l.cover * 0.8);
  const w = l.w, wet = w ? Math.max(w.rain, w.storm) : 0;
  liftA *= 1 - 0.35 * wet;
  // the night: a cool multiply (moonlight bluer); a dark sky by day darkens a little too
  const mul = mixc([168, 176, 228], [140, 150, 170], 1 - l.night);
  const mulA = clamp(l.night * 0.42 + wet * 0.25 * l.daylight, 0, 0.6);
  return { lift, liftA, mul, mulA };
}

/**
 * The grade over the world drawn so far (the view's screen units). Outdoors only, unless `outside`:
 * an interior grades what its windows show (call it inside the window's clip).
 */
export function drawGrade(x: CanvasRenderingContext2D, v: View, l: Light = light(), outside = false) {
  if (!l.outdoor && !outside) return;
  const g = gradeOf(l);
  x.save();
  if (g.mulA > 0.01) { x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(' + g.mul.join(',') + ',' + g.mulA.toFixed(3) + ')'; x.fillRect(0, 0, v.viewW, v.viewH); }
  if (g.liftA > 0.01) { x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(' + g.lift.join(',') + ',' + g.liftA.toFixed(3) + ')'; x.fillRect(0, 0, v.viewW, v.viewH); }
  x.restore();
}

// ---------- the light layer ----------

/**
 * A light source in a scene (world x, height over the ground). Kinds:
 * - `lamp`: a street lamp's head at `h`: a glow, a pool on the ground; at night it throws short
 *   shadows away from itself.
 * - `window`: a window `w` × `hh` with its centre at `h`; on only when the clock says (`seed`).
 * - `neon` / `screen`: a glow of radius `r` round a sign or a screen.
 * - `head`: a headlight beam, pointing `dir` (1 right, -1 left), `r` long.
 * `col` is "r,g,b"; `a` scales it; `par` is the parallax of a far light (default 1).
 */
export interface SceneLight {
  x: number;
  h: number;
  kind: 'lamp' | 'window' | 'neon' | 'screen' | 'head';
  col?: string;
  r?: number;
  w?: number;
  hh?: number;
  a?: number;
  dir?: 1 | -1;
  seed?: number;
  par?: number;
}

const DEF_COL: Record<SceneLight['kind'], string> = { lamp: '255,214,150', window: '255,170,90', neon: '255,136,0', screen: '0,220,220', head: '255,240,210' };
const DEF_R: Record<SceneLight['kind'], number> = { lamp: 64, window: 22, neon: 40, screen: 26, head: 90 };

/** Moving lights for this frame (headlights, a torch): cleared after each draw. */
let EXTRA: SceneLight[] = [];
/** This frame's lamps (world x, head height), for night shadows. */
let LAMPS: [number, number][] = [];
/** Add a light for this frame only (a moving vehicle's headlights). */
export const addLight = (l: SceneLight) => { EXTRA.push(l); };

const SPRITES = new Map<string, HTMLCanvasElement>();
/** A soft round glow, `r` (rounded to 8) in colour `col`, pre-rendered once. */
function glowSprite(col: string, r: number): HTMLCanvasElement {
  const rr = Math.max(8, Math.round(r / 8) * 8), key = col + '|' + rr;
  let c = SPRITES.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = rr * 2;
  const x = c.getContext('2d')!, g = x.createRadialGradient(rr, rr, 0, rr, rr, rr);
  g.addColorStop(0, 'rgba(' + col + ',1)'); g.addColorStop(0.35, 'rgba(' + col + ',.42)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  x.fillStyle = g; x.fillRect(0, 0, rr * 2, rr * 2);
  SPRITES.set(key, c);
  return c;
}

/** Collect the scene's lamps for shadows (call before the scene's people are drawn). */
export function prepareLights(list: readonly SceneLight[] | undefined) {
  LAMPS = [];
  EXTRA = [];
  for (const s of list ?? []) if (s.kind === 'lamp') LAMPS.push([s.x, s.h]);
}

/** The light layer: every registered light, then this frame's extras; weak by day, full at night. */
export function drawLights(x: CanvasRenderingContext2D, v: View, list: readonly SceneLight[] | undefined, l: Light = light()) {
  const all = EXTRA.length ? [...(list ?? []), ...EXTRA] : list ?? [];
  EXTRA = [];
  const k = l.outdoor ? l.lamps : 0.75;
  if (!all.length || k < 0.02) return;
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const s of all) {
    const sx = v.sx(s.x, s.par ?? 1), r = s.r ?? DEF_R[s.kind], col = s.col ?? DEF_COL[s.kind];
    if (sx + r * 2 < 0 || sx - r * 2 > v.viewW) continue;
    if (s.kind === 'window' && s.seed !== undefined && !windowLit(s.seed, l)) continue;
    const a = (s.a ?? 1) * k, cy = v.y(s.h);
    if (s.kind === 'head') {
      const d = s.dir ?? 1, g = x.createLinearGradient(sx, 0, sx + d * r, 0);
      g.addColorStop(0, 'rgba(' + col + ',' + (0.22 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(sx, cy - 2); x.lineTo(sx + d * r, cy - r * 0.18); x.lineTo(sx + d * r, v.y(0) + 4); x.lineTo(sx, cy + 2); x.closePath(); x.fill();
      x.globalAlpha = Math.min(1, 0.5 * a); x.drawImage(glowSprite(col, 10), sx - 10, cy - 10, 20, 20); x.globalAlpha = 1;
      continue;
    }
    if (s.kind === 'window') {
      const w = s.w ?? 12, hh = s.hh ?? 20;
      x.globalAlpha = Math.min(1, 0.32 * a); x.drawImage(glowSprite(col, r), sx - r - w / 2, cy - r - hh / 2, r * 2 + w, r * 2 + hh); x.globalAlpha = 1;
      continue;
    }
    x.globalAlpha = Math.min(1, (s.kind === 'lamp' ? 0.42 : 0.3) * a);
    x.drawImage(glowSprite(col, r), sx - r, cy - r, r * 2, r * 2);
    if (s.kind === 'lamp') {
      // the pool on the ground under it, flattened
      const pw = r * 1.3, gy = v.y(0);
      x.globalAlpha = Math.min(1, 0.36 * a);
      x.drawImage(glowSprite(col, r), sx - pw, gy - pw * 0.12, pw * 2, pw * 0.5);
    }
    x.globalAlpha = 1;
  }
  x.restore();
}

// ---------- shadows (A) ----------

/** How dark a cast shadow is now (0 none), and the contact shadow's. */
function shadowStrength(l: Light) {
  const sunA = l.outdoor ? 0.5 * l.direct * (1 - smooth(4, 7.5, l.shadow.len) * 0.4) : 0;
  return sunA;
}

/**
 * A shadow on the ground for something standing at world x `wx`, `h` tall and `w` wide, its feet
 * `foot` over the ground (a bench, a counter: the shadow lies there). `dim` for back-band figures.
 * Draws the contact shadow always; the cast shadow outdoors in sun (or at night near a lamp).
 */
export function castShadow(x: CanvasRenderingContext2D, v: View, wx: number, h: number, w: number, foot = 0, par = 1, dim = 0) {
  if (!SHADOWS) return;
  const l = light(), sx = v.sx(wx, par), gy = Math.round(v.y(foot));
  if (sx < -300 || sx > v.viewW + 300) return;
  const k = 1 - dim * 0.7;
  const sunA = shadowStrength(l) * k;
  if (sunA > 0.02 && foot < 60 && !(foot < 4 && inShade(wx))) {
    const s = l.shadow, len = h * Math.min(s.len, 7);
    const dx = (s.dx / Math.max(0.001, s.len)) * len, dy = clamp((s.dy / Math.max(0.001, s.len)) * len * 0.08, -3, 8);
    const a = sunA * (1 - smooth(120, 300, Math.abs(dx)) * 0.45);
    x.fillStyle = 'rgba(8,4,16,' + a.toFixed(3) + ')';
    x.beginPath(); x.moveTo(R(sx - w / 2), gy); x.lineTo(R(sx + w / 2), gy); x.lineTo(R(sx + w / 2 + dx), R(gy + dy + 2)); x.lineTo(R(sx - w / 2 + dx), R(gy + dy + 2)); x.closePath(); x.fill();
  } else if (l.outdoor && l.lamps > 0.5 && LAMPS.length && foot < 40) {
    // at night: a short shadow away from the nearest lamp
    let best = 1e9, lx = 0;
    for (const [px] of LAMPS) { const d = Math.abs(px - wx); if (d < best) { best = d; lx = px; } }
    if (best < 110) {
      const dir = wx >= lx ? 1 : -1, len = clamp(best * 0.22, 3, 16), a = 0.38 * k * (1 - best / 110) * smooth(0.5, 0.9, l.lamps);
      x.fillStyle = 'rgba(6,3,12,' + a.toFixed(3) + ')';
      x.beginPath(); x.moveTo(R(sx - w / 2), gy); x.lineTo(R(sx + w / 2), gy); x.lineTo(R(sx + w / 2 + dir * len), gy + 2); x.lineTo(R(sx - w / 2 + dir * len), gy + 2); x.closePath(); x.fill();
    }
  }
  // contact: a dark patch right under it, always (darker under a grey sky: no hard shadow to take over)
  const ca = (0.42 + 0.12 * l.cover) * k;
  x.fillStyle = 'rgba(8,4,16,' + ca.toFixed(3) + ')'; x.fillRect(R(sx - w / 2 - 1), gy, R(w + 2), 1);
  x.fillStyle = 'rgba(8,4,16,' + (ca * 0.5).toFixed(3) + ')'; x.fillRect(R(sx - w / 2 - 3), gy + 1, R(w + 6), 1);
}

let SHADOWS = false;
/** The game turns shadows on while it draws a scene (cutscenes and the title draw people without them). */
export const shadowsOn = (on: boolean) => { SHADOWS = on; };

/** A key prop's shadow (`SceneDef.casters`): world x of its centre, height, width, feet height. */
export interface Caster { x: number; h: number; w: number; foot?: number }

/** The casters' shadows (call after the backdrop, before the people are on top). */
export function drawCasters(x: CanvasRenderingContext2D, v: View, list: readonly Caster[] | undefined) {
  if (!list?.length) return;
  for (const c of list) castShadow(x, v, c.x, c.h, c.w, c.foot ?? 0);
}

// ---------- shade (C) ----------

/** A row of buildings throwing shade: how tall, and the gaps between them (world x) where light gets through. */
export interface ShadeSide { h: number; gaps?: [number, number][] }
/**
 * What shades a scene's street: the buildings `back` (behind you, off the picture) and `front`
 * (the facades you look at, the sun behind them), and how deep the floor is from the facades to
 * you (`depth`, world units; default 60). `width`: the scene's.
 */
export interface Shade { back?: ShadeSide; front?: ShadeSide; depth?: number }

interface Band { s0: number; s1: number; d0: number; d1: number; climb: number; drift: number; back: boolean; lit?: boolean }
/** This frame's shade: the bands, their darkness, the floor's depth, and the shaded stretches of the play line (world x). */
let SHADE: { bands: Band[]; a: number; D: number; line: [number, number][]; sun: string } = { bands: [], a: 0, D: 60, line: [], sun: '' };

/** Work out this frame's shade bands (call once a frame, before anything casts a shadow). */
export function prepareShade(s: Shade | undefined, width: number, l: Light = light()) {
  SHADE = { bands: [], a: 0, D: s?.depth ?? 60, line: [], sun: l.sunCol };
  if (!s || !l.outdoor || l.direct < 0.05) return;
  const relR = (l.sunRel * Math.PI) / 180, cosr = Math.cos(relR), sinr = Math.sin(relR);
  const side = cosr > 0 ? s.front : s.back;
  if (!side || Math.abs(cosr) < 0.08) return;
  const ang = Math.max(0.05, l.sun.el * 1.2), D = SHADE.D;
  // how far across the street the shade reaches (world units of depth)
  const reach = (side.h / Math.tan(ang)) * Math.abs(cosr);
  const a = (cosr > 0 ? 0.28 : 0.36) * l.direct * (1 - smooth(0.2, 0.7, l.cover));
  if (a < 0.02 || reach < 4) return;
  // sideways drift per unit of depth, away from the sun
  const drift = clamp(-sinr / Math.abs(cosr), -3, 3), back = cosr < 0;
  // the buildings are the spans between the gaps
  const gaps = [...(side.gaps ?? [])].sort((p, q) => p[0] - q[0]);
  const spans: [number, number][] = [];
  let at = -400;
  for (const [g0, g1] of gaps) { if (g0 > at) spans.push([at, g0]); at = Math.max(at, g1); }
  spans.push([at, width + 400]);
  SHADE.a = a;
  for (const [s0, s1] of spans) {
    // back: the shade starts at you (depth D) and reaches toward the facades, climbing them when the sun is low;
    // front: the facades shade themselves and the street from their foot toward you
    const d0 = back ? Math.max(0, D - reach) : 0, d1 = back ? D : Math.min(D, reach);
    const climb = back ? (reach > D ? side.h * (1 - D / reach) : 0) : side.h;
    SHADE.bands.push({ s0, s1, d0, d1, climb, drift, back });
    if (d0 === 0) { const o = back ? D * drift : 0; SHADE.line.push([s0 + o, s1 + o]); }
  }
  // and where the light gets through between them: warm stripes over the same ground (the contrast that makes the shade read)
  for (const [g0, g1] of gaps) {
    const d0 = back ? Math.max(0, D - reach) : 0, d1 = back ? D : Math.min(D, reach);
    SHADE.bands.push({ s0: g0, s1: g1, d0, d1, climb: back && reach > D ? side.h * (1 - D / reach) : 0, drift, back, lit: true });
  }
}

/** Is the play line in shade at world x (no sun on it: no cast shadow there)? */
export const inShade = (wx: number) => SHADE.line.some(([a, b]) => wx > a && wx < b);

/** Bands of shade across the floor and up the walls (after the people and the player: it darkens them). */
export function drawShade(x: CanvasRenderingContext2D, v: View) {
  const { bands, a, D } = SHADE;
  if (!bands.length) return;
  const floorH = v.viewH - v.y(0), gy = v.y(0), py = (d: number) => gy + (d / D) * floorH;
  const dark = 'rgba(10,6,24,' + a.toFixed(3) + ')', sun = 'rgba(' + SHADE.sun + ',' + (a * 0.42).toFixed(3) + ')';
  for (const b of bands) {
    x.fillStyle = b.lit ? sun : dark;
    x.globalCompositeOperation = b.lit ? 'screen' : 'source-over';
    const ox = (d: number) => (b.back ? D - d : d) * b.drift;
    const a0 = v.sx(b.s0), a1 = v.sx(b.s1), reachX = Math.abs(b.drift) * D;
    if (Math.max(a0, a1) + reachX < -10 || Math.min(a0, a1) - reachX > v.viewW + 10) continue;
    x.beginPath();
    x.moveTo(R(a0 + ox(b.d1)), R(py(b.d1))); x.lineTo(R(a1 + ox(b.d1)), R(py(b.d1)));
    x.lineTo(R(a1 + ox(b.d0)), R(py(b.d0))); x.lineTo(R(a0 + ox(b.d0)), R(py(b.d0)));
    x.closePath(); x.fill();
    if (b.climb > 0 && b.d0 === 0) {
      const top = Math.max(0, R(v.y(b.climb))), b0 = R(a0 + ox(0)), b1 = R(a1 + ox(0));
      x.fillRect(Math.max(-10, Math.min(b0, b1)), top, Math.min(v.viewW + 20, Math.abs(b1 - b0)), R(gy) - top);
    }
  }
  x.globalCompositeOperation = 'source-over';
}
