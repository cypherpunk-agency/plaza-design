/**
 * BUILDING KIT tenants: who rents a shop bay. A tenant decides what is behind the glass (its interior,
 * goods and light), the colour of the awning and the name on the fascia above, so a sign never hangs
 * over the wrong shop and no two windows on a street look alike. A front's glass bay names its tenant
 * (`bays` rows in elements.ts); a seeded ground floor picks tenants from the seed.
 *
 * Every interior is drawn in the bay's frame: from `bx` to `bx + w`, glass from 6 to 54 units up,
 * awning at 57..62. Colours stay warm or saturated; nothing is cyan (cyan is tech the player can use).
 */
import { neonPlate } from '../signage/kit';

type Y = (h: number) => number;
const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';

export interface Tenant {
  label: string;
  /** The name on the fascia ('' for none). */
  sign: string;
  /** Key colour (r,g,b): the room's light, the awning stripe, the sign. */
  col: string;
  /** Neon letters on the fascia instead of a printed lightbox. */
  neon?: boolean;
  /** The room is lit (an empty unit is not). */
  lit?: boolean;
  interior(x: CanvasRenderingContext2D, y: Y, bx: number, w: number, t: number, seed: number): void;
}

const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
/** Shelves across the back wall at these heights, each with goods drawn by `item`. */
function shelves(x: CanvasRenderingContext2D, y: Y, bx: number, w: number, hs: number[], col: string, item: (gx: number, h: number, j: number) => void, step = 6) {
  for (const h of hs) {
    x.fillStyle = rgba(col, 0.28); x.fillRect(bx + 3, y(h), w - 6, 1);
    for (let gx = bx + 4, j = 0; gx < bx + w - 6; gx += step, j++) item(gx, h, j);
  }
}

