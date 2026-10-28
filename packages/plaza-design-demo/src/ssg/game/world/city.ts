import {lockedTransport} from './access';
import {validateCitySource,type CitySourceContext} from './city-source';
import citySource from './city.json';
import type {AccessResult} from '../engine/gameplay/access';
import {nativeAccess} from '../engine/gameplay/access';

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

import type { SceneId } from "../scenes/index";


// ---------- the city: districts and places ----------

/** The city has three strata: the Spire above, the street, the Undercity below (the map's ABOVE and BELOW layers). */
export type Stratum = 'overworld' | 'street' | 'underworld';


export interface District {
  rendering?:import('./render-settings').RenderSettings;
  id: DistrictId;
  name: string;
  /** What the city map writes on its block (where it has one). */
  short: string;
  stratum: Stratum;
}

export type DistrictId = "downtown" | "oldq" | "market" | "galleria" | "harbor" | "spire" | "undercity" | "fringe" | "skyport";


/**
 * A place: a location with one scene or several. `district` is null only for
 * LINE 0's car, which runs between the street districts. `entrance` is the scene
 * quick travel lands in, at its exit `at` (none: its spawn).
 */
export interface PlaceData { climate?:string;access?: string; id: string; name: string; district: DistrictId | null; entrance: SceneId; at?: string }

export type PlaceId = string;


/** A place, with its scenes. */
export interface Place extends PlaceData { id: PlaceId; scenes: SceneId[] }


/**
 * Downtown's ways out, by where they sit on the street (world x): its exits
 * (scenes/downtown/scene.json). Coming back through one of them lands you in front of it.
 * - market: the NEON MARKET gate at the west end (opens once Downtown is cleared)
 * - shop: the corner shop's door (the front at 150)
 * - yard: the fixer's back yard, past the noodle stall
 * - capsule: your building's lobby, the narrow tower at 1200: the lift up to your flat (Capsule 7B)
 * - metro: stairs down, in front of the shuttered front at 1420
 * - moth: the residents' door of that same front (1496): Moth's building, flat 4C (needs Moth's key chip)
 * - taxi: the sky-taxi pad at the east end, past the SPACEPORT sign
 */

// ---------- the metro ----------

export type Station = 'downtown' | 'galleria' | 'harbor';


// ---------- sky taxis ----------

export type Stand = 'downtown' | 'galleria' | 'harbor';


/**
 * Each district on the plan. `centre`: where its streets grow from (the land is shared out to the
 * nearest centre: `districtAt` in cityplan.ts); null for the Spire (its island) and the Undercity
 * (under everything). `sep`: how far apart its streets run. `dens`: how tall its towers stand (0..1).
 * `col`: its colour (r,g,b), for washes and lit windows. `frame`: what the district view zooms to
 * (x, y, w, h). `label`: where its name stands. `note`: the line the map gives it once you know it
 * (CITY.md's character).
 */
export interface DistrictPlan { centre: [number, number] | null; sep: number; dens: number; col: string; frame: [number, number, number, number]; label: [number, number]; note: string }


/**
 * The lines the game does not run yet (CITY.md: LINE 1, the Canal Line; bus 7; the ferry). The map
 * draws one only once the story makes it known (the flag `heard:<id>`; sudo sets them all), and
 * never as travel: its stops are names on a line, not places. `col`: r,g,b. `stops`: name, point,
 * district.
 */
export interface MapLine { id: string; name: string; short: string; col: string; width: number; dash?: number[]; path: [number, number][]; stops: { name: string; pt: [number, number]; district: DistrictId }[] }


/**
 * The ways between districts, other than LINE 0 and the taxis between stands (drawn from
 * STATIONS and STANDS): `path` on the plan, from → to. `state`: 'open' (you can use it),
 * 'gate' (a gate whose access policy resolves its authored exit), 'planned' (CITY.md has it, the game
 * not yet: not on the map at all). `at`: the scenes it is in plain view from (`linkKnown`).
 */
