/**
 * SIGNS AND SCREENS: the city talking to you. Every piece is mounted on something you can see
 * (ART-GUIDE §5) and most of them move (§10). None is cyan: cyan is for tech you can use; an
 * ambient screen speaks in paper, orange, red, yellow or green.
 *
 * All take world coordinates: `x` the centre, `h` the height of the bottom edge above the ground,
 * `w` × `tall` the size, `parallax` for the middle band (default 1), `mount` how it hangs:
 *   'wall'    bolted flat to a wall (bolts, a cable down to a box)        (default)
 *   'pole'    on a post down to the street
 *   'hang'    on two cables from `to` (a ceiling height; default the top of the view)
 *   'bracket' on an arm out of a wall at `to` units to the left (negative) or right
 *
 * Screens:
 *   ticker        a strip of scrolling text (`text`, `col`, `speed`)
 *   adScreen      cycles ads (`ads`, default a few from ADS by `seed`), with a wipe between them
 *   brokenScreen  dead pixels, a crack, static, the ghost of an old ad (`ghost`)
 *   camera        a surveillance camera with a blinking red light; `pole: true` stands it on its own pole
 *   registryBoard the Registry's official notice board: seal, printed notices, a compliance strip
 *   scoreDisplay  a public credit score that ticks down while you watch (`name`, `score`)
 *   menuBoard     a food menu, one item always flickering SOLD OUT (`title`, `items`)
 *   oddsBoard     betting odds that keep changing (`title`, `rows`)
 *   wantedScreen  WANTED: a face (character kit portrait) and a crime that cycle (`seeds`, `crimes`)
 *   lotteryScreen rolling numbers and tonight's prize
 * Signs:
 *   wallSign      a neon word on a plate bolted to a wall (kit.sign, in world coordinates)
 *   bladeSign     a vertical sign sticking out from a wall on a bracket
 *   hangingSign   a board on two chains, swinging a little
 *   neonIcon      a neon tube drawing (bowl, fish, eye, arrow, heart, chip) on a plate
 *   billboard     a big ad on a steel frame with lamps, for rooftops and the middle band
 *   taped         a hand-written paper note taped on, slightly crooked (`text` lines)
 *
 * Copy pools: ADS, NOTICES, TICKER, CRIMES. The world's text is DRY: bureaucratic, deadpan, specific
 * ("IDENTITY CHECK AHEAD", "RENT DUE 03:00"). No puns or winks on signs; the dystopia is in what it
 * plainly states. Jokes belong in people's mouths (their `talk`), never on a sign.
 */

import { drawPortrait } from '../characters';
import { box, GREEN, mono, O, onScreen, PAPER, RED, rng, sign, text, type View } from './kit';

export const YELLOW = '255,210,58';

export const ADS: string[][] = [
  ['IDENTITY', 'CHECK', 'AHEAD'],
  ['CREDIT SCORE', 'BELOW 600', 'SERVICE DENIED'],
  ['WATER RATION', '2L / DAY', 'VERIFIED RESIDENTS'],
  ['RENT DUE', '03:00'],
  ['LUNG RENEWAL', '36 MONTHS', 'FINANCE AVAILABLE'],
  ['FACE SCAN', 'REQUIRED', 'BEYOND THIS POINT'],
  ['REPORT', 'UNREGISTERED', 'PERSONS'],
  ['SLEEP PODS', 'BY THE HOUR', 'ID REQUIRED'],
  ['QUEUE PRIORITY', 'CREDIT 700+'],
  ['CURFEW', '01:00–05:00'],
  ['THIS AREA IS', 'MONITORED', 'FOR YOUR SAFETY'],
  ['OXYGEN', 'SURCHARGE', 'IN EFFECT'],
  ['TERMS UPDATED', 'CONTINUED USE', 'IS CONSENT'],
  ['EMPLOYMENT', 'BY LOTTERY', 'NEXT DRAW 06:00'],
];

export const NOTICES: string[] = [
  'GATHERINGS OF 3+ REQUIRE FORM 7B-12',
  'LOITERING PERMITS · WINDOW 9',
  'UNSCANNED FACES WILL BE ESTIMATED',
  'TRADE WITHOUT LICENCE IS AN OFFENCE',
  'CASH TRANSACTIONS ARE LOGGED',
  'CURFEW 01:00–05:00 · NO EXCEPTIONS',
  'THIS ZONE IS UNDER REVIEW',
];

