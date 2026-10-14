/**
 * The back yard: the first zone on the new hacking system (devices → nouns →
 * verbs, cables between nouns). Downtown still runs on the terminal; this is
 * where the new way gets tuned before the rest of the city moves over.
 *
 * Tap a thing in the yard (or stand next to it and press E) and its schematic
 * opens. B opens the board with every device you have opened, for wiring.
 * Every action also prints its shell line in the deck's terminal.
 */

import type { LineKind } from '../terminal';
import { type Goal, type Line, YardModel } from './model';
import { Panels } from './panels';
import { Schematic } from './schematic';
import { drawYard, spotAt, spots, TRAY_X, YARD_EXIT_X } from './scene';

export { YARD_SPAWN, YARD_W } from './scene';

export interface YardTarget { id: string; x: number; label: string; promptH: number }

export class Yard {
  readonly model: YardModel;
  private schem: Schematic;
  private panels: Panels;
  hover: string | null = null;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind) => void) {
    this.model = new YardModel({
      say: (l) => this.say(l),
      openCamera: () => this.panels.camera(),
      openTalk: () => this.panels.talk(),
      changed: () => this.schem?.render(),
      goal: (g) => { this.model.goals.add(g); },
    });
    this.schem = new Schematic(host, this.model, (l) => this.say(l));
    this.panels = new Panels(host, this.model, (l) => this.say(l));
    this.schem.onClose = () => this.onClose();
    this.panels.onClose = () => { if (!this.schem.isOpen) this.onClose(); };
  }

  private say(l: Line) {
    if (l[0]) this.print('> ' + l[0], 'in');
    if (l[1]) this.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : l[2] === 'dim' ? 'dim' : 'out');
    this.schem.note(l);
  }

  get overlayOpen() { return this.schem.isOpen || this.panels.isOpen; }
  closeOverlay() { if (this.panels.isOpen) this.panels.close(); else this.schem.close(); }
  closeAll() { this.panels.close(); this.schem.close(); }

  openDevice(id: string) {
    const d = this.model.devices.get(id);
    if (!d) return;
    this.say(['login ' + id, d.look, 'dim']);
    this.schem.openDevice(id);
  }
  toggleBoard() {
    if (!this.schem.known.size) { this.print(this.model.label('board.empty'), 'dim'); return; }
    this.schem.toggleBoard();
  }

  /** Things you can stand next to and press E on. */
  targets(): YardTarget[] {
    const m = this.model;
    const list: YardTarget[] = [{ id: 'exit', x: YARD_EXIT_X, label: m.label('prompt.exit'), promptH: 44 }];
    // the scene may still draw things that are no longer devices (the old workbench)
    spots(m).filter((s) => m.devices.has(s.id)).forEach((s) => list.push({ id: s.id, x: s.x, label: m.label('prompt.open'), promptH: Math.min(s.h + 12, 100) }));
    if (m.parcelAt === 'tray') list.push({ id: 'tray', x: TRAY_X, label: m.label('prompt.take'), promptH: 26 });
    return list;
  }

  /** E next to a target. Returns 'exit' when the player walks back to Downtown. */
  use(id: string): 'exit' | void {
    if (id === 'exit') return 'exit';
    if (id === 'tray') { const l = this.model.take(); if (l) this.say(l); return; }
    this.openDevice(id);
  }

  spotAt(wx: number, h: number) { const id = spotAt(this.model, wx, h); return id && this.model.devices.has(id) ? id : null; }

  objective() {
    const next = this.model.zone.goals.find((g) => !this.model.goals.has(g.id as Goal));
    return next ? next.text : this.model.label('goals.done');
  }

  draw(x: CanvasRenderingContext2D, v: { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number }) {
    drawYard(x, this.model, v, this.hover);
  }
}
