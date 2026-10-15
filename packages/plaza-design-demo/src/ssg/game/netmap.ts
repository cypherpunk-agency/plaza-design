/**
 * The net map (NET.md, "The NET button and the net map"): full screen like the city map, the
 * networks you have found and what is on them, how they link, where you are plugged in now, and
 * your controlled nodes. N or NET in hack vision opens it (once you own scan.so); game.ts holds
 * the open map (`NetView`), fills in what it draws from (`NetState`) and acts on what it asks for
 * (`NetAct`): close, or a machine picked. Picking a reachable machine brings it onto your board
 * (the same as `connect`); one you cannot reach says what kind of place you would plug in from.
 *
 * The networks sit on a fixed grid in net.json's order, so the map does not move about between
 * places: what changes is which are lit (reached from here), which are found, and which are only
 * rumours (one step from what you know: a name and where you would need to be, nothing on them).
 *
 * Colours keep their jobs (ART-GUIDE §6): orange structure, cyan what you can use (a machine in
 * reach), green yours (a controlled node), red no access, paper for text.
 */

import type { MachineData, NetworkData } from './data/types';
import { nextTo } from './engine/net';
import { C, GREEN, O, PAPER, RED, text } from './scenes/kit';

/** A machine's place on the map, from where you stand. */
export type MachineState =
  /** a device in the scene you are in: on your board already */
  | 'here'
  /** a node of this scene connected to your board */
  | 'board'
  /** a node you reach from here: pick it to connect */
  | 'reach'
  /** on a network you reach, but its board is in another place */
  | 'far'
  /** on a network you do not reach from here */
  | 'out';

/** The open map (game.ts keeps it). */
export interface NetView {
  /** The machine picked (into `rows(st)`); -1 none. */
  index: number;
  /** Under the mouse; -1 none. */
  hover: number;
}

/** Everything the map draws from (game.ts fills it in each frame). */
export interface NetState {
  view: NetView;
  nets: readonly NetworkData[];
  /** Networks reached from here, and the ones reached straight from a port here (plugged in). */
  reached: ReadonlySet<string>;
  plugged: ReadonlySet<string>;
  /** Networks found (the save's `nets`). */
  found: ReadonlySet<string>;
  /** Where you are, and the ports you are plugged in at (device names). */
  where: string;
  ports: string[];
  controlled: readonly string[];
  /** A machine's name and its state from here. */
  name: (m: MachineData) => string;
  state: (m: MachineData, n: NetworkData) => MachineState;
  touch: boolean;
  /** The smallest touch target (44 CSS px), in view units. */
  tapMin: number;
  /** The phone's ESC, left over the map (view units): the footer keeps clear of it. */
  avoid: { x: number; y: number; w: number; h: number } | null;
  t: number;
}

/** What the map asks the game to do. */
export type NetAct = { kind: 'none' | 'close' | 'blip' } | { kind: 'pick'; machine: MachineData; net: NetworkData; state: MachineState };

/** A new map, nothing picked. */
export const openNet = (): NetView => ({ index: -1, hover: -1 });

// ---------- what is shown ----------

/** Networks on the map: found or reached (`known`), and rumours one step from them. */
function shown(st: NetState) {
  const known = new Set([...st.found, ...st.reached]);
  const rumour = nextTo(st.nets, known);
  return st.nets.map((n) => ({ n, known: known.has(n.id), rumour: rumour.has(n.id) })).filter((x) => x.known || x.rumour);
}

/** The machines you can pick, in reading order (network by network). */
function rows(st: NetState): { m: MachineData; n: NetworkData }[] {
  return shown(st).filter((x) => x.known).flatMap((x) => x.n.machines.map((m) => ({ m, n: x.n })));
}

// ---------- layout ----------

/** The map draws in its own units: the view scaled to about 300 tall, so text reads the same on a phone. */
const MAP_VIEW_H = 300;
const unit = (vh: number) => Math.max(1, vh / MAP_VIEW_H);

interface Box { x: number; y: number; w: number; h: number }
const inBox = (b: Box, px: number, py: number) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

