/**
 * BUILDING KIT parts: the drawing bodies every building exterior shares. Each one is coordinate-free:
 * it takes canvas positions (or a `y(h)` mapper for heights) so a scene that draws in screen space
 * (Downtown's street, the Market facades, the fixer's yard) and the kit's own fronts, which draw in a
 * building's frame (origin at its foot, `y = -h`), call the same code. These bodies were moved here
 * from `assemblies/downtown.ts`, `assemblies/construction.ts` and `assemblies/fixer-yard.ts`; their
 * old callers now call them with the arguments they always used, so those scenes look as before.
 *
 * Window and bay kinds, roofs, skins and the procedural front are in `front.ts`; the registered
 * elements are in `elements.ts`.
 */
import { windowLit, type Light } from '../../world/light';
import { glass } from '../environment/sky';
import { box } from '../core/primitives';

/** The trim colour (r,g,b) the parts draw rims, courses and bands in: Downtown's rust by default; a front sets its own while it paints. */
export let TRIM = '194,65,12';
export const setTrim = (rgb: string) => { const was = TRIM; TRIM = rgb; return was; };

type Y = (h: number) => number;
const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';

// ---------- windows ----------

/**
 * Downtown's storey window: a 14 x 28 frame with a transom and mullion, its sill, an optional AC box
 * under it. `light` < 0 is dark (the pane reflects the sky by day), 0..1 a warm room (blinds when dim),
 * >= 1 a TV's blue. A room light follows the city clock (`windowLit`). Returns the light after the
 * clock, so the caller can add the window to the frame's light layer.
 */
export function framedWindow(x: CanvasRenderingContext2D, wx: number, wy: number, light: number, ac: boolean, seed: number, t: number, lighting: Light): number {
  x.fillStyle = '#040201'; x.fillRect(wx, wy, 14, 28);
  // the room's light follows the clock (on at dusk, off after midnight); a dark pane reflects the sky by day
  if (light >= 0 && !windowLit(seed, lighting)) light = -1;
  if (light < 0) { const [gc, ga] = glass(lighting); if (ga > 0.02) { x.fillStyle = 'rgba(' + gc + ',' + ga.toFixed(3) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26); } }
  if (light >= 1) {
    x.fillStyle = 'rgba(150,170,220,' + (0.1 + 0.06 * Math.sin(t * 0.05 + light * 3)) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
  } else if (light >= 0) {
    x.fillStyle = 'rgba(255,136,0,' + (0.1 + 0.18 * light) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
    if (light < 0.35) { x.fillStyle = 'rgba(0,0,0,.4)'; for (let b = 3; b < 27; b += 3) x.fillRect(wx + 1, wy + b, 12, 1); }
  }
  x.fillStyle = '#0a0503'; x.fillRect(wx, wy + 11, 14, 1); x.fillRect(wx + 7, wy, 1, 28);
  x.strokeStyle = 'rgba(' + TRIM + ',.35)'; x.strokeRect(wx + 0.5, wy + 0.5, 13, 27);
  x.fillStyle = 'rgba(' + TRIM + ',.5)'; x.fillRect(wx - 1, wy + 28, 16, 2);
  if (ac) { x.fillStyle = '#16110d'; x.fillRect(wx + 2, wy + 31, 10, 6); x.strokeStyle = 'rgba(' + TRIM + ',.4)'; x.strokeRect(wx + 2.5, wy + 31.5, 9, 5); }
  return light;
}

