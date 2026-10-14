/**
 * Inside a train carriage on LINE 0: bench seats under the windows, handrails
 * and swaying straps, a few riders, and the city going past outside. Bands:
 * far = the city through the windows and, on tall screens, over the roof;
 * middle = the carriage wall, ad cards, the roof in cutaway and the wires above
 * it; play = seats, riders, poles and straps.
 *
 * The ride itself is line.ts (`ride`): the car stands at a stop with its doors
 * open, closes, runs to the next stop, opens. `ride.pos` is where it is on the
 * loop, and the world outside is laid along that loop: Downtown's towers, the
 * stretch of warehouses and masts, the mall's glass front and the tunnel under
 * it to Galleria, the stretch again, the harbor's containers and cranes, the
 * stretch back to Downtown. At a stop the platform with its name stands outside.
 */

import { LINE, STATIONS } from '../city';
import { box, O, onScreen, PAPER, RED, rng, tell, text, towers, type Scene, type View } from './kit';
import { LOOP, ride, rideOpen, rideRun, SEG } from './line';

/** Layout: positions in world units, heights up from the carriage floor. */
const L = {
  width: 1200,
  spawn: 86,
  ceil: 150,
  /** Windows (left edges) with a bench seat under each; doors (centres) between them. */
  windows: [70, 200, 460, 590, 860, 990],
  winW: 100,
  win: { h0: 58, h1: 112 },
  doors: [380, 780],
  /** The door that opens at a stop (the other one carries the line map and stays shut). */
  outDoor: 780,
  lineMap: 380,
  /** Ad cards over the windows. */
  ads: [{ x: 250, text: 'LOSE WEIGHT: DELETE PROFILE' }, { x: 640, text: 'AD SPACE · YOU ARE READING IT' }, { x: 1040, text: 'SMILE · YOU ARE ON CAMERA' }],
  poles: [180, 330, 560, 720, 950],
  frontPoles: [430, 880],
  bar: 126,
  /** Riders on the benches: [x, phone]. */
  riders: [[96, 0], [150, 1], [520, 0], [628, 0], [906, 1], [1060, 0]],
  gangway: 1130,
  gangDoor: 56,
  brake: 1145,
};

/** Above the carriage, for tall screens (heights): the roof shell, the contact wire, the wire over it. */
const ROOF = { cove: 14, shell: 12, ac: [300, 900], panto: 610, wire: 232, messenger: 254, mast: 340 };

// ---------- the world along the loop ----------

/**
 * What lies along LINE 0, in track units from Downtown's platform (the loop is
 * LOOP long, a stop every SEG). Each stop's district reaches `district` either
 * side of it; the tunnel under the mall reaches `tunnel` either side of
 * Galleria; a platform stands `platform` either side of each stop.
 */
const WORLD = { district: 1150, tunnel: 470, platform: 430, far: 0.2, mast: 340 };
type Region = 'downtown' | 'mall' | 'tunnel' | 'harbor' | 'between';

/** Signed distance from `pos` to `u` the short way round the loop. */
const wrap = (d: number, len = LOOP) => ((((d + len / 2) % len) + len) % len) - len / 2;

function regionAt(u: number): Region {
  const i = ((Math.round(u / SEG) % 3) + 3) % 3, d = Math.abs(wrap(u - i * SEG));
  if (d > WORLD.district) return 'between';
  return i === 0 ? 'downtown' : i === 1 ? (d < WORLD.tunnel ? 'tunnel' : 'mall') : 'harbor';
}

