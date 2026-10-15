/**
 * The city (CITY.md, the source of truth): city → district → place → scene.
 *
 * - `DISTRICTS`: the seven districts, each on its stratum (the Spire over the
 *   street, the Undercity under it).
 * - `PLACES`: every place that exists now, in its district, with its entrance
 *   scene (where quick travel lands, at its exit `at`). A place has one scene or
 *   several; inside a place scenes connect by doors, with no map.
 * - `SCENE_PLACE`: every scene's place (each scene knows its place; a place's
 *   `scenes` are read from it). Planned places are not here until they exist.
 *
 * Then how you travel through it: Downtown's doors, the metro line (a loop:
 * Downtown, Galleria, Harbor), the sky-taxi stands, and the city map. The map is
 * the overlay the taxi uses to pick a destination, and a screen of its own
 * (`drawCityMap` in 'view' mode: TAB, a menu) that shows the line and, while you
 * ride, where the train is; quick travel on it goes to places.
 *
 * Canvas drawing only. Scenes you have been in are remembered in the save as
 * `flags['seen:<scene>']`; the map labels those and shows the rest as `???`.
 */

import type { SceneId } from './scenes';
import { box, C, GREEN, O, onScreen, PAPER, RED, rng, sign, tell, text, type View } from './scenes/kit';

// ---------- the city: districts and places ----------

/** The city is a cross-section: the Spire on top, the street in the middle, the Undercity below. */
export type Stratum = 'overworld' | 'street' | 'underworld';

export interface District {
  id: string;
  name: string;
  /** What the city map writes on its block (where it has one). */
  short: string;
  stratum: Stratum;
}

/** The seven districts, as CITY.md has them. */
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', short: 'DOWNTOWN', stratum: 'street' },
  { id: 'market', name: 'Neon Market / Old Quarter', short: 'NEON MARKET', stratum: 'street' },
  { id: 'galleria', name: 'Galleria', short: 'GALLERIA', stratum: 'street' },
  { id: 'harbor', name: 'Harbor & Shore', short: 'HARBOR', stratum: 'street' },
  { id: 'spire', name: 'The Spire / Plaza Central', short: 'THE SPIRE', stratum: 'overworld' },
  { id: 'undercity', name: 'Undercity', short: 'UNDERCITY', stratum: 'underworld' },
  { id: 'fringe', name: 'The Fringe', short: 'THE FRINGE', stratum: 'street' },
] as const satisfies readonly District[];
export type DistrictId = (typeof DISTRICTS)[number]['id'];

/**
 * A place: a location with one scene or several. `district` is null only for
 * LINE 0's car, which runs between the street districts. `entrance` is the scene
 * quick travel lands in, at its exit `at` (none: its spawn).
 */
export interface PlaceData { id: string; name: string; district: DistrictId | null; entrance: SceneId; at?: string }

/** Every place that exists now, in the order quick travel steps through them (west to east). */
const PLACE_DATA = [
  { id: 'market', name: 'NEON MARKET', district: 'market', entrance: 'market', at: 'downtown' },
  { id: 'shop', name: 'CORNER SHOP', district: 'downtown', entrance: 'shop' },
  { id: 'station-downtown', name: 'DOWNTOWN METRO', district: 'downtown', entrance: 'metro', at: 'downtown' },
  { id: 'downtown', name: 'DOWNTOWN', district: 'downtown', entrance: 'downtown', at: 'metro' },
  { id: 'yard', name: 'BACK YARD', district: 'downtown', entrance: 'yard' },
  { id: 'capsule', name: 'CAPSULE 7B', district: 'downtown', entrance: 'capsule', at: 'door' },
  { id: 'moth', name: "MOTH'S PLACE", district: 'downtown', entrance: 'moth', at: 'door' },
  { id: 'station-galleria', name: 'GALLERIA METRO', district: 'galleria', entrance: 'galleriaStation', at: 'mall' },
  { id: 'mall', name: 'GALLERIA MALL', district: 'galleria', entrance: 'mall' },
  { id: 'station-harbor', name: 'HARBOR METRO', district: 'harbor', entrance: 'harborStation', at: 'harbor' },
  { id: 'harbor', name: 'HARBOR', district: 'harbor', entrance: 'harbor' },
  { id: 'beach', name: 'BEACH', district: 'harbor', entrance: 'beach', at: 'harbor' },
  { id: 'line0', name: 'LINE 0', district: null, entrance: 'train' },
] as const satisfies readonly PlaceData[];
export type PlaceId = (typeof PLACE_DATA)[number]['id'];

