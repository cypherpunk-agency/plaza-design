/**
 * HARBOR SHIFT KIT (Tommi, 2026-10-22: the prologue's night shift "looks ugly, needs to be completely
 * redone"). The working container yard where the hero works the night shift, from sundown into the
 * night: the harbor style frame ("Salt, diesel and a timetable nobody believes": high-mast sodium in
 * fog, signal lamps, crane beacons; steel, rust, container paint, wet concrete; customs notices,
 * container codes, stencils; the cranes, and the Spire across the bay).
 *
 * Reusable pieces, back to front:
 * - `shift.far-shore`  the bay: the city across the water with the Spire, fog on the waterline, the
 *   water with the city's lights in it (replaces the generic tower skyline).
 * - `shift.ship`       a container ship at the berth, boxes on deck, the bridge lit.
 * - `shift.crane`      a ship-to-shore crane (machinery/crane.ts) with its spreader, load and floodlights.
 * - `shift.quay`       the far apron between the berth and the work bay: crane rails, lanes, light pools.
 * - `shift.stack`      a block of containers (props/containers.ts), with reefers and a depth dimmer.
 * - `shift.reefer-rack` the reefer plug gantry: walkways, plug panels with status lights, cables.
 * - `shift.mast`       a high-mast light: the crown of sodium lamps, its halo and its cone in the fog.
 * - `shift.fog`        a low fog bank drifting over the yard.
 * - `shift.shed`       the transit shed's front with its canopy: the sheltered work bay.
 * - `shift.booth`      the supervisor's glass booth (back and front parts; the supervisor stands between).
 * - `shift.hatch`      a service opening in the shed wall (dispatch window, receiving window).
 * - `shift.counter`, `shift.rack`, `shift.case`, `shift.parcel`, `shift.trolley`, `shift.release`,
 *   `shift.clamp`, `shift.reader`, `shift.printer`, `shift.board`: the work stations and their state.
 * - `shift.sign`       a station sign (stencilled plate with an amber band) on a wall, chains or a post.
 * - `shift.lockers`, `shift.trolley-park`, `shift.bay`, `shift.end`, `shift.floor`: the rest of the bay.
 *
 * Everything draws in its own frame (origin at its foot, x to the right, heights up: y = -h) like
 * `piece()` (buildings/types.ts); state-driven pieces read their presentation state (visual fields)
 * and never change it. Lamps join the light layer only in the play band (parallax 1) or when asked.
 */
import type { Anchor, Element, Field, Placement, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { addLight, type SceneLight } from '../atmosphere/lighting';
import { container, PAL } from '../props/containers';
import { drawGantry, GANTRIES, type Gantry } from '../machinery/crane';
import { drawSpire } from '../architecture/spire';
import { seaCols, skyCols, sunPath } from '../environment/sky';
import { glowLevel, type Light } from '../../world/light';
import { mono, rng } from '../core/primitives';

// ---------------------------------------------------------------- fields and helpers

const num = (label: string, value: number, min = -100000, max = 100000, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
const str = (label: string, value = ''): Field => ({ kind: 'string', label, default: value });
const bool = (label: string, value = false): Field => ({ kind: 'boolean', label, default: value });
const select = (label: string, options: readonly string[], value = options[0]): Field => ({ kind: 'select', label, options: [...options], default: value });
const colour = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
/** An "r,g,b" light colour. */
const rgbField = (label: string, value: string): Field => ({ kind: 'string', label, default: value,
  validate: (v: Value) => { if (typeof v !== 'string' || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(v)) throw new Error(label + ': expected "r,g,b"'); } });
/** A list of rows edited in the inspector (buildings/types.ts `listOf`). */
const listOf = (label: string, item: Record<string, Field>, addLabel: string, def: Properties[]): Field => ({ kind: 'json', label, default: def as Value,
  editor: { kind: 'list', item, addLabel, next: rows => Object.fromEntries(Object.entries(item).map(([k, f]) => [k, typeof f.default === 'number' && k === 'x' ? Number(rows[rows.length - 1]?.x ?? 0) + 60 : f.default])) },
  validate: v => { if (!Array.isArray(v) || !v.every(r => !!r && typeof r === 'object' && !Array.isArray(r))) throw new Error(label + ': expected a list'); } });
const rowsOf = (v: Value | undefined): Properties[] => Array.isArray(v) ? v.filter((r): r is Properties => !!r && typeof r === 'object' && !Array.isArray(r)) : [];

const N = (p: Properties, k: string) => Number(p[k]) || 0;
const S = (p: Properties, k: string) => String(p[k] ?? '');
const hash = (n: number) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type RGB = number[];
const mix = (a: RGB, b: RGB, f: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * f));
const css = (c: RGB, a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
const ca = (c: string, a: number) => 'rgba(' + c + ',' + clamp(a, 0, 1).toFixed(3) + ')';
const hexRgb = (h: string): RGB => /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : [40, 44, 50];
const shade = (h: string, f: number) => css(hexRgb(h).map(v => Math.min(255, v * f)));

/** Fill a rectangle from height `b` up `h` units, `w` wide from `l` (the piece's own frame). */
function R(x: CanvasRenderingContext2D, l: number, b: number, w: number, h: number, col: string) {
  if (w <= 0 || h <= 0) return;
  x.fillStyle = col; x.fillRect(Math.round(l), Math.round(-(b + h)), Math.round(w), Math.round(h));
}
/** Letters centred on (cx, height h). At least 7 units (ART-GUIDE §9). */
function T(x: CanvasRenderingContext2D, s: string, cx: number, h: number, col: string, size = 7, weight = '600', align: CanvasTextAlign = 'center') {
  x.font = mono(size, weight); x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, Math.round(cx), Math.round(-h));
}

/** Sodium: the harbor's high-mast light. */
const SODIUM = '255,176,92';
const AMBER = '#d8a03a';
const INK = '255,226,186';

export interface ShiftPaint {
  t: number; l: Light; v: View;
  /** How strong the lamps are now (0 noon … 1 night): the light layer's strength. */
  on: number;
  /** Presentation state (visual fields). */
  s: Properties;
  at: Readonly<Required<Placement>>;
  /** A light on the light layer at (lx, lh) in the piece's frame. */
  light: (lx: number, lh: number, o: Partial<SceneLight>) => void;
}

const defaults = (fields: Record<string, Field>, p: Properties): Properties => {
  const out: Properties = {};
  for (const [k, f] of Object.entries(fields)) out[k] = p[k] ?? f.default;
  return { ...p, ...out };
};

/**
 * A placeable piece of the shift kit (the `piece()` pattern of buildings/types.ts): culls itself by its
 * box, paints in its own frame, hands its lamps to the light layer. `visual`: presentation state the
 * scene binds (a parcel present, the trolley's position); such pieces read it and never change it.
 */
function kit(o: {
  type: string; label: string; fields: Record<string, Field>; visual?: Record<string, Field>;
  box: (p: Properties) => { x: number; w: number; tall: number };
  anchors?: (p: Properties) => Record<string, Anchor>;
  /** Lamps of a piece placed further back join the light layer too. */
  farLights?: boolean;
  paint: (x: CanvasRenderingContext2D, p: Properties, c: ShiftPaint) => void;
}): Element {
  return {
    type: 'shift.' + o.type, version: 1, label: o.label, category: 'harbor shift', coordinates: 'world', parts: ['backdrop'],
    ...(o.visual ? { visualFields: o.visual, bindingIdentity: 'presentation' as const } : { libraryUse: 'reusable' as const }),
    fields: o.fields,
    bounds: p => { const b = o.box(defaults(o.fields, p)); return { x: b.x, h: b.tall, w: b.w, tall: b.tall }; },
    anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ...(o.anchors?.(defaults(o.fields, p)) ?? {}) }),
    draw(ctx, v, raw, s, _pass, at) {
      const p = defaults(o.fields, raw), b = o.box(p), sx = v.sx(at.x), k = at.scale * at.facing;
      const a = sx + b.x * k, e = sx + (b.x + b.w) * k;
      if (Math.max(a, e) + 40 < 0 || Math.min(a, e) - 40 > v.viewW) return;
      const lit = (at.parallax === 1 || o.farLights) && !!v.illumination;
      const light = (lx: number, lh: number, q: Partial<SceneLight>) => {
        if (!lit) return;
        addLight(v, { kind: 'lamp', ...q, x: at.x + lx * k, h: at.h + lh * at.scale, ...(q.r ? { r: q.r * at.scale } : {}), ...(q.w ? { w: q.w * at.scale } : {}), ...(q.hh ? { hh: q.hh * at.scale } : {}), ...(at.parallax !== 1 ? { par: at.parallax } : {}) });
      };
      ctx.save(); ctx.translate(Math.round(sx), Math.round(v.y(at.h)));
      try { o.paint(ctx, p, { t: v.t, l: v.lighting, v, on: v.lighting ? glowLevel(v.lighting) : 1, s, at, light }); } finally { ctx.restore(); }
    },
  };
}

/** A full-width backdrop drawn in screen space (sky band, floor): `paint` gets the view directly. */
function band(o: { type: string; label: string; fields: Record<string, Field>; tall: (p: Properties) => number;
  paint: (x: CanvasRenderingContext2D, v: View, p: Properties, at: Readonly<Required<Placement>>) => void }): Element {
  return {
    type: 'shift.' + o.type, version: 1, label: o.label, category: 'harbor shift', coordinates: 'world', parts: ['backdrop'], libraryUse: 'reusable', fields: o.fields,
    bounds: p => ({ x: 0, h: o.tall(defaults(o.fields, p)), w: 1200, tall: o.tall(defaults(o.fields, p)) + 40 }),
    anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
    draw(ctx, v, raw, _s, _pass, at) { ctx.save(); try { o.paint(ctx, v, defaults(o.fields, raw), at); } finally { ctx.restore(); } },
  };
}

/** The fog's colour now: the horizon's, lifted, warmed by the sodium lamps at night. */
function fogCol(l: Light | undefined, on: number): RGB {
  if (!l) return [70, 56, 60];
  const hz = skyCols(l)[2];
  return mix(mix(hz, [150, 128, 124], 0.4), [255, 170, 100], 0.22 * on);
}

// ---------------------------------------------------------------- the bay: far city, Spire, water

interface FarTower { x: number; w: number; h: number; top: number; seed: number }
const towerCache = new Map<string, FarTower[]>();
function farTowers(seed: number, from: number, to: number, lo: number, hi: number): FarTower[] {
  const key = [seed, from, to, lo, hi].join('|');
  let list = towerCache.get(key);
  if (list) return list;
  list = [];
  const r = rng(seed * 977 + 13);
  for (let x = from; x < to;) {
    const w = 10 + Math.round(r() * 26), tall = r() < 0.12 ? hi : lo + (hi - lo) * Math.pow(r(), 1.8);
    list.push({ x, w, h: Math.round(tall), top: Math.floor(r() * 4), seed: Math.floor(r() * 100000) });
    x += w + (r() < 0.25 ? Math.round(r() * 30) : Math.round(r() * 4));
  }
  towerCache.set(key, list);
  return list;
}

function paintTowers(x: CanvasRenderingContext2D, v: View, list: FarTower[], par: number, base: number, fill: string, edge: string, lit: number, winA: number, t: number, red: boolean) {
  for (const b of list) {
    const sx = Math.round(v.sx(b.x, par)), top = base - b.h;
    if (sx + b.w < 0 || sx > v.viewW) continue;
    x.fillStyle = fill; x.fillRect(sx, top, b.w, b.h);
    if (b.top === 1) x.fillRect(sx + 3, top - 8, b.w - 6, 8);
    if (b.top === 2) { x.fillRect(sx + Math.floor(b.w / 2), top - 18, 1, 18); if (red) { x.fillStyle = 'rgba(255,42,68,' + (Math.sin(t * 0.03 + b.seed) > 0.3 ? 0.75 : 0.15) + ')'; x.fillRect(sx + Math.floor(b.w / 2) - 1, top - 19, 2, 2); } }
    if (b.top === 3) { x.beginPath(); x.moveTo(sx, top); x.lineTo(sx + b.w, top - 10); x.lineTo(sx + b.w, top); x.fill(); }
    x.fillStyle = edge; x.fillRect(sx, top, b.w, 1);
    if (winA <= 0.01) continue;
    // lit windows: sparse, in floors of 4, warm or cold per building
    const warm = hash(b.seed) < 0.6, col = warm ? '255,190,120' : '200,220,255';
    for (let fy = top + 4; fy < base - 3; fy += 4) for (let fx = sx + 2; fx < sx + b.w - 2; fx += 3) {
      const q = hash(b.seed + fy * 0.37 + fx * 1.31);
      if (q > lit) continue;
      x.fillStyle = ca(col, winA * (0.5 + q / lit * 0.5)); x.fillRect(fx, fy, q < lit * 0.3 ? 2 : 1, 1);
    }
  }
}

