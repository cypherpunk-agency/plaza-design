/** Real structured controls over ComposerModel: identity follows source operations, never raw indices. */
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import type {ChunkDocument,Value} from '../../src/ssg/game/art/core/composition';
import {ComposerModel,COMPOSER_HISTORY_LIMIT} from '../../src/ssg/game/authoring/composer-model';
import {createFieldControls,label} from '../../src/ssg/game/authoring/controls';
class Element{
 children:Element[]=[];dataset:Record<string,string>={};attrs:Record<string,string>={};className='';textContent='';type='';value='';min='';max='';step='';disabled=false;checked=false;title='';onclick?:()=>void;onchange?:()=>void;
 constructor(readonly tag:string){}append(...nodes:Element[]){this.children.push(...nodes);}setAttribute(k:string,v:string){this.attrs[k]=v;}addEventListener(){}
 querySelector(selector:string):Element|undefined{return all(this).find(n=>selector==='button[data-row-select]'&&n.tag==='button'&&n.dataset.rowSelect!==undefined);}
}
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],prior=globalThis.document;
Object.assign(globalThis,{document:{createElement:(tag:string)=>new Element(tag)}});
try{
 createFieldControls(()=>{},undefined,()=>{throw Error('Selection scope must not be read during editor construction');});
 for(const[type,property,initial]of [
  ['environment.sky-traffic','ships',(art.properties('environment.sky-traffic',{}).ships as Value[]).slice(0,3)],
  ['train.registryScreen','pages',[['FIRST'],['SECOND'],['THIRD']]],
 ]as const){
  const model=new ComposerModel(art);model.load([{id:'rows',kind:'composition',revision:'test',value:{version:1,scene:'rows',instances:[{id:'item',type,props:{[property]:initial},placement:{x:0,h:0},order:0,layer:art.get(type).framePhase==='sky'?'distance':'backdrop'}]}}]);
  let scope:string=type;
  const notices:string[]=[],controls=createFieldControls(text=>notices.push(text),undefined,()=>scope),field=art.get(type).fields[property];let form:Element;
  const values=()=>((model.get('rows').value as ChunkDocument).instances[0].props[property] as Value[]);
  const render=()=>{form=controls.fieldInput(field,values(),next=>{model.updateInstance('rows','item','Edit nested rows',n=>{n.props[property]=next;});render();}) as unknown as Element;};
  const rows=()=>form.children.filter(n=>n.className==='structured-row'),action=(row:Element,name:string)=>row.children[0].children.find(n=>n.attrs['aria-label']===name||n.textContent===name)!;
  render();assert.equal(rows().length,3);const second=rows()[1],key=second.dataset.rowKey,original=structuredClone(values()),oldInput=all(second).find(n=>n.tag==='input'&&n.type==='number');
  const group=label(field.label,form as unknown as HTMLElement) as unknown as Element;assert.equal(group.tag,'div');assert.equal(group.attrs.role,'group','A structured form must not make its first row button the label target');
  action(second,'Row 2').onclick!();action(second,'Move row up').onclick!();assert.deepEqual(values()[0],original[1]);assert.equal(rows()[0].dataset.rowKey,key);assert.equal(rows()[0].dataset.selected,'true');
  model.undo();render();assert.deepEqual(values(),original);assert.equal(rows()[1].dataset.rowKey,key);assert.equal(rows()[1].dataset.selected,'true');
  model.redo();render();assert.equal(rows()[0].dataset.rowKey,key);
  if(oldInput){const before=JSON.stringify(values());oldInput.value='100';oldInput.onchange!();assert.equal(JSON.stringify(values()),before,'Detached callbacks cannot edit a different row after reorder');assert(notices.some(s=>s.includes('list changed')));}
  action(rows()[1],'Remove').onclick!();assert.equal(rows()[0].dataset.rowKey,key,'Removing an earlier/later sibling never retargets selection');assert.equal(rows()[0].dataset.selected,'true');assert.equal(values().length,2);
  const existing=rows().map(r=>r.dataset.rowKey);form.children.at(-1)!.onclick!();assert.equal(values().length,3);assert(!existing.includes(rows()[2].dataset.rowKey));assert.equal(rows()[2].dataset.selected,'true');
  model.undo();render();assert.equal(values().length,2);assert.deepEqual(rows().map(r=>r.dataset.rowKey),existing,'Undo restores the same editor row identities');
  // Returning to the complete original source restores its original identities, not ordinal guesses.
  model.undo();model.undo();render();assert.deepEqual(values(),original);assert.equal(rows()[1].dataset.rowKey,key);
  assert.equal(field.animatable,false,'Nested configuration has no unsupported property track');
  const originalKeys=rows().map(r=>r.dataset.rowKey);
  for(let i=1;i<=COMPOSER_HISTORY_LIMIT;i++){
   const input=all(rows()[0]).find(n=>n.tag==='input'&&n.type===(type==='train.registryScreen'?'text':'number'))!;
   assert(input);input.value=type==='train.registryScreen'?'PAGE '+i:String(i);input.onchange!();
   assert.deepEqual(rows().map(r=>r.dataset.rowKey),originalKeys,'Value changes keep row identity');
  }
  for(let i=0;i<COMPOSER_HISTORY_LIMIT;i++){model.undo();render();assert.deepEqual(rows().map(r=>r.dataset.rowKey),originalKeys,'Every retained Undo restores row identity');}
  assert.deepEqual(values(),original);
  const beforeLeaving=JSON.stringify(values()),oldAdd=form.children.at(-1)!;scope='another-selected-asset';oldAdd.onclick!();assert.equal(JSON.stringify(values()),beforeLeaving,'A detached callback cannot modify an asset after selection changes');
 }
 console.log('Structured rows PASS: actual list/array controls, move/add/remove, stable selection, Undo/Redo, nested pages and stale callback rejection through ComposerModel.');
}finally{Object.assign(globalThis,{document:prior});}
