import {projectSceneState} from './scene-state';
import {sceneRuleContract} from '../scene-rule-contract';
import type {SceneDef} from '../../scenes/kit';import type {SceneData} from '../../data/types';import type {Composition} from '../../art';import type {SceneDocument} from './scene-document';import {manifestCompositionRows} from './manifest-geometry';import {projectDeviceBindings} from './device-bindings';import {nativeDeviceData} from './native-bindings';import contracts from '../../data/device-contracts.json';
/** Shipping and pending models use the same source data. Native factories supply only their registered geometry. */
export function attachSceneDeviceSource(scene:SceneDef,source:SceneData,composition:Composition,document:SceneDocument):SceneDef{
 if(source.id!==scene.id)throw Error('Native device source identity mismatch');const original=contracts[scene.id as keyof typeof contracts],native=new Set(original?.devices.map(d=>d.id)??[]),base=scene.data;
 let data:SceneData={...structuredClone(source),...(source.observations===undefined&&base?.observations?{observations:structuredClone(base.observations)}:{}),dialogue:base?.dialogue??{},devices:source.devices.map(d=>native.has(d.id)?structuredClone(base?.devices.find(b=>b.id===d.id)??d):structuredClone(d))};
 data=projectSceneState(data,scene.gameplay??{});data=projectDeviceBindings(document,manifestCompositionRows(composition),data,scene.width);if(scene.gameplay)data=nativeDeviceData(data,scene.gameplay,Object.keys(sceneRuleContract(scene).derived??{}));
 return{...scene,data,...(scene.bindWorld?{bindWorld:(services:Parameters<NonNullable<SceneDef['bindWorld']>>[0])=>attachSceneDeviceSource(scene.bindWorld!(services),source,composition,document)}:{})};
}
