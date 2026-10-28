import {appearanceChoice,generationCount,generationSeed,shapeLength} from '../core/fields';
import {rectangleControls} from '../core/spatial';
/** One stocked shelf; variations are properties, never a source-scene array index. */
import {shelf,type ShelfSpec} from '../assemblies/construction';
import type {AssetDefinition,Field,Properties} from '../core/composition';
const integer=(label:string,value:number,min:number,max:number):Field=>({kind:'number',label,default:value,min,max,step:1,validate:v=>{if(!Number.isInteger(v))throw Error(label+' must be an integer');}});
const pictures=new Map<string,ShelfSpec>();
function spec(p:Properties){const key=JSON.stringify(p);let value=pictures.get(key);if(!value){value={x:0,w:Number(p.width),h:Number(p.height),rows:Number(p.rows),seed:Number(p.seed),stock:p.stock as ShelfSpec['stock']};if(pictures.size>=1024)pictures.clear();pictures.set(key,value);}return value;}
export const shelfElement:AssetDefinition={type:'furniture.shelf',version:1,label:'Stocked shelf',category:'furniture',libraryUse:'reusable',coordinates:'world',parts:['backdrop'],
 spatial:rectangleControls({width:'width',height:'height'}),
 fields:{width:shapeLength({kind:'number',label:'Width',default:92,min:24,max:1000,step:1}),height:shapeLength({kind:'number',label:'Height',default:112,min:20,max:1000,step:1}),rows:generationCount(integer('Rows',4,1,16)),seed:generationSeed(integer('Stock seed',71,0,1e9)),stock:appearanceChoice({kind:'select',label:'Stock',default:'mixed',options:['snacks','drinks','noodles','cans','household','mixed']})},
 bounds:p=>({x:0,h:Number(p.height)+4,w:Number(p.width),tall:Number(p.height)+4}),
 anchors:p=>({origin:{x:0,h:0,role:'origin'},top:{x:0,h:Number(p.height),role:'surface'}}),
 draw(ctx,v,p,_s,_pass,at){const moved={...v,sx:(x:number,depth?:number)=>v.sx(x+at.x,depth),y:(h:number)=>v.y(h+at.h),gy:v.gy-at.h};shelf(ctx,moved,spec(p));}};
