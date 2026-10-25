import {validateWorldPeople} from '../engine/people';
import {withSharedState} from '../engine/gameplay/shared-state';
import {validateCompanionConversations,validateCompanionGameplay,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {NATIVE_SCENES} from '../scenes';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {pendingScene} from './pending-scene';
import {deviceSourceIdentity} from './device-document-ids';
import {isValidationSnapshot} from './validation-snapshot';
import type {SceneDef} from '../scenes';
import {validateWorldVehicles} from '../engine/level-vehicles';
import {compileGameWorld} from '../world/compiled-world';
const validatedRegistries = new WeakMap<ReadonlyMap<string,unknown>,Record<string,SceneDef>>();
/** One prospective registry for private Play, including routes into other edited scenes. */
export function pendingRegistry(documents:ReadonlyMap<string,unknown>){return withSharedState(documents.get('state-owners'),()=>registryFor(documents));}
function registryFor(documents:ReadonlyMap<string,unknown>){
 const cached=isValidationSnapshot(documents)?validatedRegistries.get(documents):undefined;if(cached)return cached;
 const network=pendingNetworkContext(documents);
 const native=Object.fromEntries(Object.keys(NATIVE_SCENES).map(id=>{const source=deviceSourceIdentity(id);
  return[id,pendingScene(id,documents.get(source.composition),{sceneDocument:documents.get(source.scene),gameplay:documents.get(source.gameplay),devices:documents.get(source.devices),sharedState:documents.get('state-owners')},network)];
 }));
 const registry=createSceneRegistry(native,documents.get('authored-scenes')??{version:1,scenes:[]},network);
 const graph=compileGameWorld(registry,documents);validateWorldPeople(registry,graph);validateWorldVehicles(registry,graph);
 const companion=documents.has('companion-gameplay')?validateCompanionGameplay(documents.get('companion-gameplay')):COMPANION_GAMEPLAY;
 for(const scene of Object.values(registry))validateCompanionConversations(scene,companion);
 validatePendingNetwork(documents,registry);if(isValidationSnapshot(documents))validatedRegistries.set(documents,registry);return registry;
}
