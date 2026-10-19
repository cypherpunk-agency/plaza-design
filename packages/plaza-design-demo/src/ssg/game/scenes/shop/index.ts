import {compileSceneActors} from '../../engine/gameplay/actors';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import {shopComposition,shopGeometry,validateShopComposition,shopEnvironment,drawShopComposition,drawShopForeground,type ShopRenderOptions} from './composition';
/**
 * A corner shop at night: shelves packed with colour, humming fridges, a vending machine, a
 * shopkeeper at the till under a camera, a lottery screen, a security mirror, a customer or two,
 * a cat asleep on the fridge. Small enough to sit in the middle of a wide screen.
 * Bands: far = the street through the window (people passing in the rain); middle = the back
 * wall and, on tall screens, the building above the shop in cutaway (the stockroom, then flats);
 * play = shelves, fridges, machine, counter, people.
 *
 * Built from the kits: people (../characters.ts), screens (screens.ts), shelves and fridges (build.ts).
 */


/** The shop is on the street's east side: its window looks west (light.ts facing). */

import type {Composition,Environment} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';
import { type SceneDef } from "../kit";
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {SHOP_GAMEPLAY,SHOP_SCENE,validateShopGameplay,validateShopScene,shopManifest,shopBindingGroups} from './scene-document';

const actorBodies=(source:SceneDocument,doc:Composition)=>compileSceneActors(source,shopGeometry(doc));
export const shopActors=actorBodies(SHOP_SCENE,shopComposition);
export function shopFrameEnvironment(view:View,_engine?:EngineDraw,doc=shopComposition):Environment{return shopEnvironment(view,actorBodies(SHOP_SCENE,doc),doc);}

/** Same source, actor snapshots and native drawing path for shipping and edited previews. */
export function shopSceneDefinition(document:Composition=shopComposition,state:Environment['state']={},options:ShopRenderOptions={},content:SceneDocument=SHOP_SCENE,gameplay:GameplayDefinition=SHOP_GAMEPLAY):SceneDef{
  const source=validateSceneDocument(shopManifest(content),validateGameplay(gameplay),{manifest:true,actors:true});
  const doc=validateShopComposition(document),actors=actorBodies(source,doc);
  const compiled=compileManifestDocument(source,shopGeometry(doc),(_c,id)=>({name:source.name,pages:[],conversation:id}),{groups:shopBindingGroups,groundExits:false});
  return {id:'shop',name:source.name,intro:source.introTouch?(touch:boolean)=>[...(touch?source.introTouch!:source.intro)]:source.intro.length?[...source.intro]:undefined,
    ...compiled.content,gameplay:withSceneConversations(gameplay,source),
    people:source.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
    drawBackdrop:(x,v)=>drawShopComposition(x,v,actors,doc,state,options,source),
    drawFront:(x,v)=>drawShopForeground(x,v,actors,doc,state,options,source),
    visualEnvironment:(view)=>shopEnvironment(view,actors,doc,source),
  };
}
export function shopScene(document:Composition=shopComposition,state:Environment['state']={},options:ShopRenderOptions={},content:SceneDocument=SHOP_SCENE,gameplay:GameplayDefinition=SHOP_GAMEPLAY):SceneDef{return shopSceneDefinition(document,state,options,validateShopScene(content,validateShopGameplay(gameplay)),gameplay);}
export const shop=shopScene();
