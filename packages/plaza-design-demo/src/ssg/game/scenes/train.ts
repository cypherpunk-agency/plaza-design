/**
 * The metro car: inside LINE 0's train, the one you ride (the scene id stays
 * `train`; everywhere you read it, it is the METRO CAR). Bench seats under big
 * windows, people on them, handrails and straps, displays over both doors with
 * the next stop and a countdown, cameras, a Registry screen, and the city going
 * past outside. Bands: far = the city through the windows and, on tall
 * screens, over the roof; middle = the car's wall, ad cards, the roof in
 * cutaway; play = seats, riders, poles and straps.
 *
 * The ride itself is line.ts (`ride`): the car stands at a stop with its doors
 * open, closes, runs to the next stop, opens. `ride.pos` is where it is on the
 * loop, and the world outside is laid along that loop: Downtown's towers, a
 * viaduct over the rooftops, the mall's glass front and the tunnel under it to
 * Galleria, the bridge over the bay, the harbor's containers and cranes, a
 * canyon of towers back to Downtown. At a stop its platform stands outside.
 */

import { LINE, STATIONS } from '../city';
import { TRAIN } from '../data';
import { box, O, onScreen, PAPER, RED, rng, tell, text, towers, type SceneDef, type View } from './kit';
import { between, clock, lineOpen, LOOP, ride, rideAtSiding, rideDue, rideNext, rideOpen, rideRun, SEG, SIDING, ticker } from './line';
import { crowd, drawRider, KINDS, SEAT_H, type RiderKind } from './riders';
import { TRAIN_RULES } from './train0';
import { drawGalleriaDome } from '../sets/galleria-dome';
import { placed } from '../sets/view';

/** Layout: positions in world units, heights up from the car's floor. */
const L = {
  width: 1200,
  spawn: 780,
  ceil: 166,
  /** Windows (left edges), two seats under each; doors (centres) between them. Both doors open at a stop. */
  windows: [70, 200, 460, 590, 860, 990],
  winW: 100,
  win: { h0: 52, h1: 128 },
  doors: [380, 780],
  /** The line map, a panel high on the wall over the first windows. */
  lineMap: 120,
  /** Ad cards over the windows. */
  ads: [{ x: 250, text: 'REGISTRY PREMIUM · FASTER CHECKS' }, { x: 640, text: 'CAMERAS OPERATE IN THIS CAR' }, { x: 1040, text: 'NULLROUTE LOGISTICS · NO QUESTIONS' }],
  /**
   * The regulars: people who are always in this car, whatever the stop, and talk
   * if you ask (E). `sit` on a seat under a window, else standing by a pole.
   */
  people: [
    { id: 'suit', kind: 'suit', x: 225, sit: true, name: 'MAN IN A SUIT', pages: ['I have a meeting at Galleria.', 'I have had it for six loops now. It keeps getting moved to the next stop.'] },
    { id: 'courier', kind: 'courier', x: 556, sit: false, name: 'COURIER', pages: ['Parcel for "whoever is at the Harbor". That is the whole address.', 'I ride round until somebody looks like a whoever.'] },
    { id: 'elder', kind: 'elder', x: 885, sit: true, name: 'OLD WOMAN', pages: ['That brake? I pulled it once. Forty years ago. They still send me a letter every birthday.', 'You have to register an emergency two days ahead now. Nobody plans an emergency.', 'Well. Some people do.'] },
    { id: 'punk', kind: 'punk', x: 1015, sit: true, name: 'PUNK', pages: ['They check IDs at every exit now.', 'So I never get off. Checkmate.'] },
  ] as { id: string; kind: RiderKind; x: number; sit: boolean; name: string; pages: string[] }[],
  poles: [180, 330, 560, 720, 950],
  frontPoles: [430, 880],
  bar: 134,
  /** People standing, holding on: by these poles. */
  standing: [336, 566, 956],
  /** Cameras in the ceiling. */
  cams: [520, 1000],
  staff: 32,
  gangway: 1130,
  gangDoor: 1186,
  brake: 1140,
};

/** Above the car, for tall screens (heights over the ceiling): the roof shell, the contact wire, the wire over it. */
const ROOF = { cove: 14, shell: 12, ac: [300, 900], panto: 610, wire: 66, messenger: 88 };

// ---------- the world along the loop ----------

/**
 * What lies along LINE 0, in track units from Downtown's platform (the loop is
 * LOOP long, a stop every SEG). Each stop's district reaches `district` either
 * side of it; the tunnel under the mall reaches `tunnel` either side of
 * Galleria; a platform stands `platform` either side of each stop. Between the
 * districts: a viaduct (Downtown to Galleria), the bridge (Galleria to Harbor),
 * a canyon of towers (Harbor to Downtown).
 */
const WORLD = { district: 900, tunnel: 470, platform: 430, far: 0.2, mast: 340, truss: 70 };
type Region = 'downtown' | 'mall' | 'tunnel' | 'harbor' | 'viaduct' | 'bridge' | 'canyon';
const STRETCH: Region[] = ['viaduct', 'bridge', 'canyon'];
/** The bridge's span over the bay, in track units. */
const BRIDGE: [number, number] = [SEG + WORLD.district + 40, 2 * SEG - WORLD.district - 40];

/** Signed distance the short way round a loop of `len`. */
const wrap = (d: number, len = LOOP) => ((((d + len / 2) % len) + len) % len) - len / 2;

function regionAt(u0: number): Region {
  const u = ((u0 % LOOP) + LOOP) % LOOP, i = Math.round(u / SEG) % 3, d = Math.abs(wrap(u - i * SEG));
  if (d > WORLD.district) return STRETCH[Math.floor(u / SEG) % 3];
  return i === 0 ? 'downtown' : i === 1 ? (d < WORLD.tunnel ? 'tunnel' : 'mall') : 'harbor';
}

/** Words on billboards over the viaduct and on screens in the canyon. */
const BILLS = ['REGISTRY · ID REQUIRED', 'NULLROUTE LOGISTICS', 'IDENTITY CHECK AHEAD', 'REPORT IRREGULARITIES', 'CREDIT · APPLY TODAY'];
const SCREENS = ['COMPLY', 'NO LOITERING', 'ID REQUIRED', 'CURFEW 02:00', 'RECORDING'];
const SIGNS = ['NOODLES', 'HOTEL', '24/7', 'REPAIR', 'PAWN', 'KARAOKE'];