/** Tenement window states: 0 dark, 1 lit curtain, 2 TV flicker, 3 someone at the window, 4 blinds. */
export type TenementState = 0 | 1 | 2 | 3 | 4;
/** The Market tenement's window (any size) and its sill; `a` is the band's strength (.4–.55 midground, 1 play). */
export function tenementWindow(x: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, state: number, col: string, a: number, t: number, phase: number) {
  if (state === 0) { box(x, wx, wy, ww, wh, '#030201', rgba('194,65,12', 0.3 * a)); }
  else if (state === 2) { const fl = 0.25 + 0.2 * Math.sin(t * 0.3 + phase) * Math.sin(t * 0.07); box(x, wx, wy, ww, wh, 'rgba(170,190,230,' + fl * a + ')', rgba('194,65,12', 0.3 * a)); }
  else {
    box(x, wx, wy, ww, wh, rgba(col, 0.22 * a + 0.05), rgba('194,65,12', 0.35 * a));
    if (state === 4) for (let b = 2; b < wh; b += 3) { x.fillStyle = rgba('0,0,0', 0.35); x.fillRect(wx + 1, wy + b, ww - 2, 1); }
    if (state === 3) { x.fillStyle = 'rgba(8,4,2,.85)'; x.fillRect(wx + ww / 2 - 2, wy + wh - 11, 5, 4); x.fillRect(wx + ww / 2 - 4, wy + wh - 7, 9, 7); }
    x.fillStyle = rgba(col, 0.35 * a); x.fillRect(wx + 1, wy + 1, 3, wh - 2);
  }
  x.fillStyle = rgba('194,65,12', 0.3 * a); x.fillRect(wx - 1, wy + wh, ww + 2, 2);
}

/** A small window AC box hung under a sill (`sill` is the sill's canvas y), dripping now and then. */
export function sillAc(x: CanvasRenderingContext2D, wx: number, sill: number, a: number, t: number, phase: number) {
  box(x, wx + 1, sill + 3, 10, 7, '#2a2622', rgba('200,170,140', 0.4 * a));
  x.fillStyle = rgba('0,0,0', 0.5); x.fillRect(wx + 3, sill + 5, 6, 1); x.fillRect(wx + 3, sill + 7, 6, 1);
  const d = (t * 0.8 + phase * 7) % 60; if (d < 40) { x.fillStyle = rgba('170,210,255', 0.35 * a); x.fillRect(wx + 9, sill + 10 + d, 1, 2); }
}

/**
 * A plain punched opening (new with the kit): a dark reveal, the sky on the glass by day, a warm room
 * or a TV at night, a lintel and a sill. Returns the light after the clock (as `framedWindow`).
 */
export function punchedWindow(x: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, light: number, seed: number, t: number, lighting: Light): number {
  if (light >= 0 && !windowLit(seed, lighting)) light = -1;
  x.fillStyle = '#050302'; x.fillRect(wx, wy, ww, wh);
  if (light < 0) { const [gc, ga] = glass(lighting); if (ga > 0.02) { x.fillStyle = 'rgba(' + gc + ',' + ga.toFixed(3) + ')'; x.fillRect(wx + 1, wy + 2, ww - 2, wh - 3); } }
  else if (light >= 1) { x.fillStyle = 'rgba(150,170,220,' + (0.12 + 0.07 * Math.sin(t * 0.05 + seed)) + ')'; x.fillRect(wx + 1, wy + 2, ww - 2, wh - 3); }
  else { x.fillStyle = 'rgba(255,150,70,' + (0.14 + 0.2 * light) + ')'; x.fillRect(wx + 1, wy + 2, ww - 2, wh - 3); x.fillStyle = 'rgba(40,18,10,.45)'; x.fillRect(wx + 1, wy + 2, ww - 2, Math.round(wh * 0.3)); }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(wx, wy, ww, 2);
  x.fillStyle = 'rgba(' + TRIM + ',.4)'; x.fillRect(wx - 2, wy - 2, ww + 4, 1); x.fillRect(wx - 1, wy + wh, ww + 2, 2);
  return light;
}

// ---------- ground floor ----------

