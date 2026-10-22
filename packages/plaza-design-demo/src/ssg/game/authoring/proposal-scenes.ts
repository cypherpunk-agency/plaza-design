/**
 * Proposal scenes: editor-only redraws of an existing scene, for trying a new look without touching
 * the shipping scene. Each keeps its own composition file and borrows its base scene. How it borrows
 * is the composition's own `scene.base` piece (Layout, logic layer; art/assemblies/scene-base.ts):
 * - play (no piece, or `use: play`): the base scene's whole native definition (sky, weather, lighting,
 *   devices, people, exits), so it renders and plays exactly as the base would with different artwork.
 *   The composition must then carry every piece the base's manifest names.
 * - look (`use: look`): only the base's look: its district climate (weather, time), its environment's
 *   sky, weather, facing and indoor/outdoor, and its stage lamps and casters. No gameplay, devices,
 *   people, exits or mechanisms (Downtown's street layers need Downtown's own roles); the piece's
 *   `width` is the frame's width and the player row its spawn. A look frame is previewed, not played.
 * They are not registered with the game, the city or Play.
 */
import { art } from '../art';
import { withFrontMasks } from '../art/buildings/masks';
import { PLAYER_ROW, type Composition, type Instance } from '../art/core/composition';
import { SCENE_BASE } from '../art/assemblies/scene-base';
import { folderSceneDefinition } from '../engine/gameplay/folder-scene';
import { emptyDeviceSource } from '../engine/empty-data';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import type { GameplayDefinition } from '../engine/gameplay/types';
import { FOLDER_BY_ID, FOLDER_DIRS } from '../scenes/folder-scenes';
import { nativeSceneAdapters } from './scene-adapters';
import type { NativeSceneAdapter } from './native-preview';

