import {degrees} from '../core/fields';
import {semantic} from '../core/fields';
/** Only controls consumed by a Harbor kernel or its canonical scene adapter are advertised. */
import type {Field} from '../core/composition';
import {PAL,CH} from '../props/containers';
const number=(label:string,value:number,min=-1e12,max=1e12,unit='world units'):Field=>({kind:'number',label,default:value,min,max,step:1,unit});
const text=(label:string):Field=>({kind:'string',label,default:''});
const choose=(label:string,value:string|number,options:(string|number)[]):Field=>({kind:'select',label,default:value,options});
const index=()=>semantic(choose('Crane index',0,[0,1]),{"group":"Generation","quantity":"choice","unit":"choice"});
const cargo=():Record<string,Field>=>({width:semantic(number('Width',128,1,2000),{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"}),paletteIndex:semantic(choose('Container paint',0,PAL.map((_p,i)=>i)),{"group":"Appearance","quantity":"choice","unit":"choice"}),seed:semantic(number('Wear seed',0,-1e12,1e12,'seed'),{"group":"Generation","quantity":"seed","unit":"integer"}),code:semantic(text('Container code'),{"group":"Appearance","quantity":"text","unit":"text"}),label:semantic(text('Container label'),{"group":"Appearance","quantity":"text","unit":"text"})});
export function harborFields(type:string):Record<string,Field>{
 if(type==='container')return{...cargo(),height:semantic(number('Height',CH,1,2000),{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"}),cullStack:semantic(choose('Parent stack',-1,[-1,0,1,2,3]),{"group":"Visibility & Drawing","quantity":"choice","unit":"choice"}),cullRegion:semantic(choose('Parent visibility region','',['','arch','bonded']),{"group":"Visibility & Drawing","quantity":"choice","unit":"choice"})};
 if(type==='craneFrame')return{index:index(),gantry:semantic(choose('Gantry','sts1',['sts1','sts2','sts3']),{"group":"Appearance","quantity":"choice","unit":"choice"}),phaseAngle:degrees('Animation phase',0,{group:'Motion',min:-1e12*180/Math.PI,max:1e12*180/Math.PI,step:1})};
 if(type==='craneLoad')return{index:index(),...cargo()};
 if(type.startsWith('crane'))return{index:index()};
 if(type==='hutBack'||type==='hutFront')return{width:semantic({...number('Width',74,1,2000),stateOverride:{state:'hutWidth',space:'world'}},{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"}),height:semantic({...number('Height',72,1,2000),stateOverride:{state:'hutHeight',space:'world'}},{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"})};
 if(type==='fishStall'||type==='teaStall')return{width:semantic(number('Width',type==='fishStall'?112:96,40,2000),{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"})};
 if(type==='forkliftBody')return{travel:semantic(number('Travel distance',0,0,10000),{"group":"Motion","quantity":"length","unit":"world units","space":"local"})};
 if(type==='rod')return{reach:semantic(number('Fishing line reach',70,1,1000),{"group":"Shape / Area","quantity":"length","unit":"world units","space":"local"})};
 return{};
}
/** Optional native links resize both hut layers; an unbound piece uses its own dimensions. */
export const harborHutFields:Record<string,Field>={hutWidth:number('Linked hut width (0: own)',0,0,1e12),hutHeight:number('Linked hut height (0: own)',0,0,1e12)};
