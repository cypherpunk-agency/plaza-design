/**
 * BEACH KIT: the beach's pieces as placeable artwork (they were the title glide's own placements of these sets):
 * `environment.palm` (palm.ts, its rim on the sun's side), `props.dj-booth`, `props.bonfire`, `props.lounger`
 * (beach-party.ts) and `beach.salt`, SALT the beach bar whole (beach-bar.ts: stilts, back shelves, LIME, the
 * shack, counter, stools, its lights and the string out over the dance floor to a pole).
 *
 * World units at the player's scale, the origin at the foot. A palm is drawn in the coast kit's pixels (its
 * height and lean in pixels, as palm.ts measures them).
 */
import type { AssetDefinition, Field, Properties } from '../core/composition';
import { inPixels, R, ART } from '../core/pixels';
import { drawPalm } from '../environment/palm';
import { sunsetSun } from '../environment/sunset-sky';
import { drawBonfire, drawDjBooth, drawLounger } from './beach-party';
import { readableMirror } from '../core/mirror';
import { drawStringLights, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from '../assemblies/beach-bar';

const num = (label: string, value: number, min = -1e6, max = 1e6, step = 1): Field => ({ kind: 'number', label, default: value, min, max, step });
const n = (p: Properties, k: string) => Number(p[k]);
const origin = () => ({ origin: { x: 0, h: 0, role: 'origin' as const } });
const DAWN = '255,150,90';

/** Draw a set in its own frame at the placement (world elements: the composition has already applied scale and facing about the anchor). */
function own(x: CanvasRenderingContext2D, sx: number, y: number, viewW: number, pad: number, draw: () => void) {
  if (sx < -pad || sx > viewW + pad) return;
  x.save(); x.translate(sx, y); try { draw(); } finally { x.restore(); }
}

export const palmElement: AssetDefinition = {
  type: 'environment.palm', version: 1, label: 'Palm silhouette, rim on the sun’s side (beach kit)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { height: num('Trunk height (pixels)', 100, 10, 1000), lean: num('Lean (pixels, + east)', 10, -400, 400), seed: num('Seed', 1, 0, 1e6), fill: { kind: 'color', label: 'Silhouette', default: '#0b0410' } },
  bounds: p => ({ x: -n(p, 'height') * 1.6, h: n(p, 'height') * 3.6, w: n(p, 'height') * 3.2, tall: n(p, 'height') * 3.6 }),
  anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const sx = P.ax, h = n(p, 'height');
      if (!P.onScreen(sx, sx, h * 0.8)) return;
      const sun = sunsetSun(v, v.lighting, 0).x / ART, seen = P.facing < 0 ? 2 * P.ax - sun : sun;
      P.x.save(); P.x.translate(R(sx), P.ay);
      try { drawPalm(P.x, { h, lean: n(p, 'lean'), seed: n(p, 'seed'), t: P.f, still: P.still, rim: DAWN, side: seen > sx ? 1 : -1, fill: String(p.fill) }); } finally { P.x.restore(); }
    });
  },
};

export const djBoothElement: AssetDefinition = {
  type: 'props.dj-booth', version: 1, label: 'DJ bot’s booth on the sand (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { beat: num('Beat (frames)', 16, 2, 240) },
  bounds: () => ({ x: -60, h: 120, w: 120, tall: 120 }), anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 120, () => drawDjBooth(x, { t: v.t, beat: n(p, 'beat') })); },
};
export const bonfireElement: AssetDefinition = {
  type: 'props.bonfire', version: 1, label: 'Bonfire: logs, flames, sparks, its light on the sand (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { size: num('Size', 1, 0.2, 4, 0.05) },
  bounds: p => ({ x: -60 * n(p, 'size'), h: 120 * n(p, 'size'), w: 120 * n(p, 'size'), tall: 120 * n(p, 'size') }), anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 180, () => drawBonfire(x, { t: v.t, size: n(p, 'size') })); },
};
export const loungerElement: AssetDefinition = {
  type: 'props.lounger', version: 1, label: 'Sun lounger and parasol (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { color: { kind: 'color', label: 'Canopy', default: '#c83a2a' }, wear: num('Paint in the light (0 gold .. 1 dusk)', 0.1, 0, 1, 0.05), parasol: { kind: 'boolean', label: 'Parasol', default: true }, flip: { kind: 'boolean', label: 'Flipped', default: false } },
  bounds: () => ({ x: -34, h: 62, w: 50, tall: 62 }), anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 60, () => drawLounger(x, { col: String(p.color), p: n(p, 'wear'), flip: p.flip === true, parasol: p.parasol !== false })); },
};

export const saltElement: AssetDefinition = {
  type: 'beach.salt', version: 1, label: 'SALT, the beach bar: stilts, shelves, LIME, shack, counter, stools, lights (beach kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Bar width', 226, 40, 2000), wear: num('Weathering', 0.05, 0, 1, 0.01), lime: { kind: 'boolean', label: 'LIME behind the counter', default: true },
    stools: { kind: 'json', label: 'Stools (x along the bar)', default: [40, 96, 170], validate: v => { if (!Array.isArray(v) || v.length > 20 || !v.every(q => typeof q === 'number' && Number.isFinite(q))) throw new Error('Stools: expected numbers'); } },
    legPaint: { kind: 'color', label: 'Stool legs', default: '#5a3a24' }, seatPaint: { kind: 'color', label: 'Stool seats', default: '#8a5a3a' },
    string: { kind: 'boolean', label: 'String lights out to a pole', default: true }, sag: num('String light sag', 12, 0, 100), phase: num('String light phase', 3),
  },
  bounds: p => ({ x: 0, h: 140, w: Math.max(n(p, 'width'), 570), tall: 140 }), anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    const sx = v.sx(at.x, at.parallax), w = n(p, 'width'), x = at.facing < 0 ? readableMirror(ctx) : ctx;
    if (sx > v.viewW + 720 || sx < -720) return;
    x.save(); x.translate(sx, v.y(at.h));
    try {
      saltUnder(x, w); saltBack(x, w);
      if (p.lime !== false) { x.save(); x.translate(113, 0); saltLime(x, v.t); x.restore(); }
      saltShell(x, w, n(p, 'wear'), v.t); saltCounter(x, w);
      for (const position of p.stools as number[]) { x.fillStyle = String(p.legPaint); x.fillRect(position - 1, -14, 2, 14); x.fillStyle = String(p.seatPaint); x.fillRect(position - 5, -16, 10, 3); }
      saltLights(x, w, v.t, false);
      if (p.string !== false) { x.fillStyle = '#3a2618'; x.fillRect(558, -82, 3, 82); x.fillRect(554, -82, 11, 2); drawStringLights(x, w + 46, 84, 560, 80, v.t, { sag: n(p, 'sag'), phase: n(p, 'phase'), still: false }); }
    } finally { x.restore(); }
  },
};

export const beachKitElements: AssetDefinition[] = [palmElement, djBoothElement, bonfireElement, loungerElement, saltElement];
