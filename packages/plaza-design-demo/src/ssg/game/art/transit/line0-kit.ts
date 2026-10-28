import {fixedGeometry} from '../core/spatial';
import {textField} from '../core/fields';
import {rectangleControls,combineControls,conditionalControls,rangeControls,axisControl,translatedControls} from '../core/spatial';
import {numericFields} from '../core/fields';
import {appearanceChoice,appearanceColor,appearanceText,generationCount,generationSeed,semantic,shapeLength,shapePosition} from '../core/fields';
/**
 * LINE 0 KIT, outdoors: the raised line seen from the street, from the title glide's panorama (Tommi reviewed it,
 * 2026-10-15/22), for any scene or zone:
 *
 * - `transit.viaduct`       the viaduct (line0.ts) with its columns at the line's pitch, and a ramp down to a portal.
 * - `transit.wall-portal`   a lit opening in a tower's wall the track runs out of (the canyon branch).
 * - `transit.tunnel-portal` the headwall where the line dives under the street.
 * - `transit.platform`      a raised platform on the viaduct: slab, canopy, stairs down at its east end, the
 *                           station plate and the departure board (coast kit pixels).
 * - `vehicle.line0-run`     LINE 0's cars on the viaduct at the line's true scale (train-car.ts `drawMetroCar`, the
 *                           rail class's bogies), where a timeline or a timetable puts the nose (visual `nose`),
 *                           running east or west, the boards still readable, the headlight on the line ahead.
 *
 * World units at the player's scale; heights over the ground line (the line stands on the street's back line).
 */
import type { AssetDefinition, Properties,Placement } from '../core/composition';
import { inPixels, SHORE, R, ART } from '../core/pixels';
import { drawTunnelPortal, drawViaduct, drawWallPortal, LINE0 } from '../architecture/line0';
import { drawMetroCar, METRO } from '../vehicles/train-car';
import { drawBogies } from '../vehicles/rail';
import type {View} from '../core/view';
import { readableMirror } from '../core/mirror';
const fixedNativeGeometry=fixedGeometry("This line0 kit component has no independently authored size. Its native kernel and prepared source layout determine its geometry. Edit the source layout or Transform rather than stretching its body.");

const S = 1 / ART, ORANGE = '255,136,0', PAPER = '255,217,165';
const num = numericFields({min:-1e6,max:1e6,step:1});
const str = textField;
const n = (p: Properties, k: string) => Number(p[k]);
const origin = () => ({ origin: { x: 0, h: 0, role: 'origin' as const } });

/** The rail's height over the line's base at local x: the deck, down the ramp (`rampTop` east, `rampFoot` west) to 0, and on down under the street west of the foot. */
const railH = (x: number, top: number, foot: number) => x >= top ? LINE0.deck : x <= foot ? 0 : LINE0.deck * (x - foot) / (top - foot);

function viaductOrigin(view:View,at:Readonly<Required<Placement>>,p:Readonly<Properties>){return R(view.sx(at.x+Number(p.columnOriginX),at.parallax)/ART)*ART;}

export const viaductElement: AssetDefinition = {
  type: 'transit.viaduct', version: 1, label: 'LINE 0 viaduct, its columns and a ramp down (LINE 0 kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    startX: shapePosition(num('From (units east of the piece)', 0)), endX: shapePosition(num('To', 3000)), columnOriginX: shapePosition(num('Column pitch origin (units east of the piece)', 0)),
    rampTopX: shapePosition(num('Ramp top (deck height east of here)', -1e6)), rampFootX: shapePosition(num('Ramp foot (at the portal)', -1e6)), fillColor: appearanceColor({ kind: 'color', label: 'Concrete', default: '#1c1418' }),
    baseY: shapePosition(num('Stands on (over the ground line)', SHORE.back, -400, 400)),
  },
  bounds: p => ({ x:n(p,'startX'),h:n(p,'baseY')+LINE0.deck+10,w:n(p,'endX')-n(p,'startX'),tall:LINE0.deck+10 }),
  anchors: origin,
  draw(x, v, p, _s, _pass, at) {
    const o0 = viaductOrigin(v,at,p), back = v.y(at.h + n(p, 'baseY')), org = n(p, 'columnOriginX');
    const a = Math.max(-60 * ART - o0, n(p, 'startX') - org), b = Math.min(v.viewW + 60 * ART - o0, n(p, 'endX') - org);
    if (b <= a) return;
    const top = n(p, 'rampTopX') - org, foot = n(p, 'rampFootX') - org;
    // drawn on the back line, above it only (the street hides what goes under it)
    x.save(); x.beginPath(); x.rect(-10, -4000, v.viewW + 20, back + 4 * ART + 4000); x.clip(); x.translate(o0, back);
    try { drawViaduct(x, a, b, { t: v.t, fill: String(p.fillColor), height: fx => railH(fx, top, foot) }); }
    finally { x.restore(); }
  },
};

