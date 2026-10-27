/**
 * The building kit's registered elements (Library › Artwork): `building.front` (a street front at the
 * player's scale), `building.row` (a row of buildings at a distance, with parallax) and
 * `building.attachment` (one retrofit piece to hang on any anchor). Anchors on a front (roof, ground,
 * fascia, storey1.., bay0..) let signs, devices, entrances or a custom balcony attach without the kit
 * knowing about them; `frontMasks` (masks.ts) hides the windows behind what is attached.
 */
import type { AssetDefinition, Field, Placement, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { addLight } from '../atmosphere/lighting';
import { adScreen } from '../signage/screens';
import { PACKS } from '../assemblies/construction';
import { rng } from '../core/primitives';
import { BAY_KINDS, FRONT_DEFAULTS, type FrontBayKind, GEAR, ROOFS, SIDES, SKINS, WINDOW_KINDS, frontAnchors, paintFront, shapeOf, wallTop, type FrontSpec, type Rect, type BaySpec } from './front';
import { ROW_SKINS, paintRow, rowLook, type RowSpec } from './row';
import * as P from './parts';
import { TENANT_IDS } from './tenants';
import { paintState, stateFields, vacant } from './state';
import { ROW_FORMS, paintFormRow } from './types';
import { alleyElement } from './alley';

const num = (label: string, value: number, min: number, max: number, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
const select = (label: string, options: readonly string[], value = options[0]): Field => ({ kind: 'select', label, options: [...options], default: value });
const isRect = (v: unknown) => Array.isArray(v) && v.length === 4 && v.every(n => typeof n === 'number' && Number.isFinite(n));
const rects = (label: string): Field => ({ kind: 'json', label, default: [], validate: v => { if (!Array.isArray(v) || !v.every(isRect)) throw new Error(label + ': expected [[left,right,bottom,top], …]'); } });

const BAY_LABELS: Record<string, string> = { door: 'door', glass: 'shop window', shutter: 'shutter', tagged: 'tagged shutter', sealed: 'sealed' };
const bayItem: Record<string, Field> = {
  kind: { kind: 'select', label: 'Bay', options: [...BAY_KINDS], default: 'door' },
  from: num('From the left', 8, 0, 2000, 1, 'units'), width: num('Width', 24, 4, 600, 1, 'units'),
  tenant: { kind: 'select', label: 'Tenant (shop windows)', options: ['auto', ...TENANT_IDS], default: 'auto' },
  sign: { kind: 'string', label: 'Fascia name (empty: the tenant’s, - for none)', default: '' },
};
/** Ground-floor bays as stored: "auto", or bays from the left (kind, from, width). */
const validBays = (v: Value) => {
  if (v === 'auto') return;
  if (!Array.isArray(v) || !v.every(b => !!b && typeof b === 'object' && !Array.isArray(b) && (BAY_KINDS as readonly string[]).includes((b as Properties).kind as string)
    && Number.isFinite((b as Properties).from) && Number((b as Properties).width) > 0
    && ((b as Properties).tenant === undefined || (b as Properties).tenant === 'auto' || TENANT_IDS.includes((b as Properties).tenant as string))
    && ((b as Properties).sign === undefined || typeof (b as Properties).sign === 'string'))) throw new Error('Ground floor: expected "auto" or bays of ' + Object.values(BAY_LABELS).join(', ') + ' with a position and width');
};

const frontFields: Record<string, Field> = {
  width: num('Width', 150, 20, 2000, 1, 'units'),
  floors: num('Floors above the ground floor', 4, 0, 40),
  storey: num('Floor height', 66, 20, 200, 1, 'units'), ground: num('Ground floor height', 76, 0, 400, 1, 'units'),
  top: num('Wall above the top floor', 0, 0, 400, 1, 'units'),
  skin: select('Skin', ['auto', ...SKINS]), windows: select('Windows', ['auto', ...WINDOW_KINDS]),
  columns: num('Windows per floor (0 auto)', 0, 0, 40),
  fascia: { kind: 'boolean', label: 'Shop fascia over the ground floor', default: true },
  bays: { kind: 'json', label: 'Ground floor (doors, shop windows, shutters)', default: 'auto', validate: validBays,
    editor: { kind: 'list', item: bayItem, auto: 'Seeded layout', addLabel: 'Add bay',
      next: rows => { const last = rows[rows.length - 1]; return { kind: 'door', from: last ? Number(last.from) + Number(last.width) + 12 : 8, width: 24 }; } } },
  roof: select('Roof', ['auto', ...ROOFS]),
  gear: { kind: 'json', label: 'Roof gear', default: 'auto', validate: v => {
    if (v === 'auto') return;
    if (!Array.isArray(v) || !v.every(g => (GEAR as readonly string[]).includes(g as string))) throw new Error('Roof gear: expected "auto" or a list of ' + GEAR.join(', '));
  }, editor: { kind: 'set', options: GEAR, auto: 'Seeded gear' } },
  escape: select('Fire escape', SIDES), balconies: select('Balconies', ['auto', 'none', 'some']),
  density: num('Retrofit density (AC, pipes, cables, screens)', 0.5, 0, 1, 0.05),
  lit: num('Rooms with a light', 0.45, 0, 1, 0.05),
  seed: num('Seed', 1, 0, 1000000000),
  clear: rects('Keep clear of windows'),
  ...stateFields,
  jamb: num('Wall edge the player passes behind (a walk-in building: its shell front)', 0, 0, 200, 1, 'units'),
  trim: { kind: 'color', label: 'Trim colour (rims, courses, mullions)', default: '#c2410c' },
  rooms: select('Room light behind glass', ['warm', 'cold']),
  wall: { kind: 'json', label: 'Wall colour', default: '', editor: { kind: 'colour', empty: 'The skin’s own' },
    validate: v => { if (v !== '' && !(typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))) throw new Error('Wall colour: expected a #rrggbb colour or empty'); } },
};
const rgbOf = (hex: unknown) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex)); return m ? m.slice(1).map(h => parseInt(h, 16)).join(',') : FRONT_DEFAULTS.trim; };
/** The element's stored props as a front spec. */
export function frontSpec(p: Properties): FrontSpec {
  return {
    w: Number(p.width), h: Number(p.ground) + Number(p.floors) * Number(p.storey) + Number(p.top), storey: Number(p.storey), ground: Number(p.ground), skin: p.skin as FrontSpec['skin'], windows: p.windows as FrontSpec['windows'],
    columns: Number(p.columns), bays: p.bays === 'auto' ? 'auto' : (p.bays as Properties[]).map(b => [Number(b.from), Number(b.width), b.kind as FrontBayKind, b.tenant as string | undefined, b.sign as string | undefined]), roof: p.roof as FrontSpec['roof'], gear: p.gear as FrontSpec['gear'], escape: p.escape as FrontSpec['escape'],
    balconies: p.balconies as FrontSpec['balconies'], fascia: p.fascia !== false, density: Number(p.density), lit: Number(p.lit), seed: Number(p.seed), clear: (p.clear ?? []) as Rect[],
    trim: rgbOf(p.trim ?? '#c2410c'), wall: typeof p.wall === 'string' ? p.wall : '', rooms: p.rooms === 'cold' ? 'cold' : 'warm',
  };
}
/** A view whose coordinates are a piece's own frame (after translating to its foot), for shared screen kernels. */
const frameOf = (v: View): View => ({ ...v, sx: x => x, y: h => -h, cam: 0, gy: 0, viewW: 1e5, viewH: 1e5 });