const RIPPLES = (() => { const r = rng(91); return Array.from({ length: 120 }, () => [r() * 2000, r(), 4 + r() * 16]); })();

const farShore = band({
  type: 'far-shore', label: 'Bay: the city across the water and the Spire (harbor shift)',
  fields: {
    parallax: num('Parallax', 0.08, 0, 1, 0.01), seed: num('Seed', 7, 0, 1000000),
    tall: num('Tallest towers', 150, 20, 400, 1, 'units'), low: num('Low towers', 26, 4, 200, 1, 'units'),
    lit: num('Lit windows', 0.32, 0, 1, 0.01), haze: num('Haze', 0.6, 0, 1, 0.05),
    spireX: num('Spire position (at its parallax)', 560, -5000, 5000, 1, 'units'), spireSize: num('Spire size', 0.95, 0.1, 4, 0.05),
    traffic: bool('Spire traffic (shuttles, patrol)', true), water: bool('Water from the horizon down', true),
  },
  tall: p => N(p, 'tall') + 300 * N(p, 'spireSize'),
  paint(x, v, p, at) {
    const L = v.lighting, on = L ? glowLevel(L) : 1, par = N(p, 'parallax'), base = Math.round(v.y(at.h)), t = v.t, haze = N(p, 'haze');
    const hz = L ? skyCols(L)[2] : [18, 9, 26], fog = fogCol(L, on);
    if (p.water !== false) {
      const [c0, c1, c2] = L ? seaCols(L) : ['#010309', '#02050c', '#03070d'], g = x.createLinearGradient(0, base, 0, v.viewH);
      g.addColorStop(0, c0); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
      x.fillStyle = g; x.fillRect(0, base, v.viewW, v.viewH - base);
      if (L) sunPath(x, v, L, base, v.gy);
      const span = v.viewW + 40, deep = Math.max(8, v.gy - base);
      for (const [rx, f, len] of RIPPLES) {
        const yy = base + 2 + f * deep, k = 0.12 + 0.5 * f, px = (((rx - v.cam * k + t * 0.08) % span) + span) % span - 20;
        x.fillStyle = 'rgba(170,205,235,' + (0.03 + 0.06 * f).toFixed(3) + ')'; x.fillRect(Math.round(px + Math.sin(t * 0.02 + rx) * 3), Math.round(yy), Math.round(len), 1);
      }
    }
    const seed = N(p, 'seed'), tall = N(p, 'tall'), low = N(p, 'low');
    const back = farTowers(seed, -600, 3200, low * 0.6, tall * 0.62), front = farTowers(seed + 1, -600, 3200, low * 0.4, tall);
    const dark: RGB = [9, 10, 15];
    // the far band first (further, hazier), then the Spire standing in the bay, then the nearer towers
    paintTowers(x, v, back, par * 0.6, base, css(mix(dark, hz, 0.55 * haze)), css(mix(dark, hz, 0.7 * haze), 0.6), N(p, 'lit') * 0.7, 0.25 + 0.45 * on, t, false);
    const spX = v.sx(N(p, 'spireX'), par * 0.8), size = N(p, 'spireSize');
    if (spX > -120 * size && spX < v.viewW + 120 * size) {
      x.save(); x.translate(Math.round(spX), base); x.scale(size, size);
      try { drawSpire(x, { t, fill: css(mix([4, 4, 8], hz, 0.26 * haze)), edge: 0.14, windows: 0.6 + 0.6 * on, glow: true, traffic: p.traffic !== false, scale: size }); } finally { x.restore(); }
    }
    paintTowers(x, v, front, par, base, css(mix(dark, hz, 0.32 * haze)), css(mix([60, 50, 50], hz, 0.4), 0.5), N(p, 'lit'), 0.35 + 0.55 * on, t, true);
    // fog lying on the water at the foot of the city
    const fg = x.createLinearGradient(0, base - 90, 0, base + 4);
    fg.addColorStop(0, css(fog, 0)); fg.addColorStop(0.75, css(fog, 0.32 * haze)); fg.addColorStop(1, css(fog, 0.55 * haze));
    x.fillStyle = fg; x.fillRect(0, base - 90, v.viewW, 94);
    const fw = x.createLinearGradient(0, base, 0, base + 26);
    fw.addColorStop(0, css(fog, 0.45 * haze)); fw.addColorStop(1, css(fog, 0));
    x.fillStyle = fw; x.fillRect(0, base, v.viewW, 26);
    // the city's lights lying on the water under it
    if (p.water !== false) for (const b of front) {
      if (hash(b.seed + 3) > 0.35) continue;
      const sx = Math.round(v.sx(b.x, par)) + Math.floor(b.w / 2);
      if (sx < -4 || sx > v.viewW + 4) continue;
      const col = hash(b.seed) < 0.6 ? '255,180,110' : '200,220,255';
      for (let i = 0; i < 6; i++) {
        const k = hash(b.seed + i + Math.floor(t / 14));
        if (k < 0.3) continue;
        x.fillStyle = ca(col, (0.05 + 0.12 * on) * (1 - i / 6)); x.fillRect(sx - 2 + Math.round((k - 0.5) * 4), base + 3 + i * 3, 3 + Math.round(k * 3), 1);
      }
    }
  },
});

// ---------------------------------------------------------------- the ship at the berth

/** A box on deck, at the ship's scale (a few units tall; far band). */
function deckBox(x: CanvasRenderingContext2D, l: number, b: number, w: number, h: number, p: number, dim: number) {
  const [fill, , hi] = PAL[p % PAL.length];
  R(x, l, b, w, h, fill); R(x, l, b, w, h, 'rgba(6,8,12,' + dim + ')');
  x.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 3; i < w - 1; i += 3) x.fillRect(Math.round(l + i), Math.round(-(b + h - 1)), 1, Math.round(h - 2));
  R(x, l, b + h - 1, w, 1, hi); R(x, l, b + h - 1, w, 1, 'rgba(6,8,12,' + dim + ')');
}

const ship = kit({
  type: 'ship', label: 'Container ship at the berth (harbor shift)',
  fields: {
    length: num('Length', 760, 200, 3000, 1, 'units'), freeboard: num('Hull above the water', 36, 12, 120, 1, 'units'),
    hull: colour('Hull', '#1c2530'), boot: colour('Boot-top (waterline)', '#5c2219'), name: str('Name on the bow', 'MERIDIAN CONSTANCE'),
    tiers: num('Container tiers on deck', 4, 0, 8), box: num('Box height', 20, 8, 60, 1, 'units'), bay: num('Bay width', 46, 16, 140, 1, 'units'),
    bridge: num('Bridge along the hull (0 stern … 1 bow)', 0.84, 0, 1, 0.01), dim: num('Distance dimming', 0.3, 0, 0.9, 0.05),
    lights: bool('Deck and bridge lights', true), seed: num('Seed', 31, 0, 1000000),
  },
  box: p => ({ x: 0, w: N(p, 'length'), tall: N(p, 'freeboard') + N(p, 'tiers') * N(p, 'box') + 90 }),
  anchors: p => ({ deck: { x: N(p, 'length') / 2, h: N(p, 'freeboard'), role: 'surface' } }),
  farLights: true,
  paint(x, p, c) {
    const L = N(p, 'length'), H = N(p, 'freeboard'), r = rng(N(p, 'seed') * 131 + 7), dim = N(p, 'dim'), bh = N(p, 'box'), bw = N(p, 'bay');
    const bx = Math.round(clamp(N(p, 'bridge'), 0.05, 0.95) * (L - 60)), hull = S(p, 'hull');
    // the hull: a square stern on the left, the raked bow on the right
    x.fillStyle = hull; x.beginPath(); x.moveTo(0, -H); x.lineTo(L - 6, -H - 6); x.lineTo(L, -H - 8); x.lineTo(L - 34, 0); x.lineTo(6, 0); x.closePath(); x.fill();
    x.save(); x.clip(); R(x, 0, 0, L, 6, S(p, 'boot'));
    x.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 30; i < L; i += 38) x.fillRect(i, -H - 6, 1, H + 6);
    x.fillStyle = 'rgba(150,60,24,.35)'; for (let i = 0; i < 9; i++) { const sx = Math.round(r() * L); x.fillRect(sx, -H + 2, 2, Math.round(6 + r() * (H - 12))); }
    x.restore();
    x.fillStyle = 'rgba(255,217,165,.16)'; x.beginPath(); x.moveTo(0, -H); x.lineTo(L - 6, -H - 6); x.lineTo(L, -H - 8); x.lineTo(L, -H - 7); x.lineTo(L - 6, -H - 5); x.lineTo(0, -H + 1); x.closePath(); x.fill();
    if (S(p, 'name')) T(x, S(p, 'name'), L - 50, H - 9, 'rgba(230,226,214,.5)', 7, '600', 'right');
    for (let k = 0; k < 4; k++) R(x, L - 40, 4 + k * 7, 3, 1, 'rgba(230,226,214,.45)');
    R(x, L - 70, H - 14, 6, 6, 'rgba(0,0,0,.5)');
    // boxes on deck, bay by bay; the bridge and its funnel aft of it
    const deckH = H + 3, tiers = N(p, 'tiers');
    R(x, 14, H, L - 50, 3, shade(hull, 1.25));
    for (let l = 18; l + bw < L - 44; l += bw + 3) {
      if (l + bw > bx - 30 && l < bx + 52) continue;
      const n = tiers > 0 ? 1 + Math.floor(r() * tiers) : 0;
      for (let k = 0; k < n; k++) {
        if (r() < 0.12 && k > 0) break;
        const half = r() < 0.3;
        deckBox(x, l, deckH + k * bh, half ? Math.floor(bw / 2) - 1 : bw, bh - 1, Math.floor(r() * 8), dim);
        if (half) deckBox(x, l + Math.floor(bw / 2) + 1, deckH + k * bh, Math.floor(bw / 2) - 1, bh - 1, Math.floor(r() * 8), dim);
      }
      R(x, l + bw + 1, deckH, 1, Math.max(0, n) * bh + 4, 'rgba(30,26,22,.8)');
    }
    const bridgeH = Math.max(60, tiers * bh + 26), bwid = 46, lit = c.on;
    R(x, bx - 22, deckH, 14, bridgeH - 10, '#2b2f34'); R(x, bx - 22, deckH + bridgeH - 22, 14, 6, '#6a2a1a');
    R(x, bx, deckH, bwid, bridgeH, '#4d555c'); R(x, bx, deckH, bwid, bridgeH, 'rgba(6,8,12,' + dim + ')');
    R(x, bx - 4, deckH + bridgeH, bwid + 8, 3, '#3a4046'); R(x, bx - 4, deckH + bridgeH + 2, bwid + 8, 1, 'rgba(255,217,165,.25)');
    for (let f = deckH + 8; f < deckH + bridgeH - 6; f += 9) for (let i = bx + 4; i < bx + bwid - 4; i += 6) {
      const on = hash(i * 7 + f) < 0.22 + 0.18 * lit;
      R(x, i, f, 4, 3, on ? ca('255,206,140', 0.5 + 0.4 * lit) : 'rgba(10,12,16,.9)');
    }
    R(x, bx + 2, deckH + bridgeH - 9, bwid - 4, 4, ca('255,214,160', 0.55 + 0.4 * lit));
    if (p.lights !== false) c.light(bx + bwid / 2, deckH + bridgeH - 7, { kind: 'window', w: bwid, hh: 6, r: 18, col: '255,200,130', a: 0.7 });
    // the mast over the bridge with its lights
    R(x, bx + bwid / 2, deckH + bridgeH + 3, 1, 26, '#2a2e33'); R(x, bx + bwid / 2 - 6, deckH + bridgeH + 20, 13, 1, '#2a2e33');
    if (p.lights !== false) {
      R(x, bx + bwid / 2 - 1, deckH + bridgeH + 29, 2, 2, ca('255,250,235', 0.6 + 0.4 * lit));
      R(x, bx + bwid / 2 - 7, deckH + bridgeH + 21, 2, 2, ca('255,42,68', 0.4 + 0.5 * lit)); R(x, bx + bwid / 2 + 6, deckH + bridgeH + 21, 2, 2, ca('34,197,94', 0.4 + 0.5 * lit));
      // deck lights: a fleck every few bays, and their glow on the boxes
      for (let l = 30; l < L - 40; l += 70) { R(x, l, deckH + 1, 2, 1, ca(SODIUM, 0.4 + 0.5 * lit)); }
      R(x, L - 8, H + 9, 2, 2, ca('255,250,235', 0.4 + 0.5 * lit));
    }
  },
});

