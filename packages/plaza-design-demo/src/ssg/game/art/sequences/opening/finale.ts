import{flowPlace,paintOpeningActor}from'./poses';
import{visiblePoint}from'./piece-inputs';
import type{FlowSource,FlowVehicle}from'../../../world/people-flow';
/**
 * The glide's end (Tommi, 2026-10-15, second pass): LINE 0 has its own way and comes from somewhere,
 * and the ending opens the ground.
 *
 * - The viaduct runs from the Galleria's LINE 0 station (people waiting, the board: the next train to
 *   Downtown) west along the street, under the Ring and over the pavement, never across the road.
 * - The train comes out of a portal in a glass tower (the canyon line from the harbor joins there,
 *   CITY.md), overtakes the camera, runs down the ramp and dives under the street at the tunnel's
 *   headwall (the street hides what goes under it).
 * - The camera follows it down: the ground is drawn in section (sets/cutaway.ts): the asphalt, the
 *   pipes and the piles, LINE 0's lit bore with the train in it, the same train, car for car, at the
 *   same place along the line. Further down, a glimpse of the Undercity: a flooded canal under a brick
 *   vault, a boat with a lantern, someone in it. Then the dark, and the handover (title/index.ts).
 *
 * The cars are true to the player's scale (sets/train-car.ts `drawMetroCar`, 20 m). Everything here is
 * a function of the glide's clock `gt` and the frame clock (sudo seeks either).
 */

import type { Character } from "../../../runtime/characters";
import { drawCanalGlimpse, drawGroundSection } from "../../architecture/cutaway";
import { drawBore, drawTunnelPortal, drawViaduct, drawWallPortal, LINE0 } from "../../architecture/line0";
import { drawMetroCar, METRO } from "../../vehicles/train-car";
import { drawBogies } from "../../vehicles/rail";
import { frameView, placed } from "../../core/view";
import { type CoastView, type Lines, ORANGE, PAPER, R, S } from "./coast";
import { DROP2, glideDist, HARBOR_STATION, NOSE_IN, PLACES, TOWER_X, TRAIN_V } from "./path";
import { readableMirror } from "../../core/mirror";
import { PORTAL_TOWER } from "./town";

/** A car's length and the coupling gap, in view units at the coast's scale. */
const CAR_L = METRO.len * S, GAP = 8 * S;
/** The bore's floor and the canal's waterline, below the street's front edge (scene units, the section's frame). */
const BORE_FLOOR = 420, WATER = 930, DEPTH = 1400;
/** The canal's stretch (X) under the street, round where the camera is when it gets down there. */
const CANAL: [number, number] = [glideDist(DROP2[1]) - 720, glideDist(DROP2[1]) + 720];

/** The rail's height (view units over the back line) at X: the viaduct, the ramp, then on down under the street. */
export function railH(X: number) {
  const deck = LINE0.deck * S, [r0, r1] = PLACES.ramp;
  return X < r0 ? deck : deck * (r1 - X) / (r1 - r0);
}
/** Where the train's nose is (X) at glide time gt (it is inside the tower until it passes TOWER_X). */
export const noseAt = (gt: number) => PLACES.portal + TRAIN_V * (gt - NOSE_IN);

/** Who waits at the Galleria's platform (at the player's scale). */
export const WAITING: { X: number; c: Character }[] = [
  { X: 3092, c: { seed: 5101, look: { garb: 'coat', hair: 'bun', extras: ['bag'] }, x: 0, act: 'phone', facing: -1 } },
  { X: 3112, c: { seed: 5102, look: { body: 'tall', garb: 'suit', hair: 'short' }, x: 0, act: 'stand', facing: -1 } },
  { X: 3130, c: { seed: 5103, look: { body: 'kid', garb: 'tee', hair: 'cap' }, x: 0, act: 'stand', facing: 1 } },
];

