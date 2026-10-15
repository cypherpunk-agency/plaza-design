/**
 * A scene on screen: its model, the schematic overlay, hack vision, its panels,
 * the HACK and BOARD buttons, and its part of the save. One class for every
 * scene; what differs is the scene's data (none: zero devices), its rules
 * (effects) and its definition (drawing, extra panels, extra things to press E
 * on): a `SceneDef` (scenes/kit.ts).
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
 * layout) goes into the game's save as one `SceneSave` (`save.scenes.<id>`), a
 * moment after things settle, and on `persist()` (leaving, stopping the game).
 * The keyring and the modules are the player's, across scenes.
 */

import type { SceneData, SceneSave } from '../data/types';
import type { SceneDef, View } from '../scenes/kit';
import type { LineKind } from '../terminal';
import { type Line, type Spot, SceneModel } from './model';
import { Panels } from './panels';
import type { SceneRules } from './rules';
import { type Box, Feedback, type PingKind, type Spot2D } from './feedback';
import { Popup, type PopupAnchor, type PopupItem, type PopupRoom } from './popup';
import { type Anchor, Schematic } from './schematic';
import { ENGINE_PANEL_FNS } from './toys';

/**
 * Something to stand next to and press E on. `promptH`: how high its prompt hangs above the street;
 * `y`: how high the thing itself sits (a box on a roof), so the game can tell where you stand to reach it.
 */
export interface SceneTarget { id: string; x: number; label: string; promptH: number; y?: number }

/** How the game's canvas maps world units for a scene's drawing. */
export interface DrawView { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number; viewH: number }

/**
 * What to draw: 'all', or for hack vision 'world' (everything but the devices: the game mutes
 * it) and then 'devices' (only the scene's devices, drawn bright over the muted world).
 */
export type DrawLayer = 'all' | 'world' | 'devices';

/** What a scene's drawing gets from the engine besides the view: its model, the device under the pointer, the layer. */
export interface EngineDraw { m: SceneModel; hover: string | null; layer: DrawLayer }

/** A scene without a data file: no devices, no goals, nothing to hack. Hack vision shows nothing here. */
export function emptyData(id: string, name: string): SceneData {
  return { id, name, state: {}, tuning: {}, devices: [], cables: [], dialogue: {}, goals: [], texts: {} };
}

/** A scene without code of its own on the engine. */
export const NO_RULES: SceneRules = { effects: {} };

/** How a scene reaches the game's save. */
export interface SceneStore {
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
  /** Add n of an item the player carries (0: ask; negative: take), return how many now (and write the save). */
  carry?: (item: string, n: number) => number;
  /** Set a save flag (and write the save). */
  flag?: (name: string) => void;
  /** A made fragment left the keyring (it is already gone from `keyring()`): write the save. */
  drop?: (id: string) => void;
  /** Sudo mode: every LINK reaches every node. */
  sudo?: boolean;
  /** This scene's saved progress, if any. */
  load: () => SceneSave | undefined;
  /** Keep this as the scene's progress (and write the save). */
  store: (z: SceneSave) => void;
}

/** How long things must be quiet before the scene writes the save. */
const SAVE_AFTER_MS = 800;
/** How often trace moves. */
const TICK_MS = 250;
/** While trace or a lockout moves, the save hears of it this often at most. */
const HEAT_SAVE_MS = 2000;
/** World (x along the scene, h above the ground) to CSS px inside the canvas. */
export type Project = (wx: number, h: number) => { x: number; y: number };
/** Walk this far (world units) from where a thing's popup opened, and it closes. */
const POPUP_WALK = 36;
/** A logic part's body floating in hack vision, in world units. */
const PART = { w: 26, h: 16 };
/** Where a new part floats: this high, beside the player, and parts keep this far apart (world units). */
const PART_H = 64, PART_GAP = 34;

