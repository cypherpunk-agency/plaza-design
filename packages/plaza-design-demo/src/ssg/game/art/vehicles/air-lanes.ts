/**
 * VEHICLE KIT: the sky's traffic as lanes (Tommi, 2026-10-15: "air traffic is only private"), from the title glide,
 * for any skyline: the city's craft (air-traffic.ts) each where it makes sense, every one at its depth's true scale.
 *
 * - `lanes`: private pods, sky taxis, corporate shuttles: slots sliding at the lane's speed, seeded which are full,
 *   busier toward one end (`busy` ramp), thinning past `quiet`, and keeping clear of a landmark (`clear`).
 * - `blimp`: the ad blimp drifting far off. `patrols`: Registry patrols on fixed loops, a searchlight on now and then.
 * - `stream`: delivery drones out of a hub, climbing to their height and away.
 * - `flights`: single craft on a schedule (sequence seconds, visual `sequenceTime`): a hauler, a medevac, a
 *   dropship and its escorts.
 *
 * Positions are in the lanes' own frame: `u` is the place along the skyline at depth 1 (world units east of the
 * piece); a craft at depth `p` stands at `p·u + (1 − p)·centre`, so all depths line up at the view's middle when
 * the camera is over `u`. Heights over the ground line.
 */
import type { AssetDefinition, Field, Properties, Value } from '../core/composition';
import type { View } from '../core/view';
import { ART, R, smooth, lerp } from '../core/pixels';
import { BLIMP_SCALE, drawBlimp, drawCraft, drawDrone, type CraftKind } from './air-traffic';
import { placed } from '../core/view';

const S = 1 / ART;
const KINDS: CraftKind[] = ['pod', 'taxi', 'patrol', 'shuttle', 'hauler', 'medevac', 'dropship', 'escort'];
const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const n = (p: Properties, k: string) => Number(p[k]);
const h01 = (k: number) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rows = (label: string, keys: string[], value: Value): Field => ({ kind: 'json', label, default: value,
  validate: v => { if (!Array.isArray(v) || v.length > 40 || !v.every(r => !!r && typeof r === 'object' && keys.every(k => fin((r as Record<string, unknown>)[k])))) throw new Error(label + ': expected rows with ' + keys.join(', ')); } });

interface Lane { kind: string; parallax: number; height: number; dir: 1 | -1; speed: number; gap: number; seed: number; busyFrom: number; busyTo: number; busyLow: number; busyHigh: number; paints?: string[] }
interface Patrol { x: number; parallax: number; height: number; rx: number; ry: number; period: number; beam: number }
interface Flight { kind: string; parallax: number; height: number; face: 1 | -1; from: number; to: number; x: number; speed: number }

