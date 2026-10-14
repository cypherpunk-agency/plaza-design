/**
 * The city as one place you travel through: Downtown's doors, the metro line
 * (Downtown, Galleria, Harbor), the sky-taxi stands, and the city map. The map
 * is the overlay the taxi and the train use to pick a destination, and a screen
 * of its own (`drawCityMap` in 'view' mode) for a menu to show.
 *
 * Canvas drawing only. Places you have been are remembered in the save as
 * `flags['seen:<zone>']`; the map labels those and shows the rest as `???`.
 */

import type { SceneId } from './scenes';
import { box, C, GREEN, O, onScreen, PAPER, RED, rng, sign, tell, text, type View } from './scenes/kit';

export type Zone = 'downtown' | 'yard' | 'capsule' | SceneId;

/**
 * Where a new game starts: Capsule 7B, the player's flat. The intro cutscene
 * hands over to it (cutscenes.json `next`), and a save that has never been
 * Downtown starts there too.
 */
export const START_ZONE = 'capsule' satisfies Zone;

export const seenFlag = (zone: Zone) => 'seen:' + zone;

/**
 * Downtown's ways out, by where they sit on the street (world x). Coming back
 * through one of them lands you in front of it.
 * - market: the NEON MARKET gate at the west end (opens once Downtown is cleared)
 * - shop: the corner shop's door (the front at 150)
 * - yard: the fixer's back yard, past the noodle stall
 * - capsule: your building's lobby, the narrow tower at 1200: the lift up to your flat (Capsule 7B)
 * - metro: stairs down, in front of the shuttered front at 1420
 * - taxi: the sky-taxi pad at the east end, past the SPACEPORT sign
 */
export const DOORS = { market: 70, shop: 242, yard: 972, capsule: 1230, metro: 1440, taxi: 1930 } as const;
export type DoorId = keyof typeof DOORS;
export const isDoorId = (id: string): id is DoorId => Object.prototype.hasOwnProperty.call(DOORS, id);

/**
 * Walk-off exits for the zones that are not scenes (scenes list theirs as exits
 * with `edge`): walking into that border takes you there, no E. The yard's
 * passage at its left edge opens onto Downtown's alley.
 */
export const EDGES: Partial<Record<Zone, Partial<Record<'left' | 'right', { to: Zone; at: string }>>>> = {
  yard: { left: { to: 'downtown', at: 'yard' } },
};

// ---------- the metro ----------

export type Station = 'downtown' | 'galleria' | 'harbor';
export const LINE: Station[] = ['downtown', 'galleria', 'harbor'];
/** Each station: its name, the zone you step out into and the door you land at there. */
export const STATIONS: Record<Station, { name: string; zone: Zone; at: string }> = {
  downtown: { name: 'DOWNTOWN', zone: 'metro', at: 'train' },
  galleria: { name: 'GALLERIA', zone: 'mall', at: 'metro' },
  harbor: { name: 'HARBOR', zone: 'harbor', at: 'metro' },
};
/** The station you board at from a zone (the metro platform is Downtown's). */
export const stationOf = (zone: Zone): Station => (zone === 'mall' ? 'galleria' : zone === 'harbor' ? 'harbor' : 'downtown');
/** Frames for the doors to close, and for the ride between two stops. */
export const DOORS_CLOSE = 30, RIDE = 240;

// ---------- sky taxis ----------

export type Stand = 'downtown' | 'galleria' | 'harbor';
export const STAND_IDS: Stand[] = ['downtown', 'galleria', 'harbor'];
/** Each stand: its name and the zone it is in; you land at that zone's `taxi` door. */
export const STANDS: Record<Stand, { name: string; zone: Zone }> = {
  downtown: { name: 'DOWNTOWN EAST', zone: 'downtown' },
  galleria: { name: 'GALLERIA ROOF', zone: 'mall' },
  harbor: { name: 'HARBOR PIER', zone: 'harbor' },
};
export const standOf = (zone: Zone): Stand | null => (zone === 'downtown' ? 'downtown' : zone === 'mall' ? 'galleria' : zone === 'harbor' ? 'harbor' : null);
export const FARE = 1;
/** Frames of flight between two stands. */
export const FLIGHT = 200;
export const DRIVER_BROKE = ['One token a ride. You have the look of someone with zero.', 'Walking is free. Very popular with people like you.'];

