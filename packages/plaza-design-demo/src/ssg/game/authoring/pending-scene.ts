import type {SceneDef} from '../scenes/kit';
import {isValidationContext} from './validation-snapshot';
import type {NativeTargetValidationContext} from '../engine/gameplay/native-targets';
import type {EngineNetworkContext} from '../engine/network-context';
import {defaultNetworkContext} from '../engine/network-context';
import {validateExitKeyReferences} from '../world/access';
import type {SceneData} from '../data';
import {applyDeviceSource,deviceSceneIds} from './device-sources';
import type {Composition} from '../art/core/composition';
/** Single assembly path for private Play snapshots; never reads player storage. */
import {gameplayScenes} from './gameplay-scenes';
import {nativeGameplayScene} from './native-gameplay-scenes';
import {nativeSceneAdapters} from './scene-adapters';

function buildPendingScene(id:string,composition:unknown,content:{gameplay?:unknown;sceneDocument?:unknown;behavior?:unknown;devices?:unknown}){
 const structural:NativeTargetValidationContext={phase:'structural'};
 const authored=gameplayScenes.find(s=>s.id===id)??nativeGameplayScene(id);
 if(authored){const gameplay=authored.validateGameplay(content.gameplay);if('definitionWithDevices'in authored)return authored.definitionWithDevices(composition as Composition,{},{},authored.validateScene(content.sceneDocument,gameplay,structural),gameplay,(content.devices??content.behavior) as SceneData|undefined,structural);return 'validateScene'in authored?(authored.definition as (...args:unknown[])=>SceneDef)(composition,{},{},(authored.validateScene as (...args:unknown[])=>unknown)(content.sceneDocument,gameplay,structural),gameplay,structural):authored.definition(composition as Parameters<typeof authored.definition>[0],gameplay);}
 const native=nativeSceneAdapters[id];if(!native)throw new Error('Unknown Play scene '+id);
 return native.definition(native.validate(composition),{},{reduced:false});
}

function assemblePendingScene(id:string,composition:unknown,content:Parameters<typeof buildPendingScene>[2],network?:EngineNetworkContext){const scene=buildPendingScene(id,composition,content);const devices=content.devices??(id==='sandbox'?content.behavior:undefined);const result=devices!==undefined&&deviceSceneIds.includes(id)?applyDeviceSource(id,scene,composition as Composition,devices,network,content.sceneDocument as import('../engine/gameplay/scene-document').SceneDocument):scene;const registration=gameplayScenes.find(s=>s.id===id)??nativeGameplayScene(id);if(registration&&'validateScene'in registration&&content.sceneDocument!==undefined){const assembledNetwork=network??{...defaultNetworkContext,keyring:new Map([...defaultNetworkContext.keyring,...(result.data?.keyring??[]).map(key=>[key.id,key] as const)])};registration.validateScene(content.sceneDocument,registration.validateGameplay(content.gameplay),{phase:'assembled',data:result.data!,network:assembledNetwork});}validateExitKeyReferences(result,network?.keyring??new Map([...defaultNetworkContext.keyring,...(result.data?.keyring??[]).map(key=>[key.id,key] as const)]));return result;}

// Validation callbacks request the same assembled scene through device, scene, city and registry
// checks. Reuse it only within that validation context and only for identical input identities.
const validationScenes = new WeakMap<EngineNetworkContext, Map<string, { inputs: unknown[]; scene: ReturnType<typeof assemblePendingScene> }>>();
export function pendingScene(id: string, composition: unknown, content: Parameters<typeof buildPendingScene>[2], network?: EngineNetworkContext) {
 if (!network || !isValidationContext(network)) return assemblePendingScene(id, composition, content, network);
 let cache = validationScenes.get(network); if (!cache) { cache = new Map(); validationScenes.set(network, cache); }
 const inputs = [composition, content.gameplay, content.sceneDocument, content.devices, content.behavior], previous = cache.get(id);
 if (previous && inputs.every((value, index) => value === previous.inputs[index])) return previous.scene;
 const scene = assemblePendingScene(id, composition, content, network); cache.set(id, { inputs, scene }); return scene;
}
