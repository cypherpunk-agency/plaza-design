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

import * as defaultCity from '../../world/city';
import type {CityModel} from '../../world/city';
import type { Effect, SceneRules, World } from "../../engine/rules";
import * as defaultMetro from '../../world/transport/line';
import type {LineSystem} from '../../world/transport/line';

/** The save's item that makes the brake take your pull (P13 hands it over). */
export const PASS = 'maglev.pass';

export function createTrainRules(metro:LineSystem=defaultMetro,city:CityModel=defaultCity):SceneRules {
 const {LINE,STATIONS}=city;
 const {between,BRAKE,brakeRide,LOOP,ride,rideAtSiding,rideDoors,rideNext,rideStop,rideStopsAt,SEG,sidingAlong,TUNNEL_IN}=metro;
/** Physical region only; wording belongs to source labels. */
function region(pos: number): string {
  // the stretches train.ts lays along the loop (a district reaches 900 either side of its stop)
  const u = ((pos % LOOP) + LOOP) % LOOP;
  if (u >= TUNNEL_IN && u < 2 * SEG - TUNNEL_IN) return 'tunnel';
  if (u >= SEG + 900 && u < 2 * SEG - 900) return 'bridge';
  if (u >= 2 * SEG - 900 && u < 2 * SEG + 900) return 'containers';
  if (u >= 2 * SEG + 900 && u < 3 * SEG - 900) return 'towers';
  if (u >= 900 && u < SEG - 900) return 'viaduct';
  if (u >= SEG - 900 && u < SEG + 900) return 'mall';
  return 'downtown';
}

/** Phases as numbers, for the tick to notice a change (scratch holds numbers only). */
const PH = { dwell: 0, closing: 1, opening: 2, running: 3, braking: 4, halted: 5, resuming: 6 } as const;

/** TRAIN-0's rules. The pass is an item the player carries and the harbor flag a save flag: the model's `carry` and `flag` reach the save. */


  const effects: Record<string, Effect> = {
    'train.brake': (w) => {
      const r = brakeRide();
      // The physical operation owns acceptance and its redraw. Source cases own replies.
      if (r === 'track' || r === 'siding') w.changed();
    },
    // Permission cases, goal and reply belong to the shared source evaluator.
    // Physical opening reports a milestone; the shared command owns the city flag.
    'train.doors': (w) => {
      rideDoors(true);
      w.input('train.doors.opened');
    },
    'train.lock': () => { rideDoors(false); },
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
      w.input('train.halted');
      w.changed();
    } else if (was === PH.halted && (ph === PH.resuming || ph === PH.running)) { w.input('train.resumed'); w.changed(); }
    if (was !== ph) w.changed();
    s.phase = ph;
  }

  return {
    effects,
    inputs:['train.halted','train.resumed','train.doors.opened'],
    tick,
    derived: {
      /** Physical observations; permissions remain editable native source cases. */
      trainBetween: () => between(),
      trainAtStation: () => !between(),
      trainStopName: () => STATIONS[rideStop()].name,
      trainNextName: () => STATIONS[rideNext()].name,
      trainKilometres: () => (ride.pos / 1000).toFixed(1),
      trainDoorsOpen: () => ride.open > 0.5,
      trainStanding: () => ride.phase !== 'running' && ride.phase !== 'resuming' && ride.phase !== 'braking',
      trainBraking: () => ride.phase === 'braking',
      trainCanBrake: () => ride.phase === 'running' || ride.phase === 'resuming',
      trainHalted: () => ride.phase === 'halted',
      trainAtSiding: () => rideAtSiding(),
      trainHaltSiding: () => ride.halt === 'siding',
      haltWhere: m => m.label('halt.where.'+region(ride.pos)),
      /** The status line: where the train is. */
      where: m => rideAtSiding() ? m.label('status.siding')
        : ride.phase === 'halted' ? m.label('status.halted')
        : between() ? m.label('status.next',{stop:STATIONS[LINE[ride.to]].name})
        : m.label('status.station',{stop:STATIONS[rideStop()].name}),
    },
    needs: {
      devices:[{id:'train',nouns:[{id:'position',kind:'SENSE',events:['tunnel','harbor siding']},{id:'brake',kind:'ACT',events:['stopped']}]}],
      texts: {
        'halt.where.tunnel':'label','halt.where.bridge':'label','halt.where.containers':'label','halt.where.towers':'label',
        'halt.where.viaduct':'label','halt.where.mall':'label','halt.where.downtown':'label',
        'status.siding':'label','status.halted':'label','status.next':'label','status.station':'label',
      },
    },

  };
}

export const TRAIN_RULES = createTrainRules();
/** The build-time check's name for them (generate-demos). */
export const TRAIN_RULES_SHAPE = TRAIN_RULES;
