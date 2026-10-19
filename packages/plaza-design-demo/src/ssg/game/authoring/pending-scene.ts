import type {EngineNetworkContext} from '../engine/network-context';
import {SANDBOX,type SceneData} from '../data';
import {applyDeviceSource,deviceSceneIds} from './device-sources';
import type {Composition} from '../art/core/composition';
/** Single assembly path for private Play snapshots; never reads player storage. */
import {gameplayScenes} from './gameplay-scenes';
import {nativeGameplayScene} from './native-gameplay-scenes';
import {nativeSceneAdapters} from './scene-adapters';
import {sandboxScene,validateSandboxComposition} from '../scenes/sandbox';

function buildPendingScene(id:string,composition:unknown,content:{gameplay?:unknown;sceneDocument?:unknown;behavior?:unknown;devices?:unknown}){
 const authored=gameplayScenes.find(s=>s.id===id)??nativeGameplayScene(id);
 if(id==='sandbox'){
  const registered=gameplayScenes.find(s=>s.id==='sandbox')!,gameplay=registered.validateGameplay(content.gameplay);
  return sandboxScene(validateSandboxComposition(composition),{},{},undefined,registered.validateScene(content.sceneDocument,gameplay),gameplay);
 }
 if(authored){const gameplay=authored.validateGameplay(content.gameplay);return 'validateScene'in authored?authored.definition(composition as Parameters<typeof authored.definition>[0],{},{},authored.validateScene(content.sceneDocument,gameplay),gameplay):authored.definition(composition as Parameters<typeof authored.definition>[0],gameplay);}
 const native=nativeSceneAdapters[id];if(!native)throw new Error('Unknown Play scene '+id);
 return native.definition(native.validate(composition),{},{reduced:false});
}

export function pendingScene(id:string,composition:unknown,content:Parameters<typeof buildPendingScene>[2],network?:EngineNetworkContext){const scene=buildPendingScene(id,composition,content);let devices=content.devices??(id==='sandbox'?content.behavior:undefined);if(id==='sandbox'&&content.devices===undefined&&devices&&typeof devices==='object'){const legacy=devices as SceneData;if(JSON.stringify(legacy.dialogue)===JSON.stringify(SANDBOX.dialogue))devices={...legacy,dialogue:{}};}return devices!==undefined&&deviceSceneIds.includes(id)?applyDeviceSource(id,scene,composition as Composition,devices,network,content.sceneDocument as import('../engine/gameplay/scene-document').SceneDocument):scene;}
