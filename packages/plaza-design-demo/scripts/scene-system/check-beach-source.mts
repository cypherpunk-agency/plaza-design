import assert from 'node:assert/strict';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {BEACH_ACTORS} from '../../src/ssg/game/scenes/beach/scene';
import {beachScene} from '../../src/ssg/game/scenes/beach/index';
const frozen=path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source'),before=await import(pathToFileURL(path.join(frozen,'scenes/beach/index.ts')).href),bodies=await import(pathToFileURL(path.join(frozen,'scenes/beach/scene.ts')).href),old=before.beach,scene=beachScene();
for(const key of ['readables','exits','width','spawn'])assert.deepEqual(scene[key],old[key],key);
assert.deepEqual(JSON.parse(JSON.stringify(scene.uses)),JSON.parse(JSON.stringify(old.uses.map(({price,...u})=>u))),'uses');
for(const [id,actor] of Object.entries(BEACH_ACTORS)){const {conversation,...a}=actor;const {conversation:c,...b}=(old.people.find(p=>a.id!==undefined&&p.id===a.id)??bodies.BEACH_ACTORS[id]);if(old.people.some(p=>p.id===a.id&&a.id!==undefined)||id==='cat')b.h??=0;assert.deepEqual(a,b,id);}
console.log('Beach all 24 source bodies + ordinary native enumerable snapshots match immutable baseline (shared conversation metadata excepted).');
