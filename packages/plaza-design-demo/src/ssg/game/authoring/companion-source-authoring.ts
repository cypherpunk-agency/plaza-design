import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {validateCompanionSource,type CompanionSource} from '../engine/gameplay/companion-source';
import {COMPANION_LOOKS} from '../runtime/companion';
/** Typed controls for engine/gameplay/companion.json: who follows the player, and how the game loop treats it. */
export function mountCompanionSourceAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let disposed=false;
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>validateCompanionSource(api.get('companion').value);
 function edit(label:string,change:(d:CompanionSource)=>void){const d=read();change(d);api.edit('companion',label,validateCompanionSource(d));}
 function render(){
  if(disposed)return;const d=read();host.replaceChildren(error);
  const graphs=Object.keys((api.get('companion-gameplay').value as {conversations?:Record<string,unknown>}).conversations??{});
  form.text(host,'Companion ID',d.id,id=>edit('Edit companion ID',d=>{d.id=id;}));
  form.text(host,'Companion name',d.name,name=>edit('Edit companion name',d=>{d.name=name;}));
  form.select(host,'Companion look',Object.keys(COMPANION_LOOKS),d.look,look=>edit('Change companion look',d=>{d.look=look;}));
  form.text(host,'Companion speaker ID',d.speaker,speaker=>edit('Edit companion speaker',d=>{d.speaker=speaker;}));
  form.text(host,'Companion unlock flag',d.unlockFlag,flag=>edit('Bind companion unlock flag',d=>{d.unlockFlag=flag;}));
  for(const mode of ['home','along'] as const)form.check(host,'Companion mode '+mode,d.modes.includes(mode),on=>edit(on?'Allow companion mode':'Forbid companion mode',d=>{d.modes=d.modes.filter(m=>m!==mode);if(on)d.modes.push(mode);}));
  form.check(host,'Popups keep clear of companion',d.avoidPopups,on=>edit('Toggle popup avoidance',d=>{d.avoidPopups=on;}));
  form.text(host,'Companion greeting page',d.greeting,greeting=>edit('Edit companion greeting',d=>{d.greeting=greeting;}),true);
  const follow=form.section(host,'Following');
  for(const[key,label]of [['distance','Follow distance'],['trail','Follow trail'],['lostAt','Follow catch-up distance']] as const)form.number(follow,'Companion '+label.toLowerCase(),d.follow[key],value=>edit('Edit '+label.toLowerCase(),d=>{d.follow[key]=value;}),key==='lostAt'?1:0,100000);
  const pet=form.section(host,'Default pet interaction');
  form.text(pet,'Companion pet prompt',d.pet.prompt,prompt=>edit('Edit companion pet prompt',d=>{d.pet.prompt=prompt;}));
  for(const key of ['sun','moving'] as const)form.select(pet,'Companion pet '+key,graphs,d.pet.conversations[key],id=>edit('Bind companion pet graph',d=>{d.pet.conversations[key]=id;}));
  for(const key of ['sleep','idle'] as const){const box=form.section(pet,'Pet '+key+' recurrence');
   d.pet.conversations[key].forEach((id,i)=>{form.select(box,'Companion pet '+key+' '+(i+1),graphs,id,id=>edit('Bind companion pet recurrence',d=>{d.pet.conversations[key][i]=id;}));form.button(box,'Remove pet '+key+' '+(i+1),()=>edit('Remove companion pet recurrence',d=>{d.pet.conversations[key].splice(i,1);}),d.pet.conversations[key].length===1);});
   form.button(box,'Add pet '+key,()=>edit('Add companion pet recurrence',d=>{d.pet.conversations[key].push(graphs[0]);}),!graphs.length||d.pet.conversations[key].length>=32);}
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
