/**
 * Downtown's code side: the rules too fiddly to be data, as named effects the
 * scene file refers to (`{ "effect": "dlv.drive" }`), the values Downtown reads
 * from the player's save, how it settles a save, and where DLV-9 is while it
 * drives. Everything they say comes from downtown.json's `texts`.
 *
 * Downtown is the first street, so its progress has lived in the save's own
 * fields since before the engine: `handle`, `tokens`, `jump` (legs.so),
 * `freed` (nodes released from the Registry) and `flags` (`till`, `end`).
 * They keep that meaning. The scene reads them as derived values (`till`,
 * `freed2F`, `jump`, …) and its effects write them; the scene's own state is
 * only what is new on the street (the gate's lock, DLV-9, the billboard).
 *
 * Pure: no DOM, so the build-time check and node scripts can import it.
 */

import type { Value, SceneData } from '../data/types';
import type { Spot, SceneModel } from '../engine/model';
import type { Effect, World, SceneRules } from '../engine/rules';

/** The parts of the game's save Downtown reads and writes (level.ts `Save`). */
export interface DowntownSave {
  handle: string;
  tokens: number;
  jump: boolean;
  freed: string[];
  flags: Record<string, boolean>;
}

/** How Downtown's code reaches the player: the save, and the game around it. */
export interface Player {
  save: () => DowntownSave;
  /** Write the save and refresh the HUD (tokens, NODES). */
  persist: () => void;
  /** NODES: how many run free of the Registry. */
  nodes: () => number;
  /** The ACCESS GRANTED chime. */
  granted: () => void;
  /** Downtown is cleared: the end screen. */
  end: () => void;
}

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
function drive(w: World, p: Player, inward: boolean) {
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
        p.save().flags.end = true; p.persist(); p.granted();
        w.goal('gate'); w.say(w.line('gate.end'), 'gate'); p.end();
      }
      w.changed();
    });
  });
}

/** Release a node from the Registry (NODES +1). `fresh`: it was not free before. */
function freeNode(w: World, p: Player, dev: string) {
  const node = w.m.label('node.' + dev), s = p.save(), fresh = !s.freed.includes(node);
  if (fresh) { s.freed.push(node); p.persist(); p.granted(); }
  return { fresh, line: w.line('free.' + dev, { node, nodes: p.nodes() }) };
}

function effects(p: Player): Record<string, Effect> {
  return {
    /** A Registry box opens up: its node is free (which node: `texts["node.<device>"]`). */
    'node.free': (w, c) => freeNode(w, p, c.dev).line,

    /** legs.so out of the box and into your deck: SPACE jumps (the save keeps it as `jump`). */
    'legs.install': (w) => {
      const s = p.save();
      s.jump = true; p.persist(); p.granted();
      return w.line('legs.install');
    },

    /** The till's drawer: noodle tokens, once. `flags.till` means the same as it always did: cracked and paid. */
    'till.pay': (w) => {
      const s = p.save(), n = w.tune('drawerTokens');
      s.tokens += n; s.flags.till = true; p.persist(); p.granted();
      w.goal('till');
      return w.line('till.pay', { tokens: n });
    },

    /** The VERIFY sign lights its tubes one by one (the scene draws it). */
    'sign.test': (w) => { w.m.scratch.signTest = w.m.now(); },

    /**
     * CAM-3's feed on the billboard. The Registry's ad comes back a moment later
     * (`billboard.ads:next`, pre-wired to `show ad`); if the pigeon is still up
     * when it trends, the billboard leaves the Registry.
     */
    'billboard.feed': (w) => {
      const m = w.m;
      m.set('feed', 'cam3');
      m.later(w.tune('adBackMs'), () => m.emit('billboard.ads:next'));
      m.later(w.tune('trendMs'), () => {
        if (m.get('feed') !== 'cam3') return;
        const f = freeNode(w, p, 'billboard');
        if (f.fresh) { w.say(w.line('tv.trend')); w.say(f.line); }
        w.changed();
      });
      return w.line('tv.on');
    },

    /** DLV-9's wheels: `go home` (to the market, once it has a route), `follow you` (back out of it). */
    'dlv.drive': (w, c) => {
      const m = w.m, at = m.get('dlvAt') as DlvAt;
      if (at === 'driving') return w.line('dlv.busy');
      if (c.verb === 'go home') {
        if (!m.get('routeFixed')) return w.line('dlv.lost');
        if (at === 'market') return w.line('dlv.home');
        drive(w, p, true);
        return w.line('dlv.go');
      }
      if (at !== 'market') return w.line('dlv.follow');
      drive(w, p, false);
      return w.line('dlv.out');
    },
  };
}

/** For the save: a DLV-9 mid-drive is back where it set off from; a lock it opened on the way is shut again. */
export function settleDowntown(state: Record<string, Value>) {
  if (state.dlvAt === 'driving') {
    state.dlvAt = state.dlvFrom === 'driving' ? 'home' : state.dlvFrom;
    state.lock = 'shut';
  }
  state.scanned = false;
}

let jokes = 0;

/** Downtown's rules, reading and writing the player's save through `p`. */
export function downtownRules(p: Player): SceneRules {
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
      freed2F: () => s().freed.includes('0x2F'),
      freed31: () => s().freed.includes('0x31'),
      freedTV: () => s().freed.includes('0x3C'),
      end: () => !!s().flags.end,
      nodes: () => p.nodes(),
      /** The denied jokes, in turn. */
      joke: (m) => m.label('joke.' + (jokes++ % 3)),
    },
    settle: settleDowntown,
    place: (m: SceneModel, home: Spot) => {
      if (home.id !== 'dlv9') return home;
      const x = dlvX(m, home.x);
      return x === null ? null : { ...home, x };
    },
    needs: {
      state: ['lock', 'scanned', 'dlvAt', 'dlvFrom', 'routeFixed', 'feed'],
      goals: ['handle', 'till', 'box', 'install', 'relay', 'gate'],
      texts: {
        'joke.0': 'label', 'joke.1': 'label', 'joke.2': 'label',
        'node.box': 'label', 'node.relay': 'label', 'node.billboard': 'label',
        'free.box': 'line', 'free.relay': 'line', 'free.billboard': 'line',
        'till.pay': 'line', 'legs.install': 'line',
        'dlv.busy': 'line', 'dlv.lost': 'line', 'dlv.home': 'line', 'dlv.go': 'line', 'dlv.out': 'line',
        'dlv.follow': 'line', 'dlv.bonk': 'line', 'dlv.passed': 'line', 'gate.end': 'line',
        'tv.on': 'line', 'tv.trend': 'line',
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
      for (const id of ['gate', 'dlv9', 'box', 'relay', 'billboard']) if (!z.devices.some((d) => d.id === id)) errs.push(`devices: the code drives "${id}"; it is missing`);
      for (const id of ['box', 'relay', 'billboard']) if (!(('node.' + id) in z.texts)) errs.push(`texts: missing "node.${id}" (the node it frees)`);
      return errs;
    },
  };
}

/** For the build-time check: the contract does not depend on whose save it is. */
export const DOWNTOWN_RULES_SHAPE = downtownRules({
  save: () => ({ handle: '', tokens: 0, jump: false, freed: [], flags: {} }),
  persist: () => {}, nodes: () => 42, granted: () => {}, end: () => {},
});
