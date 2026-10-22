/**
 * What the player passes behind (engine/level.ts `levelNear`, art/core/composition.ts `Element.drawNear`): walking into a
 * walk-in building, the shell front's wall edge (`jamb`) is drawn over the player while they pass through it, so they go
 * behind the wall and come out inside; on or beside a stair, its near handrail and posts are drawn over them while its
 * treads stay behind. Outside, fully inside and away from the stair nothing covers them, and at rest (the editor, parity
 * views) every piece draws whole, as before. Played in the Tower lab on the game's own level step and drawn through the
 * scene's own composition and the frame's over-player slot.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {art} from '../../src/ssg/game/art';
import {beginLayeredFrame, flushLayeredSlot, resolveComposition, type Composition, type Instance} from '../../src/ssg/game/art/core/composition';
import {compileLevel, compileOccluders, levelArrive, levelBounds, levelDown, levelFloor, levelNear, levelRiding, levelStep, levelView, restingLevelView, splitLevelView, type Level, type LevelPlayer} from '../../src/ssg/game/engine/level';
import {referenceView} from './reference-view';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

const tower = (SCENES as Record<string, SceneDef>).tower;
assert.ok(tower?.level, 'the Tower lab compiles a level');
const level = tower.level!;

// every draw of the two pieces, in order, as front:back / front:near / stairs:back ... (what the composition calls)
const log: string[] = [];
for (const type of ['building.front', 'level.stairs']) {
  const e = art.get(type), draw = e.draw, near = e.drawNear!;
  assert.ok(near, type + ' has a near part');
  // the basement flight (its foot at x 700, h -90) stands for the stairs; the tower front is the one with a wall edge
  const mine = (p: Record<string, unknown>, at: {x: number; h: number}) => type === 'level.stairs' ? at.x === 700 && at.h === -90 : Number(p.jamb) > 0;
  e.draw = (...a) => { const [, , p, s, , at] = a; if (mine(p, at)) log.push((type === 'level.stairs' ? 'stairs' : 'front') + (Number(s.near) > 0 ? ':back' : ':whole')); return draw(...a); };
  e.drawNear = (...a) => { const [, , p, , at] = a; if (mine(p, at)) log.push((type === 'level.stairs' ? 'stairs' : 'front') + ':near'); return near(...a); };
}
const ctx = new Proxy({canvas: {width: 1600, height: 900}} as Record<string, unknown>, {get(o, k) {
  if (k in o) return o[k as string];
  if (k === 'getTransform') return () => ({a: 1, b: 0, c: 0, d: 1, e: 0, f: 0});
  if (k === 'measureText') return (s: string) => ({width: String(s).length * 5});
  if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({addColorStop() {}});
  if (k === 'getImageData') return () => ({data: new Uint8ClampedArray(4)});
  return () => {};
}, set(o, k, v) { o[k as string] = v; return true; }}) as unknown as CanvasRenderingContext2D;
(globalThis as Record<string, unknown>).document ??= {createElement() { return {width: 0, height: 0, style: {}, getContext() { return ctx; }}; }};

const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
const p: LevelPlayer = {x: tower.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
const L: Level = {source: level, state: levelArrive(level, p, tower.spawnH ?? 0)};
const frame = (walk = 0) => {
  m.player = {x: p.x, h: p.y, ...(levelRiding(L) ? {} : {building: levelFloor(L).building})}; m.tick(1000 / 60, true);
  if (!levelStep(L, p, walk, 1, m) && walk) { const [a, b] = levelBounds(L, tower.width); p.x = Math.max(a, Math.min(b, p.x + walk * 1.3)); }
};
const walkTo = (to: number) => { for (let i = 0; i < 4000 && Math.abs(p.x - to) > 1; i++) frame(Math.sign(to - p.x)); };
/** One frame drawn the way runtime/render-scene.ts does: the scene's backdrop, the player, then the over-player slot. */
function drawn(withPlayer = true) {
  const cam = Math.max(0, p.x - 320), gy = 300 + p.y;
  const view = referenceView({sx: (wx: number, k = 1) => Math.round(wx - cam * k), y: (h: number) => gy - h, t: 100, cam, gy, viewW: 640, viewH: gy + 90, flags: {}, level: levelView(L, m, withPlayer ? p : undefined)});
  log.length = 0; beginLayeredFrame();
  const engine = {m, hover: null, layer: 'all' as const};
  tower.preparePresentation?.(view, engine); tower.drawBackdrop(ctx, view, engine);
  log.push('PLAYER'); flushLayeredSlot('over-player');
  return {order: [...log], near: tower.visualEnvironment!(view, engine).state};
}
const after = (order: string[], what: string) => order.indexOf(what) > order.indexOf('PLAYER');