export class SceneHost {
  readonly model: SceneModel;
  private schem: Schematic;
  private vision: Schematic;
  private panels: Panels;
  /** A thing's popup in the world: its everyday actions, jack in, hack it. */
  private popup: Popup;
  /** Where the player stood when the popup opened: walking off closes it. */
  private popupAt = 0;
  /** Where each device stood on screen in the last frame (for the popup). */
  private seen = new Map<string, Anchor>();
  /** Captions over the thing that reacted, and pings (scene/feedback.ts). */
  private fx: Feedback;
  /** Speakers that are not devices or targets (the game's: 'pixel'), as world points; null when not here. */
  where: (from: string) => { x: number; h: number } | null = () => null;
  /** Things the game keeps the popup away from besides the player (Pixel), as world points. */
  extras: () => { x: number; h: number }[] = () => [];
  /** Something of this scene reacted and said so (`from`, its line, its tone): the game may draw the eye there (the camera nudge). */
  onReact: (from: string, text: string, tone?: string) => void = () => {};
  /** Where something of this scene is in the world (a device's spot, or one of the scene's own targets), or null. */
  worldOf(from: string): { x: number; h: number } | null {
    const s = this.model.spots().find((z) => z.id === from);
    if (s) return { x: s.x, h: s.y + s.h / 2 };
    const t = this.def.targets?.(this.model).find((z) => z.id === from);
    return t ? { x: t.x, h: 20 } : null;
  }
  /** Boxes captions never cover besides the player (the player's speech bubble), CSS px of the game view. The game sets it. */
  shield: () => Box[] = () => [];
  /** People on screen (their heads), CSS px: captions keep their lane above them. The game sets it. */
  crowd: () => Box[] = () => [];
  /** The top of the free view, under the HUD and the buttons (CSS px of the game view). The game sets it. */
  uiTop = 0;
  /**
   * The story can step in (the opening, opening.ts); the game sets both. `hackLock`: hacking is not
   * yours yet (no HACK/BOARD, no H/B, no pink row in the popup, no jacking in). `story`: a device's
   * everyday actions in this state, instead of its data's (null: the data's).
   */
  hackLock: () => boolean = () => false;
  story: (dev: string) => PopupItem[] | null = () => null;
  private btns: HTMLDivElement;
  private hackBtn: HTMLButtonElement;
  private boardBtn: HTMLButtonElement;
  /** Hack vision's own buttons (desktop key bar): the LOGIC drawer, and every circuit unfolded at once. */
  private logicBtn: HTMLButtonElement;
  private unfoldBtn: HTMLButtonElement;
  /** Hack vision: the reset button (⊙) or a double-tap asked for the normal view. The game sets it. */
  onResetView: () => void = () => {};
  /** Hack vision's LOGIC drawer or UNFOLD changed: the game updates its bars. */
  onVisionUi: () => void = () => {};
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

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind) => void, private store: SceneStore | undefined, readonly def: SceneDef, rules: SceneRules = NO_RULES) {
    this.model = new SceneModel({
      say: (l, from) => this.say(l, from),
      open: (panel, arg) => this.panels.open(panel, arg),
      changed: () => { this.schem?.render(); this.vision?.render(); this.dirty(); },
      kick: (dev) => { if (this.schem.viewing === dev) this.schem.close(); },
      modules: store ? () => store.modules() : undefined,
      keyring: store ? () => store.keyring() : undefined,
      give: store ? (id) => store.give(id) : undefined,
      grant: store?.grant,
      tokens: store?.tokens,
      carry: store?.carry,
      flag: store?.flag,
      drop: store?.drop,
      sudo: store?.sudo ? () => true : undefined,
    }, def.data ?? emptyData(def.id, def.name), rules);
    const known = new Set<string>();
    this.schem = new Schematic(host, this.model, (l) => this.say(l), { known });
    this.vision = new Schematic(host, this.model, (l) => this.say(l), { known, vision: true });
    // the engine's own panels (the lock toys) under the scene's
    this.popup = new Popup(host);
    this.fx = new Feedback(host);
    this.popup.onClose = () => this.onClose();
    this.panels = new Panels(host, this.model, (l) => this.say(l), { ...ENGINE_PANEL_FNS, ...def.panels });
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
    this.btns = document.createElement('div'); this.btns.id = 'scene-btns'; this.btns.hidden = true;
    const button = (text: string, fn: () => void) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hack-btn'; b.textContent = text;
      // hand the keys back to the canvas, or Space and Enter would press the button again
      b.addEventListener('click', () => { fn(); this.onClose(); });
      this.btns.appendChild(b); return b;
    };
    this.hackBtn = button('HACK · H', () => this.toggleVision());
    this.hackBtn.title = 'hack vision: see every device here and wire them in place (H)';
    this.boardBtn = button('BOARD · B', () => this.toggleBoard());
    this.logicBtn = button('LOGIC · L', () => this.toggleLogic());
    this.logicBtn.dataset.logic = '';
    this.logicBtn.title = 'the logic drawer: timers and switches to drag into the scene (L)';
    this.unfoldBtn = button('UNFOLD · U', () => this.toggleUnfold());
    this.unfoldBtn.title = 'unfold every circuit at once, to compare them (U)';
    this.logicBtn.hidden = this.unfoldBtn.hidden = true;
    this.vision.onReset = () => this.onResetView();
    this.vision.onDrawer = () => { this.sync(); this.onVisionUi(); };
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
      if (this.model.tick(now - last, this.active)) { this.schem.meters(); this.vision.meters(); }
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

  get id() { return this.def.id; }

  // ---------- the save ----------

  /** Everything the save keeps about the scene. */
  snapshot(): SceneSave {
    const board = this.schem.layout(), pieces = this.vision.pieces();
    // hack vision: plates and circuits moved off their default spot (world units from it)
    const vision = Object.keys(pieces).length ? { vision: pieces } : {};
    return { ...this.model.snapshot(), board: { known: [...this.schem.known], pos: board.pos, offsets: board.offsets, ...vision } };
  }

  private restore(z: SceneSave) {
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

  /** Write the scene's progress now, if it changed since the last write. */
  persist() {
    clearTimeout(this.saveTimer);
    if (!this.store) return;
    const z = this.snapshot(), json = JSON.stringify(z);
    if (json === this.saved) return;
    this.saved = json;
    this.store.store(z);
  }

  /** `reset <scene>`: the scene as on the first visit; the rest of the save (keyring included) is untouched. */
  reset() {
    this.closeAll();
    this.model.reset();
    this.schem.known.clear();
    this.schem.resetLayout(); this.vision.resetLayout();
    this.saved = '';
    this.persist();
    this.sync();
  }

  /**
   * A line: to the terminal (the history), the open schematic's status, and, when it is known
   * who said it, as a caption over that thing in the world (with a ping).
   */
  private say(l: Line, from?: string) {
    if (l[0] && this.echo) this.print('> ' + l[0], 'in');
    if (l[1]) this.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : l[2] === 'dim' ? 'dim' : 'out');
    this.schem.note(l); this.vision.note(l);
    if (from && l[1] && this.active) { this.fx.caption(from, l[1], l[2], this.locate); this.onReact(from, l[1], l[2]); }
  }

  /** Something of this scene says a line, as if it had reacted (a caption over it, the history): the story's lines. */
  react(from: string, l: Line) { this.say(l, from); }

  /** A ping where something of this scene is (a device, one of its targets, or what `where` knows); an edge arrow when it is off the view. */
  ping(from: string, kind: PingKind = 'look') { if (this.active) this.fx.ping(from, kind, this.locate); }

  /**
   * Where a speaker is on screen now: a device (its spot), one of the scene's own targets
   * (the pickup tray), or what the game knows (Pixel). `off`: it is off to that side of the view.
   */
  private locate = (from: string): Spot2D | null => {
    const p = this.project;
    if (!p) return null;
    const s = this.model.spots().find((x) => x.id === from);
    let x: number, base: number, w: number, h: number;
    if (s) { x = s.x; base = s.y; w = s.w; h = s.h; }
    else {
      const t = this.def.targets?.(this.model).find((z) => z.id === from), q = t ? { x: t.x, h: 0 } : this.where(from);
      if (!q) return null;
      x = q.x; base = q.h; w = t ? 24 : 18; h = t ? Math.max(16, t.promptH - 14) : 16;
    }
    const c = p(x, base + h / 2), e = p(x + w / 2, base + h), sw = (e.x - c.x) * 2, sh = (c.y - e.y) * 2;
    const off = c.x + sw / 2 < 0 ? -1 : c.x - sw / 2 > this.width ? 1 : 0;
    return { x: c.x, y: c.y, w: sw, h: sh, off };
  };

  /** What the popup keeps clear of and away from: the player, the buttons, what the device is cabled to or affects, Pixel. */
  private room(id: string): PopupRoom {
    const p = this.project!, m = this.model, d = m.devices.get(id);
    const me = p(this.player.x, this.player.h + 21), head = p(this.player.x + 9, this.player.h + 44);
    const player: PopupAnchor = { x: me.x, y: me.y, w: (head.x - me.x) * 2, h: (me.y - head.y) * 2 };
    const partners = new Set<string>(d?.data.affects ?? []);
    m.links.forEach((l) => {
      const a = l.from.split('.')[0], b = l.to.split('.')[0];
      if (a === id && b !== id) partners.add(b);
      if (b === id && a !== id) partners.add(a);
    });
    const avoid = [...partners].map((x) => this.locate(x)).filter((q): q is Spot2D => !!q && !q.off).map((q) => ({ x: q.x, y: q.y }));
    avoid.push({ x: player.x, y: player.y });
    this.extras().forEach((q) => { const c = p(q.x, q.h + 8); avoid.push(c); });
    const keepClear = [player];
    const row = this.btns.parentElement?.classList.contains('kb-actions') ? this.btns.parentElement : this.btns;
    const top = this.fx.origin();
    if (row && !this.btns.hidden && row.offsetParent) {
      const r = row.getBoundingClientRect();
      keepClear.push({ x: r.left - top.left + r.width / 2, y: r.top - top.top + r.height / 2, w: r.width, h: r.height });
    }
    return { avoid, keepClear, top: this.uiTop, lane: this.fx.laneBottom() };
  }

  /** BOARD is off until something is on it; HACK lights up while hack vision is on. */
  private sync() {
    // HACK and BOARD only where there is something to hack, and only once hacking is yours
    const hide = !this.active || !this.hackable;
    if (this.btns.hidden !== hide) this.btns.hidden = hide;
    const none = !this.schem.known.size, on = this.vision.isOpen;
    if (this.boardBtn.disabled !== none) {
      this.boardBtn.disabled = none;
      this.boardBtn.title = none ? 'nothing on the board yet' : 'the board: everything you have opened or seen, plus timers and switches (B)';
    }
    if (this.hackBtn.classList.contains('on') !== on) {
      this.hackBtn.classList.toggle('on', on); this.hackBtn.setAttribute('aria-pressed', String(on));
      // in hack vision the bar is hack vision's: EXIT, BOARD, LOGIC, UNFOLD
      this.hackBtn.textContent = on ? 'EXIT · H' : 'HACK · H';
      this.logicBtn.hidden = this.unfoldBtn.hidden = !on;
    }
    const lo = on && this.vision.drawerOpen, un = this.vision.allUnfolded;
    if (this.logicBtn.classList.contains('on') !== lo) this.logicBtn.classList.toggle('on', lo);
    if (this.unfoldBtn.classList.contains('on') !== un) { this.unfoldBtn.classList.toggle('on', un); this.unfoldBtn.textContent = un ? 'FOLD · U' : 'UNFOLD · U'; }
  }

  /** L in hack vision: the LOGIC drawer open or shut. */
  toggleLogic() { if (this.vision.isOpen) this.vision.setDrawer(!this.vision.drawerOpen); }
  /** U in hack vision: every circuit unfolded at once, or back to each by hand. */
  toggleUnfold() { if (this.vision.isOpen) { this.vision.toggleUnfoldAll(); this.sync(); this.onVisionUi(); } }
  get logicOpen() { return this.vision.isOpen && this.vision.drawerOpen; }
  get unfoldAll() { return this.vision.allUnfolded; }
  /** Hack vision: what you own, for the LOGIC drawer (the HUD keeps only the goal there). The game sets it. */
  set drawerInfo(fn: () => string) { this.vision.drawerInfo = fn; }
  /** Hack vision: the view is panned or zoomed (the reset button shows). */
  viewMoved(on: boolean) { this.vision.showReset(on); }

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
  closeAll() { this.popup.close(); this.fx.clear(); this.panels.close(); this.schem.close(); this.vision.close(); }
  /** This scene is the one on screen: its clock runs and its captions show. */
  private active = false;
  /**
   * The scene is on screen (or not). Its HACK and BOARD buttons show only here, and only when it
   * has devices: in a scene with nothing to hack they stay away (and H and B do nothing).
   */
  show(on: boolean) { this.active = on; this.btns.hidden = !on || !this.hackable; }
  /** The scene has devices, and hacking is yours: hack vision and the board mean something here. */
  get hackable() { return this.model.devices.size > 0 && !this.hackLock(); }

  get visionOn() { return this.vision.isOpen; }
  /** H: hack vision on or off. From an open schematic or panel it goes straight to the world, in vision. */
  toggleVision() {
    this.popup.close();
    if (this.hackLock()) return;
    if (this.vision.isOpen && !this.overlayOpen) { this.vision.setDrawer(false); this.vision.close(); }
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
    this.fx.top = this.uiTop;
    this.vision.top = this.uiTop;
    // captions keep off the player and what the game shields (a speech bubble), and keep their lane over
    // the devices and the people
    const me = project(this.player.x, this.player.h + 23), head = project(this.player.x + 10, this.player.h + 48);
    const hard: Box[] = [{ l: me.x - (head.x - me.x), t: head.y, r: head.x, b: me.y + (me.y - head.y) }, ...this.shield()];
    const soft: Box[] = [...seen.values()].map((a) => ({ l: a.x - a.w / 2, t: a.y - a.h / 2, r: a.x + a.w / 2, b: a.y + a.h / 2 }));
    this.extras().forEach((q) => { const c = project(q.x, q.h + 8), e = project(q.x + 9, q.h + 16); soft.push({ l: c.x - (e.x - c.x), t: e.y, r: e.x, b: c.y + (c.y - e.y) }); });
    soft.push(...this.crowd());
    // an open popup wins the caption lane: captions step aside for it (engine/popup.ts)
    this.fx.update(this.locate, hard, soft, this.popup.boxes);
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
    const items = this.popupItems(id);
    // nothing to do with it yet (hacking locked, no everyday actions): it only shows how it looks
    if (!items.length) { this.say(['', d.look, 'dim'], id); return; }
    this.popupAt = this.player.x;
    this.popup.open(id, d.name, this.model.label('menu.aria', { device: d.name }), items, this.seen.get(id), this.project ? this.room(id) : undefined);
  }

  private popupItems(id: string): PopupItem[] {
    const m = this.model, d = m.devices.get(id)!;
    // the story's everyday actions for this device, in this state (the popup closes first, as for the data's)
    const story = this.story(id)?.map((it) => ({ ...it, run: () => { this.popup.close(); it.run(); } }));
    const items: PopupItem[] = story ?? (d.data.everyday ?? []).flatMap((e) => {
      const n = d.nouns.find((x) => x.id === e.noun);
      // a noun sealed away (or gone) is not everyday any more
      if (!n || (n.sector && m.sealed(id, n.sector))) return [];
      return [{ label: e.label ?? e.verb, cur: n.current?.() === e.verb, run: () => this.everyday(id, e.noun, e.verb) }];
    });
    if (this.hackLock()) return items;
    if (d.data.deck) items.push({ label: m.label('menu.jack'), hack: true, run: () => { this.popup.close(); this.openDevice(id); } });
    items.push({ label: m.label('menu.hack'), hack: true, run: () => this.hackIt(id) });
    return items;
  }

  /**
   * An everyday action: the noun's verb, exactly as a tap on it would run it. The popup
   * closes first, so the scene is free when the reaction plays (its caption, its ping).
   */
  private everyday(dev: string, noun: string, verb: string) {
    this.popup.close();
    this.model.act(dev, noun, verb);
  }

  /** `⌁ hack it`: hack view, this device's circuit unfolded and in view. */
  hackIt(id: string) {
    this.popup.close(); this.panels.close(); this.schem.close();
    if (this.hackLock()) return;
    if (!this.vision.isOpen) this.vision.openVision();
    this.vision.focus(id);
    this.sync();
  }

  /** Open a device's schematic, unless a full trace has you locked out of it. */
  openDevice(id: string) {
    const d = this.model.devices.get(id);
    if (!d || this.hackLock()) return;
    const left = this.model.lockLeft(id);
    if (left) { this.say(this.model.line('trace.locked', { device: d.name, sec: Math.ceil(left / 1000) })); return; }
    this.say(['login ' + id, d.look, 'dim']);
    this.schem.openDevice(id);
  }
  toggleBoard() {
    if (this.hackLock()) return;
    if (!this.schem.known.size) { this.print(this.model.label('board.empty'), 'dim'); return; }
    this.schem.toggleBoard();
  }

  /** Things you can stand next to and press E on: the scene's own (an exit), then every device in the world. */
  targets(): SceneTarget[] {
    const m = this.model, own = this.def.targets?.(m) ?? [];
    const devs = m.spots().map((s: Spot) => ({ id: s.id, x: s.x, y: s.y, label: m.label('prompt.open'), promptH: s.y + Math.min(s.h + 12, 100) }));
    return [...own, ...devs];
  }

  /** E next to a target. Returns the id of one of the scene's exits when the player leaves through it. */
  use(id: string): string | void {
    if (this.model.devices.has(id) && this.model.spots().some((s) => s.id === id)) { this.pick(id); return; }
    // what the scene's own targets say (the pickup tray) stands over them
    return this.def.use?.(id, this.model, (l) => this.say(l, id));
  }

  /** The device in the world under a point (world x, height), smaller things first. */
  spotAt(wx: number, h: number) {
    const hit = this.model.spots().filter((s) => Math.abs(wx - s.x) <= s.w / 2 + 3 && h >= s.y - 4 && h <= s.y + s.h + 4);
    // a big frame (the crane) must not hide the smaller things standing in front of it
    hit.sort((a, b) => a.w - b.w);
    return hit[0]?.id ?? null;
  }

  objective() {
    const next = this.model.data.goals.find((g) => !this.model.goals.has(g.id));
    return next ? next.text : this.model.label('goals.done');
  }

  /** Draw the scene; in hack vision the game draws 'world', mutes it, then 'devices' (see `DrawLayer`). */
  draw(x: CanvasRenderingContext2D, v: View, layer: DrawLayer = 'all') { this.def.drawBackdrop(x, v, { m: this.model, hover: this.hover, layer }); }
}
