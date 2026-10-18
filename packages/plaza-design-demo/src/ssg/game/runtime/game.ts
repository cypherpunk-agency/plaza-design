import {DEMO_MODE} from './mode';
import {nativeStatePort} from '../engine/gameplay/native-bindings';
import {ConversationSession} from '../engine/gameplay/conversation';
import { gameStorage, reloadRuntime } from './storage';
import { drawCapsuleWash } from '../art/atmosphere/capsule-wash';
import { drawDockworker } from '../art/characters/dockworker';
import { prepareDockworker } from './dockworker';
import { drawPlayer } from '../art/characters/player';
import { createSkyShips,drawSkyShips,type Ship } from '../art/environment/sky-ships';
import { renderSceneFrame } from './render-scene';
import { GameplaySession } from '../engine/gameplay/session';
import { clearWorld } from '../art/core/canvas';
/**
 * ACCESS DENIED, the game: input, movement, camera and drawing. Every place is
 * a scene (scenes/: `SCENES`, one `SceneDef` each), and every scene is hosted
 * the same way on the hacking engine (engine/: `SceneHost`), devices or not:
 * this file walks you through it, draws the engine's sky, street and the
 * weather around it, and hands it taps, E, H (hack vision) and B (the board).
 * It runs the city clock (clock.ts: when it runs, travel, waiting, the opening's
 * pins) and asks the forecast (weather.ts) what the sky does in each scene.
 * Downtown artwork lives in art/assemblies/downtown.ts; this runtime supplies
 * its view. Dialogue and terminal behavior remain in level.ts.
 * Pixel the robot cat, who follows you once you leave the flat, is companion.ts.
 *
 * The canvas fills the landing page's window between its header and footer and
 * is drawn at an integer pixel scale so the sprites stay crisp.
 */

import { SMEARS, renderDowntownCity, renderDowntownStreet, renderDowntownPeople } from "../scenes/downtown/composition";
import { SPR } from "../art/core/sprites";
import { drawFlight,taxiSequenceDuration } from '../story/cutscenes/taxi';
import type { Handoff } from '../art/core/timeline';
import { KEYRING,NET,SCENE_FILES,type MachineData,type NetworkData } from "../data/index";
import { MAX_EVERYDAY } from "../engine/host";
import { CITY,NO_RULES,SceneHost } from "../engine/index";
import { SCAN } from "../engine/model";
import type { PopupItem } from "../engine/popup";
import { CAPSULE_SPAWN } from "../scenes/capsule/index";
import { fixerPrice,fixerTalk,npcTalk } from "../scenes/downtown/dialogue";
import { reconcile,sceneShell,syncGoals } from "../scenes/downtown/index";
import { NPCS,SPAWN_X,STALL } from "../scenes/downtown/layout";
import { shiftAttention,shiftCarry,shiftMinute } from "../scenes/harbor-shift/index";
import { isSceneId,ITEMS,priceTag,SCENES,sceneTitle,type ItemId,type SceneDef,type SceneExit,type SceneId,type SceneRest,type SceneSaid,type SceneUse,type SceneView,type UseCtx } from "../scenes/index";
import { PARCEL } from "../scenes/yard/index";
import { messagesOf,unread } from "../story/contacts";
import { cutsceneById,CutscenePlay,isCutsceneId,type CutsceneId } from "../story/cutscenes/index";
import {
DECK_BEFORE,
hackLocked,
HOME_RUN,IDLE_PING,isBefore,
MORNING,MOTH_MESSAGE,OPENING,OPENING_EVERYDAY,OPENING_EXITS,OPENING_GOAL,OPENING_INTRO,
OPENING_LINES,OPENING_PINGS,OPENING_TARGETS,OPENING_TIME,openingLevel,openingResume,openingState,pick,SLEEP,TURNSTILE,UPLINK_KEY,UPLINK_LINES,WAKE_LINES,
type ExitRule,type OpeningState,type PingTarget,
} from "../story/opening";
import { Opening } from "../story/title/index";
import { drawCityMap,mapKey,mapPointer,openMap,type MapAct,type MapState,type MapView } from "../ui/citymap";
import { KeyBar } from "../ui/keybar";
import { Menu } from "../ui/menu";
import { drawNetMap,netKey,netPointer,openNet,type MachineState,type NetAct,type NetState,type NetView } from "../ui/netmap";
import { ShiftGuidance } from "../ui/shift-guidance";
import { levels,startLevel,SUDO,unlockAll } from "../ui/sudo";
import { Terminal,type LineKind } from "../ui/terminal";
import { commands,NO_ARGS,run,suggest,type Ctx } from "../ui/terminal/commands";
import { ClockBar,Transport } from "../ui/transport";
import { DRIVER_BROKE,DRIVER_HARBOR,FARE,harborOpen,HOP,LINE,placeBlocked,seenFlag,SIDING_OUT,standOf,STANDS,START_SCENE,stationAt,STATIONS,type MapPlace,type Stand,type Station } from '../world/city';
import { city,parseHM,TRAVEL,WAIT_CARD,WAITS,type WaitTo } from "../world/clock";
import { lightAt,setLight,type Light } from "../world/light";
import { frameView } from '../art/core/view';
import {
boardRide,lineOpen,nextStation,
platformDoors,platformLeft,platformOpen,platformSync,
ride,
rideAtSiding,rideLeft,rideNext,rideOpen,rideRun,rideStop,
SEG,
stepRide,STOP,TIMETABLE,
} from "../world/transport/line";
import { reportLines,sceneClimate,setHereClimate,weatherNow,type Weather } from "../world/weather";
import { sound } from './audio';
import { botReact,characterHeight,characterX,isBot,isHere,talkTo } from './characters';
import { Companion,WARM } from './companion';
import { EDITOR_PLAY,SAVE_KEY,SHIFT_PROTOTYPE } from "./mode";
import { loadSave,newSave,nodeCount,ownedModules,storeSave,who,type Save } from "./save";

/** What petting a scene's cat, or shooing its pigeon, gets you. */
const PET_CAT = [
  ['The cat allows it. Then it decides it did not, and leaves.'],
  ['The cat purrs, which is a lot of commitment from a street cat.'],
  ['The cat sniffs your hand, finds no fish, and looks betrayed.'],
];
const PET_PIGEON = [
  ['The pigeon takes one step to the side. Exactly one.'],
  ['The pigeon flaps, lands a metre away, and looks at you like you started it.'],
];

/**
 * Something to press E on: a way out (`exit`), the scene's life (`life`: a readable, a use, someone
 * to talk to, an animal, a robot), a device or the scene's own target on the engine (`device`),
 * Pixel (`pixel`), and Downtown's street people and the fixer (`talk`, level.ts).
 */
type Target = { kind: 'exit' | 'life' | 'device' | 'pixel' | 'talk'; id: string; x: number; h: number; label: string; promptH?: number };
/** A speech bubble; `then` runs once its last page is read (the fixer's question opens the deck). */
interface Bubble { name: string; pages: string[]; page: number; chars: number; x: number; h: number; then?: () => void }


/** A tap on the canvas is E on a target this close to it (world units), within this reach of the player. */
const TAPPED = 18, TAP_REACH = 60;
/** Save flag: the net map has been opened once (NET stops pinging). */
const NET_OPENED = 'net:opened';

/** Small seeded random, so the city looks the same on every visit. */

