import type {GameplayDefinition} from './types';
/** Registered visual roles. These refs read authored flags and actor identities; they neither decide nor store gameplay. */
export const shiftPresentationRoles=['parcel','delivered','case','returned','parked','released','checked','done'] as const;
export type ShiftPresentationRole=typeof shiftPresentationRoles[number];
export const scenePresentationRoles={harborShift:shiftPresentationRoles,market:['exitOpen'],beach:[],shop:[],mall:[],harbor:['bribed'],stacks:[]} as const;
export type ScenePresentationRole=ShiftPresentationRole|'exitOpen'|'bribed';
export type ScenePresentationActorRole='bartender'|'ashore'|'keeper'|'outside'|'far'|'gallery'|'riders'|'deckVendor'|'caseVendor'|'operator0'|'operator1'|'driver'|'watchman'|'guard'|'fishVendor'|'teaVendor'|'denGuests'|'craneOperator'|'rescuedPassenger';
export const scenePresentationActorRoles:Readonly<Partial<Record<keyof typeof scenePresentationRoles,Readonly<Partial<Record<ScenePresentationActorRole,'one'|'many'|'slots'|'phases'>>>>>>={stacks:{craneOperator:'one',rescuedPassenger:'one'},beach:{bartender:'one',ashore:'many'},shop:{keeper:'one',outside:'many'},mall:{far:'slots',gallery:'slots',riders:'phases',deckVendor:'one',caseVendor:'one'},harbor:{operator0:'one',operator1:'one',driver:'one',watchman:'one',guard:'one',fishVendor:'one',teaVendor:'one',denGuests:'many'}};
export interface ScenePresentation {kind:keyof typeof scenePresentationRoles;flags:Partial<Record<ScenePresentationRole,string>>;actors?:Partial<Record<ScenePresentationActorRole,string|string[]|Record<string,number>>>}
export function validateScenePresentation(value:unknown,id:string,gameplay:GameplayDefinition,actorIds:readonly string[]=[]):void{
 const fail=():never=>{throw Error('Invalid registered scene presentation');};
 if(!Object.prototype.hasOwnProperty.call(scenePresentationRoles,id)||!value||typeof value!=='object'||Array.isArray(value))fail();
 const p=value as ScenePresentation;
 if(Object.keys(p).some(k=>!['kind','flags','actors'].includes(k))||p.kind!==id||!p.flags||typeof p.flags!=='object'||Array.isArray(p.flags))fail();
 for(const[k,v]of Object.entries(p.flags))if(!(scenePresentationRoles[p.kind]as readonly string[]).includes(k)||typeof v!=='string'||!gameplay.flags.includes(v))fail();
 if(p.actors!==undefined){if(!p.actors||typeof p.actors!=='object'||Array.isArray(p.actors))fail();const roles=scenePresentationActorRoles[p.kind]??{},known=(v:unknown)=>typeof v==='string'&&actorIds.includes(v);for(const[role,ref]of Object.entries(p.actors)){const mode=roles[role as ScenePresentationActorRole];if(mode==='one'){if(!known(ref))fail();}else if(mode==='many'){if(!Array.isArray(ref)||ref.length>128||new Set(ref).size!==ref.length||ref.some(v=>!known(v)))fail();}else if(mode==='slots'||mode==='phases'){if(!ref||typeof ref!=='object'||Array.isArray(ref)||Object.keys(ref).length>128||Object.entries(ref).some(([id,n])=>!known(id)||typeof n!=='number'||!Number.isFinite(n)||n<0||n>(mode==='phases'?1:1000000)||mode==='slots'&&!Number.isInteger(n)))fail();}else fail();}}

}
export function presentationFlag(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>,role:ScenePresentationRole):boolean{const ref=p?.flags[role];return ref!==undefined&&!!flags[ref];}
export function dockworkerCarry(p:ScenePresentation|undefined|null,flags:Readonly<Record<string,boolean>>):'parcel'|'case'|null{
 const f=(role:ShiftPresentationRole)=>presentationFlag(p,flags,role);
 return (f('parcel')&&!f('delivered'))||(f('case')&&!f('returned'))?f('delivered')?'case':'parcel':null;
}

/** Source-owned actor references; absent roles never select historical IDs. */
export function presentationActor(p:ScenePresentation|undefined|null,role:ScenePresentationActorRole):string|undefined{const ref=p?.actors?.[role];return typeof ref==='string'?ref:undefined;}
export function presentationActors(p:ScenePresentation|undefined|null,role:ScenePresentationActorRole):readonly string[]{const ref=p?.actors?.[role];return Array.isArray(ref)?ref:[];}
export function removePresentationActor(p:ScenePresentation|undefined,id:string){if(!p?.actors)return;for(const[role,ref]of Object.entries(p.actors)){if(ref===id)delete p.actors[role as ScenePresentationActorRole];else if(Array.isArray(ref))p.actors[role as ScenePresentationActorRole]=ref.filter(value=>value!==id);else if(ref&&typeof ref==='object')delete ref[id];}}

/** A group role follows duplication; a singleton stays with its chosen actor until reassigned. */
export function duplicatePresentationActor(p:ScenePresentation|undefined,from:string,to:string){for(const ref of Object.values(p?.actors??{}))if(Array.isArray(ref)&&ref.includes(from)&&!ref.includes(to))ref.push(to);else if(ref&&typeof ref==='object'&&!Array.isArray(ref)&&Object.prototype.hasOwnProperty.call(ref,from))ref[to]=ref[from];}

/** Per-actor slots/phases feed registered presentation primitives without deriving them from IDs. */
export function presentationActorSlots(p:ScenePresentation|undefined|null,role:ScenePresentationActorRole):Readonly<Record<string,number>>{const ref=p?.actors?.[role];return ref&&typeof ref==='object'&&!Array.isArray(ref)?ref:{};}
