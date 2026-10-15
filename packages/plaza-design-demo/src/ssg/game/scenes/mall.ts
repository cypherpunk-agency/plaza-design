/**
 * The Galleria, a shopping mall at night: a ground floor of shops you can walk up to and use
 * (implants, a pawnbroker who buys memories, deck repair, a florist, a key cutter, a food court),
 * an escalator carrying people up to the gallery, a fountain with a kid and a cleaning robot,
 * a Registry kiosk that wants your face, security, cameras, and announcements on a ticker.
 * Above: the gallery's railing with people strolling, then the far side of the atrium, floor
 * after floor of shops (more on tall screens), and the skylight.
 *
 * Bands: far = the far side of the atrium and the skylight; middle = the big ad screen, the
 * gallery and its strollers; play = the shopfronts, the floor, its furniture and its people.
 * Built from the kits (ART-GUIDE §10): people (../characters.ts), screens (screens.ts), booths and
 * shelves (build.ts). The signs are dry; the people have the jokes.
 */

import { light } from '../light';
import { drawPane, glass } from '../sets/sky';
import { crowd, drawCharacters, drawCharacter, type Character } from '../characters';
import { booth, shelf, type ShelfSpec, type StallSpec } from './build';
import { box, C, exitDoor, GREEN, notice, O, onScreen, PAPER, RED, reflect, rng, sign, tell, text, type SceneDef, type SceneUse, type View } from './kit';
import { adScreen, camera, menuBoard, ticker, wallSign, YELLOW } from './screens';

/** Layout: positions in world units, heights up from the atrium floor. */
const L = {
  width: 2560,
  spawn: 86,
  /** The ground floor: shop interiors up to `ceil`, the fascia over them, the gallery slab, its railing. */
  ceil: 112,
  fascia: 130,
  slab: 144,
  rail: 160,
  /** The far side of the atrium: its floors, from `far0` up, `step` apart. */
  far0: 176,
  step: 86,
  storey: 70,
  kiosk: 110,
  registry: 400,
  escalator: { x: 660, w: 160 },
  escSign: 680,
  fountain: { x: 960, w: 150 },
  pillars: [380, 1790, 2390],
  /** Doors at play level: the Galleria metro station, the stairs to the roof's taxi pad, the service corridor to the market. */
  metro: 32,
  roof: 1740,
  service: 2510,
};

const FAR = 0.55;

// ---------- the keepers ----------

const implantClerk: Character = { seed: 7101, look: { body: 'slim', garb: 'suit', hair: 'bald', extras: ['visor', 'cyberarm'] }, x: 304, act: 'vend', facing: -1 };
const pawnbroker: Character = { seed: 7102, look: { body: 'wide', garb: 'jacket', hair: 'short', hairCol: '#a8a29a', top: '#6a2a3e', extras: ['glasses'] }, x: 590, act: 'vend', facing: -1 };
const deckTech: Character = { seed: 7103, look: { body: 'avg', garb: 'hivis', hair: 'bun', extras: ['glasses', 'cyberarm'] }, x: 1130, act: 'vend', facing: -1 };
const florist: Character = { seed: 7104, look: { body: 'old', garb: 'apron', hair: 'bun', hairCol: '#e8e4dc', extras: [] }, x: 1352, act: 'vend', facing: -1 };
const teen: Character = { id: 'teen', seed: 7105, look: { body: 'slim', garb: 'tee', hair: 'mohawk', hairCol: '#6a3a9a', extras: ['headphones', 'phone'] }, x: 1468, act: 'phone', facing: -1, name: 'KIOSK', talk: [
  ['Phone cases. Screens. Screen protectors for your screen protector.', 'I get paid by the hour. The hours are very long. Coincidence.'],
  ['If you\'re not buying, could you at least look interested? Camera 6 counts customers.'],
] };
const keyCutter: Character = { seed: 7106, look: { body: 'old', garb: 'apron', hair: 'brim', acc: '#5a3a2a', extras: ['glasses'] }, x: 1652, act: 'vend', facing: -1 };
const COOKS: Character[] = [
  { seed: 7107, look: { body: 'wide', garb: 'apron', hair: 'scarf', acc: '#c83a2a', extras: [] }, x: 1900, act: 'vend', facing: -1 },
  { seed: 7108, look: { body: 'tall', garb: 'tee', hair: 'cap', acc: '#d8b040', top: '#a84a3a', extras: ['mask'] }, x: 2050, act: 'vend', facing: -1 },
  { seed: 7109, look: { body: 'short', garb: 'apron', hair: 'beanie', extras: [] }, x: 2200, act: 'vend', facing: -1 },
];

// ---------- the floor's people ----------

const GUARD = { garb: 'jacket' as const, top: '#2e3a4a', bottom: '#1e2430', hair: 'cap' as const, acc: '#1a1a22' };
const kid: Character = { id: 'kid', seed: 7201, look: { body: 'kid', garb: 'tee', hair: 'cap', acc: '#c83a2a', extras: [] }, x: 1012, act: 'stand', facing: -1, name: 'KID', talk: [
  ['I threw a token in. I wished for two tokens.', 'The fountain is thinking about it.'],
  ['Mum says the fountain money goes to the Registry. I said then the Registry has my wish.', 'She said that\'s what worries her.'],
] };
const diner: Character = { id: 'diner', seed: 7202, look: { body: 'avg', garb: 'suit', hair: 'short', extras: ['glasses'] }, x: 2080, h: 10, act: 'sit', facing: -1, name: 'DINER', talk: [
  ['Six counters in this food court. Four of them are the same kitchen.', 'I eat lunch here because the park charges by the minute.'],
  ['Try the noodles. Everything else is also the noodles, in a different shape.'],
] };
const security: Character = { id: 'security', seed: 7203, look: { body: 'wide', ...GUARD, extras: ['visor'] }, x: 2320, act: 'stand', facing: -1, name: 'SECURITY', talk: [
  ['Galleria security. You look unverified. Most people do, after nine.', 'I\'m not paid to chase you. I\'m paid to write down which way you went.'],
  ['Lost child? Desk 2. Lost identity? Also desk 2. It\'s a busy desk.'],
] };
const dancer: Character = { id: 'dancer', seed: 7204, look: { body: 'tall', ...GUARD, hair: 'short', hairCol: '#16100c', extras: [] }, x: 2432, act: 'dance', facing: -1, name: 'SECURITY', talk: [
  ['(He freezes, mid-move.)', 'Camera 14 has a blind spot behind this pillar. Four minutes an hour. I did not tell you that.', 'I\'m stretching. It\'s in the union agreement.'],
  ['You again. Either dance or stand guard. Those are the only two jobs in here.'],
] };
const TALKERS: Character[] = [teen, kid, diner, security, dancer];

