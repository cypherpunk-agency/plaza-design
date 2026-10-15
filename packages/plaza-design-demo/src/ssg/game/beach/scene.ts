/**
 * The beach on the canvas: a real beach at sunset, west of the harbor. Sand
 * down to the waterline, the open sea with waves rolling in, a wide sky, and
 * the city's towers small and far off along the shore. The city is in the
 * details: a rental kiosk that bills by the minute, a Registry drone checking
 * towels, ads on the lifeguard tower, a notice on Moth's boat.
 *
 * Left to right: the stairs up to the promenade (the way back to the harbor),
 * the boardwalk with the Registry's beach notice and the sunbed kiosk, the
 * sunbeds, SALT (a shack on stilts with string lights; the bar under it, LIME
 * the robot bartender, the jukebox, the mixer), a crab, the lifeguard tower
 * and its drone, the volleyball net, the kids' sandcastle, then the pier out
 * over the water: its lamp controller, the old man fishing, a gull on a post,
 * and Moth's boat at the very end.
 *
 * Bands: far = sky, sun, the city on the shore, the sea with its swimmers and
 * surfers (calm, low contrast); middle = the promenade wall and the shoreline;
 * play = the boardwalk, sand, the bar, the tower, the pier, the people.
 *
 * World units match the street (the player is 42 tall). Device spots are
 * beach.json (`layout.spot`); this draws them there.
 */

import type { DrawView } from '../zone/host';
import type { ZoneModel } from '../zone/model';
import { drawPeople, drawPerson, type Person } from '../people';
import { box, C, drawTowers, GREEN, O, onScreen, PAPER, RED, rng, sign, tell, text, towers, type View } from '../scenes/kit';
import { adScreen, menuBoard, registryBoard, YELLOW } from '../scenes/screens';

/** The beach: the promenade, the sand, then the pier out to Moth's boat. */
export const BEACH_W = 1530;
/** Where you land coming down the stairs from the harbor (and walking in from its edge). */
export const BEACH_EDGE_X = 44;
export const BEACH_SPAWN = 70;

/** Where things stand (world x). Devices: beach.json. */
export const L = {
  stairs: 22,
  board: 118,
  boardwalk: 196,
  kiosk: 236,
  sunbeds: [292, 334, 376, 418],
  /** Sunbed 7, the one the kiosk rents you. */
  mine: 418,
  shack: { x0: 436, x1: 662 },
  jukebox: 466,
  lime: 532,
  order: 584,
  mixer: 626,
  crab: 694,
  tower: 770,
  drone: 798,
  net: 908,
  castle: 1004,
  surfer: 1066,
  /** Where the sand meets the water (the pier starts a little before). */
  shore: 1096,
  pier0: 1078,
  pierLights: 1146,
  fisher: 1300,
  gull: 1352,
  boat: 1440,
};
/** The horizon and the waterline, as heights above the play line. */
const HORIZON = 122, WATERLINE = 30;

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mix = (a: number[], b: number[], f: number, al = 1) => 'rgba(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ',' + al + ')';

// ---------- the people (people.ts) ----------

/** LIME, SALT's robot bartender: drawn as a robot here (not a people-kit person), talks through the kit. */
export const LIME: Person = { id: 'lime', key: true, seed: 7001, x: L.lime, h: 4, name: 'LIME', talk: [
  ["Welcome to SALT. I'm LIME. I pour, I listen, I don't keep logs. Officially.", "You've got the face of someone looking for someone. Everyone at a beach bar has that face. Yours is worse."],
  ['Moth? Third stool, every evening for a month. Water with a slice of me in it. Tipped in jokes.', "I don't run on jokes. I kept them anyway."],
  ["That boat at the end of the pier is Moth's. Three days, nobody aboard. The harbour stuck a notice on it.", "Leave it locked for now. Moth said someone would come. Didn't say when. I assumed someone taller."],
  ["The photo behind the gin? Moth. The night they fixed my jukebox without asking. Said I looked 'nearly human'.", "I'm still deciding if that was a compliment. I've been deciding for a year."],
  ['My opinion of Moth: talks too fast, eats too little, rewires things that are not theirs. Ten out of ten. Would serve again.', 'Drinks are two tokens. The jukebox is free. The jukebox and the mixer get along too well, if you ask me. Nobody asks me.'],
] };

const lifeguard: Person = { id: 'guard', seed: 7002, look: { body: 'avg', hair: 'cap', garb: 'tee', extras: ['glasses'], top: '#a83a2a', acc: '#c83a2a' }, x: 756, h: 62, act: 'sit', facing: 1, name: 'LIFEGUARD', talk: [
  ["I'm paid to watch the water. The drone is paid to watch me. Nobody's paid to watch the drone.", 'If the flag goes red, everyone is out. The drone decides. Last week it decided a jellyfish was a shark. Then a cloud.'],
  ['The drone says danger, I blow the whistle. Thirty years of training. I blow the whistle.'],
] };

const sunbather: Person = { id: 'sunbather', seed: 7003, look: { body: 'wide', hair: 'short', garb: 'tee', extras: ['glasses'], top: '#d86a2a' }, x: 334, h: 9, act: 'sleep', name: 'SUNBATHER', talk: [
  ['I rented this sunbed for ten minutes. That was three hours ago.', "I'm not getting up. If I get up, I have to look at the bill."],
  ['Still here. Still not looking.'],
] };

const volley: Person = { id: 'volley', seed: 7004, look: { body: 'slim', hair: 'bun', garb: 'tee', extras: [], top: '#d8b040' }, x: 878, act: 'dance', facing: 1, name: 'VOLLEYBALL', talk: [
  ['We need a fourth. You any good? No? Perfect. Neither are we.', "The net's municipal. We pay by the point. We stopped keeping score."],
] };

const kid: Person = { id: 'kid', seed: 7005, look: { body: 'kid', hair: 'cap', garb: 'tee', extras: [], top: '#3a6ad8', acc: '#d8b040' }, x: 1022, act: 'sit', facing: -1, name: 'KID', talk: [
  ["It's a Registry office. That's the queue. Those are the people in the queue.", 'When the tide comes in, it gets deleted. That is how it works, my mum said.'],
  ['You can be in the queue if you want. You have to wait, though. That is the rule.'],
] };

const surfer: Person = { id: 'surfer', seed: 7006, look: { body: 'tall', hair: 'long', garb: 'tee', extras: [], hairCol: '#c8b040', top: '#2e4a5e' }, x: L.surfer, act: 'stand', facing: -1, name: 'SURFER', talk: [
  ["Waves are good today. Waves are free. Don't tell anyone, they'll put a meter on them."],
  ["See the buoy? Edge of the swim zone. Past it the Registry stops counting you. Feels great. Briefly."],
] };

const fisher: Person = { id: 'fisher', seed: 7007, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [], top: '#4e5e3a' }, x: L.fisher, h: 8, act: 'sit', facing: 1, name: 'OLD MAN', talk: [
  ["Fifty years I've fished off this pier. Caught a fish twice. Same fish.", "That boat at the end? Kid with a hood and a laptop. Said 'gone fishing'. Never saw a rod come out. Good. Fish deserve a break."],
  ['Three days ago they tied it up and walked off along the shore. Did not look back. Looked at the water a lot.'],
] };

/** Who lives on the beach. The ones with `talk` get [E] TALK; the cat gets [E] PET (the game, as in a scene). */
export const PEOPLE: Person[] = [
  LIME, lifeguard, sunbather, volley, kid, surfer, fisher,
  { look: 'cat', seed: 2, x: 1252, act: 'sit' },
];