export type LinkKind = 'walk' | 'road' | 'elevator' | 'taxi' | 'bridge' | 'drain' | 'tunnel' | 'canal' | 'lift';

export interface MapLink { kind: LinkKind; name: string; from: DistrictId; to: DistrictId; path: [number, number][]; state: 'open' | 'gate' | 'planned'; at?: SceneId[]; access?: string }


// ---------- quick travel ----------

/** A place on the map: a place with its point on the section. */
export type MapPlace = Place & { pt: [number, number] };


// ---------- what you know of the city (the map discovers it as you travel) ----------

/**
 * How much of a district you know, which is how much the map shows of it:
 * - 'unknown': a dim block and `???` (a landmark keeps its silhouette, nothing more).
 * - 'heard': its short name and its shape as seen from the street; still no record.
 * - 'known': its full name and its note.
 */
export type DistrictStage = 'unknown' | 'heard' | 'known';


/** What the map reads from the save: scenes you have been in, and any flag. */
export interface Knowledge { seen: (id: SceneId) => boolean; flag: (name: string) => boolean }


/** What quick travel needs to know. */
export interface TravelState {
  scene: SceneId;
  /** While riding: the stop the train stands at or last left, the next one, and how far along it is (0..1). */
  ride: { from: Station; to: Station; f: number } | null;
  seen: (id: SceneId) => boolean;
  /** Resolves the actual authored exit against this run's flags and keys. Missing capability denies policies. */
  readonly exitAccess?: (scene: string, id: string) => AccessResult;
  /** The harbor lock is off (P14 solved): `harborOpen`. */
  harborOpen: boolean;
}

/** Authored world values; scene exits remain owned by their scene documents. */
export interface CitySource {
 CLIMATES:Record<string,import('./weather-kinds').ClimateDef>;
 version:2;ACCESS:Record<string,{exit:{scene:string;id:string};reason:string}>;LOCKS:Record<string,{unlockedBy:'HARBOR_FLAG';destinations:string[];reason:string}>;DISTRICTS:District[];PLACES:Place[];
 LINE:Station[];STATIONS:Record<Station,{name:string;scene:SceneId;up:SceneId;at?:string}>;
 TRANSPORT:{boarding:{scene:SceneId;entrance?:string};siding:{scene:SceneId;entrance?:string}};
 HARBOR_FLAG:string;DRIVER_HARBOR:string[];
 STAND_IDS:Stand[];STANDS:Record<Stand,{name:string;scene:SceneId;at?:string}>;FARE:number;HOP:number;DRIVER_BROKE:string[];
 MAP_W:number;MAP_H:number;DISTRICT_MAP:Record<DistrictId,DistrictPlan>;PLACE_MAP:Partial<Record<PlaceId,[number,number]>>;
 STATION_MAP:Record<Station,[number,number]>;PAD_MAP:Record<Stand,[number,number]>;LOOP_MAP:[number,number][];
 LINES_PLANNED:MapLine[];LINKS:MapLink[];DISTRICT_REVEAL:Record<DistrictId,{near:DistrictId[];landmark?:boolean}>;PLACE_IN_VIEW:Partial<Record<PlaceId,SceneId[]>>;
}

