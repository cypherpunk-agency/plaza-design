/** Refresh the read-only index from real scene documents and the shipping world registries. */
import fs from 'node:fs';
import path from 'node:path';
import { sourceDocuments } from '../../src/ssg/game/authoring/source-documents';
import { snapshotWorld, validateWorldDocument } from '../../src/ssg/game/world/document';
import type { Composition } from '../../src/ssg/game/art';
import type { TimelineDocument } from '../../src/ssg/game/art/core/timeline';
const root = path.resolve('src/ssg/game');
const compositions: Record<string, Composition> = {}, sequences: TimelineDocument['sequences'] = [];
for (const descriptor of sourceDocuments) {
  const value = JSON.parse(fs.readFileSync(path.join(root, descriptor.file), 'utf8'));
  descriptor.validate(value);
  if (descriptor.kind === 'composition') compositions[descriptor.id] = value;
  if (descriptor.kind === 'timeline') sequences.push(...(value as TimelineDocument).sequences);
}
const refs = Object.fromEntries(Object.entries(compositions).filter(([id]) => !id.startsWith('sequence-')).map(([id]) => [id, id]));
const world = snapshotWorld(refs, sequences.flatMap(sequence => sequence.handoff ? [{ id: sequence.id, ...sequence.handoff }] : []));
validateWorldDocument(world, { compositions, sequences });
fs.writeFileSync(path.join(root, 'world/composition-index.json'), JSON.stringify(world, null, 2) + '\n');
console.log(`World index: ${world.scenes.length} real scene compositions; ${world.sequences.length} sequence destinations; shipping geography and access unchanged.`);
