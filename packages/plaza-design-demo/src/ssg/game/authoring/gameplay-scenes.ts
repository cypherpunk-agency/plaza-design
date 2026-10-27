import type {NativeTargetValidationContext} from '../engine/gameplay/native-targets';
import {authoredDocumentId,type SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import {sceneSourceDefinition} from '../engine/gameplay/folder-scene';
import {declaredSceneOptions} from '../engine/gameplay/declared-scene';
import {FOLDER_BY_ID,FOLDER_DIRS} from '../scenes/folder-scenes';
import {FOLDER_SCENE_IDS} from '../scenes';
import {validateGameplay} from '../engine/gameplay/validation';
import {validateSceneDocument,type SceneDocument} from '../engine/gameplay/scene-document';
import type {ChunkDocument,Environment} from '../art';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {EngineNetworkContext} from '../engine/network-context';
import {validateManifestScene,validateManifestGameplay,manifestDemoScene} from '../scenes/demo-manifest';
import {demoCounterScene,demoDeskScene,validateDemoGameplay,validateDemoScene} from '../demo';
export interface SceneBuildRequest {composition:ChunkDocument;scene?:SceneDocument;gameplay:GameplayDefinition;devices?:unknown;state?:Environment['state'];options?:Partial<Environment>;context?:NativeTargetValidationContext;network?:EngineNetworkContext;sharedState?:unknown}
/** Registered source identities and protected demo policies; builds use named source inputs. */
const definitions=[
 {id:'manifestDemo',prefix:'demo-manifest',validateScene:validateManifestScene,validateGameplay:validateManifestGameplay,definition:manifestDemoScene},
 {id:'demoCounter',prefix:'demo-counter',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='shop')throw new Error('Demo counter identity');return d;},validateGameplay:validateDemoGameplay,definition:demoCounterScene},
 {id:'demoDesk',prefix:'demo-desk',gameplayId:'demo-counter-gameplay',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='library')throw new Error('Demo desk identity');return d;},validateGameplay:validateDemoGameplay,definition:demoDeskScene},
] as const;
/** Folder scenes (engine/gameplay/folder-scene.ts): one generic registration each, no scene code. */
const folderDefinitions=FOLDER_SCENE_IDS.map(id=>({id,prefix:FOLDER_DIRS[id]??id,
 validateScene:(value:unknown,g:import('../engine/gameplay/types').GameplayDefinition=validateGameplay(FOLDER_BY_ID[id].gameplay),context?:NativeTargetValidationContext)=>{const d=validateSceneDocument(value,g,declaredSceneOptions(value,context,FOLDER_BY_ID[id].composition));if(d.id!==id)throw new Error('Scene identity is protected');return d;},
 validateGameplay,
 build:(input:SceneBuildRequest)=>sceneSourceDefinition(id,FOLDER_BY_ID[id],{composition:input.composition,state:input.state,options:input.options,scene:input.scene,gameplay:input.gameplay,devices:input.devices,sharedState:input.sharedState,network:input.network,...(input.devices!==undefined&&input.context?.phase!=='assembled'?{deviceCheck:'deferred' as const}:{})}),
}));
const demoDefinitions=definitions.map(({definition,...registration})=>({...registration,build:(input:SceneBuildRequest)=>definition(input.composition,input.state,input.options,input.scene,input.gameplay)}));
export const gameplayScenes=[...demoDefinitions,...folderDefinitions].map(s=>({...s,gameplayId:'gameplayId'in s&&typeof s.gameplayId==='string'?s.gameplayId:s.prefix+'-gameplay'}));
export const authoredDocumentIds=gameplayScenes.flatMap(s=>[s.prefix+'-scene',s.gameplayId]);
export function gameplayScene(id:string,documents:readonly {id:string;value:unknown}[]=[]){
 const registered=gameplayScenes.find(s=>s.id===id||s.prefix===id||s.prefix+'-scene'===id||s.prefix+'-gameplay'===id);if(registered)return registered;
 const source=documents.find(d=>d.id==='authored-scenes')?.value as SceneCatalogue|undefined,entry=source?.scenes.find(s=>s.scene.id===id||(['composition','scene','gameplay','devices'] as const).some(part=>authoredDocumentId(s.scene.id,part)===id));
 if(!entry)throw new Error('Unsupported authored scene: '+id);
 return {id:entry.scene.id,prefix:authoredDocumentId(entry.scene.id,'composition'),gameplayId:authoredDocumentId(entry.scene.id,'gameplay'),validateGameplay,
 validateScene:(value:unknown,g=entry.gameplay)=>{const d=validateSceneDocument(value,g,{manifest:true,actors:Array.isArray((value as {actors?:unknown})?.actors)});if(d.id!==entry.scene.id)throw new Error('Scene identity is protected');return d;},
 build:(input:SceneBuildRequest)=>sceneSourceDefinition(entry.scene.id,entry,{composition:input.composition,scene:input.scene,gameplay:input.gameplay,devices:input.devices,state:input.state,options:input.options,sharedState:input.sharedState,network:input.network})};
}
