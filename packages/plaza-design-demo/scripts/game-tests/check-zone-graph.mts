/**
 * Zones joined by seams (world/zone-graph.ts, engine/level.ts `mergeLevels`): the graph validates and places zones
 * from the active one (a floating origin); joined zones' floors walk as one level: a street continues over a walk seam,
 * a stair that lands on the other zone's floor climbs into it, ids stay apart, and a zone's part of the view is its own.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {placeFrom, seamsOf, validateZoneGraph, worldProblems} from '../../src/ssg/game/world/zone-graph';
import {compileLevel, levelRejoin, levelArrive, levelBounds, levelFloor, levelStep, levelUp, levelView, levelZone, mergeLevels, seenByZone, splitLevelView, type Level, type LevelPlayer, type MoverModel} from '../../src/ssg/game/engine/level';
import type {Resolved} from '../../src/ssg/game/art/core/composition';

// the graph
const graph = validateZoneGraph({version: 1, seams: [
  {id: 'lab-annex', kind: 'walk', a: {zone: 'lab'}, b: {zone: 'annex'}, dx: 400, dh: 0},
  {id: 'annex-loft', kind: 'stairs', a: {zone: 'annex', piece: 'up'}, b: {zone: 'loft', piece: 'landing'}, dx: 0, dh: 80},
]});
assert.throws(() => validateZoneGraph({version: 1, seams: [{id: 'x', kind: 'walk', a: {zone: 'a'}, b: {zone: 'a'}, dx: 0, dh: 0}]}), /two different zones/);
assert.throws(() => validateZoneGraph({version: 1, seams: [{id: 'x', kind: 'fly', a: {zone: 'a'}, b: {zone: 'b'}, dx: 0, dh: 0}]}), /kind/);
assert.deepEqual(seamsOf(graph, 'annex').map(s => [s.other, s.dx, s.dh]), [['lab', -400, 0], ['loft', 0, 80]], 'each seam is seen from the zone asking');
assert.deepEqual([...placeFrom(graph, 'annex')].map(([z, p]) => [z, p.dx, p.dh]), [['annex', 0, 0], ['lab', -400, 0], ['loft', 0, 80]], 'the active zone is the origin');
assert.equal(placeFrom(graph, 'lab').has('loft'), false, 'one seam away by default');
assert.deepEqual(placeFrom(graph, 'lab', 2).get('loft'), {dx: 400, dh: 80, hops: 2});
const zones = {lab: {width: 400}, annex: {width: 300}, loft: {width: 200}};
assert.deepEqual(worldProblems(graph, zones, {annex: ['up'], loft: ['landing']}), []);
assert.match(worldProblems(graph, {lab: {width: 420}, annex: {width: 300}, loft: {width: 200}}).join(), /walk seam/, 'a walk seam must meet the edge');
assert.match(worldProblems(graph, {lab: {width: 400}, annex: {width: 300}}).join(), /unknown zone loft/);
assert.match(worldProblems(graph, zones, {annex: [], loft: ['landing']}).join(), /no level piece up/);
const loop = validateZoneGraph({version: 1, seams: [...graph.seams, {id: 'lab-loft', kind: 'walk', a: {zone: 'lab'}, b: {zone: 'loft'}, dx: 400, dh: 0}]});
assert.match(worldProblems(loop, zones).join(), /two places/, 'a loop whose seams disagree is reported');
// the real document is valid against the real scenes
validateZoneGraph(JSON.parse(fs.readFileSync('src/ssg/game/world/zone-graph.json', 'utf8')));

// joined levels
const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>) =>
  ({element: {type}, instance: {id}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
const lab = compileLevel([row('level.floor', 'street', 0, 0, {width: 400})])!;
const annex = compileLevel([row('level.floor', 'street', 0, 0, {width: 300}), row('level.stairs', 'up', 200, 0, {run: 60, rise: 80})])!;
const loft = compileLevel([row('level.floor', 'landing', 240, 0, {width: 60})])!;
const still: MoverModel = {now: () => 0, movers: {stopPositions: () => undefined, position: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}, moveTo() {}};
const parts = [...placeFrom(graph, 'lab', 2)].map(([zone, at]) => ({zone, source: {lab, annex, loft}[zone]!, dx: at.dx, dh: at.dh, width: zones[zone as keyof typeof zones].width}));
const merged = mergeLevels(parts);
assert.deepEqual(merged.floors.map(f => [f.id, f.x, f.h, f.zone]), [['lab/street', 0, 0, 'lab'], ['annex/street', 400, 0, 'annex'], ['loft/landing', 640, 80, 'loft']], 'each zone is moved to where it lies, ids apart');
assert.deepEqual(merged.zones, {lab: {x: 0, w: 400, h: 0}, annex: {x: 400, w: 300, h: 0}, loft: {x: 400, w: 200, h: 80}});
const p: LevelPlayer = {x: 300, y: 0, vy: 0, face: 1, onGround: true, moving: false};
const L: Level = {source: merged, state: levelArrive(merged, p, 0)};
assert.equal(levelZone(L), 'lab');
assert.deepEqual(levelBounds(L, 400), [12, 688], 'the street walks on over the seam to the annex end');
p.x = 450; levelStep(L, p, 1, 1, still);
assert.equal(levelZone(L), 'annex', 'past the seam the player is in the annex');
p.x = 600; assert.ok(levelUp(L, p), 'the annex stair is usable');
for (let i = 0; i < 300 && L.state.ride; i++) levelStep(L, p, 1, 1, still);
assert.equal(levelFloor(L).id, 'loft/landing', 'and climbs onto the loft, a zone above');
assert.equal(levelZone(L), 'loft');
const view = levelView(L, still);
assert.deepEqual(Object.keys(splitLevelView(view, 'annex').reveal), [], 'a zone without buildings has no reveal');
assert.deepEqual(seenByZone(['annex/r1', 'lab/r2', 'annex/r3']), {annex: ['r1', 'r3'], lab: ['r2']});
// one scene stays exactly as it was: no zones, no namespacing
assert.equal(annex.zones, undefined); assert.equal(annex.floors[0].id, 'street');
// over a seam the level is built again and may take in a zone it did not hold: its buildings and rooms join the state
{
  const shop = compileLevel([row('level.floor', 'street', 0, 0, {width: 300}), row('level.floor', 'in', 100, 0, {width: 100, building: 'shop'}), row('level.interior', 'shop-in', 100, 0, {building: 'shop'}),
    ({element: {type: 'level.room'}, instance: {id: 'back', attach: {instance: 'shop-in'}}, placement: {x: 100, h: 0, scale: 1, facing: 1}, props: {width: 100, height: 60, reveal: 'arrival', keep: 'remember'}}) as unknown as Resolved])!;
  const first = mergeLevels([{zone: 'lab', source: lab, dx: 0, dh: 0, width: 400}]);
  const q: LevelPlayer = {x: 50, y: 0, vy: 0, face: 1, onGround: true, moving: false};
  const before: Level = {source: first, state: levelArrive(first, q, 0)};
  const wider = mergeLevels([{zone: 'lab', source: lab, dx: 0, dh: 0, width: 400}, {zone: 'shop', source: shop, dx: 400, dh: 0, width: 300}]);
  const after = levelRejoin(before, wider, ['shop/back']);
  assert.equal(after.state.reveal['shop/shop'], 0, 'the new zone\'s building joins, shut');
  assert.deepEqual([after.state.rooms!['shop/back'], after.state.seen], [1, ['shop/back']], 'and its remembered room joins, open');
}
console.log('Zone graph PASS: seams validate and place zones from the active one; joined levels walk over a seam and climb into a zone above; one scene is unchanged.');
