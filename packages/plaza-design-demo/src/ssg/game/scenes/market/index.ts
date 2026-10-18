import {MARKET_GAMEPLAY} from './gameplay';
import type { Composition,Environment } from '../../art';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
import { crowd } from '../../runtime/characters';
import { drawMarketComposition,drawMarketForeground,marketComposition,marketEnvironment,marketGeometry,marketPeople,marketPlacement,marketStalls,validateMarketComposition,type MarketRenderOptions } from './composition';
export { marketArt,marketComposition,validateMarketComposition } from './composition';
/**
 * The street market: stalls of every kind under the tenements, vendors behind every counter,
 * customers haggling, a kid working the fruit stall, a fortune-telling robot, a queue sorted by
 * credit score. Bands: far = towers through the gaps; middle = tenement facades with their
 * screens, blade signs and light strings, and the back crowd; play = stalls, people, the wet street.
 *
 * The reference scene for the kits (ART-GUIDE §10): people from ../characters.ts, screens and signs
 * from screens.ts, stalls, facades and furniture from build.ts. Everything placed is plain data.
 */

import { stallBox } from "../../art/assemblies/construction";
import { type Character } from "../../runtime/characters";
import { type SceneDef,type SceneUse } from "../kit";

/** Layout: positions in world units, heights up from the street. */
const L = {
  width: 2080,
  spawn: 86,
  board: 574,
  /** The laundromat's shopfront between the umbrellas and the fruit (its door: the exit `laundromat`; inside: P13, washer 3). */
  laundry: { x0: 552, x1: 636, door: 616 },
  /** Doors at play level: the service door to the mall, and the gate to Downtown in the end wall (open once Downtown is cleared). */
  service: 32,
  gate: 2036,
  endWall: 1990,
  /** Vertical signs on the tenements, in the middle band's coordinates. */
  blades: [{ x: 150, h: 210, text: 'HOTEL' }, { x: 520, h: 200, text: 'PAWN' }, { x: 860, h: 220, text: 'CLINIC' }, { x: 1180, h: 230, text: 'KARAOKE' }, { x: 1520, h: 205, text: 'BATHS' }],
};

// ---------- the people behind the counters ----------

const cook: Character = { id: 'cook', seed: 4101, look: { body: 'wide', garb: 'apron', hair: 'scarf', extras: [] }, x: 150, act: 'vend', name: 'NOODLE COOK', talk: [
  ['Noodles. Two tokens. "Other" is one.', 'The inspector asked what is in them. I said other. He wrote it down. Now it is on the menu.'],
  ['Still deciding? The noodles are not.'],
] };
const simVendor: Character = { seed: 4102, look: { body: 'slim', hair: 'mohawk', garb: 'jacket', extras: ['visor', 'cyberarm'] }, x: 356, act: 'phone' };
const brolly: Character = { seed: 4103, look: { body: 'tall', hair: 'cap', garb: 'coat', extras: [] }, x: 470, act: 'vend', facing: 1 };
const fruitVendor: Character = { seed: 4104, look: { body: 'tall', hair: 'bun', garb: 'apron', extras: ['glasses'], hairCol: '#d8d2c6' }, x: 668, act: 'haggle', facing: 1 };
const implantVendor: Character = { seed: 4105, look: { body: 'tall', hair: 'bald', garb: 'suit', extras: ['cyberarm', 'visor'] }, x: 862, act: 'vend' };
const fishmonger: Character = { id: 'fish', key: true, seed: 4106, look: { body: 'tall', hair: 'beanie', garb: 'apron', extras: [] }, x: 1062, h: 2, act: 'vend', name: 'FISHMONGER', talk: [
  ['Fresh today. Which today, I did not say.', 'You are the friend. The quiet one, Moth, said a friend might come asking.', 'Moth bought line and hooks off me last week. Said they were not for fish.', 'Then asked which pier the Registry boats skip. I sell fish. I said the harbor has a lot of piers.'],
  ['Moth paid cash. Nobody pays cash. Cash is for people who do not want to be remembered.'],
  ['Buy a fish or go stand in someone else\'s rain.'],
] };
/** FORTUNE UNIT 9 is a real robot: a boxy service unit whose screen face changes its mind. */
const fortuneBot: Character = { seed: 4107, look: { bot: 'servbot', paint: '#54406a', v: 1 }, x: 1206, act: 'blink', facing: -1 };
const fixer2: Character = { id: 'repair', seed: 4108, look: { body: 'wide', hair: 'short', garb: 'hivis', extras: ['cyberarm', 'glasses'] }, x: 1352, h: 6, act: 'vend', name: 'REPAIRS', talk: [
  ['I fix anything with a screw in it.', 'Not the Registry. That one is working as intended.'],
  ['Your deck? Nice. Do not let me see the inside, I will want it.'],
] };
const dumplingCook: Character = { seed: 4109, look: { body: 'avg', hair: 'brim', garb: 'apron', extras: ['mask'] }, x: 1560, act: 'vend' };
const sleeper: Character = { id: 'sleeper', seed: 4110, look: { body: 'tall', hair: 'long', garb: 'jacket', extras: ['headphones'] }, x: 1806, act: 'sleep', name: 'FIRMWARE VENDOR', talk: [
  ['Zzz...', '(The note on the counter says BACK IN 5 MIN. The tape has gone yellow.)'],
  ['...not buying, not selling, not awake...'],
] };

