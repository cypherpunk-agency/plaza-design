/**
 * The WATER class of the vehicle kit (ART-GUIDE §12): the city's boats, side on, drawn once and used by
 * the harbor, the beach and the Act II picture.
 *
 * - `lamp`: a small dark work boat with a lamp on its mast (the harbor's signal boat);
 * - `cabin`: a motor boat with a cabin and a bare mast, its name hand-painted on the hull (the beach);
 * - `patrol`: REGISTRY MARINE, a grey patrol boat with a red strobe and a sweeping searchlight;
 * - `ferry`: NIGHT FERRY 7, two lit decks and a mast light.
 *
 * Drawn in its own frame: origin at the middle of the hull on the waterline, heights up (y = -h); `face`
 * 1 sails right. `heave` moves the hull (not the water) up or down (kit.ts `bobAt`). The water effects
 * are options: `wake` behind it, `reflection` of its lights on the water, the `searchlight` on the water
 * ahead, the `lamp` (on, off, or the harbor boat's signal), `nav` lights (green bow, red stern). `name`
 * is painted on the hull (each kind has its own; '' paints none) and reads the right way when mirrored.
 * Placeable as `vehicle.boat`.
 */
import type { Element, Properties } from '../core/composition';
import type { View } from '../core/view';
import { box, GREEN, O, PAPER, RED } from '../core/primitives';
import { bandBounds, bandOf, bobAt, bodyText, laneAt, laneFields, laneOf, paintBanded, withDefaults, type Extent } from './kit';

export type BoatKind = 'lamp' | 'cabin' | 'patrol' | 'ferry';
export const BOAT_KINDS: readonly BoatKind[] = ['lamp', 'cabin', 'patrol', 'ferry'];
/** Each boat's extent (units; light washes and the searchlight are outside it). */
export const BOAT_EXTENT: Record<BoatKind, Extent> = {
  lamp: { x0: -24, x1: 24, top: 26, bottom: 2 }, cabin: { x0: -62, x1: 66, top: 90, bottom: 2 },
  patrol: { x0: -68, x1: 72, top: 45, bottom: 2 }, ferry: { x0: -98, x1: 98, top: 52, bottom: 2 },
};
const NAMES: Record<BoatKind, string> = { lamp: '', cabin: '', patrol: 'REGISTRY MARINE', ferry: 'NIGHT FERRY 7' };

export interface BoatLook {
  t: number; face?: 1 | -1; still?: boolean;
  /** The hull's offset, units up (the water stays put). */
  heave?: number;
  /** Hull paint, and the cabin's (cabin boats). */
  paint?: string; trim?: string;
  /** The hull's outline. */
  rim?: string;
  name?: string;
  lamp?: boolean | 'signal';
  searchlight?: boolean; wake?: boolean; reflection?: boolean; nav?: boolean;
}

