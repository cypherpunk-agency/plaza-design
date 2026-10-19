import type {GameplayDefinition} from './types';
/** Registered visual roles. These refs read authored flags; they neither decide nor store gameplay. */
export const shiftPresentationRoles=['parcel','delivered','case','returned','parked','released','checked','done'] as const;
export type ShiftPresentationRole=typeof shiftPresentationRoles[number];
export const scenePresentationRoles={harborShift:shiftPresentationRoles,market:['exitOpen']} as const;
export type ScenePresentationRole=ShiftPresentationRole|'exitOpen';
export interface ScenePresentation {kind:keyof typeof scenePresentationRoles;flags:Partial<Record<ScenePresentationRole,string>>}
export function validateScenePresentation(value:unknown,id:string,gameplay:GameplayDefinition):void{
 const fail=():never=>{throw Error('Invalid registered scene presentation');};
 if(!Object.prototype.hasOwnProperty.call(scenePresentationRoles,id)||!value||typeof value!=='object'||Array.isArray(value))fail();
 const p=value as ScenePresentation;
 if(Object.keys(p).some(k=>!['kind','flags'].includes(k))||p.kind!==id||!p.flags||typeof p.flags!=='object'||Array.isArray(p.flags))fail();
 for(const[k,v]of Object.entries(p.flags))if(!(scenePresentationRoles[p.kind]as readonly string[]).includes(k)||typeof v!=='string'||!gameplay.flags.includes(v))fail();
}
export function presentationFlag(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>,role:ScenePresentationRole):boolean{const ref=p?.flags[role];return ref!==undefined&&!!flags[ref];}
export function dockworkerCarry(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>):'parcel'|'case'|null{
 const f=(role:ShiftPresentationRole)=>presentationFlag(p,flags,role);
 return (f('parcel')&&!f('delivered'))||(f('case')&&!f('returned'))?f('delivered')?'case':'parcel':null;
}