/**
 * A walk-in building's wall edges (`jamb` units in from either side of its shell front): the player passes behind them
 * on the way in. While the player is in one (its `near` state, engine/level.ts `levelNear`), the front draws without
 * them and `drawNear` paints just them over the player. Clip rectangles in the front's own frame (x right, y = -h).
 */
const jambStrips = (ctx: CanvasRenderingContext2D, w: number, j: number) => { const reach = 1e5; ctx.rect(-4, -reach, j + 4, 2 * reach); ctx.rect(w - j, -reach, j + 4, 2 * reach); };
const jambOf = (p: Properties, s: Properties) => Number(s.near ?? 0) > 0 ? Math.max(0, Math.min(Number(p.width) / 2, Number(p.jamb ?? 0))) : 0;
/** The front, whole, without its wall edges (`part` back) or only them (near: no lights added, they are the whole front's). */
function drawFront(ctx: CanvasRenderingContext2D, v: View, p: Properties, s: Properties, at: Readonly<Required<Placement>>, part: 'whole' | 'back' | 'near') {
    const f = frontSpec(p), sx = v.sx(at.x), end = sx + f.w * at.scale * at.facing, j = part === 'whole' ? 0 : jambOf(p, s);
    if (Math.max(sx, end) + 40 < 0 || Math.min(sx, end) - 40 > v.viewW) return;
    if (part === 'near' && !j) return;
    const light = at.parallax === 1 && part !== 'near' ? (lx: number, lh: number, w: number, hh: number, col: string, kind: 'window' | 'screen') =>
      addLight(v, { x: at.x + lx * at.scale * at.facing, h: at.h + lh * at.scale, kind, w: w * at.scale, hh: hh * at.scale, r: kind === 'screen' ? 40 : 14, col, a: kind === 'screen' ? 0.45 : 0.6 }) : undefined;
    ctx.save(); ctx.translate(sx, v.y(at.h));
    if (j) { ctx.beginPath(); if (part === 'back') ctx.rect(-1e5, -1e5, 2e5, 2e5); jambStrips(ctx, f.w, j); ctx.clip(part === 'back' ? 'evenodd' : 'nonzero'); }
    const out = vacant(p), look = { t: v.t, lighting: v.lighting, view: frameOf(v), masks: (s.masks ?? []) as Rect[], ...(light ? { light } : {}) };
    try {
      paintFront(ctx, out ? { ...f, lit: 0, bays: f.bays === 'auto' ? 'auto' : f.bays.map(([bx, bw, k]) => [bx, bw, k === 'glass' ? 'sealed' : k] as BaySpec) } : f, look);
      if (out) paintState(ctx, p, f.w, f.h, f.ground, { t: v.t, lighting: v.lighting, view: v, ...(light ? { light } : {}) }, f.seed);
    }
    finally { ctx.restore(); }
}

