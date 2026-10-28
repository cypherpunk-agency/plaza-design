import {fixedGeometry} from '../core/spatial';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceChoice,appearanceColor,appearanceRatio,appearanceStructure,generationCount,generationSeed,shapeLength} from '../core/fields';
/**
 * STREET KIT: the street itself, for any scene built from kits. The surface (dark ground, a lit edge,
 * the wet sheen or cobbles) and the lights along it (a sodium post, a paper lantern, a cold LED pole,
 * a string of bulbs). Tommi, 2026-10-21: each district needs a reference street, and the light is
 * most of what tells them apart: sodium Downtown, lanterns in the Old Quarter, cold white in the Spire.
 */
import { addLight } from '../atmosphere/lighting';
import type { AssetDefinition } from '../core/composition';
import { glowLevel } from '../../world/light';
import { drawSky } from '../environment/sky';
import { inPixels, SHORE } from '../core/pixels';
import {rectangleControls} from '../core/spatial';
const fixedNativeGeometry=fixedGeometry("This kit component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

const num = numericFields({step:1});
const rgbOf = (hex: unknown, fallback: string) => { const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex)); return m ? m.slice(1).map(h => parseInt(h, 16)).join(',') : fallback; };
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

export const streetSurfaceElement: AssetDefinition = {
  spatial:rectangleControls({width:'width',height:'depthBelowGround',originY:1}),
  type: 'street.surface', version: 1, label: 'Street surface (kit)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: shapeLength(num('Width', 1600, 20, 40000, 10, 'units')),
    depthBelowGround: shapeLength(num('Depth below ground', 384, 54, 6000, 1, 'units')),
    ground: appearanceColor({ kind: 'color', label: 'Ground', default: '#030201' }),
    edge: appearanceColor({ kind: 'color', label: 'Lit edge and sheen', default: '#ff8800' }),
    sheen: appearanceRatio(num('Wet sheen (0 dry)', 0.7, 0, 1, 0.05)),
    kerb: appearanceBoolean({ kind: 'boolean', label: 'Kerb line', default: true }),
    cobbles: appearanceBoolean({ kind: 'boolean', label: 'Cobbles', default: false }),
    water: shapeLength(num('Canal in front (0: none; depth below the quay)', 0, 0, 200, 1, 'units')),
    seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: Number(p.depthBelowGround ?? 384) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  draw(x, v, p, _s, _pass, at) {
    const water = Number(p.water ?? 0);
    const a = Math.max(0, v.sx(at.x)), b = Math.min(v.viewW, v.sx(at.x + Number(p.width))), gy = v.y(at.h);
    if (b <= a) return;
    const edge = rgbOf(p.edge, '255,136,0'), sheen = Number(p.sheen);
    const bottom=v.y(at.h-Number(p.depthBelowGround??384));
    x.save();x.beginPath();x.rect(a,gy,b-a,bottom-gy);x.clip();
    try {
    x.fillStyle = String(p.ground); x.fillRect(a, gy, b - a, bottom - gy);
    x.fillStyle = 'rgba(' + edge + ',' + (0.2 + 0.35 * sheen).toFixed(3) + ')'; x.fillRect(a, gy, b - a, 1);
    if (p.kerb !== false) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(a, gy + 4, b - a, 1); x.fillStyle = 'rgba(' + edge + ',.08)'; x.fillRect(a, gy + 5, b - a, 1); }
    for (let i = 0; i < 6 && sheen > 0; i++) { x.fillStyle = 'rgba(' + edge + ',' + ((0.16 - i * 0.024) * sheen).toFixed(3) + ')'; x.fillRect(a, gy + 6 + i * i * 2 + i * 4, b - a, 1); }
    if (p.cobbles) {
      // rows of setts, smaller towards the kerb, a few catching the light
      const seed = Number(p.seed), cam = at.x - v.sx(at.x);
      for (let row = 0; row < 7; row++) {
        const yy = gy + 8 + row * (4 + row), size = 3 + row, step = size * 2 + 2;
        for (let wx = Math.floor((cam + a) / step) * step; wx < cam + b; wx += step) {
          const k = hash(wx * 0.37 + row * 13 + seed), sx = wx - cam + (row % 2) * size;
          x.fillStyle = k < 0.12 ? 'rgba(' + edge + ',.10)' : 'rgba(255,230,200,' + (0.025 + k * 0.025).toFixed(3) + ')';
          x.fillRect(Math.round(sx), yy, size + 2, 1 + Math.floor(row / 2));
        }
      }
    }
    if (water > 0) {
      // the canal below the quay: dark water, the quay's stone lip, light broken up on the ripples
      const qy = gy + 14, cam = at.x - v.sx(at.x), seed = Number(p.seed);
      x.fillStyle = '#05080a'; x.fillRect(a, qy, b - a, bottom - qy);
      x.fillStyle = '#16120e'; x.fillRect(a, qy - 2, b - a, 3); x.fillStyle = 'rgba(' + edge + ',.25)'; x.fillRect(a, qy - 2, b - a, 1);
      for (let row = 0; row < 14; row++) {
        const yy = qy + 4 + row * 3 + Math.floor(row * row / 6), drift = v.t * (0.12 + row * 0.01);
        for (let wx = Math.floor((cam + a) / 23) * 23; wx < cam + b; wx += 23) {
          const k = hash(wx * 0.11 + row * 7 + seed), len = 3 + Math.floor(k * 9), sx = wx - cam + ((drift + k * 40) % 23);
          x.fillStyle = k < 0.3 ? 'rgba(255,170,90,' + (0.18 - row * 0.008).toFixed(3) + ')' : 'rgba(' + edge + ',' + (0.07 - row * 0.003).toFixed(3) + ')';
          x.fillRect(Math.round(sx), yy, len, 1);
        }
      }
    }
    } finally { x.restore(); }
  },
};

