import {inheritSceneDefaults} from '../../engine/gameplay/manifest-content';
import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
const items=['blue','crisps','noodlecup','gum'];
function same(actual:readonly string[],expected:readonly string[],name:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Shop '+name+' IDs/order are protected');}
/** Save compatibility: keep the existing goods catalog, flag and ordinary-interaction permissions. */
export function validateShopGameplay(value:unknown){
  const doc=validateNativeContract(value,gameplaySource,undefined,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});
  const purchase=doc.purchases?.['shop.goods'];if(!purchase||purchase.rotation?.state!=='shop.rotation'||JSON.stringify(purchase.rotation.items)!==JSON.stringify(items)||purchase.goods)throw new Error('Shop goods rotation is protected');
  for(const id of items.map(i=>'shop.buy-'+i)){const command=doc.commands[id];if(command.actions.filter(a=>'purchase'in a&&a.purchase==='shop.goods').length!==1||command.actions.some(a=>'tokens'in a||'item'in a||'state'in a))throw new Error('Shop charges and goods belong to its purchase definition');}
  return doc;
}
export const SHOP_GAMEPLAY=validateShopGameplay(gameplaySource);
export const shopBindingGroups=['uses','readables','rests','exits'] as const;
/** Legacy source bundles inherit the canonical bindings; new content supplies its own bindings. */
export function shopManifest(value:SceneDocument):SceneDocument{return inheritSceneDefaults(value,sceneSource as unknown as SceneDocument,shopBindingGroups);}
/** Preserve the original purchase contract while ordinary content uses authored geometry. */
export function validateShopScene(value:unknown,gameplay:GameplayDefinition=SHOP_GAMEPLAY){
  const doc=validateSceneDocument(shopManifest(value as SceneDocument),validateShopGameplay(gameplay),{manifest:true,actors:true});
  if(doc.id!=='shop')throw new Error('Shop scene identity is protected');
  if(doc.manifest!.people!==undefined)throw new Error('Shop actor placement remains owned by its registered actor source');
  protectActorIdentity(doc.actors!,sceneSource.actors,{reorder:true,entities:true});
  for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);
  for(const group of shopBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(r=>r.id).sort().join())throw new Error('Shop manifest must bind every '+group+' entry');
  const buy=doc.uses.find(u=>u.id==='buy');if(buy){if(buy.purchase!=='shop.goods'||buy.cycleState!=='shop.rotation')throw new Error('Shop purchase/state bindings are protected; legacy scene edits require migration');if(buy.cycle!==true||buy.when||buy.items||buy.routes.some(r=>r.when||r.conversation))throw new Error('Shop purchase cycle must remain unconditional');
  same(buy.routes.map(r=>r.command??''),items.map(i=>'shop.buy-'+i),'purchase route');}
  return doc;
}
export const SHOP_SCENE=validateShopScene(sceneSource);
