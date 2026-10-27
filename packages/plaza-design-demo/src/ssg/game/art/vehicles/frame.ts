/** A vehicle's moving attachment origin. Physics reads the same source; this piece draws nothing. */
import type {AssetDefinition} from '../core/composition';
import {consistLength,validateVehicle} from '../../world/vehicles';
export const vehicleFrameElement:AssetDefinition={
 type:'vehicle.frame',mobility:()=>true,version:1,label:'Walkable vehicle frame',category:'vehicles',parts:[],role:'group',libraryUse:'reusable',
 fields:{vehicle:{kind:'json',label:'Vehicle definition',default:{id:'shuttle',kind:'shuttle',mover:'shuttle.frame',doors:{mover:'shuttle.doors',open:.9},cars:[{id:'car1',width:160,doors:[{id:'entry',x:80,w:36}],seats:[]}],route:{legs:[{zone:'here',from:{x:0,h:0},to:{x:300,h:0}}]},berths:[{id:'start',zone:'here',x:0,h:0}]},validate:v=>{validateVehicle(v);}}},
 visualFields:{x:{kind:'number',label:'Mover x',default:0},h:{kind:'number',label:'Mover height',default:0},open:{kind:'number',label:'Door openness',default:0,min:0,max:1}},
 bounds:(p,s)=>({x:Number(s.x??0),h:Number(s.h??0)+90,w:consistLength(validateVehicle(p.vehicle)),tall:110}),
 anchors:(_p,s)=>({origin:{x:Number(s.x??0),h:Number(s.h??0),role:'origin'}}),draw(){},
};