/** Every scene's place. Every scene is in exactly one (the type-check holds every scene to it). */
export const SCENE_PLACE = {
  downtown: 'downtown',
  capsule: 'capsule',
  yard: 'yard',
  moth: 'moth',
  shop: 'shop',
  metro: 'station-downtown',
  market: 'market',
  mall: 'mall',
  galleriaStation: 'station-galleria',
  harbor: 'harbor',
  harborStation: 'station-harbor',
  beach: 'beach',
  train: 'line0',
} as const satisfies Record<SceneId, PlaceId>;

/** A place, with its scenes. */
export interface Place extends PlaceData { id: PlaceId; scenes: SceneId[] }
export const PLACES: Place[] = PLACE_DATA.map((p) => ({
  ...p, scenes: (Object.keys(SCENE_PLACE) as SceneId[]).filter((s) => SCENE_PLACE[s] === p.id),
}));
/** The place a scene belongs to. */
export const placeOf = (id: SceneId): Place => PLACES.find((p) => p.id === SCENE_PLACE[id])!;
export const districtOf = (p: Place) => DISTRICTS.find((d) => d.id === p.district) ?? null;

/** What the build checks of the city (generate-demos): every place has a scene, its entrance among them; districts exist. */
export function cityProblems(): string[] {
  const out: string[] = [], ids = new Set<string>();
  for (const p of PLACES) {
    if (ids.has(p.id)) out.push(`place "${p.id}" is listed twice`);
    ids.add(p.id);
    if (!p.scenes.length) out.push(`place "${p.id}" has no scene (SCENE_PLACE)`);
    if (!p.scenes.includes(p.entrance)) out.push(`place "${p.id}": its entrance "${p.entrance}" is not one of its scenes`);
    if (p.district !== null && !DISTRICTS.some((d) => d.id === p.district)) out.push(`place "${p.id}": no district "${p.district}"`);
  }
  return out;
}

/**
 * Where a new game starts: Capsule 7B, the player's flat. The intro cutscene
 * hands over to it (cutscenes.json `next`), and a save that has never been
 * Downtown starts there too.
 */
export const START_SCENE = 'capsule' satisfies SceneId;

export const seenFlag = (id: SceneId) => 'seen:' + id;
/** A place counts as visited once you have been in any of its scenes. */
const seenPlace = (p: Place, seen: (id: SceneId) => boolean) => p.scenes.some(seen);

/**
 * Downtown's ways out, by where they sit on the street (world x): its exits
 * (downtown/index.ts). Coming back through one of them lands you in front of it.
 * - market: the NEON MARKET gate at the west end (opens once Downtown is cleared)
 * - shop: the corner shop's door (the front at 150)
 * - yard: the fixer's back yard, past the noodle stall
 * - capsule: your building's lobby, the narrow tower at 1200: the lift up to your flat (Capsule 7B)
 * - metro: stairs down, in front of the shuttered front at 1420
 * - moth: the residents' door of that same front (1496): Moth's building, flat 4C (needs Moth's key chip)
 * - taxi: the sky-taxi pad at the east end, past the SPACEPORT sign
 */
export const DOORS = { market: 70, shop: 242, yard: 972, capsule: 1230, metro: 1440, moth: 1496, taxi: 1930 } as const;

// ---------- the metro ----------

export type Station = 'downtown' | 'galleria' | 'harbor';
/** LINE 0 is a loop, in this order: after HARBOR it runs back to DOWNTOWN. The ride itself is scenes/line.ts. */
export const LINE: Station[] = ['downtown', 'galleria', 'harbor'];
/**
 * Each station: its name, its platform (a scene, where you land stepping off at
 * its `train` exit) and the scene its stairs lead up to.
 */
export const STATIONS: Record<Station, { name: string; scene: SceneId; up: SceneId }> = {
  downtown: { name: 'DOWNTOWN', scene: 'metro', up: 'downtown' },
  galleria: { name: 'GALLERIA', scene: 'galleriaStation', up: 'mall' },
  harbor: { name: 'HARBOR', scene: 'harborStation', up: 'harbor' },
};
/** The station whose platform this scene is, if it is one. */
export const stationAt = (id: SceneId): Station | null => LINE.find((s) => STATIONS[s].scene === id) ?? null;

