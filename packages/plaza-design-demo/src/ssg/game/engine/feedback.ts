/**
 * Feedback in the world: UI never covers a consequence (ART-GUIDE.md §11).
 *
 * - Captions: a device's reply ("ROUTER: online.") is a small dry box in the
 *   caption lane, high above the action: just over the tallest thing on screen
 *   (devices, people's heads, the player), never lower than it needs, never
 *   under the HUD. A thin leader runs from it down to the exact thing that
 *   reacted. Captions spread out sideways in the lane so they never overlap,
 *   and never cover the player or the player's speech bubble. A thing off the
 *   view: its caption pins to that edge, with an edge arrow.
 *   Green worked, red denied, paper otherwise. The terminal (the phone's HUD line)
 *   keeps the full history.
 * - Pacing: never more than you can read. At most two captions show at once;
 *   the rest wait in a queue. Each stays 2.6 s plus 60 ms a character, then fades
 *   (the numbers: READ_MIN_MS and friends, below), and the next comes in only when
 *   its space is free (a fading caption still holds its place). A thing speaking
 *   again swaps its caption's words in place (booting… → online.: old words out,
 *   then the new ones in) instead of stacking. Red lines jump
 *   the queue. A long queue is shortened: the oldest waiting lines keep only
 *   their first sentence.
 * - Pings: an expanding ring where something happened (green success, red alert,
 *   cyan attention), at once, so the eye goes there while the caption waits its
 *   turn; when that spot is off the view, an arrow at the edge points to it.
 *
 * Everything follows its anchor every frame (the camera moves, Pixel walks): the
 * host hands `update` a `locate` that says where a speaker is on screen now, plus
 * the boxes captions keep off (`hard`: the player, a speech bubble) and would
 * rather not cover (`soft`: devices, people). An open popup's plate sits in the
 * same lane (engine/popup.ts, `laneBottom`); while it is open the captions yield
 * to it (`yieldTo`: kept off like `hard`, without moving the lane).
 * Styles: FEEDBACK_STYLES, inlined by render.tsx.
 */

/** Where something is on screen (CSS px of the game view): its box centre and size, and whether it is off to a side. */
export interface Spot2D { x: number; y: number; w: number; h: number; off: -1 | 0 | 1 }
export type PingKind = 'ok' | 'err' | 'look';
export type Locate = (from: string) => Spot2D | null;
/** A box on screen, CSS px: left, top, right, bottom. */
export interface Box { l: number; t: number; r: number; b: number }

/**
 * Caption pacing (tune here). A caption stays READ_MIN_MS plus READ_PER_CHAR_MS a character, then
 * fades out over FADE_MS. New words for a caption already up swap: the old ones out over SWAP_OUT_MS,
 * then the new ones in over SWAP_IN_MS. Only the captions are paced: the game reacts at its own speed.
 */
const READ_MIN_MS = 2600, READ_PER_CHAR_MS = 60, FADE_MS = 300, SWAP_OUT_MS = 200, SWAP_IN_MS = 200;
/** At most this many captions show at once, and a new one waits this long after the last came in (ms). */
const MAX_SHOWN = 2, STAGGER_MS = 300;
/** More than this many waiting: the oldest are shortened; more than MAX_QUEUE: the oldest go (the terminal has them). */
const LONG_QUEUE = 4, MAX_QUEUE = 8;/** A ring's life, an edge arrow's (ms). */
const RING_MS = 1700, EDGE_MS = 2600;
/** The lane's gap over the tallest thing, between captions, and from the edges (px). */
const GAP = 22, STACK = 6, EDGE = 6;

const hits = (a: Box, b: Box, gap = 0) => a.l < b.r + gap && a.r > b.l - gap && a.t < b.b + gap && a.b > b.t - gap;
const area = (a: Box, b: Box) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const boxOf = (s: { x: number; y: number; w: number; h: number }): Box => ({ l: s.x - s.w / 2, t: s.y - s.h / 2, r: s.x + s.w / 2, b: s.y + s.h / 2 });

