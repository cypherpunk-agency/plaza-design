import {gameSourceIdentity} from '../scene-system/source-identity.mts';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {gameplayScenes} from '../../src/ssg/game/authoring/gameplay-scenes';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {createPendingCity} from '../../src/ssg/game/authoring/pending-city';
import {pendingOpeningStory} from '../../src/ssg/game/authoring/pending-opening';
import {Game} from '../../src/ssg/game/runtime/game';
import {SCENES} from '../../src/ssg/game/scenes';
const base=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync(path.resolve('src/ssg/game',d.file),'utf8'))]));
// Each input map is immutable after construction; build its prospective registry once.
const contexts=new WeakMap<object,{registry:ReturnType<typeof pendingRegistry>;world:ReturnType<typeof createPendingCity>;openingStory:ReturnType<typeof pendingOpeningStory>}>();
function runtime(documents:ReadonlyMap<string,unknown>){let value=contexts.get(documents);if(!value){const registry=pendingRegistry(documents);value={registry,world:createPendingCity(documents.get('city-source'),documents),openingStory:pendingOpeningStory(documents,registry)};contexts.set(documents,value);}return value;}
function dispatch(scene:string,exit:any,documents=base){
 const{registry,world,openingStory}=runtime(documents),calls:any[]=[],g:any={here:scene,def:registry[scene],story:'free',t:0,openingStory,world,save:{flags:{},keyring:exit.needs?[exit.needs.key]:[]},hasScene:(id:string)=>!!registry[id],persistSave:()=>calls.push(['persist']),travel:(...v:any[])=>calls.push(['travel',...v]),hailTaxi:()=>calls.push(['taxi']),showMap:()=>calls.push(['map']),zh:{react:(...v:any[])=>calls.push(['refused',...v])}};
 (Game.prototype as any).useExit.call(g,exit);return{calls,flags:g.save.flags,world};
}
let defaults=0,edited=0,scenes=0;const rows:any[]=[];
for(const owner of gameplayScenes.filter(s=>s.id in SCENES)){
 const doc:any=base.get(owner.prefix+'-scene'),scene=SCENES[owner.id];assert(doc);assert.deepEqual(scene.exits.map(e=>e.id),(doc.exits??[]).map((e:any)=>e.id),owner.id+' has no extra native-only exit routes');scenes++;let ordinary=0;
 for(const authored of doc.exits??[]){
  const native=scene.exits.find(e=>e.id===authored.id);assert(native,owner.id+'/'+authored.id);assert.equal(native.to,authored.to);assert.equal(native.at,authored.at);
  if(native.engine)continue; // Geometry markers are handled by the physical level, not scene-cut dispatch.
  const result=dispatch(owner.id,native);assert(!result.calls.some(c=>c[0]==='refused'));
  if(native.action)assert.deepEqual(result.calls,[[native.action]]);
  else {assert.deepEqual(result.calls.filter(c=>c[0]==='travel'),[['travel',native.to,native.at]]);if(native.sets)assert.equal(result.flags[native.sets],true);ordinary++;}
  defaults++;
 }
 // Change every ordinary exit destination/arrival, not just one representative scene.
 if(ordinary){const documents=new Map(base),changed=structuredClone(doc),target=owner.id==='sandbox'?'library':'sandbox',arrival=SCENES[target].exits[0].id;
  for(const exit of changed.exits??[])if(!exit.action&&!exit.engine){exit.to=target;exit.at=arrival;}
  documents.set(owner.prefix+'-scene',changed);validateSourceDocuments(documents);const registry=pendingRegistry(documents);
  for(const exit of changed.exits??[])if(!exit.action&&!exit.engine){const native=registry[owner.id].exits.find(e=>e.id===exit.id)!;assert.equal(native.to,target);assert.equal(native.at,arrival);const result=dispatch(owner.id,native,documents);assert.deepEqual(result.calls.filter(c=>c[0]==='travel'),[['travel',target,arrival]]);edited++;}
  const bad=new Map(documents),invalid=structuredClone(changed);invalid.exits.find((e:any)=>!e.action&&!e.engine).at='missing-arrival';bad.set(owner.prefix+'-scene',invalid);assert.throws(()=>validateSourceDocuments(bad),owner.id+' rejects a dangling arrival');
 }
 rows.push({scene:owner.id,authoredExits:doc.exits?.length??0,ordinaryDestinationsEdited:ordinary});
}
assert.equal(scenes,19);assert(defaults>19);assert(edited>19);const report={status:'PASS',source:gameSourceIdentity(path.resolve('src/ssg/game')),scenes,defaultNativeDispatches:defaults,editedNativeDestinations:edited,rows,scope:'all declared exit routes; story overrides, transport internals and persistence are separate acceptance checks'},evidence=fs.mkdtempSync(path.resolve('../../.game-test-output/world-story-routes-'));fs.writeFileSync(path.join(evidence,'evidence.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,evidence}));