// ---------------------------------------------------------------- ship-to-shore crane

const crane = kit({
  type: 'crane', label: 'Ship-to-shore crane with spreader and floods (harbor shift)',
  fields: {
    gantry: select('Crane frame', ['sts1', 'sts3', 'sts2'], 'sts1'), paint: colour('Steel paint', '#4a1c0c'), rim: num('Rim', 0.55, 0, 1, 0.05), boomUp: num('Boom raised (0 working, 1 idle)', 0, 0, 1, 0.05),
    trolley: num('Trolley along the boom', -120, -600, 1000, 1, 'units'), hang: num('Spreader drop under the boom', 120, 10, 400, 1, 'units'),
    load: bool('Container on the spreader', true), loadPaint: num('Container paint (0-7)', 3, 0, 7), floods: num('Floodlights under the boom', 0.8, 0, 1, 0.05),
    phase: num('Light phase', 0, 0, 100, 0.1),
  },
  box: () => ({ x: -240, w: 420, tall: 340 }),
  farLights: true,
  paint(x, p, c) {
    const g: Gantry = GANTRIES[(S(p, 'gantry') in GANTRIES ? S(p, 'gantry') : 'sts1') as keyof typeof GANTRIES], up = N(p, 'boomUp'), B = g.boom;
    drawGantry(x, g, c.t, 'all', N(p, 'phase'), false, { paint: S(p, 'paint'), rim: N(p, 'rim'), lit: 0.3, boomUp: up });
    if (up > 0.15) return;
    const tx = clamp(N(p, 'trolley'), B.x0 + 20, B.x1 - 20), low = B.low, drop = N(p, 'hang'), sp = low - drop, on = c.on, fl = N(p, 'floods');
    // the trolley on the boom, its cables, the spreader and what it carries
    R(x, tx - 12, low - 6, 24, 8, '#2a1c14'); R(x, tx - 12, low + 1, 24, 1, 'rgba(255,190,120,.3)');
    x.strokeStyle = 'rgba(200,190,170,.45)'; x.lineWidth = 1; x.beginPath();
    for (const dx of [-9, -5, 5, 9]) { x.moveTo(tx + dx + 0.5, -(low - 6)); x.lineTo(tx + dx * 2 + 0.5, -(sp + 4)); }
    x.stroke();
    R(x, tx - 26, sp, 52, 4, '#c88a1a'); R(x, tx - 26, sp + 3, 52, 1, 'rgba(255,230,170,.5)');
    if (p.load) {
      const [fill, edge, hi] = PAL[N(p, 'loadPaint') % PAL.length];
      R(x, tx - 25, sp - 26, 50, 26, edge); R(x, tx - 24, sp - 25, 48, 24, fill);
      x.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 3; i < 47; i += 3) x.fillRect(Math.round(tx - 24 + i), -(sp - 2), 1, 22);
      R(x, tx - 24, sp - 2, 48, 1, hi);
    }
    // floodlights under the boom: lamp heads and their cones down into the fog
    if (fl > 0.01) for (const fx of [B.x0 + 40, (B.x0 + g.legs[0]) / 2, g.legs[0] + 20, g.legs[1] - 10]) {
      R(x, fx - 3, low - 4, 6, 3, '#1a120c'); R(x, fx - 2, low - 5, 4, 1, ca(SODIUM, 0.5 + 0.5 * on));
      const cg = x.createLinearGradient(0, -(low - 5), 0, 0);
      cg.addColorStop(0, ca(SODIUM, 0.14 * fl * on)); cg.addColorStop(1, ca(SODIUM, 0));
      x.fillStyle = cg; x.beginPath(); x.moveTo(fx - 2, -(low - 5)); x.lineTo(fx + 2, -(low - 5)); x.lineTo(fx + 26, 0); x.lineTo(fx - 26, 0); x.closePath(); x.fill();
      c.light(fx, low - 6, { r: 26, col: SODIUM, a: 0.55 * fl });
    }
  },
});

// ---------------------------------------------------------------- the far apron (crane rails, lanes)

const quay = band({
  type: 'quay', label: 'Quay apron behind the work bay (harbor shift)',
  fields: {
    top: num('Quay edge height', 34, 4, 200, 1, 'units'), parallax: num('Parallax at the quay edge', 0.5, 0, 1, 0.01),
    concrete: colour('Concrete', '#24221f'), rails: bool('Crane rails', true), lanes: num('Lane lines', 2, 0, 6),
    pools: listOf('Light pools (world x at the quay\'s parallax)', { x: num('X', 400, -10000, 10000), width: num('Width', 120, 10, 1000) }, 'Add pool', [{ x: 300, width: 140 }, { x: 760, width: 160 }, { x: 1180, width: 140 }]),
  },
  tall: p => N(p, 'top'),
  paint(x, v, p, at) {
    const top = Math.round(v.y(at.h + N(p, 'top'))), bot = Math.round(v.y(at.h)), H = N(p, 'top'), par = N(p, 'parallax'), L = v.lighting, on = L ? glowLevel(L) : 1;
    if (bot <= top) return;
    x.fillStyle = S(p, 'concrete'); x.fillRect(0, top, v.viewW, v.viewH - top);
    const fog = fogCol(L, on), fg = x.createLinearGradient(0, top, 0, bot);
    fg.addColorStop(0, css(fog, 0.28)); fg.addColorStop(1, css(fog, 0.04));
    x.fillStyle = fg; x.fillRect(0, top, v.viewW, bot - top);
    // the quay's edge: the cope line, fenders below it
    x.fillStyle = 'rgba(255,217,165,.16)'; x.fillRect(0, top, v.viewW, 1);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, top - 3, v.viewW, 3);
    for (let wx = Math.floor(v.cam * par / 90) * 90 - 90; wx < v.cam * par + v.viewW + 90; wx += 90) { const sx = Math.round(wx - v.cam * par); x.fillStyle = '#0d0c0b'; x.fillRect(sx, top - 6, 10, 6); }
    const row = (h: number) => { const k = h / H, pr = par + (1 - par) * (1 - k); return { y: Math.round(v.y(at.h + h)), pr }; };
    if (p.rails !== false) for (const h of [H - 4, H * 0.62]) { const q = row(h); x.fillStyle = 'rgba(160,150,140,.28)'; x.fillRect(0, q.y, v.viewW, 1); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, q.y + 1, v.viewW, 1); }
    const lanes = N(p, 'lanes');
    for (let i = 0; i < lanes; i++) {
      const q = row(H * (0.42 - i * (0.32 / Math.max(1, lanes)))), off = v.cam * q.pr;
      for (let wx = Math.floor(off / 46) * 46 - 46; wx < off + v.viewW + 46; wx += 46) { x.fillStyle = 'rgba(216,160,58,.32)'; x.fillRect(Math.round(wx - off), q.y, 18, 1); }
    }
    for (const pool of rowsOf(p.pools)) {
      const sx = v.sx(N(pool, 'x'), par), w = N(pool, 'width') / 2;
      if (sx + w < 0 || sx - w > v.viewW) continue;
      const g = x.createRadialGradient(sx, top + 2, 0, sx, top + 2, w);
      g.addColorStop(0, ca(SODIUM, 0.2 * on)); g.addColorStop(1, ca(SODIUM, 0));
      x.save(); x.translate(sx, top + 2); x.scale(1, (bot - top) / w); x.translate(-sx, -(top + 2));
      x.fillStyle = g; x.fillRect(sx - w, top + 2 - w, w * 2, w * 2); x.restore();
    }
  },
});

// ---------------------------------------------------------------- container blocks and reefers

/** A reefer: white-grey box, the machinery end with its grille and status light. */
function reefer(x: CanvasRenderingContext2D, l: number, b: number, w: number, h: number, seed: number, t: number, on: number) {
  R(x, l, b, w, h, '#a0a5a8'); R(x, l + 1, b + 1, w - 2, h - 2, '#80868a');
  x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 5; i < w - 14; i += 4) x.fillRect(Math.round(l + i), Math.round(-(b + h - 4)), 1, Math.round(h - 8));
  R(x, l + 1, b + h - 4, w - 2, 3, 'rgba(0,0,0,.25)');
  const ux = l + w - 14; R(x, ux, b + 3, 12, h - 6, '#3a3e42');
  x.fillStyle = 'rgba(0,0,0,.5)'; for (let k = b + 6; k < b + h - 6; k += 3) x.fillRect(Math.round(ux + 2), Math.round(-k), 8, 1);
  const alarm = hash(seed) < 0.12, blink = Math.floor((t + seed * 13) / 30) % 2 === 0;
  R(x, ux + 3, b + h - 10, 3, 2, alarm ? ca('255,170,60', blink ? 0.95 : 0.25) : ca('34,197,94', 0.55 + 0.4 * on));
  R(x, l, b + h - 1, w, 1, 'rgba(255,255,255,.18)');
}

const stackBlock = kit({
  type: 'stack', label: 'Container block (harbor shift)',
  fields: {
    columns: num('Columns', 3, 1, 30), tiers: num('Tiers (highest)', 3, 1, 8), box: select('Box length', ['20ft', '40ft'], '40ft'),
    ragged: num('Ragged (lower columns)', 0.5, 0, 1, 0.05), reefers: num('Reefers (share)', 0, 0, 1, 0.05),
    codes: bool('Codes and line names', true), dim: num('Distance dimming', 0, 0, 0.9, 0.05), gap: num('Gap between columns', 3, 0, 40), seed: num('Seed', 11, 0, 1000000),
  },
  box: p => { const w = p.box === '20ft' ? 66 : 128; return { x: 0, w: N(p, 'columns') * (w + N(p, 'gap')), tall: N(p, 'tiers') * 58 }; },
  anchors: p => { const w = p.box === '20ft' ? 66 : 128; return { top: { x: N(p, 'columns') * (w + N(p, 'gap')) / 2, h: N(p, 'tiers') * 58, role: 'surface' } }; },
  paint(x, p, c) {
    const w = p.box === '20ft' ? 66 : 128, seed = N(p, 'seed'), r = rng(seed * 71 + 3), dim = N(p, 'dim'), tiers = N(p, 'tiers');
    const lv: View = { ...c.v, sx: (wx: number) => wx, y: (h: number) => -h, viewW: 1e6 };
    const NAMES = ['MERIDIAN BULK', 'NULLROUTE LOGISTICS', 'PLAZA HOLDINGS FREIGHT', 'HOLD FOR CUSTOMS', 'KESSLER SEA', ''];
    const CODES = ['MRDU', 'NRLU', 'PLZU', 'KSNU', 'TDLU', 'CSQU', 'HLXU'];
    for (let col = 0; col < N(p, 'columns'); col++) {
      const n = Math.max(1, tiers - Math.floor(r() * (N(p, 'ragged') * tiers + 0.999)));
      for (let k = 0; k < n; k++) {
        const l = col * (w + N(p, 'gap')) + Math.round((r() - 0.5) * 4), b = k * 58, s = seed * 100 + col * 10 + k;
        if (r() < N(p, 'reefers')) reefer(x, l, b, w, 58, s, c.t, c.on);
        else container(x, lv, l, b, { w, h: 58, p: Math.floor(r() * 8), seed: s, ...(p.codes !== false ? { code: CODES[Math.floor(r() * CODES.length)] + ' ' + (100 + Math.floor(r() * 899)) + (w > 100 ? ' ' + (1000 + Math.floor(r() * 8999)) : ''), label: NAMES[Math.floor(r() * NAMES.length)] } : {}) });
        if (dim > 0) R(x, l, b, w, 58, 'rgba(8,10,14,' + dim + ')');
      }
    }
  },
});