/** How long a line stays readable (ms), before its fade. */
export const readMs = (text: string) => READ_MIN_MS + READ_PER_CHAR_MS * text.length;

/** A line's summary, for a long queue: its first sentence, or its start. */
export function summary(text: string) {
  const m = /^(.{6,}?[.!?])(\s|$)/.exec(text);
  if (m && m[1].length < text.length) return m[1];
  return text.length > 40 ? text.slice(0, 38).trimEnd() + '…' : text;
}

/**
 * Where a caption (w × h) goes in the lane (its bottom at `laneB`), wanting to stand over `cx`:
 * in the lane first, slid sideways as little as it can, then a row higher or lower; never on
 * another caption or a `hard` box (the player, a bubble), nor its own thing, if any spot avoids
 * that; then covering as little of the `soft` boxes as it can.
 */
export function placeInLane(w: number, h: number, cx: number, thing: Box | null, laneB: number, placed: Box[], hard: Box[], soft: Box[], W: number, lo: number, hi: number): { box: Box; free: boolean } {
  const rows = [laneB - h, laneB - h * 2 - STACK, laneB + STACK, laneB + h + STACK * 2]
    .map((t) => Math.max(lo, Math.min(hi - h, t)))
    .filter((t, i, a) => a.indexOf(t) === i);
  let best: Box | null = null, cost = Infinity;
  rows.forEach((t, r) => {
    for (let k = 0; k <= 40; k++) {
      // over its thing, then slid sideways by its measured width's quarters (clamped: near an edge it lines up with it)
      const dx = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (w / 4 + 4);
      const l = Math.max(EDGE, Math.min(W - w - EDGE, cx - w / 2 + dx)), q = { l, t, r: l + w, b: t + h };
      let c = Math.abs(q.l + w / 2 - cx) + r * 60;
      if (placed.some((p) => hits(q, p, STACK)) || hard.some((p) => hits(q, p, 4))) c += 1e6;
      if (thing && hits(q, thing, 2)) c += 1e5;
      for (const s of soft) c += area(q, s) * 0.5;
      if (c < cost) { cost = c; best = q; }
    }
  });
  return { box: best!, free: cost < 1e5 };
}

/** Does the segment a→b pass through box q (shrunk a little, so touching its own edge does not count)? */
function crosses(ax: number, ay: number, bx: number, by: number, q: Box) {
  const s = { l: q.l + 1, t: q.t + 1, r: q.r - 1, b: q.b - 1 };
  for (let i = 0; i <= 24; i++) { const x = ax + ((bx - ax) * i) / 24, y = ay + ((by - ay) * i) / 24; if (x > s.l && x < s.r && y > s.t && y < s.b) return true; }
  return false;
}

/**
 * The thin leader from a caption to its thing: from the box's edge nearest the thing to the thing.
 * Straight when that crosses no other caption; else it bends once (across, then down; or down,
 * then across), whichever crosses nothing.
 */
export function leaderPath(q: Box, thing: Box, others: Box[]): [number, number][] {
  const tx = Math.max(thing.l + 2, Math.min(thing.r - 2, (q.l + q.r) / 2)), ty = Math.max(thing.t + 2, Math.min(thing.b - 2, (q.t + q.b) / 2));
  let straight: [number, number][];
  if (q.b <= thing.t) straight = [[Math.max(q.l + 4, Math.min(q.r - 4, tx)), q.b], [tx, thing.t]];
  else if (q.t >= thing.b) straight = [[Math.max(q.l + 4, Math.min(q.r - 4, tx)), q.t], [tx, thing.b]];
  else if (q.r <= thing.l) straight = [[q.r, Math.max(q.t + 3, Math.min(q.b - 3, ty))], [thing.l, ty]];
  else straight = [[q.l, Math.max(q.t + 3, Math.min(q.b - 3, ty))], [thing.r, ty]];
  const cx = (thing.l + thing.r) / 2, right = cx > (q.l + q.r) / 2, my = (q.t + q.b) / 2;
  const options: [number, number][][] = [straight];
  if (q.b <= thing.t) {
    // across from the box's side to over the thing, then down to it
    options.push([[right ? q.r : q.l, my], [cx, my], [cx, thing.t]]);
    // down from the box's bottom to the thing's middle, then across to its side
    const sx = Math.max(q.l + 4, Math.min(q.r - 4, cx)), ey = (thing.t + thing.b) / 2;
    options.push([[sx, q.b], [sx, ey], [sx < thing.l ? thing.l : thing.r, ey]]);
  }
  const clear = (p: [number, number][]) => p.every((a, i) => i === 0 || !others.some((o) => crosses(p[i - 1][0], p[i - 1][1], a[0], a[1], o)));
  return options.find(clear) ?? straight;
}

