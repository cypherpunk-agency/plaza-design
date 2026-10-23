/**
 * The Spire as placeable artwork (Library › Artwork, "Spire on the skyline"): the set piece from
 * spire.ts at any distance, so a street can leave a gap and show it. Tommi, 2026-10-21: the Spire is
 * visible from everywhere, so a dense district still opens a view to it somewhere. Place it in the
 * distance layer with a small parallax; its foot can sit below the roofs in front of it.
 */
import type { Element } from '../core/composition';
import { drawSpire } from './spire';

export const spireElement: Element = {
  type: 'landmark.spire', version: 1, label: 'Spire on the skyline (landmark)', category: 'architecture', libraryUse:'reusable', coordinates: 'world', parts: ['backdrop'],
  fields: {
    size: { kind: 'number', label: 'Size (1: as seen from the Stacks)', default: 1, min: 0.1, max: 6, step: 0.05 },
    fill: { kind: 'color', label: 'Silhouette', default: '#040203' },
    edge: { kind: 'number', label: 'Edge light', default: 0.12, min: 0, max: 1, step: 0.01 },
    seams: { kind: 'number', label: 'Seams of light', default: 1, min: 0, max: 3, step: 0.05 },
    glow: { kind: 'boolean', label: 'Red glow round the antenna light', default: true },
    traffic: { kind: 'boolean', label: 'Shuttles docking and the patrol', default: true },
  },
  bounds: p => { const s = Number(p.size); return { x: -70 * s, h: 320 * s, w: 140 * s, tall: 320 * s }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: 300 * Number(p.size), role: 'surface' } }),
  draw(ctx, v, p, _s, _pass, at) {
    const s = Number(p.size) * at.scale, sx = v.sx(at.x);
    if (sx + 80 * s < 0 || sx - 80 * s > v.viewW) return;
    ctx.save(); ctx.translate(sx, v.y(at.h)); ctx.scale(Number(p.size), Number(p.size));
    try { drawSpire(ctx, { t: v.t, fill: String(p.fill), edge: Number(p.edge), windows: Number(p.seams), glow: p.glow !== false, traffic: p.traffic !== false, scale: s }); }
    finally { ctx.restore(); }
  },
};
