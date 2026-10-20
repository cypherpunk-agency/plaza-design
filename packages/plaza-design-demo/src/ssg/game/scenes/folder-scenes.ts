import type {FolderSceneSource} from '../engine/gameplay/folder-scene';
import towerComposition from './tower/composition.json';
import towerScene from './tower/scene.json';
import towerGameplay from './tower/gameplay.json';
import towerDevices from './tower/devices.json';
/**
 * Scenes made of JSON only (engine/gameplay/folder-scene.ts): their folder holds the composition,
 * scene, gameplay and devices documents and nothing else. Moving a scene here from scenes/index.ts
 * is the migration: its TypeScript goes, the shared declared path builds it.
 */
export const FOLDER_SOURCES:Record<string,FolderSceneSource>={
 tower:{composition:towerComposition,scene:towerScene,gameplay:towerGameplay,devices:towerDevices},
};
