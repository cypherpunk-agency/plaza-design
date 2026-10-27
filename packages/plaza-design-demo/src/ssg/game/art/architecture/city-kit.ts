/**
 * CITY KIT: Downtown's big pieces as placeable artwork, from the title glide's panorama (Tommi reviewed it,
 * 2026-10-15/22) for any scene or zone:
 *
 * - `architecture.tower`        one tower (downtown-towers.ts): skin, setbacks, crown, roof gear, age, its signs.
 * - `architecture.skyline-rows` rows of towers behind a street at several depths, thinning toward one end; far
 *                               towers that nearer bodies hide completely are skipped (tower-occlusion.ts).
 * - `architecture.ring`         THE RING overhead (ring-highway.ts): columns, deck, lamps, gantries, its traffic,
 *                               optionally the deck curving away inland at its east end.
 * - `architecture.through-block` a block the roads run through: storeys over the Ring, the Ring's portal (and the
 *                               street's), plates (the West Gate; the interchange tower where the Ring turns inland).
 * - `street.side-street`        a side street's mouth between towers: the lit lane going back, a corner lamp.
 * - `building.galleria`         the Galleria from the plaza: plinth with shop windows and the ID gate, the terrace
 *                               and its public taxi pad (a sky taxi landing and leaving), the glazed dome on top.
 *
 * World units at the player's scale; the through-block, the side street and the Galleria's plinth are drawn in the
 * coast kit's pixels (art/core/pixels.ts). Heights over the ground line (the street's back line is `SHORE.back`).
 */
