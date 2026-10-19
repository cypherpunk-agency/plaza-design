/** Yard gameplay outcomes are authored commands, queries and SceneTime deadlines.
 * This module retains the camera panel's native schema requirements only. */

import type { SceneData } from "../../data/types";
import type { SceneRules } from "../../engine/rules";

// ---------- the contract with yard.json ----------

export const YARD_RULES: SceneRules = {
  effects: {},
  panels: ['camera'],
  needs: {
    state: ['found', 'armAt', 'held', 'parcel', 'parcelAt', 'gateAllowed', 'pan'],
    goals: ['find', 'chute', 'talk', 'gate', 'take'],
    texts: {
      'parcel.take': 'line',
      // index.ts
      'prompt.exit': 'label', 'prompt.take': 'label',
      // camera.ts
      'cam.zoom': 'label', 'cam.tag': 'label',
      'cam.zoom.gravel': 'line', 'cam.zoom.crate': 'line', 'cam.zoom.parcel': 'line', 'cam.zoom.out': 'line',
      'cam.tag.none': 'line', 'cam.tag.ok': 'line', 'cam.hud': 'label', 'cam.on': 'label', 'cam.aim': 'label',
    },
  },
  /** The yard's own: the camera sees crates, and the parcel starts in one of them. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    if (!z.camera) errs.push('camera: the yard needs its crates (CAM-1 and the claw use them)');
    else if (!z.camera.crates.some((c) => c.id === z.state.parcel)) errs.push(`state.parcel: "${z.state.parcel}" is not a crate`);
    return errs;
  },
};
