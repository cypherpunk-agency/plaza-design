/**
 * The stacks' code side (P15 NRLU 404 0451, the end of Act I). Almost
 * everything is data/stacks.json on the engine: STS-2, the Port Authority's
 * thermal gate and its alarm cable, the night ferry, the reefer with Moth in
 * it, the Registry's watchdog walking port → crane → ferry, and Moth's talk.
 * Source Case lists own lift/alarm manual refusals and busy eligibility. A
 * source select query supplies the finite regular/reefer trajectory kind.
 * Remaining native work still includes the ordinary callback/watchdog tails
 * listed in STACKS-ORDINARY-MIGRATION.md; this file is not fully consolidated.
 *
 * The trajectory mechanics:
 *
 * - `sts2.lift`: STS-2's spreader. Only a cable lifts (the pre-wired
 *   `ferry.watchdog:leaves → sts2.spreader lift`: the crane lifts when the
 *   Registry has cleared the ferry); a finger is refused. Untagged, it moves a
 *   regular box from the quay chassis into the ferry's hold (cold: the gate
 *   clears it). Once 0451's slot is tagged on the crane's camera (`found`),
 *   the next lift takes the reefer out of block B, through the thermal gate,
 *   onto the ferry's deck. On the way it passes the gate: the gate raises
 *   `port.scanner:warm` (a person is warm). Wired to the alarm, the alarm
 *   sounds and the box goes back. While the watchdog sits on PORT AUTHORITY
 *   nothing leaves it (the engine's freeze), so the warm is lost: the clever way.
 * - `port.alarm`: sounds; with 0451 in the air, the lift is aborted and the box
 *   returned to its slot.
 * - the watchdog's check (`tick`): whenever it sits on PORT AUTHORITY it puts a cut
 *   alarm cable back and logs the tamper (trace). So the cut has to be made while
 *   it is away, and hold until the lift: the direct way.
 * - `moth.end`: the end of Act I. Flags `act1:done`, `heard:spire` (the Spire is
 *   named on the map) and `contact:moth` (Moth on your deck), the ACT II card,
 *   and NIGHT FERRY 7 leaves with Moth (`departed`; NIGHT FERRY 8 takes the berth and the
 *   crane goes on loading regular cargo).
 *
 * Where the trolley and its box are (`trolley`) is a pure function of the model's
 * clock and the lift in progress, so the drawing and the gate's timing agree.
 *
 * Pure: no DOM, so node can run it (the build's check).
 */

import type {TerminalGeometry} from '../../art/assemblies/terminal-state';
import type { SceneData } from "../../data/types";
import type { PlayerServices } from "../../runtime/player";
import type { Effect, SceneRules, World } from "../../engine/rules";
import type { SceneModel, Spot } from "../../engine/model";

/** Save flags the end of Act I sets (ROADMAP: the ending). */
export const ACT1_FLAG = 'act1:done';
export const CONTACT_FLAG = 'contact:moth';
export const SPIRE_FLAG = 'heard:spire';
/** The ACT II card (cutscenes.json). */
export const ACT2_CUT = 'act2';

/** World x of the things the trolley works between (scene.ts draws them there). */
export const X = {
  /** Where the trolley waits between lifts. */
  rest: 1000,
  /** 0451's slot, block B's back row. */
  slot: 476,
  /** The quay chassis under the crane, where the straddle carriers set regular boxes down. */
  chassis: 930,
  /** The thermal gate's plane. */
  gate: 1064,
  /** The ferry's open hatch (regular boxes go down into the hold). */
  hatch: 1300,
  /** 0451's place on the deck, plugged into the ferry's reefer power. */
  deck: 1452,
};
/** Heights of a box's bottom: carried, on the chassis, in its slot, on the deck, down in the hold. */
export const H = { carry: 120, chassis: 14, slot: 58, deck: 4, hold: -64 };

/** A lift's timeline (ms from the cable): the trolley moves over, lowers and hoists, travels, lowers. */
const T = { over: 700, hoist: 600, travel: 1600, lower: 500 };
const SET_MS = T.over + T.hoist + T.travel + T.lower;
/** After an alarm: the box goes back along the boom and down into its slot. */
const RETURN_MS = 1900;

/** What the trolley carries: nothing, a regular box, or 0451. */
export const KIND = { none: 0, regular: 1, box: 2 } as const;

