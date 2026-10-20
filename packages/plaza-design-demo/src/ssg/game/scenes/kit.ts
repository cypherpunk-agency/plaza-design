import type {CompiledCompanion} from '../engine/gameplay/scene-companion';
import type {CityModel} from '../world/city';
import type {LineSystem} from '../world/transport/line';
/**
 * The scene definition (`SceneDef`), and shared shapes and drawing for every
 * scene. A scene is one walkable screen: mostly data (positions, sizes, texts
 * as plain objects) plus its drawing, and, when it has devices, a data file
 * and rules on the engine (engine/). This file also holds what every scene
 * draws the same way, so they all follow ART-GUIDE.md:
 * dim far band, medium middle band, the play band brightest; signs on plates;
 * cyan only on things you can use.
 *
 * The kits to build a living place from (ART-GUIDE §10):
 *   ../characters.ts  people, cats, pigeons and robots from a seed, with idle behaviours and talk
 *   screens.ts    mounted signs and live screens (tickers, ads, cameras, Registry notices) and dry copy
 *   build.ts      stalls, booths, facades, shelves, fridges, clutter, benches, lamps
 * market.ts and shop.ts are the reference scenes that use all three.
 */

import type { Character } from "../runtime/characters";
import type { GameplayDefinition,GameplayState } from '../engine/gameplay/types';
import type { GameplaySession } from '../engine/gameplay/session';
import type { Perch } from "../runtime/companion";
import type { SceneData } from '../data/types';
import type { PlayerServices } from '../runtime/player';
import type { EngineDraw, Line, SceneModel, SceneRules, SceneTarget } from "../engine/index";
import type { PanelFn } from '../engine/panels';
import type { WeatherKind } from "../world/weather";
import type { Caster, SceneLight, Shade } from "../art/atmosphere/lighting";
import type { Environment, Value } from '../art/core/composition';

/** What a scene's draw functions get from the engine, refreshed every frame. */
export type { View } from '../art/core/view';
import type { View } from '../art/core/view';

/**
 * A way out. `to` is a scene id (a district's station exit leads to its
 * platform scene). `at` is the exit you land at there, by its id (Downtown's
 * doors are its exits too: shop, yard, capsule, metro, moth, taxi, market);
 * without one you land at its `spawn`.
 */
export interface SceneExit {
  id: string;
  x: number;
  /** Authored entrance-verification anchor. The exit trigger remains at x; story UI uses this physical checkpoint. */
  checkpoint?: { x: number; h?: number };
  to: string;
  label: string;
  promptH?: number;
  at?: string;
  /**
   * Not a walk: 'board' the train standing at this platform (one prompt per open
   * door, `x` is only where you land stepping off), step 'out' of the train at
   * its stop, hail a 'taxi', look at the city 'map'.
   */
  action?: 'board' | 'out' | 'taxi' | 'map';
  /** Only there while this save flag is set. */
  requires?: string;
  /**
   * An open way out (a street, an alley, a pier): no E, you leave by walking
   * into this border of the scene. `x` is then where you land arriving through
   * it (keep it a little inside the border). For outdoor connections only;
   * doors, stairs and pads keep E.
   */
  edge?: 'left' | 'right';
  /**
   * The scene's own code offers this way out: an engine target (its prompt depends on the
   * scene's state, a door that is locked first) whose `use` returns this exit's id. No prompt
   * of its own; `x` is only where you land arriving through it.
   */
  engine?: boolean;
  /** A save flag set when you leave through it (the flat's door: Pixel comes along from now on). */
  sets?: string;
  /** A keyring item it needs; without it, E is refused with these words. */
  needs?: { key: string; name: string; pages: string[]; h: number };
}

/** A bench, a bar stool or a bed: E there offers "wait until…" (clock.ts WAITS). */
export interface SceneRest { id: string; x: number; kind: 'bench' | 'stool' | 'bed'; promptH?: number; h?: number }

/** Something to read (or a person who says a line) with E. */
export interface SceneReadable { id: string; x: number; name: string; pages: string[]; label?: string; h?: number; promptH?: number }

