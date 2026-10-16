/** Individually editable shop kernels; schedules and lighting are explicit snapshots. */
import {createCornerShopArtwork,type ArtworkInputs} from './corner-shop';
import {shopDefaultLayout} from './shop-layout';
import {lightAt,type Light} from '../../world/light';
import type {Element,Field,Properties,Value,Bounds} from '../core/composition';
import type {View} from '../core/view';
export {shopDefaultLayout};
const num=(label:string,value:number,min=-10000):Field=>({kind:'number',label,default:value,min,max:10000,step:1});
const str=(label:string,value:string):Field=>({kind:'string',label,default:value});
const origin={x:0,h:0,role:'origin' as const};
const rect=(x:number,h:number,w:number,tall:number):Bounds=>({x,h,w,tall});
const empty={visible:false as const,character:{x:0}};
function validateLight(value:Value){const s=value as unknown as Light;const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);if(!s||!['day','min','facing','sunRel','moonRel','daylight','night','low','cover','direct','lamps'].every(k=>finite((s as unknown as Record<string,unknown>)[k]))||typeof s.outdoor!=='boolean'||typeof s.morning!=='boolean'||typeof s.sunCol!=='string'||![s.sun,s.moon].every(b=>b&&finite(b.el)&&finite(b.az)&&typeof b.up==='boolean')||!s.shadow||![s.shadow.len,s.shadow.dx,s.shadow.dy].every(finite)||!finite(s.moon.phase)||!finite(s.moon.lit)||s.w!==null&&(!s.w||!finite(s.w.rain)))throw new Error('Invalid shop lighting snapshot');}
const lightField:Field={kind:'json',label:'Prepared window lighting',default:lightAt(1,0,270,null) as unknown as Value,validate:validateLight};
type Kernel=ReturnType<typeof createCornerShopArtwork>;
type Spec={id:string;method:keyof Kernel;x:number;h:number;bounds:Bounds;fields?:Record<string,Field>;index?:number;part?:'foreground';configure?:(L:ArtworkInputs['L'],p:Properties)=>void};
const width=(label:string,value:number)=>num(label,value,1);
const room=(L:ArtworkInputs['L'],p:Properties)=>{L.width=Number(p.width);L.ceil=Number(p.ceiling);};
const specs:Spec[]=[
{id:'clear',method:'clear',x:0,h:0,bounds:rect(0,160,900,160)},
{id:'wall',method:'wall',x:0,h:0,bounds:rect(0,160,900,160),fields:{width:width('Width',900),ceiling:width('Ceiling',160)},configure:room},
{id:'upstairs-slab',method:'upstairsSlab',x:0,h:170,bounds:rect(0,0,900,10)},
...Array.from({length:8},(_,index):Spec=>({id:'upstairs-room-'+index,method:'upstairsRoom',index,x:0,h:170+index*86,bounds:rect(0,86,900,86),fields:{width:width('Width',900),height:width('Room height',76)},configure:(L,p)=>{L.width=Number(p.width);L.storey=Number(p.height);}})),
{id:'upstairs-pipes',method:'upstairsPipes',x:0,h:0,bounds:rect(0,858,900,698)},
{id:'wall-edges',method:'wall_edges',x:0,h:0,bounds:rect(0,160,900,160)},
...shopDefaultLayout.tubes.map((x,index):Spec=>({id:'tube-'+index,method:'tubes',x,h:158,index,bounds:rect(-110,0,220,158)})),
{id:'window-back',method:'window_back',x:70,h:34,bounds:rect(0,82,80,82),fields:{width:width('Width',80),height:width('Height',82)},configure:(L,p)=>{L.window.w=Number(p.width);L.window.h1=L.window.h0+Number(p.height);}},
{id:'window-front',method:'window_front',x:70,h:34,bounds:rect(0,82,80,82),fields:{width:width('Width',80),height:width('Height',82)},configure:(L,p)=>{L.window.w=Number(p.width);L.window.h1=L.window.h0+Number(p.height);}},
{id:'door',method:'door',x:32,h:0,bounds:rect(-18,74,36,74)},
{id:'mirror',method:'mirror',x:166,h:140,bounds:rect(-15,12,27,24)},
{id:'ticker',method:'ticker',x:330,h:136,bounds:rect(-145,0,290,10)},
...shopDefaultLayout.shelves.map((s,index):Spec=>({id:'shelf-'+index,method:'shelves',x:s.x,h:0,index,bounds:rect(0,s.h,s.w,s.h),fields:{width:width('Width',s.w),height:width('Height',s.h),rows:num('Rows',s.rows,1),seed:num('Stock seed',s.seed,0),stock:{kind:'select',label:'Stock',default:s.stock!,options:['snacks','drinks','noodles','cans','household','mixed']}},configure:(L,p)=>{Object.assign(L.shelves[index],{w:Number(p.width),h:Number(p.height),rows:Number(p.rows),seed:Number(p.seed),stock:String(p.stock)});}})),
{id:'limit',method:'limit',x:330,h:124,bounds:rect(-26,6,52,12)},
{id:'vending',method:'vending',x:500,h:0,bounds:rect(-50,110,138,110),fields:{width:width('Width',38),height:width('Height',78)},configure:(L,p)=>{L.vend.w=Number(p.width);L.vend.h=Number(p.height);}},
{id:'fridge',method:'fridge',x:556,h:0,bounds:rect(0,98,108,98),fields:{width:width('Width',108),height:width('Height',98),seed:num('Stock seed',5,0),doors:num('Doors',2,1)},configure:(L,p)=>{Object.assign(L.fridge,{w:Number(p.width),h:Number(p.height),seed:Number(p.seed),doors:Number(p.doors)});}},
{id:'advert',method:'advert',x:610,h:116,bounds:rect(-48,44,96,70)},
{id:'lottery',method:'lottery',x:820,h:76,bounds:rect(-40,0,80,36)},
{id:'cash-sign',method:'cash_sign',x:760,h:126,bounds:rect(-30,8,60,16)},
{id:'camera',method:'camera',x:714,h:134,bounds:rect(-14,12,28,24)},
{id:'counter',method:'counter',x:700,h:0,bounds:rect(0,26,170,26),fields:{width:width('Width',170),height:width('Height',26)},configure:(L,p)=>{L.counter.w=Number(p.width);L.counter.h=Number(p.height);}},
{id:'till',method:'till',x:730,h:0,bounds:rect(-12,40,26,14)},
{id:'sweets',method:'sweets',x:756,h:26,bounds:rect(0,12,10,12)},
{id:'counter-label',method:'counter_label',x:836,h:13,bounds:rect(-24,7,48,14)},
{id:'stickers',method:'stickers',x:780,h:14,bounds:rect(0,4,18,10)},
{id:'floor',method:'floor',x:0,h:0,bounds:rect(0,0,900,60),fields:{width:width('Width',900)},configure:(L,p)=>{L.width=Number(p.width);}},
{id:'reflection',method:'reflection',x:556,h:-1,bounds:rect(0,0,108,10)},
{id:'foreground',method:'drawFront',x:250,h:-56,bounds:rect(0,34,90,34),part:'foreground'}
];
const labels:Record<string,{key:'ticker'|'limit'|'vending'|'cash'|'counter';text:string}>={ticker:{key:'ticker',text:'ID REQUIRED FOR ALL PURCHASES   ·   CASH TRANSACTIONS ARE LOGGED   ·   SHOPLIFTING IS REPORTED TO THE REGISTRY   ·   CURFEW 01:00'},limit:{key:'limit',text:'LIMIT 3'},vending:{key:'vending',text:'THIRST'},'cash-sign':{key:'cash',text:'CASH ONLY'},'counter-label':{key:'counter',text:'NO LOGS'}};
for(const spec of specs)if(labels[spec.id])spec.fields={...spec.fields,text:str('Text',labels[spec.id].text)};
export const shopPieceSpecs=specs;
const kernels=new Map<string,{input:ArtworkInputs;kernel:Kernel}>();
function artwork(spec:Spec,p:Properties,state:Properties){const key=spec.id+JSON.stringify(p);let cached=kernels.get(key);if(!cached){const L=structuredClone(shopDefaultLayout);spec.configure?.(L,p);const input:ArtworkInputs={L,OUTSIDE:[],PEOPLE:[],keeper:empty,lighting:lightField.default as unknown as Light,...(labels[spec.id]?{labels:{[labels[spec.id].key]:String(p.text)}}:{})};cached={input,kernel:createCornerShopArtwork(input)};if(kernels.size>=2048)kernels.clear();kernels.set(key,cached);}cached.input.lighting=(state.lighting??lightField.default) as unknown as Light;return cached.kernel;}
export const shopElements:Element[]=[{type:'shop.marker',version:1,label:'Shop gameplay marker',category:'markers',fields:{role:str('Role','')},parts:[],bounds:()=>rect(-4,4,8,8),anchors:()=>({origin}),draw:()=>{}},...specs.map<Element>(spec=>({type:'shop.'+spec.id,version:1,label:'Shop Â· '+spec.id,category:spec.id.startsWith('upstairs')?'architecture':'Corner Shop',coordinates:'world',fields:spec.fields??{},visualFields:spec.id.startsWith('window')?{lighting:lightField}:undefined,parts:[spec.part??'backdrop'],bounds:p=>({...spec.bounds,...(p.width!==undefined?{w:Number(p.width)}:{}),...(p.height!==undefined?{h:spec.bounds.h===0?0:Number(p.height)+(spec.method==='upstairsRoom'?10:0),tall:Number(p.height)+(spec.method==='upstairsRoom'?10:0)}:{})}),anchors:p=>({origin,...(['counter','shelf-0','shelf-1','shelf-2','fridge'].includes(spec.id)?{top:{x:0,h:Number(p.height??spec.bounds.h),role:'surface' as const}}:{}),...(spec.id==='door'?{entrance:{...origin,role:'entrance' as const}}:{})}),draw(ctx,v,p,s,_pass,at){const k=artwork(spec,p,s);const dx=at.x-spec.x,dh=at.h-(spec.method==='upstairsRoom'?170+(spec.index??0)*(Number(p.height)+10):spec.h);let moved:View=dx===0&&dh===0?v:{...v,sx:(x,parallax)=>v.sx(x+dx,parallax),y:h=>v.y(h+dh),gy:v.gy-dh};if(spec.id==='foreground'&&at.parallax!==1.25){moved={...moved};const native=moved.sx;moved.sx=(x,parallax)=>native(x,parallax===1.25?at.parallax:parallax);}
const method=k[spec.method] as (x:CanvasRenderingContext2D,v:View,index:number)=>void;method(ctx,moved,spec.index??0);}}))];
