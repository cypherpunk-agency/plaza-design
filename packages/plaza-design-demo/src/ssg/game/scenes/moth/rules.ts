/** Moth puzzle dependency checks. Native observable aliases and goal bindings live in devices.json. */

import type { SceneData } from "../../data/types";
import type { SceneRules } from "../../engine/rules";

/** The keyring chip the yard's parcel gives: uplink.so, the deck's way past your own building. */
export const UPLINK = 'uplink';
/** Moth's key chip: the flat's door, and MOTH-PC's drawer. */
export const MOTH_KEY = 'moth.key';


export const MOTH_RULES: SceneRules = {
  effects: {},
  needs: {
    goals: ['friendnet', 'mothpc', 'drawer', 'journal'],
    texts: { 'prompt.out': 'label', 'door.out': 'line' },
  },
  /** The level's own: P09's drawer takes Moth's key, P10's journal is a song seal the watchdog visits. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    const pc = z.nodes?.find((n) => n.id === 'mothpc');
    const drawer = pc?.sectors?.find((s) => s.id === 'drawer'), journal = pc?.sectors?.find((s) => s.id === 'journal');
    if (!drawer || !('key' in drawer.seal) || drawer.seal.key !== MOTH_KEY) errs.push(`nodes[mothpc] › sectors: "drawer" must be sealed with { "key": "${MOTH_KEY}" } (P09)`);
    if (!journal || !('sequence' in journal.seal)) errs.push('nodes[mothpc] › sectors: "journal" must be a sequence seal (P10)');
    if (!z.watchdog?.route.includes('mothpc')) errs.push('watchdog: its route must visit mothpc (P10)');
    return errs;
  },
};
