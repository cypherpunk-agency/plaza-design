import * as SceneLifecycle from '../../src/ssg/game/runtime/scene-lifecycle';
import * as InteractionRouting from '../../src/ssg/game/runtime/interaction-routing';
import {runtimeFixture} from './runtime-fixture.mts';
/**
 * Unloading joined zones (SEAMLESS-WORLD.md §3 "Residency" and "Unloaded zones are reloaded"): the extracted SceneLifecycle policy with Game's current state/services
 * including departure disposal and visibility, running `followResidency` over the lab chain (tower, tower-annex, tower-deck) and four more lab zones walked on to the right.
 * Walking away unloads a far zone: its SceneHost persists, then is disposed (its nodes leave the page, its window
 * listeners, resize observers and save timer go, it is not in `hosts`, its session is dropped); what it saved (a lift
 * stop, a barrier opened) comes back on return, rebuilt from the save; a delayed action in flight is dropped. The active
 * zone is never unloaded, a zone coming into reach is compiled one per frame, and departing hosts
 * outside the joined level are disposed, including unjoined scenes and their open popups.
 */
import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {SCENES} from '../../src/ssg/game/scenes';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {levelArrive, levelOpened, savedForLevel} from '../../src/ssg/game/engine/level';
import {validateZoneGraph} from '../../src/ssg/game/world/zone-graph';
import shipped from '../../src/ssg/game/world/zone-graph.json';
import {city} from '../../src/ssg/game/world/clock';

// ---------- a small DOM: enough for a SceneHost to build its nodes, with listeners, timers and observers counted ----------
class Node_ {
  children: Node_[] = []; parentElement: Node_ | null = null; hidden = false; disabled = false; id = ''; className = ''; type = ''; title = ''; tabIndex = 0;
  dataset: Record<string, string> = {}; style: Record<string, unknown> = {setProperty() {}}; private text = ''; listeners = 0;
  constructor(readonly tag = 'div') {}
  get textContent() { return this.text; } set textContent(v: string) { this.text = v; for (const c of this.children) c.parentElement = null; this.children = []; }
  get isConnected() { let n: Node_ | null = this; while (n) { if (n === root) return true; n = n.parentElement; } return false; }
  get firstElementChild() { return this.children[0] ?? null; } get lastElementChild() { return this.children[this.children.length - 1] ?? null; }
  get childElementCount() { return this.children.length; } get offsetParent() { return null; } get offsetHeight() { return 20; } get offsetWidth() { return 80; }
  clientWidth = 960; clientHeight = 540;
  classList = {add() {}, remove() {}, toggle() {}, contains: () => false};
  appendChild(c: Node_) { c.remove(); this.children.push(c); c.parentElement = this; return c; }
  append(...c: (Node_ | string)[]) { for (const n of c) if (typeof n !== 'string') this.appendChild(n); }
  prepend(...c: Node_[]) { for (const n of c.reverse()) { n.remove(); this.children.unshift(n); n.parentElement = this; } }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(c => c !== this); this.parentElement = null; }
  contains(n: unknown) { return n === this || this.children.some(c => c.contains(n)); }
  closest() { return null; }
  setAttribute() {} removeAttribute() {} toggleAttribute() {} getAttribute() { return null; }
  addEventListener() { this.listeners++; } removeEventListener() { this.listeners--; }
  querySelector() { return null; } querySelectorAll() { return []; }
  getBoundingClientRect() { return {left: 0, top: 0, right: 960, bottom: 540, width: 960, height: 540}; }
  focus() {}
}
const root = new Node_('window');
const descendants = (n: Node_): Node_[] => n.children.flatMap(c => [c, ...descendants(c)]);
const windowListeners = new Map<string, Set<unknown>>(), timers = new Map<number, () => void>();
let serial = 0, observing = 0;
const globals = ['document', 'window', 'ResizeObserver', 'setTimeout', 'clearTimeout', 'localStorage', 'sessionStorage', 'location'];
const before = new Map(globals.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
const define = (k: string, value: unknown) => Object.defineProperty(globalThis, k, {configurable: true, writable: true, value});
const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k)}; };
const setT = (run: () => void) => { const id = ++serial; timers.set(id, run); return id; }, clearT = (id: number) => void timers.delete(id);
define('document', {createElement: (t: string) => new Node_(t), createElementNS: (_: string, t: string) => new Node_(t), createTextNode: () => new Node_('#text'), documentElement: {classList: {add() {}, remove() {}, contains: () => false}}, hidden: false});
define('window', {addEventListener: (k: string, fn: unknown) => { if (!windowListeners.has(k)) windowListeners.set(k, new Set()); windowListeners.get(k)!.add(fn); }, removeEventListener: (k: string, fn: unknown) => void windowListeners.get(k)?.delete(fn), setTimeout: setT, clearTimeout: clearT, setInterval: () => 0});
define('ResizeObserver', class { observe() { observing++; } disconnect() { observing--; } });
define('setTimeout', setT); define('clearTimeout', clearT);
define('localStorage', memory()); define('sessionStorage', memory()); define('location', {search: '', reload() {}});
const listening = () => [...windowListeners.values()].reduce((n, s) => n + s.size, 0);

