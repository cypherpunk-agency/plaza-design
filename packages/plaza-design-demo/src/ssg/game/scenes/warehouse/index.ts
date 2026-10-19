import {WAREHOUSE_SCENE,WAREHOUSE_GAMEPLAY,validateWarehouseScene,validateWarehouseGameplay,warehouseBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/**
 * Warehouse 4, from outside: down the lane behind the stacks (Harbor & Shore).
 * Twenty years the Tide's bonded store, now the Registry's evidence custody:
 * what the Registry seizes from people it counts out is kept here "pending
 * review". Its evidence locker is Act II (root fragment 3); for now the place is
 * its forecourt and a door that does not open, for a reason it states.
 *
 * Play band: the lane back to the stacks, a Tide hand mending a net on the
 * loading dock, the dock's roller doors sealed with Registry tape, the
 * personnel door with its warrant reader, the plaque, the Registry's notice
 * screen, a security mech on its round, the evidence van, a single shoe with an
 * evidence tag on the dock's edge. Middle band: the warehouse's corrugated wall,
 * high and windowless but for one lit office. Far band: the sky over the stacks,
 * the cranes, the Spire's antenna.
 *
 * No devices: nothing here to hack yet. Dry signs; the people have the jokes.
 */

import type { Character } from "../../runtime/characters";
import type { SceneDef } from "../kit";
import {drawWarehouseComposition,warehouseComposition,warehouseGeometry,warehouseLights,warehouseCasters,warehouseEnvironment,validateWarehouseComposition,type WarehouseRenderOptions} from './composition';
import type {Composition,Environment} from '../../art';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';

export function warehouseActors(document:Composition=warehouseComposition,source:SceneDocument=WAREHOUSE_SCENE):Record<string,Character>{return compileSceneActors(source,warehouseGeometry(document));}
export const WAREHOUSE_ACTORS=warehouseActors();

export {warehouseComposition,validateWarehouseComposition} from './composition';
export function warehouseFrameEnvironment(view:View,_engine:EngineDraw,document:Composition=warehouseComposition){return warehouseEnvironment(document,view,warehouseActors(document));}
export function warehouseScene(document:Composition=warehouseComposition,state:Environment['state']={},options:WarehouseRenderOptions={},sceneDocument:SceneDocument=WAREHOUSE_SCENE,gameplay:GameplayDefinition=WAREHOUSE_GAMEPLAY):SceneDef{
 const content=validateWarehouseScene(sceneDocument,validateWarehouseGameplay(gameplay)),doc=validateWarehouseComposition(document),rows=warehouseGeometry(doc);
 const actors=warehouseActors(doc,content),compiled=compileManifestDocument(content,rows,(_context,id)=>({name:'',pages:[],conversation:id}),{groups:warehouseBindingGroups,groundExits:false}),roles=compiled.geometry.artwork,wall=roles.frontShade;
 return {id:'warehouse',name:content.name,facing:Number(roles.orientation?.props.facing??0),...compiled.content,
  intro:content.introTouch?(touch:boolean)=>[...(touch?content.introTouch!:content.intro)]:content.intro.length?[...content.intro]:undefined,
  gameplay:withSceneConversations(gameplay,content),people:content.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
  ...(wall?{shade:{front:{h:wall.placement.h+Number(wall.props.height)*wall.placement.scale,gaps:[[-400,wall.placement.x]]}}}:{}),lights:warehouseLights(doc),casters:warehouseCasters(doc,roles.casterWidth),
  drawBackdrop:(ctx,view)=>drawWarehouseComposition(ctx,view,actors,doc,state,options),visualEnvironment:view=>warehouseEnvironment(doc,view,actors),
 };

}
export const warehouse=warehouseScene();