const SVG = 'http://www.w3.org/2000/svg';

/** A line waiting or showing. `shown`/`until`: when it came in and when it starts to fade (ms); `next`: new text, swapping in. */
interface Caption { from: string; text: string; kind: PingKind; el?: HTMLDivElement; lead?: SVGSVGElement; shown: number; until: number; fading: boolean; box?: Box; next?: { text: string; kind: PingKind; at: number } }
interface Ping { from: string; el: HTMLDivElement; born: number; life: number; edge: boolean }

function el(cls: string, text?: string) { const e = document.createElement('div'); e.className = cls; if (text != null) e.textContent = text; return e; }
const tone = (k: PingKind) => (k === 'look' ? 'paper' : k);

export class Feedback {
  private layer: HTMLDivElement;
  /** Showing (at most MAX_SHOWN), and waiting their turn. */
  private caps: Caption[] = [];
  private queue: Caption[] = [];
  private pings: Ping[] = [];
  private lastShown = -Infinity;
  /** The lane's bottom (px), eased as the view changes; NaN until the first frame with captions. */
  private lane = NaN;
  private hard: Box[] = [];
  private soft: Box[] = [];
  /** Boxes the captions yield to (an open popup, engine/popup.ts): kept off, but the lane does not move for them. */
  private yieldTo: Box[] = [];
  /** The top of the free view (under the buttons and the HUD), px. */
  top = 0;

  /** The game view's top-left corner on the page: every layer over it (captions, the popup) starts there. */
  origin() { const r = this.layer.getBoundingClientRect(); return { left: r.left, top: r.top }; }

  /** The view's width and free height (on a phone the touch buttons lie over the bottom of it), px. */
  private view() {
    const pad = document.getElementById('touch'), padTop = pad?.offsetParent ? pad.getBoundingClientRect().top - this.origin().top : 0;
    return { W: this.layer.clientWidth, H: padTop > 0 ? Math.min(padTop, this.layer.clientHeight) : this.layer.clientHeight };
  }

  /** Where the lane's bottom wants to be: a gap over the tallest of the devices, the people, the player and `things`; room for `h0` under the HUD. */
  private laneOver(things: Box[], h0: number, W: number, H: number) {
    const lo = this.top + EDGE, hi = H - EDGE;
    const tops = [...this.soft, ...this.hard, ...things].filter((b) => b.r > 0 && b.l < W && b.b > lo).map((b) => b.t);
    return Math.max(lo + h0, Math.min(hi, ...tops) - GAP);
  }

  /** The lane's bottom now (px), for a thing's popup (its plate sits in the lane): eased while captions show, else where it would be. */
  laneBottom() {
    if (!Number.isNaN(this.lane)) return this.lane;
    const { W, H } = this.view();
    return this.laneOver([], 18, W, H);
  }

  constructor(host: HTMLElement) {
    this.layer = el('fx-layer');
    this.layer.setAttribute('aria-live', 'polite');
    host.appendChild(this.layer);
  }

  /** How many lines are showing and waiting (for tests and the host). */
  get pending() { return { shown: this.caps.map((c) => c.text), waiting: this.queue.map((c) => c.text) }; }