const LAMP_STYLES = ['sodium', 'lantern', 'led', 'string', 'coast'] as const;
const LAMP_COL: Record<string, string> = { sodium: '#ffb35a', lantern: '#ff6a3a', led: '#dce8ff', string: '#ffd28a', coast: '#ffdca0' };

export const streetLampElement: AssetDefinition = {
  spatial:{fields:['width','height'],handles:p=>[
    ...(p.style==='string'?rectangleControls({width:'width',baseline:'height'}).handles(p):[]),
    ...rectangleControls({height:'height'}).handles(p).filter(h=>h.id==='top'),
  ]},
  type: 'street.lamp', version: 1, label: 'Street light (kit)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    style: appearanceChoice({ kind: 'select', label: 'Kind', options: [...LAMP_STYLES], default: 'sodium' }),
    color: appearanceStructure({ kind: 'json', label: 'Light colour', default: '', editor: { kind: 'colour', empty: 'The kind’s own' },
      validate: v => { if (v !== '' && !(typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))) throw new Error('Light colour: expected a #rrggbb colour or empty'); } }),
    height: shapeLength(num('Height', 110, 20, 600, 1, 'units')),
    width: shapeLength(num('Span (string of bulbs)', 160, 20, 2000, 1, 'units')),
    count: generationCount(num('Lanterns or bulbs', 6, 1, 60)),
    reach: shapeLength(num('Light reach', 1, 0, 3, 0.05)),
    seed: generationSeed(num('Seed', 1, 0, 1000000)),
  },
  bounds: p => p.style === 'string' ? { x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) } : { x: -18, h: Number(p.height) + 6, w: 36, tall: Number(p.height) + 6 },
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, head: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw(x, v, p, _s, _pass, at) {
    const style = String(p.style), H = Number(p.height), sx = v.sx(at.x), span = style === 'string' ? Number(p.width) : 40;
    if (sx + span + 60 < 0 || sx - 60 > v.viewW) return;
    const col = rgbOf(p.color || LAMP_COL[style], '255,179,90'), on = glowLevel(v.lighting), reach = Number(p.reach), seed = Number(p.seed), t = v.t;
    const near = at.parallax === 1, glowAt = (wx: number, h: number, r: number, a: number) => { if (near && reach > 0) addLight(v, { x: wx, h, kind: 'lamp', col, r: r * reach, a }); };
    const head = (cx: number, cy: number, w: number, hgt: number) => { x.fillStyle = 'rgba(' + col + ',' + (0.35 + 0.6 * on).toFixed(3) + ')'; x.fillRect(Math.round(cx - w / 2), Math.round(cy), w, hgt); };
    const foot = v.y(at.h);
    if (style === 'coast') {
      // the coast kit's lamp (the title glide's), in its pixels: a post, an arm, a warm bar and its round glow, a pool on the pavement
      inPixels(x, v, at, P => { const s = Math.round(P.ax), top = P.y(at.h + H), base = P.y(at.h), road = P.y(at.h + SHORE.road0 - SHORE.back);
        x.fillStyle = '#0e080c'; x.fillRect(s, top, 2, base - top); x.fillRect(s - 7, top, 9, 2);
        x.fillStyle = 'rgba(255,220,160,.95)'; x.fillRect(s - 7, top + 2, 5, 1);
        const gg = x.createRadialGradient(P.ax - 4, top + 3, 1, P.ax - 4, top + 3, 28); gg.addColorStop(0, 'rgba(255,210,150,.22)'); gg.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = gg; x.fillRect(P.ax - 32, top - 24, 56, 56);
        x.fillStyle = 'rgba(255,210,150,.08)'; x.fillRect(s - 14, base, 20, road - base); });
    } else if (style === 'sodium') {
      // a steel post with an arm out over the street
      x.fillStyle = '#0c0807'; x.fillRect(sx - 1, v.y(at.h + H), 3, foot - v.y(at.h + H)); x.fillRect(sx - 3, foot - 6, 7, 6);
      x.fillRect(sx, v.y(at.h + H), 16, 2); x.fillStyle = '#1a120c'; x.fillRect(sx + 10, v.y(at.h + H) + 2, 10, 3);
      head(sx + 15, v.y(at.h + H) + 5, 8, 1);
      glowAt(at.x + 15, at.h + H - 4, 64, 1);
    } else if (style === 'led') {
      // a slim pole with a cold bar at the top: the Spire's kind, clean and even
      x.fillStyle = '#121418'; x.fillRect(sx, v.y(at.h + H), 2, foot - v.y(at.h + H));
      head(sx + 1, v.y(at.h + H), 3, Math.min(26, H * 0.25));
      glowAt(at.x + 1, at.h + H - 10, 52, 0.8);
    } else if (style === 'lantern') {
      // paper lanterns hanging off a timber bracket, swaying a little
      x.fillStyle = '#140c08'; x.fillRect(sx - 1, v.y(at.h + H), 3, foot - v.y(at.h + H)); x.fillRect(sx, v.y(at.h + H), 22, 2);
      const n = Math.max(1, Math.min(3, Number(p.count)));
      for (let i = 0; i < n; i++) {
        const lx = sx + 8 + i * 7, drop = 6 + (i % 2) * 5, sway = Math.sin(t / 50 + seed + i) * 1.2, ly = v.y(at.h + H) + 2 + drop;
        x.strokeStyle = 'rgba(0,0,0,.8)'; x.beginPath(); x.moveTo(lx, v.y(at.h + H) + 2); x.lineTo(lx + sway, ly); x.stroke();
        lantern(x, lx + sway, ly, col, on, t + i * 17 + seed);
        glowAt(at.x + 8 + i * 7, at.h + H - drop - 6, 34, 0.55);
      }
    } else {
      // a string of bulbs slung between two points, sagging in the middle
      const n = Math.max(2, Number(p.count)), w = Number(p.width), y0 = v.y(at.h + H), sag = Math.min(18, w * 0.08);
      x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx, y0); x.quadraticCurveTo(sx + w / 2, y0 + sag * 2, sx + w, y0); x.stroke();
      for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n, bx = sx + w * f, by = y0 + 4 * sag * f * (1 - f) + 2, dead = hash(seed * 31 + i) < 0.12;
        x.fillStyle = dead ? 'rgba(40,30,20,.9)' : 'rgba(' + col + ',' + (0.45 + 0.5 * on * (0.9 + 0.1 * Math.sin(t / 23 + i))).toFixed(3) + ')';
        x.fillRect(Math.round(bx) - 1, Math.round(by), 2, 2);
        if (!dead && i % 2 === 0) glowAt(at.x + w * f, at.h + H - 4 * sag * f * (1 - f) - 3, 22, 0.35);
      }
    }
  },
};