/** Something by the track, laid out once along the loop: its centre, width, height above the sill, what it is. */
interface Thing { u: number; w: number; h: number; region: Region; seed: number; label?: string }
const NEAR: Thing[] = (() => {
  const r = rng(211), out: Thing[] = [];
  let k = 0;
  for (let u = 0; u < LOOP;) {
    const region = regionAt(u);
    if (region === 'tunnel' || region === 'bridge') { u += 40; continue; }
    const W: Record<Region, number> = { downtown: 44 + r() * 50, mall: 120 + r() * 60, harbor: 64, viaduct: 60 + r() * 80, canyon: 70 + r() * 60, tunnel: 0, bridge: 0 };
    const H: Record<Region, number> = { downtown: 60 + r() * 70, mall: 90, harbor: 14 * (1 + Math.floor(r() * 3)), viaduct: r() * 22, canyon: 400, tunnel: 0, bridge: 0 };
    const w = W[region], h = H[region];
    k++;
    let label: string | undefined;
    if (region === 'downtown' && r() < 0.35) label = SIGNS[k % SIGNS.length];
    if (region === 'viaduct' && k % 3 === 0) label = BILLS[k % BILLS.length];
    if (region === 'canyon' && k % 2 === 0) label = SCREENS[k % SCREENS.length];
    out.push({ u: u + w / 2, w, h, region, seed: Math.floor(r() * 1000), label });
    const gap: Record<Region, number> = { downtown: 4 + r() * 14, mall: 10 + r() * 20, harbor: 6 + r() * 40, viaduct: 8 + r() * 30, canyon: 6 + r() * 16, tunnel: 0, bridge: 0 };
    u += w + gap[region];
  }
  return out;
})();
/** The far city, in the far lane's own units (the loop × WORLD.far). */
const SKY = towers(97, LOOP * WORLD.far, [24, 70], [50, 150], 0.18);
/** The far city over the roof: taller than what the windows show, and dimmer. */
const SKY_HIGH = towers(103, LOOP * WORLD.far, [20, 60], [80, 260], 0.1);
const STREAKS = (() => { const r = rng(101); return Array.from({ length: 22 }, () => [r() * 1200, r() * 76]); })();
const GLINTS = (() => { const r = rng(107); return Array.from({ length: 70 }, () => [r() * LOOP * WORLD.far, r(), r()]); })();
const HFILL = ['#1c0e06', '#0c1313', '#170b12', '#15110a'];
const HEDGE = ['rgba(255,136,0,.6)', 'rgba(150,170,160,.5)', 'rgba(200,120,150,.45)', 'rgba(220,180,90,.5)'];

/** Where things outside land on screen: near ones slide by at the train's speed, far ones slowly; both shift a little as you walk. */
function lanes(v: View) {
  const camMid = L.width / 2 - v.viewW / 2, cx = v.viewW / 2, F = WORLD.far;
  return {
    near: (u: number) => cx - wrap(u - ride.pos) - (v.cam - camMid) * 0.6,
    far: (uf: number) => cx - wrap(uf - ride.pos * F, LOOP * F) - (v.cam - camMid) * 0.15,
  };
}

/** A district's landmark on the far skyline, over its stop: Downtown's antenna, the mall's glass dome, the harbor's cranes. */
function drawLandmark(x: CanvasRenderingContext2D, i: number, s: number, base: number, t: number) {
  if (i === 0) {
    x.fillStyle = '#0c0604'; x.fillRect(s - 6, base - 150, 12, 150); x.fillRect(s - 1, base - 210, 2, 60);
    x.strokeStyle = 'rgba(194,65,12,.45)'; x.strokeRect(s - 5.5, base - 149.5, 11, 150);
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.05) > 0 ? 0.85 : 0.2) + ')'; x.fillRect(s - 1, base - 213, 3, 3);
  } else if (i === 1) {
    placed(x, s, base, 1, () => drawGalleriaDome(x));
  } else {
    for (const dx of [-60, 30]) {
      x.strokeStyle = 'rgba(194,65,12,.5)'; x.lineWidth = 2; x.beginPath();
      x.moveTo(s + dx - 14, base); x.lineTo(s + dx - 14, base - 90); x.moveTo(s + dx + 14, base); x.lineTo(s + dx + 14, base - 90);
      x.moveTo(s + dx - 60, base - 84); x.lineTo(s + dx + 40, base - 84); x.moveTo(s + dx - 14, base - 90); x.lineTo(s + dx, base - 118); x.lineTo(s + dx + 14, base - 90);
      x.stroke(); x.lineWidth = 1;
      x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.04 + dx) > 0 ? 0.8 : 0.2) + ')'; x.fillRect(s + dx - 1, base - 121, 3, 3);
    }
  }
}

/** Lit windows on a facade, a seeded pattern. */
function litWindows(x: CanvasRenderingContext2D, seed: number, left: number, top: number, w: number, bottom: number, p: number, col = 'rgba(255,190,110,.5)') {
  const r = rng(seed);
  for (let yy = top + 6; yy < bottom; yy += 9) for (let xx = left + 5; xx < left + w - 6; xx += 8) if (r() < p) { x.fillStyle = col; x.fillRect(xx, yy, 3, 4); }
}

