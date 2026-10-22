/**
 * METRO KIT (Tommi, 2026-10-22: the seamless world lets the player walk the whole train, so every platform is as
 * long as the train; he wants to see sizes compared). Pieces for an underground LINE 0 station and a train the
 * player walks through, all at the player's scale (the true-scale car of train-car.ts `METRO`: 20 m = 533 units):
 * - `metro.underground-platform`: a tiled subway platform under the street: the far wall across the track with
 *   its name band, the ceiling and its strip lamps, the slab up to the street and the street's pavement on top,
 *   the platform's edge and paving;
 * - `metro.ticket-hall`: the underground ticket hall at the platform's level (Downtown is underground, decided 4 and 17):
 *   small old tiles, the ticket office, ticket machines, the LINE 0 map, the gate line's gantry and ID camera, the slab
 *   and the street above; the turnstile itself is the level kit's `level.barrier`, a real barrier in the world;
 * - `metro.stairs-up`: a flight from the platform up through the slab to the street, its sign and railings; with
 *   `flight` off it is only the well (tiled sides, lamp, railings, METRO post, optional glass hood) round a walkable
 *   `level.stairs` or `level.escalator`;
 *
 * The underground station preset is these pieces together: ticket hall + platform (`ends` so they join) + stairs well
 * over a walkable flight, indoor floors (`level.floor` `indoor`), the street floor on the slab
 * (art/proposals/dt-metro-underground and dt-metro-seam).
 * - `metro.cutaway-car`: one car with its platform side cut away, so its inside reads: seats along the far wall,
 *   poles and straps, the far side's shut doors and dark windows, the near doors' thresholds and frames, a cab at
 *   either end if it leads;
 * - `metro.gangway`: the walk-through connection between two cars (floor plate, bellows);
 * - `metro.cutaway-train`: a whole train of cut-open cars coupled by gangways, cabs at both ends;
 * - `metro.scale-ruler`: a style frame's measuring bar: screen widths, metres and the walk and run times.
 *
 * Each piece is drawn in its own frame (origin at its foot on the left, `y(h) = -h`, h = 0 the platform floor).
 * Every visual choice is a field. The world's text is dry: the signs say where the stairs go.
 */
import type { Element, Properties } from '../core/composition';
import { O, PAPER, mono } from '../core/primitives';
import { METRO } from '../vehicles/train-car';
import { piece, num, select, bool, text, isHex, rgbOf, y, type Paint } from '../buildings/types';

type X = CanvasRenderingContext2D;
/** A pixel-crisp rect in the piece's frame: from `l`, its foot at `h`, `w` wide, `t` tall. */
const R = (x: X, l: number, h: number, w: number, t: number, fill: string) => {
  if (w <= 0 || t <= 0) return;
  x.fillStyle = fill; x.fillRect(Math.round(l), Math.round(y(h + t)), Math.max(1, Math.round(w)), Math.max(1, Math.round(t)));
};
const colour = (label: string, value: string) => ({ kind: 'color' as const, label, default: value });
const hex = (v: unknown, fallback: string) => isHex(v) ? String(v) : fallback;
const N = (p: Properties, k: string) => Number(p[k]);
/** Words on the canvas in the piece's frame, at height `h`. */
function say(x: X, s: string, cx: number, h: number, col: string, size = 7, weight = '', align: CanvasTextAlign = 'center') {
  x.font = mono(size, weight); x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, Math.round(cx), Math.round(y(h)));
}
/** The walk and run speeds of the player (runtime/game.ts `update`: 1.3 and 2.3 units a frame, 60 frames a second). */
export const PLAYER_WALK = 1.3 * 60, PLAYER_RUN = 2.3 * 60;
/** One screen at zoom 1, and the units in a metre (the 20 m car is 533 units). */
export const SCREEN_W = 960, UNITS_PER_M = METRO.len / 20;

// ---------------------------------------------------------------- the platform

/** The slab between a station's ceiling `C` and the street `S` over `W`: a concrete section, orange-rimmed where it is cut, the pavement on top. */
function paintSlab(x: X, W: number, C: number, S: number, streetTop: boolean) {
  R(x, 0, C, W, S - C, '#0c0a09');
  x.fillStyle = 'rgba(' + O + ',.07)'; for (let k = -40; k < W; k += 14) { x.beginPath(); x.moveTo(k, y(C)); x.lineTo(k + 10, y(C)); x.lineTo(k + 10 + (S - C), y(S)); x.lineTo(k + (S - C), y(S)); x.closePath(); x.fill(); }
  R(x, 0, C, W, 1, 'rgba(' + O + ',.45)');
  if (streetTop) {
    // the pavement and kerb up on the street, wet and dark
    R(x, 0, S - 1, W, 4, '#1a1612'); R(x, 0, S + 3, W, 1, 'rgba(' + PAPER + ',.16)');
    x.fillStyle = 'rgba(' + PAPER + ',.06)'; for (let k = 18; k < W; k += 36) x.fillRect(k, y(S + 3), 1, 4);
  } else R(x, 0, S - 1, W, 1, 'rgba(' + O + ',.45)');
}
/** A station box's end wall at `ex` (10 wide), down past the paving and up to the street. */
const endWall = (x: X, ex: number, S: number, rimRight: boolean) => { R(x, ex, -60, 10, S + 60, '#0e0b09'); R(x, ex + (rimRight ? 9 : 0), -60, 1, S + 60, 'rgba(' + O + ',.4)'); };
const END_WALLS = ['both', 'left', 'right', 'none'] as const;
const endsOf = (v: unknown, W: number): [number, boolean][] => {
  const e = END_WALLS.includes(v as typeof END_WALLS[number]) ? v : 'both';
  return [...(e === 'both' || e === 'left' ? [[0, true] as [number, boolean]] : []), ...(e === 'both' || e === 'right' ? [[W - 10, false] as [number, boolean]] : [])];
};

export const undergroundPlatformElement = piece({
  type: 'metro.underground-platform', label: 'Underground metro platform: tiled wall, ceiling lamps, slab, street above (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Length', 1600, 100, 10000, 1, 'units'),
    ceiling: num('Ceiling height', 124, 70, 400, 1, 'units'),
    street: num('Street level above', 150, 80, 600, 1, 'units'),
    name: text('Station name on the wall band', 'DOWNTOWN'),
    nameEvery: num('Name repeats every', 420, 80, 4000, 1, 'units'),
    tile: colour('Wall tile', '#1c2220'),
    band: colour('Name band', '#2a1608'),
    tileSize: num('Tile size', 8, 4, 24, 1, 'units'),
    lampEvery: num('Ceiling lamp every', 120, 30, 1000, 1, 'units'),
    lampAlpha: num('Lamp strength', 0.8, 0, 1, 0.05),
    edge: bool('Yellow edge line', true),
    streetTop: bool('Street pavement on top', true),
    endWalls: bool('End walls', true),
    ends: select('Which end walls (a ticket hall can join at one end)', END_WALLS, 'both'),
  },
  size: p => ({ w: N(p, 'width'), tall: N(p, 'street') + 6 }),
  bounds: p => ({ x: 0, h: N(p, 'street') + 6, w: N(p, 'width'), tall: N(p, 'street') + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: N(p, 'ceiling'), role: 'mount' }, street: { x: 0, h: N(p, 'street'), role: 'surface' } }),
  paint(x, p, o) {
    const W = N(p, 'width'), C = N(p, 'ceiling'), S = Math.max(C + 8, N(p, 'street')), ts = Math.max(4, N(p, 'tileSize'));
    const tile = hex(p.tile, '#1c2220'), band = hex(p.band, '#2a1608');
    paintSlab(x, W, C, S, !!p.streetTop);
    // the far wall across the track: tiles, a darker dado, grout lines
    R(x, 0, 0, W, C, tile);
    R(x, 0, 0, W, 30, 'rgba(0,0,0,.28)');
    x.fillStyle = 'rgba(' + PAPER + ',.05)';
    for (let h = ts; h < C; h += ts) x.fillRect(0, y(h), W, 1);
    for (let k = ts; k < W; k += ts * 1.5) x.fillRect(Math.round(k), y(C), 1, C);
    // the name band, high on the wall, with the station's name again and again
    const bh = Math.min(C - 22, 92);
    R(x, 0, bh, W, 13, band); R(x, 0, bh + 13, W, 1, 'rgba(' + O + ',.5)'); R(x, 0, bh - 1, W, 1, 'rgba(' + O + ',.5)');
    const every = Math.max(80, N(p, 'nameEvery'));
    for (let k = every / 2; k < W; k += every) say(x, String(p.name), k, bh + 6.5, 'rgba(' + PAPER + ',.8)', 8, '600');
    // the ceiling: a soffit with strip lamps and the cable tray
    R(x, 0, C - 6, W, 6, '#0a0807'); R(x, 0, C - 9, W, 1, 'rgba(' + O + ',.18)');
    const la = Math.max(0, Math.min(1, N(p, 'lampAlpha')));
    for (let k = N(p, 'lampEvery') / 2; k < W; k += Math.max(30, N(p, 'lampEvery'))) {
      R(x, k - 16, C - 6, 32, 3, 'rgba(255,240,215,' + (0.3 + la * 0.6).toFixed(2) + ')');
      const g = x.createLinearGradient(0, y(C - 6), 0, y(0)); g.addColorStop(0, 'rgba(255,235,200,' + (la * 0.09).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,235,200,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(k - 16, y(C - 6)); x.lineTo(k + 16, y(C - 6)); x.lineTo(k + 46, y(0)); x.lineTo(k - 46, y(0)); x.closePath(); x.fill();
      o.glow?.(k, C - 6, { kind: 'lamp', col: '255,235,200', r: 80, a: la * 0.7 });
    }
    if (p.endWalls) for (const [ex, rim] of endsOf(p.ends, W)) endWall(x, ex, S, rim);
    // the platform: its edge (a yellow line at the track), the paving coming towards us
    R(x, 0, -60, W, 60, '#110f0d');
    x.fillStyle = 'rgba(' + PAPER + ',.045)'; for (let h = -12; h > -60; h -= 12) x.fillRect(0, y(h), W, 1);
    for (let k = 20; k < W; k += 40) x.fillRect(k, y(0), 1, 60);
    R(x, 0, -1, W, 2, 'rgba(' + PAPER + ',.3)');
    if (p.edge) { R(x, 0, -7, W, 4, 'rgba(255,196,40,.7)'); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < W; k += 4) x.fillRect(k, y(-3), 1, 4); }
  },
});

// ---------------------------------------------------------------- the stairs up

