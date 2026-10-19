import type {GameplayDefinition} from '../engine/gameplay/types';
import type {QueryDefinition} from '../engine/gameplay/queries';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';

/** The same bounded pure query graph used by commands, native devices and captions. */
export function renderGameplayQueriesAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls){
 const {form,section,edit,draft,data}=ui,box=section(parent,'Read-only queries',true);
 const tuning=Object.keys(data?.tuning??{}),labels=Object.entries(data?.texts??{}).filter(([,v])=>typeof v==='string').map(([id])=>id);
 const kinds=['count','select','duration',...(tuning.length?['tuning']:[]),...(labels.length?['label']:[])];
 const initial=(kind:string):QueryDefinition=>kind==='count'?{kind:'count',conditions:[{tokensAtLeast:0}]}:kind==='select'?{kind:'select',cases:[{value:{literal:''}}]}:kind==='tuning'?{kind:'tuning',key:tuning[0]}:kind==='label'?{kind:'label',key:labels[0]}:{kind:'duration',value:{literal:1000},unit:'seconds',round:'nearest'};
 for(const[id,q]of Object.entries(doc.queries??{})){
  const host=section(box,'Query '+id,true),prefix='Query '+id;
  const mutate=(change:(q:QueryDefinition)=>void)=>edit('Edit read-only query',g=>change(g.queries![id]));
  form.select(host,prefix+' kind',kinds,q.kind,kind=>edit('Change query operation',g=>{g.queries![id]=initial(kind);}));
  if(q.kind==='count'){
   q.conditions.forEach((c,i)=>{const p=prefix+' row '+(i+1);form.condition(host,p,c,when=>mutate(q=>{if(q.kind!=='count'||!when)throw Error('Count row requires a condition');q.conditions[i]=when;}),doc);form.button(host,'Remove '+p,()=>mutate(q=>{if(q.kind==='count')q.conditions.splice(i,1);}),q.conditions.length<=1);});
   form.button(host,'Add '+prefix+' row',()=>mutate(q=>{if(q.kind==='count')q.conditions.push({tokensAtLeast:0});}),q.conditions.length>=128);
  }else if(q.kind==='select'){
   q.cases.forEach((row,i)=>{const p=prefix+' case '+(i+1);if(i<q.cases.length-1)form.condition(host,p+' condition',row.when,when=>mutate(q=>{if(q.kind!=='select'||!when)throw Error('Ordered condition required');q.cases[i].when=when;}),doc);form.scalarRead(host,p+' value',row.value,value=>mutate(q=>{if(q.kind==='select')q.cases[i].value=value;}),doc);
    if(i<q.cases.length-1){form.button(host,'Remove '+p,()=>mutate(q=>{if(q.kind==='select')q.cases.splice(i,1);}));for(const step of[-1,1])form.button(host,(step<0?'Move earlier ':'Move later ')+p,()=>mutate(q=>{if(q.kind==='select')[q.cases[i],q.cases[i+step]]=[q.cases[i+step],q.cases[i]];}),i+step<0||i+step>=q.cases.length-1);}
   });form.button(host,'Add '+prefix+' case',()=>mutate(q=>{if(q.kind==='select')q.cases.splice(q.cases.length-1,0,{when:{tokensAtLeast:0},value:{literal:''}});}),q.cases.length>=32);
  }else if(q.kind==='duration'){form.scalarRead(host,prefix+' milliseconds',q.value,value=>mutate(q=>{if(q.kind==='duration')q.value=value;}),doc);form.select(host,prefix+' unit',['seconds'],q.unit,()=>{});form.select(host,prefix+' rounding',['nearest'],q.round,()=>{});}
  else if(q.kind==='tuning')form.select(host,prefix+' tuning',tuning,q.key,key=>mutate(q=>{if(q.kind==='tuning')q.key=key;}));
  else form.select(host,prefix+' label',labels,q.key,key=>mutate(q=>{if(q.kind==='label')q.key=key;}));
  form.button(host,'Remove '+prefix,()=>edit('Remove read-only query',g=>{delete g.queries![id];}));
 }
 form.text(box,'New query ID',draft.query??'',id=>{draft.query=id;});form.select(box,'New query kind',kinds,draft.queryKind??'count',kind=>{draft.queryKind=kind;});form.button(box,'Add read-only query',()=>edit('Add read-only query',g=>{const id=draft.query??'';g.queries??={};if(Object.prototype.hasOwnProperty.call(g.queries,id))throw Error('Query ID already exists');g.queries[id]=initial(draft.queryKind??'count');}),Object.keys(doc.queries??{}).length>=64);
}
