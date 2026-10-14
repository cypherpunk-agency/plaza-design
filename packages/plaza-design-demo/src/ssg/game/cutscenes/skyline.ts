/**
 * The skyline: the homepage's city (cityScene.ts) at game scale, as a scene with
 * no one in it. A banded sun on the horizon, three bands of towers drifting past
 * at their own depths, the antenna with its blinking lights, rooftop cables
 * carrying packets up the mast and into the sky, beacons beaming up to the
 * letterbox, ships, a star mesh that wanders the sky like something looking for
 * someone, a wet reflecting floor with a pulse rolling in, and a shower passing
 * through.
 *
 * Same ideas and palette as cityScene, ported rather than shared so the landing
 * page stays exactly as it is. Everything is laid out once per view size; a
 * frame only reads the layout (no per-frame allocations beyond a few gradients).
 */

import { drawSprite, HULL, SPR, type Sprite } from '../sprites';
import type { CutView } from './types';

// cityScene's default palette (the game does not follow the theme switch).
const P = '255,136,0', A = '0,255,255', D = '194,65,12', E = '255,42,68';
const S1 = '#fdba74', S2 = '#ff8800', S3 = '#ea580c', BG = '#000', STAR = '#ffd9a5';

const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

interface Tower { x: number; w: number; h: number; win: number[]; beacon: boolean; ant: boolean }
interface Band { par: number; towers: Tower[]; stroke: string; lit: string; dim: string; fill: string; winSize: number }
interface Ship { sprite: Sprite; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }
interface Packet { r: number; out: boolean; ph: 0 | 1 | 2 | 3 | 4 | 5; k: number; s: number; v: number; cyan: boolean; sx: number; wait: number; dir: number }
// Packet phases: travelling along cables to the mast, climbing it, sending into the sky; falling from the sky, down the mast, out along cables.
const CABLE = 0, CLIMB = 1, SEND = 2, FALL = 3, DOWN = 4, OUT = 5;

/** Bands drift at these fractions of the camera; the floor runs at 1. */
const PAR_SUN = 0.08, PAR_FAR = 0.22, PAR_MID = 0.4, PAR_HERO = 0.62;

interface Layout {
  W: number; H: number; top: number; bottom: number;
  HY: number; SKY: number; U: number; SUN: number; MAST: number; camMax: number;
  far: Band; mid: Band; hero: Band;
  roofs: Tower[]; ant: Tower; A: number;
  cable: Float32Array[];
  stars: Float32Array; // x, y, alpha, phase
  near: Int32Array;
  ships: Ship[];
  packets: Packet[];
  drops: Float32Array; // x, y, depth, seed
  scan: number[];
  sunGlow: CanvasGradient; sunFill: CanvasGradient; horizon: CanvasGradient; beams: CanvasGradient[];
  rnd: () => number;
}

let L: Layout | null = null;
/** Time of the previous frame, to step the packets by real frames. */
let lastT = 0;

function band(r: () => number, par: number, W: number, camMax: number, HY: number, S: number, U: number,
  hMin: number, hMax: number, wMin: number, wMax: number, gap: number, density: number,
  look: { stroke: string; lit: string; dim: string; fill: string; winSize: number }, valley?: { cx: number; r: number }): Band {
  const towers: Tower[] = [];
  const end = W + camMax * par + 40;
  for (let px = -10; px < end;) {
    const w = Math.round((wMin + r() * (wMax - wMin)) * U);
    let h = Math.round(S * (hMin + r() * (hMax - hMin)));
    if (valley) {
      const dc = Math.abs(px + w / 2 - valley.cx);
      if (dc < valley.r) h = Math.round(h * (0.32 + (dc / valley.r) * 0.5));
    }
    towers.push({ x: px, w, h, win: [], beacon: false, ant: false });
    px += w + Math.round(gap * U);
  }
  for (const tw of towers) fillWindows(tw, r, HY, density, look.winSize);
  return { par, towers, ...look };
}

function fillWindows(tw: Tower, r: () => number, HY: number, density: number, size: number) {
  tw.win = [];
  const px = size + 3, py = size + 4;
  for (let wy = HY - tw.h + 5; wy < HY - 4; wy += py)
    for (let wx = tw.x + 3; wx < tw.x + tw.w - 3 - size; wx += px)
      if (r() < density) tw.win.push(wx, wy, r() < 0.07 ? r() * 7 : -1);
}