/** One thing by the track, its foot below the sill at `base`; `top` is the window's top (canyon towers run past it). */
function drawThing(x: CanvasRenderingContext2D, th: Thing, s: number, base: number, top: number, t: number) {
  const left = Math.round(s - th.w / 2), w = Math.round(th.w), tp = Math.round(base - th.h);
  if (th.region === 'downtown') {
    box(x, left, tp, w, th.h + 40, '#0d0706', 'rgba(' + O + ',.5)');
    litWindows(x, th.seed, left, tp, w, base + 30, 0.45);
    if (th.label) {
      const sw = th.label.length * 6 + 10, sy = tp + 16;
      box(x, Math.round(s - sw / 2), sy, sw, 12, '#120806', 'rgba(255,90,110,.5)');
      text(x, th.label, s, sy + 6.5, 'rgba(255,120,140,' + (Math.floor(t + th.seed) % 240 < 4 ? 0.2 : 0.9) + ')', 7, '600');
    }
  } else if (th.region === 'mall') {
    // the mall's glass front: lit levels of shops, a banner
    box(x, left, tp, w, th.h + 40, '#140d09', 'rgba(' + O + ',.55)');
    for (let k = 0; k < 5; k++) { const yy = tp + 8 + k * 20; x.fillStyle = 'rgba(255,217,165,' + (0.18 + ((th.seed + k) % 3) * 0.06) + ')'; x.fillRect(left + 4, yy, w - 8, 12); x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(left + 4, yy + 13, w - 8, 1); }
    if (th.seed % 3 === 0) { box(x, Math.round(s - 14), tp - 6, 28, 36, '#1a0b05', 'rgba(' + O + ',.5)'); text(x, 'SALE', s, tp + 12, 'rgba(255,136,0,.85)', 7, '600'); }
  } else if (th.region === 'harbor') {
    // a stack of containers on the quay, the water behind
    for (let k = 0; k * 14 < th.h; k++) { const kind = (th.seed + k) % 4; box(x, left, base - (k + 1) * 14, w, 14, HFILL[kind], HEDGE[kind]); }
  } else if (th.region === 'viaduct') {
    // rooftops below the viaduct: a parapet, a water tank or a dish, and now and then a billboard on legs
    box(x, left, tp + 6, w, th.h + 40, '#090504', 'rgba(' + O + ',.3)');
    if (th.seed % 4 === 0) { box(x, left + 8, tp - 10, 14, 16, '#140c08', 'rgba(' + O + ',.35)'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(left + 9, tp + 6, 1, 6); x.fillRect(left + 20, tp + 6, 1, 6); }
    if (th.seed % 5 === 1) { x.fillStyle = 'rgba(255,190,110,.4)'; x.fillRect(left + w - 14, tp + 12, 4, 3); }
    if (th.label) {
      const bw = th.label.length * 5 + 14, bt = base - 62;
      x.fillStyle = '#140c08'; x.fillRect(Math.round(s - bw / 3), bt + 20, 3, 50); x.fillRect(Math.round(s + bw / 3), bt + 20, 3, 50);
      box(x, Math.round(s - bw / 2), bt, bw, 20, '#1a0f08', 'rgba(' + O + ',.7)');
      x.fillStyle = 'rgba(255,230,190,.12)'; x.fillRect(Math.round(s - bw / 2) + 1, bt + 1, bw - 2, 18);
      text(x, th.label, s, bt + 10.5, 'rgba(255,217,165,.9)', 7, '600');
      x.fillStyle = 'rgba(255,240,215,.8)'; x.fillRect(Math.round(s - bw / 2) + 4, bt - 3, 6, 2); x.fillRect(Math.round(s + bw / 2) - 10, bt - 3, 6, 2);
    }
  } else if (th.region === 'canyon') {
    // towers close on both sides, lit to the top of the window and beyond; screens on some
    box(x, left, top - 20, w, base - top + 60, '#0c0605', 'rgba(' + O + ',.45)');
    litWindows(x, th.seed, left, top - 20, w, base + 30, 0.5);
    if (th.label) {
      const sw = Math.min(w - 12, th.label.length * 6 + 12), sy = top + 18 + (th.seed % 3) * 10;
      box(x, Math.round(s - sw / 2), sy, sw, 16, '#1c0c08', 'rgba(' + RED + ',.55)');
      const on = Math.floor((t + th.seed * 3) / 90) % 4 !== 3;
      text(x, on ? th.label : 'REGISTRY', s, sy + 8.5, 'rgba(255,' + (on ? '200,170' : '90,100') + ',.95)', 7, '600');
    }
  }
}

/** The platform outside at a stop: its far side beyond the glass, the station's name again and again, people waiting on it. */
function drawPlatform(x: CanvasRenderingContext2D, i: number, near: (u: number) => number, top: number, base: number, v: View) {
  const u0 = i * SEG, P = WORLD.platform, a = near(u0 + P), b = near(u0 - P);
  if (b < 0 || a > v.viewW) return;
  // a closed station (the harbor before P14): lamps off, nobody waiting, CLOSED on the plates
  const closed = !lineOpen[LINE[i]], name = STATIONS[LINE[i]].name + (closed ? ' · CLOSED' : '');
  // what is behind it: Downtown's city shows through its open canopy; the tunnel's tiles; the water past the sea wall
  if (i === 1) { x.fillStyle = '#0e0b09'; x.fillRect(a, top, b - a, base - top + 30); x.fillStyle = 'rgba(255,217,165,.06)'; for (let yy = top + 4; yy < base + 30; yy += 6) x.fillRect(a, yy, b - a, 1); }
  if (i === 2) { x.fillStyle = '#01040a'; x.fillRect(a, base - 26, b - a, 60); x.fillStyle = '#0d0907'; x.fillRect(a, base - 6, b - a, 40); }
  if (i === 0) { x.fillStyle = 'rgba(' + O + ',.32)'; x.fillRect(a, base - 18, b - a, 1); for (let u = u0 - P; u < u0 + P; u += 18) { const s = near(u); if (s > -2 && s < v.viewW + 2) x.fillRect(Math.round(s), base - 18, 1, 18); } }
  // the canopy's lamps along the top, the platform's edge along the bottom
  box(x, a, top, b - a, 8, '#120d0a'); x.fillStyle = closed ? 'rgba(255,240,215,.1)' : 'rgba(255,240,215,.55)'; x.fillRect(a, top + 8, b - a, 2);
  x.fillStyle = 'rgba(255,210,58,.6)'; x.fillRect(a, base + 18, b - a, 2);
  for (let u = u0 - P + 60; u < u0 + P; u += 140) {
    const s = near(u);
    if (s < -20 || s > v.viewW + 20) continue;
    box(x, Math.round(s - 5), top, 10, base - top + 30, i === 1 ? '#1a1410' : '#16110d', 'rgba(' + O + ',.55)');
  }
  for (let u = u0 - P + 130; u < u0 + P; u += 140) {
    const s = near(u);
    if (!onScreen(v, s - 40, 80)) continue;
    const w = 34 + name.length * 6;
    box(x, Math.round(s - w / 2), top + 16, w, 16, '#14100c', 'rgba(' + O + ',.6)');
    box(x, Math.round(s - w / 2) + 2, top + 18, 12, 12, 'rgba(' + O + ',.85)');
    text(x, '0', Math.round(s - w / 2) + 8, top + 24.5, '#14100c', 7, '700');
    text(x, name, s + 7, top + 24.5, 'rgba(' + PAPER + ',.9)', 8, '600');
  }
  // people waiting on the far platform
  if (closed) return;
  const folk = crowd(70 + i * 13, 8);
  folk.forEach((f, k) => {
    if (!f.on) return;
    const s = near(u0 - P + 50 + k * 105);
    if (s < -10 || s > v.viewW + 10) return;
    drawRider(x, f.kind, s, base + 16, v.t, { ps: 2, flip: f.flip, phase: f.phase });
  });
}

/** The tunnel under the mall: dark walls with ribs and lamps going by, a portal at each end. */
function drawTunnel(x: CanvasRenderingContext2D, near: (u: number) => number, top: number, bottom: number, v: View) {
  const u0 = SEG, T = WORLD.tunnel, a = near(u0 + T), b = near(u0 - T);
  if (b < 0 || a > v.viewW) return;
  x.fillStyle = '#060403'; x.fillRect(a, top, b - a, bottom - top);
  for (let u = u0 - T; u < u0 + T; u += 40) {
    const s = near(u);
    if (s < -4 || s > v.viewW + 4) continue;
    x.fillStyle = 'rgba(' + O + ',.14)'; x.fillRect(Math.round(s), top, 2, bottom - top);
  }
  for (let u = u0 - T + 80; u < u0 + T; u += 160) {
    const s = near(u);
    if (s < -10 || s > v.viewW + 10) continue;
    x.fillStyle = 'rgba(255,230,190,.7)'; x.fillRect(Math.round(s) - 4, top + 14, 8, 3);
  }
  for (const s of [a, b]) box(x, Math.round(s) - 6, top, 12, bottom - top, '#1a120c', 'rgba(' + O + ',.6)');
}

/**
 * The bridge over the bay: far below, black water with the city's lights in
 * it; across it the far shore's skyline; the bridge's truss going past close,
 * a pylon at each end with its warning light.
 */
function drawBridge(x: CanvasRenderingContext2D, v: View, near: (u: number) => number, far: (uf: number) => number, top: number, sill: number, bottom: number) {
  const a = near(BRIDGE[1] + 80), b = near(BRIDGE[0] - 80);
  if (b < 0 || a > v.viewW) return;
  const hz = sill - 30;
  // the water, from the far shore down, with long reflections of the city's lights
  x.fillStyle = '#020611'; x.fillRect(a, hz, b - a, bottom - hz);
  x.fillStyle = 'rgba(194,65,12,.18)'; x.fillRect(a, hz, b - a, 1);
  for (const [gx, gy, gl] of GLINTS) {
    const s = far(gx);
    if (s < a || s > b) continue;
    const yy = hz + 3 + gy * (bottom - hz - 6);
    x.fillStyle = 'rgba(255,' + (gl > 0.5 ? 190 : 136) + ',' + (gl > 0.5 ? 110 : 0) + ',' + (0.12 + gy * 0.25) + ')';
    x.fillRect(Math.round(s), Math.round(yy), Math.round(4 + gy * 14), 1);
  }
  // the truss: chords along the top and the bottom, diagonals between, going past fast
  const T = WORLD.truss;
  x.strokeStyle = '#1d140e'; x.lineWidth = 4; x.beginPath();
  for (let u = BRIDGE[0]; u < BRIDGE[1]; u += T) {
    const p = near(u), q = near(u + T);
    if (q > v.viewW + 10 || p < -10) continue;
    const up = Math.round((u - BRIDGE[0]) / T) % 2 === 0;
    x.moveTo(p, up ? sill + 6 : top + 6); x.lineTo(q, up ? top + 6 : sill + 6); x.moveTo(p, top + 6); x.lineTo(p, sill + 6);
  }
  x.stroke();
  x.strokeStyle = 'rgba(' + O + ',.4)'; x.lineWidth = 1; x.stroke();
  box(x, a, top, b - a, 8, '#1d140e', 'rgba(' + O + ',.5)');
  box(x, a, sill + 2, b - a, 8, '#1d140e', 'rgba(' + O + ',.5)');
  // the pylons at the ends
  for (const u of BRIDGE) {
    const s = near(u);
    if (s < -40 || s > v.viewW + 40) continue;
    box(x, Math.round(s) - 16, top - 10, 32, bottom - top + 20, '#140e0a', 'rgba(' + O + ',.6)');
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(v.t * 0.05 + u) > 0 ? 0.9 : 0.25) + ')'; x.fillRect(Math.round(s) - 2, top + 4, 4, 4);
  }
}