export interface GameHost {
  windowEl: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  inputHost: HTMLElement;
  onExit: () => void;
  setNodes: (n: number) => void;
  setScene: (text: string) => void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private term: Terminal;
  private save: Save = SUDO && !SHIFT_PROTOTYPE ? unlockAll(loadSave()) : loadSave();
  private k = 2;
  private viewW = 640;
  private viewH = 320;
  private gy = 270;
  private cam = 0;
  private t = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private keys = new Set<string>();
  private p = { x: SPAWN_X, y: 0, vy: 0, face: 1, onGround: true, moving: false };
  private bubble: Bubble | null = null;
  private showEnd = false;
  private toast: { text: string; until: number } | null = null;
  private touch = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } })();
  private ships: Ship[] = [];
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  /** The scene the player is in. */
  private here: SceneId = 'downtown';
  /** Every key and what it does, along the top. */
  private keyBar: KeyBar;
  private shiftGuidance?: ShiftGuidance;
  /** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */
  private hosts = new Map<SceneId, SceneHost>();
  private gameplaySessions = new Map<SceneId, GameplaySession>();
  private gameplayFor(id:SceneId):GameplaySession|undefined {
    const definition=(this.content[id] ?? SCENES[id]).gameplay;
    if(!definition)return undefined;
    let session=this.gameplaySessions.get(id);
    if(!session){
      const port:import('../engine/gameplay/types').StatePort={
        read:()=>({flags:{...this.save.flags,...Object.fromEntries(Object.entries((this.content[id]??SCENES[id]).gameplayReads??{}).map(([flag,key])=>[flag,!!(this.hosts.get(id)?.model.value(key)??this.save.scenes[id]?.state?.[key])]))},items:this.save.items,tokens:this.save.tokens,values:this.save.gameplay}),
        write:state=>{this.save.flags=state.flags;this.save.items=state.items;this.save.tokens=state.tokens;this.save.gameplay=state.values;for(const flag of Object.keys((this.content[id]??SCENES[id]).gameplayReads??{}))delete this.save.flags[flag];},
      };
      const model=()=>{const m=this.hosts.get(id)?.model;if(!m)throw new Error('Native scene not ready');return m;};
      session=new GameplaySession(definition,definition.native?nativeStatePort(definition,port,model):port,()=>{
        if(definition.native){const m=model(),snapshot=m.snapshot(),board=this.save.scenes[id]?.board;this.save.scenes[id]={...snapshot,...(board?{board}:{})};m.changed();}
        storeSave(this.save);this.syncHud();
      });
      this.gameplaySessions.set(id,session);
    }
    return session;
  }
  /** Pixel the robot cat: at home in the flat, at your heels outside once you have left it (`flags.pixel`). */
  private pixel = new Companion();
  private started = false;
  /** Frames since the game started; runs even with reduced motion (rides and flights are timed on it). */
  private clock = 0;
  /** The city map overlay (citymap.ts), when open: just looking (TAB, the kiosk), or picking a taxi stand. */
  private mapView: MapView | null = null;
  /** A quick trip from the map in progress: a short fade out, the move, a fade in (HOP frames). */
  private hop: { place: MapPlace; start: number; done: boolean } | null = null;
  /** A sky-taxi flight in progress. */
  private flight: { to: Stand; start: number } | null = null;
  /** The net map (netmap.ts), when open; `netBack`: hack vision was on when it opened (it comes back on close). */
  private netView: NetView | null = null;
  private netBack = false;

  constructor(private host: GameHost, private content: Partial<Record<SceneId, SceneDef>> = {}, private editorClock:'story'|'fixed'|'running'='story',private restricted=false) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    if (this.touch) this.term.onLine = (text, kind) => { if (kind !== 'head') this.termLine = { text: text.split('\n').pop() ?? text, kind, until: this.t + 300 }; };
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length) return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => this.canvas.focus();

    this.keyBar = new KeyBar(host.windowEl, () => this.canvas.focus());
    if (SHIFT_PROTOTYPE) this.shiftGuidance = new ShiftGuidance(host.windowEl, this.reduced, wx => {
      this.zh.clearPing('goal');
      this.goalAt = wx;
      if (wx !== null) this.zh.ping('goal', 'look');
    }, flags=>this.def.attention?this.def.attention(flags):shiftAttention(flags,this.def.uses), flags=>this.def.objective?.(flags)??'');
    // the fixer's parcel holds Moth's key chip and uplink.so: a save that took it before they were in it gets them now
    if (this.hostOf('yard').model.get('parcelAt') === 'taken') PARCEL.forEach((k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); });
    // Downtown keeps most of its progress in the save's own fields: its devices agree with them
    reconcile(this.downtown.model, this.save);
    this.menu = new Menu(host.windowEl, {
      save: () => this.save,
      scene: () => ({ id: this.here, name: sceneTitle(this.def) }),
      newGame: () => this.newGame(),
      continueGame: () => this.continueGame(undefined, true),
      hasSave: () => this.hasSave(),
      quit: () => host.onExit(),
      // the city map lives in the menu too (TAB and M still open it on a keyboard)
      ...(!SHIFT_PROTOTYPE ? { map: () => this.showMap() } : {}),
      onClose: () => { this.syncEnginePause(); this.canvas.focus(); },
      ...(SUDO && !SHIFT_PROTOTYPE ? { levels, enter: (id: string) => this.enterLevel(id) } : {}),
    }, this.touch);
    // sudo: the time control over the title's sunrise, the glide and cutscenes (transport.ts); in a scene, the city clock's
    if (SUDO && !SHIFT_PROTOTYPE) {
      this.transport = new Transport(host.windowEl);
      this.clockBar = new ClockBar(host.windowEl, () => sceneClimate(this.here), () => this.syncClock(true));
    }
    // the city clock: the save's, and what every scene's conditions read of the city (engine/model.ts CITY)
    city.bind(this.save.clock);
    CITY.read = (key, scene) => (key === 'weather' ? this.weatherOf(scene).kind : key === 'hour' ? city.hour : city.day);
    CITY.when = (w) => city.within(w);
    // the footer's timestamp shows the city's time while the game runs (render.tsx hides the page's UTC clock)
    const stampHost = host.footer.querySelector('.footer-timestamp');
    this.stampEl = document.createElement('span');
    this.stampEl.id = 'game-clock';
    stampHost?.appendChild(this.stampEl);
    // a click or tap during the title's sunrise skips to the settled shot (on click, not pointerdown:
    // the menu comes up under the finger, and the release must not land on it)
    this.canvas.addEventListener('click', () => { if (this.opening && !this.opening.gliding && !this.opening.risen) this.skipRise(); });
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e, true));
    this.canvas.addEventListener('pointermove', (e) => this.onCanvasPointer(e, false));
    // hack vision: drag pans, pinch and the wheel zoom (visionPointer)
    const lift = (e: PointerEvent) => this.visionLift(e);
    this.canvas.addEventListener('pointerup', lift);
    this.canvas.addEventListener('pointercancel', lift);
    this.canvas.addEventListener('wheel', (e) => this.visionWheel(e), { passive: false });

    this.ships = createSkyShips();


    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  /**
   * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
   * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
   */
  private hostOf(id: SceneId): SceneHost {
    const had = this.hosts.get(id);
    if (had) return had;
    const def: SceneDef = this.content[id] ?? SCENES[id];
    const print = def.buzz ? (text: string, kind?: LineKind) => this.buzzPrint(text, kind) : (text: string, kind?: LineKind) => this.term.print(text, kind);
    const rules = typeof def.rules === 'function' ? def.rules({
      save: () => this.save,
      persist: () => this.persist(),
      nodes: () => nodeCount(this.save),
      granted: () => sound.granted(),
      end: () => { this.showEnd = true; },
      // a story beat's cutscene (the stacks' ACT II card) waits for the screen to be free (`loop`)
      cutscene: (cut) => { this.pendingCut = cut; },
      // another scene's state: its live model if it is hosted, else its save
      sceneState: (scene, key) => this.hosts.get(scene as SceneId)?.model.get(key) ?? this.save.scenes[scene]?.state?.[key],
    }) : def.rules ?? NO_RULES;
    const zh = new SceneHost(this.host.windowEl, print, {
      gameplay:()=>this.gameplayFor(id),
      conversation:(conversationId)=>{const session=this.gameplayFor(id);return session?.definition.conversations[conversationId]?new ConversationSession(session,conversationId):undefined;},
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); storeSave(this.save); },
      // scene steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => { if (!this.save.modules.includes(mod)) this.save.modules.push(mod); storeSave(this.save); this.syncHud(); },
      tokens: (n) => { this.save.tokens += n; storeSave(this.save); this.syncHud(); return this.save.tokens; },
      // what you carry (the HUD's HELD) and story flags, for scene effects (the laundromat's jacket)
      carry: (item, n) => {
        const now = Math.max(0, (this.save.items[item] ?? 0) + n);
        if (now) this.save.items[item] = now; else delete this.save.items[item];
        if (n) { storeSave(this.save); this.syncHud(); }
        return now;
      },
      flag: (f) => { this.save.flags[f] = true; storeSave(this.save); },
      drop: () => storeSave(this.save),
      sudo: SUDO,
      // the net (NET.md): programs you own (scan.so), and the nodes that answer to you
      programs: () => this.save.programs,
      program: (p) => this.grantProgram(p),
      controlled: () => this.save.controlled,
      load: () => this.save.scenes[id],
      store: (z) => { this.save.scenes[id] = z; storeSave(this.save); },
    }, def, rules);
    // Pixel is the game's, not the scene's: lines about Pixel stand over Pixel, and popups keep clear of the cat
    zh.where = (from) => (from === 'pixel' && this.pixelHere ? { x: this.pixel.x, h: this.pixel.h } : from === 'goal' && this.goalAt !== null ? { x: this.goalAt, h: 20 } : null);
    // the opening (opening.ts): hacking is not yours until uplink.so, and some everyday actions say something else
    zh.hackLock = () => hackLocked(this.save.flags);
    zh.story = (dev) => this.storyChips(id, dev);
    zh.extras = () => (this.pixelHere ? [{ x: this.pixel.x, h: this.pixel.h }] : []);
    // captions never cover the player's speech bubble, and keep their lane over people's heads
    zh.shield = () => { const b = this.bubbleBox, s = this.cssScale; return b ? [{ l: b.x * s, t: b.y * s, r: (b.x + b.w) * s, b: (b.y + b.h) * s }] : []; };
    zh.crowd = () => this.heads();
    // something reacted where you cannot see it: the camera may lean that way for a moment
    zh.onReact = (from, text, tone) => { if (this.here === id) this.nudgeTo(from, text, tone); };
    zh.onClose = () => this.canvas.focus();
    // hack vision: the reset button and what the LOGIC drawer says you own (the HUD keeps only the goal there)
    zh.onResetView = () => this.resetVision();
    zh.onVisionUi = () => this.syncModeUi();
    zh.drawerInfo = () => this.ownLine();
    // NET in hack vision's bar: once scan.so is yours, pinging until the net map has been opened once
    zh.netOk = () => this.netOk;
    zh.netNew = () => !this.save.flags[NET_OPENED];
    zh.onNet = () => this.showNet();
    if(EDITOR_PLAY)zh.model.enableInspection();
    this.hosts.set(id, zh);
    zh.setPaused(this.enginesPaused);
    // each scene host has its own HACK/BOARD strip, in the key bar; only the current scene's shows
    this.host.windowEl.querySelectorAll<HTMLElement>('#scene-btns').forEach((el) => this.keyBar.adopt(el));
    return zh;
  }

  /** A scene's lines in the deck that buzz (Downtown's ACCESS DENIED and friends), as the old terminal did. */
  private buzzPrint(text: string, kind?: LineKind) {
    this.term.print(text, kind);
    if (kind === 'err') sound.denied();
  }

  /** The scene the player is in: its definition, and its host on the engine. */
  private get def(): SceneDef { return this.content[this.here] ?? SCENES[this.here]; }
  private get zh(): SceneHost { return this.hostOf(this.here); }
  /** Downtown's host: its goals follow the save's own fields. */
  private get downtown(): SceneHost { return this.hostOf('downtown'); }

  /** Write the save, refresh the HUD and Downtown's goals (they follow the save's fields). */
  private persist() {
    storeSave(this.save);
    this.syncHud();
    syncGoals(this.downtown.model, this.save);
  }

  /** Pause puzzle time wherever a full-screen interruption holds the world. Wall-clock locks still expire. */
  private get enginesPaused() {
    return !this.running || !!this.opening || !!this.menu?.open || !!this.cut || !!this.mapView || !!this.netView;
  }

  private syncEnginePause() { this.hosts.forEach((h) => h.setPaused(this.enginesPaused)); }

  // ---------- lifecycle ----------

  /**
   * Start the game. `title`: launching it (the Konami code, `?play` or `?sudo` without a scene):
   * the title screen first (title/). A scene, a cutscene or a LOAD GAME reload goes straight there.
   */
  start(scene?: SceneId | CutsceneId, title = false) {
    this.canvas.hidden = false;
    this.canvas.tabIndex = 0;
    this.onResize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    this.syncHud();
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame((n) => this.loop(n));
    this.canvas.focus();
    if (scene && isCutsceneId(scene)) { this.playCutscene(scene); return; }
    if (title) { this.showTitle(); return; }
    const first = !this.started;
    this.started = true;
    this.continueGame(scene && isSceneId(scene) ? scene : undefined, first);
  }

  /**
   * Into the save (the title's CONTINUE, or a start in a scene). A save in the middle of the
   * saved scene takes precedence; older saves fall back to opening.ts or Downtown/the first scene.
   */
  private continueGame(scene: SceneId | undefined, first: boolean) {
    this.endTitle();
    if(DEMO_MODE)scene=(scene&&this.content[scene]?scene:this.save.scene&&this.content[this.save.scene as SceneId]?this.save.scene as SceneId:'library');
    this.started = true;
    const resume = !scene && first ? openingResume(this.save.flags) : null;
    if (!scene && first && this.save.scene && isSceneId(this.save.scene) && (this.save.scene !== 'sandbox' || SUDO)) scene = this.save.scene;
    else if (resume) scene = resume;
    else if (!scene && first && !this.save.flags.arrived && !this.save.flags[seenFlag('downtown')]) {
      // a save that never got going: the opening, on the train home (no glide: that is NEW GAME's)
      if (!this.save.flags[seenFlag(START_SCENE)]) { this.startOpening(); return; }
      scene = START_SCENE;
    }
    if (scene && this.here !== scene) this.enter(scene, true);
    this.showHost();
    this.markSeen(this.here);
    this.greet();
  }

  /** Is there a run to continue: a stored save that has been played? */
  private hasSave() {
    try {
      const raw = gameStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw) as Partial<Save>;
      return (s.playMs ?? 0) > 0 || Object.keys(s.flags ?? {}).length > 0;
    } catch { return false; }
  }

  // ---------- the opening: the title screen and the glide (title/) ----------

  /** The title shot and the glide, while they run: the world is not drawn or stepped. */
  private opening: Opening | null = null;

  /** Sudo's time control (transport.ts); null without `?sudo`. */
  private transport: Transport | null = null;

  /**
   * The title screen: the sun comes up out of the sea, then the main menu pops in over it
   * (`stepOpening`; reduced motion: settled, menu up at once). `gliding`: straight into the glide
   * from the settled shot (NEW GAME from the pause menu).
   */
  private showTitle(gliding = false) {
    this.endCutscene(false);
    this.bubble = null;
    this.keys.clear();
    this.hosts.forEach((h) => h.closeAll());
    this.term.close();
    this.opening = new Opening(this.reduced);
    this.syncEnginePause();
    document.documentElement.classList.add('cutscene');
    this.host.setScene('ACCESS DENIED');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: a sunrise over the sea');
    if (gliding) { this.menu.hide(); this.newGame(); } else if (this.opening.risen) this.menu.showTitle(); else this.menu.hide();
  }

  /** Any key or click while the sun comes up: the settled shot, and the menu with it. */
  private skipRise() {
    const o = this.opening;
    if (!o || o.gliding || o.risen) return;
    o.skipRise();
    this.menu.showTitle(true);
  }

  private endTitle() {
    if (!this.opening) return;
    this.opening = null;
    document.documentElement.classList.remove('cutscene');
    this.syncHud();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
  }

  private stepOpening(dt: number) {
    const o = this.opening!;
    o.step((dt / 60) * (this.transport?.rate ?? 1));
    // the title's menu is up exactly while the sun has settled (sudo can seek back into the sunrise)
    if (!o.gliding) {
      if (o.risen && !this.menu.open) this.menu.showTitle(true);
      else if (!o.risen && this.menu.open) this.menu.hide();
    }
    this.transport?.sync();
    const x = this.x;
    x.setTransform(this.k, 0, 0, this.k, 0, 0);
    x.imageSmoothingEnabled = false;
    o.draw(x, this.viewW, this.viewH);
    if (o.done) this.openingDone();
  }

  /**
   * The glide has gone into the tunnel: the handover (title/index.ts). A fresh save, then
   * `startOpening()`: `opening:home`, the train home (car 3) on its run into Downtown.
   */
  private openingDone() {
    const destination = this.opening?.handoff;
    this.endTitle();
    this.term.close();
    this.term.clear();
    this.bubble = null;
    this.showEnd = false;
    this.toast = null;
    this.save = SUDO ? unlockAll(newSave()) : newSave();
    city.bind(this.save.clock);
    // every scene's runtime back to a first visit, written into the new save (Downtown then agrees with its fields)
    this.hosts.forEach((h) => h.reset());
    reconcile(this.downtown.model, this.save);
    storeSave(this.save);
    this.syncHud();
    this.started = true;
    // the story half of the opening takes over: `opening:home`, the train home (opening.ts)
    this.startOpening(destination);
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  private greet() {
    // (before you are deleted, the street is not yet the one you have to fight)
    if (this.here !== 'downtown' || hackLocked(this.save.flags)) return;
    const how = this.touch
      ? 'Every machine here does something: tap it. HACK, bottom right, shows how they all work.'
      : 'Every machine here does something: E or a tap. H shows how they all work, B is the board.';
    if (!this.save.flags.arrived) {
      this.save.flags.arrived = true; this.save.flags.schematics = true;
      const wet = this.weatherHere().rain > 0.2;
      const pages = [wet ? 'Downtown. Rain, neon, and nobody who sees me.' : 'Downtown. Neon, wet streets, and nobody who sees me.', 'The noodle stall is still lit. Worth a try.', how];
      if (this.save.flags.pixel) pages.splice(1, 0, 'Pixel came along. Nobody asked Pixel. Nobody ever does.');
      this.say('YOU', pages, this.p.x, 46);
    } else if (!this.save.flags.schematics) {
      this.save.flags.schematics = true;
      this.say('YOU', ['My deck sees this street differently now.', how], this.p.x, 46);
    }
  }

  /** The HACK and BOARD buttons belong to the scene you are in. */
  private showHost() {
    const here = this.zh;
    this.hosts.forEach((h) => h.show(h === here));
  }

  checkpoint(){this.hosts.forEach(host=>host.persist());storeSave(this.save);}

  /** Detached diagnostics for editor inspection; no mutable runtime references. */
  inspect() {
    const shared=this.gameplayFor(this.here);
    return structuredClone({scene:this.here, player:{x:this.p.x,y:this.p.y}, save:this.save,
      engine:EDITOR_PLAY?this.zh.model.inspect():undefined,
      gameplay:shared?{state:shared.state(),purchases:Object.fromEntries(Object.keys(shared.definition.purchases??{}).map(id=>[id,shared.quote(id)]))}:null,conversation:this.zh.conversationFrame,
      environment:{weather:this.weatherHere().kind,clock:this.editorClock},
      objective:this.def.objective?.(this.save.flags), paused:this.enginesPaused,
      dialogue:this.bubble?{speaker:this.bubble.name,pages:this.bubble.pages,page:this.bubble.page}:null, popup:this.zh.popupOpen,
      events:[...this.gameplaySessions].flatMap(([scene,session])=>session.events().map(event=>({scene,...event}))) });
  }

  stop() {
    this.running = false;
    this.gameplaySessions.forEach(session=>session.dispose());
    this.gameplaySessions.clear();
    this.shiftGuidance?.hide();
    this.syncEnginePause();
    this.endTitle();
    document.documentElement.classList.remove('game-map', 'hack-ok', 'hack-on', 'logic-open', 'unfold-on');
    this.modeKey = '';
    this.menu.hide();
    this.endCutscene(false);
    this.transport?.attach(null);
    this.clockBar?.show(false);
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.keys.clear();
    this.mapView = null;
    this.netView = null;
    this.netBack = false;
    this.hosts.forEach((h) => { h.closeAll(); h.persist(); });
    this.term.close();
    this.canvas.hidden = true;
    storeSave(this.save);
  }

  private onResize() {
    const win = this.host.windowEl.getBoundingClientRect();
    // a hidden header or footer (phones) takes no room
    const shown = (el: HTMLElement) => el.getClientRects().length > 0;
    const top = shown(this.host.header) ? this.host.header.getBoundingClientRect().bottom - win.top : 0;
    const bottom = shown(this.host.footer) ? win.bottom - this.host.footer.getBoundingClientRect().top : 0;
    this.host.windowEl.style.setProperty('--game-top', top + 'px');
    this.host.windowEl.style.setProperty('--game-bottom', bottom + 'px');
    const cssW = win.width, cssH = Math.max(120, win.height - top - bottom);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // Small screens (phones in landscape) show a shorter slice of the street at a larger scale (tuned: leave as is).
    // Larger screens take the integer scale nearest to a view about 300 units tall (so 1280×720 draws at 2,
    // not 1, and people read), but never under 240 units, so wide places still show enough.
    const px = cssH * dpr, phone = cssH < 420;
    let k = phone ? Math.max(1, Math.floor(px / 230)) : Math.max(1, Math.round(px / 300));
    if (!phone && k > 1 && px / k < 240) k--;
    // A place narrower than the view (a flat, the yard) is shown closer, so it fills the width,
    // as long as enough height stays in view for its rooms and signs.
    const fit = Math.floor(this.canvas.width / (this.levelW + 24));
    if (fit > k) k = Math.max(k, Math.min(fit, Math.floor(this.canvas.height / 170)));
    this.k = k;
    this.fitW = this.levelW;
    this.viewW = this.canvas.width / this.k;
    this.viewH = this.canvas.height / this.k;
    // On phones the ground sits above the touch buttons, so the floor and what stands on it stay in view.
    const pad = document.getElementById('touch');
    const padTop = this.touch && pad ? Math.max(0, this.canvas.getBoundingClientRect().bottom - pad.getBoundingClientRect().top) : 0;
    this.gy = Math.round(this.viewH - Math.max(54, (padTop * dpr) / this.k + 8));
  }

  /** The level width the view was fitted to; a new place refits (see onResize). */
  private fitW = 0;
  /** How often the player has petted a scene's animals (which line comes next). */
  private petCount = 0;

  private loop(now: number) {
    if (!this.running) return;
    this.syncEnginePause();
    const dt = this.last ? Math.min(3, (now - this.last) / 16.67) : 1;
    this.last = now;
    // sudo's time control follows whatever timed picture is up (none: it hides); in a scene, the city clock's bar
    this.transport?.attach(this.opening?.timeline ?? this.cut?.timeline ?? null);
    this.clockBar?.show(!this.opening && !this.cut && !this.menu.open && !this.term.focused);
    // The title and the glide: their own picture, with the title's menu over it.
    if (this.opening) { this.stepOpening(dt); this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // The pause menu: the world holds still under it (the last frame stays on the canvas).
    if (this.menu.open) { this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    this.save.playMs = (this.save.playMs ?? 0) + dt * 16.67;
    if (this.levelW !== this.fitW) this.onResize(); // a new place: fit the view to it
    // the city map (and a taxi flight) owns the screen: the key bar and touch buttons step aside (render.tsx)
    document.documentElement.classList.toggle('game-map', !!this.mapView || !!this.flight || !!this.netView);
    this.visionCamera();
    this.syncModeUi();
    if (this.cut) { this.stepCutscene(dt); this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // a story beat asked for a cutscene: it plays once nothing is open (the talk that asked for it has closed)
    if (this.pendingCut && !this.zh.overlayOpen && !this.zh.popupOpen && !this.bubble && !this.mapView && !this.term.focused) {
      const id = this.pendingCut;
      this.pendingCut = null;
      this.playCutscene(id, () => this.inbox());
    }
    if (!this.reduced || this.t < 1) this.t += dt;
    this.clock += dt;
    // the city clock: the opening's pins, then a tick if it runs here and now (clock.ts)
    this.pinStory();
    if (this.clockRuns()) city.tick(dt / 60);
    this.syncClock();
    this.update(dt);
    this.shiftGuidance?.update(this.save.flags, dt / 60,
      !!this.bubble || !!this.zh.popupOpen || !!this.zh.overlayOpen,
      this.p.moving, this.p.x);
    this.checkGain();
    this.draw();
    this.followHost();
    this.raf = requestAnimationFrame((n) => this.loop(n));
  }

  // ---------- input ----------

  private onKeyDown(e: KeyboardEvent) {
    // sudo's time control takes its keys first (Space stays the title menu's while it is up)
    if ((this.opening || this.cut) && !this.term.focused && this.transport?.key(e, !!this.opening && this.menu.open)) return;
    // the title takes the menu's keys; a key while the sun comes up skips to the menu; the glide cannot be skipped
    if (this.opening) {
      if (this.menu.open && !this.term.focused) this.menu.key(e);
      else { e.preventDefault(); if (!e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) this.skipRise(); }
      return;
    }
    if (this.cut) { e.preventDefault(); if (!e.repeat) this.cut.skip(); return; }
    if (this.menu.open) { if (!this.term.focused) this.menu.key(e); return; }
    if (this.term.focused) return;
    if (this.flight || this.hop) { e.preventDefault(); return; }
    if (this.netView) { this.netKeyDown(e); return; }
    if (this.mapView) { this.mapKey(e); return; }
    const zh = this.zh;
    if (zh && zh.overlayOpen) {
      if (e.key === 'Escape') { e.preventDefault(); zh.closeOverlay(); }
      else if (e.key === 'b' || e.key === 'B') zh.toggleBoard();
      else if ((e.key === 'h' || e.key === 'H') && !e.repeat) zh.toggleVision();
      return;
    }
    // a thing's popup takes arrows, Enter / E and Esc; any other key closes it and goes on as usual
    if (zh && zh.popupOpen && zh.popupKey(e)) return;
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    if (e.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) return;
    if (this.showEnd) {
      if (k === 'Escape') { this.showEnd = false; this.openMenu(); }
      else if (k === 'Enter' || k === 'e' || k === 'E') this.showEnd = false;
      return;
    }
    if (k === 'Escape') {
      if (this.bubble) { this.bubble = null; return; }
      if (zh && zh.visionOn) { zh.toggleVision(); return; }
      // Nothing left to close: the pause menu (QUIT TO HOMEPAGE leaves the game).
      this.openMenu();
      return;
    }
    // while someone is talking, Enter and Space go on with the talk (as E does); otherwise Enter opens the deck (the terminal)
    if ((k === 'Enter' || k === ' ') && this.bubble) { e.preventDefault(); this.interact(); return; }
    if (k === 'Enter') { e.preventDefault(); this.openDeck(); return; }
    // the deck's map app: the city as far as you know it
    if (k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); this.showMap(); return; }
    // B and H mean something only where there is something to hack (a scene with devices)
    if (zh.hackable && (k === 'b' || k === 'B')) { zh.toggleBoard(); return; }
    if (zh.hackable && (k === 'h' || k === 'H')) { zh.toggleVision(); return; }
    // hack vision's own keys: L the logic drawer, U every circuit unfolded, 0 the normal view
    if (zh.visionOn && (k === 'l' || k === 'L')) { zh.toggleLogic(); return; }
    if (zh.visionOn && (k === 'u' || k === 'U')) { zh.toggleUnfold(); return; }
    // N: the net map, once scan.so is yours
    if ((k === 'n' || k === 'N') && this.netOk) { this.showNet(); return; }
    if (zh.visionOn && k === '0') { this.resetVision(); return; }
    if (k === 'e' || k === 'E') { this.interact(); return; }
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble) this.jump();
    this.keys.add(k.length === 1 ? k.toLowerCase() : k);
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key;
    this.keys.delete(k.length === 1 ? k.toLowerCase() : k);
    if (k === 'Shift') this.keys.delete('Shift');
  }

  private openDeck() {
    if (SHIFT_PROTOTYPE) return;
    if (!this.term.out.childElementCount) this.term.print('[DECK] ' + who(this.save) + ' · type help', 'head');
    const at = hackLocked(this.save.flags) ? null : this.termMachine();
    if (at) this.term.print('[' + (this.zh.model.devices.get(at)?.name ?? at) + '] the deck talks to it · ls, cat, login, use', 'dim');
    this.term.focus();
  }

  /** The machine the deck talks to: the scene's device whose schematic is open, else the one you stand at. */
  private termMachine(): string | null {
    const zh = this.zh;
    if (zh.viewing) return zh.viewing;
    const t = this.nearest();
    return t?.kind === 'device' && zh.model.devices.has(t.id) ? t.id : null;
  }

  private jump() {
    if (SHIFT_PROTOTYPE) return;
    if (!this.save.jump) { this.flash('[ERR] legs.so not found'); sound.denied(); return; }
    if (!this.p.onGround) return;
    this.p.vy = 4.6;
    this.p.onGround = false;
    sound.jump();
  }

  // ---------- pause menu (menu.ts) ----------

  private menu: Menu;

  /** Esc with nothing else open: pause and show the menu. Progress is written first. */
  private openMenu() {
    this.keys.clear();
    this.p.moving = false;
    this.zh.persist();
    storeSave(this.save);
    this.menu.show();
    this.shiftGuidance?.hide();
    this.syncEnginePause();
  }

  /**
   * NEW GAME (the title's, or confirmed in the pause menu): the opening's glide. Nothing is reset
   * until it hands over (`openingDone`): leave mid-glide and the old run is still there. Slots are untouched.
   */
  private newGame() {
    if (EDITOR_PLAY || SHIFT_PROTOTYPE||DEMO_MODE) {
      gameStorage.removeItem(SAVE_KEY);
      reloadRuntime();
      return;
    }
    if (!this.opening) { this.showTitle(true); return; }
    this.opening.go();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: the coast at sunrise, from the sea west to Downtown and LINE 0');
  }

  private flash(text: string) { this.toast = { text, until: this.t + 110 }; }
  /** Phones have no terminal: its latest line shows in the game for a few seconds. */
  private termLine: { text: string; kind: LineKind; until: number } | null = null;

  private get levelW() { return this.def.width; }
  /** The scene's name, for the HUD and the canvas label. */
  private get placeName() { return this.def.name; }
  private get platforms() { return this.def.platforms ?? []; }

  /**
   * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
   * Pixel comes along where it follows you, or is at home; the first visit has the player say a few words.
   */
  private enter(id: SceneId, quiet = false, at?: string) {
    if((DEMO_MODE||this.restricted)&&!this.content[id]){this.flash('This route is outside the Test District.');return;}
    if (SHIFT_PROTOTYPE) id = 'harborShift';
    const s: SceneDef = this.content[id] ?? SCENES[id];
    this.zh.persist();
    this.hosts.forEach((h) => h.closeAll());
    this.bubble = null;
    this.here = id;
    this.nudge = null; this.easeBack = false; this.nudged.clear();
    this.hostOf(id);
    this.showHost();
    this.markSeen(id);
    const x = (at && s.exits.find((e) => e.id === at)?.x) || s.spawn;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: s.keepFace ? this.p.face : x > s.width / 2 ? -1 : 1 });
    this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
    this.syncHud();
    setHereClimate(sceneClimate(id));
    if (!quiet) sound.open();
    // Pixel: at home (coming in behind you through the door, or already asleep there), at your heels where it follows you
    if (s.perch) {
      const home = s.perch(this.zh.model);
      if (at && this.save.flags.pixel) this.pixel.place(x - 14, 0, 'walk', 1);
      else this.pixel.place(home.x, home.h, home.rest);
    } else if (this.pixelHere) this.pixel.place(x - this.p.face * 20, 0, 'sit', this.p.face);
    // the opening: the train home runs into Downtown; arriving, the player says the opening's words instead
    const st = this.story, said = pick(OPENING_INTRO, st, id);
    if (id === 'train' && st === 'home') this.rideHome();
    const flag = 'scene:' + id, intro = typeof s.intro === 'function' ? s.intro(this.touch) : s.intro;
    if (said) {
      const once = 'opening:said:' + st + ':' + id;
      if (said.consume) this.save.flags[flag] = true;
      if (!this.save.flags[once]) { this.save.flags[once] = true; storeSave(this.save); this.say('YOU', said.lines(this.touch), this.p.x, 46); }
    } else if (intro && !this.save.flags[flag]) {
      this.save.flags[flag] = true;
      storeSave(this.save);
      this.say('YOU', intro, this.p.x, 46);
    }
    this.greet();
  }

  /** Tap or click a thing to open its popup (in hack vision: its verbs); hovering lights it up. A tap on the scene's life within reach is E on it. */
  private onCanvasPointer(e: PointerEvent, press: boolean) {
    if (this.opening) return;
    if (this.cut) { if (press) { e.preventDefault(); this.cut.skip(); } return; }
    // a click or tap moves a speech bubble on, the same as E
    if (press && this.bubble) { e.preventDefault(); this.interact(); return; }
    if (this.netView) { this.netPointerAt(e, press); return; }
    if (this.mapView) { this.mapPointer(e, press); return; }
    const zh = this.zh;
    if (zh.overlayOpen || this.flight) return;
    if (zh.visionOn && this.visionPointer(e, press)) return;
    const r = this.canvas.getBoundingClientRect();
    const { wx, h } = this.zoomed(() => ({
      wx: ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam,
      h: this.gy - ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k,
    }));
    const id = zh.spotAt(wx, h);
    // (pink is the hacking layer's colour: no pink bracket on hover until hacking is yours)
    zh.hover = hackLocked(this.save.flags) ? null : id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (press && zh.visionOn) { zh.poke(id); return; }
    // a thing's popup: its everyday actions, then jack in (computers) and hack it
    if (press && id) { e.preventDefault(); zh.pick(id); return; }
    // a tap on someone or something within reach is E on them
    if (press) this.tapLife(e);
  }

  /**
   * A tap on someone or something of the scene's life (a person, a use, a readable) within reach: E on it.
   * In a scene without devices, where a tap has nothing else to do, its ways out answer a tap too.
   */
  private tapLife(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect(), wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const doors = !this.zh.model.devices.size;
    const t = this.targets().find((z) => (z.kind === 'life' || (doors && z.kind === 'exit')) && Math.abs(z.x - wx) < TAPPED && Math.abs(z.x - this.p.x) < TAP_REACH);
    if (t) { e.preventDefault(); this.useLife(t.id); }
  }

  /** Canvas world units (the view, after the pixel scale) → CSS px of the game view. */
  private get cssScale() { return (this.k * this.canvas.clientWidth) / (this.canvas.width || 1); }

  /** The heads of the people on screen (the scene's, Downtown's street people and the fixer), CSS px. */
  private heads() {
    const s = this.cssScale, list: { x: number; h: number }[] = [];
    for (const p of this.def.people ?? []) if (isHere(p)) list.push({ x: characterX(p, this.t), h: characterHeight(p) });
    if (this.here === 'downtown') { NPCS.forEach((n) => list.push({ x: n.x, h: 46 })); list.push({ x: STALL.fixerX, h: 74 }); }
    return list.map(({ x, h }) => ({ l: (this.sx(x) - 9) * s, t: this.y(h) * s, r: (this.sx(x) + 9) * s, b: this.y(h - 14) * s }))
      .filter((b) => b.r > 0 && b.l < this.canvas.clientWidth);
  }

  /** Hack vision hangs in the world: give the scene this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  private followHost() {
    const zh = this.zh;
    // captions and the popup keep under the key bar and the HUD's lines (drawHud: ~46 world units under the bar)
    zh.uiTop = this.keyBar.root.offsetHeight + 8 + this.hudH * this.cssScale;
    // (in hack vision the view may be panned and zoomed: the same mapping the world was drawn with)
    this.zoomed(() => {
      const s = this.cssScale;
      zh.follow((wx, h) => ({ x: Math.round(wx - this.cam) * s, y: (this.gy - h) * s }), this.canvas.clientWidth, { x: this.p.x, h: this.p.y });
    });
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    const zh = this.zh;
    return {
      save: this.save,
      machine: this.termMachine(),
      // the deck's commands reach the scene's machines, when it has any
      shell: zh.model.devices.size && !hackLocked(this.save.flags) ? sceneShell(zh, this.def.buzz ? (text, kind) => this.buzzPrint(text, kind) : (text, kind) => this.term.print(text, kind)) : null,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.term.close(),
      persist: () => this.persist(),
      resetYard: () => this.hostOf('yard').reset(),
      resetSandbox: SUDO ? () => this.hostOf('sandbox').reset() : undefined,
      // your own deck, while you still exist
      deck: isBefore(this.save.flags) ? DECK_BEFORE : undefined,
      // the Registry's forecast, where you are
      weather: () => reportLines(sceneClimate(this.here)),
      // the net from where you stand (NET.md): scan, connect (needs scan.so, except what a port here knows)
      net: hackLocked(this.save.flags) ? undefined : {
        scan: () => this.deckScan(),
        connect: (name) => this.deckConnect(name),
        names: () => this.zh.model.nodesHere().filter((id) => this.zh.model.net.has(id) || this.zh.model.ports().length),
      },
    };
  }

  private syncHud() {
    this.host.setNodes(nodeCount(this.save));
    this.host.setScene(sceneTitle(this.def) + this.clockText + ' · ' + this.me.toUpperCase());
  }

  /**
   * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
   * people, the devices and the scene's own targets on the engine, the scene's life, and Pixel.
   */
  private targets(): Target[] {
    const s = this.def, list: Target[] = [...this.exitTargets(s)];
    if (this.here === 'downtown') list.push(...this.streetTargets());
    // a device is reached from the ground, or from the ledge under it (the relay, from the low roof)
    const stand = (x: number, y = 0) => Math.max(0, ...this.platforms.filter((p) => x > p.x && x < p.x + p.w && p.h <= y).map((p) => p.h));
    for (const t of this.zh.targets()) if (!s.hideDevice?.(t.id, this.save.flags)) list.push({ kind: 'device', id: t.id, x: t.x, h: stand(t.x, t.y), label: t.label, promptH: t.promptH });
    list.push(...this.lifeTargets(s));
    // the opening's own things to press E on (the bed)
    for (const [key, t] of Object.entries(OPENING_TARGETS[this.story] ?? {})) {
      const [scene, id] = key.split('/');
      if (scene === this.here) list.push({ kind: 'life', id: 'story:' + id, x: t.x, h: 0, label: t.label, promptH: t.promptH });
    }
    // Pixel can always be petted, wherever it is with you
    if (this.pixelHere) list.push({ kind: 'pixel', id: 'pixel', x: this.pixel.x, h: 0, label: '[E] PET PIXEL', promptH: this.pixel.h + 24 });
    return list;
  }

  /** Downtown's people on the street and the fixer at his stall (level.ts says what they say). */
  private streetTargets(): Target[] {
    const list: Target[] = NPCS.map((n) => ({ kind: 'talk' as const, id: n.id, x: n.x, h: 0, label: '[E] TALK' }));
    // a hint costs a bowl: the price shows where you pay (and only then)
    const hint = fixerPrice(this.save);
    list.push({ kind: 'talk', id: 'fixer', x: STALL.fixerX, h: 0, label: '[E] TALK' + (hint ? ' · HINT ' + priceTag(hint, this.save.tokens) : '') });
    return list;
  }

  private nearest(): Target | null {
    let best: Target | null = null, bd = 26;
    for (const t of this.targets()) {
      if (Math.abs(this.p.y - t.h) > 8) continue;
      const d = Math.abs(this.p.x - t.x);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private say(name: string, pages: string[], x: number, h: number) {
    this.bubble = { name, pages, page: 0, chars: 0, x, h };
  }

  private interact() {
    const b = this.bubble;
    if (b) {
      const full = b.pages[b.page].length;
      if (b.chars < full) { b.chars = full; return; }
      if (b.page < b.pages.length - 1) { b.page++; b.chars = 0; return; }
      this.bubble = null;
      b.then?.();
      return;
    }
    const target = this.nearest();
    if (!target) return;
    if (target.kind === 'exit' || target.kind === 'life') { this.useLife(target.id); return; }
    // a device opens its popup; the scene's own target may be a way out (its code returns the exit)
    if (target.kind === 'device') {
      // the opening: a scene's own way out (the flat's door) may say something else in this state
      const rule = pick(OPENING_EXITS, this.story, this.here, target.id);
      if (rule && this.storyExit(rule, target.x, () => {})) return;
    }
    if (target.kind === 'device') { const out = this.zh.use(target.id), e = out ? this.def.exits.find((z) => z.id === out) : undefined; if (e) this.useExit(e); return; }
    if (target.kind === 'pixel') { sound.blip(); this.say('PIXEL', this.pixel.pet(), this.pixel.x, this.pixel.h + 14); return; }
    if (target.kind === 'talk') {
      // before you are deleted, the street talks to you differently (opening.ts)
      const o = pick(OPENING_LINES, this.story, 'downtown', target.id);
      if (o) { const npc = NPCS.find((n) => n.id === target.id); this.say(o.name ?? 'YOU', o.pages, npc?.x ?? STALL.fixerX, npc ? 48 : 30); return; }
      if (target.id === 'fixer') {
        const talk = fixerTalk(this.save);
        this.persist();
        this.say('FIXER', talk.pages, STALL.fixerX, 30);
        // "Got a name, ghost?": the deck opens with the question half typed (the keyboard is right here)
        if (talk.ask && this.bubble) { const ask = talk.ask; this.bubble.then = () => this.term.prefill(ask); }
      } else {
        const npc = NPCS.find((n) => n.id === target.id)!;
        this.say(npc.id === 'hood' ? 'HOODED STRANGER' : npc.id === 'umbrella' ? 'UMBRELLA' : 'MAN IN A HAT', npcTalk(npc.id, this.save), npc.x, 48);
      }
    }
  }

  private update(dt: number) {
    const p = this.p, b = this.bubble;
    if (b && b.chars < b.pages[b.page].length) {
      const before = Math.floor(b.chars);
      b.chars = Math.min(b.pages[b.page].length, b.chars + 1.2 * dt);
      if (Math.floor(b.chars) !== before && Math.floor(b.chars) % 2 === 0) sound.blip();
    }
    this.updateTravel(dt);
    this.updateStory();
    const locked = this.showEnd || this.term.focused || !!this.zh.overlayOpen || !!this.mapView || !!this.netView || !!this.flight || !!this.hop || !!this.beat || !!this.sleep;
    const left = !locked && (this.keys.has('ArrowLeft') || this.keys.has('a'));
    const right = !locked && (this.keys.has('ArrowRight') || this.keys.has('d'));
    const speed = this.keys.has('Shift') ? 2.3 : 1.3;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { p.face = dir; if (this.bubble && Math.abs(p.x - this.bubble.x) > 140) this.bubble = null; }
    p.moving = !!dir;
    p.x = Math.max(12, Math.min(this.levelW - 12, p.x + dir * speed * dt));
    // Walking into an open border (the yard's passage, a street's end) leaves without E.
    if (dir < 0 && p.x <= 12) this.walkOff('left');
    else if (dir > 0 && p.x >= this.levelW - 12) this.walkOff('right');

    // Vertical: gravity, platforms and the street.
    const prevY = p.y;
    if (!p.onGround) {
      p.y += p.vy * dt;
      p.vy -= 0.22 * dt;
      for (const pl of this.platforms) {
        if (p.vy <= 0 && prevY >= pl.h && p.y <= pl.h && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2) { p.y = pl.h; p.vy = 0; p.onGround = true; }
      }
      if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    } else if (p.y > 0 && !this.platforms.some((pl) => pl.h === p.y && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2)) {
      p.onGround = false; p.vy = 0;
    }

    // Camera follows, eased, clamped to the level. A nudge leans it towards something that reacted
    // off the view for a moment (walking, talking or the deck cancel it), then it eases back.
    if (this.zh.visionOn) this.nudge = null;
    const n = this.nudge;
    if (n && (p.moving || !p.onGround || this.bubble || this.term.focused || this.zh.overlayOpen || Math.abs(p.x - n.px) > 2)) { this.nudge = null; this.easeBack = !p.moving; }
    const follow = Math.max(0, Math.min(this.levelW - this.viewW, p.x - this.viewW * 0.45));
    const nudging = !!this.nudge && this.clock < this.nudge!.until;
    if (this.nudge && !nudging) { this.nudge = null; this.easeBack = true; }
    const goal = nudging ? this.nudge!.goal : follow;
    // gentle while leaning out and coming back; the usual follow otherwise (a step turns it off)
    if (p.moving || Math.abs(goal - this.cam) < 0.5) this.easeBack = false;
    this.cam += (goal - this.cam) * Math.min(1, (nudging || this.easeBack ? NUDGE_EASE : 0.12) * dt);
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    if (this.pixelHere) this.pixel.update(dt, { px: p.x, face: p.face, moving: p.moving, perch: this.def.perch?.(this.zh.model) ?? null, warm: WARM[this.here] });
    this.host.setNodes(nodeCount(this.save));
    // the opening's idle ping: standing still a while, the next goal's target pings (opening.ts)
    const aim = pick(OPENING_PINGS, this.story, this.here);
    if (!aim || locked || p.moving || !p.onGround || this.bubble || this.zh.popupOpen) this.still = this.clock;
    else if (this.clock - this.still > IDLE_PING) { this.still = this.clock; this.pingGoal(aim); }
  }

  /** Pixel is drawn at home (the flat), and where it follows you (`pixel: 'along'`) once it does (`flags.pixel`). */
  private get pixelHere() { const s = this.def; return s.pixel === 'home' || (!!this.save.flags.pixel && s.pixel === 'along'); }

  // ---------- drawing ----------

  private sx(worldX: number, parallax = 1) { return Math.round(worldX - this.cam * parallax); }
  private y(h: number) { return this.gy - h; }

  /**
   * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
   * the scene has them (`ambient`), the scene's own drawing, the player and Pixel, the scene's
   * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
   * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
   * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
   */
  private draw() {
    const x = this.x, k = this.k;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.imageSmoothingEnabled = false;
    clearWorld(x, this.viewW, this.viewH);
    if (this.flight) { drawFlight(x, this.viewW, this.viewH, Math.min(1, (this.clock - this.flight.start) / (taxiSequenceDuration * 60)), this.clock, STANDS[this.flight.to].name); return; }
    // the world, at hack vision's pan and zoom; the HUD and the overlays over it at the usual scale
    this.zoomed(() => this.drawWorld());
    x.setTransform(k, 0, 0, k, 0, 0);
    this.drawHud();
    if (this.showEnd) this.drawEnd();
    this.drawBeat();
    this.drawSleep();
    this.drawMap();
    if (this.netView) drawNetMap(this.x, this.viewW, this.viewH, this.netState());
  }

  private drawWorld() {
    const v = this.view();
    renderSceneFrame({ context: this.x, scale: this.k, view: v, scene: this.def, sceneId: this.here,
      host: this.zh, reduced: this.reduced, clock: this.clock,
      weather: () => this.weatherHere(), lighting: W => this.lightHere(W), reflections: SMEARS,
      preparePresentation: () => this.zh.preparePresentation(v, this.zh.visionOn && this.def.layers ? 'devices' : 'all'),
      skyTraffic: (x, view) => drawSkyShips(x, view, this.ships),
      city: (x, view) => renderDowntownCity(x, view),
      street: (x, view, rain, lit) => renderDowntownStreet(x, view, rain, lit),
      roomWash: () => this.drawLight(), actors: () => this.drawCharacters(),
      prompts: () => this.drawPrompt(), bubbles: () => this.drawBubble(),
    });
  }

  /**
   * This frame's light for the scene on screen (light.ts): its facing, outdoors or in, the weather
   * (indoors: the district's, for what the windows show). Sets it for characters and sets to read,
   * and works out the shade bands and the lamps for night shadows.
   */
  private lightHere(W: Weather | null): Light {
    const s = this.def, amb = s.ambient ?? {};
    const outdoor = s.outdoor ?? !!(amb.weather || amb.sky);
    const L = lightAt(city.day, city.min, s.facing ?? 180, W ?? this.weatherHere(), outdoor);
    setLight(L);
    return L;
  }

  /** The ground under the player at world x (a ledge they are over, or the street): where their shadow lies. */
  private groundUnder(wx: number, h: number) {
    return Math.max(0, ...this.platforms.filter((pl) => wx > pl.x && wx < pl.x + pl.w && pl.h <= h + 0.5).map((pl) => pl.h));
  }

  /**
   * The weather a scene has now: its district's (weather.ts). Dawn, before you are deleted, is
   * dry whatever the forecast says ("Rain's late today": the opening is scripted).
   */
  private weatherOf(scene: string): Weather {
    const w = weatherNow(sceneClimate(scene));
    if (!isBefore(this.save.flags) || (w.rain < 0.01 && w.storm < 0.01)) return w;
    return { ...w, kind: w.kind === 'rain' || w.kind === 'storm' ? 'cloudy' : w.kind, rain: 0, storm: 0, wet: Math.min(w.wet, 0.4), wind: Math.min(w.wind, 0.3) };
  }
  private weatherHere() { return this.weatherOf(this.here); }



  private drawCharacters() {
    const x = this.x, p = this.p;
    if (this.here === 'downtown') renderDowntownPeople(x, this.view());
    if (this.pixelHere) this.pixel.draw(x, (wx) => this.sx(wx), (h) => this.y(h), this.t);
    // jacked in: a Downtown machine's schematic is open and you stand at it, so the deck's cable runs to it
    const open = this.here === 'downtown' ? this.downtown.viewing : null;
    const jack = open ? this.downtown.model.spots().find((sp) => sp.id === open && Math.abs(sp.x - p.x) < 40 && Math.abs(this.p.y - (sp.y > 40 ? sp.y : 0)) < 8) : undefined;
    if (jack) p.face = jack.x >= p.x ? 1 : -1;
    if (SHIFT_PROTOTYPE) { drawDockworker(x, this.view(), prepareDockworker(p.x,p.face,p.moving,this.view().t), p.face, shiftCarry(this.save.flags)); return; }
    const sprite = jack ? SPR.jack : !p.onGround ? SPR.jump : p.moving && Math.floor(this.t / 9) % 2 ? SPR.walk : SPR.stand;
    drawPlayer(x, this.view(), sprite, p, jack, this.zh.visionOn ? null : this.groundUnder(p.x, p.y));
  }

  /**
   * Hack vision mutes the world: what is drawn so far loses its colour and sinks into a dark
   * violet wash, so the devices (drawn next, bright and framed) and the player stand out.
   * Two full-screen fills: cheap.
   */
  /** Hack vision's muting: grey and dark over the view, with holes left bright at `keep` (device spots, world units). */




  private drawPrompt() {
    if (this.bubble || this.showEnd || this.zh.overlayOpen || this.zh.popupOpen || this.mapView || this.beat || this.sleep || this.hop || this.flight) return;
    const t = this.nearest();
    if (!t) return;
    const x = this.x;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    x.fillStyle = 'rgba(0,255,255,.95)'; x.shadowColor = 'rgba(0,255,255,.8)'; x.shadowBlur = 6;
    const h = t.promptH ?? (t.id === 'fixer' ? 66 : 62);
    // kept inside the view, so a way out at a scene's very end still reads in full
    const half = x.measureText(t.label).width / 2 + 4;
    x.fillText(t.label, Math.max(half, Math.min(this.viewW - half, this.sx(t.x))), this.y(h));
    x.restore();
  }

  private wrap(text: string, max: number) {
    const words = text.split(' '), lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (this.x.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- hack vision's pan and zoom ----------

  /**
   * Hack vision's own view of the world: its zoom (1 as usual, less is further out, down to the
   * whole scene in view) and its left edge (world x). Until you pan or zoom it follows you like the
   * usual camera (`panned`); leaving hack vision hands back to the usual camera, which eases to you.
   */
  private vz = 1;
  private vcam = 0;
  private panned = false;
  /** Hack vision's view is in use this frame (set at the start of each frame, `visionCamera`). */
  private wasVision = false;
  /** Pointers down on the canvas in hack vision (CSS px), and the gesture they make. */
  private vptr = new Map<number, { x: number; y: number }>();
  private vgest: { kind: 'tap' | 'pan' | 'pinch'; sx: number; sy: number; cam: number; z: number; d: number; mid: number } | null = null;
  /** When the last tap on nothing landed (ms), for the double tap that resets the view. */
  private lastTap = 0;
  /** The mode the bars were last set up for (`syncModeUi`). */
  private modeKey = '';

  /** Run `fn` with the world's view at hack vision's pan and zoom (outside hack vision, as it is). */
  private zoomed<T>(fn: () => T): T {
    if (!this.wasVision) return fn();
    const k = this.k, vw = this.viewW, vh = this.viewH, gy = this.gy, cam = this.cam, z = this.vz;
    // scaled about the top left: the ground stays where it was on screen, the view grows up and sideways
    this.k = k * z; this.viewW = vw / z; this.viewH = vh / z; this.gy = gy / z; this.cam = this.vcam;
    try { return fn(); } finally { this.k = k; this.viewW = vw; this.viewH = vh; this.gy = gy; this.cam = cam; }
  }

  /** How far out hack vision zooms: the whole scene in view (a scene that already fits still gets some room over it). */
  private clampZ(z: number) {
    const fit = this.viewW / (this.levelW + 24);
    return Math.max(Math.max(0.1, Math.min(fit, VISION_ZOOM_MIN)), Math.min(1, z));
  }

  /** Keep hack vision's view on the scene (a scene narrower than the view sits in the middle). */
  private clampV() {
    const w = this.viewW / this.vz;
    this.vcam = this.levelW <= w ? (this.levelW - w) / 2 : Math.max(0, Math.min(this.levelW - w, this.vcam));
  }

  /** Every frame: hack vision's view starts where the camera is, follows you until you move it, and hands back on leaving. */
  private visionCamera() {
    const on = this.zh.visionOn && !this.mapView && !this.cut;
    if (on && !this.wasVision) { this.vz = 1; this.vcam = this.cam; this.panned = false; this.vptr.clear(); this.vgest = null; }
    if (!on && this.wasVision) {
      // back to you: the usual camera eases there from the middle of what you were looking at
      const w = this.viewW / this.vz;
      this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.vcam + (w - this.viewW) / 2));
      this.vz = 1; this.panned = false; this.vptr.clear(); this.vgest = null;
      this.zh.viewMoved(false);
    }
    this.wasVision = on;
    if (!on) return;
    // walking (on a keyboard) brings the view back onto you
    if (this.p.moving && !this.vgest) this.panned = false;
    if (!this.panned) {
      const w = this.viewW / this.vz;
      this.vcam += (this.p.x - w * 0.45 - this.vcam) * 0.12;
    }
    this.clampV();
    this.zh.viewMoved(this.panned || this.vz < 0.999);
  }

  /** The reset button, a double tap on nothing, or 0: hack vision's view as usual again, on you. */
  private resetVision() {
    this.vz = 1; this.panned = false;
    this.zh.viewMoved(false);
  }

  /**
   * Hack vision, a pointer on the canvas (empty space: nouns, cores, cable ends and cards are over
   * it and take their own drags first). One finger or the mouse drags the view, two pinch it; a
   * press that does not travel is a tap, handled when it lifts (`visionLift`). True: used.
   */
  private visionPointer(e: PointerEvent, press: boolean): boolean {
    if (press) {
      if (e.button > 0) return true;
      e.preventDefault();
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ }
      this.vptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...this.vptr.values()];
      if (pts.length === 1) this.vgest = { kind: 'tap', sx: e.clientX, sy: e.clientY, cam: this.vcam, z: this.vz, d: 0, mid: e.clientX };
      else if (pts.length === 2) this.vgest = { kind: 'pinch', sx: 0, sy: 0, cam: this.vcam, z: this.vz, d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, mid: (pts[0].x + pts[1].x) / 2 };
      return true;
    }
    // (the mouse just moving over the canvas: hover, as usual)
    if (!this.vptr.has(e.pointerId)) return false;
    this.vptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.vgest;
    if (!g) return true;
    const r = this.canvas.getBoundingClientRect(), px = this.canvas.width / (r.width || 1);
    if (g.kind === 'pinch') {
      const pts = [...this.vptr.values()];
      if (pts.length < 2) return true;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, mid = (pts[0].x + pts[1].x) / 2;
      // the world under the fingers stays under them
      const wx = g.cam + ((g.mid - r.left) * px) / (this.k * g.z);
      this.vz = this.clampZ((g.z * d) / g.d);
      this.vcam = wx - ((mid - r.left) * px) / (this.k * this.vz);
      this.panned = true; this.clampV();
      return true;
    }
    if (g.kind === 'tap' && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 8) g.kind = 'pan';
    if (g.kind === 'pan') { this.vcam = g.cam - ((e.clientX - g.sx) * px) / (this.k * this.vz); this.panned = true; this.clampV(); }
    return true;
  }

  /** Hack vision, a pointer lifted: a tap on a device folds or unfolds its circuit, on nothing drops what is in hand; twice on nothing resets the view. */
  private visionLift(e: PointerEvent) {
    if (!this.vptr.delete(e.pointerId)) return;
    const g = this.vgest;
    // one finger of a pinch still down: it pans on from here
    if (this.vptr.size === 1 && g?.kind === 'pinch') { const [q] = [...this.vptr.values()]; this.vgest = { kind: 'pan', sx: q.x, sy: q.y, cam: this.vcam, z: this.vz, d: 0, mid: q.x }; return; }
    if (this.vptr.size) return;
    this.vgest = null;
    if (g?.kind !== 'tap' || e.type === 'pointercancel' || !this.zh.visionOn) return;
    const r = this.canvas.getBoundingClientRect();
    const { wx, h } = this.zoomed(() => ({
      wx: ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam,
      h: this.gy - ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k,
    }));
    const zh = this.zh, id = zh.spotAt(wx, h), now = performance.now();
    if (!id && now - this.lastTap < 320) { this.lastTap = 0; this.resetVision(); return; }
    this.lastTap = id ? 0 : now;
    zh.poke(id);
  }

  /** Hack vision, the mouse wheel: zoom out (to the whole scene) and back in, about the pointer. */
  private visionWheel(e: WheelEvent) {
    if (!this.wasVision || this.menu.open) return;
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect(), px = this.canvas.width / (r.width || 1);
    const wx = this.vcam + ((e.clientX - r.left) * px) / (this.k * this.vz);
    this.vz = this.clampZ(this.vz * Math.exp(-e.deltaY * 0.0015));
    this.vcam = wx - ((e.clientX - r.left) * px) / (this.k * this.vz);
    this.panned = true; this.clampV();
  }

  /**
   * The bars follow the mode (render.tsx): walking (arrows; HACK, JMP, ACT, MENU) or hack vision
   * (EXIT, BOARD, LOGIC, UNFOLD), as classes on the page; HACK only once hacking is yours here.
   */
  private syncModeUi() {
    const zh = this.zh, on = zh.visionOn;
    this.keyBar.sync(this.save.jump, on);
    const net = this.netOk, ping = net && !this.save.flags[NET_OPENED];
    const key = [on, zh.hackable, zh.logicOpen, zh.unfoldAll, net, ping].join();
    if (key === this.modeKey) return;
    this.modeKey = key;
    const html = document.documentElement.classList;
    html.toggle('net-ok', net); html.toggle('net-new', ping);
    html.toggle('hack-ok', zh.hackable); html.toggle('hack-on', on);
    html.toggle('logic-open', zh.logicOpen); html.toggle('unfold-on', zh.unfoldAll);
  }

  // ---------- the camera nudge ----------

  /** The camera leaning towards something that reacted off the view: where it leans to, until when (clock frames), where you stood. */
  private nudge: { goal: number; until: number; px: number } | null = null;
  /** Coming back from a nudge: the camera eases gently until it is on you again. */
  private easeBack = false;
  /** When the last nudge started (clock frames), and what has drawn the eye already this visit (`from|line`). */
  private lastNudge = -1e9;
  private nudged = new Set<string>();

  /**
   * Something said it reacted (`from`, with a line in green or red). If it is off the view but
   * near, the camera leans that way for a moment so you see it happen, keeping you in view; the
   * ping (an edge arrow) already points at anything further. Never during a conversation, the deck
   * or a panel, never while you walk, never with reduced motion; each thing and line once a visit,
   * and not more often than every few seconds.
   */
  private nudgeTo(from: string, text: string, tone?: string) {
    if (tone !== 'ok' && tone !== 'err') return;
    if (this.reduced || this.bubble || this.term.focused || this.zh.overlayOpen || this.zh.visionOn || this.mapView || this.flight || this.hop || this.cut || this.p.moving) return;
    const at = this.zh.worldOf(from);
    if (!at || this.levelW <= this.viewW) return;
    const key = from + '|' + text, p = this.p, m = NUDGE_MARGIN;
    if (this.nudged.has(key) || this.clock - this.lastNudge < NUDGE_GAP) return;
    // already in view (with a margin), or too far to show together with you: the ping is enough
    if (at.x > this.cam + m && at.x < this.cam + this.viewW - m) return;
    if (Math.abs(at.x - p.x) > this.viewW - m * 2) return;
    let goal = at.x < this.cam + m ? at.x - m : at.x + m - this.viewW;
    goal = Math.max(p.x + m - this.viewW, Math.min(p.x - m, goal));
    goal = Math.max(0, Math.min(this.levelW - this.viewW, goal));
    this.nudged.add(key); this.lastNudge = this.clock;
    this.nudge = { goal, until: this.clock + NUDGE_HOLD, px: p.x };
  }

  /** How far down the HUD's lines reach under the key bar (world units), as drawn last. */
  private hudH = 46;

  /** Where the speech bubble was drawn last (view units), so captions keep off it; null without one. */
  private bubbleBox: { x: number; y: number; w: number; h: number } | null = null;

  private drawBubble() {
    const b = this.bubble;
    this.bubbleBox = null;
    if (!b) return;
    const x = this.x;
    x.save();
    x.font = '600 10px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    const full = b.pages[b.page], shown = full.slice(0, Math.floor(b.chars));
    const lines = this.wrap(full, 230), shownLines = this.wrap(shown, 230);
    const w = Math.max(...lines.map((l) => x.measureText(l).width), x.measureText(b.name).width) + 28;
    const h = lines.length * 13 + 32;
    const bx = Math.max(6, Math.min(this.viewW - w - 6, this.sx(b.x) - w / 2));
    const by = Math.max(6, this.y(b.h) - h - 50);
    this.bubbleBox = { x: bx, y: by, w, h };
    x.fillStyle = '#000'; x.fillRect(bx, by, w, h);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(bx + 1, by + 1, w - 2, h - 2); x.lineWidth = 1;
    x.fillStyle = b.name === 'YOU' ? '#7ff' : '#ffd9a5'; x.fillText(b.name !== 'YOU' ? b.name : (SHIFT_PROTOTYPE || isBefore(this.save.flags)) ? 'YOU' : who(this.save).toUpperCase(), bx + 10, by + 15);
    x.fillStyle = '#fff'; shownLines.forEach((l, i) => x.fillText(l, bx + 10, by + 30 + i * 13));
    if (b.chars >= full.length && Math.floor(this.t / 20) % 2) {
      x.beginPath(); x.moveTo(bx + w - 16, by + h - 10); x.lineTo(bx + w - 8, by + h - 10); x.lineTo(bx + w - 12, by + h - 5); x.closePath(); x.fill();
    }
    x.restore();
  }

  private drawHud() {
    const x = this.x, vision = this.zh.visionOn;
    x.save();
    x.font = '600 8px "IBM Plex Mono", monospace'; x.textAlign = 'left';
    // below the key bar along the top (its height in world units)
    const top = (this.keyBar.root.offsetHeight + 8) * (this.canvas.width / (this.canvas.clientWidth || 1)) / this.k;
    let y = top - 1;
    // hack vision keeps only the goal: what you own is in the LOGIC drawer there
    if (!vision) {
      x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(sceneTitle(this.def) + this.clockText, 8, top + 10);
      y = top + 10;
      // what you own is not here (Tommi, 2026-10-15): hack vision's LOGIC drawer has it, and a short
      // line shows when something comes
      const g = this.gain;
      if (g && this.t < g.until) { x.fillStyle = 'rgba(34,197,94,' + Math.min(1, (g.until - this.t) / 30) * 0.95 + ')'; x.fillText(g.text, 8, (y += 11)); }
    }
    // the scene's goal, where it has goals (a scene without a data file has none)
    // (the opening has its own: opening.ts)
    const zh = this.zh.model.data.goals.length ? this.zh : null, story = this.def.objective?.(this.save.flags) ?? pick(OPENING_GOAL, this.story, this.here) ?? this.libraryGoal();
    if (story || zh) {
      y += 11;
      if (this.shiftGuidance) this.shiftGuidance.draw(x, this.viewW, this.viewH, y);
      else { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + (story ?? zh!.objective()), 8, y); }
    }
    // the keys and what they do: the key bar along the top (keybar.ts)
    const tl = this.termLine;
    if (tl && this.t < tl.until && !this.term.focused) {
      x.fillStyle = tl.kind === 'err' ? 'rgba(255,90,110,.95)' : tl.kind === 'ok' ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.85)';
      x.fillText(tl.text.length > 90 ? tl.text.slice(0, 89) + '…' : tl.text, 8, y + 11);
    }
    // how far down the HUD's lines reach (world units under the key bar): captions and popups keep below
    this.hudH = vision ? y + 4 - top : Math.max(46, y + 11 + 4 - top);
    if (this.toast && this.t < this.toast.until) {
      x.textAlign = 'center'; x.fillStyle = this.toast.text.startsWith('ESC') ? 'rgba(0,255,255,.95)' : 'rgba(255,90,110,.95)'; x.font = '600 9px "IBM Plex Mono", monospace';
      x.fillText(this.toast.text, this.sx(this.p.x), this.y(this.p.y + 56));
    }
    x.restore();
  }

  /**
   * What hack vision's LOGIC drawer lists: modules, programs and the key chips that do something.
   * Not tokens and not what you carry (Tommi, 2026-10-15): those show where they are used (a price
   * on the prompt, "show the maglev pass" in the brake's popup).
   */
  private owned(): [string, string] {
    const s = this.save;
    const own = 'MODULES ' + (ownedModules(s).join(' ') || '-') + (s.programs.length ? ' · PROGRAMS ' + s.programs.join(' ') : '') + (SUDO ? ' · SUDO' : '');
    const keys = s.keyring.map((id) => KEYRING.get(id)).filter((k) => k?.kind === 'key').map((k) => (/^\S+$/.test(k!.label) ? k!.label : k!.id));
    return [own, keys.length ? 'KEYS ' + keys.join(' ') : ''];
  }
  private ownLine() { const [own, more] = this.owned(); return more ? own + ' · ' + more : own; }

  /** What you own, as a set of words, to see what came (or went) since the last frame. */
  private gainWords = '';
  private gain: { text: string; until: number } | null = null;
  private checkGain() {
    const s = this.save, words = [...ownedModules(s), ...s.programs, ...s.keyring.map((id) => KEYRING.get(id)?.label ?? id), ...Object.entries(s.items).filter(([, n]) => n > 0).map(([id]) => ITEMS[id as ItemId] ?? id)];
    const now = words.join('|');
    if (this.gainWords && now !== this.gainWords) {
      const before = new Set(this.gainWords.split('|')), added = words.filter((w) => !before.has(w));
      if (added.length) this.gain = { text: '+ ' + added.join(' · '), until: this.t + 240 };
    }
    this.gainWords = now;
  }

  private drawEnd() {
    const x = this.x, cx = this.viewW / 2, cy = this.viewH / 2 - 30;
    x.save();
    x.fillStyle = 'rgba(0,0,0,.78)'; x.fillRect(0, 0, this.viewW, this.viewH);
    x.textAlign = 'center';
    x.font = '600 16px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,.95)'; x.shadowColor = 'rgba(255,136,0,.8)'; x.shadowBlur = 10;
    x.fillText('END OF TRANSMISSION', cx, cy);
    x.shadowBlur = 0; x.font = '10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,.9)';
    x.fillText('Downtown cleared. Nodes that answer to you: ' + this.save.controlled.length + '. You are still a ghost, ' + who(this.save) + '.', cx, cy + 26);
    x.fillText('The Neon Market gate stands open at the west end. Your progress is saved in this browser.', cx, cy + 42);
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillText('ENTER keep exploring · ESC menu', cx, cy + 66);
    x.restore();
  }

  // ---------- the opening (opening.ts) ----------
  // The train home, the turnstile, Downtown before, the flat at dawn, the sleep, the morning you
  // are deleted, Moth's uplink.so. The scenes are the usual ones; the save's flags pick their state.

  private get story(): OpeningState { return openingState(this.save.flags); }
  /** Who you are in the HUD and your bubbles: a courier while you still exist, then your handle (or "ghost"). */
  private get me() { if (SHIFT_PROTOTYPE) return 'worker'; return isBefore(this.save.flags) ? 'courier' : who(this.save); }
  /** The city clock, after the scene's name in the HUD (" · 21:40"; the opening's times are its pins). */
  private get clockText() { return ' · ' + city.text; }

  /** When the player last moved or did something (clock frames), for the idle ping. */
  private still = 0;
  /** Where the idle ping points when it is not a device (world x): the scene's 'goal' speaker. */
  private goalAt: number | null = null;
  /** The turnstile taking its time: when it started, and what happens once it says ok. */
  private beat: { start: number; checkpoint: { x: number; h: number }; then: () => void } | null = null;
  /**
   * Sleeping or waiting (the opening's sleep, or "wait until…" at a bench or the bed): when the
   * fade started, its timings, the card (from, to, where), what happens in the dark (`mid`, once:
   * `woke`) and once it is light again (`end`).
   */
  private sleep: { start: number; woke: boolean; card: { out: number; card: number; in: number }; from: string; to: string; label: string; mid: () => void; end: () => void } | null = null;
  /** The morning: when you woke, how many plain things failed, whether Moth has written (or is about to: the mail). */
  private morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };

  /** NEW GAME (until the glide lands) and a first launch: the opening, on the train home. */
  private startOpening(destination?: Handoff) {
    this.morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };
    this.save.flags[OPENING.home] = true;
    storeSave(this.save);
    this.handTo(destination?.scene ?? 'train', destination?.entrance);
  }

  /** Sudo's LEVELS: the opening from one of its points (opening.ts `OPENING_LEVELS`), the flat as on the first night. */
  private openingFrom(flags: string[]) {
    for (const f of Object.keys(this.save.flags)) if (f.startsWith('opening:')) delete this.save.flags[f];
    flags.forEach((f) => { this.save.flags[f] = true; });
    this.hostOf('capsule').reset();
    this.morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };
    storeSave(this.save);
    const to = openingResume(this.save.flags) ?? 'train';
    this.handTo(to);
    if (this.story === 'deleted') this.wakeUp();
  }

  /** The train home: on its run into Downtown (from the harbor's closed stop), slow enough to talk to people on the way. */
  private rideHome() {
    Object.assign(ride, {
      at: LINE.indexOf('harbor'), to: LINE.indexOf('downtown'), phase: 'running', timer: HOME_RUN.start, pos: 2 * SEG, d: 0, span: SEG,
      frames: HOME_RUN.frames, v: 0, open: 0, doors: false, halt: null, say: 'NEXT: DOWNTOWN',
    });
  }

  /** A device's everyday actions in this state (opening.ts `OPENING_EVERYDAY`), as popup chips; null: its data's. */
  private storyChips(scene: SceneId, dev: string): PopupItem[] | null {
    const chips = pick(OPENING_EVERYDAY, this.story, scene, dev);
    if (!chips) return null;
    const zh = this.hostOf(scene);
    return chips.map((c) => ({
      label: c.label,
      run: () => {
        if (c.act) zh.model.act(dev, c.act[0], c.act[1]);
        if (c.set) { zh.model.set(c.set[0], c.set[1]); zh.model.changed(); }
        if (c.say) zh.react(dev, c.say);
        if (c.say?.[2] === 'ok') sound.granted(); else if (c.say?.[2] === 'err') sound.denied();
        if (c.fail) { this.morning.tries++; this.morning.last = this.clock; }
        if (c.mail) { this.morning.due = true; this.morning.last = this.clock; }
      },
    }));
  }

  /** A way out that does something else in this state (opening.ts `ExitRule`); `go` leaves through it. False: use it as usual. */
  private storyExit(rule: ExitRule, x: number, go: () => void, checkpoint?: SceneExit['checkpoint']): boolean {
    if ('say' in rule) { this.say(rule.say.name, rule.say.pages, x, 60); return true; }
    if ('react' in rule) { this.zh.react(rule.react, rule.line); sound.denied(); if (rule.fail) { this.morning.tries++; this.morning.last = this.clock; } return true; }
    if ('turnstile' in rule) {
      // Downtown station's exit gate: one beat too long on "verifying", then ok. Nobody else waits.
      this.keys.clear();
      this.beat = { start: this.clock, checkpoint: { x: checkpoint?.x ?? x, h: checkpoint?.h ?? 0 }, then: () => { this.save.flags[OPENING.street] = true; storeSave(this.save); go(); } };
      sound.blip();
      return true;
    }
    // CONCIERGE at the tower's door: it knows you, and lets you up
    sound.granted();
    this.say('CONCIERGE', ['welcome home. you are expected. the lift is on its way down.'], x, 60);
    this.bubble!.then = () => { this.save.flags[OPENING.flat] = true; storeSave(this.save); go(); };
    return true;
  }

  /** The story's clock, every frame: the turnstile's beat, the sleep, the morning's message, jacking in. */
  private updateStory() {
    if (this.beat && this.clock - this.beat.start >= TURNSTILE.verify + TURNSTILE.ok) {
      const then = this.beat.then;
      this.beat = null;
      sound.granted();
      then();
    }
    if (this.sleep) {
      const e = this.clock - this.sleep.start, S = this.sleep.card;
      if (!this.sleep.woke && e >= S.out + S.card / 2) { this.sleep.woke = true; this.sleep.mid(); }
      if (e >= S.out + S.card + S.in) { const end = this.sleep.end; this.sleep = null; end(); }
      return;
    }
    const st = this.story;
    if (st === 'deleted' && this.here === 'capsule') {
      const m = this.morning;
      if (m.at < 0) m.at = this.clock;
      if (!m.sent && !this.bubble && !this.zh.popupOpen && this.clock - m.last > MORNING.after && (m.due || m.tries >= MORNING.tries || this.clock - m.at > MORNING.wait)) this.mothWrites();
    }
    // jacked in to HOME-PC: Capsule 7B's own goals take over
    if (st === 'uplinked' && this.here === 'capsule' && this.zh.viewing === 'pc') { this.save.flags[OPENING.jacked] = true; storeSave(this.save); }
  }

  /** [E] SLEEP: the fade, the card, the morning. */
  private sleepNow() {
    this.keys.clear();
    this.bubble = null;
    this.zh.closeAll();
    this.sleep = { start: this.clock, woke: false, card: SLEEP, from: SLEEP.from, to: SLEEP.to, label: 'CAPSULE 7B', mid: () => this.morningFlat(), end: () => this.wakeUp() };
    sound.close();
  }

  // ---------- the city clock (clock.ts): when it runs, the opening's pins, waiting ----------

  /** Sudo's city clock bar (transport.ts); null without `?sudo`. */
  private clockBar: ClockBar | null = null;
  /** The footer's timestamp in game mode (DAY 3 · 21:40), and what it and the HUD showed last. */
  private stampEl: HTMLElement;
  private shownClock = '';
  /** The opening holds the clock (opening.ts OPENING_TIME); true while it does. */
  private storyPinned = false;
  /** When the save was last written for the clock's sake (clock frames). */
  private clockSaved = 0;

  /**
   * Does the city clock run now? In a scene, hack vision and the board included; not on the map,
   * in a taxi or a quick trip (they cost their fixed time), in talk (a speech bubble, a daemon's
   * panel, a lock toy), while sleeping or waiting, or over the end card. (The menu, cutscenes and
   * the title stop the whole loop before this.)
   */
  private clockRuns() {
    return !this.mapView && !this.netView && !this.flight && !this.hop && !this.zh.panelOpen && !this.sleep && !this.showEnd && !this.beat;
  }

  /**
   * The opening pins the clock to its times (opening.ts OPENING_TIME: the train 05:41 … the
   * morning after 09:40) from the train home until Moth's uplink.so; then it runs, from 09:42.
   */
  private pinStory() {
    if(EDITOR_PLAY&&this.editorClock!=='story'){if(this.editorClock==='fixed')city.pin(this.save.clock.min);return;}
    if (SHIFT_PROTOTYPE) {
      this.save.clock.day = this.save.flags['shift:returned'] ? 2 : 1;
      const at = this.def.storyMinute?.(this.save.flags) ?? shiftMinute(this.save.flags);
      if (city.pinned !== at) city.pin(at);
      return;
    }
    const st = this.story;
    if (st === 'home' || st === 'flat' || st === 'deleted') {
      const at = parseHM(pick(OPENING_TIME, st, this.here) ?? '');
      if (at !== null) { if (city.pinned !== at) city.pin(at); }
      else if (city.pinned === null) city.pin(Math.floor(city.min));
      this.storyPinned = true;
    } else if (this.storyPinned) {
      this.storyPinned = false;
      city.release(parseHM(pick(OPENING_TIME, 'uplinked', 'capsule') ?? '') ?? undefined);
      storeSave(this.save);
    }
  }

  /** The HUD's and the footer's clock, when the minute changes (`force`: now). The save is written now and then. */
  private syncClock(force = false) {
    const t = city.stamp;
    if (force || t !== this.shownClock) {
      this.shownClock = t;
      this.stampEl.textContent = t;
      if (!this.cut && !this.opening) this.syncHud();
    }
    if (this.clock - this.clockSaved > CLOCK_SAVE) { this.clockSaved = this.clock; storeSave(this.save); }
  }

  /** E at a bench, a stool or the bed: the popup's "wait until…" choices. */
  private offerWait(r: SceneRest) {
    const bed = r.kind === 'bed';
    const items = WAITS.map((w) => ({ label: (bed && w.id === 'morning' ? 'sleep till ' : 'wait: ') + w.label, run: () => this.waitUntil(w, r) }));
    this.zh.choose('rest:' + r.id, bed ? 'YOUR BED' : r.kind === 'stool' ? 'A STOOL' : 'A BENCH', items, { x: r.x, y: r.h ?? 0, w: 40, h: Math.max(16, (r.promptH ?? 60) - 24) });
    sound.open();
  }

  /** Wait (or sleep) until then: a fade, a card from now to then, the clock jumped ahead in the dark. */
  private waitUntil(w: WaitTo, r: SceneRest) {
    if (city.pinned !== null) return;
    const minutes = city.waitFor(w), from = city.text, to = city.min + minutes;
    this.keys.clear();
    this.bubble = null;
    const label = (r.kind === 'bed' ? 'SLEEPING · ' : 'WAITING · ') + this.placeName.toUpperCase();
    this.sleep = { start: this.clock, woke: false, card: WAIT_CARD, from, to: hmOf(to), label, mid: () => { city.advance(minutes); this.syncClock(true); storeSave(this.save); }, end: () => {} };
    sound.close();
  }

  /** In the dark between the two flats: the flat as it is the morning after (Capsule 7B's puzzles from the start), you by the bed. */
  private morningFlat() {
    this.save.flags[OPENING.slept] = true;
    this.hostOf('capsule').reset();
    this.morning = { at: this.clock, tries: 0, last: -1e9, sent: false, due: false };
    Object.assign(this.p, { x: CAPSULE_SPAWN, y: 0, vy: 0, onGround: true, face: -1 });
    const home = this.def.perch?.(this.zh.model);
    if (home) this.pixel.place(home.x, home.h, home.rest);
    storeSave(this.save);
    this.syncHud();
  }

  /** Awake: the player says what is wrong (the morning's clock starts). */
  private wakeUp() {
    this.morning.at = this.clock;
    this.say('YOU', WAKE_LINES, this.p.x, 46);
  }

  /** Moth's message: in the deck, as a bubble, and uplink.so with it (hacking is yours from now on). */
  private mothWrites() {
    this.morning.sent = true;
    MOTH_MESSAGE.forEach((l) => this.term.print('moth> ' + l, 'ok'));
    this.save.flags[OPENING.uplink] = true;
    if (!this.save.keyring.includes(UPLINK_KEY)) this.save.keyring.push(UPLINK_KEY);
    storeSave(this.save);
    this.syncHud();
    this.term.print('[deck] uplink.so received. hack vision: H · the board: B', 'ok');
    sound.granted();
    this.say('MOTH › YOU', MOTH_MESSAGE, this.p.x, 46);
    this.bubble!.then = () => this.say('YOU', UPLINK_LINES(this.touch), this.p.x, 46);
  }

  /** The idle ping: the next goal's target (opening.ts `OPENING_PINGS`): a device, or a point (a door, an exit, the bed). */
  private pingGoal(t: PingTarget) {
    if ('device' in t) { this.zh.ping(t.device, 'look'); return; }
    let x: number | undefined;
    if ('door' in t) x = this.def.exits.filter((e) => e.action === 'out').map((e) => e.x).sort((a, b) => Math.abs(a - this.p.x) - Math.abs(b - this.p.x))[0];
    else if ('exit' in t) x = this.def.exits.find((e) => e.id === t.exit)?.x;
    else x = pick(OPENING_TARGETS, this.story, this.here, t.story)?.x;
    if (x === undefined) return;
    this.goalAt = x;
    this.zh.ping('goal', 'look');
  }

  /** The flat's light: warm at dawn, cold the morning after (until the door is yours again). Under the player, over the room. */
  private drawLight() {
    if (this.here !== 'capsule' || this.zh.visionOn) return;
    const f = this.save.flags;
    const tone = this.story === 'flat' ? 'warm' : f[OPENING.slept] && !this.zh.model.get('doorOpen') ? 'cold' : null;
    if (tone) drawCapsuleWash(this.x, this.viewW, this.viewH, tone);
  }

  /** The turnstile verifying, over the gate: dots, one beat too long, then ok. */
  private drawBeat() {
    if (!this.beat) return;
    const x = this.x, e = this.clock - this.beat.start, ok = e >= TURNSTILE.verify;
    const dots = '.'.repeat(1 + (Math.floor(e / 20) % 3)).padEnd(3, ' ');
    const line = ok ? 'TURNSTILE: verifying… … ok.' : 'TURNSTILE: verifying' + dots;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'middle';
    const w = x.measureText('TURNSTILE: verifying… … ok.').width + 16, cx = Math.max(w / 2 + 4, Math.min(this.viewW - w / 2 - 4, this.sx(this.beat.checkpoint.x)));
    const top = this.y(96 + this.beat.checkpoint.h), gate = this.y(36 + this.beat.checkpoint.h);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - w / 2, top, w, 20);
    x.strokeStyle = ok ? 'rgba(34,197,94,.8)' : 'rgba(255,217,165,.45)'; x.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, 19);
    x.fillStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.92)'; x.fillText(line, cx - w / 2 + 8, top + 10.5);
    x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(this.sx(this.beat.checkpoint.x), top + 20, 1, gate - top - 20);
    x.restore();
  }

  /** The sleep or a wait: dark, a card with the clock (06:04, then 09:40; now, then later), light again. */
  private drawSleep() {
    if (!this.sleep) return;
    const x = this.x, e = this.clock - this.sleep.start, S = this.sleep.card;
    const a = e < S.out ? e / S.out : e < S.out + S.card ? 1 : Math.max(0, 1 - (e - S.out - S.card) / S.in);
    x.fillStyle = 'rgba(0,0,0,' + a + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
    if (e < S.out || e > S.out + S.card) return;
    const f = (e - S.out) / S.card, fade = Math.min(1, Math.min(f, 1 - f) * 6);
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '600 18px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,' + 0.95 * fade + ')';
    x.fillText(f < 0.5 ? this.sleep.from : this.sleep.to, this.viewW / 2, this.viewH / 2 - 6);
    x.font = '8px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + 0.7 * fade + ')';
    x.fillText(this.sleep.label, this.viewW / 2, this.viewH / 2 + 14);
    x.restore();
  }

  // ---------- cutscenes (cutscenes/) ----------
  // While one plays, the scene's update and draw are skipped entirely; any key or tap skips it.

  private cut: CutscenePlay | null = null;
  private cutThen: (() => void) | null = null;
  /** A cutscene a story beat asked for, waiting for the screen to be free. */
  private pendingCut: string | null = null;

  /**
   * Contacts on your deck (contacts.ts): after a story beat, say what came in. The messages stay
   * unread until `msg <contact>` in the deck.
   */
  private inbox() {
    const news = unread(this.save.flags);
    if (!news.length) return;
    const who = [...new Set(news.map((n) => n.contact))];
    who.forEach((c) => this.term.print('[deck] ' + c.name + ' · ' + c.status + ' · ' + messagesOf(c, this.save.flags).length + ' message(s) · type: msg ' + c.id, 'ok'));
    if (who.some((c) => c.id === 'moth')) this.say('YOU', ['Moth is on my deck now. One bar of signal, out on the water.', this.touch ? 'TERMINAL, then: msg moth.' : 'ENTER for the terminal, then: msg moth.'], this.p.x, 46);
  }

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's `next` scene (from its data).
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(id: CutsceneId | string, then?: () => void) {
    const scene = cutsceneById(id);
    const after = then ?? (() => scene && this.handTo(scene.next));
    if (!scene) { after(); return; }
    this.endCutscene(false);
    this.bubble = null;
    this.keys.clear();
    this.hosts.forEach((h) => h.closeAll());
    this.term.close();
    this.cut = new CutscenePlay(scene, { reduced: this.reduced, touch: this.touch });
    this.syncEnginePause();
    this.cutThen = after;
    document.documentElement.classList.add('cutscene');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + scene.cards.map((c) => c.text).join(' '));
    this.host.setScene(scene.title);
  }

  private stepCutscene(dt: number) {
    const c = this.cut!;
    c.step((dt / 60) * (this.transport?.rate ?? 1));
    this.transport?.sync();
    const x = this.x;
    x.setTransform(this.k, 0, 0, this.k, 0, 0);
    x.imageSmoothingEnabled = false;
    c.draw(x, this.viewW, this.viewH);
    if (c.done) this.endCutscene(true);
  }

  /** Stop the cutscene; `andThen` runs what comes after it (false when the game stops mid-scene). */
  private endCutscene(andThen: boolean) {
    if (!this.cut) return;
    const then = this.cutThen;
    this.cut = null;
    this.cutThen = null;
    document.documentElement.classList.remove('cutscene');
    this.syncHud();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
    if (andThen) then?.();
  }

  /** Sudo's LEVELS: play a cutscene (then its next scene), or arrive in a scene at its spawn. */
  private enterLevel(id: string) {
    if (id === 'title') { this.showTitle(); return; }
    this.endTitle();
    this.bubble = null;
    const opening = openingLevel(id);
    if (opening) { this.openingFrom(opening.flags); return; }
    if (isCutsceneId(id)) { this.playCutscene(id); return; }
    this.handTo(startLevel(id) ?? id);
    this.markSeen(this.here);
    storeSave(this.save);
  }

  /** Arrive in a scene by id (anything else is Downtown), at its spawn. */
  handTo(id: string, entrance?: string) {
    this.enter(isSceneId(id) ? id : 'downtown', true, entrance);
  }

  // ---------- a scene's ways out and its life ----------

  private sceneView: SceneView | null = null;

  /**
   * A scene's ways out as E targets: its doors, stairs and pads (an open border is walked
   * into instead; one its code offers is an engine target). A platform's BOARD is one
   * target at each of the train's doors, only while it stands there with them open.
   */
  private exitTargets(s: SceneDef): Target[] {
    const list: Target[] = [];
    for (const e of s.exits) {
      if (e.edge || e.engine || (e.requires && !this.save.flags[e.requires])) continue;
      if (e.action === 'board') {
        const st = stationAt(this.here);
        if (st) for (const dx of platformDoors(st, this.t, this.cam, s.platformStop ?? STOP)) list.push({ kind: 'exit', id: 'exit:' + e.id, x: dx, h: 0, label: e.label + ' · LINE 0 > ' + STATIONS[nextStation(st)].name, promptH: e.promptH ?? 70 });
        continue;
      }
      // The train's door: only while it stands at a stop with the doors open.
      if (e.action === 'out' && !rideOpen()) continue;
      // a taxi stand shows its fare and what you have (tokens show only where you pay)
      const label = e.action === 'out' ? '[E] STEP OUT · ' + (rideAtSiding() ? 'SIDING' : STATIONS[rideStop()].name)
        : e.action === 'taxi' ? e.label + ' · ' + priceTag(FARE, this.save.tokens) : e.label;
      list.push({ kind: 'exit', id: 'exit:' + e.id, x: e.x, h: 0, label, promptH: e.promptH ?? 70 });
    }
    return list;
  }

  /**
   * A scene's life as E targets: readables, uses, the people who talk, and the animals
   * (cats to pet, pigeons to shoo) and robots. E on one runs `useLife`.
   */
  private lifeTargets(s: SceneDef): Target[] {
    const list: Target[] = [];
    for (const r of s.readables ?? []) list.push({ kind: 'life', id: 'read:' + r.id, x: r.x, h: 0, label: r.label ?? '[E] READ', promptH: r.promptH ?? 70 });
    for (const u of s.uses ?? []) if (!u.available || u.available(this.save.flags)) list.push({ kind: 'life', id: 'use:' + u.id, x: u.x, h: 0, label: this.useLabel(u), promptH: u.promptH ?? 70 });
    // benches, stools and the bed: wait until… (not while a story beat holds the clock: the opening's own bed is its sleep)
    if (city.pinned === null) for (const r of s.rests ?? []) list.push({ kind: 'life', id: 'rest:' + r.id, x: r.x, h: r.h ?? 0, label: r.kind === 'bed' ? '[E] SLEEP · WAIT' : '[E] SIT · WAIT', promptH: r.promptH ?? 60 });
    // the scene's people with something to say (characters.ts): the target follows a walker (nobody outside their time window)
    for (const p of s.people ?? []) if (p.id && p.talk && isHere(p)) list.push({ kind: 'life', id: 'talk:' + p.id, x: characterX(p, this.t), h: 0, label: '[E] TALK', promptH: characterHeight(p) + 16 });
    // animals: people always want to pet the cat (and the pigeon gets shooed)
    (s.people ?? []).forEach((p, i) => {
      if (!isHere(p)) return;
      if (!p.talk && (p.look === 'cat' || p.look === 'pigeon')) list.push({ kind: 'life', id: 'pet:' + i, x: characterX(p, this.t), h: 0, label: p.look === 'cat' ? '[E] PET' : '[E] SHOO', promptH: characterHeight(p) + 14 });
      // robots without talk still answer: a beep, a status, a polite refusal
      else if (!p.talk && isBot(p)) list.push({ kind: 'life', id: 'bot:' + i, x: characterX(p, this.t), h: 0, label: botReact(p).label, promptH: characterHeight(p) + 14 });
    });
    return list;
  }

  /** E next to a scene's exit or something of its life (`kind:id`, as `exitTargets` and `lifeTargets` make them). */
  private useLife(target: string) {
    const s = this.def, [kind, id] = target.split(':');
    if (kind === 'story') { if (id === 'bed') this.sleepNow(); return; }
    if (kind === 'rest') { const r = s.rests?.find((z) => z.id === id); if (r) this.offerWait(r); return; }
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!, o = pick(OPENING_LINES, this.story, this.here, id);
      this.say(o?.name ?? r.name, o?.pages ?? r.pages, r.x, r.h ?? 70);
      return;
    }
    if (kind === 'pet') {
      const p = s.people![Number(id)], n = this.petCount++;
      const lines = p.look === 'cat' ? PET_CAT : PET_PIGEON;
      sound.blip();
      this.say(p.look === 'cat' ? 'CAT' : 'PIGEON', lines[n % lines.length], characterX(p, this.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'bot') {
      const p = s.people![Number(id)], said = botReact(p, true);
      sound.blip();
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'talk') {
      const p = s.people!.find((z) => z.id === id)!, said = talkTo(p,this.gameplayFor(this.here));
      storeSave(this.save);
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) - 10);
      return;
    }
    if (kind === 'use') {
      const u = s.uses!.find((z) => z.id === id)!;
      // something you carry that it takes: a popup, those first ("give the tea"), then the use itself
      const own = (u.items ?? []).filter((x) => (this.save.items[x.item] ?? 0) > 0);
      if (!own.length) { this.runUse(u, u.use); return; }
      const price = this.usePrice(u), base = u.act ?? u.label.replace(/^\[E\]\s*/, '').toLowerCase();
      const items: PopupItem[] = [
        ...own.map((x) => ({ label: x.label, own: true, run: () => this.runUse(u, x.use) })),
        { label: base + (price ? ' · ' + priceTag(price, this.save.tokens).toLowerCase() : ''), run: () => this.runUse(u, u.use) },
      ].slice(0, MAX_EVERYDAY);
      this.zh.choose('use:' + u.id, u.name, items, { x: u.x, y: 0, w: 40, h: Math.max(16, (u.promptH ?? 70) - 24) });
      sound.open();
      return;
    }
    const e = s.exits.find((z) => z.id === id);
    if (e) this.useExit(e);
  }

  /** What a use costs now (0: nothing to pay this time). */
  private usePrice(u: SceneUse) { return typeof u.price === 'function' ? u.price(this.save.flags,this.gameplayFor(this.here)) : u.price ?? 0; }
  /** A use's E prompt: its price and what you have, only when there is something to pay. */
  private useLabel(u: SceneUse) { const n = this.usePrice(u); return n ? u.label + ' · ' + priceTag(n, this.save.tokens) : u.label; }

  /** Run a use (or what it does with something you carry), say what comes of it, write the save. */
  private runUse(u: SceneUse, fn: (c: UseCtx) => SceneSaid) {
    const save = this.save;
    const gameplay=this.gameplayFor(this.here),tokensBefore=save.tokens;
    const out = fn({
      gameplay,
      tokens: save.tokens,
      pay: (n) => { if (save.tokens < n) return false; save.tokens -= n; this.flash('-' + n + ' token' + (n === 1 ? '' : 's')); return true; },
      give: (n) => { save.tokens += n; this.flash('+' + n + ' token' + (n === 1 ? '' : 's')); },
      flags: save.flags, set: (f) => { save.flags[f] = true; }, t: this.t,
      weather: this.weatherHere().kind, min: city.min,
      // what you carry: the save's items, across scenes and reloads
      has: (item, n = 1) => (save.items[item] ?? 0) >= n,
      take: (item, n = 1) => {
        if ((save.items[item] ?? 0) < n) return false;
        save.items[item] -= n;
        if (save.items[item] <= 0) delete save.items[item];
        return true;
      },
      add: (item, n = 1) => { save.items[item] = (save.items[item] ?? 0) + n; },
    });
    const tokenDelta=save.tokens-tokensBefore;
    if(gameplay&&tokenDelta)this.flash((tokenDelta>0?'+':'')+tokenDelta+' token'+(Math.abs(tokenDelta)===1?'':'s'));
    storeSave(save);
    this.syncHud();
    const said = Array.isArray(out) ? { name: u.name, pages: out } : out;
    if(said.conversation){if(!gameplay)throw new Error('Conversation requires gameplay session');this.zh.presentConversation(new ConversationSession(gameplay,said.conversation));return;}
    if (said.pages.length) this.say(said.name, said.pages, u.x, u.h ?? 60);
  }

  /** Leave through an exit: board, step out, hail a taxi, look at the map, or walk to its scene, landing at its matching exit there. */
  private useExit(e: SceneExit) {
    // the opening: some ways out do something else in this state (the turnstile, CONCIERGE, "bed first")
    const rule = pick(OPENING_EXITS, this.story, this.here, e.id);
    if (rule && this.storyExit(rule, e.x, () => { if (isSceneId(e.to)) this.travel(e.to, e.at); }, e.checkpoint)) return;
    // a door that reads key chips (Moth's building): only the right one opens it
    if (e.needs && !this.save.keyring.includes(e.needs.key)) { sound.denied(); this.say(e.needs.name, e.needs.pages, e.x, e.needs.h); return; }
    if (e.action === 'board') { const st = stationAt(this.here); if (st && platformOpen(st, this.t)) this.enterTrain(st); return; }
    if (e.action === 'out') { this.stepOut(); return; }
    if (e.action === 'taxi') { this.hailTaxi(); return; }
    if (e.action === 'map') { this.showMap(); sound.open(); return; }
    if (!isSceneId(e.to)) return;
    // the flat's door: Pixel comes along from now on
    if (e.sets) { this.save.flags[e.sets] = true; storeSave(this.save); }
    this.travel(e.to, e.at);
  }

  /** The scene view, refreshed for this frame. */
  private view(): SceneView {
    const v = (this.sceneView ??= { ...frameView(0), sx: (wx, p = 1) => this.sx(wx, p), y: (h) => this.y(h), flags: this.save.flags });
    v.t = this.t; v.viewW = this.viewW; v.viewH = this.viewH; v.cam = this.cam; v.gy = this.gy; v.flags = this.save.flags;
    return v;
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a scene, landing at its exit `at` there. */
  private travel(id: SceneId, at?: string) {
    this.mapView = null;
    this.enter(id, false, at);
    // With reduced motion the platforms' clocks stand still: stand a train there with its doors open.
    const st = stationAt(id);
    if (st && this.reduced && !platformOpen(st, this.t)) platformSync(st, this.t, TIMETABLE.dwell / 2);
  }

  /** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const e = this.def.exits.find((z) => z.edge === edge && (!z.requires || this.save.flags[z.requires]));
    if (!e || !isSceneId(e.to)) return;
    this.travel(e.to, e.at);
    this.p.face = edge === 'left' ? -1 : 1;
  }

  /** Remember a scene for the city map: `flags['seen:<scene>']`. */
  private markSeen(id: SceneId) {
    this.save.scene = id;
    const f = seenFlag(id);
    this.save.flags[f] = true;
    storeSave(this.save);
  }

  /** Board the train standing at a station's platform: in the car by its door, which stays open as long as it would have on the platform. */
  private enterTrain(at: Station) {
    boardRide(at, platformLeft(at, this.t));
    this.travel('train', 'out');
  }

  /** E at the train's open door: out onto the platform of the stop it stands at, the train still there behind you until it leaves. */
  private stepOut() {
    if (!rideOpen()) return;
    // P14: the old siding has no station, only a service stair up to the harbor's pier
    if (rideAtSiding()) { this.travel('harbor', 'metro'); this.say('YOU', SIDING_OUT, this.p.x, 50); return; }
    const st = rideStop(), left = rideLeft();
    this.travel(STATIONS[st].scene, 'train');
    platformSync(st, this.t, this.reduced ? TIMETABLE.dwell / 2 : left);
  }

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < FARE) {
      sound.denied();
      this.say('DRIVER', DRIVER_BROKE, this.p.x + 20, 40);
      return;
    }
    this.mapView = openMap('taxi', this.here, this.here === 'train' ? rideStop() : null);
    this.keys.clear();
    this.syncEnginePause();
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (SHIFT_PROTOTYPE) return;
    if (!this.running || this.flight || this.hop) return;
    this.keys.clear();
    this.bubble = null;
    // the map takes the screen: hack vision closes first
    if (this.zh.visionOn) this.zh.toggleVision();
    this.mapView = openMap('view', this.here, this.here === 'train' ? rideStop() : null);
    this.syncEnginePause();
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.mapView; }

  private mapKey(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.mapAct(mapKey(this.mapState(), k));
  }

  /** Do what the map asks: close, a sound, quick travel to a place, a taxi to a stand. */
  private mapAct(a: MapAct) {
    switch (a.kind) {
      case 'close': this.mapView = null; this.canvas.style.cursor = ''; sound.close(); return;
      case 'blip': sound.blip(); return;
      case 'zoom': sound.open(); return;
      case 'back': sound.close(); return;
      case 'denied': sound.denied(); return;
      case 'go': this.quickTravel(a.place); return;
      case 'fly': this.fly(a.stand); return;
    }
  }

  /** Take a sky taxi to a stand, for the fare. */
  private fly(to: Stand) {
    this.mapView = null;
    this.canvas.style.cursor = '';
    if (to === standOf(this.here)) { this.flash('you are already here'); return; }
    // the harbor lock: no flights to the pier until P14
    if (to === 'harbor' && !harborOpen(this.save.flags)) { sound.denied(); this.say('DRIVER', DRIVER_HARBOR, this.p.x + 20, 40); return; }
    this.save.tokens -= FARE;
    storeSave(this.save);
    this.syncHud();
    this.flight = { to, start: this.clock };
    sound.open();
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  private mapState(): MapState {
    const m = this.mapView ?? openMap('view', this.here, null);
    return {
      view: m, touch: this.touch, scene: this.here, reduced: this.reduced,
      // the smallest touch target, 44 CSS px, in view units
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.k,
      avoid: this.mapAvoid(),
      ride: this.here === 'train' ? { from: rideStop(), to: rideNext(), f: rideRun() } : null,
      seen: (z) => !!this.save.flags[seenFlag(z)], flag: (f) => !!this.save.flags[f], gateOpen: !!this.save.flags.end, harborOpen: harborOpen(this.save.flags), tokens: this.save.tokens, t: this.clock,
    };
  }

  /** The phone's ESC button, which stays over the open map, in view units (null when it is not shown). */
  private mapAvoid() {
    const b = document.querySelector<HTMLElement>('#touch button[data-key="Escape"]');
    const br = b?.getBoundingClientRect(), r = this.canvas.getBoundingClientRect();
    if (!br || !br.width || !r.width) return null;
    const f = this.canvas.width / r.width / this.k;
    return { x: (br.left - r.left) * f, y: (br.top - r.top) * f, w: br.width * f, h: br.height * f };
  }

  /** The pointer on the open map (citymap.ts reads it: districts, places, pads, back, outside). */
  private mapPointer(e: PointerEvent, press: boolean) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const { act, pointer } = mapPointer(this.mapState(), this.viewW, this.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.mapAct(act);
  }

  /** Quick travel to a place you know, from the map: no fare, a short fade; or say why not. */
  private quickTravel(place: MapPlace) {
    if (hackLocked(this.save.flags)) { this.flash('not now: ' + (pick(OPENING_GOAL, this.story, this.here) ?? 'later')); sound.denied(); return; }
    const why = placeBlocked(place, this.mapState());
    if (why) { this.flash(why.toLowerCase()); sound.denied(); return; }
    this.mapView = null;
    this.canvas.style.cursor = '';
    this.hop = { place, start: this.clock, done: false };
    sound.close();
  }

  /** Flights land; on board, the train stands, closes its doors, runs to the next stop on the loop and opens them (line.ts). */
  private updateTravel(dt: number) {
    // Maps hold the ride as well as the engine that reads its position (P14).
    if (this.mapView || this.netView) return;
    // the harbor lock: LINE 0 stops there only once P14 is solved
    lineOpen.harbor = harborOpen(this.save.flags);
    if (this.flight && this.clock - this.flight.start >= taxiSequenceDuration * 60) {
      const to = this.flight.to;
      this.flight = null;
      // the flight costs its fixed time on the city clock (clock.ts TRAVEL)
      city.advance(TRAVEL.taxi);
      this.travel(STANDS[to].scene, 'taxi');
      this.flash('-' + FARE + ' token · ' + STANDS[to].name);
    }
    // a quick trip moves you while the screen is dark, half way through its fade
    if (this.hop) {
      const e = this.clock - this.hop.start;
      if (!this.hop.done && e >= HOP / 2) { this.hop.done = true; city.advance(TRAVEL.quick); this.travel(this.hop.place.entrance, this.hop.place.at); }
      if (e >= HOP) this.hop = null;
    }
    if (this.here !== 'train') return;
    const ev = stepRide(dt);
    // the train home stands at Downtown with its doors open until you get off
    if (this.story === 'home' && ride.phase === 'dwell' && rideStop() === 'downtown') ride.timer = 0;
    if (ev === 'depart') { this.flash('NEXT: ' + STATIONS[rideNext()].name); sound.close(); }
    else if (ev === 'arrive') { this.flash(STATIONS[rideStop()].name + ' · doors open'); sound.open(); }
    else if (ev === 'pass') this.flash('HARBOR · STATION CLOSED · NOT STOPPING');
  }

  // ---------- the net map (netmap.ts, NET.md) ----------

  /** NET is yours: scan.so owned, and hacking yours (not in the opening's locked part). */
  private get netOk() { return this.save.programs.includes(SCAN) && !hackLocked(this.save.flags); }

  /** A program came (scan.so from the library): saved, and NET shows in hack vision's bar, pinging until used. */
  private grantProgram(id: string) {
    if (!this.save.programs.includes(id)) this.save.programs.push(id);
    storeSave(this.save);
    this.syncHud();
    if (id === SCAN) { this.flash(this.touch ? 'NET: in hack vision, the net map' : 'NET: N, the net map'); sound.granted(); }
  }

  /**
   * N or NET: the net map, full screen. Opening it is a scan from where you are plugged in (scan.so):
   * the networks you reach go into the save as found, the nodes in reach onto the board as silhouettes.
   */
  showNet() {
    if (!this.running || this.flight || this.hop || !this.netOk) return;
    this.keys.clear();
    this.bubble = null;
    this.mapView = null;
    this.netBack = this.zh.visionOn;
    if (this.zh.visionOn) this.zh.toggleVision();
    // the map takes the screen: popups, captions and panels go
    this.zh.closeAll();
    const zh = this.zh, reached = zh.model.netsHere();
    // what you reach is found; so is any network with a port standing here (you can see the plug, if not the way in)
    const here = NET.networks.filter((n) => n.from.some((r) => 'port' in r && r.port.startsWith(this.here + ':'))).map((n) => n.id);
    for (const n of [...reached, ...here]) if (!this.save.nets.includes(n)) this.save.nets.push(n);
    if (zh.model.ports().length || reached.size) zh.typed(() => zh.scanHere());
    this.save.flags[NET_OPENED] = true;
    storeSave(this.save);
    this.netView = openNet();
    this.syncEnginePause();
    sound.open();
  }

  private closeNet(back = this.netBack) {
    this.netView = null;
    this.canvas.style.cursor = '';
    sound.close();
    if (back && !this.zh.visionOn && this.zh.hackable) this.zh.toggleVision();
  }

  /** A machine's name, from the scene file (or net.json) that has it. */
  private machineName(m: MachineData) {
    for (const s of m.in) {
      const d = s === 'net' ? NET.nodes.find((x) => x.id === m.id) : [...(SCENE_FILES[s]?.devices ?? []), ...(SCENE_FILES[s]?.nodes ?? [])].find((x) => x.id === m.id);
      if (d) return d.name;
    }
    return m.id.toUpperCase();
  }

  /** What the net map draws from: the networks you reach from here, those found, each machine's state from here. */
  private netState(): NetState {
    const zh = this.zh, model = zh.model, reached = model.netsHere();
    const portKeys = new Set(model.ports().map((p) => p.key));
    const plugged = new Set(NET.networks.filter((n) => n.from.some((r) => 'port' in r && portKeys.has(r.port))).map((n) => n.id));
    const state = (m: MachineData, n: NetworkData): MachineState => {
      if (!reached.has(n.id)) return 'out';
      if (!m.in.includes(this.here) && !m.in.includes('net')) return 'far';
      const d = model.devices.get(m.id);
      if (d && !d.node) return 'here';
      return model.net.get(m.id) === 'connected' ? 'board' : 'reach';
    };
    return {
      view: this.netView ?? openNet(), nets: NET.networks, reached, plugged, found: new Set(this.save.nets),
      where: sceneTitle(this.def), ports: [...new Set(model.ports().map((p) => model.devices.get(p.dev)?.name ?? p.dev))],
      controlled: this.save.controlled, name: (m) => this.machineName(m), state, touch: this.touch,
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.k, avoid: this.mapAvoid(), t: this.clock,
    };
  }

  private netKeyDown(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.netAct(netKey(this.netState(), k));
  }

  private netPointerAt(e: PointerEvent, press: boolean) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const { act, pointer } = netPointer(this.netState(), this.viewW, this.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.netAct(act);
  }

  /** Do what the net map asks: close, or a machine picked (onto the board, or why not). */
  private netAct(a: NetAct) {
    if (a.kind === 'close') { this.closeNet(); return; }
    if (a.kind === 'blip') { sound.blip(); return; }
    if (a.kind !== 'pick') return;
    const name = this.machineName(a.machine);
    if (a.state === 'out') { sound.denied(); this.flash(name + ': out of reach. plug in from ' + a.net.need); return; }
    if (a.state === 'far') {
      sound.denied();
      const place = a.machine.in.filter((s) => isSceneId(s)).map((s) => sceneTitle(SCENES[s as SceneId]))[0] ?? 'another place';
      this.flash(name + ' answers. its board is at ' + place);
      return;
    }
    this.closeNet(false);
    this.zh.plugIn(a.machine.id);
  }

  /** The deck's `scan`: what you reach from where you are plugged in (needs scan.so). */
  private deckScan() {
    const zh = this.zh, reached = zh.model.netsHere();
    for (const n of reached) if (zh.model.canScan && !this.save.nets.includes(n)) this.save.nets.push(n);
    storeSave(this.save);
    const l = zh.model.scanHere();
    this.term.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : 'dim');
    if (l[2] !== 'err' && reached.size) this.term.print('networks in reach: ' + NET.networks.filter((n) => reached.has(n.id)).map((n) => n.name).join(', '), 'dim');
  }

  /** The deck's `connect <machine>` (by id or name): onto the board, and the deck talks to it from then on. */
  private deckConnect(name: string) {
    const zh = this.zh, want = name.toLowerCase().replace(/\s+/g, '');
    const all = NET.networks.flatMap((n) => n.machines);
    const m = all.find((x) => x.id.toLowerCase() === want || this.machineName(x).toLowerCase().replace(/\s+/g, '') === want);
    const id = m?.id ?? name;
    if (!zh.model.devices.has(id) && !zh.model.nodesHere().includes(id) && !m) { this.term.print('connect: no machine called ' + (name || '?') + ' in reach. try scan.', 'err'); return; }
    zh.typed(() => zh.plugIn(id));
  }

  /** The GOAL after Capsule 7B, until scan.so is yours: the library (Act I: Capsule 7B → the library → Downtown). */
  private libraryGoal(): string | null {
    if (this.save.programs.includes(SCAN) || this.here === 'library' || hackLocked(this.save.flags)) return null;
    const cap = this.hosts.get('capsule')?.model.goals ?? new Set(this.save.scenes.capsule?.goals ?? []);
    if (!cap.has('door')) return null;
    // in the flat, its own goals first
    if (this.here === 'capsule' && this.zh.model.data.goals.some((g) => !cap.has(g.id))) return null;
    return 'the public library, down the street: scan.so (Moth\'s tip)';
  }

  /** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
  private drawMap() {
    if (this.hop) {
      const x = this.x, f = (this.clock - this.hop.start) / HOP;
      x.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1.2 - Math.abs(f * 2 - 1) * 1.2) + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
      if (f > 0.3 && f < 0.7) { x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('> ' + this.hop.place.name, this.viewW / 2, this.viewH / 2); x.restore(); }
    }
    if (this.mapView) drawCityMap(this.x, this.viewW, this.viewH, this.mapState());
  }
}

/**
 * The camera nudge: how long it leans towards an event (clock frames, ~1.6 s), how gently it moves
 * (ease per frame, against the follow's 0.12), the margin kept round the event and the player (world
 * units), and the least time between two nudges (frames, ~5 s).
 */
const NUDGE_HOLD = 96, NUDGE_EASE = 0.045, NUDGE_MARGIN = 36, NUDGE_GAP = 300;

/** Hack vision zooms out at least this far, even where the scene already fits the view (room over its devices for the circuits). */
const VISION_ZOOM_MIN = 0.7;

/** How often the clock's progress is written to the save while it runs (frames, ~10 s). */
const CLOCK_SAVE = 600;
/** A minute of the day as HH:MM (any number of minutes on). */
const hmOf = (min: number) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