function layout(x: CanvasRenderingContext2D, v: CutView): Layout {
  const W = Math.ceil(v.viewW), H = Math.ceil(v.viewH), top = v.barTop, bottom = v.barBottom;
  const pic = H - top - bottom;
  const HY = Math.round(top + pic * 0.68), SKY = HY - top;
  const U = Math.max(0.7, Math.min(1.6, SKY / 230));
  const SUN = Math.round(SKY * 0.34), MAST = Math.round(SKY * 0.4);
  const camMax = Math.round(W * 1.1);
  const r = rng(11);

  // Where the sun sits behind each band halfway through the pan: lower towers there, as the homepage does.
  const sunMid = W * 0.6 - (camMax / 2) * PAR_SUN;
  // The valley is wider than the sun: the towers slide past it during the pan, and it should stay in view most of the way.
  const valleyAt = (par: number) => ({ cx: sunMid + (camMax / 2) * par, r: SUN * 1.7 + camMax * (par - PAR_SUN) * 0.3 });

  const far = band(r, PAR_FAR, W, camMax, HY, SKY, U, 0.08, 0.3, 10, 26, 2, 0.12,
    { stroke: rgba(D, 0.22), lit: rgba(P, 0.2), dim: rgba(P, 0.08), fill: '#030100', winSize: 1 });
  const mid = band(r, PAR_MID, W, camMax, HY, SKY, U, 0.12, 0.42, 14, 34, 2, 0.2,
    { stroke: rgba(D, 0.42), lit: rgba(P, 0.3), dim: rgba(P, 0.1), fill: '#050200', winSize: 2 }, valleyAt(PAR_MID));
  const hero = band(r, PAR_HERO, W, camMax, HY, SKY, U, 0.1, 0.5, 22, 56, 3, 0.36,
    { stroke: rgba(D, 0.85), lit: rgba(P, 0.62), dim: rgba(P, 0.24), fill: BG, winSize: 2 }, valleyAt(PAR_HERO));

  // The antenna stands left of the sun; three beacons spread over the band.
  const hv = valleyAt(PAR_HERO), heroEnd = W + camMax * PAR_HERO;
  const nearest = (fx: number) => hero.towers.reduce((a, b) => (Math.abs(b.x + b.w / 2 - fx) < Math.abs(a.x + a.w / 2 - fx) ? b : a));
  [0.16, 0.74, 0.92].forEach((f, i) => {
    const tw = nearest(heroEnd * f);
    tw.h = Math.round(SKY * [0.58, 0.54, 0.6][i]); tw.w = Math.max(tw.w, Math.round(36 * U)); tw.beacon = true;
    fillWindows(tw, r, HY, 0.36, 2);
  });
  const ant = nearest(hv.cx - SUN * 2.1);
  ant.h = Math.round(SKY * 0.46); ant.w = Math.round(44 * U); ant.ant = true; ant.beacon = false;
  fillWindows(ant, r, HY, 0.36, 2);
  const roofs = hero.towers.filter((z) => z.h > SKY * 0.3 || z.ant).sort((a, b) => a.x - b.x);

  const roofY = (tw: Tower) => HY - tw.h;
  const cable: Float32Array[] = [];
  for (let i = 0; i < roofs.length - 1; i++) {
    const pts = new Float32Array(42);
    for (let j = 0; j <= 20; j++) { const p = cablePoint(roofs, i, i + 1, j / 20, HY, U); pts[j * 2] = p[0]; pts[j * 2 + 1] = p[1]; }
    cable.push(pts);
  }

  const starTop = top + 4, starBot = Math.max(starTop + 10, HY - SKY * 0.62);
  const n = Math.round((W * (starBot - starTop)) / 1800);
  const stars = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { stars[i * 4] = r() * (W + 40); stars[i * 4 + 1] = starTop + r() * (starBot - starTop); stars[i * 4 + 2] = 0.25 + r() * 0.5; stars[i * 4 + 3] = r() * 7; }

  const hulls = [SPR.spinner, SPR.freighter, SPR.spinner, SPR.drone, SPR.spinner, SPR.freighter];
  const ships: Ship[] = hulls.map((sprite, i) => {
    const depth = 0.12 + (i / hulls.length) * 0.4;
    return { sprite, ps: depth > 0.35 && sprite !== SPR.freighter ? 2 : 1, y: Math.round(top + 14 + r() * (SKY * 0.42)), speed: 0.05 + depth * 0.12, offset: r() * 3000, flip: r() < 0.5, depth };
  });

  const drops = new Float32Array(280 * 4);
  for (let i = 0; i < 280; i++) { drops[i * 4] = r() * 2400; drops[i * 4 + 1] = r() * 800; drops[i * 4 + 2] = 0.4 + r() * 0.6; drops[i * 4 + 3] = r(); }

  const scan: number[] = [];
  for (let y = HY + 3, i = 0; y < H; y += 5 + i * 0.35, i++) scan.push(Math.round(y), Math.max(1, Math.round(1 + i * 0.12)));

  // Gradients that only depend on y are made once; drawing translates to them.
  const sunGlow = x.createRadialGradient(0, HY, 0, 0, HY, SUN * 2.2);
  sunGlow.addColorStop(0, rgba(P, 0.42)); sunGlow.addColorStop(1, rgba(P, 0));
  const sunFill = x.createLinearGradient(0, HY - SUN, 0, HY);
  sunFill.addColorStop(0, S1); sunFill.addColorStop(0.55, S2); sunFill.addColorStop(1, S3);
  const horizon = x.createLinearGradient(0, HY - 14, 0, HY + 14);
  horizon.addColorStop(0, rgba(P, 0)); horizon.addColorStop(0.5, rgba(P, 0.5)); horizon.addColorStop(1, rgba(P, 0));
  const beams = hero.towers.filter((z) => z.beacon).map((tw) => {
    const g = x.createLinearGradient(0, roofY(tw) - 14 * U, 0, top);
    g.addColorStop(0, rgba(A, 0.5)); g.addColorStop(1, rgba(A, 0.1));
    return g;
  });

  const lay: Layout = {
    W, H, top, bottom, HY, SKY, U, SUN, MAST, camMax, far, mid, hero, roofs, ant, A: roofs.indexOf(ant), cable,
    stars, near: new Int32Array(n), ships, packets: [], drops, scan, sunGlow, sunFill, horizon, beams, rnd: r,
  };
  lay.packets = Array.from({ length: 16 }, () => resetPacket(lay, blankPacket()));
  lay.packets.forEach((p) => { if (!p.out) { p.ph = FALL; p.s = r(); p.wait = 0; } });
  return lay;
}

