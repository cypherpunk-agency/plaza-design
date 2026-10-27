import harborStationGameplay from '../scenes/harborStation/gameplay.json';
import galleriaStationGameplay from '../scenes/galleriaStation/gameplay.json';
import metroGameplay from '../scenes/metro/gameplay.json';
import mallGameplay from '../scenes/mall/gameplay.json';
import shopGameplay from '../scenes/shop/gameplay.json';
import marketGameplay from '../scenes/market/gameplay.json';
import warehouseGameplay from '../scenes/warehouse/gameplay.json';
import harborGameplay from '../scenes/harbor/gameplay.json';
import trainGameplay from '../scenes/train/gameplay.json';
import mothGameplay from '../scenes/moth/gameplay.json';
import downtownGameplay from '../scenes/downtown/gameplay.json';
import {projectSceneState} from '../engine/gameplay/scene-state';
import authoredDeviceSource from '../scenes/authored.json';
import harborDeviceJson from '../scenes/harbor/devices.json';
import warehouseDeviceJson from '../scenes/warehouse/devices.json';
import marketDeviceJson from '../scenes/market/devices.json';
import shopDeviceJson from '../scenes/shop/devices.json';
import mallDeviceJson from '../scenes/mall/devices.json';
import metroDeviceJson from '../scenes/metro/devices.json';
import galleriaStationDeviceJson from '../scenes/galleriaStation/devices.json';
import harborStationDeviceJson from '../scenes/harborStation/devices.json';
import beachGameplay from '../scenes/beach/gameplay.json';
import stacksGameplay from '../scenes/stacks/gameplay.json';
import laundromatGameplay from '../scenes/laundromat/gameplay.json';
import yardGameplay from '../scenes/yard/gameplay.json';
import sandboxGameplay from '../scenes/sandbox/gameplay.json';
import capsuleGameplay from '../scenes/capsule/gameplay.json';
import {projectNativeDeviceData} from '../engine/gameplay/native-bindings';
import type {GameplayDefinition} from '../engine/gameplay/types';
import libraryGameplay from '../scenes/library/gameplay.json';
import {nativeDeviceDialogues} from '../engine/gameplay/native-dialogue';
import {validateGameplay} from '../engine/gameplay/validation';
/**
 * The game's data files, bundled into the page by esbuild (no fetches: the
 * page runs under `default-src 'self'` and should work from one file).
 *
 * The assignments to `Loose<…>` are the type-check half of validation;
 * check.ts is the build-time half (see GAME-DATA.md).
 */

import type { EngineData, KeyItem, LogicData, Loose, NetData, SceneData } from './types';
import engineJson from './engine.json';
import logicJson from './logic.json';
import netJson from './net.json';
import downtownJson from "../scenes/downtown/devices.json";
import yardJson from "../scenes/yard/devices.json";
import capsuleJson from "../scenes/capsule/devices.json";
import mothJson from "../scenes/moth/devices.json";
import beachJson from "../scenes/beach/devices.json";
import trainJson from "../scenes/train/devices.json";
import laundromatJson from "../scenes/laundromat/devices.json";
import stacksJson from "../scenes/stacks/devices.json";
import libraryJson from "../scenes/library/devices.json";
import sandboxJson from "../scenes/sandbox/devices.json";

/** Initial catalog projection; complete native refs validate with the actual rules in scene assembly. */
const catalogDeviceData=(data:SceneData,gameplay:GameplayDefinition)=>projectNativeDeviceData(projectSceneState(data,gameplay),gameplay);
const yardDefinition=validateGameplay(yardGameplay);
const yard: Loose<SceneData> = catalogDeviceData({...yardJson,dialogue:nativeDeviceDialogues(yardDefinition,yardJson as unknown as SceneData)} as unknown as SceneData,yardDefinition);
const capsuleDefinition=validateGameplay(capsuleGameplay);
const capsule: Loose<SceneData> = catalogDeviceData({...capsuleJson,dialogue:nativeDeviceDialogues(capsuleDefinition,capsuleJson as unknown as SceneData)} as unknown as SceneData,capsuleDefinition);
const moth: Loose<SceneData> = projectSceneState({...mothJson,dialogue:nativeDeviceDialogues(validateGameplay(mothGameplay),mothJson as unknown as SceneData)} as unknown as SceneData,validateGameplay(mothGameplay));
const beach: Loose<SceneData> = catalogDeviceData({...beachJson,dialogue:nativeDeviceDialogues(validateGameplay(beachGameplay),beachJson as unknown as SceneData)} as unknown as SceneData,validateGameplay(beachGameplay));
const laundromatDefinition=validateGameplay(laundromatGameplay);
const laundromat: Loose<SceneData> = {...projectSceneState(laundromatJson as unknown as SceneData,laundromatDefinition),dialogue:nativeDeviceDialogues(laundromatDefinition,laundromatJson as unknown as SceneData)};
const downtown: Loose<SceneData> = projectSceneState(downtownJson as unknown as SceneData,validateGameplay(downtownGameplay));
const logic: Loose<LogicData> = logicJson;
const net: Loose<NetData> = netJson;
const engine: Loose<EngineData> = engineJson;