export const buildingFrontElement: AssetDefinition = {
  type: 'building.front', version: 1, label: 'Building front (kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: frontFields, visualFields: { masks: rects('Windows hidden behind attached signs (resolved)'), near: num('The player passes behind its wall edges (level)', 0, 0, 1, 1) },
  bounds: p => { const f = frontSpec(p), top = wallTop(f) + (shapeOf(f).gear.length ? 30 : 0); return { x: -2, h: top, w: f.w + 4, tall: top }; },
  anchors: p => frontAnchors(frontSpec(p)),
  draw(ctx, v, p, s, _pass, at) { drawFront(ctx, v, p, s, at, jambOf(p, s) ? 'back' : 'whole'); },
  drawNear(ctx, v, p, s, at) { drawFront(ctx, v, p, s, at, 'near'); },
};

const rowFields: Record<string, Field> = {
  width: num('Row length', 2400, 50, 40000, 10, 'units'), seed: num('Seed', 7, 0, 1000000000), parallax: num('Parallax', 0.45, 0, 2, 0.01),
  storey: num('Storey height (detail scale)', 14, 4, 90, 1, 'units'), minHeight: num('Lowest building', 120, 10, 3000, 1, 'units'), maxHeight: num('Tallest building', 300, 10, 4000, 1, 'units'),
  minWidth: num('Narrowest building', 40, 6, 1000, 1, 'units'), maxWidth: num('Widest building', 90, 6, 2000, 1, 'units'), gap: num('Gap between buildings', 8, 0, 200, 1, 'units'),
  low: num('Low walk-ups (share)', 0.3, 0, 1, 0.05), skin: select('Skins', ROW_SKINS), lit: num('Lit windows', 0.25, 0, 1, 0.05),
  haze: num('Haze (distance)', 0.35, 0, 1, 0.05), signs: num('Signs per building (at most)', 0, 0, 4),
  form: select('Building forms (district)', ROW_FORMS),
};
export const rowSpec = (p: Properties): RowSpec => ({ width: Number(p.width), seed: Number(p.seed), storey: Number(p.storey), minHeight: Number(p.minHeight), maxHeight: Math.max(Number(p.minHeight), Number(p.maxHeight)),
  minWidth: Number(p.minWidth), maxWidth: Math.max(Number(p.minWidth), Number(p.maxWidth)), gap: Number(p.gap), low: Number(p.low), skin: p.skin as RowSpec['skin'], lit: Number(p.lit), haze: Number(p.haze), signs: Number(p.signs) });

