/**
 * In a lift car the floors are a list menu beside the car (engine/popup.ts placement 'list', opened through the scene
 * host's `list` from runtime/game.ts syncCarList), not a floating "[↑↓] FLOOR" prompt. The list only reflects and sets
 * the panel's one state, `ride.pick` (engine/level.ts levelLiftList / levelPick): ↑ ↓ (and touch ▲ ▼) move it exactly as
 * levelUp/levelDown do, E / Enter / ACT or a click on a row sends the car through levelInteract, Esc closes it (the
 * old prompt is the fallback until the panel's keys are used again), stepping out closes it. Placement: beside the
 * shaft at the car's height on the side with room, inside the view; on a landscape phone above the touch bar and clear
 * of the walk arrows and the action buttons. Driven with a small fake DOM, the real Popup, the real SceneHost list
 * methods and the game's real key handlers over the Tower lab's lift.
 */
import assert from 'node:assert/strict';
import {levelArrive, levelBounds, levelFloor, levelHints, levelRiding, levelStep, type Level, type LevelPlayer} from '../../src/ssg/game/engine/level';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {SceneModel} from '../../src/ssg/game/engine/model';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';

// ---------- a fake DOM: what the Popup, the touch bar and the game's page classes use ----------
class ClassList {
  constructor(private el: El) {}
  private names() { return this.el.className.split(/\s+/).filter(Boolean); }
  contains(c: string) { return this.names().includes(c); }
  add(...c: string[]) { this.el.className = [...new Set([...this.names(), ...c])].join(' '); }
  remove(...c: string[]) { this.el.className = this.names().filter(x => !c.includes(x)).join(' '); }
  toggle(c: string, on?: boolean) { const v = on ?? !this.contains(c); if (v) this.add(c); else this.remove(c); return v; }
}
type Rect = {left: number; top: number; right: number; bottom: number; width: number; height: number};
class El {
  children: El[] = []; parent: El | null = null; className = ''; attrs: Record<string, string> = {}; style: Record<string, string> = {}; hidden = false;
  listeners = new Map<string, ((e: any) => void)[]>(); text = ''; type = ''; tabIndex = 0; clientWidth = 0; clientHeight = 0; rect: Rect | null = null; visible = true; dataset: Record<string, string> = {};
  id = ''; classList = new ClassList(this);
  constructor(public tagName: string) {}
  get textContent(): string { return this.text + this.children.map(c => c.textContent).join(''); }
  set textContent(v: string) { this.children.forEach(c => { c.parent = null; }); this.children = []; this.text = v; }
  set innerHTML(html: string) {
    this.children = []; const stack: El[] = [this];
    for (const m of html.matchAll(/<(\/?)(div|button)([^>]*)>/g)) {
      if (m[1]) { stack.pop(); continue; }
      const el = new El(m[2]);
      for (const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)) {
        el.attrs[a[1]] = a[2];
        if (a[1] === 'class') el.className = a[2];
        if (a[1].startsWith('data-')) el.dataset[a[1].slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = a[2];
      }
      stack[stack.length - 1].appendChild(el); stack.push(el);
    }
  }
  get childElementCount() { return this.children.length; }
  get lastElementChild() { return this.children[this.children.length - 1] ?? null; }
  get offsetParent() { return this.visible ? {} : null; }
  append(...es: El[]) { es.forEach(e => this.appendChild(e)); }
  appendChild(e: El) { e.parent?.removeChild(e); e.parent = this; this.children.push(e); return e; }
  removeChild(e: El) { this.children = this.children.filter(c => c !== e); e.parent = null; }
  remove() { this.parent?.removeChild(this); }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  getAttribute(k: string) { return this.attrs[k]; }
  addEventListener(k: string, f: (e: any) => void) { this.listeners.set(k, [...(this.listeners.get(k) ?? []), f]); }
  fire(k: string, extra: object = {}) { let prevented = false; for (const f of this.listeners.get(k) ?? []) f({preventDefault() { prevented = true; }, stopPropagation() {}, target: this, ...extra}); return prevented; }
  contains(o: El | null): boolean { return !!o && (o === this || this.children.some(c => c.contains(o))); }
  closest(sel: string): El | null { for (let e: El | null = this; e; e = e.parent) if (sel.startsWith('#') ? (e.attrs.id ?? e.id) === sel.slice(1) : e.classList.contains(sel.slice(1))) return e; return null; }
  all(): El[] { return this.children.flatMap(c => [c, ...c.all()]); }
  matches(sel: string) {
    return sel.split(',').some(one => {
      const t = one.trim(), tag = t.match(/^[a-z]+/)?.[0];
      if (tag && tag !== this.tagName) return false;
      for (const c of t.matchAll(/\.([\w-]+)/g)) if (!this.has(c[1])) return false;
      for (const a of t.matchAll(/\[([\w-]+)="([^"]*)"\]/g)) if ((a[1].startsWith('data-') ? this.dataset[a[1].slice(5)] : this.attrs[a[1]]) !== a[2]) return false;
      return true;
    });
  }
  querySelectorAll(sel: string): El[] { return this.all().filter(e => e.matches(sel)); }
  has(c: string) { return this.classList.contains(c); }
  scrollIntoView() {}
  getBoundingClientRect(): Rect { return this.rect ?? {left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight}; }
  // the sizes the stylesheet would give: rows 24 px (44 px on touch), a title 18, the box 190 px wide
  get offsetWidth() { return this.has('thing-pop') ? 190 : this.has('thing-title') ? 100 : 160; }
  get offsetHeight() {
    if (this.has('thing-pop')) { const list = this.children.find(c => c.has('thing-list')), all = (list?.children.length ?? 0) * (htmlClasses.contains('touch') ? 46 : 26); return 20 + Math.min(all, Number.parseFloat(list?.style.maxHeight ?? '') || Infinity) + 10; }
    return this.has('thing-title') ? 18 : htmlClasses.contains('touch') ? 44 : 24;
  }
}
class FakeKeyboardEvent extends Event { key: string; repeat = false; constructor(type: string, init: {key: string}) { super(type, {cancelable: true}); this.key = init.key; } }
const win = new EventTarget(), htmlEl = new El('html'), htmlClasses = htmlEl.classList, body = new El('body');
const original = {window: globalThis.window, document: globalThis.document, KeyboardEvent: globalThis.KeyboardEvent};
let touchBar: El | null = null;
(globalThis as any).window = win;
(globalThis as any).KeyboardEvent = FakeKeyboardEvent;
(globalThis as any).document = {
  createElement: (t: string) => new El(t), createElementNS: (_: string, t: string) => new El(t), createTextNode: (t: string) => { const e = new El('#text'); e.text = t; return e; },
  body, documentElement: {classList: htmlClasses}, hidden: false, addEventListener() {},
  getElementById: (id: string) => (id === 'touch' ? touchBar : null),
  querySelectorAll: (sel: string) => (sel === '#touch .pad' && touchBar ? touchBar.children : []),
};
/** A pointerdown on `target` reaching the window (the popup listens for a tap elsewhere there). */
const pointerDownOn = (target: El) => { const ev: any = new Event('pointerdown'); Object.defineProperty(ev, 'target', {value: target}); win.dispatchEvent(ev); };

try {
  const {Popup} = await import('../../src/ssg/game/engine/popup');
  const {SceneHost} = await import('../../src/ssg/game/engine/host');
  const {Game} = await import('../../src/ssg/game/runtime/game');
  const {touchControls} = await import('../../src/ssg/game/ui/touch-controls');

  const tower = (SCENES as Record<string, SceneDef>).tower, level = tower.level!, lift = level.lifts[0];
  const stops = lift.stops, top = [...stops].reverse();
  assert.ok(stops.length >= 4, 'the Tower lift has stops');
  const keyOf = (label: string) => (/\d/.test(label.split('·')[0]) ? label.split('·')[0].trim() : label[0]).toUpperCase();
  const nameOf = (label: string) => (label.includes('·') ? label.split('·')[1].trim() : label);

  type View = {W: number; H: number; top: number; bar?: number};
  /** The popup over a fake page: a view (CSS px), touch or not, and where the car stands on screen. */
  function setup(view: View, touch: boolean, carX: number) {
    htmlClasses.toggle('touch', touch);
    const layerHost = new El('div');
    // the touch bar: two pads along the bottom, the walk arrows left and the action buttons right
    touchBar = null;
    if (touch) {
      const bar = new El('div'); bar.attrs.id = 'touch'; bar.rect = {left: 0, top: view.H - view.bar!, right: view.W, bottom: view.H, width: view.W, height: view.bar!};
      const pad = (l: number, r: number) => { const p = new El('div'); p.className = 'pad'; p.rect = {left: l, top: view.H - view.bar! + 6, right: r, bottom: view.H - 4, width: r - l, height: view.bar! - 10}; bar.appendChild(p); };
      pad(10, 220); pad(view.W - 300, view.W - 10);
      touchBar = bar;
    }
    const popup = new Popup(layerHost as unknown as HTMLElement);
    const layer = layerHost.children[0]; layer.clientWidth = view.W; layer.clientHeight = view.H; layer.rect = {left: 0, top: 0, right: view.W, bottom: view.H, width: view.W, height: view.H};
    // the real SceneHost list methods over the real Popup; the world → screen mapping is linear
    const S = 1.6, gy = view.H - (touch ? view.bar! : 40) - 20, shift = carX - lift.x * S;
    const project = (wx: number, h: number) => ({x: wx * S + shift, y: gy - h * S});
    const shim: any = Object.create(SceneHost.prototype);
    Object.assign(shim, {popup, project, player: {x: lift.x, h: 0}, seen: new Map(), popupAt: lift.x, chosen: null, onClose: () => {}});
    popup.onClose = () => { shim.chosen = null; };
    shim.room = () => ({avoid: [], keepClear: [], top: view.top, lane: undefined});
    /** SceneHost.follow's part for the popup: the thing's box on screen, the popup placed, or closed if the thing left. */
    const follow = () => {
      shim.seen = new Map();
      const c = shim.chosen;
      if (c) { const a = project(c.x, c.y + c.h / 2), e = project(c.x + c.w / 2, c.y + c.h); shim.seen.set(c.id, {x: a.x, y: a.y, w: (e.x - a.x) * 2, h: (a.y - e.y) * 2}); }
      if (popup.isOpen) { const at = popup.dev ? shim.seen.get(popup.dev) : undefined; if (!at) popup.close(); else popup.place(at); }
    };
    shim.refollow = follow;
    return {popup, shim, follow, project, S};
  }

  function run(name: string, view: View, touch: boolean, carX: number) {
    const ui = setup(view, touch, carX), {popup, shim} = ui;
    const m = new SceneModel({say() {}, changed() {}, open() {}} as never, tower.data!, (tower.rules ?? {}) as never);
    const p: LevelPlayer = {x: lift.x, y: stops[0].h, vy: 0, face: 1, onGround: true, moving: false};
    const L: Level = {source: level, state: levelArrive(level, p, stops[0].h)};
    const g: any = Object.create(Game.prototype);
    const stand = (o: Record<string, unknown>) => { for (const [k, v] of Object.entries(o)) Object.defineProperty(g, k, {value: v, writable: true, configurable: true}); };
    const zh = {
      overlayOpen: false, acknowledgmentPending: false, hackable: false, visionOn: false, targets: () => [], model: {},
      get popupOpen() { return shim.popupOpen; }, popupKey: (e: KeyboardEvent) => shim.popupKey(e),
      list: (...a: unknown[]) => (shim.list as any)(...a), listOpen: (id: string) => shim.listOpen(id), closeList: (id: string) => shim.closeList(id),
    };
    stand({
      touch, level: L, p, movers: m, keys: new Set<string>(), bubble: null, showEnd: false, opening: null, cut: null, flight: null, hop: null, beat: null, sleep: null,
      mapView: null, netView: null, transport: undefined, menu: {open: false}, term: {focused: false, isOpen: false}, hostOf: () => zh,
      save: {jump: true, flags: {}, keyring: [] as string[]}, hints: {done() {}}, def: {uses: [], exits: []}, platforms: [], story: 'free', here: 'fixture', arrowsKey: '',
      exitTargets: () => [], lifeTargets: () => [], sceneDefinition: () => ({}), gameplayStatePort: () => ({read: () => ({})}), persistSave() {}, companionPresent: false, liftIds: new Set<string>(),
    });
    g.onKeyDown = g.onKeyDown.bind(g); g.onKeyUp = g.onKeyUp.bind(g);
    win.addEventListener('keydown', g.onKeyDown); win.addEventListener('keyup', g.onKeyUp);
    const key = (k: string) => { win.dispatchEvent(new FakeKeyboardEvent('keydown', {key: k})); win.dispatchEvent(new FakeKeyboardEvent('keyup', {key: k})); };
    /** One frame the way the game's loop runs it: the model, the level, then the page's arrows, the car's list and the popup following. */
    const frame = (n = 1) => {
      for (let i = 0; i < n; i++) {
        m.player = {x: p.x, h: p.y}; m.tick(1000 / 60, true);
        if (!levelStep(L, p, 0, 1, m, 0)) { const [a, b] = levelBounds(L, 2000, p.x); p.x = Math.max(a, Math.min(b, p.x)); }
        shim.player = {x: p.x, h: p.y};
        g.syncLevelArrows(); g.syncCarList(); ui.follow();
      }
    };
    const pick = () => L.state.vehicle!.panel!.pick;
    const rows = () => (popup as any).list.children as El[];
    const text = (r: El) => r.children.map(c => c.textContent);
    const box = () => { const b: El = (popup as any).box; return {l: Number.parseFloat(b.style.left), t: Number.parseFloat(b.style.top), w: b.offsetWidth, h: b.offsetHeight}; };
    const carBox = () => { const c = ui.project(lift.x, m.movers.position('lift.car')!), hw = (lift.w + 8) * ui.S / 2; return {l: c.x - hw, r: c.x + hw, t: c.y - 46 * ui.S, b: c.y}; };
    const freeBottom = touch ? view.H - view.bar! : view.H;

    // out of the car there is no list; the lift offers its call prompt as before
    frame(30);
    assert.ok(!popup.isOpen, name + ': no list out of the car');
    assert.ok(levelHints(L, p, m).some(h => h.label.includes('STEP IN')), name + ': the car waits at the metro');

    // E steps in; the list opens beside the car
    key('e'); assert.ok(levelRiding(L), name + ': E steps in');
    frame(2);
    const id = 'lift:' + lift.id;
    assert.ok(popup.isOpen && popup.dev === id && popup.placement === 'list', name + ': the floors open as a list in the car');
    assert.ok(!g.targets().some((t: {id: string}) => t.id === id), name + ': the floating prompt steps aside while the list is open');
    assert.deepEqual(rows().map(r => text(r)[0]), top.map(s => keyOf(s.label)), name + ': rows are the stops, top floor first, with their short keys');
    assert.deepEqual(rows().map(r => text(r)[1]), top.map(s => nameOf(s.label)), name + ': and their names');
    const last = rows().length - 1;
    assert.ok(rows()[last].has('cur') && text(rows()[last])[2] === 'step out', name + ': the stop the car is at (the bottom one) is marked, and picked: E steps out there');
    assert.ok(rows().filter(r => r.has('cur')).length === 1 && rows()[last].has('sel'), name + ': one marked row, and the selection starts on it');
    assert.equal(pick(), 0, name + ': ride.pick is the stop the car is at');

    // ↑ ↓ move ride.pick exactly as the panel does; the list reflects it
    key('ArrowUp'); frame();
    assert.equal(pick(), 1, name + ': ↑ is one floor up on ride.pick');
    assert.ok(rows()[last - 1].has('sel') && !rows()[last].has('sel'), name + ': and the selection follows');
    assert.equal(text(rows()[last])[2], 'you are here', name + ': the marked row says "you are here" once it is not the pick');
    key('ArrowUp'); key('ArrowUp'); frame();
    assert.equal(pick(), 3, name + ': ↑ again');
    for (let i = 0; i < 9; i++) key('ArrowUp');
    frame(); assert.equal(pick(), stops.length - 1, name + ': ride.pick stops at the top floor');
    assert.ok(rows()[0].has('sel'), name + ': the top row is selected');
    key('ArrowDown'); key('ArrowDown'); frame();
    assert.equal(pick(), stops.length - 3, name + ': ↓ is one floor down');
    assert.equal(p.y, stops[0].h, name + ': picking does not move the car');

    // placement: beside the car, inside the view (and, on touch, above the bar and off the pads)
    const placed = (label: string) => {
      const b = box(), c = carBox();
      assert.ok(b.l >= c.r || b.l + b.w <= c.l, name + ' ' + label + ': beside the car, not over it ' + JSON.stringify({b, c}));
      assert.ok(b.l >= 0 && b.l + b.w <= view.W && b.t >= view.top && b.t + b.h <= freeBottom + 0.5, name + ' ' + label + ': inside the view ' + JSON.stringify(b));
      if (touch) for (const pad of touchBar!.children) {
        const r = pad.rect!;
        assert.ok(b.l + b.w <= r.left || b.l >= r.right || b.t + b.h <= r.top || b.t >= r.bottom, name + ' ' + label + ': clear of the walking pad and the ACT buttons');
        assert.ok(b.t + b.h <= touchBar!.rect!.top + 0.5, name + ' ' + label + ': above the touch bar');
      }
      return b;
    };
    const atMetro = placed('at the metro');
    assert.equal(atMetro.l >= carBox().r, carX < view.W - 300, name + ': on the side with room (the right when it fits)');

    // E sends the car to the picked floor (levelInteract), tagged "called" meanwhile; the list stays open
    key('ArrowUp'); frame();
    const target = stops[pick()];
    key('e');
    frame(10);
    assert.ok(popup.isOpen, name + ': the list stays open while the car travels');
    assert.ok(m.movers.moving('lift.car') && m.movers.target('lift.car') !== undefined, name + ': E sent the car');
    const called = rows().filter(r => text(r)[2] === 'called');
    assert.ok(called.length === 1 && text(called[0])[1] === nameOf(target.label), name + ': the row of the floor the car heads for says "called"');
    assert.ok(!rows().some(r => r.has('cur')), name + ': no row says "you are here" while it travels');
    frame(25); placed('while it travels');
    frame(900);
    assert.equal(p.y, target.h, name + ': the cabin arrived at the chosen floor');
    assert.ok(L.state.vehicle?.panel, name + ': the rider stays on the cabin deck until stepping out');
    const here = rows().filter(r => r.has('cur'));
    assert.ok(here.length === 1 && text(here[0])[1] === nameOf(target.label), name + ': "you are here" moved to it');
    const atTarget = placed('at ' + target.label);
    assert.notEqual(Math.round(atTarget.t), Math.round(atMetro.t), name + ': the list follows the car\'s height (or its clamp)');

    // a click on a row picks it and sends the car
    rows()[rows().length - 1].fire('click');
    assert.equal(pick(), 0, name + ': a click on a row sets ride.pick');
    frame(5);
    assert.ok(m.movers.moving('lift.car'), name + ': and sends the car there');
    frame(900);
    assert.equal(m.movers.at('lift.car'), 'metro', name + ': to the metro');
    // the pointer over a row is the panel's choice too
    rows()[0].fire('pointerenter'); frame();
    assert.equal(pick(), stops.length - 1, name + ': hovering a row sets ride.pick');
    rows()[last].fire('pointerenter');

    // Esc closes the list; the old prompt is the fallback until the panel's keys are used again
    key('Escape'); frame(3);
    assert.ok(!popup.isOpen && levelRiding(L), name + ': Esc closes the list, you are still in the car');
    frame(10); assert.ok(!popup.isOpen, name + ': and it stays shut');
    assert.ok(g.targets().some((t: {id: string; label: string}) => t.id === id && /FLOOR/.test(t.label)), name + ': the car\'s own prompt is back');
    key('ArrowUp'); frame(2);
    assert.ok(popup.isOpen && pick() === 1, name + ': ↑ brings the list back (and moved the pick as it does)');

    // touch: ▲ ▼ and ACT drive it; a press on the bar is not a tap elsewhere
    if (touch) {
      const host = new El('div'); touchControls(host as unknown as HTMLElement);
      const bar = host.children[0], btn = (k: string) => bar.all().find(b => b.dataset.key === k)!;
      pointerDownOn(btn('ArrowUp'));
      assert.ok(popup.isOpen, name + ': a press on the touch bar does not close the list');
      btn('ArrowUp').fire('pointerdown'); btn('ArrowUp').fire('pointerup');
      frame(); assert.equal(pick(), 2, name + ': ▲ moves the pick');
      btn('ArrowDown').fire('pointerdown'); btn('ArrowDown').fire('pointerup');
      frame(); assert.equal(pick(), 1, name + ': ▼ moves it back');
      btn('e').fire('pointerdown'); btn('e').fire('pointerup');
      frame(10); assert.ok(m.movers.moving('lift.car'), name + ': ACT sends the car');
      frame(900);
      assert.equal(p.y, stops[1].h, name + ': ACT sent it to the picked floor');
    }

    // Enter sends too; choosing the floor the car is at steps out and closes the list
    const stopAt = stops.findIndex(s => Math.abs(s.h-p.y)<.5);
    for (let i = 0; i < 12; i++) key('ArrowDown');
    for (let i = 0; i < stopAt; i++) key('ArrowUp');
    frame(); assert.equal(pick(), stopAt, name + ': picked the floor the car is at');
    assert.ok(rows().some(r => r.has('cur') && r.has('sel') && text(r)[2] === 'step out'), name + ': that row offers to step out');
    key('Enter');
    assert.ok(!levelRiding(L), name + ': Enter on the car\'s own floor steps out');
    frame(2);
    assert.ok(!popup.isOpen, name + ': stepping out closes the list');
    assert.equal(levelFloor(L).id, stops[stopAt].floor, name + ': on that floor');

    // a tap elsewhere closes it
    key('e'); frame(2); assert.ok(levelRiding(L) && popup.isOpen, name + ': back in the car: the list again');
    pointerDownOn(new El('canvas'));
    frame(2); assert.ok(!popup.isOpen, name + ': a tap elsewhere closes it');
    win.removeEventListener('keydown', g.onKeyDown); win.removeEventListener('keyup', g.onKeyUp);
    popup.dispose();
  }

  // desktop: the car left of the middle (the list on its right), then right of it (on its left)
  run('desktop-left', {W: 1280, H: 720, top: 60}, false, 400);
  run('desktop-right', {W: 1280, H: 720, top: 60}, false, 1150);
  // a landscape phone (844 × 390, the touch bar along the bottom): beside the car, over the bar never
  run('phone-left', {W: 844, H: 390, top: 44, bar: 56}, true, 250);
  run('phone-right', {W: 844, H: 390, top: 44, bar: 56}, true, 720);
  console.log('Lift floor list PASS: in the car the floors are a list beside it (top floor first, short keys, "you are here" / "called" tags), ↑ ↓ / ▲ ▼ move ride.pick, E / Enter / ACT / a row send the car through levelInteract, Esc / stepping out / a tap elsewhere close it, placed beside the car and clear of the touch bar on a phone.');
} finally {
  Object.assign(globalThis, original);
}
