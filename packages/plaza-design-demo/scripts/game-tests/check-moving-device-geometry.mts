import {runtimeFixture} from './runtime-fixture.mts';
/** Devices, hacking targets and artwork share one moving attachment geometry; no paint tick or copied save state. */
import assert from 'node:assert/strict';
import authored from '../../src/ssg/game/scenes/authored.json';
import {art,resolveComposition,type ChunkDocument} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {createSceneRegistry,type SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {manifestAnchor} from '../../src/ssg/game/engine/gameplay/manifest-geometry';
import {bindingDefaults} from '../../src/ssg/game/engine/gameplay/binding-sources';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SceneHost} from '../../src/ssg/game/engine/host';
import {Game} from '../../src/ssg/game/runtime/game';
import {levelArrive,levelStep,levelInteract,type Level} from '../../src/ssg/game/engine/level';
const original=authored.scenes.find(s=>s.scene.id==='vehicle-lab')!,view={...frameView(0),viewW:640,viewH:360,gy:300,y:(h:number)=>300-h};
// Interaction projection must not prepare unrelated scenery just to find a panel's anchor.
const selectedDoc=art.validate(original.composition),selectedEnv={view,bindings:bindingDefaults(selectedDoc),state:{},reduced:false};
const fullPanel=resolveComposition(art,selectedDoc,selectedEnv).find(r=>r.instance.id==='cab-panel')!;
selectedDoc.instances.push({id:'unrelated',type:'sandbox.sensor',props:{},placement:{x:10,h:0},layer:'set',order:999,bindings:{snapshot:'not-prepared'}});
assert.deepEqual(resolveComposition(art,selectedDoc,selectedEnv,['cab-panel'])[0],fullPanel,'selected geometry resolves the same ancestors without unrelated state');
assert.throws(()=>resolveComposition(art,selectedDoc,selectedEnv),/not-prepared/,'ordinary full scene resolution still enforces every binding');
assert.throws(()=>resolveComposition(art,selectedDoc,selectedEnv,['missing']),/Missing composition instance/);
for(const attachment of ['frame','nested','children','root'] as const){
 const entry=structuredClone(original) as unknown as SceneCatalogue['scenes'][number],rows=entry.composition.instances,panel=rows.find(n=>n.id==='cab-panel')!;
 if(attachment==='nested')panel.attach={instance:'car2',anchor:'origin'};
 if(attachment==='children'){delete panel.attach;entry.composition.instances=rows.filter(n=>n!==panel);rows.find(n=>n.id==='shuttle')!.children=[panel];}
 if(attachment==='root')entry.scene.manifest!.devices!.shuttle={instance:'shuttle',anchor:'origin',x:24,h:46};
 const scene=createSceneRegistry({},{version:1,scenes:[entry]})['vehicle-lab'],rules=typeof scene.rules==='function'?scene.rules({} as never):scene.rules;
 const make=()=>{const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,rules,undefined,undefined,undefined,undefined,scene.gameplay);m.peopleLevel=scene.level;return m;},model=make(),data=JSON.stringify(scene.data);
 const check=()=>{const env=scene.visualEnvironment!(view,{m:model,hover:null,layer:'all'}),live=resolveComposition(art,entry.composition,env),target=entry.scene.manifest!.devices!.shuttle,row=live.find(r=>r.instance.id===(typeof target==='string'?target:target.instance))!,point=manifestAnchor(row,target),spot=model.spots().find(s=>s.id==='shuttle')!;
  assert.equal(spot.x,point.x,attachment+' device and artwork x agree');assert.equal(spot.y,point.h,attachment+' authored height offset follows the frame');
  const targets=SceneHost.prototype.targets.call({model,def:scene} as SceneHost);assert.equal(targets.find(t=>t.id==='shuttle')!.x,spot.x,'the real host uses projected targets');return spot;};
 const first=check();for(let i=0;i<1000;i++)model.tick(1000/60,true);const moved=check();assert(moved.x>first.x+50,'device moves with the actual Circuit service');
 const before=JSON.stringify(model.snapshot());for(let i=0;i<5;i++)check();assert.equal(JSON.stringify(model.snapshot()),before,'geometry and target reads cannot advance simulation');assert.equal(JSON.stringify(scene.data),data,'source device coordinates are never rewritten');
 const restored=make();restored.restore(model.snapshot());assert.deepEqual(restored.spots(),model.spots(),'current-format mover reload restores the same attached device position');
}
// A descending walkable car can carry a device below the original ground: its prompt must use the live floor.
const entry=structuredClone(original) as unknown as SceneCatalogue['scenes'][number],frame=entry.composition.instances.find(n=>n.id==='shuttle')!,vehicle=frame.props.vehicle as any;
vehicle.route.legs[0].to.h=-100;vehicle.berths.find((b:any)=>b.id==='east').h=-100;vehicle.berths.find((b:any)=>b.id==='east').floor='lower-platform';
entry.composition.instances.push({id:'lower-platform',type:'level.floor',props:{width:2500,label:'Lower platform'},placement:{x:0,h:-100},layer:'logic',order:100});
const scene=createSceneRegistry({},{version:1,scenes:[entry]})['vehicle-lab'],m=new SceneModel({say(){},open(){},changed(){}},scene.data!,typeof scene.rules==='function'?scene.rules({} as never):scene.rules,undefined,undefined,undefined,undefined,scene.gameplay);m.peopleLevel=scene.level;
const p={x:224,y:0,vy:0,face:1,onGround:true,moving:false},lv:Level={source:scene.level!,state:levelArrive(scene.level!,p,0)};levelStep(lv,p,0,1,m);assert(levelInteract(lv,'vehicle:shuttle',p,m));
for(let i=0;i<1100;i++){m.tick(1000/60,true);levelStep(lv,p,0,1,m);}assert(p.y< -10,'fixture actually descends with the player aboard');
const targets=(Game.prototype as any).targets.call(runtimeFixture(Game,{def:scene,exitTargets:()=>[],lifeTargets:()=>[],zh:{model:m,targets:()=>SceneHost.prototype.targets.call({model:m,def:scene} as SceneHost)},save:{flags:{}},platforms:[],scenes:{level:lv},p,movers:m,story:'',companionPresent:false})),target=targets.find((t:any)=>t.id==='shuttle');
assert(Math.abs(target.h-p.y)<1e-7,'the actual game offers a moving device on its live car floor, including below zero');
assert.equal(art.validate(entry.composition).scene,'vehicle-lab');
console.log('Moving device geometry PASS: real service, root/nested/child attachments, unchanged source, pure reads, mover reload, actual host targets and descending-car game prompts.');
