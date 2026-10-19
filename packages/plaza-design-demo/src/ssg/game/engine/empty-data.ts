import type {SceneData} from '../data/types';
/** The same empty engine source for native and ordinary authored scenes. */
export function emptyData(id:string,name:string):SceneData{return{id,name,state:{},tuning:{},devices:[],cables:[],dialogue:{},goals:[],texts:{}};}