export const TICKER = [
  'LINE 0 DELAYED · NO REASON GIVEN',
  'WATER RATION 2L · VERIFIED RESIDENTS ONLY',
  'RENT DUE 03:00',
  'CAMERA NETWORK 99.7% ONLINE',
  'CREDIT ADJUSTMENTS APPLY FROM MIDNIGHT',
  'REPORT UNREGISTERED PERSONS · REWARD 3 PTS',
  'WEATHER: RAIN · AIR QUALITY: POOR',
];

export const CRIMES = ['UNREGISTERED', 'CURFEW BREACH', 'EXPIRED IDENTITY', 'UNLICENSED TRADE', 'OFFLINE 72H+', 'UNPAID RENT', 'FAILED FACE SCAN'];

/** How a screen or sign hangs. */
export interface Mounted {
  x: number;
  h: number;
  w: number;
  tall: number;
  parallax?: number;
  mount?: 'wall' | 'pole' | 'hang' | 'bracket';
  /** 'hang': the ceiling height; 'bracket': the arm's length to the wall (negative = wall on the left). */
  to?: number;
  phase?: number;
  seed?: number;
}

interface Rect { l: number; t: number; w: number; h: number }

const METAL = '#2a1d14', BEZEL = '#0b0806';
const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';

/** The housing and its mount; returns the glass, or null when off screen. */
export function housing(x: CanvasRenderingContext2D, v: View, m: Mounted, glow?: string): Rect | null {
  const cx = v.sx(m.x, m.parallax ?? 1), top = Math.round(v.y(m.h + m.tall)), l = Math.round(cx - m.w / 2), bot = top + m.tall;
  const reach = Math.abs(m.mount === 'bracket' ? m.to ?? 0 : 0) + 8;
  if (!onScreen(v, l - reach, m.w + reach * 2)) return null;
  const mount = m.mount ?? 'wall';
  x.fillStyle = METAL;
  if (mount === 'pole') { x.fillRect(Math.round(cx) - 2, bot, 4, Math.max(0, v.y(0) - bot)); x.fillRect(Math.round(cx) - 5, v.y(0) - 2, 10, 2); x.fillStyle = rgba(O, 0.35); x.fillRect(Math.round(cx) - 2, bot, 1, Math.max(0, v.y(0) - bot)); }
  if (mount === 'hang') {
    const to = m.to === undefined ? 0 : v.y(m.to);
    x.strokeStyle = 'rgba(120,90,70,.6)'; x.lineWidth = 1; x.beginPath();
    x.moveTo(l + 4.5, to); x.lineTo(l + 4.5, top); x.moveTo(l + m.w - 4.5, to); x.lineTo(l + m.w - 4.5, top); x.stroke();
  }
  if (mount === 'bracket') {
    const to = m.to ?? -20, wx = to < 0 ? l + to : l + m.w + to, near = to < 0 ? l : l + m.w;
    x.fillRect(Math.min(wx, near), top + 3, Math.abs(near - wx), 3);
    x.strokeStyle = METAL; x.lineWidth = 2; x.beginPath(); x.moveTo(wx, top + 18); x.lineTo(near + (to < 0 ? 6 : -6), top + 5); x.stroke(); x.lineWidth = 1;
    x.fillRect(wx - 2, top, 4, 22);
  }
  if (glow) {
    const g = x.createRadialGradient(cx, top + m.tall / 2, 2, cx, top + m.tall / 2, m.w * 0.9);
    g.addColorStop(0, rgba(glow, 0.12)); g.addColorStop(1, rgba(glow, 0));
    x.fillStyle = g; x.fillRect(cx - m.w, top - m.w * 0.4, m.w * 2, m.tall + m.w * 0.8);
  }
  box(x, l - 2, top - 2, m.w + 4, m.tall + 4, BEZEL, rgba(O, 0.55));
  if (mount === 'wall') {
    x.fillStyle = 'rgba(160,120,90,.6)';
    x.fillRect(l - 1, top - 1, 1, 1); x.fillRect(l + m.w, top - 1, 1, 1); x.fillRect(l - 1, bot, 1, 1); x.fillRect(l + m.w, bot, 1, 1);
    x.strokeStyle = 'rgba(30,20,14,1)'; x.beginPath(); x.moveTo(l + m.w - 6.5, bot + 2); x.quadraticCurveTo(l + m.w - 2, bot + 10, l + m.w + 4, bot + 14); x.stroke();
  }
  x.fillStyle = '#050303'; x.fillRect(l, top, m.w, m.tall);
  return { l, t: top, w: m.w, h: m.tall };
}

