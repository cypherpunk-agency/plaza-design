import type { Composition,Environment } from '../../art';
import type { EngineDraw } from '../../engine/host';
import { crowd } from '../../runtime/characters';
import { drawMallComposition,drawMallForeground,mallComposition,mallEnvironment,mallLayout,mallPeople,mallPlacement,validateMallComposition,type MallRenderOptions } from './composition';
export { mallArt,mallComposition,validateMallComposition } from './composition';
/**
 * The Galleria, a shopping mall at night: a ground floor of shops you can walk up to and use
 * (implants, a pawnbroker who buys memories, deck repair, a florist, a key cutter, a food court),
 * an escalator carrying people up to the gallery, a fountain with a kid and a cleaning robot,
 * a Registry kiosk that wants your face, security, cameras, and announcements on a ticker.
 * Above: the gallery's railing with people strolling, then the far side of the atrium, floor
 * after floor of shops (more on tall screens), and the skylight.
 *
 * Bands: far = the far side of the atrium and the skylight; middle = the big ad screen, the
 * gallery and its strollers; play = the shopfronts, the floor, its furniture and its people.
 * Built from the kits (ART-GUIDE §10): people (../characters.ts), screens (screens.ts), booths and
 * shelves (build.ts). The signs are dry; the people have the jokes.
 */

import { type Character } from "../../runtime/characters";
import { type SceneDef,type SceneUse,type View } from "../kit";

/** Layout: positions in world units, heights up from the atrium floor. */
const L = {
  width: 2560,
  spawn: 86,
  /** The ground floor: shop interiors up to `ceil`, the fascia over them, the gallery slab, its railing. */
  ceil: 112,
  fascia: 130,
  slab: 144,
  rail: 160,
  /** The far side of the atrium: its floors, from `far0` up, `step` apart. */
  far0: 176,
  step: 86,
  storey: 70,
  kiosk: 110,
  registry: 400,
  escalator: { x: 660, w: 160 },
  escSign: 680,
  fountain: { x: 960, w: 150 },
  pillars: [380, 1790, 2390],
  /** Doors at play level: the Galleria metro station, the stairs to the roof's taxi pad, the service corridor to the market. */
  metro: 32,
  roof: 1740,
  service: 2510,
};



// ---------- the keepers ----------

const implantClerk: Character = { seed: 7101, look: { body: 'slim', garb: 'suit', hair: 'bald', extras: ['visor', 'cyberarm'] }, x: 304, act: 'vend', facing: -1 };
const pawnbroker: Character = { seed: 7102, look: { body: 'wide', garb: 'jacket', hair: 'short', hairCol: '#a8a29a', top: '#6a2a3e', extras: ['glasses'] }, x: 590, act: 'vend', facing: -1 };
const deckTech: Character = { seed: 7103, look: { body: 'avg', garb: 'hivis', hair: 'bun', extras: ['glasses', 'cyberarm'] }, x: 1130, act: 'vend', facing: -1 };
const florist: Character = { seed: 7104, look: { body: 'old', garb: 'apron', hair: 'bun', hairCol: '#e8e4dc', extras: [] }, x: 1352, act: 'vend', facing: -1 };
const teen: Character = { id: 'teen', seed: 7105, look: { body: 'slim', garb: 'tee', hair: 'mohawk', hairCol: '#6a3a9a', extras: ['headphones', 'phone'] }, x: 1468, act: 'phone', facing: -1, name: 'KIOSK', talk: [
  ['Phone cases. Screens. Screen protectors for your screen protector.', 'I get paid by the hour. The hours are very long. Coincidence.'],
  ['If you\'re not buying, could you at least look interested? Camera 6 counts customers.'],
] };
const keyCutter: Character = { seed: 7106, look: { body: 'old', garb: 'apron', hair: 'brim', acc: '#5a3a2a', extras: ['glasses'] }, x: 1652, act: 'vend', facing: -1 };
const COOKS: Character[] = [
  { seed: 7107, look: { body: 'wide', garb: 'apron', hair: 'scarf', acc: '#c83a2a', extras: [] }, x: 1900, act: 'vend', facing: -1 },
  { seed: 7108, look: { body: 'tall', garb: 'tee', hair: 'cap', acc: '#d8b040', top: '#a84a3a', extras: ['mask'] }, x: 2050, act: 'vend', facing: -1 },
  { seed: 7109, look: { body: 'short', garb: 'apron', hair: 'beanie', extras: [] }, x: 2200, act: 'vend', facing: -1 },
];

