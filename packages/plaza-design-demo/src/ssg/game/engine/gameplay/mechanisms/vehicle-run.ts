/**
 * Mechanism `vehicleRun` (scene.json `stage.mechanisms`): Downtown's DLV-9 delivery run. What is left
 * in code is the two physical orders ("home" and "follow you" start the van's `inward` or `outward`
 * path) and the picture's read of where the van is. The van itself is a Circuit mover (`dlv9.chassis`
 * in devices.json: stops home / gate / door / market, the two paths, its speed and the time it waits at
 * the door for the lock to hear); the gate's scan area is a zone on that mover (`gate.beam`). Registry
 * control, billboard scheduling and controlled status/lamps use authored shared commands, queries and
 * deadlines. The source formatter's nodes read delegates to the canonical player node-count service.
 *
 * DLV-9 drives through the market gate, in or out. On the way the scan area notices it (the zone's
 * milestone `downtown.dlv.scanned`: the scanner reads it, `gate.scanner:matched`, pre-wired to open the
 * lock); at the door the path looks at the lock: open, it passes (`downtown.dlv.door` then `.through`;
 * `gate.door:passed` is pre-wired to shut the lock again) or it bonks the shutter and backs off
 * (`.back`). If the gate is still open once it is through, Downtown is cleared. The mover writes the
 * state `dlvAt` (home, gate, market, or driving on the way). The scene's gameplay needs the select
 * queries `controlled2F`, `controlled31` and `controlledTV` (booleans), which `check` insists on.
 */

import {downtownController} from '../../controllers/motion';
import type {Spot,SceneModel} from '../../model';
import type {Effect,World,SceneRules} from '../../rules';
import type {PlayerServices} from '../../../runtime/player';
import type {SceneMechanism} from '../scene-mechanisms';

/** Where DLV-9 rests: by the dumpster (its `layout.spot`), outside the market gate, or inside the market (out of the world). */
export type DlvAt = 'home' | 'gate' | 'market' | 'driving';

const split = (key: string): [string, string] => { const i = key.indexOf('.'); return [key.slice(0, i), key.slice(i + 1)]; };

/** DLV-9's x right now (null: inside the market): read from its mover. */
export function dlvX(m: SceneModel): number | null {
  const c = downtownController(m.data);
  if (m.get(c.state.at) === 'market') return null;
  return m.movers.position(c.mover) ?? null;
}

/** Send the van along one of its paths; the mover, its zone and the milestones do the rest. */
function drive(w: World, path: 'inward' | 'outward') {
  const [dev, noun] = split(downtownController(w.data).mover);
  if (w.m.runPath(dev, noun, path) !== 'started') throw new Error('DLV-9 has no mover path ' + path);
}

function effects(): Record<string, Effect> {
  return {
    /** Physical route endpoints; source Case lists own access and refusal policy. */
    'dlv.inward': (w) => { drive(w, 'inward'); },
    'dlv.outward': (w) => { drive(w, 'outward'); },
  };
}

/** Downtown's rules, reading and writing the player's save through `p`. */
export function downtownRules(p: PlayerServices): SceneRules {
  const s = () => p.save();
  return {
    effects: effects(),
    inputs: ['downtown.dlv.scanned', 'downtown.dlv.door', 'downtown.dlv.through', 'downtown.dlv.back'],
    derived: {
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
      const x = dlvX(m);
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
  face:{function:'act',controller:'downtown'},
  label:'DLV-9 delivery run (market gate, scanner, door)',requires:[],world:false,
  rulesShape:()=>SHAPE,
  /** The picture reads these select queries as plain booleans. */
  check:({gameplay})=>{
    for(const id of ['controlled2F','controlled31','controlledTV']){const q=gameplay.queries?.[id];if(q?.kind!=='select'||q.cases.some(row=>!('literal'in row.value)||typeof row.value.literal!=='boolean'))throw new Error('Downtown presentation requires boolean select query '+id);}
  },
  apply:()=>({rules:(player:PlayerServices)=>downtownRules(player)}),
};
