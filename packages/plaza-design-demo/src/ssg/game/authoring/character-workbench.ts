/** Read-only character viewer. Native controllers prepare private actors; native artwork paints them. */
import inventory from './inventories/S9.json';
import {prepareCharacter,type Act,type Character,type Look,type PreparedCharacter,type BotLook} from '../runtime/characters';
import {type Bot,drawCharacterFrame} from '../art/characters/appearance';
import {preparedCharacterElement} from '../art/characters/prepared';
import {drawRider,type RiderKind} from '../art/characters/riders';
import {drawPixel,type PixelAppearance,type PixelPose} from '../art/characters/pixel';
import {drawPlayer} from '../art/characters/player';
import {drawDockworker} from '../art/characters/dockworker';
import {gullFlying} from '../art/characters/gull';
import {SPR} from '../art/core/sprites';
import {frameView,placed,type View} from '../art/core/view';
import {DowntownArtwork} from '../art/assemblies/downtown';
import {saltLime} from '../art/assemblies/beach-bar';
import {createLightingFrame} from '../art/atmosphere/lighting';
import {lightAt} from '../world/light';
import {city} from '../world/clock';
import {WorkbenchPlayback,mountWorkbenchPlayback} from './workbench-playback';
import {DEPTH_BANDS,DEPTH_ORDER,depthOf,type DepthBand} from '../art/core/depth';
import {M} from '../art/vehicles/vehicles';

