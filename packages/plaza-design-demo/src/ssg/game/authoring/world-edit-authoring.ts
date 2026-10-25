import type {CompositionEdit,WorldMember} from '../world/compositions';
import type {TypedForm} from './typed-form';
/** Structured command controls; source IDs stay ordinary references validated with the pending bundle. */
export function renderWorldEditAuthoring(host:HTMLElement,prefix:string,value:CompositionEdit,form:TypedForm,change:(value:CompositionEdit)=>void){
 form.text(host,prefix+' composition',value.composition,composition=>change({...value,composition}));
 for(const[id,index]of value.remove.map((id,i)=>[id,i] as const)){
  form.text(host,prefix+' unmount '+(index+1),id,id=>change({...value,remove:value.remove.map((v,i)=>i===index?id:v)}));
  form.button(host,'Remove unmount '+(index+1),()=>change({...value,remove:value.remove.filter((_,i)=>i!==index)}));
 }
 form.button(host,'Add unmount',()=>change({...value,remove:[...value.remove,'member']}));
 value.add.forEach((member,index)=>{
  const box=form.section(host,'Mount '+member.id),set=(next:WorldMember)=>change({...value,add:value.add.map((m,i)=>i===index?next:m)});
  form.text(box,prefix+' member ID',member.id,id=>set({...member,id}));
  form.select(box,prefix+' source type',['chunk','group'],member.chunk?'chunk':'group',kind=>set({id:member.id,placement:member.placement,...(kind==='chunk'?{chunk:'chunk'}:{group:'group'})}));
  if(member.chunk)form.text(box,prefix+' chunk',member.chunk,chunk=>set({...member,chunk}));
  else form.text(box,prefix+' group',member.group!,group=>set({id:member.id,placement:member.placement,group}));
  form.decimal(box,prefix+' X',member.placement.x,x=>set({...member,placement:{...member.placement,x}}),-10000000,10000000);
  form.decimal(box,prefix+' height',member.placement.h,h=>set({...member,placement:{...member.placement,h}}),-10000000,10000000);
  form.button(box,'Remove mount '+(index+1),()=>change({...value,add:value.add.filter((_,i)=>i!==index)}));
 });
 form.button(host,'Add mount',()=>change({...value,add:[...value.add,{id:'member-'+(value.add.length+1),chunk:'chunk',placement:{x:0,h:0}}]}));
}