// ---------- cables and packets (cityScene's state machine, in the hero band's coordinates) ----------

const tmp: [number, number] = [0, 0];

function cablePoint(roofs: Tower[], i: number, j: number, s: number, HY: number, U: number, out: [number, number] = [0, 0]) {
  const a = roofs[i], b = roofs[j];
  const ax = a.x + a.w / 2, ay = HY - a.h, bx = b.x + b.w / 2, by = HY - b.h;
  const sag = Math.max(ay, by) + 14 * U + Math.abs(bx - ax) * 0.08;
  const u = 1 - s, m = (ax + bx) / 2;
  out[0] = u * u * ax + 2 * u * s * m + s * s * bx; out[1] = u * u * ay + 2 * u * s * sag + s * s * by;
  return out;
}

const blankPacket = (): Packet => ({ r: 0, out: true, ph: CABLE, k: 0, s: 0, v: 0, cyan: true, sx: 0, wait: 0, dir: 1 });

function resetPacket(l: Layout, p: Packet): Packet {
  const r = l.rnd, tipX = l.ant.x + l.ant.w / 2;
  p.r = Math.floor(r() * l.roofs.length); p.out = r() < 0.55; p.ph = CABLE; p.k = p.r; p.s = 0;
  p.v = 0.0018 + r() * 0.0018; p.cyan = r() < 0.75; p.sx = tipX + (r() - 0.5) * 220 * l.U; p.wait = r() * 200; p.dir = 1;
  return p;
}

function dot(x: CanvasRenderingContext2D, px: number, py: number, c: string, sz: number) {
  const X = Math.round(px), Y = Math.round(py);
  x.fillStyle = rgba(c, 0.15); x.fillRect(X - sz, Y - sz, sz * 2, sz * 2);
  x.fillStyle = rgba(c, 1); x.fillRect(X - sz / 2, Y - sz / 2, sz, sz);
}

