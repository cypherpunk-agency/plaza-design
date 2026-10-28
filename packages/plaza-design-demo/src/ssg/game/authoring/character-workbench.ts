/** Read-only character viewer. Native controllers prepare private actors; native artwork paints them. */
import {runFrame} from './frame-loop';
import inventory from './catalogues/characters.json';
import {prepareCharacter,type Act,type Character,type Look,type PreparedCharacter,type BotLook} from '../runtime/characters';
import {type Bot,drawCharacterFrame} from '../art/characters/appearance';
import {preparedCharacterElement} from '../art/characters/prepared';
import {drawRider,type RiderKind} from '../art/characters/riders';
import {drawPixel,type PixelAppearance,type PixelPose} from '../art/characters/pixel';
import {drawPlayer} from '../art/characters/player';
import {playerCharacter} from '../runtime/avatars';
import {SHIPPED_PROFILES} from '../runtime/play-profile';
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
import {CROWD_MIXES,crowdMix,sampleCrowd,type CrowdMember} from '../art/characters/crowds';
import {ARCHETYPES,ARCHETYPE_IDS,type ArchetypeId} from '../art/characters/archetypes';
import {peopleStyle,seatedView} from '../art/characters/people-style';
import type {WorkbenchHandle} from './contracts';
import {lookFrom} from '../art/characters/appearance';
import {SEAT_H} from '../art/characters/riders';
import cityData from '../world/city.json';
import {createFrame} from './frame';

