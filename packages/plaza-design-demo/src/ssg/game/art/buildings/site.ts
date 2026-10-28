import {rectangleControls} from '../core/spatial';
import {appearanceBoolean,appearanceText,generationCount,generationSeed,shapeLength} from '../core/fields';
/** BUILDING KIT: a construction site on an empty lot (see state.ts for buildings under construction). */
import { neonPlate } from '../signage/kit';
import { hash, num, piece, text, y } from './types';

/** An empty lot being built on: hoarding, a hole with rebar, site cabins, and a tower crane going up out of the view. */
export const siteElement = piece({
  spatial:rectangleControls({width:'width'}),
  type: 'building.site', label: 'Construction site (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: { width: shapeLength(num('Width', 220, 80, 800, 1, 'units')), crane: appearanceBoolean({ kind: 'boolean', label: 'Tower crane', default: true }), cabins: generationCount(num('Site cabins', 2, 0, 4)),
    notice: appearanceText(text('Notice on the hoarding', 'SITE · KEEP OUT')), picture: appearanceText(text('Developer’s board', 'COMING SOON · 400 HOMES')), seed: generationSeed(num('Seed', 1, 0, 1000000)) },
  size: p => ({ w: Number(p.width), tall: p.crane !== false ? 900 : 120 }),
  bounds: p => { const tall = p.crane !== false ? 900 : 120; return { x: 0, h: tall, w: Number(p.width), tall }; },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, gate: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const w = Number(p.width), seed = Number(p.seed), t = o.t;
    // rebar columns standing out of the slab, the first floor half poured
    x.fillStyle = '#1a1816'; x.fillRect(10, y(70), w - 20, 6);
    for (let k = 20; k < w - 16; k += 40) { x.fillStyle = '#242220'; x.fillRect(k, y(70), 8, 70); x.fillStyle = 'rgba(160,90,50,.8)'; for (let r = 0; r < 3; r++) x.fillRect(k + 1 + r * 3, y(96), 1, 26); }
    // site cabins stacked by the gate, a light in one
    for (let c = 0; c < Number(p.cabins); c++) { const cx = w - 70 + (c % 2) * 2, ch = 20 * Math.floor(c / 2) + 20 * (c % 2 ? 0 : 0); x.fillStyle = c % 2 ? '#2a3a4a' : '#3a3a2a'; x.fillRect(cx - (c % 2) * 30, y(ch + 20 + Math.floor(c / 2) * 20), 40, 20); x.fillStyle = hash(seed + c) < 0.5 ? 'rgba(255,220,150,.7)' : '#0c0c0c'; x.fillRect(cx - (c % 2) * 30 + 6, y(ch + 34 + Math.floor(c / 2) * 20), 8, 6); }
    // the crane: a lattice mast out of the view, its jib swinging slowly far overhead
    if (p.crane !== false) {
      const mx = Math.round(w * 0.35); x.fillStyle = 'rgba(230,180,40,.9)';
      x.fillRect(mx, y(900), 2, 900); x.fillRect(mx + 10, y(900), 2, 900);
      x.strokeStyle = 'rgba(230,180,40,.6)'; for (let hh = 0; hh < 900; hh += 12) { x.beginPath(); x.moveTo(mx, y(hh)); x.lineTo(mx + 12, y(hh + 12)); x.stroke(); }
      x.fillStyle = '#3a3a3a'; x.fillRect(mx - 6, y(8), 24, 8);
      const hook = 260 + Math.round(Math.sin(t / 400 + seed) * 60); x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.moveTo(mx + 40, y(900)); x.lineTo(mx + 40, y(hook)); x.stroke();
      x.fillStyle = 'rgba(120,120,120,.9)'; x.fillRect(mx + 30, y(hook), 20, 6); x.fillStyle = 'rgba(255,42,68,' + (0.5 + 0.5 * Math.sin(t / 30)).toFixed(3) + ')'; x.fillRect(mx + 5, y(330), 3, 3);
    }
    // the hoarding along the street with the developer's board
    x.fillStyle = '#1e2a2a'; x.fillRect(0, y(46), w, 46); x.fillStyle = 'rgba(255,255,255,.07)'; for (let k = 0; k < w; k += 20) x.fillRect(k, y(46), 1, 46);
    x.fillStyle = 'rgba(30,26,22,1)'; x.fillRect(w / 2 - 14, y(40), 28, 40); x.fillStyle = 'rgba(255,210,60,.8)'; x.fillRect(w / 2 - 14, y(40), 28, 2);
    const pic = String(p.picture ?? ''); if (pic) { x.fillStyle = 'rgba(160,200,230,.35)'; x.fillRect(10, y(40), Math.min(90, w / 2 - 30), 30); neonPlate(x, t, 10 + Math.min(90, w / 2 - 30) / 2, y(16), { text: pic, col: '230,240,250', size: 5, h: 8, printed: true, bolts: false } as Parameters<typeof neonPlate>[4]); }
    const notice = String(p.notice ?? ''); if (notice) neonPlate(x, t, w * 0.78, y(30), { text: notice, col: '255,210,60', size: 6, h: 10, printed: true, bolts: false } as Parameters<typeof neonPlate>[4]);
    x.fillStyle = 'rgba(255,210,60,.85)'; for (let k = 0; k < w; k += 8) x.fillRect(k, y(4), 4, 3);
    o.light?.(w * 0.78, 30, 30, 10, '255,210,60', 'screen');
  },
});
