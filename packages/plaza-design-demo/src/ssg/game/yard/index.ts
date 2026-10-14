/**
 * The back yard: the first zone on the new hacking system (devices → nouns →
 * verbs, cables between nouns). Downtown still runs on the terminal; this is
 * where the new way gets tuned before the rest of the city moves over.
 *
 * Tap a thing in the yard (or stand next to it and press E) and its schematic
 * opens. B opens the board with every device you have opened or seen, for
 * wiring, and the logic parts (timer, switch). H is hack vision: the yard
 * stays in view, every device on screen shows its nouns in place, and you
 * wire them right there. HACK and BOARD buttons over the canvas say so too.
 * Every action also prints its shell line in the deck's terminal.
 */

import type { LineKind } from '../terminal';
import { type Goal, type Line, YardModel } from './model';
import { Panels } from './panels';
import { type Anchor, Schematic } from './schematic';
import { drawYard, drawYardBackdrop, spotAt, spots, TRAY_X, YARD_EXIT_X } from './scene';

export { YARD_SPAWN, YARD_W } from './scene';

const GOALS: [Goal, string][] = [
  ['find', 'find your parcel'],
  ['chute', 'get it into the chute'],
  ['talk', 'get the hatch to cooperate'],
  ['gate', 'get it through the hatch'],
  ['take', 'pick it up'],
];

export interface YardTarget { id: string; x: number; label: string; promptH: number }
/** World (x along the yard, h above the ground) to CSS px inside the canvas. */
export type Project = (wx: number, h: number) => { x: number; y: number };

export class Yard {
  readonly model: YardModel;
  private schem: Schematic;
  private vision: Schematic;
  private panels: Panels;
  private btns: HTMLDivElement;
  private hackBtn: HTMLButtonElement;
  private boardBtn: HTMLButtonElement;
  hover: string | null = null;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind) => void) {
    this.model = new YardModel({
      say: (l) => this.say(l),
      openCamera: () => this.panels.camera(),
      openTalk: () => this.panels.talk(),
      openBench: () => this.panels.bench(),
      changed: () => { this.schem?.render(); this.vision?.render(); },
      goal: (g) => { this.model.goals.add(g); },
    });
    const known = new Set<string>();
    this.schem = new Schematic(host, this.model, (l) => this.say(l), { known });
    this.vision = new Schematic(host, this.model, (l) => this.say(l), { known, vision: true });
    this.panels = new Panels(host, this.model, (l) => this.say(l));
    this.schem.onClose = () => this.onClose();
    this.vision.onClose = () => { this.sync(); this.onClose(); };
    // you keep walking in hack vision: a tapped verb must not keep the keys (Enter would press it again)
    this.vision.root.addEventListener('click', () => this.onClose(), true);
    this.panels.onClose = () => { if (!this.schem.isOpen) this.onClose(); };

    // HACK and BOARD over the canvas, so nobody has to guess the keys
    this.btns = document.createElement('div'); this.btns.id = 'yard-btns'; this.btns.hidden = true;
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
  /** The HACK and BOARD buttons show in the yard only. */
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
    this.spots().forEach((s) => {
      const c = project(s.x, s.h / 2), e = project(s.x + s.w / 2, s.h);
      const w = (e.x - c.x) * 2, h = (c.y - e.y) * 2;
      if (c.x + w / 2 < 0 || c.x - w / 2 > width) return;
      seen.set(s.id, { x: c.x, y: c.y, w, h });
    });
    this.vision.see(seen);
    this.sync();
  }

  /** Things standing in the world; logic parts live on the board only. */
  private spots() { return spots(this.model).filter((s) => !this.model.devices.get(s.id)?.logic); }

  openDevice(id: string) {
    const d = this.model.devices.get(id);
    if (!d) return;
    this.say(['login ' + id, d.look, 'dim']);
    this.schem.openDevice(id);
  }
  toggleBoard() {
    if (!this.schem.known.size) { this.print('nothing on the board yet: open a device first.', 'dim'); return; }
    this.schem.toggleBoard();
  }

  /** Things you can stand next to and press E on. */
  targets(): YardTarget[] {
    const list: YardTarget[] = [{ id: 'exit', x: YARD_EXIT_X, label: '[E] DOWNTOWN', promptH: 44 }];
    this.spots().forEach((s) => list.push({ id: s.id, x: s.x, label: '[E] OPEN', promptH: Math.min(s.h + 12, 100) }));
    if (this.model.parcelAt === 'tray') list.push({ id: 'tray', x: TRAY_X, label: '[E] TAKE PARCEL', promptH: 26 });
    return list;
  }

  /** E next to a target. Returns 'exit' when the player walks back to Downtown. */
  use(id: string): 'exit' | void {
    if (id === 'exit') return 'exit';
    if (id === 'tray') { const l = this.model.take(); if (l) this.say(l); return; }
    this.openDevice(id);
  }

  spotAt(wx: number, h: number) { const id = spotAt(this.model, wx, h); return id && !this.model.devices.get(id)?.logic ? id : null; }

  objective() {
    const next = GOALS.find(([g]) => !this.model.goals.has(g));
    return next ? next[1] : 'done. the fixer owes you one.';
  }

  /** The yard is walled in, so it draws its own backdrop (after the ground) instead of the open city. */
  draw(x: CanvasRenderingContext2D, v: { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number; viewH: number }) {
    drawYardBackdrop(x, v);
    drawYard(x, this.model, v, this.hover);
  }
}
