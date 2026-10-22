/**
 * Levels (engine/level.ts) in the Tower lab, on the game's one runtime path: the scene's model ticks
 * (the lift car is its Circuit mover) and the player's level step runs in the same frame. You walk into
 * the building from the street and its facade fades with how far in you are; inside, the wall is gone;
 * flights and the lift work only where you can see them; stairs move only while you walk; an escalator
 * takes whoever steps on; in the lift car you choose a floor and E sends it there.
 */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {levelArrive, levelBounds, levelDown, levelFloor, levelHints, levelInteract, levelOpacity, levelRiding, levelStep, levelUp, levelView, restingLevelView, type Level, type LevelPlayer} from '../../src/ssg/game/engine/level';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const tower = (SCENES as Record<string, SceneDef>).tower;
assert.ok(tower?.level, 'the Tower lab compiles a level');
const level = tower.level!;
assert.deepEqual(level.lifts[0].stops.map(s => s.label), ['Metro', 'B1 · Service', 'Lobby', '2 · Offices', '3 · Offices', 'Roof'], 'the lift stops at every floor its shaft crosses, the building floor winning over the street');
assert.equal(level.lifts[0].buttons?.length, 6, 'a call button on every floor');
assert.ok(level.lifts[0].inside === 'tower' && level.links.find(l => l.id === 'stairs-basement')?.inside === 'tower', 'pieces drawn inside the tower belong to it');

/** One player in the Tower, stepped frame by frame the way runtime/game.ts does. */
function play(x: number, h = 0) {
  const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
  const p: LevelPlayer = {x, y: 0, vy: 0, face: 1, onGround: true, moving: false};
  const L: Level = {source: level, state: levelArrive(level, p, h)};
  const frame = (walk = 0) => {
    m.player = {x: p.x, h: p.y, ...(levelRiding(L) ? {} : {building: levelFloor(L).building})}; m.tick(1000 / 60, true);
    if (!levelStep(L, p, walk, 1, m) && walk) { const [a, b] = levelBounds(L, tower.width); p.x = Math.max(a, Math.min(b, p.x + walk * 1.3)); }
  };
  const run = (frames: number, walk = 0) => { for (let i = 0; i < frames; i++) frame(walk); };
  const walkTo = (to: number) => { for (let i = 0; i < 4000 && Math.abs(p.x - to) > 1; i++) frame(Math.sign(to - p.x)); };
  const hint = (word: string) => levelHints(L, p, m).some(t => t.label.includes(word));
  return {m, p, L, run, walkTo, hint};
}

const {m, p, L, run, walkTo, hint} = play(tower.spawn, tower.spawnH ?? 0);
assert.equal(levelFloor(L).id, 'floor-street', 'the spawn is on the street');
// walking in from the side: no key; the facade fades with the depth
walkTo(519); assert.equal(levelFloor(L).id, 'floor-street', 'still outside at the wall');
walkTo(530); assert.equal(levelFloor(L).id, 'floor-lobby', 'walking through the side wall steps into the lobby');
run(60); const shallow = levelView(L, m).reveal.tower;
assert.ok(shallow > 0.1 && shallow < 0.6, 'a few steps in, the facade is partly faded (' + shallow.toFixed(2) + ')');
walkTo(620); run(90);
assert.ok(levelView(L, m).reveal.tower > 0.95, 'further in, the tower is open');
const open = levelOpacity(level, levelView(L, m));
assert.ok(open['tower-shell'] < 0.05 && open['tower-interior'] > 0.95, 'inside, the wall is gone and the interior shows');

// the basement stairs: walk them; letting go stops mid-flight
walkTo(580); assert.ok(hint('DOWNSTAIRS'), 'inside, the basement stairs offer themselves');
assert.ok(levelDown(L, p) && levelRiding(L), '↓ steps onto the flight');
run(30); assert.equal(p.x, 580, 'standing on the flight without walking: no automatic ride');
run(40, 1); const mid = p.y; assert.ok(mid < 0 && mid > -90, 'walking down the flight (h ' + mid.toFixed(1) + ')');
run(30); assert.equal(p.y, mid, 'let go: you stop mid-flight');
run(15, -1); assert.ok(p.y > mid && levelRiding(L), 'walking back up');
for (let i = 0; i < 300 && levelRiding(L); i++) run(1, 1);
assert.ok(!levelRiding(L) && levelFloor(L).id === 'floor-b1', 'keep walking: down to B1');

// the escalator takes whoever steps onto its boarding end
walkTo(750); assert.ok(!levelRiding(L), 'beside the escalator, nothing happens');
walkTo(790); assert.ok(levelRiding(L), 'walking onto the escalator, it takes you');
run(400); assert.equal(levelFloor(L).id, 'floor-metro', 'and carries you down to the metro without a key');

// the lift: call it, step in, choose a floor on the panel, E sends the car (its mover)
walkTo(940); assert.ok(hint('STEP IN'), 'the car waits at its first stop, the metro, doors open');
assert.equal(levelView(L, m).buttons?.['lift-call-metro'], 0, 'the call button goes dark when the car is here');
levelInteract(L, 'lift:lift', p, m); assert.ok(levelRiding(L), 'E steps in');
levelUp(L, p); levelUp(L, p); levelUp(L, p); levelUp(L, p); run(60);
assert.equal(p.y, -190, 'choosing floors on the panel does not move the car');
assert.ok(hint('3 · OFFICES') && hint('[E] GO'), 'the panel shows the chosen floor');
levelInteract(L, 'lift:lift', p, m); run(2);
assert.equal(levelView(L, m).buttons?.['lift-call-f3'], 1, 'the button on the floor it is going to lights');
run(900);
assert.equal(p.y, 200, 'E sends the car to the chosen floor, carrying the player (riding past the lobby sensor does not call it back)');
assert.ok(hint('[E] OUT'));
levelInteract(L, 'lift:lift', p, m);
assert.ok(!levelRiding(L) && levelFloor(L).id === 'floor-3', 'E steps out on floor 3');
walkTo(990); assert.ok(p.x <= 974, 'upper floors keep their walls');

// out of the tower: walk out of the lobby's side, and it closes behind you
{
  const {m, L, run, walkTo} = play(700);
  run(1); assert.equal(levelFloor(L).id, 'floor-lobby', 'arriving inside a walk-in building puts you in it');
  walkTo(1100); assert.equal(levelFloor(L).id, 'floor-street', 'walking out of the side wall leaves for the street');
  run(120); assert.ok(levelView(L, m).reveal.tower < 0.05, 'outside, the tower closes again');
}
// the street stairs down to the metro hall are outdoors: usable from the street, where they are drawn
{
  const {p, L, hint, run} = play(1310);
  assert.ok(hint('DOWNSTAIRS') && levelDown(L, p), 'the street stairs go down');
  run(400, -1);
  assert.equal(levelFloor(L).id, 'floor-metro', 'down to the metro hall');
}

assert.deepEqual(restingLevelView(level, true).reveal, {tower: 1}, 'the editor can preview a building opened');
assert.equal(tower.exits.length, 0);
console.log('Levels PASS: walk-in tower with fading facade, only visible pieces usable, walked stairs, boarding escalator, lift (its mover) with floor panel and call buttons.');
