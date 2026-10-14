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
import yardJson from './yard.json';

const yard: Loose<ZoneData> = yardJson;
const logic: Loose<LogicData> = logicJson;
const net: Loose<NetData> = netJson;
const engine: Loose<EngineData> = engineJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as ZoneData;

/** Every zone file, by zone id. A new zone is one import and one line here. */
export const ZONE_FILES: Record<string, ZoneData> = { yard: YARD };

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
