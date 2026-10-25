import * as StoryTransitions from '../../src/ssg/game/runtime/story-transitions';
import {runtimeFixture} from './runtime-fixture.mts';
/** Focused controller checks without constructing Game or playing the campaign. */
import assert from 'node:assert/strict';
import { Game } from '../../src/ssg/game/runtime/game';
import { SceneModel } from '../../src/ssg/game/engine/model';
import { emptyData, NO_RULES } from '../../src/ssg/game/engine/host';
import { newSave } from '../../src/ssg/game/runtime/save';
import { city, TRAVEL } from '../../src/ssg/game/world/clock';
import { taxiSequenceDuration } from '../../src/ssg/game/story/cutscenes/taxi';
import { STANDS } from '../../src/ssg/game/world/city';

function controller(destination={scene:'harbor-station'} as {scene:string;entrance?:string}) {
  const save=newSave();save.flags['prologue:started']=true;
  const game=runtimeFixture(Game,{save,scenes:{here:destination.scene}}) as any,arrivals:unknown[][]=[];
  const model=new SceneModel({say(){},open(){},changed(){}},emptyData('fixture','fixture'),NO_RULES);model.now=()=>1234;
  game.presentation.opening={handoff:destination,gliding:true,skipped:false,timeline:{time:()=>68}};
  game.endTitle=()=>{game.presentation.opening=null;};game.sequenceActions=()=>true;
  game.directOpeningWorld=()=>{game.camera.cam=50;};game.enter=(...args:unknown[])=>arrivals.push(args);
  game.markSeen=()=>{};game.introduceScene=()=>{};game.greet=()=>{};game.syncEnginePause=()=>{};game.syncHud=()=>{};game.persistSave=()=>{};
  Object.defineProperty(game,'spanW',{value:640});Object.defineProperty(game,'sceneLifecyclePort',{value:{scenes:game.scenes,camera:game.camera,sceneDefinition:()=>({}),save,zh:undefined,interactionHost:undefined}});
  game.openingDone();assert.equal(game.save,save,'completion retains the already initialized world state');assert.equal(game.camera.cam,50,'completion retains the final directed camera');assert.equal(model.now(),1234);model.dispose();return{game,arrivals};
}
assert.deepEqual(controller().arrivals,[],'completion never re-enters/reset the live Harbor platform');
const variant=controller({scene:'capsule',entrance:'door'});assert.equal(variant.game.scenes.here,'capsule');assert.deepEqual(variant.arrivals,[],'the destination was established before direction began');
assert(variant.game.save.flags['prologue:started']);
const { game } = controller(); game.scenes.here = 'capsule'; game.presentation.mapView = null; game.presentation.netView = null;
game.save = newSave(); city.bind(game.save.clock);
const minute = city.min, landings: unknown[][] = [];
game.travel = (...args: unknown[]) => landings.push(args); game.flash = () => {};
game.presentation.flight = { to: 'harbor', start: 17 }; game.timing.clock = 17 + taxiSequenceDuration * 60 - .01;
StoryTransitions.updateTravel(game.storyTransitionsPort,0); assert.equal(landings.length, 0);
game.timing.clock += .01; StoryTransitions.updateTravel(game.storyTransitionsPort,0);
assert.deepEqual(landings, [[STANDS.harbor.scene, 'taxi']]);
assert.equal(city.min - minute, TRAVEL.taxi, 'timeline duration does not change the city travel-time cost');
StoryTransitions.updateTravel(game.storyTransitionsPort,0); assert.equal(landings.length, 1, 'completion commits travel once');
assert.equal(taxiSequenceDuration * 60, 200, 'default document preserves the original taxi completion frame');
console.log('Sequence runtime checks passed: uninterrupted preinitialized opening state/camera, no duplicate entry, document-driven taxi timing and one-shot travel.');
