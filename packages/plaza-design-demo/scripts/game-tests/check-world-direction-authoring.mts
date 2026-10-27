import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {Element} from './rules-harness.mts';
import {art,type ChunkDocument} from '../../src/ssg/game/art';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {renderWorldDirectionAuthoring} from '../../src/ssg/game/authoring/world-direction-authoring';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {sequenceWorldZones} from '../../src/ssg/game/runtime/prepare-frame';
import {validateWorldCompositions} from '../../src/ssg/game/world/compositions';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {renderStateDeclarationsAuthoring} from '../../src/ssg/game/authoring/state-declarations-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
const scratch=path.resolve('../../.game-test-output/world-direction-authoring');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
for(const descriptor of sourceDocuments){const to=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),initial=store.list();
const make=()=>{const m=new ComposerModel(art,createSequenceValidationContext(art,{}),()=>{},[sceneCatalogueProjection]);m.load(initial);return m;};
const model=make(),host=new Element();let error='';
// Detach the authored review starts before deliberately repointing their sequence to another world.
// Real prospective validation must reject leaving those links pointed at an incompatible origin.
model.importDocuments([{id:'play-fixtures',value:{...model.get('play-fixtures').value as any,fixtures:(model.get('play-fixtures').value as any).fixtures.map((f:any)=>{const next=structuredClone(f);if(next.sequence?.id==='glide')delete next.sequence;return next;})}},{id:'storyboard',value:{...model.get('storyboard').value as any,acts:(model.get('storyboard').value as any).acts.map((a:any)=>({...a,beats:a.beats.map((b:any)=>{const next=structuredClone(b);if(next.sequence==='glide')delete next.sequence;return next;})}))}}],'Detach review direction links');
const originalScope=(model.get('sequence-opening').value as ChunkDocument).instances[0].props.worldComposition;

const render=()=>{host.replaceChildren();const doc=model.get('sequence-opening').value as ChunkDocument,node=doc.instances.find(n=>n.type==='sequence.world-control')!;
 renderWorldDirectionAuthoring(host as any,node,model.list(),(label,change)=>{model.edit('sequence-opening',label,value=>{change((value as ChunkDocument).instances.find(n=>n.id===node.id)!);return value;});render();},e=>error=String(e));};
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];render();
const field=all(host).find(e=>e.attributes['aria-label']==='World composition')!;assert(field);field.value='boundary-example';field.onchange!();assert.equal(error,'');
const after=model.get('sequence-opening').value as ChunkDocument,props=after.instances.find(n=>n.type==='sequence.world-control')!.props;
assert.equal(props.origin,'boundary-west');assert.deepEqual(props.zones,[]);assert.equal(props.worldComposition,'boundary-example');
model.undo();assert.equal((model.get('sequence-opening').value as ChunkDocument).instances[0].props.worldComposition,originalScope);model.redo();
const gameplayId='authored.boundary-west-gameplay';
model.edit(gameplayId,'Declare review value',value=>{const d=value as GameplayDefinition;d.state!['boundary-west.review']={owner:'boundary-west',type:'boolean',lifetime:'save',default:false};return d;});
host.replaceChildren();const form=new TypedForm(e=>error=String(e));
renderStateDeclarationsAuthoring(host as any,model.get(gameplayId).value as GameplayDefinition,{form,section:(parent,title)=>form.section(parent,title),draft:{},refresh(){},edit:(label,change)=>model.edit(gameplayId,label,value=>{change(value as GameplayDefinition);return value;})});
const binding=all(host).find(e=>e.attributes['aria-label']==='State boundary-west.review state binding')!;assert(binding);binding.value='review.flag';binding.onchange!();assert.equal(error,'');
assert.equal((model.get(gameplayId).value as GameplayDefinition).state!['boundary-west.review'].binding,'review.flag');model.undo();assert.equal((model.get(gameplayId).value as GameplayDefinition).state!['boundary-west.review'].binding,undefined);model.redo();
const values=()=>new Map(model.list().filter(d=>sourceDocuments.some(s=>s.id===d.id)).map(d=>[d.id,d.value]));validateSourceDocuments(values());
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('sequence-opening').value,after);
const bad=new Map(values()),doc=structuredClone(after);doc.instances[0].props.worldComposition='absent';bad.set('sequence-opening',doc);assert.throws(()=>validateSourceDocuments(bad),/unknown composition/);
model.confirmSaved(store.save(model.edits()).documents);assert(!model.dirty());
const fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).list(),pending=new Map(fresh.map(d=>[d.id,d.value]));
const native=pendingRegistry(pending),scope=sequenceWorldZones(props,native,validateWorldCompositions(pending.get('world-compositions')));
assert(scope.includes('boundary-door')&&scope.includes('boundary-east'));assert.deepEqual(fresh.find(d=>d.id==='sequence-opening')!.value,after);
assert.equal(native['boundary-west'].gameplay!.state!['boundary-west.review'].binding,'review.flag','typed binding survives bundle/source Save/native reload');
console.log('World direction authoring: typed composition/origin controls, atomic scope edit, history/bundle/protected Save/fresh native source PASS');
