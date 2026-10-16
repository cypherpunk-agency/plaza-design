/**
 * Every scene, by id: every place in the game is one (city.ts says which
 * place each belongs to). `?play=<id>` starts in one, and sudo's LEVELS lists
 * them in this order. Most are walkable scenery with people, things to use
 * and read, and ways out; the ones with devices bring their data file and
 * rules (capsule/, downtown/, library/, yard/, moth/, laundromat/, beach/, stacks/). Layout and texts are plain
 * objects in each module; drawing is code.
 */

import { beach } from "./beach/index";
import { capsule } from "./capsule/index";
import { downtown } from "./downtown/index";
import { laundromat } from "./laundromat/index";
import { library } from "./library/index";
import { moth } from "./moth/index";
import { stacks } from "./stacks/index";
import { yard } from "./yard/index";
import { sandbox } from "./sandbox/index";
import { harborShift } from "./harbor-shift/index";
import { harbor } from "./harbor/index";
import type { SceneDef } from './kit';
import { mall } from "./mall/index";
import { market } from "./market/index";
import { metro } from "./metro/index";
import { shop } from "./shop/index";
import { galleriaStation } from './galleriaStation/index';
import { harborStation } from './harborStation/index';
import { train } from "./train/index";
import { warehouse } from "./warehouse/index";

export type { ItemId, SceneDef, SceneExit, SceneReadable, SceneRest, SceneSaid, SceneUse, UseCtx, View as SceneView } from './kit';
export { ITEMS, priceTag } from './kit';

/** LINE 0's platforms are `metro` (Downtown's), `galleriaStation` and `harborStation`; `train` is the car you ride in. */
export const SCENES = {
  capsule, downtown, library, yard, moth, beach, harbor, stacks, warehouse, market, laundromat, shop, mall, metro, galleriaStation, harborStation, train,
  // sudo only (index.ts refuses `?play=sandbox` without `?sudo`): the engine's test bay, outside the story
  sandbox, harborShift,
} satisfies Record<string, SceneDef>;
export type SceneId = keyof typeof SCENES;

export const isSceneId = (id: string): id is SceneId => Object.prototype.hasOwnProperty.call(SCENES, id);
export const sceneById = (id: string): SceneDef | undefined => (isSceneId(id) ? SCENES[id] : undefined);
/** A scene's name in capitals, as the HUD, the menu and the slots show it: BACK YARD, CAPSULE 7B. */
export const sceneTitle = (s: SceneDef) => s.name.replace(/^the /i, '').toUpperCase();
