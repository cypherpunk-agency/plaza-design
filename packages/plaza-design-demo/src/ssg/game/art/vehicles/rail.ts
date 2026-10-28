import {fixedGeometry} from '../core/spatial';
import {appearanceBoolean,appearanceChoice,appearanceRatio,appearanceText,generationCount,generationSeed,shapeLength} from '../core/fields';
/**
 * The RAIL class of the vehicle kit (ART-GUIDE §12): LINE 0 trains as consists of cars. Two cars exist
 * (train-car.ts): the `platform` car the stations draw at their own scale (six bays, sliding doors,
 * seeded riders in the windows) and the true-scale 20 m `metro` car of the opening glide (riders inside,
 * reflections; its doors stay shut). `drawConsist` couples `cars` of either, the lead car first (on the
 * left, where the destination board and headlight are), with a seeded crowd, the doors' opening and the
 * board. `drawPlatformTrain` is the stations' train from the transport simulation's snapshot
 * (`PlatformTrainVisual`). Placeable as `vehicle.rail`. The inside of car 3 stays the `train` scene.
 */
import type { AssetDefinition, Properties } from '../core/composition';
import type { View } from '../core/view';
import { onScreen } from '../core/primitives';
import { crowd } from '../characters/riders';
import { CAR, drawMetroCar, drawTrainCar, METRO } from './train-car';
import { bandBounds, bandOf, laneAt, laneFields, laneOf, paintBanded, withDefaults, type Extent } from './kit';

export type RailCar = 'platform' | 'metro';
export const RAIL_CARS: readonly RailCar[] = ['platform', 'metro'];
/** Each car's length, the coupling gap and its height. */
export const RAIL_CAR: Record<RailCar, { len: number; gap: number; top: number }> = { platform: { len: CAR.len, gap: 8, top: CAR.top }, metro: { len: METRO.len, gap: 12, top: METRO.top } };
export const consistLength = (car: RailCar, cars: number) => cars * RAIL_CAR[car].len + (cars - 1) * RAIL_CAR[car].gap;

export interface ConsistLook {
  car: RailCar; cars: number; t: number;
  /** Platform cars: the doors, 0 shut .. 1 open. */
  open?: number;
  /** Who rides: the seed for the crowd. */
  riderSeed?: number;
  /** The lead car's board. */
  dest?: string;
  /** World x of the train (the metro's reflections slide with it). */
  ox?: number;
  /** A plate on one car (the metro's CAR 3). */
  plate?: string; plateCar?: number;
  /** The headlight's glow on the line ahead. */
  headlight?: boolean;
  still?: boolean;
  /** Skip a car whose left edge `c0` and length are off screen. */
  visible?: (c0: number, len: number) => boolean;
}

/** The bogies under a true-scale car's ends (the metro car's own frame, from its left edge). */
export function drawBogies(x: CanvasRenderingContext2D, len: number) {
  for (const kk of [40, len - 40]) { x.fillStyle = '#0a0a0c'; x.fillRect(kk - 34, -16, 68, 14); x.fillStyle = '#26262a'; x.beginPath(); x.arc(kk - 18, -7, 7, 0, 7); x.arc(kk + 18, -7, 7, 0, 7); x.fill(); }
}

/** A train: the lead car's left edge at screen x `nose`, heights through `y` (above the platform edge or the rail). */
export function drawConsist(x: CanvasRenderingContext2D, nose: number, y: (h: number) => number, o: ConsistLook) {
  const C = RAIL_CAR[o.car], seed = o.riderSeed ?? 31;
  if (o.headlight) {
    const g = x.createRadialGradient(nose, y(40), 2, nose, y(40), 120);
    g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g; x.fillRect(nose - 120, y(160), 240, 160);
  }
  const riders = o.car === 'platform' ? crowd(seed, o.cars * 6) : [];
  for (let c = 0; c < o.cars; c++) {
    const c0 = nose + c * (C.len + C.gap);
    if (o.visible && !o.visible(c0, C.len)) continue;
    if (o.car === 'platform') drawTrainCar(x, c0, y, { t: o.t, c, riders, open: o.open ?? 0, dest: o.dest });
    else {
      x.save(); x.translate(c0, y(0)); drawBogies(x, C.len); x.restore();
      drawMetroCar(x, c0, y, { t: o.t, c, seed, dest: o.dest, ox: (o.ox ?? 0) + c * (C.len + C.gap), plate: c === (o.plateCar ?? 2) ? o.plate : undefined, still: o.still });
    }
  }
}