export const buildingRowElement: AssetDefinition = {
  type: 'building.row', version: 1, label: 'Building row (kit, distance)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'], fields: rowFields,
  bounds: (p, _s, c) => {
    const par = Number(p.parallax), at = c?.placement, shift = at && c ? c.view.cam * (at.parallax - par) / (at.scale * at.facing) : 0, tall = Number(p.maxHeight) + 40;
    return { x: shift, h: tall, w: Number(p.width), tall };
  },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  draw(ctx, v, p, _s, _pass, at) {
    const s = rowSpec(p), par = Number(p.parallax);
    if (p.form && p.form !== 'towers') { paintFormRow(ctx, String(p.form), s, v.t, v.lighting, dx => v.sx(at.x + dx, par), v.y(at.h), v.viewW); return; }
    paintRow(ctx, s, rowLook(s, v.t, v.lighting), dx => v.sx(at.x + dx, par), v.y(at.h), v.viewW);
  },
};

export const ATTACHMENTS = ['ac', 'pipe', 'escape', 'balcony', 'screen', 'scanner', 'conduit', 'planter', 'tank', 'vent', 'dish'] as const;
type Attachment = typeof ATTACHMENTS[number];
const attachmentBox = (k: Attachment, w: number, h: number) => k === 'ac' ? { x: -7, h: 18, w: 14, tall: 28 } : k === 'pipe' ? { x: -1, h, w: 5, tall: h }
  : k === 'escape' ? { x: 0, h: h + 10, w, tall: h + 44 } : k === 'balcony' ? { x: 0, h: 18, w: 46, tall: 20 } : k === 'screen' ? { x: -w / 2 - 4, h: h + 4, w: w + 8, tall: h + 8 }
  : k === 'scanner' ? { x: -3, h: 10, w: 7, tall: 16 } : k === 'conduit' ? { x: -2, h, w: w + 4, tall: h + 10 } : k === 'planter' ? { x: 0, h: 10, w, tall: 10 }
  : { x: -w / 2 - 2, h: w + 18, w: w + 4, tall: w + 18 };
export const buildingAttachmentElement: AssetDefinition = {
  type: 'building.attachment', libraryUse: 'reusable', version: 1, label: 'Building attachment (kit)', category: 'architecture', parts: ['backdrop'],
  fields: {
    kind: select('Piece', ATTACHMENTS), width: num('Width', 40, 2, 400, 1, 'units'), height: num('Height (pipe, escape, screen, riser)', 120, 2, 3000, 1, 'units'),
    storey: num('Storey height (fire escape)', 66, 20, 200, 1, 'units'), seed: num('Seed', 1, 0, 1000000000), color: { kind: 'color', label: 'Body colour (roof gear)', default: '#0e0806' },
    mask: { kind: 'json', label: 'Hide front windows [left,right,bottom,top]', default: [], validate: (v: Value) => { if (!Array.isArray(v) || ![0, 4].includes(v.length) || (v.length === 4 && !isRect(v))) throw new Error('Invalid attachment mask'); } },
  },
  bounds: p => attachmentBox(p.kind as Attachment, Number(p.width), Number(p.height)),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw(ctx, v, p) {
    const k = p.kind as Attachment, w = Number(p.width), h = Number(p.height), seed = Number(p.seed), y = (q: number) => -q, fill = String(p.color);
    if (k === 'ac') P.acUnit(ctx, y, 0, 0);
    else if (k === 'pipe') P.wallPipe(ctx, 0, y(h), 0);
    else if (k === 'escape') P.fireEscape(ctx, dx => dx, y, w, 0, Number(p.storey), y(h), w - 7);
    else if (k === 'balcony') { const r = rng(seed * 11 + 5); P.laundryBalcony(ctx, 0, -2, 1, Array.from({ length: 6 }, () => PACKS[Math.floor(r() * PACKS.length)]), seed); }
    else if (k === 'screen') adScreen(ctx, frameOf(v), { x: w / 2, h: 0, w, tall: h, mount: 'wall', seed, phase: seed * 13 });
    else if (k === 'scanner') P.doorScanner(ctx, 0, y(5), v.t, seed);
    else if (k === 'conduit') P.conduit(ctx, 0, w, 0, 3, 26, Math.round(w / 2), y(h), seed);
    else if (k === 'planter') P.planter(ctx, 0, 0, w, seed);
    else if (k === 'tank') P.roofTank(ctx, 0, 0, w, fill);
    else if (k === 'vent') P.roofVent(ctx, 0, 0, Math.max(6, Math.min(h, 40)), fill);
    else P.roofDish(ctx, 0, 0, Math.max(4, Math.round(w / 4)), 1, fill);
  },
};

export const buildingElements: AssetDefinition[] = [buildingFrontElement, buildingRowElement, buildingAttachmentElement, alleyElement];
export { FRONT_DEFAULTS };