/** Something by the track, laid out once along the loop: where (its centre), how wide and tall (above the window's sill), what it is. */
interface Thing { u: number; w: number; h: number; region: Region; seed: number; sign?: string }
const SIGNS = ['NOODLES', 'HOTEL', '24/7', 'REPAIR', 'PAWN', 'KARAOKE'];
const NEAR: Thing[] = (() => {
  const r = rng(211), out: Thing[] = [];
  for (let u = 0; u < LOOP;) {
    const region = regionAt(u);
    if (region === 'tunnel') { u += 40; continue; }
    const w = region === 'downtown' ? 44 + r() * 50 : region === 'mall' ? 120 + r() * 60 : region === 'harbor' ? 64 : 50 + r() * 80;
    const h = region === 'downtown' ? 50 + r() * 60 : region === 'mall' ? 80 : region === 'harbor' ? 14 * (1 + Math.floor(r() * 3)) : 8 + r() * 26;
    out.push({ u: u + w / 2, w, h, region, seed: Math.floor(r() * 1000), sign: region === 'downtown' && r() < 0.3 ? SIGNS[Math.floor(r() * SIGNS.length)] : undefined });
    u += w + (region === 'harbor' ? 6 + r() * 40 : region === 'downtown' ? 4 + r() * 14 : 10 + r() * 30);
  }
  return out;
})();
/** The far city, in the far layer's own units (the loop × WORLD.far). */
const SKY = towers(97, LOOP * WORLD.far, [24, 70], [40, 130], 0.12);
/** The far city over the roof: taller than what the windows show, and dimmer. */
const SKY_HIGH = towers(103, LOOP * WORLD.far, [20, 60], [60, 220], 0.08);
const STREAKS = (() => { const r = rng(101); return Array.from({ length: 18 }, () => [r() * 1200, r() * 54]); })();
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

/** True while the car is in the tunnel under the mall. */
const inTunnel = () => regionAt(ride.pos) === 'tunnel';

/** A district's landmark on the far skyline, over its stop: Downtown's antenna, the mall's glass dome, the harbor's cranes. */
function drawLandmark(x: CanvasRenderingContext2D, i: number, s: number, base: number, t: number) {
  if (i === 0) {
    x.fillStyle = '#080403'; x.fillRect(s - 6, base - 150, 12, 150); x.fillRect(s - 1, base - 210, 2, 60);
    x.strokeStyle = 'rgba(194,65,12,.3)'; x.strokeRect(s - 5.5, base - 149.5, 11, 150);
    x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.05) > 0 ? 0.85 : 0.2) + ')'; x.fillRect(s - 1, base - 213, 3, 3);
  } else if (i === 1) {
    x.fillStyle = '#0a0605'; x.beginPath(); x.ellipse(s, base - 40, 70, 34, 0, Math.PI, 0); x.fill(); x.fillRect(s - 80, base - 40, 160, 40);
    x.strokeStyle = 'rgba(255,190,110,.3)'; x.beginPath(); x.ellipse(s, base - 40, 70, 34, 0, Math.PI, 0); x.stroke();
    x.fillStyle = 'rgba(255,190,110,.12)'; for (let k = -60; k <= 60; k += 15) x.fillRect(s + k, base - 40 - Math.sqrt(Math.max(0, 1 - (k / 70) ** 2)) * 30, 1, 30);
    text(x, 'GALLERIA', s, base - 28, 'rgba(255,217,165,.35)', 7, '600');
  } else {
    for (const dx of [-60, 30]) {
      x.strokeStyle = 'rgba(194,65,12,.35)'; x.lineWidth = 2; x.beginPath();
      x.moveTo(s + dx - 14, base); x.lineTo(s + dx - 14, base - 90); x.moveTo(s + dx + 14, base); x.lineTo(s + dx + 14, base - 90);
      x.moveTo(s + dx - 60, base - 84); x.lineTo(s + dx + 40, base - 84); x.moveTo(s + dx - 14, base - 90); x.lineTo(s + dx, base - 118); x.lineTo(s + dx + 14, base - 90);
      x.stroke(); x.lineWidth = 1;
      x.fillStyle = 'rgba(' + RED + ',' + (Math.sin(t * 0.04 + dx) > 0 ? 0.8 : 0.2) + ')'; x.fillRect(s + dx - 1, base - 121, 3, 3);
    }
  }
}