// ---------- the floor's people ----------

const GUARD = { garb: 'jacket' as const, top: '#2e3a4a', bottom: '#1e2430', hair: 'cap' as const, acc: '#1a1a22' };
const kid: Character = { id: 'kid', seed: 7201, look: { body: 'kid', garb: 'tee', hair: 'cap', acc: '#c83a2a', extras: [] }, x: 1012, act: 'stand', facing: -1, name: 'KID', talk: [
  ['I threw a token in. I wished for two tokens.', 'The fountain is thinking about it.'],
  ['Mum says the fountain money goes to the Registry. I said then the Registry has my wish.', 'She said that\'s what worries her.'],
] };
const diner: Character = { id: 'diner', seed: 7202, look: { body: 'avg', garb: 'suit', hair: 'short', extras: ['glasses'] }, x: 2080, h: 10, act: 'sit', facing: -1, name: 'DINER', talk: [
  ['Six counters in this food court. Four of them are the same kitchen.', 'I eat lunch here because the park charges by the minute.'],
  ['Try the noodles. Everything else is also the noodles, in a different shape.'],
] };
const security: Character = { id: 'security', seed: 7203, look: { body: 'wide', ...GUARD, extras: ['visor'] }, x: 2320, act: 'stand', facing: -1, name: 'SECURITY', talk: [
  ['Galleria security. You look unverified. Most people do, after nine.', 'I\'m not paid to chase you. I\'m paid to write down which way you went.'],
  ['Lost child? Desk 2. Lost identity? Also desk 2. It\'s a busy desk.'],
] };
const dancer: Character = { id: 'dancer', seed: 7204, look: { body: 'tall', ...GUARD, hair: 'short', hairCol: '#16100c', extras: [] }, x: 2432, act: 'dance', facing: -1, name: 'SECURITY', talk: [
  ['(He freezes, mid-move.)', 'Camera 14 has a blind spot behind this pillar. Four minutes an hour. I did not tell you that.', 'I\'m stretching. It\'s in the union agreement.'],
  ['You again. Either dance or stand guard. Those are the only two jobs in here.'],
] };
const TALKERS: Character[] = [teen, kid, diner, security, dancer];

