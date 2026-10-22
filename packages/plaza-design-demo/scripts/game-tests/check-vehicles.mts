/**
 * Vehicles (world/vehicles.ts, docs/design/SEAMLESS-WORLD.md §4): a pure model over the scene's movers. A shuttle on a
 * two-zone route is placed by its frame mover's position (by time, across a seam), its doors are read from its doors
 * mover, its consist joins the zones' level through `mergeLevels`, and the player boards at a berth, is carried and
 * alights in the next zone. A cart runs a curved `via` leg and a drop. A Tower lab lift expressed as a vehicle reads
 * the same car height, doors and boarding moments as the level's own lift rules.
 */
import assert from 'node:assert/strict';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {compileLevel, levelArrive, levelBounds, levelFloor, levelHints, levelInteract, levelStep, levelView, mergeLevels, type Level, type LevelPart, type LevelPlayer} from '../../src/ssg/game/engine/level';
import type {Resolved} from '../../src/ssg/game/art/core/composition';
import type {SceneData} from '../../src/ssg/game/data/types';
import {placeFrom, validateZoneGraph} from '../../src/ssg/game/world/zone-graph';
import {alightAt, boardAt, carry, consistLevel, liftVehicle, routeAt, routeLength, routeParamAt, routeProblems, validateVehicle, vehicleBerth, vehicleDoors, vehicleDoorsAt, vehicleFrame, vehiclePose, vehicleSeatsAt, type VehicleSource} from '../../src/ssg/game/world/vehicles';
import {SCENES} from '../../src/ssg/game/scenes/index';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const close = (a: number, b: number, msg: string, d = 0.01) => assert.ok(Math.abs(a - b) <= d, `${msg}: ${a} ≠ ${b}`);

// ---------- a shuttle between two zones joined by a walk seam ----------
const graph = validateZoneGraph({version: 1, seams: [{id: 'a-b', kind: 'walk', a: {zone: 'a'}, b: {zone: 'b'}, dx: 400, dh: 0}]});
const zones = {a: {width: 400}, b: {width: 400}};
const shuttle: VehicleSource = validateVehicle({
  id: 'shuttle', kind: 'shuttle', mover: 'shuttle.car', doors: {mover: 'shuttle.doors', open: 0.6}, gap: 8,
  cars: [
    {id: 'c1', width: 100, doors: [{id: 'd', x: 50, w: 24}], seats: [{id: 's1', x: 20}, {id: 's2', x: 80}]},
    {id: 'c2', width: 100, doors: [{id: 'd', x: 50, w: 24}], seats: [{id: 's1', x: 20}]},
  ],
  route: {legs: [{zone: 'a', from: {x: 0, h: 0}, to: {x: 400, h: 0}}, {zone: 'b', from: {x: 0, h: 0}, to: {x: 400, h: 0}}]},
  berths: [{id: 'a', zone: 'a', x: 60, h: 0}, {id: 'b', zone: 'b', x: 220, h: 0}],
});
assert.deepEqual(routeProblems(shuttle, graph, zones), [], 'the route crosses the seam where the zones meet');
assert.match(routeProblems({...shuttle, route: {legs: [shuttle.route.legs[0], {...shuttle.route.legs[1], from: {x: 20, h: 0}}]}}, graph, zones).join(), /ends at/, 'legs that do not meet over the seam are reported');
assert.match(routeProblems({...shuttle, route: {legs: [{...shuttle.route.legs[0], zone: 'z'}]}}, graph, zones).join(), /unknown zone z/);
assert.match(routeProblems({...shuttle, berths: [{id: 'x', zone: 'a', x: 60, h: 40}]}, graph, zones).join(), /berth x/);
assert.throws(() => validateVehicle({...shuttle, kind: 'zeppelin'}), /kind/);
assert.throws(() => validateVehicle({...shuttle, route: {legs: [{zone: 'a', from: {x: 0, h: 0}, to: {x: 1, h: 0}, via: {x: 0, h: 1}, drop: true}]}}), /not both/);
assert.equal(routeParamAt(shuttle.route, 'b', {x: 220, h: 0}), 620, 'a berth is a mover stop on the route');

