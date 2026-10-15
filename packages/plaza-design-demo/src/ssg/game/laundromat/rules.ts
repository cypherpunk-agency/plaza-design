/**
 * The laundromat's code side (P13 Washer 3). Almost everything is
 * data/laundromat.json on the engine: the four washers, the breaker and its
 * conduits, the schedule's CLOCK and its pre-wired cables, SUDS and its
 * dialogue. What is left here is the bit with timing in it:
 *
 * - `washer.run`: a cable starts a washer's cycle (a finger is refused: SUDS
 *   starts machines on the schedule). The cycle takes `cycleMs`, then the
 *   washer is done and raises `done`. A third machine running trips the
 *   breaker: it raises `tripped`, and the conduits in the wall stop every washer.
 * - `washer.stop`: a cable (the breaker's conduit) stops a running washer and
 *   its cycle is lost; a finger is refused by SUDS (cancelling strangers' washes).
 * - `washer.take`: washer 3's door, once its cycle is done and the queue is
 *   clear: Moth's jacket, the maglev pass (an item: HELD) and the right glove
 *   (a keyring key chip, the twin of DLV-9's left one), and the save flag `p13`.
 * - the breaker resets itself `resetMs` after a trip (the tick).
 *
 * The washers' state keys are `w1`…`w4`: `idle` (a load, a cycle left),
 * `running`, `done`. `door3` (derived) is what washer 3's door does.
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { SceneData, Value } from '../data/types';
import type { Effect, SceneRules, World } from '../engine/rules';
import type { SceneModel } from '../engine/model';

/** The four washers, by device id, and their state keys. */
export const WASHERS = ['washer1', 'washer2', 'washer3', 'washer4'] as const;
const key = (dev: string) => 'w' + dev.replace(/\D/g, '');
/** What Moth's jacket holds: the maglev pass (an item you carry) and the right glove (a key chip). */
export const MAGLEV_PASS = 'maglev.pass';
export const RIGHT_GLOVE = 'glove.right';
/** The save flag for "P13 done": the jacket is out of washer 3. */
export const P13_FLAG = 'p13';

const running = (m: SceneModel) => WASHERS.filter((d) => m.get(key(d)) === 'running').length;
const waiting = (m: SceneModel) => WASHERS.filter((d) => m.get(key(d)) !== 'done').length;
/** Washer 3's door: `locked` (its cycle to run), `held` (done, but SUDS holds it until every wash is done), `open`, `empty` (the jacket taken). */
const door3 = (m: SceneModel): Value => (m.get('jacket') ? 'empty' : m.get('w3') !== 'done' ? 'locked' : waiting(m) ? 'held' : 'open');

/** A run's ticket: a stop or a reload makes a counting cycle forget to finish. */
let ticket = 0;

const EFFECTS: Record<string, Effect> = {
  /** `start`: by cable only. Starts a cycle; a third machine trips the breaker. */
  'washer.run': (w, c) => {
    const m = w.m, k = key(c.dev), name = m.label('name.' + c.dev);
    if (!c.bySignal) { w.say(w.line(c.dev === 'washer3' ? 'suds.prepaid' : 'suds.start'), 'suds'); return null; }
    if (m.get('breaker') === 'tripped') return w.line('washer.nopower', { name });
    if (m.get(k) === 'running') return w.line('washer.already', { name });
    // done: nothing to wash, and nothing to say at every slot from now on
    if (m.get(k) === 'done') return null;
    m.set(k, 'running');
    const t = ++ticket;
    m.scratch['run.' + c.dev] = t;
    m.scratch['at.' + c.dev] = m.now();
    // one breaker, two machines: a third trips it, and the conduits stop every washer
    if (running(m) > w.tune('maxRunning')) {
      m.set('breaker', 'tripped');
      m.set('trips', Number(m.get('trips') ?? 0) + 1);
      m.scratch.tripped = 0;
      w.say(w.line('breaker.trip', { n: running(m) }), 'breaker');
      m.emit('breaker.load:tripped');
      w.changed();
      return null;
    }
    m.later(w.tune('cycleMs'), () => {
      if (m.scratch['run.' + c.dev] !== t || m.get(k) !== 'running') return;
      m.set(k, 'done');
      delete m.scratch['run.' + c.dev];
      if (c.dev === 'washer3') w.goal('run');
      const d3 = door3(m);
      const line = c.dev === 'washer3'
        ? w.line(d3 === 'open' ? 'washer3.done.open' : 'washer3.done.held', { n: waiting(m) })
        : d3 === 'open' ? w.line('queue.clear') : w.line('washer.done', { name });
      w.say(line, d3 === 'open' && c.dev !== 'washer3' ? 'suds' : c.dev);
      m.emit(c.dev + '.drum:done');
      w.changed();
    });
    w.changed();
    return w.line('washer.started', { name, sec: Math.round(w.tune('cycleMs') / 1000) });
  },
  /** `stop`: the breaker's conduit stops a running cycle (lost: the load stays, a cycle left). A finger is refused. */
  'washer.stop': (w, c) => {
    const m = w.m, k = key(c.dev);
    if (!c.bySignal) {
      if (m.get(k) !== 'running') return w.line('washer.idle', { name: m.label('name.' + c.dev) });
      w.say(w.line(c.dev === 'washer3' ? 'suds.cancel.own' : 'suds.cancel'), 'suds');
      return null;
    }
    if (m.get(k) !== 'running') return null;
    m.set(k, 'idle');
    delete m.scratch['run.' + c.dev];
    w.changed();
    return null;
  },
  /** Washer 3's door, once it may open: the jacket, the pass, the glove. */
  'washer.take': (w) => {
    const m = w.m;
    m.set('jacket', true);
    w.say(w.line('jacket.take'));
    const glove = m.give(RIGHT_GLOVE);
    if (glove) w.say(glove);
    m.carry(MAGLEV_PASS, m.carry(MAGLEV_PASS) ? 0 : 1);
    m.flag(P13_FLAG);
    w.goal('jacket');
    w.changed();
    return w.line('jacket.pass');
  },
};