export type BayKind = 'door' | 'glass' | 'shutter' | 'sealed';
/** Downtown's ground-floor openings: a lit shop window under its awning, a rolled shutter, a door on a step, a sealed door. */
export function bay(x: CanvasRenderingContext2D, y: Y, bx: number, w: number, kind: BayKind) {
  if (kind === 'glass') {
    // A lit shop interior behind glass: shelves, goods, a reflection; an awning above.
    x.fillStyle = '#120904'; x.fillRect(bx, y(6), w, 6);
    x.fillStyle = 'rgba(255,136,0,.1)'; x.fillRect(bx, y(54), w, 48);
    x.fillStyle = 'rgba(255,170,60,.18)'; x.fillRect(bx + 3, y(20), w - 6, 1); x.fillRect(bx + 3, y(36), w - 6, 1);
    for (let gx = bx + 4, j = 0; gx < bx + w - 6; gx += 7, j++) {
      x.fillStyle = j % 3 ? 'rgba(255,170,60,.22)' : 'rgba(255,217,165,.3)';
      x.fillRect(gx, y(26 + (j % 2) * 2), 4, 6 + (j % 2) * 2); x.fillRect(gx + 1, y(43), 3, 7);
    }
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(bx + 6, y(50)); x.lineTo(bx + 20, y(10)); x.stroke();
    x.fillStyle = 'rgba(255,136,0,.45)';
    for (let m = bx + 28; m < bx + w - 10; m += 28) x.fillRect(m, y(54), 1, 48);
    x.strokeStyle = 'rgba(255,136,0,.45)'; x.strokeRect(bx + 0.5, y(54) + 0.5, w - 1, 47);
    for (let ax = bx - 3, j = 0; ax < bx + w + 3; ax += 6, j++) {
      x.fillStyle = j % 2 ? 'rgba(255,136,0,.3)' : '#120800'; x.fillRect(ax, y(62), Math.min(6, bx + w + 3 - ax), 5);
    }
  } else if (kind === 'shutter') {
    // A rolled-down shutter under its housing.
    x.fillStyle = '#100a06'; x.fillRect(bx, y(48), w, 48);
    x.fillStyle = 'rgba(255,136,0,.1)'; for (let h = 3; h < 48; h += 3) x.fillRect(bx, y(h), w, 1);
    x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx, y(2), w, 2);
    x.fillStyle = '#1a0f08'; x.fillRect(bx - 2, y(54), w + 4, 6);
    x.strokeStyle = 'rgba(' + TRIM + ',.5)'; x.strokeRect(bx - 1.5, y(54) + 0.5, w + 3, 5);
  } else {
    // A door on a step. The sealed one (the penthouse) has no handle and no glass.
    x.fillStyle = '#1a0d05'; x.fillRect(bx - 3, y(3), w + 6, 3);
    x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx - 3, y(3), w + 6, 1);
    x.fillStyle = '#050201'; x.fillRect(bx, y(52), w, 49);
    x.strokeStyle = 'rgba(255,136,0,.5)'; x.strokeRect(bx + 0.5, y(52) + 0.5, w - 1, 48);
    if (kind === 'door') {
      x.fillStyle = 'rgba(255,136,0,.22)'; x.fillRect(bx + 6, y(46), w - 12, 12);
      x.fillStyle = 'rgba(255,217,165,.7)'; x.fillRect(bx + w - 6, y(28), 2, 4);
      x.fillStyle = 'rgba(255,200,120,.85)'; x.fillRect(bx + Math.floor(w / 2) - 1, y(57), 3, 2);
    } else {
      x.fillStyle = 'rgba(' + TRIM + ',.45)'; x.fillRect(bx + Math.floor(w / 2), y(50), 1, 46);
      x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(bx + w + 3, y(36), 8, 6);
    }
  }
}

/** The Market tenement's street shutter (36 high from `base`), slats, maybe a tag. */
export function streetShutter(x: CanvasRenderingContext2D, y: Y, sx0: number, base: number, sw: number, a: number, tagged: boolean) {
  box(x, sx0, y(base + 36), sw, 36, '#1a1612', rgba('194,65,12', 0.4 * a));
  for (let k = 3; k < 36; k += 3) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(sx0 + 1, y(base + 36) + k, sw - 2, 1); }
  if (tagged) tag(x, y, sx0, base, a);
}
/** A sprayed tag on a shutter or wall (its left at `sx0`, from `base` up). */
export function tag(x: CanvasRenderingContext2D, y: Y, sx0: number, base: number, a: number) {
  x.strokeStyle = 'rgba(214,170,60,' + 0.35 * a + ')'; x.beginPath(); x.moveTo(sx0 + 8, y(base + 14)); x.bezierCurveTo(sx0 + 18, y(base + 30), sx0 + 26, y(base + 4), sx0 + 40, y(base + 20)); x.stroke();
}

// ---------- wall body and trim (Downtown's street wall) ----------

