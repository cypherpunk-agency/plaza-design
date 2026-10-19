import type {SceneData,DeviceData} from '../../data/types';import {capsuleController,capsuleControllerProblems,type CapsuleController} from './capsule';
export type RegisteredSceneController=CapsuleController;
export function controllerProblems(data:SceneData,nodes?:ReadonlyMap<string,DeviceData>):string[]{if(data.controller===undefined)return data.id==='capsule'?capsuleControllerProblems(data,nodes):[];if(!data.controller||typeof data.controller!=='object'||Array.isArray(data.controller)||Object.getPrototypeOf(data.controller)!==Object.prototype)return['Invalid registered scene controller'];if(data.controller.kind==='capsule')return capsuleControllerProblems(data,nodes);return['Unknown registered scene controller'];}

/** Registered simulation actors share their existing validated speaker role; no second name catalogue. */
export function controllerSpeakers(data:SceneData):readonly string[]{return data.controller?.kind==='capsule'?[capsuleController(data).devices.pixel]:[];}