/**
 * Something to DO in a place with E (buy, haggle, pay for a fortune): `use` runs when the player
 * presses E there and returns what is said (a bubble). It can spend tokens and set save flags.
 */
export interface SceneUse {
  targetOrder?:'before-devices'|'after-devices';
  /** Optional prompt wording when the shared quote is nonzero. */
  pricedLabel?:string;
  conversationPresentation?:'bubble'|'panel';
  speakerKind?:'character'|'device'|'system';
  eligibility?: (flags:Readonly<Record<string,boolean>>,gameplay?:GameplaySession)=>import('../engine/gameplay/access').AccessResult;
  /** Omit interactions outside their authored story stage. */
  available?: (flags: Readonly<Record<string, boolean>>) => boolean;
  id: string;
  x: number;
  /** The E prompt ("[E] BUY FISH"); a `price` is added to it ("· 1 TOKEN · YOU HAVE 7"). */
  label: string;
  /** Who speaks the answer (the bubble's name), unless `use` returns its own. */
  name: string;
  promptH?: number;
  h?: number;
  /**
   * What it costs now, in tokens (0 or none: nothing to pay this time; the florist charges only once
   * you ask). Tokens show only where you pay (Tommi, 2026-10-15): on the prompt and the popup.
   */
  price?: number | ((flags: Readonly<Record<string, boolean>>,gameplay?:GameplaySession) => number);
  /** Its words in the popup, when it opens one (what you carry is offered): default the label, lower case. */
  act?: string;
  /**
   * What it takes from what you carry: while you hold one, E opens a popup with these first ("give
   * the tea") and the use itself, three at most. `use` runs as the main one does; it takes the item
   * itself (`c.take`) or keeps it.
   */
  items?: SceneItemUse[];
  use: (c: UseCtx) => SceneSaid;
}

/** What a use says: lines in its own name, or another speaker's. */
export type SceneSaid = string[] | { name: string; pages: string[];conversation?:string };

/** Something you carry, used on a scene's use (the tea at the crane's call box). */
export interface SceneItemUse { item: ItemId; label: string; use: (c: UseCtx) => SceneSaid }

/** "1 TOKEN · YOU HAVE 7": a price where you pay (prompts upper case; popups lower it). */
export const priceTag = (n: number, have: number) => n + ' TOKEN' + (n === 1 ? '' : 'S') + ' · YOU HAVE ' + have;

/** What a scene's `use` gets: the player's tokens and flags, and a way to pay. */
export interface UseCtx {
  /** Scoped command/event session, where the scene opts into shared gameplay. */
  gameplay?: GameplaySession;
  tokens: number;
  /** Takes n tokens if the player has them (true), else nothing (false). */
  pay: (n: number) => boolean;
  /** Gives the player n tokens. */
  give: (n: number) => void;
  flags: Readonly<Record<string, boolean>>;
  set: (flag: string) => void;
  t: number;
  /** The weather here now (weather.ts), and the city clock's minute of the day (0–1439): for lines that change with them. */
  weather: WeatherKind;
  min: number;
  /**
   * What the player carries (the save's `items`, kept across scenes and reloads; shown where it is used):
   * `has` at least n of an item, `take` n if there are that many (true), else nothing (false),
   * `add` n (bought, given). Item ids and their names: `ITEMS`.
   */
  has: (item: ItemId, n?: number) => boolean;
  take: (item: ItemId, n?: number) => boolean;
  add: (item: ItemId, n?: number) => void;
}

/** Everything the player can carry, by id, with its name (the HUD's short "+ name" line when it comes). */
export const ITEMS = {
  'shift.tag': 'work tag',
  'shift.parcel': 'blue parcel',
  'shift.case': 'empty transport case',
  fish: 'fish',
  tea: 'tea',
  basil: 'basil leaf',
  blankchip: 'blank chip',
  blue: 'BLUE',
  crisps: 'crisps',
  noodlecup: 'noodle cup',
  gum: 'gum',
  soap: 'soap',
  /** Moth's maglev pass, from the jacket in washer 3 (P13); LINE 0's emergency brake asks for it (P14). */
  'maglev.pass': 'maglev pass',
} as const;
export type ItemId = keyof typeof ITEMS;

