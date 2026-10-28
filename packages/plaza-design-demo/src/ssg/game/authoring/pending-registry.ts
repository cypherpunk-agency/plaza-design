import {validatePendingCompanion} from './pending-rules';
import {validateWorldPeople} from '../engine/people';
import {withSharedState} from '../engine/gameplay/shared-state';
import {validateCompanionConversations,validateCompanionGameplay,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {pendingNetworkContext,validatePendingNetwork} from './pending-network';
import {NATIVE_SCENES} from '../scenes';
import {createSceneRegistry} from '../engine/gameplay/scene-catalogue';
import {pendingScene} from './pending-scene';
import {proposalScene} from './proposal-scenes';
import {deviceSourceIdentity} from './device-document-ids';
import {isValidationSnapshot} from './validation-snapshot';
import type {SceneDef} from '../scenes';
import {validateWorldVehicles} from '../engine/level-vehicles';
import {compileGameWorld} from '../world/compiled-world';
import {demoContent} from '../demo';
import type {ChunkDocument} from '../art';
import {BOT_GAMEPLAY,BOT_REACTIONS,validateBotGameplay,validateBotReactions,withBotConversations} from '../engine/gameplay/bot-conversations';
const validatedRegistries = new WeakMap<ReadonlyMap<string,unknown>,Record<string,SceneDef>>();
let recentRegistry:{inputs:readonly unknown[];registry:Record<string,SceneDef>}|undefined;
/** Proposal geometry is checked by ComposerModel, while logical authored children are already
 * represented by their atomic catalogue source. Full document validation still includes city policy. */
export const authoringValidationInputs=(documents:readonly {id:string;kind?:string;value:unknown}[])=>documents.filter(d=>!proposalScene(d.id)&&!d.id.startsWith('authored.')).flatMap(d=>[d.id,d.kind,d.value]);
/** Scene assembly does not read city policy; this narrower cache must never gate document validation. */
const registryInputs=(documents:readonly {id:string;value:unknown}[])=>authoringValidationInputs(documents.filter(d=>d.id!=='city-source'));
/** One prospective registry for private Play, including routes into other edited scenes. */
export function pendingRegistry(documents:ReadonlyMap<string,unknown>){return withSharedState(documents.get('state-owners'),()=>registryFor(documents));}
/** The Test District has its own runtime content and save namespace. Source validation and
 * private Play must assemble that same content rather than borrowing campaign declarations. */
export function pendingTestDistrict(documents:ReadonlyMap<string,unknown>,catalogue=pendingRegistry(documents)){
 return demoContent({gameplay:documents.get('demo-counter-gameplay'),counter:documents.get('demo-counter-scene'),desk:documents.get('demo-desk-scene'),shop:documents.get('shop') as ChunkDocument,library:documents.get('library') as ChunkDocument,sandbox:documents.get('sandbox') as ChunkDocument,workshop:documents.get('demo-workshop-gameplay'),catalogue,vehicle:catalogue['vehicle-lab'],routes:catalogue['vehicle-routes']});
}
function registryFor(documents:ReadonlyMap<string,unknown>){
 const cached=isValidationSnapshot(documents)?validatedRegistries.get(documents):undefined;if(cached)return cached;
 const inputs=isValidationSnapshot(documents)?registryInputs([...documents].map(([id,value])=>({id,value}))):undefined;
 if(inputs&&recentRegistry&&inputs.length===recentRegistry.inputs.length&&inputs.every((value,index)=>value===recentRegistry!.inputs[index])){validatedRegistries.set(documents,recentRegistry.registry);return recentRegistry.registry;}
 const network=pendingNetworkContext(documents);
 const native=Object.fromEntries(Object.keys(NATIVE_SCENES).map(id=>{const source=deviceSourceIdentity(id);
  return[id,pendingScene(id,documents.get(source.composition),{sceneDocument:documents.get(source.scene),gameplay:documents.get(source.gameplay),devices:documents.get(source.devices),sharedState:documents.get('state-owners')},network)];
 }));
 const registry=createSceneRegistry(native,documents.get('authored-scenes')??{version:1,scenes:[]},network);
 const graph=compileGameWorld(registry,documents);validateWorldPeople(registry,graph);validateWorldVehicles(registry,graph);
 const companion=documents.has('companion-gameplay')?validateCompanionGameplay(documents.get('companion-gameplay')):COMPANION_GAMEPLAY;
 const robots=documents.has('bot-reactions')?validateBotReactions(documents.get('bot-reactions')):BOT_REACTIONS,robotGameplay=documents.has('bot-gameplay')?validateBotGameplay(documents.get('bot-gameplay')):BOT_GAMEPLAY;
 for(const scene of Object.values(registry))withBotConversations(scene,robots,robotGameplay);
 if(documents.has('companion'))validatePendingCompanion(documents.get('companion'),documents);
 for(const scene of Object.values(registry))validateCompanionConversations(scene,companion);
 validatePendingNetwork(documents,registry);if(inputs){validatedRegistries.set(documents,registry);recentRegistry={inputs,registry};}return registry;
}
