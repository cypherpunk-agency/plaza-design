import {projectSceneState} from '../../engine/gameplay/scene-state';
import {projectDeviceBindings} from '../../engine/gameplay/device-bindings';
import type {SceneData} from '../../data/types';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {nativeDialogue} from '../../engine/gameplay/native-dialogue';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/**
 * The stacks (story Level 7, P15 NRLU 404 0451, the end of Act I): terminal 2
 * behind the harbor pier, a scene of the harbor's place (city.ts). Container
 * blocks A, B and C, crane STS-2, the Port Authority's thermal gate, NIGHT
 * FERRY 7 at berth 4, and the Registry's watchdog walking port → crane → ferry.
 * Moth is in a reefer somewhere in block B.
 *
 * Its devices are data/stacks.json; the crane's lifts, the gate's timing, the
 * watchdog's wiring check and the end of Act I are rules.ts; STS-2's camera is
 * scope.ts; the drawing is scene.ts. Ways out: the gate booth back to the pier,
 * and the lane to warehouse 4 (scenes/warehouse.ts).
 */

import { STACKS } from "../../data/index";
import type { SceneDef } from "../kit";
import { stacksRulesFor } from './rules';
import { scopePanel } from './scope';
import { drawStacks, drawStacksFront, stacksActors,stacksFrameEnvironment } from './scene';
import {stacksComposition,validateStacksComposition,stacksDeviceData,stacksGeometry,terminalRuleGeometry,type StacksRenderOptions} from './composition';
import type {Composition,Environment} from '../../art';
export {drawStacks,drawStacksFront,stacksFrameEnvironment} from './scene';
export {stacksArt,stacksComposition,validateStacksComposition} from './composition';

export { ACT1_FLAG, ACT2_CUT, CONTACT_FLAG, SPIRE_FLAG, STACKS_RULES_SHAPE } from './rules';

/** The tea urn on its crate by block C: what the night shift runs on. */


const base: Omit<SceneDef,'width'|'spawn'|'exits'> = {
  id: 'stacks',
  name: content.scene.name,
  // facing (light.ts): terminal 2 looks east over the bay (the Spire out on the water)



  intro: content.scene.intro,
  data: STACKS,
  rules: (player) => stacksRulesFor(player),
  panels: { scope: scopePanel },
  drawBackdrop: drawStacks,
  drawFront: (x,v)=>drawStacksFront(x,v),

};

export function stacksScene(document:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,deviceSource:SceneData=STACKS):SceneDef{
 const doc=validateStacksComposition(document),rows=stacksGeometry(doc),scene=rows.find(r=>r.instance.id==='scene')!,authored=content.validateScene(sceneDocument,gameplay);
 const compiled=compileManifestDocument(authored,rows,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,groundSpawn:false,omitGroundRestHeight:true}),actors=stacksActors(doc,authored),data=projectDeviceBindings(authored,rows,stacksDeviceData({...projectSceneState(deviceSource,gameplay),dialogue:{moth:nativeDialogue(gameplay,'moth',{},undefined,{entryActions:false})}},doc,authored),compiled.content.width);
 return {...base,gameplay:withSceneConversations(gameplay,authored),...compiled.content,name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:[...authored.intro],horizon:Number(scene.props.horizon),data,rules:player=>stacksRulesFor(player,terminalRuleGeometry(doc)),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),visualEnvironment:(v,e)=>stacksFrameEnvironment(v,e,doc,actors,gameplay),drawBackdrop:(x,v,e)=>drawStacks(x,v,e,doc,state,options,actors,gameplay),drawFront:(x,v)=>drawStacksFront(x,v,doc,state,options)};
}
export const stacks=stacksScene();