export const metroStairsUpElement = piece({
  type: 'metro.stairs-up', label: 'Metro stairs up to the street: flight, slab opening, sign, railings (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    rises: select('Rises to the', ['left', 'right'], 'left'),
    run: num('Run (horizontal length)', 190, 40, 800, 1, 'units'),
    rise: num('Rise (the street above)', 150, 40, 600, 1, 'units'),
    ceiling: num('Ceiling height (where the slab starts)', 124, 40, 600, 1, 'units'),
    steps: num('Steps', 20, 4, 80, 1),
    sign: text('Hanging sign', 'WAY OUT · STREET'),
    signDrop: num('Sign hangs below the ceiling', 40, 8, 200, 1, 'units'),
    post: bool('METRO post at the top', true),
    lit: num('Light in the stairwell', 0.6, 0, 1, 0.05),
    flight: bool('Draw the flight (off: a walkable level stairs or escalator draws the steps)', true),
    hood: bool('Glass hood over the street opening', false),
  },
  // the origin is the foot of the flight; it rises over `run` to the `rises` side
  size: p => ({ w: N(p, 'run'), tall: N(p, 'rise') + 90 }),
  reach: p => N(p, 'run'),
  bounds: p => { const run = N(p, 'run'), left = p.rises !== 'right'; return { x: left ? -run - 10 : -10, h: N(p, 'rise') + 90, w: run + 20, tall: N(p, 'rise') + 90 }; },
  anchors: p => { const run = N(p, 'run'), d = p.rises === 'right' ? 1 : -1; return { origin: { x: 0, h: 0, role: 'origin' }, top: { x: d * run, h: N(p, 'rise'), role: 'surface' } }; },
  paint(x, p, o) {
    const run = N(p, 'run'), rise = N(p, 'rise'), C = Math.min(N(p, 'ceiling'), rise), n = Math.max(4, Math.round(N(p, 'steps')));
    const d = p.rises === 'right' ? 1 : -1, lit = Math.max(0, Math.min(1, N(p, 'lit')));
    const at = (f: number) => d * run * f; // x along the flight, f 0 (foot) .. 1 (top)
    // the opening in the slab: where the flight passes the ceiling with headroom, up to the street
    const f0 = Math.max(0, (C - 52) / rise), xa = at(f0), xb = at(1) + d * 8, l = Math.min(xa, xb), w = Math.abs(xb - xa);
    const g = x.createLinearGradient(0, y(rise), 0, y(C - 30));
    g.addColorStop(0, 'rgba(255,230,190,' + (0.05 * lit).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,230,190,' + (0.22 * lit).toFixed(3) + ')');
    R(x, l, C - 2, w, rise - C + 3, '#060504'); x.fillStyle = g; x.fillRect(Math.round(l), Math.round(y(rise + 1)), Math.round(w), Math.round(rise - C + 3));
    R(x, d > 0 ? l : l + w - 1, C - 2, 1, rise - C + 3, 'rgba(' + O + ',.35)');
    if (p.flight !== false) {
      // the flight: a concrete side under the steps, the treads with lit nosings
      x.fillStyle = '#17120e'; x.beginPath(); x.moveTo(0, y(0));
      for (let i = 0; i < n; i++) { const a = at(i / n), b = at((i + 1) / n), hh = rise * (i + 1) / n; x.lineTo(a, y(hh)); x.lineTo(b, y(hh)); }
      x.lineTo(at(1), y(0)); x.closePath(); x.fill();
      for (let i = 0; i < n; i++) { const a = at(i / n), b = at((i + 1) / n), hh = rise * (i + 1) / n; R(x, Math.min(a, b), hh - 1, Math.abs(b - a), 1, 'rgba(' + PAPER + ',' + (0.16 + 0.2 * lit * (1 - i / n)).toFixed(3) + ')'); }
      x.strokeStyle = 'rgba(' + O + ',.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y(0)); x.lineTo(at(1), y(rise)); x.stroke();
      // the handrail, waist high over the nosings, with its newel at the foot
      x.strokeStyle = 'rgba(' + O + ',.85)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-d * 6, y(24)); x.lineTo(at(1), y(rise + 24)); x.stroke();
      R(x, -d * 6 - 1, 0, 2, 24, 'rgba(' + O + ',.8)');
    } else {
      // a walkable flight or escalator (level kit) draws the steps; the well keeps its tiled side walls and a lamp over the opening
      const tile = 'rgba(' + PAPER + ',.05)';
      for (let hh = C - 2; hh < rise; hh += 8) R(x, l, hh, w, 1, tile);
      R(x, l + w / 2 - 12, C - 4, 24, 2, 'rgba(255,240,215,' + (0.3 + 0.6 * lit).toFixed(2) + ')');
      o.glow?.(l + w / 2, C - 4, { kind: 'lamp', col: '255,235,200', r: 70, a: 0.6 * lit });
    }
    // the railings round the opening, up on the street, and the METRO post
    R(x, l, rise + 24, w, 2, 'rgba(' + O + ',.8)');
    for (const k of [l, l + w / 2, l + w - 2]) R(x, k, rise, 2, 24, 'rgba(' + O + ',.8)');
    if (p.hood) {
      // a glass hood over the street opening: steel posts at both ends, a lit roof edge, clear side panes
      const top = rise + 64;
      R(x, l, rise + 26, w, top - rise - 26, 'rgba(150,200,220,.10)');
      for (const k of [l, l + w - 3]) R(x, k, rise, 3, top - rise, '#2a2c33');
      R(x, l - 6, top, w + 12, 5, '#1d1f24'); R(x, l - 6, top + 5, w + 12, 1, 'rgba(' + O + ',.7)'); R(x, l - 6, top - 1, w + 12, 1, 'rgba(255,235,200,.55)');
      o.glow?.(l + w / 2, top - 2, { kind: 'lamp', col: '255,235,200', r: 60, a: 0.5 });
    }
    if (p.post) {
      const px = at(1) + d * 14; R(x, px - 1, rise, 3, 70, '#2a160a'); R(x, px - 1, rise + 70, 3, 1, 'rgba(' + O + ',.6)');
      R(x, px - 20, rise + 70, 40, 12, '#04100f'); R(x, px - 20, rise + 82, 40, 1, 'rgba(0,255,255,.6)');
      say(x, 'METRO', px, rise + 76, 'rgba(0,255,255,.9)', 8, '600');
      o.glow?.(px, rise + 76, { kind: 'neon', col: '0,255,255', r: 30, a: 0.5 });
    }
    // the hanging sign by the foot, pointing up the flight
    const sign = String(p.sign);
    if (sign) {
      const sx = at(0.12), sw = Math.max(70, sign.length * 5 + 22), top = C - Math.max(8, N(p, 'signDrop'));
      R(x, sx - 0.5, top, 1, C - top, 'rgba(' + O + ',.5)');
      R(x, sx - sw / 2, top - 12, sw, 12, '#0a0705'); R(x, sx - sw / 2, top - 1, sw, 1, 'rgba(' + O + ',.7)');
      say(x, (d < 0 ? '< ' : '') + sign + (d > 0 ? ' >' : ''), sx, top - 6, 'rgba(' + PAPER + ',.9)', 7, '600');
      o.glow?.(sx, top - 6, { kind: 'screen', col: '255,217,165', r: 26, a: 0.3 });
    }
  },
});

// ---------------------------------------------------------------- the ticket hall

