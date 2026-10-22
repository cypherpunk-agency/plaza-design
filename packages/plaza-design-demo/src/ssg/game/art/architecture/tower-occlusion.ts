/**
 * Skyline occlusion (the title glide's slowest piece, 2026-10-22 measurement): a far skyline tower that a
 * nearer tower's opaque body will paint over completely is skipped. Exact, not approximate: a pixel
 * counts as covered only when it lies wholly inside one opaque body rectangle (device pixels,
 * rounded inward) drawn later at full opacity with source-over, so the later fill replaces it
 * whatever was there. Everything else (partial pixels, shared segment edges, transparency,
 * filters, shadows, a rotated or skewed transform) keeps the tower. No state of its own beyond
 * a per-tower cache of its extent in its own units.
 */
import { drawTower, segments, type Tower, type TowerLook } from './downtown-towers';
import { measureArtwork, type Measured } from '../core/measure';

/** One tower as drawSkyline places it: `placed(x, tx, ty, sc, …)`, drawn with `look`. */
export interface PlacedTower { tower: Tower; tx: number; ty: number; sc: number; look: TowerLook }
type Rect = [number, number, number, number];

const extents = new WeakMap<Tower, Map<string, Measured>>();
/** What the tower paints, in its own units (origin at its foot), from its real drawing calls. Geometry does not move with time or colour. */
function extent(b: Tower, look: TowerLook): Measured {
  const key = (look.storey ?? 9) + '/' + (look.below ?? 0);
  let cache = extents.get(b); if (!cache) { cache = new Map(); extents.set(b, cache); }
  let m = cache.get(key);
  if (!m) {
    // Only the facade's rows depend on the visible band, and they stay inside the body: measure with a
    // band at the top (crown, gear, rim and the whole body rectangle are drawn regardless).
    const st = look.storey ?? 9, F = b.h + 1e5, band = 1e5 + 2 * st;
    const box = measureArtwork(ctx => {
      const sized = new Proxy(ctx, { get: (t, k) => k === 'canvas' ? { width: 1e9, height: band } : Reflect.get(t, k), set: (t, k, v) => Reflect.set(t, k, v) });
      sized.translate(0, F); drawTower(sized, b, { ...look, still: true });
    });
    m = { x: box.x, y: box.y - F, width: box.width, height: box.height }; cache.set(key, m);
  }
  return m;
}

/** Which of `items` (in drawing order) are entirely hidden by later opaque bodies, or lie off the canvas. Empty when the context is not exact-safe. */
export function hiddenTowers(x: CanvasRenderingContext2D, items: readonly PlacedTower[], opaque: boolean): Set<number> {
  const hidden = new Set<number>();
  const m = x.getTransform();
  if (!opaque || m.b !== 0 || m.c !== 0 || x.globalAlpha !== 1 || x.globalCompositeOperation !== 'source-over' || (x.filter && x.filter !== 'none') || x.shadowBlur !== 0 && x.shadowColor !== 'rgba(0, 0, 0, 0)') return hidden;
  const CW = x.canvas.width, CH = x.canvas.height;
  const dev = (tx: number, ty: number, sc: number, u0: number, v0: number, u1: number, v1: number): Rect => {
    const xa = m.a * (tx + sc * u0) + m.e, xb = m.a * (tx + sc * u1) + m.e, ya = m.d * (ty + sc * v0) + m.f, yb = m.d * (ty + sc * v1) + m.f;
    return [Math.min(xa, xb), Math.min(ya, yb), Math.max(xa, xb), Math.max(ya, yb)];
  };
  // every body segment's fully covered device pixels (inner rounding), with the index that paints it
  const covers: { i: number; r: Rect }[] = [];
  items.forEach((p, i) => {
    if (!/^(#[\da-f]{6}|rgb\()/i.test(p.look.fill)) return;
    const below = p.look.below ?? 0;
    for (const [l, rr, h0, h1] of segments(p.tower)) {
      const [x0, y0, x1, y1] = dev(p.tx, p.ty, p.sc, l, -h1, rr, -h0 + (h0 === 0 ? below : 0)), r: Rect = [Math.ceil(x0), Math.ceil(y0), Math.floor(x1), Math.floor(y1)];
      if (r[2] > r[0] && r[3] > r[1]) covers.push({ i, r });
    }
  });
  items.forEach((p, i) => {
    const e = extent(p.tower, p.look), [x0, y0, x1, y1] = dev(p.tx, p.ty, p.sc, e.x, e.y, e.x + e.width, e.y + e.height);
    // outward, a pixel of margin for antialiasing, clipped to the canvas
    const bx0 = Math.max(0, Math.floor(x0) - 2), by0 = Math.max(0, Math.floor(y0) - 2), bx1 = Math.min(CW, Math.ceil(x1) + 2), by1 = Math.min(CH, Math.ceil(y1) + 2);
    if (bx1 <= bx0 || by1 <= by0) { hidden.add(i); return; }
    const later = covers.filter(c => c.i > i && c.r[0] < bx1 && c.r[2] > bx0 && c.r[1] < by1 && c.r[3] > by0).map(c => c.r);
    if (!later.length) return;
    const xs = [...new Set([bx0, bx1, ...later.flatMap(r => [r[0], r[2]]).filter(v => v > bx0 && v < bx1)])].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k++) {
      const a = xs[k], b = xs[k + 1], spans = later.filter(r => r[0] <= a && r[2] >= b).sort((p, q) => p[1] - q[1]);
      let reach = by0;
      for (const r of spans) { if (r[1] > reach) break; reach = Math.max(reach, r[3]); if (reach >= by1) break; }
      if (reach < by1) return;
    }
    hidden.add(i);
  });
  return hidden;
}
