/**
 * The Tower lift as the game plays it: the scene's model drives the car through its Circuit mover
 * (moverDrives), and E picks its prompt with nearestPrompt from the same kinds of targets the game
 * lists (the scene's devices where they stand, the level's prompts). Run: pnpm test:game tower-lift
 */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {LevelRuntime, moverDrives, nearestPrompt} from '../../src/ssg/game/engine/level';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const tower = (SCENES as Record<string, SceneDef>).tower;
assert.ok(tower.data && tower.level, 'the Tower lab has devices and a level');
const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
let now = 0; m.now = () => now;
const lift = tower.level!.lifts[0], drives = moverDrives(tower.level!, m);
assert.ok(drives[lift.id], 'the lift is driven by its mover ' + lift.device);
const L = new LevelRuntime(tower.level!, drives);
const p = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
L.arrive(p, tower.spawnH ?? 0);
const frame = () => { now += 1000 / 60; m.player = {x: p.x, h: p.y}; m.tick(1, true); L.update(1, p, 0); };
const frames = (n: number) => { for (let i = 0; i < n; i++) frame(); };

// what E would act on: every device where it stands (as the game lists them), then the level's prompts
const prompts = () => [
  ...tower.data!.devices.filter(d => d.layout?.spot).map(d => ({kind: 'device', id: d.id, x: d.layout!.spot!.x + d.layout!.spot!.w / 2, h: 0})),
  ...L.hints(p).map(t => ({kind: 'level', ...t})),
];
const press = () => { const t = nearestPrompt(prompts(), p); assert.ok(t, 'something to press E on'); if (t!.kind === 'level') L.interact(t!.id, p); return t!; };

p.x = 750; assert.ok(L.up(p) && L.floor.id === 'floor-lobby', 'into the lobby');
p.x = lift.x; frame();
assert.equal(nearestPrompt(prompts(), p)?.kind, 'level', 'at the lift, E reaches the lift, not the lift\'s device on the same spot');
assert.match(String((nearestPrompt(prompts(), p) as {label?: string}).label), /CALL LIFT|STEP IN|COMING/, 'the lift offers itself');

press(); frames(400);
assert.equal(m.movers.position('lift.car'), 0, 'called, the car comes down to the lobby');
frames(60);
assert.ok(L.hints(p).some(h => h.label === '[E] STEP IN'), 'its doors open');
press(); assert.ok(L.riding, 'E steps in');
L.up(p); frames(400);
assert.equal(m.movers.at('lift.car'), 'f2', '↑ rides one stop up on the mover');
L.up(p); frames(400);
assert.equal(L.floor.id, 'floor-3', 'and another');
assert.equal(p.y, 200, 'the car carries the player');
frames(60); press();
assert.ok(!L.riding && L.floor.id === 'floor-3', 'E steps out on floor 3');
// a tuned piece: the elevator's own door speed (a kit field) replaces the default
const quick = new LevelRuntime({...tower.level!, lifts: [{...lift, device: undefined, doorSpeed: 0.5}]});
const q = {x: lift.x, y: 0, vy: 0, face: 1, onGround: true, moving: false};
quick.arrive(q, -190); quick.interact('lift:' + lift.id, q);
for (let i = 0; i < 4; i++) quick.update(1, q, 0);
assert.ok(quick.hints(q).some(h => h.label === '[E] STEP IN'), 'doors at 0.5 per frame open within a few frames');
console.log('Tower lift PASS: E calls the lift (not its device), the mover brings the car, the player rides up two stops and steps out.');