/** Ambient people, drawn but not talkable. */
const SUNBEDS: Person[] = [
  { seed: 7101, look: { body: 'slim', hair: 'long', garb: 'dress', extras: ['glasses'], top: '#c83a8a' }, x: 292, h: 9, act: 'sleep' },
  { seed: 7102, look: { body: 'avg', hair: 'brim', garb: 'tee', extras: ['phone'], top: '#e8e0d0' }, x: 376, h: 10, act: 'sit', facing: 1 },
];
const BEACHGOERS: Person[] = [
  { seed: 7110, look: { body: 'avg', hair: 'short', garb: 'tee', extras: [], top: '#7ab83a' }, x: 936, act: 'dance', facing: -1 },
  { seed: 7111, look: { body: 'tall', hair: 'mohawk', garb: 'tee', extras: [], top: '#c83a2a' }, x: 966, act: 'dance', facing: -1 },
  { seed: 7112, look: { body: 'short', hair: 'beanie', garb: 'tee', extras: [], top: '#46506e' }, x: 852, act: 'dance', facing: 1 },
  { seed: 7113, look: { body: 'kid', hair: 'long', garb: 'tee', extras: [], top: '#e85a6a' }, x: 990, act: 'sit', facing: 1 },
  { seed: 7114, look: { body: 'old', hair: 'bald', garb: 'tee', extras: ['cane'], top: '#b8a68a' }, x: 300, act: 'walk', range: [300, 700], speed: 0.18 },
  { seed: 7115, look: { body: 'avg', hair: 'bun', garb: 'jacket', extras: ['bag'] }, x: 600, act: 'walk', range: [560, 1040], speed: 0.26 },
  { look: 'drone', x: 290, h: 56, act: 'scan', range: [282, 430], speed: 0.2 },
];
/** Swimmers out in the sea (far band): heads in the water, or on the shore when the flag is red. */
const SWIM = [{ x: 610, d: 0.55 }, { x: 680, d: 0.35 }, { x: 740, d: 0.6 }, { x: 830, d: 0.45 }, { x: 960, d: 0.5 }, { x: 1180, d: 0.4 }, { x: 1250, d: 0.6 }];
const ASHORE: Person[] = SWIM.map((s, i) => ({ seed: 7200 + i, look: { garb: 'tee' as const, extras: [] }, x: s.x, h: WATERLINE - 2, act: i % 3 ? 'stand' as const : 'phone' as const, ps: 2, dim: 0.25, facing: (i % 2 ? 1 : -1) as 1 | -1 }));

// ---------- things to do with E that are not devices (index.ts `uses`) ----------

/** When the gull on the post was last shooed (game frames), so it can fly off and come back. */
export const GULL = { shooed: -1e9, n: 0 };
export const CRAB = { n: 0 };

// ---------- the far band ----------

const CITY = towers(41, 300, [4, 10], [8, 26], 0.3);

function sky(x: CanvasRenderingContext2D, V: View, p: number) {
  const hy = V.y(HORIZON);
  const g = x.createLinearGradient(0, 0, 0, hy);
  g.addColorStop(0, mix([58, 34, 92], [14, 10, 36], p));
  g.addColorStop(0.55, mix([200, 92, 70], [92, 36, 78], p));
  g.addColorStop(1, mix([255, 184, 104], [228, 98, 62], p));
  x.fillStyle = g; x.fillRect(0, 0, V.viewW, hy + 1);
  // stars as the light goes
  if (p > 0.3) {
    const r = rng(17);
    for (let i = 0; i < 50; i++) {
      const sx = ((r() * 2400 - V.cam * 0.04) % 2400 + 2400) % 2400, sy = r() * (hy * 0.55);
      if (sx > V.viewW) continue;
      x.fillStyle = 'rgba(255,230,200,' + ((p - 0.3) * (0.3 + r() * 0.5)).toFixed(2) + ')'; x.fillRect(sx, sy, 1, 1);
    }
  }
  // long thin clouds, lit from below
  for (let i = 0; i < 5; i++) {
    const cw = 80 + hash(i) * 120, cx = ((hash(i + 3) * 1400 - V.cam * 0.08 + V.t * 0.01 * (1 + i * 0.2)) % 1600 + 1600) % 1600 - 200, cy = hy * (0.25 + hash(i + 7) * 0.5);
    x.fillStyle = mix([255, 170, 120], [150, 70, 100], p, 0.22); x.fillRect(Math.round(cx), Math.round(cy), Math.round(cw), 2);
    x.fillStyle = mix([255, 210, 160], [200, 90, 90], p, 0.18); x.fillRect(Math.round(cx + cw * 0.2), Math.round(cy + 2), Math.round(cw * 0.5), 1);
  }
}

/** The sun, sinking: `p` 0 (low and gold) → 1 (gone under the horizon). */
function sun(x: CanvasRenderingContext2D, V: View, p: number) {
  const cx = V.sx(980, 0.05), sy = V.y(HORIZON + 40 - 58 * p), hy = V.y(HORIZON);
  const g = x.createRadialGradient(cx, sy, 4, cx, sy, 120);
  g.addColorStop(0, 'rgba(255,200,120,' + (0.4 * (1 - p * 0.6)) + ')'); g.addColorStop(1, 'rgba(255,140,80,0)');
  x.fillStyle = g; x.fillRect(cx - 130, sy - 130, 260, Math.max(0, hy - (sy - 130)));
  x.save(); x.beginPath(); x.rect(0, 0, V.viewW, hy); x.clip();
  x.fillStyle = mix([255, 224, 150], [255, 120, 70], p); x.beginPath(); x.arc(cx, sy, 15, 0, 7); x.fill();
  // heat bands across the low sun
  x.fillStyle = mix([255, 170, 110], [210, 70, 70], p, 0.6);
  for (let k = 0; k < 3; k++) x.fillRect(cx - 16, sy + 4 + k * 4, 32, 1);
  x.restore();
}

/** The city, far off along the shore to the west: thin towers, a few windows, the antenna. */
function city(x: CanvasRenderingContext2D, V: View, p: number) {
  const base = V.y(HORIZON) + 1;
  x.save(); x.beginPath(); x.rect(0, 0, V.viewW, base); x.clip();
  drawTowers(x, V, CITY, 0.08, base, 0.08 + p * 0.1, mix([120, 70, 90], [40, 24, 52], p), 1);
  // the antenna on Plaza Central, its red light
  const ax = V.sx(150, 0.08);
  if (onScreen(V, ax - 4, 8)) {
    x.fillStyle = mix([120, 70, 90], [40, 24, 52], p); x.fillRect(ax - 1, base - 46, 1, 20);
    if (Math.floor(V.t / 40) % 2) { x.fillStyle = 'rgba(255,42,68,.8)'; x.fillRect(ax - 1, base - 48, 2, 2); }
  }
  x.restore();
}

