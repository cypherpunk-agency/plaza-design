import {pendingNetworkContext} from './pending-network';
import type {SceneDef} from '../scenes/kit';
import type {PlayFixtureVocabulary} from './play-fixtures';
import {validatePlayFixtures,validateFixtureBounds,fixtureStateMetadata} from './play-fixtures';
import {pendingRegistry} from './pending-registry';
/** Pending mode always uses current owners; no shipping identifier allowlist is appended. */
export function pendingFixtureVocabulary(documents:ReadonlyMap<string,unknown>,registry?:Readonly<Record<string,SceneDef>>):PlayFixtureVocabulary{
 for(const id of['network','opening-story','city-source'])if(!documents.has(id))throw Error('Pending fixture vocabulary requires '+id);
 registry??=pendingRegistry(documents);
 const opening=documents.get('opening-story')as {OPENING:Record<string,string>;GAMEPLAY:{flags:string[]}},city=documents.get('city-source')as {HARBOR_FLAG:string},network=pendingNetworkContext(documents);
 return{states:fixtureStateMetadata(registry),flags:new Set(['arrived','pixel',...Object.values(opening.OPENING),...opening.GAMEPLAY.flags,city.HARBOR_FLAG,...Object.values(registry).flatMap(scene=>[...(scene.gameplay?.flags??[]),...scene.exits.flatMap(e=>[...(e.requires?[e.requires]:[]),...(e.sets?[e.sets]:[])]),...(scene.companion?.unlockFlag?[scene.companion.unlockFlag]:[])])]),programs:new Set(network.net.programs.map(p=>p.id)),keyring:new Set(network.keyring.keys())};
}
/** Bounds and identities come from the complete pending registry, including native content rebindings. */
export function validatePendingFixtures(value:unknown,documents:ReadonlyMap<string,unknown>){
 for(const id of['network','opening-story','city-source'])if(!documents.has(id))throw Error('Pending fixture vocabulary requires '+id);
 const registry=pendingRegistry(documents),widths=Object.fromEntries(Object.entries(registry).map(([id,scene])=>[id,scene.width]));
 return validateFixtureBounds(validatePlayFixtures(value,false,Object.keys(registry),pendingFixtureVocabulary(documents,registry)),widths);
}
