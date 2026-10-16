import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AuthoringStore, StoreError } from '../../src/ssg/game/authoring/server/store';
import { startAuthoringServer } from '../../src/ssg/game/authoring/server/http';

// Keep Windows sandbox file replacement checks in the workspace's ignored evidence tree.
const scratch = path.resolve('../../.scene-system/authoring-save-tests'); fs.mkdirSync(scratch, { recursive: true });
const root = fs.mkdtempSync(path.join(scratch, 'run-'));
const validate = (v: unknown) => { assert.equal(typeof v, 'object'); assert.equal(typeof (v as { value: unknown }).value, 'number'); assert.ok(Number.isFinite((v as { value: number }).value)); };
const documents = ['a', 'b'].map(id => ({ id, file: id + '.json', kind: 'composition' as const, validate }));
const error = (code: StoreError['code']) => (e: unknown) => e instanceof StoreError && e.code === code;
try {
  for (const id of ['a', 'b']) fs.writeFileSync(path.join(root, id + '.json'), '{"value":0}\n');
  const store = new AuthoringStore({ root, documents, validateAll(all) { assert.ok((all.get('a') as { value: number }).value <= (all.get('b') as { value: number }).value); } });
  const a = store.read('a'), b = store.read('b');
  const saved = store.save([{ id: 'a', revision: a.revision, value: { value: 1 } }, { id: 'b', revision: b.revision, value: { value: 2 } }]);
  assert.equal((store.read('a').value as { value: number }).value, 1);
  assert.throws(() => store.save([{ id: 'a', revision: a.revision, value: { value: 5 } }]), error('conflict'));
  assert.throws(() => store.save([{ id: 'a', revision: store.read('a').revision, value: { value: 'bad' } }]), error('invalid'));
  assert.throws(() => store.save([{ id: 'a', revision: store.read('a').revision, value: { value: 3 } }]), error('invalid'));
  assert.throws(() => store.save([{ id: '../escape', revision: a.revision, value: { value: 0 } }]), error('path'));
  assert.throws(() => store.save([{ id: 'a', revision: store.read('a').revision, value: { value: NaN } }]), error('invalid'));
  assert.throws(() => store.save([{ id: 'a', revision: store.read('a').revision, value: { value: 1, hidden: () => 1 } }]), error('invalid'));
  const undone = store.undo(saved.transaction, Object.fromEntries(saved.documents.map(d => [d.id, d.revision])));
  assert.deepEqual(store.read('a').value, { value: 0 });
  store.undo(undone.transaction, Object.fromEntries(undone.documents.map(d => [d.id, d.revision])));
  assert.deepEqual(store.read('a').value, { value: 1 });
  const snapshot = ['a', 'b'].map(id => fs.readFileSync(path.join(root, id + '.json'), 'utf8'));
  const failing = new AuthoringStore({ root, documents, beforeReplace(index) { if (index === 1) throw new Error('Simulated second replacement failure'); } });
  assert.throws(() => failing.save(failing.list().map(d => ({ id: d.id, revision: d.revision, value: { value: 9 } }))), error('io'));
  assert.deepEqual(['a', 'b'].map(id => fs.readFileSync(path.join(root, id + '.json'), 'utf8')), snapshot);
  assert.equal(fs.readdirSync(root).filter(n => n.endsWith('.tmp')).length, 0);
  fs.writeFileSync(path.join(root, 'a.json'), '{"value":7}');
  assert.throws(() => store.undo(saved.transaction, Object.fromEntries(saved.documents.map(d => [d.id, d.revision]))), error('conflict'));
  const outside = path.join(root, '..', path.basename(root) + '-outside.json'); fs.writeFileSync(outside, '{"value":0}');
  try { assert.throws(() => new AuthoringStore({ root, documents: [{ ...documents[0], file: outside }] }), error('path')); }
  finally { fs.unlinkSync(outside); }
  const outsideDirectory = fs.mkdtempSync(path.join(scratch, 'outside-'));
  const junction = path.join(root, 'escaped-directory');
  try {
    fs.writeFileSync(path.join(outsideDirectory, 'escape.json'), '{"value":0}');
    fs.symlinkSync(outsideDirectory, junction, 'junction');
    assert.throws(() => new AuthoringStore({ root, documents: [{ ...documents[0], file: 'escaped-directory/escape.json' }] }), error('path'));
  } finally { if (fs.existsSync(junction)) fs.unlinkSync(junction); fs.rmSync(outsideDirectory, { recursive: true, force: true }); }
  // Crash journal recovery restores an interrupted group, refusing ambiguous outside modifications.
  const transaction = '12345678-1234-1234-1234-123456789abc';
  const journal = { version: 1, transaction, state: 'prepared', entries: [{ id: 'a', before: '{"value":7}', after: '{"value":8}' }] };
  fs.writeFileSync(path.join(root, '.authoring-history', transaction + '.json'), JSON.stringify(journal));
  fs.writeFileSync(path.join(root, 'a.json'), '{"value":8}');
  new AuthoringStore({ root, documents }); assert.deepEqual(store.read('a').value, { value: 7 });
  fs.writeFileSync(path.join(root, '.authoring-history', transaction + '.json'), JSON.stringify(journal));
  fs.writeFileSync(path.join(root, 'a.json'), '{"value":10}');
  assert.throws(() => new AuthoringStore({ root, documents }), error('conflict'));
  fs.writeFileSync(path.join(root, 'a.json'), '{"value":7}'); new AuthoringStore({ root, documents });
  const server = await startAuthoringServer({ store: new AuthoringStore({ root, documents }), editorOrigin: 'http://127.0.0.1:4174' });
  try {
    const headers = { Origin: 'http://127.0.0.1:4174', 'x-authoring-token': server.token, 'Content-Type': 'application/json' };
    assert.equal((await fetch(server.url + '/documents', { headers })).status, 200);
    assert.equal((await fetch(server.url + '/documents', { headers: { ...headers, Origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await fetch(server.url + '/documents', { headers: { Origin: headers.Origin } })).status, 403);
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: '{broken' })).status, 422);
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: ' '.repeat(2 * 1024 * 1024 + 1) })).status, 413);
    const current = store.read('a');
    const response = await fetch(server.url + '/save', { method: 'POST', headers, body: JSON.stringify({ edits: [{ id: 'a', revision: current.revision, value: { value: 11 } }] }) });
    assert.equal(response.status, 200); assert.deepEqual(store.read('a').value, { value: 11 });
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: JSON.stringify({ edits: [{ id: 'a', revision: current.revision, value: { value: 12 } }] }) })).status, 409);
  } finally { await server.close(); }
  console.log('Authoring save checks passed: round-trip, grouped validation, conflict, undo/redo, atomic failure rollback, crash recovery, path allowlist, and authenticated loopback HTTP.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
