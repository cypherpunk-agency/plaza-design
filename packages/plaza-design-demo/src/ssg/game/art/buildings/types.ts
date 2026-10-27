/**
 * BUILDING KIT, district types (Tommi, 2026-10-21: every district looked like New York with cyberpunk
 * on top; districts need their own architecture, and the odd special building). Each type is its own
 * shape, not a skin on the walk-up front:
 * - `building.stack`: the Neon Market's stacked housing (after Kowloon and Hong Kong): narrow slabs of
 *   small storeys, window cages and AC on every flat, laundry poles, rooftop shacks, a covered walkway
 *   over the shops, signs hung out over the street.
 * - `building.shophouse`: the Old Quarter's tube house (after Hoi An and Hanoi): one or two low storeys
 *   of lime-washed wall, a tiled pent roof over the open shop front, a wooden gallery, shutters, a
 *   lacquered name board, lanterns on the eave.
 * - `building.pavilion`: the small buildings at the Spire's foot (checkpoint, sky elevator, annex).
 * Special buildings (one-offs, `landmark.*`): the market hall, St. Agnes, the Spire's foot.
 *
 * Everything is drawn in the piece's own frame: origin at its foot on the left, x to the right,
 * heights up (`y = -h`). Unset choices come from the seed; same props, same building.
 */
import { addLight, type SceneLight } from '../atmosphere/lighting';
import type { AssetDefinition, Field, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { rng } from '../core/primitives';
import { windowLit, type Light } from '../../world/light';
import { neonPlate } from '../signage/kit';
import * as P from './parts';
import { paintState, stateFields, vacant } from './state';
import { TENANTS, TENANT_IDS, shopWindow } from './tenants';

export const y = (h: number) => -h;
export const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a.toFixed(3) + ')';
export const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
export const num = (label: string, value: number, min: number, max: number, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
export const select = (label: string, options: readonly string[], value = options[0]): Field => ({ kind: 'select', label, options: [...options], default: value });
export const bool = (label: string, value: boolean): Field => ({ kind: 'boolean', label, default: value });
export const text = (label: string, value: string): Field => ({ kind: 'string', label, default: value });
export const isHex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
/** An optional colour: empty keeps the seeded one. */
export const colour = (label: string, empty = 'Seeded'): Field => ({ kind: 'json', label, default: '', editor: { kind: 'colour', empty },
  validate: (v: Value) => { if (v !== '' && !isHex(v)) throw new Error(label + ': expected a #rrggbb colour or empty'); } });
export const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 3 - 1), 16)).join(',');

/**
 * A light a piece casts onto the scene's light layer (art/atmosphere/lighting.ts `drawLights`), at a point in the
 * piece's own frame (`lx` from its left, `lh` up from its foot). `kind` (default `lamp`): `lamp` a glow and a pool on
 * the ground (it also throws the night's short shadows), `neon` / `screen` a round glow, `window` a lit pane `w` × `hh`,
 * `head` a beam pointing `dir`. `r` is the radius in the piece's units (default 60), `col` "r,g,b", `a` its strength
 * (default 0.8). Radius and sizes follow the placement's scale; like every light it is weak by day, full at night.
 */
export type Glow = (lx: number, lh: number, g: { kind?: SceneLight['kind']; col?: string; r?: number; a?: number; w?: number; hh?: number; dir?: 1 | -1 }) => void;
export interface Paint {
  t: number; lighting: Light; view: View;
  /** A lit window or screen (a pane `w` × `hh` centred on (x, h)): the light layer's soft glow round it. */
  light?: (x: number, h: number, w: number, hh: number, col: string, kind: 'window' | 'screen') => void;
  /** Any light of any radius and colour: a lamp's pool, neon, a beacon, a floodlight (`Glow`). */
  glow?: Glow;
}
/**
 * A placeable piece: culls itself, paints in its own frame, hands its lights to the light layer (`Paint.light` for
 * lit windows and screens, `Paint.glow` for lamps, neon and beacons). Lights are offered only on the play plane
 * (parallax 1), where the light layer draws them. `reach`: how far (in the piece's units) its light spills past
 * its sides, so a lamp just off screen still lights the edge of the view.
 *
 * Zoom: the composition has already scaled and mirrored the canvas round the placement (core/composition.ts
 * `paint`), and a camera zoom is a canvas transform too (runtime/render-scene.ts `scale`), so a piece never
 * scales itself; its cull box is the placement's scale times its size, in the view's own units.
 */
export function piece(o: Omit<AssetDefinition, 'draw' | 'coordinates' | 'version' | 'parts'> & { size: (p: Properties) => { w: number; tall: number }; paint: (x: CanvasRenderingContext2D, p: Properties, o: Paint) => void;
  reach?: (p: Properties) => number;
  /** A building that can stand for sale, empty or under construction (state.ts): its props while vacant, and its size for the state's layer. */
  state?: { vacant: (p: Properties) => Properties; box: (p: Properties) => { w: number; h: number; g: number; seed: number } } }): AssetDefinition {
  const { size, paint: own, state, reach, ...rest } = o;
  const paint = state ? (x: CanvasRenderingContext2D, p: Properties, q: Paint) => {
    const out = vacant(p); own(x, out ? state.vacant(p) : p, q);
    if (out) { const b = state.box(p); paintState(x, p, b.w, b.h, b.g, q, b.seed); }
  } : own;
  return {
    ...rest, libraryUse:rest.libraryUse??'reusable', version: 1, coordinates: 'world', parts: ['backdrop'],
    draw(ctx, v, p, _s, _pass, at) {
      const { w } = size(p), sx = v.sx(at.x), end = sx + w * at.scale * at.facing, m = 60 + (reach ? reach(p) : 0) * at.scale;
      if (Math.max(sx, end) + m < 0 || Math.min(sx, end) - m > v.viewW) return;
      const near = at.parallax === 1, wx = (lx: number) => at.x + lx * at.scale * at.facing, wh = (lh: number) => at.h + lh * at.scale;
      const light = near ? (lx: number, lh: number, lw: number, hh: number, col: string, kind: 'window' | 'screen') =>
        addLight(v, { x: wx(lx), h: wh(lh), kind, w: lw * at.scale, hh: hh * at.scale, r: kind === 'screen' ? 40 : 14, col, a: kind === 'screen' ? 0.45 : 0.6 }) : undefined;
      const glow: Glow | undefined = near ? (lx, lh, g) => addLight(v, { x: wx(lx), h: wh(lh), kind: g.kind ?? 'lamp', ...(g.col ? { col: g.col } : {}), r: (g.r ?? 60) * at.scale, a: g.a ?? 0.8,
        ...(g.w ? { w: g.w * at.scale } : {}), ...(g.hh ? { hh: g.hh * at.scale } : {}), ...(g.dir ? { dir: (g.dir * at.facing) as 1 | -1 } : {}) }) : undefined;
      ctx.save(); ctx.translate(sx, v.y(at.h));
      try { paint(ctx, p, { t: v.t, lighting: v.lighting, view: v, ...(light ? { light, glow } : {}) }); } finally { ctx.restore(); }
    },
  };
}

// ---------------------------------------------------------------- stacked housing (Neon Market)

/** Faded pastel walls, dark at street-light level: mint, rose, cream, sky, as Hong Kong estates fade. */
const STACK_WALLS = ['#1f2a26', '#2a1f22', '#29251b', '#1d2329', '#262226'];
/** What a market stall sells; each spills its own way onto the pavement. */
export const STALLS = ['roast', 'fish', 'fruit', 'electronics', 'dried', 'clothes', 'herbs'] as const;
const STALL_NAMES: Record<string, string> = { roast: 'ROAST', fish: 'LIVE FISH', fruit: 'FRUIT', electronics: 'PARTS', dried: 'DRIED GOODS', clothes: 'CLOTHES', herbs: 'HERBS' };
const shopItem: Record<string, Field> = {
  tenant: { kind: 'select', label: 'Tenant', options: TENANT_IDS, default: 'noodles' },
  sign: { kind: 'string', label: 'Name (empty: the tenant’s, - for none)', default: '' },
  stall: { kind: 'select', label: 'Market stall instead (spills onto the street)', options: ['none', ...STALLS], default: 'none' },
};
const hungItem: Record<string, Field> = {
  text: { kind: 'string', label: 'Letters', default: 'HOTEL' },
  color: { kind: 'color', label: 'Tube colour', default: '#ff3a5a' },
  floor: { kind: 'number', label: 'Floor', default: 2, min: 1, max: 60, step: 1 },
  from: { kind: 'number', label: 'From the left', default: 10, min: 0, max: 1000, step: 1, unit: 'units' },
  vertical: { kind: 'boolean', label: 'Letters top to bottom', default: true },
};
const listOf = (label: string, item: Record<string, Field>, addLabel: string, next: (rows: Properties[]) => Properties): Field => ({ kind: 'json', label, default: [], editor: { kind: 'list', item, addLabel, next },
  validate: v => { if (!Array.isArray(v) || !v.every(r => !!r && typeof r === 'object' && !Array.isArray(r))) throw new Error(label + ': expected a list'); } });

