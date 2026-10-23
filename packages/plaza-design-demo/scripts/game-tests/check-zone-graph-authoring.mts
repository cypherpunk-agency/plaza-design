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
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
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
const graph=()=>model.get('zone-graph').value as ZoneGraphSource;
// the card's status line, and each field's plain-words problems
const status=()=>field('Zone graph problems').textContent,problemsOf=(name:string)=>rows().filter(e=>e.attributes['aria-label']===name+' problem').map(e=>e.textContent);
const seamRows=()=>rows().filter(e=>e.attributes['data-seam']),selected=()=>seamRows().find(e=>e.attributes['aria-pressed']==='true')?.attributes['data-seam'];
const pickSeam=(id:string)=>{const e=seamRows().find(e=>e.attributes['data-seam']===id);assert(e,'seam row '+id);e.onclick!();};
const pressed=(group:string)=>field(group).children.find(b=>b.attributes['aria-pressed']==='true')?.textContent;
assert.equal(status(),'✓ This seam meets both scenes.');
// the list: each seam as From → To in scene names, its kind, a tick
assert.deepEqual(seamRows().map(e=>e.attributes['data-seam']),graph().seams.map(s=>s.id));
assert.equal(seamRows()[0].attributes['aria-label'],'Walk: Tower → Tower annex, no problems');
assert.equal(seamRows()[1].attributes['aria-label'],'Stairs: Tower annex → Roof deck over the annex, no problems');
assert.equal(selected(),'tower-annex','the open scene\'s seam is selected');
assert(field('To scene').children.some(o=>o.value==='tower-deck'&&o.textContent==='Roof deck over the annex'),'scenes are picked by name, authored ones included');
assert.equal(pressed('Seam kind'),'Walk');
assert(!rows().some(e=>e.attributes['aria-label']==='From piece'),'a walk seam has no pieces');
assert.match(field('Seam diagram').innerHTML,/^<svg [^>]*aria-label="Tower and Tower annex, joined by a walk seam"/);
assert(field('To-zone starts at x')&&rows().some(e=>e.textContent==='Tower annex starts at x'),'the x offset is labelled in plain words');
assert(rows().some(e=>e.textContent==='Seams join two scenes so the player walks between them with no cut.'));
pickSeam('annex-deck');assert.equal(pressed('Seam kind'),'Stairs');assert(field('From piece').children.some(o=>o.value==='stairs-deck'));
assert.equal(field('From piece').value,'stairs-deck');assert(rows().some(e=>e.textContent==='The stair whose end lands on the other scene.'),'the stair piece is explained');
pickSeam('tower-annex');

// add a seam from the open scene, join it to the deck: the walk seam no longer meets the edge, listed inline; Align fixes it
const N=graph().seams.length;click('＋ Add seam');assert.equal(selected(),'seam-1');assert.deepEqual(graph().seams[N],{id:'seam-1',kind:'walk',a:{zone:'tower'},b:{zone:graph().seams[N].b.zone},dx:1600,dh:0});
change('From scene','tower-deck');change('To scene','tower-annex');
assert.deepEqual(problemsOf('To-zone starts at x'),['The two scenes don’t touch. For a walk, Tower annex starts at x 800 (the right edge of Roof deck over the annex). Use Align to edge.'],'the walk problem sits beside x, in plain words');
assert.match(status(),/^\d+ problems?: Save refuses this seam/);assert.match(seamRows()[N].attributes['aria-label'],/, \d+ problems?$/);
assert.match(field('Seam diagram').innerHTML,/class="seam bad"/,'the diagram marks the seam red');
click('Align to edge');assert.equal(graph().seams[N].dx,800);assert.deepEqual(problemsOf('To-zone starts at x'),[]);
assert.match(field('Seam diagram').innerHTML,/<rect class="zone-to" x="800" /,'the diagram follows the edit');
click('Door');assert.equal(graph().seams[N].kind,'door');
assert.deepEqual([problemsOf('From piece'),problemsOf('To piece')],[['Pick the door piece in Roof deck over the annex.'],['Pick the door piece in Tower annex.']]);
assert.deepEqual(field('From piece').children.map(o=>o.value),['','deck','floor-deck'],'pieces are the zone\'s level.* instances');
change('From piece','floor-deck');change('To piece','floor-street');change('To-zone starts at x','0');change('To-zone height','-100');
const edited=graph().seams[N];assert.deepEqual(edited,{id:'seam-1',kind:'door',a:{zone:'tower-deck',piece:'floor-deck'},b:{zone:'tower-annex',piece:'floor-street'},dx:0,dh:-100});
assert.equal(status(),'✓ This seam meets both scenes.','the deck → annex door closes the loop the stairs seam makes');
assert(seamRows().every(e=>e.attributes['aria-label'].endsWith('no problems')));
assert.deepEqual(worldProblems(graph(),zoneInfo(values(model.list())),zonePieces(values(model.list()))),[]);
// a loop that does not close is reported at the offsets
change('To-zone height','-90');assert.match(problemsOf('To-zone height').join(),/put Tower annex in two different places/);change('To-zone height','-100');
change('Seam id','deck-door');assert.equal(selected(),'deck-door');

