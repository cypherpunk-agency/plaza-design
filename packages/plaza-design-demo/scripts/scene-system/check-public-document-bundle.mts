import assert from 'node:assert/strict';
import { createDocumentBundle, readDocumentBundle, DOCUMENT_BUNDLE_MAX_BYTES } from '../../src/ssg/game/authoring/document-bundle';
import type { EditorDocument } from '../../src/ssg/game/authoring/app';
const documents: EditorDocument[] = [
  { id: 'room', kind: 'composition', revision: 'source-A', value: { version: 1, scene: 'room', instances: [] } },
  { id: 'film', kind: 'timeline', revision: 'source-B', value: { version: 1, sequences: [] } },
  { id: 'behavior', kind: 'behavior', revision: 'source-C', value: { retained: true } },
  { id: 'world', kind: 'world', revision: 'source-D', value: {} },
];
const before = JSON.stringify(documents), edits = [{ id: 'room', value: { version: 1, scene: 'room', instances: [{ id: 'lamp' }], text: '雨' } }, { id: 'film', value: { version: 1, sequences: [{ id: 'new', composition: 'room' }] } }];
const bundle = createDocumentBundle(edits, documents), text = JSON.stringify(bundle), roundtrip = readDocumentBundle(text, documents);
assert.deepEqual(roundtrip, edits);assert.equal(text.includes('revision'), false);assert.equal(JSON.stringify(documents), before);
(roundtrip[0].value as { text: string }).text = 'detached';assert.equal((edits[0].value as { text: string }).text, '雨');assert.equal((bundle.documents[0].value as { text: string }).text, '雨');
const internalMetadata = [{ id: 'room', revision: 'private-local-revision', value: {} }];assert.equal(JSON.stringify(createDocumentBundle(internalMetadata, documents)).includes('private-local-revision'), false);
const reject = (name: string, mutate: (value: typeof bundle) => unknown) => { const changed = structuredClone(bundle);assert.throws(() => readDocumentBundle(mutate(changed), documents), undefined, name); };
reject('unknown envelope key', b => ({ ...b, token: 'not-supported' }));
reject('missing envelope key', b => { delete (b as Partial<typeof b>).format;return b; });
reject('wrong version', b => ({ ...b, version: 2 }));reject('wrong format', b => ({ ...b, format: 'other' }));
reject('duplicate ids', b => { b.documents.push(b.documents[0]);return b; });
reject('unknown id', b => { b.documents[0].id = 'outside';return b; });
reject('mismatched kind', b => { b.documents[0].kind = 'timeline';return b; });
reject('world mutation', b => { (b.documents[0] as unknown as { id: string; kind: string }).id = 'world';(b.documents[0] as unknown as { kind: string }).kind = 'world';return b; });
reject('document path garbage', b => { (b.documents[0] as unknown as Record<string, unknown>).file = '../secret';return b; });
reject('revision supplied by import', b => { (b.documents[0] as unknown as Record<string, unknown>).revision = 'forged';return b; });
reject('missing value', b => { delete (b.documents[0] as { value?: unknown }).value;return b; });
for (const value of [NaN, Infinity, undefined, () => {}, new Date(), new Map(), BigInt(2)]) reject('non JSON ' + String(value), b => { b.documents[0].value = value;return b; });
reject('reserved nested key', b => { b.documents[0].value = JSON.parse('{"nested":{"__proto__":{"polluted":true}}}');return b; });
reject('cycle', b => { const value: Record<string, unknown> = {};value.self = value;b.documents[0].value = value;return b; });
reject('sparse array', b => { b.documents[0].value = new Array(2);return b; });
reject('decorated array', b => { const a: unknown[] & { extra?: string } = [];a.extra = 'lost';b.documents[0].value = a;return b; });
reject('excess depth', b => { let value: unknown = {};for (let i = 0; i < 70; i++) value = { child: value };b.documents[0].value = value;return b; });
reject('UTF8 byte bound', b => { b.documents[0].value = '雨'.repeat(Math.ceil(DOCUMENT_BUNDLE_MAX_BYTES / 3));return b; });
assert.throws(() => readDocumentBundle(' '.repeat(DOCUMENT_BUNDLE_MAX_BYTES + 1), documents));assert.throws(() => readDocumentBundle('{broken', documents));assert.throws(() => readDocumentBundle(null, documents));assert.throws(() => readDocumentBundle([], documents));
assert.throws(() => createDocumentBundle([{ id: 'world', value: {} }], documents));assert.throws(() => createDocumentBundle([{ id: 'room', value: {} }, { id: 'room', value: {} }], documents));assert.throws(() => createDocumentBundle([{ id: 'unknown', value: {} }], documents));
assert.deepEqual(readDocumentBundle(createDocumentBundle([], documents), documents), []);assert.equal(JSON.stringify(documents), before);
console.log('Public edit bundles: detached composition/timeline roundtrip, local revision omission, exact envelope/entry keys, existing ids/kinds, world/duplicate/unsafe JSON/UTF8 size rejection, immutable source baseline PASS');