export const stackElement = piece({
  type: 'building.stack', label: 'Stacked housing (kit, Neon Market)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 120, 30, 600, 1, 'units'), floors: num('Floors above the shops', 7, 1, 40), storey: num('Floor height', 44, 28, 120, 1, 'units'),
    ground: num('Shop floor height', 72, 50, 140, 1, 'units'), wall: colour('Wall colour'), cages: num('Window cages', 0.6, 0, 1, 0.05),
    density: num('AC, laundry and pipes', 0.8, 0, 1, 0.05), lit: num('Rooms with a light', 0.55, 0, 1, 0.05),
    canopy: bool('Covered walkway over the shops', true), shacks: bool('Shacks and antennas on the roof', true),
    shops: listOf('Shops under the walkway', shopItem, 'Add shop', () => ({ tenant: 'noodles', sign: '' })),
    hung: listOf('Signs hung over the street', hungItem, 'Add sign', rows => ({ text: 'HOTEL', color: '#ff3a5a', floor: rows.length + 1, from: 10 + rows.length * 30, vertical: true })),
    seed: num('Seed', 1, 0, 1000000), ...stateFields,
  },
  state: { vacant: p => ({ ...p, lit: 0, shops: [], hung: [] }), box: p => ({ w: Number(p.width), h: Number(p.ground) + Number(p.floors) * Number(p.storey), g: Number(p.ground), seed: Number(p.seed) }) },
  size: p => ({ w: Number(p.width), tall: Number(p.ground) + Number(p.floors) * Number(p.storey) + 40 }),
  bounds: p => { const tall = Number(p.ground) + Number(p.floors) * Number(p.storey) + 40; return { x: -10, h: tall, w: Number(p.width) + 20, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, roof: { x: Number(p.width) / 2, h: Number(p.ground) + Number(p.floors) * Number(p.storey), role: 'surface' }, walkway: { x: Number(p.width) / 2, h: 66, role: 'mount' } }),
  paint(x, p, o) {
    const w = Number(p.width), floors = Number(p.floors), st = Number(p.storey), g = Number(p.ground), H = g + floors * st, seed = Number(p.seed), r = rng(seed * 7919 + 17);
    const d = Number(p.density), wall = isHex(p.wall) ? String(p.wall) : STACK_WALLS[Math.floor(r() * STACK_WALLS.length)];
    x.fillStyle = wall; x.fillRect(0, y(H), w, H);
    // tiled facade, streaked by decades of rain from the AC drips
    x.fillStyle = 'rgba(255,255,255,.025)'; for (let h = g + 6; h < H; h += 6) x.fillRect(0, y(h), w, 1);
    for (let i = 0; i < Math.round(w / 9); i++) { const sx = Math.round(r() * w), top = g + r() * (H - g); x.fillStyle = 'rgba(0,0,0,.16)'; x.fillRect(sx, y(top), 2, Math.min(top - g, 30 + r() * 80)); }
    // flats: a unit every ~30 units, each with its own window (an aluminium slider a person could stand in:
    // 18-24 wide, 24-36 tall, the sill near the waist), cage, AC, maybe a laundry pole
    const unit = 30, n = Math.max(1, Math.floor((w - 8) / unit)), off = Math.round((w - n * unit) / 2);
    for (let f = 0; f < floors; f++) {
      const fh = g + f * st;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y(fh + 1), w, 2);
      for (let c = 0; c < n; c++) {
        const cx = off + c * unit, s = seed * 1013 + f * 37 + c * 7, q = hash(s), ww = 18 + Math.round(hash(s + 1) * 6), wh = Math.max(Math.min(24, st - 10), Math.min(36, st - 12, Math.round(st * 0.6))), wx = cx + Math.round((unit - ww) / 2), sill = fh + Math.max(2, Math.min(st - wh - 6, Math.round(st * 0.3)));
        const on = hash(s + 2) < Number(p.lit) && windowLit(s, o.lighting), cool = hash(s + 3) < 0.6, col = cool ? '190,230,215' : '255,190,120';
        x.fillStyle = on ? rgba(col, 0.5 + 0.3 * hash(s + 4)) : '#07090a'; x.fillRect(wx, y(sill + wh), ww, wh);
        if (on) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(wx + Math.round(ww * hash(s + 5)), y(sill + wh), 2, wh); o.light?.(wx + ww / 2, sill + wh / 2, ww, wh, col, 'window'); }
        // the aluminium slider: a frame, two sashes overlapping in the middle, a fixed top light
        x.fillStyle = 'rgba(170,178,182,.45)'; x.fillRect(wx, y(sill + wh), ww, 1); x.fillRect(wx, y(sill + 1), ww, 1); x.fillRect(wx, y(sill + wh), 1, wh); x.fillRect(wx + ww - 1, y(sill + wh), 1, wh);
        const half = Math.round(ww / 2), slid = hash(s + 10) < 0.4 ? Math.round(ww * 0.25) : 0; x.fillRect(wx + half - 1 - slid, y(sill + wh), 1, wh); x.fillRect(wx + half + 1, y(sill + wh), 1, wh);
        x.fillRect(wx, y(sill + wh - Math.round(wh * 0.28)), ww, 1);
        if (q < Number(p.cages)) {
          // a burglar-bar cage bolted round the window, standing out over the street
          const cw = ww + 6, ch = wh + 6, cl = wx - 3, cb = sill - 4;
          x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(cl + 1, y(cb) + 1, cw, 2);
          x.strokeStyle = 'rgba(150,140,128,.55)'; x.lineWidth = 1; x.strokeRect(cl + 0.5, y(cb + ch) + 0.5, cw - 1, ch - 1);
          x.fillStyle = 'rgba(150,140,128,.35)'; for (let b = cl + 3; b < cl + cw - 1; b += 3) x.fillRect(b, y(cb + ch) + 1, 1, ch - 2);
          if (hash(s + 6) < 0.4) { x.fillStyle = 'rgba(80,140,70,.7)'; x.fillRect(cl + 2, y(cb + 4), cw - 4, 3); }
          else if (hash(s + 6) < 0.6) for (let k = 0; k < 3; k++) { x.fillStyle = ['rgba(200,70,60,.6)', 'rgba(230,200,140,.55)', 'rgba(120,150,200,.55)'][(k + c) % 3]; x.fillRect(cl + 3 + k * 5, y(cb + ch - 2), 3, 5); }
        }
        if (hash(s + 7) < 0.2 + 0.6 * d) P.acUnit(x, y, wx + ww / 2 + (hash(s + 8) < 0.5 ? -4 : 4), sill - 13);
        if (hash(s + 9) < 0.25 * d) {
          // a bamboo laundry pole stuck straight out, clothes on it
          const py = y(sill + wh - 3); x.strokeStyle = 'rgba(160,130,80,.7)'; x.beginPath(); x.moveTo(wx + ww, py); x.lineTo(wx + ww + 18, py); x.stroke();
          for (let k = 0; k < 4; k++) { x.fillStyle = ['rgba(200,70,60,.6)', 'rgba(230,220,200,.5)', 'rgba(90,120,170,.6)', 'rgba(230,170,60,.55)'][(k + f) % 4]; x.fillRect(wx + ww + 2 + k * 4, py + 1, 3, 4 + (k % 2) * 2); }
        }
      }
    }
    if (d > 0.3) for (const px of [3, w - 6]) P.wallPipe(x, px, y(H), y(g));
    // the roof: a parapet, rooftop shacks of sheet metal, tanks, an antenna forest
    x.fillStyle = '#0d0f10'; x.fillRect(-1, y(H + 4), w + 2, 4);
    if (p.shacks !== false) {
      for (let sx = 4 + Math.round(r() * 10); sx < w - 24; sx += 30 + Math.round(r() * 30)) {
        const sw = 18 + Math.round(r() * 16), sh = 12 + Math.round(r() * 6), sid = seed + sx;
        x.fillStyle = '#121314'; x.fillRect(sx, y(H + 4 + sh), sw, sh); x.fillStyle = 'rgba(150,140,128,.25)'; for (let k = sx + 2; k < sx + sw; k += 3) x.fillRect(k, y(H + 4 + sh), 1, sh);
        x.fillStyle = '#0a0a0b'; x.fillRect(sx - 2, y(H + 5 + sh), sw + 4, 2);
        if (windowLit(sid, o.lighting)) { x.fillStyle = 'rgba(255,190,120,.7)'; x.fillRect(sx + 4, y(H + sh), 5, 4); }
      }
      x.strokeStyle = 'rgba(0,0,0,.9)';
      for (let k = 0; k < 4; k++) { const ax = Math.round(w * (0.15 + 0.23 * k + r() * 0.08)), ah = 14 + Math.round(r() * 22); x.beginPath(); x.moveTo(ax, y(H + 4)); x.lineTo(ax, y(H + 4 + ah)); x.moveTo(ax - 4, y(H + ah - 2)); x.lineTo(ax + 4, y(H + ah - 2)); x.stroke(); }
      if (r() < 0.6) P.roofTank(x, Math.round(w * 0.7), y(H + 4), 16, '#121314');
    }
    // the shop floor: shutters and shops under a covered walkway with its strip lights
    const shops = (Array.isArray(p.shops) ? p.shops : []) as Properties[];
    const names: (() => void)[] = [], stalls: (() => void)[] = [];
    x.fillStyle = '#0a0806'; x.fillRect(0, y(g), w, g);
    if (shops.length) {
      const bw = Math.floor((w - 8 - (shops.length - 1) * 6) / shops.length);
      shops.forEach((s, i) => {
        const stall = typeof s.stall === 'string' && s.stall !== 'none' ? s.stall : '';
        const bx = 4 + i * (bw + 6), tenant = String(s.tenant), T = TENANTS[tenant] ?? TENANTS.empty, name = s.sign === '-' ? '' : String(s.sign || (stall ? STALL_NAMES[stall] : T.sign));
        const col = stall ? STALL_COL[stall] : T.col, neon = stall ? true : !!T.neon;
        if (stall) stalls.push(() => marketStall(x, stall, bx, bw, g, o, seed * 17 + i));
        else {
          shopWindow(x, y, bx, bw, tenant, o.t, seed * 13 + i, p.canopy !== false ? undefined : { text: name, fascia: 62 });
          if (T.lit) o.light?.(bx + bw / 2, 30, bw - 4, 46, T.col, 'window');
        }
        if (p.canopy !== false && name) names.push(() => neonPlate(x, o.t, bx + bw / 2, y(g - 2), { text: name, col, size: 7, h: 10, printed: !neon, street: true, glow: 0.1, bolts: false, phase: seed + i }));
      });
    } else P.bay(x, y, 6, w - 12, 'shutter');
    // the walkway's slab over the shop fronts, the shops' names on its edge
    if (p.canopy !== false) {
      x.fillStyle = '#101112'; x.fillRect(-4, y(g + 6), w + 8, 8); x.fillStyle = 'rgba(150,140,128,.4)'; x.fillRect(-4, y(g + 6), w + 8, 1);
      x.fillStyle = 'rgba(230,245,240,' + (0.35 + 0.5 * (o.lighting.outdoor ? o.lighting.lamps : 1)).toFixed(3) + ')'; x.fillRect(0, y(g - 2), w, 1);
    }
    for (const stall of stalls) stall();
    for (const name of names) name();
    // signs hung out over the street on brackets, vertical as in Mong Kok
    for (const s of (Array.isArray(p.hung) ? p.hung : []) as Properties[]) {
      const fh = g + (Number(s.floor) - 0.5) * st, col = isHex(s.color) ? rgbOf(String(s.color)) : '255,58,90', sx = Number(s.from), size = 8;
      x.strokeStyle = 'rgba(0,0,0,.9)'; x.beginPath(); x.moveTo(sx - 6, y(fh + 18)); x.lineTo(sx + 6, y(fh + 18)); x.stroke();
      neonPlate(x, o.t, sx, y(fh), { text: String(s.text), col, size, vertical: s.vertical !== false, phase: seed + sx });
      o.light?.(sx, fh, 12, 40, col, 'screen');
    }
  },
});