import type { AssetDefinition, Field, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { inPixels, SHORE, R, hash, mixHex, warmth, ART, type Pixels } from '../core/pixels';
import { sign, text } from '../core/primitives';
import { drawTower, towerRow, type Tower, type TowerSign } from './downtown-towers';
import { drawRing, RING, ringTraffic } from './ring-highway';
import { drawGalleriaDome } from './galleria-dome';
import { hiddenTowers, type PlacedTower } from './tower-occlusion';
import { drawCraft } from '../vehicles/air-traffic';
import { placed } from '../core/view';

const S = 1 / ART;
const STOREY = 85;
const num = (label: string, value: number, min = -1e6, max = 1e6, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
const str = (label: string, value: string): Field => ({ kind: 'string', label, default: value });
const color = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const bool = (label: string, value: boolean): Field => ({ kind: 'boolean', label, default: value });
const n = (p: Properties, k: string) => Number(p[k]);
const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const origin = () => ({ origin: { x: 0, h: 0, role: 'origin' as const } });
const ORANGE = '255,136,0', PAPER = '255,217,165', RED = '255,42,68';

export function validateTowerSigns(value: Value) {
  if (!Array.isArray(value) || value.length > 30) throw new Error('Tower signs: expected at most 30 signs');
  for (const sign of value as unknown as TowerSign[]) {
    if (!sign || !['plate', 'blade', 'stack', 'ticker', 'holo', 'billboard'].includes(sign.kind) || typeof sign.text !== 'string' || sign.text.length > 4096 || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(sign.col) || !fin(sign.h) || sign.at !== undefined && (!fin(sign.at) || sign.at < 0 || sign.at > 1) || sign.dead !== undefined && (!Number.isInteger(sign.dead) || sign.dead < -1)) throw new Error('Invalid tower sign');
    if (Object.keys(sign).some(key => !['kind', 'text', 'col', 'h', 'at', 'dead'].includes(key))) throw new Error('Unknown tower sign field');
  }
}
const jsonList = (label: string, value: Value, check: (v: Value) => void): Field => ({ kind: 'json', label, default: value, validate: check });

// ---------- a tower ----------

const SKINS = ['concrete', 'glass', 'capsule', 'panel', 'brick'];
const CROWNS = ['flat', 'spire', 'stepped', 'slant', 'antenna', 'halo', 'pyramid'];
const GEARS = ['tank', 'antenna', 'dish', 'ac', 'garden', 'pad', 'billboard'];
export function towerOf(p: Properties): Tower {
  return { w: n(p, 'width'), h: n(p, 'height'), seed: n(p, 'seed'), roof: String(p.roof) as Tower['roof'], skin: String(p.skin) as Tower['skin'], crown: String(p.crown) as Tower['crown'],
    gear: p.gear as unknown as Tower['gear'], steps: p.steps as unknown as Tower['steps'], balconies: p.balconies === true, grime: n(p, 'grime'), shop: p.shop === true, signs: p.signs as unknown as TowerSign[] };
}
const towerCache = new WeakMap<object, Tower>();
const towerFor = (p: Properties) => { let t = towerCache.get(p); if (!t) { t = towerOf(p); towerCache.set(p, t); } return t; };

export const towerElement: AssetDefinition = {
  type: 'architecture.tower', version: 1, label: 'Downtown tower: skin, setbacks, crown, roof gear, signs (city kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Width', 600, 20, 4000, 1, 'units'), height: num('Height', 1500, 20, 20000, 1, 'units'), seed: num('Seed', 1, 0, 1e9),
    skin: { kind: 'select', label: 'Skin', options: SKINS, default: 'concrete' }, crown: { kind: 'select', label: 'Crown', options: CROWNS, default: 'flat' },
    roof: { kind: 'select', label: 'Old roof', options: ['mast', 'tank', 'boxes', 'none'], default: 'none' },
    gear: jsonList('Roof gear', [], v => { if (!Array.isArray(v) || !v.every(g => GEARS.includes(g as string))) throw new Error('Roof gear: expected ' + GEARS.join(', ')); }),
    steps: jsonList('Setbacks [at height fraction, inset fraction]', [], v => { if (!Array.isArray(v) || !v.every(s => Array.isArray(s) && s.length === 2 && s.every(fin))) throw new Error('Setbacks: expected [fraction, inset] pairs'); }),
    balconies: bool('Balconies', false), grime: num('Age (grime)', 0.3, 0, 1, 0.01), shop: bool('Lit shopfront at the foot', true),
    signs: jsonList('Signs', [], validateTowerSigns),
    fill: color('Body at night', '#120a14'), lit: color('Body in the sun', '#1e1222'), warmth: num('How much the sun warms it', 0.5, 0, 1, 0.05),
    edge: num('Rim light', 0.35, 0, 1, 0.01), windows: num('Lit windows', 0.14, 0, 1, 0.01), glow: num('Window glow', 0.8, 0, 2, 0.05), storey: num('Storey', STOREY, 4, 200), below: num('Drawn on below the foot', 2, 0, 2000),
  },
  bounds: p => ({ x: 0, h: n(p, 'height'), w: n(p, 'width'), tall: n(p, 'height') }),
  anchors: origin,
  draw(x, v, p, _s, _pass, at) {
    const sx = v.sx(at.x, at.parallax), w = n(p, 'width') * at.scale;
    if (sx > v.viewW + 4 * ART || sx + w < -4 * ART) return;
    x.save(); x.translate(sx, v.y(at.h));
    try { drawTower(x, towerFor(p), { t: v.t, fill: mixHex(String(p.fill), String(p.lit), warmth(v.lighting) * n(p, 'warmth')), edge: n(p, 'edge'), lit: n(p, 'windows'), glow: n(p, 'glow'), below: n(p, 'below'), storey: n(p, 'storey') }); }
    finally { x.restore(); }
  },
};

// ---------- skyline rows ----------

