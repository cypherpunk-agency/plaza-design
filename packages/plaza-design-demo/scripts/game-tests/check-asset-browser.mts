import assert from 'node:assert/strict';
import fs from 'node:fs';
import { art, ArtRegistry, resolveComposition, compositionAppearance, type ChunkDocument, type AssetDefinition } from '../../src/ssg/game/art';
import { frameView } from '../../src/ssg/game/art/core/view';
import { assetInventory, filterAssets } from '../../src/ssg/game/authoring/asset-browser';
import { isolateArtwork } from '../../src/ssg/game/authoring/asset-preview';
import { exampleState } from '../../src/ssg/game/authoring/asset-examples';
import { sourceDocuments } from '../../src/ssg/game/authoring/source-documents';
const documents = sourceDocuments.map(doc => ({ id: doc.id, kind: doc.kind, revision: 'test', value: JSON.parse(fs.readFileSync(`src/ssg/game/${doc.file}`, 'utf8')) }));
const before = JSON.stringify(documents), entries = assetInventory(art, documents);
assert.deepEqual(entries.map(e => e.id).sort(), art.catalog().map(e => e.type).sort());
assert.ok(entries.length > 0);
for (const entry of entries) {
  if (entry.usability === 'reusable') assert.equal(art.get(entry.id).libraryUse, 'reusable', `${entry.id}: placement must be explicitly declared`);
}
assert.equal(entries.find(e => e.id === 'assembly.group')!.usability, 'helper');
assert.equal(entries.find(e => e.id === 'actor.prepared')!.usability, 'context');
assert.equal(entries.find(e => e.id === 'sign.billboard')!.usability, 'reusable');
assert.equal(entries.find(e => e.id === 'sequence.intro.hero')!.structure, 'object');
let usages = 0;
for (const entry of entries) {
  assert.equal(filterAssets(entries, entry.id).some(e => e.id === entry.id), true);
  assert.ok(filterAssets(entries, '', entry.family).every(e => e.family === entry.family));
  for (const usage of entry.usages) {
    usages++;
    const doc = documents.find(doc => doc.id === usage.document)!;
    let nodes = (doc.value as ChunkDocument).instances;
    for (const id of usage.path) { const node = nodes.find(node => node.id === id)!; assert.ok(node); nodes = node.children ?? []; }
    assert.equal(usage.node.type, entry.id);
  }
}
assert.ok(usages > 0); assert.equal(JSON.stringify(documents), before);
assert.equal(filterAssets(entries, 'there-is-no-such-asset').length, 0);
// A child attached to an ancestor with inherited opacity must keep runtime transforms and appearance
// after isolation; neither the ancestor nor unrelated sibling may be painted in the isolated view.
const registry = new ArtRegistry();
const element: AssetDefinition = { type: 'test', version: 1, category: 'test', label: 'Test', fields: {}, parts: ['backdrop'], bounds: () => ({ x: 0, h: 0, w: 10, tall: 10 }), anchors: () => ({ mount: { x: 12, h: 9, role: 'mount' } }), draw() {} };
registry.register(element);
const doc: ChunkDocument = { version: 1, scene: 'test', instances: [{ id: 'parent', type: 'test', props: {}, placement: { x: 90, h: 10, scale: 2, facing: -1 }, order: 0, layer: 'backdrop', children: [
  { id: 'selected', type: 'test', props: {}, placement: { x: 7, h: 3 }, attach: { instance: 'parent', anchor: 'mount' }, order: 1, layer: 'backdrop', children: [
    { id: 'child', type: 'test', props: {}, placement: { x: 4, h: 2 }, order: 2, layer: 'foreground' }] },
  { id: 'unrelated', type: 'test', props: {}, placement: { x: 0, h: 0 }, order: 3, layer: 'backdrop' }] }] };
const env = { view: frameView(0), state: {}, reduced: false, opacity: { parent: .5, selected: .5 }, visibility: { parent: false } };
const untouched = JSON.stringify(doc), projection = isolateArtwork(registry, doc, env, 'selected');
const originalRows = resolveComposition(registry, doc, env), isolatedRows = resolveComposition(registry, projection.composition, projection.environment);
assert.deepEqual(isolatedRows.map(row => row.instance.id), ['selected', 'child']);
for (const row of isolatedRows) assert.deepEqual(row.placement, originalRows.find(original => original.instance.id === row.instance.id)!.placement);
const originalAppearance = compositionAppearance(doc, env), projectedAppearance = compositionAppearance(projection.composition, projection.environment);
for (const row of isolatedRows) assert.deepEqual(projectedAppearance.get(row.instance.id), originalAppearance.get(row.instance.id));
assert.equal(JSON.stringify(doc), untouched);
assert.throws(() => isolateArtwork(registry, doc, env, 'missing'), /Missing source/);
// Gallery examples must produce valid native visual inputs without mutating the source snapshot.
for (const type of ['actor.prepared', 'character.prepared', 'dockwork.case', 'dockwork.statement', 'dockwork.complete', 'station.waiting-passenger', 'sandbox.hover']) {
  const sample: ChunkDocument = { version: 1, scene: 'gallery-check', instances: [{ id: 'piece', type, props: {}, placement: { x: 300, h: 0 }, pass: art.get(type).parts[0], order: 0 }] };
  const row = resolveComposition(art, sample, { view: frameView(0), state: {}, reduced: true })[0];
  const untouchedState = JSON.stringify(row.state), display = exampleState(row);
  assert.doesNotThrow(() => art.visualProperties(type, display), type);
  assert.equal(JSON.stringify(row.state), untouchedState, `${type}: gallery must not mutate native state`);
}
console.log(JSON.stringify({ status: 'PASS', registered: entries.length, usages, assertions: ['complete current registry', 'search and family filtering', 'every exact usage path', 'read-only documents', 'resolved attachment transforms', 'inherited visibility/opacity', 'descendants without ancestor artwork'] }));