/** Thin storey bands across a wall from `ground` up every `storey`, below the visible height `hv`. */
export function storeyBands(x: CanvasRenderingContext2D, y: Y, sx: number, w: number, h: number, hv: number, ground: number, storey: number) {
  const storeys = Math.floor((h - ground) / storey);
  x.fillStyle = 'rgba(' + TRIM + ',.22)';
  for (let s = 0; s < storeys; s++) { const hh = ground + s * storey; if (hh < hv) x.fillRect(sx + 1, y(hh) - 1, w - 2, 2); }
}
/** The climbable annex's bright roof edge and rim, so it reads as somewhere to stand. */
export function ledgeEdge(x: CanvasRenderingContext2D, sx: number, top: number, w: number, hv: number) {
  x.strokeStyle = 'rgba(255,136,0,.75)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, w - 1, hv);
  x.fillStyle = 'rgba(255,136,0,.8)'; x.fillRect(sx, top, w, 2);
}
/** A slab cornice standing out 2 units each side at the wall's top. */
export function cornice(x: CanvasRenderingContext2D, sx: number, top: number, w: number) {
  x.fillStyle = '#140a05'; x.fillRect(sx - 2, top, w + 4, 4);
  x.fillStyle = 'rgba(' + TRIM + ',.5)'; x.fillRect(sx - 2, top, w + 4, 1);
}
/** The shop fascia band under the first floor (`ground` is the first floor's height). */
export function fascia(x: CanvasRenderingContext2D, y: Y, sx: number, w: number, ground: number) {
  x.fillStyle = '#100804'; x.fillRect(sx + 1, y(ground) + 1, w - 2, 11);
  x.fillStyle = 'rgba(' + TRIM + ',.35)'; x.fillRect(sx + 1, y(ground - 12), w - 2, 1);
}

/**
 * A wall's material between canvas rows `top` and `bottom`, from `l` to `r`: brick courses every 4 with
 * a few patches of joints (`patches`: their top-left corners), or cast concrete with panel seams
 * (`seamY`: canvas rows, `seamX`: canvas columns). From the fixer's yard.
 */
export function wallTexture(x: CanvasRenderingContext2D, brick: boolean, l: number, r: number, top: number, bottom: number, patches: readonly [number, number][], seamY: readonly number[], seamX: readonly number[]) {
  if (brick) {
    x.fillStyle = 'rgba(' + TRIM + ',.07)';
    for (let yy = top + 4; yy < bottom; yy += 4) x.fillRect(l, yy, r - l, 1);
    // joints only in a few patches, so the wall stays calm
    x.fillStyle = 'rgba(' + TRIM + ',.13)';
    for (const [px, py] of patches) for (let row = 0; row < 4; row++) for (let jx = (row % 2) * 4; jx < 28; jx += 8) x.fillRect(px + jx, py + row * 4 + 1, 1, 3);
  } else {
    // cast concrete: panel seams
    x.fillStyle = 'rgba(255,217,165,.04)';
    for (const sy of seamY) x.fillRect(l, sy, r - l, 1);
    for (const sx of seamX) x.fillRect(sx, top, 1, bottom - top);
  }
}

// ---------- attachments ----------

/** A wall AC unit (14 x 10) centred on `c`, its bottom at height `h`, with a damp stain under it. From the yard. */
export function acUnit(x: CanvasRenderingContext2D, y: Y, c: number, h: number) {
  x.fillStyle = '#140a04'; x.fillRect(c - 7, y(h + 10), 14, 10); x.strokeStyle = 'rgba(' + TRIM + ',.5)'; x.strokeRect(c - 6.5, y(h + 10) + 0.5, 13, 9);
  x.fillStyle = 'rgba(' + TRIM + ',.3)'; for (let k = -4; k <= 4; k += 3) x.fillRect(c + k, y(h + 8), 1, 6);
  x.fillStyle = 'rgba(' + TRIM + ',.08)'; x.fillRect(c - 1, y(h), 2, 18);
}

/**
 * A fire escape at play scale (from the yard): landings `storey` apart from height `from` while
 * `y(h + 10)` stays at or below canvas row `stop`, railings, stairs between landings, and a drop
 * ladder under the first landing. `at(dx)` maps an offset from the escape's left edge to canvas x;
 * `w` is its width, `ladder` the ladder's offset.
 */
