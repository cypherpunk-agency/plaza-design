import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir='src/ssg/game/scenes/downtown';if(fs.existsSync(dir+'/scene.json')||fs.existsSync(dir+'/gameplay.json'))throw new Error('Refusing to overwrite extracted source');
const {downtown:s}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/downtown/index.ts')).href);
const doc={version:1,id:'downtown',name:s.name,intro:[],uses:[],exits:s.exits.map(({x,...r}:any)=>r),readables:s.readables.map(({x,h,...r}:any)=>r)};
fs.writeFileSync(dir+'/scene.json',JSON.stringify(doc,null,2)+'\n');fs.writeFileSync(dir+'/gameplay.json',JSON.stringify({version:1,flags:['end'],items:[],events:[],commands:{},reactions:[],conversations:{}},null,2)+'\n');
console.log('Extracted immutable Downtown readable/exit content; custom runtime story/controller migration remains separate');
