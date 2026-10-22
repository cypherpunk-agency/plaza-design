import {FOLDER_SOURCES} from './folder-scenes';
import {emptyDeviceSource} from '../engine/empty-data';
import type {SceneData} from '../data/types';import type {Composition} from '../art';import type {SceneDocument} from '../engine/gameplay/scene-document';
/** Plain authored JSON inputs; no scene constructors or authoring dependencies. */
export const nativeDeviceSources:Record<string,{devices:SceneData;composition:Composition;scene:SceneDocument}>={
 // folder scenes (folder-scenes.ts) keep the same three documents in their folder
 ...Object.fromEntries(Object.entries(FOLDER_SOURCES).map(([id,f])=>[id,{devices:(f.devices??emptyDeviceSource(id,(f.scene as SceneDocument).name)) as unknown as SceneData,composition:f.composition as Composition,scene:f.scene as SceneDocument}])),
};
