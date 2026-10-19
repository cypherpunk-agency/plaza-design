import type {SceneData} from '../data/types';
/** The same empty engine source for native and ordinary authored scenes. */
export function emptyData(id:string,name:string):SceneData{return{id,name,state:{},tuning:{},devices:[],cables:[],dialogue:{},goals:[],texts:{}};}

/** Raw editor source has no duplicate scalar defaults. */
export function emptyDeviceSource(id:string,name:string):Omit<SceneData,'state'>{const{state,...source}=emptyData(id,name);return source;}
