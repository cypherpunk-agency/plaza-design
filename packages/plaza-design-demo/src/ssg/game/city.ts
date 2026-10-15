/**
 * The city (CITY.md, the source of truth): city → district → place → scene.
 *
 * - `DISTRICTS`: the nine districts, each on its stratum (the Spire over the
 *   street, the Undercity under it).
 * - `PLACES`: every place that exists now, in its district, with its entrance
 *   scene (where quick travel lands, at its exit `at`). A place has one scene or
 *   several; inside a place scenes connect by doors, with no map.
 * - `SCENE_PLACE`: every scene's place (each scene knows its place; a place's
 *   `scenes` are read from it). Planned places are not here until they exist.
 *
 * Then how you travel through it: Downtown's doors, the metro line (a loop:
 * Downtown, Galleria, Harbor), the sky-taxi stands, and the map's data: each
 * district on the street plan (`DISTRICT_MAP`: where its streets grow from, its
 * frame and colour), each place's point on it (`PLACE_MAP`), the stations, pads
 * and LINE 0's loop, the lines not run yet (`LINES_PLANNED`) and the ways between
 * districts (`LINKS`). cityplan.ts traces the streets, citymap.ts draws the map
 * (TAB or M, the CITY MAP kiosk, a taxi stand); quick travel on it goes to places.
 *
 * Canvas drawing only. Scenes you have been in are remembered in the save as
 * `flags['seen:<scene>']`. The map discovers the city from those and from a few story flags
 * (`districtStage`, `placeKnown`, `linkKnown`): what you have not come near is `???` or not drawn.
 */

import type { SceneId } from './scenes';
import { box, C, O, onScreen, PAPER, rng, sign, tell, text, type View } from './scenes/kit';

// ---------- the city: districts and places ----------

/** The city has three strata: the Spire above, the street, the Undercity below (the map's ABOVE and BELOW layers). */
export type Stratum = 'overworld' | 'street' | 'underworld';

export interface District {
  id: string;
  name: string;
  /** What the city map writes on its block (where it has one). */
  short: string;
  stratum: Stratum;
}

/**
 * The nine districts, as CITY.md numbers them. The Old Quarter (along both banks of the canal) was
 * split from the Neon Market (the market and the laundromat stay Neon Market); the Skyport and the
 * Exclusion Zone lie north-west beyond the Fringe, behind a fence. Neither has a place yet.
 */
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', short: 'DOWNTOWN', stratum: 'street' },
  { id: 'oldq', name: 'Old Quarter', short: 'OLD QUARTER', stratum: 'street' },
  { id: 'market', name: 'Neon Market', short: 'NEON MARKET', stratum: 'street' },
  { id: 'galleria', name: 'Galleria', short: 'GALLERIA', stratum: 'street' },
  { id: 'harbor', name: 'Harbor & Shore', short: 'HARBOR', stratum: 'street' },
  { id: 'spire', name: 'The Spire / Plaza Central', short: 'THE SPIRE', stratum: 'overworld' },
  { id: 'undercity', name: 'Undercity', short: 'UNDERCITY', stratum: 'underworld' },
  { id: 'fringe', name: 'The Fringe', short: 'THE FRINGE', stratum: 'street' },
  { id: 'skyport', name: 'Skyport and the Exclusion Zone', short: 'SKYPORT', stratum: 'street' },
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
  { id: 'laundromat', name: 'LAUNDROMAT', district: 'market', entrance: 'laundromat', at: 'market' },
  { id: 'market', name: 'NEON MARKET', district: 'market', entrance: 'market', at: 'downtown' },
  { id: 'shop', name: 'CORNER SHOP', district: 'downtown', entrance: 'shop' },
  { id: 'library', name: 'PUBLIC LIBRARY', district: 'downtown', entrance: 'library' },
  { id: 'station-downtown', name: 'DOWNTOWN METRO', district: 'downtown', entrance: 'metro', at: 'downtown' },
  { id: 'downtown', name: 'DOWNTOWN', district: 'downtown', entrance: 'downtown', at: 'metro' },
  { id: 'yard', name: 'BACK YARD', district: 'downtown', entrance: 'yard' },
  { id: 'capsule', name: 'CAPSULE 7B', district: 'downtown', entrance: 'capsule', at: 'door' },
  { id: 'moth', name: "MOTH'S PLACE", district: 'downtown', entrance: 'moth', at: 'door' },
  { id: 'station-galleria', name: 'GALLERIA METRO', district: 'galleria', entrance: 'galleriaStation', at: 'mall' },
  { id: 'mall', name: 'GALLERIA MALL', district: 'galleria', entrance: 'mall' },
  { id: 'station-harbor', name: 'HARBOR METRO', district: 'harbor', entrance: 'harborStation', at: 'harbor' },
  { id: 'harbor', name: 'HARBOR', district: 'harbor', entrance: 'harbor' },
  { id: 'warehouse', name: 'WAREHOUSE 4', district: 'harbor', entrance: 'warehouse', at: 'stacks' },
  { id: 'beach', name: 'BEACH', district: 'harbor', entrance: 'beach', at: 'harbor' },
  { id: 'line0', name: 'LINE 0', district: null, entrance: 'train' },
  // sudo only: the engine's test bay (sandbox/), in no district and not on the map
  { id: 'sandbox', name: 'QA BAY 3', district: null, entrance: 'sandbox' },
] as const satisfies readonly PlaceData[];
export type PlaceId = (typeof PLACE_DATA)[number]['id'];