/** A packet in flight: a pixel trail fading behind it (stacked steps instead of a gradient). */
function streak(x: CanvasRenderingContext2D, px: number, py: number, c: string, up: boolean, U: number) {
  const X = Math.round(px), Y = Math.round(py), seg = Math.round(7 * U);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = rgba(c, 0.7 - i * 0.14);
    x.fillRect(X - 1, up ? Y + i * seg : Y - (i + 1) * seg, 2, seg);
  }
  dot(x, X, Y, c, Math.max(2, Math.round(3 * U)));
}

function packets(x: CanvasRenderingContext2D, l: Layout, k: number, still: boolean) {
  const { roofs, ant, A: ai, HY, U, MAST } = l;
  const bx = ant.x + ant.w / 2, by = HY - ant.h, tipY = by - MAST, sz = Math.max(2, Math.round(2 * U));
  if (still) k = 0;
  for (const p of l.packets) {
    const c = p.cyan ? A : P;
    if (p.wait > 0) { p.wait -= k; continue; }
    if (p.ph === CABLE) {
      if (p.k === ai) { p.ph = CLIMB; p.s = 0; continue; }
      const j = p.k + (p.k < ai ? 1 : -1);
      p.s += p.v * 2 * k; cablePoint(roofs, p.k, j, Math.min(p.s, 1), HY, U, tmp); dot(x, tmp[0], tmp[1], c, sz);
      if (p.s >= 1) { p.k = j; p.s = 0; }
    } else if (p.ph === CLIMB) {
      p.s += 0.007 * k; dot(x, bx, by - MAST * p.s, c, sz);
      if (p.s >= 1) { p.ph = SEND; p.s = 0; }
    } else if (p.ph === SEND) {
      p.s += 0.0045 * k; streak(x, bx + (p.sx - bx) * p.s, tipY - p.s * (tipY - l.top + 30), c, true, U);
      if (p.s >= 1) { resetPacket(l, p); p.out = false; p.ph = FALL; p.s = 0; p.wait = 0; }
    } else if (p.ph === FALL) {
      p.s += 0.0045 * k; streak(x, p.sx + (bx - p.sx) * p.s, l.top - 30 + p.s * (tipY - l.top + 30), c, false, U);
      if (p.s >= 1) { p.ph = DOWN; p.s = 0; p.k = ai; }
    } else if (p.ph === DOWN) {
      p.s += 0.007 * k; dot(x, bx, tipY + MAST * p.s, c, sz);
      if (p.s >= 1) {
        if (p.r === ai) { resetPacket(l, p); p.out = true; p.wait = 0; }
        else { p.ph = OUT; p.s = 0; p.dir = p.r < ai ? -1 : 1; }
      }
    } else {
      const j = p.k + p.dir;
      if (j < 0 || j >= roofs.length || (p.dir < 0 ? p.k <= p.r : p.k >= p.r)) { resetPacket(l, p); p.out = true; continue; }
      p.s += p.v * 2 * k; cablePoint(roofs, p.k, j, Math.min(p.s, 1), HY, U, tmp); dot(x, tmp[0], tmp[1], c, sz);
      if (p.s >= 1) { p.k = j; p.s = 0; }
    }
  }
}

// ---------- drawing ----------

function sun(x: CanvasRenderingContext2D, l: Layout, cx: number, a: number) {
  const r = l.SUN, cy = l.HY;
  x.save();
  x.translate(cx, 0);
  x.fillStyle = l.sunGlow; x.fillRect(-r * 2.2, cy - r * 2.2, r * 4.4, r * 2.2);
  x.beginPath(); x.arc(0, cy, r, Math.PI, 0); x.clip();
  x.fillStyle = l.sunFill; x.fillRect(-r, cy - r, 2 * r, r);
  // Bands hold still and drift up and down a pixel or two.
  x.fillStyle = BG;
  const bob = Math.round(Math.sin(a * 0.012) * 2 * l.U);
  for (let i = 0; i < 6; i++) x.fillRect(-r, Math.round(cy - r * 0.52 + i * r * 0.1) + bob, 2 * r, Math.max(1, Math.round((1.2 + i * 1.3) * l.U)));
  x.restore();
}

