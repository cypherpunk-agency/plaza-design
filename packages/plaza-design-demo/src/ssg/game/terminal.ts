/**
 * The in-game terminal. Its prompt is the window footer's input area; its output
 * is a panel that rises above the footer while you type or are jacked into a
 * machine. Styles live in render.tsx (`#term`, `#term-input`).
 */

export type LineKind = 'in' | 'out' | 'ok' | 'err' | 'dim' | 'head';

export class Terminal {
  readonly panel: HTMLDivElement;
  readonly out: HTMLDivElement;
  readonly input: HTMLInputElement;
  private history: string[] = [];
  private hIndex = 0;
  private submit: (line: string) => void = () => {};
  private complete: (prefix: string) => string[] = () => [];
  onClose: () => void = () => {};

  constructor(host: HTMLElement, inputHost: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.id = 'term';
    this.panel.setAttribute('role', 'log');
    this.panel.setAttribute('aria-live', 'polite');
    this.panel.hidden = true;
    this.out = document.createElement('div');
    this.out.className = 'term-out';
    this.panel.appendChild(this.out);
    host.appendChild(this.panel);

    this.input = document.createElement('input');
    this.input.id = 'term-input';
    this.input.type = 'text';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('aria-label', 'Terminal');
    this.input.placeholder = 'press / to type';
    inputHost.appendChild(this.input);

    this.input.addEventListener('focus', () => this.open());
    this.input.addEventListener('keydown', (e) => this.key(e));
  }

  onSubmit(fn: (line: string) => void) { this.submit = fn; }
  onComplete(fn: (prefix: string) => string[]) { this.complete = fn; }

  get isOpen() { return !this.panel.hidden; }
  get focused() { return document.activeElement === this.input; }

  open() {
    if (!this.panel.hidden) return;
    this.panel.hidden = false;
    this.scroll();
  }
  close() {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.input.blur();
    this.onClose();
  }
  focus() { this.open(); this.input.focus(); }

  print(text: string, kind: LineKind = 'out') {
    for (const line of text.split('\n')) {
      const div = document.createElement('div');
      div.className = 'term-line term-' + kind;
      div.textContent = line;
      this.out.appendChild(div);
    }
    while (this.out.childElementCount > 200) this.out.firstElementChild?.remove();
    this.scroll();
  }
  clear() { this.out.textContent = ''; }

  private scroll() { this.panel.scrollTop = this.panel.scrollHeight; }

  private key(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const line = this.input.value.trim();
      this.input.value = '';
      if (line) { this.history.push(line); this.hIndex = this.history.length; }
      this.print('> ' + line, 'in');
      if (line) this.submit(line);
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
      const value = this.input.value;
      const options = this.complete(value);
      if (options.length === 1) this.input.value = options[0] + ' ';
      else if (options.length > 1) this.print(options.join('   '), 'dim');
    }
  }
}
