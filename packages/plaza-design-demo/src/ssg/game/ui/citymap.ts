import * as defaultCity from '../world/city';
import type {CityModel} from '../world/city';
import {createCityPlan} from '../world/cityplan';

/**
 * The city map (CITY.md, "The map"): the street plan, tilted back so the towers stand up (or flat),
 * with four layers: STREET, METRO, ABOVE, BELOW. The data is city.ts's (`DISTRICT_MAP`, `PLACE_MAP`,
 * the stations, pads and lines, `LINKS`), the streets are cityplan.ts's (traced once, the first time
 * the map opens); this file draws them and reads the keys and taps on it. game.ts holds the open
 * map (`MapView`) and acts on what the map asks for (`MapAct`): close, quick travel to a place, fly
 * to a stand.
 *
 * - **City view**: the map discovers the city as you travel (city.ts: `districtStage`, `placeKnown`,
 *   `linkKnown`). A district you know is lit (its streets, its towers' windows, its colour); one you
 *   have heard of is dark (dashed streets, black towers) with its short name; one you have never
 *   been near is veiled, `???`. The Spire and the Skyport are landmarks: drawn from the start, `???`
 *   until heard. Landmarks stand as scenery once their district is heard. Places show once seen,
 *   as pins; hover shows the name. Arrows pick a district, E or a tap opens it.
 * - **Layers** (tabs, 1–4 or L): STREET; METRO (LINE 0 once you have stood on a platform, its
 *   stations as roundels, trains running; LINE 1, bus 7 and the ferry only once the story makes them
 *   known); ABOVE (the taxi pads you have seen, air traffic by kind, the Spire's restricted
 *   airspace); BELOW (LINE 0's tunnel, the canals, the Undercity). TILT / FLAT (T).
 * - **District view**: the same map pans and zooms into one district; the places you know of hang
 *   on pins, with a card each along the bottom (44 px tall on a phone). A visited place you can
 *   reach is cyan: E, a click or a second tap goes there. ESC, `< CITY` or a tap outside goes back.
 * - **Taxi**: the ABOVE layer with the pads cyan; pick one and fly.
 * - **On the metro**: the METRO layer, the train on LINE 0's loop with you on it.
 *
 * The ground (land, canal, streets, avenues, towers) is painted once per view into an offscreen
 * canvas at the screen's resolution (`CACHE`) and only blitted after; what moves (boats, trains,
 * air traffic, the Spire, launches) is drawn each frame and stands still with reduced motion.
 * Colours keep their jobs (ART-GUIDE §6): orange structure, cyan what you can use, green/red the
 * gate, red no access, paper for text.
 */

import type { SceneId } from "../scenes/index";

import { C, GREEN, O, PAPER, RED, text } from "../art/core/primitives";

import { drawGalleriaDome, drawSpire } from "../art/catalog";
import type {DistrictId,DistrictStage,Knowledge,MapPlace,Stand,Station,TravelState} from '../world/city';
import type {Pt} from '../world/cityplan';


// ---------- the open map ----------

export type Layer = 'street' | 'metro' | 'above' | 'below';


/** The map while it is open (game.ts keeps it; the keys and taps here change it). */
export interface MapView {
  /** 'view': the map (TAB or M, the kiosk), where a place you know is a tap away; 'taxi': pick a stand. */
  mode: 'view' | 'taxi';
  /** Taxi: the stand picked (into STAND_IDS). District view: the place picked (into its `districtPlaces`; -1 none). */
  index: number;
  /** Under the mouse: a district (city view), a place (district view) or a stand (taxi); -1 none. */
  hover: number;
  /** City view: the place pin under the mouse (into MAP_PLACES), for its name; -1 none. */
  tip: number;
  /** The district picked (into DISTRICTS): the one the city view marks and the district view shows. */
  district: number;
  /** In the district view (or zooming into it). */
  zoomed: boolean;
  /** The game clock when the last zoom started (its animation runs ZOOM frames from there). */
  zoomAt: number;
  /** The layer shown, and whether the plan lies flat (else tilted back). */
  layer: Layer;
  flat: boolean;
}


