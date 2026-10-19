import {scenePresentationRoles,scenePresentationActorRoles,presentationActor,presentationActors,type ScenePresentationActorRole} from '../engine/gameplay/scene-presentation';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {TypedForm} from './typed-form';
/** Finite picture inputs reference shared flags or source actors; no second gameplay state. */
export function renderScenePresentation(form:TypedForm,host:HTMLElement,source:SceneDocument,gameplay:GameplayDefinition,edit:(label:string,change:(d:SceneDocument)=>void)=>void,refresh:()=>void){
 const kind=source.id as keyof typeof scenePresentationRoles;if(!Object.prototype.hasOwnProperty.call(scenePresentationRoles,kind))return;
 const title=kind==='harborShift'?'shift':kind==='market'?'Market':'Beach';
 form.check(host,'Enable '+title+' visual bindings',!!source.presentation,on=>{edit('Edit '+title+' presentation',d=>{if(on)d.presentation={kind,flags:{}};else delete d.presentation;});refresh();});
 if(!source.presentation)return;
 if(kind==='beach'){const description=document.createElement('p');description.textContent='Choose the bartender and the actors who appear ashore when the beach is marked dangerous.';host.append(description);}
 for(const role of scenePresentationRoles[kind])form.select(host,(kind==='harborShift'?'Shift':'Market')+' visual '+role+' flag',['',...gameplay.flags],source.presentation.flags[role]??'',value=>edit('Rebind '+title+' visual '+role,d=>{if(value)d.presentation!.flags[role]=value;else delete d.presentation!.flags[role];}));
 for(const[role,mode]of Object.entries(scenePresentationActorRoles[kind]??{})){const key=role as ScenePresentationActorRole;if(mode==='one')form.select(host,title+' '+role+' actor',['',...(source.actors??[]).map(a=>a.id)],presentationActor(source.presentation,key)??'',ref=>edit('Rebind '+title+' '+role,d=>{const actors=d.presentation!.actors??={};if(ref)actors[key]=ref;else delete actors[key];}));else{const group=form.section(host,title+' '+role+' actors'),members=new Set(presentationActors(source.presentation,key));for(const actor of source.actors??[])form.check(group,title+' '+role+' actor '+actor.id,members.has(actor.id),on=>edit('Rebind '+title+' '+role,d=>{const selected=new Set(presentationActors(d.presentation,key));if(on)selected.add(actor.id);else selected.delete(actor.id);(d.presentation!.actors??={})[key]=[...selected];}));}}

}
