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

export const characterWorkbenchInventory=inventory;
export interface CharacterWorkbenchConfig {
 family:string;variant:string;action:string;seed:number;facing:1|-1;
 look?:Look;robot?:Partial<Omit<BotLook,'bot'>>;pixelSize?:number;dim?:number;
 minute?:number;day?:number;camera?:number;particles?:boolean;
}
export interface CharacterWorkbenchSnapshot {config:CharacterWorkbenchConfig;time:number;pose?:PreparedCharacter;pixel?:PixelAppearance}
export const defaultCharacterConfig=():CharacterWorkbenchConfig=>({family:'human',variant:'seeded',action:'stand',seed:73,facing:1,pixelSize:3,dim:0,minute:580,day:1,camera:0});
const moving=new Set(['walk','sweep','steal','scan','carry','roll','patrol','serve','crawl','hover','follow']);
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
  const key=JSON.stringify({family:config.family,variant:config.variant,action:config.action,seed:config.seed,facing:config.facing,look:config.look,robot:config.robot,pixelSize:config.pixelSize,dim:config.dim});let p=actors.get(key);if(p)return p;
  const family=inventory.families.find(f=>f.id===config.family)!,bot=family.group==='Robots';
  const look=bot?{bot:config.family as Bot,v:Number(config.variant) as 0|1|2,...config.robot}:config.family==='human'?structuredClone(config.look??{}):config.family as Character['look'];
  const start=config.facing>0?140:300,end=config.facing>0?300:140;
  p={seed:config.seed,x:moving.has(config.action)?start:220,act:(config.action==='follow'?'walk':config.action) as Act,look,facing:config.facing,ps:config.pixelSize??3,dim:config.dim??0,...(moving.has(config.action)?{range:[start,end] as [number,number]}:{})};
  if(config.action==='follow')p.follow={seed:18,x:start,range:[start,end],act:'walk',speed:.32};
  if(config.family==='dockworker')p={seed:7303,x:220,act:config.action as Act,facing:config.facing,look:{body:'avg',garb:'hivis',hair:'short',top:'#b77a29',bottom:'#303746'}};
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
/** Self-contained sub-screen. No source API, player services, game construction or storage access. */
export function mountCharacterWorkbench(host:HTMLElement):()=>void{
 const session=createCharacterWorkbenchSession();let config=defaultCharacterConfig(),disposed=false,raf=0;
 const title=document.createElement('h2');title.textContent='Character workbench';const note=document.createElement('p');note.textContent='Read-only native artwork. Listed actions are supported. Pixel is a supplied pose/particle snapshot (hop does not simulate a jump); its random autonomous controller is not run. LIME/fixer have no native facing control. Dockworker walk preserves the current runtime recipe.';
 const controls=document.createElement('div'),transportHost=document.createElement('div'),canvas=document.createElement('canvas'),details=document.createElement('pre'),error=document.createElement('p');canvas.width=640;canvas.height=360;canvas.style.maxWidth='100%';canvas.setAttribute('aria-label','Native character preview');error.setAttribute('role','status');details.style.maxHeight='220px';details.style.overflow='auto';
 host.replaceChildren(title,note,controls,transportHost,canvas,error,details);
 const clock=new WorkbenchPlayback(90,()=>draw()),transport=mountWorkbenchPlayback(transportHost,clock);
 const label=(name:string,input:HTMLElement)=>{const l=document.createElement('label');l.style.marginRight='12px';l.append(name+' ',input);controls.append(l);};
 const select=(name:string,values:readonly string[],value:string,change:(value:string)=>void)=>{const s=document.createElement('select');s.setAttribute('aria-label',name);for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v;s.append(o);}s.value=value;s.onchange=()=>{change(s.value);draw();};label(name,s);return s;};
 const numeric=(name:string,value:number,min:number,max:number,change:(value:number)=>void)=>{const input=document.createElement('input');input.type='number';input.value=String(value);input.min=String(min);input.max=String(max);input.style.width='80px';input.setAttribute('aria-label',name);input.onchange=()=>{change(Number(input.value));draw();};label(name,input);};
 function refresh(){controls.replaceChildren();const family=inventory.families.find(f=>f.id===config.family)!;
  select('Family',inventory.families.map(f=>f.id),config.family,value=>{const f=inventory.families.find(f=>f.id===value)!;config={...defaultCharacterConfig(),family:value,variant:f.variants[0],action:f.actions[0]};refresh();});
  select('Variant',family.variants,config.variant,value=>config.variant=value);select('Action',family.actions,config.action,value=>config.action=value);
  if(!['lime','downtown-fixer'].includes(config.family))select('Facing',['right','left'],config.facing===1?'right':'left',v=>config.facing=v==='right'?1:-1);
  if(['Humans','Animals','Legacy robots','Robots','Metro riders'].includes(family.group))numeric('Seed / phase',config.seed,0,1e6,v=>config.seed=v);
  numeric('City minute',config.minute??580,0,1439,v=>config.minute=v);numeric('Camera X',config.camera??0,-1000,1000,v=>config.camera=v);
  if(['Humans','Animals','Legacy robots','Robots','Metro riders'].includes(family.group))numeric('Pixel scale',config.pixelSize??3,1,5,v=>config.pixelSize=v);
  if(config.family==='human'){
   for(const key of ['body','hair','garb'] as const)select(key,['seeded',...inventory.humanAppearanceAxes[key]],String(config.look?.[key]??'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look[key];else(config.look as Record<string,unknown>)[key]=value;});
   select('Extra',['seeded','none',...inventory.humanAppearanceAxes.extra],config.look?.extras?.[0]??(config.look?.extras?'none':'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look.extras;else config.look.extras=value==='none'?[]:[value as NonNullable<Look['extras']>[number]];});
   const pose=session.prepare(config,clock.effectiveTime()).pose,native=pose?.visible?pose.ready.full:undefined;
   for(const key of ['skin','hairCol','top','bottom','acc'] as const){const input=document.createElement('input');input.type='color';input.value=config.look?.[key]??native?.[key]??'#b77a29';input.setAttribute('aria-label',key);input.oninput=()=>{config.look={...config.look,[key]:input.value};draw();};label(key,input);}
  }
  if(['Humans','Animals','Legacy robots','Robots'].includes(family.group))numeric('Dimming',config.dim??0,0,1,v=>config.dim=v);
  if(family.group==='Robots'){
   const pose=session.prepare(config,clock.effectiveTime()).pose,native=pose?.visible?pose.ready.bot:undefined;
   for(const key of ['paint','trim','screen'] as const){if(key==='screen'&&(!has(inventory.robotAppearance.screenKinds,config.family)||['android','valet','marshal'].includes(config.family)&&native?.human))continue;const input=document.createElement('input');input.type='color';input.value=config.robot?.[key]??native?.[key]??'#c8641e';input.setAttribute('aria-label',key);input.oninput=()=>{config.robot={...config.robot,[key]:input.value};draw();};label(key,input);}
   numeric('Wear',config.robot?.wear??native?.wear??0,0,1,v=>config.robot={...config.robot,wear:v});
   if(has(inventory.robotAppearance.faceKinds,config.family))select('Face',['seeded',...inventory.robotAppearance.faces],config.robot?.face??'seeded',v=>{config.robot={...config.robot};if(v==='seeded')delete config.robot.face;else config.robot.face=v as BotLook['face'];});
  }
  if(config.family==='pixel')select('Particles',['none','captured purr snapshot'],config.particles?'captured purr snapshot':'none',v=>config.particles=v!=='none');
 }
 function draw(){if(disposed)return;transport?.refresh();const ctx=canvas.getContext('2d');if(!ctx)return;try{const t=clock.effectiveTime(),snapshot=session.prepare(config,t),view=characterWorkbenchView(config,t,canvas.width,canvas.height);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#070809';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#493425';ctx.fillRect(0,view.gy,canvas.width,1);drawCharacterWorkbenchSnapshot(ctx,view,snapshot);error.textContent='';const {pose,...rest}=snapshot;details.textContent=JSON.stringify({...rest,...(pose?{pose:pose.visible?{visible:true,frame:pose.frame,height:pose.height,appearance:pose.ready.full??pose.ready.bot??pose.ready.critter}:{visible:false}}:{})},null,2);}catch(e){error.textContent=e instanceof Error?e.message:String(e);}}
 const frame=(now:number)=>{if(disposed)return;clock.tick(now);raf=requestAnimationFrame(frame);};
 refresh();draw();raf=requestAnimationFrame(frame);
 return()=>{disposed=true;cancelAnimationFrame(raf);clock.dispose();transport.dispose();session.dispose();host.replaceChildren();};
}