/** Independent world registries; default consumers keep the established named API. */
export function createCityModel(input:CitySource,context?:CitySourceContext){
 const data=validateCitySource(input,context);
 const ACCESS=data.ACCESS;


/**
 * The nine districts, as CITY.md numbers them. The Old Quarter (along both banks of the canal) was
 * split from the Neon Market (the market and the laundromat stay Neon Market); the Skyport and the
 * Exclusion Zone lie north-west beyond the Fringe, behind a fence. Neither has a place yet.
 */
 const DISTRICTS = data.DISTRICTS;


/** Every scene's place. Every scene is in exactly one (the type-check holds every scene to it). */
 const SCENE_PLACE = Object.fromEntries(data.PLACES.flatMap(p=>p.scenes.map(scene=>[scene,p.id]))) as Record<SceneId,PlaceId>;

 const PLACES: Place[] = data.PLACES;

/** The place a scene belongs to. */
 const placeOf = (id: SceneId): Place => PLACES.find((p) => p.id === SCENE_PLACE[id])!;

 const districtOf = (p: Place) => DISTRICTS.find((d) => d.id === p.district) ?? null;


/** What the build checks of the city (generate-demos): every place has a scene, its entrance among them; districts exist. */
 function cityProblems(): string[] {
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


 const seenFlag = (id: SceneId) => 'seen:' + id;

/** A place counts as visited once you have been in any of its scenes. */
 const seenPlace = (p: Place, seen: (id: SceneId) => boolean) => p.scenes.some(seen);

/** LINE 0 is a loop, in this order: after HARBOR it runs back to DOWNTOWN. The ride itself is scenes/line.ts. */
 const LINE: Station[] = data.LINE;

/**
 * Each station: its name, its platform (a scene, where you land stepping off at
 * its `train` exit) and the scene its stairs lead up to.
 */
 const STATIONS = data.STATIONS;
 const TRANSPORT=data.TRANSPORT;

/** The station whose platform this scene is, if it is one. */
 const stationAt = (id: string): Station | null => LINE.find((s) => STATIONS[s].scene === id) ?? null;


/**
 * The harbor lock (ROADMAP, Act I): until P14 (`HARBOR_FLAG`, set when the train's doors open at
 * the old siding) LINE 0 does not stop at the harbor and the sky taxi will not fly to its pier;
 * the beach is only reached through the harbor, so it is shut too. Quick travel keeps to the same
 * rule. After P14 it is open for good (sudo sets the flag; `?sudo&locked` leaves it unset).
 */
 const HARBOR_FLAG = data.HARBOR_FLAG;

 const harborOpen = (flags: Readonly<Record<string, boolean>>) => !!flags[HARBOR_FLAG];

/** Destination locks (city.json `LOCKS`): a lock holds its district, station and taxi-stand destinations shut until its world flag is set. */
 const LOCKS = data.LOCKS;
 /** The lock that holds this destination (district, station or taxi stand id) shut, if any. */
 const lockOf = (destination: string) => Object.values(LOCKS).find((l) => l.destinations.includes(destination));
 /** Is the lock open: its world flag is set. */
 const lockOpen = (id: string, flags: Readonly<Record<string, boolean>>) => !!flags[data[LOCKS[id].unlockedBy]];
 /** May you go to this destination, given whether its lock is open (the map's single `harborOpen` bit)? */
 const transportPermission = (destination: string, open: boolean) => lockedTransport(lockOf(destination), open);
 /** The same, from the saved flags. */
 const transportAccess = (destination: string, flags: Readonly<Record<string, boolean>>) => { const lock = lockOf(destination); return lockedTransport(lock, !lock || !!flags[data[lock.unlockedBy]]); };

/** The taxi driver, asked for the harbor pier while it is shut. */
/** What you say coming up from the old siding (P14): a service stair, then the pier by the harbor's metro stairs. */

 const DRIVER_HARBOR = data.DRIVER_HARBOR;

 const STAND_IDS: Stand[] = data.STAND_IDS;

/** Each stand: its name and the scene it is in; you land at that scene's `taxi` exit. */
 const STANDS = data.STANDS;

 const standOf = (id: SceneId): Stand | null => STAND_IDS.find((s) => STANDS[s].scene === id) ?? null;

 const FARE = data.FARE;

/** Frames of a quick trip from the map: a fade out, the move, a fade in. */
 const HOP = data.HOP;

 const DRIVER_BROKE = data.DRIVER_BROKE;


// ---------- the map: the street plan (CITY.md, "The map") ----------

/**
 * The city map is a street plan, drawn by citymap.ts (and traced by cityplan.ts) from the data
 * here. Plan units: MAP_W × MAP_H, x runs west → east, y north → south. The harbor's sea lies east
 * of the coast, the Spire stands on its island in the bay; the open sea of the west shore lies in
 * the south-west (the beach, Old Quarter), and the canal flows from its mouth there through the
 * Old Quarter into the bay (cityplan.ts has the coast, the canal and the avenues). The map shows the
 * plan tilted back by default (towers stand up), or flat.
 */
 const MAP_W = data.MAP_W, MAP_H = data.MAP_H;

 const DISTRICT_MAP: Record<DistrictId, DistrictPlan> = data.DISTRICT_MAP;


/** Where each place sits on the plan. A place listed here is on the map and can be quick-travelled to. */
 const PLACE_MAP: Partial<Record<PlaceId, [number, number]>> = data.PLACE_MAP;


/** Each LINE 0 station on the plan, and each sky-taxi pad. */
 const STATION_MAP: Record<Station, [number, number]> = data.STATION_MAP;

 const PAD_MAP: Record<Stand, [number, number]> = data.PAD_MAP;


/**
 * LINE 0's loop on the plan, as the metro diagram draws it (straight runs, 45° corners): north from
 * Downtown, east to the Galleria, down to the harbor, back west under Downtown. The train runs it
 * in this order (Downtown, Galleria, Harbor, Downtown).
 */
 const LOOP_MAP: [number, number][] = data.LOOP_MAP;

 const LINES_PLANNED: MapLine[] = data.LINES_PLANNED;

 const lineKnownFlag = (id: string) => 'heard:' + id;

 const LINKS: MapLink[] = data.LINKS;

/** Every place on the map, west to east within each district (quick travel goes to these). */
 const MAP_PLACES: MapPlace[] = PLACES.flatMap((p) => { const pt = PLACE_MAP[p.id]; return pt ? [{ ...p, pt }] : []; });

/** A district's places on the map, west to east. */
 const districtPlaces = (d: DistrictId) => MAP_PLACES.filter((p) => p.district === d).sort((a, b) => a.pt[0] - b.pt[0]);

/** A district counts as seen once you have been in any of its places. */
 const districtSeen = (d: DistrictId, seen: (id: SceneId) => boolean) => PLACES.some((p) => p.district === d && seenPlace(p, seen));


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
 const DISTRICT_REVEAL: Record<DistrictId, { near: DistrictId[]; landmark?: boolean }> = data.DISTRICT_REVEAL;

 const heardFlag = (d: DistrictId) => 'heard:' + d;

 const mappedFlag = (d: DistrictId) => 'mapped:' + d;


 function districtStage(d: DistrictId, k: Knowledge): DistrictStage {
  if (districtSeen(d, k.seen) || k.flag(mappedFlag(d))) return 'known';
  if (k.flag(heardFlag(d)) || DISTRICT_REVEAL[d].near.some((n) => districtSeen(n, k.seen))) return 'heard';
  return 'unknown';
}

/** A district's name as far as you know it: `???`, its short name (heard), or its full name (`long`, known). */
 function districtName(d: DistrictId, k: Knowledge, long = false): string {
  const st = districtStage(d, k), dd = DISTRICTS.find((q) => q.id === d)!;
  return st === 'unknown' ? '???' : st === 'known' && long ? dd.name.toUpperCase() : dd.short;
}


/**
 * Where each place's way in is in plain view from: being in one of these scenes puts the place on
 * the map (named, not yet visited). A place you have been in is on it anyway.
 */
 const PLACE_IN_VIEW: Partial<Record<PlaceId, SceneId[]>> = data.PLACE_IN_VIEW;

/** A place is on the map once you have been in it or seen its way in. */
 const placeKnown = (p: Place, seen: (id: SceneId) => boolean) => seenPlace(p, seen) || (PLACE_IN_VIEW[p.id] ?? []).some(seen);

/** A district's places on the map that you know of, west to east. */
 const knownPlaces = (d: DistrictId, seen: (id: SceneId) => boolean) => districtPlaces(d).filter((p) => placeKnown(p, seen));


/**
 * A way between districts is on the map once you have seen it: from a scene in its `at`, or (with
 * no `at`) once you have been in a district at either end. A planned way is never on the map.
 */
 function linkKnown(l: MapLink, seen: (id: SceneId) => boolean): boolean {
  if (l.state === 'planned') return false;
  return l.at ? l.at.some(seen) : districtSeen(l.from, seen) || districtSeen(l.to, seen);
}

/** A LINE 0 station is on the map once you have stood on its platform or walked past its stairs. */
 const stationKnown = (s: Station, seen: (id: SceneId) => boolean) => seen(STATIONS[s].scene) || seen(STATIONS[s].up);


/** One source policy is shared by admission and gate presentation; unresolved owners fail closed. */
 function accessPolicy(id:string|undefined,st:TravelState):AccessResult {
  if(id===undefined)return {ok:true};
  const policy=data.ACCESS[id];
  if(!policy)return nativeAccess([{allowed:false,reason:'ACCESS POLICY UNAVAILABLE'}]);
  const result=st.exitAccess?.(policy.exit.scene,policy.exit.id);
  return result?.ok?result:nativeAccess([{allowed:false,reason:policy.reason}]);
 }

/** Why you cannot quick-travel to a place right now ('' if you can). */
 function placeBlocked(p: Place, st: TravelState): string {
  const harbor=transportPermission(p.district??'',st.harborOpen||placeOf(st.scene).district===p.district),policy=accessPolicy(p.access,st);
  const access=nativeAccess([
    {allowed:seenPlace(p,st.seen),reason:'NOT VISITED YET'},
    {allowed:!p.scenes.includes(st.scene),reason:'YOU ARE HERE'},
    {allowed:policy.ok,reason:policy.ok?'':policy.reason},
    {allowed:harbor.ok,reason:harbor.ok?'':harbor.reason},
    {allowed:!st.ride||st.ride.f<=0,reason:'NOT FROM A MOVING METRO · GET OFF FIRST'},
  ]);
  return access.ok?'':access.reason;
}
 return {source:data,ACCESS,DISTRICTS,SCENE_PLACE,PLACES,placeOf,districtOf,cityProblems,seenFlag,seenPlace,LINE,STATIONS,TRANSPORT,stationAt,HARBOR_FLAG,harborOpen,LOCKS,lockOf,lockOpen,transportPermission,transportAccess,DRIVER_HARBOR,STAND_IDS,STANDS,standOf,FARE,HOP,DRIVER_BROKE,MAP_W,MAP_H,DISTRICT_MAP,PLACE_MAP,STATION_MAP,PAD_MAP,LOOP_MAP,LINES_PLANNED,lineKnownFlag,LINKS,MAP_PLACES,districtPlaces,districtSeen,DISTRICT_REVEAL,heardFlag,mappedFlag,districtStage,districtName,PLACE_IN_VIEW,placeKnown,knownPlaces,linkKnown,stationKnown,accessPolicy,placeBlocked};
}
export type CityModel=ReturnType<typeof createCityModel>;
const shippingCity=createCityModel(citySource as unknown as CitySource);
export const {source,ACCESS,DISTRICTS,SCENE_PLACE,PLACES,placeOf,districtOf,cityProblems,seenFlag,seenPlace,LINE,STATIONS,TRANSPORT,stationAt,HARBOR_FLAG,harborOpen,LOCKS,lockOf,lockOpen,transportPermission,transportAccess,DRIVER_HARBOR,STAND_IDS,STANDS,standOf,FARE,HOP,DRIVER_BROKE,MAP_W,MAP_H,DISTRICT_MAP,PLACE_MAP,STATION_MAP,PAD_MAP,LOOP_MAP,LINES_PLANNED,lineKnownFlag,LINKS,MAP_PLACES,districtPlaces,districtSeen,DISTRICT_REVEAL,heardFlag,mappedFlag,districtStage,districtName,PLACE_IN_VIEW,placeKnown,knownPlaces,linkKnown,stationKnown,accessPolicy,placeBlocked}=shippingCity;