// ---------------------------------------------------------------- shophouse (Old Quarter)

/** Lime-washed walls at dusk: Hoi An ochre most of all, then old blue and bare plaster. */
const HOUSE_WALLS = ['#3d2f14', '#3a2c16', '#352a18', '#232b2c', '#2e2a22'];
const GOODS = ['tea', 'tailor', 'lanterns', 'pottery', 'home', 'shrine', 'closed'] as const;
const eaveRise = 9;

export const shophouseElement = piece({
  type: 'building.shophouse', label: 'Shophouse (kit, Old Quarter)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 84, 40, 240, 1, 'units'), floors: num('Floors above the shop', 1, 0, 3), storey: num('Floor height', 50, 30, 130, 1, 'units'),
    ground: num('Shop floor height', 66, 44, 120, 1, 'units'), wall: colour('Wall colour'),
    goods: select('Shop front', GOODS), board: text('Name board (empty: none)', ''),
    gallery: bool('Wooden gallery upstairs', true), shutters: select('Shutters', ['mixed', 'open', 'closed']),
    lanterns: num('Lanterns on the eave', 3, 0, 12), lantern: { kind: 'color', label: 'Lantern colour', default: '#ff6a3a' },
    seed: num('Seed', 1, 0, 1000000), ...stateFields,
  },
  state: { vacant: p => ({ ...p, goods: 'closed', shutters: 'closed', lanterns: 0, board: '' }), box: p => ({ w: Number(p.width), h: Number(p.ground) + Number(p.floors) * Number(p.storey), g: Number(p.ground), seed: Number(p.seed) }) },
  size: p => ({ w: Number(p.width), tall: Number(p.ground) + Number(p.floors) * Number(p.storey) + 30 }),
  bounds: p => { const tall = Number(p.ground) + Number(p.floors) * Number(p.storey) + 30; return { x: -8, h: tall, w: Number(p.width) + 16, tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, eave: { x: Number(p.width) / 2, h: Number(p.ground), role: 'mount' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), floors = Number(p.floors), st = Number(p.storey), g = Number(p.ground), H = g + floors * st, seed = Number(p.seed), r = rng(seed * 4999 + 3);
    const wall = isHex(p.wall) ? String(p.wall) : HOUSE_WALLS[Math.floor(r() * HOUSE_WALLS.length)], on = (s: number) => windowLit(s, o.lighting);
    const lanternCol = isHex(p.lantern) ? rgbOf(String(p.lantern)) : '255,106,58', glow = o.lighting.outdoor ? o.lighting.lamps : 1;
    x.fillStyle = wall; x.fillRect(0, y(H), w, H);
    // lime-wash: mould at the foot, paler patches where it was redone, a crack
    const foot = x.createLinearGradient(0, y(g * 0.7), 0, 0); foot.addColorStop(0, 'rgba(0,0,0,0)'); foot.addColorStop(1, 'rgba(10,14,8,.45)');
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,230,180,.04)'; x.fillRect(Math.round(r() * (w - 20)), y(g + r() * (H - g)), 14 + Math.round(r() * 20), 8 + Math.round(r() * 10)); }
    x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < Math.round(w / 14); i++) { const sx = Math.round(r() * w); x.fillRect(sx, y(H), 1, Math.round(10 + r() * 30)); }
    // upper floors: shuttered windows, maybe a gallery with its rail and posts
    for (let f = 0; f < floors; f++) {
      // tall timber casements a person could stand in (20 wide, about two thirds of the storey), shutters folded back
      const WW = 20, fh = g + f * st, nW = Math.max(1, Math.floor((w - 8) / 38)), gap = (w - nW * WW) / (nW + 1);
      for (let c = 0; c < nW; c++) {
        const wx = Math.round(gap + c * (WW + gap)), wh = Math.min(st - 10, Math.max(26, Math.round(st * 0.64))), sill = fh + Math.max(2, Math.min(st - wh - 6, Math.round(st * 0.22))), s = seed * 31 + f * 7 + c;
        const mode = p.shutters === 'mixed' ? (hash(s) < 0.5 ? 'open' : 'closed') : String(p.shutters), lit = mode === 'open' && on(s);
        const top = y(sill + wh), fan = Math.round(wh * 0.22);
        x.fillStyle = lit ? 'rgba(255,190,110,.6)' : '#120c07'; x.fillRect(wx, top, WW, wh);
        if (lit) o.light?.(wx + WW / 2, sill + wh / 2, WW - 2, wh, '255,180,100', 'window');
        x.fillStyle = '#2a1a0d';
        if (mode === 'closed') { x.fillRect(wx, top, WW, wh); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(wx + WW / 2, top, 1, wh); for (let k = 3; k < wh; k += 3) x.fillRect(wx + 1, top + k, WW - 2, 1); }
        else {
          // the casement: a fanlight over two glazed leaves, their frames, the louvred shutters folded back on the wall
          x.fillRect(wx, top + fan, WW, 1); x.fillRect(wx + WW / 2, top + fan, 1, wh - fan); x.fillRect(wx, top, 1, wh); x.fillRect(wx + WW - 1, top, 1, wh);
          for (let k = wx + 4; k < wx + WW - 2; k += 4) x.fillRect(k, top, 1, fan);
          x.fillRect(wx - 8, top, 7, wh); x.fillRect(wx + WW + 1, top, 7, wh); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 3; k < wh; k += 3) { x.fillRect(wx - 7, top + k, 5, 1); x.fillRect(wx + WW + 2, top + k, 5, 1); }
        }
        x.fillStyle = '#1a1008'; x.fillRect(wx - 2, y(sill), WW + 4, 2);
      }
      if (p.gallery !== false && f === 0) {
        // the gallery: a timber deck along the front, a rail of balusters, two posts up to the eave
        const dh = fh + 2; x.fillStyle = '#1e1209'; x.fillRect(-3, y(dh + 3), w + 6, 4);
        x.fillStyle = '#24160b'; x.fillRect(-3, y(dh + 16), w + 6, 2); for (let b = 0; b < w + 6; b += 4) x.fillRect(b - 3, y(dh + 15), 1, 12);
        x.fillRect(-2, y(fh + st), 3, st); x.fillRect(w - 1, y(fh + st), 3, st);
        x.fillStyle = 'rgba(' + P.TRIM + ',.25)'; x.fillRect(-3, y(dh + 16), w + 6, 1);
      }
    }
    // the main roof: rows of curved tiles, a ridge with its ends turned up
    tileRoof(x, -6, H, w + 12, Math.min(26, 10 + Math.round(w * 0.14)), seed);
    const ox = 7, ow = w - 14, oh = g - 12, goods = String(p.goods);
    if (goods === 'home') {
      // a house, not a shop: a plain timber door, one barred window, a light on now and then
      const dw = 22, dx = Math.round(w * 0.22), wx = Math.min(w - 30, dx + dw + 14), wl = on(seed + 5);
      x.fillStyle = '#20130a'; x.fillRect(dx, y(oh), dw, oh); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(dx + dw / 2, y(oh), 1, oh);
      x.fillStyle = '#1a1008'; x.fillRect(dx - 2, y(oh + 2), dw + 4, 2); x.fillStyle = 'rgba(230,190,110,.5)'; x.fillRect(dx + dw - 5, y(oh / 2), 2, 2);
      x.fillStyle = wl ? 'rgba(255,180,100,.55)' : '#0c0805'; x.fillRect(wx, y(oh - 8), 20, 20);
      x.fillStyle = '#25160a'; for (let k = wx + 3; k < wx + 20; k += 4) x.fillRect(k, y(oh - 8), 1, 20);
      if (wl) o.light?.(wx + 10, oh - 18, 18, 18, '255,180,100', 'window');
      x.fillStyle = '#1a1008'; x.fillRect(ox - 4, y(2), ow + 8, 2);
    } else {
    // the shop front under the pent roof: folding timber doors pushed aside, the room lit
    const lit = goods !== 'closed';
    x.fillStyle = lit ? 'rgba(255,170,90,.32)' : '#0c0805'; x.fillRect(ox, y(oh), ow, oh);
    if (lit) { shopGoods(x, goods, ox, ow, oh, o.t, seed); o.light?.(ox + ow / 2, oh / 2, ow - 4, oh - 6, '255,170,90', 'window'); }
    x.fillStyle = '#25160a';
    if (goods === 'closed') for (let k = ox; k < ox + ow; k += 6) { x.fillRect(k, y(oh), 5, oh); x.fillStyle = k % 12 ? '#25160a' : '#2c1a0c'; }
    else { for (let k = 0; k < 3; k++) { x.fillRect(ox + k * 3, y(oh), 2, oh); x.fillRect(ox + ow - 2 - k * 3, y(oh), 2, oh); } }
    x.fillStyle = '#1a1008'; x.fillRect(ox - 2, y(oh + 2), ow + 4, 3); x.fillRect(ox - 4, y(2), ow + 8, 2);
    }
    // the pent roof over the street, the lanterns hung from it, the lacquered board under it
    tileRoof(x, -8, g, w + 16, eaveRise, seed + 1, true);
    const n = Number(p.lanterns);
    for (let i = 0; i < n; i++) {
      const lx = Math.round((w * (i + 0.5)) / n), sway = Math.sin(o.t / 50 + seed + i) * 1.1, top = y(g - 3), a = 0.4 + 0.55 * glow * (0.88 + 0.12 * Math.sin(o.t / 9 + i * 3));
      x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); x.moveTo(lx, top); x.lineTo(lx + sway, top + 4); x.stroke();
      x.fillStyle = rgba(lanternCol, a); x.beginPath(); x.ellipse(lx + sway + 0.5, top + 9, 3.5, 4.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#100806'; x.fillRect(Math.round(lx + sway) - 2, top + 4, 5, 1); x.fillRect(Math.round(lx + sway) - 1, top + 13, 3, 1);
      o.light?.(lx, g - 12, 8, 10, lanternCol, 'screen');
    }
    const board = String(p.board ?? '');
    if (board) neonPlate(x, o.t, w / 2, y(g - 18), { text: board, col: '230,190,110', size: 7, h: 11, printed: true, bolts: false, ink: 'rgba(230,190,110,.9)' } as Parameters<typeof neonPlate>[4]);
  },
});

