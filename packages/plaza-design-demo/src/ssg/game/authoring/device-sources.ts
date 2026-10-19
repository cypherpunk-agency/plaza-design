import {validateCompanionModelBindings} from '../engine/gameplay/scene-companion';
import type {EngineNetworkContext} from '../engine/network-context';
import {sandboxDeviceData} from '../scenes/sandbox/composition';
import deviceContracts from '../data/device-contracts.json';
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
import {capsuleDeviceData} from '../scenes/capsule/composition';
import {yardDeviceData} from '../scenes/yard/composition';
import {downtownDeviceData} from '../scenes/downtown/composition';
import {mothDeviceData} from '../scenes/moth/composition';
import {beachDeviceData} from '../scenes/beach/composition';
import {laundromatDeviceData} from '../scenes/laundromat/composition';
import {libraryDeviceData} from '../scenes/library/composition';
import {stacksDeviceData} from '../scenes/stacks/composition';
import {trainDeviceData} from '../scenes/train/composition';
const geometry:Record<string,(source:SceneData,doc:Composition)=>SceneData>={capsule:capsuleDeviceData,yard:yardDeviceData,downtown:downtownDeviceData,moth:mothDeviceData,beach:beachDeviceData,laundromat:laundromatDeviceData,library:libraryDeviceData,stacks:stacksDeviceData,train:trainDeviceData,sandbox:sandboxDeviceData};
export const nativeDeviceSceneIds=Object.keys(geometry);
export const deviceSceneIds=Object.keys(NATIVE_SCENES);
export const deviceSourceFile=(scene:string)=>deviceSourceIdentity(scene).file;
export const deviceDocumentId=(scene:string)=>deviceSourceIdentity(scene).devices;
export {deviceSourceIdentity} from './device-document-ids';
export const deviceRules=sceneRuleContract;
export function validateDeviceSource(id:string,value:unknown,scene:SceneDef=SCENES[id as keyof typeof SCENES],net:NetData=NET,keyring:ReadonlyMap<string,KeyItem>=KEYRING):SceneData{
 if(!scene||scene.id!==id)throw Error('Unsupported device source '+id);const rules=deviceRules(scene),data=validateDeviceDocument(id,value,{rules,gameplay:scene.gameplay,network:{net,keyring},dialogue:scene.data?.dialogue,defaultObservations:scene.data?.observations});if(data.observations===undefined&&scene.data?.observations!==undefined)data.observations=structuredClone(scene.data.observations);const baseline=deviceContracts[id as keyof typeof deviceContracts];
 // Existing code/save identities remain required; new ordinary nouns are allowed by the engine checker.
 for(const original of [...(baseline?.devices??[]),...(baseline?.nodes??[])]){const d=[...(data.devices??[]),...(data.nodes??[])].find(d=>d.id===original.id);if(!d)throw Error('Missing bound device '+original.id);for(const noun of original.nouns){const n=d.nouns?.find(n=>n.id===noun.id);if(!n||n.kind!==noun.kind)throw Error('Missing/changed bound noun '+original.id+'.'+noun.id);}}
 for(const[key,v]of Object.entries(baseline?.state??{}))if(!Object.prototype.hasOwnProperty.call(data.state??{},key)||typeof data.state[key]!==v)throw Error('Bound native state type '+key);
 if(scene.gameplay?.native?.wires!==undefined&&data.cables?.length)throw Error('Starting cables belong to this scene’s shared gameplay source');
 for(const[key,v]of Object.entries(data.tuning??{})){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000000||key.endsWith('Ms')&&v<=0||key.endsWith('PerS')&&v<0||key==='dlvSpeed'&&v<=0||key==='drawerTokens'&&(!Number.isInteger(v)||v<0)||key==='maxRunning'&&(!Number.isInteger(v)||v<1||v>4)||key==='tamperTrace'&&(v<0||v>100))throw Error('Invalid controller tuning '+key);}
 validateCompanionModelBindings(scene,data);return data;
}
/** Geometry and dialogue stay with their composition/shared sources; devices drive the real model. */
export function applyDeviceSource(id:string,scene:SceneDef,composition:Composition,value:unknown,network?:EngineNetworkContext,sceneDocument?:Pick<SceneDocument,'manifest'>):SceneDef{
 const data=validateDeviceSource(id,value,scene,network?.net,network?.keyring);const apply=(definition:SceneDef):SceneDef=>{let projected=data;const baseline=deviceContracts[id as keyof typeof deviceContracts],adapter=geometry[id];if(adapter&&baseline){const nativeIds=new Set(baseline.devices.map(d=>d.id)),nodeIds=new Set(baseline.nodes.map(d=>d.id)),native=adapter({...data,devices:data.devices.filter(d=>nativeIds.has(d.id)),...(data.nodes?{nodes:data.nodes.filter(n=>nodeIds.has(n.id))}:{})},composition);projected={...native,devices:data.devices.map(d=>native.devices.find(n=>n.id===d.id)??d),...(data.nodes?{nodes:data.nodes.map(d=>native.nodes?.find(n=>n.id===d.id)??d)}:{})};}if(sceneDocument)projected=projectDeviceBindings(sceneDocument,manifestCompositionRows(composition),projected,definition.width);projected={...projected,dialogue:definition.data?.dialogue??{}};if(definition.gameplay)projected=nativeDeviceData(projected,definition.gameplay,Object.keys(deviceRules(definition).derived??{}));return {...definition,data:projected,...(definition.bindWorld?{bindWorld:(services:Parameters<NonNullable<SceneDef['bindWorld']>>[0])=>apply(definition.bindWorld!(services))}:{})};};return apply(scene);
}

export function requiredDeviceNouns(scene:string,device:string){return deviceContracts[scene as keyof typeof deviceContracts]&&[...deviceContracts[scene as keyof typeof deviceContracts].devices,...deviceContracts[scene as keyof typeof deviceContracts].nodes].find(d=>d.id===device)?.nouns.map(n=>n.id)||[];}

export function protectedDevice(scene:string,id:string){const c=deviceContracts[scene as keyof typeof deviceContracts];return!!c&&[...c.devices,...c.nodes].some(d=>d.id===id);}
export function protectedDeviceState(scene:string,id:string){return Object.prototype.hasOwnProperty.call(deviceContracts[scene as keyof typeof deviceContracts]?.state??{},id);}