/**
 * The old siding before the harbor (P14), on no map: a short stub of platform beside the track,
 * its edge line worn off, a dead lamp, a blank name plate painted over, and a concrete stair
 * housing with a service door and one caged bulb. At speed it is gone in under a second.
 */
function drawSiding(x: CanvasRenderingContext2D, v: View, near: (u: number) => number, top: number, sill: number, t: number) {
  const a = near(SIDING + 200), b = near(SIDING - 200);
  if (b < -10 || a > v.viewW + 10) return;
  // (raised a little over the sill, so the platform's edge shows in the windows)
  const base = sill - 6;
  // the platform slab and its worn edge
  box(x, Math.round(a), base - 12, Math.round(b - a), 40, '#0d0b09', 'rgba(' + O + ',.35)');
  x.fillStyle = 'rgba(255,210,58,.18)'; for (let u = SIDING - 196; u < SIDING + 196; u += 22) { const s = near(u); if ((u * 7) % 5 > 1) x.fillRect(Math.round(s), base - 11, 12, 1); }
  // the stair housing: a concrete box, its service door, a caged bulb (the only light here)
  const h = near(SIDING - 60), hw = 96;
  box(x, Math.round(h - hw / 2), top + 10, hw, base - 12 - top - 10, '#100d0b', 'rgba(' + O + ',.45)');
  box(x, Math.round(h - 12), base - 52, 24, 40, '#060504', 'rgba(' + O + ',.5)');
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(Math.round(h + 7), base - 33, 2, 4);
  const on = Math.floor(t / 7) % 23 !== 0;
  x.fillStyle = on ? 'rgba(200,230,210,.85)' : 'rgba(200,230,210,.2)'; x.fillRect(Math.round(h - 2), base - 60, 4, 4);
  if (on) { const g = x.createRadialGradient(h, base - 58, 1, h, base - 58, 40); g.addColorStop(0, 'rgba(200,230,210,.16)'); g.addColorStop(1, 'rgba(200,230,210,0)'); x.fillStyle = g; x.fillRect(Math.round(h - 40), base - 98, 80, 80); }
  box(x, Math.round(h - 32), base - 76, 64, 11, '#16120e', 'rgba(' + O + ',.5)');
  text(x, 'AUTHORISED PERSONNEL', h, base - 70, 'rgba(' + PAPER + ',.55)', 6, '600');
  // the name plate on its post, painted over: no name
  const p = near(SIDING + 110);
  x.fillStyle = '#0a0806'; x.fillRect(Math.round(p) - 1, base - 66, 3, 54);
  box(x, Math.round(p) - 30, base - 80, 60, 16, '#14100c', 'rgba(' + O + ',.5)');
  box(x, Math.round(p) - 27, base - 77, 12, 10, 'rgba(' + O + ',.35)');
  x.fillStyle = 'rgba(40,36,32,.95)'; x.fillRect(Math.round(p) - 12, base - 77, 38, 10);
  // a dead lamp at the far end
  const l = near(SIDING + 180);
  x.fillStyle = '#0a0806'; x.fillRect(Math.round(l), top + 20, 3, base - 12 - top - 20); x.fillRect(Math.round(l) - 8, top + 20, 11, 3);
  x.fillStyle = 'rgba(' + PAPER + ',.12)'; x.fillRect(Math.round(l) - 8, top + 23, 6, 2);
  // the stencil on the slab's face
  text(x, 'SIDING H · OUT OF USE', near(SIDING + 20), base + 2, 'rgba(' + PAPER + ',.35)', 6, '600');
}