export interface ProposalScene { id: string; base: string; file: string; label: string; district: string }
export const PROPOSAL_SCENES: ProposalScene[] = [
  { id: 'downtown-next', base: 'downtown', file: 'art/proposals/downtown-next.composition.json', label: 'Downtown · proposal', district: 'downtown' },
  // District reference streets (Tommi, 2026-10-21): one street per district from kit pieces only, to compare identities.
  // They borrow the Tower lab's empty scene (no people, devices or story of its own).
  { id: 'market-street', base: 'tower', file: 'art/proposals/market-street.composition.json', label: 'Neon Market · reference street', district: 'market' },
  { id: 'oldq-street', base: 'tower', file: 'art/proposals/oldq-street.composition.json', label: 'Old Quarter · reference street', district: 'oldq' },
  { id: 'spire-street', base: 'tower', file: 'art/proposals/spire-street.composition.json', label: 'Spire · reference street', district: 'spire' },
  { id: 'undercity-street', base: 'tower', file: 'art/proposals/undercity-street.composition.json', label: 'Undercity · reference street', district: 'undercity' },
  { id: 'fringe-street', base: 'tower', file: 'art/proposals/fringe-street.composition.json', label: 'The Fringe · reference street', district: 'fringe' },
  { id: 'skyport-street', base: 'tower', file: 'art/proposals/skyport-street.composition.json', label: 'Skyport · reference street', district: 'skyport' },
  // District interiors (Tommi, 2026-10-21): inside a district building, and inside its special place.
  { id: 'market-block', base: 'tower', file: 'art/proposals/market-block.composition.json', label: 'Neon Market · inside a block', district: 'market' },
  { id: 'market-hall-inside', base: 'tower', file: 'art/proposals/market-hall-inside.composition.json', label: 'Neon Market · inside the market hall', district: 'market' },
  { id: 'oldq-house', base: 'tower', file: 'art/proposals/oldq-house.composition.json', label: 'Old Quarter · inside a shophouse', district: 'oldq' },
  { id: 'oldq-church-inside', base: 'tower', file: 'art/proposals/oldq-church-inside.composition.json', label: 'Old Quarter · inside St. Agnes', district: 'oldq' },
  { id: 'spire-lobby', base: 'tower', file: 'art/proposals/spire-lobby.composition.json', label: 'Spire · the lobby', district: 'spire' },
  { id: 'spire-deck', base: 'tower', file: 'art/proposals/spire-deck.composition.json', label: 'Spire · a docking deck above the weather', district: 'spire' },
  // Second round of interiors and special places (Tommi, 2026-10-22).
  { id: 'market-hall-approach', base: 'tower', file: 'art/proposals/market-hall-approach.composition.json', label: 'Neon Market · approaching the market hall', district: 'market' },
  { id: 'market-block-roomy', base: 'tower', file: 'art/proposals/market-block-roomy.composition.json', label: 'Neon Market · inside a block, roomier', district: 'market' },
  { id: 'market-hall-tall', base: 'tower', file: 'art/proposals/market-hall-tall.composition.json', label: 'Neon Market · market hall, more floors and a basement', district: 'market' },
  { id: 'oldq-house-roomy', base: 'tower', file: 'art/proposals/oldq-house-roomy.composition.json', label: 'Old Quarter · inside a shophouse, roomier', district: 'oldq' },
  { id: 'oldq-church-yard', base: 'tower', file: 'art/proposals/oldq-church-yard.composition.json', label: 'Old Quarter · St. Agnes from its forecourt', district: 'oldq' },
  { id: 'spire-deck-landed', base: 'tower', file: 'art/proposals/spire-deck-landed.composition.json', label: 'Spire · docking deck with a ship landed', district: 'spire' },
  { id: 'undercity-entry', base: 'tower', file: 'art/proposals/undercity-entry.composition.json', label: 'Undercity · the way down', district: 'undercity' },
  { id: 'undercity-tunnels', base: 'tower', file: 'art/proposals/undercity-tunnels.composition.json', label: 'Undercity · tunnels and canals, several levels down', district: 'undercity' },
  { id: 'undercity-data-hall', base: 'tower', file: 'art/proposals/undercity-data-hall.composition.json', label: 'Undercity · the flooded data hall', district: 'undercity' },
  // Downtown everyday (dt-everyday, 2026-10-22): the FRESHCO supermarket, the 24h diner, the roofs and the billboard.
  // The diner takes Downtown's look (its scene.base piece: use look), so it gets Downtown's sky, weather and climate.
  { id: 'dt-freshco', base: 'tower', file: 'art/proposals/dt-freshco.composition.json', label: 'Downtown · FRESHCO supermarket: front, shop floor, stockroom', district: 'downtown' },
  { id: 'dt-diner', base: 'downtown', file: 'art/proposals/dt-diner.composition.json', label: 'Downtown · the 24h diner in the rain', district: 'downtown' },
  { id: 'dt-roofs', base: 'tower', file: 'art/proposals/dt-roofs.composition.json', label: 'Downtown · the roofs and the billboard catwalk', district: 'downtown' },
  // Downtown home ground (dt-home, 2026-10-22): the capsule block, Moth's walk-up, Kessel's room behind the fixer's kitchen.
  { id: 'dt-capsule-lobby', base: 'downtown', file: 'art/proposals/dt-capsule-lobby.composition.json', label: 'Downtown · the capsule block: lobby, flats, basement, courtyard', district: 'downtown' },
  { id: 'dt-moth-stairwell', base: 'downtown', file: 'art/proposals/dt-moth-stairwell.composition.json', label: 'Downtown · Moth’s walk-up: the stairwell up to 4C', district: 'downtown' },
  { id: 'dt-kessel-clinic', base: 'downtown', file: 'art/proposals/dt-kessel-clinic.composition.json', label: 'Downtown · the noodle stall, its kitchen and Kessel’s back room', district: 'downtown' },
  // Downtown civic (dt-civic, 2026-10-22): the Registry service point, its back office after hours, the substation and the sweep.
  { id: 'dt-registry', base: 'tower', file: 'art/proposals/dt-registry.composition.json', label: 'Downtown · the Registry service point: front, hall, back office, node', district: 'downtown' },
  { id: 'dt-registry-night', base: 'tower', file: 'art/proposals/dt-registry-night.composition.json', label: 'Downtown · the Registry after hours: the alarm at the node', district: 'downtown' },
  { id: 'dt-substation', base: 'tower', file: 'art/proposals/dt-substation.composition.json', label: 'Downtown · the substation: yard, transformers, control hut', district: 'downtown' },
  { id: 'dt-substation-cut', base: 'tower', file: 'art/proposals/dt-substation-cut.composition.json', label: 'Downtown · the substation after the power cut', district: 'downtown' },
  { id: 'dt-sweep', base: 'downtown', file: 'art/proposals/dt-sweep.composition.json', label: 'Downtown · the sweep: Registry vans, floodlights, ID checks (best at night)', district: 'downtown' },
  // Act I optional place (2026-10-22): the police precinct, where the Registry keeps a desk. Takes Downtown's look.
  { id: 'dt-precinct', base: 'downtown', file: 'art/proposals/dt-precinct.composition.json', label: 'Downtown · the police precinct: front desk, Registry liaison, holding cells, squad room', district: 'downtown' },
  // Metro train and platform lengths (Tommi, 2026-10-22): the whole train is walkable, so the platform is as long as the train.
  // Underground Downtown platforms with 2, 3, 4 and 6 cut-open cars at the player's scale (art/transit/metro-kit.ts); look frames.
  { id: 'metro-len-2', base: 'tower', file: 'art/proposals/metro-len-2.composition.json', label: 'Metro · 2-car train at an underground platform', district: 'downtown' },
  { id: 'metro-len-3', base: 'tower', file: 'art/proposals/metro-len-3.composition.json', label: 'Metro · 3-car train at an underground platform', district: 'downtown' },
  { id: 'metro-len-4', base: 'tower', file: 'art/proposals/metro-len-4.composition.json', label: 'Metro · 4-car train at an underground platform', district: 'downtown' },
  { id: 'metro-len-6', base: 'tower', file: 'art/proposals/metro-len-6.composition.json', label: 'Metro · 6-car train at an underground platform (long)', district: 'downtown' },
  // Harbor replan (docs/design/HARBOR-ZONES.md, 2026-10-22): the harbor as joined zones, west to east along the prologue's walk.
  // Look frames on the harbor's look (sky, weather, facing 90); all share ground line h 0 (the station: 160 over the quay).
  { id: 'harbor-shed', base: 'harbor', file: 'art/proposals/harbor-shed.composition.json', label: 'Harbor zones · 1 Transit Shed 3: staff gate, staff room, supervisor, dispatch, case returns (dusk, night)', district: 'harbor' },
  { id: 'harbor-yard', base: 'harbor', file: 'art/proposals/harbor-yard.composition.json', label: 'Harbor zones · 2 the yard: receiving, trolley bay, loading bay, berth (night)', district: 'harbor' },
  { id: 'harbor-checkout', base: 'harbor', file: 'art/proposals/harbor-checkout.composition.json', label: 'Harbor zones · 3 checkout: tag reader, turnstile, wage slip (night, dawn)', district: 'harbor' },
  { id: 'harbor-quay', base: 'harbor', file: 'art/proposals/harbor-quay.composition.json', label: 'Harbor zones · 4 the public quay under the raised station (dusk, dawn)', district: 'harbor' },
  { id: 'harbor-station', base: 'harbor', file: 'art/proposals/harbor-station.composition.json', label: 'Harbor zones · 5 the raised Harbor Station, 160 over the quay (dawn)', district: 'harbor' },
];
export const proposalScene = (id: string) => PROPOSAL_SCENES.find(p => p.id === id);

