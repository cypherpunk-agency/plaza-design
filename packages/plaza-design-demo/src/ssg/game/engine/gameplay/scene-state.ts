import type {SceneData} from '../../data/types';
import type {GameplayDefinition} from './types';
import {stateAddress} from './state';
/** Raw device source owns devices, tuning and text; scene scalar defaults belong to gameplay.state. */
export type SceneDeviceSource=Omit<SceneData,'state'>;
/** Materialized local view for native rules; never an independent declaration or save owner. */
export function projectSceneState(data:SceneDeviceSource,gameplay:Pick<GameplayDefinition,'state'>):SceneData{
 const state:SceneData['state']={};for(const[id,declaration]of Object.entries(gameplay.state??{}))if(declaration.owner===data.id){const[owner,key]=stateAddress(id);if(owner!==data.id)throw Error('Scene state declaration owner mismatch: '+id);state[key]=declaration.default;}
 return{...data,state};
}