const hash01 = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
/** The LINE 0 map on the wall: a loop through its three stations, this one marked. */
function lineMap(x: X, l: number, h: number, here: string) {
  const w = 124, t = 46, stops = ['DOWNTOWN', 'GALLERIA', 'HARBOR'];
  R(x, l - 2, h - 2, w + 4, t + 4, '#2a2622'); R(x, l, h, w, t, '#d8cfbb');
  R(x, l, h + t - 10, w, 10, '#1a1612'); say(x, 'LINE 0 · LOOP', l + w / 2, h + t - 5, 'rgba(' + PAPER + ',.95)', 7, '600');
  // the loop: out along the top line, back along the bottom
  x.strokeStyle = 'rgba(' + O + ',.95)'; x.lineWidth = 2; x.beginPath(); x.moveTo(l + 14, y(h + 26)); x.lineTo(l + w - 14, y(h + 26)); x.arc(l + w - 14, y(h + 20), 6, -Math.PI / 2, Math.PI / 2); x.lineTo(l + 14, y(h + 14)); x.arc(l + 14, y(h + 20), 6, Math.PI / 2, Math.PI * 1.5); x.stroke();
  stops.forEach((s, i) => {
    const cx = l + 20 + i * 42, me = s === here.toUpperCase();
    R(x, cx - 2, h + 24, 5, 5, me ? '#b8122c' : '#1a1612');
    say(x, s, cx, h + 8, me ? 'rgba(160,20,40,.95)' : 'rgba(26,22,18,.9)', 7, me ? '600' : '');
  });
}
export const ticketHallElement = piece({
  type: 'metro.ticket-hall', label: 'Underground metro ticket hall: tiled walls, ticket office, machines, line map, gate line, slab and street above (kit)', category: 'architecture', libraryUse: 'reusable',
  fields: {
    width: num('Length', 620, 100, 4000, 1, 'units'),
    ceiling: num('Ceiling height', 124, 70, 400, 1, 'units'),
    street: num('Street level above', 150, 80, 600, 1, 'units'),
    name: text('Station name on the wall band', 'DOWNTOWN'),
    nameEvery: num('Name repeats every', 300, 80, 4000, 1, 'units'),
    tile: colour('Wall tile', '#27251f'),
    band: colour('Name band', '#2a1608'),
    tileSize: num('Tile size', 6, 4, 24, 1, 'units'),
    missing: num('Missing tiles', 0.025, 0, 0.3, 0.005),
    lampEvery: num('Ceiling lamp every', 100, 30, 1000, 1, 'units'),
    lampAlpha: num('Lamp strength', 0.8, 0, 1, 0.05),
    deadLamp: num('Flickering lamp (-1 none)', -1, -1, 40, 1),
    office: num('Ticket office at (-1 none)', 290, -1, 4000, 1, 'units'),
    officeText: text('Ticket office sign', 'TICKETS'),
    officeNote: text('Plate under the window', 'ID FOR ALL FARES'),
    machines: num('Ticket machines', 2, 0, 8, 1),
    machinesAt: num('Machines from', 400, 0, 4000, 1, 'units'),
    broken: num('Out-of-order machine (-1 none)', -1, -1, 7, 1),
    map: num('Line map at (-1 none)', 470, -1, 4000, 1, 'units'),
    gate: num('Gate line at (-1 none)', 580, -1, 4000, 1, 'units'),
    gateSign: text('Over the gate line', 'PAID AREA'),
    gateNote: text('Under it', 'TICKET AND ID BEYOND THIS POINT'),
    scanner: bool('ID camera and screen at the gate line', true),
    ends: select('End walls', END_WALLS, 'left'),
    streetTop: bool('Street pavement on top', true),
  },
  size: p => ({ w: N(p, 'width'), tall: N(p, 'street') + 6 }),
  bounds: p => ({ x: 0, h: N(p, 'street') + 6, w: N(p, 'width'), tall: N(p, 'street') + 60 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: N(p, 'ceiling'), role: 'mount' }, street: { x: 0, h: N(p, 'street'), role: 'surface' },
    ...(N(p, 'gate') >= 0 ? { gate: { x: N(p, 'gate'), h: 0, role: 'mount' as const } } : {}), ...(N(p, 'office') >= 0 ? { office: { x: N(p, 'office') + 46, h: 0, role: 'mount' as const } } : {}) }),
  paint(x, p, o) {
    const W = N(p, 'width'), C = N(p, 'ceiling'), S = Math.max(C + 8, N(p, 'street')), ts = Math.max(4, N(p, 'tileSize'));
    const tile = hex(p.tile, '#27251f'), band = hex(p.band, '#2a1608'), t = o.t;
    paintSlab(x, W, C, S, !!p.streetTop);
    // the wall: small old tiles, a dark dado, grout, a few tiles gone (nobody replaces them)
    R(x, 0, 0, W, C, tile); R(x, 0, 0, W, 34, 'rgba(0,0,0,.3)'); R(x, 0, 34, W, 2, 'rgba(' + O + ',.22)');
    x.fillStyle = 'rgba(' + PAPER + ',.055)';
    for (let h = ts; h < C; h += ts) x.fillRect(0, y(h), W, 1);
    for (let k = ts; k < W; k += ts) x.fillRect(Math.round(k), y(C), 1, C);
    const miss = N(p, 'missing');
    for (let k = 0, i = 0; k < W; k += ts, i++) for (let h = 36, j = 0; h < C - 10; h += ts, j++) if (hash01(i * 31 + j * 7 + 3) < miss) R(x, k + 1, h + 1, ts - 1, ts - 1, '#12110e');
    // the name band, as on the platform
    const bh = Math.min(C - 22, 92);
    R(x, 0, bh, W, 13, band); R(x, 0, bh + 13, W, 1, 'rgba(' + O + ',.5)'); R(x, 0, bh - 1, W, 1, 'rgba(' + O + ',.5)');
    const every = Math.max(80, N(p, 'nameEvery'));
    for (let k = every / 2; k < W; k += every) say(x, String(p.name), k, bh + 6.5, 'rgba(' + PAPER + ',.8)', 8, '600');
    // the ceiling: soffit, panel lamps (one flickers)
    R(x, 0, C - 6, W, 6, '#0a0807'); R(x, 0, C - 9, W, 1, 'rgba(' + O + ',.18)');
    const la = Math.max(0, Math.min(1, N(p, 'lampAlpha'))), dead = Math.round(N(p, 'deadLamp'));
    for (let k = N(p, 'lampEvery') / 2, i = 0; k < W; k += Math.max(30, N(p, 'lampEvery')), i++) {
      const on = i !== dead ? 1 : (Math.sin(t * 0.9) > 0.6 || Math.sin(t * 0.13) > 0.95 ? 0.9 : 0.08), a = la * on;
      R(x, k - 12, C - 6, 24, 3, 'rgba(255,240,215,' + (0.2 + a * 0.7).toFixed(2) + ')');
      const g = x.createLinearGradient(0, y(C - 6), 0, y(0)); g.addColorStop(0, 'rgba(255,235,200,' + (a * 0.08).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,235,200,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(k - 12, y(C - 6)); x.lineTo(k + 12, y(C - 6)); x.lineTo(k + 40, y(0)); x.lineTo(k - 40, y(0)); x.closePath(); x.fill();
      o.glow?.(k, C - 6, { kind: 'lamp', col: '255,235,200', r: 76, a: a * 0.7 });
    }
    // the ticket office: a booth set into the wall, a lit window with the clerk behind it, the counter and the sign
    const ox = N(p, 'office');
    if (ox >= 0) {
      R(x, ox - 3, 0, 98, 80, '#0b0a09'); R(x, ox - 3, 80, 98, 1, 'rgba(' + O + ',.6)'); R(x, ox - 3, 0, 1, 80, 'rgba(' + O + ',.35)'); R(x, ox + 94, 0, 1, 80, 'rgba(' + O + ',.35)');
      R(x, ox + 6, 34, 80, 30, '#3a2c1e');
      const g = x.createLinearGradient(0, y(64), 0, y(34)); g.addColorStop(0, 'rgba(255,220,170,.35)'); g.addColorStop(1, 'rgba(255,220,170,.05)');
      x.fillStyle = g; x.fillRect(ox + 6, Math.round(y(64)), 80, 30);
      // the clerk, a dark shape behind the glass, and the speak-through
      R(x, ox + 38, 34, 18, 12, '#15100c'); x.fillStyle = '#15100c'; x.beginPath(); x.arc(ox + 47, y(51), 5, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(150,200,220,.10)'; for (const k of [ox + 12, ox + 58]) { x.beginPath(); x.moveTo(k, y(34)); x.lineTo(k + 6, y(34)); x.lineTo(k + 16, y(64)); x.lineTo(k + 10, y(64)); x.closePath(); x.fill(); }
      R(x, ox + 6, 64, 80, 1, 'rgba(200,210,220,.4)'); R(x, ox + 46, 34, 1, 30, 'rgba(200,210,220,.25)');
      x.strokeStyle = 'rgba(200,200,200,.4)'; x.lineWidth = 1; x.beginPath(); x.arc(ox + 26, y(44), 3, 0, Math.PI * 2); x.stroke();
      R(x, ox - 4, 30, 100, 4, '#3b3e47'); R(x, ox - 4, 33, 100, 1, 'rgba(255,190,120,.35)'); R(x, ox + 36, 30, 22, 2, '#0b0a09');
      R(x, ox, 0, 92, 30, '#1a1714'); R(x, ox, 29, 92, 1, 'rgba(0,0,0,.5)');
      const note = String(p.officeNote);
      if (note) { R(x, ox + 6, 12, 80, 11, '#d8cfbb'); say(x, note, ox + 46, 17.5, 'rgba(26,22,18,.95)', 7, '600'); }
      R(x, ox + 6, 67, 80, 11, '#0a0705'); R(x, ox + 6, 77, 80, 1, 'rgba(' + O + ',.7)');
      say(x, String(p.officeText), ox + 46, 72.5, 'rgba(' + PAPER + ',.95)', 8, '600');
      o.light?.(ox + 46, 49, 80, 30, '255,214,160', 'window');
    }
    // the ticket machines: cabinets with a cyan screen (you can use them), a card slot, a tray; one may be out of order
    const mx = N(p, 'machinesAt'), nm = Math.max(0, Math.round(N(p, 'machines'))), broken = Math.round(N(p, 'broken'));
    for (let i = 0; i < nm; i++) {
      const l = mx + i * 34, dead = i === broken;
      R(x, l, 0, 26, 58, '#1d2126'); R(x, l, 58, 26, 2, '#2c3138'); R(x, l, 0, 1, 60, 'rgba(255,190,120,.3)'); R(x, l + 25, 0, 1, 60, 'rgba(0,0,0,.4)');
      R(x, l + 3, 32, 20, 18, '#04100f');
      if (dead) { R(x, l + 3, 32, 20, 18, '#1a0508'); x.strokeStyle = 'rgba(255,42,68,.7)'; x.lineWidth = 1; x.beginPath(); x.moveTo(l + 5, y(34)); x.lineTo(l + 21, y(48)); x.stroke(); }
      else {
        R(x, l + 3, 49, 20, 1, 'rgba(0,255,255,.7)');
        for (let r = 0; r < 4; r++) R(x, l + 5, 45 - r * 3.5, 6 + ((r * 5 + Math.floor(t / 40) + i * 3) % 11), 1, 'rgba(0,255,255,.55)');
        o.glow?.(l + 13, 41, { kind: 'screen', col: '0,255,255', r: 22, a: 0.35 });
      }
      R(x, l + 8, 24, 10, 2, '#050607'); R(x, l + 6, 8, 14, 6, '#0b0d10'); R(x, l + 6, 13, 14, 1, 'rgba(255,190,120,.25)');
      say(x, dead ? 'NO' : 'FARES', l + 13, 54.5, dead ? 'rgba(255,42,68,.8)' : 'rgba(' + PAPER + ',.7)', 7);
    }
    // the line map on the wall
    const mapAt = N(p, 'map');
    if (mapAt >= 0) lineMap(x, mapAt, 40, String(p.name));
    // the gate line: a gantry hung from the ceiling over the turnstiles, the ID camera and its screen
    const gx = N(p, 'gate');
    if (gx >= 0) {
      const sign = String(p.gateSign), note = String(p.gateNote), sw = Math.max(100, note.length * 4.4 + 12), top = C - 18;
      for (const k of [gx - sw / 2 + 8, gx + sw / 2 - 9]) R(x, k, top, 1, C - 6 - top, 'rgba(' + O + ',.5)');
      R(x, gx - sw / 2, top - 22, sw, 22, '#0a0705'); R(x, gx - sw / 2, top - 1, sw, 1, 'rgba(' + O + ',.75)'); R(x, gx - sw / 2, top - 22, sw, 1, 'rgba(' + O + ',.4)');
      say(x, sign, gx, top - 7, 'rgba(' + PAPER + ',.95)', 8, '600'); say(x, note, gx, top - 16, 'rgba(' + PAPER + ',.7)', 7);
      o.glow?.(gx, top - 11, { kind: 'screen', col: '255,217,165', r: 34, a: 0.3 });
      if (p.scanner) {
        // behind the barrier, a post with a camera on top (its red light blinks) and a small screen that says what it wants
        const px = gx + 34;
        R(x, px, 0, 3, 74, '#2a2c33'); R(x, px - 1, 0, 5, 2, '#3b3e47');
        R(x, px - 5, 74, 13, 7, '#1d1f24'); R(x, px - 9, 76, 4, 3, '#0b0b0d');
        if (Math.floor(t / 30) % 2 === 0) { R(x, px + 5, 79, 2, 1, 'rgba(255,42,68,.95)'); o.glow?.(px + 6, 79, { kind: 'neon', col: '255,42,68', r: 10, a: 0.5 }); }
        R(x, px - 20, 46, 44, 14, '#04100f'); R(x, px - 20, 59, 44, 1, 'rgba(255,42,68,.6)');
        say(x, Math.floor(t / 150) % 2 ? 'ID CHECK' : 'LOOK UP', px + 2, 52.5, 'rgba(255,90,110,.9)', 7, '600');
        o.glow?.(px + 2, 53, { kind: 'screen', col: '255,90,110', r: 24, a: 0.3 });
      }
    }
    if (W > 20) for (const [ex, rim] of endsOf(p.ends, W)) endWall(x, ex, S, rim);
    // the floor: terrazzo paving coming towards us, a worn lit strip along the wall
    R(x, 0, -60, W, 60, '#14110f');
    x.fillStyle = 'rgba(' + PAPER + ',.04)'; for (let h = -15; h > -60; h -= 15) x.fillRect(0, y(h), W, 1);
    for (let k = 30; k < W; k += 60) x.fillRect(k, y(0), 1, 60);
    R(x, 0, -1, W, 2, 'rgba(' + PAPER + ',.24)');
  },
});

// ---------------------------------------------------------------- the cut-open car

const CAR_FIELDS = {
  length: num('Car length', METRO.len, 120, 1200, 1, 'units'),
  ceiling: num('Ceiling height over the floor', 62, 44, 140, 1, 'units'),
  roof: num('Roof shell', 10, 2, 40, 1, 'units'),
  doors: num('Doors a side', METRO.doors.length, 1, 6, 1),
  doorWidth: num('Door width', METRO.doorW, 16, 80, 1, 'units'),
  doorHeight: num('Door height', 54, 40, 120, 1, 'units'),
  seats: bool('Seats along the far wall', true),
  seat: colour('Seat colour', '#5a2630'),
  body: colour('Body colour', '#14171a'),
  inside: colour('Inside wall colour', '#3b352e'),
  ghost: num('Near wall ghost (0 cut away, 1 solid)', 0.12, 0, 1, 0.05),
  open: num('Near doors open (threshold light)', 1, 0, 1, 0.1),
  light: num('Inside light', 0.85, 0, 1, 0.05),
};
interface CarLook { len: number; C: number; roof: number; doors: number; dw: number; dh: number; seats: boolean; seat: string; body: string; inside: string; ghost: number; open: number; light: number; cab: 'none' | 'left' | 'right'; plate: string; dest: string }
const carLook = (p: Properties, cab: CarLook['cab'], plate: string, dest: string): CarLook => ({
  len: N(p, 'length'), C: N(p, 'ceiling'), roof: N(p, 'roof'), doors: Math.max(1, Math.round(N(p, 'doors'))), dw: N(p, 'doorWidth'), dh: Math.min(N(p, 'doorHeight'), N(p, 'ceiling') - 4),
  seats: p.seats !== false, seat: hex(p.seat, '#5a2630'), body: hex(p.body, '#14171a'), inside: hex(p.inside, '#3b352e'),
  ghost: Math.max(0, Math.min(1, N(p, 'ghost'))), open: Math.max(0, Math.min(1, N(p, 'open'))), light: Math.max(0, Math.min(1, N(p, 'light'))), cab, plate, dest,
});
/** Where the doors are along a car (left edges), spread like the true-scale car's (train-car.ts METRO.doors). */
const doorLefts = (c: CarLook) => {
  const n = c.doors, a = METRO.doors[0], b = METRO.doors[METRO.doors.length - 1];
  return Array.from({ length: n }, (_, i) => Math.round((n === 1 ? 0.5 : a + (b - a) * i / (n - 1)) * c.len - c.dw / 2));
};
const CAB = 46;

/** One cut-open car, its left end at 0, its floor at h 0. */
function paintCar(x: X, c: CarLook, o: Paint) {
  const { len: L, C, roof } = c, doors = doorLefts(c), lit = c.light, cab0 = c.cab === 'left' ? CAB : 0, cab1 = c.cab === 'right' ? L - CAB : L;
  // the inside: the far wall, warm and lit, darker towards the floor
  const g = x.createLinearGradient(0, y(C), 0, y(0));
  g.addColorStop(0, c.inside); g.addColorStop(1, '#1a1612');
  x.fillStyle = g; x.fillRect(0, Math.round(y(C)), Math.round(L), Math.round(C));
  x.fillStyle = 'rgba(255,214,160,' + (0.16 * lit).toFixed(3) + ')'; x.fillRect(0, Math.round(y(C)), Math.round(L), Math.round(C * 0.6));
  // the far side: dark windows onto the tunnel between its shut doors, the advert cards over them
  const sill = 24, head = Math.min(C - 8, 54);
  const gaps: [number, number][] = []; let from = cab0 + 6;
  for (const dx of doors) { gaps.push([from, dx - 8]); from = dx + c.dw + 8; }
  gaps.push([from, cab1 - 6]);
  for (const [a, b] of gaps) {
    if (b - a < 12) continue;
    R(x, a, sill, b - a, head - sill, '#0b0f12');
    x.fillStyle = 'rgba(150,190,230,.08)'; for (let k = a + 8; k < b - 14; k += 70) { x.beginPath(); x.moveTo(k, y(sill)); x.lineTo(k + 8, y(sill)); x.lineTo(k + 20, y(head)); x.lineTo(k + 12, y(head)); x.closePath(); x.fill(); }
    for (let k = a + 60; k < b - 20; k += 60) R(x, k, sill, 2, head - sill, c.body);
    R(x, a, head + 1, b - a, 5, 'rgba(0,0,0,.25)');
    for (let k = a + 6, i = 0; k + 26 < b; k += 34, i++) R(x, k, head + 2, 26, 4, i % 3 === 0 ? 'rgba(' + O + ',.55)' : i % 3 === 1 ? 'rgba(' + PAPER + ',.35)' : 'rgba(0,200,200,.35)');
  }
  for (const dx of doors) {
    R(x, dx, 0, c.dw, c.dh, '#2a2e32'); R(x, dx + c.dw / 2, 0, 1, c.dh, 'rgba(0,0,0,.6)');
    R(x, dx + 4, c.dh - 24, c.dw / 2 - 7, 18, '#0b0f12'); R(x, dx + c.dw / 2 + 3, c.dh - 24, c.dw / 2 - 7, 18, '#0b0f12');
    R(x, dx - 2, c.dh, c.dw + 4, 2, 'rgba(' + O + ',.6)');
  }
  // seats along the far wall between the doors: backs against the wall, cushions, the base
  if (c.seats) for (const [a, b] of gaps) {
    if (b - a < 24) continue;
    R(x, a + 2, 14, b - a - 4, 14, c.seat); R(x, a + 2, 27, b - a - 4, 1, 'rgba(255,255,255,.12)');
    R(x, a, 9, b - a, 5, c.seat); R(x, a, 13, b - a, 1, 'rgba(255,255,255,.18)');
    R(x, a + 4, 0, b - a - 8, 9, '#141210');
    for (let k = a + 22; k < b - 10; k += 22) R(x, k, 14, 1, 14, 'rgba(0,0,0,.35)');
  }
  // the ceiling: a light strip all along, the handrail with straps, the cove
  R(x, 0, C - 4, L, 4, '#d8cdb8'); R(x, cab0 + 4, C - 3, cab1 - cab0 - 8, 2, 'rgba(255,248,230,' + (0.5 + 0.5 * lit).toFixed(2) + ')');
  R(x, cab0, C - 10, cab1 - cab0, 1, 'rgba(200,200,200,.6)');
  x.fillStyle = 'rgba(40,36,34,.85)'; for (let k = cab0 + 10; k < cab1 - 6; k += 15) { x.fillRect(Math.round(k), Math.round(y(C - 10)), 1, 7); x.fillRect(Math.round(k) - 2, Math.round(y(C - 17)), 5, 4); }
  for (let k = cab0 + 40; k < cab1; k += 80) o.glow?.(k, C - 4, { kind: 'lamp', col: '255,240,215', r: 50, a: 0.35 * lit });
  // poles by every door, floor to ceiling
  for (const dx of doors) for (const px of [dx - 6, dx + c.dw + 5]) { R(x, px, 0, 2, C - 4, 'rgba(210,210,215,.75)'); R(x, px + 1, 0, 1, C - 4, 'rgba(0,0,0,.3)'); }
  // the floor
  R(x, 0, 0, L, 2, '#2c2824'); R(x, 0, 2, L, 1, 'rgba(255,217,165,.12)');
  // the cab at a leading end: its bulkhead and door, the desk, the windscreen, the headlight
  if (c.cab !== 'none') {
    const lead = c.cab === 'left', bx = lead ? CAB : L - CAB - 4, ox = lead ? 0 : L - CAB;
    R(x, ox, 0, CAB, C, '#16191c');
    R(x, ox + (lead ? 4 : 18), 0, 24, 26, '#0e1114'); R(x, ox + (lead ? 4 : 18), 26, 24, 2, 'rgba(0,255,255,.5)');
    R(x, ox + (lead ? 3 : 15), 32, 28, 22, '#0b1418'); R(x, ox + (lead ? 3 : 15), 54, 28, 1, 'rgba(150,190,230,.4)');
    R(x, ox + (lead ? 2 : CAB - 9), 10, 7, 5, 'rgba(255,240,215,.95)');
    o.glow?.(ox + (lead ? 2 : CAB - 2), 12, { kind: 'head', col: '255,235,200', r: 90, a: 0.5, dir: lead ? -1 : 1 });
    R(x, bx, 0, 4, C, c.body); R(x, bx + 1, 6, 2, 44, 'rgba(' + PAPER + ',.18)');
    say(x, 'CAB', ox + CAB / 2, C - 18, 'rgba(' + PAPER + ',.35)', 6);
  }
  // the car's ends towards the gangways: the end wall over the doorway
  if (c.cab !== 'left') { R(x, 0, c.dh, 4, C - c.dh, c.body); R(x, 3, 0, 1, c.dh, 'rgba(' + O + ',.4)'); }
  if (c.cab !== 'right') { R(x, L - 4, c.dh, 4, C - c.dh, c.body); R(x, L - 4, 0, 1, c.dh, 'rgba(' + O + ',.4)'); }
  // the plate on the far wall
  if (c.plate) { const px = doors[doors.length - 1] - 30; R(x, px - 18, sill - 12, 36, 9, '#050302'); say(x, c.plate, px, sill - 7.5, 'rgba(255,217,165,.85)', 6, '600'); }
  // the near wall, cut away: a faint ghost of it between its doors, the door frames and lit thresholds
  if (c.ghost > 0) { let a = cab0; for (const dx of doors) { R(x, a, 0, dx - a, C, 'rgba(20,23,26,' + c.ghost.toFixed(3) + ')'); a = dx + c.dw; } R(x, a, 0, cab1 - a, C, 'rgba(20,23,26,' + c.ghost.toFixed(3) + ')'); }
  for (const dx of doors) {
    R(x, dx - 3, 0, 3, c.dh, c.body); R(x, dx + c.dw, 0, 3, c.dh, c.body);
    R(x, dx - 3, c.dh, c.dw + 6, 2, c.body);
    if (c.open > 0) { R(x, dx, 0, c.dw, 2, 'rgba(255,217,165,' + (0.85 * c.open).toFixed(3) + ')'); o.glow?.(dx + c.dw / 2, 4, { kind: 'lamp', col: '255,217,165', r: 34, a: 0.4 * c.open }); }
  }
  // the shell: the roof (its section edge in orange), the rim and the waist stripe on the cut
  R(x, 0, C, L, roof, c.body); R(x, 0, C, L, 1, 'rgba(' + O + ',.55)'); R(x, 0, C + roof - 1, L, 1, 'rgba(255,200,150,.25)');
  R(x, 0, -2, L, 2, c.body); R(x, 0, -2, L, 1, 'rgba(' + O + ',.5)');
  if (c.cab === 'left') { x.fillStyle = c.body; x.beginPath(); x.moveTo(0, y(C + roof)); x.quadraticCurveTo(-10, y(C * 0.5), 0, y(-2)); x.lineTo(0, y(C + roof)); x.fill(); }
  if (c.cab === 'right') { x.fillStyle = c.body; x.beginPath(); x.moveTo(L, y(C + roof)); x.quadraticCurveTo(L + 10, y(C * 0.5), L, y(-2)); x.lineTo(L, y(C + roof)); x.fill(); }
  if (c.dest && c.cab !== 'none') { const bx = c.cab === 'left' ? 52 : L - 152; R(x, bx, C + 1, 100, roof - 2, '#050302'); say(x, '0 > ' + c.dest, bx + 50, C + roof / 2, 'rgba(255,136,0,.9)', 6, '600'); }
}

/** The walk-through between two cars, its left end at 0: the floor plate, the bellows (the near half cut away). */
function paintGangway(x: X, len: number, C: number, roof: number, dh: number, body: string, light: number) {
  R(x, 0, 0, len, C + roof - 2, '#0e1012');
  x.fillStyle = 'rgba(70,74,80,.55)'; for (let k = 1; k < len; k += 3) x.fillRect(k, Math.round(y(C + roof - 2)), 1, Math.round(C + roof - 2));
  R(x, 0, 0, len, dh, 'rgba(255,214,160,' + (0.1 * light).toFixed(3) + ')');
  R(x, 0, dh, len, C + roof - 2 - dh, body); x.fillStyle = 'rgba(70,74,80,.8)'; for (let k = 1; k < len; k += 3) x.fillRect(k, Math.round(y(C + roof - 2)), 1, Math.round(C + roof - 2 - dh));
  R(x, 0, 0, len, 3, '#4a4640'); R(x, 0, 3, len, 1, 'rgba(255,217,165,.25)');
  R(x, 0, dh, len, 1, 'rgba(' + O + ',.4)');
}

export const cutawayCarElement = piece({
  type: 'metro.cutaway-car', label: 'Metro car cut open on the platform side: seats, poles, doors (kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: { ...CAR_FIELDS, cab: select('Driver’s cab', ['none', 'left', 'right'], 'none'), plate: text('Car plate', 'CAR 1'), destination: text('Destination (cab cars)', 'RING') },
  size: p => ({ w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  reach: () => 90,
  bounds: p => ({ x: -10, h: N(p, 'ceiling') + N(p, 'roof'), w: N(p, 'length') + 20, tall: N(p, 'ceiling') + N(p, 'roof') + 2 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: N(p, 'length'), h: 0, role: 'mount' }, seat: { x: 0, h: 14, role: 'surface' } }),
  paint(x, p, o) { paintCar(x, carLook(p, p.cab === 'left' || p.cab === 'right' ? p.cab : 'none', String(p.plate), String(p.destination)), o); },
});

export const gangwayElement = piece({
  type: 'metro.gangway', label: 'Metro gangway between two cars: floor plate and bellows (kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: { length: num('Length', 20, 6, 80, 1, 'units'), ceiling: CAR_FIELDS.ceiling, roof: CAR_FIELDS.roof, doorHeight: CAR_FIELDS.doorHeight, body: CAR_FIELDS.body, light: CAR_FIELDS.light },
  size: p => ({ w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  bounds: p => ({ x: 0, h: N(p, 'ceiling') + N(p, 'roof'), w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: N(p, 'length'), h: 0, role: 'mount' } }),
  paint(x, p) { paintGangway(x, N(p, 'length'), N(p, 'ceiling'), N(p, 'roof'), Math.min(N(p, 'doorHeight'), N(p, 'ceiling') - 4), hex(p.body, '#14171a'), N(p, 'light')); },
});

/** A whole train's length: `cars` cars and the gangways between them. */
export const cutawayTrainLength = (cars: number, len: number, gangway: number) => cars * len + Math.max(0, cars - 1) * gangway;
export const cutawayTrainElement = piece({
  type: 'metro.cutaway-train', label: 'Metro train cut open: cars coupled by walk-through gangways (kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    cars: num('Cars', 3, 1, 10, 1), gangway: num('Gangway length', 20, 6, 80, 1, 'units'), ...CAR_FIELDS,
    cabs: bool('Driver’s cabs at both ends', true), destination: text('Destination', 'RING'), firstCar: num('First car number', 1, 0, 99, 1),
  },
  size: p => ({ w: cutawayTrainLength(N(p, 'cars'), N(p, 'length'), N(p, 'gangway')), tall: N(p, 'ceiling') + N(p, 'roof') }),
  reach: () => 90,
  bounds: p => ({ x: -10, h: N(p, 'ceiling') + N(p, 'roof'), w: cutawayTrainLength(N(p, 'cars'), N(p, 'length'), N(p, 'gangway')) + 20, tall: N(p, 'ceiling') + N(p, 'roof') + 2 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: cutawayTrainLength(N(p, 'cars'), N(p, 'length'), N(p, 'gangway')), h: 0, role: 'mount' }, seat: { x: 0, h: 14, role: 'surface' } }),
  paint(x, p, o) {
    const cars = Math.max(1, Math.round(N(p, 'cars'))), len = N(p, 'length'), gw = N(p, 'gangway');
    for (let i = 0; i < cars; i++) {
      const c0 = i * (len + gw), cab: CarLook['cab'] = !p.cabs ? 'none' : i === 0 ? 'left' : i === cars - 1 ? 'right' : 'none';
      x.save(); x.translate(c0, 0);
      try { paintCar(x, carLook(p, cars === 1 && p.cabs ? 'left' : cab, 'CAR ' + (N(p, 'firstCar') + i), String(p.destination)), { ...o, glow: o.glow ? (lx, lh, g) => o.glow!(c0 + lx, lh, g) : undefined }); }
      finally { x.restore(); }
      if (i < cars - 1) { x.save(); x.translate(c0 + len, 0); try { paintGangway(x, gw, N(p, 'ceiling'), N(p, 'roof'), Math.min(N(p, 'doorHeight'), N(p, 'ceiling') - 4), hex(p.body, '#14171a'), N(p, 'light')); } finally { x.restore(); } }
    }
  },
});

// ---------------------------------------------------------------- the measuring bar

export const scaleRulerElement = piece({
  type: 'metro.scale-ruler', label: 'Style-frame measuring bar: screens, metres, walk and run time (kit)', category: 'markers', libraryUse: 'reusable',
  fields: {
    span: num('Measured length', SCREEN_W, 0, 20000, 1, 'units'),
    bar: bool('Draw the bar', true),
    screen: num('One screen (zoom 1)', SCREEN_W, 100, 4000, 1, 'units'),
    walk: num('Walking speed', PLAYER_WALK, 1, 1000, 1, 'units/s'),
    run: num('Running speed', PLAYER_RUN, 1, 1000, 1, 'units/s'),
    metre: num('Units in a metre', Math.round(UNITS_PER_M * 100) / 100, 1, 200, 0.01, 'units'),
    title: text('Title', ''),
    note: text('Notes (lines split by |)', ''),
    numbers: bool('Write the length, screens and times', true),
    below: bool('Text below the bar', false),
    ink: colour('Ink', '#00ffff'),
    size: num('Text size', 8, 5, 24, 1),
  },
  size: p => ({ w: Math.max(200, N(p, 'span')), tall: 80 }),
  bounds: p => ({ x: 0, h: p.below ? 8 : 80, w: Math.max(200, N(p, 'span')), tall: 88 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: N(p, 'span'), h: 0, role: 'mount' } }),
  paint(x, p) {
    const span = N(p, 'span'), scr = Math.max(1, N(p, 'screen')), ink = rgbOf(hex(p.ink, '#00ffff')), size = N(p, 'size');
    const col = (a: number) => 'rgba(' + ink + ',' + a + ')';
    if (p.bar && span > 0) {
      R(x, 0, -1, span, 2, col(0.85)); R(x, 0, -6, 2, 12, col(0.9)); R(x, span - 2, -6, 2, 12, col(0.9));
      for (let k = scr, i = 1; k < span - 4; k += scr, i++) { R(x, k - 1, -4, 2, 8, col(0.8)); say(x, i + ' SCREEN' + (i > 1 ? 'S' : ''), k, p.below ? 9 : -10, col(0.75), Math.max(5, size - 2)); }
      for (let k = scr / 2; k < span - 4; k += scr) R(x, k, -2, 1, 4, col(0.5));
    }
    const lines: { s: string; bold?: boolean }[] = [];
    if (String(p.title)) lines.push({ s: String(p.title), bold: true });
    if (p.numbers && span > 0) {
      const m = span / Math.max(0.01, N(p, 'metre'));
      lines.push({ s: Math.round(span).toLocaleString('en') + ' units ≈ ' + Math.round(m) + ' m · ' + (span / scr).toFixed(2) + ' screens' });
      lines.push({ s: 'walk ' + (span / N(p, 'walk')).toFixed(1) + ' s · run ' + (span / N(p, 'run')).toFixed(1) + ' s' });
    }
    for (const l of String(p.note).split('|').map(s => s.trim()).filter(Boolean)) lines.push({ s: l });
    const lh = size + 4, base = p.below ? -(p.bar ? 18 : 0) - size / 2 : (p.bar ? 12 : 0) + size / 2 + (lines.length - 1) * lh;
    lines.forEach((l, i) => say(x, l.s, 4, base - i * lh, col(l.bold ? 1 : 0.85), l.bold ? size + 1 : size, l.bold ? '600' : '', 'left'));
  },
});