const flat = (nodes: readonly Instance[]): Instance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
export type ProposalUse = 'look' | 'play';
/** What the composition's `scene.base` piece says: `look` takes only the base's look, `play` (or no piece) all of it. */
export function proposalUse(doc: Composition): ProposalUse {
  const row = flat(doc.instances).find(n => n.type === SCENE_BASE);
  return row && row.props.use !== 'play' ? 'look' : 'play';
}
/** A proposal by id and its (pending) composition: does it take only its base's look? */
export const proposalLooksOnly = (id: string, composition: unknown) => !!proposalScene(id) && !!composition && proposalUse(composition as Composition) === 'look';

const EMPTY_GAMEPLAY = { version: 1, flags: [], items: [], commands: {}, events: [], reactions: [], conversations: {} } as unknown as GameplayDefinition;
/**
 * The base scene's document reduced to its look: sky and weather (ambient), facing, indoor/outdoor,
 * horizon and keepFace of its environment, and its stage lamps and casters. Shade bands, weather covers
 * and role-based stage fields are measured on the base's own artwork, so they stay behind; a manifest
 * of the `scene.base` width and the player row as spawn stands in for the base's.
 */
export function lookScene(base: SceneDocument, doc: Composition): SceneDocument {
  const rows = flat(doc.instances), marker = rows.find(n => n.type === SCENE_BASE), spawn = rows.find(n => n.type === PLAYER_ROW);
  if (!spawn) throw new Error('A look frame needs a player row (its spawn)');
  const width = Number(marker?.props.width ?? 1600), env = base.environment, ambient = env?.ambient;
  const environment = env ? {
    ...(ambient ? { ambient: { ...(ambient.sky !== undefined ? { sky: ambient.sky } : {}), ...(ambient.weather !== undefined ? { weather: ambient.weather } : {}) } } : {}),
    ...(env.facing !== undefined ? { facing: env.facing } : {}), ...(env.outdoor !== undefined ? { outdoor: env.outdoor } : {}),
    ...(env.horizon !== undefined ? { horizon: env.horizon } : {}), ...(env.keepFace !== undefined ? { keepFace: env.keepFace } : {}),
  } : undefined;
  const lights = base.stage?.lights, casters = base.stage?.casters;
  const stage = lights || casters ? { ...(lights ? { lights: structuredClone(lights) } : {}), ...(casters ? { casters: structuredClone(casters) } : {}) } : undefined;
  return { version: 1, id: base.id, name: base.name, intro: [], uses: [], manifest: { version: 1, width, spawn: spawn.id, uses: {} }, ...(environment ? { environment } : {}), ...(stage ? { stage } : {}) } as SceneDocument;
}

