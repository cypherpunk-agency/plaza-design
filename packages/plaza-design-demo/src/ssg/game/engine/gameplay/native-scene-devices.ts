import {stateRequirementProblems} from '../../data/state-requirements';
import {projectSceneState} from './scene-state';
import {sceneRuleContract} from '../scene-rule-contract';
import type {SceneDef} from '../../scenes/kit';import type {SceneData} from '../../data/types';import type {Composition} from '../../art';import type {SceneDocument} from './scene-document';import {manifestCompositionRows} from './manifest-geometry';import {projectDeviceBindings} from './device-bindings';import {nativeDeviceData} from './native-bindings';
/** Shipping and pending models use the same source data. Native factories supply only their registered geometry. */
export function attachSceneDeviceSource(scene:SceneDef,source:SceneData,composition:Composition,document:SceneDocument):SceneDef{
 if(source.id!==scene.id)throw Error('Native device source identity mismatch');const base=scene.data;
 let data:SceneData={...structuredClone(source),...(source.observations===undefined&&base?.observations?{observations:structuredClone(base.observations)}:{}),dialogue:base?.dialogue??{},devices:source.devices.map(d=>{const device=structuredClone(d),spot=base?.devices.find(b=>b.id===d.id)?.layout?.spot;if(spot&&device.layout?.spot)device.layout.spot=structuredClone(spot);return device;})};
 data=projectSceneState(data,scene.gameplay??{});data=projectDeviceBindings(document,manifestCompositionRows(composition),data,scene.width);if(scene.gameplay)data=nativeDeviceData(data,scene.gameplay,Object.keys(sceneRuleContract(scene).derived??{}),sceneRuleContract(scene).inputs,sceneRuleContract(scene).derivedTypes);
 const problems=stateRequirementProblems(sceneRuleContract(scene).needs?.state??[],data.state,scene.id,scene.gameplay?.state);if(problems.length)throw Error(problems.join('\n'));
 return{...scene,data,...(scene.bindWorld?{bindWorld:(services:Parameters<NonNullable<SceneDef['bindWorld']>>[0])=>attachSceneDeviceSource(scene.bindWorld!(services),source,composition,document)}:{})};
}
