/**
 * The Morse lamp (O03, the window that blinks): a lamp blinks a message over
 * and over; tap it back. A short tap is a dot, a long one a dash; a pause
 * ends the letter. Send it: right opens the guard, wrong is a wrong guess.
 *
 * `Morse` is the rule (pure: the code table, the lamp's timing, what you
 * tapped); `morsePanel` the panel. Keyboard: hold Space to tap (short or
 * long), `.` and `-` type a dot or a dash, `/` or → ends a letter, Backspace
 * takes one back, Enter sends. Mouse and touch: hold TAP, or the buttons.
 */

import type { MorseToyData } from '../../data/types';
import { el, type PanelKit } from '../panels';
import { fitCanvas, INK, toyFrame } from './common';

export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
};
const BACK: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const UNIT_MS = 220;
/** Letters only, upper case: what the lamp spells and what is compared. */
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** "GHOST" → "--. .... --- ... -" */
export const encode = (s: string) => clean(s).split('').map((c) => MORSE[c]).join(' ');

/** The lamp's loop: [on?, units] pieces. Dot 1, dash 3, 1 between marks, 3 between letters, 10 before it starts again. */
export function blinks(message: string): [boolean, number][] {
  const out: [boolean, number][] = [];
  clean(message).split('').forEach((c, i) => {
    if (i) out.push([false, 3]);
    MORSE[c].split('').forEach((s, j) => { if (j) out.push([false, 1]); out.push([true, s === '-' ? 3 : 1]); });
  });
  out.push([false, 10]);
  return out;
}

export class Morse {
  /** Letters tapped so far, as codes ('.-'), and the one being tapped. */
  letters: string[] = [];
  cur = '';
  private loop: [boolean, number][];
  readonly unit: number;
  constructor(private d: MorseToyData) { this.loop = blinks(d.message); this.unit = d.unitMs ?? UNIT_MS; }

  /** Is the lamp lit `t` ms into its loop? */
  lit(t: number) {
    const total = this.loop.reduce((s, [, u]) => s + u, 0) * this.unit;
    let x = ((t % total) + total) % total;
    for (const [on, u] of this.loop) { if (x < u * this.unit) return on; x -= u * this.unit; }
    return false;
  }
  /** A press this long: a dot or a dash (the line between is two units). */
  mark(ms: number): '.' | '-' { return ms < this.unit * 2 ? '.' : '-'; }
  tap(s: '.' | '-') { if (this.cur.length < 6) this.cur += s; }
  /** End the letter being tapped. */
  next() { if (this.cur) { this.letters.push(this.cur); this.cur = ''; } }
  back() { if (this.cur) this.cur = this.cur.slice(0, -1); else this.letters.pop(); }
  /** What you tapped, read back (`?` for a code that is no letter). */
  text() { return [...this.letters, ...(this.cur ? [this.cur] : [])].map((c) => BACK[c] ?? '?').join(''); }
  codes() { return [...this.letters, ...(this.cur ? [this.cur] : [])].join(' '); }
  get right() { return this.text() === clean(this.d.message); }
}

export function morsePanel(kit: PanelKit, key: string) {
  const { m } = kit, data = m.guardOf(key)?.morse;
  if (!data) return;
  const f = toyFrame(kit, key, m.label('toy.morse.title'), m.label('toy.morse.hint'));
  if (!f) return;
  const toy = new Morse(data);
  const { c, g, fit } = fitCanvas(f.area);
  const tape = el('div', 'toy-lens morse');
  f.area.appendChild(tape);
  // a pause of a few units ends the letter by itself
  let pause = 0;
  kit.cleanup(()=>clearTimeout(pause));
  const later = () => { clearTimeout(pause); pause = window.setTimeout(() => { if(f.live()){toy.next();draw();} }, Math.max(900, toy.unit * 5)); };
  const draw = () => { tape.textContent = toy.codes() ? toy.text() + '   ' + toy.codes() : '_'; };
  let downAt = 0;
  const press = () => { if (!downAt && f.live()) { downAt = performance.now(); clearTimeout(pause); tapBtn.classList.add('down'); } };
  const release = () => {
    if(!f.live()){downAt=0;tapBtn.classList.remove('down');return;}
    if (!downAt) return;
    toy.tap(toy.mark(performance.now() - downAt)); downAt = 0; tapBtn.classList.remove('down');
    draw(); later();
  };
  const tapBtn = f.btn(m.label('toy.morse.tap'), () => {}, 'tap');
  tapBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); tapBtn.setPointerCapture(e.pointerId); press(); });
  tapBtn.addEventListener('pointerup', release);
  tapBtn.addEventListener('pointercancel', release);
  // the lamp itself is a key too: hold it
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); press(); });
  c.addEventListener('pointerup', release);
  c.addEventListener('pointercancel', release);
  f.btn('·', () => { toy.tap('.'); draw(); later(); });
  f.btn('–', () => { toy.tap('-'); draw(); later(); });
  f.btn(m.label('toy.morse.next'), () => { clearTimeout(pause); toy.next(); draw(); });
  f.btn(m.label('toy.morse.back'), () => { clearTimeout(pause); toy.back(); draw(); });
  const send = () => {
    clearTimeout(pause); toy.next(); draw();
    if (toy.right) f.solved();
    else if (f.wrong(toy.text().toLowerCase() || '…')) { toy.letters = []; toy.cur = ''; draw(); }
  };
  f.btn(m.label('toy.morse.send'), send, 'primary');
  f.keys((e, down) => {
    const k = e.key;
    if (k === ' ') { if (down) { if (!e.repeat) press(); } else release(); return true; }
    if (!['.', '-', '/', 'ArrowRight', 'Backspace', 'Enter'].includes(k)) return false;
    if (!down || e.repeat) return true;
    if (k === '.' || k === '-') { toy.tap(k); later(); }
    else if (k === '/' || k === 'ArrowRight') { clearTimeout(pause); toy.next(); }
    else if (k === 'Backspace') { clearTimeout(pause); toy.back(); }
    else send();
    draw();
    return true;
  });
  draw();

  let t0 = 0;
  kit.frame((t) => {
    if (!t0) t0 = t;
    const { w, h } = fit(), cx = w / 2, cy = h * 0.42, r = Math.min(w, h) * 0.16, on = toy.lit(t - t0);
    g.fillStyle = INK.bg; g.fillRect(0, 0, w, h);
    // the window it hangs in, then the lamp: warm when lit, its glow on the frame
    g.strokeStyle = 'rgba(255, 136, 0, 0.6)'; g.lineWidth = 2;
    g.strokeRect(cx - r * 2, cy - r * 1.8, r * 4, r * 3.6);
    g.beginPath(); g.moveTo(cx, cy - r * 1.8); g.lineTo(cx, cy - r * 1.05); g.stroke();
    if (on) { g.shadowColor = INK.paper; g.shadowBlur = r * 1.4; }
    g.fillStyle = on ? INK.paper : '#2a2116';
    g.beginPath(); g.arc(cx, cy, r * 0.75, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    if (downAt) { g.fillStyle = INK.cyan; g.beginPath(); g.arc(cx, cy + r * 2.2, 5, 0, Math.PI * 2); g.fill(); }
  });
}
