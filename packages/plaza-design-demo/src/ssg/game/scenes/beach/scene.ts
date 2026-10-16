import { beachComposition,beachGeometry,beachLayout,beachPlacement,beachWidth,bindBeachActors,drawBeachComposition } from './composition';
import type { SceneModel } from '../../engine/index';
import type { View as DrawView } from '../../art/core/view';
/**
 * The beach on the canvas: a real beach looking east over the sea (the sun rises out of it;
 * the sky and the light are the city clock's: sets/sky.ts, sets/lighting.ts), along the shore from the harbor. Sand
 * down to the waterline, the open sea with waves rolling in, a wide sky, and
 * the city's towers small and far off along the shore. The city is in the
 * details: a rental kiosk that bills by the minute, a Registry drone checking
 * towels, ads on the lifeguard tower, a notice on Moth's boat.
 *
 * Left to right: the stairs up to the promenade (the way back to the harbor),
 * the boardwalk with the Registry's beach notice and the sunbed kiosk, the
 * sunbeds, SALT (a shack on stilts with string lights; the bar under it, LIME
 * the robot bartender, the jukebox, the mixer), a crab, the lifeguard tower
 * and its drone, the volleyball net, the kids' sandcastle, then the pier out
 * over the water: its lamp controller, the old man fishing, a gull on a post,
 * and Moth's boat at the very end.
 *
 * Bands: far = sky, sun, the city on the shore, the sea with its swimmers and
 * surfers (calm, low contrast); middle = the promenade wall and the shoreline;
 * play = the boardwalk, sand, the bar, the tower, the pier, the people.
 *
 * World units match the street (the player is 42 tall). Device spots are
 * beach.json (`layout.spot`); this draws them there.
 */

import { type Character } from "../../runtime/characters";

/** The beach: the promenade, the sand, then the pier out to Moth's boat. */
export const BEACH_W = beachWidth;
/** Where you land coming down the stairs from the harbor (and walking in from its edge). */
export const BEACH_EDGE_X = beachPlacement('edge-exit').x;
export const BEACH_SPAWN = beachPlacement('spawn').x;

/** Where things stand (world x). Devices: beach.json. */
export const L = beachLayout();
/** The horizon and the waterline, as heights above the play line. */
const actorAt=(id:string,height=false)=>{const p=beachPlacement(id);return{x:p.x,...(height?{h:p.h}:{})};};
const motion=(id:string,from:number,to:number):[number,number]=>{const x=beachPlacement(id).x;return[x+from,x+to];};

// ---------- the people (characters.ts) ----------

/** LIME, SALT's robot bartender: drawn as a robot here (not a people-kit person), talks through the kit. */
export const LIME: Character = { id: 'lime', key: true, seed: 7001, ...actorAt('lime-talk',true), name: 'LIME', talk: [
  ["Welcome to SALT. I'm LIME. I pour, I listen, I don't keep logs. Officially.", "You've got the face of someone looking for someone. Everyone at a beach bar has that face. Yours is worse."],
  ['Moth? Third stool, every evening for a month. Water with a slice of me in it. Tipped in jokes.', "I don't run on jokes. I kept them anyway."],
  ["That boat at the end of the pier is Moth's. Three days, nobody aboard. The harbour stuck a notice on it.", "Leave it locked for now. Moth said someone would come. Didn't say when. I assumed someone taller."],
  ["The photo behind the gin? Moth. The night they fixed my jukebox without asking. Said I looked 'nearly human'.", "I'm still deciding if that was a compliment. I've been deciding for a year."],
  ['My opinion of Moth: talks too fast, eats too little, rewires things that are not theirs. Ten out of ten. Would serve again.', 'Drinks are two tokens. The jukebox is free. The jukebox and the mixer get along too well, if you ask me. Nobody asks me.'],
] };

const lifeguard: Character = { id: 'guard', seed: 7002, look: { body: 'avg', hair: 'cap', garb: 'tee', extras: ['glasses'], top: '#a83a2a', acc: '#c83a2a' }, ...actorAt('guard',true), act: 'sit', facing: 1, name: 'LIFEGUARD', talk: [
  ["I'm paid to watch the water. The drone is paid to watch me. Nobody's paid to watch the drone.", 'If the flag goes red, everyone is out. The drone decides. Last week it decided a jellyfish was a shark. Then a cloud.'],
  ['The drone says danger, I blow the whistle. Thirty years of training. I blow the whistle.'],
] };

const sunbather: Character = { id: 'sunbather', seed: 7003, look: { body: 'wide', hair: 'short', garb: 'tee', extras: ['glasses'], top: '#d86a2a' }, ...actorAt('sunbather',true), act: 'sleep', name: 'SUNBATHER', talk: [
  ['I rented this sunbed for ten minutes. That was three hours ago.', "I'm not getting up. If I get up, I have to look at the bill."],
  ['Still here. Still not looking.'],
] };

const volley: Character = { id: 'volley', seed: 7004, look: { body: 'slim', hair: 'bun', garb: 'tee', extras: [], top: '#d8b040' }, ...actorAt('volley'), act: 'dance', facing: 1, name: 'VOLLEYBALL', talk: [
  ['We need a fourth. You any good? No? Perfect. Neither are we.', "The net's municipal. We pay by the point. We stopped keeping score."],
] };

