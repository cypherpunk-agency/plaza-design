/** A world-level state owner (world/state-owners.json, `shift.*`) used by two scenes' gameplay: one declaration, one Save.gameplay block. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {validateGameplay,validateSharedState} from '../../src/ssg/game/engine/gameplay/validation';
import {sourceGameplay,withSharedState} from '../../src/ssg/game/engine/gameplay/shared-state';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {mountGameplayAuthoring} from '../../src/ssg/game/authoring/gameplay-authoring';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave,loadSave} from '../../src/ssg/game/runtime/save';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';
const root=path.resolve('src/ssg/game'),base=new Map<string,unknown>(sourceDocuments.map(d=>[d.id,JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))]));
validateSourceDocuments(base);
// Pending state owners: the shipped shift keys plus one more, to prove the pending document drives validation.
const owners:any=structuredClone(base.get('state-owners'));owners.state['shift.radio']={owner:'shift',lifetime:'save',type:'boolean',default:false};validateSharedState(owners);
const empty=()=>({version:1,flags:[],items:[],events:[],reactions:[],conversations:{},commands:{}} as any);
// Two lab zones (scenes/authored.json): the annex writes the shift; the deck reads it and writes its own step.
const annex=Object.assign(empty(),{sharedState:['shift'],commands:{
 'annex.tag':{sources:['interaction'],when:{state:'shift.tagReceived',is:false},actions:[{state:'shift.tagReceived',set:true},{state:'shift.radio',set:true}]},
 'annex.deliver':{sources:['interaction'],when:{all:[{state:'shift.tagReceived',is:true},{state:'shift.parcelDelivered',is:false}]},actions:[{state:'shift.parcelDelivered',set:true}]}}});
const deck=Object.assign(empty(),{sharedState:['shift'],commands:{
 'deck.checkout':{sources:['interaction'],when:{all:[{state:'shift.parcelDelivered',is:true},{state:'shift.checkedOut',is:false}]},actions:[{state:'shift.checkedOut',set:true}]}}});
const catalogue=(a:unknown,d:unknown)=>{const c:any=structuredClone(base.get('authored-scenes'));const at=(id:string)=>c.scenes.find((s:any)=>s.scene.id===id);at('tower-annex').gameplay=a;at('tower-deck').gameplay=d;return c;};
const pending=(a:unknown=annex,d:unknown=deck,o:unknown=owners)=>new Map([...base,['authored-scenes',catalogue(a,d)],['state-owners',o]]);
validateSourceDocuments(pending());
// Declarations enforced: only declared keys, one declaring document, a known owner.
const rejects:[string,()=>unknown][]=[
 ['undeclared shared key',()=>validateSourceDocuments(pending(Object.assign(structuredClone(annex),{commands:{x:{sources:['interaction'],actions:[{state:'shift.overtime',set:true}]}}})))],
 ['local redeclaration of a shared owner',()=>validateSourceDocuments(pending(Object.assign(empty(),{state:{'shift.checkedOut':{owner:'shift',lifetime:'save',type:'boolean',default:false}}})))],
 ['divergent copy beside sharedState',()=>validateSourceDocuments(pending(Object.assign(structuredClone(annex),{state:{'shift.checkedOut':{owner:'shift',lifetime:'session',type:'boolean',default:false}}})))],
 ['unknown shared owner',()=>validateSourceDocuments(pending(Object.assign(structuredClone(annex),{sharedState:['night']})))],
 ['shared key without opting in',()=>validateSourceDocuments(pending(annex,(({sharedState,...rest})=>rest)(structuredClone(deck))))],
 ['wrong value type',()=>validateSourceDocuments(pending(annex,Object.assign(structuredClone(deck),{commands:{x:{sources:['interaction'],actions:[{state:'shift.checkedOut',set:3}]}}})))],
 ['session lifetime in the owners document',()=>validateSharedState({...owners,state:{...owners.state,'shift.break':{owner:'shift',lifetime:'session',type:'boolean',default:false}}})],
 ['owners document with commands',()=>validateSharedState({...owners,commands:{x:{sources:['system'],actions:[]}}})],
];
for(const[name,run]of rejects)assert.throws(run,(e:any)=>{if(process.env.SHOW)console.log(name,"→",e.message);return /Invalid gameplay document/.test(e.message);},name);
// The pending owners document is what scenes validate against: shift.radio is unknown to the shipped one.
assert.throws(()=>validateGameplay(annex),/unknown reference shift.radio/);assert(withSharedState(owners,()=>validateGameplay(annex)).state!['shift.radio']);
// Compiled vs source: compiled carries the declarations, source keeps only the reference.
const compiled=withSharedState(owners,()=>validateGameplay(annex));assert.deepEqual(Object.keys(compiled.state!).sort(),Object.keys(owners.state).sort());assert.deepEqual(sourceGameplay(compiled),JSON.parse(JSON.stringify(annex)));assert.deepEqual(withSharedState(owners,()=>validateGameplay(compiled)),compiled,'compiled form revalidates (idempotent)');
// Two scenes, one owner block in the common root.
const registry=pendingRegistry(pending()),A=registry['tower-annex'].gameplay!,D=registry['tower-deck'].gameplay!;
const save=newSave();let state:GameplayState={flags:save.flags,items:save.items,tokens:save.tokens,values:save.gameplay??={}};
const port={read:()=>state,write:(next:GameplayState)=>{state={...next,values:Object.assign(save.gameplay!,next.values)};}};
const a=withSharedState(owners,()=>new GameplaySession(A,port)),d=withSharedState(owners,()=>new GameplaySession(D,port));
const defaults=Object.fromEntries(Object.entries(owners.state as Record<string,{default:unknown}>).map(([id,d])=>[id.slice('shift.'.length),d.default]));assert.equal(defaults.radio,false);assert.deepEqual(a.state().values!.shift,defaults,'declared defaults');assert.deepEqual(d.state().values!.shift,defaults);
assert.deepEqual(d.dispatch('deck.checkout','interaction'),{ok:false,reason:'conditions'},'deck refuses before the annex delivers');
assert(a.dispatch('annex.tag','interaction').ok);assert(a.dispatch('annex.deliver','interaction').ok);
assert(d.dispatch('deck.checkout','interaction').ok,'deck reads what the annex wrote');assert.equal(a.state().values!.shift.checkedOut,true,'annex reads what the deck wrote');
assert.deepEqual(Object.keys(save.gameplay!).filter(k=>k.startsWith('shift')),['shift'],'one owner block, no per-scene copy');assert(!save.gameplay!['tower-annex']?.parcelDelivered&&!save.gameplay!['tower-deck']?.checkedOut);
a.dispose();d.dispose();
// Save round-trip through the real Game serialization: save lifetime kept, session lifetime dropped.
const previous=globalThis.localStorage,memory=new Map<string,string>();(globalThis as any).localStorage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)};
try{const game:any=Object.create(Game.prototype);game.save=save;game.content=registry;game.hosts=new Map();game.sceneDefinition=(id:string)=>registry[id]??{};game.persistSave();const loaded=loadSave();
 assert.deepEqual(loaded.gameplay!.shift,save.gameplay!.shift,'reloaded shift block');assert.deepEqual(loaded.gameplay!.shift,{...defaults,tagReceived:true,radio:true,parcelDelivered:true,checkedOut:true});
 let again:GameplayState={flags:{},items:{},tokens:0,values:loaded.gameplay};const s=withSharedState(owners,()=>new GameplaySession(D,{read:()=>again,write:n=>{again=n;}}));assert.equal(s.state().values!.shift.caseReturned,false,'unwritten key resolves to its default after reload');assert.deepEqual(s.dispatch('deck.checkout','interaction'),{ok:false,reason:'conditions'},'reloaded progress still guards the deck');s.dispose();
}finally{globalThis.localStorage=previous;}
// Editor parity: the shared owner's keys appear in the existing typed state pickers, and edits keep the source a reference.
class Element{children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';open=false;className='';type='';disabled=false;step='';min='';onchange?:()=>void;onclick?:()=>void;ontoggle?:()=>void;append(...n:Element[]){this.children.push(...n);}replaceChildren(...n:Element[]){this.children=[...n];}setAttribute(k:string,v:string){this.attributes[k]=v;}remove(){}}
const prior=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
try{const host=new Element(),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],field=(name:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===name);assert(e,name);return e;},options=(name:string)=>field(name).children.map(o=>o.value),change=(name:string,value:string)=>{const e=field(name);if(e.children.length)assert(options(name).includes(value),name+' offers '+value);e.value=value;e.onchange!();};
 let latest:any=structuredClone(deck),edits:string[]=[];const editor=mountGameplayAuthoring(host as any,{document:()=>latest,sharedStateSource:()=>owners,onEdit:(d,label)=>{latest=d;edits.push(label);editor.refresh();},undo(){},redo(){},save:async()=>{},reload:async()=>{},dirty:()=>false,saveLabel:'Save'});
 change('Command','deck.checkout');change('Command condition type','state');for(const key of Object.keys(owners.state))assert(options('Command condition state').includes(key),'condition picker offers '+key);
 change('Command condition state','shift.caseReturned');assert.deepEqual(latest.commands['deck.checkout'].when,{state:'shift.caseReturned',is:false});assert(!latest.state,'edited source holds no shared declaration copy');assert.deepEqual(latest.sharedState,['shift']);
 assert(options('Action 1 state').includes('shift.trolleyMoved'),'action picker offers shared keys');change('Action 1 state','shift.trolleyMoved');assert.deepEqual(latest.commands['deck.checkout'].actions[0],{state:'shift.trolleyMoved',set:false});assert(!latest.state);
 editor.dispose();host.replaceChildren();
 // The opt-in itself is a typed control.
 latest=empty();const second=mountGameplayAuthoring(host as any,{document:()=>latest,sharedStateSource:()=>owners,onEdit:d=>{latest=d;second.refresh();},undo(){},redo(){},save:async()=>{},reload:async()=>{},dirty:()=>false,saveLabel:'Save'});
 const use=field('Use shared state owner shift');use.checked=true;use.onchange!();assert.deepEqual(latest.sharedState,['shift']);assert(!latest.state);second.dispose();
}finally{globalThis.document=prior;}
console.log('Shared state owner PASS: world/state-owners.json declares shift.* once; two scenes opt in, write and read the same Save.gameplay.shift block; undeclared/redeclared/divergent/unknown-owner/opt-out/type errors reject; pending owners document drives validation; session lifetime refused for shared owners; save round-trip through real Game serialization; typed pickers offer the shared keys and edits keep the source a reference.');
