import assert from 'node:assert/strict';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';import {validateStateReadReferences} from '../../src/ssg/game/engine/gameplay/state-reads';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';import {scalarRead,numericScalarRead,stringScalarRead} from '../../src/ssg/game/engine/gameplay/queries';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';import {renderStateReadsAuthoring} from '../../src/ssg/game/authoring/state-reads-authoring';import {DialogueElement,descendants} from './dialogue-authoring-fixture.mts';
const empty={version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}};
const owner=validateGameplay({...empty,state:{'owner.fed':{owner:'owner',lifetime:'save',type:'boolean',default:false},'owner.count':{owner:'owner',lifetime:'save',type:'number',default:2},'owner.name':{owner:'owner',lifetime:'save',type:'string',default:'Sprat'}},commands:{feed:{sources:['interaction'],actions:[{state:'owner.fed',set:true}]}}});
const reader=validateGameplay({...empty,stateReads:{'owner.fed':'boolean','owner.count':'number','owner.name':'string'},queries:{fed:{kind:'select',cases:[{when:{compare:{left:{state:'owner.fed'},op:'eq',right:{literal:true}}},value:{literal:true}},{value:{literal:false}}]}},commands:{grant:{sources:['interaction'],actions:[{tokens:{state:'owner.count'}}]}}});
validateStateReadReferences([owner,reader]);assert(numericScalarRead({state:'owner.count'},reader));assert(stringScalarRead({state:'owner.name'},reader));assert(!numericScalarRead({state:'owner.fed'},reader));
let state:any={flags:{},items:{},tokens:0};const port={read:()=>state,write:(s:any)=>{state=s;}},a=new GameplaySession(owner,port),b=new GameplaySession(reader,port);
assert.equal(b.query('fed'),false);assert.equal(state.values,undefined,'reader creates no foreign defaults');assert.equal(scalarRead({state:'owner.fed'},b.state()),undefined);
assert(a.dispatch('feed','interaction').ok);assert.equal(b.query('fed'),true,'next read sees the common root immediately');assert.equal(state.values.owner.fed,true);assert(!('reader'in state.values));
assert(b.dispatch('grant','interaction').ok);assert.equal(state.tokens,2);state=JSON.parse(JSON.stringify(state));assert.equal(new GameplaySession(reader,port).query('fed'),true,'ordinary persisted owner block');
const before=structuredClone(state);for(let i=0;i<10;i++)b.query('fed');assert.deepEqual(state,before,'queries never advance or write');
for(const reads of [{'absent.fed':'boolean'},{'owner.fed':'number'}])assert.throws(()=>validateStateReadReferences([owner,validateGameplay({...empty,stateReads:reads})]));
for(const definition of [{...reader,commands:{bad:{sources:['interaction'],actions:[{state:'owner.fed',set:false}]}}},{...reader,stateReads:{'owner.fed':'unknown'}},{...reader,state:{'owner.fed':owner.state!['owner.fed']}},{...reader,stateReads:{unqualified:'boolean'}}])assert.throws(()=>validateGameplay(definition));
const oldDocument=globalThis.document;(globalThis as any).document={createElement:()=>new DialogueElement()};try{
 let doc=validateGameplay(empty);const host=new DialogueElement(),draft:Record<string,string>={},form=new TypedForm(e=>{throw e;}),edit=(_label:string,change:(d:any)=>void)=>{const next=structuredClone(doc);change(next);doc=validateGameplay(next);validateStateReadReferences([owner,doc]);};
 renderStateReadsAuthoring(host as any,doc,{form,section:(p,t)=>form.section(p,t),edit,draft,refresh(){}});
 const change=(label:string,value:string)=>{const field=descendants(host).find(e=>e.attributes['aria-label']===label);assert(field);field.value=value;field.onchange!();};
 change('Read state ID','owner.fed');change('Read state expected type','boolean');descendants(host).find(e=>e.textContent==='Add read state reference')!.click();assert.equal(doc.stateReads!['owner.fed'],'boolean');
 const scalarHost=new DialogueElement();form.scalarRead(scalarHost as any,'Foreign read',{state:'owner.fed'},()=>{},doc);assert(descendants(scalarHost).some(e=>e.value==='owner.fed'),'common scalar selector includes the imported read');
}finally{globalThis.document=oldDocument;}
a.dispose();b.dispose();console.log('State reads PASS: qualified typed references, common root/no foreign defaults or writes, live owner commits/current persistence, numeric/string reads, missing/type conflict rejection and actual import/scalar controls.');
