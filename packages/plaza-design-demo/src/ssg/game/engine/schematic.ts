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
 * Their defaults come from the scene data (`layout.board`, `layout.dir`).
 *
 * A third mode, hack vision (H), is the board living in the world (a separate
 * instance; the game mutes the world and keeps the devices bright): each device
 * on screen gets a pink frame, and its schematic (the same core box, noun chips,
 * branch lines, event dots and cables as the board) stands over it, tied to the
 * frame by a leader. Tap a core (or the device) to fold or unfold its nouns. Over
 * the device is only where things start: drag a core and its nouns come along;
 * drag a noun and only it moves, still branching from its core. By default the
 * nouns stand in a row over the core (`layout.row`, else SENSE/STORE, ACT,
 * LINK/GUARD/LOG, DAEMON). Where the player put things is saved (`pieces()`),
 * in world units so it holds at any zoom. Overlap handling only nudges devices
 * the player never moved. The logic parts float in the world here, where the
 * host anchors them; the palette places one next to you. A toggle unfolds every
 * device at once (remembered in localStorage). What you see there goes on the board.
 *
 * Styles live in render.tsx (`#hack`, `.sch-*`).
 */

import type { Pt } from '../data/types';
import type { Device, Line, Link, Noun, SceneModel } from './model';
import { drawWatchdogs } from './watchdog-view';

const NS = 'http://www.w3.org/2000/svg';
type P = { x: number; y: number };
/** Where a device stands on screen for hack vision: its box centre and size, in stage px. */
export interface Anchor { x: number; y: number; w: number; h: number }
const HINT = 'tap a noun for its verbs · drag an orange dot onto a noun to wire';
const VISION_HINT = 'tap a device for its nouns · drag cores and nouns anywhere · drag an orange dot onto a noun to wire';
/**
 * Hack vision, in px: the gap between a device's frame and its core over it, half a core's
 * height, how far over the core the default row of nouns stands, the gap between them.
 */
