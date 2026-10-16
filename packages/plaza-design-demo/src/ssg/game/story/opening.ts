/**
 * The opening (ROADMAP.md, "The opening: intro and tutorial"): the night you are deleted, told
 * by showing. The city works for you once, then stops. No new scenes: the train, Downtown's
 * platform, Downtown and Capsule 7B each take a STATE from the save's flags (ART-GUIDE §12), and
 * this file is what changes per state: lines, goals, what works, what hacking may do. game.ts
 * reads it; scenes read `openingState` for what they draw (the train's ads, the dawn).
 *
 * THE FLAGS (save.flags), in the order the story sets them:
 *
 * | flag              | set when                                          | by            |
 * | ----------------- | ------------------------------------------------- | ------------- |
 * | `opening:home`    | a new game starts (after the glide): the train home | the glide / NEW GAME |
 * | `opening:street`  | you pass the turnstile at Downtown station        | game.ts       |
 * | `opening:flat`    | CONCIERGE lets you into Capsule 7B                | game.ts       |
 * | `opening:slept`   | you sleep: the flat is reset, the morning starts  | game.ts       |
 * | `opening:uplink`  | Moth's message hands you uplink.so: hacking opens | game.ts       |
 * | `opening:jacked`  | you jack in to HOME-PC: Capsule 7B's own goals take over | game.ts |
 *
 * THE STATES (`openingState`):
 *
 * | state      | flags                         | what it is                                         |
 * | ---------- | ----------------------------- | -------------------------------------------------- |
 * | `home`     | home, not flat                | the train, the turnstile, Downtown BEFORE          |
 * | `flat`     | flat, not slept               | Capsule 7B at dawn (Downtown still BEFORE)         |
 * | `deleted`  | slept, not uplink             | the same flat, cold; everyday actions fail         |
 * | `uplinked` | uplink, not jacked            | hacking open; the goal is "jack in to your PC"     |
 * | `free`     | none of them, or jacked       | the game as before the opening (old saves too)     |
 *
 * Hacking (HACK/BOARD, H and B, the popup's pink row, jacking in, the deck's machine commands)
 * is locked in `home`, `flat` and `deleted`. Sudo keeps everything unlocked, except that the
 * opening locks it while it is played (NEW GAME, or LEVELS → OPENING), so it can be tested.
 *
 * Pure data and small helpers: no DOM, no imports that run (the scenes import it).
 */

import type { Line } from "../engine/index";
import { SHIFT_PROTOTYPE, SUDO } from "../runtime/mode";

export const OPENING = {
  home: 'opening:home',
  street: 'opening:street',
  flat: 'opening:flat',
  slept: 'opening:slept',
  uplink: 'opening:uplink',
  jacked: 'opening:jacked',
} as const;

export type OpeningState = 'home' | 'flat' | 'deleted' | 'uplinked' | 'free';
type Flags = Readonly<Record<string, boolean>>;

/** Where the story is, from the save's flags. */
export function openingState(f: Flags): OpeningState {
  if (!f[OPENING.home] || f[OPENING.jacked]) return 'free';
  if (f[OPENING.uplink]) return 'uplinked';
  if (f[OPENING.slept]) return 'deleted';
  if (f[OPENING.flat]) return 'flat';
  return 'home';
}

/** Hacking is locked until Moth's uplink.so; in sudo it never is (Tommi, 2026-10-15). */
export const hackLocked = (f: Flags) => { if (SHIFT_PROTOTYPE) return true; if (SUDO) return false; const s = openingState(f); return s === 'home' || s === 'flat' || s === 'deleted'; };
/** Downtown (and the train, the platform) BEFORE you are deleted: the city still works for you. */
export const isBefore = (f: Flags) => { const s = openingState(f); return s === 'home' || s === 'flat'; };
/** Every opening flag, to start the opening over (sudo's LEVELS). */
export const OPENING_FLAGS: string[] = Object.values(OPENING);

