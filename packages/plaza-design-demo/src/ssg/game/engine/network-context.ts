/** Instance-scoped existing network data; never replaces the shipping catalog globally. */
import {NET,KEYRING} from '../data';
import type {NetData,KeyItem,SceneData} from '../data/types';
export interface EngineNetworkContext {net:NetData;keyring:ReadonlyMap<string,KeyItem>}
export const defaultNetworkContext:EngineNetworkContext={net:NET,keyring:KEYRING};
/** Build from the complete prospective native scene registry, excluding shipping catalog remnants. */
export function createNetworkContext(net:NetData,scenes:readonly SceneData[]):EngineNetworkContext{
 return{net:structuredClone(net),keyring:new Map([...net.keyring,...scenes.flatMap(s=>s.keyring??[])].map(k=>[k.id,structuredClone(k)]))};
}