function drawBand(x: CanvasRenderingContext2D, l: Layout, b: Band, off: number, a: number, alpha: number) {
  const { HY, W } = l, sz = b.winSize;
  x.globalAlpha = alpha; x.lineWidth = 1;
  for (const tw of b.towers) {
    const sx = tw.x + off;
    if (sx + tw.w < 0 || sx > W) continue;
    const tp = HY - tw.h;
    x.fillStyle = b.fill; x.fillRect(sx, tp, tw.w, tw.h);
    x.strokeStyle = b.stroke; x.strokeRect(sx + 0.5, tp + 0.5, tw.w - 1, tw.h);
    const win = tw.win;
    for (let i = 0; i < win.length; i += 3) {
      const ph = win[i + 2];
      x.fillStyle = ph < 0 || Math.sin(a * 0.03 + ph) > 0.2 ? b.lit : b.dim;
      x.fillRect(win[i] + off, win[i + 1], sz, sz);
    }
  }
  x.globalAlpha = 1;
}

function mast(x: CanvasRenderingContext2D, l: Layout, off: number, a: number) {
  const { ant, HY, MAST, U } = l, bx = ant.x + ant.w / 2 + off, by = HY - ant.h, top = by - MAST, hw = Math.round(11 * U);
  x.strokeStyle = rgba(D, 1); x.lineWidth = 1;
  x.beginPath(); x.moveTo(bx - hw + 0.5, by); x.lineTo(bx + 0.5, top); x.lineTo(bx + hw + 0.5, by);
  for (let i = 1; i < 12; i++) {
    const y1 = by - (MAST * (i - 1)) / 12, y2 = by - (MAST * i) / 12, w1 = hw * (1 - (i - 1) / 12), w2 = hw * (1 - i / 12);
    x.moveTo(bx - w1 + 0.5, y1); x.lineTo(bx + w2 + 0.5, y2); x.moveTo(bx + w1 + 0.5, y1); x.lineTo(bx - w2 + 0.5, y2);
  }
  x.stroke();
  x.fillStyle = rgba(D, 1);
  x.fillRect(bx - Math.round(15 * U), Math.round(by - MAST * 0.55), Math.round(30 * U), 2);
  x.fillRect(bx - Math.round(10 * U), Math.round(by - MAST * 0.8), Math.round(20 * U), 2);
  // Three blinking lights up the mast, the top one biggest (the street's antenna has the same).
  const s = Math.max(2, Math.round(3 * U));
  [0.35, 0.7].forEach((f, i) => {
    x.fillStyle = rgba(E, Math.sin(a * 0.06 + i * 1.3) > 0 ? 1 : 0.25);
    x.fillRect(bx - s / 2 + 1, Math.round(by - MAST * f), s, s);
  });
  x.fillStyle = rgba(E, Math.sin(a * 0.08) > 0 ? 1 : 0.25);
  x.fillRect(bx - s + 1, top - 2 * s, 2 * s, 2 * s);
}

function cables(x: CanvasRenderingContext2D, l: Layout) {
  x.strokeStyle = rgba(D, 0.3); x.lineWidth = 1;
  x.beginPath();
  for (const pts of l.cable) {
    x.moveTo(pts[0], pts[1]);
    for (let j = 2; j < pts.length; j += 2) x.lineTo(pts[j], pts[j + 1]);
  }
  x.stroke();
}

function beacons(x: CanvasRenderingContext2D, l: Layout, off: number, a: number, beams: boolean) {
  const { HY, U, top } = l;
  let i = 0;
  for (const tw of l.hero.towers) {
    if (!tw.beacon) continue;
    const cx = Math.round(tw.x + tw.w / 2 + off), tp = HY - tw.h, pole = Math.round(12 * U);
    const p = (Math.sin(a * 0.025 + i * 2.1) + 1) / 2;
    x.fillStyle = rgba(A, 0.9); x.fillRect(cx - 1, tp - pole, 2, pole);
    if (beams) {
      // One unbroken beam from the rooftop light up to the letterbox.
      const bw = Math.max(3, Math.round(4 * U));
      x.globalAlpha = 0.55 + 0.45 * p;
      x.fillStyle = l.beams[i]; x.fillRect(cx - Math.floor(bw / 2), top, bw, tp - pole - top);
      x.globalAlpha = 1;
    }
    const s = Math.max(4, Math.round(6 * U));
    x.fillStyle = rgba(A, p > 0.5 ? 1 : 0.4); x.fillRect(cx - s / 2, tp - pole - s + 2, s, s);
    i++;
  }
}

