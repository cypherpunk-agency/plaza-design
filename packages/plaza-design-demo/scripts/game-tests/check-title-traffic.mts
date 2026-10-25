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

// The corridor is authored across six chunks, but ownership windows choose a whole
// vehicle exactly once. They must never become a Canvas clip at a seam.
const {artworkClip}=await import('../../src/ssg/game/art/core/composition');
const {mobileInstances}=await import('../../src/ssg/game/art/core/mobility');
const chunks=authored.scenes.filter(s=>s.composition.instances.some(n=>n.type==='street.traffic'));
assert.equal(chunks.length,6,'the traffic corridor includes Harbor Station');
const street=scene.composition.instances.find(n=>n.id==='traffic-street')!,allProps=art.properties(street.type,street.props);
let stationVehicles=0,boundaryVehicles=0;
for(const chunk of chunks){
 const doc=art.validate(chunk.composition),mobiles=mobileInstances(doc,art),rows=doc.instances.filter(n=>n.type==='street.traffic');
 assert.equal(rows.length,3,'independently ordered far road, near road and turning traffic');
 for(const r of rows){
  assert(mobiles.has(r.id),'traffic participates in cross-chunk mobile lifetime');
  assert.equal(artworkClip(r,{...frameView(0),artworkScope:'mobile',zoneWindow:{left:0,right:chunk.scene.manifest.width}}),undefined);
  if(r.props.pass==='road'){assert.equal(r.layer,'playfield','road traffic paints after buildings');assert(r.order>120,'road traffic paints after pavement people');}
 }
 assert(rows.find(n=>n.id==='traffic-road')!.order<rows.find(n=>n.id==='traffic-road-near')!.order,'near lane stays in front across source chunks');
}
for(const cam of [7500,10300,11600,12800,13800])for(let t=0;t<=4080;t+=31){
 const view={...frameView(t),viewW:1280,viewH:720,gy:591,cam,sx:(x:number,p=1)=>x-cam*p,y:(h:number)=>591-h};
 let expected:TrafficVehicle[]=[];
 inPixels(ctx,view,{x:origin,h:0,scale:1,facing:1,parallax:1},P=>{expected=trafficPlan(P,allProps,0);});
 expected=expected.filter(v=>origin-v.X*3>=0&&origin-v.X*3<15480);
 const owned:TrafficVehicle[]=[];
 for(const chunk of chunks)for(const n of chunk.composition.instances.filter(n=>n.type==='street.traffic')){
  const p=art.properties(n.type,n.props),anchor=chunk.scene.environment!.backdrop!.x+n.placement.x;
  assert.equal(anchor,origin,'all chunks reference the same world route');
  inPixels(ctx,view,{x:anchor,h:0,scale:1,facing:1,parallax:1},P=>{
   for(const v of trafficPlan(P,p,0))if(v.pass===p.pass&&-v.X*3>=Number(p.windowFrom)&&-v.X*3<Number(p.windowTo)){
    owned.push(v);const x=origin-v.X*3;
    if(chunk.scene.id==='harbor-station')stationVehicles++;
    if(chunks.some(c=>Math.abs(x-c.scene.environment!.backdrop!.x)<v.half*3))boundaryVehicles++;
   }
  });
 }
 assert.equal(new Set(owned.map(v=>v.id)).size,owned.length,'no duplicated vehicle at a chunk handoff');
 assert.deepEqual(owned.map(v=>[v.id,v.sx,v.y,v.kind]).sort(),expected.map(v=>[v.id,v.sx,v.y,v.kind]).sort(),'source ownership preserves every route vehicle and exact pose');
}
assert(stationVehicles>100&&boundaryVehicles>100,'exercise station continuation and bodies straddling chunk borders');
console.log('Traffic boundary PASS: six native source chunks, whole-vehicle ownership without clips, far/near order, and continued Harbor routes.');

// Ring traffic has independent ownership and globally ordered front barriers.
const {ringTraffic}=await import('../../src/ssg/game/art/architecture/ring-highway');
function ringPoses(t:number,from:number,to:number,lane:'far'|'near'){
 let depth=0;const poses:number[][]=[];
 const canvas=new Proxy({createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};},save(){depth++;},restore(){depth--;},translate(x:number,y:number){if(depth===1)poses.push([x,y]);}}, {get:(o,k)=>k in o?(o as any)[k]:()=>{}}) as CanvasRenderingContext2D;
 ringTraffic(canvas,from,to,t,false,true,{from,to,lane});return poses;
}
for(const t of [0,100,300,600,1600])for(const lane of ['far','near'] as const){
 const joined=[...ringPoses(t,0,3390,lane),...ringPoses(t,3390,6240,lane)].sort((a,b)=>a[0]-b[0]);
 assert.deepEqual(joined,ringPoses(t,0,6240,lane).sort((a,b)=>a[0]-b[0]),'Ring spans select each whole vehicle exactly once');
}
for(const source of authored.scenes.filter(s=>s.composition.instances.some(n=>n.type==='architecture.ring'))){
 const doc=art.validate(source.composition),mobile=mobileInstances(doc,art),lanes=doc.instances.filter(n=>n.type==='vehicle.ring-traffic'),front=doc.instances.find(n=>n.id==='ring-front')!;
 assert.equal(lanes.length,2);assert(lanes.every(n=>mobile.has(n.id)&&n.order<front.order));
 assert(doc.instances.filter(n=>n.type==='architecture.ring').every(n=>!('traffic'in n.props)&&!mobile.has(n.id)),'the highway remains scenery');
}
for(const id of ['harbor-quay','harbor-yard']){const source=authored.scenes.find(s=>s.scene.id===id)!,doc=art.validate(source.composition),flock=doc.instances.find(n=>n.type==='character.flock')!;assert(mobileInstances(doc,art).has(flock.id));assert.equal(artworkClip(flock,{...frameView(847),artworkScope:'mobile',zoneWindow:{left:0,right:source.scene.manifest.width}}),undefined,'whole flock bodies can cross the seam');}
for(const type of ['harbor.drawFerry','harbor.drawPatrol','harbor.forkliftBody','harbor.forkliftRoof','harbor.flyingGulls','harbor.droneGull','terminal.straddle','beach.gulls']){const e=art.get(type);assert(e.mobility?.(art.properties(type,{})),type+' participates in mobile lifetime');assert(e.travelBounds,type+' supplies a complete travel envelope');}
console.log('Ring, flocks and port motion PASS: independent mobile ownership, road occlusion order, and explicit travel envelopes.');

const {drawSkyShips,createSkyShips}=await import('../../src/ssg/game/art/environment/sky-ships');
const skyPoses=(cam:number)=>{const at:number[][]=[];const canvas=new Proxy({save(){},restore(){},translate(...p:number[]){at.push(p);},createLinearGradient(){return{addColorStop(){}};}},{get:(o,k)=>k in o?(o as any)[k]:()=>{}}) as CanvasRenderingContext2D;drawSkyShips(canvas,{...frameView(600),viewW:640,viewH:360,cam,skyCam:14190},createSkyShips());return at;};
assert.deepEqual(skyPoses(900),skyPoses(0),'active-chunk rebasing never moves screen-space sky lanes');
