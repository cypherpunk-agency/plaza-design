/**
 * The schematic: a device in the middle, its nouns branching out. Tap a noun
 * and its verbs open beside it; tap the device and all of them open.
 *
 * Nouns that raise events carry an orange dot. Drag the dot onto another noun,
 * pick one of that noun's verbs, and the cable carries it:
 * "when the claw dropped → the timer waits 2 s". Pre-wired cables look and
 * cut the same.
 *
 * Two modes over the game canvas: one device (what you tapped in the world),
 * or the board with every device you have opened, for wiring across them.
 * Devices drag from anywhere on their box; nouns drag to sit wherever you like.
 * The board also has the logic parts (+ TIMER, + SWITCH): they live only there,
 * and × on one takes it off again, cables and all. Each is a module the player
 * owns (timer.so); one not found yet shows as a dashed ??? slot.
 *
 * The hacking layer shows here too: nouns in a sealed sector are dashed `???`
 * (tap one to hear what the seal wants), a GUARD's verbs are the clue fragments
 * on your keyring plus `type…` (a small input), the keyring's chips drag onto a
 * guard or a seal, a logged device carries a trace meter, and nodes seen on a
 * scan sit on the board as silhouettes until you connect them.
 *
 * Where devices and nouns sit is part of the save: `layout()` / `restoreLayout()`.
 * Their defaults come from the zone data (`layout.board`, `layout.dir`).
 *
 * A third mode, hack vision (H), is a separate instance laid into the world:
 * the zone stays visible under a tint, each device on screen is its own core
 * (an outline and a dot), and the same nouns, verbs and cables hang around it,
 * following the camera. What you see there goes on the board.
 *
 * Styles live in render.tsx (`#hack`, `.sch-*`).
 */

import type { Pt } from '../data/types';
import type { Line, Link, ZoneModel } from './model';
import { drawWatchdogs } from './watchdog-view';