/** Shoppers, a patrol, the cleaning robot, a pigeon that got in: drawn in front of the shops. */
const FLOOR: Character[] = [
  { seed: 7301, x: 140, act: 'walk', range: [140, 620], look: { body: 'avg', garb: 'dress', hair: 'long', extras: ['bag'] } },
  { seed: 7302, x: 230, act: 'phone', facing: 1, look: { body: 'tall', garb: 'suit', hair: 'short', extras: ['phone'] } },
  { seed: 7303, x: 470, act: 'walk', range: [470, 900], speed: 0.26, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'] } },
  { seed: 7304, x: 520, act: 'haggle', facing: 1, look: { body: 'wide', garb: 'jacket', hair: 'beanie', extras: ['backpack'] } },
  { seed: 7305, x: 760, act: 'walk', range: [760, 1500], look: { body: 'avg', ...GUARD, extras: [] } },
  { seed: 7306, x: 870, act: 'walk', range: [870, 1260], speed: 0.4, look: { body: 'avg', garb: 'tee', hair: 'long', extras: ['headphones', 'bag'] } },
  { seed: 7307, x: 1060, act: 'stand', facing: -1, look: { body: 'avg', garb: 'coat', hair: 'bun', extras: ['bag'] } },
  { look: 'cleaner', x: 860, act: 'walk', range: [860, 1180] },
  { seed: 7308, x: 1196, act: 'walk', range: [1196, 1700], speed: 0.3, look: { body: 'tall', garb: 'jacket', hair: 'cap', extras: ['visor', 'backpack'] } },
  { seed: 7309, x: 1270, act: 'stand', facing: 1, look: { body: 'slim', garb: 'dress', hair: 'bun', extras: ['bag'] } },
  { seed: 7310, x: 1420, act: 'walk', range: [1420, 1000], speed: 0.5, look: { body: 'kid', garb: 'tee', hair: 'short', extras: ['backpack'] } },
  { seed: 7311, x: 1560, act: 'lean', facing: 1, look: { body: 'slim', garb: 'jacket', hair: 'hood', extras: [] } },
  { seed: 7312, x: 1700, act: 'walk', range: [1700, 2300], look: { body: 'wide', garb: 'coat', hair: 'short', extras: ['bag', 'umbrella'], acc: '#8a3a8a' } },
  { seed: 7313, x: 1950, h: 10, act: 'sit', facing: 1, look: { body: 'short', garb: 'tee', hair: 'long', extras: ['phone'] } },
  { seed: 7314, x: 2110, h: 10, act: 'sit', facing: 1, look: { body: 'old', garb: 'coat', hair: 'scarf', extras: [] } },
  { seed: 7315, x: 2238, h: 2, act: 'sleep', look: { body: 'tall', garb: 'jacket', hair: 'beanie', extras: [] } },
  { look: 'cleaner', x: 1840, act: 'walk', range: [1840, 2280] },
  { look: 'drone', x: 420, h: 118, act: 'scan' },
  { look: 'courier', x: 1500, act: 'walk', range: [1500, 2250], speed: 0.4 },
  { seed: 7316, x: 1980, act: 'queue', facing: 1, look: { body: 'avg', garb: 'hivis', hair: 'helmet', extras: [] } },
];
/** A pigeon that came in through the service door and stayed: answers E with a shoo (game.ts). */
const PIGEON: Character = { look: 'pigeon', seed: 7, x: 2160, act: 'walk', range: 24 };
/** Riding escalator B up to the gallery: placed every frame along the steps. */
const RIDERS: Character[] = [7401, 7402, 7403].map((seed, i) => ({ seed, x: 0, h: 0, act: i === 1 ? 'phone' : 'stand', facing: 1, look: i === 2 ? { body: 'kid' } : { extras: ['bag'] } } as Character));
/** Strollers on the gallery over the shops (middle band) and on the far side's floors. */
const GALLERY = crowd(77, 10, -100, 2700, { ps: 3, dim: 0.42, h: L.slab, acts: ['walk', 'walk', 'stand', 'phone'] });
const FAR_CROWD = crowd(79, 30, -100, 2900, { ps: 2, dim: 0.55, parallax: FAR, acts: ['walk', 'walk', 'walk', 'stand'] });

// ---------- the shopfronts ----------

interface Shop { id: string; x: number; w: number; sign: string; col: string; tint: string; keeper: Character; back?: (x: CanvasRenderingContext2D, v: View, s0: number, w: number) => void; counter?: (x: CanvasRenderingContext2D, v: View, s0: number, w: number) => void; plate?: string }

const PAWN_SHELF: ShelfSpec = { x: 466, w: 70, h: 84, rows: 3, seed: 81, stock: 'household' };
const SHOPS: Shop[] = [
  { id: 'implants', x: 170, w: 180, sign: 'VANTA IMPLANTS', col: PAPER, tint: '230,235,255', keeper: implantClerk, plate: 'FINANCE AVAILABLE',
    back: (x, v, s0) => {
      const { y, t } = v;
      for (let k = 0; k < 3; k++) {
        const cx = s0 + 14 + k * 44;
        box(x, cx, y(96), 34, 40, 'rgba(220,235,255,.1)', 'rgba(220,230,240,.5)');
        x.fillStyle = 'rgba(240,248,255,.6)'; x.fillRect(cx + 2, y(95), 30, 1);
        if (k === 0) { for (let j = 0; j < 2; j++) { x.fillStyle = '#e8e4dc'; x.beginPath(); x.arc(cx + 10 + j * 14, y(76), 5, 0, 7); x.fill(); x.fillStyle = j ? '#c86a2a' : '#5a8a3a'; x.fillRect(cx + 8 + j * 14, y(78), 4, 4); } }
        else if (k === 1) { box(x, cx + 8, y(90), 18, 30, '#8e949e', 'rgba(220,220,230,.6)'); x.fillStyle = '#ffb030'; x.fillRect(cx + 16, y(80), 2, 2); }
        else { for (let j = 0; j < 4; j++) { x.fillStyle = (Math.floor(t / 20) + j) % 4 ? 'rgba(255,190,110,.8)' : 'rgba(255,190,110,.2)'; x.fillRect(cx + 6 + j * 6, y(74), 3, 8); } }
        box(x, cx - 2, y(56), 38, 4, '#2a2622', 'rgba(220,200,160,.5)');
      }
    },
    counter: (x, v, s0) => { box(x, s0 + 20, v.y(34), 30, 8, 'rgba(220,235,255,.18)', 'rgba(220,230,240,.6)'); x.fillStyle = '#e8e4dc'; x.fillRect(s0 + 28, v.y(30), 6, 3); } },
  { id: 'pawn', x: 450, w: 180, sign: 'PAWN · MEMORY', col: YELLOW, tint: '255,200,120', keeper: pawnbroker, plate: 'PRICE PER MEGABYTE',
    back: (x, v, s0) => {
      const { y, t } = v;
      shelf(x, v, PAWN_SHELF);
      // the memory chair: a helmet on an arm, a meter counting megabytes
      const hx = s0 + 112;
      box(x, hx, y(40), 22, 6, '#3a2a2a', 'rgba(220,200,160,.5)'); box(x, hx + 16, y(64), 6, 24, '#3a2a2a', 'rgba(220,200,160,.5)');
      x.strokeStyle = 'rgba(220,200,160,.6)'; x.beginPath(); x.moveTo(hx + 19, y(64)); x.lineTo(hx + 8, y(78)); x.stroke();
      x.fillStyle = '#8e949e'; x.beginPath(); x.arc(hx + 6, y(74), 7, Math.PI, 0); x.fill();
      x.strokeStyle = 'rgba(' + YELLOW + ',.5)'; x.beginPath(); x.moveTo(hx + 6, y(74)); x.quadraticCurveTo(hx + 30, y(96), hx + 44, y(88)); x.stroke();
      box(x, hx + 36, y(98), 26, 16, '#050303', 'rgba(' + O + ',.55)');
      text(x, String(100 + (Math.floor(t / 8) % 900)), hx + 49, y(93), 'rgba(' + YELLOW + ',.95)', 7, '600');
      text(x, 'MB', hx + 49, y(86), 'rgba(' + PAPER + ',.6)', 7, '600');
      // a guitar on the wall, nobody's anymore
      x.fillStyle = '#8a5a2a'; x.beginPath(); x.ellipse(s0 + 96, y(58), 6, 8, 0, 0, 7); x.fill(); x.fillRect(s0 + 95, y(92), 2, 30);
    },
    counter: (x, v, s0) => { x.fillStyle = 'rgba(232,222,196,.8)'; x.fillRect(s0 + 24, v.y(28), 10, 2); box(x, s0 + 40, v.y(34), 14, 8, '#3a3a2a', 'rgba(220,200,160,.5)'); } },
  { id: 'florist', x: 1220, w: 180, sign: 'FLORIST', col: PAPER, tint: '210,240,190', keeper: florist, plate: 'DO NOT TOUCH',
    back: (x, v, s0) => {
      const { y, t } = v, r = rng(17);
      for (let k = 0; k < 9; k++) {
        const px = s0 + 10 + k * 18, ph = k % 3 === 0 ? 84 : k % 3 === 1 ? 56 : 30, sway = Math.sin(t * 0.02 + k) * 1;
        box(x, px, y(ph), 12, 8, ['#8a4a2a', '#5a3a2a', '#c8b8a0'][k % 3], 'rgba(220,200,160,.4)');
        for (let j = -2; j <= 2; j++) { x.fillStyle = ['#4e7a3a', '#3e6a2e', '#6a8a3a'][(j + 5 + k) % 3]; x.beginPath(); x.ellipse(px + 6 + j * 3 + sway, y(ph + 8 + 6 - Math.abs(j) * 2), 2.5, 6, j * 0.4, 0, 7); x.fill(); }
        if (r() < 0.5) { x.fillStyle = ['#e85a6a', '#e8c83a', '#e8e0d0'][k % 3]; x.fillRect(px + 4, y(ph + 20), 3, 3); }
      }
      x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(s0 + 6, y(84), 168, 1); x.fillRect(s0 + 6, y(56), 168, 1);
    },
    counter: (x, v, s0) => { box(x, s0 + 20, v.y(32), 14, 6, '#e8dcc0'); x.fillStyle = '#4e7a3a'; x.fillRect(s0 + 24, v.y(36), 5, 4); } },
  { id: 'keys', x: 1540, w: 150, sign: 'KEYS CUT', col: O, tint: '255,190,110', keeper: keyCutter, plate: 'REGISTERED ONLY',
    back: (x, v, s0) => {
      const { y } = v;
      box(x, s0 + 8, y(100), 90, 60, '#2a1d14', 'rgba(220,200,160,.4)');
      for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) {
        x.fillStyle = (r + c) % 3 ? 'rgba(214,170,60,.85)' : 'rgba(190,190,200,.8)';
        if ((r * 7 + c) % 4 === 0) { x.fillRect(s0 + 14 + c * 8, y(96 - r * 9), 5, 3); } else { x.fillRect(s0 + 15 + c * 8, y(96 - r * 9), 2, 6); x.fillRect(s0 + 14 + c * 8, y(96 - r * 9), 4, 2); }
      }
    },
    counter: (x, v, s0) => {
      const { y, t } = v;
      box(x, s0 + 18, y(40), 24, 14, '#4a4a50', 'rgba(220,220,230,.6)'); x.fillStyle = '#8e949e'; x.beginPath(); x.arc(s0 + 30, y(36), 5, 0, 7); x.fill();
      if (Math.floor(t / 6) % 5 < 2) for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,200,90,.9)'; x.fillRect(s0 + 34 + ((t * 3 + i * 7) % 12), y(34) - ((i * 5 + t) % 8), 1, 1); }
    } },
  { id: 'noodles', x: 1830, w: 140, sign: 'NOODLES', col: O, tint: '255,190,110', keeper: COOKS[0],
    back: (x, v) => menuBoard(x, v, { x: 1830 + 100, h: 54, w: 76, tall: 42, title: 'NOODLES', items: [['NO. 4', '1T'], ['NO. 5', '1T'], ['NO. 6', '1T']], phase: 10 }),
    counter: (x, v, s0) => steam(x, v, s0 + 24, v.y(30)) },
  { id: 'burger', x: 1980, w: 140, sign: 'VAT BURGER', col: RED, tint: '255,170,120', keeper: COOKS[1],
    back: (x, v) => menuBoard(x, v, { x: 1980 + 100, h: 54, w: 76, tall: 42, title: 'VAT', items: [['SINGLE', '1T'], ['DOUBLE', '2T'], ['FRIES', '1T']], col: RED, phase: 90 }),
    counter: (x, v, s0) => { box(x, s0 + 18, v.y(34), 30, 8, '#3a3634', 'rgba(220,200,180,.5)'); x.fillStyle = 'rgba(255,120,40,.6)'; x.fillRect(s0 + 20, v.y(34), 26, 2); } },
  { id: 'dumplings', x: 2130, w: 140, sign: 'DUMPLINGS', col: YELLOW, tint: '255,210,140', keeper: COOKS[2],
    back: (x, v) => menuBoard(x, v, { x: 2130 + 100, h: 54, w: 76, tall: 42, title: 'STEAMED', items: [['SIX', '1T'], ['TWELVE', '2T'], ['TEA', '1T']], phase: 170 }),
    counter: (x, v, s0) => { for (let i = 0; i < 2; i++) box(x, s0 + 18, v.y(32 + i * 6), 22, 6, '#a8824a', 'rgba(60,40,20,.6)'); steam(x, v, s0 + 22, v.y(42)); } },
];
const SHOP = Object.fromEntries(SHOPS.map((s) => [s.id, s])) as Record<string, Shop>;

