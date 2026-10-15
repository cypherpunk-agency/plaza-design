/**
 * LINE 0 in motion: the train you wait for on a platform, and the ride you take
 * in it. A loop: DOWNTOWN → GALLERIA → HARBOR → DOWNTOWN, round and round.
 *
 * - On a platform, each station's train runs on its own clock (TIMETABLE): it
 *   pulls in from the right, stands with its doors open for a few seconds, pulls
 *   out to the left, and the next one is due. The departure board counts down.
 * - On board, `ride` is the train you are on: it stands at a stop (doors open),
 *   closes, runs along the track to the next stop, opens. `pos` is where it is
 *   on the loop, in track units, and slides the world past the windows (train.ts).
 *
 * Timings are in frames (60 a second). The engine owns no metro state of its
 * own: it boards, steps out, and calls `stepRide` once a frame in the car.
 */

import { LINE, STATIONS, type Station } from '../city';
import { box, O, onScreen, PAPER, tell, text, type View } from './kit';
import { crowd } from './riders';
import { CAR, drawTrainCar } from '../sets/train-car';

// ---------- the platforms ----------

/** A platform's rhythm: the train runs in, stands with its doors open, runs out, and the next one is due `loop` frames after the last. */
export const TIMETABLE = { loop: 1500, arrive: 280, dwell: 460, leave: 280 };
/** The three platforms are not in step: each clock starts this far along. */
const OFFSET: Record<Station, number> = { downtown: 0, galleria: 520, harbor: 1010 };
/** Shifts a platform's clock so the train you stepped off stands there (`platformSync`). */
const shift: Record<Station, number> = { downtown: 0, galleria: 0, harbor: 0 };

/** Where the train's nose stops at every platform (track x, in the track's parallax), so the doors fall in the same places. */
export const STOP = 150;
/** The train on a platform, drawn in the track's parallax: cars, their length, the gap, which window bays are doors. */
export const TRAIN = { cars: 3, car: CAR.len, gap: 8, track: 0.94, doorBays: CAR.doorBays, bay: CAR.bay, bay0: CAR.bay0, bayW: CAR.bayW };

const phaseOf = (st: Station, t: number) => {
  const L = TIMETABLE.loop;
  return (((t + OFFSET[st] + shift[st]) % L) + L) % L;
};

/** Where the train's nose is (track x), how open its doors are (0..1), whether it is moving; null between trains. `stop` is where the nose stops. */
export function platformTrain(st: Station, t: number, stop: number): { x: number; open: number; moving: boolean } | null {
  const T = TIMETABLE, ph = phaseOf(st, t);
  // a closed station: the train runs straight through, doors shut, at speed
  if (!lineOpen[st]) { const all = T.arrive + T.dwell + T.leave, f = ph / all; return f < 1 ? { x: stop + 2600 - 5600 * f, open: 0, moving: true } : null; }
  if (ph < T.arrive) { const f = ph / T.arrive; return { x: stop + 1900 * (1 - f) * (1 - f), open: 0, moving: true }; }
  if (ph < T.arrive + T.dwell) { const f = (ph - T.arrive) / T.dwell; return { x: stop, open: Math.min(1, Math.min(f, 1 - f) * 8), moving: false }; }
  if (ph < T.arrive + T.dwell + T.leave) { const f = (ph - T.arrive - T.dwell) / T.leave; return { x: stop - 2300 * f * f, open: 0, moving: true }; }
  return null;
}

/** True while the train stands at the platform with its doors open: you can board. */
export function platformOpen(st: Station, t: number) {
  const at = platformTrain(st, t, 0);
  return !!at && !at.moving && at.open > 0.6;
}

/** Frames before the doors start to close (0 when they are not open). */
export function platformLeft(st: Station, t: number) {
  if (!platformOpen(st, t)) return 0;
  const T = TIMETABLE;
  return Math.max(0, T.arrive + T.dwell * (7 / 8) - phaseOf(st, t));
}

