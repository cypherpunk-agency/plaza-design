import type {FlowPicture} from '../../engine/people';
/**
 * CHARACTER KIT: a people flow as placeable artwork (world/people-flow.ts, SEAMLESS-WORLD §5). The flow's model says
 * where each person is at flow seconds `t` (walking, queueing, boarding a vehicle when its doors open, riding an
 * escalator up); this piece draws each one with the kit's bodies (runtime/characters.ts), nobody appearing or
 * vanishing except where the route begins and ends. First used by the title glide (the Galleria's escalator, the
 * Harbor Station's riders boarding the train), now for any zone.
 *
 * `clock`: `frame` flows on the frame clock (seconds of `View.t`), `sequence` on a sequence's seconds (visual
 * `sequenceTime`, which a sequence's controller supplies), so a crowd boards the timeline's train. `vehicle`: the
 * one vehicle a `board` step waits for (its doors, in world units east of the piece, open from `open` seconds).
 * Route points are world units east of the piece and heights over the ground line.
 */
import type { Element, Properties, Value } from '../core/composition';
import { drawCharacterFrame } from './appearance';
import { prepareCharacter, type Character } from '../../runtime/characters';
import { residentCharacter } from './resident';
import {riderCharacter,KINDS,type RiderKind} from './riders';
import { flowPeople, type FlowSource, type FlowVehicle, type FlowWorld } from '../../world/people-flow';
import { EMPTY_ZONE_GRAPH } from '../../world/zone-graph';

const n = (p: Properties, k: string) => Number(p[k]);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const ZONE = 'here';

function validFlow(v: Value) {
  if (!object(v) || !object(v.spawn) || !Array.isArray(v.route) || v.route.length < 1 || v.route.length > 24 || typeof v.seed !== 'number') throw new Error('Flow: expected { seed, speed, spawn, route }');
  for (const w of v.route) if (!object(w) || !['walk', 'wait', 'queue', 'board', 'leave'].includes(String(w.kind)) || typeof w.x !== 'number' || w.h !== undefined && typeof w.h !== 'number') throw new Error('Flow: each route point is { kind, x, h }');
}

const sources = new WeakMap<object, FlowSource>(), looksOf = new WeakMap<object, Character[]>(), worlds = new WeakMap<object, FlowWorld>();
function source(p: Properties): FlowSource {
  const key = p.flow as object; let s = sources.get(key); if (s) return s;
  const f = p.flow as unknown as { seed: number; speed?: number; spawn: FlowSource['spawn']; route: { kind: string; x: number; h?: number }[]; maxWait?: number };
  s = { id: 'flow', clock: 'scene', seed: f.seed, ...(f.speed ? { speed: f.speed } : {}), ...(f.maxWait ? { maxWait: f.maxWait } : {}), spawn: f.spawn,
    looks: (p.looks as unknown[]).map((_, i) => String(i)), route: f.route.map(w => ({ ...w, zone: ZONE })) as unknown as FlowSource['route'] };
  sources.set(key, s); return s;
}
function looks(p: Properties): Character[] {
  const key = p.looks as object; let l = looksOf.get(key); if (l) return l;
  l = (p.looks as unknown as Properties[]).map(look => typeof look.rider==='string'?riderCharacter(look.rider as RiderKind,Number(look.phase??0),false,Number(look.ps??3)):residentCharacter({ kind: 'human', act: 'stand', depth: 'play', ...look }, { x: 0, h: 0 }));
  looksOf.set(key, l); return l;
}
function world(p: Properties): FlowWorld {
  const key = p as object; let w = worlds.get(key); if (w) return w;
  const v = p.vehicle as unknown as { id: string; doors: number[]; open: number; close: number } | null;
  const vehicle: FlowVehicle | undefined = v && Array.isArray(v.doors) ? { id: v.id, tripAt: () => 0, doors: k => k === 0 ? { trip: 0, open: v.open, close: v.close, doors: v.doors.map(x => ({ zone: ZONE, x })) } : null } : undefined;
  w = { graph: EMPTY_ZONE_GRAPH, vehicles: vehicle ? { [vehicle.id]: vehicle } : {} };
  worlds.set(key, w); return w;
}