/** Shoppers, a patrol, the cleaning robot, a pigeon that got in: drawn in front of the shops. */
const FLOOR: Character[] = [
  { seed: 7301, x: 140, act: 'walk', range: [140, 620], look: { body: 'avg', garb: 'dress', hair: 'long', extras: ['bag'] } },
  { seed: 7302, x: 230, act: 'phone', facing: 1, look: { body: 'tall', garb: 'suit', hair: 'short', extras: ['phone'] } },
  { seed: 7303, x: 470, act: 'walk', range: [470, 900], speed: 0.26, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'] } },
  { seed: 7304, x: 520, act: 'haggle', facing: 1, look: { body: 'wide', garb: 'jacket', hair: 'beanie', extras: ['backpack'] } },
  { seed: 7305, x: 760, act: 'walk', range: [760, 1500], look: { body: 'avg', ...GUARD, extras: [] } },
  { seed: 7306, x: 870, act: 'walk', range: [870, 1260], speed: 0.4, look: { body: 'avg', garb: 'tee', hair: 'long', extras: ['headphones', 'bag'] } },
  { seed: 7307, x: 1060, act: 'stand', facing: -1, look: { body: 'avg', garb: 'coat', hair: 'bun', extras: ['bag'] } },
  { look: 'cleaner', x: 860, act: 'walk', range: [860, 1180] },
  { seed: 7308, x: 1196, act: 'walk', range: [1196, 1700], speed: 0.3, look: { body: 'tall', garb: 'jacket', hair: 'cap', extras: ['visor', 'backpack'] } },
  { seed: 7309, x: 1270, act: 'stand', facing: 1, look: { body: 'slim', garb: 'dress', hair: 'bun', extras: ['bag'] } },
  { seed: 7310, x: 1420, act: 'walk', range: [1420, 1000], speed: 0.5, look: { body: 'kid', garb: 'tee', hair: 'short', extras: ['backpack'] } },
  { seed: 7311, x: 1560, act: 'lean', facing: 1, look: { body: 'slim', garb: 'jacket', hair: 'hood', extras: [] } },
  { seed: 7312, x: 1700, act: 'walk', range: [1700, 2300], look: { body: 'wide', garb: 'coat', hair: 'short', extras: ['bag', 'umbrella'], acc: '#8a3a8a' } },
  { seed: 7313, x: 1950, h: 10, act: 'sit', facing: 1, look: { body: 'short', garb: 'tee', hair: 'long', extras: ['phone'] } },
  { seed: 7314, x: 2110, h: 10, act: 'sit', facing: 1, look: { body: 'old', garb: 'coat', hair: 'scarf', extras: [] } },
  { seed: 7315, x: 2238, h: 2, act: 'sleep', look: { body: 'tall', garb: 'jacket', hair: 'beanie', extras: [] } },
  { look: 'cleaner', x: 1840, act: 'walk', range: [1840, 2280] },
  { look: 'drone', x: 420, h: 118, act: 'scan' },
  { look: 'courier', x: 1500, act: 'walk', range: [1500, 2250], speed: 0.4 },
  { seed: 7316, x: 1980, act: 'queue', facing: 1, look: { body: 'avg', garb: 'hivis', hair: 'helmet', extras: [] } },
];
/** A pigeon that came in through the service door and stayed: answers E with a shoo (game.ts). */
const PIGEON: Character = { look: 'pigeon', seed: 7, x: 2160, act: 'walk', range: 24 };
/** Riding escalator B up to the gallery: placed every frame along the steps. */
const RIDERS: Character[] = [7401, 7402, 7403].map((seed, i) => ({ seed, x: 0, h: 0, act: i === 1 ? 'phone' : 'stand', facing: 1, look: i === 2 ? { body: 'kid' } : { extras: ['bag'] } } as Character));
/** Strollers on the gallery over the shops (middle band) and on the far side's floors. */



// ---------- the shopfronts ----------











/** A shop on the ground floor: the lit interior, its keeper behind the counter, the fascia sign over it. */


// ---------- things to do ----------

let implantAsk = 0, kioskTries = 0, deckChecks = 0, floristAsk = 0, leaves = 0, keyAsk = 0, meals = 0;
const MEALS = [
  ['Noodles, number four. The number is the noodles. There is no one to three.'],
  ['Vat burger. Grown in a vat in the basement. The vat has a name. We don\'t say it in front of customers.'],
  ['Dumplings. Six. Count them. I counted them. We both know it\'s five.'],
];
const MEMORIES: string[][] = [
  ['Memories bought by the megabyte. Let me see the head. Hold still.', '(The helmet hums.) Your first bike. Thirty-one megabytes, mostly a scuffed knee. One token.', 'Pleasure. You won\'t miss it. Nobody remembers what they sold here, that\'s the beauty of it.'],
  ['A birthday. Eleven candles. Good resolution, bit of cake on the lens.', 'One token. I\'d go two if there was a pony. There\'s never a pony.'],
  ['A rainy afternoon reading on a bus. Low drama, low price.', 'Still one token. I\'m sentimental. Don\'t tell anyone, it\'s bad for business.'],
];

const USES: SceneUse[] = [
  { id: 'implants', x: 262, label: '[E] VANTA IMPLANTS', price: (f) => (implantAsk && !f['mall:implant'] ? 2 : 0), name: 'VANTA CLERK', promptH: 70, use: (c) => {
    if (implantAsk++ === 0) return ['Welcome to Vanta. Eyes, ears, spines: the full catalogue.', 'An optic upgrade starts at four hundred tokens. Thirty-six months\' finance. Your lungs secure the loan.'];
    if (c.flags['mall:implant']) return ['The light in your thumb? It\'s working. You just don\'t have any messages.', 'We sell a messages package, if you\'d like some.'];
    if (!c.pay(2)) return ['We do have a budget option: looking at the catalogue. That\'s free.', 'Until it isn\'t. Read the terms.'];
    c.set('mall:implant');
    return ['Excellent. A subdermal light, left thumb, two tokens. It glows when you get a message.', '(A pinch. A glow.) You don\'t get messages? It glows anyway. Optimism is a feature.'];
  } },
  { id: 'kiosk', x: L.registry, label: '[E] VERIFY IDENTITY', name: 'REGISTRY KIOSK', promptH: 96, use: (c) => {
    c.set('mall:kiosk');
    return kioskTries++ === 0
      ? ['PLEASE LOOK INTO THE CAMERA.', 'IDENTITY NOT FOUND. MEMBER PRICES UNAVAILABLE. PLEASE CONTACT YOUR REGISTRY OFFICE.']
      : ['IDENTITY NOT FOUND.', 'THIS ATTEMPT HAS BEEN LOGGED. THANK YOU FOR SHOPPING AT THE GALLERIA.'];
  } },
  { id: 'pawn', x: 540, label: '[E] PAWN · SELL A MEMORY', name: 'PAWNBROKER', promptH: 70, use: (c) => {
    const n = ['mall:pawn1', 'mall:pawn2', 'mall:pawn3'].filter((f) => c.flags[f]).length;
    if (n >= MEMORIES.length) return ['No. You\'re running low. I don\'t buy from anyone under a gigabyte: bad for business, worse for you.', 'Come back when you\'ve made some new ones. Live a little. Then sell it to me.'];
    c.set('mall:pawn' + (n + 1)); c.give(1);
    return MEMORIES[n];
  } },
  { id: 'deck', x: 1130, label: '[E] DECK CHECKUP', price: 1, name: 'DECK REPAIR', promptH: 96, use: (c) => {
    if (!c.pay(1)) return ['A checkup is one token. I can look at it for free, but then all I\'ll tell you is that it\'s a deck.'];
    c.set('mall:deck');
    return deckChecks++ === 0
      ? ['(She opens your deck, blows into it, closes it.) Dust in the fan. Fixed.', 'Three sets of fingerprints on the keys. Yours, a cat\'s, and someone who types fast and angry. A friend?']
      : ['It\'s clean. Stop paying me to tell you it\'s clean.', '...Fine. Token received. It\'s clean.'];
  } },
  { id: 'florist', x: 1300, label: '[E] FLORIST', price: () => (floristAsk ? 2 : 0), name: 'FLORIST', promptH: 70, use: (c) => {
    if (floristAsk++ === 0) return ['Everything here is real. Grown in dirt, in daylight, from a seed. Look, don\'t touch.', 'The fern is nine hundred tokens. The basil is four hundred. A single basil leaf is two.'];
    if (!c.pay(2)) return ['Then just breathe near the fern. The first breath is free.'];
    c.set('mall:leaf'); c.add('basil');
    return leaves++ === 0
      ? ['One leaf. I\'ll wrap it.', 'Smell it on the way home. That\'s what you\'re paying for. Eating it would be a waste of money.']
      : ['Another leaf. You remind me of someone: the one with the deck and the smart pot.', 'Buys plant food here. Talks to their fern. The fern looks well on it.'];
  } },
  { id: 'keys', x: 1610, label: '[E] KEY CUTTER', price: (f) => (keyAsk && !f['mall:blankchip'] ? 2 : 0), name: 'KEY CUTTER', promptH: 70, use: (c) => {
    c.set('mall:keycutter');
    if (keyAsk++ === 0) return ['Keys cut. Chips copied. Registered chips only, it says so on the counter.', 'Unregistered ones I don\'t copy. I clone. Different word, different price.', 'Bring me a chip and a reason. I copy the chip and forget the reason.'];
    if (c.flags['mall:blankchip']) return ['You have your blank. When you need something opened, bring the chip it\'s afraid of.'];
    if (!c.pay(2)) return ['Two tokens for a blank. The pawnshop pays for memories, if you\'re short. I don\'t ask which ones.'];
    c.set('mall:blankchip'); c.add('blankchip');
    return ['A blank chip. Unregistered. Not illegal, just unsold.', 'I\'ll remember your face. It\'s the one memory I never sell.'];
  } },
  { id: 'order', x: 1900, label: '[E] ORDER', price: 1, name: 'FOOD COURT', promptH: 70, use: (c) => {
    if (!c.pay(1)) return ['One token. We take tokens, registered cards and nothing else. You are nothing else.'];
    c.set('mall:ate');
    return MEALS[meals++ % MEALS.length];
  } },
];

// ---------- the far side and the skylight ----------



/** Water drops in the fountain's arcs: [side, phase]. */


/** The far side's floors for this view: at least two; taller screens see more, the skylight just over the top one. */




/** Escalator B: a truss from the floor up to the gallery, steps creeping, people riding it. */


/** The Registry kiosk: a white pillar with a face-scan screen (cyan: you can use it). */




/** A food court table with two stools. */


/** The security desk: monitors of the cameras, a camera over it. */


const GALLERY=crowd(77,10,-100,2700,{ps:3,dim:.42,h:144,acts:['walk','walk','stand','phone']});
const FAR_CROWD=crowd(79,30,-100,2900,{ps:2,dim:.55,parallax:.55,acts:['walk','walk','walk','stand']});
const actors:Record<string,Character>={deckTech,teen,implantClerk,pawnbroker,florist,keyCutter,kid,diner,securityPerson:security,dancer,pigeon:PIGEON,...Object.fromEntries(COOKS.map((p,i)=>['cook-'+i,p])),...Object.fromEntries(FLOOR.map((p,i)=>['floor-'+i,p])),...Object.fromEntries(RIDERS.map((p,i)=>['rider-'+i,p])),...Object.fromEntries(GALLERY.map((p,i)=>['gallery-'+i,p])),...Object.fromEntries(FAR_CROWD.map((p,i)=>['far-'+i,p]))};
export function mallFrameEnvironment(view:View,_engine:EngineDraw,doc:Composition=mallComposition):Environment{return mallEnvironment(view,actors,doc);}
export function drawMall(ctx:CanvasRenderingContext2D,view:View,_engine:EngineDraw,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawMallComposition(ctx,view,actors,doc,state,options);}
export function drawMallFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawMallForeground(ctx,view,actors,doc,state,options);}

