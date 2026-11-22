/** Logic rule view: clauses read the real chunk sources, and in-place edits stay valid source. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateGameplay } from '../../src/ssg/game/engine/gameplay/validation';
import { validateSceneDocument } from '../../src/ssg/game/engine/gameplay/scene-document';
import { declaredSceneOptions } from '../../src/ssg/game/engine/gameplay/declared-scene';
import {
  chunkRuleList,
  useRuleClauses,
  triggerRuleClauses,
  objectiveRuleClauses,
  describeCondition,
  addConjunct,
  replaceConjunct,
  conditionPart,
  parseRuleKey,
  ruleKey,
  promptVerb,
} from '../../src/ssg/game/authoring/rule-model';
import type { SceneDocument } from '../../src/ssg/game/engine/gameplay/scene-document';

const game = path.resolve('src/ssg/game');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(game, file), 'utf8'));
const g = validateGameplay(read('scenes/downtown/gameplay.json'));
const raw = read('scenes/downtown/scene.json'),
  composition = read('scenes/downtown/composition.json');
const doc = validateSceneDocument(raw, g, declaredSceneOptions(raw, undefined, composition));

// Rule list: every authored row appears once in its group, in source order.
const items = chunkRuleList(doc, g);
assert.deepEqual(
  items.filter((i) => i.group === 'Interactions').map((i) => i.key),
  doc.uses.flatMap((u) => [
    'use:' + u.id,
    ...(u.items ?? []).map((_, i) => 'use:' + u.id + ':item:' + i),
  ]),
);
assert.equal(
  items.filter((i) => i.group === 'Triggers').length,
  Object.keys(g.native?.triggers ?? {}).length,
);
assert.equal(items.filter((i) => i.group === 'Objectives').length, doc.objectives!.length);
assert.equal(
  items.filter((i) => i.group === 'Story phases').length,
  Object.keys(doc.phases ?? {}).length,
);
assert.ok(
  items.every((i) => !i.issues.length),
  'valid source has no broken items',
);
for (const item of items)
  assert.equal(ruleKey(parseRuleKey(item.key)!), item.key, 'key round trip');

// The fixer: WHEN prompt/subject, IF always, DO quote + conversation, ORDER before devices.
const fixer = doc.uses.find((u) => u.id === 'fixer')!;
const rule = useRuleClauses(doc, g, fixer);
assert.equal(promptVerb('[E] TALK · HINT'), 'TALK · HINT');
assert.deepEqual(
  rule.when.map((t) => t.text),
  ['TALK', 'FIXER'],
);
assert.deepEqual(
  rule.if.map((t) => t.text),
  ['always'],
);
assert.deepEqual(
  rule.do.map((t) => t.text),
  ['quote downtown.fixer.hint', 'open conversation talk.downtown.fixer'],
);
assert.deepEqual(
  rule.order.map((t) => t.text),
  ['before devices', 'first match wins'],
);
assert.match(
  rule.reads,
  /^When the player picks “TALK” at FIXER, quote downtown\.fixer\.hint, then open the conversation talk\.downtown\.fixer\.$/,
);
assert.deepEqual(rule.subjects, ['fixer']);

// Broken references show on the token and in the list without throwing.
const broken = structuredClone(doc) as SceneDocument;
broken.uses[0].routes = [{ command: 'gone.command' }];
const brokenRule = useRuleClauses(broken, g, broken.uses[0]);
assert.equal(brokenRule.do.at(-1)!.issue, 'missing command gone.command');
assert.deepEqual(chunkRuleList(broken, g)[0].issues, ['missing command gone.command']);

// Condition text stays readable and keeps authored identifiers.
assert.equal(describeCondition(undefined), 'always');
assert.equal(describeCondition({ flag: 'metFixer', is: false }), 'metFixer is off');
assert.equal(
  describeCondition({
    all: [{ flag: 'a' }, { any: [{ tokensAtLeast: 2 }, { item: 'x', atLeast: 1 }] }],
  }),
  'a is on and (tokens ≥ 2 or x ≥ 1)',
);
assert.equal(
  describeCondition({ not: { player: { field: 'handle', is: '' } } }),
  'player has a name',
);
assert.equal(
  describeCondition({ objective: 'till' }, doc.objectives),
  'goal is “crack the noodle till”',
);

// In-place condition edits: add flattens into one `all`, replace/remove collapse back.
const leaf = { flag: 'metFixer' } as const;
const one = addConjunct(undefined, leaf);
assert.deepEqual(one, leaf);
const two = addConjunct(one, { tokensAtLeast: 1 });
assert.deepEqual(two, { all: [leaf, { tokensAtLeast: 1 }] });
assert.deepEqual(conditionPart(two, 1), { tokensAtLeast: 1 });
assert.deepEqual(replaceConjunct(two, 0, undefined), { tokensAtLeast: 1 });
assert.equal(replaceConjunct(leaf, 0, undefined), undefined);

// Edits made through the rule view's helpers validate against the shared scene contract.
const edited = structuredClone(doc) as SceneDocument;
const target = edited.uses.find((u) => u.id === 'fixer')!;
target.when = addConjunct(target.when, { flag: g.flags[0] });
validateSceneDocument(edited, g, declaredSceneOptions(edited, undefined, composition));
const withCondition = useRuleClauses(edited, g, target);
assert.deepEqual(
  withCondition.if.map((t) => t.id),
  ['if:0'],
);
assert.match(withCondition.reads, / while .+ is on, /);

// Triggers and objectives.
const [triggerId, trigger] = Object.entries(g.native!.triggers!)[0];
const t = triggerRuleClauses(doc, g, triggerId, trigger);
assert.equal(t.do[0].text, 'run ' + trigger.command);
assert.ok(t.if.length >= 1 && t.order[0].text.length > 0);
const first = objectiveRuleClauses(doc, 0),
  last = objectiveRuleClauses(doc, doc.objectives!.length - 1);
assert.equal(first.if[0].text, 'player has no name');
assert.equal(last.canAddCondition, false);
assert.match(last.reads, /^Once every earlier objective is done/);

// The harbor catalogue scenes (Act I's starting point) project without errors.
const catalogue = read('scenes/authored.json') as {
  scenes: { scene: SceneDocument; gameplay: unknown }[];
};
let rules = 0;
for (const entry of catalogue.scenes) {
  const eg = validateGameplay(entry.gameplay);
  for (const item of chunkRuleList(entry.scene, eg)) {
    const key = parseRuleKey(item.key)!;
    if (key.kind === 'use') {
      const u = entry.scene.uses.find((u) => u.id === key.use)!;
      const c = useRuleClauses(entry.scene, eg, u, key.item);
      assert.ok(c.reads.startsWith('When the player'), item.key);
      rules++;
    }
  }
}
assert.ok(rules > 10, 'catalogue interactions project');
console.log(
  'rule view model: ' + items.length + ' downtown rules, ' + rules + ' catalogue interactions',
);