// on the street, outside: the front draws whole, behind the player
walkTo(480); let f = drawn();
assert.deepEqual(f.order.filter(o => o.startsWith('front')), ['front:whole'], 'outside, the facade draws whole: ' + f.order.join(' '));
assert.ok(!f.order.slice(f.order.indexOf('PLAYER')).some(o => o.startsWith('front')), 'outside, nothing of the facade is over the player');
// reaching the wall from the street (still on the street floor): the body is in the wall edge, it goes behind it
walkTo(516); assert.equal(levelFloor(L).id, 'floor-street', 'still on the street at the wall');
f = drawn();
assert.equal(f.near['tower-front']?.near, 1, 'the front is told the player is in its wall edge');
assert.deepEqual(f.order.filter(o => o.startsWith('front')), ['front:back', 'front:near'], 'in the wall edge: the facade without it behind, the edge after');
assert.ok(after(f.order, 'front:near') && !after(f.order, 'front:back'), 'the wall edge is drawn over the player: ' + f.order.join(' '));
// through the side wall into the lobby: still behind the edge while passing it
walkTo(530); assert.equal(levelFloor(L).id, 'floor-lobby', 'in the lobby');
f = drawn(); assert.ok(after(f.order, 'front:near'), 'passing through the wall into the lobby, the wall edge covers the player');
// fully in: the edge is behind them and the facade has faded
walkTo(560); f = drawn();
assert.deepEqual(f.order.filter(o => o.startsWith('front')), ['front:whole'], 'past the wall edge, nothing of the facade covers the player');
assert.ok(!('tower-front' in f.near) || !f.near['tower-front'].near, 'past the wall edge, the front is not near');
// without the player's place (the editor, parity views) everything draws whole
walkTo(525); f = drawn(false);
assert.deepEqual(f.order.filter(o => o.startsWith('front')), ['front:whole'], 'at rest the facade draws whole');
assert.ok(!f.order.some(o => o.endsWith(':near')), 'at rest nothing waits for the over-player slot');

// the stair: away from it the rail stays with the stair; beside its foot and on the flight the rail is over the player
walkTo(640); f = drawn();
assert.deepEqual(f.order.filter(o => o.startsWith('stairs')), ['stairs:whole'], 'away from the stair it draws whole');
walkTo(588); f = drawn();
assert.equal(f.near['stairs-basement']?.near, 1, 'at the top of the stair, within its reach, the player is beside it');
assert.ok(after(f.order, 'stairs:near'), 'beside the stair its rail is over the player');
walkTo(580); assert.ok(levelDown(L, p) && levelRiding(L), 'onto the flight');
for (let i = 0; i < 40; i++) frame(1);
assert.ok(p.y < 0 && levelRiding(L), 'on the flight (h ' + p.y.toFixed(1) + ')');
f = drawn();
assert.deepEqual(f.order.filter(o => o.startsWith('stairs')), ['stairs:back', 'stairs:near'], 'on the flight: the treads behind, the rail after');
assert.ok(after(f.order, 'stairs:near') && !after(f.order, 'stairs:back'), 'on the flight the near rail is drawn over the player: ' + f.order.join(' '));
for (let i = 0; i < 400 && levelRiding(L); i++) frame(1);
assert.equal(levelFloor(L).id, 'floor-b1', 'down in B1');
walkTo(level.links.find(l => l.id === 'stairs-basement')!.low.x + 40); f = drawn();
assert.deepEqual(f.order.filter(o => o.startsWith('stairs')), ['stairs:whole'], 'walked off the foot of the flight: the rail is back with the stair');

// joined zones: the player's place goes only to the zone they are in, in its own ids and units
const joined = {reveal: {}, lifts: {}, at: {x: 12, h: 0, floor: 'floor-a', zone: 'annex'}};
assert.deepEqual(splitLevelView(joined, 'annex').at, {x: 12, h: 0, floor: 'floor-a'}, 'their own zone gets the place');
assert.equal(splitLevelView(joined, 'tower').at, undefined, 'a neighbour does not');
assert.deepEqual(levelNear(level, restingLevelView(level, true), compileOccluders([])), {}, 'nothing is near at rest');

// every level composition: each occluder's near state is one its artwork declares
const root = 'src/ssg/game', files = [
  ...fs.readdirSync(path.join(root, 'scenes'), {withFileTypes: true}).filter(d => d.isDirectory()).map(d => path.join(root, 'scenes', d.name, 'composition.json')),
  ...fs.readdirSync(path.join(root, 'art/proposals')).filter(n => n.endsWith('.composition.json')).map(n => path.join(root, 'art/proposals', n)),
].filter(x => fs.existsSync(x));
const unbind = (nodes: Instance[]): Instance[] => nodes.map(({bindings: _, children, ...n}) => ({...n, ...(children ? {children: unbind(children)} : {})}) as Instance);
let pieces = 0, jambs = 0;
for (const file of files) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as Composition, rows = resolveComposition(art, {...doc, instances: unbind(doc.instances)}, {view: {t: 0} as never, state: {}, reduced: true});
  if (!compileLevel(rows)) continue;
  for (const o of compileOccluders(rows)) { const t = rows.find(r => r.instance.id === o.id)!.instance.type; assert.doesNotThrow(() => art.visualProperties(t, {near: 1}), undefined, file + ': ' + o.id); pieces++; if (o.kind === 'jamb') jambs++; }
}
assert.ok(jambs >= 1 && pieces > jambs, 'wall edges and stair rails were found');
console.log(`Entrance occlusion PASS: the wall edge covers the player passing through it and not outside or inside; a stair's near rail covers them on or beside it; at rest everything draws whole (${pieces} occluders, ${jambs} wall edges).`);
