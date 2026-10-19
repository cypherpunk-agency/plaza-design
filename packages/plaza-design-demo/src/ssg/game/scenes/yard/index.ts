import {yardController} from '../../engine/controllers/yard';
import {validateYardControllerGeometry} from './composition';
import type {NativeTargetValidationContext} from '../../engine/gameplay/native-targets';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {projectNativeDeviceData} from '../../engine/gameplay/native-bindings';
import {projectSceneState} from '../../engine/gameplay/scene-state';
import {nativeDeviceDialogues} from '../../engine/gameplay/native-dialogue';
import type {SceneData} from '../../data/types';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/**
 * The back yard: the first scene on the hacking system (devices → nouns →
 * verbs, cables between nouns). Scene, device and gameplay sources own the
 * composition and ordinary crane/parcel rules. Native code retains CAM-1
 * interaction, source validation and physical presentation; the shared engine
 * executes commands, queries and timed transitions.
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
export function yardScene(document:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,validationContext?:NativeTargetValidationContext,deviceSource:SceneData=YARD):SceneDef{
 const doc=validateYardComposition(document),config=yardController(deviceSource),controller=createYardPresentationState(doc,config??null),tray=config?yardPlacement(config.anchors.tray,doc):{x:0,h:0};
 validateYardControllerGeometry(yardController(deviceSource),doc);
 const authored=content.validateScene(sceneDocument,gameplay,validationContext),actors=compileSceneActors(authored,yardGeometry(doc));
 if(!config&&authored.nativeTargets?.some(t=>t.anchor==='tray'))throw Error('Yard tray target requires its controller artwork binding');
 const compiled=compileManifestDocument(authored,yardGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true});
 let prepared:YardVisual|undefined;
 return{...base,...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),data:projectNativeDeviceData(yardDeviceData({...projectSceneState(deviceSource,gameplay),dialogue:nativeDeviceDialogues(gameplay,deviceSource)},doc,authored),gameplay),
  presentationState:{capture:()=>({...controller}),restore(value){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['hookX','hookVisible'].includes(k))||typeof value.hookX!=='number'||!Number.isFinite(value.hookX)||typeof value.hookVisible!=='boolean')throw new Error('Invalid Yard presentation state');
   controller.hookX=value.hookX;controller.hookVisible=value.hookVisible;prepared=undefined;
  }},
  preparePresentation:(_view,engine)=>{prepared=prepareYardFrame(controller,engine,doc,gameplay);},
  visualEnvironment:(view,engine)=>yardEnvironment(view,{...(prepared??yardVisualSnapshot(controller,engine,doc,gameplay)),layer:engine.layer},doc,actors),
  drawBackdrop:(x,v,e)=>drawYardComposition(x,v,{...(prepared??yardVisualSnapshot(controller,e,doc,gameplay)),layer:e.layer},doc,state,options,actors),
  ...compileNativeTargets(authored,{tray:{x:tray.x,h:tray.h}},content.nativeTargetBindings),
 };
}
export const yard=yardScene();
