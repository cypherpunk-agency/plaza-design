/** Actual SceneHost popup/follow methods distinguish vehicle motion from walking away. */
import assert from 'node:assert/strict';
import authored from '../../src/ssg/game/scenes/authored.json';
import {createSceneRegistry,type SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SceneHost} from '../../src/ssg/game/engine/host';
const entry=structuredClone(authored.scenes.find(s=>s.scene.id==='vehicle-lab')!) as unknown as SceneCatalogue['scenes'][number];
const scene=createSceneRegistry({},{version:1,scenes:[entry]})['vehicle-lab'];
const model=new SceneModel({say(){},open(){},changed(){}},scene.data!,typeof scene.rules==='function'?scene.rules({} as never):scene.rules,undefined,undefined,undefined,undefined,scene.gameplay);model.peopleLevel=scene.level;
const h:any=Object.create(SceneHost.prototype),placed:any[]=[];
let closed=0,cam=0;
const popup={isOpen:false,dev:null as string|null,boxes:[],open(id:string){this.dev=id;this.isOpen=true;},place(at:unknown){placed.push(at);},close(){this.isOpen=false;h.chosen=null;closed++;}};
Object.assign(h,{model,popup,player:{x:0,h:0},chosen:null,seen:new Map(),uiTop:0,
 vision:{isOpen:false,presentHint(){},see(){}},schem:{isOpen:false,presentHint(){}},panels:{isOpen:false},fx:{update(){}},
 shield:()=>[],extras:()=>[],crowd:()=>[],sync(){},room:()=>undefined,popupItems:()=>[{label:'USE',run(){}}],
});
const project=(x:number,h:number)=>({x:x-cam,y:300-h});
const follow=()=>h.follow(project,1000,h.player);
const spot=()=>model.spots().find(s=>s.id==='shuttle')!;
h.player={x:spot().x+10,h:0};cam=spot().x-300;follow();h.pick('shuttle');
assert(popup.isOpen);const start=spot().x;
for(let i=0;i<1000;i++)model.tick(1000/60,true);
assert(spot().x>start+36,'the actual car travels farther than the walk-away threshold');
h.player.x=spot().x+10;cam=spot().x-300;follow();
assert(popup.isOpen,'native device popup remains open while riding with its device');
assert.equal(placed.at(-1).x,300,'device popup follows its live model spot');
h.player.x+=40;follow();assert(!popup.isOpen,'walking away relative to the device still closes it');
// Ordinary item-use menus follow a pure source geometry query, without a second updater.
let box:{x:number;y:number;w:number;h:number}|null={x:150,y:0,w:40,h:46};
h.player={x:160,h:0};cam=0;h.choose('use:speaker','SPEAKER',[{label:'GIVE',run(){}}],box,()=>box);
assert(popup.isOpen);box={x:1350,y:100,w:40,h:46};h.player={x:1360,h:100};cam=1200;follow();
assert(popup.isOpen,'ordinary popup travels with its anchor');assert.equal(placed.at(-1).x,150);assert.equal(placed.at(-1).y,177);
const checkpoint=JSON.stringify(model.snapshot());follow();follow();assert.equal(JSON.stringify(model.snapshot()),checkpoint,'popup geometry reads never tick or modify gameplay');
box=null;follow();assert(!popup.isOpen,'a removed source anchor closes the menu');
h.player={x:160,h:0};cam=0;h.choose('rest:bench','BENCH',[],{x:150,y:0,w:40,h:46});h.player.x+=40;follow();
assert(!popup.isOpen,'stationary menus preserve the original walk-away behavior');assert.equal(closed,3);
console.log('Moving popup PASS: actual Circuit device motion, native pick/choose/follow, relative walk-away, dynamic ordinary anchors, removal and pure gameplay reads.');
