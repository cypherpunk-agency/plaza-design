/** Review live state: run changes, event lines and "save this moment" from detached Play snapshots. */
import assert from 'node:assert/strict';
import {
  runChanges,
  snapshotEvents,
  clockText,
  momentFixture,
  type LiveSnapshot,
} from '../../src/ssg/game/authoring/play-live-state';
import { defaultPlayFixture } from '../../src/ssg/game/world/checkpoints';
import type { StateDeclaration } from '../../src/ssg/game/engine/gameplay/types';

const start: LiveSnapshot = {
  scene: 'downtown',
  objective: { id: 'handle', text: 'tell the fixer your name' },
  save: {
    handle: '',
    tokens: 5,
    flags: { metFixer: false },
    items: {},
    keyring: [],
    gameplay: { downtown: { 'hints.box': 0 } },
    clock: { day: 1, min: 580 },
  },
};
const now: LiveSnapshot = {
  scene: 'downtown',
  objective: { id: 'till', text: 'crack the noodle till' },
  save: {
    handle: 'ZERO',
    tokens: 4,
    flags: { metFixer: true, unknownRuntimeFlag: true },
    items: { tea: 1 },
    keyring: ['glove.left'],
    gameplay: { downtown: { 'hints.box': 1 } },
    clock: { day: 1, min: 605 },
  },
  conversation: { speaker: 'FIXER' },
};
const changes = runChanges(start, now);
assert.deepEqual(
  changes.map((c) => c.label + ' ' + c.before + ' → ' + c.after),
  [
    'Player name “” → ZERO',
    'Tokens 5 → 4',
    'metFixer false → true',
    'downtown.hints.box 0 → 1',
    'unknownRuntimeFlag — → true',
    'tea — → 1',
    'keyring glove.left — → true',
  ],
);
assert.deepEqual(runChanges(start, start), [], 'no changes against itself');
// An absent flag equals false, an absent item equals 0.
assert.deepEqual(
  runChanges({ save: { flags: {} } }, { save: { flags: { a: false }, items: { x: 0 } } }),
  [],
);
const events = snapshotEvents(start, now);
assert.equal(events[0].type, 'objective');
assert.equal(events[0].message, 'goal: crack the noodle till');
assert.ok(events.some((e) => e.type === 'conversation' && e.message === 'FIXER speaks'));
assert.ok(events.some((e) => e.type === 'state' && e.message === 'Tokens 5 → 4'));
assert.deepEqual(snapshotEvents(now, { ...now, scene: 'metro' })[0], {
  type: 'scene',
  message: 'entered metro',
});
assert.equal(clockText({ day: 2, min: 605 }), 'day 2 · 10:05');
assert.equal(clockText(undefined), '—');

// Save this moment: declared values only, scalar state as non-default overrides.
const base = defaultPlayFixture('downtown', 'scan.so');
const declarations: Record<string, StateDeclaration> = {
  'hints.box': {
    owner: 'downtown',
    lifetime: 'save',
    type: 'number',
    default: 0,
    integer: true,
    min: 0,
  },
};
const { fixture, dropped } = momentFixture(
  base,
  { ...now, player: { x: 412.6 } },
  { flags: new Set(['metFixer']), programs: new Set(), keyring: new Set(['glove.left']) },
  declarations,
);
assert.deepEqual(fixture.flags, { metFixer: true });
assert.deepEqual(dropped, ['flag unknownRuntimeFlag']);
assert.deepEqual(fixture.items, { tea: 1 });
assert.equal(fixture.tokens, 4);
assert.deepEqual(fixture.keyring, ['glove.left']);
assert.equal(fixture.handle, 'ZERO');
assert.deepEqual(fixture.state, { 'hints.box': 1 });
assert.equal(fixture.minute, 605);
assert.equal(fixture.spawn, 413);
assert.equal(fixture.entrance, undefined);
assert.equal(
  base.tokens !== 4 || base.flags.metFixer !== true,
  true,
  'base fixture is not modified',
);
console.log('play live state: ' + changes.length + ' changes, ' + events.length + ' events');