// ---------- the stalls, each a variant ----------

const STALLS = marketStalls();

// the sleeper lies on his own counter
sleeper.h = stallBox(STALLS[8]).counter;

// ---------- the robots who work here ----------

/** A rich man walking the market, his valet a step behind with the umbrella over him. */
const richMan: Character = { seed: 4230, look: { body: 'wide', garb: 'suit', hair: 'bald', extras: ['glasses'] }, x: 300, act: 'walk', range: [300, 640], speed: 0.24 };
/** The shopper from the dumpling end, her porter behind her with the groceries. */
const shopper: Character = { seed: 4214, x: 1220, act: 'walk', range: [1260, 1740], look: { extras: ['bag'] } };
/** Up on the REPAIRS stall's roof, welding its light. */
const crawler: Character = { look: 'crawler', seed: 4311, x: 1404, act: 'weld', facing: -1 };
const ROBOTS: Character[] = [
  { look: 'sweeper', seed: 4301, x: 664, act: 'sweep', range: [664, 736] },
  { look: { bot: 'valet', v: 1 }, seed: 4302, x: 300, follow: richMan, gap: 16 },
  { look: 'porter', seed: 4303, x: 1240, follow: shopper, gap: 20 },
  // the movers keep clear of the laundromat's door (a robot passing would take its E)
  { look: 'mech', seed: 4304, x: 660, act: 'patrol', range: [660, 940] },
  { look: 'loader', seed: 4305, x: 1150, act: 'carry', range: [1160, 1040] },
  { look: 'litterbot', seed: 4306, x: 1250, act: 'roll', range: [1250, 1130] },
  { look: 'deliverybot', seed: 4307, x: 200, act: 'roll', range: [200, 530] },
  { id: 'busker', seed: 4308, look: { bot: 'busker', v: 0 }, x: 1600, act: 'play', facing: 1, name: 'BUSKER', talk: [
    ['This one is called Rain On Tin. I wrote it on tin. In the rain.', 'Tips are optional. Eye contact is mandatory.'],
    ['I used to play the mall. Then the mall got a playlist.', 'The playlist does not take requests either, but it does not pretend to.'],
    ['Still here? That makes you my audience. Congratulations. There is no prize.'],
  ] },
  { id: 'marshal', seed: 4309, look: 'marshal', x: 1764, act: 'direct', facing: -1, name: 'QUEUE MARSHAL', talk: [
    ['Wait for green. Green is coming.', 'Green has been coming since I was installed.'],
    ['Your score is not my business. It is my whole job, but it is not my business.'],
  ] },
  { id: 'oldunit', seed: 4310, look: 'wreck', x: 1906, act: 'slump', facing: -1, name: 'OLD UNIT', talk: [
    ['...hello. Do you have a spare servo? A bolt? Half a bolt?', 'I sorted parcels for nineteen years. Then they sorted me.'],
    ['The new model does my job and sings. I did not know the job needed singing.'],
    ['Do not worry about me. My warranty ran out. My optimism did not. That one is a bug.'],
  ] },
  crawler,
  { look: 'flyerdrone', seed: 4312, x: 400, h: 20, act: 'hover', range: [400, 560] },
  { look: 'cargodrone', seed: 4313, x: -200, h: 40, act: 'hover', range: [-200, 2300], speed: 0.4 },
  { look: 'minidrone', seed: 4314, x: 1900, h: 30, act: 'hover', range: [1900, 900], speed: 0.6 },
];
crawler.h = stallBox(STALLS[6]).awning;

