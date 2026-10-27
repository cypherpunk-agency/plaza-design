import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {runtimeFixture} from './runtime-fixture.mts';
import {installPlayProfiles,SHIPPED_PROFILES,startCheckpoint} from '../../src/ssg/game/runtime/play-profile';
import starts from '../../src/ssg/game/world/checkpoints.json';
import {pinStory} from '../../src/ssg/game/runtime/story-transitions';
import {city} from '../../src/ssg/game/world/clock';
import {newSave} from '../../src/ssg/game/runtime/save';

const checkpoints=structuredClone(starts),full=SHIPPED_PROFILES.profiles.find(p=>p.id==='full')!;
const row=checkpoints.fixtures.find(f=>f.id===full.checkpoint)!;
Object.assign(row,{scene:'shop',spawn:180,entrance:'review-door'});
installPlayProfiles(SHIPPED_PROFILES,false,checkpoints);
try{
 const make=(resumed=false)=>{
  const entries:unknown[]=[],positions:unknown[]=[],save=newSave();if(resumed)save.scene='shop';
  const game=runtimeFixture(Game,{save,endTitle(){},resumable:()=>true,markSeen(){},greet(){},
   enter(id:string,_quiet:boolean,entrance?:string){entries.push({id,entrance});this.scenes.here=id;this.save.scene=id;},
   placeStartingPlayer(x:number|undefined){positions.push(x);},
   sceneLifecyclePort:{scenes:{hosts:new Map(),mobiles:new Map()},zh:{},interactionHost:{}},
  });
  return{game,entries,positions};
 };
 const fresh=make();fresh.game.continueGame('shop',true);
 assert.deepEqual(fresh.entries,[{id:'shop',entrance:'review-door'}]);assert.deepEqual(fresh.positions,[180]);
 const resumed=make(true);resumed.game.continueGame(undefined,true);
 assert.deepEqual(resumed.entries,[{id:'shop',entrance:undefined}]);assert.deepEqual(resumed.positions,[undefined],'Continue never reapplies checkpoint placement');
 const explicit=make(true);explicit.game.continueGame('shop',true,'private-door',240);
 assert.deepEqual(explicit.entries,[{id:'shop',entrance:'private-door'}]);assert.deepEqual(explicit.positions,[240],'Private Play uses its selected checkpoint, not the profile template');
 const game=runtimeFixture(Game,{save:newSave(),p:{x:0,y:12},sceneDefinition:()=>({width:600}),cameraPort:{camera:{viewW:200},worldSpan:()=>[0,600]}});
 game.placeStartingPlayer(180);assert.equal(game.p.x,180);assert.equal(game.camera.cam,90);assert.equal(game.camera.camH,12);
 for(const x of [-1,601,NaN])assert.throws(()=>game.placeStartingPlayer(x),/Starting X/);
 assert.equal(game.p.x,180,'Invalid placement does not partially move the player');
 assert.equal(startCheckpoint().scene,'shop');
 city.withSnapshot({day:1,min:540,seed:1},()=>{
  const port:any={clockMode:'fixed',save:{clock:{min:540}}};
  pinStory(port);city.tick(2);assert.equal(city.min,540,'Fixed checkpoint time applies outside editor builds');
  port.clockMode='running';pinStory(port);city.tick(2);assert.equal(city.min,541,'Running mode releases the prior fixed clock through the existing city clock');
 });
 console.log('Checkpoint arrival PASS: real Game fresh entry, entrance, explicit private placement, Continue exclusion and validated camera/player placement.');
}finally{installPlayProfiles(SHIPPED_PROFILES,false);}
