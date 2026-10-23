/** Native joined interaction targets dispatch to their source owner, including colliding local IDs. */
import assert from 'node:assert/strict';
import authored from '../../src/ssg/game/scenes/authored.json';
import {createSceneRegistry,type SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {Game} from '../../src/ssg/game/runtime/game';
import {SceneHost} from '../../src/ssg/game/engine/host';
import {movingInteractions} from '../../src/ssg/game/engine/gameplay/moving-interactions';
const entry=structuredClone(authored.scenes.find(s=>s.scene.id==='vehicle-lab')!) as unknown as SceneCatalogue['scenes'][number];
const source=createSceneRegistry({},{version:1,scenes:[entry]})['vehicle-lab'];
const model=new SceneModel({say(){},open(){},changed(){}},source.data!,typeof source.rules==='function'?source.rules({} as never):source.rules,undefined,undefined,undefined,undefined,source.gameplay);
model.peopleLevel=source.level;
for(let i=0;i<1000;i++)model.tick(1000/60,true);
const session={state:()=>({owner:'vehicle-lab'})},otherSession={state:()=>({owner:'tunnel'})};
const eligibility=(_flags:unknown,s:unknown)=>{assert.equal(s,session,'permission uses the vehicle owner');return{ok:true};};
const remote:any={...source,uses:source.uses!.map(u=>({...u,eligibility,price:(_flags:unknown,s:unknown)=>{assert.equal(s,session,'price uses vehicle owner');return 2;}}))};
remote.uses.push({...remote.uses[0],id:'station-only',x:50});
remote.readables.push({...remote.readables[0],id:'station-only',x:50});
const local:any={id:'tunnel',name:'Tunnel',width:5000,spawn:100,exits:[],readables:[{id:'route-map',name:'LOCAL',pages:['Local map'],x:50,h:70}],uses:[]};
const captions:any[]=[],chosen:any[]=[],picked:string[]=[],sourceHost:any={model,def:remote,targets:SceneHost.prototype.targets,use:SceneHost.prototype.use,spotAt:SceneHost.prototype.spotAt,pick:(id:string)=>picked.push(id),react:(...a:any[])=>captions.push(a),choose:(...a:any[])=>chosen.push(a)},localHost:any={model:{attachmentOffsets:()=>undefined},targets:()=>[],spotAt:()=>null};
const game:any=Object.create(Game.prototype),said:any[]=[];
Object.assign(game,{here:'tunnel',hosts:new Map([['tunnel',localHost],['vehicle-lab',sourceHost]]),joinedZones:[{id:'vehicle-lab',dx:-2400,dh:180}],zoneTiers:new Map([['vehicle-lab','visible']]),
 sceneDefinition:(id:string)=>id==='tunnel'?local:remote,gameplayFor:(id:string)=>id==='tunnel'?otherSession:session,
 save:{flags:{},items:{},tokens:10},level:null,p:{x:0,y:0},t:0,term:{focused:false},hints:{done(){}},
 exitTargets:()=>[],say:(...args:any[])=>said.push(args),persistSave(){},syncHud(){},weatherHere:()=>({kind:'clear'}),flash(){},
});
Object.defineProperties(game,{story:{value:''},companionPresent:{value:false}});
const targets=game.targets(),maps=targets.filter((t:any)=>t.id==='read:route-map');
assert.equal(maps.length,2,'same local ID retains separate scene owners');
const remoteMap=maps.find((t:any)=>t.owner==='vehicle-lab'),live=movingInteractions(remote,model),map=live.readables!.find(r=>r.id==='route-map')!;
const device=targets.find((t:any)=>t.owner==='vehicle-lab'&&t.kind==='device'&&t.id==='shuttle');assert(device);
game.p.x=device.x;game.p.y=device.h;game.interact();assert.deepEqual(picked,['shuttle'],'native E reaches the actual source host device');
const spot=model.spots().find(s=>s.id==='shuttle')!;
Object.assign(game,{cam:device.x-200,gy:300,k:1,canvas:{width:1000,height:500,getBoundingClientRect:()=>({left:0,top:0,width:1000,height:500}),style:{}},hackLocked:()=>false});
game.onCanvasPointer({clientX:200,clientY:300-(spot.y+180+spot.h/2),preventDefault(){}},true);
assert.deepEqual(picked,['shuttle','shuttle'],'native pointer projects into the attached device owner');
assert.equal(remoteMap.x,map.x-2400);assert.equal(remoteMap.promptH,map.promptH!+180);
assert(!targets.some((t:any)=>t.owner==='vehicle-lab'&&t.id.endsWith(':station-only')),'ordinary stationary interactions stay at their source station');
game.useLife('read:route-map','vehicle-lab');assert.deepEqual(said.pop(),[map.name,map.pages,map.x-2400,(map.h??70)+180]);
game.p.x=remoteMap.x;game.p.y=remoteMap.h;game.interact();
assert.deepEqual(said.pop(),[map.name,map.pages,map.x-2400,(map.h??70)+180],'native E retains the selected remote target owner');
game.useLife('read:route-map');assert.deepEqual(said.pop(),['LOCAL',['Local map'],50,70]);
game.useLife('read:station-only','vehicle-lab');assert.equal(said.length,0,'foreign stationary targets cannot be invoked through the moving-target route');
// Use the actual runUse path, not an editor evaluator or direct source command dispatch.
let invoked=0;const use=live.uses![0];
game.runUse(use,(ctx:any)=>{assert.equal(ctx.gameplay,session);invoked++;return{pages:['OWNER RESPONSE']};},'vehicle-lab');
assert.equal(invoked,1);assert.deepEqual(captions.pop(),['use:'+use.id,['','OWNER RESPONSE']]);
// Native popup actions retain their owner and refresh live geometry at selection time.
const execute:any[]=[];game.runUse=(...args:any[])=>execute.push(args);
remote.uses[0]={...remote.uses[0],items:[{item:'parcel',label:'GIVE',use:remote.uses[0].use}]};game.save.items.parcel=1;
game.useLife('use:'+use.id,'vehicle-lab');assert.equal(chosen.length,1);chosen[0][2][0].run();
assert.equal(execute[0][2],'vehicle-lab','popup selection never falls back to the current zone');
const firstBox=chosen[0][4]();for(let i=0;i<100;i++)model.tick(1000/60,true);
const currentBox=chosen[0][4](),currentUse=movingInteractions(remote,model).uses![0];
assert.notEqual(currentBox.x,firstBox.x,'native item menu geometry follows subsequent Circuit motion');
assert.equal(currentBox.x,currentUse.x,'popup geometry stays local to its owning host');
sourceHost.popupOpen=true;assert.equal(game.interactionHost,sourceHost,'the foreign popup receives keyboard input');
sourceHost.popupOpen=false;sourceHost.overlayOpen=true;assert.equal(game.levelLocked(),true,'foreign conversation locks native movement');
sourceHost.overlayOpen=false;sourceHost.visionOn=true;assert.equal(game.interactionHost,sourceHost,'foreign hack vision keeps its owner after popup dismissal');
const tapped:string[]=[];sourceHost.poke=(id:string)=>tapped.push(id);
const nowSpot=model.spots().find(s=>s.id==='shuttle')!;
game.vptr=new Map([[1,{x:0,y:0}]]);game.vgest={kind:'tap'};
game.visionLift({pointerId:1,type:'pointerup',clientX:nowSpot.x-2400-game.cam,clientY:300-(nowSpot.y+180+nowSpot.h/2)});
assert.deepEqual(tapped,['shuttle'],'native hack-vision tap resolves the owner-local device after motion');
sourceHost.visionOn=false;assert.equal(game.interactionHost,localHost);
game.level={state:{vehicle:{id:'shuttle'}},source:{vehicles:[{id:'shuttle',zone:'vehicle-lab'}]}};
assert.equal(game.interactionHost,sourceHost,'riding keeps train controls attached to the Circuit owner');
game.nearest=()=>device;assert.equal(game.termMachine(),'shuttle','the terminal selects the vehicle owner machine');
Object.defineProperty(game,'openingStory',{value:{persona:()=>undefined}});game.resettableScenes=()=>[];
const terminal=game.ctx();assert.equal(terminal.machine,'shuttle');assert.match(terminal.shell.ls('shuttle'),/frame/i,'the actual terminal shell inspects the vehicle owner model');delete game.nearest;
localHost.popupOpen=true;assert.equal(game.interactionHost,localHost,'an existing local popup retains input priority');localHost.popupOpen=false;
game.level.source.vehicles[0].lift='lift';assert.equal(game.interactionHost,localHost,'existing lift input ownership remains unchanged');game.level=null;
game.joinedZones=[];assert.equal(game.interactionHost,localHost);game.useLife('read:route-map','vehicle-lab');assert.equal(said.length,0,'a departed owner cannot be invoked');
console.log('Joined interactions PASS: native targets/read/use, owner permissions/prices, colliding IDs, stationary exclusion, popup owner, movement lock and departure.');
