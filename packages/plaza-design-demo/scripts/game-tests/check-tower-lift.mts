/**
 * The Tower lift as the game plays it: the scene's model is the one place the car lives (its Circuit
 * mover); the player's level step reads it, and E picks its prompt with nearestPrompt from the same
 * kinds of targets the game lists (the scene's devices where they stand, the level's prompts).
 * Run: pnpm test:game tower-lift
 */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive, levelFloor, levelHints, levelInteract, levelRiding, levelStep, levelUp, nearestPrompt, type Level} from '../../src/ssg/game/engine/level';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const tower = (SCENES as Record<string, SceneDef>).tower;
assert.ok(tower.data && tower.level, 'the Tower lab has devices and a level');
const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
const lift = tower.level!.lifts[0];
assert.equal(lift.device, 'lift.car', 'the car is the Circuit mover lift.car');
const p = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
const L: Level = {source: tower.level!, state: levelArrive(tower.level!, p, tower.spawnH ?? 0)};
const frame = () => { m.player = {x: p.x, h: p.y, ...(levelRiding(L) ? {} : {building: levelFloor(L).building})}; m.tick(1000 / 60, true); levelStep(L, p, 0, 1, m); };
const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };

// what E would act on: every device where it stands (as the game lists them), then the level's prompts
const prompts = () => [
  ...tower.data!.devices.filter(d => d.layout?.spot).map(d => ({kind: 'device', id: d.id, x: d.layout!.spot!.x + d.layout!.spot!.w / 2, h: 0})),
  ...levelHints(L, p, m).map(t => ({kind: 'level', ...t})),
];
const press = () => { const t = nearestPrompt(prompts(), p); assert.ok(t, 'something to press E on'); if (t!.kind === 'level') levelInteract(L, t!.id, p, m); return t!; };

// the lobby sensor watches the tower's floors only: someone at the same spot outside the tower is not noticed
m.player = {x: 1000, h: 0, building: ''}; m.tick(20, true);
m.player = {x: 930, h: 0, building: ''}; m.tick(20, true);
m.tick(400, true);
assert.ok(!m.movers.moving('lift.car') && m.movers.at('lift.car') === 'metro', 'the sensor ignores a player outside the tower');
// from the street the tower's lift is not there for you
p.x = 300; frame(); assert.equal(levelFloor(L).id, 'floor-street'); assert.ok(!levelHints(L, p, m).some(h => h.id.startsWith('lift:')), 'no lift prompt from the street');
p.x = 750; frame(); assert.equal(levelFloor(L).id, 'floor-lobby', 'walking in from the street');
p.x = lift.x; frame();
assert.equal(nearestPrompt(prompts(), p)?.kind, 'level', 'at the lift, E reaches the lift, not the lift\'s device on the same spot');
assert.match(String((nearestPrompt(prompts(), p) as {label?: string}).label), /CALL LIFT|STEP IN|COMING/, 'the lift offers itself');

press(); frames(400);
assert.equal(m.movers.position('lift.car'), 0, 'called, the car comes down to the lobby');
frames(60);
assert.ok(levelHints(L, p, m).some(h => h.label === '[E] STEP IN'), 'its doors open');
press(); assert.ok(levelRiding(L), 'E steps in');
levelUp(L, p); frames(30); assert.equal(m.movers.at('lift.car'), 'lobby', 'choosing a floor on the panel does not move the car');
press(); frames(400);
assert.equal(m.movers.at('lift.car'), 'f2', 'E sends the car one stop up on the mover');
levelUp(L, p); press(); frames(400);
assert.equal(levelFloor(L).id, 'floor-3', 'and another');
assert.equal(p.y, 200, 'the car carries the player');
frames(60); press();
assert.ok(!levelRiding(L) && levelFloor(L).id === 'floor-3', 'E steps out on floor 3');
console.log('Tower lift PASS: the car is its mover; E calls the lift (not its device), the panel picks a floor, E sends the car, the player rides and steps out; the sensor ignores the street.');
