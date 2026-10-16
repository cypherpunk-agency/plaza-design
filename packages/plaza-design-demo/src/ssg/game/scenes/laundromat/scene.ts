import { bindLaundromatActors,drawLaundromatComposition,laundromatComposition,laundromatEnvironment,laundromatGeometry,laundromatLayout,laundromatWidth,type LaundromatRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
/**
 * The laundromat on the canvas: a narrow shop between the market's stalls,
 * open late, lit like an operating theatre, four washers along the wall and
 * a breaker that does not want four.
 *
 * Play band (brightest): the door back out to the market, the Registry's
 * notice, the soap dispenser, the schedule box, the four washers (their drums
 * turn while they wash), the breaker with its conduits running in the wall to
 * every washer (P13's fixed cables, drawn where they are), SUDS on its post, the
 * folding table and FOLD-O, the bench with the people waiting, the lost-sock
 * board. Middle band (dim): the back wall, a row of dead dryers over the
 * washers, the TV, the ceiling and, on tall screens, the flats upstairs. Far
 * band (dimmest): the market through the front window, stalls and people
 * passing in the rain.
 *
 * World units match the street (the player is 42 tall). Where the devices
 * stand for tapping, E and hack vision is laundromat.json (`layout.spot`);
 * this draws them there.
 */

import { type Character } from "../../runtime/characters";

/** The shop: 880 wide, 150 high inside. */
export const LAUNDROMAT_W = laundromatWidth;

/** Where things are (world x; heights above the floor). Devices stand at their `layout.spot` in laundromat.json; these agree. */
export const L = laundromatLayout();

// ---------- people ----------

/** Washer 1's owner: six blue shirts in the drum, wearing the seventh. */
const blue: Character = { id: 'blue', seed: 6101, look: { body: 'slim', garb: 'tee', hair: 'cap', extras: ['phone', 'backpack'], top: '#b8a68a' }, x: 232, act: 'phone', facing: 1, name: 'WAITING', talk: [
  ['Washer 1 is mine. Six shirts. All of them.', 'This is my seventh. It is not a shirt. It is a towel with ambition.'],
  ['Every slot the lights dip, three machines start, the breaker gives up and we all start over.', 'I have watched it eleven times. It is the most reliable thing in my life.'],
  ['If you sort that breaker out, mine are the blue ones. Not that I am asking. I am asking.'],
] };
/** Washer 2's owner: has been visiting her laundry since Tuesday. Knows who left the jacket. */
const gran: Character = { id: 'gran', key: true, seed: 6102, look: { body: 'old', garb: 'coat', hair: 'scarf', extras: ['bag'], top: '#6a2a3e', acc: '#d8b040' }, x: L.gran, h: L.bench.h, act: 'sit', facing: -1, name: 'REGULAR', talk: [
  ['Washer 2 is mine. Since Tuesday.', 'At my age you stop waiting for things to finish. You just visit them.'],
  ['The jacket in 3? A young person brought it in. Paid nine cycles, said nobody searches a wash, and ran.', 'I said nobody searches me either, dear. Nobody listened to that either.'],
  ['SUDS starts the paid one when a machine finishes. That is the whole trouble. Nothing in here finishes.', 'Except me, eventually. Do not look like that, it is a joke. Mostly.'],
] };
/** Washer 4's owner, asleep on the bench in his hi-vis. */
const nightShift: Character = { id: 'sleeper', seed: 6103, look: { body: 'wide', garb: 'hivis', hair: 'short', extras: [] }, x: L.sleeper, h: L.bench.h, act: 'sleep', name: 'NIGHT SHIFT', talk: [
  ['Zzz...', '...if four finishes, wake me. If four does not finish, also do not wake me.'],
  ['...I work nights. I wash days. I sleep in between. Here.', '...nobody verifies a bench...'],
] };
/** FOLD-O, the folding robot: folds the one towel that ever came out, over and over. */
const folder: Character = { id: 'folder', seed: 6104, look: { bot: 'servbot', paint: '#8a8478', v: 0 }, x: L.folder, act: 'vend', facing: 1, name: 'FOLD-O', talk: [
  ['I fold. Forty-one thousand shirts so far. Nobody has ever folded me.', 'I do not mind. I would not fit in a drawer.'],
  ['Nothing has come out of a washer since Tuesday. I have refolded this towel two hundred times.', 'It is the best-folded towel in the district. Possibly the city.'],
  ['Socks I do not fold. Socks I pair. Most days I fail.', 'The board by the window is my failures. I pinned them up. It helps.'],
] };
const cat: Character = { look: 'cat', seed: 7, x: L.cat, h: L.window.h0, act: 'sit', facing: -1 };

/** Everyone who lives here (the engine makes [E] TALK for those with talk, [E] PET for the cat). */
export const PEOPLE: Character[] = [blue, folder, gran, nightShift, cat];

/** People in the market, seen through the front window: small, dim, far. */
const OUTSIDE: Character[] = [
  { seed: 6201, x: 600, act: 'walk', range: 300, ps: 2, dim: 0.5, parallax: 0.35, h: 40, speed: 0.35, look: { extras: ['umbrella'] } },
  { seed: 6202, x: 900, act: 'walk', range: -320, ps: 2, dim: 0.55, parallax: 0.35, h: 40, speed: 0.28 },
  { seed: 6203, x: 760, act: 'haggle', facing: 1, ps: 2, dim: 0.6, parallax: 0.35, h: 40 },
];

/** The front window looks south onto the market (light.ts facing). */
export const LAUNDROMAT_FACING = Number(laundromatGeometry().find(r=>r.instance.id==='window')!.props.facing);

const actors={'outside-1':OUTSIDE[0],'outside-2':OUTSIDE[1],'outside-3':OUTSIDE[2],blue,folder,gran,sleeper:nightShift,cat};
bindLaundromatActors(actors);
export function laundromatPeople(doc:Composition=laundromatComposition){const copy=Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,structuredClone(p)]));bindLaundromatActors(copy,doc);return ['blue','folder','gran','sleeper','cat'].map(id=>copy[id]);}
export function laundromatFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=laundromatComposition):Environment{return laundromatEnvironment(doc,view,engine,actors);}
export function drawLaundromat(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={}){drawLaundromatComposition(ctx,view,engine,actors,doc,state,options);}
