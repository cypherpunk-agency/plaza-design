import {Opening} from '../../src/ssg/game/story/title';
import {newSave} from '../../src/ssg/game/runtime/save';
import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {runtimeFixture} from './runtime-fixture.mts';
import {SHIPPED_PROFILES,installPlayProfiles} from '../../src/ssg/game/runtime/play-profile';
import starts from '../../src/ssg/game/world/checkpoints.json';
import {SCENES} from '../../src/ssg/game/scenes';
import {defaultNetworkContext} from '../../src/ssg/game/engine/network-context';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {createTrainRules} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import * as world from '../../src/ssg/game/world/city';
import {weatherNow,setOverride} from '../../src/ssg/game/world/weather';

const profile=SHIPPED_PROFILES.profiles.find(p=>p.id==='full')!;
function run(change:(f:any)=>void){
 const checkpoints=structuredClone(starts),f=checkpoints.fixtures.find(f=>f.id===profile.checkpoint)!;change(f);
 installPlayProfiles(SHIPPED_PROFILES,false,checkpoints);
 const metro=createLineSystem(world),models:SceneModel[]=[],entries:any[]=[],positions:any[]=[];
 const game=runtimeFixture(Game,{networkContext:defaultNetworkContext,metroInstance:metro,
  canvas:{width:1280,height:720},term:{clear(){}},hints:{sceneChanged(){}},
  enter(id:string,quiet:boolean,entrance:string,announce:boolean){entries.push({id,quiet,entrance,announce});this.scenes.here=id;this.save.scene=id;},
  placeStartingPlayer(x:number){positions.push(x);},onResize(){},persistSave(){},
  hostOf(id:string){assert.equal(id,world.TRANSPORT.boarding.scene);const model=new SceneModel({say(){},changed(){},open(){}},SCENES.train.data!,createTrainRules(metro,world));models.push(model);return{model,setPaused(on:boolean){model.setPaused(on);}};},
 });
 try{return{fixture:f,direction:game.initializeNewRun(),save:structuredClone(game.save),clock:game.clockMode,entries,positions,weather:weatherNow('downtown').kind,metroPhase:models.length?metro.ridePhase(models[0].movers):undefined};}
 finally{game.globalGameplaySession?.dispose();for(const model of models)model.dispose();}
}
try{
 const direct=run(f=>{delete f.sequence;Object.assign(f,{scene:'shop',entrance:SCENES.shop.exits[0].id,spawn:180,tokens:17,handle:'RUNNER',day:3,minute:600,weather:'rain',clock:'fixed'});});
 assert.equal(direct.direction,undefined);assert.equal(direct.save.tokens,17);assert.equal(direct.save.handle,'RUNNER');assert.deepEqual(direct.entries,[{id:'shop',quiet:true,entrance:direct.fixture.entrance,announce:false}]);assert.deepEqual(direct.positions,[180]);assert.equal(direct.clock,'fixed');assert.equal(direct.weather,'rain');assert.equal(direct.save.clock.day,3);assert.equal(direct.save.clock.min,600);
 const directed=run(f=>{f.sequence.time=44;});
 assert.deepEqual(directed.direction,{id:'glide',time:44,receipts:['hold-service','arrive-service']});
 assert(Object.keys(directed.save.scenes).length>0,'native New Game receives reconstructed model snapshots before entering');assert.equal(directed.entries[0].id,'harbor-station');
 const transit=run(f=>{delete f.sequence;f.scene='train';f.metro={version:1,start:'running',station:'galleria',lineOpen:{downtown:true,galleria:true,harbor:true}};});
 assert.equal(transit.metroPhase,'running','configured metro input starts the real service movers through the existing owner');
 const opening=new Opening(false);opening.t=123;
 const game=runtimeFixture(Game,{save:newSave(),presentation:{opening},menu:{hide(){}},
  showTitle(){throw Error('Starting the glide must retain the existing launch presentation');},
  directOpeningWorld(){},syncEnginePause(){},
 });
 game.startCheckpointDirection({id:'glide',time:44,receipts:['hold-service','arrive-service']});
 assert.equal(game.presentation.opening,opening);assert.equal(opening.t,167,'launch ambient time continues through the authored glide');assert.equal(opening.timeline.time(),44);
 console.log('Configured New Game PASS: actual Game initialization consumes checkpoint values, entrance/X, fixed clock/rain, sampled direction/receipts/model snapshots and real metro movers.');
}finally{installPlayProfiles(SHIPPED_PROFILES,false);setOverride('city',null);}
