/**
 * The deck: a black CRT panel over the paused game, with tabs along its top
 * (docs/design/DECK-SCREEN-PLAN.md): JOBS (the goal, the latest hint, goals done here), CARRY
 * (tokens, items, keys, modules), CONTROLS (every key), SYSTEM (the former pause menu) and, on
 * touch, TERM (hands over to the terminal). It opens on the tab last open (`save.deckTab`).
 * Without `hooks.deck` (the Shift prototype) it has SYSTEM only. Also the title screen's menu
 * (`showTitle`): the same panel, see-through, over the opening's sunrise (title/), with NEW GAME,
 * CONTINUE, LOAD GAME; NEW GAME fades it out while the shot starts moving.
 *
 * Esc opens it (game.ts decides when: overlays, bubbles and schematics close
 * first). SYSTEM: RESUME, SAVE GAME, LOAD GAME, NEW GAME, SOUND, QUIT TO HOMEPAGE.
 * In sudo mode (`?sudo`) LEVELS comes second: every scene and cutscene.
 * MAP opens the city map (it also lives in the world: TAB or M on your deck, map boards).
 * Arrows or W/S move, Enter/E/Space select, Esc goes back a screen or resumes;
 * ← → or 1–9 switch tabs (on a tab's first screen, not inside save slots or a question);
 * mouse and touch pick items directly. Styles: #game-menu in render.tsx.
 *
 * Colours follow the art guide: cyan for what you can select, green for a
 * confirmation that went through, red for what throws progress away.
 */

import { sound } from "../runtime/audio";
import type { Save } from "../runtime/save";
import { readSlot, resumeInto, SLOT_COUNT, slotLine, writeSlot } from "../runtime/slots";

export interface MenuHooks {
  /** The current save, settled and written (the menu copies it into a slot). */
  save(): Save;
  /** Settled persistence copy, without changing the live save used by the menu. */
  saveSnapshot?():Save;
  /** Where the player is, for a slot: id to load into, name to show. */
  scene(): { id: string; name: string };
  /** NEW GAME, confirmed: the opening's glide, then a fresh save on the train home. */
  newGame(): void;
  /** The title's CONTINUE: straight into the save. */
  continueGame(): void;
  /** Is there a run to continue (the title's CONTINUE, and whether NEW GAME asks first)? */
  hasSave(): boolean;
  /** QUIT TO HOMEPAGE. */
  quit(): void;
  /** MAP: the city map (the touch bar has no MAP button of its own). Without it there is no MAP item. */
  map?: () => void;
  /** The menu closed (resume): give the game its focus back. */
  onClose(): void;
  /** Sudo mode only (sudo.ts): every level, and going to one. Without it there is no LEVELS item. */
  levels?: () => { id: string; name: string; note: string }[];
  enter?: (id: string) => void;
  /** What the deck's other tabs show. Without it the deck is SYSTEM only. */
  deck?: DeckData;
}

/** What the deck's JOBS, CARRY, CONTROLS and TERM tabs read from the game (game.ts). */
export interface DeckData {
  /** The current goal, the latest hint shown, and goals done in this place. */
  jobs(): { now: string | null; hint: string | null; done: string[] };
  /** What you hold: tokens, items (name, count), key chips, modules, programs. */
  carry(): { tokens: number; items: [string, number][]; keys: string[]; modules: string[]; programs: string[] };
  /** Groups of keys and what they do (only the ones that are yours now). */
  controls(): [string, [string, string][]][];
  /** TERM (touch): close the deck and open the terminal. */
  terminal?: () => void;
}

type Tone = 'go' | 'ok' | 'bad' | 'dim';
/** Milliseconds after the title menu comes up in which choosing does nothing. */
const POP_GRACE = 450;
interface Item { label: string; meta?: string; tone?: Tone; run: () => void }
type TabId = 'jobs' | 'carry' | 'controls' | 'system' | 'term';
const TAB_LABELS: Record<TabId, string> = { jobs: 'JOBS', carry: 'CARRY', controls: 'CONTROLS', system: 'SYSTEM', term: 'TERM' };

