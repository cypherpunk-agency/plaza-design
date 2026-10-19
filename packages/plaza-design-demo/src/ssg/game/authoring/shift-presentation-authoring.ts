import {shiftPresentationRoles} from '../engine/gameplay/scene-presentation';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {TypedForm} from './typed-form';
/** The registered drawing's finite inputs; gameplay keeps sole ownership of flags. */
export function renderShiftPresentation(form:TypedForm,host:HTMLElement,source:SceneDocument,gameplay:GameplayDefinition,edit:(label:string,change:(d:SceneDocument)=>void)=>void,refresh:()=>void){
 if(source.id!=='harborShift')return;
 form.check(host,'Enable shift visual bindings',!!source.presentation,on=>{edit('Edit shift presentation',d=>{if(on)d.presentation={kind:'harborShift',flags:{}};else delete d.presentation;});refresh();});
 if(!source.presentation)return;
 for(const role of shiftPresentationRoles)form.select(host,'Shift visual '+role+' flag',['',...gameplay.flags],source.presentation.flags[role]??'',value=>edit('Rebind shift visual '+role,d=>{if(value)d.presentation!.flags[role]=value;else delete d.presentation!.flags[role];}));
}
