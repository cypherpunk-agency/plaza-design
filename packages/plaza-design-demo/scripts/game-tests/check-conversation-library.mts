import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {conversationSources,conversationUsages} from '../../src/ssg/game/authoring/conversation-library';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {art} from '../../src/ssg/game/art';
import type {EditorDocument} from '../../src/ssg/game/authoring/contracts';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {addSceneActor,setActorDialogue,duplicateSceneActor} from '../../src/ssg/game/engine/gameplay/actor-content';
import type {SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {ChunkDocument} from '../../src/ssg/game/art';
const docs:EditorDocument[]=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'test',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
{
 const source=structuredClone(docs.find(d=>d.id==='shop-scene')!.value) as SceneDocument,composition=structuredClone(docs.find(d=>d.id==='shop')!.value) as ChunkDocument;
 let gameplay=structuredClone(docs.find(d=>d.id==='shop-gameplay')!.value) as GameplayDefinition;
 addSceneActor(source,composition,'new-speaker',{},260,0,true,gameplay);

 const person=source.people!.find(p=>p.id==='new-speaker')!,id=person.conversation!;
 assert.equal('talk'in person,false,'New actors persist a normal graph reference');
 gameplay.conversations[id].nodes['visit-0'].pages=['An edited greeting.'];
 const graph=structuredClone(gameplay.conversations[id]);
 setActorDialogue(source,'new-speaker',false,gameplay);
 assert.deepEqual(gameplay.conversations[id],graph,'Disabling dialogue keeps its definition');
 setActorDialogue(source,'new-speaker',true,gameplay);
 assert.deepEqual(gameplay.conversations[id],graph,'Re-enabling dialogue does not overwrite edited text');
 assert.equal(source.people!.find(p=>p.id==='new-speaker')!.conversation,id);
 gameplay.state![id+'.cursor'].max=1;gameplay.commands[id+'.advance-0'].actions=[{state:id+'.cursor',set:1}];gameplay.conversations[id].entry=[{when:{state:id+'.cursor',is:0},node:'visit-0'},{node:'again'}];gameplay.conversations[id].nodes.again={speaker:'RESIDENT',pages:['Again.'],onEnter:id+'.advance-0'};
 duplicateSceneActor(source,composition,'new-speaker','copy-speaker',gameplay);const copy=source.people!.find(p=>p.id==='copy-speaker')!;assert.notEqual(copy.conversation,id,'A copied actor-specific graph gets independent progress');
 const pending=new Map(docs.map(d=>[d.id,d.value]));pending.set('shop-scene',source);pending.set('shop',composition);pending.set('shop-gameplay',gameplay);validateSourceDocuments(pending);
 const native=pendingRegistry(pending).shop;let state:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(native.gameplay!,{read:()=>state,write:s=>state=s});
 const visit=new ConversationSession(session,native.people!.find(p=>p.id==='new-speaker')!.conversation!);assert.deepEqual(visit.frame().pages,['An edited greeting.']);visit.close();assert.equal(state.values![copy.conversation].cursor,0);const copyVisit=new ConversationSession(session,copy.conversation);assert.deepEqual(copyVisit.frame().pages,['An edited greeting.']);copyVisit.close();const again=new ConversationSession(session,id);assert.deepEqual(again.frame().pages,['Again.']);again.close();session.dispose();
}
const graph='talk.shop.keeper',owner='shop-gameplay';
assert(!conversationSources(docs).some(d=>d.id==='state-owners'),'Empty state declarations are not conversation-library entries');
assert.deepEqual(conversationUsages(docs,owner,graph).map(u=>u.document),['shop-scene']);
assert(conversationUsages(docs,'companion-gameplay','companion.pet.sleep.0').some(u=>u.document==='companion'));
const overlap=structuredClone(docs);for(const id of ['shop-gameplay','library-gameplay'])(overlap.find(d=>d.id===id)!.value as GameplayDefinition).conversations['local-review']={entry:[{node:'reply'}],nodes:{reply:{speaker:'TEST',pages:['Hi.']}}};
for(const id of ['shop-scene','library-scene'])(overlap.find(d=>d.id===id)!.value as any).people.push({id:'review',name:'TEST',conversation:'local-review'});
assert.deepEqual(conversationUsages(overlap,'shop-gameplay','local-review').map(u=>u.document),['shop-scene'],'Equal local graph IDs do not create cross-chunk usages');
assert.deepEqual(conversationUsages(overlap,'library-gameplay','local-review').map(u=>u.document),['library-scene']);

const values=(documents:readonly EditorDocument[])=>new Map(documents.map(d=>[d.id,d.value]));
const validate=(doc:EditorDocument,documents:EditorDocument[])=>{if(doc.id===owner)validateSourceDocuments(values(documents));};
const model=new ComposerModel(art,createSequenceValidationContext(art,{}),validate);model.load(docs);
const source=model.get(owner).value as GameplayDefinition,entry=source.conversations[graph].entry[0].node;
model.edit(owner,'Edit character conversation',value=>{const definition=value as GameplayDefinition;definition.conversations[graph].nodes[entry].pages=['Edited through the conversation library.'];return definition;});
const modified=model.get(owner).value;
function exercise(documents:readonly EditorDocument[]){const scene=pendingRegistry(values(documents)).shop,person=scene.people!.find(p=>p.id==='keeper')!;let state:GameplayState={flags:{},items:{},tokens:3};let session=new GameplaySession(scene.gameplay!,{read:()=>state,write:s=>state=s});let visit=new ConversationSession(session,person.conversation!);assert.deepEqual(visit.frame().pages,['Edited through the conversation library.']);visit.close();const cursor=state.values!['talk.shop.keeper'].cursor;assert.equal(cursor,1);state=JSON.parse(JSON.stringify(state));session.dispose();session=new GameplaySession(scene.gameplay!,{read:()=>state,write:s=>state=s});visit=new ConversationSession(session,person.conversation!);assert.notDeepEqual(visit.frame().pages,['Edited through the conversation library.'],'The current save resumes the next authored visit');visit.close();assert.equal(state.tokens,3);session.dispose();}
exercise(model.list());model.undo();assert.deepEqual(model.get(owner).value,source);model.redo();assert.deepEqual(model.get(owner).value,modified);
const imported=new ComposerModel(art,createSequenceValidationContext(art,{}),validate);imported.load(docs);imported.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),imported.list()));exercise(imported.list());
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'conversation-library-save-'));
try{for(const d of sourceDocuments){const file=path.join(root,d.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),file);}const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));const fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});exercise(fresh.list());assert.deepEqual(fresh.read(owner).value,modified);}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Conversation library: exact graph usages, shared/local scope, edited native NPC, saved visit progress, history/bundle and protected Save/fresh source reconstruction PASS');
