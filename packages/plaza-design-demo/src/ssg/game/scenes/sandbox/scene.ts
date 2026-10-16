import { bindSandboxActors,drawSandboxComposition,sandboxComposition,sandboxEnvironment,sandboxLayout,sandboxStations,sandboxWidth,type SandboxRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
/**
 * The sandbox on the canvas: REGISTRY QA BAY 3, a long test hall where every
 * engine feature has its own bench, left to right, each under a plate that
 * names it (BAY 3·01 NOUN KINDS … BAY 3·10 TIME AND WEATHER).
 *
 * Play band (brightest): the devices under test on benches, posts and the
 * wall, each where sandbox.json's `layout.spot` puts it, drawn so their state
 * shows (a lamp lit, a fan turning, a drawer open, a belt stopped while the
 * watchdog checks it); the reset console; the people (the QA lead, the night
 * tech, TEST UNIT 0 carrying parts, the cat on the radiator). Middle band
 * (dim): the hall's panelled wall, the station plates, the tube lights, the
 * conduit in the wall. Far band: the city through the big window at the east
 * end (the city clock's sky, the district's weather) and, on tall screens, the
 * ducts over the ceiling.
 *
 * World units match the street (the player is 42 tall).
 */

import { type Character } from "../../runtime/characters";

export const SANDBOX_W = sandboxWidth;

/** Where things are that are not devices (world x). The devices stand at their `layout.spot` in sandbox.json. */
export const SB = sandboxLayout();

/** The stations, left to right: their span, title and what they test (the plate on the wall says both). */
export const STATIONS = sandboxStations();

// ---------- people ----------

/** The QA lead at the intake, with a clipboard and no illusions. */
const lead: Character = { id: 'lead', seed: 9101, look: { body: 'tall', garb: 'coat', hair: 'bun', extras: ['glasses'], top: '#c8c0b0', acc: '#2a6ad8' }, x: SB.lead, act: 'scan', facing: 1, name: 'QA LEAD', talk: [
  ['Bay 3. Every device in here has passed its test at least once.', 'Not at the same time. We do not test that.'],
  ['The console behind me resets the bay. Devices, cables, trace, the lot.', 'It does not reset me. I asked. Twice. It logged both requests.'],
  ['Left to right, one bench per thing the system can do. Read the plate, then break the thing under it.', 'Then log that you broke it. Then log that you logged it.'],
  ['The watchdog in seven is ours. Well. It is the Registry\'s. We just feed it.'],
] };
/** The night tech in the break room, on a stool, with tea, watching the weather through the window. */
const tech: Character = { id: 'tech', seed: 9102, look: { body: 'wide', garb: 'hivis', hair: 'beanie', extras: ['headphones'], top: '#c9a227' }, x: SB.tech, h: 16, act: 'sit', facing: 1, name: 'NIGHT TECH',
  lines: [
    { weather: ['rain', 'storm'], pages: ['Rain. The vent knows before the forecast does. I trust the vent.', 'The vent has never once said "light showers".'] },
    { when: { from: '18:00', to: '06:00' }, pages: ['Night shift. The night light is allowed on now. It waited all day for this.', 'Same, honestly.'] },
  ],
  talk: [
    ['I test the bench. Sit on it, wait, see if time passes. It does. Every time.', 'Forty-one passes. I am going for fifty.'],
    ['The cat is not a device under test. We checked. It refused the checking.'],
    ['TEST UNIT 0 has carried that same box between bays since I started.', 'I asked what is in it. It said: "THE TEST." Fair.'],
  ] };
/** TEST UNIT 0: carries a device under test from bench to bench, all shift long. */
const unit0: Character = { id: 'unit0', seed: 9103, look: { bot: 'servbot', paint: '#c8b890', v: 1 }, x: 900, act: 'carry', range: [900, 1580], speed: 0.18, name: 'TEST UNIT 0', talk: [
  ['CARRYING: 1 DEVICE UNDER TEST. DESTINATION: THE NEXT BENCH.', 'I HAVE BEEN TO THE NEXT BENCH. IT IS ALSO A BENCH.'],
  ['MY JOB: MOVE THE TEST. MY TEST: WHETHER I MOVE THE TEST.', 'RESULT: PENDING. I AM MOVING IT.'],
] };
/** The bay's cat, on the warm radiator. Not a device. */
const cat: Character = { look: 'cat', seed: 31, x: SB.radiator, h: 22, act: 'sit', facing: -1 };
/** Someone walking past outside, seen small through the window. */
const OUTSIDE: Character[] = [
  { seed: 9201, x: 3500, act: 'walk', range: 180, ps: 2, dim: 0.55, parallax: 1, h: 40, speed: 0.25, look: { extras: ['umbrella'] } },
];

export const PEOPLE: Character[] = [lead, unit0, tech, cat];

const actors={outside:OUTSIDE[0],lead,unit0,tech,cat};
bindSandboxActors(actors);
export function sandboxPeople(doc:Composition=sandboxComposition){const copy=Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,structuredClone(p)]));bindSandboxActors(copy,doc);return ['lead','unit0','tech','cat'].map(id=>copy[id]);}
export function sandboxFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=sandboxComposition):Environment{return sandboxEnvironment(doc,view,engine,actors);}
export function drawSandbox(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=sandboxComposition,state:Environment['state']={},options:SandboxRenderOptions={}){drawSandboxComposition(ctx,view,engine,actors,doc,state,options);}
