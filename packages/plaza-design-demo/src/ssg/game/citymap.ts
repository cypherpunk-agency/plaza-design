/**
 * The city map (CITY.md, "The map"): the city as a vertical cross-section, the Spire on top, the
 * street districts in the middle band, the Undercity below, the Fringe at the street's west edge.
 * The data is city.ts's (`DISTRICT_MAP`, `PLACE_MAP`, `LINKS`, the stations and pads); this file
 * draws it and reads the keys and taps on it. game.ts holds the open map (`MapView`) and acts on
 * what the map asks for (`MapAct`): close, quick travel to a place, fly to a stand.
 *
 * - **City view**: every district as a silhouette in its band, lit once you have been in it, dark
 *   and `???` until then; the ways between them (LINE 0 in its tunnel, the market gate, the taxis,
 *   and the planned ways dim and dashed); you. Arrows pick a district, E or a tap opens it.
 * - **District view**: the map zooms into one district; its places hang on pins, with a card each
 *   along the bottom (44 px tall on a phone). A visited place you can reach is cyan: E, a click or
 *   a second tap goes there. ESC, `< CITY` or a tap outside the district goes back.
 * - **Taxi**: the city view with the pads in cyan; pick one and fly.
 * - **On the metro**: the train runs on LINE 0's loop, and you on it.
 *
 * Colours keep their jobs (ART-GUIDE §6): orange structure, cyan what you can use, green/red the
 * gate, red no access and the Registry's antenna, paper for text.
 */

import type { SceneId } from './scenes';
import { C, GREEN, O, PAPER, RED, rng, text } from './scenes/kit';
import {
  DISTRICT_MAP, DISTRICTS, districtPlaces, districtSeen, FARE, GROUND_Y, LINKS, LOOP_MAP, MAP_H, MAP_W, PAD_MAP,
  placeBlocked, placeOf, seenPlace, STAND_IDS, STANDS, standOf, STATION_MAP, STATIONS, STRATA,
  type DistrictId, type MapPlace, type Stand, type Station, type TravelState,
} from './city';

// ---------- the open map ----------

/** The map while it is open (game.ts keeps it; the keys and taps here change it). */
export interface MapView {
  /** 'view': the map (TAB or M, the kiosk), where a place you know is a tap away; 'taxi': pick a stand. */
  mode: 'view' | 'taxi';
  /** Taxi: the stand picked (into STAND_IDS). District view: the place picked (into its `districtPlaces`; -1 none). */
  index: number;
  /** Under the mouse: a district (city view), a place (district view) or a stand (taxi); -1 none. */
  hover: number;
  /** The district picked (into DISTRICTS): the one the city view marks and the district view shows. */
  district: number;
  /** In the district view (or zooming into it). */
  zoomed: boolean;
  /** The game clock when the last zoom started (its animation runs ZOOM frames from there). */
  zoomAt: number;
}

/** Everything the map draws from. */
export interface MapState extends TravelState {
  view: MapView;
  /** A touch screen: say TAP rather than keys. */
  touch: boolean;
  /** The smallest touch target (44 CSS px), in view units. */
  tapMin: number;
  /** A button left over the map (the phone's ESC), in view units: the strip and the footer keep clear of it. */
  avoid: Box | null;
  reduced: boolean;
  tokens: number;
  t: number;
}

/** What the map asks the game to do. */
export type MapAct =
  | { kind: 'none' | 'close' | 'blip' | 'zoom' | 'back' | 'denied' }
  | { kind: 'go'; place: MapPlace }
  | { kind: 'fly'; stand: Stand };

const DIDS = DISTRICTS.map((d) => d.id) as DistrictId[];
/** Frames of the zoom between the city and a district. */
const ZOOM = 16;

/** The district you are in; on the train, the one whose station it last stood at. */
function hereDistrict(scene: SceneId, rideFrom: Station | null): number {
  const d = placeOf(scene).district ?? (rideFrom ? placeOf(STATIONS[rideFrom].scene).district : null) ?? 'downtown';
  return DIDS.indexOf(d);
}

/** A map opening on the city view, your district picked (taxi: the next stand along). */
export function openMap(mode: 'view' | 'taxi', scene: SceneId, rideFrom: Station | null): MapView {
  const district = hereDistrict(scene, rideFrom), here = standOf(scene), i = here ? STAND_IDS.indexOf(here) : -1;
  return { mode, index: mode === 'taxi' ? (i + 1) % STAND_IDS.length : -1, hover: -1, district, zoomed: false, zoomAt: -1e9 };
}

/** How far into the district view the map is (0 city, 1 district), eased. */
function zoomF(st: MapState) {
  const m = st.view, f = st.reduced ? 1 : Math.max(0, Math.min(1, (st.t - m.zoomAt) / ZOOM));
  const e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
  return m.zoomed ? e : 1 - e;
}

/** Turn the zoom round (in or out), carrying on from where a running zoom is. */
function setZoom(st: MapState, zoomed: boolean) {
  const m = st.view, ran = Math.min(ZOOM, st.t - m.zoomAt);
  m.zoomAt = st.t - (ZOOM - ran);
  m.zoomed = zoomed;
  m.hover = -1;
}

const placesOf = (m: MapView) => districtPlaces(DIDS[m.district]);

// ---------- layout ----------

/**
 * The map draws in its own units: the game's view scaled so it is about MAP_VIEW_H tall (never
 * smaller than the view's own units), so its text reads the same at 1280 × 720 as on a phone.
 */
const MAP_VIEW_H = 300;
const mapUnit = (vh: number) => Math.max(1, vh / MAP_VIEW_H);
const scaleBox = (b: Box | null, u: number): Box | null => (b ? { x: b.x / u, y: b.y / u, w: b.w / u, h: b.h / u } : null);

export interface Box { x: number; y: number; w: number; h: number }
interface Cam { s: number; ox: number; oy: number }

/** Where everything sits in a view vw × vh: the panel, the map area, and (district view) the zoomed part, the strip of cards, the back button. */
function layout(vw: number, vh: number, tapMin: number, avoid: Box | null = null) {
  const panel: Box = { x: 3, y: 3, w: vw - 6, h: vh - 6 };
  const head = 16, foot = 26;
  const area: Box = { x: panel.x + 5, y: panel.y + head, w: panel.w - 10, h: panel.h - head - foot };
  const stripH = Math.round(Math.max(30, tapMin + 2));
  // the strip and the footer start right of a button left over the bottom-left corner (the phone's ESC)
  const clear = (top: number) => (avoid && avoid.x < vw / 3 && avoid.y + avoid.h > top ? avoid.x + avoid.w + 4 : 0);
  const sy = area.y + area.h - stripH, sx = Math.max(area.x, clear(sy));
  const strip: Box = { x: sx, y: sy, w: area.x + area.w - sx, h: stripH };
  const footX = Math.max(panel.x + 7, clear(panel.y + panel.h - foot));
  const focus: Box = { x: area.x, y: area.y + 2, w: area.w, h: area.h - stripH - 8 };
  const back: Box = { x: strip.x, y: strip.y, w: Math.round(Math.max(54, tapMin * 1.5)), h: stripH };
  // the city view: the section on the left, and a title block on the right where there is room for one
  const s0 = Math.min(area.w / MAP_W, area.h / MAP_H), spare = area.w - MAP_W * s0 - 6;
  const sheetW = spare >= 130 ? Math.min(200, spare) : 0;
  const sheet: Box | null = sheetW ? { x: area.x + area.w - sheetW, y: area.y, w: sheetW, h: area.h } : null;
  const city: Box = { x: area.x, y: area.y, w: area.w - (sheetW ? sheetW + 6 : 0), h: area.h };
  return { panel, area, city, sheet, strip, focus, back, foot: panel.y + panel.h - foot, footX };
}
type Layout = ReturnType<typeof layout>;