type DefinitionArgs = Parameters<NativeSceneAdapter['definition']>;
/**
 * The proposal's own identity on the outside; the base scene's identity when its native code reads it.
 * Building-kit fronts get the masks of the signs attached to them (art/buildings/masks.ts) as state.
 */
function adapter(p: ProposalScene): NativeSceneAdapter {
  const base = nativeSceneAdapters[p.base], asBase = (doc: Composition): Composition => ({ ...doc, scene: p.base });
  /** A look frame runs the base's folder scene on the shared declared path, with its look-only document and no gameplay. */
  const look = (doc: Composition, state: DefinitionArgs[1], options: DefinitionArgs[2], documents?: ReadonlyMap<string, unknown>) => {
    const source = FOLDER_BY_ID[p.base]; if (!source) throw new Error(`Base ${p.base} is not a folder scene, so ${p.id} cannot take only its look`);
    const baseScene = (documents?.get((FOLDER_DIRS[p.base] ?? p.base) + '-scene') ?? source.scene) as SceneDocument;
    return folderSceneDefinition(p.base, source, { composition: asBase(doc), state: withFrontMasks(art, doc, state), options, scene: lookScene(baseScene, doc), gameplay: EMPTY_GAMEPLAY, devices: emptyDeviceSource(p.base, baseScene.name) });
  };
  return {
    climateScene: p.base,
    validate(value) { const doc = art.validate(value); if (doc.scene !== p.id) throw new Error(`Proposal identity must remain ${p.id}`); base.validate(asBase(doc)); return doc; },
    definition: (doc, state, options) => proposalUse(doc) === 'look' ? look(doc, state, options) : base.definition(asBase(doc), withFrontMasks(art, doc, state), options),
    pendingDefinition: (doc, state, options, documents) => proposalUse(doc) === 'look' ? look(doc, state, options, documents)
      : base.pendingDefinition ? base.pendingDefinition(asBase(doc), withFrontMasks(art, doc, state), options, documents) : base.definition(asBase(doc), withFrontMasks(art, doc, state), options),
    ...(base.environment ? { environment: (doc: Composition, view: Parameters<NonNullable<NativeSceneAdapter['environment']>>[1], engine: Parameters<NonNullable<NativeSceneAdapter['environment']>>[2]) => { const env = base.environment!(asBase(doc), view, engine); return { ...env, state: withFrontMasks(art, doc, env.state) }; } } : {}),
  };
}
export const proposalAdapters: Record<string, NativeSceneAdapter> = Object.fromEntries(PROPOSAL_SCENES.map(p => [p.id, adapter(p)]));
/**
 * Source check (build and Save): the proposal compiles the way the stage previews it, so a frame the stage
 * would refuse (a missing device, a spawn off every floor) fails `pnpm build:homepage` too. Without
 * `documents` it compiles against the base's saved documents, so editing the base scene is never refused
 * because of a style frame (the frame's own preview shows that break); with them, against the pending ones.
 */
export function validateProposal(id: string, value: unknown, documents?: ReadonlyMap<string, unknown>): Composition {
  const a = proposalAdapters[id], doc = a.validate(value);
  try { if (documents) a.pendingDefinition!(doc, {}, { reduced: true }, documents); else a.definition(doc, {}, { reduced: true }); }
  catch (error) { throw new Error(`${id} (${proposalUse(doc)} on base ${proposalScene(id)!.base}): ${error instanceof Error ? error.message : String(error)}`); }
  return doc;
}
