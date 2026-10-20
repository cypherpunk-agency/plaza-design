import type {RegisteredSceneController} from '../engine/controllers';
import type {NativeObservations} from '../engine/native-observations';
/**
 * The shape of a scene's data file (see GAME-DATA.md).
 *
 * A scene file says WHAT is in a scene: devices, their nouns and verbs, which
 * events they raise, what everything says, the dialogue and goals, where
 * things stand. HOW the odd rule works (the claw, a timer, the hatch opening
 * for a second) stays in code as a named effect, and the data refers to it
 * by name. The engine (game/engine/) runs any scene file; the hacking layer
 * (guards, sealed sectors, trace, the net) is engine, switched on by data.
 *
 * Strings are templates: `{verb}`, `{via}` and any state key are filled in.
 * Inside a device, its own `state` keys come before the scene's.
 */

/** Noun kinds. GUARD, LOG, LINK and CLOCK have engine behaviour (see `guard`, `log`, `link`, `clock`). */
export type Kind = 'SENSE' | 'ACT' | 'STORE' | 'DAEMON' | 'GUARD' | 'LOG' | 'LINK' | 'CLOCK';
export type Tone = 'ok' | 'err' | 'dim';
export type Value = string | number | boolean | null;
export type Dir = 'up' | 'down' | 'left' | 'right';

/** A terminal line: the shell command, the reply, and how it is coloured. */
export type LineData = [cmd: string, reply: string, tone?: Tone];

/** Either a line written out, or the key of a line in the scene's `texts` (or the engine's). */
export type LineRef = LineData | string;

/**
 * A condition: `key` (state is truthy), `!key`, `key=value`, or `signal`
 * (the verb arrived over a cable rather than from the player's finger).
 * The city (TIME.md) adds read-only keys every scene has: `weather` (the scene's district now:
 * `weather=rain`, `!weather=clear`; clear, cloudy, rain, storm, fog, smog, heat), `hour` (0–23)
 * and `day` (1, 2, …). A scene's own state key of the same name wins.
 */
export type Cond = string;

/**
 * A time window on the city clock (TIME.md): from `from` up to (not including) `to`, "HH:MM",
 * crossing midnight when `to` is earlier ("22:00" to "04:00"). `days`: only on these days ("odd",
 * "even" or day numbers); a window that crosses midnight belongs to the day it started.
 */
export interface TimeWindow { from: string; to: string; days?: ('odd' | 'even' | number)[] }

/** One step. Each has exactly one of command / input / set / open / emit / goal / effect / give / take / trace / unseal. */
export type Action = { if?: Cond; when?: TimeWindow } & (
  | {command:string} // sole noun.on case step; actual interaction/signal permission, never system
  | {input:string}
  | { set: string; to: Value }   // change a state key (strings are templates)
  | { open: string; with?: string } // open a full-screen panel: talk (with: which dialogue), camera
  | { emit: string }             // raise one of this noun's events
  | { goal: string }             // tick a goal
  | { effect: string }           // run a named effect implemented in code
  | { give: string; count?: number } // hand the player a keyring item, a module (`switch.so`), or `tokens` (with `count`)
  | { take: string; count?: number } // take an item the player carries (scenes/kit.ts ITEMS: `soap`), `count` of them (default 1)
  | { trace: number }            // raise (or, negative, lower) this device's trace, in %
  | { unseal: string }           // open a sealed sector of this device (or `device/sector`)
);

/** What a verb does. In a list, the first case whose `if` holds (and whose `when` is now) runs. */
export interface Case { if?: Cond; when?: TimeWindow; do?: Action[]; say?: LineRef }

/** A status line part: plain text, or text chosen by a condition. */
export type StatusPart = string | { if: Cond; then?: string; else?: string };

/**
 * A login (GUARD noun). Its verbs come from the engine: `try <fragment>` for
 * each clue fragment on the keyring, and `type…` (the keyboard, last resort).
 */
