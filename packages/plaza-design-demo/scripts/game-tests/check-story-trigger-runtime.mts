import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {runtimeFixture} from './runtime-fixture.mts';
import {newSave} from '../../src/ssg/game/runtime/save';
import {SCENES} from '../../src/ssg/game/scenes';
import {defaultNetworkContext} from '../../src/ssg/game/engine/network-context';
import {openingStoryModel} from '../../src/ssg/game/story/opening-source';
import {runCues,updateStory} from '../../src/ssg/game/runtime/story-transitions';
import capsule from '../../src/ssg/game/scenes/capsule/scene.json';

function make(save=newSave()){
 const printed:string[]=[],game=runtimeFixture(Game,{save,p:{x:50,y:0},
  scenes:{here:'capsule'},networkContext:defaultNetworkContext,
  zh:{viewing:null,popupOpen:false},sceneDefinition:(id:keyof typeof SCENES)=>SCENES[id],
  term:{print:(line:string)=>printed.push(line)},persistSave(){},syncHud(){},
  say(name:string,pages:string[]){this.presentation.bubble={name,pages};},
 });return{game,printed};
}
const {game,printed}=make();game.save.flags={
 [openingStoryModel.OPENING.home]:true,[openingStoryModel.OPENING.slept]:true,
};
try{
 assert.equal(game.story,'deleted');
 updateStory(game.storyTransitionsPort);assert.equal(game.presentation.stamps['morning.at'],0);
 const tries=capsule.phases.deleted.exits.door.cues;
 game.timing.clock=10;assert(runCues(game.storyTransitionsPort,tries as any));
 assert.equal(game.globalGameplay().state().values.story.morningTries,1);
 game.timing.clock=111;updateStory(game.storyTransitionsPort);assert.equal(game.save.flags['opening:uplink'],undefined);
 game.timing.clock=112;runCues(game.storyTransitionsPort,tries as any);
 assert.equal(game.globalGameplay().state().values.story.morningTries,2);
 game.timing.clock=212;updateStory(game.storyTransitionsPort);assert.equal(game.save.flags['opening:uplink'],undefined,'exactly 100 quiet frames must still wait');
 game.timing.clock=213;game.zh.popupOpen=true;updateStory(game.storyTransitionsPort);assert.equal(game.save.flags['opening:uplink'],undefined);
 game.zh.popupOpen=false;updateStory(game.storyTransitionsPort);
 assert.equal(game.save.flags['opening:uplink'],true);assert(game.save.keyring.includes('uplink'));
 assert.equal(game.story,'uplinked');assert.equal(game.presentation.bubble.name,'MOTH › YOU');
 const lines=printed.length;game.timing.clock++;updateStory(game.storyTransitionsPort);assert.equal(printed.length,lines,'the committed phase prevents duplicate message effects');
 game.zh.viewing='router';updateStory(game.storyTransitionsPort);assert.equal(game.save.flags['opening:jacked'],undefined);
 game.zh.viewing='pc';updateStory(game.storyTransitionsPort);assert.equal(game.save.flags['opening:jacked'],true);assert.equal(game.story,'free');
 const saved=game.prepareSave(game.save);assert.equal(saved.gameplay.story?.morningTries,undefined,'attempt counts do not become a second saved progression system');
 const resumed=make(saved);try{resumed.game.zh.viewing='pc';updateStory(resumed.game.storyTransitionsPort);assert.equal(resumed.printed.length,0,'loading completed progression does not replay the message');assert.equal(resumed.game.globalGameplay().state().values.story.morningTries,0);}finally{resumed.game.globalGameplaySession?.dispose();}
 const simultaneous=make();try{
  simultaneous.game.save.flags={[openingStoryModel.OPENING.home]:true,[openingStoryModel.OPENING.slept]:true};
  simultaneous.game.runOpeningWorkflow('morning.due');simultaneous.game.zh.viewing='pc';
  updateStory(simultaneous.game.storyTransitionsPort);assert.equal(simultaneous.game.story,'uplinked');assert.equal(simultaneous.game.save.flags['opening:jacked'],undefined,'new phase is observed on the next frame, preserving story tick order');
  updateStory(simultaneous.game.storyTransitionsPort);assert.equal(simultaneous.game.save.flags['opening:jacked'],true);
 }finally{simultaneous.game.globalGameplaySession?.dispose();}
 assert(runCues(game.storyTransitionsPort,[{milestone:'morning.reset'}]));assert.equal(game.globalGameplay().state().values.story.morningTries,0);
 console.log('Story trigger runtime PASS: actual Game/global session and authored door cues, two attempts, strict quiet boundary, popup blocking, ordinary key grant/phase, one message, schematic observation and no replay on current-save restoration.');
}finally{game.globalGameplaySession?.dispose();}
