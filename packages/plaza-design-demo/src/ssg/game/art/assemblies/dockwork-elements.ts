/** The night shift bay as independent authored pieces. All state is resolved before painting. */
import type { Element,Field,Properties,Placement } from '../core/composition';
import { placed,type View } from '../core/view';
import { container } from '../props/containers';
import { drawGantry,GANTRIES } from '../machinery/crane';
import { drawHarborDistance } from '../environment/harbor-distance';
import { box,sign,text,tell,PAPER } from '../core/primitives';
const num=(label:string,value=0):Field=>({kind:'number',label,default:value,min:-1e5,max:1e5,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const bool=(label:string,value=false):Field=>({kind:'boolean',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
const origin={x:0,h:0,role:'origin' as const};
function E(type:string,label:string,fields:Record<string,Field>,draw:Draw,visualFields:Record<string,Field>={}):Element{return{type:'dockwork.'+type,version:1,label,category:'harbor work',coordinates:'world',fields,visualFields,parts:['backdrop'],bounds:p=>({x:-Number(p.width??80)/2,h:Number(p.height??90),w:Number(p.width??80),tall:Number(p.height??90)}),anchors:()=>({origin}),draw(x,v,p,s,_pass,at){const h=at.h,V=h===0?v:{...v,gy:v.gy-h,y:(q:number)=>v.y(q+h)};draw(x,V,p,s,at);}};}
const marker=E('marker','Work task marker',{role:str('Role'),width:num('Width'),height:num('Height')},()=>{});
const raised=(v:View,h:number)=>h===0?v:{...v,gy:v.gy-h,y:(q:number)=>v.y(q+h)};
export const dockworkElements:Element[]=[marker,
 E('distance','Harbor water and horizon',{},(x,v)=>drawHarborDistance(x,v)),
 E('distant-crane','Distant gantry',{parallax:num('Parallax',.6),scale:num('Scale',.75),alpha:num('Alpha',.45)},(x,v,p,_s,at)=>{x.save();x.globalAlpha=n(p,'alpha');placed(x,v.sx(at.x,n(p,'parallax')),v.y(0),n(p,'scale'),()=>drawGantry(x,GANTRIES.sts1,v.t));x.restore();}),
 E('distant-container','Night loading container',{width:num('Width',160),height:num('Height',70),paint:num('Paint',5),seed:num('Seed',501),label:str('Label','NIGHT LOADING')},(x,v,p,_s,at)=>{x.save();x.globalAlpha=.45;container(x,v,at.x,0,{w:n(p,'width'),h:n(p,'height'),p:n(p,'paint'),seed:n(p,'seed'),label:String(p.label)});x.restore();}),
 E('ground','Work bay slab and lane dashes',{width:num('Scene width',1180)},(x,v,p)=>{box(x,0,v.y(0),v.viewW,v.viewH-v.gy,'#242224');box(x,0,v.y(4),v.viewW,4,'#726351');for(let i=0;i<n(p,'width');i+=44)box(x,v.sx(i),v.y(-12),20,2,'#39332e');}),
 E('office','Supervisor office wall',{width:num('Width',88),height:num('Height',91)},(x,v,p,_s,at)=>{box(x,v.sx(at.x)-n(p,'width')/2,v.y(n(p,'height')),n(p,'width'),n(p,'height'),'#242831','#82745b');sign(x,v.t,'SUPERVISOR',v.sx(at.x),v.y(80),PAPER,{size:7});}),
 E('counter','Work counter',{width:num('Width'),height:num('Height'),color:str('Fill'),edge:str('Edge')},(x,v,p,_s,at)=>box(x,v.sx(at.x)-n(p,'width')/2,v.y(n(p,'height')),n(p,'width'),n(p,'height'),String(p.color),String(p.edge))),
 E('task-post','Task sign on post',{label:str('Task label')},(x,v,p,_s,at)=>{box(x,v.sx(at.x)-1,v.y(78),2,78,'#7a6c53');sign(x,v.t,String(p.label),v.sx(at.x),v.y(78),PAPER,{size:7});}),
 E('parcel','Blue pump-seal parcel',{width:num('Width',22),height:num('Height',18)},(x,v,p,s,at)=>{if(s.visible)box(x,v.sx(at.x)-n(p,'width')/2,v.y(n(p,'height')),n(p,'width'),n(p,'height'),'#39678b','#abcde1');},{visible:bool('Parcel present',true)}),
 E('rack','Transport-case rack',{width:num('Width',44),height:num('Height',34)},(x,v,p,_s,at)=>box(x,v.sx(at.x)-n(p,'width')/2,v.y(n(p,'height')),n(p,'width'),n(p,'height'),'#262b30','#a2967a')),
 E('case','Empty transport case',{width:num('Width',26),height:num('Height',14)},(x,v,p,s,at)=>{if(s.visible)box(x,v.sx(at.x)-n(p,'width')/2,v.y(n(p,'height')),n(p,'width'),n(p,'height'),'#77664d','#cab68b');},{visible:bool('Case present')}),
 E('bay','Striped loading position',{},(x,v,_p,_s,at)=>{for(let dx=-32;dx<=32;dx+=8)box(x,v.sx(at.x+dx),v.y(2),4,2,'#e4bd63');text(x,'LOADING BAY',v.sx(at.x),v.y(-20),'#e4bd63',7);}),
 E('trolley','Loading trolley',{},(x,v,_p,s,at)=>{const wx=n(s,'x');for(const dx of[-17,17])box(x,v.sx(wx+dx)-4,v.y(8),8,8,'#15191e','#a29882');box(x,v.sx(wx)-29,v.y(16),58,9,'#656b70','#cec4ae');box(x,v.sx(wx)-29,v.y(40),3,25,'#a9a394');void at;},{x:num('Current trolley position')}),
 E('release','Wheel-clamp release handle',{},(x,v,_p,s,at)=>{box(x,v.sx(at.x)-6,v.y(22),12,22,'#413632','#998a72');box(x,v.sx(at.x)-2,v.y(32),4,12,s.released?'#64ba75':'#df6754');},{released:bool('Clamp released')}),
 E('clamp','Red wheel clamp',{},(x,v,_p,s,at)=>{if(!s.released)box(x,v.sx(n(s,'trolleyX')+at.x-n(s,'restX')+12),v.y(11),17,12,'#a83f32','#e78d69');void at;},{released:bool('Released'),trolleyX:num('Trolley position'),restX:num('Source trolley origin')}),
 E('checkout','Work-tag checkout reader',{},(x,v,_p,s,at)=>{box(x,v.sx(at.x)-24,v.y(59),48,59,'#353c3b','#acb7a1');box(x,v.sx(at.x)-18,v.y(50),36,20,'#131f1c','#99b69e');text(x,s.checked?'PAID':'VERIFIED',v.sx(at.x),v.y(40),'#a5d6a7',6);},{checked:bool('Tag returned')}),
 E('statement','Wage statement',{},(x,v,_p,s,at)=>{if(s.checked){box(x,v.sx(at.x)-14,v.y(38),29,28,'#e0d1aa','#8c7a5e');text(x,'NET 3',v.sx(at.x),v.y(24),'#3d352a',6);}},{checked:bool('Statement available')}),
 E('cue','Task attention glint',{},(x,v,_p,s,at)=>{if(s.visible)tell(x,v.t,v.sx(at.x),v.y(52));},{visible:bool('Task available')}),
 E('complete','Shift complete sign',{},(x,v,_p,s,at)=>{if(s.done)sign(x,v.t,'SHIFT COMPLETE',v.sx(at.x),v.y(114),PAPER,{size:9});},{done:bool('Shift complete')}),
 E('barrier','Work bay end barrier',{},(x,v,_p,_s,at)=>{box(x,v.sx(at.x),v.y(40),4,40,'#9b8461');box(x,v.sx(at.x)-18,v.y(36),40,4,'#bba06d');}),
];
/** Used by external scene adapters when their local datum moves. */
export const dockworkRaisedView=raised;