/** The sea: bands of colour, the sun's glitter, swell lines rolling in, swimmers, a surfer, the buoy. */
function sea(x: CanvasRenderingContext2D, V: View, p: number, red: boolean) {
  const top = V.y(HORIZON), bot = V.y(WATERLINE), h = bot - top;
  const g = x.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, mix([150, 84, 92], [70, 32, 70], p)); g.addColorStop(0.4, mix([60, 48, 84], [28, 18, 46], p)); g.addColorStop(1, mix([34, 52, 72], [16, 22, 40], p));
  x.fillStyle = g; x.fillRect(0, top, V.viewW, h + 1);
  x.fillStyle = mix([255, 210, 150], [255, 140, 90], p, 0.5); x.fillRect(0, top, V.viewW, 1);
  // the sun's path on the water
  const cx = V.sx(980, 0.05), glit = 0.55 * (1 - p * 0.7);
  for (let yy = top + 2; yy < bot; yy += 2) {
    const f = (yy - top) / h, w = 6 + f * 50, k = hash(yy * 3 + Math.floor(V.t / 9));
    if (k < 0.45) continue;
    x.fillStyle = 'rgba(255,214,150,' + (glit * (1 - f * 0.7) * k).toFixed(2) + ')';
    x.fillRect(Math.round(cx - w / 2 + (k - 0.7) * w), yy, Math.round(w * (0.2 + k * 0.3)), 1);
  }
  // swell lines, rolling in: further rows are slower and fainter
  const N = 9;
  for (let i = 0; i < N; i++) {
    const d = ((i / N + V.t * 0.0009) % 1), yy = Math.round(top + h * d * d), a = 0.08 + d * 0.4;
    for (let sx = -((V.cam * (0.2 + d * 0.7)) % 14); sx < V.viewW; sx += 14) {
      const k = hash(Math.floor((sx + V.cam * (0.2 + d * 0.7)) / 14) * 7 + i * 31);
      if (k < 0.35) continue;
      x.fillStyle = 'rgba(255,236,214,' + (a * k).toFixed(2) + ')';
      x.fillRect(Math.round(sx), yy, Math.round(4 + k * 8 * d + 2), 1);
    }
  }
  // the buoy, far out, bobbing: the edge of the swim zone
  const bx = V.sx(1210, 0.55), by = V.y(84) + Math.round(Math.sin(V.t * 0.05) * 1.2);
  if (onScreen(V, bx - 6, 12)) {
    x.fillStyle = '#d8d0c0'; x.fillRect(bx - 3, by - 6, 6, 3); x.fillStyle = 'rgba(' + RED + ',.95)'; x.fillRect(bx - 3, by - 3, 6, 3);
    x.fillStyle = '#2a1d14'; x.fillRect(bx, by - 10, 1, 4);
    if (Math.floor(V.t / 50) % 2) { x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(bx - 1, by - 12, 2, 2); }
  }
  // a surfer riding a swell, back and forth along it
  const sd = 0.62, sy = Math.round(top + h * sd * sd) - 1, sxw = 760 + Math.sin(V.t * 0.004) * 220, ssx = V.sx(sxw, 0.6), face = Math.cos(V.t * 0.004) > 0 ? 1 : -1;
  if (onScreen(V, ssx - 10, 20)) {
    x.fillStyle = 'rgba(255,236,214,.35)'; x.fillRect(ssx - 10 * face - 4, sy + 1, 10, 1);
    x.fillStyle = '#d8b040'; x.fillRect(ssx - 5, sy, 10, 1);
    x.fillStyle = '#1a1210'; x.fillRect(ssx - 1, sy - 6, 2, 5); x.fillRect(ssx - 3 + face, sy - 5, 6, 1);
    x.fillStyle = '#c99068'; x.fillRect(ssx - 1, sy - 8, 2, 2);
  }
  // swimmers: heads and an arm now and then; on a red flag they are ashore instead
  if (!red) for (const [i, s] of SWIM.entries()) {
    const wx = s.x + Math.sin(V.t * 0.006 + i) * 12, px = V.sx(wx, 0.45 + s.d * 0.4), yy = Math.round(top + h * s.d * s.d) + Math.round(Math.sin(V.t * 0.04 + i * 2));
    if (!onScreen(V, px - 4, 8)) continue;
    x.fillStyle = 'rgba(255,236,214,.3)'; x.fillRect(px - 4, yy + 2, 8, 1);
    x.fillStyle = ['#c99068', '#8a5a38', '#f2cfae', '#6a4228'][i % 4]; x.fillRect(px - 1, yy - 1, 3, 3);
    x.fillStyle = ['#2e1d12', '#c83a2a', '#16100c', '#d8b040'][i % 4]; x.fillRect(px - 1, yy - 2, 3, 1);
    if ((V.t + i * 40) % 160 < 30) { x.fillStyle = '#c99068'; x.fillRect(px + 2, yy - 4, 1, 3); }
  }
}

/** Where the sea meets the sand: the wash running up and back, foam, wet sand that holds the light. */
function shore(x: CanvasRenderingContext2D, V: View, p: number) {
  const wl = V.y(WATERLINE);
  // the beach itself, behind the play line: sand from the waterline down
  const g = x.createLinearGradient(0, wl, 0, V.gy);
  g.addColorStop(0, mix([92, 70, 62], [52, 36, 40], p)); g.addColorStop(1, mix([132, 96, 66], [78, 54, 46], p));
  x.fillStyle = g; x.fillRect(0, wl, V.viewW, V.gy - wl);
  // the wash: up the sand and back, in a slow rhythm; wet sand shines under it
  const wash = (Math.sin(V.t * 0.018) + 1) / 2, reach = Math.round(2 + wash * 9);
  x.fillStyle = mix([150, 120, 120], [80, 60, 80], p, 0.45); x.fillRect(0, wl, V.viewW, reach + 3);
  for (let sx = -(V.cam % 6); sx < V.viewW; sx += 6) {
    const k = hash(Math.floor((sx + V.cam) / 6) * 3), dy = Math.round(reach + (k - 0.5) * 3);
    x.fillStyle = 'rgba(255,240,226,' + (0.35 + k * 0.4).toFixed(2) + ')'; x.fillRect(Math.round(sx), wl + dy, 5, 1);
    if (k > 0.6) { x.fillStyle = 'rgba(255,240,226,.25)'; x.fillRect(Math.round(sx + 1), wl + dy - 2, 3, 1); }
  }
  // a breaking wave just off the sand, curling in on its own beat
  const br = ((V.t * 0.006) % 1);
  x.fillStyle = 'rgba(255,240,226,' + (0.5 * Math.sin(br * Math.PI)).toFixed(2) + ')'; x.fillRect(0, wl - 4 + Math.round(br * 3), V.viewW, 1);
  // ripples in the dry sand, and footprints along the play line
  x.fillStyle = 'rgba(40,24,16,.18)';
  for (let i = 0; i < 26; i++) { const sx = ((hash(i) * 2000 - V.cam) % 2000 + 2000) % 2000 - 100, sy = wl + 14 + hash(i + 5) * (V.gy - wl - 16); if (sx < V.viewW) x.fillRect(Math.round(sx), Math.round(sy), 6 + Math.round(hash(i + 9) * 10), 1); }
}

// ---------- the play band ----------

function stairs(x: CanvasRenderingContext2D, V: View, p: number) {
  const s0 = V.sx(0), y = V.y;
  if (!onScreen(V, s0 - 10, 220)) return;
  // the sea wall under the promenade, and the promenade railing over it
  box(x, s0 - 200, y(64), 400, 64, '#2a1e1a', 'rgba(' + O + ',.45)');
  x.fillStyle = 'rgba(' + O + ',.12)'; for (let k = 1; k < 5; k++) x.fillRect(s0 - 200, y(k * 13), 400, 1);
  x.fillStyle = '#3a2a22'; x.fillRect(s0 - 200, y(66), 400, 3);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(s0 - 200, y(66), 400, 1);
  for (let k = 0; k < 20; k++) x.fillRect(s0 - 196 + k * 20, y(80), 1, 14);
  x.fillRect(s0 - 200, y(80), 400, 1);
  // the stairs down from the promenade, from the left edge
  for (let k = 0; k < 8; k++) box(x, s0 + k * 6 - 4, y(64 - k * 8), 12, 8, mix([90, 66, 50], [54, 40, 34], p), 'rgba(' + O + ',.55)');
  x.fillStyle = 'rgba(' + O + ',.7)'; x.fillRect(s0 - 4, y(84), 2, 20); x.beginPath(); x.moveTo(s0 - 3, y(84)); x.lineTo(s0 + 46, y(22)); x.lineTo(s0 + 47, y(23)); x.lineTo(s0 - 2, y(85)); x.fill();
  // the way out, on a plate by the stairs (cyan: you can use it)
  box(x, s0 + 4, y(108), 64, 12, '#04100f', 'rgba(' + C + ',.6)');
  text(x, '< HARBOR', s0 + 34, y(102), 'rgba(' + C + ',.95)', 7, '600');
  x.fillStyle = '#2a1d14'; x.fillRect(s0 + 34, y(96), 2, 12);
  tell(x, V.t, s0 + 62, y(102));
}

