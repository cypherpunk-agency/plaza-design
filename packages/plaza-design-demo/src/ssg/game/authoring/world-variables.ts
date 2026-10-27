import type {EditorDocument} from './contracts';
import type {GameplayDefinition,StateDeclaration,StateValue} from '../engine/gameplay/types';
import {stateBinding} from '../engine/gameplay/state';
import {authoredDocuments} from './scene-catalogue-projection';
import {gameplayScene} from './gameplay-scenes';
import {fixtureStateId} from '../world/checkpoints';

export interface VariableUsage {document:string;path:string;kind:'read/write'|'read'|'binding'|'shared access'|'checkpoint';scene?:string;value?:StateValue}
export interface WorldVariable {document:string;path:string[];id:string;address:string;declaration:StateDeclaration;usages:VariableUsage[]}
/** Index authored declarations and typed references. It does not compile a world, sample a save,
 * execute queries or treat arbitrary text/literal strings as variable references. */
export function worldVariables(input:readonly EditorDocument[]):WorldVariable[]{
 const documents=[...input],catalogue=documents.find(d=>d.id==='authored-scenes');
 if(catalogue)for(const child of authoredDocuments(catalogue))if(!documents.some(d=>d.id===child.id))documents.push(child);
 const sources=documents.flatMap(d=>{
  if(d.id==='opening-story')return [{document:d.id,path:['GAMEPLAY'],value:(d.value as {GAMEPLAY:GameplayDefinition}).GAMEPLAY}];
  const value=d.value as Partial<GameplayDefinition>;
  return d.kind==='gameplay'||d.id==='state-owners'?[{document:d.id,path:[] as string[],value:value as GameplayDefinition}]:[];
 });
 const result=sources.flatMap(s=>Object.entries(s.value.state??{}).map(([id,declaration])=>({document:s.document,path:s.path,id,address:stateBinding(id,s.value),declaration,usages:[] as VariableUsage[]})));
 const sceneForSource=new Map<string,string>();
 for(const d of documents.filter(d=>d.kind==='composition')){const scene=(d.value as {scene:string}).scene;try{sceneForSource.set(gameplayScene(scene,documents).gameplayId,scene);}catch{/* Asset-only composition. */}}
 const reference=(document:string,path:string,id:string,kind:VariableUsage['kind'],source?:typeof sources[number],scene?:string)=>{
  const local=source&&result.find(v=>v.document===source.document&&v.id===id);
  const matches=local?[local]:result.filter(v=>(v.document==='state-owners'&&v.id===id&&source?.value.sharedState?.includes(v.declaration.owner))||(source?.value.stateReads?.[id]&&v.address===id));
  for(const row of matches)row.usages.push({document,path,kind,...(scene?{scene}:{})});
 };
 const walk=(value:unknown,document:string,path:string[],source?:typeof sources[number],scene?:string)=>{
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,document,[...path,String(i)],source,scene));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   if(key==='literal'||key==='stateReads'||key==='sharedState'||key==='state'&&typeof child==='object')continue;
   const location=[...path,key];
   if(typeof child==='string'&&(key==='state'||key==='stock'&&path.includes('purchases')))reference(document,location.join('.'),child,key==='stock'||'set'in value||'add'in value||'items'in value?'read/write':'read',source,scene);
   else if(key==='pages'&&(value as {template?:boolean}).template===true){for(const page of Array.isArray(child)?child:[])if(typeof page==='string')for(const match of page.matchAll(/\{state:([^{}]+)\}/g))reference(document,location.join('.'),match[1],'read',source,scene);}
   else walk(child,document,location,source,scene);
  }
 };
 for(const d of documents){
  if(d.id==='authored-scenes'||d.kind==='fixtures')continue;
  let source=sources.find(s=>s.document===d.id),scene=sceneForSource.get(d.id);
  if(d.id==='companion')source=sources.find(s=>s.document==='companion-gameplay');
  if(!source&&d.kind==='scene'){const value=d.value as {id:string};scene=value.id;try{const id=gameplayScene(scene,documents).gameplayId;source=sources.find(s=>s.document===id);}catch{/* Non-gameplay chunk. */}}
  walk(d.value,d.id,[],source,scene);
  if(source){
   for(const id of Object.keys(source.value.stateReads??{}))reference(d.id,[...source.path,'stateReads',id].join('.'),id,'read',source,scene);
   for(const row of result.filter(v=>v.document==='state-owners'&&source.value.sharedState?.includes(v.declaration.owner)))row.usages.push({document:d.id,path:[...source.path,'sharedState'].join('.'),kind:'shared access'});
  }
 }
 for(const row of result){
  if(row.declaration.binding)row.usages.push({document:row.document,path:[...row.path,'state',row.id,'binding'].join('.'),kind:'binding'});
  for(const d of documents.filter(d=>d.kind==='fixtures'))for(const f of (d.value as {fixtures:{id:string;scene:string;state:Record<string,StateValue>}[]}).fixtures){
   let source:string|undefined;try{source=gameplayScene(f.scene,documents).gameplayId;}catch{}
   const key=fixtureStateId(f.scene,row.id,row.declaration);
   if(key!==undefined&&(source===row.document||row.document==='state-owners'&&sources.find(s=>s.document===source)?.value.sharedState?.includes(row.declaration.owner))&&Object.prototype.hasOwnProperty.call(f.state,key))row.usages.push({document:d.id,path:'fixtures.'+f.id+'.state.'+key,kind:'checkpoint',scene:f.scene,value:f.state[key]});
  }
 }
 return result.sort((a,b)=>a.address.localeCompare(b.address)||a.document.localeCompare(b.document));
}
