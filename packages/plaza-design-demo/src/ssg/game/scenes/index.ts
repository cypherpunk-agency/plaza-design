/**
 * Every scene, by id: every place in the game is one (city.ts says which
 * place each belongs to). `?play=<id>` starts in one, and sudo's LEVELS lists
 * them in this order. Most are walkable scenery with people, things to use
 * and read, and ways out; the ones with devices bring their data file and
 * rules (each scene's folder). Scenes are JSON documents;
 * what they need beyond the shared features is a registered mechanism.
 */

import type { SceneDef } from './kit';
import authored from './authored.json';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {folderSceneDefinition} from '../engine/gameplay/folder-scene';
import {FOLDER_SOURCES} from './folder-scenes';

export type { ItemId, SceneDef, SceneExit, SceneReadable, SceneRest, SceneSaid, SceneUse, UseCtx, View as SceneView } from './kit';
export { ITEMS, priceTag } from './kit';

/** Every scene is a folder scene: JSON only, built by the shared declared path (folder-scenes.ts); what a scene needs beyond the shared features is a registered mechanism its data names. */
export const NATIVE_SCENES=Object.fromEntries(Object.entries(FOLDER_SOURCES).map(([id,source])=>[id,folderSceneDefinition(id,source)])) as Record<keyof typeof FOLDER_SOURCES,SceneDef>;
/** Scenes that have no code: the folder scenes. */
export const FOLDER_SCENE_IDS=Object.keys(FOLDER_SOURCES);
export const SCENES=createSceneRegistry(NATIVE_SCENES,authored);
export type SceneId = keyof typeof NATIVE_SCENES | (string & {readonly __sceneId:unique symbol});

export const isSceneId = (id: string): id is SceneId => Object.prototype.hasOwnProperty.call(SCENES, id);
export const sceneById = (id: string): SceneDef | undefined => (isSceneId(id) ? SCENES[id] : undefined);
/** A scene's name in capitals, as the HUD, the menu and the slots show it: BACK YARD, CAPSULE 7B. */
export const sceneTitle = (s: SceneDef) => s.name.replace(/^the /i, '').toUpperCase();