function boardwalk(x: CanvasRenderingContext2D, V: View, p: number) {
  const l = V.sx(-10), r = V.sx(L.boardwalk), y = V.y;
  if (r < -4 || l > V.viewW + 4) return;
  // planks, a step above the sand
  box(x, l, y(4), r - l, 6, mix([110, 78, 52], [66, 46, 36], p), 'rgba(' + O + ',.6)');
  for (let bx = -10; bx < L.boardwalk; bx += 9) { x.fillStyle = 'rgba(20,10,6,.4)'; x.fillRect(V.sx(bx), y(4), 1, 6); }
  // the Registry's beach notice, on its post
  registryBoard(x, V, { x: L.board, h: 34, w: 128, tall: 60, mount: 'pole', title: 'PUBLIC BEACH', seed: 3, lines: ['TOWELS: SHOW VALID ID', 'SAND: MUNICIPAL PROPERTY', 'UNVERIFIED: SECTOR 4'] });
  tell(x, V.t, V.sx(L.board + 60), y(44));
}

function kiosk(x: CanvasRenderingContext2D, V: View, m: ZoneModel, hover: string | null) {
  const c = V.sx(L.kiosk), y = V.y;
  if (!onScreen(V, c - 40, 80)) return;
  box(x, c - 15, y(50), 30, 50, '#e8e0d0', 'rgba(' + O + ',.8)');
  box(x, c - 15, y(50), 30, 8, '#c83a2a');
  for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#e8e0d0' : '#c83a2a'; x.fillRect(c - 19 + k * 10, y(56), 10, 4); }
  // the meter's screen (cyan: you can use it), ticking while you rent
  box(x, c - 11, y(44), 22, 14, '#04100f', 'rgba(' + C + ',.7)');
  const rented = !!m.get('rented'), paused = m.get('billing') === 'pause';
  text(x, rented ? (paused ? 'II' : String(m.get('billed') ?? 0) + 'T') : '1T', c, y(37), 'rgba(' + C + ',' + (rented && !paused && Math.floor(V.t / 30) % 2 ? 0.5 : 0.95) + ')', 7, '600');
  box(x, c - 6, y(26), 12, 6, '#2a2a30', 'rgba(' + C + ',.5)');
  tell(x, V.t, c + 10, y(22), 1);
  // the sign on top, on its frame
  x.fillStyle = '#2a1d14'; x.fillRect(c - 12, y(64), 2, 6); x.fillRect(c + 10, y(64), 2, 6);
  box(x, c - 40, y(76), 80, 12, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'SUNBEDS 1T / MIN', c, y(70), 'rgba(' + PAPER + ',.95)', 7, '600');
  if (hover === 'kiosk') glow(x, c - 15, y(50), 30, 50);
}

function sunbeds(x: CanvasRenderingContext2D, V: View, m: ZoneModel, p: number) {
  const y = V.y, cols = ['#c83a2a', '#d8b040', '#3a6ad8', '#e8e0d0'];
  L.sunbeds.forEach((bx, i) => {
    const c = V.sx(bx);
    if (!onScreen(V, c - 30, 60)) return;
    // the umbrella first (behind)
    x.fillStyle = '#4a3a2a'; x.fillRect(c - 12, y(52), 1, 52);
    x.fillStyle = cols[i]; x.beginPath(); x.moveTo(c - 32, y(46)); x.quadraticCurveTo(c - 12, y(60), c + 8, y(46)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(c - 30, y(46), 38, 1);
    // the bed: frame and slats
    x.fillStyle = '#5a4030'; x.fillRect(c - 14, y(8), 2, 8); x.fillRect(c + 12, y(8), 2, 8);
    box(x, c - 16, y(10), 32, 3, mix([200, 190, 170], [140, 120, 110], p), 'rgba(' + O + ',.5)');
    x.fillStyle = mix([200, 190, 170], [140, 120, 110], p); x.fillRect(c + 10, y(18), 4, 8);
    // a numbered tag on each: the kiosk rents them by number
    box(x, c - 4, y(6), 8, 6, '#1a120b', 'rgba(' + PAPER + ',.5)');
    text(x, String(4 + i), c, y(3), 'rgba(' + PAPER + ',.9)', 7, '600');
    if (bx === L.mine && m.get('rented')) {
      // your towel, and the kiosk's red tag on it
      x.fillStyle = '#3a8a8a'; x.fillRect(c - 14, y(12), 22, 2);
      x.fillStyle = '#e8e0d0'; x.fillRect(c - 12, y(12), 2, 2); x.fillRect(c - 6, y(12), 2, 2);
      x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 6, y(14), 4, 3);
    }
  });
}

