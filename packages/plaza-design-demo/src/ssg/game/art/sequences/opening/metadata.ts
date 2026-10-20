/** Exact defaults and native-space selection geometry for independently placed opening pieces. */
import type { Anchor, Bounds, Field, Properties, Value } from '../../core/composition';
import { drawCharacterFrame } from '../../characters/appearance';
import type { Character } from '../../../runtime/characters';
import { BOX40 } from '../../props/containers';
import { PALMS, LOUNGERS, STACKS, CRANES, PEOPLE, STS2_GLIDE, S, CRANE, lines, lineY, sts2Load,coastAssemblyKernels,coastDetailKernels, type CoastView } from './coast';
import { GANTRIES,drawGantry } from '../../machinery/crane';
import { PAL,stack, type Crate } from '../../props/containers';
import { pieceNumber as pn } from './piece-inputs';
import { STREET, PORTAL_TOWER, PEOPLE as TOWN_PEOPLE, towerProperties } from './town';
import { SIZE } from '../../vehicles/vehicles';
import type { TowerSign } from '../../architecture/downtown-towers';
import { drawPalm } from '../../environment/palm';
import {drawLounger,drawDjBooth,drawBonfire} from '../../props/beach-party';
import {frameView} from '../../core/view';
import {measureArtwork,type Measured} from './measure';

