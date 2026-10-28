import {appearanceChoice,appearanceRatio,generationCount,generationSeed,semantic,shapePosition,velocity,numericFields} from '../core/fields';
/**
 * Flocks: birds wheeling or drifting overhead, drawn with the character kit's gull (its flying pose) or
 * the Registry's robot gull. A flock is plain data: how many, a seed, an altitude band, a parallax range
 * and a drift, or an explicit list of birds when a scene keeps its own. The kit owns how a bird looks and
 * flaps; this file only says where each one is.
 */
import { drawDriven, type Character } from '../../runtime/characters';
import type { View } from '../core/view';
import {screenBounds} from '../assemblies/static-bounds';
import type { AssetDefinition, Properties } from '../core/composition';

/** One bird: start x along the flock's span, altitude, drift (units per frame), parallax, phase; `ps` 1 or 2. */
export interface FlockBird { x: number; h: number; speed: number; parallax: number; phase: number; bobPhase?:number; flapPhase?:number; ps?: number }
export interface FlockOptions {
  kind?: 'gull' | 'robogull';
  appearance?: 'kit' | 'white silhouette' | 'grey silhouette';
  count?: number; seed?: number;
  /** Altitude band (world units over the flock's placement). */
  low?: number; high?: number;
  /** Parallax range [from, to]: under 1 for birds further away. */
  parallax?: [number, number];
  /** Drift speed range [from, to] (0 = wheeling about one spot). */
  drift?: [number, number];
  /** How far (units) each bird wheels back and forth on top of its drift. */
  wander?: number;
  /** Vertical sway and wrapping policy are explicit artwork inputs. */
  bob?:number; screenWrap?:boolean;
  /** The world strip the flock wraps around in, and how far before x = 0 it starts. */
  span?: number; margin?: number;
  /** Pixel size (1 = a far bird), and the share drawn one size bigger. */
  ps?: number; big?: number;
  dim?: number;
  /** Explicit birds instead of seeded ones. */
  birds?: FlockBird[];
}

