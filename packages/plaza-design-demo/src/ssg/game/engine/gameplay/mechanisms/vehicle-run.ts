/**
 * Mechanism `vehicleRun` (scene.json `stage.mechanisms`): Downtown's DLV-9 delivery run. The native
 * trajectories and the physical callbacks that remain; registry control, billboard scheduling and
 * controlled status/lamps use authored shared commands, queries and deadlines. The source formatter's
 * nodes read delegates to the canonical player node-count service. DLV ordinary decisions,
 * milestone responses and finale use authored shared inputs and an END handoff; only sampled
 * collision and trajectory facts stay native.
 *
 * DLV-9 drives through the market gate, in or out. On the way the gate's scanner reads it
 * (`gate.scanner:matched`, pre-wired to open the lock); at the door it passes if the lock is open
 * (`gate.door:passed`, pre-wired to shut it again) or bonks the shutter and backs off. If the gate is
 * still open once it is through, Downtown is cleared. The scene's devices.json controller (`downtown`)
 * names the vehicle, its gate and the speed tuning; the scene's gameplay needs the select queries
 * `controlled2F`, `controlled31`, `controlledTV`, `downtown.dlv.passage` (booleans) and
 * `downtown.dlv.destination` (market or gate), which `check` insists on.
 */

import {downtownController} from '../../controllers/motion';
import type {SceneData} from '../../../data/types';
import type {Spot,SceneModel} from '../../model';
import type {Effect,World,SceneRules} from '../../rules';
import type {PlayerServices} from '../../../runtime/player';
import type {SceneMechanism} from '../scene-mechanisms';

/** Where DLV-9 rests: by the dumpster (its `layout.spot`), outside the market gate, or inside the market (out of the world). */
export type DlvAt = 'home' | 'gate' | 'market' | 'driving';

/** The market gate's span along the street, from its `layout.spot`. */
function gateSpan(z: SceneData) {
  const s = z.devices.find((d) => d.id === downtownController(z).devices.gate)?.layout?.spot ?? { x: 70, w: 80 };
  return { door: s.x, left: s.x - s.w / 2, right: s.x + s.w / 2 };
}

/** DLV-9's x right now (null: inside the market). `home`: its spot by the dumpster. */
export function dlvX(m: SceneModel, home: number): number | null {
  const c=downtownController(m.data),at = m.get(c.state.at) as DlvAt, g = gateSpan(m.data), s = m.scratch;
  if (at === 'driving') {
    const f = Math.max(0, Math.min(1, (m.now() - s.dlvT0) / Math.max(1, s.dlvT1 - s.dlvT0)));
    return s.dlvX0 + (s.dlvX1 - s.dlvX0) * f;
  }
  if (at === 'market') return null;
  return at === 'gate' ? g.right + c.outside : home;
}

/** One stretch of a drive, for the drawing: from x0 to x1, starting now. Returns how long it takes, ms. */
function leg(w: World, x0: number, x1: number) {
  const m = w.m, ms = (Math.abs(x1 - x0) / w.tune(downtownController(w.data).speedTuning)) * 1000;
  Object.assign(m.scratch, { dlvX0: x0, dlvX1: x1, dlvT0: m.now(), dlvT1: m.now() + ms });
  return ms;
}

/**
 * DLV-9 drives through the market gate, in or out. On the way the gate's scanner reads it
 * (`gate.scanner:matched`, pre-wired to open the lock); at the door it passes if the lock is open
 * (`gate.door:passed`, pre-wired to shut it again) or bonks the shutter and backs off. If the gate is
 * still open once it is through, Downtown is cleared.
 */
