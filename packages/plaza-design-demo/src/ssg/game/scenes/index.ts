/**
 * Every scene, by id: every place in the game is one (city.ts says which
 * place each belongs to). `?play=<id>` starts in one, and sudo's LEVELS lists
 * them in this order. Most are walkable scenery with people, things to use
 * and read, and ways out; the ones with devices bring their data file and
 * rules (capsule/, downtown/, library/, yard/, moth/, laundromat/, beach/, stacks/). Layout and texts are plain
 * objects in each module; drawing is code.
 */

import { beach } from '../beach';
import { capsule } from '../capsule';
import { downtown } from '../downtown';
import { laundromat } from '../laundromat';
import { library } from '../library';
import { moth } from '../moth';
import { stacks } from '../stacks';
import { yard } from '../yard';
import { harbor } from './harbor';
import type { SceneDef } from './kit';
import { mall } from './mall';
import { market } from './market';
import { metro } from './metro';
import { shop } from './shop';
import { galleriaStation, harborStation } from './stations';
import { train } from './train';
import { warehouse } from './warehouse';

export type { ItemId, SceneDef, SceneExit, SceneReadable, SceneRest, SceneSaid, SceneUse, UseCtx, View as SceneView } from './kit';
export { ITEMS, priceTag } from './kit';

/** LINE 0's platforms are `metro` (Downtown's), `galleriaStation` and `harborStation`; `train` is the car you ride in. */
export const SCENES = {
  capsule, downtown, library, yard, moth, beach, harbor, stacks, warehouse, market, laundromat, shop, mall, metro, galleriaStation, harborStation, train,
} satisfies Record<string, SceneDef>;
export type SceneId = keyof typeof SCENES;

export const isSceneId = (id: string): id is SceneId => Object.prototype.hasOwnProperty.call(SCENES, id);
export const sceneById = (id: string): SceneDef | undefined => (isSceneId(id) ? SCENES[id] : undefined);
/** A scene's name in capitals, as the HUD, the menu and the slots show it: BACK YARD, CAPSULE 7B. */
export const sceneTitle = (s: SceneDef) => s.name.replace(/^the /i, '').toUpperCase();
