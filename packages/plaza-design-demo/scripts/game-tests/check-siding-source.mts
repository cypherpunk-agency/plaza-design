/** The actual P14 destination is editable source and an ordinary shared level, not a scene controller. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SCENES} from '../../src/ssg/game/scenes';
import * as city from '../../src/ssg/game/world/city';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import {levelArrive,levelUp,levelStep,levelFloor,type Level} from '../../src/ssg/game/engine/level';
import {art} from '../../src/ssg/game/art';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {readQuery} from '../../src/ssg/game/engine/gameplay/queries';
import {fixtureSceneRules} from './model-gameplay-fixture.mts';
import {boardRide} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {levelVehicleFrames,arriveVehicleLevel} from '../../src/ssg/game/engine/level-vehicles';

assert.equal(city.TRANSPORT.siding.scene,'metro-siding');
assert.equal(city.placeOf('metro-siding').id,city.placeOf('harbor').id);
function walk(scene=SCENES['metro-siding']){
 const p={x:scene.spawn,y:0,vy:0,face:1,onGround:true,moving:false},source=scene.level!;
 assert(source);const lv:Level={source,state:levelArrive(source,p,scene.spawnH??0)};
 assert.equal(levelFloor(lv).id,'floor-siding');p.x=600;
 assert(levelUp(lv,p),'the ordinary stair has a reachable boarding end');
 const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,scene.rules as any);m.setPaused(true);
 for(let i=0;i<400&&lv.state.ride;i++)levelStep(lv,p,1,1,m);
 assert.equal(lv.state.ride,null);assert.equal(levelFloor(lv).id,'floor-service');assert.equal(p.y,144);
 const door=scene.exits.find(e=>e.id==='harbor')!;
 assert.equal(door.to,'harbor');assert.equal(door.at,'metro');assert.equal(door.arriveH,144);
 assert(door.x>=levelFloor(lv).x&&door.x<=levelFloor(lv).x+levelFloor(lv).w);
 assert(scene.exits.find(e=>e.id==='train')!.engine,'the arrival marker must not offer a cut back into a moving train');
 return door.x;
}
assert.equal(walk(),860);
assert(SCENES['metro-siding'].introOnFoot,'siding response waits until alighting');
assert.equal((SCENES['metro-siding'].intro as string[]).length,2);

const root=path.resolve('src/ssg/game'),documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const make=()=>{const m=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);m.load(documents);return m;};
const model=make(),id='authored.metro-siding';
model.edit(id,'Move service door',value=>{const c=structuredClone(value) as any;c.instances.find((r:any)=>r.id==='service-door').placement.x=880;return c;});
assert.equal(walk(pendingRegistry(new Map(model.list().map(d=>[d.id,d.value])))['metro-siding']),880);
model.undo();assert.equal((model.get(id).value as any).instances.find((r:any)=>r.id==='service-door').placement.x,860);model.redo();
// Edit the shipping physical vehicle, not a demonstration service or a platform drawing.
const trainDocument=sourceDocuments.find(d=>d.file==='scenes/train/composition.json')!.id;
function berth(registry:typeof SCENES,expected:number){
 const scene=registry.train.bindWorld!({city,metro:createLineSystem()});
 const m=new SceneModel({say(){},open(){},changed(){}},scene.data!,fixtureSceneRules(scene));
 m.gameplayQuery=id=>readQuery(id,{flags:{},items:{},tokens:0},{definition:scene.gameplay!});m.setPaused(true);boardRide(m,'galleria',330);
 const frame=levelVehicleFrames(scene.level!,m)[0];
 assert.equal(frame.pose.zone,'galleriaStation');assert.equal(frame.berth?.id,'galleria');assert.equal(frame.part.dx,expected);
 const p={x:780,y:0,vy:0,face:1,onGround:true,moving:false};
 const lv=arriveVehicleLevel(scene.level!,p,m,'train','line0',0);
 assert.equal(p.x,expected+780,'reloaded native arrival follows the edited berth');
 assert.equal(lv.state.floor,'cab-frame/car3.deck');
}
berth(SCENES,150);
model.edit(trainDocument,'Move Galleria train berth',value=>{
 const c=structuredClone(value) as any,v=c.instances.find((r:any)=>r.id==='cab-frame').props.vehicle;
 v.berths.find((b:any)=>b.id==='galleria').x=180;
 const legs=v.route.legs.filter((l:any)=>l.zone==='galleriaStation');legs[0].to.x=180;legs[1].from.x=180;
 return c;
});
const registryOf=(m:ComposerModel)=>pendingRegistry(new Map(m.list().map(d=>[d.id,d.value])));
berth(registryOf(model),180);model.undo();berth(registryOf(model),150);model.redo();
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
assert.equal(walk(pendingRegistry(new Map(receiver.list().map(d=>[d.id,d.value])))['metro-siding']),880);
berth(registryOf(receiver),180);
const disk=fs.mkdtempSync(path.resolve('../../.game-test-output/siding-source-'));
for(const d of sourceDocuments){const to=path.join(disk,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,d.file),to);}
const store=new AuthoringStore({root:disk,documents:sourceDocuments,validateAll:validateSourceDocuments});
store.save(model.edits().map(d=>({...d,revision:store.read(d.id).revision})));
const saved=new Map(store.list().map(d=>[d.id,d.value]));
assert.equal(walk(pendingRegistry(saved)['metro-siding']),880);assert.equal(walk(),860,'shipping source stays isolated');
berth(pendingRegistry(saved),180);berth(SCENES,150);
console.log('Siding/physical train authoring PASS: shared stair, actual vehicle berth edit/history/bundle/protected Save and native arrival after source reload; shipping source stays isolated.');
