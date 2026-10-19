import assert from 'node:assert/strict';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {stateValue} from '../../src/ssg/game/engine/gameplay/state';
import type {GameplayDefinition,GameplayState,GameplayAction,StateDeclaration} from '../../src/ssg/game/engine/gameplay/types';
const number=(value:number,extra:Partial<StateDeclaration>={}):StateDeclaration=>({owner:'expr',lifetime:'save',type:'number',default:value,min:-1000000,max:1000000,...extra});
export const expressionDefinition:GameplayDefinition={version:1,flags:['changed'],items:['part'],events:['copied'],conversations:{},reactions:[{event:'copied',command:'react'}],state:{
 'expr.source':number(2), 'expr.delta':number(-1), 'expr.integer':number(0), 'expr.decimal':number(.25,{integer:false}),
 'expr.target':number(0,{integer:false,nullable:true}), 'expr.word':{owner:'expr',lifetime:'save',type:'string',default:'crate'},
 'expr.text':{owner:'expr',lifetime:'save',type:'string',nullable:true,default:null},'expr.boolean':{owner:'expr',lifetime:'save',type:'boolean',default:false},
 'expr.null':{owner:'expr',lifetime:'save',type:'string',nullable:true,default:null}, 'expr.enum':{owner:'expr',lifetime:'save',type:'enum',options:['crate','parcel'],default:'parcel'},
},queries:{'expr.count':{kind:'count',conditions:[{state:'expr.integer',is:1},{state:'expr.integer',is:2}]},'expr.tuned':{kind:'tuning',key:'amount'},'expr.label':{kind:'label',key:'label'}},commands:{
 copy:{sources:['interaction'],actions:[{state:'expr.target',set:{state:'expr.decimal'}},{state:'expr.text',set:{state:'expr.word'}},{state:'expr.enum',set:{state:'expr.word'}},{emit:'copied'}]},
 react:{sources:['system'],actions:[{state:'expr.integer',add:{state:'expr.source'}}]},
 draft:{sources:['interaction'],actions:[{state:'expr.integer',set:1},{state:'expr.integer',add:{query:'expr.count'}},{state:'expr.source',set:3},{item:'part',add:{state:'expr.source'}},{tokens:{state:'expr.delta'}},{emit:'copied'}]},
 review:{sources:['interaction'],actions:[]},
}};
function fixture(actions?:GameplayAction[],patch:Partial<GameplayState>={},context:any={tuning:{amount:4},labels:{label:'COPIED'}}){
 const def=structuredClone(expressionDefinition);if(actions)def.commands.review.actions=actions;let state:GameplayState={flags:{},items:{},tokens:10,...patch};let writes=0;const notifications:any[]=[];
 const session=new GameplaySession(def,{read:()=>state,write:next=>{state=next;writes++;}});session.readContext=()=>context;session.observe(event=>notifications.push(event));
 return{session,state:()=>state,writes:()=>writes,notifications,value:(id:string)=>stateValue(session.state().values,id)};
}
let checks=0;
const copy=fixture();assert(copy.session.dispatch('copy','interaction').ok);assert.equal(copy.value('expr.target'),.25);assert.equal(copy.value('expr.text'),'crate');assert.equal(copy.value('expr.enum'),'crate');assert.equal(copy.value('expr.integer'),2);assert.equal(copy.writes(),1);checks++;
const draft=fixture();const before=structuredClone(draft.state());assert(draft.session.eligibility('draft','interaction').ok);assert.deepEqual(draft.state(),before);assert.equal(draft.writes(),0);assert.equal(draft.notifications.length,0);assert(draft.session.dispatch('draft','interaction').ok);assert.equal(draft.value('expr.integer'),5,'query sees earlier draft write, reaction reads later draft source');assert.equal(draft.state().items.part,3);assert.equal(draft.state().tokens,9);assert.equal(draft.writes(),1);checks++;
for(const [action,expected]of [
 [{state:'expr.text',set:{state:'expr.null'}},null],
 [{state:'expr.target',set:{state:'expr.null'}},null],
 [{state:'expr.boolean',set:{literal:true}},true],
 [{state:'expr.enum',set:{literal:'crate'}},'crate'],
 [{state:'expr.target',set:{query:'expr.tuned'}},4],
 [{state:'expr.text',set:{query:'expr.label'}},'COPIED'],
 [{state:'expr.target',add:{state:'expr.decimal'}},.25],
 [{state:'expr.target',add:{literal:.5}},.5],
 [{item:'part',add:{literal:2}},2],
 [{tokens:{literal:-2}},8],
]as [GameplayAction,unknown][]){const f=fixture([action]);assert(f.session.dispatch('review','interaction').ok);assert.equal('state'in action?f.value(action.state):'item'in action?f.state().items[action.item]:f.state().tokens,expected);checks++;}
for(const [actions,patch,context]of [
 [[{state:'expr.integer',add:{state:'expr.decimal'}}],{},undefined],
 [[{state:'expr.integer',set:{state:'expr.null'}}],{},undefined],
 [[{state:'expr.boolean',set:{state:'expr.word'}}],{},undefined],
 [[{state:'expr.integer',set:{query:'expr.tuned'}}],{},{tuning:{amount:1000001}}],
 [[{state:'expr.integer',add:{query:'expr.tuned'}}],{},{tuning:{amount:Number.MAX_SAFE_INTEGER+1}}],
 [[{tokens:{query:'expr.tuned'}}],{},{tuning:{amount:.5}}],
 [[{tokens:{query:'expr.tuned'}}],{},{tuning:{amount:null}}],
 [[{tokens:{query:'expr.tuned'}}],{},{tuning:{amount:true}}],
 [[{tokens:{query:'expr.tuned'}}],{},{tuning:{}}],
 [[{tokens:{query:'expr.tuned'}}],{},{tuning:{amount:1000001}}],
 [[{item:'part',add:{query:'expr.tuned'}}],{},{tuning:{amount:NaN}}],
 [[{item:'part',add:{query:'expr.tuned'}}],{},{tuning:{amount:Infinity}}],
 [[{item:'part',add:{query:'expr.tuned'}}],{},{tuning:{amount:-1}}],
 [[{item:'part',add:{query:'expr.tuned'}}],{items:{part:999999}},{tuning:{amount:2}}],
 [[{tokens:{query:'expr.tuned'}}],{tokens:999999},{tuning:{amount:2}}],
]as [GameplayAction[],Partial<GameplayState>,any][]){const f=fixture([{flag:'changed',value:true},{emit:'copied'},...actions],patch,context);const initial=structuredClone(f.state());assert.deepEqual(f.session.dispatch('review','interaction'),{ok:false,reason:'resources'});assert.deepEqual(f.state(),initial,'all earlier writes roll back');assert.equal(f.writes(),0);assert.equal(f.notifications.length,0);assert.equal(f.session.events().length,0);checks++;}
for(const amount of[-1000000,0,1000000])for(const kind of['tokens','item']as const){const f=fixture([kind==='tokens'?{tokens:{query:'expr.tuned'}}:{item:'part',add:{query:'expr.tuned'}}],{tokens:amount<0?1000000:0,items:amount<0?{part:1000000}:{}},{tuning:{amount}});assert(f.session.dispatch('review','interaction').ok);checks++;}
for(const action of[
 {state:'expr.target',set:{state:'missing.value'}},{state:'expr.target',set:{query:'missing'}},{state:'expr.target',set:{literal:Infinity}},
 {state:'expr.target',add:{state:'expr.word'}},{item:'part',add:{query:'expr.label'}},{tokens:{state:'expr.boolean'}},
 {tokens:{literal:.5}},{item:'part',add:{literal:1000001}},{state:'expr.integer',add:{literal:.5}},
]as GameplayAction[]){assert.throws(()=>fixture([action]));checks++;}
// Deletion or a one-sided rename must not silently change a nested action read to a default.
for(const kind of['state','query']as const)for(const operation of['delete','rename']){const def=structuredClone(expressionDefinition);def.state!['expr.onlyRead']=number(3);def.commands.review.actions=[{state:'expr.target',set:kind==='state'?{state:'expr.onlyRead'}:{query:'expr.tuned'}}];if(kind==='state'){if(operation==='rename')def.state!['expr.renamed']=def.state!['expr.onlyRead'];delete def.state!['expr.onlyRead'];}else{if(operation==='rename')def.queries!['expr.renamed']=def.queries!['expr.tuned'];delete def.queries!['expr.tuned'];}assert.throws(()=>validateGameplay(def));checks++;}
console.log(`Action expressions PASS: ${checks} draft-order/reaction, nullable/string/enum/decimal copies, numeric and resource boundaries, missing/wrong-type refusal, pure eligibility, atomic rollback/history and nested-reference validation cases.`);
