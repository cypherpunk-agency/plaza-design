import assert from 'node:assert/strict';
import { art, resolveComposition, type Composition, type Environment } from '../../src/ssg/game/art';
import { previewBounds } from '../../src/ssg/game/authoring/native-preview';
import { overrideOf, setOverride, withSceneWeather } from '../../src/ssg/game/world/weather';

const document: Composition = { version: 1, scene: 'preview-contract', instances: [
  { id: 'assembly', type: 'assembly.group', props: {}, placement: { x: 100, h: 20, scale: 2, facing: -1 }, order: 0, pass: 'backdrop', children: [
    { id: 'seat', type: 'furniture.stool', props: {}, placement: { x: 10, h: 0 }, order: 1, pass: 'backdrop' },
  ] },
  { id: 'attached', type: 'furniture.stool', props: {}, placement: { x: 3, h: 1 }, attach: { instance: 'seat', anchor: 'seat' }, order: 2, pass: 'backdrop' },
] };
const env: Environment = { view: { sx: x => Math.round(x - 20), y: h => 300 - h, t: 0, cam: 20, gy: 300, viewW: 640, viewH: 360, flags: {} }, state: {}, reduced: false };
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
try {
  setOverride('downtown', 'rain');
  assert.throws(() => withSceneWeather('downtown', 'storm', () => { assert.equal(overrideOf('downtown'), 'storm'); throw new Error('paint failed'); }), /paint failed/);
  assert.equal(overrideOf('downtown'), 'rain', 'failed render restores the prior weather context');
} finally { setOverride('downtown', before); }
console.log('Native preview contracts passed: attached mirrored bounds, inverse dragging, hidden selection, fractional zoom, weather restoration on failure.');
