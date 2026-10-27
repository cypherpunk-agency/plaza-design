/**
 * INTERIOR KIT, Downtown civic: the city's official face (Tommi, 2026-10-22: Act I walks through Downtown).
 * Three places and the night the city comes looking:
 * - the Registry service point, a job-centre of an office on a Downtown street: its front
 *   (`civic.registry-front`), the rooms cut open (`civic.room`), the ticket machine, the number display,
 *   linked plastic chairs, glass counters with one clerk, privacy booths, the "Please hold" screen,
 *   posters, belt barriers (`civic.ticket-machine`, `civic.number-display`, `civic.chairs`, `civic.counters`,
 *   `civic.booths`, `civic.hold-screen`, `civic.poster`, `civic.queue-rail`);
 * - its back office after hours: staff doors, the terminal bank, the records stacks, the local verification
 *   node and its red watchdog, the alarm (`civic.staff-door`, `civic.terminal-bank`, `civic.records`,
 *   `civic.node`, `civic.alarm`);
 * - the substation that feeds the block: transformers, the busbar gantry, the control hut and its panels,
 *   cable trays, a maintenance catwalk (`civic.transformer`, `civic.busbar`, `civic.control-hut`,
 *   `civic.control-panels`, `civic.cable-tray`, `civic.catwalk`);
 * - the sweep: Registry vans, floodlight towers, an ID checkpoint (`civic.registry-van`, `civic.floodlight`,
 *   `civic.checkpoint`);
 * - the police precinct, where the Registry keeps a desk: the blue lamp over the door, holding cells, the wanted and
 *   unregistered board, the Registry liaison desk (`civic.police-lamp`, `civic.holding-cell`, `civic.wanted-board`,
 *   `civic.liaison-desk`). The police are tired municipal green and dark olive, never Registry grey-white.
 *
 * The Registry is grey-white: laminate, fluorescent tubes, polite notices, cameras, one red watchdog.
 * Plaza Holdings runs it under contract and signs in gold on black. Every notice is deadpan (ART-GUIDE §10).
 * Rooms and furniture take `hours` (open, closed, alarm): after hours the tubes go out, the exit signs and
 * standby lights stay, and the alarm washes everything red.
 *
 * Drawn in the piece's own frame: origin at its foot on the left, heights up (`y(h) = -h`).
 */
import type { AssetDefinition, Field, Properties } from '../core/composition';
import { windowLit } from '../../world/light';
import { text as paintText } from '../core/primitives';
import { piece, num, select, bool, text, colour, isHex, rgbOf, hash, rgba, y, type Paint } from '../buildings/types';
import { drawCar } from '../vehicles/vehicles';
import { bodyText } from '../vehicles/kit';

type X = CanvasRenderingContext2D;

// ---------------------------------------------------------------- shared

const RED = '255,42,68', GOLD = '216,180,90', TUBE = '236,248,242', AMBER = '255,176,70', GO = '110,230,150', CYAN = '0,230,230', EXIT = '70,230,130';
const HOURS = ['open', 'closed', 'alarm', 'cut'] as const;
const hoursField = (): Field => select('Hours (closed: tubes out; alarm: washed red; cut: no power, battery lamps only)', HOURS, 'open');
const colourField = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const hexOr = (v: unknown, d: string) => isHex(v) ? String(v) : d;
/** Two #rrggbb colours mixed (k 0: a, 1: b), as #rrggbb. */
const mixHex = (a: string, b: string, k: number) => { const c = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16), q = Math.max(0, Math.min(1, k));
  return '#' + [1, 3, 5].map(i => Math.round(c(a, i) + (c(b, i) - c(a, i)) * q).toString(16).padStart(2, '0')).join(''); };

/** A pixel-crisp rect: from `l`, its foot at height `h`, `w` wide, `t` tall. */
const R = (x: X, l: number, h: number, w: number, t: number, fill: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = fill; x.fillRect(Math.round(l), Math.round(y(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
/** Text centred on (cx, height h). */
const T = (x: X, s: string, cx: number, h: number, col: string, size = 7, weight = '600', align: CanvasTextAlign = 'center') => paintText(x, s, Math.round(cx), Math.round(y(h)) + 0.5, col, size, weight, align);
const textW = (x: X, s: string, size: number, weight = '600') => { x.save(); x.font = weight + ' ' + size + 'px "IBM Plex Mono", monospace'; const w = x.measureText(s).width; x.restore(); return w; };
/** A printed plate centred on (cx, h), sized to its text. */
function plate(x: X, s: string, cx: number, h: number, o: { fill?: string; ink?: string; size?: number; pad?: number; edge?: string; w?: number } = {}) {
  const size = o.size ?? 7, pad = o.pad ?? 4, w = Math.max(o.w ?? 0, Math.ceil(textW(x, s, size)) + pad * 2), ph = size + 4;
  R(x, cx - w / 2, h - ph / 2, w, ph, o.fill ?? '#e6e9ea');
  if (o.edge) { R(x, cx - w / 2, h + ph / 2 - 1, w, 1, o.edge); R(x, cx - w / 2, h - ph / 2, w, 1, 'rgba(0,0,0,.35)'); }
  T(x, s, cx, h, o.ink ?? 'rgba(40,46,52,.95)', size);
  return w;
}
/** Plaza Holdings signs in gold on black. */
const goldPlate = (x: X, s: string, cx: number, h: number, size = 7) => plate(x, s, cx, h, { fill: '#0b0b0d', ink: rgba(GOLD, 0.95), edge: rgba(GOLD, 0.7), size });
/** 0..1, a slow breath or a fast alarm pulse. */
const pulse = (t: number, speed: number, phase = 0) => 0.5 + 0.5 * Math.sin(t * speed + phase);
/** After hours: the piece's area dimmed (room light gone), the alarm's red over it. */
function after(x: X, hours: unknown, l: number, h: number, w: number, tall: number, t: number, k = 0.62) {
  if (hours === 'open' || !hours) return;
  R(x, l, h, w, tall, 'rgba(5,8,12,' + (hours === 'cut' ? Math.max(k, 0.8) : k) + ')');
  if (hours === 'alarm') R(x, l, h, w, tall, rgba(RED, 0.08 + 0.1 * pulse(t, 0.22)));
}
/** The Registry's seal: a ring with ticks and the Spire as a blade. */
function seal(x: X, cx: number, h: number, r: number, col: string) {
  x.save(); x.strokeStyle = col; x.lineWidth = Math.max(1, r / 6); x.beginPath(); x.arc(Math.round(cx) + 0.5, Math.round(y(h)) + 0.5, r, 0, Math.PI * 2); x.stroke(); x.restore();
  R(x, cx - 1, h - r * 0.55, 2, r * 1.05, col); R(x, cx - r * 0.45, h - r * 0.55, r * 0.9, 1, col);
}

const box = (w: number, tall: number, x0 = 0) => ({ x: x0, h: tall, w, tall });
const origin = () => ({ origin: { x: 0, h: 0, role: 'origin' as const } });

// ---------------------------------------------------------------- the rooms

const ROOM_KINDS = ['hall', 'office', 'corridor', 'records', 'server', 'plant'] as const;
const ROOM_WALL: Record<string, string> = { hall: '#aab1b5', office: '#a2a9ad', corridor: '#99a1a6', records: '#8c8f89', server: '#2c3339', plant: '#5a6455' };
const ROOM_DADO: Record<string, string> = { hall: '#6c7882', office: '#6f7a83', corridor: '#5f6a73', records: '#6a6c66', server: '#1d2328', plant: '#3e4a3c' };
const ROOM_CEIL: Record<string, string> = { hall: '#c7ccce', office: '#c2c7c9', corridor: '#b8bec1', records: '#a9aca6', server: '#1a1f23', plant: '#77806f' };

/** A ceiling tube: lit, flickering, out, or the standby light that stays on after hours. */
function tube(x: X, o: Paint, cx: number, H: number, state: 'on' | 'off' | 'standby', cold: string) {
  R(x, cx - 15, H - 11, 30, 3, '#5c6366');
  if (state === 'off') { R(x, cx - 14, H - 11, 28, 1, 'rgba(210,220,220,.25)'); return; }
  const lit = state === 'on';
  R(x, cx - 14, H - 11, 28, 2, lit ? 'rgb(' + cold + ')' : 'rgba(' + cold + ',.35)');
  const g = x.createLinearGradient(0, y(H - 11), 0, y(H - 70)); g.addColorStop(0, rgba(cold, lit ? 0.16 : 0.04)); g.addColorStop(1, rgba(cold, 0));
  x.fillStyle = g; x.beginPath(); x.moveTo(cx - 14, y(H - 11)); x.lineTo(cx + 14, y(H - 11)); x.lineTo(cx + 34, y(H - 70)); x.lineTo(cx - 34, y(H - 70)); x.closePath(); x.fill();
  if (lit) o.light?.(cx, H - 12, 28, 4, cold, 'window');
}
/** The green running-man exit sign, lit day and night. */
function exitSign(x: X, o: Paint, cx: number, h: number, dir: 1 | -1 = 1) {
  R(x, cx - 14, h - 1, 28, 11, '#0e1a12'); R(x, cx - 13, h, 26, 9, rgba(EXIT, 0.85));
  // the little running figure and the arrow
  const fx = cx - 9 * dir; R(x, fx, h + 6, 2, 2, '#0c2a16'); R(x, fx - 1, h + 3, 3, 3, '#0c2a16'); R(x, fx - 2 * dir, h + 1, 2, 2, '#0c2a16'); R(x, fx + 2 * dir, h + 1, 2, 2, '#0c2a16');
  T(x, 'EXIT', cx + 3 * dir, h + 4.5, '#0c2a16', 6, '700');
  o.light?.(cx, h + 4, 26, 9, EXIT, 'screen');
}
/** A ceiling dome camera, its red light blinking. */
function dome(x: X, cx: number, h: number, t: number, ph: number) {
  R(x, cx - 1, h - 2, 2, 2, '#30363a'); R(x, cx - 4, h - 6, 8, 4, '#1b1f22'); R(x, cx - 3, h - 7, 6, 1, '#1b1f22'); R(x, cx - 3, h - 5, 6, 1, 'rgba(255,255,255,.2)');
  if ((t + ph) % 120 < 60) R(x, cx + 1, h - 6, 1, 1, rgba(RED, 0.95));
}
/** A wall clock showing the city's time. */
function clock(x: X, cx: number, h: number, min: number) {
  x.save(); x.fillStyle = '#eef0ee'; x.beginPath(); x.arc(Math.round(cx) + 0.5, Math.round(y(h)) + 0.5, 7, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2e3438'; x.lineWidth = 1.5; x.stroke();
  const hr = ((min / 60) % 12) / 12 * Math.PI * 2, mn = (min % 60) / 60 * Math.PI * 2, c = { x: Math.round(cx) + 0.5, y: Math.round(y(h)) + 0.5 };
  x.strokeStyle = '#1a1d20'; x.lineWidth = 1; x.beginPath(); x.moveTo(c.x, c.y); x.lineTo(c.x + Math.sin(hr) * 3.5, c.y - Math.cos(hr) * 3.5); x.moveTo(c.x, c.y); x.lineTo(c.x + Math.sin(mn) * 5.5, c.y - Math.cos(mn) * 5.5); x.stroke();
  x.restore();
}

export const roomElement = piece({
  type: 'civic.room', label: 'Registry room, cut open (civic kit: hall, office, corridor, records, server, plant)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 400, 40, 4000, 1, 'units'), height: num('Wall height', 92, 50, 300, 1, 'units'), kind: select('Room', ROOM_KINDS, 'hall'), hours: hoursField(),
    wall: colour('Wall', 'The room’s own'), tubes: num('Tubes that work', 0.9, 0, 1, 0.05), flicker: num('Tubes that flicker', 0.12, 0, 1, 0.05),
    tubeEvery: num('A tube every', 60, 24, 400, 1, 'units'), dado: bool('Painted dado and bump rail', true), clock: num('Wall clock from the left (-1: none)', -1, -1, 4000, 1, 'units'),
    exit: num('Exit sign from the left (-1: none)', -1, -1, 4000, 1, 'units'), exitDir: select('Exit sign points', ['right', 'left'], 'right'),
    cameras: num('Ceiling cameras', 1, 0, 12), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(Number(p.width), Number(p.height)),
  anchors: p => ({ ...origin(), ceiling: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), kind = String(p.kind), seed = Number(p.seed), t = o.t, hours = String(p.hours);
    const wall = hexOr(p.wall, ROOM_WALL[kind] ?? ROOM_WALL.hall), server = kind === 'server', cold = server ? '200,225,255' : TUBE;
    R(x, 0, 0, W, H, wall);
    // laminate panel joints, a little lighter at the top where the tubes reach
    for (let k = 48; k < W; k += 48) R(x, k, 0, 1, H, 'rgba(0,0,0,.07)');
    const top = x.createLinearGradient(0, y(H), 0, y(H * 0.4)); top.addColorStop(0, 'rgba(255,255,255,.06)'); top.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = top; x.fillRect(0, y(H), W, H * 0.6);
    if (p.dado !== false) {
      R(x, 0, 0, W, 30, ROOM_DADO[kind] ?? ROOM_DADO.hall); R(x, 0, 30, W, 1, 'rgba(255,255,255,.2)');
      if (kind === 'corridor' || kind === 'hall') { R(x, 0, 24, W, 4, 'rgba(0,0,0,.18)'); R(x, 0, 27, W, 1, 'rgba(255,255,255,.12)'); }
      // scuffs where chairs and trolleys have hit the wall
      for (let i = 0; i < W / 40; i++) { const sx = hash(seed * 7 + i) * W; R(x, sx, 6 + hash(seed + i) * 18, 3 + hash(i + seed * 3) * 8, 1, 'rgba(0,0,0,.14)'); }
    }
    R(x, 0, 0, W, 4, server ? '#14181b' : '#3a4045');
    if (server) {
      // cold-aisle grilles in the raised floor, a cable ladder under the ceiling
      for (let k = 6; k < W - 10; k += 18) R(x, k, 0, 12, 2, 'rgba(120,170,220,.25)');
      R(x, 0, H - 18, W, 2, '#3b444b'); for (let k = 4; k < W; k += 10) R(x, k, H - 18, 1, 6, '#3b444b');
      R(x, 0, H - 16, W, 2, '#0b0d0f'); R(x, 0, H - 14, W, 1, 'rgba(255,210,60,.35)');
    }
    if (kind === 'plant') {
      // conduits run along the block wall, a cable entry at the floor
      R(x, 0, H - 22, W, 2, '#2e362c'); for (let k = 30; k < W; k += 90) R(x, k, 34, 2, H - 56, '#2e362c');
      for (let k = 0; k < W; k += 12) R(x, k, 0, W, 0.5, 'rgba(0,0,0,0)');
      for (let r = 8; r < H - 12; r += 8) R(x, 0, r, W, 1, 'rgba(0,0,0,.08)');
    }
    // the ceiling: a suspended grid, the tubes in it
    R(x, 0, H - 9, W, 9, ROOM_CEIL[kind] ?? ROOM_CEIL.hall); R(x, 0, H - 10, W, 1, 'rgba(0,0,0,.3)');
    for (let k = 15; k < W; k += 30) R(x, k, H - 9, 1, 9, 'rgba(0,0,0,.12)');
    const every = Number(p.tubeEvery);
    for (let k = every / 2, i = 0; k < W - 10; k += every, i++) {
      const s = seed * 31 + i * 7, works = hash(s) < Number(p.tubes), flick = hash(s + 1) < Number(p.flicker);
      let state: 'on' | 'off' | 'standby' = works ? 'on' : 'off';
      if (state === 'on' && flick && ((t * 0.37 + i * 53) % 97 < 9 || (t * 0.11 + i * 17) % 61 < 3)) state = 'off';
      if (hours !== 'open') state = hours !== 'cut' && i % 3 === 1 ? 'standby' : 'off';
      tube(x, o, k, H, state, cold);
    }
    const cams = Number(p.cameras);
    for (let i = 0; i < cams; i++) dome(x, (W * (i + 0.5)) / cams + 7, H - 9, t, seed * 13 + i * 37);
    if (Number(p.clock) >= 0) clock(x, Number(p.clock), H - 26, o.lighting.min ?? 600);
    after(x, hours, 0, 0, W, H, t, 0.7);
    if (hours === 'cut') for (let k = 70; k < W - 20; k += 140) {
      // battery emergency bulkheads: a small warm box under the ceiling, a weak pool below it
      R(x, k - 6, H - 18, 12, 5, '#2a2c2a'); R(x, k - 5, H - 17, 10, 3, 'rgba(255,236,190,.95)');
      const g = x.createLinearGradient(0, y(H - 18), 0, y(0)); g.addColorStop(0, 'rgba(255,236,190,.1)'); g.addColorStop(1, 'rgba(255,236,190,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(k - 5, y(H - 18)); x.lineTo(k + 5, y(H - 18)); x.lineTo(k + 40, 0); x.lineTo(k - 40, 0); x.closePath(); x.fill();
      o.light?.(k, H - 16, 10, 3, '255,236,190', 'window');
    }
    if (Number(p.exit) >= 0) exitSign(x, o, Number(p.exit), H - 24, p.exitDir === 'left' ? -1 : 1);
  },
});

// ---------------------------------------------------------------- the public hall

export const ticketMachineElement = piece({
  type: 'civic.ticket-machine', label: 'Ticket machine: take a number (civic kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    label: text('Sign on its post (empty: none)', 'TAKE A NUMBER'), paper: select('Paper', ['ok', 'low', 'out'], 'ok'), litter: num('Tickets dropped on the floor', 0.6, 0, 1, 0.05),
    tell: bool('Usable (cyan tell)', true), hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: () => ({ w: 24, tall: 80 }),
  bounds: () => ({ x: -20, h: 80, w: 64, tall: 82 }),
  anchors: () => ({ ...origin(), slot: { x: 12, h: 30, role: 'mount' } }),
  paint(x, p, o) {
    const t = o.t, open = p.hours === 'open', out = p.paper === 'out', seed = Number(p.seed);
    // dropped tickets round its foot
    for (let i = 0; i < Math.round(Number(p.litter) * 9); i++) { const lx = -14 + hash(seed + i) * 50; R(x, lx, 0, 3, 1, i % 3 ? 'rgba(235,230,215,.8)' : 'rgba(200,195,180,.7)'); }
    R(x, 3, 0, 18, 3, '#3e454a'); R(x, 7, 3, 10, 20, '#7b848a'); R(x, 7, 3, 1, 20, 'rgba(255,255,255,.25)');
    // the head: grey-white enamel, a screen, the big button, the slot
    R(x, 0, 23, 24, 32, '#c9ced1'); R(x, 0, 23, 1, 32, 'rgba(255,255,255,.5)'); R(x, 23, 23, 1, 32, 'rgba(0,0,0,.3)'); R(x, 0, 55, 24, 2, '#8f979c');
    R(x, 3, 40, 18, 12, '#0c1215');
    if (open) {
      T(x, out ? 'ASK AT' : 'PRESS', 12, 48, 'rgba(220,235,240,.9)', 5, '600'); T(x, out ? 'COUNTER' : 'FOR NO.', 12, 43, 'rgba(220,235,240,.9)', 5, '600');
      o.light?.(12, 46, 16, 10, '200,230,240', 'screen');
    }
    if (p.tell !== false && open) { const k = 0.55 + 0.45 * pulse(t, 0.05); R(x, 3, 52, 18, 1, rgba(CYAN, k)); R(x, 3, 40, 1, 12, rgba(CYAN, k * 0.8)); R(x, 20, 40, 1, 12, rgba(CYAN, k * 0.8)); }
    x.fillStyle = '#b8262f'; x.beginPath(); x.arc(12, y(34), 3.5, 0, Math.PI * 2); x.fill(); R(x, 11, 35, 2, 1, 'rgba(255,255,255,.45)');
    R(x, 5, 27, 14, 2, '#15191b');
    if (!out) { R(x, 9, 23 - (p.paper === 'low' ? 1 : 5), 6, p.paper === 'low' ? 5 : 9, '#efe9d6'); R(x, 10, 24 - (p.paper === 'low' ? 0 : 3), 4, 1, 'rgba(40,40,40,.6)'); }
    else { R(x, 2, 30, 20, 6, '#f2eccf'); T(x, 'NO PAPER', 12, 33, 'rgba(60,40,30,.9)', 5, '700'); }
    // the sign on a post above it
    const label = String(p.label ?? '');
    if (label) { R(x, 11, 57, 2, 13, '#7b848a'); plate(x, label, 12, 74, { fill: '#e8ebec', ink: 'rgba(36,42,48,.95)', edge: '#7b848a' }); }
    after(x, p.hours, -20, 0, 64, 80, t, 0.55);
  },
});

export const numberDisplayElement = piece({
  type: 'civic.number-display', label: 'Now serving display (civic kit: queue numbers, the wait)', category: 'sign kit', libraryUse: 'reusable',
  fields: {
    width: num('Width', 124, 60, 600, 1, 'units'), height: num('Height', 26, 18, 80, 1, 'units'), prefix: text('Number prefix', 'A'), start: num('First number', 17, 0, 999),
    step: num('Next number every (frames)', 1400, 60, 60000, 10), counters: num('Counters it calls to', 4, 1, 20), open: text('Counters open (comma list; empty: all)', '3'),
    wait: text('Line under it', 'ESTIMATED WAIT 4 H 10 MIN'), rods: num('Rods up to the ceiling (0: on the wall)', 0, 0, 400, 1, 'units'), hours: hoursField(),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.rods) }),
  bounds: p => box(Number(p.width), Number(p.height) + Number(p.rods)),
  anchors: () => origin(),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), rods = Number(p.rods), t = o.t, on = p.hours === 'open';
    if (rods > 0) for (const rx of [8, W - 9]) R(x, rx, H, 1, rods, '#4d5459');
    R(x, -1, -1, W + 2, H + 2, '#30363a'); R(x, 0, 0, W, H, '#0b0d0e');
    if (!on) { if (p.hours !== 'cut') T(x, p.hours === 'alarm' ? '- - -' : 'SERVICE CLOSED', W / 2, H / 2, rgba(AMBER, 0.35), 7, '700'); return; }
    const open = String(p.open ?? '').split(',').map(s => parseInt(s, 10)).filter(n => n > 0), counters = Number(p.counters);
    const step = Number(p.step), k = Math.floor(t / step), n = Number(p.start) + k, fresh = t - k * step < 90;
    const counter = open.length ? open[k % open.length] : (k % counters) + 1;
    const blink = !fresh || Math.floor(t / 10) % 2 === 0;
    T(x, 'NOW SERVING', 6, H - 7, 'rgba(232,226,210,.75)', 6, '600', 'left');
    if (blink) {
      T(x, String(p.prefix ?? '') + '-' + String(n % 1000).padStart(3, '0'), W - 6, H - 8, rgba(AMBER, 0.98), 10, '700', 'right');
      T(x, 'COUNTER ' + counter, 6, H - 16, rgba(AMBER, 0.9), 6, '700', 'left');
    }
    // the wait, scrolling slowly along the bottom row
    const wait = String(p.wait ?? '');
    if (wait) {
      x.save(); x.beginPath(); x.rect(2, y(8), W - 4, 7); x.clip();
      const tw = textW(x, wait, 6) + 40, off = (t * 0.25) % tw;
      T(x, wait, W - off, 4.5, rgba(AMBER, 0.6), 6, '600', 'left'); T(x, wait, W - off + tw, 4.5, rgba(AMBER, 0.6), 6, '600', 'left');
      x.restore();
    }
    o.light?.(W / 2, H / 2, W, H, AMBER, 'screen');
  },
});

export const chairsElement = piece({
  type: 'civic.chairs', label: 'Linked plastic chairs on a beam (civic kit: the waiting room)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    count: num('Seats', 8, 1, 40), seat: num('Seat width', 20, 10, 40, 1, 'units'), height: num('Seat height (sit people here)', 10, 6, 20, 1, 'units'),
    colour: colourField('Plastic', '#4c6472'), broken: num('Seats broken or taped off', 0.1, 0, 1, 0.05), legEvery: num('Legs every N seats', 3, 1, 10), hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * Number(p.seat), tall: Number(p.height) + 16 }),
  bounds: p => box(Number(p.count) * Number(p.seat), Number(p.height) + 16),
  anchors: p => ({ ...origin(), seat: { x: Number(p.seat) / 2, h: Number(p.height), role: 'surface' } }),
  paint(x, p, o) {
    const n = Number(p.count), s = Number(p.seat), H = Number(p.height), col = hexOr(p.colour, '#4c6472'), seed = Number(p.seed), W = n * s;
    R(x, 0, H - 4, W, 2, '#2a3034'); R(x, 0, H - 2, W, 1, 'rgba(255,255,255,.15)');
    for (let i = 0; i <= n; i += Number(p.legEvery)) { const lx = Math.min(W - 3, i * s); R(x, lx, 0, 2, H - 4, '#2a3034'); R(x, lx - 2, 0, 6, 1, '#1d2225'); }
    for (let i = 0; i < n; i++) {
      const sx = i * s, broken = hash(seed * 17 + i) < Number(p.broken);
      R(x, sx + s - 1, H - 2, 2, 7, '#2a3034');
      if (broken && hash(seed + i * 3) < 0.5) {
        // the shell is gone: just the frame, a seat pan and tape across
        R(x, sx + 2, H - 2, s - 4, 2, '#30373b'); R(x, sx + 3, H, 1, 12, '#30373b'); R(x, sx + s - 4, H, 1, 12, '#30373b');
        for (let k = 0; k < s - 4; k += 2) R(x, sx + 2 + k, H + 6 - (k % 4 === 0 ? 0 : 1), 2, 2, k % 4 === 0 ? 'rgba(240,200,40,.9)' : 'rgba(25,25,25,.9)');
        continue;
      }
      R(x, sx + 1, H - 2, s - 2, 3, col); R(x, sx + 1, H, s - 2, 1, 'rgba(255,255,255,.2)');
      R(x, sx + 2, H + 2, s - 4, 13, col); R(x, sx + 2, H + 14, s - 4, 1, 'rgba(255,255,255,.22)'); R(x, sx + 2, H + 2, 1, 13, 'rgba(255,255,255,.1)');
      R(x, sx + s / 2 - 2, H + 8, 4, 1, 'rgba(0,0,0,.25)');
      if (broken) { R(x, sx + 3, H + 4, s - 6, 2, 'rgba(240,235,215,.9)'); }
    }
    after(x, p.hours, 0, 0, W, H + 16, o.t, 0.55);
  },
});

