import {deviceSourceIdentity} from './device-document-ids';
import {validateExitKeyReferences} from '../world/access';
import {validateGameplayRewards,registryLabels} from '../engine/gameplay/rewards';
import {NET,type SceneData} from '../data';
import {NATIVE_SCENES,type SceneDef} from '../scenes';
import {createNetworkContext} from '../engine/network-context';
import {contractOf} from '../engine/rules';
import {deviceRules,deviceSceneIds,deviceDocumentId} from './device-sources';
import {validateNetworkShape,validateNetworkSource} from './network-source';
import {isValidationSnapshot,markValidationContext} from './validation-snapshot';
const validationNetworks = new WeakMap<ReadonlyMap<string,unknown>,ReturnType<typeof createNetworkContext>>();
let recentValidationNetwork:{inputs:unknown[];context:ReturnType<typeof createNetworkContext>}|undefined;
/** Resolve pending key metadata before validating scene references; semantic validation follows assembly. */
export function pendingNetworkContext(documents:ReadonlyMap<string,unknown>){
 const cached=isValidationSnapshot(documents)?validationNetworks.get(documents):undefined;if(cached)return cached;
 const rawNet=documents.get('network')??NET;
 const scenes=Object.entries(NATIVE_SCENES).flatMap(([id,scene])=>{
  const source=deviceSceneIds.includes(id)?documents.get(deviceDocumentId(id)):undefined;
  return source?[source as SceneData]:scene.data?[scene.data]:[];
 });
 const catalogue=documents.get('authored-scenes') as {scenes?:{devices?:SceneData}[]}|undefined;
 const authored=(catalogue?.scenes??[]).flatMap(entry=>entry.devices?[entry.devices]:[]);
 const inputs=[rawNet,...scenes,...authored];if(isValidationSnapshot(documents)&&recentValidationNetwork&&inputs.length===recentValidationNetwork.inputs.length&&inputs.every((v,i)=>v===recentValidationNetwork!.inputs[i])){validationNetworks.set(documents,recentValidationNetwork.context);return recentValidationNetwork.context;}
 const net=validateNetworkShape(rawNet),context=createNetworkContext(net,[...scenes,...authored]);if(isValidationSnapshot(documents))recentValidationNetwork={inputs,context};if(isValidationSnapshot(documents)){markValidationContext(context);validationNetworks.set(documents,context);}return context;
}
export function validatePendingNetwork(documents:ReadonlyMap<string,unknown>,registry:Record<string,SceneDef>){
 const scenes=Object.values(registry).filter((s):s is SceneDef&{data:SceneData}=>!!s.data);
 const net=validateNetworkSource(documents.get('network')??NET,scenes.map(scene=>{const rules=deviceRules(scene);return{data:scene.data,code:contractOf(rules,scene.gameplay?.native?.verbs,Object.keys(scene.gameplay?.queries??{})),extra:rules.check};}));
 const context=createNetworkContext(net,scenes.map(scene=>scene.data)),vocabulary={keyring:new Set(context.keyring.keys()),controlled:new Set(registryLabels(context.net))};for(const scene of Object.values(registry)){validateExitKeyReferences(scene,context.keyring);if(scene.gameplay)validateGameplayRewards(scene.gameplay,vocabulary,scene.data?.texts);}for(const [id,value] of documents){const d=value as Partial<import('../engine/gameplay/types').GameplayDefinition>|undefined;if(d?.version===1&&d.commands&&Array.isArray(d.flags)&&Array.isArray(d.items)&&Array.isArray(d.events))validateGameplayRewards(d as import('../engine/gameplay/types').GameplayDefinition,vocabulary,Object.entries(registry).find(([key])=>deviceSourceIdentity(key).gameplay===id)?.[1].data?.texts);}return context;
}