  /**
   * A device's line, for its caption. `tone`: ok (green), err (red), anything else paper.
   * It pings at once; the caption shows when there is room (red ones first).
   */
  caption(from: string, text: string, tone: string | undefined, locate: Locate) {
    const kind: PingKind = tone === 'ok' ? 'ok' : tone === 'err' ? 'err' : 'look';
    this.ping(from, kind, locate);
    if (!locate(from)) return;
    const now = performance.now();
    // the same thing speaking again: its caption says the new line, in place
    const showing = this.caps.find((c) => c.from === from && !c.fading);
    if (showing) { showing.next = { text, kind, at: now }; showing.el?.classList.add('swap'); showing.until = now + SWAP_OUT_MS + readMs(text); return; }
    const waiting = this.queue.find((c) => c.from === from);
    if (waiting) { waiting.text = text; waiting.kind = kind; if (kind === 'err') this.jump(waiting); return; }
    const c: Caption = { from, text, kind, shown: 0, until: 0, fading: false };
    if (kind === 'err') this.jump(c); else this.queue.push(c);
    // a long queue: the oldest waiting keep their first sentence; a very long one drops the oldest
    if (this.queue.length > LONG_QUEUE) this.queue.slice(0, this.queue.length - LONG_QUEUE).forEach((q) => { q.text = summary(q.text); });
    while (this.queue.length > MAX_QUEUE) { const i = this.queue.findIndex((q) => q.kind !== 'err'); this.queue.splice(i < 0 ? 0 : i, 1); }
    this.update(locate);
  }

  /** A red line goes before every other waiting line (after earlier red ones), and hurries the oldest one showing. */
  private jump(c: Caption) {
    this.queue = this.queue.filter((q) => q !== c);
    const i = this.queue.findIndex((q) => q.kind !== 'err');
    this.queue.splice(i < 0 ? this.queue.length : i, 0, c);
    const now = performance.now(), old = this.caps.find((s) => s.kind !== 'err' && !s.fading);
    if (old && this.caps.length >= MAX_SHOWN) old.until = Math.min(old.until, Math.max(old.shown + 900, now));
  }

  /** The new words, once the old ones are out (`swap`): the box takes their size and is placed again. */
  private retext(c: Caption, text: string, kind: PingKind) {
    c.text = text; c.kind = kind; c.next = undefined;
    if (c.el) { c.el.textContent = text; c.el.className = 'fx-cap ' + tone(kind); }
    c.lead?.setAttribute('class', 'fx-lead ' + tone(kind));
  }

  /** A caption's elements: the box and its leader (an SVG polyline, so it can bend). */
  private make(c: Caption) {
    c.el = el('fx-cap ' + tone(c.kind), c.text);
    c.lead = document.createElementNS(SVG, 'svg');
    c.lead.setAttribute('class', 'fx-lead ' + tone(c.kind));
    c.lead.appendChild(document.createElementNS(SVG, 'polyline'));
    this.layer.append(c.lead, c.el);
  }

  /** A ring where `from` is; an arrow at the edge when it is off the view. */
  ping(from: string, kind: PingKind, locate: Locate) {
    const at = locate(from);
    if (!at) return;
    const edge = at.off !== 0;
    const e = el('fx-ping ' + kind + (edge ? ' edge ' + (at.off < 0 ? 'left' : 'right') : ''));
    if (edge) e.textContent = at.off < 0 ? '◀' : '▶';
    this.layer.appendChild(e);
    this.pings.push({ from, el: e, born: performance.now(), life: edge ? EDGE_MS : RING_MS, edge });
    this.update(locate);
  }

  private drop(c: Caption) { c.el?.remove(); c.lead?.remove(); this.caps = this.caps.filter((x) => x !== c); }

