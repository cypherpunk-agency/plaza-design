/**
 * The watchdog on the schematic: a small red dog that sits on the core of the
 * device it freezes, with the seconds until it moves on, and trots from one
 * core to the next while it walks (when both are on screen; otherwise it hops
 * off and on). On the board a badge says where it is even when that device
 * is not on the board. In hack vision it shows only where its device is on
 * screen.
 *
 * It lives in its own layer of the stage (`.wd-layer`), which the schematic's
 * redraws leave alone; positions come from the cores already drawn, so it
 * needs nothing from the schematic but its stage. Styles: scene/styles.ts.
 */

import type { SceneModel } from './model';

const NS = 'http://www.w3.org/2000/svg';
/** The dog, 11 × 7 pixels: X body, E its eye. */
const DOG = [
  '.........X.',
  '........XEX',
  'X.......XXX',
  '.XXXXXXXXX.',
  '.XXXXXXXX..',
  '.X.X...X.X.',
  '.X.X...X.X.',
];

function sprite(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 11 7'); svg.setAttribute('class', 'wd-dog'); svg.setAttribute('aria-hidden', 'true');
  DOG.forEach((row, y) => row.split('').forEach((ch, x) => {
    if (ch === '.') return;
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', String(x)); r.setAttribute('y', String(y)); r.setAttribute('width', '1'); r.setAttribute('height', '1');
    r.setAttribute('class', ch === 'E' ? 'eye' : 'fur');
    svg.appendChild(r);
  }));
  return svg;
}

type P = { x: number; y: number };

/** Draw (or move) the watchdogs on this stage. `mode`: the schematic's (the badge shows on the board only). */
export function drawWatchdogs(stage: HTMLElement, m: SceneModel, mode: 'device' | 'board' | 'vision') {
  let layer = stage.querySelector<HTMLDivElement>(':scope > .wd-layer');
  const dogs = m.dogs.any ? m.watchdogs() : [];
  if (!dogs.length) { layer?.remove(); return; }
  if (!layer) { layer = document.createElement('div'); layer.className = 'wd-layer'; stage.appendChild(layer); }
  const s = stage.getBoundingClientRect();
  /** Against the top left corner of a device's core on this stage (clear of the nouns), or null when it is not drawn. */
  const at = (dev: string): P | null => {
    const core = stage.querySelector(`.sch[data-dev="${dev}"] > .sch-core`);
    if (!core) return null;
    const r = core.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top + 2 };
  };
  const badges: string[] = [];
  for (const d of dogs) {
    let el = layer.querySelector<HTMLDivElement>(`.wd[data-dog="${d.id}"]`);
    if (!el) {
      el = document.createElement('div'); el.className = 'wd'; el.dataset.dog = d.id;
      el.append(sprite(), Object.assign(document.createElement('span'), { className: 'wd-t' }));
      layer.appendChild(el);
    }
    const sec = Math.max(1, Math.ceil(d.left / 1000));
    let p: P | null = null, flip = false;
    if (d.at) p = at(d.at);
    else {
      const a = at(d.from), b = at(d.to);
      if (a && b) { p = { x: a.x + (b.x - a.x) * d.progress, y: a.y + (b.y - a.y) * d.progress }; flip = b.x < a.x; }
    }
    el.hidden = !p;
    if (p) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; }
    el.classList.toggle('walk', !d.at); el.classList.toggle('flip', flip);
    el.querySelector('.wd-t')!.textContent = sec + ' s';
    el.title = d.name;
    const name = (id: string) => m.devices.get(id)?.name ?? m.nodeName(id);
    badges.push(d.at ? m.label('watchdog.badge.at', { name: d.name, at: name(d.at), sec }) : m.label('watchdog.badge.walk', { name: d.name, to: name(d.to), sec }));
  }
  layer.querySelectorAll<HTMLElement>('.wd').forEach((e) => { if (!dogs.some((d) => d.id === e.dataset.dog)) e.remove(); });
  let badge = layer.querySelector<HTMLDivElement>('.wd-badge');
  if (mode !== 'board') { badge?.remove(); return; }
  if (!badge) { badge = document.createElement('div'); badge.className = 'wd-badge'; layer.appendChild(badge); }
  badge.textContent = badges.join(' · ');
}
