import {FOLDER_SOURCES} from './folder-scenes';
import {emptyDeviceSource} from '../engine/empty-data';
import type {SceneData} from '../data/types';import type {Composition} from '../art';import type {SceneDocument} from '../engine/gameplay/scene-document';
import s0data from './capsule/devices.json';
import s0art from './capsule/composition.json';
import s0scene from './capsule/scene.json';
import s1data from './downtown/devices.json';
import s1art from './downtown/composition.json';
import s1scene from './downtown/scene.json';
import s2data from './library/devices.json';
import s2art from './library/composition.json';
import s2scene from './library/scene.json';
import s3data from './yard/devices.json';
import s3art from './yard/composition.json';
import s3scene from './yard/scene.json';
import s4data from './moth/devices.json';
import s4art from './moth/composition.json';
import s4scene from './moth/scene.json';
import s5data from './beach/devices.json';
import s5art from './beach/composition.json';
import s5scene from './beach/scene.json';
import s6data from './harbor/devices.json';
import s6art from './harbor/composition.json';
import s6scene from './harbor/scene.json';
import s7data from './stacks/devices.json';
import s7art from './stacks/composition.json';
import s7scene from './stacks/scene.json';
import s8data from './warehouse/devices.json';
import s8art from './warehouse/composition.json';
import s8scene from './warehouse/scene.json';
import s9data from './market/devices.json';
import s9art from './market/composition.json';
import s9scene from './market/scene.json';
import s10data from './laundromat/devices.json';
import s10art from './laundromat/composition.json';
import s10scene from './laundromat/scene.json';
import s11data from './shop/devices.json';
import s11art from './shop/composition.json';
import s11scene from './shop/scene.json';
import s12data from './mall/devices.json';
import s12art from './mall/composition.json';
import s12scene from './mall/scene.json';
import s13data from './metro/devices.json';
import s13art from './metro/composition.json';
import s13scene from './metro/scene.json';
import s14data from './galleriaStation/devices.json';
import s14art from './galleriaStation/composition.json';
import s14scene from './galleriaStation/scene.json';
import s15data from './harborStation/devices.json';
import s15art from './harborStation/composition.json';
import s15scene from './harborStation/scene.json';
import s16data from './train/devices.json';
import s16art from './train/composition.json';
import s16scene from './train/scene.json';
import s17data from './sandbox/devices.json';
import s17art from './sandbox/composition.json';
import s17scene from './sandbox/scene.json';
import s18data from './harbor-shift/devices.json';
import s18art from './harbor-shift/composition.json';
import s18scene from './harbor-shift/scene.json';
/** Plain authored JSON inputs; no scene constructors or authoring dependencies. */
export const nativeDeviceSources:Record<string,{devices:SceneData;composition:Composition;scene:SceneDocument}>={
 capsule:{devices:s0data as unknown as SceneData,composition:s0art as unknown as Composition,scene:s0scene as unknown as SceneDocument},
 downtown:{devices:s1data as unknown as SceneData,composition:s1art as unknown as Composition,scene:s1scene as unknown as SceneDocument},
 library:{devices:s2data as unknown as SceneData,composition:s2art as unknown as Composition,scene:s2scene as unknown as SceneDocument},
 yard:{devices:s3data as unknown as SceneData,composition:s3art as unknown as Composition,scene:s3scene as unknown as SceneDocument},
 moth:{devices:s4data as unknown as SceneData,composition:s4art as unknown as Composition,scene:s4scene as unknown as SceneDocument},
 beach:{devices:s5data as unknown as SceneData,composition:s5art as unknown as Composition,scene:s5scene as unknown as SceneDocument},
 harbor:{devices:s6data as unknown as SceneData,composition:s6art as unknown as Composition,scene:s6scene as unknown as SceneDocument},
 stacks:{devices:s7data as unknown as SceneData,composition:s7art as unknown as Composition,scene:s7scene as unknown as SceneDocument},
 warehouse:{devices:s8data as unknown as SceneData,composition:s8art as unknown as Composition,scene:s8scene as unknown as SceneDocument},
 market:{devices:s9data as unknown as SceneData,composition:s9art as unknown as Composition,scene:s9scene as unknown as SceneDocument},
 laundromat:{devices:s10data as unknown as SceneData,composition:s10art as unknown as Composition,scene:s10scene as unknown as SceneDocument},
 shop:{devices:s11data as unknown as SceneData,composition:s11art as unknown as Composition,scene:s11scene as unknown as SceneDocument},
 mall:{devices:s12data as unknown as SceneData,composition:s12art as unknown as Composition,scene:s12scene as unknown as SceneDocument},
 metro:{devices:s13data as unknown as SceneData,composition:s13art as unknown as Composition,scene:s13scene as unknown as SceneDocument},
 galleriaStation:{devices:s14data as unknown as SceneData,composition:s14art as unknown as Composition,scene:s14scene as unknown as SceneDocument},
 harborStation:{devices:s15data as unknown as SceneData,composition:s15art as unknown as Composition,scene:s15scene as unknown as SceneDocument},
 train:{devices:s16data as unknown as SceneData,composition:s16art as unknown as Composition,scene:s16scene as unknown as SceneDocument},
 sandbox:{devices:s17data as unknown as SceneData,composition:s17art as unknown as Composition,scene:s17scene as unknown as SceneDocument},
 harborShift:{devices:s18data as unknown as SceneData,composition:s18art as unknown as Composition,scene:s18scene as unknown as SceneDocument},
 // folder scenes (folder-scenes.ts) keep the same three documents in their folder
 ...Object.fromEntries(Object.entries(FOLDER_SOURCES).map(([id,f])=>[id,{devices:(f.devices??emptyDeviceSource(id,(f.scene as SceneDocument).name)) as unknown as SceneData,composition:f.composition as Composition,scene:f.scene as SceneDocument}])),
};
