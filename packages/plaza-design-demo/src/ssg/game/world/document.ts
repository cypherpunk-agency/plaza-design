/** Read-only JSON index of the shipping world. Geometry and rules continue to belong to city.ts. */
import type { Composition } from '../art/core/composition';
import type { Sequence } from '../art/core/timeline';
import { SCENES, type SceneDef, type SceneId } from '../scenes';
import { DISTRICTS, DISTRICT_MAP, DISTRICT_REVEAL, LINE, LINES_PLANNED, LINKS, LOOP_MAP, MAP_H, MAP_W, PAD_MAP, PLACE_IN_VIEW, PLACE_MAP, PLACES, SCENE_PLACE, STANDS, STAND_IDS, STATIONS, STATION_MAP, type PlaceId } from './city';
import { AVENUES, CANAL, CANAL_W, COAST, FENCE, ISLE, PARK, planProblems } from './cityplan';

export interface WorldSequenceReference { id: string; scene: string; entrance?: string }
export interface WorldDocumentContext {
  /** Real validated composition documents, keyed by their authoring document id. */
  compositions: Readonly<Record<string, Composition>>;
  /** Registered sequence destinations. No placeholder paths or invented destinations. */
  sequences?: readonly Pick<Sequence, 'id' | 'handoff'>[];
}
const own = (v: object, key: string) => Object.prototype.hasOwnProperty.call(v, key);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function fail(at: string, message: string): never { throw new Error(`${at}: ${message}`); }
function json(value: unknown, at = 'world', parents = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (typeof value !== 'object' || parents.has(value!)) fail(at, 'expected finite, acyclic JSON data');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail(at, 'expected a plain JSON object');
  parents.add(value!);
  for (const [key, child] of Object.entries(value!)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(`${at}.${key}`, 'reserved key');
    json(child, `${at}.${key}`, parents);
  }
  parents.delete(value!);
}
/** Index equality is intentionally strict: the first composer cannot change world structure. */
function identical(value: unknown, expected: unknown, at = 'world'): void {
  if (Array.isArray(expected)) {
    if (!Array.isArray(value) || value.length !== expected.length) fail(at, 'shipping world array length/order must be preserved');
    expected.forEach((child, i) => identical(value[i], child, `${at}[${i}]`));
    return;
  }
  if (object(expected)) {
    if (!object(value)) fail(at, 'expected an object');
    for (const key of Object.keys(value)) if (!own(expected,key)) fail(`${at}.${key}`, 'unknown world field');
    for (const [key, child] of Object.entries(expected)) {
      if (!own(value,key)) fail(`${at}.${key}`, 'required world field missing');
      identical(value[key],child,`${at}.${key}`);
    }
    return;
  }
  if (value !== expected) fail(at, `read-only shipping value must remain ${JSON.stringify(expected)}`);
}
function connections(scene: SceneDef) {
  return scene.exits.map(e => ({
    id:e.id, to:e.to, at:e.at ?? null, action:e.action ?? null,
    requires:e.requires ?? null, sets:e.sets ?? null, needs:e.needs ?? null,
    edge:e.edge ?? null, engine:e.engine ?? false,
    checkpoint:!!e.checkpoint,
  }));
}
/** Adapt existing registries; local x/h/attachment markers belong in scene compositions, never here. */
export function snapshotWorld(sceneCompositions: Readonly<Record<string,string>>, sequences: readonly WorldSequenceReference[] = []) {
  for (const id of Object.keys(sceneCompositions)) if (!own(SCENES,id)) fail(`world.scenes.${id}`, 'unknown scene');
  for (const id of Object.keys(SCENES)) if (!own(sceneCompositions,id) || !sceneCompositions[id]) fail(`world.scenes.${id}.composition`, 'a real composition reference is required');
  return structuredClone({
    version:1 as const,
    map:{
      width:MAP_W, height:MAP_H,
      geometry:{coast:COAST,island:ISLE,canal:CANAL,canalWidth:CANAL_W,avenues:AVENUES,park:PARK,fence:FENCE},
      districts:DISTRICTS.map(d=>({...d,plan:DISTRICT_MAP[d.id]})),
      places:PLACES.map(p=>({...p,mapPosition:PLACE_MAP[p.id] ?? null})),
    },
    scenes:(Object.keys(SCENES) as SceneId[]).map(id=>({id,place:SCENE_PLACE[id],composition:sceneCompositions[id],exits:connections(SCENES[id])})),
    transport:{
      metro:{id:'line0',order:LINE,stations:LINE.map(id=>({id,...STATIONS[id],mapPosition:STATION_MAP[id]})),path:LOOP_MAP},
      taxi:STAND_IDS.map(id=>({id,...STANDS[id],mapPosition:PAD_MAP[id]})),
      plannedLines:LINES_PLANNED,links:LINKS,
    },
    rules:{
      discovery:{districts:DISTRICT_REVEAL,placesInView:PLACE_IN_VIEW},
      references:['districtStage','placeKnown','stationKnown','linkKnown','placeBlocked','harborOpen'],
    },
    sequences:[...sequences],
  });
}
export type WorldDocument = ReturnType<typeof snapshotWorld>;

