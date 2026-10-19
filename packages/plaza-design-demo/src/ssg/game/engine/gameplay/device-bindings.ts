import type {SceneData} from '../../data/types';import type {Resolved} from '../../art';import type {SceneDocument} from './scene-document';import {resolveManifestPoint} from './manifest-geometry';
/** Existing art supplies a world anchor; native target dimensions remain explicit source data. */
export function projectDeviceBindings(source:Pick<SceneDocument,'manifest'>,rows:readonly Resolved[],data:SceneData,width:number):SceneData{
 const result=structuredClone(data);for(const[id,target]of Object.entries(source.manifest?.devices??{})){const device=result.devices.find(d=>d.id===id);if(!device)throw Error('Device artwork binding has no world device: '+id);if(!device.layout?.spot)throw Error('Device artwork binding requires source spot dimensions: '+id);const point=resolveManifestPoint(rows,target,width,false,true);device.layout.spot={...device.layout.spot,x:point.x,y:point.h};}return result;
}
export function bindDeviceArtwork(source:SceneDocument,id:string,instance:string,anchor='origin',x=0,h=0){if(!source.manifest)throw Error('Scene requires a manifest');(source.manifest.devices??={})[id]={instance,anchor,x,h};}
export function unbindDeviceArtwork(source:SceneDocument,id:string){if(source.manifest?.devices)delete source.manifest.devices[id];}