const LEAD = 12, CORE_HALF = 17, ROW_UP = 64, NOUN_GAP = 16;
/** Hack vision: circuits keep this far from each other and from the edges (px). */
const ROOM = 6;
/** Where the "unfold every circuit" setting is remembered. */
const UNFOLD_KEY = 'access-denied-vision-unfold';
/** Hack vision's row order by kind, left to right; ties keep the data's order. */
const RANK: Record<string, number> = { SENSE: 0, STORE: 0, ACT: 1, LINK: 2, GUARD: 2, LOG: 2, SEAL: 2, DAEMON: 3 };
const UNIT: Record<string, P> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
/** Where logic parts land on the board when nothing else says. */
const BOARD_CRAFT: P[] = [{ x: 0.6, y: 0.78 }, { x: 0.84, y: 0.78 }, { x: 0.42, y: 0.6 }, { x: 0.72, y: 0.58 }];
/** Where net nodes (and devices without `layout.board`) land: a row under the scene's own devices. */
const BOARD_NET: P[] = [{ x: 0.5, y: 0.6 }, { x: 0.28, y: 0.62 }, { x: 0.72, y: 0.62 }, { x: 0.12, y: 0.66 }, { x: 0.88, y: 0.66 }];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}
function readUnfold() { try { return localStorage.getItem(UNFOLD_KEY) === '1'; } catch { return false; } }
function writeUnfold(on: boolean) { try { localStorage.setItem(UNFOLD_KEY, on ? '1' : '0'); } catch { /* private mode: not remembered */ } }

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
  /** Hack vision: circuits unfolded by hand, or (with "unfold all" on) folded by hand. */
  private unfolded = new Set<string>();
  private folded = new Set<string>();
  private unfoldAll = false;
  private allBtn: HTMLButtonElement | null = null;
  /** Hack vision: cores moved off their default spot over the device, as offsets from it in world units (x right, y down). */
  private moved = new Map<string, P>();
  /** Hack vision: nouns the player dragged, `device.noun` → offset from their core in world units. */
  private voff = new Map<string, P>();
  /** The scene's own buttons over the canvas (the host's HACK, BOARD, …): circuits keep clear of them. */
  bar: HTMLElement | null = null;
  /** Hack vision: CSS px per world unit (the host sets it), so a moved piece keeps its place in the world at any zoom. */
  unit = 1;
  onClose: () => void = () => {};
  /** A device or noun was moved by hand (for the save). */
  onLayout: () => void = () => {};
  /** Hack vision: a logic part was just placed; the host gives it a spot in the world (next to the player). */
  onPlace: (id: string) => void = () => {};
  /** Hack vision: a logic part is being dragged; `at` is where its centre should be, in stage px. */
  onMovePart: (id: string, at: P) => void = () => {};

  constructor(host: HTMLElement, private m: SceneModel, private say: (l: Line) => void, opts: { vision?: boolean; known?: Set<string> } = {}) {
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
    if (opts.vision) {
      this.mode = 'vision'; this.root.id = 'vision'; this.root.append(this.stage, this.status);
      this.unfoldAll = readUnfold();
      const all = this.allBtn = el('button', 'hack-btn vis-all'); all.type = 'button';
      all.title = 'unfold every circuit at once, to compare them';
      all.addEventListener('click', () => this.setUnfoldAll(!this.unfoldAll));
      this.palette.appendChild(all);
    }
    else { this.root.id = 'hack'; this.root.append(bar, this.status, this.stage); }
    host.appendChild(this.root);
    this.stage.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.sch-core, .sch-noun, .port, .sch-chip, .sch-guess, .vis-part')) return;
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
    this.note(['', 'HACK VISION · ' + VISION_HINT + ' · H to leave', 'dim']);
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
    // only the camera moved: shift the frames and the schematics and keep the DOM, so a gesture in progress survives
    this.stage.querySelectorAll<HTMLElement>('.vis-outline').forEach((f) => {
      const a = next.get(f.dataset.frame!); if (!a) return;
      f.style.left = a.x + 'px'; f.style.top = a.y + 'px'; f.style.width = a.w + 'px'; f.style.height = a.h + 'px';
    });
    this.stage.querySelectorAll<HTMLElement>('.sch.vis').forEach((g) => {
      const c = this.visionCentre(g.dataset.dev!); g.style.left = c.x + 'px'; g.style.top = c.y + 'px';
    });
    this.arrange();
    this.lines();
  }
  /**
   * Hack vision: a tap on a device in the world unfolds or folds its circuit; with a cable
   * in hand it unfolds it (to reach its nouns); a tap on nothing drops what is in hand.
   */
  poke(id: string | null) {
    if (this.armed && id) { if (!this.isUnfolded(id)) this.fold(id); return; }
    if (this.armed || this.pending || this.chip || !id) { this.armed = null; this.pending = null; this.chip = null; this.render(); return; }
    this.fold(id);
  }

  // ---------- hack vision: the board, living in the world ----------

  /** `⌁ hack it` from a thing's popup: its nouns out, and a short flash on its core so the eye finds it. */
  focus(id: string) {
    if (!this.isUnfolded(id)) this.fold(id); else this.render();
    const core = this.stage.querySelector<HTMLElement>(`.sch.vis[data-dev="${id}"] .sch-core`);
    if (!core) return;
    core.classList.add('focus');
    window.setTimeout(() => this.stage.querySelector(`.sch.vis[data-dev="${id}"] .sch-core`)?.classList.remove('focus'), 1400);
  }

  private isUnfolded(id: string) { return this.unfoldAll ? !this.folded.has(id) : this.unfolded.has(id); }
  /** Show a device's nouns, or fold them back into its core. */
  private fold(id: string) {
    const set = this.unfoldAll ? this.folded : this.unfolded;
    if (set.has(id)) set.delete(id); else set.add(id);
    this.render();
  }
  /** The setting: every device's nouns out at once (for comparing them), or each by hand (as you left them). */
  private setUnfoldAll(on: boolean) {
    this.unfoldAll = on; this.folded.clear();
    writeUnfold(on);
    this.render();
  }

  /** A device's nouns in hack vision's default row, left to right: the data's `layout.row` first, then by kind. */
  private row(d: Device) {
    const order = d.data.layout?.row ?? [];
    const rank = (n: Noun) => { const i = order.indexOf(n.id); return i >= 0 ? i - order.length - 10 : RANK[n.kind] ?? 2; };
    return d.nouns.map((n, i) => ({ n, i })).sort((a, b) => rank(a.n) - rank(b.n) || a.i - b.i).map((x) => x.n);
  }

  /** Did the player move this device's core or any of its nouns? Then overlap handling leaves it alone. */
  private placedByHand(id: string) { return this.moved.has(id) || [...this.voff.keys()].some((k) => k.startsWith(id + '.')); }

  /**
   * Where a noun sits around its core in hack vision, in px. By default the nouns
   * stand in a row over the core (`row()`), spaced by their names; once dragged,
   * where the player put it (kept in world units, so it holds at any zoom).
   */
  private visionOffset(dev: string, noun: string): P {
    const u = this.unit || 1, own = this.voff.get(dev + '.' + noun);
    if (own) return { x: own.x * u, y: own.y * u };
    const d = this.m.devices.get(dev)!, row = this.row(d);
    const w = (n: Noun) => Math.max(46, 7 * Math.max(n.id.length, (n.events?.[0]?.length ?? 0) + 2) + 18);
    const widths = row.map(w), total = widths.reduce((s, x) => s + x, 0) + NOUN_GAP * (row.length - 1);
    let x = -total / 2;
    for (let i = 0; i < row.length; i++) {
      if (row[i].id === noun) return { x: x + widths[i] / 2, y: -ROW_UP };
      x += widths[i] + NOUN_GAP;
    }
    return { x: 0, y: -ROW_UP };
  }

  /** Where a device's core stands: over the device by default, or where the player dragged it (world units from there). */
  private visionCentre(id: string): P {
    const a = this.anchors.get(id);
    if (!a) return { x: -999, y: -999 };
    const o = this.moved.get(id), u = this.unit || 1;
    return { x: a.x + (o ? o.x * u : 0), y: a.y - a.h / 2 - LEAD - CORE_HALF + (o ? o.y * u : 0) };
  }

  /** The device's pink frame in the world, apart from its core (the core moves; the frame stays on the thing). */
  private frame(id: string) {
    const d = this.m.devices.get(id)!, a = this.anchors.get(id)!;
    const box = el('div', 'vis-outline' + (d.logic ? ' vis-part' : '')); box.dataset.frame = id;
    box.style.left = a.x + 'px'; box.style.top = a.y + 'px'; box.style.width = a.w + 'px'; box.style.height = a.h + 'px';
    if (d.logic) {
      // a logic part has no body in the world: this is it, a small module you can drag about
      box.appendChild(el('span', 'vis-glyph', d.name[0] + id.replace(/^\D+/, '')));
      box.title = d.name + ': ' + d.look + ' (drag to move it)';
      const x = el('button', 'sch-x', '×'); x.type = 'button';
      x.setAttribute('aria-label', 'remove ' + d.name);
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', (e) => { e.stopPropagation(); this.removeLogic(id); });
      box.appendChild(x);
      this.partGestures(box, id);
    }
    return box;
  }

  /**
   * Move a whole device in hack vision (its core, its nouns with it), as on the board.
   * A press that does not travel past a few px is a tap (`tap`). The group is looked
   * up fresh on every move, so a redraw mid-drag (a timer firing) does not drop it.
   */
  private dragPiece(e: PointerEvent, id: string, tap: () => void) {
    const sx = e.clientX, sy = e.clientY, u = this.unit || 1;
    const group = () => this.stage.querySelector<HTMLElement>(`.sch.vis[data-dev="${id}"]`);
    let base = this.moved.get(id) ?? { x: 0, y: 0 }, moving = false;
    const mv = (ev: PointerEvent) => {
      if (!moving) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) <= 5) return;
        moving = true; base = this.pin(id);
      }
      this.moved.set(id, { x: base.x + (ev.clientX - sx) / u, y: base.y + (ev.clientY - sy) / u });
      const g = group();
      if (g) { const c = this.visionCentre(id); g.style.left = c.x + 'px'; g.style.top = c.y + 'px'; }
      this.lines();
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (!moving) { tap(); return; }
      this.render(); this.onLayout();
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }

  /**
   * About to be moved by hand: a group the overlap handling had nudged keeps that
   * nudge as its own position (so nothing jumps). Returns its offset (world units).
   */
  private pin(id: string): P {
    const g = this.stage.querySelector<HTMLElement>(`.sch.vis[data-dev="${id}"]`), u = this.unit || 1;
    const base = this.moved.get(id) ?? { x: 0, y: 0 };
    if (!g?.style.translate) return base;
    const [dx, dy] = g.style.translate.split(' ').map((v) => parseFloat(v) || 0);
    g.style.translate = '';
    const p = { x: base.x + dx / u, y: base.y + (dy || 0) / u };
    this.moved.set(id, p);
    const c = this.visionCentre(id); g.style.left = c.x + 'px'; g.style.top = c.y + 'px';
    return p;
  }

  /**
   * Devices must not overlap each other or the tools: from left to right, one the
   * player never moved that runs into something tries the spots just above, below,
   * left and right of each obstacle and takes the nearest that is free and inside the
   * view (with none free, it stays put). Moved ones are never pushed, only kept from
   * growing off the top or under the buttons. Cheap: a handful of boxes.
   */
  private arrange() {
    if (this.mode !== 'vision') return;
    const groups = [...this.stage.querySelectorAll<HTMLElement>('.sch.vis')];
    if (!groups.length) return;
    groups.forEach((g) => { g.style.translate = ''; });
    const s = this.stage.getBoundingClientRect(), W = s.width, H = s.height;
    type Box = { l: number; t: number; r: number; b: number };
    const box = (e: Element): Box => { const q = e.getBoundingClientRect(); return { l: q.left - s.left, t: q.top - s.top, r: q.right - s.left, b: q.bottom - s.top }; };
    /** A device's whole schematic: its core, its nouns, their dots and open verbs. */
    const extent = (g: HTMLElement): Box => {
      const b: Box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
      g.querySelectorAll('.sch-core, .sch-label, .port, .sch-verbs').forEach((e) => {
        const q = box(e); b.l = Math.min(b.l, q.l); b.t = Math.min(b.t, q.t); b.r = Math.max(b.r, q.r); b.b = Math.max(b.b, q.b);
      });
      return b;
    };
    // the scene's buttons over the canvas (HACK, BOARD, …) lie over the stage too
    // (the game's key bar adopts them into its row of actions: then the whole row is in the way)
    const row = this.bar?.parentElement?.classList.contains('kb-actions') ? this.bar.parentElement : this.bar;
    const bar = row && this.bar && !this.bar.hidden && row.offsetParent ? box(row) : null;
    const mine = (g: HTMLElement) => this.placedByHand(g.dataset.dev!);
    const placed: Box[] = groups.filter(mine).map((g) => {
      const b = extent(g), top = bar && b.l < bar.r && b.r > bar.l ? Math.max(ROOM, bar.b + ROOM) : ROOM;
      if (b.t >= top) return b;
      g.style.translate = '0px ' + (top - b.t) + 'px';
      return { ...b, t: top, b: b.b + top - b.t };
    });
    if (!this.palette.hidden) placed.push(box(this.palette));
    if (bar) placed.push(bar);
    const at = (b: Box, dx: number, dy: number): Box => ({ l: b.l + dx, t: b.t + dy, r: b.r + dx, b: b.b + dy });
    const hit = (q: Box) => placed.find((p) => q.l < p.r + ROOM && q.r > p.l - ROOM && q.t < p.b + ROOM && q.b > p.t - ROOM);
    const inside = (q: Box) => q.l >= ROOM - 0.5 && q.r <= W - ROOM + 0.5 && q.t >= ROOM - 0.5 && q.b <= H - ROOM + 0.5;
    // the other devices' frames: a plate standing on one hides it, so that is worth moving for too
    const frames = [...this.stage.querySelectorAll<HTMLElement>('.vis-outline')].map((f) => ({ id: f.dataset.frame, b: box(f) }));
    const free = groups.filter((g) => !mine(g)).map((g) => ({ g, b: extent(g) })).sort((p, q) => p.b.l - q.b.l);
    const hits = (q: Box) => placed.filter((p) => q.l < p.r + ROOM && q.r > p.l - ROOM && q.t < p.b + ROOM && q.b > p.t - ROOM).length;
    const clearOfBar = (q: Box) => !bar || !(q.l < bar.r && q.r > bar.l && q.t < bar.b + ROOM && q.b > bar.t);
    for (const { g, b } of free) {
      let dx = 0, dy = 0;
      if (b.r > W - ROOM) dx = W - ROOM - b.r;
      if (b.l + dx < ROOM) dx = ROOM - b.l;
      if (b.t < ROOM) dy = ROOM - b.t;
      const q0 = at(b, dx, dy), own = g.dataset.dev;
      const others = frames.filter((f) => f.id !== own);
      const cover = (q: Box) => others.reduce((s, f) => s + Math.max(0, Math.min(q.r, f.b.r) - Math.max(q.l, f.b.l) - 2) * Math.max(0, Math.min(q.b, f.b.b) - Math.max(q.t, f.b.t) - 2), 0);
      if (hit(q0) || cover(q0) > 0) {
        // beside or above whatever is in the way (another plate, another device's frame), or where it is
        const tries = [[0, 0], ...[...placed, ...others.map((f) => f.b)].flatMap((p) => [
          [0, p.t - ROOM - q0.b], [0, p.b + ROOM - q0.t], [p.l - ROOM - q0.r, 0], [p.r + ROOM - q0.l, 0],
        ])].filter(([x, y]) => inside(at(q0, x, y)) && clearOfBar(at(q0, x, y)));
        // no other plate first; then covering as few devices as it can; then the nearest, up before down
        const best = tries
          .map(([x, y]) => ({ x, y, n: hits(at(q0, x, y)), d: Math.hypot(x, y) * (y > 0 ? 2 : 1) + cover(at(q0, x, y)) * 0.5 }))
          .sort((u, v) => u.n - v.n || u.d - v.d)[0];
        if (best) { dx += best.x; dy += best.y; }
      }
      placed.push(at(b, dx, dy));
      if (dx || dy) g.style.translate = dx + 'px ' + dy + 'px';
    }
  }

  /** A logic part floating in hack vision: drag it to move it in the world, tap it to fold or unfold its nouns. */
  private partGestures(box: HTMLElement, id: string) {
    box.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.sch-x')) return;
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, a = this.anchors.get(id), start = { x: a?.x ?? 0, y: a?.y ?? 0 };
      let moved = false;
      const mv = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) moved = true;
        if (moved) this.onMovePart(id, { x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy });
      };
      const up = () => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (!moved) this.fold(id); else this.onLayout();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
  }

  /** Where the player put things in hack vision, for the save: cores by device id, nouns by `device.noun` (world units). */
  pieces(): Record<string, Pt> {
    const r = (p: P) => ({ x: Math.round(p.x), y: Math.round(p.y) });
    return Object.fromEntries([...[...this.moved].map(([k, p]) => [k, r(p)]), ...[...this.voff].map(([k, p]) => [k, r(p)])]);
  }
  restorePieces(rec: Record<string, Pt> | undefined, keep: (id: string) => boolean) {
    this.moved.clear(); this.voff.clear();
    for (const [k, p] of Object.entries(rec ?? {})) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const dot = k.indexOf('.'), dev = dot < 0 ? k : k.slice(0, dot);
      if (!keep(dev)) continue;
      if (dot < 0) this.moved.set(k, { x: p.x, y: p.y });
      else if (this.m.noun(k)) this.voff.set(k, { x: p.x, y: p.y });
    }
    this.render();
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
  /** Forget where everything sat and which verbs were open (a scene reset). The shared `known` is the owner's to clear. */
  resetLayout() {
    this.boardPos.clear(); this.offsets.clear(); this.open.clear(); this.unfolded.clear(); this.folded.clear(); this.moved.clear(); this.voff.clear();
    this.armed = null; this.pending = null; this.chip = null; this.typing = null; this.dev = '';
    this.render();
  }

  private offset(dev: string, noun: string, i: number): P {
    if (this.mode === 'vision') return this.visionOffset(dev, noun);
    const key = dev + '.' + noun;
    let o = this.offsets.get(key);
    if (!o) {
      const d = this.m.devices.get(dev)!, l = d.data.layout;
      const side = (id: string, j: number) => l?.dir?.[id] ?? (d.crafted || d.node || !l?.dir ? ['up', 'right', 'down', 'left'][j % 4] : 'up');
      const mine = side(noun, i), u = UNIT[mine];
      o = { x: u.x * 104, y: u.y * 70 };
      // nouns on the same side fan out across it, instead of sitting on top of each other
      const same = d.nouns.map((n, j) => side(n.id, j) === mine ? n.id : null).filter((id): id is string => !!id);
      const k = same.indexOf(noun), spread = same.length > 1 ? k - (same.length - 1) / 2 : 0;
      if (u.x) o.y += spread * 44;
      else o.x += spread * 96;
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
    if (this.mode === 'vision') return this.visionCentre(dev);
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
    this.palette.hidden = this.mode !== 'board' && this.mode !== 'vision';
    if (this.allBtn) {
      this.allBtn.textContent = this.unfoldAll ? '▣ ALL UNFOLDED' : '▢ UNFOLD ALL';
      this.allBtn.classList.toggle('on', this.unfoldAll); this.allBtn.setAttribute('aria-pressed', String(this.unfoldAll));
    }
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
    this.stage.querySelectorAll('.vis-outline').forEach((f) => f.remove());
    if (this.mode === 'vision') ids.forEach((id) => this.stage.appendChild(this.frame(id)));
    ids.forEach((id) => this.stage.appendChild(this.group(id)));
    if (this.mode === 'board') this.m.ghosts().forEach((n) => this.stage.appendChild(this.ghost(n)));
    this.arrange();
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
    const vision = this.mode === 'vision', out = !vision || this.isUnfolded(id);
    const g = el('div', 'sch' + (d.crafted ? ' crafted' : '') + (d.node ? ' node' : '') + (locked ? ' locked' : '') + (frozen ? ' frozen' : '')
      + (vision ? ' vis' + (this.placedByHand(id) ? ' moved' : '') + (out ? '' : ' folded') : '')); g.dataset.dev = id;
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
    const st = el('div', 'sch-st', locked ? this.lockText(id) : frozen ? this.m.label('watchdog.name') + ' · FROZEN' : d.status());
    if (locked) st.dataset.lock = id;
    core.append(el('div', 'sch-name', d.name), st);
    if (this.metered(id)) core.appendChild(meter());
    // (in hack vision the part's body in the world carries the ×)
    if (d.logic && !vision) {
      const x = el('button', 'sch-x', '×'); x.type = 'button';
      x.setAttribute('aria-label', 'remove ' + d.name);
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', (e) => { e.stopPropagation(); this.removeLogic(id); });
      core.appendChild(x);
    }
    if (vision) {
      // the core is the device's handle: tap folds or unfolds its nouns, a drag moves it, nouns and all
      core.dataset.plate = id;
      core.title = d.name + ' · tap: ' + (out ? 'fold' : 'unfold') + ' · drag: move';
      core.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault(); e.stopPropagation();
        this.dragPiece(e, id, () => { if (!(this.armed && out)) this.fold(id); });
      });
    } else this.coreGestures(core, g, id, () => this.toggleAll(id));
    g.appendChild(core);
    if (out) d.nouns.forEach((n, i) => {
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
  private sealedNoun(dev: string, sector: string, key: string, o: P | null) {
    const node = el('div', 'sch-noun sealed' + (this.chip ? ' target' : ''));
    node.dataset.sealed = key;
    if (o) { node.style.left = o.x + 'px'; node.style.top = o.y + 'px'; }
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
    // (in hack vision the nouns stand over or under their core: verbs open away from it, up or down)
    const side = this.mode === 'vision' ? (o.y < 0 ? 'up' : 'down') : Math.abs(o.x) >= Math.abs(o.y) ? (o.x >= 0 ? 'right' : 'left') : (o.y >= 0 ? 'down' : 'up');
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
        if (choosing) {
          const p = this.pending!; this.pending = null;
          // hack vision keeps circuits compact: the verbs picked for a cable fold away again
          if (this.mode === 'vision') this.open.delete(p.to);
          this.say(this.m.connect(p.from, p.to, v));
        }
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
    if (this.mode === 'vision') {
      // each core stays tied to its device: a leader from the core to the nearest point of the frame
      const st = this.stage.getBoundingClientRect();
      this.stage.querySelectorAll<HTMLElement>('.sch.vis').forEach((g) => {
        const core = g.querySelector('.sch-core'), frame = this.stage.querySelector(`[data-frame="${g.dataset.dev}"]`);
        if (!core || !frame) return;
        const c = core.getBoundingClientRect(), f = frame.getBoundingClientRect();
        const a = { x: c.left - st.left + c.width / 2, y: c.top - st.top + c.height / 2 };
        const l = f.left - st.left, t = f.top - st.top;
        const p = { x: Math.max(l, Math.min(l + f.width, a.x)), y: Math.max(t, Math.min(t + f.height, a.y)) };
        if (Math.hypot(a.x - p.x, a.y - p.y) > 2) this.path(a, p, 'leader');
      });
    }
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
    // in hack vision a folded circuit still shows its cables: they end at its name plate
    const plate = (key: string) => (this.mode === 'vision' ? this.stage.querySelector(`[data-plate="${key.split('.')[0]}"]`) : null);
    const a = this.stage.querySelector(`[data-port="${l.from}"] i`) ?? plate(l.from), b = this.stage.querySelector(`[data-target="${l.to}"] .sch-label`) ?? plate(l.to);
    if (!a || !b || a === b) return;
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

  /**
   * Open one noun's verbs. In hack vision a device's nouns stand close together in the
   * world, so its other nouns' verbs fold away (they would cover each other).
   */
  private only(key: string) {
    if (this.mode === 'vision') { const dev = key.split('.')[0] + '.'; [...this.open].forEach((k) => { if (k.startsWith(dev)) this.open.delete(k); }); }
    this.open.add(key);
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
      const tap = () => {
        if (this.armed) { this.propose(this.armed, key); return; }
        if (this.chip) { const c = this.chip; this.chip = null; this.m.useItem(c, key); return; }
        this.pending = null;
        if (this.open.has(key)) this.open.delete(key); else this.only(key);
        this.render();
      };
      const vision = this.mode === 'vision', dev = key.split('.')[0], noun = key.slice(dev.length + 1);
      const sx = e.clientX, sy = e.clientY;
      let o0 = vision ? this.visionOffset(dev, noun) : { ...(this.offsets.get(key) ?? { x: 0, y: 0 }) };
      let moved = false;
      const mv = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) {
          moved = true;
          // hack vision: the device keeps the nudge the overlap handling gave it, so nothing jumps
          if (vision) { this.pin(dev); o0 = this.visionOffset(dev, noun); }
        }
        if (!moved) return;
        const o = { x: o0.x + ev.clientX - sx, y: o0.y + ev.clientY - sy };
        if (vision) { const u = this.unit || 1; this.voff.set(key, { x: o.x / u, y: o.y / u }); this.stage.querySelector(`.sch.vis[data-dev="${dev}"]`)?.classList.add('moved'); }
        else this.offsets.set(key, o);
        node.style.left = o.x + 'px'; node.style.top = o.y + 'px';
        this.lines();
      };
      const up = () => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (moved) { this.render(); this.onLayout(); return; }
        tap();
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
      const target = this.under(ev, '[data-target]'), plate = target ? null : this.under(ev, '[data-plate]');
      if (target) this.propose(key, target.dataset.target!);
      else if (plate) {
        // onto a folded device's plate: unfold it, the cable stays in hand
        const id = plate.dataset.plate!;
        if (!this.isUnfolded(id)) this.fold(id);
        this.note(['', 'cable in hand. tap the noun it should reach.', 'dim']);
      }
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
    if (this.mode === 'vision') {
      // in hack vision it floats next to you, its circuit unfolded
      if (this.unfoldAll) this.folded.delete(id); else this.unfolded.add(id);
      this.onPlace(id);
      this.say(['add ' + kind, kind + ' placed next to you. wire an event into it, and it out.', 'ok']);
    } else {
      this.m.devices.get(id)?.nouns.forEach((x) => this.open.add(id + '.' + x.id));
      this.say(['add ' + kind, kind + ' on the board. wire an event into it, and it out.', 'ok']);
    }
    this.render(); this.onLayout();
  }

  private removeLogic(id: string) {
    const name = this.m.devices.get(id)?.name ?? id;
    this.m.removeDevice(id);
    this.known.delete(id); this.boardPos.delete(id); this.unfolded.delete(id); this.folded.delete(id); this.moved.delete(id);
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
    this.pending = { from, to }; this.only(to);
    this.note(['wire ' + from + ' → ' + to, 'pick what ' + to.split('.')[1] + ' should do when that happens.', 'dim']);
    this.render();
  }
}