/** The canyon's skywalks: lit tubes between the towers, crossing over the line. */
function drawSkywalks(x: CanvasRenderingContext2D, v: View, near: (u: number) => number, top: number) {
  for (let u = 2 * SEG + WORLD.district + 160; u < 3 * SEG - WORLD.district; u += 520) {
    const s = near(u);
    if (s < -140 || s > v.viewW + 140) continue;
    box(x, Math.round(s) - 120, top + 4, 240, 14, '#140c08', 'rgba(' + O + ',.6)');
    x.fillStyle = 'rgba(255,217,165,.35)'; for (let k = -112; k < 112; k += 10) x.fillRect(Math.round(s) + k, top + 8, 6, 5);
  }
}

function drawOutside(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = y(L.win.h1), sill = y(L.win.h0), bottom = y(28);
  const { near, far } = lanes(v), F = WORLD.far;
  x.save(); x.beginPath();
  for (const wx of L.windows) { const s = v.sx(wx); if (onScreen(v, s, L.winW)) x.rect(s + 3, top + 3, L.winW - 6, sill - top - 6); }
  for (const d of L.doors) { const s = v.sx(d); x.rect(s - 18, y(56), 12, 22); x.rect(s + 6, y(56), 12, 22); }
  x.clip();
  // the night sky with the city's glow low down
  const g = x.createLinearGradient(0, top, 0, sill);
  g.addColorStop(0, '#05030c'); g.addColorStop(1, '#1a0904');
  x.fillStyle = g; x.fillRect(0, top, v.viewW, bottom - top);
  // far: the skyline, sliding slowly, each district's landmark over its stop
  for (const b of SKY) {
    const s = far(b.x);
    if (s > v.viewW || s + b.w < 0) continue;
    const bh = b.h * 0.5;
    x.fillStyle = '#0c0604'; x.fillRect(s, sill - bh, b.w, bh + 30);
    x.strokeStyle = 'rgba(194,65,12,.3)'; x.strokeRect(s + 0.5, sill - bh + 0.5, b.w - 1, bh + 30);
    x.fillStyle = 'rgba(255,136,0,.45)';
    for (let i = 0; i < b.lit.length; i += 2) if (b.lit[i + 1] * 0.5 < bh - 3) x.fillRect(s + b.lit[i], sill - bh + b.lit[i + 1] * 0.5, 2, 2);
  }
  for (let i = 0; i < 3; i++) { const s = far((i * SEG * F) % (LOOP * F)); if (s > -120 && s < v.viewW + 120) drawLandmark(x, i, s, sill + 4, t); }
  // the harbor's water, under everything near it
  { const h0 = near(2 * SEG + WORLD.district), h1 = near(2 * SEG - WORLD.district); if (h1 > 0 && h0 < v.viewW) { x.fillStyle = '#01040a'; x.fillRect(h0, sill - 10, h1 - h0, bottom - sill + 10); } }
  drawBridge(x, v, near, far, top, sill, bottom);
  // near: what stands by the track, going past at the train's speed, a mast every so often
  for (const th of NEAR) {
    const s = near(th.u);
    if (s + th.w / 2 < 0 || s - th.w / 2 > v.viewW) continue;
    drawThing(x, th, s, sill + 8, top, t);
  }
  drawSkywalks(x, v, near, top);
  for (let u = 0; u < LOOP; u += WORLD.mast) {
    const s = near(u), r = regionAt(u);
    if (s < -6 || s > v.viewW + 6 || r === 'tunnel' || r === 'bridge' || r === 'canyon') continue;
    x.fillStyle = '#030101'; x.fillRect(Math.round(s), top, 4, bottom - top);
  }
  drawTunnel(x, near, top, bottom, v);
  drawSiding(x, v, near, top, sill, t);
  for (let i = 0; i < 3; i++) drawPlatform(x, i, near, top, sill, v);
  // rain on the glass, blown sideways (not in the tunnel)
  if (regionAt(ride.pos) !== 'tunnel') {
    x.strokeStyle = 'rgba(170,210,255,.2)';
    for (const [sx0, sy] of STREAKS) {
      const s = ((sx0 - t * 3) % 1200 + 1200) % 1200 - 50;
      x.beginPath(); x.moveTo(s, top + sy); x.lineTo(s + 6, top + sy + 1); x.stroke();
    }
  }
  x.restore();
}

/**
 * Everything over the car's ceiling, so a tall screen sees the train in
 * cutaway rather than a void: the ceiling cove, the roof shell with its air-con
 * boxes and pantograph, and outside what the windows show, taller: the sky
 * and the far city with the contact wire on its masts; the canyon's towers
 * running up out of the view; the bridge's truss overhead; the tunnel's vault.
 */
