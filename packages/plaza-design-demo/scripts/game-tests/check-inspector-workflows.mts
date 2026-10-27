/** Contextual draft lifecycle and the inspector-first authoring contract. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {inspectorTask,type InspectorTask} from '../../src/ssg/game/authoring/inspector-task';
import {openMountPicker,editMemberConnection,renderWorldMemberInspector,type WorldWorkspaceControls,workspaceSource} from '../../src/ssg/game/authoring/world-workspace-controls';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {compileGameWorld} from '../../src/ssg/game/world/compiled-world';
import type {WorldMemberAddress} from '../../src/ssg/game/authoring/world-members';
const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const model=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);model.load(documents);
const host=new Element();let request:InspectorTask|undefined,selection:WorldMemberAddress|undefined;
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
const field=(name:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,name);return e;};
const change=(name:string,value:string)=>{const e=field(name);e.value=value;e.onchange!();};
const click=(label:string)=>{const e=all(host).find(e=>e.textContent===label&&e.onclick);assert(e,label);e.onclick!();};
const port:WorldWorkspaceControls={registry:art,documents:()=>model.inspectDocuments(),composition:()=> 'boundary-example',selection:()=>selection,select:address=>{selection=address;},openChunk(){},changed(){},inspect:task=>{request=task;host.replaceChildren(inspectorTask(task,()=>host.replaceChildren())as any);},apply:(label,value)=>{const next=model.previewDocuments('world-compositions',value);compileGameWorld(pendingRegistry(next),next);model.edit('world-compositions',label,()=>value);}};
const west={composition:'boundary-example',member:'street',child:'west'},source=workspaceSource(model.inspectDocuments()),connection=source.groups['boundary-street'].connections[0];
editMemberConnection(port,west,connection);assert.equal(request?.title,'Connection · walk');assert.deepEqual(request?.highlightChunks,['boundary-west','boundary-east']);assert.deepEqual(selection,west);
assert(!model.canUndo,'Opening a relationship does not edit source');
change('From offset X','11');click('Apply');assert(!model.canUndo);assert.equal(field('From offset X').value,'11','Rejected Apply retains the draft');assert(all(host).some(e=>e.attributes.role==='alert'&&e.textContent.includes('No changes applied')));
click('Cancel');assert(!model.canUndo);
editMemberConnection(port,west,connection);change('Connection ID','review-walk');click('Apply');assert(model.canUndo);assert.equal(workspaceSource(model.inspectDocuments()).groups['boundary-street'].connections[0].id,'review-walk');model.undo();assert.equal(workspaceSource(model.inspectDocuments()).groups['boundary-street'].connections[0].id,'walk');
editMemberConnection(port,west,connection);change('From offset X','11');const align=field('Align To member with From endpoint');align.checked=true;align.onchange!();click('Apply');assert(!model.dirty(),'Alignment must not bypass physical walk-edge constraints');assert(all(host).some(e=>e.attributes.role==='alert'&&e.textContent.includes('matching edge anchors with zero offsets')),'A rejected recovery offers the actual walk remedy');click('Cancel');
for(const create of [false,true]){const before=JSON.stringify(model.edits());openMountPicker(port,create);assert(request?.title=== (create?'New composition':'Mount chunk or group'));click('Cancel');assert.equal(JSON.stringify(model.edits()),before);}
const group={composition:'boundary-example',member:'street'};
host.replaceChildren();renderWorldMemberInspector(host as any,port,group);click('Endpoint · west');assert.equal(request?.title,'Edit group endpoint');click('Cancel');
host.replaceChildren();renderWorldMemberInspector(host as any,port,group);click('Unmount group');assert.equal(request?.title,'Unmount street');click('Cancel');assert(!model.dirty());
// Prevent the same shortcut from reappearing under a different modal helper name.
function audit(dir:string){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){audit(file);continue;}if(!file.endsWith('.ts'))continue;const code=fs.readFileSync(file,'utf8');assert(!/\bshowModal\s*\(|\bwindow\.(?:confirm|prompt)\s*\(|element\(\s*['"]dialog['"]/.test(code),'Contextual authoring must use the inspector: '+file);}}
audit('src/ssg/game/authoring');
console.log('Inspector workflows: contextual connection selection, endpoint highlights, preserved invalid drafts, atomic Apply, Cancel, Undo, mount/create/export/unmount and no modal authoring paths PASS');
