import {stateRequirement} from '../data/state-requirements';
import {projectSceneState} from '../engine/gameplay/scene-state';
import {validateCompanionModelBindings} from '../engine/gameplay/scene-companion';
import type {EngineNetworkContext} from '../engine/network-context';
import {sandboxDeviceData} from '../scenes/sandbox/composition';
/** Canonical device documents use the existing engine schema, checker and geometry adapters. */
import {KEYRING,NET,type SceneData,type NetData,type KeyItem} from '../data';
import {SCENES,NATIVE_SCENES,type SceneDef} from '../scenes';
import {sceneRuleContract} from '../engine/scene-rule-contract';
import {nativeDeviceData} from '../engine/gameplay/native-bindings';
import {validateDeviceDocument} from '../engine/gameplay/device-source-validation';
import {deviceSourceIdentity} from './device-document-ids';
import {manifestCompositionRows} from '../engine/gameplay/manifest-geometry';
import {projectDeviceBindings} from '../engine/gameplay/device-bindings';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {Composition} from '../art/core/composition';
import {downtownDeviceData} from '../scenes/downtown/composition';
import {beachDeviceData} from '../scenes/beach/composition';
import {trainDeviceData} from '../scenes/train/composition';
const geometry:Record<string,(source:SceneData,doc:Composition,scene?:Pick<SceneDocument,'manifest'>)=>SceneData>={downtown:downtownDeviceData,beach:beachDeviceData,train:trainDeviceData,sandbox:sandboxDeviceData};
export const nativeDeviceSceneIds=Object.values(NATIVE_SCENES).filter(scene=>scene.data?.devices.length).map(scene=>scene.id);
export const deviceSceneIds=Object.keys(NATIVE_SCENES);
export const deviceSourceFile=(scene:string)=>deviceSourceIdentity(scene).file;
export const deviceDocumentId=(scene:string)=>deviceSourceIdentity(scene).devices;
export {deviceSourceIdentity} from './device-document-ids';
export const deviceRules=sceneRuleContract;
export function validateDeviceSource(id:string,value:unknown,scene:SceneDef=SCENES[id as keyof typeof SCENES],net:NetData=NET,keyring:ReadonlyMap<string,KeyItem>=KEYRING):SceneData{
 if(!scene||scene.id!==id)throw Error('Unsupported device source '+id);const rules=deviceRules(scene),data=validateDeviceDocument(id,value,{rules,gameplay:scene.gameplay,network:{net,keyring},dialogue:scene.data?.dialogue});
 const materialized=projectSceneState(data,scene.gameplay??{});
 if(scene.gameplay?.native?.wires!==undefined&&data.cables?.length)throw Error('Starting cables belong to this scene’s shared gameplay source');
 for(const[key,v]of Object.entries(data.tuning??{})){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000000||key.endsWith('Ms')&&v<=0||key.endsWith('PerS')&&v<0||key==='dlvSpeed'&&v<=0||key==='drawerTokens'&&(!Number.isInteger(v)||v<0)||key==='maxRunning'&&(!Number.isInteger(v)||v<1||v>4)||key==='tamperTrace'&&(v<0||v>100))throw Error('Invalid controller tuning '+key);}
 validateCompanionModelBindings(scene,materialized);return data;
}
/** Geometry and dialogue stay with their composition/shared sources; devices drive the real model. */
export function applyDeviceSource(id:string,scene:SceneDef,composition:Composition,value:unknown,network?:EngineNetworkContext,sceneDocument?:Pick<SceneDocument,'manifest'>):SceneDef{
 const data=projectSceneState(validateDeviceSource(id,value,scene,network?.net,network?.keyring),scene.gameplay??{});const apply=(definition:SceneDef):SceneDef=>{const adapter=geometry[id];let projected=adapter?adapter(data,composition,sceneDocument):data;if(sceneDocument)projected=projectDeviceBindings(sceneDocument,manifestCompositionRows(composition),projected,definition.width);projected={...projected,dialogue:definition.data?.dialogue??{}};if(definition.gameplay)projected=nativeDeviceData(projected,definition.gameplay,Object.keys(deviceRules(definition).derived??{}),deviceRules(definition).inputs);return {...definition,data:projected,...(definition.bindWorld?{bindWorld:(services:Parameters<NonNullable<SceneDef['bindWorld']>>[0])=>apply(definition.bindWorld!(services))}:{})};};return apply(scene);
}

export function requiredDeviceNouns(scene:string,device:string){return SCENES[scene]?deviceRules(SCENES[scene]).needs?.devices?.find(r=>r.id===device)?.nouns?.map(n=>n.id)??[]:[];}
export function protectedDevice(scene:string,id:string){return SCENES[scene]?!!deviceRules(SCENES[scene]).needs?.devices?.some(r=>r.id===id):false;}
export function protectedDeviceState(scene:string,id:string){return SCENES[scene]?!!deviceRules(SCENES[scene]).needs?.state?.some(role=>stateRequirement(role).key===id):false;}
