/**
 * The sandbox: REGISTRY QA BAY 3, a test hall for the engine, outside the
 * story. Sudo only (`?sudo`: LEVELS › SANDBOX, or `?sudo&play=sandbox`); it is
 * not on the city map, sets no story flags, and keeps its own scene save
 * (`save.scenes.sandbox`), which the RESET BAY 3 console by the door (or
 * `reset sandbox --yes` in the deck) puts back to the start.
 *
 * One bench per engine feature, left to right, each under a plate that names
 * it and a test card (E) that says how to test it (STATIONS in scene.ts):
 * noun kinds, cables, guards and lock toys, sealed sectors, trace, the net,
 * the watchdog, everyday actions (items, tokens), people, robots and the cat,
 * and the city's time and weather through the window. The devices are
 * data/sandbox.json; rules.ts has the few effects; scene.ts draws it.
 */

import { SANDBOX } from '../data';
import type { SceneDef, SceneReadable } from '../scenes/kit';
import { SANDBOX_RULES, CHIP } from './rules';
import { drawSandbox, PEOPLE, SANDBOX_W, SB, STATIONS } from './scene';

export { SANDBOX_RULES } from './rules';

/** How to test each station: the card at its foot (E). Dry: it is a Registry test plan. */
const CARDS: Record<number, string[]> = {
  1: ['NOUN KINDS. ONE DEVICE PER KIND, LEFT TO RIGHT: SENSE (MOTION SENSOR), ACT (TEST LAMP), STORE (MEMO SCREEN), LINK (WALL PORT), DAEMON (UNIT 7), CLOCK (METRONOME), LOG (TAPE RECORDER).',
    'TEST: TAP EACH. WAVE AT THE SENSOR: ITS PRE-WIRED CABLE SWITCHES THE LAMP. TALK TO UNIT 7. STOP THE METRONOME IN HACK VIEW. OPEN THE RECORDER AND WATCH ITS TRACE.'],
  2: ['CABLES. THE TEST BUTTON FANS OUT: ONE EVENT, THREE CABLES (BEACON, HORN, COUNTER). THE COUNTER\'S IS A FIXED CONDUIT: IT CANNOT BE CUT.',
    'CHAIN: WIRE PLATE → TIMER (WAIT 2 S) → SWITCH (ON, PASS) → HATCH OPEN. THE HATCH IS PRE-WIRED TO THE FAN. TIMER AND SWITCH ARE IN THE LOGIC DRAWER.'],
  3: ['GUARDS. QA LOGIN: PASSWORD, 2 TRIES, LOCKS 5 S, A NEAR MISS ("bay3"). THE STICKY NOTE PUTS BOTH ON YOUR KEYRING.',
    'ONE GUARD PER LOCK TOY: SHIELD LOCKER (RINGS), CIPHER BOX (SHIFT 3), CRYPTEX CASE (A 4-LETTER WORD), MORSE LAMP (OK). PROBE EACH IN HACK VIEW. EACH TAG HAS THE ANSWER.'],
  4: ['SEALED SECTORS. SECURE CABINET: DRAWER A, KEY SEAL (CUT A KEY CHIP AT THE CUTTER, DROP IT ON THE DRAWER). DRAWER B, SEQUENCE SEAL: RED, GREEN, BLUE ON THE PANEL, BY CABLE, WITHIN 3 S.',
    'DRAWER C, CONDITION SEAL: OPENS WHILE THE MAINS LEVER IS UP. OPENED SECTORS ARE SAVED; RESET BAY 3 SHUTS THEM.'],
  5: ['TRACE. THE AUDIT DESK LOGS YOU AT 20% A SECOND WHILE YOU ARE INSIDE IT. A WRONG PASSWORD ADDS 30%. AT 100% YOU ARE OUT AND IT LOCKS FOR 8 S. THE METER ON THE WALL SHOWS IT.',
    'WAYS OUT: CUT ITS CABLE TO THE SPOOL, SWITCH ITS LOG OFF, OR LOG IN ("auditor") AND WIPE IT FROM ROOT.'],
  6: ['THE NET. THE NET JACK IS ON THE TEST LAN. IT KNOWS QA-SRV 01; A SCAN FINDS QA-PRN 2. QA-VAULT IS ONE HOP ON, THROUGH QA-SRV 01\'S OWN LINK.',
    'PING QA-SRV 01: ITS CABLE RINGS THE BELL. PRINT ON QA-PRN 2: THE LABEL PRINTER PRINTS. THE TEST LAN IS ONLY REACHABLE FROM THIS BAY.'],
  7: ['WATCHDOG. QA-WD WALKS STAMP PRESS → CONVEYOR → SIREN: 3.5 S ON EACH, 1.5 S BETWEEN. THE ONE IT SITS ON IS FROZEN: NO VERBS, NO SIGNALS. THE RED LAMP OVER A DEVICE SAYS WHERE IT IS.',
    'EACH OF THE THREE HAS A WATCHDOG NOUN: WIRE ITS "leaves" TO SOMETHING TO ACT WHILE IT IS AWAY.'],
  8: ['EVERYDAY USE. THE COFFEE MACHINE HAS THE FULL POPUP: THREE EVERYDAY ACTIONS, JACK IN, HACK IT.',
    'ITEMS: TAKE A BLANK CHIP FROM THE DISPENSER (YOU CARRY IT: HELD), INSERT IT AT THE CHIP READER. TOKENS: THE TEST TILL TAKES ONE PER PAYMENT.'],
  9: ['PEOPLE, ROBOTS, ANIMALS. TALK TO THE QA LEAD AND THE NIGHT TECH (THE TECH ANSWERS DIFFERENTLY BY NIGHT AND IN RAIN). TALK TO TEST UNIT 0 WHILE IT WORKS. PET THE CAT.'],
  10: ['TIME AND WEATHER. THE NIGHT LIGHT IS PERMITTED 18:00–06:00 ONLY, AND GOES OFF BY ITSELF AT DAYBREAK. THE VENT REFUSES RAIN, STORM AND SMOG, AND SHUTS ITSELF WHEN THEY COME.',
    'THE WEATHER SENSOR READS THE DISTRICT\'S WEATHER. SIT ON THE BENCH TO WAIT UNTIL LATER. SUDO\'S TIME CONTROL AND WEATHER OVERRIDE WORK HERE.'],
};