/** Scanlines and a soft sheen over a screen's glass. */
function glass(x: CanvasRenderingContext2D, r: Rect) {
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let yy = r.t + 1; yy < r.t + r.h; yy += 2) x.fillRect(r.l, yy, r.w, 1);
  x.fillStyle = 'rgba(255,255,255,.035)'; x.fillRect(r.l, r.t, r.w, Math.round(r.h / 3));
}

function clip(x: CanvasRenderingContext2D, r: Rect) { x.save(); x.beginPath(); x.rect(r.l, r.t, r.w, r.h); x.clip(); }

/** A strip of scrolling text. */
export function ticker(x: CanvasRenderingContext2D, v: View, m: Mounted & { text?: string; col?: string; speed?: number }) {
  const col = m.col ?? O, r = housing(x, v, m, col);
  if (!r) return;
  const s = (m.text ?? TICKER.join('   ·   ')) + '   ·   ';
  clip(x, r);
  x.font = mono(Math.min(9, r.h - 3), '600'); x.textBaseline = 'middle'; x.fillStyle = rgba(col, 0.92);
  const tw = x.measureText(s).width, off = ((v.t * (m.speed ?? 0.5) + (m.phase ?? 0)) % tw);
  for (let k = -1; k < 3; k++) { const tx = r.l + r.w - off + (k - 1) * tw; if (tx < r.l + r.w && tx + tw > r.l) x.fillText(s, tx, r.t + r.h / 2 + 0.5); }
  x.restore();
  glass(x, r);
}

/** Cycles ads with a wipe; a dead row of pixels now and then. */
export function adScreen(x: CanvasRenderingContext2D, v: View, m: Mounted & { ads?: string[][]; period?: number; cols?: string[] }) {
  const R = rng(m.seed ?? Math.round(m.x)), ads = m.ads ?? [ADS[Math.floor(R() * ADS.length)], ADS[Math.floor(R() * ADS.length)], ADS[Math.floor(R() * ADS.length)]];
  const cols = m.cols ?? [PAPER, O, RED, YELLOW, GREEN];
  const period = m.period ?? 260, u = v.t + (m.phase ?? 0), k = Math.floor(u / period) % ads.length, f = (u % period) / period;
  const col = cols[(k + Math.floor(R() * 5)) % cols.length];
  const r = housing(x, v, m, col);
  if (!r) return;
  clip(x, r);
  x.fillStyle = rgba(col, 0.1); x.fillRect(r.l, r.t, r.w, r.h);
  const lines = ads[k], longest = Math.max(...lines.map((l) => l.length));
  const size = Math.max(7, Math.min(11, Math.floor((r.h - 6) / lines.length) - 1, Math.floor((r.w - 6) / (longest * 0.62))));
  lines.forEach((ln, i) => text(x, ln, r.l + r.w / 2, r.t + r.h / 2 + (i - (lines.length - 1) / 2) * (size + 2), rgba(col, 0.95), size, '600'));
  if (f > 0.93) { x.fillStyle = rgba(col, 0.6); x.fillRect(r.l, r.t, Math.round(r.w * (f - 0.93) / 0.07), r.h); }
  x.restore();
  glass(x, r);
}

