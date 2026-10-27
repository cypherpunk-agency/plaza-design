import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {useLife} from '../../src/ssg/game/runtime/interaction-routing';
import {runtimeFixture} from './runtime-fixture.mts';
import {CRITTER_REACTIONS,CRITTER_GAMEPLAY,validateCritterReactions,validateCritterConversations,critterReaction} from '../../src/ssg/game/engine/gameplay/critter-reactions';
import {renderCharacterConversation} from '../../src/ssg/game/authoring/character-conversation-controls';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import {mountRules} from './rules-harness.mts';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {art} from '../../src/ssg/game/art';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const cat=[['The cat allows it. Then it decides it did not, and leaves.'],['The cat purrs, which is a lot of commitment from a street cat.'],['The cat sniffs your hand, finds no fish, and looks betrayed.']];
const pigeon=[['The pigeon takes one step to the side. Exactly one.'],['The pigeon flaps, lands a metre away, and looks at you like you started it.']];
assert.deepEqual(CRITTER_REACTIONS.critters.map(c=>[c.look,c.prompt,c.conversation]),[['cat','[E] PET','critter.cat'],['pigeon','[E] SHOO','critter.pigeon']]);
for(const[id,pages]of [['critter.cat',cat],['critter.pigeon',pigeon]]as const)assert.deepEqual(Object.values(CRITTER_GAMEPLAY.conversations[id].nodes).map(n=>n.pages),pages);
let value:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(CRITTER_GAMEPLAY,{read:()=>value,write:s=>value=s});
for(let n=0;n<14;n++){const id=n%2?'critter.pigeon':'critter.cat',visit=new ConversationSession(session,id);assert.deepEqual(visit.frame().pages,n%2?pigeon[n%2]:cat[n%3]);visit.close();assert.equal(value.values!.critter.visits,n+1);}
session.dispose();const restarted=new GameplaySession(CRITTER_GAMEPLAY,{read:()=>value,write:s=>value=s});assert.equal(value.values!.critter.visits,0,'The declared session lifetime resets once for a new run');restarted.dispose();
assert.equal(critterReaction({look:'gull'}),undefined);
for(const mutate of [(d:any)=>d.critters[0].look='dragon',(d:any)=>d.critters[1].look='cat',(d:any)=>d.critters[1].id='cat',(d:any)=>d.critters[0].talk=[['old format']],(d:any)=>d.critters[0].prompt='',(d:any)=>d.critters[0].conversation='']){const bad=structuredClone(CRITTER_REACTIONS);mutate(bad);assert.throws(()=>validateCritterReactions(bad));}
const broken=structuredClone(CRITTER_REACTIONS);broken.critters[0].conversation='absent';assert.throws(()=>validateCritterConversations(broken,CRITTER_GAMEPLAY),/Missing critter conversation/);
const scene:any={id:'critter-test',name:'Critters',width:400,spawn:10,exits:[],people:[{look:'cat',x:10},{look:'pigeon',x:60},{look:'gull',x:110},{look:'cat',x:160,conversation:'named-cat'}]};
function make(sources:object={}){const game:any=runtimeFixture(Game),said:any[]=[],shown:ConversationSession[]=[];Object.assign(game,{save:newSave(),content:{'critter-test':scene},sources,botReactions:BOT_REACTIONS,say:(...a:any[])=>said.push(a),dialogueCompletion(){},scenes:Object.assign(game.scenes,{here:'critter-test',hosts:new Map([['critter-test',{model:{attachmentOffsets:()=>undefined},presentConversation:(s:ConversationSession)=>shown.push(s)}]])})});return{game,said,shown};}
{
 const{game,said}=make();assert.deepEqual(game.lifeTargets(scene).filter((t:any)=>t.id.startsWith('pet:')).map((t:any)=>[t.id,t.label]),[['pet:0','[E] PET'],['pet:1','[E] SHOO']]);
 for(let n=0;n<4;n++)useLife(game.interactionRoutingPort,'pet:0');useLife(game.interactionRoutingPort,'pet:1');assert.deepEqual(said.map(a=>[a[0],a[1]]),[['CAT',cat[0]],['CAT',cat[1]],['CAT',cat[2]],['CAT',cat[0]],['PIGEON',pigeon[0]]]);
 game.scenes.hosts.clear();const stored=game.prepareSave(game.save);assert.equal(stored.gameplay?.critter?.visits,undefined,'Session dialogue progress is excluded from serialized saves');assert.equal(game.save.gameplay.critter.visits,5,'Serialization does not reset the live shared counter');game.globalGameplaySession.dispose();
}
const custom=structuredClone(CRITTER_GAMEPLAY);custom.conversations['critter.cat']={entry:[{node:'offer'}],nodes:{offer:{speaker:'MOGGY',pages:['Purr?'],choices:[{id:'yes',label:'Yes',next:'done'}]},done:{speaker:'MOGGY',pages:['Purr.']}}};
{const{game,said,shown}=make({critterGameplay:custom});useLife(game.interactionRoutingPort,'pet:0');assert.equal(said.length,0);assert.equal(shown.length,1);assert(shown[0].choose('yes').ok);assert.deepEqual(shown[0].frame().pages,['Purr.']);shown[0].close();game.globalGameplaySession.dispose();}
// Contextual fields edit speaker in the actual graph, and metadata holds only the binding/prompt.
const documents=new Map<string,unknown>([['critter-reactions',structuredClone(CRITTER_REACTIONS)],['critter-gameplay',structuredClone(CRITTER_GAMEPLAY)]]),opened:string[][]=[];
const mount=(host:any,context:any)=>{const error=document.createElement('p'),form=new TypedForm(e=>error.textContent=String(e));const render=()=>{host.replaceChildren(error);renderCharacterConversation(form,host,context,{x:0,look:'cat'});};render();const handle=(()=>host.replaceChildren())as any;handle.refresh=render;return handle;};
const ui=mountRules(mount,documents,{openConversation:(...args:string[])=>opened.push(args)});ui.change('Animal speaker name','KITTY');ui.change('Animal interaction prompt','[E] STROKE');ui.click('Edit animal conversation definition');assert.deepEqual(opened,[['critter-gameplay','critter.cat']]);assert.equal((documents.get('critter-gameplay')as GameplayDefinition).conversations['critter.cat'].nodes['visit-0'].speaker,'KITTY');assert.equal((documents.get('critter-reactions')as typeof CRITTER_REACTIONS).critters[0].prompt,'[E] STROKE');
const base=new Map(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))]));for(const[id,v]of documents)base.set(id,v);validateSourceDocuments(base);
const original=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const makeModel=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{}),(doc,all)=>{if(doc.id==='critter-gameplay'||doc.id==='critter-reactions')validateSourceDocuments(new Map(all.map(d=>[d.id,d.value])));});model.load(original);return model;},model=makeModel();model.importDocuments([...documents].map(([id,value])=>({id,value})));
assert.deepEqual(model.get('critter-gameplay').value,documents.get('critter-gameplay'));model.undo();assert.deepEqual(model.get('critter-gameplay').value,CRITTER_GAMEPLAY);model.redo();const receiver=makeModel();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('critter-reactions').value,documents.get('critter-reactions'));assert.deepEqual(receiver.get('critter-gameplay').value,documents.get('critter-gameplay'));
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'critter-graphs-save-'));try{for(const descriptor of sourceDocuments){const file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),file);}const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});const saved=store.save([...documents].map(([id,value])=>({id,value,revision:store.read(id).revision}))),fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});assert.deepEqual(fresh.read('critter-gameplay').value,documents.get('critter-gameplay'));store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.deepEqual(store.read('critter-gameplay').value,CRITTER_GAMEPLAY);}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('Critter graphs PASS: exact shipped lines, shared cross-species cycle, session lifetime, real Game/router choices, contextual graph edits and protected Save/reload/undo.');
process.exit(0);
