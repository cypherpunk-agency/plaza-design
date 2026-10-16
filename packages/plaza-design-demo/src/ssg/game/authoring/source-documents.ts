/** Explicit source allowlist shared by the local launcher and focused save checks. */
import { art, type Composition } from '../art';
import { validateTimeline } from '../art/core/timeline';
import { SCENES } from '../scenes';
import { nativeSceneAdapters } from './scene-adapters';
import { createSequenceValidationContext } from './sequence-preview';
import type { DocumentDescriptor } from './server/store';
import { preserveBoundIdentity } from './bound-identity';

const scenes = Object.keys(nativeSceneAdapters);
const sequenceFiles = {
  'sequence-opening': 'story/title/composition.json',
  'sequence-intro': 'story/cutscenes/intro.composition.json',
  'sequence-act2': 'story/cutscenes/act2.composition.json',
  'sequence-taxi': 'story/cutscenes/taxi.composition.json',
};
const timelineFiles = { 'sequence-opening-timeline': 'story/title/timeline.json', 'sequence-cinematics': 'story/cutscenes/timeline.json' };
const destinations = Object.fromEntries(Object.entries(SCENES).map(([id, def]) => [id, def.exits.map(exit => exit.id)]));
const sceneComposition = (scene: string, value: unknown) => {
  const doc = nativeSceneAdapters[scene].validate(value);
  if (doc.scene !== scene) throw new Error(`Scene identity must remain ${scene}`);
  return doc;
};
export const sourceDocuments: DocumentDescriptor[] = [
  ...scenes.map(scene => ({ id: scene, file: `scenes/${scene === 'harborShift' ? 'harbor-shift' : scene}/composition.json`, kind: 'composition' as const, validate: (value: unknown) => sceneComposition(scene, value), validateUpdate: preserveBoundIdentity })),
  ...Object.entries(sequenceFiles).map(([id, file]) => ({ id, file, kind: 'composition' as const, validateUpdate: preserveBoundIdentity, validate(value: unknown) { const doc = art.validate(value); if (doc.scene !== id) throw new Error(`Sequence identity must remain ${id}`); return doc; } })),
  ...Object.entries(timelineFiles).map(([id, file]) => ({ id, file, kind: 'timeline' as const, validate(value: unknown) {
    if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1 || !Array.isArray((value as { sequences?: unknown }).sequences)) throw new Error('Invalid timeline document header');
    return value;
  } })),
];
/** Every grouped save validates the complete prospective source set before any replacement. */
export function validateSourceDocuments(documents: ReadonlyMap<string, unknown>) {
  const compositions: Record<string, Composition> = {};
  for (const descriptor of sourceDocuments) {
    if (!documents.has(descriptor.id)) throw new Error(`Missing source document: ${descriptor.id}`);
    descriptor.validate(documents.get(descriptor.id));
    if (descriptor.kind === 'composition') compositions[descriptor.id] = documents.get(descriptor.id) as Composition;
  }
  const context = createSequenceValidationContext(art, compositions, destinations);
  for (const [id] of Object.entries(timelineFiles)) validateTimeline(documents.get(id), context);
  for (const id of documents.keys()) if (!sourceDocuments.some(d => d.id === id)) throw new Error(`Unknown source document: ${id}`);
}
