import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {mergeLevels} from '../../src/ssg/game/engine/level';
import {levelVehicleFrames,validateWorldVehicles} from '../../src/ssg/game/engine/level-vehicles';
import graph from '../../src/ssg/game/world/zone-graph.json';
import {validateZoneGraph} from '../../src/ssg/game/world/zone-graph';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {demoContent} from '../../src/ssg/game/demo';
const west=SCENES['boundary-west'],east=SCENES['boundary-east'];
assert.equal(west.width,320);assert.equal(east.width,320);
assert(!west.sudoOnly&&!east.sudoOnly,'both chunks are available in ordinary Test District Play');
validateWorldVehicles(SCENES,validateZoneGraph(graph));
const model=new SceneModel({say(){},open(){},changed(){}},west.data!,undefined,undefined,undefined,undefined,undefined,west.gameplay);
const joined=mergeLevels([{zone:'boundary-west',source:west.level!,dx:0,dh:0,width:320},{zone:'boundary-east',source:east.level!,dx:320,dh:0,width:320}]);
let crossed=false,returned=false,previous=170,max=170;
for(let i=0;i<780;i++){
 model.tick(1000/60,true);
 const frames=levelVehicleFrames(joined,()=>model);assert.equal(frames.length,1,'one live cart, including at the seam');
 const f=frames[0],x=f.part.dx;assert.equal(f.vehicle.id,'boundary-west/service');assert(Math.abs(x-previous)<2.1,'joined route has no seam jump');
 if(f.pose.zone==='boundary-east')crossed=true;if(crossed&&f.pose.zone==='boundary-west'&&x<200)returned=true;
 max=Math.max(max,x);previous=x;
}
assert(crossed&&returned&&max>=469,'actual Circuit mover crosses to east and returns');
const docs=new Map(sourceDocuments.map(d=>[d.id,d.validate(JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8')))]));
validateSourceDocuments(docs);
const source=structuredClone(docs.get('authored-scenes')) as any;
const edited=source.scenes.find((s:any)=>s.scene.id==='boundary-west');
edited.composition.instances.find((i:any)=>i.id==='overhang').placement.x=330;
docs.set('authored-scenes',source);const registry=pendingRegistry(docs);
assert.equal(demoContent({catalogue:registry})['boundary-west'],registry['boundary-west'],'private district Play uses pending catalogue sources');
assert.notEqual(registry['boundary-west'],SCENES['boundary-west'],'pending edits compile a fresh native scene');
console.log('Boundary example PASS: native catalogue/graph, one continuous real-mover cart crossing/return, prospective sources and pending Test District identity.');

// A walking person's key and appearance survive the logical seam; source-relative pictures
// are projected into the same joined world as the actual cart.
const walking=new SceneModel({say(){},open(){},changed(){}},west.data!,undefined,undefined,undefined,undefined,undefined,west.gameplay);
walking.peopleSources=west.peopleFlows!;
walking.peopleLevel={...west.level!,zones:{'boundary-west':{x:0,h:0,w:320},'boundary-east':{x:320,h:0,w:320}},vehicleZones:{'boundary-west':{x:0,h:0},'boundary-east':{x:320,h:0}}};
let walkerCrossed=false;const identity=new Map<string,{look:string;x:number}>();
for(let i=0;i<420;i++){
 walking.tick(1000/60,true);
 for(const p of walking.people.pictures['crossing-walker']??[]){
  const previous=identity.get(p.key);if(previous){assert.equal(p.look,previous.look);assert(Math.abs(p.x-previous.x)<1,'walking seam is continuous');}
  identity.set(p.key,{look:p.look,x:p.x});walkerCrossed||=p.zone==='boundary-east';
 }
}
assert(walkerCrossed,'same native walking flow reaches the destination chunk');
const checkpoint=walking.snapshot(),restoredWalker=new SceneModel({say(){},open(){},changed(){}},west.data!,undefined,undefined,undefined,undefined,undefined,west.gameplay);
restoredWalker.peopleSources=walking.peopleSources;restoredWalker.peopleLevel=walking.peopleLevel;restoredWalker.restore(checkpoint);
walking.tick(1000/60,true);restoredWalker.tick(1000/60,true);
assert.deepEqual(restoredWalker.people.pictures,walking.people.pictures,'current checkpoints continue the same walkers');

// Joined command ordering is independent of which source was visited first. Clipping
// uses source coordinates, while mobile artwork remains uncut unless explicitly requested.
const {ArtRegistry,drawCompositionSlot,beginLayeredFrame,flushLayeredSlot,artworkClip}=await import('../../src/ssg/game/art/core/composition');
const {frameView}=await import('../../src/ssg/game/art/core/view');
const {hitTestArtwork}=await import('../../src/ssg/game/authoring/selection');
const draws:string[]=[],pieces=new ArtRegistry();
pieces.register({type:'test.piece',version:1,label:'Piece',category:'test',fields:{},parts:['backdrop'],bounds:()=>({x:0,h:0,w:20,tall:20}),anchors:()=>({}),draw:(_c,_v,_p,_s,_pass,placement)=>{draws.push(String(placement.x));}});
const piece=(id:string,x:number,layer:'set'|'foreground',order:number)=>({id,type:'test.piece',props:{},placement:{x,h:0},layer,order});
const a=pieces.validate({version:1,scene:'west',instances:[piece('set',1,'set',20),piece('post',3,'foreground',0)]});
const b=pieces.validate({version:1,scene:'east',instances:[piece('set',2,'set',10)]});
const ctx=new Proxy({globalAlpha:1,getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})} as Record<string,unknown>,{get:(t,k:string)=>k in t?t[k]:()=>{},set:(t,k:string,v)=>{t[k]=v;return true;}}) as unknown as CanvasRenderingContext2D;
const view={...frameView(0),sharedLayers:true,zoneWindow:{left:0,right:320}};
for(const documents of [[a,b],[b,a]]){
 draws.length=0;beginLayeredFrame();for(const doc of documents)for(const slot of ['behind-player','foreground'] as const)drawCompositionSlot(ctx,pieces,doc,{view,state:{},reduced:false},slot);
 flushLayeredSlot('behind-player');assert.deepEqual(draws,['2','1']);flushLayeredSlot('foreground');assert.deepEqual(draws,['2','1','3']);
}
const background={...a.instances[0],layer:'backdrop' as const};
assert.equal(artworkClip(background,view),undefined,'isolated room backgrounds retain their approved coverage');
assert.equal(artworkClip(background,{...view,artworkScope:'mobile'}),undefined,'travelling artwork never inherits a chunk cut');
assert.equal(artworkClip(background,{...view,artworkScope:'static'})?.width,320);
assert.equal(artworkClip({...background,clip:'chunk'},{...view,artworkScope:'mobile'})?.width,320,'explicit mobile clips still apply');
assert.throws(()=>pieces.validate({...a,instances:[{...a.instances[0],clip:{x:0,h:20,w:-1,tall:20}}]}),/invalid artwork clip/);
const bounds={bounds:[{id:'piece',x:0,y:0,width:100,height:100,clip:{x:10,y:10,width:20,height:20}}]} as any;
assert.equal(hitTestArtwork(bounds,{x:5,y:5},0),undefined);assert.equal(hitTestArtwork(bounds,{x:15,y:15},0)?.id,'piece');
console.log('Boundary contracts PASS: native walking identity/checkpoints, shared source-independent layer order, foreground occlusion slot and explicit clipping/hit testing.');



// Pending source/history, download/import and protected local persistence carry these
// contracts unchanged into a freshly compiled native scene (scratch source store only).
const path=await import('node:path');
const {art}=await import('../../src/ssg/game/art');
const {ComposerModel}=await import('../../src/ssg/game/authoring/composer-model');
const {sceneCatalogueProjection}=await import('../../src/ssg/game/authoring/scene-catalogue-projection');
const {createDocumentBundle,readDocumentBundle}=await import('../../src/ssg/game/authoring/document-bundle');
const {AuthoringStore}=await import('../../src/ssg/game/authoring/server/store');
const evidence=path.resolve('../../.game-test-output/boundary-contracts');fs.mkdirSync(evidence,{recursive:true});
const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const file=path.join(root,d.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),file);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});
const make=()=>{const m=new ComposerModel(art,{},(doc,all)=>{if(doc.id==='authored-scenes')validateSourceDocuments(new Map([...docs,...all!.filter(d=>sourceDocuments.some(s=>s.id===d.id)).map(d=>[d.id,d.value] as const)]));},[sceneCatalogueProjection]);m.load(store.list().filter(d=>d.id==='authored-scenes'));return m;};
const composer=make(),child='authored.boundary-west';
composer.updateInstance(child,'overhang','Set source clip',n=>n.clip={x:300,h:180,w:80,tall:80});
composer.undo();assert.equal((composer.get(child).value as any).instances.find((n:any)=>n.id==='overhang').clip,undefined);composer.redo();
composer.updateInstance(child,'crossing-walker','Change native route speed',n=>(n.props.flow as any).speed=60);
const beforeInvalid=composer.list();assert.throws(()=>composer.updateInstance(child,'crossing-walker','Invalid destination',n=>(n.props.flow as any).route.at(-1).zone='missing-chunk'),/missing|disconnected/);assert.deepEqual(composer.list(),beforeInvalid,'invalid pending graph edit is atomic');
const imported=make();imported.importDocuments(readDocumentBundle(JSON.stringify(createDocumentBundle(composer.edits(),composer.list())),imported.list()));
assert.deepEqual(imported.get(child).value,composer.get(child).value);
const transaction=store.save(imported.edits()),fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});
const rebuilt=pendingRegistry(new Map(fresh.list().map(d=>[d.id,d.value])))['boundary-west'];
assert.equal(rebuilt.peopleFlows![0].flow.speed,60);assert.deepEqual(rebuilt.artwork!.instances.find(n=>n.id==='overhang')!.clip,{x:300,h:180,w:80,tall:80});
store.undo(transaction.transaction,Object.fromEntries(transaction.documents.map(d=>[d.id,d.revision])));
assert.equal(pendingRegistry(new Map(store.list().map(d=>[d.id,d.value])))['boundary-west'].peopleFlows![0].flow.speed,45,'protected undo restores the original native source');
const pausedBefore=JSON.stringify(walking.people);walking.setPaused(true);walking.tick(1000,true);assert.equal(JSON.stringify(walking.people),pausedBefore,'native pause freezes mobile progress');walking.setPaused(false);
console.log('Boundary authoring PASS: pending graph rejection, history, bundles, protected Save/undo, fresh native compilation and pause.');

const overhangSources=structuredClone(source),overhangScene=overhangSources.scenes.find((s:any)=>s.scene.id==='boundary-west');
overhangScene.composition.instances.find((n:any)=>n.id==='overhang').placement.x=4000;
const overhangDocs=new Map(docs);overhangDocs.set('authored-scenes',overhangSources);
const camera={...frameView(0),artworkScope:'static' as const,viewW:640,viewH:360,cam:3970,gy:300,sx:(x:number)=>x-3970,y:(h:number)=>300-h};
assert(pendingRegistry(overhangDocs)['boundary-west'].artworkVisible!(camera),'actual static artwork keeps its source visible far beyond logical chunk width');
overhangScene.composition.instances.find((n:any)=>n.id==='overhang').clip='chunk';
assert(!pendingRegistry(overhangDocs)['boundary-west'].artworkVisible!(camera),'explicit source clip removes the invisible overhang from residency');
console.log('Boundary visibility PASS: actual registered bounds retain an overhanging source, explicit chunk clipping removes it.');
