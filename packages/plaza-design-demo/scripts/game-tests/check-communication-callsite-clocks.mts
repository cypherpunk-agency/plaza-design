import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { Hints } from '../../src/ssg/game/ui/hints';
import { ShiftGuidance } from '../../src/ssg/game/ui/shift-guidance';
import { gameClassSource } from './game-source.mts';
import { Game } from '../../src/ssg/game/runtime/game';
import * as PresentationFrame from '../../src/ssg/game/runtime/presentation-frame';
import { runtimeFixture } from './runtime-fixture.mts';
const file = 'src/ssg/game/runtime/game.ts',
  text = gameClassSource(),
  tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
  game = tree.statements.find(
    (n) => ts.isClassDeclaration(n) && n.name?.text === 'Game',
  ) as ts.ClassDeclaration;
const document = {
  hidden: false,
  documentElement: { classList: { toggle() {} } },
  createElement: () => ({ className: '', textContent: '', setAttribute() {} }),
};
Object.assign(globalThis, { document, requestAnimationFrame: () => 1 });
const approx = (actual: number, expected: number, label: string) =>
  assert(Math.abs(actual - expected) < 1e-8, label + ': ' + actual + ' != ' + expected);
/** The actual Game loop (stepLoop), covered-surface getter and HUD over owned state records. */
function fixture(reduced: boolean) {
  document.hidden = false;
  const hints = new Hints(() => []),
    pings: (number | null)[] = [],
    flags: Record<string, boolean> = {},
    guidance = new ShiftGuidance(
      { append() {} } as never,
      reduced,
      (x: number | null) => pings.push(x),
      () => (flags.done ? null : ({ x: 300 } as never)),
      () => (flags.done ? 'Complete' : 'Review the control'),
    );
  const noop = () => {};
  const f: any = runtimeFixture(Game, {
    hints,
    menu: { open: false },
    term: { isOpen: false, focused: false },
    zh: {
      overlayOpen: false,
      popupOpen: false,
      acknowledgmentPending: false,
      visionOn: false,
      panelOpen: false,
      model: { data: { goals: [] } },
    },
    save: { flags, playMs: 0, clock: { day: 1, min: 0 } },
    reduced,
    shiftGuidance: guidance,
    p: { moving: false, x: 0 },
    def: { name: 'Review', objective: () => 'Review the control', width: 1180 },
    story: '',
    spanW: 1180,
    enginesPaused: false,
    gameplayFor: () => undefined,
    reconcileWorldEdits: noop,
    syncEnginePause: noop,
    stepOpening: noop,
    stepCutscene: noop,
    syncModeUi: noop,
    syncLevelArrows: noop,
    syncCarList: noop,
    followHost: noop,
    checkGain: noop,
    update: noop,
    loop: noop,
    syncHud: noop,
    persistSave: noop,
    stampEl: { textContent: '' },
    keyBar: { root: { offsetHeight: 0 } },
    canvas: { width: 960, clientWidth: 960 },
    clockText: '',
    x: {
      save() {},
      restore() {},
      measureText: (s: string) => ({ width: s.length * 6 }),
      fillRect() {},
      fillText() {},
    },
    scenes: { here: 'sandbox' },
    timing: { running: true, t: 10, clock: 0, last: 0 },
    camera: { fitW: 1180, viewW: 960, viewH: 540, k: 1 },
  });
  f.draw = () => PresentationFrame.drawHud(f.presentationFramePort);
  let now = 0;
  const step = (ms = 100) => {
    now += ms;
    f.stepLoop(now);
  };
  hints.notices.offer({
    id: 'result',
    text: 'Important result',
    tone: 'error',
    source: 'system',
    scope: 'scene',
    priority: 200,
    duration: 1000,
  });
  f.stepLoop(0);
  step();
  step();
  return { f, hints, guidance, pings, flags, step };
}
const covers = [
  [
    'hidden',
    (f: any, on: boolean) => {
      document.hidden = on;
    },
  ],
  [
    'deck',
    (f: any, on: boolean) => {
      f.menu.open = on;
    },
  ],
  [
    'opening',
    (f: any, on: boolean) => {
      f.presentation.opening = on ? { timeline: null } : null;
    },
  ],
  [
    'cutscene',
    (f: any, on: boolean) => {
      f.presentation.cut = on ? { timeline: null, scene: {} } : null;
    },
  ],
  [
    'map',
    (f: any, on: boolean) => {
      f.presentation.mapView = on ? {} : null;
    },
  ],
  [
    'network map',
    (f: any, on: boolean) => {
      f.presentation.netView = on ? {} : null;
    },
  ],
  [
    'taxi flight',
    (f: any, on: boolean) => {
      f.presentation.flight = on ? {} : null;
    },
  ],
  [
    'end',
    (f: any, on: boolean) => {
      f.presentation.showEnd = on;
    },
  ],
  [
    'sleep card',
    (f: any, on: boolean) => {
      f.presentation.sleep = on ? {} : null;
    },
  ],
  [
    'covered board/panel',
    (f: any, on: boolean) => {
      f.zh.overlayOpen = on;
    },
  ],
  [
    'joined conversation',
    (f: any, on: boolean) => {
      f.scenes.joinedZones = [{ id: 'neighbor' }];
      f.scenes.hosts.set('neighbor', { overlayOpen: on, tick() {} });
    },
  ],
  [
    'visible terminal without focus',
    (f: any, on: boolean) => {
      f.term.isOpen = on;
    },
  ],
] as const;
let cases = 0;
for (const reduced of [false, true])
  for (const [label, cover] of covers) {
    const { f, hints, guidance, pings, step } = fixture(reduced),
      time = hints.notices.time,
      remaining = (hints.notices as any).current.remaining,
      age = guidance.age,
      simulation = f.timing.clock,
      animation = f.timing.t;
    cover(f, true);
    for (let i = 0; i < 100; i++) step();
    approx(
      f.timing.clock - simulation,
      ['deck', 'opening', 'cutscene'].includes(label) ? 0 : 300,
      label + ' preserves existing simulation-clock policy',
    );
    assert.equal(hints.notices.time, time, label + ' freezes the actual readable clock');
    assert.equal(
      (hints.notices as any).current.remaining,
      remaining,
      label + ' retains the full unread duration',
    );
    approx(guidance.age, age, label + ' preserves goal introduction');
    assert.equal(
      pings.filter((x) => x !== null).length,
      0,
      label + ' never consumes the intro or creates hidden goal pings',
    );
    cover(f, false);
    step();
    assert.equal(hints.notices.time, time + 100, label + ' resumes once without catch-up');
    assert.equal(
      (hints.notices as any).current.remaining,
      remaining - 100,
      label + ' consumes only the resumed active frame',
    );
    approx(guidance.age, age + 0.1, label + ' guidance shares the same readable delta');
    for (let i = 0; i < 7; i++) step();
    assert.equal(hints.notices.pending, 0, label + ' result eventually expires');
    for (let i = 0; i < 17; i++) step();
    approx(guidance.age, 2.7, label + ' intro completes after active time');
    assert.equal(
      pings.filter((x) => x !== null).length,
      1,
      label + ' one guidance target is introduced',
    );
    assert(f.timing.clock >= simulation, 'simulation policy still advances where it did before');
    if (reduced)
      assert.equal(f.timing.t, animation, 'reduced-motion artwork clock stays unchanged');
    cases++;
  }