// ---------- sky taxis ----------

export type Stand = 'downtown' | 'galleria' | 'harbor';
export const STAND_IDS: Stand[] = ['downtown', 'galleria', 'harbor'];
/** Each stand: its name and the scene it is in; you land at that scene's `taxi` exit. */
export const STANDS: Record<Stand, { name: string; scene: SceneId }> = {
  downtown: { name: 'DOWNTOWN EAST', scene: 'downtown' },
  galleria: { name: 'GALLERIA ROOF', scene: 'mall' },
  harbor: { name: 'HARBOR PIER', scene: 'harbor' },
};
export const standOf = (id: SceneId): Stand | null => STAND_IDS.find((s) => STANDS[s].scene === id) ?? null;
export const FARE = 1;
/** Frames of a quick trip from the map: a fade out, the move, a fade in. */
export const HOP = 40;
/** Frames of flight between two stands. */
export const FLIGHT = 200;
export const DRIVER_BROKE = ['One token a ride. You have the look of someone with zero.', 'Walking is free. Very popular with people like you.'];

// ---------- the map ----------

/**
 * Map units: the city is 320 × 180. The street districts' blocks (in this order: the blocks'
 * seeded windows follow it), each lit once you have been in its `known` scene.
 */
const BLOCKS_AT: { district: DistrictId; known: SceneId; x: number; y: number; w: number; h: number }[] = [
  { district: 'market', known: 'market', x: 10, y: 60, w: 66, h: 54 },
  { district: 'downtown', known: 'downtown', x: 84, y: 50, w: 106, h: 78 },
  { district: 'galleria', known: 'mall', x: 198, y: 10, w: 78, h: 58 },
  { district: 'harbor', known: 'harbor', x: 204, y: 108, w: 100, h: 40 },
];
const blockName = (id: DistrictId) => DISTRICTS.find((d) => d.id === id)!.short;
/** Smaller places inside Downtown: [x, y, label, scene that must be seen to label it ('' = always)]. */
const SPOTS: Record<string, [number, number, string, SceneId | '']> = {
  shop: [98, 112, 'SHOP', 'shop'],
  yard: [150, 116, 'YARD', 'yard'],
  home: [166, 74, '7B', ''],
};
const STATION_AT: Record<Station, [number, number]> = { downtown: [126, 120], galleria: [216, 58], harbor: [236, 134] };
const PAD_AT: Record<Stand, [number, number]> = { downtown: [182, 60], galleria: [266, 18], harbor: [294, 124] };
const GATE_AT: [number, number] = [80, 90];

const BLOCKS = (() => {
  const r = rng(7), out: [number, number, number, number, number][] = [];
  BLOCKS_AT.forEach((d, di) => {
    for (let yy = d.y + 13; yy < d.y + d.h - 5; yy += 7) for (let xx = d.x + 4; xx < d.x + d.w - 6; xx += 8) if (r() < 0.55) out.push([di, xx, yy, 4 + Math.floor(r() * 3), 4]);
  });
  return out;
})();
const RIPPLES = (() => { const r = rng(9); return Array.from({ length: 26 }, () => [152 + r() * 166, 150 + r() * 28, 4 + r() * 8]); })();

// ---------- quick travel ----------

/** Where a place is on the map: a district's block (`rect`, the place fills it) or a point. */
type MapAt = { pt: [number, number]; rect?: [number, number, number, number] };
const block = (id: DistrictId): MapAt => { const d = BLOCKS_AT.find((b) => b.district === id)!; return { pt: [d.x + d.w / 2, d.y + d.h / 2], rect: [d.x, d.y, d.w, d.h] }; };
const MAP_AT: Partial<Record<PlaceId, MapAt>> = {
  market: block('market'),
  shop: { pt: [SPOTS.shop[0], SPOTS.shop[1]] },
  'station-downtown': { pt: STATION_AT.downtown },
  downtown: block('downtown'),
  yard: { pt: [SPOTS.yard[0], SPOTS.yard[1]] },
  capsule: { pt: [SPOTS.home[0], SPOTS.home[1]] },
  'station-galleria': { pt: STATION_AT.galleria },
  mall: block('galleria'),
  'station-harbor': { pt: STATION_AT.harbor },
  harbor: block('harbor'),
  beach: { pt: [292, 160] },
};

