import {validateCompanionConversations,validateCompanionGameplay,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {NATIVE_SCENES} from '../scenes';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {gameplayScenes} from './gameplay-scenes';
import {pendingScene} from './pending-scene';
import {deviceSceneIds,deviceDocumentId} from './device-sources';
/** One prospective registry for private Play, including routes into other edited scenes. */
export function pendingRegistry(documents:ReadonlyMap<string,unknown>){
 const network=pendingNetworkContext(documents);
 const native=Object.fromEntries(Object.keys(NATIVE_SCENES).map(id=>{const entry=gameplayScenes.find(s=>s.id===id)!;
  return[id,pendingScene(id,documents.get(id),{sceneDocument:documents.get(entry.prefix+'-scene'),gameplay:documents.get(entry.gameplayId),devices:deviceSceneIds.includes(id)?documents.get(deviceDocumentId(id)):undefined},network)];
 }));
 const registry=createSceneRegistry(native,documents.get('authored-scenes')??{version:1,scenes:[]},network);
 const companion=documents.has('companion-gameplay')?validateCompanionGameplay(documents.get('companion-gameplay')):COMPANION_GAMEPLAY;
 for(const scene of Object.values(registry))validateCompanionConversations(scene,companion);
 validatePendingNetwork(documents,registry);return registry;
}