export function fireEscape(x: CanvasRenderingContext2D, at: (dx: number) => number, y: Y, w: number, from: number, storey: number, stop: number, ladder: number) {
  x.lineWidth = 1;
  for (let h = from, i = 0; y(h + 10) >= stop; h += storey, i++) {
    const l = at(0);
    x.fillStyle = 'rgba(' + TRIM + ',.7)'; x.fillRect(l, y(h), w, 2);
    x.fillStyle = 'rgba(' + TRIM + ',.4)'; x.fillRect(l, y(h + 10), w, 1);
    for (let xx = 0; xx <= w; xx += 6) x.fillRect(l + xx, y(h + 10), 1, 10);
    if (y(h + storey + 10) >= stop) {
      const a = i % 2 ? 10 : w - 10, b = i % 2 ? 48 : w - 48;
      x.strokeStyle = 'rgba(' + TRIM + ',.5)'; x.beginPath(); x.moveTo(at(a) + 0.5, y(h)); x.lineTo(at(b) + 0.5, y(h + storey)); x.stroke();
    }
  }
  x.fillStyle = 'rgba(' + TRIM + ',.45)';
  x.fillRect(at(ladder), y(from), 1, 34); x.fillRect(at(ladder + 5), y(from), 1, 34);
  for (let h = from - 32; h < from; h += 5) x.fillRect(at(ladder), y(h), 6, 1);
}

/** The Market tenement's thin fire escape: a zigzag of landings and stairs from `from` up past the top. */
export function escapeZigzag(x: CanvasRenderingContext2D, y: Y, ex: number, from: number, st: number, a: number) {
  x.strokeStyle = rgba('150,100,60', 0.45 * a); x.beginPath();
  for (let h = from; y(h) > -st; h += st) { x.moveTo(ex, y(h)); x.lineTo(ex + 34, y(h)); x.moveTo(ex + 2, y(h)); x.lineTo(ex + 30, y(h + st)); }
  x.stroke();
}

/** The Market tenement's balcony: a 46-wide rail at canvas row `by`, a line of laundry (`laundry` colours, rotated by `k`). */
export function laundryBalcony(x: CanvasRenderingContext2D, bx: number, by: number, a: number, laundry: readonly string[], k: number) {
  x.fillStyle = rgba('150,100,60', 0.5 * a); x.fillRect(bx, by, 46, 2);
  for (let i = 0; i <= 46; i += 4) x.fillRect(bx + i, by - 10, 1, 10);
  x.fillRect(bx, by - 10, 46, 1);
  x.strokeStyle = rgba('200,170,140', 0.3 * a); x.beginPath(); x.moveTo(bx + 2, by - 16); x.lineTo(bx + 44, by - 15); x.stroke();
  for (let i = 0; i < 4; i++) { x.fillStyle = laundry[(i + k) % laundry.length]; x.globalAlpha = 0.35 * a + 0.1; x.fillRect(bx + 5 + i * 10, by - 15, 6, 6 + (i % 2) * 3); x.globalAlpha = 1; }
}

/** A drain or gas pipe up a wall between canvas rows `top` and `bottom`, with a bracket every 40. */
export function wallPipe(x: CanvasRenderingContext2D, px: number, top: number, bottom: number, col = '150,110,70') {
  x.fillStyle = 'rgba(' + col + ',.45)'; x.fillRect(px, top, 3, bottom - top);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 2, top, 1, bottom - top);
  x.fillStyle = 'rgba(' + col + ',.7)'; for (let yy = bottom - 30; yy > top + 4; yy -= 40) x.fillRect(px - 1, yy, 5, 2);
}

/**
 * Retrofit cabling: a bundle of `n` cables run along a wall at canvas row `cy` from `l` to `r`, sagging
 * between clips every `span`, with a junction box at `riser` and a riser cable up to `riserTop`.
 */