export const countersElement = piece({
  type: 'civic.counters', label: 'Service counters behind glass (civic kit: one window open)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    windows: num('Windows', 4, 1, 16), bay: num('Window width', 50, 30, 120, 1, 'units'), counter: num('Counter height', 30, 20, 44, 1, 'units'),
    glass: num('Glass up to', 74, 50, 140, 1, 'units'), open: text('Windows open (comma list)', '3'), label: text('Fascia (empty: none)', 'COUNTERS 1–4'),
    line: bool('Wait-behind line on the floor', true), part: select('Draws (back: the staff side, to put clerks between)', ['all', 'back', 'front'], 'all'), hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.windows) * Number(p.bay), tall: Number(p.glass) + 26 }),
  bounds: p => box(Number(p.windows) * Number(p.bay), Number(p.glass) + 26),
  anchors: p => ({ ...origin(), ...Object.fromEntries(Array.from({ length: Number(p.windows) }, (_, i) => ['window' + (i + 1), { x: (i + 0.5) * Number(p.bay), h: 0, role: 'mount' as const }])) }),
  paint(x, p, o) {
    const n = Number(p.windows), B = Number(p.bay), C = Number(p.counter), G = Number(p.glass), W = n * B, t = o.t, seed = Number(p.seed);
    const open = new Set(String(p.open ?? '').split(',').map(s => parseInt(s, 10)).filter(k => k > 0)), staffed = p.hours === 'open';
    const back = p.part !== 'front', front = p.part !== 'back';
    for (let i = 0; i < n; i++) {
      const bx = i * B, isOpen = staffed && open.has(i + 1);
      // the staff side, seen through the glass
      if (back) {
        R(x, bx, C, B, G - C, '#7c868c'); R(x, bx, C, B, 8, '#6b747a');
        if (isOpen) {
          R(x, bx + B - 18, C + 2, 3, 6, '#2a2f33'); R(x, bx + B - 22, C + 8, 12, 9, '#22272a'); R(x, bx + B - 21, C + 9, 10, 7, 'rgba(180,200,210,.35)');
          R(x, bx + 6, C + 2, 10, 2, '#efe9d6'); R(x, bx + 7, C + 4, 9, 1, '#e4dcc4'); R(x, bx + 18, C + 2, 3, 4, '#3a2d26');
        }
      }
      if (!front) continue;
      if (!isOpen) {
        // the blind is down and a card says so
        R(x, bx + 3, C + 2, B - 6, G - C - 4, '#c3c7c4'); for (let k = C + 5; k < G - 2; k += 3) R(x, bx + 3, k, B - 6, 1, 'rgba(0,0,0,.12)');
        plate(x, 'CLOSED', bx + B / 2, C + (G - C) * 0.55, { fill: '#f1efe6', ink: 'rgba(60,64,70,.95)', size: 6 });
      }
      // the glass, its speaking grille and the slot under it
      R(x, bx + 3, C + 2, B - 6, G - C - 2, 'rgba(205,228,238,.2)'); R(x, bx + 3, G - 1, B - 6, 1, 'rgba(240,250,255,.55)');
      x.fillStyle = 'rgba(240,250,255,.12)'; x.beginPath(); x.moveTo(bx + 8, y(G - 2)); x.lineTo(bx + 18, y(G - 2)); x.lineTo(bx + 6, y(C + 6)); x.lineTo(bx + 3, y(C + 6)); x.closePath(); x.fill();
      for (let a = 0; a < 6; a++) R(x, bx + B / 2 - 5 + (a % 3) * 4, C + 18 + Math.floor(a / 3) * 3, 1, 1, 'rgba(30,34,38,.6)');
      R(x, bx + B / 2 - 9, C, 18, 2, '#1a1d20');
      // the counter: laminate, a lit top edge, the window's number on a card
      R(x, bx, 0, B, C, '#8b949a'); R(x, bx, C - 3, B, 3, '#d2d6d8'); R(x, bx, C - 4, B, 1, 'rgba(0,0,0,.25)'); R(x, bx, 0, B, 4, '#3b4146');
      R(x, bx + B / 2 - 6, C - 16, 12, 9, '#eceeef'); T(x, String(i + 1), bx + B / 2, C - 11.5, 'rgba(40,46,52,.95)', 7, '700');
      // over the window: its number lit when it is open
      R(x, bx + B / 2 - 9, G + 3, 18, 10, '#101214');
      if (isOpen) { T(x, String(i + 1), bx + B / 2 - 3, G + 8, rgba(AMBER, 0.95), 7, '700'); R(x, bx + B / 2 + 4, G + 6, 3, 3, rgba(GO, 0.9)); o.light?.(bx + B / 2, G + 8, 14, 8, AMBER, 'screen'); o.light?.(bx + B / 2, C + 24, B - 8, 30, TUBE, 'window'); }
      R(x, bx, 0, 3, G + 4, '#5a6369'); R(x, bx, 0, 1, G + 4, 'rgba(255,255,255,.2)');
    }
    if (!front) { after(x, p.hours, 0, 0, W, G, t, 0.55); return; }
    R(x, W - 3, 0, 3, G + 4, '#5a6369');
    R(x, -2, G + 14, W + 4, 11, '#d9dddf'); R(x, -2, G + 14, W + 4, 1, 'rgba(0,0,0,.3)'); R(x, -2, G + 25, W + 4, 1, '#8b949a');
    const label = String(p.label ?? ''); if (label) T(x, label, W / 2, G + 19.5, 'rgba(46,52,58,.95)', 7, '700');
    if (p.line !== false) for (let k = 0; k < W; k += 8) R(x, k - 26, -1, 5, 1, 'rgba(235,205,60,.85)');
    after(x, p.hours, -2, 0, W + 4, G + 26, t, 0.55);
    void seed;
  },
});

export const boothsElement = piece({
  type: 'civic.booths', label: 'Privacy booths (civic kit: frosted panels, a terminal inside)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    count: num('Booths', 2, 1, 12), width: num('Booth width', 34, 24, 80, 1, 'units'), height: num('Panel height', 70, 50, 120, 1, 'units'),
    occupied: text('Booths in use (comma list)', '1'), label: text('Plate (number appended)', 'BOOTH'), hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.count) * (Number(p.width) + 3) + 3, tall: Number(p.height) + 12 }),
  bounds: p => box(Number(p.count) * (Number(p.width) + 3) + 3, Number(p.height) + 12),
  anchors: () => origin(),
  paint(x, p, o) {
    const n = Number(p.count), bw = Number(p.width), H = Number(p.height), t = o.t, used = new Set(String(p.occupied ?? '').split(',').map(s => parseInt(s, 10)));
    for (let i = 0; i < n; i++) {
      const bx = 3 + i * (bw + 3), busy = p.hours === 'open' && used.has(i + 1);
      R(x, bx, 0, bw, H, '#5d666c');
      // inside: a small terminal on a shelf; whoever is in there, only the shape on the glass and the feet
      R(x, bx + bw / 2 - 6, 30, 12, 9, '#191d20'); if (busy) { R(x, bx + bw / 2 - 5, 31, 10, 7, 'rgba(210,230,240,.6)'); o.light?.(bx + bw / 2, 35, 10, 8, '210,230,240', 'screen'); }
      R(x, bx + 2, 26, bw - 4, 2, '#3c4347');
      if (busy) { x.fillStyle = 'rgba(30,34,38,.55)'; x.beginPath(); x.ellipse(bx + bw / 2, y(46), 5, 6, 0, 0, Math.PI * 2); x.fill(); R(x, bx + bw / 2 - 7, 12, 14, 30, 'rgba(30,34,38,.45)'); }
      // the frosted panel, a gap under it
      R(x, bx + 1, 9, bw - 2, H - 22, 'rgba(222,232,236,.82)'); R(x, bx + 1, H - 14, bw - 2, 1, 'rgba(255,255,255,.8)');
      for (let k = 12; k < H - 16; k += 4) R(x, bx + 2, k, bw - 4, 1, 'rgba(255,255,255,.12)');
      if (busy) { R(x, bx + bw / 2 - 6, 0, 4, 3, '#1c1c1e'); R(x, bx + bw / 2 + 2, 0, 4, 3, '#1c1c1e'); R(x, bx + bw / 2 - 5, 3, 2, 5, '#2c3238'); R(x, bx + bw / 2 + 3, 3, 2, 5, '#2c3238'); }
      R(x, bx - 2, 0, 2, H + 2, '#a9b1b6'); R(x, bx + bw, 0, 2, H + 2, '#a9b1b6'); R(x, bx - 2, H, bw + 4, 2, '#a9b1b6');
      plate(x, String(p.label ?? '') + ' ' + (i + 1), bx + bw / 2 - 4, H + 7, { fill: '#e6e9ea', size: 6, pad: 2 });
      R(x, bx + bw - 6, H + 5, 4, 4, '#101214'); R(x, bx + bw - 5, H + 6, 2, 2, busy ? rgba(AMBER, 0.95) : rgba(GO, 0.9));
    }
    after(x, p.hours, 0, 0, n * (bw + 3) + 3, H + 12, t, 0.55);
  },
});

const HOLD_MODES = ['hold', 'appointment', 'denied', 'premium', 'closed'] as const;
/** One page of the hold screen. */
function holdPage(x: X, mode: string, W: number, H: number, t: number, p: Properties) {
  if (mode === 'premium') {
    R(x, 0, 0, W, H, '#0b0b0d'); R(x, 2, 2, W - 4, 1, rgba(GOLD, 0.6)); R(x, 2, H - 3, W - 4, 1, rgba(GOLD, 0.6));
    T(x, 'REGISTRY PREMIUM', W / 2, H * 0.68, rgba(GOLD, 0.98), 8, '700'); T(x, 'SKIP THE QUEUE', W / 2, H * 0.44, 'rgba(232,226,210,.85)', 7, '600');
    T(x, 'PLAZA HOLDINGS', W / 2, H * 0.2, rgba(GOLD, 0.7), 6, '600'); return;
  }
  R(x, 0, 0, W, H, mode === 'closed' ? '#1a1f22' : '#dfe4e6');
  if (mode === 'closed') { seal(x, W / 2, H / 2, Math.min(W, H) * 0.25, 'rgba(200,210,215,.25)'); return; }
  const head = mode === 'denied' ? '#b8262f' : '#5c666d';
  R(x, 0, H - 9, W, 9, head); T(x, 'REGISTRY', 6, H - 4.5, 'rgba(245,247,248,.95)', 6, '700', 'left');
  if (mode === 'hold') {
    T(x, 'PLEASE HOLD', W / 2, H * 0.55, 'rgba(46,52,58,.95)', 9, '700');
    const pos = Number(p.position) + Math.floor(t / 2700);
    T(x, 'YOUR POSITION: ' + pos, W / 2, H * 0.22, 'rgba(70,78,86,.9)', 6, '600');
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, on = Math.floor(t / 12) % 8 === i; R(x, W - 12 + Math.cos(a) * 4, H - 4.5 + Math.sin(a) * 3 - 1, 1, 1, on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.35)'); }
  } else if (mode === 'appointment') {
    T(x, 'NEXT AVAILABLE APPOINTMENT', W / 2, H * 0.6, 'rgba(70,78,86,.9)', 6, '600');
    T(x, String(p.appointment ?? 'IN 90 DAYS'), W / 2, H * 0.3, 'rgba(46,52,58,.95)', 9, '700');
  } else {
    T(x, 'IDENTITY NOT FOUND', W / 2, H * 0.56, 'rgba(46,52,58,.95)', 7, '700');
    T(x, 'PLEASE HOLD', W / 2, H * 0.26, 'rgba(70,78,86,.9)', 6, '600');
  }
}

