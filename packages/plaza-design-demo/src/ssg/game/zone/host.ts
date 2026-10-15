/**
 * A zone on screen: its model, the schematic overlay, hack vision, its panels,
 * the HACK and BOARD buttons, and its part of the save. One class for every
 * zone; what differs is the zone's data, its rules (effects) and its view
 * (scene drawing, extra panels, extra things to press E on): a `ZoneDef`.
 *
 * Tap a thing in the world (or stand next to it and press E) and its schematic
 * opens. B opens the board with every device you have opened or seen, for
 * wiring, and the logic parts (timer, switch). H is hack vision: the world is
 * muted (the game draws it dimmed, then the devices and the player on top),
 * every device on screen gets a frame and a name plate, a plate unfolds into
 * its circuit, and you wire right there; logic parts float in the world next
 * to you. It is meant to grow into the board's replacement. Every action also
 * prints its shell line in the deck's terminal.
 *
 * Progress (state, goals, cables, placed parts, sectors, the net, the board's
 * layout) goes into the game's save as one `ZoneSave` (`save.zones.<id>`), a
 * moment after things settle, and on `persist()` (leaving, stopping the game).
 * The keyring and the modules are the player's, across zones.
 */

import type { ZoneData, ZoneSave } from '../data/types';
import type { Character } from '../characters';
import type { SceneReadable, SceneUse } from '../scenes/kit';
import type { LineKind } from '../terminal';
import { type Line, type Spot, ZoneModel } from './model';
import { type PanelFn, Panels } from './panels';
import type { ZoneRules } from './rules';
import { Popup, type PopupItem } from './popup';
import { type Anchor, Schematic } from './schematic';
import { ENGINE_PANEL_FNS } from './toys';

/**
 * Something to stand next to and press E on. `promptH`: how high its prompt hangs above the street;
 * `y`: how high the thing itself sits (a box on a roof), so the game can tell where you stand to reach it.
 */
export interface ZoneTarget { id: string; x: number; label: string; promptH: number; y?: number }

/** How the game's canvas maps world units for a zone's drawing. */
export interface DrawView { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number; viewH: number }

/**
 * What to draw: 'all', or for hack vision 'world' (everything but the devices: the game mutes
 * it) and then 'devices' (only the zone's devices, drawn bright over the muted world).
 */
export type DrawLayer = 'all' | 'world' | 'devices';

/** A zone's code on the screen side: its scene, its own panels, its extra targets. */
export interface ZoneView {
  /** Panels this zone adds to the engine's `talk` (the yard's `camera`). Must match `rules.panels`. */
  panels?: Record<string, PanelFn>;
  /**
   * Draw the zone (its backdrop and its things) after the ground. `hover`: the device under the pointer.
   * `layer` (default 'all'): a view that cannot split draws everything for 'world' and nothing for 'devices'.
   */
  draw(x: CanvasRenderingContext2D, m: ZoneModel, v: DrawView, hover: string | null, layer?: DrawLayer): void;
  /** Things to press E on besides the devices (an exit, a pickup tray). */
  targets?(m: ZoneModel): ZoneTarget[];
  /** E on one of those. Return 'exit' to walk out of the zone. */
  use?(id: string, m: ZoneModel, say: (l: Line) => void): 'exit' | void;
  /**
   * A place's life, in the same shape the explorable scenes use (scenes/kit.ts), so any zone
   * can have it: `people` (characters.ts; the view draws them, the game makes [E] TALK targets for
   * those with `id` and `talk`), `uses` (things to do with E: buy, rent, pay in tokens) and
   * `readables`. The game handles them exactly as it does a scene's.
   */
  people?: Character[];
  uses?: SceneUse[];
  readables?: SceneReadable[];
}

/** A zone, complete: its data file, its rules, its view. */
export interface ZoneDef { data: ZoneData; rules: ZoneRules; view: ZoneView }

/** How a zone reaches the game's save. */
export interface ZoneStore {
  /** Logic modules the player owns. */
  modules: () => string[];
  /** Keyring item ids the player holds. */
  keyring: () => string[];
  /** Put an item on the keyring (and write the save). */
  give: (id: string) => void;
  /** The player now owns this logic module (and write the save). */
  grant?: (module: string) => void;
  /** Add noodle tokens, return the new total (and write the save). */
  tokens?: (add: number) => number;
  /** A made fragment left the keyring (it is already gone from `keyring()`): write the save. */
  drop?: (id: string) => void;
  /** Sudo mode: every LINK reaches every node. */
  sudo?: boolean;
  /** This zone's saved progress, if any. */
  load: () => ZoneSave | undefined;
  /** Keep this as the zone's progress (and write the save). */
  store: (z: ZoneSave) => void;
}

