import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {projectNativeDeviceData} from '../../engine/gameplay/native-bindings';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/**
 * The back yard: the first scene on the hacking system (devices → nouns →
 * verbs, cables between nouns). What is in it is data/yard.json; what is
 * left here is its own code: the crane and the parcel (effects.ts), CAM-1
 * (camera.ts) and the drawing (scene.ts). The engine in engine/ runs the rest.
 */

import { YARD } from "../../data/index";
import type { SceneDef } from "../kit";
import { cameraPanel } from './camera';
import { YARD_RULES } from './effects';
import {createYardPresentationState,drawYardComposition,prepareYardFrame,validateYardComposition,yardComposition,yardDeviceData,yardPlacement,yardGeometry,yardVisualSnapshot,yardEnvironment,type YardRenderOptions} from './composition';
import type {YardVisual} from '../../art/assemblies/fixer-yard';
import type {Composition,Environment} from '../../art';
export {drawYard,yardFrameEnvironment} from './scene';
export {yardArt,yardComposition,validateYardComposition,createYardPresentationState,prepareYardFrame} from './composition';

export { YARD_SPAWN, YARD_W } from './scene';

/** What the fixer's parcel holds: Moth's key chip (flat 4C, MOTH-PC's drawer) and uplink.so (your deck past your building). */
export const PARCEL=content.scene.nativeTargets![0].routes.flatMap(r=>r.steps.flatMap(s=>'do'in s?s.do.flatMap(a=>'give'in a?[a.give]:[]):[]));

/** The yard, complete: data, rules, drawing, the way out. */
const base: Omit<SceneDef,'width'|'spawn'|'exits'> = {
  id: 'yard',
  name: content.scene.name,
  // facing (light.ts): through the alley, east of the street: the strip of sky over the roofs sees the dawn

  // the way out is the open passage at the left edge: walk into it, no E
  intro: content.scene.intro,
  // boxed in by the backs of houses: no city behind the yard, the street's floor and the rain


  data: YARD,
  rules: YARD_RULES,
  panels: { camera: cameraPanel },
  layers: true,
  /** The yard is walled in, so it draws its own backdrop (after the ground) instead of the open city. */
  drawBackdrop: () => {},

};

/** The frame controller owns pose history; painting and bounds consume its immutable snapshot. */
export function yardScene(document:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay):SceneDef{
 const doc=validateYardComposition(document),controller=createYardPresentationState(doc),tray=yardPlacement('tray',doc).x;
 const authored=content.validateScene(sceneDocument,gameplay),actors=compileSceneActors(authored,yardGeometry(doc));
 const compiled=compileManifestDocument(authored,yardGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true});
 let prepared:YardVisual|undefined;
 return{...base,...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),data:projectNativeDeviceData(yardDeviceData(YARD,doc),gameplay),
  presentationState:{capture:()=>({...controller}),restore(value){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['hookX','hookVisible'].includes(k))||typeof value.hookX!=='number'||!Number.isFinite(value.hookX)||typeof value.hookVisible!=='boolean')throw new Error('Invalid Yard presentation state');
   controller.hookX=value.hookX;controller.hookVisible=value.hookVisible;prepared=undefined;
  }},
  preparePresentation:(_view,engine)=>{prepared=prepareYardFrame(controller,engine,doc);},
  visualEnvironment:(view,engine)=>yardEnvironment(view,{...(prepared??yardVisualSnapshot(controller,engine,doc)),layer:engine.layer},doc,actors),
  drawBackdrop:(x,v,e)=>drawYardComposition(x,v,{...(prepared??yardVisualSnapshot(controller,e,doc)),layer:e.layer},doc,state,options,actors),
  ...compileNativeTargets(authored,{tray:{x:tray}}),
 };
}
export const yard=yardScene();