const reeferRack = kit({
  type: 'reefer-rack', label: 'Reefer plug gantry (harbor shift)',
  fields: { tiers: num('Tiers', 3, 1, 8), width: num('Width', 36, 16, 200, 1, 'units'), cable: select('Cables run to', ['left', 'right', 'both'], 'both'), reach: num('Cable reach', 26, 4, 200, 1, 'units'),
    dim: num('Distance dimming', 0, 0, 0.9, 0.05), seed: num('Seed', 5, 0, 1000000) },
  box: p => ({ x: -N(p, 'reach'), w: N(p, 'width') + 2 * N(p, 'reach'), tall: N(p, 'tiers') * 58 + 16 }),
  paint(x, p, c) {
    const W = N(p, 'width'), n = N(p, 'tiers'), H = n * 58 + 12, steel = '#4a5560', seed = N(p, 'seed'), reach = N(p, 'reach');
    R(x, 0, 0, 3, H, steel); R(x, W - 3, 0, 3, H, steel); R(x, 0, 0, 1, H, 'rgba(255,230,190,.2)');
    for (let i = 1; i <= n; i++) {
      const h = i * 58 - 2;
      R(x, -2, h, W + 4, 3, '#39424b'); R(x, -2, h + 2, W + 4, 1, 'rgba(255,230,190,.3)');
      R(x, -2, h + 3, 1, 10, steel); R(x, W + 1, h + 3, 1, 10, steel); R(x, -2, h + 12, W + 4, 1, steel);
      // plug panel: a box per reefer with its lights; cables loop down to the boxes either side
      for (const side of [0, 1]) {
        const px = side ? W - 13 : 4, s = seed * 31 + i * 7 + side, fault = hash(s) < 0.15, blink = Math.floor((c.t + s * 9) / 26) % 2 === 0;
        R(x, px, h - 22, 9, 14, '#2a3036'); R(x, px + 2, h - 12, 2, 2, ca('34,197,94', 0.5 + 0.45 * c.on)); R(x, px + 5, h - 12, 2, 2, fault ? ca('255,170,60', blink ? 0.95 : 0.2) : 'rgba(40,40,40,.8)');
        const cside = S(p, 'cable'), goes = cside === 'both' || (cside === 'left' ? !side : !!side);
        if (!goes) continue;
        const ex = side ? W + reach : -reach, sx = px + 4.5;
        x.strokeStyle = 'rgba(20,20,20,.9)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx, -(h - 22)); x.quadraticCurveTo((sx + ex) / 2, -(h - 46), ex, -(h - 30)); x.stroke(); x.lineWidth = 1;
      }
    }
    // the ladder up the left side
    for (let h = 4; h < H - 4; h += 5) R(x, 4, h, 6, 1, 'rgba(160,170,180,.35)');
    if (N(p, 'dim') > 0) R(x, -2, 0, W + 4, H + 1, 'rgba(8,10,14,' + N(p, 'dim') + ')');
  },
});

// ---------------------------------------------------------------- high-mast light

const mast = kit({
  type: 'mast', label: 'High-mast light, sodium in fog (harbor shift)',
  fields: {
    height: num('Height', 280, 40, 800, 1, 'units'), lamps: num('Lamps on the crown', 6, 1, 16), color: rgbField('Lamp colour (r,g,b)', SODIUM),
    cone: num('Light cone in the fog', 0.6, 0, 1, 0.05), halo: num('Halo', 1, 0, 3, 0.05), spread: num('Cone spread at the ground', 90, 10, 600, 1, 'units'),
    dead: num('Dead lamp (-1 none)', -1, -1, 16), glow: bool('Glow on the light layer (and a pool on the ground)', true),
  },
  box: p => ({ x: -Math.max(40, N(p, 'spread')), w: Math.max(80, N(p, 'spread') * 2), tall: N(p, 'height') + 20 }),
  anchors: p => ({ crown: { x: 0, h: N(p, 'height'), role: 'mount' } }),
  farLights: true,
  paint(x, p, c) {
    const H = N(p, 'height'), col = S(p, 'color') || SODIUM, on = c.on, n = N(p, 'lamps'), sp = N(p, 'spread');
    if (N(p, 'cone') > 0) {
      const g = x.createLinearGradient(0, -H, 0, 0);
      g.addColorStop(0, ca(col, 0.16 * N(p, 'cone') * on)); g.addColorStop(0.7, ca(col, 0.05 * N(p, 'cone') * on)); g.addColorStop(1, ca(col, 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(-14, -H + 2); x.lineTo(14, -H + 2); x.lineTo(sp, 0); x.lineTo(-sp, 0); x.closePath(); x.fill();
    }
    // the tapered pole, its door and ladder, the footing
    x.fillStyle = '#2c3137'; x.beginPath(); x.moveTo(-4, 0); x.lineTo(4, 0); x.lineTo(2, -H); x.lineTo(-2, -H); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,220,180,.18)'; x.beginPath(); x.moveTo(-4, 0); x.lineTo(-3, 0); x.lineTo(-1, -H); x.lineTo(-2, -H); x.closePath(); x.fill();
    R(x, -9, 0, 18, 5, '#3b3834'); R(x, -9, 4, 18, 1, 'rgba(255,217,165,.2)'); R(x, -2, 10, 4, 12, '#1b1e22');
    // the crown: a ring of lamps, their halo in the fog
    const halo = N(p, 'halo');
    if (halo > 0) {
      const r = 46 * halo, g = x.createRadialGradient(0, -H, 0, 0, -H, r);
      g.addColorStop(0, ca(col, 0.32 * on)); g.addColorStop(0.4, ca(col, 0.12 * on)); g.addColorStop(1, ca(col, 0));
      x.fillStyle = g; x.fillRect(-r, -H - r, r * 2, r * 2);
    }
    R(x, -18, H - 1, 36, 3, '#1d2024'); R(x, -18, H + 2, 36, 1, 'rgba(255,220,180,.25)'); R(x, -1, H + 2, 2, 8, '#1d2024');
    for (let i = 0; i < n; i++) {
      const lx = -16 + (n === 1 ? 16 : i * 32 / (n - 1)), dead = i === N(p, 'dead');
      R(x, lx - 2, H - 4, 4, 3, '#141619'); R(x, lx - 2, H - 4, 4, 1, dead ? 'rgba(80,70,60,.6)' : ca(col, 0.45 + 0.55 * on));
    }
    R(x, -1, H + 9, 2, 2, ca('255,42,68', Math.sin(c.t * 0.03) > 0.2 ? 0.85 : 0.2));
    if (p.glow !== false) c.light(0, H - 3, { r: 80, col, a: 0.75 });
  },
});

// ---------------------------------------------------------------- fog bank

const FOG = (() => { const r = rng(57); return Array.from({ length: 16 }, () => [r() * 2400, r(), 140 + r() * 260, 5 + r() * 10]); })();
const fogBank = band({
  type: 'fog', label: 'Fog bank drifting over the yard (harbor shift)',
  fields: { top: num('Top', 70, 4, 400, 1, 'units'), density: num('Density', 0.5, 0, 1, 0.05), drift: num('Drift', 0.06, 0, 2, 0.01), parallax: num('Parallax', 0.6, 0, 2, 0.01) },
  tall: p => N(p, 'top'),
  paint(x, v, p, at) {
    const L = v.lighting, on = L ? glowLevel(L) : 1, fog = fogCol(L, on), d = N(p, 'density'), H = N(p, 'top'), base = v.y(at.h), top = v.y(at.h + H);
    if (d <= 0) return;
    const g = x.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, css(fog, 0)); g.addColorStop(1, css(fog, 0.22 * d));
    x.fillStyle = g; x.fillRect(0, top, v.viewW, base - top);
    const span = 2400, par = N(p, 'parallax');
    for (const [fx, fh, w, th] of FOG) {
      const sx = (((fx + v.t * N(p, 'drift') - v.cam * par) % span) + span) % span - 300;
      if (sx > v.viewW || sx + w < 0) continue;
      const cy = v.y(at.h + fh * H);
      x.fillStyle = css(fog, 0.07 * d); x.beginPath(); x.ellipse(sx + w / 2, cy, w / 2, th, 0, 0, Math.PI * 2); x.fill();
    }
  },
});

// ---------------------------------------------------------------- the transit shed and its canopy

const shed = kit({
  type: 'shed', label: 'Transit shed front with canopy: the work bay (harbor shift)',
  fields: {
    width: num('Width', 730, 80, 4000, 1, 'units'), height: num('Wall height', 172, 60, 600, 1, 'units'),
    canopy: num('Canopy height', 122, 56, 400, 1, 'units'), fascia: num('Canopy fascia', 12, 4, 40, 1, 'units'), overhang: num('Canopy overhang past the ends', 14, 0, 200, 1, 'units'),
    wall: colour('Cladding', '#283038'), name: str('Name on the wall', 'TRANSIT SHED 3'), sub: str('Second line', 'NIGHT TRANSPORT · BAY 3'),
    columns: { kind: 'json', label: 'Canopy columns (x from the left end)', default: [40, 276, 402, 544, 726],
      validate: v => { if (!Array.isArray(v) || v.some(q => typeof q !== 'number')) throw new Error('Columns: expected a list of numbers'); } },
    strips: { kind: 'json', label: 'Work lights under the canopy (x)', default: [200, 340, 460, 620],
      validate: v => { if (!Array.isArray(v) || v.some(q => typeof q !== 'number')) throw new Error('Work lights: expected a list of numbers'); } },
    stripColor: rgbField('Work light colour (r,g,b)', '255,232,196'), pipes: bool('Downpipes and conduit', true), seed: num('Seed', 3, 0, 1000000),
  },
  box: p => ({ x: -N(p, 'overhang'), w: N(p, 'width') + 2 * N(p, 'overhang'), tall: N(p, 'height') + 30 }),
  anchors: p => ({ canopy: { x: N(p, 'width') / 2, h: N(p, 'canopy') + N(p, 'fascia'), role: 'surface' }, roof: { x: N(p, 'width') / 2, h: N(p, 'height') + 4, role: 'surface' } }),
  paint(x, p, c) {
    const W = N(p, 'width'), H = N(p, 'height'), C = N(p, 'canopy'), F = N(p, 'fascia'), O = N(p, 'overhang'), wall = S(p, 'wall'), r = rng(N(p, 'seed') * 53 + 1), on = c.on, sc = S(p, 'stripColor') || '255,232,196';
    // corrugated cladding: ribs, girts, a few replaced panels, rust running from the fixings
    R(x, 0, 0, W, H, wall);
    x.fillStyle = 'rgba(190,205,220,.06)'; for (let i = 1; i < W; i += 5) x.fillRect(i, -H, 1, H);
    x.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 3; i < W; i += 5) x.fillRect(i, -H, 1, H);
    for (let k = 0; k < 6; k++) { const l = Math.round(r() * (W - 60)), w = 25 + Math.round(r() * 40), b = Math.round(r() * 2) * 56 + 12; R(x, l, b, w, 56, r() < 0.5 ? 'rgba(90,110,120,.10)' : 'rgba(0,0,0,.12)'); }
    for (const h of [56, 112]) { R(x, 0, h, W, 1, 'rgba(0,0,0,.4)'); R(x, 0, h - 1, W, 1, 'rgba(190,205,220,.08)'); }
    for (let k = 0; k < Math.round(W / 40); k++) { const sx = Math.round(r() * W), top = 30 + r() * (H - 40); R(x, sx, top - 20 - r() * 40, 1 + Math.round(r()), 20 + r() * 40, 'rgba(120,52,20,.32)'); }
    // the plinth, the coping and the gutter
    R(x, 0, 0, W, 12, '#36322d'); R(x, 0, 11, W, 1, 'rgba(255,217,165,.14)');
    for (let i = 0; i < W; i += 23) R(x, i + Math.round(r() * 10), 0, 6 + Math.round(r() * 8), 2 + Math.round(r() * 5), 'rgba(0,0,0,.25)');
    R(x, -2, H, W + 4, 5, '#3a424a'); R(x, -2, H + 4, W + 4, 1, 'rgba(255,220,180,.22)');
    // roof plant: a vent stack and an extract fan box against the sky
    R(x, W * 0.18, H + 5, 26, 12, '#2a3036'); R(x, W * 0.18 + 26 - 1, H + 5, 1, 12, 'rgba(255,220,180,.15)');
    R(x, W * 0.7, H + 5, 4, 22, '#2a3036'); R(x, W * 0.7 - 3, H + 26, 10, 3, '#2a3036');
    // the name, stencilled big, and its second line
    if (S(p, 'name')) { x.save(); x.font = mono(14, '700'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + INK + ',.5)'; x.fillText(S(p, 'name'), Math.round(W * 0.38), -(H - 22)); x.restore(); }
    if (S(p, 'sub')) T(x, S(p, 'sub'), W * 0.38, H - 38, 'rgba(' + INK + ',.32)', 7, '600');
    // a flood on the wall over the canopy, lighting the name
    R(x, W * 0.38 - 3, H - 4, 6, 3, '#1a1d21'); R(x, W * 0.38 - 2, H - 5, 4, 1, ca(SODIUM, 0.5 + 0.5 * on));
    const ng = x.createRadialGradient(W * 0.38, -(H - 18), 0, W * 0.38, -(H - 18), 90);
    ng.addColorStop(0, ca(SODIUM, 0.1 * on)); ng.addColorStop(1, ca(SODIUM, 0));
    x.fillStyle = ng; x.fillRect(W * 0.38 - 90, -(H + 72), 180, 180);
    if (p.pipes !== false) for (const px of [W * 0.12, W * 0.86]) { R(x, px, 12, 3, H - 12, '#1d2227'); R(x, px, 12, 1, H - 12, 'rgba(255,220,180,.12)'); for (let h = 30; h < H; h += 46) R(x, px - 1, h, 5, 2, '#14181b'); }
    if (p.pipes !== false) { R(x, 0, C - 10, W, 2, '#1b1f23'); for (let i = 50; i < W; i += 130) R(x, i, C - 14, 8, 6, '#20262b'); }
    // the canopy: the wall under it in its shade, lit by the work lights; the fascia; the columns
    const sh = x.createLinearGradient(0, -C, 0, -C + 50);
    sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.fillRect(0, -C, W, 50);
    const strips = Array.isArray(p.strips) ? (p.strips as number[]) : [];
    for (const sx of strips) {
      const g = x.createRadialGradient(sx, -C + 4, 0, sx, -C + 4, 84);
      g.addColorStop(0, ca(sc, 0.16 * on)); g.addColorStop(1, ca(sc, 0));
      x.fillStyle = g; x.fillRect(sx - 84, -C - 80, 168, 168);
    }
    R(x, -O, C, W + 2 * O, F, '#30373f'); R(x, -O, C + F - 1, W + 2 * O, 1, 'rgba(255,220,180,.3)'); R(x, -O, C, W + 2 * O, 2, 'rgba(0,0,0,.5)');
    R(x, -O, C + 4, W + 2 * O, 2, 'rgba(216,160,58,.55)');
    for (const sx of strips) { R(x, sx - 9, C - 3, 18, 3, '#16191c'); R(x, sx - 8, C - 3, 16, 1, ca(sc, 0.55 + 0.45 * on)); c.light(sx, C - 6, { r: 60, col: sc, a: 0.55 }); }
    const cols = Array.isArray(p.columns) ? (p.columns as number[]) : [];
    for (const cx of cols) {
      R(x, cx - 3, 0, 6, C, '#3a424b'); R(x, cx - 3, 0, 1, C, 'rgba(255,220,180,.25)'); R(x, cx + 2, 0, 1, C, 'rgba(0,0,0,.4)');
      for (let k = 0; k < 4; k++) R(x, cx - 3, 2 + k * 5, 6, 5, k % 2 ? '#16130f' : AMBER);
      R(x, cx - 5, 0, 10, 2, '#1d2125'); R(x, cx - 6, C - 4, 12, 4, '#2a3138');
    }
  },
});