function drawRoof(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { sx, y, t } = v, top = v.gy;
  if (top <= L.ceil) return;
  const c0 = L.ceil, s0 = c0 + ROOF.cove, s1 = s0 + ROOF.shell, roof = y(s1);
  const { near, far } = lanes(v), here = regionAt(ride.pos);
  if (here === 'tunnel') {
    x.fillStyle = '#060403'; x.fillRect(0, 0, v.viewW, roof);
    x.fillStyle = 'rgba(' + O + ',.12)';
    for (let u = SEG - WORLD.tunnel; u < SEG + WORLD.tunnel; u += 40) { const s = near(u); if (s >= -2 && s <= v.viewW) x.fillRect(Math.round(s), 0, 2, roof); }
    for (let u = SEG - WORLD.tunnel + 80; u < SEG + WORLD.tunnel; u += 160) { const s = near(u); if (s >= -10 && s <= v.viewW + 10) { x.fillStyle = 'rgba(255,230,190,.5)'; x.fillRect(Math.round(s) - 6, y(s1 + 40), 12, 3); } }
  } else {
    // far band: night sky with the city's glow low down, the city sliding past slowly
    const glow = x.createLinearGradient(0, y(s1 + 140), 0, roof);
    glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
    x.fillStyle = '#03020a'; x.fillRect(0, 0, v.viewW, roof);
    x.fillStyle = glow; x.fillRect(0, y(s1 + 140), v.viewW, 140);
    for (const b of SKY_HIGH) {
      const s = far(b.x), bh = b.h * 0.7;
      if (s > v.viewW || s + b.w < 0) continue;
      x.fillStyle = '#070302'; x.fillRect(s, roof - bh, b.w, bh);
      x.strokeStyle = 'rgba(194,65,12,.12)'; x.strokeRect(s + 0.5, roof - bh + 0.5, b.w - 1, bh);
      x.fillStyle = 'rgba(255,136,0,.25)';
      for (let i = 0; i < b.lit.length; i += 4) if (b.lit[i + 1] < bh) x.fillRect(s + b.lit[i], roof - bh + b.lit[i + 1], 2, 1);
    }
    // middle band: the canyon's towers running up past the roof, their windows lit
    for (const th of NEAR) {
      if (th.region !== 'canyon') continue;
      const s = near(th.u), left = Math.round(s - th.w / 2);
      if (left > v.viewW || left + th.w < 0) continue;
      box(x, left, 0, Math.round(th.w), roof, '#0a0504', 'rgba(' + O + ',.35)');
      litWindows(x, th.seed + 7, left, 0, th.w, roof - 4, 0.35, 'rgba(255,190,110,.35)');
    }
    // the contact wire's masts, where there is no bridge or canyon to hang it from
    for (let m = 0; m < LOOP; m += WORLD.mast) {
      const s = near(m), r = regionAt(m);
      if (s < -60 || s > v.viewW + 10 || r === 'tunnel' || r === 'bridge' || r === 'canyon') continue;
      x.fillStyle = '#0a0605'; x.fillRect(s, 0, 5, roof);
      x.strokeStyle = 'rgba(194,65,12,.25)'; x.strokeRect(s + 0.5, -1, 4, roof + 1);
      x.fillStyle = '#0a0605'; x.fillRect(s - 50, y(s1 + ROOF.messenger + 8), 55, 3);
    }
    // the bridge's truss overhead: its top chord, diagonals down to the deck
    const a = near(BRIDGE[1]), b = near(BRIDGE[0]);
    if (b > 0 && a < v.viewW) {
      const ch = y(s1 + 120);
      x.strokeStyle = '#1d140e'; x.lineWidth = 4; x.beginPath();
      for (let u = BRIDGE[0]; u < BRIDGE[1]; u += WORLD.truss) {
        const p = near(u), q = near(u + WORLD.truss);
        if (q > v.viewW + 10 || p < -10) continue;
        const up = Math.round((u - BRIDGE[0]) / WORLD.truss) % 2 === 0;
        x.moveTo(p, up ? roof : ch); x.lineTo(q, up ? ch : roof); x.moveTo(p, ch); x.lineTo(p, roof);
      }
      x.stroke(); x.strokeStyle = 'rgba(' + O + ',.35)'; x.lineWidth = 1; x.stroke();
      box(x, Math.max(0, a), ch - 6, Math.min(v.viewW, b) - Math.max(0, a), 8, '#1d140e', 'rgba(' + O + ',.5)');
    }
  }
  x.fillStyle = 'rgba(160,150,140,.3)'; x.fillRect(0, y(s1 + ROOF.wire), v.viewW, 1); x.fillRect(0, y(s1 + ROOF.messenger), v.viewW, 1);

  // the car: ceiling cove, then the roof shell
  box(x, w0, y(s0), w1 - w0, ROOF.cove, '#0c0907');
  for (let wx = 60; wx < L.width - 80; wx += 120) { const s = sx(wx); if (!onScreen(v, s, 40)) continue; x.fillStyle = 'rgba(' + O + ',.14)'; for (let k = 0; k < 4; k++) x.fillRect(s + k * 9, y(c0 + 9), 6, 1); }
  box(x, w0, roof, w1 - w0, ROOF.shell, '#16100c');
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, roof, w1 - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(w0, y(s0), w1 - w0, 1);
  // on the roof: air-con boxes and the pantograph up to the wire
  for (const a of ROOF.ac) {
    const s = sx(a);
    if (!onScreen(v, s, 90)) continue;
    box(x, s, y(s1 + 14), 90, 14, '#120c09', 'rgba(' + O + ',.45)');
    x.fillStyle = 'rgba(' + O + ',.15)'; for (let k = 8; k < 84; k += 6) x.fillRect(s + k, y(s1 + 11), 2, 8);
  }
  const p = sx(ROOF.panto), wire = s1 + ROOF.wire;
  if (onScreen(v, p - 40, 80)) {
    box(x, p - 24, y(s1 + 5), 48, 5, '#120c09', 'rgba(' + O + ',.45)');
    const sway = Math.round(Math.sin(t * 0.07) * 2);
    x.strokeStyle = 'rgba(160,150,140,.45)'; x.beginPath();
    x.moveTo(p - 18, y(s1 + 5)); x.lineTo(p + 12, y((s1 + wire) / 2)); x.lineTo(p - 6 + sway, y(wire - 2));
    x.moveTo(p + 18, y(s1 + 5)); x.lineTo(p + 12, y((s1 + wire) / 2)); x.stroke();
    x.fillStyle = 'rgba(160,150,140,.6)'; x.fillRect(p - 22 + sway, y(wire - 1), 32, 2);
    if (ride.phase === 'running' && Math.floor(t) % 173 < 3) { x.fillStyle = 'rgba(170,210,255,.8)'; x.fillRect(p - 8 + sway, y(wire + 2), 3, 3); }
  }
}

/** The line map: the loop's three stops, the one you stand at lit, a dot for the train between them. */
function drawLineMap(x: CanvasRenderingContext2D, v: View, mp: number) {
  const { y, t } = v;
  box(x, mp - 44, y(160), 88, 26, '#1a120b', 'rgba(' + O + ',.6)');
  text(x, 'LINE 0 · LOOP', mp, y(154), 'rgba(' + PAPER + ',.7)', 7, '600');
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.strokeRect(mp - 32.5, y(148) + 0.5, 64, 6);
  const stopX = (i: number) => mp - 30 + i * 30;
  for (let i = 0; i < 3; i++) {
    const here = !between() && i === ride.at;
    // a closed stop: a red cross where its dot would be
    if (!lineOpen[LINE[i]]) { x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(stopX(i) - 1, y(152), 4, 1); x.fillRect(stopX(i) - 1, y(149), 4, 1); continue; }
    x.fillStyle = here && Math.floor(t / 25) % 2 ? 'rgba(255,136,0,1)' : 'rgba(' + PAPER + ',.65)'; x.fillRect(stopX(i) - 1, y(150), 4, 4);
  }
  if (between()) {
    // the train, from where it is on the loop: east along the top past the stops, back along the bottom
    const u = ride.pos / SEG, back = u > 2, px = back ? stopX(2) - (u - 2) * 60 : stopX(0) + u * 30, py = back ? y(143) : y(149);
    x.fillStyle = 'rgba(255,136,0,' + (Math.floor(t / 12) % 2 ? 1 : 0.5) + ')'; x.fillRect(Math.round(px), py, 3, 3);
  }
  tell(x, t, mp + 40, y(138), 1);
}