interface Row { parallax: number; x: number; seed: number; length: number; haze: number }
interface RowTower { tower: Tower; X: number }
const rowCache = new Map<string, RowTower[]>();
/** A row's towers laid out once: sparse and lower at its east start, dense and tall toward its west end. `X` is the tower's west distance from the start, in the row's depth-1 units (pixels). */
function rowTowers(row: Row): RowTower[] {
  const key = [row.parallax, row.seed, row.length].join('|'); let hit = rowCache.get(key); if (hit) return hit;
  const p = row.parallax, towers: RowTower[] = [], seed = row.seed, Xb = row.length * S;
  const base = towerRow(seed, 120, [260, 760], [1500, 4800], [], { storey: STOREY, gap: [0, 1] });
  let X = 0, i = 0;
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
  while (X < Xb && i < base.length) {
    const b = base[i++], k = X / Xb, w = b.w * S * p, tall = lerp(0.55, 1.25, k);
    if (hash(seed + i) < lerp(0.55, 0.02, k)) { X += w * 1.2; continue; }
    towers.push({ tower: { ...b, h: Math.round(b.h * tall) }, X });
    X += w + lerp(60, 2, k) * p * 3 * hash(i + seed);
  }
  rowCache.set(key, towers); return towers;
}
export const skylineRowsElement: AssetDefinition = {
  type: 'architecture.skyline-rows', version: 1, label: 'Skyline rows behind the street, far to near (city kit, distance)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    rows: jsonList('Rows, far to near (parallax, x: its east start, seed, length west, haze)', [{ parallax: 0.14, x: 0, seed: 300, length: 6000, haze: 0.75 }], v => { if (!Array.isArray(v) || v.length > 8 || !v.every(r => !!r && typeof r === 'object' && ['parallax', 'x', 'seed', 'length', 'haze'].every(k => fin((r as Record<string, unknown>)[k])))) throw new Error('Rows: expected { parallax, x, seed, length, haze } rows'); }),
    horizon: num('Horizon (over the ground line)', 189, -400, 1200), from: num('Shown from (west edge, depth 1; units east of the piece)', -1e6), to: num('Shown to (east edge, depth 1)', 1e6),
    fill: color('Body at night', '#0c0710'), lit: color('Body in the sun', '#1c1024'), hazeNight: color('Haze at night', '#1e1024'), hazeLit: color('Haze in the sun', '#3a1c34'), town: num('City haze', 1, 0, 1, 0.05),
  },
  bounds: p => ({ x: n(p, 'from') < -1e5 ? 0 : n(p, 'from'), h: 2000, w: 4000, tall: 2000 }),
  anchors: origin,
  draw(x, v, p, _s, _pass, at) {
    const W = v.viewW, warm = warmth(v.lighting), town = n(p, 'town'), hz = v.y(at.h + n(p, 'horizon')), gy = v.y(at.h);
    const a = Math.max(-40, v.sx(at.x + n(p, 'from'))), b = Math.min(W + 40, v.sx(at.x + n(p, 'to')));
    if (b <= a) return;
    const items: PlacedTower[] = [];
    for (const row of p.rows as unknown as Row[]) {
      const sc = row.parallax, base = R((hz + (gy - hz) * row.parallax * 0.9) / ART) * ART, ax = v.sx(at.x + row.x, row.parallax) / ART;
      const look = { t: v.t, fill: mixHex(String(p.fill), String(p.lit), warm * (1 - town * 0.4)), edge: 0.14, lit: 0.1 + row.parallax * 0.12, glow: 0.45 + row.parallax * 0.4, below: 200, storey: STOREY, haze: row.haze * 0.55, hazeCol: mixHex(String(p.hazeNight), String(p.hazeLit), warm * (1 - town * 0.5)) };
      for (const t of rowTowers(row)) {
        const s = (ax - row.parallax * t.X) * ART;
        if (s > W + 4 * ART || s + t.tower.w * sc < -4 * ART) continue;
        items.push({ tower: t.tower, tx: R(s / ART) * ART, ty: base, sc, look });
      }
    }
    x.save(); x.beginPath(); x.rect(a, -4000, b - a, v.viewH + 8000); x.clip();
    try {
      const hidden = hiddenTowers(x, items, true);
      items.forEach((it, i) => { if (hidden.has(i)) return; placed(x, it.tx, it.ty, it.sc, () => drawTower(x, it.tower, it.look)); });
    } finally { x.restore(); }
  },
};

// ---------- THE RING ----------