export const holdScreenElement = piece({
  type: 'civic.hold-screen', label: 'Registry screen: please hold, appointments, Premium (civic kit)', category: 'sign kit', libraryUse: 'reusable',
  fields: {
    width: num('Width', 110, 50, 600, 1, 'units'), height: num('Height', 46, 26, 300, 1, 'units'), mode: select('Shows', HOLD_MODES, 'hold'),
    alternate: select('Takes turns with', ['none', ...HOLD_MODES], 'premium'), period: num('Page time (frames)', 600, 60, 20000, 10),
    position: num('Queue position', 214, 1, 99999), appointment: text('Appointment line', 'IN 90 DAYS'), rec: bool('REC light', true),
    rods: num('Rods up to the ceiling (0: on the wall)', 0, 0, 400, 1, 'units'), hours: hoursField(),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.rods) }),
  bounds: p => box(Number(p.width), Number(p.height) + Number(p.rods)),
  anchors: () => origin(),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), t = o.t, rods = Number(p.rods);
    if (rods > 0) for (const rx of [10, W - 11]) R(x, rx, H, 1, rods + 2, '#4d5459');
    R(x, -3, -3, W + 6, H + 6, '#1a1d20'); R(x, -3, H + 2, W + 6, 1, 'rgba(255,255,255,.15)');
    const alt = String(p.alternate), page = alt !== 'none' && Math.floor(t / Number(p.period)) % 2 === 1 ? alt : String(p.mode);
    if (p.hours === 'cut') R(x, 0, 0, W, H, '#07090a'); else holdPage(x, p.hours === 'open' ? page : 'closed', W, H, t, p);
    if (p.rec !== false && p.hours !== 'cut' && Math.floor(t / 40) % 2 === 0) R(x, W - 5, -2, 2, 1, rgba(RED, 0.95));
    if (p.hours === 'open') o.light?.(W / 2, H / 2, W, H, page === 'premium' ? GOLD : '220,230,236', 'screen');
  },
});

const POSTERS: Record<string, { bg: string; ink: string; head?: string; lines: string[] }> = {
  premium: { bg: '#0b0b0d', ink: rgba(GOLD, 0.95), lines: ['REGISTRY', 'PREMIUM', '', 'PRIORITY', 'SERVICE', '', 'ASK STAFF'] },
  identity: { bg: '#e9ebe8', ink: 'rgba(40,46,52,.95)', head: 'NOTICE', lines: ['YOUR', 'IDENTITY', 'IS YOUR', 'RESPONSI-', 'BILITY'] },
  documents: { bg: '#e6e8e4', ink: 'rgba(40,46,52,.95)', head: 'BRING', lines: ['PROOF OF', 'IDENTITY', 'PROOF OF', 'ADDRESS', '2 COPIES'] },
  conduct: { bg: '#e9ebe8', ink: 'rgba(40,46,52,.95)', head: 'NOTICE', lines: ['STAFF ARE', 'HERE TO', 'HELP YOU', '', 'ABUSE IS', 'RECORDED'] },
  report: { bg: '#e9ebe8', ink: 'rgba(40,46,52,.95)', head: 'REPORT', lines: ['UNREGIS-', 'TERED', 'PERSONS', 'AT ANY', 'COUNTER'] },
  custom: { bg: '#e9ebe8', ink: 'rgba(40,46,52,.95)', head: '', lines: [] },
};
export const posterElement = piece({
  type: 'civic.poster', label: 'Registry poster in a frame (civic kit: Premium, notices)', category: 'sign kit', libraryUse: 'reusable',
  fields: {
    kind: select('Poster', Object.keys(POSTERS), 'premium'), width: num('Width', 46, 20, 300, 1, 'units'), height: num('Height', 62, 20, 300, 1, 'units'),
    lines: text('Lines (custom; split by /)', 'NOTICE/PLEASE HOLD'), header: text('Red header (custom; empty: none)', ''), frame: bool('Steel frame', true),
    faded: num('Faded', 0, 0, 1, 0.05), hours: hoursField(),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(Number(p.width), Number(p.height)),
  anchors: () => origin(),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), kind = String(p.kind), def = POSTERS[kind] ?? POSTERS.identity;
    const lines = kind === 'custom' ? String(p.lines ?? '').split('/') : def.lines, head = kind === 'custom' ? String(p.header ?? '') : def.head ?? '';
    if (p.frame !== false) R(x, -2, -2, W + 4, H + 4, '#6d767c');
    R(x, 0, 0, W, H, def.bg);
    if (kind === 'premium') { R(x, 2, 2, W - 4, 1, rgba(GOLD, 0.6)); R(x, 2, H - 3, W - 4, 1, rgba(GOLD, 0.6)); seal(x, W / 2, H - 13, 6, rgba(GOLD, 0.9)); }
    let top = H - 4;
    if (head) { R(x, 0, H - 11, W, 11, '#b8262f'); T(x, head, W / 2, H - 5.5, 'rgba(250,246,240,.95)', 7, '700'); top = H - 14; }
    else if (kind === 'premium') top = H - 24;
    lines.forEach((l, i) => { if (l) T(x, l, W / 2, top - 4 - i * 8, def.ink, 7, i < 2 && kind === 'premium' ? '700' : '600'); });
    if (Number(p.faded) > 0) R(x, 0, 0, W, H, 'rgba(200,196,180,' + (0.45 * Number(p.faded)).toFixed(3) + ')');
    after(x, p.hours, -2, -2, W + 4, H + 4, o.t, 0.55);
  },
});

export const queueRailElement = piece({
  type: 'civic.queue-rail', label: 'Belt barrier posts (civic kit: queue here)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    posts: num('Posts', 4, 2, 30), spacing: num('Spacing', 28, 10, 120, 1, 'units'), height: num('Height', 30, 18, 44, 1, 'units'),
    belt: colourField('Belt', '#45607a'), sign: text('Sign on the first post (empty: none)', 'QUEUE HERE'), slack: bool('One belt unhooked and hanging', true), hours: hoursField(),
  },
  size: p => ({ w: (Number(p.posts) - 1) * Number(p.spacing) + 8, tall: Number(p.height) + 14 }),
  bounds: p => box((Number(p.posts) - 1) * Number(p.spacing) + 8, Number(p.height) + 14, -4),
  anchors: () => origin(),
  paint(x, p, o) {
    const n = Number(p.posts), s = Number(p.spacing), H = Number(p.height), belt = hexOr(p.belt, '#45607a');
    for (let i = 0; i < n - 1; i++) {
      const a = i * s;
      if (p.slack !== false && i === n - 2) { R(x, a + 1, H - 6, 2, 4, belt); for (let k = 0; k < 10; k++) R(x, a + 2 + Math.round(k * 0.4), H - 6 - k * 2, 2, 2, belt); continue; }
      R(x, a, H - 5, s, 2, belt); R(x, a, H - 4, s, 1, 'rgba(255,255,255,.12)');
    }
    for (let i = 0; i < n; i++) { const a = i * s; R(x, a - 4, 0, 8, 2, '#2c3236'); R(x, a - 1, 2, 2, H - 2, '#b7bfc3'); R(x, a - 1, 2, 1, H - 2, 'rgba(255,255,255,.4)'); R(x, a - 2, H - 1, 4, 3, '#8d969b'); }
    const sign = String(p.sign ?? ''); if (sign) plate(x, sign, 0, H + 8, { fill: '#e6e9ea', edge: '#8d969b' });
    after(x, p.hours, -30, 0, n * s + 30, H + 14, o.t, 0.5);
  },
});

// ---------------------------------------------------------------- the back office

const DOOR_KINDS = ['staff', 'fire', 'plain', 'cage'] as const;
export const staffDoorElement = piece({
  type: 'civic.staff-door', label: 'Door with a card reader (civic kit: staff only, fire exit, records cage)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    kind: select('Door', DOOR_KINDS, 'staff'), width: num('Width', 26, 18, 60, 1, 'units'), height: num('Height', 56, 46, 90, 1, 'units'),
    plate: text('Plate over it (empty: none)', 'STAFF ONLY'), state: select('State', ['closed', 'open', 'forced'], 'closed'),
    reader: bool('Card reader', true), tell: bool('Usable (cyan tell on the reader)', false), hours: hoursField(),
  },
  size: p => ({ w: Number(p.width) + 14, tall: Number(p.height) + 14 }),
  bounds: p => box(Number(p.width) + 14, Number(p.height) + 14, -3),
  anchors: p => ({ ...origin(), door: { x: Number(p.width) / 2, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), kind = String(p.kind), state = String(p.state), t = o.t;
    const leaf = kind === 'fire' ? '#6f8a72' : kind === 'cage' ? '#3e4549' : '#8b949a';
    R(x, -3, 0, W + 6, H + 3, '#4d565c'); R(x, -3, H + 2, W + 6, 1, 'rgba(255,255,255,.25)');
    R(x, 0, 0, W, H, '#0e1113');
    const ajar = state === 'open' ? 1 : state === 'forced' ? 0.35 : 0, lw = Math.round(W * (1 - ajar * 0.8));
    if (ajar > 0) { const g = x.createLinearGradient(lw, 0, W, 0); g.addColorStop(0, 'rgba(220,235,240,.18)'); g.addColorStop(1, 'rgba(220,235,240,0)'); x.fillStyle = g; x.fillRect(lw, y(H), W - lw, H); }
    if (kind === 'cage') { for (let k = 2; k < lw; k += 4) R(x, k, 0, 1, H, 'rgba(170,175,170,.6)'); for (let h = 4; h < H; h += 4) R(x, 0, h, lw, 1, 'rgba(170,175,170,.35)'); R(x, 0, 0, 2, H, '#5c6469'); R(x, lw - 2, 0, 2, H, '#5c6469'); }
    else {
      R(x, 0, 0, lw, H, leaf); R(x, 0, 0, 1, H, 'rgba(255,255,255,.2)'); R(x, lw - 1, 0, 1, H, 'rgba(0,0,0,.35)'); R(x, 0, 0, lw, 3, 'rgba(0,0,0,.25)');
      if (lw > 14) { R(x, lw / 2 - 4, 30, 8, 14, '#9fb3bb'); for (let k = 0; k < 8; k += 2) R(x, lw / 2 - 4 + k, 30, 1, 14, 'rgba(60,70,74,.4)'); }
      if (kind === 'fire') { R(x, 2, 26, Math.max(2, lw - 4), 3, '#c8ccc6'); R(x, 2, 25, Math.max(2, lw - 4), 1, '#2a2e2c'); }
      else R(x, lw - 6, 26, 4, 2, '#c8ccd0');
    }
    if (state === 'forced') { R(x, lw - 2, 22, 3, 8, '#cfd4d6'); for (let k = 0; k < 4; k++) R(x, lw - 4 - k, 18 + k * 5, 2, 1, 'rgba(255,255,255,.5)'); }
    if (p.reader !== false) {
      R(x, W + 4, 30, 6, 10, '#202427'); R(x, W + 5, 32, 4, 3, '#0b0c0d');
      const led = state === 'forced' ? (Math.floor(t / 6) % 2 ? rgba(RED, 1) : 'rgba(255,240,180,1)') : state === 'open' ? rgba(GO, 0.95) : rgba(RED, 0.9);
      R(x, W + 6, 37, 2, 1, led);
      if (p.tell) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, W + 4, 40, 6, 1, rgba(CYAN, k)); R(x, W + 4, 30, 1, 10, rgba(CYAN, k * 0.8)); }
      if (state === 'forced' && Math.floor(t / 4) % 5 === 0) for (let k = 0; k < 5; k++) R(x, W + 7 + hash(t + k) * 8 - 4, 34 + hash(t * 3 + k) * 10, 1, 1, 'rgba(255,230,140,1)');
    }
    const label = kind === 'fire' && !String(p.plate ?? '') ? 'EMERGENCY EXIT' : String(p.plate ?? '');
    if (label) plate(x, label, W / 2, H + 8, kind === 'fire' ? { fill: rgba(EXIT, 0.9), ink: 'rgba(10,40,20,.95)' } : { fill: '#e6e9ea', edge: '#8d969b' });
    after(x, p.hours, -3, 0, W + 14, H + 14, t, 0.45);
  },
});

export const terminalBankElement = piece({
  type: 'civic.terminal-bank', label: 'Terminal bank: desks, monitors, partitions (civic kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    desks: num('Desks', 4, 1, 20), desk: num('Desk width', 52, 36, 100, 1, 'units'), partitions: bool('Fabric partitions behind', true),
    tell: num('Usable terminal (cyan tell; 0: none)', 0, 0, 20), people: text('Desks with a chair pulled out (comma list)', '2'), hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.desks) * Number(p.desk), tall: 56 }),
  bounds: p => box(Number(p.desks) * Number(p.desk), 56),
  anchors: p => ({ ...origin(), ...Object.fromEntries(Array.from({ length: Number(p.desks) }, (_, i) => ['desk' + (i + 1), { x: (i + 0.3) * Number(p.desk), h: 0, role: 'mount' as const }])) }),
  paint(x, p, o) {
    const n = Number(p.desks), D = Number(p.desk), seed = Number(p.seed), t = o.t, hours = String(p.hours), tell = Number(p.tell);
    const pulled = new Set(String(p.people ?? '').split(',').map(s => parseInt(s, 10)));
    for (let i = 0; i < n; i++) {
      const dx = i * D, cx = dx + D * 0.58, s = seed * 41 + i;
      if (p.partitions !== false) {
        R(x, dx + 1, 24, D - 2, 30, '#6f808b'); R(x, dx + 1, 53, D - 2, 1, '#9aa6ae'); R(x, dx, 0, 2, 54, '#4e585e');
        for (let k = 0; k < 3; k++) if (hash(s + k) < 0.7) R(x, dx + 5 + k * 9 + hash(s + k * 3) * 3, 36 + hash(s + k * 5) * 10, 6, 8, k === 2 ? 'rgba(245,225,120,.85)' : 'rgba(238,236,228,.9)');
      }
      // the desk, a drawer pedestal, the monitor and its light
      R(x, dx + 3, 0, D - 6, 20, '#5d666c'); R(x, dx + 3, 20, D - 6, 3, '#c1c6c8'); R(x, dx + 3, 19, D - 6, 1, 'rgba(0,0,0,.3)');
      R(x, dx + 5, 0, 13, 19, '#7a838a'); for (let k = 5; k < 18; k += 6) R(x, dx + 10, k, 4, 1, '#3a4045');
      R(x, cx - 1, 23, 3, 4, '#25292c'); R(x, cx - 12, 27, 24, 16, '#1b1f22');
      let screen = 'rgba(150,175,190,.55)';
      if (hours === 'open') screen = 'rgba(190,215,228,.75)'; else if (hours === 'cut') screen = '#07090a'; else if (hours === 'alarm') screen = Math.floor(t / 20) % 2 ? rgba(RED, 0.75) : 'rgba(60,10,16,.8)'; else screen = 'rgba(70,82,92,.55)';
      R(x, cx - 11, 28, 22, 14, screen);
      if (hours === 'open') { for (let r = 0; r < 4; r++) R(x, cx - 9, 39 - r * 3, 6 + hash(s + r) * 12, 1, 'rgba(40,60,80,.6)'); o.light?.(cx, 35, 22, 14, '200,225,238', 'screen'); }
      else if (hours === 'alarm') { T(x, 'LOCKED', cx, 35, 'rgba(255,230,230,.95)', 5, '700'); o.light?.(cx, 35, 22, 14, RED, 'screen'); }
      else if (hours !== 'cut') seal(x, cx, 35, 4, 'rgba(200,215,225,.45)');
      if (tell === i + 1) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, cx - 12, 43, 24, 1, rgba(CYAN, k)); R(x, cx - 12, 27, 1, 16, rgba(CYAN, k * 0.8)); R(x, cx + 11, 27, 1, 16, rgba(CYAN, k * 0.8)); }
      R(x, cx - 9, 23, 18, 1, '#30363a'); if (hash(s + 9) < 0.6) { R(x, dx + D - 10, 23, 4, 4, hash(s + 2) < 0.5 ? '#c8c2b0' : '#8a3a3a'); }
      // the chair: tucked in, or pulled out where someone works
      const chx = pulled.has(i + 1) ? dx + D * 0.32 : dx + D * 0.5;
      R(x, chx - 1, 2, 2, 10, '#2a2f33'); R(x, chx - 6, 0, 12, 2, '#1f2326'); R(x, chx - 6, 12, 12, 3, '#3a3f44'); R(x, chx + 5, 14, 3, 14, '#3a3f44');
    }
    after(x, hours, 0, 0, n * D, 56, t, 0.5);
  },
});

export const recordsElement = piece({
  type: 'civic.records', label: 'Records stacks: mobile shelving, archive boxes (civic kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    units: num('Shelving units', 5, 1, 30), unit: num('Unit width', 30, 16, 80, 1, 'units'), height: num('Height', 64, 30, 200, 1, 'units'),
    fill: num('Boxes on the shelves', 0.85, 0, 1, 0.05), aisle: num('Open aisle before unit (0: none)', 3, 0, 30), labels: bool('Box labels', true),
    hours: hoursField(), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.units) * Number(p.unit) + (Number(p.aisle) > 0 ? 22 : 0), tall: Number(p.height) }),
  bounds: p => box(Number(p.units) * Number(p.unit) + (Number(p.aisle) > 0 ? 22 : 0), Number(p.height)),
  anchors: () => origin(),
  paint(x, p, o) {
    const n = Number(p.units), U = Number(p.unit), H = Number(p.height), seed = Number(p.seed), aisle = Number(p.aisle), fill = Number(p.fill);
    const W = n * U + (aisle > 0 ? 22 : 0);
    R(x, 0, 0, W, 1, '#3a3f43'); R(x, 0, -2, W, 1, '#2a2e31');
    let ux = 0;
    for (let i = 0; i < n; i++) {
      if (aisle > 0 && i + 1 === aisle) {
        // the open aisle: the end panel's wheel, the next row's boxes in shadow
        R(x, ux, 0, 22, H, '#2b3033'); for (let h = 12; h < H - 4; h += 13) R(x, ux + 2, h, 18, 1, 'rgba(160,165,160,.18)');
        ux += 22;
      }
      R(x, ux, 0, U, H, '#59626a'); R(x, ux, 0, 1, H, 'rgba(255,255,255,.2)'); R(x, ux + U - 1, 0, 1, H, 'rgba(0,0,0,.35)');
      for (let h = 4, row = 0; h + 10 < H; h += 13, row++) {
        R(x, ux + 1, h - 1, U - 2, 1, '#9aa2a6');
        for (let bx = ux + 2; bx < ux + U - 4;) {
          const s = seed * 97 + i * 31 + row * 7 + bx, bw = 5 + Math.floor(hash(s) * 4);
          if (bx + bw > ux + U - 2) break;
          if (hash(s + 1) < fill) {
            const tone = hash(s + 2), col = tone < 0.5 ? '#b5aa90' : tone < 0.8 ? '#9da19d' : '#7f8f9c';
            R(x, bx, h, bw, 10 - (hash(s + 3) < 0.2 ? 2 : 0), col); R(x, bx, h, 1, 10, 'rgba(0,0,0,.18)');
            if (p.labels !== false) { R(x, bx + 1, h + 5, bw - 2, 2, 'rgba(245,242,232,.9)'); R(x, bx + 1, h + 5, 1 + Math.floor(hash(s + 4) * (bw - 2)), 1, 'rgba(40,40,40,.5)'); }
          }
          bx += bw + 1;
        }
      }
      // the crank wheel on the end of each unit
      x.save(); x.strokeStyle = '#2e3438'; x.lineWidth = 1; x.beginPath(); x.arc(ux + U / 2 + 0.5, y(H * 0.45) + 0.5, 4, 0, Math.PI * 2); x.stroke(); x.restore();
      R(x, ux + 1, 0, U - 2, 3, '#3a4045');
      ux += U;
    }
    after(x, p.hours, 0, 0, W, H, o.t, 0.5);
  },
});

