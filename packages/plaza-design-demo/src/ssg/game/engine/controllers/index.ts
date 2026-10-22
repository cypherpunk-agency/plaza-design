import {sandboxControllerProblems,type SandboxController} from './sandbox';
import {motionControllerProblems,type StacksController,type DowntownController} from './motion';
import {visualControllerProblems,type VisualController} from './visual';
import {yardControllerProblems,type YardController} from './yard';
import {laundryControllerProblems,type LaundromatController} from './laundromat';
import type {SceneData,DeviceData} from '../../data/types';import {capsuleController,capsuleControllerProblems,type CapsuleController} from './capsule';
export type RegisteredSceneController=CapsuleController|StacksController|DowntownController|VisualController|YardController|LaundromatController|SandboxController;
export function controllerProblems(data:SceneData,nodes?:ReadonlyMap<string,DeviceData>,reads:readonly string[]=[]):string[]{if(data.controller===undefined)return[];if(!data.controller||typeof data.controller!=='object'||Array.isArray(data.controller)||Object.getPrototypeOf(data.controller)!==Object.prototype)return['Invalid registered scene controller'];if(data.controller.kind==='stacks'||data.controller.kind==='downtown')return motionControllerProblems(data,reads);if(data.controller.kind==='sandbox')return sandboxControllerProblems(data,nodes,reads);if(data.controller.kind==='laundromat')return laundryControllerProblems(data);if(data.controller.kind==='yard')return yardControllerProblems(data);if(data.controller.kind==='capsule')return capsuleControllerProblems(data,nodes);if(data.controller.kind==='moth'||data.controller.kind==='beach')return visualControllerProblems(data);return['Unknown registered scene controller'];}

/** Registered simulation actors share their existing validated speaker role; no second name catalogue. */
export function controllerSpeakers(data:SceneData):readonly string[]{return data.controller?.kind==='capsule'?[capsuleController(data).devices.pixel]:[];}
