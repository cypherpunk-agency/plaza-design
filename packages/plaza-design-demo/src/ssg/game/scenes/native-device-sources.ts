import {FOLDER_SOURCES} from './folder-scenes';
import {emptyDeviceSource} from '../engine/empty-data';
import type {SceneData} from '../data/types';import type {Composition} from '../art';import type {SceneDocument} from '../engine/gameplay/scene-document';
import s0data from './capsule/devices.json';
import s0art from './capsule/composition.json';
import s0scene from './capsule/scene.json';
import s1data from './downtown/devices.json';
import s1art from './downtown/composition.json';
import s1scene from './downtown/scene.json';
import s5data from './beach/devices.json';
import s5art from './beach/composition.json';
import s5scene from './beach/scene.json';
import s13data from './metro/devices.json';
import s13art from './metro/composition.json';
import s13scene from './metro/scene.json';
import s16data from './train/devices.json';
import s16art from './train/composition.json';
import s16scene from './train/scene.json';
/** Plain authored JSON inputs; no scene constructors or authoring dependencies. */
export const nativeDeviceSources:Record<string,{devices:SceneData;composition:Composition;scene:SceneDocument}>={
 capsule:{devices:s0data as unknown as SceneData,composition:s0art as unknown as Composition,scene:s0scene as unknown as SceneDocument},
 downtown:{devices:s1data as unknown as SceneData,composition:s1art as unknown as Composition,scene:s1scene as unknown as SceneDocument},
 beach:{devices:s5data as unknown as SceneData,composition:s5art as unknown as Composition,scene:s5scene as unknown as SceneDocument},
 metro:{devices:s13data as unknown as SceneData,composition:s13art as unknown as Composition,scene:s13scene as unknown as SceneDocument},
 train:{devices:s16data as unknown as SceneData,composition:s16art as unknown as Composition,scene:s16scene as unknown as SceneDocument},
 // folder scenes (folder-scenes.ts) keep the same three documents in their folder
 ...Object.fromEntries(Object.entries(FOLDER_SOURCES).map(([id,f])=>[id,{devices:(f.devices??emptyDeviceSource(id,(f.scene as SceneDocument).name)) as unknown as SceneData,composition:f.composition as Composition,scene:f.scene as SceneDocument}])),
};
