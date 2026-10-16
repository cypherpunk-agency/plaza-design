/**
 * TRAIN-0, the code side of the metro car's one device (data/train.json): P14, "the stop that
 * isn't on the map". The ride itself is line.ts; these rules read it and pull on it.
 *
 * - `position` raises `tunnel` as the train runs into the tunnel under the mall, and `harbor
 *   siding` at the moment an emergency stop would land it at the old siding before the harbor
 *   (a siding on no map; it flashes past in under a second, so by hand you are always too early
 *   or too late). Wired to `brake pull`, the brake catches it.
 * - `brake pull` (`train.brake`) is only taken from a passenger the emergency is registered to:
 *   Moth registered #0451 for "a friend", and Moth's maglev pass (P13's jacket, the save's item
 *   `maglev.pass`) says you are the friend. When the train comes to a stand it raises `stopped`.
 * - `doors`: the pre-wired safety cable `brake:stopped → doors lock` keeps them shut. Replace it
 *   with `brake:stopped → doors open` and at the siding they open: the harbor flag
 *   (`HARBOR_FLAG`) is set for good and the step out leads up a service stair to the pier.
 *
 * Pure: no DOM, so node can run it (the build's check).
 */

import { HARBOR_FLAG, LINE, STATIONS } from '../../world/city';
import type { SceneData } from "../../data/types";
import type { Effect, SceneRules, World } from "../../engine/rules";
import { between, BRAKE, brakeRide, LOOP, ride, rideAtSiding, rideDoors, rideNext, rideStop, rideStopsAt, SEG, sidingAlong, TUNNEL_IN } from "../../world/transport/line";

/** The save's item that makes the brake take your pull (P13 hands it over). */
export const PASS = 'maglev.pass';

/** Where along the loop a stop happened, in words for the halt line. */
function whereWords(pos: number): string {
  // the stretches train.ts lays along the loop (a district reaches 900 either side of its stop)
  const u = ((pos % LOOP) + LOOP) % LOOP;
  if (u >= TUNNEL_IN && u < 2 * SEG - TUNNEL_IN) return 'in the tunnel under the mall';
  if (u >= SEG + 900 && u < 2 * SEG - 900) return 'on the bridge, over black water';
  if (u >= 2 * SEG - 900 && u < 2 * SEG + 900) return 'among the containers';
  if (u >= 2 * SEG + 900 && u < 3 * SEG - 900) return 'between two towers';
  if (u >= 900 && u < SEG - 900) return 'on the viaduct, over the roofs';
  if (u >= SEG - 900 && u < SEG + 900) return 'by the mall\'s glass front';
  return 'over Downtown\'s streets';
}

/** Phases as numbers, for the tick to notice a change (scratch holds numbers only). */
const PH = { dwell: 0, closing: 1, opening: 2, running: 3, braking: 4, halted: 5, resuming: 6 } as const;

