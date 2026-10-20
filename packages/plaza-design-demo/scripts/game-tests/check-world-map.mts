import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Composition } from '../../src/ssg/game/art/core/composition';
import { createWorldMapPreview } from '../../src/ssg/game/authoring/world-map';
import { SCENES, type SceneId } from '../../src/ssg/game/scenes';
import { mapKey, openMap, type MapState } from '../../src/ssg/game/ui/citymap';
import { PLACES } from '../../src/ssg/game/world/city';
import { serializeWorldDocument, snapshotWorld, validateWorldDocument, type WorldDocument } from '../../src/ssg/game/world/document';
import { sourceDocuments } from '../../src/ssg/game/authoring/source-documents';
// Use the real validated scene documents; only the isolated handoff below is synthetic.
const refs=Object.fromEntries(Object.keys(SCENES).map(id=>[id,id]));
const compositions: Record<string,Composition>={};
for(const descriptor of sourceDocuments.filter(d=>d.kind==='composition')){
  const value=JSON.parse(fs.readFileSync(path.resolve('src/ssg/game',descriptor.file),'utf8'));
  compositions[descriptor.id]=descriptor.validate(value) as Composition;
}
const sequences=[{id:'test:handoff',handoff:{scene:'capsule',entrance:'door'}}];
const context={compositions,sequences};
const doc=snapshotWorld(refs,[{id:'test:handoff',scene:'capsule',entrance:'door'}]);
assert.deepEqual(validateWorldDocument(doc,context),doc);
assert.deepEqual(JSON.parse(serializeWorldDocument(doc,context)),doc);
let rejected=0;
function bad(edit:(d: WorldDocument)=>void,pattern: RegExp) {
  const modified=structuredClone(doc);edit(modified);assert.throws(()=>validateWorldDocument(modified,context),pattern);rejected++;
}
bad(d=>{d.map.places[0].mapPosition![0]=-4;},/world\.map\.places\[0\]\.mapPosition\[0\]/);
bad(d=>{d.map.places[0].district='downtown';},/world\.map\.places\[0\]\.district/);
bad(d=>{d.scenes.pop();},/composition/);
bad(d=>{d.scenes[1].id=d.scenes[0].id;},/duplicate scene/);
bad(d=>{d.scenes[0].composition='absent';},/unknown composition/);
bad(d=>{d.scenes[0].composition=d.scenes[1].composition;},/another scene/);
bad(d=>{d.scenes[0].exits[0].to='beach';},/world\.scenes\[0\]\.exits\[0\]\.to/);
bad(d=>{d.transport.metro.order.reverse();},/world\.transport\.metro\.order/);
bad(d=>{d.rules.references[0]='inventedRule';},/world\.rules\.references\[0\]/);
bad(d=>{d.sequences[0].scene='moth';},/world\.sequences\[0\]\.scene/);
bad(d=>{(d as unknown as Record<string,unknown>).unexpected=true;},/world\.unexpected/);
assert.throws(()=>validateWorldDocument(doc,{...context,sequences:[{id:'test:handoff',handoff:{scene:'missing'}}]}),/unknown destination/);
assert.throws(()=>validateWorldDocument(doc,{...context,sequences:[{id:'test:handoff',handoff:{scene:'capsule',entrance:'missing'}}]}),/unknown entrance/);
assert.throws(()=>snapshotWorld({}),/real composition/);
const before=serializeWorldDocument(doc,context);
const opened: {scene:SceneId;entry:unknown}[]=[];
const canvas={width:640,height:360,getContext:()=>({})} as unknown as HTMLCanvasElement;
const view=createWorldMapPreview({canvas,document:doc,onOpenScene:(scene,entry)=>opened.push({scene,entry})});
const nativeBefore=openMap('view','downtown',null);
view.key('2');view.key('t');
assert.equal(view.getPreview().layer,'metro');assert.equal(view.getPreview().flat,true);
assert.equal(openMap('view','downtown',null).layer,nativeBefore.layer,'editor layer leaked to gameplay');
assert.equal(openMap('view','downtown',null).flat,nativeBefore.flat,'editor tilt leaked to gameplay');
view.setPreview({layer:'street',flat:false,scene:'downtown',time:137});
view.key('Enter');view.key('Enter');
assert.equal(view.selection()?.place.id,'downtown','real map keyboard selection resolves current place');
assert.equal(opened.length,0,'map selection must not travel or open a scene until explicitly requested');
view.openScene();assert.equal(opened.at(-1)?.scene,'downtown');
for(const place of PLACES) {
  const selection=view.selectPlace(place.id);
  assert.deepEqual(selection.place.scenes,place.scenes);
  view.openScene();assert.equal(opened.at(-1)?.scene,place.entrance);
  for(const scene of place.scenes) {view.openScene(scene);assert.equal(opened.at(-1)?.scene,scene);}
  selection.place.scenes.length=0;
  assert.ok(view.selection()!.place.scenes.length>0,'inspection escaped private document');
}
view.selectPlace('capsule');assert.throws(()=>view.openScene('beach'),/outside capsule/);
view.selectPlace('harbor');assert.match(view.selection()!.blocked,/HARBOR CLOSED/);
view.setPreview({harborOpen:true});assert.equal(view.selection()!.blocked,'');
view.setPreview({seenSceneIds:[]});assert.equal(view.selection()!.blocked,'NOT VISITED YET');
view.setPreview({seenSceneIds:'all',scene:'harbor'});assert.equal(view.selection()!.blocked,'YOU ARE HERE');
assert.throws(()=>view.setPreview({time:NaN}),/map\.preview\.time/);
assert.throws(()=>view.setPreview({scene:'missing' as SceneId}),/unknown scene/);
assert.equal(serializeWorldDocument(doc,context),before,'preview mutated world source');
// Default shipping map preference behavior remains enabled.
const native:MapState={view:openMap('view','downtown',null),scene:'downtown',ride:null,seen:()=>true,flag:()=>true,exitAccess:()=>({ok:true}),harborOpen:true,tokens:1,t:0,reduced:true,touch:false,tapMin:22,avoid:null};
mapKey(native,'3');assert.equal(openMap('view','downtown',null).layer,'above');
mapKey(native,nativeBefore.flat?'t':'1');
const root=path.resolve('../..');
fs.writeFileSync(path.join(root,'.game-test-output/evidence/S6-real-documents-world-map-contracts-20261016.json'),JSON.stringify({scenes:Object.keys(SCENES).length,places:PLACES.length,invalidDocumentsRejected:rejected+3,compositionCoverage:true,realCompositionInstances:Object.values(compositions).reduce((n,c)=>n+c.instances.length,0),sequenceReferences:true,mapPreviewIsolation:true,entryCallbacks:opened.length,rendering:'Delegates to existing drawCityMap; pixel verification remains with integrated renderer fixture.'},null,2));
console.log(`World/map contracts pass: ${Object.keys(SCENES).length} scenes, ${PLACES.length} places, ${rejected+3} invalid references/documents rejected, ${opened.length} scene-open callbacks verified.`);
