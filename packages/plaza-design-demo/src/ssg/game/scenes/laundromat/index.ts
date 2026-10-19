import {nativeDialogue} from '../../engine/gameplay/native-dialogue';
import type { Composition,Environment } from '../../art/core/composition';
import { laundromatComposition,laundromatDeviceData,laundromatGeometry,validateLaundromatComposition,type LaundromatRenderOptions } from './composition';
/**
 * The laundromat (story Level 5, P13 Washer 3): a narrow shop in the Neon
 * Market, between the stalls, where Moth left a jacket in washer 3 with a
 * maglev pass in its pocket ("nobody searches a wash cycle").
 *
 * Its devices (four washers, the breaker and its conduits, the schedule, SUDS)
 * are data/laundromat.json; the cycles, the trip and the jacket are rules.ts;
 * the drawing is scene.ts. Its life (the people waiting for their wash, FOLD-O
 * at the folding table, the cat on the sill, the soap dispenser, the Registry's
 * notice, the lost-sock board) is `people`, `uses` and `readables`.
 *
 * The way out is the door, back into the market.
 */

import { LAUNDROMAT } from "../../data/index";
import type { SceneDef } from "../kit";
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {LAUNDROMAT_GAMEPLAY,LAUNDROMAT_SCENE,validateLaundromatGameplay,validateLaundromatScene,laundromatBindingGroups} from './scene-document';
export {LAUNDROMAT_GAMEPLAY,LAUNDROMAT_SCENE,validateLaundromatGameplay,validateLaundromatScene} from './scene-document';
import { LAUNDROMAT_RULES } from './rules';
import { drawLaundromat, laundromatActors,laundromatFrameEnvironment } from './scene';

export { LAUNDROMAT_RULES, MAGLEV_PASS, P13_FLAG, RIGHT_GLOVE } from './rules';

export { drawLaundromat,laundromatFrameEnvironment } from './scene';
export { laundromatComposition,laundromatArt,validateLaundromatComposition } from './composition';
export function laundromatScene(document:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={},sceneDocument:SceneDocument=LAUNDROMAT_SCENE,gameplay:GameplayDefinition=LAUNDROMAT_GAMEPLAY):SceneDef{
  const doc=validateLaundromatComposition(document),rows=laundromatGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!;
  const logic=validateLaundromatScene(sceneDocument,validateLaundromatGameplay(gameplay)),actors=laundromatActors(doc,logic);
  const compiled=compileManifestDocument(logic,rows,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:laundromatBindingGroups,groundExits:false});
  return {id:'laundromat',name:logic.name,facing:Number(get('window').props.facing),...compiled.content,
   intro:logic.introTouch?(touch:boolean)=>[...(touch?logic.introTouch!:logic.intro)]:logic.intro.length?[...logic.intro]:undefined,
   gameplay:withSceneConversations(gameplay,logic),data:laundromatDeviceData({...LAUNDROMAT,dialogue:{suds:nativeDialogue(gameplay,'suds')}},doc),rules:LAUNDROMAT_RULES,
   people:logic.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
   drawBackdrop:(ctx,v,e)=>drawLaundromat(ctx,v,e,doc,state,options,actors),visualEnvironment:(v,e)=>laundromatFrameEnvironment(v,e,doc,actors)};

}
export const laundromat=laundromatScene();
