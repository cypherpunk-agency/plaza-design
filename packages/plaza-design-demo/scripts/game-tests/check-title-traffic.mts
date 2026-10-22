/**
 * The title glide's traffic and people (Tommi, 2026-10-22: "cars and people just appear and disappear"; "the lane
 * behind draws in front of the lane in front"). Over the whole glide, frame by frame:
 *
 * - the road's vehicles (art/sequences/opening/traffic.ts) are drawn far lane first, near lane last, by depth;
 * - no vehicle is ever drawn with globalAlpha < 1 (the canvas is instrumented);
 * - a vehicle shows first as a sliver at the view's edge or in a side street's mouth, moves continuously, and
 *   leaves the same way (never appears or vanishes whole inside the view); the Ring's traffic is clipped at RING_ENDS;
 * - people (every character sprite the opening paints) never appear or vanish inside the view, except at the view's
 *   edge or at a door (the Galleria's doors, the dome, the train's doors at the Harbor Station);
 * - the Harbor Station's crowd boards the timeline's train, after its doors open;
 * - all of it is a function of time: the same time draws the same frame.
 */
import assert from 'node:assert/strict';
import { openingDocuments } from '../../src/ssg/game/story/title/documents';
import { renderOpeningDocument } from '../../src/ssg/game/story/title/render';
import { openingActorSnapshots, harborStop } from '../../src/ssg/game/story/title/actors';
import { openingTimelineContext } from '../../src/ssg/game/art/sequences/opening/sequence';
import { openingFrame } from '../../src/ssg/game/art/sequences/opening/glide';
import { lines, ESCALATOR } from '../../src/ssg/game/art/sequences/opening/coast';
import { harborDoors, HARBOR_STAIRS } from '../../src/ssg/game/art/sequences/opening/finale';
import { drawSideStreetTraffic, drawTraffic, LANES, mouthClip, RING_ENDS, SIDE_STREETS, trafficPlan, type TrafficVehicle } from '../../src/ssg/game/art/sequences/opening/traffic';
import { flowPlace } from '../../src/ssg/game/art/sequences/opening/poses';
import { evaluateTimeline } from '../../src/ssg/game/art/core/timeline';
import { lightAt } from '../../src/ssg/game/world/light';
import { WEST, PLACES } from '../../src/ssg/game/art/sequences/opening/path';