/** A save in the middle of the opening goes back to where it was (CONTINUE, a reload); null: not in the opening. */
export function openingResume(f: Flags): 'train' | 'downtown' | 'capsule' | null {
  const s = openingState(f);
  if (s === 'home') return f[OPENING.street] ? 'downtown' : 'train';
  if (s === 'flat' || s === 'deleted' || s === 'uplinked') return 'capsule';
  return null;
}

/** Sudo's LEVELS: play the opening from the train, or from the morning. */
export const OPENING_LEVELS = [
  { id: 'opening', name: 'OPENING · TRAIN HOME', flags: [OPENING.home] },
  { id: 'opening-morning', name: 'OPENING · MORNING, DELETED', flags: [OPENING.home, OPENING.street, OPENING.flat, OPENING.slept] },
];
export const openingLevel = (id: string) => OPENING_LEVELS.find((l) => l.id === id);

// ---------- what a state changes, per scene ----------

type PerScene<T> = Partial<Record<OpeningState, Record<string, T>>>;

/** The clock in the HUD's title: dawn, then the morning after. */
export const OPENING_TIME: PerScene<string> = {
  home: { train: '05:41', metro: '05:48', downtown: '05:52' },
  flat: { capsule: '06:04', downtown: '06:04' },
  deleted: { capsule: '09:40' },
  uplinked: { capsule: '09:42' },
};

/** The GOAL line while the opening runs (a scene's own goals come back after it). */
export const OPENING_GOAL: PerScene<string> = {
  home: { train: 'get off at DOWNTOWN', metro: 'go home', downtown: 'go home (7B)' },
  flat: { capsule: 'get some sleep', downtown: 'go home (7B)' },
  deleted: { capsule: 'get out' },
  uplinked: { capsule: 'jack in to your PC' },
};

/**
 * What the player says arriving (once per state and scene: flag `opening:said:<state>:<scene>`).
 * `consume`: also mark the scene's own first-visit intro as said (`scene:<id>`), so it never
 * plays later with the wrong words (Capsule 7B's "rent pending").
 */
export const OPENING_INTRO: PerScene<{ lines: (touch: boolean) => string[]; consume?: boolean }> = {
  home: {
    train: { lines: (touch) => ['End of shift. Fourteen parcels, zero complaints, one sore back.', 'Downtown is next. Then bed.', touch ? 'The arrows at the bottom walk. Tap someone to talk.' : '← → walk. E talks to people.'] },
    metro: { lines: () => ['Downtown. The exit is at the far end, by the stairs.'] },
    downtown: { lines: () => ['Ten to six. The street is still warm from the night.', 'Home is the capsule tower, past the metro stairs.'], consume: true },
  },
  flat: {
    capsule: { lines: (touch) => ['Home. Four walls, one window, one cat.', 'Kettle, blinds, bed. In that order, if I am lucky.', touch ? 'Tap a thing to use it.' : 'E or a tap on a thing: use it.'], consume: true },
  },
};