export const wallPortalElement: AssetDefinition = {
  type: 'transit.wall-portal', version: 1, label: 'LINE 0 portal in a tower’s wall (LINE 0 kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { width: shapeLength(num('Width', 360, 60, 2000, 1, 'units')) },
  spatial:rectangleControls({width:'width',baseline:LINE0.deck+75}),
  bounds: p => ({ x: 0, h: LINE0.deck + 210, w: n(p, 'width'), tall: 210 }),
  anchors: origin,
  draw(x, v, p, _s, _pass, at) {
    const sx = v.sx(at.x, at.parallax), w = n(p, 'width');
    if (sx > v.viewW + 40 * ART || sx + w < -40 * ART) return;
    x.save(); x.translate(sx, v.y(at.h)); try { drawWallPortal(x, w, { t: v.t }); } finally { x.restore(); }
  },
};

export const tunnelPortalElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'transit.tunnel-portal', version: 1, label: 'LINE 0 tunnel headwall (LINE 0 kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {},
  bounds: () => ({ x: -150, h: 280, w: 190, tall: 340 }),
  anchors: origin,
  draw(x, v, _p, _s, _pass, at) {
    const sx = v.sx(at.x, at.parallax);
    if (sx < -80 * ART || sx > v.viewW + 80 * ART) return;
    x.save(); x.translate(sx, v.y(at.h)); try { drawTunnelPortal(x, { t: v.t }); } finally { x.restore(); }
  },
};

/** A raised platform on the viaduct from the anchor `length` east: slab and edge line, canopy on two posts, stairs down off its east end, the plate and the departure board. */
export const platformElement: AssetDefinition = {
  type: 'transit.platform', version: 1, label: 'Raised LINE 0 platform: canopy, stairs, plate, departure board (LINE 0 kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { length: shapeLength(num('Length', 222, 60, 4000, 3, 'units')), plate: appearanceText(str('Station plate', '0 · GALLERIA')), next: appearanceText(str('Board: next train to', 'DOWNTOWN')), when: appearanceText(str('Board: when', '2 MIN')) },
  spatial:rectangleControls({width:'length',baseline:SHORE.back+LINE0.deck}),
  bounds: p => ({ x: 0, h: LINE0.deck + 180, w: n(p, 'length') + 90, tall: LINE0.deck + 180 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, deck: { x: 0, h: SHORE.back + LINE0.deck, role: 'surface' } }),
  draw(ctx, v, p, _s, _pass, at) {
    inPixels(ctx, v, at, P => {
      const x = P.x, back = P.y(at.h + SHORE.back), a = R(P.ax), b = R(P.u(n(p, 'length') * S)), d = R(back - LINE0.deck * S);
      if (!P.onScreen(a, b, 60)) return;
      x.fillStyle = '#241a22'; x.fillRect(a, d, b - a, 6); x.fillStyle = 'rgba(255,200,60,.55)'; x.fillRect(a, d, b - a, 1);
      x.fillStyle = '#1a1218'; x.fillRect(a + 4, d - 44, 2, 44); x.fillRect(b - 6, d - 44, 2, 44); x.fillRect(a - 2, d - 46, b - a + 4, 4);
      x.fillStyle = 'rgba(255,240,210,.8)'; x.fillRect(a + 2, d - 42, b - a - 4, 1);
      const g = x.createLinearGradient(0, d - 42, 0, d); g.addColorStop(0, 'rgba(255,220,170,.18)'); g.addColorStop(1, 'rgba(255,220,170,0)'); x.fillStyle = g; x.fillRect(a, d - 42, b - a, 42);
      x.fillStyle = '#1a1218'; for (let i = 0; i < 9; i++) x.fillRect(b + i * 3, d + 4 + i * ((back - d) / 9), 4, 2);
      x.fillStyle = '#0d0705'; x.fillRect(R((a + b) / 2) - 22, d - 58, 44, 9); x.strokeStyle = 'rgba(' + ORANGE + ',.7)'; x.lineWidth = 1; x.strokeRect(R((a + b) / 2) - 21.5, d - 57.5, 43, 8);
      x.save(); x.font = '600 4px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + ORANGE + ',.95)'; x.fillText(String(p.plate), R((a + b) / 2), d - 53); x.restore();
      x.fillStyle = '#050302'; x.fillRect(a + 8, d - 36, 22, 7);
      const blink = P.still || Math.floor(P.f / 40) % 2 === 0;
      x.save(); x.font = '600 2.6px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + PAPER + ',.9)'; x.fillText(String(p.next), a + 19, d - 34.2); x.fillStyle = blink ? 'rgba(255,190,60,.95)' : 'rgba(255,190,60,.5)'; x.fillText(String(p.when), a + 19, d - 31.2); x.restore();
    });
  },
};

const CAR_L = METRO.len, GAP = 8;
/** Where a stopped run's doors stand along the line (world x, one door a car): for the platform's people flow. */
export const runDoors = (nose: number, cars: number, direction: 1 | -1) => Array.from({ length: cars }, (_, k) => Math.round(nose - direction * (k * (CAR_L + GAP) + METRO.doors[1] * CAR_L)));