// ---- an instrumented canvas: transforms, globalAlpha, character sprites ----
type M = [number, number, number, number, number, number];
const mul = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
interface Sprite { x0: number; x1: number; y0: number; y1: number; cut?: boolean }
const SPRITE = Symbol('sprite');
function canvas(w = 0, h = 0) {
  // the clip as a box (each clip() narrows it to its path's bounds): enough to know a sprite is cut away or cut at an edge
  let m: M = [1, 0, 0, 1, 0, 0], alpha = 1, fill: unknown = '#000', clip = [-1e9, -1e9, 1e9, 1e9], path: number[] | null = null;
  const stack: { m: M; alpha: number; clip: number[] }[] = [], log = { sprites: [] as Sprite[], lowAlpha: 0, translates: [] as { x: number; y: number; a: number }[] };
  const el: Record<string | symbol, unknown> = { width: w, height: h, style: {} };
  const grad = { addColorStop() {} };
  const ctx: Record<string, unknown> = {
    canvas: el,
    save() { stack.push({ m, alpha, clip }); }, restore() { const s = stack.pop(); if (s) { m = s.m; alpha = s.alpha; clip = s.clip; } },
    beginPath() { path = null; },
    rect(x: number, y: number, w: number, h: number) { const p = [[x, y], [x + w, y + h]].map(([a, b]) => [m[0] * a + m[2] * b + m[4], m[1] * a + m[3] * b + m[5]]), b = [Math.min(p[0][0], p[1][0]), Math.min(p[0][1], p[1][1]), Math.max(p[0][0], p[1][0]), Math.max(p[0][1], p[1][1])]; path = path ? [Math.min(path[0], b[0]), Math.min(path[1], b[1]), Math.max(path[2], b[2]), Math.max(path[3], b[3])] : b; },
    clip() { if (path) clip = [Math.max(clip[0], path[0]), Math.max(clip[1], path[1]), Math.min(clip[2], path[2]), Math.min(clip[3], path[3])]; },
    translate(x: number, y: number) { m = mul(m, [1, 0, 0, 1, x, y]); log.translates.push({ x: m[4], y: m[5], a: alpha }); },
    scale(x: number, y: number) { m = mul(m, [x, 0, 0, y, 0, 0]); }, rotate(r: number) { const c = Math.cos(r), s = Math.sin(r); m = mul(m, [c, s, -s, c, 0, 0]); },
    transform(a: number, b: number, c: number, d: number, e: number, f: number) { m = mul(m, [a, b, c, d, e, f]); },
    setTransform(a: number | { a: number; b: number; c: number; d: number; e: number; f: number }, b?: number, c?: number, d?: number, e?: number, f?: number) { m = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b!, c!, d!, e!, f!]; },
    resetTransform() { m = [1, 0, 0, 1, 0, 0]; },
    getTransform() { return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad, createPattern: () => grad,
    measureText: (s: string) => ({ width: String(s).length * 4 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), isPointInPath: () => false,
    drawImage(img: Record<string | symbol, unknown>, dx: number, dy: number, dw?: number, dh?: number) {
      if (alpha < 1 && img[SPRITE] === undefined) log.lowAlpha++;
      if (!img[SPRITE]) return;
      const W = dw ?? (img.width as number), H = dh ?? (img.height as number), pts = [[dx, dy], [dx + W, dy + H]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
      const sp = { x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), y0: Math.min(pts[0][1], pts[1][1]), y1: Math.max(pts[0][1], pts[1][1]) };
      if (sp.x1 <= clip[0] || sp.x0 >= clip[2] || sp.y1 <= clip[1] || sp.y0 >= clip[3]) return; // clipped away
      log.sprites.push({ ...sp, cut: sp.x0 < clip[0] + 2 || sp.x1 > clip[2] - 2 || sp.y0 < clip[1] + 2 || sp.y1 > clip[3] - 2 });
    },
  };
  const draws = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText']);
  const proxy = new Proxy(ctx, {
    get(o, k) {
      if (k === 'globalAlpha') return alpha; if (k === 'fillStyle') return fill;
      if (k in o) return o[k as string];
      if (typeof k === 'string' && draws.has(k)) return () => { if (alpha < 1) log.lowAlpha++; };
      return () => undefined;
    },
    set(o, k, v) {
      if (k === 'globalAlpha') { alpha = v; return true; }
      if (k === 'fillStyle') { fill = v; if (v === '#6e4c36') el[SPRITE] = true; return true; } // the kit's sprite rim: a baked character
      o[k as string] = v; return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  el.getContext = () => proxy;
  return { ctx: proxy, log, el };
}
(globalThis as Record<string, unknown>).document = { createElement: () => { const c = canvas(); (c.el as Record<symbol, unknown>)[SPRITE] = false; return c.el; } };
performance.now = () => 1000;

// ---- the glide, frame by frame ----
const W = 420, H = 195, docs = openingDocuments, glide = docs.timeline.sequences.find(s => s.id === 'glide')!;
const view = { W, H, reduced: false, lighting: lightAt(1, 1075, 270, null) };
const T0 = 7, FPS = 30;
function coastAt(tau: number) {
  const probe = canvas().ctx, context = openingTimelineContext(probe, view, docs, T0 + tau, 'glide');
  const frame = evaluateTimeline(docs.timeline, 'glide', tau, context, {});
  const row = frame.composition.instances.find(n => n.type === 'sequence.opening.line0'), train = row ? frame.state[row.id]?.train : undefined;
  const native = openingFrame(probe, view, T0 + tau, tau, { x: frame.camera.x, h: frame.camera.h, ...(typeof train === 'number' && train >= 0 ? { train } : {}), actors: {} });
  return { c: native.coast, L: lines(native.coast) };
}

// vehicles: visible area (inside the view and, in a mouth, its clip), continuity, order and alpha
const area = (v: TrafficVehicle, c: ReturnType<typeof coastAt>['c'], L: ReturnType<typeof coastAt>['L']) => {
  const x0 = Math.max(0, v.sx - v.half), x1 = Math.min(c.W, v.sx + v.half), y0 = Math.max(0, v.y - v.tall), y1 = Math.min(c.H, v.y);
  if (x1 <= x0 || y1 <= y0) return { area: 0, w: 0, h: 0 };
  if (v.mouth === null) return { area: (x1 - x0) * (y1 - y0), w: x1 - x0, h: y1 - y0 };
  const m = mouthClip(c, L, v.mouth), sx0 = Math.max(x0, m.x0), sx1 = Math.min(x1, m.x1), by0 = Math.max(y0, m.line);
  const strip = Math.max(0, sx1 - sx0) * (y1 - y0), below = (x1 - x0) * Math.max(0, y1 - by0), both = Math.max(0, sx1 - sx0) * Math.max(0, y1 - by0);
  return { area: strip + below - both, w: Math.max(Math.max(0, sx1 - sx0), below > 0 ? x1 - x0 : 0), h: Math.max(below > 0 ? y1 - by0 : 0, strip > 0 ? y1 - y0 : 0) };
};
let prev = new Map<string, { v: TrafficVehicle; a: number; w: number; h: number; g: number }>(), seenMouth = 0, seenGate = 0, frames = 0, shown = 0;
for (let i = 0; i <= glide.duration * FPS; i++) {
  const tau = i / FPS, { c, L } = coastAt(tau), plan = trafficPlan(c, L), next = new Map<string, { v: TrafficVehicle; a: number; w: number; h: number; g: number }>();
  for (let k = 1; k < plan.length; k++) assert(plan[k - 1].y <= plan[k].y, `tau ${tau}: ${plan[k - 1].id} (y ${plan[k - 1].y}) is drawn before ${plan[k].id} (y ${plan[k].y})`);
  // a sliver: no more than one frame's travel (the camera's and the lane's) shows when a vehicle first does
  const lastG = [...prev.values()][0]?.g ?? c.g, SLIVER = Math.abs(c.g - lastG) + 1.25 * 60 / FPS + 1;
  for (const v of plan) {
    const a = area(v, c, L), was = prev.get(v.id);
    next.set(v.id, { v, ...a, a: a.area, g: c.g });
    if (a.area > 0) shown++;
    if (was) {
      const moved = Math.abs((v.sx - was.v.sx) - (c.g - was.g)), step = (LANES.find(l => l.lane === v.lane)!.v * 60 / FPS) * 1.6 + 1;
      assert(moved <= step && Math.abs(v.y - was.v.y) <= step, `tau ${tau}: ${v.id} jumps (${moved.toFixed(1)}, ${(v.y - was.v.y).toFixed(1)})`);
      if (was.a === 0 && a.area > 0) { assert(Math.min(a.w, a.h) <= SLIVER, `tau ${tau}: ${v.id} appears whole (${a.w.toFixed(1)} × ${a.h.toFixed(1)}) inside the view`); if (v.mouth !== null) seenMouth++; }
    } else assert(a.area === 0, `tau ${tau}: ${v.id} is new but already shows (${a.w.toFixed(1)} × ${a.h.toFixed(1)}) at ${v.sx.toFixed(0)},${v.y}`);
    if (v.kind === 'truck' && a.area > 0) seenGate++;
  }
  for (const [id, was] of prev) if (!next.has(id)) assert(Math.min(was.w, was.h) <= SLIVER, `tau ${tau}: ${id} vanishes whole (${was.w.toFixed(1)} × ${was.h.toFixed(1)}) inside the view`);
  // drawn with full alpha, back to front (the road pass and every side street's pass)
  if (i % 3 === 0) {
    const r = canvas(W, H);
    for (const X of SIDE_STREETS) drawSideStreetTraffic(r.ctx, c, L, X);
    drawTraffic(r.ctx, c, L);
    assert.equal(r.log.lowAlpha, 0, `tau ${tau}: a vehicle is drawn with globalAlpha < 1`);
  }
  prev = next; frames++;
}
assert(seenMouth >= 3, `cars roll out of the side streets (${seenMouth} seen)`);
assert(seenGate > 0 && shown > frames, 'trucks and cars show on the road');
assert.deepEqual(RING_ENDS, { west: WEST.junction, east: PLACES.ring }, 'the Ring\'s traffic ends where its deck does today');

// ---- people: no sprite appears or vanishes inside the view but at an edge or a door ----
const stop = harborStop(docs.timeline);
assert(stop, 'the timeline stops LINE 0 at the Harbor Station');
function people(tau: number) {
  const r = canvas(W, H);
  renderOpeningDocument(r.ctx, view, docs, 'glide', tau, { ambientTime: T0 + tau });
  return r.log.sprites;
}
const doorsAt = (tau: number) => { const { c } = coastAt(tau); return [ESCALATOR.door, ESCALATOR.dome, ...harborDoors(stop!.nose), HARBOR_STAIRS.foot].map(X => c.sx(X)); };
const near = (a: Sprite, b: Sprite, d: number) => Math.abs(a.x0 - b.x0) <= d && Math.abs(a.y0 - b.y0) <= d && Math.abs((a.x1 - a.x0) - (b.x1 - b.x0)) < 1;
const edge = (s: Sprite) => !!s.cut || s.x0 < 2 || s.x1 > W - 2 || s.y0 < 2 || s.y1 > H - 2;
const atDoor = (s: Sprite, doors: number[]) => doors.some(d => Math.abs((s.x0 + s.x1) / 2 - d) <= 8);
let before = people(0), faults: string[] = [];
const PFPS = 20, D = 72 / PFPS + 3;
for (let i = 1; i <= glide.duration * PFPS && faults.length < 8; i++) {
  const tau = i / PFPS, now = people(tau), doors = doorsAt(tau);
  for (const s of now) if (!before.some(b => near(s, b, D)) && !edge(s) && !atDoor(s, doors)) faults.push(`tau ${tau}: a person appears at ${s.x0.toFixed(0)},${s.y0.toFixed(0)}`);
  for (const b of before) if (!now.some(s => near(s, b, D)) && !edge(b) && !atDoor(b, doors)) faults.push(`tau ${tau}: a person vanishes at ${b.x0.toFixed(0)},${b.y0.toFixed(0)}`);
  before = now;
}
assert.deepEqual(faults, [], 'people pop in or out inside the view');

// ---- the Harbor Station's crowd boards the timeline's train once its doors open ----
const crowd = (tau: number) => Object.entries(openingActorSnapshots(T0 + tau, false, undefined, { tau, timeline: docs.timeline })).filter(([id]) => id.startsWith('harbor.'));
const waiting = crowd(stop!.time), late = crowd(glide.duration);
assert(waiting.length >= 3, `people wait on the Harbor Station's platform as the train comes in (${waiting.length})`);
assert(waiting.every(([, p]) => flowPlace(p)!.h === HARBOR_STAIRS.deck), 'they wait on the platform');
assert(late.length < waiting.length, `they board once the doors open (${waiting.length} → ${late.length})`);
assert.equal(crowd(stop!.time - 30).length + crowd(stop!.time).length > 0, true);
assert(crowd(stop!.time + 0.3).length === waiting.length, 'nobody boards before the doors open');

// ---- determinism: the same time draws the same frame ----
for (const tau of [3.3, 31.7, 49.2, 65.4]) {
  const a = JSON.stringify(trafficPlan(coastAt(tau).c, coastAt(tau).L)), b = JSON.stringify(trafficPlan(coastAt(tau).c, coastAt(tau).L));
  assert.equal(a, b, 'traffic is a function of time');
  const s1 = JSON.stringify(openingActorSnapshots(T0 + tau, false, undefined, { tau, timeline: docs.timeline })), s2 = JSON.stringify(openingActorSnapshots(T0 + tau, false, undefined, { tau, timeline: docs.timeline }));
  assert.equal(s1, s2, 'people are a function of time');
  assert.deepEqual(people(tau), people(tau), 'the frame is a function of time');
}
console.log(`Title traffic checks passed: ${frames} frames; lanes far to near; no vehicle below full alpha; ${seenMouth} cars out of side-street mouths, trucks through the gate; no person pops inside the view; ${waiting.length} board at the Harbor Station; deterministic.`);
