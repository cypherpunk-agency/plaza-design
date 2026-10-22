/**
 * The harbor as joined zones (docs/design/HARBOR-ZONES.md, SEAMLESS-WORLD.md §7 step 4): the five zones of
 * scenes/authored.json validate and join over world/zone-graph.json (`worldProblems` clean); one merged level walks
 * from the raised platform down the stair (or the lift) to the quay, east through the checkout's turnstile (a level
 * barrier over the shared `shift.*` state: in at dusk, refused mid-shift, open once the tag is returned, shut again
 * behind the player), into the yard and the shed and up to its staff room; the night shift runs across three zones'
 * gameplay on one Save.gameplay.shift block (deliver in the yard, read in the shed and at the checkout); the M2
 * prototype `harborShift` keeps its own flags.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENES} from '../../src/ssg/game/scenes/index';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import {placeFrom, validateZoneGraph, worldProblems} from '../../src/ssg/game/world/zone-graph';
import {levelArrive, levelBounds, levelDown, levelFloor, levelHints, levelInteract, levelOpened, levelPass, levelRejoin, levelStep, levelZone, mergeLevels, type Level, type LevelPlayer, type LevelSource, type MoverModel} from '../../src/ssg/game/engine/level';
import {barrierAccess} from '../../src/ssg/game/world/access';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {newSave} from '../../src/ssg/game/runtime/save';
import type {GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {validateCitySource} from '../../src/ssg/game/world/city-source';

const S = SCENES as Record<string, SceneDef>, ZONES = ['harbor-station', 'harbor-quay', 'harbor-checkout', 'harbor-yard', 'harbor-shed'];
const graph = validateZoneGraph(JSON.parse(fs.readFileSync('src/ssg/game/world/zone-graph.json', 'utf8')));

// 1 · the five zones validate and join
for (const z of ZONES) assert.ok(S[z]?.level, z + ' is a scene with a level');
const zones = Object.fromEntries(Object.keys(S).map(k => [k, {width: S[k].width}]));
const pieces = Object.fromEntries(Object.keys(S).filter(k => S[k].level).map(k => [k, [...S[k].level!.floors, ...S[k].level!.links, ...S[k].level!.lifts].map(p => p.id)]));
assert.deepEqual(worldProblems(graph, zones, pieces), [], 'worldProblems is clean');
assert.deepEqual(ZONES.map(z => S[z].width), [1440, 1600, 640, 1280, 1280], 'zone widths from HARBOR-ZONES.md');
const fromQuay = placeFrom(graph, 'harbor-quay', 4);
assert.deepEqual(ZONES.map(z => [fromQuay.get(z)!.dx, fromQuay.get(z)!.dh]), [[0, 160], [0, 0], [1600, 0], [2240, 0], [3520, 0]], 'offsets: the station 160 over the quay, then walk seams east');
const city = JSON.parse(fs.readFileSync('src/ssg/game/world/city.json', 'utf8'));
validateCitySource(city);
assert.deepEqual(city.PLACES.find((p: {id: string}) => p.id === 'harbor-works').scenes, ZONES, 'one harbor place holds the five zones');
assert.equal(city.STATIONS.harbor.scene, 'harborStation', 'the metro line is not rewired yet');

// 2 · one merged level, walked as the game walks it (runtime/game.ts joinLevel / crossInto)
const save = newSave();
let state: GameplayState = {flags: save.flags, items: save.items, tokens: save.tokens, values: save.gameplay ??= {}};
const port = {read: () => state, write: (next: GameplayState) => { state = {...next, values: Object.assign(save.gameplay!, next.values)}; save.tokens = next.tokens; save.items = next.items; save.flags = next.flags; }};
// the station lift's car: a mover with stops at the quay (-160) and the platform (0), as harbor-station's devices declare
const car = {at: 0, t1: -1e6};
const liftModel: MoverModel = {now: () => 0, movers: {stopPositions: () => ({quay: -160, platform: 0}), position: () => car.at, moving: () => false, target: () => undefined, trip: () => ({t0: -1e6, t1: car.t1})}, moveTo(_d, _n, stop) { car.at = stop === 'quay' ? -160 : 0; }};
let active = 'harbor-station';
const build = (zone: string): LevelSource => mergeLevels([...placeFrom(graph, zone)].map(([z, at]) => ({zone: z, source: S[z].level!, dx: at.dx, dh: at.dh, width: S[z].width})));
const p: LevelPlayer = {x: S[active].spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false};
let L: Level = {source: build(active), state: levelArrive(build(active), p, 0)};
const follow = () => { const z = levelZone(L); if (z && z !== active) { const at = placeFrom(graph, active).get(z)!; p.x -= at.dx; p.y -= at.dh; active = z; const source = build(z); L = levelRejoin({source, state: L.state}, source); } };
const walk = (dir: number, frames: number) => { for (let i = 0; i < frames; i++) { if (!levelStep(L, p, dir, 1, liftModel)) { const [a, b] = levelBounds(L, S[active].width, p.x); p.x = Math.max(a, Math.min(b, p.x + dir * 1.3)); } follow(); } };
const ride = () => { for (let i = 0; i < 600 && L.state.ride; i++) { levelStep(L, p, 0, 1, liftModel); follow(); } };
const ask = (id: string) => levelPass(L, id, b => barrierAccess(b, save.flags, save.keyring, port.read()));

assert.equal(levelFloor(L).id, 'harbor-station/floor-platform', 'arrival on the platform');
const lift = L.source.lifts.find(l => l.id === 'harbor-station/via-lift')!;
assert.deepEqual(lift.stops.map(s => [s.floor, s.h]), [['harbor-quay/floor-quay', -160], ['harbor-station/floor-platform', 0]], 'the lift stops at the quay below too');
// the lift down and back up
p.x = 410; assert.ok(levelHints(L, p, liftModel).some(h => h.id === 'lift:harbor-station/via-lift'), 'the lift is offered on the platform');
const LIFT = 'lift:harbor-station/via-lift';
assert.ok(levelInteract(L, LIFT, p, liftModel) && L.state.ride?.kind === 'lift', 'step in');
(L.state.ride as {pick: number}).pick = 0; levelInteract(L, LIFT, p, liftModel); levelStep(L, p, 0, 1, liftModel); follow();
assert.equal(active, 'harbor-quay', 'the car reaches the quay: the player is in the quay zone');
levelInteract(L, LIFT, p, liftModel); assert.equal(L.state.ride, null, 'stepped out on the quay'); assert.equal(levelFloor(L).id, 'harbor-quay/floor-quay');
assert.ok(levelInteract(L, LIFT, p, liftModel) && L.state.ride, 'in again');
(L.state.ride as {pick: number}).pick = 1; levelInteract(L, LIFT, p, liftModel); levelStep(L, p, 0, 1, liftModel); follow();
assert.equal(active, 'harbor-station', 'and back up to the platform'); levelInteract(L, LIFT, p, liftModel); assert.equal(L.state.ride, null, 'stepped out');
// the stair: west to its head, down onto the quay
walk(-1, 400); p.x = 150; assert.ok(levelDown(L, p), 'the stair head is on the platform');
for (let i = 0; i < 600 && L.state.ride; i++) { levelStep(L, p, 1, 1, liftModel); follow(); }
assert.equal(active, 'harbor-quay', 'down the stair: on the quay'); assert.equal(levelFloor(L).id, 'harbor-quay/floor-quay'); assert.ok(Math.abs(p.y) < 0.5 && Math.abs(p.x - 350) < 2, 'at the stair foot (quay x 350): ' + p.x);
// east along the quay into the checkout: the turnstile lets staff in at dusk (no tag yet) and shuts behind them
walk(1, 1300); assert.equal(active, 'harbor-checkout', 'over the walk seam into the checkout');
walk(1, 400); assert.ok(p.x < 302 && p.x > 280, 'the turnstile stops the player: ' + p.x);
assert.ok(levelHints(L, p, liftModel).some(h => h.id === 'barrier:harbor-checkout/turnstile'));
assert.deepEqual(ask('barrier:harbor-checkout/turnstile'), {ok: true}, 'at dusk, before the shift, it lets the worker in');
walk(1, 60); assert.ok(p.x > 315, 'through it'); assert.deepEqual(levelOpened(L), [], 'a turnstile is not kept open on the save');
walk(1, 30); assert.ok(!L.state.opened?.length, 'and it has shut behind the player');
walk(-1, 200); assert.ok(p.x > 302, 'shut, it stops the player on the staff side too');
// on into the yard and the shed, and up the staff-room stair
walk(1, 600); assert.equal(active, 'harbor-yard'); walk(1, 1100); assert.equal(active, 'harbor-shed', 'over the yard–shed seam');
walk(1, 600); p.x = 750; assert.ok(levelHints(L, p, liftModel).some(h => h.id === 'up:harbor-shed/staff-stair'));
L.state.ride = null; assert.ok(levelInteract(L, 'up:harbor-shed/staff-stair', p, liftModel)); for (let i = 0; i < 600 && L.state.ride; i++) { levelStep(L, p, 1, 1, liftModel); follow(); }
assert.equal(levelFloor(L).id, 'harbor-shed/floor-staff', 'in the staff room (h 100)');

// 3 · the shift's state is shared by the three zones: one Save.gameplay.shift block
const session = (z: string) => new GameplaySession(S[z].gameplay!, port);
const shed = session('harbor-shed'), yard = session('harbor-yard'), checkout = session('harbor-checkout');
const ok = (s: GameplaySession, id: string, source: 'interaction' | 'conversation' = 'interaction') => assert.ok(s.dispatch(id, source).ok, id);
const use = (z: string, id: string) => S[z].uses!.find(u => u.id === id)!;
const available = (z: string, id: string, s: GameplaySession) => { const u = use(z, id); return !u.available || u.available(save.flags, s.state()); };
assert.equal(available('harbor-yard', 'mara', yard), false, 'Mara is not part of the shift before the assignment');
ok(shed, 'shift.accept', 'conversation'); assert.equal(save.items['shift.tag'], 1, 'the tag is issued in the shed');
assert.equal(available('harbor-yard', 'mara', yard), true, 'the yard reads the assignment the shed wrote');
ok(shed, 'shift.collect'); assert.equal(S['harbor-yard'].dockworkerCarry!(save.flags, save.gameplay), 'parcel', 'carrying the parcel into the yard');
ok(yard, 'shift.deliver'); assert.equal(save.gameplay!.shift.parcelDelivered, true, 'delivered in the yard (its reaction records it)');
assert.equal(available('harbor-shed', 'rack', shed), true, 'the shed sees the delivery'); assert.equal(shed.state().values!.shift.parcelDelivered, true);
assert.equal(S['harbor-shed'].storyMinute!(save.flags, shed.state()), 1320, 'the shed\'s clock follows the yard\'s delivery (22:00)');
ok(yard, 'shift.collect-case'); assert.equal(S['harbor-shed'].dockworkerCarry!(save.flags, save.gameplay), 'case');
ok(shed, 'shift.return-case'); assert.equal(S['harbor-checkout'].storyDay!(save.flags, checkout.state()), 2, 'past midnight: day 2, read at the checkout');
assert.equal(available('harbor-checkout', 'checkout', checkout), false, 'no checkout before the last job');
ok(shed, 'shift.assign-trolley', 'conversation'); ok(yard, 'shift.inspect'); ok(yard, 'shift.release'); ok(yard, 'shift.park');
assert.equal(available('harbor-checkout', 'checkout', checkout), true, 'the checkout reads the trolley the yard parked');
// the turnstile on the way out: refused while the shift is open, open once the tag is returned
const turnstile = S['harbor-checkout'].level!.barriers!.find(b => b.id === 'turnstile')!;
assert.equal(barrierAccess(turnstile, save.flags, save.keyring, port.read()).ok, false, 'mid-shift (tag out) the turnstile refuses');
assert.match((barrierAccess(turnstile, save.flags, save.keyring, port.read()) as {reason: string}).reason, /Return your work tag/);
const tokens = save.tokens; ok(checkout, 'shift.checkout');
assert.equal(save.tokens, tokens + 3, 'wages paid once at the checkout'); assert.equal(save.items['shift.tag'] ?? 0, 0, 'tag returned');
assert.equal(checkout.dispatch('shift.checkout', 'interaction').ok, false, 'no second checkout');
assert.equal(barrierAccess(turnstile, save.flags, save.keyring, port.read()).ok, true, 'at dawn, tag returned, it opens');
ok(checkout, 'shift.statement'); assert.equal(S['harbor-checkout'].storyMinute!(save.flags, checkout.state()), 370, 'dawn (06:10)');
assert.equal(shed.state().values!.shift.statementRead, true, 'the shed reads the statement read at the checkout');
// the optional coffee machine: a small bonus, once
const before = save.tokens; ok(shed, 'shift.fix-coffee'); assert.equal(save.tokens, before + 1); assert.equal(shed.dispatch('shift.fix-coffee', 'interaction').ok, false);
assert.equal(use('harbor-shed', 'coffee').h, 100, 'the coffee machine answers in the staff room, upstairs');
assert.deepEqual(Object.keys(save.gameplay!).filter(k => k.startsWith('harbor-') || k === 'shift'), ['shift'], 'one shared block, no per-zone copy');
for (const s of [shed, yard, checkout]) s.dispose();
// walk back out through the turnstile at dawn, in the merged level
{
  active = 'harbor-checkout'; const q: LevelPlayer = {x: 400, y: 0, vy: 0, face: -1, onGround: true, moving: false}; Object.assign(p, q);
  const source = build(active); L = {source, state: levelArrive(source, p, 0)};
  walk(-1, 200); assert.ok(p.x > 302, 'the turnstile stands in the way west');
  assert.deepEqual(ask('barrier:harbor-checkout/turnstile'), {ok: true}, 'and opens for the checked-out worker'); walk(-1, 600); assert.equal(active, 'harbor-quay', 'out onto the public quay');
}

// 4 · the M2 prototype is untouched: its own scene, its flags, its profile
const m2 = S.harborShift; assert.ok(m2, '?play=harborShift scene'); assert.equal(m2.gameplay!.sharedState, undefined); assert.ok(m2.gameplay!.flags.includes('shift:assigned'));
const profiles = JSON.parse(fs.readFileSync('src/ssg/game/runtime/play-profiles.json', 'utf8')).profiles as {id: string; start: {scene?: string}}[];
assert.equal(profiles.find(p => p.id === 'harborShift')!.start.scene, 'harborShift'); assert.equal(profiles.find(p => p.id === 'harborZones')!.start.scene, 'harbor-station');
console.log('Harbor zones PASS: five zones validate and join (worldProblems clean); one merged level walks platform → lift/stair → quay → checkout turnstile (in at dusk, shut behind, refused mid-shift, open at dawn) → yard → shed staff room; the shift runs on one shared shift.* block across shed, yard and checkout; harborShift keeps its own flags.');
process.exit(0);
