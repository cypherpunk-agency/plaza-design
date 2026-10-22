/** Shared street traffic used by the title and ordinary authored zones. */
import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import authored from '../../src/ssg/game/scenes/authored.json';
import {trafficPlan,type TrafficVehicle} from '../../src/ssg/game/art/street/traffic';
import {inPixels} from '../../src/ssg/game/art/core/pixels';
import {frameView} from '../../src/ssg/game/art/core/view';
const scene=authored.scenes.find(z=>z.scene.id==='glide-downtown')!,row=scene.composition.instances.find(n=>n.type==='street.traffic')!,props=art.properties(row.type,row.props);
const origin=scene.scene.environment!.backdrop!.x+row.placement.x;
const ctx=new Proxy({save(){},restore(){},scale(){}},{get:(o,k)=>k in o?(o as any)[k]:()=>{}}) as CanvasRenderingContext2D;
function plan(t:number,cam:number){let out:TrafficVehicle[]=[];const view={...frameView(t),viewW:1280,viewH:720,gy:591,cam,sx:(x:number,p=1)=>x-cam*p,y:(h:number)=>591-h};inPixels(ctx,view,{x:origin,h:0,scale:1,facing:1,parallax:1},P=>{out=trafficPlan(P,props,0);});return out;}
let seen=0;
for(const cam of [5800,8800,12000]){let previous=new Map<string,TrafficVehicle>();for(let frame=0;frame<=600;frame++){
 const rows=plan(frame,cam);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'one identity per traffic slot');
 assert.deepEqual(plan(frame,cam),rows,'seeking the same time has no side effects');
 for(let i=0;i<rows.length;i++){const v=rows[i];seen++;assert.ok([v.sx,v.y,v.s,v.total].every(Number.isFinite));assert.ok(v.s>0&&v.s<v.total);if(i)assert.ok(v.y>=rows[i-1].y,'far lane/turns paint before near vehicles');const last=previous.get(v.id);if(last)assert.ok(Math.hypot(v.sx-last.sx,v.y-last.y)<4,'route motion is continuous: '+v.id);}
 previous=new Map(rows.map(v=>[v.id,v]));
}}
assert.ok(seen>1000,'exercise traffic rather than an empty street');
console.log('Shared title traffic PASS: deterministic route sampling, unique slots, far-to-near order and continuous motion across three street views.');
