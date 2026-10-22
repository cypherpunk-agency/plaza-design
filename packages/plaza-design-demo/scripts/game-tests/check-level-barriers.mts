/**
 * Barriers (engine/level.ts `LevelBarrier`, art/levels/elements.ts `level.barrier`, world/access.ts `barrierAccess`):
 * an in-world turnstile, gate or locked door stops the player on their floor, not at a scene exit. E there asks its
 * rule (the exits' key and flag); it refuses until the rule passes, then opens, lets the player through and stays open
 * (handed back from the save on the next arrival). Joined zones (`mergeLevels`) keep it, namespaced like other pieces.
 * The Tower annex's turnstile compiles from its real source and its key resolves.
 */
import assert from 'node:assert/strict';
import {compileLevel, levelArrive, levelBounds, levelHints, levelOpened, levelPass, levelStep, levelView, levelVisualState, mergeLevels, restingLevelView, savedByScene, savedForLevel, splitLevelView, type Level, type LevelPlayer, type LevelSource, type MoverModel} from '../../src/ssg/game/engine/level';
import {barrierAccess, validateExitKeyReferences} from '../../src/ssg/game/world/access';
import {art} from '../../src/ssg/game/art';
import type {Resolved} from '../../src/ssg/game/art/core/composition';
import {SCENES} from '../../src/ssg/game/scenes/index';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>) =>
  ({element: {type}, instance: {id}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
const still: MoverModel = {now: () => 0, movers: {stopPositions: () => undefined, position: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}, moveTo() {}};
const W = 400;
const src = compileLevel([
  row('level.floor', 'street', 0, 0, {width: W}),
  row('level.floor', 'deck', 0, 80, {width: W}),
  row('level.barrier', 'gate', 200, 0, {style: 'turnstile', width: 24, key: 'pass', refuse: 'CARD NOT VALID'}),
  row('level.barrier', 'flagged', 300, 0, {style: 'gate', width: 40, flag: 'shift.done', refuse: 'STAFF ONLY'}),
])!;
assert.deepEqual(src.barriers, [
  {id: 'gate', x: 200, h: 0, w: 24, style: 'turnstile', key: 'pass', refuse: 'CARD NOT VALID'},
  {id: 'flagged', x: 300, h: 0, w: 40, style: 'gate', flag: 'shift.done', refuse: 'STAFF ONLY'},
], 'barriers compile from their typed fields');
assert.equal(compileLevel([row('level.floor', 'street', 0, 0, {width: W})])!.barriers, undefined, 'a level without barriers compiles as before');

/** The game's walk: the level step, then the floor's bounds (with the player's x, so a shut barrier stops them). */
const walk = (L: Level, p: LevelPlayer, dir: number, frames: number) => {
  for (let i = 0; i < frames; i++) if (!levelStep(L, p, dir, 1, still)) { const [a, b] = levelBounds(L, W, p.x); p.x = Math.max(a, Math.min(b, p.x + dir * 1.3)); }
};
const save = {flags: {} as Record<string, boolean>, keyring: [] as string[]};
const ask = (L: Level, id: string) => levelPass(L, id, b => barrierAccess(b, save.flags, save.keyring));
const player = (x: number): LevelPlayer => ({x, y: 0, vy: 0, face: 1, onGround: true, moving: false});

const p = player(100), L: Level = {source: src, state: levelArrive(src, p, 0)};
walk(L, p, 1, 200);
assert.ok(p.x < 200 - 12 && p.x > 180, 'walking right, the shut turnstile stops the player on their side: ' + p.x);
const hint = levelHints(L, p, still).find(h => h.id === 'barrier:gate');
assert.ok(hint && hint.label === '[E] TURNSTILE', 'E is offered at the turnstile');
assert.ok(Math.abs(hint!.x - p.x) < 26, 'within E reach of where the player stops');
assert.deepEqual(ask(L, 'barrier:gate'), {ok: false, reason: 'CARD NOT VALID', index: 0, hidden: false}, 'without the key it refuses with its words');
walk(L, p, 1, 60);
assert.ok(p.x < 200, 'refused, it stays shut');
assert.equal(ask(L, 'lift:nothing'), undefined, 'a prompt that is not a barrier is left to levelInteract');

save.keyring.push('pass');
assert.deepEqual(ask(L, 'barrier:gate'), {ok: true}, 'carrying the key, it lets the player through');
assert.deepEqual(levelOpened(L), ['gate']);
assert.ok(!levelHints(L, p, still).some(h => h.id === 'barrier:gate'), 'an open barrier offers nothing');
walk(L, p, 1, 40);
assert.ok(p.x > 200, 'the player walks through');
assert.ok(levelView(L, still).barriers!.gate > 0.9, 'its picture swings open');
walk(L, p, 1, 200);
assert.ok(p.x < 300 - 20 && p.x > 260, 'the next barrier, a gate on a flag, stops them too');
assert.equal(ask(L, 'barrier:flagged')!.ok, false, 'its flag is not set');
save.flags['shift.done'] = true;
assert.equal(ask(L, 'barrier:flagged')!.ok, true, 'once set, it opens');
walk(L, p, 1, 200); walk(L, p, -1, 400);
assert.ok(p.x < 150, 'both stay open: the player walks back through them');
assert.deepEqual(L.state.barriers, {gate: L.state.barriers!.gate, flagged: L.state.barriers!.flagged});
assert.ok(L.state.barriers!.gate > 0.99 && L.state.barriers!.flagged > 0.99, 'and they never close');
// a barrier stops only its own floor
{
  const q = player(100), D: Level = {source: src, state: levelArrive(src, q, 80)};
  walk(D, q, 1, 300); assert.ok(q.x > 300, 'on the deck above, the street\'s barriers are not in the way');
}
// the save keeps them open (Save.barriers, by scene): handed back on the next arrival
const kept = savedByScene(src, 'lab', levelOpened(L));
assert.deepEqual(kept, {lab: ['gate', 'flagged']});
{
  const q = player(100), A: Level = {source: src, state: levelArrive(src, q, 0, [], savedForLevel(src, 'lab', kept))};
  assert.deepEqual(levelView(A, still).barriers, {gate: 1, flagged: 1}, 'an opened barrier is open at once on arrival');
  walk(A, q, 1, 300); assert.ok(q.x > 300, 'and walked through');
}

// visual state: the level hands each barrier its `open`, which the element declares
for (const view of [restingLevelView(src, false), levelView(L, still)])
  for (const id of ['gate', 'flagged']) assert.doesNotThrow(() => art.visualProperties('level.barrier', levelVisualState(view)[id]), 'level.barrier declares open');
assert.deepEqual(restingLevelView(src, true).barriers, {gate: 0, flagged: 0}, 'the editor shows barriers shut');

// joined zones: barriers merge like other pieces, ids and positions moved by where the zone lies
const annex = compileLevel([row('level.floor', 'street', 0, 0, {width: 300}), row('level.barrier', 'gate', 150, 0, {style: 'door', width: 20, key: 'pass'})])!;
const lab = compileLevel([row('level.floor', 'street', 0, 0, {width: W})])!;
const merged: LevelSource = mergeLevels([{zone: 'lab', source: lab, dx: 0, dh: 0, width: W}, {zone: 'annex', source: annex, dx: W, dh: 0, width: 300}]);
assert.deepEqual(merged.barriers, [{id: 'annex/gate', x: W + 150, h: 0, w: 20, style: 'door', key: 'pass', refuse: 'ACCESS DENIED.', zone: 'annex'}], 'the annex barrier, namespaced and placed');
{
  save.keyring = [];
  const q = player(300), M: Level = {source: merged, state: levelArrive(merged, q, 0)};
  const run = (dir: number, n: number) => { for (let i = 0; i < n; i++) if (!levelStep(M, q, dir, 1, still)) { const [a, b] = levelBounds(M, W, q.x); q.x = Math.max(a, Math.min(b, q.x + dir * 1.3)); } };
  run(1, 300);
  assert.ok(q.x > W && q.x < W + 140, 'over the seam, the annex door stops the player: ' + q.x);
  assert.equal(levelHints(M, q, still).find(h => h.id === 'barrier:annex/gate')?.label, '[E] OPEN DOOR');
  assert.equal(ask(M, 'barrier:annex/gate')!.ok, false, 'it refuses');
  save.keyring = ['pass'];
  assert.equal(ask(M, 'barrier:annex/gate')!.ok, true, 'then lets them through');
  run(1, 200); assert.ok(q.x > W + 160, 'through the annex door');
  assert.deepEqual(splitLevelView(levelView(M, still), 'annex').barriers, {gate: levelView(M, still).barriers!['annex/gate']}, 'the annex draws its own barrier');
  assert.deepEqual(savedByScene(merged, 'lab', levelOpened(M)), {annex: ['gate']}, 'saved under the annex scene');
  assert.deepEqual(savedForLevel(merged, 'lab', {annex: ['gate']}), ['annex/gate'], 'and handed back to the joined level');
}

// the real annex: its turnstile compiles from scenes/authored.json and its key resolves
const real = (SCENES as Record<string, SceneDef>)['tower-annex'];
assert.ok(real?.level?.barriers?.some(b => b.id === 'turnstile' && b.style === 'turnstile' && b.key), 'the Tower annex has its turnstile');
assert.throws(() => validateExitKeyReferences({id: 'x', level: {barriers: [{id: 'b', key: 'nope'}]}}, new Set()), /Unknown barrier key reference/);
console.log('Level barriers PASS: a shut barrier stops the player on its floor, refuses until its rule passes, lets them through and stays open (and from the save); merged levels keep it; the annex turnstile compiles.');
process.exit(0);