// ---------- the street ----------

/** People on the street, in front of the stalls: drawn after them. Plain data. */
const STREET: Character[] = [
  { look: 'pigeon', x: 236, act: 'stand' }, { look: 'pigeon', x: 262, act: 'walk', range: 30 }, { look: 'pigeon', seed: 9, x: 70, act: 'stand' },
  { id: 'regular', seed: 4201, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [] }, x: 250, h: 10, act: 'sit', facing: -1, name: 'REGULAR', talk: [
    ['Twenty years I have eaten here.', 'The recipe changed forty times. The price only ever changed one way.'],
    ['Do not take that stool. It reports to the Registry.', '...I am joking. The stool is freelance.'],
  ] },
  { seed: 4202, x: 330, act: 'phone', facing: -1, look: { extras: ['phone', 'backpack'] } },
  { seed: 4203, x: 520, act: 'walk', range: [520, 380], look: { extras: ['umbrella'] } },
  { seed: 4204, x: 716, act: 'haggle', facing: -1, look: { body: 'avg', garb: 'dress', extras: ['bag'] } },
  { id: 'kid', seed: 4205, look: { body: 'kid', hair: 'cap', garb: 'tee', extras: [] }, x: 800, act: 'steal', range: [800, 748], speed: 0.45, name: 'KID', talk: [
    ['I am not stealing. I am testing their security.', 'Report: there is none.'],
    ['You did not see anything. I saw you, though. Two tokens and I forget your face.', 'The cameras charge more.'],
  ] },
  { look: 'drone', x: 962, h: 66, act: 'scan' },
  { seed: 4206, x: 962, act: 'stand', facing: 1, look: { body: 'avg', hair: 'hood', garb: 'jacket', extras: [] } },
  { look: 'cat', seed: 2, x: 1138, act: 'sit', facing: -1 },
  { look: 'courier', x: 660, act: 'walk', range: [660, 1260], speed: 0.5 },
  { seed: 4207, x: 1436, act: 'argue', facing: 1, look: { body: 'tall', garb: 'coat', hair: 'long' } },
  { seed: 4208, x: 1460, act: 'argue', facing: -1, look: { body: 'short', garb: 'jacket', hair: 'mohawk', extras: ['mask'] } },
  { seed: 4209, x: 1668, act: 'queue', facing: -1, look: { extras: ['phone'] } },
  { id: 'queue', seed: 4210, x: 1688, act: 'queue', facing: -1, name: 'IN THE QUEUE', look: { body: 'wide', garb: 'hivis', hair: 'helmet', extras: [] }, talk: [
    ['The queue is sorted by credit score.', 'I was first when I got here. That was two hours ago.'],
    ['Someone with a 900 just walked in and got served before he was hungry.'],
  ] },
  { seed: 4211, x: 1706, act: 'queue', facing: -1, look: { body: 'kid', extras: [] } },
  { seed: 4212, x: 1722, act: 'queue', facing: -1, look: { body: 'old', extras: ['cane'] } },
  { look: 'cleaner', x: 1900, act: 'walk', range: [1900, 1980] },
  { seed: 4213, x: 1978, act: 'lean', facing: -1, look: { garb: 'jacket', hair: 'short', extras: [] } },
  shopper, richMan,
  { seed: 4215, x: 140, act: 'walk', range: [140, 560] },
  ...ROBOTS,
];
const ALL: Character[] = [cook, fishmonger, fixer2, sleeper, ...STREET];

