import {projectSceneState} from '../engine/gameplay/scene-state';
import {validateGameplay} from '../engine/gameplay/validation';
import {plainReviewScene,reviewVisibility} from './review-room';
import {PULSE_EFFECTS} from '../engine/gameplay/mechanisms/device-pulse';
import source from './workshop.json';
import data from '../scenes/sandbox/devices.json';
import type {SceneData} from '../data/types';
import {validateNativeContract} from '../engine/gameplay/native-contract';
import {nativeDeviceData} from '../engine/gameplay/native-bindings';
import {folderSceneDefinition} from '../engine/gameplay/folder-scene';
import {FOLDER_SOURCES} from '../scenes/folder-scenes';
import {art} from '../art';
import type {SceneDocument} from '../engine/gameplay/scene-document';
/** The QA bay's artwork: the Test District's devices & wiring area is cut from it. */
export const sandboxComposition=art.validate(FOLDER_SOURCES.sandbox.composition);
export const REVIEW_DEVICE_IDS=['sensor','lamp','button','counter','plate','hatch','fan'];
export const WORKSHOP_DATA:SceneData=projectSceneState({...structuredClone(data as unknown as SceneData),devices:(data as unknown as SceneData).devices.filter(d=>REVIEW_DEVICE_IDS.includes(d.id)),nodes:[],watchdog:undefined,dialogue:{},goals:[],cables:(data as unknown as SceneData).cables.filter(c=>REVIEW_DEVICE_IDS.includes(c.from.split('.')[0])&&REVIEW_DEVICE_IDS.includes(c.to.split('.')[0]))},validateGameplay(source));
export const validateWorkshopGameplay=(value:unknown)=>validateNativeContract(value,source,WORKSHOP_DATA);
export const WORKSHOP_GAMEPLAY=validateWorkshopGameplay(source);
export function workshopScene(composition=sandboxComposition,gameplay=WORKSHOP_GAMEPLAY){
 composition=structuredClone(composition);const positions:Record<string,number>={sensor:220,lamp:300,button:400,counter:470,plate:550,hatch:700,fan:820};
 for(const row of composition.instances)if(row.id in positions)row.placement.x=positions[row.id];
 const sceneDocument=structuredClone(FOLDER_SOURCES.sandbox.scene) as unknown as SceneDocument;
 // This review area deliberately contains only these devices; retain exactly their source bindings.
 sceneDocument.manifest!.devices=Object.fromEntries(Object.entries(sceneDocument.manifest!.devices??{}).filter(([id])=>REVIEW_DEVICE_IDS.includes(id)));
 // the area has no dispenser and no reset console: their uses and engine targets need commands of the full bay's gameplay
 sceneDocument.uses=[];sceneDocument.manifest!.uses={};delete sceneDocument.nativeTargets;delete sceneDocument.manifest!.artwork;sceneDocument.stage={mechanisms:['devicePulse'],values:sceneDocument.stage!.values};
 const shared=validateWorkshopGameplay(gameplay),base=folderSceneDefinition('sandbox',FOLDER_SOURCES.sandbox,{composition,options:{visibility:reviewVisibility(composition,REVIEW_DEVICE_IDS)},scene:sceneDocument,gameplay:shared,devices:WORKSHOP_DATA,deviceCheck:'deferred'});
 return{...plainReviewScene(base),name:'Devices & wiring',spawn:220,gameplay:shared,data:nativeDeviceData(base.data!,shared),rules:{effects:{'sbx.pulse':PULSE_EFFECTS['sbx.pulse']}},uses:[]};
}
