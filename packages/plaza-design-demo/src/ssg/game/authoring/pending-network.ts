import {NET,type SceneData} from '../data';
import {NATIVE_SCENES,type SceneDef} from '../scenes';
import {createNetworkContext} from '../engine/network-context';
import {contractOf} from '../engine/rules';
import {deviceRules,deviceSceneIds,deviceDocumentId} from './device-sources';
import {validateNetworkShape,validateNetworkSource} from './network-source';
/** Resolve pending key metadata before validating scene references; semantic validation follows assembly. */
export function pendingNetworkContext(documents:ReadonlyMap<string,unknown>){
 const net=validateNetworkShape(documents.get('network')??NET);
 const scenes=Object.entries(NATIVE_SCENES).flatMap(([id,scene])=>{
  const source=deviceSceneIds.includes(id)?documents.get(deviceDocumentId(id)):undefined;
  return source?[source as SceneData]:scene.data?[scene.data]:[];
 });
 const catalogue=documents.get('authored-scenes') as {scenes?:{devices?:SceneData}[]}|undefined;
 const authored=(catalogue?.scenes??[]).flatMap(entry=>entry.devices?[entry.devices]:[]);
 return createNetworkContext(net,[...scenes,...authored]);
}
export function validatePendingNetwork(documents:ReadonlyMap<string,unknown>,registry:Record<string,SceneDef>){
 const scenes=Object.values(registry).filter((s):s is SceneDef&{data:SceneData}=>!!s.data);
 const net=validateNetworkSource(documents.get('network')??NET,scenes.map(scene=>{const rules=deviceRules(scene);return{data:scene.data,code:contractOf(rules,scene.gameplay?.native?.verbs,Object.keys(scene.gameplay?.queries??{})),extra:rules.check};}));
 return createNetworkContext(net,scenes.map(scene=>scene.data));
}
