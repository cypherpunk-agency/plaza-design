/**
 * A zone on screen: its model, the schematic overlay, hack vision, its panels,
 * the HACK and BOARD buttons, and its part of the save. One class for every
 * zone; what differs is the zone's data, its rules (effects) and its view
 * (scene drawing, extra panels, extra things to press E on): a `ZoneDef`.
 *
 * Tap a thing in the world (or stand next to it and press E) and its schematic
 * opens. B opens the board with every device you have opened or seen, for
 * wiring, and the logic parts (timer, switch). H is hack vision: the zone
 * stays in view, every device on screen shows its nouns in place, and you
 * wire them right there. Every action also prints its shell line in the
 * deck's terminal.
 *
 * Progress (state, goals, cables, placed parts, sectors, the net, the board's
 * layout) goes into the game's save as one `ZoneSave` (`save.zones.<id>`), a
 * moment after things settle, and on `persist()` (leaving, stopping the game).
 * The keyring and the modules are the player's, across zones.
 */

import type { ZoneData, ZoneSave } from '../data/types';
import type { LineKind } from '../terminal';
import { type Line, type Spot, ZoneModel } from './model';
import { type PanelFn, Panels } from './panels';
import type { ZoneRules } from './rules';
import { type Anchor, Schematic } from './schematic';

/** Something to stand next to and press E on. */
export interface ZoneTarget { id: string; x: number; label: string; promptH: number }

/** How the game's canvas maps world units for a zone's drawing. */
export interface DrawView { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number; viewH: number }

/** A zone's code on the screen side: its scene, its own panels, its extra targets. */
export interface ZoneView {
  /** Panels this zone adds to the engine's `talk` (the yard's `camera`). Must match `rules.panels`. */
  panels?: Record<string, PanelFn>;
  /** Draw the zone (its backdrop and its things) after the ground. `hover`: the device under the pointer. */
  draw(x: CanvasRenderingContext2D, m: ZoneModel, v: DrawView, hover: string | null): void;
  /** Things to press E on besides the devices (an exit, a pickup tray). */
  targets?(m: ZoneModel): ZoneTarget[];
  /** E on one of those. Return 'exit' to walk out of the zone. */
  use?(id: string, m: ZoneModel, say: (l: Line) => void): 'exit' | void;
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
  /** This zone's saved progress, if any. */
  load: () => ZoneSave | undefined;
  /** Keep this as the zone's progress (and write the save). */
  store: (z: ZoneSave) => void;
}

/** How long things must be quiet before the zone writes the save. */
const SAVE_AFTER_MS = 800;
/** How often trace moves. */
const TICK_MS = 250;
/** World (x along the zone, h above the ground) to CSS px inside the canvas. */
export type Project = (wx: number, h: number) => { x: number; y: number };

