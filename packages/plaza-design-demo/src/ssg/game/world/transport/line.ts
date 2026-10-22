import {validateMetroSnapshot,type MetroSnapshot,type MetroRide} from './metro-snapshot';
export type {RidePhase} from './metro-snapshot';
import {METRO_SOURCE,validateMetroSource,type MetroSource} from './metro-source';
import { PLATFORM_TRAIN, type PlatformTrainVisual } from '../../art/vehicles/rail';

import type { DepartureVisual } from '../../art/signage/line-departures';
import * as defaultCity from '../city';
import type {CityModel,Station} from '../city';



/** One metro session per game/private Play; the legacy facade serves standalone previews. */
export function createLineSystem(world:CityModel=defaultCity,source:MetroSource=METRO_SOURCE){
 const config=validateMetroSource(source);
 const {LINE,STATIONS}=world;


// ---------- the platforms ----------

/** A platform's rhythm: the train runs in, stands with its doors open, runs out, and the next one is due `loop` frames after the last. */
const TIMETABLE = config.timetable;

/** The three platforms are not in step: each clock starts this far along. */
const OFFSET: Record<Station, number> = config.offset;

/** Shifts a platform's clock so the train you stepped off stands there (`platformSync`). */
const shift: Record<Station, number> = { downtown: 0, galleria: 0, harbor: 0 };


/** Where the train's nose stops at every platform (track x, in the track's parallax), so the doors fall in the same places. */
const STOP = 150;

/** The train on a platform, drawn in the track's parallax: cars, their length, the gap, which window bays are doors. */
const TRAIN = PLATFORM_TRAIN;


const phaseOf = (st: Station, t: number) => {
  const L = TIMETABLE.loop;
  return (((t + OFFSET[st] + shift[st]) % L) + L) % L;
};


/** Where the train's nose is (track x), how open its doors are (0..1), whether it is moving; null between trains. `stop` is where the nose stops. */
function platformTrain(st: Station, t: number, stop: number): { x: number; open: number; moving: boolean } | null {
  const T = TIMETABLE, ph = phaseOf(st, t);
  // a closed station: the train runs straight through, doors shut, at speed
  if (!lineOpen[st]) { const all = T.arrive + T.dwell + T.leave, f = ph / all; return f < 1 ? { x: stop + 2600 - 5600 * f, open: 0, moving: true } : null; }
  if (ph < T.arrive) { const f = ph / T.arrive; return { x: stop + 1900 * (1 - f) * (1 - f), open: 0, moving: true }; }
  if (ph < T.arrive + T.dwell) { const f = (ph - T.arrive) / T.dwell; return { x: stop, open: Math.min(1, Math.min(f, 1 - f) * 8), moving: false }; }
  if (ph < T.arrive + T.dwell + T.leave) { const f = (ph - T.arrive - T.dwell) / T.leave; return { x: stop - 2300 * f * f, open: 0, moving: true }; }
  return null;
}


/** True while the train stands at the platform with its doors open: you can board. */
function platformOpen(st: Station, t: number) {
  const at = platformTrain(st, t, 0);
  return !!at && !at.moving && at.open > 0.6;
}


/** Frames before the doors start to close (0 when they are not open). */
function platformLeft(st: Station, t: number) {
  if (!platformOpen(st, t)) return 0;
  const T = TIMETABLE;
  return Math.max(0, T.arrive + T.dwell * (7 / 8) - phaseOf(st, t));
}


/** Frames until the next train stands at the platform (0 while one does). */
function platformDue(st: Station, t: number) {
  const T = TIMETABLE, ph = phaseOf(st, t);
  if (!lineOpen[st]) return Infinity;
  if (ph >= T.arrive && ph < T.arrive + T.dwell) return 0;
  return ph < T.arrive ? T.arrive - ph : T.loop - ph + T.arrive;
}


/** Puts the train at the platform with its doors open, `left` frames before they close: the train you just stepped off. */
function platformSync(st: Station, t: number, left: number) {
  const T = TIMETABLE, L = T.loop, want = T.arrive + T.dwell * (7 / 8) - Math.max(30, Math.min(T.dwell * 0.75 - 30, left));
  shift[st] = (((want - t - OFFSET[st]) % L) + L) % L;
}


/**
 * The open doors' positions in the player's world x. The train stands in the
 * track's parallax, so its doors line up with the player a little further along
 * the more the camera has moved.
 */
function platformDoors(st: Station, t: number, cam: number, stop: number): number[] {
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
const lineOpen: Record<Station, boolean> = { downtown: true, galleria: true, harbor: true };


/** The stop after this one on the loop that the train stops at (a closed station is passed). */
const nextStation = (st: Station): Station => {
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
function platformQueue(st: Station, t: number): { train: number; boarded: boolean } {
  const T = TIMETABLE, ph = phaseOf(st, t), n = trainNo(st, t), gone = T.arrive + T.dwell + T.leave;
  return { train: ph >= gone ? n + 1 : n, boarded: ph >= T.arrive + T.dwell * 0.5 && ph < gone };
}


/** m:ss for a count of frames. */
const clock = (frames: number) => { const s = Math.max(0, Math.ceil(frames / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };


// ---------- the ride ----------

/** On board: how long the doors stand open at a stop, take to close and open, and the run between two stops. */
const DWELL = config.dwell, CLOSE = config.close, RUN = config.run, OPEN = config.open;

/** Track units between two stops; the loop is three of them. */
const SEG = 3000, LOOP = SEG * 3;

/** A run past a closed station (two stops' worth of track) takes this much longer than one stop's run, not twice. */
const LONG_RUN = config.longRun;


/**
 * Along the loop, in track units from Downtown's platform: where the tunnel under the mall starts
 * coming from Downtown (`position` raises `tunnel` there), and the old siding before the harbor,
 * on no map (P14): a stub of platform with a service stair up to the pier. It flashes past in
 * under a second.
 */
const TUNNEL_IN = SEG - 470;

const SIDING = 2 * SEG - 650;

/**
 * The emergency brake (P14): how hard it brakes (track units per frame², a long train: about 900
 * units from full speed), how close to the siding a stop must come to count as at it (the brake
 * then lands it exactly), how hard the train gets going again, and how early `position` raises
 * `harbor siding` (track units of stop point before the siding: the tick and the cable take up
 * to ~0.4 s to pull the brake).
 */
const BRAKE = config.brake;

/** Frames the train stands after an emergency stop: on the track, at the siding, at the siding with its doors open. */
const HALT = config.halt;


/**
 * The train you are on. `at`: index into LINE of the stop it stands at (or last left); `to`: the
 * stop it runs to (past a closed one). `timer`: frames into the phase. `dwell`: this stop's dwell
 * (short when you boarded late). `pos`: where it is on the loop; `d`: how far along this run,
 * `span` the run's length, `frames` its time. `v`: its speed while it brakes or gets going again.
 * `open`: the doors, 0..1; `doors`: let open while it stands between stations (P14). `halt`: where
 * an emergency stop stopped it, `haltFor` for how long; `decel` this stop's braking. `say`: what
 * the announcement display shows.
 */
const ride:MetroRide = {
  at: 0, to: 1, phase: 'dwell', timer: 0, dwell: DWELL, pos: 0, d: 0, span: SEG, frames: RUN, v: 0,
  open: 1, doors: false, halt: null as null | 'track' | 'siding', haltFor: 0, decel: BRAKE.decel, say: STATIONS[LINE[0]].name,
};


/** The stop the train stands at (or last left), and the one it runs to next. */
const rideStop = (): Station => LINE[ride.at];

const rideNext = (): Station => (between() ? LINE[ride.to] : nextStation(rideStop()));

/** Moving, or standing between stations after an emergency stop. */
const between = () => ride.phase === 'running' || ride.phase === 'braking' || ride.phase === 'halted' || ride.phase === 'resuming';

/** Standing at the old siding after an emergency stop (P14). */
const rideAtSiding = () => ride.phase === 'halted' && ride.halt === 'siding';

/** The doors are open far enough to step through: at a stop, or at the siding once they were let open. */
const rideOpen = () => (ride.phase === 'dwell' || ride.phase === 'opening' || (rideAtSiding() && ride.doors)) && ride.open > 0.6;

/** Frames before the doors start to close (for the platform you step out onto). */
const rideLeft = () => (ride.phase === 'dwell' ? Math.max(0, ride.dwell - ride.timer) : ride.phase === 'opening' ? ride.dwell : 0);

/** Frames until the doors open at the next stop (0 while they are open or opening; a guess while it stands between stations). */
const rideDue = () => {
  const r = ride;
  if (r.phase === 'dwell') return Math.max(0, r.dwell - r.timer) + CLOSE + RUN + OPEN;
  if (r.phase === 'closing') return Math.max(0, CLOSE - r.timer) + RUN + OPEN;
  if (r.phase === 'running') return Math.max(0, r.frames - r.timer) + OPEN;
  if (between()) return (r.phase === 'halted' ? Math.max(0, r.haltFor - r.timer) : 0) + r.frames * (1 - r.d / r.span) + OPEN;
  return 0;
};

/** How far along the run to the next stop, 0..1 (0 while standing at a stop). */
const rideRun = () => (between() ? Math.min(1, ride.d / ride.span) : 0);

/** The siding, in track units along this run, or null when this run does not pass it. */
const sidingAlong = () => { const d = (((SIDING - ride.at * SEG) % LOOP) + LOOP) % LOOP; return d > 0 && d < ride.span ? d : null; };


/** You board at `st`; the doors stay open `left` more frames. */
function boardRide(st: Station, left: number) {
  const at = LINE.indexOf(st);
  Object.assign(ride, { at, to: LINE.indexOf(nextStation(st)), phase: 'dwell', timer: 0, dwell: Math.max(120, left), pos: at * SEG, d: 0, v: 0, open: 1, doors: false, halt: null, say: STATIONS[st].name });
}


/** The train's speed now, track units a frame: on its run's curve, or braking / getting going. */
function rideSpeed() {
  const r = ride;
  if (r.phase === 'braking' || r.phase === 'resuming') return r.v;
  if (r.phase !== 'running') return 0;
  return (r.span * Math.PI / (2 * r.frames)) * Math.sin(Math.PI * Math.min(1, r.timer / r.frames));
}

/** Where the train would come to a stand if the brake were pulled now (track units along this run), or null while it is not moving. */
const rideStopsAt = () => (ride.phase === 'running' || ride.phase === 'resuming' ? ride.d + rideSpeed() ** 2 / (2 * BRAKE.decel) : null);


/**
 * The emergency brake, pulled (P14): the train brakes where it is. If it would come to a stand
 * within `BRAKE.window` of the old siding, it brakes to stand exactly at it. Says where it is going
 * to stop, or why it does not brake.
 */
function brakeRide(): 'siding' | 'track' | 'standing' | 'braking' {
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
function rideDoors(open: boolean) {
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
function stepRide(dt: number): 'depart' | 'arrive' | 'pass' | 'halt' | 'resume' | null {
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


/** Immutable inputs for artwork: all timetable decisions remain in transport. */
function platformTrainVisual(st: Station, t: number, stop: number): PlatformTrainVisual | null {
  const at = platformTrain(st, t, stop);
  return at ? { ...at, riderSeed: 1000 + trainNo(st, t) * 7 + OFFSET[st], destination: STATIONS[nextStation(st)].name } : null;
}

function departureVisual(st: Station, t: number): DepartureVisual {
  const left = platformLeft(st, t), due = platformDue(st, t);
  const message = due > 0 ? (platformTrain(st, t, 0) && due > TIMETABLE.arrive ? 'DEPARTED' : 'DUE IN ' + clock(due)) : left > 0 && left < 100 ? 'CLOSING' : left > 0 ? 'BOARDING' : 'DEPARTING';
  return { open: lineOpen[st], station: STATIONS[st].name, destination: STATIONS[nextStation(st)].name, left, due, message };
}

/** Snapshot for the moving interior; callers may render it without mutating the ride. */
function trainVisualState() {
  return { ride: { ...ride }, lineOpen: { ...lineOpen }, between: between(), atSiding: rideAtSiding(), due: rideDue(), next: rideNext(), open: rideOpen(), run: rideRun() };
}
 const initialRide=structuredClone(ride);
 /** JSON only: no closures, clocks or artwork objects leave this controller. */
 function capture():MetroSnapshot{return {version:1,line:[...LINE],ride:{...ride},shift:{...shift},lineOpen:{...lineOpen}};}
 function restore(value:unknown){const snapshot=validateMetroSnapshot(value,{line:LINE,source:config});Object.assign(ride,snapshot.ride);Object.assign(shift,snapshot.shift);Object.assign(lineOpen,snapshot.lineOpen);}
 /** Retains object identities held by bound rules while clearing all mutable session state. */
 function reset(){Object.assign(ride,initialRide);for(const id of LINE){shift[id]=0;lineOpen[id]=true;}}
 /** The city lock that keeps LINE 0 from stopping at this station until it opens (metro source `locked`). */
 const lockOf=(station:Station):string|undefined=>config.locked[station];
 /** Open or shut every locked station by its city lock and the saved flags (a lock holds LINE 0 from stopping until its flag is set). */
 function syncLocks(world:Pick<CityModel,'lockOpen'>,flags:Readonly<Record<string,boolean>>){for(const[station,lock]of Object.entries(config.locked))lineOpen[station as Station]=world.lockOpen(lock as string,flags);}
 return {capture,restore,reset,lockOf,syncLocks,TIMETABLE,STOP,TRAIN,platformTrain,platformOpen,platformLeft,platformDue,platformSync,platformDoors,lineOpen,nextStation,platformQueue,clock,DWELL,CLOSE,RUN,OPEN,SEG,LOOP,TUNNEL_IN,SIDING,BRAKE,HALT,ride,rideStop,rideNext,between,rideAtSiding,rideOpen,rideLeft,rideDue,rideRun,sidingAlong,boardRide,rideSpeed,rideStopsAt,brakeRide,rideDoors,stepRide,platformTrainVisual,departureVisual,trainVisualState};
}
export type LineSystem=ReturnType<typeof createLineSystem>;
const shippingLine=createLineSystem();
export const {capture,restore,reset,lockOf,syncLocks,TIMETABLE,STOP,TRAIN,platformTrain,platformOpen,platformLeft,platformDue,platformSync,platformDoors,lineOpen,nextStation,platformQueue,clock,DWELL,CLOSE,RUN,OPEN,SEG,LOOP,TUNNEL_IN,SIDING,BRAKE,HALT,ride,rideStop,rideNext,between,rideAtSiding,rideOpen,rideLeft,rideDue,rideRun,sidingAlong,boardRide,rideSpeed,rideStopsAt,brakeRide,rideDoors,stepRide,platformTrainVisual,departureVisual,trainVisualState}=shippingLine;