function sky(x: CanvasRenderingContext2D, l: Layout, cam: number, a: number) {
  const { stars, near, W, SKY, top, HY } = l, n = stars.length / 4, off = -cam * 0.03, span = W + 40;
  x.fillStyle = STAR;
  for (let i = 0; i < n; i++) {
    const sx = Math.round((((stars[i * 4] + off) % span) + span) % span) - 20;
    x.globalAlpha = stars[i * 4 + 2] * (0.7 + 0.3 * Math.sin(a * 0.02 + stars[i * 4 + 3]));
    x.fillRect(sx, Math.round(stars[i * 4 + 1]), 1, 1);
  }
  x.globalAlpha = 1;
  // The mesh: stars near a slowly wandering point link up, like something scanning the sky.
  const fx = W * (0.5 + 0.38 * Math.sin(a * 0.0019)), fy = top + (HY - SKY * 0.62 - top) * (0.5 + 0.45 * Math.sin(a * 0.0031 + 1));
  const R = SKY * 0.42, Dl = SKY * 0.3;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const sx = (((stars[i * 4] + off) % span) + span) % span - 20, dx = sx - fx, dy = stars[i * 4 + 1] - fy;
    if (dx * dx + dy * dy < R * R) near[m++] = i;
  }
  x.strokeStyle = rgba(A, 1); x.lineWidth = 1;
  for (let i = 0; i < m; i++) {
    const ia = near[i], ax = Math.round((((stars[ia * 4] + off) % span) + span) % span - 20), ay = Math.round(stars[ia * 4 + 1]);
    for (let j = i + 1; j < m; j++) {
      const ib = near[j], bx = Math.round((((stars[ib * 4] + off) % span) + span) % span - 20), by = Math.round(stars[ib * 4 + 1]);
      const d = Math.hypot(ax - bx, ay - by);
      if (d < Dl) { x.globalAlpha = 0.32 * (1 - d / Dl); x.beginPath(); x.moveTo(ax + 0.5, ay + 0.5); x.lineTo(bx + 0.5, by + 0.5); x.stroke(); }
    }
  }
  x.globalAlpha = 0.85; x.fillStyle = rgba(A, 1);
  for (let i = 0; i < m; i++) {
    const ia = near[i];
    x.fillRect(Math.round((((stars[ia * 4] + off) % span) + span) % span - 20) - 1, Math.round(stars[ia * 4 + 1]) - 1, 2, 2);
  }
  x.globalAlpha = 1;
}

function ships(x: CanvasRenderingContext2D, l: Layout, cam: number, a: number, big: boolean) {
  const span = l.W + 260;
  for (const s of l.ships) {
    if ((s.ps > 1) !== big) continue;
    const px = ((s.offset + a * s.speed * (s.flip ? -1 : 1) - cam * s.depth) % span + span) % span - 130;
    const glow = s.sprite === SPR.drone ? 'rgba(255,42,68,.5)' : 'rgba(0,255,255,.3)';
    x.globalAlpha = big ? 0.9 : 0.6;
    drawSprite(x, s.sprite, px, s.y, { ps: s.ps, flip: s.flip, pal: HULL, glow });
  }
  x.globalAlpha = 1;
}