/** Who waits at the Harbor Station for the train in from Downtown (at the player's scale): looks for its people flow. */
export const HARBOR_RIDERS: Character[] = [
  { seed: 5111, look: { garb: 'coat', hair: 'short', extras: ['bag'] }, x: 0, act: 'stand' },
  { seed: 5112, look: { body: 'slim', garb: 'jacket', hair: 'beanie', extras: ['phone'] }, x: 0, act: 'stand' },
  { seed: 5113, look: { body: 'tall', garb: 'suit', hair: 'brim' }, x: 0, act: 'stand' },
  { seed: 5114, look: { ...{ garb: 'hivis' as const, hair: 'helmet' as const, acc: '#e8c020' }, body: 'avg', extras: ['backpack'] }, x: 0, act: 'stand' },
];
/** The Harbor Station's crowd in flow units (zone `glide`): x is X, h the height over the street's back line; up its stairs at the east end. */
export const HARBOR_STAIRS = { foot: HARBOR_STATION[0] - 28, top: HARBOR_STATION[0] + 2, deck: LINE0.deck * S };
/** Where LINE 0's doors stand when the eastbound train has stopped with its nose at `nose` (one door a car; each car's 0.37 door). */
export const harborDoors = (nose: number) => [0, 1].map(k => Math.round(nose + k * (CAR_L + GAP) + METRO.doors[1] * CAR_L));
/**
 * The train at the Harbor Station as a people flow's vehicle (world/people-flow.ts `FlowVehicle`): one stop, its doors
 * open from `open` (glide seconds; story/title/actors.ts reads it from the timeline's `line0.train` track) to the end.
 */
export function harborTrain(nose: number, open: number): FlowVehicle {
  const doors = harborDoors(nose).map(x => ({ zone: 'glide', x }));
  return { id: 'line0-harbor', tripAt: () => 0, doors: n => n === 0 ? { trip: 0, open, close: open + 40, doors } : null };
}
/**
 * The people waiting there: for each door a cohort that walks up the stairs and along the platform long before the
 * camera gets there, queues at the door and boards as the doors open (the queue's board rule), one by one.
 */
export function harborFlows(nose: number): FlowSource[] {
  return harborDoors(nose).map((door, i) => ({
    id: 'harbor-door-' + i, clock: 'scene', seed: 5120 + i * 7, looks: HARBOR_RIDERS.map((_, k) => String(k)), speed: 9,
    spawn: { kind: 'trip', vehicle: 'line0-harbor', count: 3, on: 0.8, window: [-78, -24] },
    route: [
      { kind: 'walk', zone: 'glide', x: HARBOR_STAIRS.foot, h: 0 },
      { kind: 'walk', zone: 'glide', x: HARBOR_STAIRS.top, h: HARBOR_STAIRS.deck },
      { kind: 'board', zone: 'glide', x: door, h: HARBOR_STAIRS.deck, vehicle: 'line0-harbor', slots: 3, spacing: 10, gap: 0.45 },
    ],
  } satisfies FlowSource));
}

