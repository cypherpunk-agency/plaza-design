import assert from 'node:assert/strict';
import { ArtRegistry, resolveComposition, type Composition } from '../../src/ssg/game/art/core/composition';
import { evaluateTimeline, validateTimeline, SequenceHandoff, type TimelineDocument } from '../../src/ssg/game/art/core/timeline';

const registry = new ArtRegistry().register({ type: 'test', version: 1, label: 'Test', category: 'test', parts: ['backdrop'], fields: { width: { kind: 'number', label: 'Width', default: 10, min: 0, animatable: true }, fixed: { kind: 'number', label: 'Fixed', default: 0 } }, visualFields: { open: { kind: 'boolean', label: 'Open', default: false, animatable: true } }, bounds: () => ({ x: 0, h: 0, w: 10, tall: 10 }), anchors: () => ({ mount: { x: 10, h: 5, role: 'mount' } }), draw() {} });
const composition: Composition = { version: 1, scene: 'temporary', instances: [
  { id: 'parent', type: 'test', props: {}, placement: { x: 0, h: 0 }, order: 0, layer: 'backdrop' },
  { id: 'child', type: 'test', props: {}, placement: { x: 2, h: 1 }, attach: { instance: 'parent', anchor: 'mount' }, order: 1, layer: 'backdrop' },
] };
const context = { registry, compositions: { test: composition }, destinations: { downtown: ['door'] }, clips: { test: ['idle', 'walk'] }, motionTracks: { legacy: { validate(props: Record<string, unknown>) { assert.equal(typeof props.speed, 'number'); }, evaluate(time: number, props: Record<string, unknown>) { return time * (props.speed as number); } } } };
const document: TimelineDocument = { version: 1, sequences: ['one', 'two'].map(id => ({ id, duration: 4, composition: 'test', shots: [ { id: 'wide', from: 0, to: 2, camera: { x: 0, h: 0, zoom: 1 } }, { id: 'close', from: 2, to: 4, camera: { x: 100, h: 10, zoom: 2 } } ], tracks: [
  { id: 'move', target: { kind: 'instance', instance: 'parent', property: 'x' }, keys: [{ time: 0, value: 0 }, { time: 4, value: 40 }], reduced: 'freeze' },
  { id: 'width', target: { kind: 'property', instance: 'child', property: 'width' }, keys: [{ time: 0, value: 10, ease: 'smooth' }, { time: 4, value: 30 }] },
  { id: 'door', target: { kind: 'state', instance: 'child', property: 'open' }, keys: [{ time: 0, value: false, ease: 'hold' }, { time: 2, value: true }] },
], text: [{ id: 'caption', from: 1, to: 3, text: 'Temporary test', x: 50, h: 20 }], fades: [{ id: 'fade', from: 3, to: 4, start: 0, end: 1, color: '#000' }], beats: [{ id: 'turn', time: 2 }], handoff: { scene: 'downtown', entrance: 'door' } })) };
const valid = validateTimeline(JSON.parse(JSON.stringify(document)), context);
assert.deepEqual(valid, document);
const before = JSON.stringify(context.compositions);
const mid = evaluateTimeline(valid, 'one', 2, context);
assert.deepEqual(mid.camera, { x: 100, h: 10, zoom: 2 });
assert.equal(mid.state.child.open, true);
assert.equal(mid.composition.instances[1].props.width, 20);
assert.equal(resolveComposition(registry, mid.composition, { view: {} as never, reduced: false, state: mid.state })[1].placement.x, 32);
assert.equal(mid.text.length, 1); assert.equal(mid.beats.length, 1);
for (const time of [0, 4, 1.5, 3.5, 0, 2, 4, 2]) assert.deepEqual(evaluateTimeline(valid, 'one', time, context), evaluateTimeline(valid, 'one', time, context));
assert.equal(evaluateTimeline(valid, 'one', 3.5, context).fades[0].opacity, 0.5);
assert.equal(evaluateTimeline(valid, 'one', 4, context).text.length, 0);
assert.equal(evaluateTimeline(valid, 'one', -100, context).time, 0);
assert.equal(evaluateTimeline(valid, 'one', 100, context).time, 4);
assert.equal(evaluateTimeline(valid, 'one', 2, context, { reduced: true }).composition.instances[0].placement.x, 0);
assert.equal(JSON.stringify(context.compositions), before);
const bad = (change: (doc: TimelineDocument) => void) => { const copy = structuredClone(document); change(copy); assert.throws(() => validateTimeline(copy, context)); };
bad(d => d.version = 2 as 1);
bad(d => d.sequences[1].id = 'one');
bad(d => d.sequences[0].composition = 'missing');
bad(d => d.sequences[0].shots[1].from = 1);
bad(d => d.sequences[0].tracks[0].target = { kind: 'instance', instance: 'missing', property: 'x' });
bad(d => d.sequences[0].tracks[0].target = { kind: 'property', instance: 'child', property: 'fixed' });
bad(d => d.sequences[0].tracks[0].keys[1].time = 0);
bad(d => d.sequences[0].tracks[2].keys[0].ease = 'linear');
bad(d => d.sequences[0].tracks[0].target = { kind: 'instance', instance: 'parent', property: 'facing' });
bad(d => d.sequences[0].tracks.push({ ...d.sequences[0].tracks[0], id: 'duplicate-target' }));
bad(d => d.sequences[0].handoff!.entrance = 'missing');
bad(d => d.sequences[0].tracks[0].motion = { type: 'unregistered-code', props: {} });
const exact = structuredClone(document); exact.sequences[0].tracks[0].motion = { type: 'legacy', props: { speed: 13 } };
assert.equal(evaluateTimeline(validateTimeline(exact, context), 'one', 2, context).composition.instances[0].placement.x, 26);
assert.throws(() => evaluateTimeline(valid, 'missing', 0, context));
assert.throws(() => evaluateTimeline(valid, 'one', NaN, context));
let commits = 0; const latch = new SequenceHandoff();
evaluateTimeline(valid, 'one', 4, context); assert.equal(commits, 0);
assert.equal(latch.complete(valid.sequences[0], () => commits++), true);
assert.equal(latch.complete(valid.sequences[0], () => commits++), false); assert.equal(commits, 1);
console.log('Timeline contracts passed: two multi-shot documents, attachment motion, absolute seek, reduced motion, schema rejection and one-shot handoff.');
