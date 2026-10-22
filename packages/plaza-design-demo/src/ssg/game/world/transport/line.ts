import {METRO_SOURCE,validateMetroSource,type MetroSource} from './metro-source';
import { PLATFORM_TRAIN, type PlatformTrainVisual } from '../../art/vehicles/rail';
import type { Movers } from '../../engine/movers';

import type { DepartureVisual } from '../../art/signage/line-departures';
import * as defaultCity from '../city';
import type {CityModel,Station} from '../city';

export type RidePhase='dwell'|'closing'|'running'|'opening'|'braking'|'halted'|'resuming';

/**
 * The ride as the picture and the read-outs see it: worked out from the Train scene's movers (`train.car`, `train.doors`),
 * never kept. `at`: index into LINE of the stop it stands at (or last left); `to`: the stop it runs to (past a closed one).
 * `timer`: frames into the phase. `dwell`: this stop's dwell (longer when you boarded late). `pos`: where it is on the loop; `d`: how far
 * along this run, `span` the run's length, `frames` its time. `v`: its speed. `open`: the doors, 0..1; `doors`: let open while it stands
 * between stations (P14). `halt`: where an emergency stop stopped it. `say`: what the announcement display shows.
 */
export interface RideView {
  at:number;to:number;phase:RidePhase;timer:number;dwell:number;pos:number;d:number;span:number;frames:number;v:number;
  open:number;doors:boolean;halt:null|'track'|'siding';haltFor:number;decel:number;say:string;
}

/** The mover that is the train, and the one that is its doors, on the Train scene's TRAIN-0 device (scenes/train/devices.json). */
export const CAR = 'train.car', DOORS = 'train.doors';

/** One frame of the old fixed step, ms: the timetable and the ride's read-outs count in frames. */
const FRAME = 1000 / 60;

/**
 * The platforms' clock: the frame count of the station scene's own time (the model's scene time, which only the game loop's
 * tick moves) and the shift its `platformShift` state holds. A picture painted without a scene (a preview) follows `view.t`.
 */
export interface Timeline { t: number; shift: number }
/** What a station scene's model must give for its timeline: its scene time and its `platformShift` state. */
export interface TimelineSource { now(): number; get(key: string): unknown }
export const PLATFORM_SHIFT = 'platformShift';
export const timelineOf = (m: TimelineSource): Timeline => ({ t: m.now() / FRAME, shift: Number(m.get(PLATFORM_SHIFT)) || 0 });
/** The platform clock a frame is painted with: the scene's (`View.timetable`), else the picture's own time. */
export const viewTimeline = (view: { t: number; timetable?: Timeline }): Timeline => view.timetable ?? { t: view.t, shift: 0 };

/** Track units between two stops; the loop is three of them. */
export const SEG = 3000, LOOP = SEG * 3;

/**
 * Along the loop, in track units from Downtown's platform: where the tunnel under the mall starts
 * coming from Downtown, and the old siding before the harbor, on no map (P14): a stub of platform
 * with a service stair up to the pier. It flashes past in under a second.
 */
export const TUNNEL_IN = SEG - 470;
export const SIDING = 2 * SEG - 650;