/** One thing by the track, its foot below the sill at `base`. */
function drawThing(x: CanvasRenderingContext2D, th: Thing, s: number, base: number, t: number) {
  const left = Math.round(s - th.w / 2), w = Math.round(th.w), top = Math.round(base - th.h);
  if (th.region === 'downtown') {
    box(x, left, top, w, th.h + 30, '#0b0605', 'rgba(' + O + ',.45)');
    const r = rng(th.seed);
    for (let yy = top + 6; yy < base + 24; yy += 9) for (let xx = left + 5; xx < left + w - 6; xx += 8) if (r() < 0.35) { x.fillStyle = 'rgba(255,190,110,.4)'; x.fillRect(xx, yy, 3, 4); }
    if (th.sign) {
      const sw = th.sign.length * 6 + 10, sy = top + 16;
      box(x, Math.round(s - sw / 2), sy, sw, 12, '#120806', 'rgba(255,90,110,.5)');
      text(x, th.sign, s, sy + 6.5, 'rgba(255,120,140,' + (Math.floor(t + th.seed) % 240 < 4 ? 0.2 : 0.85) + ')', 7, '600');
    }
  } else if (th.region === 'mall') {
    // the mall's glass front: lit levels of shops, a banner
    box(x, left, top, w, th.h + 30, '#120c09', 'rgba(' + O + ',.5)');
    for (let k = 0; k < 4; k++) { const yy = top + 8 + k * 20; x.fillStyle = 'rgba(255,217,165,' + (0.16 + ((th.seed + k) % 3) * 0.05) + ')'; x.fillRect(left + 4, yy, w - 8, 12); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(left + 4, yy + 13, w - 8, 1); }
    if (th.seed % 3 === 0) { box(x, Math.round(s - 14), top - 6, 28, 36, '#1a0b05', 'rgba(' + O + ',.5)'); text(x, 'SALE', s, top + 12, 'rgba(255,136,0,.8)', 7, '600'); }
  } else if (th.region === 'harbor') {
    // a stack of containers by the water
    for (let k = 0; k * 14 < th.h; k++) { const kind = (th.seed + k) % 4; box(x, left, base - (k + 1) * 14, w, 14, HFILL[kind], HEDGE[kind]); }
  } else {
    // the stretch between: low dark sheds, the odd lit window
    box(x, left, top, w, th.h + 30, '#070403', 'rgba(' + O + ',.25)');
    if (th.seed % 3 === 0) { x.fillStyle = 'rgba(255,190,110,.3)'; x.fillRect(left + 6, top + 6, 4, 3); }
  }
}

/** The platform outside at a stop: its far side as it stands beyond the glass, with the station's name again and again. */
function drawPlatform(x: CanvasRenderingContext2D, i: number, near: (u: number) => number, top: number, base: number, v: View) {
  const u0 = i * SEG, P = WORLD.platform, a = near(u0 + P), b = near(u0 - P);
  if (b < 0 || a > v.viewW) return;
  const name = STATIONS[LINE[i]].name;
  // the backdrop: the tunnel's tiles, the city behind a canopy, the water behind a sea wall
  x.fillStyle = i === 1 ? '#0e0b09' : '#06040a'; x.fillRect(a, top, b - a, base - top + 30);
  if (i === 1) { x.fillStyle = 'rgba(255,217,165,.06)'; for (let yy = top + 4; yy < base + 30; yy += 6) x.fillRect(a, yy, b - a, 1); }
  if (i === 2) { x.fillStyle = '#01040a'; x.fillRect(a, base - 20, b - a, 50); x.fillStyle = 'rgba(170,210,255,.08)'; for (let k = 0; k < 6; k++) x.fillRect(a + ((k * 97) % Math.max(1, b - a)), base - 14 + k * 3, 14, 1); }
  // the canopy's lamps along the top, the platform's edge along the bottom
  x.fillStyle = 'rgba(255,240,215,.5)'; x.fillRect(a, top + 2, b - a, 2);
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
    box(x, Math.round(s - w / 2), top + 12, w, 16, '#14100c', 'rgba(' + O + ',.6)');
    box(x, Math.round(s - w / 2) + 2, top + 14, 12, 12, 'rgba(' + O + ',.85)');
    text(x, '0', Math.round(s - w / 2) + 8, top + 20.5, '#14100c', 7, '700');
    text(x, name, s + 7, top + 20.5, 'rgba(' + PAPER + ',.85)', 8, '600');
  }
}