const R = Math.round;
/** Any boat by kind. */
export function drawBoat(x: CanvasRenderingContext2D, kind: BoatKind, o: BoatLook) {
  const t = o.still ? 0 : o.t, b = -(o.heave ?? 0), face = o.face ?? 1, name = o.name ?? NAMES[kind];
  x.save(); if (face < 0) x.scale(-1, 1);
  try {
    if (kind === 'lamp') {
      x.fillStyle = o.paint ?? '#050403'; x.beginPath(); x.moveTo(-22, -5 + b); x.lineTo(22, -5 + b); x.lineTo(17, b); x.lineTo(-18, b); x.closePath(); x.fill();
      x.fillRect(-6, -11 + b, 12, 6); x.fillRect(2, -22 + b, 1, 11);
      const u = t % 1100, on = o.lamp === 'signal' ? (u < 150 ? (u % 50) < 36 : false) : o.lamp !== false;
      x.fillStyle = on ? 'rgba(255,230,170,.95)' : 'rgba(255,230,170,.12)'; x.fillRect(1, -24 + b, 3, 3);
      if (on) {
        const g = x.createRadialGradient(2, -22, 1, 2, -22, 18); g.addColorStop(0, 'rgba(255,230,170,.25)'); g.addColorStop(1, 'rgba(255,230,170,0)');
        x.fillStyle = g; x.fillRect(-16, -40, 36, 36);
        if (o.reflection !== false) { x.fillStyle = 'rgba(255,230,170,.2)'; for (let i = 0; i < 4; i++) x.fillRect(-1 + Math.sin(t * 0.05 + i) * 2, 2 + i * 3, 5, 1); }
      }
    } else if (kind === 'cabin') {
      x.fillStyle = o.paint ?? '#d6cebe';
      x.beginPath(); x.moveTo(-60, b - 24); x.lineTo(64, b - 28); x.lineTo(50, b); x.lineTo(-52, b); x.closePath(); x.fill();
      x.strokeStyle = o.rim ?? 'rgba(' + O + ',.75)'; x.stroke();
      x.fillStyle = '#2e4a5e'; x.fillRect(-56, b - 8, 110, 3);
      if (name) bodyText(x, face, name, -4, 16 - b, 'rgba(40,24,48,.95)', 8, '600');
      box(x, -34, b - 54, 50, 30, o.trim ?? '#b4aca0', 'rgba(' + O + ',.65)');
      box(x, -30, b - 50, 16, 10, 'rgba(20,24,30,.92)', 'rgba(' + O + ',.4)');
      x.fillStyle = '#2a1d14'; x.fillRect(-22, b - 88, 2, 34);
      if (o.lamp === true) { x.fillStyle = 'rgba(255,230,170,.95)'; x.fillRect(-23, b - 91, 4, 3); }
      if (o.wake) wake(x, t, -60, 6);
      if (o.nav) nav(x, 60, -52, b - 20);
    } else if (kind === 'patrol') {
      if (o.searchlight) {
        // the searchlight on the water ahead of it, sweeping
        const sw = Math.sin(t * 0.02) * 60, g = x.createLinearGradient(30, -30, 150 + sw, 4);
        g.addColorStop(0, 'rgba(235,240,255,.22)'); g.addColorStop(1, 'rgba(235,240,255,.02)');
        x.fillStyle = g; x.beginPath(); x.moveTo(32, -30 + b); x.lineTo(120 + sw, 6); x.lineTo(190 + sw, 6); x.closePath(); x.fill();
        x.fillStyle = 'rgba(235,240,255,.18)'; x.fillRect(R(120 + sw), 4, 70, 2);
      }
      if (o.wake !== false) wake(x, t, -70, 6);
      x.fillStyle = o.paint ?? '#20232a'; x.beginPath(); x.moveTo(-66, -12 + b); x.lineTo(58, -12 + b); x.lineTo(70, -16 + b); x.lineTo(56, b); x.lineTo(-62, b); x.closePath(); x.fill();
      x.strokeStyle = o.rim ?? 'rgba(200,205,215,.3)'; x.stroke();
      box(x, -30, -26 + b, 52, 14, '#22262e', 'rgba(200,205,215,.3)');
      x.fillStyle = 'rgba(235,240,255,.55)'; for (let i = -24; i < 18; i += 9) x.fillRect(i, -22 + b, 6, 4);
      x.fillStyle = '#2a2e36'; x.fillRect(-4, -40 + b, 2, 14); x.fillRect(24, -30 + b, 8, 5);
      x.fillStyle = o.still || Math.floor(t / 14) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.25)'; x.fillRect(-5, -43 + b, 4, 3);
      if (name) bodyText(x, face, name, -4, 6 - b, 'rgba(' + PAPER + ',.4)', 7, '600');
      x.fillStyle = 'rgba(' + RED + ',.7)'; x.fillRect(-60, -9 + b, 6, 2);
      if (o.nav) nav(x, 66, -62, b - 10);
    } else {
      x.fillStyle = o.paint ?? '#0a0705'; x.beginPath(); x.moveTo(-96, -14 + b); x.lineTo(96, -14 + b); x.lineTo(84, b); x.lineTo(-88, b); x.closePath(); x.fill();
      x.strokeStyle = o.rim ?? 'rgba(' + O + ',.45)'; x.stroke();
      box(x, -60, -28 + b, 120, 14, '#0c0806', 'rgba(' + O + ',.35)');
      box(x, -36, -38 + b, 64, 10, '#0c0806', 'rgba(' + O + ',.35)');
      x.fillStyle = 'rgba(255,217,165,.55)';
      for (let i = -54; i < 56; i += 8) x.fillRect(i, -24 + b, 4, 4);
      for (let i = -30; i < 24; i += 8) x.fillRect(i, -35 + b, 4, 3);
      if (o.lamp !== false) { x.fillStyle = 'rgba(255,217,165,.9)'; x.fillRect(20, -48 + b, 2, 10); x.fillRect(19, -50 + b, 4, 2); }
      if (name) bodyText(x, face, name, 0, 8 - b, 'rgba(' + PAPER + ',.45)', 7);
      if (o.reflection !== false) for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,217,165,' + (0.07 - i * 0.012) + ')'; x.fillRect(-56 + Math.sin(t * 0.05 + i) * 2, 2 + i * 3, 112, 1); }
      if (o.wake) wake(x, t, -96, 7);
      if (o.nav) nav(x, 94, -96, b - 8);
    }
  } finally { x.restore(); }
}
/** The wake behind a moving boat: broken white lines on the water, thinning out astern. */
function wake(x: CanvasRenderingContext2D, t: number, stern: number, n: number) {
  for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(220,230,240,' + (0.12 - i * 0.018) + ')'; x.fillRect(R(stern - i * 18 + Math.sin(t * 0.06 + i) * 3), 1 + (i % 2), 20 - i * 2, 1); }
}
/** Navigation lights: green at the bow, red at the stern. */
function nav(x: CanvasRenderingContext2D, bow: number, stern: number, y: number) {
  x.fillStyle = 'rgba(' + GREEN + ',.9)'; x.fillRect(bow - 2, y, 2, 2);
  x.fillStyle = 'rgba(' + RED + ',.9)'; x.fillRect(stern, y, 2, 2);
}

