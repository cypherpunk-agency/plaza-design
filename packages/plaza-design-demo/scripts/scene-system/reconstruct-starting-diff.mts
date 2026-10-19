/** Reconstruct the scoped starting diff from immutable bytes; never recapture the baseline. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('../..'),baseline=path.join(root,'.scene-system/all-game-baseline-2026-10-18');
const manifest=JSON.parse(fs.readFileSync(path.join(baseline,'manifest.json'),'utf8'));
const digest=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(JSON.stringify(manifest.files)),manifest.sourceFingerprint,'untouched baseline manifest identity');
const prefix='packages/plaza-design-demo/src/ssg/game/';
const tracked=execFileSync('git',['ls-tree','-r','--name-only',manifest.head,'--',prefix],{cwd:root,encoding:'utf8'})
 .trim().split('\n').filter(file=>/\.(ts|tsx|json|md)$/.test(file)).map(file=>file.slice(prefix.length));
const original=new Map<string,string>();
for(const file of tracked)original.set(file,digest(execFileSync('git',['show',manifest.head+':'+prefix+file],{cwd:root})));
for(const[file,hash]of Object.entries(manifest.files))assert.equal(digest(fs.readFileSync(path.join(baseline,'source',file))),hash,'baseline bytes: '+file);
const rows=[...new Set([...tracked,...Object.keys(manifest.files)])].sort().flatMap(file=>{
 const before=original.get(file),after=manifest.files[file] as string|undefined;
 return before===after?[]:[{file,status:before===undefined?'added':after===undefined?'deleted':'modified',before:before??null,after:after??null}];
});
const report={version:1,method:'reconstructed from captured immutable bytes and original Git tree; not a contemporaneous git diff',
 capturedAt:manifest.capturedAt,head:manifest.head,sourceFingerprint:manifest.sourceFingerprint,
 diffFingerprint:digest(JSON.stringify(rows)),scope:'game TS/TSX/JSON/MD files only; no claim about uncaptured repository paths',
 limitations:['Does not prove that the producer ledger or all later behavior fixtures were written before dependent migrations.'],
 filesChecked:Object.keys(manifest.files).length,counts:Object.fromEntries(['added','modified','deleted'].map(status=>[status,rows.filter(row=>row.status===status).length])),rows};
const output=path.join(root,'.scene-system/all-game-baseline-reconciliation/starting-diff.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,...report,rows:undefined},null,2));
