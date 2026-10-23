/** Native stations observe TRAIN-0; boarding/alighting cannot restart or retime it. */
import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {Game} from '../../src/ssg/game/runtime/game';
import * as city from '../../src/ssg/game/world/city';
import {createLineSystem} from '../../src/ssg/game/world/transport/line';
import {createTrainRules,boardRide} from '../../src/ssg/game/engine/gameplay/mechanisms/line-ride';
import {platformFrame} from '../../src/ssg/game/world/transport/platform-frame';
import {frameView} from '../../src/ssg/game/art/core/view';
import {advance,tickUntil} from './train-ride.mts';

const metro=createLineSystem(),scene=SCENES.train,
 model=new SceneModel({say(){},open(){},changed(){}},scene.data!,createTrainRules(metro));
metro.lineOpen.harbor=true;model.setPaused(true);
boardRide(model,'galleria',240);
advance(model,500);
const before=structuredClone(metro.rideView(model.movers));
const observed=metro.stationFrame('galleria',model.movers);
assert.equal(observed.departure.message,'BOARDING');
assert.equal(observed.departure.left,metro.rideLeft(model.movers));
// The actual native platform binding wins over both animation time and the retired platform clock.
const view={...frameView(99999),transit:{station:'galleria',...observed}};
const frame=platformFrame(city.STATIONS.galleria.scene,view,metro);
assert.deepEqual(frame['transit.departure'],observed.departure);
assert.deepEqual(metro.rideView(model.movers),before,'station painting never advances or restarts the train');

// The ordinary Game host lifecycle retains that same owner while waiting on the platform.
{
 const native=Object.create(Game.prototype) as any,shown:unknown[]=[],platform={show:(...args:unknown[])=>shown.push(['platform',...args])},train={show:(...args:unknown[])=>shown.push(['train',...args])};
 Object.defineProperties(native,{world:{value:city},here:{value:'galleriaStation'},zh:{value:platform},interactionHost:{value:platform},
  hosts:{value:new Map([['galleriaStation',platform],['train',train]])},joinedZones:{value:[]},zoneTiers:{value:new Map()},
  hostOf:{value:(id:string)=>{assert.equal(id,'train');return train;}},unload:{value:()=>assert.fail('waiting must not unload the observed train')}});
 native.showHost();
 assert.deepEqual(shown,[['platform',true,true],['train',false,false]],'the existing hidden host keeps its normal Game tick');
}

tickUntil(model,()=>metro.ridePhase(model.movers)==='closing');
assert.equal(metro.stationFrame('galleria',model.movers).departure.message,'CLOSING');
tickUntil(model,()=>metro.ridePhase(model.movers)==='running');
assert(metro.stationFrame('harbor',model.movers).departure.due>0,'next station ETA reads the existing trip');
model.brake('train','car');
assert.equal(metro.stationFrame('harbor',model.movers).departure.message,'DELAYED');
assert.equal(metro.stationFrame('harbor',model.movers).departure.due,0,'no fake countdown during emergency braking');
tickUntil(model,()=>metro.ridePhase(model.movers)==='halted');
for(const station of city.LINE){
 assert.equal(metro.stationFrame(station,model.movers).departure.message,'DELAYED');
}
const halted=structuredClone(metro.rideView(model.movers));
model.tick(6000,true);
assert.deepEqual(metro.rideView(model.movers),halted,'pausing the existing model pauses every station observation');
tickUntil(model,()=>metro.ridePhase(model.movers)==='resuming');
assert.notEqual(metro.stationFrame('harbor',model.movers).departure.message,'DELAYED');
tickUntil(model,()=>metro.ridePhase(model.movers)==='opening');
assert.equal(metro.rideStop(model.movers),'harbor');
tickUntil(model,()=>metro.rideOpen(model.movers));
metro.lineOpen.harbor=false;
assert.equal(metro.stationFrame('harbor',model.movers).departure.open,false);
console.log('Shared station ride PASS: native station binding, physical boarding covered by train-physical-source, unchanged trip, stop placement, doors, delay/resume, pause and locks. No separate platform clock.');