export const characterWorkbenchInventory=inventory;
export interface CharacterWorkbenchConfig {
 family:string;variant:string;action:string;seed:number;facing:1|-1;
 look?:Look;robot?:Partial<Omit<BotLook,'bot'>>;pixelSize?:number;dim?:number;
 minute?:number;day?:number;camera?:number;particles?:boolean;
 /** Lineup: movers step on the spot instead of crossing the stage. */
 inPlace?:boolean;
}
export interface CharacterWorkbenchSnapshot {config:CharacterWorkbenchConfig;time:number;pose?:PreparedCharacter;pixel?:PixelAppearance}
export const defaultCharacterConfig=():CharacterWorkbenchConfig=>({family:'human',variant:'seeded',action:'stand',seed:73,facing:1,pixelSize:3,dim:0,minute:580,day:1,camera:0});
const moving=new Set(['walk','run','sweep','steal','scan','carry','roll','patrol','serve','crawl','hover','follow']);
const has=(list:readonly string[],value:string)=>list.includes(value);
export function validateCharacterWorkbenchConfig(input:CharacterWorkbenchConfig):void{
 const f=inventory.families.find(f=>f.id===input.family);
 if(!f||!has(f.actions,input.action)||!has(f.variants,input.variant))throw new Error('Unsupported character family, variant or action');
 if(!Number.isInteger(input.seed)||input.seed<0||input.seed>1e6||![1,-1].includes(input.facing))throw new Error('Invalid seed/facing');
 if(input.pixelSize!==undefined&&(!Number.isInteger(input.pixelSize)||input.pixelSize<1||input.pixelSize>5))throw new Error('Pixel size must be 1–5');
 if(input.dim!==undefined&&(!Number.isFinite(input.dim)||input.dim<0||input.dim>1))throw new Error('Invalid dimming');
 if(input.minute!==undefined&&(!Number.isFinite(input.minute)||input.minute<0||input.minute>=1440)||input.day!==undefined&&(!Number.isInteger(input.day)||input.day<1)||input.camera!==undefined&&!Number.isFinite(input.camera))throw new Error('Invalid preview environment');
 if(input.look){const l=input.look,a=inventory.humanAppearanceAxes;for(const [key,values] of Object.entries({body:a.body,hair:a.hair,garb:a.garb}))if(l[key as keyof Look]!==undefined&&!has(values,String(l[key as keyof Look])))throw new Error('Unsupported human '+key);if(l.extras?.some(e=>!has(a.extra,e)))throw new Error('Unsupported human extra');for(const key of ['skin','hairCol','top','bottom','acc'] as const)if(l[key]!==undefined&&!/^#[\da-f]{6}$/i.test(l[key]!))throw new Error('Invalid appearance color');}
 if(input.robot){const b=input.robot;if(b.v!==undefined&&![0,1,2].includes(b.v)||b.wear!==undefined&&(!Number.isFinite(b.wear)||b.wear<0||b.wear>1)||b.face!==undefined&&!has(inventory.robotAppearance.faces,b.face))throw new Error('Invalid robot appearance');for(const key of ['paint','trim','screen'] as const)if(b[key]!==undefined&&!/^#[\da-f]{6}$/i.test(b[key]!))throw new Error('Invalid robot color');}
}
export function characterWorkbenchView(config:CharacterWorkbenchConfig,time:number,width=640,height=360):View{
 const lighting=lightAt(config.day??1,config.minute??580,180,null,true),cam=config.camera??0,gy=height-66;
 return{...frameView(time*60,lighting),illumination:createLightingFrame(lighting,[],undefined,640,true),viewW:width,viewH:height,cam,gy,sx:(x,p=1)=>Math.round(x-cam*p),y:h=>gy-h};
}
export function createCharacterWorkbenchSession(){
 const actors=new Map<string,Character>();
 function actor(config:CharacterWorkbenchConfig):Character{
  const key=JSON.stringify({family:config.family,variant:config.variant,action:config.action,seed:config.seed,facing:config.facing,look:config.look,robot:config.robot,pixelSize:config.pixelSize,dim:config.dim,inPlace:config.inPlace});let p=actors.get(key);if(p)return p;
  const family=inventory.families.find(f=>f.id===config.family)!,bot=family.group==='Robots';
  const look=bot?{bot:config.family as Bot,v:Number(config.variant) as 0|1|2,...config.robot}:config.family==='human'?structuredClone(config.look??{}):config.family as Character['look'];
  // On the spot: a two-unit range crossed very slowly keeps the stepping animation without crossing the stage.
  const start=config.inPlace?220:config.facing>0?140:300,end=config.inPlace?220+config.facing*2:config.facing>0?300:140;
  p={seed:config.seed,x:moving.has(config.action)?start:220,act:(config.action==='follow'?'walk':config.action) as Act,look,facing:config.facing,ps:config.pixelSize??3,dim:config.dim??0,...(moving.has(config.action)?{range:[start,end] as [number,number]}:{}),...(config.inPlace&&moving.has(config.action)?{speed:.004}:{})};
  if(config.action==='follow')p.follow={seed:18,x:start,range:[start,end],act:'walk',speed:.32};
  if(config.family==='dockworker')p={seed:7303,x:config.action==='walk'?start:220,act:config.action as Act,facing:config.facing,look:{body:'avg',garb:'hivis',hair:'short',top:'#b77a29',bottom:'#303746'},...(config.action==='walk'?{range:[start,end] as [number,number],...(config.inPlace?{speed:.004}:{})}:{})};
  if(actors.size>=128)actors.clear();actors.set(key,p);return p;
 }
 return{
  prepare(config:CharacterWorkbenchConfig,seconds:number):CharacterWorkbenchSnapshot{
   validateCharacterWorkbenchConfig(config);if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid preview time');
   const family=inventory.families.find(f=>f.id===config.family)!,copy=structuredClone(config),snapshot:CharacterWorkbenchSnapshot={config:copy,time:seconds};
   if(['Humans','Animals','Legacy robots','Robots'].includes(family.group)||config.family==='dockworker')snapshot.pose=city.withSnapshot({day:config.day??1,min:config.minute??580,seed:3},()=>prepareCharacter(actor(config),seconds*60));
   if(config.family==='pixel')snapshot.pixel={x:220,h:0,face:config.facing,pose:config.action as PixelPose,zs:config.particles?[{x:226,h:14,age:18,ch:'prr'}]:[]};
   return snapshot;
  },
  dispose(){actors.clear();}
 };
}
/** Exported for bounded browser comparison against direct native calls. No canvas clearing/UI here. */
export function drawCharacterWorkbenchSnapshot(ctx:CanvasRenderingContext2D,view:View,snapshot:CharacterWorkbenchSnapshot):void{
 const {config:c,time}=snapshot,t=time*60;
 if(snapshot.pose&&c.family!=='dockworker'){
  preparedCharacterElement.draw(ctx,view,{actor:'workbench'},{pose:snapshot.pose as never,clip:null},'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1});return;
 }
 drawSpecialCharacter(ctx,view,snapshot,t);
}
/** Reference path invokes the existing native API directly; it does not use the composition element. */
export function drawNativeCharacterReference(ctx:CanvasRenderingContext2D,view:View,snapshot:CharacterWorkbenchSnapshot):void{
 if(snapshot.pose&&snapshot.config.family!=='dockworker'){const p=snapshot.pose;if(p.visible)drawCharacterFrame(ctx,view,p.character,p.ready,p.pixelSize,p.frame,p.height);return;}
 drawSpecialCharacter(ctx,view,snapshot,snapshot.time*60);
}
function drawSpecialCharacter(ctx:CanvasRenderingContext2D,v:View,s:CharacterWorkbenchSnapshot,t:number){
 const c=s.config,x=220,flip=c.facing<0;
 switch(c.family){
  case'rider':drawRider(ctx,c.variant as RiderKind,v.sx(x),v.y(0),t,{sit:c.action==='sit',flip,ps:c.pixelSize??3,phase:c.seed});break;
  case'pixel':drawPixel(ctx,v.sx,v.y,t,s.pixel!);break;
  case'player':{const sprite=c.action==='walk'?(Math.floor(t/9)%2?SPR.walk:SPR.stand):SPR[c.action as 'stand'|'jump'|'jack'];drawPlayer(ctx,v,sprite,{x,y:0,face:c.facing},c.action==='jack'?{x:x+c.facing*70,y:0,h:80}:undefined,0);break;}
  case'downtown-pedestrian':{const k=new DowntownArtwork();k.set(ctx,v);k.drawPedestrian(x,SPR[c.variant as 'hood'|'hat'|'umbrella'],flip);break;}
  case'downtown-fixer':{const k=new DowntownArtwork();k.set(ctx,v);k.drawFixer(x);break;}
  case'dockworker':drawDockworker(ctx,v,s.pose!,c.facing,c.variant==='empty'?null:c.variant as 'parcel'|'case');break;
  case'lime':placed(ctx,v.sx(x),v.y(0),1,()=>saltLime(ctx,t));break;
  case'flying-gull':gullFlying(ctx,v.sx(x),v.y(90),t,c.facing,c.variant==='robot');break;
  default:throw new Error('Missing native character renderer');
 }
}
export interface CharacterWorkbenchCase {id:string;config:CharacterWorkbenchConfig;time:number}
export function characterWorkbenchCases():CharacterWorkbenchCase[]{
 const cases:CharacterWorkbenchCase[]=[];
 const add=(id:string,config:CharacterWorkbenchConfig)=>{for(const time of inventory.timeSamplesSeconds)for(const facing of inventory.facings)cases.push({id:id+'-t'+time+'-f'+facing,config:{...config,facing:facing as 1|-1},time});};
 for(const family of inventory.families)for(const variant of family.variants)for(const action of family.actions)add(family.id+'-'+variant+'-'+action,{...defaultCharacterConfig(),family:family.id,variant,action});
 for(const [axis,values]of Object.entries(inventory.humanAppearanceAxes))for(const value of values)add('human-'+axis+'-'+value,{...defaultCharacterConfig(),look:axis==='extra'?{extras:[value as NonNullable<Look['extras']>[number]]}:{[axis]:value} as Look});
 for(const [key,value]of Object.entries(inventory.humanColorCases))add('human-color-'+key,{...defaultCharacterConfig(),look:{[key]:value}});
 for(const family of inventory.families.filter(f=>f.group==='Robots')){
  const base={...defaultCharacterConfig(),family:family.id,variant:'0',action:family.actions[0]};
  for(const [key,value]of Object.entries(inventory.robotColorCases))if(key!=='screen'||has(inventory.robotAppearance.screenKinds,family.id))add(family.id+'-color-'+key,{...base,robot:{[key]:value}});
  for(const wear of inventory.robotAppearance.wearRange)add(family.id+'-wear-'+wear,{...base,robot:{wear}});
  if(has(inventory.robotAppearance.faceKinds,family.id))for(const face of inventory.robotAppearance.faces)add(family.id+'-face-'+face,{...base,robot:{face:face as BotLook['face']}});
 }
 return cases;
}
/** Families whose pixel size and dimming follow the depth bands. */
const BANDED=['Humans','Animals','Legacy robots','Robots','Metro riders'];
/** Up to eight of the current choice for the lineup: each variant if the family has several, else eight seeds. */
export function characterLineup(config:CharacterWorkbenchConfig):CharacterWorkbenchConfig[]{
 const family=inventory.families.find(f=>f.id===config.family)!,base={...structuredClone(config),inPlace:true};
 if(family.variants.length>1)return family.variants.slice(0,8).map(variant=>({...base,variant}));
 if(BANDED.includes(family.group))return Array.from({length:8},(_,i)=>({...base,seed:config.seed+i*101}));
 return [base];
}
/** Self-contained sub-screen. No source API, player services, game construction or storage access. */
export function mountCharacterWorkbench(host:HTMLElement):()=>void{
 const session=createCharacterWorkbenchSession();let config=defaultCharacterConfig(),disposed=false,raf=0,mode:'lineup'|'single'='lineup',slots:{x0:number;x1:number;config:CharacterWorkbenchConfig}[]=[];
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const title=el('h2','Character workbench'),note=el('p','The game’s own artwork and animation, read-only. Lineup shows up to eight variants next to the player at true scale, with a metre ruler; click one to open it on its own. Pixel shows a pose snapshot (its hop does not jump); LIME and the fixer always face one way.');note.className='muted';
 const modes=el('div'),controls=el('div'),transportHost=el('div'),canvas=el('canvas'),error=el('p'),details=el('details'),json=el('pre');
 modes.className='segmented';modes.setAttribute('role','group');modes.setAttribute('aria-label','View');modes.style.margin='8px 0';
 canvas.width=960;canvas.height=250;canvas.style.maxWidth='100%';canvas.style.cursor='pointer';canvas.setAttribute('aria-label','Native character preview');error.setAttribute('role','status');
 details.append(el('summary','Details (JSON)'),json);json.style.maxHeight='220px';json.style.overflow='auto';
 host.replaceChildren(title,note,modes,controls,transportHost,canvas,error,details);
 const clock=new WorkbenchPlayback(90,()=>draw()),transport=mountWorkbenchPlayback(transportHost,clock);
 const label=(name:string,input:HTMLElement)=>{const l=el('label');l.style.marginRight='12px';l.append(name+' ',input);controls.append(l);return l;};
 const select=(name:string,values:readonly string[],value:string,change:(value:string)=>void,rebuild=false)=>{const s=el('select');s.setAttribute('aria-label',name);for(const v of values){const o=el('option',v);o.value=v;s.append(o);}s.value=value;s.onchange=()=>{change(s.value);if(rebuild)refresh();draw();};label(name,s);return s;};
 const numeric=(name:string,value:number,min:number,max:number,step:number,change:(value:number)=>void,rebuild=false)=>{const input=el('input');input.type='number';input.value=String(value);input.min=String(min);input.max=String(max);input.step=String(step);input.style.width='80px';input.setAttribute('aria-label',name);input.onchange=()=>{const v=Number(input.value);if(!Number.isFinite(v))return;change(v);if(rebuild)refresh();draw();};label(name,input);};
 /** A colour picker that shows the seeded colour until overridden, with ↺ to go back to it. */
 const colour=(name:string,value:string|undefined,seeded:string|undefined,change:(value:string|undefined)=>void)=>{const input=el('input'),reset=el('button','↺');input.type='color';input.value=value??seeded??'#808080';input.setAttribute('aria-label',name);input.oninput=()=>{change(input.value);draw();};reset.type='button';reset.title='Back to the seeded colour';reset.disabled=value===undefined;reset.onclick=()=>{change(undefined);refresh();draw();};const l=label(name,input);l.append(reset);};
 function setMode(next:'lineup'|'single'){mode=next;for(const b of modes.children)b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode));refresh();draw();}
 for(const [id,text] of [['lineup','Lineup'],['single','Single']] as const){const b=el('button',text);b.type='button';b.dataset.mode=id;b.onclick=()=>setMode(id);modes.append(b);}
 function refresh(){controls.replaceChildren();const family=inventory.families.find(f=>f.id===config.family)!;
  for(const b of modes.children)b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode));
  // Family picker grouped by kind.
  const fam=el('select');fam.setAttribute('aria-label','Family');for(const group of [...new Set(inventory.families.map(f=>f.group))]){const og=el('optgroup');og.label=group;for(const f of inventory.families.filter(f=>f.group===group)){const o=el('option',f.id);o.value=f.id;og.append(o);}fam.append(og);}
  fam.value=config.family;fam.onchange=()=>{const f=inventory.families.find(f=>f.id===fam.value)!;config={...defaultCharacterConfig(),family:fam.value,variant:f.variants[0],action:f.actions[0],pixelSize:config.pixelSize,dim:config.dim};refresh();draw();};label('Family',fam);
  if(mode==='single'||family.variants.length===1)select('Variant',family.variants,config.variant,value=>config.variant=value,true);
  select('Action',family.actions,config.action,value=>config.action=value);
  if(!['lime','downtown-fixer'].includes(config.family))select('Facing',['right','left'],config.facing===1?'right':'left',v=>config.facing=v==='right'?1:-1);
  if(BANDED.includes(family.group)){
   numeric(mode==='lineup'?'First seed':'Seed',config.seed,0,1e6,1,v=>config.seed=Math.round(v),true);
   const depth=depthOf({ps:config.pixelSize,dim:config.dim});
   select('Depth',[...DEPTH_ORDER,'custom'],depth,v=>{if(v!=='custom'){const d=DEPTH_BANDS[v as DepthBand];config.pixelSize=d.ps;config.dim=d.dim;}else config.dim=(config.dim??0)+0.05;},true);
   if(depth==='custom'){numeric('Pixel size',config.pixelSize??3,1,5,1,v=>config.pixelSize=Math.round(v));numeric('Dimming',config.dim??0,0,1,.05,v=>config.dim=v);}
  }
  numeric('City minute',config.minute??580,0,1439,10,v=>config.minute=v);if(mode==='single')numeric('Camera X',config.camera??0,-1000,1000,10,v=>config.camera=v);
  if(config.family==='human'){
   for(const key of ['body','hair','garb'] as const)select(key,['seeded',...inventory.humanAppearanceAxes[key]],String(config.look?.[key]??'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look[key];else(config.look as Record<string,unknown>)[key]=value;},true);
   select('Extra',['seeded','none',...inventory.humanAppearanceAxes.extra],config.look?.extras?.[0]??(config.look?.extras?'none':'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look.extras;else config.look.extras=value==='none'?[]:[value as NonNullable<Look['extras']>[number]];},true);
   if(mode==='single'){const pose=session.prepare(config,clock.effectiveTime()).pose,native=pose?.visible?pose.ready.full:undefined;
    for(const key of ['skin','hairCol','top','bottom','acc'] as const)colour(key,config.look?.[key],native?.[key],v=>{config.look={...config.look};if(v===undefined)delete config.look[key];else config.look[key]=v;});}
  }
  if(family.group==='Robots'){
   const pose=session.prepare(config,clock.effectiveTime()).pose,native=pose?.visible?pose.ready.bot:undefined;
   if(mode==='single')for(const key of ['paint','trim','screen'] as const){if(key==='screen'&&(!has(inventory.robotAppearance.screenKinds,config.family)||['android','valet','marshal'].includes(config.family)&&native?.human))continue;colour(key,config.robot?.[key],native?.[key],v=>{config.robot={...config.robot};if(v===undefined)delete config.robot[key];else config.robot[key]=v;});}
   numeric('Wear',config.robot?.wear??native?.wear??0,0,1,.05,v=>config.robot={...config.robot,wear:v});
   if(has(inventory.robotAppearance.faceKinds,config.family))select('Face',['seeded',...inventory.robotAppearance.faces],config.robot?.face??'seeded',v=>{config.robot={...config.robot};if(v==='seeded')delete config.robot.face;else config.robot.face=v as BotLook['face'];});
  }
  if(config.family==='pixel')select('Particles',['none','captured purr snapshot'],config.particles?'captured purr snapshot':'none',v=>config.particles=v!=='none');
 }
 /** Ground, metre ticks and faint 1 m / 2 m height lines, at the play band's scale. */
 function ruler(ctx:CanvasRenderingContext2D,view:View){
  ctx.fillStyle='#493425';ctx.fillRect(0,view.gy,canvas.width,1);ctx.fillStyle='#6f5a48';ctx.font='10px "IBM Plex Mono", monospace';
  for(let m=0;m*M<canvas.width;m++){const x=Math.round(m*M);ctx.fillRect(x,view.gy+1,1,m%5===0?6:3);if(m%5===0&&m)ctx.fillText(m+' m',x+3,view.gy+14);}
  ctx.fillStyle='rgba(143,162,185,.14)';for(const h of [1,2]){ctx.fillRect(0,Math.round(view.y(h*M)),canvas.width,1);}ctx.fillStyle='rgba(143,162,185,.5)';ctx.fillText('1 m',4,view.y(M)-3);ctx.fillText('2 m',4,view.y(2*M)-3);
 }
 function player(ctx:CanvasRenderingContext2D,view:View,x:number){drawPlayer(ctx,view,SPR.stand,{x,y:0,face:1},undefined,0);ctx.fillStyle='rgba(143,162,185,.6)';ctx.font='10px "IBM Plex Mono", monospace';ctx.fillText('player',x-16,view.gy+26);}
 function draw(){if(disposed)return;transport?.refresh();const ctx=canvas.getContext('2d');if(!ctx)return;try{const t=clock.effectiveTime(),view=characterWorkbenchView(config,t,canvas.width,canvas.height);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#070809';ctx.fillRect(0,0,canvas.width,canvas.height);ruler(ctx,view);
  let shown:CharacterWorkbenchSnapshot;
  if(mode==='lineup'){
   const rows=characterLineup(config),ps=config.pixelSize??3,step=Math.min(100,Math.max(80,Math.round(30*ps))),first=150;slots=[];player(ctx,view,70);
   for(const [i,row] of rows.entries()){const x=first+i*step+step/2;ctx.save();ctx.translate(x-220,0);drawCharacterWorkbenchSnapshot(ctx,view,session.prepare(row,t));ctx.restore();slots.push({x0:x-step/2,x1:x+step/2,config:row});
    ctx.fillStyle='rgba(143,162,185,.55)';ctx.font='10px "IBM Plex Mono", monospace';ctx.fillText(rows.length>1&&row.variant!==config.variant?row.variant:'#'+row.seed,x-18,view.gy+26);}
   shown=session.prepare(rows[0],t);
  }else{player(ctx,view,120);shown=session.prepare(config,t);drawCharacterWorkbenchSnapshot(ctx,view,shown);}
  error.textContent='';const {pose,...rest}=shown;json.textContent=JSON.stringify({...rest,...(pose?{pose:pose.visible?{visible:true,frame:pose.frame,height:pose.height,appearance:pose.ready.full??pose.ready.bot??pose.ready.critter}:{visible:false}}:{})},null,2);}catch(e){error.textContent=e instanceof Error?e.message:String(e);}}
 canvas.onclick=event=>{if(mode!=='lineup')return;const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*canvas.width/r.width,slot=slots.find(s=>x>=s.x0&&x<s.x1);if(!slot)return;config={...slot.config,inPlace:false};setMode('single');};
 const frame=(now:number)=>{if(disposed)return;clock.tick(now);raf=requestAnimationFrame(frame);};
 refresh();draw();raf=requestAnimationFrame(frame);
 return()=>{disposed=true;cancelAnimationFrame(raf);clock.dispose();transport.dispose();session.dispose();host.replaceChildren();};
}
