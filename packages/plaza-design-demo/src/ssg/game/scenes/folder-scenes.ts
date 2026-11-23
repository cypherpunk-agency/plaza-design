import type { SceneSource } from '../engine/gameplay/folder-scene';
import downtownComposition from './downtown/composition.json';
import downtownScene from './downtown/scene.json';
import downtownGameplay from './downtown/gameplay.json';
import downtownDevices from './downtown/devices.json';
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
import sandboxComposition from './sandbox/composition.json';
import sandboxScene from './sandbox/scene.json';
import sandboxGameplay from './sandbox/gameplay.json';
import sandboxDevices from './sandbox/devices.json';
import yardComposition from './yard/composition.json';
import yardScene from './yard/scene.json';
import yardGameplay from './yard/gameplay.json';
import yardDevices from './yard/devices.json';
import capsuleComposition from './capsule/composition.json';
import capsuleScene from './capsule/scene.json';
import capsuleGameplay from './capsule/gameplay.json';
import capsuleDevices from './capsule/devices.json';
import beachComposition from './beach/composition.json';
import beachScene from './beach/scene.json';
import beachGameplay from './beach/gameplay.json';
import beachDevices from './beach/devices.json';
import metroComposition from './metro/composition.json';
import metroScene from './metro/scene.json';
import metroGameplay from './metro/gameplay.json';
import metroDevices from './metro/devices.json';
import trainComposition from './train/composition.json';
import trainScene from './train/scene.json';
import trainGameplay from './train/gameplay.json';
import trainDevices from './train/devices.json';
import block7Composition from './block7/composition.json';
import block7Scene from './block7/scene.json';
import block7Gameplay from './block7/gameplay.json';
import block7Devices from './block7/devices.json';
import registryComposition from './registry/composition.json';
import registryScene from './registry/scene.json';
import registryGameplay from './registry/gameplay.json';
import registryDevices from './registry/devices.json';
import kesselComposition from './kessel/composition.json';
import kesselScene from './kessel/scene.json';
import kesselGameplay from './kessel/gameplay.json';
import kesselDevices from './kessel/devices.json';
import freshcoComposition from './freshco/composition.json';
import freshcoScene from './freshco/scene.json';
import freshcoGameplay from './freshco/gameplay.json';
import freshcoDevices from './freshco/devices.json';
import walkupComposition from './walkup/composition.json';
import walkupScene from './walkup/scene.json';
import walkupGameplay from './walkup/gameplay.json';
import walkupDevices from './walkup/devices.json';
/**
 * Scenes made of JSON only (engine/gameplay/folder-scene.ts): their folder holds the composition,
 * scene, gameplay and devices documents and nothing else. Moving a scene here from scenes/index.ts
 * is the migration: its TypeScript goes, the shared declared path builds it.
 */
export const FOLDER_SOURCES = {
  downtown: {
    composition: downtownComposition,
    scene: downtownScene,
    gameplay: downtownGameplay,
    devices: downtownDevices,
  },
  tower: {
    composition: towerComposition,
    scene: towerScene,
    gameplay: towerGameplay,
    devices: towerDevices,
  },
  warehouse: {
    composition: warehouseComposition,
    scene: warehouseScene,
    gameplay: warehouseGameplay,
    devices: warehouseDevices,
  },
  shop: {
    composition: shopComposition,
    scene: shopScene,
    gameplay: shopGameplay,
    devices: shopDevices,
  },
  library: {
    composition: libraryComposition,
    scene: libraryScene,
    gameplay: libraryGameplay,
    devices: libraryDevices,
  },
  mall: {
    composition: mallComposition,
    scene: mallScene,
    gameplay: mallGameplay,
    devices: mallDevices,
  },
  market: {
    composition: marketComposition,
    scene: marketScene,
    gameplay: marketGameplay,
    devices: marketDevices,
  },
  laundromat: {
    composition: laundromatComposition,
    scene: laundromatScene,
    gameplay: laundromatGameplay,
    devices: laundromatDevices,
  },
  stacks: {
    composition: stacksComposition,
    scene: stacksScene,
    gameplay: stacksGameplay,
    devices: stacksDevices,
  },
  galleriaStation: {
    composition: galleriaStationComposition,
    scene: galleriaStationScene,
    gameplay: galleriaStationGameplay,
    devices: galleriaStationDevices,
  },
  harborStation: {
    composition: harborStationComposition,
    scene: harborStationScene,
    gameplay: harborStationGameplay,
    devices: harborStationDevices,
  },
  moth: {
    composition: mothComposition,
    scene: mothScene,
    gameplay: mothGameplay,
    devices: mothDevices,
  },
  harbor: {
    composition: harborComposition,
    scene: harborScene,
    gameplay: harborGameplay,
    devices: harborDevices,
  },
  sandbox: {
    composition: sandboxComposition,
    scene: sandboxScene,
    gameplay: sandboxGameplay,
    devices: sandboxDevices,
  },
  yard: {
    composition: yardComposition,
    scene: yardScene,
    gameplay: yardGameplay,
    devices: yardDevices,
  },
  capsule: {
    composition: capsuleComposition,
    scene: capsuleScene,
    gameplay: capsuleGameplay,
    devices: capsuleDevices,
  },
  beach: {
    composition: beachComposition,
    scene: beachScene,
    gameplay: beachGameplay,
    devices: beachDevices,
  },
  metro: {
    composition: metroComposition,
    scene: metroScene,
    gameplay: metroGameplay,
    devices: metroDevices,
  },
  train: {
    composition: trainComposition,
    scene: trainScene,
    gameplay: trainGameplay,
    devices: trainDevices,
  },
  block7: {
    composition: block7Composition,
    scene: block7Scene,
    gameplay: block7Gameplay,
    devices: block7Devices,
  },
  registry: {
    composition: registryComposition,
    scene: registryScene,
    gameplay: registryGameplay,
    devices: registryDevices,
  },
  kessel: {
    composition: kesselComposition,
    scene: kesselScene,
    gameplay: kesselGameplay,
    devices: kesselDevices,
  },
  freshco: {
    composition: freshcoComposition,
    scene: freshcoScene,
    gameplay: freshcoGameplay,
    devices: freshcoDevices,
  },
  walkup: {
    composition: walkupComposition,
    scene: walkupScene,
    gameplay: walkupGameplay,
    devices: walkupDevices,
  },
} satisfies Record<string, SceneSource>;
/** Folder scenes whose directory is not their scene id (document ids and files use the directory name). */
export const FOLDER_DIRS: Readonly<Record<string, string>> = {};
/** The same sources by any scene id (undefined for scenes that still have code). */
export const FOLDER_BY_ID: Readonly<Record<string, SceneSource>> = FOLDER_SOURCES;