/** One paper lantern: a lit oval, ribs, a dark cap and tassel; it flickers like a candle. */
function lantern(x: CanvasRenderingContext2D, cx: number, top: number, col: string, on: number, t: number) {
  const a = 0.45 + 0.5 * on * (0.85 + 0.15 * Math.sin(t / 9) * Math.sin(t / 23));
  x.fillStyle = '#100806'; x.fillRect(Math.round(cx) - 2, Math.round(top), 5, 1);
  x.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; x.beginPath(); x.ellipse(cx + 0.5, top + 5, 3.5, 4.5, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(Math.round(cx) - 3, Math.round(top) + 3, 7, 1); x.fillRect(Math.round(cx) - 3, Math.round(top) + 6, 7, 1);
  x.fillStyle = '#100806'; x.fillRect(Math.round(cx) - 1, Math.round(top) + 9, 3, 1); x.fillStyle = 'rgba(' + col + ',.5)'; x.fillRect(Math.round(cx), Math.round(top) + 10, 1, 3);
}

/** The sky over a kit street, on the city clock (sun, moon, stars, twilight), for a scene whose own definition draws none. */
export const streetSkyElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'street.sky', version: 1, label: 'Sky (kit)', category: 'environment', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { stars: appearanceBoolean({ kind: 'boolean', label: 'Stars at night', default: true }) },
  bounds: () => ({ x: 0, h: 400, w: 400, tall: 400 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(x, v, p, _s, _pass, at) { drawSky(x, v, v.lighting, { horizon: v.y(at.h), stars: p.stars !== false }); },
};

export const streetElements: AssetDefinition[] = [streetSkyElement, streetSurfaceElement, streetLampElement];
