/**
 * The game's data files, bundled into the page by esbuild (no fetches: the
 * page runs under `default-src 'self'` and should work from one file).
 *
 * The assignments to `Loose<…>` are the type-check half of validation;
 * check.ts is the build-time half (see GAME-DATA.md).
 */

import type { LogicData, Loose, ZoneData } from './types';
import logicJson from './logic.json';
import yardJson from './yard.json';

const yard: Loose<ZoneData> = yardJson;
const logic: Loose<LogicData> = logicJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as ZoneData;

/** The logic modules (TIMER, SWITCH), shared by every zone. Checked like a zone. */
export const LOGIC = logic as LogicData;

/** Modules a new game owns (legs.so is not one of these: the save keeps it as `jump`). */
export const START_MODULES = LOGIC.modules.filter((m) => m.start).map((m) => m.id);

export type * from './types';
