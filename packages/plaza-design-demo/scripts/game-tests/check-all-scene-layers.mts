/** Every composition document is layered: each scene's manifest spawn is its single player row, sequences (cutscenes, the title) have none, and proposals keep their base scene's spawn. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {art} from '../../src/ssg/game/art';
import {LAYERS, PLAYER_ROW, type Composition, type Instance} from '../../src/ssg/game/art/core/composition';

const game='src/ssg/game';
const flat=(ns:Instance[]):Instance[]=>ns.flatMap(n=>[n,...flat(n.children??[])]);
/** Every composition JSON in the game sources, whatever folder it lives in. */
const files=(dir:string):string[]=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const file=path.join(dir,entry.name);return entry.isDirectory()?files(file):/(^|\.)composition\.json$/.test(entry.name)?[file]:[];});
const scenes:string[]=[],sequences:string[]=[],others:string[]=[];
for(const file of files(game).sort()){
 const raw=JSON.parse(fs.readFileSync(file,'utf8'));
 const doc=art.validate(raw) as Composition,rows=flat(doc.instances),players=rows.filter(n=>n.type===PLAYER_ROW);
 assert.ok(rows.every(n=>LAYERS.includes(n.layer)),`${file}: every instance has a layer`);
 if(doc.scene.startsWith('sequence-')){assert.equal(players.length,0,`${file}: a sequence has no player row`);sequences.push(doc.scene);continue;}
 const sceneFile=path.join(path.dirname(file),'scene.json');
 if(fs.existsSync(sceneFile)){
  assert.equal(players.length,1,`${file}: one player row`);
  const scene=JSON.parse(fs.readFileSync(sceneFile,'utf8'));
  assert.equal(typeof scene.manifest.spawn==='string'?scene.manifest.spawn:scene.manifest.spawn.instance,players[0].id,`${file}: the manifest spawn is the player row`);
  scenes.push(doc.scene);
 } else { assert.ok(players.length<=1,`${file}: at most one player row`);others.push(doc.scene); }
}
assert.ok(scenes.length>=19,'all scenes found');
console.log(`All scene layers PASS: ${scenes.length} scenes with their spawn as the player row (${scenes.join(', ')}); ${sequences.length} sequences without one (${sequences.join(', ')}); also ${others.join(', ')}.`);
