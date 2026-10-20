import {art} from '../../art';
import {drawComposition,resolveComposition,type Composition,type Environment,type Resolved} from '../../art/core/composition';
import {frameView,type View} from '../../art/core/view';
import type {TrainFrame} from '../../art/assemblies/train-elements';
import {compileSceneActors} from './actors';
import {bindingDefaults} from './binding-sources';
import {manifestGeometry} from './manifest-geometry';
import {trainLayoutOf,trainValues,type TrainScenery} from './binding-providers/train';
import type {SceneDocument} from './scene-document';
/** The car from its documents alone (the vehicle workbench paints it without a scene or a game). */
export function trainScenery(composition:unknown,scene:SceneDocument):{sc:TrainScenery;composition:Composition}{
 const doc=art.validate(composition),rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false}),compile=scene.manifest!.compile;
 const geometry=compile?manifestGeometry(scene,rows,compile.groups,compile):manifestGeometry(scene,rows),actors=compileSceneActors(scene,rows as Resolved[]);
 return{sc:{source:scene,rows,roles:geometry.artwork,actors,layout:trainLayoutOf(scene,rows,geometry.artwork,geometry.width,geometry.spawn)},composition:doc};
}
/** Paint one pass of the car for a prepared frame (workbench). `extra` is more of the environment (hidden riders). */
export function drawTrainFrame(ctx:CanvasRenderingContext2D,view:View,frame:TrainFrame,pass:'backdrop'|'foreground',composition:Composition,sc:TrainScenery,extra:Partial<Environment>={}){
 const bindings=bindingDefaults(composition);
 for(const[key,v]of Object.entries(trainValues(sc,view,frame)))bindings['train.'+key]=v;
 drawComposition(ctx,art,composition,{...extra,view,state:{},bindings,reduced:false},pass);
}
