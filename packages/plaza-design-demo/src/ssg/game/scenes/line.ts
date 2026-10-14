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
import { crowd, drawRider } from './riders';

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
export const TRAIN = { cars: 3, car: 290, gap: 8, track: 0.94, doorBays: [1, 4], bay: 46, bay0: 14, bayW: 32 };

const phaseOf = (st: Station, t: number) => {
  const L = TIMETABLE.loop;
  return (((t + OFFSET[st] + shift[st]) % L) + L) % L;
};

/** Where the train's nose is (track x), how open its doors are (0..1), whether it is moving; null between trains. `stop` is where the nose stops. */
export function platformTrain(st: Station, t: number, stop: number): { x: number; open: number; moving: boolean } | null {
  const T = TIMETABLE, ph = phaseOf(st, t);
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

/** The stop after this one on the loop. */
export const nextStation = (st: Station): Station => LINE[(LINE.indexOf(st) + 1) % LINE.length];

/** Which train this is at a platform (one more every loop), so each brings different riders. */
const trainNo = (st: Station, t: number) => Math.floor((t + OFFSET[st] + shift[st]) / TIMETABLE.loop);

/** The train at a platform: three cars, lit windows with riders, doors that slide open, the headlight while it moves, its destination on the front. */
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
    box(x, c0, y(100), T.car, 86, '#14171a', 'rgba(' + O + ',.6)');
    x.fillStyle = 'rgba(' + O + ',.5)'; x.fillRect(c0 + 1, y(44), T.car - 2, 2);
    for (let i = 0; i < 6; i++) {
      const wx = c0 + T.bay0 + i * T.bay;
      if (T.doorBays.includes(i)) {
        // doors: open shows the lit inside, and a step of light on the platform edge
        const d = Math.round(at.open * 13);
        box(x, wx, y(74), T.bayW, 58, '#101316', 'rgba(' + O + ',.45)');
        if (d) {
          x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(wx + 16 - d, y(72), d * 2, 56);
          x.fillStyle = 'rgba(255,217,165,.12)'; x.fillRect(wx + 16 - d - 4, y(16), d * 2 + 8, 14);
        }
        x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(wx + 3 - d, y(66), 9, 14); x.fillRect(wx + 20 + d, y(66), 9, 14);
        continue;
      }
      // a lit window and whoever sits in it this time: nobody, one person, now and then two
      x.fillStyle = 'rgba(255,217,165,.32)'; x.fillRect(wx, y(84), 32, 24);
      const who = riders[c * 6 + i];
      if (who.on) {
        x.save(); x.beginPath(); x.rect(wx, y(84), 32, 24); x.clip();
        const two = who.phase > 7.5;
        drawRider(x, who.kind, wx + (two ? 9 : 16), y(60), v.t, { sit: true, flip: who.flip, ps: 2, phase: who.phase });
        if (two) drawRider(x, riders[(c * 6 + i + 7) % riders.length].kind, wx + 23, y(60), v.t, { sit: true, flip: !who.flip, ps: 2, phase: who.phase + 3 });
        x.restore();
      }
    }
    if (c === 0) {
      x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c0 + 3, y(30), 5, 4);
      box(x, c0 + 6, y(98), 104, 11, '#050302');
      text(x, '0 > ' + STATIONS[nextStation(st)].name, c0 + 58, y(92.5), 'rgba(255,136,0,.9)', 7, '600');
    }
  }
}