// ---------------------------------------------------------------- the walkable consist (vehicle.*)

/*
 * The walkable train (docs/design/SEAMLESS-WORLD.md §4, decided 5 and 20: two cars joined by a gangway, a third possible).
 * The `metro.cutaway-*` pieces above draw a whole car as one picture; these split it into the parts a vehicle has, each
 * one placeable, so a later compiler can read a composition into world/vehicles.ts `VehicleSource`:
 * - `vehicle.car` → one `VehicleCar`: `length` is its `width`; its floor is the car's deck at h 0 (the default deck);
 *   its anchors `door0`… are the near doors' centres and `bay0`… the seat bays' left ends. The car is the inside, cut open
 *   on the near side, and always drawn: far wall, windows onto the outside, seats' wall, poles, straps, adverts, ceiling.
 * - `vehicle.car-shell` → `VehicleSource.shell`: the near side and roof seen from outside, attached to a `level.shell`
 *   handle of the vehicle's building, so it fades to the handle's ghost while the player is aboard. Same layout fields.
 * - `vehicle.door` → one `VehicleDoor` (`x` its centre, `w` its `width`): the near door pair; it draws open or shut from
 *   its visual field `open` (0 shut … 1 open), which a vehicle's doors mover would hand it (world/vehicles.ts `vehicleDoors`).
 * - `vehicle.gangway` → the consist's `gap` (its `length`) and `gangways: true`: the walk-through between cars (`face: far`),
 *   or the bellows' near side (`face: near`, attached to the shell handle so it fades with the shell).
 * - `vehicle.seat` → one `VehicleSeat` per place (`seat0`… anchors: a place's centre at the cushion's height).
 * The road, air, water and whole-train pieces (`vehicle.road`, `vehicle.air`, `vehicle.boat`, `vehicle.rail`) are whole
 * vehicles seen from outside; the names here are parts of a consist, after the model's own words.
 * Every piece is drawn in its own frame, the car's floor at h 0 (a platform at the same height boards level).
 */

