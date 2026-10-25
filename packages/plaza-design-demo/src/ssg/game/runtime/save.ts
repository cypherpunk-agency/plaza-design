import {perfBegin,perfEnd} from './diagnostics/performance';
import { gameStorage } from './storage';
/** Extracted save responsibilities; function bodies and stored identifiers are preserved. */
import type { SceneSave } from '../data/types';
import { type ClockSave, newClock, fixClock } from "../world/clock";
import { START_MODULES } from '../data/index';
import { playProfile, saveKey } from './play-profile';


// ---------- save state ----------

export interface Save {
  /** Current world-composition membership; no copied chunk content or instance state. */
  worldMembership?:import('../world/compositions').WorldMembership;
  /** One validated pending composition batch. Commands do not replay when a saved batch resumes. */
  worldEdit?:import('../world/compositions').CompositionEdit[];
  /** Receipts for the current authored direction activation, never an instruction to replay on load. */
  sequenceActions?:import('./sequence-commands').SequenceCommandRun;
  /** Current place aboard a physical service; restored after its scene model. */
  vehicle?:import('../engine/level-vehicles').VehicleSave;
  /** Common scalar owner blocks shared by gameplay commands and scene models. */
  gameplay?:import('../engine/gameplay/types').StateValues;
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
  /** The keyring: clue fragments and key chips (ids in the game data's `keyring`), carried across scenes. */
  keyring: string[];
  /** Each scene's own progress, by scene id: `scenes.yard`. Downtown keeps using the fields above. */
  scenes: Record<string, SceneSave | undefined>;
  /** What the player carries (bought, given), item id → how many: `{ fish: 2, tea: 1 }`. Scene uses read it through `UseCtx`. */
  items: Record<string, number>;
  /** Time played in ms (the pause menu's save slots show it). Older saves: missing, counts from 0. */
  playMs?: number;
  /** The deck tab Esc opens on (ui/menu.ts `DECK_TABS`): the one last open. Older saves: missing, the first tab. */
  deckTab?: string;
  /** Hint ids already shown (timed hints) or done (control hints): each shows once per run (ui/hints.ts). */
  seenHints?: string[];
  /** Rooms seen and remembered (engine/level.ts `LevelRoom`, keep 'remember'), by scene id: they stay open. Older saves: none. */
  rooms?: Record<string, string[]>;
  /** Level barriers opened (engine/level.ts `LevelBarrier`: turnstiles, gates, locked doors), by scene id: they stay open. */
  barriers?: Record<string, string[]>;
  /** The city clock (clock.ts): day, minute of the day, the weather's seed. Older saves: day 1, 09:40, seed 1. */
  clock: ClockSave;
}


/** A fresh player save; the title/glide hands it to the train-home opening. */

export function newSave(): Save {
  const { seed } = playProfile();
  return { ...(seed.scene ? { scene: seed.scene } : {}), handle: seed.handle, tokens: seed.tokens, jump: false, modules: [...START_MODULES, ...seed.modules], keyring: [], items: {}, controlled: [], programs: [], nets: [], flags: Object.fromEntries(seed.flags.map(f => [f, true])), scenes: {}, clock: newClock() };
}


/** A stored save, with anything missing filled in from a new game. */
export function loadSave(): Save {
  try {
    const raw = gameStorage.getItem(saveKey());
    if (raw) {
      const s: Save = { ...newSave(), ...JSON.parse(raw) };
      if (!Array.isArray(s.modules)) s.modules = [...START_MODULES];
      if (!s.scenes || typeof s.scenes !== 'object') s.scenes = {};
      if (!Array.isArray(s.keyring)) s.keyring = [];
      for (const k of ['controlled', 'programs', 'nets'] as const) if (!Array.isArray(s[k])) s[k] = [];
      if (!s.items || typeof s.items !== 'object' || Array.isArray(s.items)) s.items = {};
      s.items = Object.fromEntries(Object.entries(s.items).filter(([, n]) => Number.isInteger(n) && n > 0));
      // a save from before the city clock (TIME.md): day 1, 09:40
      if(!s.gameplay||typeof s.gameplay!=='object'||Array.isArray(s.gameplay))s.gameplay={};
      const safe=(k:string)=>!['__proto__','constructor','prototype'].includes(k);
      s.gameplay=Object.fromEntries(Object.entries(s.gameplay).filter(([owner,block])=>safe(owner)&&block&&typeof block==='object'&&!Array.isArray(block)).map(([owner,block])=>[owner,Object.fromEntries(Object.entries(block).filter(([k,v])=>safe(k)&&(v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=2000||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER)))]));
      s.clock = fixClock(JSON.parse(raw).clock);
      for(const m of playProfile().seed.modules)if(!s.modules.includes(m))s.modules.push(m);
      return s;
    }
  } catch { /* private window or blocked storage: start fresh */ }
  return newSave();
}


/** Every module the player owns, legs.so first. */
export const ownedModules = (s: Save) => [...(s.jump ? ['legs.so'] : []), ...s.modules];


export function storeSave(s: Save,prepare?:(save:Save)=>Save) {
  const total=perfBegin('save.total');
  try {let span=perfBegin('save.stringify');let raw:string;try{raw=JSON.stringify(prepare?prepare(s):s);}finally{perfEnd(span);}
    span=perfBegin('save.write');try{gameStorage.setItem(saveKey(),raw);}finally{perfEnd(span);}
  } catch { /* not persisted */ }finally{perfEnd(total);}
}


export const BASE_NODES = 42;

export const nodeCount = (s: Save) => BASE_NODES + s.controlled.length;

export const who = (s: Save) => s.handle || 'ghost';