function destination(scene: string, entrance: string | undefined, at: string): void {
  if (!own(SCENES,scene)) fail(`${at}.scene`, `unknown destination ${JSON.stringify(scene)}`);
  if (entrance !== undefined && !(SCENES[scene as SceneId] as SceneDef).exits.some(e=>e.id===entrance)) fail(`${at}.entrance`, `unknown entrance ${JSON.stringify(entrance)} in ${scene}`);
}
/** Validate ids and cross references, then enforce the unchanged shipping world and its real rules. */
export function validateWorldDocument(value: unknown, context: WorldDocumentContext): WorldDocument {
  json(value);
  if (!object(value) || value.version !== 1) fail('world.version','expected version 1');
  if (!Array.isArray(value.scenes)) fail('world.scenes','expected scene references');
  const refs: Record<string,string> = Object.create(null);
  value.scenes.forEach((s: unknown,i: number)=>{
    const at=`world.scenes[${i}]`;
    if (!object(s) || typeof s.id !== 'string' || !own(SCENES,s.id)) fail(`${at}.id`,'unknown scene');
    if (own(refs,s.id)) fail(`${at}.id`,'duplicate scene');
    if (typeof s.composition !== 'string' || !own(context.compositions,s.composition)) fail(`${at}.composition`,'unknown composition');
    if (context.compositions[s.composition].scene !== s.id) fail(`${at}.composition`,'composition belongs to another scene');
    refs[s.id]=s.composition;
  });
  const sequences: WorldSequenceReference[]=(context.sequences ?? []).flatMap(s=>s.handoff ? [{id:s.id,...s.handoff}] : []);
  const sequenceIds=new Set<string>();
  sequences.forEach((s,i)=>{
    if (sequenceIds.has(s.id)) fail(`world.sequences[${i}].id`,'duplicate sequence');
    sequenceIds.add(s.id);destination(s.scene,s.entrance,`world.sequences[${i}]`);
  });
  const expected=snapshotWorld(refs,sequences);
  identical(value,expected);
  // Current land/district/frame constraints stay authoritative and are also checked by the build.
  const problems=planProblems();
  if(problems.length) fail('world.map',problems.join('; '));
  expected.map.places.forEach((p,i)=>{
    if(!p.scenes.includes(p.entrance)) fail(`world.map.places[${i}].entrance`,'entrance is outside the place');
    destination(p.entrance,p.at,`world.map.places[${i}]`);
  });
  expected.scenes.forEach((s,i)=>s.exits.forEach((e,j)=>{
    if(e.to) destination(e.to,e.at ?? undefined,`world.scenes[${i}].exits[${j}]`);
    else if(!e.action) fail(`world.scenes[${i}].exits[${j}].to`,'empty destination requires a registered action');
  }));
  return structuredClone(expected);
}
/** Pretty JSON for a cross-reference index; this does not replace the runtime city registries. */
export const serializeWorldDocument = (value: unknown, context: WorldDocumentContext) => JSON.stringify(validateWorldDocument(value,context),null,2)+'\n';
export const worldPlace = (document: WorldDocument, id: PlaceId) => structuredClone(document.map.places.find(p=>p.id===id)!);
