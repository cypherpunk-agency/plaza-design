/**
 * Level kit styles (engine/level.ts, art/levels/elements.ts): every stair, escalator and lift style
 * compiles and draws; a vertical ladder and a spiral are climbed with ↑/↓ (←/→ do nothing on them);
 * a switchback walks its landing; a broken lift says OUT OF ORDER and is never called; a shophouse
 * flight lands in its own building, not on the street at the same height; an indoor floor is indoors.
 */
import assert from 'node:assert/strict';
import {compileLevel, levelArrive, levelClimbing, levelFloor, levelHints, levelIndoor, levelInteract, levelRiding, levelStep, levelUp, type Level, type LevelPlayer, type MoverModel} from '../../src/ssg/game/engine/level';
import {elevatorElement, escalatorElement, LIFT_STYLES, STAIR_STYLES, stairsElement} from '../../src/ssg/game/art/levels/elements';
import type {Resolved} from '../../src/ssg/game/art/core/composition';

const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>) =>
  ({element: {type}, instance: {id}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
const rows = [
  row('level.floor', 'street', 0, 0, {width: 400}),
  row('level.floor', 'shop-ground', 100, 0, {width: 100, building: 'shop'}),
  row('level.floor', 'shop-upper', 100, 60, {width: 100, building: 'shop'}),
  row('level.floor', 'loft', 0, 60, {width: 60}),
  row('level.floor', 'tunnel', 260, -80, {width: 140, indoor: true}),
  row('level.stairs', 'shop-stair', 120, 0, {run: 40, rise: 60, style: 'timber'}),
  row('level.stairs', 'switchback', 20, 0, {run: 30, rise: 60, style: 'switchback'}),
  row('level.stairs', 'shaft-ladder', 300, -80, {run: 0, rise: 80, style: 'steel-ladder'}),
  row('level.elevator', 'dead-lift', 240, 0, {height: 60, width: 30, style: 'broken'}),
];
const src = compileLevel(rows)!;
const still: MoverModel = {now: () => 0, movers: {stopPositions: () => undefined, position: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}, moveTo() {}};
function at(x: number, h: number, floor?: string) {
  const p: LevelPlayer = {x, y: h, vy: 0, face: 1, onGround: true, moving: false};
  const L: Level = {source: src, state: levelArrive(src, p, h)};
  if (floor) L.state.floor = floor;
  const step = (frames: number, walk = 0, climb = 0) => { for (let i = 0; i < frames; i++) levelStep(L, p, walk, 1, still, climb); };
  return {p, L, step, hint: (w: string) => levelHints(L, p, still).some(t => t.label.includes(w))};
}

// compile: a straight flight leans its run; a vertical ladder rises where it stands; a switchback turns at a landing
const link = (id: string) => src.links.find(l => l.id === id)!;
assert.deepEqual([link('shop-stair').low, link('shop-stair').high, link('shop-stair').shape], [{x: 120, h: 0}, {x: 160, h: 60}, undefined], 'a timber flight walks like concrete');
assert.deepEqual([link('shaft-ladder').high, link('shaft-ladder').shape], [{x: 300, h: 0}, 'rungs'], 'a steel ladder rises straight up');
assert.deepEqual(link('switchback').path, [{x: 20, h: 0}, {x: 50, h: 30}, {x: 20, h: 60}], 'a switchback walks to its landing and back above its foot');
assert.equal(src.lifts[0].broken, true, 'a broken lift compiles as out of order');

// the ladder: ↑ held climbs, ←/→ do nothing, letting go stops on the rungs
{
  const {p, L, step, hint} = at(300, -80);
  assert.ok(levelIndoor(L), 'the tunnel is indoors (no daylight)');
  assert.ok(hint('CLIMB UP') && levelUp(L, p) && levelClimbing(L), '↑ at the foot gets on the ladder');
  step(20, 1); assert.equal(p.y, -80, '→ does not climb a ladder');
  step(30, 0, 1); const mid = p.y; assert.ok(mid > -80 && mid < 0 && p.x === 300, 'holding ↑ climbs (h ' + mid + ')');
  step(20); assert.equal(p.y, mid, 'let go: you hang on the rungs');
  step(200, 0, 1); assert.ok(!levelRiding(L) && levelFloor(L).id === 'street' && !levelIndoor(L), 'out at the top, on the street, outdoors');
}
// the switchback: past the landing, then back over the foot
{
  const {p, L, step} = at(20, 0, 'street');
  assert.ok(levelUp(L, p) && levelClimbing(L), 'a switchback is climbed with ↑');
  step(36, 0, 1); assert.ok(p.x > 40 && p.y > 20 && p.y < 40, 'first flight, toward the landing (' + p.x + ', ' + p.y + ')');
  step(200, 0, 1); assert.ok(!levelRiding(L) && levelFloor(L).id === 'loft' && p.x === 20, 'second flight comes out above the foot, on the loft');
}
// the shophouse: coming down its stair lands on its ground floor, not the street at the same height
{
  const {p, L, step} = at(160, 60, 'shop-upper');
  assert.equal(levelFloor(L).building, 'shop');
  assert.ok(levelHints(L, p, still).some(t => t.label.includes('DOWNSTAIRS')));
  levelInteract(L, 'down:shop-stair', p, still); step(200, -1);
  assert.equal(levelFloor(L).id, 'shop-ground', 'the first flight lands inside the shop');
}
// the broken lift: a sign, never a call
{
  const {p, L, hint} = at(240, 0, 'street');
  assert.ok(hint('OUT OF ORDER') && !hint('CALL LIFT'), 'a broken lift says OUT OF ORDER');
  assert.equal(levelInteract(L, 'lift:dead-lift', p, still), false, 'E does nothing');
}
// every style is a choice in the editor and draws without throwing
const canvas = new Proxy({}, {get: (_, k) => k === 'globalAlpha' ? 1 : () => {}, set: () => true}) as unknown as CanvasRenderingContext2D;
const view = {sx: (x: number) => x, y: (h: number) => -h, s: 1} as never;
const opts = (f: unknown) => (f as {options: string[]}).options;
assert.deepEqual(opts(stairsElement.fields.style), Object.keys(STAIR_STYLES));
assert.deepEqual(opts(elevatorElement.fields.style), [...LIFT_STYLES]);
assert.deepEqual(opts(escalatorElement.fields.style), ['standard', 'glass']);
for (const style of Object.keys(STAIR_STYLES)) for (const rail of opts(stairsElement.fields.rail)) stairsElement.draw(canvas, view, {run: 40, rise: 60, style, rail}, {} as never);
for (const style of LIFT_STYLES) for (const doors of [0, 1]) elevatorElement.draw(canvas, view, {height: 120, width: 34, style}, {car: 60, doors} as never);
for (const style of ['standard', 'glass']) escalatorElement.draw(canvas, view, {run: 60, rise: 40, direction: 'up', style}, {} as never);
console.log('Level styles PASS: ladders climbed with ↑/↓, switchback landing, broken lift out of order, shophouse stair lands indoors, indoor floors, every style draws.');

// the street door seen from inside: shown with its building's interior, in each style
{
  const {levelOpacity, restingLevelView} = await import('../../src/ssg/game/engine/level');
  const {entranceElement, ENTRANCE_STYLES} = await import('../../src/ssg/game/art/levels/elements');
  const lv = compileLevel([row('level.floor', 'street', 0, 0, {width: 300}), row('level.floor', 'lobby', 100, 0, {width: 100, building: 'blk'}), row('level.interior', 'blk-in', 100, 0, {building: 'blk'}), row('level.entrance', 'front', 104, 0, {building: 'blk', style: 'glass'})])!;
  assert.equal(levelOpacity(lv, restingLevelView(lv, false)).front, 0, 'outside, the inside of the door is not drawn');
  assert.equal(levelOpacity(lv, restingLevelView(lv, true)).front, 1, 'inside, it is');
  assert.deepEqual(opts(entranceElement.fields.style), [...ENTRANCE_STYLES]);
  for (const style of ENTRANCE_STYLES) for (const sign of ['CLOSED', 'PULL', 'none']) entranceElement.draw(canvas, view, {width: 28, height: 46, style, sign}, {} as never);
  console.log('Level entrances PASS: the street door seen from inside shows with its building, in every style.');
}

import {art,resolveComposition,drawCompositionSlot} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {measureArtwork} from '../../src/ssg/game/art/core/measure';
import {projectedBounds} from '../../src/ssg/game/art/core/geometry';

const boundsView={...frameView(600),viewW:10000,viewH:10000,cam:0,gy:5000,sx:(x:number)=>x,y:(h:number)=>5000-h};let count=0;const bad=[];
function check(type:string,props:any,state:any={}){const doc=art.validate({version:1,scene:'bounds-check',instances:[{id:'piece',type,layer:'set',order:0,placement:{x:1000,h:0},props}]}),env={view:boundsView,reduced:false,state:{piece:state}},r=resolveComposition(art,doc,env)[0],b=projectedBounds(boundsView,r.placement,r.element.bounds(r.props,r.state,{view:boundsView,placement:r.placement})),a=measureArtwork(ctx=>{for(const slot of ['behind-player','over-player','foreground'] as const)drawCompositionSlot(ctx,art,doc,env,slot)});count++;if(a.x<b.x-1||a.y<b.y-1||a.x+a.width>b.x+b.width+1||a.y+a.height>b.y+b.height+1)bad.push({type,props,state,b,a});}
for(const style of Object.keys(STAIR_STYLES))for(const run of [-120,0,120])for(const rise of [-80,0,80])check('level.stairs',{style,run,rise});
for(const style of ['standard','glass'])for(const run of [-120,0,120])for(const rise of [-80,0,80])check('level.escalator',{style,run,rise});
for(const style of LIFT_STYLES)for(const car of [0,80])check('level.elevator',{style,height:80,width:34},{car,doors:1});
assert.deepEqual(bad,[],'bounds contain drawing operations in either direction');console.log('Level bounds PASS:',count,'style/path/state samples');
