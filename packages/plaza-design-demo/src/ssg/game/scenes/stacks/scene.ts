import {drawStacksComposition,drawStacksForeground,stacksComposition,stacksEnvironment,stacksGeometry,terminalLayout,type StacksRenderOptions} from './composition';
import type {Composition,Environment} from '../../art';
import type {EngineDraw} from '../../engine/host';
import type {View} from '../../art/core/view';
/**
 * The stacks on the canvas: terminal 2 behind the harbor pier, berth 4, at
 * night. Container blocks A, B and C, ship-to-shore crane STS-2 straddling the
 * quay with its boom out over the water, the Port Authority's thermal gate the
 * crane's load passes through, and NIGHT FERRY 7 tied up at the quay, its hatch
 * open, waiting for one box.
 *
 * Play band (brightest): the gate booth back to the pier, the Port Authority's
 * board, the lane to warehouse 4, the front row of the blocks, STS-2's legs,
 * ladder and chassis lane, the straddle carrier, the thermal gate, the ferry's
 * deck (gangway terminal, hatch, lashers, and 0451 once it lands), the people.
 * Middle band: the blocks' back rows, the crane's boom and machinery house, the
 * ferry's bridge, the Registry's watchdog flying its round as a drone. Far band:
 * the bay, the far city, the Spire standing in the water with its antenna,
 * ships at anchor.
 *
 * Where the devices stand for tapping, E and hack vision is stacks.json
 * (`layout.spot`); this draws them there. Where STS-2's trolley is and what it
 * carries is rules.ts (`trolley`), so the gate's timing and the picture agree.
 */

import { CH } from "../../art/props/containers";
import { type Character } from "../../runtime/characters";
import { X } from './rules';

/** The terminal: 1760 wide. */
export const STACKS_W = Number(stacksGeometry().find(r=>r.instance.id==='scene')!.props.width);

/** Where things are (world x; heights above the quay). Devices stand at their `layout.spot` in stacks.json; these agree. */
export const L = terminalLayout();

// ---------- people ----------

const HIVIS = { garb: 'hivis' as const, hair: 'helmet' as const };
const gatekeeper: Character = { id: 'gatekeeper', seed: 7301, look: { body: 'wide', garb: 'jacket', hair: 'cap', top: '#2e3a4a', extras: ['glasses'] }, x: L.gatekeeper, act: 'stand', facing: 1, name: 'GATEKEEPER', talk: [
  ['Terminal 2. Authorised vehicles only.', 'You are not a vehicle, so the rule does not cover you. I am not paid to extend it.'],
  ['Warehouse 4 is down the lane. Registry evidence now. Used to be the Tide\'s.', 'I used to wave at the Tide\'s trucks. Now I wave at nobody, on a schedule.'],
] };
const inspector: Character = { id: 'inspector', key: true, seed: 7302, look: { body: 'tall', garb: 'jacket', hair: 'short', top: '#3a4458', extras: ['visor'] }, x: L.inspector, act: 'stand', facing: -1, name: 'PORT INSPECTOR', talk: [
  ['Thermal inspection. A container is meant to be the temperature on its label.', 'A reefer at four degrees reads four. If it reads thirty-one, something in it is breathing, and breathing cargo is my paperwork.'],
  ['The gate wires itself to the alarm. I don\'t touch it. The Registry\'s watchdog checks the wiring every round.', 'When the dog sits on my gate the whole gate freezes. Nothing gets in or out of it. I take my break then. Everyone does.'],
  ['The crane only lifts once the dog has cleared the ferry. Then it\'s three seconds and it\'s back at my gate.', 'You learn its walk. Port, crane, ferry. Port, crane, ferry. Like a man who forgot why he came into a room.'],
] };
const signaller: Character = { id: 'signaller', seed: 7303, look: { body: 'old', ...HIVIS, acc: '#d8b040' }, x: L.signaller, act: 'direct', facing: 1, name: 'SIGNALLER', talk: [
  ['I wave at the crane. The crane ignores me.', 'Forty years. Longest relationship I\'ve had.'],
  ['The camera on STS-2 reads every roof in the blocks. The yard system lost one tonight. The camera never loses anything. Shame about the people upstairs.'],
] };
const lasher: Character = { id: 'lasher', seed: 7304, look: { body: 'avg', ...HIVIS, acc: '#d86a2a', extras: ['headphones'] }, x: L.lasher, act: 'stand', facing: -1, name: 'LASHER', talk: [
  ['Eleven boxes down the hatch, lashed. One slot on deck for a reefer, plug ready.', 'Schedule says NRLU-something. Yard system says it doesn\'t exist. I\'ve lashed things that don\'t exist before. They pay the same.'],
  ['The ferry leaves when it\'s full. It\'s been one box from full since Tuesday.', 'The captain\'s asleep in the bridge. He says wake him when it\'s full. He says it like a man who knows.'],
] };
const MOTH: Character = { seed: 4510, look: { body: 'slim', garb: 'coat', hair: 'hood', top: '#3a3438', acc: '#5a3a6a', extras: ['headphones'] }, x: X.deck + 52, h: 6, act: 'sit', facing: -1 };
/** STS-2's operator, in the cab under the trolley. */
const operator: Character = { seed: 7305, look: { body: 'avg', garb: 'hivis', hair: 'short', extras: ['headphones'] }, x: 0, h: 166, act: 'sit', facing: 1, ps: 2 };
const tally: Character = { id: 'tally', seed: 7306, look: { bot: 'minidrone', paint: '#d8a03a' }, x: 300, h: 132, act: 'hover', range: [300, 640], name: 'TALLY-4', talk: [
  ['COUNT: 1,204 CONTAINERS. COUNT: 1,204. COUNT: 1,203.', 'RECOUNT.'],
  ['BLOCK B, BACK ROW, SLOT 6: YARD RECORD MISSING. CONTAINER PRESENT. CONTAINER CANNOT BE PRESENT. RECOUNT.'],
] };
const GULLS: Character[] = [
  { id: 'gull1', look: 'gull', x: 322, h: 2 * CH, act: 'stand', facing: -1, name: 'GULL', talk: [['(The gull looks at you, then at the stack under its feet, then screams as if you own it.)'], ['(It edges along the container roof to keep exactly out of reach.)']] },
  { id: 'gull2', look: 'gull', seed: 3, x: 1196, act: 'walk', range: 40, name: 'GULL', talk: [['(It is guarding the gangway. From whom is not clear. Possibly you.)'], ['(It steps aside. It steps back. It has made a point.)']] },
];
const pigeon: Character = { look: 'pigeon', seed: 11, x: 196, act: 'walk', range: 26 };
/** People who are here without a word for you: a docker on his break, a second lasher, a robot carrying lashing bars. */
const QUIET: Character[] = [
  { seed: 7311, look: { body: 'wide', ...HIVIS, acc: '#e8e0d0' }, x: 704, h: 10, act: 'sit', facing: -1 },
  { seed: 7312, look: { body: 'short', ...HIVIS, acc: '#d8b040', extras: ['backpack'] }, x: 560, act: 'sweep', range: [560, 640] },
  { look: { bot: 'loader', paint: '#c8641e' }, x: 1170, act: 'carry', range: [1170, 1350] },
];

