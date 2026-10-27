import {declaredScene} from './declared-scene';
import {validateGameplay} from './validation';
import {validateDeviceDocument} from './device-source-validation';
import {nativeDeviceDialogues} from './native-dialogue';
import type {SceneData} from '../../data/types';
import {emptyDeviceSource} from '../empty-data';
import {defaultNetworkContext,type EngineNetworkContext} from '../network-context';
import type {SceneDeviceSource} from './scene-state';
import type {SceneDocument} from './scene-document';
import type {GameplayDefinition} from './types';
import {art,resolveComposition,type ChunkDocument,type Environment} from '../../art';
import {frameView} from '../../art/core/view';
import {bindingDefaults} from './binding-sources';
import {mechanismsRulesShape} from './scene-mechanisms';
import type {SceneDef} from '../../scenes/kit';
/**
 * Compile a scene source bundle (folder, catalogue or a demo) through the declared path.
 * Inputs are composition, scene, gameplay and devices, with explicit pending network/shared declarations.
 * Physical primitives remain registered mechanisms named by source. The module also measures
 * source compositions; it owns no simulation, save values or preview state.
 */
export interface SceneSource {composition:unknown;scene:unknown;gameplay:unknown;devices?:unknown}
/** What the editor may swap in: a pending composition, scene, gameplay or devices document, and preview state. */
export interface SceneSourceOverrides {composition?:ChunkDocument;state?:Environment['state'];options?:Partial<Environment>;scene?:SceneDocument;gameplay?:GameplayDefinition;devices?:unknown;network?:EngineNetworkContext;sharedState?:unknown;
 /** `deferred`: pending editor devices are checked later against the pending network (pending-scene.ts applies them); only their shape is taken here. */
 deviceCheck?:'full'|'deferred'}
export function sceneSourceDefinition(id:string,source:SceneSource,over:SceneSourceOverrides={}):SceneDef{
 const gameplay=validateGameplay(over.gameplay??source.gameplay,over.sharedState),scene=(over.scene??source.scene) as SceneDocument;
 if(scene.id!==id)throw new Error('Scene source identity must remain '+id);
 const raw=over.devices??source.devices??emptyDeviceSource(id,scene.name);
 // devices that open a conversation (`open: talk`) read it from the scene's gameplay graphs
 const dialogue=nativeDeviceDialogues(gameplay,raw as SceneData);
 // a named mechanism's rules are part of the contract the device document is checked against
 const shape=mechanismsRulesShape(scene.stage?.mechanisms),checked=over.deviceCheck==='deferred'?structuredClone(raw) as SceneData:validateDeviceDocument(id,raw,{gameplay,network:over.network??defaultNetworkContext,dialogue,...(shape?{rules:shape}:{})});
 const devices={...checked,dialogue} as SceneDeviceSource;
 return declaredScene(scene,over.composition??source.composition,gameplay,{...(over.options??{}),...(over.state?{state:over.state}:{}),sharedState:over.sharedState},devices);
}

/** A composition's artwork as placed (bindings at their defaults): what geometry checks and editors measure. */
export function compositionRows(composition:unknown){const doc=art.validate(composition);return resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false});}