export const airLanesElement: AssetDefinition = {
  type: 'vehicle.air-lanes', version: 1, label: 'Sky traffic: lanes, patrols, a drone stream, the blimp, scheduled flights (vehicle kit)', category: 'vehicles', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    centre: { kind: 'number', label: 'Depth centre (the view’s middle, units east of the piece)', default: 640, min: -1e7, max: 1e7 },
    lanes: rows('Lanes (kind, parallax, height, dir, speed, gap, seed, busy ramp from/to/low/high)', ['parallax', 'height', 'dir', 'speed', 'gap', 'seed', 'busyFrom', 'busyTo', 'busyLow', 'busyHigh'], []),
    quiet: { kind: 'number', label: 'Lanes thin out west of (u; -1e7: never)', default: -1e7, min: -1e7, max: 1e7 },
    clear: rows('Kept clear round (u, parallax, half width in pixels, camera from/to u)', ['u', 'parallax', 'half', 'from', 'to'], []),
    blimp: rows('Blimp (u, parallax, height, drift a frame)', ['u', 'parallax', 'height', 'drift'], []),
    patrols: rows('Patrol loops (x u, parallax, height, rx, ry, period, beam)', ['x', 'parallax', 'height', 'rx', 'ry', 'period', 'beam'], []),
    stream: rows('Drone streams (from u, to u, parallax, gap, speed, low h, high h)', ['from', 'to', 'parallax', 'gap', 'speed', 'low', 'high'], []),
    flights: rows('Scheduled flights (kind, parallax, height, face, from s, to s, x u at from, speed u/s)', ['parallax', 'height', 'face', 'from', 'to', 'x', 'speed'], []),
  },
  visualFields: { sequenceTime: { kind: 'number', label: 'Sequence seconds (scheduled flights)', default: -1, animatable: true } },
  bounds: () => ({ x: -2000, h: 800, w: 4000, tall: 700 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(x, v, p, state, _pass, at) { drawLanes(x, v, p, Number(state.sequenceTime), at.x, at.h); },
};

function drawLanes(x: CanvasRenderingContext2D, v: View, p: Properties, tau: number, ox: number, oh: number) {
  const f = v.t, C = n(p, 'centre'), W = v.viewW;
  // a craft at depth q over u: its screen x; the camera's u (the view's middle)
  const at = (u: number, q: number) => v.sx(ox + q * u + (1 - q) * C, q);
  const camU = (q: number) => (W / 2 - at(0, q)) / q;
  const craft = (kind: CraftKind, u: number, q: number, h: number, face: 1 | -1, o: { paint?: string; beam?: boolean; t?: number } = {}) => {
    const sx = at(u, q), sc = q;
    if (sx < -120 * ART || sx > W + 120 * ART) return;
    placed(x, R(sx / ART) * ART, R(v.y(oh + h) / ART) * ART, sc, () => drawCraft(x, kind, { t: o.t ?? f, face, still: false, paint: o.paint, scale: sc * S, beam: o.beam }));
  };
  for (const b of p.blimp as unknown as { u: number; parallax: number; height: number; drift: number }[]) {
    const u = b.u - f * b.drift * ART, sx = at(u, b.parallax);
    if (sx > -80 * ART && sx < W + 80 * ART) placed(x, R(sx / ART) * ART, R(v.y(oh + b.height) / ART) * ART, b.parallax * BLIMP_SCALE, () => drawBlimp(x, { t: f, still: false }));
  }
  const clear = p.clear as unknown as { u: number; parallax: number; half: number; from: number; to: number }[];
  for (const ln of p.lanes as unknown as Lane[]) {
    const kind = (KINDS.includes(ln.kind as CraftKind) ? ln.kind : 'pod') as CraftKind, q = ln.parallax, gap = ln.gap * ART, cu = camU(q), reach = (W / 2 + 160 * ART) / q;
    const off = ln.dir * f * ln.speed * ART;
    for (let k = Math.floor((cu - reach - off) / gap); k <= Math.ceil((cu + reach - off) / gap); k++) {
      const u = k * gap + off, busy = ln.busyLow + (ln.busyHigh - ln.busyLow) * smooth(ln.busyFrom, ln.busyTo, u);
      const quiet = n(p, 'quiet'), thin = u < quiet ? lerp(1, 0.2, Math.min(1, (quiet - u) / 1200)) : 1;
      if (h01(k * 31 + ln.seed) > busy * thin) continue;
      if (kind !== 'shuttle' && clear.some(c => { const cc = camU(c.parallax); return cc > c.from && cc < c.to && Math.abs(at(u, q) - at(c.u, c.parallax)) < c.half * ART; })) continue;
      const bob = Math.sin(f * 0.03 + k) * 1.2 * ART;
      craft(kind, u, q, ln.height - (((k * 37) % 5) - 2) * ART - bob, ln.dir, { paint: ln.paints?.[Math.abs(k) % ln.paints.length], t: f + k * 13 });
    }
  }
  for (const pt of p.patrols as unknown as Patrol[]) {
    const a = (f / pt.period) * Math.PI * 2, u = pt.x + Math.cos(a) * pt.rx, face = (Math.sin(a) > 0 ? -1 : 1) as 1 | -1;
    craft('patrol', u, pt.parallax, pt.height - Math.sin(a) * pt.ry, face, { beam: pt.beam > 0 && (pt.beam === 2 ? Math.cos(a * 3) > 0.6 : Math.abs(u - pt.x) < 360) });
  }
  for (const st of p.stream as unknown as { from: number; to: number; parallax: number; gap: number; speed: number; low: number; high: number }[]) {
    const q = st.parallax, gap = st.gap * ART, off = -f * st.speed * ART, cu = camU(q);
    for (let k = Math.floor((cu - 1800 - off) / gap); k <= Math.ceil((cu + 1800 - off) / gap); k++) {
      const u = k * gap + off, d = st.from - u;
      if (d < 0 || u < st.to) continue;
      const sx = at(u, q); if (sx < -20 * ART || sx > W + 20 * ART) continue;
      const climb = smooth(0, 480, d), fade = Math.min(1, (u - st.to) / 480), h = lerp(st.low, st.high - h01(k * 5) * 43, climb) - Math.sin(k) * 2 * ART;
      x.save(); x.globalAlpha *= fade; placed(x, R(sx / ART) * ART, R(v.y(oh + h) / ART) * ART, q, () => drawDrone(x, { t: f + k * 7, still: false, cargo: true })); x.restore();
    }
  }
  if (tau >= 0) for (const fl of p.flights as unknown as Flight[]) {
    if (tau <= fl.from || tau >= fl.to) continue;
    const kind = (KINDS.includes(fl.kind as CraftKind) ? fl.kind : 'hauler') as CraftKind;
    craft(kind, fl.x + fl.speed * (tau - fl.from), fl.parallax, fl.height, fl.face);
  }
}

export type { View };
