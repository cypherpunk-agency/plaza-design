import type {Resolved} from '../../art/core/composition';
import type {SceneDef} from '../../scenes/kit';
import type {SceneDocument} from './scene-document';
import type {GameplayDefinition} from './types';
import type {SceneRules} from '../rules';
import {gantryLift} from './mechanisms/gantry-lift';
import {dockworkerCarry} from './mechanisms/dockworker-carry';
import {devicePulse} from './mechanisms/device-pulse';
import {targetReset} from './mechanisms/target-reset';
import {sandboxBay} from './mechanisms/sandbox-bay';
import {yardCrane} from './mechanisms/yard-crane';
import {vehicleRun} from './mechanisms/vehicle-run';
import {streetCamera} from './mechanisms/street-camera';
import {streetLayers} from './mechanisms/street-layers';
import type {EngineDraw} from '../host';
import type {View} from '../../art/core/view';
import type {Value,Composition,Environment} from '../../art/core/composition';
import type {SceneData} from '../../data/types';
import {thermal} from './mechanisms/thermal';
import {citySkyline} from './mechanisms/city-skyline';
import {lineRide} from './mechanisms/line-ride';
import type {Character} from '../../runtime/characters';
import type {CityModel} from '../../world/city';
import type {LineSystem} from '../../world/transport/line';
/**
 * Registered scene mechanisms: what a declared scene takes from the engine beyond its documents,
 * named in scene.json `stage.mechanisms` and edited under Scene › Stage & compile. A mechanism
 * reads the scene as built (its artwork roles, its width, its compiled content) and returns the
 * SceneDef fields it owns. A mechanism with `world` makes the scene one the game rebuilds with the
 * city and line system (SceneDef.bindWorld), which its binding providers then read (ctx.world).
 */
/**
 * `world`: the city and line system the game bound (absent until it does). `shared`: the one store of
 * state this built scene keeps for its mechanisms and binding providers (a prepared frame, a
 * simulation, a hook that eases); it reaches the providers as BindingContext.shared. A mechanism
 * keeps its state under its own name (or a key it exports) and, if that state is the picture's,
 * returns a `presentation` from `apply` so the scene prepares, saves and restores it.
 */
export interface SceneMechanismContext {composition:Composition;environment(view:View,engine?:EngineDraw):Environment;scene:SceneDocument;gameplay:GameplayDefinition;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;width:number;content:SceneDef;actors:Readonly<Record<string,Character>>;world?:{city:CityModel;metro:LineSystem};shared:Map<string,unknown>}
/**
 * How a mechanism's picture-side state (a hook easing toward its target, a skyline simulation, a
 * prepared car frame) joins the scene. `prepare` runs once per all/devices pass, in mechanism order,
 * before painting; `capture`/`restore` (both or neither) save and restore it for isolated previews.
 * The scene's capture is one record keyed by mechanism name (plus `signals` when the scene also has
 * presentation signals); restore needs exactly those keys.
 */
export interface MechanismPresentation {prepare(view:View,engine:EngineDraw):void;capture?():Value;restore?(value:Value):void}
/** What `apply` returns: SceneDef fields, and optionally the mechanism's presentation. */
export type MechanismResult=Partial<SceneDef>&{presentation?:MechanismPresentation};
/** The SceneDef fields (preparePresentation, presentationState) that run the mechanisms' presentations, composed with the scene's presentation signals when it has any. */
export function composePresentations(parts:readonly(readonly[string,MechanismPresentation])[],signals?:{capture():Value;restore(value:Value):void}):Partial<SceneDef>{
 const saved=parts.filter(([,p])=>p.capture&&p.restore);
 return{
  ...(parts.length?{preparePresentation:(view:View,engine:EngineDraw)=>{for(const[,p]of parts)p.prepare(view,engine);}}:{}),
  ...(saved.length?{presentationState:{
   capture:():Value=>({...(signals?{signals:signals.capture()}:{}),...Object.fromEntries(saved.map(([name,p])=>[name,p.capture!()]))}),
   restore:(value:Value)=>{
    const keys=[...(signals?['signals']:[]),...saved.map(([name])=>name)];
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))throw new Error('Invalid presentation state: expects '+keys.join(', '));
    const record=value as Record<string,Value>;
    signals?.restore(record.signals);for(const[name,p]of saved)p.restore!(record[name]);
   },
  }}:signals?{presentationState:signals}:{}),
 };
}
export interface SceneMechanism {
 label:string;
 /** Artwork roles (manifest.artwork) the scene must name. */
 requires:readonly string[];
 /** The game binds the world to the scene (bindWorld). */
 world:boolean;
 /** The mechanism's scene paints its own surroundings (sky, water, tunnel), so no grey review room stands behind the artwork. */
 ownsRoom?:boolean;
 /** The scene's engine targets (scene.json nativeTargets) may use the `reset` step. */
 targetReset?:boolean;
 apply(ctx:SceneMechanismContext):MechanismResult;
 /** Artwork rows an engine target may anchor to that the mechanism's own data names (a controller's geometry), beside the scene's artwork roles. */
 anchors?(ctx:{data:SceneData;rows:readonly Resolved[]}):Readonly<Record<string,Resolved>>;
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
 * its horizon is the water's `horizon`; a scene with a `water` or a `horizon` role has the sky covered
 * under the canopy (`roof` role), its horizon line being the stage's.
 */
const transitPlatform:SceneMechanism={
 label:'LINE 0 platform (train stop, boarding, canopy)',requires:['roof','stop'],world:true,ownsRoom:true,
 apply:({roles,width,content})=>{const {roof,stop,water}=roles;
  return{platformStop:stop.placement.x,...(water?{horizon:Number(water.props.horizon??0)}:{}),...(water||roles.horizon?{ambient:{...content.ambient,covers:[{from:-60,to:width+60,under:Number(roof.props.under)+roof.placement.h}]}}:{})};},
};
export const SCENE_MECHANISMS:Readonly<Record<string,SceneMechanism>>={
 transitPlatform,citySkyline,lineRide,gantryLift,dockworkerCarry,devicePulse,targetReset,sandboxBay,yardCrane,thermal,vehicleRun,streetCamera,streetLayers,
};