/** SALT: the shack on stilts, string lights, the bar under it with LIME, the bottles, the photo, the jukebox, the mixer. */
function salt(x: CanvasRenderingContext2D, V: View, m: ZoneModel, hover: string | null, p: number) {
  const { x0, x1 } = L.shack, l = V.sx(x0), r = V.sx(x1), y = V.y, w = r - l;
  if (r < -60 || l > V.viewW + 60) return;
  const floor = 64, roof = 116;
  // warm light under and around the bar
  const lg = x.createRadialGradient(V.sx(560), y(30), 4, V.sx(560), y(30), 160);
  lg.addColorStop(0, 'rgba(255,190,110,.28)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = lg; x.fillRect(l - 120, y(150), w + 240, 160);
  // stilts
  for (const sx of [x0 + 6, x0 + 80, x0 + 150, x1 - 8]) { x.fillStyle = '#3a2618'; x.fillRect(V.sx(sx) - 2, y(floor), 5, floor); x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(V.sx(sx) - 2, y(floor), 1, floor); }
  // the back wall under the floor: shelves of bottles
  box(x, l + 8, y(floor - 2), w - 16, floor - 30, '#24140c', 'rgba(' + O + ',.35)');
  const bc = ['#5aa83a', '#d8b040', '#c83a2a', '#e8e0d0', '#3a6ad8', '#8a3a8a', '#d86a2a'];
  for (let row = 0; row < 2; row++) {
    const sy = y(36 + row * 13);
    x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(l + 12, sy, w - 24, 1);
    for (let k = 0; k < 18; k++) {
      const bx = l + 16 + k * ((w - 30) / 18), n = hash(k + row * 40);
      if (n < 0.15) continue;
      x.fillStyle = bc[Math.floor(n * bc.length)]; x.fillRect(Math.round(bx), sy - 7, 3, 7); x.fillRect(Math.round(bx) + 1, sy - 9, 1, 2);
      if (n > 0.7) { x.fillStyle = 'rgba(255,240,200,.5)'; x.fillRect(Math.round(bx), sy - 6, 1, 3); }
    }
  }
  // Moth's photo, propped behind the gin (a small square of paper on the top shelf)
  const ph = V.sx(500);
  box(x, ph - 4, y(58), 8, 9, '#e8e0d0');
  x.fillStyle = '#2a2a30'; x.fillRect(ph - 3, y(57), 6, 5); x.fillStyle = '#c99068'; x.fillRect(ph - 1, y(56), 2, 2); x.fillStyle = '#46506e'; x.fillRect(ph - 2, y(54), 4, 2);
  // LIME, between the bottles and the counter
  lime(x, V);
  // the shack itself, up on the stilts
  box(x, l - 4, y(roof - 6), w + 8, roof - 6 - floor, mix([120, 84, 56], [70, 48, 38], p), 'rgba(' + O + ',.75)');
  for (let bx = x0; bx < x1; bx += 8) { x.fillStyle = 'rgba(20,10,6,.25)'; x.fillRect(V.sx(bx), y(roof - 6), 1, roof - 6 - floor); }
  // windows up there, lit from inside
  for (const wx of [x0 + 24, x1 - 52]) { box(x, V.sx(wx), y(roof - 18), 28, 18, 'rgba(255,190,110,.55)', 'rgba(' + O + ',.8)'); x.fillStyle = 'rgba(40,20,10,.6)'; x.fillRect(V.sx(wx) + 13, y(roof - 18), 2, 18); }
  // the ladder up
  for (let k = 0; k < 7; k++) { x.fillStyle = '#5a3a24'; x.fillRect(V.sx(x1) + 4, y(8 + k * 8), 10, 2); }
  x.fillStyle = '#5a3a24'; x.fillRect(V.sx(x1) + 4, y(floor), 2, floor); x.fillRect(V.sx(x1) + 13, y(floor), 2, floor);
  // the roof: palm thatch, ragged
  x.fillStyle = mix([170, 130, 70], [100, 74, 50], p);
  x.beginPath(); x.moveTo(l - 16, y(roof - 6)); x.lineTo(V.sx((x0 + x1) / 2), y(roof + 18)); x.lineTo(r + 16, y(roof - 6)); x.closePath(); x.fill();
  x.fillStyle = 'rgba(40,20,10,.35)';
  for (let k = 0; k < 30; k++) x.fillRect(l - 14 + k * ((w + 28) / 30), y(roof - 6), 2, 3 + Math.round(hash(k) * 4));
  // SALT in neon on the shack front
  sign(x, V.t, 'SALT', V.sx(550), y(floor + 22), YELLOW, { size: 11, phase: 30 });
  // the counter, waist high, with a lit rim
  box(x, l + 2, y(26), w - 4, 26, '#3a2414', 'rgba(255,170,80,.75)');
  x.fillStyle = 'rgba(255,190,110,.9)'; x.fillRect(l + 2, y(26), w - 4, 2);
  for (let bx = x0 + 10; bx < x1 - 4; bx += 14) { x.fillStyle = 'rgba(20,10,6,.35)'; x.fillRect(V.sx(bx), y(24), 1, 24); }
  // the menu on the left stilt
  menuBoard(x, V, { x: L.order - 8, h: 36, w: 66, tall: 22, mount: 'hang', to: floor, items: [['HOUSE', '2T'], ['WATER', '2T']], phase: 70 });
  // stools in front
  for (const sx of [500, 560, 600]) { x.fillStyle = '#5a3a24'; x.fillRect(V.sx(sx) - 1, y(14), 2, 14); box(x, V.sx(sx) - 5, y(16), 10, 3, '#8a5a3a', 'rgba(' + O + ',.6)'); }
  // string lights from the eaves to two poles, swaying
  const poles = [x0 - 40, x1 + 46];
  for (const px of poles) { x.fillStyle = '#3a2618'; x.fillRect(V.sx(px) - 1, y(86), 3, 86); }
  const runs: [number, number, number, number][] = [[poles[0], 84, x0 - 4, floor + 34], [x0 - 4, floor + 34, x1 + 4, floor + 34], [x1 + 4, floor + 34, poles[1], 84]];
  runs.forEach(([ax, ah, bx, bh], ri) => {
    const sag = ri === 1 ? 10 : 8, sw = Math.sin(V.t * 0.02 + ri) * 1.5;
    x.strokeStyle = 'rgba(40,24,16,.9)'; x.beginPath(); x.moveTo(V.sx(ax), y(ah)); x.quadraticCurveTo((V.sx(ax) + V.sx(bx)) / 2 + sw, y((ah + bh) / 2 - sag * 2), V.sx(bx), y(bh)); x.stroke();
    const n = Math.max(3, Math.round(Math.abs(bx - ax) / 14));
    for (let k = 1; k < n; k++) {
      const f = k / n, mx = (V.sx(ax) + V.sx(bx)) / 2 + sw, my = y((ah + bh) / 2 - sag * 2);
      const qx = (1 - f) * (1 - f) * V.sx(ax) + 2 * (1 - f) * f * mx + f * f * V.sx(bx), qy = (1 - f) * (1 - f) * y(ah) + 2 * (1 - f) * f * my + f * f * y(bh);
      const col = ['255,200,110', '255,120,90', '255,230,160', '140,220,120'][(k + ri) % 4], on = (Math.floor(V.t / 25) + k) % 9 !== 0;
      x.fillStyle = 'rgba(' + col + ',' + (on ? 0.95 : 0.3) + ')'; x.fillRect(Math.round(qx) - 1, Math.round(qy) + 1, 2, 3);
      if (on) { x.fillStyle = 'rgba(' + col + ',.12)'; x.fillRect(Math.round(qx) - 4, Math.round(qy) - 2, 8, 8); }
    }
  });
  // the jukebox
  const jx = V.sx(L.jukebox);
  box(x, jx - 13, y(44), 26, 44, '#3a2a30', 'rgba(255,190,120,.8)');
  x.fillStyle = 'rgba(255,190,120,.5)'; x.beginPath(); x.arc(jx, y(36), 11, Math.PI, 0); x.fill();
  const beat = Math.floor(V.t / 12) % 4;
  for (let k = 0; k < 3; k++) { x.fillStyle = ['rgba(255,120,90,.9)', 'rgba(255,210,58,.9)', 'rgba(140,220,120,.9)', 'rgba(255,120,90,.9)', 'rgba(255,210,58,.9)'][(k + beat) % 5]; x.fillRect(jx - 10 + k * 4, y(24), 3, 2); }
  box(x, jx - 8, y(20), 16, 8, '#04100f', 'rgba(' + C + ',.7)');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + C + ',.6)'; x.fillRect(jx - 6, y(18 - k * 2), 12, 1); }
  tell(x, V.t, jx + 9, y(8), 2);
  // music in the air, while it plays
  for (let k = 0; k < 3; k++) { const f = ((V.t * 0.01 + k / 3) % 1); x.fillStyle = 'rgba(255,217,165,' + (0.5 * (1 - f)).toFixed(2) + ')'; x.fillRect(jx + 6 + f * 10, y(48 + f * 20), 2, 2); x.fillRect(jx + 7 + f * 10, y(52 + f * 20), 1, 4); }
  if (hover === 'jukebox') glow(x, jx - 13, y(44), 26, 44);
  // the mixer on the counter: bottles upside down over one pump
  const mx = V.sx(L.mixer), poured = !!m.get('freeDrink');
  box(x, mx - 11, y(52), 22, 26, '#2a2a30', 'rgba(255,190,120,.8)');
  for (let k = 0; k < 4; k++) { x.fillStyle = bc[k + 1]; x.fillRect(mx - 9 + k * 5, y(52), 3, 8); }
  box(x, mx - 7, y(40), 14, 6, '#04100f', 'rgba(' + C + ',.7)');
  x.fillStyle = 'rgba(' + C + ',.9)'; x.fillRect(mx - 5, y(38), poured ? 10 : 4, 1);
  tell(x, V.t, mx + 8, y(30), 3);
  if (poured) {
    // the free drink, on the counter in front of the stool
    x.fillStyle = 'rgba(255,170,90,.85)'; x.fillRect(V.sx(600) - 2, y(32), 5, 6);
    x.fillStyle = '#7ab83a'; x.fillRect(V.sx(600) + 2, y(33), 2, 2);
  }
  if (hover === 'mixer') glow(x, mx - 11, y(52), 22, 26);
}