/** The tunnel under the mall: dark walls with ribs and lamps going by, a portal at each end. */
function drawTunnel(x: CanvasRenderingContext2D, near: (u: number) => number, top: number, bottom: number, v: View) {
  const u0 = SEG, T = WORLD.tunnel, a = near(u0 + T), b = near(u0 - T);
  if (b < 0 || a > v.viewW) return;
  x.fillStyle = '#060403'; x.fillRect(a, top, b - a, bottom - top);
  for (let u = u0 - T; u < u0 + T; u += 40) {
    const s = near(u);
    if (s < -4 || s > v.viewW + 4) continue;
    x.fillStyle = 'rgba(' + O + ',.12)'; x.fillRect(Math.round(s), top, 2, bottom - top);
  }
  for (let u = u0 - T + 80; u < u0 + T; u += 160) {
    const s = near(u);
    if (s < -10 || s > v.viewW + 10) continue;
    x.fillStyle = 'rgba(255,230,190,.6)'; x.fillRect(Math.round(s) - 4, top + 14, 8, 3);
  }
  // the portals: a lip of concrete where the tunnel starts
  for (const s of [a, b]) box(x, Math.round(s) - 6, top, 12, bottom - top, '#1a120c', 'rgba(' + O + ',.6)');
}

function drawOutside(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, top = y(L.win.h1), sill = y(L.win.h0), bottom = y(30);
  const { near, far } = lanes(v), F = WORLD.far;
  x.save(); x.beginPath();
  for (const wx of L.windows) { const s = v.sx(wx); if (onScreen(v, s, L.winW)) x.rect(s + 3, top + 3, L.winW - 6, sill - top - 6); }
  for (const d of L.doors) { const s = v.sx(d); x.rect(s - 18, y(56), 12, 22); x.rect(s + 6, y(56), 12, 22); }
  x.clip();
  x.fillStyle = '#04030a'; x.fillRect(0, top, v.viewW, bottom - top);
  // far: the skyline, sliding slowly, each district's landmark over its stop
  const fspan = LOOP * F;
  for (const b of SKY) {
    const s = far(b.x);
    if (s > v.viewW || s + b.w < 0) continue;
    x.fillStyle = '#0a0503'; x.fillRect(s, sill - b.h * 0.45, b.w, b.h * 0.45 + 30);
    x.fillStyle = 'rgba(255,136,0,.3)';
    for (let i = 0; i < b.lit.length; i += 4) x.fillRect(s + b.lit[i], sill - b.h * 0.45 + b.lit[i + 1] * 0.45, 2, 1);
  }
  for (let i = 0; i < 3; i++) { const s = far((i * SEG * F) % fspan); if (s > -120 && s < v.viewW + 120) drawLandmark(x, i, s, sill + 4, t); }
  // the harbor's water, under everything near it
  { const h0 = near(2 * SEG + WORLD.district), h1 = near(2 * SEG - WORLD.district); if (h1 > 0 && h0 < v.viewW) { x.fillStyle = '#01040a'; x.fillRect(h0, sill - 4, h1 - h0, bottom - sill + 4); } }
  // near: what stands by the track, sliding past at the train's speed, a mast every so often
  for (const th of NEAR) {
    const s = near(th.u);
    if (s + th.w / 2 < 0 || s - th.w / 2 > v.viewW) continue;
    drawThing(x, th, s, sill + 8, t);
  }
  for (let u = 0; u < LOOP; u += WORLD.mast) {
    const s = near(u);
    if (s < -6 || s > v.viewW + 6 || regionAt(u) === 'tunnel') continue;
    x.fillStyle = '#020101'; x.fillRect(Math.round(s), top, 4, bottom - top);
  }
  drawTunnel(x, near, top, bottom, v);
  for (let i = 0; i < 3; i++) drawPlatform(x, i, near, top, sill, v);
  // rain on the glass, blown sideways (not in the tunnel)
  if (!inTunnel()) {
    x.strokeStyle = 'rgba(170,210,255,.18)';
    for (const [sx0, sy] of STREAKS) {
      const s = ((sx0 - t * 3) % 1200 + 1200) % 1200 - 50;
      x.beginPath(); x.moveTo(s, top + sy); x.lineTo(s + 6, top + sy + 1); x.stroke();
    }
  }
  x.restore();
}