export function conduit(x: CanvasRenderingContext2D, l: number, r: number, cy: number, n: number, span: number, riser: number, riserTop: number, seed: number) {
  const cols = ['30,24,22', '40,30,24', '24,20,26', '60,34,20'];
  for (let k = 0; k < n; k++) {
    x.strokeStyle = 'rgba(' + cols[(seed + k) % cols.length] + ',.95)'; x.lineWidth = 1; x.beginPath();
    for (let a = l; a < r; a += span) { const b = Math.min(r, a + span), sag = 2 + ((seed + k + a) % 3); x.moveTo(a, cy + k * 2); x.quadraticCurveTo((a + b) / 2, cy + k * 2 + sag, b, cy + k * 2); }
    x.stroke();
  }
  x.fillStyle = 'rgba(' + TRIM + ',.55)'; for (let a = l; a <= r; a += span) x.fillRect(Math.round(a) - 1, cy - 1, 3, n * 2 + 1);
  x.fillStyle = 'rgba(255,170,90,.18)'; x.fillRect(l, cy, r - l, 1);
  if (riser > l && riser < r && riserTop < cy) {
    x.fillStyle = 'rgba(30,24,22,.95)'; x.fillRect(riser, riserTop, 2, cy - riserTop);
    box(x, riser - 4, cy - 6, 10, 8, '#16100c', 'rgba(' + TRIM + ',.6)');
    x.fillStyle = 'rgba(255,190,60,.8)'; x.fillRect(riser - 2, cy - 4, 1, 1);
  }
}

/**
 * An ID scanner bolted beside a door: a small dark box with a red reading LED and a paper notice.
 * Red, not cyan: it is not for you (ART-GUIDE §6). `cx`, `cy` canvas centre.
 */
export function doorScanner(x: CanvasRenderingContext2D, cx: number, cy: number, t: number, phase: number) {
  box(x, cx - 3, cy - 5, 7, 10, '#0c0a0c', 'rgba(200,190,180,.45)');
  x.fillStyle = 'rgba(255,42,68,' + ((t + phase) % 90 < 60 ? 0.95 : 0.3) + ')'; x.fillRect(cx - 1, cy - 3, 3, 1);
  x.fillStyle = 'rgba(30,30,34,.9)'; x.fillRect(cx - 2, cy, 5, 3);
  x.fillStyle = 'rgba(255,217,165,.4)'; x.fillRect(cx - 3, cy + 7, 7, 4);
}

/** A planter box on a sill or balcony: a trough and a few leaves. */
export function planter(x: CanvasRenderingContext2D, px: number, py: number, w: number, seed: number) {
  box(x, px, py - 4, w, 4, '#2a1a10', 'rgba(255,170,90,.35)');
  for (let k = 1; k < w - 1; k += 3) { x.fillStyle = (seed + k) % 2 ? 'rgba(70,120,60,.75)' : 'rgba(50,90,50,.75)'; x.fillRect(px + k, py - 6 - ((seed + k) % 3), 2, 3 + ((seed + k) % 3)); }
}

/** A roof water tank on legs (`cx` centre, `base` canvas row of the roof). */
export function roofTank(x: CanvasRenderingContext2D, cx: number, base: number, w: number, fill: string) {
  const h = Math.round(w * 0.9), l = Math.round(cx - w / 2);
  x.fillStyle = fill; x.fillRect(l + 2, base - 10, 2, 10); x.fillRect(l + w - 4, base - 10, 2, 10);
  box(x, l, base - 10 - h, w, h, fill, 'rgba(' + TRIM + ',.5)');
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 4; k < h; k += 5) x.fillRect(l + 1, base - 10 - h + k, w - 2, 1);
  x.fillStyle = fill; x.beginPath(); x.moveTo(l - 1, base - 10 - h); x.lineTo(cx, base - 16 - h); x.lineTo(l + w + 1, base - 10 - h); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + TRIM + ',.5)'; x.stroke();
}
/** A roof vent stack with its cap. */
export function roofVent(x: CanvasRenderingContext2D, cx: number, base: number, h: number, fill: string) {
  box(x, cx - 3, base - h, 6, h, fill, 'rgba(' + TRIM + ',.45)');
  box(x, cx - 5, base - h - 3, 10, 3, fill, 'rgba(' + TRIM + ',.55)');
}
/** A satellite dish on a short mast, facing left or right. */
export function roofDish(x: CanvasRenderingContext2D, cx: number, base: number, r: number, face: 1 | -1, fill: string) {
  x.fillStyle = fill; x.fillRect(cx - 1, base - r, 2, r);
  x.beginPath(); x.ellipse(cx + face * 2, base - r - 2, r * 0.45, r, face * 0.5, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(' + TRIM + ',.55)'; x.stroke();
  x.fillStyle = 'rgba(200,190,170,.6)'; x.fillRect(cx + face * (r * 0.6), base - r - 3, 2, 2);
}