const NODE_STATES = ['idle', 'verifying', 'tripped', 'backup'] as const;
export const nodeElement = piece({
  type: 'civic.node', label: 'Local verification node: server cabinets and the red watchdog (civic kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    cabinets: num('Cabinets', 4, 1, 16), height: num('Height', 66, 40, 140, 1, 'units'), state: select('State', NODE_STATES, 'idle'),
    label: text('Plate (gold on black; empty: none)', 'LOCAL VERIFICATION NODE · DT-07'), tell: bool('Service port (cyan tell)', true),
    cables: num('Cables up to the ceiling', 26, 0, 300, 1, 'units'), watchdog: bool('Watchdog eye on top', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.cabinets) * 24, tall: Number(p.height) + Math.max(30, Number(p.cables)) }),
  bounds: p => box(Number(p.cabinets) * 24, Number(p.height) + Math.max(30, Number(p.cables))),
  anchors: p => ({ ...origin(), eye: { x: Math.floor(Number(p.cabinets) / 2) * 24 + 11, h: Number(p.height) + 8, role: 'mount' }, port: { x: 11, h: 30, role: 'mount' } }),
  paint(x, p, o) {
    const n = Number(p.cabinets), H = Number(p.height), state = String(p.state), t = o.t, seed = Number(p.seed), mid = Math.floor(n / 2);
    const cab = Number(p.cables);
    if (cab > 0) for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) R(x, i * 24 + 6 + k * 5, H, 2, cab, k === 1 && i % 2 ? 'rgba(220,180,40,.8)' : '#0a0c0d');
    for (let i = 0; i < n; i++) {
      const cx = i * 24;
      R(x, cx, 0, 22, H, '#111518'); R(x, cx, 0, 1, H, 'rgba(200,220,235,.25)'); R(x, cx, H - 3, 22, 3, '#1c2226'); R(x, cx + 21, 0, 1, H, 'rgba(0,0,0,.6)');
      for (let h = 6; h < H - 6; h += 3) for (let k = cx + 3; k < cx + 12; k += 3) R(x, k, h, 1, 1, 'rgba(255,255,255,.06)');
      // a column of status lights
      for (let r = 0; r < Math.floor((H - 14) / 4); r++) {
        const s = seed * 13 + i * 71 + r, ph = (t * (0.4 + hash(s) * 0.8) + hash(s + 1) * 400) % 100;
        let col = '';
        if (state === 'backup') col = r % 4 === 0 ? rgba(RED, 0.4 + 0.5 * pulse(t, 0.04, r)) : 'rgba(40,10,14,.6)';
        else if (state === 'tripped') col = Math.floor(t / 8 + r) % 2 ? rgba(RED, 0.95) : rgba(RED, 0.35);
        else if (state === 'verifying') col = Math.floor(t / 3) % Math.floor((H - 14) / 4) === r ? 'rgba(240,248,255,1)' : ph < 50 ? 'rgba(160,200,255,.7)' : 'rgba(160,200,255,.2)';
        else col = ph < 20 ? rgba(GO, 0.95) : hash(s + 2) < 0.7 ? rgba(GO, 0.45) : 'rgba(255,190,80,.5)';
        R(x, cx + 15, 8 + r * 4, 3, 1, col);
      }
      R(x, cx + 3, 3, 16, 2, '#1a2024');
    }
    // the node's own face on the middle cabinet: a small screen
    const sx = mid * 24 + 2;
    R(x, sx, 24, 12, 9, '#05080a');
    if (state === 'backup') { R(x, sx + 1, 25, 10, 7, 'rgba(120,14,24,.95)'); R(x, sx + 2, 28, 8, 1, 'rgba(255,170,170,.9)'); }
    else if (state === 'tripped') { R(x, sx + 1, 25, 10, 7, Math.floor(t / 10) % 2 ? rgba(RED, 0.9) : 'rgba(80,10,16,.9)'); }
    else if (state === 'verifying') { R(x, sx + 1, 25, 10, 7, 'rgba(30,60,90,.9)'); R(x, sx + 1, 27, Math.round(((t * 0.3) % 100) / 10), 2, 'rgba(220,240,255,.95)'); }
    else { R(x, sx + 1, 25, 10, 7, 'rgba(20,50,30,.9)'); R(x, sx + 3, 28, 6, 1, rgba(GO, 0.9)); }
    o.light?.(sx + 6, 28, 10, 8, state === 'tripped' || state === 'backup' ? RED : state === 'verifying' ? '200,225,255' : GO, 'screen');
    if (p.tell !== false && state !== 'tripped') { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, 4, 28, 10, 4, '#06090a'); R(x, 5, 29, 8, 2, rgba(CYAN, 0.35 + 0.6 * k)); }
    if (p.watchdog !== false) {
      // the watchdog: a red eye on a short mast, slow when calm, fast and bright when tripped
      const ex = mid * 24 + 11, eh = H + 8, fast = state === 'tripped', k = fast ? pulse(t, 0.6) : pulse(t, 0.03), backup = state === 'backup';
      R(x, ex - 1, H, 2, 3, '#2a3035'); x.fillStyle = '#0b0d0f'; x.beginPath(); x.arc(ex, y(eh), 6, 0, Math.PI * 2); x.fill();
      x.strokeStyle = rgba(RED, 0.55 + 0.45 * k); x.lineWidth = 2; x.beginPath(); x.arc(ex, y(eh), 4, 0, Math.PI * 2); x.stroke();
      const a = t * (fast ? 0.2 : 0.02); R(x, ex + Math.cos(a) * 1.5 - 1, eh + Math.sin(a) * 1.5 - 1, 2, 2, rgba(RED, 1));
      o.glow?.(ex, eh, { kind: 'neon', col: RED, r: fast ? 90 : backup ? 110 : 26, a: fast ? 0.5 + 0.5 * k : backup ? 0.6 + 0.3 * k : 0.35 });
      if (backup) { const g = x.createRadialGradient(n * 12, y(H * 0.6), 4, n * 12, y(H * 0.6), n * 16); g.addColorStop(0, rgba(RED, 0.16 + 0.06 * k)); g.addColorStop(1, rgba(RED, 0)); x.fillStyle = g; x.fillRect(-n * 6, y(H + 20), n * 36, H + 30); }
    }
    const label = String(p.label ?? ''); if (label) goldPlate(x, label, n * 12 - 1, H - 12);
  },
});

export const alarmElement = piece({
  type: 'civic.alarm', label: 'Alarm: beacon, keypad panel or bell box (civic kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['beacon', 'panel', 'bell'], 'beacon'), state: select('State', ['off', 'armed', 'tripped'], 'armed'),
    reach: num('Light reach', 1, 0, 3, 0.05), phase: num('Phase', 0, 0, 1000),
  },
  size: () => ({ w: 24, tall: 30 }), reach: p => 90 * Number(p.reach),
  bounds: p => p.kind === 'panel' ? box(20, 26) : { x: -10, h: 20, w: 20, tall: 22 },
  anchors: () => origin(),
  paint(x, p, o) {
    const state = String(p.state), t = o.t + Number(p.phase), on = state === 'tripped', kind = String(p.kind);
    if (kind === 'panel') {
      R(x, 0, 0, 20, 26, '#d4d8d9'); R(x, 0, 0, 1, 26, 'rgba(255,255,255,.6)'); R(x, 19, 0, 1, 26, 'rgba(0,0,0,.25)');
      R(x, 3, 16, 14, 7, '#14301e'); T(x, on ? 'ALARM' : state === 'armed' ? 'SET' : 'OFF', 10, 19.5, on ? (Math.floor(t / 8) % 2 ? 'rgba(255,90,100,1)' : 'rgba(120,20,30,1)') : rgba(GO, 0.9), 5, '700');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R(x, 4 + c * 5, 3 + r * 4, 3, 2, '#9aa2a6');
      R(x, 16, 3, 2, 2, on ? rgba(RED, Math.floor(t / 8) % 2) : state === 'armed' ? rgba(RED, 0.8) : rgba(GO, 0.8));
      if (on) o.glow?.(10, 18, { kind: 'neon', col: RED, r: 24, a: 0.5 });
      return;
    }
    if (kind === 'bell') {
      x.fillStyle = '#7a1d24'; x.fillRect(-9, y(18), 18, 18); x.fillStyle = '#b8262f'; x.fillRect(-8, y(17), 16, 16);
      T(x, 'ALARM', 0, 7, 'rgba(250,240,235,.9)', 5, '700');
      R(x, -4, 18, 8, 3, on && Math.floor(t / 5) % 2 ? 'rgba(255,240,220,1)' : 'rgba(200,190,170,.5)');
      if (on) o.glow?.(0, 20, { kind: 'neon', col: '255,220,200', r: 50 * Number(p.reach), a: Math.floor(t / 5) % 2 ? 0.8 : 0.1 });
      return;
    }
    // the beacon: a base on the wall, a red dome with a turning reflector
    R(x, -5, 0, 10, 3, '#2a2e31'); R(x, -4, 3, 8, 7, on ? '#ff2a44' : '#5a1820'); R(x, -3, 9, 6, 1, 'rgba(255,255,255,.3)');
    if (!on) { if (state === 'armed' && Math.floor(t / 90) % 2) R(x, -1, 5, 2, 2, 'rgba(255,120,130,.9)'); return; }
    const a = t * 0.12, c = Math.cos(a), L = 70 * Number(p.reach);
    R(x, Math.round(c * 3) - 1, 4, 2, 5, 'rgba(255,240,240,1)');
    // two beams swinging round
    for (const side of [1, -1]) {
      const k = Math.max(0, side * c), len = L * (0.2 + 0.8 * Math.abs(Math.sin(a)));
      if (k <= 0.05) continue;
      x.fillStyle = rgba(RED, 0.18 * k); x.beginPath(); x.moveTo(0, y(6)); x.lineTo(side * len, y(6 + 14)); x.lineTo(side * len, y(6 - 14)); x.closePath(); x.fill();
    }
    o.glow?.(0, 6, { kind: 'neon', col: RED, r: L * 1.3, a: 0.45 + 0.4 * Math.abs(c) });
  },
});

// ---------------------------------------------------------------- the front

