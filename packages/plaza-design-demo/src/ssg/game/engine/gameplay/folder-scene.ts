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
import {art,resolveComposition,type Composition,type Environment} from '../../art';
import {frameView} from '../../art/core/view';
import {bindingDefaults} from './binding-sources';
import {mechanismsRulesShape} from './scene-mechanisms';
import type {SceneDef} from '../../scenes/kit';
/**
 * A folder scene: `scenes/<id>/` holds only JSON (composition, scene, gameplay, devices) and the
 * shared declared path (declared-scene.ts) builds it. No TypeScript of its own; what a scene needs
 * beyond the shared features is a registered mechanism its data names. scenes/folder-scenes.ts
 * lists them; the editor treats them like any scene with a folder.
 */
export interface FolderSceneSource {composition:unknown;scene:unknown;gameplay:unknown;devices?:unknown}
/** What the editor may swap in: a pending composition, scene, gameplay or devices document, and preview state. */
export interface FolderSceneOverrides {composition?:Composition;state?:Environment['state'];options?:Partial<Environment>;scene?:SceneDocument;gameplay?:GameplayDefinition;devices?:unknown;network?:EngineNetworkContext}
export function folderSceneDefinition(id:string,source:FolderSceneSource,over:FolderSceneOverrides={}):SceneDef{
 const gameplay=validateGameplay(over.gameplay??source.gameplay),scene=(over.scene??source.scene) as SceneDocument;
 if(scene.id!==id)throw new Error('Folder scene identity must remain '+id);
 const raw=over.devices??source.devices??emptyDeviceSource(id,scene.name);
 // devices that open a conversation (`open: talk`) read it from the scene's gameplay graphs
 const dialogue=opensTalk(raw)?nativeDeviceDialogues(gameplay,raw as SceneData):undefined;
 // a named mechanism's rules are part of the contract the device document is checked against
 const shape=mechanismsRulesShape(scene.stage?.mechanisms),checked=validateDeviceDocument(id,raw,{gameplay,network:over.network??defaultNetworkContext,...(dialogue?{dialogue}:{}),...(shape?{rules:shape}:{})});
 const devices=(dialogue?{...checked,dialogue:{...checked.dialogue,...dialogue}}:checked) as SceneDeviceSource;
 return declaredScene(scene,over.composition??source.composition,gameplay,{...(over.options??{}),...(over.state?{state:over.state}:{})},devices);
}
const opensTalk=(v:unknown):boolean=>!!v&&typeof v==='object'&&(Array.isArray(v)?v.some(opensTalk):(v as Record<string,unknown>).open==='talk'||Object.values(v).some(opensTalk));
/** A composition's artwork as placed (bindings at their defaults): what geometry checks and editors measure. */
export function compositionRows(composition:unknown){const doc=art.validate(composition);return resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false});}
