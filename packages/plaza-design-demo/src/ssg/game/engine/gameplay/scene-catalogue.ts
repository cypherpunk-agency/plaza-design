import {projectSceneState,type SceneDeviceSource} from './scene-state';
import {emptyDeviceSource} from '../empty-data';
import type {EngineNetworkContext} from '../network-context';
import {defaultNetworkContext} from '../network-context';
import {validateExitKeyReferences} from '../../world/access';
import {validateDeviceDocument} from './device-source-validation';
import {projectDeviceBindings} from './device-bindings';
import {art,type Composition} from '../../art';
import type {SceneDef} from '../../scenes/kit';
import type {GameplayDefinition} from './types';
import type {SceneDocument} from './scene-document';
import {validateGameplay} from './validation';
import {declaredScene,validateDeclaredScene,validateDeclaredDestinations} from './declared-scene';
export interface AuthoredScene {composition:Composition;scene:SceneDocument;gameplay:GameplayDefinition;devices?:SceneDeviceSource}
export interface SceneCatalogue {version:1;scenes:AuthoredScene[]}
export const authoredDocumentId=(scene:string,part:'composition'|'scene'|'gameplay'|'devices')=>'authored.'+scene+(part==='composition'?'':'-'+part);
const fields=(value:unknown,keys:string[],required=keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).some(k=>!keys.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))throw new Error('Invalid authored scene catalogue fields');};
/** One source owner for creation/removal: public bundles cannot select repository paths. */
export function validateSceneCatalogue(value:unknown,native:Readonly<Record<string,{exits:readonly {id:string}[]}>>={},network?:EngineNetworkContext):SceneCatalogue{
 fields(value,['version','scenes']);const source=value as SceneCatalogue;
 if(source.version!==1||!Array.isArray(source.scenes)||source.scenes.length>32||JSON.stringify(value).length>2*1024*1024)throw new Error('Invalid authored scene catalogue size/version');
 const ids=new Set<string>(),scenes=source.scenes.map(entry=>{fields(entry,['composition','scene','gameplay','devices'],['composition','scene','gameplay']);const gameplay=validateGameplay(entry.gameplay);
  const {scene,composition,rows,width}=validateDeclaredScene(entry.scene,entry.composition,gameplay),id=scene.id;
  if(!/^[a-z][a-z0-9-]{0,47}$/.test(id)||['constructor','prototype','__proto__'].includes(id)||id.startsWith('sequence-')||Object.prototype.hasOwnProperty.call(native,id)||ids.has(id)||composition.scene!==id)throw new Error('Invalid, reserved or duplicate authored scene ID: '+id);
  const devices=validateDeviceDocument(id,entry.devices??emptyDeviceSource(id,scene.name),{gameplay,network});projectDeviceBindings(scene,rows,projectSceneState(devices,gameplay),width);
  ids.add(id);return{composition,scene,gameplay,...(entry.devices!==undefined?{devices}:{})};
 });
 const destinations=Object.fromEntries([...Object.entries(native).map(([id,s])=>[id,s.exits.map(e=>e.id)]),...scenes.map(s=>[s.scene.id,(s.scene.exits??[]).map(e=>e.id)])]);
 const keys=network?.keyring??new Map([...defaultNetworkContext.keyring,...scenes.flatMap(entry=>(entry.devices?.keyring??[]).map(key=>[key.id,key] as const))]);
 for(const entry of scenes){validateDeclaredDestinations(entry.scene,destinations);validateExitKeyReferences(entry.scene,keys);}
 return{version:1,scenes};
}
/** Builds an independent runtime registry; editor sessions never mutate shipping globals. */
export function createSceneRegistry(native:Readonly<Record<string,SceneDef>>,source:unknown,network?:EngineNetworkContext):Record<string,SceneDef>{
 const catalogue=validateSceneCatalogue(source,native,network),registry={...native};
 for(const entry of catalogue.scenes)registry[entry.scene.id]=declaredScene(entry.scene,entry.composition,entry.gameplay,{},entry.devices);
 for(const scene of Object.values(registry))for(const exit of scene.exits){if(!exit.to&&exit.action)continue;const destination=registry[exit.to];if(!destination||exit.at&&!destination.exits.some(e=>e.id===exit.at))throw new Error('Unknown scene exit destination/arrival: '+scene.id+'/'+exit.id+' -> '+exit.to+(exit.at?'/'+exit.at:''));}
 return registry;
}
export function newAuthoredScene(id:string,name:string):AuthoredScene{
 const entry:AuthoredScene={composition:{version:1,scene:id,instances:[{id:'spawn',type:'assembly.group',props:{},placement:{x:120,h:0},order:0,pass:'backdrop'}]},scene:{version:1,id,name,intro:[],uses:[],manifest:{version:1,width:720,spawn:'spawn',uses:{}}},gameplay:{version:1,flags:[],items:[],commands:{},events:[],reactions:[],conversations:{}}};
 // Resolve all artwork defaults through the normal registry, never a separate scene builder.
 art.validate(entry.composition);return entry;
}
