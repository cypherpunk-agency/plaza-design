import assert from 'node:assert/strict';
import {worldVariables} from '../../src/ssg/game/authoring/world-variables';
import {mountWorldVariableAuthoring} from '../../src/ssg/game/authoring/world-variable-authoring';
import {Element} from './rules-harness.mts';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import type {EditorDocument} from '../../src/ssg/game/authoring/contracts';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
import fs from 'node:fs';import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
const graph=(value:number):GameplayDefinition=>({version:1,flags:[],items:[],events:[],commands:{reward:{sources:['system'],actions:[{state:'local.count',add:1}]}},reactions:[],conversations:{talk:{entry:[{node:'one'}],nodes:{one:{speaker:'TEST',pages:['{state:local.count}'],template:true}}}},state:{'local.count':{owner:'local',lifetime:'save',type:'number',default:value,min:0,max:10,binding:'world.counter'}},queries:{literal:{kind:'select',cases:[{value:{literal:'local.count'}}]}}});
const documents:EditorDocument[]=[{id:'one-gameplay',kind:'gameplay',revision:'fixture',value:graph(1)},{id:'two-gameplay',kind:'gameplay',revision:'fixture',value:graph(2)}];
const index=worldVariables(documents);assert.equal(index.length,2);assert(index.every(v=>v.address==='world.counter'));assert(index.every(v=>v.usages.some(u=>u.path==='commands.reward.actions.0.state'&&u.kind==='read/write')));assert(index.every(v=>v.usages.some(u=>u.path==='conversations.talk.nodes.one.pages'&&u.kind==='read')));assert(index.every(v=>v.usages.every(u=>u.document===v.document)));assert(index.every(v=>!v.usages.some(u=>u.path.includes('literal'))),'Text and literal values are not references');
const model=new ComposerModel(art,undefined,(doc)=>validateGameplay(doc.value));model.load(documents);
const host=new Element(),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];let handle:ReturnType<typeof mountWorldVariableAuthoring>;
const context:any={get documents(){return model.list();},authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>{model.edit(id,label,()=>value);handle?.refresh?.();}},openScene(){throw Error('No scene was requested');}};
handle=mountWorldVariableAuthoring(host as any,context);
const field=(name:string)=>{const found=all(host).find(e=>e.attributes['aria-label']===name);assert(found,name);return found;},set=(name:string,value:string)=>{const e=field(name);e.value=value;e.onchange!();};
set('Variable','one-gameplay / local.count');set('State local.count default','4');assert.equal((model.get('one-gameplay').value as GameplayDefinition).state!['local.count'].default,4);assert.equal((model.get('two-gameplay').value as GameplayDefinition).state!['local.count'].default,2);
const valid=structuredClone(model.get('one-gameplay').value);set('State local.count state binding','bad');assert.deepEqual(model.get('one-gameplay').value,valid);assert(all(host).some(e=>e.attributes.role==='alert'&&e.textContent));set('State local.count state binding','world.counter');assert(!all(host).some(e=>e.attributes.role==='alert'&&e.textContent));
model.undo();assert.equal((model.get('one-gameplay').value as GameplayDefinition).state!['local.count'].default,1);model.redo();assert.deepEqual(model.get('one-gameplay').value,valid);
const receiver=new ComposerModel(art,undefined,doc=>validateGameplay(doc.value));receiver.load(documents);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));assert.deepEqual(receiver.get('one-gameplay').value,valid);
set('Filter variables','does-not-exist');assert(all(host).some(e=>e.textContent==='No matching variables.'));set('Filter variables','world.counter');assert(field('Variable'));handle();assert.equal(host.children.length,0);
const actual=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join('src/ssg/game',d.file),'utf8'))})),actualIndex=worldVariables(actual);
assert(actualIndex.some(v=>v.document==='state-owners'&&v.id==='shift.statementRead'&&v.usages.some(u=>u.kind==='checkpoint'&&u.value===true)),'Actual commute checkpoint values appear beside the shared declaration');
assert.deepEqual(worldVariables([{id:'opening-story',kind:'rules',revision:'fixture',value:{GAMEPLAY:graph(3)}}])[0].path,['GAMEPLAY'],'Inline global story declarations are indexed even though the shipped story currently declares no scalar state');
const shop=graph(0);shop.state={'shop.step':{owner:'shop',type:'number',lifetime:'save',default:0}};shop.commands={};shop.conversations={};shop.queries={};
const own=worldVariables([{id:'shop-gameplay',kind:'gameplay',revision:'fixture',value:shop},{id:'play-fixtures',kind:'fixtures',revision:'fixture',value:{fixtures:[{id:'test',scene:'shop',state:{step:0}}]}}]);assert(own[0].usages.some(u=>u.kind==='checkpoint'&&u.value===0),'Checkpoint keys follow the same shortening as native checkpoint application, including zero');
const output=path.resolve('../../.game-test-output'),root=fs.mkdtempSync(path.join(output,'world-variable-save-'));try{
 for(const descriptor of sourceDocuments){const file=path.join(root,descriptor.file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',descriptor.file),file);}
 const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),current=store.read('state-owners'),value=structuredClone(current.value)as GameplayDefinition;value.state!['review.variable']={owner:'review',type:'boolean',lifetime:'save',default:true};store.save([{id:'state-owners',revision:current.revision,value}]);
 const reconstructed=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});assert.equal((reconstructed.read('state-owners').value as GameplayDefinition).state!['review.variable'].default,true);
}finally{assert(root.startsWith(output+path.sep));fs.rmSync(root,{recursive:true,force:true});}
console.log('World variables PASS: scoped declarations, canonical addresses, typed references/templates, literal exclusions, forms, atomic rejection/correction, history, bundle and disposal.');