const DECK: StallSpec = { x: 1080, w: 100, seed: 61, sign: 'DECK REPAIR', col: O, awning: 'tin', light: 'tube', vendor: deckTech,
  back: (x, v, p) => { for (let i = 0; i < 3; i++) { box(x, v.sx(p.x + 8 + i * 28), v.y(p.h1 - 6), 22, 16, '#050303', 'rgba(' + O + ',.5)'); x.fillStyle = 'rgba(' + GREEN + ',.6)'; for (let r = 0; r < 3; r++) x.fillRect(v.sx(p.x + 10 + i * 28), v.y(p.h1 - 9) + r * 4, 6 + ((r + i + Math.floor(v.t / 40)) % 3) * 4, 1); } } };
const CASES: StallSpec = { x: 1434, w: 68, seed: 62, sign: 'CASES', col: PAPER, awning: 'none', light: 'tube', vendor: teen, note: ['NO', 'REFUNDS'] };

function steam(x: CanvasRenderingContext2D, v: View, sx: number, sy: number) {
  for (let i = 0; i < 3; i++) {
    const ph = v.t * 0.04 + i * 2 + sx; x.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.05 * Math.sin(ph)) + ')'; x.beginPath();
    for (let j = 0; j < 14; j++) { const yy = sy - j * 1.6, xx = sx + i * 5 + Math.sin(ph + j * 0.35) * 2.5; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
    x.stroke();
  }
}