// ---------- the map ----------

/** Map units: the city is 320 × 180. */
const DISTRICTS: { zone: Zone; name: string; x: number; y: number; w: number; h: number }[] = [
  { zone: 'market', name: 'NEON MARKET', x: 10, y: 60, w: 66, h: 54 },
  { zone: 'downtown', name: 'DOWNTOWN', x: 84, y: 50, w: 106, h: 78 },
  { zone: 'mall', name: 'GALLERIA', x: 198, y: 10, w: 78, h: 58 },
  { zone: 'harbor', name: 'HARBOR', x: 204, y: 108, w: 100, h: 40 },
];
/** Smaller places inside Downtown: [x, y, label, zone that must be seen to label it ('' = always)]. */
const SPOTS: Record<string, [number, number, string, Zone | '']> = {
  shop: [98, 112, 'SHOP', 'shop'],
  yard: [150, 116, 'YARD', 'yard'],
  home: [166, 74, '7B', ''],
};
const STATION_AT: Record<Station, [number, number]> = { downtown: [126, 120], galleria: [216, 58], harbor: [236, 134] };
const PAD_AT: Record<Stand, [number, number]> = { downtown: [182, 60], galleria: [266, 18], harbor: [294, 124] };
const GATE_AT: [number, number] = [80, 90];

const BLOCKS = (() => {
  const r = rng(7), out: [number, number, number, number, number][] = [];
  DISTRICTS.forEach((d, di) => {
    for (let yy = d.y + 13; yy < d.y + d.h - 5; yy += 7) for (let xx = d.x + 4; xx < d.x + d.w - 6; xx += 8) if (r() < 0.55) out.push([di, xx, yy, 4 + Math.floor(r() * 3), 4]);
  });
  return out;
})();
const RIPPLES = (() => { const r = rng(9); return Array.from({ length: 26 }, () => [152 + r() * 166, 150 + r() * 28, 4 + r() * 8]); })();

export interface MapState {
  /** 'view': just the map (a menu's screen); 'taxi': pick a stand; 'metro': pick a stop. */
  mode: 'view' | 'taxi' | 'metro';
  /** Stand ids (taxi) or station ids (metro). */
  options: string[];
  index: number;
  zone: Zone;
  /** The train's current stop, for "you are here" while riding. */
  station: Station;
  seen: (zone: Zone) => boolean;
  gateOpen: boolean;
  tokens: number;
  t: number;
}

function herePoint(st: MapState): [number, number] {
  const z = st.zone;
  if (st.mode === 'taxi') { const s = standOf(z); if (s) return PAD_AT[s]; }
  if (z === 'metro') return STATION_AT.downtown;
  if (z === 'train') return STATION_AT[st.station];
  if (z === 'shop') return [SPOTS.shop[0], SPOTS.shop[1]];
  if (z === 'yard') return [SPOTS.yard[0], SPOTS.yard[1]];
  if (z === 'capsule') return [SPOTS.home[0], SPOTS.home[1]];
  const d = DISTRICTS.find((q) => q.zone === z);
  return d ? [d.x + d.w / 2, d.y + d.h / 2 + 6] : [137, 95];
}

/**
 * The city map, a retro pixel overlay over the whole view (vw × vh, in the
 * game's world units). Districts as blocks, the metro line across them, taxi
 * pads, a blinking you-are-here; places you have not been are `???`.
 */