/** The cab's depth at a leading end. */
export const CONSIST_CAB = 40;
/** The shared layout fields of a car and its shell: they must agree (scripts/game-tests/check-train-consist-art.mts). */
const CONSIST_FIELDS = {
  length: num('Car length', METRO.len, 120, 1600, 1, 'units'),
  ceiling: num('Ceiling height over the floor', 62, 46, 160, 1, 'units'),
  roof: num('Roof (shell over the ceiling)', 12, 4, 40, 1, 'units'),
  doors: num('Doors a side', METRO.doors.length, 1, 8, 1),
  doorWidth: num('Door width', METRO.doorW, 16, 90, 1, 'units'),
  doorHeight: num('Door height', 54, 42, 140, 1, 'units'),
  cab: select('Driver’s cab', ['none', 'left', 'right'], 'none'),
};
export interface ConsistCarLayout { L: number; C: number; roof: number; dw: number; dh: number; cab: 'none' | 'left' | 'right'; cab0: number; cab1: number; doors: number[]; bays: [number, number][] }
/** Where a car's parts are, from its layout fields: door centres spread like the true-scale car's (train-car.ts METRO.doors), and the seat bays between them. */
export function consistCarLayout(p: Properties): ConsistCarLayout {
  const L = N(p, 'length'), n = Math.max(1, Math.round(N(p, 'doors'))), dw = N(p, 'doorWidth'), C = N(p, 'ceiling');
  const cab = p.cab === 'left' || p.cab === 'right' ? p.cab : 'none', cab0 = cab === 'left' ? CONSIST_CAB : 0, cab1 = cab === 'right' ? L - CONSIST_CAB : L;
  const a = METRO.doors[0], b = METRO.doors[METRO.doors.length - 1];
  const doors = Array.from({ length: n }, (_, i) => Math.round((n === 1 ? 0.5 : a + (b - a) * i / (n - 1)) * L));
  const bays: [number, number][] = []; let from = cab0 + 6;
  for (const c of doors) { bays.push([from, c - dw / 2 - 8]); from = c + dw / 2 + 8; }
  bays.push([from, cab1 - 6]);
  return { L, C, roof: N(p, 'roof'), dw, dh: Math.min(N(p, 'doorHeight'), C - 4), cab, cab0, cab1, doors, bays: bays.filter(([l, r]) => r - l >= 24) };
}
const clamp01 = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d; };
/** A piece with visual state: its state fields are read in `paint` like its props (the names never overlap). */
function stateful(o: Parameters<typeof piece>[0] & { visualFields: Record<string, import('../core/composition').Field> }): Element {
  const e = piece(o);
  return { ...e, draw: (ctx, v, p, s, pass, at) => e.draw(ctx, v, { ...p, ...s }, s, pass, at) };
}
/** A pane of glass the world behind shows through: by day it holds the sky's sheen, at night the car's own lights. */
function pane(x: X, l: number, h: number, w: number, t: number, o: Paint, inner: number) {
  const night = o.lighting.night, day = o.lighting.daylight;
  R(x, l, h, w, t, 'rgba(150,185,210,' + (0.08 + 0.14 * day).toFixed(3) + ')');
  if (inner > 0) R(x, l, h, w, t, 'rgba(255,220,175,' + (0.22 * night * inner).toFixed(3) + ')');
  x.fillStyle = 'rgba(235,245,255,' + (0.05 + 0.07 * day).toFixed(3) + ')';
  for (let k = l + 6; k < l + w - 6; k += 46) { x.beginPath(); x.moveTo(k, y(h)); x.lineTo(k + 5, y(h)); x.lineTo(k + 5 + t * 0.5, y(h + t)); x.lineTo(k + t * 0.5, y(h + t)); x.closePath(); x.fill(); }
}
/** A rect with holes (the windows and doorways the world shows through), filled even-odd. */
function holed(x: X, l: number, h: number, w: number, t: number, holes: [number, number, number, number][], fill: string | CanvasGradient) {
  x.beginPath(); x.rect(Math.round(l), Math.round(y(h + t)), Math.round(w), Math.round(t));
  for (const [hl, hh, hw, ht] of holes) if (hw > 0 && ht > 0) x.rect(Math.round(hl), Math.round(y(hh + ht)), Math.round(hw), Math.round(ht));
  x.fillStyle = fill; x.fill('evenodd');
}
const SILL = 26, HEAD = 50;
/** The far side's windows: between the far doors, clear of the cab and the ends. */
const farWindows = (g: ConsistCarLayout): [number, number][] => {
  const out: [number, number][] = []; let from = g.cab0 + 8;
  for (const c of g.doors) { out.push([from, c - g.dw / 2 - 6]); from = c + g.dw / 2 + 6; }
  out.push([from, g.cab1 - 8]); return out.filter(([a, b]) => b - a >= 14);
};