/** Curved clay tiles in rows from `top` up `rise` units over `w` from `l`; a pent roof (`pent`) is a single sloped band. */
function tileRoof(x: CanvasRenderingContext2D, l: number, top: number, w: number, rise: number, seed: number, pent = false) {
  const ridge = top + rise, inset = pent ? 4 : Math.round(w * 0.12);
  x.fillStyle = '#1c0d08'; x.beginPath(); x.moveTo(l, y(top)); x.lineTo(l + inset, y(ridge)); x.lineTo(l + w - inset, y(ridge)); x.lineTo(l + w, y(top)); x.closePath(); x.fill();
  for (let k = 0; k < rise; k += 3) {
    const f = k / rise, a = l + inset * f, b = l + w - inset * f;
    x.fillStyle = 'rgba(150,70,40,.28)'; x.fillRect(Math.round(a), y(top + k + 1), Math.round(b - a), 1);
    x.fillStyle = 'rgba(0,0,0,.35)'; for (let tx = a + ((k / 3) % 2) * 3; tx < b; tx += 6) x.fillRect(Math.round(tx), y(top + k + 2), 1, 2);
  }
  x.fillStyle = '#0c0604'; x.fillRect(l - 1, y(top) - 1, w + 2, 3);
  if (!pent) {
    x.fillStyle = '#2a140c'; x.fillRect(l + inset - 2, y(ridge + 2), w - 2 * inset + 4, 3);
    x.fillStyle = 'rgba(' + P.TRIM + ',.4)'; x.fillRect(l + inset - 2, y(ridge + 2), w - 2 * inset + 4, 1);
    // the ridge ends turned up like a boat's prow
    for (const [ex, dir] of [[l + inset - 2, -1], [l + w - inset + 2, 1]] as const) { x.fillStyle = '#2a140c'; x.fillRect(ex + (dir < 0 ? -3 : 0), y(ridge + 5), 3, 3); x.fillRect(ex + dir * 3 + (dir < 0 ? -2 : 0), y(ridge + 7), 2, 2); }
    if (hash(seed) < 0.3) { x.fillStyle = 'rgba(90,120,60,.5)'; x.fillRect(l + w * 0.4, y(ridge - 2), 6, 2); }
  }
}

/** What fills an open shop front, lit by its own lamps. */
function shopGoods(x: CanvasRenderingContext2D, goods: string, ox: number, ow: number, oh: number, t: number, seed: number) {
  if (goods === 'tea') {
    x.fillStyle = '#20120a'; x.fillRect(ox + 4, y(16), ow - 8, 3); for (let k = ox + 8; k < ox + ow - 8; k += 14) { x.fillRect(k, y(13), 2, 13); x.fillStyle = 'rgba(230,220,200,.6)'; x.fillRect(k + 3, y(19), 3, 3); x.fillStyle = '#20120a'; }
    for (let k = ox + 6; k < ox + ow - 6; k += 7) { x.fillStyle = 'rgba(150,90,50,.6)'; x.fillRect(k, y(oh - 8), 5, 6); }
    for (let s = 0; s < 3; s++) { const rise = (t * 0.2 + s * 7 + seed) % 14; x.fillStyle = 'rgba(255,240,220,' + (0.25 - rise * 0.015).toFixed(3) + ')'; x.fillRect(ox + 14 + s * 9, y(20 + rise), 1, 2); }
  } else if (goods === 'tailor') {
    for (let k = ox + 6; k < ox + ow - 8; k += 12) { const c = ['200,60,60', '220,180,90', '90,120,170', '230,220,200'][(k + seed) % 4]; x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(k + 3, y(oh - 4), 1, 4); x.fillStyle = rgba(c, 0.7); x.fillRect(k, y(oh - 8), 8, 22); x.fillRect(k + 2, y(oh - 30), 4, 12); }
    x.fillStyle = 'rgba(230,220,200,.5)'; x.fillRect(ox + 4, y(oh - 4), ow - 8, 1);
  } else if (goods === 'lanterns') {
    for (let row = 0; row < 3; row++) for (let k = ox + 5 + row * 3; k < ox + ow - 5; k += 9) { const c = ['255,90,50', '255,180,60', '230,60,90', '255,140,40'][(k + row + seed) % 4]; x.fillStyle = rgba(c, 0.8); x.beginPath(); x.ellipse(k, y(oh - 8 - row * 13), 3, 4, 0, 0, Math.PI * 2); x.fill(); }
  } else if (goods === 'pottery') {
    for (let row = 0; row < 2; row++) { x.fillStyle = '#2a170b'; x.fillRect(ox + 3, y(12 + row * 18), ow - 6, 2); for (let k = ox + 6; k < ox + ow - 8; k += 8) { x.fillStyle = rgba(['170,90,50', '120,140,130', '200,170,120'][(k + row) % 3], 0.75); x.fillRect(k, y(18 + row * 18), 5, 6); x.fillRect(k + 1, y(20 + row * 18), 3, 2); } }
  } else if (goods === 'shrine') {
    const cx = ox + ow / 2; x.fillStyle = '#3a0e08'; x.fillRect(cx - 12, y(34), 24, 20); x.fillStyle = 'rgba(255,190,90,.8)'; x.fillRect(cx - 8, y(30), 16, 1);
    for (const dx of [-7, 7]) { x.fillStyle = 'rgba(255,220,150,' + (0.7 + 0.3 * Math.sin(t / 7 + dx)).toFixed(3) + ')'; x.fillRect(cx + dx, y(38), 1, 3); }
    x.fillStyle = 'rgba(230,60,40,.7)'; x.fillRect(cx - 3, y(46), 6, 8);
  } else {
    x.fillStyle = '#1a0f07'; x.fillRect(ox + 6, y(14), ow * 0.5, 2); x.fillRect(ox + 8, y(12), 2, 12); x.fillStyle = 'rgba(230,220,200,.35)'; x.fillRect(ox + ow - 18, y(oh - 10), 10, 12);
  }
}

