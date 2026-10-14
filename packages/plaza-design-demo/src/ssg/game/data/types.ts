/**
 * The shape of a zone's data file (see GAME-DATA.md).
 *
 * A zone file says WHAT is in a zone: devices, their nouns and verbs, which
 * events they raise, what everything says, the dialogue and goals, where
 * things stand. HOW the odd rule works (the claw, a timer, the hatch opening
 * for a second) stays in code as a named effect, and the data refers to it
 * by name. The engine (game/zone/) runs any zone file; the hacking layer
 * (guards, sealed sectors, trace, the net) is engine, switched on by data.
 *
 * Strings are templates: `{verb}`, `{via}` and any state key are filled in.
 * Inside a device, its own `state` keys come before the zone's.
 */

/** Noun kinds. GUARD, LOG and LINK have engine behaviour (see `guard`, `log`, `link`). */
export type Kind = 'SENSE' | 'ACT' | 'STORE' | 'DAEMON' | 'GUARD' | 'LOG' | 'LINK';
export type Tone = 'ok' | 'err' | 'dim';
export type Value = string | number | boolean | null;
export type Dir = 'up' | 'down' | 'left' | 'right';

/** A terminal line: the shell command, the reply, and how it is coloured. */
export type LineData = [cmd: string, reply: string, tone?: Tone];

/** Either a line written out, or the key of a line in the zone's `texts` (or the engine's). */
export type LineRef = LineData | string;

/**
 * A condition: `key` (state is truthy), `!key`, `key=value`, or `signal`
 * (the verb arrived over a cable rather than from the player's finger).
 */
export type Cond = string;

/** One step. Each has exactly one of set / open / emit / goal / effect / give / trace / unseal. */
export type Action = { if?: Cond } & (
  | { set: string; to: Value }   // change a state key (strings are templates)
  | { open: string; with?: string } // open a full-screen panel: talk (with: which dialogue), camera
  | { emit: string }             // raise one of this noun's events
  | { goal: string }             // tick a goal
  | { effect: string }           // run a named effect implemented in code
  | { give: string }             // put a keyring item (a clue fragment, a key chip) on the player's keyring
  | { trace: number }            // raise (or, negative, lower) this device's trace, in %
  | { unseal: string }           // open a sealed sector of this device (or `device/sector`)
);

/** What a verb does. In a list, the first case whose `if` holds runs. */
export interface Case { if?: Cond; do?: Action[]; say?: LineRef }

/** A status line part: plain text, or text chosen by a condition. */
export type StatusPart = string | { if: Cond; then?: string; else?: string };

/**
 * A login (GUARD noun). Its verbs come from the engine: `try <fragment>` for
 * each clue fragment on the keyring, and `type…` (the keyboard, last resort).
 */
export interface GuardData {
  /** What opens it (or any of a list). Compared without case, spaces, `-` or `_`. */
  password: string | string[];
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
 * A LINK noun: `scan` shows the nodes in reach on the board; `connect <node>` brings one in.
 * `when`: the link works only while this holds (a router that is off scans nothing).
 */
export interface LinkData { reach: string[]; when?: Cond }

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
  /** In the world: x of its centre, width, height. Devices without a spot live on the board only (net nodes). */
  spot?: { x: number; w: number; h: number };
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
}

/** A cable present when the zone starts: event → noun + verb. Cuttable like any other. */
export interface CableData { from: string; to: string; verb: string }

/** Crafting (not used by any zone right now; kept so the format can say it). */
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

/** An objective, in order. (No hints for now: see GAME-DATA.md, "Decided".) */
export interface GoalData { id: string; text: string }

/** What a `rule` chip does to a fragment dropped on it (or it on a fragment). Joining two fragments needs no rule. */
export type RuleOp = 'reverse' | 'upper' | 'lower';