/**
 * A scene, complete: one walkable screen. Every place in the game is one (the
 * capsule, Downtown, the market, a metro platform, the car), with the same
 * capabilities: devices on the engine (`data`, `rules`; none: zero devices,
 * hack vision shows nothing to hack), people, uses, readables, exits and its
 * own drawing. Which place it belongs to is the city's data (city.ts).
 */
/** Registered scene artwork passes, shared by shipping Game and isolated editor Play/preview. */
export interface SceneArtworkFrame {
  city?:(ctx:CanvasRenderingContext2D,view:View)=>void;
  street?:(ctx:CanvasRenderingContext2D,view:View,rain:number,lit:boolean)=>void;
  reflections?:[number,string][];
}
export interface SceneDef {
  artworkFrame?:SceneArtworkFrame;
  /** Pure registered dockworker presentation, reading the current source's flag roles. */
  dockworkerCarry?:(flags:Readonly<Record<string,boolean>>)=>'parcel'|'case'|null;
  readonly nativeTargetBindings?:import('../engine/gameplay/native-targets').NativeTargetBindings;
  readonly presentationTargets?:readonly string[];
  /** Bind world controllers once per game; source definitions remain immutable. */
  bindWorld?(services:{city:CityModel;metro:LineSystem}):SceneDef;
  /** Registered cosmetic event binding; receives the same frame clock as artwork. */
  gameplayEvent?:(event:Readonly<import('../engine/gameplay/types').GameplayEvent>,frame:number)=>void;
  /** Validated shared commands, events and conversations; independent of artwork/device documents. */
  gameplay?: GameplayDefinition;
  /** Story objective for scenes without hacking goals. */
  attention?: (flags:Readonly<Record<string,boolean>>,state?:GameplayState)=>{x:number;gentle?:boolean}|null;
  storyDay?: (flags:Readonly<Record<string,boolean>>)=>number;
  storyMinute?: (flags:Readonly<Record<string,boolean>>)=>number;
  objectives?:readonly import('../engine/gameplay/objectives').ObjectiveDefinition[];
  objective?: (flags: Readonly<Record<string, boolean>>,state?:GameplayState) => string;
  id: string;
  /** Shown in the HUD. */
  name: string;
  width: number;
  /** Where you land without an exit to arrive at. */
  spawn: number;
  exits: SceneExit[];
  readables?: SceneReadable[];
  /** The people who live here (characters.ts). The scene draws them; the engine makes [E] TALK targets for those with `id` and `talk`. */
  people?: Character[];
  /** Scene actor artwork in its authored order, before companion/player drawing. */
  drawActors?:(ctx:CanvasRenderingContext2D,view:View)=>void;
  /** Things to do here with E (buy, haggle). */
  uses?: SceneUse[];
  /**
   * What the engine draws around the scene: `sky`, its stars and ships behind everything; `city`,
   * Downtown's skyline and street walls (game.ts); `street`, the wet street floor; `weather`, the
   * district's weather (weather.ts, sets/weather.ts): it is outdoors (rain, fog, smog, heat, puddles);
   * `covers`, roofs it doesn't rain under (a platform's canopy): world x from/to and the underside's height.
   */
  ambient?: { sky?: boolean; city?: boolean; street?: boolean; weather?: boolean; covers?: { from: number; to: number; under: number }[] };

  // ---------- light (TIME.md "Light"; ART-GUIDE §8; light.ts, sets/sky.ts, sets/lighting.ts) ----------