/** A screen nobody fixes. */
export function brokenScreen(x: CanvasRenderingContext2D, v: View, m: Mounted & { ghost?: string }) {
  const on = (v.t + (m.phase ?? 0)) % 170 < 9 || Math.floor(v.t / 3) % 23 === 0;
  const r = housing(x, v, m, on ? PAPER : undefined);
  if (!r) return;
  clip(x, r);
  const R = rng(Math.floor(v.t / 4) + (m.seed ?? 3));
  for (let i = 0; i < (on ? 70 : 14); i++) { x.fillStyle = 'rgba(220,210,200,' + (R() * (on ? 0.4 : 0.12)) + ')'; x.fillRect(r.l + Math.floor(R() * r.w), r.t + Math.floor(R() * r.h), 2, 1); }
  if (on && m.ghost) text(x, m.ghost, r.l + r.w / 2, r.t + r.h / 2, rgba(PAPER, 0.5), 7, '600');
  x.fillStyle = 'rgba(255,42,68,.35)'; x.fillRect(r.l + Math.round(r.w * 0.7), r.t, 1, r.h);
  x.restore();
  // the crack
  x.strokeStyle = 'rgba(200,190,180,.4)'; x.beginPath();
  x.moveTo(r.l + r.w * 0.2, r.t); x.lineTo(r.l + r.w * 0.35, r.t + r.h * 0.45); x.lineTo(r.l + r.w * 0.28, r.t + r.h); x.moveTo(r.l + r.w * 0.35, r.t + r.h * 0.45); x.lineTo(r.l + r.w * 0.6, r.t + r.h * 0.55); x.stroke();
}

/** A surveillance camera, its red light blinking (red: recording). `facing` 1 looks right. */
export function camera(x: CanvasRenderingContext2D, v: View, c: { x: number; h: number; facing?: 1 | -1; parallax?: number; pole?: boolean; phase?: number }) {
  const sx = v.sx(c.x, c.parallax ?? 1), y = v.y(c.h), f = c.facing ?? 1;
  if (!onScreen(v, sx - 20, 40)) return;
  x.fillStyle = METAL;
  if (c.pole) { x.fillRect(sx - 1, y, 3, v.y(0) - y); x.fillRect(sx - 4, v.y(0) - 2, 9, 2); x.fillStyle = rgba(O, 0.3); x.fillRect(sx - 1, y, 1, v.y(0) - y); }
  else { x.fillRect(sx - 3, y - 1, 6, 4); }
  x.fillStyle = METAL; x.fillRect(sx, y - 6, 2, 6);
  // the body tilts down toward the street; the lens at the front
  const bx = f > 0 ? sx - 2 : sx - 12;
  box(x, bx, y - 12, 14, 7, '#2e2a28', 'rgba(200,170,140,.55)');
  x.fillStyle = '#0a0a0c'; x.fillRect(f > 0 ? bx + 12 : bx - 2, y - 11, 3, 5);
  const on = Math.floor((v.t + (c.phase ?? 0)) / 28) % 2 === 0;
  x.fillStyle = on ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.25)'; x.fillRect(f > 0 ? bx + 2 : bx + 10, y - 10, 2, 2);
  if (on) { x.fillStyle = 'rgba(255,42,68,.12)'; x.fillRect((f > 0 ? bx + 2 : bx + 10) - 3, y - 13, 8, 8); }
}

/** The Registry's notice board: an official seal, printed notices, a compliance strip. */
export function registryBoard(x: CanvasRenderingContext2D, v: View, m: Mounted & { lines?: string[]; title?: string }) {
  const r = housing(x, v, m);
  if (!r) return;
  box(x, r.l, r.t, r.w, r.h, '#15100c');
  box(x, r.l, r.t, r.w, 10, '#3a0e10'); text(x, m.title ?? 'REGISTRY NOTICE', r.l + r.w / 2, r.t + 5.5, rgba(PAPER, 0.95), 7, '600');
  // the seal: an eye in a ring
  const sx = r.l + 9, sy = r.t + 20;
  x.strokeStyle = rgba(RED, 0.8); x.beginPath(); x.arc(sx, sy, 5, 0, 7); x.stroke();
  x.fillStyle = rgba(RED, 0.9); x.fillRect(sx - 1, sy - 1, 3, 3);
  const lines = m.lines ?? [NOTICES[(m.seed ?? 0) % NOTICES.length]];
  const R = rng(m.seed ?? 5);
  lines.forEach((ln, i) => {
    const py = r.t + 14 + i * 12, pw = r.w - 22;
    box(x, r.l + 18, py, pw, 10, 'rgba(255,217,165,.16)', rgba(PAPER, 0.3));
    x.save(); x.beginPath(); x.rect(r.l + 19, py, pw - 2, 10); x.clip();
    text(x, ln, r.l + 20, py + 5.5, rgba(PAPER, 0.85), 7, '600', 'left');
    x.restore();
    if (R() < 0.5) { x.fillStyle = rgba(RED, 0.6); x.fillRect(r.l + 18 + pw - 6, py + 2, 4, 4); }
  });
  // the strip at the foot: COMPLIANCE, ticking
  const sy2 = r.t + r.h - 7;
  x.fillStyle = '#0a0606'; x.fillRect(r.l + 2, sy2, r.w - 4, 5);
  const pct = 97 + ((Math.floor(v.t / 90) + (m.phase ?? 0)) % 3);
  x.fillStyle = rgba(GREEN, 0.7); x.fillRect(r.l + 2, sy2, Math.round((r.w - 4) * pct / 100), 5);
  text(x, 'COMPLIANCE ' + pct + '%', r.l + r.w / 2, sy2 + 2.5, 'rgba(0,0,0,.85)', 7, '600');
}