/** Every scene's place. Every scene is in exactly one (the type-check holds every scene to it). */
export const SCENE_PLACE = {
  downtown: 'downtown',
  capsule: 'capsule',
  yard: 'yard',
  moth: 'moth',
  shop: 'shop',
  library: 'library',
  metro: 'station-downtown',
  market: 'market',
  laundromat: 'laundromat',
  mall: 'mall',
  galleriaStation: 'station-galleria',
  harbor: 'harbor',
  // the stacks (terminal 2, P15) are a second scene of the harbor's place: a door from the pier, no map pin of their own
  stacks: 'harbor',
  warehouse: 'warehouse',
  harborStation: 'station-harbor',
  beach: 'beach',
  train: 'line0',
  sandbox: 'sandbox',
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
export const seenPlace = (p: Place, seen: (id: SceneId) => boolean) => p.scenes.some(seen);

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
export const DOORS = { market: 70, shop: 242, library: 633, yard: 972, capsule: 1230, metro: 1440, moth: 1496, taxi: 1930 } as const;

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

/**
 * The harbor lock (ROADMAP, Act I): until P14 (`HARBOR_FLAG`, set when the train's doors open at
 * the old siding) LINE 0 does not stop at the harbor and the sky taxi will not fly to its pier;
 * the beach is only reached through the harbor, so it is shut too. Quick travel keeps to the same
 * rule. After P14 it is open for good (sudo sets the flag; `?sudo&locked` leaves it unset).
 */
export const HARBOR_FLAG = 'harbor:open';
export const harborOpen = (flags: Readonly<Record<string, boolean>>) => !!flags[HARBOR_FLAG];
/** The taxi driver, asked for the harbor pier while it is shut. */
/** What you say coming up from the old siding (P14): a service stair, then the pier by the harbor's metro stairs. */
export const SIDING_OUT = ['A service stair. Two hundred steps, a door marked AUTHORISED PERSONNEL, not locked.', 'The harbor. Moth booked this stop two days ago. For me.'];
export const DRIVER_HARBOR = ['Harbor pier is closed to air traffic. Port Authority notice. I can show you the notice.', 'I can also take you somewhere that is open. Those are my two services.'];

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

// ---------- the map: the street plan (CITY.md, "The map") ----------

/**
 * The city map is a street plan, drawn by citymap.ts (and traced by cityplan.ts) from the data
 * here. Plan units: MAP_W × MAP_H, x runs west → east, y north → south. The sea lies east of the
 * coast, the Spire stands on its island in the bay, the canal flows in from the west through the
 * Old Quarter into the bay (cityplan.ts has the coast, the canal and the avenues). The map shows the
 * plan tilted back by default (towers stand up), or flat.
 */
export const MAP_W = 844, MAP_H = 390;

/**
 * Each district on the plan. `centre`: where its streets grow from (the land is shared out to the
 * nearest centre: `districtAt` in cityplan.ts); null for the Spire (its island) and the Undercity
 * (under everything). `sep`: how far apart its streets run. `dens`: how tall its towers stand (0..1).
 * `col`: its colour (r,g,b), for washes and lit windows. `frame`: what the district view zooms to
 * (x, y, w, h). `label`: where its name stands. `note`: the line the map gives it once you know it
 * (CITY.md's character).
 */
export interface DistrictPlan { centre: [number, number] | null; sep: number; dens: number; col: string; frame: [number, number, number, number]; label: [number, number]; note: string }
export const DISTRICT_MAP: Record<DistrictId, DistrictPlan> = {
  downtown: { centre: [395, 205], sep: 11, dens: 1, col: '255,136,0', frame: [300, 132, 186, 140], label: [392, 126], note: 'WORKING CLASS · MIXED · RAIN' },
  oldq: { centre: [300, 318], sep: 9, dens: 0.5, col: '214,150,96', frame: [150, 282, 330, 84], label: [318, 374], note: 'OLD TOWN · THE CANAL · AGEING' },
  market: { centre: [230, 236], sep: 9, dens: 0.6, col: '232,84,206', frame: [168, 180, 134, 100], label: [234, 176], note: 'LOW INCOME · PACKED · LOW TECH' },
  galleria: { centre: [560, 110], sep: 15, dens: 0.75, col: '96,206,222', frame: [486, 44, 156, 136], label: [560, 40], note: 'MIDDLE CLASS AND UP · RETAIL' },
  harbor: { centre: [640, 290], sep: 17, dens: 0.45, col: '255,210,90', frame: [560, 200, 214, 172], label: [612, 206], note: 'INDUSTRY · LEISURE · WATER' },
  spire: { centre: null, sep: 0, dens: 1, col: '170,225,235', frame: [728, 70, 84, 84], label: [770, 160], note: 'RESTRICTED · HIGH TECH · FEW PEOPLE' },
  undercity: { centre: null, sep: 0, dens: 0, col: '90,200,190', frame: [60, 150, 680, 230], label: [440, 352], note: 'CANALS · SEWERS · UNREGISTERED' },
  fringe: { centre: [90, 210], sep: 28, dens: 0.25, col: '120,120,134', frame: [8, 124, 158, 250], label: [86, 380], note: 'AUTOMATED · NO RESIDENTS' },
  skyport: { centre: [48, 62], sep: 34, dens: 0.15, col: '170,190,210', frame: [6, 14, 96, 104], label: [54, 10], note: 'RESTRICTED · LAUNCHES · FENCED' },
};

/** Where each place sits on the plan. A place listed here is on the map and can be quick-travelled to. */
export const PLACE_MAP: Partial<Record<PlaceId, [number, number]>> = {
  laundromat: [215, 262],
  market: [250, 230],
  shop: [330, 228],
  library: [356, 196],
  downtown: [388, 236],
  yard: [420, 262],
  capsule: [440, 176],
  moth: [372, 154],
  'station-downtown': [412, 228],
  mall: [560, 110],
  'station-galleria': [540, 150],
  harbor: [646, 262],
  warehouse: [650, 312],
  'station-harbor': [610, 238],
  beach: [730, 356],
};

/** Each LINE 0 station on the plan, and each sky-taxi pad. */
export const STATION_MAP: Record<Station, [number, number]> = { downtown: [412, 228], galleria: [540, 150], harbor: [610, 238] };
export const PAD_MAP: Record<Stand, [number, number]> = { downtown: [452, 206], galleria: [574, 84], harbor: [690, 276] };

/**
 * LINE 0's loop on the plan, as the metro diagram draws it (straight runs, 45° corners): north from
 * Downtown, east to the Galleria, down to the harbor, back west under Downtown. The train runs it
 * in this order (Downtown, Galleria, Harbor, Downtown).
 */
export const LOOP_MAP: [number, number][] = [[412, 228], [412, 190], [452, 150], [540, 150], [580, 150], [610, 180], [610, 238], [590, 258], [432, 258], [412, 238]];

/**
 * The lines the game does not run yet (CITY.md: LINE 1, the Canal Line; bus 7; the ferry). The map
 * draws one only once the story makes it known (the flag `heard:<id>`; sudo sets them all), and
 * never as travel: its stops are names on a line, not places. `col`: r,g,b. `stops`: name, point,
 * district.
 */
export interface MapLine { id: string; name: string; short: string; col: string; width: number; dash?: number[]; path: [number, number][]; stops: { name: string; pt: [number, number]; district: DistrictId }[] }
export const LINES_PLANNED: MapLine[] = [
  {
    id: 'line1', name: 'LINE 1 · CANAL LINE', short: 'L1', col: '0,200,200', width: 2.4,
    path: [[60, 270], [140, 270], [200, 290], [300, 290], [412, 290], [500, 290], [560, 300], [610, 300], [700, 320], [730, 346]],
    stops: [
      { name: 'FRINGE DEPOT', pt: [60, 270], district: 'fringe' }, { name: 'OLD QUARTER', pt: [200, 290], district: 'oldq' },
      { name: 'CANAL STREET', pt: [412, 290], district: 'oldq' }, { name: 'HARBOR SHORE', pt: [610, 300], district: 'harbor' }, { name: 'BEACH', pt: [730, 346], district: 'harbor' },
    ],
  },
  { id: 'bus7', name: 'BUS 7', short: 'BUS', col: '255,210,90', width: 1, dash: [6, 3], path: [[250, 226], [330, 226], [412, 228], [478, 190], [540, 150]], stops: [] },
  { id: 'ferry', name: 'FERRY', short: 'FERRY', col: '160,200,255', width: 1, dash: [2, 4], path: [[700, 300], [744, 220], [760, 150]], stops: [] },
];
export const lineKnownFlag = (id: string) => 'heard:' + id;

/**
 * The ways between districts, other than LINE 0 and the taxis between stands (drawn from
 * STATIONS and STANDS): `path` on the plan, from → to. `state`: 'open' (you can use it),
 * 'gate' (the market gate: open once Downtown is cleared), 'planned' (CITY.md has it, the game
 * not yet: not on the map at all). `at`: the scenes it is in plain view from (`linkKnown`).
 */
export type LinkKind = 'walk' | 'road' | 'elevator' | 'taxi' | 'bridge' | 'drain' | 'tunnel' | 'canal' | 'lift';
export interface MapLink { kind: LinkKind; name: string; from: DistrictId; to: DistrictId; path: [number, number][]; state: 'open' | 'gate' | 'planned'; at?: SceneId[] }
export const LINKS: MapLink[] = [
  { kind: 'walk', name: 'MARKET GATE', from: 'downtown', to: 'market', path: [[304, 229], [318, 229]], state: 'gate', at: ['downtown', 'market'] },
  { kind: 'walk', name: 'SHORE PATH', from: 'harbor', to: 'harbor', path: [[690, 286], [716, 320], [728, 350]], state: 'open', at: ['harbor', 'beach'] },
  { kind: 'road', name: 'ACCESS ROAD', from: 'market', to: 'fringe', path: [[170, 230], [150, 228]], state: 'planned' },
  { kind: 'elevator', name: 'SKY ELEVATOR', from: 'galleria', to: 'spire', path: [[560, 110], [770, 120]], state: 'planned' },
  { kind: 'taxi', name: 'SKY TAXI DEPOT', from: 'downtown', to: 'spire', path: [[452, 206], [770, 120]], state: 'planned' },
  { kind: 'bridge', name: 'THE BRIDGE', from: 'harbor', to: 'spire', path: [[700, 200], [748, 136]], state: 'planned' },
  { kind: 'drain', name: 'STORM DRAIN', from: 'market', to: 'undercity', path: [[250, 250], [250, 300]], state: 'planned' },
  { kind: 'tunnel', name: 'SERVICE TUNNEL', from: 'downtown', to: 'undercity', path: [[412, 258], [412, 300]], state: 'planned' },
  { kind: 'canal', name: 'CANAL OUTFALL', from: 'harbor', to: 'undercity', path: [[724, 322], [700, 330]], state: 'planned' },
  { kind: 'lift', name: 'SERVICE LIFT', from: 'spire', to: 'undercity', path: [[770, 120], [740, 200]], state: 'planned' },
];

// ---------- quick travel ----------

/** A place on the map: a place with its point on the section. */
export type MapPlace = Place & { pt: [number, number] };
/** Every place on the map, west to east within each district (quick travel goes to these). */
export const MAP_PLACES: MapPlace[] = PLACES.flatMap((p) => { const pt = PLACE_MAP[p.id]; return pt ? [{ ...p, pt }] : []; });
/** A district's places on the map, west to east. */
export const districtPlaces = (d: DistrictId) => MAP_PLACES.filter((p) => p.district === d).sort((a, b) => a.pt[0] - b.pt[0]);
/** A district counts as seen once you have been in any of its places. */
export const districtSeen = (d: DistrictId, seen: (id: SceneId) => boolean) => PLACES.some((p) => p.district === d && seenPlace(p, seen));

// ---------- what you know of the city (the map discovers it as you travel) ----------

/**
 * How much of a district you know, which is how much the map shows of it:
 * - 'unknown': a dim block and `???` (a landmark keeps its silhouette, nothing more).
 * - 'heard': its short name and its shape as seen from the street; still no record.
 * - 'known': its full name and its note.
 */
export type DistrictStage = 'unknown' | 'heard' | 'known';

/**
 * What moves each district along, all from save flags so the story can set them:
 * - known once you have been in one of its places, or by the flag `mapped:<district>`;
 * - heard once you have been in a district in `near` (where it is in plain view, or named on
 *   the signs), or by the flag `heard:<district>`.
 * `landmark`: seen from everywhere, so its silhouette and its stratum are drawn even before you
 * know anything of it (the Spire).
 *
 * The Spire: `???` at first. Heard once you have stood in the Galleria (the sky elevator's housing
 * is on the mall's roof) or at the harbor (the Spire's foot stands in the bay), or by `heard:spire`.
 * Known once you have been up there (a place of it), or by `mapped:spire`.
 * The Undercity: nobody points at it; it stays unknown until the story sets `heard:undercity`
 * or you find a way down.
 * The Old Quarter: heard from the market and from Downtown (its bells, its canal at the end of the
 * street). The Skyport: a landmark like the Spire (its launches are seen from everywhere), so it is
 * drawn from the start, but it stays `???` until the story names it (`heard:skyport`).
 */
export const DISTRICT_REVEAL: Record<DistrictId, { near: DistrictId[]; landmark?: boolean }> = {
  fringe: { near: ['market'] },
  market: { near: ['downtown', 'oldq'] },
  downtown: { near: ['market', 'galleria', 'oldq'] },
  oldq: { near: ['market', 'downtown'] },
  galleria: { near: ['downtown', 'harbor'] },
  harbor: { near: ['galleria'] },
  spire: { near: ['galleria', 'harbor'], landmark: true },
  undercity: { near: [] },
  skyport: { near: [], landmark: true },
};
export const heardFlag = (d: DistrictId) => 'heard:' + d;
export const mappedFlag = (d: DistrictId) => 'mapped:' + d;

/** What the map reads from the save: scenes you have been in, and any flag. */
export interface Knowledge { seen: (id: SceneId) => boolean; flag: (name: string) => boolean }

export function districtStage(d: DistrictId, k: Knowledge): DistrictStage {
  if (districtSeen(d, k.seen) || k.flag(mappedFlag(d))) return 'known';
  if (k.flag(heardFlag(d)) || DISTRICT_REVEAL[d].near.some((n) => districtSeen(n, k.seen))) return 'heard';
  return 'unknown';
}
/** A district's name as far as you know it: `???`, its short name (heard), or its full name (`long`, known). */
export function districtName(d: DistrictId, k: Knowledge, long = false): string {
  const st = districtStage(d, k), dd = DISTRICTS.find((q) => q.id === d)!;
  return st === 'unknown' ? '???' : st === 'known' && long ? dd.name.toUpperCase() : dd.short;
}

/**
 * Where each place's way in is in plain view from: being in one of these scenes puts the place on
 * the map (named, not yet visited). A place you have been in is on it anyway.
 */
export const PLACE_IN_VIEW: Partial<Record<PlaceId, SceneId[]>> = {
  market: ['downtown'],
  laundromat: ['market'],
  shop: ['downtown'],
  library: ['downtown'],
  'station-downtown': ['downtown', 'train'],
  downtown: ['capsule', 'metro', 'yard', 'shop', 'moth', 'library'],
  yard: ['downtown'],
  capsule: ['downtown'],
  moth: ['downtown'],
  'station-galleria': ['mall', 'train'],
  mall: ['galleriaStation'],
  'station-harbor': ['harbor', 'beach', 'train'],
  harbor: ['harborStation', 'beach'],
  warehouse: ['stacks'],
  beach: ['harbor'],
};
/** A place is on the map once you have been in it or seen its way in. */
export const placeKnown = (p: Place, seen: (id: SceneId) => boolean) => seenPlace(p, seen) || (PLACE_IN_VIEW[p.id] ?? []).some(seen);
/** A district's places on the map that you know of, west to east. */
export const knownPlaces = (d: DistrictId, seen: (id: SceneId) => boolean) => districtPlaces(d).filter((p) => placeKnown(p, seen));

/**
 * A way between districts is on the map once you have seen it: from a scene in its `at`, or (with
 * no `at`) once you have been in a district at either end. A planned way is never on the map.
 */
export function linkKnown(l: MapLink, seen: (id: SceneId) => boolean): boolean {
  if (l.state === 'planned') return false;
  return l.at ? l.at.some(seen) : districtSeen(l.from, seen) || districtSeen(l.to, seen);
}
/** A LINE 0 station is on the map once you have stood on its platform or walked past its stairs. */
export const stationKnown = (s: Station, seen: (id: SceneId) => boolean) => seen(STATIONS[s].scene) || seen(STATIONS[s].up);

/** What quick travel needs to know. */
export interface TravelState {
  scene: SceneId;
  /** While riding: the stop the train stands at or last left, the next one, and how far along it is (0..1). */
  ride: { from: Station; to: Station; f: number } | null;
  seen: (id: SceneId) => boolean;
  gateOpen: boolean;
  /** The harbor lock is off (P14 solved): `harborOpen`. */
  harborOpen: boolean;
}

/** Why you cannot quick-travel to a place right now ('' if you can). */
export function placeBlocked(p: Place, st: TravelState): string {
  if (!seenPlace(p, st.seen)) return 'NOT VISITED YET';
  if (p.scenes.includes(st.scene)) return 'YOU ARE HERE';
  if (p.district === 'market' && !st.gateOpen) return 'THE MARKET GATE IS SHUT';
  // the harbor lock: from outside the harbor, nothing goes there (inside it, you can still walk about)
  if (p.district === 'harbor' && !st.harborOpen && placeOf(st.scene).district !== 'harbor') return 'HARBOR CLOSED · LINE 0 DOES NOT STOP';
  if (st.ride && st.ride.f > 0) return 'NOT FROM A MOVING METRO · GET OFF FIRST';
  return '';
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
