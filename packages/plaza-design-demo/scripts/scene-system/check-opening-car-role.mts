import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {createCityModel} from '../../src/ssg/game/world/city';
import source from '../../src/ssg/game/world/city.json';
import {openingStoryModel,validateOpeningSource} from '../../src/ssg/game/story/opening-source';
import {SCENES} from '../../src/ssg/game/scenes';
import {newSave} from '../../src/ssg/game/runtime/save';

assert(!('scene'in openingStoryModel.CONTROLLER.homeRun),'World owns the car role without a duplicated opening scene field');
const stale:any=structuredClone(openingStoryModel.source);stale.CONTROLLER.homeRun.scene='train';assert.throws(()=>validateOpeningSource(stale),'retired duplicate field is rejected');
for(const car of ['train','library','yard'])for(const phase of ['home','free']){
 const city=structuredClone(source);city.TRANSPORT.boarding={scene:car};const world=createCityModel(city,{scenes:SCENES}),save=newSave(),g:any=Object.create(Game.prototype),ride:any={};
 const scene={id:car,name:'Car role test',width:1000,spawn:100,exits:[]},host={persist(){},closeAll(){},model:{}};
 const values={world,openingStory:openingStoryModel,story:phase,levelW:1000,pixelHere:false,zh:host,metro:{ride,SEG:3000},here:'downtown',hosts:new Map(),nudged:new Set(),p:{x:0,face:1},viewW:640,save,canvas:{setAttribute(){}},hints:{sceneChanged(){}},sceneDefinition:()=>scene,hostOf:()=>host,showHost(){},markSeen(){},syncHud(){},persistSave(){},say(){},greet(){}};
 Object.defineProperties(g,Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value,writable:true,configurable:true}])));
 (Game.prototype as any).enter.call(g,car,true);
 assert.equal(g.here,car);assert.equal(g.p.x,100);
 if(phase==='home'){assert.equal(ride.phase,'running');assert.equal(ride.timer,openingStoryModel.HOME_RUN.start);assert.equal(ride.at,world.LINE.indexOf(openingStoryModel.CONTROLLER.homeRun.from));assert.equal(ride.to,world.LINE.indexOf(openingStoryModel.CONTROLLER.homeRun.to));}
 else assert.deepEqual(ride,{},'normal scene entry does not initialize the opening ride');
 if(car!=='train'){
  for(const key of Object.keys(ride))delete ride[key];(Game.prototype as any).enter.call(g,'train',true);assert.deepEqual(ride,{},'the old train ID has no remaining opening-car behavior');
 }
}
console.log('Opening car role PASS: actual native Game.enter follows pending World boarding scene in three scenes, preserves run initialization and free-phase behavior, old train ID and duplicate source field retired.');
