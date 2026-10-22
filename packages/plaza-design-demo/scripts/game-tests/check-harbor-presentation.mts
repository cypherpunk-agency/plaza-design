/** Real harbor drawing agrees with its physical links and over-player occlusion. */
import assert from 'node:assert/strict';
import authored from '../../src/ssg/game/scenes/authored.json';
import {art,drawComposition,resolveComposition,type Composition} from '../../src/ssg/game/art';
import {compileLevel,compileOccluders,levelArrive,levelView,levelNear,type LevelPlayer} from '../../src/ssg/game/engine/level';
import {frameView} from '../../src/ssg/game/art/core/view';
const source=authored.scenes.find(s=>s.scene.id==='harbor-station')!,stair=source.composition.instances.find(n=>n.id==='via-stair')!;
const view={...frameView(0),sx:(x:number)=>x,y:(h:number)=>-h};
for(const facing of [1,-1] as const){
 const doc:Composition={version:1,scene:'check',instances:[{...structuredClone(stair),placement:{...stair.placement,facing}},structuredClone(source.composition.instances.find(n=>n.type==='level.floor')!) ]};
 const rows=resolveComposition(art,doc,{view,state:{}}),level=compileLevel(rows)!,link=level.links[0];
 let transform=[1,1,0,0],stack:number[][]=[],path:number[][]=[];const vertices:number[][]=[];
 const ctx:any=new Proxy({save(){stack.push([...transform]);},restore(){transform=stack.pop()!;},translate(x:number,y:number){transform[2]+=x*transform[0];transform[3]+=y*transform[1];},scale(x:number,y:number){transform[0]*=x;transform[1]*=y;},beginPath(){path=[];},moveTo(x:number,y:number){path.push([x*transform[0]+transform[2],y*transform[1]+transform[3]]);},lineTo(x:number,y:number){path.push([x*transform[0]+transform[2],y*transform[1]+transform[3]]);},fill(){vertices.push(...path);}},{get:(o,k)=>k in o?(o as any)[k]:()=>{}});
 drawComposition(ctx,art,doc,{view,state:{}},'backdrop');
 assert.ok(vertices.some(([x,y])=>x===link.low.x&&-y===link.low.h),'painted stair foot matches physical link, facing '+facing);
 assert.ok(vertices.some(([x,y])=>x===link.high.x&&-y===link.high.h),'painted stair head matches physical link, facing '+facing);
 assert.equal(stack.length,0);
}
const checkout=authored.scenes.find(s=>s.scene.id==='harbor-checkout')!,doc=art.validate({...checkout.composition,instances:checkout.composition.instances.filter(n=>['level.floor','level.barrier'].includes(n.type)).map(n=>({...n,bindings:{}}))}),rows=resolveComposition(art,doc,{view,state:{}}),level=compileLevel(rows)!,barrier=level.barriers![0],occluders=compileOccluders(rows);
const player:LevelPlayer={x:barrier.x,y:barrier.h??0,vy:0,onGround:true,moving:false,face:1},state=levelArrive(level,player,0);
assert.equal(levelNear(level,levelView({source:level,state},{} as never,player),occluders)[barrier.id]?.near,1,'near cabinet moves to the over-player slot while passing');
player.x+=200;const away=levelArrive(level,player,0);assert.ok(!levelNear(level,levelView({source:level,state:away},{} as never,player),occluders)[barrier.id]?.near,'cabinet returns to ordinary drawing away from the turnstile');
console.log('Harbor presentation PASS: both stair facings match physical endpoints; turnstile near cabinet follows the player.');
