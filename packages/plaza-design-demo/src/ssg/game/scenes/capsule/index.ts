import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {nativeDeviceDialogues} from '../../engine/gameplay/native-dialogue';
import {projectSceneState} from '../../engine/gameplay/scene-state';
import type {SceneData} from '../../data/types';
import type {NativeTargetValidationContext} from '../../engine/gameplay/native-targets';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {projectNativeDeviceData} from '../../engine/gameplay/native-bindings';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import type { Composition, Environment } from '../../art/core/composition';
import { capsuleComposition, validateCapsuleComposition, capsuleGeometry, capsuleEnvironment, drawCapsuleComposition, type CapsuleRenderOptions } from './composition';
/**
 * Capsule 7B: your flat, where the game starts. What is in it is
 * data/capsule.json; what is left here is its own code: the flat's clock,
 * the router and Pixel (rules.ts) and the drawing (scene.ts). The engine in
 * engine/ runs the rest. The way out is the door, once CONCIERGE unlocks it.
 */

import { CAPSULE } from "../../data/index";
import type { SceneDef } from "../kit";
import {projectDeviceBindings} from '../../engine/gameplay/device-bindings';
import { CAPSULE_RULES } from './rules';

export { CAPSULE_SPAWN, CAPSULE_W, capsulePerch, drawCapsule, capsuleFrameEnvironment } from './scene';
export { capsuleArt, capsuleComposition, validateCapsuleComposition } from './composition';

/** Canonical source-derived flat, including Pixel perches and physical device markers. */
export function capsuleScene(document: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,validationContext?:NativeTargetValidationContext,deviceSource:SceneData=CAPSULE): SceneDef {
  const doc=validateCapsuleComposition(document),geometry=capsuleGeometry(doc);
  const authored=content.validateScene(sceneDocument,gameplay,validationContext),actors=compileSceneActors(authored,geometry),roles=resolveArtworkRoles('capsule',authored.manifest?.artwork,geometry),door=roles.door?.placement;
 const compiled=compileManifestDocument(authored,geometry,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true});
  return {id:'capsule',rules:CAPSULE_RULES,...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),...(roles.orientation?{facing:Number(roles.orientation.props.facing)}:{}),data:projectNativeDeviceData(projectDeviceBindings(authored,geometry,projectSceneState({...deviceSource,dialogue:nativeDeviceDialogues(gameplay,deviceSource)},gameplay),compiled.content.width),gameplay),
    ...compileNativeTargets(authored,door?{door}:{},content.nativeTargetBindings),
    visualEnvironment:(view,engine)=>capsuleEnvironment(doc,view,engine.m,engine.hover,actors,authored),
    drawBackdrop:(ctx,view,engine)=>drawCapsuleComposition(ctx,view,engine.m,engine.hover,doc,state,options,actors,authored),
  };
}
export const capsule=capsuleScene();
