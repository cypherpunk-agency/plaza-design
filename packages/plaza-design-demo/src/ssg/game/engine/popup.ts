/**
 * A thing's popup in the world: what a click or E on a device opens, right
 * next to it. No schematic, no nouns, no events: its everyday actions (the
 * kettle: boil; the blinds: open, close), then `⌁ jack in` for a computer
 * (the full device screen) and, last, `⌁ hack it` (hack view, on this device).
 *
 * Everyday actions run the noun's verb exactly as a tap on the schematic
 * would, and the popup closes at once: the scene is free when the reaction
 * plays (the reply is a caption in the caption lane, engine/feedback.ts).
 * Where it opens is a placement (POPUP_PLACEMENT, POPUP_LAYOUTS: one pure
 * function each, from the thing's anchor and the popup's size to the box, a
 * ring round the thing and the connector's points): by default a row along the
 * bottom (on a phone, in the action buttons' place), or a row along the top, or
 * beside the thing. Arrow keys move, Enter or E picks, Esc, ✕ or a click
 * elsewhere closes; walking away closes it too (the host decides).
 *
 * Colours per ART-GUIDE.md §6: cyan for what you can use, pink for the
 * hacking entries. Styles: POPUP_STYLES, inlined by render.tsx.
 */

/** One entry: an everyday action (cyan), or a hacking one (pink). `cur`: the state it is in now. */
export interface PopupItem { label: string; hack?: boolean; cur?: boolean; run: () => void }
/** Where the thing stands on screen: its box centre and size, in CSS px of the game view. */
export interface PopupAnchor { x: number; y: number; w: number; h: number }
/** What placing the popup keeps in mind (CSS px of the game view). */
export interface PopupRoom {
  /** Points the thing affects (cable partners, the player, Pixel): the popup opens on the side away from them. */
  avoid: { x: number; y: number }[];
  /** Boxes it must never cover (the player, the buttons), as centre and size. */
  keepClear: PopupAnchor[];
  /** The top of the free view (under the HUD and the buttons). */
  top: number;
}

/**
 * Where a thing's popup opens (an experiment, Tommi 2026-10-15; keep all three to compare):
 * - 'bottom': a row of actions along the bottom, where the thumbs are. On a touch screen it takes
 *   the place of the action buttons (ESC, MAP, JMP, ACT) while it is open; the walk arrows stay.
 * - 'top': the same row along the top of the free view, under the HUD (HACK and BOARD step aside).
 * - 'beside': next to the thing, on the side away from what it affects.
 * The rows mark the thing with a ring and a thin connector down (or up) to it.
 */
export type PopupPlacement = 'bottom' | 'top' | 'beside';
export const POPUP_PLACEMENT: PopupPlacement = 'bottom';

/** Space between the thing's frame and the popup, and from the edges of the view (px). */
const GAP = 14, EDGE = 4;
export type Box = { l: number; t: number; r: number; b: number };
const boxOf = (a: PopupAnchor): Box => ({ l: a.x - a.w / 2, t: a.y - a.h / 2, r: a.x + a.w / 2, b: a.y + a.h / 2 });
const meets = (p: Box, q: Box) => p.l < q.r && p.r > q.l && p.t < q.b && p.b > q.t;

/** What a placement knows: the thing, the popup's measured size, the free view, what to keep clear of. CSS px of the game view. */
export interface PopupLayoutIn {
  anchor: PopupAnchor;
  size: { w: number; h: number };
  /** The view's width and free height (above the touch buttons), and the top of the free view (under the HUD). */
  view: { W: number; H: number; top: number };
  room: PopupRoom;
  /** On a touch screen: the walk arrows' and the action buttons' boxes. */
  pads: { walk: Box; act: Box } | null;
  /** Where the popup stood last frame for this thing (a row stays put while open), or null on opening. */
  prev: { l: number; t: number } | null;
}
/** What a placement returns: where the popup box goes, the ring round the thing (or none), the connector's points. */
export interface PopupLayout { box: Box; ring: Box | null; wire: [number, number][] }
export type PopupLayoutFn = (p: PopupLayoutIn) => PopupLayout;

/** A row along the bottom or the top; on a touch screen the bottom row stands in the action buttons' place. */
const rowLayout = (where: 'bottom' | 'top'): PopupLayoutFn => ({ anchor: a, size: { w, h }, view: { W, H, top }, pads, prev }) => {
  let at = prev;
  if (!at) {
    let l = Math.max(EDGE, Math.min(W - w - EDGE, a.x - w / 2)), t = where === 'top' ? top + EDGE : H - h - EDGE;
    if (where === 'bottom' && pads) { t = pads.act.b - h; l = Math.max(pads.walk.r + 12, pads.act.r - w); }
    at = { l, t };
  }
  const b = { l: at.l, t: at.t, r: at.l + w, b: at.t + h }, thing = boxOf(a), pad = 3;
  const ring = { l: thing.l - pad, t: thing.t - pad, r: thing.r + pad, b: thing.b + pad };
  const x = Math.max(b.l + 6, Math.min(b.r - 6, a.x));
  const wire: [number, number][] = where === 'top' ? [[x, b.b], [a.x, ring.t]] : [[x, b.t], [a.x, ring.b]];
  return { box: b, ring, wire };
};

