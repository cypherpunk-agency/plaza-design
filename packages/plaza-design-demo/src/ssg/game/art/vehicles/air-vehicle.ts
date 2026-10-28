import {fixedGeometry} from '../core/spatial';
import {optionalColor} from '../core/fields';
import {appearanceBoolean,appearanceChoice,semantic,shapePosition} from '../core/fields';
/**
 * An aircraft you can place in any scene (Library › Artwork, "Air vehicle"): the kit's air class
 * (air-traffic.ts) at true scale, at a depth band, hovering or flying a lane (kit.ts `laneAt`) at an
 * altitude with a gentle bob. Flying taxis, pods, patrols, shuttles, haulers with their box, medevacs,
 * dropships, escorts, delivery drones and the ad blimp; fleet liveries and the autonomy cues.
 */
import type { AssetDefinition, Properties } from '../core/composition';
import type { View } from '../core/view';
import { BOX40, type Crate } from '../props/containers';
import { AIR_EXTENT, AIR_KINDS, drawAircraft, type AirKind } from './air-traffic';
import { bandBounds, bandOf, bobAt, laneAt, laneFields, laneOf, liveryFields, liveryOf, paintBanded, withDefaults } from './kit';

const LOAD: Crate = { ...BOX40, p: 6, seed: 707 };
const kindOf = (props: Properties): AirKind => (AIR_KINDS as readonly string[]).includes(String(props.kind)) ? props.kind as AirKind : 'pod';

const fields: AssetDefinition['fields'] = {
  kind: appearanceChoice({ kind: 'select', label: 'Aircraft', options: [...AIR_KINDS], default: 'taxi' }),
  paintColor: optionalColor('Paint color'),
  ...laneFields({ speed: 150, routeLength: 2400 }),
  altitude: shapePosition({ kind: 'number', label: 'Altitude', default: 260, min: -200, max: 6000, step: 1, unit: 'units' }),
  bobAmplitude: semantic({ kind: 'number', label: 'Hover bob', default: 3, min: 0, max: 40, step: 1, unit: 'units' },{"group":"Motion","quantity":"length","unit":"world units","space":"local"}),
  strobeTimeOffset: semantic({kind:'number',label:'Strobe time offset',default:0,min:0,max:10,step:1/60},{group:'Motion',quantity:'duration',unit:'seconds'}),
  bobPhaseAngle: semantic({kind:'number',label:'Hover phase',default:0,min:0,max:600*.1*180/Math.PI,step:1},{group:'Motion',quantity:'angle',unit:'degrees'}),
  cargo: appearanceBoolean({ kind: 'boolean', label: 'Cargo (hauler box, drone parcel)', default: true }),
  lights: semantic({ kind: 'boolean', label: 'Searchlight (patrol)', default: false },{"group":"Motion","quantity":"boolean","unit":"boolean"}),
  thrust: appearanceBoolean({ kind: 'boolean', label: 'Fans lit (pods hovering)', default: true }),
  ...liveryFields,
};

/** Where the aircraft is: lane offset, facing, and its height (altitude plus bob). */
function placeAir(props: Properties, t: number) {
  const pos = laneAt(laneOf(props), t);
  return { ...pos, lift: Number(props.altitude) + bobAt(t, Number(props.bobAmplitude), 0.04, Number(props.bobPhaseAngle)*Math.PI/180) };
}

/** One aircraft at the current origin (its middle), at its band's size and darkening. Partial props take the field defaults. */
export function paintAirVehicle(ctx: CanvasRenderingContext2D, raw: Properties, t: number, face: 1 | -1) {
  const props = withDefaults(fields, raw), kind = kindOf(props), band = bandOf(props), paint = String(props.paintColor);
  paintBanded(ctx, band, AIR_EXTENT[kind], g => drawAircraft(g, kind, {
    t, face, scale: band.scale, phase: Number(props.strobeTimeOffset)*60, cargo: props.cargo === true, box: props.cargo === true ? LOAD : null,
    beam: props.lights === true, thrust: props.thrust === true, livery: liveryOf(props),
    ...(/^#[\da-f]{6}$/i.test(paint) ? { paint } : {}),
  }));
}

export const airVehicleElement: AssetDefinition = {
  spatial:fixedGeometry('The selected vehicle body has kit-defined proportions. Route length, offsets and altitude configure its motion, not its body size. Use placement or route properties; no silhouette stretching.'),
  type: 'vehicle.air',mobility:p=>p.motion!=='parked'&&Number(p.speed)>0, libraryUse: 'reusable', version: 1, label: 'Air vehicle', category: 'vehicles', parts: ['backdrop'], fields,
  bounds: (raw, _state, context) => {
    const props = withDefaults(fields, raw), { offset, lift } = placeAir(props, context?.view.t ?? 0);
    return bandBounds(props, AIR_EXTENT[kindOf(props)], offset, lift, context);
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view: View, raw) => {
    const props = withDefaults(fields, raw), at = placeAir(props, view.t);
    if (!at.visible) return;
    ctx.save(); ctx.translate(view.sx(at.offset, bandOf(props).parallax), view.y(at.lift));
    try { paintAirVehicle(ctx, props, view.t, at.face); } finally { ctx.restore(); }
  },
};
export const airVehicleKinds = AIR_KINDS;
