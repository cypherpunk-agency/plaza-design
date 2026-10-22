/**
 * World › Zones (authoring/zone-graph-authoring.ts): the panel's typed controls edit world/zone-graph.json through the
 * actual ComposerModel (history, bundle), an invalid seam is rejected atomically, seam problems are listed inline and
 * refused by protected Save, a valid edit Saves and reloads; the composer preview draws the joined neighbour live.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {mountZoneGraphAuthoring} from '../../src/ssg/game/authoring/zone-graph-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {ComposerModel,type EditorDocument} from '../../src/ssg/game/authoring/app';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';
import {createNativePreview} from '../../src/ssg/game/authoring/native-preview';
import {nativeSceneAdapters} from '../../src/ssg/game/authoring/scene-adapters';
import {declaredScene} from '../../src/ssg/game/engine/gameplay/declared-scene';
import {authoredDocuments} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import type {SceneCatalogue} from '../../src/ssg/game/engine/gameplay/scene-catalogue';
import {art,type Composition} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {validateZoneGraph,worldProblems,type ZoneGraphSource} from '../../src/ssg/game/world/zone-graph';
import {zoneInfo,zonePieces} from '../../src/ssg/game/authoring/zone-graph-context';

const evidence=path.resolve('../../.game-test-output/zone-graph-authoring');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),initial=store.list(),entry=sourceDocuments.find(d=>d.id==='zone-graph')!;
assert.equal(entry.kind,'transport');assert.equal(entry.file,'world/zone-graph.json');
const values=(docs:readonly EditorDocument[])=>new Map(docs.map(d=>[d.id,d.value]));
// the authored zone lab's pieces come from the pending catalogue, so the stairs seam's pieces are checked
assert.deepEqual([zonePieces(values(initial))['tower-annex']?.includes('stairs-deck'),zonePieces(values(initial))['tower-deck']?.includes('floor-deck')],[true,true]);

// the editor's own per-edit rule for this document (entry.ts validateDocument): the shape; problems against the zones are listed and refused on Save
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
const model=new ComposerModel(art,context,d=>{if(d.id==='zone-graph')validateZoneGraph(d.value);});model.load(initial);
let handle:any;
const api={get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>{model.edit(id,label,()=>value);handle?.refresh?.();}};
const host=new Element();handle=mountZoneGraphAuthoring(host as any,{documents:model.list(),openScene:()=>{},openInstance:()=>{},scene:'tower',authoring:api} as any);
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],rows=()=>all(host);
const field=(name:string)=>{const e=rows().find(e=>e.attributes['aria-label']===name);assert(e,'field '+name);return e;};
const change=(name:string,value:string)=>{const e=field(name);e.value=value;e.onchange!();};
const click=(label:string)=>{const e=rows().find(e=>e.textContent===label&&e.onclick);assert(e,'button '+label);assert(!e.disabled,label+' is disabled');e.onclick!();};
const problems=()=>field('Zone graph problems').children.map(c=>c.textContent);
const graph=()=>model.get('zone-graph').value as ZoneGraphSource;
assert.deepEqual(problems(),['No problems: every seam meets its zones.']);
assert.deepEqual(field('Seam').children.map(o=>o.value),['tower-annex','annex-deck','station-quay','quay-checkout','checkout-yard','yard-shed']);
assert(field('Zone b').children.some(o=>o.value==='tower-deck'),'zones are picked from the scenes, authored ones included');

// add a seam from the open scene, join it to the deck: the walk seam no longer meets the edge, listed inline; Align fixes it
const N=graph().seams.length;click('Add seam');assert.equal(field('Seam').value,'seam-1');assert.deepEqual(graph().seams[N],{id:'seam-1',kind:'walk',a:{zone:'tower'},b:{zone:graph().seams[N].b.zone},dx:1600,dh:0});
change('Zone a','tower-deck');change('Zone b','tower-annex');
assert.match(problems().join(),/seam-1: a walk seam puts tower-annex at the edge of tower-deck \(dx 800, not 1600\)/);
click('Align');assert.equal(graph().seams[N].dx,800);
change('Seam kind','door');assert.match(problems().join(),/seam-1: a door seam names the piece on both sides/);
assert.deepEqual(field('Piece a').children.map(o=>o.value),['','deck','floor-deck'],'pieces are the zone\'s level.* instances');
change('Piece a','floor-deck');change('Piece b','floor-street');change('Offset dx','0');change('Offset dh','-100');
const edited=graph().seams[N];assert.deepEqual(edited,{id:'seam-1',kind:'door',a:{zone:'tower-deck',piece:'floor-deck'},b:{zone:'tower-annex',piece:'floor-street'},dx:0,dh:-100});
assert.deepEqual(problems(),['No problems: every seam meets its zones.'],'the deck → annex door closes the loop the stairs seam makes');
assert.deepEqual(worldProblems(graph(),zoneInfo(values(model.list())),zonePieces(values(model.list()))),[]);
change('Seam id','deck-door');assert.equal(field('Seam').value,'deck-door');

// an invalid seam is rejected atomically: same zone on both sides, a bad id, a duplicate id
for(const [name,value] of [['Zone b','tower-deck'],['Seam id','Deck Door'],['Seam id','tower-annex']] as const){
 const before=structuredClone(graph()),label=model.undoLabel;
 assert.throws(()=>api.edit('zone-graph','probe',{...before,seams:before.seams.map(s=>s.id==='deck-door'?name==='Zone b'?{...s,b:{zone:'tower-deck'}}:{...s,id:value}:s)}));
 change(name,value);assert.deepEqual(graph(),before,name+' '+value+' is rejected');assert.equal(model.undoLabel,label);assert(host.children[0].textContent,'the reason is shown');
}
// history and the downloaded bundle carry the same document
const pending=structuredClone(graph());model.undo();assert.notDeepEqual(graph(),pending);model.redo();assert.deepEqual(graph(),pending);
const receiver=new ComposerModel(art,context,d=>{if(d.id==='zone-graph')validateZoneGraph(d.value);});receiver.load(initial);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('zone-graph').value,pending);
assert.deepEqual(model.edits().map(e=>e.id),['zone-graph']);
validateSourceDocuments(values(model.list()));

// protected Save: refuses a graph with seam problems before writing, round-trips the valid one, undoes to the bytes
const file=path.join(root,entry.file),bytes=fs.readFileSync(file,'utf8'),doc=store.read('zone-graph');
const misaligned=structuredClone(pending);misaligned.seams[0].dx=1500;
const unknownPiece=structuredClone(pending);unknownPiece.seams[1].a.piece='nowhere';
for(const bad of [misaligned,unknownPiece]){assert.throws(()=>store.save([{id:'zone-graph',revision:doc.revision,value:bad}]),/zone graph|walk seam|no level piece/);assert.equal(fs.readFileSync(file,'utf8'),bytes);}
const saved=store.save(model.edits().map(e=>({id:e.id,revision:e.revision,value:e.value})));model.confirmSaved(saved.documents);assert.equal(model.dirty(),false);
assert.deepEqual(new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('zone-graph').value,pending);
assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),pending);
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(file,'utf8'),bytes);

// the composer preview: the Tower lab with its pending seams draws the annex beside it, clipped to the annex's window
class Canvas{width=960;height=540;ops:unknown[][]=[];getContext(){return new Proxy({},{get:(_o,key)=>key==='canvas'?this:key==='measureText'?(s:string)=>({width:s.length*6}):key==='getTransform'?()=>({a:1,b:0,c:0,d:1,e:0,f:0}):key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):key==='getImageData'||key==='createImageData'?(...a:number[])=>({data:new Uint8ClampedArray((a.length===2?a[0]*a[1]:a[2]*a[3])*4)}):(...a:unknown[])=>{this.ops.push([key,...a]);},set:()=>true});}}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Canvas()}});
// as the composer passes them: authored scenes' compositions projected from their catalogue
const shipped=values([...initial,...authoredDocuments(initial.find(d=>d.id==='authored-scenes')!)]),catalogue=shipped.get('authored-scenes') as SceneCatalogue;
const preview=createNativePreview(nativeSceneAdapters,undefined,id=>{const e=catalogue.scenes.find(s=>s.scene.id===id);return e&&{validate:v=>art.validate(v),definition:(c,_s,o)=>declaredScene(e.scene,c,e.gameplay,o,e.devices)};});
const draw=(documents:Map<string,unknown>,cameraX:number)=>{const canvas=new Canvas();preview.render(canvas as unknown as HTMLCanvasElement,{documents,composition:shipped.get('tower') as Composition,time:0,reduced:true,overlays:false,environment:{day:1,minute:720,seed:3,cameraX,cameraH:0,zoom:1,flags:'{}',state:'{}',weather:'clear'}});return canvas.ops;};
const annexWindow=(ops:unknown[][])=>ops.some(o=>o[0]==='rect'&&o[1]===400&&o[2]===0&&o[3]===800&&o[4]===540);
const alone=new Map([...shipped,['zone-graph',{version:1,seams:[]}]]);
assert(annexWindow(draw(shipped,1200)),'the annex (at dx 1600) is drawn in its window, 400 px in from the left at camera 1200');
assert(!annexWindow(draw(alone,1200)),'a scene with no seams is drawn alone');
assert.deepEqual(draw(shipped,0),draw(alone,0),'a neighbour off screen changes nothing');
const moved=new Map(shipped);moved.set('zone-graph',{version:1,seams:[{...pending.seams[0],dx:1500}]});
assert(draw(moved,1200).some(o=>o[0]==='rect'&&o[1]===300&&o[3]===800),'the pending (unsaved) seam places the neighbour');
console.log('Zone graph authoring PASS: World › Zones edits through the actual model/history/bundle, invalid seams reject atomically, problems listed inline and refused by protected Save, Save/reload/byte undo, live neighbour in the composer preview. Evidence: '+root);
process.exit(0);
