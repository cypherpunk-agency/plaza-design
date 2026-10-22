/**
 * Touch reaches every level action through the one touch bar (ui/touch-controls.ts), which presses the keys a
 * keyboard does into the game's own handlers (runtime/game.ts onKeyDown/onKeyUp): ▲ ▼ are ↑ and ↓. A tap at a
 * flight's foot steps onto it; holding ▲ on a ladder keeps ArrowUp held and climbs, letting go (or the page
 * losing focus) stops; in the lift car ▲ ▼ pick the panel's floor; ACT (E) reaches a barrier. ▲ ▼ show only
 * while they do something (game.ts syncLevelArrows over engine/level.ts levelArrows); outside a level scene the
 * bar is as before. Driven with a small fake DOM, the real touch buttons and the game's real key handlers.
 */
import assert from 'node:assert/strict';
import {compileLevel, levelArrive, levelArrows, levelClimbing, levelFloor, levelHints, levelInteract, levelOpened, levelRiding, levelStep, levelBounds, type Level, type LevelPlayer, type MoverModel, type Movers} from '../../src/ssg/game/engine/level';
import type {Resolved} from '../../src/ssg/game/art/core/composition';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

// ---------- a fake DOM: just what the touch bar and the game's page classes use ----------
class ClassList {
  set = new Set<string>();
  add(...c: string[]) { c.forEach(x => this.set.add(x)); }
  remove(...c: string[]) { c.forEach(x => this.set.delete(x)); }
  contains(c: string) { return this.set.has(c); }
  toggle(c: string, on?: boolean) { const v = on ?? !this.set.has(c); if (v) this.set.add(c); else this.set.delete(c); return v; }
}
class El {
  children: El[] = []; parent: El | null = null; classList = new ClassList(); dataset: Record<string, string> = {}; attrs: Record<string, string> = {};
  listeners = new Map<string, ((e: any) => void)[]>(); id = '';
  constructor(public tagName: string) {}
  appendChild(e: El) { e.parent = this; this.children.push(e); return e; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  addEventListener(k: string, f: (e: any) => void) { this.listeners.set(k, [...(this.listeners.get(k) ?? []), f]); }
  fire(k: string) { let prevented = false; for (const f of this.listeners.get(k) ?? []) f({preventDefault() { prevented = true; }}); return prevented; }
  set innerHTML(html: string) {
    this.children = []; const stack: El[] = [this];
    for (const m of html.matchAll(/<(\/?)(div|button)([^>]*)>/g)) {
      if (m[1]) { stack.pop(); continue; }
      const el = new El(m[2]);
      for (const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)) {
        el.attrs[a[1]] = a[2];
        if (a[1] === 'class') el.classList.add(...a[2].split(/\s+/).filter(Boolean));
        if (a[1].startsWith('data-')) el.dataset[a[1].slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = a[2];
      }
      stack[stack.length - 1].appendChild(el); stack.push(el);
    }
  }
  all(): El[] { return this.children.flatMap(c => [c, ...c.all()]); }
  matches(sel: string) {
    return sel.split(',').some(one => {
      const s = one.trim(), tag = s.match(/^[a-z]+/)?.[0];
      if (tag && tag !== this.tagName) return false;
      for (const c of s.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(c[1])) return false;
      for (const a of s.matchAll(/\[([\w-]+)="([^"]*)"\]/g)) if (this.attrs[a[1]] !== a[2]) return false;
      return true;
    });
  }
  querySelectorAll<T = El>(sel: string): T[] { return this.all().filter(e => e.matches(sel)) as T[]; }
}
class FakeKeyboardEvent extends Event { key: string; repeat = false; constructor(type: string, init: {key: string}) { super(type, {cancelable: true}); this.key = init.key; } }
const win = new EventTarget(), docListeners = new EventTarget(), html = new ClassList(), body = new El('body');
const original = {window: globalThis.window, document: globalThis.document, KeyboardEvent: globalThis.KeyboardEvent};
(globalThis as any).window = win;
(globalThis as any).KeyboardEvent = FakeKeyboardEvent;
(globalThis as any).document = {createElement: (t: string) => new El(t), body, documentElement: {classList: html}, hidden: false,
  addEventListener: (k: string, f: any) => docListeners.addEventListener(k, f)};

try {
  const {touchControls} = await import('../../src/ssg/game/ui/touch-controls');
  const {Game} = await import('../../src/ssg/game/runtime/game');
  const host = new El('div');
  touchControls(host as unknown as HTMLElement);
  const bar = host.children[0];
  const button = (key: string) => bar.querySelectorAll(`button[data-key="${key}"]`)[0];
  const up = button('ArrowUp'), down = button('ArrowDown'), act = button('e'), jmp = button(' ');
  assert.ok(up && down && act && jmp, 'the bar has ▲ ▼ beside ◀ ▶, and ACT and JMP stay');
  assert.ok(up.parent === button('ArrowLeft').parent, '▲ ▼ sit in the walking pad');
  assert.ok(up.classList.contains('level-only') && down.classList.contains('level-only'), '▲ ▼ are hidden outside a level (render.tsx .level-only)');

  // ---------- the game: its real key handlers and page sync, over a stand-in for the rest ----------
  const still: MoverModel = {now: () => 0, movers: {stopPositions: () => undefined, position: () => undefined, moving: () => false, target: () => undefined, trip: () => undefined}, moveTo() {}};
  const reacts: string[] = [];
  function game(level: Level | null, p: LevelPlayer, movers: Movers = still) {
    const g: any = Object.create(Game.prototype);
    // own properties shadow the game's getters (zh, def, ...) with the stand-ins
    const stand = (o: Record<string, unknown>) => { for (const [k, v] of Object.entries(o)) Object.defineProperty(g, k, {value: v, writable: true, configurable: true}); };
    stand({
      touch: true, level, p, movers, keys: new Set<string>(), bubble: null, showEnd: false, opening: null, cut: null, flight: null, hop: null, beat: null, sleep: null,
      mapView: null, netView: null, transport: undefined, menu: {open: false}, term: {focused: false, isOpen: false},
      hostOf: () => zh,
    });
    const zh = {overlayOpen: false, acknowledgmentPending: false, popupOpen: false, hackable: false, visionOn: false, targets: () => [], model: {}, react: (id: string, line: string[]) => reacts.push(id + ' ' + line[1])};
    stand({
      save: {jump: true, flags: {}, keyring: [] as string[]}, hints: {done() {}}, def: {uses: [], exits: []}, platforms: [], story: 'free', here: 'fixture', arrowsKey: '',
      exitTargets: () => [], lifeTargets: () => [], sceneDefinition: () => ({}), gameplayStatePort: () => ({read: () => ({})}), persistSave() {}, companionPresent: false,
    });
    g.onKeyDown = g.onKeyDown.bind(g); g.onKeyUp = g.onKeyUp.bind(g);
    win.addEventListener('keydown', g.onKeyDown); win.addEventListener('keyup', g.onKeyUp);
    /** One frame the way the game's update runs the level: ↑/↓ held climb; then the page's ▲ ▼ classes. */
    const frame = (n = 1, walk = 0) => {
      for (let i = 0; i < n; i++) {
        if (level) {
          const climb = (g.keys.has('ArrowUp') ? 1 : 0) - (g.keys.has('ArrowDown') ? 1 : 0);
          if (movers !== still) { (movers as SceneModel).player = {x: p.x, h: p.y}; (movers as SceneModel).tick(1000 / 60, true); }
          if (!levelStep(level, p, walk, 1, movers, climb) && walk) { const [a, b] = levelBounds(level, 2000, p.x); p.x = Math.max(a, Math.min(b, p.x + walk * 1.3)); }
        }
        g.syncLevelArrows();
      }
    };
    const dispose = () => { win.removeEventListener('keydown', g.onKeyDown); win.removeEventListener('keyup', g.onKeyUp); };
    return {g, frame, dispose};
  }
  const press = (b: El) => b.fire('pointerdown'), release = (b: El) => b.fire('pointerup');
  const tap = (b: El) => { press(b); release(b); };
  const shown = (dir: 'up' | 'down') => html.contains('level-scene') && html.contains('level-' + dir);

  const row = (type: string, id: string, x: number, h: number, props: Record<string, unknown>) =>
    ({element: {type}, instance: {id}, placement: {x, h, scale: 1, facing: 1}, props}) as unknown as Resolved;
  const src = compileLevel([
    row('level.floor', 'street', 0, 0, {width: 600}),
    row('level.floor', 'deck', 0, 60, {width: 600}),
    row('level.stairs', 'flight', 100, 0, {run: 40, rise: 60, style: 'timber'}),
    row('level.stairs', 'ladder', 300, 0, {run: 0, rise: 60, style: 'steel-ladder'}),
    row('level.barrier', 'gate', 480, 0, {style: 'turnstile', width: 24, key: 'pass', refuse: 'CARD NOT VALID'}),
  ])!;
  const player = (x: number, y = 0): LevelPlayer => ({x, y, vy: 0, face: 1, onGround: true, moving: false});

  // a tap of ▲ at the foot of a flight steps onto it, and nothing is left held
  {
    const p = player(100), L: Level = {source: src, state: levelArrive(src, p, 0)}, {g, frame, dispose} = game(L, p);
    frame();
    assert.ok(html.contains('level-scene') && shown('up') && !shown('down'), 'at the flight\'s foot ▲ shows, ▼ does not');
    tap(up);
    assert.ok(levelRiding(L) && !levelClimbing(L), 'tap ▲: on the flight');
    assert.ok(!g.keys.has('ArrowUp') && p.vy === 0, 'one press, nothing held, no jump');
    frame();
    assert.ok(shown('up') && shown('down'), 'a straight flight is walked with ◀ ▶ or with ▲ ▼ held: both show');
    frame(200, 1);
    assert.ok(!levelRiding(L) && levelFloor(L).id === 'deck', 'walked up to the deck');
    frame();
    assert.ok(shown('down') && !shown('up'), 'at the flight\'s top ▼ shows');
    tap(down); assert.ok(levelRiding(L), 'tap ▼ steps onto it going down');
    dispose();
  }
  // the ladder: holding ▲ climbs, letting go stops on the rungs; the page losing focus lets go too
  {
    const p = player(300), L: Level = {source: src, state: levelArrive(src, p, 0)}, {g, frame, dispose} = game(L, p);
    frame(); assert.ok(shown('up'), '▲ at the ladder\'s foot');
    press(up);
    assert.ok(levelClimbing(L) && g.keys.has('ArrowUp'), 'press ▲: on the ladder, ↑ held');
    frame(20); const mid = p.y;
    assert.ok(mid > 0 && mid < 60, 'holding ▲ climbs (h ' + mid + ')');
    assert.ok(shown('up') && shown('down'), 'climbing, ▲ and ▼ both show');
    release(up); assert.ok(!g.keys.has('ArrowUp'), 'let go: ↑ is released');
    frame(20); assert.equal(p.y, mid, 'let go: you hang on the rungs');
    press(down); frame(5); assert.ok(p.y < mid, 'holding ▼ climbs down');
    win.dispatchEvent(new Event('blur'));
    assert.ok(!g.keys.has('ArrowDown') && !down.classList.contains('down'), 'the page losing focus lets go of a held ▼');
    const after = p.y; frame(10); assert.equal(p.y, after, 'nothing sticks');
    press(up); frame(200); release(up);
    assert.ok(!levelRiding(L) && levelFloor(L).id === 'deck', 'held to the top: out on the deck');
    press(down); assert.ok(levelClimbing(L) && g.keys.has('ArrowDown'), 'from the top, ▼ gets back on the ladder');
    down.fire('pointercancel'); assert.ok(!g.keys.has('ArrowDown'), 'a cancelled touch lets go too');
    dispose();
  }
  // ACT is E: it reaches the barrier, which refuses, then lets the player through with the key
  {
    const p = player(460), L: Level = {source: src, state: levelArrive(src, p, 0)}, {g, frame, dispose} = game(L, p);
    frame();
    assert.ok(levelHints(L, p, still).some(h => h.id === 'barrier:gate'), 'the barrier offers its prompt');
    assert.ok(!shown('up') && !shown('down'), 'nothing for ▲ ▼ at a barrier');
    reacts.length = 0; tap(act);
    assert.deepEqual(reacts, ['barrier:gate CARD NOT VALID'], 'ACT asks the barrier: refused with its words');
    g.save.keyring.push('pass'); tap(act);
    assert.deepEqual(levelOpened(L), ['gate'], 'with the key, ACT opens it');
    dispose();
  }
  // the lift in the Tower: ACT steps in, ▲ ▼ pick the panel's floor (and only where a floor is left), ACT sends it
  {
    const tower = (SCENES as Record<string, SceneDef>).tower, level = tower.level!;
    const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
    const lift = level.lifts[0], p = player(lift.x, -190), L: Level = {source: level, state: levelArrive(level, p, -190)}, {frame, dispose} = game(L, p, m);
    frame(30);
    assert.ok(levelHints(L, p, m).some(h => h.label.includes('STEP IN')), 'the car waits at the metro');
    tap(act); assert.ok(levelRiding(L), 'ACT steps in');
    frame();
    assert.ok(shown('up') && !shown('down'), 'in the car at the lowest stop: ▲ shows, ▼ does not');
    const pick = () => (L.state.ride as {pick: number}).pick;
    tap(up); tap(up); assert.equal(pick(), 2, '▲ picks the next floor up, once per tap');
    frame(); assert.ok(shown('down'), 'with a floor below chosen, ▼ shows');
    tap(down); assert.equal(pick(), 1, '▼ picks one down');
    assert.equal(p.y, -190, 'picking does not move the car');
    tap(act); frame(900);
    assert.equal(levelFloor(L).id, level.lifts[0].stops[1].floor, 'ACT sends the car to the chosen floor');
    for (let i = 0; i < lift.stops.length; i++) tap(up);
    frame(); assert.ok(!shown('up') && shown('down'), 'at the top of the panel ▲ steps aside');
    dispose();
  }
  // no level: the bar is as it was; ▲ is ↑, which jumps like the keyboard, and JMP stays
  {
    const p = player(100), {g, frame, dispose} = game(null, p);
    frame();
    assert.ok(!html.contains('level-scene') && !html.contains('level-up') && !html.contains('level-down'), 'outside a level, ▲ ▼ are not drawn');
    tap(jmp); assert.ok(p.vy > 0, 'JMP jumps');
    p.vy = 0; p.onGround = true; tap(up); assert.ok(p.vy > 0, '↑ (▲) jumps where there is no level action, as the key does');
    assert.ok(!g.keys.has(' ') && !g.keys.has('ArrowUp'), 'released, nothing held');
    dispose();
  }
  assert.ok(levelArrows({source: src, state: levelArrive(src, player(200), 0)}, player(200)).up === false, 'away from everything ↑ has no level action');
  console.log('Touch level controls PASS: ▲ ▼ in the walking pad press ↑/↓ into the game\'s own key handlers (tap steps onto a flight, hold climbs a ladder, released on let-go, cancel and blur, lift panel picks), shown only while they act; ACT reaches barriers and the lift; non-level scenes unchanged.');
} finally {
  Object.assign(globalThis, original);
}