/** TRAIN-0's rules. The pass is an item the player carries and the harbor flag a save flag: the model's `carry` and `flag` reach the save. */
function trainRules(): SceneRules {

  const effects: Record<string, Effect> = {
    'train.position': (w) => {
      const km = (ride.pos / 1000).toFixed(1);
      if (!between()) return w.line('pos.station', { stop: STATIONS[rideStop()].name, doors: ride.open > 0.5 ? 'open' : 'shut' });
      const vars = { from: STATIONS[rideStop()].name, to: STATIONS[rideNext()].name, km };
      return w.line(ride.phase === 'halted' ? 'pos.halted' : 'pos.between', vars);
    },
    'train.brake': (w) => {
      const m = w.m;
      if (m.carry(PASS) <= 0) {
        const n = Number(m.get('pulls') ?? 0);
        m.set('pulls', n + 1);
        return w.line(n % 2 === 0 ? 'brake.notyours' : 'brake.queued');
      }
      const r = brakeRide();
      if (r === 'standing') return w.line('brake.standing');
      if (r === 'braking') return w.line('brake.already');
      w.changed();
      return w.line('brake.pulled');
    },
    'train.doors': (w, c) => {
      if (!between()) return w.line('doors.station');
      if (!c.bySignal) return w.line('doors.hand');
      if (ride.phase !== 'halted') return w.line('doors.moving');
      if (!rideAtSiding()) return w.line('doors.wall');
      rideDoors(true);
      w.m.flag(HARBOR_FLAG);
      w.goal('siding');
      return w.line('doors.siding');
    },
    'train.lock': (w) => {
      if (!between()) return w.line('doors.station');
      rideDoors(false);
      return w.line('doors.locked');
    },
  };

  function tick(w: World) {
    const m = w.m, s = m.scratch;
    // position: into the tunnel under the mall
    if (s.pos !== undefined && s.pos < TUNNEL_IN && ride.pos >= TUNNEL_IN && ride.pos - s.pos < 1500) m.emit('train.position:tunnel');
    // position: the moment a stop would land at the siding (where the train would stand if braked now crosses it)
    const stops = rideStopsAt(), at = sidingAlong(), mark = at === null ? null : at - BRAKE.lead;
    if (stops !== null && mark !== null && s.stops !== undefined && s.stops < mark && stops >= mark && ride.d < mark) m.emit('train.position:harbor siding');
    s.pos = ride.pos; s.stops = stops ?? NaN;
    // the brake: the train has come to a stand, or gets going again
    const ph = PH[ride.phase], was = s.phase;
    if (was === PH.braking && ph === PH.halted) {
      m.emit('train.brake:stopped');
      w.say(ride.halt === 'siding' ? w.line('halt.siding') : w.line('halt.track', { where: whereWords(ride.pos) }), 'train');
      w.changed();
    } else if (was === PH.halted && (ph === PH.resuming || ph === PH.running)) { w.say(w.line('resume'), 'train'); w.changed(); }
    if (was !== ph) w.changed();
    s.phase = ph;
  }

  return {
    effects,
    tick,
    derived: {
      /** The status line: where the train is. */
      where: () => rideAtSiding() ? 'STOPPED · NOT A STATION'
        : ride.phase === 'halted' ? 'EMERGENCY STOP'
        : between() ? 'NEXT: ' + STATIONS[LINE[ride.to]].name
        : 'AT ' + STATIONS[rideStop()].name,
    },
    needs: {
      state: ['pulls'],
      goals: ['siding'],
      texts: {
        'pos.station': 'line', 'pos.between': 'line', 'pos.halted': 'line',
        'brake.notyours': 'line', 'brake.queued': 'line', 'brake.standing': 'line', 'brake.already': 'line', 'brake.pulled': 'line',
        'halt.track': 'line', 'halt.siding': 'line', 'resume': 'line',
        'doors.locked': 'line', 'doors.hand': 'line', 'doors.moving': 'line', 'doors.station': 'line', 'doors.wall': 'line', 'doors.siding': 'line',
      },
    },
    /** P14's own: the siding event, the brake's `stopped`, and the safety cable that locks the doors. */
    check: (z: SceneData) => {
      const errs: string[] = [];
      const t = z.devices.find((d) => d.id === 'train'), noun = (id: string) => t?.nouns.find((n) => n.id === id);
      if (!noun('position')?.events?.includes('harbor siding')) errs.push('devices[train] › position: needs the event "harbor siding" (P14)');
      if (!noun('brake')?.events?.includes('stopped')) errs.push('devices[train] › brake: needs the event "stopped" (P14)');
      if (!z.cables.some((c) => c.from === 'train.brake:stopped' && c.to === 'train.doors' && c.verb === 'lock')) errs.push('cables: the safety cable train.brake:stopped → train.doors lock must be there from the start (P14)');
      return errs;
    },
  };
}

export const TRAIN_RULES = trainRules();
/** The build-time check's name for them (generate-demos). */
export const TRAIN_RULES_SHAPE = TRAIN_RULES;