export const registryFrontElement = piece({
  type: 'civic.registry-front', label: 'Registry service point front (civic kit: grey-white panels, glazing, the seal)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 720, 160, 4000, 1, 'units'), ground: num('Ground floor height', 96, 70, 200, 1, 'units'), floors: num('Floors above', 2, 0, 20),
    storey: num('Floor height', 80, 60, 160, 1, 'units'), wall: colour('Panels', 'Registry grey'), door: num('Entrance from the left', 40, 0, 4000, 1, 'units'),
    doorWidth: num('Entrance width', 40, 26, 120, 1, 'units'), staffDoor: num('Staff door from the left (-1: none)', 650, -1, 4000, 1, 'units'),
    name: text('Name on the fascia', 'REGISTRY SERVICE POINT'), branch: text('Branch', 'DOWNTOWN 07'), hours: text('Opening hours (lines split by /)', 'MON–SAT/08:00–16:00/BY NUMBER ONLY'),
    contractor: text('Contractor plate (gold on black)', 'PLAZA HOLDINGS · UNDER CONTRACT'), closed: bool('After hours (shutters down)', false),
    lit: num('Office windows lit', 0.6, 0, 1, 0.05), queue: num('Heads seen through the glass', 0.6, 0, 1, 0.05), cameras: num('Cameras on brackets', 3, 0, 12),
    watchdog: bool('Watchdog eye over the entrance', true), entrance: select('Entrance', ['bay', 'flush'], 'bay'),
    relief: num('Seal relief over the entrance (radius; 0: none)', 26, 0, 80, 1, 'units'), plaque: text('Bronze plaque by the doors (empty: none)', 'REGISTRY OF PERSONS'),
    recess: num('Recessed granite bay from the left (-1: none)', -1, -1, 4000, 1, 'units'), recessWidth: num('Granite bay width', 160, 40, 2000, 1, 'units'),
    tower: num('Stair tower from the left (-1: none)', -1, -1, 4000, 1, 'units'), power: select('Power (cut: street lights and signs off)', ['on', 'cut'], 'on'),
    seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.ground) + Number(p.floors) * Number(p.storey) + 40 }),
  bounds: p => { const tall = Number(p.ground) + Number(p.floors) * Number(p.storey) + 40; return { x: -8, h: tall, w: Number(p.width) + 16, tall: tall + 2 }; },
  anchors: p => {
    const G = Number(p.ground), S = Number(p.storey), F = Number(p.floors);
    return { ...origin(), door: { x: Number(p.door) + Number(p.doorWidth) / 2, h: 0, role: 'entrance' }, roof: { x: Number(p.width) / 2, h: G + F * S, role: 'surface' },
      ...(Number(p.staffDoor) >= 0 ? { staff: { x: Number(p.staffDoor) + 13, h: 0, role: 'entrance' as const } } : {}),
      ...Object.fromEntries(Array.from({ length: F }, (_, i) => ['storey' + (i + 1), { x: 0, h: G + i * S, role: 'mount' as const }])) };
  },
  paint(x, p, o) {
    const W = Number(p.width), G = Number(p.ground), F = Number(p.floors), S = Number(p.storey), top = G + F * S, seed = Number(p.seed), t = o.t, closed = p.closed === true;
    // the panels as the street sees them: pale by day, a cool grey under the sodium lamps at night
    const day = Math.max(0, Math.min(1, o.lighting.daylight)), wall = mixHex('#4f575c', hexOr(p.wall, '#8f979c'), day);
    const door = Number(p.door), dw = Number(p.doorWidth), staff = Number(p.staffDoor), cut = p.power === 'cut', bay = p.entrance !== 'flush';
    const tw = 46, tx = Number(p.tower), rx = Number(p.recess), rw = Number(p.recessWidth);
    R(x, 0, 0, W, top, wall);
    // panels: a grid of joints, every other panel a shade lighter, rain streaks under the sills
    for (let k = 0; k < W; k += 40) for (let h = G; h < top; h += S / 2) if (hash(seed + k * 0.1 + h) < 0.5) R(x, k, h, 40, S / 2, 'rgba(255,255,255,.035)');
    for (let k = 40; k < W; k += 40) R(x, k, G, 1, top - G, 'rgba(0,0,0,.2)');
    for (let f = 0; f <= F; f++) R(x, 0, G + f * S, W, 2, 'rgba(0,0,0,.25)');
    // the office floors: a ribbon of windows with vertical blinds
    for (let f = 0; f < F; f++) {
      const fh = G + f * S, sill = fh + Math.round(S * 0.3), wh = Math.round(S * 0.48);
      R(x, 10, sill - 2, W - 20, 2, '#c3c8cb'); R(x, 10, sill + wh, W - 20, 2, '#6c7479');
      for (let k = 12, i = 0; k < W - 14; k += 30, i++) {
        const s = seed * 101 + f * 37 + i, on = !closed && !cut && hash(s) < Number(p.lit) && windowLit(s, o.lighting);
        R(x, k, sill, 28, wh, on ? 'rgba(214,232,226,.78)' : '#1a2024');
        for (let b = k + 2; b < k + 27; b += 3) R(x, b, sill + (hash(s + 1) < 0.3 ? wh * 0.4 : 0), 1, wh - (hash(s + 1) < 0.3 ? wh * 0.4 : 0), on ? 'rgba(120,135,140,.45)' : 'rgba(80,90,96,.4)');
        R(x, k, sill, 1, wh, '#c3c8cb'); R(x, k + 27, sill, 1, wh, '#c3c8cb');
        if (on) o.light?.(k + 14, sill + wh / 2, 26, wh, TUBE, 'window');
        R(x, k + 2, sill - 6 - hash(s + 2) * 14, 1, 6 + hash(s + 2) * 14, 'rgba(0,0,0,.08)');
      }
    }
    // a recessed bay in dark granite: vertical fins, the windows deep in shadow
    if (rx >= 0) {
      const gr = mixHex('#24282b', '#5d6266', day);
      R(x, rx, G, rw, top - G + 4, gr); R(x, rx, G, 3, top - G + 4, 'rgba(0,0,0,.45)'); R(x, rx + rw - 3, G, 3, top - G + 4, 'rgba(255,255,255,.08)');
      for (let k = rx + 14; k < rx + rw - 8; k += 22) { R(x, k, G + 4, 4, top - G - 4, mixHex('#33383b', '#7a8085', day)); R(x, k, G + 4, 1, top - G - 4, 'rgba(255,255,255,.12)'); }
      for (let f = 0; f < F; f++) for (let k = rx + 18; k < rx + rw - 22; k += 22) {
        const s = seed * 7 + f * 13 + k, on = !closed && !cut && hash(s) < Number(p.lit) * 0.6 && windowLit(s, o.lighting), fh = G + f * S + 10;
        R(x, k + 2, fh, 16, S - 22, on ? 'rgba(200,220,214,.55)' : '#121518'); if (on) o.light?.(k + 10, fh + (S - 22) / 2, 16, S - 22, TUBE, 'window');
      }
    }
    // the entrance bay: a pale stone frame up two storeys, the Registry's seal in relief over the canopy
    const bx0 = door - 26, bx1 = door + dw + 26, rr = Number(p.relief);
    if (bay) {
      const stone = mixHex('#5d6468', '#b9bfc2', day), shade = 'rgba(0,0,0,.28)';
      R(x, bx0, 0, bx1 - bx0, Math.min(top, G + S + 20), stone); R(x, bx0, 0, 2, Math.min(top, G + S + 20), 'rgba(255,255,255,.18)'); R(x, bx1 - 3, 0, 3, Math.min(top, G + S + 20), shade);
      R(x, bx0 - 4, Math.min(top, G + S + 20), bx1 - bx0 + 8, 5, mixHex('#4a5155', '#a3aaae', day)); R(x, bx0 - 4, Math.min(top, G + S + 25), bx1 - bx0 + 8, 1, 'rgba(255,255,255,.25)');
      for (let h = 12; h < G + S + 18; h += 12) R(x, bx0 + 2, h, bx1 - bx0 - 5, 1, 'rgba(0,0,0,.08)');
      if (rr > 0) {
        // the seal cut into the stone: a deep ring, the ticks, the Spire as a blade; lit from below at night
        const cx = (bx0 + bx1) / 2, ch = G + rr + 14, ink = cut ? 'rgba(30,34,38,.8)' : mixHex('#2c3236', '#5c6468', day);
        x.save(); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(cx + 1, y(ch) + 1, rr + 2, 0, Math.PI * 2); x.fill(); x.restore();
        seal(x, cx, ch, rr, ink); seal(x, cx, ch, rr - 4, ink);
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; R(x, cx + Math.cos(a) * (rr - 2) - 1, ch + Math.sin(a) * (rr - 2) - 1, 2, 2, ink); }
        if (!cut && day < 0.5) { const g = x.createLinearGradient(0, y(G), 0, y(ch + rr)); g.addColorStop(0, rgba(TUBE, 0.22 * (1 - day))); g.addColorStop(1, rgba(TUBE, 0)); x.fillStyle = g; x.fillRect(cx - rr - 6, y(ch + rr), rr * 2 + 12, ch + rr - G); }
      }
    }
    // a slim stair tower, proud of the front: a glazed slot up its height, a plaque at the top
    if (tx >= 0) {
      const tc = mixHex('#40474b', '#a0a7ab', day);
      R(x, tx, 0, tw, top + 28, tc); R(x, tx, 0, 2, top + 28, 'rgba(255,255,255,.18)'); R(x, tx + tw - 3, 0, 3, top + 28, 'rgba(0,0,0,.3)'); R(x, tx - 2, top + 28, tw + 4, 4, mixHex('#34393c', '#7d8488', day));
      const sl = !closed && !cut;
      R(x, tx + tw / 2 - 5, G - 10, 10, top - G + 8, sl ? 'rgba(200,222,216,.6)' : '#101316');
      for (let h = G - 6; h < top; h += S / 2) R(x, tx + tw / 2 - 5, h, 10, 1, 'rgba(0,0,0,.4)');
      if (sl) o.light?.(tx + tw / 2, (G + top) / 2, 10, top - G, TUBE, 'window');
      R(x, tx + 6, top + 8, tw - 12, 12, cut ? '#2a2e31' : '#e4e8e9'); T(x, 'R', tx + tw / 2, top + 14, cut ? 'rgba(80,86,90,.9)' : 'rgba(46,52,58,.95)', 9, '700');
      if (!cut) o.light?.(tx + tw / 2, top + 14, tw - 12, 12, TUBE, 'window');
    }
    // the ground floor: plinth, curtain wall, frosted band with the seal, the entrance
    R(x, 0, 0, W, 6, '#4b5156'); R(x, 0, 6, W, 1, 'rgba(255,255,255,.2)');
    const gTop = G - 24;
    const skip = (k: number) => (k + 48 > Math.min(door - 4, bay ? bx0 : door) && k < door + dw + 210) || (staff >= 0 && k + 48 > staff - 4 && k < staff + 34) || (tx >= 0 && k + 48 > tx && k < tx + tw);
    for (let k = 10; k < W - 10; k += 48) {
      if (skip(k)) continue;
      const pw = Math.min(48, W - 10 - k);
      if (closed || cut) {
        R(x, k, 6, pw, gTop - 6, closed ? '#565d62' : '#0c1013');
        if (closed) { for (let h = 8; h < gTop; h += 3) R(x, k, h, pw, 1, 'rgba(0,0,0,.18)'); R(x, k, gTop - 4, pw, 4, '#3d4448'); }
        else { R(x, k + 4, 10, 2, gTop - 18, 'rgba(255,255,255,.06)'); seal(x, k + pw / 2, 24, 9, 'rgba(70,78,84,.35)'); }
      } else {
        R(x, k, 6, pw, gTop - 6, 'rgba(200,220,222,.62)');
        const g = x.createLinearGradient(0, y(gTop), 0, y(30)); g.addColorStop(0, 'rgba(240,252,248,.35)'); g.addColorStop(1, 'rgba(240,252,248,0)'); x.fillStyle = g; x.fillRect(k, y(gTop), pw, gTop - 30);
        // the queue inside, seen as heads and shoulders over the frosting
        for (let q = 0; q < 2; q++) if (hash(seed * 7 + k + q) < Number(p.queue)) { const hx = k + 10 + q * 22 + hash(k + q) * 6, hh = 42 + Math.round(hash(k * 3 + q) * 5); R(x, hx - 5, 42, 11, hh - 40, 'rgba(60,70,78,.32)'); R(x, hx - 2, hh, 5, 6, 'rgba(60,70,78,.38)'); }
        R(x, k, 6, pw, 36, '#d3dadc'); R(x, k, 42, pw, 1, 'rgba(255,255,255,.7)');
        if (Math.floor(k / 48) % 3 === 1) seal(x, k + pw / 2, 24, 9, 'rgba(90,100,108,.7)');
        o.light?.(k + pw / 2, gTop - 14, pw, 24, TUBE, 'window');
      }
      R(x, k, 6, 2, gTop - 6, '#c8cdd0');
    }
    // the entrance: sliding glass doors, an ID scanner pillar, the hours, the contractor's plate
    R(x, door - 3, 0, dw + 6, gTop + 2, '#c8cdd0');
    if (closed) { R(x, door, 0, dw, gTop, '#4e555a'); for (let h = 2; h < gTop; h += 3) R(x, door, h, dw, 1, 'rgba(0,0,0,.2)'); }
    else if (cut) R(x, door, 0, dw, gTop, '#0c1013');
    else {
      R(x, door, 0, dw, gTop, 'rgba(210,228,228,.7)'); const lw = dw / 2 - 4;
      R(x, door, 0, lw, gTop, 'rgba(160,190,195,.35)'); R(x, door + dw - lw, 0, lw, gTop, 'rgba(160,190,195,.35)'); R(x, door + lw, 0, 1, gTop, '#8f979c'); R(x, door + dw - lw - 1, 0, 1, gTop, '#8f979c');
      o.light?.(door + dw / 2, gTop / 2, dw, gTop, TUBE, 'window');
    }
    R(x, door + dw / 2 - 6, gTop - 4, 12, 3, '#1a1d20'); R(x, door + dw / 2 - 1, gTop - 3, 2, 1, cut ? '#2a1a1c' : closed ? rgba(RED, 0.9) : rgba(GO, 0.9));
    R(x, door + dw + 8, 0, 6, 40, '#5f686e'); R(x, door + dw + 8, 30, 6, 8, '#101416'); R(x, door + dw + 9, 31, 4, 6, closed || cut ? 'rgba(40,50,56,.8)' : 'rgba(200,225,235,.85)');
    const plq = String(p.plaque ?? '');
    if (bay && plq) { const pw = Math.min(bx1 - bx0 - 6, textW(x, plq, 5) + 6); R(x, (bx0 + bx1) / 2 - pw / 2, gTop + 30, pw, 9, '#6a5230'); R(x, (bx0 + bx1) / 2 - pw / 2, gTop + 38, pw, 1, 'rgba(255,220,160,.4)'); T(x, plq, (bx0 + bx1) / 2, gTop + 34.5, 'rgba(240,215,160,.9)', 5, '700'); }
    const hours = String(p.hours ?? '').split('/').filter(Boolean);
    const hx = door + dw + (bay ? 34 : 22);
    if (hours.length) { const ph = hours.length * 8 + 6; R(x, hx, 34, 66, ph, '#e8ebec'); R(x, hx, 34 + ph - 1, 66, 1, '#8b949a'); R(x, hx, 34, 66, 1, 'rgba(0,0,0,.3)'); hours.forEach((l, i) => T(x, l, hx + 33, 34 + ph - 7 - i * 8, 'rgba(40,46,52,.95)', 6, '600')); }
    const con = String(p.contractor ?? ''); if (con) { const cw = textW(x, con, 6) + 8; goldPlate(x, con, hx + 76 + cw / 2, 40, 6); }
    if (staff >= 0) {
      R(x, staff - 3, 0, 32, 58, '#5a6369'); R(x, staff, 0, 26, 54, '#7c858c'); R(x, staff, 0, 1, 54, 'rgba(255,255,255,.25)'); R(x, staff + 20, 26, 4, 2, '#c8ccd0');
      R(x, staff + 30, 28, 5, 8, '#202427'); R(x, staff + 31, 33, 3, 1, rgba(RED, 0.9)); plate(x, 'STAFF', staff + 13, 62, { fill: '#e6e9ea', size: 6, pad: 3 });
    }
    // the canopy and its fascia with the name, the seal and the branch
    R(x, -6, gTop, W + 12, 4, '#2c3236'); for (let k = 20; k < W; k += 60) { R(x, k, gTop - 1, 6, 1, cut ? 'rgba(90,96,100,.9)' : 'rgba(240,250,245,.9)'); if (!cut && (!closed || hash(k) < 0.4)) o.glow?.(k + 3, gTop - 2, { kind: 'lamp', col: TUBE, r: 38, a: 0.5 }); }
    if (bay) {
      // the bay's canopy stands out further and lower over the doors, lit underneath
      R(x, bx0 - 10, gTop - 4, bx1 - bx0 + 20, 5, '#1f2427'); R(x, bx0 - 10, gTop + 1, bx1 - bx0 + 20, 1, 'rgba(255,255,255,.25)');
      for (const k of [bx0 + 6, (bx0 + bx1) / 2 - 3, bx1 - 12]) { R(x, k, gTop - 5, 6, 1, cut ? 'rgba(90,96,100,.9)' : 'rgba(250,252,250,1)'); if (!cut) o.glow?.(k + 3, gTop - 6, { kind: 'lamp', col: TUBE, r: 46, a: 0.7 }); }
    }
    R(x, 0, gTop + 4, W, 20, cut ? '#3a3f43' : closed ? mixHex('#7d8488', '#d6dadb', day) : '#e2e6e7'); R(x, 0, gTop + 4, W, 1, 'rgba(0,0,0,.25)'); R(x, 0, gTop + 23, W, 1, 'rgba(255,255,255,.6)');
    const name = String(p.name ?? ''), nw = textW(x, name, 10, '700');
    seal(x, W / 2 - nw / 2 - 16, gTop + 14, 7, 'rgba(60,68,76,.9)');
    T(x, name, W / 2, gTop + 14, cut ? 'rgba(20,24,28,.8)' : 'rgba(46,52,58,.95)', 10, '700');
    const branch = String(p.branch ?? ''); if (branch) T(x, branch, W - 12, gTop + 14, 'rgba(90,98,106,.95)', 7, '600', 'right');
    if (!cut) o.light?.(W / 2, gTop + 14, nw + 30, 16, TUBE, 'window');
    // the watchdog over the entrance: a red ring that sweeps the street
    if (p.watchdog !== false) {
      const ex = door + dw / 2, eh = bay && rr > 0 ? G + 2 * rr + 24 : gTop + 34; R(x, ex - 1, eh - 10, 2, 4, '#2a3035');
      x.fillStyle = '#0b0d0f'; x.beginPath(); x.arc(ex, y(eh), 7, 0, Math.PI * 2); x.fill();
      x.strokeStyle = rgba(RED, 0.6 + 0.35 * pulse(t, 0.03)); x.lineWidth = 2; x.beginPath(); x.arc(ex, y(eh), 5, 0, Math.PI * 2); x.stroke();
      const a = Math.sin(t * 0.01) * 1.2; R(x, ex + Math.sin(a) * 2 - 1, eh - 1, 2, 2, rgba(RED, 1));
      o.glow?.(ex, eh, { kind: 'neon', col: RED, r: 30, a: 0.4 });
    }
    // cameras on brackets along the fascia
    const cams = Number(p.cameras);
    for (let i = 0; i < cams; i++) { const cx = 20 + ((W - 40) * i) / Math.max(1, cams - 1); R(x, cx - 1, gTop + 24, 2, 6, '#2a3035'); R(x, cx - 6, gTop + 30, 12, 5, '#1b1f22'); R(x, cx + (i % 2 ? -7 : 5), gTop + 31, 2, 3, '#0d0f10'); if ((t + i * 40) % 120 < 60) R(x, cx + (i % 2 ? 3 : -4), gTop + 33, 1, 1, rgba(RED, 1)); }
    // the roof: a parapet, plant, a mast with a red light
    R(x, 0, top, W, 6, '#6a7176'); R(x, 0, top + 6, W, 1, 'rgba(255,255,255,.25)');
    R(x, W * 0.2, top + 6, 30, 16, '#4e555a'); for (let k = 0; k < 28; k += 3) R(x, W * 0.2 + 1 + k, top + 8, 1, 12, 'rgba(0,0,0,.3)');
    R(x, W * 0.62, top + 6, 2, 32, '#3d4448'); R(x, W * 0.62 - 6, top + 30, 14, 1, '#3d4448'); R(x, W * 0.62 - 1, top + 38, 3, 2, cut ? 'rgba(60,20,24,1)' : rgba(RED, 0.5 + 0.5 * pulse(t, 0.05)));
  },
});

// ---------------------------------------------------------------- the substation

export const transformerElement = piece({
  type: 'civic.transformer', label: 'Transformer in its bund (civic kit: fins, bushings, conservator)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Tank width', 80, 30, 300, 1, 'units'), height: num('Tank height', 56, 24, 200, 1, 'units'), bushings: num('HV bushings', 3, 0, 6),
    fins: select('Cooling fins', ['both', 'left', 'right', 'none'], 'both'), conservator: bool('Conservator tank on top', true),
    label: text('Stencil on the tank', 'T2'), voltage: text('Danger plate (empty: none)', '11 000 V'), state: select('State', ['on', 'hum', 'fault', 'dead'], 'hum'),
    paint: colourField('Paint', '#66746a'), bund: bool('Concrete bund and gravel', true), power: select('Power (cut: dead, lamps out)', ['on', 'cut'], 'on'),
    gauge: bool('Lit oil-temperature gauge and warning lamp', true), tell: bool('Usable (cyan tell on its control box)', false), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width) + 40, tall: Number(p.height) + 46 }),
  bounds: p => ({ x: -20, h: Number(p.height) + 46, w: Number(p.width) + 40, tall: Number(p.height) + 48 }),
  anchors: p => ({ ...origin(), top: { x: Number(p.width) / 2, h: Number(p.height) + 34, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), t = o.t, seed = Number(p.seed), col = hexOr(p.paint, '#66746a'), cut = p.power === 'cut', state = cut ? 'dead' : String(p.state);
    if (p.bund !== false) { R(x, -18, 0, W + 36, 6, '#4b4d48'); R(x, -18, 6, W + 36, 1, 'rgba(255,255,255,.15)'); for (let i = 0; i < W / 3; i++) R(x, -14 + hash(seed + i) * (W + 28), 6 + hash(i + seed * 2) * 2, 2, 1, 'rgba(160,155,140,.4)'); }
    R(x, -2, 6, W + 4, 4, '#4f5650');
    const fin = String(p.fins);
    for (const side of ['left', 'right']) {
      if (fin !== 'both' && fin !== side) continue;
      const fx = side === 'left' ? -14 : W + 2;
      R(x, fx, 12, 12, H - 18, '#3c4540'); for (let k = 0; k < 12; k += 2) R(x, fx + k, 13, 1, H - 20, side === 'left' ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.08)');
      R(x, fx, 14, 12, 2, col); R(x, fx, H - 10, 12, 2, col);
    }
    R(x, 0, 10, W, H - 10, col); R(x, 0, 10, 1, H - 10, 'rgba(255,255,255,.2)'); R(x, W - 1, 10, 1, H - 10, 'rgba(0,0,0,.35)');
    for (let h = 22; h < H; h += 14) R(x, 0, h, W, 2, 'rgba(0,0,0,.15)');
    R(x, -2, H, W + 4, 3, '#4f5a52');
    const lbl = String(p.label ?? ''); if (lbl) T(x, lbl, W * 0.28, H * 0.55, 'rgba(235,235,225,.75)', 10, '700');
    const volt = String(p.voltage ?? '');
    if (volt) {
      const px = W * 0.66; R(x, px - 14, H * 0.32, 28, 22, '#e3c13c'); R(x, px - 14, H * 0.32, 28, 1, 'rgba(0,0,0,.3)');
      x.fillStyle = '#141414'; x.beginPath(); x.moveTo(px, y(H * 0.32 + 21)); x.lineTo(px - 5, y(H * 0.32 + 13)); x.lineTo(px + 5, y(H * 0.32 + 13)); x.closePath(); x.fill();
      R(x, px - 1, H * 0.32 + 14, 2, 4, '#e3c13c');
      T(x, 'DANGER', px, H * 0.32 + 9, 'rgba(20,20,20,.95)', 5, '700'); T(x, volt, px, H * 0.32 + 3.5, 'rgba(20,20,20,.95)', 5, '700');
    }
    if (p.conservator !== false) { const cx = W * 0.55, cw = W * 0.38; R(x, cx + 3, H + 3, 2, 14, '#3c4540'); R(x, cx + cw - 6, H + 3, 2, 14, '#3c4540'); R(x, cx, H + 17, cw, 10, col); R(x, cx, H + 26, cw, 1, 'rgba(255,255,255,.2)'); R(x, cx - 2, H + 18, 2, 8, '#4f5a52'); R(x, cx + cw, H + 18, 2, 8, '#4f5a52'); }
    const n = Number(p.bushings);
    for (let i = 0; i < n; i++) {
      const bx = (W * (i + 0.6)) / (n + 0.6);
      for (let k = 0; k < 7; k++) { const w = k % 2 ? 6 : 9; R(x, bx - w / 2, H + 3 + k * 4, w, 3, '#7a4a32'); R(x, bx - w / 2, H + 5 + k * 4, w, 1, 'rgba(255,200,170,.3)'); }
      R(x, bx - 2, H + 31, 4, 3, '#aab0b2');
      if (!cut) { R(x, bx - 1, H + 34, 2, 1, 'rgba(255,214,150,' + (0.5 + 0.4 * pulse(t, 0.07, i)).toFixed(2) + ')'); o.glow?.(bx, H + 33, { kind: 'neon', col: '255,200,140', r: 16, a: 0.35 }); }
      if (state === 'fault' && i === 1 && Math.floor(t / 3) % 7 < 2) { for (let k = 0; k < 6; k++) R(x, bx + (hash(t + k) - 0.5) * 14, H + 30 + hash(t * 2 + k) * 10, 1, 1, 'rgba(255,250,200,1)'); o.glow?.(bx, H + 32, { kind: 'neon', col: '255,220,150', r: 70, a: 0.9 }); }
    }
    if (state === 'hum' || state === 'fault') {
      // heat shimmer over the tank: faint wavering lines
      for (let k = 0; k < 4; k++) { const sx = W * (0.15 + k * 0.22), ph = t * 0.05 + k; for (let h = 0; h < 18; h += 2) R(x, sx + Math.sin(ph + h * 0.4) * 2, H + 4 + h, 1, 2, 'rgba(255,240,220,.09)'); }
    }
    if (p.gauge !== false) {
      // the oil-temperature dial behind its window, and the amber lamp on the lid
      const gx = W * 0.14, gh = H * 0.32 + 6;
      R(x, gx - 7, gh - 7, 14, 14, '#1d2220'); x.fillStyle = cut ? '#3c403c' : '#f0ead4'; x.beginPath(); x.arc(gx, y(gh), 5, 0, Math.PI * 2); x.fill();
      const a = cut ? 2.4 : -0.6 + Math.sin(t * 0.01 + seed) * 0.08; x.strokeStyle = '#b8262f'; x.lineWidth = 1; x.beginPath(); x.moveTo(gx, y(gh)); x.lineTo(gx + Math.cos(a) * 4, y(gh) + Math.sin(a) * 4); x.stroke();
      if (!cut) o.light?.(gx, gh, 10, 10, '240,230,200', 'screen');
      R(x, W * 0.08 - 2, H + 3, 5, 4, '#2a2a26'); R(x, W * 0.08 - 1, H + 4, 3, 2, cut ? 'rgba(70,50,20,1)' : rgba(AMBER, 0.55 + 0.45 * pulse(t, 0.05, seed)));
      if (!cut) o.glow?.(W * 0.08, H + 6, { kind: 'neon', col: AMBER, r: 30, a: 0.55 });
    }
    if (p.tell === true) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, W - 18, 14, 12, 16, '#2b302d'); R(x, W - 17, 15, 10, 14, cut ? '#1a1d1b' : '#3d4440'); R(x, W - 18, 30, 12, 1, rgba(CYAN, k)); R(x, W - 18, 14, 1, 16, rgba(CYAN, k * 0.8)); R(x, W - 7, 14, 1, 16, rgba(CYAN, k * 0.8)); }
    if (state === 'dead') R(x, -18, 0, W + 36, H + 40, 'rgba(0,0,0,.25)');
    else { R(x, W - 8, H - 8, 3, 3, '#0d0f0e'); R(x, W - 7, H - 7, 1, 1, state === 'fault' ? rgba(RED, Math.floor(t / 6) % 2) : rgba(GO, 0.9)); }
  },
});