/** A shop on the ground floor: the lit interior, its keeper behind the counter, the fascia sign over it. */
function shopfront(x: CanvasRenderingContext2D, v: View, s: Shop) {
  const { y } = v, s0 = Math.round(v.sx(s.x)), w = s.w;
  if (!onScreen(v, s0 - 10, w + 20)) return;
  // the interior, lit
  box(x, s0, y(L.ceil), w, L.ceil, '#1c120c');
  const g = x.createLinearGradient(0, y(L.ceil), 0, y(0));
  g.addColorStop(0, 'rgba(' + s.tint + ',.2)'); g.addColorStop(1, 'rgba(' + s.tint + ',.05)');
  x.fillStyle = g; x.fillRect(s0, y(L.ceil), w, L.ceil);
  x.fillStyle = 'rgba(' + s.tint + ',.85)'; x.fillRect(s0 + 10, y(L.ceil - 2), w - 20, 2);
  s.back?.(x, v, s0, w);
  drawCharacter(x, v, s.keeper);
  // the counter across the shop's front half
  const cl = s0 + Math.round(w * 0.35), cw = Math.round(w * 0.6);
  box(x, cl, y(28), cw, 28, '#2a1a10', 'rgba(' + O + ',.85)');
  x.fillStyle = 'rgba(' + s.tint + ',.6)'; x.fillRect(cl, y(28), cw, 2);
  s.counter?.(x, v, cl, cw);
  if (s.plate) { box(x, cl + 6, y(20), Math.min(cw - 12, s.plate.length * 4.6 + 8), 10, '#e0d4b8', 'rgba(40,30,20,.8)'); text(x, s.plate, cl + 6 + Math.min(cw - 12, s.plate.length * 4.6 + 8) / 2, y(15), 'rgba(30,18,8,.95)', 7, '700'); }
  // the rolled-up shutter, the jambs, the glow on the floor
  box(x, s0, y(L.ceil), w, 6, '#2a2420', 'rgba(220,200,160,.4)');
  box(x, s0 - 4, y(L.fascia), 6, L.fascia, '#1e140c', 'rgba(' + O + ',.6)'); box(x, s0 + w - 2, y(L.fascia), 6, L.fascia, '#1e140c', 'rgba(' + O + ',.6)');
  wallSign(x, v, { x: s.x + w / 2, h: L.ceil + 9, text: s.sign, col: s.col, size: 8, phase: s.x });
  reflect(x, v, s0 + w / 2, s.tint, 0.9, Math.round(w * 0.6));
}

// ---------- things to do ----------

let implantAsk = 0, kioskTries = 0, deckChecks = 0, floristAsk = 0, leaves = 0, keyAsk = 0, meals = 0;
const MEALS = [
  ['Noodles, number four. The number is the noodles. There is no one to three.'],
  ['Vat burger. Grown in a vat in the basement. The vat has a name. We don\'t say it in front of customers.'],
  ['Dumplings. Six. Count them. I counted them. We both know it\'s five.'],
];
const MEMORIES: string[][] = [
  ['Memories bought by the megabyte. Let me see the head. Hold still.', '(The helmet hums.) Your first bike. Thirty-one megabytes, mostly a scuffed knee. One token.', 'Pleasure. You won\'t miss it. Nobody remembers what they sold here, that\'s the beauty of it.'],
  ['A birthday. Eleven candles. Good resolution, bit of cake on the lens.', 'One token. I\'d go two if there was a pony. There\'s never a pony.'],
  ['A rainy afternoon reading on a bus. Low drama, low price.', 'Still one token. I\'m sentimental. Don\'t tell anyone, it\'s bad for business.'],
];

