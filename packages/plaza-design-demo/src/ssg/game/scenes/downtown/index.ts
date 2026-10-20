import {projectDeviceBindings} from '../../engine/gameplay/device-bindings';
import {downtownController} from '../../engine/controllers/motion';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {content,downtownBindingGroups} from './scene-document';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {projectSceneState} from '../../engine/gameplay/scene-state';
import type {SceneData} from '../../data/types';
/**
 * Downtown, the first street, a scene on the engine: every machine is a device
 * on the board with nouns and verbs, hack vision (H) and the board (B), and
 * the deck's keyboard stays as the last resort. What is on the street is
 * data/downtown.json; its own code is the effects and save bridge (rules.ts,
 * save.ts), CAM-3 (camera.ts), the drawing (scene.ts) and the typed commands
 * (shell.ts). Ordinary source bindings use the shared manifest compiler. The
 * native sprite people use shared actor recipes and authored conversations;
 * specialist device controllers retain their native behavior.
 */

import { DOWNTOWN } from "../../data/index";
import { downtownLayout } from "./layout";
import type { SceneDef } from "../kit";
import { cam3Panel } from './camera';
import { downtownRules, dlvX } from './rules';
import {  downtownComposition,downtownReflections,renderDowntownCity,renderDowntownStreet, downtownLights, downtownCasters, downtownGeometry, renderDowntownDevices,renderDowntownPeople,downtownEnvironment, validateDowntownComposition, type DowntownRenderOptions } from './composition';
import type { Composition, Properties } from '../../art/core/composition';

export { MAP_KIOSK_X } from './scene';
export { syncGoals } from './save';
export { sceneShell, type SceneShell } from './shell';


/** Downtown, complete. Its rules are made for the player's save (`rules(player)`). */
const baseDowntown:Omit<SceneDef,'width'|'spawn'|'exits'|'drawBackdrop'> = {
  id: 'downtown',
  name: content.scene.name,


  // the street runs northÃ¢â‚¬â€œsouth; you look east across it, over the towers toward the bay: the sun
  // comes up behind them (the opening's dawn) and the facades stand in their own shade all morning



  buzz: true,
  rules: (player:Parameters<typeof downtownRules>[0]) => downtownRules(player),
  panels: { cam3: cam3Panel },
  // once Downtown is cleared the gate stands open: the market's door takes the gate's place
  hideDevice: (id:string, flags:Readonly<Record<string,boolean>>) => id === 'gate' && !!flags.end,

};


/** Local marker edits enter the same runtime definition; rule functions and destinations stay intact. */
export const downtownExitMarkerPolicy={axes:['x'] as const,verticalPhysics:false} as const;
export function downtownScene(document:Composition=downtownComposition,overrides?:Readonly<Record<string,Properties>>,options:DowntownRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay,deviceSource:SceneData=DOWNTOWN):SceneDef {
 const doc=validateDowntownComposition(document),authored=content.validateScene(sceneDocument,gameplay),layout=downtownLayout(doc,authored),data=projectDeviceBindings(authored,downtownGeometry(doc),projectSceneState(deviceSource,gameplay),layout.width),home=(m:import('../../engine/model').SceneModel)=>m.data.devices.find(d=>d.id===downtownController(m.data).devices.vehicle)!.layout!.spot!.x;
 const actors=compileSceneActors(authored,downtownGeometry(doc));
 const compiled=compileManifestDocument(authored,downtownGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:downtownBindingGroups,groundExits:false,transformedExits:true});
 return{...baseDowntown,...compiled.content,artworkFrame:{reflections:downtownReflections(doc,authored),city:(x,v)=>renderDowntownCity(x,v,doc,overrides,options,authored),street:(x,v,rain,lit)=>renderDowntownStreet(x,v,rain,lit,doc,overrides,options,authored)},name:authored.name,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),drawActors:(x,v)=>renderDowntownPeople(x,v,doc,overrides,options,actors,authored),visualEnvironment:v=>downtownEnvironment(doc,v,{overrides,options,actors,source:authored}),platforms:layout.platforms,data,lights:downtownLights(doc),casters:downtownCasters(doc,authored),
  drawBackdrop:(x,v,e)=>renderDowntownDevices(x,v,e.m,e.hover,dlvX(e.m,home(e.m)),doc,overrides,options,authored),
 };
}

export const downtown=downtownScene();