/**
 * A place on the map you can quick-travel to once you have been there, with where it is
 * on the map. Listed in the order the arrow keys step through them, west to east.
 */
export type MapPlace = Place & MapAt;
export const MAP_PLACES: MapPlace[] = PLACES.flatMap((p) => { const at = MAP_AT[p.id]; return at ? [{ ...p, ...at }] : []; });

/** Why you cannot quick-travel to a place right now ('' if you can). */
export function placeBlocked(p: Place, st: Pick<MapState, 'seen' | 'gateOpen' | 'scene' | 'ride'>): string {
  if (!seenPlace(p, st.seen)) return 'NOT VISITED YET';
  if (p.scenes.includes(st.scene)) return 'YOU ARE HERE';
  if (p.id === 'market' && !st.gateOpen) return 'THE MARKET GATE IS SHUT';
  if (st.ride && st.ride.f > 0) return 'NOT FROM A MOVING METRO · GET OFF FIRST';
  return '';
}

/** Where the map panel and the map inside it sit in a view vw × vh: the panel's box, the map's origin and scale. */
function mapLayout(vw: number, vh: number) {
  const w = Math.min(vw - 12, 440), h = Math.min(vh - 12, 272), ox = Math.round((vw - w) / 2), oy = Math.round((vh - h) / 2);
  const mx0 = ox + 8, my0 = oy + 24, mw = w - 16, mh = h - 24 - 32;
  const s = Math.min(mw / 320, mh / 180), mx = mx0 + (mw - 320 * s) / 2, my = my0 + (mh - 180 * s) / 2;
  return { w, h, ox, oy, s, mx, my };
}

/** The place under a point of the view (view units), as an index into MAP_PLACES: points first, then districts; -1 for none, -2 outside the panel. */
export function placeAt(vw: number, vh: number, px: number, py: number): number {
  const { w, h, ox, oy, s, mx, my } = mapLayout(vw, vh);
  if (px < ox || px > ox + w || py < oy || py > oy + h) return -2;
  const X = (px - mx) / s, Y = (py - my) / s;
  let best = -1, bd = 9 + 4 / s;
  MAP_PLACES.forEach((p, i) => { if (!p.rect) { const d = Math.hypot(p.pt[0] - X, p.pt[1] - Y); if (d < bd) { bd = d; best = i; } } });
  if (best >= 0) return best;
  return MAP_PLACES.findIndex((p) => !!p.rect && X >= p.rect[0] && X <= p.rect[0] + p.rect[2] && Y >= p.rect[1] && Y <= p.rect[1] + p.rect[3]);
}

export interface MapState {
  /** 'view': the map (TAB or M, a menu's screen), where a place you know is a click away; 'taxi': pick a stand. */
  mode: 'view' | 'taxi';
  /** Stand ids (taxi). */
  options: string[];
  /** The choice: a stand (taxi), or a place in MAP_PLACES (view; -1 = none yet). */
  index: number;
  /** In 'view': the place under the mouse (-1 none). */
  hover: number;
  /** A touch screen: say TAP rather than keys. */
  touch: boolean;
  /** The scene you are in. */
  scene: SceneId;
  /** While riding: the stop the train stands at or last left, the next one, and how far along it is (0..1). */
  ride: { from: Station; to: Station; f: number } | null;
  seen: (id: SceneId) => boolean;
  gateOpen: boolean;
  tokens: number;
  t: number;
}