export const vehicleCarElement = stateful({
  type: 'vehicle.car', label: 'Vehicle car, cut open: far wall, windows, poles, straps, adverts (consist kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    ...CONSIST_FIELDS,
    plate: text('Car plate', 'CAR 1'),
    inside: colour('Inside wall colour', '#3b352e'),
    ads: text('Advert cards along the cove (| between; fine print)', 'REGISTRY PREMIUM · FASTER CHECKS|NULLROUTE LOGISTICS|LINE 0 · ON TIME 61%'),
    notice: text('Notice card in the cove (over the widest window)', 'CAMERAS OPERATE IN THIS CAR'),
    camera: bool('Ceiling camera', true),
  },
  visualFields: { lit: num('Cabin lights (0 out: emergency light)', 1, 0, 1, 0.01), sway: num('Straps lean (-1 braking … 1 pulling away)', 0, -1, 1, 0.01) },
  size: p => ({ w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  reach: () => 60,
  bounds: p => ({ x: 0, h: N(p, 'ceiling') + N(p, 'roof'), w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  anchors: p => {
    const g = consistCarLayout(p);
    return { origin: { x: 0, h: 0, role: 'origin' as const }, end: { x: g.L, h: 0, role: 'mount' as const }, roof: { x: 0, h: g.C + g.roof, role: 'surface' as const },
      ...Object.fromEntries(g.doors.map((c, i) => ['door' + i, { x: c, h: 0, role: 'entrance' as const }])),
      ...Object.fromEntries(g.bays.map(([l], i) => ['bay' + i, { x: l, h: 0, role: 'mount' as const }])) };
  },
  paint(x, p, o) {
    const g = consistCarLayout(p), { L, C, dw, dh, cab0, cab1 } = g, lit = clamp01(p.lit, 1), sway = Math.max(-1, Math.min(1, Number(p.sway) || 0));
    const wins = farWindows(g), body = '#14171a';
    // the far wall, warm where the lights fall, with the windows and the far doors' panes open to the world behind
    const grad = x.createLinearGradient(0, y(C), 0, y(0)); grad.addColorStop(0, hex(p.inside, '#3b352e')); grad.addColorStop(1, '#17130f');
    const holes: [number, number, number, number][] = [...wins.map(([a, b]) => [a, SILL, b - a, HEAD - SILL] as [number, number, number, number]),
      ...g.doors.flatMap(c => [[c - dw / 2 + 3, dh - 26, dw / 2 - 5, 20], [c + 2, dh - 26, dw / 2 - 5, 20]] as [number, number, number, number][])];
    holed(x, cab0, 0, cab1 - cab0, C, holes, grad);
    x.fillStyle = 'rgba(255,214,160,' + (0.14 * lit).toFixed(3) + ')'; x.fillRect(Math.round(cab0), Math.round(y(C)), Math.round(cab1 - cab0), Math.round(C * 0.55));
    for (const [a, b] of wins) {
      pane(x, a, SILL, b - a, HEAD - SILL, o, lit);
      for (let k = a + 58; k < b - 16; k += 58) R(x, k, SILL, 2, HEAD - SILL, '#23262a');
      R(x, a - 1, SILL - 1, b - a + 2, 1, 'rgba(255,217,165,.22)'); R(x, a - 1, HEAD, b - a + 2, 1, '#0d0f11');
    }
    // the far doors, shut, with their panes
    for (const c of g.doors) {
      const l = c - dw / 2;
      holed(x, l, 0, dw, dh, [[l + 3, dh - 26, dw / 2 - 5, 20], [c + 2, dh - 26, dw / 2 - 5, 20]], '#30353a');
      pane(x, l + 3, dh - 26, dw / 2 - 5, 20, o, lit); pane(x, c + 2, dh - 26, dw / 2 - 5, 20, o, lit);
      R(x, c - 0.5, 0, 1, dh, 'rgba(0,0,0,.55)'); R(x, l - 2, dh, dw + 4, 2, 'rgba(' + O + ',.5)');
      R(x, l + 2, 0, dw - 4, 1, 'rgba(255,196,40,.35)');
    }
    // the cove over the windows: advert cards, the line map over the doors, one notice in plain words
    const ads = String(p.ads).split('|').map(s => s.trim()).filter(Boolean), notice = String(p.notice);
    const widest = wins.reduce((m, w, i) => w[1] - w[0] > wins[m][1] - wins[m][0] ? i : m, 0);
    let ai = 0;
    for (const [wi, [a, b]] of wins.entries()) {
      if (b - a < 40) continue;
      R(x, a, HEAD + 1, b - a, 7, 'rgba(0,0,0,.28)');
      let k = a + 4;
      if (notice && wi === widest) { const nw = Math.min(b - a - 8, notice.length * 2.6 + 10); R(x, k, HEAD + 1.5, nw, 6, 'rgba(240,236,228,.9)'); R(x, k, HEAD + 6.5, nw, 1, 'rgba(255,42,68,.85)'); say(x, notice, k + nw / 2, HEAD + 4.5, 'rgba(20,16,14,.95)', 4, '600'); k += nw + 6; }
      for (; ; ai++) {
        const words = ads.length ? ads[ai % ads.length] : '', cw = Math.max(30, words.length * 2.5 + 8);
        if (k + cw > b - 2) break;
        const hue = ai % 3 === 0 ? 'rgba(' + O + ',.55)' : ai % 3 === 1 ? 'rgba(' + PAPER + ',.4)' : 'rgba(120,170,190,.45)';
        R(x, k, HEAD + 2, cw, 5, hue);
        if (words) say(x, words, k + cw / 2, HEAD + 4.5, 'rgba(10,8,6,.8)', 4); else R(x, k + 2, HEAD + 3, 12, 1, 'rgba(0,0,0,.35)');
        k += cw + 6;
      }
    }
    for (const c of g.doors) { R(x, c - dw / 2, dh + 3, dw, 4, '#0b0908'); R(x, c - dw / 2 + 3, dh + 4.5, dw - 6, 1, 'rgba(' + O + ',.8)'); for (let k = 0; k < 5; k++) R(x, c - dw / 2 + 4 + k * (dw - 8) / 4, dh + 4, 1.5, 2, k === 2 ? 'rgba(255,240,215,.95)' : 'rgba(' + O + ',.9)'); }
    // the ceiling: the cove, the light strip, the lamps' light on the floor
    R(x, cab0, C - 5, cab1 - cab0, 5, '#cfc3ad'); R(x, cab0 + 4, C - 4, cab1 - cab0 - 8, 2, lit > 0.05 ? 'rgba(255,248,230,' + (0.35 + 0.65 * lit).toFixed(2) + ')' : 'rgba(90,120,170,.5)');
    if (lit < 1) { x.fillStyle = 'rgba(8,12,24,' + (0.55 * (1 - lit)).toFixed(3) + ')'; x.fillRect(Math.round(cab0), Math.round(y(C)), Math.round(cab1 - cab0), Math.round(C)); }
    for (let k = cab0 + 50; k < cab1 - 20; k += 90) o.glow?.(k, C - 4, { kind: 'lamp', col: '255,240,215', r: 56, a: 0.4 * lit });
    if (lit < 0.5) for (let k = cab0 + 80; k < cab1; k += 200) { R(x, k, C - 7, 6, 2, 'rgba(120,255,160,.8)'); o.glow?.(k + 3, C - 7, { kind: 'neon', col: '120,255,160', r: 24, a: 0.35 }); }
    // the handrail along the ceiling and its straps, leaning with the car's pull
    R(x, cab0 + 2, C - 11, cab1 - cab0 - 4, 1, 'rgba(205,205,210,.7)');
    x.strokeStyle = 'rgba(40,36,34,.9)'; x.lineWidth = 1;
    for (let k = cab0 + 10; k < cab1 - 6; k += 15) {
      if (g.doors.some(c => Math.abs(k - c) < dw / 2 + 2)) continue;
      const lean = sway * 3; x.beginPath(); x.moveTo(Math.round(k) + 0.5, y(C - 11)); x.lineTo(Math.round(k + lean) + 0.5, y(C - 18)); x.stroke();
      x.strokeStyle = 'rgba(220,215,200,.75)'; x.strokeRect(Math.round(k + lean) - 2 + 0.5, y(C - 18) + 0.5, 4, 3); x.strokeStyle = 'rgba(40,36,34,.9)';
    }
    // poles by every door, floor to ceiling, and one down each long bay
    const poles = [...g.doors.flatMap(c => [c - dw / 2 - 5, c + dw / 2 + 3]), ...g.bays.filter(([a, b]) => b - a > 70).map(([a, b]) => Math.round((a + b) / 2))];
    for (const px of poles) { R(x, px, 2, 2, C - 7, 'rgba(210,210,215,.8)'); R(x, px + 1, 2, 1, C - 7, 'rgba(0,0,0,.3)'); }
    // the floor and the near doors' thresholds: where you step on and off
    R(x, 0, 0, L, 2, '#2c2824'); R(x, 0, 2, L, 1, 'rgba(255,217,165,.1)');
    for (const c of g.doors) { R(x, c - dw / 2, 0, dw, 2, 'rgba(255,196,40,.65)'); R(x, c - dw / 2 - 3, 0, 3, dh, 'rgba(20,23,26,.8)'); R(x, c + dw / 2, 0, 3, dh, 'rgba(20,23,26,.8)'); R(x, c - dw / 2 - 3, dh, dw + 6, 2, 'rgba(20,23,26,.8)'); }
    // the ends: a doorway through to the gangway, or the cab behind its bulkhead
    const end = (left: boolean) => {
      const wx = left ? 0 : L - 4;
      if ((left && g.cab === 'left') || (!left && g.cab === 'right')) {
        const ox = left ? 0 : L - CONSIST_CAB, bx = left ? CONSIST_CAB - 4 : L - CONSIST_CAB;
        R(x, ox, 0, CONSIST_CAB, C, '#15181b');
        const wl = left ? ox + 3 : ox + 9; holed(x, ox, SILL, CONSIST_CAB, C - SILL - 6, [[wl, SILL + 2, 28, HEAD - SILL + 4]], '#15181b'); pane(x, wl, SILL + 2, 28, HEAD - SILL + 4, o, 0);
        R(x, left ? ox + 6 : ox + 10, 0, 22, 20, '#0d1013'); R(x, left ? ox + 6 : ox + 10, 20, 22, 2, 'rgba(255,136,0,.35)');
        R(x, left ? ox + 18 : ox + 14, 8, 8, 14, '#24282c'); R(x, left ? ox + 17 : ox + 13, 22, 10, 3, '#24282c');
        R(x, bx, 0, 4, C, body); R(x, bx + 1, 0, 2, 50, '#2a2e33'); R(x, bx + 1, 50, 2, 1, 'rgba(255,42,68,.7)');
        say(x, 'NO ENTRY', bx + 2 + (left ? 14 : -14), 44, 'rgba(' + PAPER + ',.55)', 5);
      } else {
        R(x, wx, dh, 4, C - dh, body); R(x, left ? wx + 3 : wx, 0, 1, dh, 'rgba(' + O + ',.4)');
        R(x, left ? wx : wx, 0, 4, dh, 'rgba(255,214,160,' + (0.08 * lit).toFixed(3) + ')');
      }
    };
    end(true); end(false);
    if (p.camera) { const cx = cab0 + (cab1 - cab0) * 0.5; R(x, cx - 4, C - 9, 8, 4, '#0b0b0d'); R(x, cx - 1, C - 9, 2, 1, 'rgba(255,42,68,' + (0.6 + 0.4 * Math.max(0, Math.sin(o.t / 20))).toFixed(2) + ')'); }
    // the car plate by the last door
    if (String(p.plate)) { const px = g.doors[g.doors.length - 1] + dw / 2 + 22; R(x, px - 14, 40, 28, 8, '#050302'); say(x, String(p.plate), px, 44, 'rgba(255,217,165,.85)', 5, '600'); }
    // the cut: roof in section, its edge orange, and the floor's edge
    R(x, 0, C, L, g.roof, '#0f1113'); R(x, 0, C, L, 1, 'rgba(' + O + ',.55)'); R(x, 0, C + g.roof - 1, L, 1, 'rgba(255,200,150,.2)');
    R(x, 0, -2, L, 2, body); R(x, 0, -2, L, 1, 'rgba(' + O + ',.45)');
  },
});

export const vehicleCarShellElement = stateful({
  type: 'vehicle.car-shell', label: 'Vehicle car shell: the near side and roof from outside, fades when aboard (consist kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    ...CONSIST_FIELDS,
    body: colour('Body colour', '#1a1e22'),
    stripe: colour('Line stripe', '#ff8800'),
    number: text('Fleet number', '0-2031'),
    destination: text('Destination (cab end)', 'LINE 0 · RING'),
  },
  visualFields: {},
  size: p => ({ w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') + 8 }),
  reach: p => p.cab === 'none' ? 0 : 120,
  bounds: p => ({ x: p.cab === 'left' ? -10 : 0, h: N(p, 'ceiling') + N(p, 'roof') + 8, w: N(p, 'length') + (p.cab === 'none' ? 0 : 10), tall: N(p, 'ceiling') + N(p, 'roof') + 14 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' as const }, end: { x: N(p, 'length'), h: 0, role: 'mount' as const } }),
  paint(x, p, o) {
    const g = consistCarLayout(p), { L, C, roof, dw, dh, cab } = g, top = C + roof, body = hex(p.body, '#1a1e22'), stripe = rgbOf(hex(p.stripe, '#ff8800'));
    const wins = farWindows(g), screen = cab === 'none' ? undefined : (cab === 'left' ? [3, SILL + 2, CONSIST_CAB - 12, HEAD - SILL + 6] : [L - CONSIST_CAB + 9, SILL + 2, CONSIST_CAB - 12, HEAD - SILL + 6]) as [number, number, number, number] | undefined;
    const holes: [number, number, number, number][] = [...wins.map(([a, b]) => [a, SILL, b - a, HEAD - SILL] as [number, number, number, number]), ...g.doors.map(c => [c - dw / 2, 0, dw, dh] as [number, number, number, number]), ...(screen ? [screen] : [])];
    // the body, a lit rim along its top, the nose at a cab end
    holed(x, 0, -4, L, top + 4, holes.map(([l, h, w, t]) => [l, h, w, t]), body);
    if (cab !== 'none') { const nx = cab === 'left' ? 0 : L, d = cab === 'left' ? -1 : 1; x.fillStyle = body; x.beginPath(); x.moveTo(nx, y(top)); x.quadraticCurveTo(nx + d * 12, y(C * 0.45), nx, y(-4)); x.closePath(); x.fill(); x.strokeStyle = 'rgba(' + O + ',.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(nx, y(top)); x.quadraticCurveTo(nx + d * 12, y(C * 0.45), nx, y(-4)); x.stroke(); }
    R(x, 0, top - 1, L, 1, 'rgba(255,200,150,.35)'); R(x, 0, top - 3, L, 1, 'rgba(255,255,255,.06)');
    for (const [a, b] of wins) { pane(x, a, SILL, b - a, HEAD - SILL, o, 1); for (let k = a + 58; k < b - 16; k += 58) R(x, k, SILL, 3, HEAD - SILL, body); R(x, a, SILL - 1, b - a, 1, '#0a0c0e'); R(x, a, HEAD, b - a, 1, 'rgba(255,255,255,.12)'); }
    if (screen) { pane(x, screen[0], screen[1], screen[2], screen[3], o, 0); R(x, screen[0], screen[1] + screen[3], screen[2], 1, 'rgba(255,255,255,.18)'); }
    // the line's stripe along the waist, broken by the doors; the fleet number and the line's roundel by the first door
    const runs: [number, number][] = []; let from = 0;
    for (const c of g.doors) { runs.push([from, c - dw / 2 - 3]); from = c + dw / 2 + 3; }
    runs.push([from, L]);
    for (const [a, b] of runs) { R(x, a, 16, b - a, 4, 'rgba(' + stripe + ',.85)'); R(x, a, 15, b - a, 1, 'rgba(0,0,0,.35)'); }
    const nx = g.doors[0] + dw / 2 + 16;
    R(x, nx - 5, 6, 10, 8, '#0b0d0f'); say(x, '0', nx, 10, 'rgba(' + stripe + ',.95)', 7, '600');
    if (String(p.number)) say(x, String(p.number), nx + 10, 10, 'rgba(' + PAPER + ',.45)', 5, '', 'left');
    // the door frames' rubber and the step plates under them
    for (const c of g.doors) { R(x, c - dw / 2 - 2, 0, 2, dh, '#0b0d0f'); R(x, c + dw / 2, 0, 2, dh, '#0b0d0f'); R(x, c - dw / 2 - 2, dh, dw + 4, 2, '#0b0d0f'); R(x, c - dw / 2 - 2, -4, dw + 4, 3, '#3a3d41'); }
    // the skirt under the floor and the roof gear: air conditioning pods, conduit
    R(x, 0, -4, L, 1, 'rgba(' + O + ',.3)');
    for (const k of [0.25, 0.7]) { const ax = Math.round(L * k); R(x, ax - 32, top, 64, 6, '#22262b'); R(x, ax - 32, top + 6, 64, 1, 'rgba(255,200,150,.3)'); for (let j = ax - 26; j < ax + 28; j += 6) R(x, j, top + 1, 3, 4, '#15181b'); }
    R(x, 0, top + 1, L, 1, '#2a2e33');
    // a cab end: the headlight, the tail light on the far end of the train, the destination board over the windscreen
    if (cab !== 'none') {
      const left = cab === 'left', hx = left ? 2 : L - 9;
      R(x, hx, 6, 7, 4, 'rgba(255,240,215,.95)'); o.glow?.(left ? 2 : L - 2, 8, { kind: 'head', col: '255,235,200', r: 110, a: 0.55, dir: left ? -1 : 1 });
      R(x, left ? 6 : L - 14, 2, 8, 2, 'rgba(255,42,68,.85)');
      const bx = left ? 6 : L - CONSIST_CAB - 70, bw = CONSIST_CAB + 64;
      R(x, bx, HEAD + 4, bw, 8, '#050302'); say(x, String(p.destination), bx + bw / 2, HEAD + 8, 'rgba(255,136,0,.95)', 6, '600');
      o.glow?.(bx + bw / 2, HEAD + 8, { kind: 'screen', col: '255,136,0', r: 30, a: 0.35 });
    }
  },
});

export const vehicleDoorElement = stateful({
  type: 'vehicle.door', label: 'Vehicle door pair: slides open and shut from its state (consist kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: { width: num('Door width (opening)', METRO.doorW, 16, 90, 1, 'units'), height: num('Door height', 54, 42, 140, 1, 'units'), leaf: colour('Leaf colour', '#3a3f45'), button: bool('Door button (cyan)', true) },
  visualFields: { open: num('Open (0 shut … 1 open; at its berth a train rests open)', 1, 0, 1, 0.01) },
  size: p => ({ w: N(p, 'width'), tall: N(p, 'height') + 8 }),
  reach: () => 30,
  bounds: p => ({ x: -N(p, 'width') / 2 - 4, h: N(p, 'height') + 8, w: N(p, 'width') + 8, tall: N(p, 'height') + 8 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'entrance' as const }, top: { x: 0, h: N(p, 'height'), role: 'mount' as const } }),
  paint(x, p, o) {
    const w = N(p, 'width'), h = N(p, 'height'), hw = w / 2, open = clamp01(p.open, 1), shift = open * (hw - 1), leaf = hex(p.leaf, '#3a3f45');
    // the opening: lit from inside while it is open
    if (open > 0) { R(x, -hw, 0, w, h, 'rgba(255,214,160,' + (0.06 * open).toFixed(3) + ')'); R(x, -hw, 0, w, 2, 'rgba(255,217,165,' + (0.8 * open).toFixed(3) + ')'); o.glow?.(0, 4, { kind: 'lamp', col: '255,217,165', r: 36, a: 0.4 * open }); }
    // the two leaves, sliding into the body (clipped to the opening), each with a big pane
    x.save(); x.beginPath(); x.rect(Math.round(-hw), Math.round(y(h)), Math.round(w), Math.round(h)); x.clip();
    for (const [l] of [[-hw - shift], [shift]] as [number][]) {
      if (hw - 0.5 <= 0) continue;
      holed(x, l, 0, hw, h, [[l + 3, h - 30, hw - 6, 24]], leaf);
      pane(x, l + 3, h - 30, hw - 6, 24, o, 1);
      R(x, l, 0, hw, 1, '#1a1c1f'); R(x, l + 3, 14, hw - 6, 1, 'rgba(255,196,40,.45)');
    }
    if (open < 0.02) R(x, -0.5, 0, 1, h, 'rgba(0,0,0,.65)');
    x.restore();
    // the frame, and over it the door lamp: green open, red while the doors move, dark shut
    R(x, -hw - 2, h, w + 4, 2, '#0b0d0f');
    const lamp = open >= 0.98 ? '124,255,154' : open > 0.02 ? '255,42,68' : '';
    R(x, -3, h + 3, 6, 3, lamp ? 'rgba(' + lamp + ',.95)' : '#202326');
    if (lamp) o.glow?.(0, h + 4, { kind: 'neon', col: lamp, r: 18, a: 0.5 });
    if (p.button) { R(x, hw + 2, 22, 3, 5, '#0b0d0f'); R(x, hw + 2.5, 23, 2, 3, 'rgba(0,255,255,' + (open >= 0.98 ? 0.5 : 0.9).toFixed(2) + ')'); }
  },
});

export const vehicleGangwayElement = stateful({
  type: 'vehicle.gangway', label: 'Vehicle gangway between two cars: walk-through or its near bellows (consist kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    face: select('Side (far: the walk-through; near: the outside bellows, on the shell)', ['far', 'near'], 'far'),
    length: num('Length (the gap between the cars)', 20, 6, 80, 1, 'units'), ceiling: CONSIST_FIELDS.ceiling, roof: CONSIST_FIELDS.roof, doorHeight: CONSIST_FIELDS.doorHeight,
    body: colour('Bellows colour', '#101214'),
  },
  visualFields: { open: num('Passage open (0: its door shut and locked)', 1, 0, 1, 0.01) },
  size: p => ({ w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') }),
  bounds: p => ({ x: 0, h: N(p, 'ceiling') + N(p, 'roof'), w: N(p, 'length'), tall: N(p, 'ceiling') + N(p, 'roof') + 4 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' as const }, end: { x: N(p, 'length'), h: 0, role: 'mount' as const } }),
  paint(x, p, o) {
    const len = N(p, 'length'), C = N(p, 'ceiling'), top = C + N(p, 'roof') - 2, dh = Math.min(N(p, 'doorHeight'), C - 4), body = hex(p.body, '#101214'), open = clamp01(p.open, 1);
    const pleats = (h0: number, h1: number, a: number) => { x.fillStyle = 'rgba(70,74,80,' + a + ')'; for (let k = 1; k < len; k += 3) x.fillRect(Math.round(k), Math.round(y(h1)), 1, Math.round(h1 - h0)); };
    if (p.face === 'near') { R(x, 0, -2, len, top + 2, body); pleats(-2, top, 0.8); R(x, 0, top, len, 1, 'rgba(255,200,150,.25)'); R(x, 0, 16, len, 4, 'rgba(0,0,0,.4)'); return; }
    R(x, 0, 0, len, top, body); pleats(0, top, 0.5);
    // the passage: light from both cars, the floor plate over the coupling, its header
    R(x, 0, 0, len, dh, 'rgba(255,214,160,.10)');
    R(x, 0, 0, len, 3, '#4a4640'); x.fillStyle = 'rgba(255,217,165,.18)'; for (let k = 1; k < len; k += 4) x.fillRect(Math.round(k), Math.round(y(3)), 2, 1);
    R(x, 0, dh, len, top - dh, body); pleats(dh, top, 0.8); R(x, 0, dh, len, 1, 'rgba(' + O + ',.4)');
    // shut: the gangway door across the passage, its lamp red
    if (open < 1) {
      const lw = len * (1 - open); R(x, 0, 0, lw, dh, '#2a2e33'); R(x, 1, dh - 20, Math.max(0, lw - 2), 12, 'rgba(150,185,210,.12)');
      R(x, len / 2 - 2, dh + 3, 4, 3, 'rgba(255,42,68,.9)'); o.glow?.(len / 2, dh + 4, { kind: 'neon', col: '255,42,68', r: 16, a: 0.4 });
    }
  },
});

export const SEAT_STYLES = ['bench', 'priority', 'tip-up'] as const;
export const vehicleSeatElement = stateful({
  type: 'vehicle.seat', label: 'Vehicle seat bench along the far wall: places to sit (consist kit)', category: 'vehicles', libraryUse: 'reusable',
  fields: {
    places: num('Places', 4, 1, 12, 1), place: num('Place width', 20, 14, 40, 1, 'units'),
    style: select('Style (priority: kept for those who need it; tip-up: folded against the wall)', [...SEAT_STYLES], 'bench'),
    cushion: num('Seat height (people sit at h + this)', 14, 8, 24, 1, 'units'),
    colour: colour('Cushion colour', '#5a2630'),
  },
  visualFields: {},
  size: p => ({ w: N(p, 'places') * N(p, 'place'), tall: 32 }),
  bounds: p => ({ x: 0, h: 32, w: N(p, 'places') * N(p, 'place'), tall: 32 }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' as const }, ...Object.fromEntries(Array.from({ length: Math.max(1, Math.round(N(p, 'places'))) }, (_, i) => ['seat' + i, { x: (i + 0.5) * N(p, 'place'), h: N(p, 'cushion'), role: 'surface' as const }])) }),
  paint(x, p) {
    const n = Math.max(1, Math.round(N(p, 'places'))), pw = N(p, 'place'), W = n * pw, s = N(p, 'cushion'), style = String(p.style);
    const seat = style === 'priority' ? '#2c4a6a' : hex(p.colour, '#5a2630');
    if (style === 'tip-up') {
      // folded up against the wall: the pans standing, a rail to lean on
      for (let i = 0; i < n; i++) { R(x, i * pw + 2, s - 2, pw - 4, 16, seat); R(x, i * pw + 2, s + 13, pw - 4, 1, 'rgba(255,255,255,.12)'); R(x, i * pw + pw / 2 - 1, 2, 2, s - 4, '#141210'); }
      R(x, 0, s + 18, W, 2, 'rgba(210,210,215,.7)'); return;
    }
    R(x, 0, s, W, 16, seat); R(x, 0, s + 15, W, 1, 'rgba(255,255,255,.12)');
    R(x, -1, s - 5, W + 2, 5, seat); R(x, -1, s - 1, W + 2, 1, 'rgba(255,255,255,.18)');
    R(x, 3, 0, W - 6, s - 5, '#141210'); x.fillStyle = 'rgba(255,136,0,.12)'; for (let k = 6; k < W - 6; k += 4) x.fillRect(Math.round(k), Math.round(y(s - 7)), 2, 2);
    for (let i = 1; i < n; i++) R(x, i * pw, s + 1, 1, 14, 'rgba(0,0,0,.35)');
    R(x, -2, 0, 2, s + 8, 'rgba(210,210,215,.75)'); R(x, W, 0, 2, s + 8, 'rgba(210,210,215,.75)');
    if (style === 'priority') { R(x, W / 2 - 5, s + 20, 10, 8, '#e8ecef'); R(x, W / 2 - 1, s + 21, 2, 2, '#2c4a6a'); R(x, W / 2 - 2, s + 23, 4, 3, '#2c4a6a'); }
  },
});

export const metroKitElements: Element[] = [undergroundPlatformElement, ticketHallElement, metroStairsUpElement, cutawayCarElement, gangwayElement, cutawayTrainElement, scaleRulerElement,
  vehicleCarElement, vehicleCarShellElement, vehicleDoorElement, vehicleGangwayElement, vehicleSeatElement];
