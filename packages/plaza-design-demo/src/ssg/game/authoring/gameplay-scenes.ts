import {authoredDocumentId,type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {declaredScene} from '../engine/gameplay/declared-scene';
import {validateGameplay} from '../engine/gameplay/validation';
import {validateSceneDocument,type SceneDocument} from '../engine/gameplay/scene-document';
import type {Composition,Environment} from '../art';
import {CAPSULE,YARD,LIBRARY,LAUNDROMAT,STACKS} from '../data';
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
import {mothScene} from '../scenes/moth';
import {content as mothContent} from '../scenes/moth/scene-document';
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
import {warehouseScene} from '../scenes/warehouse';
import {validateWarehouseScene,validateWarehouseGameplay} from '../scenes/warehouse/scene-document';
import {validateManifestScene,validateManifestGameplay,manifestDemoScene} from '../scenes/demo-manifest';
import {demoCounterScene,demoDeskScene,validateDemoGameplay,validateDemoScene} from '../demo';
/** Explicit migrated-scene registry shared by authoring, protected saves and isolated Play. */
import {validateShiftScene} from '../scenes/harbor-shift/scene-document';
import {validateShiftGameplay} from '../scenes/harbor-shift/gameplay-contract';
import {harborShiftScene} from '../scenes/harbor-shift';
import {shopScene} from '../scenes/shop';
import {validateShopScene,validateShopGameplay} from '../scenes/shop/scene-document';
import {libraryScene} from '../scenes/library';
import {validateLibraryScene,validateLibraryGameplay} from '../scenes/library/scene-document';
import {laundromatScene} from '../scenes/laundromat';
import {validateLaundromatScene,validateLaundromatGameplay} from '../scenes/laundromat/scene-document';
const marketAuthoredScene=(...args:Parameters<typeof warehouseScene>)=>marketScene(args[0],args[1],args[2],args[4],args[3]);
const sandboxAuthoredScene=(...args:Parameters<typeof warehouseScene>)=>sandboxScene(args[0],args[1],args[2],undefined,args[3],args[4]);
const beachAuthoredScene=(...args:Parameters<typeof warehouseScene>)=>beachScene(args[0],args[1],args[2],args[4],args[3]);
const downtownAuthoredScene=(...args:Parameters<typeof warehouseScene>)=>downtownScene(args[0],undefined,args[2],args[3],args[4]);
const definitions=[
 {id:'downtown',prefix:'downtown',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:downtownContent.validateScene,validateGameplay:downtownContent.validateGameplay,definition:downtownAuthoredScene},
 {id:'harbor',prefix:'harbor',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:harborContent.validateScene,validateGameplay:harborContent.validateGameplay,definition:harborScene},
 {id:'beach',prefix:'beach',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateBeachScene,validateGameplay:validateBeachGameplay,definition:beachAuthoredScene},
 {id:'sandbox',prefix:'sandbox',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:sandboxContent.validateScene,validateGameplay:sandboxContent.validateGameplay,definition:sandboxAuthoredScene},
 {id:'capsule',prefix:'capsule',bindingGroups:['uses','readables','rests','exits'] as const,data:CAPSULE,validateScene:capsuleContent.validateScene,validateGameplay:capsuleContent.validateGameplay,definition:capsuleScene},
 {id:'yard',prefix:'yard',bindingGroups:['uses','readables','rests','exits'] as const,data:YARD,validateScene:yardContent.validateScene,validateGameplay:yardContent.validateGameplay,definition:yardScene},
 {id:'moth',prefix:'moth',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:mothContent.validateScene,validateGameplay:mothContent.validateGameplay,definition:mothScene},

 {id:'market',prefix:'market',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateMarketScene,validateGameplay:validateMarketGameplay,definition:marketAuthoredScene},
 {id:'stacks',prefix:'stacks',bindingGroups:['uses','readables','rests','exits'] as const,data:STACKS,validateScene:stacksContent.validateScene,validateGameplay:stacksContent.validateGameplay,definition:stacksScene},
 {id:'metro',prefix:'metro',validateScene:metroContent.validateScene,validateGameplay:metroContent.validateGameplay,definition:metroAuthoredScene},
 {id:'galleriaStation',prefix:'galleriaStation',validateScene:galleriaStationContent.validateScene,validateGameplay:galleriaStationContent.validateGameplay,definition:galleriaStationScene},
 {id:'harborStation',prefix:'harborStation',validateScene:harborStationContent.validateScene,validateGameplay:harborStationContent.validateGameplay,definition:harborStationScene},
 {id:'train',prefix:'train',validateScene:trainContent.validateScene,validateGameplay:trainContent.validateGameplay,definition:trainScene},

 {id:'mall',prefix:'mall',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateMallScene,validateGameplay:validateMallGameplay,definition:mallScene},
 {id:'warehouse',prefix:'warehouse',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateWarehouseScene,validateGameplay:validateWarehouseGameplay,definition:warehouseScene},
 {id:'manifestDemo',prefix:'demo-manifest',validateScene:validateManifestScene,validateGameplay:validateManifestGameplay,definition:manifestDemoScene},
 {id:'harborShift',prefix:'harbor-shift',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateShiftScene,validateGameplay:validateShiftGameplay,definition:harborShiftScene},
 {id:'shop',prefix:'shop',bindingGroups:['uses','readables','rests','exits'] as const,validateScene:validateShopScene,validateGameplay:validateShopGameplay,definition:shopScene},
 {id:'library',prefix:'library',bindingGroups:['uses','readables','rests','exits'] as const,data:LIBRARY,validateScene:validateLibraryScene,validateGameplay:validateLibraryGameplay,definition:libraryScene},
 {id:'laundromat',prefix:'laundromat',bindingGroups:['uses','readables','rests','exits'] as const,data:LAUNDROMAT,validateScene:validateLaundromatScene,validateGameplay:validateLaundromatGameplay,definition:laundromatScene},
 {id:'demoCounter',prefix:'demo-counter',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='shop')throw new Error('Demo counter identity');return d;},validateGameplay:validateDemoGameplay,definition:demoCounterScene},
 {id:'demoDesk',prefix:'demo-desk',gameplayId:'demo-counter-gameplay',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='library')throw new Error('Demo desk identity');return d;},validateGameplay:validateDemoGameplay,definition:demoDeskScene},
] as const;
export const gameplayScenes=definitions.map(s=>({...s,gameplayId:'gameplayId'in s?s.gameplayId:s.prefix+'-gameplay'}));
export const authoredDocumentIds=gameplayScenes.flatMap(s=>[s.prefix+'-scene',s.gameplayId]);
export function gameplayScene(id:string,documents:readonly {id:string;value:unknown}[]=[]){
 const registered=gameplayScenes.find(s=>s.id===id||s.prefix===id||s.prefix+'-scene'===id||s.prefix+'-gameplay'===id);if(registered)return registered;
 const source=documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined,entry=source?.scenes.find(s=>s.scene.id===id||(['composition','scene','gameplay','devices'] as const).some(part=>authoredDocumentId(s.scene.id,part)===id));
 if(!entry)throw new Error('Unsupported authored scene: '+id);
 return {id:entry.scene.id,prefix:authoredDocumentId(entry.scene.id,'composition'),gameplayId:authoredDocumentId(entry.scene.id,'gameplay'),validateGameplay,
 validateScene:(value:unknown,g=entry.gameplay)=>{const d=validateSceneDocument(value,g,{manifest:true});if(d.id!==entry.scene.id)throw new Error('Scene identity is protected');return d;},
 definition:(c:Composition=entry.composition,_state:Environment['state']={},options:Partial<Environment>={},s:SceneDocument=entry.scene,g=entry.gameplay)=>declaredScene(s,c,g,options,entry.devices)};
}