export const TENANTS: Record<string, Tenant> = {
  bar: {
    label: 'Bar', sign: 'BAR', col: '230,60,70', neon: true, lit: true,
    interior(x, y, bx, w, t, seed) {
      x.fillStyle = 'rgba(120,14,24,.45)'; x.fillRect(bx, y(54), w, 48);
      // bottles on two back shelves, a counter, stools; the light breathes a little
      const bottle = ['255,170,60', '120,200,90', '230,60,70', '255,217,165'];
      shelves(x, y, bx, w, [34, 46], '255,120,90', (gx, h, j) => { x.fillStyle = rgba(bottle[(j + seed) % 4], 0.6); x.fillRect(gx, y(h + 6), 2, 6); x.fillRect(gx + 0.5, y(h + 8), 1, 2); }, 4);
      x.fillStyle = '#1a0606'; x.fillRect(bx + 2, y(22), w - 4, 8); x.fillStyle = 'rgba(255,120,90,.5)'; x.fillRect(bx + 2, y(22), w - 4, 1);
      for (let sx = bx + 8; sx < bx + w - 8; sx += 14) { x.fillStyle = '#0a0303'; x.fillRect(sx, y(18), 6, 2); x.fillRect(sx + 2, y(16), 2, 10); }
      x.fillStyle = rgba('230,60,70', 0.06 + 0.04 * Math.sin(t / 50 + seed)); x.fillRect(bx, y(54), w, 48);
    },
  },
  noodles: {
    label: 'Noodle bar', sign: 'NOODLES', col: '255,170,60', neon: true, lit: true,
    interior(x, y, bx, w, t, seed) {
      x.fillStyle = 'rgba(255,150,50,.24)'; x.fillRect(bx, y(54), w, 48);
      // paper lanterns, menu tabs, a counter with pots and their steam
      for (let lx = bx + 8; lx < bx + w - 6; lx += 18) { x.fillStyle = 'rgba(230,60,40,.8)'; x.fillRect(lx, y(50), 4, 5); x.fillStyle = 'rgba(255,217,165,.6)'; x.fillRect(lx + 1, y(49), 2, 3); }
      for (let mx = bx + 4, j = 0; mx < bx + w - 8; mx += 7, j++) { x.fillStyle = j % 2 ? 'rgba(255,217,165,.55)' : 'rgba(255,240,210,.45)'; x.fillRect(mx, y(42), 5, 7); }
      x.fillStyle = '#1c0e04'; x.fillRect(bx + 2, y(20), w - 4, 14); x.fillStyle = 'rgba(255,170,60,.6)'; x.fillRect(bx + 2, y(20), w - 4, 1);
      for (let px = bx + 8, j = 0; px < bx + w - 10; px += 16, j++) {
        x.fillStyle = '#3a2416'; x.fillRect(px, y(26), 8, 6);
        for (let k = 0; k < 3; k++) { const rise = (t * 0.25 + k * 6 + j * 4 + seed) % 16; x.fillStyle = 'rgba(255,240,220,' + (0.35 - rise * 0.02) + ')'; x.fillRect(px + 2 + ((k + j) % 3) * 2 + Math.round(Math.sin((t + k * 20) / 14)), y(27 + rise), 1, 2); }
      }
    },
  },
  loans: {
    label: 'Loan office', sign: 'LOANS', col: '235,235,245', lit: true,
    interior(x, y, bx, w) {
      x.fillStyle = 'rgba(225,230,240,.2)'; x.fillRect(bx, y(54), w, 48);
      // one harsh tube, a desk with two chairs, a poster promising a rate
      x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(bx + 6, y(52), w - 12, 1);
      x.fillStyle = 'rgba(235,235,245,.12)'; x.fillRect(bx + 2, y(50), w - 4, 30);
      const px = bx + Math.round(w * 0.6); x.fillStyle = 'rgba(200,40,50,.75)'; x.fillRect(px, y(46), 14, 14); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(px + 3, y(43), 2, 2); x.fillRect(px + 9, y(37), 2, 2); x.fillRect(px + 4, y(41), 6, 1);
      x.fillStyle = '#121216'; x.fillRect(bx + 8, y(20), 30, 3); x.fillRect(bx + 10, y(17), 2, 11); x.fillRect(bx + 34, y(17), 2, 11);
      x.fillStyle = '#0a0a0e'; x.fillRect(bx + 4, y(16), 3, 10); x.fillRect(bx + 40, y(16), 3, 10);
    },
  },
  clinic: {
    label: 'Clinic', sign: 'CLINIC', col: '120,220,150', lit: true,
    interior(x, y, bx, w) {
      x.fillStyle = 'rgba(200,235,210,.16)'; x.fillRect(bx, y(54), w, 48);
      // a green cross, a curtain on a rail, a bed
      const cx = bx + 10; x.fillStyle = 'rgba(120,220,150,.85)'; x.fillRect(cx, y(46), 3, 9); x.fillRect(cx - 3, y(43), 9, 3);
      x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(bx + 22, y(50), w - 26, 1);
      for (let k = bx + 24; k < bx + w - 10; k += 3) { x.fillStyle = k % 2 ? 'rgba(150,200,170,.35)' : 'rgba(150,200,170,.2)'; x.fillRect(k, y(49), 2, 30); }
      x.fillStyle = '#0c1410'; x.fillRect(bx + w - 26, y(16), 22, 4); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(bx + w - 26, y(17), 6, 2);
    },
  },
  pharmacy: {
    label: 'Pharmacy', sign: '+ PHARMACY', col: '110,210,120', lit: true,
    interior(x, y, bx, w, _t, seed) {
      x.fillStyle = 'rgba(210,240,215,.18)'; x.fillRect(bx, y(54), w, 48);
      shelves(x, y, bx, w, [16, 28, 40], '200,240,210', (gx, h, j) => { x.fillStyle = hash(j + h + seed) < 0.3 ? 'rgba(110,210,120,.7)' : 'rgba(255,255,255,.55)'; x.fillRect(gx, y(h + 5), 4, 5); });
      x.fillStyle = 'rgba(110,210,120,.9)'; x.fillRect(bx + w - 12, y(51), 3, 7); x.fillRect(bx + w - 14, y(49), 7, 3);
    },
  },
  repair: {
    label: 'Repair shop', sign: 'REPAIR', col: '255,136,0', lit: true,
    interior(x, y, bx, w, t, seed) {
      x.fillStyle = 'rgba(255,136,0,.14)'; x.fillRect(bx, y(54), w, 48);
      // salvaged screens stacked on shelves, cables, a bench with a lamp and a soldering spark
      shelves(x, y, bx, w, [30, 42], '255,170,60', (gx, h, j) => { x.fillStyle = '#0c0805'; x.fillRect(gx, y(h + 8), 7, 7); const on = hash(j * 3 + h + seed + Math.floor(t / 90)) < 0.55; x.fillStyle = on ? (j % 3 ? 'rgba(255,170,60,.7)' : 'rgba(150,230,110,.6)') : 'rgba(80,60,40,.5)'; x.fillRect(gx + 1, y(h + 7), 5, 4); }, 9);
      x.strokeStyle = 'rgba(30,20,10,.9)'; x.beginPath(); x.moveTo(bx + 4, y(52)); x.quadraticCurveTo(bx + w / 2, y(36), bx + w - 4, y(51)); x.stroke();
      x.fillStyle = '#1a0f06'; x.fillRect(bx + 4, y(20), w - 8, 3); x.fillRect(bx + 8, y(17), 2, 11); x.fillRect(bx + w - 10, y(17), 2, 11);
      x.fillStyle = 'rgba(255,217,165,.8)'; x.fillRect(bx + w - 20, y(28), 6, 2);
      if ((t + seed * 7) % 40 < 4) { x.fillStyle = 'rgba(255,255,230,.95)'; x.fillRect(bx + w - 18, y(23), 1, 1); x.fillRect(bx + w - 17, y(24), 1, 1); }
    },
  },
  pawn: {
    label: 'Pawn shop', sign: 'PAWN', col: '230,190,80', lit: true,
    interior(x, y, bx, w, _t, seed) {
      x.fillStyle = 'rgba(220,180,80,.16)'; x.fillRect(bx, y(54), w, 48);
      // guitars on the wall, a row of watches, a stack of old sets
      for (let gx = bx + 6, j = 0; gx < bx + w * 0.55; gx += 12, j++) { x.fillStyle = j % 2 ? 'rgba(160,80,40,.85)' : 'rgba(200,120,50,.85)'; x.fillRect(gx, y(32), 6, 8); x.fillRect(gx + 1, y(36), 4, 3); x.fillStyle = '#20140a'; x.fillRect(gx + 2, y(50), 2, 18); }
      for (let wx = bx + 4; wx < bx + w - 4; wx += 4) { x.fillStyle = 'rgba(255,217,120,.8)'; x.fillRect(wx, y(18), 2, 2); }
      const tx = bx + Math.round(w * 0.62); x.fillStyle = '#100c08'; x.fillRect(tx, y(46), 16, 24); for (let k = 0; k < 2; k++) { x.fillStyle = hash(seed + k) < 0.5 ? 'rgba(220,180,80,.45)' : 'rgba(120,100,70,.4)'; x.fillRect(tx + 2, y(44 - k * 12), 12, 8); }
    },
  },
  phones: {
    label: 'Phone and SIM shop', sign: 'SIM · PHONES', col: '255,61,242', lit: true,
    interior(x, y, bx, w, t, seed) {
      x.fillStyle = 'rgba(255,61,242,.1)'; x.fillRect(bx, y(54), w, 48);
      // a wall of phones on display, screens cycling
      for (let r = 0; r < 3; r++) for (let gx = bx + 5, j = 0; gx < bx + w - 7; gx += 7, j++) {
        x.fillStyle = '#0c0610'; x.fillRect(gx, y(48 - r * 12), 4, 8);
        x.fillStyle = (j + r + Math.floor(t / 70) + seed) % 4 === 0 ? 'rgba(255,61,242,.75)' : 'rgba(255,217,240,.45)'; x.fillRect(gx + 1, y(47 - r * 12), 2, 6);
      }
      x.fillStyle = '#140818'; x.fillRect(bx + 3, y(14), w - 6, 6);
    },
  },
  convenience: {
    label: 'Convenience store', sign: '24H', col: '255,230,170', lit: true,
    interior(x, y, bx, w, _t, seed) {
      x.fillStyle = 'rgba(255,240,205,.26)'; x.fillRect(bx, y(54), w, 48);
      x.fillStyle = 'rgba(255,255,240,.6)'; x.fillRect(bx + 4, y(53), w - 8, 1);
      // aisles of packets, a drinks fridge at the side
      const fridge = Math.min(18, Math.round(w * 0.25));
      shelves(x, y, bx, w - fridge, [14, 26, 38], '255,230,170', (gx, h, j) => { const c = ['230,60,70', '255,170,60', '120,200,90', '255,217,165', '255,61,242'][Math.floor(hash(j * 7 + h + seed) * 5)]; x.fillStyle = rgba(c, 0.65); x.fillRect(gx, y(h + 6), 3, 6); }, 4);
      x.fillStyle = '#0e0c0a'; x.fillRect(bx + w - fridge - 3, y(50), fridge, 44); x.fillStyle = 'rgba(255,250,230,.4)'; x.fillRect(bx + w - fridge - 1, y(48), fridge - 4, 40);
      for (let k = 0; k < 4; k++) { x.fillStyle = rgba(['230,60,70', '120,200,90', '255,170,60', '255,217,165'][k], 0.7); x.fillRect(bx + w - fridge + 1, y(44 - k * 10), fridge - 8, 3); }
    },
  },
  grocer: {
    label: 'Grocer', sign: 'GROCER', col: '150,210,90', lit: true,
    interior(x, y, bx, w, _t, seed) {
      x.fillStyle = 'rgba(255,220,150,.18)'; x.fillRect(bx, y(54), w, 48);
      shelves(x, y, bx, w, [30, 42], '255,220,150', (gx, h, j) => { x.fillStyle = rgba(['200,70,40', '230,180,60', '120,180,70'][j % 3], 0.6); x.fillRect(gx, y(h + 5), 4, 5); });
      // crates of produce out on the pavement under the window
      for (let cx = bx + 2, j = 0; cx < bx + w - 14; cx += 16, j++) {
        x.fillStyle = '#3a2410'; x.fillRect(cx, y(10), 14, 8); x.fillStyle = 'rgba(255,170,60,.4)'; x.fillRect(cx, y(10), 14, 1);
        const fruit = ['200,60,40', '240,180,40', '110,180,60', '230,110,40'][(j + seed) % 4];
        for (let k = 0; k < 4; k++) { x.fillStyle = rgba(fruit, 0.9); x.fillRect(cx + 1 + k * 3, y(12) + (k % 2), 3, 2); }
      }
    },
  },
  hotel: {
    label: 'Hotel lobby', sign: 'HOTEL', col: '180,130,255', lit: true,
    interior(x, y, bx, w) {
      x.fillStyle = 'rgba(170,120,255,.12)'; x.fillRect(bx, y(54), w, 48);
      // a reception desk, the key board behind it, a tired plant
      x.fillStyle = '#100a18'; x.fillRect(bx + 6, y(22), w - 16, 12); x.fillStyle = 'rgba(180,130,255,.5)'; x.fillRect(bx + 6, y(22), w - 16, 1);
      for (let r = 0; r < 2; r++) for (let kx = bx + 10; kx < bx + w - 16; kx += 4) { x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(kx, y(44 - r * 6), 1, 2); }
      x.fillStyle = 'rgba(90,140,60,.7)'; x.fillRect(bx + w - 8, y(24), 4, 12); x.fillStyle = '#20140a'; x.fillRect(bx + w - 9, y(12), 6, 6);
    },
  },
  laundry: {
    label: 'Launderette', sign: 'LAUNDRY', col: '255,217,165', lit: true,
    interior(x, y, bx, w, t, seed) {
      x.fillStyle = 'rgba(255,230,190,.18)'; x.fillRect(bx, y(54), w, 48);
      for (let mx = bx + 4, j = 0; mx < bx + w - 14; mx += 15, j++) {
        x.fillStyle = '#d8d0c0'; x.fillRect(mx, y(28), 13, 22); x.fillStyle = '#1a1612'; x.fillRect(mx + 3, y(23), 7, 7);
        if ((j + seed) % 2) { x.fillStyle = 'rgba(255,170,60,.6)'; x.fillRect(mx + 4 + ((t >> 3) % 2), y(21), 3, 3); }
      }
    },
  },
  empty: {
    label: 'Empty unit', sign: '', col: '120,110,100', lit: false,
    interior(x, y, bx, w) {
      x.fillStyle = '#080605'; x.fillRect(bx, y(54), w, 48);
      // whitewashed glass and a paper notice
      x.fillStyle = 'rgba(200,190,170,.08)'; for (let k = bx + 2; k < bx + w - 2; k += 5) x.fillRect(k, y(52), 3, 44);
      const nx = bx + Math.round(w / 2) - 7; x.fillStyle = 'rgba(232,224,200,.75)'; x.fillRect(nx, y(38), 14, 10); x.fillStyle = 'rgba(60,40,30,.8)'; x.fillRect(nx + 2, y(35), 10, 1); x.fillRect(nx + 2, y(32), 7, 1);
    },
  },
};
export const TENANT_IDS = Object.keys(TENANTS);
/** Tenants a seeded ground floor picks from (no clinic or hotel by chance). */
const SEEDED = ['bar', 'noodles', 'loans', 'repair', 'pawn', 'phones', 'convenience', 'grocer', 'laundry', 'pharmacy', 'empty'];
export const seededTenant = (seed: number) => SEEDED[Math.floor(hash(seed * 1.37 + 0.5) * SEEDED.length)];