/**
 * Something on the player's keyring, which travels with them across zones.
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
  kind: 'fragment' | 'key' | 'rule';
  /** On its chip: `cat's name`. */
  label: string;
  /** A fragment's text: `pixel`. */
  text?: string;
  /** A rule's transform. */
  rule?: RuleOp;
  /** A fragment made by combining these two chips (either order), instead of the plain join. */
  from?: [string, string];
}

export interface ZoneData {
  id: string;
  name: string;
  /** Every state key the zone has, with its starting value. */
  state: Record<string, Value>;
  /** Timings and other numbers the effects read. */
  tuning: Record<string, number>;
  devices: DeviceData[];
  /** Computers on the net, not in the world: they appear on the board once a LINK scans them. Also net.json. */
  nodes?: DeviceData[];
  /** Cables present from the start (pre-wired). One that touches a node appears when the node is connected. */
  cables: CableData[];
  /** Keyring items this zone hands out (with a `give` step). */
  keyring?: KeyItem[];
  /** A workbench that turns two parts into a logic part. Later. */
  bench?: { parts: string[]; recipes: RecipeData[] };
  /** The yard's CAM-1 feed (read by the yard's camera panel). */
  camera?: { crates: CrateData[] };
  dialogue: Record<string, DialogueData>;
  goals: GoalData[];
  /** Lines and labels the code asks for by key. The engine's own (engine.json) can be overridden here. */
  texts: Record<string, string | LineData>;
}

/**
 * A logic module (logic.json): an item the player owns, like legs.so, shared
 * by every zone. Owning it puts its part in the board's palette; a placed copy's
 * id is the part id + a counter (`timer1`, `timer2`, …) and gets its own `state`.
 */
export interface LogicModule {
  /** The module file: `timer.so`. Saves store it, so keep it stable. */
  id: string;
  /** Owned from a new game. */
  start?: boolean;
  /**
   * Where the player finds it. `null` = not placed anywhere yet.
   * TODO(modules): no zone hands a module out yet (switch.so is unobtainable).
   * When one does, name the zone here and give it a step that grants the module
   * (it adds the id to `Save.modules`); the check can then require the zone exists.
   */
  foundIn?: string | null;
  /** The device placed on the board: TIMER, SWITCH. */
  part: DeviceData;
}

export interface LogicData { modules: LogicModule[] }

/**
 * The shared net (net.json): nodes any zone's LINK may reach, the cables
 * pre-wired between them (they appear when a node they touch is connected),
 * and keyring items found on them.
 */
export interface NetData { nodes: DeviceData[]; cables: CableData[]; keyring: KeyItem[] }

/** The engine's own wording (engine.json): guard, seal, trace, net and wiring lines. A zone may override any. */
export interface EngineData { texts: Record<string, string | LineData> }

// ---------- saves ----------

export interface Pt { x: number; y: number }

/**
 * A zone's progress inside the game's save (`save.zones.<zone id>`).
 * Transient things (a parcel mid-slide, a timer counting, trace, lockouts) are
 * not stored: they come back in a stable state.
 */
export interface ZoneSave {
  /** The zone's `state` keys, settled. */
  state: Record<string, Value>;
  /** Goal ids reached. */
  goals: string[];
  /** Every cable: `from` device.noun:event, `to` device.noun, the verb it carries. Pre-wired ones you cut are missing. */
  links: CableData[];
  /**
   * Logic parts: id (`timer1`), part kind (`timer`), its own state (a switch's `on`), and where it
   * floats in the world in hack vision (`at`: x along the zone, h above the ground, world units).
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
  /**
   * The board: devices you know, where they sit (fractions of the stage), where their nouns sit (px).
   * `vision`: hack vision's plates and circuits the player moved, by device id, as an offset from
   * their default spot over the device in world units (x right, y down).
   */
  board?: { known: string[]; pos: Record<string, Pt>; offsets: Record<string, Pt>; vision?: Record<string, Pt> };
}

/**
 * JSON imports type their strings as `string`, not 'SENSE' | 'ACT' | ….
 * `Loose<ZoneData>` is ZoneData with every string literal widened, so the
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
