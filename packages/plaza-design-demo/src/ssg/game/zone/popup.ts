/**
 * A thing's popup in the world: what a click or E on a device opens, right
 * next to it. No schematic, no nouns, no events: its everyday actions (the
 * kettle: boil; the blinds: open, close), then `⌁ jack in` for a computer
 * (the full device screen) and, last, `⌁ hack it` (hack view, on this device).
 *
 * Everyday actions run the noun's verb exactly as a tap on the schematic
 * would; the reply shows under the entries, so you see what happened without
 * the deck. Arrow keys move, Enter or E picks, Esc or a click elsewhere
 * closes; walking away closes it too (the host decides).
 *
 * Colours per ART-GUIDE.md §6: cyan for what you can use, pink for the
 * hacking entries. Styles: POPUP_STYLES, inlined by render.tsx.
 */

import type { Line } from './model';

/** One entry: an everyday action (cyan), or a hacking one (pink). `cur`: the state it is in now. */
export interface PopupItem { label: string; hack?: boolean; cur?: boolean; run: () => void }
/** Where the thing stands on screen: its box centre and size, in CSS px of the game view. */
export interface PopupAnchor { x: number; y: number; w: number; h: number }

/** Space between the thing's frame and the popup, and from the edges of the view (px). */
const GAP = 8, EDGE = 4;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}

export class Popup {
  private layer: HTMLDivElement;
  private box: HTMLDivElement;
  private title: HTMLDivElement;
  private list: HTMLDivElement;
  private said: HTMLDivElement;
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
    this.said = el('div', 'thing-said');
    this.box.append(this.title, this.list, this.said);
    this.layer.appendChild(this.box);
    host.appendChild(this.layer);
  }

  get isOpen() { return !this.layer.hidden; }

  /** Open for a device: its name, its entries, next to where it stands. */
  open(dev: string, name: string, aria: string, items: PopupItem[], at: PopupAnchor | undefined) {
    const again = this.dev === dev && this.isOpen;
    this.dev = dev;
    this.title.textContent = name;
    this.box.setAttribute('aria-label', aria);
    if (!again) { this.sel = 0; this.said.textContent = ''; this.said.className = 'thing-said'; }
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

  /** What the last action said, under the entries. */
  note(l: Line) {
    if (!this.isOpen || !l[1]) return;
    this.said.textContent = l[1];
    this.said.className = 'thing-said ' + (l[2] ?? '');
  }

  /** Beside the thing: to its right, else to its left; its top level with the thing's top, kept inside the view. */
  place(a: PopupAnchor) {
    const W = this.layer.clientWidth, w = this.box.offsetWidth, h = this.box.offsetHeight;
    // on a phone the touch buttons lie over the bottom of the view: stay above them
    const pad = document.getElementById('touch'), top = this.layer.getBoundingClientRect().top;
    const padTop = pad?.offsetParent ? pad.getBoundingClientRect().top - top : Infinity;
    const H = Math.min(this.layer.clientHeight, padTop > 0 ? padTop : Infinity);
    let x = a.x + a.w / 2 + GAP;
    if (x + w > W - EDGE) x = a.x - a.w / 2 - GAP - w;
    x = Math.max(EDGE, Math.min(W - w - EDGE, x));
    const y = Math.max(EDGE, Math.min(H - h - EDGE, a.y - a.h / 2));
    this.box.style.left = Math.round(x) + 'px'; this.box.style.top = Math.round(y) + 'px';
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
    /* A thing's popup in the world (game/zone/popup.ts): its everyday actions, then jack in / hack it */
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

    .thing-said { max-width: 16em; padding: 2px 4px 0; font-size: 10px; line-height: 1.3; color: var(--color-text-body); }
    .thing-said:empty { display: none; }
    .thing-said.ok { color: var(--color-success); }
    .thing-said.err { color: var(--color-error); }
    .thing-said.dim { color: var(--color-text-faint); }
    html.touch .thing-item { min-height: 30px; font-size: 12px; }
`;