const cards: SceneReadable[] = STATIONS.map((s) => ({
  id: 'card' + s.n, x: s.sign, name: 'BAY 3·' + String(s.n).padStart(2, '0') + ' · ' + s.title, label: '[E] TEST CARD', promptH: 66, pages: CARDS[s.n],
}));

/** The bay, complete: data, rules, drawing, its people, the test cards, the reset console. */
export const sandbox: SceneDef = {
  id: 'sandbox',
  name: 'the sandbox',
  width: SANDBOX_W,
  spawn: SB.spawn,
  exits: [{ id: 'out', x: SB.door, to: 'downtown', at: 'metro', label: '[E] EXIT', promptH: 82 }],
  intro: [
    'REGISTRY QA BAY 3. Every device in here is under test.',
    'One bench per thing the system can do. The console by the door puts it all back.',
  ],
  data: SANDBOX,
  rules: SANDBOX_RULES,
  drawBackdrop: drawSandbox,
  people: PEOPLE,
  readables: [
    { id: 'plan', x: SB.plan, name: 'TEST PLAN · BAY 3', promptH: 104, pages: [
      'BAY 3 · DEVICES UNDER TEST. STATIONS 01–10, LEFT TO RIGHT: NOUN KINDS, CABLES, GUARDS, SEALED SECTORS, TRACE, THE NET, WATCHDOG, EVERYDAY USE, PEOPLE, TIME AND WEATHER.',
      'EACH STATION HAS A TEST CARD. RESET BAY 3 RETURNS EVERY DEVICE TO ITS FIRST STATE. TESTERS ARE NOT RESET.',
    ] },
    ...cards,
  ],
  uses: [
    { id: 'chips', x: SB.dispenser, label: '[E] TAKE A BLANK CHIP', name: 'BLANK CHIPS', promptH: 100, h: 80, use: (c) => {
      c.add(CHIP);
      return ['ONE BLANK CHIP DISPENSED. FREE OF CHARGE. LOGGED.', 'FOR THE CHIP READER, NEXT TO IT.'];
    } },
  ],
  rests: [{ id: 'bench', x: SB.bench, kind: 'bench', promptH: 52 }],
  targets: (m) => [{ id: 'reset', x: SB.reset, label: m.label('prompt.reset'), promptH: 66 }],
  use: (id, m, say) => {
    if (id !== 'reset') return;
    m.reset();
    say(m.line('reset.ok'));
  },
};
