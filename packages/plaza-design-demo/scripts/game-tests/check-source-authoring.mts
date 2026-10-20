import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sourceDocuments, validateSourceDocuments } from '../../src/ssg/game/authoring/source-documents';
import { AuthoringStore, StoreError } from '../../src/ssg/game/authoring/server/store';
import { libraryScene } from '../../src/ssg/game/scenes/library';
import type { Composition } from '../../src/ssg/game/art';
import type { TimelineDocument } from '../../src/ssg/game/art/core/timeline';
import { preserveBoundIdentity } from '../../src/ssg/game/authoring/bound-identity';

const bound: Composition = { version: 1, scene: 'identity-check', instances: [{ id: 'parent', type: 'assembly.group', props: {}, placement: { x: 0, h: 0 }, layer: 'set', order: 0, children: [{ id: 'actor', type: 'character.prepared', props: { actor: 'keeper' }, bindings: { pose: 'actor.keeper.pose' }, placement: { x: 20, h: 0 }, layer: 'set', order: 1 }] }] };
const relocated = structuredClone(bound); relocated.instances[0].children![0].placement.x += 20;
preserveBoundIdentity(bound, relocated);
const retargeted = structuredClone(bound); retargeted.instances[0].children![0].bindings!.pose = 'actor.other.pose';
assert.throws(() => preserveBoundIdentity(bound, retargeted), /actor: preserve gameplay identity/);
const removedBinding = structuredClone(bound); delete removedBinding.instances[0].children![0].bindings;
assert.throws(() => preserveBoundIdentity(bound, removedBinding), /actor: preserve gameplay identity/);
const deleted = structuredClone(bound); deleted.instances[0].children = [];
assert.throws(() => preserveBoundIdentity(bound, deleted), /actor: preserve gameplay identity/);

const scratch = path.resolve('../../.game-test-output/source-authoring-tests'); fs.mkdirSync(scratch, { recursive: true });
const root = fs.mkdtempSync(path.join(scratch, 'run-'));
for (const document of sourceDocuments) {
  const target = path.join(root, document.file); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.resolve('src/ssg/game', document.file), target);
}
const store = new AuthoringStore({ root, documents: sourceDocuments, validateAll: validateSourceDocuments });
validateSourceDocuments(new Map(store.list().map(doc => [doc.id, doc.value])));
const before = store.read('library'), composition = structuredClone(before.value) as Composition;
const x = (doc: Composition) => libraryScene(doc).data!.devices.find(d => d.id === 'printer')!.layout!.spot!.x;
const baseX = x(composition); composition.instances.find(n => n.id === 'counter')!.placement.x += 20;
const saved = store.save([{ id: 'library', revision: before.revision, value: composition }]);
assert.equal(x(store.read('library').value as Composition), baseX + 20, 'saved document enters the canonical runtime adapter');
assert.throws(() => store.save([{ id: 'library', revision: before.revision, value: composition }]), (error: unknown) => error instanceof StoreError && error.code === 'conflict');
const invalid = structuredClone(composition); invalid.instances = invalid.instances.filter(n => n.id !== 'printer');
assert.throws(() => store.save([{ id: 'library', revision: store.read('library').revision, value: invalid }]), /printer/);
const timeline = store.read('sequence-cinematics'), badTimeline = structuredClone(timeline.value) as TimelineDocument;
badTimeline.sequences[0].handoff = { scene: 'missing-scene' };
const accepted = store.read('library').revision;
assert.throws(() => store.save([{ id: 'library', revision: accepted, value: before.value }, { id: timeline.id, revision: timeline.revision, value: badTimeline }]), /handoff/);
assert.equal(store.read('library').revision, accepted, 'failed cross-document validation leaves every source unchanged');
store.undo(saved.transaction, { library: accepted });
assert.equal(store.read('library').revision, before.revision, 'journal undo restores the exact source bytes');
const decorated = structuredClone(before.value) as Composition;
decorated.instances.push({ id: 'shared-stool', type: 'furniture.stool', props: {}, placement: { x: 750, h: 0 }, order: 40, layer:'playfield' });
store.save([{ id: 'library', revision: before.revision, value: decorated }]);
assert.ok((store.read('library').value as Composition).instances.some(n => n.type === 'furniture.stool'), 'other kits remain available through the same registry');
console.log(`Source authoring checks passed: ${sourceDocuments.length} real documents; runtime placement, stable gameplay ids, conflicts, grouped reference rejection, exact undo, shared catalog.`);
