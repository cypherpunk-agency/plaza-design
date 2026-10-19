import type {Composition} from '../art/core/composition';
import type {SceneDef} from '../scenes/kit';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {NativeTargetValidationContext} from '../engine/gameplay/native-targets';
import {applyDeviceSource,deviceDocumentId} from './device-sources';
import {pendingNetworkContext} from './pending-network';
/** Preview assembly keeps native geometry/render options while resolving foreign references
 * only after the pending device and network documents have been assembled. */
export function pendingNativeTargetScene(id:string,composition:Composition,documents:ReadonlyMap<string,unknown>,content:{validateGameplay:(value:unknown)=>GameplayDefinition;validateScene:(value:unknown,gameplay:GameplayDefinition,context?:NativeTargetValidationContext)=>SceneDocument},build:(source:SceneDocument,gameplay:GameplayDefinition,context:NativeTargetValidationContext)=>SceneDef){
 const gameplay=content.validateGameplay(documents.get(id+'-gameplay')),context:NativeTargetValidationContext={phase:'structural'},source=content.validateScene(documents.get(id+'-scene'),gameplay,context),network=pendingNetworkContext(documents),original=build(source,gameplay,context),devices=documents.get(deviceDocumentId(id));
 const scene=devices===undefined?original:applyDeviceSource(id,original,composition,devices,network,source);
 content.validateScene(source,gameplay,{phase:'assembled',data:scene.data!,network});
 return scene;
}