// ---------------------------------------------------------------- the Spire's foot

export const pavilionElement = piece({
  type: 'building.pavilion', label: 'Spire pavilion (kit: checkpoint, sky elevator, annex)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['checkpoint', 'elevator', 'annex']), width: num('Width', 110, 40, 400, 1, 'units'), height: num('Height', 60, 30, 200, 1, 'units'),
    label: text('Letters (empty: none)', 'IDENTIFY'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: p.kind === 'elevator' ? 900 : Number(p.height) + 10 }),
  bounds: p => { const tall = p.kind === 'elevator' ? 900 : Number(p.height) + 10; return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), h = Number(p.height), kind = String(p.kind), gold = '216,180,90', cold = '220,232,245', label = String(p.label ?? ''), seed = Number(p.seed);
    if (kind === 'annex') {
      // a low service building: concrete, a roller door, vents, a maintenance notice
      x.fillStyle = '#16171a'; x.fillRect(0, y(h), w, h); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, y(h), w, 1);
      P.bay(x, y, 10, Math.min(60, w * 0.5), 'shutter');
      for (let k = w - 30; k > w * 0.6; k -= 14) { x.fillStyle = '#0c0d0f'; x.fillRect(k, y(h - 10), 10, 8); x.fillStyle = 'rgba(255,255,255,.08)'; for (let s = 2; s < 8; s += 2) x.fillRect(k + 1, y(h - 10) + s, 8, 1); }
      x.fillStyle = 'rgba(255,200,40,.7)'; x.fillRect(w - 26, y(36), 14, 10); x.fillStyle = '#16171a'; x.fillRect(w - 24, y(33), 10, 1);
      if (label) neonPlate(x, o.t, w * 0.75, y(h - 22), { text: label, col: cold, size: 6, h: 9, printed: true, bolts: false });
      return;
    }
    if (kind === 'elevator') {
      // the sky elevator: a glass shaft going up out of sight, its car coming down now and then
      const sw = Math.min(46, w * 0.45), sx = (w - sw) / 2;
      x.fillStyle = 'rgba(200,220,235,.07)'; x.fillRect(sx, y(900), sw, 900);
      x.fillStyle = 'rgba(' + gold + ',.5)'; x.fillRect(sx, y(900), 1, 900); x.fillRect(sx + sw - 1, y(900), 1, 900);
      for (let k = 30; k < 900; k += 40) { x.fillStyle = 'rgba(' + gold + ',.18)'; x.fillRect(sx, y(k), sw, 1); }
      const cycle = 1600, ph = (o.t + seed * 97) % cycle, car = ph < 400 ? 600 * (1 - ph / 400) : ph < 900 ? 0 : ph < 1300 ? 600 * ((ph - 900) / 400) : 600;
      x.fillStyle = '#0c0d10'; x.fillRect(sx + 3, y(car + 40), sw - 6, 40); x.fillStyle = 'rgba(' + cold + ',.7)'; x.fillRect(sx + 6, y(car + 36), sw - 12, 28);
      o.light?.(sx + sw / 2, car + 20, sw - 10, 28, cold, 'window');
      // the hall at its foot
      x.fillStyle = '#0b0c0f'; x.fillRect(0, y(h), w, h); x.fillStyle = 'rgba(' + cold + ',.12)'; x.fillRect(4, y(h - 6), w - 8, h - 10);
      x.fillStyle = 'rgba(' + gold + ',.7)'; x.fillRect(0, y(h), w, 1); for (let k = 18; k < w - 4; k += 18) { x.fillStyle = 'rgba(' + gold + ',.3)'; x.fillRect(k, y(h), 1, h); }
      if (label) neonPlate(x, o.t, w / 2, y(h + 8), { text: label, col: gold, size: 6, h: 9, printed: true, bolts: false });
      o.light?.(w / 2, h / 2, w - 8, h - 10, cold, 'window');
      return;
    }
    // the checkpoint: a glass booth, a line of turnstiles with scanners, a barrier arm, cold light
    x.fillStyle = '#0b0c0f'; x.fillRect(0, y(h), Math.min(40, w * 0.35), h); x.fillStyle = 'rgba(' + cold + ',.25)'; x.fillRect(4, y(h - 8), Math.min(40, w * 0.35) - 8, 22);
    x.fillStyle = 'rgba(' + gold + ',.7)'; x.fillRect(0, y(h + 2), Math.min(40, w * 0.35), 2);
    o.light?.(Math.min(40, w * 0.35) / 2, h - 18, 30, 20, cold, 'window');
    const g0 = Math.min(40, w * 0.35) + 8;
    for (let k = g0; k < w - 12; k += 16) {
      x.fillStyle = '#16181c'; x.fillRect(k, y(24), 4, 24); x.fillStyle = 'rgba(' + gold + ',.6)'; x.fillRect(k, y(24), 4, 1);
      const ok = Math.floor(o.t / 120 + k) % 5 !== 0; x.fillStyle = ok ? 'rgba(80,220,140,.9)' : 'rgba(255,42,68,.9)'; x.fillRect(k + 1, y(20), 2, 2);
      x.fillStyle = 'rgba(150,160,175,.5)'; x.fillRect(k + 4, y(16), 8, 1);
    }
    x.fillStyle = '#16181c'; x.fillRect(w - 8, y(30), 4, 30); x.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 40; k += 8) x.fillRect(w - 6 - k - 8, y(28), 4, 2); x.fillStyle = 'rgba(255,42,68,.8)'; for (let k = 4; k < 40; k += 8) x.fillRect(w - 6 - k - 8, y(28), 4, 2);
    if (label) neonPlate(x, o.t, g0 + (w - g0) / 2, y(h - 6), { text: label, col: cold, size: 6, h: 9, printed: true, bolts: false });
  },
});

