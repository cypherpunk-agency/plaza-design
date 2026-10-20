import assert from 'node:assert/strict';
import { ArtRegistry, type Composition } from '../../src/ssg/game/art/core/composition';
import { ComposerModel, type EditorDocument } from '../../src/ssg/game/authoring/app';
import type { TimelineDocument } from '../../src/ssg/game/art/core/timeline';

const registry = new ArtRegistry().register({ type: 'test', version: 1, label: 'Test', category: 'test', fields: { size: { kind: 'number', label: 'Size', default: 1, min: 1, animatable: true } }, visualFields: { open: { kind: 'boolean', label: 'Open', default: false, animatable: true } }, parts: ['backdrop'], bounds: () => ({ x: 0, h: 0, w: 10, tall: 10 }), anchors: () => ({ top: { x: 0, h: 10, role: 'mount' } }), draw() {} });
const instance = (id: string) => ({ id, type: 'test', props: {}, placement: { x: 0, h: 0 }, pass: 'backdrop' as const, order: 0 });
const composition: Composition = { version: 1, scene: 'test-scene', instances: [
  { ...instance('parent'), children: [instance('child')] },
  { ...instance('attached'), attach: { instance: 'parent', anchor: 'top' } },
  { ...instance('bound'), bindings: { open: 'door.open' } },
] };
const timeline: TimelineDocument = { version: 1, sequences: [{ id: 'one', duration: 5, composition: 'scene-doc', tracks: [{ id: 'move', target: { kind: 'instance', instance: 'child', property: 'x' }, keys: [{ time: 0, value: 0 }, { time: 5, value: 20 }] }], shots: [], text: [], fades: [], beats: [] }] };
const documents: EditorDocument[] = [ { id: 'scene-doc', kind: 'composition', revision: 'initial', value: composition }, { id: 'sequence-doc', kind: 'timeline', revision: 'timeline-initial', value: timeline }, { id: 'world', kind: 'world', revision: 'world-initial', value: { places: [] } } ];
const model = new ComposerModel(registry); model.load(documents);
assert.equal(model.dirty(), false); assert.equal(model.canUndo, false);
model.updateInstance('scene-doc', 'child', 'Move child', node => node.placement.x = 10);
assert.equal(model.dirty('scene-doc'), true); assert.equal(model.edits().length, 1); assert.equal(model.undoLabel, 'Move child');
const submitted = model.get('scene-doc'); submitted.revision = 'saved'; model.confirmSaved([submitted]);
assert.equal(model.dirty(), false); assert.equal(model.canUndo, true);
model.undo(); assert.equal(model.dirty(), true); assert.equal(model.edits()[0].revision, 'saved');
model.redo(); assert.equal(model.dirty(), false);
// A response for an older submitted snapshot must not clear newer unsaved changes.
model.updateInstance('scene-doc', 'child', 'Move again', node => node.placement.x = 11);
model.confirmSaved([submitted]); assert.equal(model.dirty(), true); model.undo(); assert.equal(model.dirty(), false);
const nestedCopy = model.duplicate('scene-doc', 'child');
const parent = (model.get('scene-doc').value as Composition).instances[0]; assert.ok(parent.children?.some(n => n.id === nestedCopy));
assert.ok(!(model.get('scene-doc').value as Composition).instances.some(n => n.id === nestedCopy));
model.remove('scene-doc', nestedCopy);
assert.throws(() => model.remove('scene-doc', 'parent'), /attached/);
// Cascading deletion lists the instance, its children and everything attached to them, in document order.
assert.deepEqual(model.removal('scene-doc', 'parent', true), ['parent', 'child', 'attached']);
// A trial run reports why the cascade would be refused (the timeline animates 'child') and leaves document and history as they were.
const beforeTrial = JSON.stringify(model.get('scene-doc').value), labelBeforeTrial = model.undoLabel;
assert.match(model.trial(() => model.remove('scene-doc', 'parent', true)), /child/); assert.equal(JSON.stringify(model.get('scene-doc').value), beforeTrial); assert.equal(model.undoLabel, labelBeforeTrial);
assert.throws(() => model.remove('scene-doc', 'bound'), /bindings/);
assert.throws(() => model.duplicate('scene-doc', 'bound'), /bound/);
assert.throws(() => model.remove('scene-doc', 'child'), /instance/);
const snapshot = model.get('scene-doc');
assert.throws(() => model.edit('scene-doc', 'Invalid import', () => ({ version: 1, scene: 'test-scene', instances: [ { ...instance('bad'), placement: { x: NaN, h: 0 } } ] })));
assert.deepEqual(model.get('scene-doc'), snapshot);
assert.throws(() => model.edit('scene-doc', 'Rename scene', value => ({ ...(value as Composition), scene: 'different' })), /identity/);
assert.throws(() => model.edit('scene-doc', 'Delete binding through import', value => ({ ...(value as Composition), instances: (value as Composition).instances.filter(n => n.id !== 'bound') })), /gameplay identity/);
assert.throws(() => model.edit('world', 'Move world', () => ({})), /read-only/);
const added = model.add('scene-doc', 'test'); assert.ok((model.get('scene-doc').value as Composition).instances.some(n => n.id === added));
model.undo(); assert.ok(!(model.get('scene-doc').value as Composition).instances.some(n => n.id === added)); model.redo();
model.updateInstance('scene-doc', added, 'Attach', node => node.attach = { instance: 'parent', anchor: 'top' });
assert.throws(() => model.updateInstance('scene-doc', 'parent', 'Cycle', node => node.attach = { instance: added, anchor: 'top' }), /cycle/);
const detached = model.list(); (detached[0].value as Composition).instances = []; assert.ok((model.get('scene-doc').value as Composition).instances.length > 0);
const invalidModel = new ComposerModel(registry); assert.throws(() => invalidModel.load([{ ...documents[1], value: { ...timeline, version: 4 } }]));
assert.equal(invalidModel.list().length, 0);
console.log('Composer model checks passed: typed editing, nested duplication, binding/reference protection, validation atomicity, history, save revisions, dirty state and read-only world.');