// an invalid seam is rejected atomically: same zone on both sides, a bad id, a duplicate id
for(const [name,value] of [['To scene','tower-deck'],['Seam id','Deck Door'],['Seam id','tower-annex']] as const){
 const before=structuredClone(graph()),label=model.undoLabel;
 assert.throws(()=>api.edit('zone-graph','probe',{...before,seams:before.seams.map(s=>s.id==='deck-door'?name==='To scene'?{...s,b:{zone:'tower-deck'}}:{...s,id:value}:s)}));
 change(name,value);assert.deepEqual(graph(),before,name+' '+value+' is rejected');assert.equal(model.undoLabel,label);assert(host.children[1].textContent,'the reason is shown');
}
// the open links go to the scenes
{let opened='';const probe=new Element();mountZoneGraphAuthoring(probe as any,{documents:model.list(),openScene:(s:string)=>{opened=s;},openInstance:()=>{},scene:'tower',authoring:api} as any);
 const link=all(probe).find(e=>e.attributes['aria-label']==='Open to scene')!;link.onclick!();assert.equal(opened,'tower-annex');}
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
// the composer's read-only look: a tag per joined scene (name, side, canvas rect), the extent Fit joined frames, dimming
// with overlays, and Show joined scenes off draws the scene alone
const look=(environment:Record<string,unknown>,overlays=true)=>{const canvas=new Canvas();const result=preview.render(canvas as unknown as HTMLCanvasElement,{documents:shipped,composition:shipped.get('tower') as Composition,time:0,reduced:true,overlays,environment:{day:1,minute:720,seed:3,cameraH:0,zoom:1,flags:'{}',state:'{}',weather:'clear',...environment} as any});return {result,ops:canvas.ops};};
const atEdge=look({cameraX:1200});
assert.deepEqual(atEdge.result.joined,[{zone:'tower-annex',label:'Tower annex',x:400,y:0,width:800,height:540,side:'right'}]);
assert.deepEqual(atEdge.result.extent,{from:0,to:2400},'Fit joined frames the tower and the annex');
assert(atEdge.ops.some(o=>o[0]==='fillRect'&&o[1]===400&&o[3]===800),'the annex is dimmed as read-only beside the tower');
const off=look({cameraX:1200,showJoined:false});
assert.equal(off.result.joined,undefined);assert.deepEqual(off.result.extent,{from:0,to:2400},'Fit joined still knows where they are');
assert(!annexWindow(off.ops),'Show joined scenes off: the annex is not drawn');
assert.deepEqual(look({cameraX:0}).result.joined,[],'off screen: no tag');
console.log('Zone graph authoring PASS: World › Zones edits through the actual model/history/bundle, invalid seams reject atomically, problems listed inline and refused by protected Save, Save/reload/byte undo, live neighbour in the composer preview. Evidence: '+root);
process.exit(0);
