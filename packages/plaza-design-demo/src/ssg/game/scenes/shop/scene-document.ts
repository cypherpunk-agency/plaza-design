import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
const items=['blue','crisps','noodlecup','gum'];
function same(actual:readonly string[],expected:readonly string[],name:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Shop '+name+' IDs/order are protected');}
/** Save compatibility: keep the existing goods catalog, flag and ordinary-interaction permissions. */
export function validateShopGameplay(value:unknown){
  const doc=validateGameplay(value);if(doc.native)throw new Error('Native bindings are not registered for this gameplay document');same(doc.flags,['shop:bought'],'flag');same(doc.items,items,'item');same(doc.events,[],'event');same(Object.keys(doc.commands),items.map(i=>'shop.buy-'+i),'command');same(Object.keys(doc.conversations),[],'conversation');
  if(doc.reactions.length)throw new Error('Shop has no authored event reactions');
  for(const command of Object.values(doc.commands))same(command.sources,['interaction'],'command permission');
  if(JSON.stringify(Object.keys(doc.state??{}))!==JSON.stringify(['shop.rotation'])||doc.state!['shop.rotation'].owner!=='shop'||doc.state!['shop.rotation'].lifetime!=='save')throw new Error('Shop requires persistent rotation; legacy gameplay edits require migration');
  same(Object.keys(doc.purchases??{}),['shop.goods'],'purchase');const purchase=doc.purchases!['shop.goods'];if(purchase.rotation?.state!=='shop.rotation'||JSON.stringify(purchase.rotation.items)!==JSON.stringify(items)||purchase.goods)throw new Error('Shop goods rotation is protected');
  for(const command of Object.values(doc.commands))if(command.actions.filter(a=>'purchase'in a&&a.purchase==='shop.goods').length!==1||command.actions.some(a=>'tokens'in a||'item'in a||'state'in a))throw new Error('Shop charges and goods belong to its purchase definition');
  return doc;
}
export const SHOP_GAMEPLAY=validateShopGameplay(gameplaySource);
/** Content can change; physical identities, destination and native actor dialogue remain stable. */
export function validateShopScene(value:unknown,gameplay:GameplayDefinition=SHOP_GAMEPLAY){
  const doc=validateSceneDocument(value,validateShopGameplay(gameplay));
  if(doc.id!=='shop')throw new Error('Shop scene identity is protected');
  same(doc.uses.map(u=>u.id),['buy'],'interaction');same((doc.readables??[]).map(r=>r.id),['shelf','vend'],'readable');same((doc.people??[]).map(p=>p.id),['keeper','browser','android'],'person');same((doc.exits??[]).map(e=>e.id),['downtown'],'exit');
  const exit=doc.exits![0];if(exit.to!=='downtown'||exit.at!=='shop')throw new Error('Shop exit destination is protected');
  const buy=doc.uses[0];if(buy.purchase!=='shop.goods'||buy.cycleState!=='shop.rotation')throw new Error('Shop purchase/state bindings are protected; legacy scene edits require migration');if(buy.cycle!==true||buy.when||buy.items||buy.routes.some(r=>r.when||r.conversation))throw new Error('Shop purchase cycle must remain unconditional');
  same(buy.routes.map(r=>r.command??''),items.map(i=>'shop.buy-'+i),'purchase route');
  if(doc.objectives!==undefined||doc.time!==undefined)throw new Error('Shop has no objective/time override');
  return doc;
}
export const SHOP_SCENE=validateShopScene(sceneSource);
