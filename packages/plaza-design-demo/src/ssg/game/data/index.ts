/**
 * The game's data files, bundled into the page by esbuild (no fetches: the
 * page runs under `default-src 'self'` and should work from one file).
 *
 * The assignments to `Loose<…>` are the type-check half of validation;
 * check.ts is the build-time half (see GAME-DATA.md).
 */

import type { EngineData, KeyItem, LogicData, Loose, NetData, ZoneData } from './types';
import engineJson from './engine.json';
import logicJson from './logic.json';
import netJson from './net.json';
import downtownJson from './downtown.json';
import yardJson from './yard.json';
import capsuleJson from './capsule.json';
import mothJson from './moth.json';
import beachJson from './beach.json';

const yard: Loose<ZoneData> = yardJson;
const capsule: Loose<ZoneData> = capsuleJson;
const moth: Loose<ZoneData> = mothJson;
const beach: Loose<ZoneData> = beachJson;
const downtown: Loose<ZoneData> = downtownJson;
const logic: Loose<LogicData> = logicJson;
const net: Loose<NetData> = netJson;
const engine: Loose<EngineData> = engineJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as ZoneData;

/** Capsule 7B, the player's flat: where the game starts. */
export const CAPSULE = capsule as ZoneData;

/** Moth's place, flat 4C (story Level 3): FRIENDNET, MOTH-PC and the journal's song seal. */
export const MOTH = moth as ZoneData;

/** The beach and SALT, its bar: a real beach west of the harbor, with Moth's boat at the end of the pier. */
export const BEACH = beach as ZoneData;

/** Downtown, the first street (and the zone the old terminal saves belong to). */
export const DOWNTOWN = downtown as ZoneData;

/** Every zone file, by zone id. A new zone is one import and one line here. */
export const ZONE_FILES: Record<string, ZoneData> = { yard: YARD, capsule: CAPSULE, downtown: DOWNTOWN, moth: MOTH, beach: BEACH };

/** The logic modules (TIMER, SWITCH), shared by every zone. Checked like a zone. */
export const LOGIC = logic as LogicData;

/** The shared net: nodes any zone's LINK may reach. */
export const NET = net as NetData;

/** The engine's own wording; a zone's `texts` override it key by key. */
export const ENGINE = engine as EngineData;

/** Modules a new game owns (legs.so is not one of these: the save keeps it as `jump`). */
export const START_MODULES = LOGIC.modules.filter((m) => m.start).map((m) => m.id);

/** Every keyring item in the game, by id: the keyring travels across zones, so any zone may meet any item. */
export const KEYRING: Map<string, KeyItem> = new Map(
  [...NET.keyring, ...Object.values(ZONE_FILES).flatMap((z) => z.keyring ?? [])].map((k) => [k.id, k]),
);

export type * from './types';
