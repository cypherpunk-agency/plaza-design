import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {art,type ChunkDocument} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {compositionWorkspaces,workspaceDocuments,workspaceSequences,sequenceSource} from '../../src/ssg/game/authoring/workspace';
import {sequenceProgram} from '../../src/ssg/game/art/core/sequence';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {createNativePreview} from '../../src/ssg/game/authoring/native-preview';
import {nativeSceneAdapters,authoredSceneAdapter} from '../../src/ssg/game/authoring/scene-adapters';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {measureArtwork} from '../../src/ssg/game/art/core/measure';

const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);model.load(documents);
const snapshot=model.inspectDocuments(),before=JSON.stringify(snapshot),workspace=compositionWorkspaces(snapshot).find(w=>w.id==='boundary-example')!;
assert(workspace.chunks.length>=3);assert(workspace.chunks.every(d=>snapshot.includes(d)),'Workspace references original source documents');
assert.deepEqual(workspaceDocuments(workspace.id,snapshot),workspace.chunks);
assert.throws(()=>workspaceDocuments('missing',snapshot),/Unknown composition/);
assert.equal(JSON.stringify(snapshot),before,'Navigation must not synthesize source wrappers');
assert.equal(sequenceSource('boundary-pan',snapshot,workspace.id),workspaceSequences(workspace.id,snapshot)[0],'sequence entry points share chooser scope and original document identity');
assert.equal(sequenceSource('glide',snapshot,workspace.id),undefined,'a link cannot introduce another composition’s direction');
assert.equal(sequenceSource('glide',snapshot,'harbor-world')!.id,'sequence-opening');
assert.equal(sequenceSource('taxi',snapshot)!.id,'sequence-taxi','standalone cutscenes remain accessible');
assert.deepEqual(workspaceDocuments('harbor-world',snapshot.filter(d=>(d.value as ChunkDocument)?.scene!=='boundary-door')),workspaceDocuments('harbor-world',snapshot),'opening one workspace does not resolve another workspace’s chunk sources');

function canvas(){let tracker!:CanvasRenderingContext2D;measureArtwork(ctx=>{tracker=ctx;});const transforms=new Set(['getTransform','save','restore','translate','scale','rotate','transform','setTransform','resetTransform']),values:Record<string,unknown>={globalAlpha:1,measureText:(text:string)=>({width:text.length*6})};const ctx=new Proxy(values,{get(o,k:string){if(transforms.has(k))return(...args:unknown[])=>(tracker as any)[k](...args);if(k in o)return o[k];if(k.startsWith('create'))return()=>({addColorStop(){}});return()=>{};},set(o,k:string,v){o[k]=v;return true;}});return{width:960,height:540,getContext:()=>ctx};}
Object.assign(globalThis,{document:{createElement:canvas}});
const preview=createNativePreview(nativeSceneAdapters,undefined,(scene,request)=>authoredSceneAdapter(scene,request.documents));
const request={scope:{composition:workspace.id,chunks:workspace.chunks.map(d=>(d.value as ChunkDocument).scene)},workspace:{x:0,h:0,zoom:.5},sourceVersion:model.sourceVersion,composition:workspace.chunks[0].value as ChunkDocument,documents:new Map(snapshot.map(d=>[d.id,d.value])),time:0,reduced:true,overlays:false,environment:{cameraX:0,day:1,minute:580,seed:3}};
const frame=preview.render(canvas() as unknown as HTMLCanvasElement,request);
assert(frame.regions!.length>=3,'Native frame contains all composition members');
assert(frame.regions!.every(r=>request.scope.chunks.includes(r.scene)),'Unrelated chunks stay outside the editing scope');
assert.equal(frame.workspaceScale,.5);
const sequenceDocument=workspaceSequences(workspace.id,snapshot)[0];assert(sequenceDocument);
const timeline=sequenceProgram({[sequenceDocument.id]:sequenceDocument.value as ChunkDocument});
const directed=preview.render(canvas() as unknown as HTMLCanvasElement,{...request,composition:sequenceDocument.value as ChunkDocument,timeline,sequenceId:timeline.sequences[0].id,time:4});
assert.equal(directed.workspaceScale,frame.workspaceScale,'Sequence fit must not change editor zoom');
for(const before of frame.regions!){const after=directed.regions!.find(r=>r.scene===before.scene)!;assert(after);assert(Math.abs(after.x-before.x)<1,'Chunk framing stays put when entering a sequence');assert(Math.abs(after.width-before.width)<1);}
const source=workspace.chunks[1],chunk=structuredClone(source.value as ChunkDocument),node=chunk.instances.find(n=>n.type!=='environment.sky')!;const old=node.placement.x;node.placement.x+=7;
model.edit(source.id,'Edit another chunk',()=>chunk);assert.equal((model.get(source.id).value as ChunkDocument).instances.find(n=>n.id===node.id)!.placement.x,old+7);
const bundle=createDocumentBundle(model.edits(),model.list()),restored=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);restored.load(documents);restored.importDocuments(readDocumentBundle(bundle,restored.list()));assert.equal((restored.get(source.id).value as ChunkDocument).instances.find(n=>n.id===node.id)!.placement.x,old+7,'Projected chunk edits roundtrip through the canonical source');
model.undo();assert.equal((model.get(source.id).value as ChunkDocument).instances.find(n=>n.id===node.id)!.placement.x,old);
model.redo();assert.equal((model.get(source.id).value as ChunkDocument).instances.find(n=>n.id===node.id)!.placement.x,old+7);
console.log('Composition workspace: real member sources, shared native frame, scoped picking, cross-chunk history and bundle');

// Protected source Save writes the source document, not a workspace projection or duplicate chunk.
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'composition-workspace-save-'));
try{
 for(const descriptor of sourceDocuments){const file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),file);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});
 const edits=model.edits().map(edit=>({...edit,revision:store.read(edit.id).revision}));assert(edits.length);
 store.save(edits);
 const fresh=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'reopened',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));validateSourceDocuments(new Map(fresh.map(d=>[d.id,d.value])));
 const reopened=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);reopened.load(fresh);
 const actual=workspaceDocuments(workspace.id,reopened.inspectDocuments()).find(d=>d.id===source.id)!;
 assert.equal((actual.value as ChunkDocument).instances.find(n=>n.id===node.id)!.placement.x,old+7,'saved source is reconstructed in the same composition');
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