export class ZoneHost {
  readonly model: ZoneModel;
  private schem: Schematic;
  private vision: Schematic;
  private panels: Panels;
  private btns: HTMLDivElement;
  private hackBtn: HTMLButtonElement;
  private boardBtn: HTMLButtonElement;
  hover: string | null = null;
  onClose: () => void = () => {};
  private saveTimer = 0;
  private saved = '';

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind) => void, private store: ZoneStore | undefined, readonly def: ZoneDef) {
    this.model = new ZoneModel({
      say: (l) => this.say(l),
      open: (panel, arg) => this.panels.open(panel, arg),
      changed: () => { this.schem?.render(); this.vision?.render(); this.dirty(); },
      kick: (dev) => { if (this.schem.viewing === dev) this.schem.close(); },
      modules: store ? () => store.modules() : undefined,
      keyring: store ? () => store.keyring() : undefined,
      give: store ? (id) => store.give(id) : undefined,
    }, def.data, def.rules);
    const known = new Set<string>();
    this.schem = new Schematic(host, this.model, (l) => this.say(l), { known });
    this.vision = new Schematic(host, this.model, (l) => this.say(l), { known, vision: true });
    this.panels = new Panels(host, this.model, (l) => this.say(l), def.view.panels);
    this.schem.onLayout = () => this.dirty();
    this.vision.onLayout = () => this.dirty();
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
    const saved = store?.load();
    if (saved) this.restore(saved);
    this.saved = JSON.stringify(this.snapshot());
    this.sync();
    // trace: the meter fills while you look into a logged device, and drains when you leave
    let last = performance.now();
    window.setInterval(() => {
      const now = performance.now();
      this.model.viewing = new Set(this.schem.viewing ? [this.schem.viewing] : []);
      if (this.model.tick(now - last, !this.btns.hidden)) { this.schem.meters(); this.vision.meters(); }
      last = now;
    }, TICK_MS);
  }

  get id() { return this.def.data.id; }

  // ---------- the save ----------

  /** Everything the save keeps about the zone. */
  snapshot(): ZoneSave {
    const board = this.schem.layout();
    return { ...this.model.snapshot(), board: { known: [...this.schem.known], pos: board.pos, offsets: board.offsets, vision: this.vision.layout().offsets } };
  }

  private restore(z: ZoneSave) {
    this.model.restore(z);
    this.schem.known.clear();
    (z.board?.known ?? []).forEach((id) => { if (this.model.devices.has(id)) this.schem.known.add(id); });
    this.schem.restoreLayout({ pos: z.board?.pos, offsets: z.board?.offsets });
    this.vision.restoreLayout({ offsets: z.board?.vision });
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
    if (l[0]) this.print('> ' + l[0], 'in');
    if (l[1]) this.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : l[2] === 'dim' ? 'dim' : 'out');
    this.schem.note(l); this.vision.note(l);
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

  get overlayOpen() { return this.schem.isOpen || this.panels.isOpen; }
  closeOverlay() { if (this.panels.isOpen) this.panels.close(); else this.schem.close(); }
  closeAll() { this.panels.close(); this.schem.close(); this.vision.close(); }
  /** The HACK and BOARD buttons show in this zone only. */
  show(on: boolean) { this.btns.hidden = !on; }

  get visionOn() { return this.vision.isOpen; }
  /** H: hack vision on or off. From an open schematic or panel it goes straight to the world, in vision. */
  toggleVision() {
    if (this.vision.isOpen && !this.overlayOpen) this.vision.close();
    else { this.panels.close(); this.schem.close(); this.vision.openVision(); }
    this.sync();
  }
  /** A tap on the canvas in hack vision: on a device, all its verbs; on nothing, drop the cable in hand. */
  poke(id: string | null) { this.vision.poke(id); }

  /** Every frame: where each device stands on screen, so hack vision follows the camera. */
  follow(project: Project, width: number) {
    const seen = new Map<string, Anchor>();
    this.model.spots().forEach((s) => {
      const c = project(s.x, s.h / 2), e = project(s.x + s.w / 2, s.h);
      const w = (e.x - c.x) * 2, h = (c.y - e.y) * 2;
      if (c.x + w / 2 < 0 || c.x - w / 2 > width) return;
      seen.set(s.id, { x: c.x, y: c.y, w, h });
    });
    this.vision.see(seen);
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
    const devs = m.spots().map((s: Spot) => ({ id: s.id, x: s.x, label: m.label('prompt.open'), promptH: Math.min(s.h + 12, 100) }));
    return [...own, ...devs];
  }

  /** E next to a target. Returns 'exit' when the player walks out of the zone. */
  use(id: string): 'exit' | void {
    if (this.model.devices.has(id) && this.model.spots().some((s) => s.id === id)) { this.openDevice(id); return; }
    return this.def.view.use?.(id, this.model, (l) => this.say(l));
  }

  /** The device in the world under a point (world x, height), smaller things first. */
  spotAt(wx: number, h: number) {
    const hit = this.model.spots().filter((s) => Math.abs(wx - s.x) <= s.w / 2 + 3 && h >= -4 && h <= s.h + 4);
    // a big frame (the crane) must not hide the smaller things standing in front of it
    hit.sort((a, b) => a.w - b.w);
    return hit[0]?.id ?? null;
  }

  objective() {
    const next = this.model.zone.goals.find((g) => !this.model.goals.has(g.id));
    return next ? next.text : this.model.label('goals.done');
  }

  draw(x: CanvasRenderingContext2D, v: DrawView) { this.def.view.draw(x, this.model, v, this.hover); }
}