export const busbarElement = piece({
  type: 'civic.busbar', label: 'Busbar gantry: lattice portal, insulator strings, lines (civic kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Span', 140, 40, 600, 1, 'units'), height: num('Height', 120, 50, 400, 1, 'units'), phases: num('Phases', 3, 1, 6),
    down: num('Droppers down to (0: none)', 90, 0, 400, 1, 'units'), out: select('Lines leave', ['both', 'left', 'right', 'none'], 'right'),
    outLength: num('Line length', 260, 0, 2000, 1, 'units'), outDrop: num('Lines fall by', 20, -200, 200, 1, 'units'), plate: text('Plate on the leg (empty: none)', 'DANGER · KEEP OFF'),
    power: select('Power (on: a faint corona on the insulators)', ['on', 'cut'], 'on'),
  },
  size: p => ({ w: Number(p.width) + 8, tall: Number(p.height) + 10 }), reach: p => Number(p.outLength),
  bounds: p => box(Number(p.width) + 8, Number(p.height) + 10),
  anchors: p => ({ ...origin(), beam: { x: Number(p.width) / 2, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), n = Number(p.phases), down = Number(p.down), L = Number(p.outLength), drop = Number(p.outDrop);
    const steel = '#8b949a', dark = '#5b6267';
    const leg = (lx: number) => { R(x, lx, 0, 1, H, steel); R(x, lx + 7, 0, 1, H, steel); x.strokeStyle = dark; x.lineWidth = 1; x.beginPath(); for (let h = 0; h < H; h += 10) { x.moveTo(lx + 0.5, y(h)); x.lineTo(lx + 7.5, y(h + 10)); x.moveTo(lx + 7.5, y(h)); x.lineTo(lx + 0.5, y(h + 10)); } x.stroke(); R(x, lx - 3, 0, 14, 3, '#4b4d48'); };
    leg(0); leg(W);
    R(x, 0, H, W + 8, 1, steel); R(x, 0, H + 8, W + 8, 1, steel);
    x.strokeStyle = dark; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < W + 8; k += 8) { x.moveTo(k + 0.5, y(H)); x.lineTo(k + 4.5, y(H + 8)); x.lineTo(k + 8.5, y(H)); } x.stroke();
    for (let i = 0; i < n; i++) {
      const px = 8 + ((W - 8) * (i + 0.5)) / n, end = H - 16;
      for (let k = 0; k < 6; k++) R(x, px - (k % 2 ? 2 : 3), H - 2 - k * 2.4, k % 2 ? 4 : 6, 2, k % 2 ? '#c7c2b4' : '#9f9a8c');
      R(x, px - 1, end - 1, 2, 2, '#aab0b2');
      if (p.power !== 'cut') { R(x, px - 1, end - 1, 2, 1, 'rgba(190,210,255,' + (0.4 + 0.4 * pulse(o.t, 0.11, i * 2)).toFixed(2) + ')'); o.glow?.(px, end, { kind: 'neon', col: '170,200,255', r: 12, a: 0.3 }); }
      x.strokeStyle = 'rgba(30,32,34,.95)'; x.lineWidth = 1;
      if (down > 0) { x.beginPath(); x.moveTo(px + 0.5, y(end)); x.lineTo(px + 0.5 + (i - (n - 1) / 2) * 6, y(down)); x.stroke(); }
      const o2 = String(p.out);
      for (const side of [1, -1]) {
        if (L <= 0 || o2 === 'none' || (o2 === 'right' && side < 0) || (o2 === 'left' && side > 0)) continue;
        const sx = side > 0 ? W + 8 : 0, ex = sx + side * L;
        x.beginPath(); x.moveTo(px, y(end)); x.lineTo(sx, y(end - 2)); x.quadraticCurveTo((sx + ex) / 2, y(end - drop - 22), ex, y(end - drop)); x.stroke();
      }
    }
    const pl = String(p.plate ?? ''); if (pl) plate(x, pl, 4, 40, { fill: '#e3c13c', ink: 'rgba(20,20,20,.95)', size: 6, pad: 3 });
  },
});

export const controlHutElement = piece({
  type: 'civic.control-hut', label: 'Substation control hut (civic kit: block walls, steel door, louvres)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 150, 60, 800, 1, 'units'), height: num('Height', 80, 60, 200, 1, 'units'), wall: colourField('Block wall', '#6b685d'),
    door: num('Door from the left', 18, 0, 800, 1, 'units'), label: text('Plate over the door', 'SUBSTATION DT-4'), vents: num('Louvred vents', 2, 0, 10),
    window: num('Barred window from the left (-1: none)', 110, -1, 800, 1, 'units'), window2: num('Second window from the left (-1: none)', -1, -1, 800, 1, 'units'),
    lit: bool('Light on inside', true), power: select('Power (cut: battery lamp only)', ['on', 'cut'], 'on'),
    breaker: num('Main breaker cabinet from the hut’s left (negative: beside it; -999: none)', -999, -999, 800, 1, 'units'), breakerLabel: text('Breaker plate', 'MAIN BREAKER'),
    breakerTell: bool('Breaker usable (cyan tell)', true), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 8 }),
  bounds: p => { const b = Number(p.breaker), has = b > -999, l = Math.min(-4, has ? b - 30 : -4), r = Math.max(Number(p.width) + 4, has ? b + 34 : 0); return { x: l, h: Number(p.height) + 8, w: r - l, tall: Number(p.height) + 8 }; },
  anchors: p => ({ ...origin(), door: { x: Number(p.door) + 14, h: 0, role: 'entrance' } }),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), wall = hexOr(p.wall, '#6b685d'), d = Number(p.door), t = o.t, cut = p.power === 'cut', lit = p.lit !== false && !cut;
    R(x, 0, 0, W, H, wall);
    for (let h = 8, r = 0; h < H; h += 8, r++) { R(x, 0, h, W, 1, 'rgba(0,0,0,.14)'); for (let k = (r % 2) * 12; k < W; k += 24) R(x, k, h - 8, 1, 8, 'rgba(0,0,0,.1)'); }
    R(x, 0, 0, W, 6, '#4f4d45');
    for (let i = 0; i < W / 20; i++) R(x, hash(i + 3) * W, H - 4, 1, 4 + hash(i) * 30, 'rgba(0,0,0,.1)');
    R(x, -4, H, W + 8, 6, '#4b4942'); R(x, -4, H + 6, W + 8, 2, '#5d5a51');
    // the steel door, the danger sign on it, a bulkhead lamp over it
    R(x, d - 2, 0, 32, 58, '#3e4540'); R(x, d, 0, 28, 56, '#5f6d63'); R(x, d, 0, 1, 56, 'rgba(255,255,255,.2)'); R(x, d + 22, 26, 4, 2, '#c8ccd0');
    R(x, d + 7, 34, 14, 12, '#e3c13c'); x.fillStyle = '#141414'; x.beginPath(); x.moveTo(d + 14, y(44)); x.lineTo(d + 10, y(37)); x.lineTo(d + 18, y(37)); x.closePath(); x.fill();
    T(x, '!', d + 14, 39.5, '#e3c13c', 5, '700');
    R(x, d + 9, 61, 10, 4, '#2a2c2a'); R(x, d + 10, 60, 8, 1, lit ? 'rgba(255,230,180,1)' : 'rgba(120,110,90,1)');
    if (lit) o.glow?.(d + 14, 58, { kind: 'lamp', col: '255,220,160', r: 64, a: 0.85 });
    const label = String(p.label ?? ''); if (label) plate(x, label, d + 14, 70, { fill: '#e6e9ea', edge: '#8d969b' });
    for (let i = 0; i < Number(p.vents); i++) { const vx = d + 44 + i * 30; if (vx + 22 > W) break; R(x, vx, 30, 22, 14, '#2f332f'); for (let k = 0; k < 14; k += 3) R(x, vx + 1, 30 + k, 20, 1, '#6e746c'); }
    for (const wx of [Number(p.window), Number(p.window2)]) {
      if (wx < 0 || wx + 24 >= W) continue;
      R(x, wx - 2, 34, 28, 22, '#4f4d45'); R(x, wx, 36, 24, 18, lit ? 'rgba(236,244,214,.92)' : cut ? 'rgba(90,60,30,.55)' : '#121412');
      for (let k = 3; k < 24; k += 5) R(x, wx + k, 36, 1, 18, '#2a2c2a');
      if (lit) { o.light?.(wx + 12, 45, 24, 18, '236,244,214', 'window'); o.glow?.(wx + 12, 34, { kind: 'lamp', col: '236,244,214', r: 40, a: 0.5 }); }
      else if (cut) o.light?.(wx + 12, 45, 24, 18, '255,200,120', 'window');
    }
    R(x, W - 30, 0, 6, 10, '#141414'); R(x, W - 22, 0, 6, 10, '#141414'); R(x, W - 30, 10, 14, 2, '#2a2c2a');
    const b = Number(p.breaker);
    if (b > -999) {
      // the main breaker: an outdoor cabinet on a plinth, a big lever (up: on, down: off), its lamps, cable into the ground
      R(x, b - 2, 0, 30, 4, '#4b4942'); R(x, b, 4, 26, 44, '#5e6b62'); R(x, b, 4, 1, 44, 'rgba(255,255,255,.25)'); R(x, b + 25, 4, 1, 44, 'rgba(0,0,0,.35)'); R(x, b - 1, 48, 28, 3, '#4a554e');
      R(x, b + 4, 32, 18, 10, '#e3c13c'); x.fillStyle = '#141414'; x.beginPath(); x.moveTo(b + 13, y(41)); x.lineTo(b + 9, y(34)); x.lineTo(b + 17, y(34)); x.closePath(); x.fill();
      R(x, b + 26, 14, 3, 18, '#3a3f3a');
      if (cut) { R(x, b + 28, 6, 3, 10, '#c8ccd0'); R(x, b + 27, 5, 5, 3, '#b8262f'); } else { R(x, b + 28, 22, 3, 12, '#c8ccd0'); R(x, b + 27, 33, 5, 3, '#b8262f'); }
      R(x, b + 5, 20, 4, 4, '#101210'); R(x, b + 6, 21, 2, 2, cut ? rgba(RED, 0.95) : 'rgba(40,20,20,1)'); R(x, b + 11, 20, 4, 4, '#101210'); R(x, b + 12, 21, 2, 2, cut ? 'rgba(20,40,24,1)' : rgba(GO, 0.95));
      o.glow?.(b + 10, 22, { kind: 'neon', col: cut ? RED : GO, r: 14, a: 0.5 });
      R(x, b + 6, 0, 3, 4, '#141414'); R(x, b + 14, 0, 3, 4, '#141414');
      const bl = String(p.breakerLabel ?? ''); if (bl) plate(x, bl, b + 13, 57, { fill: '#e6e9ea', edge: '#8d969b', size: 6, pad: 3 });
      if (p.breakerTell !== false) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, b + 25, 4, 1, 44, rgba(CYAN, 0.35 + 0.5 * k)); R(x, b + 27, (cut ? 4 : 32) + 4, 5, 1, rgba(CYAN, k)); R(x, b, 4, 1, 44, rgba(CYAN, 0.25 + 0.4 * k)); }
    }
  },
});

export const controlPanelsElement = piece({
  type: 'civic.control-panels', label: 'Switchgear and mimic board (civic kit: the control room)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    cabinets: num('Switchgear cabinets', 5, 1, 20), height: num('Height', 58, 30, 120, 1, 'units'), state: select('State', ['normal', 'alarm'], 'normal'),
    mimic: bool('Mimic diagram along the top', true), desk: bool('Desk with logbook and kettle', true), tell: num('Usable cabinet (cyan tell; 0: none)', 3, 0, 20),
    power: select('Power (cut: meters at rest, lamps out)', ['on', 'cut'], 'on'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.cabinets) * 26 + (p.desk !== false ? 50 : 0), tall: Number(p.height) + 4 }),
  bounds: p => box(Number(p.cabinets) * 26 + (p.desk !== false ? 50 : 0), Number(p.height) + 4),
  anchors: () => origin(),
  paint(x, p, o) {
    const n = Number(p.cabinets), H = Number(p.height), t = o.t, cut = p.power === 'cut', alarm = p.state === 'alarm' && !cut, seed = Number(p.seed), tell = Number(p.tell);
    for (let i = 0; i < n; i++) {
      const cx = i * 26, s = seed * 19 + i;
      R(x, cx, 0, 25, H, '#8a9488'); R(x, cx, 0, 1, H, 'rgba(255,255,255,.3)'); R(x, cx + 24, 0, 1, H, 'rgba(0,0,0,.3)'); R(x, cx, H * 0.45, 25, 1, 'rgba(0,0,0,.25)');
      // meters, breaker lamps, a key switch
      x.fillStyle = '#efeee6'; x.beginPath(); x.arc(cx + 8, y(H - 12), 4, 0, Math.PI * 2); x.fill();
      const a = cut ? -2.6 : -2.2 + hash(s) * 1.6 + Math.sin(t * 0.01 + i) * 0.05; x.strokeStyle = '#b8262f'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx + 8, y(H - 12)); x.lineTo(cx + 8 + Math.cos(a) * 3.5, y(H - 12) + Math.sin(a) * 3.5); x.stroke();
      const closed = hash(s + 1) < 0.8, warn = alarm && i === Math.floor(n / 2);
      R(x, cx + 15, H - 10, 3, 3, cut ? 'rgba(50,20,20,.9)' : closed ? rgba(RED, 0.9) : rgba(GO, 0.9)); R(x, cx + 19, H - 10, 3, 3, cut ? 'rgba(20,40,24,.9)' : closed ? 'rgba(30,60,40,.9)' : 'rgba(80,20,20,.9)');
      if (!cut && i % 2 === 0) o.light?.(cx + 17, H - 9, 8, 3, closed ? RED : GO, 'screen');
      if (warn && Math.floor(t / 8) % 2) { R(x, cx + 15, H - 16, 7, 3, rgba(AMBER, 1)); o.light?.(cx + 18, H - 15, 6, 3, AMBER, 'screen'); }
      R(x, cx + 10, H * 0.3, 5, 3, '#2a2c2a'); R(x, cx + 4, 6, 17, 1, 'rgba(0,0,0,.25)');
      if (tell === i + 1) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, cx + 3, H * 0.6, 8, 5, '#0b0d0c'); R(x, cx + 4, H * 0.6 + 1, 6, 3, rgba(CYAN, 0.3 + 0.6 * k)); }
    }
    if (p.mimic !== false) {
      // the single-line diagram along the top: busbars, feeders, breakers as little squares
      const mw = n * 26; R(x, 0, H, mw, 4, '#2a2f2a');
      R(x, 4, H + 2, mw - 8, 1, cut ? 'rgba(60,70,80,.8)' : rgba(alarm ? AMBER : '120,200,255', 0.9));
      for (let i = 0; i < n; i++) R(x, i * 26 + 12, H, 1, 2, cut ? 'rgba(60,70,80,.8)' : 'rgba(120,200,255,.8)');
      if (!cut) o.light?.(mw / 2, H + 2, mw - 8, 3, '120,200,255', 'screen');
    }
    if (p.desk !== false) {
      const dx = n * 26 + 6; R(x, dx, 0, 3, 22, '#3a3f3a'); R(x, dx + 38, 0, 3, 22, '#3a3f3a'); R(x, dx - 2, 22, 46, 3, '#7c6a52');
      R(x, dx + 4, 25, 14, 2, '#2a3a5a'); R(x, dx + 5, 27, 12, 1, '#efe9d6'); R(x, dx + 28, 25, 6, 7, '#c8ccd0'); R(x, dx + 34, 28, 2, 2, '#c8ccd0');
      R(x, dx + 14, 0, 2, 12, '#2a2f33'); R(x, dx + 8, 12, 12, 3, '#3a4a5a'); R(x, dx + 19, 14, 3, 14, '#3a4a5a');
    }
  },
});