export function drawCityMap(x: CanvasRenderingContext2D, vw: number, vh: number, st: MapState) {
  const w = Math.min(vw - 12, 440), h = Math.min(vh - 12, 272), ox = Math.round((vw - w) / 2), oy = Math.round((vh - h) / 2);
  const blink = Math.floor(st.t / 20) % 2 === 0;
  x.save();
  x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(0, 0, vw, vh);
  box(x, ox, oy, w, h, '#040201', 'rgba(' + O + ',.9)');
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.lineWidth = 1; x.strokeRect(ox + 3.5, oy + 3.5, w - 7, h - 7);
  text(x, 'CITY MAP', ox + 10, oy + 13, 'rgba(' + O + ',.95)', 9, '600', 'left');
  const sub = st.mode === 'taxi' ? 'SKY TAXI · ' + FARE + ' TOKEN A RIDE · TOKENS ' + st.tokens : st.mode === 'metro' ? 'LINE 0 · CHOOSE A STOP' : 'PLAZA CENTRAL';
  text(x, sub, ox + w - 10, oy + 13, 'rgba(' + PAPER + ',.75)', 7, '', 'right');

  // the map itself, scaled to fit between the title and the footer
  const mx0 = ox + 8, my0 = oy + 24, mw = w - 16, mh = h - 24 - 32;
  const s = Math.min(mw / 320, mh / 180), mx = mx0 + (mw - 320 * s) / 2, my = my0 + (mh - 180 * s) / 2;
  const P = (X: number, Y: number): [number, number] => [Math.round(mx + X * s), Math.round(my + Y * s)];
  const R = (X: number, Y: number, W: number, H: number, fill: string) => {
    const [a, b] = P(X, Y); x.fillStyle = fill; x.fillRect(a, b, Math.max(1, Math.round(W * s)), Math.max(1, Math.round(H * s)));
  };
  const frame = (X: number, Y: number, W: number, H: number, col: string) => {
    const [a, b] = P(X, Y); x.strokeStyle = col; x.strokeRect(a + 0.5, b + 0.5, Math.round(W * s) - 1, Math.round(H * s) - 1);
  };
  // the bay, south and east
  R(150, 150, 170, 30, '#020812'); R(308, 90, 12, 60, '#020812');
  for (const [rx, ry, len] of RIPPLES) R(rx, ry, len, 1, 'rgba(170,210,255,.16)');
  // roads between the districts
  x.strokeStyle = 'rgba(' + O + ',.22)'; x.lineWidth = Math.max(1, Math.round(2 * s));
  x.beginPath();
  for (const [a, b] of [[[76, 90], [84, 90]], [[190, 66], [198, 50]], [[190, 118], [204, 124]], [[236, 68], [244, 108]]] as [number, number][][]) {
    const p0 = P(a[0], a[1]), p1 = P(b[0], b[1]); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]);
  }
  x.stroke(); x.lineWidth = 1;
  // districts: lit blocks where you have been, dark where you have not
  DISTRICTS.forEach((d, di) => {
    const known = st.seen(d.zone);
    R(d.x, d.y, d.w, d.h, known ? '#170b05' : '#070403');
    for (const [bi, bx, by, bw, bh] of BLOCKS) if (bi === di) R(bx, by, bw, bh, known ? 'rgba(' + O + ',.28)' : 'rgba(' + O + ',.07)');
    frame(d.x, d.y, d.w, d.h, 'rgba(' + O + ',' + (known ? 0.75 : 0.3) + ')');
    const [lx, ly] = P(d.x + d.w / 2, d.y + 6);
    text(x, known ? d.name : '???', lx, ly, known ? 'rgba(' + PAPER + ',.9)' : 'rgba(' + PAPER + ',.35)', 7, '600');
  });
  // the market gate between Downtown and the market
  { const [gx, gy] = P(GATE_AT[0], GATE_AT[1]); x.fillStyle = st.gateOpen ? 'rgba(' + GREEN + ',.9)' : 'rgba(' + RED + ',.85)'; x.fillRect(gx - 2, gy - 4, 4, 8); }
  // places inside Downtown
  for (const [sx0, sy0, label, need] of Object.values(SPOTS)) {
    const [px, py] = P(sx0, sy0), known = need === '' || st.seen(need);
    x.fillStyle = 'rgba(' + PAPER + ',' + (known ? 0.7 : 0.3) + ')'; x.fillRect(px - 1, py - 1, 3, 3);
    text(x, known ? label : '?', px + 4, py, 'rgba(' + PAPER + ',' + (known ? 0.6 : 0.3) + ')', 7, '', 'left');
  }
  // the metro line, Downtown to Galleria to Harbor
  x.strokeStyle = 'rgba(' + PAPER + ',.65)'; x.lineWidth = Math.max(1, Math.round(2 * s));
  x.beginPath();
  LINE.forEach((id, i) => { const [px, py] = P(STATION_AT[id][0], STATION_AT[id][1]); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
  x.stroke(); x.lineWidth = 1;
  { const [lx, ly] = P(160, 104); text(x, 'LINE 0', lx, ly, 'rgba(' + PAPER + ',.5)', 7, '', 'left'); }
  const pick = st.mode === 'view' ? '' : st.options[st.index];
  for (const id of LINE) {
    const [px, py] = P(STATION_AT[id][0], STATION_AT[id][1]), sel = st.mode === 'metro' && pick === id;
    box(x, px - 3, py - 3, 7, 7, '#0a0604', sel ? 'rgba(' + C + ',' + (blink ? 1 : 0.5) + ')' : 'rgba(' + PAPER + ',.85)');
    if (st.mode === 'metro') {
      const known = st.seen(STATIONS[id].zone) || (id === 'downtown' && st.seen('metro'));
      text(x, known ? STATIONS[id].name : '???', px, py + 10, sel ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.7)', 7, '600');
    }
  }
  // taxi pads: cyan only when you can pick them
  for (const id of STAND_IDS) {
    const [px, py] = P(PAD_AT[id][0], PAD_AT[id][1]), sel = st.mode === 'taxi' && pick === id;
    const col = st.mode === 'taxi' ? C : O;
    box(x, px - 4, py - 4, 9, 9, '#030606', 'rgba(' + col + ',' + (sel ? (blink ? 1 : 0.45) : 0.6) + ')');
    x.fillStyle = 'rgba(' + col + ',.8)'; x.fillRect(px - 2, py - 2, 1, 5); x.fillRect(px + 2, py - 2, 1, 5); x.fillRect(px - 1, py, 3, 1);
    if (sel) { x.strokeStyle = 'rgba(' + C + ',.9)'; x.strokeRect(px - 7.5, py - 7.5, 15, 15); }
    if (st.mode === 'taxi') text(x, st.seen(STANDS[id].zone) ? STANDS[id].name : '???', px, py - 10, sel ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.6)', 7, '600');
  }
  // you are here
  { const [hx, hy] = P(...herePoint(st));
    x.fillStyle = blink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.3)'; x.fillRect(hx - 2, hy - 2, 5, 5);
    if (blink) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.strokeRect(hx - 5.5, hy - 5.5, 11, 11); }
    text(x, 'YOU', hx + 8, hy, 'rgba(255,255,255,.85)', 7, '600', 'left'); }

  // footer: the choice and the keys
  const fy = oy + h - 22;
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(ox + 6, fy - 6, w - 12, 1);
  if (st.mode === 'view') {
    text(x, '— LINE 0   [H] SKY TAXI   ■ YOU   ??? NOT VISITED', ox + 10, fy + 2, 'rgba(' + PAPER + ',.65)', 7, '', 'left');
    text(x, 'TAB · ESC close', ox + w - 10, fy + 12, 'rgba(' + C + ',.9)', 7, '600', 'right');
  } else {
    const name = st.mode === 'taxi'
      ? (st.seen(STANDS[pick as Stand].zone) ? STANDS[pick as Stand].name : '???')
      : (st.seen(STATIONS[pick as Station].zone) || (pick === 'downtown' && st.seen('metro')) ? STATIONS[pick as Station].name : '???');
    const here = st.mode === 'taxi' ? standOf(st.zone) === pick : st.station === pick;
    text(x, '> ' + name + (here ? '  (YOU ARE HERE)' : ''), ox + 10, fy + 3, 'rgba(' + C + ',.95)', 9, '600', 'left');
    text(x, '<- -> choose · E ' + (st.mode === 'taxi' ? 'fly' : 'ride') + ' · ESC cancel', ox + w - 10, fy + 12, 'rgba(' + PAPER + ',.7)', 7, '', 'right');
  }
  x.restore();
}