/** The back crowd: small, dim, between the stalls and the tenements. */

/** The near crowd: big and dark, passing along the bottom of the view. */


// ---------- the middle band ----------


/**
 * The laundromat's front, squeezed between two stalls: a lit glass window with the washers
 * inside, the door (cyan handle: you can go in), its name on a plate, the market rules bolted
 * to its wall and a camera over the door. Interiors behind glass are lit (ART-GUIDE §8).
 */




// ---------- things to do ----------

let haggle = 0;
const FORTUNES = [
  ['FORTUNE UNIT 9 SEES... a stranger. You are in a market. That was not hard.'],
  ['FORTUNE UNIT 9 SEES... a friend who is not fishing. A boat that knows where.', 'That will be all. FORTUNE UNIT 9 does not do follow-up questions.'],
  ['FORTUNE UNIT 9 SEES... a door that opens. Do not trust the door.'],
  ['FORTUNE UNIT 9 SEES... your credit score rising.', 'Correction: someone else\'s. FORTUNE UNIT 9 regrets the error.'],
  ['FORTUNE UNIT 9 SEES... rain. FORTUNE UNIT 9 is never wrong about rain.'],
];

const USES: SceneUse[] = [
  { id: 'haggle', x: 486, label: '[E] HAGGLE · UMBRELLA', price: (f) => (haggle >= 4 && !f['market:umbrella'] ? 1 : 0), name: 'UMBRELLA SELLER', promptH: 70, use: (c) => {
    if (c.flags['market:umbrella']) return ['You already have one of mine. It works. Mostly.', 'If it asks for an update, say no.'];
    const steps = [
      ['Umbrella? Nine tokens.', 'Look up. The sky does my advertising.'],
      ['Seven. Because you have an honest face. Unregistered, but honest.'],
      ['Four. I have children to feed.', '(The kid at the fruit stall waves at him. He does not wave back.)'],
      ['ONE token. Final. You are robbing me in front of the cameras.', 'Haggle again to pay.'],
    ];
    if (haggle < steps.length) return steps[haggle++];
    if (!c.pay(1)) { return ['No tokens? Then that was haggling for the exercise.', 'Come back with one. The rain will wait. It always waits.']; }
    c.set('market:umbrella');
    return ['Pleasure. It is a smart umbrella: it opens once you accept its terms.', 'Forty pages. Read them under a roof.'];
  } },
  { id: 'fortune', x: 1208, label: '[E] FORTUNE', price: 1, name: 'FORTUNE UNIT 9', promptH: 98, use: (c) => {
    const cursor=Number(c.gameplay!.state().values!['market.fortune']);
    if (!c.gameplay!.dispatch('market.fortune.'+cursor,'interaction').ok) return ['FORTUNE UNIT 9 CANNOT SEE YOUR FUTURE.', 'IT CAN SEE YOUR BALANCE. IT IS ZERO.'];
    return FORTUNES[cursor];
  } },
];

const BACK=crowd(57,16,-100,2100,{ps:2,dim:.5,parallax:.9,h:8});
const NEAR=crowd(59,4,0,2200,{ps:5,dim:.78,parallax:1.3,h:-58,acts:['walk']});
const actors:Record<string,Character>={cook,simVendor,brolly,fruitVendor,implantVendor,fishmonger,fortuneBot,fixer2,dumplingCook,sleeper,...Object.fromEntries(STREET.map((p,i)=>['street-'+i,p])),...Object.fromEntries(BACK.map((p,i)=>['back-'+i,p])),...Object.fromEntries(NEAR.map((p,i)=>['near-'+i,p]))};
const peopleIds=['cook','fishmonger','fixer2','sleeper',...STREET.map((_p,i)=>'street-'+i)];
export function marketFrameEnvironment(view:View,_engine:EngineDraw,doc:Composition=marketComposition):Environment{return marketEnvironment(view,actors,doc);}
export function drawMarket(ctx:CanvasRenderingContext2D,view:View,_engine:EngineDraw,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={}){drawMarketComposition(ctx,view,actors,doc,state,options);}
export function drawMarketFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={}){drawMarketForeground(ctx,view,actors,doc,state,options);}