export const cableTrayElement = piece({
  type: 'civic.cable-tray', label: 'Cable tray on posts or brackets (civic kit)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    width: num('Length', 300, 20, 4000, 1, 'units'), height: num('Height above its foot', 40, 0, 600, 1, 'units'), mount: select('Held by', ['posts', 'brackets', 'hangers'], 'posts'),
    every: num('A support every', 60, 20, 400, 1, 'units'), cables: num('Cables', 5, 1, 12), drops: select('Cables drop at', ['both', 'left', 'right', 'none'], 'right'),
    pillar: select('Feeder pillar at', ['none', 'left', 'right'], 'none'), pillarKind: select('Pillar', ['feeder', 'breaker'], 'feeder'), pillarLabel: text('Pillar plate', 'FEEDER 3 · REGISTRY BLOCK'), tell: bool('Pillar usable (cyan tell)', true),
    power: select('Power (cut: the pillar lamp red)', ['on', 'cut'], 'on'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + 30 }),
  bounds: p => box(Number(p.width) + (p.pillar === 'right' ? 36 : 0) + (p.pillar === 'left' ? 32 : 0), Math.max(Number(p.height) + 8, p.pillar !== 'none' ? 52 : 0), p.pillar === 'left' ? -32 : 0),
  anchors: () => origin(),
  paint(x, p, o) {
    const W = Number(p.width), H = Number(p.height), every = Number(p.every), n = Number(p.cables), mount = String(p.mount), seed = Number(p.seed);
    for (let k = 10; k < W; k += every) {
      if (mount === 'posts') { R(x, k, 0, 3, H, '#5b6267'); R(x, k - 2, 0, 7, 2, '#3b4045'); R(x, k - 4, H - 2, 11, 2, '#5b6267'); }
      else if (mount === 'hangers') { R(x, k, H + 4, 1, 26, '#5b6267'); }
      else { R(x, k, H - 6, 2, 6, '#5b6267'); R(x, k, H - 6, 6, 1, '#5b6267'); }
    }
    for (let i = 0; i < n; i++) { const cols = ['#0d0f10', '#1a1a1a', '#5a1a1a', '#0d0f10', '#2a2a14']; R(x, 0, H + 1 + (i % 3), W, 1, cols[(i + seed) % cols.length]); }
    R(x, 0, H, W, 1, '#8b949a'); R(x, 0, H + 4, W, 1, '#8b949a'); for (let k = 0; k < W; k += 6) R(x, k, H, 1, 5, 'rgba(139,148,154,.6)');
    const drops = String(p.drops);
    for (const [side, dx] of [['left', 2], ['right', W - 8]] as const) {
      if (drops !== 'both' && drops !== side) continue;
      for (let i = 0; i < Math.min(n, 4); i++) R(x, dx + i * 2, 0, 1, H + 2, i === 1 ? '#5a1a1a' : '#111');
    }
    const pil = String(p.pillar);
    if (pil !== 'none') {
      // the feeder pillar: a squat steel box where the block's cable leaves the yard, its lamp, its plate
      const px = pil === 'left' ? -30 : W + 4, cut = p.power === 'cut', t = o.t;
      R(x, px - 2, 0, 30, 3, '#4b4942'); R(x, px, 3, 26, 34, '#56635a'); R(x, px, 3, 1, 34, 'rgba(255,255,255,.25)'); R(x, px + 25, 3, 1, 34, 'rgba(0,0,0,.35)');
      R(x, px - 1, 37, 28, 3, '#46524a'); for (let k = 8; k < 18; k += 2) R(x, px + 4, k, 18, 1, 'rgba(0,0,0,.3)');
      if (p.pillarKind === 'breaker') {
        // the main breaker: taller, a big lever on its side (up: on, down: off)
        R(x, px, 37, 26, 12, '#56635a'); R(x, px - 1, 49, 28, 3, '#46524a'); R(x, px + 26, 14, 3, 20, '#3a3f3a');
        if (cut) { R(x, px + 28, 6, 3, 10, '#c8ccd0'); R(x, px + 27, 5, 5, 3, '#b8262f'); } else { R(x, px + 28, 24, 3, 12, '#c8ccd0'); R(x, px + 27, 35, 5, 3, '#b8262f'); }
      }
      R(x, px + 10, 26, 6, 6, '#101210'); R(x, px + 11, 27, 4, 4, cut ? rgba(RED, 0.6 + 0.4 * pulse(t, 0.08)) : rgba(GO, 0.9));
      o.glow?.(px + 13, 29, { kind: 'neon', col: cut ? RED : GO, r: 16, a: 0.55 });
      const pl = String(p.pillarLabel ?? ''); if (pl) plate(x, pl, px + 13, p.pillarKind === 'breaker' ? 58 : 46, { fill: '#e6e9ea', edge: '#8d969b', size: 6, pad: 3 });
      if (p.tell !== false) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, px, 3, 26, 1, rgba(CYAN, k)); R(x, px, 3, 1, 34, rgba(CYAN, 0.3 + 0.5 * k)); R(x, px + 25, 3, 1, 34, rgba(CYAN, 0.3 + 0.5 * k)); }
    }
  },
});

export const catwalkElement = piece({
  type: 'civic.catwalk', label: 'Maintenance catwalk: grating, handrail, legs (civic kit; walk it with a level floor)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Length', 240, 20, 4000, 1, 'units'), height: num('Deck height', 64, 10, 600, 1, 'units'), legs: num('A leg every', 80, 30, 400, 1, 'units'),
    rail: num('Handrail height', 24, 0, 40, 1, 'units'), toe: bool('Hazard-striped toe board', true), steel: colourField('Steel', '#7c858b'),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) + Number(p.rail) + 2 }),
  bounds: p => box(Number(p.width), Number(p.height) + Number(p.rail) + 2),
  anchors: p => ({ ...origin(), deck: { x: 0, h: Number(p.height), role: 'surface' }, end: { x: Number(p.width), h: Number(p.height), role: 'surface' } }),
  paint(x, p) {
    const W = Number(p.width), H = Number(p.height), rail = Number(p.rail), steel = hexOr(p.steel, '#7c858b');
    for (let k = 4; k < W; k += Number(p.legs)) { R(x, k, 0, 3, H - 4, '#4b5257'); R(x, k + 3, 0, 1, H - 4, 'rgba(0,0,0,.4)'); R(x, k - 2, 0, 7, 2, '#3a3f43'); x.strokeStyle = '#4b5257'; x.beginPath(); x.moveTo(k + 3, y(H - 14)); x.lineTo(k + 18, y(H - 4)); x.stroke(); }
    R(x, 0, H - 4, W, 4, '#262b2f'); for (let k = 0; k < W; k += 3) R(x, k, H - 4, 1, 3, 'rgba(160,170,176,.35)');
    R(x, 0, H - 1, W, 1, steel);
    if (p.toe !== false) for (let k = 0; k < W; k += 8) R(x, k, H - 4, 4, 2, 'rgba(230,190,40,.7)');
    if (rail > 0) { R(x, 0, H + rail - 2, W, 2, steel); R(x, 0, H + rail / 2, W, 1, steel); for (let k = 0; k < W; k += 40) R(x, Math.min(k, W - 2), H, 2, rail, steel); R(x, W - 2, H, 2, rail, steel); }
  },
});

// ---------------------------------------------------------------- the sweep

export const registryVanElement = piece({
  type: 'civic.registry-van', label: 'Registry van (civic kit: livery, light bar, doors open)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    face: select('Faces', ['right', 'left'], 'right'), paint: colourField('Paint', '#c3c8cb'), beacons: bool('Light bar flashing', true),
    rear: bool('Rear doors open (the cage inside)', false), side: bool('Side door open', false), lights: bool('Headlights', true),
    decal: text('Decal lines (split by /)', 'REGISTRY/PERSONS IN TRANSIT'), fleetNo: text('Fleet number', 'R-114'), flood: bool('Roof floodlight on', false), phase: num('Phase', 0, 0, 1000),
  },
  size: () => ({ w: 160, tall: 70 }), reach: p => p.flood === true ? 160 : 40,
  bounds: () => ({ x: -82, h: 70, w: 164, tall: 72 }),
  anchors: () => ({ ...origin(), rear: { x: -70, h: 0, role: 'mount' }, front: { x: 70, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const face: 1 | -1 = p.face === 'left' ? -1 : 1, t = o.t + Number(p.phase), paint = hexOr(p.paint, '#c3c8cb');
    const decal = String(p.decal ?? '').split('/').map(s => s.trim()).filter(Boolean), fleet = String(p.fleetNo ?? '');
    if (p.rear === true) {
      // the rear doors swung wide; inside, a bench and a steel cage
      const bx = -70 * face, out = -face;
      for (const k of [6, 13]) { R(x, bx + out * k - 2, 9, 4, 44, paint); R(x, bx + out * k - 2, 30, 4, 1, 'rgba(0,0,0,.3)'); R(x, bx + out * k - 2, 9, 1, 44, 'rgba(255,255,255,.25)'); }
    }
    drawCar(x, { t, face, still: true, lights: p.lights !== false, paint, kind: 'van', livery: { stripe: '#b8262f', qr: true, decal: decal.length ? decal : undefined } });
    // the fleet number on the cab door, clear of the decal; the side door slid open just behind the cab, a bench inside
    if (fleet) bodyText(x, 1, fleet, 50 * face, 18, 'rgba(30,24,18,.8)', 6, '700');
    if (p.side === true) { const dl = face > 0 ? 7 : -29; R(x, dl, 9, 22, 42, '#0b0d0e'); R(x, dl + 2, 18, 18, 3, '#3a4044'); R(x, dl, 50, 22, 1, '#5b6267'); R(x, dl, 9, 22, 1, '#5b6267'); }
    if (p.rear === true) { const bx = face > 0 ? -68 : 50; R(x, bx, 10, 18, 40, '#0b0d0e'); for (let k = 2; k < 18; k += 3) R(x, bx + k, 12, 1, 36, 'rgba(160,170,175,.45)'); R(x, bx, 22, 18, 1, 'rgba(160,170,175,.45)'); }
    // the light bar: red and white, alternating
    R(x, -16, 54, 32, 4, '#16191b');
    if (p.beacons !== false) {
      const ph = Math.floor(t / 7) % 4, redOn = ph === 0 || ph === 2, whiteOn = ph === 1;
      R(x, -15, 55, 12, 2, redOn ? 'rgba(255,60,80,1)' : 'rgba(110,20,30,1)'); R(x, 3, 55, 12, 2, whiteOn ? 'rgba(250,250,255,1)' : 'rgba(90,96,100,1)');
      if (redOn) o.glow?.(-9, 58, { kind: 'neon', col: RED, r: 130, a: 0.8 });
      if (whiteOn) o.glow?.(9, 58, { kind: 'neon', col: '235,240,255', r: 110, a: 0.65 });
    }
    if (p.flood === true) {
      const fx = -40 * face; R(x, fx - 4, 54, 8, 6, '#2a2e31'); R(x, fx + 3 * face - 1, 55, 2, 4, 'rgba(250,252,255,1)');
      x.fillStyle = 'rgba(235,242,255,.08)'; x.beginPath(); x.moveTo(fx + 4 * face, y(57)); x.lineTo(fx + 150 * face, y(0)); x.lineTo(fx + 60 * face, y(0)); x.closePath(); x.fill();
      o.glow?.(fx + 110 * face, 6, { kind: 'lamp', col: '235,242,255', r: 90, a: 0.8 });
    }
  },
});

export const floodlightElement = piece({
  type: 'civic.floodlight', label: 'Floodlight: trailer tower, pole or tripod (civic kit: the sweep)', category: 'machinery', libraryUse: 'reusable',
  fields: {
    kind: select('Kind', ['tower', 'pole', 'tripod'], 'tower'), height: num('Lamp height', 110, 20, 400, 1, 'units'), heads: num('Lamp heads', 3, 1, 8),
    aim: select('Points', ['right', 'left', 'down'], 'right'), reach: num('Where the beam lands (units out)', 120, 0, 800, 1, 'units'), spread: num('Pool width', 90, 10, 600, 1, 'units'),
    strength: num('Strength', 0.8, 0, 1, 0.05), on: bool('On', true), colour: colourField('Light', '#e8f0ff'), seed: num('Seed', 1, 0, 1000000),
  },
  size: () => ({ w: 60, tall: 120 }), reach: p => Number(p.reach) + Number(p.spread),
  bounds: p => ({ x: -26, h: Number(p.height) + 8, w: 52, tall: Number(p.height) + 10 }),
  anchors: p => ({ ...origin(), head: { x: 0, h: Number(p.height), role: 'mount' } }),
  paint(x, p, o) {
    const H = Number(p.height), kind = String(p.kind), n = Number(p.heads), on = p.on !== false, k = Number(p.strength), col = isHex(p.colour) ? rgbOf(String(p.colour)) : '232,240,255';
    const dir = p.aim === 'left' ? -1 : p.aim === 'down' ? 0 : 1, land = dir * Number(p.reach), spread = Number(p.spread);
    if (on && k > 0) {
      // the beam to the ground and the pool where it lands
      const g = x.createLinearGradient(0, y(H), land, 0); g.addColorStop(0, rgba(col, 0.2 * k)); g.addColorStop(1, rgba(col, 0.05 * k));
      x.fillStyle = g; x.beginPath(); x.moveTo(-n * 3, y(H)); x.lineTo(n * 3, y(H)); x.lineTo(land + spread / 2, 0); x.lineTo(land - spread / 2, 0); x.closePath(); x.fill();
      const pool = x.createRadialGradient(land, 0, 2, land, 0, spread / 2); pool.addColorStop(0, rgba(col, 0.28 * k)); pool.addColorStop(1, rgba(col, 0));
      x.fillStyle = pool; x.fillRect(land - spread / 2, -8, spread, 10);
      o.glow?.(land, 4, { kind: 'lamp', col, r: spread * 0.9, a: 0.9 * k });
      o.glow?.(0, H, { kind: 'neon', col, r: 40, a: 0.6 * k });
    }
    if (kind === 'tower') {
      // a trailer with a generator, a telescopic mast, outriggers
      R(x, -24, 6, 48, 16, '#8a9196'); R(x, -24, 21, 48, 1, 'rgba(255,255,255,.3)'); for (let v = -18; v < 0; v += 3) R(x, v, 10, 1, 8, 'rgba(0,0,0,.35)');
      R(x, 4, 12, 16, 6, '#e6e9ea'); T(x, 'REGISTRY', 12, 15, 'rgba(46,52,58,.9)', 4, '700');
      x.fillStyle = '#121416'; x.beginPath(); x.arc(-10, y(5), 5, 0, Math.PI * 2); x.arc(10, y(5), 5, 0, Math.PI * 2); x.fill();
      R(x, -30, 0, 4, 8, '#5b6267'); R(x, 26, 0, 4, 8, '#5b6267'); R(x, -30, 7, 60, 2, '#5b6267');
      R(x, -2, 22, 4, H - 22, '#5b6267'); R(x, -1, 22 + (H - 22) * 0.5, 2, (H - 22) * 0.5, '#7b8287');
    } else if (kind === 'pole') { R(x, -4, 0, 8, 3, '#3b4045'); R(x, -1, 3, 3, H - 3, '#5b6267'); }
    else { x.strokeStyle = '#3b4045'; x.lineWidth = 2; x.beginPath(); x.moveTo(-14, 0); x.lineTo(0, y(H * 0.55)); x.lineTo(14, 0); x.moveTo(0, 0); x.lineTo(0, y(H)); x.stroke(); }
    const bw = n * 7 + 2; R(x, -bw / 2, H - 2, bw, 3, '#2a2e31');
    for (let i = 0; i < n; i++) { const hx = -bw / 2 + 2 + i * 7; R(x, hx, H + 1, 6, 6, '#1d2023'); R(x, hx + (dir >= 0 ? 4 : 0), H + 2, 2, 4, on ? 'rgba(' + col + ',1)' : 'rgba(90,96,100,1)'); }
  },
});

export const checkpointElement = piece({
  type: 'civic.checkpoint', label: 'ID checkpoint: folding table, scanner, barrier, cones (civic kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    table: bool('Folding table with a scanner', true), barrier: num('Barrier width (0: none)', 56, 0, 300, 1, 'units'), text: text('Barrier boards (split by /)', 'IDENTITY CHECK/HAVE YOUR ID READY'),
    cones: num('Cones', 3, 0, 12), scanning: bool('Scanner sweeping', true),
  },
  size: p => ({ w: 50 + Number(p.barrier) + Number(p.cones) * 14, tall: 40 }),
  bounds: p => box(50 + Number(p.barrier) + Number(p.cones) * 14, 40),
  anchors: () => origin(),
  paint(x, p, o) {
    const t = o.t; let at = 0;
    if (p.table !== false) {
      R(x, 2, 0, 2, 22, '#7b8287'); R(x, 34, 0, 2, 22, '#7b8287'); x.strokeStyle = '#7b8287'; x.lineWidth = 1; x.beginPath(); x.moveTo(3, y(0)); x.lineTo(35, y(20)); x.stroke();
      R(x, 0, 22, 40, 3, '#d3d7d9'); R(x, 0, 21, 40, 1, 'rgba(0,0,0,.3)');
      R(x, 6, 25, 14, 2, '#202427'); R(x, 7, 27, 12, 6, '#202427'); R(x, 8, 28, 10, 4, 'rgba(200,225,235,.85)'); o.light?.(13, 30, 10, 4, '200,225,235', 'screen');
      R(x, 26, 25, 4, 10, '#2a2e31'); R(x, 25, 35, 6, 3, '#2a2e31');
      if (p.scanning !== false) { const k = (Math.sin(t * 0.08) + 1) / 2; x.fillStyle = rgba(RED, 0.25); x.beginPath(); x.moveTo(28, y(36)); x.lineTo(46, y(30 + k * 10)); x.lineTo(46, y(26 + k * 10)); x.closePath(); x.fill(); R(x, 27, 36, 2, 1, rgba(RED, 1)); }
      at = 50;
    }
    const bw = Number(p.barrier);
    if (bw > 0) {
      const lines = String(p.text ?? '').split('/').filter(Boolean);
      R(x, at + 2, 0, 3, 30, '#5b6267'); R(x, at + bw - 5, 0, 3, 30, '#5b6267');
      R(x, at, 16, bw, 13, '#e2e6e7'); for (let k = 0; k < bw; k += 10) R(x, at + k, 16, 5, 2, rgba(RED, 0.85));
      R(x, at, 6, bw, 6, '#e2e6e7'); for (let k = 0; k < bw; k += 10) R(x, at + k + 5, 6, 5, 6, rgba(RED, 0.8));
      if (lines[0]) T(x, lines[0], at + bw / 2, 23.5, 'rgba(40,46,52,.95)', 6, '700');
      if (lines[1]) plate(x, lines[1], at + bw / 2, 36, { fill: '#e6e9ea', edge: '#8d969b', size: 6, pad: 3 });
      at += bw + 8;
    }
    for (let i = 0; i < Number(p.cones); i++) {
      const cx = at + 6 + i * 14; R(x, cx - 6, 0, 12, 2, '#2a2e31');
      x.fillStyle = '#d9dcdd'; x.beginPath(); x.moveTo(cx - 4, y(2)); x.lineTo(cx + 4, y(2)); x.lineTo(cx + 1, y(18)); x.lineTo(cx - 1, y(18)); x.closePath(); x.fill();
      R(x, cx - 3, 6, 6, 2, rgba(RED, 0.9)); R(x, cx - 2, 12, 4, 2, rgba(RED, 0.9));
    }
  },
});

// ---------------------------------------------------------------- the precinct (Act I optional place, 2026-10-22)

/** City police: a deep blue lamp (never the cyan of usable tech), tired municipal green walls, a dark olive uniform. */
const POLICE_BLUE = '80,120,255';

/** The blue lamp over a police station door: a lantern on a wall bracket or a pole, POLICE on its face, lit day and night. */
export const policeLampElement = piece({
  type: 'civic.police-lamp', label: 'Police lamp: blue lantern on a bracket (civic kit: the precinct)', category: 'sign kit', libraryUse: 'reusable',
  fields: {
    text: text('Letters on the face', 'POLICE'), mount: select('Mount', ['wall', 'pole'], 'wall'), drop: num('Pole height (pole)', 120, 40, 300, 1, 'units'),
    colour: colourField('Lamp', '#5078ff'), on: bool('Lit', true),
  },
  size: () => ({ w: 40, tall: 30 }), reach: () => 50,
  bounds: p => p.mount === 'pole' ? { x: -20, h: Number(p.drop) + 22, w: 40, tall: Number(p.drop) + 22 } : { x: -20, h: 22, w: 40, tall: 30 },
  anchors: () => origin(),
  paint(x, p, o) {
    const col = isHex(p.colour) ? rgbOf(String(p.colour)) : POLICE_BLUE, on = p.on !== false, word = String(p.text ?? 'POLICE'), pole = p.mount === 'pole';
    const base = pole ? Number(p.drop) : 0, w = Math.max(30, Math.ceil(textW(x, word, 7, '700')) + 8);
    if (pole) { R(x, -4, 0, 8, 3, '#2a2e31'); R(x, -1, 3, 3, base - 3, '#3b4045'); }
    else { R(x, -2, base - 8, 4, 8, '#2a2e31'); R(x, -1, base - 2, 2, 4, '#1a1c1e'); }
    // the lantern: a black cap, the glass face with the word, a finial
    R(x, -w / 2 - 2, base + 2, w + 4, 2, '#15171a'); R(x, -w / 2 - 1, base + 14, w + 2, 3, '#15171a'); R(x, -2, base + 17, 4, 3, '#15171a');
    R(x, -w / 2, base + 4, w, 10, on ? rgba(col, 0.95) : '#2a3450');
    R(x, -w / 2, base + 13, w, 1, 'rgba(255,255,255,.35)');
    T(x, word, 0, base + 9, on ? 'rgba(250,252,255,.97)' : 'rgba(190,200,215,.7)', 7, '700');
    if (on) { o.glow?.(0, base + 9, { kind: 'neon', col, r: 46, a: 0.7 }); o.light?.(0, base + 9, w, 10, col, 'screen'); }
  },
});

