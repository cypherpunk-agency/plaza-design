import type {SceneData} from '../../data/types';
import type {SceneModel} from '../model';
/** Read-only inputs to registered camera pictures; state remains owned by the shared game. */
export interface CameraBindings {
 pan?:{state:string;scale:number};
 parcel?:string;
 feed?:{state:string;equals:string};
 loop?:{device:string;noun:string;verb:string};
}
export const cameraBindingRoles=(scene:string):readonly (keyof CameraBindings)[]=>scene==='yard'?['pan','parcel']:scene==='downtown'?['feed','loop']:[];
export function cameraBindingProblems(data:SceneData):string[]{
 const errors:string[]=[],b=data.camera?.bindings;
 if(b===undefined)return errors;
 const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
 if(!object(b)||!cameraBindingRoles(data.id).length||Object.keys(b).some(k=>!cameraBindingRoles(data.id).includes(k as keyof CameraBindings)))return['camera.bindings: registered roles required'];
 const state=(key:unknown,type:string)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(data.state,key)&&typeof data.state[key]===type;
 if(b.pan!==undefined&&(!object(b.pan)||Object.keys(b.pan).sort().join()!=='scale,state'||!state(b.pan.state,'number')||typeof b.pan.scale!=='number'||!Number.isFinite(b.pan.scale)||Math.abs(b.pan.scale)>1000000))errors.push('camera.bindings.pan: numeric state and finite scale required');
 if(b.parcel!==undefined&&!state(b.parcel,'string'))errors.push('camera.bindings.parcel: string state required');
 if(b.feed!==undefined&&(!object(b.feed)||Object.keys(b.feed).sort().join()!=='equals,state'||!state(b.feed.state,'string')||typeof b.feed.equals!=='string'||b.feed.equals.length>2000))errors.push('camera.bindings.feed: string state/comparison required');
 if(b.loop!==undefined){const p=b.loop;if(!object(p)||Object.keys(p).sort().join()!=='device,noun,verb'||![p.device,p.noun,p.verb].every(v=>typeof v==='string')||![...data.devices,...data.nodes??[]].find(d=>d.id===p.device)?.nouns.find(n=>n.id===p.noun)?.verbs?.includes(String(p.verb)))errors.push('camera.bindings.loop: current device/noun/verb required');}
 return errors;
}
export const cameraPan=(m:SceneModel)=>{const b=m.data.camera?.bindings?.pan;return b?Number(m.get(b.state))*b.scale:0;};
export const cameraParcel=(m:SceneModel)=>{const key=m.data.camera?.bindings?.parcel;return key===undefined?undefined:m.get(key);};
export const cameraFeed=(m:SceneModel)=>{const b=m.data.camera?.bindings?.feed;return b!==undefined&&m.get(b.state)===b.equals;};
export function cameraLoop(m:SceneModel){const b=m.data.camera?.bindings?.loop;if(b)m.act(b.device,b.noun,b.verb);}
