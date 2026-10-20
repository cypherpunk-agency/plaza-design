import {createCityMap} from '../../src/ssg/game/ui/citymap';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCitySource} from '../../src/ssg/game/world/city-source';
import {createCityModel} from '../../src/ssg/game/world/city';
import source from '../../src/ssg/game/world/city.json';
import {SCENES} from '../../src/ssg/game/scenes';
import {Game} from '../../src/ssg/game/runtime/game';
import {taxiSequenceDuration} from '../../src/ssg/game/story/cutscenes/taxi';
const context={scenes:SCENES},legacy=JSON.parse(fs.readFileSync('scripts/scene-system/fixtures/city-baseline.json','utf8'));
legacy.ACCESS=structuredClone(source.ACCESS);for(const p of legacy.PLACES)if(p.district==='market')p.access='market-gate';for(const l of legacy.LINKS)if(l.state==='gate')l.access='market-gate';
assert.equal(legacy.version,1);assert.deepEqual(validateCitySource(legacy,context),source,'v1 upgrades every implicit native arrival to explicit v2 source');
const pending=validateCitySource(source,context);pending.TRANSPORT.boarding={scene:'capsule',entrance:'door'};pending.TRANSPORT.siding={scene:'yard',entrance:'downtown'};
pending.STATIONS.downtown.scene='capsule';pending.STATIONS.downtown.at='door';pending.STANDS.downtown.scene='yard';pending.STANDS.downtown.at='downtown';
// Resolve IDs from actual scene sources, rather than relying on guessed fixture names.
pending.TRANSPORT.boarding.entrance=SCENES.capsule.exits[0].id;pending.TRANSPORT.siding.entrance=SCENES.yard.exits[0].id;pending.STATIONS.downtown.at=SCENES.capsule.exits[0].id;pending.STANDS.downtown.at=SCENES.yard.exits[0].id;
const world=createCityModel(pending,context),arrivals:unknown[][]=[],sync:unknown[][]=[];
function game(cityModel=world){const g=Object.create(Game.prototype),metro={lineOpen:{harbor:false},boardRide:(...a:unknown[])=>sync.push(['board',...a]),platformLeft:()=>42,rideOpen:()=>true,rideAtSiding:()=>false,rideStop:()=>'downtown',rideLeft:()=>19,platformSync:(...a:unknown[])=>sync.push(['sync',...a])};Object.assign(g,{cityModel,metroInstance:metro,here:'downtown',save:{flags:{}},t:100,clock:taxiSequenceDuration*60,mapView:null,netView:null,flight:null,hop:null,reduced:false,p:{x:0},travel:(...a:unknown[])=>arrivals.push(a),say:()=>{},flash:()=>{}});return g as any;}
const g=game();g.enterTrain('downtown');assert.deepEqual(arrivals.pop(),['capsule',pending.TRANSPORT.boarding.entrance]);assert.deepEqual(sync.pop(),['board','downtown',42]);
g.stepOut();assert.deepEqual(arrivals.pop(),['capsule',pending.STATIONS.downtown.at]);assert.deepEqual(sync.pop(),['sync','downtown',100,19]);
g.metroInstance.rideAtSiding=()=>true;g.stepOut();assert.deepEqual(arrivals.pop(),['yard',pending.TRANSPORT.siding.entrance]);
g.flight={to:'downtown',start:0};g.updateTravel(1);assert.deepEqual(arrivals.pop(),['yard',pending.STANDS.downtown.at]);assert.equal(g.flight,null);
// A different authored car scene must own ride advancement and the map's riding state too.
const moved=game(),steps:number[]=[];moved.metroInstance.stepRide=(dt:number)=>{steps.push(dt);return null;};Object.defineProperty(moved,'story',{value:'free',configurable:true});moved.here=pending.TRANSPORT.boarding.scene;moved.updateTravel(2);assert.deepEqual(steps,[2]);moved.here='train';moved.updateTravel(3);assert.deepEqual(steps,[2],'the old scene name must not keep advancing the ride');
const map=createCityMap(world);assert.equal(map.openMap('view',pending.TRANSPORT.boarding.scene,'downtown').layer,'metro');assert.equal(map.openMap('view','train',null).layer,'street');
Object.defineProperty(moved,'worldMap',{value:map,configurable:true});Object.defineProperty(moved,'zh',{value:{visionOn:false},configurable:true});moved.running=true;moved.keys=new Set();moved.syncEnginePause=()=>{};moved.here=pending.TRANSPORT.boarding.scene;moved.showMap();assert.equal(moved.mapView.layer,'metro');
const spawn=structuredClone(pending);delete spawn.STATIONS.downtown.at;delete spawn.STANDS.downtown.at;delete spawn.TRANSPORT.boarding.entrance;delete spawn.TRANSPORT.siding.entrance;const spawnGame=game(createCityModel(spawn,context));spawnGame.enterTrain('downtown');assert.deepEqual(arrivals.pop(),['capsule',undefined]);spawnGame.stepOut();assert.deepEqual(arrivals.pop(),['capsule',undefined]);spawnGame.metroInstance.rideAtSiding=()=>true;spawnGame.stepOut();assert.deepEqual(arrivals.pop(),['yard',undefined]);spawnGame.flight={to:'downtown',start:0};spawnGame.updateTravel(1);assert.deepEqual(arrivals.pop(),['yard',undefined]);
for(const change of [(d:any)=>{d.TRANSPORT.boarding.entrance='missing';},(d:any)=>{d.TRANSPORT.siding.scene='missing';},(d:any)=>{d.STATIONS.downtown.at='missing';},(d:any)=>{d.STANDS.downtown.at='missing';},(d:any)=>{d.version=3;}]){const bad=structuredClone(pending);change(bad);assert.throws(()=>validateCitySource(bad,context));}
assert.deepEqual(createCityModel(validateCitySource(legacy,context)).TRANSPORT,{boarding:{scene:'train',entrance:'out'},siding:{scene:'harbor',entrance:'metro'}});
console.log('Transport destinations PASS: explicit v1->v2 compatibility, actual native boarding/platform/siding/taxi handoffs, deliberate spawn arrivals, pending reference rejection, independent shipping defaults.');
