import assert from 'node:assert/strict';
import { ArtRegistry, type Composition } from '../../src/ssg/game/art/core/composition';
import { validateTimeline, evaluateTimeline } from '../../src/ssg/game/art/core/timeline';
import { openingDocuments } from '../../src/ssg/game/story/title/documents';
import { cinematicDocuments } from '../../src/ssg/game/story/cutscenes/documents';
import { openingTimelineContext, openingElements } from '../../src/ssg/game/art/sequences/opening/sequence';
import { cinematicTimelineContext, cinematicElements, cutView } from '../../src/ssg/game/art/sequences/cinematics';
import { Skyline } from '../../src/ssg/game/art/environment/skyline';
import{introFrame}from'../../src/ssg/game/art/sequences/skyline';
import{IntroSeekSession}from'../../src/ssg/game/story/cutscenes/skyline-session';
import{lightAt}from'../../src/ssg/game/world/light';
const lighting=lightAt(1,580,90,null);
import { groupElement } from '../../src/ssg/game/art/assemblies/group';

function recording() {
  const commands: unknown[] = [];
  const values: Record<string, unknown> = { getTransform: () => ({ a: 2 }), measureText: (s: string) => ({ width: s.length * 6 }) };
  const ctx = new Proxy(values, { get(t, k: string) { if (k in t) return t[k]; if (k.startsWith('create')) return () => ({ addColorStop() {} }); return (...args: unknown[]) => { commands.push([k, ...args]); }; }, set(t, k: string, v) { t[k] = v; commands.push([k, v]); return true; } }) as unknown as CanvasRenderingContext2D;
  return { ctx, commands };
}
const context = recording();
const registry = new ArtRegistry().register(groupElement); [...openingElements, ...cinematicElements].forEach(e => registry.register(e));
assert.equal(registry.catalog().length, openingElements.length + cinematicElements.length + 1);
const opening = validateTimeline(openingDocuments.timeline, openingTimelineContext(context.ctx, {W:640,H:360,reduced:false,lighting}, openingDocuments, 7, 'glide'));
const cinematic = validateTimeline(cinematicDocuments.timeline, cinematicTimelineContext(cutView(640,360,false,lighting), cinematicDocuments));
assert.deepEqual(opening, JSON.parse(JSON.stringify(openingDocuments.timeline)));
assert.deepEqual(cinematic, JSON.parse(JSON.stringify(cinematicDocuments.timeline)));
assert.deepEqual(opening.sequences.map(s => s.id), ['title', 'rise', 'glide']);
assert.deepEqual(cinematic.sequences.map(s => s.id), ['intro', 'act2', 'taxi']);
assert.equal(opening.sequences.find(s => s.id === 'glide')!.handoff!.scene, 'train');
assert.equal(cinematic.sequences.find(s => s.id === 'intro')!.handoff!.scene, 'capsule');
assert.equal(cinematic.sequences.find(s => s.id === 'act2')!.handoff!.scene, 'stacks');
const frame = evaluateTimeline(cinematic, 'act2', 8, cinematicTimelineContext(cutView(640,360,false,lighting), cinematicDocuments));
assert.equal(frame.text.length, 1); assert.equal(frame.state.titles.two, 1); assert.ok((frame.state.ferry.amount as number) > 0);
for (const composition of [openingDocuments.composition, ...Object.values(cinematicDocuments.compositions)]) {
  assert.ok(composition.instances.length >= 6); assert.deepEqual(registry.validate(JSON.parse(JSON.stringify(composition))), composition);
  const edited = structuredClone(composition) as Composition; edited.instances[1].placement.x = 17; assert.equal(registry.validate(edited).instances[1].placement.x, 17);
}

const view = cutView(640,360,false,lighting);
for (const reduced of [false, true]) {
  const forward = new Skyline(), seek = new IntroSeekSession(), f = recording(), r = recording(), expected = new Map<number, string>();
  const v = { ...view, reduced };
  for (let frame = 0; frame <= 1560; frame++) {
    const time = frame / 60, previous = frame ? (frame - 1) / 60 : 0;
    f.commands.length = 0; r.commands.length = 0;
    const parts = introFrame(f.ctx, v, time, 26, { city: forward, step: Math.min(3, Math.max(0, (time - previous) * 60)) }).parts;
    parts.find(p => p.id === 'network')!.draw();
    const sought = seek.parts(r.ctx, v, time, 26); sought.find(p => p.id === 'network')!.draw();
    assert.deepEqual(r.commands, f.commands, `Packet seek differs at ${time}, reduced ${reduced}`);
    if (frame % 30 === 0) expected.set(frame, JSON.stringify(f.commands));
  }
  for (const frame of [1560, 0, 960, 90, 1500, 180, 960, 0]) {
    r.commands.length = 0; seek.parts(r.ctx, v, frame / 60, 26).find(p => p.id === 'network')!.draw(); assert.equal(JSON.stringify(r.commands), expected.get(frame));
  }
  const a = new Skyline(), b = new Skyline(), ca = recording(), cb = recording();
  const initial = introFrame(ca.ctx, v, 0, 26, { city: a, step: 0 }); introFrame(cb.ctx, v, 0, 26, { city: b, step: 0 });
  for (let frame = 0; frame < 1000; frame++) {
    ca.commands.length = cb.commands.length = 0;
    const k = frame % 11 === 0 ? 3 : frame % 7 === 0 ? 0 : 1;
    a.parts(ca.ctx, initial.frame, { ...initial.draw, k }).find(p => p.id === 'network')!.draw(); b.advance(cb.ctx, initial.frame, k, reduced);
    assert.deepEqual(a.snapshot(), b.snapshot());
  }
  const snapshot = a.snapshot(); a.advance(ca.ctx, initial.frame, 100, reduced); a.restore(snapshot); assert.deepEqual(a.snapshot(), snapshot);
}
console.log(`Sequence documents and replay checks passed: six sequences, ${openingElements.length + cinematicElements.length} registered pieces, nested coast/town groups, source round-trip/handoffs, full 60fps packet replay, backward seek and snapshot/advance equivalence.`);