/**
 * Everything over the carriage's ceiling, so a tall screen sees the train in
 * cutaway rather than a void: the ceiling cove with its vents and destination
 * display, the roof shell with its air-con boxes and pantograph, and outside,
 * the contact wire on masts going past and the far city under a glowing sky
 * (in the tunnel under the mall: its vault, lamps going by).
 */
function drawRoof(x: CanvasRenderingContext2D, v: View, w0: number, w1: number) {
  const { sx, y, t } = v, top = v.gy;
  if (top <= L.ceil) return;
  const c0 = L.ceil, s0 = c0 + ROOF.cove, s1 = s0 + ROOF.shell;
  const { near, far } = lanes(v);
  if (inTunnel()) {
    x.fillStyle = '#060403'; x.fillRect(0, 0, v.viewW, y(s1));
    x.fillStyle = 'rgba(' + O + ',.1)';
    for (let u = SEG - WORLD.tunnel; u < SEG + WORLD.tunnel; u += 40) { const s = near(u); if (s >= -2 && s <= v.viewW) x.fillRect(Math.round(s), 0, 2, y(s1)); }
    for (let u = SEG - WORLD.tunnel + 80; u < SEG + WORLD.tunnel; u += 160) { const s = near(u); if (s >= -10 && s <= v.viewW + 10) { x.fillStyle = 'rgba(255,230,190,.5)'; x.fillRect(Math.round(s) - 6, y(ROOF.wire + 30), 12, 3); } }
  } else {
    // far band: night sky with the city's glow low down, the city sliding past slowly
    const glow = x.createLinearGradient(0, y(s1 + 140), 0, y(s1));
    glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.1)');
    x.fillStyle = '#03020a'; x.fillRect(0, 0, v.viewW, y(s1));
    x.fillStyle = glow; x.fillRect(0, y(s1 + 140), v.viewW, 140);
    for (const b of SKY_HIGH) {
      const s = far(b.x);
      if (s > v.viewW || s + b.w < 0) continue;
      x.fillStyle = '#060302'; x.fillRect(s, y(s1 + b.h * 0.7), b.w, b.h * 0.7);
      x.strokeStyle = 'rgba(194,65,12,.08)'; x.strokeRect(s + 0.5, y(s1 + b.h * 0.7) + 0.5, b.w - 1, b.h * 0.7);
      x.fillStyle = 'rgba(255,136,0,.22)';
      for (let i = 0; i < b.lit.length; i += 4) if (b.lit[i + 1] < b.h * 0.7) x.fillRect(s + b.lit[i], y(s1 + b.h * 0.7) + b.lit[i + 1], 2, 1);
    }
    // middle band: masts and the overhead wires, going past as fast as the masts in the windows
    for (let m = 0; m < LOOP; m += ROOF.mast) {
      const s = near(m);
      if (s < -60 || s > v.viewW + 10) continue;
      x.fillStyle = '#0a0605'; x.fillRect(s, 0, 5, y(s1));
      x.strokeStyle = 'rgba(194,65,12,.25)'; x.strokeRect(s + 0.5, -1, 4, y(s1) + 1);
      x.fillStyle = '#0a0605'; x.fillRect(s - 50, y(ROOF.messenger + 8), 55, 3);
      x.strokeStyle = 'rgba(194,65,12,.25)'; x.beginPath(); x.moveTo(s, y(ROOF.messenger + 28)); x.lineTo(s - 46, y(ROOF.messenger + 8)); x.stroke();
    }
    x.fillStyle = 'rgba(160,150,140,.15)';
    for (let d = 0; d < LOOP; d += 34) { const s = near(d); if (s >= 0 && s <= v.viewW) x.fillRect(s, y(ROOF.messenger), 1, ROOF.messenger - ROOF.wire); }
  }
  x.fillStyle = 'rgba(160,150,140,.3)'; x.fillRect(0, y(ROOF.wire), v.viewW, 1); x.fillRect(0, y(ROOF.messenger), v.viewW, 1);

  // the carriage: ceiling cove, then the roof shell
  box(x, w0, y(s0), w1 - w0, ROOF.cove, '#0c0907');
  for (let wx = 60; wx < L.width - 80; wx += 120) { const s = sx(wx); if (!onScreen(v, s, 40)) continue; x.fillStyle = 'rgba(' + O + ',.14)'; for (let k = 0; k < 4; k++) x.fillRect(s + k * 9, y(c0 + 9), 6, 1); }
  // destination display over each door: amber dots, nothing to use
  for (const d of L.doors) {
    const s = sx(d);
    if (!onScreen(v, s - 40, 80)) continue;
    box(x, s - 38, y(c0 + 12), 76, 10, '#050302', 'rgba(' + O + ',.4)');
    text(x, 'LINE 0 · LOOP', s, y(c0 + 7), 'rgba(255,136,0,' + (0.55 + 0.1 * Math.sin(t * 0.04)) + ')', 7, '600');
  }
  box(x, w0, y(s1), w1 - w0, ROOF.shell, '#16100c');
  x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(w0, y(s1), w1 - w0, 1);
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(w0, y(s0), w1 - w0, 1);
  // on the roof: air-con boxes and the pantograph up to the wire
  for (const a of ROOF.ac) {
    const s = sx(a);
    if (!onScreen(v, s, 90)) continue;
    box(x, s, y(s1 + 14), 90, 14, '#120c09', 'rgba(' + O + ',.45)');
    x.fillStyle = 'rgba(' + O + ',.15)'; for (let k = 8; k < 84; k += 6) x.fillRect(s + k, y(s1 + 11), 2, 8);
  }
  const p = sx(ROOF.panto);
  if (onScreen(v, p - 40, 80)) {
    box(x, p - 24, y(s1 + 5), 48, 5, '#120c09', 'rgba(' + O + ',.45)');
    const sway = Math.round(Math.sin(t * 0.07) * 2);
    x.strokeStyle = 'rgba(160,150,140,.45)'; x.beginPath();
    x.moveTo(p - 18, y(s1 + 5)); x.lineTo(p + 12, y((s1 + ROOF.wire) / 2)); x.lineTo(p - 6 + sway, y(ROOF.wire - 2));
    x.moveTo(p + 18, y(s1 + 5)); x.lineTo(p + 12, y((s1 + ROOF.wire) / 2)); x.stroke();
    x.fillStyle = 'rgba(160,150,140,.6)'; x.fillRect(p - 22 + sway, y(ROOF.wire - 1), 32, 2);
    // a spark now and then where it touches the wire, while it runs
    if (ride.phase === 'running' && Math.floor(t) % 173 < 3) { x.fillStyle = 'rgba(170,210,255,.8)'; x.fillRect(p - 8 + sway, y(ROOF.wire + 2), 3, 3); }
  }
}

