import {content as sandboxContent} from '../scenes/sandbox/scene-document';
import {projectSceneState} from '../engine/gameplay/scene-state';
import {validateGameplay} from '../engine/gameplay/validation';
import {plainReviewScene,reviewVisibility} from './review-room';
import {SANDBOX_RULES} from '../scenes/sandbox/rules';
import source from './workshop.json';
import data from '../scenes/sandbox/devices.json';
import type {SceneData} from '../data/types';
import {validateNativeContract} from '../engine/gameplay/native-contract';
import {nativeDeviceData} from '../engine/gameplay/native-bindings';
import {sandboxScene} from '../scenes/sandbox';
import {sandboxComposition} from '../scenes/sandbox/composition';
export const REVIEW_DEVICE_IDS=['sensor','lamp','button','counter','plate','hatch','fan'];
export const WORKSHOP_DATA:SceneData=projectSceneState({...structuredClone(data as unknown as SceneData),devices:(data as unknown as SceneData).devices.filter(d=>REVIEW_DEVICE_IDS.includes(d.id)),nodes:[],watchdog:undefined,dialogue:{},goals:[],cables:(data as unknown as SceneData).cables.filter(c=>REVIEW_DEVICE_IDS.includes(c.from.split('.')[0])&&REVIEW_DEVICE_IDS.includes(c.to.split('.')[0]))},validateGameplay(source));
export const validateWorkshopGameplay=(value:unknown)=>validateNativeContract(value,source,WORKSHOP_DATA);
export const WORKSHOP_GAMEPLAY=validateWorkshopGameplay(source);
export function workshopScene(composition=sandboxComposition,gameplay=WORKSHOP_GAMEPLAY){
 composition=structuredClone(composition);const positions:Record<string,number>={sensor:220,lamp:300,button:400,counter:470,plate:550,hatch:700,fan:820};
 for(const row of composition.instances)if(row.id in positions)row.placement.x=positions[row.id];
 const sceneDocument=structuredClone(sandboxContent.scene);
 // This review area deliberately contains only these devices; retain exactly their source bindings.
 sceneDocument.manifest!.devices=Object.fromEntries(Object.entries(sceneDocument.manifest!.devices??{}).filter(([id])=>REVIEW_DEVICE_IDS.includes(id)));
 const shared=validateWorkshopGameplay(gameplay),base=sandboxScene(composition,{}, {visibility:reviewVisibility(composition,REVIEW_DEVICE_IDS)},WORKSHOP_DATA,sceneDocument);
 return{...plainReviewScene(base),name:'Devices & wiring',spawn:220,gameplay:shared,data:nativeDeviceData(base.data!,shared),rules:{effects:{'sbx.pulse':SANDBOX_RULES.effects['sbx.pulse']}},uses:[]};
}
