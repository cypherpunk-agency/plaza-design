import type {NativeTargetValidationContext} from '../engine/gameplay/native-targets';
import {authoredDocumentId,type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {declaredScene} from '../engine/gameplay/declared-scene';
import {folderSceneDefinition} from '../engine/gameplay/folder-scene';
import {declaredSceneOptions} from '../engine/gameplay/declared-scene';
import {FOLDER_BY_ID} from '../scenes/folder-scenes';
import {FOLDER_SCENE_IDS} from '../scenes';
import {validateGameplay} from '../engine/gameplay/validation';
import {validateSceneDocument,type SceneDocument} from '../engine/gameplay/scene-document';
import type {Composition,Environment} from '../art';
import {CAPSULE,YARD,LAUNDROMAT,STACKS,type SceneData} from '../data';
import {downtownScene} from '../scenes/downtown';
import {content as downtownContent} from '../scenes/downtown/scene-document';
import {harborScene} from '../scenes/harbor';
import {content as harborContent} from '../scenes/harbor/scene-document';
import {beachScene} from '../scenes/beach';
import {validateBeachScene} from '../scenes/beach/scene-document';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {sandboxScene} from '../scenes/sandbox';
import {content as sandboxContent} from '../scenes/sandbox/scene-document';
import {capsuleScene} from '../scenes/capsule';
import {content as capsuleContent} from '../scenes/capsule/scene-document';
import {yardScene} from '../scenes/yard';
import {content as yardContent} from '../scenes/yard/scene-document';
import {marketScene} from '../scenes/market';
import {validateMarketScene} from '../scenes/market/scene-document';
import {validateMarketGameplay} from '../scenes/market/gameplay';
import {stacksScene} from '../scenes/stacks';
import {content as stacksContent} from '../scenes/stacks/scene-document';
import {metroScene} from '../scenes/metro';
import {content as metroContent} from '../scenes/metro/scene-document';
import {galleriaStationScene} from '../scenes/galleriaStation';
import {content as galleriaStationContent} from '../scenes/galleriaStation/scene-document';
import {harborStationScene} from '../scenes/harborStation';
import {content as harborStationContent} from '../scenes/harborStation/scene-document';
import {trainScene} from '../scenes/train';
import {content as trainContent} from '../scenes/train/scene-document';
const metroAuthoredScene=(...args:Parameters<typeof trainScene>)=>metroScene(args[0],args[1],args[2],undefined,args[3],args[4]);
import {mallScene} from '../scenes/mall';
import {validateMallScene,validateMallGameplay} from '../scenes/mall/scene-document';
import {validateManifestScene,validateManifestGameplay,manifestDemoScene} from '../scenes/demo-manifest';
import {demoCounterScene,demoDeskScene,validateDemoGameplay,validateDemoScene} from '../demo';
/** Explicit migrated-scene registry shared by authoring, protected saves and isolated Play. */
import {validateShiftScene} from '../scenes/harbor-shift/scene-document';
import {validateShiftGameplay} from '../scenes/harbor-shift/gameplay-contract';
import {harborShiftScene} from '../scenes/harbor-shift';
import {laundromatScene} from '../scenes/laundromat';
import {validateLaundromatScene,validateLaundromatGameplay} from '../scenes/laundromat/scene-document';
/** The arguments every scene factory takes: composition, preview state, render options, scene and gameplay documents. */
type SceneFactoryArgs=[document?:Composition,state?:Environment['state'],options?:Partial<Environment>,content?:SceneDocument,gameplay?:import('../engine/gameplay/types').GameplayDefinition];
const marketAuthoredScene=(...args:SceneFactoryArgs)=>marketScene(args[0],args[1],args[2],args[4],args[3]);
const sandboxAuthoredScene=(...args:[...SceneFactoryArgs,NativeTargetValidationContext?])=>sandboxScene(args[0],args[1],args[2],undefined,args[3],args[4],args[5]);
const beachAuthoredScene=(...args:[...SceneFactoryArgs,NativeTargetValidationContext?])=>beachScene(args[0],args[1],args[2],args[4],args[3],args[5]);
const downtownAuthoredScene=(...args:SceneFactoryArgs)=>downtownScene(args[0],undefined,args[2],args[3],args[4]);
type DeviceSourceArguments=[...SceneFactoryArgs,SceneData?,NativeTargetValidationContext?];
const capsuleWithDevices=(...args:DeviceSourceArguments)=>capsuleScene(args[0],args[1],args[2],args[3],args[4],args[6],args[5]);
const sandboxWithDevices=(...args:DeviceSourceArguments)=>sandboxScene(args[0],args[1],args[2],args[5],args[3],args[4],args[6]);
const downtownWithDevices=(...args:DeviceSourceArguments)=>downtownScene(args[0],undefined,args[2],args[3],args[4],args[5]);
const beachWithDevices=(...args:DeviceSourceArguments)=>beachScene(args[0],args[1],args[2],args[4],args[3],args[6],args[5]);
const yardWithDevices=(...args:DeviceSourceArguments)=>yardScene(args[0],args[1],args[2],args[3],args[4],args[6],args[5]);
const laundromatWithDevices=(...args:DeviceSourceArguments)=>laundromatScene(args[0],args[1],args[2],args[3],args[4],args[5]);
const stacksWithDevices=(...args:DeviceSourceArguments)=>stacksScene(args[0],args[1],args[2],args[3],args[4],args[5]);
const trainWithDevices=(...args:DeviceSourceArguments)=>trainScene(args[0],args[1],args[2],args[3],args[4],args[5]);
const definitions=[
 {id:'downtown',prefix:'downtown',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:downtownContent.validateScene,validateGameplay:downtownContent.validateGameplay,definition:downtownAuthoredScene,definitionWithDevices:downtownWithDevices},
 {id:'harbor',prefix:'harbor',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:harborContent.validateScene,validateGameplay:harborContent.validateGameplay,definition:harborScene},
 {id:'beach',prefix:'beach',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateBeachScene,validateGameplay:validateBeachGameplay,definition:beachAuthoredScene,definitionWithDevices:beachWithDevices},
 {id:'sandbox',prefix:'sandbox',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:sandboxContent.validateScene,validateGameplay:sandboxContent.validateGameplay,definition:sandboxAuthoredScene,definitionWithDevices:sandboxWithDevices},
 {id:'capsule',prefix:'capsule',bindingGroups:['uses','readables','rests','exits'] as const,data:CAPSULE,validateScene:capsuleContent.validateScene,validateGameplay:capsuleContent.validateGameplay,definition:capsuleScene,definitionWithDevices:capsuleWithDevices},
 {id:'yard',prefix:'yard',bindingGroups:['uses','readables','rests','exits'] as const,data:YARD,validateScene:yardContent.validateScene,validateGameplay:yardContent.validateGameplay,definition:yardScene,definitionWithDevices:yardWithDevices},

 {id:'market',prefix:'market',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateMarketScene,validateGameplay:validateMarketGameplay,definition:marketAuthoredScene},
 {id:'stacks',prefix:'stacks',bindingGroups:['uses','readables','rests','exits'] as const,data:STACKS,validateScene:stacksContent.validateScene,validateGameplay:stacksContent.validateGameplay,definition:stacksScene,definitionWithDevices:stacksWithDevices},
 {id:'metro',prefix:'metro',validateScene:metroContent.validateScene,validateGameplay:metroContent.validateGameplay,definition:metroAuthoredScene},
 {id:'galleriaStation',prefix:'galleriaStation',validateScene:galleriaStationContent.validateScene,validateGameplay:galleriaStationContent.validateGameplay,definition:galleriaStationScene},
 {id:'harborStation',prefix:'harborStation',validateScene:harborStationContent.validateScene,validateGameplay:harborStationContent.validateGameplay,definition:harborStationScene},
 {id:'train',prefix:'train',validateScene:trainContent.validateScene,validateGameplay:trainContent.validateGameplay,definition:trainScene,definitionWithDevices:trainWithDevices},

 {id:'mall',prefix:'mall',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateMallScene,validateGameplay:validateMallGameplay,definition:mallScene},
 {id:'manifestDemo',prefix:'demo-manifest',validateScene:validateManifestScene,validateGameplay:validateManifestGameplay,definition:manifestDemoScene},
 {id:'harborShift',prefix:'harbor-shift',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateShiftScene,validateGameplay:validateShiftGameplay,definition:harborShiftScene},
 {id:'laundromat',prefix:'laundromat',bindingGroups:['uses','readables','rests','exits'] as const,data:LAUNDROMAT,validateScene:validateLaundromatScene,validateGameplay:validateLaundromatGameplay,definition:laundromatScene,definitionWithDevices:laundromatWithDevices},
 {id:'demoCounter',prefix:'demo-counter',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='shop')throw new Error('Demo counter identity');return d;},validateGameplay:validateDemoGameplay,definition:demoCounterScene},
 {id:'demoDesk',prefix:'demo-desk',gameplayId:'demo-counter-gameplay',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='library')throw new Error('Demo desk identity');return d;},validateGameplay:validateDemoGameplay,definition:demoDeskScene},
] as const;
/** Folder scenes (engine/gameplay/folder-scene.ts): one generic registration each, no scene code. */
const folderDefinitions=FOLDER_SCENE_IDS.map(id=>({id,prefix:id,
 validateScene:(value:unknown,g:import('../engine/gameplay/types').GameplayDefinition=validateGameplay(FOLDER_BY_ID[id].gameplay),context?:NativeTargetValidationContext)=>{const d=validateSceneDocument(value,g,declaredSceneOptions(value,context));if(d.id!==id)throw new Error('Scene identity is protected');return d;},
 validateGameplay,
 definition:(c?:Composition,state?:Environment['state'],options?:Partial<Environment>,scene?:SceneDocument,gameplay?:import('../engine/gameplay/types').GameplayDefinition)=>folderSceneDefinition(id,FOLDER_BY_ID[id],{composition:c,state,options,scene,gameplay}),
 definitionWithDevices:(c?:Composition,state?:Environment['state'],options?:Partial<Environment>,scene?:SceneDocument,gameplay?:import('../engine/gameplay/types').GameplayDefinition,devices?:unknown,_context?:unknown)=>folderSceneDefinition(id,FOLDER_BY_ID[id],{composition:c,state,options,scene,gameplay,devices}),
}));
export const gameplayScenes=[...definitions,...folderDefinitions].map(s=>({...s,gameplayId:'gameplayId'in s?s.gameplayId:s.prefix+'-gameplay'}));
export const authoredDocumentIds=gameplayScenes.flatMap(s=>[s.prefix+'-scene',s.gameplayId]);
export function gameplayScene(id:string,documents:readonly {id:string;value:unknown}[]=[]){
 const registered=gameplayScenes.find(s=>s.id===id||s.prefix===id||s.prefix+'-scene'===id||s.prefix+'-gameplay'===id);if(registered)return registered;
 const source=documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined,entry=source?.scenes.find(s=>s.scene.id===id||(['composition','scene','gameplay','devices'] as const).some(part=>authoredDocumentId(s.scene.id,part)===id));
 if(!entry)throw new Error('Unsupported authored scene: '+id);
 return {id:entry.scene.id,prefix:authoredDocumentId(entry.scene.id,'composition'),gameplayId:authoredDocumentId(entry.scene.id,'gameplay'),validateGameplay,
 validateScene:(value:unknown,g=entry.gameplay)=>{const d=validateSceneDocument(value,g,{manifest:true,actors:Array.isArray((value as {actors?:unknown})?.actors)});if(d.id!==entry.scene.id)throw new Error('Scene identity is protected');return d;},
 definition:(c:Composition=entry.composition,_state:Environment['state']={},options:Partial<Environment>={},s:SceneDocument=entry.scene,g=entry.gameplay)=>declaredScene(s,c,g,options,entry.devices)};
}