/** Everything the map draws from. */
export interface MapState extends TravelState, Knowledge {
  view: MapView;
  /** Authoring previews keep their layer/tilt choices local instead of updating gameplay preferences. */
  rememberPreferences?: boolean;
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

type Proj = (px: number, py: number) => Pt;


export interface Box { x: number; y: number; w: number; h: number }

interface Cam { s: number; ox: number; oy: number }



// ---------- reading taps ----------

type Hit = { kind: 'outside' | 'none' | 'back' } | { kind: 'place' | 'pad' | 'tab'; i: number } | { kind: 'district'; i: number; tip: number };


// ---------- what you know, for drawing ----------

type Ctx = CanvasRenderingContext2D;


/** How a district is drawn: lit (known), dark (heard, or a landmark not yet heard of), or veiled (unknown). */
type Look = 'lit' | 'dark' | 'veiled';


interface Cache { key: string; canvas: HTMLCanvasElement; cam: Cam; box: Box }
/** Map rendering/input and caches consume one isolated city/plan pair. */
export function createCityMap(world:CityModel=defaultCity,geography:ReturnType<typeof createCityPlan>=createCityPlan(world)){
 const {DISTRICT_MAP,DISTRICT_REVEAL,DISTRICTS,districtName,districtPlaces,districtStage,FARE,knownPlaces,LINES_PLANNED,lineKnownFlag,linkKnown,LINKS,LOOP_MAP,MAP_H,MAP_W,PAD_MAP,PLACE_MAP,placeBlocked,transportPermission,placeKnown,placeOf,seenPlace,STAND_IDS,STANDS,standOf,STATION_MAP,stationKnown,STATIONS,TRANSPORT}=world;
 type Layout = ReturnType<typeof layout>;
 const {CANAL,CANAL_W,COAST,coastX,districtAt,FENCE,hash,ISLE,onIsle,PARK,plan,WEST,westX}=geography;

const LAYERS: Layer[] = ['street', 'metro', 'above', 'below'];

const LAYER_NAME: Record<Layer, string> = { street: 'STREET', metro: 'METRO', above: 'ABOVE', below: 'BELOW' };


const DIDS = DISTRICTS.map((d) => d.id) as DistrictId[];

const UNDER = DIDS.indexOf('undercity');

/** Frames of the zoom between the city and a district. */
const ZOOM = 16;

/** The layer and the tilt you last looked at, kept while the game runs. */
let lastLayer: Layer = 'street', lastFlat = false;


/** The district you are in; on the train, the one whose station it last stood at. */
function hereDistrict(scene: SceneId, rideFrom: Station | null): number {
  const d = placeOf(scene).district ?? (rideFrom ? placeOf(STATIONS[rideFrom].scene).district : null) ?? 'downtown';
  return DIDS.indexOf(d);
}


/** A map opening on the city view, your district picked (taxi: the next stand along, ABOVE; on the train: METRO). */
 function openMap(mode: 'view' | 'taxi', scene: SceneId, rideFrom: Station | null): MapView {
  const here = standOf(scene), i = here ? STAND_IDS.indexOf(here) : -1;
  const layer: Layer = mode === 'taxi' ? 'above' : scene === TRANSPORT.boarding.scene ? 'metro' : lastLayer;
  return {
    mode, index: mode === 'taxi' ? (i + 1) % STAND_IDS.length : -1, hover: -1, tip: -1,
    district: layer === 'below' ? UNDER : hereDistrict(scene, rideFrom), zoomed: false, zoomAt: -1e9, layer, flat: lastFlat,
  };
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


/** The places of the district picked that you know of: the district view's pins and cards. */
const placesOf = (st: MapState) => knownPlaces(DIDS[st.view.district], st.seen);

/** Every place on the map that you know of (the city view's pins). */
const allKnown = (st: MapState) => DIDS.flatMap((d) => knownPlaces(d, st.seen));


// ---------- the plan, tilted or flat ----------

/** The tilt: the plan leaned back (y squashed, sheared east), as an affine map plan → sheet. */
const TILT = { a: 0.82, c: 0.3, d: 0.6, e: 20, f: 130 };

const flatP: Proj = (px, py) => [px, py];

const tiltP: Proj = (px, py) => [px * TILT.a + py * TILT.c + TILT.e, py * TILT.d + TILT.f];

const projOf = (flat: boolean) => (flat ? flatP : tiltP);

/** Sheet → plan (the ground under a point of the sheet). */
function unproj(flat: boolean, sx: number, sy: number): Pt {
  if (flat) return [sx, sy];
  const py = (sy - TILT.f) / TILT.d;
  return [(sx - TILT.e - py * TILT.c) / TILT.a, py];
}

/** The part of the sheet the city view shows. */
const sheetBox = (flat: boolean): Box => (flat ? { x: 0, y: 0, w: MAP_W, h: MAP_H } : { x: 12, y: 22, w: 828, h: 348 });


/** A district's frame on the sheet: its plan frame (tilted: its corners projected, room above for its towers). */
function districtBox(d: DistrictId, flat: boolean): Box {
  const [x, y, w, h] = DISTRICT_MAP[d].frame, P = projOf(flat);
  const pts = [P(x, y), P(x + w, y), P(x, y + h), P(x + w, y + h)];
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  let y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  if (!flat) y0 -= 10 + 40 * DISTRICT_MAP[d].dens;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}


// ---------- layout ----------

/**
 * The map draws in its own units: the game's view scaled so it is about MAP_VIEW_H tall (never
 * smaller than the view's own units), so its text reads the same at 1280 × 720 as on a phone.
 */
const MAP_VIEW_H = 300;

const mapUnit = (vh: number) => Math.max(1, vh / MAP_VIEW_H);

const scaleBox = (b: Box | null, u: number): Box | null => (b ? { x: b.x / u, y: b.y / u, w: b.w / u, h: b.h / u } : null);


/** Where everything sits in a view vw × vh: the panel, the map area, the tabs, and (district view) the strip of cards and the back button. */
function layout(vw: number, vh: number, tapMin: number, avoid: Box | null, flat: boolean, taxi: boolean) {
  const panel: Box = { x: 3, y: 3, w: vw - 6, h: vh - 6 };
  const head = 16, foot = 26;
  const area: Box = { x: panel.x + 5, y: panel.y + head, w: panel.w - 10, h: panel.h - head - foot };
  const stripH = Math.round(Math.max(30, tapMin + 2));
  // the strip and the footer start right of a button left over the bottom-left corner (the phone's ESC)
  const clear = (top: number) => (avoid && avoid.x < vw / 3 && avoid.y + avoid.h > top ? avoid.x + avoid.w + 4 : 0);
  const sy = area.y + area.h - stripH, sx = Math.max(area.x, clear(sy));
  const strip: Box = { x: sx, y: sy, w: area.x + area.w - sx, h: stripH };
  const footX = Math.max(panel.x + 7, clear(panel.y + panel.h - foot));
  const back: Box = { x: strip.x, y: strip.y, w: Math.round(Math.max(54, tapMin * 1.5)), h: stripH };
  // the layer tabs, over the map's top-left corner (sky on the tilted plan); TILT / FLAT last
  const th = Math.round(Math.max(15, tapMin)), tabs: Box[] = [];
  if (!taxi) {
    let tx = area.x + 4;
    for (const s of [...LAYERS.map((l) => LAYER_NAME[l]), 'FLAT']) { const w = Math.round(Math.max(tapMin, s.length * 4.4 + 12)); tabs.push({ x: tx, y: area.y + 4, w, h: th }); tx += w + (s === 'BELOW' ? 8 : 3); }
  }
  const top = taxi ? 0 : th + 8;
  // the flat plan keeps below the tabs (its top-left is the Skyport); the tilted one has sky there
  const fitBox: Box = flat ? { x: area.x, y: area.y + top, w: area.w, h: area.h - top } : area;
  const focus: Box = { x: area.x + 4, y: area.y + top + 2, w: area.w - 8, h: area.h - top - stripH - 10 };
  return { panel, area, strip, focus, back, tabs, fitBox, foot: panel.y + panel.h - foot, footX };
}


function fit(r: Box, b: Box): Cam {
  const s = Math.min(b.w / r.w, b.h / r.h);
  return { s, ox: b.x + (b.w - r.w * s) / 2 - r.x * s, oy: b.y + (b.h - r.h * s) / 2 - r.y * s };
}

const cityCam = (L: Layout, flat: boolean) => fit(sheetBox(flat), L.fitBox);

const districtCam = (L: Layout, d: DistrictId, flat: boolean) => { const r = districtBox(d, flat), pad = 8; return fit({ x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }, L.focus); };


/** The map's camera: the whole plan fitted to the area, sliding (scale and centre) into the district picked. */
function camera(st: MapState, L: Layout): Cam {
  const flat = st.view.flat, c0 = cityCam(L, flat), f = zoomF(st);
  if (f <= 0) return c0;
  const c1 = districtCam(L, DIDS[st.view.district], flat);
  if (f >= 1) return c1;
  const s = c0.s * Math.pow(c1.s / c0.s, f);
  // the sheet point at the view's centre slides from the city's centre to the district's
  const a0 = L.fitBox, a1 = L.focus;
  const m0x = (a0.x + a0.w / 2 - c0.ox) / c0.s, m0y = (a0.y + a0.h / 2 - c0.oy) / c0.s;
  const m1x = (a1.x + a1.w / 2 - c1.ox) / c1.s, m1y = (a1.y + a1.h / 2 - c1.oy) / c1.s;
  const mx = m0x + (m1x - m0x) * f, my = m0y + (m1y - m0y) * f;
  const vx = a0.x + a0.w / 2 + (a1.x + a1.w / 2 - a0.x - a0.w / 2) * f, vy = a0.y + a0.h / 2 + (a1.y + a1.h / 2 - a0.y - a0.h / 2) * f;
  return { s, ox: vx - mx * s, oy: vy - my * s };
}


/** Plan → map units, through the projection and the camera. */
const viewer = (c: Cam, flat: boolean) => { const P = projOf(flat); return (px: number, py: number): Pt => { const [a, b] = P(px, py); return [c.ox + a * c.s, c.oy + b * c.s]; }; };


/** The cards along the strip in the district view, one per place, centred right of the back button. */
function cards(L: Layout, n: number): Box[] {
  const x0 = L.back.x + L.back.w + 6, room = L.strip.x + L.strip.w - x0, gap = 4;
  const w = Math.floor(Math.min(124, (room - gap * (n - 1)) / Math.max(1, n)));
  const start = x0 + Math.round((room - (w * n + gap * (n - 1))) / 2);
  return Array.from({ length: n }, (_, i) => ({ x: start + i * (w + gap), y: L.strip.y, w, h: L.strip.h }));
}

const inBox = (b: Box, px: number, py: number) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

const lay = (st: MapState, vw: number, vh: number) => layout(vw, vh, st.tapMin, st.avoid, st.view.flat, st.view.mode === 'taxi');


/** Which districts can be picked in a layer: the street's (and the Spire, the Skyport), or under it all, the Undercity. */
const pickable = (layer: Layer) => DIDS.map((_, i) => i).filter((i) => (layer === 'below' ? i === UNDER : i !== UNDER));


/** The district on the plan under a point of the sheet (the Spire: its island, or its tower standing up). */
function districtUnder(st: MapState, sx: number, sy: number): number {
  const flat = st.view.flat, [px, py] = unproj(flat, sx, sy);
  if (st.view.layer === 'below') return px > 0 && px > westX(py) && px < coastX(py) && py > 0 && py < MAP_H ? UNDER : -1;
  if (!flat) { const [ix, iy] = tiltP(ISLE.x, ISLE.y); if (Math.abs(sx - ix) < 14 && sy < iy + 8 && sy > iy - 160) return DIDS.indexOf('spire'); }
  if (onIsle(px, py)) return DIDS.indexOf('spire');
  if (px < 0 || py < 0 || py > MAP_H || px >= coastX(py) || px <= westX(py)) return -1;
  return DIDS.indexOf(districtAt(px, py));
}


/** What is under a point of the view (view units). */
function hitAt(st: MapState, vw: number, vh: number, px: number, py: number): Hit {
  const L = lay(st, vw, vh), m = st.view, c = camera(st, L), V = viewer(c, m.flat);
  if (!inBox(L.panel, px, py)) return { kind: 'outside' };
  const ti = L.tabs.findIndex((b) => inBox(b, px, py));
  if (ti >= 0) return { kind: 'tab', i: ti };
  const reach = Math.max(9, st.tapMin / 2);
  const near = (pts: Pt[]) => {
    let best = -1, bd = reach;
    pts.forEach(([X, Y], i) => { const [a, b] = V(X, Y), d = Math.hypot(a - px, b - py); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  if (m.mode === 'taxi') { const i = near(STAND_IDS.map((s) => PAD_MAP[s])); return i >= 0 ? { kind: 'pad', i } : { kind: 'none' }; }
  if (m.zoomed) {
    if (inBox(L.back, px, py)) return { kind: 'back' };
    const ps = placesOf(st), ci = cards(L, ps.length).findIndex((b) => inBox(b, px, py));
    if (ci >= 0) return { kind: 'place', i: ci };
    const pi = near(ps.map((p) => p.pt));
    if (pi >= 0) return { kind: 'place', i: pi };
    const r = districtBox(DIDS[m.district], m.flat), a = c.ox + r.x * c.s, b = c.oy + r.y * c.s;
    // a tap outside the district (or outside the map) goes back to the city
    return inBox({ x: a, y: b, w: r.w * c.s, h: r.h * c.s }, px, py) && inBox(L.area, px, py) ? { kind: 'none' } : { kind: 'back' };
  }
  if (!inBox(L.area, px, py)) return { kind: 'none' };
  const tip = m.layer === 'street' ? near(allKnown(st).map((p) => p.pt)) : -1;
  const tipPlace = tip >= 0 ? allKnown(st)[tip] : null;
  // a place's pin picks its district; else the ground under the point
  const i = tipPlace?.district ? DIDS.indexOf(tipPlace.district) : districtUnder(st, (px - c.ox) / c.s, (py - c.oy) / c.s);
  return i >= 0 && pickable(m.layer).includes(i) ? { kind: 'district', i, tip: tipPlace ? MAP_PLACE_IDS.indexOf(tipPlace.id) : -1 } : { kind: 'none' };
}

const MAP_PLACE_IDS = DIDS.flatMap((d) => districtPlaces(d).map((p) => p.id));

const mapPlaceById = (i: number) => DIDS.flatMap((d) => districtPlaces(d))[i] ?? null;


/** Open the district picked, if it has places on the map that you know of. */
function zoomIn(st: MapState): MapAct {
  const m = st.view, ps = placesOf(st);
  if (!ps.length) return { kind: 'denied' };
  setZoom(st, true);
  m.index = Math.max(0, ps.findIndex((p) => p.scenes.includes(st.scene)));
  return { kind: 'zoom' };
}

function zoomOut(st: MapState): MapAct { setZoom(st, false); return { kind: 'back' }; }


/** Show another layer (taxi mode keeps ABOVE). BELOW picks the Undercity; leaving it picks where you are. */
function setLayer(st: MapState, layer: Layer): MapAct {
  const m = st.view;
  if (m.mode === 'taxi' || layer === m.layer) return { kind: 'none' };
  m.layer = layer;
  if (st.rememberPreferences !== false) lastLayer = layer;
  const want = layer === 'below' ? UNDER : m.district === UNDER ? hereDistrict(st.scene, st.ride?.from ?? null) : m.district;
  if (want !== m.district) { if (m.zoomed) setZoom(st, false); m.district = want; }
  m.hover = -1; m.tip = -1;
  return { kind: 'blip' };
}

function toggleFlat(st: MapState): MapAct { const m = st.view; m.flat = !m.flat; if (st.rememberPreferences !== false) lastFlat = m.flat; m.hover = -1; m.tip = -1; return { kind: 'blip' }; }


/** A district's middle on the sheet (for the arrows). */
function districtMid(d: DistrictId, flat: boolean): Pt {
  const c = DISTRICT_MAP[d].centre ?? (d === 'spire' ? [ISLE.x, ISLE.y] : DISTRICT_MAP[d].label);
  return projOf(flat)(c[0], c[1]);
}

/** From district i, the nearest district in direction (dx, dy) on the sheet, among those this layer can pick. */
function neighbour(i: number, dx: number, dy: number, layer: Layer, flat: boolean) {
  const [x0, y0] = districtMid(DIDS[i], flat);
  let best = i, bs = Infinity;
  for (const j of pickable(layer)) {
    if (j === i) continue;
    const [x1, y1] = districtMid(DIDS[j], flat), vx = x1 - x0, vy = y1 - y0, along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
    if (along <= 0) continue;
    // in a cone round the direction first; past its edge only if nothing is in it
    const s = along + across * 2 + (along < across * 0.7 ? 1000 : 0);
    if (s < bs) { bs = s; best = j; }
  }
  return best;
}


/** A key on the open map. Arrows (or WASD) pick, E / Enter / Space open or go, 1–4 or L the layer, T tilt, ESC back a level, TAB or M closes. */
 function mapKey(st: MapState, key: string): MapAct {
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
  if (k >= '1' && k <= '4') return setLayer(st, LAYERS[+k - 1]);
  if (k === 'l') return setLayer(st, LAYERS[(LAYERS.indexOf(m.layer) + 1) % LAYERS.length]);
  if (k === 't') return toggleFlat(st);
  if (k === 'Escape') return m.zoomed ? zoomOut(st) : { kind: 'close' };
  if (!m.zoomed) {
    if (dir) { const j = neighbour(m.district, dir[0], dir[1], m.layer, m.flat); if (j === m.district) return { kind: 'none' }; m.district = j; m.hover = -1; m.tip = -1; return { kind: 'blip' }; }
    return ok ? zoomIn(st) : { kind: 'none' };
  }
  const ps = placesOf(st), n = ps.length;
  if (dir) { m.index = ((m.index < 0 ? 0 : m.index + (dir[0] || dir[1])) + n) % n; m.hover = -1; return { kind: 'blip' }; }
  return ok && m.index >= 0 ? { kind: 'go', place: ps[m.index] } : { kind: 'none' };
}


/**
 * The pointer on the open map. The mouse hovers and a click acts at once; on touch a first tap
 * picks a place or a pad and a second one goes (a district opens on the first). Outside the
 * district goes back to the city; outside the panel closes the map.
 */
 function mapPointer(st: MapState, vw: number, vh: number, px: number, py: number, press: boolean, mouse: boolean): { act: MapAct; pointer: boolean } {
  const u = mapUnit(vh), m = st.view, s2 = { ...st, tapMin: st.tapMin / u, avoid: scaleBox(st.avoid, u) }, h = hitAt(s2, vw / u, vh / u, px / u, py / u);
  const i = 'i' in h && h.kind !== 'tab' ? h.i : -1;
  if (mouse) { m.hover = i; m.tip = h.kind === 'district' ? h.tip : -1; }
  const pointer = i >= 0 || h.kind === 'tab' || (h.kind === 'back' && m.zoomed);
  if (!press) return { act: { kind: 'none' }, pointer };
  switch (h.kind) {
    case 'outside': return { act: m.zoomed && m.mode === 'view' ? zoomOut(st) : { kind: 'close' }, pointer };
    case 'back': return { act: zoomOut(st), pointer };
    case 'tab': return { act: h.i < LAYERS.length ? setLayer(st, LAYERS[h.i]) : toggleFlat(st), pointer };
    case 'district': m.district = i; if (!mouse) m.tip = h.tip; return { act: zoomIn(st), pointer };
    case 'pad':
      if (mouse || m.index === i) return { act: { kind: 'fly', stand: STAND_IDS[i] }, pointer };
      m.index = i; return { act: { kind: 'blip' }, pointer };
    case 'place':
      if (mouse || m.index === i) return { act: { kind: 'go', place: placesOf(st)[i] }, pointer };
      m.index = i; return { act: { kind: 'blip' }, pointer };
    default: return { act: { kind: 'none' }, pointer };
  }
}

const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a.toFixed(3) + ')';

const mix = (c: string, k: number, add: number) => c.split(',').map((v) => Math.round(+v * k + add)).join(',');

function lookOf(d: DistrictId, k: Knowledge): Look {
  const s: DistrictStage = districtStage(d, k);
  return s === 'known' ? 'lit' : s === 'heard' || DISTRICT_REVEAL[d].landmark ? 'dark' : 'veiled';
}

/** Scenery stands once a district is heard of (a landmark always). */
const shows = (d: DistrictId, k: Knowledge) => lookOf(d, k) !== 'veiled';

/** You know LINE 0's map once you have stood on a platform or ridden it (from the street you see only the stairs). */
const lineKnown = (st: MapState) => (Object.keys(STATIONS) as Station[]).some((s) => st.seen(STATIONS[s].scene)) || st.seen(TRANSPORT.boarding.scene) || !!st.ride;


// ---------- the ground, painted once per view ----------

/** The ground in plan units: land, washes, canal, streets, avenues, the fence, bridges, the sea, the veil over what you do not know. */
function paintGround(g: Ctx, look: (d: DistrictId) => Look) {
  const P = plan(), W = MAP_W, H = MAP_H;
  const landPath = () => { g.beginPath(); g.moveTo(-40, -40); g.lineTo(COAST[0][0], -40); COAST.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(COAST[COAST.length - 1][0], H + 40); g.lineTo(-40, H + 40); g.closePath(); };
  g.fillStyle = '#16121a'; landPath(); g.fill();
  // district washes, soft, so colour reads as an area not a box
  g.save(); landPath(); g.clip();
  for (const d of DIDS) {
    const dm = DISTRICT_MAP[d], lk = look(d);
    if (!dm.centre || lk === 'veiled') continue;
    const [cx, cy] = dm.centre, tint = mix(dm.col, 0.16, 14);
    const gr = g.createRadialGradient(cx, cy, 10, cx, cy, 120);
    gr.addColorStop(0, rgba(tint, lk === 'lit' ? 0.95 : 0.35)); gr.addColorStop(1, rgba(tint, 0));
    g.fillStyle = gr; g.fillRect(cx - 120, cy - 120, 240, 240);
  }
  g.restore();
  if (look('downtown') === 'lit') { g.fillStyle = 'rgba(58,168,106,.28)'; g.beginPath(); g.ellipse(PARK.x, PARK.y, PARK.rx, PARK.ry, 0, 0, 7); g.fill(); }
  // the canal: its banks, the water, a dashed fairway
  const canal = () => { g.beginPath(); CANAL.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); };
  g.lineJoin = 'round'; g.lineCap = 'butt';
  g.strokeStyle = 'rgba(120,190,210,.45)'; g.lineWidth = CANAL_W + 2; canal(); g.stroke();
  g.strokeStyle = '#071420'; g.lineWidth = CANAL_W; canal(); g.stroke();
  g.strokeStyle = 'rgba(120,190,210,.16)'; g.lineWidth = 1; g.setLineDash([3, 4]); canal(); g.stroke(); g.setLineDash([]);
  // streets: a dark edge, then the road (dashed and faint where you have only heard of the district)
  g.lineJoin = 'round'; g.lineCap = 'round';
  const poly = (pts: Pt[]) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); };
  for (const pass of [0, 1]) for (const S of P.streets) {
    const lk = look(S.d); if (lk === 'veiled' || (lk === 'dark' && pass === 0)) continue;
    g.strokeStyle = pass === 0 ? 'rgba(4,3,6,.9)' : lk === 'lit' ? 'rgba(255,217,165,.30)' : 'rgba(255,217,165,.09)';
    g.lineWidth = pass === 0 ? S.w + 1.6 : S.w; if (lk === 'dark') g.setLineDash([2, 3]);
    poly(S.pts); g.stroke(); g.setLineDash([]);
  }
  for (const pass of [0, 1]) for (const A of P.avenues) {
    const lk = look(A.d); if (lk === 'veiled') continue;
    const lit = lk === 'lit';
    g.strokeStyle = pass ? (A.ring ? rgba('255,170,96', lit ? 0.8 : 0.3) : rgba(PAPER, lit ? 0.62 : 0.2)) : 'rgba(4,3,6,.95)';
    g.lineWidth = pass ? A.w : A.w + 2.4; poly(A.pts); g.stroke();
    if (A.ring && pass) { g.strokeStyle = 'rgba(20,10,4,.9)'; g.lineWidth = 0.8; g.setLineDash([3, 3]); g.stroke(); g.setLineDash([]); }
  }
  // bridges: where an avenue crosses the canal, its railings show
  g.fillStyle = 'rgba(255,217,165,.9)';
  for (const b of P.bridges) {
    if (look(b.d) === 'veiled') continue;
    g.fillRect(b.x + b.nx * b.hw - 0.5, b.y + b.ny * b.hw - 0.5, 1, 1); g.fillRect(b.x - b.nx * b.hw - 0.5, b.y - b.ny * b.hw - 0.5, 1, 1);
  }
  // the Skyport behind its fence (a landmark: always there), its launch pads
  { const [x, y, w, h] = FENCE; g.strokeStyle = 'rgba(255,42,68,.6)'; g.lineWidth = 1; g.setLineDash([4, 2]); g.strokeRect(x, y, w, h); g.setLineDash([]); g.fillStyle = 'rgba(255,42,68,.05)'; g.fillRect(x, y, w, h); }
  for (const [lx, ly] of [[34, 50], [70, 44]]) { g.strokeStyle = 'rgba(170,190,210,.6)'; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.stroke(); g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.stroke(); }
  // the Fringe's landfill and the farms' fields
  if (look('fringe') !== 'veiled') { g.fillStyle = 'rgba(90,74,48,.55)'; g.beginPath(); g.ellipse(60, 206, 30, 14, -0.2, 0, 7); g.fill(); for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(60,160,80,.28)'; g.fillRect(108 + k * 9, 168, 6, 22); } }
  // the sea and the shore
  g.fillStyle = '#071420'; g.beginPath(); g.moveTo(W + 60, -40); g.lineTo(COAST[0][0], -40); COAST.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(COAST[COAST.length - 1][0], H + 40); g.lineTo(W + 60, H + 40); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(120,190,210,.45)'; g.lineWidth = 1.5; g.beginPath(); COAST.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
  // the west sea in the south-west (the beach's shore, the canal's mouth)
  g.fillStyle = '#071420'; g.beginPath(); g.moveTo(-60, WEST[0][1]); WEST.forEach(([a, b]) => g.lineTo(a, b)); g.lineTo(WEST[WEST.length - 1][0], H + 40); g.lineTo(-60, H + 40); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(120,190,210,.45)'; g.beginPath(); WEST.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
  // the Spire's island
  g.fillStyle = '#141020'; g.beginPath(); g.arc(ISLE.x, ISLE.y, ISLE.r, 0, 7); g.fill(); g.strokeStyle = 'rgba(' + O + ',.3)'; g.stroke();
  // the veil over the districts you know nothing of: their cells, softened at the edges
  const { cells, cell, cols, rows } = P;
  for (let j = 0; j < rows; j++) {
    let run = -1, ra = 0;
    for (let i = 0; i <= cols; i++) {
      let a = 0;
      if (i < cols) {
        let n = 0, v = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
          const c = cells[jj * cols + ii]; if (!c) continue; n++; if (look(DIDS[c - 1]) === 'veiled') v++;
        }
        a = cells[j * cols + i] && n ? Math.round((v / n) * 4) / 4 : 0;
      }
      if (a !== ra || i === cols) {
        if (run >= 0 && ra > 0) { g.fillStyle = 'rgba(9,7,10,' + (0.82 * ra).toFixed(3) + ')'; g.fillRect(run * cell, j * cell, (i - run) * cell, cell); }
        run = i; ra = a;
      }
    }
  }
}


/** Towers standing up on the tilted plan, back to front: lit in districts you know, black where you have only heard. */
function paintTowers(g: Ctx, look: (d: DistrictId) => Look, lift: number) {
  const P = plan();
  for (const L of P.towers) {
    const lk = look(L.d); if (lk === 'veiled') continue;
    const dm = DISTRICT_MAP[L.d], tall = L.d === 'fringe' || L.d === 'skyport' ? 4 : 4 + L.k * L.k * 46 * dm.dens, hgt = Math.round(tall * lift);
    if (hgt < 2) continue;
    const c = (Math.cos(L.th) * L.s) / 2, sn = (Math.sin(L.th) * L.s) / 2;
    const P4 = [[-c + sn, -sn - c], [c + sn, sn - c], [c - sn, sn + c], [-c - sn, -sn + c]].map(([dx, dy]) => tiltP(L.x + dx, L.y + dy));
    const lo = [...P4].sort((a, b) => b[1] - a[1]).slice(0, 2).sort((a, b) => a[0] - b[0]);
    const lit = lk === 'lit';
    g.globalAlpha = lift < 1 ? 0.45 : 1;
    // the front face, darker at the foot
    const fg = g.createLinearGradient(0, lo[0][1] - hgt, 0, lo[0][1]);
    fg.addColorStop(0, lit ? rgba(mix(dm.col, 0.16, 10), 1) : '#0f0b0e'); fg.addColorStop(1, lit ? rgba(mix(dm.col, 0.05, 6), 1) : '#070507');
    g.fillStyle = fg; g.beginPath(); g.moveTo(lo[0][0], lo[0][1] - hgt); g.lineTo(lo[1][0], lo[1][1] - hgt); g.lineTo(lo[1][0], lo[1][1]); g.lineTo(lo[0][0], lo[0][1]); g.closePath(); g.fill();
    // the roof, a shade lighter, with a lit edge
    g.fillStyle = lit ? rgba(mix(dm.col, 0.24, 14), 1) : '#16111a'; g.beginPath(); P4.forEach(([a, b], i) => (i ? g.lineTo(a, b - hgt) : g.moveTo(a, b - hgt))); g.closePath(); g.fill();
    g.strokeStyle = lit ? rgba(dm.col, 0.55) : 'rgba(' + O + ',.16)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(lo[0][0], lo[0][1] - hgt); g.lineTo(lo[1][0], lo[1][1] - hgt); g.stroke();
    // windows in tidy rows
    const fw = lo[1][0] - lo[0][0], slope = (lo[1][1] - lo[0][1]) / Math.max(1, fw);
    if (lit && hgt > 9 && fw > 3) for (let wy = 4; wy < hgt - 3; wy += 3) for (let wx = 1.5; wx < fw - 1; wx += 2.2) {
      if (hash(L.x * 3 + L.y + wy * 7 + wx) > 0.45) { g.fillStyle = rgba(dm.col, 0.35 + hash(wy + wx + 0.5) * 0.4); g.fillRect(lo[0][0] + wx, lo[0][1] - hgt + wy + slope * wx, 1, 1); }
    }
  }
  g.globalAlpha = 1;
}


/** Each layer's veil over the ground: the streets step back so the lines read. */
const LAYER_DIM: Record<Layer, string | null> = { street: null, metro: 'rgba(8,6,10,.72)', above: 'rgba(10,6,24,.6)', below: 'rgba(4,10,8,.72)' };

const CACHE: Cache[] = [];

/** At most this many device pixels per cached view (a phone at 3× would otherwise ask for a lot). */
const CACHE_PX = 4.5e6;


/** The ground of one view (the city, or one district) at the screen's resolution, painted once and kept. */
function groundFor(st: MapState, L: Layout, cam: Cam, camKey: string, dpr: number): Cache {
  const m = st.view, look = (d: DistrictId) => lookOf(d, st);
  const sig = DIDS.map((d) => look(d)[0]).join('');
  const box = L.area, key = [camKey, m.layer, m.flat ? 'f' : 't', sig, box.w.toFixed(1), box.h.toFixed(1), cam.s.toFixed(4), dpr.toFixed(3)].join('|');
  const hit = CACHE.find((c) => c.key === key);
  if (hit) return hit;
  let px = dpr;
  if (box.w * box.h * px * px > CACHE_PX) px = Math.sqrt(CACHE_PX / (box.w * box.h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(box.w * px)); canvas.height = Math.max(1, Math.round(box.h * px));
  const g = canvas.getContext('2d')!;
  g.setTransform(px, 0, 0, px, -box.x * px, -box.y * px);
  g.transform(cam.s, 0, 0, cam.s, cam.ox, cam.oy);
  g.fillStyle = '#07060c'; g.fillRect(-200, -200, MAP_W + 400, MAP_H + 400);
  g.save();
  if (!m.flat) g.transform(TILT.a, 0, TILT.c, TILT.d, TILT.e, TILT.f);
  paintGround(g, look);
  g.restore();
  if (!m.flat) paintTowers(g, look, m.layer === 'street' ? 1 : 0.35);
  const dim = LAYER_DIM[m.layer];
  if (dim) { g.fillStyle = dim; g.fillRect(-200, -200, MAP_W + 400, MAP_H + 400); }
  const c: Cache = { key, canvas, cam, box };
  CACHE.unshift(c);
  if (CACHE.length > 4) CACHE.length = 4;
  return c;
}


/** Draw a cached view under another camera (scaled while the map zooms). */
function blit(x: Ctx, c: Cache, cam: Cam) {
  const r = cam.s / c.cam.s;
  x.save(); x.translate(cam.ox - c.cam.ox * r, cam.oy - c.cam.oy * r); x.scale(r, r);
  x.imageSmoothingEnabled = true; x.drawImage(c.canvas, c.box.x, c.box.y, c.box.w, c.box.h);
  x.restore();
}


// ---------- what moves on the map ----------

/** A point along a polyline (0..1), and the heading there. */
function along(pts: Pt[], f: number): [number, number, number] {
  let L = 0; const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let s = f * L, i = 0;
  while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
  const g = seg[i] ? s / seg[i] : 0;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * g, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * g, Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])];
}

const pingPong = (f: number) => { f %= 2; return f < 1 ? f : 2 - f; };


/** Boats and ships, in plan units (the caller sets the projection): barges on the canal, ships at the quay and passing, the patrol, fishing boats. */
function drawBoats(x: Ctx, t: number, k: Knowledge, a: number) {
  const boat = (px: number, py: number, ang: number, len: number, wid: number, hull: string, light: string | null, wake = true) => {
    x.save(); x.translate(px, py); x.rotate(ang);
    if (wake) { x.fillStyle = 'rgba(160,220,255,' + (0.18 * a).toFixed(3) + ')'; x.beginPath(); x.moveTo(-len / 2, 0); x.lineTo(-len / 2 - len, -wid); x.lineTo(-len / 2 - len, wid); x.closePath(); x.fill(); }
    x.globalAlpha = a; x.fillStyle = hull; x.beginPath(); x.moveTo(-len / 2, -wid / 2); x.lineTo(len / 2 - wid / 2, -wid / 2); x.lineTo(len / 2, 0); x.lineTo(len / 2 - wid / 2, wid / 2); x.lineTo(-len / 2, wid / 2); x.closePath(); x.fill();
    if (light) { x.fillStyle = light; x.fillRect(-1, -1, 2, 2); }
    x.restore();
  };
  // barges on the canal, up and down
  if (shows('oldq', k)) for (let i = 0; i < 3; i++) { const f = (t * 0.0006 + i / 3) % 2, fw = f < 1, [px, py, ang] = along(CANAL, pingPong(f)); boat(px, py, fw ? ang : ang + Math.PI, 7, 3, '#5a4a30', 'rgba(255,210,120,.9)'); }
  // the ferry to the Spire's foot (once the story makes it known)
  if (k.flag(lineKnownFlag('ferry'))) { const f = (t * 0.0012) % 2, out = f < 1, [px, py, ang] = along([[700, 300], [744, 220], [760, 150]], pingPong(f)); boat(px, py, out ? ang : ang + Math.PI, 10, 4, '#d8d0c0', 'rgba(255,217,165,.9)'); }
  // out at sea: a container ship going north, a tanker at anchor, a cruise liner far out
  { const py = ((t * 0.08) % (MAP_H + 80)) - 40; boat(812, py, -Math.PI / 2, 26, 7, '#7a2a1a', 'rgba(255,255,255,.8)'); x.globalAlpha = a; for (let i = 0; i < 4; i++) { x.fillStyle = ['#1f4a52', '#5a4a14', '#3a2050', '#2c3a24'][i]; x.fillRect(809, py - 8 + i * 5, 6, 4); } x.globalAlpha = 1; }
  { const bob = Math.sin(t * 0.02) * 0.6; boat(800, 60 + bob, -0.4, 28, 7, '#3a3a40', 'rgba(255,42,68,.9)', false); }
  { const px = MAP_W + 40 - ((t * 0.05) % (MAP_W * 0.5 + 80)), py = 22; if (px < MAP_W + 30 && px > 650) { boat(px, py, Math.PI, 34, 8, '#e8e0f0', null); x.globalAlpha = a; for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? 'rgba(255,190,110,.9)' : 'rgba(255,240,215,.9)'; x.fillRect(px - 12 + i * 4, py - 1, 2, 2); } x.globalAlpha = 1; } }
  // fishing boats off the beach, in the west sea
  if (shows('oldq', k)) for (let i = 0; i < 3; i++) { const px = 44 + i * 14 + Math.sin(t * 0.01 + i) * 3, py = 356 + i * 8 + Math.cos(t * 0.013 + i) * 2; boat(px, py, Math.sin(t * 0.005 + i) * 0.3, 5, 2, '#e8e0d0', null, false); x.globalAlpha = a; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(px, py - 4, 1, 4); x.globalAlpha = 1; }
  if (!shows('harbor', k)) return;
  // two ships moored at the quay
  for (const [py, len, hull] of [[262, 30, '#2a3a5a'], [300, 24, '#5a2a1a']] as [number, number, string][]) {
    const px = coastX(py) + 9; boat(px, py, Math.PI / 2 + 0.12, len, 8, hull, null, false);
    x.globalAlpha = a; for (let i = 0; i < len / 6 - 1; i++) { x.fillStyle = ['#7a2a1a', '#1f4a52', '#5a4a14', '#3a2050'][i % 4]; x.fillRect(px - 3, py - len / 2 + 3 + i * 6, 6, 5); }
    x.fillStyle = 'rgba(255,230,180,.8)'; x.fillRect(px - 1, py + len / 2 - 4, 2, 2); x.globalAlpha = 1;
  }
  // the harbor patrol
  { const g = t * 0.004, px = 770 + Math.cos(g) * 26, py = 260 + Math.sin(g) * 46; boat(px, py, g + Math.PI / 2, 8, 3, '#2a2d33', Math.floor(t / 6) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(80,120,255,.95)'); }
}


/**
 * The landmarks standing on the tilted plan, in sheet units: a small model of each district's
 * landmark on its spot, there once the district is heard of (scenery, not places). `px`: how many
 * map units a sheet unit is (signs on the models only when they can be read).
 */
function drawLandmarks(x: Ctx, t: number, k: Knowledge, px: number, still: boolean) {
  const at = (a: number, b: number) => tiltP(a, b).map(Math.round) as Pt;
  const sign = (s: string, cx: number, cy: number, col: string, size: number) => { if (size * px >= 6) text(x, s, cx, cy, col, size, '600'); };
  const blink = (n: number, ph = 0) => still || Math.floor((t + ph) / n) % 2 === 0;
  // the Galleria's dome (the set, small)
  if (shows('galleria', k)) { const [gx, gy] = at(560, 100); x.save(); x.translate(gx, gy); x.scale(0.28, 0.28); drawGalleriaDome(x, { label: false, lit: lookOf('galleria', k) === 'lit' ? 1.4 : 0.5 }); x.restore(); }
  // the Church of the Algorithm: a white cube, one eye
  if (shows('galleria', k)) { const [cx, cy] = at(612, 96); x.fillStyle = '#d8dee6'; x.fillRect(cx - 8, cy - 16, 16, 16); x.fillStyle = '#0a0a10'; x.beginPath(); x.ellipse(cx, cy - 9, 5, 3, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(170,225,235,' + (still ? 0.8 : 0.6 + 0.4 * Math.sin(t * 0.04)).toFixed(2) + ')'; x.beginPath(); x.arc(cx, cy - 9, 1.6, 0, 7); x.fill(); }
  // the harbor's cranes
  if (shows('harbor', k)) {
    for (const [cx0, cy0, up] of [[650, 300, true], [690, 318, false], [716, 298, true]] as [number, number, boolean][]) {
      const [cx, cy] = at(cx0, cy0); x.strokeStyle = '#d07020'; x.lineWidth = 1.5; x.beginPath();
      x.moveTo(cx - 5, cy); x.lineTo(cx - 5, cy - 26); x.moveTo(cx + 5, cy); x.lineTo(cx + 5, cy - 26); x.moveTo(cx - 7, cy - 26); x.lineTo(cx + 7, cy - 26); x.stroke();
      x.beginPath(); if (up) { x.moveTo(cx - 6, cy - 26); x.lineTo(cx - 3, cy - 46); } else { x.moveTo(cx - 6, cy - 26); x.lineTo(cx + 20, cy - 26); } x.stroke();
      x.fillStyle = blink(20) ? 'rgba(255,42,68,.95)' : 'rgba(90,16,32,.9)'; x.fillRect(cx - 1, cy - 30, 2, 2);
    }
  }
  // SALT on the west beach, its palms
  if (shows('oldq', k)) {
    const [bx, by] = at(124, 344); x.fillStyle = '#2a1222'; x.fillRect(bx - 8, by - 8, 16, 8); x.fillStyle = 'rgba(255,140,200,.85)'; x.fillRect(bx - 6, by - 11, 12, 2);
    sign('SALT', bx, by - 15, 'rgba(255,190,220,.9)', 5);
    for (const dx of [-16, 14]) { x.strokeStyle = '#1a0a14'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(bx + dx, by); x.lineTo(bx + dx + 2, by - 18); x.stroke(); x.fillStyle = '#1a0a14'; for (let i = 0; i < 5; i++) { const a = -Math.PI + (i * Math.PI) / 4; x.fillRect(bx + dx + 2 + Math.cos(a) * 6, by - 18 + Math.abs(Math.sin(a)) * 3, 2, 1); } }
  }
  // the market's arch, and Club VOID's ripple
  if (shows('market', k)) {
    const [mx, my] = at(250, 236); x.strokeStyle = 'rgba(232,84,206,.9)'; x.lineWidth = 2; x.beginPath(); x.arc(mx, my - 4, 12, Math.PI, 0); x.stroke();
    sign('MARKET', mx, my - 20, blink(15, 7) ? 'rgba(255,140,230,.95)' : 'rgba(110,30,100,.9)', 6);
    const [vx, vy] = at(204, 204); x.fillStyle = '#0c0410'; x.fillRect(vx - 8, vy - 14, 16, 14); sign('VOID', vx, vy - 7, 'rgba(176,64,255,.95)', 6);
    if (!still) { const f = (t * 0.03) % 1; x.strokeStyle = 'rgba(176,64,255,' + (0.6 * (1 - f)).toFixed(2) + ')'; x.lineWidth = 1; x.beginPath(); x.ellipse(vx, vy, 10 + f * 14, (10 + f * 14) * 0.5, 0, 0, 7); x.stroke(); }
  }
  // the Registry's sign over Downtown
  if (shows('downtown', k)) {
    const [dx, dy] = at(400, 186); x.fillStyle = '#1e1014'; x.fillRect(dx - 2, dy - 40, 4, 40); x.fillStyle = '#100808'; x.fillRect(dx - 14, dy - 54, 28, 14);
    x.fillStyle = 'rgba(255,136,0,' + (still ? 0.8 : 0.6 + 0.3 * Math.sin(t * 0.05)).toFixed(2) + ')'; x.fillRect(dx - 12, dy - 52, 24, 10);
    sign('REGISTRY', dx, dy - 47, '#100808', 5);
  }
  // the Old Quarter: St. Agnes's bell tower with its warm window, the variety theatre's marquee
  if (shows('oldq', k)) {
    const [sx, sy] = at(282, 328); x.fillStyle = '#2a1a12'; x.fillRect(sx - 4, sy - 30, 8, 30); x.fillRect(sx - 9, sy - 12, 18, 12); x.beginPath(); x.moveTo(sx - 5, sy - 30); x.lineTo(sx, sy - 42); x.lineTo(sx + 5, sy - 30); x.fill();
    x.fillStyle = '#d6965f'; x.fillRect(sx - 0.5, sy - 48, 1, 6); x.fillRect(sx - 2, sy - 46, 4, 1); x.fillStyle = 'rgba(255,190,110,.85)'; x.fillRect(sx - 1.5, sy - 24, 3, 4);
    const [tx, ty] = at(364, 334); x.fillStyle = '#24140c'; x.fillRect(tx - 10, ty - 14, 20, 14); x.fillStyle = '#3a2010'; x.fillRect(tx - 12, ty - 16, 24, 4);
    for (let i = 0; i < 8; i++) { x.fillStyle = (Math.floor((still ? 0 : t) / 8) + i) % 2 ? '#ffd27a' : '#5a3a14'; x.fillRect(tx - 11 + i * 3, ty - 17, 1.5, 1.5); }
  }
  // the Fringe: chimneys smoking, a vertical farm lit green
  if (shows('fringe', k)) {
    for (const [fx0, fy0] of [[60, 128], [90, 250]]) {
      const [fx, fy] = at(fx0, fy0); x.fillStyle = '#2a2a30'; x.fillRect(fx - 10, fy - 10, 20, 10); x.fillRect(fx + 4, fy - 30, 4, 20);
      for (let i = 0; i < 3; i++) { const f = still ? i / 3 : (t * 0.01 + i / 3) % 1; x.fillStyle = 'rgba(120,120,130,' + (0.4 * (1 - f)).toFixed(2) + ')'; x.beginPath(); x.arc(fx + 6 + f * 8, fy - 32 - f * 16, 2 + f * 4, 0, 7); x.fill(); }
    }
    const [vx, vy] = at(126, 166); x.fillStyle = '#10180f'; x.fillRect(vx - 5, vy - 34, 10, 34);
    for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(90,255,120,' + (still ? 0.45 : 0.35 + 0.25 * Math.sin(t * 0.02 + i)).toFixed(2) + ')'; x.fillRect(vx - 4, vy - 32 + i * 4.5, 8, 1.5); }
  }
  // the Skyport (a landmark): the gantry, and a launch every so often, up over the wastes
  {
    const [gx, gy] = at(34, 50); x.strokeStyle = '#8a96a6'; x.lineWidth = 1;
    for (const dx of [-3, 3]) { x.beginPath(); x.moveTo(gx + dx, gy); x.lineTo(gx + dx, gy - 46); x.stroke(); }
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(gx - 3, gy - i * 5); x.lineTo(gx + 3, gy - i * 5 - 5); x.stroke(); }
    x.fillStyle = blink(25) ? 'rgba(255,42,68,.95)' : 'rgba(90,16,32,.9)'; x.fillRect(gx - 1, gy - 49, 2, 2);
    const ph = still ? 400 : t % 720, [rx, ry] = at(70, 44);
    if (ph < 260) {
      const up = ph < 40 ? 0 : (ph - 40) ** 1.7 * 0.012, py = ry - 12 - up;
      for (let i = 0; i < 14; i++) { const sy = py + 10 + i * 5; if (sy > ry) break; x.fillStyle = 'rgba(200,200,210,' + (0.35 - i * 0.02).toFixed(2) + ')'; x.beginPath(); x.arc(rx + Math.sin(i * 1.7) * i * 0.5, sy, 2 + i * 0.5, 0, 7); x.fill(); }
      if (py > -40) { x.fillStyle = '#dfe6ee'; x.fillRect(rx - 2, py - 10, 4, 12); x.beginPath(); x.moveTo(rx - 2, py - 10); x.lineTo(rx, py - 15); x.lineTo(rx + 2, py - 10); x.fill(); x.fillStyle = Math.floor(t / 2) % 2 ? '#ffd27a' : '#ff8800'; x.fillRect(rx - 1.5, py + 2, 3, 4 + (t % 3)); }
    } else {
      x.fillStyle = '#dfe6ee'; x.fillRect(rx - 2, ry - 22, 4, 12); x.beginPath(); x.moveTo(rx - 2, ry - 22); x.lineTo(rx, ry - 27); x.lineTo(rx + 2, ry - 22); x.fill();
      x.strokeStyle = '#6a7686'; x.beginPath(); x.moveTo(rx + 4, ry); x.lineTo(rx + 4, ry - 24); x.stroke();
    }
  }
}


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
  return PLACE_MAP[placeOf(st.scene).id] ?? null;
}


/** A place's state on the map, its colour and its card's second line. */
function placeLook(p: MapPlace, st: MapState): { col: string; name: string; note: string; here: boolean; go: boolean } {
  const why = placeBlocked(p, st), visited = seenPlace(p, st.seen), here = why === 'YOU ARE HERE';
  if (!visited) return { col: 'rgba(' + PAPER + ',.5)', name: placeKnown(p, st.seen) ? p.name : '???', note: 'NOT VISITED', here, go: false };
  if (here) return { col: 'rgba(255,255,255,.95)', name: p.name, note: 'YOU ARE HERE', here, go: false };
  if (why) return { col: 'rgba(' + PAPER + ',.75)', name: p.name, note: why.startsWith('THE MARKET') ? 'GATE SHUT' : why.startsWith('HARBOR') ? 'CLOSED' : 'NOT WHILE MOVING', here, go: false };
  return { col: 'rgba(' + C + ',.95)', name: p.name, note: 'QUICK TRAVEL', here, go: true };
}


// ---------- the map ----------

/** The city map over the whole view (vw × vh, the game's view units). */
 function drawCityMap(x: CanvasRenderingContext2D, vw: number, vh: number, st: MapState) {
  const u = mapUnit(vh), m = st.view;
  // on the train, a district you don't know yet is no place to open on: pick the next stop's
  if (st.ride && m.mode === 'view' && m.district !== UNDER && districtStage(DIDS[m.district], st) !== 'known') {
    const d = placeOf(STATIONS[st.ride.to].scene).district ?? 'downtown', i = DIDS.indexOf(d);
    m.district = i >= 0 && districtStage(DIDS[i], st) === 'known' ? i : DIDS.indexOf('downtown');
  }
  x.save(); x.scale(u, u);
  // device pixels per map unit, for the cached ground
  const dpr = Math.abs(x.getTransform().a) || u;
  drawMap(x, vw / u, vh / u, { ...st, tapMin: st.tapMin / u, avoid: scaleBox(st.avoid, u) }, dpr);
  x.restore();
}


/** A label on a dark plate (map units), so it reads over anything. */
function plate(x: Ctx, s: string, cx: number, cy: number, col: string, size = 7, edge: string | null = null, align: CanvasTextAlign = 'center') {
  x.font = '600 ' + size + 'px "IBM Plex Mono", monospace';
  const w = x.measureText(s).width + 6, h = size + 4, left = align === 'left' ? cx - 3 : align === 'right' ? cx - w + 3 : cx - w / 2;
  x.fillStyle = 'rgba(6,4,3,.82)'; x.fillRect(Math.round(left), Math.round(cy - h / 2), Math.round(w), h);
  if (edge) { x.strokeStyle = edge; x.lineWidth = 1; x.strokeRect(Math.round(left) + 0.5, Math.round(cy - h / 2) + 0.5, Math.round(w) - 1, h - 1); }
  text(x, s, cx, cy + 0.5, col, size, '600', align);
}


function drawMap(x: Ctx, vw: number, vh: number, st: MapState, dpr: number) {
  const m = st.view, taxi = m.mode === 'taxi', L = lay(st, vw, vh), c = camera(st, L), f = zoomF(st), V = viewer(c, m.flat);
  const still = st.reduced, t = still ? 0 : st.t, blink = still || Math.floor(st.t / 20) % 2 === 0, did = DIDS[m.district], layer = m.layer;
  const lineOn = lineKnown(st);
  x.save();
  x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(0, 0, vw, vh);
  x.fillStyle = '#040201'; x.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
  x.strokeStyle = 'rgba(' + O + ',.9)'; x.lineWidth = 1; x.strokeRect(L.panel.x + 0.5, L.panel.y + 0.5, L.panel.w - 1, L.panel.h - 1);

  // ---- the plan, clipped to the map area
  x.save();
  x.beginPath(); x.rect(L.area.x, L.area.y, L.area.w, L.area.h); x.clip();
  // the ground: the city's view (sharp in the city view), and the district's on top while zoomed in (sharp there)
  const c0 = cityCam(L, m.flat);
  blit(x, groundFor(st, L, c0, 'city', dpr), c);
  if (f > 0) blit(x, groundFor(st, L, districtCam(L, did, m.flat), did, dpr), c);
  // now in sheet units
  x.save(); x.translate(c.ox, c.oy); x.scale(c.s, c.s);
  // the sea's swell (flat), the boats
  if (m.flat && !still) { x.strokeStyle = 'rgba(120,190,210,.12)'; x.lineWidth = 1 / c.s; for (let i = 0; i < 16; i++) { const yy = (i * 25 + t * 0.2) % MAP_H, cx = coastX(yy) + 6; x.beginPath(); x.moveTo(cx, yy); x.lineTo(MAP_W, yy + 6); x.stroke(); const wx = westX(yy) - 6; if (wx > 0) { x.beginPath(); x.moveTo(0, yy); x.lineTo(wx, yy + 4); x.stroke(); } } }
  x.save(); if (!m.flat) x.transform(TILT.a, 0, TILT.c, TILT.d, TILT.e, TILT.f);
  x.beginPath(); x.rect(0, 0, MAP_W, MAP_H); x.clip();
  drawBoats(x, t, st, layer === 'street' ? 1 : 0.4);
  x.restore();
  // the landmarks and the Spire, standing up on the tilted plan
  if (!m.flat) {
    if (layer === 'street') drawLandmarks(x, t, st, c.s, still);
    const [ix, iy] = tiltP(ISLE.x, ISLE.y), k = layer === 'street' ? 0.5 : 0.37;
    x.save(); x.translate(ix, iy + 4); x.scale(k, k); drawSpire(x, { t, still, glow: true, edge: 0.3, windows: 1 }); x.restore();
  } else {
    const g = x.createRadialGradient(ISLE.x, ISLE.y, 2, ISLE.x, ISLE.y, 40);
    g.addColorStop(0, 'rgba(255,42,68,.4)'); g.addColorStop(1, 'rgba(255,42,68,0)'); x.fillStyle = g; x.fillRect(ISLE.x - 40, ISLE.y - 40, 80, 80);
    x.fillStyle = '#040203'; x.fillRect(ISLE.x - 6, ISLE.y - 4, 12, 8);
    x.fillStyle = still || Math.sin(t * 0.05) > 0 ? 'rgba(255,42,68,.95)' : 'rgba(90,16,32,.9)'; x.fillRect(ISLE.x - 2, ISLE.y - 2, 4, 4);
  }
  x.restore();

  // the district names (city view): on plates on the street layer, faint words under the other layers' lines
  if (f < 1) {
    x.save(); x.globalAlpha = 1 - f;
    if (!taxi) for (const d of DIDS) {
      if (d === 'undercity') continue;
      const stage = districtStage(d, st), lk = lookOf(d, st), [a, b] = V(...DISTRICT_MAP[d].label);
      const col = stage === 'known' ? rgba(mix(DISTRICT_MAP[d].col, 0.5, 128), 0.95) : stage === 'heard' ? rgba(PAPER, 0.7) : rgba(PAPER, 0.4);
      if (layer !== 'street') { text(x, districtName(d, st), a, b, rgba(PAPER, layer === 'below' ? 0.22 : 0.35), 7, '600'); continue; }
      plate(x, districtName(d, st), a, b, col, 7, lk === 'veiled' ? 'rgba(' + O + ',.15)' : rgba(DISTRICT_MAP[d].col, stage === 'known' ? 0.55 : 0.25));
    }
    x.restore();
  }
  // ---- the layer's own drawing, in map units
  const lw = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n * c.s));
  const path = (pts: Pt[], col: string, w: number, dash: number[] = [], close = false) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.setLineDash(dash); x.beginPath();
    pts.forEach(([a, b], i) => { const [p, q] = V(a, b); if (i) x.lineTo(p, q); else x.moveTo(p, q); });
    if (close) x.closePath();
    x.stroke(); x.setLineDash([]); x.lineCap = 'butt';
  };
  const roundel = (pt: Pt, ring: string, r: number, inter: boolean) => {
    const [a, b] = V(...pt); x.fillStyle = '#0a0705'; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill();
    x.strokeStyle = ring; x.lineWidth = Math.max(1.5, r * 0.35); x.stroke();
    if (inter) { x.strokeStyle = '#0a0705'; x.lineWidth = 1; x.beginPath(); x.arc(a, b, r * 0.55, 0, 7); x.stroke(); }
  };
  const chips = (a: number, b: number, list: [string, string][]) => {
    let ox = a;
    for (const [s, col] of list) { x.font = '600 6px "IBM Plex Mono", monospace'; const w = x.measureText(s).width + 5; x.fillStyle = rgba(col, 0.9); x.fillRect(Math.round(ox), Math.round(b), Math.round(w), 8); text(x, s, ox + 2.5, b + 4.5, '#0a0705', 6, '600', 'left'); ox += w + 2; }
  };
  const legend: [string, string, number, number[]][] = [];
  if (layer === 'metro') {
    const r = lw(8, 4.5, 9);
    // the lines the story has made known (not run yet: names on a line, no places)
    for (const ln of LINES_PLANNED) {
      if (!st.flag(lineKnownFlag(ln.id))) continue;
      path(ln.path, rgba(ln.col, 0.9), lw(ln.width * 2.5, ln.width, ln.width * 3), ln.dash ? ln.dash.map((d) => d * 0.8) : []);
      legend.push([ln.short === 'L1' ? 'LINE 1' : ln.name, ln.col, ln.width * 1.6, ln.dash ?? []]);
      if (!still && !ln.dash) { const [a, b] = along(ln.path, pingPong(t * 0.0013)), [p, q] = V(a, b); x.fillStyle = 'rgba(160,250,250,.95)'; x.fillRect(p - 2.5, q - 2.5, 5, 5); }
      for (const s of ln.stops) {
        const inter = (Object.keys(STATIONS) as Station[]).some((k) => Math.hypot(STATION_MAP[k][0] - s.pt[0], STATION_MAP[k][1] - s.pt[1]) < 4);
        if (inter) continue;
        roundel(s.pt, rgba(ln.col, 1), r * 0.85, false);
        const [a, b] = V(...s.pt); plate(x, shows(s.district, st) ? s.name : '???', a + r + 4, b, rgba(PAPER, 0.85), 7, null, 'left');
      }
    }
    // LINE 0: the loop once you know it, else only the stations you have seen from the street
    if (lineOn) {
      path([...LOOP_MAP, LOOP_MAP[0]], 'rgba(' + O + ',.95)', lw(6, 3, 7));
      legend.unshift(['LINE 0', O, 4, []]);
      // the trains (one is yours while you ride)
      if (!st.ride) for (let i = 0; i < 2; i++) { const [p, q] = V(...loopPoint(LOOP_LEN * ((t * 0.0016 + i / 2) % 1))); x.fillStyle = '#ffe36a'; x.fillRect(p - 3, q - 3, 6, 6); }
    }
    for (const s of Object.keys(STATIONS) as Station[]) {
      if (!lineOn && !stationKnown(s, st.seen)) continue;
      const d = placeOf(STATIONS[s].scene).district!, joins: [string, string][] = [['L0', O]];
      const stand = STAND_IDS.find((k) => placeOf(STANDS[k].scene).district === d && st.seen(STANDS[k].scene));
      if (stand) joins.push(['TAXI', '255,190,110']);
      for (const ln of LINES_PLANNED) if (st.flag(lineKnownFlag(ln.id)) && ln.path.some((p) => Math.hypot(p[0] - STATION_MAP[s][0], p[1] - STATION_MAP[s][1]) < 4)) joins.push([ln.short, ln.col]);
      const inter = joins.length > 1, next = !!st.ride && st.ride.to === s && st.ride.f > 0;
      roundel(STATION_MAP[s], next ? 'rgba(' + O + ',' + (blink ? 1 : 0.5) + ')' : inter ? '#ffffff' : 'rgba(' + O + ',1)', inter ? r * 1.15 : r, inter);
      const [a, b] = V(...STATION_MAP[s]), lx = a + r + 5;
      plate(x, (next ? 'NEXT: ' : '') + STATIONS[s].name, lx, b - 2, rgba(PAPER, st.seen(STATIONS[s].scene) ? 0.95 : 0.6), 7, null, 'left');
      if (inter) chips(lx - 3, b + 5, joins);
      if (!transportPermission(s,st.harborOpen).ok) plate(x, 'CLOSED UNTIL THE SIDING', lx, b + (inter ? 18 : 9), 'rgba(' + RED + ',.9)', 7, null, 'left');
      if (inter) legend.push(['CHANGE HERE', '255,255,255', -1, []]);
    }
  } else if (layer === 'above') {
    // air traffic by kind, between pads (scenery: the pads themselves you see only where you have stood)
    const SPOT: Record<string, [Pt, DistrictId]> = {
      dt: [PAD_MAP.downtown, 'downtown'], ga: [PAD_MAP.galleria, 'galleria'], ha: [PAD_MAP.harbor, 'harbor'], mk: [[236, 214], 'market'],
      reg: [[348, 120], 'downtown'], hub: [[556, 244], 'harbor'], sp: [[50, 40], 'skyport'], fr: [[70, 150], 'fringe'], med: [[470, 262], 'downtown'],
      s1: [[756, 106], 'spire'], s2: [[790, 128], 'spire'],
    };
    const KIND: Record<string, { col: string; n: string }> = {
      taxi: { col: '255,210,90', n: 'SKY TAXI' }, patrol: { col: RED, n: 'REGISTRY PATROL' }, drone: { col: '160,200,255', n: 'DELIVERY DRONES' },
      corp: { col: '235,235,255', n: 'CORPORATE SHUTTLE' }, cargo: { col: O, n: 'CARGO' }, medic: { col: '120,255,140', n: 'MEDEVAC' },
    };
    const ROUTES: [string, string[]][] = [
      ['taxi', ['dt', 'ga']], ['taxi', ['ga', 'ha']], ['taxi', ['dt', 'mk']], ['taxi', ['ha', 'dt']],
      ['patrol', ['reg', 'dt', 'mk', 'reg']], ['patrol', ['reg', 'ga', 'ha', 'reg']],
      ['drone', ['hub', 'dt']], ['drone', ['hub', 'mk']], ['drone', ['hub', 'ha']], ['drone', ['hub', 'ga']],
      ['corp', ['ga', 's1']], ['corp', ['reg', 's2']], ['corp', ['sp', 's2']], ['cargo', ['ha', 'fr']], ['medic', ['med', 'dt']],
    ];
    const used = new Set<string>();
    ROUTES.forEach(([kind, stops], ri) => {
      if (stops.some((s) => !shows(SPOT[s][1], st))) return;
      const K = KIND[kind], bend = (kind === 'cargo' ? 10 : kind === 'corp' ? 40 : 24) + (ri % 3) * 6;
      used.add(kind);
      for (let s = 0; s < stops.length - 1; s++) {
        const [a0, b0] = tiltOrFlat(m.flat, SPOT[stops[s]][0]), [a1, b1] = tiltOrFlat(m.flat, SPOT[stops[s + 1]][0]), mx = (a0 + a1) / 2, my = (b0 + b1) / 2 - bend;
        const at = (g: number): Pt => { const sx = (1 - g) * (1 - g) * a0 + 2 * (1 - g) * g * mx + g * g * a1, sy = (1 - g) * (1 - g) * b0 + 2 * (1 - g) * g * my + g * g * b1; return [c.ox + sx * c.s, c.oy + sy * c.s]; };
        x.strokeStyle = rgba(K.col, kind === 'drone' ? 0.25 : 0.4); x.lineWidth = kind === 'cargo' ? 1.6 : 1; x.setLineDash(kind === 'patrol' ? [5, 3] : kind === 'drone' ? [1, 3] : [3, 3]);
        x.beginPath(); for (let g = 0; g <= 1.001; g += 0.05) { const [p, q] = at(g); if (g) x.lineTo(p, q); else x.moveTo(p, q); } x.stroke(); x.setLineDash([]);
        const n = kind === 'drone' ? 4 : 1, speed = kind === 'cargo' ? 0.0007 : kind === 'drone' ? 0.004 : kind === 'patrol' ? 0.0022 : 0.003;
        for (let i = 0; i < n; i++) {
          const [p, q] = at(pingPong(t * speed + i / n + ri * 0.13)), sz = kind === 'cargo' ? 3.5 : kind === 'drone' ? 1.5 : 2.5;
          x.fillStyle = rgba(K.col, 1); x.fillRect(p - sz / 2, q - sz / 2, sz, sz);
          if (kind === 'patrol' && !still && Math.floor(t / 6) % 2) { x.fillStyle = 'rgba(80,120,255,1)'; x.fillRect(p + sz / 2, q - sz / 2, 1.5, 1.5); }
        }
      }
    });
    for (const k of ['taxi', 'patrol', 'drone', 'corp', 'cargo', 'medic']) if (used.has(k)) legend.push([KIND[k].n, KIND[k].col, 3, []]);
    // the Spire's restricted airspace (a landmark: always)
    const [ia, ib] = V(ISLE.x, ISLE.y);
    x.strokeStyle = 'rgba(235,235,255,.55)'; x.lineWidth = 1; x.setLineDash([3, 3]);
    for (const rr of [34, 46]) { x.beginPath(); x.ellipse(ia, ib, rr * c.s * (m.flat ? 1 : 0.9), rr * c.s * (m.flat ? 1 : 0.6), 0, 0, 7); x.stroke(); }
    x.setLineDash([]);
    plate(x, 'RESTRICTED AIRSPACE', ia, ib + 46 * c.s * (m.flat ? 1 : 0.6) + 9, 'rgba(235,235,255,.8)', 7);
    // the stands: the ones you have stood at (in taxi mode, all of them: cyan, to pick)
    const pick = taxi ? STAND_IDS[m.index] : null, from = standOf(st.scene);
    if (taxi && pick && from && pick !== from) {
      const [a0, b0] = V(...PAD_MAP[from]), [a1, b1] = V(...PAD_MAP[pick]), mx = (a0 + a1) / 2, my = Math.min(b0, b1) - 26;
      x.strokeStyle = 'rgba(' + C + ',' + (blink ? 0.9 : 0.6) + ')'; x.lineWidth = 1.5; x.setLineDash([3, 2]); x.beginPath(); x.moveTo(a0, b0); x.quadraticCurveTo(mx, my, a1, b1); x.stroke(); x.setLineDash([]);
    }
    STAND_IDS.forEach((s, i) => {
      if (!taxi && !st.seen(STANDS[s].scene)) return;
      const [a, b] = V(...PAD_MAP[s]), sel = taxi && m.index === i, hov = taxi && m.hover === i, shut = !transportPermission(s,st.harborOpen).ok;
      const col = taxi ? (shut ? RED : C) : '255,190,110', r = Math.max(5, Math.min(9, c.s * 7));
      x.fillStyle = '#060404'; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill();
      x.strokeStyle = rgba(col, sel ? (blink ? 1 : 0.55) : 0.85); x.lineWidth = 1.5; x.stroke();
      text(x, 'H', a, b + 0.5, rgba(col, 0.95), 7, '600');
      if (sel || hov) { x.strokeStyle = rgba(C, 0.9); x.lineWidth = 1; x.beginPath(); x.arc(a, b, r + 4, 0, 7); x.stroke(); }
      plate(x, (st.seen(STANDS[s].scene) ? STANDS[s].name : '???') + (taxi && shut ? ' · CLOSED' : ''), a, b + r + 8, sel ? rgba(C, 0.95) : taxi && shut ? rgba(RED, 0.9) : rgba(PAPER, 0.85), 7);
    });
  } else if (layer === 'below') {
    // LINE 0's tunnel, the canals (the one you can see from the street, and the culverts under it), the Undercity
    const uc = DISTRICT_MAP.undercity.col, under = shows('undercity', st);
    path(CANAL, rgba(uc, 0.7), lw(5, 2.5, 6));
    if (under) {
      for (const pts of [[[260, 300], [300, 200], [280, 100]], [[480, 300], [520, 360]], [[120, 296], [100, 220]], [[600, 320], [640, 240], [620, 200]]] as Pt[][]) path(pts, rgba(uc, 0.45), lw(3, 1.5, 4), [4, 3]);
      // the arches along the canal, where the deleted live
      for (let i = 0; i < 22; i++) { const [a, b] = along(CANAL, 0.04 + i * 0.042), [p, q] = V(a, b + 9); x.strokeStyle = rgba(uc, 0.35); x.lineWidth = 1; x.beginPath(); x.arc(p, q, Math.max(2, 3 * c.s), Math.PI, 0); x.stroke(); }
    }
    legend.push(['CANALS', uc, 3, []]);
    if (lineOn) {
      path([...LOOP_MAP, LOOP_MAP[0]], 'rgba(' + O + ',.6)', lw(6, 3, 7));
      legend.unshift(["LINE 0'S TUNNEL", O, 3, []]);
      for (const s of Object.keys(STATIONS) as Station[]) roundel(STATION_MAP[s], 'rgba(' + O + ',.8)', lw(5, 3, 6), false);
    }
    if (under) legend.push(['UNDERCITY', uc, 2, [4, 3]]);
    const [la, lb] = V(...DISTRICT_MAP.undercity.label);
    plate(x, districtName('undercity', st), la, lb, under ? rgba(uc, 0.95) : rgba(PAPER, 0.45), 9, rgba(uc, under ? 0.6 : 0.25));
  }

  // the ways between districts you have seen (street layer): the market gate green or red, the shore path
  if (layer === 'street') for (const l of LINKS) {
    if (!linkKnown(l, st.seen)) continue;
    if (l.state === 'gate') {
      const [a, b] = V((l.path[0][0] + l.path[1][0]) / 2, (l.path[0][1] + l.path[1][1]) / 2), s = Math.max(3, c.s * 4);
      x.fillStyle = '#060404'; x.fillRect(Math.round(a - s / 2) - 1, Math.round(b - s * 1.4) - 1, Math.round(s) + 2, Math.round(s * 2.8) + 2);
      x.fillStyle = world.accessPolicy(l.access,st).ok ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.9)'; x.fillRect(Math.round(a - s / 2), Math.round(b - s * 1.4), Math.round(s), Math.round(s * 2.8));
    } else path(l.path, 'rgba(' + PAPER + ',.55)', 1.2, [3, 2]);
  }

  if (c.s > 1.1 && layer === 'street') {
    x.save(); x.globalAlpha = Math.min(1, (c.s - 1.1) * 3);
    for (const A of plan().avenues) {
      if (A.d !== did || lookOf(A.d, st) !== 'lit' || A.pts.length < 6) continue;
      const name = A.name;
      const mid = A.pts[Math.floor(A.pts.length / 2)], [a, b] = V(...mid);
      if (!inBox(L.focus, a, b)) continue;
      text(x, name, a, b - 6, 'rgba(' + PAPER + ',.6)', 7, '600');
    }
    x.restore();
  }

  // the places you know of (street layer, city view): small pins, bright where you have been
  if (f < 1 && !taxi && layer === 'street') {
    x.save(); x.globalAlpha = 1 - f;
    for (const q of allKnown(st)) {
      const [a, b] = V(...q.pt), vis = seenPlace(q, st.seen);
      x.fillStyle = '#050302'; x.fillRect(Math.round(a) - 2, Math.round(b) - 2, 5, 5);
      x.fillStyle = vis ? 'rgba(' + PAPER + ',.9)' : 'rgba(' + PAPER + ',.4)'; x.fillRect(Math.round(a) - 1, Math.round(b) - 1, 3, 3);
    }
    const tp = m.tip >= 0 ? mapPlaceById(m.tip) : null;
    if (tp && placeKnown(tp, st.seen)) { const [a, b] = V(...tp.pt); plate(x, tp.name, a, b - 10, 'rgba(' + PAPER + ',.95)', 7, 'rgba(' + O + ',.6)'); }
    x.restore();
  }

  // the district view: the rest of the city dims, the places hang on pins (any layer)
  const ps = placesOf(st), boxes = cards(L, ps.length);
  if (f > 0) {
    const r = districtBox(did, m.flat), a = c.ox + r.x * c.s, b = c.oy + r.y * c.s, w = r.w * c.s, h = r.h * c.s;
    x.fillStyle = 'rgba(2,1,0,' + 0.6 * f + ')';
    x.fillRect(L.area.x, L.area.y, L.area.w, b - L.area.y); x.fillRect(L.area.x, b + h, L.area.w, L.area.y + L.area.h - b - h);
    x.fillRect(L.area.x, b, a - L.area.x, h); x.fillRect(a + w, b, L.area.x + L.area.w - a - w, h);
    x.strokeStyle = 'rgba(' + O + ',' + 0.5 * f + ')'; x.lineWidth = 1; x.setLineDash([4, 3]); x.strokeRect(Math.round(a) + 0.5, Math.round(b) + 0.5, Math.round(w), Math.round(h)); x.setLineDash([]);
    // the ways out of this district, named where they leave it
    if (f > 0.7) for (const l of LINKS) {
      if ((l.from !== did && l.to !== did) || l.from === l.to || !linkKnown(l, st.seen)) continue;
      const [lx, ly] = l.path[Math.floor(l.path.length / 2)], [va, vb] = V(lx, ly);
      if (!inBox(L.focus, va, vb)) continue;
      plate(x, l.name + (l.state === 'gate' ? (world.accessPolicy(l.access,st).ok ? ' · OPEN' : ' · SHUT') : ''), va, vb + 12, 'rgba(' + PAPER + ',.85)', 7);
    }
  }
  x.restore();

  if (f > 0.4 && m.mode === 'view') {
    const a0 = Math.min(1, (f - 0.4) / 0.4);
    x.save(); x.globalAlpha = a0;
    ps.forEach((q, i) => {
      const look = placeLook(q, st), [px, py] = V(...q.pt), b = boxes[i], sel = m.index === i, hov = m.hover === i;
      const cx = Math.round(px), cy = Math.round(py);
      // a leader from the pin down to its card
      x.strokeStyle = sel ? look.col : 'rgba(' + PAPER + ',.22)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx + 0.5, cy + 4); x.lineTo(cx + 0.5, Math.min(cy + 10, b.y - 4)); x.lineTo(b.x + b.w / 2 + 0.5, b.y - 1); x.stroke();
      // the pin
      x.fillStyle = '#050302'; x.fillRect(cx - 4, cy - 4, 9, 9);
      x.strokeStyle = look.col; x.strokeRect(cx - 3.5, cy - 3.5, 8, 8);
      x.fillStyle = look.col; x.fillRect(cx - 1, cy - 1, 3, 3);
      if (sel) { x.strokeStyle = look.go ? 'rgba(' + C + ',' + (blink ? 1 : 0.5) + ')' : 'rgba(' + PAPER + ',' + (blink ? 0.9 : 0.4) + ')'; x.strokeRect(cx - 7.5, cy - 7.5, 16, 16); }
      if (sel || hov) plate(x, look.name, cx, cy - 16, look.col, 7);
      else if (look.here) text(x, 'YOU', cx, cy - 12, blink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.6)', 7, '600');
      // its card
      x.fillStyle = sel ? '#0b0705' : '#070403'; x.fillRect(b.x, b.y, b.w, b.h);
      x.strokeStyle = sel ? look.col : hov ? 'rgba(' + PAPER + ',.6)' : 'rgba(' + O + ',.45)'; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (sel && look.go && blink) { x.strokeStyle = 'rgba(' + C + ',.5)'; x.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3); }
      text(x, look.name, b.x + b.w / 2, b.y + b.h / 2 - 5, look.col, 7, '600');
      text(x, look.note, b.x + b.w / 2, b.y + b.h / 2 + 6, look.go ? 'rgba(' + C + ',.7)' : ['GATE SHUT', 'NOT WHILE MOVING', 'CLOSED'].includes(look.note) ? 'rgba(' + RED + ',.85)' : 'rgba(' + PAPER + ',.5)', 7);
    });
    // back to the city
    const bk = L.back;
    x.fillStyle = '#070403'; x.fillRect(bk.x, bk.y, bk.w, bk.h);
    x.strokeStyle = 'rgba(' + O + ',.85)'; x.strokeRect(bk.x + 0.5, bk.y + 0.5, bk.w - 1, bk.h - 1);
    text(x, '< CITY', bk.x + bk.w / 2, bk.y + bk.h / 2, 'rgba(' + PAPER + ',.9)', 7, '600');
    x.restore();
  }

  // the district picked (city view): its frame's corners, cyan if it opens, red if not
  if (f < 1 && !taxi) {
    x.save(); x.globalAlpha = 1 - f;
    const mark = (i: number, col: string, corners: boolean) => {
      const r = districtBox(DIDS[i], m.flat), A = Math.round(c.ox + r.x * c.s) - 2.5, B = Math.round(c.oy + r.y * c.s) - 2.5, w = Math.round(r.w * c.s) + 4, h = Math.round(r.h * c.s) + 4;
      x.strokeStyle = col;
      if (!corners) { x.lineWidth = 1; x.setLineDash([3, 3]); x.strokeRect(A, B, w, h); x.setLineDash([]); return; }
      const k = 7; x.beginPath();
      for (const [px, py, sx, sy] of [[A, B, 1, 1], [A + w, B, -1, 1], [A, B + h, 1, -1], [A + w, B + h, -1, -1]]) { x.moveTo(px + sx * k, py); x.lineTo(px, py); x.lineTo(px, py + sy * k); }
      x.lineWidth = 2; x.stroke(); x.lineWidth = 1;
    };
    x.beginPath(); x.rect(L.area.x, L.area.y, L.area.w, L.area.h); x.clip();
    if (m.hover >= 0 && m.hover !== m.district) mark(m.hover, 'rgba(' + PAPER + ',.4)', false);
    const open = placesOf(st).length > 0;
    mark(m.district, open ? 'rgba(' + C + ',' + (blink ? 1 : 0.6) + ')' : 'rgba(' + RED + ',' + (blink ? 0.8 : 0.4) + ')', true);
    x.restore();
  }

  // the train while you ride, and you
  if (st.ride) { const [a, b] = V(...trainPoint(st.ride)); x.fillStyle = 'rgba(' + PAPER + ',.95)'; x.fillRect(Math.round(a) - 5, Math.round(b) - 3, 10, 6); }
  const you = youPoint(st);
  if (you && (f < 0.5 || st.ride || taxi)) {
    const [a, b] = V(...you), hx = Math.round(a), hy = Math.round(b);
    if (!still) { const rr = 6 + ((st.t * 0.08) % 6); x.strokeStyle = 'rgba(255,255,255,' + (0.8 - (rr - 6) / 8).toFixed(2) + ')'; x.lineWidth = 1; x.beginPath(); x.arc(hx, hy, rr, 0, 7); x.stroke(); }
    x.fillStyle = blink ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.4)'; x.fillRect(hx - 2, hy - 2, 5, 5);
    // (left of you where the layer labels its stops on the right)
    // on STREET to the right; on the other layers, whose stops carry labels and chips on the right, under the dot (left of it while riding, under NEXT:)
    if (layer === 'street') plate(x, 'YOU', hx + 9, hy - 6, 'rgba(255,255,255,.95)', 7, null, 'left');
    else if (st.ride) plate(x, 'YOU', hx - 9, hy - 6, 'rgba(255,255,255,.95)', 7, null, 'right');
    else plate(x, 'YOU', hx, hy + 12, 'rgba(255,255,255,.95)', 7, null, 'center');
  }

  // the legend of the layer (city view), bottom right
  if (f < 0.5 && legend.length && layer !== 'street') {
    const seen = new Set<string>(), rows = legend.filter(([n]) => (seen.has(n) ? false : (seen.add(n), true)));
    x.font = '600 7px "IBM Plex Mono", monospace';
    const w = Math.max(...rows.map(([n]) => x.measureText(n).width)) + 30, h = rows.length * 10 + 6;
    // tilted: in the sky under the tabs; flat: the sea's corner, top right
    const lx = m.flat ? L.area.x + L.area.w - w - 4 : L.area.x + 4, ly = m.flat ? L.area.y + 4 : (L.tabs[0] ? L.tabs[0].y + L.tabs[0].h + 6 : L.area.y + 4);
    x.save(); x.globalAlpha = 1 - f * 2;
    x.fillStyle = 'rgba(6,4,3,.85)'; x.fillRect(lx, ly, w, h); x.strokeStyle = 'rgba(' + O + ',.4)'; x.strokeRect(lx + 0.5, ly + 0.5, w - 1, h - 1);
    rows.forEach(([n, col, wd, dash], i) => {
      const ry = ly + 8 + i * 10;
      if (wd < 0) { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.arc(lx + 12, ry, 3, 0, 7); x.stroke(); }
      else { x.strokeStyle = rgba(col, 0.95); x.lineWidth = Math.max(1, wd); x.setLineDash(dash); x.beginPath(); x.moveTo(lx + 5, ry); x.lineTo(lx + 19, ry); x.stroke(); x.setLineDash([]); }
      text(x, n, lx + 24, ry + 0.5, 'rgba(' + PAPER + ',.75)', 7, '', 'left');
    });
    x.restore();
  }

  // ---- the tabs: the layers, and TILT / FLAT
  L.tabs.forEach((b, i) => {
    const isLayer = i < LAYERS.length, on = isLayer ? LAYERS[i] === layer : m.flat, label = isLayer ? LAYER_NAME[LAYERS[i]] : m.flat ? 'FLAT' : 'TILT';
    x.fillStyle = on ? 'rgba(40,20,6,.95)' : 'rgba(6,4,3,.88)'; x.fillRect(b.x, b.y, b.w, b.h);
    x.strokeStyle = on ? 'rgba(' + O + ',.95)' : 'rgba(' + O + ',.4)'; x.lineWidth = 1; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    if (on && isLayer) { x.fillStyle = 'rgba(' + O + ',.95)'; x.fillRect(b.x + 3, b.y + b.h - 3, b.w - 6, 1.5); }
    text(x, label, b.x + b.w / 2, b.y + b.h / 2, on ? 'rgba(' + PAPER + ',.95)' : 'rgba(' + PAPER + ',.6)', 7, '600');
  });

  // ---- the header
  const hy = L.panel.y + 9;
  const title = f > 0.5 && !taxi ? 'CITY MAP > ' + districtName(did, st, true) : 'CITY MAP';
  text(x, title, L.panel.x + 7, hy, 'rgba(' + O + ',.95)', 9, '600', 'left');
  const sub = taxi ? 'SKY TAXI · ' + FARE + ' TOKEN A RIDE · TOKENS ' + st.tokens
    : st.ride ? (st.ride.f > 0 ? 'LINE 0 · NEXT: ' + STATIONS[st.ride.to].name : 'LINE 0 · AT ' + STATIONS[st.ride.from].name)
    : { street: 'STREET PLAN · NOT TO SCALE', metro: 'METRO', above: 'ABOVE · AIR TRAFFIC', below: 'BELOW · TUNNELS AND CANALS' }[layer];
  text(x, sub, L.panel.x + L.panel.w - 7, hy, 'rgba(' + PAPER + ',.7)', 7, '', 'right');

  // ---- the footer: what is picked, and the keys
  const fy = L.foot + 8, fx = L.footX, fr = L.panel.x + L.panel.w - 7;
  x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(L.panel.x + 4, L.foot - 1, L.panel.w - 8, 1);
  const keys = (s: string) => text(x, s, fr, fy + 11, 'rgba(' + PAPER + ',.6)', 7, '', 'right');
  if (taxi) {
    const s = STAND_IDS[m.index], name = st.seen(STANDS[s].scene) ? STANDS[s].name : '???';
    text(x, '> ' + name + (standOf(st.scene) === s ? '  (YOU ARE HERE)' : !transportPermission(s,st.harborOpen).ok ? '  (CLOSED)' : ''), fx, fy, 'rgba(' + C + ',.95)', 9, '600', 'left');
    keys(st.touch ? 'TAP A PAD · TAP AGAIN TO FLY · TAP OUTSIDE TO CANCEL' : '<- -> CHOOSE · E FLY · ESC CANCEL');
  } else if (m.zoomed) {
    const i = m.hover >= 0 ? m.hover : m.index, q = ps[i];
    if (q) {
      const look = placeLook(q, st), why = placeBlocked(q, st);
      text(x, '> ' + look.name, fx, fy, look.col, 9, '600', 'left');
      text(x, why || (st.touch ? (i === m.index ? 'TAP AGAIN TO GO' : 'TAP TO PICK') : 'E · CLICK  GO THERE'), fr, fy, why ? (look.here ? 'rgba(255,255,255,.8)' : 'rgba(' + RED + ',.9)') : 'rgba(' + C + ',.9)', 7, '600', 'right');
    }
    keys(st.touch ? 'TAP A PLACE · < CITY OR TAP OUTSIDE: BACK' : '<- -> PICK · E GO · 1-4 LAYER · ESC BACK · TAB / M CLOSE');
  } else {
    const i = m.hover >= 0 ? m.hover : m.district, d = DIDS[i], stage = districtStage(d, st), all = knownPlaces(d, st.seen);
    const n = all.filter((q) => seenPlace(q, st.seen)).length;
    text(x, '> ' + districtName(d, st, true), fx, fy, all.length ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.7)', 9, '600', 'left');
    // the count is of the places you know of: the map never tells you how many there are
    const state = stage === 'unknown' ? 'NO RECORD' : all.length ? n + ' OF ' + all.length + ' KNOWN PLACES VISITED' : districtPlaces(d).length ? 'NOT VISITED' : 'NO ACCESS';
    text(x, state, fr, fy, state === 'NO ACCESS' ? 'rgba(' + RED + ',.9)' : 'rgba(' + PAPER + ',.75)', 7, '600', 'right');
    text(x, stage === 'known' ? DISTRICT_MAP[d].note : stage === 'heard' ? 'NOT VISITED' : '???  NO RECORD', fx, fy + 11, 'rgba(' + PAPER + ',.5)', 7, '', 'left');
    if (vw > 420) keys(st.touch ? 'TAP A DISTRICT · TAP A TAB · TAP OUTSIDE TO CLOSE' : 'ARROWS PICK · E OPEN · 1-4 LAYER · T TILT · TAB / M CLOSE');
  }
  x.restore();
}


/** Plan → sheet, for the layer drawings that bend their own curves. */
const tiltOrFlat = (flat: boolean, p: Pt): Pt => projOf(flat)(p[0], p[1]);
 return {openMap,mapKey,mapPointer,drawCityMap};
}
const shipping=createCityMap();
export const {openMap,mapKey,mapPointer,drawCityMap}=shipping;