/** m:ss for a count of frames. */
export const clock = (frames: number) => { const s = Math.max(0, Math.ceil(frames / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/** Where the train's nose stops at every platform (track x, in the track's parallax), so the doors fall in the same places. */
export const STOP = 150;

/** The train on a platform, drawn in the track's parallax: cars, their length, the gap, which window bays are doors. */
export const TRAIN = PLATFORM_TRAIN;


/** One metro session per game/private Play; the legacy facade serves standalone previews. */
export function createLineSystem(world:CityModel=defaultCity,source:MetroSource=METRO_SOURCE){
 const config=validateMetroSource(source);
 const {LINE,STATIONS}=world;


// ---------- the platforms ----------

/** A platform's rhythm: the train runs in, stands with its doors open, runs out, and the next one is due `loop` frames after the last. */
const TIMETABLE = config.timetable;

/** The three platforms are not in step: each clock starts this far along. */
const OFFSET: Record<Station, number> = config.offset;

/**
 * Which stops LINE 0 stops at. The harbor is closed until P14 (city.ts `harborOpen`): the
 * train runs straight past it, and its platform's trains pass without stopping. game.ts sets
 * this from the save every frame.
 */
const lineOpen: Record<Station, boolean> = { downtown: true, galleria: true, harbor: true };

const phaseOf = (st: Station, tl: Timeline) => {
  const L = TIMETABLE.loop;
  return (((tl.t + OFFSET[st] + tl.shift) % L) + L) % L;
};


/** Where the train's nose is (track x), how open its doors are (0..1), whether it is moving; null between trains. `stop` is where the nose stops. */
function platformTrain(st: Station, tl: Timeline, stop: number): { x: number; open: number; moving: boolean } | null {
  const T = TIMETABLE, ph = phaseOf(st, tl);
  // a closed station: the train runs straight through, doors shut, at speed
  if (!lineOpen[st]) { const all = T.arrive + T.dwell + T.leave, f = ph / all; return f < 1 ? { x: stop + 2600 - 5600 * f, open: 0, moving: true } : null; }
  if (ph < T.arrive) { const f = ph / T.arrive; return { x: stop + 1900 * (1 - f) * (1 - f), open: 0, moving: true }; }
  if (ph < T.arrive + T.dwell) { const f = (ph - T.arrive) / T.dwell; return { x: stop, open: Math.min(1, Math.min(f, 1 - f) * 8), moving: false }; }
  if (ph < T.arrive + T.dwell + T.leave) { const f = (ph - T.arrive - T.dwell) / T.leave; return { x: stop - 2300 * f * f, open: 0, moving: true }; }
  return null;
}


/** True while the train stands at the platform with its doors open: you can board. */
function platformOpen(st: Station, tl: Timeline) {
  const at = platformTrain(st, tl, 0);
  return !!at && !at.moving && at.open > 0.6;
}


/** Frames before the doors start to close (0 when they are not open). */
function platformLeft(st: Station, tl: Timeline) {
  if (!platformOpen(st, tl)) return 0;
  const T = TIMETABLE;
  return Math.max(0, T.arrive + T.dwell * (7 / 8) - phaseOf(st, tl));
}


/** Frames until the next train stands at the platform (0 while one does). */
function platformDue(st: Station, tl: Timeline) {
  const T = TIMETABLE, ph = phaseOf(st, tl);
  if (!lineOpen[st]) return Infinity;
  if (ph >= T.arrive && ph < T.arrive + T.dwell) return 0;
  return ph < T.arrive ? T.arrive - ph : T.loop - ph + T.arrive;
}


/**
 * The `platformShift` that puts the train at the platform with its doors open, `left` frames before they close, at platform
 * time `t`: the train you just stepped off stands where you step out. The platform's scene keeps the number.
 */
function platformShiftFor(st: Station, t: number, left: number) {
  const T = TIMETABLE, L = T.loop, want = T.arrive + T.dwell * (7 / 8) - Math.max(30, Math.min(T.dwell * 0.75 - 30, left));
  return (((want - t - OFFSET[st]) % L) + L) % L;
}


/**
 * The open doors' positions in the player's world x. The train stands in the
 * track's parallax, so its doors line up with the player a little further along
 * the more the camera has moved.
 */
function platformDoors(st: Station, tl: Timeline, cam: number, stop: number): number[] {
  const at = platformTrain(st, tl, stop);
  if (!at || at.moving || at.open <= 0.6) return [];
  const T = TRAIN, out: number[] = [];
  for (let c = 0; c < T.cars; c++) for (const i of T.doorBays) out.push(at.x + c * (T.car + T.gap) + T.bay0 + i * T.bay + T.bayW / 2 + cam * (1 - T.track));
  return out;
}


/** The stop after this one on the loop that the train stops at (a closed station is passed). */
const nextStation = (st: Station): Station => {
  let i = LINE.indexOf(st);
  for (let k = 0; k < LINE.length; k++) { i = (i + 1) % LINE.length; if (lineOpen[LINE[i]]) return LINE[i]; }
  return st;
};


/** Which train this is at a platform (one more every loop), so each brings different riders. */
const trainNo = (st: Station, tl: Timeline) => Math.floor((tl.t + OFFSET[st] + tl.shift) / TIMETABLE.loop);


/**
 * The people waiting on a platform: which train they wait for (a new crowd
 * gathers after each one leaves), and whether they have got on (from half way
 * through the doors' open time until the train has gone).
 */
function platformQueue(st: Station, tl: Timeline): { train: number; boarded: boolean } {
  const T = TIMETABLE, ph = phaseOf(st, tl), n = trainNo(st, tl), gone = T.arrive + T.dwell + T.leave;
  return { train: ph >= gone ? n + 1 : n, boarded: ph >= T.arrive + T.dwell * 0.5 && ph < gone };
}


/** Immutable inputs for artwork: all timetable decisions remain in transport. */
function platformTrainVisual(st: Station, tl: Timeline, stop: number): PlatformTrainVisual | null {
  const at = platformTrain(st, tl, stop);
  return at ? { ...at, riderSeed: 1000 + trainNo(st, tl) * 7 + OFFSET[st], destination: STATIONS[nextStation(st)].name } : null;
}

function departureVisual(st: Station, tl: Timeline): DepartureVisual {
  const left = platformLeft(st, tl), due = platformDue(st, tl);
  const message = due > 0 ? (platformTrain(st, tl, 0) && due > TIMETABLE.arrive ? 'DEPARTED' : 'DUE IN ' + clock(due)) : left > 0 && left < 100 ? 'CLOSING' : left > 0 ? 'BOARDING' : 'DEPARTING';
  return { open: lineOpen[st], station: STATIONS[st].name, destination: STATIONS[nextStation(st)].name, left, due, message };
}


// ---------- the ride: read from the Train scene's movers ----------

/** The phase of the leg the train is on (a train that stands without a trip is at its stop with the doors open). */
const phase = (mv: Movers): RidePhase => (mv.load(CAR) as RidePhase | undefined) ?? 'dwell';

/** Moving, or standing between stations after an emergency stop. */
const between = (mv: Movers) => { const p = phase(mv); return p === 'running' || p === 'braking' || p === 'halted' || p === 'resuming'; };

/** The stop the train stands at (or last left). */
const rideStop = (mv: Movers): Station => (mv.at(CAR) as Station | undefined) ?? LINE[0];

/** The stop it runs to (between stations), or the one after this that it stops at. */
const rideNext = (mv: Movers): Station => (between(mv) ? (mv.target(CAR) as Station) : nextStation(rideStop(mv)));

/** Standing at the old siding after an emergency stop (P14). */
const rideAtSiding = (mv: Movers) => phase(mv) === 'halted' && mv.halted(CAR) === 'siding';

/** The doors, 0 (shut) to 1 (open). */
const doorsAt = (mv: Movers) => mv.position(DOORS) ?? 1;

/** The doors are open far enough to step through: at a stop, or at the siding once they were let open. */
const rideOpen = (mv: Movers) => { const p = phase(mv); return (p === 'dwell' || p === 'opening' || rideAtSiding(mv)) && doorsAt(mv) > 0.6; };

/** Frames before the doors start to close (for the platform you step out onto). */
const rideLeft = (mv: Movers) => {
  const p = phase(mv), info = mv.legInfo(CAR);
  if (p === 'dwell') return info ? Math.max(0, info.end - info.now) / FRAME : 0;
  if (p === 'opening') return (info ? info.end - info.t0 : 0) / FRAME;
  return 0;
};

/** Frames until the doors open at the next stop (0 while they are open or opening; a guess while it stands between stations). */
const rideDue = (mv: Movers) => mv.etaTo(CAR, 'opening') / FRAME;

/** The loop position along the track now. */
const ridePos = (mv: Movers) => mv.position(CAR) ?? 0;

/** Track units forward along the loop. */
const ahead = (from: number, to: number) => (((to - from) % LOOP) + LOOP) % LOOP;

/** How far along the run to the next stop, 0..1 (0 while standing at a stop). */
const rideRun = (mv: Movers) => {
  if (!between(mv)) return 0;
  const at = mv.stopPositions(CAR)!, from = at[rideStop(mv)], span = ahead(from, at[rideNext(mv)]) || SEG;
  return Math.min(1, ahead(from, ridePos(mv)) / span);
};

/** What the announcement display shows. */
const rideSay = (mv: Movers) => {
  const p = phase(mv);
  if (p === 'closing') return 'DOORS CLOSING';
  if (p === 'running' || p === 'resuming') return 'NEXT: ' + STATIONS[rideNext(mv)].name;
  if (p === 'braking') return 'EMERGENCY STOP';
  if (p === 'halted') return rideAtSiding(mv) ? 'STOPPED · NOT A STATION' : 'STOPPED · PLEASE WAIT';
  return STATIONS[rideStop(mv)].name;
};

/** The ride as one object, for the picture (a train with no movers to read stands at the first stop, doors open). */
function rideView(mv?: Movers): RideView {
  if (!mv) return { at: 0, to: 1, phase: 'dwell', timer: 0, dwell: 330, pos: 0, d: 0, span: SEG, frames: 780, v: 0, open: 1, doors: false, halt: null, haltFor: 0, decel: 0.032, say: STATIONS[LINE[0]].name };
  const p = phase(mv), info = mv.legInfo(CAR), at = rideStop(mv), to = rideNext(mv), pos = ridePos(mv), stops = mv.stopPositions(CAR)!, from = stops[at];
  const span = between(mv) ? ahead(from, stops[to]) || SEG : SEG, halt = p === 'braking' || p === 'halted' ? (mv.halted(CAR) === 'siding' ? 'siding' : 'track') : null;
  return {
    at: LINE.indexOf(at), to: LINE.indexOf(to), phase: p, timer: info ? (info.now - info.t0) / FRAME : 0, dwell: p === 'dwell' && info ? (info.end - info.t0) / FRAME : 330,
    pos, d: between(mv) ? ahead(from, pos) : 0, span, frames: info && p === 'running' ? (info.end - info.t0) / FRAME : 780, v: 0, open: doorsAt(mv),
    doors: halt === 'siding' && doorsAt(mv) > 0, halt, haltFor: 0, decel: 0.032, say: rideSay(mv),
  };
}

/** Snapshot for the moving interior; callers may render it without mutating anything. */
function trainVisualState(mv?: Movers) {
  return { ride: rideView(mv), lineOpen: { ...lineOpen }, between: mv ? between(mv) : false, atSiding: mv ? rideAtSiding(mv) : false, due: mv ? rideDue(mv) : 0, next: mv ? rideNext(mv) : LINE[1], open: mv ? rideOpen(mv) : true, run: mv ? rideRun(mv) : 0 };
}

 /** Retains object identities held by bound rules while clearing the session's mutable state: which stops LINE 0 stops at. */
 function reset(){for(const id of LINE)lineOpen[id]=true;}
 /** The city lock that keeps LINE 0 from stopping at this station until it opens (metro source `locked`). */
 const lockOf=(station:Station):string|undefined=>config.locked[station];
 /** Open or shut every locked station by its city lock and the saved flags (a lock holds LINE 0 from stopping until its flag is set). */
 function syncLocks(world:Pick<CityModel,'lockOpen'>,flags:Readonly<Record<string,boolean>>){for(const[station,lock]of Object.entries(config.locked))lineOpen[station as Station]=world.lockOpen(lock as string,flags);}
 return {reset,lockOf,syncLocks,TIMETABLE,STOP,TRAIN,platformTrain,platformOpen,platformLeft,platformDue,platformShiftFor,platformDoors,lineOpen,nextStation,platformQueue,clock,SEG,LOOP,TUNNEL_IN,SIDING,rideStop,rideNext,between,rideAtSiding,rideOpen,rideLeft,rideDue,rideRun,ridePhase:phase,rideDoors:doorsAt,ridePos,rideView,platformTrainVisual,departureVisual,trainVisualState};
}
export type LineSystem=ReturnType<typeof createLineSystem>;
const shippingLine=createLineSystem();
export const {reset,lockOf,syncLocks,TIMETABLE,platformTrain,platformOpen,platformLeft,platformDue,platformShiftFor,platformDoors,lineOpen,nextStation,platformQueue,rideStop,rideNext,between,rideAtSiding,rideOpen,rideLeft,rideDue,rideRun,ridePhase,rideDoors,ridePos,rideView,platformTrainVisual,departureVisual,trainVisualState}=shippingLine;
