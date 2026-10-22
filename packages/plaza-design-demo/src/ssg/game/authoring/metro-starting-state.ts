import {metroStartingStates,validateMetroStart,type MetroStart,type MetroStartingState} from '../world/transport/metro-start';
import type {CityModel,Station} from '../world/city';
import type {MetroSource} from '../world/transport/metro-source';
export {metroStartingStates};
export type {MetroStartingState};
/** A fixture's train start of one named kind, boarded at `station`; every locked stop is closed, as it is until its lock opens. */
export function metroStartingState(kind:MetroStartingState,station:Station,world:CityModel,source:MetroSource):MetroStart{
 return validateMetroStart({version:1,start:kind,station,lineOpen:{downtown:!source.locked.downtown,galleria:!source.locked.galleria,harbor:!source.locked.harbor}},world.LINE);
}