export const ringElement: AssetDefinition = {
  type: 'architecture.ring', version: 1, label: 'THE RING overhead: columns, deck and lamps (city kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    from: num('From (units east of the piece)', 0), to: num('To', 3000), origin: num('Column grid origin (units east of the piece)', 0),
    part:{kind:'select',label:'Road structure',options:['all','structure','front'],default:'all'},
    gantries: jsonList('Sign gantries (units east of the piece)', [], v => { if (!Array.isArray(v) || !v.every(fin)) throw new Error('Gantries: expected numbers'); }),
    lamps: bool('Lamps on', true), fill: color('Concrete at night', '#18121a'), lit: color('Concrete in the sun', '#241a24'), base: num('Columns stand on (over the ground line)', SHORE.back, -400, 400),
    curve: bool('East end curves away inland', false),
  },
  bounds: p => ({ x: n(p, 'from'), h: RING.rail + 160, w: n(p, 'to') - n(p, 'from'), tall: RING.rail + 160 }),
  anchors: origin,
  draw(x, v, p, _s, _pass, at) {
    const o0 = v.sx(at.x + n(p, 'origin'), at.parallax), base = v.y(at.h + n(p, 'base')), fx = (s: number) => s - o0;
    const a = Math.max(fx(-60 * ART), n(p, 'from') - n(p, 'origin')), b = Math.min(fx(v.viewW + 60 * ART), n(p, 'to') - n(p, 'origin'));
    const warm = warmth(v.lighting);
    if (b > a) {
      x.save(); x.translate(o0, base);
      try {
        drawRing(x, a, b, { t: v.t, fill: mixHex(String(p.fill), String(p.lit), warm * 0.4), gantries: (p.gantries as number[]).map(g => g - n(p, 'origin')), lamps: p.lamps !== false,part:p.part as 'all'|'structure'|'front',ownership:{from:n(p,'from')-n(p,'origin'),to:n(p,'to')-n(p,'origin')} });
      } finally { x.restore(); }
    }
    if (p.curve === true&&p.part!=='structure') inPixels(x, v, { ...at, x: at.x + n(p, 'to') }, P => {
      // the deck curving away inland, smaller and hazier
      const e = P.ax, back = P.y(at.h + n(p, 'base'));
      if (e < -40 || e > P.W + 200) return;
      for (let i = 1; i <= 7; i++) {
        const k = Math.pow(0.8, i), w = 40 * k, sx = e + i * 22 * Math.pow(0.86, i), under = back - (RING.under * S) - i * 6;
        x.fillStyle = mixHex('#18121a', '#3a2440', i / 8); x.fillRect(R(sx), R(under - 18 * k), R(w), R(18 * k));
        x.fillStyle = 'rgba(255,190,110,' + (0.4 * k).toFixed(2) + ')'; x.fillRect(R(sx), R(under), R(w), 1);
      }
    });
  },
};


/** Independent lanes use whole-vehicle ownership; road barriers and real portals remain scenery. */
export const ringTrafficElement:AssetDefinition={
 type:'vehicle.ring-traffic',version:1,label:'Ring traffic lane',category:'vehicles',coordinates:'world',libraryUse:'reusable',mobility:()=>true,parts:['backdrop'],
 fields:{...Object.fromEntries(['from','to','origin','base'].map(k=>[k,ringElement.fields[k]])),lane:{kind:'select',label:'Lane',default:'far',options:['far','near']}},
 bounds:p=>({x:n(p,'from')-500,h:RING.rail+160,w:n(p,'to')-n(p,'from')+1000,tall:RING.rail+160}),anchors:origin,
 draw(ctx,v,p,_s,_pass,at){const grid=n(p,'origin'),x=v.sx(at.x+grid,at.parallax),a=Math.max(-x-500,n(p,'from')-grid-500),b=Math.min(v.viewW-x+500,n(p,'to')-grid+500);if(b<=a)return;ctx.save();ctx.translate(x,v.y(at.h+n(p,'base')));try{ringTraffic(ctx,a,b,v.t,false,true,{from:n(p,'from')-grid,to:n(p,'to')-grid,lane:p.lane as 'far'|'near'});}finally{ctx.restore();}},
};

// ---------- a block the roads run through ----------

/**
 * A block the roads run through, from the anchor `width` east, up out of the view and down to `foot`: a floor
 * line and windows each storey over the Ring, THE RING's portal (and the street's, `street`) with the jamb on the
 * side the traffic comes in from (`entry`); drawn over the Ring so what drives in vanishes into the portal's dark.
 */
