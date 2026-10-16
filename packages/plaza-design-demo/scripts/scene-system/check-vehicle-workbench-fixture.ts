/** Real-canvas parity against independently constructed native calls. No Game is mounted. */
import {prepareVehiclePreview,paintVehiclePreview,mountVehicleWorkbench}from'../../src/ssg/game/authoring/vehicle-workbench';
import {VEHICLE_FAMILIES,VEHICLE_MATRIX}from'../../src/ssg/game/authoring/inventories/S10';
import {intendedState,paintVehicleNativeReference}from'./check-vehicle-workbench-reference';
import {ride,lineOpen,platformTrain}from'../../src/ssg/game/world/transport/line';
import {city}from'../../src/ssg/game/world/clock';
import {light}from'../../src/ssg/game/world/light';
import {hereClimate,overrideOf,CLIMATE_IDS}from'../../src/ssg/game/world/weather';
import {trainComposition}from'../../src/ssg/game/scenes/train/composition';
import {harborComposition}from'../../src/ssg/game/scenes/harbor/composition';
export{mountVehicleWorkbench};
export const vehicleCases=VEHICLE_MATRIX;
const storage=(s:Storage)=>Object.fromEntries(Object.keys(s).sort().map(k=>[k,s.getItem(k)]));
function isolatedState(){return JSON.stringify({ride,lineOpen,platforms:['downtown','galleria','harbor'].map(st=>[0,137,600,1100].map(t=>platformTrain(st as 'downtown'|'galleria'|'harbor',t,150))),city:{day:city.day,min:city.min,seed:city.seed,speed:city.speed,pinned:city.pinned},light:light(),climate:hereClimate(),weather:['city',...CLIMATE_IDS].map(c=>overrideOf(c as 'city')),local:storage(localStorage),session:storage(sessionStorage),trainComposition,harborComposition});}
const digest=async(data:Uint8ClampedArray)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
export async function compareVehicleCase(index:number,capture=false){
 const row=vehicleCases[index];if(!row)throw new Error('Unknown frozen vehicle case');const before=isolatedState(),state=intendedState(row),unchanged=JSON.stringify(state),canvases=Array.from({length:3},()=>{const c=document.createElement('canvas');c.width=800;c.height=420;return c;});
 paintVehicleNativeReference(canvases[0].getContext('2d')!,state);
 paintVehiclePreview(canvases[1].getContext('2d')!,prepareVehiclePreview(state));
 // Seek away and back: independent preparation must not carry a procedural history.
 prepareVehiclePreview({...state,time:47.123});
 paintVehiclePreview(canvases[2].getContext('2d')!,prepareVehiclePreview(state));
 const [a,b,c]=canvases.map(c=>c.getContext('2d')!.getImageData(0,0,800,420).data);let differentPixels=0,repeatDifferentPixels=0,nonBackgroundPixels=0,maxChannelDelta=0;
 for(let i=0;i<a.length;i+=4){let different=false,repeat=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]-b[i+k]);different ||= d!==0;repeat ||= b[i+k]!==c[i+k];maxChannelDelta=Math.max(maxChannelDelta,d);}differentPixels+=Number(different);repeatDifferentPixels+=Number(repeat);if(b[i]!==12||b[i+1]!==10||b[i+2]!==18||b[i+3]!==255)nonBackgroundPixels++;}
 const isolation=before===isolatedState()&&unchanged===JSON.stringify(state);if(!isolation)throw new Error('Vehicle preview mutated transport/world/storage/source/input');
 const family=VEHICLE_FAMILIES.find(f=>f.id===row.id)!,supportedControl=family.controls.includes(row.case as any);let controlEffectPixels=0,controlBaseNonBackgroundPixels=0;
 if(supportedControl){const baseCanvas=document.createElement('canvas');baseCanvas.width=800;baseCanvas.height=420;const base=intendedState({...row,case:'default'});if(row.case==='speed')base.route='linear';paintVehiclePreview(baseCanvas.getContext('2d')!,prepareVehiclePreview(base));const raw=baseCanvas.getContext('2d')!.getImageData(0,0,800,420).data;for(let i=0;i<raw.length;i+=4){if(raw[i]!==b[i]||raw[i+1]!==b[i+1]||raw[i+2]!==b[i+2]||raw[i+3]!==b[i+3])controlEffectPixels++;if(raw[i]!==12||raw[i+1]!==10||raw[i+2]!==18||raw[i+3]!==255)controlBaseNonBackgroundPixels++;}}
 const visibleDefault=row.case!=='default'||nonBackgroundPixels>0,visibleSupportedControl=!supportedControl||(nonBackgroundPixels>0&&controlBaseNonBackgroundPixels>0&&controlEffectPixels>0);
 const difference=document.createElement('canvas');difference.width=800;difference.height=420;const d=difference.getContext('2d')!.createImageData(800,420);for(let i=0;i<a.length;i++)d.data[i]=Math.abs(a[i]-b[i]);difference.getContext('2d')!.putImageData(d,0,0);
 return{index,id:row.id,case:row.case,state,differentPixels,repeatDifferentPixels,nonBackgroundPixels,maxChannelDelta,supportedControl,controlEffectPixels,controlBaseNonBackgroundPixels,visibleDefault,visibleSupportedControl,originalHash:await digest(a),candidateHash:await digest(b),isolation,...(capture?{original:canvases[0].toDataURL(),candidate:canvases[1].toDataURL(),diff:difference.toDataURL()}:{})};
}
export async function runVehicleWorkbenchParity(indices=vehicleCases.map((_r,i)=>i),capture=false){const results=[];for(const index of indices)results.push(await compareVehicleCase(index,capture));return{families:VEHICLE_FAMILIES.length,total:results.length,failures:results.filter(r=>r.differentPixels||r.repeatDifferentPixels||!r.isolation||!r.visibleDefault||!r.visibleSupportedControl),results};}
