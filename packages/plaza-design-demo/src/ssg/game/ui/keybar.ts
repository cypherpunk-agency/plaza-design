/**
 * The key bar: every key and what it does, along the top of the game window,
 * so nobody has to read a manual. Keys you press for an action are buttons
 * (they send the same key the keyboard would); keys you hold to move are
 * plain labels. The scene's own HACK and BOARD buttons join the same strip.
 *
 * Styles live in render.tsx (`#key-bar`).
 */

import { SHIFT_PROTOTYPE } from "../runtime/mode";
import { sound } from "../runtime/audio";

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
  /** What each mode shows: walking (walk, run, jump, use; MAP, TERMINAL, SOUND, MENU) or hack vision (pan, zoom, reset). */
  private walking: HTMLElement[] = [];
  private visionHints: HTMLElement[] = [];
  private vision: boolean | null = null;

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
    this.walking.push(label('← →', 'walk'), label('SHIFT', 'run'));
    this.jump = label('SPACE', 'jump');
    this.walking.push(label('E', 'use'));
    // hack vision: the view moves (render.tsx hides these on touch, where the fingers know)
    this.visionHints.push(label('DRAG', 'pan'), label('WHEEL', 'zoom'), label('0', 'reset view'), label('ESC', 'leave'));
    const button = (key: string, keyLabel: string, what: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hack-btn';
      b.textContent = keyLabel ? what + ' · ' + keyLabel : what;
      b.title = what.toLowerCase() + (keyLabel ? ' (' + keyLabel + ')' : '');
      // hand the keys back to the canvas, or Space and Enter would press the button again
      if (key) b.addEventListener('click', () => { send(key); this.refocus(); });
      this.actions.appendChild(b);
      return b;
    };
    if (!SHIFT_PROTOTYPE) this.walking.push(button('Tab', 'TAB', 'MAP'), button('Enter', 'ENTER', 'TERMINAL'));
    // sound has no key: this button and the pause menu
    this.soundBtn = button('', '', 'SOUND');
    this.soundBtn.onclick = () => { sound.toggle(); this.refocus(); };
    this.walking.push(this.soundBtn, button('Escape', 'ESC', 'MENU'));
    this.root.append(this.moves, this.actions);
    host.appendChild(this.root);
    this.sync(false, false);
  }

  /** The scene's own buttons (HACK, BOARD; in hack vision EXIT, BOARD, LOGIC, UNFOLD) sit in the same strip, first. */
  adopt(el: HTMLElement | null) { if (el && el.parentElement !== this.actions) this.actions.insertBefore(el, this.actions.querySelector('.hack-btn:not(#scene-btns *)')); }

  /** The hints follow the mode (walking or hack vision); jump only shows once you have legs.so; SOUND shows whether it's on. */
  sync(canJump: boolean, vision: boolean) {
    if (this.vision !== vision) {
      this.vision = vision;
      this.walking.forEach((e) => { e.hidden = vision; });
      this.visionHints.forEach((e) => { e.hidden = !vision; });
    }
    this.jump.hidden = !canJump || vision;
    const on = sound.enabled;
    if (this.soundBtn.classList.contains('on') !== on) {
      this.soundBtn.classList.toggle('on', on);
      this.soundBtn.textContent = 'SOUND ' + (on ? 'ON' : 'OFF');
    }
  }
}
