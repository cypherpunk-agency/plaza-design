import type {Value} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {CityModel} from '../city';
import * as defaultCity from '../city';
import type {LineSystem} from './line';
/** Native platform pictures use the same pending world membership as boarding and arrivals. */
export function platformFrame(scene:string,stop:number,view:View,metro:LineSystem,city:CityModel=defaultCity):Record<string,Value>{
 const station=city.stationAt(scene);
 if(!station)return{'transit.train':null,'transit.departure':{open:false,station:'',destination:'',left:0,due:0,message:''},'transit.closed':true};
 const departure=metro.departureVisual(station,view.t);
 return{'transit.train':metro.platformTrainVisual(station,view.t,stop) as unknown as Value,'transit.departure':{...departure,due:Number.isFinite(departure.due)?departure.due:0},'transit.closed':(()=>{const lock=metro.lockOf(station);return !!lock&&!city.lockOpen(lock,view.flags);})()};
}
