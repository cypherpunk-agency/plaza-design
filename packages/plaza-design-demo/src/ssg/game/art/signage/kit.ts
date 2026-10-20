/**
 * THE SIGN KIT: the shared drawing for every sign, plate, ticker and printed notice. Scenes and the
 * registered `sign.*` elements (kit-elements.ts) call these; no scene keeps its own copy.
 *
 *   plate       a backing plate bolted to a wall: glow on the wall, corner bolts (Downtown's plate)
 *   neonPlate   a plate with neon letters (or printed ones), horizontal or a vertical stack
 *   scroll      bare scrolling text in a strip: tickers, departure boards, the train's NEWS line
 *   paperSign   a board or official paper with printed lines, an optional red header and tell LED
 *   nameplate   a LINE 0 station name: the orange roundel and the name, on rods or the wall
 *   neon, sign, notice, tell   the core neon/notice primitives (art/core/primitives.ts)
 *
 * The screens (ads, slogans, registry, menus, odds, wanted, lottery), blades, hanging boards, icons,
 * billboards, cameras and taped notes live in screens.ts and use these. Colours keep their jobs
 * (ART-GUIDE §6): cyan only where something can be used; ambient signs speak paper, orange, red,
 * yellow or green.
 */
import type { View } from '../core/view';
import { box, mono, neon, O, onScreen, PAPER, RED, text } from '../core/primitives';
export { neon, sign, notice, tell, paperSign, type NeonOptions, type PaperSignOptions, type PaperLine } from '../core/primitives';

/** The warning red of shop, library, laundromat, warehouse and QA tickers. */
export const ALARM = '255,90,70';
/** The pink of the hacking layer's yard: used by the YARD blade only. */
export const MAGENTA = '255,61,242';

export interface PlateOptions {
  /** Plate colour (default Downtown's near-black). */
  fill?: string;
  /** Edge alpha of `col` (default .4). */
  edge?: number;
  /** Alpha of the glow on the wall around it; 0: no glow (default .1). */
  glow?: number;
  /** Four bolts in the corners (default true). */
  bolts?: boolean;
}
/** A backing plate bolted to a wall, centred on screen (cx, cy), with the glow it throws. */
export function plate(x: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, col: string, o: PlateOptions = {}) {
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), r = Math.max(w, h) * 0.75, glow = o.glow ?? 0.1;
  if (glow > 0) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(' + col + ',' + glow + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  box(x, x0, y0, w, h, o.fill ?? '#080403', 'rgba(' + col + ',' + (o.edge ?? 0.4) + ')');
  if (o.bolts === false) return;
  x.fillStyle = 'rgba(255,217,165,.45)';
  for (const [px, py] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) x.fillRect(px, py, 1, 1);
}

export interface NeonPlateSpec extends PlateOptions {
  text: string;
  /** RGB of the tube (and the plate's edge and glow). */
  col: string;
  size?: number;
  /** Plate size; default fits the letters. */
  w?: number; h?: number;
  phase?: number;
  /** A letter that has burnt out (index), -1 none. */
  dead?: number;
  vertical?: boolean;
  /** Only this letter lit (a test sweep). */
  lit?: number | null;
  /** Painted letters instead of tubes, in `ink` (default the tube colour at .9). */
  printed?: boolean;
  ink?: string;
  /** The street's slower flicker instead of Downtown's brighter tube. */
  street?: boolean;
}
/** The size a neon plate takes when none is given. */
export function neonPlateSize(s: Pick<NeonPlateSpec, 'text' | 'size' | 'vertical' | 'w' | 'h'>) {
  const size = s.size ?? 11, n = [...s.text].length;
  return s.vertical ? { w: s.w || size + 6, h: s.h || n * (size + 2) + 6 } : { w: s.w || Math.round(n * size * 0.64 + 12), h: s.h || size + 6 };
}
/** A plate with neon (or printed) letters, centred on screen (cx, cy). */
export function neonPlate(x: CanvasRenderingContext2D, t: number, cx: number, cy: number, s: NeonPlateSpec) {
  const size = s.size ?? 11, { w, h } = neonPlateSize(s), n = [...s.text].length;
  plate(x, cx, cy, w, h, s.col, s);
  if (s.printed) {
    x.save(); x.font = mono(size, '600'); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = s.ink ?? 'rgba(' + s.col + ',.9)'; x.fillText(s.text, cx, cy + 0.5); x.restore();
    return;
  }
  const top = s.vertical ? cy - (n - 1) * (size + 2) / 2 : cy;
  neon(x, t, s.text, cx, top, s.col, { size, phase: s.phase, dead: s.dead, vertical: s.vertical, lit: s.lit, bright: !s.street });
}

export interface ScrollOptions {
  col?: string; alpha?: number;
  /** Pixels per frame (60 a second). */
  speed?: number;
  size?: number; phase?: number;
  /** Strip height for the clip (default 12). */
  tall?: number;
}
/** Bare scrolling text through a strip `w` wide, centred on screen line `cy`. Repeats seamlessly. */
export function scroll(x: CanvasRenderingContext2D, t: number, msg: string, left: number, cy: number, w: number, o: ScrollOptions = {}) {
  const tall = o.tall ?? 12;
  x.save(); x.beginPath(); x.rect(left, cy - tall / 2, w, tall); x.clip();
  x.font = mono(o.size ?? 7, '600'); x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + (o.col ?? O) + ',' + (o.alpha ?? 0.8) + ')';
  const len = x.measureText(msg).width;
  if (len > 0) {
    const off = ((t * (o.speed ?? 0.5) + (o.phase ?? 0)) % len + len) % len;
    let at = left + w - off;
    while (at > left) at -= len;
    for (; at < left + w; at += len) x.fillText(msg, Math.round(at), cy);
  }
  x.restore();
}

/** The station's name on a plate: LINE 0's orange roundel, then the name. Hung on two rods from `roof` when given, else fixed to the wall. */
export function nameplate(x: CanvasRenderingContext2D, v: View, s: number, h: number, name: string, roof?: number, alpha = 0.92) {
  const { y } = v, w = 40 + name.length * 7;
  if (!onScreen(v, s - w / 2 - 4, w + 8)) return;
  if (roof !== undefined) { x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s - w / 2 + 12, y(roof), 1, roof - h); x.fillRect(s + w / 2 - 13, y(roof), 1, roof - h); }
  box(x, s - w / 2, y(h), w, 20, '#0e0a08', 'rgba(' + O + ',' + (0.75 * alpha) + ')');
  box(x, s - w / 2 + 3, y(h - 3), 16, 14, 'rgba(' + O + ',' + (0.85 * alpha) + ')');
  text(x, '0', s - w / 2 + 11, y(h - 10), '#0e0a08', 9, '700');
  text(x, name, s + 10, y(h - 10), 'rgba(' + PAPER + ',' + alpha + ')', 9, '600');
}

/** A red blinking recording light, 2×2 (screens, cameras). */
export function recLight(x: CanvasRenderingContext2D, t: number, px: number, py: number, phase = 0) {
  x.fillStyle = Math.floor((t + phase) / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(px, py, 2, 2);
}
