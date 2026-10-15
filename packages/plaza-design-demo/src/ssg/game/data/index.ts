/**
 * The game's data files, bundled into the page by esbuild (no fetches: the
 * page runs under `default-src 'self'` and should work from one file).
 *
 * The assignments to `Loose<…>` are the type-check half of validation;
 * check.ts is the build-time half (see GAME-DATA.md).
 */

import type { EngineData, KeyItem, LogicData, Loose, NetData, SceneData } from './types';
import engineJson from './engine.json';
import logicJson from './logic.json';
import netJson from './net.json';
import downtownJson from './downtown.json';
import yardJson from './yard.json';
import capsuleJson from './capsule.json';
import mothJson from './moth.json';
import beachJson from './beach.json';
import laundromatJson from './laundromat.json';

const yard: Loose<SceneData> = yardJson;
const capsule: Loose<SceneData> = capsuleJson;
const moth: Loose<SceneData> = mothJson;
const beach: Loose<SceneData> = beachJson;
const laundromat: Loose<SceneData> = laundromatJson;
const downtown: Loose<SceneData> = downtownJson;
const logic: Loose<LogicData> = logicJson;
const net: Loose<NetData> = netJson;
const engine: Loose<EngineData> = engineJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as SceneData;

/** Capsule 7B, the player's flat: where the game starts. */
export const CAPSULE = capsule as SceneData;

/** Moth's place, flat 4C (story Level 3): FRIENDNET, MOTH-PC and the journal's song seal. */
export const MOTH = moth as SceneData;

/** The beach and SALT, its bar: a real beach west of the harbor, with Moth's boat at the end of the pier. */
export const BEACH = beach as SceneData;

/** The laundromat in the Neon Market (P13 Washer 3): four washers on one breaker, the schedule, SUDS, Moth's jacket. */
export const LAUNDROMAT = laundromat as SceneData;

/** Downtown, the first street (and the scene the old terminal saves belong to). */
export const DOWNTOWN = downtown as SceneData;

/** Every scene file, by scene id. A new scene is one import and one line here. */
export const SCENE_FILES: Record<string, SceneData> = { yard: YARD, capsule: CAPSULE, downtown: DOWNTOWN, moth: MOTH, beach: BEACH, laundromat: LAUNDROMAT };

/** The logic modules (TIMER, SWITCH), shared by every scene. Checked like a scene. */
export const LOGIC = logic as LogicData;

/** The shared net: nodes any scene's LINK may reach. */
export const NET = net as NetData;

/** The engine's own wording; a scene's `texts` override it key by key. */
export const ENGINE = engine as EngineData;

/** Modules a new game owns (legs.so is not one of these: the save keeps it as `jump`). */
export const START_MODULES = LOGIC.modules.filter((m) => m.start).map((m) => m.id);

/** Every keyring item in the game, by id: the keyring travels across scenes, so any scene may meet any item. */
export const KEYRING: Map<string, KeyItem> = new Map(
  [...NET.keyring, ...Object.values(SCENE_FILES).flatMap((z) => z.keyring ?? [])].map((k) => [k.id, k]),
);

export type * from './types';
