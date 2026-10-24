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

function controller(destination?: { scene: string; entrance?: string }) {
  // Prototype-only adapter deliberately avoids canvas, DOM input and player-storage construction.
  const game = runtimeFixture(Game) as any;
  const arrivals: unknown[][] = [];
  const model = new SceneModel({ say() {}, open() {}, changed() {} }, emptyData('downtown', 'fixture'), NO_RULES);
  game.presentation.opening = { handoff: destination };
  game.hints={sceneChanged(){}};game.content={};
  game.endTitle = () => { game.presentation.opening = null; };
  game.term = { close() {}, clear() {} }; game.scenes.hosts = new Map(); game.hostOf = () => ({ model }); game.syncHud = () => {};
  game.enter = (...args: unknown[]) => arrivals.push(args);
  game.openingDone();
  return { game, arrivals };
}
assert.deepEqual(controller().arrivals, [['harbor-station', true, undefined]], 'opening hands off to the real Harbor platform');
const variant = controller({ scene: 'capsule', entrance: 'door' });
assert.deepEqual(variant.arrivals, [['capsule', true, 'door']], 'authored destination is captured before the title controller closes');
assert.equal(variant.game.save.flags['prologue:started'], true, 'prologue initialization remains owned by the game controller');
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
console.log('Sequence runtime checks passed: default/authored opening destinations, preserved story initialization, document-driven taxi timing and one-shot travel.');
