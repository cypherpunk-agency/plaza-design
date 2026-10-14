/**
 * The schematic: a device in the middle, its nouns branching out. Tap a noun
 * and its verbs open beside it; tap the device and all of them open.
 *
 * Nouns that raise events carry an orange dot. Drag the dot onto another noun,
 * pick one of that noun's verbs, and the cable carries it:
 * "when the claw dropped → the timer waits 2 s".
 *
 * Two modes over the game canvas: one device (what you tapped in the world),
 * or the board with every device you have opened, for wiring across them.
 * Devices drag from anywhere on their box; nouns drag to sit wherever you like.
 * The board also has the logic parts (+ TIMER, + SWITCH): they live only there,
 * and × on one takes it off again, cables and all.
 *
 * A third mode, hack vision (H), is a separate instance laid into the world:
 * the yard stays visible under a tint, each device on screen is its own core
 * (an outline and a dot), and the same nouns, verbs and cables hang around it,
 * following the camera. What you see there goes on the board.
 *
 * Styles live in render.tsx (`#hack`, `.sch-*`).
 */

import type { Line, Link, YardModel } from './model';

const NS = 'http://www.w3.org/2000/svg';
type P = { x: number; y: number };
/** Where a device stands on screen for hack vision: its box centre and size, in stage px. */
export interface Anchor { x: number; y: number; w: number; h: number }
const DEFAULT_DIR: Record<string, Record<string, string>> = {
  cam: { lens: 'up', motor: 'down', footage: 'right' },
  crane: { arm: 'down', claw: 'up', 'job.log': 'left' },
  gate: { lock: 'left', log: 'up', hinge: 'down' },
};
/** In the world the nouns sit closer, and must not run into the neighbours. */
const VISION_DIR: Record<string, Record<string, string>> = {
  cam: { lens: 'up', motor: 'left', footage: 'down' },
  crane: { arm: 'down', claw: 'up', 'job.log': 'left' },
  gate: { lock: 'left', log: 'up', hinge: 'down' },
};
const HINT = 'tap a noun for its verbs · drag an orange dot onto a noun to wire';
const UNIT: Record<string, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const BOARD_HOME: Record<string, P> = { cam: { x: 0.14, y: 0.3 }, crane: { x: 0.5, y: 0.3 }, gate: { x: 0.86, y: 0.3 } };
const BOARD_CRAFT: P[] = [{ x: 0.6, y: 0.78 }, { x: 0.84, y: 0.78 }, { x: 0.42, y: 0.6 }, { x: 0.72, y: 0.58 }];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}

export class Schematic {
  readonly root: HTMLDivElement;
  private stage: HTMLDivElement;
  private svg: SVGSVGElement;
  private title: HTMLSpanElement;
  private modeBtn: HTMLButtonElement;
  private status: HTMLDivElement;
  private hint: HTMLDivElement;
  private palette: HTMLDivElement;
  private opens = 0;
  private mode: 'device' | 'board' | 'vision' = 'device';
  private dev = '';
  /** Devices you have opened or seen; shared between the overlay and hack vision. */
  readonly known: Set<string>;
  private anchors = new Map<string, Anchor>();
  private open = new Set<string>();
  private armed: string | null = null;
  private pending: { from: string; to: string } | null = null;
  private offsets = new Map<string, P>();
  private boardPos = new Map<string, P>();
  onClose: () => void = () => {};