// The actual ComposerModel imports related documents as one command and retains source revisions.
const { ComposerModel } = await import('../../src/ssg/game/authoring/app');
const { ArtRegistry } = await import('../../src/ssg/game/art/core/composition');
const registry = new ArtRegistry().register({ type: 'public-test', version: 1, label: 'Test', category: 'Test', fields: {}, parts: ['backdrop'], bounds: () => ({ x: 0, h: 0, w: 10, tall: 10 }), anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }), draw() {} });
const model = new ComposerModel(registry, {}, doc => { if (doc.kind === 'behavior') assert.equal((doc.value as { retained: boolean }).retained, true, 'Protected behavior changed'); });
model.load(documents);
const nextRoom = { version: 1, scene: 'room', instances: [{ id: 'lamp', type: 'public-test', props: {}, placement: { x: 0, h: 0 }, pass: 'backdrop', order: 0 }] };
const nextFilm = { version: 1, sequences: [{ id: 'scene', composition: 'room', duration: 1, shots: [], text: [], fades: [], beats: [], tracks: [{ id: 'move', target: { kind: 'instance', instance: 'lamp', property: 'x' }, keys: [{ time: 0, value: 0 }, { time: 1, value: 10 }] }] }] };
const related = createDocumentBundle([{ id: 'film', value: nextFilm }, { id: 'room', value: nextRoom }], model.list());
model.importDocuments(readDocumentBundle(related, model.list()));
assert.equal(model.dirty(), true);assert.equal(model.edits().length, 2);assert.deepEqual(model.get('film').value, nextFilm);assert.deepEqual(model.get('room').value, nextRoom);
assert.equal(model.get('film').revision, 'source-B');assert.equal(model.get('room').revision, 'source-A');
createDocumentBundle(model.edits(), model.list());assert.equal(model.dirty(), true, 'Downloading never confirms a public document as saved');
model.undo();assert.equal(model.dirty(), false);assert.equal(model.canUndo, false, 'Two-document import has one history command');assert.deepEqual(model.list(), documents);
model.redo();assert.equal(model.dirty(), true);assert.deepEqual(model.get('film').value, nextFilm);model.undo();
const snapshot = model.list(), history = { undo: model.canUndo, redo: model.canRedo, label: model.undoLabel };
const badFilm = structuredClone(nextFilm);badFilm.sequences[0].tracks[0].target.instance = 'missing';
assert.throws(() => model.importDocuments(readDocumentBundle(createDocumentBundle([{ id: 'room', value: nextRoom }, { id: 'film', value: badFilm }], model.list()), model.list())));
assert.deepEqual(model.list(), snapshot);assert.deepEqual({ undo: model.canUndo, redo: model.canRedo, label: model.undoLabel }, history);assert.equal(model.dirty(), false);
assert.throws(() => model.importDocuments([{ id: 'room', value: nextRoom }, { id: 'behavior', value: { retained: false } }]));assert.deepEqual(model.list(), snapshot);
assert.throws(() => model.importDocuments([{ id: 'room', value: { ...nextRoom, scene: 'other' } }]));assert.deepEqual(model.list(), snapshot);
assert.throws(() => model.importDocuments([{ id: 'room', value: nextRoom }, { id: 'world', value: {} }]));assert.deepEqual(model.list(), snapshot);
model.redo();assert.deepEqual(model.get('film').value, nextFilm, 'Rejected imports preserve the prior redo transaction');
console.log('Actual public ComposerModel: related-document atomic import, one-step undo/redo, failed cross-reference/protected-behavior/scene/world import leaves state/history intact, original revisions and pending dirty state PASS');