const USES: SceneUse[] = [
  { id: 'implants', x: 262, label: '[E] VANTA IMPLANTS', price: (f) => (implantAsk && !f['mall:implant'] ? 2 : 0), name: 'VANTA CLERK', promptH: 70, use: (c) => {
    if (implantAsk++ === 0) return ['Welcome to Vanta. Eyes, ears, spines: the full catalogue.', 'An optic upgrade starts at four hundred tokens. Thirty-six months\' finance. Your lungs secure the loan.'];
    if (c.flags['mall:implant']) return ['The light in your thumb? It\'s working. You just don\'t have any messages.', 'We sell a messages package, if you\'d like some.'];
    if (!c.pay(2)) return ['We do have a budget option: looking at the catalogue. That\'s free.', 'Until it isn\'t. Read the terms.'];
    c.set('mall:implant');
    return ['Excellent. A subdermal light, left thumb, two tokens. It glows when you get a message.', '(A pinch. A glow.) You don\'t get messages? It glows anyway. Optimism is a feature.'];
  } },
  { id: 'kiosk', x: L.registry, label: '[E] VERIFY IDENTITY', name: 'REGISTRY KIOSK', promptH: 96, use: (c) => {
    c.set('mall:kiosk');
    return kioskTries++ === 0
      ? ['PLEASE LOOK INTO THE CAMERA.', 'IDENTITY NOT FOUND. MEMBER PRICES UNAVAILABLE. PLEASE CONTACT YOUR REGISTRY OFFICE.']
      : ['IDENTITY NOT FOUND.', 'THIS ATTEMPT HAS BEEN LOGGED. THANK YOU FOR SHOPPING AT THE GALLERIA.'];
  } },
  { id: 'pawn', x: 540, label: '[E] PAWN · SELL A MEMORY', name: 'PAWNBROKER', promptH: 70, use: (c) => {
    const n = ['mall:pawn1', 'mall:pawn2', 'mall:pawn3'].filter((f) => c.flags[f]).length;
    if (n >= MEMORIES.length) return ['No. You\'re running low. I don\'t buy from anyone under a gigabyte: bad for business, worse for you.', 'Come back when you\'ve made some new ones. Live a little. Then sell it to me.'];
    c.set('mall:pawn' + (n + 1)); c.give(1);
    return MEMORIES[n];
  } },
  { id: 'deck', x: 1130, label: '[E] DECK CHECKUP', price: 1, name: 'DECK REPAIR', promptH: 96, use: (c) => {
    if (!c.pay(1)) return ['A checkup is one token. I can look at it for free, but then all I\'ll tell you is that it\'s a deck.'];
    c.set('mall:deck');
    return deckChecks++ === 0
      ? ['(She opens your deck, blows into it, closes it.) Dust in the fan. Fixed.', 'Three sets of fingerprints on the keys. Yours, a cat\'s, and someone who types fast and angry. A friend?']
      : ['It\'s clean. Stop paying me to tell you it\'s clean.', '...Fine. Token received. It\'s clean.'];
  } },
  { id: 'florist', x: 1300, label: '[E] FLORIST', price: () => (floristAsk ? 2 : 0), name: 'FLORIST', promptH: 70, use: (c) => {
    if (floristAsk++ === 0) return ['Everything here is real. Grown in dirt, in daylight, from a seed. Look, don\'t touch.', 'The fern is nine hundred tokens. The basil is four hundred. A single basil leaf is two.'];
    if (!c.pay(2)) return ['Then just breathe near the fern. The first breath is free.'];
    c.set('mall:leaf'); c.add('basil');
    return leaves++ === 0
      ? ['One leaf. I\'ll wrap it.', 'Smell it on the way home. That\'s what you\'re paying for. Eating it would be a waste of money.']
      : ['Another leaf. You remind me of someone: the one with the deck and the smart pot.', 'Buys plant food here. Talks to their fern. The fern looks well on it.'];
  } },
  { id: 'keys', x: 1610, label: '[E] KEY CUTTER', price: (f) => (keyAsk && !f['mall:blankchip'] ? 2 : 0), name: 'KEY CUTTER', promptH: 70, use: (c) => {
    c.set('mall:keycutter');
    if (keyAsk++ === 0) return ['Keys cut. Chips copied. Registered chips only, it says so on the counter.', 'Unregistered ones I don\'t copy. I clone. Different word, different price.', 'Bring me a chip and a reason. I copy the chip and forget the reason.'];
    if (c.flags['mall:blankchip']) return ['You have your blank. When you need something opened, bring the chip it\'s afraid of.'];
    if (!c.pay(2)) return ['Two tokens for a blank. The pawnshop pays for memories, if you\'re short. I don\'t ask which ones.'];
    c.set('mall:blankchip'); c.add('blankchip');
    return ['A blank chip. Unregistered. Not illegal, just unsold.', 'I\'ll remember your face. It\'s the one memory I never sell.'];
  } },
  { id: 'order', x: 1900, label: '[E] ORDER', price: 1, name: 'FOOD COURT', promptH: 70, use: (c) => {
    if (!c.pay(1)) return ['One token. We take tokens, registered cards and nothing else. You are nothing else.'];
    c.set('mall:ate');
    return MEALS[meals++ % MEALS.length];
  } },
];

// ---------- the far side and the skylight ----------

const FAR_SHOPS = ['PHARMACY', 'OPTICIAN', 'SHOES', 'TELECOM', 'NEOBANK', 'TAILOR', 'CREDIT ADVICE', 'JEWELLER', 'TOYS', 'INSURANCE', 'TO LET', 'BEAUTY', 'SPORT', 'ELECTRONICS'];
const SHOP_W = 118;
/** Water drops in the fountain's arcs: [side, phase]. */
const DROPS = (() => { const r = rng(83); return Array.from({ length: 40 }, (_, i) => [i % 2 ? 1 : -1, r()]); })();

/** The far side's floors for this view: at least two; taller screens see more, the skylight just over the top one. */
function farLevels(v: View): number[] {
  const n = Math.max(2, Math.floor((v.gy - L.far0 - 30) / L.step));
  return Array.from({ length: n }, (_, i) => L.far0 + i * L.step);
}