/** You on the map: at the taxi pad you hail from, on the line while you ride, else where your place is. */
function herePoint(st: MapState): [number, number] {
  const z = st.scene;
  if (st.mode === 'taxi') { const s = standOf(z); if (s) return PAD_AT[s]; }
  if (z === 'train' && st.ride) {
    const [a, b] = [STATION_AT[st.ride.from], STATION_AT[st.ride.to]], f = st.ride.f;
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  const at = MAP_AT[placeOf(z).id];
  if (!at) return [137, 95];
  return at.rect ? [at.pt[0], at.pt[1] + 6] : at.pt;
}

/**
 * The city map, a retro pixel overlay over the whole view (vw × vh, in the
 * game's world units). Districts as blocks, the metro line across them, taxi
 * pads, a blinking you-are-here; places you have not been are `???`.
 */
export function drawCityMap(x: CanvasRenderingContext2D, vw: number, vh: number, st: MapState) {
  const { w, h, ox, oy, s, mx, my } = mapLayout(vw, vh);
  const blink = Math.floor(st.t / 20) % 2 === 0;
  x.save();
  x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(0, 0, vw, vh);
  box(x, ox, oy, w, h, '#040201', 'rgba(' + O + ',.9)');
  x.strokeStyle = 'rgba(' + O + ',.3)'; x.lineWidth = 1; x.strokeRect(ox + 3.5, oy + 3.5, w - 7, h - 7);
  text(x, 'CITY MAP', ox + 10, oy + 13, 'rgba(' + O + ',.95)', 9, '600', 'left');
  const sub = st.mode === 'taxi' ? 'SKY TAXI · ' + FARE + ' TOKEN A RIDE · TOKENS ' + st.tokens : st.ride ? 'LINE 0 · ON BOARD' : 'PLAZA CENTRAL';
  text(x, sub, ox + w - 10, oy + 13, 'rgba(' + PAPER + ',.75)', 7, '', 'right');

  // the map itself, scaled to fit between the title and the footer
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
  BLOCKS_AT.forEach((d, di) => {
    const known = st.seen(d.known);
    R(d.x, d.y, d.w, d.h, known ? '#170b05' : '#070403');
    for (const [bi, bx, by, bw, bh] of BLOCKS) if (bi === di) R(bx, by, bw, bh, known ? 'rgba(' + O + ',.28)' : 'rgba(' + O + ',.07)');
    frame(d.x, d.y, d.w, d.h, 'rgba(' + O + ',' + (known ? 0.75 : 0.3) + ')');
    const [lx, ly] = P(d.x + d.w / 2, d.y + 6);
    text(x, known ? blockName(d.district) : '???', lx, ly, known ? 'rgba(' + PAPER + ',.9)' : 'rgba(' + PAPER + ',.35)', 7, '600');
  });
  // the market gate between Downtown and the market
  { const [gx, gy] = P(GATE_AT[0], GATE_AT[1]); x.fillStyle = st.gateOpen ? 'rgba(' + GREEN + ',.9)' : 'rgba(' + RED + ',.85)'; x.fillRect(gx - 2, gy - 4, 4, 8); }
  // places inside Downtown
  for (const [sx0, sy0, label, need] of Object.values(SPOTS)) {
    const [px, py] = P(sx0, sy0), known = need === '' || st.seen(need);
    x.fillStyle = 'rgba(' + PAPER + ',' + (known ? 0.7 : 0.3) + ')'; x.fillRect(px - 1, py - 1, 3, 3);
    text(x, known ? label : '?', px + 4, py, 'rgba(' + PAPER + ',' + (known ? 0.6 : 0.3) + ')', 7, '', 'left');
  }
  // the metro line: a loop, Downtown to Galleria to Harbor and back to Downtown
  x.strokeStyle = 'rgba(' + PAPER + ',.65)'; x.lineWidth = Math.max(1, Math.round(2 * s));
  x.beginPath();
  LINE.forEach((id, i) => { const [px, py] = P(STATION_AT[id][0], STATION_AT[id][1]); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
  x.closePath(); x.stroke(); x.lineWidth = 1;
  { const [lx, ly] = P(160, 104); text(x, 'LINE 0', lx, ly, 'rgba(' + PAPER + ',.5)', 7, '', 'left'); }
  const pick = st.mode === 'view' ? '' : st.options[st.index];
  for (const id of LINE) {
    const [px, py] = P(STATION_AT[id][0], STATION_AT[id][1]), next = !!st.ride && st.ride.to === id && st.ride.f > 0;
    box(x, px - 3, py - 3, 7, 7, '#0a0604', next ? 'rgba(' + O + ',' + (blink ? 1 : 0.5) + ')' : 'rgba(' + PAPER + ',.85)');
    // a station is named once you have stood on its platform or walked its district
    const known = st.seen(STATIONS[id].scene) || st.seen(STATIONS[id].up);
    if (st.mode === 'view') text(x, known ? STATIONS[id].name : '???', px, py + 10, next ? 'rgba(' + O + ',.95)' : 'rgba(' + PAPER + ',.6)', 7, '600');
  }
  // taxi pads: cyan only when you can pick them
  for (const id of STAND_IDS) {
    const [px, py] = P(PAD_AT[id][0], PAD_AT[id][1]), sel = st.mode === 'taxi' && pick === id;
    const col = st.mode === 'taxi' ? C : O;
    box(x, px - 4, py - 4, 9, 9, '#030606', 'rgba(' + col + ',' + (sel ? (blink ? 1 : 0.45) : 0.6) + ')');
    x.fillStyle = 'rgba(' + col + ',.8)'; x.fillRect(px - 2, py - 2, 1, 5); x.fillRect(px + 2, py - 2, 1, 5); x.fillRect(px - 1, py, 3, 1);
    if (sel) { x.strokeStyle = 'rgba(' + C + ',.9)'; x.strokeRect(px - 7.5, py - 7.5, 15, 15); }
    if (st.mode === 'taxi') text(x, st.seen(STANDS[id].scene) ? STANDS[id].name : '???', px, py - 10, sel ? 'rgba(' + C + ',.95)' : 'rgba(' + PAPER + ',.6)', 7, '600');
  }
  // quick travel: the place you point at or picked, in cyan (you can use it), its name and a dot on it
  if (st.mode === 'view') {
    for (const i of [st.hover, st.index]) {
      if (i < 0) continue;
      const p = MAP_PLACES[i], sel = i === st.index, a = sel ? (blink ? 1 : 0.6) : 0.7;
      x.strokeStyle = 'rgba(' + C + ',' + a + ')';
      if (p.rect) { const [a0, b0] = P(p.rect[0], p.rect[1]); x.strokeRect(a0 - 1.5, b0 - 1.5, Math.round(p.rect[2] * s) + 2, Math.round(p.rect[3] * s) + 2); }
      else { const [px, py] = P(p.pt[0], p.pt[1]); x.strokeRect(px - 6.5, py - 6.5, 13, 13); }
    }
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
    const i = st.hover >= 0 ? st.hover : st.index;
    if (i >= 0) {
      // the place you point at: where it is, and whether you can go
      const p = MAP_PLACES[i], why = placeBlocked(p, st), known = seenPlace(p, st.seen);
      text(x, '> ' + (known ? p.name : '???'), ox + 10, fy + 3, why ? 'rgba(' + PAPER + ',.8)' : 'rgba(' + C + ',.95)', 9, '600', 'left');
      text(x, why || (st.touch ? (i === st.index ? 'TAP AGAIN TO GO' : 'TAP TO PICK') : 'E · CLICK  GO THERE'), ox + w - 10, fy + 3, why ? 'rgba(' + RED + ',.9)' : 'rgba(' + C + ',.9)', 7, '600', 'right');
    } else {
      text(x, st.ride
        ? (st.ride.f > 0 ? 'ON LINE 0 · NEXT: ' + STATIONS[st.ride.to].name : 'ON LINE 0 · AT ' + STATIONS[st.ride.from].name)
        : '— LINE 0 (A LOOP)   [H] SKY TAXI   ■ YOU   ??? NOT VISITED', ox + 10, fy + 2, 'rgba(' + PAPER + ',.65)', 7, '', 'left');
    }
    text(x, st.touch ? 'TAP A PLACE YOU KNOW TO GO THERE · TAP OUTSIDE TO CLOSE' : '<- -> PICK A PLACE · E GO · TAB / M / ESC CLOSE', ox + w - 10, fy + 13, 'rgba(' + PAPER + ',.6)', 7, '', 'right');
  } else {
    const name = st.seen(STANDS[pick as Stand].scene) ? STANDS[pick as Stand].name : '???';
    const here = standOf(st.scene) === pick;
    text(x, '> ' + name + (here ? '  (YOU ARE HERE)' : ''), ox + 10, fy + 3, 'rgba(' + C + ',.95)', 9, '600', 'left');
    text(x, '<- -> choose · E fly · ESC cancel', ox + w - 10, fy + 12, 'rgba(' + PAPER + ',.7)', 7, '', 'right');
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
