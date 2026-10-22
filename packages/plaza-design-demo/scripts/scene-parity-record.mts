/**
 * Record scene parity fingerprints (game-tests/scene-parity-lib.mts) before a scene migrates:
 * `npx tsx scripts/scene-parity-record.mts shop library` (no ids: every scene). Writes
 * game-tests/parity/<id>.json; check-scene-parity.mts compares the scene against it from then on.
 */
import fs from 'node:fs';
import path from 'node:path';
import {SCENES} from '../src/ssg/game/scenes/index';
import {sceneSnapshot} from './game-tests/scene-parity-lib.mts';
const ids=process.argv.slice(2).length?process.argv.slice(2):Object.keys(SCENES);
const dir=path.resolve('scripts/game-tests/parity');fs.mkdirSync(dir,{recursive:true});
for(const id of ids){
 const scene=(SCENES as Record<string,import('../src/ssg/game/scenes/kit').SceneDef>)[id];
 if(!scene)throw new Error('Unknown scene '+id);
 fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(sceneSnapshot(scene),null,1)+'\n');
 console.log('recorded',id);
}
process.exit(0);
