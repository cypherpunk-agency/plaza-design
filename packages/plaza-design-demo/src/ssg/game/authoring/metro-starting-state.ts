import {metroStartingStates,validateMetroStart,type MetroStart,type MetroStartingState} from '../world/transport/metro-start';
import type {CityModel,Station} from '../world/city';
export {metroStartingStates};
export type {MetroStartingState};
/** A fixture's train start of one named kind, boarded at `station`; the harbor stop is closed, as it is until P14. */
export function metroStartingState(kind:MetroStartingState,station:Station,world:CityModel):MetroStart{
 return validateMetroStart({version:1,start:kind,station,lineOpen:{downtown:true,galleria:true,harbor:false}},world.LINE);
}