const rnd = (seed: number) => { let s = (Math.abs(Math.round(seed)) * 2654435761) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const BIRDS = new Map<string, FlockBird[]>();
/** The flock's birds (seeded ones are made once per option set). */
export function flockBirds(o: FlockOptions): FlockBird[] {
  if (o.birds) return o.birds;
  const key = JSON.stringify(o);
  let list = BIRDS.get(key);
  if (list) return list;
  const r = rnd(o.seed ?? 1), [p0, p1] = o.parallax ?? [0.7, 1], [d0, d1] = o.drift ?? [0.25, 0.6], low = o.low ?? 130, high = o.high ?? 260, span = o.span ?? 2400, ps = o.ps ?? 1;
  list = Array.from({ length: Math.max(0, Math.min(60, Math.round(o.count ?? 7))) }, () => ({ x: r() * span, h: low + r() * (high - low), speed: d0 + r() * (d1 - d0), parallax: p0 + r() * (p1 - p0), phase: r() * 100, ps: r() < (o.big ?? 0) ? ps + 1 : ps }));
  if (BIRDS.size > 64) BIRDS.clear();
  BIRDS.set(key, list);
  return list;
}

export interface FlockPlace { x: number; h: number; face: 1 | -1; parallax: number; ps: number; i: number }
/** Where every bird is at time t, in world units (x0, h0: the flock's placement). */
export function flockAt(o: FlockOptions, t: number, x0 = 0, h0 = 0): FlockPlace[] {
  const span = o.span ?? 2400, margin = o.margin ?? 200, wander = o.wander ?? 0;
  return flockBirds(o).map((b, i) => {
    const u = b.x + t * b.speed + Math.sin(t * 0.004 + b.phase) * wander, wx = ((u % span) + span) % span - margin;
    const vel = b.speed + wander * 0.004 * Math.cos(t * 0.004 + b.phase);
    return { x: x0 + (o.screenWrap?u:wx), h: h0 + b.h + Math.sin(t * 0.02 + (b.bobPhase??b.phase)) * (o.bob??8), face: vel < 0 ? -1 : 1, parallax: b.parallax, ps: b.ps ?? o.ps ?? 1, i };
  });
}

const BODIES = new Map<string, Character>();
/** A stable kit body per bird (its appearance is baked once). */
function body(kind: 'gull' | 'robogull', seed: number, i: number, ps: number, parallax: number, dim: number): Character {
  const key = kind + '|' + seed + '|' + i + '|' + ps + '|' + parallax + '|' + dim;
  let p = BODIES.get(key);
  if (!p) {
    p = { seed: seed * 31 + i * 7, look: kind, x: 0, act: 'fly', ps, parallax, dim, rim: false, shadow: false };
    if (BODIES.size > 512) BODIES.clear();
    BODIES.set(key, p);
  }
  return p;
}

const screenX=(v:View,o:FlockOptions,b:FlockPlace)=>{const x=v.sx(b.x,b.parallax),span=o.span??2400;return o.screenWrap?((x%span)+span)%span-(o.margin??200):x;};

/** Draw the flock, back to front as listed. */
export function drawFlock(x: CanvasRenderingContext2D, v: View, o: FlockOptions, x0 = 0, h0 = 0) {
  const kind = o.kind ?? 'gull';
  for (const b of flockAt(o, v.t, x0, h0)) {
    const s = screenX(v,o,b);
    if (s < -20 || s > v.viewW + 20) continue;
    if(o.appearance==='white silhouette'){
      const c=Math.round(s),y=Math.round(v.y(b.h)),size=b.ps,up=Math.floor((v.t+(flockBirds(o)[b.i].flapPhase??b.i*3))/8)%2;
      x.fillStyle='#e8e4dc';x.fillRect(c-1,y,3*size,2);
      x.fillRect(c-5*size,y-(up?2:-1),4*size,1);x.fillRect(c+2*size,y-(up?2:-1),4*size,1);
    }else if(o.appearance==='grey silhouette'){
      const c=Math.round(s),y=Math.round(v.y(b.h)),up=Math.floor((v.t+flockBirds(o)[b.i].phase)/7)%2===0;
      x.fillStyle='#8a8e96';
      if(up){x.fillRect(c-7,y-4,2,2);x.fillRect(c-5,y-2,3,2);x.fillRect(c+2,y-2,3,2);x.fillRect(c+5,y-4,2,2);}
      else{x.fillRect(c-7,y+1,3,2);x.fillRect(c-4,y,2,2);x.fillRect(c+2,y,2,2);x.fillRect(c+4,y+1,3,2);}
      x.fillStyle='#e8e4dc';x.fillRect(c-2,y-1,5,3);x.fillStyle='#e8b030';x.fillRect(c+(b.face>0?3:-4),y,2,1);
    }else drawDriven(x, v, body(kind, o.seed ?? 1, b.i, b.ps, b.parallax, o.dim ?? 0), { x: b.x, air: b.h, facing: b.face, moving: true });
  }
}

/** Stable configured flock strip, before viewport culling and independent of flap/drift time. */
export function flockRegion(v:View,o:FlockOptions,x0=0,h0=0){
 const birds=flockBirds(o);if(!birds.length)return{x:0,y:0,w:0,h:0};
 const span=o.span??2400,margin=o.margin??200,bob=Math.abs(o.bob??8),pad=8*Math.max(1,o.birds?Math.max(...birds.map(b=>b.ps??1)):(o.ps??1)+((o.big??0)>0?1:0));
 const low=(o.birds?Math.min(...birds.map(b=>b.h)):o.low??130)-bob-pad,high=(o.birds?Math.max(...birds.map(b=>b.h)):o.high??260)+bob+pad;
 const depths=o.birds?birds.map(b=>b.parallax):o.parallax??[.7,1];
 const edges=depths.flatMap(depth=>o.screenWrap?[-margin,span-margin]:[v.sx(x0-margin,depth),v.sx(x0+span-margin,depth)]);
 const left=Math.min(...edges)-pad,right=Math.max(...edges)+pad;
 return{x:left,y:v.y(h0+high),w:right-left,h:v.y(h0+low)-v.y(h0+high)};
}

const num = (p: Properties, k: string, d: number) => { const n = Number(p[k]); return Number.isFinite(n) ? n : d; };
/** The flock's options from element properties. */
export function flockOptions(p: Properties): FlockOptions {
  return {
    bob:num(p,'bobAmplitude',8),screenWrap:p.wrapAfterParallax===true,kind:p.kind==='robogull'?'robogull':'gull',appearance:p.appearance as FlockOptions['appearance'],count:num(p,'count',7),seed:num(p,'seed',1),
    low:num(p,'minAltitude',0),high:num(p,'maxAltitude',120),parallax:[num(p,'minParallax',.7),num(p,'maxParallax',1)],
    drift:[num(p,'minVelocityX',15)/60,num(p,'maxVelocityX',36)/60],wander:num(p,'wanderAmplitude',0),span:num(p,'maxX',2200)-num(p,'minX',-200),margin:-num(p,'minX',-200),
    ps:num(p,'pixelSize',1),big:num(p,'largeBirdShare',0),

  };
}
const n=numericFields();
export const flockElement: AssetDefinition = {
  mobility:()=>true,
  type: 'character.flock', selection:'region', version: 1, label: 'Flock of gulls (kit)', category: 'characters', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    appearance: semantic({kind:'select',label:'Bird drawing',options:['kit','white silhouette','grey silhouette'],default:'kit'},{"group":"Visibility & Drawing","quantity":"choice","unit":"choice"}),
    kind: appearanceChoice({ kind: 'select', label: 'Bird', options: ['gull', 'robogull'], default: 'gull' }),
    bobAmplitude:semantic(n('Vertical sway',8,-100,100),{"group":"Motion","quantity":"length","unit":"world units","space":"local"}),wrapAfterParallax:semantic({kind:'boolean',label:'Wrap after parallax',default:false},{"group":"Depth","quantity":"boolean","unit":"boolean"}),
    count: generationCount(n('Birds', 7, 1, 60, 1)), seed: generationSeed(n('Seed', 1, 0, 1000000, 1)),
    minAltitude:shapePosition(n('Minimum altitude',0,-10000,10000,1)),maxAltitude:shapePosition(n('Maximum altitude',120,-10000,10000,1)),
    minParallax: semantic(n('Parallax, furthest', 0.7, 0.05, 2, 0.05),{"group":"Depth","quantity":"factor","unit":"factor"}), maxParallax: semantic(n('Parallax, nearest', 1, 0.05, 2, 0.05),{"group":"Depth","quantity":"factor","unit":"factor"}),
    minVelocityX:velocity('Minimum drift speed',15,{min:-180,max:180,step:3}),maxVelocityX:velocity('Maximum drift speed',36,{min:-180,max:180,step:3}), wanderAmplitude: semantic(n('Wheeling amplitude', 0, 0, 1000, 10),{"group":"Motion","quantity":"length","unit":"world units","space":"local"}),
    minX:shapePosition(n('From X',-200,-1e6,1e6,1)),maxX:shapePosition(n('To X',2200,-1e6,1e6,1)),
    pixelSize: semantic(n('Pixel size', 1, 1, 3, 1),{"group":"Appearance","quantity":"length","unit":"artwork pixels","space":"artwork"}), largeBirdShare: appearanceRatio(n('Share one size bigger', 0, 0, 1, 0.05)),
  },
  validateProperties(p){
    if(Number(p.maxX)-Number(p.minX)<100||Number(p.maxX)-Number(p.minX)>20000)throw Error('Flock wrap area must be between 100 and 20000 units wide.');
    if(Number(p.maxAltitude)<Number(p.minAltitude))throw Error('Maximum altitude must not be below minimum altitude.');
    if(Number(p.maxParallax)<Number(p.minParallax))throw Error('Maximum parallax must not be below minimum parallax.');
    if(Number(p.maxVelocityX)<Number(p.minVelocityX))throw Error('Maximum drift speed must not be below minimum drift speed.');
  },
  spatial:{fields:['minX','maxX','minAltitude','maxAltitude'],handles(p,c){
    const start=Number(p.minX),end=Number(p.maxX),low=Number(p.minAltitude),high=Number(p.maxAltitude),at=c?.placement??{x:0,h:0},v=c?.view;
    // A source strip has many particle depths; show its configured projection envelope.
    // Camera-space wrapping happens after projection in the native kernel.
    const project=(value:number,side:'left'|'right')=>!v?value:p.wrapAfterParallax?value-at.x:(side==='left'?Math.min:Math.max)(v.sx(at.x+value,Number(p.minParallax)),v.sx(at.x+value,Number(p.maxParallax)))-at.x;
    const left=project(start,'left'),right=project(end,'right');
    const h=(value:number)=>v?-v.y(at.h+value)-at.h:value;
    return[
      {id:'start',label:'Wrap area start',fields:['minX'],point:{x:left,h:h((low+high)/2)},...(v?{space:'screen' as const}:{}),cursor:'ew-resize',edit:d=>({props:{minX:start+d.x}})},
      {id:'end',label:'Wrap area end',fields:['maxX'],point:{x:right,h:h((low+high)/2)},...(v?{space:'screen' as const}:{}),cursor:'ew-resize',edit:d=>({props:{maxX:end+d.x}})},
      {id:'bottom',label:'Minimum altitude',fields:['minAltitude'],point:{x:(left+right)/2,h:h(low)},...(v?{space:'screen' as const}:{}),cursor:'ns-resize',edit:d=>({props:{minAltitude:low+d.h}})},
      {id:'top',label:'Maximum altitude',fields:['maxAltitude'],point:{x:(left+right)/2,h:h(high)},...(v?{space:'screen' as const}:{}),cursor:'ns-resize',edit:d=>({props:{maxAltitude:high+d.h}})},
    ];
  }},
  bounds:(p,_s,c)=>{
    const o=flockOptions(p),fallback={x:-(o.margin??200)-32,h:(o.high??120)+40,w:(o.span??2400)+64,tall:(o.high??120)-(o.low??0)+80};
    return c?screenBounds(c,flockRegion(c.view,o,c.placement.x,c.placement.h),fallback):fallback;
  },
  travelBounds:(p,_s,c)=>{const o=flockOptions(p),depth=Math.max(.05,Math.min(...(o.parallax??[.7,1]))),left=-(o.margin??200)-20,right=(o.span??2400)-(o.margin??200)+20;const origin=c?.placement.x??0;return{x:(origin+left)/depth-origin,h:(o.high??120)+20,w:(right-left)/depth,tall:(o.high??120)-(o.low??0)+40};},
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view, props, _state, _pass, at) => drawFlock(ctx, view, flockOptions(props), at.x, at.h),
};
