/**
 * The pause menu: a black CRT panel over the paused game.
 *
 * Esc opens it (game.ts decides when: overlays, bubbles and schematics close
 * first). RESUME, SAVE GAME, LOAD GAME, NEW GAME, MAP, SOUND, QUIT TO HOMEPAGE.
 * Arrows or W/S move, Enter/E/Space select, Esc goes back a screen or resumes;
 * mouse and touch pick items directly. Styles: #game-menu in render.tsx.
 *
 * Colours follow the art guide: cyan for what you can select, green for a
 * confirmation that went through, red for what throws progress away.
 */

import { sound } from './audio';
import type { Save } from './level';
import { readSlot, resumeInto, SLOT_COUNT, slotLine, writeSlot } from './slots';

export interface MenuHooks {
  /** The current save, settled and written (the menu copies it into a slot). */
  save(): Save;
  /** Where the player is, for a slot: id to load into, name to show. */
  zone(): { id: string; name: string };
  /** NEW GAME, confirmed: reset the save, play the intro, hand over to the start zone. */
  newGame(): void;
  /** The city map, when one is installed. */
  map(): (() => void) | undefined;
  /** QUIT TO HOMEPAGE. */
  quit(): void;
  /** The menu closed (resume): give the game its focus back. */
  onClose(): void;
}

type Tone = 'go' | 'ok' | 'bad' | 'dim';
interface Item { label: string; meta?: string; tone?: Tone; run: () => void }

export class Menu {
  open = false;
  private root: HTMLDivElement;
  private sub: HTMLElement;
  private list: HTMLElement;
  private msg: HTMLElement;
  private items: Item[] = [];
  private sel = 0;
  /** What Esc does on the current screen; null on the main screen (resume). */
  private back: (() => void) | null = null;

  constructor(host: HTMLElement, private hooks: MenuHooks, touch: boolean) {
    const root = (this.root = document.createElement('div'));
    root.id = 'game-menu';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'gm-title');
    root.innerHTML =
      '<div class="gm-crt"><h2 class="gm-title" id="gm-title">ACCESS DENIED</h2>' +
      '<div class="gm-sub"></div><div class="gm-list" role="menu"></div>' +
      '<p class="gm-msg" aria-live="polite"></p>' +
      '<div class="gm-keys">' + (touch ? 'TAP TO CHOOSE' : '&uarr;&darr; MOVE · ENTER SELECT · ESC BACK') + '</div></div>';
    this.sub = root.querySelector('.gm-sub')!;
    this.list = root.querySelector('.gm-list')!;
    this.msg = root.querySelector('.gm-msg')!;

