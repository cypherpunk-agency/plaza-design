import type {Resolved} from '../../art/core/composition';
import type {SceneDef} from '../../scenes/kit';
import type {SceneDocument} from './scene-document';
import type {GameplayDefinition} from './types';
import type {SceneRules} from '../rules';
import {gantryLift} from './mechanisms/gantry-lift';
import {dockworkerCarry} from './mechanisms/dockworker-carry';
import {yardCrane} from './mechanisms/yard-crane';
import type {EngineDraw} from '../host';
import type {View} from '../../art/core/view';
import type {Value} from '../../art/core/composition';
import type {SceneData} from '../../data/types';
/**
 * Registered scene mechanisms: what a declared scene takes from the engine beyond its documents,
 * named in scene.json `stage.mechanisms` and edited under Scene › Stage & compile. A mechanism
 * reads the scene as built (its artwork roles, its width, its compiled content) and returns the
 * SceneDef fields it owns. A mechanism with `world` makes the scene one the game rebuilds with the
 * city and line system (SceneDef.bindWorld), which its binding providers then read (ctx.world).
 */
export interface SceneMechanismContext {scene:SceneDocument;gameplay:GameplayDefinition;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;width:number;content:SceneDef}
/**
 * A mechanism's picture-side state (a hook that eases toward its target): one per scene, made when the scene is built.
 * Binding providers read `state` (BindingContext.presentation[mechanism]); the scene prepares it once per frame and
 * captures/restores it for isolated previews.
 */
export interface MechanismPresentation<S=unknown> {state:S;prepare(view:View,engine:EngineDraw):void;capture():Value;restore(value:Value):void}
export interface SceneMechanism {
 label:string;
 /** Artwork roles (manifest.artwork) the scene must name. */
 requires:readonly string[];
 /** The game binds the world to the scene (bindWorld). */
 world:boolean;
 /** The mechanism's scene paints its own surroundings (sky, water, tunnel), so no grey review room stands behind the artwork. */
 ownsRoom?:boolean;
 apply(ctx:SceneMechanismContext):Partial<SceneDef>;
 /** Picture-side state, if the mechanism keeps any (at most one such mechanism per scene). */
 presentation?(ctx:Pick<SceneMechanismContext,'scene'|'gameplay'|'rows'|'roles'>&{data:SceneData}):MechanismPresentation;
 /**
  * A mechanism that runs code supplies `SceneDef.rules` (and `panels`) from `apply`; several
  * combine (mergeRules). `rulesShape` is the same rules with default geometry: what the device
  * document is checked against (derived values, physical milestones) and what inspectors list,
  * before any artwork exists.
  */
 rulesShape?():SceneRules;
 /** Source checks beyond the shared ones (a query the code relies on); throws on a problem. */
 check?(ctx:Pick<SceneMechanismContext,'scene'|'gameplay'|'roles'>):void;
}
/** The rules of several mechanisms as one: effects, inputs, panels, derived values, needs, checks and ticks add up; a name defined twice is refused. */
export function mergeRules(parts:readonly SceneRules[]):SceneRules{
 if(parts.length===1)return parts[0];
 const dup=(what:string,lists:string[][])=>{const all=lists.flat();if(new Set(all).size!==all.length)throw new Error('Scene mechanisms define the same '+what+' twice');};
 dup('effect',parts.map(p=>Object.keys(p.effects)));dup('panel',parts.map(p=>p.panels??[]));dup('derived value',parts.map(p=>Object.keys(p.derived??{})));
 const tick=parts.filter(p=>p.tick),place=parts.filter(p=>p.place);
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
  ...(parts.some(p=>p.check)?{check:z=>parts.flatMap(p=>p.check?.(z)??[])}:{}),
  ...(tick.length?{tick:(w,dt)=>{for(const p of tick)p.tick!(w,dt);}}:{}),
  ...(place.length?{place:(m,home)=>{for(const p of place){const at=p.place!(m,home);if(at!==home)return at;}return home;}}:{}),
 };
}
/** Default-geometry rules of the named mechanisms (those that run code), or undefined when none does. */
export function mechanismsRulesShape(names:readonly string[]|undefined):SceneRules|undefined{
 const parts=(names??[]).flatMap(n=>{const shape=SCENE_MECHANISMS[n]?.rulesShape?.();return shape?[shape]:[];});
 return parts.length?mergeRules(parts):undefined;
}
/**
 * transitPlatform: a LINE 0 platform. The `stop` role is where the train's nose stops (the
 * timetable and the boarding doors share that marker); a scene with a `water` role is the harbor's:
 * its horizon is the water's `horizon` and the sky is covered under the canopy (`roof` role).
 */
const transitPlatform:SceneMechanism={
 label:'LINE 0 platform (train stop, boarding, canopy)',requires:['roof','stop'],world:true,ownsRoom:true,
 apply:({roles,width,content})=>{const {roof,stop,water}=roles;
  return{platformStop:stop.placement.x,...(water?{horizon:Number(water.props.horizon??0),ambient:{...content.ambient,covers:[{from:-60,to:width+60,under:Number(roof.props.under)+roof.placement.h}]}}:{})};},
};
export const SCENE_MECHANISMS:Readonly<Record<string,SceneMechanism>>={
 transitPlatform,gantryLift,dockworkerCarry,yardCrane,
};
