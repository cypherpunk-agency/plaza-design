import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
// Editor work patterns that made Play take 5.6 s and froze ambient animation (2026-10-28). Panels read source through
// liveSources(context) / api.snapshot(): one frozen map per source version that pending validators cache on. A map
// built from context.documents, or a get() copy per document, misses those caches and rebuilds the world each render.
const dir='src/ssg/game/authoring',problems:string[]=[];
for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.ts'))){
 if(name==='validation-snapshot.ts')continue;// owns the one shared map
 const source=fs.readFileSync(path.join(dir,name),'utf8');
 const at=(index:number)=>`${name}:${source.slice(0,index).split('\n').length}`;
 // A whole-document map keyed by document id: use liveSources(context).
 for(const m of source.matchAll(/new Map\(\s*(?:context\.)?documents\s*(?:\.filter\([^)]*\))?\s*\.map\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\[\s*\1\.id\s*,/g))problems.push(`${at(m.index!)} builds a document map; use liveSources(context)`);
 // A deep copy per document: get() inside a callback over the document list.
 for(const m of source.matchAll(/(?:documents|docs)\s*\.(?:map|filter|flatMap)\(\s*\(?\s*(\w+)\s*\)?\s*=>[^;]{0,240}?\b(?:api|authoring|model)\.get\(\s*\1\.id\s*\)/g))problems.push(`${at(m.index!)} copies every document with get(); read liveSources(context) or api.snapshot()`);
 // Self-scheduling animation loops must survive a failing frame: wrap the frame's work in runFrame() or try/catch.
 for(const m of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\(?[^=;]{0,40}\)?\s*=>\s*\{/g)){
  const name_=m[1],start=m.index!+m[0].length;let depth=1,i=start;for(;i<source.length&&depth;i++){if(source[i]==='{')depth++;else if(source[i]==='}')depth--;}
  const body=source.slice(start,i);if(!new RegExp(`requestAnimationFrame\\(\\s*${name_}\\s*\\)`).test(body))continue;
  if(!/runFrame\(|\btry\s*\{/.test(body))problems.push(`${at(m.index!)} animation loop "${name_}" stops on the first failing frame; wrap its work in runFrame()`);
 }
}
assert.deepEqual(problems,[],'\n'+problems.join('\n'));
console.log('Authoring read patterns PASS: no whole-document maps or per-document copies outside the shared snapshot; animation loops survive failing frames.');