    const itemOf = (e: Event) => (e.target as HTMLElement | null)?.closest<HTMLElement>('.gm-item');
    this.list.addEventListener('pointermove', (e) => {
      const b = itemOf(e);
      if (b && e.pointerType === 'mouse') this.select(Number(b.dataset.i));
    });
    this.list.addEventListener('click', (e) => {
      const b = itemOf(e);
      if (!b) return;
      this.select(Number(b.dataset.i), false);
      this.activate();
    });
    // Tapping the dimmed game around the panel resumes.
    root.addEventListener('pointerdown', (e) => { if (e.target === root) { e.preventDefault(); this.escape(); } });
    // Keys are handled on keydown (game.ts forwards them); keep the focused button from clicking again on keyup.
    root.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
    host.appendChild(root);
  }

  show() {
    if (this.open) return;
    this.open = true;
    this.root.hidden = false;
    document.documentElement.classList.add('game-menu');
    this.root.classList.remove('gm-on');
    void this.root.offsetWidth; // restart the CRT power-on
    this.root.classList.add('gm-on');
    sound.open();
    this.main(0);
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.root.hidden = true;
    document.documentElement.classList.remove('game-menu');
    this.hooks.onClose();
  }

  /** A key while the menu is open (game.ts forwards every keydown). */
  key(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (k === 'ArrowUp' || k === 'w' || k === 'W' || (k === 'Tab' && e.shiftKey)) this.move(-1);
    else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'Tab') this.move(1);
    else if (e.repeat) return;
    else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') this.activate();
    else if (k === 'Escape') this.escape();
    else if (k === 'm' || k === 'M') this.toggleSound();
  }

  // ---------- screens ----------

  private main(sel: number) {
    const tag = this.hooks.zone().name + ' · PAUSED';
    this.show_(tag, [
      { label: 'RESUME', run: () => this.hide() },
      { label: 'SAVE GAME', run: () => this.slots('save', 0) },
      { label: 'LOAD GAME', run: () => this.slots('load', 0) },
      { label: 'NEW GAME', tone: 'bad', run: () => this.confirm('START OVER? THE CURRENT RUN IS LOST. SLOTS STAY.', 'YES, NEW GAME', 'bad', () => { this.hide(); this.hooks.newGame(); }, () => this.main(3)) },
      { label: 'MAP', run: () => this.map() },
      { label: 'SOUND: ' + (sound.enabled ? 'ON' : 'OFF'), run: () => this.toggleSound() },
      { label: 'QUIT TO HOMEPAGE', run: () => { this.hide(); this.hooks.quit(); } },
    ], sel, null);
  }

  private slots(mode: 'save' | 'load', sel: number, note?: [string, Tone]) {
    const items: Item[] = [];
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const slot = readSlot(n);
      items.push({
        label: 'SLOT ' + n,
        meta: slot ? slotLine(slot) : 'EMPTY',
        tone: !slot && mode === 'load' ? 'dim' : undefined,
        run: () => {
          const back = () => this.slots(mode, n - 1);
          if (mode === 'save') {
            if (!slot) this.store(n);
            else this.confirm('OVERWRITE SLOT ' + n + '?', 'YES, OVERWRITE', 'bad', () => this.store(n), back);
          } else if (!slot) {
            sound.denied();
            this.say('SLOT ' + n + ' IS EMPTY. NOTHING TO LOAD.', 'dim');
          } else {
            this.confirm('LOAD SLOT ' + n + '? UNSAVED PROGRESS IS LOST.', 'YES, LOAD', 'ok', () => {
              this.say('LOADING SLOT ' + n + ' …', 'ok');
              this.items = [];
              this.list.textContent = '';
              this.back = () => {}; // nothing to go back to while the page reloads
              setTimeout(() => resumeInto(slot), 250);
            }, back);
          }
        },
      });
    }
    items.push({ label: 'BACK', run: () => this.main(mode === 'save' ? 1 : 2) });
    this.show_(mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', items, sel, () => this.main(mode === 'save' ? 1 : 2));
    if (note) this.say(...note);
  }

  private store(n: number) {
    const z = this.hooks.zone();
    const ok = writeSlot(n, this.hooks.save(), z.id, z.name);
    if (ok) sound.granted(); else sound.denied();
    this.slots('save', n - 1, ok ? ['SAVED TO SLOT ' + n + '.', 'ok'] : ['SAVE FAILED: THIS BROWSER BLOCKS STORAGE.', 'bad']);
  }

  /** A yes/no question above two answers; the selection starts on NO. */
  private confirm(question: string, yes: string, tone: Tone, run: () => void, back: () => void) {
    this.show_(question, [
      { label: 'NO', run: back },
      { label: yes, tone, run },
    ], 0, back);
    this.sub.className = 'gm-sub gm-ask gm-' + (tone === 'bad' ? 'bad' : 'go');
  }

  private map() {
    const open = this.hooks.map();
    if (!open) { sound.denied(); this.say('MAP NOT INSTALLED YET.', 'dim'); return; }
    this.hide();
    open();
  }

  private toggleSound() {
    sound.toggle();
    if (!this.back) this.main(this.sel);
    this.say('SOUND ' + (sound.enabled ? 'ON.' : 'OFF.'), 'ok');
  }

  // ---------- drawing and moving ----------

  private show_(sub: string, items: Item[], sel: number, back: (() => void) | null) {
    this.sub.textContent = sub;
    this.sub.className = 'gm-sub';
    this.items = items;
    this.back = back;
    this.say('', 'dim');
    this.list.textContent = '';
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gm-item' + (it.tone ? ' gm-' + it.tone : '');
      b.dataset.i = String(i);
      b.setAttribute('role', 'menuitem');
      const label = document.createElement('span');
      label.className = 'gm-label';
      label.textContent = it.label;
      b.appendChild(label);
      if (it.meta) {
        const meta = document.createElement('span');
        meta.className = 'gm-meta';
        meta.textContent = it.meta;
        b.appendChild(meta);
      }
      this.list.appendChild(b);
    });
    this.select(Math.max(0, Math.min(items.length - 1, sel)), false);
  }

  private select(i: number, click = true) {
    if (i === this.sel && this.list.children[i]?.classList.contains('sel')) return;
    this.sel = i;
    Array.from(this.list.children).forEach((b, j) => b.classList.toggle('sel', j === i));
    (this.list.children[i] as HTMLElement | undefined)?.focus({ preventScroll: true });
    if (click) sound.tick();
  }

  private move(d: number) {
    if (!this.items.length) return;
    this.select((this.sel + d + this.items.length) % this.items.length);
  }

  private activate() {
    const it = this.items[this.sel];
    if (!it) return;
    if (it.tone !== 'dim') sound.open();
    it.run();
  }

  private escape() {
    sound.close();
    if (this.back) this.back();
    else this.hide();
  }

  private say(text: string, tone: Tone) {
    this.msg.textContent = text;
    this.msg.className = 'gm-msg gm-' + tone;
  }
}