// ---------- the flight ----------

const LIGHTS = (() => { const r = rng(13); return Array.from({ length: 150 }, (_, i) => [r(), r(), i % 3]); })();
const SKYLINE = (() => { const r = rng(17); return Array.from({ length: 30 }, () => [r(), 0.12 + r() * 0.3, 0.02 + r() * 0.04]); })();

/** A sky taxi: a small hovering cab, warm lit cabin, its roof light, thrusters glowing under it. */
export function drawCab(x: CanvasRenderingContext2D, cx: number, base: number, k = 1, t = 0) {
  const u = (n: number) => Math.round(n * k), c = Math.round(cx), b = Math.round(base);
  const g = x.createRadialGradient(c, b + u(3), 1, c, b + u(3), u(16));
  g.addColorStop(0, 'rgba(255,190,110,.35)'); g.addColorStop(1, 'rgba(255,190,110,0)');
  x.fillStyle = g; x.fillRect(c - u(16), b - u(4), u(32), u(22));
  box(x, c - u(15), b - u(8), u(30), u(8), '#2a1608', 'rgba(' + O + ',.9)');
  box(x, c - u(8), b - u(14), u(15), u(7), '#1a0e06', 'rgba(' + O + ',.8)');
  x.fillStyle = 'rgba(' + PAPER + ',.55)'; x.fillRect(c - u(6), b - u(12), u(5), u(4)); x.fillRect(c + u(1), b - u(12), u(4), u(4));
  x.fillStyle = 'rgba(255,210,58,.95)'; x.fillRect(c - u(3), b - u(16), u(6), u(2));
  const on = Math.sin(t * 0.3) > 0;
  x.fillStyle = on ? 'rgba(255,220,170,.95)' : 'rgba(255,170,80,.7)';
  x.fillRect(c - u(12), b, u(5), Math.max(1, u(1))); x.fillRect(c + u(7), b, u(5), Math.max(1, u(1)));
  x.fillStyle = 'rgba(255,240,215,.95)'; x.fillRect(c + u(13), b - u(6), u(2), u(2));
}