/** The line map over the shut door: the loop's three stops, the one you stand at lit, a dot for the train between them. */
function drawLineMap(x: CanvasRenderingContext2D, v: View, mp: number) {
  const { y, t } = v;
  box(x, mp - 44, y(92), 88, 22, '#1a120b', 'rgba(' + O + ',.6)');
  // the loop: a rounded track with the stops on its top run, the way back underneath
  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.strokeRect(mp - 32.5, y(84) + 0.5, 64, 8);
  const stopX = (i: number) => mp - 30 + i * 30;
  for (let i = 0; i < 3; i++) {
    const here = ride.phase !== 'running' && i === ride.at;
    x.fillStyle = here && Math.floor(t / 25) % 2 ? 'rgba(255,136,0,1)' : 'rgba(' + PAPER + ',.65)'; x.fillRect(stopX(i) - 1, y(86), 4, 4);
  }
  if (ride.phase === 'running') {
    // the train on its way: along the top run, or back round underneath from HARBOR to DOWNTOWN
    const f = rideRun(), back = ride.at === 2, px = back ? stopX(2) - f * 60 : stopX(ride.at) + f * 30, py = back ? y(77) : y(85);
    x.fillStyle = 'rgba(255,136,0,' + (Math.floor(t / 12) % 2 ? 1 : 0.5) + ')'; x.fillRect(Math.round(px), py, 3, 3);
  }
  text(x, 'D', stopX(0) + 1, y(73), 'rgba(' + PAPER + ',.6)', 7); text(x, 'G', stopX(1) + 1, y(73), 'rgba(' + PAPER + ',.6)', 7); text(x, 'H', stopX(2) + 1, y(73), 'rgba(' + PAPER + ',.6)', 7);
  tell(x, t, mp + 40, y(74), 1);
}

