/** Typed temporary viewer inputs. These functions dispatch artwork; they do not implement it. */
import * as screens from '../art/signage/screens';
import {drawDepartures,ticker as lineTicker,type DepartureVisual}from'../art/signage/line-departures';
import {neon,sign,tell,notice}from'../art/core/primitives';
import{drawTower,type Tower,type TowerLook,type Skin,type Crown,type Gear,type SignKind}from'../art/architecture/downtown-towers';
import{drawSpire}from'../art/architecture/spire';
import{drawGalleriaDome}from'../art/architecture/galleria-dome';
import{drawRing,ringTraffic}from'../art/architecture/ring-highway';
import{drawViaduct,drawWallPortal,drawTunnelPortal,drawBore}from'../art/architecture/line0';
import{drawGroundSection,drawCanalGlimpse,BOATER}from'../art/architecture/cutaway';
import{drawMetroStairs}from'../art/architecture/metro-stairs';
import{frameView,type View}from'../art/core/view';
import{lightAt}from'../world/light';
import{prepareCharacter}from'../runtime/characters';
import{SIGNAGE_FAMILIES,type SignageFamily}from'./inventories/S11';
export interface SignageState{id:string;variant:string;time:number;minute:number;reduced:boolean;text:string;power:boolean;seed:number;zoom:number;cameraX:number;cameraH:number}
export function signageState(id=SIGNAGE_FAMILIES[0].id):SignageState{const f=signageFamily(id);return{id,variant:f.variants[0],time:0,minute:580,reduced:false,text:'VERIFY TODAY',power:true,seed:41,zoom:1,cameraX:0,cameraH:0};}
export function signageFamily(id:string):SignageFamily{const f=SIGNAGE_FAMILIES.find(f=>f.id===id);if(!f)throw new Error('Unknown signage family '+id);return f;}
export function validateSignageState(input:SignageState){const f=signageFamily(input.id);if(!f.variants.includes(input.variant)||f.unavailable?.[input.variant])throw new Error('Unsupported '+input.id+' variant: '+(f.unavailable?.[input.variant]??input.variant));for(const key of ['time','minute','seed','zoom','cameraX','cameraH'] as const)if(!Number.isFinite(input[key]))throw new Error('Invalid '+key);if(input.time<0||input.time>300||input.minute<0||input.minute>=1440||!Number.isInteger(input.seed)||input.seed<0||input.seed>1000000||input.zoom<.1||input.zoom>8||typeof input.reduced!=='boolean'||typeof input.power!=='boolean'||typeof input.text!=='string'||input.text.length>240)throw new Error('Invalid signage preview state');return{...input};}
export interface PreparedSignage{state:Readonly<SignageState>;family:SignageFamily;view:View;calls:{name:string;inputs:unknown;paint(ctx:CanvasRenderingContext2D):void}[];width:number;height:number}
export function prepareSignage(input:SignageState,width=800,height=420):PreparedSignage{
 const s=validateSignageState(input),f=signageFamily(s.id),t=s.reduced?0:s.time*60,L=lightAt(1,s.minute,90,null),v:View={...frameView(t,L),viewW:width,viewH:height,gy:height-70,sx:x=>x,y:h=>height-70-h},cx=width/2,cy=height/2,variant=s.variant,text=s.text,col='255,136,0',calls:PreparedSignage['calls']=[],call=(name:string,inputs:unknown,paint:PreparedSignage['calls'][number]['paint'])=>calls.push({name,inputs,paint});
 const mount={x:cx,h:170,w:180,tall:80,seed:s.seed,phase:0,mount:(['wall','pole','hang','bracket'].includes(variant)?variant:'wall') as screens.Mounted['mount'],to:240};
 if(s.id.startsWith('screen.')){const id=s.id.split('.')[1];
  switch(id){
   case'ticker':{const a={...mount,text,col,speed:.5};call(id,a,x=>screens.ticker(x,v,a));break;}
   case'adScreen':{const a={...mount,ads:[[text,'SCORE 600+'],['VERIFY TODAY']],period:260};call(id,a,x=>screens.adScreen(x,v,a));break;}
   case'brokenScreen':{const a={...mount,ghost:text};call(id,a,x=>screens.brokenScreen(x,v,a));break;}
   case'camera':{const a={x:cx,h:170,pole:variant==='pole',phase:0};call(id,a,x=>screens.camera(x,v,a));break;}
   case'registryBoard':{const a={...mount,title:'REGISTRY',lines:[text,'ID REQUIRED']};call(id,a,x=>screens.registryBoard(x,v,a));break;}
   case'scoreDisplay':{const a={...mount,name:text,score:712};call(id,a,x=>screens.scoreDisplay(x,v,a));break;}
   case'menuBoard':{const a={...mount,title:text,items:[['SOY','2.10'],['TEA','1.40']] as [string,string][]};call(id,a,x=>screens.menuBoard(x,v,a));break;}
   case'oddsBoard':{const a={...mount,title:text,rows:['7 · 3.1','12 · 2.7']};call(id,a,x=>screens.oddsBoard(x,v,a));break;}
   case'wantedScreen':{const a={...mount,seeds:[s.seed],crimes:[text]};call(id,a,x=>screens.wantedScreen(x,v,a));break;}
   case'lotteryScreen':{const a={...mount,prize:text};call(id,a,x=>screens.lotteryScreen(x,v,a));break;}
   case'wallSign':{const a={x:cx,h:170,text,col,dead:variant==='dead-letter'?2:-1,phase:0};call(id,a,x=>screens.wallSign(x,v,a));break;}
   case'bladeSign':{const a={x:cx,h:170,text,col,dead:variant==='dead-letter'?2:-1,dim:variant==='dim'?.2:1,phase:0};call(id,a,x=>screens.bladeSign(x,v,a));break;}
   case'hangingSign':{const a={x:cx,h:170,text,col,to:240,board:variant==='wood'?'#302218':'#0b0806'};call(id,a,x=>screens.hangingSign(x,v,a));break;}
   case'neonIcon':{const a={x:cx,h:170,icon:variant,col,phase:0};call(id,a,x=>screens.neonIcon(x,v,a));break;}
   case'billboard':{const a={...mount,ads:[[text,'VERIFY NOW']]};call(id,a,x=>screens.billboard(x,v,a));break;}
   case'taped':{const a={x:cx,h:170,text:[text,'ID REQUIRED'],tilt:variant==='tilted'?.15:0};call(id,a,x=>screens.taped(x,v,a));break;}
  }
 }else if(s.id==='line.departures'){const a:DepartureVisual={open:variant!=='closed',station:'DOWNTOWN',destination:text,left:variant==='closing'?60:variant==='boarding'?240:0,due:variant==='due'?300:0,message:variant==='boarding'?'BOARDING':variant==='closing'?'CLOSING':'DUE IN 0:05'};call('drawDepartures',a,x=>drawDepartures(x,v,a,cx,170,240));
 }else if(s.id==='line.ticker'){call('lineTicker',{text,t},x=>lineTicker(x,t,cx-150,cy,300,text));
 }else if(s.id.startsWith('primitive.')){const id=s.id.split('.')[1],phase=variant==='phase'?30:0;call(id,{text,t,phase},x=>{if(id==='neon')neon(x,t,text,cx,cy,col,{size:18,phase});else if(id==='sign')sign(x,t,text,cx,cy,col,{size:18,phase});else if(id==='tell')tell(x,t,cx,cy,phase);else notice(x,t,cx,cy-40,180,80,[text,'ID REQUIRED'],phase);});
 }else if(s.id==='architecture.tower'){
  const [kind,value]=variant.split(':'),tower:Tower={w:140,h:350,seed:s.seed,roof:'none',skin:kind==='skin'?value as Skin:'concrete',crown:kind==='crown'?value as Crown:'flat',gear:kind==='gear'?[value as Gear]:[],signs:kind==='sign'?[{kind:value as SignKind,text,col,h:180}]:[],grime:.35,balconies:false,shop:true,steps:[[.7,.12]]};
  const look:TowerLook={t,still:s.reduced,fill:'#201824',edge:.35,lit:L.lamps,glow:L.lamps,storey:28,clock:true,lighting:L};call('drawTower',{tower,look},x=>drawTower(x,tower,look));
 }else{const id=s.id.split('.')[1],o={t,still:s.reduced};
  switch(id){case'spire':{const a={...o,windows:s.power&&variant!=='dark'?1:0,traffic:variant==='traffic',scale:s.zoom};call('drawSpire',a,x=>drawSpire(x,a));break;}
   case'dome':{const a={lit:s.power&&variant!=='dark'?1:0,label:variant!=='unlabelled'};call('drawGalleriaDome',a,x=>drawGalleriaDome(x,a));break;}
   case'ring':{const a={...o,lamps:s.power&&variant!=='dark',gantries:[0]};call('drawRing',a,x=>drawRing(x,-450,450,a,variant==='traffic'?()=>ringTraffic(x,-450,450,t,s.reduced,a.lamps):undefined));break;}
   case'viaduct':{const a={...o,height:variant==='ramp'?(fx:number)=>120+(fx+300)*.1:undefined};call('drawViaduct',{...o,variant},x=>drawViaduct(x,-300,300,a));break;}
   case'wallPortal':call('drawWallPortal',o,x=>{x.translate(-200,0);drawWallPortal(x,400,o);});break;
   case'tunnelPortal':call('drawTunnelPortal',o,x=>drawTunnelPortal(x,o));break;
   case'bore':{const a={...o,light:s.power?1:0};call('drawBore',a,x=>drawBore(x,-300,300,a));break;}
   case'section':{const a={seed:s.seed,depth:450,piles:[-180,180],clear:variant==='clear-bands'?[[60,140] as [number,number]]:[]};call('drawGroundSection',a,x=>drawGroundSection(x,-300,300,a));break;}
   case'canal':{const a={...o,boatX:300,lighting:L,boatPose:variant==='empty-boat'?{visible:false as const,character:{x:0}}:prepareCharacter(BOATER,t)};call('drawCanalGlimpse',a,x=>{x.translate(-300,0);drawCanalGlimpse(x,600,a);});break;}
   case'stairs':call('drawMetroStairs',{view:v},x=>drawMetroStairs(x,v,cx));break;
  }
 }
 return{state:Object.freeze(s),family:f,view:v,calls,width,height};
}
export function paintSignage(ctx:CanvasRenderingContext2D,p:PreparedSignage){const s=p.state;ctx.save();try{ctx.clearRect(0,0,p.width,p.height);ctx.fillStyle='#0c0a12';ctx.fillRect(0,0,p.width,p.height);ctx.translate(p.width/2,p.height/2);ctx.scale(s.zoom,s.zoom);ctx.translate(-p.width/2-s.cameraX,-p.height/2+s.cameraH);if(s.id.startsWith('architecture.')&&s.id!=='architecture.stairs'){ctx.translate(p.width/2,s.id==='architecture.section'?20:p.height*.9);ctx.scale(.85,.85);if(s.id==='architecture.tower')ctx.translate(-70,0);}for(const call of p.calls)call.paint(ctx);}finally{ctx.restore();}}
