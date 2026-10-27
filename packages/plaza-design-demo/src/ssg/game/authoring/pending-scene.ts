import {isValidationContext} from './validation-snapshot';
import type {NativeTargetValidationContext} from '../engine/gameplay/native-targets';
import type {EngineNetworkContext} from '../engine/network-context';
import {defaultNetworkContext} from '../engine/network-context';
import {validateExitKeyReferences} from '../world/access';
import {applyDeviceSource,deviceSceneIds} from './device-sources';
import type {ChunkDocument} from '../art/core/composition';
/** Single assembly path for private Play snapshots; never reads player storage. */
import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {nativeGameplayScene} from './native-gameplay-scenes';

interface PendingSceneContent {gameplay?:unknown;sceneDocument?:unknown;devices?:unknown;sharedState?:unknown;catalogue?:unknown}
function assemblePendingScene(id:string,composition:unknown,content:PendingSceneContent,network?:EngineNetworkContext){
 const structural:NativeTargetValidationContext={phase:'structural'},registration=gameplayScenes.find(s=>s.id===id)??nativeGameplayScene(id)??(content.catalogue?gameplayScene(id,[{id:'authored-scenes',value:content.catalogue}]):undefined);
 if(!registration)throw new Error('Unknown Play scene '+id);
 const gameplay=registration.validateGameplay(content.gameplay,content.sharedState);
 const sceneDocument='validateScene'in registration?registration.validateScene(content.sceneDocument,gameplay,structural):undefined;
 const scene=registration.build({composition:composition as ChunkDocument,gameplay,scene:sceneDocument,devices:content.devices,context:structural,network,sharedState:content.sharedState});
 const result=content.devices!==undefined&&deviceSceneIds.includes(id)?applyDeviceSource(id,scene,composition as ChunkDocument,content.devices,network,sceneDocument):scene;
 const assembledNetwork=network??{...defaultNetworkContext,keyring:new Map([...defaultNetworkContext.keyring,...(result.data?.keyring??[]).map(key=>[key.id,key] as const)])};
 if(sceneDocument&&'validateScene'in registration)registration.validateScene(sceneDocument,gameplay,{phase:'assembled',data:result.data!,network:assembledNetwork});
 validateExitKeyReferences(result,assembledNetwork.keyring);return result;
}

// Validation callbacks request the same assembled scene through device, scene, city and registry
// checks. Reuse it only within that validation context and only for identical input identities.
const validationScenes = new WeakMap<EngineNetworkContext, Map<string, { inputs: unknown[]; scene: ReturnType<typeof assemblePendingScene> }>>();
export function pendingScene(id: string, composition: unknown, content: PendingSceneContent, network?: EngineNetworkContext) {
 if (!network || !isValidationContext(network)) return assemblePendingScene(id, composition, content, network);
 let cache = validationScenes.get(network); if (!cache) { cache = new Map(); validationScenes.set(network, cache); }
 const inputs = [composition, content.gameplay, content.sceneDocument, content.devices, content.sharedState, content.catalogue], previous = cache.get(id);
 if (previous && inputs.every((value, index) => value === previous.inputs[index])) return previous.scene;
 const scene = assemblePendingScene(id, composition, content, network); cache.set(id, { inputs, scene }); return scene;
}
