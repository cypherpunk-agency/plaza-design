import type {Resolved} from '../../art/core/composition';
import type {SceneDef} from '../../scenes/kit';
import type {SceneDocument} from './scene-document';
/**
 * Registered scene mechanisms: what a declared scene takes from the engine beyond its documents,
 * named in scene.json `stage.mechanisms` and edited under Scene › Stage & compile. A mechanism
 * reads the scene as built (its artwork roles, its width, its compiled content) and returns the
 * SceneDef fields it owns. A mechanism with `world` makes the scene one the game rebuilds with the
 * city and line system (SceneDef.bindWorld), which its binding providers then read (ctx.world).
 */
export interface SceneMechanismContext {scene:SceneDocument;rows:readonly Resolved[];roles:Readonly<Record<string,Resolved>>;width:number;content:SceneDef}
export interface SceneMechanism {
 label:string;
 /** Artwork roles (manifest.artwork) the scene must name. */
 requires:readonly string[];
 /** The game binds the world to the scene (bindWorld). */
 world:boolean;
 /** The mechanism's scene paints its own surroundings (sky, water, tunnel), so no grey review room stands behind the artwork. */
 ownsRoom?:boolean;
 apply(ctx:SceneMechanismContext):Partial<SceneDef>;
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
 transitPlatform,
};
