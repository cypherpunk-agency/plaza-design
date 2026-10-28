import assert from 'node:assert/strict';
import {art} from '../../src/ssg/game/art';
import {frameView} from '../../src/ssg/game/art/core/view';
import {measureArtwork} from '../../src/ssg/game/art/core/measure';
import {drawSkyCraft} from '../../src/ssg/game/art/environment/sky-ships';
import {clearWorld} from '../../src/ssg/game/art/core/canvas';
import {recorder} from './capture-actor-paint.mts';
const view={...frameView(600),viewW:960,viewH:540,gy:486,cam:0,sx:(x:number)=>x,y:(h:number)=>486-h},at={x:0,h:0,scale:1,parallax:1,facing:1 as const};
const sky=art.get('environment.sky'),props=art.properties(sky.type,{style:'sunset',horizon:189});
const skyBounds=(h:number)=>measureArtwork(ctx=>sky.draw(ctx,view,props,{},'backdrop',{...at,h}));
const base=skyBounds(0),moved=skyBounds(120);assert.equal(moved.width,base.width);assert.equal(moved.height,base.height);assert.equal(moved.y,base.y-120,'Moving the sky translates rather than stretches its camera picture');

const clouds=art.get('environment.cloud-layer'),cloudProps=art.properties(clouds.type,{minX:0,maxX:24000,spacing:1200,velocityX:0,seed:5});
const paintClouds=(width:number)=>{const r=recorder();clouds.draw(r.ctx,{...view,viewW:width},cloudProps,{},'backdrop',at);return r.paints.filter(p=>p[0]==='fillRect');};
const small=paintClouds(960),large=paintClouds(20000);
assert.deepEqual(small,large.filter(p=>Number(p[1])<=960),'Cloud positions and sizes do not depend on viewport width');
assert.ok(large.length<=42,'Zooming out cannot generate an unbounded cloud field');
assert.equal(clouds.fields.altitude.label,'Altitude');assert.equal(clouds.fields.spacing.min,3);

const lanes=art.get('vehicle.traffic-lane'),lane={kind:'pod',minX:100,maxX:400,altitude:300,direction:1,speed:0,spacing:300,seed:3,densityStartX:100,densityEndX:400,densityBefore:1,densityAfter:1};
const laneProps=art.properties(lanes.type,lane),lanePaint=(width:number)=>{const r=recorder();lanes.draw(r.ctx,{...view,viewW:width},laneProps,{sequenceTime:-1},'backdrop',at);return r.paints;};
assert.equal(JSON.stringify(lanePaint(960)),JSON.stringify(lanePaint(20000)),'A visible finite route paints the same craft, independent of viewport size');
assert.ok(lanePaint(960).length>0);
assert.throws(()=>art.properties(lanes.type,{...lane,spacing:0}));
assert.throws(()=>art.properties(lanes.type,{...lane,maxX:lane.minX}));
assert.equal(lanes.fields.minX.kind,'number');assert.deepEqual(lanes.spatial!.fields,['minX','maxX','altitude'],'An independent route exposes typed properties and actual spatial controls');

const fleet=(width:number)=>{const r=recorder();drawSkyCraft(r.ctx,{...view,viewW:width},{kind:'freighter',ps:2,y:66,speed:.15,offset:800,flip:true,depth:.4});return r.paints;};
assert.equal(JSON.stringify(fleet(960)),JSON.stringify(fleet(20000)),'Classic traffic wraps on a fixed authored route, not on the viewport');
const normal=recorder(),workspace=recorder();clearWorld(normal.ctx,960,540);clearWorld(workspace.ctx,960,540,'#101722');
assert.equal((normal.paints[0].at(-1)as any).style,'#000');assert.equal((workspace.paints[0].at(-1)as any).style,'#101722');
console.log('PASS: sky translation, finite stable clouds and traffic, typed validated routes, and host-only workspace background.');
