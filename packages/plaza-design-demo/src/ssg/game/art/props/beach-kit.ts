import {fixedGeometry} from '../core/spatial';
import {rectangleControls,endpointControls} from '../core/spatial';
import {degrees} from '../core/fields';
import {positionListEditor} from '../core/fields';
import {seconds} from '../core/fields';
import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceColor,appearanceRatio,appearanceStructure,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/**
 * BEACH KIT: the beach's pieces as placeable artwork (they were the title glide's own placements of these sets):
 * `environment.palm` (palm.ts, its rim on the sun's side), `props.dj-booth`, `props.bonfire`, `props.lounger`
 * (beach-party.ts) and `beach.salt`, SALT the beach bar whole (beach-bar.ts: stilts, back shelves, LIME, the
 * shack, counter, stools, its lights and the string out over the dance floor to a pole).
 *
 * World units at the player's scale, the origin at the foot. A palm is drawn in the coast kit's pixels (its
 * authored height and lean are world units, converted at the palm.ts pixel kernel).
 */
import type { AssetDefinition, Properties } from '../core/composition';
import { inPixels, R, ART } from '../core/pixels';
import { drawPalm } from '../environment/palm';
import { sunsetSun } from '../environment/sunset-sky';
import { drawBonfire, drawDjBooth, drawLounger } from './beach-party';
import { readableMirror } from '../core/mirror';
import { drawStringLights, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from '../assemblies/beach-bar';
const fixedNativeGeometry=fixedGeometry("This beach kit component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

const num = numericFields({min:-1e6,max:1e6,step:1});
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
  fields: { trunkHeight: shapeLength(num('Trunk height', 300, 30, 3000)), leanX: shapePosition(num('Trunk lean (+ east)', 30, -1200, 1200)), seed: generationSeed(num('Seed', 1, 0, 1e6)), fillColor: appearanceColor({ kind: 'color', label: 'Silhouette', default: '#0b0410' }) },
  bounds: p => ({ x: -n(p, 'trunkHeight') * 1.6 / ART, h: n(p, 'trunkHeight') * 3.6 / ART, w: n(p, 'trunkHeight') * 3.2 / ART, tall: n(p, 'trunkHeight') * 3.6 / ART }),
  anchors: origin,
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const sx = P.ax, h = n(p, 'trunkHeight') / ART;
      if (!P.onScreen(sx, sx, h * 0.8)) return;
      const sun = sunsetSun(v, v.lighting, 0).x / ART, seen = P.facing < 0 ? 2 * P.ax - sun : sun;
      P.x.save(); P.x.translate(R(sx), P.ay);
      try { drawPalm(P.x, { h, lean: n(p, 'leanX') / ART, seed: n(p, 'seed'), t: P.f, still: P.still, rim: DAWN, side: seen > sx ? 1 : -1, fill: String(p.fillColor) }); } finally { P.x.restore(); }
    });
  },
};

export const djBoothElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'props.dj-booth', version: 1, label: 'DJ bot’s booth on the sand (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { beatDuration:seconds("Beat duration",0.26666666666666666,{"min":0.03333333333333333,"max":4,"step":0.016666666666666666}) },
  bounds: () => ({ x: -60, h: 120, w: 120, tall: 120 }), anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 120, () => drawDjBooth(x, { t: v.t, beat: (n(p,'beatDuration')*60) })); },
};
export const bonfireElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'props.bonfire', selection:'region', version: 1, label: 'Bonfire: logs, flames, sparks, its light on the sand (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { size: semantic(num('Size', 1, 0.2, 4, 0.05),{"group":"Appearance","quantity":"factor","unit":"factor"}) },
  bounds:p=>{const size=n(p,'size'),pad=Math.max(22,20*size+3),top=Math.max(100*size,6+32*size);return{x:-pad,h:top,w:pad*2,tall:top+3};}, anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 180, () => drawBonfire(x, { t: v.t, size: n(p, 'size') })); },
};
export const loungerElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'props.lounger', version: 1, label: 'Sun lounger and parasol (beach kit)', category: 'props', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { color: appearanceColor({ kind: 'color', label: 'Canopy', default: '#c83a2a' }), wear: appearanceRatio(num('Paint in the light (0 gold .. 1 dusk)', 0.1, 0, 1, 0.05)), parasol: appearanceBoolean({ kind: 'boolean', label: 'Parasol', default: true }), mirrored: semantic({ kind: 'boolean', label: 'Flipped', default: false },{"group":"Transform","quantity":"boolean","unit":"boolean"}) },
  bounds: () => ({ x: -34, h: 62, w: 50, tall: 62 }), anchors: origin,
  draw(x, v, p, _s, _pass, at) { own(x, v.sx(at.x, at.parallax), v.y(at.h), v.viewW, 60, () => drawLounger(x, { col: String(p.color), p: n(p, 'wear'), flip: p.mirrored === true, parasol: p.parasol !== false })); },
};

export const saltElement: AssetDefinition = {
  spatial:rectangleControls({width:'width',baseline:64}),
  type: 'beach.salt', version: 1, label: 'SALT, the beach bar: stilts, shelves, LIME, shack, counter, stools, lights (beach kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: shapeLength(num('Bar width', 226, 40, 2000)), wear: appearanceRatio(num('Weathering', 0.05, 0, 1, 0.01)), lime: appearanceBoolean({ kind: 'boolean', label: 'LIME behind the counter', default: true }),
    stools: positionListEditor(appearanceStructure({ kind: 'json', label: 'Stools (x along the bar)', default: [40, 96, 170], validate: v => { if (!Array.isArray(v) || v.length > 20 || !v.every(q => typeof q === 'number' && Number.isFinite(q))) throw new Error('Stools: expected numbers'); } }),'Stool X'),
    legPaint: appearanceColor({ kind: 'color', label: 'Stool legs', default: '#5a3a24' }), seatPaint: appearanceColor({ kind: 'color', label: 'Stool seats', default: '#8a5a3a' }),
    string: appearanceBoolean({ kind: 'boolean', label: 'String lights out to a pole', default: true }), sag: shapeLength(num('String light sag', 12, 0, 100)), lightPhaseAngle:degrees('String light phase',3*180/Math.PI,{group:'Motion',step:1}),paletteOffset:semantic({...num('Bulb palette offset',3),min:0,step:1,validate:v=>{if(!Number.isInteger(v))throw Error('Bulb palette offset must be a whole number');}},{group:'Appearance',quantity:'index',unit:'integer'}),
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
      if (p.string !== false) { x.fillStyle = '#3a2618'; x.fillRect(558, -82, 3, 82); x.fillRect(554, -82, 11, 2); drawStringLights(x, w + 46, 84, 560, 80, v.t, { sag: n(p, 'sag'), phaseAngle:n(p,'lightPhaseAngle')*Math.PI/180,paletteOffset:n(p,'paletteOffset'),still:false }); }
    } finally { x.restore(); }
  },
};

export const beachKitElements: AssetDefinition[] = [palmElement, djBoothElement, bonfireElement, loungerElement, saltElement];

palmElement.spatial=endpointControls('leanX','trunkHeight');
