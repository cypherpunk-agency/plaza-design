/**
 * The walkable train's art agrees with its vehicle source (docs/design/SEAMLESS-WORLD.md §4, decided 5 and 20).
 * The proposal frame art/proposals/train-two-car.composition.json draws the 2-car consist from the consist kit
 * (art/transit/metro-kit.ts `vehicle.*`); art/proposals/train-two-car.vehicle.json is the `VehicleSource` it stands for.
 * Resolved from the real composition: the cars' places and lengths are the source's car offsets and widths, the gangway's
 * length is its gap, every `vehicle.door` sits on a source door (centre and width), every seat place on a source seat, the
 * frame's level (its floors in the vehicle's building, its ways in, its shell) is `consistLevel` placed at the berth, and at
 * that berth with the doors open the platform boards onto the deck at each door and nowhere else.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {art} from '../../src/ssg/game/art';
import {resolveComposition, type ChunkDocument} from '../../src/ssg/game/art/core/composition';
import {compileLevel, mergeLevels, type MoverModel} from '../../src/ssg/game/engine/level';
import {consistCarLayout} from '../../src/ssg/game/art/transit/metro-kit';
import {alightAt, boardAt, carOffsets, consistLength, consistLevel, routeAt, routeParamAt, validateVehicle, vehicleDoorsAt, vehicleFrame, vehicleSeatsAt} from '../../src/ssg/game/world/vehicles';

const dir = 'src/ssg/game/art/proposals/';
const doc = art.validate(JSON.parse(fs.readFileSync(dir + 'train-two-car.composition.json', 'utf8'))) as ChunkDocument;
const v = validateVehicle(JSON.parse(fs.readFileSync(dir + 'train-two-car.vehicle.json', 'utf8')));
const rows = resolveComposition(art, doc, {view: {t: 0} as never, state: {}, reduced: true});
const close = (a: number, b: number, msg: string, d = 0.5) => assert.ok(Math.abs(a - b) <= d, `${msg}: ${a} ≠ ${b}`);
const of = (type: string) => rows.filter(r => r.element.type === type).sort((a, b) => a.placement.x - b.placement.x);

// the berth: where the vehicle's anchor (its left end, floor level) stands at the platform
assert.equal(v.berths.length, 1, 'one berth: this platform');
const berth = v.berths[0], s = routeParamAt(v.route, berth.zone, {x: berth.x, h: berth.h ?? 0});
assert.ok(s !== undefined, 'the berth lies on the route');
const pose = routeAt(v.route, s!), X = berth.x, H = berth.h ?? 0;
close(pose.x, X, 'the route stands the train at its berth', 1); close(pose.h, H, 'the berth\'s height', 1);

// cars and gangways: the kit's cars at the source's car offsets, as long as its widths; the gangways' length is the gap
const cars = of('vehicle.car'), offsets = carOffsets(v);
assert.equal(cars.length, v.cars.length, 'one vehicle.car per source car');
for (const [i, c] of cars.entries()) {
  close(c.placement.x, X + offsets[i], `${c.instance.id} stands at car ${v.cars[i].id}'s offset`); close(c.placement.h, H, `${c.instance.id} floor height`);
  assert.equal(c.placement.scale, 1, 'the consist is drawn at the player\'s scale');
  close(Number(c.props.length), v.cars[i].width, `${c.instance.id} length is the car's width`);
}
const gangways = of('vehicle.gangway');
assert.equal(gangways.filter(g => g.props.face === 'far').length, v.cars.length - 1, 'a walk-through gangway between each pair of cars');
for (const g of gangways) close(Number(g.props.length), v.gap ?? 0, `${g.instance.id} is the consist's gap`);
assert.notEqual(v.gangways, false, 'the gangways join the cars into one walk');

// each car's shell has the car's layout, so its door openings are where the doors are
const shells = of('vehicle.car-shell');
assert.equal(shells.length, cars.length, 'a shell per car');
for (const [i, sh] of shells.entries()) {
  close(sh.placement.x, cars[i].placement.x, `${sh.instance.id} covers ${cars[i].instance.id}`);
  for (const k of ['length', 'ceiling', 'roof', 'doors', 'doorWidth', 'doorHeight', 'cab']) assert.equal(sh.props[k], cars[i].props[k], `${sh.instance.id}.${k} agrees with its car`);
}

// doors: on the source's doors (centre and width), the car's own door anchors, and a way into the building at each
const doors = of('vehicle.door'), source = v.cars.flatMap((c, i) => c.doors.map(d => ({id: c.id + '.' + d.id, x: X + offsets[i] + d.x, w: d.w, layout: consistCarLayout(cars[i].props).doors})));
assert.equal(doors.length, source.length, 'one vehicle.door per source door');
for (const [i, d] of doors.entries()) {
  close(d.placement.x, source[i].x, `${d.instance.id} sits on door ${source[i].id}`); close(Number(d.props.width), source[i].w, `${d.instance.id} width`);
  assert.ok(source[i].layout.some(c => Math.abs(X + offsets[v.cars.findIndex(o => source[i].id.startsWith(o.id + '.'))] + c - d.placement.x) < 0.5), `${d.instance.id} is on its car's layout`);
}
const level = compileLevel(rows)!;
assert.ok(level, 'the frame has a level');
const ways = level.doors.filter(d => d.building === v.id).sort((a, b) => a.x - b.x);
assert.deepEqual(ways.map(d => [Math.round(d.x), d.w]), source.map(d => [Math.round(d.x), d.w]), 'a level.door of the vehicle\'s building at every vehicle door');

// seats: every place on the benches is a source seat
const places = of('vehicle.seat').flatMap(r => Object.entries(r.element.anchors(r.props, r.state)).filter(([k]) => /^seat\d+$/.test(k)).map(([, a]) => ({x: r.placement.x + a.x, h: r.placement.h + a.h})))
  .sort((a, b) => a.x - b.x);
const seatsAt = v.cars.flatMap((c, i) => c.seats.map(st => ({x: X + offsets[i] + st.x, h: H + (st.h ?? 0)}))).sort((a, b) => a.x - b.x);
assert.equal(places.length, seatsAt.length, 'one source seat per bench place');
for (const [i, p] of places.entries()) { close(p.x, seatsAt[i].x, `seat place ${i}`); close(p.h, seatsAt[i].h, `seat place ${i} height`); }

// the frame's deck and shell are consistLevel placed at the berth
const interior = consistLevel(v);
const deck = level.floors.filter(f => f.building === v.id).map(f => [f.x, f.w, f.h, f.entry]);
assert.deepEqual(deck, interior.floors.map(f => [f.x + X, f.w, f.h + H, f.entry]), 'the frame\'s floors in the vehicle are its consist level (one fused deck across the gangway)');
close(interior.floors[0].w, consistLength(v), 'the deck runs the whole consist');
assert.deepEqual(level.shells[v.id], interior.shells[v.id], 'the shell handle is the source\'s shell');
assert.equal(level.ghost?.[v.id], interior.ghost?.[v.id], 'the shell keeps the source\'s ghost');
const platform = level.floors.find(f => !f.building)!;
assert.ok(platform && Math.abs(platform.h - H) < 0.5, 'the platform is at the deck\'s height (step-free boarding)');

// boarding at the berth with the doors open: the platform boards onto the deck at each door, nowhere else; shut, nowhere
const model = (doorsOpen: number): MoverModel => ({now: () => 0, moveTo: () => undefined,
  movers: {position: k => k === v.mover ? s : 'mover' in v.doors && k === v.doors.mover ? doorsOpen : undefined, stopPositions: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}} as MoverModel);
const zone = berth.zone, stationOnly = {...level, floors: level.floors.filter(f => f.building !== v.id), doors: level.doors.filter(d => d.building !== v.id), shells: {}};
const frame = vehicleFrame(v, model(1), new Map([[zone, {dx: 0, dh: 0}]]), interior)!;
assert.ok(frame && frame.berth?.id === berth.id, 'the train stands at its berth');
const merged = mergeLevels([{zone, source: stationOnly, dx: 0, dh: 0, width: 1440}, frame.part]);
const here = merged.floors.find(f => f.zone === zone && !f.building)!;
for (const d of vehicleDoorsAt(frame)) {
  const on = boardAt(merged, frame, here.id, d.x);
  assert.ok(on && merged.floors.find(f => f.id === on)?.zone === v.id, `boards at ${d.id}`);
  assert.equal(alightAt(merged, frame, on!, d.x), here.id, `alights at ${d.id} onto the platform`);
}
for (const gx of [X + offsets[1] - (v.gap ?? 0) / 2, X + 140]) assert.equal(boardAt(merged, frame, here.id, gx), undefined, `no way aboard between doors (x ${gx})`);
const shut = vehicleFrame(v, model(0), new Map([[zone, {dx: 0, dh: 0}]]), interior)!;
assert.equal(boardAt(merged, shut, here.id, vehicleDoorsAt(shut)[0].x), undefined, 'shut doors let no one aboard');
assert.equal(vehicleSeatsAt(frame).length, places.length, 'the seats a people flow would sit on');

// the door's drawing follows its declared state; a level hands the consist's pieces nothing they do not declare
for (const t of ['vehicle.car', 'vehicle.car-shell', 'vehicle.door', 'vehicle.gangway', 'vehicle.seat']) assert.ok(art.get(t).visualFields, `${t} declares its visual fields`);
assert.deepEqual(art.visualProperties('vehicle.door', {open: 0}), {open: 0});
assert.throws(() => art.visualProperties('vehicle.door', {open: 2}), /invalid/);
console.log(`Train consist art PASS: ${cars.length} cars, ${gangways.length} gangway pieces, ${doors.length} doors and ${places.length} seats agree with ${v.id}'s source; the deck is its consist level and boards at every door.`);