export interface GuardData {
  /** What opens it (or any of a list). Compared without case, spaces, `-` or `_`. Not on a toy guard (the toy is the lock). */
  password?: string | string[];
  /** Said when it opens, instead of the engine's `guard.ok`. */
  say?: LineRef;
  /** A lock toy instead of a password: `probe` opens it full screen, solving it opens the guard. Its parameters sit under the same name. */
  toy?: ToyKind;
  rings?: RingsToyData;
  cipher?: CipherToyData;
  cryptex?: CryptexToyData;
  morse?: MorseToyData;
  /** Near misses and what the guard says to each, instead of the plain "wrong" (still a wrong guess): `{ "vrify": ["…", "ACCESS DENIED. That was the old one.", "err"] }`. */
  near?: Record<string, LineRef>;
  /** Wrong guesses in a row before it locks (default 1). */
  tries?: number;
  /** How long it stays locked, ms (default 5000). 0: never locks. */
  lockMs?: number;
  /** Trace (%) each wrong guess adds to this device. */
  trace?: number;
  /** Steps run once when the password is right (sectors sealed by this guard open on their own; an `opened` event, if the noun has one, fires). */
  do?: Action[];
}

/**
 * A LOG noun: while you are inside its device, it records you and the
 * device's trace meter fills. Full trace kicks you out and locks the device.
 */
export interface LogData {
  /** Trace (%) per second while it records you. */
  rate: number;
  /** Trace (%) per second it drains while it does not (default rate / 2). */
  fall?: number;
  /** It records only while this holds (a switch on the log: `logging`). */
  when?: Cond;
  /** `device.noun` the log sends to. It records only while a cable from this log reaches it: cut it and the log talks to no one. */
  archive?: string;
  /** How long you count as inside after using one of the device's verbs on the board, ms (default 3000). */
  linger?: number;
  /** How long a full trace locks you out of the device, ms (default 10000). */
  lockMs?: number;
}

/**
 * A LINK noun: a port onto the net (NET.md). It reaches the networks whose access rule names this
 * port (net.json `networks`: `{ "port": "scene:device.noun" }`) and what those lead to; `reach`
 * adds nodes it reaches directly. `scan` (needs the program `scan.so`) shows them on the board;
 * `connect <node>` brings one in. `known`: nodes it connects to without a scan, and without
 * `scan.so` (an address book: the home PC knows CONCIERGE, the card reader the catalog).
 * `when`: the link works only while this holds (a router that is off scans nothing).
 */
export interface LinkData { reach?: string[]; known?: string[]; when?: Cond }

// ---------- lock toys (scene/toys/): one per lock type ----------

export type ToyKind = 'rings' | 'cipher' | 'cryptex' | 'morse';

/** One shield ring, outermost first: degrees per second (negative: the other way), its gap, where the gap starts (0 = the port, at the top). */
export interface RingData { speed: number; gap: number; start?: number }
/** Shield rings: lock each ring while its gap is at the port, outermost first. A miss reverses that ring and speeds it up. */
export interface RingsToyData {
  rings: RingData[];
  /** How far off the port the gap's middle may be, in degrees (default 20). */
  tolerance?: number;
}
/** A cipher wheel (Caesar): turn the inner ring until the text reads right, then read it out. */
export interface CipherToyData {
  /** The text as shown, enciphered: `KVU'A AYBZA. CLYPMF.` */
  text: string;
  /** The shift that reads it (1–25): each letter goes back this many places. */
  shift: number;
}
/** A cryptex: letter rings, one per letter; it opens on the word. */
export interface CryptexToyData {
  word: string;
  /** Each ring's letters, in order (default A–Z on every ring). One per letter of the word. */
  rings?: string[];
}
/** A Morse lamp: it blinks a message over and over; tap it back. */
export interface MorseToyData {
  /** What the lamp spells (letters and digits). Tapping it back opens the guard. */
  message: string;
  /** One Morse unit, ms (a dot; a dash is three). Default 220. */
  unitMs?: number;
}

