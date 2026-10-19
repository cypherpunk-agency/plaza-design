import type {NativeTargetValidationContext} from '../../engine/gameplay/native-targets';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import {PresentationSignals} from '../../engine/gameplay/presentation-signals';
/**
 * The beach and SALT, its bar: a real beach along the shore from the harbor, looking east over the sea,
 * with Moth's boat moored at the end of the pier.
 *
 * Its devices (the sunbed kiosk, the jukebox, SALT's mixer, the lifeguard
 * drone, the pier's lamp schedule, the boat) are data/beach.json; the kiosk's
 * billing and flag clearing are shared gameplay commands/workflows; the drawing is
 * scene.ts. Its life (people who talk, the cat, ordering a drink, a gull to
 * shoo, a crab, the Registry's notice) is `people`, `uses` and `readables`,
 * like any scene's.
 *
 * Ways out: the stairs at the left end (E) and the left edge itself (walk
 * off) lead up to the promenade and the harbor.
 */

import {BEACH_GAMEPLAY} from './gameplay';
import {projectNativeDeviceData} from '../../engine/gameplay/native-bindings';
import {projectSceneState} from '../../engine/gameplay/scene-state';
import type {SceneData} from '../../data/types';
import { BEACH } from "../../data/index";
import type { SceneDef } from "../kit";
import { BEACH_RULES } from './rules';
import { beachComposition,beachGeometry,beachEnvironment,beachLights,beachCasters,beachDeviceData,validateBeachComposition,drawBeachComposition,type BeachRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import { beachActors } from './scene';

export { BEACH_RULES } from './rules';
export { BEACH_EDGE_X, BEACH_SPAWN, BEACH_W } from './scene';

/** Canonical shipping/composer definition. Physical markers use the same resolved geometry. */
export function beachScene(document:Composition=beachComposition,state:Environment['state']={},options:BeachRenderOptions={},gameplay=BEACH_GAMEPLAY,sceneDocument:SceneDocument=content.scene,validationContext?:NativeTargetValidationContext,deviceSource:SceneData=BEACH):SceneDef{
 const doc=validateBeachComposition(document),rows=beachGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,at=(id:string)=>get(id).placement;
 const authored=content.validateScene(sceneDocument,gameplay,validationContext),signals=new PresentationSignals(authored.cues??[],{gullShooed:-1e9}),gull={get shooed(){return signals.read('gullShooed');}};
 const compiled=compileManifestDocument(authored,rows,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,omitGroundRestHeight:true}),actors=beachActors(doc,authored);
 return{presentationTargets:content.presentationTargets,id:'beach',name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:[...authored.intro],rules:BEACH_RULES,
 ...compiled.content,people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),gameplay:withSceneConversations(gameplay,authored),gameplayEvent:signals.event,presentationState:signals,
 data:projectNativeDeviceData(beachDeviceData(projectSceneState(deviceSource,gameplay),doc,authored),gameplay),lights:beachLights(doc),casters:beachCasters(doc),
 ...compileNativeTargets(authored,{'stairs-exit':at('stairs-exit')},content.nativeTargetBindings),
 drawBackdrop:(ctx,v,e)=>drawBeachComposition(ctx,v,e.m,e.hover,actors,gull,doc,state,options),
 visualEnvironment:(v,e)=>beachEnvironment(doc,v,e.m,e.hover,actors,gull),
 };
}
export const beach=beachScene();
