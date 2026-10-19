import type {GameplayDefinition} from './types';
/** Registered visual roles. These refs read authored flags; they neither decide nor store gameplay. */
export const shiftPresentationRoles=['parcel','delivered','case','returned','parked','released','checked','done'] as const;
export type ShiftPresentationRole=typeof shiftPresentationRoles[number];
export interface ScenePresentation {kind:'harborShift';flags:Partial<Record<ShiftPresentationRole,string>>}
export function validateScenePresentation(value:unknown,id:string,gameplay:GameplayDefinition):void{
 const fail=():never=>{throw Error('Invalid registered scene presentation');};
 if(id!=='harborShift'||!value||typeof value!=='object'||Array.isArray(value))fail();
 const p=value as ScenePresentation;
 if(Object.keys(p).some(k=>!['kind','flags'].includes(k))||p.kind!=='harborShift'||!p.flags||typeof p.flags!=='object'||Array.isArray(p.flags))fail();
 for(const[k,v]of Object.entries(p.flags))if(!shiftPresentationRoles.includes(k as ShiftPresentationRole)||typeof v!=='string'||!gameplay.flags.includes(v))fail();
}
export function presentationFlag(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>,role:ShiftPresentationRole):boolean{const ref=p?.flags[role];return ref!==undefined&&!!flags[ref];}
export function dockworkerCarry(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>):'parcel'|'case'|null{
 const f=(role:ShiftPresentationRole)=>presentationFlag(p,flags,role);
 return (f('parcel')&&!f('delivered'))||(f('case')&&!f('returned'))?f('delivered')?'case':'parcel':null;
}