/** Everyone who answers E here (the engine makes the targets). */
export const PEOPLE: Character[] = [gatekeeper, inspector, signaller, lasher, tally, ...GULLS, pigeon];

// ---------- the far band ----------



/** The bay horizon (the engine sky sets the sun on it). */
export const STACKS_HZ = Number(stacksGeometry().find(r=>r.instance.id==='scene')!.props.horizon);


/** The bay: water to the horizon, the far city, the Spire standing in the water with its antenna, ships. */


// ---------- the blocks ----------

/** Block fronts: the row you see, bottom to top (the back rows rise behind, dimmer). Codes face the other way: the roofs carry them for the crane. */





// ---------- STS-2 ----------

/** The crane's frame: legs, portal beam, the boom out over the water, the machinery house, the A-frame. */


/** The trolley under the boom, the operator's cab, the hoist ropes, the spreader and its load (a box, or 0451). */


/** NRLU 404 0451: a white reefer with its unit humming at one end and the crew's intercom panel. `open`: the door ajar from inside. */


/** The Port Authority's thermal gate: two posts close together, a crossbar, and a sheet of red light the load passes through. */


/** The Registry's watchdog, as you see it from the quay: a grey drone with a red eye flying its round, port → crane → ferry. */


/** NIGHT FERRY 7 at berth 4 (NIGHT FERRY 8 once 7 has gone): deck, gangway terminal, the hatch, the bridge. */


/** The hull's side below the deck, in the near strip: rust red, its name, the waterline. */


// ---------- the quay ----------

/** The gate booth back to the pier, its barrier, the gatekeeper's window. */


/** The lane to warehouse 4: a gap between the booth's fence and block A, a sign on a post pointing down it. */


/** The straddle carrier: four tall legs, a cab on top, a box slung between its legs, shuttling to the chassis lane. */


/** The chassis under the crane, with the next regular box on it (unless the spreader has it). */


/** The night shift's tea urn on a crate by block C, and the crate the smoking docker sits on. */


/** The Port Authority's board at the gate: a printed notice on two posts. */


/** Everything in the stacks, back to front. `hover`: the device under the pointer, for its outline. */


/** Near bollards with their ropes, passing at the bottom of the view. */



const actors={operator,moth:MOTH,...Object.fromEntries(QUIET.map((p,i)=>['quiet-'+i,p])),...Object.fromEntries(PEOPLE.map((p,i)=>['person-'+i,p]))};
export function stacksPeople(doc:Composition=stacksComposition){return PEOPLE.map((p,i)=>{const at=stacksGeometry(doc).find(r=>r.instance.id==='person-'+i)!.placement,dx=at.x-p.x;return{...structuredClone(p),x:at.x,h:at.h,...(Array.isArray(p.range)?{range:[p.range[0]+dx,p.range[1]+dx] as [number,number]}:{})};});}
export function stacksFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=stacksComposition):Environment{return stacksEnvironment(view,engine,actors,doc);}
export function drawStacks(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawStacksComposition(ctx,view,engine,actors,doc,state,options);}
export function drawStacksFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawStacksForeground(ctx,view,doc,state,options);}
