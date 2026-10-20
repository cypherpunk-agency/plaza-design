/** Explicit input cases for the current vehicle catalogue; no duplicate renderer. */
import type {VehiclePreviewState}from'../../src/ssg/game/authoring/vehicle-workbench';
import {VEHICLE_FAMILIES,VEHICLE_MATRIX}from'../../src/ssg/game/authoring/catalogues/vehicles';
export function intendedState(row:typeof VEHICLE_MATRIX[number]):VehiclePreviewState{
 const f=VEHICLE_FAMILIES.find(f=>f.id===row.id)!;
 const s:VehiclePreviewState={id:row.id,time:row.time,reduced:false,facing:1,speed:30,route:'stationary',cargo:true,passengers:true,doors:1,lights:true,paint:'#8a3a2a',pose:.5,livery:false,seed:41,minute:580,camera:f.camera,panY:0,zoom:1};
 switch(row.case){case'reduced':s.reduced=true;break;case'facing':s.facing=-1;break;case'speed':s.route='linear';s.speed=47;break;case'route':case'route-culling':s.route='linear';break;case'cargo':s.cargo=false;break;case'passengers':s.passengers=false;break;case'doors':s.doors=0;break;case'lights':s.lights=false;break;case'paint':s.paint='#346789';break;case'pose':s.pose=.85;break;case'livery':s.livery=true;break;case'seed':s.seed=127;break;}
 return s;
}