function fit(r: Box, b: Box): Cam {
  const s = Math.min(b.w / r.w, b.h / r.h);
  return { s, ox: b.x + (b.w - r.w * s) / 2 - r.x * s, oy: b.y + (b.h - r.h * s) / 2 - r.y * s };
}

/** The map's camera: the whole section fitted to the area, sliding (scale and centre) into the district picked. */
function camera(st: MapState, L: Layout): Cam {
  const c0 = fit({ x: 0, y: 0, w: MAP_W, h: MAP_H }, L.city), f = zoomF(st);
  if (f <= 0) return c0;
  const r = DISTRICT_MAP[DIDS[st.view.district]], pad = 6;
  const c1 = fit({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }, L.focus);
  const s = c0.s * Math.pow(c1.s / c0.s, f);
  const mx = MAP_W / 2 + (r.x + r.w / 2 - MAP_W / 2) * f, my = MAP_H / 2 + (r.y + r.h / 2 - MAP_H / 2) * f;
  const vx = L.city.x + L.city.w / 2 + (L.focus.x + L.focus.w / 2 - L.city.x - L.city.w / 2) * f;
  const vy = L.city.y + L.city.h / 2 + (L.focus.y + L.focus.h / 2 - L.city.y - L.city.h / 2) * f;
  return { s, ox: vx - mx * s, oy: vy - my * s };
}

const toView = (c: Cam, X: number, Y: number): [number, number] => [c.ox + X * c.s, c.oy + Y * c.s];

/** The cards along the strip in the district view, one per place, centred right of the back button. */
function cards(L: Layout, n: number): Box[] {
  const x0 = L.back.x + L.back.w + 6, room = L.strip.x + L.strip.w - x0, gap = 4;
  const w = Math.floor(Math.min(124, (room - gap * (n - 1)) / Math.max(1, n)));
  const start = x0 + Math.round((room - (w * n + gap * (n - 1))) / 2);
  return Array.from({ length: n }, (_, i) => ({ x: start + i * (w + gap), y: L.strip.y, w, h: L.strip.h }));
}

// ---------- reading taps ----------

type Hit = { kind: 'outside' | 'none' | 'back' } | { kind: 'district' | 'place' | 'pad'; i: number };
const inBox = (b: Box, px: number, py: number) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