const suspended = fixture(true),
  before = (suspended.hints.notices as any).current.remaining,
  age = suspended.guidance.age;
suspended.step(10000);
assert.equal(
  (suspended.hints.notices as any).current.remaining,
  before,
  'a long missing RAF interval never consumes unread duration',
);
approx(suspended.guidance.age, age, 'guidance also rejects hidden/suspended interval');
suspended.step();
assert.equal((suspended.hints.notices as any).current.remaining, before - 100);
// The opening fallback's actual selector yields ownership to ShiftGuidance, rather than creating a competing ping owner.
const update = game.members.find((n) => n.name?.getText(tree) === 'update')!;
let aim: ts.VariableDeclaration | undefined;
const find = (n: ts.Node) => {
  if (ts.isVariableDeclaration(n) && n.name.getText(tree) === 'aim') aim = n;
  ts.forEachChild(n, find);
};
find(update);
assert(aim?.initializer);
let fallbackCalls = 0;
const phases = {
    get story() {
      fallbackCalls++;
      return { ping: { device: 'fallback' } };
    },
  },
  choose = vm.runInNewContext('(function(){return ' + aim.initializer.getText(tree) + ';})', {});
assert.equal(
  choose.call({ shiftGuidance: suspended.guidance, def: { phases }, story: 'story' }),
  null,
);
assert.equal(fallbackCalls, 0);
assert.equal(
  choose.call({ shiftGuidance: undefined, def: { phases }, story: 'story' }).device,
  'fallback',
);
assert.equal(fallbackCalls, 1);
suspended.flags.done = true;
suspended.step();
assert.equal(suspended.guidance.target, null, 'completed guidance cancels the old target');
assert.equal(suspended.pings.at(-1), null);
console.log(
  'Communication callsite clocks PASS: ' +
    cases +
    ' actual Game loop/HUD + ShiftGuidance cases; hidden/deck/title/cutscene/map/net/flight/end/sleep/board/terminal preserve unread time; resumed active expiry, suspended gaps, reduced-motion independence and single guidance owner.',
);
