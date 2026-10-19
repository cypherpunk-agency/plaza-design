import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {openingStoryModel,createOpeningModel,validateOpeningSource,type OpeningSource} from '../../src/ssg/game/story/opening-source';
import {mountOpeningAuthoring} from '../../src/ssg/game/authoring/opening-authoring';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';

const legacy=fs.readFileSync('../../.scene-system/baseline/source/ssg/game/opening.ts','utf8'),exports:any={},module={exports};
vm.runInNewContext(ts.transpileModule(legacy,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,module,require:()=>({SHIFT_PROTOTYPE:false,SUDO:false})});
const original=module.exports,source=structuredClone(openingStoryModel.source),flags=Object.values(source.OPENING);
for(let mask=0;mask<64;mask++){
 const f=Object.fromEntries(flags.map((id,i)=>[id,!!(mask&(1<<i))]));
 assert.equal(openingStoryModel.openingState(f),original.openingState(f));
 assert.equal(openingStoryModel.openingResume(f),original.openingResume(f));
 assert.equal(openingStoryModel.hackLocked(f),original.hackLocked(f));
 assert.equal(openingStoryModel.isBefore(f),original.isBefore(f));
}
for(const change of [
 (d:OpeningSource)=>d.PHASE_RULES=[],
 (d:OpeningSource)=>delete d.PHASE_RULES[0].when,
 (d:OpeningSource)=>d.PHASE_RULES.at(-1)!.when={flag:d.OPENING.home},
 (d:OpeningSource)=>(d.PHASE_RULES[0].phase as string)='missing',
 (d:OpeningSource)=>d.PHASE_RULES[0].when={flag:'missing'},
 (d:OpeningSource)=>d.PHASE_RULES[0].when={tokensAtLeast:0},
 (d:OpeningSource)=>d.PHASE_RULES[0].when={any:[{flag:d.OPENING.home},{weather:['rain']}]},
]){const d=structuredClone(source);change(d);assert.throws(()=>validateOpeningSource(d));}

class Element {
 children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';disabled=false;onchange?:()=>void;onclick?:()=>void;
 append(...nodes:Element[]){this.children.push(...nodes);}replaceChildren(...nodes:Element[]){this.children=nodes;}setAttribute(k:string,v:string){this.attributes[k]=v;}
}
const prior=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
try{
 const documents=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'phase-rules',value:JSON.parse(fs.readFileSync('src/ssg/game/'+d.file,'utf8'))}));
 const values=new Map(documents.map(d=>[d.id,d])),host=new Element();let edits=0;
 const context:any={documents,authoring:{get:(id:string)=>structuredClone(values.get(id)!),edit:(id:string,_label:string,value:unknown)=>{validateOpeningSource(value);values.get(id)!.value=structuredClone(value);edits++;}}};
 const mounted=mountOpeningAuthoring(host as any,context),all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
 const change=(name:string,value:string)=>{const field=all(host).find(e=>e.attributes['aria-label']===name);assert(field,'typed control '+name);field.value=value;field.onchange!();};
 const click=(label:string)=>{const button=all(host).find(e=>e.textContent===label);assert(button,'typed button '+label);assert(!button.disabled);button.onclick!();};
 const draft=()=>values.get('opening-story')!.value as OpeningSource;
 change('Opening input group','Phases');
 change('Phase rule 2 phase','deleted');
 assert.equal(createOpeningModel(draft()).openingState({[source.OPENING.home]:true,[source.OPENING.uplink]:true}),'deleted','pending source controls phase selection');
 assert.equal(openingStoryModel.openingState({[source.OPENING.home]:true,[source.OPENING.uplink]:true}),'uplinked','default facade isolated');
 change('Phase rule 2 phase','uplinked');
 click('Move phase rule 3 up');
 assert.equal(createOpeningModel(draft()).openingState({[source.OPENING.home]:true,[source.OPENING.uplink]:true,[source.OPENING.slept]:true}),'deleted','authored order wins');
 click('Move phase rule 2 down');
 assert.equal(createOpeningModel(draft()).openingState({[source.OPENING.home]:true,[source.OPENING.uplink]:true,[source.OPENING.slept]:true}),'uplinked');
 click('Add opening phase rule');assert.equal(draft().PHASE_RULES.length,6);
 change('Phase rule 5 condition type','not');
 change('Phase rule 5 condition not flag',source.OPENING.flat);
 change('Phase rule 5 phase','deleted');
 assert.equal(createOpeningModel(draft()).openingState({[source.OPENING.home]:true}),'deleted','shared nested flag condition executes');
 click('Remove phase rule 5');assert.deepEqual(draft().PHASE_RULES,source.PHASE_RULES);
 assert(edits>=8);mounted();assert.equal(host.children.length,0);
}finally{globalThis.document=prior;}
console.log('Opening phase rules PASS:64 frozen flag histories; source order/conditions; typed create/edit/reorder/remove; invalid conditions/refs/fallbacks; default isolation.');
