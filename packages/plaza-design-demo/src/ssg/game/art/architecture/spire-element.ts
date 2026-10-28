import {fixedGeometry} from '../core/spatial';
import {appearanceBoolean,appearanceColor,appearanceRatio,semantic} from '../core/fields';
/**
 * The Spire as placeable artwork (Library › Artwork, "Spire on the skyline"): the set piece from
 * spire.ts at any distance, so a street can leave a gap and show it. Tommi, 2026-10-21: the Spire is
 * visible from everywhere, so a dense district still opens a view to it somewhere. Place it in the
 * distance layer with a small parallax; its foot can sit below the roofs in front of it.
 */
import type { AssetDefinition } from '../core/composition';
import { drawSpire } from './spire';
const fixedNativeGeometry=fixedGeometry("This spire element component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

export const spireElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'landmark.spire', version: 1, label: 'Spire on the skyline (landmark)', category: 'architecture', libraryUse:'reusable', coordinates: 'world', parts: ['backdrop'],
  fields: {
    generatorScale: semantic({ kind: 'number', label: 'Size (1: as seen from the Stacks)', default: 1, min: 0.1, max: 6, step: 0.05 },{"group":"Shape / Area","quantity":"factor","unit":"factor"}),
    fillColor: appearanceColor({ kind: 'color', label: 'Silhouette', default: '#040203' }),
    edge: appearanceRatio({ kind: 'number', label: 'Edge light', default: 0.12, min: 0, max: 1, step: 0.01 }),
    seams: semantic({ kind: 'number', label: 'Seams of light', default: 1, min: 0, max: 3, step: 0.05 },{"group":"Appearance","quantity":"factor","unit":"factor"}),
    glow: appearanceBoolean({ kind: 'boolean', label: 'Red glow round the antenna light', default: true }),
    traffic: semantic({ kind: 'boolean', label: 'Shuttles docking and the patrol', default: true },{"group":"Motion","quantity":"boolean","unit":"boolean"}),
  },
  bounds: p => { const s = Number(p.generatorScale); return { x: -70 * s, h: 320 * s, w: 140 * s, tall: 320 * s }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: 300 * Number(p.generatorScale), role: 'surface' } }),
  draw(ctx, v, p, _s, _pass, at) {
    const s = Number(p.generatorScale) * at.scale, sx = v.sx(at.x);
    if (sx + 80 * s < 0 || sx - 80 * s > v.viewW) return;
    ctx.save(); ctx.translate(sx, v.y(at.h)); ctx.scale(Number(p.generatorScale), Number(p.generatorScale));
    try { drawSpire(ctx, { t: v.t, fill: String(p.fillColor), edge: Number(p.edge), windows: Number(p.seams), glow: p.glow !== false, traffic: p.traffic !== false, scale: s }); }
    finally { ctx.restore(); }
  },
};
