import assert from 'node:assert/strict';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {drawStreetSprite,streetSpriteHeadHeight,streetSpriteKinds} from '../../src/ssg/game/art/characters/street-sprite';
import {SPR} from '../../src/ssg/game/art/core/sprites';import {frameView} from '../../src/ssg/game/art/core/view';import {recorder} from './capture-actor-paint.mts';import {lightAt} from '../../src/ssg/game/world/light';
const {DowntownArtwork}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/art/assemblies/downtown.ts')).href);
let checks=0;for(const sprite of streetSpriteKinds)for(const t of [0,1,31,137,400])for(const cam of [0,313])for(const flip of [false,true]){
 const view={...frameView(t,lightAt(1,580,80,null,false)),cam,gy:460,viewW:1280,viewH:540,flags:{},sx:(x:number,p=1)=>x*p-cam,y:(h:number)=>460-h},a=recorder(),b=recorder(),native=new DowntownArtwork();native.set(a.ctx,view);
 if(sprite==='fixer'){if(flip)continue;native.drawFixer(810);}else native.drawPedestrian(810,SPR[sprite],flip);
 drawStreetSprite(b.ctx,view,{kind:'streetSprite',sprite,flip},810);assert.deepEqual(JSON.parse(JSON.stringify(b.paints)),JSON.parse(JSON.stringify(a.paints)),sprite+' '+t+' '+cam+' '+flip);assert.equal(streetSpriteHeadHeight({kind:'streetSprite',sprite}),sprite==='fixer'?74:46);checks++;
}
console.log('Downtown street sprite PASS: '+checks+' frozen original draw transcripts and exact native caption head heights.');
