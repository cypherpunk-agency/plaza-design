/**
 * The cipher wheel (O05, the market billboard): a Caesar shift. Two rings of
 * letters; turn the inner one and the line in the lens is read through it.
 * When the line reads right, read it out (READ IT / Enter). Reading it out at
 * the wrong shift is a wrong guess, so spinning through all 26 and guessing
 * costs what guessing costs.
 *
 * `Cipher` is the rule (pure); `cipherPanel` the panel. Keyboard: ← → turn,
 * Enter reads it out. Mouse and touch: drag the wheel round, or the buttons.
 */

import type { CipherToyData } from '../../data/types';
import type { PanelKit } from '../panels';
import { el } from '../panels';
import { fitCanvas, INK, toyFrame } from './common';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = (n: number, k: number) => ((n % k) + k) % k;

/** Shift every letter back by `by` places (non-letters stay). */
export function decipher(text: string, by: number) {
  return text.replace(/[a-z]/gi, (ch) => {
    const up = ch === ch.toUpperCase(), i = A.indexOf(ch.toUpperCase());
    const out = A[mod(i - by, 26)];
    return up ? out : out.toLowerCase();
  });
}

export class Cipher {
  /** How far the inner ring is turned, 0–25. */
  turn = 0;
  constructor(private d: CipherToyData) {}
  turnBy(n: number) { this.turn = mod(this.turn + n, 26); }
  /** The line as it reads through the wheel now. */
  read() { return decipher(this.d.text, this.turn); }
  /** Read out now: right when the turn is the shift. */
  get right() { return this.turn === mod(this.d.shift, 26); }
}

export function cipherPanel(kit: PanelKit, key: string) {
  const { m } = kit, data = m.guardOf(key)?.cipher;
  if (!data) return;
  const f = toyFrame(kit, key, m.label('toy.cipher.title'), m.label('toy.cipher.hint'));
  if (!f) return;
  const toy = new Cipher(data);
  const lens = el('div', 'toy-lens');
  f.area.appendChild(lens);
  const { c, g, fit } = fitCanvas(f.area);
  let shown = 0; // the drawn angle eases towards the turn
  const readOut = () => {
    if (toy.right) { f.say(['rotor --shift ' + toy.turn, toy.read(), 'ok'], true); f.solved(); }
    else f.wrong(m.label('toy.cipher.shift', { n: toy.turn }));
  };
  f.btn('◀', () => toy.turnBy(-1));
  f.btn(m.label('toy.cipher.read'), readOut, 'primary');
  f.btn('▶', () => toy.turnBy(1));
  f.keys((e, down) => {
    if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) return false;
    if (!down) return true;
    if (e.key === 'ArrowLeft') toy.turnBy(-1);
    else if (e.key === 'ArrowRight') toy.turnBy(1);
    else if (!e.repeat) readOut();
    return true;
  });
  // drag the wheel round: one letter per 360/26 degrees
  c.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ang = (ev: PointerEvent) => Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
    let a0 = ang(e), acc = 0;
    const mv = (ev: PointerEvent) => {
      const a = ang(ev); let d = a - a0; if (d > 180) d -= 360; if (d < -180) d += 360;
      a0 = a; acc += d;
      const step = 360 / 26;
      while (acc >= step) { toy.turnBy(1); acc -= step; }
      while (acc <= -step) { toy.turnBy(-1); acc += step; }
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });

  kit.frame(() => {
    lens.textContent = toy.read();
    lens.title = m.label('toy.cipher.shift', { n: toy.turn });
    let d = toy.turn - shown; if (d > 13) d -= 26; if (d < -13) d += 26;
    shown = mod(shown + d * 0.25, 26);
    const { w, h } = fit(), cx = w / 2, cy = h / 2 - 16, R = Math.min(w, h - 44) * 0.46;
    g.fillStyle = INK.bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const ring = (r: number, off: number, col: string, size: number) => {
      g.font = size + 'px "IBM Plex Mono", monospace';
      for (let i = 0; i < 26; i++) {
        const a = ((i + off) / 26) * Math.PI * 2 - Math.PI / 2;
        g.fillStyle = col;
        g.fillText(A[i], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
    };
    g.strokeStyle = 'rgba(255, 61, 242, 0.5)'; g.lineWidth = 1.5;
    for (const r of [R, R * 0.78, R * 0.56]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    // outer: what you read (plain), fixed; inner: the cipher letters, turned back by the shift (cipher = plain + shift)
    ring(R * 0.89, 0, INK.dim, Math.max(10, R * 0.11));
    ring(R * 0.67, -shown, INK.cyan, Math.max(10, R * 0.1));
    // the window at the top: cipher letter → plain letter
    g.strokeStyle = INK.pink; g.lineWidth = 2;
    g.strokeRect(cx - R * 0.09, cy - R * 1.0, R * 0.18, R * 0.46);
    g.fillStyle = INK.orange; g.beginPath(); g.arc(cx, cy, R * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000'; g.font = Math.max(10, R * 0.1) + 'px "IBM Plex Mono", monospace';
    g.fillText(String(toy.turn), cx, cy + 1);
  });
}
