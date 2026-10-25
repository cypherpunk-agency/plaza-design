import type {SceneData} from '../../data/types';
import type {GameplayDefinition} from './types';
import {stateAddress,stateBinding,stateValue,setStateValue,deleteStateValue} from './state';
import type {StateValues,StateValue} from './types';
/** Raw device source owns devices, tuning and text; scene scalar defaults belong to gameplay.state. */
export type SceneDeviceSource=Omit<SceneData,'state'>;
/** Materialized local view for native rules; never an independent declaration or save owner. */
export function projectSceneState(data:SceneDeviceSource,gameplay:Pick<GameplayDefinition,'state'>):SceneData{
 const state:SceneData['state']={};for(const[id,declaration]of Object.entries(gameplay.state??{}))if(declaration.owner===data.id){const[owner,key]=stateAddress(id);if(owner!==data.id)throw Error('Scene state declaration owner mismatch: '+id);state[key]=declaration.default;}
 return{...data,state};
}
/** A native model's local field names access canonical values directly. The view is never stored
 * inside World state, so serializing it cannot create a second copy at the local address. */
export function sceneStateView(values:StateValues,chunk:string,definition?:Pick<GameplayDefinition,'state'>):Record<string,StateValue>{
 const declarations=Object.entries(definition?.state??{}).filter(([id])=>stateAddress(id)[0]===chunk);
 if(!declarations.some(([,d])=>d.binding))return values[chunk]??={};
 const addresses=new Map(declarations.map(([id])=>[stateAddress(id)[1],stateBinding(id,definition)]));
 const address=(key:string)=>addresses.get(key)??chunk+'.'+key;
 return new Proxy({} as Record<string,StateValue>,{
  get:(_target,key)=>typeof key==='string'?stateValue(values,address(key)):undefined,
  set:(_target,key,value)=>{if(typeof key!=='string')return false;setStateValue(values,address(key),value);return true;},
  deleteProperty:(_target,key)=>{if(typeof key!=='string')return false;deleteStateValue(values,address(key));return true;},
  ownKeys:()=>Array.from(new Set([...Object.keys(values[chunk]??{}),...addresses.keys()])).filter(key=>stateValue(values,address(key))!==undefined),
  getOwnPropertyDescriptor:(_target,key)=>typeof key==='string'&&stateValue(values,address(key))!==undefined?{configurable:true,enumerable:true,writable:true,value:stateValue(values,address(key))}:undefined,
 });
}

