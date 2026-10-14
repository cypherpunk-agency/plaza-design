/**
 * The explorable scenes, by id. Each is walkable scenery with a few things to
 * read and a way back to Downtown; `?play=<id>` starts in one. Layout and texts
 * are plain objects in each module (ready to move to data later); drawing is code.
 */

import { harbor } from './harbor';
import type { Scene } from './kit';
import { mall } from './mall';
import { market } from './market';
import { metro } from './metro';
import { shop } from './shop';
import { train } from './train';

export type { Scene, SceneExit, SceneReadable, SceneUse, UseCtx, View as SceneView } from './kit';

export const SCENES = { harbor, market, shop, mall, metro, train } satisfies Record<string, Scene>;
export type SceneId = keyof typeof SCENES;

export const isSceneId = (id: string): id is SceneId => Object.prototype.hasOwnProperty.call(SCENES, id);
export const sceneById = (id: string): Scene | undefined => (isSceneId(id) ? SCENES[id] : undefined);