try {
  // ---------- the world: the lab chain, and four more lab zones (copies of the annex, 800 wide) walked on to the right ----------
  const more = ['lab-c', 'lab-d', 'lab-e', 'lab-f'];
  const annex = SCENES['tower-annex' as keyof typeof SCENES];
  const content: Record<string, unknown> = {...SCENES, ...Object.fromEntries(more.map(id => [id, {...annex, id, name: id}]))};
  const zoneGraph = validateZoneGraph({version: 1, seams: [...shipped.seams, ...more.map((b, i) => ({id: 'lab-' + i, kind: 'walk', a: {zone: i ? more[i - 1] : 'tower-annex'}, b: {zone: b}, dx: 800, dh: 0}))]});
  const unjoined = 'shop';
  assert(!zoneGraph.seams.some(s => s.a.zone === unjoined || s.b.zone === unjoined), 'the unjoined scene has no seams');

  const save = newSave(); city.bind(save.clock);
  const game: any = runtimeFixture(Game);
  Object.assign(game, {save,content,sources: {zoneGraph},botReactions: BOT_REACTIONS,host: {windowEl: root},keyBar: {adopt() {}},term: {print() {}, isOpen: false},hints: {notify() {}, notices: {time: 0}, boardHint: () => null, sceneChanged() {}},menu: {open: false},p: {x: 0, y: 0, vy: 0, face: 1, onGround: true, moving: false},syncHud() {},nudgeTo() {},canvas: {focus() {}},companionBody: {x: 0, h: 0},scenes:Object.assign(game.scenes,{compiledScenes: new Map(),hosts: new Map(),gameplaySessions: new Map(),joinedZones: [],zoneTiers: new Map()}),camera:Object.assign(game.camera,{viewW: 640}),timing:Object.assign(game.timing,{t: 0})});
  Object.defineProperty(game, 'enginesPaused', {value: false});
  const hosted = () => [...game.scenes.hosts.keys()].sort();
  // stand in a zone with the camera at `cam` (its own units), as a cut into it does: hosted, and the level joined around it
  const standIn = (id: string, cam: number) => {
    game.scenes.here = id; game.hostOf(id); game.camera.cam = cam; game.p.x = cam + 200;
    const source = SceneLifecycle.joinLevel(game.sceneLifecyclePort,id, cam);
    game.scenes.level = {source, state: levelArrive(source, game.p, 0, [], savedForLevel(source, id, game.save.barriers))};
  };
  // The same lifecycle owner applies residency, departure disposal and visibility.
  const frame = (n = 1) => { for (let i = 0; i < n; i++) { SceneLifecycle.followResidency(game.sceneLifecyclePort); game.scenes.hosts.forEach((h: any) => h.tick(16)); } };

  // the unjoined scene, visited first: it is hosted and stays hosted wherever the player goes
  const quiet = {nodes: descendants(root).length, listeners: listening(), observers: observing};
  game.hostOf(unjoined);
  const shop = game.scenes.hosts.get(unjoined);

  // ---------- the tower, left end: the annex and the deck are near (960 off), compiled one per frame ----------
  standIn('tower', 0);
  const tower = game.scenes.hosts.get('tower');
  assert.deepEqual(hosted(), [unjoined, 'tower'].sort(), 'near zones are not compiled on the cut itself');
  frame(); assert.deepEqual(hosted(), ['tower', 'tower-annex'].sort(), 'one zone compiled this frame');
  frame(); assert.deepEqual(hosted(), ['tower', 'tower-annex', 'tower-deck'].sort(), 'and the next one the frame after');
  frame(3); assert.equal(game.scenes.hosts.has('lab-c'), false, 'a zone past the prefetch distance is not hosted');

  // persistent state in the tower: the lift goes to the first basement and settles; then a delayed action is in flight
  const m = tower.model;
  assert.equal(m.moveTo('lift', 'car', 'b1'), 'started');
  for (let i = 0; i < 400 && m.movers.moving('lift.car'); i++) frame();
  assert.equal(m.movers.moving('lift.car'), false, 'the lift arrived');
  const towerSaved = JSON.stringify(tower.snapshot());
  let fired = 0, canceled = 0;
  m.later(4000, () => fired++, {kind: 'review'}, () => canceled++);
  m.changed(); // the save timer is armed (the host writes a moment after things settle)
  assert(timers.size > 0, 'the save timer is pending');
  const towerSession = game.scenes.gameplaySessions.get('tower');
  assert(towerSession && tower.gameplay === towerSession, 'the cached session is the one bound to the tower model');
  const towerOwn = descendants(root).filter(n => { let p: Node_ | null = n; while (p && p.parentElement !== root) p = p.parentElement; return p && [(tower as any).schem.root, (tower as any).vision.root, (tower as any).popup.layer, (tower as any).fx.layer, (tower as any).panels.root, (tower as any).btns].includes(p); });
  assert(towerOwn.length > 10, 'the tower host built its nodes on the page');

  // a barrier in the annex is opened from the tower side of the level, and kept on the save by scene
  const barrier = game.scenes.level.source.barriers.find((b: any) => b.zone === 'tower-annex' || b.id.startsWith('tower-annex/'));
  assert(barrier, 'the annex barrier is in the joined level');
  game.scenes.here = 'tower'; assert(InteractionRouting.passBarrier(game.interactionRoutingPort,'barrier:' + barrier.id, true));
  const barriers = structuredClone(game.save.barriers);
  assert.deepEqual(Object.keys(barriers), ['tower-annex'], 'saved by the zone it is in');

  // ---------- walk away: to lab-f, the far end. The tower (2400 off) and the annex are past three view widths ----------
  standIn('lab-f', 0); frame(6);
  assert.equal(game.scenes.hosts.has('tower'), false, 'the tower is unloaded');
  assert.equal(game.scenes.hosts.has('tower-annex'), false); assert.equal(game.scenes.hosts.has('tower-deck'), false);
  assert(tower.isDisposed, 'its host is disposed');
  assert.equal(JSON.stringify(game.save.scenes.tower), towerSaved, 'it was persisted first: the save holds its last state');
  assert(towerOwn.every(n => !n.isConnected), 'every node the tower host made has left the page');
  assert.equal(game.scenes.gameplaySessions.has('tower') && game.scenes.gameplaySessions.get('tower') === towerSession, false, 'the session bound to its model is dropped');
  assert.equal(towerSession.dispatch('nothing', 'system').ok, false, 'and disposed');
  assert(!game.scenes.hosts.has(unjoined),'departed unjoined host unloads');assert(shop.isDisposed);
  assert(game.scenes.hosts.has('lab-f'), 'the active zone is hosted');
  // ticking on: the tower's delayed action never runs; a stale reference neither ticks nor writes
  tower.tick(10000); m.tick(10000); frame(10);
  assert.equal(fired, 0, 'the delayed action in flight was dropped'); assert.equal(canceled, 1, 'its cancellation observer heard of it once');
  const written = JSON.stringify(game.save.scenes.tower); m.moveTo('lift', 'car', 'lobby'); tower.persist();
  assert.equal(JSON.stringify(game.save.scenes.tower), written, 'a disposed host never writes the save again');

  // ---------- hold a zone: a popup open in lab-d; walking back to the tower would unload it, but it is held ----------
  frame(3); assert(game.scenes.hosts.has('lab-d') && game.scenes.hosts.has('lab-e'), 'lab-e is visible and lab-d near from lab-f'); assert.equal(game.scenes.hosts.has('lab-c'), false, 'lab-c, 1600 off, is past the prefetch distance');
  const labD = game.scenes.hosts.get('lab-d');
  labD.choose('review', 'REVIEW', [{label: 'wait', run() {}}], {x: 100, y: 0, w: 40, h: 20});
  assert(labD.popupOpen);
  standIn('tower', 0); frame(4);

  // ---------- back in the tower: rebuilt from the save, as Continue does ----------
  const again = game.scenes.hosts.get('tower');
  assert(again && again !== tower, 'the tower is hosted again: a new host');
  assert.equal(JSON.stringify(again.snapshot()), towerSaved, 'the lift is at the stop it was saved at, the rest as saved');
  assert.equal(again.model.movers.position('lift.car'), m.movers.stopPositions('lift.car')!.b1, 'the lift car stands at b1');
  assert.equal(again.model.inspect().time.pending.length, 0, 'nothing in flight came back');
  frame(300); assert.equal(fired, 0, 'and the dropped action never runs');
  const session = game.scenes.gameplaySessions.get('tower');
  assert(session && session !== towerSession && again.gameplay === session, 'a fresh session, bound to the new model');
  frame(2);
  assert(game.scenes.hosts.has('tower-annex'), 'the annex comes back near');
  assert.deepEqual(levelOpened(game.scenes.level), [barrier.id], 'the barrier is still open in the level');
  assert.deepEqual(game.save.barriers, barriers);
  assert(!game.scenes.hosts.has('lab-d'),'a popup outside the joined level does not keep a departed host');assert(labD.isDisposed);
  assert.equal(game.scenes.hosts.has('lab-f'), false, 'lab-f, 4000 off, is unloaded'); assert.equal(game.scenes.hosts.has('lab-e'), false);
  assert(!game.scenes.hosts.has(unjoined),'departed unjoined host unloads');assert(shop.isDisposed);
  labD.closeAll(); frame();
  assert.equal(game.scenes.hosts.has('lab-d'), false, 'closed, it unloads on the next frame');
  assert(labD.isDisposed);

  // the active zone is never unloaded, even with no camera near it (residency always holds it)
  game.camera.cam = -100000; frame(3); assert.equal(game.scenes.hosts.get('tower'), again, 'the active zone stays');

  // disposal is idempotent and leaves nothing of its own behind
  tower.dispose(); labD.dispose();
  for (const id of [...game.scenes.hosts.keys()]) if (id !== unjoined) SceneLifecycle.unload(game.sceneLifecyclePort,id);
  shop.dispose(); game.scenes.hosts.delete(unjoined);
  assert.equal(descendants(root).length, quiet.nodes, 'every host\'s nodes are off the page');
  assert.equal(listening(), quiet.listeners, 'no window listener is left');
  assert.equal(observing, quiet.observers, 'no resize observer is left');
  assert.equal(timers.size, 0, 'no save timer is left');
  console.log('Zone unload PASS: walking away unloads far joined zones (host disposed: nodes, listeners, observers, save timer, session); a lift stop and an opened barrier come back from the save; a delayed action in flight is dropped; the active zone and a zone with a popup open stay; near zones compile one per frame; an unjoined scene stays hosted.');
} finally { for (const [k, d] of before) { if (d) Object.defineProperty(globalThis, k, d); else delete (globalThis as any)[k]; } }
