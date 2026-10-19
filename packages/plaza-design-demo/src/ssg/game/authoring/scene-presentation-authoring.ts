import {scenePresentationRoles} from '../engine/gameplay/scene-presentation';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {TypedForm} from './typed-form';
/** The registered drawing's finite inputs; gameplay keeps sole ownership of flags. */
export function renderScenePresentation(form:TypedForm,host:HTMLElement,source:SceneDocument,gameplay:GameplayDefinition,edit:(label:string,change:(d:SceneDocument)=>void)=>void,refresh:()=>void){
 const kind=source.id as keyof typeof scenePresentationRoles;if(!Object.prototype.hasOwnProperty.call(scenePresentationRoles,kind))return;
 const title=kind==='harborShift'?'shift':'Market';
 form.check(host,'Enable '+title+' visual bindings',!!source.presentation,on=>{edit('Edit '+title+' presentation',d=>{if(on)d.presentation={kind,flags:{}};else delete d.presentation;});refresh();});
 if(!source.presentation)return;
 for(const role of scenePresentationRoles[kind])form.select(host,(kind==='harborShift'?'Shift':'Market')+' visual '+role+' flag',['',...gameplay.flags],source.presentation.flags[role]??'',value=>edit('Rebind '+title+' visual '+role,d=>{if(value)d.presentation!.flags[role]=value;else delete d.presentation!.flags[role];}));
}