/** How long things must be quiet before the zone writes the save. */
const SAVE_AFTER_MS = 800;
/** How often trace moves. */
const TICK_MS = 250;
/** While trace or a lockout moves, the save hears of it this often at most. */
const HEAT_SAVE_MS = 2000;
/** World (x along the zone, h above the ground) to CSS px inside the canvas. */
export type Project = (wx: number, h: number) => { x: number; y: number };
/** Walk this far (world units) from where a thing's popup opened, and it closes. */
const POPUP_WALK = 36;
/** A logic part's body floating in hack vision, in world units. */
const PART = { w: 26, h: 16 };
/** Where a new part floats: this high, beside the player, and parts keep this far apart (world units). */
const PART_H = 64, PART_GAP = 34;

export class ZoneHost {
  readonly model: ZoneModel;
  private schem: Schematic;
  private vision: Schematic;
  private panels: Panels;
  /** A thing's popup in the world: its everyday actions, jack in, hack it. */
  private popup: Popup;
  /** Where the player stood when the popup opened: walking off closes it. */
  private popupAt = 0;
  /** Where each device stood on screen in the last frame (for the popup). */
  private seen = new Map<string, Anchor>();
  private btns: HTMLDivElement;
  private hackBtn: HTMLButtonElement;
  private boardBtn: HTMLButtonElement;
  hover: string | null = null;
  onClose: () => void = () => {};
  private saveTimer = 0;
  private saved = '';
  /** The last frame's mapping and the player's spot, for placing and dragging logic parts in hack vision. */
  private project: Project | null = null;
  private width = 0;
  private player = { x: 0, h: 0 };
  /** While a typed command runs (`typed`), the deck already shows it: don't print the shell line again. */
  private echo = true;

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind) => void, private store: ZoneStore | undefined, readonly def: ZoneDef) {
    this.model = new ZoneModel({
      say: (l) => this.say(l),
      open: (panel, arg) => this.panels.open(panel, arg),
      changed: () => { this.schem?.render(); this.vision?.render(); this.dirty(); },
      kick: (dev) => { if (this.schem.viewing === dev) this.schem.close(); },
      modules: store ? () => store.modules() : undefined,
      keyring: store ? () => store.keyring() : undefined,
      give: store ? (id) => store.give(id) : undefined,
      grant: store?.grant,
      tokens: store?.tokens,
      drop: store?.drop,
      sudo: store?.sudo ? () => true : undefined,
    }, def.data, def.rules);
    const known = new Set<string>();
    this.schem = new Schematic(host, this.model, (l) => this.say(l), { known });
    this.vision = new Schematic(host, this.model, (l) => this.say(l), { known, vision: true });
    // the engine's own panels (the lock toys) under the zone's
    this.popup = new Popup(host);
    this.popup.onClose = () => this.onClose();
    this.panels = new Panels(host, this.model, (l) => this.say(l), { ...ENGINE_PANEL_FNS, ...def.view.panels });
    this.schem.onLayout = () => this.dirty();
    this.vision.onLayout = () => this.dirty();
    this.vision.onPlace = (id) => { this.place(id); this.refollow(); this.dirty(); };
    this.vision.onMovePart = (id, at) => this.movePart(id, at);
    this.schem.onClose = () => this.onClose();
    this.vision.onClose = () => { this.sync(); this.onClose(); };
    // you keep walking in hack vision: a tapped verb must not keep the keys (Enter would press it again)
    this.vision.root.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.sch-guess')) this.onClose(); }, true);
    this.panels.onClose = () => { if (!this.schem.isOpen) this.onClose(); };

    // HACK and BOARD over the canvas, so nobody has to guess the keys
    this.btns = document.createElement('div'); this.btns.id = 'zone-btns'; this.btns.hidden = true;
    const button = (text: string, fn: () => void) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hack-btn'; b.textContent = text;
      // hand the keys back to the canvas, or Space and Enter would press the button again
      b.addEventListener('click', () => { fn(); this.onClose(); });
      this.btns.appendChild(b); return b;
    };
    this.hackBtn = button('HACK · H', () => this.toggleVision());
    this.hackBtn.title = 'hack vision: see every device here and wire them in place (H)';
    this.boardBtn = button('BOARD · B', () => this.toggleBoard());
    host.appendChild(this.btns);
    this.vision.bar = this.btns;
    const saved = store?.load();
    if (saved) this.restore(saved);
    this.saved = JSON.stringify(this.snapshot());
    this.sync();
    // trace: the meter fills while you look into a logged device, and drains when you leave
    // (the watchdog walks and clocks beat on the same tick)
    let last = performance.now(), heat = this.heat(), wrote = 0;
    window.setInterval(() => {
      const now = performance.now();
      this.model.viewing = new Set(this.schem.viewing ? [this.schem.viewing] : []);
      if (this.model.tick(now - last, !this.btns.hidden)) { this.schem.meters(); this.vision.meters(); }
      last = now;
      // trace and lockouts are saved: write them as they move (at most every HEAT_SAVE_MS), so a reload is no way out
      const h = this.heat();
      if (h !== heat && now - wrote > HEAT_SAVE_MS) { heat = h; wrote = now; this.persist(); }
    }, TICK_MS);
    window.addEventListener('pagehide', () => this.persist());
  }

  /** Trace (whole %) and running lockouts, as a string: when it changes, the save should hear of it. */
  private heat() {
    const m = this.model;
    return [...m.trace].map(([k, v]) => k + Math.round(v)).join() + '|' + [...m.locks.keys()].filter((k) => m.lockLeft(k) > 0).join();
  }

  get id() { return this.def.data.id; }

  // ---------- the save ----------

  /** Everything the save keeps about the zone. */
  snapshot(): ZoneSave {
    const board = this.schem.layout(), pieces = this.vision.pieces();
    // hack vision: plates and circuits moved off their default spot (world units from it)
    const vision = Object.keys(pieces).length ? { vision: pieces } : {};
    return { ...this.model.snapshot(), board: { known: [...this.schem.known], pos: board.pos, offsets: board.offsets, ...vision } };
  }

  private restore(z: ZoneSave) {
    this.model.restore(z);
    this.schem.known.clear();
    (z.board?.known ?? []).forEach((id) => { if (this.model.devices.has(id)) this.schem.known.add(id); });
    this.schem.restoreLayout({ pos: z.board?.pos, offsets: z.board?.offsets });
    this.vision.restorePieces(z.board?.vision, (id) => this.model.devices.has(id));
  }

  /** Something changed: write the save once things have been quiet for a moment. */
  private dirty() {
    if (!this.store) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.persist(), SAVE_AFTER_MS);
  }

  /** Write the zone's progress now, if it changed since the last write. */
  persist() {
    clearTimeout(this.saveTimer);
    if (!this.store) return;
    const z = this.snapshot(), json = JSON.stringify(z);
    if (json === this.saved) return;
    this.saved = json;
    this.store.store(z);
  }

  /** `reset <zone>`: the zone as on the first visit; the rest of the save (keyring included) is untouched. */
  reset() {
    this.closeAll();
    this.model.reset();
    this.schem.known.clear();
    this.schem.resetLayout(); this.vision.resetLayout();
    this.saved = '';
    this.persist();
    this.sync();
  }

  private say(l: Line) {
    if (l[0] && this.echo) this.print('> ' + l[0], 'in');
    if (l[1]) this.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : l[2] === 'dim' ? 'dim' : 'out');
    this.schem.note(l); this.vision.note(l); this.popup.note(l);
  }

  /** BOARD is off until something is on it; HACK lights up while hack vision is on. */
  private sync() {
    const none = !this.schem.known.size, on = this.vision.isOpen;
    if (this.boardBtn.disabled !== none) {
      this.boardBtn.disabled = none;
      this.boardBtn.title = none ? 'nothing on the board yet' : 'the board: everything you have opened or seen, plus timers and switches (B)';
    }
    if (this.hackBtn.classList.contains('on') !== on) { this.hackBtn.classList.toggle('on', on); this.hackBtn.setAttribute('aria-pressed', String(on)); }
  }

  /**
   * Run something the player typed in the deck (the terminal, last resort): the engine's lines
   * print as usual, minus the shell command the player just typed themselves.
   */
  typed(fn: () => void) {
    this.echo = false;
    try { fn(); } finally { this.echo = true; }
  }

  /** The device whose schematic is open (not the board, not hack vision), if any. */
  get viewing() { return this.schem.viewing; }

  get overlayOpen() { return this.schem.isOpen || this.panels.isOpen; }
  closeOverlay() { if (this.panels.isOpen) this.panels.close(); else this.schem.close(); }
  closeAll() { this.popup.close(); this.panels.close(); this.schem.close(); this.vision.close(); }
  /** The HACK and BOARD buttons show in this zone only. */
  show(on: boolean) { this.btns.hidden = !on; }

  get visionOn() { return this.vision.isOpen; }
  /** H: hack vision on or off. From an open schematic or panel it goes straight to the world, in vision. */
  toggleVision() {
    this.popup.close();
    if (this.vision.isOpen && !this.overlayOpen) this.vision.close();
    else { this.panels.close(); this.schem.close(); this.vision.openVision(); }
    this.sync();
  }
  /** A tap on the canvas in hack vision: on a device, all its verbs; on nothing, drop the cable in hand. */
  poke(id: string | null) { this.vision.poke(id); }

  /**
   * Every frame: where each device stands on screen, so hack vision follows the camera,
   * and where the player is (logic parts placed in hack vision float next to them).
   */
  follow(project: Project, width: number, player?: { x: number; h: number }) {
    this.project = project; this.width = width;
    this.vision.unit = (project(100, 0).x - project(0, 0).x) / 100 || 1;
    if (player) this.player = { x: player.x, h: player.h };
    const m = this.model, seen = new Map<string, Anchor>();
    const add = (id: string, x: number, base: number, w: number, h: number) => {
      const c = project(x, base + h / 2), e = project(x + w / 2, base + h);
      const sw = (e.x - c.x) * 2, sh = (c.y - e.y) * 2;
      if (c.x + sw / 2 < 0 || c.x - sw / 2 > width) return;
      seen.set(id, { x: c.x, y: c.y, w: sw, h: sh });
    };
    m.spots().forEach((s) => add(s.id, s.x, s.y, s.w, s.h));
    this.seen = new Map(seen);
    if (this.popup.isOpen) {
      const at = this.popup.dev ? seen.get(this.popup.dev) : undefined;
      // walked off, or the thing left the view: the popup goes
      if (!at || Math.abs(this.player.x - this.popupAt) > POPUP_WALK) this.popup.close(); else this.popup.place(at);
    }
    if (this.vision.isOpen) {
      // a part placed on the board has no spot in the world yet: it turns up next to you
      [...m.devices.values()].filter((d) => d.logic && !m.logicAt.has(d.id)).forEach((d) => { this.place(d.id); this.dirty(); });
      m.logicAt.forEach((at, id) => add(id, at.x, at.h, PART.w, PART.h));
    }
    this.vision.see(seen);
    this.sync();
  }
  /** Follow again now (a part was placed or moved), with the last frame's mapping. */
  private refollow() { if (this.project) this.follow(this.project, this.width); }

  /** A spot in the world for a logic part: beside the player, clear of the devices and the parts already there. */
  private place(id: string) {
    const m = this.model, near = (a: number, b: number, d: number) => Math.abs(a - b) < d;
    const free = (x: number, h: number) =>
      !m.spots().some((s) => near(x, s.x, s.w / 2 + PART.w / 2 + 6) && h < s.h + 6)
      && ![...m.logicAt.values()].some((p) => near(p.x, x, PART.w + 8) && near(p.h, h, PART.h + 8));
    // right of the player first, then left, a little further each time; then a row higher
    let at = { x: this.player.x + PART_GAP, h: PART_H };
    search: for (let row = 0; row < 4; row++) {
      for (let i = 1; i <= 8; i++) {
        const x = this.player.x + PART_GAP * Math.ceil(i / 2) * (i % 2 ? 1 : -1), h = PART_H + row * (PART.h + 12);
        if (x > PART.w && free(x, h)) { at = { x, h }; break search; }
      }
    }
    m.logicAt.set(id, at);
  }

  /** A part dragged in hack vision: its centre to `at` (stage px), back into the world. */
  private movePart(id: string, at: { x: number; y: number }) {
    const p = this.project;
    if (!p) return;
    // the mapping is linear: two points give it, and its inverse
    const o = p(0, 0), u = p(100, 100), kx = (u.x - o.x) / 100, ky = (u.y - o.y) / 100;
    if (!kx || !ky) return;
    const wx = (at.x - o.x) / kx, h = (at.y - o.y) / ky - PART.h / 2;
    this.model.logicAt.set(id, { x: Math.round(wx), h: Math.round(Math.max(0, Math.min(220, h))) });
    this.refollow();
    this.dirty();
  }

  // ---------- a thing's popup: everyday actions, jack in, hack it ----------

  get popupOpen() { return this.popup.isOpen; }
  /** A key while the popup is open: true when it used the key. */
  popupKey(e: KeyboardEvent) { return this.popup.key(e); }

  /**
   * A click or E on a device in the world: its popup, right next to it. Its everyday
   * actions (data: `everyday`), `⌁ jack in` for a computer (`deck`), then `⌁ hack it`.
   */
  pick(id: string) {
    const d = this.model.devices.get(id);
    if (!d) return;
    this.popupAt = this.player.x;
    this.popup.open(id, d.name, this.model.label('menu.aria', { device: d.name }), this.popupItems(id), this.seen.get(id));
  }

  private popupItems(id: string): PopupItem[] {
    const m = this.model, d = m.devices.get(id)!;
    const items: PopupItem[] = (d.data.everyday ?? []).flatMap((e) => {
      const n = d.nouns.find((x) => x.id === e.noun);
      // a noun sealed away (or gone) is not everyday any more
      if (!n || (n.sector && m.sealed(id, n.sector))) return [];
      return [{ label: e.label ?? e.verb, cur: n.current?.() === e.verb, run: () => this.everyday(id, e.noun, e.verb) }];
    });
    if (d.data.deck) items.push({ label: m.label('menu.jack'), hack: true, run: () => { this.popup.close(); this.openDevice(id); } });
    items.push({ label: m.label('menu.hack'), hack: true, run: () => this.hackIt(id) });
    return items;
  }

  /** An everyday action: the noun's verb, exactly as a tap on it would run it. The popup stays, with the reply. */
  private everyday(dev: string, noun: string, verb: string) {
    this.model.act(dev, noun, verb);
    if (this.popup.dev === dev) this.popup.fill(this.popupItems(dev));
  }

  /** `⌁ hack it`: hack view, this device's circuit unfolded and in view. */
  hackIt(id: string) {
    this.popup.close(); this.panels.close(); this.schem.close();
    if (!this.vision.isOpen) this.vision.openVision();
    this.vision.focus(id);
    this.sync();
  }

  /** Open a device's schematic, unless a full trace has you locked out of it. */
  openDevice(id: string) {
    const d = this.model.devices.get(id);
    if (!d) return;
    const left = this.model.lockLeft(id);
    if (left) { this.say(this.model.line('trace.locked', { device: d.name, sec: Math.ceil(left / 1000) })); return; }
    this.say(['login ' + id, d.look, 'dim']);
    this.schem.openDevice(id);
  }
  toggleBoard() {
    if (!this.schem.known.size) { this.print(this.model.label('board.empty'), 'dim'); return; }
    this.schem.toggleBoard();
  }

  /** Things you can stand next to and press E on: the zone's own (an exit), then every device in the world. */
  targets(): ZoneTarget[] {
    const m = this.model, own = this.def.view.targets?.(m) ?? [];
    const devs = m.spots().map((s: Spot) => ({ id: s.id, x: s.x, y: s.y, label: m.label('prompt.open'), promptH: s.y + Math.min(s.h + 12, 100) }));
    return [...own, ...devs];
  }

  /** E next to a target. Returns 'exit' when the player walks out of the zone. */
  use(id: string): 'exit' | void {
    if (this.model.devices.has(id) && this.model.spots().some((s) => s.id === id)) { this.pick(id); return; }
    return this.def.view.use?.(id, this.model, (l) => this.say(l));
  }

  /** The device in the world under a point (world x, height), smaller things first. */
  spotAt(wx: number, h: number) {
    const hit = this.model.spots().filter((s) => Math.abs(wx - s.x) <= s.w / 2 + 3 && h >= s.y - 4 && h <= s.y + s.h + 4);
    // a big frame (the crane) must not hide the smaller things standing in front of it
    hit.sort((a, b) => a.w - b.w);
    return hit[0]?.id ?? null;
  }

  objective() {
    const next = this.model.zone.goals.find((g) => !this.model.goals.has(g.id));
    return next ? next.text : this.model.label('goals.done');
  }

  /** Draw the zone; in hack vision the game draws 'world', mutes it, then 'devices' (see `DrawLayer`). */
  draw(x: CanvasRenderingContext2D, v: DrawView, layer: DrawLayer = 'all') { this.def.view.draw(x, this.model, v, this.hover, layer); }
}
