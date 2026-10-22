/**
 * People flows (world/people-flow.ts, SEAMLESS-WORLD.md §5): a pure model of people who walk routes across zones,
 * queue and board vehicles. Checks: the same seed and time give the same people; queues keep arrival order and
 * spacing and shuffle forward; the short memory keeps the same people for about a minute and then lets go; a
 * routine sets off at its time on the city clock; a walk crosses a seam continuously; boarding hands people to the
 * vehicle's trip; and today's platformQueue timing (world/transport/line.ts) is kept as the player sees it.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateZoneGraph} from '../../src/ssg/game/world/zone-graph';
import {CLOCK_RATE} from '../../src/ssg/game/world/clock';
import {
  flowPeople, flowProblems, handedOff, hold, personAt, platformFlow, populate, recall, remember, routineTime, sceneFlowTime,
  timetableVehicle, cityFlowTime, type FlowSource, type FlowVehicle, type FlowWorld, type PersonHere,
} from '../../src/ssg/game/world/people-flow';
import {platformQueue} from '../../src/ssg/game/world/transport/line';

const graph = validateZoneGraph({version: 1, seams: [
  {id: 'lab-annex', kind: 'walk', a: {zone: 'lab'}, b: {zone: 'annex'}, dx: 400, dh: 0},
  {id: 'annex-loft', kind: 'stairs', a: {zone: 'annex', piece: 'up'}, b: {zone: 'loft', piece: 'landing'}, dx: 0, dh: 80},
]});

// a shuttle stopping in the annex every 30 s, doors open 8 s, two doors; tripAt: the first trip whose doors close (n·30 + 18) after t
const shuttle: FlowVehicle = {
  id: 'shuttle',
  tripAt: t => Math.max(0, Math.floor((t - 18) / 30) + 1),
  doors: n => n < 0 ? null : {trip: n, open: n * 30 + 10, close: n * 30 + 18, doors: [{zone: 'annex', x: 200}, {zone: 'annex', x: 260}]},
};
assert.equal(shuttle.tripAt(17.9), 0); assert.equal(shuttle.tripAt(18), 1);
const world: FlowWorld = {graph, vehicles: {shuttle}};
const looks = ['phone', 'paper', 'suit', 'courier', 'elder', 'punk'];

// ---- determinism ----
const commuters: FlowSource = {
  id: 'commuters', clock: 'scene', seed: 41, looks, maxWait: 60,
  spawn: {kind: 'interval', every: 3, jitter: 0.6},
  route: [{kind: 'walk', zone: 'lab', x: 40}, {kind: 'wait', zone: 'lab', x: 120, dwell: 2}, {kind: 'board', zone: 'annex', x: 200, vehicle: 'shuttle', slots: 8, spacing: 14, gap: 0.6}],
};
assert.deepEqual(flowProblems(commuters, world), []);
for (const t of [5, 23.5, 61, 140.25]) {
  assert.deepEqual(flowPeople(commuters, world, t), flowPeople(commuters, world, t), 'same seed and time, same people');
  const fresh = structuredClone(commuters);
  assert.deepEqual(flowPeople(fresh, world, t), flowPeople(commuters, world, t), 'nothing is kept between calls');
}
assert.notDeepEqual(flowPeople({...commuters, seed: 42}, world, 61).map(p => p.key + p.look), flowPeople(commuters, world, 61).map(p => p.key + p.look), 'another seed, other people');
// a person is the same whenever asked, in any order
const asked = [80, 60, 70].map(t => personAt(commuters, world, 20, t)), again = [60, 70, 80].map(t => personAt(commuters, world, 20, t));
assert.deepEqual(asked, [again[2], again[0], again[1]]);

// ---- queue order and spacing ----
let sawQueue = false;
for (let t = 0; t < 200; t += 0.25) {
  const q = flowPeople(commuters, world, t).filter((p): p is PersonHere => p.state === 'here' && p.act === 'queue').sort((a, b) => b.x - a.x);
  if (q.length >= 3) sawQueue = true;
  for (const p of q) assert.ok(p.zone === 'annex' && p.x <= 200 + 1e-6, 'queued at or behind the head');
  for (let i = 1; i < q.length; i++) assert.ok(q[i - 1].x - q[i].x >= 14 - 1e-6, `queue spacing at ${t}: ${q.map(p => p.x.toFixed(1))}`);
  const settled = q.filter(p => Math.abs(((200 - p.x) / 14) - Math.round((200 - p.x) / 14)) < 1e-6);
  for (const p of settled) assert.ok(p.x >= 200 - 14 * 7 - 1e-6, 'within the slots');
}
assert.ok(sawQueue, 'a queue forms');
// boarding order follows arrival order at the queue
for (const trip of [2, 3, 4]) {
  const on = handedOff(commuters, world, trip);
  assert.ok(on.length > 0 && on.length <= 8, `trip ${trip} takes at most the queue's slots`);
  const boardTimes = on.map(p => { for (let t = trip * 30 + 10; t <= trip * 30 + 18; t += 0.05) if (personAt(commuters, world, p.index, t)?.state === 'aboard') return t; return Infinity; });
  for (let i = 1; i < boardTimes.length; i++) assert.ok(boardTimes[i] >= boardTimes[i - 1], 'first come, first aboard');
  assert.ok(boardTimes.every(t => t < trip * 30 + 18), 'all aboard before the doors close');
  for (const p of on) assert.deepEqual([p.vehicle, p.trip], ['shuttle', trip]);
  assert.ok(new Set(on.map(p => p.door)).size >= 1 && on.every(p => p.door === 0), 'the queue head is at door 0 (x 200), so they take that door');
  // the same people stay aboard afterwards: handed off, not respawned
  for (const p of on) assert.deepEqual(personAt(commuters, world, p.index, trip * 30 + 25), p);
}
// a shuffle forward is a walk, not a jump: between samples nobody moves more than walking speed allows
for (let t = 60; t < 100; t += 0.1) {
  const a = new Map(flowPeople(commuters, world, t).filter((p): p is PersonHere => p.state === 'here').map(p => [p.key, p]));
  for (const p of flowPeople(commuters, world, t + 0.1)) if (p.state === 'here' && a.get(p.key)?.zone === p.zone) assert.ok(Math.abs(p.x - a.get(p.key)!.x) <= 38 * 1.15 * 0.1 + 1e-6, `${p.key} jumps at ${t}`);
}

// ---- crossing a seam ----
const stroll: FlowSource = {
  id: 'stroll', clock: 'scene', seed: 7, looks, spawn: {kind: 'interval', every: 1000},
  route: [{kind: 'walk', zone: 'lab', x: 300}, {kind: 'walk', zone: 'annex', x: 100}, {kind: 'walk', zone: 'annex', x: 20}, {kind: 'walk', zone: 'loft', x: 60, h: 0}, {kind: 'leave', zone: 'loft', x: 120}],
};
assert.deepEqual(flowProblems(stroll, world), []);
let last: {wx: number; wh: number; zone: string} | null = null, zones: string[] = [];
for (let t = 1000; t < 1040; t += 0.05) {
  const p = personAt(stroll, world, 1, t);
  if (!p) { if (last) break; continue; }
  assert.equal(p.state, 'here');
  if (p.state !== 'here') continue;
  const wx = p.x + (p.zone === 'annex' ? 400 : p.zone === 'loft' ? 400 : 0), wh = p.h + (p.zone === 'loft' ? 80 : 0);
  if (p.zone === 'lab') assert.ok(p.x < 400, 'in the lab until the edge');
  if (p.zone === 'annex') assert.ok(p.x >= 0);
  if (last) assert.ok(Math.abs(wx - last.wx) + Math.abs(wh - last.wh) < 3, `no jump across the seam at ${t} (${last.zone} ${last.wx} → ${p.zone} ${wx})`);
  if (zones[zones.length - 1] !== p.zone) zones.push(p.zone);
  last = {wx, wh, zone: p.zone};
}
assert.deepEqual(zones, ['lab', 'annex', 'loft'], 'walks lab → annex over the walk seam, then up the stairs into the loft');
assert.equal(personAt(stroll, world, 1, 1100), null, 'gone after leaving');
assert.match(flowProblems({...stroll, route: [{kind: 'walk', zone: 'lab', x: 0}, {kind: 'walk', zone: 'loft', x: 0}]}, world).join(), /not joined by a seam/);

// ---- the short memory ----
// people who linger two minutes in the lab: many more than the density cap
const loiter: FlowSource = {id: 'loiter', clock: 'scene', seed: 5, looks, spawn: {kind: 'interval', every: 2, jitter: 0.5},
  route: [{kind: 'walk', zone: 'lab', x: 20}, {kind: 'wait', zone: 'lab', x: 200, dwell: 120}, {kind: 'leave', zone: 'lab', x: 390}]};
const t0 = 400, capped = populate([loiter], world, 'lab', t0, {cap: 4});
assert.equal(capped.length, 4, 'the density cap');
assert.deepEqual(populate([loiter], world, 'lab', t0 + 0.1, {cap: 4}).map(p => p.key), capped.map(p => p.key), 'the capped pick is stable frame to frame');
// on screen: four people the cap alone would not pick (as if they walked into view first), one of them held up 3 s
const crowdNow = populate([loiter], world, 'lab', t0, {cap: 200});
const walking = crowdNow.find(p => p.act === 'walk' && !capped.some(c => c.key === p.key))!;
const here0 = [walking, ...crowdNow.filter(p => p.act === 'stand' && !capped.some(c => c.key === p.key)).sort((a, b) => b.index - a.index).slice(0, 3)];
assert.equal(here0.length, 4);
const lags = hold(new Map(), walking.key, t0, 3), memory = remember(here0, lags, t0);
const heldPose = personAt(loiter, world, walking.index, t0 + 2, lags) as PersonHere;
assert.equal(heldPose.x, walking.x, 'a held person stands where they were held');
assert.equal(heldPose.act, 'stand');
assert.ok((personAt(loiter, world, walking.index, t0 + 5, lags) as PersonHere).x < (personAt(loiter, world, walking.index, t0 + 5) as PersonHere).x, 'and then carries on, later than the pure schedule');
// the zone unloads; back 45 s later
const back = recall(memory, t0 + 45);
assert.ok(back, 'back within the minute: remembered');
assert.deepEqual(back!.lags.get(walking.key), [{from: t0, seconds: 3}], 'the held person is still running late');
const later = populate([loiter], world, 'lab', t0 + 45, {cap: 4, keep: back!.keep, lags: back!.lags});
assert.deepEqual(later.map(p => p.key).sort(), here0.map(p => p.key).sort(), 'the same people are the ones shown');
const pure = populate([loiter], world, 'lab', t0 + 45, {cap: 4});
assert.notDeepEqual(pure.map(p => p.key).sort(), here0.map(p => p.key).sort(), 'without the memory the cap shows others');
// after about a minute the memory is ignored: the pure schedule (new people) takes over
assert.equal(recall(memory, t0 + 60), null);
assert.equal(recall(undefined, t0), null);
assert.notDeepEqual(populate([loiter], world, 'lab', t0 + 61, {cap: 4}).map(p => p.key).sort(), here0.map(p => p.key).sort());

// ---- routines ----
const neighbour: FlowSource = {
  id: 'neighbour-4b', clock: 'city', seed: 404, looks, spawn: {kind: 'routine', at: '07:40'},
  route: [{kind: 'walk', zone: 'lab', x: 50}, {kind: 'leave', zone: 'lab', x: 390}],
};
assert.deepEqual(flowProblems(neighbour, world), []);
assert.equal(routineTime('07:40', 3), cityFlowTime(2 * 1440 + 460));
assert.equal(cityFlowTime(60), 60 / CLOCK_RATE, 'a city hour is two real minutes');
for (const day of [1, 2, 5]) {
  const at = routineTime('07:40', day);
  assert.equal(personAt(neighbour, world, day, at - 0.01), null, 'not out before 07:40');
  const p = personAt(neighbour, world, day, at + 1);
  assert.ok(p && p.state === 'here' && p.x > 50 && p.x < 90, `day ${day}: out of the door at 07:40 and walking`);
  assert.equal(p.look, personAt(neighbour, world, 1, routineTime('07:40', 1) + 1)?.look, 'the same neighbour every day');
  assert.equal(personAt(neighbour, world, day, at + 60), null, 'gone up the street a minute later');
}
assert.equal(populate([neighbour], world, 'lab', routineTime('07:40', 4) + 3).length, 1, 'found by populate on day 4');
assert.equal(populate([neighbour], world, 'lab', routineTime('12:00', 4)).length, 0);
assert.match(flowProblems({...neighbour, clock: 'scene'}, world).join(), /city clock/);

// ---- people stepping off ----
const off: FlowSource = {id: 'off', clock: 'scene', seed: 9, looks, spawn: {kind: 'alight', vehicle: 'shuttle', count: 4, on: 1, gap: 0.5}, route: [{kind: 'leave', zone: 'annex', x: 380}]};
const steps = flowPeople(off, world, 3 * 30 + 10 + 0.1).filter((p): p is PersonHere => p.state === 'here');
assert.ok(steps.length >= 1 && steps.every(p => Math.abs(p.x - 200) < 5 || Math.abs(p.x - 260) < 5), 'they step off at the doors');

// ---- today's platform queue, kept as experienced (Decided 9) ----
const metro = JSON.parse(fs.readFileSync('src/ssg/game/world/transport/metro.json', 'utf8'));
const T = metro.timetable, OFF = metro.offset.downtown;
const train = timetableVehicle({id: 'downtown-service', zone: 'metro', timetable: T, offset: OFF, doors: [300, 420]});
const pworld: FlowWorld = {graph, vehicles: {'downtown-service': train}};
const platform = platformFlow({id: 'metro-door-1', zone: 'metro', vehicle: 'downtown-service', entry: {zone: 'metro', x: 120}, door: 300, count: 5, seed: 300, looks, timetable: T});
assert.deepEqual(flowProblems(platform, pworld), []);
let present = 0, boardedChecks = 0;
for (let frames = T.loop * 3; frames < T.loop * 7; frames += 5) {
  const tl = {t: frames, shift: 0}, t = sceneFlowTime(tl), q = platformQueue('downtown', tl);
  const people = flowPeople(platform, pworld, t), here = people.filter(p => p.state === 'here');
  // today: the queue for train q.train stands until it has boarded; flows: those people are on the platform or aboard
  if (q.boarded) { boardedChecks++; assert.equal(here.length, 0, `nobody waits once platformQueue says boarded (frame ${frames})`); }
  for (const p of here) assert.equal(Math.floor(p.index / 5), q.train, 'whoever waits waits for the train platformQueue names');
  present += here.length;
}
assert.ok(present > 0 && boardedChecks > 0);
// the doors and the trip numbers are today's: open from 7.5 % into the dwell, trip n = floor((t + offset) / loop)
const w4 = train.doors(4)!;
assert.ok(Math.abs(w4.open - (4 * T.loop - OFF + T.arrive + 0.075 * T.dwell) / 60) < 1e-9);
assert.equal(platformQueue('downtown', {t: w4.open * 60, shift: 0}).train, 4);
// handed to trip 4 of the service: the car's manifest from this door
const on4 = handedOff(platform, pworld, 4);
assert.ok(on4.every(p => p.vehicle === 'downtown-service' && p.trip === 4 && p.door === 0));
assert.deepEqual(on4.map(p => p.key), flowPeople(platform, pworld, (w4.open + w4.close) / 2 + 3).filter(p => p.state === 'aboard' && p.trip === 4).map(p => p.key), 'the same people as seen on the platform');
assert.equal(flowPeople(platform, pworld, w4.open - 0.01).filter(p => p.state === 'here').length, on4.length, 'all of them stand on the platform as the doors open');

// the memory's minute is longer than a train (25 s): back after it, the people waiting are a later train's
const waiting = (t: number) => flowPeople(platform, pworld, t).filter(p => p.state === 'here').map(p => p.key);
assert.ok(waiting(w4.open - 1).length > 0);
assert.equal(waiting(w4.open - 1 + 61).filter(k => waiting(w4.open - 1).includes(k)).length, 0, 'new people a minute later');

console.log('people-flow: determinism, queues, seams, memory, routines, boarding and platform timing ok');