/** A public credit score display, ticking down while you watch. */
export function scoreDisplay(x: CanvasRenderingContext2D, v: View, m: Mounted & { name?: string; score?: number }) {
  const r = housing(x, v, m, RED);
  if (!r) return;
  clip(x, r);
  const base = m.score ?? 640, s = base - (Math.floor((v.t + (m.phase ?? 0)) / 140) % 40);
  text(x, m.name ?? 'YOUR SCORE', r.l + r.w / 2, r.t + 6, rgba(PAPER, 0.8), 7, '600');
  text(x, String(s), r.l + r.w / 2 - 4, r.t + r.h / 2 + 2, rgba(s < base - 20 ? RED : YELLOW, 0.95), Math.min(16, r.h - 12), '600');
  x.fillStyle = rgba(RED, Math.floor(v.t / 20) % 2 ? 0.95 : 0.5);
  const ax = r.l + r.w / 2 + 16, ay = r.t + r.h / 2;
  x.beginPath(); x.moveTo(ax - 3, ay - 2); x.lineTo(ax + 3, ay - 2); x.lineTo(ax, ay + 3); x.closePath(); x.fill();
  for (let i = 0; i < 10; i++) { const bh = 2 + ((i * 7 + 5) % 6) - (i > 6 ? i - 6 : 0); x.fillStyle = rgba(YELLOW, 0.5); x.fillRect(r.l + 4 + i * ((r.w - 8) / 10), r.t + r.h - 2 - bh, 2, bh); }
  x.restore();
  glass(x, r);
}

/** A food menu with prices; one item always flickers SOLD OUT. */
export function menuBoard(x: CanvasRenderingContext2D, v: View, m: Mounted & { title?: string; items: [string, string][]; col?: string }) {
  const col = m.col ?? YELLOW, r = housing(x, v, m, col);
  if (!r) return;
  clip(x, r);
  x.fillStyle = rgba(col, 0.07); x.fillRect(r.l, r.t, r.w, r.h);
  let yy = r.t + 6;
  if (m.title) { text(x, m.title, r.l + r.w / 2, yy, rgba(col, 0.95), 7, '600'); yy += 9; x.fillStyle = rgba(col, 0.4); x.fillRect(r.l + 3, yy - 4, r.w - 6, 1); }
  const sold = Math.floor((v.t + (m.phase ?? 0)) / 200) % m.items.length;
  m.items.forEach(([name, price], i) => {
    const out = i === sold && Math.floor(v.t / 12) % 4 !== 0;
    text(x, name, r.l + 4, yy + i * 9, rgba(PAPER, out ? 0.3 : 0.85), 7, '600', 'left');
    text(x, out ? 'SOLD OUT' : price, r.l + r.w - 4, yy + i * 9, out ? rgba(RED, 0.9) : rgba(col, 0.9), 7, '600', 'right');
  });
  x.restore();
  glass(x, r);
}