/** LIME, the robot bartender: a slim chrome body on a rail behind the counter, a round face screen, shaking a shaker. */
function lime(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.lime) + Math.round(Math.sin(V.t * 0.01) * 6), y = V.y;
  if (!onScreen(V, c - 20, 40)) return;
  x.fillStyle = '#5a5e66'; x.fillRect(c - 1, y(33), 3, 16);
  box(x, c - 8, y(49), 16, 18, '#8e949e', 'rgba(220,230,240,.7)');
  x.fillStyle = '#5aa83a'; x.fillRect(c - 8, y(37), 16, 2); // a lime-green band: its name
  // the face: a round screen, two eyes that blink
  x.fillStyle = '#1a1e24'; x.beginPath(); x.arc(c, y(57), 7, 0, 7); x.fill();
  x.strokeStyle = 'rgba(220,230,240,.7)'; x.beginPath(); x.arc(c, y(57), 7, 0, 7); x.stroke();
  const blink = V.t % 300 < 8;
  x.fillStyle = 'rgba(160,240,140,.95)'; x.fillRect(c - 4, y(58), 2, blink ? 1 : 2); x.fillRect(c + 2, y(58), 2, blink ? 1 : 2);
  x.fillRect(c - 2, y(54), 4, 1);
  // the shaker arm
  const sh = Math.round(Math.sin(V.t * 0.4) * 2), shaking = V.t % 400 < 120;
  x.fillStyle = '#8e949e'; x.fillRect(c + 8, y(45), 6, 2);
  box(x, c + 12, y(shaking ? 51 + sh : 43), 4, 8, '#d8d2c6');
}

function crab(x: CanvasRenderingContext2D, V: View) {
  const cx = V.sx(L.crab + Math.sin(V.t * 0.01) * 10), y = V.y;
  if (!onScreen(V, cx - 8, 16)) return;
  x.fillStyle = '#6e4c36'; x.fillRect(cx - 5, y(4), 10, 4);
  x.fillStyle = '#d8582a'; x.fillRect(cx - 4, y(3), 8, 3);
  const leg = Math.floor(V.t / 6) % 2;
  x.fillRect(cx - 6, y(1 + leg), 2, 1); x.fillRect(cx + 4, y(2 - leg), 2, 1);
  x.fillRect(cx - 6, y(6), 2, 2); x.fillRect(cx + 4, y(6), 2, 2);
  x.fillStyle = '#16100c'; x.fillRect(cx - 2, y(5), 1, 1); x.fillRect(cx + 1, y(5), 1, 1);
}

/** The lifeguard tower: legs, the cabin with the lifeguard, the flag, an ad panel, and the drone over it. */
function tower(x: CanvasRenderingContext2D, V: View, m: ZoneModel, hover: string | null) {
  const c = V.sx(L.tower), y = V.y;
  if (!onScreen(V, c - 70, 140)) return;
  x.strokeStyle = '#d8d0c0'; x.lineWidth = 2; x.beginPath();
  x.moveTo(c - 22, y(0)); x.lineTo(c - 14, y(58)); x.moveTo(c + 22, y(0)); x.lineTo(c + 14, y(58));
  x.moveTo(c - 20, y(16)); x.lineTo(c + 17, y(46)); x.moveTo(c + 20, y(16)); x.lineTo(c - 17, y(46)); x.stroke(); x.lineWidth = 1;
  box(x, c - 22, y(60), 44, 3, '#e8e0d0', 'rgba(' + O + ',.6)');
  // the ad panel on the tower's legs
  adScreen(x, V, { x: L.tower, h: 18, w: 40, tall: 28, ads: [['REGISTRY', 'PREMIUM'], ['RESCUE', 'PRIORITY', '700+'], ['VERIFIED', 'SWIMMERS', 'ONLY']], period: 300, cols: [YELLOW, PAPER, PAPER], seed: 5 });
  // the cabin roof
  box(x, c - 24, y(108), 48, 6, '#c83a2a', 'rgba(255,190,120,.7)');
  x.fillStyle = '#d8d0c0'; x.fillRect(c - 20, y(102), 2, 40); x.fillRect(c + 18, y(102), 2, 40);
  // the flag on its pole: green, or red when the drone has called danger
  const red = m.get('flag') === 'danger', fx = c - 30;
  x.fillStyle = '#d8d0c0'; x.fillRect(fx, y(130), 1, 70);
  const wave = Math.round(Math.sin(V.t * 0.08) * 1.5);
  x.fillStyle = red ? 'rgba(' + RED + ',.95)' : 'rgba(' + GREEN + ',.95)';
  x.beginPath(); x.moveTo(fx + 1, y(130)); x.lineTo(fx + 15, y(126 + wave)); x.lineTo(fx + 1, y(120)); x.closePath(); x.fill();
  // the drone, hovering over the water side, scanning the sea
  const dx = V.sx(L.drone), dy = y(124) + Math.round(Math.sin(V.t * 0.06) * 2);
  x.fillStyle = 'rgba(255,230,140,.06)';
  x.beginPath(); x.moveTo(dx - 2, dy + 8); x.lineTo(dx - 40 + Math.sin(V.t * 0.02) * 20, y(WATERLINE + 30)); x.lineTo(dx + 10 + Math.sin(V.t * 0.02) * 20, y(WATERLINE + 30)); x.lineTo(dx + 2, dy + 8); x.closePath(); x.fill();
  const rot = Math.floor(V.t / 2) % 2;
  x.fillStyle = '#8e949e'; x.fillRect(dx - 15, dy - 1, rot ? 10 : 6, 1); x.fillRect(dx + 5 + (rot ? 0 : 4), dy - 1, rot ? 10 : 6, 1);
  x.fillStyle = '#4a4f5a'; x.fillRect(dx - 11, dy, 2, 3); x.fillRect(dx + 9, dy, 2, 3);
  box(x, dx - 9, dy + 2, 18, 7, '#e8e0d0', 'rgba(' + O + ',.6)');
  x.fillStyle = red ? 'rgba(' + RED + ',.95)' : 'rgba(' + GREEN + ',.9)'; x.fillRect(dx - 6, dy + 4, 4, 2);
  tell(x, V.t, dx + 5, dy + 5, 4);
  if (hover === 'drone') glow(x, dx - 15, dy - 2, 30, 13);
}

/** The volleyball net and the ball going over it. */
function volleyball(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.net), y = V.y;
  if (!onScreen(V, c - 80, 160)) return;
  // the net runs across the sand, seen at an angle: a far pole (higher up the beach), a near one, the mesh between
  const far = c + 8, near = c - 8;
  x.fillStyle = '#a8a094'; x.fillRect(far - 1, y(64), 2, 46);
  x.fillStyle = '#e8e0d0'; x.fillRect(near - 1, y(56), 2, 56);
  x.strokeStyle = 'rgba(232,222,196,.45)'; x.lineWidth = 1;
  x.beginPath();
  for (let k = 0; k <= 4; k++) { x.moveTo(near, y(54 - k * 4) + 0.5); x.lineTo(far, y(62 - k * 4) + 0.5); }
  for (let k = 0; k <= 4; k++) { const fx = near + k * 4; x.moveTo(fx + 0.5, y(54 + k * 2)); x.lineTo(fx + 0.5, y(38 + k * 2)); }
  x.stroke();
  x.fillStyle = '#e8e0d0'; x.beginPath(); x.moveTo(near, y(56)); x.lineTo(far, y(64)); x.lineTo(far, y(62)); x.lineTo(near, y(54)); x.closePath(); x.fill();
  // the ball: back and forth between the two sides, high over the net
  const f = (V.t * 0.006) % 2, s = f < 1 ? f : 2 - f, bx = c - 36 + 72 * s, by = y(46 + Math.sin(s * Math.PI) * 44);
  x.fillStyle = '#e8e0d0'; x.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4); x.fillStyle = '#d8b040'; x.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 1, 4);
  x.fillStyle = 'rgba(20,10,6,.25)'; x.fillRect(Math.round(bx) - 3, y(0) - 1, 6, 1);
}