export const characterWorkbenchInventory=inventory;
export interface CharacterWorkbenchConfig {
 family:string;variant:string;action:string;seed:number;facing:1|-1;
 look?:Look;robot?:Partial<Omit<BotLook,'bot'>>;pixelSize?:number;dim?:number;
 minute?:number;day?:number;camera?:number;particles?:boolean;
 /** Lineup: movers step on the spot instead of crossing the stage. */
 inPlace?:boolean;
 /** Humans: do the act sitting down (a bench, a train seat), in the people-style seated view. */
 seated?:boolean;
 /** Humans sitting or lying: the seat or bed height over the floor (world units; absent: the kit's own). A bench or cot is drawn at it. */
 seat?:number;
}
export interface CharacterWorkbenchSnapshot {config:CharacterWorkbenchConfig;time:number;pose?:PreparedCharacter;pixel?:PixelAppearance}
export const defaultCharacterConfig=():CharacterWorkbenchConfig=>({family:'human',variant:'seeded',action:'stand',seed:73,facing:1,pixelSize:3,dim:0,minute:580,day:1,camera:0});
const moving=new Set(['walk','run','sweep','steal','scan','carry','roll','patrol','serve','crawl','hover','fly','follow']);
const has=(list:readonly string[],value:string)=>list.includes(value);
export function validateCharacterWorkbenchConfig(input:CharacterWorkbenchConfig):void{
 const f=inventory.families.find(f=>f.id===input.family);
 if(!f||!has(f.actions,input.action)||!has(f.variants,input.variant))throw new Error('Unsupported character family, variant or action');
 if(!Number.isInteger(input.seed)||input.seed<0||input.seed>1e6||![1,-1].includes(input.facing))throw new Error('Invalid seed/facing');
 if(input.pixelSize!==undefined&&(!Number.isInteger(input.pixelSize)||input.pixelSize<1||input.pixelSize>5))throw new Error('Pixel size must be 1–5');
 if(input.dim!==undefined&&(!Number.isFinite(input.dim)||input.dim<0||input.dim>1))throw new Error('Invalid dimming');
 if(input.seat!==undefined&&(!Number.isFinite(input.seat)||input.seat<0||input.seat>120))throw new Error('Seat height must be 0–120');
 if(input.minute!==undefined&&(!Number.isFinite(input.minute)||input.minute<0||input.minute>=1440)||input.day!==undefined&&(!Number.isInteger(input.day)||input.day<1)||input.camera!==undefined&&!Number.isFinite(input.camera))throw new Error('Invalid preview environment');
 if(input.seated!==undefined&&typeof input.seated!=='boolean')throw new Error('Invalid seated flag');
 if(input.look){const l=input.look,a=inventory.humanAppearanceAxes;for(const [key,values] of Object.entries({body:a.body,hair:a.hair,garb:a.garb,facial:a.facial,archetype:a.archetype}))if(l[key as keyof Look]!==undefined&&!has(values,String(l[key as keyof Look])))throw new Error('Unsupported human '+key);if(l.extras?.some(e=>!has(a.extra,e)))throw new Error('Unsupported human extra');for(const key of ['skin','hairCol','top','bottom','acc'] as const)if(l[key]!==undefined&&!/^#[\da-f]{6}$/i.test(l[key]!))throw new Error('Invalid appearance color');}
 if(input.robot){const b=input.robot;if(b.v!==undefined&&![0,1,2].includes(b.v)||b.wear!==undefined&&(!Number.isFinite(b.wear)||b.wear<0||b.wear>1)||b.face!==undefined&&!has(inventory.robotAppearance.faces,b.face))throw new Error('Invalid robot appearance');for(const key of ['paint','trim','screen'] as const)if(b[key]!==undefined&&!/^#[\da-f]{6}$/i.test(b[key]!))throw new Error('Invalid robot color');}
}
export function characterWorkbenchView(config:CharacterWorkbenchConfig,time:number,width=640,height=360):View{
 const lighting=lightAt(config.day??1,config.minute??580,180,null,true),cam=config.camera??0,gy=height-66;
 return{...frameView(time*60,lighting),illumination:createLightingFrame(lighting,[],undefined,640,true),viewW:width,viewH:height,cam,gy,sx:(x,p=1)=>Math.round(x-cam*p),y:h=>gy-h};
}
export function createCharacterWorkbenchSession(){
 const actors=new Map<string,Character>();
 function actor(config:CharacterWorkbenchConfig):Character{
  const key=JSON.stringify({family:config.family,variant:config.variant,action:config.action,seed:config.seed,facing:config.facing,look:config.look,robot:config.robot,pixelSize:config.pixelSize,dim:config.dim,inPlace:config.inPlace,seated:config.seated,seat:config.seat});let p=actors.get(key);if(p)return p;
  const family=inventory.families.find(f=>f.id===config.family)!,bot=family.group==='Robots';
  const look=bot?{bot:config.family as Bot,v:Number(config.variant) as 0|1|2,...config.robot}:config.family==='human'?structuredClone(config.look??{}):config.family as Character['look'];
  // On the spot: a two-unit range crossed very slowly keeps the stepping animation without crossing the stage.
  const start=config.inPlace?220:config.facing>0?140:300,end=config.inPlace?220+config.facing*2:config.facing>0?300:140;
  p={seed:config.seed,x:moving.has(config.action)?start:220,act:(config.action==='follow'?'walk':config.action) as Act,look,facing:config.facing,ps:config.pixelSize??3,dim:config.dim??0,...(moving.has(config.action)?{range:[start,end] as [number,number]}:{}),...(config.inPlace&&moving.has(config.action)?{speed:.004}:{}),...(config.family==='gull'&&config.action==='fly'?{h:60}:{})};
  if(config.action==='follow')p.follow={seed:18,x:start,range:[start,end],act:'walk',speed:.32};
  if(config.seated&&config.family==='human')p.seated=true;
  if(config.seat&&config.family==='human')p.seat=config.seat;
  if(config.family==='dockworker')p={...playerCharacter(SHIPPED_PROFILES.profiles.find(q=>q.id==='harborShift')!.player,config.variant==='empty'?null:config.variant as 'parcel'|'case'),x:config.action==='walk'?start:220,act:config.action as Act,facing:config.facing,...(config.action==='walk'?{range:[start,end] as [number,number],...(config.inPlace?{speed:.004}:{})}:{})};
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
 const {time}=snapshot,t=time*60;
 if(snapshot.pose){
  preparedCharacterElement.draw(ctx,view,{actor:'workbench'},{pose:snapshot.pose as never,clip:null},'backdrop',{x:0,h:0,scale:1,facing:1,parallax:1});return;
 }
 drawSpecialCharacter(ctx,view,snapshot,t);
}
/** Reference path invokes the existing native API directly; it does not use the composition element. */
export function drawNativeCharacterReference(ctx:CanvasRenderingContext2D,view:View,snapshot:CharacterWorkbenchSnapshot):void{
 if(snapshot.pose){const p=snapshot.pose;if(p.visible)drawCharacterFrame(ctx,view,p.character,p.ready,p.pixelSize,p.frame,p.height);return;}
 drawSpecialCharacter(ctx,view,snapshot,snapshot.time*60);
}
function drawSpecialCharacter(ctx:CanvasRenderingContext2D,v:View,s:CharacterWorkbenchSnapshot,t:number){
 const c=s.config,x=220,flip=c.facing<0;
 switch(c.family){
  case'rider':drawRider(ctx,c.variant as RiderKind,v.sx(x),v.y(0),t,{sit:c.action==='sit',flip,ps:c.pixelSize??3,phase:c.seed});break;
  case'pixel':drawPixel(ctx,v.sx,v.y,t,s.pixel!);break;
  case'player':{const sprite=c.action==='walk'?(Math.floor(t/9)%2?SPR.walk:SPR.stand):SPR[c.action as 'stand'|'jump'|'jack'];drawPlayer(ctx,v,sprite,{x,y:0,face:c.facing},c.action==='jack'?{x:x+c.facing*70,y:0,h:80}:undefined,0);break;}
  case'downtown-pedestrian':{const k=new DowntownArtwork();k.set(ctx,v);k.drawPedestrian(x,c.variant as 'hood'|'hat'|'umbrella',flip);break;}
  case'downtown-fixer':{const k=new DowntownArtwork();k.set(ctx,v);k.drawFixer(x);break;}
  case'lime':placed(ctx,v.sx(x),v.y(0),1,()=>saltLime(ctx,t));break;
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
/** Crowd view: a district's mix across three depth rows (back, play, near), sized like the game draws them. */
export const CROWD_ROWS=[{band:'back' as DepthBand,count:7,dy:-22,x0:90,step:125},{band:'play' as DepthBand,count:6,dy:0,x0:180,step:130},{band:'near' as DepthBand,count:2,dy:34,x0:30,step:880}];
export function crowdLineup(district:string,seed:number,minute:number,kitted?:number):{row:number;x:number;member:CrowdMember;config:CharacterWorkbenchConfig}[]{
 const mix=crowdMix(district)??CROWD_MIXES[0],count=CROWD_ROWS.reduce((n,r)=>n+r.count,0);
 const members=sampleCrowd(mix,seed,count,family=>inventory.families.find(f=>f.id===family)?.actions??['stand'],kitted);
 const out:{row:number;x:number;member:CrowdMember;config:CharacterWorkbenchConfig}[]=[];let i=0;
 for(const [row,r] of CROWD_ROWS.entries())for(let k=0;k<r.count;k++){const member=members[i++],band=DEPTH_BANDS[r.band],base={...defaultCharacterConfig(),seed:member.seed,facing:member.facing,pixelSize:band.ps,dim:band.dim,minute,inPlace:true};
  let config:CharacterWorkbenchConfig;
  if(member.kind==='person')config={...base,family:'human',variant:'seeded',action:member.act,look:member.look};
  else{const family=inventory.families.find(f=>f.id===member.family)!;config={...base,family:member.family,variant:has(family.variants,member.variant)?member.variant:family.variants[0],action:has(family.actions,member.act)?member.act:family.actions[0]};}
  out.push({row,x:r.x0+k*r.step,member,config});}
 return out;
}
/** Archetypes view: one row per named look, a few seeds standing (doing their usual act) and one seated on a bench. */
export const ARCHETYPE_GRID={columns:2,standing:3,rowHeight:72,top:20,colWidth:480,label:118,step:84};
export function archetypeLineup(seed:number,minute:number):{id:ArchetypeId;col:number;row:number;cell:number;config:CharacterWorkbenchConfig}[]{
 const humans=inventory.families.find(f=>f.id==='human')!,perCol=Math.ceil(ARCHETYPE_IDS.length/ARCHETYPE_GRID.columns),out:{id:ArchetypeId;col:number;row:number;cell:number;config:CharacterWorkbenchConfig}[]=[];
 ARCHETYPE_IDS.forEach((id,i)=>{const A=ARCHETYPES[id],act=has(humans.actions,A.act)?A.act:'stand',col=Math.floor(i/perCol),row=i%perCol;
  for(let k=0;k<=ARCHETYPE_GRID.standing;k++){const seated=k===ARCHETYPE_GRID.standing;
   out.push({id,col,row,cell:k,config:{...defaultCharacterConfig(),family:'human',variant:'seeded',seed:seed+k*101+i*7,minute,inPlace:true,look:{archetype:id},
    action:seated?(['read','phone','doze'].includes(act)?act:'stand'):act,facing:k%2?-1:1,...(seated?{seated:true}:{})}});}
 });
 return out;
}
/** Variety check: thirty people from a district's mix (no robots), and which of them are near-duplicates (same named look and main colours). */
export function varietySample(district:string,seed:number,minute:number,kitted?:number){
 const mix=crowdMix(district)??CROWD_MIXES[0],members=sampleCrowd(mix,seed,30,()=>['stand'],kitted,0);
 const rows=members.map(m=>{const person=m as Extract<CrowdMember,{kind:'person'}>,full=lookFrom(person.seed,person.look);
  return{member:person,key:[full.archetype??'-',full.top,full.bottom].join('|'),config:{...defaultCharacterConfig(),family:'human',variant:'seeded',seed:person.seed,facing:person.facing,minute,inPlace:true,look:person.look,action:has(inventory.families.find(f=>f.id==='human')!.actions,person.act)?person.act:'stand'} as CharacterWorkbenchConfig};});
 const groups=new Map<string,number[]>();rows.forEach((r,i)=>groups.set(r.key,[...(groups.get(r.key)??[]),i]));
 const dupes=[...groups.values()].filter(g=>g.length>1);
 return{rows,dupes,looks:new Set(rows.map(r=>r.member.look.archetype)).size,kitted:rows.filter(r=>r.member.kitted).length};
}
/** Self-contained sub-screen. No source API, player services, game construction or storage access. */
type WorkbenchMode='lineup'|'single'|'crowd'|'archetypes';
/** `people`: mounts the saved People settings (Library › Characters) into the inspector. */
export function mountCharacterWorkbench(host:HTMLElement,options:{people?(host:HTMLElement):WorkbenchHandle}={}):WorkbenchHandle{
 const session=createCharacterWorkbenchSession();let config=defaultCharacterConfig(),disposed=false,raf=0,mode:WorkbenchMode='lineup',slots:{x0:number;x1:number;y0?:number;y1?:number;config:CharacterWorkbenchConfig}[]=[];
 const crowd={district:'downtown',seed:1,kitted:undefined as number|undefined,show30:false},grid={seed:11};
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const title=el('h2','Character workbench'),note=el('p','The game’s own artwork and animation. Lineup shows up to eight variants next to the player at true scale, with a metre ruler; click one to open it on its own. People mix shows a district’s mix of plain people, kitted people and robots in the back, play and near rows; Show 30 samples thirty of its people and marks near-duplicates. Archetypes shows every named look, a few seeds standing and one seated. People settings below are saved: the game’s default colour style and seated pose, and each district’s people mix.');note.className='muted';
 const legend=el('p'),modes=el('div'),controls=el('div'),transportHost=el('div'),canvas=el('canvas'),error=el('p'),details=el('details'),json=el('pre');
 modes.className='segmented';modes.setAttribute('role','group');modes.setAttribute('aria-label','View');modes.style.margin='8px 0';
 canvas.width=960;canvas.height=250;canvas.style.maxWidth='100%';canvas.style.cursor='pointer';canvas.setAttribute('aria-label','Native character preview');error.setAttribute('role','status');
 details.append(el('summary','Details (JSON)'),json);json.style.maxHeight='220px';json.style.overflow='auto';
 legend.className='muted';legend.hidden=true;
 const peopleBox=el('details'),peopleHost=el('div');peopleBox.className='people-settings';peopleBox.open=true;peopleBox.append(el('summary','People settings'),peopleHost);
 createFrame(host,{nav:[title,modes],stage:[transportHost,canvas,legend,error],inspector:[note,controls,...(options.people?[peopleBox]:[]),details]},'Characters');
 const people=options.people?.(peopleHost);
 const clock=new WorkbenchPlayback(90,()=>draw()),transport=mountWorkbenchPlayback(transportHost,clock);
 const label=(name:string,input:HTMLElement)=>{const l=el('label');l.style.marginRight='12px';l.append(name+' ',input);controls.append(l);return l;};
 const select=(name:string,values:readonly string[],value:string,change:(value:string)=>void,rebuild=false)=>{const s=el('select');s.setAttribute('aria-label',name);for(const v of values){const o=el('option',v);o.value=v;s.append(o);}s.value=value;s.onchange=()=>{change(s.value);if(rebuild)refresh();draw();};label(name,s);return s;};
 const numeric=(name:string,value:number,min:number,max:number,step:number,change:(value:number)=>void,rebuild=false)=>{const input=el('input');input.type='number';input.value=String(value);input.min=String(min);input.max=String(max);input.step=String(step);input.style.width='80px';input.setAttribute('aria-label',name);input.onchange=()=>{const v=Number(input.value);if(!Number.isFinite(v))return;change(v);if(rebuild)refresh();draw();};label(name,input);};
 const check=(name:string,value:boolean,change:(value:boolean)=>void)=>{const input=el('input');input.type='checkbox';input.checked=value;input.setAttribute('aria-label',name);input.onchange=()=>{change(input.checked);refresh();draw();};label(name,input);};
 /** A colour picker that shows the seeded colour until overridden, with ↺ to go back to it. */
 const colour=(name:string,value:string|undefined,seeded:string|undefined,change:(value:string|undefined)=>void)=>{const input=el('input'),reset=el('button','↺');input.type='color';input.value=value??seeded??'#808080';input.setAttribute('aria-label',name);input.oninput=()=>{change(input.value);draw();};reset.type='button';reset.title='Back to the seeded colour';reset.disabled=value===undefined;reset.onclick=()=>{change(undefined);refresh();draw();};const l=label(name,input);l.append(reset);};
 function setMode(next:WorkbenchMode){mode=next;for(const b of modes.children)b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode));refresh();draw();}
 for(const [id,text] of [['lineup','Lineup'],['crowd','People mix'],['archetypes','Archetypes'],['single','Single']] as const){const b=el('button',text);b.type='button';b.dataset.mode=id;b.onclick=()=>setMode(id);modes.append(b);}
 function refresh(){controls.replaceChildren();const family=inventory.families.find(f=>f.id===config.family)!;
  for(const b of modes.children)b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.mode===mode));
  legend.hidden=mode!=='crowd'&&mode!=='archetypes';
  if(mode==='archetypes'){numeric('First seed',grid.seed,0,1e6,1,v=>grid.seed=Math.round(v),true);numeric('City minute',config.minute??580,0,1439,10,v=>config.minute=v);return;}
  if(mode==='crowd'){
   const names=Object.fromEntries(cityData.DISTRICTS.map(d=>[d.id,d.name])),pick=el('select');pick.setAttribute('aria-label','District');
   for(const m of CROWD_MIXES){const o=el('option',names[m.district]??m.district);o.value=m.district;pick.append(o);}pick.value=crowd.district;pick.onchange=()=>{crowd.district=pick.value;crowd.kitted=undefined;refresh();draw();};label('District',pick);
   numeric('Mix seed',crowd.seed,0,1e6,1,v=>crowd.seed=Math.round(v),true);
   const shuffle=el('button','Reshuffle');shuffle.type='button';shuffle.onclick=()=>{crowd.seed=Math.floor(Math.random()*1e6);refresh();draw();};controls.append(shuffle);
   check('Show 30',crowd.show30,v=>crowd.show30=v);
   numeric('City minute',config.minute??580,0,1439,10,v=>config.minute=v);return;
  }
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
   for(const key of ['archetype','body','hair','garb','facial'] as const)select(key==='archetype'?'Named look':key,['seeded',...inventory.humanAppearanceAxes[key]],String(config.look?.[key]??'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look[key];else(config.look as Record<string,unknown>)[key]=value;},true);
   select('Extra',['seeded','none',...inventory.humanAppearanceAxes.extra],config.look?.extras?.[0]??(config.look?.extras?'none':'seeded'),value=>{config.look={...config.look};if(value==='seeded')delete config.look.extras;else config.look.extras=value==='none'?[]:[value as NonNullable<Look['extras']>[number]];},true);
   check('Sit down',config.seated??false,v=>{if(v)config.seated=true;else delete config.seated;});
   numeric('Seat or bed height',config.seat??0,0,120,1,v=>{if(v>0)config.seat=v;else delete config.seat;});
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
 /** The same view with its ground line at `gy` (rows of people on one canvas). */
 const rowView=(view:View,gy:number):View=>({...view,gy,y:h=>gy-h});
 /** A plain bench for seated people to sit on (its seat at SEAT_H, or at the chosen seat height); someone lying gets a longer cot. */
 function bench(ctx:CanvasRenderingContext2D,view:View,x:number,c?:CharacterWorkbenchConfig){const w=c?.action==='lie'?56:32,top=Math.round(view.y(c?.seat??SEAT_H));ctx.fillStyle='#3a2a20';ctx.fillRect(x-w/2,top,w,view.gy-top);ctx.fillStyle='#5a4232';ctx.fillRect(x-w/2-1,top,w+2,2);}
 const onFurniture=(c:CharacterWorkbenchConfig)=>c.family==='human'&&(c.seated||c.action==='sit'&&c.seat!==undefined||c.action==='lie'&&c.seat!==undefined);
 /** Draw one prepared person at world x (the session prepares them at 220) in the row view `rv`. */
 function at(ctx:CanvasRenderingContext2D,rv:View,x:number,c:CharacterWorkbenchConfig,t:number){ctx.save();ctx.translate(x-220,0);const s=session.prepare(c,t);drawCharacterWorkbenchSnapshot(ctx,rv,s);ctx.restore();return s;}
 function draw(){if(disposed)return;transport?.refresh();const ctx=canvas.getContext('2d');if(!ctx)return;try{
  const want=mode==='archetypes'?ARCHETYPE_GRID.top+Math.ceil(ARCHETYPE_IDS.length/ARCHETYPE_GRID.columns)*ARCHETYPE_GRID.rowHeight+10:mode==='crowd'&&crowd.show30?300:250;
  if(canvas.height!==want)canvas.height=want;
  const t=clock.effectiveTime(),view=characterWorkbenchView(config,t,canvas.width,canvas.height);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#070809';ctx.fillRect(0,0,canvas.width,canvas.height);
  let shown:CharacterWorkbenchSnapshot;slots=[];
  ctx.font='10px "IBM Plex Mono", monospace';
  if(mode==='archetypes'){
   const cells=archetypeLineup(grid.seed,config.minute??580),G=ARCHETYPE_GRID;
   for(const c of cells){const gy=G.top+(c.row+1)*G.rowHeight-14,rv=rowView(view,gy),x0=c.col*G.colWidth,x=x0+G.label+c.cell*G.step+G.step/2;
    if(c.cell===0){ctx.fillStyle='#493425';ctx.fillRect(x0+4,gy,G.colWidth-12,1);ctx.fillStyle='rgba(143,162,185,.75)';ctx.fillText(c.id,x0+6,gy-26);ctx.fillStyle='rgba(143,162,185,.45)';ctx.fillText(ARCHETYPES[c.id].age+' · '+ARCHETYPES[c.id].act,x0+6,gy-12);}
    if(c.config.seated)bench(ctx,rv,x);
    at(ctx,rv,x,c.config,t);slots.push({x0:x-G.step/2,x1:x+G.step/2,y0:gy-G.rowHeight+8,y1:gy+4,config:c.config});}
   legend.textContent=`${ARCHETYPE_IDS.length} named looks (art/characters/archetypes.ts), ${G.standing} seeds standing in their usual act and one seated (${seatedView()}), people style ${peopleStyle()}. Click one to open it on its own.`;
   shown=session.prepare(cells[0].config,t);
  }else if(mode==='crowd'&&crowd.show30){
   const v30=varietySample(crowd.district,crowd.seed,config.minute??580,crowd.kitted),dupe=new Map<number,number>();v30.dupes.forEach((g,k)=>g.forEach(i=>dupe.set(i,k)));
   for(const [i,row] of v30.rows.entries()){const line=Math.floor(i/15),gy=120+line*130,rv=rowView(view,gy),x=40+(i%15)*60;
    if(i%15===0){ctx.fillStyle='#493425';ctx.fillRect(0,gy,canvas.width,1);}
    at(ctx,rv,x,row.config,t);slots.push({x0:x-30,x1:x+30,y0:gy-90,y1:gy+4,config:row.config});
    const k=dupe.get(i);ctx.fillStyle=k===undefined?'rgba(143,162,185,.45)':'#ff7a5a';ctx.fillText(k===undefined?String(row.member.look.archetype??'').slice(0,7):'≈'+String.fromCharCode(65+k),x-20,gy+14);
    if(k!==undefined)ctx.fillRect(x-14,gy+2,28,2);}
   const pairs=v30.dupes.reduce((n,g)=>n+g.length*(g.length-1)/2,0);
   legend.textContent=`30 people from ${crowd.district}: ${v30.looks} named looks, ${v30.kitted} kitted, ${v30.dupes.length?`${pairs} near-duplicate pair${pairs===1?'':'s'} (≈ same letter: same named look and main colours)`:'no near-duplicates'}. People style ${peopleStyle()}.`;
   shown=session.prepare(v30.rows[0].config,t);
  }else if(mode==='crowd'){
   ruler(ctx,view);
   const rows=crowdLineup(crowd.district,crowd.seed,config.minute??580,crowd.kitted),mix=crowdMix(crowd.district)!;
   ctx.fillStyle='rgba(73,52,37,.6)';ctx.fillRect(0,view.gy+CROWD_ROWS[0].dy,canvas.width,1);
   const place=(row:typeof rows[number])=>{const r=CROWD_ROWS[row.row];ctx.save();ctx.translate(row.x-220,r.dy);drawCharacterWorkbenchSnapshot(ctx,view,session.prepare(row.config,t));ctx.restore();
    const half=r.band==='near'?60:r.band==='back'?24:36,top=view.gy+r.dy-(r.band==='near'?140:r.band==='back'?50:80);slots.push({x0:row.x-half,x1:row.x+half,y0:top,y1:view.gy+r.dy+4,config:row.config});};
   rows.filter(r=>r.row===0).forEach(place);player(ctx,view,90);rows.filter(r=>r.row===1).forEach(place);rows.filter(r=>r.row===2).forEach(place);
   const people=rows.filter(r=>r.member.kind==='person'),kitted=people.filter(r=>r.member.kind==='person'&&r.member.kitted).length;
   legend.textContent=`${rows.length} in view: ${people.length-kitted} plain, ${kitted} kitted, ${rows.length-people.length} robots. ${mix.note}`;
   shown=session.prepare(rows.find(r=>r.row===1)!.config,t);
  }else if(mode==='lineup'){
   ruler(ctx,view);
   const rows=characterLineup(config),ps=config.pixelSize??3,step=Math.min(100,Math.max(80,Math.round(30*ps))),first=150;player(ctx,view,70);
   for(const [i,row] of rows.entries()){const x=first+i*step+step/2;if(onFurniture(row))bench(ctx,view,x,row);at(ctx,view,x,row,t);slots.push({x0:x-step/2,x1:x+step/2,config:row});
    ctx.fillStyle='rgba(143,162,185,.55)';ctx.fillText(rows.length>1&&row.variant!==config.variant?row.variant:'#'+row.seed,x-18,view.gy+26);}
   shown=session.prepare(rows[0],t);
  }else{ruler(ctx,view);player(ctx,view,120);if(onFurniture(config))bench(ctx,view,220,config);shown=session.prepare(config,t);drawCharacterWorkbenchSnapshot(ctx,view,shown);}
  error.textContent='';const {pose,...rest}=shown;json.textContent=JSON.stringify({...rest,...(pose?{pose:pose.visible?{visible:true,frame:pose.frame,height:pose.height,appearance:pose.ready.full??pose.ready.bot??pose.ready.critter}:{visible:false}}:{})},null,2);}catch(e){error.textContent=e instanceof Error?e.message:String(e);}}
 canvas.onclick=event=>{if(mode==='single')return;const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*canvas.width/r.width,y=(event.clientY-r.top)*canvas.height/r.height,slot=[...slots].reverse().find(s=>x>=s.x0&&x<s.x1&&(s.y0===undefined||y>=s.y0&&y<=s.y1!));if(!slot)return;config={...slot.config,inPlace:false};setMode('single');};
 const frame=(now:number)=>{if(disposed)return;runFrame(()=>clock.tick(now));raf=requestAnimationFrame(frame);};
 refresh();draw();raf=requestAnimationFrame(frame);
 const handle=(()=>{disposed=true;cancelAnimationFrame(raf);clock.dispose();transport.dispose();session.dispose();people?.();host.replaceChildren();host.classList.remove('framed');}) as WorkbenchHandle;
 handle.refresh=()=>{people?.refresh?.();refresh();draw();};return handle;
}
