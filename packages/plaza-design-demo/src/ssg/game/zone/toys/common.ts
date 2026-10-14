/**
 * What every lock toy's panel shares: the frame (title, hint, play area,
 * status line, controls), the keyboard while it is open, a canvas that fits
 * its box, and the ending (solved: the guard opens; a wrong answer: a wrong
 * guess, which may lock the guard and close the panel).
 *
 * Styles live in zone/styles.ts (`.toy-*`). Colours follow ART-GUIDE.md §6:
 * pink frame (the hacking layer), cyan controls (yours to use), green open,
 * red denied, warm white for the lamp and the letters you read.
 */

import type { Line } from '../model';
import { button, el, type PanelKit } from '../panels';

export interface ToyFrame {
  /** The play area: a canvas or the toy's own DOM goes here. */
  area: HTMLDivElement;
  /** The row of buttons under it. */
  controls: HTMLDivElement;
  /** Show a line in the panel's status (and the terminal, unless `quiet`). */
  say: (l: Line, quiet?: boolean) => void;
  /** Add a control button. */
  btn: (text: string, fn: () => void, cls?: string) => HTMLButtonElement;
  /** The toy is solved: the guard opens; the panel closes a moment later. */
  solved: () => void;
  /** A wrong answer: counts as a wrong guess. Returns true when the toy may go on (not locked). */
  wrong: (answer: string) => boolean;
  /** Still open and playable. */
  live: () => boolean;
  /** Keys while the panel is open (Escape still closes it). Return true when the key was used. */
  keys: (fn: (e: KeyboardEvent, down: boolean) => boolean) => void;
}

/** Build the frame for the guard `key` (`device.noun`). Returns null (and says why) when it cannot be played now. */
export function toyFrame(kit: PanelKit, key: string, title: string, hint: string): ToyFrame | null {
  const { m, body } = kit;
  const no = m.toyBlocked(key);
  if (no) { kit.say(no); kit.close(); return null; }
  body.classList.add('toy');
  const [dev, noun] = [key.slice(0, key.indexOf('.')), key.slice(key.indexOf('.') + 1)];
  const wrap = el('div', 'toy-wrap');
  const head = el('div', 'toy-head');
  head.append(el('b', 'toy-title', title), el('span', 'toy-where', (m.devices.get(dev)?.name ?? dev) + ' · ' + noun));
  const area = el('div', 'toy-area'), controls = el('div', 'toy-controls'), status = el('div', 'toy-status', hint);
  wrap.append(head, area, status, controls);
  body.appendChild(wrap);
  let over = false;
  const say = (l: Line, quiet = false) => {
    status.textContent = l[1]; status.className = 'toy-status ' + (l[2] ?? '');
    if (!quiet) kit.say(l);
  };
  const end = (cls: string, text: string) => {
    over = true;
    wrap.classList.add(cls);
    const stamp = el('div', 'toy-stamp', text); area.appendChild(stamp);
    controls.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    window.setTimeout(() => { if (wrap.isConnected) kit.close(); }, 1300);
  };
  const keyFns: ((e: KeyboardEvent, down: boolean) => boolean)[] = [];
  // capture on window, before the game's own keys (B and H must not leave while you type a cryptex word)
  const onKey = (e: KeyboardEvent) => {
    if (!wrap.isConnected) { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); return; }
    if (e.key === 'Escape') return;
    const down = e.type === 'keydown';
    // every key down stays here; a key up only when the toy used it (the game must hear a walking key let go)
    if (down) e.stopPropagation();
    if (over) { if (down) e.preventDefault(); return; }
    if (keyFns.some((fn) => fn(e, down))) { e.preventDefault(); e.stopPropagation(); }
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  return {
    area, controls, say,
    btn: (text, fn, cls = '') => { const b = button(text, 'hack-btn toy-btn ' + cls, () => { if (!over) fn(); }); controls.appendChild(b); return b; },
    solved: () => { if (over) return; m.toySolved(key); end('ok', m.label('toy.solved')); },
    wrong: (answer) => {
      if (over) return false;
      m.toyWrong(key, answer);
      say(m.line('guard.wrong.last', { noun, guess: answer }), true);
      if (!m.toyBlocked(key)) return true;
      end('err', m.label('toy.locked'));
      return false;
    },
    live: () => !over && wrap.isConnected,
    keys: (fn) => keyFns.push(fn),
  };
}

/** A canvas that fills its box at the device's pixel ratio. `fit()` returns the CSS size, resizing the bitmap when needed. */
export function fitCanvas(parent: HTMLElement, cls = 'toy-canvas') {
  const c = el('canvas', cls), g = c.getContext('2d')!;
  parent.appendChild(c);
  const fit = () => {
    const d = window.devicePixelRatio || 1, w = Math.max(1, c.clientWidth), h = Math.max(1, c.clientHeight);
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    g.setTransform(d, 0, 0, d, 0, 0);
    return { w, h };
  };
  return { c, g, fit };
}

/** Degrees, wrapped to -180…180. */
export const wrapDeg = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** The colours the toys draw with (ART-GUIDE.md §6). */
export const INK = {
  pink: 'rgb(255, 61, 242)',
  cyan: 'rgb(0, 255, 255)',
  orange: 'rgb(255, 136, 0)',
  green: 'rgb(0, 255, 136)',
  red: 'rgb(255, 64, 96)',
  paper: 'rgb(255, 236, 210)',
  dim: 'rgba(255, 236, 210, 0.35)',
  bg: '#07020a',
};