/** What is under a point of the view (view units). */
function hitAt(st: MapState, vw: number, vh: number, px: number, py: number): Hit {
  const L = layout(vw, vh, st.tapMin, st.avoid), m = st.view, c = camera(st, L);
  if (!inBox(L.panel, px, py)) return { kind: 'outside' };
  const reach = Math.max(9, st.tapMin / 2);
  const near = (pts: [number, number][]) => {
    let best = -1, bd = reach;
    pts.forEach(([X, Y], i) => { const [a, b] = toView(c, X, Y), d = Math.hypot(a - px, b - py); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  if (m.mode === 'taxi') { const i = near(STAND_IDS.map((s) => PAD_MAP[s])); return i >= 0 ? { kind: 'pad', i } : { kind: 'none' }; }
  if (m.zoomed) {
    if (inBox(L.back, px, py)) return { kind: 'back' };
    const ps = placesOf(m), ci = cards(L, ps.length).findIndex((b) => inBox(b, px, py));
    if (ci >= 0) return { kind: 'place', i: ci };
    const pi = near(ps.map((p) => p.pt));
    if (pi >= 0) return { kind: 'place', i: pi };
    const r = DISTRICT_MAP[DIDS[m.district]], [a, b] = toView(c, r.x, r.y);
    // a tap outside the district (or outside the map) goes back to the city
    return inBox({ x: a, y: b, w: r.w * c.s, h: r.h * c.s }, px, py) && inBox(L.area, px, py) ? { kind: 'none' } : { kind: 'back' };
  }
  if (!inBox(L.city, px, py)) return { kind: 'none' };
  const X = (px - c.ox) / c.s, Y = (py - c.oy) / c.s;
  const i = DIDS.findIndex((d) => { const r = DISTRICT_MAP[d]; return X >= r.x && X <= r.x + r.w && Y >= r.y && Y <= r.y + r.h; });
  return i >= 0 ? { kind: 'district', i } : { kind: 'none' };
}

/** Open the district picked, if it has places on the map (the Spire, the Undercity and the Fringe have none yet). */
function zoomIn(st: MapState): MapAct {
  const m = st.view, ps = placesOf(m);
  if (!ps.length) return { kind: 'denied' };
  setZoom(st, true);
  m.index = Math.max(0, ps.findIndex((p) => p.scenes.includes(st.scene)));
  return { kind: 'zoom' };
}
function zoomOut(st: MapState): MapAct { setZoom(st, false); return { kind: 'back' }; }

/** From district i, the nearest district in direction (dx, dy) on the section. */
function neighbour(i: number, dx: number, dy: number) {
  const at = (d: DistrictId) => { const r = DISTRICT_MAP[d]; return [r.x + r.w / 2, r.y + r.h / 2]; };
  const [x0, y0] = at(DIDS[i]);
  let best = i, bs = Infinity;
  DIDS.forEach((d, j) => {
    if (j === i) return;
    const [x1, y1] = at(d), vx = x1 - x0, vy = y1 - y0, along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
    if (along <= 0) return;
    // in a cone round the direction first; past its edge only if nothing is in it
    const s = along + across * 2 + (along < across * 0.7 ? 1000 : 0);
    if (s < bs) { bs = s; best = j; }
  });
  return best;
}

/** A key on the open map. Arrows (or WASD) pick, E / Enter / Space open or go, ESC goes back a level, TAB or M closes. */
export function mapKey(st: MapState, key: string): MapAct {
  const m = st.view, k = key.length === 1 ? key.toLowerCase() : key;
  const dir: [number, number] | null = k === 'ArrowLeft' || k === 'a' ? [-1, 0] : k === 'ArrowRight' || k === 'd' ? [1, 0]
    : k === 'ArrowUp' || k === 'w' ? [0, -1] : k === 'ArrowDown' || k === 's' ? [0, 1] : null;
  const ok = k === 'e' || k === 'Enter' || k === ' ';
  if (k === 'Tab' || k === 'm') return { kind: 'close' };
  if (m.mode === 'taxi') {
    if (k === 'Escape') return { kind: 'close' };
    const n = STAND_IDS.length;
    if (dir) { m.index = (m.index + (dir[0] || dir[1]) + n) % n; return { kind: 'blip' }; }
    return ok ? { kind: 'fly', stand: STAND_IDS[m.index] } : { kind: 'none' };
  }
  if (k === 'Escape') return m.zoomed ? zoomOut(st) : { kind: 'close' };
  if (!m.zoomed) {
    if (dir) { const j = neighbour(m.district, dir[0], dir[1]); if (j === m.district) return { kind: 'none' }; m.district = j; m.hover = -1; return { kind: 'blip' }; }
    return ok ? zoomIn(st) : { kind: 'none' };
  }
  const ps = placesOf(m), n = ps.length;
  if (dir) { m.index = ((m.index < 0 ? 0 : m.index + (dir[0] || dir[1])) + n) % n; m.hover = -1; return { kind: 'blip' }; }
  return ok && m.index >= 0 ? { kind: 'go', place: ps[m.index] } : { kind: 'none' };
}

/**
 * The pointer on the open map. The mouse hovers and a click acts at once; on touch a first tap
 * picks a place or a pad and a second one goes (a district opens on the first). Outside the
 * district goes back to the city; outside the panel closes the map.
 */
export function mapPointer(st: MapState, vw: number, vh: number, px: number, py: number, press: boolean, mouse: boolean): { act: MapAct; pointer: boolean } {
  const u = mapUnit(vh), m = st.view, h = hitAt({ ...st, tapMin: st.tapMin / u, avoid: scaleBox(st.avoid, u) }, vw / u, vh / u, px / u, py / u);
  const i = 'i' in h ? h.i : -1;
  if (mouse) m.hover = i;
  const pointer = i >= 0 || (h.kind === 'back' && m.zoomed);
  if (!press) return { act: { kind: 'none' }, pointer };
  switch (h.kind) {
    case 'outside': return { act: m.zoomed && m.mode === 'view' ? zoomOut(st) : { kind: 'close' }, pointer };
    case 'back': return { act: zoomOut(st), pointer };
    case 'district': m.district = i; return { act: zoomIn(st), pointer };
    case 'pad':
      if (mouse || m.index === i) return { act: { kind: 'fly', stand: STAND_IDS[i] }, pointer };
      m.index = i; return { act: { kind: 'blip' }, pointer };
    case 'place':
      if (mouse || m.index === i) return { act: { kind: 'go', place: placesOf(m)[i] }, pointer };
      m.index = i; return { act: { kind: 'blip' }, pointer };
    default: return { act: { kind: 'none' }, pointer };
  }
}

// ---------- drawing helpers ----------

type Pt = [number, number];
/** Drawing in map units through the camera: rects snap to whole view pixels, so the section keeps its pixel look at every zoom. */
function pen(x: CanvasRenderingContext2D, c: Cam) {
  const X = (v: number) => Math.round(c.ox + v * c.s), Y = (v: number) => Math.round(c.oy + v * c.s);
  return {
    s: c.s,
    rect(x0: number, y0: number, w: number, h: number, fill: string) {
      const a = X(x0), b = Y(y0); x.fillStyle = fill; x.fillRect(a, b, Math.max(1, X(x0 + w) - a), Math.max(1, Y(y0 + h) - b));
    },
    frame(x0: number, y0: number, w: number, h: number, stroke: string) {
      const a = X(x0), b = Y(y0); x.strokeStyle = stroke; x.lineWidth = 1; x.strokeRect(a + 0.5, b + 0.5, Math.max(1, X(x0 + w) - a - 1), Math.max(1, Y(y0 + h) - b - 1));
    },
    line(pts: Pt[], stroke: string, width = 1, dash: number[] = []) {
      x.strokeStyle = stroke; x.lineWidth = width; x.setLineDash(dash); x.beginPath();
      pts.forEach(([a, b], i) => (i ? x.lineTo(X(a) + 0.5, Y(b) + 0.5) : x.moveTo(X(a) + 0.5, Y(b) + 0.5)));
      x.stroke(); x.setLineDash([]); x.lineWidth = 1;
    },
    poly(pts: Pt[], fill: string) {
      x.fillStyle = fill; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b)))); x.closePath(); x.fill();
    },
  };
}
type Pen = ReturnType<typeof pen>;

/** How a district's silhouette is inked: lit once you have been there, dark (a shape only) before. */
interface Ink { body: string; edge: string; win: string | null; lamp: string | null }
const LIT: Ink = { body: '#1d0f06', edge: 'rgba(' + O + ',.8)', win: 'rgba(' + O + ',.34)', lamp: 'rgba(' + PAPER + ',.6)' };
const DARK: Ink = { body: '#0e0804', edge: 'rgba(' + O + ',.24)', win: null, lamp: null };

/** A building standing on `bottom` (the street by default), its lit windows seeded so they stay put. */
function bld(p: Pen, k: Ink, x0: number, top: number, w: number, seed: number, bottom = GROUND_Y, dens = 0.45) {
  p.rect(x0, top, w, bottom - top, k.body);
  if (k.win) {
    const r = rng(seed);
    for (let y = top + 3; y < bottom - 4; y += 5) for (let x = x0 + 2; x < x0 + w - 2; x += 3) if (r() < dens) p.rect(x, y, 1.4, 2, k.win);
  }
  p.frame(x0, top, w, bottom - top, k.edge);
}

const WAVES = (() => { const r = rng(9); return Array.from({ length: 60 }, () => [r(), r(), 3 + r() * 6]); })();
/** Water: dark, with ripples that drift. */
function water(p: Pen, x0: number, y0: number, w: number, h: number, t: number, seed: number) {
  p.rect(x0, y0, w, h, '#03091a');
  WAVES.forEach(([a, b, len], i) => {
    if (i % 3 !== seed % 3) return;
    const xx = x0 + ((a * w + t * 0.05 * (1 + (i % 2))) % w), yy = y0 + 1 + b * (h - 2);
    p.rect(xx, yy, Math.min(len, x0 + w - xx), 0.6, 'rgba(170,210,255,.18)');
  });
  p.rect(x0, y0, w, 0.8, 'rgba(170,210,255,.3)');
}

// ---------- the districts' silhouettes ----------