export const flowElement: Element = {
  type: 'character.flow', version: 1, label: 'People flow: walkers, queues, riders boarding (character kit)', category: 'characters', coordinates: 'world', libraryUse: 'reusable', parts: ['people'],
  fields: {
    flow: { kind: 'json', label: 'Flow (seed, speed, spawn, route)', default: { seed: 1, speed: 21, spawn: { kind: 'interval', every: 7 }, route: [{ kind: 'walk', x: 0, h: 0 }, { kind: 'leave', x: 300, h: 0 }] }, validate: validFlow },
    looks: { kind: 'json', label: 'Looks (resident fields, or rider/phase/ps)', default: [{ seed: 1 }], validate: v => { if (!Array.isArray(v) || !v.length || v.length > 24 || !v.every(object)) throw new Error('Looks: expected a list of resident looks');for(const look of v as Record<string,Value>[])if(look.rider!==undefined&&(!KINDS.includes(look.rider as RiderKind)||look.phase!==undefined&&(typeof look.phase!=='number'||!Number.isFinite(look.phase)||look.phase<0)||look.ps!==undefined&&(typeof look.ps!=='number'||!Number.isFinite(look.ps)||look.ps<1||look.ps>6)))throw Error('Invalid flow rider look'); } },
    vehicle: { kind: 'json', label: 'The vehicle a board step waits for (id, doors, open, close) or null', default: null, validate: v => { if (v !== null && !(object(v)&&typeof v.frame==='string'&&typeof v.board==='string'&&typeof v.alight==='string') && !(object(v) && typeof v.id === 'string' && Array.isArray(v.doors) && v.doors.every(d => typeof d === 'number') && typeof v.open === 'number' && typeof v.close === 'number')) throw new Error('Vehicle: expected { id, doors, open, close } or null'); } },
    clock: { kind: 'select', label: 'Clock', options: ['frame', 'sequence','scene'], default: 'frame' },
    exit:{kind:'json',label:'Walk after alighting',default:[{kind:'leave',x:300,h:0}],validate:v=>{if(!Array.isArray(v)||!v.length||v.length>24||!v.every(w=>object(w)&&['walk','wait','leave'].includes(String(w.kind))&&typeof w.x==='number'))throw Error('Exit route needs walk, wait or leave points');}},
    ride: { kind: 'number', label: 'Riding step (people stand on it; -1 none)', default: -1, min: -1, max: 24, step: 1 },
    lift: { kind: 'number', label: 'Riders stand this much higher on the moving step', default: 6, min: 0, max: 60 },
  },
  visualFields: { people:{kind:'json',label:'Prepared live passengers',default:null,validate:v=>{if(v!==null&&(!Array.isArray(v)||v.length>128||!v.every(p=>object(p)&&typeof p.x==='number'&&typeof p.h==='number')))throw Error('Invalid prepared people');}}, sequenceTime: { kind: 'number', label: 'Sequence seconds', default: -1, animatable: true } },
  bounds: (p,state) => { const r = [...(p.flow as unknown as { route: { x: number;h?:number }[] }).route,...(p.exit as unknown as {x:number;h?:number}[]),...((state.people as unknown as FlowPicture[]|null)??[])], a = Math.min(...r.map(w => w.x)), b = Math.max(...r.map(w => w.x)),lo=Math.min(...r.map(w=>w.h??0)),hi=Math.max(...r.map(w=>w.h??0)); return { x: a - 20, h: hi+160, w: b - a + 40, tall: hi-lo+220 }; },
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(x, v, p, state, _pass, at) {
    const t = p.clock === 'sequence' ? (Number(state.sequenceTime)>=0?Number(state.sequenceTime):v.sequence?.time??-1) : v.t / 60;
    if (!(t >= 0)) return;
    const live=state.people as unknown as FlowPicture[]|null;
    const flow = source(p), body = looks(p), f = v.t, ride = n(p, 'ride');
    for (const person of live??flowPeople(flow, world(p), t)) {
      if ('state'in person && person.state !== 'here') continue;
      const riding = 'step'in person && person.step === ride, moving = person.act === 'walk' && !riding;
      const sx = v.sx(at.x + person.x, at.parallax);
      if (sx < -180 || sx > v.viewW + 180) continue;
      const recipe=(p.looks as unknown as Properties[])[Number(person.look)]??(p.looks as unknown as Properties[])[0];
      const look = typeof recipe.rider==='string'?riderCharacter(recipe.rider as RiderKind,Number(recipe.phase??0),person.act==='sit',Number(recipe.ps??3)):body[Number(person.look)] ?? body[0];
      const pose = prepareCharacter(look, f, { x: 0, h: 0, act: person.act==='sit'?(typeof recipe.rider==='string'?look.act:'sit'):moving ? 'walk' : person.act === 'queue' ? 'queue' : typeof recipe.rider==='string'?look.act:'stand',...('seat'in person?{seat:Number(person.seat)}:{}), facing: person.facing as 1 | -1 }, moving);
      if (!pose.visible) continue;
      const y = v.y(at.h + (person.h ?? 0) + (riding && person.h !== undefined ? n(p, 'lift') : 0));
      x.save(); x.translate(Math.round(sx), Math.round(y));
      try { drawCharacterFrame(x, { ...v, sx: wx => wx, y: h => -h, gy: 0 }, pose.character, pose.ready!, pose.pixelSize!, pose.frame!, pose.height!); } finally { x.restore(); }
    }
  },
};
