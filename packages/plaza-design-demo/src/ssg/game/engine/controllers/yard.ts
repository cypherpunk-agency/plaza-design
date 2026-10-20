import type {SceneData} from '../../data/types';import type {SceneModel} from '../model';import type {GameplayDefinition} from '../gameplay/types';
export const yardStateTypes={pan:'number',gateAllowed:'boolean',parcelAt:'string',armAt:'string'} as const;
export const yardPlaceRoles=['home','hook','chute','sliding','bounced','tray'] as const;
export interface YardController {kind:'yard';version:1;state:Partial<Record<keyof typeof yardStateTypes,string>>;gateOpen?:string;slideDeadline?:string;hookEase:number;slots:Record<string,string>;cargoSlots:string[];anchors:Record<'crane'|'chute'|'tray',string>;places:Record<typeof yardPlaceRoles[number],string>}
export const yardController=(data:Pick<SceneData,'controller'>)=>data.controller?.kind==='yard'?data.controller:undefined;
export const yardRead=(m:SceneModel,role:keyof typeof yardStateTypes)=>{const ref=yardController(m.data)?.state[role];return ref===undefined?undefined:m.get(ref);};
export function yardControllerProblems(data:SceneData):string[]{
 const c=yardController(data),e:string[]=[],object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype,name=(v:unknown)=>typeof v==='string'&&/^[-a-zA-Z0-9_.]{1,128}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
 if(!c||data.id!=='yard'||c.version!==1||Object.keys(c).some(k=>!['kind','version','state','gateOpen','slideDeadline','hookEase','slots','cargoSlots','anchors','places'].includes(k))||!object(c.state)||!object(c.slots)||!object(c.anchors)||!object(c.places))return['Invalid registered Yard controller'];
 for(const[role,ref]of Object.entries(c.state))if(!Object.prototype.hasOwnProperty.call(yardStateTypes,role)||typeof ref!=='string'||!Object.prototype.hasOwnProperty.call(data.state,ref)||typeof data.state[ref]!==yardStateTypes[role as keyof typeof yardStateTypes])e.push('Yard state role '+role);
 if(!Number.isFinite(c.hookEase)||c.hookEase<0||c.hookEase>1)e.push('Yard hook ease');
 if(Object.keys(c.anchors).sort().join()!=='chute,crane,tray'||Object.values(c.anchors).some(v=>!name(v)))e.push('Yard geometry anchors');
 if(Object.keys(c.places).sort().join()!==[...yardPlaceRoles].sort().join()||Object.values(c.places).some(v=>!name(v))||new Set(Object.values(c.places)).size!==yardPlaceRoles.length)e.push('Yard place labels');
 if(Object.keys(c.slots).length>128||Object.entries(c.slots).some(([id,ref])=>!name(id)||!name(ref))||!Object.prototype.hasOwnProperty.call(c.slots,c.places.home)||!Object.prototype.hasOwnProperty.call(c.slots,c.places.chute))e.push('Yard slot references');
 if(!Array.isArray(c.cargoSlots)||new Set(c.cargoSlots).size!==c.cargoSlots.length||c.cargoSlots.some(id=>!Object.prototype.hasOwnProperty.call(c.slots,id)||Object.values(c.places).includes(id)))e.push('Yard cargo slots');
 if(c.gateOpen!==undefined&&!name(c.gateOpen)||c.slideDeadline!==undefined&&!name(c.slideDeadline))e.push('Yard gameplay read references');
 return e;
}
/** Resolve source dependencies against the same program that executes the deadlines/queries. */
export function validateYardGameplayBindings(data:SceneData,g:GameplayDefinition){const c=yardController(data);if(!c)return;if(c.gateOpen!==undefined&&!Object.prototype.hasOwnProperty.call(g.queries??{},c.gateOpen))throw Error('Yard gate read requires a current shared query');if(c.slideDeadline!==undefined&&!g.native?.deadlines?.[c.slideDeadline]?.startedAt)throw Error('Yard slide requires a current deadline progress stamp');}