/**
 * A CLOCK noun: an event source on a rhythm. Every `every` ms it raises its
 * next event (its `events` in turn: `["night", "day"]` alternate; one event
 * repeats). Engine verbs: `start`, `stop`. Saved: which event is next, how far
 * into the beat, and whether it is stopped.
 */
export interface ClockData {
  /** The beat, ms. */
  every: number;
  /** The first beat comes after this many ms (default `every`). */
  first?: number;
  /** A state key that holds the last event raised (`phase`, so a condition can say `phase=night`). */
  set?: string;
  /** Running when the scene starts (default true). */
  start?: boolean;
}

/**
 * The Registry's watchdog: a process that walks a route of devices and nodes,
 * sits on each for `dwellMs`, then takes `moveMs` to the next (looping). The
 * device it sits on freezes: no verbs, no signals in or out. Each device on the
 * route gets an engine noun `watchdog` (kind WATCH) with events `arrives` and
 * `leaves`, so cables can say "while it is away".
 */
export interface WatchdogData {
  /** Saves keep its place by this id (default `watchdog`). */
  id?: string;
  /** What the board calls it (default: the text `watchdog.name`). */
  name?: string;
  /** Device or node ids, in order; it loops back to the first. */
  route: string[];
  dwellMs: number;
  moveMs: number;
}

export interface NounData {
  id: string;
  kind: Kind;
  /** Verbs. GUARD and LINK nouns get theirs from the engine and may add more. */
  verbs?: string[];
  /** Events this noun raises; cables start here. */
  events?: string[];
  /** State key the highlighted verb follows (the verb that put the state there). */
  current?: string;
  /** The sealed sector this noun sits in (a `sectors[].id` of its device). */
  sector?: string;
  guard?: GuardData;
  log?: LogData;
  link?: LinkData;
  clock?: ClockData;
  /** Verb → what it does. `*` handles every verb without its own entry. */
  on?: Record<string, Case | Case[]>;
}

/**
 * What keeps a sector sealed. Exactly one of:
 * - `key`: a key chip on the keyring (tap the sealed nouns, or drag the chip onto them);
 * - `guard`: a GUARD noun of the same device; the right password opens it;
 * - `sequence`: the sector's seal is a noun (id = the sector id) whose verbs must
 *   arrive in this order, each within `withinMs` of the last (by cable only, if `signal`);
 * - `if`: opens as soon as the condition holds.
 */
export type SealData =
  | { key: string }
  | { guard: string }
  | { sequence: string[]; withinMs?: number; signal?: boolean }
  | { if: Cond };

export interface SectorData { id: string; label?: string; seal: SealData }

/** Where a device stands in the world (world units, as the scene draws) and on the board. */
export interface LayoutData {
  /**
   * In the world: x of its centre, width, height, and `y`, how high its bottom sits above the
   * street (default 0: it stands on the street; a sign on a wall or a box on a roof sits higher).
   * Devices without a spot live on the board only (net nodes).
   */
  spot?: { x: number; w: number; h: number; y?: number };
  /** Its home on the board, as fractions of the stage. */
  board?: { x: number; y: number };
  /** Which side of the device each noun sits on, on the board / in a device's schematic. */
  dir?: Record<string, Dir>;
  /** No longer read: hack vision lays a device's nouns out in one row (see `row`). Accepted so older files still check. */
  vision?: Record<string, Dir>;
  /**
   * Hack vision: the order of its nouns in the row over the device, left to right.
   * Nouns not listed follow, by kind: SENSE and STORE, then ACT, then LINK / GUARD / LOG, then DAEMON.
   */
  row?: string[];
}

