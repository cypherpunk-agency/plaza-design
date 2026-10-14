/**
 * The game's data files, bundled into the page by esbuild (no fetches: the
 * page runs under `default-src 'self'` and should work from one file).
 *
 * The assignment to `Loose<ZoneData>` is the type-check half of validation;
 * check.ts is the build-time half (see GAME-DATA.md).
 */

import type { Loose, ZoneData } from './types';
import yardJson from './yard.json';

const yard: Loose<ZoneData> = yardJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as ZoneData;

export type * from './types';
