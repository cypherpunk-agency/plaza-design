/**
 * Rooms (engine/level.ts `LevelRoom`, art/levels/elements.ts `level.room`): a building's rooms open one by one.
 * A room opens when the player gets there; one that remembers stays open (and is handed back from the save
 * on the next arrival), one that closes shuts behind them; a room that never opens stays shut; what is
 * attached to a room fades with it; the editor shows every room open, or a chosen floor as the player sees it.
 */
import assert from 'node:assert/strict';
import {compileLevel, levelArrive, levelFloor, levelOpacity, levelSeen, levelStep, levelUp, levelView, restingLevelView, type Level, type LevelPlayer, type MoverModel} from '../../src/ssg/game/engine/level';
import {roomElement} from '../../src/ssg/game/art/levels/interior';
import type {Resolved} from '../../src/ssg/game/art/core/composition';

const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>, attach?: string) =>
  ({element: {type}, instance: {id, ...(attach ? {attach: {instance: attach}} : {})}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
const rows = [
  row('level.floor', 'street', 0, 0, {width: 400}),
  row('level.floor', 'ground', 100, 0, {width: 100, building: 'blk'}),
  row('level.floor', 'upper', 100, 60, {width: 100, building: 'blk'}),
  row('level.interior', 'blk-in', 100, 0, {building: 'blk'}),
  row('level.stairs', 'stair', 120, 0, {run: 40, rise: 60}, 'blk-in'),
  row('level.room', 'room-ground', 100, 0, {building: 'blk', width: 100, height: 60, reveal: 'arrival', keep: 'remember'}, 'blk-in'),
  row('level.room', 'room-upper', 100, 60, {building: 'blk', width: 60, height: 60, reveal: 'arrival', keep: 'close'}, 'blk-in'),
  row('level.room', 'room-store', 160, 60, {building: 'blk', width: 40, height: 60, reveal: 'never'}, 'blk-in'),
  row('level.room', 'room-plain', 0, 200, {width: 40, height: 60}, 'blk-in'),
  row('art.lamp', 'lamp', 130, 90, {}, 'room-upper'),
  ({element: {type: 'character.resident', parts: ['people']}, instance: {id: 'tenant', attach: {instance: 'room-ground'}}, placement: {x: 150, h: 0, scale: 1, facing: 1}, props: {}}) as unknown as Resolved,
];
const src = compileLevel(rows)!;
assert.ok(!src.rooms!.some(r => r.id === 'room-plain'), 'a room that opens always (the default) just shows with its building');
assert.equal(src.rooms![0].building, 'blk', 'a room belongs to the building whose interior it is attached to');
assert.deepEqual(src.rooms!.map(r => [r.id, r.reveal, r.keep, r.children]), [['room-ground', 'arrival', 'remember', ['tenant']], ['room-upper', 'arrival', 'close', ['lamp']], ['room-store', 'never', 'remember', []]], 'rooms compile with what is attached to them');
const still: MoverModel = {now: () => 0, movers: {stopPositions: () => undefined, position: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}, moveTo() {}};
const p: LevelPlayer = {x: 40, y: 0, vy: 0, face: 1, onGround: true, moving: false};
const L: Level = {source: src, state: levelArrive(src, p, 0)};
const open = () => levelView(L, still).rooms!;
const step = (frames: number, walk = 0) => { for (let i = 0; i < frames; i++) levelStep(L, p, walk, 1, still); };

assert.deepEqual(open(), {'room-ground': 0, 'room-upper': 0, 'room-store': 0}, 'on the street, every room is shut');
p.x = 150; step(80);
assert.equal(levelFloor(L).id, 'ground');
assert.ok(open()['room-ground'] > 0.95 && open()['room-upper'] < 0.01, 'walking in opens the ground floor room only');
assert.deepEqual(levelSeen(L), ['room-ground'], 'and it is seen');
let o = levelOpacity(src, levelView(L, still));
assert.ok(o.lamp < 0.01, 'what is in a shut room stays hidden');

p.x = 120; assert.ok(levelUp(L, p)); step(45, 1);
assert.ok(open()['room-upper'] > 0.2, 'climbing into the upper room opens it on the way');
step(200, 1); step(80);
assert.equal(levelFloor(L).id, 'upper');
o = levelOpacity(src, levelView(L, still));
assert.ok(open()['room-upper'] > 0.95 && o.lamp > 0.95, 'upstairs: the room and its lamp show');
assert.ok(open()['room-ground'] > 0.95, 'the ground floor room stays open (it remembers)');
p.x = 180; step(80);
assert.ok(open()['room-store'] === 0 && open()['room-upper'] < 0.05, 'walking into the store room: it never opens, and the room behind closes (it does not remember)');
assert.deepEqual(levelSeen(L), ['room-ground'], 'only remembering rooms are kept');

// the save hands the seen rooms back: they are open at once on the next arrival
{
  const q: LevelPlayer = {x: 40, y: 0, vy: 0, face: 1, onGround: true, moving: false};
  const again: Level = {source: src, state: levelArrive(src, q, 0, ['room-ground', 'room-upper'])};
  assert.deepEqual(levelView(again, still).rooms, {'room-ground': 1, 'room-upper': 0, 'room-store': 0}, 'a remembered room is open on arrival; a closing one is not');
}
// the editor: every room open, or one floor as the player sees it
assert.deepEqual(restingLevelView(src, true).rooms, {'room-ground': 1, 'room-upper': 1, 'room-store': 1}, 'authoring shows every room');
assert.deepEqual(restingLevelView(src, false, 'upper').rooms, {'room-ground': 0, 'room-upper': 1, 'room-store': 0}, 'from the upper floor: the room there, not the store');
assert.equal(restingLevelView(src, false, 'upper').reveal.blk, 1, 'seen from a building floor, the building is open');
// a level without rooms is unchanged: no rooms in its source, view or state
assert.equal(compileLevel(rows.filter(r => r.element.type !== 'level.room' || !r.props.reveal))!.rooms, undefined);
// every closed look draws (and a fully open room draws nothing)
let drawn = 0;
const canvas = new Proxy({}, {get: (_, k) => k === 'globalAlpha' ? 1 : () => { drawn++; }, set: () => true}) as unknown as CanvasRenderingContext2D;
const view = {sx: (x: number) => x, y: (h: number) => -h} as never;
const room = {width: 120, height: 60, kind: 'office', lit: 1, seed: 1};
roomElement.draw(canvas, view, {...room, reveal: 'arrival', closed: 'section'}, {open: 1} as never);
const openCalls = drawn;
for (const closed of (roomElement.fields.closed as {options: string[]}).options) { drawn = 0; roomElement.draw(canvas, view, {...room, reveal: 'arrival', closed, doorLight: true}, {open: 0} as never); assert.ok(drawn > openCalls, closed + ': a shut room draws its cover over itself'); }
drawn = 0; roomElement.draw(canvas, view, room, {} as never);
assert.equal(drawn, openCalls, 'a room that opens always draws only its wall, as before');
console.log('Level rooms PASS: rooms open on arrival, remember or close, never-rooms stay shut, contents fade with their room, the save hands seen rooms back, editor previews all or one floor, every closed look draws.');
// a path of floors: rooms that remember stay open along it; a closing one only where the player stands
assert.deepEqual(restingLevelView(src, false, 'ground, upper').rooms, {'room-ground': 1, 'room-upper': 1, 'room-store': 0}, 'after the ground floor and upstairs, both are open');
assert.deepEqual(restingLevelView(src, false, 'upper, ground').rooms, {'room-ground': 1, 'room-upper': 0, 'room-store': 0}, 'back down, the upper room (it closes) is shut again');
// the level hands the room its openness as visual state: the room declares it (open by default)
assert.equal((roomElement.visualFields as Record<string, {default: number}>).open.default, 1);
console.log('Level room paths PASS: preview along a path of floors; the room declares its open state.');
// only the room the player is in is live: a remembered one shows how it looked, darkened, without its people
{
  const q: LevelPlayer = {x: 150, y: 0, vy: 0, face: 1, onGround: true, moving: false};
  const M: Level = {source: src, state: levelArrive(src, q, 0)};
  const go = (frames: number, walk = 0) => { for (let i = 0; i < frames; i++) levelStep(M, q, walk, 1, still); };
  go(80);
  let v = levelView(M, still), o = levelOpacity(src, v);
  assert.ok(v.here!['room-ground'] > 0.95 && o.tenant > 0.95, 'in the ground floor room: it is live, its tenant shows');
  q.x = 120; assert.ok(levelUp(M, q)); go(250, 1); go(80);
  v = levelView(M, still); o = levelOpacity(src, v);
  assert.equal(levelFloor(M).id, 'upper');
  assert.ok(v.rooms!['room-ground'] > 0.95 && v.here!['room-ground'] < 0.05, 'upstairs: the ground floor room stays open, remembered, not live');
  assert.ok(o.tenant < 0.05, 'its tenant is not shown while the player is away');
  assert.ok(v.here!['room-upper'] > 0.95 && o.lamp > 0.95, 'the room the player is in is live');
  const look = levelOpacity(src, {...v, here: {...v.here, 'room-upper': 0}});
  assert.ok(look.lamp > 0.6 && look.lamp < 0.8, 'a remembered room\'s things show faded');
}
// the preview uses the same rule as play: the player stands at one place on a floor (its middle, or floor@x)
{
  const wide = compileLevel([
    row('level.floor', 'hall', 0, 0, {width: 200, building: 'b'}), row('level.interior', 'b-in', 0, 0, {building: 'b'}),
    row('level.room', 'left', 0, 0, {width: 80, height: 60, reveal: 'arrival', keep: 'remember'}, 'b-in'),
    row('level.room', 'right', 120, 0, {width: 80, height: 60, reveal: 'arrival', keep: 'close'}, 'b-in'),
  ])!;
  assert.deepEqual(restingLevelView(wide, false, 'hall').rooms, {left: 0, right: 0}, 'the middle of a floor under two rooms is in neither');
  assert.deepEqual(restingLevelView(wide, false, 'hall@40').rooms, {left: 1, right: 0}, 'floor@x: the room at that place');
  const back = restingLevelView(wide, false, 'hall@40, hall@160');
  assert.deepEqual([back.rooms, back.here], [{left: 1, right: 1}, {left: 0, right: 1}], 'walked on: the left room is remembered (open, not live), the right one is live');
}
// the room draws its remembered look: a darkened wall while the player is away
drawn = 0; roomElement.draw(canvas, view, {...room, reveal: 'arrival', closed: 'dark'}, {open: 1, here: 1} as never);
const liveCalls = drawn;
drawn = 0; roomElement.draw(canvas, view, {...room, reveal: 'arrival', closed: 'dark'}, {open: 1, here: 0} as never);
assert.ok(drawn > liveCalls, 'a remembered room darkens its wall');
assert.equal((roomElement.visualFields as Record<string, {default: number}>).here.default, 1);
console.log('Level remembered rooms PASS: only the room the player is in is live; remembered rooms show darkened and faded without their people; the preview places the player as play does.');