/**
 * Beside the thing, on the side away from what it affects: right, left or above, whichever fits in
 * the view, covers neither the thing nor the player nor the buttons, and has the fewest affected
 * things on its side. None fits: the top of the view, under the HUD. A short line connects it.
 */
const besideLayout: PopupLayoutFn = ({ anchor: a, size: { w, h }, view: { W, H }, room }) => {
  const { avoid, keepClear, top } = room, thing = boxOf(a), clear = [thing, ...keepClear.map(boxOf)];
  const y0 = Math.max(top + EDGE, Math.min(H - h - EDGE, a.y - h / 2));
  const sides: { b: Box; away: (p: { x: number; y: number }) => boolean }[] = [
    { b: { l: thing.r + GAP, t: y0, r: thing.r + GAP + w, b: y0 + h }, away: (p) => p.x > a.x },
    { b: { l: thing.l - GAP - w, t: y0, r: thing.l - GAP, b: y0 + h }, away: (p) => p.x < a.x },
    { b: { l: a.x - w / 2, t: thing.t - GAP - h, r: a.x + w / 2, b: thing.t - GAP }, away: (p) => p.y < thing.t },
  ];
  const fits = (b: Box) => b.l >= EDGE && b.r <= W - EDGE && b.t >= top + EDGE - 0.5 && b.b <= H - EDGE && !clear.some((c) => meets(b, c));
  const best = sides.map((s, i) => {
    // a side that would hold an affected thing is worst; one that merely faces them, next
    const inside = avoid.filter((p) => p.x >= s.b.l && p.x <= s.b.r && p.y >= s.b.t && p.y <= s.b.b).length;
    return { s, i, score: inside * 10 + avoid.filter(s.away).length };
  }).filter((c) => fits(c.s.b)).sort((p, q) => p.score - q.score || p.i - q.i)[0];
  const b = best ? best.s.b : (() => { const l = Math.max(EDGE, Math.min(W - w - EDGE, a.x - w / 2)); return { l, t: top + EDGE, r: l + w, b: top + EDGE + h }; })();
  const px = Math.max(b.l, Math.min(b.r, a.x)), py = Math.max(b.t, Math.min(b.b, a.y));
  return { box: b, ring: null, wire: [[px, py], [Math.max(thing.l, Math.min(thing.r, px)), Math.max(thing.t, Math.min(thing.b, py))]] };
};

/** Every placement, by name: a new one (a stalk up into the caption lane, say) is one more entry here. */
export const POPUP_LAYOUTS: Record<PopupPlacement, PopupLayoutFn> = { bottom: rowLayout('bottom'), top: rowLayout('top'), beside: besideLayout };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}