export const train: Scene = {
  id: 'train',
  name: 'Train',
  width: L.width,
  spawn: L.outDoor,
  intro: ['On the train. It stops everywhere and asks nothing. Getting off at the right stop is up to me.'],
  exits: [
    { id: 'line', x: L.lineMap, to: '', action: 'map', label: '[E] LINE MAP', promptH: 100 },
    { id: 'out', x: L.outDoor, to: '', action: 'out', label: '[E] STEP OUT', promptH: 98 },
  ],
  readables: [
    { id: 'ad', x: 640, name: 'AD CARD', promptH: 156, pages: ['ADVERTISING SPACE AVAILABLE.', 'You are reading this, so it works.'] },
    { id: 'brake', x: L.brake, name: 'EMERGENCY BRAKE', promptH: 86, pages: ['Pull only in an emergency.', 'Emergencies must be registered at least 48 hours in advance.'] },
  ],

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v, w0 = sx(0), w1 = sx(L.width);
    x.fillStyle = '#020101'; x.fillRect(0, 0, v.viewW, v.viewH);
    // middle band: the carriage wall, windows cut into it
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
      box(x, s - 70, y(144), 140, 16, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, a.text, s - 2, y(136), 'rgba(' + PAPER + ',.75)', 7, '600');
    }
    tell(x, t, sx(640) + 65, y(136));

    // the end door (staff only), and the gangway at the far end
    const ed = sx(32);
    if (onScreen(v, ed - 16, 32)) {
      box(x, ed - 14, y(56), 28, 56, '#020100', 'rgba(' + O + ',.6)');
      box(x, ed - 11, y(52), 22, 52, '#0a0603', 'rgba(' + O + ',.35)');
      box(x, ed - 12, y(70), 24, 10, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'STAFF', ed, y(65), 'rgba(' + PAPER + ',.7)', 7, '600');
    }
    const gw = sx(L.gangway);
    if (onScreen(v, gw, 80)) {
      box(x, gw, y(L.ceil), L.width - L.gangway, L.ceil, '#16100c', 'rgba(' + O + ',.8)');
      const D = L.gangDoor, bk = sx(L.brake);
      box(x, gw + 30, y(D), 34, D, '#0c0806', 'rgba(' + O + ',.6)');
      x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(gw + 35, y(D - 6), 24, 20);
      box(x, gw + 2, y(D + 18), 66, 12, '#1a120b', 'rgba(' + O + ',.5)');
      text(x, 'CAR 3 OF 3', gw + 35, y(D + 12), 'rgba(' + PAPER + ',.8)', 7, '600');
      // the emergency brake: a red handle on a plate
      box(x, bk - 8, y(52), 16, 22, '#1a0a0a', 'rgba(' + RED + ',.8)');
      x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bk - 4, y(46), 8, 3);
      tell(x, t, bk + 4, y(34), 2);
    }

    // doors, with the line map over the first; the second slides open at a stop
    for (const d of L.doors) {
      const s = sx(d);
      if (!onScreen(v, s - 26, 52)) continue;
      const g = d === L.outDoor ? Math.round(ride.open * 22) : 0;
      box(x, s - 24, y(66), 48, 66, '#100c0a', 'rgba(' + O + ',.8)');
      if (g) {
        // the platform through the open doors, lit
        box(x, s - g, y(64), g * 2, 64, 'rgba(255,217,165,.3)');
        x.fillStyle = 'rgba(255,210,58,.6)'; x.fillRect(s - g, y(2), g * 2, 2);
        x.fillStyle = '#100c0a'; x.fillRect(s - 24, y(64), 24 - g, 64); x.fillRect(s + g, y(64), 24 - g, 64);
        // its light spilling onto the car's floor
        x.fillStyle = 'rgba(255,217,165,.07)'; x.fillRect(s - g - 6, gy, g * 2 + 12, 20);
      } else { x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s, y(66), 1, 66); }
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.strokeRect(s - 18.5 - g, y(56) + 0.5, 12, 22); x.strokeRect(s + 6.5 + g, y(56) + 0.5, 12, 22);
      if (d === L.outDoor) {
        // the announcement display over the door: NEXT: GALLERIA while running, GALLERIA at the stop
        box(x, s - 44, y(86), 88, 14, '#050302', 'rgba(' + O + ',.6)');
        const hot = ride.phase !== 'dwell' || ride.timer < 120;
        text(x, ride.say, s, y(79), 'rgba(255,136,0,' + (hot ? 0.7 + 0.3 * Math.sin(t * 0.12) : 0.85) + ')', 7, '600');
        // a green lamp over the door while it is open
        x.fillStyle = rideOpen() ? 'rgba(34,197,94,.95)' : 'rgba(' + RED + ',.5)'; x.fillRect(s + 20, y(70), 3, 3);
      }
    }
    const mp = sx(L.lineMap);
    if (onScreen(v, mp - 48, 96)) drawLineMap(x, v, mp);

    // play band: benches under the windows, the riders on them
    for (const wx of L.windows) {
      const s = sx(wx);
      if (!onScreen(v, s - 4, L.winW + 8)) continue;
      box(x, s - 2, y(52), L.winW + 4, 28, '#14262a', 'rgba(' + O + ',.6)');
      box(x, s - 4, y(24), L.winW + 8, 6, '#1c3237', 'rgba(' + O + ',.8)');
      box(x, s + 4, y(18), L.winW - 8, 18, '#0a0706');
    }
    for (const [rx, phone] of L.riders) {
      const s = sx(rx);
      if (!onScreen(v, s - 10, 20)) continue;
      x.fillStyle = '#0a0605';
      x.fillRect(s - 7, y(50), 14, 26); x.fillRect(s - 4, y(60), 9, 10);
      x.fillRect(s - 6, y(24), 4, 24); x.fillRect(s + 2, y(24), 4, 24);
      x.fillStyle = 'rgba(255,217,165,.3)'; x.fillRect(s - 4, y(60), 9, 1);
      if (phone) { x.fillStyle = 'rgba(170,210,255,.7)'; x.fillRect(s - 2, y(38), 5, 4); x.fillStyle = 'rgba(170,210,255,.25)'; x.fillRect(s - 4, y(58), 9, 7); }
    }
    // handrail and the straps on it, swinging harder while the train runs
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

