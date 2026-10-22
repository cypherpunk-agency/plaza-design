import {withSharedState} from '../engine/gameplay/shared-state';
import {validateCompanionConversations,validateCompanionGameplay,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {NATIVE_SCENES} from '../scenes';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {gameplayScenes} from './gameplay-scenes';
import {pendingScene} from './pending-scene';
import {deviceSceneIds,deviceDocumentId} from './device-sources';
import {isValidationSnapshot} from './validation-snapshot';
import type {SceneDef} from '../scenes';
import {validateWorldVehicles} from '../engine/level-vehicles';
import {validateZoneGraph} from '../world/zone-graph';
import shippedGraph from '../world/zone-graph.json';
const validatedRegistries = new WeakMap<ReadonlyMap<string,unknown>,Record<string,SceneDef>>();
/** One prospective registry for private Play, including routes into other edited scenes. */
export function pendingRegistry(documents:ReadonlyMap<string,unknown>){return withSharedState(documents.get('state-owners'),()=>registryFor(documents));}
function registryFor(documents:ReadonlyMap<string,unknown>){
 const cached=isValidationSnapshot(documents)?validatedRegistries.get(documents):undefined;if(cached)return cached;
 const network=pendingNetworkContext(documents);
 const native=Object.fromEntries(Object.keys(NATIVE_SCENES).map(id=>{const entry=gameplayScenes.find(s=>s.id===id)!;
  return[id,pendingScene(id,documents.get(id),{sceneDocument:documents.get(entry.prefix+'-scene'),gameplay:documents.get(entry.gameplayId),devices:deviceSceneIds.includes(id)?documents.get(deviceDocumentId(id)):undefined},network)];
 }));
 const registry=createSceneRegistry(native,documents.get('authored-scenes')??{version:1,scenes:[]},network);
 validateWorldVehicles(registry,validateZoneGraph(documents.get('zone-graph')??shippedGraph));
 const companion=documents.has('companion-gameplay')?validateCompanionGameplay(documents.get('companion-gameplay')):COMPANION_GAMEPLAY;
 for(const scene of Object.values(registry))validateCompanionConversations(scene,companion);
 validatePendingNetwork(documents,registry);if(isValidationSnapshot(documents))validatedRegistries.set(documents,registry);return registry;
}