  /**
   * Every frame: follow the anchors, let waiting lines in, place the captions in the lane, retire
   * what is done. `hard`: boxes a caption never covers (the player, a speech bubble); `soft`: boxes
   * it would rather not cover and keeps the lane above (devices, people), CSS px.
   */
  update(locate: Locate, hard?: Box[], soft?: Box[], yieldTo?: Box[]) {
    if (hard) this.hard = hard;
    if (soft) this.soft = soft;
    if (yieldTo) this.yieldTo = yieldTo;
    if (!this.caps.length && !this.pings.length && !this.queue.length) { this.lane = NaN; return; }
    // on a phone the touch buttons lie over the bottom of the view: arrows stay above them
    const now = performance.now(), { W, H } = this.view();
    for (const p of [...this.pings]) {
      const at = locate(p.from);
      if (!at || now - p.born > p.life) { p.el.remove(); this.pings = this.pings.filter((x) => x !== p); continue; }
      if (p.edge) {
        const y = Math.max(this.top + 12, Math.min(H - 24, at.y));
        p.el.style.left = (at.off < 0 ? EDGE : W - EDGE - 22) + 'px'; p.el.style.top = y - 11 + 'px';
      } else {
        const r = Math.max(18, Math.min(60, Math.max(at.w, at.h) * 0.6));
        p.el.style.left = at.x - r + 'px'; p.el.style.top = at.y - r + 'px'; p.el.style.width = p.el.style.height = r * 2 + 'px';
      }
    }
    // retire: fade when its time is up, gone after the fade (or when its thing is gone); a fading
    // caption still holds its place until it is gone
    for (const c of [...this.caps]) {
      if (!locate(c.from) || now > c.until + FADE_MS) { this.drop(c); continue; }
      if (c.next && now - c.next.at >= SWAP_OUT_MS) this.retext(c, c.next.text, c.next.kind);
      if (!c.fading && !c.next && now > c.until) { c.fading = true; c.el!.classList.add('out'); c.lead!.classList.add('out'); }
    }
    this.queue = this.queue.filter((c) => !!locate(c.from));
    // let the next one in when there is room (it may still go back to wait: see the placing below)
    const fresh = new Set<Caption>();
    while (this.queue.length && this.caps.length < MAX_SHOWN && now - this.lastShown >= STAGGER_MS) {
      const c = this.queue.shift()!;
      this.make(c);
      c.shown = now; c.until = now + readMs(c.text); this.lastShown = now;
      this.caps.push(c); fresh.add(c);
    }
    if (!this.caps.length) return;
    // the lane: its bottom a gap over the tallest thing on screen that matters (devices, people, the
    // player, the things the captions talk about), never under the HUD; eased, so it does not jump
    const lo = this.top + EDGE, hi = H - EDGE;
    const things = this.caps.map((c) => locate(c.from)).filter((a): a is Spot2D => !!a && !a.off).map(boxOf);
    const h0 = Math.max(...this.caps.map((c) => c.el!.offsetHeight), 18);
    const want = this.laneOver(things, h0, W, H);
    this.lane = Number.isNaN(this.lane) ? want : this.lane + (want - this.lane) * 0.2;
    // an open popup wins: captions keep off it (a box they never cover), but the lane does not move for it
    const hardAll = [...this.hard, ...this.yieldTo];
    // oldest first, so a caption that is there stays put and the newcomer finds room beside it
    const placed: Box[] = [], leads: { c: Caption; q: Box; thing: Box }[] = [];
    for (const c of [...this.caps]) {
      const at = locate(c.from)!, e = c.el!, w = e.offsetWidth, h = e.offsetHeight;
      const off = at.off !== 0, thing = off ? null : boxOf(at);
      const cx = off ? (at.off < 0 ? EDGE + 28 + w / 2 : W - EDGE - 28 - w / 2) : at.x;
      const soft = this.soft.filter((s) => !thing || area(s, thing) < (thing.r - thing.l) * (thing.b - thing.t) * 0.8);
      const { box: q, free } = placeInLane(w, h, cx, thing, this.lane, placed, hardAll, soft, W, lo, hi);
      // a newcomer with no free spot waits (at the front of the queue): nothing ever lands on another box
      if (!free && fresh.has(c)) { this.drop(c); c.el = undefined; c.lead = undefined; this.queue.unshift(c); this.lastShown = -Infinity; continue; }
      placed.push(q); c.box = q;
      e.style.left = q.l + 'px'; e.style.top = q.t + 'px';
      c.lead!.toggleAttribute('hidden', off);
      if (thing) leads.push({ c, q, thing });
      // its thing is off the view: the arrow says where
      if (fresh.has(c) && off) this.ping(c.from, c.kind, locate);
    }
    // the leaders, once every box has its place: each keeps clear of the other boxes
    for (const { c, q, thing } of leads) {
      const pts = leaderPath(q, thing, [...placed.filter((p) => p !== q), ...this.yieldTo]);
      c.lead!.firstElementChild!.setAttribute('points', pts.map(([x, y]) => Math.round(x) + 0.5 + ',' + Math.round(y)).join(' '));
    }
  }