// ---------- the stations' train ----------

export const PLATFORM_TRAIN = { cars: 3, car: CAR.len, gap: RAIL_CAR.platform.gap, track: 0.94, doorBays: CAR.doorBays, bay: CAR.bay, bay0: CAR.bay0, bayW: CAR.bayW };
/** The transport simulation's snapshot of a platform's train. */
export interface PlatformTrainVisual { x: number; open: number; moving: boolean; riderSeed: number; destination: string }
export function drawPlatformTrain(x: CanvasRenderingContext2D, v: View, state: PlatformTrainVisual | null) {
  if (!state) return;
  const T = PLATFORM_TRAIN;
  drawConsist(x, v.sx(state.x, T.track), v.y, { car: 'platform', cars: T.cars, t: v.t, open: state.open, riderSeed: state.riderSeed, dest: state.destination, headlight: state.moving, visible: (c0, len) => onScreen(v, c0, len) });
}

// ---------- the placeable train ----------

const fields: AssetDefinition['fields'] = {
  car: appearanceChoice({ kind: 'select', label: 'Car', options: [...RAIL_CARS], default: 'platform' }),
  cars: generationCount({ kind: 'number', label: 'Cars', default: 3, min: 1, max: 8, step: 1 }),
  ...laneFields({ speed: 360, routeLength: 4000 }),
  elevation: shapeLength({ kind: 'number', label: 'Rail height', default: 0, min: -400, max: 4000, step: 1, unit: 'units' }),
  doors: appearanceRatio({ kind: 'number', label: 'Doors (0 shut, 1 open; platform cars)', default: 0, min: 0, max: 1, step: 0.1 }),
  riders: generationSeed({ kind: 'number', label: 'Rider seed', default: 41, min: 0, max: 1000000, step: 1 }),
  destination: appearanceText({ kind: 'string', label: 'Destination board', default: 'DOWNTOWN' }),
  plate: appearanceText({ kind: 'string', label: 'Car plate (metro)', default: 'CAR 3' }),
  headlight: appearanceBoolean({ kind: 'boolean', label: 'Headlight glow', default: true }),
};
const carOf = (props: Properties): RailCar => props.car === 'metro' ? 'metro' : 'platform';
const countOf = (props: Properties) => Math.max(1, Math.min(8, Math.round(Number(props.cars) || 1)));
const extentOf = (props: Properties): Extent => ({ x0: 0, x1: consistLength(carOf(props), countOf(props)), top: RAIL_CAR[carOf(props)].top, bottom: 0 });

/** One train at the current origin (the lead car's left edge on the rail), at its band's size and darkening. */
export function paintRailVehicle(ctx: CanvasRenderingContext2D, raw: Properties, t: number, moving: boolean, ox = 0) {
  const props = withDefaults(fields, raw), car = carOf(props), cars = countOf(props);
  paintBanded(ctx, bandOf(props), extentOf(props), g => drawConsist(g, 0, h => -h, {
    car, cars, t, open: moving ? 0 : Number(props.doors), riderSeed: Number(props.riders), dest: String(props.destination), ox, plate: String(props.plate) || undefined,
    headlight: props.headlight === true && moving,
  }));
}

export const railVehicleElement: AssetDefinition = {
  spatial:fixedGeometry('The selected vehicle body has kit-defined proportions. Route length, offsets and altitude configure its motion, not its body size. Use placement or route properties; no silhouette stretching.'),
  type: 'vehicle.rail',mobility:p=>p.motion!=='parked'&&Number(p.speed)>0, libraryUse: 'reusable', version: 1, label: 'Train', category: 'vehicles', parts: ['backdrop'], fields,
  bounds: (raw, _state, context) => {
    const props = withDefaults(fields, raw), { offset } = laneAt(laneOf(props), context?.view.t ?? 0);
    return bandBounds(props, extentOf(props), offset, Number(props.elevation), context);
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view: View, raw) => {
    const props = withDefaults(fields, raw), at = laneAt(laneOf(props), view.t);
    if (!at.visible) return;
    ctx.save(); ctx.translate(view.sx(at.offset, bandOf(props).parallax), view.y(Number(props.elevation)));
    try { paintRailVehicle(ctx, props, view.t, at.moving, at.offset); } finally { ctx.restore(); }
  },
};
