import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
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
import { drawMoth } from './scene';

export { MOTH_KEY, UPLINK } from './rules';
export { MOTH_DOOR_X, MOTH_SPAWN, MOTH_W, drawMoth, mothFrameEnvironment } from './scene';
export { mothArt, mothComposition, validateMothComposition } from './composition';

/** The flat, complete: data, rules, drawing, the door. */
const baseMoth: Omit<SceneDef,'width'|'spawn'|'exits'> = {
  id: 'moth',
  name: content.scene.name,
  // facing (light.ts): the window looks west over the street: the evening sun

  intro: content.scene.intro,
  data: mothDeviceData(MOTH),
  rules: MOTH_RULES,
  drawBackdrop: drawMoth,

};

/** Canonical Moth scene for shipping and composer variants; destination/rules stay fixed. */
export function mothScene(document: Composition = mothComposition, state: Environment['state'] = {}, options: MothRenderOptions = {},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay): SceneDef {
  const doc=validateMothComposition(document),geometry=mothGeometry(doc),byId=(id:string)=>geometry.find(row=>row.instance.id===id)!,door=byId('door').placement;
  const authored=content.validateScene(sceneDocument,gameplay),actors=compileSceneActors(authored,geometry);
 const compiled=compileManifestDocument(authored,geometry,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true});
  return {...baseMoth,...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),facing:Number(byId('window').props.facing),data:mothDeviceData(MOTH,doc),
    ...compileNativeTargets(authored,{door}),
    visualEnvironment:(view,engine)=>mothEnvironment(doc,view,engine.m,engine.hover,actors),
    drawBackdrop:(ctx,view,engine)=>drawMothComposition(ctx,view,engine.m,engine.hover,doc,state,options,actors),
  };
}
export const moth=mothScene();