export class Popup {
  private layer: HTMLDivElement;
  private box: HTMLDivElement;
  private title: HTMLDivElement;
  private list: HTMLDivElement;
  private wire: SVGPolylineElement;
  private room: PopupRoom = { avoid: [], keepClear: [], top: 0 };
  private items: PopupItem[] = [];
  private sel = 0;
  private outside = (e: PointerEvent) => { if (!this.box.contains(e.target as Node)) this.close(); };
  /** The ring round the thing (the rows), and where a row stands once opened (it stays put while open). */
  private ring: HTMLDivElement;
  private rowAt: { l: number; t: number } | null = null;
  /** The device it is open for. */
  dev: string | null = null;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, readonly placement: PopupPlacement = POPUP_PLACEMENT) {
    this.layer = el('div', 'thing-layer'); this.layer.hidden = true;
    this.box = el('div', 'thing-pop' + (placement === 'beside' ? '' : ' row ' + placement)); this.box.setAttribute('role', 'menu');
    this.title = el('div', 'thing-title');
    this.list = el('div', 'thing-list');
    this.box.append(this.title, this.list);
    // the rows close with ✕ as well as Esc or a tap elsewhere
    if (placement !== 'beside') {
      const x = el('button', 'thing-item thing-x', '✕'); x.type = 'button'; x.tabIndex = -1; x.setAttribute('aria-label', 'close');
      x.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
      this.box.appendChild(x);
    }
    this.ring = el('div', 'thing-ring'); this.ring.hidden = placement === 'beside';
    // the connector: a short line from the popup to its thing
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'thing-wire');
    this.wire = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); svg.appendChild(this.wire);
    this.layer.append(svg, this.ring, this.box);
    host.appendChild(this.layer);
  }

  get isOpen() { return !this.layer.hidden; }

  /** Open for a device: its name, its entries, next to where it stands. */
  open(dev: string, name: string, aria: string, items: PopupItem[], at: PopupAnchor | undefined, room?: PopupRoom) {
    const again = this.dev === dev && this.isOpen;
    if (!again) this.rowAt = null;
    this.dev = dev;
    if (room) this.room = room;
    this.title.textContent = name;
    this.box.setAttribute('aria-label', aria);
    if (!again) this.sel = 0;
    this.fill(items);
    if (this.layer.hidden) {
      this.layer.hidden = false;
      // a row takes the place of the touch actions (bottom) or of HACK/BOARD (top) while it is open
      if (this.placement !== 'beside') document.documentElement.classList.add('thing-' + this.placement);
      // a click anywhere else closes it (capture: before the canvas opens another thing's popup)
      window.addEventListener('pointerdown', this.outside, true);
    }
    if (at) this.place(at);
  }

  /** The entries again (after an action: which one is current may have changed). */
  fill(items: PopupItem[]) {
    this.items = items;
    this.sel = Math.min(this.sel, items.length - 1);
    this.list.textContent = '';
    items.forEach((it, i) => {
      const b = el('button', 'thing-item' + (it.hack ? ' hack' : '') + (it.cur ? ' cur' : '') + (i === this.sel ? ' sel' : ''));
      // the hacking entries' mark (⌁, missing from IBM Plex Mono) is drawn: a small jack plug
      const label = it.label.replace(/^⌁\s*/, '');
      if (label !== it.label) b.appendChild(el('span', 'thing-ico'));
      b.appendChild(document.createTextNode(label));
      b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1;
      b.addEventListener('pointerenter', () => this.select(i));
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = i; it.run(); });
      this.list.appendChild(b);
    });
  }

  /** The free view's height: on a phone the touch buttons lie over the bottom of it. */
  private freeHeight() {
    const pad = document.getElementById('touch'), top = this.layer.getBoundingClientRect().top;
    const padTop = pad?.offsetParent ? pad.getBoundingClientRect().top - top : Infinity;
    return Math.min(this.layer.clientHeight, padTop > 0 ? padTop : Infinity);
  }

  /** On a touch screen, the walk arrows' and the action buttons' boxes (CSS px of the game view). */
  private pads(): PopupLayoutIn['pads'] {
    const pads = document.querySelectorAll<HTMLElement>('#touch .pad');
    if (pads.length !== 2 || !pads[0].offsetParent) return null;
    const o = this.layer.getBoundingClientRect();
    const rel = (e: HTMLElement): Box => { const r = e.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top }; };
    return { walk: rel(pads[0]), act: rel(pads[1]) };
  }

  /** Every frame while open: the placement (POPUP_LAYOUTS) says where the box, the ring and the connector go. */
  place(a: PopupAnchor) {
    const lay = POPUP_LAYOUTS[this.placement]({
      anchor: a, size: { w: this.box.offsetWidth, h: this.box.offsetHeight },
      view: { W: this.layer.clientWidth, H: this.freeHeight(), top: this.room.top },
      room: this.room, pads: this.pads(), prev: this.rowAt,
    });
    this.rowAt = { l: lay.box.l, t: lay.box.t };
    this.box.style.left = Math.round(lay.box.l) + 'px'; this.box.style.top = Math.round(lay.box.t) + 'px';
    this.ring.hidden = !lay.ring;
    if (lay.ring) Object.assign(this.ring.style, { left: lay.ring.l + 'px', top: lay.ring.t + 'px', width: lay.ring.r - lay.ring.l + 'px', height: lay.ring.b - lay.ring.t + 'px' });
    this.wire.setAttribute('points', lay.wire.map(([x, y]) => Math.round(x) + 0.5 + ',' + Math.round(y)).join(' '));
  }

  close() {
    if (this.layer.hidden) return;
    this.layer.hidden = true; this.dev = null; this.items = []; this.rowAt = null;
    document.documentElement.classList.remove('thing-bottom', 'thing-top');
    window.removeEventListener('pointerdown', this.outside, true);
    this.onClose();
  }

  private select(i: number) {
    this.sel = i;
    [...this.list.children].forEach((b, j) => b.classList.toggle('sel', j === i));
  }

  /** A key while it is open. True when the popup used it; false lets the game have it (walking away closes it). */
  key(e: KeyboardEvent): boolean {
    const n = this.items.length, k = e.key;
    if (k === 'Escape') { e.preventDefault(); this.close(); return true; }
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); if (n) this.select((this.sel + (k === 'ArrowDown' ? 1 : n - 1)) % n); return true; }
    if (k === 'Enter' || k === 'e' || k === 'E' || k === ' ') { e.preventDefault(); if (!e.repeat) this.items[this.sel]?.run(); return true; }
    this.close();
    return false;
  }
}

