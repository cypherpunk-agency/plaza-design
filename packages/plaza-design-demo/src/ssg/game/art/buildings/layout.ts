/** One height-driven floor calculation for kernels, anchors and inspector diagnostics. */
import type {Properties} from '../core/composition';
export function floorLayout(p:Readonly<Properties>,roofHeight=0){
 const height=Number(p.height),floorHeight=Number(p.floorHeight),groundFloorHeight=Number(p.groundFloorHeight),parapetHeight=Number(p.parapetHeight??0);
 const available=height-groundFloorHeight-parapetHeight-roofHeight;
 if(![height,floorHeight,groundFloorHeight,parapetHeight,roofHeight].every(Number.isFinite)||floorHeight<=0||groundFloorHeight<0||parapetHeight<0||available<0)throw Error('Building height must fit its ground floor and roof reservations; floor height must be positive.');
 const floorCount=Math.max(0,Math.floor(available/floorHeight+1e-10)),remainder=Math.max(0,available-floorCount*floorHeight);
 return{height,wallTop:height-roofHeight,floorHeight,groundFloorHeight,floorCount,remainder};
}
export const floorDiagnostics=(roofHeight=0)=>(p:Readonly<Properties>)=>{const s=floorLayout(p,roofHeight);return{floorCount:{label:'Complete upper floors',value:s.floorCount},remainder:{label:'Space below roof',value:s.remainder,unit:'world units'}};};