/** Betting odds that keep changing. */
export function oddsBoard(x: CanvasRenderingContext2D, v: View, m: Mounted & { title?: string; rows: string[] }) {
  const r = housing(x, v, m, GREEN);
  if (!r) return;
  clip(x, r);
  text(x, m.title ?? 'ODDS', r.l + r.w / 2, r.t + 6, rgba(PAPER, 0.9), 7, '600');
  m.rows.forEach((row, i) => {
    const k = Math.floor((v.t + i * 57 + (m.phase ?? 0)) / 90), a = 1 + ((k * 7 + i * 3) % 9), up = (k + i) % 3 === 0;
    text(x, row, r.l + 4, r.t + 16 + i * 9, rgba(PAPER, 0.8), 7, '600', 'left');
    text(x, a + ':' + (1 + ((k + i) % 4)), r.l + r.w - 10, r.t + 16 + i * 9, rgba(up ? GREEN : RED, 0.95), 7, '600', 'right');
    x.fillStyle = rgba(up ? GREEN : RED, 0.95); x.fillRect(r.l + r.w - 7, r.t + 14 + i * 9 + (up ? 0 : 2), 3, 2);
  });
  x.restore();
  glass(x, r);
}

/** WANTED: a face and a crime, cycling. The faces are people from the character kit. */
export function wantedScreen(x: CanvasRenderingContext2D, v: View, m: Mounted & { seeds?: number[]; crimes?: string[] }) {
  const r = housing(x, v, m, RED);
  if (!r) return;
  const seeds = m.seeds ?? [101, 202, 303, 404], crimes = m.crimes ?? CRIMES;
  const k = Math.floor((v.t + (m.phase ?? 0)) / 220);
  clip(x, r);
  x.fillStyle = 'rgba(255,42,68,.08)'; x.fillRect(r.l, r.t, r.w, r.h);
  text(x, 'WANTED', r.l + r.w / 2, r.t + 6, rgba(RED, Math.floor(v.t / 25) % 2 ? 0.95 : 0.6), 8, '600');
  const pw = Math.min(30, r.h - 22);
  box(x, r.l + 4, r.t + 12, pw, pw, '#120606', rgba(RED, 0.5));
  drawPortrait(x, seeds[k % seeds.length], r.l + 4 + pw / 2, r.t + 12, pw, pw, 2);
  x.fillStyle = rgba(RED, 0.5); x.fillRect(r.l + 4, r.t + 12 + ((v.t * 0.6) % pw), pw, 1);
  const crime = crimes[k % crimes.length], words = crime.split(' '), lines: string[] = [];
  let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > Math.floor((r.w - pw - 12) / 4.4)) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  lines.push(cur);
  lines.slice(0, 4).forEach((ln, i) => text(x, ln, r.l + pw + 8, r.t + 17 + i * 8, rgba(PAPER, 0.85), 7, '600', 'left'));
  text(x, 'REWARD: ' + (3 + (k % 5)) + ' PTS', r.l + r.w / 2, r.t + r.h - 5, rgba(YELLOW, 0.9), 7, '600');
  x.restore();
  glass(x, r);
}

/** Lottery: numbers rolling, tonight's prize. */
export function lotteryScreen(x: CanvasRenderingContext2D, v: View, m: Mounted & { prize?: string }) {
  const r = housing(x, v, m, YELLOW);
  if (!r) return;
  clip(x, r);
  x.fillStyle = 'rgba(255,210,58,.08)'; x.fillRect(r.l, r.t, r.w, r.h);
  text(x, 'CIVIC LOTTERY', r.l + r.w / 2, r.t + 6, rgba(YELLOW, 0.95), 7, '600');
  const n = 5, bw = (r.w - 8) / n, k = Math.floor(v.t / 6);
  for (let i = 0; i < n; i++) {
    const rolling = (v.t % 600) < 200 + i * 60, num = rolling ? (k * 7 + i * 13) % 50 : ((i * 17 + 9) % 49) + 1;
    x.fillStyle = rgba(rolling ? PAPER : YELLOW, 0.9); x.beginPath(); x.arc(r.l + 4 + bw * (i + 0.5), r.t + r.h / 2 + 1, Math.min(6, bw / 2 - 1), 0, 7); x.fill();
    text(x, String(num), r.l + 4 + bw * (i + 0.5), r.t + r.h / 2 + 1.5, 'rgba(10,6,2,.95)', 7, '600');
  }
  text(x, m.prize ?? 'RESIDENCY 12 MO', r.l + r.w / 2, r.t + r.h - 5, rgba(PAPER, 0.85), 7, '600');
  x.restore();
  glass(x, r);
}

