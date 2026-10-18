import {nativeGameplayScenes} from './native-gameplay-scenes';
import {gameplayScenes} from './gameplay-scenes';
import {validatePlayFixtures,validateFixtureBounds} from './play-fixtures';
/** Explicit source allowlist shared by the local launcher and focused save checks. */
import { art, type Composition } from '../art';
import { validateTimeline } from '../art/core/timeline';
import { SCENES } from '../scenes';
import { nativeSceneAdapters } from './scene-adapters';
import { createSequenceValidationContext } from './sequence-preview';
import type { DocumentDescriptor } from './server/store';
import { preserveBoundIdentity } from './bound-identity';
import { preserveSandboxBehavior, validateSandboxBehavior } from './behavior-validation';

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
  ...nativeGameplayScenes.map(s=>({id:s.gameplayId,file:s.file,kind:'gameplay' as const,validate:s.validateGameplay})),
  ...Array.from(new Map(gameplayScenes.flatMap(s=>[{id:s.prefix+'-scene',file:'scenes/'+s.prefix+'/scene.json',kind:'scene' as const,validate:s.validateScene},{id:s.gameplayId,file:'scenes/'+s.gameplayId.replace(/-gameplay$/,'')+'/gameplay.json',kind:'gameplay' as const,validate:s.validateGameplay}]).map(d=>[d.id,d])).values()),
  {id:'play-fixtures',file:'authoring/play-fixtures.json',kind:'fixtures',validate:validatePlayFixtures},
  { id: 'sandbox-behavior', file: 'scenes/sandbox/devices.json', kind: 'behavior', validate: validateSandboxBehavior, validateUpdate: preserveSandboxBehavior },
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
  for(const s of gameplayScenes)s.validateScene(documents.get(s.prefix+'-scene'),s.validateGameplay(documents.get(s.gameplayId)));
  validateFixtureBounds(validatePlayFixtures(documents.get('play-fixtures')),Object.fromEntries(['harborShift','sandbox','shop','library','laundromat','market','beach'].map(id=>[id,nativeSceneAdapters[id].definition(compositions[id],{},{reduced:false}).width])));
  const context = createSequenceValidationContext(art, compositions, destinations);
  for (const [id] of Object.entries(timelineFiles)) validateTimeline(documents.get(id), context);
  for (const id of documents.keys()) if (!sourceDocuments.some(d => d.id === id)) throw new Error(`Unknown source document: ${id}`);
}
