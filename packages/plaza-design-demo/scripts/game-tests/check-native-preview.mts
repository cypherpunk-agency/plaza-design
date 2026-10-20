import assert from 'node:assert/strict';
import { art, resolveComposition, type Composition, type Environment } from '../../src/ssg/game/art';
import { previewBounds, validatePreviewWeather } from '../../src/ssg/game/authoring/native-preview';
import { overrideOf, setOverride, withSceneWeather, hereClimate, weatherAt } from '../../src/ssg/game/world/weather';
import { frameView } from '../../src/ssg/game/art/core/view';
import { CityClock } from '../../src/ssg/game/world/clock';

const document: Composition = { version: 1, scene: 'preview-contract', instances: [
  { id: 'assembly', type: 'assembly.group', props: {}, placement: { x: 100, h: 20, scale: 2, facing: -1 }, order: 0, pass: 'backdrop', children: [
    { id: 'seat', type: 'furniture.stool', props: {}, placement: { x: 10, h: 0 }, order: 1, pass: 'backdrop' },
  ] },
  { id: 'attached', type: 'furniture.stool', props: {}, placement: { x: 3, h: 1 }, attach: { instance: 'seat', anchor: 'seat' }, order: 2, pass: 'backdrop' },
] };
const env: Environment = { view: { ...frameView(0), sx: x => Math.round(x - 20), y: h => 300 - h, t: 0, cam: 20, gy: 300, viewW: 640, viewH: 360, flags: {} }, state: {}, reduced: false };
const rows = resolveComposition(art, art.validate(document), env);
const bounds = previewBounds(rows, env.view, { reduced: false }, document);
assert.deepEqual(bounds.bounds.find(b => b.id === 'attached'), { id: 'attached', x: 34, y: 232, width: 40, height: 26 });
assert.deepEqual(bounds.deltaToLocal!('attached', 20, -10), { x: -10, h: 5 }, 'drag reverses inherited mirror/scale and height direction');
const hidden = previewBounds(rows, env.view, { reduced: false, visibility: { assembly: false } }, document);
assert.equal(hidden.bounds.length, 0, 'hidden attachments cannot capture selection');
const zoom = { ...env.view, sx: (x: number) => Math.round((x - 20) * .25), y: (h: number) => 300 - h * .25 };
const zoomed = previewBounds(rows, zoom, { reduced: false }, document);
assert.deepEqual(zoomed.deltaToLocal!('attached', 5, -2.5), { x: -10, h: 5 }, 'fractional zoom remains invertible despite pixel snapping');
const before = overrideOf('downtown');
const beforeClimate = hereClimate();
try {
  setOverride('downtown', 'rain');
  assert.throws(() => withSceneWeather('downtown', 'storm', () => { assert.equal(overrideOf('downtown'), 'storm'); assert.equal(hereClimate(), 'beach'); throw new Error('paint failed'); }, 'beach'), /paint failed/);
  assert.equal(overrideOf('downtown'), 'rain', 'failed render restores the prior weather context');
  assert.equal(hereClimate(), beforeClimate, 'failed render restores public-screen reporting climate');
  withSceneWeather('downtown', 'fog', () => {
    assert.equal(hereClimate(), 'downtown');
    withSceneWeather('beach', 'clear', () => assert.equal(hereClimate(), null), null);
    assert.equal(hereClimate(), 'downtown', 'nested context restores its outer reporting climate');
  });
  assert.equal(hereClimate(), beforeClimate);
} finally { setOverride('downtown', before); }
const weather = weatherAt('downtown', 1, 580);
validatePreviewWeather(weather);
const clock = new CityClock(), liveClock = { day: 3, min: 700, seed: 9 };
clock.bind(liveClock); clock.pinned = 700; clock.speed = 10;
const previewClock = { day: 1, min: 300, seed: 2 };
assert.throws(() => clock.withSnapshot(previewClock, () => {
  assert.equal(clock.min, 300);
  clock.release(); clock.advance(15); clock.speed = 0;
  clock.withSnapshot({ day: 2, min: 100, seed: 4 }, () => assert.equal(clock.min, 100));
  assert.equal(clock.min, 315);
  throw new Error('preview failed');
}), /preview failed/);
assert.deepEqual(liveClock, { day: 3, min: 700, seed: 9 });
assert.deepEqual(previewClock, { day: 1, min: 300, seed: 2 });
assert.equal(clock.pinned, 700); assert.equal(clock.speed, 10);
clock.release(); clock.advance(1);
assert.equal(liveClock.min, 701, 'preview restores the actual save clock binding, not a copied value');
for (const key of Object.keys(weather)) {
  const missing = { ...weather }; delete (missing as Record<string, unknown>)[key];
  assert.throws(() => validatePreviewWeather(missing), /Invalid preview weather/);
}
for (const invalid of [null, [], { ...weather, extra: 0 }, { ...weather, wind: NaN }, { ...weather, mix: 1.1 }, { ...weather, rain: -1 }, { ...weather, kind: 'snow' }]) assert.throws(() => validatePreviewWeather(invalid), /Invalid preview weather/);
console.log('Native preview contracts passed: attached mirrored bounds, inverse dragging, hidden selection, fractional zoom, weather restoration on failure.');
