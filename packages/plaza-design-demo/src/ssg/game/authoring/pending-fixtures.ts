import {validatePlayFixtures,validateFixtureBounds} from './play-fixtures';
import {pendingRegistry} from './pending-registry';
/** Bounds and identities come from the complete pending registry, including native content rebindings. */
export function validatePendingFixtures(value:unknown,documents:ReadonlyMap<string,unknown>){
 const registry=pendingRegistry(documents),widths=Object.fromEntries(Object.entries(registry).map(([id,scene])=>[id,scene.width]));
 return validateFixtureBounds(validatePlayFixtures(value,false,Object.keys(registry)),widths);
}