  /** What is on screen now (for checks): the boxes showing, CSS px of the game view. */
  get boxes(): Box[] { return this.caps.filter((c) => c.box).map((c) => c.box!); }

  /** Leaving the scene: nothing lingers. */
  clear() {
    this.caps.forEach((c) => { c.el?.remove(); c.lead?.remove(); }); this.pings.forEach((p) => p.el.remove());
    this.caps = []; this.queue = []; this.pings = []; this.lane = NaN;
  }
}

export const FEEDBACK_STYLES = `
    /* Feedback in the world (game/engine/feedback.ts): device captions over the thing that reacted, pings */
    .fx-layer {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 6;
      overflow: hidden;
      pointer-events: none;
      font-family: var(--font-mono);
    }

    .fx-cap {
      position: absolute;
      max-width: min(240px, 70%);
      padding: 4px 8px;
      font-size: 11px;
      line-height: 1.35;
      color: rgb(255, 217, 165);
      background: rgba(0, 0, 0, 0.84);
      border: var(--border-thin) solid rgba(255, 217, 165, 0.55);
      animation: fx-in 0.25s ease both;
      transition: opacity ${SWAP_IN_MS}ms ease;
    }

    .fx-cap.ok { color: var(--color-success); border-color: rgba(34, 197, 94, 0.7); }
    .fx-cap.err { color: var(--color-error); border-color: rgba(255, 42, 68, 0.7); }
    .fx-lead { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; fill: none; stroke: rgba(255, 217, 165, 0.55); stroke-width: 1; animation: fx-in 0.25s ease both; transition: opacity ${FADE_MS}ms ease; }
    .fx-lead.ok { stroke: rgba(34, 197, 94, 0.7); }
    .fx-lead.err { stroke: rgba(255, 42, 68, 0.7); }
    .fx-cap.out, .fx-lead.out { opacity: 0; transition-duration: ${FADE_MS}ms; }
    /* new words for a caption already up: the old ones go out first, then the new ones come in */
    .fx-cap.swap { opacity: 0; transition-duration: ${SWAP_OUT_MS}ms; }
    .fx-cap[hidden], .fx-lead[hidden] { display: none; }

    .fx-ping { position: absolute; box-sizing: border-box; border: 2px solid; border-radius: 50%; animation: fx-ring 0.8s ease-out 2 both; }
    .fx-ping.ok { border-color: var(--color-success); }
    .fx-ping.err { border-color: var(--color-error); }
    .fx-ping.look { border-color: var(--color-accent-400); }
    .fx-ping.edge {
      width: 22px;
      height: 22px;
      border-radius: 2px;
      display: grid;
      place-items: center;
      font-size: 11px;
      background: rgba(0, 0, 0, 0.8);
      animation: fx-edge 0.65s ease-in-out 4 both;
    }

    .fx-ping.edge.ok { color: var(--color-success); }
    .fx-ping.edge.err { color: var(--color-error); }
    .fx-ping.edge.look { color: var(--color-accent-400); }
    @keyframes fx-in { from { opacity: 0; transform: translateY(5px); } }
    @keyframes fx-ring { from { opacity: 0.95; transform: scale(0.35); } to { opacity: 0; transform: scale(1.25); } }
    @keyframes fx-edge { 50% { box-shadow: 0 0 10px currentColor; transform: scale(1.12); } }
    @media (prefers-reduced-motion: reduce) {
      .fx-cap, .fx-lead { animation: none; }
      .fx-ping { animation-duration: 1.6s; animation-iteration-count: 1; }
    }
`;