const base: SceneDef = {
  id: 'mall',
  name: 'Mall',
  // facing (light.ts): the dome and the glass front face south
  facing: 180,
  width: L.width,
  spawn: L.spawn,
  intro: ['The mall. Warm, dry and recording everything I look at.'],
  exits: [
    { id: 'metro', x: L.metro, to: 'galleriaStation', at: 'mall', label: '[E] DOWN TO THE METRO', promptH: 82 },
    { id: 'taxi', x: L.roof, to: '', action: 'taxi', label: '[E] ROOF PAD · HAIL TAXI', promptH: 82 },
    { id: 'market', x: L.service, to: 'market', at: 'mall', label: '[E] SERVICE CORRIDOR', promptH: 82 },
  ],
  readables: [
    { id: 'kiosk', x: L.kiosk, name: 'DIRECTORY', promptH: 70, pages: ['GALLERIA · GROUND FLOOR: IMPLANTS · PAWN · DECK REPAIR · FLORIST · KEYS · FOOD COURT.', 'EXITS: METRO (WEST). SKY TAXI (ROOF). SERVICE CORRIDOR (EAST, STAFF ONLY).'] },
    { id: 'fountain', x: L.fountain.x, name: 'FOUNTAIN', promptH: 66, pages: ['COINS ARE COLLECTED NIGHTLY. PROCEEDS: GALLERIA MAINTENANCE FUND.', 'WISHES ARE NOT RECORDED.'] },
    { id: 'escalator', x: L.escSign, name: 'ESCALATOR B', promptH: 76, pages: ['ESCALATOR B · UP ONLY.', 'DOWN SERVICE SUSPENDED PENDING REVIEW. USE STAIRS C.'] },
  ],
  people: [...TALKERS, PIGEON],
  uses: USES,

  drawBackdrop: drawMall,

  drawFront: (x,v)=>drawMallFront(x,v),
};

export function mallScene(document:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}):SceneDef{const doc=validateMallComposition(document),layout=mallLayout(doc);return{...base,width:layout.width,spawn:mallPlacement('spawn',doc).x,people:mallPeople(actors,doc),exits:base.exits.map(e=>({...e,x:mallPlacement('exit-'+e.id,doc).x})),readables:base.readables!.map(r=>({...r,x:mallPlacement('read-'+r.id,doc).x})),uses:base.uses!.map(u=>({...u,x:mallPlacement('use-'+u.id,doc).x})),drawBackdrop:(x,v,e)=>drawMall(x,v,e,doc,state,options),drawFront:(x,v)=>drawMallFront(x,v,doc,state,options),visualEnvironment:(v,e)=>mallFrameEnvironment(v,e,doc)};}
export const mall=mallScene();
