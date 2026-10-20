import {attachSceneDeviceSource} from '../engine/gameplay/native-scene-devices';
import {nativeDeviceSources} from './native-device-sources';
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
import { moth } from "./moth/index";
import { stacks } from "./stacks/index";
import { yard } from "./yard/index";
import { sandbox } from "./sandbox/index";
import { harbor } from "./harbor/index";
import type { SceneDef } from './kit';
import { metro } from "./metro/index";
import { galleriaStation } from './galleriaStation/index';
import { harborStation } from './harborStation/index';
import { train } from "./train/index";
import authored from './authored.json';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {folderSceneDefinition} from '../engine/gameplay/folder-scene';
import {FOLDER_SOURCES} from './folder-scenes';

export type { ItemId, SceneDef, SceneExit, SceneReadable, SceneRest, SceneSaid, SceneUse, UseCtx, View as SceneView } from './kit';
export { ITEMS, priceTag } from './kit';

/** LINE 0's platforms are `metro` (Downtown's), `galleriaStation` and `harborStation`; `train` is the car you ride in. */
const nativeDefinitions = {
  capsule, downtown, yard, moth, beach, harbor, stacks, laundromat, metro, galleriaStation, harborStation, train,
  // sudo only (index.ts refuses `?play=sandbox` without `?sudo`): the engine's test bay, outside the story
  sandbox,
} satisfies Record<string, SceneDef>;
const codeScenes=Object.fromEntries(Object.entries(nativeDefinitions).map(([id,scene])=>{const source=nativeDeviceSources[id];if(!source)throw new Error('Missing native device source '+id);return[id,attachSceneDeviceSource(scene,source.devices,source.composition,source.scene)];})) as typeof nativeDefinitions;
/** Scenes of the repository: those still built by their own code, and folder scenes built from JSON alone (folder-scenes.ts). */
export const NATIVE_SCENES={...codeScenes,...Object.fromEntries(Object.entries(FOLDER_SOURCES).map(([id,source])=>[id,folderSceneDefinition(id,source)]))} as typeof nativeDefinitions&Record<keyof typeof FOLDER_SOURCES,SceneDef>;
/** Scenes that have no code: the folder scenes. */
export const FOLDER_SCENE_IDS=Object.keys(FOLDER_SOURCES);
export const SCENES=createSceneRegistry(NATIVE_SCENES,authored);
export type SceneId = keyof typeof NATIVE_SCENES | (string & {readonly __sceneId:unique symbol});

export const isSceneId = (id: string): id is SceneId => Object.prototype.hasOwnProperty.call(SCENES, id);
export const sceneById = (id: string): SceneDef | undefined => (isSceneId(id) ? SCENES[id] : undefined);
/** A scene's name in capitals, as the HUD, the menu and the slots show it: BACK YARD, CAPSULE 7B. */
export const sceneTitle = (s: SceneDef) => s.name.replace(/^the /i, '').toUpperCase();
