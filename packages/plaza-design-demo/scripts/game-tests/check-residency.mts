/**
 * Residency (world/zone-graph.ts `residency`, SEAMLESS-WORLD.md §3): over a lab chain of six zones, each zone's tier
 * follows its gap from the camera rect (visible within the margin, near within the prefetch distance), a hosted zone
 * stays until the eviction distance, an open panel holds a zone anywhere, the budget trims the near set keeping the
 * nearest, and newly needed zones are compiled nearest first. Loops and vertical seams place each zone once.
 */
import assert from 'node:assert/strict';
import {residency, validateZoneGraph, type ResidencyInput} from '../../src/ssg/game/world/zone-graph';

// the lab chain: six 400-wide zones in a row, joined by walk seams; the view is 400 wide (prefetch 600, eviction 1200)
const ids = ['lab1', 'lab2', 'lab3', 'lab4', 'lab5', 'lab6'];
const chain = validateZoneGraph({version: 1, seams: ids.slice(1).map((b, i) => ({id: `${ids[i]}-${b}`, kind: 'walk', a: {zone: ids[i]}, b: {zone: b}, dx: 400, dh: 0}))});
const zones = Object.fromEntries(ids.map(z => [z, {width: 400}]));
const at = (input: Partial<ResidencyInput>) => residency(chain, {active: 'lab3', camera: {x: 0, w: 400}, viewW: 400, zones, hosted: [], ...input});
const tiers = (r: ReturnType<typeof residency>) => Object.fromEntries([...r.zones].map(([z, v]) => [z, v.tier]));

// tiers by distance: the camera on lab3; lab2 and lab4 touch it, lab1 and lab5 are 400 off, lab6 800 (past prefetch)
let r = at({});
assert.deepEqual(tiers(r), {lab3: 'active', lab2: 'visible', lab4: 'visible', lab1: 'near', lab5: 'near', lab6: 'unloaded'});
assert.equal(r.zones.get('lab5')!.gap, 400);
assert.deepEqual(r.zones.get('lab6')!.at, {dx: 1200, dh: 0, hops: 3}, 'placed from the active zone along seams');
assert.match(r.zones.get('lab5')!.reason, /near: 400 from camera <= prefetch 600/);
assert.deepEqual(r.load, ['lab3', 'lab2', 'lab4', 'lab1', 'lab5'], 'compiled active first, then visible, then nearest (ties by id)');
assert.deepEqual(r.evict, []);

// visible by camera overlap: the camera rect grown by 64 must meet the zone
assert.equal(at({camera: {x: 50, w: 400}}).zones.get('lab2')!.tier, 'visible', '50 off: within the margin');
assert.equal(at({camera: {x: 100, w: 400}}).zones.get('lab2')!.tier, 'near', '100 off: past the margin, still near');

// hysteresis: a hosted zone past the prefetch distance stays hosted until the eviction distance
r = at({hosted: ['lab3', 'lab6']});
assert.equal(r.zones.get('lab6')!.tier, 'near'); assert.match(r.zones.get('lab6')!.reason, /kept: 800 from camera <= eviction 1200/);
assert.deepEqual(r.evict, []); assert.equal(r.load.includes('lab6'), false, 'a kept zone is already hosted');

// eviction beyond three view widths: from lab1, lab6 is 1600 off; lab5 at exactly 1200 is kept, not past it
r = at({active: 'lab1', hosted: ['lab1', 'lab5', 'lab6']});
assert.equal(r.zones.get('lab5')!.tier, 'near');
assert.equal(r.zones.get('lab6')!.tier, 'unloaded'); assert.equal(r.zones.get('lab6')!.at, undefined, 'not placed past eviction');
assert.deepEqual(r.evict, ['lab6']);
assert.equal(at({active: 'lab1'}).zones.has('lab6'), false, 'an unhosted zone past eviction is not listed at all');

