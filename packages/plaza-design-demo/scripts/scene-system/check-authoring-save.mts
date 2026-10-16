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
  const originalFormatting = '{\r\n\t"value":0\r\n}';
  fs.writeFileSync(path.join(root, 'a.json'), originalFormatting);
  const formattedStore = new AuthoringStore({ root, documents: [documents[0]] }), formatted = formattedStore.read('a');
  const formatChange = formattedStore.save([{ id: 'a', revision: formatted.revision, value: { value: 1 } }]);
  formattedStore.undo(formatChange.transaction, { a: formatChange.documents[0].revision });
  assert.equal(fs.readFileSync(path.join(root, 'a.json'), 'utf8'), originalFormatting, 'journal undo preserves CRLF, indentation and missing final newline byte-for-byte');
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
  // An outside edit after our first replacement must survive a later grouped failure.
  // The three-file case also proves rollback continues restoring other files we still own.
  for(const failAt of[1,2]){
    const raceRoot=path.join(root,'rollback-race-'+failAt);fs.mkdirSync(raceRoot);
    const ids=Array.from({length:failAt+1},(_,i)=>'file-'+i),raceDocs=ids.map(id=>({id,file:id+'.json',kind:'composition' as const,validate}));
    const originals=ids.map((_id,i)=>'{\r\n  "value":'+i+'\r\n}');for(const[id,index]of ids.map((id,i)=>[id,i]as const))fs.writeFileSync(path.join(raceRoot,id+'.json'),originals[index]);
    const outsideEdit='{\r\n\t"value":42\r\n}',race=new AuthoringStore({root:raceRoot,documents:raceDocs,beforeReplace(index){if(index===failAt){fs.writeFileSync(path.join(raceRoot,ids[0]+'.json'),outsideEdit);throw new Error('Outside writer followed by grouped failure');}}});
    assert.throws(()=>race.save(race.list().map(d=>({id:d.id,revision:d.revision,value:{value:9}}))),error('io'));
    assert.equal(fs.readFileSync(path.join(raceRoot,ids[0]+'.json'),'utf8'),outsideEdit,'Failed save must not overwrite the external writer');
    for(let i=1;i<ids.length;i++)assert.equal(fs.readFileSync(path.join(raceRoot,ids[i]+'.json'),'utf8'),originals[i],'Other safely owned/replaced or untouched files retain original bytes');
    const journalPath=path.join(raceRoot,'.authoring-history',fs.readdirSync(path.join(raceRoot,'.authoring-history'))[0]),retained=JSON.parse(fs.readFileSync(journalPath,'utf8'));
    assert.equal(retained.state,'prepared','Unresolved rollback retains its recovery journal');assert.equal(retained.entries[0].before,originals[0]);assert.equal(JSON.parse(retained.entries[0].after).value,9);
    assert.throws(()=>new AuthoringStore({root:raceRoot,documents:raceDocs}),error('conflict'),'Restart must refuse ambiguous outside changes');
    assert.equal(fs.readFileSync(path.join(raceRoot,ids[0]+'.json'),'utf8'),outsideEdit);assert.equal(JSON.parse(fs.readFileSync(journalPath,'utf8')).state,'prepared');
    assert.equal(fs.readdirSync(raceRoot).filter(name=>name.endsWith('.tmp')).length,0);
    // Explicit operator resolution to the known original permits ordinary startup recovery.
    fs.writeFileSync(path.join(raceRoot,ids[0]+'.json'),originals[0]);new AuthoringStore({root:raceRoot,documents:raceDocs});assert.equal(JSON.parse(fs.readFileSync(journalPath,'utf8')).state,'rolled-back');
  }
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
    assert.equal((await fetch(server.url + '/documents', { headers: { ...headers, 'x-authoring-token': 'é'.repeat(64) } })).status, 403, 'non-ASCII tokens cannot crash byte-length-sensitive comparison');
    assert.equal((await fetch(server.url + '/documents', { headers })).status, 200, 'service stays available after malformed authentication');
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: '{broken' })).status, 422);
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: ' '.repeat(2 * 1024 * 1024 + 1) })).status, 413);
    const current = store.read('a');
    const response = await fetch(server.url + '/save', { method: 'POST', headers, body: JSON.stringify({ edits: [{ id: 'a', revision: current.revision, value: { value: 11 } }] }) });
    assert.equal(response.status, 200); assert.deepEqual(store.read('a').value, { value: 11 });
    assert.equal((await fetch(server.url + '/save', { method: 'POST', headers, body: JSON.stringify({ edits: [{ id: 'a', revision: current.revision, value: { value: 12 } }] }) })).status, 409);
  } finally { await server.close(); }
  console.log('Authoring save checks passed: round-trip, grouped validation, conflict, undo/redo, atomic failure rollback, concurrent outside-edit preservation/recovery, crash recovery, path allowlist, and authenticated loopback HTTP.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
