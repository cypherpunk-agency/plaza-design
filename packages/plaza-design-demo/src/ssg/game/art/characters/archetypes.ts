/**
 * NAMED LOOKS: curated people of the city (Tommi, 2026-10-20). Each archetype fixes the parts that
 * make it recognisable (an elder's brim hat and cane, a punk's mohawk and patched jacket, an
 * inspector's peaked cap and armband) and lets the seed vary build, colours and minor parts within
 * the ranges given here. A person uses one with `look: { archetype: 'elder' }`; parts the scene
 * fixes still win. Crowd mixes (crowds.ts) are weighted lists of these.
 *
 * The LINE 0 rider kinds (riders.ts) are archetypes too: commuter (phone), reader (paper), office
 * (suit), courier, elder, punk, inspector and sleeper keep the silhouettes of the old hand-drawn
 * riders (before 2026-10-20): the phone's light on the face, a paper up in front of the face, a dark
 * suit with a briefcase, an orange courier with a parcel on the shoulder, an old woman in a red coat
 * with a green scarf and a shopping bag, a magenta mohawk over a black jacket with red and yellow
 * patches, a grey uniform with a visor and red armband, a sleeper with the head down in a scarf.
 */
import type { Act, Body, Extra, Garb, Hair } from '../../runtime/characters';
import type { FACIAL_KINDS } from './parts';
import { HAIR_DYED, HAIR_GREY, HAIR_NATURAL } from './people-style';

export type Facial = typeof FACIAL_KINDS[number];
export type Age = 'kid' | 'teen' | 'adult' | 'elder';

export interface Archetype {
  label: string;
  /** One line on who they are. */
  note: string;
  age: Age;
  /** Allowed builds, hair or headwear and clothes: the seed picks one of each. */
  body: Body[]; hair: Hair[]; garb: Garb[];
  /** Always carried or worn. */
  extras?: Extra[];
  /** Everyday things the seed may add (one, sometimes). */
  maybe?: Extra[];
  /** Tech a kitted one shows (one or two). Empty: they never show tech. */
  tech?: Extra[];
  /** Chance (0–1) a person of this kind is kitted when the scene or crowd does not say. Default 0.35. */
  kitted?: number;
  facial?: Facial[];
  /** Pinned colours (the seed picks from these instead of the district palette). `vest`: hi-vis colour; `light`: the tech light (visor, LED, earpiece). */
  colours?: { top?: string[]; bottom?: string[]; acc?: string[]; hair?: string[]; vest?: string[]; tie?: string[]; light?: string[] };
  /** What they are usually doing (lineups, crowds). */
  act: Act;
}

const NATURAL_AND_GREY = [...HAIR_NATURAL, ...HAIR_NATURAL, HAIR_GREY[0]];