/** The panel, and a card per network on a fixed grid (net.json's order: three across). */
function layout(vw: number, vh: number, st: NetState) {
  const panel: Box = { x: 3, y: 3, w: vw - 6, h: vh - 6 };
  const head = 26, foot = 26, cols = 3, gap = 8;
  // the cards stop above a button left over the bottom-left corner (the phone's ESC)
  const low = st.avoid && st.avoid.x < vw / 3 ? Math.max(0, panel.y + panel.h - foot - st.avoid.y + 2) : 0;
  const area: Box = { x: panel.x + 8, y: panel.y + head, w: panel.w - 16, h: panel.h - head - foot - 4 - low };
  const nrows = Math.max(1, Math.ceil(st.nets.length / cols));
  const cw = (area.w - gap * (cols - 1)) / cols, ch = (area.h - gap * (nrows - 1)) / nrows;
  const cards = new Map<string, Box>();
  st.nets.forEach((n, i) => cards.set(n.id, { x: area.x + (i % cols) * (cw + gap), y: area.y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
  // rows as tall as a finger wants, as long as the longest network fits its card (and its FROM line)
  const most = Math.max(1, ...st.nets.map((n) => n.machines.length));
  const rowH = Math.max(8, Math.min(st.tapMin * 0.7, 13, (ch - 36) / most));
  return { panel, area, cards, rowH, foot: panel.y + panel.h - foot };
}

/** Where each machine row sits in its card. */
function rowBoxes(st: NetState, L: ReturnType<typeof layout>) {
  // per network, its machines in order under the card's header
  const out: Box[] = [], per = new Map<string, number>();
  for (const { n } of rows(st)) {
    const c = L.cards.get(n.id)!, k = per.get(n.id) ?? 0;
    per.set(n.id, k + 1);
    out.push({ x: c.x + 3, y: c.y + 24 + k * L.rowH, w: c.w - 6, h: L.rowH - 1 });
  }
  return out;
}

// ---------- reading keys and taps ----------

/** A key on the open map. */
export function netKey(st: NetState, key: string): NetAct {
  const list = rows(st), m = st.view;
  if (key === 'Escape' || key === 'n' || key === 'N' || key === 'Tab') return { kind: 'close' };
  if (!list.length) return { kind: 'none' };
  const step = (d: number) => { m.index = m.index < 0 ? 0 : (m.index + d + list.length) % list.length; m.hover = -1; return { kind: 'blip' } as NetAct; };
  if (key === 'ArrowDown' || key === 'ArrowRight' || key === 's' || key === 'd') return step(1);
  if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'w' || key === 'a') return step(-1);
  if ((key === 'Enter' || key === 'e' || key === 'E' || key === ' ') && m.index >= 0) {
    const r = list[m.index];
    return { kind: 'pick', machine: r.m, net: r.n, state: st.state(r.m, r.n) };
  }
  return { kind: 'none' };
}

/** The pointer on the open map (view units). Touch: a tap picks, a second tap on the same row acts; the mouse acts at once. */
export function netPointer(st: NetState, vw: number, vh: number, px: number, py: number, press: boolean, mouse: boolean): { act: NetAct; pointer: boolean } {
  const u = unit(vh), x = px / u, y = py / u, L = layout(vw / u, vh / u, { ...st, tapMin: st.tapMin / u, avoid: sc(st.avoid, u) });
  const list = rows(st), boxes = rowBoxes({ ...st, tapMin: st.tapMin / u, avoid: sc(st.avoid, u) }, L), i = boxes.findIndex((b) => inBox(b, x, y));
  st.view.hover = mouse ? i : -1;
  if (!press) return { act: { kind: 'none' }, pointer: i >= 0 };
  if (!inBox(L.panel, x, y)) return { act: { kind: 'close' }, pointer: false };
  if (i < 0) return { act: { kind: 'none' }, pointer: false };
  if (!mouse && st.view.index !== i) { st.view.index = i; return { act: { kind: 'blip' }, pointer: true }; }
  st.view.index = i;
  const r = list[i];
  return { act: { kind: 'pick', machine: r.m, net: r.n, state: st.state(r.m, r.n) }, pointer: true };
}

// ---------- drawing ----------

const STATE_LOOK: Record<MachineState, { tag: string; col: string }> = {
  here: { tag: 'HERE', col: 'rgba(255,255,255,.9)' },
  board: { tag: 'ON BOARD', col: 'rgba(' + C + ',.75)' },
  reach: { tag: 'CONNECT', col: 'rgba(' + C + ',.95)' },
  far: { tag: 'ELSEWHERE', col: 'rgba(' + PAPER + ',.55)' },
  out: { tag: 'NO ACCESS', col: 'rgba(' + RED + ',.8)' },
};

/** The links between networks: a `net` rule, a controlled node on another network, a port on another network's machine. */
function links(nets: readonly NetworkData[]): [string, string][] {
  const out: [string, string][] = [];
  const add = (a: string | undefined, b: string) => { if (a && a !== b && !out.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push([a, b]); };
  for (const n of nets) for (const r of n.from) {
    if ('net' in r) add(r.net, n.id);
    if ('controlled' in r) add(nets.find((o) => o.machines.some((m) => m.node === r.controlled))?.id, n.id);
    if ('port' in r) { const [scene, rest] = r.port.split(':'), dev = rest.split('.')[0]; add(nets.find((o) => o.machines.some((m) => m.id === dev && m.in.includes(scene)))?.id, n.id); }
  }
  return out;
}

/** A box in view units, in the map's units. */
const sc = (b: NetState['avoid'], u: number) => (b ? { x: b.x / u, y: b.y / u, w: b.w / u, h: b.h / u } : null);

/** Draw the open net map over the game (vw × vh view units). */
export function drawNetMap(x: CanvasRenderingContext2D, vw: number, vh: number, st0: NetState) {
  const u = unit(vh);
  x.save(); x.scale(u, u);
  const st = { ...st0, tapMin: st0.tapMin / u, avoid: sc(st0.avoid, u) };
  draw(x, vw / u, vh / u, st);
  x.restore();
}

function draw(x: CanvasRenderingContext2D, vw: number, vh: number, st: NetState) {
  const L = layout(vw, vh, st), list = rows(st), boxes = rowBoxes(st, L), show = shown(st);
  const blink = Math.floor(st.t / 20) % 2 === 0;
  x.fillStyle = 'rgba(0,0,0,.82)'; x.fillRect(0, 0, vw, vh);
  x.fillStyle = '#030204'; x.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
  x.strokeStyle = 'rgba(255,61,242,.75)'; x.strokeRect(L.panel.x + 0.5, L.panel.y + 0.5, L.panel.w - 1, L.panel.h - 1);
  // a faint grid, as on the city map
  for (let gx = L.area.x; gx < L.area.x + L.area.w; gx += 12) { x.fillStyle = 'rgba(' + O + ',.04)'; x.fillRect(gx, L.area.y, 1, L.area.h); }
  for (let gy = L.area.y; gy < L.area.y + L.area.h; gy += 12) { x.fillStyle = 'rgba(' + O + ',.04)'; x.fillRect(L.area.x, gy, L.area.w, 1); }

  // the head: what this is, where you are plugged in
  text(x, 'NET MAP', L.panel.x + 8, L.panel.y + 9, 'rgba(255,61,242,.95)', 9, '600', 'left');
  text(x, 'scan.so · ' + st.where, L.panel.x + L.panel.w - 8, L.panel.y + 9, 'rgba(' + PAPER + ',.7)', 7, '', 'right');
  const plug = st.ports.length ? 'PLUGGED IN AT ' + st.ports.join(', ') : 'NOT PLUGGED IN: NO PORT HERE';
  text(x, plug + (st.controlled.length ? '  ·  YOURS: ' + st.controlled.join(' ') : ''), L.panel.x + 8, L.panel.y + 19, st.ports.length ? 'rgba(' + C + ',.85)' : 'rgba(' + PAPER + ',.55)', 7, '', 'left');

  // the links between the networks shown
  for (const [a, b] of links(st.nets)) {
    const A = L.cards.get(a), B = L.cards.get(b);
    if (!A || !B || !show.some((s) => s.n.id === a) || !show.some((s) => s.n.id === b)) continue;
    const lit = st.reached.has(a) && st.reached.has(b);
    x.strokeStyle = lit ? 'rgba(' + C + ',.6)' : 'rgba(' + O + ',.35)'; x.setLineDash(lit ? [] : [3, 3]);
    x.beginPath(); x.moveTo(A.x + A.w / 2, A.y + A.h / 2); x.lineTo(B.x + B.w / 2, B.y + B.h / 2); x.stroke();
    x.setLineDash([]);
  }

  // the cards
  let ri = 0;
  for (const { n, known } of show) {
    const c = L.cards.get(n.id)!, reached = st.reached.has(n.id), plugged = st.plugged.has(n.id);
    x.fillStyle = '#070406'; x.fillRect(c.x, c.y, c.w, c.h);
    x.strokeStyle = reached ? 'rgba(' + C + ',.8)' : known ? 'rgba(' + O + ',.6)' : 'rgba(' + O + ',.25)';
    if (!known) x.setLineDash([3, 3]);
    x.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1); x.setLineDash([]);
    text(x, known ? n.name : '??? ' + n.name, c.x + 5, c.y + 8, known ? 'rgba(' + PAPER + ',.95)' : 'rgba(' + PAPER + ',.5)', 7, '600', 'left');
    const tag = plugged ? 'PLUGGED IN' : reached ? 'IN REACH' : known ? 'NO ACCESS' : 'HEARD OF';
    text(x, tag, c.x + c.w - 5, c.y + 8, plugged ? (blink ? 'rgba(255,255,255,.95)' : 'rgba(' + C + ',.95)') : reached ? 'rgba(' + C + ',.9)' : known ? 'rgba(' + RED + ',.85)' : 'rgba(' + PAPER + ',.45)', 6, '600', 'right');
    // its note, cut to the card
    const note = fit(x, n.note, c.w - 10, 6);
    text(x, note, c.x + 5, c.y + 17, 'rgba(' + PAPER + ',.5)', 6, '', 'left');
    if (!known) {
      wrap(x, 'TO REACH IT: ' + n.need.toUpperCase(), c.w - 10, 6).forEach((l, k) => text(x, l, c.x + 5, c.y + 30 + k * 8, 'rgba(' + PAPER + ',.55)', 6, '', 'left'));
      continue;
    }
    for (const m of n.machines) {
      const b = boxes[ri], i = ri++, s = st.state(m, n), look = STATE_LOOK[s], picked = i === st.view.index || i === st.view.hover;
      if (b.y + b.h > c.y + c.h - 2) continue;
      if (picked) { x.fillStyle = 'rgba(255,61,242,.16)'; x.fillRect(b.x, b.y, b.w, b.h); x.strokeStyle = 'rgba(255,61,242,.8)'; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); }
      const mine = !!m.node && st.controlled.includes(m.node);
      const cy = b.y + b.h / 2 + 0.5;
      x.fillStyle = mine ? 'rgba(' + GREEN + ',.95)' : look.col; x.fillRect(b.x + 3, Math.round(cy) - 1, 3, 3);
      text(x, st.name(m) + (m.node && !st.name(m).includes(m.node) ? ' ' + m.node : ''), b.x + 9, cy, mine ? 'rgba(' + GREEN + ',.95)' : s === 'out' ? 'rgba(' + PAPER + ',.5)' : 'rgba(' + PAPER + ',.9)', 6, mine ? '600' : '', 'left');
      text(x, mine && s === 'here' ? 'YOURS' : look.tag, b.x + b.w - 3, cy, mine ? 'rgba(' + GREEN + ',.9)' : look.col, 6, '600', 'right');
    }
    if (!reached) text(x, fit(x, 'FROM: ' + n.need.toUpperCase(), c.w - 10, 6), c.x + 5, c.y + c.h - 6, 'rgba(' + RED + ',.7)', 6, '', 'left');
  }

  // the footer: the machine picked and what picking it does; the keys
  const fy = L.foot + 8, fx = Math.max(L.panel.x + 8, st.avoid && st.avoid.x < vw / 3 ? st.avoid.x + st.avoid.w + 4 : 0), fr = L.panel.x + L.panel.w - 8;
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(L.panel.x + 4, L.foot - 1, L.panel.w - 8, 1);
  const i = st.view.hover >= 0 ? st.view.hover : st.view.index, r = list[i];
  if (r) {
    const s = st.state(r.m, r.n);
    const say = s === 'reach' ? 'CONNECT: ONTO YOUR BOARD' : s === 'here' ? 'IT IS HERE: OPEN IT' : s === 'board' ? 'ON YOUR BOARD: OPEN IT' : s === 'far' ? 'ITS BOARD IS ELSEWHERE' : 'PLUG IN FROM: ' + r.n.need.toUpperCase();
    text(x, '> ' + st.name(r.m), fx, fy, s === 'out' ? 'rgba(' + PAPER + ',.7)' : 'rgba(' + C + ',.95)', 8, '600', 'left');
    text(x, fit(x, say, Math.max(60, fr - fx - 120), 7), fr, fy, s === 'out' ? 'rgba(' + RED + ',.9)' : 'rgba(' + C + ',.9)', 7, '600', 'right');
  } else text(x, list.length ? (st.touch ? 'TAP A MACHINE' : 'ARROWS PICK A MACHINE') : 'NOTHING FOUND YET', fx, fy, 'rgba(' + PAPER + ',.7)', 7, '', 'left');
  text(x, st.touch ? 'TAP TO PICK · TAP AGAIN: CONNECT · TAP OUTSIDE: CLOSE' : 'ARROWS PICK · E CONNECT · N / ESC CLOSE', fr, fy + 11, 'rgba(' + PAPER + ',.6)', 7, '', 'right');
}

/** A line cut to fit `w` (with an ellipsis). */
function fit(x: CanvasRenderingContext2D, s: string, w: number, size: number) {
  x.save(); x.font = size + 'px "IBM Plex Mono", monospace';
  let out = s;
  while (out.length > 4 && x.measureText(out).width > w) out = out.slice(0, -2);
  x.restore();
  return out === s ? s : out.slice(0, -1) + '…';
}

/** Words wrapped to `w`. */
function wrap(x: CanvasRenderingContext2D, s: string, w: number, size: number) {
  x.save(); x.font = size + 'px "IBM Plex Mono", monospace';
  const lines: string[] = []; let cur = '';
  for (const word of s.split(' ')) { const t = cur ? cur + ' ' + word : word; if (x.measureText(t).width > w && cur) { lines.push(cur); cur = word; } else cur = t; }
  if (cur) lines.push(cur);
  x.restore();
  return lines;
}