const base: SceneDef = {
  gameplay:MARKET_GAMEPLAY,
  id: 'market',
  name: 'Street Market',
  // facing (light.ts): you look north up the market lane: the sun is always behind you; the buildings behind throw their shade
  facing: 0,
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, weather: true },
  // the buildings behind you (the market looks north) throw their shade over the lane all day
  shade: { back: { h: 170, gaps: [[560, 610], [1440, 1490]] } },
  lights: STALLS.filter((p) => p.light && p.light !== 'none').map((p) => ({ x: p.x + p.w / 2, h: 64, kind: 'lamp' as const, r: 54, col: p.light === 'tube' ? '235,240,255' : '255,200,120' })),
  // the stool by the stalls: sit, watch the market, let time pass (TIME.md, waiting)
  rests: [{ id: 'stool', x: 250, kind: 'stool', promptH: 50 }],
  intro: ['The night market. Cash, noise and nobody looking up.'],
  exits: [
    { id: 'mall', x: L.service, to: 'mall', at: 'market', label: '[E] SERVICE DOOR · MALL', promptH: 82 },
    { id: 'downtown', x: L.gate, to: 'downtown', at: 'market', label: '[E] GATE · DOWNTOWN', promptH: 82, requires: 'end' },
    { id: 'laundromat', x: L.laundry.door, to: 'laundromat', at: 'market', label: '[E] LAUNDROMAT', promptH: 92 },
  ],
  readables: [
    { id: 'sims', x: 342, name: 'SIM CARDS', promptH: 128, pages: ['PREPAID SIM · ACTIVATION 3 MIN.', 'ALL SIMS ARE REGISTERED AT SALE. REGISTERED TO WHOM IS NOT STATED.'] },
    { id: 'rules', x: L.board, name: 'MARKET RULES', promptH: 84, pages: ['TRADING HOURS 18:00–04:00. ALL TRANSACTIONS ARE LOGGED.', 'NO PHOTOGRAPHY. REGISTRY CAMERAS EXEMPT.'] },
    { id: 'implants', x: 900, name: 'USED IMPLANTS', promptH: 128, pages: ['CERTIFIED PRE-OWNED.', 'ORIGIN OF STOCK NOT DISCLOSED.'] },
  ],
  people: ALL,
  uses: USES,

  drawBackdrop: drawMarket,

  drawFront: (x,v)=>drawMarketFront(x,v),
};

export function marketScene(document:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={},gameplay=MARKET_GAMEPLAY):SceneDef{const doc=validateMarketComposition(document),rows=marketGeometry(doc),p=(id:string)=>marketPlacement(id,doc);return{...base,gameplay,width:Number(rows.find(r=>r.instance.id==='scene')!.props.width),spawn:p('spawn').x,people:marketPeople(actors,peopleIds,doc),exits:base.exits.map(e=>({...e,x:p('exit-'+e.id).x})),readables:base.readables!.map(r=>({...r,x:p(r.id==='rules'?'rules':'read-'+r.id).x})),uses:base.uses!.map(u=>({...u,x:p('use-'+u.id).x})),rests:base.rests!.map(r=>({...r,x:p(r.id).x})),lights:marketStalls(doc).filter(s=>s.light&&s.light!=='none').map(s=>({x:s.x+s.w/2,h:s.elevation+64,kind:'lamp' as const,r:54,col:s.light==='tube'?'235,240,255':'255,200,120'})),drawBackdrop:(x,v,e)=>drawMarket(x,v,e,doc,state,options),drawFront:(x,v)=>drawMarketFront(x,v,doc,state,options),visualEnvironment:(v,e)=>marketFrameEnvironment(v,e,doc)};}
export const market=marketScene();
