/**
 * The key bar: every key and what it does, along the top of the game window,
 * so nobody has to read a manual. Keys you press for an action are buttons
 * (they send the same key the keyboard would); keys you hold to move are
 * plain labels. The zone's own HACK and BOARD buttons join the same strip.
 *
 * Styles live in render.tsx (`#key-bar`).
 */

import { sound } from './audio';

/** Sends a key to the game, the same way a keyboard would. */
const send = (key: string) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
};

export class KeyBar {
  readonly root: HTMLDivElement;
  private moves: HTMLDivElement;
  private actions: HTMLDivElement;
  private soundBtn: HTMLButtonElement;
  private jump: HTMLSpanElement;

  constructor(host: HTMLElement, private refocus: () => void) {
    this.root = document.createElement('div');
    this.root.id = 'key-bar';
    this.moves = document.createElement('div');
    this.moves.className = 'kb-moves';
    this.actions = document.createElement('div');
    this.actions.className = 'kb-actions';
    const label = (key: string, what: string) => {
      const s = document.createElement('span');
      s.className = 'kb-hint';
      s.innerHTML = '<kbd></kbd> ';
      s.firstElementChild!.textContent = key;
      s.append(what);
      this.moves.appendChild(s);
      return s;
    };
    label('← →', 'walk');
    label('SHIFT', 'run');
    this.jump = label('SPACE', 'jump');
    label('E', 'use');
    const button = (key: string, keyLabel: string, what: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hack-btn';
      b.textContent = what + ' · ' + keyLabel;
      b.title = what.toLowerCase() + ' (' + keyLabel + ')';
      // hand the keys back to the canvas, or Space and Enter would press the button again
      b.addEventListener('click', () => { send(key); this.refocus(); });
      this.actions.appendChild(b);
      return b;
    };
    button('Tab', 'TAB', 'MAP');
    button('/', '/', 'TERMINAL');
    this.soundBtn = button('m', 'M', 'SOUND');
    button('Escape', 'ESC', 'MENU');
    this.root.append(this.moves, this.actions);
    host.appendChild(this.root);
    this.sync(false);
  }

  /** The zone's own buttons (HACK, BOARD) sit in the same strip, first. */
  adopt(el: HTMLElement | null) { if (el && el.parentElement !== this.actions) this.actions.insertBefore(el, this.actions.querySelector('.hack-btn:not(#zone-btns *)')); }

  /** Jump only shows once you have legs.so; SOUND shows whether it's on. */
  sync(canJump: boolean) {
    this.jump.hidden = !canJump;
    const on = sound.enabled;
    if (this.soundBtn.classList.contains('on') !== on) {
      this.soundBtn.classList.toggle('on', on);
      this.soundBtn.textContent = 'SOUND ' + (on ? 'ON' : 'OFF') + ' · M';
    }
  }
}
