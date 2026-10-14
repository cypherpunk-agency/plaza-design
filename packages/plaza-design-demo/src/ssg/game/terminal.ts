/**
 * The in-game terminal.
 *
 * Desktop: the prompt is the window footer's input; output rises in a panel
 * above it while you type or are jacked into a machine.
 *
 * Touch screens: the terminal is a handheld deck that covers the game. The
 * phone's own keyboard never opens (it resized the page and broke the view).
 * Instead you build a command by tapping suggested words, and an in-game
 * keyboard (ABC) types anything else: handles, passwords, hidden commands.
 *
 * Styles live in render.tsx (`#term`, `#term-input`, `.deck-*`).
 */

export type LineKind = 'in' | 'out' | 'ok' | 'err' | 'dim' | 'head';

const KEY_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm-_.'];

export class Terminal {
  readonly panel: HTMLDivElement;
  readonly out: HTMLDivElement;
  readonly input: HTMLInputElement;
  private history: string[] = [];
  private hIndex = 0;
  private submit: (line: string) => void = () => {};
  private complete: (prefix: string) => string[] = () => [];
  private suggestFn: (line: string) => string[] = () => [];
  private runAlone: string[] = [];
  private touch: boolean;
  private line = '';
  private lineEl?: HTMLDivElement;
  private chipsEl?: HTMLDivElement;
  private keysEl?: HTMLDivElement;
  private shift = false;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, inputHost: HTMLElement, touch = false) {
    this.touch = touch;
    this.panel = document.createElement('div');
    this.panel.id = 'term';
    this.panel.hidden = true;
    if (touch) this.panel.classList.add('deck');
    this.out = document.createElement('div');
    this.out.className = 'term-out';
    this.out.setAttribute('role', 'log');
    this.out.setAttribute('aria-live', 'polite');
    this.panel.appendChild(this.out);
    host.appendChild(this.panel);

    this.input = document.createElement('input');
    this.input.id = 'term-input';
    this.input.type = 'text';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', 'Terminal');
    this.input.placeholder = touch ? 'tap >_ to open the deck' : 'press / to type';
    inputHost.appendChild(this.input);

    if (touch) {
      // Never let the phone keyboard open: the deck types for you.
      this.input.readOnly = true;
      this.input.inputMode = 'none';
      this.input.addEventListener('pointerdown', (e) => { e.preventDefault(); this.focus(); });
      this.buildDeck();
    } else {
      this.input.addEventListener('focus', () => this.open());
      this.input.addEventListener('keydown', (e) => this.key(e));
    }
  }

  onSubmit(fn: (line: string) => void) { this.submit = fn; }
  onComplete(fn: (prefix: string) => string[]) { this.complete = fn; }
  /** Touch deck: what to offer next, and which commands run on a single tap. */
  onSuggest(fn: (line: string) => string[], runAlone: string[]) { this.suggestFn = fn; this.runAlone = runAlone; }

  get isOpen() { return !this.panel.hidden; }
  /** True while the terminal should own the keys (the game then stands still). */
  get focused() { return this.touch ? this.isOpen : document.activeElement === this.input; }

  open() {
    if (!this.panel.hidden) return;
    this.panel.hidden = false;
    if (this.touch) this.refresh();
    this.scroll();
  }
  close() {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.input.blur();
    this.showKeys(false);
    this.onClose();
  }
  focus() { this.open(); if (!this.touch) this.input.focus(); }
  /** Open with `text` already typed, the cursor after it (someone asked you something). */
  prefill(text: string) {
    if (this.touch) { this.line = text; this.focus(); this.refresh(); return; }
    this.input.value = text;
    this.focus();
    this.input.setSelectionRange(text.length, text.length);
  }

  print(text: string, kind: LineKind = 'out') {
    for (const line of text.split('\n')) {
      const div = document.createElement('div');
      div.className = 'term-line term-' + kind;
      div.textContent = line;
      this.out.appendChild(div);
    }
    while (this.out.childElementCount > 200) this.out.firstElementChild?.remove();
    if (this.touch) this.refresh();
    this.scroll();
  }
  clear() { this.out.textContent = ''; }

  private scroll() {
    this.out.scrollTop = this.out.scrollHeight;
    this.panel.scrollTop = this.panel.scrollHeight;
  }

  private run(line: string) {
    line = line.trim();
    if (line) { this.history.push(line); this.hIndex = this.history.length; }
    this.print('> ' + line, 'in');
    if (line) this.submit(line);
  }

  // ---------- desktop: the footer input ----------

  private key(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const line = this.input.value;
      this.input.value = '';
      this.run(line);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      this.close();
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && this.history.length) {
      this.hIndex = Math.max(0, this.hIndex - 1);
      this.input.value = this.history[this.hIndex] ?? '';
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && this.history.length) {
      this.hIndex = Math.min(this.history.length, this.hIndex + 1);
      this.input.value = this.history[this.hIndex] ?? '';
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const options = this.complete(this.input.value);
      if (options.length === 1) this.input.value = options[0] + ' ';
      else if (options.length > 1) this.print(options.join('   '), 'dim');
    }
  }

  // ---------- touch: the handheld deck ----------

  private button(label: string, cls: string, onTap: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onTap(); });
    return b;
  }

  private buildDeck() {
    this.lineEl = document.createElement('div');
    this.lineEl.className = 'deck-line';
    this.chipsEl = document.createElement('div');
    this.chipsEl.className = 'deck-chips';
    this.keysEl = document.createElement('div');
    this.keysEl.className = 'deck-keys';
    this.keysEl.hidden = true;
    for (const row of KEY_ROWS) {
      const r = document.createElement('div');
      r.className = 'deck-row';
      for (const ch of row) r.appendChild(this.button(ch, 'deck-key', () => this.type(this.shift ? ch.toUpperCase() : ch)));
      this.keysEl.appendChild(r);
    }
    const last = document.createElement('div');
    last.className = 'deck-row';
    last.appendChild(this.button('SHIFT', 'deck-key deck-wide deck-shift', () => { this.shift = !this.shift; this.refreshShift(); }));
    last.appendChild(this.button('SPACE', 'deck-key deck-space', () => this.type(' ')));
    last.appendChild(this.button('⌫', 'deck-key deck-wide', () => this.back()));
    last.appendChild(this.button('RUN', 'deck-key deck-wide deck-run', () => this.runLine()));
    this.keysEl.appendChild(last);
    this.panel.append(this.lineEl, this.chipsEl, this.keysEl);
  }

  private type(text: string) { this.line += text; this.refresh(); }
  private back() { this.line = this.line.slice(0, -1); this.refresh(); }
  private runLine() { const line = this.line; this.line = ''; this.run(line); this.refresh(); }
  private showKeys(on: boolean) {
    if (!this.keysEl) return;
    this.keysEl.hidden = !on;
    this.panel.classList.toggle('deck-typing', on);
    requestAnimationFrame(() => this.scroll());
  }
  private refreshShift() {
    this.keysEl?.querySelectorAll<HTMLButtonElement>('.deck-row:not(:last-child) .deck-key').forEach((b) => {
      b.textContent = this.shift ? (b.textContent ?? '').toUpperCase() : (b.textContent ?? '').toLowerCase();
    });
    this.keysEl?.querySelector('.deck-shift')?.classList.toggle('on', this.shift);
  }

  private pick(word: string) {
    if (!this.line.trim() && this.runAlone.includes(word)) { this.run(word); this.refresh(); return; }
    if (this.line && !/\s$/.test(this.line)) this.line = this.line.replace(/\S+$/, '');
    this.line += word + ' ';
    this.refresh();
  }

  private refresh() {
    if (!this.lineEl || !this.chipsEl) return;
    this.lineEl.textContent = '> ' + this.line;
    this.input.value = this.line;
    this.chipsEl.textContent = '';
    const words = document.createElement('div');
    words.className = 'deck-suggest';
    for (const word of this.suggestFn(this.line)) words.appendChild(this.button(word, 'deck-chip', () => this.pick(word)));
    this.chipsEl.appendChild(words);
    const tools = document.createElement('div');
    tools.className = 'deck-tools';
    if (this.line) tools.appendChild(this.button('RUN', 'deck-chip deck-run', () => this.runLine()));
    if (this.line) tools.appendChild(this.button('CLR', 'deck-chip', () => { this.line = ''; this.refresh(); }));
    tools.appendChild(this.button(this.keysEl?.hidden ? 'ABC' : 'HIDE ABC', 'deck-chip', () => { this.showKeys(!!this.keysEl?.hidden); this.refresh(); }));
    tools.appendChild(this.button('CLOSE', 'deck-chip deck-close', () => this.close()));
    this.chipsEl.appendChild(tools);
  }
}
