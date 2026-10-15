/**
 * A thing's popup in the world: what a click or E on a device opens, right
 * next to it. No schematic, no nouns, no events: its everyday actions (the
 * kettle: boil; the blinds: open, close), then `⌁ jack in` for a computer
 * (the full device screen) and, last, `⌁ hack it` (hack view, on this device).
 *
 * Everyday actions run the noun's verb exactly as a tap on the schematic
 * would, and the popup closes at once: the scene is free when the reaction
 * plays (the reply is a caption over whatever reacted, scene/feedback.ts).
 * It opens beside the thing, on the side away from what the thing affects
 * (what it is cabled to, the player, Pixel), never over the thing or the
 * player, with a short connector line to it; with no side free (a crowded
 * phone view) it goes to the top of the view, under the HUD. Arrow keys move,
 * Enter or E picks, Esc or a click elsewhere closes; walking away closes it
 * too (the host decides).
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

/** Space between the thing's frame and the popup, and from the edges of the view (px). */
const GAP = 14, EDGE = 4;
type Box = { l: number; t: number; r: number; b: number };
const boxOf = (a: PopupAnchor): Box => ({ l: a.x - a.w / 2, t: a.y - a.h / 2, r: a.x + a.w / 2, b: a.y + a.h / 2 });
const meets = (p: Box, q: Box) => p.l < q.r && p.r > q.l && p.t < q.b && p.b > q.t;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}

export class Popup {
  private layer: HTMLDivElement;
  private box: HTMLDivElement;
  private title: HTMLDivElement;
  private list: HTMLDivElement;
  private wire: SVGLineElement;
  private room: PopupRoom = { avoid: [], keepClear: [], top: 0 };
  private items: PopupItem[] = [];
  private sel = 0;
  private outside = (e: PointerEvent) => { if (!this.box.contains(e.target as Node)) this.close(); };
  /** The device it is open for. */
  dev: string | null = null;
  onClose: () => void = () => {};

  constructor(host: HTMLElement) {
    this.layer = el('div', 'thing-layer'); this.layer.hidden = true;
    this.box = el('div', 'thing-pop'); this.box.setAttribute('role', 'menu');
    this.title = el('div', 'thing-title');
    this.list = el('div', 'thing-list');
    this.box.append(this.title, this.list);
    // the connector: a short line from the popup to its thing
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'thing-wire');
    this.wire = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svg.appendChild(this.wire);
    this.layer.append(svg, this.box);
    host.appendChild(this.layer);
  }

  get isOpen() { return !this.layer.hidden; }

  /** Open for a device: its name, its entries, next to where it stands. */
  open(dev: string, name: string, aria: string, items: PopupItem[], at: PopupAnchor | undefined, room?: PopupRoom) {
    const again = this.dev === dev && this.isOpen;
    this.dev = dev;
    if (room) this.room = room;
    this.title.textContent = name;
    this.box.setAttribute('aria-label', aria);
    if (!again) this.sel = 0;
    this.fill(items);
    if (this.layer.hidden) {
      this.layer.hidden = false;
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
      const b = el('button', 'thing-item' + (it.hack ? ' hack' : '') + (it.cur ? ' cur' : '') + (i === this.sel ? ' sel' : ''), it.label);
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

  /**
   * Beside the thing, on the side away from what it affects: right, left or above,
   * whichever fits in the view, covers neither the thing nor the player nor the
   * buttons, and has the fewest affected things on its side. None fits: the top of
   * the view, under the HUD. A short line connects it to the thing.
   */
  place(a: PopupAnchor) {
    const W = this.layer.clientWidth, H = this.freeHeight(), w = this.box.offsetWidth, h = this.box.offsetHeight;
    const { avoid, keepClear, top } = this.room, thing = boxOf(a), clear = [thing, ...keepClear.map(boxOf)];
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
    // nowhere beside it: the top of the view, under the HUD, as near the thing as it fits
    const b = best ? best.s.b : (() => { const l = Math.max(EDGE, Math.min(W - w - EDGE, a.x - w / 2)); return { l, t: top + EDGE, r: l + w, b: top + EDGE + h }; })();
    this.box.style.left = Math.round(b.l) + 'px'; this.box.style.top = Math.round(b.t) + 'px';
    // the connector: from the popup's nearest edge to the thing's nearest point
    const px = Math.max(b.l, Math.min(b.r, a.x)), py = Math.max(b.t, Math.min(b.b, a.y));
    const tx = Math.max(thing.l, Math.min(thing.r, px)), ty = Math.max(thing.t, Math.min(thing.b, py));
    this.wire.setAttribute('x1', String(px)); this.wire.setAttribute('y1', String(py));
    this.wire.setAttribute('x2', String(tx)); this.wire.setAttribute('y2', String(ty));
  }

  close() {
    if (this.layer.hidden) return;
    this.layer.hidden = true; this.dev = null; this.items = [];
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
      z-index: 6;
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
    .thing-wire line { stroke: rgba(0, 255, 255, 0.6); stroke-width: 1; }
    /* touch targets stay at least 44 px */
    html.touch .thing-item { min-height: 44px; font-size: 13px; }
`;
