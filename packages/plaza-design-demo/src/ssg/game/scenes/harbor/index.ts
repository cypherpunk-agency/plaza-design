import { harborComposition,harborGeometry,harborLayout,adaptHarbor,type HarborRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';

/**
 * The harbor at night: a working pier. Containers of every colour stacked crooked, two gantry
 * cranes with their operators lit in the cabs, the customs scanner arch, a fish stand and a tea
 * cart for the night shift, the Tide's open container with cards on a crate, a bonded store with
 * a guard who can be persuaded to admire the sea, fishermen at the end, gulls (and one that is
 * not a gull). Black water behind, moving, with the Registry's patrol boat passing on its round.
 *
 * Bands: far = the sky, the far city, ships and cranes on the horizon, the water;
 * middle = the ferry, the patrol boat, a dark boat with a lamp; play = the pier and everything
 * on it, the people, and the near water under the pier's edge.
 *
 * Built from the kits (ART-GUIDE §10): people (../characters.ts), screens (screens.ts), stalls and
 * clutter (build.ts). Signs are dry; the people have the jokes.
 */


import { CH,container,type Crate } from "../../art/props/containers";
import { type Character } from "../../runtime/characters";
import { type SceneDef,type SceneUse } from "../kit";

export { CH,container,type Crate };

/** Layout: positions in world units, heights up from the pier. */
const L = harborLayout();
const sourceAt=(id:string)=>harborGeometry().find(r=>r.instance.id===id)!.placement;
const sourceActor=(id:string,height=false)=>{const p=sourceAt(id);return{x:p.x,...(height?{h:p.h}:{})};};
const sourceMotion=(id:string,a:number,b:number):[number,number]=>{const x=sourceAt(id).x;return[x+a,x+b];};

/** Container stacks: `x` the left edge, boxes bottom to top, `dx` how crooked each sits. */


/** The container on the customs chassis, sliding through the arch's scan. */





/** Gulls in flight: [x, height, speed, parallax, phase]. */


// ---------- people ----------

const UNIFORM = { garb: 'jacket' as const, top: '#2e3a4a', bottom: '#1e2430', hair: 'cap' as const, acc: '#1a1a22' };
const OILSKIN = { garb: 'coat' as const, top: '#8a7a2a', hair: 'brim' as const, acc: '#8a7a2a' };

const watchman: Character = {...sourceActor('watchman',true),  seed: 6101, look: { body: 'avg', garb: 'jacket', hair: 'cap', extras: ['phone'], top: '#46506e' },   act: 'phone', facing: -1, ps: 2 };
const customs: Character = {...sourceActor('customs',false),  id: 'customs', seed: 6102, look: { body: 'wide', ...UNIFORM, extras: ['visor'] },  act: 'stand', facing: -1, name: 'CUSTOMS', talk: [
  ['Every container goes through the arch. The arch scans the outside.', 'What is inside is declared by the shipper. The shipper is very honest. It says so on the form.'],
  ['You are not a container. Keep it that way and we\'ll get on fine.'],
] };
const fishSeller: Character = {...sourceActor('fishSeller',true),  seed: 6103, look: { body: 'old', garb: 'apron', hair: 'scarf', acc: '#5a8a3a', extras: [] },   act: 'vend', facing: -1 };
const teaMan: Character = {...sourceActor('teaMan',false),  seed: 6104, look: { body: 'wide', garb: 'apron', hair: 'beanie', acc: '#c83a2a', extras: [] },  act: 'vend', facing: -1 };
const docker: Character = {...sourceActor('docker',false),  id: 'docker', seed: 6105, look: { body: 'tall', garb: 'hivis', hair: 'helmet', acc: '#d8b040', extras: [] },  act: 'smoke', facing: -1, name: 'DOCKER', talk: [
  ['Twelve hours lifting boxes I\'m not allowed to open.', 'Some of them are cold. Some of them hum. One of them knocked once. I lifted that one gently.'],
  ['Union rule: one break per shift. Management rule: the shift doesn\'t end.'],
] };
const tide: Character = {...sourceActor('tide',false),  id: 'tide', key: true, seed: 6106, look: { body: 'slim', ...OILSKIN, extras: ['cyberarm'] },  act: 'lean', facing: -1, name: 'TIDE RUNNER', talk: [
  ['Don\'t stare at the den. Stare at the water, like a normal person.', 'You\'re the deleted one. Moth\'s friend. The scanners slide right off you. I like that in a customer.'],
  ['We\'re the Tide. We move what the Registry can\'t count: goods, data, the odd person in a crate marked FROZEN FISH.', 'Your friend came through here like that once. Captain Brine carried the crate personally.', 'The Captain doesn\'t do favours. The Captain does invoices.'],
  ['Moth still owes the Captain. Moth knows it.', 'There\'s a little boat at the end of the beach pier, paid up by the month in Moth\'s name. The Captain\'s idea of a reminder.'],
  ['Want to meet Brine? Nobody wants to. The boat\'s never in the same berth twice.', 'If the Captain wants you, you\'ll see a lamp out on the water. Three long. Don\'t wave back, it\'s rude.'],
] };
const guard: Character = {...sourceActor('guard',false),  seed: 6107, look: { body: 'tall', ...UNIFORM, hair: 'short', hairCol: '#2e1d12', extras: [] },  act: 'stand', facing: -1 };
const fisher: Character = {...sourceActor('fisher',false),  id: 'fisher', seed: 6108, look: { body: 'avg', garb: 'coat', hair: 'beanie', top: '#4e5e3a', acc: '#c83a2a', extras: [] },  act: 'stand', facing: 1, name: 'FISHERMAN', lines: [
  // what he says changes with the weather (TIME.md: lines by weather; the plain `talk` otherwise)
  { weather: ['rain', 'storm'], pages: ['Rain is good for fishing. The fish come up to see what all the noise is.', 'Also nobody checks your licence in the rain. The Registry melts.'] },
  { weather: ['fog'], pages: ['Fog. Can\'t see the float, can\'t see the patrol boat, can\'t see my own feet.', 'Best night of the year. Nobody can see me either.'] },
], talk: [
  ['Fish don\'t need ID. Best neighbours I\'ve had.', 'Caught a drone gull once. Threw it back. It filed a complaint.'],
  ['The patrol boat comes round every few minutes. The fish know the schedule better than the Registry does.'],
] };
/** The crane operators, in their cabs (they move with the trolley). */
const operators: Character[] = [
  {...sourceActor('operator0',true),  seed: 6109, look: { body: 'avg', garb: 'hivis', hair: 'short', extras: ['headphones'] },   act: 'sit', facing: -1, ps: 2 },
  {...sourceActor('operator1',true),  seed: 6110, look: { body: 'wide', garb: 'hivis', hair: 'cap', extras: [] },   act: 'sit', facing: -1, ps: 2 },
];
/** The forklift's driver (moves with the forklift). */
const driver: Character = {...sourceActor('driver',true),  seed: 6111, look: { body: 'avg', garb: 'hivis', hair: 'helmet', acc: '#d86a2a', extras: [] },   act: 'sit', facing: 1 };
/** The Tide's card game inside the open container. */
const DEN: Character[] = [
  {...sourceActor('den-person0',true),  seed: 6112, look: { body: 'wide', ...OILSKIN, top: '#6e6a2a', extras: [] },   act: 'sit', facing: 1 },
  {...sourceActor('den-person1',true),  seed: 6113, look: { body: 'old', ...OILSKIN, hair: 'beanie', acc: '#2a2a30', extras: ['glasses'] },   act: 'sit', facing: -1 },
];
const CAT: Character = {...sourceActor('cat',true),  look: 'cat', seed: 3,   act: 'sit', facing: -1 };

/** Everyone else on the pier, drawn in front of the stacks. Plain data. */
const PIER: Character[] = [
  {...sourceActor('pier-person0',false),  seed: 6201, look: { body: 'tall', garb: 'hivis', hair: 'helmet', acc: '#e8e0d0', extras: [] },  act: 'argue', facing: 1 },
  {...sourceActor('pier-person1',false),  seed: 6202, look: { body: 'avg', garb: 'hivis', hair: 'helmet', acc: '#d8b040', extras: ['backpack'] },  act: 'walk', range: sourceMotion('pier-person1',0,220), speed: 0.28 },
  {...sourceActor('pier-person2',true),  seed: 6203, look: { body: 'short', garb: 'hivis', hair: 'hood', extras: ['phone'] },   act: 'sit', facing: 1 },
  {...sourceActor('pier-person3',false),  seed: 6204,  act: 'queue', facing: -1, look: { body: 'avg', garb: 'coat', hair: 'brim', acc: '#8a7a2a', extras: [] } },
  {...sourceActor('pier-person4',false),  seed: 6205,  act: 'walk', range: sourceMotion('pier-person4',0,-350), speed: 0.22, look: { body: 'wide', garb: 'hivis', hair: 'helmet', acc: '#d86a2a', extras: [] } },
  {...sourceActor('pier-person5',true),  seed: 6206,   act: 'sit', facing: 1, look: { body: 'old', garb: 'coat', hair: 'brim', acc: '#5a3a2a', extras: [] } },
  {...sourceActor('pier-person6',true),  look: 'drone',   act: 'scan' },
  {...sourceActor('pier-person7',false),  look: 'courier',  act: 'walk', range: sourceMotion('pier-person7',0,920), speed: 0.45 },
  {...sourceActor('pier-person8',false),  seed: 6207,  act: 'walk', range: sourceMotion('pier-person8',0,260), speed: 0.3, look: { body: 'avg', garb: 'jacket', hair: 'hood', extras: ['umbrella'], acc: '#2a2a30' } },
];
/** Only on the pier in the early morning (TIME.md: a person with a time window), running laps before the shift whistle. */
const jogger: Character = {...sourceActor('jogger',false),  id: 'jogger', seed: 6120, when: { from: '06:00', to: '09:00' }, look: { body: 'slim', garb: 'tee', hair: 'short', top: '#9a7a2a', extras: ['headphones'] },  act: 'walk', range: sourceMotion('jogger',0,800), speed: 0.9, name: 'JOGGER', talk: [
  ['Six laps of the pier before the shift whistle. The Registry counts my steps.', 'I am trying to get it to give up.'],
  ['Can\'t stop. If I stop, my insurance thinks I died.'],
] };
const TALKERS: Character[] = [customs, docker, tide, fisher, jogger];
/** The pier's birds: every one answers E (ART-GUIDE §10). The gulls react; the pigeon gets shooed. */
const GULL_TALK = [
  ['(The gull looks at you, then at your pockets, then screams.)'],
  ['(It takes a step closer. It has done this before. You are the one being mugged.)'],
  ['(It stares at you with one eye, then the other, and finds you lacking from both sides.)'],
];
const gullTalk = (k: number) => [GULL_TALK[k % 3], GULL_TALK[(k + 1) % 3], GULL_TALK[(k + 2) % 3]];
const BIRDS: Character[] = [
  {...sourceActor('bird0',true),  id: 'gull1', look: 'gull',   act: 'stand', name: 'GULL', talk: gullTalk(0) },
  {...sourceActor('bird1',true),  id: 'gull2', look: 'gull', seed: 2,   act: 'walk', range: 50, name: 'GULL', talk: gullTalk(1) },
  {...sourceActor('bird2',true),  id: 'gull3', look: 'gull', seed: 3,   act: 'stand', facing: -1, name: 'GULL', talk: gullTalk(2) },
  {...sourceActor('bird3',true),  id: 'gull4', look: 'gull', seed: 4,   act: 'stand', name: 'GULL', talk: gullTalk(1) },
  {...sourceActor('bird4',false),  id: 'gull5', look: 'gull', seed: 5,  act: 'walk', range: 50, name: 'GULL', talk: gullTalk(0) },
  {...sourceActor('bird5',false),  look: 'pigeon', seed: 6,  act: 'walk', range: 20 },
];

/** Stable actor identities, with source-owned local placement. */
export const HARBOR_ACTORS:Record<string,Character>={watchman,fishSeller,teaMan,guard,driver,cat:CAT,...Object.fromEntries(operators.map((a,i)=>['operator'+i,a])),...Object.fromEntries(DEN.map((a,i)=>['den-person'+i,a])),...Object.fromEntries(PIER.map((a,i)=>['pier-person'+i,a])),...Object.fromEntries(TALKERS.map(a=>[a.id!,a])),...Object.fromEntries(BIRDS.map((a,i)=>['bird'+i,a]))};
for(const row of harborGeometry()){const actor=HARBOR_ACTORS[row.instance.id];if(!actor)continue;const dx=row.placement.x-actor.x;if(Array.isArray(actor.range))actor.range=[actor.range[0]+dx,actor.range[1]+dx];actor.x=row.placement.x;if(actor.h!==undefined||row.placement.h!==0)actor.h=row.placement.h;}
// ---------- things to do ----------

/** How the stands and the crane have answered so far, this visit. What you carry (fish for the cat, tea for the crane) is in the save: `UseCtx` items. */
let fishSold = 0, teaSold = 0, craneTeas = 0, bribeAsked = false;
/** When the crane last came down for a cup (frames), to animate the spreader. */
let craneCall = -1e9;


const FISH_LINES = [
  ['One mackerel. Caught this morning, by me, with a hook, like an animal.', 'Wrapped in yesterday\'s Registry notice. Only thing they\'re good for.'],
  ['Sardines. Small, honest, and nobody has put a chip in one yet.'],
  ['Another? The cat on the bollard will love you. The cat loves anyone holding a fish.'],
];
const TEA_LINES = [
  ['Tea. Black, because milk needs a permit.', 'If you\'re not drinking it, take it to the crane. The operator hasn\'t come down since Tuesday.'],
  ['Synth coffee. Tastes like coffee described by someone who once heard about it.'],
  ['Broth. Don\'t ask what it was. It was brave.'],
];

const USES: SceneUse[] = [
  { id: 'fish', x: L.fish.use, label: '[E] BUY FISH', price: 1, name: 'FISH SELLER', promptH: 92, use: (c) => {
    if (!c.pay(1)) return ['One token a fish. You have the look of someone with no tokens and strong opinions.', 'Come back richer. The fish will still be here. Less fresh, but here.'];
    c.add('fish'); c.set('harbor:fish');
    return FISH_LINES[fishSold++ % FISH_LINES.length];
  } },
  { id: 'drink', x: L.drinks.use, label: '[E] HOT DRINK', price: 1, name: 'TEA CART', promptH: 92, use: (c) => {
    if (!c.pay(1)) return ['One token. Warmth is extra and I don\'t sell it.'];
    c.add('tea'); c.set('harbor:tea');
    // in the rain, the tea cart has the one line it has been saving
    if (c.weather === 'rain' || c.weather === 'storm') return ['Rain\'s in. Same price. The rain is free, I checked.', '(Tea, hot, with a lid. The lid is the luxury.)'];
    return TEA_LINES[teaSold++ % TEA_LINES.length];
  } },
  { id: 'crane', x: L.callBox, label: '[E] CRANE CALL BOX', act: 'press the call button', name: 'STS-1 CAB', promptH: 78,
    use: () => ['(The intercom crackles.) STS-1. Unless you\'re a container, I can\'t help you.', 'Unless you\'ve got tea. The cart down the pier does tea. I can\'t come down: if I come down they make me fill in a form about why.'],
    // the tea, held up to the cab: offered in the call box's popup while you carry one
    items: [{ item: 'tea', label: 'hold up the tea', use: (c) => {
    if (!c.take('tea')) return [];
    craneCall = c.t;
    if (craneTeas++ === 0) {
      c.give(1); c.set('harbor:crane');
      return ['Is that tea? Hold it up. Higher. Right, stand clear.', '(Sixty tonnes of spreader come down, very gently, for one paper cup.)', 'Bless you. Fourteen hours up here. Have a token, don\'t tell the union.', 'From up here I see every box on the pier. My mate on STS-2, round at berth 4 in terminal 2, has one on tonight\'s schedule the yard system can\'t find. Lifts what the schedule says, that one. Never asks what.'];
    }
    return ['Another one? You\'re spoiling me. (Up goes the cup.)', 'The patrol boat never looks up, you know. Nobody looks up.'];
  } }] },
  { id: 'bribe', x: L.bribe, label: '[E] TALK TO THE GUARD', price: (f) => (f['harbor:bribed'] || !bribeAsked ? 0 : 3), name: 'GUARD', promptH: 62, use: (c) => {
    if (c.flags['harbor:bribed']) return ['I\'m not looking. I\'m admiring the water. Very busy water tonight.'];
    if (!bribeAsked) { bribeAsked = true; return ['Bonded store. Sealed cargo. Nothing to see.', 'Not seeing anything costs three tokens.']; }
    if (!c.pay(3)) return ['Three. I can count, even if the Registry won\'t let me vote.'];
    c.set('harbor:bribed');
    return ['(He pockets the tokens without looking at them, which is a skill.)', 'I\'m going to have a smoke and look at the sea for exactly as long as it takes. Go on.'];
  } },
  { id: 'mark', x: L.ghostUse, label: '[E] LOOK AT THE MARK', name: 'GUARD', promptH: 78, use: (c) => {
    if (!c.flags['harbor:bribed']) return ['Oi. Bonded store. Step back from the seals.'];
    c.set('harbor:ghostmark');
    return { name: 'PAINTED MARK', pages: ['A lantern, painted by hand in whitewash over the company logo. The paint is still tacky.', 'Under it, in pencil: COUNTED OUT? THE CANALS, UNDER THE THIRD BRIDGE. ASK FOR A LANTERN.'] };
  } },
  { id: 'cat', x: CAT.x, label: '[E] THE CAT', act: 'look at the cat', name: 'DOCK CAT', promptH: 40,
    use: (c) => [c.has('fish')
      ? '(The cat looks at the fish in your hand, then at you. It waits for you to work it out.)'
      : '(The cat looks at your empty hands, then at the fish stand, then back at you. The message is clear.)'],
    // the fish, put down for it: offered in the cat's popup while you carry one
    items: [{ item: 'fish', label: 'give it the fish', use: (c) => {
    if (!c.take('fish')) return [];
    c.set('harbor:cat');
    return ['(You put the fish down. The cat inspects it like a customs officer, then eats it like a smuggler.)', '(It lets you scratch one ear, once. That\'s the deal.)'];
  } }] },
];

/** A dark boat far out with one lamp; now and then it signals: three long. Middle band. */



/** The Registry's patrol boat on its round: a grey hull, a red light, a searchlight sweeping the water. */


/** The night ferry, crossing on a long loop. */


/** The gantry crane (the frame is the set piece, sets/crane.ts); the trolley carries the operator's cab and a container. */


/** The customs arch: a steel portal with a scan bar sweeping a container on its chassis. */


/** The Tide's den: a container with its side doors folded open, a bulb, cards on a crate, a signal lamp. */


/** The bonded store: a chain-link fence and gate in front of the container the Ghosts painted. */


/** A forklift on its shuttle between the stacks, carrying a pallet; its driver at the wheel. */


/** The gate to terminal 2 between the stacks: a gap in the fence, a lane going back between containers, its plate. */


/** The guard hut by the metro, its watchman in the window. */



const base: Omit<SceneDef,'drawBackdrop'|'drawFront'> = {
  id: 'harbor',
  name: 'Harbor',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, weather: true },
  // the pier runs along the shore; you look east over the water: the sun comes up out of the sea,
  // and in the evening the sheds behind you throw their shade across the pier
  facing: 90,


  intro: ['The harbor. Everything here is in a box, and nobody asks what.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'harborStation', at: 'harbor', label: '[E] TO THE METRO', promptH: 82 },
    { id: 'taxi', x: L.taxi, to: '', action: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
    // the gate to terminal 2 behind the pier: the stacks, berth 4, STS-2 (P15)
    { id: 'stacks', x: L.terminal, to: 'stacks', at: 'harbor', label: '[E] TERMINAL 2 · STACKS', promptH: 96 },
    // the pier runs on east along the shore to the beach (beach/: its left edge leads back here)
    { id: 'beach', x: sourceAt('beach-exit').x, to: 'beach', at: 'harbor', label: 'BEACH >', edge: 'right' },
  ],
  readables: [
    { id: 'notice', x: L.notice, name: 'PORT AUTHORITY', promptH: 78, pages: ['ALL CARGO IS SUBJECT TO INSPECTION AT THE CUSTOMS ARCH.', 'INSPECTION METHOD: EXTERNAL SCAN. CONTENTS AS DECLARED BY THE SHIPPER.'] },
    { id: 'manifest', x: L.manifest, name: 'MANIFEST', promptH: 74, pages: ['CONTAINER MANIFEST · BERTH 4 · NIGHT LOADING.', 'NRLU 404 0451 · CONTENTS: NOT DECLARED · ORIGIN: REDACTED · DESTINATION: REDACTED · INSURANCE: VOID.'] },
    { id: 'ferry', x: L.ferry, name: 'NIGHT FERRY', promptH: 78, pages: ['NIGHT FERRY 7 · DEPARTS WHEN FULL.', 'TICKETS ARE NOT SOLD AT THIS PIER. FARES ARE BILLED TO YOUR REGISTRY ACCOUNT.'] },
  ],
  people: [...TALKERS, ...BIRDS],
  uses: USES,




};




/** The container stacks, bottom to top, each box sitting a little crooked on the one below. */


export const harborCraneCall=()=>craneCall;
export function harborScene(doc:Composition=harborComposition,state:Environment['state']={},options:HarborRenderOptions={}):SceneDef{return adaptHarbor(base,HARBOR_ACTORS,harborCraneCall,doc,state,options);}
export const harbor=harborScene();