  /**
   * The compass direction the view looks toward (degrees: 0 north, 90 east, the sea). Sets where the
   * sun and the moon stand in this scene's sky and which way shadows fall. Interiors: where their
   * windows look out. Default 180.
   */
  facing?: number;
  /**
   * Outdoors (default: when `ambient.weather` or `ambient.sky`): the sky, the grade and cast shadows
   * apply. `false` for an interior, which gets the outside light through its windows (`drawPane`,
   * `windowShaft`).
   */
  outdoor?: boolean;
  /** The horizon's height over the ground (world units) for the engine's sky (`ambient.sky`); default 0. */
  horizon?: number;
  /** Light sources on the light layer (sets/lighting.ts `SceneLight`): lamps, windows, neon, screens. */
  lights?: SceneLight[];
  /** Key props that cast a shadow (people, robots and animals cast theirs anyway). */
  casters?: Caster[];
  /** The buildings that shade the street (shadows C): behind you, in front, with gaps. */
  shade?: Shade;
  /**
   * Places to sit or lie down and let time pass (TIME.md "Waiting"): E offers "wait until…" (the
   * next hour, dusk, night, morning). `bed` sleeps.
   */
  rests?: SceneRest[];
  /** What the player says on the first visit (save flag `scene:<id>`); a function when it depends on a touch screen. */
  intro?: string[] | ((touch: boolean) => string[]);
  /** Arriving keeps the way the player faces (an open street); otherwise they face into the scene. */
  keepFace?: boolean;
  /** Ledges to stand on (Downtown's low roof). */
  platforms?: { x: number; w: number; h: number }[];
  /** Track-world x of this station's stopped train nose. The timetable and door geometry share this marker. */
  platformStop?: number;
  /** Pixel: 'home' where it lives (`perch`: where it wants to be), 'along' where it follows you once it does. */
  pixel?: 'home' | 'along';
  perch?: (m: SceneModel) => Perch;
  companion?:CompiledCompanion;
  /** The engine's error lines buzz (Downtown's ACCESS DENIED, as the old terminal did). */
  buzz?: boolean;

  // ---------- on the engine ----------

  /** Its data file (devices, goals, texts). None: zero devices. */
  data?: SceneData;
  /** Its code: named effects and the rest (Downtown's are made for the player's save). */
  rules?: SceneRules | ((player: PlayerServices) => SceneRules);
  /** Panels besides the engine's `talk` (the yard's `camera`). Must match `rules.panels`. */
  panels?: Record<string, PanelFn>;
  /** Hack vision draws it in two passes: the world (muted), then the devices on top. Otherwise the game mutes round the devices' frames. */
  layers?: boolean;
  /** A device that takes no E for now (Downtown's gate once it stands open: the market's door takes its place). */
  hideDevice?: (id: string, flags: Readonly<Record<string, boolean>>) => boolean;
  /** Things to press E on besides the devices (a door its code locks, a pickup tray). */
  targets?(m: SceneModel): SceneTarget[];
  /** E on one of those. Return an exit's id (`engine` exits) to leave through it. */
  use?(id: string, m: SceneModel, say: (l: Line) => void): string | void;

  // ---------- drawing ----------

  /** Explicit presentation-controller step, after lighting is installed and before pure paint.
   * It may advance decorative pose history, never puzzle rules, player saves or progression.
   * The frame orchestrator calls this once (all, or devices when hack layers split).
   */
  preparePresentation?: (view: View, engine: EngineDraw) => void;
  /** Optional JSON capture/restore of decorative history for isolated, reproducible previews. */
  presentationState?: { capture(): Value; restore(value: Value): void };
  /** Read-only bindings for the prepared native frame, also used by editor selection geometry. */
  visualEnvironment?: (view: View, engine: EngineDraw) => Environment;

  /**
   * Everything behind the player: far, middle and play band, and the devices. `e` has the model,
   * the device under the pointer and, in hack vision, the layer: a scene that cannot split
   * draws everything for 'world' and nothing for 'devices'.
   */
  drawBackdrop: (x: CanvasRenderingContext2D, v: View, e: EngineDraw) => void;
  /** Foreground in front of the player (near pillars, passers-by). */
  drawFront?: (x: CanvasRenderingContext2D, v: View) => void;
}
