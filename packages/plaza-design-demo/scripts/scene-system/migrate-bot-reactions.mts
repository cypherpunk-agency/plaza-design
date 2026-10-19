import fs from 'node:fs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const {BOT,CRITTER_BOT}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/art/characters/appearance.ts')).href);
const file='src/ssg/game/engine/gameplay/bot-reactions.json',fixture='scripts/scene-system/fixtures/bot-reactions-baseline.json';
if(fs.existsSync(file)||fs.existsSync(fixture))throw new Error('Refusing to overwrite bot extraction');
const roles=[...Object.entries(BOT).map(([id,b])=>({id:'robot.'+id,name:b.name,prompt:b.prompt,talk:b.lines,repeat:'cycle'})),...Object.entries(CRITTER_BOT).map(([id,b])=>({id:'legacy.'+id,name:b!.name,prompt:b!.prompt,talk:b!.lines,repeat:'cycle'}))];
const doc={version:1,voices:roles.map(({repeat,...voice})=>voice)};fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');fs.writeFileSync(fixture,JSON.stringify({version:1,roles},null,2)+'\n');console.log('Extracted '+roles.length+' procedural robot voices');
