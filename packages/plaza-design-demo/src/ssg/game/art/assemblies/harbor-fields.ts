/** Only controls consumed by a Harbor kernel or its canonical scene adapter are advertised. */
import type {Field,Properties} from '../core/composition';
import {PAL,CH} from '../props/containers';
const number=(label:string,value:number,min=-1e12,max=1e12,unit='world units'):Field=>({kind:'number',label,default:value,min,max,step:1,unit});
const text=(label:string):Field=>({kind:'string',label,default:''});
const choose=(label:string,value:string|number,options:(string|number)[]):Field=>({kind:'select',label,default:value,options});
const index=()=>choose('Crane index',0,[0,1]);
const cargo=():Record<string,Field>=>({width:number('Width',128,1,2000),paint:choose('Container paint',0,PAL.map((_p,i)=>i)),seed:number('Wear seed',0,-1e12,1e12,'seed'),code:text('Container code'),label:text('Container label')});
export function harborFields(type:string):Record<string,Field>{
 if(type==='container')return{...cargo(),height:number('Height',CH,1,2000),cullStack:choose('Parent stack',-1,[-1,0,1,2,3]),cullRegion:choose('Parent visibility region','',['','arch','bonded'])};
 if(type==='craneFrame')return{index:index(),gantry:choose('Gantry','sts1',['sts1','sts2','sts3']),phase:number('Animation phase',0,-1e12,1e12,'radians')};
 if(type==='craneLoad')return{index:index(),...cargo()};
 if(type.startsWith('crane'))return{index:index()};
 if(type==='hutBack'||type==='hutFront')return{width:number('Width',74,1,2000),height:number('Height',72,1,2000)};
 if(type==='fishStall'||type==='teaStall')return{width:number('Width',type==='fishStall'?112:96,40,2000)};
 if(type==='forkliftBody')return{travel:number('Travel distance',0,0,10000)};
 if(type==='rod')return{reach:number('Fishing line reach',70,1,1000)};
 return{};
}
/** Optional native links resize both hut layers; an unbound piece uses its own dimensions. */
export const harborHutFields:Record<string,Field>={hutWidth:number('Linked hut width (0: own)',0,0,2000),hutHeight:number('Linked hut height (0: own)',0,0,2000)};
export function harborHutSize(p:Properties,s:Properties){return{w:Number(s.hutWidth)||Number(p.width??74),h:Number(s.hutHeight)||Number(p.height??72)};}
