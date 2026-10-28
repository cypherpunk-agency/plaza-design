import {fixedGeometry} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,appearanceColor,appearanceRatio,semantic} from '../core/fields';
/**
 * A road vehicle you can place in any scene (Library › Artwork, "Road vehicle"): the kit's ground class
 * (vehicles.ts) at true scale, at a depth band (art/core/depth.ts: size, parallax, darkening), so a
 * back-band bus matches back-band people.
 *
 * Parked, it stands at its placement. Otherwise it moves along a lane of `lane` units from its placement
 * (kit.ts `laneAt`): `loop` starts over at the far end (run the lane past both screen edges so the restart
 * is off screen), `shuttle` goes out and back with a hold at each end (a straddle carrier's run), `run`
 * crosses once and leaves the lane empty for a while. Wheels turn with the distance driven, and a running
 * car or cab puffs exhaust. Port machines (straddle carrier, reach stacker, forklift) carry a box or a
 * pallet (`cargo`) at a lift/reach `pose`. Liveries: fleet stripe, number, QR plate, decal, autonomy cues.
 */
import type { AssetDefinition, Properties } from '../core/composition';
import type { View } from '../core/view';
import { BOX40, type Crate } from '../props/containers';
import { bandBounds, bandOf, laneAt, laneFields, laneOf, liveryFields, liveryOf, paintBanded, withDefaults, type Extent } from './kit';
import { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck, SIZE, type CarKind } from './vehicles';

const KINDS = ['sedan', 'hatch', 'van', 'cab', 'bus', 'truck', 'yard', 'trailer', 'straddle', 'stacker', 'forklift'] as const;
export type RoadKind = typeof KINDS[number];
/** Drawn height of each kind in units (roof, cab sign, mast, the straddle's cab, the stacker's arm). */
const TALL: Record<RoadKind, number> = { sedan: 44, hatch: 44, van: 56, cab: 56, bus: 88, truck: 128, yard: 110, trailer: 50, straddle: 402, stacker: 300, forklift: 112 };
/** Where each kind reaches past its length (forks, the stacker's arm and counterweight). */
const REACH: Partial<Record<RoadKind, [number, number]>> = { forklift: [0, 22], stacker: [-14, 200] };
/** Each kind's extent in its own frame. */
export const roadExtent = (kind: RoadKind): Extent => { const [a, b] = REACH[kind] ?? [0, 0]; return { x0: -SIZE[kind] / 2 + a, x1: SIZE[kind] / 2 + b, top: TALL[kind], bottom: 0 }; };
const kindOf = (props: Properties): RoadKind => (KINDS as readonly string[]).includes(String(props.kind)) ? props.kind as RoadKind : 'sedan';
const LOAD: Crate = { ...BOX40, p: 2, seed: 71, code: 'PLZU 610 0041' };

const fields: AssetDefinition['fields'] = {
  kind: appearanceChoice({ kind: 'select', label: 'Vehicle', options: [...KINDS], default: 'sedan' }),
  paintColor: appearanceColor({ kind: 'color', label: 'Paint (cars, buses, trucks)', default: '#3f5f7a' }),
  ...laneFields({ speed: 120, routeLength: 1400 }),
  lights: appearanceBoolean({ kind: 'boolean', label: 'Lights on', default: false }),
  door: appearanceRatio({ kind: 'number', label: 'Driver door (0 shut, 1 open)', default: 0, min: 0, max: 1, step: 0.1 }),
  route: semantic({ kind: 'string', label: 'Bus route', default: '7' },{"group":"Motion","quantity":"text","unit":"text"}),
  cargo: appearanceBoolean({ kind: 'boolean', label: 'Cargo (box, pallet)', default: false }),
  pose: appearanceRatio({ kind: 'number', label: 'Lift / reach (port machines)', default: 0.5, min: 0, max: 1, step: 0.05 }),
  ...liveryFields,
};

function paintVehicle(ctx: CanvasRenderingContext2D, kind: RoadKind, props: Properties, t: number, face: 1 | -1, driven: number) {
  const moving = props.motion !== 'parked', box = props.cargo === true ? LOAD : null, pose = Number(props.pose);
  const common = { t, face, lights: props.lights === true, livery: liveryOf(props), ...(moving ? { roll: driven } : {}) };
  if (kind === 'truck' || kind === 'yard' || kind === 'trailer') drawTruck(ctx, { ...common, paint: String(props.paintColor), box, yard: kind === 'yard', tractor: kind !== 'trailer' });
  else if (kind === 'straddle') drawStraddle(ctx, { ...common, box, lift: pose });
  else if (kind === 'stacker') drawReachStacker(ctx, { ...common, box, reach: pose });
  else if (kind === 'forklift') drawForklift(ctx, { ...common, load: props.cargo === true, lift: pose });
  else drawCar(ctx, { ...common, paint: String(props.paintColor), kind: kind as CarKind, route: String(props.route || '7'),
    ...(!moving && Number(props.door) > 0 ? { door: Number(props.door) } : {}), ...(moving ? { exhaust: true } : {}) });
}

export const roadVehicleElement: AssetDefinition = {
  spatial:fixedGeometry('The selected vehicle body has kit-defined proportions. Route length, offsets and altitude configure its motion, not its body size. Use placement or route properties; no silhouette stretching.'),
  type: 'vehicle.road',mobility:p=>p.motion!=='parked'&&Number(p.speed)>0, libraryUse: 'reusable', version: 1, label: 'Road vehicle', category: 'vehicles', parts: ['backdrop'], fields,
  bounds: (raw, _state, context) => {
    const props = withDefaults(fields, raw), { offset } = laneAt(laneOf(props), context?.view.t ?? 0);
    return bandBounds(props, roadExtent(kindOf(props)), offset, 0, context);
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view: View, raw) => {
    const props = withDefaults(fields, raw), at = laneAt(laneOf(props), view.t);
    if (!at.visible) return;
    ctx.save(); ctx.translate(view.sx(at.offset, bandOf(props).parallax), view.y(0));
    try { paintRoadVehicle(ctx, props, view.t, at.face, at.driven); } finally { ctx.restore(); }
  },
};

export const roadVehicleKinds = KINDS;
/**
 * One road vehicle at the current origin (its wheels on the ground there), at its depth band's size and
 * darkening. `driven` turns the wheels; pass the vehicle's props as the element stores them (missing
 * props take the field defaults).
 */
export function paintRoadVehicle(ctx: CanvasRenderingContext2D, raw: Properties, t: number, face: 1 | -1, driven: number) {
  const props = withDefaults(fields, raw), kind = kindOf(props);
  paintBanded(ctx, bandOf(props), roadExtent(kind), g => paintVehicle(g, kind, props, t, face, driven));
}
