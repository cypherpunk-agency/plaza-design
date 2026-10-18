/**
 * The key bar: the scene's own buttons along the top of the game window (HACK and BOARD; in hack
 * vision EXIT, BOARD, LOGIC, UNFOLD), where there is something to hack. The keys themselves are in
 * the deck's CONTROLS tab (Esc) and taught once by control hints (hints.ts); MAP, TERMINAL, SOUND
 * and MENU no longer have buttons here (Tab, Enter, the deck's SYSTEM tab, Esc).
 *
 * Styles live in render.tsx (`#key-bar`).
 */

export class KeyBar {
  readonly root: HTMLDivElement;
  private actions: HTMLDivElement;

  constructor(host: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'key-bar';
    this.actions = document.createElement('div');
    this.actions.className = 'kb-actions';
    this.root.append(this.actions);
    host.appendChild(this.root);
  }

  /** The scene's own buttons (HACK, BOARD; in hack vision EXIT, BOARD, LOGIC, UNFOLD) sit in the strip. */
  adopt(el: HTMLElement | null) { if (el && el.parentElement !== this.actions) this.actions.appendChild(el); }
}
