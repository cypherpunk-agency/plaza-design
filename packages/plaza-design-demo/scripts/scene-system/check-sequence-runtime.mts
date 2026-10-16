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
  const game = Object.create(Game.prototype) as any;
  const arrivals: unknown[][] = [];
  const model = new SceneModel({ say() {}, open() {}, changed() {} }, emptyData('downtown', 'fixture'), NO_RULES);
  game.opening = { handoff: destination };
  game.endTitle = () => { game.opening = null; };
  game.term = { close() {}, clear() {} }; game.hosts = new Map(); game.hostOf = () => ({ model }); game.syncHud = () => {};
  game.enter = (...args: unknown[]) => arrivals.push(args);
  game.openingDone();
  return { game, arrivals };
}
assert.deepEqual(controller().arrivals, [['train', true, undefined]], 'unmodified opening preserves train-home handoff');
const variant = controller({ scene: 'capsule', entrance: 'door' });
assert.deepEqual(variant.arrivals, [['capsule', true, 'door']], 'authored destination is captured before the title controller closes');
assert.equal(variant.game.save.flags['opening:home'], true, 'story initialization remains owned by the game controller');
const { game } = controller(); game.here = 'capsule'; game.mapView = null; game.netView = null;
game.save = newSave(); city.bind(game.save.clock);
const minute = city.min, landings: unknown[][] = [];
game.travel = (...args: unknown[]) => landings.push(args); game.flash = () => {};
game.flight = { to: 'harbor', start: 17 }; game.clock = 17 + taxiSequenceDuration * 60 - .01;
game.updateTravel(0); assert.equal(landings.length, 0);
game.clock += .01; game.updateTravel(0);
assert.deepEqual(landings, [[STANDS.harbor.scene, 'taxi']]);
assert.equal(city.min - minute, TRAVEL.taxi, 'timeline duration does not change the city travel-time cost');
game.updateTravel(0); assert.equal(landings.length, 1, 'completion commits travel once');
assert.equal(taxiSequenceDuration * 60, 200, 'default document preserves the original taxi completion frame');
console.log('Sequence runtime checks passed: default/authored opening destinations, preserved story initialization, document-driven taxi timing and one-shot travel.');