/** The display over a door: the stop (or the next one), a countdown, and the ticker. */
function drawDoorDisplay(x: CanvasRenderingContext2D, v: View, s: number) {
  const { y, t } = v;
  box(x, s - 50, y(106), 100, 34, '#050302', 'rgba(' + O + ',.6)');
  const hot = ride.phase !== 'dwell' || ride.timer < 120, stopped = ride.phase === 'braking' || ride.phase === 'halted';
  text(x, ride.say, s, y(99), stopped ? 'rgba(255,90,80,' + (0.7 + 0.3 * Math.sin(t * 0.2)) + ')' : 'rgba(255,136,0,' + (hot ? 0.75 + 0.25 * Math.sin(t * 0.12) : 0.95) + ')', 8, '600');
  const time = stopped ? 'PLEASE WAIT' : between() || ride.phase === 'closing' ? 'ARRIVES IN ' + clock(rideDue()) : ride.phase === 'dwell' ? 'DEPARTS IN ' + clock(Math.max(0, ride.dwell - ride.timer)) : 'DOORS OPENING';
  text(x, time, s, y(89), 'rgba(' + PAPER + ',.8)', 7, '600');
  ticker(x, t, s - 46, y(79), 92, 'NEXT: ' + STATIONS[rideNext()].name, 0.6);
  // the door's lamp: green while it is open
  x.fillStyle = rideOpen() ? 'rgba(34,197,94,.95)' : 'rgba(' + RED + ',.5)'; x.fillRect(s + 44, y(70), 3, 3);
}

/** A camera in the ceiling, its red light recording. */
function drawCam(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 10, 20)) return;
  box(x, s - 7, y(L.ceil - 1), 14, 5, '#100c0a', 'rgba(' + O + ',.6)');
  x.fillStyle = '#16100c'; x.beginPath(); x.arc(s, y(L.ceil - 6), 5, 0, Math.PI); x.fill();
  x.fillStyle = Math.floor((t + wx) / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(s - 1, y(L.ceil - 8), 2, 2);
}

/** A random rider is never dressed as one of the regulars (so there is one punk, not three). */
const notRegular = (k: RiderKind): RiderKind => { let i = KINDS.indexOf(k); while (L.people.some((p) => p.kind === KINDS[i])) i = (i + 3) % KINDS.length; return KINDS[i]; };

/** The people in the car this leg: seated under the windows, a few standing by the poles. They change at every stop. */
function drawRiders(x: CanvasRenderingContext2D, v: View) {
  const { sx, y, t } = v, folk = crowd(500 + ride.at * 31, L.windows.length * 2 + L.standing.length);
  const regular = (px: number) => L.people.some((p) => Math.abs(p.x - px) < 16);
  L.windows.forEach((wx, i) => {
    for (const k of [0, 1]) {
      const f = folk[i * 2 + k], s = sx(wx + 25 + k * 50);
      if (!f.on || regular(wx + 25 + k * 50) || !onScreen(v, s - 16, 32)) continue;
      drawRider(x, notRegular(f.kind), s, y(0), t, { sit: true, flip: f.flip, phase: f.phase });
    }
  });
  L.standing.forEach((px, i) => {
    const f = folk[L.windows.length * 2 + i], s = sx(px + (f.flip ? -10 : 10));
    if (!f.on || regular(px) || !onScreen(v, s - 16, 32)) return;
    drawRider(x, notRegular(f.kind), s, y(0), t, { flip: f.flip, phase: f.phase });
  });
  for (const p of L.people) { const s = sx(p.x); if (onScreen(v, s - 16, 32)) drawRider(x, p.kind, s, y(0), t, { sit: p.sit, flip: p.x > 600, phase: p.x }); }
}