export class Menu {
  open = false;
  private root: HTMLDivElement;
  private sub: HTMLElement;
  private list: HTMLElement;
  private msg: HTMLElement;
  private heading: HTMLElement;
  private tabsEl: HTMLElement;
  private keysEl: HTMLElement;
  private page: HTMLElement;
  private touch: boolean;
  private tab: TabId = 'system';
  private items: Item[] = [];
  private sel = 0;
  /** What Esc does on the current screen; null on the main screen (resume). */
  private back: (() => void) | null = null;
  /** The title screen's menu (no RESUME, nothing to go back to), not the pause menu. */
  private title = false;
  /** When the title menu came up (`POP_GRACE`). */
  private poppedAt = 0;
  private pendingGeneration=0;
  private fadeTimer?:ReturnType<typeof setTimeout>;
  private loadTimer?:ReturnType<typeof setTimeout>;
  private cancelPending(){this.pendingGeneration++;clearTimeout(this.fadeTimer);clearTimeout(this.loadTimer);this.fadeTimer=this.loadTimer=undefined;this.root.classList.remove('gm-fade');}
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

  constructor(host: HTMLElement, private hooks: MenuHooks, touch: boolean) {
    const root = (this.root = document.createElement('div'));
    root.id = 'game-menu';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'gm-title');
    root.innerHTML =
      '<div class="gm-crt"><h2 class="gm-title" id="gm-title">ACCESS DENIED</h2>' +
      '<div class="gm-tabs" role="tablist"></div><div class="gm-sub"></div><div class="gm-list" role="menu"></div><div class="gm-page" hidden></div>' +
      '<p class="gm-msg" aria-live="polite"></p>' +
      '<div class="gm-keys"></div></div>';
    this.sub = root.querySelector('.gm-sub')!;
    this.list = root.querySelector('.gm-list')!;
    this.msg = root.querySelector('.gm-msg')!;
    this.heading = root.querySelector('.gm-title')!;
    this.tabsEl = root.querySelector('.gm-tabs')!;
    this.tabsEl.hidden = true;
    this.keysEl = root.querySelector('.gm-keys')!;
    this.page = root.querySelector('.gm-page')!;
    this.touch = touch;
    this.tabsEl.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('.gm-tab');
      if (t) this.openTab(t.dataset.tab as TabId);
    });

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
    this.cancelPending();
    this.title = false;
    this.root.classList.remove('gm-title-screen', 'gm-fade', 'gm-pop');
    this.open = true;
    this.root.hidden = false;
    document.documentElement.classList.add('game-menu');
    this.root.classList.remove('gm-on');
    void this.root.offsetWidth; // restart the CRT power-on
    this.root.classList.add('gm-on');
    sound.open();
    this.heading.textContent = 'DECK';
    this.keysEl.textContent = this.touch ? 'TAP TO CHOOSE' : '← → TABS · ↑↓ MOVE · ENTER SELECT · ESC BACK';
    const last = this.hooks.save().deckTab as TabId | undefined, tabs = this.tabs();
    this.openTab(last && tabs.includes(last) && last !== 'term' ? last : tabs[0], false);
  }

  /** The title screen: the menu over the opening's sunrise. `pop`: it pops in (the sun has just settled). */
  showTitle(pop = false) {
    if (this.open) this.hide();
    this.title = true;
    this.root.classList.remove('gm-fade', 'gm-pop');
    this.root.classList.add('gm-title-screen');
    this.poppedAt = performance.now();
    if (pop) { void this.root.offsetWidth; this.root.classList.add('gm-pop'); }
    this.open = true;
    this.root.hidden = false;
    document.documentElement.classList.add('game-menu');
    this.heading.textContent = 'ACCESS DENIED';
    this.keysEl.textContent = this.touch ? 'TAP TO CHOOSE' : '↑↓ MOVE · ENTER SELECT · ESC BACK';
    this.tabsEl.hidden = true;
    this.page.hidden = true;
    this.main(0);
  }

  /** NEW GAME on the title: `then` runs at once (the shot starts moving) while the menu fades away. */
  private fadeOut(then: () => void) {
    this.cancelPending();const generation=this.pendingGeneration;
    this.items = [];
    this.back = () => {};
    this.root.classList.add('gm-fade');
    then();
    if(generation===this.pendingGeneration)this.fadeTimer=setTimeout(()=>{if(generation===this.pendingGeneration)this.hide();},this.reduced?0:900);
  }

  hide() {
    this.cancelPending();
    if (!this.open) return;
    this.open = false;
    this.title = false;
    this.root.classList.remove('gm-title-screen', 'gm-pop');
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
    else if (!this.title && !this.back && (k === 'ArrowLeft' || k === 'ArrowRight')) this.stepTab(k === 'ArrowLeft' ? -1 : 1);
    else if (!this.title && !this.back && /^[1-9]$/.test(k) && this.tabs()[+k - 1]) this.openTab(this.tabs()[+k - 1]);
    else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') this.activate();
    else if (k === 'Escape') this.escape();
  }

  // ---------- tabs ----------

  /** The deck's tabs, in order: SYSTEM only without `hooks.deck`; TERM only on touch. */
  private tabs(): TabId[] {
    const d = this.hooks.deck;
    if (!d) return ['system'];
    return ['jobs', 'carry', 'controls', 'system', ...(this.touch && d.terminal ? ['term' as const] : [])];
  }

  /** Show a tab of the deck on its first screen, and remember it for the next Esc. */
  private openTab(id: TabId, click = true) {
    if (id === 'term') { this.hide(); this.hooks.deck?.terminal?.(); return; }
    if (click && id !== this.tab) sound.tick();
    this.tab = id;
    this.hooks.save().deckTab = id;
    this.tabsEl.hidden = false;
    this.tabsEl.textContent = '';
    this.tabs().forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gm-tab' + (t === id ? ' on' : '');
      b.dataset.tab = t;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(t === id));
      b.textContent = (this.touch ? '' : i + 1 + ' ') + TAB_LABELS[t];
      this.tabsEl.appendChild(b);
    });
    if (id === 'system') { this.main(0); return; }
    // an information tab: nothing to select, Esc resumes
    this.show_(this.hooks.scene().name + ' · PAUSED', [], 0, null);
    this.page.hidden = false;
    this.page.textContent = '';
    if (id === 'jobs') this.jobsPage();
    else if (id === 'carry') this.carryPage();
    else this.controlsPage();
  }

  private stepTab(d: number) {
    const tabs: TabId[] = this.tabs().filter((t) => t !== 'term'), i = tabs.indexOf(this.tab);
    this.openTab(tabs[(i + d + tabs.length) % tabs.length]);
  }

  /** A heading and its lines on an information tab; `cls` colours the lines (gm-goal, gm-done, gm-chip ...). */
  private block(head: string, lines: (string | [string, string])[], cls = '') {
    const h = document.createElement('h3');
    h.className = 'gm-head';
    h.textContent = head;
    this.page.appendChild(h);
    for (const l of lines) {
      const row = document.createElement('div');
      row.className = 'gm-row' + (cls ? ' ' + cls : '');
      if (typeof l === 'string') row.textContent = l;
      else {
        const a = document.createElement('span'), b = document.createElement('span');
        a.textContent = l[0];
        b.textContent = l[1];
        b.className = 'gm-row-meta';
        row.append(a, b);
      }
      this.page.appendChild(row);
    }
  }

  private jobsPage() {
    const j = this.hooks.deck!.jobs();
    this.block('NOW', [j.now ? 'GOAL · ' + j.now : 'NO GOAL HERE.'], j.now ? 'gm-goal' : 'gm-done');
    if (j.hint) this.block('LATEST HINT', [j.hint], 'gm-hint');
    if (j.done.length) this.block('DONE HERE', j.done, 'gm-done');
  }

  private carryPage() {
    const c = this.hooks.deck!.carry();
    this.block('TOKENS', [String(c.tokens)], 'gm-tokens');
    this.block('ITEMS', c.items.length ? c.items.map(([n, k]): [string, string] => [n, '× ' + k]) : ['NOTHING.'], c.items.length ? '' : 'gm-done');
    if (c.keys.length) this.block('KEYRING', c.keys, 'gm-chip');
    if (c.modules.length || c.programs.length) this.block('MODULES · PROGRAMS', [[...c.modules, ...c.programs].join(' · ')], 'gm-chip');
  }

  private controlsPage() {
    for (const [group, keys] of this.hooks.deck!.controls()) this.block(group, keys, 'gm-key');
  }

  // ---------- screens ----------

  private main(sel: number) {
    const sudo = !!this.hooks.levels;
    const tag = this.title ? "A CITY THAT DECIDED YOU AREN'T THERE" + (sudo ? ' · SUDO' : '') : this.hooks.scene().name + ' · PAUSED' + (sudo ? ' · SUDO' : '');
    this.show_(tag, this.mainItems(), sel, null);
  }

  /** The main screen's items: the title's, or the pause menu's. LEVELS only in sudo. */
  private mainItems(): Item[] {
    const levels: Item[] = this.hooks.levels ? [{ label: 'LEVELS', tone: 'go', run: () => this.levels(0) }] : [];
    const sound_: Item = { label: 'SOUND: ' + (sound.enabled ? 'ON' : 'OFF'), run: () => this.toggleSound() };
    const quit: Item = { label: 'QUIT TO HOMEPAGE', run: () => { this.hide(); this.hooks.quit(); } };
    if (this.title) {
      const saved = this.hooks.hasSave(), start = () => this.fadeOut(() => this.hooks.newGame());
      return [
        { label: 'NEW GAME', tone: 'go', run: () => (saved ? this.confirm('START OVER? THE SAVED RUN IS LOST. SLOTS STAY.', 'YES, NEW GAME', 'bad', start, this.backTo('NEW GAME')) : start()) },
        saved
          ? { label: 'CONTINUE', run: () => { this.hide(); this.hooks.continueGame(); } }
          : { label: 'CONTINUE', meta: 'NO SAVED RUN YET', tone: 'dim', run: () => { sound.denied(); this.say('NOTHING TO CONTINUE YET.', 'dim'); } },
        ...levels,
        { label: 'LOAD GAME', run: () => this.slots('load', 0) },
        sound_, quit,
      ];
    }
    return [
      { label: 'RESUME', run: () => this.hide() },
      ...(this.hooks.map ? [{ label: 'MAP', run: () => { this.hide(); this.hooks.map!(); } }] : []),
      ...levels,
      { label: 'SAVE GAME', run: () => this.slots('save', 0) },
      { label: 'LOAD GAME', run: () => this.slots('load', 0) },
      { label: 'NEW GAME', tone: 'bad', run: () => this.confirm('START OVER? THE CURRENT RUN IS LOST. SLOTS STAY.', 'YES, NEW GAME', 'bad', () => { this.hide(); this.hooks.newGame(); }, this.backTo('NEW GAME')) },
      sound_, quit,
    ];
  }

  /** Back to the main screen, on the item with this label. */
  private backTo(label: string) {
    return () => this.main(Math.max(0, this.mainItems().findIndex((i) => i.label === label)));
  }

  /** Sudo: every level; picking one goes straight there. */
  private levels(sel: number) {
    const here = this.hooks.scene().id;
    const items: Item[] = this.hooks.levels!().map((l) => ({
      label: l.name,
      meta: l.id === here ? 'HERE' : l.note,
      run: () => { this.hide(); this.hooks.enter?.(l.id); },
    }));
    items.push({ label: 'BACK', run: this.backTo('LEVELS') });
    this.show_('LEVELS · SUDO', items, sel, this.backTo('LEVELS'));
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
              const generation=this.pendingGeneration;this.loadTimer=setTimeout(()=>{if(generation!==this.pendingGeneration||!this.open)return;this.loadTimer=undefined;resumeInto(slot);},250);
            }, back);
          }
        },
      });
    }
    const back = this.backTo(mode === 'save' ? 'SAVE GAME' : 'LOAD GAME');
    items.push({ label: 'BACK', run: back });
    this.show_(mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', items, sel, back);
    if (note) this.say(...note);
  }

  private store(n: number) {
    const z = this.hooks.scene();
    const ok = writeSlot(n, this.hooks.saveSnapshot?.()??this.hooks.save(), z.id, z.name);
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

  private toggleSound() {
    sound.toggle();
    if (!this.back) this.main(this.sel);
    this.say('SOUND ' + (sound.enabled ? 'ON.' : 'OFF.'), 'ok');
  }

  // ---------- drawing and moving ----------

  private show_(sub: string, items: Item[], sel: number, back: (() => void) | null) {
    this.sub.textContent = sub;
    this.sub.className = 'gm-sub';
    this.page.hidden = true;
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
    // the title menu has just popped in: the key or tap that was already on its way (the one that
    // skipped the sunrise, or still held) must not pick NEW GAME
    if (this.title && performance.now() - this.poppedAt < POP_GRACE) return;
    if (it.tone !== 'dim') sound.open();
    it.run();
  }

  private escape() {
    // the title screen has nothing under it to go back to
    if (!this.back && this.title) return;
    sound.close();
    if (this.back) this.back();
    else this.hide();
  }

  private say(text: string, tone: Tone) {
    this.msg.textContent = text;
    this.msg.className = 'gm-msg gm-' + tone;
  }
}