export interface PieceGeometry { bounds: Bounds; anchors: Record<string, Anchor> }
const numeric = (label: string, value: number, min?: number, max?: number): Field => ({ kind: 'number', label, default: value, ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }), animatable: true });
const color = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function validateBoxes(value: Value) {
  if (!Array.isArray(value) || value.length > 20) throw new Error('Containers: expected at most 20 crates');
  for (const box of value as unknown as Crate[]) {
    if (!box || typeof box !== 'object' || !(box.w > 0) || box.w > 2000 || !Number.isFinite(box.w) || !Number.isInteger(box.p) || box.p < 0 || box.p >= PAL.length || !Number.isFinite(box.seed)) throw new Error('Container requires finite width/seed and a valid paint index');
    if (box.h !== undefined && (!Number.isFinite(box.h) || box.h <= 0) || box.dx !== undefined && !Number.isFinite(box.dx) || box.code !== undefined && typeof box.code !== 'string' || box.label !== undefined && typeof box.label !== 'string') throw new Error('Invalid container height/offset/code/label');
    if (Object.keys(box).some(key => !['w', 'h', 'p', 'seed', 'code', 'label', 'dx'].includes(key))) throw new Error('Unknown container field');
  }
}
export const actorFields = (actor: Character): Record<string, Field> => ({ seed: { ...numeric('Appearance seed', actor.seed ?? Math.round(actor.x * 7 + 3)), animatable: false }, act: { kind: 'select', label: 'Activity', default: actor.act ?? 'stand', options: ['stand','walk','sit','lean','smoke','phone','haggle','argue','sweep','queue','sleep','dance','vend','steal','scan','carry','roll','patrol','serve','crawl','hover','direct','play','weld','scrub','charge','glitch','blink','slump','read','doze','dig','fly'] }, dim: numeric('Dimming', actor.dim ?? 0, 0, 1), speed: numeric('Speed (0 = native default)', actor.speed ?? 0, 0, 10) });
function validateSigns(value:Value){if(!Array.isArray(value)||value.length>30)throw new Error('Tower signs: expected at most 30 signs');for(const sign of value as unknown as TowerSign[]){if(!sign||!['plate','blade','stack','ticker','holo','billboard'].includes(sign.kind)||typeof sign.text!=='string'||sign.text.length>4096||!/^\d{1,3},\d{1,3},\d{1,3}$/.test(sign.col)||sign.col.split(',').some(n=>Number(n)>255)||!Number.isFinite(sign.h)||sign.at!==undefined&&(!Number.isFinite(sign.at)||sign.at<0||sign.at>1)||sign.dead!==undefined&&(!Number.isInteger(sign.dead)||sign.dead< -1))throw new Error('Invalid tower sign');if(Object.keys(sign).some(key=>!['kind','text','col','h','at','dead'].includes(key)))throw new Error('Unknown tower sign field');}}
export function openingFields(id: string): Record<string, Field> {
  const [, part] = id.split('.');
  if(id.startsWith('coast.salt-')){const item=part.slice(5);return{worldX:numeric('Coast X · west',196),...(['under','back','shell','counter','lights','string'].includes(item)?{width:numeric('Bar width',226,40,2000)}:{}),...(item==='shell'?{wear:numeric('Weathering',.05,0,1)}:{}),...(item.startsWith('stool-')?{seatX:numeric('Seat position',[40,96,170][Number(item.slice(6))]),legPaint:color('Legs','#5a3a24'),seatPaint:color('Seat','#8a5a3a')}:{}),...(item==='string'?{sag:numeric('Cable sag',12,0,100),phase:numeric('Light phase',3)}:{})};}
  if(id.startsWith('coast.pier-')){const item=part.slice(5);if(item==='kiosk')return{text:{kind:'string',label:'Kiosk sign',default:'BAIT · ICE · TEA'}};if(item.startsWith('string-'))return{sag:numeric('Cable sag',6,0,100),phase:numeric('Light phase',Number(item.slice(7)))};return{paint:color('Timber silhouette','#0a0310'),...(item.startsWith('lamp-')||item==='lantern'?{light:{kind:'string',label:'Lamp color',default:item==='lantern'?'rgba(255,232,190,.95)':'rgba(255,220,160,.95)'}}:{})};}
  if(id.startsWith('coast.buffer-')){const item=part.slice(7);if(item.startsWith('sign-'))return{text:{kind:'string',label:'Fence sign',default:['PORT AREA · NO ENTRY','CAMERAS IN OPERATION','TRESPASS IS LOGGED'][Number(item.slice(5))]}};if(item==='gate')return{text:{kind:'string',label:'Gate sign',default:'TERMINAL 2 · STAFF'}};if(item==='fence')return{height:numeric('Fence height',26,1,200)};if(item==='car')return{paint:color('Car shell','#2a2224')};}

  if(id.startsWith('coast.hub-')){const item=part.slice(4);if(item==='shed')return{paint:color('Shed paint','#241c22')};if(item.startsWith('door-'))return{paint:{kind:'string',label:'Roller door color',default:item==='door-1'?'rgba(255,214,150,.55)':'#18121a'}};if(item==='sign')return{text:{kind:'string',label:'Hub sign',default:'LOGISTICS HUB 3'}};if(item.startsWith('pad-'))return{phase:numeric('Landing light phase',Number(item.slice(4))*13)};}
  if(id.startsWith('coast.ship-')){const item=part.slice(5);if(item.startsWith('stack-')){const i=Number(item.slice(6));return{boxes:{kind:'json',label:'Deck cargo',default:[{...BOX40,p:i*3%PAL.length,seed:300+i*7}]as unknown as Value,validate:validateBoxes}};}if(item==='hull'||item==='bridge-house'||item==='funnel')return{paint:color('Paint',item==='hull'?'#1c1220':item==='bridge-house'?'#241828':'#3a1a1a')};}
  if(id.startsWith('coast.bridge-')){const item=part.slice(7);return{paint:color('Paint',item==='rail'?'#3a2a3a':item.startsWith('signal-')?'#1e1222':'#0e080c')};}
  if(id.startsWith('coast.galleria-')){const item=part.slice(9);if(item==='dome')return{paintMode:{kind:'select',label:'Dawn response',default:'dawn',options:['dawn','fixed']},paint:color('Fixed paint','#3a2440'),lit:numeric('Window light',1.5,0,4)};if(item==='plinth')return{paint:color('Facade paint','#2a1830')};if(item.startsWith('window-')||item==='entrance')return{light:{kind:'string',label:'Window light',default:item==='entrance'?'rgba(255,230,190,.65)':'rgba(255,200,140,.55)'}};if(item==='sign'||item==='advert'||item==='taxi-pad')return{text:{kind:'string',label:item==='advert'?'Advert override (empty uses native rotation)':'Sign',default:item==='sign'?'GALLERIA':item==='taxi-pad'?'TAXI · PUBLIC':''}};if(item==='taxi-cab')return{phase:numeric('Flight phase (frames)',0),period:numeric('Flight cycle (frames)',1500,1,100000)};}
  if ((id.startsWith('coast.') || id.startsWith('coast-front.')) && part?.startsWith('palm-')) {
    const [X, band, h, lean, seed] = PALMS[Number(part.slice(5))];
    return { worldX: numeric('Coast X · west', X), height: numeric('Height', h, 1, 1000), lean: numeric('Lean', lean, -500, 500), seed: { ...numeric('Frond seed', seed), animatable: false }, fill: color('Silhouette', band === 'front' ? '#07020a' : '#0b0410') };
  }
  if (id === 'coast-mid.dj') return { worldX: numeric('Coast X · west', 100), beat: numeric('Beat length · frames', 16, 1, 600) };
  if (id === 'coast-mid.bonfire') return { worldX: numeric('Coast X · west', -42), size: numeric('Fire size', 1, 0.05, 10) };
  if (id.startsWith('coast-mid.lounger-')) { const [X, col, flip] = LOUNGERS[Number(part.slice(8))]; return { worldX: numeric('Coast X · west', X), color: color('Canopy color', col), wear: numeric('Wear', 0.1, 0, 1), flip: { kind: 'boolean', label: 'Flip furniture', default: flip }, parasol: { kind: 'boolean', label: 'Parasol', default: true } }; }
  if (id.startsWith('coast.stack-')) { const stack = STACKS[Number(part.slice(6))]; return { worldX: numeric('Coast X · west', stack.X), boxes: { kind: 'json', label: 'Containers · bottom to top', default: plain(stack.boxes) as unknown as Value, validate: validateBoxes } }; }
  if (id.startsWith('coast.crane-')) { const crane = CRANES.find(c => 'crane-' + c.id === part)!; return { worldX: numeric('Coast X · west', crane.X), variant: { kind: 'select', label: 'Gantry', default: crane.id, options: ['sts1','sts2','sts3'] }, boomUp: numeric('Raised boom', crane.up, 0, 1), phase: numeric('Warning-light phase', crane.ph), paintMode: { kind: 'select', label: 'Paint response', default: 'dawn', options: ['dawn','fixed'] }, paint: color('Fixed paint', '#b4561c'), lit: numeric('Lit edge', 0.5, 0, 2), rim: numeric('Rim light', 0.55, 0, 2) }; }
  if (id.startsWith('coast-mid.person-')) { const who = PEOPLE[Number(part.slice(7))]; return { worldX: numeric('Coast X · west', who.X), ...actorFields(who.c) }; }
  if(id.startsWith('coast-mid.machine-')){
    const kind=part.slice(8),X={straddle:1400,'reach-stacker':1955,forklift:1330,truck:1760,tractor:1480}[kind]!;
    const result:Record<string,Field>={worldX:numeric('Coast X · west',X)};
    if(['straddle','forklift','tractor'].includes(kind))result.travel=numeric('Travel distance',kind==='straddle'?30:kind==='forklift'?18:520,0,3000);
    if(['straddle','reach-stacker','forklift'].includes(kind)){result.animate={kind:'boolean',label:'Native equipment motion',default:true};result[kind==='reach-stacker'?'reach':'lift']=numeric(kind==='reach-stacker'?'Manual reach':'Manual lift',0.5,0,1);result.load={kind:'boolean',label:'Show load',default:true};}
    if(kind==='truck'||kind==='tractor'){result.paint=color('Paint',kind==='truck'?'#2a4a6a':'#c8a020');result.lights={kind:'boolean',label:'Headlights',default:kind==='tractor'};}return result;
  }
  if(id.startsWith('town.tower-')){const tower=[...STREET,PORTAL_TOWER].find(t=>'tower-'+t.seed===part)!;return{worldX:numeric('Coast X · west',tower.X),width:numeric('Tower width',tower.w,1,3000),height:numeric('Tower height',tower.h,1,20000),seed:{...numeric('Architecture seed',tower.seed),animatable:false},skin:{kind:'select',label:'Facade',default:tower.skin??'concrete',options:['concrete','glass','capsule','panel','brick']},grime:numeric('Grime',tower.grime??0,0,1),...(tower.signs?{signs:{kind:'json',label:'Signs',default:plain(tower.signs) as unknown as Value,validate:validateSigns} as Field}:{})};}
  if(id.startsWith('lamps.lamp-'))return{worldX:numeric('Coast X · west',Number(part.slice(5))),height:numeric('Lamp height',46,1,500)};
  if(id.startsWith('people.person-')){const who=TOWN_PEOPLE[Number(part.slice(7))];return{worldX:numeric('Coast X · west',who.X),...actorFields(who.c)};}
  return {};
}
function rect(x: number, y: number, w: number, tall: number, anchors: Record<string, Anchor> = {}): PieceGeometry {
  return { bounds: { x, h: -y, w, tall }, anchors: { origin: { x, h: -(y + tall), role: 'origin' }, ...anchors } };
}
function measured(x:number,base:number,scale:number,b:Measured,anchors:Record<string,Anchor>={}):PieceGeometry{return rect(x+b.x*scale,base+b.y*scale,b.width*scale,b.height*scale,anchors);}
export function actorGeometry(c: CoastView, _source: Character, props: Properties, worldX: number, base: number): PieceGeometry {
  const pose=c.pose, x = Math.round(c.sx(pn(props,'worldX',worldX)));
  const tall = pose?.visible ? pose.height : 0, actorX = pose?.visible ? pose.frame!.x : 0;
  return rect(x + (actorX - 24) * S, base - tall * S, 48 * S, tall * S, { feet: { x: x + actorX * S, h: -base, role: 'surface' } });
}
export function openingGeometry(id: string, c: CoastView, props: Properties): PieceGeometry | undefined {
  const [, part] = id.split('.'), L = lines(c);
  if ((id.startsWith('coast.') || id.startsWith('coast-front.')) && part?.startsWith('palm-')) {
    const [X, band, h, lean] = PALMS[Number(part.slice(5))], s = Math.round(c.sx(pn(props,'worldX',X))), height = pn(props,'height',h), tilt = pn(props,'lean',lean), base = band === 'front' ? c.H + 4 : L.BACK + 2;
    const seed=pn(props,'seed',PALMS[Number(part.slice(5))][4]),t=c.still?0:c.f,crown=tilt+Math.sin(t*.02+seed)*height*.012+Math.sin(3)*tilt*.08;
    const bounds=measureArtwork(ctx=>drawPalm(ctx,{h:height,lean:tilt,seed,t:c.f,still:c.still,fill:String(props.fill??'#0b0410'),rim:'255,150,90',side:c.sunX>s?1:-1}));return measured(s,base,1,bounds,{foot:{x:s,h:-base,role:'surface'},crown:{x:s+crown,h:height-base,role:'mount'}});
  }
  if (id === 'coast-mid.dj') { const s=Math.round(c.sx(pn(props,'worldX',100)));return measured(s,L.BEACH,S,measureArtwork(ctx=>drawDjBooth(ctx,{t:c.f,still:c.still,beat:pn(props,'beat',16)})),{counter:{x:s,h:30*S-L.BEACH,role:'surface'}}); }
  if (id === 'coast-mid.bonfire') { const s=Math.round(c.sx(pn(props,'worldX',-42))),size=pn(props,'size',1);return measured(s,L.BEACH+2,S,measureArtwork(ctx=>drawBonfire(ctx,{t:c.f,still:c.still,size})),{fire:{x:s,h:-(L.BEACH+2),role:'origin'}}); }
  if (id.startsWith('coast-mid.lounger-')) { const [X,col,originalFlip]=LOUNGERS[Number(part.slice(8))],s=Math.round(c.sx(pn(props,'worldX',X))),flip=typeof props.flip==='boolean'?props.flip:originalFlip;return measured(s,L.BEACH+1,S,measureArtwork(ctx=>drawLounger(ctx,{col:String(props.color??col),p:pn(props,'wear',.1),flip,parasol:props.parasol!==false})),{seat:{x:s,h:10*S-L.BEACH-1,role:'surface'}}); }
  if (id.startsWith('coast.stack-')) { const item=STACKS[Number(part.slice(6))], boxes=(props.boxes as unknown as Crate[]|undefined)??item.boxes,s=Math.round(c.sx(pn(props,'worldX',item.X))),h=boxes.reduce((height,b)=>height+(b.h??58),0);return measured(s,L.BACK,S,measureArtwork(ctx=>stack(ctx,frameView(c.f),0,boxes)),{base:{x:s,h:-L.BACK,role:'surface'},top:{x:s,h:h*S-L.BACK,role:'surface'}}); }
  if (id.startsWith('coast.crane-')) { const item=CRANES.find(v=>'crane-'+v.id===part)!,variant=String(props.variant??item.id),g=variant==='sts2'?STS2_GLIDE:GANTRIES[variant as keyof typeof GANTRIES],s=Math.round(c.sx(pn(props,'worldX',item.X))),up=pn(props,'boomUp',item.up);const bounds=measureArtwork(ctx=>{drawGantry(ctx,g,c.f,'all',pn(props,'phase',item.ph),c.still,{boomUp:up,lit:pn(props,'lit',.5),rim:pn(props,'rim',.55)});if(item.id==='sts2')sts2Load(ctx,c,L);});return measured(s,L.BACK,CRANE,bounds,{rail:{x:s,h:-L.BACK,role:'surface'},boom:{x:s+g.house.x*CRANE,h:g.boom.h*CRANE-L.BACK,role:'mount'}}); }
  if (id.startsWith('coast-mid.person-')) { const who=PEOPLE[Number(part.slice(7))];return actorGeometry(c,who.c,props,who.X,lineY(L,c,who.line)); }
  if(id.startsWith('coast-mid.machine-')){
    const kind=part.slice(8),f=c.still?0:c.f;let X=0,base=L.MID,scale=S,left=0,right=0,tall=0;
    if(kind==='straddle'){X=pn(props,'worldX',1400)+Math.sin(f*.003)*pn(props,'travel',30);base=L.BACK-2;scale=S*.7;left=-SIZE.straddle/2-34;right=SIZE.straddle/2+34;tall=368;}
    if(kind==='reach-stacker'){X=pn(props,'worldX',1955);const reach=props.animate===false?pn(props,'reach',.5):.5+.5*Math.sin(f*.006),angle=.3+reach*.36;left=-SIZE.stacker/2-20;right=Math.max(SIZE.stacker/2,-SIZE.stacker/2+70+Math.cos(angle)*330+(props.load===false?20:160));tall=Math.max(140,96+Math.sin(angle)*330+20);}
    if(kind==='forklift'){X=pn(props,'worldX',1330)+Math.sin(f*.01)*pn(props,'travel',18);left=-SIZE.forklift/2-20;right=SIZE.forklift/2+90;tall=170;}
    if(kind==='truck'||kind==='tractor'){const u=(f*.004)%2;X=pn(props,'worldX',kind==='truck'?1760:1480)+(kind==='tractor'?(u<1?u:2-u)*pn(props,'travel',520):0);base=kind==='truck'?L.FAR_LANE:L.NEAR_LANE-2;const lights=props.lights??kind==='tractor';left=-SIZE.yard/2-(lights?120:0);right=SIZE.yard/2+(lights?120:0);tall=138;}
    const s=Math.round(c.sx(X));return rect(s+left*scale,base-tall*scale,(right-left)*scale,tall*scale,{wheels:{x:s,h:-base,role:'surface'},load:{x:s,h:70*scale-base,role:'mount'}});
  }
  if(id.startsWith('town.tower-')){const source=[...STREET,PORTAL_TOWER].find(t=>'tower-'+t.seed===part)!,tower=towerProperties(source,props),s=Math.round(c.sx(pn(props,'worldX',source.X))-tower.w*S);return rect(s-40*S,L.BACK-(tower.h+110)*S,(tower.w+120)*S,(tower.h+112)*S,{foot:{x:s,h:-L.BACK,role:'surface'},roof:{x:s+tower.w*S/2,h:tower.h*S-L.BACK,role:'mount'}});}
  if(id.startsWith('lamps.lamp-')){const X=Number(part.slice(5)),s=c.sx(pn(props,'worldX',X)),top=L.BACK-pn(props,'height',46);return rect(s-32,top-24,56,L.ROAD0-top+24,{foot:{x:s,h:-L.BACK,role:'surface'},lamp:{x:s-4,h:-(top+3),role:'mount'}});}
  if(id.startsWith('people.person-')){const who=TOWN_PEOPLE[Number(part.slice(7))];return actorGeometry(c,who.c,props,who.X,L.MID);}
  if(id.startsWith('coast.')){
    const key=part==='truck-gate'?'truckGate':part;
    if(key in coastDetailKernels){const native={...c,piece:props,cull:{x:0,scale:1,facing:1 as const,width:c.W,unculled:true}},bounds=measureArtwork(ctx=>coastDetailKernels[key](ctx,native,L));return rect(bounds.x,bounds.y,bounds.width,bounds.height,{base:{x:bounds.x+bounds.width/2,h:-(bounds.y+bounds.height),role:'surface'}});}
    if(key in coastAssemblyKernels){const native={...c,cull:{x:0,scale:1,facing:1 as const,width:c.W,unculled:true}},kernel=coastAssemblyKernels[key as keyof typeof coastAssemblyKernels];const bounds=measureArtwork(ctx=>kernel(ctx,native,L));return rect(bounds.x,bounds.y,bounds.width,bounds.height);}
  }
  return undefined;
}
// Keep this module's type dependency on the pure kernel explicit for tooling.
export type CharacterPixelKernel = typeof drawCharacterFrame;