/** Who says something else in this state: a scene's readables and talkers (`id`), Downtown's street people and the fixer. */
export const OPENING_LINES: PerScene<{ name?: string; pages: string[] }> = {
  home: {
    // the train: the regulars, at dawn (funny people, dry world)
    'train/suit': { pages: ['Morning shift?', 'Me too. Mine started yesterday. The meeting keeps getting moved to the next stop.'] },
    'train/courier': { pages: ['Night shift? You have the look. Like a receipt somebody kept.', 'Me, I am on my ninth loop with a parcel for "whoever is at the Harbor". Still no whoever.'] },
    'train/elder': { pages: ['Downtown next, dear. Then Galleria. Then Downtown.', 'I have ridden this line since it was a straight line.', 'Get some sleep. You look registered, but tired.'] },
    'train/punk': { pages: ['They retired a thousand records overnight. It was on the screen.', 'Retired. Like they get a watch and a cake.'] },
    'train/ad': { name: 'LINE 0 NEWS', pages: ['REGISTRY AUDIT: 1,204 RECORDS RETIRED OVERNIGHT.', 'NO ACTION NEEDED.'] },
    'train/staff': { name: 'STAFF DOOR', pages: ['STAFF ONLY. LOCKED.', 'NO PASSENGER ACCESS.'] },
    // Downtown's platform
    'metro/regular': { name: 'MAN WITH A PAPER', pages: ["Morning paper. The Registry retired 1,204 records overnight.", 'Retired. Lucky records. I have been asking for that for years.'] },
    'metro/screen': { name: 'REGISTRY SCREEN', pages: ['REGISTRY AUDIT COMPLETE.', 'ALL REMAINING RECORDS ARE CURRENT. NO ACTION NEEDED.'] },
    // Downtown, before: the street knows you
    'downtown/umbrella': { name: 'UMBRELLA', pages: ["Rain's late today. Like everybody."] },
    'downtown/hood': { name: 'HOODED STRANGER', pages: ['Night shift?', 'You walk like one. Get indoors before the day shift sees you.'] },
    'downtown/hat': { name: 'MAN IN A HAT', pages: ['Early or late, courier?', 'At this hour you cannot tell who is going home.'] },
    'downtown/fixer': { name: 'FIXER', pages: ['Morning, courier. Long night?', 'Till takes your key, same as always. It knows you better than I do.'] },
  },
};
// Downtown stays BEFORE while you are home in the flat
OPENING_LINES.flat = { ...OPENING_LINES.home };

/**
 * A device's everyday actions in this state (the popup's chips), instead of its data's: what
 * the chip says (a caption over the device), or the device's own verb (`act`), a state key to
 * set (`set`), and `fail`: an everyday thing that no longer works (the morning counts them;
 * Moth writes after a couple). No chips at all: the device only shows how it looks.
 */
export interface StoryChip { label: string; say?: Line; act?: [noun: string, verb: string]; set?: [key: string, value: boolean]; fail?: boolean; mail?: boolean }

const DOWNTOWN_BEFORE: Record<string, StoryChip[]> = {
  'downtown/gate': [
    { label: 'push the gate', say: ['use lock --open', 'NEON MARKET GATE: closed. market hours 07:00 to 02:00.', 'dim'] },
    { label: 'read the counter', say: ['cat door', 'COUNTER: today: 0. opens 07:00.'] },
  ],
  'downtown/sign': [{ label: 'look at the tubes', say: ['cat tubes', 'V·RIFY. tube 2 (E): dark. repair ticket open since installation.'] }],
  'downtown/till': [{ label: 'pay with your key', say: ['pay --key', 'TILL: key ok. one noodle bowl. thank you, regular.', 'ok'] }],
  'downtown/fence': [
    { label: 'read the plate', act: ['plate', 'read'] },
    { label: 'open the gate', say: ['use gate --open', 'REGISTRY PROPERTY: root only. current user: courier, registered.', 'err'] },
  ],
  'downtown/scan': [
    { label: 'walk in', say: ['enter', 'IDENTITY SCAN: verified in 0.2 s. have a compliant day.', 'ok'] },
    { label: 'look at the screen', say: ['cat scanner', 'subject: courier, 7B · identity: verified · record: current.'] },
  ],
  'downtown/billboard': [{ label: 'watch the ad', say: ['cat ads', 'REGISTRY PREMIUM. Be seen everywhere. good morning, resident.'] }],
};

