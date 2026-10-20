/**
 * The vehicle kit's shared parts (ART-GUIDE §2, §12): every class (ground, air, water, rail) moves,
 * sits at a depth band and wears a livery through these, so no class repeats them.
 *
 * - `laneAt`: where a vehicle is on its lane at frame t. One formula for parked vehicles, lanes that
 *   loop (wrap round off screen), shuttles (out, hold, back, hold, eased) and one-way runs with an
 *   empty gap between them (the harbor patrol). `laneSlots` is the conveyor form for seeded traffic:
 *   slots of a fixed pitch sliding along, each slot holding a vehicle or nothing.
 * - `paintBanded`: paint a vehicle at its band's size, darkened for the back bands (off screen, so only
 *   the vehicle darkens), and `bandBounds` for its selection box.
 * - `drawLivery`: fleet stripe, fleet number, QR plate, printed decal and the autonomy cues (a sensor
 *   puck and a status light bar on the roof), drawn in a vehicle's own (possibly mirrored) frame.
 * - `laneFields`/`liveryFields`/`laneOf`/`liveryOf`: the composition fields every vehicle element shares.
 */
import type { BoundsContext, Field, Properties } from '../core/composition';
import { DEPTH_BANDS, DEPTH_ORDER, isDepthBand, type DepthSpec } from '../core/depth';
import { rng } from '../core/primitives';

export const wrap = (v: number, span: number) => ((v % span) + span) % span;
/** A gentle heave (boats, hovering craft): whole units, so pixel art stays crisp. */
export const bobAt = (t: number, amp: number, rate = 0.03, phase = 0) => Math.round(Math.sin(t * rate + phase) * amp);
const ease = (k: number) => k * k * (3 - 2 * k);

/** `loop` wraps round; `shuttle` goes out and back with a hold at each end; `run` crosses once, then the lane is empty for `dwell` frames. */
export type LaneMode = 'parked' | 'loop' | 'shuttle' | 'run';
export const LANE_MODES: readonly LaneMode[] = ['parked', 'loop', 'shuttle', 'run'];
export interface Lane {
  mode: LaneMode;
  /** The first direction of travel (1 right). The lane spans [0, length] from the placement either way. */
  dir: 1 | -1;
  /** Units per frame. */
  speed: number;
  length: number;
  /** Loop only: where along the lane the vehicle is at frame 0. */
  start?: number;
  /** Shuttle: frames held at each end. Run: empty frames between runs. */
  dwell?: number;
}
export type LaneLeg = 'out' | 'far' | 'back' | 'home';
export interface LanePosition {
  /** Units from the placement (0..length). */
  offset: number;
  /** Total distance travelled (turns wheels and rotors). */
  driven: number;
  face: 1 | -1;
  visible: boolean;
  moving: boolean;
  /** Shuttle/run only: which part of the cycle, and frames into it (a scene decides its cargo from it). */
  leg: LaneLeg;
  legT: number;
}

export function laneAt(lane: Lane, t: number): LanePosition {
  const L = Math.max(1, lane.length), v = Math.max(0, lane.speed), dir = lane.dir, dwell = Math.max(0, lane.dwell ?? 0);
  const still: LanePosition = { offset: 0, driven: 0, face: dir, visible: true, moving: false, leg: 'home', legT: 0 };
  if (lane.mode === 'parked' || v === 0) return still;
  const from = (d: number) => dir > 0 ? d : L - d;
  if (lane.mode === 'loop') {
    const driven = t * v;
    return { ...still, offset: wrap((lane.start ?? 0) + dir * driven, L), driven, moving: true, leg: 'out', legT: t };
  }
  const travel = L / v;
  if (lane.mode === 'run') {
    const period = travel + dwell, u = wrap(t, period), cycles = Math.floor(t / period), along = Math.min(L, u * v);
    return { offset: from(along), driven: cycles * L + along, face: dir, visible: u <= travel, moving: u <= travel, leg: u <= travel ? 'out' : 'home', legT: u <= travel ? u : u - travel };
  }
  // shuttle: out, hold at the far end, back, hold at home
  const period = 2 * (travel + dwell), u = wrap(t, period), cycles = Math.floor(t / period);
  let d: number, leg: LaneLeg, legT: number, face = dir, driven: number;
  if (u < travel) { leg = 'out'; legT = u; d = L * ease(u / travel); driven = d; }
  else if (u < travel + dwell) { leg = 'far'; legT = u - travel; d = L; driven = L; }
  else if (u < 2 * travel + dwell) { leg = 'back'; legT = u - travel - dwell; d = L * (1 - ease(legT / travel)); driven = 2 * L - d; face = -dir as 1 | -1; }
  else { leg = 'home'; legT = u - 2 * travel - dwell; d = 0; driven = 2 * L; face = -dir as 1 | -1; }
  return { offset: from(d), driven: cycles * 2 * L + driven, face, visible: true, moving: leg === 'out' || leg === 'back', leg, legT };
}

