import {nativeDeviceDialogues} from '../../engine/gameplay/native-dialogue';
import type {NativeTargetValidationContext} from '../../engine/gameplay/native-targets';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {projectSceneState} from '../../engine/gameplay/scene-state';
import type {SceneData} from '../../data/types';
import type { Composition, Environment } from '../../art/core/composition';
import { mothComposition, validateMothComposition, mothGeometry, mothEnvironment, drawMothComposition, type MothRenderOptions } from './composition';
/**
 * Moth's place (story Level 3): flat 4C, reached from Downtown's east end
 * with Moth's key chip. What is in it, FRIENDNET and MOTH-PC included, is
 * data/moth.json; the code is two derived values and a few goals (rules.ts)
 * and the drawing (scene.ts). The engine in engine/ runs the rest: the drawer's
 * key seal (P09), the journal's song seal and the Registry's watchdog (P10).
 * The way out is the door, back onto the street.
 */

import { MOTH } from "../../data/index";
import type { SceneDef } from "../kit";
import { mothDeviceData } from './composition';
import { MOTH_RULES } from './rules';

export { MOTH_KEY, UPLINK } from './rules';
export { MOTH_SPAWN, drawMoth, mothFrameEnvironment } from './scene';
export { mothArt, mothComposition, validateMothComposition } from './composition';

/** Canonical Moth scene for shipping and composer variants; destination/rules stay fixed. */
export function mothScene(document: Composition = mothComposition, state: Environment['state'] = {}, options: MothRenderOptions = {},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,validationContext?:NativeTargetValidationContext,deviceSource:SceneData=MOTH): SceneDef {
  const doc=validateMothComposition(document),geometry=mothGeometry(doc);
  const authored=content.validateScene(sceneDocument,gameplay,validationContext),actors=compileSceneActors(authored,geometry);
 const compiled=compileManifestDocument(authored,geometry,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true}),roles=compiled.geometry.artwork,door=roles.door?.placement;
  return {id:'moth',rules:MOTH_RULES,...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),facing:Number(roles.orientation?.props.facing??0),data:mothDeviceData(projectSceneState({...deviceSource,dialogue:nativeDeviceDialogues(gameplay,deviceSource)},gameplay),doc,authored),
    ...compileNativeTargets(authored,{...(door?{door}:{})},{reset:content.nativeTargetBindings?.reset===true,anchors:door?['door']:[]}),
    visualEnvironment:(view,engine)=>mothEnvironment(doc,view,engine.m,engine.hover,actors,authored),
    drawBackdrop:(ctx,view,engine)=>drawMothComposition(ctx,view,engine.m,engine.hover,doc,state,options,actors,authored),
  };
}
export const moth=mothScene();
