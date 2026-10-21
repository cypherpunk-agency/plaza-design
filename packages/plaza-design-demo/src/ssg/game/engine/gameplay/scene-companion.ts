import {validateManifestTarget,type ManifestTarget} from './manifest-contract';
import {resolveManifestPoint} from './manifest-geometry';
import {COMPANION_SOURCE} from './companion-source';
import type {Resolved} from '../../art';
import type {SceneDef} from '../../scenes/kit';
import type {SceneData} from '../../data/types';
import type {Perch} from '../../runtime/companion';
export interface CompanionPet {prompt:string;conversations:{sleep:string[];sun:string;moving:string;idle:string[]}}
export interface CompanionPerch {id:string;point:ManifestTarget;rest:Perch['rest']}
export interface SceneCompanion {mode:'home'|'along'|'off';unlockFlag?:string;warm?:CompanionPerch[];home?:{state:string;default:string;perches:CompanionPerch[]};pet?:CompanionPet}
export interface CompiledCompanion {unlockFlag?:string;warm?:Perch[];pet?:CompanionPet;homeState?:string;homeIds?:string[]}
/** The flag that brings the companion along unless the scene names its own `unlockFlag` (the companion document's): a game-wide flag, so exits may set it without the scene's gameplay declaring it. */
export const DEFAULT_COMPANION_FLAG=COMPANION_SOURCE.unlockFlag;
export const DEFAULT_COMPANION_PET:CompanionPet=structuredClone(COMPANION_SOURCE.pet);
const fail=(s:string):never=>{throw Error('Invalid scene companion: '+s);},name=(v:unknown)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail('reference');};
const object=(v:unknown,allowed:string[],required=allowed)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail('fields');return v as Record<string,any>;};
export function validateSceneCompanion(value:unknown):asserts value is SceneCompanion{
 const d=object(value,['mode','unlockFlag','warm','home','pet'],['mode']);if(!['home','along','off'].includes(d.mode))fail('mode');if(d.unlockFlag!==undefined)name(d.unlockFlag);
 const perches=(v:unknown)=>{if(!Array.isArray(v)||v.length>32)fail('perch list');const ids=new Set<string>();for(const raw of v as unknown[]){const p=object(raw,['id','point','rest']);name(p.id);if(ids.has(p.id))fail('duplicate perch');ids.add(p.id);validateManifestTarget(p.point);if(typeof p.point!=='string'&&Object.keys(p.point).some(k=>!['instance','anchor','x','h'].includes(k)))fail('perches have no prompt');if(!['sleep','sun','sit'].includes(p.rest))fail('rest');}};
 if(d.warm!==undefined)perches(d.warm);if(d.home!==undefined){const h=object(d.home,['state','default','perches']);name(h.state);name(h.default);perches(h.perches);if(!h.perches.some((p:CompanionPerch)=>p.id===h.default))fail('home default perch');}if(d.mode==='home'&&!d.home)fail('home mode needs perches');
 if(d.pet!==undefined){const p=object(d.pet,['prompt','conversations']);for(const k of ['prompt'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>2000)fail('pet text');const c=object(p.conversations,['sleep','sun','moving','idle']);for(const k of ['sun','moving'])name(c[k]);for(const k of ['sleep','idle']){if(!Array.isArray(c[k])||!c[k].length||c[k].length>32)fail('pet references');c[k].forEach(name);}}
}
export function validateCompanionModelBindings(scene:SceneDef,data:SceneData|undefined){const c=scene.companion;if(c?.homeState){if(!data||typeof data.state[c.homeState]!=='string')throw Error('Companion home state reference '+c.homeState);}}
export function compileSceneCompanion(source:SceneCompanion|undefined,rows:readonly Resolved[],width:number):Pick<SceneDef,'pixel'|'perch'|'companion'>{
 if(!source)return{};validateSceneCompanion(source);const resolve=(p:CompanionPerch):Perch=>{const at=resolveManifestPoint(rows,p.point,width,false,true);return{x:at.x,h:at.h,rest:p.rest};},warm=source.warm?.map(resolve),home=source.home,perches=home?Object.fromEntries(home.perches.map(p=>[p.id,resolve(p)])):undefined;
 return{pixel:source.mode==='off'?undefined:source.mode,perch:source.mode==='home'&&home?m=>perches![String(m.get(home.state))]??perches![home.default]:undefined,companion:{...(source.unlockFlag!==undefined?{unlockFlag:source.unlockFlag}:{}),...(warm!==undefined?{warm}:{}),...(source.pet?{pet:structuredClone(source.pet)}:{}),...(home?{homeState:home.state,homeIds:home.perches.map(p=>p.id)}:{})}};
}
