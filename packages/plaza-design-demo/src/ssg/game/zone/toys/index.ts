/**
 * Lock toys: one per lock type (PUZZLES.md, Decided 4). A GUARD noun with
 * `guard.toy` gets the verb `probe`, which opens its toy full screen (the
 * engine panel `toy`, with the guard's `device.noun`). Solving it opens the
 * guard exactly like a right password (`ZoneModel.toySolved`); a wrong answer
 * is a wrong guess (`toyWrong`). Each toy is a pure rule plus a panel:
 *
 * - `rings`: shield rings (rings.ts)
 * - `cipher`: a Caesar wheel (cipher.ts)
 * - `cryptex`: letter rings to a word (cryptex.ts)
 * - `morse`: a blinking lamp to tap back (morse.ts)
 */

import type { ToyKind } from '../../data/types';
import type { PanelFn, PanelKit } from '../panels';
import { cipherPanel } from './cipher';
import { cryptexPanel } from './cryptex';
import { morsePanel } from './morse';
import { ringsPanel } from './rings';

export { Cipher, decipher } from './cipher';
export { Cryptex } from './cryptex';
export { encode, Morse } from './morse';
export { Rings } from './rings';

const TOYS: Record<ToyKind, (kit: PanelKit, key: string) => void> = {
  rings: ringsPanel, cipher: cipherPanel, cryptex: cryptexPanel, morse: morsePanel,
};

/** The engine's `toy` panel: `arg` is the guard (`device.noun`). */
export const toyPanel: PanelFn = (kit, arg) => {
  const toy = arg ? kit.m.guardOf(arg)?.toy : undefined;
  if (!arg || !toy || !TOYS[toy]) { kit.close(); return; }
  TOYS[toy](kit, arg);
};

/** Panels the engine adds to every zone's own (the host passes them to `Panels`). */
export const ENGINE_PANEL_FNS: Record<string, PanelFn> = { toy: toyPanel };
