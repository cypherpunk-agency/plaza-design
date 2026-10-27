import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BOT_GAMEPLAY,BOT_REACTIONS,withBotConversations,botConversationId,validateBotConversationBindings} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {instantiateConversation} from '../../src/ssg/game/engine/gameplay/conversation-instance';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {conversationUsages} from '../../src/ssg/game/authoring/conversation-library';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {art} from '../../src/ssg/game/art';
import {Game} from '../../src/ssg/game/runtime/game';
import {runtimeFixture} from './runtime-fixture.mts';
import {newSave} from '../../src/ssg/game/runtime/save';

// Every shipped voice retains ordinary graph cycling and independent saved progress per robot.
for(const voice of BOT_REACTIONS.voices){
 const person:any={id:'first',x:20,seed:3,look:voice.id.startsWith('robot.')?{bot:voice.id.slice(6)}:voice.id.slice(7)},second={...person,id:'second',x:60};
 const scene=withBotConversations({id:'review',name:'Review',width:200,spawn:0,exits:[],people:[person,second]}),first=botConversationId('review',person,0),other=botConversationId('review',second,1),nodes=BOT_GAMEPLAY.conversations[voice.conversation].nodes;
 const expected=Object.keys(nodes).map(id=>nodes[id].pages);let value:GameplayState={flags:{},items:{},tokens:0};const port={read:()=>value,write:(s:GameplayState)=>value=s};let session=new GameplaySession(scene.gameplay!,port);
 for(let i=0;i<expected.length+2;i++){const visit=new ConversationSession(session,first);assert.deepEqual(visit.frame().pages,expected[i%expected.length],voice.id);visit.close();}
 const progress=value.values![first].cursor;assert.equal(value.values![other].cursor,0);value=JSON.parse(JSON.stringify(value));session.dispose();session=new GameplaySession(scene.gameplay!,port);assert.equal(value.values![first].cursor,progress);const visit=new ConversationSession(session,other);assert.deepEqual(visit.frame().pages,expected[0]);visit.close();session.dispose();
}

// Typed dependencies relocate; literal values and canonical bindings never do.
const graph='voice.demo',definition:GameplayDefinition={version:1,flags:[],items:[],events:[],state:{[graph+'.cursor']:{owner:graph,lifetime:'save',type:'number',default:0,min:0,max:8},[graph+'.label']:{owner:graph,lifetime:'save',type:'string',default:graph+'.cursor',maxLength:80},[graph+'.shared']:{owner:graph,lifetime:'save',type:'number',default:2,binding:'world.charge'}},queries:{[graph+'.turn']:{kind:'remainder',value:{state:graph+'.cursor'},divisor:2}},commands:{[graph+'.advance']:{sources:['conversation'],actions:[{state:graph+'.cursor',add:1}]}},reactions:[],conversations:{[graph]:{entry:[{node:'offer'}],nodes:{offer:{speaker:'ROBOT',template:true,pages:['{query:'+graph+'.turn} · {state:'+graph+'.label} · {state:'+graph+'.shared}'],choices:[{id:'yes',label:'Yes',command:graph+'.advance',next:'done'}]},done:{speaker:'ANOTHER SPEAKER',pages:[graph+'.cursor']}}}}};
const instantiated=instantiateConversation(definition,graph,'talk.review.robot',{from:'ROBOT',to:'UNIT-123'});assert.equal(instantiated.state!['talk.review.robot.shared'].binding,'world.charge');assert.equal(instantiated.state!['talk.review.robot.label'].default,graph+'.cursor');assert.equal(instantiated.conversations['talk.review.robot'].nodes.done.speaker,'ANOTHER SPEAKER');
let value:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(instantiated,{read:()=>value,write:s=>value=s}),visit=new ConversationSession(session,'talk.review.robot');assert.deepEqual(visit.frame().pages,['0 · '+graph+'.cursor · 2']);assert.equal(visit.frame().speaker,'UNIT-123');assert(visit.choose('yes').ok);assert.deepEqual(visit.frame().pages,[graph+'.cursor']);assert.equal(value.values!['talk.review.robot'].cursor,1);visit.close();session.dispose();

const docs=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))}));
const owner='bot-gameplay',voice=BOT_REACTIONS.voices.find(v=>v.id==='robot.mech')!,node='visit-0';
assert(conversationUsages(docs,owner,voice.conversation).some(row=>row.scene==='warehouse'),'Shared robot graphs report their actual native consumers');
const validate=(doc:{id:string},documents:typeof docs)=>{if(doc.id===owner||doc.id==='bot-reactions')validateSourceDocuments(new Map(documents.map(d=>[d.id,d.value])));},make=()=>{const model=new ComposerModel(art,createSequenceValidationContext(art,{}),validate);model.load(docs);return model;},model=make();
model.edit(owner,'Edit shared robot dialogue',value=>{const next=value as GameplayDefinition;next.conversations[voice.conversation].nodes[node].pages=['Edited robot conversation.'];return next;});
function exercise(documents:typeof docs){const library=documents.find(d=>d.id===owner)!.value as GameplayDefinition,game:any=runtimeFixture(Game);Object.assign(game,{save:newSave(),content:{review:{id:'review',name:'Review',width:200,spawn:0,exits:[],people:[{id:'robot',seed:3,x:40,look:{bot:'mech'}}]}},sources:{botGameplay:library},botReactions:BOT_REACTIONS});const scene=game.sceneDefinition('review'),id=botConversationId('review',scene.people[0],0);let value:GameplayState={flags:{},items:{},tokens:0};const session=new GameplaySession(scene.gameplay,{read:()=>value,write:s=>value=s}),conversation=new ConversationSession(session,id);assert.deepEqual(conversation.frame().pages,['Edited robot conversation.']);conversation.close();session.dispose();}
exercise(model.list());model.undo();model.redo();exercise(model.list());const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));exercise(receiver.list());
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'robot-graphs-save-'));try{
 for(const descriptor of sourceDocuments){const file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),file);}const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));exercise(new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).list());
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
const broken=structuredClone(BOT_GAMEPLAY);delete broken.conversations[voice.conversation];assert.throws(()=>validateBotConversationBindings(BOT_REACTIONS,broken),/Missing robot conversation/);
console.log('Robot graphs PASS: all 23 voice cycles, independent current-save cursors, typed graph specialization, real pending Game source, usages, history/bundle and protected Save/fresh reconstruction.');