export const throughBlockElement: AssetDefinition = {
  type: 'architecture.through-block', version: 1, label: 'Block the Ring runs through: portals, storeys, plates (city kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Width', 240, 30, 4000, 3, 'units'), entry: { kind: 'select', label: 'Traffic comes in from', options: ['east', 'west'], default: 'east' }, street: bool('The street runs through it too', true),
    foot: num('Foot (over the ground line; below the view: the sea wall)', -1500, -6000, 400), name: str('Plate between the portals (empty: none)', 'WEST GATE'), code: str('Stencil over the Ring’s portal', 'R4 · W'),
    lit: num('Lit windows', 0.6, 0, 1, 0.05),
  },
  bounds: p => ({ x: 0, h: 1400, w: n(p, 'width'), tall: 1400 - n(p, 'foot') }),
  anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const x = P.x, a = Math.floor(P.ax), b = Math.ceil(P.u(n(p, 'width') * S)), back = P.y(at.h + SHORE.back), road0 = P.y(at.h + SHORE.road0), road1 = P.y(at.h + SHORE.road1);
      if (b < -4 || a > P.W + 4) return;
      const foot = P.y(at.h + n(p, 'foot')), entry = String(p.entry), warm = P.warm;
      const ringY = (h: number) => back - h * S, jamb = 5, rim = 'rgba(255,150,90,' + (0.35 * warm + 0.1).toFixed(2) + ')';
      const wall = mixHex('#1a1016', '#2a1c24', warm * 0.5), dark = 'rgba(6,3,8,.74)';
      x.fillStyle = wall; x.fillRect(a, -10, b - a, foot + 10);
      x.fillStyle = rim; x.fillRect(a, -10, 1, foot + 10);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(b - 2, -10, 2, foot + 10);
      const st = STOREY * S, top = ringY(RING.rail + 100);
      for (let k = 0, fy = top - 6; fy > -st; k++, fy -= st) {
        x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(a + 1, R(fy), b - a - 3, 1);
        for (let bx = a + 6, i = 0; bx + 4 < b - 4; bx += 9, i++) {
          const on = hash(k * 31 + i * 7 + 5) < n(p, 'lit');
          x.fillStyle = on ? 'rgba(255,200,140,.55)' : 'rgba(10,6,12,.8)'; x.fillRect(bx, R(fy - st * 0.7), 4, R(st * 0.45));
        }
      }
      const portal = (y0: number, y1: number, lamps: number, deck: [number, number]) => {
        const p0 = entry === 'east' ? a + jamb + 2 : a + jamb, p1 = entry === 'east' ? b - jamb : b - jamb - 2, j = entry === 'east' ? p1 : a;
        x.fillStyle = dark; x.fillRect(p0, R(y0), p1 - p0, R(y1 - y0));
        x.fillStyle = 'rgba(46,32,40,.55)'; x.fillRect(p0, R(deck[0]), p1 - p0, R(deck[1] - deck[0]));
        x.fillStyle = 'rgba(255,190,120,.22)'; x.fillRect(p0, R(deck[0]), p1 - p0, 1);
        for (let lx = p1 - 6; lx > p0 + 2; lx -= 12) { x.fillStyle = 'rgba(255,214,150,' + lamps + ')'; x.fillRect(lx - 2, R(y0) + 1, 4, 1); }
        const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(255,190,120,.10)'); g.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = g; x.fillRect(p0, R(y0), p1 - p0, R(y1 - y0));
        x.fillStyle = wall; x.fillRect(j, R(y0) - 3, jamb, R(y1 - y0) + 3); x.fillRect(p0 - 2, R(y0) - 4, p1 - p0 + 4, 4);
        x.fillStyle = rim; x.fillRect(Math.min(p0 - 2, j), R(y0) - 4, p1 - p0 + 2 + jamb, 1);
        x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(entry === 'east' ? p1 : p0 - 1, R(y0), 1, R(y1 - y0));
      };
      portal(ringY(RING.rail + 80), ringY(RING.under - 8), 0.8, [ringY(RING.road), ringY(RING.under)]);
      if (p.street === true) portal(back - 40, road1 + 2, 0.7, [road0, road1]);
      const mid = R((a + b) / 2);
      if (String(p.name)) {
        const py = R((ringY(RING.under - 8) + back - 44) / 2);
        x.fillStyle = '#0d0705'; x.fillRect(mid - 18, py - 5, 36, 10); x.strokeStyle = 'rgba(255,136,0,.6)'; x.lineWidth = 1; x.strokeRect(mid - 17.5, py - 4.5, 35, 9);
        text(x, String(p.name), mid, py + 0.5, 'rgba(255,217,165,.85)', 3.6, '600');
      }
      if (String(p.code)) text(x, String(p.code), mid, R(ringY(RING.rail + 80)) - 9, 'rgba(255,217,165,.35)', 4, '600');
      if (p.street === true) {
        // the footing under the road: the sea wall's coping carried across
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(a + 1, road1 + 3, b - a - 3, 2);
        for (let h = road1 + 9; h < P.H + 40; h += 6) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(a + 1, h, b - a - 3, 1); }
      }
    });
  },
};

// ---------- a side street ----------