function drawFarSide(x: CanvasRenderingContext2D, v: View) {
  const { y } = v, levels = farLevels(v), roofH = levels[levels.length - 1] + L.storey + 18;
  const sky = y(roofH);
  if (sky > 0) {
    // the sky of the moment through the skylight (sets/sky.ts): looking up, so only its upper part
    drawPane(x, 0, 0, v.viewW, sky, light(), { facing: 180, seed: 61, towers: false, horizon: 1.8 });
    const glow = x.createLinearGradient(0, 0, 0, sky);
    glow.addColorStop(0, 'rgba(194,65,12,.03)'); glow.addColorStop(1, 'rgba(194,65,12,.09)');
    x.fillStyle = glow; x.fillRect(0, 0, v.viewW, sky);
    x.strokeStyle = 'rgba(' + O + ',.15)';
    for (let wx = 0; wx < 2800; wx += 40) { const s = v.sx(wx, 0.4); if (s < -2 || s > v.viewW + 2) continue; x.beginPath(); x.moveTo(s + 0.5, 0); x.lineTo(s + 0.5, sky); x.stroke(); }
    x.fillStyle = '#0d0907'; x.fillRect(0, sky - 14, v.viewW, 14);
    x.strokeStyle = 'rgba(' + O + ',.22)'; x.strokeRect(-1, sky - 13.5, v.viewW + 2, 13);
    x.beginPath(); for (let wx = 0; wx < 2800; wx += 20) { const s = v.sx(wx, 0.4); if (s < -20 || s > v.viewW) continue; x.moveTo(s, sky - 1); x.lineTo(s + 10, sky - 13); x.lineTo(s + 20, sky - 1); } x.stroke();
  }
  x.fillStyle = '#0a0706'; x.fillRect(0, Math.max(0, sky), v.viewW, y(L.slab) - Math.max(0, sky));
  // daylight from the skylight, falling into the atrium (none at night: the shops' lights then)
  const lt = light(), [gc, ga] = glass(lt);
  if (ga > 0.02 && sky > -400) {
    const dl = x.createLinearGradient(0, Math.max(0, sky), 0, v.gy);
    dl.addColorStop(0, 'rgba(' + gc + ',' + (ga * 0.5).toFixed(3) + ')'); dl.addColorStop(1, 'rgba(' + gc + ',0)');
    x.fillStyle = dl; x.fillRect(0, Math.max(0, sky), v.viewW, v.gy - Math.max(0, sky));
  }
  levels.forEach((lv, li) => {
    for (let i = 0; i < 26; i++) {
      const s = v.sx(i * (SHOP_W + 6) - 40, FAR);
      if (!onScreen(v, s, SHOP_W)) continue;
      const name = FAR_SHOPS[(i + li * 5) % FAR_SHOPS.length], lit = name !== 'TO LET' && (i * 7 + li * 3) % 6 !== 0, top = y(lv + L.storey - 8);
      box(x, s, top, SHOP_W, L.storey - 8, lit ? '#140d08' : '#070504', 'rgba(' + O + ',.22)');
      if (lit) { x.fillStyle = 'rgba(255,190,110,.08)'; x.fillRect(s + 2, top + 12, SHOP_W - 4, L.storey - 22); }
      x.fillStyle = 'rgba(' + O + ',.18)'; for (let m = 30; m < SHOP_W; m += 30) x.fillRect(s + m, top + 12, 1, L.storey - 20);
      box(x, s + 10, top + 2, SHOP_W - 20, 9, '#0c0806');
      text(x, lit ? name : name === 'TO LET' ? 'TO LET' : 'CLOSED', s + SHOP_W / 2, top + 6.5, 'rgba(' + PAPER + ',' + (lit ? 0.42 : 0.18) + ')', 7);
    }
    x.fillStyle = '#120b07'; x.fillRect(0, y(lv), v.viewW, 8);
    x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(lv), v.viewW, 1);
  });
  // the far side's shoppers, one floor each
  FAR_CROWD.forEach((p, i) => { p.h = levels[i % levels.length] + 8; drawCharacter(x, v, p); });
  levels.forEach((lv) => { x.fillStyle = 'rgba(170,210,255,.04)'; x.fillRect(0, y(lv + 20), v.viewW, 12); x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(0, y(lv + 20), v.viewW, 1); });
}

/** Escalator B: a truss from the floor up to the gallery, steps creeping, people riding it. */
function drawEscalator(x: CanvasRenderingContext2D, v: View) {
  const E = L.escalator, { y, t } = v, a = v.sx(E.x), b = v.sx(E.x + E.w);
  if (b < -20 || a > v.viewW + 20) return;
  const y0 = y(0), y1 = y(L.slab);
  // the side panel (dark), the steps' line, the riders, the glass balustrade and the handrail
  x.fillStyle = '#1a100a'; x.beginPath(); x.moveTo(a - 10, y0); x.lineTo(b, y1 + 14); x.lineTo(b, y1 + 30); x.lineTo(a + 20, y0); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(' + O + ',.7)'; x.stroke();
  x.fillStyle = 'rgba(' + O + ',.35)';
  for (let k = 0; k < 16; k++) { const f = ((k + t * 0.012) % 16) / 16; x.fillRect(Math.round(a + (b - a) * f), Math.round(y0 + (y1 - y0) * f) - 1, 6, 1); }
  RIDERS.forEach((p, i) => { const f = ((t * 0.0012 + i / 3) % 1); p.x = E.x + 8 + f * (E.w - 16); p.h = f * (L.slab - 4); drawCharacter(x, v, p); });
  x.fillStyle = 'rgba(170,210,255,.07)'; x.beginPath(); x.moveTo(a, y0 - 2); x.lineTo(b, y1 - 2); x.lineTo(b, y1 - 20); x.lineTo(a, y0 - 20); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(30,20,14,1)'; x.lineWidth = 3; x.beginPath(); x.moveTo(a - 4, y0 - 20); x.lineTo(b, y1 - 20); x.stroke(); x.lineWidth = 1;
  x.strokeStyle = 'rgba(' + O + ',.55)'; x.beginPath(); x.moveTo(a - 4, y0 - 21.5); x.lineTo(b, y1 - 21.5); x.stroke();
  box(x, a - 14, y(10), 22, 10, '#2a1a10', 'rgba(' + O + ',.7)');
}

/** The Registry kiosk: a white pillar with a face-scan screen (cyan: you can use it). */
function drawRegistryKiosk(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, kx = v.sx(L.registry);
  if (!onScreen(v, kx - 40, 80)) return;
  const g = x.createRadialGradient(kx, y(60), 3, kx, y(50), 60);
  g.addColorStop(0, 'rgba(220,235,255,.12)'); g.addColorStop(1, 'rgba(220,235,255,0)');
  x.fillStyle = g; x.fillRect(kx - 60, y(120), 120, 120);
  box(x, kx - 16, y(84), 32, 84, '#c8c4bc', 'rgba(255,255,255,.7)');
  box(x, kx - 12, y(78), 24, 28, '#04191b', 'rgba(' + C + ',.7)');
  // a face outline, and a scan line running over it
  x.strokeStyle = 'rgba(' + C + ',.6)'; x.beginPath(); x.ellipse(kx, y(65), 6, 8, 0, 0, 7); x.stroke();
  x.fillStyle = 'rgba(' + C + ',.8)'; x.fillRect(kx - 10, y(77) + ((t * 0.5) % 24), 20, 1);
  x.fillStyle = 'rgba(' + RED + ',' + (Math.floor(t / 25) % 2 ? 0.9 : 0.3) + ')'; x.fillRect(kx - 2, y(82), 4, 2);
  tell(x, t, kx + 9, y(46));
  box(x, kx - 8, y(42), 16, 4, '#202024');
  // the seal and the header plate over it
  box(x, kx - 48, y(112), 96, 22, '#e8e4dc', 'rgba(40,30,20,.9)');
  text(x, 'VERIFY YOUR IDENTITY', kx, y(106), 'rgba(110,20,20,.95)', 7, '700');
  text(x, 'FOR MEMBER PRICES', kx, y(97), 'rgba(30,18,8,.95)', 7, '700');
  x.fillStyle = '#2a2622'; x.fillRect(kx - 1, y(90), 2, 6);
}

