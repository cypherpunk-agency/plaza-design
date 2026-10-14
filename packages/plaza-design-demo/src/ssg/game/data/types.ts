/**
 * The shape of a zone's data file (see GAME-DATA.md).
 *
 * A zone file says WHAT is in a zone: devices, their nouns and verbs, which
 * events they raise, what everything says, the dialogue, recipes and goals.
 * HOW the odd rule works (the claw, a timer, the hatch opening for a second)
 * stays in code as a named effect, and the data refers to it by name.
 *
 * Strings are templates: `{verb}`, `{via}` and any state key are filled in.
 * Inside a device, its own `state` keys come before the zone's.
 */

export type Kind = 'SENSE' | 'ACT' | 'STORE' | 'DAEMON';
export type Tone = 'ok' | 'err' | 'dim';
export type Value = string | number | boolean | null;

/** A terminal line: the shell command, the reply, and how it is coloured. */
export type LineData = [cmd: string, reply: string, tone?: Tone];

/** Either a line written out, or the key of a line in the zone's `texts`. */
export type LineRef = LineData | string;

/**
 * A condition: `key` (state is truthy), `!key`, `key=value`, or `signal`
 * (the verb arrived over a cable rather than from the player's finger).
 */
export type Cond = string;

/** One step. Each has exactly one of set / open / emit / goal / effect. */
export type Action = { if?: Cond } & (
  | { set: string; to: Value }   // change a state key (strings are templates)
  | { open: string }             // open a full-screen panel: camera, talk
  | { emit: string }             // raise one of this noun's events
  | { goal: string }             // tick a goal
  | { effect: string }           // run a named effect implemented in code
);

/** What a verb does. In a list, the first case whose `if` holds runs. */
export interface Case { if?: Cond; do?: Action[]; say?: LineRef }

/** A status line part: plain text, or text chosen by a condition. */
export type StatusPart = string | { if: Cond; then?: string; else?: string };

export interface NounData {
  id: string;
  kind: Kind;
  verbs: string[];
  /** Events this noun raises; cables start here. */
  events?: string[];
  /** State key the highlighted verb follows (the verb that put the state there). */
  current?: string;
  /** Verb → what it does. `*` handles every verb without its own entry. */
  on: Record<string, Case | Case[]>;
}

export interface DeviceData {
  id: string;
  name: string;
  look: string;
  status: string | StatusPart[];
  /** State that belongs to this device alone (each placed copy gets its own). */
  state?: Record<string, Value>;
  nouns: NounData[];
}

/** A cable present when the zone starts: event → noun + verb. */
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

export interface ZoneData {
  id: string;
  name: string;
  /** Every state key the zone has, with its starting value. */
  state: Record<string, Value>;
  /** Timings and other numbers the effects read. */
  tuning: Record<string, number>;
  devices: DeviceData[];
  cables: CableData[];
  /** A workbench that turns two parts into a logic part. Later. */
  bench?: { parts: string[]; recipes: RecipeData[] };
  camera: { crates: CrateData[] };
  dialogue: Record<string, DialogueData>;
  goals: GoalData[];
  /** Lines and labels the code asks for by key. */
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

// ---------- saves ----------

export interface Pt { x: number; y: number }

/**
 * A zone's progress inside the game's save (`save.zones.<zone id>`).
 * Transient things (a parcel mid-slide, a timer counting) are not stored:
 * they come back in a stable state.
 */
export interface ZoneSave {
  /** The zone's `state` keys, settled. */
  state: Record<string, Value>;
  /** Goal ids reached. */
  goals: string[];
  /** Every cable: `from` device.noun:event, `to` device.noun, the verb it carries. */
  links: CableData[];
  /** Logic parts on the board: id (`timer1`), part kind (`timer`), its own state (a switch's `on`). */
  logic: { id: string; kind: string; state?: Record<string, Value> }[];
  /** The board: devices you know, where they sit (fractions of the stage), where their nouns sit (px). */
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
