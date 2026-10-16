/**
 * Moth's place, the code side: almost nothing. The flat's things, FRIENDNET,
 * MOTH-PC, the journal's song seal and the Registry's watchdog are all
 * data/moth.json on the engine (sealed sectors, the sequence seal, CLOCK
 * nouns, the watchdog). What is left here:
 *
 * - `uplink`: whether your deck holds uplink.so (the yard's parcel), so Moth's
 *   line reaches past the room (the rig's LINK `when`);
 * - `journalOpen`: MOTH-PC's status line;
 * - the goals only the code can see (a node connected, a sector open).
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { SceneData } from "../../data/types";
import type { World, SceneRules } from "../../engine/rules";

/** The keyring chip the yard's parcel gives: uplink.so, the deck's way past your own building. */
export const UPLINK = 'uplink';
/** Moth's key chip: the flat's door, and MOTH-PC's drawer. */
export const MOTH_KEY = 'moth.key';

function tick(w: World) {
  const m = w.m;
  if (m.net.get('friendnet') === 'connected') w.goal('friendnet');
  if (m.net.get('mothpc') === 'connected') w.goal('mothpc');
  if (m.opened.has('mothpc/drawer')) w.goal('drawer');
  if (m.opened.has('mothpc/journal')) w.goal('journal');
}

export const MOTH_RULES: SceneRules = {
  effects: {},
  derived: {
    uplink: (m) => m.keyring().includes(UPLINK),
    journalOpen: (m) => m.opened.has('mothpc/journal'),
  },
  tick,
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