const TABLE = {
  commuter: { label: 'Commuter (phone)', note: 'Looking down at a phone, its light on the face.', age: 'adult',
    body: ['avg', 'tall', 'short', 'slim', 'heavy'], hair: ['short', 'long', 'bun', 'ponytail', 'buzz', 'afro'], garb: ['jacket', 'coat', 'shell'],
    extras: ['phone'], maybe: ['bag', 'backpack', 'umbrella', 'muffler'], tech: ['earpiece', 'arglasses', 'wristscreen'], facial: ['none', 'none', 'stubble'], act: 'phone' },
  reader: { label: 'Reader (paper)', note: 'A paper held up in front of the face; grey at the temples.', age: 'adult',
    body: ['avg', 'wide', 'old', 'heavy'], hair: ['short', 'bald', 'bun', 'buzz'], garb: ['coat', 'jacket'], extras: ['glasses'], maybe: ['bag', 'muffler'], tech: ['earpiece'], kitted: 0.1,
    facial: ['none', 'moustache', 'beard'], colours: { hair: [...HAIR_GREY.slice(0, 2), HAIR_NATURAL[2], HAIR_NATURAL[0]] }, act: 'read' },
  office: { label: 'Office worker', note: 'A suit and a briefcase.', age: 'adult',
    body: ['avg', 'tall', 'slim', 'heavy'], hair: ['short', 'bun', 'long', 'buzz', 'ponytail'], garb: ['suit'], extras: ['briefcase'], maybe: ['umbrella', 'glasses'],
    tech: ['earpiece', 'arglasses', 'wristscreen'], facial: ['none', 'none', 'stubble', 'moustache'],
    colours: { top: ['#26262e', '#2e3440', '#3a3438', '#4a4e58', '#3a3a30'], tie: ['#a82020', '#2e4a7a', '#6a2a3e', '#b08a3a'] }, act: 'stand' },
  courier: { label: 'Courier', note: 'Cap or helmet, a parcel on the shoulder, hi-vis or a rain shell.', age: 'adult',
    body: ['avg', 'slim', 'tall'], hair: ['cap', 'helmet'], garb: ['shell', 'hivis', 'jacket'], extras: ['parcel'], tech: ['earpiece', 'wristscreen', 'visor'], kitted: 0.55,
    colours: { top: ['#8a4a10', '#a8642a', '#c8641e', '#5a6a3a', '#3a4658'], acc: ['#8a4a10', '#c8641e', '#2a2a30', '#d8b040'], vest: ['#c9a227', '#d8702a'] }, act: 'walk' },
  elder: { label: 'Elder', note: 'Brim hat or headscarf, a coat, a cane or a shopping bag.', age: 'elder',
    body: ['old', 'frail'], hair: ['brim', 'scarf', 'beanie', 'bald'], garb: ['coat'], maybe: ['cane', 'cane', 'bag', 'glasses', 'umbrella', 'muffler'], tech: [], kitted: 0,
    facial: ['none', 'moustache', 'beard'], colours: { top: ['#7a2a2a', '#6a4a3a', '#5a5a3e', '#6a5a50', '#4e5662', '#8a7a5a'], acc: ['#3a5a3a', '#6a4a3a', '#8a3a2a', '#2a2a30'], hair: HAIR_GREY }, act: 'stand' },
  punk: { label: 'Punk', note: 'A dyed mohawk over a black jacket covered in patches.', age: 'adult',
    body: ['avg', 'slim', 'teen'], hair: ['mohawk'], garb: ['jacket'], extras: ['patches'], maybe: ['headphones', 'backpack'], tech: ['cyberarm', 'ledtrim', 'earpiece'], kitted: 0.4,
    facial: ['none', 'stubble'], colours: { top: ['#222428', '#2e2a30', '#3a2626', '#2a2e26', '#34303a'], bottom: ['#4a4f3a', '#2e2e34', '#5a2a2a', '#3a3a44', '#46403a'], hair: HAIR_DYED }, act: 'stand' },
  inspector: { label: 'Registry inspector', note: 'Grey uniform, peaked cap, visor and a red armband.', age: 'adult',
    body: ['tall', 'avg', 'broad'], hair: ['peaked'], garb: ['uniform'], extras: ['visor', 'armband'], tech: ['earpiece', 'wristscreen'], kitted: 1, facial: ['none', 'none', 'moustache'],
    colours: { top: ['#9aa2ac', '#8a929c'], bottom: ['#222428'], acc: ['#5a6470', '#6a7480'], light: ['#ff4a2a'] }, act: 'stand' },
  sleeper: { label: 'Sleeper', note: 'Asleep on their feet or in a seat, head down into a scarf.', age: 'adult',
    body: ['avg', 'wide', 'heavy', 'old'], hair: ['hood', 'beanie', 'scarf', 'short'], garb: ['coat', 'jacket'], extras: ['muffler'], maybe: ['bag'], tech: ['headphones'], kitted: 0.2,
    facial: ['none', 'stubble', 'beard'], colours: { top: ['#4a4f3a', '#5a5048', '#3a4658', '#6a5a48'], acc: ['#3a5a3a', '#6a3a30', '#5a5a5e'] }, act: 'doze' },
  dockworker: { label: 'Dock worker', note: 'Hi-vis and a beanie or hard hat; built for lifting.', age: 'adult',
    body: ['broad', 'wide', 'avg', 'heavy'], hair: ['beanie', 'hardhat', 'cap'], garb: ['hivis'], maybe: ['backpack'], tech: ['exobrace', 'cyberarm', 'earpiece'], kitted: 0.45,
    facial: ['none', 'stubble', 'beard', 'moustache'], colours: { vest: ['#c9a227', '#d8702a', '#c9a227'], acc: ['#c8641e', '#2e3a4a', '#8a2a2a', '#d8b040'] }, act: 'walk' },
  vendor: { label: 'Street vendor', note: 'An apron over everyday clothes, at a stall or a cart.', age: 'adult',
    body: ['wide', 'heavy', 'avg', 'short'], hair: ['cap', 'headwrap', 'bun', 'bald', 'short'], garb: ['apron'], tech: ['wristscreen', 'headphones', 'earpiece'],
    facial: ['none', 'moustache', 'beard', 'stubble'], act: 'vend' },
  student: { label: 'Student', note: 'Hoodie, backpack, headphones.', age: 'teen',
    body: ['teen', 'slim', 'avg'], hair: ['short', 'long', 'ponytail', 'afro', 'hood', 'buzz'], garb: ['hoodie'], extras: ['backpack', 'headphones'], tech: ['arglasses', 'phone', 'ledtrim'], kitted: 0.5, act: 'walk' },
  plazastaff: { label: 'Plaza staff', note: 'Black and gold, an earpiece, never in a hurry.', age: 'adult',
    body: ['tall', 'avg', 'slim'], hair: ['short', 'bun', 'buzz', 'ponytail'], garb: ['suit'], extras: ['earpiece'], tech: ['arglasses'], kitted: 1,
    colours: { top: ['#1a1a1e', '#1e1c1a'], bottom: ['#1a1a1e'], acc: ['#c8a040'], tie: ['#c8a040'], light: ['#ffd23a'] }, act: 'stand' },
  ghost: { label: 'Ghost', note: 'A patched coat and a hood; no tech on show, on purpose.', age: 'adult',
    body: ['avg', 'slim', 'short', 'frail'], hair: ['hood'], garb: ['patched'], maybe: ['muffler', 'backpack', 'bag', 'mask'], tech: [], kitted: 0,
    facial: ['none', 'stubble', 'beard'], colours: { top: ['#5a5048', '#4a4a44', '#5e5040', '#46423e', '#6a5e50'], acc: ['#7a6a5a', '#5a3a2a', '#8a4a22', '#6a6a5a'] }, act: 'stand' },
  church: { label: 'Church of the Algorithm', note: 'A white robe, a gold sash, a calm face.', age: 'adult',
    body: ['avg', 'tall', 'slim', 'old'], hair: ['bald', 'short', 'bun', 'long', 'buzz'], garb: ['robe'], tech: ['arglasses', 'earpiece'], kitted: 0.3,
    colours: { top: ['#e4ded2', '#dcd6c8'], bottom: ['#c8c0b0'], acc: ['#c8a040', '#b08a3a'] }, act: 'stand' },
  tide: { label: 'Tide', note: 'An oilskin coat and a knit cap; the sea in the face.', age: 'adult',
    body: ['broad', 'wide', 'avg', 'old'], hair: ['beanie'], garb: ['oilskin'], maybe: ['muffler', 'backpack'], tech: ['cyberarm', 'respirator'], kitted: 0.25,
    facial: ['beard', 'beard', 'moustache', 'stubble', 'none'], colours: { top: ['#b8962a', '#5a6a3a', '#2e3a4a', '#a8742a'], acc: ['#8a2a2a', '#2e3a4a', '#5a5048', '#c8641e'] }, act: 'stand' },
  kid: { label: 'Kid', note: 'Small, fast, curious.', age: 'kid',
    body: ['kid'], hair: ['short', 'cap', 'long', 'bun', 'ponytail', 'afro'], garb: ['tee', 'hoodie', 'jacket'], maybe: ['backpack'], tech: [], kitted: 0, act: 'stand' },
  teen: { label: 'Teen', note: 'Hands in pockets, eyes on a screen.', age: 'teen',
    body: ['teen'], hair: ['short', 'long', 'mohawk', 'hood', 'afro', 'ponytail', 'buzz'], garb: ['hoodie', 'tee', 'jacket'], maybe: ['headphones', 'backpack'], tech: ['phone', 'ledtrim', 'arglasses'], kitted: 0.5,
    colours: { hair: [...HAIR_NATURAL, HAIR_DYED[0], HAIR_DYED[1]] }, act: 'stand' },
  shopper: { label: 'Galleria shopper', note: 'Good clothes, a bag with a name on it; tech you cannot see.', age: 'adult',
    body: ['slim', 'avg', 'tall'], hair: ['long', 'bun', 'short', 'ponytail'], garb: ['dress', 'coat', 'suit'], extras: ['bag'], maybe: ['glasses', 'umbrella'], tech: ['earpiece'], kitted: 0.15, act: 'walk' },
  technician: { label: 'Fringe technician', note: 'A respirator, a helmet, a visor over the eyes.', age: 'adult',
    body: ['avg', 'broad', 'slim'], hair: ['helmet', 'hardhat', 'cap'], garb: ['hivis', 'uniform'], extras: ['respirator'], tech: ['visor', 'exobrace', 'wristscreen'], kitted: 0.7,
    colours: { top: ['#6a6a60', '#c8641e', '#5a6040'], vest: ['#d8702a', '#c9a227'], acc: ['#d8b030', '#c8641e', '#6a6a60'] }, act: 'walk' },
  guard: { label: 'Skyport guard', note: 'Navy uniform, helmet or cap, a radio in the ear.', age: 'adult',
    body: ['tall', 'broad', 'avg'], hair: ['helmet', 'peaked', 'cap'], garb: ['uniform'], extras: ['earpiece'], tech: ['visor', 'wristscreen'], kitted: 1,
    colours: { top: ['#2e3a4e', '#3a4040', '#4a5262'], bottom: ['#1e2430'], acc: ['#2e3a4e', '#1e2430', '#a82a2a'], light: ['#ff4a2a', '#ffd23a'] }, act: 'stand' },
  fixer: { label: 'Market fixer', note: 'Second-hand implants and a deal for you.', age: 'adult',
    body: ['avg', 'slim', 'short'], hair: ['mohawk', 'short', 'bun', 'buzz', 'headwrap'], garb: ['jacket', 'tee'], tech: ['cyberarm', 'arglasses', 'wristscreen', 'ledtrim', 'earpiece'], kitted: 0.9,
    facial: ['none', 'stubble', 'moustache'], colours: { hair: [...HAIR_NATURAL, ...HAIR_DYED] }, act: 'haggle' },
  drifter: { label: 'Undercity drifter', note: 'Everything they own on them, salvaged tech worn openly.', age: 'adult',
    body: ['avg', 'slim', 'old', 'frail'], hair: ['hood', 'beanie', 'long', 'scarf'], garb: ['coat', 'patched'], maybe: ['backpack', 'bag', 'muffler'], tech: ['respirator', 'cyberarm', 'visor'], kitted: 0.35,
    facial: ['beard', 'stubble', 'none'], colours: { hair: NATURAL_AND_GREY }, act: 'lean' },
  // staff (2026-10-22): the diner, the shops and the counters
  cook: { label: 'Cook', note: 'Kitchen whites or an apron, a white cap or a hairnet, a towel over the shoulder.', age: 'adult',
    body: ['wide', 'heavy', 'avg', 'broad', 'tall'], hair: ['chefcap', 'chefcap', 'hairnet'], garb: ['whites', 'whites', 'apron'], extras: ['towel'], tech: ['earpiece', 'wristscreen'], kitted: 0.25,
    facial: ['none', 'stubble', 'moustache', 'beard'], colours: { top: ['#e8e4d8', '#d8d4c8'], bottom: ['#2a2a30', '#3a3a40', '#4a463e'], acc: ['#e8e4d8'] }, act: 'vend' },
  waitress: { label: 'Waitress / waiter', note: 'A diner uniform with a white collar, an apron and a notepad.', age: 'adult',
    body: ['slim', 'avg', 'short', 'tall'], hair: ['ponytail', 'bun', 'short', 'long', 'buzz'], garb: ['diner'], extras: ['notepad'], maybe: ['badge', 'badge', 'glasses'], tech: ['earpiece', 'wristscreen'], kitted: 0.25,
    facial: ['none', 'none', 'none', 'moustache'], colours: { top: ['#b84a5a', '#8a3a4a', '#c8a040', '#5a7a4a'], bottom: ['#2a2a30', '#3a3438', '#4a3a3a'], acc: ['#ece4d6'] }, act: 'stand' },
  security: { label: 'Shop security', note: 'Private security: a dark polo with SECURITY across the back, or hi-vis; a radio on the chest.', age: 'adult',
    body: ['broad', 'tall', 'heavy', 'avg'], hair: ['buzz', 'short', 'cap', 'bald'], garb: ['polo', 'polo', 'hivis'], extras: ['radio'], tech: ['earpiece'], kitted: 0.4,
    facial: ['none', 'stubble', 'moustache', 'beard'], colours: { top: ['#1e2024', '#22262c', '#2a2a2e'], bottom: ['#1a1a1e', '#2a2a30'], acc: ['#1e2024', '#2a2a30'], vest: ['#c9a227', '#d8b030'], light: ['#ffd23a'] }, act: 'stand' },
  cashier: { label: 'Cashier', note: 'A store tabard over a shirt and a name badge.', age: 'adult',
    body: ['avg', 'slim', 'short', 'teen', 'heavy'], hair: ['ponytail', 'short', 'bun', 'buzz', 'long'], garb: ['tabard'], extras: ['badge'], maybe: ['glasses'], tech: ['earpiece', 'wristscreen'], kitted: 0.3,
    facial: ['none', 'none', 'stubble'], colours: { top: ['#2e6a3a', '#b8462a', '#3a4a7a', '#c88a2a'], bottom: ['#2a2a30', '#3a3a40', '#4a4438'], acc: ['#d8d0c0', '#2a2a30', '#e8e0d0'] }, act: 'stand' },
  clerk: { label: 'Clerk', note: 'An office shirt and an ID card on a lanyard; behind a Registry counter or a desk.', age: 'adult',
    body: ['avg', 'slim', 'old', 'heavy', 'short'], hair: ['short', 'bun', 'bald', 'ponytail', 'buzz'], garb: ['shirt'], extras: ['lanyard'], maybe: ['glasses', 'glasses'], tech: ['earpiece', 'arglasses'], kitted: 0.3,
    facial: ['none', 'none', 'moustache', 'stubble'], colours: { top: ['#d8d4c8', '#b8c0c8', '#c8c0a8', '#a8b0a0'], bottom: ['#2a2a30', '#3a3a40', '#4a4438'], acc: ['#a82020', '#2e4a7a', '#5a6470'] }, act: 'stand' },
} satisfies Record<string, Archetype>;

export type ArchetypeId = keyof typeof TABLE;
export const ARCHETYPES: Record<ArchetypeId, Archetype> = TABLE;
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];
export const archetypeOf = (id: string | undefined): Archetype | undefined => id && id in ARCHETYPES ? ARCHETYPES[id as ArchetypeId] : undefined;

/**
 * Who a seeded person with no named look and no fixed parts is, city-wide: everyday people only
 * (no uniforms, cults or Ghosts; scenes and crowd mixes place those on purpose).
 */
export const EVERYDAY: Partial<Record<ArchetypeId, number>> = {
  commuter: 3, office: 2, courier: 1, elder: 1.5, student: 1, vendor: 0.5, dockworker: 0.5, kid: 0.6, teen: 1, shopper: 1, punk: 0.5, reader: 1, fixer: 0.5, drifter: 0.5,
};