function drawFountain(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, F = L.fountain, fx = v.sx(F.x);
  if (!onScreen(v, fx - 110, 220)) return;
  const g = x.createRadialGradient(fx, y(20), 4, fx, y(30), 110);
  g.addColorStop(0, 'rgba(170,210,255,.12)'); g.addColorStop(1, 'rgba(170,210,255,0)');
  x.fillStyle = g; x.fillRect(fx - 110, y(120), 220, 120);
  box(x, fx - 4, y(44), 8, 30, '#1e110a', 'rgba(' + O + ',.7)');
  box(x, fx - 16, y(46), 32, 4, '#1e110a', 'rgba(' + O + ',.7)');
  for (const [side, ph] of DROPS) {
    const f = (ph + t * 0.012) % 1, dx = side * f * 56, dh = 46 + 34 * f - 70 * f * f;
    x.fillStyle = 'rgba(200,225,255,' + (0.7 - f * 0.4) + ')'; x.fillRect(Math.round(fx + dx), y(dh), 2, 2);
  }
  box(x, fx - F.w / 2, y(18), F.w, 18, '#1e110a', 'rgba(' + O + ',.85)');
  x.fillStyle = 'rgba(170,210,255,' + (0.35 + 0.1 * Math.sin(t * 0.08)) + ')'; x.fillRect(fx - F.w / 2 + 4, y(18), F.w - 8, 2);
  // coins on the bottom, glinting
  for (let i = 0; i < 9; i++) { x.fillStyle = (Math.floor(t / 30) + i) % 5 ? 'rgba(214,170,60,.5)' : 'rgba(255,230,150,.9)'; x.fillRect(Math.round(fx - 60 + i * 14 + (i % 3) * 3), y(16) + 3, 2, 1); }
  box(x, fx - 26, y(13), 52, 10, '#1a120b', 'rgba(' + O + ',.6)');
  text(x, 'FOUNTAIN', fx, y(8), 'rgba(' + PAPER + ',.85)', 7, '600');
  tell(x, t, fx + 22, y(4));
}

/** A food court table with two stools. */
function table(x: CanvasRenderingContext2D, v: View, wx: number) {
  const s = v.sx(wx), { y } = v;
  if (!onScreen(v, s - 40, 80)) return;
  for (const d of [-24, 24]) { x.fillStyle = '#2a1a10'; x.fillRect(s + d - 1, y(9), 2, 9); box(x, s + d - 7, y(11), 14, 3, '#8a2a1a', 'rgba(255,170,90,.5)'); }
  x.fillStyle = '#2a1d14'; x.fillRect(s - 1, y(20), 3, 20);
  box(x, s - 18, y(22), 36, 3, '#3a2a1e', 'rgba(255,190,120,.6)');
  x.fillStyle = '#e8e0d0'; x.fillRect(s - 8, y(25), 6, 3); x.fillStyle = '#d84a2a'; x.fillRect(s + 4, y(26), 4, 4);
}

/** The security desk: monitors of the cameras, a camera over it. */
function drawSecurity(x: CanvasRenderingContext2D, v: View) {
  const { y, t } = v, s = v.sx(2270);
  if (!onScreen(v, s - 10, 120)) return;
  for (let i = 0; i < 3; i++) {
    const mx = s + 6 + i * 30;
    box(x, mx, y(66), 26, 18, '#050505', 'rgba(220,220,230,.5)');
    x.fillStyle = 'rgba(200,215,200,.18)'; x.fillRect(mx + 2, y(64), 22, 14);
    x.fillStyle = 'rgba(220,230,220,.5)'; for (let k = 0; k < 3; k++) x.fillRect(mx + 4 + ((t * 0.1 * (k + 1) + k * 9 + i * 5) % 18), y(56) - 2, 1, 3);
    text(x, 'CAM ' + (11 + i * 3), mx + 13, y(52) + 3, 'rgba(' + PAPER + ',.6)', 7);
  }
  box(x, s, y(30), 100, 30, '#24130a', 'rgba(' + O + ',.85)');
  box(x, s + 30, y(24), 40, 10, '#e0d4b8', 'rgba(40,30,20,.8)'); text(x, 'DESK 2', s + 50, y(19), 'rgba(30,18,8,.95)', 7, '700');
}