/** The flight between stands: city lights scrolling past under a hovering cab. `f` runs 0 → 1. */
export function drawFlight(x: CanvasRenderingContext2D, vw: number, vh: number, f: number, t: number, dest: string) {
  x.save();
  const g = x.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, '#02030a'); g.addColorStop(0.7, '#0a0403'); g.addColorStop(1, '#170803');
  x.fillStyle = g; x.fillRect(0, 0, vw, vh);
  const speeds = [0.6, 1.8, 4.5], alphas = [0.25, 0.45, 0.8], sizes = [1, 1, 2];
  for (const [lx, ly, layer] of LIGHTS) {
    const span = vw + 20, px = (((lx * span * 3 - t * speeds[layer]) % span) + span) % span - 10;
    const py = vh * (0.35 + ly * 0.6);
    x.fillStyle = 'rgba(255,' + (layer === 2 ? 170 : 136) + ',' + (layer === 1 ? 60 : 0) + ',' + alphas[layer] + ')';
    x.fillRect(Math.round(px), Math.round(py), sizes[layer], sizes[layer]);
  }
  // towers racing past at the bottom
  for (const [tx, th, tw] of SKYLINE) {
    const span = vw * 1.6, px = (((tx * span - t * 3) % span) + span) % span - vw * 0.3, bw = tw * vw, bh = th * vh;
    x.fillStyle = '#030100'; x.fillRect(Math.round(px), Math.round(vh - bh), Math.round(bw), Math.round(bh));
    x.strokeStyle = 'rgba(' + O + ',.25)'; x.strokeRect(Math.round(px) + 0.5, Math.round(vh - bh) + 0.5, Math.round(bw) - 1, Math.round(bh));
  }
  drawCab(x, vw / 2, vh * 0.45 + Math.sin(t * 0.08) * 3, 2, t);
  text(x, 'SKY TAXI  >>  ' + dest, vw / 2, vh * 0.45 + 30, 'rgba(' + PAPER + ',.9)', 9, '600');
  const fade = f < 0.15 ? 1 - f / 0.15 : f > 0.85 ? (f - 0.85) / 0.15 : 0;
  if (fade > 0) { x.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')'; x.fillRect(0, 0, vw, vh); }
  x.restore();
}

