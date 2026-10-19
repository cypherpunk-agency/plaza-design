import {validateCompanionModelBindings} from './scene-companion';
import source from './companion-gameplay.json';
import {validateGameplay} from './validation';
import type {GameplayDefinition} from './types';
import type {SceneDef} from '../../scenes/kit';
export function validateCompanionGameplay(value:unknown):GameplayDefinition{const d=validateGameplay(value);if(d.native)throw Error('Shared companion library cannot own scene-specific native bindings');return d;}
export const COMPANION_GAMEPLAY=validateCompanionGameplay(source);
export function validateCompanionConversations(scene:SceneDef,library:GameplayDefinition=COMPANION_GAMEPLAY){validateCompanionModelBindings(scene,scene.data);const pet=scene.companion?.pet;if(!pet)return;const graphs={...library.conversations,...scene.gameplay?.conversations};for(const id of [...pet.conversations.sleep,pet.conversations.sun,pet.conversations.moving,...pet.conversations.idle])if(!Object.prototype.hasOwnProperty.call(graphs,id))throw Error('Missing companion conversation '+id);}
/** One shared authored graph source; native pet recurrence only chooses its reference. */
export function withCompanionConversations(scene:SceneDef,library:GameplayDefinition=COMPANION_GAMEPLAY):SceneDef{
 validateCompanionConversations(scene,library);if(!scene.companion?.pet)return scene;
 const local=scene.gameplay??{version:1 as const,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}};
 // A library may contain ordinary commands/state used by its graphs, with explicit collision guards.
 for(const group of ['state','commands','conversations','purchases'] as const)for(const id of Object.keys(library[group]??{}))if(Object.prototype.hasOwnProperty.call(local[group]??{},id))throw Error('Shared companion gameplay identity collision '+id);
 const gameplay=validateGameplay({...local,flags:[...new Set([...local.flags,...library.flags])],items:[...new Set([...local.items,...library.items])],events:[...new Set([...local.events,...library.events])],state:{...library.state,...local.state},commands:{...library.commands,...local.commands},conversations:{...library.conversations,...local.conversations},purchases:{...library.purchases,...local.purchases},reactions:[...library.reactions,...local.reactions],handoffs:[...(library.handoffs??[]),...(local.handoffs??[])]});return{...scene,gameplay};
}
