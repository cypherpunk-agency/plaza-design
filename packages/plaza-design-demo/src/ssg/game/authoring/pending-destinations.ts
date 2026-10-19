import {pendingNetworkContext} from './pending-network';
import {NATIVE_SCENES} from '../scenes';
import {gameplayScenes} from './gameplay-scenes';
import {validateSceneCatalogue} from '../engine/gameplay/scene-catalogue';
/** Native and newly authored routes share the same prospective destination identities. */
function nativeDestinations(documents:ReadonlyMap<string,unknown>){
 return Object.fromEntries(Object.entries(NATIVE_SCENES).map(([id,scene])=>{
  const entry=gameplayScenes.find(s=>s.id===id),doc=entry?.validateScene(documents.get(entry.prefix+'-scene'),entry.validateGameplay(documents.get(entry.gameplayId)),{phase:'structural'});
  return [id,(doc?.exits??scene.exits).map(e=>e.id)];
 }));
}
export function validatePendingSceneCatalogue(value:unknown,documents:ReadonlyMap<string,unknown>){
 const native=Object.fromEntries(Object.entries(nativeDestinations(documents)).map(([id,exits])=>[id,{exits:exits.map(id=>({id}))}]));
 return validateSceneCatalogue(value,native,pendingNetworkContext(documents));
}
export function pendingDestinations(documents:ReadonlyMap<string,unknown>){
 const native=nativeDestinations(documents),catalogue=validatePendingSceneCatalogue(documents.get('authored-scenes')??{version:1,scenes:[]},documents);
 return {...native,...Object.fromEntries(catalogue.scenes.map(entry=>[entry.scene.id,(entry.scene.exits??[]).map(e=>e.id)]))};
}