/** The viaduct, the station, the tower's portal, the train above ground, the tunnel's headwall: drawn on the back line, above it only. */
export function drawLine0(x: CanvasRenderingContext2D, c: CoastView, L: Lines) {
  // with the eastbound train (the glide since 2026-10-22) the viaduct goes on over the bay bridge to the raised Harbor Station
  const harbor = c.train !== undefined, eastEnd = harbor ? HARBOR_STATION[0] - 20 : PLACES.station[0];
  const left = c.sx(PLACES.portal + 40), right = c.sx(eastEnd - 20);
  if (left > c.W + 200 || right < -200) return;
  const o0 = c.sx(0);
  x.save(); x.beginPath(); x.rect(-10, -4000, c.W + 20, L.BACK + 4000); x.clip();
  // the viaduct: from the station to the ramp's foot (its height in scene units in its frame)
  const a = (Math.max(-60, c.sx(PLACES.portal + 60)) - o0) / S, b = (Math.min(c.W + 60, c.sx(eastEnd)) - o0) / S;
  if (b > a) placed(x, R(o0), L.BACK, S, () => drawViaduct(x, a, b, { t: c.f, still: c.still, fill: '#1c1418', height: (fx) => railH(-fx * S) / S }));
  // the station: the platform at track height, its canopy, the stairs down to the plaza, the board, people waiting
  station(x, c, L);
  if (harbor) {
    platform(x, c, L, HARBOR_STATION, '0 · HARBOR', 'HARBOR', 'ARRIVING', false);
    // the train in from Downtown, eastbound: up out of the headwall, along the viaduct, braking into the Harbor Station
    const pa = Math.max(-200, c.sx(PLACES.portal)); x.save(); x.beginPath(); x.rect(pa, -4000, c.W + 200 - pa, L.BACK + 4000); x.clip();
    eastbound(x, c, c.train!, (X) => L.BACK - railH(X));
    x.restore();
    // its crowd on the platform's near edge, in front of the train: up the stairs, along to a door, queueing, stepping in
    for (const [id, pose] of Object.entries(c.actors)) {
      const at = id.startsWith('harbor.') ? flowPlace(pose) : undefined;
      if (!at) continue;
      const s = c.sx(at.x);
      if (!visiblePoint(c, s, 60)) continue;
      placed(x, R(s), R(L.BACK - at.h), S, () => paintOpeningActor(x, frameView(c.f, c.lighting), pose, id));
    }
  }
  // the tower's portal (the tower itself is the street's, town.ts): a lit opening behind the track
  const ts = c.sx(PORTAL_TOWER.X) - PORTAL_TOWER.w * S;
  if (ts < c.W + 40 && ts + PORTAL_TOWER.w * S > -40) placed(x, R(c.sx(TOWER_X)), L.BACK, S, () => drawWallPortal(x, 120 / S, { t: c.f, still: c.still }));
  // the train above ground: out of the portal, along the viaduct, down the ramp; hidden inside the tower and past the headwall
  const nose = noseAt(c.gt);
  if (!harbor && nose > TOWER_X - 125) {
    x.save(); x.beginPath(); x.rect(c.sx(PLACES.portal), -4000, c.sx(TOWER_X - 120) - c.sx(PLACES.portal), L.BACK + 4000); x.clip();
    train(x, c, nose, (X) => L.BACK - railH(X), false);
    x.restore();
  }
  // the headwall where it dives under the street
  const ps = c.sx(PLACES.portal);
  if (ps > -80 && ps < c.W + 80) placed(x, R(ps), L.BACK, S, () => drawTunnelPortal(x, { t: c.f, still: c.still }));
  x.restore();
}

/** The Galleria's LINE 0 station: a platform on the viaduct, its canopy, stairs, the board, the plate, three people waiting. */
function station(x: CanvasRenderingContext2D, c: CoastView, L: Lines) { platform(x, c, L, PLACES.station, '0 · GALLERIA', 'DOWNTOWN', '2 MIN', true); }

