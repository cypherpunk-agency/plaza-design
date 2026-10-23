/**
 * Flocks: birds wheeling or drifting overhead, drawn with the character kit's gull (its flying pose) or
 * the Registry's robot gull. A flock is plain data: how many, a seed, an altitude band, a parallax range
 * and a drift, or an explicit list of birds when a scene keeps its own. The kit owns how a bird looks and
 * flaps; this file only says where each one is.
 */
import { drawDriven, type Character } from '../../runtime/characters';
import type { View } from '../core/view';
import type { Element, Properties } from '../core/composition';

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

/** Screen rectangles of the visible birds (editor hit areas); about 6 cells wide a bird at its pixel size. */
export function flockRects(v: View, o: FlockOptions, x0 = 0, h0 = 0) {
  return flockAt(o, v.t, x0, h0).map(b => { const s = screenX(v,o,b), y = v.y(b.h); return { x: Math.round(s) - 6 * b.ps, y: Math.round(y) - 5 * b.ps, w: 12 * b.ps, h: 6 * b.ps }; })
    .filter(r => r.x + r.w >= -10 && r.x <= v.viewW + 10);
}

const num = (p: Properties, k: string, d: number) => { const n = Number(p[k]); return Number.isFinite(n) ? n : d; };
/** The flock's options from element properties. */
export function flockOptions(p: Properties): FlockOptions {
  return {
    bob:num(p,'bob',8),screenWrap:p.screenWrap===true,kind: p.kind === 'robogull' ? 'robogull' : 'gull', appearance: p.appearance as FlockOptions['appearance'], count: num(p, 'count', 7), seed: num(p, 'seed', 1),
    low: num(p, 'low', 0), high: num(p, 'high', 120), parallax: [num(p, 'parallaxFar', 0.7), num(p, 'parallaxNear', 1)],
    drift: [num(p, 'driftMin', 0.25), num(p, 'driftMax', 0.6)], wander: num(p, 'wander', 0), span: Math.max(100, num(p, 'span', 2400)), margin: num(p, 'margin', 200),
    ps: Math.max(1, Math.min(3, Math.round(num(p, 'ps', 1)))), big: num(p, 'big', 0),
  };
}
const n = (label: string, d: number, min?: number, max?: number, step?: number) => ({ kind: 'number' as const, label, default: d, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(step !== undefined ? { step } : {}) });
export const flockElement: Element = {
  type: 'character.flock', version: 1, label: 'Flock of gulls (kit)', category: 'characters', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    appearance: {kind:'select',label:'Bird drawing',options:['kit','white silhouette','grey silhouette'],default:'kit'},
    kind: { kind: 'select', label: 'Bird', options: ['gull', 'robogull'], default: 'gull' },
    bob:n('Vertical sway',8,-100,100),screenWrap:{kind:'boolean',label:'Wrap after parallax',default:false},
    count: n('Birds', 7, 1, 60, 1), seed: n('Seed', 1, 0, 1000000, 1),
    low: n('Lowest (over placement)', 0), high: n('Highest (over placement)', 120),
    parallaxFar: n('Parallax, furthest', 0.7, 0.05, 2, 0.05), parallaxNear: n('Parallax, nearest', 1, 0.05, 2, 0.05),
    driftMin: n('Drift, slowest', 0.25, -3, 3, 0.05), driftMax: n('Drift, fastest', 0.6, -3, 3, 0.05), wander: n('Wheeling', 0, 0, 1000, 10),
    span: n('Span', 2400, 100, 20000, 10), margin: n('Starts before x', 200, 0, 5000, 10),
    ps: n('Pixel size', 1, 1, 3, 1), big: n('Share one size bigger', 0, 0, 1, 0.05),
  },
  bounds: p => { const o = flockOptions(p); return { x: -(o.margin ?? 200), h: (o.high ?? 120) + 16, w: o.span ?? 2400, tall: (o.high ?? 120) - (o.low ?? 0) + 24 }; },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (ctx, view, props, _state, _pass, at) => drawFlock(ctx, view, flockOptions(props), at.x, at.h),
};