/** Linear between a and b at f (clamped), eased at both ends. */
const ease = (f: number) => { const k = Math.max(0, Math.min(1, f)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** Where a lift picks up and sets down, by kind. */
const route = (kind:number, geometry:TerminalGeometry={X,H}) => {const {X,H}=geometry;return kind===KIND.box?{from:X.slot,to:X.deck,low:H.slot,end:H.deck}:{from:X.chassis,to:X.hatch,low:H.chassis,end:H.hold};};

/** The trolley's x and its box's bottom height `ms` into a lift that started with the trolley at `x0`. */
function liftAt(kind: number, x0: number, ms: number, geometry:TerminalGeometry={X,H}) {
  const {H}=geometry,r = route(kind,geometry);
  if (ms < T.over) return { x: lerp(x0, r.from, ease(ms / T.over)), h: H.carry, load: false };
  let u = ms - T.over;
  if (u < T.hoist) { const k = u < T.hoist / 2 ? u / (T.hoist / 2) : 1 - (u - T.hoist / 2) / (T.hoist / 2); return { x: r.from, h: lerp(H.carry, r.low, ease(k)), load: u >= T.hoist / 2 }; }
  u -= T.hoist;
  // travelling at an even speed, so the box crosses the gate at a known moment
  if (u < T.travel) return { x: lerp(r.from, r.to, u / T.travel), h: H.carry, load: true };
  u -= T.travel;
  if (u < T.lower) return { x: r.to, h: lerp(H.carry, r.end, ease(u / T.lower)), load: true };
  return { x: r.to, h: H.carry, load: false };
}

/** ms into a lift at which its box crosses the thermal gate. */
export const scanMs = (kind: number, geometry:TerminalGeometry={X,H}) => { const {X}=geometry,r = route(kind,geometry); return T.over + T.hoist + T.travel * (X.gate - r.from) / (r.to - r.from); };

/** Where the trolley is now, and what hangs under it: `h` is the bottom of the box (or the empty spreader). */
export function trolley(m: SceneModel,geometry:TerminalGeometry={X,H}): { x: number; h: number; carry: number } {
  const {X,H}=geometry,s = m.scratch, now = m.now();
  if (s.retT0 !== undefined) {
    const u = now - s.retT0, k = u / RETURN_MS;
    if (k < 0.7) return { x: lerp(s.retX, X.slot, ease(k / 0.7)), h: H.carry, carry: KIND.box };
    if (k < 1) return { x: X.slot, h: lerp(H.carry, H.slot, ease((k - 0.7) / 0.3)), carry: KIND.box };
    return { x: X.slot, h: H.carry, carry: KIND.none };
  }
  if (s.liftT0 !== undefined) {
    const p = liftAt(s.liftKind, s.liftX, now - s.liftT0,geometry);
    return { x: p.x, h: p.h, carry: p.load ? s.liftKind : KIND.none };
  }
  return { x: s.restX ?? X.rest, h: H.carry, carry: KIND.none };
}

/** Is the crane busy (a lift or a return in progress)? */
const busy = (m: SceneModel) => m.scratch.liftT0 !== undefined || m.scratch.retT0 !== undefined;
/** The alarm cable: the gate's warm to the alarm. The watchdog checks it on every visit. */
const ALARM = { from: 'port.scanner:warm', to: 'port.alarm', verb: 'sound' };
const alarmWired = (m: SceneModel) => m.links.some((l) => l.from === ALARM.from && l.to === ALARM.to && l.verb === ALARM.verb);

/** A lift's ticket: an alarm or a reload makes a lift in flight forget to land. */
let ticket = 0;

function stacksRules(player: PlayerServices,geometry:TerminalGeometry={X,H}): SceneRules {
const {X}=geometry;
  const effects: Record<string, Effect> = {
    /** STS-2's spreader: a cable lifts (the Registry's clearance), a finger does not. */
    'sts2.lift': (w) => {
      const m = w.m;
      const kind = m.value('stacks.liftKind');
      if (kind !== KIND.box && kind !== KIND.regular) throw new Error('STS-2 requires source liftKind 1 or 2');
      const t = ++ticket, s = m.scratch;
      s.liftT0 = m.now(); s.liftKind = kind; s.liftX = trolley(m,geometry).x; s.ticket = t;
      if (kind === KIND.box) m.set('boxAt', 'air');
      w.emit('lifted');
      // the gate: the box passes through the thermal scan
      m.later(scanMs(kind,geometry), () => {
        if (s.ticket !== t) return;
        if (kind === KIND.regular) { s.cold = m.now(); w.changed(); return; }
        s.warm = m.now();
        // a frozen gate still sees it; it just cannot tell anyone (the engine says so: watchdog.mute)
        if (!m.frozen('port')) w.say(w.line('scan.warm'), 'port');
        m.emit('port.scanner:warm');
        w.changed();
      });
      m.later(SET_MS, () => {
        if (s.ticket !== t) return;
        delete s.liftT0; s.restX = route(kind,geometry).to;
        w.input('stacks.crane.landed');
        w.changed();
      });
      w.changed();
      return kind === KIND.box ? w.line('lift.box') : null;
    },

    /** The alarm: by hand a test; with 0451 in the air, the lift is aborted and the box goes back. */
    'port.alarm': (w) => {
      const m = w.m, s = m.scratch;
      s.alarm = m.now();
      if (m.get('boxAt') !== 'air') { w.changed(); return w.line('alarm.empty'); }
      m.set('alarms', Number(m.get('alarms') ?? 0) + 1);
      // abort: the box goes back into its slot from wherever it is
      s.retX = trolley(m,geometry).x; s.retT0 = m.now(); delete s.liftT0; s.ticket = ++ticket;
      const t = s.ticket;
      m.later(RETURN_MS, () => {
        if (s.ticket !== t) return;
        delete s.retT0; s.restX = X.slot;
        m.set('boxAt', 'stack');
        w.say(w.line('box.back'), 'sts2');
        w.changed();
      });
      w.changed();
      return w.line('alarm.box');
    },


  };

  function tick(w: World) {
    const m = w.m, s = m.scratch;
    // the watchdog's visit: it puts a cut alarm cable back, and logs the tamper
    if (m.frozen('port') && !alarmWired(m)) {
      m.connect(ALARM.from, ALARM.to, ALARM.verb);
      m.addTrace('port', w.tune('tamperTrace'));
      w.say(w.line('watchdog.restore'), 'port');
      w.changed();
    }
    // the crane's moving: redraw is the game's; the status line wants a refresh when a lift ends
    if (s.cold !== undefined && m.now() - s.cold > 1200) { delete s.cold; w.changed(); }
  }

  return {
    effects,
    inputs:['stacks.crane.landed'],
    panels: ['scope'],
    derived: {
      /** Physical trajectory occupancy; source cases own permission/refusal policy. */
      craneBusy: (m) => busy(m),
      reeferTrajectory: (m) => m.scratch.liftKind===KIND.box,
      /** Moth's question has an answer: did you feed Sprat (Moth's place, the feeder)? */
      spratFed: () => !!player.sceneState?.('moth', 'fed'),
      /** STS-2's status: what the trolley is doing. */
      /** The ferry's status line: 7 waiting for 0451, 7 full, or 8 loading once 7 has gone. */
      ferryStatus: (m) => m.get('departed') ? 'NIGHT FERRY 8 · LOADING · DEPARTS WHEN FULL'
        : m.get('boxAt') === 'ferry' ? 'NIGHT FERRY 7 · CARGO 12 OF 12 · CLEARED TO DEPART'
        : 'NIGHT FERRY 7 · CARGO 11 OF 12 · AWAITING NRLU 404 0451',
      crane: (m) => busy(m) ? (m.scratch.retT0 !== undefined ? 'returning a box' : 'lifting') : 'waiting for clearance',
    },
    tick,
    place: (m: SceneModel, home: Spot) => {
      if (home.id === 'reefer') return m.get('boxAt') === 'ferry' && !m.get('departed') ? home : null;
      return home;
    },
    needs: {
      state: ['found', 'box', 'boxAt', 'alarms', 'loaded', 'talked', 'departed'],
      goals: ['find', 'moth'],
      texts: {
        'lift.box': 'line',
        'scan.warm': 'line', 'box.back': 'line',
        'alarm.empty': 'line', 'alarm.box': 'line',
        'watchdog.restore': 'line',
        // the scope (scope.ts)
        'scope.zoom': 'label', 'scope.tag': 'label', 'scope.hud': 'label', 'scope.aim': 'label', 'scope.on': 'label',
        'scope.zoom.ground': 'line', 'scope.zoom.box': 'line', 'scope.zoom.found': 'line', 'scope.zoom.out': 'line',
        'scope.tag.none': 'line', 'scope.tag.wrong': 'line', 'scope.tag.ok': 'line', 'scope.tag.refused': 'line', 'scope.tag.done': 'line',
      },
    },
    /** Controller dependencies: watchdog coverage, cargo identity and tuning. */
    check: (z: SceneData) => {
      const errs: string[] = [];
      for (const d of ['port', 'sts2', 'ferry']) if (!z.watchdog?.route.includes(d)) errs.push(`watchdog: its route must visit ${d} (P15)`);
      if (!z.camera?.crates.some((k) => k.id === z.state.box && k.label === 'NRLU 404 0451')) errs.push('camera.crates: state.box must be the slot that holds NRLU 404 0451 (P15)');
      if (typeof z.tuning.tamperTrace !== 'number') errs.push('tuning.tamperTrace: missing (the watchdog\'s check reads it)');
      return errs;
    },
  };
}

export const stacksRulesFor = stacksRules;

/** For the build-time check: the contract does not depend on whose save it is. */
export const STACKS_RULES_SHAPE = stacksRules({
  save: () => ({ handle: '', tokens: 0, jump: false, controlled: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
});