/** The kids' sandcastle: a Registry office, with its queue of shells. */
function castle(x: CanvasRenderingContext2D, V: View, p: number) {
  const c = V.sx(L.castle), y = V.y, sand = mix([200, 160, 110], [130, 96, 72], p), dark = mix([150, 116, 80], [96, 70, 56], p);
  if (!onScreen(V, c - 30, 60)) return;
  box(x, c - 14, y(14), 28, 14, sand, 'rgba(60,36,20,.5)');
  box(x, c - 18, y(22), 8, 22, sand, 'rgba(60,36,20,.5)'); box(x, c + 10, y(22), 8, 22, sand, 'rgba(60,36,20,.5)');
  for (const tx of [c - 18, c - 14, c + 10, c + 14]) { x.fillStyle = sand; x.fillRect(tx, y(24), 3, 2); }
  x.fillStyle = dark; x.fillRect(c - 3, y(8), 6, 8);
  x.fillStyle = '#2a1d14'; x.fillRect(c + 14, y(32), 1, 10); x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 15, y(32), 5, 3);
  // the queue: shells in a row to the door
  for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#e8e0d0' : '#d8a080'; x.fillRect(c - 24 - k * 5, y(2), 3, 2); }
  // a bucket and spade
  box(x, c + 22, y(8), 6, 8, '#3a6ad8'); x.fillStyle = '#d8b040'; x.fillRect(c + 30, y(12), 1, 12);
}

/** The surfer's board, standing in the sand beside them. */
function board(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.surfer + 12), y = V.y;
  if (!onScreen(V, c - 6, 12)) return;
  box(x, c - 3, y(50), 6, 50, '#e8e0d0', 'rgba(' + O + ',.6)');
  x.fillStyle = '#c83a2a'; x.fillRect(c - 3, y(34), 6, 3);
}

/** The pier: planks over the water, piles, the railing, lamps on the schedule (`lamps`), the controller box. */
function pier(x: CanvasRenderingContext2D, V: View, m: ZoneModel, hover: string | null, p: number) {
  const l = V.sx(L.pier0), r = V.sx(BEACH_W + 20), y = V.y, lit = m.get('lamps') === 'on';
  if (r < 0 || l > V.viewW) return;
  // piles down into the water (behind the deck)
  for (let px = L.pier0 + 20; px < BEACH_W + 20; px += 46) { x.fillStyle = '#2a1a12'; x.fillRect(V.sx(px) - 2, y(0), 5, V.viewH - V.gy); }
  // the deck
  box(x, l, y(3), r - l, 6, mix([110, 78, 52], [66, 46, 36], p), 'rgba(' + O + ',.65)');
  for (let bx = L.pier0; bx < BEACH_W + 20; bx += 9) { x.fillStyle = 'rgba(20,10,6,.35)'; x.fillRect(V.sx(bx), y(3), 1, 6); }
  // the railing on the far side
  x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(l, y(24), V.sx(1380) - l, 1);
  for (let bx = L.pier0; bx <= 1380; bx += 23) x.fillRect(V.sx(bx), y(24), 1, 21);
  // lamps on posts, every few metres; on or off on the schedule
  for (let k = 0; k < 3; k++) {
    const lx = V.sx(L.pier0 + 110 + k * 66);
    if (!onScreen(V, lx - 40, 80)) continue;
    if (lit) {
      const g = x.createRadialGradient(lx, y(56), 2, lx, y(40), 46);
      g.addColorStop(0, 'rgba(255,214,150,.22)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      x.fillStyle = g; x.fillRect(lx - 46, y(100), 92, 100);
    }
    x.fillStyle = '#2a1d14'; x.fillRect(lx - 1, y(56), 2, 54);
    box(x, lx - 3, y(60), 6, 5, '#3a2a1e', 'rgba(255,190,120,.5)');
    x.fillStyle = lit ? 'rgba(255,230,180,.95)' : 'rgba(255,230,180,.15)'; x.fillRect(lx - 2, y(57), 4, 2);
  }
  // the controller box at the pier's foot (cyan: the schedule can be read and hacked)
  const bx = V.sx(L.pierLights);
  x.fillStyle = '#2a1d14'; x.fillRect(bx - 1, y(14), 3, 14);
  box(x, bx - 9, y(36), 18, 22, '#5a5e66', 'rgba(220,230,240,.6)');
  box(x, bx - 6, y(32), 12, 6, '#04100f', 'rgba(' + C + ',.7)');
  x.fillStyle = lit ? 'rgba(255,230,180,.95)' : 'rgba(' + C + ',.35)'; x.fillRect(bx - 4, y(30), 3, 2);
  tell(x, V.t, bx + 5, y(18), 5);
  if (hover === 'pier') glow(x, bx - 9, y(36), 18, 22);
  // a sign on the railing at the pier's start
  // the harbour's board, bolted to the railing
  const sg = V.sx(1196);
  x.fillStyle = '#2a1d14'; x.fillRect(sg - 30, y(36), 2, 36); x.fillRect(sg + 28, y(36), 2, 36);
  box(x, sg - 34, y(44), 68, 20, '#1a120b', 'rgba(' + O + ',.7)');
  text(x, 'BERTHS 1-9', sg, y(38), 'rgba(' + PAPER + ',.95)', 7, '600');
  text(x, 'PERMIT HOLDERS', sg, y(30), 'rgba(' + PAPER + ',.8)', 7, '600');
}

/** The old man's rod and line, into the water past the railing. */
function rod(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.fisher), y = V.y;
  if (!onScreen(V, c - 10, 90)) return;
  box(x, c - 5, y(8), 10, 8, '#3a6a8a'); // his bucket
  const bend = Math.sin(V.t * 0.03) * 2;
  x.strokeStyle = '#5a3a24'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(c + 8, y(20)); x.quadraticCurveTo(c + 30, y(48), c + 50, y(50 + bend)); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(232,222,196,.35)'; x.beginPath(); x.moveTo(c + 50, y(50 + bend)); x.lineTo(c + 56, y(WATERLINE + 4)); x.stroke();
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c + 55, y(WATERLINE + 5) + Math.round(Math.sin(V.t * 0.05)), 2, 2);
}

/** Moth's boat at the end of the pier: cover tied down, hatch padlocked, the name on the hull, the harbour's notice. */
function boat(x: CanvasRenderingContext2D, V: View, hover: string | null, p: number) {
  const c = V.sx(L.boat), y = V.y, bob = Math.round(Math.sin(V.t * 0.03) * 1.5);
  if (!onScreen(V, c - 80, 160)) return;
  const by = y(0) + bob, hull = mix([214, 206, 190], [130, 120, 124], p);
  // the hull, its waterline stripe and its name, hand-painted
  x.fillStyle = hull;
  x.beginPath(); x.moveTo(c - 60, by - 24); x.lineTo(c + 64, by - 28); x.lineTo(c + 50, by); x.lineTo(c - 52, by); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.75)'; x.stroke();
  x.fillStyle = '#2e4a5e'; x.fillRect(c - 56, by - 8, 110, 3);
  text(x, 'NOT FISHING', c - 4, by - 16, 'rgba(40,24,48,.95)', 8, '600');
  // the cabin: cover tied down over the back, a dark window, the hatch with two padlocks
  box(x, c - 34, by - 54, 50, 30, mix([180, 172, 160], [110, 100, 104], p), 'rgba(' + O + ',.65)');
  box(x, c - 30, by - 50, 16, 10, 'rgba(20,24,30,.92)', 'rgba(' + O + ',.4)');
  box(x, c - 8, by - 50, 14, 24, '#3a2a22', 'rgba(' + O + ',.5)');
  x.fillStyle = '#d8b040'; x.fillRect(c + 2, by - 40, 3, 4); x.fillRect(c + 2, by - 34, 3, 4);
  x.fillStyle = '#4a5a3a'; x.fillRect(c + 18, by - 40, 40, 14);
  x.fillStyle = 'rgba(232,222,196,.6)'; for (const k of [24, 38, 52]) x.fillRect(c + k, by - 40, 1, 14);
  // the harbour's notice, taped to the cabin, with its red stamp
  box(x, c - 30, by - 37, 16, 11, 'rgba(232,222,196,.92)');
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(40,20,10,.6)'; x.fillRect(c - 28, by - 35 + k * 3, 12, 1); }
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(c - 19, by - 30, 4, 3);
  // the mast with no flag, the mooring line to the post
  x.fillStyle = '#2a1d14'; x.fillRect(c - 22, by - 88, 2, 34);
  x.strokeStyle = 'rgba(200,180,140,.6)'; x.beginPath(); x.moveTo(c - 58, by - 22); x.quadraticCurveTo(c - 70, by - 8, c - 76, y(8)); x.stroke();
  tell(x, V.t, c + 58, by - 22, 6);
  if (hover === 'boat') glow(x, c - 60, by - 54, 124, 54);
}