function floor(x: CanvasRenderingContext2D, l: Layout, cam: number, a: number, still: boolean) {
  const { W, H, HY } = l, half = W / 2, depth = H - HY;
  const cyc = (a * 0.006) % 1.6, pz = still ? 99 : cyc < 1 ? 40 - cyc * 39 : 99;
  // Reflection: the sun and the hero band, upside down and squashed into the wet floor.
  x.save();
  x.beginPath(); x.rect(0, HY, W, H - HY); x.clip();
  x.translate(0, HY); x.scale(1, -0.55); x.translate(0, -HY);
  sun(x, l, Math.round(W * 0.6 - cam * PAR_SUN), a);
  const off = -Math.round(cam * PAR_HERO);
  drawBand(x, l, l.hero, off, a, 0.4);
  beacons(x, l, off, a, false);
  x.restore();
  x.fillStyle = BG;
  for (let i = 0; i < l.scan.length; i += 2) x.fillRect(0, l.scan[i], W, l.scan[i + 1]);
  if (pz < 50) {
    const yp = HY + depth / pz, g = x.createLinearGradient(0, yp - 24, 0, yp + 24);
    g.addColorStop(0, rgba(P, 0)); g.addColorStop(0.5, rgba(P, 0.1)); g.addColorStop(1, rgba(P, 0));
    x.fillStyle = g; x.fillRect(0, yp - 24, W, 48);
  }
  // The grid runs with the camera: near lines slide by fast, far ones barely move.
  x.lineWidth = 1; x.strokeStyle = rgba(P, 0.16);
  x.beginPath();
  const c0 = Math.floor(cam / half);
  for (let X = c0 - 30; X <= c0 + 31; X++) {
    const ox = X * half - cam;
    x.moveTo(half + ox / 40, HY + depth / 40); x.lineTo(half + ox, H);
  }
  x.stroke();
  for (let Z = 1; Z < 40; Z++) {
    const y = Math.round(HY + depth / Z) + 0.5, w = Math.max(0, 1 - Math.abs(Z - pz) / 1.4);
    x.strokeStyle = rgba(P, 0.12 + 0.75 * w); x.lineWidth = 1 + w;
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
  }
  x.lineWidth = 1;
}

function rain(x: CanvasRenderingContext2D, l: Layout, level: number, a: number, cam: number) {
  if (level < 0.03) return;
  const { drops, W, H } = l, n = Math.floor((drops.length / 4) * level), wind = 0.25 + 0.2 * Math.sin(a * 0.004);
  // Three depths, one path each.
  for (let pass = 0; pass < 3; pass++) {
    const lo = 0.4 + pass * 0.2, hi = lo + 0.2;
    x.strokeStyle = 'rgba(170,210,255,' + (0.08 + (lo + 0.1) * 0.22) + ')';
    x.beginPath();
    for (let i = 0; i < n; i++) {
      const depth = drops[i * 4 + 2];
      if (depth < lo || depth >= hi) continue;
      const fall = 2.5 + depth * 4.5, len = 4 + depth * 8;
      const yy = (drops[i * 4 + 1] + a * fall) % (H + 40) - 20;
      const xx = ((drops[i * 4] - a * fall * wind - cam * depth * 0.6) % W + W) % W;
      x.moveTo(xx, yy); x.lineTo(xx - len * wind, yy + len);
    }
    x.stroke();
  }
}

/** Draw the skyline at `t` seconds into a `duration`-second pan. */
export function drawSkyline(x: CanvasRenderingContext2D, v: CutView, t: number, duration: number) {
  if (!L || L.W !== Math.ceil(v.viewW) || L.H !== Math.ceil(v.viewH) || L.top !== v.barTop || L.bottom !== v.barBottom) L = layout(x, v);
  const l = L, still = v.reduced;
  const a = still ? 240 : t * 60;
  // A slow pan, easing in and out; reduced motion holds the middle of it.
  const u = still ? 0.5 : Math.min(1, Math.max(0, t / duration));
  const cam = Math.round(l.camMax * (0.5 - 0.5 * Math.cos(Math.PI * u)));
  const k = Math.min(3, Math.max(0, (t - lastT) * 60));
  lastT = t;

  x.fillStyle = BG; x.fillRect(0, 0, l.W, l.H);
  sky(x, l, cam, a);
  ships(x, l, cam, a, false);
  sun(x, l, Math.round(l.W * 0.6 - cam * PAR_SUN), a);
  drawBand(x, l, l.far, -Math.round(cam * PAR_FAR), a, 1);
  drawBand(x, l, l.mid, -Math.round(cam * PAR_MID), a, 1);
  ships(x, l, cam, a, true);
  floor(x, l, cam, a, still);
  x.fillStyle = l.horizon; x.fillRect(0, l.HY - 14, l.W, 28);
  const off = -Math.round(cam * PAR_HERO);
  drawBand(x, l, l.hero, off, a, 1);
  mast(x, l, off, a);
  x.save(); x.translate(off, 0);
  cables(x, l);
  packets(x, l, k, still);
  x.restore();
  beacons(x, l, off, a, true);
  // A shower passes through the middle of the scene.
  const wet = still ? 0.35 : Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 3) / (duration - 5))))) ** 1.4;
  rain(x, l, wet * 0.85, a, cam);
}
