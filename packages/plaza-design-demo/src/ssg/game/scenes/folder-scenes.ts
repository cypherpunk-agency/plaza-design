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
/**
 * Scenes made of JSON only (engine/gameplay/folder-scene.ts): their folder holds the composition,
 * scene, gameplay and devices documents and nothing else. Moving a scene here from scenes/index.ts
 * is the migration: its TypeScript goes, the shared declared path builds it.
 */
export const FOLDER_SOURCES={
 tower:{composition:towerComposition,scene:towerScene,gameplay:towerGameplay,devices:towerDevices},
 warehouse:{composition:warehouseComposition,scene:warehouseScene,gameplay:warehouseGameplay,devices:warehouseDevices},
 shop:{composition:shopComposition,scene:shopScene,gameplay:shopGameplay,devices:shopDevices},
} satisfies Record<string,FolderSceneSource>;
/** The same sources by any scene id (undefined for scenes that still have code). */
export const FOLDER_BY_ID:Readonly<Record<string,FolderSceneSource>>=FOLDER_SOURCES;
