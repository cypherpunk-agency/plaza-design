/**
 * A road vehicle you can place in any scene (Library › Artwork, "Road vehicle"). It draws through the
 * shared vehicle kernels in vehicles.ts at their true scale, then applies a depth band (art/core/depth.ts):
 * the band's size, its parallax and its darkening, so a back-band bus matches back-band people.
 *
 * Parked, it stands at its placement. Driving, it runs along a lane of `lane` units from its placement
 * and starts over at the far end: make the lane run past both screen edges so the restart is off screen.
 * Wheels turn with the distance driven, and a running car or cab puffs exhaust.
 */
import type { Element, Properties } from '../core/composition';
import type { View } from '../core/view';
import { DEPTH_BANDS, DEPTH_ORDER, isDepthBand } from '../core/depth';
import { drawCar, drawForklift, drawTruck, SIZE, type CarKind } from './vehicles';

const KINDS = ['sedan', 'hatch', 'van', 'cab', 'bus', 'truck', 'yard', 'forklift'] as const;
type Kind = typeof KINDS[number];
/** Drawn height of each kind in units (roof, cab sign, mast), for bounds and the darkening pass. */
const TALL: Record<Kind, number> = { sedan: 44, hatch: 44, van: 56, cab: 56, bus: 88, truck: 128, yard: 110, forklift: 112 };
const kindOf = (props: Properties): Kind => (KINDS as readonly string[]).includes(String(props.kind)) ? props.kind as Kind : 'sedan';
const bandOf = (props: Properties) => DEPTH_BANDS[isDepthBand(props.depth) ? props.depth : 'play'];

/** How far along its lane the vehicle is at frame t (units from its placement) and the distance driven. */
function along(props: Properties, t: number) {
  if (props.motion !== 'driving') return { offset: 0, driven: 0, face: (props.direction === 'left' ? -1 : 1) as 1 | -1 };
  const lane = Math.max(1, Number(props.lane)), driven = t * Math.max(0, Number(props.speed)), u = ((driven % lane) + lane) % lane;
  return props.direction === 'left' ? { offset: lane - u, driven, face: -1 as const } : { offset: u, driven, face: 1 as const };
}

let scratch: HTMLCanvasElement | undefined;
function paintVehicle(ctx: CanvasRenderingContext2D, kind: Kind, props: Properties, t: number, face: 1 | -1, driven: number) {
  const common = { t, face, lights: props.lights === true, ...(props.motion === 'driving' ? { roll: driven } : {}) };
  if (kind === 'truck' || kind === 'yard') drawTruck(ctx, { ...common, paint: String(props.paint), box: null, yard: kind === 'yard' });
  else if (kind === 'forklift') drawForklift(ctx, { ...common, load: false });
  else drawCar(ctx, { ...common, paint: String(props.paint), kind: kind as CarKind, route: String(props.route || '7'),
    ...(props.motion !== 'driving' && Number(props.door) > 0 ? { door: Number(props.door) } : {}), ...(props.motion === 'driving' ? { exhaust: true } : {}) });
}

export const roadVehicleElement: Element = {
  type: 'vehicle.road', version: 1, label: 'Road vehicle', category: 'vehicles', parts: ['backdrop'],
  fields: {
    kind: { kind: 'select', label: 'Vehicle', options: [...KINDS], default: 'sedan' },
    paint: { kind: 'color', label: 'Paint', default: '#3f5f7a' },
    depth: { kind: 'select', label: 'Depth', options: [...DEPTH_ORDER], default: 'play' },
    motion: { kind: 'select', label: 'Motion', options: ['parked', 'driving'], default: 'parked' },
    direction: { kind: 'select', label: 'Direction', options: ['right', 'left'], default: 'right' },
    speed: { kind: 'number', label: 'Speed (units per frame)', default: 2, min: 0, max: 20, step: 0.1 },
    lane: { kind: 'number', label: 'Lane length', default: 1400, min: 100, max: 20000, step: 10, unit: 'units' },
    lights: { kind: 'boolean', label: 'Lights on', default: false },
    door: { kind: 'number', label: 'Driver door (0 shut, 1 open)', default: 0, min: 0, max: 1, step: 0.1 },
    route: { kind: 'string', label: 'Bus route', default: '7' },
  },
  bounds: (props, _state, context) => {
    const kind = kindOf(props), band = bandOf(props), { offset } = along(props, context?.view.t ?? 0), p = context?.placement;
    // The preview places bounds with the placement's parallax; shift by the band's own parallax so the box sits on the vehicle.
    const shift = p && context ? context.view.cam * (p.parallax - band.parallax) / (p.scale * p.facing) : 0, len = SIZE[kind] * band.scale;
    return { x: offset + shift - len / 2, h: TALL[kind] * band.scale, w: len, tall: TALL[kind] * band.scale };
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view: View, props) => {
    const { offset, driven, face } = along(props, view.t);
    ctx.save(); ctx.translate(view.sx(offset, bandOf(props).parallax), view.y(0));
    try { paintRoadVehicle(ctx, props, view.t, face, driven); } finally { ctx.restore(); }
  },
};

export const roadVehicleKinds = KINDS;
/**
 * One road vehicle at the current origin (its wheels on the ground there), at its depth band's size and
 * darkening. `driven` turns the wheels; pass the vehicle's props as the element stores them.
 */
export function paintRoadVehicle(ctx: CanvasRenderingContext2D, props: Properties, t: number, face: 1 | -1, driven: number) {
    const kind = kindOf(props), band = bandOf(props), s = band.scale;
    ctx.save(); ctx.scale(s, s);
    if (!band.dim) { paintVehicle(ctx, kind, props, t, face, driven); ctx.restore(); return; }
    // Darken only the vehicle: paint it off-screen at the current pixel density, tint it, copy it back.
    const m = ctx.getTransform(), density = Math.hypot(m.a, m.b) || 1, pad = 40, len = SIZE[kind], tall = TALL[kind];
    scratch ??= document.createElement('canvas');
    scratch.width = Math.ceil((len + pad * 2) * density); scratch.height = Math.ceil((tall + pad * 2) * density);
    const g = scratch.getContext('2d')!; g.setTransform(density, 0, 0, density, (len / 2 + pad) * density, (tall + pad) * density);
    paintVehicle(g, kind, props, t, face, driven);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(5,8,12,${band.dim})`; g.fillRect(0, 0, scratch.width, scratch.height); g.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false; ctx.drawImage(scratch, -(len / 2 + pad), -(tall + pad), len + pad * 2, tall + pad * 2);
    ctx.restore();
}