  constructor(host: HTMLElement, private m: YardModel, private say: (l: Line) => void, opts: { vision?: boolean; known?: Set<string> } = {}) {
    this.known = opts.known ?? new Set();
    this.root = el('div'); this.root.hidden = true;
    const bar = el('div', 'hack-bar');
    this.title = el('span', 'hack-title');
    this.modeBtn = el('button', 'hack-btn'); this.modeBtn.type = 'button';
    this.modeBtn.addEventListener('click', () => (this.mode === 'board' ? this.openDevice(this.dev || [...this.known][0]) : this.openBoard()));
    const close = el('button', 'hack-btn', 'CLOSE ×'); close.type = 'button'; close.addEventListener('click', () => this.close());
    this.hint = el('div', 'hack-hint', HINT);
    bar.append(this.title, this.modeBtn, close, this.hint);
    this.status = el('div', 'hack-status');
    this.stage = el('div', 'hack-stage');
    this.svg = document.createElementNS(NS, 'svg'); this.svg.setAttribute('class', 'hack-wires');
    this.palette = el('div', 'sch-palette'); this.palette.hidden = true;
    this.palette.appendChild(el('span', '', 'LOGIC'));
    (['timer', 'switch'] as const).forEach((kind) => {
      const b = el('button', 'hack-btn', '+ ' + kind.toUpperCase()); b.type = 'button';
      b.addEventListener('click', () => this.addLogic(kind));
      this.palette.appendChild(b);
    });
    this.stage.append(this.svg, this.palette);
    // hack vision has no header: the HACK button outside says it is on, the status sits at the bottom
    if (opts.vision) { this.mode = 'vision'; this.root.id = 'vision'; this.root.append(this.stage, this.status); }
    else { this.root.id = 'hack'; this.root.append(bar, this.status, this.stage); }
    host.appendChild(this.root);
    this.stage.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.sch-core, .sch-noun, .port')) return;
      if (this.armed || this.pending) { this.armed = null; this.pending = null; this.render(); }
    });
    new ResizeObserver(() => { if (!this.root.hidden) this.render(); }).observe(this.stage);
  }

  get isOpen() { return !this.root.hidden; }

  /** The how-to line under the header shows for the first few opens, or until the first cable. */
  private show() {
    if (this.root.hidden) { this.opens++; this.hint.hidden = this.opens > 3 || this.m.links.length > 0; }
    this.root.hidden = false;
  }
  openDevice(id: string) {
    this.known.add(id); this.mode = 'device'; this.dev = id;
    this.show(); this.pending = null; this.armed = null;
    this.render();
  }
  openBoard() {
    if (!this.known.size) return;
    this.mode = 'board'; this.show(); this.render();
  }
  /** Hack vision (the vision instance only): every device on screen, wired in place. */
  openVision() {
    this.root.hidden = false; this.armed = null; this.pending = null;
    this.note(['', 'HACK VISION · ' + HINT + ' · H to leave', 'dim']);
    this.render();
  }
  /** Hack vision follows the camera: where each device on screen stands now. */
  see(next: Map<string, Anchor>) {
    const prev = this.anchors;
    const same = next.size === prev.size && [...next.keys()].every((id) => prev.has(id));
    const moved = [...next].some(([id, a]) => { const b = prev.get(id); return !b || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) > 0.5; });
    if (same && !moved) return;
    this.anchors = next;
    if (this.root.hidden) return;
    if (!same) { this.render(); return; }
    // only the camera moved: shift the groups and keep the DOM, so a gesture in progress survives
    this.stage.querySelectorAll<HTMLElement>('.sch').forEach((g) => {
      const a = next.get(g.dataset.dev!); if (!a) return;
      g.style.left = a.x + 'px'; g.style.top = a.y + 'px';
      const box = g.querySelector<HTMLElement>('.vis-outline');
      if (box) { box.style.width = a.w + 'px'; box.style.height = a.h + 'px'; }
    });
    this.lines();
  }
  /** Hack vision: a tap on a device in the world opens all its verbs; a tap on nothing drops the cable in hand. */
  poke(id: string | null) {
    if (this.armed || this.pending || !id) { this.armed = null; this.pending = null; this.render(); return; }
    this.toggleAll(id);
  }
  toggleBoard() { if (this.mode === 'board' && this.isOpen) this.openDevice(this.dev || [...this.known][0]); else this.openBoard(); }
  close() { if (this.root.hidden) return; this.root.hidden = true; this.armed = null; this.pending = null; this.onClose(); }
  note(l: Line) { this.status.textContent = (l[0] ? '> ' + l[0] + '   ' : '') + l[1]; this.status.className = 'hack-status ' + (l[2] ?? ''); }

  // ---------- layout ----------

  private offset(dev: string, noun: string, i: number): P {
    const key = dev + '.' + noun;
    let o = this.offsets.get(key);
    if (!o) {
      const d = this.m.devices.get(dev)!;
      const u = UNIT[this.mode === 'vision'
        ? (VISION_DIR[dev] ?? {})[noun] ?? ['up', 'down'][i % 2]
        : (DEFAULT_DIR[dev] ?? {})[noun] ?? (d.crafted ? ['up', 'right', 'down', 'left'][i % 4] : 'up')];
      o = this.mode === 'vision' ? { x: u.x * 60, y: u.y * 44 } : { x: u.x * 104, y: u.y * 70 };
      this.offsets.set(key, o);
    }
    return o;
  }
  private centre(dev: string): P {
    if (this.mode === 'vision') return this.anchors.get(dev) ?? { x: -999, y: -999 };
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (this.mode === 'device') return { x: W / 2, y: H / 2 };
    let p = this.boardPos.get(dev);
    if (!p) {
      const crafted = [...this.m.devices.values()].filter((d) => d.crafted).map((d) => d.id);
      p = BOARD_HOME[dev] ?? BOARD_CRAFT[crafted.indexOf(dev) % BOARD_CRAFT.length];
      p = { ...p }; this.boardPos.set(dev, p);
    }
    return { x: p.x * W, y: p.y * H };
  }

  // ---------- drawing ----------

  render() {
    if (this.root.hidden) return;
    const d = this.m.devices.get(this.dev);
    this.title.textContent = this.mode === 'board' ? 'SCHEMATIC · ' + this.known.size + ' devices' : (d?.name ?? '') + ' · schematic';
    this.modeBtn.textContent = this.mode === 'board' ? 'THIS DEVICE' : 'BOARD · B';
    this.palette.hidden = this.mode !== 'board';
    this.stage.querySelectorAll('.sch').forEach((g) => g.remove());
    // things you crafted are yours: they are on the board from the start
    [...this.m.devices.values()].filter((x) => x.crafted).forEach((x) => this.known.add(x.id));
    const ids = (this.mode === 'board' ? [...this.known] : this.mode === 'vision' ? [...this.anchors.keys()] : [this.dev])
      .filter((id) => this.m.devices.has(id));
    // what you have seen in hack vision you can wire from the board
    if (this.mode === 'vision') ids.forEach((id) => this.known.add(id));
    ids.forEach((id) => this.stage.appendChild(this.group(id)));
    this.lines();
  }

  private group(id: string) {
    const d = this.m.devices.get(id)!;
    const g = el('div', 'sch' + (d.crafted ? ' crafted' : '')); g.dataset.dev = id;
    const c = this.centre(id); g.style.left = c.x + 'px'; g.style.top = c.y + 'px';
    const core = el('div', 'sch-core');
    if (this.mode === 'vision') {
      // the device in the world is the core: an outline round it, and a dot to tap
      const a = this.anchors.get(id)!, box = el('div', 'vis-outline');
      box.style.width = a.w + 'px'; box.style.height = a.h + 'px';
      box.appendChild(el('span', 'vis-name', d.name));
      g.appendChild(box);
      core.title = d.name + ': ' + d.status();
    } else core.append(el('div', 'sch-name', d.name), el('div', 'sch-st', d.status()));
    if (d.logic && this.mode !== 'vision') {
      const x = el('button', 'sch-x', '×'); x.type = 'button';
      x.setAttribute('aria-label', 'remove ' + d.name);
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', (e) => { e.stopPropagation(); this.removeLogic(id); });
      core.appendChild(x);
    }
    this.coreGestures(core, g, id);
    g.appendChild(core);
    d.nouns.forEach((n, i) => {
      const key = id + '.' + n.id, o = this.offset(id, n.id, i);
      const choosing = this.pending?.to === key;
      const node = el('div', 'sch-noun' + (this.open.has(key) || choosing ? ' open' : '') + (choosing ? ' choosing' : '') + (this.armed ? ' target' : ''));
      node.dataset.target = key; node.style.left = o.x + 'px'; node.style.top = o.y + 'px';
      const label = el('div', 'sch-label'); label.append(el('span', '', n.id), el('small', '', n.kind));
      node.appendChild(label);
      (n.events ?? []).forEach((ev) => node.appendChild(this.eventDot(key + ':' + ev, ev)));
      if (this.open.has(key) || choosing) node.appendChild(this.verbs(id, n.id, key, o, choosing));
      this.nounGestures(node, key);
      g.appendChild(node);
    });
    return g;
  }

  private verbs(dev: string, noun: string, key: string, o: P, choosing: boolean) {
    const side = Math.abs(o.x) >= Math.abs(o.y) ? (o.x >= 0 ? 'right' : 'left') : (o.y >= 0 ? 'down' : 'up');
    const box = el('div', 'sch-verbs ' + side + (choosing ? ' choosing' : ''));
    if (choosing) box.appendChild(el('span', 'sch-when', 'when ' + this.pending!.from.split('.')[1].replace(':', ' ') + ' →'));
    const n = this.m.noun(key)!;
    const cur = n.current?.() ?? null;
    n.verbs.forEach((v) => {
      const b = el('button', 'sch-verb' + (v === cur && !choosing ? ' cur' : ''), v); b.type = 'button';
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (choosing) { const p = this.pending!; this.pending = null; const l = this.m.connect(p.from, p.to, v); this.say(l); }
        else this.m.act(dev, noun, v);
      });
      box.appendChild(b);
    });
    return box;
  }

  private eventDot(key: string, label: string) {
    const b = el('button', 'port' + (this.armed === key ? ' armed' : '')); b.type = 'button'; b.dataset.port = key;
    b.setAttribute('aria-label', 'event ' + key + ': drag onto another noun');
    b.append(el('span', '', label), el('i'));
    b.addEventListener('pointerdown', (e) => this.startWire(e, key));
    b.addEventListener('click', (e) => e.stopPropagation());
    return b;
  }

  private pt(e: Element): P { const r = e.getBoundingClientRect(), s = this.stage.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; }
  private path(a: P, b: P, cls: string, curve = false) {
    const p = document.createElementNS(NS, 'path');
    const mx = (a.x + b.x) / 2;
    p.setAttribute('d', curve ? `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`);
    p.setAttribute('class', cls); this.svg.appendChild(p); return p;
  }

  private lines() {
    this.svg.querySelectorAll('path:not(.temp), text').forEach((p) => p.remove());
    this.stage.querySelectorAll('.sch').forEach((g) => {
      const c = this.pt(g.querySelector('.sch-core')!);
      g.querySelectorAll('.sch-noun').forEach((n) => {
        const q = this.pt(n.querySelector('.sch-label')!);
        this.path(c, q, 'branch');
        const v = n.querySelector('.sch-verbs'); if (v) this.path(q, this.pt(v), 'branch');
      });
    });
    this.m.links.forEach((l) => this.cable(l));
  }

  private cable(l: Link) {
    const a = this.stage.querySelector(`[data-port="${l.from}"] i`), b = this.stage.querySelector(`[data-target="${l.to}"] .sch-label`);
    if (!a || !b) return;
    const P1 = this.pt(a), P2 = this.pt(b);
    const hit = this.path(P1, P2, 'hit', true);
    hit.addEventListener('click', (e) => { e.stopPropagation(); this.say(this.m.cut(l)); });
    this.path(P1, P2, 'cable' + (this.m.live.has(l) ? ' live' : ''), true);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String((P1.x + P2.x) / 2)); t.setAttribute('y', String((P1.y + P2.y) / 2 - 6));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'verb'); t.textContent = l.verb;
    this.svg.appendChild(t);
  }

  // ---------- gestures ----------

  /** Device box: drag it (board) or tap it to open all its verbs. */
  private coreGestures(core: HTMLElement, g: HTMLElement, id: string) {
    core.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, start = this.boardPos.get(id) ?? { x: 0, y: 0 };
      let moved = false;
      const mv = (ev: PointerEvent) => {
        if (this.mode !== 'board') return;
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
        if (!moved) return;
        const W = this.stage.clientWidth, H = this.stage.clientHeight;
        const p = { x: Math.max(0.04, Math.min(0.96, start.x + (ev.clientX - sx) / W)), y: Math.max(0.06, Math.min(0.94, start.y + (ev.clientY - sy) / H)) };
        this.boardPos.set(id, p);
        g.style.left = p.x * W + 'px'; g.style.top = p.y * H + 'px';
        this.lines();
      };
      const up = () => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (!moved) this.toggleAll(id);
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  /** Open every verb of a device, or close them all if they are all open. */
  private toggleAll(id: string) {
    const keys = this.m.devices.get(id)!.nouns.map((n) => id + '.' + n.id);
    const all = keys.every((k) => this.open.has(k));
    keys.forEach((k) => (all ? this.open.delete(k) : this.open.add(k)));
    this.render();
  }

  /** Noun: drag it to a new spot around its device, or tap it to open its verbs. */
  private nounGestures(node: HTMLElement, key: string) {
    node.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.port, .sch-verb')) return;
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, o0 = { ...this.offsets.get(key)! };
      let moved = false;
      const mv = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
        if (!moved) return;
        const o = { x: o0.x + ev.clientX - sx, y: o0.y + ev.clientY - sy };
        this.offsets.set(key, o);
        node.style.left = o.x + 'px'; node.style.top = o.y + 'px';
        this.lines();
      };
      const up = () => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (moved) { this.render(); return; }
        if (this.armed) { this.propose(this.armed, key); return; }
        this.pending = null;
        if (this.open.has(key)) this.open.delete(key); else this.open.add(key);
        this.render();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  private startWire(e: PointerEvent, key: string) {
    e.preventDefault(); e.stopPropagation();
    this.armed = key; this.pending = null; this.render();
    const sx = e.clientX, sy = e.clientY;
    let temp: SVGPathElement | null = null;
    const mv = (ev: PointerEvent) => {
      const from = this.stage.querySelector(`[data-port="${key}"] i`); if (!from) return;
      const s = this.stage.getBoundingClientRect();
      temp?.remove(); temp = this.path(this.pt(from), { x: ev.clientX - s.left, y: ev.clientY - s.top }, 'temp', true);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      temp?.remove();
      // only this layer's nouns: hack vision may lie under the board
      const target = document.elementsFromPoint(ev.clientX, ev.clientY).filter((x) => this.stage.contains(x))
        .map((x) => x.closest('[data-target]') as HTMLElement | null).find(Boolean);
      if (target) this.propose(key, target.dataset.target!);
      else if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) { this.armed = null; this.render(); }
      else this.note(['', this.mode === 'device' ? 'cable in hand. tap a noun, or open the BOARD to reach other devices.' : 'cable in hand. tap the noun it should reach.', 'dim']);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  // ---------- logic parts ----------

  /** + TIMER / + SWITCH: a new part on the board, next to the palette, its verbs open. */
  private addLogic(kind: 'timer' | 'switch') {
    const id = this.m.addLogic(kind);
    const n = [...this.m.devices.values()].filter((d) => d.logic).length - 1;
    this.known.add(id);
    this.boardPos.set(id, { x: 0.14 + 0.15 * (n % 5), y: n % 10 < 5 ? 0.72 : 0.56 });
    this.m.devices.get(id)?.nouns.forEach((x) => this.open.add(id + '.' + x.id));
    this.say(['add ' + kind, kind + ' on the board. wire an event into it, and it out.', 'ok']);
    this.render();
  }

  private removeLogic(id: string) {
    const name = this.m.devices.get(id)?.name ?? id;
    this.m.removeDevice(id);
    this.known.delete(id); this.boardPos.delete(id);
    this.open.forEach((k) => { if (k.startsWith(id + '.')) this.open.delete(k); });
    this.armed = null; this.pending = null;
    if (this.dev === id) this.dev = '';
    this.say(['rm ' + id, name.toLowerCase() + ' removed, and its cables with it.', 'dim']);
    if (this.mode === 'device') { if (this.known.size) this.openBoard(); else this.close(); return; }
    this.render();
  }

  private propose(from: string, to: string) {
    this.armed = null;
    if (from.split(':')[0] === to) { this.note(['', 'a noun cannot wire to itself. it tried.', 'dim']); this.render(); return; }
    this.pending = { from, to }; this.open.add(to);
    this.note(['wire ' + from + ' → ' + to, 'pick what ' + to.split('.')[1] + ' should do when that happens.', 'dim']);
    this.render();
  }
}
