/** Levels (engine/level.ts): the Tower lab's floors, door, stairs, escalator and lift move the player between floors, and buildings open while inside. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {LevelRuntime, levelOpacity, restingLevelView} from '../../src/ssg/game/engine/level';

const tower = (SCENES as Record<string, import('../../src/ssg/game/scenes/kit').SceneDef>).tower;
assert.ok(tower?.level, 'the Tower lab compiles a level');
const level = tower.level!, L = new LevelRuntime(level), p = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
assert.deepEqual(level.lifts[0].stops.map(s => s.label), ['Metro', 'B1 · Service', 'Lobby', '2 · Offices', '3 · Offices', 'Roof'], 'the lift stops at every floor its shaft crosses, the building floor winning over the street');
L.arrive(p, tower.spawnH ?? 0);
assert.equal(L.floor.id, 'floor-street', 'the spawn is on the street');

const walkTo = (x: number) => { for (let i = 0; i < 4000 && Math.abs(p.x - x) > 1; i++) { const d = Math.sign(x - p.x); if (!L.update(1, p, d)) { const [a, b] = L.bounds(tower.width); p.x = Math.max(a, Math.min(b, p.x + d * 1.3)); } } };
const run = (frames: number) => { for (let i = 0; i < frames; i++) L.update(1, p, 0); };

walkTo(750);
assert.ok(L.hints(p).some(h => h.label.includes('ENTER')), 'the tower door offers a way in');
assert.ok(L.up(p) && L.floor.id === 'floor-lobby', '↑ at the door steps into the lobby');
run(120);
assert.ok(L.view().reveal.tower > 0.95, 'the tower opens while inside');
const open = levelOpacity(level, L.view());
assert.ok(open['tower-shell'] < 0.2 && open['tower-interior'] === L.view().reveal.tower, 'the shell fades and the interior shows');
walkTo(974); assert.ok(p.x <= 974, 'the lobby has walls');
walkTo(940);
L.interact('lift:lift', p); run(600);
assert.ok(L.hints(p).some(h => h.label === '[E] STEP IN'), 'a called lift arrives with its doors open');
L.interact('lift:lift', p); assert.ok(L.riding, 'E steps into the car');
L.up(p); run(400); L.up(p); run(400);
assert.equal(L.floor.id, 'floor-3', 'two stops up');
assert.equal(p.y, 200, 'the car carries the player');
L.down(p); run(400); L.down(p); run(400); L.down(p); run(400);
L.interact('lift:lift', p);
assert.ok(!L.riding && L.floor.id === 'floor-b1', 'down to B1 and out');
walkTo(770);
assert.ok(L.down(p), '↓ at the escalator top rides it');
assert.ok(!L.up(p) || L.riding, 'an escalator going down cannot be taken up');
run(400);
assert.equal(L.floor.id, 'floor-metro', 'the escalator ends on the metro floor');
walkTo(1180); assert.ok(L.up(p)); run(400);
assert.equal(L.floor.id, 'floor-street', 'the stairs lead back up to the street');
run(200); assert.ok(L.view().reveal.tower < 0.05, 'outside, the tower closes again');

assert.deepEqual(restingLevelView(level, true).reveal, {tower: 1}, 'the editor can preview a building opened');
assert.equal(tower.exits.length, 0);
console.log('Levels PASS: Tower lab street, door, lift (6 stops), stairs, escalator and building reveal.');
