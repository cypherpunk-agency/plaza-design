import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import {shopDefaultLayout} from '../../art/assemblies/shop-elements';
import {shopComposition,shopPlacement,shopWidth,shopGeometry,validateShopComposition,bindShopActors,shopEnvironment,drawShopComposition,drawShopForeground,type ShopRenderOptions} from './composition';
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
import { type Character } from "../../runtime/characters";
import { type SceneDef } from "../kit";
import {compileSceneDocument,applyScenePresentation,type SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {SHOP_GAMEPLAY,SHOP_SCENE,validateShopGameplay,validateShopScene} from './scene-document';

/** Layout: positions in world units, heights up from the floor. */
const L = shopDefaultLayout;



// ---------- people ----------

const keeper: Character = { id: 'keeper', seed: 5101, look: { body: 'avg', hair: 'short', garb: 'jacket', extras: ['glasses'], top: '#6a2a3e' }, x: L.keeper, act: 'vend', facing: -1, ...SHOP_SCENE.people!.find(p=>p.id==='keeper') };
const PEOPLE: Character[] = [
  { id: 'browser', seed: 5102, x: 200, act: 'walk', range: [200, 450], speed: 0.18, look: { body: 'tall', extras: ['phone', 'backpack'] }, ...SHOP_SCENE.people!.find(p=>p.id==='browser') },
  { seed: 5103, x: 610, act: 'stand', facing: -1, look: { body: 'short', garb: 'coat', hair: 'beanie', extras: ['bag'] } },
  { look: 'cat', seed: 4, x: 640, h: 99, act: 'sit', facing: -1 },
  // the robots: a stock unit restocking the shelves, an android buying batteries, a crawler on the ceiling fixing the light by the window
  { look: { bot: 'servbot', v: 0 }, seed: 5105, x: 470, act: 'carry', range: [470, 300], speed: 0.16 },
  { id: 'android', seed: 5106, look: 'android', x: 688, act: 'queue', facing: 1, ...SHOP_SCENE.people!.find(p=>p.id==='android') },
  { look: 'crawler', seed: 5107, x: 124, h: 133, act: 'weld', facing: 1 },
];

/** People passing outside, seen through the window: small, dim, far. */
const OUTSIDE: Character[] = [
  { seed: 5201, x: 40, act: 'walk', range: 260, ps: 2, dim: 0.45, parallax: 0.3, h: 36, speed: 0.4, look: { extras: ['umbrella'] } },
  { seed: 5202, x: 300, act: 'walk', range: -260, ps: 2, dim: 0.5, parallax: 0.3, h: 36, speed: 0.3 },
];

// ---------- buying ----------


/** Per upper room: boxes [x, w, h] on the floor, windows [x, lit], a bulb x. Laid out once, for 8 floors. */


/**
 * The building above the shop, in cutaway, for screens taller than the shop: a
 * stockroom, then flats, storey after storey up out of the view. Middle band:
 * dim walls, dim boxes, a few warm windows and bulbs, nothing cyan.
 */


/** The convex security mirror up in the corner: the shop, bent, in silver. */


const actorTemplates:Record<string,Character>={keeper,...Object.fromEntries(PEOPLE.map((p,i)=>[['browser','person-1','cat','stockbot','android','crawler'][i],p])),...Object.fromEntries(OUTSIDE.map((p,i)=>['outside-'+i,p]))};
export const shopActors:Record<string,Character>=structuredClone(actorTemplates);
bindShopActors(shopActors);
export function shopFrameEnvironment(view:View,_engine?:EngineDraw,doc=shopComposition):Environment{return shopEnvironment(view,actorTemplates,doc);}

const base: SceneDef = {
  id: 'shop',
  name: SHOP_SCENE.name,
  // facing (light.ts): on the street's east side: its window looks west across Downtown's street
  facing: 270,
  width: shopWidth(),
  spawn: shopPlacement('spawn').x,
  intro: SHOP_SCENE.intro,
  exits: [{ id: 'downtown', x: shopPlacement('door').x, to: 'downtown', at: 'shop', label: SHOP_SCENE.exits![0].label, promptH: shopPlacement('door').h+82 }],
  readables: [
    { id: 'shelf', x: shopPlacement('limit').x, name: SHOP_SCENE.readables![0].name, promptH: shopPlacement('limit').h+26, pages: SHOP_SCENE.readables![0].pages },
    { id: 'vend', x: shopPlacement('vending').x+Number(shopComposition.instances.find(i=>i.id==='vending')!.props.width)/2, name: SHOP_SCENE.readables![1].name, promptH: shopPlacement('vending').h+Number(shopComposition.instances.find(i=>i.id==='vending')!.props.height)+16, pages: SHOP_SCENE.readables![1].pages },
  ],
  people: [keeper, ...PEOPLE],


  drawBackdrop: (x,v)=>drawShopComposition(x,v,shopActors),

  drawFront: (x,v)=>drawShopForeground(x,v,shopActors),
};

/** Same source, actor snapshots and native drawing path for shipping and edited previews. */
export function shopSceneDefinition(document:Composition=shopComposition,state:Environment['state']={},options:ShopRenderOptions={},content:SceneDocument=SHOP_SCENE,gameplay:GameplayDefinition=SHOP_GAMEPLAY):SceneDef{
  const source=validateSceneDocument(content,validateGameplay(gameplay));
  const doc=validateShopComposition(document),actors:Record<string,Character>=structuredClone(actorTemplates);
  for(const person of source.people??[]){actors[person.id].name=person.name;actors[person.id].talk=structuredClone(person.talk);}
  bindShopActors(actors,doc);
  const rows=shopGeometry(doc),point=(id:string)=>shopPlacement(id,doc),props=(id:string)=>rows.find(r=>r.instance.id===id)!.props;
  const compiled=compileSceneDocument(source,{buy:point('till').x},()=>{throw new Error('Shop purchases do not use conversations');});
  return applyScenePresentation({...base,width:shopWidth(doc),spawn:point('spawn').x,gameplay,
    exits:base.exits.map(e=>({...e,x:point('door').x,promptH:point('door').h+82})),
    readables:base.readables!.map(r=>r.id==='shelf'?{...r,x:point('limit').x,promptH:point('limit').h+26}:{...r,x:point('vending').x+Number(props('vending').width)/2,promptH:point('vending').h+Number(props('vending').height)+16}),
    uses:compiled.uses.map(u=>({...u,promptH:point('till').h+62})),
    people:['keeper','browser','person-1','cat','stockbot','android','crawler'].map(id=>actors[id]),
    drawBackdrop:(x,v)=>drawShopComposition(x,v,actors,doc,state,options),
    drawFront:(x,v)=>drawShopForeground(x,v,actors,doc,state,options),
    visualEnvironment:(view)=>shopEnvironment(view,actors,doc),
  },source);
}
export function shopScene(document:Composition=shopComposition,state:Environment['state']={},options:ShopRenderOptions={},content:SceneDocument=SHOP_SCENE,gameplay:GameplayDefinition=SHOP_GAMEPLAY):SceneDef{return shopSceneDefinition(document,state,options,validateShopScene(content,validateShopGameplay(gameplay)),gameplay);}
export const shop=shopScene();
