/**
 * The street market: stalls of every kind under the tenements, vendors behind every counter,
 * customers haggling, a kid working the fruit stall, a fortune-telling robot, a queue sorted by
 * credit score. Bands: far = towers through the gaps; middle = tenement facades with their
 * screens, blade signs and light strings, and the back crowd; play = stalls, people, the wet street.
 *
 * The reference scene for the kits (ART-GUIDE §10): people from ../characters.ts, screens and signs
 * from screens.ts, stalls, facades and furniture from build.ts. Everything placed is plain data.
 */

import { crowd, drawCharacters, drawCharacter, type Character } from '../characters';
import { bin, booth, clutter, facade, lamp, stall, stallBox, stool, type FacadeSpec, type StallSpec } from './build';
import { box, DESIGN_TOP, drawTowers, exitDoor, GREEN, notice, O, onScreen, PAPER, RED, rng, sign, towers, wetFloor, type SceneDef, type SceneUse } from './kit';
import { adScreen, bladeSign, brokenScreen, camera, menuBoard, oddsBoard, registryBoard, scoreDisplay, ticker, wantedScreen, YELLOW } from './screens';

/** Layout: positions in world units, heights up from the street. */
const L = {
  width: 2080,
  spawn: 86,
  board: 590,
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

const STALLS: StallSpec[] = [
  { x: 96, w: 128, seed: 11, sign: 'NOODLES', col: O, goods: 'noodles', awning: 'scallop', light: 'lantern', vendor: cook,
    back: (x, v, p) => menuBoard(x, v, { x: p.x + p.w * 0.7, h: p.h0 + 8, w: 54, tall: 40, title: 'MENU', items: [['NOODLES', '2T'], ['OTHER', '1T'], ['BROTH', '1T'], ['TEA', '1T']], phase: 30 }) },
  { x: 290, w: 104, seed: 12, sign: 'SIM CARDS', col: PAPER, goods: 'sims', awning: 'tin', light: 'tube', vendor: simVendor },
  { x: 424, w: 124, seed: 13, sign: 'UMBRELLAS', col: O, goods: 'umbrellas', awning: 'tarp', light: 'bulb', vendor: brolly, note: ['CASH ONLY'] },
  { x: 640, w: 132, seed: 14, sign: 'FRUIT', col: YELLOW, goods: 'fruit', awning: 'stripe', light: 'bulb', vendor: fruitVendor },
  { x: 820, w: 140, seed: 15, sign: 'USED IMPLANTS', col: RED, goods: 'implants', awning: 'stripe', light: 'tube', vendor: implantVendor, damage: 0.35, note: ['NO REFUNDS'] },
  { x: 1000, w: 124, seed: 16, sign: 'FISH', col: PAPER, goods: 'fish', awning: 'scallop', light: 'bulb', vendor: fishmonger },
  { x: 1290, w: 132, seed: 18, sign: 'REPAIRS', col: O, goods: 'tech', awning: 'tin', light: 'tube', vendor: fixer2 },
  { x: 1500, w: 146, seed: 19, sign: 'DUMPLINGS', col: O, goods: 'dumplings', awning: 'stripe', light: 'lantern', vendor: dumplingCook },
  { x: 1750, w: 112, seed: 20, sign: 'FIRMWARE', col: PAPER, goods: 'tech', awning: 'tarp', light: 'none', damage: 0.5, note: ['BACK IN', '5 MIN'] },
  { x: 1878, w: 104, seed: 21, sign: 'CLOSING DOWN', col: RED, goods: 'junk', awning: 'stripe', light: 'bulb', damage: 0.85, note: ['EVERYTHING', 'MUST GO'],
    back: (x, v, p) => brokenScreen(x, v, { x: p.x + p.w / 2, h: p.h0 + 18, w: 46, tall: 28, ghost: 'SALE', seed: 9 }) },
];
const FORTUNE: StallSpec = { x: 1170, w: 76, seed: 17, sign: 'FORTUNES', col: GREEN, goods: 'junk', awning: 'none', vendor: fortuneBot, note: ['1 TOKEN'] };
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
  { look: 'mech', seed: 4304, x: 620, act: 'patrol', range: [620, 940] },
  { look: 'loader', seed: 4305, x: 1150, act: 'carry', range: [1160, 1040] },
  { look: 'litterbot', seed: 4306, x: 1250, act: 'roll', range: [1250, 1130] },
  { look: 'deliverybot', seed: 4307, x: 200, act: 'roll', range: [200, 720] },
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
  { look: 'courier', x: 600, act: 'walk', range: [600, 1260], speed: 0.5 },
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
const BACK = crowd(57, 16, -100, 2100, { ps: 2, dim: 0.5, parallax: 0.9, h: 8 });
/** The near crowd: big and dark, passing along the bottom of the view. */
const NEAR = crowd(59, 4, 0, 2200, { ps: 5, dim: 0.78, parallax: 1.3, h: -58, acts: ['walk'] });

// ---------- the middle band ----------

const FAR = towers(51, 2600, [30, 60], [160, 320], 0.07);
const FRONTS: FacadeSpec[] = (() => { const r = rng(53), list: FacadeSpec[] = []; for (let wx = -60, i = 0; wx < 2500; i++) { const w = 90 + Math.round(r() * 80); list.push({ x: wx, w, seed: 300 + i, parallax: 0.7, alpha: 0.4 }); wx += w + 2 + Math.round(r() * 6); } return list; })();

// ---------- things to do ----------

let haggle = 0, fortunes = 0;
const FORTUNES = [
  ['FORTUNE UNIT 9 SEES... a stranger. You are in a market. That was not hard.'],
  ['FORTUNE UNIT 9 SEES... a friend who is not fishing. A boat that knows where.', 'That will be all. FORTUNE UNIT 9 does not do follow-up questions.'],
  ['FORTUNE UNIT 9 SEES... a door that opens. Do not trust the door.'],
  ['FORTUNE UNIT 9 SEES... your credit score rising.', 'Correction: someone else\'s. FORTUNE UNIT 9 regrets the error.'],
  ['FORTUNE UNIT 9 SEES... rain. FORTUNE UNIT 9 is never wrong about rain.'],
];

const USES: SceneUse[] = [
  { id: 'haggle', x: 486, label: '[E] HAGGLE · UMBRELLA', name: 'UMBRELLA SELLER', promptH: 70, use: (c) => {
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
  { id: 'fortune', x: 1208, label: '[E] FORTUNE · 1 TOKEN', name: 'FORTUNE UNIT 9', promptH: 98, use: (c) => {
    if (!c.pay(1)) return ['FORTUNE UNIT 9 CANNOT SEE YOUR FUTURE.', 'IT CAN SEE YOUR BALANCE. IT IS ZERO.'];
    return FORTUNES[fortunes++ % FORTUNES.length];
  } },
];

export const market: SceneDef = {
  id: 'market',
  name: 'Street Market',
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, rain: true },
  intro: ['The night market. Cash, noise and nobody looking up.'],
  exits: [
    { id: 'mall', x: L.service, to: 'mall', at: 'market', label: '[E] SERVICE DOOR · MALL', promptH: 82 },
    { id: 'downtown', x: L.gate, to: 'downtown', at: 'market', label: '[E] GATE · DOWNTOWN', promptH: 82, requires: 'end' },
  ],
  readables: [
    { id: 'sims', x: 342, name: 'SIM CARDS', promptH: 128, pages: ['PREPAID SIM · ACTIVATION 3 MIN.', 'ALL SIMS ARE REGISTERED AT SALE. REGISTERED TO WHOM IS NOT STATED.'] },
    { id: 'rules', x: L.board, name: 'MARKET RULES', promptH: 84, pages: ['TRADING HOURS 18:00–04:00. ALL TRANSACTIONS ARE LOGGED.', 'NO PHOTOGRAPHY. REGISTRY CAMERAS EXEMPT.'] },
    { id: 'implants', x: 900, name: 'USED IMPLANTS', promptH: 128, pages: ['CERTIFIED PRE-OWNED.', 'ORIGIN OF STOCK NOT DISCLOSED.'] },
  ],
  people: ALL,
  uses: USES,

  drawBackdrop(x, v) {
    const { sx, y, t } = v;
    // far band: towers seen through the gaps, barely there
    const grow = Math.max(0, v.gy - DESIGN_TOP);
    drawTowers(x, v, FAR, 0.25, y(0), 0.08, '#030100', 1, Math.round(grow * 0.8));
    // middle band: the tenement fronts, every one different, up out of the view
    for (const f of FRONTS) facade(x, v, f);
    // what the tenements tell you: a ticker, the WANTED feed, ads, a Registry board, cameras
    ticker(x, v, { x: 330, h: 176, w: 150, tall: 11, parallax: 0.7, col: O });
    wantedScreen(x, v, { x: 700, h: 168, w: 90, tall: 54, parallax: 0.7 });
    adScreen(x, v, { x: 1010, h: 172, w: 92, tall: 40, parallax: 0.7, seed: 4 });
    registryBoard(x, v, { x: 1330, h: 166, w: 150, tall: 52, parallax: 0.7, lines: ['TRADE WITHOUT LICENCE IS AN OFFENCE', 'CASH TRANSACTIONS ARE LOGGED', 'CURFEW 01:00–05:00'], seed: 2 });
    adScreen(x, v, { x: 1660, h: 178, w: 92, tall: 38, parallax: 0.7, seed: 9, phase: 120 });
    camera(x, v, { x: 470, h: 196, parallax: 0.7, facing: 1, phase: 10 });
    camera(x, v, { x: 1190, h: 214, parallax: 0.7, facing: -1, phase: 40 });
    for (const b of L.blades) bladeSign(x, v, { x: b.x, h: b.h, text: b.text, parallax: 0.7, dim: 0.55, phase: b.x });
    // strings of bulbs slung across the street between the tenements
    for (let wx = 0; wx < L.width + 1400; wx += 220) {
      const a = sx(wx, 0.85), b = sx(wx + 220, 0.85);
      if (b < 0 || a > v.viewW) continue;
      x.strokeStyle = 'rgba(40,24,14,1)'; x.beginPath(); x.moveTo(a, y(150)); x.quadraticCurveTo((a + b) / 2, y(112), b, y(150)); x.stroke();
      for (let k = 1; k < 11; k++) {
        const f = k / 11, bx = a + (b - a) * f, by = (1 - f) * (1 - f) * y(150) + 2 * f * (1 - f) * y(112) + f * f * y(150);
        x.fillStyle = (k + Math.floor(t / 50)) % 7 === 0 ? 'rgba(255,217,165,.2)' : k % 2 ? 'rgba(255,190,110,.7)' : 'rgba(255,136,0,.6)';
        x.fillRect(Math.round(bx) - 1, Math.round(by) + 1, 2, 3);
      }
    }
    // the back crowd, small and dim between the stalls
    drawCharacters(x, v, BACK);

    // play band
    wetFloor(x, v);
    exitDoor(x, v, L.service, '#0a0603', '< MALL');
    lamp(x, v, { x: 64, seed: 1 });
    for (const s of STALLS) stall(x, v, s);
    booth(x, v, FORTUNE);
    drawCharacter(x, v, sleeper);
    // the rules board, and the camera watching it
    const nb = sx(L.board);
    if (onScreen(v, nb - 40, 80)) { box(x, nb - 1, y(48), 3, 48, '#2a160a'); notice(x, t, nb, y(78), 56, 30, ['MARKET', 'RULES']); }
    camera(x, v, { x: 566, h: 104, pole: true, facing: 1, phase: 5 });
    stool(x, v, { x: 250, seed: 3 });
    clutter(x, v, { x: 556, seed: 2, n: 2, kinds: ['crate', 'box'] });
    clutter(x, v, { x: 1128, seed: 5, n: 1, kinds: ['barrel'] });
    bin(x, v, { x: 1258, seed: 4 });
    // the betting board on its post, the couple under it arguing about it
    oddsBoard(x, v, { x: 1448, h: 64, w: 76, tall: 52, mount: 'pole', title: 'TONIGHT', rows: ['RAIN 02:00', 'LINE 0 ON TIME', 'CURFEW RAID', 'POWER CUT'] });
    // the queue, sorted by the display over it
    scoreDisplay(x, v, { x: 1744, h: 70, w: 76, tall: 32, mount: 'pole', name: 'QUEUE BY SCORE', score: 712 });
    // the end of the market: a wall with the last lamp
    const ew = sx(L.endWall);
    if (onScreen(v, ew, 140)) {
      box(x, ew, y(130), 140, 130, '#140a06', 'rgba(' + O + ',.6)');
      for (let r = 6; r < 130; r += 8) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(ew + 1, y(130) + r, 138, 1); }
      if (v.flags.end) exitDoor(x, v, L.gate, '#0a0603', 'DOWNTOWN >');
      else sign(x, t, 'NO EXIT', ew + 50, y(70), RED, { size: 8, phase: 200 });
    }
    drawCharacters(x, v, STREET);
  },

  drawFront(x, v) {
    // the near crowd: heads and shoulders passing along the bottom of the view
    for (const p of NEAR) drawCharacter(x, v, p);
  },
};
