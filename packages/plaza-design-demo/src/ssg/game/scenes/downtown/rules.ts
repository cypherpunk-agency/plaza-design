/** Downtown's native DLV-9 trajectories and remaining physical
 * callbacks. Registry control, billboard scheduling and controlled status/lamps
 * use authored shared commands, queries and deadlines. The source formatter's
 * nodes read delegates to the existing canonical player node-count service.
 * DLV access/refusals and sign pulses are authored. DLV completion/finale
 * decisions remain native and are documented separately.
 */

import type { SceneData } from "../../data/types";
import type { Spot, SceneModel } from "../../engine/model";
import type { Effect, World, SceneRules } from "../../engine/rules";

import type { PlayerServices } from "../../runtime/player";

/** Where DLV-9 rests: by the dumpster (its `layout.spot`), outside the market gate, or inside the market (out of the world). */
export type DlvAt = 'home' | 'gate' | 'market' | 'driving';

/** The market gate's span along the street, from its `layout.spot`. */
function gateSpan(z: SceneData) {
  const s = z.devices.find((d) => d.id === 'gate')?.layout?.spot ?? { x: 70, w: 80 };
  return { door: s.x, left: s.x - s.w / 2, right: s.x + s.w / 2 };
}
/** Where DLV-9 waits outside the gate, and where it disappears to inside. */
const OUTSIDE = 22, INSIDE = 70;
/** A signal takes 150 ms down a cable (scene/model.ts `emit`): give each one this long to land before looking at the lock. */
const SIGNAL_MS = 450;

/** DLV-9's x right now (null: inside the market). `home`: its spot by the dumpster. */
export function dlvX(m: SceneModel, home: number): number | null {
  const at = m.get('dlvAt') as DlvAt, g = gateSpan(m.data), s = m.scratch;
  if (at === 'driving') {
    const f = Math.max(0, Math.min(1, (m.now() - s.dlvT0) / Math.max(1, s.dlvT1 - s.dlvT0)));
    return s.dlvX0 + (s.dlvX1 - s.dlvX0) * f;
  }
  if (at === 'market') return null;
  return at === 'gate' ? g.right + OUTSIDE : home;
}

/** One stretch of a drive, for the drawing: from x0 to x1, starting now. Returns how long it takes, ms. */
function leg(w: World, x0: number, x1: number) {
  const m = w.m, ms = (Math.abs(x1 - x0) / w.tune('dlvSpeed')) * 1000;
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
function drive(w: World, p: PlayerServices, inward: boolean) {
  const m = w.m, g = gateSpan(w.data);
  const home = w.data.devices.find((d) => d.id === 'dlv9')!.layout!.spot!.x;
  const from = m.get('dlvAt') as DlvAt, x0 = dlvX(m, home) ?? g.left - INSIDE;
  const scanAt = inward ? g.right : g.left, rest = inward ? g.left - INSIDE : g.right + OUTSIDE;
  m.set('dlvFrom', from); m.set('dlvAt', 'driving');
  // the scanner reads it on the way; it waits at the door long enough for the lock to hear (cables take a moment)
  const toDoor = leg(w, x0, g.door), doorMs = Math.max(toDoor, SIGNAL_MS);
  const scanMs = Math.max(0, Math.min(toDoor * Math.abs(scanAt - x0) / Math.max(1, Math.abs(g.door - x0)), doorMs - SIGNAL_MS));
  m.later(scanMs, () => { m.set('scanned', true); m.emit('gate.scanner:matched'); w.changed(); });
  m.later(doorMs, () => {
    const through = m.get('lock') === 'open';
    if (through) { m.emit('gate.door:passed'); w.say(w.line('dlv.passed'), 'gate'); }
    else w.say(w.line('dlv.bonk'), 'gate');
    // through: on to the other side; bonked: back to where it came from (outside, or inside the market)
    const back = inward ? g.right + OUTSIDE : g.left - INSIDE;
    const ms = Math.max(leg(w, g.door, through ? rest : back), SIGNAL_MS);
    w.changed();
    m.later(ms, () => {
      m.set('scanned', false);
      m.set('dlvAt', through === inward ? 'market' : 'gate');
      if (through && m.get('lock') === 'open' && !p.save().flags.end) {
        p.save().flags.end = true; p.persist();
        const line=w.line('gate.end');p.granted(w.receipt(line,'gate'));
        w.goal('gate'); w.say(line, 'gate'); p.end();
      }
      w.changed();
    });
  });
}

function effects(p: PlayerServices): Record<string, Effect> {
  return {
    /** Physical route endpoints; source Case lists own access and refusal policy. */
    'dlv.inward': (w) => { drive(w, p, true); },
    'dlv.outward': (w) => { drive(w, p, false); },
  };
}

/** For the save: a DLV-9 mid-drive is back where it set off from; a lock it opened on the way is shut again. */

let jokes = 0;

/** Downtown's rules, reading and writing the player's save through `p`. */
export function downtownRules(p: PlayerServices): SceneRules {
  const s = () => p.save();
  return {
    effects: effects(p),
    panels: ['cam3'],
    derived: {
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
      if (home.id !== 'dlv9') return home;
      const x = dlvX(m, home.x);
      return x === null ? null : { ...home, x };
    },
    needs: {
      state: ['lock', 'scanned', 'dlvAt', 'dlvFrom', 'routeFixed'],
      goals: ['gate'],
      texts: {
        'joke.0': 'label', 'joke.1': 'label', 'joke.2': 'label',

        'dlv.bonk': 'line', 'dlv.passed': 'line', 'gate.end': 'line',
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
      for (const id of ['gate', 'dlv9']) if (!z.devices.some((d) => d.id === id)) errs.push(`devices: the code drives "${id}"; it is missing`);
      return errs;
    },
  };
}

/** For the build-time check: the contract does not depend on whose save it is. */
export const DOWNTOWN_RULES_SHAPE = downtownRules({
  save: () => ({ handle: '', tokens: 0, jump: false, controlled: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
});
