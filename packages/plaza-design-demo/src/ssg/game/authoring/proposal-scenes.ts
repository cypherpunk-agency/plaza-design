/**
 * Proposal scenes: editor-only redraws of an existing scene, for trying a new look without touching
 * the shipping scene. Each keeps its own composition file and borrows the base scene's whole native
 * definition (sky, weather, lighting, devices, people), so it renders exactly as the base would with
 * different artwork. They are not registered with the game, the city or Play.
 */
import { art } from '../art';
import { withFrontMasks } from '../art/buildings/masks';
import type { Composition } from '../art/core/composition';
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
  { id: 'dt-freshco', base: 'tower', file: 'art/proposals/dt-freshco.composition.json', label: 'Downtown · FRESHCO supermarket: front, shop floor, stockroom', district: 'downtown' },
  { id: 'dt-diner', base: 'tower', file: 'art/proposals/dt-diner.composition.json', label: 'Downtown · the 24h diner in the rain', district: 'downtown' },
  { id: 'dt-roofs', base: 'tower', file: 'art/proposals/dt-roofs.composition.json', label: 'Downtown · the roofs and the billboard catwalk', district: 'downtown' },
  // Downtown home ground (dt-home, 2026-10-22): the capsule block, Moth's walk-up, Kessel's room behind the fixer's kitchen.
  { id: 'dt-capsule-lobby', base: 'tower', file: 'art/proposals/dt-capsule-lobby.composition.json', label: 'Downtown · the capsule block: lobby, flats, basement, courtyard', district: 'downtown' },
  { id: 'dt-moth-stairwell', base: 'tower', file: 'art/proposals/dt-moth-stairwell.composition.json', label: 'Downtown · Moth’s walk-up: the stairwell up to 4C', district: 'downtown' },
  { id: 'dt-kessel-clinic', base: 'tower', file: 'art/proposals/dt-kessel-clinic.composition.json', label: 'Downtown · the noodle stall, its kitchen and Kessel’s back room', district: 'downtown' },
  // Downtown civic (dt-civic, 2026-10-22): the Registry service point, its back office after hours, the substation and the sweep.
  { id: 'dt-registry', base: 'tower', file: 'art/proposals/dt-registry.composition.json', label: 'Downtown · the Registry service point: front, hall, back office, node', district: 'downtown' },
  { id: 'dt-registry-night', base: 'tower', file: 'art/proposals/dt-registry-night.composition.json', label: 'Downtown · the Registry after hours: the alarm at the node', district: 'downtown' },
  { id: 'dt-substation', base: 'tower', file: 'art/proposals/dt-substation.composition.json', label: 'Downtown · the substation: yard, transformers, control hut', district: 'downtown' },
  { id: 'dt-sweep', base: 'downtown', file: 'art/proposals/dt-sweep.composition.json', label: 'Downtown · the sweep: Registry vans, floodlights, ID checks (best at night)', district: 'downtown' },
];
export const proposalScene = (id: string) => PROPOSAL_SCENES.find(p => p.id === id);

/**
 * The proposal's own identity on the outside; the base scene's identity when its native code reads it.
 * Building-kit fronts get the masks of the signs attached to them (art/buildings/masks.ts) as state.
 */
function adapter(p: ProposalScene): NativeSceneAdapter {
  const base = nativeSceneAdapters[p.base], asBase = (doc: Composition): Composition => ({ ...doc, scene: p.base });
  return {
    climateScene: p.base,
    validate(value) { const doc = art.validate(value); if (doc.scene !== p.id) throw new Error(`Proposal identity must remain ${p.id}`); base.validate(asBase(doc)); return doc; },
    definition: (doc, state, options) => base.definition(asBase(doc), withFrontMasks(art, doc, state), options),
    ...(base.pendingDefinition ? { pendingDefinition: (doc: Composition, state: Parameters<NonNullable<NativeSceneAdapter['pendingDefinition']>>[1], options: Parameters<NonNullable<NativeSceneAdapter['pendingDefinition']>>[2], documents: ReadonlyMap<string, unknown>) => base.pendingDefinition!(asBase(doc), withFrontMasks(art, doc, state), options, documents) } : {}),
    ...(base.environment ? { environment: (doc: Composition, view: Parameters<NonNullable<NativeSceneAdapter['environment']>>[1], engine: Parameters<NonNullable<NativeSceneAdapter['environment']>>[2]) => { const env = base.environment!(asBase(doc), view, engine); return { ...env, state: withFrontMasks(art, doc, env.state) }; } } : {}),
  };
}
export const proposalAdapters: Record<string, NativeSceneAdapter> = Object.fromEntries(PROPOSAL_SCENES.map(p => [p.id, adapter(p)]));