/** A LINE 0 platform on the viaduct from X0 (east) to X1 (west): slab, canopy, stairs at its east end, plate, board; the Galleria's has its people. */
function platform(x: CanvasRenderingContext2D, c: CoastView, L: Lines, [X0, X1]: [number, number], plate: string, next: string, when: string, people: boolean) {
  const a = R(c.sx(X1)), b = R(c.sx(X0)), d = R(L.BACK - LINE0.deck * S);
  if (b < -60 || a > c.W + 60) return;
  // the platform slab and its edge line, the canopy on two posts
  x.fillStyle = '#241a22'; x.fillRect(a, d, b - a, 6); x.fillStyle = 'rgba(255,200,60,.55)'; x.fillRect(a, d, b - a, 1);
  x.fillStyle = '#1a1218'; x.fillRect(a + 4, d - 44, 2, 44); x.fillRect(b - 6, d - 44, 2, 44); x.fillRect(a - 2, d - 46, b - a + 4, 4);
  x.fillStyle = 'rgba(255,240,210,.8)'; x.fillRect(a + 2, d - 42, b - a - 4, 1);
  const g = x.createLinearGradient(0, d - 42, 0, d); g.addColorStop(0, 'rgba(255,220,170,.18)'); g.addColorStop(1, 'rgba(255,220,170,0)'); x.fillStyle = g; x.fillRect(a, d - 42, b - a, 42);
  // the stairs down to the plaza on its east end
  x.fillStyle = '#1a1218'; for (let i = 0; i < 9; i++) x.fillRect(b + i * 3, d + 4 + i * ((L.BACK - d) / 9), 4, 2);
  // the plate and the board under the canopy: where the next train goes, and when
  x.fillStyle = '#0d0705'; x.fillRect(R((a + b) / 2) - 22, d - 58, 44, 9); x.strokeStyle = 'rgba(' + ORANGE + ',.7)'; x.lineWidth = 1; x.strokeRect(R((a + b) / 2) - 21.5, d - 57.5, 43, 8);
  x.save(); x.font = '600 4px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + ORANGE + ',.95)'; x.fillText(plate, R((a + b) / 2), d - 53); x.restore();
  x.fillStyle = '#050302'; x.fillRect(a + 8, d - 36, 22, 7);
  const blink = c.still || Math.floor(c.f / 40) % 2 === 0;
  x.save(); x.font = '600 2.6px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + PAPER + ',.9)'; x.fillText(next, a + 19, d - 34.2); x.fillStyle = blink ? 'rgba(255,190,60,.95)' : 'rgba(255,190,60,.5)'; x.fillText(when, a + 19, d - 31.2); x.restore();
  if (people) for (const w of WAITING) { const s = c.sx(w.X); placed(x, R(s), d, S, () => paintOpeningActor(x,frameView(c.f,c.lighting),c.actors['line0.'+WAITING.indexOf(w)],'line0.'+WAITING.indexOf(w))); }
}

/** The three cars from the nose back along the line, each on the rail under both its bogies; `floor(X)` is the rail's screen y. */
function train(x: CanvasRenderingContext2D, c: CoastView, nose: number, floor: (X: number) => number, under: boolean) {
  for (let k = 0; k < 3; k++) {
    const Xw = nose - k * (CAR_L + GAP), Xe = Xw - CAR_L, Xa = Xw - 40 * S, Xb = Xe + 40 * S;
    const ax = c.sx(Xa), bx = c.sx(Xb);
    if (Math.max(ax, bx) < -40 || Math.min(ax, bx) > c.W + 40) continue;
    const ay = floor(Xa), by = floor(Xb), mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(by - ay, bx - ax);
    x.save(); x.translate(mx, my); x.rotate(ang); x.scale(S, S); x.translate(-METRO.len / 2, 0);
    drawBogies(x, METRO.len);
    drawMetroCar(x, 0, (h) => -h, { t: c.f, c: k, seed: 77, dest: 'DOWNTOWN', ox: Xw, plate: k === 2 ? 'CAR 3' : undefined, still: c.still });
    x.restore();
  }
  // the headlight's beam on the line ahead
  const hx = c.sx(nose), hy = floor(nose) - 12;
  if (hx > -60 && hx < c.W + 60) { const g = x.createRadialGradient(hx, hy, 2, hx, hy, 60); g.addColorStop(0, 'rgba(255,230,190,' + (under ? 0.32 : 0.22) + ')'); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.fillRect(hx - 70, hy - 60, 80, 120); }
}

