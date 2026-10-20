/**
 * The sandbox's code side (REGISTRY QA BAY 3, sudo only): almost nothing.
 * Every station is data/sandbox.json on the engine. What is left here is the
 * little that data cannot say:
 *
 * - `sbx.pulse`: a thing reacted (a horn buzzed, a bell rang): the drawing
 *   flashes it for `pulseMs` (the picture controller reads its source-bound duration), nothing is stored;
 * Counter, stamp, brew, reader and till operations are shared commands in gameplay.json.
 * Time and weather reactions use source-owned live condition triggers and replies.
 * The night predicate is a shared source query over the city clock.
 *
 * Pure: no DOM, so node can run it (the build's check, scratch scripts).
 */

import type { Effect, SceneRules } from "../../engine/rules";
import type { Ctx, SceneModel } from "../../engine/model";

/** The carried item the chip reader eats (scenes/kit.ts `ITEMS`); the dispenser beside it hands them out. */
export const CHIP = 'blankchip';

const mark = (m: SceneModel, c: Ctx) => { m.scratch['pulse.' + c.dev] = m.scratch['pulse.' + c.dev + '.' + c.noun] = m.now(); };


const EFFECTS: Record<string, Effect> = {
  'sbx.pulse': (w, c) => { mark(w.m, c); w.changed(); },

};

export const SANDBOX_RULES: SceneRules = {
  effects: EFFECTS,
  needs: {devices:[],state:[]},
};