/** m:ss for a count of frames. */
export const clock = (frames: number) => { const s = Math.max(0, Math.ceil(frames / 60)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/** What the line's tickers scroll between the times: the operator's apologies and the Registry's reminders. */
export const TICKER = [
  'WE APOLOGISE FOR THE DELAY TO YOUR LIFE',
  'REGISTRY NOTICE: ALL JOURNEYS ARE LOGGED FOR YOUR SAFETY',
  'SMILE: YOU ARE BEING COUNTED',
  'UNATTENDED THOUGHTS WILL BE REMOVED',
  'COMPLIANCE IS COMFORT',
  'REPORT ANYONE WHO SEEMS TO BE GOING SOMEWHERE',
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
  text(x, 'LINE 0 > ' + STATIONS[nextStation(st)].name, bx, y(h - 8), 'rgba(' + PAPER + ',.8)', 7, '600');
  const left = platformLeft(st, t), due = platformDue(st, t);
  const msg = due > 0 ? (platformTrain(st, t, 0) && due > TIMETABLE.arrive ? 'DEPARTED' : 'DUE IN ' + clock(due)) : left > 0 && left < 100 ? 'CLOSING' : left > 0 ? 'BOARDING' : 'DEPARTING';
  const hot = msg === 'BOARDING' || msg === 'CLOSING';
  text(x, msg, bx, y(h - 20), 'rgba(255,136,0,' + (hot ? 0.75 + 0.25 * Math.sin(t * 0.15) : 0.9) + ')', 9, '600');
  x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(bx - 54, y(h - 28), 108, 1);
  ticker(x, t, bx - 54, y(h - 35), 108, due > 0 ? 'NEXT TRAIN ' + clock(due) : '', 0.55);
  tell(x, t, bx + 52, y(h - 4));
}
// ---------- the ride ----------

/** On board: how long the doors stand open at a stop, take to close and open, and the run between two stops. */
export const DWELL = 330, CLOSE = 36, RUN = 780, OPEN = 36;
/** Track units between two stops; the loop is three of them. */
export const SEG = 3000, LOOP = SEG * 3;

export type RidePhase = 'dwell' | 'closing' | 'running' | 'opening';

/**
 * The train you are on. `at`: index into LINE of the stop it stands at (or last
 * left). `timer`: frames into the phase. `dwell`: this stop's dwell (short when
 * you boarded late). `pos`: where it is on the loop. `open`: the doors, 0..1.
 * `say`: what the announcement display shows.
 */
export const ride = { at: 0, phase: 'dwell' as RidePhase, timer: 0, dwell: DWELL, pos: 0, open: 1, say: 'DOWNTOWN' };

/** The stop the train stands at (or last left), and the one it runs to next. */
export const rideStop = (): Station => LINE[ride.at];
export const rideNext = (): Station => LINE[(ride.at + 1) % LINE.length];
/** The doors are open far enough to step through. */
export const rideOpen = () => (ride.phase === 'dwell' || ride.phase === 'opening') && ride.open > 0.6;
/** Frames before the doors start to close (for the platform you step out onto). */
export const rideLeft = () => (ride.phase === 'dwell' ? Math.max(0, ride.dwell - ride.timer) : ride.phase === 'opening' ? ride.dwell : 0);
/** Frames until the doors open at the next stop (0 while they are open or opening). */
export const rideDue = () => {
  const r = ride;
  if (r.phase === 'dwell') return Math.max(0, r.dwell - r.timer) + CLOSE + RUN + OPEN;
  if (r.phase === 'closing') return Math.max(0, CLOSE - r.timer) + RUN + OPEN;
  if (r.phase === 'running') return Math.max(0, RUN - r.timer) + OPEN;
  return 0;
};
/** How far along the run to the next stop, 0..1 (0 while standing). */
export const rideRun = () => (ride.phase === 'running' ? Math.min(1, ride.timer / RUN) : 0);

/** You board at `st`; the doors stay open `left` more frames. */
export function boardRide(st: Station, left: number) {
  const at = LINE.indexOf(st);
  Object.assign(ride, { at, phase: 'dwell', timer: 0, dwell: Math.max(120, left), pos: at * SEG, open: 1, say: STATIONS[st].name });
}

/** One frame of the ride. Returns 'depart' as the doors shut and it pulls out, 'arrive' as it stops at the next station. */
export function stepRide(dt: number): 'depart' | 'arrive' | null {
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
    r.phase = 'running'; r.timer = 0; r.open = 0;
    r.say = 'NEXT: ' + STATIONS[rideNext()].name;
    return 'depart';
  }
  if (r.phase === 'running') {
    const f = Math.min(1, r.timer / RUN);
    r.pos = (r.at * SEG + SEG * (1 - Math.cos(Math.PI * f)) / 2) % LOOP;
    if (f < 1) return null;
    r.at = (r.at + 1) % LINE.length;
    r.pos = r.at * SEG;
    r.phase = 'opening'; r.timer = 0; r.dwell = DWELL;
    r.say = STATIONS[rideStop()].name;
    return 'arrive';
  }
  r.open = Math.min(1, r.timer / OPEN);
  if (r.timer >= OPEN) { r.phase = 'dwell'; r.timer = 0; }
  return null;
}
