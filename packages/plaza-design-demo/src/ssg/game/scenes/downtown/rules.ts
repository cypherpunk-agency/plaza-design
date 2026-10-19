import {downtownController} from '../../engine/controllers/motion';
/** Downtown's native DLV-9 trajectories and remaining physical
 * callbacks. Registry control, billboard scheduling and controlled status/lamps
 * use authored shared commands, queries and deadlines. The source formatter's
 * nodes read delegates to the existing canonical player node-count service.
 * DLV ordinary decisions, milestone responses and finale use authored shared
 * inputs and an END handoff; only sampled collision and trajectory facts stay native.
 */

import type { SceneData } from "../../data/types";
import type { Spot, SceneModel } from "../../engine/model";
import type { Effect, World, SceneRules } from "../../engine/rules";

import type { PlayerServices } from "../../runtime/player";

/** Where DLV-9 rests: by the dumpster (its `layout.spot`), outside the market gate, or inside the market (out of the world). */
export type DlvAt = 'home' | 'gate' | 'market' | 'driving';

/** The market gate's span along the street, from its `layout.spot`. */
function gateSpan(z: SceneData) {
  const s = z.devices.find((d) => d.id === downtownController(z).devices.gate)?.layout?.spot ?? { x: 70, w: 80 };
  return { door: s.x, left: s.x - s.w / 2, right: s.x + s.w / 2 };
}
/** Where DLV-9 waits outside the gate, and where it disappears to inside. */

/** A signal takes 150 ms down a cable (scene/model.ts `emit`): give each one this long to land before looking at the lock. */


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
 * DLV-9 drives through the market gate, in or out. On the way the gate's
 * scanner reads it (`gate.scanner:matched`, pre-wired to open the lock); at the
 * door it passes if the lock is open (`gate.door:passed`, pre-wired to shut it
 * again) or bonks the shutter and backs off. If the gate is still open once it
 * is through, Downtown is cleared.
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

let jokes = 0;

/** Downtown's rules, reading and writing the player's save through `p`. */
export function downtownRules(p: PlayerServices): SceneRules {
  const s = () => p.save();
  return {
    effects: effects(),
    inputs: ['downtown.dlv.started', 'downtown.dlv.scanned', 'downtown.dlv.door', 'downtown.dlv.completed'],
    panels: ['cam3'],
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
      /** The denied jokes, in turn. */
      joke: (m) => m.label('joke.' + (jokes++ % 3)),
    },
    place: (m: SceneModel, home: Spot) => {
      if (home.id !== downtownController(m.data).devices.vehicle) return home;
      const x = dlvX(m, home.x);
      return x === null ? null : { ...home, x };
    },
    needs: {
      devices:[],
      state: [],
      texts: {
        'joke.0': 'label', 'joke.1': 'label', 'joke.2': 'label',

        // shell.ts (the deck's keyboard)
        'login.none': 'line', 'login.baduser': 'line',
        // camera.ts (CAM-3)
        'cam.zoom': 'label', 'cam.tag': 'label', 'cam.loop': 'label', 'cam.hud': 'label', 'cam.on': 'label', 'cam.aim': 'label',
        'cam.zoom.wall': 'line', 'cam.zoom.out': 'line', 'cam.tag.none': 'line', 'cam.tag.ok': 'line',
      },
    },
    /** Downtown's own: CAM-3 needs things to look at, and the moving parts need their devices. */
    check: (z: SceneData) => {
      const errs: string[] = [];
      if (!z.camera?.crates.length) errs.push('camera: CAM-3 needs things under its crosshair ("crates")');
      for (const c of z.camera?.crates ?? []) if (!(('cam.zoom.' + c.id) in z.texts)) errs.push(`texts: missing "cam.zoom.${c.id}" (what CAM-3 says zoomed onto ${c.id})`);
      return errs;
    },
  };
}

/** For the build-time check: the contract does not depend on whose save it is. */
export const DOWNTOWN_RULES_SHAPE = downtownRules({
  save: () => ({ handle: '', tokens: 0, jump: false, controlled: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
});
