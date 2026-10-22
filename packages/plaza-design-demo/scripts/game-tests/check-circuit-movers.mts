/** Movers and zones (engine/movers.ts, engine/zones.ts): the Tower lab's lift car is a Circuit mover, its lobby sensor a zone wired to call it, and the level rides the mover. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive, levelFloor, levelHints, levelInteract, levelRiding, levelStep, levelUp, type Level} from '../../src/ssg/game/engine/level';
import {Movers} from '../../src/ssg/game/engine/movers';
import {Zones} from '../../src/ssg/game/engine/zones';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

// the parts alone: a mover eases between stops and arrives; a zone notices crossings, not standing
let T = 0;
const host = {now: () => T, num: (n: number | string) => Number(n), coord: (c: unknown) => c as number, test: (c: string) => c === 'yes'};
const mv = new Movers(host);
mv.add('d', [{id: 'car', layer: 'hardware', function: 'act', mover: {stops: {a: 0, b: 100}, speed: 50}}]);
assert.equal(mv.position('d.car'), 0);
assert.equal(mv.go('d.car', 'b'), 'started');
assert.equal(mv.go('d.car', 'b'), 'already', 'a second order for the same stop is not a new trip');
T = 1000; assert.ok(Math.abs(mv.position('d.car')! - 50) < 0.01, 'halfway at half time');
assert.deepEqual(mv.tick(), [], 'no arrival on the way');
T = 2000; assert.deepEqual(mv.tick().map(a => a.stop), ['b'], 'arrives after distance / speed');
assert.equal(mv.go('d.car', 'nowhere'), 'unknown');
const zs = new Zones();
zs.add('s', [{id: 'eye', layer: 'hardware', function: 'sense', zone: {from: 10, to: 20, watch: 'player', within: [0, 5]}}]);
let at = {x: 15, h: 0};
assert.deepEqual(zs.tick(() => at), [], 'already inside at the start: no event');
at = {x: 30, h: 0}; assert.deepEqual(zs.tick(() => at).map(c => c.event), ['leaves']);
at = {x: 15, h: 50}; assert.deepEqual(zs.tick(() => at), [], 'another floor is outside');
at = {x: 15, h: 2}; assert.deepEqual(zs.tick(() => at).map(c => c.event), ['enters']);
zs.arm('s.eye', false); at = {x: 30, h: 0}; assert.deepEqual(zs.tick(() => at), [], 'disarmed: silent');

// the Tower lab: a SceneModel with the lift and the sensor, the level driven through the mover
const tower = (SCENES as Record<string, SceneDef>).tower;
assert.ok(tower.data && tower.level, 'the Tower lab has devices and a level');
const lines: unknown[] = [];
const m = new SceneModel({say(l: unknown) { lines.push(l); }, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
const car = m.devices.get('lift')!.data.nouns.find(n => n.id === 'car')!;
assert.equal(car.function, 'act'); assert.equal(car.layer, 'hardware');
assert.deepEqual(m.noun('lift.car')!.verbs, ['go metro', 'go b1', 'go lobby', 'go f2', 'go f3', 'go roof', 'return'], 'one verb per stop, and return');
assert.equal(m.movers.position('lift.car'), -190, 'the car starts at its first stop');
const lift = tower.level!.lifts[0];
assert.equal(lift.device, 'lift.car', 'the elevator names its mover');
const p = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
const L: Level = {source: tower.level!, state: levelArrive(tower.level!, p, tower.spawnH ?? 0)};
// one frame as the game runs it: the scene's model ticks (movers, zones, cables), the player's level step reads it
const frame = (ms = 1000 / 60) => { m.player = {x: p.x, h: p.y, ...(levelRiding(L) ? {} : {building: levelFloor(L).building})}; m.tick(ms, true); levelStep(L, p, 0, 1, m); };
// into the lobby and up to the sensor: the zone raises enters, the cable sends the car down to the lobby
p.x = 750; frame(); assert.equal(levelFloor(L).id, 'floor-lobby', 'walked into the lobby');
p.x = 930; frame();
frame(400); // cables carry a signal after 150 ms of scene time
assert.equal(m.movers.target('lift.car'), 'lobby', 'walking up to the lift calls it, through a cable');
for (let i = 0; i < 400; i++) frame();
assert.equal(m.movers.position('lift.car'), 0, 'the car came to the lobby');
for (let i = 0; i < 60; i++) frame();
assert.ok(levelHints(L, p, m).some(h => h.label === '[E] STEP IN'), 'its doors open');
levelInteract(L, 'lift:' + lift.id, p, m); assert.ok(levelRiding(L), 'stepping in');
levelUp(L, p); levelInteract(L, 'lift:' + lift.id, p, m); for (let i = 0; i < 400; i++) frame();
assert.equal(m.movers.at('lift.car'), 'f2', '↑ rides the mover one stop up');
assert.equal(p.y, 110, 'the car carries the player');
// the hacker's way: the car's verb sends it, with the player inside
m.act('lift', 'car', 'go roof');
for (let i = 0; i < 600; i++) frame();
assert.equal(p.y, 290, 'a verb on the schematic sends the car, and the rider with it');
assert.equal(levelFloor(L).label, 'Roof');
// a save keeps where it is
const snap = m.snapshot() as {movers?: Record<string, {at: string}>};
assert.equal(snap.movers?.['lift.car']?.at, 'roof');

// easing curves: the named four and a timing table
import {easeAt} from '../../src/ssg/game/engine/movers';
assert.equal(easeAt('smooth', .5), .5); assert.equal(easeAt('linear', .25), .25); assert.equal(easeAt('ease-in', .5), .25); assert.equal(easeAt('ease-out', .5), .75);
assert.equal(easeAt([[.5, .9]], .25), .45, 'a timing table is linear between its points, from (0,0) to (1,1)');
assert.equal(easeAt([[.5, .9]], 2), 1);

// a point stop, per-leg time and ease, a leg that waits, a choice by state, load labels and leg events
{
  let t = 0, open = true;
  const host2 = {now: () => t, num: (n: number | string) => (typeof n === 'number' ? n : ({fast: 200, wait: 300} as Record<string, number>)[n]), coord: (c: unknown) => c as number, test: (c: string) => c === 'open' && open};
  const pm = new Movers(host2);
  pm.add('d', [{id: 'tr', layer: 'hardware', function: 'act', events: ['started', 'arrived', 'over', 'good', 'bad', 'dwelt'], mover: {
    stops: {rest: {x: 0, h: 10}, a: {x: 100, h: 10}, low: {x: 100, h: 0}, b: {x: 200, h: 10}, c: {x: 0, h: 10}}, speed: 100, ease: 'linear', wired: false,
    paths: {
      run: [
        {to: 'a', ms: 'fast', event: 'over'},
        {to: 'low', ms: 100, load: 'box'},
        {to: 'a', ms: 100, load: 'box'},
        {if: 'open', then: [{to: 'b', ms: 400, ease: 'ease-in', event: 'good'}], else: [{to: 'c', event: 'bad'}]},
      ],
      dwell: [{to: 'a', ms: 100, minMs: 'wait', event: 'dwelt'}],
    },
  }} as never]);
  assert.deepEqual(pm.place('d.tr'), {x: 0, h: 10}, 'a point stop places both axes');
  assert.equal(pm.runPath('d.tr', 'nowhere'), 'unknown');
  assert.equal(pm.runPath('d.tr', 'run'), 'started'); assert.equal(pm.lastRun('d.tr'), 'run');
  t = 100; assert.deepEqual(pm.place('d.tr'), {x: 50, h: 10}, 'a leg runs in its own time (a tuning name works) with the mover ease'); assert.equal(pm.load('d.tr'), undefined);
  t = 200; assert.deepEqual(pm.tick().map(e => e.event), ['over'], 'a leg end raises its event');
  t = 250; assert.deepEqual(pm.place('d.tr'), {x: 100, h: 5}, 'the next leg moves only the height'); assert.equal(pm.load('d.tr'), 'box', 'a leg labels what rides along');
  t = 400; assert.deepEqual(pm.tick(), []); assert.equal(pm.load('d.tr'), undefined);
  t = 600; assert.equal(pm.place('d.tr')!.x, 125, 'the choice took the then leg: ease-in a quarter of the way at half time');
  t = 800; assert.deepEqual(pm.tick().map(e => e.event + ':' + (e.stop ?? '')), ['arrived:b', 'good:'], 'the trip ends: arrived, then the last leg event'); assert.equal(pm.at('d.tr'), 'b'); assert.equal(pm.moving('d.tr'), false);
  // the same path when the choice goes the other way, and with one tick far past the end
  open = false; t = 1000; pm.runPath('d.tr', 'run'); t = 9000;
  assert.deepEqual(pm.tick().map(e => e.event), ['over', 'arrived', 'bad'], 'a long tick settles every leg in order, the choice by the state when it was reached'); assert.equal(pm.at('d.tr'), 'c');
  assert.deepEqual(pm.place('d.tr'), {x: 0, h: 10});
  // a leg waits for its minimum time at its end
  t = 10000; pm.runPath('d.tr', 'dwell'); t = 10150; assert.deepEqual(pm.place('d.tr'), {x: 100, h: 10}, 'there after its travel');
  assert.deepEqual(pm.tick(), [], 'but not done yet'); t = 10300; assert.deepEqual(pm.tick().map(e => e.event), ['arrived', 'dwelt']);
  // a path in flight is saved settled where it set off; a new path turns it round from where it is
  t = 11000; pm.runPath('d.tr', 'run'); t = 11100; assert.deepEqual(pm.snapshot()['d.tr'], {at: 'a'}); pm.runPath('d.tr', 'dwell'); assert.equal(pm.place('d.tr')!.x, 100, 'a new path starts from where it is (the first leg of run had reached a)');
}

// in a scene's model: tuning-named numbers, a spot and a place for stops, a mover that follows a state key and writes another,
// a zone on that mover, and a milestone that reports the crossing to the scene's code
{
  const data = emptyData('lab', 'lab');
  Object.assign(data, {
    state: {want: 'home', at: 'home'}, tuning: {off: 7, ms: 500},
    devices: [
      {id: 'bay', name: 'Bay', look: '', status: '', layout: {spot: {x: 100, w: 20, h: 10}}, nouns: []},
      {id: 'd', name: 'D', look: '', status: '', nouns: [
        {id: 'car', layer: 'hardware', function: 'act', events: ['started', 'arrived'], mover: {stops: {home: 0, a: {place: 'p'}, b: {spot: 'bay', edge: 'right', plus: 'off'}}, ms: 'ms', ease: 'linear', set: 'at', moving: 'rolling', follow: 'want', wired: false}},
        {id: 'eye', layer: 'hardware', function: 'sense', events: ['enters'], milestone: {enters: 'seen'}, zone: {from: {place: 'p', plus: 10}, to: 60, watch: 'd.car'}},
      ]},
    ],
  });
  const seen: string[] = [];
  const lab = new SceneModel({say() {}, changed() {}, open() {}} as never, data as never, {effects: {}, inputs: ['seen'], places: {p: {x: 40, h: 0}}} as never);
  lab.gameplayInput = (id: string) => { seen.push(id); return {ok: true, events: []} as never; };
  assert.deepEqual(lab.noun('d.car')!.verbs, [], 'a mover that is not wired has no engine verbs');
  assert.deepEqual(lab.movers.stopPositions('d.car'), {home: 0, a: 40, b: 117}, 'stops resolve: a place of the scene, a device spot edge plus a tuning number');
  let clock = 0; lab.now = () => clock;
  lab.tick(0, true); lab.set('want', 'a'); clock = 100; lab.tick(100, true);
  assert.equal(lab.get('at'), 'rolling', 'following the state key sent it, and set holds what moving says'); assert.equal(lab.movers.target('d.car'), 'a');
  clock = 300; lab.tick(200, true); assert.deepEqual(seen, [], 'not into the zone yet');
  clock = 600; lab.tick(300, true); assert.equal(lab.get('at'), 'a', 'arrived: set holds the stop'); assert.equal(lab.movers.position('d.car'), 40);
  lab.set('want', 'b'); for (clock = 650; clock <= 1200; clock += 50) lab.tick(50, true);
  assert.deepEqual(seen, ['seen'], 'the zone noticed it cross, and the milestone of its noun reported it to the code of the scene'); assert.equal(lab.get('at'), 'b');
  // a saved game: where state says, and a trip cut short settles
  lab.set('at', 'home'); lab.restore(lab.snapshot() as never); assert.equal(lab.get('at'), 'b', 'restore puts state where the mover was saved');
  lab.set('want', 'home'); clock = 1200; lab.tick(100, true); lab.set('at', 'rolling');
  const bare = new SceneModel({say() {}, changed() {}, open() {}} as never, data as never, {effects: {}, inputs: ['seen'], places: {p: {x: 40, h: 0}}} as never, undefined, undefined, undefined, {want: 'home', at: 'a'});
  assert.equal(bare.movers.at('d.car'), 'a', 'a mover starts where the state already says'); assert.equal(bare.movers.position('d.car'), 40);
}
// the yard's claw hook is a mover that follows the arm's state: the same place at the same scene time however the frames fall
{
  const yard = (SCENES as Record<string, SceneDef>).yard, player = {save: () => ({handle: '', tokens: 0, jump: false, controlled: [], flags: {}}), persist() {}, nodes: () => 0, granted() {}, end() {}};
  const rules = (typeof yard.rules === 'function' ? yard.rules(player as never) : yard.rules) as {places: Record<string, {x: number; h: number}>};
  const run = (dt: number) => {
    const y = new SceneModel({say() {}, changed() {}, open() {}} as never, yard.data!, rules as never);
    assert.equal(y.movers.position('crane.hook'), rules.places.home.x, 'the hook starts at the home slot');
    y.tick(dt, true); y.act('crane', 'arm', 'A-3');
    let t = 0, at500 = NaN;
    while (t < 2000) { y.tick(dt, true); t += dt; if (t === 500) at500 = y.movers.position('crane.hook')!; }
    assert.equal(y.movers.position('crane.hook'), rules.places['A-3'].x, 'the hook settles on the slot the arm names');
    return at500;
  };
  const a = run(10), b = run(50);
  assert.ok(Math.abs(a - b) < 1e-6, 'the hook is where the clock says it is: ' + a + ' vs ' + b);
  const lo = Math.min(rules.places.home.x, rules.places['A-3'].x), hi = Math.max(rules.places.home.x, rules.places['A-3'].x);
  assert.ok(a > lo && a < hi, 'and mid-way at half a second: ' + a + ' between ' + lo + ' and ' + hi);
}
// a loop line: a ring, trips that run another path when they end, stops a state key names, legs that begin part way in or send another mover,
// a path that begins from a stop, sounds, the time to go, and the emergency stop with its snap, its zone on the stopping point, and its relay
{
  let t = 0, want = 'b', pass = false;
  const hostR = {now: () => t, num: (n: number | string) => (typeof n === 'number' ? n : ({run: 1000, door: 100, hold: 500, decel: 1000, win: 40}[n as 'run'] ?? NaN)), coord: (c: unknown) => c as number, test: (c: string) => c === 'pass' && pass, read: (k: string) => (k === 'next' ? want : undefined)};
  const rm = new Movers(hostR);
  rm.add('d', [
    {id: 'doors', layer: 'hardware', function: 'act', mover: {wired: false, ease: 'linear', start: 'open', stops: {shut: 0, open: 1}, paths: {open: [{to: 'open', ms: 'door'}], shut: [{to: 'shut', ms: 'door'}], snap: [{to: 'open', ms: 0}]}}},
    {id: 'car', layer: 'hardware', function: 'act', events: ['started', 'arrived', 'depart', 'arrive', 'stopped'], mover: {
      wired: false, ring: 300, ease: 'linear', start: 'a', auto: 'stand', stops: {a: 0, b: 100, c: 200, mark: 60},
      brake: {decel: 'decel', snap: [{stop: 'mark', window: 'win'}], then: {track: 'halt', mark: 'halt'}, load: 'braking', event: 'stopped'},
      paths: {
        stand: [{ms: 'hold', load: 'dwell', drives: 'doors:snap'}, {ms: 'door', load: 'closing', drives: 'doors:shut', event: 'depart', cue: 'close'}, {run: 'go'}],
        go: [{if: 'pass', then: [{to: '@next', ms: 'run', load: 'running', event: 'arrive', cue: 'open'}], else: [{to: '@next', ms: 'run', load: 'running', event: 'arrive', cue: 'open'}]}, {run: 'open'}],
        open: [{ms: 'door', load: 'opening', drives: 'doors:open'}, {run: 'stand'}],
        halt: [{ms: 'hold', load: 'halted'}, {to: '@next', speed: 100, load: 'resuming'}, {run: 'open'}],
        home: [{from: 'c'}, {to: 'a', ms: 'run', ahead: 500, load: 'running'}],
      },
    }},
  ] as never);
  const log: string[] = [];
  const settle = (to: number) => { while (t < to) { t = Math.min(to, t + 10); for (const e of rm.tick()) if (e.noun === 'car') log.push(e.event === 'cue' ? 'cue:' + e.cue : e.event + (e.stop ? ':' + e.stop : '')); } };
  // auto: the mover is idle when it is added, so it runs its auto path; the leg drives the doors
  assert.equal(rm.load('d.car'), 'dwell', 'an auto path runs when the mover is added'); assert.equal(rm.position('d.doors'), 1);
  settle(550); assert.equal(rm.load('d.car'), 'closing'); assert.ok(Math.abs(rm.position('d.doors')! - .5) < .01, 'the leg drove the doors shut');
  settle(600); assert.deepEqual(log, ['depart', 'cue:close', 'started'], 'closing ends: its event and its sound, then the next trip starts at the same instant');
  assert.equal(rm.load('d.car'), 'running'); assert.equal(rm.target('d.car'), 'b', '@next named the stop when the leg began'); assert.equal(rm.at('d.car'), 'a', 'at is the stop it left');
  settle(1100); assert.ok(Math.abs(rm.position('d.car')! - 50) < .01, 'half way to b');
  settle(1600); assert.equal(rm.at('d.car'), 'b', 'the run is a trip: when it ends it is at b'); assert.deepEqual(log.slice(3), ['arrived:b', 'arrive', 'cue:open', 'started']);
  assert.equal(rm.load('d.car'), 'opening', 'the next path began at the same instant');
  // a ring: legs go forward round it
  want = 'a'; settle(2250); assert.equal(rm.load('d.car'), 'closing'); settle(2800); assert.ok(Math.abs(rm.position('d.car')! - 200) < .01, 'b to a goes forward, through the wrap: 200 of the 300 at half time');
  settle(3400); assert.equal(rm.at('d.car'), 'a'); assert.ok(rm.position('d.car')! >= 0 && rm.position('d.car')! < 1);
  // to the stop it stands at is once round; the time left until a leg labelled opening ends follows the run on into the next path
  want = 'a'; assert.equal(rm.runPath('d.car', 'go', {from: 'a'}), 'started'); settle(t + 500); assert.ok(Math.abs(rm.position('d.car')! - 150) < .01, 'once round the 300 ring: half way at half time');
  assert.ok(Math.abs(rm.etaTo('d.car', 'opening') - 600) < .01, 'the rest of the run and the doors: ' + rm.etaTo('d.car', 'opening')); assert.equal(rm.etaTo('d.car', 'running'), 0, 'zero while it is on that leg');
  // the emergency stop: it slows at the rate it is given and rests exactly at the snap stop when it would stop within the window of it
  want = 'c'; rm.runPath('d.car', 'go', {from: 'a'}); settle(t + 100);
  assert.deepEqual(rm.brakePreview('d.car'), {result: 'braking', where: 'mark'}, 'stopping 20 along from 20 is near the mark at 60: it lands there');
  assert.deepEqual(rm.brake('d.car'), {result: 'braking', where: 'mark'}); assert.equal(rm.load('d.car'), 'braking'); assert.equal(rm.brake('d.car').result, 'already'); assert.equal(rm.halted('d.car'), 'mark');
  assert.ok(Math.abs(rm.stopPoint('d.car')!.x - 60) < 1e-9, 'while it brakes its stopping point is where it will rest (a zone on it sees that)');
  log.length = 0; settle(t + 400); assert.equal(rm.load('d.car'), 'halted'); assert.ok(log.includes('stopped'), 'rest raises the brake\'s event'); assert.ok(Math.abs(rm.position('d.car')! - 60) < 1e-6, 'at rest on the snap stop');
  assert.equal(rm.at('d.car'), 'a', 'still the stop it left'); assert.equal(rm.target('d.car'), 'c', 'and still heading where it was going'); assert.equal(rm.brake('d.car').result, 'standing');
  // a path started while it is held is still on its run: it keeps the stop it was heading for
  rm.runPath('d.car', 'halt'); assert.equal(rm.target('d.car'), 'c'); settle(t + 500); assert.equal(rm.load('d.car'), 'resuming'); settle(t + 1500); assert.equal(rm.at('d.car'), 'c', 'it went on to c, at its speed (140 units at 100 per second)');
  // far from the snap stop it stops on the track; with the end of the leg nearer than its stopping distance it goes on to its stop
  settle(t + 1200); want = 'b'; rm.runPath('d.car', 'go', {from: 'a'}); settle(t + 30); assert.deepEqual(rm.brakePreview('d.car'), {result: 'braking', where: 'track'});
  settle(t + 930); assert.equal(rm.brake('d.car').result, 'arriving');
  // a path that begins from a stop, with its first leg already part way in
  rm.runPath('d.car', 'home'); assert.equal(rm.at('d.car'), 'c'); settle(t + 1); assert.ok(Math.abs(rm.position('d.car')! - 250) < 1, 'it joins its run half way: 100 units round from c to a, half done: ' + rm.position('d.car'));
  // a loop that takes no time is stopped
  const z = new Movers(hostR); z.add('d', [{id: 'x', layer: 'hardware', function: 'act', mover: {wired: false, stops: {a: 0}, auto: 'loop', paths: {loop: [{ms: 0}, {run: 'loop'}]}}} as never]);
  assert.throws(() => z.tick(), /without taking any time/);
}
console.log('Circuit movers PASS: mover timing, easing, paths with legs and choices, rings, trips that run on, @key stops, drives, ahead, cues, the emergency stop with its snap and halt paths, zone crossings and floors, the Tower lift called by its lobby zone through a cable, ridden through its mover, sent by its verb, saved.');
process.exit(0);
