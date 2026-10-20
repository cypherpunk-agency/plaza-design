/** Movers and zones (engine/movers.ts, engine/zones.ts): the Tower lab's lift car is a Circuit mover, its lobby sensor a zone wired to call it, and the level rides the mover. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {LevelRuntime, type LiftDrive} from '../../src/ssg/game/engine/level';
import {Movers} from '../../src/ssg/game/engine/movers';
import {Zones} from '../../src/ssg/game/engine/zones';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

// the parts alone: a mover eases between stops and arrives; a zone notices crossings, not standing
let T = 0;
const mv = new Movers(() => T);
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
let now = 0; m.now = () => now;
const car = m.devices.get('lift')!.data.nouns.find(n => n.id === 'car')!;
assert.equal(car.function, 'act'); assert.equal(car.layer, 'hardware');
assert.deepEqual(m.noun('lift.car')!.verbs, ['go metro', 'go b1', 'go lobby', 'go f2', 'go f3', 'go roof', 'return'], 'one verb per stop, and return');
assert.equal(m.movers.position('lift.car'), -190, 'the car starts at its first stop');
const lift = tower.level!.lifts[0];
assert.equal(lift.device, 'lift.car', 'the elevator names its mover');
const stops = car.mover!.stops;
const drive: LiftDrive = {position: () => m.movers.position('lift.car'), target: () => m.movers.moving('lift.car') ? stops[m.movers.target('lift.car')!] : null, go: h => { const s = Object.keys(stops).find(k => Math.abs(stops[k] - h) < .75); if (s) m.moveTo('lift', 'car', s); }};
const L = new LevelRuntime(tower.level!, {[lift.id]: drive});
const p = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
L.arrive(p, tower.spawnH ?? 0);
const frame = (ms = 1000 / 60) => { now += ms; m.player = {x: p.x, h: p.y}; m.tick(1, true); L.update(1, p, 0); };
// into the lobby and up to the sensor: the zone raises enters, the cable sends the car down to the lobby
p.x = 750; assert.ok(L.up(p)); frame();
p.x = 930; frame();
await new Promise(r => setTimeout(r, 400)); // cables carry a signal after 150 ms of real time
frame();
assert.equal(m.movers.target('lift.car'), 'lobby', 'walking up to the lift calls it, through a cable');
for (let i = 0; i < 400; i++) frame();
assert.equal(m.movers.position('lift.car'), 0, 'the car came to the lobby');
for (let i = 0; i < 60; i++) frame();
assert.ok(L.hints(p).some(h => h.label === '[E] STEP IN'), 'its doors open');
L.interact('lift:' + lift.id, p); assert.ok(L.riding, 'stepping in');
L.up(p); for (let i = 0; i < 400; i++) frame();
assert.equal(m.movers.at('lift.car'), 'f2', '↑ rides the mover one stop up');
assert.equal(p.y, 110, 'the car carries the player');
// the hacker's way: the car's verb sends it, with the player inside
m.act('lift', 'car', 'go roof');
for (let i = 0; i < 600; i++) frame();
assert.equal(p.y, 290, 'a verb on the schematic sends the car, and the rider with it');
assert.equal(L.floor.label, 'Roof');
// a save keeps where it is
const snap = m.snapshot() as {movers?: Record<string, {at: string}>};
assert.equal(snap.movers?.['lift.car']?.at, 'roof');
console.log('Circuit movers PASS: mover timing, zone crossings and floors, the Tower lift called by its lobby zone through a cable, ridden through its mover, sent by its verb, saved.');
process.exit(0);