/** Frames until the next train stands at the platform (0 while one does). */
export function platformDue(st: Station, t: number) {
  const T = TIMETABLE, ph = phaseOf(st, t);
  if (!lineOpen[st]) return Infinity;
  if (ph >= T.arrive && ph < T.arrive + T.dwell) return 0;
  return ph < T.arrive ? T.arrive - ph : T.loop - ph + T.arrive;
}

/** Puts the train at the platform with its doors open, `left` frames before they close: the train you just stepped off. */
export function platformSync(st: Station, t: number, left: number) {
  const T = TIMETABLE, L = T.loop, want = T.arrive + T.dwell * (7 / 8) - Math.max(30, Math.min(T.dwell * 0.75 - 30, left));
  shift[st] = (((want - t - OFFSET[st]) % L) + L) % L;
}

/**
 * The open doors' positions in the player's world x. The train stands in the
 * track's parallax, so its doors line up with the player a little further along
 * the more the camera has moved.
 */
export function platformDoors(st: Station, t: number, cam: number, stop: number): number[] {
  const at = platformTrain(st, t, stop);
  if (!at || at.moving || at.open <= 0.6) return [];
  const T = TRAIN, out: number[] = [];
  for (let c = 0; c < T.cars; c++) for (const i of T.doorBays) out.push(at.x + c * (T.car + T.gap) + T.bay0 + i * T.bay + T.bayW / 2 + cam * (1 - T.track));
  return out;
}

/**
 * Which stations LINE 0 stops at. The harbor is closed until P14 (city.ts `harborOpen`): the
 * train runs straight past it, and its platform's trains pass without stopping. game.ts sets
 * this from the save every frame.
 */
export const lineOpen: Record<Station, boolean> = { downtown: true, galleria: true, harbor: true };

/** The stop after this one on the loop that the train stops at (a closed station is passed). */
export const nextStation = (st: Station): Station => {
  let i = LINE.indexOf(st);
  for (let k = 0; k < LINE.length; k++) { i = (i + 1) % LINE.length; if (lineOpen[LINE[i]]) return LINE[i]; }
  return st;
};

/** Which train this is at a platform (one more every loop), so each brings different riders. */
const trainNo = (st: Station, t: number) => Math.floor((t + OFFSET[st] + shift[st]) / TIMETABLE.loop);

/**
 * The people waiting on a platform: which train they wait for (a new crowd
 * gathers after each one leaves), and whether they have got on (from half way
 * through the doors' open time until the train has gone).
 */
export function platformQueue(st: Station, t: number): { train: number; boarded: boolean } {
  const T = TIMETABLE, ph = phaseOf(st, t), n = trainNo(st, t), gone = T.arrive + T.dwell + T.leave;
  return { train: ph >= gone ? n + 1 : n, boarded: ph >= T.arrive + T.dwell * 0.5 && ph < gone };
}