const SILHOUETTE: Record<DistrictId, (p: Pen, k: Ink, t: number) => void> = {
  // a dead automated factory: a sawtooth hall, two cold chimneys, a tank, a fence; nobody
  fringe: (p, k) => {
    bld(p, k, 14, 78, 4, 1, 102, 0); bld(p, k, 24, 86, 3, 2, 102, 0);
    p.rect(8, 102, 44, 22, k.body);
    const saw: Pt[] = [];
    for (let i = 0; i < 5; i++) { const a = 8 + i * 8.8; p.poly([[a, 102], [a, 95], [a + 8.8, 102]], k.body); saw.push([a, 102], [a, 95], [a + 8.8, 102]); }
    p.line(saw, k.edge);
    p.frame(8, 102, 44, 22, k.edge);
    p.rect(42, 92, 9, 10, k.body); p.frame(42, 92, 9, 10, k.edge);
    for (let x = 4; x < 58; x += 4) p.rect(x, 119, 0.6, 5, k.edge);
    p.rect(4, 119, 54, 0.6, k.edge);
  },
  // low shacks packed together, awnings, a string of lanterns, the gate arch to Downtown
  market: (p, k, t) => {
    const shacks: [number, number, number][] = [[63, 106, 10], [73, 99, 9], [82, 108, 8], [90, 101, 12], [102, 107, 9], [111, 97, 8], [119, 104, 8]];
    shacks.forEach(([x, top, w], i) => {
      p.rect(x + 1, top - 3, 3 + (i % 3), 3, k.body); p.frame(x + 1, top - 3, 3 + (i % 3), 3, k.edge);
      bld(p, k, x, top, w, 30 + i, GROUND_Y, 0.3);
      if (k.lamp) p.rect(x - 1, top + 7, w + 2, 1.3, 'rgba(' + O + ',.6)');
    });
    if (k.lamp) for (let x = 64; x < 126; x += 5) p.rect(x, 113 + Math.sin(x * 0.7) * 1.2, 1.3, 1.3, (Math.floor(t / 30) + x) % 7 ? k.lamp : 'rgba(' + PAPER + ',.25)');
    p.rect(126, 101, 1.5, 23, k.edge); p.rect(132, 101, 1.5, 23, k.edge); p.rect(126, 101, 7.5, 1.5, k.edge);
  },
  // towers of all heights on one street: the narrow Capsule 7B tower, Moth's building, a billboard
  downtown: (p, k) => {
    const towers: [number, number, number][] = [[134, 94, 8], [143, 80, 12], [156, 88, 10], [167, 72, 9], [177, 86, 7], [185, 66, 9], [195, 92, 8], [203, 82, 11], [215, 96, 6]];
    towers.forEach(([x, top, w], i) => bld(p, k, x, top, w, 50 + i));
    if (k.lamp) { p.rect(157, 94, 8, 4, 'rgba(' + PAPER + ',.3)'); p.frame(157, 94, 8, 4, k.edge); }
    if (k.lamp) for (let x = 138; x < 222; x += 12) p.rect(x, 116, 1, 1, k.lamp);
  },
  // the mall: glass bands, a dome, the rooftop garden, the sky elevator's housing
  galleria: (p, k) => {
    p.rect(246, 84, 28, 4, k.body); p.frame(246, 84, 28, 4, k.edge);
    p.rect(250, 80, 20, 4, k.body); p.frame(250, 80, 20, 4, k.edge);
    p.rect(255, 77, 10, 3, k.body); p.frame(255, 77, 10, 3, k.edge);
    p.rect(234, 88, 52, 36, k.body);
    if (k.lamp) {
      for (let y = 92; y < 120; y += 5) p.rect(236, y, 48, 1, 'rgba(' + PAPER + ',.16)');
      p.rect(254, 116, 12, 8, 'rgba(' + PAPER + ',.3)');
      for (let x = 236; x < 246; x += 3) p.rect(x, 85, 2, 3, 'rgba(' + O + ',.45)');
    }
    p.frame(234, 88, 52, 36, k.edge);
    p.rect(265, 82, 6, 6, k.body); p.frame(265, 82, 6, 6, k.edge);
  },
  // the working harbor: a warehouse, containers, a crane, the quay and pier; the beach across the bay
  harbor: (p, k) => {
    p.poly([[296, 104], [307, 98], [318, 104]], k.body); p.line([[296, 104], [307, 98], [318, 104]], k.edge);
    bld(p, k, 296, 104, 22, 70, GROUND_Y, 0);
    if (k.lamp) p.rect(304, 115, 6, 9, 'rgba(' + PAPER + ',.22)');
    for (const [x, y] of [[320, 116], [327, 116], [320, 112]] as Pt[]) { p.rect(x, y, 7, 4, k.body); p.frame(x, y, 7, 4, k.edge); }
    p.rect(331, 89, 1.5, 35, k.edge); p.rect(339, 89, 1.5, 35, k.edge); p.rect(326, 88, 22, 1.5, k.edge);
    p.rect(334, 90, 4, 3, k.body); p.frame(334, 90, 4, 3, k.edge); p.rect(346, 89.5, 0.6, 10, k.edge);
    p.rect(294, 124, 48, 2, k.edge);
    p.rect(340, 121.5, 10, 1.2, k.edge); p.rect(348, 122, 0.8, 6, k.edge);
    p.poly([[380, 125], [398, 121], [398, 127], [380, 127]], k.lamp ? '#3a2a18' : k.body);
    p.line([[380, 125], [398, 121]], k.edge);
    p.rect(385, 120, 8, 2, k.body); p.frame(385, 120, 8, 2, k.edge); p.rect(389, 113, 0.8, 7, k.edge);
  },
  // the Spire: towers on a deck over the east of the city, the Registry's antenna on the tallest, its foot in the bay
  spire: (p, k, t) => {
    p.rect(366, 54, 10, 98, k.body); p.frame(366, 54, 10, 98, k.edge);
    for (let y = 58; y < 148; y += 10) p.line([[366, y], [376, y + 10]], k.edge);
    p.rect(196, 48, 190, 6, k.body); p.frame(196, 48, 190, 6, k.edge);
    const towers: [number, number, number][] = [[204, 28, 14], [222, 20, 16], [244, 8, 22], [270, 20, 14], [288, 32, 12], [304, 22, 16], [324, 34, 12], [340, 24, 18], [362, 36, 16]];
    towers.forEach(([x, top, w], i) => bld(p, k, x, top, w, 90 + i, 48, 0.12));
    p.rect(254.5, 0, 1.5, 8, k.edge);
    if (Math.floor(t / 30) % 2 === 0) p.rect(254, 0, 2.5, 1.5, 'rgba(' + RED + ',.9)');
  },
  // canals and arches under the street: the Ghosts' homes in the arches, lanterns over the water
  undercity: (p, k, t) => {
    p.rect(60, 156, 332, 3, k.body); p.frame(60, 156, 332, 3, k.edge);
    for (let x = 62; x < 390; x += 26) {
      p.rect(x, 159, 5, 45, k.body); p.frame(x, 159, 5, 45, k.edge);
      if (x + 26 < 392) { p.rect(x + 5, 159, 21, 3, k.body); p.rect(x + 5, 162, 3, 2, k.body); p.rect(x + 23, 162, 3, 2, k.body); p.line([[x + 5, 164], [x + 8, 164], [x + 8, 162], [x + 23, 162], [x + 23, 164], [x + 26, 164]], k.edge); }
      if (k.lamp && (x / 26) % 2 < 1) p.rect(x + 13, 195, 4, 9, k.lamp);
    }
    water(p, 60, 204, 332, 10, t, 1);
    p.rect(60, 214, 332, 4, k.body); p.frame(60, 214, 332, 4, k.edge);
  },
};

// ---------- LINE 0 ----------