const data = {
  id: 'lab', name: 'Vehicle lab', state: {}, tuning: {}, cables: [], dialogue: {}, goals: [], texts: {},
  devices: [{id: 'shuttle', name: 'SHUTTLE', look: '', status: '', nouns: [
    {id: 'car', layer: 'hardware', function: 'act', mover: {axis: 'x', speed: 100, ease: 'linear', stops: {a: 60, b: 620}}},
    {id: 'doors', layer: 'hardware', function: 'act', mover: {ms: 300, ease: 'linear', start: 'open', stops: {shut: 0, open: 1}}},
  ]}],
} as unknown as SceneData;
const m = new SceneModel({say() {}, changed() {}, open() {}} as never, data, undefined);
const tick = (ms: number) => { for (let left = ms; left > 0; left -= 1000 / 60) m.tick(Math.min(left, 1000 / 60), true); };

// position by time, and crossing the seam
assert.deepEqual(vehiclePose(shuttle, m), {s: 60, zone: 'a', leg: 0, u: 60 / 400, x: 60, h: 0, facing: 1, tilt: 0});
assert.equal(vehicleBerth(shuttle, vehiclePose(shuttle, m)!)?.id, 'a', 'it stands at berth a');
assert.equal(vehicleDoors(shuttle, m), 1, 'doors open (the doors mover starts open)');

