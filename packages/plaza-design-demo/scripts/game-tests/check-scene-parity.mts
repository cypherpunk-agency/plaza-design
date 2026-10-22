/** Scene parity (scene-parity-lib.mts): every scene with a recorded fingerprint compiles and paints exactly as when it was recorded, in every parity view. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SCENES} from '../../src/ssg/game/scenes/index';
import {sceneSnapshot,compareSnapshots,type ParitySnapshot} from './scene-parity-lib.mts';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
const dir=path.resolve('scripts/game-tests/parity'),only=process.argv.slice(2);
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)).filter(id=>!only.length||only.includes(id));
const problems:string[]=[];
for(const id of files){
 const scene=(SCENES as Record<string,SceneDef>)[id];
 if(!scene){problems.push(id+': scene is gone');continue;}
 const detail:Record<string,unknown>={},got=sceneSnapshot(scene,detail);
 for(const [k,v]of Object.entries(detail))if(k.startsWith('paint:')&&(v as unknown[]).some(op=>typeof op==='string'&&op.startsWith('error:')))problems.push(id+': '+k+' threw '+(v as unknown[]).find(op=>typeof op==='string'&&op.startsWith('error:')));
 const diff=compareSnapshots(JSON.parse(fs.readFileSync(path.join(dir,id+'.json'),'utf8')) as ParitySnapshot,got);
 for(const d of diff)problems.push(id+': '+d);
}
assert.deepEqual(problems,[],'scenes match their recorded fingerprints');
console.log(`Scene parity PASS: ${files.length} scenes compile and paint as recorded (${files.join(', ')}).`);
process.exit(0);
