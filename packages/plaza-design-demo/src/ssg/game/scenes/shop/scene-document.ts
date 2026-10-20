import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/** Purchases, goods, cursors and command permissions belong to the current shared source. */
export function validateShopGameplay(value:unknown){return validateGameplay(value);}
export const SHOP_GAMEPLAY=validateShopGameplay(gameplaySource);
export const shopBindingGroups=['uses','readables','rests','exits'] as const;
/** Content and placement bindings are owned by the current source document. */
export function shopManifest(value:SceneDocument):SceneDocument{return structuredClone(value);}
/** Ordinary content uses shared validation and current authored geometry. */
export function validateShopScene(value:unknown,gameplay:GameplayDefinition=SHOP_GAMEPLAY){
  const doc=validateSceneDocument(shopManifest(value as SceneDocument),validateShopGameplay(gameplay),{manifest:true,actors:true});
  if(doc.id!=='shop')throw new Error('Shop scene identity is protected');
  if(doc.manifest!.people!==undefined)throw new Error('Shop actor placement remains owned by its registered actor source');
  protectActorIdentity(doc.actors!,sceneSource.actors,{reorder:true,entities:true});
  for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);
  for(const group of shopBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(r=>r.id).sort().join())throw new Error('Shop manifest must bind every '+group+' entry');
  return doc;
}
export const SHOP_SCENE=validateShopScene(sceneSource);