export const OPENING_EVERYDAY: PerScene<StoryChip[]> = {
  home: {
    // the metro car: TRAIN-0's brake is only a brake tonight
    'train/train': [
      { label: 'read the brake plate', say: ['cat plate', 'EMERGENCY BRAKE. EMERGENCIES MUST BE REGISTERED 48 HOURS IN ADVANCE.'] },
      { label: 'pull the brake', say: ['use brake --pull', 'BRAKE: no emergency registered to this passenger.', 'err'] },
    ],
    ...DOWNTOWN_BEFORE,
  },
  flat: {
    ...DOWNTOWN_BEFORE,
    // Capsule 7B at dawn: everything works, nothing is a puzzle yet
    'capsule/lock': [
      { label: 'try the door', say: ['use bolt --open', 'DOOR LOCK: unlocked. welcome home.', 'ok'] },
      { label: 'read the plate', say: ['cat plate', 'RENT: PAID. NEXT DUE IN 9 DAYS.'] },
    ],
    'capsule/fridge': [
      { label: 'open the fridge', say: ['open fridge', 'one lemon, a battery, and the noodles you did not eat on shift.', 'dim'] },
      { label: 'read the note', act: ['note', 'read'] },
    ],
    'capsule/kettle': [{ label: 'boil', act: ['kettle', 'boil'] }],
    'capsule/blinds': [
      { label: 'open', set: ['sun', true], say: ['use motor --open', 'the blinds roll up. dawn, the colour of weak tea.', 'ok'] },
      { label: 'close', act: ['motor', 'close'] },
    ],
    'capsule/pc': [{ label: 'check mail', say: ['cat inbox', 'HOME-PC: no new mail. 1 old message, from Moth: "if I go dark, my place is yours. my key is with the noodle fixer. follow the trains."'] }],
    'capsule/plug': [{ label: 'switch on', say: ['use power --on', 'SMART PLUG: schedule: night. it is always night in here.', 'dim'] }],
    'capsule/router': [{ label: 'feel how warm it is', act: ['temp', 'read'] }],
  },
  deleted: {
    // the same flat, cold: the plain things stop working
    'capsule/lock': [
      { label: 'try the door', say: ['use bolt --open', 'DOOR: rent: pending. identity: not found.', 'err'], fail: true },
      { label: 'read the plate', act: ['plate', 'read'] },
    ],
    'capsule/kettle': [{ label: 'boil', say: ['use kettle --boil', 'KETTLE: no account. no water.', 'err'], fail: true }],
    'capsule/blinds': [{ label: 'open', say: ['use motor --open', 'BLINDS: privacy mode. account: not found.', 'err'], fail: true }],
    'capsule/plug': [{ label: 'switch on', say: ['use power --on', 'SMART PLUG: no account. schedule: night.', 'err'], fail: true }],
    'capsule/pc': [{ label: 'check mail', say: ['cat inbox', 'HOME-PC: 1 new message. MOTH, 09:38.', 'ok'], mail: true }],
  },
};

/**
 * A way out that does something else in this state. `say`: refused, with these words (`name`
 * speaks); `turnstile`: Downtown station's exit gate takes a beat too long, then lets you out;
 * `concierge`: CONCIERGE greets you at the tower's door and lets you up; `react`: a device
 * answers instead (a caption over it), and `fail` counts it as a thing that no longer works.
 */
export type ExitRule = { say: { name: string; pages: string[] } } | { turnstile: true } | { concierge: true } | { react: string; line: Line; fail?: boolean };

const BED_FIRST = { name: 'YOU', pages: ['Bed first. The city will still be there.'] };
const DOWNTOWN_EXITS: Record<string, ExitRule> = {
  'downtown/capsule': { concierge: true },
  'downtown/shop': { say: { name: 'SHOP', pages: ['OPENS 07:00.', 'DELIVERIES ROUND THE BACK.'] } },
  'downtown/yard': { say: { name: 'YOU', pages: ["The fixer's yard. Not at this hour."] } },
  'downtown/moth': { say: { name: 'DOOR', pages: ['RESIDENTS ONLY. PRESENT KEY CHIP.', 'FLAT 4C · RESIDENT: MOTH.'] } },
  'downtown/taxi': { say: { name: 'YOU', pages: ['A sky taxi, on a courier\'s pay. Sure.'] } },
  'downtown/market': { say: BED_FIRST },
};