/**
 * LINE 0's cars on the deck where the nose is (visual `nose`, units east of the piece; none: hidden), running east
 * (`direction` 1) or west. Hidden west of `from` (inside the portal it came out of). The line's deck height over its base.
 */
export const line0RunElement: AssetDefinition = {
  type: 'vehicle.line0-run', version: 1, label: 'LINE 0 train on the viaduct, where its nose is (LINE 0 kit)', category: 'vehicles', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    cars: generationCount(num('Cars', 2, 1, 4)), direction: appearanceChoice({ kind: 'select', label: 'Running', options: [1, -1], default: 1 }), destination: appearanceText(str('Destination', 'HARBOR')), plate: appearanceText(str('Plate on the last car', 'CAR 2')),
    seed: generationSeed(num('Riders seed', 78, 0, 1e6)), drawingMinX: semantic(num('Hidden west of (units east of the piece)', -1e6),{"group":"Visibility & Drawing","quantity":"position","unit":"world units","space":"local"}), baseY: shapePosition(num('Line stands on (over the ground line)', SHORE.back, -400, 400)),
  },
  visualFields: { nose: { kind: 'number', label: 'Nose (units east of the piece; -1e9: none)', default: -1e9, animatable: true } },
  bounds: p => ({ x: -n(p, 'cars') * (CAR_L + GAP), h: LINE0.deck + METRO.top + 10, w: n(p, 'cars') * (CAR_L + GAP), tall: METRO.top + 10 }),
  anchors: origin,
  draw(x, v, p, state, _pass, at) {
    const nose = Number(state.nose); if (!(nose > -1e8)) return;
    const dir = Number(p.direction) as 1 | -1, cars = n(p, 'cars'), back = v.y(at.h + n(p, 'baseY')), deck = back - LINE0.deck;
    const left = Math.max(-200 * ART, v.sx(at.x + n(p, 'drawingMinX'), at.parallax));
    x.save(); x.beginPath(); x.rect(left, -4000, v.viewW + 200 * ART - left, back + 4 * ART + 4000); x.clip();
    try {
      const xr = readableMirror(x);
      for (let k = 0; k < cars; k++) {
        const tail = nose - dir * (k * (CAR_L + GAP)), head = tail - dir * CAR_L, mid = (tail + head) / 2, sx = v.sx(at.x + mid, at.parallax);
        if (sx + CAR_L < -40 * ART || sx - CAR_L > v.viewW + 40 * ART) continue;
        x.save(); x.translate(R(sx / ART) * ART, deck); x.scale(dir > 0 ? -1 : 1, 1); x.translate(-CAR_L / 2, 0);
        const c = dir > 0 ? xr : x;
        drawBogies(c, CAR_L);
        drawMetroCar(c, 0, h => -h, { t: v.t, c: k, seed: n(p, 'seed'), dest: String(p.destination), ox: -tail / ART, plate: k === cars - 1 ? String(p.plate) || undefined : undefined, still: false });
        x.restore();
      }
      const hx = v.sx(at.x + nose, at.parallax), hy = deck - 12 * ART;
      if (hx > -60 * ART && hx < v.viewW + 60 * ART) { const g = x.createRadialGradient(hx, hy, 2 * ART, hx, hy, 60 * ART); g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.fillRect(hx - 60 * ART, hy - 60 * ART, 120 * ART, 120 * ART); }
    } finally { x.restore(); }
  },
};

export const line0KitElements: AssetDefinition[] = [viaductElement, wallPortalElement, tunnelPortalElement, platformElement, line0RunElement];

const viaductControls=combineControls(rangeControls('startX','endX',p=>Number(p.baseY)+LINE0.deck),axisControl('columnOriginX','x','baseY','Column pitch origin'),conditionalControls(combineControls(axisControl('rampTopX','x',p=>Number(p.baseY)+LINE0.deck,'Ramp top'),axisControl('rampFootX','x','baseY','Ramp foot')),p=>Number(p.rampTopX)>Number(p.rampFootX)),axisControl('baseY','h',p=>(Number(p.startX)+Number(p.endX))/2,'Viaduct base'));
viaductElement.spatial={...translatedControls(viaductControls,(p,c)=>({x:c?viaductOrigin(c.view,c.placement,p)-c.view.sx(c.placement.x,c.placement.parallax)-Number(p.columnOriginX):0,h:0})),validate:p=>{if(Number(p.startX)>=Number(p.endX))throw Error('Viaduct end must be after its start');if(Number(p.rampTopX)<Number(p.rampFootX))throw Error('Ramp top must not be west of its foot');}};
line0RunElement.spatial=combineControls(axisControl('drawingMinX','x',p=>Number(p.baseY)+LINE0.deck,'Drawing starts'),axisControl('baseY','h',0,'Rail base'));
line0RunElement.drawingNote=()=>"Drawing starts clips the train west of that position. Base Y sets the rail elevation; nose position is prepared animation, not an authored body dimension.";
