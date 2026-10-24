import {projection} from '../../src/ssg/game/runtime/camera';
import {createCameraState} from '../../src/ssg/game/runtime/state';
import {runtimeFixture} from './runtime-fixture.mts';
/** Joined hosts retain local anchors while sharing the native game's camera and pixel scale. */
import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';

type Point={x:number;h:number};
type Screen={x:number;y:number};
function host(){
 const calls:{project:(x:number,h:number)=>Screen;width:number;player:Point}[]=[];
 return{uiTop:0,calls,follow(project:(x:number,h:number)=>Screen,width:number,player:Point){calls.push({project,width,player});}};
}
const active=host(),service=host(),near=host(),unjoined=host();
const game=runtimeFixture(Game,{zh:active,canvas:{width:1280,clientWidth:1280},p:{x:440,h:0,y:35},keyBar:{root:{offsetHeight:24}},scenes:{hosts:new Map([['station',service],['near',near],['unjoined',unjoined]]),joinedZones:[{id:'station',dx:-2400,dh:180},{id:'near',dx:900,dh:-40},{id:'not-hosted',dx:4000,dh:0}],zoneTiers:new Map([['station','visible'],['near','near'],['not-hosted','visible']])},camera:{k:2,cam:120.25,gy:280},presentation:{hudH:46}});
const follow=()=>Game.prototype['followHost' as never].call(game);
follow();
assert.equal(active.calls.length,1);assert.equal(service.calls.length,1);
assert.equal(near.calls.length,0,'near, non-visible hosts do not run presentation work');
assert.equal(unjoined.calls.length,0,'unrelated hosted scenes do not receive a placement');
const a=active.calls[0],b=service.calls[0];
assert.deepEqual(a.project(450,70),{x:660,y:420},'active host retains its original projection');
assert.deepEqual(b.project(2850,-110),a.project(450,70),'the same world anchor agrees across horizontal and vertical seams');
assert.deepEqual(b.player,{x:2840,h:-145},'the player reaches the source host in its own coordinates');
assert.deepEqual(b.project(b.player.x,b.player.h),a.project(game.p.x,game.p.y),'caption avoidance uses the same player screen position');
assert.equal(b.width,1280);assert.equal(service.uiTop,124);assert.equal(active.uiTop,service.uiTop);
// The camera/scale can change without changing the vehicle owner's local coordinates.
game.camera.cam=600.75;game.camera.gy=320;game.camera.k=3;follow();
assert.deepEqual(service.calls[1].project(2850,-110),active.calls[1].project(450,70));
const beforeCrossing=service.calls[1].project(2850,-110);
// After the seam crossing, rebase the world once. It must not accumulate a host offset.
game.camera.cam+=2400;game.p.x+=2400;game.p.y-=180;game.camera.gy-=180;
game.zh=service;game.scenes.hosts.set('former-active',active);
game.scenes.joinedZones=[{id:'former-active',dx:2400,dh:-180}];
game.scenes.zoneTiers=new Map([['former-active','visible']]);follow();
assert.deepEqual(service.calls[2].project(2850,-110),beforeCrossing,'source owner becomes active without a jump');
assert.deepEqual(active.calls[2].project(450,70),service.calls[2].project(2850,-110),'former active host rebases exactly once');
assert.deepEqual(service.calls[2].player,{x:2840,h:-145});
console.log('Joined host projection PASS: native camera mapping, two-axis seams, player exclusion, scale changes, residency filtering and rebasing.');

const frozen=Object.freeze({...createCameraState(),wasVision:true,vz:.5,vcam:100});
const snapshot=structuredClone(frozen),projected=projection(frozen);
assert.deepEqual(projected,{k:1,viewW:1280,viewH:640,gy:540,cam:100});
assert.deepEqual(frozen,snapshot,'projection never changes runtime camera, even temporarily');
console.log('Immutable hack-camera projection PASS.');
