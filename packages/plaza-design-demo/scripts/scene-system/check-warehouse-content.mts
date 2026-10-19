import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {warehouseScene,warehouseComposition} from '../../src/ssg/game/scenes/warehouse';
import {WAREHOUSE_SCENE,WAREHOUSE_GAMEPLAY} from '../../src/ssg/game/scenes/warehouse/scene-document';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {frameView} from '../../src/ssg/game/art/core/view';
import {lightAt} from '../../src/ssg/game/world/light';
import {recorder} from './capture-actor-paint.mts';
import type {EngineDraw} from '../../src/ssg/game/engine/host';
const {warehouseScene:before}=await import(pathToFileURL(path.resolve('../../.scene-system/all-game-baseline-2026-10-18/source/scenes/warehouse/index.ts')).href);
(globalThis as any).document={createElement:()=>{const r=recorder();return{width:0,height:0,paint:r.paints,getContext:()=>r.ctx};}};
const old=before(),scene=warehouseScene(),plain=(v:unknown)=>JSON.parse(JSON.stringify(v));
assert.equal(scene.width,old.width);assert.equal(scene.spawn,old.spawn);assert.deepEqual(scene.exits,old.exits);assert.deepEqual(scene.readables,old.readables);
for(const use of scene.uses!){const original=old.uses.find((u:any)=>u.id===use.id);assert.equal(use.x,original.x);assert.equal(use.promptH,original.promptH);}
let saved={flags:{},items:{},tokens:0,values:{}};
const gp=new GameplaySession(scene.gameplay!,{read:()=>saved,write:v=>{saved=v as typeof saved;}});
assert.deepEqual(scene.uses![0].use({gameplay:gp} as any),old.uses[0].use({}));
for(const id of ['mender','gull']){const original=old.people.find((p:any)=>p.id===id),actor=scene.people!.find(p=>p.id===id)!;for(let i=0;i<original.talk.length+1;i++){const run=new ConversationSession(gp,actor.conversation!);assert.deepEqual(run.frame().pages,original.talk[Math.min(i,original.talk.length-1)]);run.close();}}
const restored=new GameplaySession(scene.gameplay!,{read:()=>saved,write:v=>{saved=v as typeof saved;}});assert.deepEqual(new ConversationSession(restored,'talk.warehouse.mender').frame().pages,old.people[0].talk.at(-1));
const edited=structuredClone(WAREHOUSE_SCENE);edited.name='Pending Warehouse';edited.people![0].talk[0]=['Pending words'];edited.uses[0].routes[0].pages=['Pending door'];
const pending=warehouseScene(warehouseComposition,{},{},edited,WAREHOUSE_GAMEPLAY);assert.equal(pending.name,'Pending Warehouse');
const editedSession=new GameplaySession(pending.gameplay!,{read:()=>({flags:{},items:{},tokens:0}),write:()=>{}});assert.deepEqual(pending.uses![0].use({gameplay:editedSession} as any),['Pending door']);assert.deepEqual(new ConversationSession(editedSession,'talk.warehouse.mender').frame().pages,['Pending words']);
let paints=0;for(const [w,h,cam,t,min] of [[640,360,0,0,0],[960,540,200,137,580],[1280,720,500,300,1100],[400,900,440,198,1200]]){
 const v={...frameView(t,lightAt(1,min,scene.facing??0,null,false)),cam,gy:h-60,t,viewW:w,viewH:h,flags:{},sx:(x:number,p=1)=>x-cam*p+w/2,y:(height:number)=>h-60-height};
 const a=recorder(),b=recorder();old.drawBackdrop(a.ctx,v,{} as EngineDraw);scene.drawBackdrop(b.ctx,v,{} as EngineDraw);assert.deepEqual(plain(b.paints),plain(a.paints));paints++;
}
console.log(`Warehouse PASS: original geometry/door/readables, shared dialogue persistence and pending edits; ${paints} immutable native draw transcripts. Pixel raster comparison remains separate.`);
