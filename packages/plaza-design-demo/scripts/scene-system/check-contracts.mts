import assert from 'node:assert/strict';
import { art, ArtRegistry, compositionAppearance, drawComposition, resolveComposition, type Composition, type Environment } from "../../src/ssg/game/art/index";

const doc: Composition = { version: 1, scene: 'contract-fixture', instances: [
  { id: 'pair', type: 'assembly.group', props: {}, placement: { x: 100, h: 20, scale: 2, facing: -1 }, pass: 'backdrop', order: 0, children: [
    { id: 'seat', type: 'furniture.stool', props: { seed: 2 }, placement: { x: 10, h: 0 }, pass: 'backdrop', order: 1 },
  ] },
  { id: 'attached', type: 'furniture.stool', props: {}, placement: { x: 3, h: 1 }, attach: { instance: 'seat', anchor: 'seat' }, pass: 'foreground', order: 2 },
] };
const env: Environment = { reduced: false, state: {}, view: { sx: x => x, y: h => 300 - h, t: 0, cam: 0, gy: 300, viewW: 640, viewH: 360, flags: {} } };
const validated = art.validate(JSON.parse(JSON.stringify(doc)));
assert.deepEqual(validated, doc);
const resolved = resolveComposition(art, validated, env);
assert.deepEqual(resolved.find(x => x.instance.id === 'attached')!.placement, { x: 74, h: 42, scale: 2, facing: -1, parallax: 1 });
assert.equal(resolved.find(x => x.instance.id === 'attached')!.props.seed, 1);
function rejected(change: (d: Composition) => void, pattern: RegExp) {
  const bad = structuredClone(doc); change(bad); assert.throws(() => art.validate(bad), pattern);
  assert.deepEqual(validated, doc, 'failed validation cannot mutate accepted document');
}
rejected(d => { d.instances[1].id = 'pair'; }, /duplicate/);
rejected(d => { d.instances[1].attach!.instance = 'absent'; }, /missing attachment/);
rejected(d => { d.instances[1].attach!.anchor = 'absent'; }, /missing anchor/);
rejected(d => { d.instances[0].attach = { instance: 'attached', anchor: 'seat' }; }, /cycle/);
rejected(d => { d.instances[1].placement.scale = 0; }, /invalid placement/);
rejected(d => { d.instances[1].props.seed = null; }, /invalid number/);
rejected(d => { d.instances[1].props.other = 2; }, /unknown property/);
rejected(d => { d.instances[1].type = 'absent'; }, /Unknown artwork/);
console.log('Contract checks passed: round trip, nested mirrored anchors, defaults, invalid references/cycles/properties, rejected edits preserve accepted data.');

// Real source documents bind structured snapshots and animation channels; validate them at the boundary.
const registry = new ArtRegistry().register({
  type: 'contract.world', version: 1, label: 'World fixture', category: 'test', coordinates: 'world', parts: ['backdrop'],
  fields: { positions: { kind: 'json', label: 'Positions', default: [], validate(value) {
    if (!Array.isArray(value) || value.some(v => typeof v !== 'number')) throw new Error('Expected numeric positions');
  } } },
  visualFields: { brightness: { kind: 'number', label: 'Brightness', default: 0, min: 0, max: 1 } },
  animationClips: { pulse: { duration: 2, loop: true, sample: phase => phase / 2 } },
  bounds: () => ({ x: 0, h: 10, w: 20, tall: 10 }), anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(_ctx, view, _props, state, _pass, placement) { calls.push({ nativeView: view === env.view, state: structuredClone(state), x: placement.x }); },
});
const calls: { nativeView: boolean; state: unknown; x: number }[] = [];
const world: Composition = { version: 1, scene: 'world-test', instances: [{ id: 'world', type: 'contract.world', props: { positions: [1, 2] }, placement: { x: 25, h: 0 }, order: 0, pass: 'backdrop', bindings: { brightness: 'lamp.level' } }] };
registry.validate(world);
assert.throws(() => resolveComposition(registry, world, env), /unresolved visual binding/);
assert.throws(() => resolveComposition(registry, world, { ...env, bindings: { 'lamp.level': 'bright' } }), /invalid number/);
assert.throws(() => registry.properties('contract.world', { positions: [true] }), /numeric positions/);
const input = [1, 2], props = registry.properties('contract.world', { positions: input }); input.push(3);
assert.deepEqual(props.positions, [1, 2], 'structured artwork inputs are copied');
const bound = { ...env, bindings: { 'lamp.level': .25 } };
drawComposition({} as CanvasRenderingContext2D, registry, world, bound, 'backdrop');
assert.deepEqual(calls.pop(), { nativeView: true, state: { brightness: .25 }, x: 25 }, 'native world kernels receive the original camera and resolved placement');
const clipped = resolveComposition(registry, world, { ...bound, clips: { world: { brightness: 'pulse' } }, sequenceTime: 5 });
assert.equal(clipped[0].state.brightness, .5, 'looping clip evaluates at absolute seek time');
assert.throws(() => resolveComposition(registry, world, { ...bound, clips: { world: { brightness: 'absent' } } }), /unknown registered animation clip/);
assert.throws(() => resolveComposition(registry, world, { ...bound, clips: { world: { absent: 'pulse' } } }), /unknown animation channel/);
drawComposition({} as CanvasRenderingContext2D, registry, world, { ...bound, visibility: { world: false } }, 'backdrop');
assert.equal(calls.length, 0, 'hidden instances never paint');
console.log('Snapshot/clip checks passed: structured validation and copying, strict bindings, native camera identity, deterministic clips, invisible instances.');
const hierarchy = structuredClone(doc);
assert.equal(compositionAppearance(hierarchy, { visibility: { pair: false } }).get('attached')!.visible, false, 'attached descendants inherit hidden group visibility');
assert.equal(compositionAppearance(hierarchy, { opacity: { pair: .5, seat: .5, attached: .5 } }).get('attached')!.opacity, .125, 'nested and attached opacity multiplies exactly once per ancestor');
assert.throws(() => compositionAppearance(hierarchy, { opacity: { pair: 2 } }), /invalid animation opacity/);
assert.equal(compositionAppearance(hierarchy, {}).get('attached')!.opacity, 1, 'shipping defaults preserve identity appearance');
console.log('Group appearance checks passed: nested/attached visibility and opacity, invalid opacity, identity defaults.');