// ---------- signs ----------

/** A neon word on a plate bolted to a wall. */
export function wallSign(x: CanvasRenderingContext2D, v: View, s: { x: number; h: number; text: string; col?: string; size?: number; parallax?: number; dead?: number; phase?: number }) {
  const cx = v.sx(s.x, s.parallax ?? 1), cy = v.y(s.h), size = s.size ?? 9, w = s.text.length * size * 0.64 + 12;
  if (!onScreen(v, cx - w, w * 2)) return;
  sign(x, v.t, s.text, cx, cy, s.col ?? O, { size, dead: s.dead, phase: s.phase });
  x.fillStyle = 'rgba(160,120,90,.6)'; x.fillRect(Math.round(cx - w / 2) + 2, Math.round(cy - size / 2 - 2), 1, 1); x.fillRect(Math.round(cx + w / 2) - 3, Math.round(cy - size / 2 - 2), 1, 1);
}

/** A vertical sign on a bracket out of a wall: letters top to bottom. */
export function bladeSign(x: CanvasRenderingContext2D, v: View, s: { x: number; h: number; text: string; col?: string; parallax?: number; dim?: number; phase?: number; dead?: number }) {
  const cx = v.sx(s.x, s.parallax ?? 1), top = v.y(s.h), n = s.text.length, col = s.col ?? O, a = s.dim ?? 1;
  if (!onScreen(v, cx - 16, 32)) return;
  x.fillStyle = METAL; x.fillRect(cx - 16, top + 4, 8, 2); x.fillRect(cx - 16, top + n * 11, 8, 2);
  box(x, cx - 9, top, 18, n * 11 + 8, '#0d0604', rgba(col, 0.3 * a));
  const flick = (v.t + (s.phase ?? 0)) % 400 > 390;
  x.save(); x.font = mono(9, '600'); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let k = 0; k < n; k++) {
    const off = flick || k === s.dead;
    x.fillStyle = rgba(col, (off ? 0.15 : 0.9) * a); if (!off && a > 0.6) { x.shadowColor = rgba(col, 0.8); x.shadowBlur = 6; } else x.shadowBlur = 0;
    x.fillText(s.text[k], cx, top + 8 + k * 11);
  }
  x.restore();
}

/** A board on two chains, swinging a little; hangs from `to` (default: the awning or beam just above). */
export function hangingSign(x: CanvasRenderingContext2D, v: View, s: { x: number; h: number; text: string; to?: number; col?: string; parallax?: number; board?: string }) {
  const cx = v.sx(s.x, s.parallax ?? 1), w = s.text.length * 5 + 12, top = v.y(s.h + 12), to = v.y(s.to ?? s.h + 22);
  if (!onScreen(v, cx - w, w * 2)) return;
  const sw = Math.round(Math.sin(v.t * 0.02 + s.x) * 1.2);
  x.strokeStyle = 'rgba(140,110,80,.6)'; x.beginPath(); x.moveTo(cx - w / 2 + 4.5, to); x.lineTo(cx - w / 2 + 4.5 + sw, top); x.moveTo(cx + w / 2 - 4.5, to); x.lineTo(cx + w / 2 - 4.5 + sw, top); x.stroke();
  box(x, Math.round(cx - w / 2 + sw), top, w, 12, s.board ?? '#2a1a10', 'rgba(' + (s.col ?? O) + ',.7)');
  text(x, s.text, cx + sw, top + 6.5, 'rgba(' + (s.col ?? PAPER) + ',.92)', 7, '600');
}

const ICONS: Record<string, number[][]> = {
  bowl: [[-8, -2, 8, -2], [-8, -2, -5, 4], [-5, 4, 5, 4], [5, 4, 8, -2], [-3, -4, -2, -9], [1, -4, 2, -9]],
  fish: [[-8, 0, -3, -4], [-3, -4, 4, -3], [4, -3, 8, 0], [8, 0, 4, 3], [4, 3, -3, 4], [-3, 4, -8, 0], [-8, 0, -11, -4], [-8, 0, -11, 4]],
  eye: [[-9, 0, 0, -5], [0, -5, 9, 0], [9, 0, 0, 5], [0, 5, -9, 0], [-1, -1, 1, 1]],
  arrow: [[-9, 0, 7, 0], [7, 0, 2, -5], [7, 0, 2, 5]],
  heart: [[0, 5, -8, -2], [-8, -2, -4, -6], [-4, -6, 0, -2], [0, -2, 4, -6], [4, -6, 8, -2], [8, -2, 0, 5]],
  chip: [[-6, -5, 6, -5], [6, -5, 6, 5], [6, 5, -6, 5], [-6, 5, -6, -5], [-9, -2, -6, -2], [-9, 2, -6, 2], [6, -2, 9, -2], [6, 2, 9, 2]],
};

