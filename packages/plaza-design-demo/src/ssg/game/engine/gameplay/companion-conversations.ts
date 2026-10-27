import {validateGameplayCondition} from './conditions';
import {validateCompanionModelBindings} from './scene-companion';
import source from './companion-gameplay.json';
import {validateGameplay} from './validation';
import type {GameplayDefinition} from './types';
import type {SceneDef} from '../../scenes/kit';
import {mergeGameplayLibrary} from './libraries';
import type {SceneCompanion} from './scene-companion';
export function validateCompanionGameplay(value:unknown):GameplayDefinition{const d=validateGameplay(value);if(d.native||d.checkpoint)throw Error('Shared companion library cannot own scene-specific native bindings/checkpoint policies');return d;}
export const COMPANION_GAMEPLAY=validateCompanionGameplay(source);
export function validateCompanionBindings(companion:Pick<SceneCompanion,'when'|'pet'>|undefined,local:GameplayDefinition|undefined,library:GameplayDefinition=COMPANION_GAMEPLAY){if(companion?.when!=null)validateGameplayCondition(companion.when,mergeGameplayLibrary(local??{version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}},library,'Companion condition vocabulary'));const pet=companion?.pet;if(!pet)return;const graphs={...library.conversations,...local?.conversations};for(const id of [...pet.conversations.sleep,pet.conversations.sun,pet.conversations.moving,...pet.conversations.idle])if(!Object.prototype.hasOwnProperty.call(graphs,id))throw Error('Missing companion conversation '+id);}
export function validateCompanionConversations(scene:SceneDef,library:GameplayDefinition=COMPANION_GAMEPLAY){validateCompanionModelBindings(scene,scene.data);validateCompanionBindings(scene.companion,scene.gameplay,library);}
/** One shared authored graph source; native pet recurrence only chooses its reference. */
export function withCompanionConversations(scene:SceneDef,library:GameplayDefinition=COMPANION_GAMEPLAY):SceneDef{
 validateCompanionConversations(scene,library);if(!scene.pixel&&!scene.companion?.pet)return scene;
 const local=scene.gameplay??{version:1 as const,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}};
 return{...scene,gameplay:mergeGameplayLibrary(local,library,'Shared companion gameplay')};
}