/** The popup's look (render.tsx inlines it): cyan entries you can use, pink ones that hack. */
export const POPUP_STYLES = `
    /* A thing's popup in the world (game/engine/popup.ts): its everyday actions, then jack in / hack it */
    .thing-layer {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      bottom: var(--game-bottom, 40px);
      z-index: 8;
      overflow: hidden;
      pointer-events: none;
      font-family: var(--font-mono);
    }

    .thing-layer[hidden] { display: none; }

    .thing-pop {
      position: absolute;
      display: grid;
      gap: 2px;
      min-width: 9em;
      max-width: min(16em, 60%);
      padding: 4px;
      background: rgba(3, 8, 9, 0.94);
      border: var(--border-thin) solid rgba(0, 255, 255, 0.55);
      box-shadow: 0 0 12px rgba(0, 255, 255, 0.18);
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
    }

    .thing-title { padding: 0 4px 2px; font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: rgb(255, 136, 0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .thing-list { display: grid; gap: 2px; }

    .thing-item {
      display: block;
      width: 100%;
      min-height: 22px;
      padding: 2px 8px;
      text-align: left;
      background: #031416;
      color: var(--color-accent-400);
      border: var(--border-thin) solid #0d4a52;
      font-family: var(--font-mono);
      font-size: 11px;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
    }

    .thing-item.sel,
    .thing-item:hover { border-color: var(--color-accent-400); box-shadow: 0 0 8px rgba(0, 255, 255, 0.3); }
    .thing-item.cur { color: var(--color-success); border-color: var(--color-success); background: #04140a; }
    .thing-item.hack { color: rgb(255, 61, 242); background: #160416; border-color: rgba(255, 61, 242, 0.45); }
    .thing-item.hack.sel,
    .thing-item.hack:hover { border-color: rgb(255, 61, 242); box-shadow: 0 0 8px rgba(255, 61, 242, 0.4); }

    .thing-wire { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    .thing-wire polyline { fill: none; stroke: rgba(0, 255, 255, 0.6); stroke-width: 1; }
    /* touch targets stay at least 44 px */
    html.touch .thing-item { min-height: 44px; font-size: 13px; }

    /* the hacking entries' mark: a small jack plug, drawn (IBM Plex Mono has no ⌁) */
    .thing-ico {
      display: inline-block;
      width: 0.62em;
      height: 0.9em;
      margin-right: 0.45em;
      vertical-align: -0.12em;
      background: currentColor;
      clip-path: polygon(20% 0, 35% 0, 35% 22%, 65% 22%, 65% 0, 80% 0, 80% 22%, 100% 22%, 100% 55%, 62% 78%, 62% 100%, 38% 100%, 38% 78%, 0 55%, 0 22%, 20% 22%);
    }

    /* the rows (POPUP_PLACEMENT 'bottom' / 'top'): name, actions, ✕ in one line; a ring on the thing */
    .thing-pop.row { display: flex; flex-wrap: wrap; align-items: stretch; gap: 4px; min-width: 0; max-width: calc(100% - 8px); }
    .thing-pop.row.bottom { flex-wrap: wrap-reverse; }
    .thing-pop.row .thing-title { display: flex; align-items: center; padding: 0 6px; font-size: 10px; }
    .thing-pop.row .thing-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .thing-pop.row .thing-item { width: auto; min-height: 28px; }
    .thing-pop.row .thing-x { min-width: 28px; text-align: center; color: rgba(255, 217, 165, 0.85); background: #0b0805; border-color: rgba(255, 217, 165, 0.35); }
    html.touch .thing-pop.row .thing-item { min-height: 44px; min-width: 44px; }
    .thing-ring {
      position: absolute;
      box-sizing: border-box;
      border: 1px solid rgba(0, 255, 255, 0.85);
      box-shadow: 0 0 8px rgba(0, 255, 255, 0.45), inset 0 0 6px rgba(0, 255, 255, 0.2);
      animation: thing-ring 1.4s ease-in-out infinite;
    }

    .thing-ring[hidden] { display: none; }
    @keyframes thing-ring { 50% { border-color: rgba(0, 255, 255, 0.4); } }
    @media (prefers-reduced-motion: reduce) { .thing-ring { animation: none; } }
    /* while a row is open it takes the place of the touch actions (bottom) or of HACK/BOARD (top) */
    html.thing-bottom #touch .pad:last-child,
    html.thing-top #scene-btns { visibility: hidden; }
`;
