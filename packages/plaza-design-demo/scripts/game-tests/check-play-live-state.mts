/** Review live state: run changes, event lines and "save this moment" from detached Play snapshots. */
import assert from 'node:assert/strict';
import {
  runChanges,
  snapshotEvents,
  clockText,
  momentFixture,
  watchRows,
  watchChoices,
  type LiveSnapshot,
} from '../../src/ssg/game/authoring/play-live-state';
import { defaultPlayFixture } from '../../src/ssg/game/world/checkpoints';
import { pickUse, screenFraction } from '../../src/ssg/game/authoring/play-docks';
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
// Interaction events: each gameplay command event is logged once, by scene and id.
const withEvent = {
  ...now,
  events: [{ scene: 'downtown', id: 'e1', command: 'downtown.progress.till', cause: 'till' }],
};
assert.deepEqual(
  snapshotEvents(now, withEvent).filter((e) => e.type === 'interaction'),
  [{ type: 'interaction', message: 'downtown.progress.till · till' }],
);
assert.equal(
  snapshotEvents(withEvent, withEvent).length,
  0,
  'an event already seen is not logged again',
);

// Watch: pinned values read from the latest snapshot, flagged when they just changed.
const rows = watchRows(['tokens', 'flag.metFixer', 'flag.missing'], now, start);
assert.deepEqual(
  rows.map((r) => [r.label, r.value, r.changed]),
  [
    ['Tokens', '4', true],
    ['metFixer', 'true', true],
    ['missing', '—', false],
  ],
);
assert.ok(watchChoices(now).some((c) => c.key === 'state.downtown.hints.box'));

// Review overlay: picking finds the nearest interaction within reach; screen fraction follows the camera.
const layout = {
  uses: [
    { id: 'till', x: 300, label: '', name: '' },
    { id: 'fixer', x: 420, label: '', name: '' },
  ],
  exits: [],
};
assert.equal(pickUse(layout, 410), 'fixer');
assert.equal(pickUse(layout, 340), 'till');
assert.equal(pickUse(layout, 900), undefined);
assert.equal(screenFraction({ x: 100, width: 400 }, 300), 0.5);
console.log('play live state: ' + changes.length + ' changes, ' + events.length + ' events');