function tick(w: World, dt: number) {
  const m = w.m, s = m.scratch;
  // the breaker resets itself after a while (or by hand: its `reset`)
  if (m.get('breaker') === 'tripped') {
    s.tripped = (s.tripped ?? 0) + dt;
    if (s.tripped >= w.tune('resetMs')) { s.tripped = 0; m.set('breaker', 'on'); w.say(w.line('breaker.auto'), 'breaker'); w.changed(); }
  }
}

export const LAUNDROMAT_RULES: SceneRules = {
  effects: EFFECTS,
  derived: {
    running: (m) => running(m),
    waiting: (m) => waiting(m),
    door3: (m) => door3(m),
  },
  tick,
  /** A cycle in flight is not saved: a running washer comes back stopped, its load still in it. The breaker comes back on. */
  settle: (state) => {
    for (const d of WASHERS) if (state[key(d)] === 'running') state[key(d)] = 'idle';
    state.breaker = 'on';
  },
  needs: {
    state: ['w1', 'w2', 'w3', 'w4', 'breaker', 'trips', 'jacket'],
    goals: ['run', 'jacket'],
    texts: {
      'name.washer1': 'label', 'name.washer2': 'label', 'name.washer3': 'label', 'name.washer4': 'label',
      'suds.start': 'line', 'suds.prepaid': 'line', 'suds.cancel': 'line', 'suds.cancel.own': 'line',
      'washer.nopower': 'line', 'washer.already': 'line', 'washer.started': 'line',
      'washer.done': 'line', 'washer.idle': 'line', 'washer3.done.open': 'line', 'washer3.done.held': 'line',
      'queue.clear': 'line', 'breaker.trip': 'line', 'breaker.auto': 'line', 'jacket.take': 'line', 'jacket.pass': 'line',
    },
  },
  /** P13's own: four washers on one breaker, its stop wired to every washer in the wall, the schedule pre-wired to 1, 2 and 4. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    for (const d of WASHERS) {
      const dev = z.devices.find((x) => x.id === d);
      if (!dev?.nouns.some((n) => n.id === 'drum' && n.events?.includes('done'))) errs.push(`devices[${d}]: needs a "drum" noun that raises "done" (P13)`);
      if (!z.cables.some((c) => c.from === 'breaker.load:tripped' && c.to === d + '.drum' && c.verb === 'stop' && c.fixed)) errs.push(`cables: the breaker's trip must stop ${d} through a fixed cable (P13)`);
    }
    for (const d of ['washer1', 'washer2', 'washer4']) if (!z.cables.some((c) => c.from === 'clock.clock:open' && c.to === d + '.drum' && !c.fixed)) errs.push(`cables: the schedule must start ${d} from the start, cuttable (P13)`);
    if (z.cables.some((c) => c.to === 'washer3.drum' && c.verb === 'start')) errs.push('cables: nothing may start washer 3 from the start: that is the puzzle (P13)');
    for (const k of ['cycleMs', 'resetMs', 'maxRunning']) if (typeof z.tuning[k] !== 'number') errs.push(`tuning.${k}: missing (the washers read it)`);
    return errs;
  },
};