// ---------------------------------------------------------------- the supervisor's glass booth

const booth = kit({
  type: 'booth', label: 'Supervisor\'s glass booth (back and front, harbor shift)',
  fields: {
    part: select('Part (the back behind the person, the front over them)', ['back', 'front'], 'back'), width: num('Width', 96, 50, 300, 1, 'units'), height: num('Height', 80, 56, 160, 1, 'units'),
    label: str('Sign', 'SUPERVISOR'), sub: str('Sign, second line', 'BAY 3'), hatch: num('Service window width', 46, 0, 200, 1, 'units'),
    door: select('Door', ['right', 'left', 'none'], 'right'), frame: colour('Frame', '#59636c'), room: colour('Room wall', '#3e3529'),
  },
  box: p => ({ x: -N(p, 'width') / 2 - 4, w: N(p, 'width') + 8, tall: N(p, 'height') + 30 }),
  anchors: p => ({ roof: { x: 0, h: N(p, 'height') + 6, role: 'surface' } }),
  paint(x, p, c) {
    const W = N(p, 'width'), H = N(p, 'height'), l = -W / 2, on = c.on, frame = S(p, 'frame');
    if (p.part === 'back') {
      // the room: a warm lit wall, the shift board, binders, the clock, a desk lamp's pool
      R(x, l, 0, W, H, S(p, 'room'));
      const g = x.createLinearGradient(0, -H, 0, 0); g.addColorStop(0, 'rgba(255,230,190,.18)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
      x.fillStyle = g; x.fillRect(l, -H, W, H);
      R(x, l + 6, 32, 30, 26, '#d9d2c0'); R(x, l + 6, 32, 30, 1, 'rgba(0,0,0,.3)');
      for (let k = 0; k < 4; k++) R(x, l + 9, 50 - k * 5, 12 + (k * 7) % 13, 1, k === 1 ? 'rgba(190,50,40,.8)' : 'rgba(40,60,90,.7)');
      R(x, l + 26, 36, 6, 4, 'rgba(34,140,70,.6)');
      R(x, l + W - 40, 58, 32, 2, '#2a221a');
      for (let k = 0; k < 7; k++) R(x, l + W - 39 + k * 4, 60, 3, 9 + (k % 3), ['#7a3328', '#2f4d6b', '#6b6a3a', '#3a3a3a'][k % 4]);
      x.fillStyle = '#e6dcc4'; x.beginPath(); x.arc(l + W - 14, -(H - 12), 5, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#2a221a'; x.beginPath(); x.moveTo(l + W - 14, -(H - 12)); x.lineTo(l + W - 14, -(H - 15)); x.moveTo(l + W - 14, -(H - 12)); x.lineTo(l + W - 12, -(H - 11)); x.stroke();
      R(x, l + W - 34, 22, 20, 14, '#1b1f22'); R(x, l + W - 32, 24, 16, 10, ca('150,190,210', 0.35 + 0.3 * on)); R(x, l + W - 26, 18, 4, 4, '#1b1f22');
      R(x, l + 3, H - 4, W - 6, 2, ca('255,240,214', 0.6 + 0.4 * on));
      c.light(0, H / 2, { kind: 'window', w: W - 10, hh: H - 12, r: 24, col: '255,214,160', a: 0.8 });
      return;
    }
    // the front: kick panel, aluminium frame, glass with a sheen, the service window, the door, the roof and its sign
    const hw = N(p, 'hatch'), door = S(p, 'door'), dl = door === 'right' ? W / 2 - 26 : l + 3;
    R(x, l, 0, W, 16, '#2b3239'); R(x, l, 15, W, 1, 'rgba(255,220,180,.2)');
    x.fillStyle = 'rgba(150,180,200,.10)'; x.fillRect(l + 3, -H + 4, W - 6, H - 20);
    x.save(); x.beginPath(); x.rect(l + 3, -H + 4, W - 6, H - 20); if (hw > 0) x.rect(hw / 2, -60, -hw, 30); x.clip('evenodd');
    x.fillStyle = 'rgba(230,240,255,.07)';
    for (let k = -2; k < 6; k++) { const sx = l + k * 26; x.beginPath(); x.moveTo(sx, -16); x.lineTo(sx + 14, -16); x.lineTo(sx + 44, -H); x.lineTo(sx + 30, -H); x.closePath(); x.fill(); }
    x.restore();
    for (const fx of [l, l + W - 3]) R(x, fx, 0, 3, H, frame);
    R(x, l, 16, W, 2, frame); R(x, l, H - 6, W, 3, frame);
    if (hw > 0) { R(x, -hw / 2 - 2, 30, 2, 30, frame); R(x, hw / 2, 30, 2, 30, frame); R(x, -hw / 2 - 4, 28, hw + 8, 3, '#7b858d'); R(x, -hw / 2 - 2, 60, hw + 4, 2, frame); }
    if (door !== 'none') { R(x, dl, 0, 2, 58, frame); R(x, dl + 21, 0, 2, 58, frame); R(x, dl, 56, 23, 2, frame); R(x, door === 'right' ? dl + 4 : dl + 17, 26, 2, 7, '#c9ced2'); }
    R(x, l + 1, 0, 1, H, 'rgba(255,230,200,.35)');
    R(x, l - 4, H - 3, W + 8, 7, '#252b31'); R(x, l - 4, H + 3, W + 8, 1, 'rgba(255,220,180,.3)');
    // the sign on the roof, lit by its own little lamp
    const label = S(p, 'label'), sub = S(p, 'sub');
    if (label) {
      const sw = Math.round(Math.max(label.length * 4.6 + 14, sub.length * 4.6 + 14)), shh = sub ? 20 : 12, sb = H + 6;
      R(x, -sw / 2 + 4, sb - 2, 2, 4, '#1b1f22'); R(x, sw / 2 - 6, sb - 2, 2, 4, '#1b1f22');
      R(x, -sw / 2, sb + 2, sw, shh, '#d9cfb5'); R(x, -sw / 2, sb + 2 + shh - 3, sw, 3, AMBER);
      T(x, label, 0, sb + 2 + shh - (sub ? 9 : 6), '#1d1a15', 7, '700');
      if (sub) T(x, sub, 0, sb + 7, 'rgba(40,34,26,.8)', 7, '600');
      R(x, -3, sb + shh + 6, 6, 2, '#1b1f22'); R(x, -2, sb + shh + 5, 4, 1, ca('255,236,200', 0.6 + 0.4 * on));
    }
  },
});

// ---------------------------------------------------------------- counters, openings, the case rack

const counter = kit({
  type: 'counter', label: 'Work counter (harbor shift)',
  fields: { width: num('Width', 56, 8, 600, 1, 'units'), height: num('Height', 22, 6, 80, 1, 'units'), color: colour('Body', '#4a5058'), edge: colour('Top', '#b3b9bd'),
    style: select('Front', ['steel', 'panel', 'desk'], 'steel'), label: str('Stencil on the front', '') },
  box: p => ({ x: -N(p, 'width') / 2, w: N(p, 'width'), tall: N(p, 'height') }),
  anchors: p => ({ top: { x: 0, h: N(p, 'height'), role: 'surface' } }),
  paint(x, p) {
    const W = N(p, 'width'), H = N(p, 'height'), l = -W / 2, body = S(p, 'color');
    R(x, l, 0, W, H, body); R(x, l, 0, W, 3, 'rgba(0,0,0,.45)');
    if (p.style === 'steel') { x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 3; i < W - 2; i += 3) x.fillRect(Math.round(l + i), -(H - 4), 1, H - 7); }
    if (p.style === 'panel') { R(x, l + 3, 5, W - 6, H - 10, 'rgba(0,0,0,.18)'); R(x, l + 3, H - 6, W - 6, 1, 'rgba(255,255,255,.08)'); }
    if (p.style === 'desk') { R(x, l + 3, 4, W * 0.4, H - 9, 'rgba(0,0,0,.2)'); for (let k = 0; k < 2; k++) R(x, l + 3 + W * 0.2 - 3, 8 + k * 6, 6, 1, 'rgba(255,230,200,.35)'); }
    R(x, l - 1, H - 3, W + 2, 3, S(p, 'edge')); R(x, l - 1, H - 1, W + 2, 1, 'rgba(255,255,255,.35)'); R(x, l, H - 4, W, 1, 'rgba(0,0,0,.4)');
    R(x, l, 0, 1, H - 3, 'rgba(255,255,255,.12)');
    if (S(p, 'label') && W > S(p, 'label').length * 4.6 + 8 && H >= 14) T(x, S(p, 'label'), 0, H / 2 - 1, 'rgba(' + INK + ',.45)', 7, '600');
  },
});

const HATCH_STOCK = ['#7a6040', '#39678b', '#77664d', '#5a4a36', '#8a7250', '#3f566e'];
const hatch = kit({
  type: 'hatch', label: 'Service opening in the shed wall: dispatch or receiving window (harbor shift)',
  fields: { width: num('Width', 64, 20, 400, 1, 'units'), sill: num('Sill height', 24, 0, 120, 1, 'units'), top: num('Top', 72, 30, 200, 1, 'units'),
    shutter: num('Roller shutter down (share)', 0.3, 0, 1, 0.05), stock: select('Inside', ['parcels', 'cases', 'office'], 'parcels'), screen: str('Screen inside', ''),
    room: colour('Room light colour', '#4a3f2f'), seed: num('Seed', 9, 0, 1000000) },
  box: p => ({ x: -N(p, 'width') / 2 - 5, w: N(p, 'width') + 10, tall: N(p, 'top') + 8 }),
  paint(x, p, c) {
    const W = N(p, 'width'), sill = N(p, 'sill'), top = N(p, 'top'), l = -W / 2, oh = top - sill, on = c.on, r = rng(N(p, 'seed') * 17 + 5);
    R(x, l - 5, sill - 4, W + 10, oh + 9, '#1a1e22'); R(x, l - 5, top + 4, W + 10, 1, 'rgba(255,220,180,.2)');
    R(x, l, sill, W, oh, S(p, 'room'));
    const g = x.createLinearGradient(0, -top, 0, -sill); g.addColorStop(0, 'rgba(255,226,180,.22)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    x.fillStyle = g; x.fillRect(l, -top, W, oh);
    // what is inside: shelving with stock, or an office corner
    if (p.stock !== 'office') {
      for (const sh of [sill + 10, sill + 10 + Math.round(oh * 0.42)]) {
        if (sh > top - 6) continue;
        R(x, l + 2, sh - 2, W - 4, 2, '#2a2420');
        for (let bx = l + 4; bx < l + W - 10;) {
          const bw = p.stock === 'cases' ? 14 : 7 + Math.round(r() * 8), bh = p.stock === 'cases' ? 7 : 5 + Math.round(r() * 7);
          if (r() < 0.8) { R(x, bx, sh, bw, bh, p.stock === 'cases' ? (r() < 0.7 ? '#77664d' : '#5d6670') : HATCH_STOCK[Math.floor(r() * HATCH_STOCK.length)]); R(x, bx, sh + bh - 1, bw, 1, 'rgba(255,240,210,.25)'); }
          bx += bw + 2;
        }
      }
    } else { R(x, l + 6, sill, W * 0.4, 14, '#2a2420'); R(x, l + W - 22, sill + 8, 14, 10, '#1b1f22'); }
    if (S(p, 'screen')) {
      const sw = Math.min(W - 8, S(p, 'screen').length * 4.6 + 8), sx = l + W - sw - 4, sh = top - 16;
      R(x, sx - 1, sh - 1, sw + 2, 12, '#0d0f10'); R(x, sx, sh, sw, 10, '#141a14');
      T(x, S(p, 'screen'), sx + sw / 2, sh + 5, ca('255,186,90', 0.75 + 0.2 * on), 7, '600');
    }
    c.light(0, sill + oh / 2, { kind: 'window', w: W, hh: oh, r: 22, col: '255,206,150', a: 0.75 });
    // the roller shutter, part way down, its bottom bar and handle
    const sd = Math.round(oh * clamp(N(p, 'shutter'), 0, 1));
    if (sd > 0) {
      R(x, l, top - sd, W, sd, '#59616a');
      for (let h = top - sd + 1; h < top; h += 3) R(x, l, h, W, 1, 'rgba(0,0,0,.35)');
      R(x, l, top - sd, W, 2, '#3a4047'); R(x, -4, top - sd - 1, 8, 2, '#c9ced2');
    }
    R(x, l, top - 1, W, 1, 'rgba(0,0,0,.5)');
    R(x, l - 6, sill - 4, W + 12, 4, '#8a9298'); R(x, l - 6, sill - 1, W + 12, 1, 'rgba(255,255,255,.35)');
  },
});

/** A transport case: ribbed plastic, rim, handle slot (the one the worker carries). */
function drawCase(x: CanvasRenderingContext2D, l: number, b: number, w: number, h: number, col: string) {
  R(x, l, b, w, h, shade(col, 0.6)); R(x, l + 1, b + 1, w - 2, h - 2, col);
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 3; i < w - 2; i += 4) x.fillRect(Math.round(l + i), Math.round(-(b + h - 4)), 1, Math.max(1, Math.round(h - 6)));
  R(x, l, b + h - 3, w, 3, shade(col, 1.25)); R(x, l, b + h - 1, w, 1, 'rgba(255,240,210,.45)');
  if (w >= 14 && h >= 9) R(x, l + w / 2 - 3, b + h - 6, 6, 2, 'rgba(0,0,0,.55)');
  R(x, l, b, w, 1, 'rgba(0,0,0,.5)');
}

const rack = kit({
  type: 'rack', label: 'Transport-case return rack (harbor shift)',
  fields: { width: num('Width', 104, 30, 400, 1, 'units'), shelves: num('Shelves', 3, 1, 6), slots: num('Slots per shelf', 3, 1, 10),
    pitch: num('Shelf pitch', 20, 12, 60, 1, 'units'), fill: num('Upper shelves filled', 0.7, 0, 1, 0.05), free: num('Free return slot (bottom shelf, -1 none)', 1, -1, 10),
    upright: colour('Uprights', '#34516b'), beam: colour('Beams', '#c06a2a'), caseColor: colour('Cases', '#77664d'), seed: num('Seed', 4, 0, 1000000) },
  box: p => ({ x: -N(p, 'width') / 2 - 2, w: N(p, 'width') + 4, tall: N(p, 'shelves') * N(p, 'pitch') + 12 }),
  anchors: () => ({ slot: { x: 0, h: 7, role: 'surface' } }),
  paint(x, p) {
    const W = N(p, 'width'), n = N(p, 'shelves'), m = N(p, 'slots'), P = N(p, 'pitch'), l = -W / 2, H = n * P + 10, r = rng(N(p, 'seed') * 13 + 2), sw = (W - 6) / m, free = N(p, 'free');
    R(x, l, 0, W, H, 'rgba(0,0,0,.25)');
    for (let i = 0; i < n; i++) {
      const b = 6 + i * P;
      for (let k = 0; k < m; k++) {
        const cl = l + 3 + k * sw + 1, cw = sw - 2;
        if (i === 0 && k === free) {
          x.strokeStyle = 'rgba(216,160,58,.75)'; x.setLineDash([2, 2]); x.strokeRect(Math.round(cl + 1) + 0.5, -(b + 14) + 0.5, Math.round(cw - 2) - 1, 13); x.setLineDash([]);
          continue;
        }
        if (i === 0 || r() < N(p, 'fill')) drawCase(x, cl, b, cw, Math.min(14, P - 4), S(p, 'caseColor'));
      }
      R(x, l, b - 3, W, 3, S(p, 'beam')); R(x, l, b - 1, W, 1, 'rgba(255,220,170,.4)');
    }
    for (const ux of [l, l + W - 3]) { R(x, ux, 0, 3, H, S(p, 'upright')); R(x, ux, 0, 1, H, 'rgba(255,255,255,.18)'); for (let h = 4; h < H; h += 5) R(x, ux + 1, h, 1, 2, 'rgba(0,0,0,.5)'); }
    R(x, l - 2, 0, 7, 2, '#1b1e22'); R(x, l + W - 5, 0, 7, 2, '#1b1e22');
  },
});

// ---------------------------------------------------------------- what the work moves: parcel, case, trolley

const visible = { visible: bool('Present', true) };
const parcel = kit({
  type: 'parcel', label: 'Parcel (harbor shift)', visual: visible,
  fields: { width: num('Width', 22, 6, 100, 1, 'units'), height: num('Height', 18, 6, 100, 1, 'units'), color: colour('Carton', '#39678b') },
  box: p => ({ x: -N(p, 'width') / 2, w: N(p, 'width'), tall: N(p, 'height') }),
  paint(x, p, c) {
    if (c.s.visible === false) return;
    const W = N(p, 'width'), H = N(p, 'height'), l = -W / 2, col = S(p, 'color');
    R(x, l, 0, W, H, shade(col, 0.55)); R(x, l + 1, 1, W - 2, H - 2, col); R(x, l + W - 4, 1, 3, H - 2, 'rgba(0,0,0,.2)');
    R(x, l + 1, H - 2, W - 2, 1, 'rgba(200,230,250,.6)');
    R(x, -1, 1, 3, H - 2, 'rgba(225,232,236,.45)');
    if (W >= 14 && H >= 12) { R(x, l + 3, 4, 8, 6, '#e8e2d2'); for (let i = 0; i < 6; i += 2) R(x, l + 4 + i, 5, 1, 3, '#2a2620'); }
  },
});

const caseEl = kit({
  type: 'case', label: 'Empty transport case (harbor shift)', visual: { visible: bool('Present', false) },
  fields: { width: num('Width', 26, 6, 100, 1, 'units'), height: num('Height', 14, 4, 60, 1, 'units'), color: colour('Plastic', '#77664d') },
  box: p => ({ x: -N(p, 'width') / 2, w: N(p, 'width'), tall: N(p, 'height') }),
  paint(x, p, c) { if (c.s.visible === true) drawCase(x, -N(p, 'width') / 2, 0, N(p, 'width'), N(p, 'height'), S(p, 'color')); },
});

const trolley = kit({
  type: 'trolley', label: 'Platform trolley (harbor shift)', visual: { x: num('Current position (world x)', 0) },
  fields: { cargo: bool('Load strapped on', true), color: colour('Deck plate', '#8b939a'), stripe: colour('Frame paint', '#c9862a') },
  box: () => ({ x: -34, w: 68, tall: 44 }),
  paint(x, p, c) {
    const dx = Number.isFinite(Number(c.s.x)) && c.s.x !== undefined ? Number(c.s.x) - c.at.x : 0;
    x.translate(Math.round(dx), 0);
    // casters
    for (const wx of [-19, 17]) { R(x, wx - 1, 6, 4, 4, '#2a2e33'); R(x, wx - 4, 0, 9, 9, '#121417'); R(x, wx - 1, 3, 3, 3, '#8a8f94'); }
    // the deck
    R(x, -31, 8, 62, 6, S(p, 'stripe')); R(x, -31, 8, 62, 1, 'rgba(0,0,0,.45)'); R(x, -31, 13, 62, 1, 'rgba(255,240,200,.35)');
    R(x, -30, 14, 60, 3, S(p, 'color')); R(x, -30, 16, 60, 1, 'rgba(255,250,235,.6)');
    // the push handle at the left end
    R(x, -30, 16, 3, 28, '#8e959b'); R(x, -26, 16, 2, 26, '#6d7379'); R(x, -31, 42, 8, 3, '#2b2f33'); R(x, -30, 44, 6, 1, 'rgba(255,255,255,.3)');
    if (p.cargo) {
      drawCase(x, -22, 16, 24, 12, '#5d6670'); drawCase(x, 3, 16, 24, 12, '#77664d'); drawCase(x, -16, 28, 30, 11, '#5d6670');
      R(x, -6, 16, 2, 23, 'rgba(200,60,40,.85)');
    }
  },
});

const release = kit({
  type: 'release', label: 'Wheel-clamp release handle (harbor shift)', visual: { released: bool('Clamp released') },
  fields: { label: str('Plate', 'CLAMP') },
  box: () => ({ x: -10, w: 20, tall: 44 }),
  paint(x, p, c) {
    const done = c.s.released === true, col = done ? '34,197,94' : '255,42,68';
    R(x, -2, 0, 4, 30, '#4a5157'); R(x, -2, 0, 1, 30, 'rgba(255,255,255,.2)'); R(x, -6, 0, 12, 2, '#1d2125');
    R(x, -7, 18, 14, 16, '#3a3230'); R(x, -7, 33, 14, 1, 'rgba(255,220,190,.35)'); R(x, -6, 19, 12, 1, 'rgba(0,0,0,.4)');
    // the lever: up while clamped, down once pulled
    x.strokeStyle = '#c9ced2'; x.lineWidth = 2; x.beginPath(); x.moveTo(4, -26); x.lineTo(done ? 11 : 10, done ? -17 : -36); x.stroke(); x.lineWidth = 1;
    R(x, done ? 9 : 8, done ? 15 : 35, 5, 3, '#a8323a');
    R(x, -4, 26, 4, 4, ca(col, 0.95)); R(x, -4, 29, 4, 1, 'rgba(255,255,255,.5)');
    c.light(-2, 28, { kind: 'neon', r: 14, col, a: 0.8 });
    if (S(p, 'label')) { R(x, -12, 37, 24, 9, '#d9cfb5'); T(x, S(p, 'label'), 0, 41, '#2a241c', 7, '700'); }
  },
});

const clampEl = kit({
  type: 'clamp', label: 'Red wheel clamp (harbor shift)', visual: { released: bool('Released'), trolleyX: num('Trolley position', 0), restX: num('Trolley origin', 0) },
  fields: { wheel: num('Wheel offset from the trolley', 17, -60, 60, 1, 'units') },
  box: () => ({ x: -12, w: 40, tall: 16 }),
  paint(x, p, c) {
    if (c.s.released === true) return;
    const wx = Number(c.s.trolleyX ?? c.at.x) - Number(c.s.restX ?? c.at.x) + N(p, 'wheel');
    R(x, wx - 7, 0, 2, 12, '#b5352a'); R(x, wx + 5, 0, 2, 12, '#b5352a'); R(x, wx - 7, 10, 14, 3, '#d0453a'); R(x, wx - 7, 12, 14, 1, 'rgba(255,200,170,.6)');
    R(x, wx - 2, 6, 4, 4, '#e8c03a'); R(x, wx + 7, 2, 5, 6, '#2a2a2a'); R(x, wx + 8, 6, 3, 1, '#c9ced2');
  },
});

// ---------------------------------------------------------------- checkout: tag reader and turnstile, wage slip printer, shift board

const reader = kit({
  type: 'reader', label: 'Checkout: tag reader, turnstile and shelter (harbor shift)', visual: { checked: bool('Tag returned') },
  fields: { before: str('Screen before', 'SCAN TAG'), after: str('Screen after', 'VERIFIED'), shelter: bool('Shelter roof', true), roof: num('Shelter height', 88, 60, 200, 1, 'units'),
    reach: num('Shelter reach past the reader (away from the turnstile)', 70, 20, 300, 1, 'units'), turnstile: bool('Turnstile', true),
    side: select('Turnstile on the', ['left', 'right'], 'left') },
  box: p => p.side === 'right' ? { x: -N(p, 'reach') - 4, w: 66 + N(p, 'reach') + 4, tall: N(p, 'roof') + 8 } : { x: -66, w: 66 + N(p, 'reach') + 4, tall: N(p, 'roof') + 8 },
  anchors: p => ({ roof: { x: 0, h: N(p, 'roof') + 2, role: 'surface' } }),
  paint(x, p, c) {
    const done = c.s.checked === true, on = c.on, sig = done ? '34,197,94' : '255,42,68', H = N(p, 'roof'), reach = N(p, 'reach');
    // the turnstile and shelter are drawn for a turnstile on the left; on the right they are mirrored, the reader's screen is not
    const m = p.side === 'right' ? -1 : 1, Rm = (l: number, b: number, w: number, h: number, col: string) => R(x, m > 0 ? l : -l - w, b, w, h, col);
    if (p.shelter !== false) {
      for (const px of [-64, reach - 4]) { Rm(px, 0, 4, H, '#3a424b'); Rm(px, 0, 1, H, 'rgba(255,220,180,.22)'); Rm(px - 2, 0, 8, 2, '#1d2125'); }
      Rm(-68, H - 2, reach + 72, 6, '#2b3239'); Rm(-68, H + 3, reach + 72, 1, 'rgba(255,220,180,.3)'); Rm(-68, H - 1, reach + 72, 2, 'rgba(216,160,58,.6)');
      for (const lx of [-34, reach / 2]) { Rm(lx - 8, H - 5, 16, 3, '#16191c'); Rm(lx - 7, H - 5, 14, 1, ca('255,236,200', 0.55 + 0.45 * on)); c.light(lx * m, H - 8, { r: 46, col: '255,232,196', a: 0.45 }); }
    }
    if (p.turnstile !== false) {
      // a full-height turnstile: the cage, the rotor with its arms, the red/green signal on its post
      Rm(-56, 0, 3, 66, '#59636c'); Rm(-22, 0, 3, 66, '#59636c'); Rm(-56, 64, 37, 3, '#59636c'); Rm(-56, 66, 37, 1, 'rgba(255,255,255,.25)');
      Rm(-40, 0, 3, 64, '#8a9298');
      for (let h = 8; h < 62; h += 7) { Rm(-52, h, 12, 2, (h / 7) % 2 ? '#a8b0b6' : '#6d757b'); Rm(-37, h + 3, 14, 2, '#6d757b'); }
      Rm(-62, 44, 8, 16, '#141719'); Rm(-60, 53, 4, 4, ca('255,42,68', done ? 0.2 : 0.95)); Rm(-60, 47, 4, 4, ca('34,197,94', done ? 0.95 : 0.2));
      c.light(-58 * m, 52, { kind: 'neon', r: 16, col: sig, a: 0.7 });
    }
    // the reader on its pedestal: screen, tag slot; the screen is the cyan of a thing you can use
    R(x, -3, 0, 6, 36, '#4a5157'); R(x, -3, 0, 1, 36, 'rgba(255,255,255,.2)'); R(x, -8, 0, 16, 2, '#1d2125');
    R(x, -22, 34, 44, 18, '#1b1f22'); R(x, -22, 51, 44, 1, 'rgba(255,220,180,.3)');
    R(x, -20, 37, 40, 12, done ? '#0f2416' : '#0f1d22');
    T(x, done ? S(p, 'after') : S(p, 'before'), 0, 43, done ? ca('120,230,150', 0.95) : ca('120,225,235', 0.9), 7, '700');
    R(x, -8, 35, 16, 1, 'rgba(0,0,0,.8)');
    c.light(0, 43, { kind: 'screen', r: 26, col: done ? '34,197,94' : '0,200,220', a: 0.6 });
  },
});

const printer = kit({
  type: 'printer', label: 'Wage-slip printer (harbor shift)', visual: { checked: bool('Statement printed') },
  fields: { slip: str('Slip', 'NET 3') },
  box: () => ({ x: -16, w: 32, tall: 46 }),
  paint(x, p, c) {
    const done = c.s.checked === true;
    R(x, -2, 0, 4, 30, '#4a5157'); R(x, -6, 0, 12, 2, '#1d2125');
    R(x, -12, 30, 24, 14, '#2b3036'); R(x, -12, 43, 24, 1, 'rgba(255,220,180,.3)'); R(x, -8, 31, 16, 2, '#0a0b0c');
    R(x, 7, 38, 3, 2, done ? ca('34,197,94', 0.95) : ca('255,170,60', Math.floor(c.t / 40) % 2 ? 0.8 : 0.3));
    if (done) {
      R(x, -13, 8, 26, 24, '#e6dcc0'); R(x, -13, 8, 26, 1, 'rgba(0,0,0,.25)'); R(x, 12, 8, 1, 24, 'rgba(0,0,0,.2)');
      for (let k = 0; k < 3; k++) R(x, -10, 27 - k * 3, 12 + (k * 5) % 9, 1, 'rgba(60,52,40,.6)');
      T(x, S(p, 'slip'), 0, 13, '#2a241c', 7, '700');
    }
  },
});

const board = kit({
  type: 'board', label: 'Shift status board (harbor shift)', visual: { done: bool('Shift complete') },
  fields: { before: str('Before', 'SHIFT OPEN'), after: str('After', 'SHIFT COMPLETE'), width: num('Width', 96, 20, 400, 1, 'units'), height: num('Height (bottom of the board)', 86, 0, 400, 1, 'units'), legs: num('Legs (0: on its own pole)', 6, 0, 60, 1, 'units') },
  box: p => ({ x: -N(p, 'width') / 2 - 2, w: N(p, 'width') + 4, tall: N(p, 'height') + 16 }),
  paint(x, p, c) {
    const W = N(p, 'width'), b = N(p, 'height'), done = c.s.done === true, col = done ? '120,230,150' : '255,186,90', legs = N(p, 'legs');
    if (legs > 0) for (const lx of [-W / 2 + 8, W / 2 - 10]) R(x, lx, b - legs, 2, legs, '#2b3239');
    else R(x, -2, 0, 4, b, '#3a424b');
    R(x, -W / 2, b, W, 14, '#101214'); R(x, -W / 2, b + 13, W, 1, 'rgba(255,220,180,.3)');
    x.fillStyle = 'rgba(0,0,0,.4)'; for (let i = -W / 2 + 2; i < W / 2 - 2; i += 2) x.fillRect(Math.round(i), -(b + 12), 1, 10);
    T(x, done ? S(p, 'after') : S(p, 'before'), 0, b + 7, ca(col, 0.95), 7, '700');
    c.light(0, b + 7, { kind: 'screen', r: 30, col: done ? '34,197,94' : '255,170,60', a: 0.5 });
  },
});

// ---------------------------------------------------------------- signs, lockers, floor markings, the ends of the bay

const sign = kit({
  type: 'sign', label: 'Station sign: stencilled plate with an amber band (harbor shift)',
  fields: { text: str('Text', 'DISPATCH'), sub: str('Second line', ''), code: str('Code tag', ''), height: num('Height (centre)', 84, 0, 400, 1, 'units'),
    mount: select('Mount', ['wall', 'chains', 'post'], 'wall'), to: num('Chains up to (height)', 122, 0, 600, 1, 'units'), lamp: bool('Lamp over it', true), width: num('Width (0: fit)', 0, 0, 400, 1, 'units') },
  box: p => { const w = N(p, 'width') || Math.max(S(p, 'text').length * 5.2 + 18, S(p, 'sub').length * 4.6 + 14) + (S(p, 'code') ? 18 : 0); return { x: -w / 2, w, tall: Math.max(N(p, 'height') + 14, N(p, 'to')) }; },
  anchors: p => ({ plate: { x: 0, h: N(p, 'height'), role: 'mount' } }),
  paint(x, p, c) {
    const text = S(p, 'text'), sub = S(p, 'sub'), code = S(p, 'code'), cw = code ? 18 : 0;
    const w = Math.round(N(p, 'width') || Math.max(text.length * 5.2 + 18, sub.length * 4.6 + 14) + cw), h = sub ? 22 : 14, mid = N(p, 'height'), b = Math.round(mid - h / 2), l = Math.round(-w / 2), on = c.on;
    if (p.mount === 'post') { R(x, -2, 0, 4, b, '#3a424b'); R(x, -2, 0, 1, b, 'rgba(255,220,180,.22)'); R(x, -5, 0, 10, 2, '#1d2125'); }
    if (p.mount === 'chains') { x.strokeStyle = 'rgba(150,150,150,.55)'; x.setLineDash([1, 1]); x.beginPath(); for (const cx of [l + 5, l + w - 5]) { x.moveTo(cx + 0.5, -(b + h)); x.lineTo(cx + 0.5, -N(p, 'to')); } x.stroke(); x.setLineDash([]); }
    if (p.lamp !== false) {
      const lh = b + h + 7, g = x.createLinearGradient(0, -lh, 0, -b);
      g.addColorStop(0, ca('255,236,200', 0.22 * on)); g.addColorStop(1, ca('255,236,200', 0));
      x.fillStyle = g; x.beginPath(); x.moveTo(-5, -lh); x.lineTo(5, -lh); x.lineTo(w / 2 + 4, -b); x.lineTo(-w / 2 - 4, -b); x.closePath(); x.fill();
      R(x, -7, lh, 14, 3, '#16191c'); R(x, -6, lh, 12, 1, ca('255,236,200', 0.6 + 0.4 * on)); R(x, -1, lh + 3, 2, 4, '#16191c');
      c.light(0, lh - 2, { r: 30, col: '255,226,180', a: 0.5 });
    }
    R(x, l - 1, b - 1, w + 2, h + 2, '#0d0f11'); R(x, l, b, w, h, '#252b31'); R(x, l, b + h - 3, w, 3, AMBER);
    T(x, text, cw / 2, b + (sub ? h - 9 : h / 2 - 1), 'rgba(' + INK + ',.95)', 7, '700');
    if (sub) T(x, sub, cw / 2, b + 5, 'rgba(' + INK + ',.6)', 7, '600');
    if (code) { R(x, l + 2, b + 2, cw - 2, h - 7, AMBER); T(x, code, l + 1 + cw / 2, b + (h - 5) / 2 + 1, '#16130f', 7, '700'); }
    if (p.mount === 'wall') for (const [bx, bh] of [[l + 1, b + 1], [l + w - 2, b + 1], [l + 1, b + h - 2], [l + w - 2, b + h - 2]]) R(x, bx, bh, 1, 1, 'rgba(255,217,165,.5)');
  },
});

const lockers = kit({
  type: 'lockers', label: 'Staff lockers and bench (harbor shift)',
  fields: { count: num('Lockers', 5, 1, 30), width: num('Locker width', 15, 8, 40, 1, 'units'), height: num('Height', 60, 30, 120, 1, 'units'),
    color: colour('Paint', '#3d5566'), open: num('Door left open (-1 none)', 3, -1, 30), bench: bool('Bench in front', true), seed: num('Seed', 2, 0, 1000000) },
  box: p => ({ x: 0, w: N(p, 'count') * N(p, 'width') + 4, tall: N(p, 'height') + 12 }),
  paint(x, p) {
    const n = N(p, 'count'), w = N(p, 'width'), H = N(p, 'height'), col = S(p, 'color'), r = rng(N(p, 'seed') * 19 + 4);
    R(x, 0, 0, n * w + 2, H + 2, '#15191c');
    for (let i = 0; i < n; i++) {
      const l = 1 + i * w;
      if (i === N(p, 'open')) {
        R(x, l + 1, 2, w - 2, H - 2, '#0c0e10'); R(x, l + 3, H - 18, w - 6, 12, '#5a3b26'); R(x, l + 4, H - 10, w - 8, 4, '#d8a03a');
        x.fillStyle = shade(col, 0.8); x.beginPath(); x.moveTo(l + w - 1, -2); x.lineTo(l + w + 6, -6); x.lineTo(l + w + 6, -(H - 4)); x.lineTo(l + w - 1, -H); x.closePath(); x.fill();
        continue;
      }
      R(x, l + 1, 2, w - 2, H - 2, i % 2 ? col : shade(col, 1.08)); R(x, l + 1, H - 1, w - 2, 1, 'rgba(255,240,215,.25)');
      for (let k = 0; k < 3; k++) R(x, l + 3, H - 6 - k * 3, w - 6, 1, 'rgba(0,0,0,.45)');
      R(x, l + 3, H - 18, w - 6, 3, 'rgba(230,222,200,.55)');
      R(x, l + w - 5, H / 2 - 4, 2, 7, '#c9ced2');
      if (r() < 0.3) R(x, l + 3, H / 2 + 6, 5, 4, r() < 0.5 ? 'rgba(220,70,60,.6)' : 'rgba(90,150,200,.6)');
    }
    R(x, 2, H + 2, 8, 6, '#c8a24a'); R(x, 12, H + 2, 10, 5, '#3d4a55');
    if (p.bench !== false) { R(x, 4, 10, n * w - 6, 3, '#6b5a44'); R(x, 4, 12, n * w - 6, 1, 'rgba(255,230,200,.3)'); for (const bx of [8, n * w - 10]) R(x, bx, 0, 2, 10, '#2a2e33'); }
  },
});

const trolleyPark = kit({
  type: 'trolley-park', label: 'Trolley parking spots on the floor (harbor shift)',
  fields: { spots: num('Spots', 3, 1, 20), pitch: num('Spot width', 64, 20, 300, 1, 'units'), first: num('First spot number', 3, 0, 999), prefix: str('Prefix', 'T') },
  box: p => ({ x: 0, w: N(p, 'spots') * N(p, 'pitch'), tall: 6 }),
  paint(x, p) {
    const n = N(p, 'spots'), P = N(p, 'pitch');
    for (let i = 0; i <= n; i++) R(x, i * P, -12, 2, 12, 'rgba(230,226,214,.45)');
    R(x, 0, -12, n * P + 2, 1, 'rgba(230,226,214,.35)');
    for (let i = 0; i < n; i++) T(x, S(p, 'prefix') + (N(p, 'first') + i), i * P + P / 2, -7, 'rgba(230,226,214,.5)', 7, '700');
  },
});

const bay = kit({
  type: 'bay', label: 'Marked loading position with its post (harbor shift)',
  fields: { width: num('Width', 76, 20, 400, 1, 'units'), label: str('Post sign', 'LOADING BAY 2'), stencil: str('On the floor', 'BAY 2'), post: num('Post offset', 50, -400, 400, 1, 'units'), beacon: bool('Amber beacon', true) },
  box: p => ({ x: -N(p, 'width') / 2 - 4 + Math.min(0, N(p, 'post')), w: N(p, 'width') + 8 + Math.abs(N(p, 'post')), tall: 90 }),
  paint(x, p, c) {
    const W = N(p, 'width'), l = -W / 2, on = c.on;
    // the hatched box on the floor in front of the wall, and the wheel stop
    x.save(); x.beginPath(); x.rect(l, 0, W, 14); x.clip();
    x.fillStyle = 'rgba(216,160,58,.55)'; for (let i = -14; i < W; i += 8) { x.beginPath(); x.moveTo(l + i, 14); x.lineTo(l + i + 4, 14); x.lineTo(l + i + 18, 0); x.lineTo(l + i + 14, 0); x.closePath(); x.fill(); }
    x.restore();
    x.strokeStyle = 'rgba(216,160,58,.9)'; x.lineWidth = 2; x.strokeRect(l + 1, 1, W - 2, 12); x.lineWidth = 1;
    if (S(p, 'stencil')) { R(x, -18, -12, 36, 9, 'rgba(20,18,16,.85)'); T(x, S(p, 'stencil'), 0, -7.5, 'rgba(240,200,110,.95)', 7, '700'); }
    R(x, l + W - 8, 0, 6, 4, '#d8a03a'); R(x, l + W - 8, 3, 6, 1, 'rgba(255,240,200,.6)');
    // the post: sign and beacon
    const px = N(p, 'post');
    R(x, px - 2, 0, 4, 66, '#3a424b'); R(x, px - 2, 0, 1, 66, 'rgba(255,220,180,.22)');
    for (let k = 0; k < 3; k++) R(x, px - 2, 2 + k * 6, 4, 6, k % 2 ? '#16130f' : AMBER);
    if (S(p, 'label')) { const sw = Math.round(S(p, 'label').length * 4.6 + 12); R(x, px - sw / 2, 52, sw, 12, '#252b31'); R(x, px - sw / 2, 52, sw, 2, AMBER); T(x, S(p, 'label'), px, 58.5, 'rgba(' + INK + ',.92)', 7, '700'); }
    if (p.beacon !== false) {
      const turn = (Math.sin(c.t * 0.12) + 1) / 2;
      R(x, px - 3, 66, 6, 5, '#141617'); R(x, px - 2, 67, 4, 4, ca('255,170,40', 0.35 + 0.6 * turn));
      c.light(px, 69, { kind: 'neon', r: 22, col: '255,170,40', a: 0.4 + 0.5 * turn * on });
    }
  },
});

const end = kit({
  type: 'end', label: 'End of the work bay: bollards, gate or fence (harbor shift)',
  fields: { style: select('Kind', ['bollards', 'gate', 'fence'], 'bollards'), side: select('Fence runs to the', ['right', 'left'], 'right'), width: num('Fence length', 120, 10, 2000, 1, 'units'), label: str('Gate sign', 'STAFF EXIT · TAGS RETURNED ONLY') },
  box: p => p.style === 'bollards' ? { x: -6, w: 40, tall: 30 } : p.side === 'left' ? { x: -N(p, 'width') - 10, w: N(p, 'width') + 70, tall: 80 } : { x: -60, w: N(p, 'width') + 70, tall: 80 },
  paint(x, p, c) {
    const style = S(p, 'style');
    if (p.side === 'left' && style !== 'bollards') x.scale(-1, 1);
    const bollard = (bx: number) => { R(x, bx - 3, 0, 7, 24, '#e0b03a'); for (let k = 0; k < 2; k++) R(x, bx - 3, 6 + k * 8, 7, 4, '#16130f'); R(x, bx - 3, 23, 7, 1, 'rgba(255,240,200,.5)'); };
    if (style === 'bollards') {
      bollard(0); bollard(28);
      x.strokeStyle = 'rgba(200,60,40,.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(3, -20); x.quadraticCurveTo(14, -12, 25, -20); x.stroke(); x.lineWidth = 1;
      return;
    }
    // chain-link fence on posts to the right; the gate post with a lowered boom
    const W = N(p, 'width');
    x.save(); x.beginPath(); x.rect(4, -64, W, 64); x.clip();
    x.strokeStyle = 'rgba(160,165,170,.28)';
    x.beginPath(); for (let i = -64; i < W; i += 6) { x.moveTo(4 + i, 0); x.lineTo(4 + i + 64, -64); x.moveTo(4 + i + 64, 0); x.lineTo(4 + i, -64); } x.stroke();
    x.restore();
    for (let fx = 4; fx <= W + 4; fx += 40) { R(x, fx - 1, 0, 3, 66, '#4a5157'); }
    R(x, 4, 63, W, 2, '#4a5157');
    x.strokeStyle = 'rgba(170,170,170,.5)'; x.beginPath(); for (let k = 0; k < 2; k++) { for (let i = 4; i < W; i += 5) { x.moveTo(i, -(68 + k * 3)); x.lineTo(i + 3, -(70 + k * 3)); } } x.stroke();
    if (style === 'gate') {
      R(x, -6, 0, 10, 40, '#3a424b'); R(x, -6, 38, 10, 4, '#e0b03a');
      for (let i = 0; i < 6; i++) R(x, -56 + i * 9, 32, 9, 4, i % 2 ? '#e8e2d2' : '#c23a30');
      R(x, -2, 42, 4, 3, ca('255,42,68', Math.floor(c.t / 30) % 2 ? 0.9 : 0.3));
      if (S(p, 'label')) {
        // the gate sign on the fence beside the post; a fence running left mirrors the fence, never the sign's letters
        const sw = Math.round(Math.min(W, S(p, 'label').length * 4.6 + 12));
        if (p.side === 'left') x.scale(-1, 1);
        const sl = p.side === 'left' ? -16 - sw : 16;
        R(x, sl, 38, sw, 12, '#d9cfb5'); R(x, sl, 47, sw, 3, '#b8332b'); T(x, S(p, 'label'), sl + sw / 2, 42.5, '#2a241c', 7, '700');
      }
    }
  },
});

// ---------------------------------------------------------------- the work bay's floor: wet concrete

const floor = band({
  type: 'floor', label: 'Wet concrete floor with puddles (harbor shift)',
  fields: {
    width: num('Scene width', 1180, 100, 20000, 1, 'units'), concrete: colour('Concrete', '#26241f'), joint: num('Slab joints every', 96, 20, 1000, 1, 'units'),
    walkway: bool('Walkway line', true),
    puddles: listOf('Puddles', { x: num('X', 200, -10000, 20000), width: num('Width', 60, 8, 600), depth: num('Depth into the floor', 10, 2, 40) }, 'Add puddle',
      [{ x: 120, width: 70, depth: 12 }, { x: 470, width: 90, depth: 9 }, { x: 690, width: 60, depth: 14 }, { x: 960, width: 110, depth: 10 }]),
    glints: listOf('Lights the puddles reflect', { x: num('X', 200, -10000, 20000), color: rgbField('Colour (r,g,b)', SODIUM) }, 'Add light',
      [{ x: 160, color: '255,214,160' }, { x: 200, color: '255,232,196' }, { x: 470, color: '255,232,196' }, { x: 580, color: '255,214,160' }, { x: 960, color: SODIUM }, { x: 880, color: '255,170,40' }]),
  },
  tall: () => 0,
  paint(x, v, p, at) {
    const gy = Math.round(v.y(at.h)), L = v.lighting, on = L ? glowLevel(L) : 1, sky = L ? skyCols(L)[1] : [20, 14, 30];
    x.fillStyle = S(p, 'concrete'); x.fillRect(0, gy, v.viewW, v.viewH - gy);
    const g = x.createLinearGradient(0, gy, 0, v.viewH); g.addColorStop(0, 'rgba(255,230,200,.05)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = g; x.fillRect(0, gy, v.viewW, v.viewH - gy);
    x.fillStyle = 'rgba(255,217,165,.14)'; x.fillRect(0, gy, v.viewW, 1);
    const J = N(p, 'joint');
    for (let wx = Math.floor(v.cam / J) * J; wx < v.cam + v.viewW + J; wx += J) { const sx = Math.round(v.sx(wx)); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(sx, gy + 1, 1, v.viewH - gy); }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, gy + 26, v.viewW, 1);
    for (let wx = Math.floor(v.cam / 37) * 37; wx < v.cam + v.viewW + 37; wx += 37) { const q = hash(wx * 0.31); if (q > 0.35) continue; x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(Math.round(v.sx(wx)), gy + 4 + Math.round(q * 40), 10 + Math.round(q * 30), 2); }
    if (p.walkway !== false) { x.fillStyle = 'rgba(216,160,58,.45)'; for (let wx = Math.floor(v.cam / 30) * 30; wx < v.cam + v.viewW + 30; wx += 30) x.fillRect(Math.round(v.sx(wx)), gy + 20, 18, 2); }
    // puddles: the sky's colour, and the lamps above standing in them
    const lights = rowsOf(p.glints);
    for (const pd of rowsOf(p.puddles)) {
      const cx = v.sx(N(pd, 'x')), w = N(pd, 'width'), d = N(pd, 'depth'), top = gy + 3 + Math.round(d * 0.4), hgt = Math.max(3, Math.round(d * 0.8));
      if (cx + w < 0 || cx - w > v.viewW) continue;
      x.save(); x.beginPath(); x.ellipse(Math.round(cx), top + hgt / 2, w / 2, hgt / 2 + 1, 0, 0, Math.PI * 2); x.clip();
      x.fillStyle = '#121315'; x.fillRect(cx - w / 2, top - 2, w, hgt + 4);
      x.fillStyle = css(sky, 0.35); x.fillRect(cx - w / 2, top - 2, w, hgt + 4);
      for (const li of lights) {
        const lx = v.sx(N(li, 'x'));
        if (lx < cx - w / 2 - 6 || lx > cx + w / 2 + 6) continue;
        for (let i = 0; i < 4; i++) { const wob = Math.round(Math.sin(v.t * 0.06 + i * 1.7 + lx) * 1.5); x.fillStyle = ca(S(li, 'color') || SODIUM, (0.18 + 0.35 * on) * (1 - i / 4)); x.fillRect(Math.round(lx) - 3 + wob, top + i * 2, 6, 1); }
      }
      x.restore();
      x.fillStyle = 'rgba(255,240,220,.12)'; x.fillRect(Math.round(cx - w / 3), top - 1, Math.round(w * 0.5), 1);
    }
  },
});

export const shiftKitElements: Element[] = [farShore, ship, crane, quay, stackBlock, reeferRack, mast, fogBank, shed, booth, counter, hatch, rack, parcel, caseEl, trolley, release, clampEl, reader, printer, board, sign, lockers, trolleyPark, bay, end, floor];
