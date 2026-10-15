/**
 * Feedback in the world: UI never covers a consequence (ART-GUIDE.md §11).
 *
 * - Captions: a device's reply ("ROUTER: online. …") stands over the thing that
 *   reacted, not over the thing you tapped: a small dry speech plate with a thin
 *   leader down to it. It fades in, stays a few seconds and fades out; several
 *   stack without covering each other. Green when it worked, red when it was
 *   denied, paper otherwise. The terminal (or the phone's HUD line) keeps the history.
 * - Pings: an expanding ring where something happened (green success, red alert,
 *   cyan attention); when that spot is off the view, an arrow at the edge points
 *   to it instead.
 *
 * Both follow their anchor every frame (the camera moves, Pixel walks): the host
 * hands `update` a `locate` that says where a speaker is on screen now.
 * Styles: FEEDBACK_STYLES, inlined by render.tsx.
 */

/** Where something is on screen (CSS px of the game view): its box centre and size, and whether it is off to a side. */
export interface Spot2D { x: number; y: number; w: number; h: number; off: -1 | 0 | 1 }
export type PingKind = 'ok' | 'err' | 'look';
export type Locate = (from: string) => Spot2D | null;

/** How long a caption stays (ms), and when it starts to fade. */
const CAPTION_MS = 5200, FADE_MS = 800;
/** A ring's life, an edge arrow's (ms). */
const RING_MS = 1700, EDGE_MS = 2600;
/** Gap between a thing's top and its caption, between stacked captions, and from the edges (px). */
const LEAD = 14, STACK = 4, EDGE = 6;
/** At most this many captions at once; the oldest goes first. */
const MAX_CAPTIONS = 4;

interface Caption { from: string; el: HTMLDivElement; lead: HTMLDivElement; born: number; fading: boolean }
interface Ping { from: string; el: HTMLDivElement; born: number; life: number; edge: boolean }

function el(cls: string, text?: string) { const e = document.createElement('div'); e.className = cls; if (text != null) e.textContent = text; return e; }

export class Feedback {
  private layer: HTMLDivElement;
  private caps: Caption[] = [];
  private pings: Ping[] = [];
  /** The top of the free view (under the buttons and the HUD), px. */
  top = 0;

  /** The game view's top-left corner on the page: every layer over it (captions, the popup) starts there. */
  origin() { const r = this.layer.getBoundingClientRect(); return { left: r.left, top: r.top }; }

  constructor(host: HTMLElement) {
    this.layer = el('fx-layer');
    this.layer.setAttribute('aria-live', 'polite');
    host.appendChild(this.layer);
  }

  /** A device's line over the device. `tone`: ok (green), err (red), anything else paper. Pings it too. */
  caption(from: string, text: string, tone: string | undefined, locate: Locate) {
    const kind: PingKind = tone === 'ok' ? 'ok' : tone === 'err' ? 'err' : 'look';
    this.ping(from, kind, locate);
    const at = locate(from);
    if (!at || at.off) return;
    // the same thing speaking again: its newer line replaces the older one
    this.caps.filter((c) => c.from === from).forEach((c) => this.drop(c));
    while (this.caps.length >= MAX_CAPTIONS) this.drop(this.caps[0]);
    const cap = el('fx-cap ' + (kind === 'look' ? 'paper' : kind), text), lead = el('fx-lead ' + (kind === 'look' ? 'paper' : kind));
    this.layer.append(lead, cap);
    this.caps.push({ from, el: cap, lead, born: performance.now(), fading: false });
    this.update(locate);
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

  private drop(c: Caption) { c.el.remove(); c.lead.remove(); this.caps = this.caps.filter((x) => x !== c); }

  /** Every frame: follow the anchors, stack the captions, retire what is done. */
  update(locate: Locate) {
    if (!this.caps.length && !this.pings.length) return;
    // on a phone the touch buttons lie over the bottom of the view: arrows stay above them
    const pad = document.getElementById('touch'), padTop = pad?.offsetParent ? pad.getBoundingClientRect().top - this.origin().top : 0;
    const now = performance.now(), W = this.layer.clientWidth, H = padTop > 0 ? Math.min(padTop, this.layer.clientHeight) : this.layer.clientHeight;
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
    // newest first, each over its thing; one that runs into an earlier one goes up above it
    const placed: { l: number; t: number; r: number; b: number }[] = [];
    for (const c of [...this.caps].reverse()) {
      const age = now - c.born, at = locate(c.from);
      if (age > CAPTION_MS || !at) { this.drop(c); continue; }
      if (!c.fading && age > CAPTION_MS - FADE_MS) { c.fading = true; c.el.classList.add('out'); c.lead.classList.add('out'); }
      const hidden = at.off !== 0;
      c.el.hidden = hidden; c.lead.hidden = hidden;
      if (hidden) continue;
      const w = c.el.offsetWidth, h = c.el.offsetHeight, thingTop = at.y - at.h / 2;
      const q = { l: Math.max(EDGE, Math.min(W - w - EDGE, at.x - w / 2)), t: thingTop - LEAD - h, r: 0, b: 0 };
      q.r = q.l + w; q.b = q.t + h;
      for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        if (q.l < p.r + STACK && q.r > p.l - STACK && q.t < p.b + STACK && q.b > p.t - STACK) { q.b = p.t - STACK; q.t = q.b - h; i = -1; }
      }
      // never above the free view: then it stands under the thing's top instead (still over the thing)
      if (q.t < this.top + EDGE) { q.t = this.top + EDGE; q.b = q.t + h; }
      placed.push(q);
      c.el.style.left = q.l + 'px'; c.el.style.top = q.t + 'px';
      const lx = Math.max(q.l + 4, Math.min(q.r - 4, at.x)), len = Math.max(0, thingTop - q.b);
      c.lead.style.left = lx + 'px'; c.lead.style.top = q.b + 'px'; c.lead.style.height = len + 'px';
    }
  }

  /** Leaving the zone: nothing lingers. */
  clear() { this.caps.forEach((c) => { c.el.remove(); c.lead.remove(); }); this.pings.forEach((p) => p.el.remove()); this.caps = []; this.pings = []; }
}

/** Captions and pings (render.tsx inlines it). Paper is the warm white of text you read; green worked, red denied, cyan look. */
export const FEEDBACK_STYLES = `
    /* Feedback in the world (game/zone/feedback.ts): device captions over the thing that reacted, pings */
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
      transition: opacity 0.8s ease;
    }

    .fx-cap.ok { color: var(--color-success); border-color: rgba(34, 197, 94, 0.7); }
    .fx-cap.err { color: var(--color-error); border-color: rgba(255, 42, 68, 0.7); }
    .fx-lead { position: absolute; width: 1px; background: rgba(255, 217, 165, 0.55); animation: fx-in 0.25s ease both; transition: opacity 0.8s ease; }
    .fx-lead.ok { background: rgba(34, 197, 94, 0.7); }
    .fx-lead.err { background: rgba(255, 42, 68, 0.7); }
    .fx-cap.out, .fx-lead.out { opacity: 0; }
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