// the zones' level: a platform floor in each, joined over the seam; the active zone is a
const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>) => ({element: {type}, instance: {id}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
const levels = {a: compileLevel([row('level.floor', 'platform', 0, 0, {width: 400})])!, b: compileLevel([row('level.floor', 'platform', 0, 0, {width: 400})])!};
const placed = placeFrom(graph, 'a', 1), interior = consistLevel(shuttle);
assert.deepEqual(interior.floors.map(f => [f.id, f.x, f.w, f.building, f.entry]), [['c1.deck', 0, 208, 'shuttle', 'door']], 'the gangway joins the two cars into one walk');
const zoneParts: LevelPart[] = [...placed].map(([zone, at]) => ({zone, source: levels[zone as 'a' | 'b'], dx: at.dx, dh: at.dh, width: zones[zone as 'a' | 'b'].width}));
const frameNow = () => vehicleFrame(shuttle, m, placed, interior)!;
const levelNow = (f = frameNow()) => mergeLevels([...zoneParts, f.part]);

const p: LevelPlayer = {x: 110, y: 0, vy: 0, face: 1, onGround: true, moving: false};
let f0 = frameNow(), merged = levelNow(f0);
const L: Level = {source: merged, state: levelArrive(merged, p, 0)};
assert.equal(levelFloor(L).id, 'a/platform', 'the player waits on the platform');
assert.deepEqual(vehicleDoorsAt(f0).map(d => [d.id, d.x, d.open]), [['c1.d', 110, true], ['c2.d', 218, true]], 'the doors in the zone\'s units, open at the berth');
assert.deepEqual(vehicleSeatsAt(f0).map(s => s.x), [80, 140, 188]);
assert.equal(boardAt(L.source, f0, 'a/platform', 160), undefined, 'not between doors');
const aboard = boardAt(L.source, f0, 'a/platform', 110);
assert.equal(aboard, 'shuttle/c1.deck', 'at an open door at the berth the player steps onto the car floor');
L.state.floor = aboard!;
assert.deepEqual(levelBounds(L, 400), [72, 256], 'inside, the walls are the consist\'s ends (both cars, over the gangway)');
levelStep(L, p, 1, 1, m); assert.equal(levelFloor(L).id, 'shuttle/c1.deck', 'the car floor is entered only at a door: walking does not leak out');

// doors shut, it leaves: the doors mover first, then the frame mover
m.moveTo('shuttle', 'doors', 'shut'); tick(150);
close(vehicleDoors(shuttle, m), 0.5, 'half shut halfway through the doors\' time');
assert.equal(alightAt(L.source, frameNow(), 'shuttle/c1.deck', 110), undefined, 'doors below the threshold: no way out');
tick(200); m.moveTo('shuttle', 'car', 'b');
const t0 = m.now();
f0 = frameNow();
for (let i = 0; i < 200; i++) {
  m.tick(1000 / 60, true);
  const f1 = frameNow(); carry(f0, f1, p); f0 = f1; L.source = levelNow(f1);
  const expect = 60 + (m.now() - t0) / 10;
  if (expect >= 620) break;
  close(f1.pose.s, expect, 'the route parameter is the mover\'s position by time', 0.05);
  close(p.x - f1.part.dx, 50, 'the player is held in the vehicle\'s frame (no drift)', 1e-6);
  assert.equal(boardAt(L.source, f1, 'a/platform', f1.part.dx + 50), undefined, 'no boarding while it runs');
}
// across the seam: zone a's end is zone b's start, and the world place is continuous
const at = (s: number) => { const q = routeAt(shuttle.route, s); return {zone: q.zone, world: placed.get(q.zone)!.dx + q.x}; };
assert.deepEqual([at(399.9).zone, at(400).zone], ['a', 'b']);
close(at(400).world - at(399.9).world, 0.1, 'no jump at the seam');
assert.equal(routeLength(shuttle.route), 800);
tick(6000);
const fb = frameNow(); carry(f0, fb, p); L.source = levelNow(fb);
assert.deepEqual([fb.pose.zone, Math.round(fb.pose.x * 1e6) / 1e6, fb.berth?.id], ['b', 220, 'b'], 'it stands at berth b, in zone b');
close(p.x, 400 + 220 + 50, 'and the player rode with it');
assert.equal(alightAt(L.source, fb, 'shuttle/c1.deck', p.x), undefined, 'doors still shut');
m.moveTo('shuttle', 'doors', 'open'); tick(400);
const out = alightAt(L.source, frameNow(), 'shuttle/c1.deck', p.x);
assert.equal(out, 'b/platform', 'doors open at the berth: the player steps out onto zone b\'s platform');
L.state.floor = out!;
assert.equal(levelFloor(L).zone, 'b');
// a berth whose platform does not reach the door: aligned in name only, nobody gets on or off
const shortB = {...levels, b: compileLevel([row('level.floor', 'platform', 0, 0, {width: 200})])!};
const shortLevel = mergeLevels([...[...placed].map(([zone, a]) => ({zone, source: shortB[zone as 'a' | 'b'], dx: a.dx, dh: a.dh, width: 400})), frameNow().part]);
assert.equal(alightAt(shortLevel, frameNow(), 'shuttle/c1.deck', 400 + 220 + 50), undefined, 'no platform under the door: no way out');

// ---------- a cart on a curved via leg and a drop ----------
const cart: VehicleSource = validateVehicle({
  id: 'cart', kind: 'cart', mover: 'cart.frame', doors: {trip: 200, open: 0.9},
  cars: [{id: 'body', width: 40, doors: [], seats: [], shellOnly: true}],
  route: {legs: [
    {zone: 'b', from: {x: 0, h: 100}, via: {x: 100, h: 100}, to: {x: 100, h: 0}, tilt: true},
    {zone: 'b', from: {x: 100, h: 0}, to: {x: 200, h: -80}, drop: true},
  ]},
  berths: [],
});
assert.deepEqual(routeProblems(cart, graph, zones), []);
assert.equal(consistLevel(cart).floors.length, 0, 'a shell-only car has no floors');
const curveLen = routeLength({legs: [cart.route.legs[0]]});
assert.ok(curveLen > 141.5 && curveLen < 200, 'the curve is longer than its chord and shorter than its control polygon (' + curveLen.toFixed(1) + ')');
const mid = routeAt(cart.route, curveLen / 2);
close(mid.x, 75, 'halfway along the arc of a symmetric curve, x', 0.5); close(mid.h, 75, 'and h', 0.5);
close(mid.tilt, -Math.PI / 4, 'it leans down the curve', 0.02);
const steps = Array.from({length: 11}, (_, i) => routeAt(cart.route, curveLen * i / 10));
for (let i = 1; i < steps.length; i++) close(Math.hypot(steps[i].x - steps[i - 1].x, steps[i].h - steps[i - 1].h), curveLen / 10, 'even steps along the arc', 0.3);
const drop = (k: number) => routeAt(cart.route, curveLen + routeLength({legs: [cart.route.legs[1]]}) * k);
close(drop(0.5).x, 150, 'a drop shares x out evenly'); close(drop(0.5).h, -20, 'and falls a quarter of the way by half time');
close(drop(1).h, -80, 'to its bottom');
assert.ok(drop(0.9).h - drop(1).h > drop(0.1).h - drop(0.2).h, 'faster and faster');

// ---------- a Tower lab lift as a vehicle ----------
const tower = (SCENES as Record<string, SceneDef>).tower;
const level = tower.level!, lift = level.lifts[0];
const cabin = liftVehicle(lift, 'tower')!;
assert.ok(cabin && cabin.kind === 'lift' && cabin.mover === lift.device);
assert.deepEqual(routeProblems(cabin, validateZoneGraph({version: 1, seams: []}), {tower: {}}), [], 'its berths are its stops, on its shaft');
const tm = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
const tp: LevelPlayer = {x: lift.x, y: -190, vy: 0, face: 1, onGround: true, moving: false};
const TL: Level = {source: level, state: levelArrive(level, tp, -190)};
const one = new Map([['tower', {dx: 0, dh: 0}]]);
const seen = {board: 0, not: 0, moving: 0};
const same = (when: string) => {
  const fr = vehicleFrame(cabin, tm, one)!, lv = levelView(TL, tm).lifts[lift.id];
  close(fr.pose.h, lv.car + lift.bottom, when + ': the cabin is where the level puts the car', 1e-9);
  close(fr.doors, lv.doors, when + ': and its doors are the car\'s', 1e-9);
  const ml = mergeLevels([{zone: 'tower', source: level, dx: 0, dh: 0, width: tower.width}, fr.part]);
  const step = levelHints(TL, tp, tm).some(h => h.label.includes('STEP IN'));
  seen[step ? 'board' : 'not']++; if (fr.doors > 0 && fr.doors < 1) seen.moving++;
  assert.equal(boardAt(ml, fr, 'tower/' + TL.state.floor, tp.x) !== undefined, step, when + ': boarding the vehicle is possible exactly when the level offers STEP IN');
};
assert.equal(levelFloor(TL).id, 'floor-metro');
same('at rest at the metro');
assert.equal(vehicleBerth(cabin, vehiclePose(cabin, tm)!)?.floor, 'floor-metro');
// call it away and back: compare every frame of both trips
tm.moveTo('lift', 'car', 'f3');
for (let i = 0; i < 900; i++) { tm.tick(1000 / 60, true); if (i % 7 === 0) same('frame ' + i + ' of the trip up'); }
levelInteract(TL, 'lift:' + lift.id, tp, tm);
for (let i = 0; i < 900; i++) { tm.tick(1000 / 60, true); if (i % 7 === 0) same('frame ' + i + ' of the call back'); }
same('back at the metro, doors open');
assert.ok(seen.board > 1 && seen.not > 50 && seen.moving > 0, 'the comparison covered boarding, travelling and doors in between (' + JSON.stringify(seen) + ')');
assert.equal(vehicleBerth(cabin, vehiclePose(cabin, tm)!)?.id, 'floor-metro');
// a lift inside the tower is used only from the tower's floors
const streetLevel = mergeLevels([{zone: 'tower', source: {...level, floors: level.floors.map(f => f.id === 'floor-metro' ? {...f, building: ''} : f)}, dx: 0, dh: 0, width: tower.width}, vehicleFrame(cabin, tm, one)!.part]);
assert.equal(boardAt(streetLevel, vehicleFrame(cabin, tm, one)!, 'tower/floor-metro', lift.x), undefined, 'not from a floor outside its building');

console.log('Vehicles PASS: a shuttle placed by its mover crosses a seam, opens its doors at a berth, takes the player aboard through mergeLevels and lets them off in the next zone; a curved via leg runs evenly and a drop accelerates; a level lift as a vehicle matches the lift rules frame by frame.');