export interface DeviceData {
  id: string;
  name: string;
  look: string;
  status: string | StatusPart[];
  /** State that belongs to this device alone (each placed copy gets its own). */
  state?: Record<string, Value>;
  nouns: NounData[];
  sectors?: SectorData[];
  layout?: LayoutData;
  /**
   * What you do with it without hacking anything (the kettle: boil), in the popup a click or E
   * opens next to it in the world, at most three. Each runs that noun's verb, exactly as a tap on it would.
   * Hacking verbs (logins, links, logs, wiring) are not everyday: they live in hack view.
   */
  everyday?: EverydayData[];
  /**
   * What it takes from what you carry (scenes/kit.ts ITEMS): each shows in its popup as an everyday
   * action only while you hold the item ("show the maglev pass" at the brake), first, and the popup
   * still keeps to three (the last everyday ones make room). Nothing is taken unless a `take` step says so.
   */
  items?: ItemUseData[];
  /** A computer or terminal: its popup offers `⌁ jack in`, the full device screen (the schematic). */
  deck?: boolean;
  /**
   * Devices it changes that no cable shows (the plug powers the router): its popup opens on the
   * side away from them, so it never covers the reaction.
   */
  affects?: string[];
}

/** One everyday action: a noun's verb, with the popup's label (default: the verb). `{tokens}` in the label: what you have. */
export interface EverydayData { noun: string; verb: string; label?: string }

/**
 * Something you carry, used on this thing: `item` (an ITEMS id), the popup's `label` ("pour in
 * soap"), and what happens, as a verb's cases on `noun` (its lines come from there; `emit` raises
 * that noun's events). A `take` step uses the item up; without one you keep it (a pass you show).
 */
export interface ItemUseData { item: string; noun: string; label: string; on: Case | Case[] }

/**
 * A cable present when the scene starts: event → noun + verb. Cuttable like any
 * other, unless `fixed` (a solid conduit you have to work around). Saves keep
 * the player's cuts by `id` (default `from>to`), so a cable added to the data
 * later still shows up in an older save.
 */
export interface CableData { id?: string; from: string; to: string; verb: string; fixed?: boolean }

/** Crafting (not used by any scene right now; kept so the format can say it). */
export interface RecipeData {
  /** Two parts from the bench's inventory, any order. */
  parts: string[];
  /** The logic part it makes (a `part.id` in logic.json). */
  makes: string;
  say: LineRef;
}

export interface CrateData { id: string; x: number; y: number; w: number; h: number; label: string }

export interface DialogueNode {
  if?: Cond;
  /** Only shown inside this time window (with `if`, both must hold). */
  when?: TimeWindow;
  text: string;
  do?: Action[];
  /** [what you say, node it leads to]. No choices: the conversation ends. */
  choices?: [say: string, next: string][];
}

export interface DialogueData {
  speaker: string;
  start: string;
  /** The terminal line printed when you pick something; `{line}` is what you said. */
  sayCmd: string;
  /** Node id → node, or variants where the first whose `if` holds is shown. */
  nodes: Record<string, DialogueNode | DialogueNode[]>;
  /** Typing your own line: a regex (case-insensitive) that leads somewhere, else `miss`. */
  free?: { match: string; goto: string; miss: string; retry: string; retryGoto: string };
}

/** An objective, in order. (No authored hints yet: the hint lane exists, see ui/hints.ts and GAME-DATA.md, "Decided".) */
export interface GoalData { id: string; text: string }

/** What a `rule` chip does to a fragment dropped on it (or it on a fragment). Joining two fragments needs no rule. */
export type RuleOp = 'reverse' | 'upper' | 'lower';

/**
 * Something on the player's keyring, which travels with them across scenes.
 * A `fragment` is a clue (`text` is what it types into a login); a `key` is a chip
 * that opens a sector sealed with it; a `rule` is a pattern ("new = old, reversed")
 * that turns a fragment into a new one. Ids are global: unique across every file.
 *
 * Combining on the keyring (drag one chip onto another): a fragment with `from`
 * is what those two make, in either order (a recipe); otherwise a fragment on a
 * rule makes `reverse(vrify)`, and a fragment on a fragment joins them,
 * `join(sprat,bday)`. Those made ones are stored by that expression.
 */