export const spireFootElement = piece({
  type: 'landmark.spire-foot', label: 'The Spire’s foot (landmark)', category: 'architecture',
  fields: {
    width: num('Width', 1600, 200, 20000, 10, 'units'), portal: num('Portal from the left', 760, 0, 20000, 1, 'units'), portalWidth: num('Portal width', 110, 40, 400, 1, 'units'),
    plinth: num('Plinth height', 28, 0, 120, 1, 'units'), setback: num('Plaza depth (wall sits back)', 0.86, 0.5, 1, 0.01),
    letters: text('Letters over the portal', 'PLAZA CENTRAL'), seams: num('Seams of light', 1, 0, 3, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: 2000 }),
  bounds: p => ({ x: 0, h: 2000, w: Number(p.width), tall: 2000 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, portal: { x: Number(p.portal) + Number(p.portalWidth) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), pl = Number(p.plinth), gold = '216,180,90', cold = '220,232,245', seams = Number(p.seams), px = Number(p.portal), pw = Number(p.portalWidth), ph = 170;
    // the wall: black glass to the top of the sky, faint floor bands, gold seams that breathe
    x.fillStyle = '#060709'; x.fillRect(0, y(2000), w, 2000);
    // the sky caught in the glass, brighter the higher it goes; a fine grid of panes
    const sky = x.createLinearGradient(0, y(2000), 0, y(pl)); sky.addColorStop(0, 'rgba(130,150,180,.12)'); sky.addColorStop(0.8, 'rgba(130,150,180,.04)'); sky.addColorStop(1, 'rgba(130,150,180,0)');
    x.fillStyle = sky; x.fillRect(0, y(2000), w, 2000 - pl);
    x.fillStyle = 'rgba(255,255,255,.018)'; for (let k = 12; k < w; k += 24) x.fillRect(k, y(2000), 1, 2000 - pl);
    x.fillStyle = 'rgba(255,255,255,.035)'; for (let h = pl + 60; h < 2000; h += 60) x.fillRect(0, y(h), w, 1);
    for (let k = 48; k < w; k += 96) { const a = seams * (0.25 + 0.12 * Math.sin(o.t / 90 + k * 0.05)); x.fillStyle = rgba(gold, Math.max(0, a)); x.fillRect(k, y(2000), 1, 2000 - pl); }
    // a reflection of the street on the glass, low and soft
    x.fillStyle = 'rgba(255,200,140,.03)'; x.fillRect(0, y(pl + 40), w, 40);
    // the plinth: dark stone, steps, a gold line
    x.fillStyle = '#121214'; x.fillRect(0, y(pl), w, pl); x.fillStyle = 'rgba(0,0,0,.4)'; for (let h = 6; h < pl; h += 6) x.fillRect(0, y(h), w, 1);
    x.fillStyle = rgba(gold, 0.7); x.fillRect(0, y(pl), w, 1);
    // the portal: tall, lit cold white from within, gold frame; its doors turn slowly
    x.fillStyle = rgba(cold, 0.18); x.fillRect(px, y(ph), pw, ph - pl); x.fillStyle = rgba(cold, 0.5); x.fillRect(px + 4, y(ph - 6), pw - 8, 1);
    x.fillStyle = rgba(gold, 0.85); x.fillRect(px - 3, y(ph + 3), pw + 6, 3); x.fillRect(px - 3, y(ph), 3, ph - pl); x.fillRect(px + pw, y(ph), 3, ph - pl);
    for (let k = 1; k < 4; k++) { const dx = px + (pw * k) / 4; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(dx, y(ph - 6), 1, ph - pl - 6); }
    const turn = (o.t * 0.02) % 1; x.fillStyle = rgba(cold, 0.35); x.fillRect(px + pw / 2 - 10 + Math.round(Math.cos(turn * Math.PI * 2) * 8), y(pl + 34), 2, 34);
    o.light?.(px + pw / 2, (ph + pl) / 2, pw, ph - pl, cold, 'window');
    const letters = String(p.letters ?? '');
    if (letters) neonPlate(x, o.t, px + pw / 2, y(ph + 16), { text: letters, col: gold, size: 7, h: 11, printed: true, bolts: false });
  },
});

// ---------------------------------------------------------------- special buildings

export const marketHallElement = piece({
  type: 'landmark.market-hall', label: 'Market hall (landmark, Neon Market)', category: 'architecture',
  fields: { width: num('Width', 260, 140, 600, 1, 'units'), letters: text('Letters', 'WET MARKET'), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: 210 }),
  bounds: p => ({ x: 0, h: 210, w: Number(p.width), tall: 210 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), base = 96, ry = 74, teal = '70,150,130', seed = Number(p.seed);
    // the steel front: painted green once, a band of letters, three tall arches open to the hall
    x.fillStyle = '#121a18'; x.fillRect(0, y(base), w, base);
    x.fillStyle = '#0f1513'; x.beginPath(); x.ellipse(w / 2, y(base), w / 2, ry, 0, Math.PI, 0); x.fill();
    // the gable's fan of glazing, lit dim from the hall below
    x.save(); x.beginPath(); x.ellipse(w / 2, y(base), w / 2 - 8, ry - 8, 0, Math.PI, 0); x.clip();
    x.fillStyle = 'rgba(255,190,120,.12)'; x.fillRect(0, y(base + ry), w, ry);
    x.strokeStyle = rgba(teal, 0.45); for (let k = 0; k <= 10; k++) { const a = Math.PI + (Math.PI * k) / 10; x.beginPath(); x.moveTo(w / 2, y(base)); x.lineTo(w / 2 + Math.cos(a) * w, y(base) + Math.sin(a) * ry * 2); x.stroke(); }
    for (const f of [0.45, 0.75]) { x.beginPath(); x.ellipse(w / 2, y(base), (w / 2 - 8) * f, (ry - 8) * f, 0, Math.PI, 0); x.stroke(); }
    x.restore();
    x.strokeStyle = rgba(teal, 0.7); x.lineWidth = 2; x.beginPath(); x.ellipse(w / 2, y(base), w / 2 - 2, ry - 2, 0, Math.PI, 0); x.stroke(); x.lineWidth = 1;
    // the corrugated roof's edge, rust bleeding down from it
    for (let k = 4; k < w - 4; k += 9) { x.fillStyle = 'rgba(160,70,30,.12)'; x.fillRect(k, y(base), 2, 6 + (k * 7) % 14); }
    const aw = Math.round((w - 40) / 3), ah = 74;
    for (let i = 0; i < 3; i++) {
      const ax = 10 + i * (aw + 10);
      x.fillStyle = 'rgba(255,170,90,.26)'; x.fillRect(ax, y(ah - aw / 4), aw, ah - aw / 4); x.beginPath(); x.ellipse(ax + aw / 2, y(ah - aw / 4), aw / 2, aw / 4, 0, Math.PI, 0); x.fill();
      // inside: stalls under bare bulbs, tarps, steam
      for (let s = 0; s < 3; s++) { const sx = ax + 4 + s * Math.floor((aw - 8) / 3), sw = Math.floor((aw - 8) / 3) - 3, c = ['230,60,70', '255,170,60', '80,160,200', '120,200,90'][(i + s + seed) % 4]; x.fillStyle = rgba(c, 0.55); x.fillRect(sx, y(34), sw, 5); x.fillStyle = '#1c0e06'; x.fillRect(sx, y(22), sw, 12); x.fillStyle = 'rgba(255,230,180,.9)'; x.fillRect(sx + sw / 2, y(46), 2, 2); }
      for (let k = 0; k < 3; k++) { const rise = (o.t * 0.25 + k * 8 + i * 5) % 22; x.fillStyle = 'rgba(255,240,220,' + (0.22 - rise * 0.009).toFixed(3) + ')'; x.fillRect(ax + aw / 2 + k * 4 - 4, y(30 + rise), 2, 3); }
      x.strokeStyle = rgba(teal, 0.6); x.strokeRect(ax + 0.5, y(ah) + 0.5, aw - 1, ah);
      o.light?.(ax + aw / 2, 30, aw - 6, 50, '255,170,90', 'window');
    }
    x.fillStyle = '#0c1210'; x.fillRect(0, y(base), w, 16); x.fillStyle = rgba(teal, 0.6); x.fillRect(0, y(base), w, 1); x.fillRect(0, y(base - 16), w, 1);
    const letters = String(p.letters ?? ''); if (letters) neonPlate(x, o.t, w / 2, y(base - 8), { text: letters, col: '255,90,70', size: 9, h: 13, phase: seed });
    o.light?.(w / 2, base - 8, 90, 14, '255,90,70', 'screen');
  },
});

export const churchElement = piece({
  type: 'landmark.church', label: 'St. Agnes (landmark, Old Quarter)', category: 'architecture',
  fields: { width: num('Width', 200, 140, 400, 1, 'units'), letters: text('Letters over the door', 'ST. AGNES'), seed: num('Seed', 1, 0, 1000000) },
  size: p => ({ w: Number(p.width), tall: 300 }),
  bounds: p => ({ x: 0, h: 300, w: Number(p.width), tall: 300 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    // after Hanoi's cathedral: grey stone gone black with damp, two square towers, a gable with a rose window
    const w = Number(p.width), tw = Math.round(w * 0.26), towerH = 236, nave = 170, stone = '#1d1c1b', glow = o.lighting.outdoor ? o.lighting.lamps : 1, seed = Number(p.seed);
    const blocks = (l: number, r: number, top: number) => { x.fillStyle = 'rgba(0,0,0,.2)'; for (let h = 8; h < top; h += 8) { x.fillRect(l, y(h), r - l, 1); for (let jx = l + ((h / 8) % 2) * 7; jx < r; jx += 14) x.fillRect(jx, y(h + 8), 1, 8); } };
    const damp = (l: number, r: number, top: number) => { for (let k = l + 3; k < r - 2; k += 5) { x.fillStyle = 'rgba(0,0,0,' + (0.12 + hash(k + seed) * 0.15).toFixed(3) + ')'; x.fillRect(k, y(top), 3, Math.round(top * (0.3 + hash(k * 3 + seed) * 0.5))); } };
    // the nave's gable between the towers
    x.fillStyle = stone; x.fillRect(tw, y(nave - 30), w - 2 * tw, nave - 30);
    x.beginPath(); x.moveTo(tw, y(nave - 30)); x.lineTo(w / 2, y(nave + 20)); x.lineTo(w - tw, y(nave - 30)); x.closePath(); x.fill();
    blocks(tw, w - tw, nave - 30); damp(tw, w - tw, nave - 30);
    // the rose window, faintly coloured
    const rx = w / 2, ryy = y(nave - 52), rr = Math.min(18, (w - 2 * tw) / 4);
    x.fillStyle = '#0c0b0a'; x.beginPath(); x.arc(rx, ryy, rr + 2, 0, Math.PI * 2); x.fill();
    const lit = windowLit(seed * 3 + 1, o.lighting) ? 1 : 0.4;
    for (let k = 0; k < 8; k++) { x.fillStyle = rgba(['200,60,60', '220,180,80', '70,110,180', '120,170,90'][k % 4], 0.35 * lit); x.beginPath(); x.moveTo(rx, ryy); x.arc(rx, ryy, rr, (k * Math.PI) / 4, ((k + 1) * Math.PI) / 4); x.closePath(); x.fill(); }
    x.strokeStyle = 'rgba(0,0,0,.6)'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(rx, ryy); x.lineTo(rx + Math.cos((k * Math.PI) / 4) * rr, ryy + Math.sin((k * Math.PI) / 4) * rr); x.stroke(); }
    // the cross
    x.fillStyle = '#0e0d0c'; x.fillRect(w / 2 - 1, y(nave + 34), 3, 16); x.fillRect(w / 2 - 5, y(nave + 28), 11, 3);
    // the two towers: belfry openings, a flat top with small pinnacles
    for (const tx of [0, w - tw]) {
      x.fillStyle = stone; x.fillRect(tx, y(towerH), tw, towerH); blocks(tx, tx + tw, towerH); damp(tx, tx + tw, towerH);
      x.fillStyle = '#100f0e'; x.fillRect(tx - 2, y(towerH + 4), tw + 4, 5); for (let k = tx; k < tx + tw; k += 8) x.fillRect(k, y(towerH + 10), 4, 6);
      for (const px of [tx, tx + tw - 4]) { x.fillRect(px, y(towerH + 22), 4, 18); x.fillRect(px + 1, y(towerH + 26), 2, 4); }
      for (const [bh, bw2] of [[towerH - 30, 10], [towerH - 90, 8]] as const) {
        const bx = tx + tw / 2 - bw2 / 2; x.fillStyle = '#080706'; x.fillRect(bx, y(bh), bw2, 30); x.beginPath(); x.moveTo(bx, y(bh)); x.lineTo(bx + bw2 / 2, y(bh + 8)); x.lineTo(bx + bw2, y(bh)); x.fill();
        x.fillStyle = 'rgba(150,140,128,.2)'; for (let k = 4; k < 30; k += 4) x.fillRect(bx + 1, y(bh) + k, bw2 - 2, 1);
      }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(tx, y(nave - 30), tw, 2);
    }
    // three pointed doors; the middle one stands open, candlelight inside
    const door = (cx: number, dw: number, dh: number, open: boolean) => {
      x.fillStyle = open ? 'rgba(255,170,80,' + (0.35 + 0.15 * Math.sin(o.t / 11)).toFixed(3) + ')' : '#120c08';
      x.fillRect(cx - dw / 2, y(dh), dw, dh); x.beginPath(); x.moveTo(cx - dw / 2, y(dh)); x.lineTo(cx, y(dh + dw * 0.6)); x.lineTo(cx + dw / 2, y(dh)); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.moveTo(cx - dw / 2 - 2, y(0)); x.lineTo(cx - dw / 2 - 2, y(dh)); x.lineTo(cx, y(dh + dw * 0.6 + 2)); x.lineTo(cx + dw / 2 + 2, y(dh)); x.lineTo(cx + dw / 2 + 2, y(0)); x.stroke();
      if (open) { for (const dx of [-6, -2, 3, 7]) { x.fillStyle = 'rgba(255,230,170,' + (0.6 + 0.3 * Math.sin(o.t / 6 + dx)).toFixed(3) + ')'; x.fillRect(cx + dx, y(18), 1, 2); } o.light?.(cx, dh / 2, dw, dh, '255,170,80', 'window'); }
    };
    door(w / 2, 30, 56, true); door(tw / 2, 18, 42, false); door(w - tw / 2, 18, 42, false);
    const letters = String(p.letters ?? ''); if (letters) neonPlate(x, o.t, w / 2, y(86), { text: letters, col: '200,190,170', size: 7, h: 10, printed: true, bolts: false, ink: 'rgba(200,190,170,.75)' } as Parameters<typeof neonPlate>[4]);
    void glow;
  },
});