/** The back yard. Checked by check.ts at build time, so the cast is safe. */
export const YARD = yard as SceneData;

/** Capsule 7B, the player's flat: where the game starts. */
export const CAPSULE = capsule as SceneData;

/** Moth's place, flat 4C (story Level 3): FRIENDNET, MOTH-PC and the journal's song seal. */
export const MOTH = moth as SceneData;

/** The beach and SALT, its bar: a real beach west of the harbor, with Moth's boat at the end of the pier. */
export const BEACH = beach as SceneData;

/** The laundromat in the Neon Market (P13 Washer 3): four washers on one breaker, the schedule, SUDS, Moth's jacket. */
export const LAUNDROMAT = laundromat as SceneData;

/** Downtown, the first street (and the scene the old terminal saves belong to). */
export const DOWNTOWN = downtown as SceneData;

/** The metro car: TRAIN-0's emergency panel (P14, the stop that isn't on the map). */
const train: Loose<SceneData> = projectSceneState(trainJson as unknown as SceneData,validateGameplay(trainGameplay));
export const TRAIN = train as SceneData;

/** The stacks at the harbor (P15 NRLU 404 0451, the end of Act I): STS-2, the thermal gate, the night ferry, the reefer, the watchdog. */
const stacksDefinition=validateGameplay(stacksGameplay);
const stacks: Loose<SceneData> = {...projectSceneState(stacksJson as unknown as SceneData,stacksDefinition),dialogue:nativeDeviceDialogues(stacksDefinition,stacksJson as unknown as SceneData)};
export const STACKS = stacks as SceneData;

/** The public library (P16 Long overdue): the card reader, the session timer, the printer, the LIBRARY LAN's nodes, scan.so. */
const library: Loose<SceneData> = {...projectSceneState(libraryJson as unknown as SceneData,validateGameplay(libraryGameplay)),dialogue:nativeDeviceDialogues(validateGameplay(libraryGameplay),libraryJson as unknown as SceneData)};
export const LIBRARY = library as SceneData;

/** The sandbox (sudo only): REGISTRY QA BAY 3, one bench per engine feature. */
const sandboxDefinition=validateGameplay(sandboxGameplay);
const sandbox: Loose<SceneData> = {...projectSceneState(sandboxJson as unknown as SceneData,sandboxDefinition),dialogue:nativeDeviceDialogues(sandboxDefinition,sandboxJson as unknown as SceneData)};
export const SANDBOX = sandbox as SceneData;

/** Canonical device catalogs include every native scene and data-only authored scene sources. */
export const SCENE_FILES: Record<string, SceneData> = { yard: YARD, capsule: CAPSULE, downtown: DOWNTOWN, moth: MOTH, beach: BEACH, laundromat: LAUNDROMAT,
  train: TRAIN, stacks: STACKS, library: LIBRARY, sandbox: SANDBOX,
  harbor: projectSceneState(harborDeviceJson as unknown as SceneData,validateGameplay(harborGameplay)), warehouse: projectSceneState(warehouseDeviceJson as unknown as SceneData,validateGameplay(warehouseGameplay)), market: projectSceneState(marketDeviceJson as unknown as SceneData,validateGameplay(marketGameplay)), shop: projectSceneState(shopDeviceJson as unknown as SceneData,validateGameplay(shopGameplay)), mall: projectSceneState(mallDeviceJson as unknown as SceneData,validateGameplay(mallGameplay)), metro: projectSceneState(metroDeviceJson as unknown as SceneData,validateGameplay(metroGameplay)), galleriaStation: projectSceneState(galleriaStationDeviceJson as unknown as SceneData,validateGameplay(galleriaStationGameplay)), harborStation: projectSceneState(harborStationDeviceJson as unknown as SceneData,validateGameplay(harborStationGameplay)),
  ...Object.fromEntries((authoredDeviceSource.scenes as unknown as {scene:{id:string};devices?:SceneData;gameplay:import('../engine/gameplay/types').GameplayDefinition}[]).flatMap(entry=>entry.devices?[[entry.scene.id,projectSceneState(entry.devices,entry.gameplay)]]:[])),
};

/** The logic modules (TIMER, SWITCH), shared by every scene. Checked like a scene. */
export const LOGIC = logic as LogicData;

/** The shared net: its networks (NET.md), the programs, and nodes any scene's LINK may reach. */
export const NET = net as NetData;

/** The engine's own wording; a scene's `texts` override it key by key. */
export const ENGINE = engine as EngineData;

/** Modules a new game owns (legs.so is not one of these: the save keeps it as `jump`). */
export const START_MODULES = LOGIC.modules.filter((m) => m.start).map((m) => m.id);

/** Every keyring item in the game, by id: the keyring travels across scenes, so any scene may meet any item. */
export const KEYRING: Map<string, KeyItem> = new Map(
  [...NET.keyring, ...Object.values(SCENE_FILES).flatMap((z) => z.keyring ?? [])].map((k) => [k.id, k]),
);

export type * from './types';