export interface KeyItem {
  id: string;
  /** A `card` is a one-shot trick a lock toy accepts (SLOW, PING on shield rings). */
  kind: 'fragment' | 'key' | 'rule' | 'card';
  /** On its chip: `cat's name`. */
  label: string;
  /** A fragment's text: `pixel`. */
  text?: string;
  /** A rule's transform. */
  rule?: RuleOp;
  /** A fragment made by combining these two chips (either order), instead of the plain join. */
  from?: [string, string];
  /** A card's trick: `slow` (shield rings at 0.35× for 4 s) or `ping` (the next gaps count wider). */
  card?: 'slow' | 'ping';
}

export interface SceneData {
  controller?:RegisteredSceneController;
  /** Native read-only projections and idempotent live-tick goal observations. */
  observations?: NativeObservations;
  id: string;
  name: string;
  /** Every state key the scene has, with its starting value. */
  state: Record<string, Value>;
  /** Timings and other numbers the effects read. */
  tuning: Record<string, number>;
  devices: DeviceData[];
  /** Computers on the net, not in the world: they appear on the board once a LINK scans them. Also net.json. */
  nodes?: DeviceData[];
  /** Cables present from the start (pre-wired). One that touches a node appears when the node is connected. */
  cables: CableData[];
  /** Keyring items this scene hands out (with a `give` step). */
  keyring?: KeyItem[];
  /** A workbench that turns two parts into a logic part. Later. */
  bench?: { parts: string[]; recipes: RecipeData[] };
  /** The yard's CAM-1 feed (read by the yard's camera panel). */
  camera?: { crates: CrateData[]; actions?:Partial<Record<'inspectOwned'|'tagOwned',string>>; bindings?:import('../engine/controllers/camera-bindings').CameraBindings };
  dialogue: Record<string, DialogueData>;
  goals: GoalData[];
  /** Lines and labels the code asks for by key. The engine's own (engine.json) can be overridden here. */
  texts: Record<string, string | LineData>;
  /** The Registry's watchdog walking this scene's devices and nodes (net.json may have one too). */
  watchdog?: WatchdogData;
}

/**
 * A logic module (logic.json): an item the player owns, like legs.so, shared
 * by every scene. Owning it puts its part in the board's palette; a placed copy's
 * id is the part id + a counter (`timer1`, `timer2`, …) and gets its own `state`.
 */
export interface LogicModule {
  /** The module file: `timer.so`. Saves store it, so keep it stable. */
  id: string;
  /** Owned from a new game. */
  start?: boolean;
  /**
   * Where the player finds it. `null` = not placed anywhere yet.
   * TODO(modules): no scene hands a module out yet (switch.so is unobtainable).
   * When one does, name the scene here and give it a step that grants the module
   * (it adds the id to `Save.modules`); the check can then require the scene exists.
   */
  foundIn?: string | null;
  /** The device placed on the board: TIMER, SWITCH. */
  part: DeviceData;
}

export interface LogicData { modules: LogicModule[] }

/**
 * The shared net (net.json): nodes any scene's LINK may reach, the cables
 * pre-wired between them (they appear when a node they touch is connected),
 * and keyring items found on them.
 */
export interface NetData { nodes: DeviceData[]; cables: CableData[]; keyring: KeyItem[]; watchdog?: WatchdogData; networks: NetworkData[]; programs: ProgramData[]; scanProgram: string | null }

/**
 * A network (NET.md): a group of machines with its own access rule. Any one rule in `from` is
 * enough: a `port` (a LINK noun, `scene:device.noun`, that is up), another `net` you reach, or a
 * node you `controlled` (its Registry label, `0x2F`) that you reach: standing in the scene you
 * are in, or a machine of a network you reach. A controlled node is an access point.
 */