// ---------- stands and stairs in the play band ----------

/** A sky-taxi stand: a landing pad on the ground, a pole with its SKY TAXI plate and a call box, a cab waiting over the pad. */
export function drawTaxiPad(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t } = v, s = v.sx(wx);
  if (!onScreen(v, s - 60, 120)) return;
  // the pad: a low deck with hazard stripes and landing lights
  box(x, s - 32, y(5), 80, 5, '#1a120b', 'rgba(' + O + ',.85)');
  for (let i = 0; i < 80; i += 8) { x.fillStyle = 'rgba(255,210,58,.55)'; x.fillRect(s - 32 + i, y(3), 4, 2); }
  for (let i = 0; i < 6; i++) {
    const on = Math.floor(t / 12) % 6 === i;
    x.fillStyle = on ? 'rgba(255,240,215,.95)' : 'rgba(255,190,110,.3)'; x.fillRect(s - 26 + i * 13, y(6), 2, 1);
  }
  // the pole, its plate on top, the call box on it
  box(x, s - 30, y(92), 3, 87, '#2a160a', 'rgba(' + O + ',.6)');
  sign(x, t, 'SKY TAXI', s - 18, y(100), C, { size: 8, phase: 140 });
  box(x, s - 36, y(54), 10, 14, '#0d1416', 'rgba(' + C + ',.7)');
  x.fillStyle = 'rgba(' + C + ',.35)'; x.fillRect(s - 34, y(51), 6, 4);
  tell(x, t, s - 31, y(44), 1);
  // a cab waiting over the pad, beside where you stand to hail it
  drawCab(x, s + 28, y(20 + Math.sin(t * 0.04) * 2), 1, t);
}

/** Metro stairs going down from the street: an opening in the pavement, railings, and a METRO plate on a post. */
export function drawMetroStairs(x: CanvasRenderingContext2D, v: View, wx: number) {
  const { y, t, gy } = v, s = v.sx(wx);
  if (!onScreen(v, s - 50, 100)) return;
  // the stairwell, lit from below
  x.fillStyle = '#000'; x.fillRect(s - 30, gy, 60, 40);
  const g = x.createLinearGradient(0, gy + 40, 0, gy);
  g.addColorStop(0, 'rgba(255,230,190,.28)'); g.addColorStop(1, 'rgba(255,230,190,0)');
  x.fillStyle = g; x.fillRect(s - 30, gy, 60, 40);
  for (let i = 0; i < 7; i++) {
    x.fillStyle = 'rgba(' + PAPER + ',' + (0.2 + i * 0.05) + ')'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 9, 1);
    x.fillStyle = 'rgba(' + O + ',.25)'; x.fillRect(s - 30 + i * 8, gy + 3 + i * 5, 1, 5);
  }
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(s - 31, gy, 2, 40); x.fillRect(s + 29, gy, 2, 40);
  // railings round the opening, waist high
  x.fillStyle = 'rgba(' + O + ',.85)';
  x.fillRect(s - 31, y(24), 62, 2);
  for (const px of [s - 31, s - 1, s + 29]) x.fillRect(px, y(24), 2, 24);
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(s - 31, y(12), 62, 1);
  // the post with its plate
  box(x, s + 30, y(76), 3, 76, '#2a160a', 'rgba(' + O + ',.6)');
  sign(x, t, 'METRO', s + 31, y(84), C, { size: 9, phase: 60 });
  tell(x, t, s + 31, y(34), 2);
}