/**
 * A rented shop window: the tenant's interior behind glass with its frame, mullions and reflection,
 * an awning in the tenant's colour, and (when `name`) its name on the fascia at `fascia` units up.
 */
export function shopWindow(x: CanvasRenderingContext2D, y: Y, bx: number, w: number, tenant: string, t: number, seed: number, name?: { text: string; fascia: number }) {
  const T = TENANTS[tenant] ?? TENANTS.empty;
  x.fillStyle = '#120904'; x.fillRect(bx, y(6), w, 6);
  x.save(); x.beginPath(); x.rect(bx, y(54), w, 48); x.clip();
  T.interior(x, y, bx, w, t, seed);
  x.restore();
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(bx + 6, y(50)); x.lineTo(bx + 20, y(10)); x.stroke();
  x.fillStyle = rgba(T.col, T.lit ? 0.4 : 0.15);
  for (let m = bx + 28; m < bx + w - 10; m += 28) x.fillRect(m, y(54), 1, 48);
  x.strokeStyle = rgba(T.col, T.lit ? 0.45 : 0.2); x.strokeRect(bx + 0.5, y(54) + 0.5, w - 1, 47);
  if (T.lit) for (let ax = bx - 3, j = 0; ax < bx + w + 3; ax += 6, j++) { x.fillStyle = j % 2 ? rgba(T.col, 0.35) : '#120800'; x.fillRect(ax, y(62), Math.min(6, bx + w + 3 - ax), 5); }
  const text = name?.text ?? '';
  if (text && w >= 28) neonPlate(x, t, bx + w / 2, y(name!.fascia), { text, col: T.col, size: 7, h: 10, printed: !T.neon, street: true, glow: 0.08, bolts: false, phase: seed });
}