const fields: Element['fields'] = {
  kind: { kind: 'select', label: 'Boat', options: [...BOAT_KINDS], default: 'ferry' },
  paint: { kind: 'string', label: 'Hull paint (#rrggbb; empty: the kind’s own)', default: '' },
  named: { kind: 'boolean', label: 'Name on the hull', default: true },
  name: { kind: 'string', label: 'Name (empty: the kind’s own)', default: '' },
  ...laneFields({ speed: 0.3, lane: 2600 }),
  waterline: { kind: 'number', label: 'Waterline height', default: 40, min: -400, max: 2000, step: 1, unit: 'units' },
  bob: { kind: 'number', label: 'Bob', default: 1, min: 0, max: 12, step: 0.5, unit: 'units' },
  wake: { kind: 'boolean', label: 'Wake (when moving)', default: true },
  reflection: { kind: 'boolean', label: 'Reflection of its lights', default: true },
  searchlight: { kind: 'boolean', label: 'Searchlight (patrol)', default: false },
  lamp: { kind: 'select', label: 'Lamp', options: ['on', 'off', 'signal'], default: 'on' },
  nav: { kind: 'boolean', label: 'Navigation lights', default: false },
};
const kindOf = (props: Properties): BoatKind => (BOAT_KINDS as readonly string[]).includes(String(props.kind)) ? props.kind as BoatKind : 'ferry';

/** One boat at the current origin (its waterline middle), at its band's size and darkening. Partial props take the field defaults. */
export function paintBoatVehicle(ctx: CanvasRenderingContext2D, raw: Properties, t: number, face: 1 | -1, moving: boolean) {
  const props = withDefaults(fields, raw), kind = kindOf(props), paint = String(props.paint);
  paintBanded(ctx, bandOf(props), BOAT_EXTENT[kind], g => drawBoat(g, kind, {
    t, face, heave: bobAt(t, Number(props.bob), kind === 'patrol' ? 0.05 : 0.03),
    name: props.named === false ? '' : String(props.name) || undefined,
    lamp: props.lamp === 'signal' ? 'signal' : props.lamp !== 'off', wake: moving && props.wake === true, reflection: props.reflection === true,
    searchlight: props.searchlight === true, nav: props.nav === true, ...(/^#[\da-f]{6}$/i.test(paint) ? { paint } : {}),
  }));
}

export const boatVehicleElement: Element = {
  type: 'vehicle.boat', libraryUse: 'reusable', version: 1, label: 'Boat', category: 'vehicles', parts: ['backdrop'], fields,
  bounds: (raw, _state, context) => {
    const props = withDefaults(fields, raw), { offset } = laneAt(laneOf(props), context?.view.t ?? 0);
    return bandBounds(props, BOAT_EXTENT[kindOf(props)], offset, Number(props.waterline), context);
  },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view: View, raw) => {
    const props = withDefaults(fields, raw), at = laneAt(laneOf(props), view.t);
    if (!at.visible) return;
    ctx.save(); ctx.translate(view.sx(at.offset, bandOf(props).parallax), view.y(Number(props.waterline)));
    try { paintBoatVehicle(ctx, props, view.t, at.face, at.moving); } finally { ctx.restore(); }
  },
};
export const boatVehicleKinds = BOAT_KINDS;