/** The gull on the last post but one: shoo it ([E] SHOO, index.ts) and it flies off, then comes back. */
function postGull(x: CanvasRenderingContext2D, V: View) {
  const c = V.sx(L.gull), y = V.y, since = V.t - GULL.shooed;
  if (!onScreen(V, c - 200, 400)) return;
  x.fillStyle = '#3a2618'; x.fillRect(c - 3, y(30), 6, 30);
  if (since < 600) {
    // up and away over the water, then back down
    const f = since / 600, out = f < 0.5 ? f * 2 : 2 - f * 2, gx = c + out * 160, gy = y(32 + out * 90);
    gullShape(x, gx, gy, V.t, 1);
    return;
  }
  x.fillStyle = '#e8e4dc'; x.fillRect(c - 4, y(36), 8, 4); x.fillRect(c + 2, y(39), 3, 3);
  x.fillStyle = '#8a8e96'; x.fillRect(c - 4, y(36), 5, 2);
  x.fillStyle = '#d8b040'; x.fillRect(c + 5, y(38), 2, 1);
  x.fillStyle = '#16100c'; x.fillRect(c + 3, y(38), 1, 1);
}

function gullShape(x: CanvasRenderingContext2D, gx: number, gy: number, t: number, s: number) {
  const up = Math.floor(t / 8) % 2;
  x.fillStyle = '#e8e4dc';
  x.fillRect(Math.round(gx) - 1, Math.round(gy), 3 * s, 2);
  x.fillRect(Math.round(gx) - 5 * s, Math.round(gy) - (up ? 2 : -1), 4 * s, 1); x.fillRect(Math.round(gx) + 2 * s, Math.round(gy) - (up ? 2 : -1), 4 * s, 1);
}

/** Gulls wheeling over the beach: far ones small and slow. */
function gulls(x: CanvasRenderingContext2D, V: View) {
  for (let i = 0; i < 7; i++) {
    const r = hash(i + 50), cx = (r * 1600 + Math.sin(V.t * 0.004 + i) * 120) - V.cam * (0.3 + r * 0.5), cy = V.y(130 + hash(i + 70) * 80) + Math.sin(V.t * 0.02 + i * 2) * 8;
    const sx = ((cx % 1700) + 1700) % 1700 - 100;
    if (sx < -10 || sx > V.viewW + 10) continue;
    gullShape(x, sx, cy, V.t + i * 3, r > 0.6 ? 2 : 1);
  }
}

/** Below the play line: dry sand in front, the water under the pier, and the lamps' light on it. */
function foreground(x: CanvasRenderingContext2D, V: View, m: ZoneModel, p: number) {
  const gy = V.gy, edge = V.sx(L.shore);
  // water under the pier, out to the end
  const g = x.createLinearGradient(0, gy, 0, V.viewH);
  g.addColorStop(0, mix([40, 52, 72], [18, 22, 40], p)); g.addColorStop(1, mix([20, 28, 44], [8, 10, 22], p));
  x.fillStyle = g; x.fillRect(Math.max(0, edge - 40), gy, V.viewW, V.viewH - gy);
  for (let k = 0; k < 12; k++) {
    const yy = gy + 4 + k * 5, off = (V.t * 0.3 + k * 17) % 30;
    x.fillStyle = 'rgba(255,236,214,' + (0.06 + 0.02 * (k % 3)) + ')';
    for (let sx = edge - 40 + off; sx < V.viewW; sx += 30) x.fillRect(Math.round(sx), yy, 8, 1);
  }
  if (m.get('lamps') === 'on') for (let k = 0; k < 3; k++) {
    const lx = V.sx(L.pier0 + 110 + k * 66);
    if (lx < -20 || lx > V.viewW + 20) continue;
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,214,150,' + (0.16 * (1 - i / 8)).toFixed(2) + ')'; x.fillRect(Math.round(lx - 5 + Math.sin(V.t * 0.05 + i) * 2), gy + 10 + i * 5, 10, 2); }
  }
  // the sand in front, its edge sloping into the water
  if (edge > -60) {
    x.fillStyle = mix([150, 112, 76], [88, 62, 50], p);
    x.beginPath(); x.moveTo(-2, gy); x.lineTo(edge, gy); x.lineTo(edge - 40, V.viewH); x.lineTo(-2, V.viewH); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,240,226,.4)'; x.fillRect(edge - 4, gy + 2, 3, 1); x.fillRect(edge - 14, gy + 14, 4, 1);
    x.fillStyle = 'rgba(40,24,16,.2)';
    for (let i = 0; i < 18; i++) { const sx = ((hash(i + 30) * 1300 - V.cam) % 1300 + 1300) % 1300 - 60; if (sx < edge - 50) x.fillRect(Math.round(sx), gy + 6 + Math.round(hash(i + 40) * (V.viewH - gy - 12)), 5, 1); }
  }
  x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, gy, Math.max(0, Math.min(V.viewW, edge)), 1);
}

function glow(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number) {
  x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
  x.strokeRect(l - 3.5, t - 3.5, w + 7, h + 7); x.restore();
}

// ---------- the whole place ----------

/** When the sun started setting on this visit (frames), so every visit has its sunset. */
let since = { at: 0, last: -10 };

/** Draw the beach. `hover`: the device under the pointer. */
export function drawBeach(x: CanvasRenderingContext2D, m: ZoneModel, d: DrawView, hover: string | null) {
  // the people kit and the sign kit want a scene view: the same camera, with parallax
  const cam = -d.sx(0);
  const V: View = { sx: (wx, par = 1) => Math.round(wx - cam * par), y: d.y, t: d.t, viewW: d.viewW, viewH: d.viewH, cam, gy: d.y(0), flags: {} };
  if (d.t < since.last || d.t - since.last > 30) since.at = d.t;
  since.last = d.t;
  // the sun sets over twelve minutes, from a low gold sun to dusk
  const p = Math.min(1, 0.12 + (d.t - since.at) / (60 * 60 * 12));
  const red = m.get('flag') === 'danger';

  sky(x, V, p);
  sun(x, V, p);
  city(x, V, p);
  sea(x, V, p, red);
  shore(x, V, p);
  gulls(x, V);
  if (red) drawPeople(x, V, ASHORE);
  stairs(x, V, p);
  boardwalk(x, V, p);
  sunbeds(x, V, m, p);
  drawPeople(x, V, SUNBEDS);
  drawPerson(x, V, sunbather);
  kiosk(x, V, m, hover);
  salt(x, V, m, hover, p);
  crab(x, V);
  tower(x, V, m, hover);
  drawPerson(x, V, lifeguard);
  volleyball(x, V);
  castle(x, V, p);
  board(x, V);
  drawPeople(x, V, BEACHGOERS);
  drawPerson(x, V, volley);
  drawPerson(x, V, kid);
  drawPerson(x, V, surfer);
  boat(x, V, hover, p);
  pier(x, V, m, hover, p);
  drawPerson(x, V, fisher);
  rod(x, V);
  drawPerson(x, V, PEOPLE[PEOPLE.length - 1]);
  postGull(x, V);
  foreground(x, V, m, p);
  // the light goes: a dusk wash over everything but the lamps, deeper as the sun goes down
  if (p > 0.4) { x.fillStyle = 'rgba(20,8,40,' + ((p - 0.4) * 0.25).toFixed(2) + ')'; x.fillRect(0, 0, V.viewW, V.viewH); }
}
