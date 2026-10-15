/**
 * The cryptex (O04, J's case): letter rings, one per letter of the word. The
 * number of rings tells the length, which is fair. Turn each to its letter
 * and pull; a wrong word is a wrong guess.
 *
 * `Cryptex` is the rule (pure); `cryptexPanel` the panel. Keyboard: ← → pick
 * a ring, ↑ ↓ turn it, a letter key turns the ring to it and moves on, Enter
 * pulls. Mouse and touch: ▲ ▼ on each ring, drag a ring up or down, or the
 * wheel over it.
 */

import type { CryptexToyData } from '../../data/types';
import { el, type PanelKit } from '../panels';
import { toyFrame } from './common';

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Each ring's letters: the data's, or A–Z. */
export const cryptexRings = (d: CryptexToyData) => d.word.split('').map((_, i) => (d.rings?.[i] ?? AZ).toUpperCase());

export class Cryptex {
  readonly rings: string[];
  /** Which letter each ring shows. Starts off the word (never solved before you touch it). */
  readonly pos: number[];
  sel = 0;
  constructor(private d: CryptexToyData) {
    this.rings = cryptexRings(d);
    const w = d.word.toUpperCase();
    this.pos = this.rings.map((r, i) => (Math.max(0, r.indexOf(w[i])) + 1 + ((i * 7) % Math.max(1, r.length - 1))) % r.length);
  }
  spin(i: number, by: number) { const n = this.rings[i].length; this.pos[i] = (((this.pos[i] + by) % n) + n) % n; }
  /** Turn a ring to a letter, if it has it. */
  set(i: number, ch: string) { const j = this.rings[i].indexOf(ch.toUpperCase()); if (j < 0) return false; this.pos[i] = j; return true; }
  pick(by: number) { this.sel = Math.max(0, Math.min(this.rings.length - 1, this.sel + by)); }
  /** What the rings spell now. */
  text() { return this.rings.map((r, i) => r[this.pos[i]]).join(''); }
  get right() { return this.text() === this.d.word.toUpperCase(); }
}

export function cryptexPanel(kit: PanelKit, key: string) {
  const { m } = kit, data = m.guardOf(key)?.cryptex;
  if (!data) return;
  const f = toyFrame(kit, key, m.label('toy.cryptex.title'), m.label('toy.cryptex.hint'));
  if (!f) return;
  const toy = new Cryptex(data);
  const box = el('div', 'cx');
  f.area.appendChild(box);
  const reels = toy.rings.map((_, i) => {
    const col = el('div', 'cx-ring');
    const up = el('button', 'cx-turn', '▲'), down = el('button', 'cx-turn', '▼');
    up.type = 'button'; down.type = 'button';
    up.setAttribute('aria-label', 'ring ' + (i + 1) + ' up'); down.setAttribute('aria-label', 'ring ' + (i + 1) + ' down');
    const win = el('div', 'cx-win');
    const prev = el('span', 'cx-near'), cur = el('b', 'cx-cur'), next = el('span', 'cx-near');
    win.append(prev, cur, next);
    col.append(up, win, down);
    box.appendChild(col);
    const turn = (by: number) => { if (!f.live()) return; toy.sel = i; toy.spin(i, by); draw(); };
    up.addEventListener('click', (e) => { e.stopPropagation(); turn(-1); });
    down.addEventListener('click', (e) => { e.stopPropagation(); turn(1); });
    win.addEventListener('wheel', (e) => { e.preventDefault(); turn(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    // drag the ring: one letter per 22 px
    win.addEventListener('pointerdown', (e) => {
      e.preventDefault(); toy.sel = i; draw();
      let y0 = e.clientY;
      const mv = (ev: PointerEvent) => { while (ev.clientY - y0 > 22) { turn(-1); y0 += 22; } while (y0 - ev.clientY > 22) { turn(1); y0 -= 22; } };
      const end = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', end); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', end);
    });
    return { col, prev, cur, next };
  });
  const draw = () => {
    reels.forEach((r, i) => {
      const ring = toy.rings[i], n = ring.length, p = toy.pos[i];
      r.prev.textContent = ring[(p - 1 + n) % n]; r.cur.textContent = ring[p]; r.next.textContent = ring[(p + 1) % n];
      r.col.classList.toggle('sel', i === toy.sel);
    });
  };
  const pull = () => { if (toy.right) f.solved(); else if (f.wrong(toy.text().toLowerCase())) draw(); };
  f.btn(m.label('toy.cryptex.pull'), pull, 'primary');
  f.keys((e, down) => {
    const k = e.key;
    const ours = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Backspace'].includes(k) || /^[a-z0-9]$/i.test(k);
    if (!down || !ours) return ours;
    if (k === 'ArrowLeft' || k === 'Backspace') toy.pick(-1);
    else if (k === 'ArrowRight') toy.pick(1);
    else if (k === 'ArrowUp') toy.spin(toy.sel, -1);
    else if (k === 'ArrowDown') toy.spin(toy.sel, 1);
    else if (k === 'Enter') { if (!e.repeat) pull(); return true; }
    else if (toy.set(toy.sel, k)) toy.pick(1);
    draw();
    return true;
  });
  draw();
}
