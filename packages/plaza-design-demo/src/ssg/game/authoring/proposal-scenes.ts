/**
 * Proposal scenes: editor-only redraws of an existing scene, for trying a new look without touching
 * the shipping scene. Each keeps its own composition file and borrows the base scene's whole native
 * definition (sky, weather, lighting, devices, people), so it renders exactly as the base would with
 * different artwork. They are not registered with the game, the city or Play.
 */
import { art } from '../art';
import type { Composition } from '../art/core/composition';
import { nativeSceneAdapters } from './scene-adapters';
import type { NativeSceneAdapter } from './native-preview';

export interface ProposalScene { id: string; base: string; file: string; label: string; district: string }
export const PROPOSAL_SCENES: ProposalScene[] = [
  { id: 'downtown-next', base: 'downtown', file: 'art/proposals/downtown-next.composition.json', label: 'Downtown · proposal', district: 'downtown' },
];
export const proposalScene = (id: string) => PROPOSAL_SCENES.find(p => p.id === id);

/** The proposal's own identity on the outside; the base scene's identity when its native code reads it. */
function adapter(p: ProposalScene): NativeSceneAdapter {
  const base = nativeSceneAdapters[p.base], asBase = (doc: Composition): Composition => ({ ...doc, scene: p.base });
  return {
    climateScene: p.base,
    validate(value) { const doc = art.validate(value); if (doc.scene !== p.id) throw new Error(`Proposal identity must remain ${p.id}`); base.validate(asBase(doc)); return doc; },
    definition: (doc, state, options) => base.definition(asBase(doc), state, options),
    ...(base.pendingDefinition ? { pendingDefinition: (doc: Composition, state: Parameters<NonNullable<NativeSceneAdapter['pendingDefinition']>>[1], options: Parameters<NonNullable<NativeSceneAdapter['pendingDefinition']>>[2], documents: ReadonlyMap<string, unknown>) => base.pendingDefinition!(asBase(doc), state, options, documents) } : {}),
    ...(base.environment ? { environment: (doc: Composition, view: Parameters<NonNullable<NativeSceneAdapter['environment']>>[1], engine: Parameters<NonNullable<NativeSceneAdapter['environment']>>[2]) => base.environment!(asBase(doc), view, engine) } : {}),
  };
}
export const proposalAdapters: Record<string, NativeSceneAdapter> = Object.fromEntries(PROPOSAL_SCENES.map(p => [p.id, adapter(p)]));