export const mall: SceneDef = {
  id: 'mall',
  name: 'Mall',
  // facing (light.ts): the dome and the glass front face south
  facing: 180,
  width: L.width,
  spawn: L.spawn,
  intro: ['The mall. Warm, dry and recording everything I look at.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'galleriaStation', at: 'mall', label: '[E] DOWN TO THE METRO', promptH: 82 },
    { id: 'taxi', x: L.roof, to: '', action: 'taxi', label: '[E] ROOF PAD · HAIL TAXI', promptH: 82 },
    { id: 'market', x: L.service, to: 'market', at: 'mall', label: '[E] SERVICE CORRIDOR', promptH: 82 },
  ],
  readables: [
    { id: 'kiosk', x: L.kiosk, name: 'DIRECTORY', promptH: 70, pages: ['GALLERIA · GROUND FLOOR: IMPLANTS · PAWN · DECK REPAIR · FLORIST · KEYS · FOOD COURT.', 'EXITS: METRO (WEST). SKY TAXI (ROOF). SERVICE CORRIDOR (EAST, STAFF ONLY).'] },
    { id: 'fountain', x: L.fountain.x, name: 'FOUNTAIN', promptH: 66, pages: ['COINS ARE COLLECTED NIGHTLY. PROCEEDS: GALLERIA MAINTENANCE FUND.', 'WISHES ARE NOT RECORDED.'] },
    { id: 'escalator', x: L.escSign, name: 'ESCALATOR B', promptH: 76, pages: ['ESCALATOR B · UP ONLY.', 'DOWN SERVICE SUSPENDED PENDING REVIEW. USE STAIRS C.'] },
  ],
  people: [...TALKERS, PIGEON],
  uses: USES,

  drawBackdrop(x, v) {
    const { sx, y, t, gy } = v;
    // ---- far band: the other side of the atrium, the skylight ----
    drawFarSide(x, v);
    // ---- middle band: the big screen and the announcements, hanging from the skylight ----
    adScreen(x, v, { x: 1240, h: 236, w: 240, tall: 84, parallax: 0.85, mount: 'hang', period: 300,
      ads: [['MEMBER PRICES', 'VERIFIED IDENTITIES ONLY'], ['REGISTRY PREMIUM', 'SKIP EVERY QUEUE'], ['WELCOME BACK', 'IDENTITY NOT FOUND'], ['YOUR SCORE', 'YOUR PRICE'], ['GALLERIA', 'OPEN UNTIL 01:00']] });
    adScreen(x, v, { x: 400, h: 230, w: 120, tall: 50, parallax: 0.85, mount: 'hang', seed: 3, phase: 80 });
    adScreen(x, v, { x: 2100, h: 226, w: 130, tall: 52, parallax: 0.85, mount: 'hang', ads: [['FOOD COURT', 'OPEN'], ['LOITERING', 'IS MONITORED'], ['LOST CHILDREN', 'SECURITY DESK 2']], phase: 160 });

    // ---- the gallery over the shops: slab, strollers, glass railing ----
    x.fillStyle = '#0f0906'; x.fillRect(0, y(L.slab + 40), v.viewW, 40);
    drawCharacters(x, v, GALLERY);
    x.fillStyle = 'rgba(170,210,255,.05)'; x.fillRect(0, y(L.rail), v.viewW, L.rail - L.slab);
    x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(L.rail), v.viewW, 1);
    x.fillStyle = 'rgba(' + O + ',.2)'; for (let wx = 0; wx < L.width + 400; wx += 60) { const s = sx(wx); if (s > -2 && s < v.viewW + 2) x.fillRect(s, y(L.rail), 1, L.rail - L.slab); }
    box(x, -2, y(L.slab), v.viewW + 4, L.slab - L.fascia, '#160d08', 'rgba(' + O + ',.6)');
    for (let wx = 40; wx < L.width; wx += 160) { const s = sx(wx); if (!onScreen(v, s - 6, 12)) continue; x.fillStyle = 'rgba(255,230,190,.8)'; x.fillRect(s - 4, y(L.fascia) - 1, 8, 2); }
    ticker(x, v, { x: 960, h: L.slab + 2, w: 300, tall: 10, mount: 'wall', col: YELLOW, speed: 0.45,
      text: 'ANNOUNCEMENT · THE GALLERIA CLOSES AT 01:00 · UNVERIFIED VISITORS PROCEED TO EXIT B · LOST CHILDREN ARE HELD AT SECURITY DESK 2 · LOITERING IS MONITORED · MEMBER PRICES REQUIRE IDENTITY VERIFICATION' });

    // ---- play band: the ground floor's wall, the shops, the furniture ----
    x.fillStyle = '#110a06'; x.fillRect(0, y(L.fascia), v.viewW, L.fascia);
    x.fillStyle = 'rgba(' + O + ',.07)'; for (let wx = 0; wx < L.width; wx += 40) { const s = sx(wx); if (s > -2 && s < v.viewW) x.fillRect(s, y(L.fascia), 1, L.fascia - 20); }
    box(x, -2, y(20), v.viewW + 4, 20, '#160c08'); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(0, y(20), v.viewW, 1);
    x.fillStyle = 'rgba(' + O + ',.4)'; x.fillRect(0, y(L.fascia), v.viewW, 1);

    exitDoor(x, v, L.metro, '#0a0603', '< METRO');
    box(x, sx(32) - 1, y(L.fascia), 3, L.fascia - 96, '#2a160a');
    sign(x, t, 'EXIT', sx(32), y(92), GREEN, { size: 8, phase: 60 });
    const kx = sx(L.kiosk);
    if (onScreen(v, kx - 30, 60)) { box(x, kx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, kx, y(76), 54, 30, ['YOU ARE', 'HERE']); }

    for (const s of SHOPS) shopfront(x, v, s);
    // the food court's own sign over its counters
    wallSign(x, v, { x: 2050, h: L.slab + 22, text: 'FOOD COURT', col: O, size: 9, phase: 300 });
    exitDoor(x, v, L.roof, '#0a0603', 'SKY TAXI ^');
    exitDoor(x, v, L.service, '#0a0603', 'SERVICE >');
    for (const px of L.pillars) {
      const s = sx(px);
      if (!onScreen(v, s - 20, 40)) continue;
      box(x, s - 14, y(L.slab), 28, L.slab, '#1a0f09', 'rgba(' + O + ',.8)');
      box(x, s - 18, y(14), 36, 14, '#22130b', 'rgba(' + O + ',.8)');
    }
    camera(x, v, { x: L.pillars[0] + 12, h: 104, facing: 1, phase: 4 });
    camera(x, v, { x: L.pillars[1] - 12, h: 104, facing: -1, phase: 22 });
    camera(x, v, { x: L.pillars[2] - 14, h: 104, facing: -1, phase: 41 });
    camera(x, v, { x: 1200, h: L.fascia - 4, facing: -1, phase: 17 });
    drawRegistryKiosk(x, v);
    drawEscalator(x, v);
    const es = sx(L.escSign);
    if (onScreen(v, es - 30, 60)) { box(x, es - 1, y(40), 3, 40, '#2a160a'); notice(x, t, es, y(66), 50, 26, ['UP', 'ONLY'], 2); }
    drawFountain(x, v);
    booth(x, v, DECK);
    booth(x, v, CASES);
    for (const tx of [1950, 2110]) table(x, v, tx + 24);
    table(x, v, 2058);
    drawSecurity(x, v);
    // benches and planters along the floor
    for (const bx of [580, 1500]) {
      const s = sx(bx);
      if (!onScreen(v, s - 30, 60)) continue;
      box(x, s - 26, y(14), 52, 4, '#2a160a', 'rgba(' + O + ',.8)');
      box(x, s - 22, y(10), 3, 10, '#2a160a'); box(x, s + 19, y(10), 3, 10, '#2a160a');
    }

    // ---- the people ----
    drawCharacters(x, v, FLOOR);
    drawCharacters(x, v, [kid, diner, security, dancer, PIGEON]);

    // ---- the polished floor, with the shops' light in it ----
    x.fillStyle = '#070504'; x.fillRect(0, gy, v.viewW, v.viewH - gy);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    for (const s of SHOPS) reflect(x, v, sx(s.x + s.w / 2), s.tint, 0.7, Math.round(s.w * 0.5));
    const fx = sx(L.fountain.x);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(170,210,255,' + 0.05 * (1 - i / 6) + ')'; x.fillRect(fx - 60, gy + 3 + i * 5, 120, 2); }
    for (const px of L.pillars) { const s = sx(px); x.fillStyle = 'rgba(' + O + ',.06)'; x.fillRect(s - 14, gy + 2, 28, 30); }
    void SHOP;
  },

  drawFront(x, v) {
    // a near pillar sliding past, with a planter at its foot
    const s = v.sx(1060, 1.35);
    if (!onScreen(v, s - 24, 48)) return;
    box(x, s - 22, 0, 44, v.viewH, '#020100', 'rgba(' + O + ',.25)');
  },
};