/** Conveyor slots over [a, b]: slot k sits at k * gap + offset. `pad` adds slots past each end. */
export function laneSlots(a: number, b: number, offset: number, gap: number, pad = 0): { k: number; x: number }[] {
  const out: { k: number; x: number }[] = [];
  for (let k = Math.floor((a - offset) / gap) - pad; k <= Math.ceil((b - offset) / gap) + pad; k++) out.push({ k, x: k * gap + offset });
  return out;
}

/** A vehicle's extent in its own frame: x from x0 to x1, `top` units above the origin, `bottom` below it. */
export interface Extent { x0: number; x1: number; top: number; bottom: number }

let scratch: HTMLCanvasElement | undefined;
/** Paint at the band's size; back bands are darkened off screen so only the vehicle darkens. */
export function paintBanded(ctx: CanvasRenderingContext2D, band: DepthSpec, e: Extent, paint: (g: CanvasRenderingContext2D) => void) {
  const s = band.scale;
  ctx.save(); ctx.scale(s, s);
  try {
    if (!band.dim) { paint(ctx); return; }
    const m = ctx.getTransform(), density = Math.hypot(m.a, m.b) || 1, pad = 40, w = e.x1 - e.x0 + pad * 2, h = e.top + e.bottom + pad * 2;
    scratch ??= document.createElement('canvas');
    scratch.width = Math.max(1, Math.ceil(w * density)); scratch.height = Math.max(1, Math.ceil(h * density));
    const g = scratch.getContext('2d')!; g.setTransform(density, 0, 0, density, (pad - e.x0) * density, (e.top + pad) * density);
    paint(g);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(5,8,12,${band.dim})`; g.fillRect(0, 0, scratch.width, scratch.height); g.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false; ctx.drawImage(scratch, e.x0 - pad, -(e.top + pad), w, h);
  } finally { ctx.restore(); }
}

export const bandOf = (props: Properties): DepthSpec => DEPTH_BANDS[isDepthBand(props.depth) ? props.depth : 'play'];
/** Selection bounds for a vehicle `offset` along its lane, `lift` units up, shifted so the box sits on the band's parallax. */
export function bandBounds(props: Properties, e: Extent, offset: number, lift: number, context?: BoundsContext) {
  const band = bandOf(props), p = context?.placement, s = band.scale;
  const shift = p && context ? context.view.cam * (p.parallax - band.parallax) / (p.scale * p.facing) : 0;
  return { x: offset + shift + e.x0 * s, h: lift + e.top * s, w: (e.x1 - e.x0) * s, tall: (e.top + e.bottom) * s };
}
/** The props as stored, with each field's default filled in (callers such as the workbench pass partial props). */
export const withDefaults = (fields: Record<string, Field>, props: Properties): Properties => {
  const out: Properties = {};
  for (const [k, f] of Object.entries(fields)) out[k] = props[k] ?? f.default;
  return out;
};

/** The lane fields every vehicle element shares. */
export function laneFields(o: { speed: number; lane: number; motion?: LaneMode }): Record<string, Field> {
  return {
    depth: { kind: 'select', label: 'Depth', options: [...DEPTH_ORDER], default: 'play' },
    motion: { kind: 'select', label: 'Motion (parked, loop lane, shuttle out and back, one-way runs)', options: [...LANE_MODES], default: o.motion ?? 'parked' },
    direction: { kind: 'select', label: 'Direction', options: ['right', 'left'], default: 'right' },
    speed: { kind: 'number', label: 'Speed (units per frame)', default: o.speed, min: 0, max: 40, step: 0.01 },
    lane: { kind: 'number', label: 'Lane length', default: o.lane, min: 100, max: 20000, step: 10, unit: 'units' },
    dwell: { kind: 'number', label: 'Hold / gap (shuttle, run)', default: 300, min: 0, max: 20000, step: 10, unit: 'frames' },
    start: { kind: 'number', label: 'Start along the lane (loop)', default: 0, min: 0, max: 20000, step: 10, unit: 'units' },
  };
}
export const laneOf = (props: Properties): Lane => ({
  mode: (LANE_MODES as readonly string[]).includes(String(props.motion)) ? props.motion as LaneMode : 'parked',
  dir: props.direction === 'left' ? -1 : 1, speed: Number(props.speed) || 0, length: Number(props.lane) || 1,
  dwell: Number(props.dwell) || 0, start: Number(props.start) || 0,
});

// ---------- liveries ----------

export interface Livery {
  /** A fleet stripe along the body (#rrggbb). */
  stripe?: string;
  /** The fleet number, printed on the body. */
  number?: string;
  /** A QR plate (fleet registration you can scan). */
  qr?: boolean;
  /** Autonomous fleet: a sensor puck and a status light bar on the roof. */
  sensor?: boolean;
  /** The status bar's colour. */
  status?: string;
  /** Printed lines on the body (an operator's name and service), one message per line. */
  decal?: string[];
}
/** Where a livery goes on a body, in the vehicle's frame (heights up): the body from `l` for `len`, the belt line and the roof. */
export interface LiveryBox { l: number; len: number; belt: number; roof: number; face: number; t: number; still?: boolean }

const hex = (s: unknown): s is string => typeof s === 'string' && /^#[\da-f]{6}$/i.test(s);
/** Text that reads the right way round on a mirrored vehicle. */
export function bodyText(x: CanvasRenderingContext2D, face: number, s: string, cx: number, h: number, col: string, size = 7, weight = '600') {
  x.save(); x.translate(cx, -h); if (face < 0) x.scale(-1, 1);
  x.font = weight + ' ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, 0, 0.5);
  x.restore();
}
export function drawLivery(x: CanvasRenderingContext2D, lv: Livery | undefined, b: LiveryBox) {
  if (!lv) return;
  const R = Math.round, { l, len, belt, roof } = b;
  if (hex(lv.stripe)) { x.fillStyle = lv.stripe; x.fillRect(R(l + 2), R(-(belt - 3)), R(len - 4), 3); }
  if (lv.decal?.length) {
    const cx = R(l + len * 0.4), lines = lv.decal.slice(0, 2);
    bodyText(x, b.face, lines[0], cx, belt + (roof - belt) * 0.42, 'rgba(30,24,18,.88)', 8, '700');
    if (lines[1]) bodyText(x, b.face, lines[1], cx, belt - 13, 'rgba(30,24,18,.72)', 7, '600');
  }
  if (lv.number) bodyText(x, b.face, lv.number, R(l + 16), belt - 12, 'rgba(240,236,226,.85)', 7, '700');
  if (lv.qr) {
    // a printed fleet plate: white with a seeded black pattern and the three corner squares
    const px = R(l + len * 0.62), top = R(-(belt - 4)), r = rng([...(lv.number ?? 'QR')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    x.fillStyle = '#e8e6de'; x.fillRect(px, top, 9, 9); x.fillStyle = '#121214';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (r() < 0.5) x.fillRect(px + 1 + i * 2, top + 1 + j * 2, 1, 1);
    x.fillRect(px + 1, top + 1, 2, 2); x.fillRect(px + 6, top + 1, 2, 2); x.fillRect(px + 1, top + 6, 2, 2);
  }
  if (lv.sensor) {
    // the sensor puck on a short stem at the back of the roof, the status bar over the windscreen
    const sx = R(l + len * 0.3), bx = R(l + len * 0.56), col = hex(lv.status) ? lv.status : '#7ab8ff';
    x.fillStyle = '#1a1c22'; x.fillRect(sx - 1, -(roof + 3), 3, 3); x.fillRect(sx - 6, -(roof + 7), 13, 4);
    x.fillStyle = 'rgba(200,220,240,.35)'; x.fillRect(sx - 5, -(roof + 7), 11, 1);
    const pulse = b.still ? 1 : 0.6 + 0.4 * Math.sin(b.t * 0.08);
    x.fillStyle = '#121418'; x.fillRect(bx - 12, -(roof + 3), 24, 3);
    x.globalAlpha = pulse; x.fillStyle = col; x.fillRect(bx - 11, -(roof + 2), 22, 1); x.globalAlpha = 1;
  }
}

/** The livery fields ground and air elements share. */
export const liveryFields: Record<string, Field> = {
  stripe: { kind: 'string', label: 'Fleet stripe (#rrggbb, empty for none)', default: '' },
  fleetNo: { kind: 'string', label: 'Fleet number', default: '' },
  qr: { kind: 'boolean', label: 'QR fleet plate', default: false },
  autonomous: { kind: 'boolean', label: 'Autonomous (sensor puck, status light bar)', default: false },
  decal: { kind: 'string', label: 'Decal lines (separate with /)', default: '' },
};
export function liveryOf(props: Properties): Livery | undefined {
  const decal = String(props.decal ?? '').split('/').map(s => s.trim()).filter(Boolean);
  const lv: Livery = { stripe: String(props.stripe ?? ''), number: String(props.fleetNo ?? ''), qr: props.qr === true, sensor: props.autonomous === true, decal };
  return hex(lv.stripe) || lv.number || lv.qr || lv.sensor || decal.length ? lv : undefined;
}
