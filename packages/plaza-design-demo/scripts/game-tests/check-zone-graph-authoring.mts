/** Contextual chunk connections: draft/cancel, complete atomic edits, native world compilation,
 * history/bundles and protected Save/fresh reconstruction. No obsolete standalone screen. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {inspectorTask} from '../../src/ssg/game/authoring/inspector-task';
import {mountChunkConnections} from '../../src/ssg/game/authoring/chunk-connections';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {art} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {compileGameWorld} from '../../src/ssg/game/world/compiled-world';
import {placeFrom,type ZoneGraphSource} from '../../src/ssg/game/world/zone-graph';
const output=path.resolve('../../.game-test-output');fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'chunk-connections-'));
try{
 for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),initial=store.list();
 const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
 const validate=(d:any,docs:any[])=>{if(d.id==='zone-graph')pendingRegistry(new Map(docs.map(d=>[d.id,d.value])));};
 const model=new ComposerModel(art,context,validate);model.load(initial);let handle:any;
 const api={get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>{model.edit(id,label,()=>value);handle?.refresh?.();}};
 const host=new Element();const inspect=(task:any)=>{host.replaceChildren(inspectorTask(task,()=>handle.refresh())as any);};handle=mountChunkConnections(host as any,{get documents(){return model.list();},openScene(){},openInstance(){},inspect,scene:'tower-deck',authoring:api} as any);
 const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],field=(name:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,name);return e;};
 const change=(name:string,value:string)=>{const e=field(name);e.value=value;e.onchange!();};
 const click=(label:string)=>{const e=all(host).find(e=>e.textContent===label&&e.onclick);assert(e,label);e.onclick!();};
 const graph=()=>model.get('zone-graph').value as ZoneGraphSource;
 const original=structuredClone(graph());click('＋ Connect chunk');assert.deepEqual(graph(),original,'Opening a picker/draft must not insert an invalid default connection');click('Cancel');assert(!model.canUndo);
 click('＋ Connect chunk');change('Connection ID','deck-door');change('From chunk','tower-deck');change('To chunk','tower-annex');change('Traversal','door');
 change('From crossing piece','floor-deck');change('To crossing piece','floor-street');change('Connection X offset','0');change('Connection Y offset','-90');
 click('Apply');assert.deepEqual(graph(),original,'Invalid complete draft rejects atomically');assert(!model.canUndo);assert(all(host).some(e=>e.attributes.role==='alert'&&e.textContent),'The rejected draft explains the constraint');
 change('Connection Y offset','-100');click('Apply');assert.equal(graph().seams.at(-1)!.id,'deck-door');assert.equal(graph().seams.length,original.seams.length+1);
 const pending=structuredClone(graph());model.undo();assert.deepEqual(graph(),original);model.redo();assert.deepEqual(graph(),pending);
 const receiver=new ComposerModel(art,context,validate);receiver.load(initial);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('zone-graph').value,pending);
 const values=new Map(model.list().map(d=>[d.id,d.value]));validateSourceDocuments(values);assert.equal(placeFrom(compileGameWorld(pendingRegistry(values),values),'tower-deck',Infinity).get('tower-annex')?.dh,-100,'The real engine consumes the pending crossing');
 const file=path.join(root,'world/zone-graph.json'),bytes=fs.readFileSync(file,'utf8'),doc=store.read('zone-graph'),bad=structuredClone(pending);bad.seams.at(-1)!.dh=-90;
 assert.throws(()=>store.save([{id:doc.id,revision:doc.revision,value:bad}]));assert.equal(fs.readFileSync(file,'utf8'),bytes);
 const saved=store.save(model.edits());model.confirmSaved(saved.documents);assert(!model.dirty());const fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});assert.deepEqual(fresh.read('zone-graph').value,pending);
 handle();console.log('Chunk connections: contextual draft/cancel, constraint rejection, history/bundle, native graph and protected Save/reload PASS');
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