/** The train at a platform: three cars (sets/train-car.ts), lit windows with riders, doors that slide open, the headlight while it moves, its destination on the front. */
export function drawPlatformTrain(x: CanvasRenderingContext2D, v: View, st: Station, stop: number) {
  const at = platformTrain(st, v.t, stop);
  if (!at) return;
  const { y } = v, T = TRAIN, nose = v.sx(at.x, T.track), riders = crowd(1000 + trainNo(st, v.t) * 7 + OFFSET[st], T.cars * 6);
  if (at.moving) {
    const g = x.createRadialGradient(nose, y(40), 2, nose, y(40), 120);
    g.addColorStop(0, 'rgba(255,230,190,.2)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    x.fillStyle = g; x.fillRect(nose - 120, y(160), 240, 160);
  }
  for (let c = 0; c < T.cars; c++) {
    const c0 = nose + c * (T.car + T.gap);
    if (!onScreen(v, c0, T.car)) continue;
    drawTrainCar(x, c0, y, { t: v.t, c, riders, open: at.open, dest: STATIONS[nextStation(st)].name });
  }
}

/** m:ss for a count of frames. */
export const clock = (frames: number) => { const s = Math.max(0, Math.ceil(frames / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/** What the line's tickers scroll between the times: the operator's notices and the Registry's. Dry: the signs never joke. */
export const TICKER = [
  'LINE 0 · DELAYS POSSIBLE · NO REASON WILL BE GIVEN',
  'IDENTITY CHECK AT ALL EXITS',
  'UNREGISTERED PASSENGERS WILL BE REMOVED AT THE NEXT STOP',
  'ALL JOURNEYS ARE RECORDED',
  'KEEP YOUR REGISTRY ID VISIBLE',
  'DO NOT HOLD THE DOORS',
];

/**
 * A scrolling LED line between `left` and `left + w` at screen y `cy`: `lead`
 * first (a stop, a time), then the ticker's messages, round and round.
 */
export function ticker(x: CanvasRenderingContext2D, t: number, left: number, cy: number, w: number, lead: string, alpha = 0.8) {
  const msg = (lead ? lead + '   ·   ' : '') + TICKER.join('   ·   ') + '   ·   ';
  x.save(); x.beginPath(); x.rect(left, cy - 6, w, 12); x.clip();
  x.font = '600 7px "IBM Plex Mono", monospace'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,136,0,' + alpha + ')';
  const len = x.measureText(msg).width, off = (t * 0.5) % len;
  x.fillText(msg, Math.round(left + w - off), cy); x.fillText(msg, Math.round(left + w - off + len), cy);
  x.restore();
}

/**
 * The departure board, hung on two rods from `roof` (a height) down to `h`:
 * where the next train goes, then a countdown to it (BOARDING while the doors
 * are open, CLOSING just before they shut), and a ticker under it. Amber dots:
 * information, nothing to use.
 */
export function drawDepartures(x: CanvasRenderingContext2D, v: View, st: Station, wx: number, h: number, roof: number) {
  const { y, t } = v, bx = v.sx(wx);
  if (!onScreen(v, bx - 62, 124)) return;
  x.strokeStyle = 'rgba(' + O + ',.5)'; x.beginPath();
  x.moveTo(bx - 40.5, y(roof)); x.lineTo(bx - 40.5, y(h)); x.moveTo(bx + 40.5, y(roof)); x.lineTo(bx + 40.5, y(h)); x.stroke();
  box(x, bx - 58, y(h), 116, 42, '#050302', 'rgba(' + O + ',.7)');
  if (!lineOpen[st]) {
    // a closed station: no destination, no countdown
    text(x, 'LINE 0 · ' + STATIONS[st].name, bx, y(h - 8), 'rgba(' + PAPER + ',.8)', 7, '600');
    text(x, 'STATION CLOSED', bx, y(h - 20), 'rgba(255,90,80,.9)', 9, '600');
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(bx - 54, y(h - 28), 108, 1);
    ticker(x, t, bx - 54, y(h - 35), 108, 'TRAINS DO NOT STOP AT THIS STATION · NO REASON WILL BE GIVEN', 0.55);
    tell(x, t, bx + 52, y(h - 4));
    return;
  }
  text(x, 'LINE 0 > ' + STATIONS[nextStation(st)].name, bx, y(h - 8), 'rgba(' + PAPER + ',.8)', 7, '600');
  const left = platformLeft(st, t), due = platformDue(st, t);
  const msg = due > 0 ? (platformTrain(st, t, 0) && due > TIMETABLE.arrive ? 'DEPARTED' : 'DUE IN ' + clock(due)) : left > 0 && left < 100 ? 'CLOSING' : left > 0 ? 'BOARDING' : 'DEPARTING';
  const hot = msg === 'BOARDING' || msg === 'CLOSING';
  text(x, msg, bx, y(h - 20), 'rgba(255,136,0,' + (hot ? 0.75 + 0.25 * Math.sin(t * 0.15) : 0.9) + ')', 9, '600');
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(bx - 54, y(h - 28), 108, 1);
  ticker(x, t, bx - 54, y(h - 35), 108, due > 0 ? 'NEXT METRO ' + clock(due) : '', 0.55);
  tell(x, t, bx + 52, y(h - 4));
}
// ---------- the ride ----------

/** On board: how long the doors stand open at a stop, take to close and open, and the run between two stops. */
export const DWELL = 330, CLOSE = 36, RUN = 780, OPEN = 36;
/** Track units between two stops; the loop is three of them. */
export const SEG = 3000, LOOP = SEG * 3;
/** A run past a closed station (two stops' worth of track) takes this much longer than one stop's run, not twice. */
const LONG_RUN = 1.6;

/**
 * Along the loop, in track units from Downtown's platform: where the tunnel under the mall starts
 * coming from Downtown (`position` raises `tunnel` there), and the old siding before the harbor,
 * on no map (P14): a stub of platform with a service stair up to the pier. It flashes past in
 * under a second.
 */
export const TUNNEL_IN = SEG - 470;
export const SIDING = 2 * SEG - 650;
/**
 * The emergency brake (P14): how hard it brakes (track units per frame², a long train: about 900
 * units from full speed), how close to the siding a stop must come to count as at it (the brake
 * then lands it exactly), how hard the train gets going again, and how early `position` raises
 * `harbor siding` (track units of stop point before the siding: the tick and the cable take up
 * to ~0.4 s to pull the brake).
 */
export const BRAKE = { decel: 0.032, window: 260, accel: 0.05, lead: 110 };
/** Frames the train stands after an emergency stop: on the track, at the siding, at the siding with its doors open. */
export const HALT = { track: 240, siding: 420, open: 2400 };

export type RidePhase = 'dwell' | 'closing' | 'running' | 'opening' | 'braking' | 'halted' | 'resuming';

/**
 * The train you are on. `at`: index into LINE of the stop it stands at (or last left); `to`: the
 * stop it runs to (past a closed one). `timer`: frames into the phase. `dwell`: this stop's dwell
 * (short when you boarded late). `pos`: where it is on the loop; `d`: how far along this run,
 * `span` the run's length, `frames` its time. `v`: its speed while it brakes or gets going again.
 * `open`: the doors, 0..1; `doors`: let open while it stands between stations (P14). `halt`: where
 * an emergency stop stopped it, `haltFor` for how long; `decel` this stop's braking. `say`: what
 * the announcement display shows.
 */
export const ride = {
  at: 0, to: 1, phase: 'dwell' as RidePhase, timer: 0, dwell: DWELL, pos: 0, d: 0, span: SEG, frames: RUN, v: 0,
  open: 1, doors: false, halt: null as null | 'track' | 'siding', haltFor: 0, decel: BRAKE.decel, say: 'DOWNTOWN',
};

/** The stop the train stands at (or last left), and the one it runs to next. */
export const rideStop = (): Station => LINE[ride.at];
export const rideNext = (): Station => (between() ? LINE[ride.to] : nextStation(rideStop()));
/** Moving, or standing between stations after an emergency stop. */
export const between = () => ride.phase === 'running' || ride.phase === 'braking' || ride.phase === 'halted' || ride.phase === 'resuming';
/** Standing at the old siding after an emergency stop (P14). */
export const rideAtSiding = () => ride.phase === 'halted' && ride.halt === 'siding';
/** The doors are open far enough to step through: at a stop, or at the siding once they were let open. */
export const rideOpen = () => (ride.phase === 'dwell' || ride.phase === 'opening' || (rideAtSiding() && ride.doors)) && ride.open > 0.6;
/** Frames before the doors start to close (for the platform you step out onto). */
export const rideLeft = () => (ride.phase === 'dwell' ? Math.max(0, ride.dwell - ride.timer) : ride.phase === 'opening' ? ride.dwell : 0);
/** Frames until the doors open at the next stop (0 while they are open or opening; a guess while it stands between stations). */
export const rideDue = () => {
  const r = ride;
  if (r.phase === 'dwell') return Math.max(0, r.dwell - r.timer) + CLOSE + RUN + OPEN;
  if (r.phase === 'closing') return Math.max(0, CLOSE - r.timer) + RUN + OPEN;
  if (r.phase === 'running') return Math.max(0, r.frames - r.timer) + OPEN;
  if (between()) return (r.phase === 'halted' ? Math.max(0, r.haltFor - r.timer) : 0) + r.frames * (1 - r.d / r.span) + OPEN;
  return 0;
};
/** How far along the run to the next stop, 0..1 (0 while standing at a stop). */
export const rideRun = () => (between() ? Math.min(1, ride.d / ride.span) : 0);
/** The siding, in track units along this run, or null when this run does not pass it. */
export const sidingAlong = () => { const d = (((SIDING - ride.at * SEG) % LOOP) + LOOP) % LOOP; return d > 0 && d < ride.span ? d : null; };

/** You board at `st`; the doors stay open `left` more frames. */
export function boardRide(st: Station, left: number) {
  const at = LINE.indexOf(st);
  Object.assign(ride, { at, to: LINE.indexOf(nextStation(st)), phase: 'dwell', timer: 0, dwell: Math.max(120, left), pos: at * SEG, d: 0, v: 0, open: 1, doors: false, halt: null, say: STATIONS[st].name });
}

/** The train's speed now, track units a frame: on its run's curve, or braking / getting going. */
export function rideSpeed() {
  const r = ride;
  if (r.phase === 'braking' || r.phase === 'resuming') return r.v;
  if (r.phase !== 'running') return 0;
  return (r.span * Math.PI / (2 * r.frames)) * Math.sin(Math.PI * Math.min(1, r.timer / r.frames));
}
/** Where the train would come to a stand if the brake were pulled now (track units along this run), or null while it is not moving. */
export const rideStopsAt = () => (ride.phase === 'running' || ride.phase === 'resuming' ? ride.d + rideSpeed() ** 2 / (2 * BRAKE.decel) : null);

/**
 * The emergency brake, pulled (P14): the train brakes where it is. If it would come to a stand
 * within `BRAKE.window` of the old siding, it brakes to stand exactly at it. Says where it is going
 * to stop, or why it does not brake.
 */
export function brakeRide(): 'siding' | 'track' | 'standing' | 'braking' {
  const r = ride;
  if (r.phase === 'braking') return 'braking';
  if (r.phase !== 'running' && r.phase !== 'resuming') return 'standing';
  const v = rideSpeed(), stop = r.d + v * v / (2 * BRAKE.decel), at = sidingAlong();
  r.v = v; r.phase = 'braking'; r.timer = 0; r.doors = false; r.say = 'EMERGENCY STOP';
  if (at !== null && Math.abs(stop - at) <= BRAKE.window && at - r.d > 30) { r.decel = v * v / (2 * (at - r.d)); r.halt = 'siding'; }
  else { r.decel = BRAKE.decel; r.halt = 'track'; }
  return r.halt;
}

/** The doors while the train stands between stations: let open (only at the siding, where there is a platform), or not. */
export function rideDoors(open: boolean) {
  const r = ride;
  r.doors = open && rideAtSiding();
  if (r.doors) r.haltFor = Math.max(r.haltFor, r.timer + HALT.open);
}

/** The loop position from how far along this run it is. */
const place = () => { ride.pos = (ride.at * SEG + ride.d) % LOOP; };

/** The run is over: it stands at its stop and opens. */
function arrive(): 'arrive' {
  const r = ride;
  Object.assign(r, { at: r.to, d: 0, v: 0, halt: null, doors: false, phase: 'opening', timer: 0, dwell: DWELL });
  r.pos = r.at * SEG;
  r.say = STATIONS[rideStop()].name;
  return 'arrive';
}

/**
 * One frame of the ride. Returns 'depart' as the doors shut and it pulls out, 'arrive' as it
 * stops at the next station, 'pass' as it runs through a closed one, 'halt' as an emergency stop
 * stands it still, 'resume' as it gets going again.
 */
export function stepRide(dt: number): 'depart' | 'arrive' | 'pass' | 'halt' | 'resume' | null {
  const r = ride;
  r.timer += dt;
  if (r.phase === 'dwell') {
    r.open = 1;
    if (r.timer >= r.dwell) { r.phase = 'closing'; r.timer = 0; r.say = 'DOORS CLOSING'; }
    return null;
  }
  if (r.phase === 'closing') {
    r.open = Math.max(0, 1 - r.timer / CLOSE);
    if (r.timer < CLOSE) return null;
    // the run: to the next stop the train stops at, straight past a closed one
    const to = nextStation(rideStop()), segs = ((LINE.indexOf(to) - r.at + LINE.length - 1) % LINE.length) + 1;
    Object.assign(r, { phase: 'running', timer: 0, open: 0, to: LINE.indexOf(to), d: 0, span: segs * SEG, frames: Math.round(RUN * (segs > 1 ? LONG_RUN : 1)), halt: null, doors: false });
    r.say = 'NEXT: ' + STATIONS[to].name;
    return 'depart';
  }
  if (r.phase === 'running') {
    const f = Math.min(1, r.timer / r.frames), before = r.d;
    r.d = r.span * (1 - Math.cos(Math.PI * f)) / 2;
    place();
    if (f >= 1) return arrive();
    // a closed station on the way: it goes past the window
    for (let k = 1; k * SEG < r.span; k++) if (before < k * SEG && r.d >= k * SEG) return 'pass';
    return null;
  }
  if (r.phase === 'braking') {
    r.v = Math.max(0, r.v - r.decel * dt);
    r.d = Math.min(r.span, r.d + r.v * dt);
    const at = r.halt === 'siding' ? sidingAlong() : null;
    if (at !== null && r.d >= at) { r.d = at; r.v = 0; }
    place();
    if (r.d >= r.span) return arrive();
    if (r.v > 0) return null;
    r.phase = 'halted'; r.timer = 0; r.haltFor = r.halt === 'siding' ? HALT.siding : HALT.track;
    r.say = r.halt === 'siding' ? 'STOPPED · NOT A STATION' : 'STOPPED · PLEASE WAIT';
    return 'halt';
  }
  if (r.phase === 'halted') {
    r.open = r.doors ? Math.min(1, r.open + dt / OPEN) : Math.max(0, r.open - dt / CLOSE);
    if (r.timer >= r.haltFor) r.doors = false;
    if (r.timer < r.haltFor || r.open > 0) return null;
    r.phase = 'resuming'; r.timer = 0; r.v = 0; r.halt = null;
    r.say = 'NEXT: ' + STATIONS[LINE[r.to]].name;
    return 'resume';
  }
  if (r.phase === 'resuming') {
    // it gets going until it is back up to its run's speed for where it is, then runs on
    const f = Math.acos(1 - 2 * Math.min(1, r.d / r.span)) / Math.PI;
    const curve = (r.span * Math.PI / (2 * r.frames)) * Math.sin(Math.PI * f);
    r.v = Math.min(curve, r.v + BRAKE.accel * dt);
    r.d = Math.min(r.span, r.d + Math.max(0.3, r.v) * dt);
    place();
    if (r.d >= r.span) return arrive();
    if (r.v >= curve) { r.phase = 'running'; r.timer = f * r.frames; }
    return null;
  }
  r.open = Math.min(1, r.timer / OPEN);
  if (r.timer >= OPEN) { r.phase = 'dwell'; r.timer = 0; }
  return null;
}