export const districtBuildingElements: AssetDefinition[] = [stackElement, shophouseElement, pavilionElement, spireFootElement, marketHallElement, churchElement];

// ---------------------------------------------------------------- distance rows by district

export const ROW_FORMS = ['towers', 'stacked', 'roofs'] as const;
const mix = (a: string, b: string, k: number) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
/**
 * A far row in a district's own forms, for `building.row` when its form is not Downtown's towers:
 * `stacked`: the Market's packed slabs, small lit flats, antennas, a vertical sign here and there;
 * `roofs`: the Old Quarter's low tiled roofs, a few warm windows, trees between.
 */
export function paintFormRow(x: CanvasRenderingContext2D, form: string, o: { width: number; seed: number; minHeight: number; maxHeight: number; lit: number; haze: number; signs: number }, t: number, lighting: Light, left: (dx: number) => number, base: number, viewW: number) {
  const r = rng(o.seed * 131 + 7), fill = mix('#0a0604', '#1c1222', o.haze), a = 1 - o.haze * 0.6;
  for (let dx = 0, i = 0; dx < o.width; i++) {
    const w = form === 'stacked' ? 22 + Math.round(r() * 28) : 34 + Math.round(r() * 40), h = Math.round(o.minHeight + r() * (o.maxHeight - o.minHeight)) * (form === 'roofs' ? 1 : 1), sx = left(dx), s = o.seed * 977 + i;
    const sign = r() < o.signs * 0.12, tree = form === 'roofs' && r() < 0.18, gapAfter = form === 'stacked' ? Math.round(r() * 3) : Math.round(r() * 8);
    if (sx + w + 10 >= 0 && sx - 10 <= viewW) {
      x.fillStyle = fill;
      if (form === 'stacked') {
        x.fillRect(sx, base - h, w, h);
        for (let k = 0; k < 3; k++) { const ax = sx + 3 + Math.round(hash(s + k) * (w - 6)); x.fillRect(ax, base - h - 6 - Math.round(hash(s + k + 9) * 10), 1, 12); }
        for (let fy = base - h + 4; fy < base - 6; fy += 5) for (let fx = sx + 2; fx < sx + w - 2; fx += 4) {
          const q = hash(fx * 0.31 + fy * 0.73 + s);
          if (q < o.lit * 0.6 && windowLit(Math.round(q * 1e6), lighting)) { x.fillStyle = q < o.lit * 0.35 ? 'rgba(190,230,215,' + (0.5 * a).toFixed(3) + ')' : 'rgba(255,190,120,' + (0.5 * a).toFixed(3) + ')'; x.fillRect(fx, fy, 2, 2); }
        }
        if (sign) { const col = ['255,58,90', '255,176,46', '194,123,255', '0,255,200'][i % 4], sh = 16 + Math.round(hash(s + 3) * 20), sy = base - h + 10 + Math.round(hash(s + 4) * Math.max(1, h - sh - 20)); x.fillStyle = 'rgba(' + col + ',' + ((0.45 + 0.15 * Math.sin(t / 40 + i)) * a).toFixed(3) + ')'; x.fillRect(sx + w - 3, sy, 3, sh); }
      } else {
        // a low house: wall, a tiled roof with deep eaves, a warm window or two
        const roof = Math.min(14, 6 + Math.round(w * 0.12)), wallH = Math.max(10, h - roof);
        x.fillRect(sx + 2, base - wallH, w - 4, wallH);
        x.beginPath(); x.moveTo(sx - 3, base - wallH); x.lineTo(sx + w * 0.2, base - wallH - roof); x.lineTo(sx + w * 0.8, base - wallH - roof); x.lineTo(sx + w + 3, base - wallH); x.closePath(); x.fill();
        x.fillStyle = 'rgba(150,70,40,' + (0.18 * a).toFixed(3) + ')'; x.fillRect(Math.round(sx + w * 0.2), base - wallH - roof, Math.round(w * 0.6), 1);
        for (let k = 0; k < 2; k++) { const q = hash(s + k * 5); if (q < o.lit && windowLit(s * 3 + k, lighting)) { x.fillStyle = 'rgba(255,180,100,' + (0.55 * a).toFixed(3) + ')'; x.fillRect(sx + 6 + Math.round(q * (w - 14)), base - wallH + 6, 3, 4); } }
        if (tree) { x.fillStyle = fill; x.beginPath(); x.ellipse(sx + w + 4, base - wallH - 4, 10, 12, 0, 0, Math.PI * 2); x.fill(); }
      }
    }
    dx += w + gapAfter;
  }
}

const STALL_COL: Record<string, string> = { roast: '255,120,60', fish: '80,220,255', fruit: '255,200,60', electronics: '120,255,200', dried: '255,170,90', clothes: '255,80,200', herbs: '150,230,110' };
const TARPS = [['200,40,40', '230,220,200'], ['40,90,200', '230,220,200'], ['230,180,40', '40,30,20'], ['40,150,90', '230,220,200']];

/**
 * A Mong Kok market stall in a shop bay under the walkway: bare bulbs on cords, a striped tarp out over
 * the pavement, goods hung from every rail and piled out front on crates, hand-written price cards,
 * red plastic stools. It spills past the bay on both sides; `g` is the walkway's height.
 */