/** A neon tube drawing on a plate: bowl, fish, eye, arrow, heart, chip. */
export function neonIcon(x: CanvasRenderingContext2D, v: View, s: { x: number; h: number; icon: keyof typeof ICONS | string; col?: string; parallax?: number; phase?: number }) {
  const cx = v.sx(s.x, s.parallax ?? 1), cy = v.y(s.h), col = s.col ?? O, segs = ICONS[s.icon] ?? ICONS.arrow;
  if (!onScreen(v, cx - 16, 32)) return;
  box(x, cx - 13, cy - 11, 26, 22, '#0d0705', rgba(col, 0.25));
  const off = (v.t + (s.phase ?? 0)) % 330 > 320;
  x.save(); x.strokeStyle = rgba(col, off ? 0.2 : 0.95); x.lineWidth = 1.5; if (!off) { x.shadowColor = rgba(col, 0.9); x.shadowBlur = 6; }
  x.beginPath(); for (const [a, b, c, d] of segs) { x.moveTo(cx + a, cy + b); x.lineTo(cx + c, cy + d); } x.stroke();
  x.restore();
}

/** A big ad on a steel frame with lamps under it: rooftops, the middle band. */
export function billboard(x: CanvasRenderingContext2D, v: View, m: Mounted & { ads?: string[][] }) {
  const cx = v.sx(m.x, m.parallax ?? 1), l = Math.round(cx - m.w / 2), top = Math.round(v.y(m.h + m.tall)), bot = top + m.tall;
  if (!onScreen(v, l - 4, m.w + 8)) return;
  x.strokeStyle = METAL; x.lineWidth = 2; x.beginPath();
  for (const fx of [0.2, 0.8]) { x.moveTo(l + m.w * fx, bot); x.lineTo(l + m.w * fx, v.y(m.h - 26)); }
  x.moveTo(l + m.w * 0.2, bot + 4); x.lineTo(l + m.w * 0.8, v.y(m.h - 22)); x.moveTo(l + m.w * 0.8, bot + 4); x.lineTo(l + m.w * 0.2, v.y(m.h - 22)); x.stroke(); x.lineWidth = 1;
  adScreen(x, v, { ...m, mount: 'wall' });
  for (const fx of [0.25, 0.5, 0.75]) { x.fillStyle = 'rgba(255,217,165,.8)'; x.fillRect(l + m.w * fx - 2, bot + 3, 4, 2); }
}

/** A hand-written paper note taped on, a little crooked. Screen-anchored at world (x, h): the note's centre. */
export function taped(x: CanvasRenderingContext2D, v: View, s: { x: number; h: number; text: string[]; parallax?: number; tilt?: number; paper?: string }) {
  const cx = v.sx(s.x, s.parallax ?? 1), cy = v.y(s.h), w = Math.max(...s.text.map((l) => l.length)) * 4.6 + 8, hh = s.text.length * 8 + 5;
  if (!onScreen(v, cx - w, w * 2)) return;
  x.save(); x.translate(Math.round(cx), Math.round(cy)); x.rotate(s.tilt ?? -0.05);
  x.fillStyle = s.paper ?? 'rgba(232,222,196,.85)'; x.fillRect(-w / 2, -hh / 2, w, hh);
  x.fillStyle = 'rgba(255,250,230,.35)'; x.fillRect(-w / 2 - 2, -hh / 2 - 1, 7, 3); x.fillRect(w / 2 - 5, -hh / 2 - 1, 7, 3);
  s.text.forEach((ln, i) => text(x, ln, 0, -hh / 2 + 6.5 + i * 8, 'rgba(40,20,10,.9)', 7, '600'));
  x.restore();
}