export const sideStreetElement: AssetDefinition = {
  type: 'street.side-street', version: 1, label: 'Side street’s mouth: the lit lane going back, a corner lamp (city kit)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { seed: num('Seed (which windows are lit)', 3420, 0, 1e9) },
  bounds: () => ({ x: -78, h: 1200, w: 156, tall: 1200 }),
  anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const x = P.x, sx = P.ax, back = P.y(at.h + SHORE.back), seed = n(p, 'seed');
      if (!P.onScreen(sx, sx, 40)) return;
      const top = 0, g = x.createLinearGradient(0, top, 0, back); g.addColorStop(0, 'rgba(40,20,40,.6)'); g.addColorStop(1, 'rgba(80,40,50,.7)');
      x.fillStyle = '#08050a'; x.fillRect(R(sx) - 26, top - 200, 52, back - top + 200);
      x.fillStyle = g; x.fillRect(R(sx) - 10, top - 200, 20, back - top + 200);
      for (let k = 0; k < 14; k++) { const h = back - 6 - k * 9; if (hash(seed + k) <= 0.5) continue; x.fillStyle = 'rgba(255,190,120,.45)'; x.fillRect(R(sx) - 18 + (k % 2) * 30, h, 3, 3); }
      x.fillStyle = 'rgba(255,214,150,.35)'; x.fillRect(R(sx) - 4, back - 22, 8, 2);
    });
  },
};

// ---------- the Galleria ----------

const ADS = ['VERIFIED CUSTOMERS ONLY', 'SCORE 600+ · FREE PARKING', 'IDENTITY CHECK AT ENTRANCE'];
/**
 * The Galleria from its plaza, from the anchor `width` east: the plinth with nine shop windows (shoppers' shapes),
 * the entrance and its ID gate, the GALLERIA neon, an ad screen, the terrace with its rail, planters, the glazed
 * dome on top (galleria-dome.ts); the public taxi pad `pad` units west of it, a sky taxi landing, waiting and leaving.
 */