function marketStall(x: CanvasRenderingContext2D, kind: string, bx: number, bw: number, g: number, o: Paint, seed: number) {
  const top = g - 4, t = o.t, glow = o.lighting.outdoor ? o.lighting.lamps : 1, warm = '255,200,130', [ta, tb] = TARPS[seed % TARPS.length];
  // the back of the stall: lit warm, crowded
  x.fillStyle = '#0c0806'; x.fillRect(bx, y(top), bw, top); x.fillStyle = rgba(warm, 0.12 + 0.12 * glow); x.fillRect(bx, y(top), bw, top);
  if (kind === 'roast') {
    // roast ducks and pork on hooks over a chopping block
    x.fillStyle = 'rgba(200,40,30,.3)'; x.fillRect(bx, y(top), bw, top);
    x.fillStyle = 'rgba(200,190,170,.6)'; x.fillRect(bx + 2, y(top - 8), bw - 4, 1);
    for (let k = bx + 5, j = 0; k < bx + bw - 6; k += 8, j++) {
      const sw = Math.round(Math.sin(t / 60 + j) * 0.6);
      x.fillStyle = 'rgba(30,20,10,.9)'; x.fillRect(k + 2 + sw, y(top - 8), 1, 4);
      x.fillStyle = j % 3 ? 'rgba(190,90,30,.95)' : 'rgba(150,60,20,.95)'; x.fillRect(k + sw, y(top - 12), 6, 13); x.fillRect(k + 1 + sw, y(top - 25), 4, 3);
      x.fillStyle = 'rgba(255,200,120,.6)'; x.fillRect(k + 1 + sw, y(top - 14), 1, 8);
    }
    x.fillStyle = '#3a1a0a'; x.fillRect(bx + 4, y(26), bw - 8, 8); x.fillStyle = 'rgba(230,220,200,.7)'; x.fillRect(bx + bw / 2 - 6, y(28), 12, 2);
  } else if (kind === 'fish') {
    // stacked tanks lit blue, fish turning in them; polystyrene boxes of ice out front
    for (let r = 0; r < 2; r++) for (let k = bx + 3; k < bx + bw - 14; k += 15) {
      const ty = 24 + r * 18;
      x.fillStyle = 'rgba(40,160,200,.45)'; x.fillRect(k, y(ty + 14), 13, 14); x.strokeStyle = 'rgba(120,220,255,.7)'; x.strokeRect(k + 0.5, y(ty + 14) + 0.5, 12, 13);
      for (let f = 0; f < 2; f++) { const fx = k + 2 + ((t * 0.08 + f * 5 + k + r * 3) % 9); x.fillStyle = f ? 'rgba(255,140,60,.9)' : 'rgba(230,230,240,.85)'; x.fillRect(Math.round(fx), y(ty + 6 + f * 4), 3, 1); }
      o.light?.(k + 6, ty + 7, 12, 12, '80,220,255', 'screen');
    }
    for (let k = bx - 4; k < bx + bw; k += 14) { x.fillStyle = 'rgba(235,235,240,.85)'; x.fillRect(k, y(12), 12, 8); x.fillStyle = 'rgba(200,230,255,.6)'; x.fillRect(k + 1, y(12), 10, 2); x.fillStyle = 'rgba(160,170,190,.8)'; x.fillRect(k + 3, y(13), 5, 1); }
    x.fillStyle = 'rgba(200,40,40,.9)'; x.fillRect(bx + bw - 6, y(10), 8, 10);
  } else if (kind === 'fruit') {
    // bananas on the rail, stepped crates out on the pavement, each a pyramid of one fruit
    for (let k = bx + 4; k < bx + bw - 4; k += 6) { x.fillStyle = 'rgba(240,210,60,.9)'; x.fillRect(k, y(top - 6), 2, 7); x.fillRect(k + 2, y(top - 8), 2, 6); }
    for (let step = 0; step < 3; step++) for (let k = bx - 6 + step * 4, j = 0; k < bx + bw + 6 - step * 4 - 12; k += 14, j++) {
      const ch = 6 + step * 8, c = ['230,60,40', '255,160,40', '120,200,60', '240,220,80', '200,60,120'][(j + step + seed) % 5];
      x.fillStyle = '#3a240e'; x.fillRect(k, y(ch), 13, 6); x.fillStyle = 'rgba(255,190,90,.35)'; x.fillRect(k, y(ch), 13, 1);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3 - a; b++) { x.fillStyle = rgba(c, 0.95); x.fillRect(Math.round(k + 2 + b * 3 + a * 1.5), y(ch + 2 + a * 2), 3, 2); }
      if ((j + step) % 3 === 0) { x.fillStyle = 'rgba(255,230,80,.95)'; x.fillRect(k + 4, y(ch + 10), 7, 5); x.fillStyle = 'rgba(220,30,30,.9)'; x.fillRect(k + 5, y(ch + 8), 5, 1); }
    }
  } else if (kind === 'electronics') {
    // a wall of phone cases, cables slung across, a stack of sets all on different channels
    for (let r = 0; r < 4; r++) for (let k = bx + 3; k < bx + bw - 4; k += 5) { x.fillStyle = rgba(['255,61,242', '80,220,255', '255,200,60', '120,255,140', '230,230,240'][(k + r + seed) % 5], 0.75); x.fillRect(k, y(top - 4 - r * 8), 3, 6); }
    for (let r = 0; r < 2; r++) for (let k = bx - 4 + r * 6; k < bx + bw - 12; k += 18) {
      const ty = 4 + r * 16, ch = Math.floor(t / 47 + k + r) % 4;
      x.fillStyle = '#121214'; x.fillRect(k, y(ty + 15), 17, 15);
      x.fillStyle = ch === 0 ? 'rgba(200,210,230,' + (0.4 + 0.3 * hash(t + k)).toFixed(3) + ')' : rgba(['80,220,255', '255,61,242', '255,200,60'][ch - 1], 0.65); x.fillRect(k + 2, y(ty + 13), 13, 10);
      o.light?.(k + 8, ty + 8, 13, 10, '120,200,255', 'screen');
    }
    x.strokeStyle = 'rgba(0,0,0,.9)'; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(bx + k * 9, y(top - 2)); x.quadraticCurveTo(bx + bw / 2, y(top - 20 - k * 4), bx + bw - k * 7, y(top - 2)); x.stroke(); }
  } else if (kind === 'dried') {
    // strings of dried things on the rail, open sacks heaped out front
    for (let k = bx + 4, j = 0; k < bx + bw - 6; k += 7, j++) { x.strokeStyle = 'rgba(40,25,10,.9)'; x.beginPath(); x.moveTo(k + 2, y(top)); x.lineTo(k + 2, y(top - 20)); x.stroke(); for (let b = 0; b < 4; b++) { x.fillStyle = rgba(['170,60,30', '200,140,70', '120,60,30'][(j + b) % 3], 0.9); x.fillRect(k, y(top - 6 - b * 5), 5, 4); } }
    for (let k = bx - 5, j = 0; k < bx + bw + 2; k += 13, j++) { x.fillStyle = '#5a4020'; x.fillRect(k, y(14), 12, 14); x.fillStyle = 'rgba(230,210,170,.4)'; x.fillRect(k, y(14), 12, 1); x.fillStyle = rgba(['200,40,30', '180,120,50', '230,200,140', '90,60,40'][(j + seed) % 4], 0.95); x.fillRect(k + 1, y(17), 10, 3); x.fillRect(k + 3, y(19), 6, 2); }
  } else if (kind === 'clothes') {
    // two rails of shirts out past the stall's edges, a mannequin
    for (let r = 0; r < 2; r++) { x.fillStyle = 'rgba(200,190,170,.5)'; x.fillRect(bx - 4, y(top - 2 - r * 22), bw + 8, 1); for (let k = bx - 3; k < bx + bw + 3; k += 6) { x.fillStyle = rgba(['255,80,200', '80,180,255', '255,220,60', '240,240,240', '60,60,70', '230,60,60'][(k + r * 2 + seed) % 6], 0.85); x.fillRect(k, y(top - 3 - r * 22), 5, 13); x.fillRect(k - 1, y(top - 3 - r * 22), 7, 3); } }
    x.fillStyle = 'rgba(230,220,200,.75)'; x.fillRect(bx + bw - 10, y(30), 6, 22); x.fillRect(bx + bw - 9, y(34), 4, 4);
  } else {
    // herbs: a red cabinet of drawers, bundles hung from the rail, jars out front
    x.fillStyle = '#4a1210'; x.fillRect(bx + 3, y(top - 6), bw - 6, top - 20); x.fillStyle = 'rgba(255,200,120,.55)';
    for (let r = 0; r < 4; r++) for (let k = bx + 6; k < bx + bw - 8; k += 8) x.fillRect(k + 2, y(top - 12 - r * 9), 3, 1);
    for (let k = bx + 4, j = 0; k < bx + bw - 4; k += 9, j++) { x.fillStyle = rgba(['110,170,70', '160,140,60', '90,120,50'][j % 3], 0.9); x.fillRect(k, y(top), 4, 10); }
    for (let k = bx - 2; k < bx + bw; k += 7) { x.fillStyle = 'rgba(220,230,220,.5)'; x.fillRect(k, y(10), 5, 8); x.fillStyle = 'rgba(150,200,90,.7)'; x.fillRect(k + 1, y(7), 3, 4); }
  }
  // bare bulbs on cords
  for (let k = 0; k < 3; k++) {
    const lx = bx + Math.round((bw * (k + 0.5)) / 3), drop = 6 + ((k + seed) % 3) * 3, sway = Math.round(Math.sin(t / 70 + k + seed) * 0.6);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(lx, y(top), 1, drop);
    x.fillStyle = rgba('255,235,190', 0.6 + 0.4 * glow); x.fillRect(lx - 1 + sway, y(top - drop), 3, 3);
    o.light?.(lx, top - drop - 2, 4, 4, warm, 'screen');
  }
  // the striped tarp out over the pavement, scalloped
  const ty = top - 2, tl = bx - 7, tw = bw + 14;
  for (let k = 0; k < tw; k += 5) { x.fillStyle = rgba((k / 5) % 2 ? tb : ta, 0.85); x.fillRect(tl + k, y(ty), Math.min(5, tw - k), 5); x.fillRect(tl + k + 1, y(ty - 5), Math.max(0, Math.min(3, tw - k - 1)), 1); }
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(tl, y(ty - 6), tw, 1);
  // price cards: yellow card, red marker
  for (let k = 0; k < Math.max(2, Math.floor(bw / 18)); k++) {
    const px = bx + 3 + Math.round(hash(seed + k) * (bw - 10)), ph = 18 + Math.round(hash(seed * 3 + k) * Math.max(1, top - 34));
    x.fillStyle = 'rgba(255,230,80,.95)'; x.fillRect(px, y(ph + 5), 7, 5); x.fillStyle = 'rgba(220,30,30,.95)'; x.fillRect(px + 1, y(ph + 3), 4, 1); x.fillRect(px + 1, y(ph + 1), 5, 1);
  }
  // red plastic stools by the stall
  for (const sx of [bx - 6, bx + bw + 1]) if (hash(seed + sx) < 0.6) { x.fillStyle = 'rgba(210,40,40,.95)'; x.fillRect(sx, y(9), 6, 2); x.fillRect(sx, y(7), 1, 7); x.fillRect(sx + 5, y(7), 1, 7); }
  o.light?.(bx + bw / 2, top / 2, bw, top - 10, warm, 'window');
}
