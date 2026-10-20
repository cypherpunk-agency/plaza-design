import type {Resolved} from '../../../art/core/composition';
import type {PlayerServices} from '../../../runtime/player';
import type {SceneRules} from '../../rules';
import type {PanelFn} from '../../panels';
import type {SceneDef} from '../../../scenes/kit';
import type {SceneDocument} from '../scene-document';
import type {GameplayDefinition} from '../types';
import {gantryLift} from './gantry-lift';
/**
 * Registered scene mechanisms: physical behaviour a scene's data cannot express (a crane's
 * trajectory, a thermal gate's timing, a camera panel), written once as code and named by the
 * scene: scene.json `stage.mechanics: ["gantryLift"]`. The declared path (declared-scene.ts) turns
 * the names into `SceneDef.rules` and `SceneDef.panels`. A mechanism measures its geometry from
 * the scene's own artwork roles (manifest.artwork) instead of hard-coded ids, owns everything it
 * needs (rules, panels, texts, its build-time check) and nothing outside it refers to its
 * internals, so it can later be offered as a Circuit device. One file per mechanism in this
 * folder, one line in SCENE_MECHANICS.
 */
export interface MechanicContext {
 scene:SceneDocument;gameplay:GameplayDefinition;
 /** The scene's artwork roles (manifest.artwork) as placed. */
 roles:Readonly<Record<string,Resolved>>;
 rows:readonly Resolved[];
}
export interface SceneMechanic {
 /** Shown in the editor's mechanism list. */
 label:string;description:string;
 /** Artwork roles the scene must define (manifest.artwork) for the mechanism to measure. */
 roles:readonly string[];
 /** The rules the scene runs, built for one player and this scene's artwork. */
 rules(player:PlayerServices,ctx:MechanicContext):SceneRules;
 /** The same rules with default geometry, for contract checks and inspectors (no scene needed). */
 shape():SceneRules;
 /** Panels (`rules.panels` names) the mechanism implements. */
 panels?:Record<string,PanelFn>;
 /** Source checks beyond the shared ones (a query the code relies on); throws on a problem. */
 check?(ctx:MechanicContext):void;
}
export const SCENE_MECHANICS:Readonly<Record<string,SceneMechanic>>={
 gantryLift,
};
export const mechanicNames=():string[]=>Object.keys(SCENE_MECHANICS);
const known=(name:string)=>Object.prototype.hasOwnProperty.call(SCENE_MECHANICS,name);
/** scene.json `stage.mechanics`: a list of registered names, each at most once. */
export function validateMechanics(value:unknown):string[]{
 if(!Array.isArray(value)||value.length>8||value.some(v=>typeof v!=='string'||!known(v))||new Set(value).size!==value.length)throw new Error('Invalid scene stage: mechanics must list registered mechanisms ('+mechanicNames().join(', ')+') once each');
 return [...value] as string[];
}
const merge=(parts:SceneRules[]):SceneRules=>{
 if(parts.length===1)return parts[0];
 const tick=parts.filter(p=>p.tick),place=parts.filter(p=>p.place);
 const dup=(what:string,lists:string[][])=>{const all=lists.flat();if(new Set(all).size!==all.length)throw new Error('Scene mechanisms define the same '+what+' twice');};
 dup('effect',parts.map(p=>Object.keys(p.effects)));dup('panel',parts.map(p=>p.panels??[]));dup('derived value',parts.map(p=>Object.keys(p.derived??{})));
 return{
  effects:Object.assign({},...parts.map(p=>p.effects)),
  ...(parts.some(p=>p.inputs)?{inputs:parts.flatMap(p=>p.inputs??[])}:{}),
  ...(parts.some(p=>p.panels)?{panels:parts.flatMap(p=>p.panels??[])}:{}),
  ...(parts.some(p=>p.derived)?{derived:Object.assign({},...parts.map(p=>p.derived??{}))}:{}),
  ...(parts.some(p=>p.derivedTypes)?{derivedTypes:Object.assign({},...parts.map(p=>p.derivedTypes??{}))}:{}),
  ...(parts.some(p=>p.needs)?{needs:{
   ...(parts.some(p=>p.needs?.devices)?{devices:parts.flatMap(p=>p.needs?.devices??[])}:{}),
   ...(parts.some(p=>p.needs?.state)?{state:parts.flatMap(p=>p.needs?.state??[])}:{}),
   ...(parts.some(p=>p.needs?.goals)?{goals:parts.flatMap(p=>p.needs?.goals??[])}:{}),
   ...(parts.some(p=>p.needs?.texts)?{texts:Object.assign({},...parts.map(p=>p.needs?.texts??{}))}:{}),
  }}:{}),
  ...(parts.some(p=>p.check)?{check:(z)=>parts.flatMap(p=>p.check?.(z)??[])}:{}),
  ...(tick.length?{tick:(w,dt)=>{for(const p of tick)p.tick!(w,dt);}}:{}),
  ...(place.length?{place:(m,home)=>{for(const p of place){const at=p.place!(m,home);if(at!==home)return at;}return home;}}:{}),
 };
};
/** The rules and panels the named mechanisms give a scene (nothing for none). Checks the roles and sources they rely on. */
export function mechanicsContent(names:readonly string[]|undefined,ctx:MechanicContext):Pick<SceneDef,'rules'|'panels'>{
 if(!names?.length)return{};
 const list=names.map(n=>{if(!known(n))throw new Error('Unknown scene mechanism '+n);return SCENE_MECHANICS[n];});
 for(const [i,mechanic] of list.entries()){
  for(const role of mechanic.roles)if(!ctx.roles[role])throw new Error('Mechanism '+names[i]+' requires artwork role '+role);
  mechanic.check?.(ctx);
 }
 const panels=Object.assign({},...list.map(m=>m.panels??{}));
 return{rules:(player:PlayerServices)=>merge(list.map(m=>m.rules(player,ctx))),...(Object.keys(panels).length?{panels}:{})};
}
/** Default-geometry rules of the named mechanisms, for inspectors and contract checks. */
export const mechanicsRulesShape=(names:readonly string[]):SceneRules=>merge(names.map(n=>SCENE_MECHANICS[n].shape()));
