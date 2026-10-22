import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import type{Properties,Composition}from'../../art/core/composition';
import type{TimelineDocument}from'../../art/core/timeline';
import{openingRegistry}from'../../art/sequences/opening/sequence';
import{PEOPLE as COAST,RIDERS_UP,ESCALATOR_FLOW,ESCALATOR_RIDE_STEP}from'../../art/sequences/opening/coast';
import{PEOPLE as TOWN}from'../../art/sequences/opening/town';
import{WAITING,HARBOR_RIDERS,harborFlows,harborTrain}from'../../art/sequences/opening/finale';
import type{FlowActor}from'../../art/sequences/opening/poses';
import{BOATER}from'../../art/architecture/cutaway';
import{flowPeople,type FlowSource,type FlowVehicle,type FlowWorld}from'../../world/people-flow';
import{EMPTY_ZONE_GRAPH}from'../../world/zone-graph';
const actors = new WeakMap<Character, Map<string, Character>>();
export function pieceActor(source: Character, props: Properties | undefined): Character {
  if (!props) return source;
  const changes: Partial<Character> = {};
  if (typeof props.seed === 'number' && props.seed !== (source.seed ?? Math.round(source.x * 7 + 3))) changes.seed = props.seed;
  if (typeof props.act === 'string' && props.act !== (source.act ?? 'stand')) changes.act = props.act as Character['act'];
  if (typeof props.dim === 'number' && props.dim !== (source.dim ?? 0)) changes.dim = props.dim;
  if (typeof props.speed === 'number' && props.speed !== (source.speed ?? 0)) { if (props.speed > 0) changes.speed = props.speed; }
  if (!Object.keys(changes).length) return source;
  let cache = actors.get(source); if (!cache) { cache = new Map(); actors.set(source, cache); }
  const key = JSON.stringify(changes); let actor = cache.get(key); if (!actor) { actor = { ...source, ...changes }; cache.set(key, actor); } return actor;
}

/** Where the glide's eastbound train stops at the Harbor Station: the last key of the timeline's `line0.train` track (its nose X, and when). */
export function harborStop(timeline: TimelineDocument): { nose: number; time: number } | undefined {
  const track = timeline.sequences.find(s => s.id === 'glide')?.tracks?.find(t => t.target.kind === 'state' && t.target.instance === 'line0' && t.target.property === 'train');
  const last = track?.keys?.[track.keys.length - 1];
  return last && typeof last.value === 'number' && last.value >= 0 ? { nose: last.value, time: last.time } : undefined;
}
/** The doors open this long after the train has stopped (glide seconds). */
const DOORS_AFTER = 0.6;
const harborCache = new WeakMap<TimelineDocument, { flows: FlowSource[]; world: FlowWorld } | null>();
function harbor(timeline: TimelineDocument) {
  if (harborCache.has(timeline)) return harborCache.get(timeline)!;
  const stop = harborStop(timeline), train: FlowVehicle | undefined = stop && harborTrain(stop.nose, stop.time + DOORS_AFTER);
  const out = stop && train ? { flows: harborFlows(stop.nose), world: { graph: EMPTY_ZONE_GRAPH, vehicles: { [train.id]: train } } } : null;
  harborCache.set(timeline, out); return out;
}
const ESCALATOR_WORLD: FlowWorld = { graph: EMPTY_ZONE_GRAPH, vehicles: {} };

/**
 * A people flow's people at flow seconds `t` as prepared poses, keyed `prefix + person key`: each carries where the
 * flow has them (`FlowActor.flow`); the drawing places them there. Walking people step, queueing people wait, riders
 * on a `ride` step stand. Facing is turned for the screen (X runs right to left). Aboard or gone: no pose.
 */
function flowActors(out: Record<string, PreparedCharacter>, prefix: string, flows: readonly FlowSource[], world: FlowWorld, t: number, f: number, looks: readonly Character[], ride?: number) {
  for (const flow of flows) for (const p of flowPeople(flow, world, t)) {
    if (p.state !== 'here') continue;
    const riding = p.step === ride, moving = p.act === 'walk' && !riding;
    const pose = prepareCharacter(looks[Number(p.look)] ?? looks[0], f, { x: 0, h: 0, act: moving ? 'walk' : p.act === 'queue' ? 'queue' : 'stand', facing: (-p.facing) as 1 | -1 }, moving);
    out[prefix + p.key] = { ...pose, flow: { x: p.x, h: p.h } } as FlowActor;
  }
}

/**
 * Every opening actor's prepared pose at title seconds `time`. `glide`: seconds into the glide and its timeline,
 * for the Harbor Station's crowd, which boards on the timeline's train (none on the title).
 */
export function openingActorSnapshots(time:number,reduced:boolean,doc?:Composition,glide?:{tau:number;timeline:TimelineDocument}):Readonly<Record<string,PreparedCharacter>>{
  const f=reduced?0:time*60,result:Record<string,PreparedCharacter>={};
  for(const[i,w]of COAST.entries())result['coast.person-'+i]=prepareCharacter(w.c,f);
  for(const[i,w]of TOWN.entries())result['people.person-'+i]=prepareCharacter(w.c,f);
  // the escalator's riders: a flow on the title's clock (reduced motion: held where they are at 30 s)
  flowActors(result,'escalator.',[ESCALATOR_FLOW],ESCALATOR_WORLD,reduced?30:time,f,RIDERS_UP,ESCALATOR_RIDE_STEP);
  for(const[i,w]of WAITING.entries())result['line0.'+i]=prepareCharacter(w.c,f);
  const h=glide&&harbor(glide.timeline);
  if(h&&glide)flowActors(result,'harbor.',h.flows,h.world,glide.tau,f,HARBOR_RIDERS);
  result.canal=prepareCharacter(BOATER,f);
  const walk=(rows:Composition['instances'])=>rows.forEach(row=>{let source:Character|undefined;if(row.type.startsWith('sequence.opening.coast-mid.person-'))source=COAST[Number(row.type.split('person-')[1])]?.c;if(row.type.startsWith('sequence.opening.people.person-'))source=TOWN[Number(row.type.split('person-')[1])]?.c;if(source)result[row.id]=prepareCharacter(pieceActor(source,openingRegistry.properties(row.type,row.props)),f);walk(row.children??[]);});if(doc)walk(doc.instances);return result;}
