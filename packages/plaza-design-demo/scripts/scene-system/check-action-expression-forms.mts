import assert from 'node:assert/strict';
import {expressionDefinition} from './check-action-expressions.mts';
import {mountGameplayAuthoring} from '../../src/ssg/game/authoring/gameplay-authoring';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {stateValue} from '../../src/ssg/game/engine/gameplay/state';
import {emptyData} from '../../src/ssg/game/engine/empty-data';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
class Element{children:Element[]=[];attrs:Record<string,string>={};value='';checked=false;textContent='';disabled=false;onchange?:()=>void;onclick?:()=>void;append(...e:Element[]){this.children.push(...e);}replaceChildren(...e:Element[]){this.children=[...e];}setAttribute(k:string,v:string){this.attrs[k]=v;}remove(){this.children=[];}}
const previous=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};const host=new Element(),data=emptyData('expr','Expressions');data.tuning.amount=4;data.texts.label='LABEL';
let draft=structuredClone(expressionDefinition);draft.commands.review.actions=[{state:'expr.target',set:0},{state:'expr.integer',add:1},{item:'part',add:1},{tokens:1}];const history:GameplayDefinition[]=[],future:GameplayDefinition[]=[];
const handle=mountGameplayAuthoring(host as any,{document:()=>draft,validate:validateGameplay,nativeData:data,onEdit(value){history.push(draft);future.length=0;draft=value;handle.refresh();},undo(){future.push(draft);draft=history.pop()!;handle.refresh();},redo(){history.push(draft);draft=future.pop()!;handle.refresh();},save:async()=>{},reload:async()=>{},dirty:()=>true,saveLabel:'Save'});
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];function control(name:string){const e=all(host).find(e=>e.attrs['aria-label']===name);assert(e,name);return e;}function set(name:string,value:string){const e=control(name);e.value=value;e.onchange!();}
try{
 set('Command','review');set('Action 1 state value','3.25');assert.equal((draft.commands.review.actions[0]as any).set,3.25,'existing literal numeric control retained');
 set('Action 1 state value source','query');set('Action 1 state value read query','expr.tuned');
 set('Action 2 increment source','state');set('Action 2 increment read state','expr.source');
 assert(!control('Action 2 increment read state').children.some(e=>e.value==='expr.word'),'numeric picker excludes string declarations');
 set('Action 3 quantity source','state');set('Action 3 quantity read state','expr.source');
 set('Action 4 tokens source','query');set('Action 4 tokens read query','expr.tuned');
 assert(!control('Action 4 tokens read query').children.some(e=>e.value==='expr.label'),'numeric picker excludes label queries');
 let state:any={flags:{},items:{},tokens:10};const session=new GameplaySession(draft,{read:()=>state,write:next=>{state=next;}});session.readContext=()=>({tuning:data.tuning,labels:data.texts});assert(session.dispatch('review','interaction').ok);assert.equal(stateValue(state.values,'expr.target'),4);assert.equal(stateValue(state.values,'expr.integer'),2);assert.equal(state.items.part,2);assert.equal(state.tokens,14);session.dispose();
 const valid=structuredClone(draft);set('Action 4 tokens read query','missing');assert.deepEqual(draft,valid,'invalid nested ref does not enter authoring history');assert(all(host).some(e=>e.textContent.includes('query reference missing')));
 const after=JSON.stringify(draft),undo=history.pop()!;future.push(draft);draft=undo;handle.refresh();assert.notEqual(JSON.stringify(draft),after);history.push(draft);draft=future.pop()!;handle.refresh();assert.equal(JSON.stringify(draft),after);
 set('Action 2 increment source','literal');set('Action 2 increment','-2');assert.equal((draft.commands.review.actions[1]as any).add,-2,'literal increment control remains available');
 // Restore the meaningful edited graph for pending native scene / Save integration.
 draft=valid;validateGameplay(draft);
 console.log('Action expression forms PASS: actual workbench literal/state/query controls for set/add/item/tokens, numeric source filtering, invalid reference atomicity and exact Undo/Redo.');
}finally{handle.dispose();globalThis.document=previous;}
export const editedActionExpressions=structuredClone(draft);
