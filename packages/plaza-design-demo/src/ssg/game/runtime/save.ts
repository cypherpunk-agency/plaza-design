/** Extracted save responsibilities; function bodies and stored identifiers are preserved. */
import type { SceneSave } from '../data/types';
import { type ClockSave, newClock, fixClock } from "../world/clock";
import { START_MODULES } from '../data/index';
import { SAVE_KEY } from './mode';


// ---------- save state ----------

export interface Save {
  /** Last scene for Continue; absent in older v3 saves. Validated against SCENES on resume. */
  scene?: string;
  handle: string;
  tokens: number;
  /** legs.so: installed from the junction box. Stays its own flag (older saves have it). */
  jump: boolean;
  /** Logic modules owned, shared by every scene: `timer.so`, `switch.so`. Not legs.so (that is `jump`). */
  modules: string[];
  /** Registry nodes you have taken control of, by label (`0x2F`): access points onto their networks (NET.md). */
  controlled: string[];
  /** Programs you own (NET.md): `scan.so` from the library. uplink.so stays a keyring chip. */
  programs: string[];
  /** Networks you have found (net.json ids): the net map draws them. */
  nets: string[];
  flags: Record<string, boolean>;
  hints: Record<string, number>;
  /** The keyring: clue fragments and key chips (ids in the game data's `keyring`), carried across scenes. */
  keyring: string[];
  /** Each scene's own progress, by scene id: `scenes.yard`. Downtown keeps using the fields above. */
  scenes: Record<string, SceneSave | undefined>;
  /** What the player carries (bought, given), item id → how many: `{ fish: 2, tea: 1 }`. Scene uses read it through `UseCtx`. */
  items: Record<string, number>;
  /** Time played in ms (the pause menu's save slots show it). Older saves: missing, counts from 0. */
  playMs?: number;
  /** The city clock (clock.ts): day, minute of the day, the weather's seed. Older saves: day 1, 09:40, seed 1. */
  clock: ClockSave;
}


/** A fresh player save; the title/glide hands it to the train-home opening. */

export function newSave(): Save {
  return { handle: '', tokens: 0, jump: false, modules: [...START_MODULES], keyring: [], items: {}, controlled: [], programs: [], nets: [], flags: {}, hints: {}, scenes: {}, clock: newClock() };
}


/** A stored save, with anything missing filled in from a new game. */
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s: Save = { ...newSave(), ...JSON.parse(raw) };
      if (!Array.isArray(s.modules)) s.modules = [...START_MODULES];
      if (!s.scenes || typeof s.scenes !== 'object') s.scenes = {};
      if (!Array.isArray(s.keyring)) s.keyring = [];
      for (const k of ['controlled', 'programs', 'nets'] as const) if (!Array.isArray(s[k])) s[k] = [];
      if (!s.items || typeof s.items !== 'object' || Array.isArray(s.items)) s.items = {};
      s.items = Object.fromEntries(Object.entries(s.items).filter(([, n]) => Number.isInteger(n) && n > 0));
      // a save from before the city clock (TIME.md): day 1, 09:40
      s.clock = fixClock(JSON.parse(raw).clock);
      return s;
    }
  } catch { /* private window or blocked storage: start fresh */ }
  return newSave();
}


/** Every module the player owns, legs.so first. */
export const ownedModules = (s: Save) => [...(s.jump ? ['legs.so'] : []), ...s.modules];


export function storeSave(s: Save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* not persisted */ }
}


export const BASE_NODES = 42;

export const nodeCount = (s: Save) => BASE_NODES + s.controlled.length;

export const who = (s: Save) => s.handle || 'ghost';