export interface NetworkData {
  id: string;
  name: string;
  /** One dry line about it, for the net map. */
  note: string;
  from: AccessRule[];
  /** What kind of place you would have to plug in from (the net map says it when you can't). */
  need: string;
  machines: MachineData[];
}
export type AccessRule = { port: string } | { net: string } | { controlled: string };
/**
 * A machine on a network: a device or node of a scene file (`in`: the scenes whose file has it,
 * `net` for net.json). `node`: its Registry label (`0x2F`), when it is a node you can take control of.
 */
export interface MachineData { id: string; in: string[]; node?: string }

/** A program (NET.md): a `.so` you earn and keep (`save.programs`), handed out by a `give` step. */
export interface ProgramData { id: string; name: string; look: string; foundIn: string }

/** The engine's own wording (engine.json): guard, seal, trace, net and wiring lines. A scene may override any. */
export interface EngineData { texts: Record<string, string | LineData> }

// ---------- saves ----------

export interface Pt { x: number; y: number }

/**
 * A scene's progress inside the game's save (`save.scenes.<scene id>`).
 * Transient things (a parcel mid-slide, a timer counting) are not stored: they
 * come back in a stable state. Trace and lockouts are stored, so reloading
 * does not wipe them; so are clocks and the watchdog's place on its route.
 */
export interface SceneSave {
  /** Goal ids reached. */
  goals: string[];
  /** Every cable: `from` device.noun:event, `to` device.noun, the verb it carries. Pre-wired ones you cut are missing. */
  links: CableData[];
  /**
   * Logic parts: id (`timer1`), part kind (`timer`), its own state (a switch's `on`), and where it
   * floats in the world in hack vision (`at`: x along the scene, h above the ground, world units).
   */
  logic: { id: string; kind: string; state?: Record<string, Value>; at?: { x: number; h: number } }[];
  /** Devices' and nodes' own `state`, by device id (logic parts keep theirs in `logic`). */
  local?: Record<string, Record<string, Value>>;
  /** Sectors opened: `device/sector`. */
  open?: string[];
  /** Guards whose password you found: `device.noun`. */
  passed?: string[];
  /** The net: nodes scanned (silhouettes) and connected (full schematics). */
  net?: { seen: string[]; connected: string[] };
  /** Pre-wired cables the player cut, by id (`from>to` without one). Pre-wired cables neither here nor in `links` are new in the data: they come back. */
  cut?: string[];
  /** Trace per device, % (only those above 0). */
  trace?: Record<string, number>;
  /** Lockouts still running, by device or guard (`device.noun`): when they end, wall-clock ms (Date.now). */
  locks?: Record<string, number>;
  /** CLOCK nouns (`device.noun`): the next event's index, ms into the beat, stopped. */
  clocks?: Record<string, { next: number; ms: number; off?: boolean }>;
  /** Watchdogs, by id: ms into their loop. */
  watchdog?: Record<string, number>;
  /**
   * The board: devices you know, where they sit (fractions of the stage), where their nouns sit (px).
   * `vision`: where the player put things in hack vision, in world units: by device id, its core's
   * offset from its default spot over the device; by `device.noun`, the noun's offset from its core.
   */
  board?: { known: string[]; pos: Record<string, Pt>; offsets: Record<string, Pt>; vision?: Record<string, Pt> };
}

/** A transient engine checkpoint; root storage owns scalar blocks separately. */
export interface SceneSnapshot extends SceneSave {state:Record<string,Value>}

/**
 * JSON imports type their strings as `string`, not 'SENSE' | 'ACT' | ….
 * `Loose<SceneData>` is SceneData with every string literal widened, so the
 * type-check still catches a missing field or a number where a list belongs;
 * the build-time check (check.ts) catches the rest.
 */
export type Loose<T> =
  T extends string ? string
  : T extends number | boolean | null | undefined ? T
  : T extends readonly (infer U)[] ? Loose<U>[]
  // records: JSON typing fills keys missing from sibling objects with `undefined`
  : T extends object ? (string extends keyof T ? { [k: string]: Loose<T[string & keyof T]> | undefined } : { [K in keyof T]: Loose<T[K]> })
  : T;
