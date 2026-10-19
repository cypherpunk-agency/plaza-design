import {projectSceneState} from '../../engine/gameplay/scene-state';
import type {NativeTargetValidationContext} from '../../engine/gameplay/native-targets';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {nativeDeviceDialogues} from '../../engine/gameplay/native-dialogue';
import {content} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {compileNativeTargets} from '../../engine/gameplay/native-targets';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import type {SceneData} from '../../data';
import type { Composition,Environment } from '../../art/core/composition';
import { sandboxComposition,sandboxDeviceData,sandboxGeometry,sandboxStations,validateSandboxComposition,type SandboxRenderOptions } from './composition';
/**
 * The sandbox: REGISTRY QA BAY 3, a test hall for the engine, outside the
 * story. Sudo only (`?sudo`: LEVELS › SANDBOX, or `?sudo&play=sandbox`); it is
 * not on the city map, sets no story flags, and keeps its own scene save
 * (`save.scenes.sandbox`), which the RESET BAY 3 console by the door (or
 * `reset sandbox --yes` in the deck) puts back to the start.
 *
 * One bench per engine feature, left to right, each under a plate that names
 * it and a test card (E) that says how to test it (STATIONS in scene.ts):
 * noun kinds, cables, guards and lock toys, sealed sectors, trace, the net,
 * the watchdog, everyday actions (items, tokens), people, robots and the cat,
 * and the city's time and weather through the window. The devices are
 * data/sandbox.json; rules.ts has the few effects; scene.ts draws it.
 */

import { SANDBOX } from "../../data/index";
import type { SceneDef } from "../kit";
import { SANDBOX_RULES } from './rules';
import { drawSandbox,sandboxActors,sandboxFrameEnvironment } from './scene';

export { SANDBOX_RULES } from './rules';

export {drawSandbox,sandboxFrameEnvironment} from './scene';
export {sandboxArt,sandboxComposition,validateSandboxComposition} from './composition';
export function sandboxScene(document:Composition=sandboxComposition,state:Environment['state']={},options:SandboxRenderOptions={},data:SceneData=SANDBOX,sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,validationContext?:NativeTargetValidationContext):SceneDef{
 const doc=validateSandboxComposition(document),stations=sandboxStations(doc),rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,authored=content.validateScene(sceneDocument,gameplay,validationContext);
 const compiled=compileManifestDocument(authored,rows,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,omitGroundRestHeight:true}),actors=sandboxActors(doc,authored);
 return {id:'sandbox',name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:[...authored.intro],rules:SANDBOX_RULES,gameplay:withSceneConversations(gameplay,authored),...compiled.content,people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),data:sandboxDeviceData(projectSceneState({...data,dialogue:nativeDeviceDialogues(gameplay,data)},gameplay),doc,authored),
  readables:compiled.content.readables?.map(r=>{const st=r.id.startsWith('card')?stations[Number(r.id.slice(4))-1]:undefined;return {...r,...(st&&r.name===content.scene.readables!.find(v=>v.id===r.id)?.name?{name:'BAY 3·'+String(st.n).padStart(2,'0')+' · '+st.title}:{})};}),
  ...compileNativeTargets(authored,{reset:get('reset').placement},content.nativeTargetBindings),
  drawBackdrop:(ctx,v,e)=>drawSandbox(ctx,v,e,doc,state,options,actors),visualEnvironment:(v,e)=>sandboxFrameEnvironment(v,e,doc,actors),
 };
}
export const sandbox=sandboxScene();