/** Lengths along LINE 0's loop: each vertex's distance from the first, and the whole. */
const LOOP_D = (() => {
  const d = [0];
  for (let i = 1; i <= LOOP_MAP.length; i++) { const a = LOOP_MAP[i - 1], b = LOOP_MAP[i % LOOP_MAP.length]; d.push(d[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  return d;
})();
const LOOP_LEN = LOOP_D[LOOP_MAP.length];
const stationD = (s: Station) => LOOP_D[LOOP_MAP.findIndex(([x, y]) => x === STATION_MAP[s][0] && y === STATION_MAP[s][1])];
function loopPoint(d: number): Pt {
  d = ((d % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  let i = 0;
  while (i < LOOP_MAP.length - 1 && LOOP_D[i + 1] < d) i++;
  const a = LOOP_MAP[i], b = LOOP_MAP[(i + 1) % LOOP_MAP.length], f = (d - LOOP_D[i]) / Math.max(1e-6, LOOP_D[i + 1] - LOOP_D[i]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
/** Where the train is on the loop. */
function trainPoint(r: { from: Station; to: Station; f: number }): Pt {
  const a = stationD(r.from); let b = stationD(r.to);
  if (b <= a) b += LOOP_LEN;
  return loopPoint(a + (b - a) * r.f);
}

/** You on the map: at the pad you hail from, on the train while you ride, else at your place. */
function youPoint(st: MapState): Pt | null {
  if (st.view.mode === 'taxi') { const s = standOf(st.scene); if (s) return PAD_MAP[s]; }
  if (st.ride) return trainPoint(st.ride);
  const p = districtPlaces(placeOf(st.scene).district ?? 'downtown').find((q) => q.scenes.includes(st.scene));
  return p ? p.pt : null;
}

/** A place's state on the map, its colour and its card's second line. */
function placeLook(p: MapPlace, st: MapState): { col: string; name: string; note: string; here: boolean; go: boolean } {
  const why = placeBlocked(p, st), known = seenPlace(p, st.seen), here = why === 'YOU ARE HERE';
  if (!known) return { col: 'rgba(' + PAPER + ',.4)', name: '???', note: 'NOT VISITED', here, go: false };
  if (here) return { col: 'rgba(255,255,255,.95)', name: p.name, note: 'YOU ARE HERE', here, go: false };
  if (why) return { col: 'rgba(' + PAPER + ',.75)', name: p.name, note: why.startsWith('THE MARKET') ? 'GATE SHUT' : 'NOT WHILE MOVING', here, go: false };
  return { col: 'rgba(' + C + ',.95)', name: p.name, note: 'QUICK TRAVEL', here, go: true };
}

// ---------- the map ----------

/** The city map over the whole view (vw × vh, the game's view units). */
export function drawCityMap(x: CanvasRenderingContext2D, vw: number, vh: number, st: MapState) {
  const u = mapUnit(vh);
  x.save(); x.scale(u, u);
  drawMap(x, vw / u, vh / u, { ...st, tapMin: st.tapMin / u, avoid: scaleBox(st.avoid, u) });
  x.restore();
}

function drawMap(x: CanvasRenderingContext2D, vw: number, vh: number, st: MapState) {
  const m = st.view, L = layout(vw, vh, st.tapMin, st.avoid), c = camera(st, L), f = zoomF(st), p = pen(x, c);
  const blink = Math.floor(st.t / 20) % 2 === 0, taxi = m.mode === 'taxi', did = DIDS[m.district];
  const lw = Math.max(1, Math.round(c.s * 0.9));
  x.save();
  x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(0, 0, vw, vh);
  x.fillStyle = '#040201'; x.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
  x.strokeStyle = 'rgba(' + O + ',.9)'; x.strokeRect(L.panel.x + 0.5, L.panel.y + 0.5, L.panel.w - 1, L.panel.h - 1);

  // ---- the section, clipped to the map area
  x.save();
  x.beginPath(); x.rect(L.area.x, L.area.y, L.area.w, L.area.h); x.clip();
  // a drawing sheet: a faint grid, the strata's bands and their datum lines
  p.rect(0, STRATA.overworld.top, MAP_W, STRATA.overworld.bottom, '#06050c');
  for (let gx = 0; gx <= MAP_W; gx += 10) p.rect(gx, 0, 0.3, MAP_H, 'rgba(' + O + ',' + (gx % 50 ? 0.04 : 0.08) + ')');
  for (let gy = 0; gy <= MAP_H; gy += 10) p.rect(0, gy, MAP_W, 0.3, 'rgba(' + O + ',' + (gy % 50 ? 0.04 : 0.08) + ')');
  // the ground: earth under the street, down to the Undercity's ceiling; the bay
  p.rect(0, GROUND_Y, MAP_W, STRATA.underworld.top - GROUND_Y + 4, '#0b0603');
  p.rect(0, GROUND_Y, MAP_W, 0.8, 'rgba(' + O + ',.4)');
  water(p, 342, GROUND_Y + 0.5, 56, STRATA.underworld.top - GROUND_Y - 0.5, st.t, 0);
  for (const s of ['street', 'underworld'] as const) p.line([[0, STRATA[s].top], [MAP_W, STRATA[s].top]], 'rgba(' + O + ',.3)', 1, [4, 3]);
  // LINE 0's tunnel
  p.rect(143, 133, 181, 13, '#050302'); p.frame(143, 133, 181, 13, 'rgba(' + O + ',.25)');
  // the districts
  DIDS.forEach((d) => SILHOUETTE[d](p, districtSeen(d, st.seen) ? LIT : DARK, st.t));
  // the ways between districts: planned ones dim and dashed, open ones solid, the market gate green or red
  for (const l of LINKS) {
    if (l.state === 'planned') { p.line(l.path, 'rgba(' + O + ',.4)', 1, [3, 3]); continue; }
    p.line(l.path, 'rgba(' + O + ',.85)', lw);
    if (l.state === 'gate') {
      const [a, b] = toView(c, (l.path[0][0] + l.path[1][0]) / 2, l.path[0][1]);
      x.fillStyle = st.gateOpen ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.9)';
      x.fillRect(Math.round(a) - 2, Math.round(b) - 5, 4, 10);
    }
  }
  // LINE 0: the loop, its stations, the stairs up from them
  const lineKnown = (Object.keys(STATIONS) as Station[]).some((s) => st.seen(STATIONS[s].scene) || st.seen(STATIONS[s].up));
  p.line([...LOOP_MAP, LOOP_MAP[0]], 'rgba(' + O + ',' + (lineKnown ? 0.85 : 0.3) + ')', lw);
  for (const s of Object.keys(STATIONS) as Station[]) {
    const [sx, sy] = STATION_MAP[s];
    p.line([[sx, sy - 3], [sx, GROUND_Y]], 'rgba(' + O + ',.5)');
    const [a, b] = toView(c, sx, sy), next = !!st.ride && st.ride.to === s && st.ride.f > 0, r = Math.max(3, Math.round(c.s * 2));
    x.fillStyle = '#0a0604'; x.fillRect(Math.round(a) - r, Math.round(b) - r, r * 2 + 1, r * 2 + 1);
    x.strokeStyle = next ? 'rgba(' + O + ',' + (blink ? 1 : 0.5) + ')' : 'rgba(' + PAPER + ',' + (st.seen(STATIONS[s].scene) ? 0.85 : 0.35) + ')';
    x.strokeRect(Math.round(a) - r + 0.5, Math.round(b) - r + 0.5, r * 2, r * 2);
    if (next && f < 0.5) { const [, ny] = toView(c, sx, 149.5); text(x, 'NEXT: ' + STATIONS[s].name, a, ny, 'rgba(' + O + ',.95)', 7, '600'); }
  }
  if (f < 0.5) { const [a, b] = toView(c, 266, 129.5); text(x, 'LINE 0', a, b, 'rgba(' + O + ',.6)', 7, '600', 'left'); }
  // taxi routes between the stands (cyan in taxi mode: your pad to the one picked)
  const pickStand = taxi ? STAND_IDS[m.index] : null, fromStand = standOf(st.scene);
  if (taxi) STAND_IDS.forEach((s, i) => {
    const t = STAND_IDS[(i + 1) % STAND_IDS.length], [ax, ay] = PAD_MAP[s], [bx, by] = PAD_MAP[t];
    p.line([[ax, ay - 3], [(ax + bx) / 2, Math.min(ay, by) - 22], [bx, by - 3]], 'rgba(' + PAPER + ',.16)', 1, [2, 3]);
  });
  if (taxi && pickStand && fromStand && pickStand !== fromStand) {
    const [ax, ay] = PAD_MAP[fromStand], [bx, by] = PAD_MAP[pickStand];
    p.line([[ax, ay - 3], [(ax + bx) / 2, Math.min(ay, by) - 22], [bx, by - 3]], 'rgba(' + C + ',' + (blink ? 0.9 : 0.6) + ')', lw, [3, 2]);
  }
  // the pads (in the city view only as structure; in taxi mode they are what you pick)
  STAND_IDS.forEach((s, i) => {
    const [a, b] = toView(c, ...PAD_MAP[s]), col = taxi ? C : O, sel = taxi && m.index === i, hov = taxi && m.hover === i;
    const r = Math.max(4, Math.round(c.s * 2.5)), cx = Math.round(a), cy = Math.round(b);
    x.fillStyle = '#030606'; x.fillRect(cx - r, cy - r, r * 2 + 1, r * 2 + 1);
    x.strokeStyle = 'rgba(' + col + ',' + (sel ? (blink ? 1 : 0.5) : taxi ? 0.8 : 0.55) + ')'; x.strokeRect(cx - r + 0.5, cy - r + 0.5, r * 2, r * 2);
    x.fillStyle = 'rgba(' + col + ',.85)'; x.fillRect(cx - 2, cy - 2, 1, 5); x.fillRect(cx + 2, cy - 2, 1, 5); x.fillRect(cx - 1, cy, 3, 1);
    if (sel || hov) { x.strokeStyle = 'rgba(' + C + ',.9)'; x.strokeRect(cx - r - 3.5, cy - r - 3.5, r * 2 + 7, r * 2 + 7); }
    if (taxi) text(x, st.seen(STANDS[s].scene) ? STANDS[s].name : '???', cx, cy - r - 9, sel ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.75)', 7, '600');
  });
  // the places you have been: small dots in the city view
  if (f < 1 && !taxi) for (const d of DIDS) for (const q of districtPlaces(d)) if (seenPlace(q, st.seen)) p.rect(q.pt[0] - 0.8, q.pt[1] - 0.8, 1.6, 1.6, 'rgba(' + PAPER + ',' + 0.7 * (1 - f) + ')');

  // the district view: the rest of the city dims, the places hang on pins
  const ps = placesOf(m), boxes = cards(L, ps.length);
  if (f > 0) {
    const r = DISTRICT_MAP[did], [a, b] = toView(c, r.x, r.y), w = r.w * c.s, h = r.h * c.s;
    x.fillStyle = 'rgba(2,1,0,' + 0.7 * f + ')';
    x.fillRect(L.area.x, L.area.y, L.area.w, b - L.area.y); x.fillRect(L.area.x, b + h, L.area.w, L.area.y + L.area.h - b - h);
    x.fillRect(L.area.x, b, a - L.area.x, h); x.fillRect(a + w, b, L.area.x + L.area.w - a - w, h);
    x.strokeStyle = 'rgba(' + O + ',' + 0.5 * f + ')'; x.setLineDash([4, 3]); x.strokeRect(Math.round(a) + 0.5, Math.round(b) + 0.5, Math.round(w), Math.round(h)); x.setLineDash([]);
    // the ways out of this district, named where they leave it
    if (f > 0.7) for (const l of LINKS) {
      if ((l.from !== did && l.to !== did) || l.from === l.to) continue;
      const [lx, ly] = l.path[Math.floor(l.path.length / 2)], [va, vb] = toView(c, lx, ly);
      if (vb > L.focus.y + L.focus.h - 4 || vb < L.focus.y + 4) continue;
      const label = l.name + (l.state === 'planned' ? ' · NO ACCESS' : l.state === 'gate' ? (st.gateOpen ? ' · OPEN' : ' · SHUT') : '');
      const tw = label.length * 4.3 + 6, tx = Math.max(L.area.x + tw / 2 + 2, Math.min(L.area.x + L.area.w - tw / 2 - 2, va));
      x.fillStyle = 'rgba(4,2,1,.85)'; x.fillRect(Math.round(tx - tw / 2), Math.round(vb - 5), Math.round(tw), 10);
      text(x, label, tx, vb, l.state === 'planned' ? 'rgba(' + PAPER + ',.5)' : 'rgba(' + PAPER + ',.8)', 7);
    }
  }
  x.restore();

  if (f > 0.4 && m.mode === 'view') {
    const a0 = Math.min(1, (f - 0.4) / 0.4);
    x.save(); x.globalAlpha = a0;
    ps.forEach((q, i) => {
      const look = placeLook(q, st), [px, py] = toView(c, ...q.pt), b = boxes[i], sel = m.index === i, hov = m.hover === i;
      const cx = Math.round(px), cy = Math.round(py);
      // a leader from the pin down to its card
      x.strokeStyle = sel ? look.col : 'rgba(' + PAPER + ',.22)'; x.beginPath(); x.moveTo(cx + 0.5, cy + 4); x.lineTo(cx + 0.5, Math.min(cy + 10, b.y - 4)); x.lineTo(b.x + b.w / 2 + 0.5, b.y - 1); x.stroke();
      // the pin
      x.fillStyle = '#050302'; x.fillRect(cx - 4, cy - 4, 9, 9);
      x.strokeStyle = look.col; x.strokeRect(cx - 3.5, cy - 3.5, 8, 8);
      x.fillStyle = look.col; x.fillRect(cx - 1, cy - 1, 3, 3);
      if (sel) { x.strokeStyle = look.go ? 'rgba(' + C + ',' + (blink ? 1 : 0.5) + ')' : 'rgba(' + PAPER + ',' + (blink ? 0.9 : 0.4) + ')'; x.strokeRect(cx - 7.5, cy - 7.5, 16, 16); }
      if (look.here) text(x, 'YOU', cx, cy - 12, blink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.6)', 7, '600');
      // its card
      x.fillStyle = sel ? '#0b0705' : '#070403'; x.fillRect(b.x, b.y, b.w, b.h);
      x.strokeStyle = sel ? look.col : hov ? 'rgba(' + PAPER + ',.6)' : 'rgba(' + O + ',.45)'; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (sel && look.go && blink) { x.strokeStyle = 'rgba(' + C + ',.5)'; x.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3); }
      text(x, look.name, b.x + b.w / 2, b.y + b.h / 2 - 5, look.col, 7, '600');
      text(x, look.note, b.x + b.w / 2, b.y + b.h / 2 + 6, look.go ? 'rgba(' + C + ',.7)' : look.note === 'GATE SHUT' || look.note === 'NOT WHILE MOVING' ? 'rgba(' + RED + ',.85)' : 'rgba(' + PAPER + ',.5)', 7);
    });
    // back to the city
    const bk = L.back;
    x.fillStyle = '#070403'; x.fillRect(bk.x, bk.y, bk.w, bk.h);
    x.strokeStyle = 'rgba(' + O + ',.85)'; x.strokeRect(bk.x + 0.5, bk.y + 0.5, bk.w - 1, bk.h - 1);
    text(x, '< CITY', bk.x + bk.w / 2, bk.y + bk.h / 2, 'rgba(' + PAPER + ',.9)', 7, '600');
    x.restore();
  }

  // the city view: each district's name tag, and the one picked
  if (f < 1) {
    x.save(); x.globalAlpha = 1 - f;
    // (in taxi mode the stands' names take their place)
    if (!taxi) DIDS.forEach((d, i) => {
      const r = DISTRICT_MAP[d], known = districtSeen(d, st.seen), name = known ? DISTRICTS[i].short : '???';
      const [a, b] = toView(c, ...r.label), tw = name.length * 4.4 + 8;
      x.fillStyle = '#060302'; x.fillRect(Math.round(a - tw / 2), Math.round(b - 5), Math.round(tw), 11);
      x.strokeStyle = 'rgba(' + O + ',' + (known ? 0.7 : 0.3) + ')'; x.strokeRect(Math.round(a - tw / 2) + 0.5, Math.round(b - 5) + 0.5, Math.round(tw) - 1, 10);
      text(x, name, a, b + 0.5, known ? 'rgba(' + PAPER + ',.95)' : 'rgba(' + PAPER + ',.45)', 7, '600');
    });
    if (!taxi) {
      const mark = (i: number, col: string, corners: boolean) => {
        const r = DISTRICT_MAP[DIDS[i]], [a, b] = toView(c, r.x, r.y), w = Math.round(r.w * c.s), h = Math.round(r.h * c.s), A = Math.round(a) - 2.5, B = Math.round(b) - 2.5;
        x.strokeStyle = col;
        if (!corners) { x.strokeRect(A, B, w + 4, h + 4); return; }
        const k = 7; x.beginPath();
        for (const [px, py, sx, sy] of [[A, B, 1, 1], [A + w + 4, B, -1, 1], [A, B + h + 4, 1, -1], [A + w + 4, B + h + 4, -1, -1]]) { x.moveTo(px + sx * k, py); x.lineTo(px, py); x.lineTo(px, py + sy * k); }
        x.lineWidth = 2; x.stroke(); x.lineWidth = 1;
      };
      if (m.hover >= 0 && m.hover !== m.district) mark(m.hover, 'rgba(' + PAPER + ',.4)', false);
      const open = districtPlaces(did).length > 0;
      mark(m.district, open ? 'rgba(' + C + ',' + (blink ? 1 : 0.6) + ')' : 'rgba(' + RED + ',' + (blink ? 0.8 : 0.4) + ')', true);
    }
    x.restore();
  }

  // the train while you ride, and you
  if (st.ride) {
    const [a, b] = toView(c, ...trainPoint(st.ride));
    x.fillStyle = 'rgba(' + PAPER + ',.95)'; x.fillRect(Math.round(a) - 6, Math.round(b) - 2, 12, 4);
  }
  const you = youPoint(st);
  if (you && (f < 0.5 || st.ride || taxi)) {
    const [a, b] = toView(c, ...you), hx = Math.round(a), hy = Math.round(b);
    x.fillStyle = blink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.35)'; x.fillRect(hx - 2, hy - 2, 5, 5);
    if (blink) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.strokeRect(hx - 5.5, hy - 5.5, 11, 11); }
    x.fillStyle = 'rgba(4,2,1,.8)'; x.fillRect(hx + 7, hy - 5, 17, 10);
    text(x, 'YOU', hx + 8, hy, 'rgba(255,255,255,.9)', 7, '600', 'left');
  }

  if (L.sheet && f < 1) { x.save(); x.globalAlpha = 1 - f; drawSheet(x, L.sheet, st); x.restore(); }

  // ---- the header
  const hy = L.panel.y + 9;
  const title = f > 0.5 && !taxi ? 'CITY MAP > ' + (districtSeen(did, st.seen) ? DISTRICTS[m.district].name.toUpperCase() : '???') : 'CITY MAP';
  text(x, title, L.panel.x + 7, hy, 'rgba(' + O + ',.95)', 9, '600', 'left');
  const sub = taxi ? 'SKY TAXI · ' + FARE + ' TOKEN A RIDE · TOKENS ' + st.tokens
    : st.ride ? (st.ride.f > 0 ? 'LINE 0 · NEXT: ' + STATIONS[st.ride.to].name : 'LINE 0 · AT ' + STATIONS[st.ride.from].name)
    : 'CROSS-SECTION · NOT TO SCALE';
  text(x, sub, L.panel.x + L.panel.w - 7, hy, 'rgba(' + PAPER + ',.7)', 7, '', 'right');
  // the strata, in the margin
  x.save(); x.beginPath(); x.rect(L.area.x, L.area.y, L.area.w, L.area.h); x.clip();
  if (f < 1) for (const s of Object.values(STRATA)) { const [a, b] = toView(c, 2, s.top + 5); text(x, s.label, a, b, 'rgba(' + O + ',' + 0.55 * (1 - f) + ')', 7, '', 'left'); }
  x.restore();

  // ---- the footer: what is picked, and the keys
  const fy = L.foot + 8, fx = L.footX, fr = L.panel.x + L.panel.w - 7;
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(L.panel.x + 4, L.foot - 1, L.panel.w - 8, 1);
  const keys = (s: string) => text(x, s, fr, fy + 11, 'rgba(' + PAPER + ',.6)', 7, '', 'right');
  if (taxi) {
    const s = STAND_IDS[m.index], name = st.seen(STANDS[s].scene) ? STANDS[s].name : '???';
    text(x, '> ' + name + (standOf(st.scene) === s ? '  (YOU ARE HERE)' : ''), fx, fy, 'rgba(' + C + ',.95)', 9, '600', 'left');
    keys(st.touch ? 'TAP A PAD · TAP AGAIN TO FLY · TAP OUTSIDE TO CANCEL' : '<- -> CHOOSE · E FLY · ESC CANCEL');
  } else if (m.zoomed) {
    const i = m.hover >= 0 ? m.hover : m.index, q = ps[i];
    if (q) {
      const look = placeLook(q, st), why = placeBlocked(q, st);
      text(x, '> ' + look.name, fx, fy, look.col, 9, '600', 'left');
      text(x, why || (st.touch ? (i === m.index ? 'TAP AGAIN TO GO' : 'TAP TO PICK') : 'E · CLICK  GO THERE'), fr, fy, why ? (look.here ? 'rgba(255,255,255,.8)' : 'rgba(' + RED + ',.9)') : 'rgba(' + C + ',.9)', 7, '600', 'right');
    }
    keys(st.touch ? 'TAP A PLACE · < CITY OR TAP OUTSIDE: BACK' : '<- -> PICK · E GO · ESC BACK · TAB / M CLOSE');
  } else {
    const i = m.hover >= 0 ? m.hover : m.district, d = DIDS[i], known = districtSeen(d, st.seen), all = districtPlaces(d);
    const n = all.filter((q) => seenPlace(q, st.seen)).length;
    text(x, '> ' + (known ? DISTRICTS[i].name.toUpperCase() : '???'), fx, fy, all.length ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.7)', 9, '600', 'left');
    text(x, !all.length ? 'NO ACCESS' : known ? n + ' OF ' + all.length + ' PLACES VISITED' : 'NOT VISITED', fr, fy, !all.length ? 'rgba(' + RED + ',.9)' : 'rgba(' + PAPER + ',.75)', 7, '600', 'right');
    // the legend
    const ly = fy + 11;
    x.fillStyle = 'rgba(' + O + ',.85)'; x.fillRect(fx, ly, 10, 1);
    text(x, 'OPEN', fx + 13, ly, 'rgba(' + PAPER + ',.6)', 7, '', 'left');
    x.strokeStyle = 'rgba(' + O + ',.5)'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(fx + 36, ly + 0.5); x.lineTo(fx + 46, ly + 0.5); x.stroke(); x.setLineDash([]);
    text(x, 'NO ACCESS', fx + 49, ly, 'rgba(' + PAPER + ',.6)', 7, '', 'left');
    x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(fx + 92, ly - 2, 4, 4);
    text(x, 'YOU', fx + 99, ly, 'rgba(' + PAPER + ',.6)', 7, '', 'left');
    if (vw > 420) keys(st.touch ? 'TAP A DISTRICT · TAP OUTSIDE TO CLOSE' : 'ARROWS PICK · E OPEN · TAB / M CLOSE');
  }
  x.restore();
}

/**
 * The title block beside the city view, as on a drawing: the district picked (or under the mouse),
 * its stratum and character, its places, its ways out. Taxi mode: the stands and the fare.
 */
function drawSheet(x: CanvasRenderingContext2D, b: Box, st: MapState) {
  const m = st.view, lx = b.x + 8, rx = b.x + b.w - 8;
  x.fillStyle = '#060302'; x.fillRect(b.x, b.y, b.w, b.h);
  x.strokeStyle = 'rgba(' + O + ',.6)'; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  let y = b.y + 10;
  const rule = () => { x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(b.x + 4, y - 4, b.w - 8, 1); y += 5; };
  const row = (s: string, col: string, size = 7, weight = '', right?: string, rcol?: string) => {
    if (y > b.y + b.h - 6) return;
    text(x, s, lx, y, col, size, weight, 'left');
    if (right) text(x, right, rx, y, rcol ?? col, 7, '', 'right');
    y += size + 4;
  };
  if (m.mode === 'taxi') {
    row('SKY TAXI', 'rgba(' + O + ',.9)', 7, '600');
    row('FARE', 'rgba(' + PAPER + ',.6)', 7, '', FARE + ' TOKEN');
    row('TOKENS', 'rgba(' + PAPER + ',.6)', 7, '', String(st.tokens));
    rule();
    STAND_IDS.forEach((s, i) => {
      const here = standOf(st.scene) === s, name = st.seen(STANDS[s].scene) ? STANDS[s].name : '???';
      row((i === m.index ? '> ' : '  ') + name, i === m.index ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.7)', 7, '600', here ? 'YOU' : '', 'rgba(255,255,255,.9)');
    });
    return;
  }
  const i = m.hover >= 0 ? m.hover : m.district, d = DIDS[i], dm = DISTRICT_MAP[d], known = districtSeen(d, st.seen);
  const stratum = DISTRICTS[i].stratum;
  row('DISTRICT ' + (i + 1) + ' OF ' + DIDS.length, 'rgba(' + O + ',.7)');
  row(known ? DISTRICTS[i].name.toUpperCase() : '???', known ? 'rgba(' + PAPER + ',.95)' : 'rgba(' + PAPER + ',.5)', 9, '600');
  row(STRATA[stratum].label, 'rgba(' + O + ',.7)');
  row(known ? dm.note : 'NO RECORD', 'rgba(' + PAPER + ',.6)');
  rule();
  const ps = districtPlaces(d);
  if (ps.length) {
    row('PLACES', 'rgba(' + O + ',.8)', 7, '600', ps.filter((q) => seenPlace(q, st.seen)).length + ' / ' + ps.length + ' VISITED', 'rgba(' + PAPER + ',.6)');
    for (const q of ps) {
      const look = placeLook(q, st);
      row('  ' + look.name, look.col, 7, '', look.here ? 'YOU' : look.note === 'GATE SHUT' ? 'SHUT' : '', look.here ? 'rgba(255,255,255,.9)' : 'rgba(' + RED + ',.85)');
    }
  } else row('PLACES', 'rgba(' + O + ',.8)', 7, '600', 'NO ACCESS', 'rgba(' + RED + ',.85)');
  rule();
  row('WAYS', 'rgba(' + O + ',.8)', 7, '600');
  const ways: [string, string, string][] = [];
  if ((Object.keys(STATIONS) as Station[]).some((s) => placeOf(STATIONS[s].scene).district === d)) ways.push(['LINE 0', 'METRO', 'rgba(' + PAPER + ',.6)']);
  if (STAND_IDS.some((s) => placeOf(STANDS[s].scene).district === d)) ways.push(['SKY TAXI', 'STAND', 'rgba(' + PAPER + ',.6)']);
  for (const l of LINKS) {
    if ((l.from !== d && l.to !== d) || l.from === l.to) continue;
    const open = l.state === 'open' || (l.state === 'gate' && st.gateOpen);
    ways.push([l.name, l.state === 'gate' ? (open ? 'OPEN' : 'SHUT') : open ? 'OPEN' : 'NO ACCESS', l.state === 'gate' ? (open ? 'rgba(' + GREEN + ',.9)' : 'rgba(' + RED + ',.85)') : 'rgba(' + PAPER + ',.4)']);
  }
  for (const [name, state, col] of ways) row('  ' + name, 'rgba(' + PAPER + ',.7)', 7, '', state, col);
}
