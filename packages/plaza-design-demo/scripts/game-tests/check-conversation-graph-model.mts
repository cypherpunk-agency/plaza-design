/** Conversation graph: every node, entry, choice, jump and fallback of a real graph becomes a card or link. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateGameplay } from '../../src/ssg/game/engine/gameplay/validation';
import {
  conversationGraph,
  cardKind,
  layoutCards,
  freshNodeId,
  freshChoiceId,
  nodeReferences,
  ENTRY,
} from '../../src/ssg/game/authoring/conversation-graph-model';
import type { ConversationDefinition } from '../../src/ssg/game/engine/gameplay/types';

const game = path.resolve('src/ssg/game');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(game, file), 'utf8'));

let graphs = 0;
for (const file of [
  'scenes/stacks/gameplay.json',
  'scenes/laundromat/gameplay.json',
  'scenes/downtown/gameplay.json',
  'scenes/capsule/gameplay.json',
]) {
  const g = validateGameplay(read(file));
  for (const [id, def] of Object.entries(g.conversations)) {
    const graph = conversationGraph(def);
    graphs++;
    // One card per node plus the start card; every node appears exactly once.
    assert.equal(graph.cards.length, Object.keys(def.nodes).length + 1, id);
    assert.equal(graph.cards[0].id, ENTRY);
    assert.deepEqual(
      new Set(graph.cards.slice(1).map((c) => c.id)),
      new Set(Object.keys(def.nodes)),
      id,
    );
    // Links match the source references one for one.
    const expected =
      def.entry.length +
      Object.values(def.nodes).reduce(
        (n, node) =>
          n +
          (node.choices?.length ?? 0) +
          (node.redirect?.length ?? 0) +
          (node.onEnter && node.onEnterFailure ? 1 : 0) +
          (node.choices?.length && def.free ? 2 : 0),
        0,
      );
    assert.equal(graph.links.length, expected, id + ' links');
    for (const link of graph.links) assert.ok(def.nodes[link.to], id + ' link target ' + link.to);
    // Columns grow by one along at least one link into each reachable non-start card.
    const column = new Map(graph.cards.map((c) => [c.id, c.column]));
    for (const card of graph.cards)
      if (card.reachable && card.id !== ENTRY)
        assert.ok(
          graph.links.some((l) => l.to === card.id && column.get(l.from)! + 1 === card.column),
          id + ' column of ' + card.id,
        );
    const layout = layoutCards(graph, { [ENTRY]: { x: 7, y: 9 } });
    assert.deepEqual(
      { x: layout.get(ENTRY)!.x, y: layout.get(ENTRY)!.y },
      { x: 7, y: 9 },
      'saved positions win',
    );
  }
}
assert.ok(graphs > 5);

// Kinds and helpers on a small hand-made graph.
const def: ConversationDefinition = {
  entry: [{ when: { flag: 'met' }, node: 'again' }, { node: 'hello' }],
  nodes: {
    hello: {
      speaker: 'A',
      pages: ['Hi.'],
      onEnter: 'greet',
      onEnterFailure: 'busy',
      choices: [{ id: 'choice-1', label: 'Bye', next: 'bye' }],
    },
    again: { speaker: 'A', pages: ['Back?'], redirect: [{ when: { flag: 'x' }, node: 'bye' }] },
    busy: { speaker: 'A', pages: ['Busy.'] },
    bye: { speaker: 'A', pages: ['Bye.'] },
    lost: { speaker: 'A', pages: ['Nobody comes here.'] },
  },
};
assert.equal(cardKind(def, 'hello'), 'choice');
assert.equal(cardKind(def, 'busy'), 'fallback');
assert.equal(cardKind(def, 'again'), 'page');
assert.equal(cardKind(def, 'bye'), 'exit');
assert.equal(
  cardKind(
    {
      ...def,
      free: { containsAny: ['a'], next: 'bye', miss: 'm', retry: 'r', retryNext: 'hello' },
    },
    'hello',
  ),
  'input',
);
const small = conversationGraph(def);
assert.deepEqual(small.unreachable, ['lost']);
assert.equal(small.cards.find((c) => c.id === 'lost')!.reachable, false);
assert.deepEqual(
  small.cards.find((c) => c.id === ENTRY)!.ports.map((p) => p.label),
  ['start 1', 'otherwise'],
);
assert.equal(freshNodeId(def, 'bye'), 'bye-2');
assert.equal(freshNodeId(def, 'new'), 'new');
assert.equal(freshChoiceId(def.nodes.hello), 'choice-2');
assert.deepEqual(nodeReferences(def, 'bye'), ['hello · Bye', 'again jump']);
assert.deepEqual(nodeReferences(def, 'lost'), []);
console.log('conversation graph model: ' + graphs + ' source graphs');