/** Two cars running east (the nose at the east end, smaller X), each flipped so its lead faces east; its boards still read. */
function eastbound(x: CanvasRenderingContext2D, c: CoastView, nose: number, floor: (X: number) => number) {
  const xr = readableMirror(x);
  for (let k = 0; k < 2; k++) {
    const Xe = nose + k * (CAR_L + GAP), Xw = Xe + CAR_L, Xa = Xw - 40 * S, Xb = Xe + 40 * S;
    const ax = c.sx(Xa), bx = c.sx(Xb);
    if (Math.max(ax, bx) < -40 || Math.min(ax, bx) > c.W + 40) continue;
    const ay = floor(Xa), by = floor(Xb), mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(by - ay, bx - ax);
    x.save(); x.translate(mx, my); x.rotate(ang); x.scale(-S, S); x.translate(-METRO.len / 2, 0);
    drawBogies(xr, METRO.len);
    drawMetroCar(xr, 0, (h) => -h, { t: c.f, c: k, seed: 78, dest: 'HARBOR', ox: Xe, plate: k === 1 ? 'CAR 2' : undefined, still: c.still });
    x.restore();
  }
  const hx = c.sx(nose), hy = floor(nose) - 12;
  if (hx > -60 && hx < c.W + 60) { const g = x.createRadialGradient(hx, hy, 2, hx, hy, 60); g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.fillRect(hx - 60, hy - 60, 120, 120); }
}

/**
 * Under the street (drawn last of the near coast, when the camera drops): the ground in section from
 * the street's front edge down, the bore with the train in it, the canal below. `drop` is how far the
 * camera has gone down (view units); nothing is drawn before it starts.
 */
export function drawUnder(x: CanvasRenderingContext2D, c: CoastView, L: Lines, drop: number) {
  if (drop <= 0.5) return;
  const top = L.ROAD1 + R(5 * L.k), o0 = c.sx(0);
  const a = (-20 - o0) / S, b = (c.W + 20 - o0) / S, fxPortal = -PLACES.portal / S;
  // the piles under the towers above (town.ts's street row) at fixed places
  const piles: number[] = []; for (let X = 3600; X < 5200; X += 140) piles.push(-(X + 40) / S);
  placed(x, R(o0), top, S, () => {
    drawGroundSection(x, a, b, { seed: 17, depth: DEPTH, piles, clear: [[BORE_FLOOR - LINE0.bore - 24, BORE_FLOOR + 20], [WATER - 380, DEPTH]] });
    // LINE 0's bore west of the headwall, its end wall at the portal
    const ba = a, bb = Math.min(b, fxPortal);
    if (bb > ba) {
      x.save(); x.translate(0, BORE_FLOOR);
      drawBore(x, ba, bb, { t: c.f, still: c.still });
      x.fillStyle = '#2e2428'; x.fillRect(fxPortal, -LINE0.bore - 18, 40, LINE0.bore + 36);
      x.restore();
    }
    // the Undercity's canal: a vaulted stretch of it, far below
    const ca = -CANAL[1] / S, cb = -CANAL[0] / S;
    if (cb > a && ca < b) { x.save(); x.beginPath(); x.rect(ca, WATER - 420, cb - ca, DEPTH); x.clip(); x.translate(ca, WATER); drawCanalGlimpse(x, cb - ca, { t: c.f, still: c.still, boatX:(cb-ca)*.5,boatPose:c.actors.canal,lighting:c.lighting }); x.restore(); }
    // the dark under it all
    x.fillStyle = '#040203'; x.fillRect(a, DEPTH, b - a, 2000);
  });
  // the train in the bore: the same cars at the same place along the line, flat on the bore's floor
  const nose = noseAt(c.gt), floorY = top + BORE_FLOOR * S;
  if (nose > PLACES.portal) {
    x.save(); x.beginPath(); x.rect(-10, top + (BORE_FLOOR - LINE0.bore) * S, c.sx(PLACES.portal) + 10, LINE0.bore * S); x.clip();
    train(x, c, nose, () => floorY, true);
    x.restore();
  }
  // where the ground is cut: a thin line of light along the street's edge
  x.fillStyle = 'rgba(255,170,110,.35)'; x.fillRect(0, top, c.W, 1);
}
