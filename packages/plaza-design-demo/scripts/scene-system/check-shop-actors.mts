import assert from 'node:assert/strict';
import {validateActors,compileActors} from '../../src/ssg/game/engine/gameplay/actors';
import {validateSceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {SHOP_SCENE,SHOP_GAMEPLAY,validateShopScene} from '../../src/ssg/game/scenes/shop/scene-document';
import {shopActors,shopScene} from '../../src/ssg/game/scenes/shop';
import {shopComposition,shopGeometry} from '../../src/ssg/game/scenes/shop/composition';
import {prepareCharacter} from '../../src/ssg/game/runtime/characters';
import {city} from '../../src/ssg/game/world/clock';
const source=structuredClone(SHOP_SCENE);assert.equal(source.actors!.length,9);
assert.throws(()=>validateSceneDocument(source,SHOP_GAMEPLAY,{manifest:true}),/registered adapter/);
assert.throws(()=>validateShopScene({...source,actors:null}));
let rejected=0;for(const mutate of [
 (a:any)=>a[0].look={body:'alien'},(a:any)=>a[0].look={bot:'unknown'},(a:any)=>a[0].look={extras:['mask','mask']},
 (a:any)=>a[0].look={top:'red'},(a:any)=>a[0].look={bot:'servbot',wear:2},(a:any)=>a[0].act='fly',
 (a:any)=>a[0].range=[0],(a:any)=>a[0].range=Infinity,(a:any)=>a[0].speed=-1,(a:any)=>a[0].ps=1.5,
 (a:any)=>a[0].seed=NaN,(a:any)=>a[0].dim=2,(a:any)=>a[0].when={from:'25:00',to:'06:00'},
 (a:any)=>a[0].when={from:'18:00',to:'06:00',days:[]},(a:any)=>a[0].when={from:'18:00',to:'06:00',extra:true},
 (a:any)=>a[0].follow='missing',(a:any)=>a[0].follow=a[0].id,(a:any)=>{a[0].follow=a[1].id;a[1].follow=a[0].id;},
 (a:any)=>a[1].instance=a[0].instance,(a:any)=>a[1].target=a[0].target,(a:any)=>a[0].x=2,
 (a:any)=>a[0].id='__proto__',
]){const a=structuredClone(source.actors);mutate(a);assert.throws(()=>validateActors(a));rejected++;}
for(const mutate of [(d:any)=>d.actors[0].reaction='changed',(d:any)=>d.actors[0].band='invalid',(d:any)=>d.actors[0].target='other']){const d=structuredClone(source);mutate(d);assert.throws(()=>validateShopScene(d));}
const moved=structuredClone(shopComposition);moved.instances.find(i=>i.id==='browser')!.placement.x=340;
const actors=compileActors(source.actors!,shopGeometry(moved));assert.equal(actors.browser.x,340);assert.deepEqual(actors.browser.range,[340,590]);assert.equal(actors.cat.h,99);assert(!('h'in actors.browser));assert(!('id'in actors.stockbot));
const edited=structuredClone(source);const browser=edited.actors!.find(a=>a.id==='browser')!;browser.seed=73;browser.look={body:'wide',hair:'mohawk',top:'#123456',extras:['mask']};browser.range=[-40,90];browser.speed=.7;browser.when={from:'18:00',to:'06:00',days:['odd']};
const stock=edited.actors!.find(a=>a.id==='stockbot')!;stock.look={bot:'loader',paint:'#456789',wear:.5,v:2};stock.follow='browser';stock.gap=24;
const game=shopScene(moved,{},{},edited);const p=game.people!.find(p=>p.id==='browser')!,bot=game.people![4];assert.deepEqual(p.range,[300,430]);assert.equal(bot.follow,p);assert.equal(bot.gap,24);
city.withSnapshot({day:1,min:1200,seed:3},()=>{assert(prepareCharacter(p,120).visible);assert.notDeepEqual(prepareCharacter(p,120),prepareCharacter(shopActors.browser,120));});
city.withSnapshot({day:2,min:1200,seed:3},()=>assert(!prepareCharacter(p,120).visible));city.withSnapshot({day:1,min:720,seed:3},()=>assert(!prepareCharacter(p,120).visible));
const legacy=structuredClone(source);delete legacy.actors;assert.deepEqual(shopScene(undefined,{},{},legacy).people,shopScene().people);
assert.throws(()=>compileActors([{...source.actors![0],instance:'missing'}],shopGeometry()));
console.log('Shop actor source PASS: original identities, '+rejected+' malformed definitions, relative ranges, edited human/robot appearance, follow references, day/night schedules, missing artwork and legacy scene defaults.');
