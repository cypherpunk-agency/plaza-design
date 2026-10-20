import type {FolderSceneSource} from '../engine/gameplay/folder-scene';
import towerComposition from './tower/composition.json';
import towerScene from './tower/scene.json';
import towerGameplay from './tower/gameplay.json';
import towerDevices from './tower/devices.json';
import warehouseComposition from './warehouse/composition.json';
import warehouseScene from './warehouse/scene.json';
import warehouseGameplay from './warehouse/gameplay.json';
import warehouseDevices from './warehouse/devices.json';
import shopComposition from './shop/composition.json';
import shopScene from './shop/scene.json';
import shopGameplay from './shop/gameplay.json';
import shopDevices from './shop/devices.json';
import libraryComposition from './library/composition.json';
import libraryScene from './library/scene.json';
import libraryGameplay from './library/gameplay.json';
import libraryDevices from './library/devices.json';
import mallComposition from './mall/composition.json';
import mallScene from './mall/scene.json';
import mallGameplay from './mall/gameplay.json';
import mallDevices from './mall/devices.json';
import harborShiftComposition from './harbor-shift/composition.json';
import harborShiftScene from './harbor-shift/scene.json';
import harborShiftGameplay from './harbor-shift/gameplay.json';
import harborShiftDevices from './harbor-shift/devices.json';
import marketComposition from './market/composition.json';
import marketScene from './market/scene.json';
import marketGameplay from './market/gameplay.json';
import marketDevices from './market/devices.json';
import laundromatComposition from './laundromat/composition.json';
import laundromatScene from './laundromat/scene.json';
import laundromatGameplay from './laundromat/gameplay.json';
import laundromatDevices from './laundromat/devices.json';
import stacksComposition from './stacks/composition.json';
import stacksScene from './stacks/scene.json';
import stacksGameplay from './stacks/gameplay.json';
import stacksDevices from './stacks/devices.json';
import galleriaStationComposition from './galleriaStation/composition.json';
import galleriaStationScene from './galleriaStation/scene.json';
import galleriaStationGameplay from './galleriaStation/gameplay.json';
import galleriaStationDevices from './galleriaStation/devices.json';
import harborStationComposition from './harborStation/composition.json';
import harborStationScene from './harborStation/scene.json';
import harborStationGameplay from './harborStation/gameplay.json';
import harborStationDevices from './harborStation/devices.json';
import mothComposition from './moth/composition.json';
import mothScene from './moth/scene.json';
import mothGameplay from './moth/gameplay.json';
import mothDevices from './moth/devices.json';
import harborComposition from './harbor/composition.json';
import harborScene from './harbor/scene.json';
import harborGameplay from './harbor/gameplay.json';
import harborDevices from './harbor/devices.json';
import metroComposition from './metro/composition.json';
import metroScene from './metro/scene.json';
import metroGameplay from './metro/gameplay.json';
import metroDevices from './metro/devices.json';
import trainComposition from './train/composition.json';
import trainScene from './train/scene.json';
import trainGameplay from './train/gameplay.json';
import trainDevices from './train/devices.json';
/**
 * Scenes made of JSON only (engine/gameplay/folder-scene.ts): their folder holds the composition,
 * scene, gameplay and devices documents and nothing else. Moving a scene here from scenes/index.ts
 * is the migration: its TypeScript goes, the shared declared path builds it.
 */
export const FOLDER_SOURCES={
 tower:{composition:towerComposition,scene:towerScene,gameplay:towerGameplay,devices:towerDevices},
 warehouse:{composition:warehouseComposition,scene:warehouseScene,gameplay:warehouseGameplay,devices:warehouseDevices},
 shop:{composition:shopComposition,scene:shopScene,gameplay:shopGameplay,devices:shopDevices},
 library:{composition:libraryComposition,scene:libraryScene,gameplay:libraryGameplay,devices:libraryDevices},
 mall:{composition:mallComposition,scene:mallScene,gameplay:mallGameplay,devices:mallDevices},
 harborShift:{composition:harborShiftComposition,scene:harborShiftScene,gameplay:harborShiftGameplay,devices:harborShiftDevices},
 market:{composition:marketComposition,scene:marketScene,gameplay:marketGameplay,devices:marketDevices},
 laundromat:{composition:laundromatComposition,scene:laundromatScene,gameplay:laundromatGameplay,devices:laundromatDevices},
 stacks:{composition:stacksComposition,scene:stacksScene,gameplay:stacksGameplay,devices:stacksDevices},
 galleriaStation:{composition:galleriaStationComposition,scene:galleriaStationScene,gameplay:galleriaStationGameplay,devices:galleriaStationDevices},
 harborStation:{composition:harborStationComposition,scene:harborStationScene,gameplay:harborStationGameplay,devices:harborStationDevices},
 moth:{composition:mothComposition,scene:mothScene,gameplay:mothGameplay,devices:mothDevices},
 harbor:{composition:harborComposition,scene:harborScene,gameplay:harborGameplay,devices:harborDevices},
 metro:{composition:metroComposition,scene:metroScene,gameplay:metroGameplay,devices:metroDevices},
 train:{composition:trainComposition,scene:trainScene,gameplay:trainGameplay,devices:trainDevices},
} satisfies Record<string,FolderSceneSource>;
/** Folder scenes whose directory is not their scene id (document ids and files use the directory name). */
export const FOLDER_DIRS:Readonly<Record<string,string>>={harborShift:'harbor-shift'};
/** The same sources by any scene id (undefined for scenes that still have code). */
export const FOLDER_BY_ID:Readonly<Record<string,FolderSceneSource>>=FOLDER_SOURCES;
