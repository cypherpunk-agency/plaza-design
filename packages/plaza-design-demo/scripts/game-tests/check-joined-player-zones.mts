import {newSave} from '../../src/ssg/game/runtime/save';
import {runtimeFixture} from './runtime-fixture.mts';
/** Native zone sensing reads the same player in each resident owner's coordinate frame. */
import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {SceneModel} from '../../src/ssg/game/engine/model';
function model(id:string){return new SceneModel({say(){},open(){},changed(){}},{id,name:id,state:{},tuning:{},texts:{},dialogue:{},goals:[],cables:[],devices:[{id:'detector',name:'Detector',nouns:[{id:'area',layer:'hardware',function:'sense',events:['enters','leaves'],zone:{watch:'player',from:100,to:200,within:[20,40]}}]}]} as never);}
const current=model('current'),source=model('source'),unjoined=model('unjoined');
const currentHost={model:current},sourceHost={model:source},unjoinedHost={model:unjoined};
const game:any=runtimeFixture(Game,{save:newSave()});
Object.assign(game,{p:{x:-1100,y:130},scenes:Object.assign(game.scenes,{here:'current',hosts:new Map([['current',currentHost],['source',sourceHost],['unjoined',unjoinedHost]]),joinedZones:[{id:'source',dx:-1000,dh:100}],level:null})});
game.syncPlayerLocations();source.tick(16,true);assert(!source.zones.inside('detector.area'));
game.p.x=-850;const now=source.now(),saved=JSON.stringify(source.snapshot());
game.syncPlayerLocations();assert.equal(source.now(),now,'projection cannot tick the model');assert.equal(JSON.stringify(source.snapshot()),saved,'projection cannot write gameplay or zone state');
assert.deepEqual(current.player,{x:-850,h:130});assert.deepEqual(source.player,{x:150,h:30});assert.equal(unjoined.player,null,'unrelated held models do not retain a ghost player');
source.tick(16,true);assert(source.zones.inside('detector.area'),'the real source-owner sensor sees the player cross its region');
game.p.y=500;game.syncPlayerLocations();source.tick(16,true);assert(!source.zones.inside('detector.area'),'vertical seam placement also reaches the native sensor');
game.p.y=130;game.syncPlayerLocations();source.tick(16,true);assert(source.zones.inside('detector.area'));
// Same-named rooms in two scenes are independent: do not copy another owner's building tag.
const floor={id:'floor',zone:'current',building:'current/office',x:-1200,w:2000,h:130,label:'Office'};
game.scenes.level={source:{floors:[floor]},state:{floor:'floor',ride:null,reveal:{}}};game.syncPlayerLocations();
assert.equal(current.player!.building,'office');assert.equal(source.player!.building,undefined);
floor.zone='source';floor.building='source/office';game.syncPlayerLocations();
assert.equal(source.player!.building,'office');assert.equal(current.player!.building,undefined);
game.scenes.level.state.ride={};game.syncPlayerLocations();assert.equal(source.player!.building,undefined,'stairs retain their existing no-building sensing policy');
game.scenes.level=null;game.scenes.joinedZones=[];game.syncPlayerLocations();assert.equal(source.player,null,'leaving the joined component clears its old player input');
console.log('Joined player zones PASS: actual model crossings, two-axis placement, pure projection, building ownership, stairs and departed-host cleanup.');