const kid: Character = { id: 'kid', seed: 7005, look: { body: 'kid', hair: 'cap', garb: 'tee', extras: [], top: '#3a6ad8', acc: '#d8b040' }, ...actorAt('kid'), act: 'sit', facing: -1, name: 'KID', talk: [
  ["It's a Registry office. That's the queue. Those are the people in the queue.", 'When the tide comes in, it gets deleted. That is how it works, my mum said.'],
  ['You can be in the queue if you want. You have to wait, though. That is the rule.'],
] };

const surfer: Character = { id: 'surfer', seed: 7006, look: { body: 'tall', hair: 'long', garb: 'tee', extras: [], hairCol: '#c8b040', top: '#2e4a5e' }, ...actorAt('surfer'), act: 'stand', facing: -1, name: 'SURFER', talk: [
  ["Waves are good today. Waves are free. Don't tell anyone, they'll put a meter on them."],
  ["See the buoy? Edge of the swim zone. Past it the Registry stops counting you. Feels great. Briefly."],
] };

const fisher: Character = { id: 'fisher', seed: 7007, look: { body: 'old', hair: 'brim', garb: 'coat', extras: [], top: '#4e5e3a' }, ...actorAt('fisher',true), act: 'sit', facing: 1, name: 'OLD MAN', talk: [
  ["Fifty years I've fished off this pier. Caught a fish twice. Same fish.", "That boat at the end? Kid with a hood and a laptop. Said 'gone fishing'. Never saw a rod come out. Good. Fish deserve a break."],
  ['Three days ago they tied it up and walked off along the shore. Did not look back. Looked at the water a lot.'],
] };

/** Who lives on the beach. The ones with `talk` get [E] TALK; the cat gets [E] PET (the game, as in a scene). */
export const PEOPLE: Character[] = [
  LIME, lifeguard, sunbather, volley, kid, surfer, fisher,
  { look: 'cat', seed: 2, ...actorAt('cat'), act: 'sit' },
];

/** Ambient people, drawn but not talkable. */
const SUNBEDS: Character[] = [
  { seed: 7101, look: { body: 'slim', hair: 'long', garb: 'dress', extras: ['glasses'], top: '#c83a8a' }, ...actorAt('sunbed-person-0',true), act: 'sleep' },
  { seed: 7102, look: { body: 'avg', hair: 'brim', garb: 'tee', extras: ['phone'], top: '#e8e0d0' }, ...actorAt('sunbed-person-1',true), act: 'sit', facing: 1 },
];
const BEACHGOERS: Character[] = [
  { seed: 7110, look: { body: 'avg', hair: 'short', garb: 'tee', extras: [], top: '#7ab83a' }, ...actorAt('beachgoer-0'), act: 'dance', facing: -1 },
  { seed: 7111, look: { body: 'tall', hair: 'mohawk', garb: 'tee', extras: [], top: '#c83a2a' }, ...actorAt('beachgoer-1'), act: 'dance', facing: -1 },
  { seed: 7112, look: { body: 'short', hair: 'beanie', garb: 'tee', extras: [], top: '#46506e' }, ...actorAt('beachgoer-2'), act: 'dance', facing: 1 },
  { seed: 7113, look: { body: 'kid', hair: 'long', garb: 'tee', extras: [], top: '#e85a6a' }, ...actorAt('beachgoer-3'), act: 'sit', facing: 1 },
  { seed: 7114, look: { body: 'old', hair: 'bald', garb: 'tee', extras: ['cane'], top: '#b8a68a' }, ...actorAt('beachgoer-4'), act: 'walk', range: motion('beachgoer-4',0,400), speed: 0.18 },
  { seed: 7115, look: { body: 'avg', hair: 'bun', garb: 'jacket', extras: ['bag'] }, ...actorAt('beachgoer-5'), act: 'walk', range: motion('beachgoer-5',-40,440), speed: 0.26 },
  { look: 'drone', ...actorAt('beachgoer-6',true), act: 'scan', range: motion('beachgoer-6',-8,140), speed: 0.2 },
];
/** Swimmers out in the sea (far band): heads in the water, or on the shore when the flag is red. */
const SWIM = beachGeometry().filter(r=>r.instance.type==='beach.swimmer').map(r=>({x:r.placement.x,d:Number(r.props.depth)}));
const ASHORE: Character[] = SWIM.map((_s, i) => ({ seed: 7200 + i, look: { garb: 'tee' as const, extras: [] }, ...actorAt('ashore-'+i,true), act: i % 3 ? 'stand' as const : 'phone' as const, ps: 2, dim: 0.25, facing: (i % 2 ? 1 : -1) as 1 | -1 }));

// ---------- things to do with E that are not devices (index.ts `uses`) ----------

/** When the gull on the post was last shooed (game frames), so it can fly off and come back. */
export const GULL = { shooed: -1e9, n: 0 };
export const CRAB = { n: 0 };

/** Same actor objects retain the runtime appearance-cache identities. */
export const BEACH_ACTORS:Record<string,Character>={ 'lime-talk':LIME,guard:lifeguard,sunbather,volley,kid,surfer,fisher,cat:PEOPLE[PEOPLE.length-1],...Object.fromEntries(SUNBEDS.map((a,i)=>['sunbed-person-'+i,a])),...Object.fromEntries(BEACHGOERS.map((a,i)=>['beachgoer-'+i,a])),...Object.fromEntries(ASHORE.map((a,i)=>['ashore-'+i,a])) };
bindBeachActors(BEACH_ACTORS);
export function drawBeach(x:CanvasRenderingContext2D,m:SceneModel,d:DrawView,hover:string|null){drawBeachComposition(x,d,m,hover,BEACH_ACTORS,GULL,beachComposition);}
