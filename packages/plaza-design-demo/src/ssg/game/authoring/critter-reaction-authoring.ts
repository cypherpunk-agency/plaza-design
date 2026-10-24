import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {validateCritterReactions,type CritterReactionDocument} from '../engine/gameplay/critter-reactions';
import {CRITTERS} from '../art/characters/appearance';
/** Typed controls for engine/gameplay/critter-reactions.json: what a pet cat or a shooed pigeon answers. */
export function mountCritterReactionAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let selected='cat',disposed=false;
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>validateCritterReactions(api.get('critter-reactions').value);
 function edit(label:string,change:(d:CritterReactionDocument)=>void){const d=read();change(d);api.edit('critter-reactions',label,validateCritterReactions(d));}
 function render(){
  if(disposed)return;const d=read();host.replaceChildren(error);
  const free=Object.keys(CRITTERS).filter(look=>!d.critters.some(c=>c.look===look));
  if(!d.critters.some(c=>c.id===selected))selected=d.critters[0]?.id??'';
  form.select(host,'Critter reaction',d.critters.map(c=>c.id),selected,id=>{selected=id;render();});
  form.button(host,'Add critter reaction',()=>{const look=free[0];edit('Add critter reaction',d=>{d.critters.push({id:look,look,name:look.toUpperCase(),prompt:'[E] PET',talk:[['It looks at you.']]});});selected=free[0];render();},!free.length||d.critters.length>=16);
  const c=d.critters.find(c=>c.id===selected);if(!c)return;
  const mutate=(label:string,fn:(c:CritterReactionDocument['critters'][number])=>void)=>edit(label,d=>fn(d.critters.find(x=>x.id===selected)!));
  form.select(host,'Critter look',[c.look,...free],c.look,look=>mutate('Change critter look',c=>{c.look=look;}));
  form.text(host,'Critter speaker name',c.name,name=>mutate('Edit critter speaker',c=>{c.name=name;}));
  form.text(host,'Critter interaction prompt',c.prompt,prompt=>mutate('Edit critter prompt',c=>{c.prompt=prompt;}));
  c.talk.forEach((pages,i)=>{const section=form.section(host,'Reply '+(i+1));
   pages.forEach((text,j)=>{form.text(section,'Critter reply '+(i+1)+' page '+(j+1),text,text=>mutate('Edit critter reply',c=>{c.talk[i][j]=text;}),true);form.button(section,'Remove critter reply '+(i+1)+' page '+(j+1),()=>mutate('Remove critter page',c=>{c.talk[i].splice(j,1);}),pages.length===1);});
   form.button(section,'Add page to critter reply '+(i+1),()=>mutate('Add critter page',c=>{c.talk[i].push('New page');}),pages.length>=16);
   form.button(section,'Remove critter reply '+(i+1),()=>mutate('Remove critter reply',c=>{c.talk.splice(i,1);}),c.talk.length===1);});
  form.button(host,'Add critter reply',()=>mutate('Add critter reply',c=>{c.talk.push(['New reply']);}),c.talk.length>=32);
  form.button(host,'Remove critter reaction',()=>{edit('Remove critter reaction',d=>{d.critters=d.critters.filter(x=>x.id!==selected);});render();});
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