function drive(w: World, inward: boolean) {
  const m = w.m, c=downtownController(m.data),g = gateSpan(w.data);
  const home = w.data.devices.find((d) => d.id === c.devices.vehicle)!.layout!.spot!.x;
  const x0 = dlvX(m, home) ?? g.left - c.inside;
  const scanAt = inward ? g.right : g.left, rest = inward ? g.left - c.inside : g.right + c.outside;
  // the scanner reads it on the way; it waits at the door long enough for the lock to hear (cables take a moment)
  const toDoor = leg(w, x0, g.door), doorMs = Math.max(toDoor, c.signalMs);
  // A source commit can redraw immediately: prepare the trajectory before exposing driving.
  w.input('downtown.dlv.started');
  const scanMs = Math.max(0, Math.min(toDoor * Math.abs(scanAt - x0) / Math.max(1, Math.abs(g.door - x0)), doorMs - c.signalMs));
  m.later(scanMs, () => { w.input('downtown.dlv.scanned'); w.changed(); });
  m.later(doorMs, () => {
    const through = m.value('downtown.dlv.passage');
    if (typeof through !== 'boolean') throw new Error('DLV-9 requires a boolean passage query');
    // The sampled collision decision remains a transient trajectory fact for this final leg.
    m.scratch.dlvThrough = through ? 1 : 0;
    w.input('downtown.dlv.door');
    // through: on to the other side; bonked: back to where it came from (outside, or inside the market)
    const back = inward ? g.right + c.outside : g.left - c.inside;
    const ms = Math.max(leg(w, g.door, through ? rest : back), c.signalMs);
    w.changed();
    m.later(ms, () => {
      // Publish this callback's captured passage fact, never a later lock sample.
      m.scratch.dlvThrough = through ? 1 : 0;
      w.input('downtown.dlv.completed');
      w.changed();
    });
  });
}

function effects(): Record<string, Effect> {
  return {
    /** Physical route endpoints; source Case lists own access and refusal policy. */
    'dlv.inward': (w) => { drive(w, true); },
    'dlv.outward': (w) => { drive(w, false); },
  };
}

/** Downtown's rules, reading and writing the player's save through `p`. */
export function downtownRules(p: PlayerServices): SceneRules {
  const s = () => p.save();
  return {
    effects: effects(),
    inputs: ['downtown.dlv.started', 'downtown.dlv.scanned', 'downtown.dlv.door', 'downtown.dlv.completed'],
    derived: {
      dlvThrough: (m) => m.scratch.dlvThrough === 1,
      dlvInside: (m) => m.scratch.dlvX1 < gateSpan(m.data).door,
      handle: () => s().handle || 'ghost',
      named: () => !!s().handle,
      tokens: () => s().tokens,
      jump: () => !!s().jump,
      till: () => !!s().flags.till,
      end: () => !!s().flags.end,
      nodes: () => p.nodes(),
    },
    place: (m: SceneModel, home: Spot) => {
      if (home.id !== downtownController(m.data).devices.vehicle) return home;
      const x = dlvX(m, home.x);
      return x === null ? null : { ...home, x };
    },
    needs: {
      devices:[],
      state: [],
      // shell.ts (the deck's keyboard)
      texts: { 'login.none': 'line', 'login.baduser': 'line' },
    },
  };
}

/** The rules' contract does not depend on whose save it is. */
const SHAPE = downtownRules({
  save: () => ({ handle: '', tokens: 0, jump: false, controlled: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
});

export const vehicleRun:SceneMechanism={
  label:'DLV-9 delivery run (market gate, scanner, door)',requires:[],world:false,
  rulesShape:()=>SHAPE,
  /** The picture and the run read these select queries as plain booleans (and the destination as market or gate). */
  check:({gameplay})=>{
    for(const id of ['controlled2F','controlled31','controlledTV','downtown.dlv.passage']){const q=gameplay.queries?.[id];if(q?.kind!=='select'||q.cases.some(row=>!('literal'in row.value)||typeof row.value.literal!=='boolean'))throw Error('Downtown presentation requires boolean select query '+id);}
    const destination=gameplay.queries?.['downtown.dlv.destination'];if(destination?.kind!=='select'||destination.cases.some(row=>!('literal'in row.value)||!['market','gate'].includes(String(row.value.literal))))throw Error('DLV-9 destination requires market/gate select output');
  },
  apply:()=>({rules:(player:PlayerServices)=>downtownRules(player)}),
};
