import {createCameraState,createInputState,createScenesState,createTimingState,createPresentationState} from '../../src/ssg/game/runtime/state';

/** Constructor-free fixture for focused Game methods. Uses the current owned records;
 * lazy runtime ports are initialized by Game itself, never mocked or reimplemented here. */
export function runtimeFixture(Game:{prototype:object},fields:Record<string,unknown>={}):any {
  const game=Object.assign(Object.create(Game.prototype),{
    content:{},sources:{},clockMode:'story',camera:createCameraState(),input:createInputState(),scenes:createScenesState(),
    timing:createTimingState(),presentation:createPresentationState(),
  });
  for(const [key,value] of Object.entries(fields)){
    if(['camera','input','scenes','timing','presentation'].includes(key))Object.assign(game[key],value);
    else Object.defineProperty(game,key,{value,writable:true,configurable:true,enumerable:true});
  }
  return game;
}