export const OPENING_EXITS: PerScene<ExitRule> = {
  home: {
    'metro/train': { say: { name: 'YOU', pages: ['That was my stop. Bed is the other way.'] } },
    'metro/downtown': { turnstile: true },
    ...DOWNTOWN_EXITS,
  },
  flat: {
    ...DOWNTOWN_EXITS,
    // the flat's door (an engine target)
    'capsule/door': { say: BED_FIRST },
  },
  deleted: {
    'capsule/door': { react: 'lock', line: ['open door', 'DOOR: rent: pending. identity: not found.', 'err'], fail: true },
  },
};

/** Things to press E on that only the story has: the bed. (`x`: world units; the bed is capsule/scene.ts's 462–512.) */
export const OPENING_TARGETS: PerScene<{ x: number; label: string; promptH: number }> = {
  flat: { 'capsule/bed': { x: 502, label: '[E] SLEEP', promptH: 46 } },
};

/**
 * The idle ping: standing still this long (frames) in an opening scene pings where the goal is.
 * Targets: `door` (the train's nearest door), `exit` (a scene exit by id), `story` (a story
 * target), `device` (a device by id).
 */
export const IDLE_PING = 20 * 60;
export type PingTarget = { door: true } | { exit: string } | { story: string } | { device: string };
export const OPENING_PINGS: PerScene<PingTarget> = {
  home: { train: { door: true }, metro: { exit: 'downtown' }, downtown: { exit: 'capsule' } },
  flat: { capsule: { story: 'bed' }, downtown: { exit: 'capsule' } },
  deleted: { capsule: { device: 'pc' } },
  uplinked: { capsule: { device: 'pc' } },
};

/** The train home: how long its run into Downtown takes (frames: slow, time to talk), and how far along it starts. */
export const HOME_RUN = { frames: 1800, start: 240 };
/** Entrance verification timings (frames). Its physical anchor comes from the scene exit's checkpoint. */
export const TURNSTILE = { verify: 150, ok: 50 };

/** The sleep: the card between the two flats (frames: fade out, the card, fade in). */
export const SLEEP = { out: 50, card: 110, in: 50, from: '06:04', to: '09:40' };

/**
 * The morning: Moth writes after this many everyday things fail, or this long (frames) after you
 * wake, or when you check mail; never sooner than `after` frames past the last of those (its line reads first).
 */
export const MORNING = { tries: 2, wait: 25 * 60, after: 100 };
export const WAKE_LINES = ['Morning. The light is wrong.', 'Cold. Like the flat forgot who it is heating.'];
export const MOTH_MESSAGE = [
  "they took you off the list. not a glitch. don't call anyone.",
  "here's a way back in. jack in to your PC.",
  '→ uplink.so',
  "uplink gets you in. to find anything, you want scan.so. the library on your street still lends it. don't ask nicely.",
];
export const UPLINK_LINES = (touch: boolean) => [
  'uplink.so. Moth wrote this. I can tell by the comments.',
  touch ? 'HACK, top right: see how things work. Tap the PC: ⌁ jack in.' : 'H: see how things work. B: the board. E at the PC, then ⌁ jack in.',
];
/** The keyring chip Moth's message gives (yard.json's `uplink`): the deck past your own building. */
export const UPLINK_KEY = 'uplink';

/** Your own deck's files and `whoami` while you still exist (level.ts reads them). */
export const DECK_BEFORE = {
  files: { 'shift.txt': 'NIGHT SHIFT · 14 PARCELS · 0 COMPLAINTS\nNEXT SHIFT: 22:00\nREGISTRY STATUS: CURRENT' },
  whoami: 'courier, capsule 7B (registered) · night shift',
};

/** One of the tables above, for a state and scene: `pick(OPENING_LINES, state, 'train', 'suit')`. */
export function pick<T>(table: PerScene<T>, state: OpeningState, scene: string, id?: string): T | undefined {
  return table[state]?.[id === undefined ? scene : scene + '/' + id];
}
