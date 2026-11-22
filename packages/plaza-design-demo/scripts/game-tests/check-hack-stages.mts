/** Hacking capability stages (engine/hack-stages.ts): the story's grants, and the model refusing what is not yours yet. */
import assert from 'node:assert/strict';
import { SceneModel, type Line } from '../../src/ssg/game/engine/model';
import {
  ALL_HACK_STAGES,
  HACK_STAGES,
  grantedHackStages,
  type HackStage,
} from '../../src/ssg/game/engine/hack-stages';
import { createOpeningModel, openingStoryModel } from '../../src/ssg/game/story/opening-source';
import baseline from '../../src/ssg/game/story/opening.json';
import { capabilityView } from '../../src/ssg/game/world/access';
import { fixtureFlags } from '../../src/ssg/game/world/checkpoints';
import { newSave } from '../../src/ssg/game/runtime/save';
import { SCENES } from '../../src/ssg/game/scenes';

const sorted = (s: ReadonlySet<string>) => [...s].sort();

// ---------- the story's grants ----------
// The old campaign (no hackStages on its unlocked phases) keeps everything at once, as before.
for (const [phase, v] of Object.entries(openingStoryModel.PHASES)) {
  if (!v.hackLocked)
    assert.equal(v.hackStages, undefined, phase + ': old campaign phase names no stages');
}
const unlockedPhase = Object.entries(openingStoryModel.PHASES).find(([, v]) => !v.hackLocked)![0];
const lockedPhase = Object.entries(openingStoryModel.PHASES).find(([, v]) => v.hackLocked)![0];
// a model whose phase rules always land on the phase under test
const onPhase = (phase: string, patch?: (p: Record<string, unknown>) => void) => {
  const d = structuredClone(baseline) as unknown as {
    PHASES: Record<string, Record<string, unknown>>;
    PHASE_RULES: { when?: unknown; phase: string }[];
  };
  d.PHASE_RULES = [{ phase }];
  patch?.(d.PHASES[phase]);
  return createOpeningModel(d);
};
assert.deepEqual(sorted(onPhase(unlockedPhase).hackStages({})), sorted(ALL_HACK_STAGES));
assert.equal(
  onPhase(lockedPhase).hackStages({ 'hack:inspect': true }).size,
  0,
  'a locked phase gives nothing',
);

// A staged phase: what it names, plus what flags grant; nothing without inspect.
const staged = onPhase(unlockedPhase, (p) => (p.hackStages = ['inspect']));
assert.deepEqual(sorted(staged.hackStages({})), ['inspect']);
assert.deepEqual(sorted(staged.hackStages({ 'hack:wire': true })), ['inspect', 'wire']);
const flagged = onPhase(unlockedPhase, (p) => (p.hackStages = []));
assert.equal(flagged.hackStages({ 'hack:wire': true }).size, 0, 'wire without inspect is nothing');
assert.deepEqual(sorted(flagged.hackStages({ 'hack:inspect': true, 'hack:cut': true })), [
  'cut',
  'inspect',
]);
assert.equal(grantedHackStages(['wire', 'board'], {}).size, 0);

// Validation: unknown stages, duplicates and stages on a locked phase are refused.
assert.throws(
  () => onPhase(unlockedPhase, (p) => (p.hackStages = ['telekinesis'])),
  /unknown hacking stage/,
);
assert.throws(() => onPhase(unlockedPhase, (p) => (p.hackStages = ['cut', 'cut'])), /listed twice/);
assert.throws(() => onPhase(lockedPhase, (p) => (p.hackStages = ['inspect'])), /locked phase/);

// Checkpoints may start with a stage flag.
for (const s of HACK_STAGES)
  assert.ok(fixtureFlags.includes('hack:' + s), s + ' flag in the fixture vocabulary');

// ---------- the capability view ----------
const save = newSave();
save.programs = ['scan.so'];
const view = (stages: HackStage[]) =>
  capabilityView(save, new Set(stages), { scanProgram: 'scan.so' });
assert.equal(view([]).hack, false);
assert.equal(view(['inspect']).hack, true);
assert.equal(view(['inspect'])['hack:wire'], false);
assert.equal(view(['inspect', 'wire'])['hack:wire'], true);
assert.equal(view(['inspect']).network, false, 'the net needs the link stage');
assert.equal(view(['inspect', 'link']).network, true);

// ---------- the model refuses what is not yours ----------
const scene = (SCENES as Record<string, (typeof SCENES)[keyof typeof SCENES]>).sandbox;
const model = (stages: Set<HackStage>) => {
  const lines: Line[] = [];
  const m = new SceneModel(
    {
      say: (l) => lines.push(l),
      open: () => {},
      changed: () => {},
      modules: () => ['timer.so', 'switch.so'],
      stage: (s) => stages.has(s),
    },
    scene.data!,
    scene.rules as never,
  );
  m.setPaused(true);
  return { m, lines };
};
const has = new Set<HackStage>(['inspect']);
const { m, lines } = model(has);
const text = (key: string) => {
  const t = m.texts[key];
  return Array.isArray(t) ? t[1] : t;
};

// wire
const before = m.links.length;
let l = m.connect('button.button:pressed', 'hatch.hatch', 'open');
assert.equal(l[1], text('stage.wire'));
assert.equal(m.links.length, before, 'no cable without wire');
assert.equal(m.addLogic('timer'), null, 'no logic part without wire');
// cut
const cable = m.links.find((x) => !x.fixed)!;
l = m.cut(cable);
assert.equal(l[1], text('stage.cut'));
assert.ok(m.links.includes(cable), 'the cable stays without cut');
// guard: the right password does nothing yet
m.guess('login', 'login', 'bay3-qa');
assert.equal(lines.at(-1)![1], text('stage.guard'));
// link: scanning and connecting by hand
m.act('port', 'lan', 'connect qasrv');
assert.equal(lines.at(-1)![1], text('stage.link'));
assert.equal(m.scanHere()[1], text('stage.link'));
assert.equal(m.plugIn('qasrv')[1], text('stage.link'));
// an ordinary verb still runs (inspect: tapping a verb)
const n = lines.length;
m.act('hatch', 'hatch', 'open');
assert.ok(lines.length > n && lines.at(-1)![1] !== text('stage.link'));

// Granting the stages opens each one, with no other change.
for (const s of HACK_STAGES) has.add(s);
l = m.connect('button.button:pressed', 'hatch.hatch', 'open');
assert.equal(l[2], 'ok', 'wired once wire is yours: ' + l[1]);
assert.ok(m.addLogic('timer'));
l = m.cut(cable);
assert.notEqual(l[1], text('stage.cut'));
assert.ok(!m.links.includes(cable));
m.guess('login', 'login', 'bay3-qa');
assert.notEqual(lines.at(-1)![1], text('stage.guard'));
m.act('port', 'lan', 'connect qasrv');
assert.notEqual(lines.at(-1)![1], text('stage.link'));
m.dispose();

// Without a stage hook (editor scrub, demos) the model allows every stage.
const free = new SceneModel(
  { say: () => {}, open: () => {}, changed: () => {} },
  scene.data!,
  scene.rules as never,
);
for (const s of HACK_STAGES) assert.equal(free.can(s), true);
free.dispose();

console.log('hack stages: ok');