const NS = 'http://www.w3.org/2000/svg';
type P = { x: number; y: number };
/** Where a device stands on screen for hack vision: its box centre and size, in stage px. */
export interface Anchor { x: number; y: number; w: number; h: number }
const HINT = 'tap a noun for its verbs · drag an orange dot onto a noun to wire';
const UNIT: Record<string, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
/** Where logic parts land on the board when nothing else says. */
const BOARD_CRAFT: P[] = [{ x: 0.6, y: 0.78 }, { x: 0.84, y: 0.78 }, { x: 0.42, y: 0.6 }, { x: 0.72, y: 0.58 }];
/** Where net nodes (and devices without `layout.board`) land: a row under the zone's own devices. */
const BOARD_NET: P[] = [{ x: 0.5, y: 0.6 }, { x: 0.28, y: 0.62 }, { x: 0.72, y: 0.62 }, { x: 0.12, y: 0.66 }, { x: 0.88, y: 0.66 }];

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
  private ring: HTMLDivElement;
  private opens = 0;
  private mode: 'device' | 'board' | 'vision' = 'device';
  private dev = '';
  /** Devices you have opened or seen; shared between the overlay and hack vision. */
  readonly known: Set<string>;
  private anchors = new Map<string, Anchor>();
  private open = new Set<string>();
  private armed: string | null = null;
  private pending: { from: string; to: string } | null = null;
  /** A keyring chip in hand (tapped, not dragged): the next noun tapped gets it. */
  private chip: string | null = null;
  /** The GUARD whose keyboard input is open, and what is typed so far (it survives a redraw). */
  private typing: string | null = null;
  private draft = '';
  private offsets = new Map<string, P>();
  private boardPos = new Map<string, P>();
  private slots: { kind: string; btn: HTMLButtonElement }[] = [];
  onClose: () => void = () => {};
  /** A device or noun was moved by hand (for the save). */
  onLayout: () => void = () => {};

  constructor(host: HTMLElement, private m: ZoneModel, private say: (l: Line) => void, opts: { vision?: boolean; known?: Set<string> } = {}) {
    this.known = opts.known ?? new Set();
    this.root = el('div'); this.root.hidden = true;
    const bar = el('div', 'hack-bar');
    this.title = el('span', 'hack-title');
    this.modeBtn = el('button', 'hack-btn'); this.modeBtn.type = 'button';
    this.modeBtn.addEventListener('click', () => (this.mode === 'board' ? this.openDevice(this.dev || [...this.known][0]) : this.openBoard()));
    const close = el('button', 'hack-btn', m.label('ui.close')); close.type = 'button'; close.addEventListener('click', () => this.close());
    this.hint = el('div', 'hack-hint', HINT);
    bar.append(this.title, this.modeBtn, close, this.hint);
    this.status = el('div', 'hack-status');
    this.stage = el('div', 'hack-stage');
    this.svg = document.createElementNS(NS, 'svg'); this.svg.setAttribute('class', 'hack-wires');
    this.palette = el('div', 'sch-palette'); this.palette.hidden = true;
    this.palette.appendChild(el('span', '', 'LOGIC'));
    m.logic.modules.forEach((mod) => {
      const b = el('button', 'hack-btn'); b.type = 'button';
      b.addEventListener('click', () => this.addLogic(mod.part.id));
      this.palette.appendChild(b);
      this.slots.push({ kind: mod.part.id, btn: b });
    });
    this.ring = el('div', 'sch-keyring'); this.ring.hidden = true;
    this.stage.append(this.svg, this.palette, this.ring);
    // hack vision has no header: the HACK button outside says it is on, the status sits at the bottom
    if (opts.vision) { this.mode = 'vision'; this.root.id = 'vision'; this.root.append(this.stage, this.status); }
    else { this.root.id = 'hack'; this.root.append(bar, this.status, this.stage); }
    host.appendChild(this.root);
    this.stage.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.sch-core, .sch-noun, .port, .sch-chip, .sch-guess')) return;
      if (this.armed || this.pending || this.chip) { this.armed = null; this.pending = null; this.chip = null; this.render(); }
    });
    new ResizeObserver(() => { if (!this.root.hidden) this.render(); }).observe(this.stage);
  }

  get isOpen() { return !this.root.hidden; }
  /** The device you are looking into (for trace): one device's schematic, open. */
  get viewing() { return this.isOpen && this.mode === 'device' ? this.dev : null; }

  /** The how-to line under the header shows for the first few opens, or until the first cable. */
  private show() {
    if (this.root.hidden) { this.opens++; this.hint.hidden = this.opens > 3 || this.m.links.length > 0; }
    this.root.hidden = false;
  }
  openDevice(id: string) {
    this.known.add(id); this.mode = 'device'; this.dev = id;
    this.show(); this.pending = null; this.armed = null; this.chip = null;
    this.render();
  }
  openBoard() {
    if (!this.known.size) return;
    this.mode = 'board'; this.show(); this.render();
  }
  /** Hack vision (the vision instance only): every device on screen, wired in place. */
  openVision() {
    this.root.hidden = false; this.armed = null; this.pending = null; this.chip = null;
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
    if (this.armed || this.pending || this.chip || !id) { this.armed = null; this.pending = null; this.chip = null; this.render(); return; }
    this.toggleAll(id);
  }
  toggleBoard() { if (this.mode === 'board' && this.isOpen) this.openDevice(this.dev || [...this.known][0]); else this.openBoard(); }
  close() { if (this.root.hidden) return; this.root.hidden = true; this.armed = null; this.pending = null; this.chip = null; this.typing = null; this.onClose(); }
  note(l: Line) { this.status.textContent = (l[0] ? '> ' + l[0] + '   ' : '') + l[1]; this.status.className = 'hack-status ' + (l[2] ?? ''); }

  /**
   * Trace moved: update the meters and lock countdowns in place (a full redraw
   * would break a drag in progress). Redraws only when a meter is missing.
   */
  meters() {
    if (this.root.hidden) return;
    const shown = new Set<string>();
    this.stage.querySelectorAll<HTMLElement>('.sch-trace').forEach((e) => {
      const id = e.dataset.dev!, v = this.m.traceOf(id);
      shown.add(id);
      // [ui] trace says its number; a lockout turns the meter into its countdown
      const lock = this.m.lockLeft(id), span = this.m.lockSpan(id);
      e.querySelector('i')!.style.width = (lock ? (lock / Math.max(1, span)) * 100 : v) + '%';
      e.querySelector('b')!.textContent = lock ? this.m.label('lock.meter', { sec: Math.ceil(lock / 1000) }) : this.m.label('trace.meter', { pct: Math.round(v) });
      e.classList.toggle('hot', !lock && v >= 70);
      e.classList.toggle('lock', !!lock);
      e.title = 'trace ' + Math.round(v) + '%';
    });
    this.stage.querySelectorAll<HTMLElement>('[data-lock]').forEach((e) => { e.textContent = this.lockText(e.dataset.lock!); });
    drawWatchdogs(this.stage, this.m, this.mode);
    const want = this.ids().filter((id) => this.metered(id));
    if (want.some((id) => !shown.has(id))) this.render();
  }

  // ---------- layout ----------

  /** Where things sit, for the save: device positions (board) and noun offsets. */
  layout(): { pos: Record<string, Pt>; offsets: Record<string, Pt> } {
    const obj = (m: Map<string, P>) => Object.fromEntries([...m].map(([k, p]) => [k, { x: p.x, y: p.y }]));
    return { pos: obj(this.boardPos), offsets: obj(this.offsets) };
  }
  restoreLayout(l: { pos?: Record<string, Pt>; offsets?: Record<string, Pt> }) {
    const ok = (p: unknown): p is P => !!p && typeof (p as P).x === 'number' && typeof (p as P).y === 'number';
    this.boardPos.clear(); this.offsets.clear();
    for (const [k, p] of Object.entries(l.pos ?? {})) if (ok(p)) this.boardPos.set(k, { x: p.x, y: p.y });
    for (const [k, p] of Object.entries(l.offsets ?? {})) if (ok(p)) this.offsets.set(k, { x: p.x, y: p.y });
    this.render();
  }
  /** Forget where everything sat and which verbs were open (a zone reset). The shared `known` is the owner's to clear. */
  resetLayout() {
    this.boardPos.clear(); this.offsets.clear(); this.open.clear();
    this.armed = null; this.pending = null; this.chip = null; this.typing = null; this.dev = '';
    this.render();
  }

  private offset(dev: string, noun: string, i: number): P {
    const key = dev + '.' + noun;
    let o = this.offsets.get(key);
    if (!o) {
      const d = this.m.devices.get(dev)!, l = d.data.layout;
      const u = UNIT[this.mode === 'vision'
        ? l?.vision?.[noun] ?? ['up', 'down'][i % 2]
        : l?.dir?.[noun] ?? (d.crafted || d.node || !l?.dir ? ['up', 'right', 'down', 'left'][i % 4] : 'up')];
      o = this.mode === 'vision' ? { x: u.x * 60, y: u.y * 44 } : { x: u.x * 104, y: u.y * 70 };
      this.offsets.set(key, o);
    }
    return o;
  }
  /** A device's (or a silhouette's) home on the board: its data says, else the next free slot. */
  private home(id: string): P {
    const d = this.m.devices.get(id);
    if (d?.data.layout?.board) return { ...d.data.layout.board };
    if (d?.crafted) {
      const crafted = [...this.m.devices.values()].filter((x) => x.crafted).map((x) => x.id);
      return { ...BOARD_CRAFT[crafted.indexOf(id) % BOARD_CRAFT.length] };
    }
    const others = [...new Set([...this.m.net.keys(), ...[...this.m.devices.values()].filter((x) => !x.crafted && !x.data.layout?.board).map((x) => x.id)])];
    return { ...BOARD_NET[Math.max(0, others.indexOf(id)) % BOARD_NET.length] };
  }
  private centre(dev: string): P {
    if (this.mode === 'vision') return this.anchors.get(dev) ?? { x: -999, y: -999 };
    const W = this.stage.clientWidth, H = this.stage.clientHeight;
    if (this.mode === 'device') return { x: W / 2, y: H / 2 };
    let p = this.boardPos.get(dev);
    if (!p) { p = this.home(dev); this.boardPos.set(dev, p); }
    return { x: p.x * W, y: p.y * H };
  }

  // ---------- drawing ----------

  /** The devices this mode shows. */
  private ids() {
    return (this.mode === 'board' ? [...this.known] : this.mode === 'vision' ? [...this.anchors.keys()] : [this.dev]).filter((id) => this.m.devices.has(id));
  }
  /** Shows a trace meter: it logs you, or carries trace, or has you locked out. */
  private metered(id: string) { return this.m.logged(id) || this.m.traceOf(id) > 0 || this.m.lockLeft(id) > 0; }
  private lockText(key: string) { const ms = this.m.lockLeft(key); return ms ? 'LOCKED · ' + Math.ceil(ms / 1000) + ' s' : ''; }

  render() {
    if (this.root.hidden) return;
    const d = this.m.devices.get(this.dev);
    this.title.textContent = this.mode === 'board' ? 'SCHEMATIC · ' + this.known.size + ' devices' : (d?.name ?? '') + ' · schematic';
    this.modeBtn.textContent = this.mode === 'board' ? 'THIS DEVICE' : 'BOARD · B';
    this.palette.hidden = this.mode !== 'board';
    if (!this.palette.hidden) this.slots.forEach(({ kind, btn }) => {
      const mod = this.m.module(kind)!, owned = this.m.owns(kind);
      btn.disabled = !owned; btn.classList.toggle('missing', !owned);
      btn.textContent = owned ? '+ ' + mod.part.name : '???';
      btn.title = owned ? mod.id + ': ' + mod.part.look : 'a logic module: not found yet';
    });
    this.keyring();
    this.stage.querySelectorAll('.sch').forEach((g) => g.remove());
    // things you placed or connected are yours: they are on the board from the start
    [...this.m.devices.values()].filter((x) => x.crafted || x.node).forEach((x) => this.known.add(x.id));
    const ids = this.ids();
    // what you have seen in hack vision you can wire from the board
    if (this.mode === 'vision') ids.forEach((id) => this.known.add(id));
    ids.forEach((id) => this.stage.appendChild(this.group(id)));
    if (this.mode === 'board') this.m.ghosts().forEach((n) => this.stage.appendChild(this.ghost(n)));
    this.lines();
    drawWatchdogs(this.stage, this.m, this.mode);
    const inp = this.stage.querySelector<HTMLInputElement>('.sch-guess input');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  /** The keyring: a chip per item. Drag one onto a login or a sealed `???`; tap one while typing to type it. */
  private keyring() {
    const items = this.m.items();
    this.ring.hidden = this.mode === 'vision' || !items.length;
    this.ring.textContent = '';
    if (this.ring.hidden) return;
    this.ring.appendChild(el('span', '', this.m.label('keyring.title')));
    items.forEach((k) => {
      const b = el('button', 'sch-chip ' + k.kind + (this.chip === k.id ? ' armed' : ''), k.label); b.type = 'button'; b.dataset.chip = k.id;
      b.title = k.kind === 'fragment' ? k.label + ': "' + k.text + '"' : k.label + (k.kind === 'card' ? ' (a card: lock toys take it)' : ' (a key chip)');
      b.addEventListener('pointerdown', (e) => this.startChip(e, k.id));
      b.addEventListener('click', (e) => e.stopPropagation());
      this.ring.appendChild(b);
      // [ui] a fragment you made can be thrown away (the data's own are evidence: they stay)
      if (this.m.isMade(k.id)) {
        const x = el('button', 'sch-chip-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'drop ' + k.label);
        x.addEventListener('pointerdown', (e) => e.stopPropagation());
        x.addEventListener('click', (e) => { e.stopPropagation(); if (this.chip === k.id) this.chip = null; this.m.discard(k.id); this.say(this.m.line('keyring.discard', { label: k.label })); });
        this.ring.appendChild(x);
      }
    });
  }

  private group(id: string) {
    const d = this.m.devices.get(id)!, locked = this.m.lockLeft(id) > 0, frozen = this.m.frozen(id);
    const g = el('div', 'sch' + (d.crafted ? ' crafted' : '') + (d.node ? ' node' : '') + (locked ? ' locked' : '') + (frozen ? ' frozen' : '')); g.dataset.dev = id;
    const c = this.centre(id); g.style.left = c.x + 'px'; g.style.top = c.y + 'px';
    const core = el('div', 'sch-core');
    // [ui] the meter: a bar and its words (TRACE 42% / LOCKED · 7 s), kept current by meters()
    const meter = () => {
      const t = el('div', 'sch-trace'), left = this.m.lockLeft(id); t.dataset.dev = id;
      const bar = el('i'); bar.style.width = (left ? (left / Math.max(1, this.m.lockSpan(id))) * 100 : this.m.traceOf(id)) + '%';
      t.classList.toggle('lock', left > 0);
      t.append(bar, el('b', '', left ? this.m.label('lock.meter', { sec: Math.ceil(left / 1000) }) : this.m.label('trace.meter', { pct: Math.round(this.m.traceOf(id)) })));
      return t;
    };
    if (this.mode === 'vision') {
      // the device in the world is the core: an outline round it, and a dot to tap
      const a = this.anchors.get(id)!, box = el('div', 'vis-outline');
      box.style.width = a.w + 'px'; box.style.height = a.h + 'px';
      box.appendChild(el('span', 'vis-name', d.name));
      if (this.metered(id)) box.appendChild(meter());
      g.appendChild(box);
      core.title = d.name + ': ' + d.status();
    } else {
      const st = el('div', 'sch-st', locked ? this.lockText(id) : frozen ? this.m.label('watchdog.name') + ' · FROZEN' : d.status());
      if (locked) st.dataset.lock = id;
      core.append(el('div', 'sch-name', d.name), st);
      if (this.metered(id)) core.appendChild(meter());
    }
    if (d.logic && this.mode !== 'vision') {
      const x = el('button', 'sch-x', '×'); x.type = 'button';
      x.setAttribute('aria-label', 'remove ' + d.name);
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', (e) => { e.stopPropagation(); this.removeLogic(id); });
      core.appendChild(x);
    }
    this.coreGestures(core, g, id, () => this.toggleAll(id));
    g.appendChild(core);
    d.nouns.forEach((n, i) => {
      const key = id + '.' + n.id, o = this.offset(id, n.id, i);
      if (n.sector && this.m.sealed(id, n.sector)) { g.appendChild(this.sealedNoun(id, n.sector, key, o)); return; }
      const choosing = this.pending?.to === key;
      const target = !!this.armed || (!!this.chip && n.kind === 'GUARD');
      const node = el('div', 'sch-noun' + (this.open.has(key) || choosing ? ' open' : '') + (choosing ? ' choosing' : '') + (target ? ' target' : '') + (n.kind === 'SEAL' ? ' seal' : ''));
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

  /** A noun in a sealed sector: dashed `???`. A tap asks the seal (and a key you hold opens it). */
  private sealedNoun(dev: string, sector: string, key: string, o: P) {
    const node = el('div', 'sch-noun sealed' + (this.chip ? ' target' : ''));
    node.dataset.sealed = key; node.style.left = o.x + 'px'; node.style.top = o.y + 'px';
    const s = this.m.sector(dev, sector)!;
    const label = el('div', 'sch-label'); label.append(el('span', '', '???'), el('small', '', s.label ?? 'SEALED'));
    node.appendChild(label);
    node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.chip) { const c = this.chip; this.chip = null; this.m.useItem(c, key); return; }
      this.say(this.m.trySeal(dev, sector));
      this.m.changed();
    });
    return node;
  }

  /** A node seen on a scan, not connected yet: a silhouette you can move, not open. */
  private ghost(n: { id: string; name: string; link: string }) {
    const g = el('div', 'sch ghost'); g.dataset.ghost = n.id;
    const c = this.centre(n.id); g.style.left = c.x + 'px'; g.style.top = c.y + 'px';
    const core = el('div', 'sch-core');
    core.append(el('div', 'sch-name', n.name), el('div', 'sch-st', '? · not connected'));
    this.coreGestures(core, g, n.id, () => this.note(this.m.line('net.ghost', { name: n.name, link: n.link })));
    g.appendChild(core);
    return g;
  }

  private verbs(dev: string, noun: string, key: string, o: P, choosing: boolean) {
    const side = Math.abs(o.x) >= Math.abs(o.y) ? (o.x >= 0 ? 'right' : 'left') : (o.y >= 0 ? 'down' : 'up');
    const box = el('div', 'sch-verbs ' + side + (choosing ? ' choosing' : ''));
    if (choosing) box.appendChild(el('span', 'sch-when', 'when ' + this.pending!.from.split('.')[1].replace(':', ' ') + ' →'));
    const n = this.m.noun(key)!;
    const cur = n.current?.() ?? null, guardLocked = n.kind === 'GUARD' && this.m.lockLeft(key) > 0;
    const typeVerb = n.kind === 'GUARD' ? this.m.typeVerb : null;
    if (guardLocked && !choosing) { const t = el('span', 'sch-when', this.lockText(key)); t.dataset.lock = key; box.appendChild(t); }
    n.verbs.forEach((v) => {
      if (v === typeVerb && this.typing === key && !choosing) { box.appendChild(this.guessBox(dev, noun)); return; }
      const b = el('button', 'sch-verb' + (v === cur && !choosing ? ' cur' : '') + (v.startsWith('try ') && n.kind === 'GUARD' ? ' try' : ''), v); b.type = 'button';
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (choosing) { const p = this.pending!; this.pending = null; const l = this.m.connect(p.from, p.to, v); this.say(l); }
        else if (v === typeVerb) { this.typing = key; this.draft = ''; this.render(); }
        else this.m.act(dev, noun, v);
      });
      box.appendChild(b);
    });
    return box;
  }

  /** The keyboard, last resort: a guess typed at a GUARD. Keys stay here (B or H must not leave the schematic). */
  private guessBox(dev: string, noun: string) {
    const box = el('label', 'sch-guess');
    const inp = el('input'); inp.type = 'text'; inp.value = this.draft; inp.placeholder = this.m.label('guard.placeholder');
    inp.setAttribute('aria-label', 'password for ' + noun); inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.addEventListener('pointerdown', (e) => e.stopPropagation());
    inp.addEventListener('input', () => { this.draft = inp.value; });
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { this.typing = null; this.render(); return; }
      if (e.key !== 'Enter' || !inp.value.trim()) return;
      const text = inp.value.trim();
      this.typing = null; this.draft = '';
      this.m.guess(dev, noun, text);
    });
    box.appendChild(inp);
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
        this.path(c, q, 'branch' + (n.classList.contains('sealed') ? ' sealed' : ''));
        const v = n.querySelector('.sch-verbs'); if (v) this.path(q, this.pt(v), 'branch');
      });
    });
    this.m.links.forEach((l) => this.cable(l));
  }

  private cable(l: Link) {
    const a = this.stage.querySelector(`[data-port="${l.from}"] i`), b = this.stage.querySelector(`[data-target="${l.to}"] .sch-label`);
    if (!a || !b) return;
    const P1 = this.pt(a), P2 = this.pt(b);
    // [fixed cables] a conduit: a wide solid casing under the line, and a tap only says it cannot be cut
    if (l.fixed) this.path(P1, P2, 'conduit', true);
    const hit = this.path(P1, P2, 'hit', true);
    hit.addEventListener('click', (e) => { e.stopPropagation(); this.say(this.m.cut(l)); });
    this.path(P1, P2, 'cable' + (this.m.live.has(l) ? ' live' : '') + (l.fixed ? ' fixed' : ''), true);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String((P1.x + P2.x) / 2)); t.setAttribute('y', String((P1.y + P2.y) / 2 - 6));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('class', 'verb'); t.textContent = l.verb;
    this.svg.appendChild(t);
  }

  // ---------- gestures ----------

  /** Device box (or a silhouette): drag it on the board, or tap it. */
  private coreGestures(core: HTMLElement, g: HTMLElement, id: string, tap: () => void) {
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
        if (!moved) tap(); else this.onLayout();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  /** Open every verb of a device, or close them all if they are all open. */
  private toggleAll(id: string) {
    const d = this.m.devices.get(id)!;
    const keys = d.nouns.filter((n) => !n.sector || !this.m.sealed(id, n.sector)).map((n) => id + '.' + n.id);
    const all = keys.every((k) => this.open.has(k));
    keys.forEach((k) => (all ? this.open.delete(k) : this.open.add(k)));
    this.render();
  }

  /** Noun: drag it to a new spot around its device, or tap it to open its verbs (or give it the chip in hand). */
  private nounGestures(node: HTMLElement, key: string) {
    node.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.port, .sch-verb, .sch-guess')) return;
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
        if (moved) { this.render(); this.onLayout(); return; }
        if (this.armed) { this.propose(this.armed, key); return; }
        if (this.chip) { const c = this.chip; this.chip = null; this.m.useItem(c, key); return; }
        this.pending = null;
        if (this.open.has(key)) this.open.delete(key); else this.open.add(key);
        this.render();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  private startWire(e: PointerEvent, key: string) {
    e.preventDefault(); e.stopPropagation();
    this.armed = key; this.pending = null; this.chip = null; this.render();
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
      const target = this.under(ev, '[data-target]');
      if (target) this.propose(key, target.dataset.target!);
      else if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) { this.armed = null; this.render(); }
      else this.note(['', this.mode === 'device' ? 'cable in hand. tap a noun, or open the BOARD to reach other devices.' : 'cable in hand. tap the noun it should reach.', 'dim']);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  /** This layer's element under the pointer that matches (hack vision may lie under the board). */
  private under(ev: PointerEvent, sel: string) {
    return document.elementsFromPoint(ev.clientX, ev.clientY).filter((x) => this.stage.contains(x))
      .map((x) => x.closest(sel) as HTMLElement | null).find(Boolean);
  }

  /** A keyring chip: drag it onto a login or a sealed noun; tap it to type it (input open) or to hold it. */
  private startChip(e: PointerEvent, id: string) {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, chip = e.currentTarget as HTMLElement;
    let moved = false;
    const mv = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      if (moved) { chip.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px)`; chip.classList.add('dragging'); }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      chip.style.transform = ''; chip.classList.remove('dragging');
      if (moved) {
        // onto another chip: combine them; onto a login or a sealed ???: use it
        const t = this.under(ev, '[data-chip], [data-target], [data-sealed]');
        this.chip = null;
        if (t?.dataset.chip) { if (t.dataset.chip !== id) this.m.combine(id, t.dataset.chip); else this.render(); }
        else if (t) this.m.useItem(id, t.dataset.target ?? t.dataset.sealed!);
        else this.render();
        return;
      }
      const k = this.m.items().find((x) => x.id === id);
      if (this.typing && k?.text) { this.draft += k.text; this.render(); return; }
      this.chip = this.chip === id ? null : id;
      if (this.chip) this.note(['', (k?.label ?? id) + ' in hand. tap a login, or a sealed ???.', 'dim']);
      this.render();
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  // ---------- logic parts ----------

  /** + TIMER / + SWITCH: a new part on the board, next to the palette, its verbs open. */
  private addLogic(kind: string) {
    const id = this.m.addLogic(kind);
    if (!id) { this.say(['add ' + kind, (this.m.module(kind)?.id ?? kind) + ': module not found. not yet, anyway.', 'err']); this.render(); return; }
    const n = [...this.m.devices.values()].filter((d) => d.logic).length - 1;
    this.known.add(id);
    this.boardPos.set(id, { x: 0.14 + 0.15 * (n % 5), y: n % 10 < 5 ? 0.72 : 0.56 });
    this.m.devices.get(id)?.nouns.forEach((x) => this.open.add(id + '.' + x.id));
    this.say(['add ' + kind, kind + ' on the board. wire an event into it, and it out.', 'ok']);
    this.render(); this.onLayout();
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
    if (this.m.noun(to)?.kind === 'GUARD') { this.note(['', 'a login wants a person at the keyboard, not a cable.', 'err']); this.render(); return; }
    this.pending = { from, to }; this.open.add(to);
    this.note(['wire ' + from + ' → ' + to, 'pick what ' + to.split('.')[1] + ' should do when that happens.', 'dim']);
    this.render();
  }
}
