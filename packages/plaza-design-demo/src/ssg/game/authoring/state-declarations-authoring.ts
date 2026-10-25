import {concreteStateValue} from '../engine/gameplay/state';
import type {GameplayDefinition,StateDeclaration} from '../engine/gameplay/types';
import type {GameplayBindingControls} from './gameplay-bindings-authoring';
import {activeSharedState,sharedStateOwners} from '../engine/gameplay/shared-state';
/** One schema editor shared by scene Devices and gameplay; writes always target gameplay.state. */
export function renderStateDeclarationsAuthoring(parent:HTMLElement,doc:GameplayDefinition,ui:GameplayBindingControls,owner?:string){
 const{form,section,edit,draft}=ui;
 const scalar=(host:HTMLElement,name:string,d:StateDeclaration,change:(d:StateDeclaration)=>void)=>{
  form.check(host,name+' nullable',d.nullable??false,on=>change({...d,nullable:on,...(!on&&d.default===null?{default:concreteStateValue(d)}:{})}));
  if(d.type==='number')form.check(host,name+' integer',d.integer!==false,on=>change({...d,integer:on}));
  form.stateValue(host,name+' default',d.default,d,value=>change({...d,default:value}));
  if(d.type==='number'){const field=d.integer===false?form.decimal.bind(form):form.number.bind(form);field(host,name+' minimum',d.min??-1000000,v=>change({...d,min:v}),Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);field(host,name+' maximum',d.max??1000000,v=>change({...d,max:v}),Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);}
  else if(d.type==='string')form.number(host,name+' maximum length',d.maxLength??2000,v=>change({...d,maxLength:v}),1,2000);
  else if(d.type==='enum')form.text(host,name+' options',d.options!.join('\n'),v=>change({...d,options:v.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)}),true);
 };
 const schema=section(parent,'State declarations',true);
 // Registered world-state prefixes are accessed here; values are never copied.
 const shared=owner===undefined?[...sharedStateOwners(activeSharedState() as Pick<GameplayDefinition,'state'>)].filter(o=>!Object.values(doc.state??{}).some(d=>d.owner===o&&!doc.sharedState?.includes(o))):[];
 for(const o of shared)form.check(schema,'Access world-state prefix '+o,!!doc.sharedState?.includes(o),on=>edit(on?'Access world-state prefix':'Stop accessing world-state prefix',g=>{const owners=new Set(g.sharedState??[]);if(on)owners.add(o);else{owners.delete(o);for(const[id,d]of Object.entries(g.state??{}))if(d.owner===o)delete g.state![id];}if(owners.size)g.sharedState=[...owners];else delete g.sharedState;}));
 for(const[id,d]of Object.entries(doc.state??{}).filter(([,d])=>(owner===undefined||d.owner===owner)&&!doc.sharedState?.includes(d.owner))){
  const box=section(schema,'State '+id,true),name='State '+id;
   form.select(box,name+' lifetime',['save','session','interaction'],d.lifetime,v=>edit('Edit state lifetime',g=>{g.state![id].lifetime=v as StateDeclaration['lifetime'];}));
   form.text(box,name+' state binding',d.binding??'',binding=>edit('Edit world-state binding',g=>{if(binding.trim())g.state![id].binding=binding.trim();else delete g.state![id].binding;}));
   form.select(box,name+' type',['boolean','number','enum','string'],d.type,v=>edit('Edit state type',g=>{g.state![id]={owner:d.owner,lifetime:d.lifetime,...(d.binding?{binding:d.binding}:{}),type:v as StateDeclaration['type'],default:v==='boolean'?false:v==='number'?0:v==='enum'?'value':'',...(v==='enum'?{options:['value']}:{} )};}));
   scalar(box,name,d,value=>edit('Edit state declaration',g=>{g.state![id]=value;}));
  form.button(box,'Remove '+name,()=>edit('Remove state declaration',g=>{delete g.state![id];}));
 }
 if(owner===undefined)form.text(schema,'New state key prefix',draft.owner??'scene',v=>{draft.owner=v;});form.text(schema,'New state local ID',draft.state??'',v=>{draft.state=v;});
 form.button(schema,'Add shared state',()=>edit('Add shared state',g=>{const selectedOwner=owner??draft.owner??'scene',id=selectedOwner+'.'+(draft.state??'');if(g.state?.[id])throw new Error('State already exists: '+id);g.state??={};g.state[id]={owner:selectedOwner,type:'boolean',lifetime:'save',default:false};}));
}
