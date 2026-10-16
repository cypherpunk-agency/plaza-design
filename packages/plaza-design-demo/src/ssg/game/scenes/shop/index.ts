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
import { type ItemId,type SceneDef,type SceneUse } from "../kit";

/** Layout: positions in world units, heights up from the floor. */
const L = shopDefaultLayout;



// ---------- people ----------

const keeper: Character = { id: 'keeper', seed: 5101, look: { body: 'avg', hair: 'short', garb: 'jacket', extras: ['glasses'], top: '#6a2a3e' }, x: L.keeper, act: 'vend', facing: -1, name: 'SHOPKEEPER', talk: [
  ['We\'re open.', 'We\'re always open. The sticker says 24/7. I wanted 24/7/365.25. The printer said no.'],
  ['The camera? The Registry insists. It films the till.', 'The till has nothing to hide. The till has nothing at all, most nights.'],
  ['Buy something or keep the cat company. The cat charges less.'],
] };
const PEOPLE: Character[] = [
  { id: 'browser', seed: 5102, x: 200, act: 'walk', range: [200, 450], speed: 0.18, look: { body: 'tall', extras: ['phone', 'backpack'] }, name: 'CUSTOMER', talk: [
    ['They moved the cheap noodles to the top shelf.', 'Top shelf is for people with legs.so. I have the free legs.'],
    ['I come in to read the labels. It is warmer than the library and the library closed.'],
  ] },
  { seed: 5103, x: 610, act: 'stand', facing: -1, look: { body: 'short', garb: 'coat', hair: 'beanie', extras: ['bag'] } },
  { look: 'cat', seed: 4, x: 640, h: 99, act: 'sit', facing: -1 },
  // the robots: a stock unit restocking the shelves, an android buying batteries, a crawler on the ceiling fixing the light by the window
  { look: { bot: 'servbot', v: 0 }, seed: 5105, x: 470, act: 'carry', range: [470, 300], speed: 0.16 },
  { id: 'android', seed: 5106, look: 'android', x: 688, act: 'queue', facing: 1, name: 'CUSTOMER', talk: [
    ['Batteries. Two packs. Do not make it weird.'],
    ['People ask what I do for fun. I queue. I am very good at it. I have never once been served first.'],
  ] },
  { look: 'crawler', seed: 5107, x: 124, h: 133, act: 'weld', facing: 1 },
];

/** People passing outside, seen through the window: small, dim, far. */
const OUTSIDE: Character[] = [
  { seed: 5201, x: 40, act: 'walk', range: 260, ps: 2, dim: 0.45, parallax: 0.3, h: 36, speed: 0.4, look: { extras: ['umbrella'] } },
  { seed: 5202, x: 300, act: 'walk', range: -260, ps: 2, dim: 0.5, parallax: 0.3, h: 36, speed: 0.3 },
];

// ---------- buying ----------

let bought = 0;
const GOODS = [
  ['One BLUE. The flavour is blue. Nobody knows more than that.', 'It tastes like the colour. Don\'t think about it.'],
  ['Crisps, salt and vinegar. The vinegar is synthetic. The salt is from the harbor.', 'Don\'t ask the harbor.'],
  ['Noodle cup. Three for three tokens, one for one.', 'The maths is the only honest thing in this shop.'],
  ['Gum. The last pack.', 'It has been the last pack since I opened.'],
];
/** What each of GOODS puts in your hands. */
const GOOD_ITEMS: ItemId[] = ['blue', 'crisps', 'noodlecup', 'gum'];
const USES: SceneUse[] = [
  { id: 'buy', x: shopPlacement('till').x, label: '[E] BUY', price: 1, name: 'SHOPKEEPER', promptH: shopPlacement('till').h+62, use: (c) => {
    if (!c.pay(1)) return ['One token. You have none. I can do nothing for you, at no charge.', 'Credit? This is a corner shop, not a bank. Banks have better locks.'];
    c.set('shop:bought'); c.add(GOOD_ITEMS[bought % GOOD_ITEMS.length]);
    return GOODS[bought++ % GOODS.length];
  } },
];

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
  name: 'Corner Shop',
  // facing (light.ts): on the street's east side: its window looks west across Downtown's street
  facing: 270,
  width: shopWidth(),
  spawn: shopPlacement('spawn').x,
  intro: ['A corner shop. The kind that never closes and never has change.'],
  exits: [{ id: 'downtown', x: shopPlacement('door').x, to: 'downtown', at: 'shop', label: '[E] DOWNTOWN', promptH: shopPlacement('door').h+82 }],
  readables: [
    { id: 'shelf', x: shopPlacement('limit').x, name: 'SHELF LABEL', promptH: shopPlacement('limit').h+26, pages: ['NOODLE CUPS · LIMIT 3 PER CUSTOMER.', 'PURCHASES OVER LIMIT ARE REPORTED.'] },
    { id: 'vend', x: shopPlacement('vending').x+Number(shopComposition.instances.find(i=>i.id==='vending')!.props.width)/2, name: 'THIRST.EXE', promptH: shopPlacement('vending').h+Number(shopComposition.instances.find(i=>i.id==='vending')!.props.height)+16, pages: ['ACCEPTS TOKENS. CHANGE NOT GIVEN.', 'SCREEN: OUT OF ORDER. DISPENSING NORMALLY.'] },
  ],
  people: [keeper, ...PEOPLE],
  uses: USES,

  drawBackdrop: (x,v)=>drawShopComposition(x,v,shopActors),

  drawFront: (x,v)=>drawShopForeground(x,v,shopActors),
};

/** Same source, actor snapshots and native drawing path for shipping and edited previews. */
export function shopScene(document:Composition=shopComposition,state:Environment['state']={},options:ShopRenderOptions={}):SceneDef{
  const doc=validateShopComposition(document),actors:Record<string,Character>=structuredClone(actorTemplates);
  bindShopActors(actors,doc);
  const rows=shopGeometry(doc),point=(id:string)=>shopPlacement(id,doc),props=(id:string)=>rows.find(r=>r.instance.id===id)!.props;
  return {...base,width:shopWidth(doc),spawn:point('spawn').x,
    exits:base.exits.map(e=>({...e,x:point('door').x,promptH:point('door').h+82})),
    readables:base.readables!.map(r=>r.id==='shelf'?{...r,x:point('limit').x,promptH:point('limit').h+26}:{...r,x:point('vending').x+Number(props('vending').width)/2,promptH:point('vending').h+Number(props('vending').height)+16}),
    uses:base.uses!.map(u=>({...u,x:point('till').x,promptH:point('till').h+62})),
    people:['keeper','browser','person-1','cat','stockbot','android','crawler'].map(id=>actors[id]),
    drawBackdrop:(x,v)=>drawShopComposition(x,v,actors,doc,state,options),
    drawFront:(x,v)=>drawShopForeground(x,v,actors,doc,state,options),
    visualEnvironment:(view)=>shopEnvironment(view,actors,doc),
  };
}
export const shop=shopScene();