// the budget shrinks the near set, nearest kept; active and visible are never dropped
r = at({camera: {x: 20, w: 400}, budget: 4});
assert.equal(r.zones.get('lab5')!.tier, 'near', 'lab5 is 380 off: kept');
assert.equal(r.zones.get('lab1')!.tier, 'unloaded', 'lab1 is 420 off: dropped'); assert.match(r.zones.get('lab1')!.reason, /budget of 4/);
assert.deepEqual(r.load, ['lab3', 'lab4', 'lab2', 'lab5']);
r = at({camera: {x: 20, w: 400}, budget: 1, hosted: ids});
assert.deepEqual(tiers(r), {lab3: 'active', lab2: 'visible', lab4: 'visible', lab1: 'unloaded', lab5: 'unloaded', lab6: 'unloaded'}, 'over budget, only active and visible stay');
assert.deepEqual(r.evict, ['lab1', 'lab5', 'lab6']);

// an open panel holds a zone: past prefetch, past eviction, and over budget
r = at({held: ['lab6']});
assert.equal(r.zones.get('lab6')!.tier, 'near'); assert.match(r.zones.get('lab6')!.reason, /held/);
assert.ok(r.load.includes('lab6'));
r = at({active: 'lab1', hosted: ['lab1', 'lab6'], held: ['lab6'], budget: 1});
assert.equal(r.zones.get('lab6')!.tier, 'near', 'held past eviction and over budget'); assert.deepEqual(r.evict, []);

// a zone with no seams is the one-zone case: it is active, and every other hosted zone goes
r = residency(chain, {active: 'solo', camera: {x: 0, w: 400}, viewW: 400, zones: {...zones, solo: {width: 300}}, hosted: ['solo', 'lab2']});
assert.deepEqual(tiers(r), {solo: 'active', lab2: 'unloaded'}); assert.deepEqual(r.evict, ['lab2']);

// loops and vertical seams: lab and annex on the street, a loft over the lab and a roof over the annex, the roof walks back
const square = validateZoneGraph({version: 1, seams: [
  {id: 'lab-annex', kind: 'walk', a: {zone: 'lab'}, b: {zone: 'annex'}, dx: 400, dh: 0},
  {id: 'lab-loft', kind: 'stairs', a: {zone: 'lab', piece: 'up'}, b: {zone: 'loft', piece: 'down'}, dx: 0, dh: 300},
  {id: 'annex-roof', kind: 'stairs', a: {zone: 'annex', piece: 'up'}, b: {zone: 'roof', piece: 'down'}, dx: 0, dh: 300},
  {id: 'loft-roof', kind: 'walk', a: {zone: 'loft'}, b: {zone: 'roof'}, dx: 400, dh: 0},
]});
const rooms = {lab: {width: 400, height: 200}, annex: {width: 400, height: 200}, loft: {width: 400, height: 200}, roof: {width: 400, height: 200}};
const up = (camera: ResidencyInput['camera']) => residency(square, {active: 'lab', camera, viewW: 400, zones: rooms, hosted: []});
r = up({x: 0, w: 400, y: 0, h: 200});
assert.deepEqual(tiers(r), {lab: 'active', annex: 'visible', loft: 'near', roof: 'near'}, 'the loft is 100 above the camera: near, not visible');
assert.equal(r.zones.size, 4, 'the loop places each zone once');
assert.deepEqual(r.zones.get('roof')!.at, {dx: 400, dh: 300, hops: 2});
assert.equal(r.zones.get('loft')!.gap, 100); assert.equal(r.zones.get('roof')!.gap, 100);
assert.equal(up({x: 0, w: 400, y: 0, h: 250}).zones.get('loft')!.tier, 'visible', 'a taller camera rect reaches it within the margin');
assert.equal(up({x: 0, w: 400}).zones.get('loft')!.tier, 'visible', 'with no camera height, every height is in view');
assert.equal(residency(square, {active: 'loft', camera: {x: 0, w: 400, y: 0, h: 200}, viewW: 400, zones: rooms, hosted: []}).zones.get('lab')!.at!.dh, -300, 'below the active zone');

console.log('Residency PASS: tiers by gap from the camera rect, visible within the margin, hysteresis to eviction, budget keeps the nearest, open panels hold a zone, loops and vertical seams place once.');
