/** Immutable starting source/content inventory. Run once before all-game migrations. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {SCENES} from '../../src/ssg/game/scenes';
import {gameplayScenes} from '../../src/ssg/game/authoring/gameplay-scenes';
import {nativeGameplayScenes} from '../../src/ssg/game/authoring/native-gameplay-scenes';
import {playScenes} from '../../src/ssg/game/authoring/play-fixtures';
const root=path.resolve('../..'),game=path.resolve('src/ssg/game');
const destination=path.join(root,'.scene-system/all-game-baseline-2026-10-18');
if(fs.existsSync(path.join(destination,'manifest.json')))throw new Error('Immutable baseline already exists; never overwrite it');
const digest=(v:string|Buffer)=>crypto.createHash('sha256').update(v).digest('hex');
const files:Record<string,string>={};
function snapshot(dir:string){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const source=path.join(dir,entry.name);if(entry.isDirectory())snapshot(source);else if(/\.(ts|tsx|json|md)$/.test(entry.name)){const relative=path.relative(game,source).replaceAll('\\','/'),bytes=fs.readFileSync(source),target=path.join(destination,'source',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);files[relative]=digest(bytes);}}}
snapshot(game);
const functionKeys=(s:object)=>Object.entries(s).filter(([,v])=>typeof v==='function').map(([k])=>k);
const clean=(v:unknown):any=>typeof v==='function'?{nativeFunction:digest(String(v))}:Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,clean(v)])):v;
const rows=Object.entries(SCENES).map(([id,scene])=>({id,name:scene.name,width:scene.width,spawn:scene.spawn,
  initial:{composition:true,sceneDocument:gameplayScenes.some(s=>s.id===id),partialGameplay:nativeGameplayScenes.some(s=>s.id===id),privatePlay:(playScenes as readonly string[]).includes(id)},
  counts:{people:scene.people?.length??0,uses:scene.uses?.length??0,readables:scene.readables?.length??0,rests:scene.rests?.length??0,exits:scene.exits.length,devices:scene.data?.devices?.length??0},
  nativeCallbacks:functionKeys(scene),baseline:clean(scene)}));
const manifest={version:1,capturedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFingerprint:digest(JSON.stringify(files)),files,rows,
  limitations:['Source/content snapshot and function fingerprints only; not pixel comparison, runtime outcome evidence or migration completion.']};
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.mkdirSync('scripts/scene-system/fixtures',{recursive:true});
fs.writeFileSync('scripts/scene-system/fixtures/all-game-initial-inventory.json',JSON.stringify({...manifest,files:undefined,rows:rows.map(({baseline,...row})=>row)},null,2)+'\n');
console.log(`Captured ${rows.length} scenes, ${Object.keys(files).length} immutable source files: ${manifest.sourceFingerprint}`);