export const train: SceneDef = {
  id: 'train',
  name: 'Metro car',
  width: L.width,
  spawn: L.spawn,
  intro: ['The metro car. It stops everywhere and asks nothing. Getting off at the right stop is up to me.'],
  exits: [
    { id: 'line', x: L.lineMap, to: '', action: 'map', label: '[E] LINE MAP', promptH: 172 },
    { id: 'out', x: L.doors[1], to: '', action: 'out', label: '[E] STEP OUT', promptH: 114 },
    { id: 'out2', x: L.doors[0], to: '', action: 'out', label: '[E] STEP OUT', promptH: 114 },
  ],
  readables: [
    { id: 'staff', x: L.staff, name: 'STAFF DOOR', promptH: 86, pages: ['STAFF ONLY. LOCKED.', 'NO PASSENGER ACCESS.'] },
    { id: 'ad', x: 640, name: 'NOTICE', promptH: 170, pages: ['CAMERAS OPERATE IN THIS CAR.', 'RECORDINGS ARE KEPT FOR THE DURATION OF THE PASSENGER PLUS 90 DAYS.'] },
    { id: 'gangway', x: L.gangDoor, name: 'TO CAR 2', promptH: 132, pages: ['CAR 2 · LOCKED.', 'INTER-CAR TRAVEL SUSPENDED UNTIL FURTHER NOTICE.'] },
    ...L.people.map((p) => ({ id: p.id, x: p.x, name: p.name, pages: p.pages, label: '[E] TALK', promptH: p.sit ? 56 : 62 })),
  ],
  // TRAIN-0's emergency panel by the brake: P14 (data/train.json, train0.ts)
  data: TRAIN,
  rules: TRAIN_RULES,

  drawBackdrop(x, v, e) {
    const { sx, y, t, gy } = v, w0 = sx(0), w1 = sx(L.width);
    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
    // middle band: the car's wall, windows cut into it
    box(x, w0, y(L.ceil), w1 - w0, L.ceil, '#0e0a08');
    box(x, w0, y(L.win.h0), w1 - w0, L.win.h0, '#130d0a');
    drawOutside(x, v);
    for (const wx of L.windows) {
      const s = sx(wx);
      if (!onScreen(v, s, L.winW)) continue;
      x.strokeStyle = 'rgba(' + O + ',.75)'; x.lineWidth = 3; x.strokeRect(s + 1.5, y(L.win.h1) + 1.5, L.winW - 3, L.win.h1 - L.win.h0 - 3); x.lineWidth = 1;
    }
    drawRoof(x, v, w0, w1);
    box(x, w0, y(L.ceil - 2), w1 - w0, 3, 'rgba(255,240,215,.75)');
    const g = x.createLinearGradient(0, y(L.ceil), 0, y(L.ceil - 40));
    g.addColorStop(0, 'rgba(255,240,215,.08)'); g.addColorStop(1, 'rgba(255,240,215,0)');
    x.fillStyle = g; x.fillRect(w0, y(L.ceil), w1 - w0, 40);
    for (const a of L.ads) {
      const s = sx(a.x);
      if (!onScreen(v, s - 72, 144)) continue;
      box(x, s - 70, y(156), 140, 16, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, a.text, s - 2, y(148), 'rgba(' + PAPER + ',.75)', 7, '600');
    }
    tell(x, t, sx(640) + 65, y(148));
    for (const c of L.cams) drawCam(x, v, c);
    const mp = sx(L.lineMap);
    if (onScreen(v, mp - 48, 96)) drawLineMap(x, v, mp);

    // the staff door at this end: shut, a red lock light, its plate
    const ed = sx(L.staff);
    if (onScreen(v, ed - 16, 32)) {
      box(x, ed - 14, y(56), 28, 56, '#020100', 'rgba(' + O + ',.6)');
      box(x, ed - 11, y(52), 22, 52, '#0a0603', 'rgba(' + O + ',.35)');
      box(x, ed - 12, y(70), 24, 10, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'STAFF', ed, y(65), 'rgba(' + PAPER + ',.7)', 7, '600');
      x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(ed + 6, y(32), 3, 3);
      tell(x, t, ed + 10, y(66), 1);
    }
    // the gangway at the far end: its door to car 2 (locked), the brake, the Registry's screen over them
    const gw = sx(L.gangway);
    if (onScreen(v, gw, 80)) {
      box(x, gw, y(L.ceil), L.width - L.gangway, L.ceil, '#16100c', 'rgba(' + O + ',.8)');
      const D = 56, gd = sx(L.gangDoor), bk = sx(L.brake);
      box(x, gd - 17, y(D), 34, D, '#0c0806', 'rgba(' + O + ',.6)');
      x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(gd - 12, y(D - 6), 24, 20);
      x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(gd + 10, y(30), 3, 3);
      box(x, gw + 2, y(D + 18), 66, 12, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'CAR 3 OF 3', gw + 35, y(D + 12), 'rgba(' + PAPER + ',.8)', 7, '600');
      tell(x, t, gw + 64, y(D + 8), 3);
      // the emergency brake (TRAIN-0's panel): a red handle on a plate, pulled down while the train is stopped by it; the pass reader under it
      const pulled = ride.phase === 'braking' || ride.phase === 'halted';
      box(x, bk - 12, y(60), 24, 8, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'EMERGENCY', bk, y(56), 'rgba(' + PAPER + ',.75)', 5, '600');
      box(x, bk - 8, y(52), 16, 22, '#1a0a0a', 'rgba(' + RED + ',.8)');
      x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bk - 4, y(pulled ? 37 : 46), 8, 3);
      box(x, bk - 6, y(28), 12, 6, '#0d1416', 'rgba(' + O + ',.5)');
      x.fillStyle = pulled ? 'rgba(34,197,94,.9)' : 'rgba(' + O + ',.6)'; x.fillRect(bk - 4, y(26), 2, 2);
      tell(x, t, bk + 4, y(34), 2);
      if (e.hover === 'train') { x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8; x.strokeRect(bk - 15.5, y(62) - 3.5, 31, 47); x.restore(); }
      // the Registry's screen: what it wants from you today, a red REC light
      box(x, gw + 4, y(124), 62, 30, '#0a0604', 'rgba(' + O + ',.6)');
      const lines = [['KEEP YOUR ID', 'VISIBLE'], ['ALL JOURNEYS', 'RECORDED'], ['REPORT', 'IRREGULARITIES']][Math.floor(t / 180) % 3];
      text(x, lines[0], gw + 35, y(114), 'rgba(255,200,170,.85)', 7, '600'); text(x, lines[1], gw + 35, y(104), 'rgba(255,200,170,.85)', 7, '600');
      x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(gw + 60, y(121), 2, 2);
    }

    // both doors: they slide open at a stop; over each, its display
    for (const d of L.doors) {
      const s = sx(d);
      if (!onScreen(v, s - 52, 104)) continue;
      const g = Math.round(ride.open * 22);
      box(x, s - 24, y(66), 48, 66, '#100c0a', 'rgba(' + O + ',.8)');
      if (g) {
        // the platform through the open doors, lit, its light spilling onto the car's floor
        // (at the old siding: no platform lights, only the stair's one cold bulb)
        box(x, s - g, y(64), g * 2, 64, rideAtSiding() ? 'rgba(200,230,210,.12)' : 'rgba(255,217,165,.3)');
        x.fillStyle = 'rgba(255,210,58,.6)'; x.fillRect(s - g, y(2), g * 2, 2);
        x.fillStyle = '#100c0a'; x.fillRect(s - 24, y(64), 24 - g, 64); x.fillRect(s + g, y(64), 24 - g, 64);
        x.fillStyle = 'rgba(255,217,165,.07)'; x.fillRect(s - g - 6, gy, g * 2 + 12, 20);
      } else { x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s, y(66), 1, 66); }
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.strokeRect(s - 18.5 - g, y(56) + 0.5, 12, 22); x.strokeRect(s + 6.5 + g, y(56) + 0.5, 12, 22);
      drawDoorDisplay(x, v, s);
    }

    // play band: benches under the windows, the people on them and by the poles
    for (const wx of L.windows) {
      const s = sx(wx);
      if (!onScreen(v, s - 4, L.winW + 8)) continue;
      box(x, s - 2, y(46), L.winW + 4, 34, '#14262a', 'rgba(' + O + ',.6)');
      box(x, s + 4, y(SEAT_H - 3), L.winW - 8, SEAT_H - 3, '#0a0706');
    }
    drawRiders(x, v);
    for (const wx of L.windows) {
      const s = sx(wx);
      if (onScreen(v, s - 4, L.winW + 8)) box(x, s - 4, y(SEAT_H + 1), L.winW + 8, 4, '#1c3237', 'rgba(' + O + ',.8)');
    }
    // the handrail and its straps, swinging harder while the metro runs
    const swing = ride.phase === 'running' ? 2 + 2 * Math.sin(Math.PI * rideRun()) : 1;
    x.fillStyle = 'rgba(255,190,110,.6)'; x.fillRect(w0, y(L.bar), w1 - w0, 2);
    for (let wx = 60; wx < L.gangway; wx += 30) {
      const s = sx(wx);
      if (s < -6 || s > v.viewW + 6) continue;
      const sw = Math.round(Math.sin(t * 0.05 + wx * 0.02) * swing);
      x.strokeStyle = 'rgba(255,190,110,.4)'; x.beginPath(); x.moveTo(s + 0.5, y(L.bar - 2)); x.lineTo(s + 0.5 + sw, y(L.bar - 12)); x.stroke();
      x.strokeRect(s - 2.5 + sw, y(L.bar - 12) + 0.5, 6, 5);
    }
    for (const p of L.poles) drawPole(x, v, p);

    // the floor
    x.fillStyle = '#070504'; x.fillRect(w0, gy, w1 - w0, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(w0, gy, w1 - w0, 1);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,217,165,.035)'; x.fillRect(w0, gy + 6 + i * 10, w1 - w0, 2); }
  },

  drawFront(x, v) {
    for (const p of L.frontPoles) drawPole(x, v, p);
  },
};

function drawPole(x: CanvasRenderingContext2D, v: View, wx: number) {
  const s = v.sx(wx);
  if (s < -4 || s > v.viewW + 4) return;
  box(x, s - 1, v.y(L.ceil), 3, L.ceil, 'rgba(255,190,110,.55)');
  x.fillStyle = 'rgba(255,240,215,.7)'; x.fillRect(s - 1, v.y(L.ceil), 1, L.ceil);
}

