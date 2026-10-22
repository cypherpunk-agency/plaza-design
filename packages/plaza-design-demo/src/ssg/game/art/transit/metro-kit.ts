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

export const metroKitElements: Element[] = [undergroundPlatformElement, ticketHallElement, metroStairsUpElement, cutawayCarElement, gangwayElement, cutawayTrainElement, scaleRulerElement];
