/** Library-specific binding adapter. Compositions own placement; this module owns named runtime bindings. */
import { drawComposition, resolveComposition, type Composition, type Environment, type Properties, type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { ArtworkInputs } from '../../art/assemblies/library';
import { prepareCharacter, type Character, type PreparedCharacter } from '../../runtime/characters';
import type { EngineDraw } from '../../engine/host';
import type { SceneData } from '../../data/types';
import document from './composition.json';

import { art } from '../../art';
export const libraryArt = art;
export const libraryComposition = libraryArt.validate(document);
const actorIds = ['shelfe', 'librarian', 'student', 'kid', 'sleeper', 'knitter', 'paper', 'cat'];
const deviceIds = ['reader', 'session', 'printer'];
const sources = new Set(['architecture.windows', 'catalog.connected', ...deviceIds.map(id => 'device.' + id + '.hover'), ...actorIds.map(id => 'actor.' + id + '.pose')]);

/** Refuse unresolved game bindings even if the artwork document is structurally valid. */
export function validateLibraryComposition(input: unknown): Composition {
  const doc = libraryArt.validate(input);
  if (doc.scene !== 'library') throw new Error('Expected library composition');
  for (const instance of doc.instances) {
    for (const source of Object.values(instance.bindings ?? {})) if (!sources.has(source)) throw new Error(instance.id + ': unknown library binding ' + source);
    if (instance.type === 'library.person' && (!actorIds.includes(String(instance.props.actor)) || instance.bindings?.pose !== 'actor.' + instance.props.actor + '.pose')) throw new Error(instance.id + ': missing actor pose binding');
  }
  for (const id of ['room', 'spawn', 'downtown-door', 'notice', 'terminal-3', 'reference-book', 'armchair-4', ...deviceIds, ...actorIds]) if (!doc.instances.some(i => i.id === id)) throw new Error('Missing gameplay-bound library instance: ' + id);
  for (const id of actorIds) if (doc.instances.filter(i => i.type === 'library.person' && i.props.actor === id).length !== 1) throw new Error('Library actor must have one bound instance: ' + id);
  for (const [id, type] of [['reader', 'card-reader'], ['session', 'session-timer'], ['printer', 'printer'], ['spawn', 'spawn-marker'], ['downtown-door', 'door']]) if (doc.instances.find(i => i.id === id)!.type !== 'library.' + type) throw new Error(id + ': incompatible gameplay-bound artwork type');
  return doc;
}
validateLibraryComposition(libraryComposition);
const geometryView: View = { sx: x => x, y: h => -h, gy: 0, t: 0, cam: 0, viewW: 960, viewH: 360, flags: {} };
function defaults(doc: Composition): Record<string, Value> {
  const result: Record<string, Value> = {};
  for (const instance of doc.instances) for (const [field, source] of Object.entries(instance.bindings ?? {})) result[source] = libraryArt.get(instance.type).visualFields![field].default;
  return result;
}
export function libraryGeometry(doc: Composition = libraryComposition) {
  return resolveComposition(libraryArt, doc, { view: geometryView, state: {}, bindings: defaults(doc), reduced: false });
}
/** Existing scene-facing layout derives from editable source, including attached furniture and people. */
export function libraryLayout(doc: Composition = libraryComposition): ArtworkInputs['L'] {
  const geometry = libraryGeometry(doc), get = (id: string) => { const row = geometry.find(row => row.instance.id === id); if (!row) throw new Error('Missing library layout ' + id); return row; };
  const x = (id: string) => get(id).placement.x;
  const counter = get('counter'), radiator = get('radiator');
  return {
    door: x('downtown-door'), spawn: x('spawn'), notice: x('notice'), reader: x('reader'),
    desks: [1, 2, 3].map(i => x('terminal-' + i)), seats: [1, 2, 3].map(i => x('terminal-' + i) + Number(get('terminal-' + i).props.seatOffset)), timer: x('session'),
    counter: { x0: counter.placement.x, x1: counter.placement.x + Number(counter.props.width), h: Number(counter.props.height) },
    librarian: x('librarian'), printer: x('printer'), book: x('reference-book'), chairs: [1, 2, 3, 4].map(i => x('armchair-' + i)),
    radiator: { x0: radiator.placement.x, x1: radiator.placement.x + Number(radiator.props.width), h: Number(radiator.props.height) }, cat: x('cat'),
    windows: geometry.filter(row => row.instance.type === 'library.window').map(row => [row.placement.x, row.placement.x + Number(row.props.width)]),
    shelves: { x0: x('shelves'), x1: x('shelves') + Number(get('shelves').props.width) },
  };
}
export const libraryWidth = Number(libraryGeometry().find(row => row.instance.id === 'room')!.props.width);

/** Apply source placement before the runtime's actor caches are initialized. */
export function bindLibraryActors(actors: Readonly<Record<string, Character>>, doc: Composition = libraryComposition) {
  for (const row of libraryGeometry(doc).filter(row => row.instance.type === 'library.person')) {
    const actor = actors[String(row.props.actor)];
    if (!actor) throw new Error('Unknown library actor ' + row.props.actor);
    const dx = row.placement.x - actor.x;
    if (Array.isArray(actor.range)) actor.range = [actor.range[0] + dx, actor.range[1] + dx];
    actor.x = row.placement.x;
    if (actor.h !== undefined || row.placement.h !== 0) actor.h = row.placement.h;
  }
}

/** The three existing device spots follow their document instances without changing ids or noun geometry. */
export function libraryDeviceData(source: SceneData, doc: Composition = libraryComposition): SceneData {
  const result = structuredClone(source), geometry = libraryGeometry(doc);
  for (const id of deviceIds) {
    const position = geometry.find(row => row.instance.id === id)!.placement;
    const spot = result.devices.find(device => device.id === id)!.layout!.spot!;
    spot.x = position.x;
    const h = id === 'printer' ? position.h - 2 : position.h;
    if (spot.y !== undefined || h !== 0) spot.y = h;
  }
  return result;
}
const value = (input: unknown): Value => input as Value;
/** Build explicit preview/runtime snapshots. Seeking or drawing never changes gameplay. */
export function libraryEnvironment(doc: Composition, view: View, engine: EngineDraw, actors: Readonly<Record<string, Character>>): Environment {
  const bindings = defaults(doc);
  for (const id of deviceIds) bindings['device.' + id + '.hover'] = engine.hover === id;
  bindings['catalog.connected'] = engine.m.net.get('catalog') === 'connected';
  const geometry = resolveComposition(libraryArt, doc, { view, state: {}, bindings, reduced: false });
  bindings['architecture.windows'] = geometry.filter(row => row.instance.type === 'library.window').map(row => [row.placement.x, row.placement.x + Number(row.props.width)]);
  for (const row of geometry.filter(row => row.instance.type === 'library.person')) {
    const id = String(row.props.actor), actor = actors[id];
    if (!actor) throw new Error('Unknown library actor: ' + id);
    let pose: PreparedCharacter = prepareCharacter(actor, view.t);
    if (pose.visible) {
      const dx = row.placement.x - actor.x, dh = row.placement.h - (actor.h ?? 0);
      pose = { ...pose, character: { ...pose.character, x: row.placement.x, h: row.placement.h }, frame: { ...pose.frame, x: pose.frame.x + dx }, height: pose.height + dh };
    }
    bindings['actor.' + id + '.pose'] = value(pose);
  }
  return { view, state: {} as Record<string, Properties>, bindings, reduced: false };
}
export type LibraryRenderOptions = Partial<Pick<Environment, 'visibility' | 'opacity' | 'clips' | 'sequenceTime' | 'reduced'>>;
export function drawLibraryComposition(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, actors: Readonly<Record<string, Character>>, doc = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}) {
  const env = libraryEnvironment(doc, view, engine, actors);
  drawComposition(ctx, libraryArt, doc, { ...env, state, ...options }, 'backdrop');
}