const CELL_WALL = '#5a625c', CELL_DADO = '#3c4440';
/**
 * Holding cells, cut open: a back wall of painted block with scratched tallies, a steel bench along it (sit people on its
 * `seat` anchors, lie them on it), a steel toilet, a caged bulb; and the front: bars and a sliding door. `part` splits the
 * two so people stand between the wall and the bars (back on the backdrop, front over the people in the playfield).
 */
export const holdingCellElement = piece({
  type: 'civic.holding-cell', label: 'Holding cells: block wall, steel bench, bars (civic kit: the precinct)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    cells: num('Cells', 2, 1, 6), width: num('Cell width', 90, 50, 200, 1, 'units'), height: num('Height', 72, 50, 140, 1, 'units'),
    bench: num('Bench height (sit people here)', 14, 8, 24, 1, 'units'), part: select('Draws (back: wall and bench; front: the bars over the people)', ['all', 'back', 'front'], 'all'),
    open: text('Cell doors open (comma list)', ''), labels: text('Cell plates (split by /)', 'H1/H2/H3/H4/H5/H6'),
    notice: text('Notice by the door (empty: none)', 'AWAITING REGISTRY COLLECTION'), lit: num('Cell lights on', 1, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.cells) * (Number(p.width) + 4) + 4, tall: Number(p.height) + 12 }),
  bounds: p => box(Number(p.cells) * (Number(p.width) + 4) + 4, Number(p.height) + 12),
  anchors: p => ({ ...origin(), ...Object.fromEntries(Array.from({ length: Number(p.cells) }, (_, i) => {
    const l = 4 + i * (Number(p.width) + 4);
    return [['seat' + i, { x: l + 14, h: Number(p.bench), role: 'surface' as const }], ['bed' + i, { x: l + 8, h: Number(p.bench), role: 'surface' as const }], ['cell' + i, { x: l + Number(p.width) / 2, h: 0, role: 'mount' as const }]];
  }).flat()) }),
  paint(x, p, o) {
    const n = Number(p.cells), W = Number(p.width), H = Number(p.height), B = Number(p.bench), seed = Number(p.seed), t = o.t, lit = Number(p.lit);
    const back = p.part !== 'front', front = p.part !== 'back', open = new Set(String(p.open ?? '').split(',').map(s => parseInt(s, 10)));
    const plates = String(p.labels ?? '').split('/').map(s => s.trim()), total = n * (W + 4) + 4;
    if (back) {
      for (let i = 0; i < n; i++) {
        const l = 4 + i * (W + 4), s = seed * 17 + i * 5;
        R(x, l, 0, W, H, CELL_WALL); R(x, l, 0, W, 24, CELL_DADO); R(x, l, 24, W, 1, 'rgba(255,255,255,.12)');
        for (let h = 8; h < H; h += 8) { R(x, l, h, W, 1, 'rgba(0,0,0,.16)'); for (let k = ((h / 8) % 2) * 8; k < W; k += 16) R(x, l + k, h - 8, 1, 8, 'rgba(0,0,0,.12)'); }
        // tallies and a scratched name, low on the wall where someone sat a long time
        for (let g = 0; g < 2 + Math.floor(hash(s) * 3); g++) { const gx = l + 8 + g * 9 + hash(s + g) * 4, gh = 34 + hash(s + g * 3) * 16; for (let k = 0; k < 4; k++) R(x, gx + k * 1.5, gh, 0.6, 5, 'rgba(220,215,200,.4)'); R(x, gx - 0.5, gh + 2, 6, 0.6, 'rgba(220,215,200,.4)'); }
        // the bench: a steel slab on brackets along the back wall
        const bw = W - 26;
        R(x, l + 4, B - 3, bw, 3, '#8a9192'); R(x, l + 4, B - 1, bw, 1, 'rgba(255,255,255,.3)'); R(x, l + 4, B - 4, bw, 1, 'rgba(0,0,0,.4)');
        for (const k of [8, bw - 6]) R(x, l + 4 + k, 2, 2, B - 5, '#5d6466');
        if (hash(s + 9) < 0.6) { R(x, l + 8, B, 16, 2, '#5a4a32'); R(x, l + 8, B + 2, 10, 1, '#6a5a3a'); }
        // the steel toilet in the corner, a drain in the floor
        const tx = l + W - 18; R(x, tx, 0, 12, 4, '#6f7778'); R(x, tx + 1, 4, 10, 8, '#9aa2a3'); R(x, tx, 12, 12, 2, '#b3babb'); R(x, tx + 8, 14, 4, 10, '#8a9192'); R(x, tx + 2, 11, 8, 1, 'rgba(0,0,0,.3)');
        R(x, l + W / 2 - 3, 0, 6, 1, '#1e2224');
        // the caged bulb over the middle and its cone
        const cx = l + W / 2; R(x, cx - 4, H - 4, 8, 4, '#2a2e2f');
        if (lit > 0) {
          R(x, cx - 2, H - 7, 4, 3, rgba('255,236,190', 0.6 + 0.4 * lit)); for (let k = -3; k <= 3; k += 2) R(x, cx + k, H - 8, 0.6, 5, '#2a2e2f');
          const g = x.createLinearGradient(0, y(H - 7), 0, 0); g.addColorStop(0, rgba('255,236,190', 0.16 * lit)); g.addColorStop(1, rgba('255,236,190', 0.02 * lit));
          x.fillStyle = g; x.beginPath(); x.moveTo(cx - 3, y(H - 7)); x.lineTo(cx + 3, y(H - 7)); x.lineTo(cx + W * 0.42, 0); x.lineTo(cx - W * 0.42, 0); x.closePath(); x.fill();
          o.light?.(cx, H - 6, 6, 3, '255,236,190', 'screen');
        } else R(x, cx - 2, H - 7, 4, 3, '#3a3a36');
      }
      // the dividing walls, cut
      for (let i = 0; i <= n; i++) { const l = i * (W + 4); R(x, l, 0, 4, H + 2, '#3a403e'); R(x, l + 3, 0, 1, H + 2, 'rgba(255,190,120,.25)'); }
      R(x, 0, H, total, 2, '#3a403e');
      const notice = String(p.notice ?? '');
      if (notice) plate(x, notice, total / 2, H + 7, { fill: '#e6e9ea', edge: '#8d969b', size: 6, pad: 3 });
    }
    if (front) {
      for (let i = 0; i < n; i++) {
        const l = 4 + i * (W + 4), isOpen = open.has(i + 1), dw = 24, slide = isOpen ? dw - 4 : 0;
        // fixed bars, a top and a mid rail; the door section (on the left) slides behind the fixed bars when open
        R(x, l, H - 3, W, 3, '#2c3134'); R(x, l, 0, W, 2, '#2c3134'); R(x, l + dw, 30, W - dw, 2, '#3a4044');
        for (let k = dw + 3; k < W - 1; k += 5) { R(x, l + k, 2, 1.5, H - 5, '#4d5559'); R(x, l + k, 2, 0.6, H - 5, 'rgba(255,255,255,.22)'); }
        const dl = l + slide; R(x, dl, 30, dw, 2, '#3a4044'); R(x, dl, 2, 2, H - 5, '#3a4044'); R(x, dl + dw - 2, 2, 2, H - 5, '#3a4044');
        for (let k = 4; k < dw - 2; k += 5) { R(x, dl + k, 2, 1.5, H - 5, '#4d5559'); R(x, dl + k, 2, 0.6, H - 5, 'rgba(255,255,255,.22)'); }
        // the lock box and its light, the plate over the door
        R(x, l + dw - 3, 34, 6, 8, '#1e2224'); R(x, l + dw - 1, 37, 2, 2, isOpen ? rgba(GO, 0.95) : rgba(RED, 0.75 + 0.25 * pulse(t, 0.08, i)));
        const name = plates[i] ?? ''; if (name) plate(x, name, l + 12, H - 9, { fill: '#e6e9ea', ink: 'rgba(40,46,52,.95)', size: 6, pad: 2 });
      }
    }
  },
});

/** A precinct's wanted board: mugshot cards in rows under WANTED and UNREGISTERED, the collected ones struck red, one card with no face. */
export const wantedBoardElement = piece({
  type: 'civic.wanted-board', label: 'Wanted and unregistered board: mugshot cards (civic kit: the precinct)', category: 'sign kit', libraryUse: 'reusable',
  fields: {
    width: num('Width', 96, 40, 400, 1, 'units'), height: num('Height', 50, 30, 200, 1, 'units'),
    left: text('Left header (empty: none)', 'WANTED'), right: text('Right header (empty: none)', 'UNREGISTERED'),
    cards: num('Cards', 14, 0, 60), collected: num('Share struck as collected', 0.4, 0, 1, 0.05), blank: num('Card with no face (0: none)', 9, 0, 60),
    footer: text('Strip along the bottom (empty: none)', 'REPORT SIGHTINGS'), seed: num('Seed', 1, 0, 1000000),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.height) }),
  bounds: p => box(Number(p.width) + 4, Number(p.height) + 2, -2),
  anchors: () => origin(),
  paint(x, p) {
    const W = Number(p.width), H = Number(p.height), seed = Number(p.seed), n = Number(p.cards), blank = Number(p.blank), foot = String(p.footer ?? '');
    R(x, -2, -2, W + 4, H + 4, '#2c3236'); R(x, 0, 0, W, H, '#c9c4b2'); R(x, -2, H + 1, W + 4, 1, 'rgba(255,255,255,.2)');
    const left = String(p.left ?? ''), right = String(p.right ?? ''), half = right && left ? W / 2 : W;
    // headers shrink to fit their half (never under 5), so WANTED and UNREGISTERED never run into each other
    const fit = (s: string, room: number) => [7, 6, 5].find(k => textW(x, s, k, '700') <= room - 4) ?? 5;
    if (left) { R(x, 1, H - 10, half - 2, 9, '#b8262f'); T(x, left, half / 2, H - 5.5, 'rgba(250,246,240,.95)', fit(left, half - 2), '700'); }
    if (right) { const rl = left ? half + 1 : 1, rw = (left ? half : W) - 2; R(x, rl, H - 10, rw, 9, '#3a4248'); T(x, right, rl + rw / 2, H - 5.5, 'rgba(235,238,240,.95)', fit(right, rw), '700'); }
    const bottom = foot ? 11 : 2, top = H - 12, cw = 10, ch = 13, cols = Math.max(1, Math.floor((W - 4) / (cw + 2))), rows = Math.max(1, Math.floor((top - bottom) / (ch + 2)));
    if (foot) { R(x, 1, 1, W - 2, 8, '#e8e4d6'); x.save(); x.beginPath(); x.rect(1, y(9), W - 2, 8); x.clip(); T(x, foot, W / 2, 5, 'rgba(40,46,52,.9)', textW(x, foot, 6) <= W - 6 ? 6 : 5, '600'); x.restore(); }
    const skins = ['#e0b896', '#c08a62', '#8a5a3a', '#5a3a26', '#f0cfb0', '#a8704a'], hairs = ['#1a1410', '#3a2a1a', '#6a5a4a', '#b8b0a0', '#8a3a2a', '#2a2a3a'];
    for (let k = 0; k < Math.min(n, cols * rows); k++) {
      const c = k % cols, r = Math.floor(k / cols), cx = 3 + c * (cw + 2) + (left && right && c >= cols / 2 ? 1 : 0), ch0 = top - (r + 1) * (ch + 2) + 2, s = seed * 31 + k * 7;
      R(x, cx, ch0, cw, ch, '#f0ece0'); R(x, cx, ch0, cw, 1, 'rgba(0,0,0,.25)');
      if (k + 1 === blank) {
        // no photo on file: a grey head-shaped gap and a question mark
        R(x, cx + 1, ch0 + 4, cw - 2, 8, '#8a8f92'); R(x, cx + 3, ch0 + 5, 4, 5, '#6a6f72'); T(x, '?', cx + cw / 2, ch0 + 8, 'rgba(240,240,236,.9)', 6, '700');
      } else {
        R(x, cx + 1, ch0 + 4, cw - 2, 8, '#9aa4aa');
        const sk = skins[Math.floor(hash(s) * skins.length)], hr = hairs[Math.floor(hash(s + 1) * hairs.length)];
        R(x, cx + 2, ch0 + 4, 6, 3, '#4a525a'); R(x, cx + 3, ch0 + 6, 4, 5, sk); R(x, cx + 3, ch0 + 10, 4, 1.5, hr); if (hash(s + 2) < 0.4) R(x, cx + 2, ch0 + 8, 1, 3, hr);
      }
      R(x, cx + 1, ch0 + 1, cw - 2 - Math.round(hash(s + 3) * 3), 1, 'rgba(40,36,30,.6)'); R(x, cx + 1, ch0 + 2.5, cw - 4, 0.8, 'rgba(40,36,30,.4)');
      if (k + 1 !== blank && hash(s + 4) < Number(p.collected)) { x.save(); x.strokeStyle = 'rgba(190,30,30,.9)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, y(ch0)); x.lineTo(cx + cw, y(ch0 + ch)); x.stroke(); x.restore(); }
      R(x, cx + cw / 2 - 0.5, ch0 + ch - 1, 1.5, 1.5, hash(s + 5) < 0.5 ? '#c83a2a' : '#2a6ac8');
    }
  },
});

/** The Registry's corner in someone else's building: a grey-white desk with the seal, a screen for the visitor, an ID scanner, the gold plate. */
export const liaisonDeskElement = piece({
  type: 'civic.liaison-desk', label: 'Registry liaison desk: seal, visitor screen, ID scanner, gold plate (civic kit)', category: 'furniture', libraryUse: 'reusable',
  fields: {
    width: num('Width', 64, 44, 160, 1, 'units'), plate: text('Plate on the wall (empty: none)', 'REGISTRY LIAISON'), sub: text('Line under it (empty: none)', 'PLAZA HOLDINGS · UNDER CONTRACT'),
    plateAt: num('Plate height', 66, 40, 200, 1, 'units'), screen: select('Visitor screen', ['seal', 'verifying', 'not found', 'off'], 'verifying'),
    tent: text('Card on the desk (empty: none)', 'PREMIUM FIRST'), tell: bool('Usable (cyan tell on the scanner)', false), hours: hoursField(),
  },
  size: p => ({ w: Number(p.width), tall: Number(p.plateAt) + 10 }),
  bounds: p => box(Number(p.width), Number(p.plateAt) + 10),
  anchors: p => ({ ...origin(), clerk: { x: Number(p.width) * 0.35, h: 0, role: 'mount' }, visitor: { x: Number(p.width) + 12, h: 0, role: 'mount' } }),
  paint(x, p, o) {
    const W = Number(p.width), t = o.t, hours = String(p.hours), open = hours === 'open', mode = String(p.screen);
    const name = String(p.plate ?? ''), sub = String(p.sub ?? ''), ph = Number(p.plateAt);
    if (name) goldPlate(x, name, W / 2, ph, 7);
    if (sub) plate(x, sub, W / 2, ph - 10, { fill: '#e6e9ea', ink: 'rgba(60,66,72,.9)', size: 5, pad: 2 });
    // the desk: grey-white laminate, a front panel with the seal, a modesty strip
    R(x, 0, 0, W, 28, '#cfd4d6'); R(x, 0, 28, W, 3, '#eef0f0'); R(x, 0, 27, W, 1, 'rgba(0,0,0,.25)'); R(x, 0, 0, W, 3, '#5d666c');
    R(x, 4, 4, W - 8, 21, '#dde1e2'); seal(x, W / 2, 15, 6, 'rgba(120,132,140,.85)');
    // the visitor's screen on a stand, turned towards the room
    const sx = W - 22; R(x, sx + 6, 31, 3, 5, '#2a2f33'); R(x, sx, 36, 16, 12, '#1b1f22');
    let scr = 'rgba(200,220,232,.85)'; if (!open) scr = hours === 'cut' ? '#07090a' : 'rgba(70,82,92,.55)'; else if (mode === 'not found') scr = 'rgba(240,210,210,.9)'; else if (mode === 'off') scr = '#0c0e10';
    R(x, sx + 1, 37, 14, 10, scr);
    if (open && mode === 'seal') seal(x, sx + 8, 42, 3, 'rgba(90,100,110,.9)');
    if (open && mode === 'verifying') { const k = Math.floor(t / 10) % 10; R(x, sx + 3, 41, 10, 2, 'rgba(60,70,80,.35)'); R(x, sx + 3, 41, k + 1, 2, 'rgba(60,90,120,.9)'); }
    if (open && mode === 'not found') { R(x, sx + 3, 43, 10, 1, rgba(RED, 0.9)); R(x, sx + 3, 40, 7, 1, rgba(RED, 0.7)); }
    if (open && mode !== 'off') o.light?.(sx + 8, 42, 14, 10, mode === 'not found' ? '255,150,150' : '200,225,238', 'screen');
    // the ID scanner pad, its red line sweeping; a tray of forms; the clerk's own monitor seen from behind
    R(x, 8, 31, 14, 3, '#2a2e31'); R(x, 9, 34, 12, 1, open ? rgba(RED, 0.5 + 0.5 * pulse(t, 0.12)) : 'rgba(110,30,36,.6)');
    if (p.tell === true) { const k = 0.5 + 0.5 * pulse(t, 0.05); R(x, 8, 30, 14, 1, rgba(CYAN, k)); }
    R(x, 24, 31, 10, 2, '#9aa2a6'); R(x, 25, 33, 8, 1, '#efe9d6'); R(x, 25, 34, 8, 1, '#e4dcc4');
    const tent = String(p.tent ?? ''); if (tent) { const w = Math.ceil(textW(x, tent, 5)) + 4; R(x, 36 - w / 2 + 6, 31, w, 6, '#0b0b0d'); T(x, tent, 36 + 6, 34, rgba(GOLD, 0.95), 5, '700'); }
    after(x, hours, 0, 0, W, 50, t, 0.5);
  },
});

export const downtownCivicElements: AssetDefinition[] = [
  roomElement, ticketMachineElement, numberDisplayElement, chairsElement, countersElement, boothsElement, holdScreenElement, posterElement, queueRailElement,
  staffDoorElement, terminalBankElement, recordsElement, nodeElement, alarmElement, registryFrontElement,
  transformerElement, busbarElement, controlHutElement, controlPanelsElement, cableTrayElement, catwalkElement,
  registryVanElement, floodlightElement, checkpointElement,
  policeLampElement, holdingCellElement, wantedBoardElement, liaisonDeskElement,
];