export const galleriaElement: AssetDefinition = {
  type: 'building.galleria', version: 1, label: 'The Galleria: plinth, windows, ID gate, terrace, taxi pad, glazed dome (city kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Width', 690, 120, 6000, 3, 'units'), name: str('Neon name', 'GALLERIA'), advert: str('Ad screen (empty: the Registry’s rotation)', ''),
    plinth: color('Plinth', '#2a1830'), dome: color('Dome in the sun', '#3a2440'), domeNight: color('Dome at night', '#1a0e1e'), domeLit: num('Dome glow', 1.5, 0, 4, 0.05),
    window: str('Window light', 'rgba(255,200,140,.55)'), door: str('Entrance light', 'rgba(255,230,190,.65)'),
    pad: num('Taxi pad (units east of the anchor; 0: none)', 792, 0, 8000), padSign: str('Taxi pad sign', 'TAXI · PUBLIC'), padPeriod: num('Taxi cycle (frames)', 1500, 60, 1e5),
    planters: jsonList('Planters (units east of the anchor)', [-120, 810], v => { if (!Array.isArray(v) || !v.every(fin)) throw new Error('Planters: expected numbers'); }),
  },
  bounds: p => ({ x: -120, h: 520, w: Math.max(n(p, 'width'), n(p, 'pad') + 80) + 120, tall: 520 }),
  anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => galleria(P, p, at.h));
  },
};
function galleria(P: Pixels, p: Properties, h0: number) {
  const x = P.x, back = P.y(h0 + SHORE.back), a = R(P.ax), b = R(P.u(n(p, 'width') * S)), top = back - 58, w = b - a, warm = P.warm;
  if (!P.onScreen(a - 160, b + 160)) return;
  const pad = n(p, 'pad') * S;
  placed(x, R((a + b) / 2), top - 6, 1.25, () => drawGalleriaDome(x, { fill: mixHex(String(p.domeNight), String(p.dome), warm), lit: n(p, 'domeLit'), label: false, glazed: true, warm, t: P.f, still: P.still }));
  x.fillStyle = String(p.plinth); x.fillRect(a, top, w, back - top + 1);
  x.fillStyle = 'rgba(255,190,110,.55)'; x.fillRect(a, top, w, 1);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(a, top - 6, w, 1); for (let i = a; i < b; i += 6) x.fillRect(i, top - 6, 1, 6);
  if (pad > 0) taxiPad(P, p, back, R(P.u(pad)));
  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    const wx = a + 6 + i * ((w - 12) / 9), wy = top + 18;
    x.fillStyle = String(p.window); x.fillRect(R(wx), wy, 18, 22);
    x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(wx), wy - 2, 18, 1);
    x.fillStyle = 'rgba(40,16,40,.6)'; x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 8, 3, 14); x.fillRect(R(wx) + 4 + (i % 3) * 3, wy + 5, 3, 3);
    if (i % 2) { x.fillStyle = 'rgba(40,16,40,.5)'; x.fillRect(R(wx) + 11, wy + 10, 4, 12); }
  }
  const dx = R(a + w / 2 - 12);
  x.fillStyle = String(p.door); x.fillRect(dx, top + 16, 24, back - top - 16);
  x.fillStyle = 'rgba(40,20,30,.6)'; x.fillRect(dx + 11, top + 16, 2, back - top - 16);
  x.fillStyle = '#1a1018'; x.fillRect(dx - 6, back - 18, 4, 18);
  x.fillStyle = P.still || Math.floor(P.f / 30) % 3 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(dx - 5, back - 16, 2, 2);
  placed(x, R(a + w / 2), top + 8, S, () => sign(x, P.f, String(p.name), 0, 0, '255,190,110', { size: 13, phase: 40 }));
  const m = P.still ? 0 : Math.floor(P.f / 200) % ADS.length;
  x.fillStyle = '#0c0610'; x.fillRect(a + 4, top + 4, 50, 10); x.strokeStyle = 'rgba(' + ORANGE + ',.45)'; x.lineWidth = 1; x.strokeRect(a + 4.5, top + 4.5, 49, 9);
  text(x, String(p.advert) || ADS[m], a + 29, top + 9.5, 'rgba(' + PAPER + ',.85)', 3.4, '600');
  for (const u of p.planters as number[]) { const sx = R(P.u(u * S)); if (!P.onScreen(sx, sx, 20)) continue; x.fillStyle = '#3a2c3c'; x.fillRect(sx - 6, back - 6, 12, 6); x.fillStyle = '#1e2a1a'; x.beginPath(); x.arc(sx, back - 12, 7, 0, 7); x.fill(); x.fillStyle = '#2a3a22'; x.fillRect(sx, back - 6, 1, 4); }
}
function taxiPad(P: Pixels, p: Properties, back: number, sx: number) {
  const x = P.x;
  if (!P.onScreen(sx, sx, 140)) return;
  const top = back - 70, on = P.still || Math.floor(P.f / 30) % 2 === 0;
  x.fillStyle = '#1a1018'; x.fillRect(sx - 3, top, 6, back - top); x.fillRect(sx - 22, top, 44, 4);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(sx - 22, top, 44, 1);
  x.fillStyle = on ? 'rgba(255,190,60,.95)' : 'rgba(255,190,60,.35)'; for (let k = 0; k < 5; k++) x.fillRect(sx - 22 + k * 10, top - 1, 3, 1);
  x.fillStyle = '#0d0705'; x.fillRect(sx - 14, top + 8, 28, 8); x.strokeStyle = 'rgba(255,190,60,.6)'; x.lineWidth = 1; x.strokeRect(sx - 13.5, top + 8.5, 27, 7);
  text(x, String(p.padSign), sx, top + 12, 'rgba(255,190,60,.9)', 2.8, '600');
  // the taxi's cycle: in from the west, down onto the pad, a wait, up and away east
  const period = n(p, 'padPeriod'), cyc = P.still ? 0.45 : (P.f % period) / period, ease = (q: number) => q * q * (3 - 2 * q);
  let dx = 0, dy = 0;
  if (cyc < 0.3) { const k = ease(cyc / 0.3); dx = -160 * (1 - k); dy = -70 * (1 - k); }
  else if (cyc < 0.62) { dx = 0; dy = 0; }
  else if (cyc < 0.95) { const k = ease((cyc - 0.62) / 0.33); dx = 200 * k; dy = -90 * k * k; }
  else return;
  placed(x, R(sx + dx), R(top - 6 + dy), S, () => drawCraft(x, 'taxi', { t: P.f, face: 1, still: P.still, scale: S }));
}

export const cityKitElements: AssetDefinition[] = [towerElement, skylineRowsElement, ringElement, ringTrafficElement, throughBlockElement, sideStreetElement, galleriaElement];
export type { View };
