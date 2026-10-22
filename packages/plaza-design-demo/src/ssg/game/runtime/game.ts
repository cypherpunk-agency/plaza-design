import {runCommunicationReview,type CommunicationReview} from '../demo/communication-review';
import {nativeLiveConditionsTick} from '../engine/gameplay/native-live-conditions';
import {attachGameplayHandoffs} from '../engine/gameplay/handoffs';
import {registryLabels} from '../engine/gameplay/rewards';
import {cloneValues,mergeValues,resolveValues,deleteStateValue} from '../engine/gameplay/state';
import {type SceneModel} from '../engine/model';
import {withCompanionConversations,COMPANION_GAMEPLAY} from '../engine/gameplay/companion-conversations';
import {COMPANION_SOURCE,companionFlag,companionHere} from '../engine/gameplay/companion-source';
import type {GameRuntimeSources} from './game-sources';
import {runtimeSequenceDocuments} from '../story/sequence-documents';
import {defaultNetworkContext} from '../engine/network-context';
import {mintFeedback,type FeedbackReceipt} from '../engine/feedback-receipt';
import type {MetroStart} from '../world/transport/metro-start';
import {METRO_SOURCE,type MetroSource} from '../world/transport/metro-source';
import {CRITTER_REACTIONS,critterReaction,critterReply} from '../engine/gameplay/critter-reactions';
import {BOT_REACTIONS,withBotConversations,botVoice,botConversationId,type BotReactionDocument} from '../engine/gameplay/bot-conversations';
import {perfBegin,perfEnd,perfSample} from './diagnostics/performance';
import {mountPerformancePanel} from './diagnostics/performance-panel';
import {capabilityView,sceneExitAccess,exitVisibility,exitPermission} from '../world/access';
import {mountReviewNavigator} from '../demo/review-navigator';
import {reviewStations,reviewActions,REVIEW_STATIONS,type ReviewActionSource} from '../demo/review-stations';
import {nativeGameplayPort} from '../engine/gameplay/native-bindings';
import {ConversationSession} from '../engine/gameplay/conversation';
import { gameStorage, reloadRuntime } from './storage';
import { drawCapsuleWash } from '../art/atmosphere/capsule-wash';
import { AVATAR_PAINTERS } from './avatars';
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
 * The companion (companion.ts, engine/gameplay/companion.json) follows you once its flag is set.
 *
 * The canvas fills the landing page's window between its header and footer and
 * is drawn at an integer pixel scale so the sprites stay crisp.
 */

import { drawFlight,taxiDurationFor } from '../story/cutscenes/taxi';
import type { Handoff } from '../art/core/timeline';
import { type MachineData,type NetworkData } from "../data/index";
import { MAX_EVERYDAY } from "../engine/host";
import { CITY,NO_RULES,SceneHost } from "../engine/index";
import type { PopupItem } from "../engine/popup";
import { sceneShell } from "../engine/shell";

import { isSceneId,ITEMS,priceTag,SCENES,sceneTitle,type ItemId,type SceneDef,type SceneExit,type SceneId,type SceneRest,type SceneSaid,type SceneUse,type SceneView,type UseCtx } from "../scenes/index";
import { contactsModel,type ContactsModel } from "../story/contacts";
import { END_CARD,endCardText,type EndCardSource } from "../story/end-card";
import { applyCounter,arrivalFor,attentionAim,attentionDue,cardFrame,clockPin,gateFrame,goalHint,triggerFires,triggerStarts,washTone,type CardSpec,type Cue,type GateRule,type Say } from "../story/story-rules";
import { createCutscenes,CutscenePlay,isCutsceneId,type CutsceneId } from "../story/cutscenes/index";
import {openingStoryModel,type ExitRule,type OpeningState,type PingTarget} from '../story/opening';
import { Opening } from "../story/title/index";
import { createCityMap,type MapAct,type MapState,type MapView } from "../ui/citymap";
import { KeyBar } from "../ui/keybar";
import { Hints } from "../ui/hints";
import { Menu, type DeckData } from "../ui/menu";
import { drawNetMap,netKey,netPointer,openNet,type MachineState,type NetAct,type NetState,type NetView } from "../ui/netmap";
import { ShiftGuidance } from "../ui/shift-guidance";
import { levels,startLevel,SUDO,unlockAll } from "../ui/sudo";
import { Terminal,type LineKind } from "../ui/terminal";
import { commands,NO_ARGS,run,suggest,type Ctx } from "../ui/terminal/commands";
import { ClockBar,Transport } from "../ui/transport";
import * as defaultCity from '../world/city';
import type {CityModel,MapPlace,Stand,Station} from '../world/city';
import { city,parseHM,TRAVEL,WAIT_CARD,WAITS,type WaitTo } from "../world/clock";
import { light,lightAt,setLight,type Light } from "../world/light";
import { frameView } from '../art/core/view';
import {createLineSystem,timelineOf,PLATFORM_SHIFT,type LineSystem} from '../world/transport/line';
import {boardRide,startRide} from '../engine/gameplay/mechanisms/line-ride';
import { reportLines,sceneClimate,setHereClimate,weatherNow,type Weather } from "../world/weather";
import { sound } from './audio';
import { characterHeight,characterX,isBot,isHere,setSpeaker,talkTo } from './characters';
import { Companion, COMPANION_LOOKS } from './companion';
import { EDITOR_PLAY, PROBE } from "./mode";
import { can,playProfile,saveKey,sudoOn } from "./play-profile";
import { loadSave,newSave,nodeCount,ownedModules,storeSave,who,type Save } from "./save";
import { levelArrive, levelBounds, levelDown, levelFloor, levelHints, levelInteract, levelRiding, levelStep, levelUp, levelView, nearestPrompt, type Level } from "../engine/level";

/**
 * Something to press E on: a way out (`exit`), the scene's life (`life`: a readable, a use, someone
 * to talk to, an animal, a robot), a device or the scene's own target on the engine (`device`),
 * the companion (`companion`), and Downtown's street people and the fixer (`talk`, level.ts).
 */
type Target = { kind: 'exit' | 'life' | 'device' | 'companion' | 'level'; id: string; x: number; h: number; label: string; promptH?: number };
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
  private save: Save = sudoOn() ? unlockAll(loadSave()) : loadSave();
  private k = 2;
  private viewW = 640;
  private viewH = 320;
  private gy = 270;
  /** The ground line before the camera looks up or down (`camH`, world units: the floor height it follows in a level). */
  private gyBase = 270;
  private camH = 0;
  /** Floors, stairs, escalators, lifts and buildings of a level scene (engine/level.ts); null: one street line. */
  private level: Level | null = null;
  private cam = 0;
  private t = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private keys = new Set<string>();
  private p = { x: SCENES.downtown.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false };
  private bubble: Bubble | null = null;
  private showEnd = false;

  private touch = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } })();
  private ships: Ship[] = [];
  private disposePerformance?:()=>void;
  private reviewNav?:ReturnType<typeof mountReviewNavigator>;
  private reviewAllowed(){return can('review')||EDITOR_PLAY;}
  /** Hack is out of reach: the profile has no hacking, or the story has not given it yet (the opening's phases). */
  private hackLocked(){return !can('hack')||this.openingStory.hackLocked(this.save.flags);}
  private get reviewDoc(){return this.sources?.reviewStations??REVIEW_STATIONS;}
  private refreshReview(){this.reviewNav?.refresh(this.here,reviewActions(this.def,this.here,reviewStations(this.content,this.reviewDoc),this.reviewDoc).map(a=>a.id));}
  /** A review button (demo/review-stations.json `actions`): a use, a conversation or a person in the scene. */
  private reviewRun(a:ReviewActionSource){const r=a.run;if(r.use!==undefined)this.reviewUse(r.use);else if(r.talk!==undefined)this.reviewTalk(r.talk);else if(r.actor!==undefined)this.reviewActor(r.actor);}
  private reviewActor(id:string){if(this.reviewAllowed()&&this.def.people?.some(p=>p.id===id)){this.bubble=null;this.keys.clear();this.zh.closeAll();this.useLife('talk:'+id);this.canvas.focus();}}
  /** Explicit review bookmarks; never available in campaign play. */
  reviewJump(id:string){
    if(!this.reviewAllowed())return;const station=reviewStations(this.content,this.reviewDoc).find(s=>s.id===id);if(!station)return;
    this.keys.clear();this.bubble=null;this.zh.closeAll();this.menu.hide();this.mapView=null;this.netView=null;this.term.close();
    this.enter(station.scene as SceneId,true);this.bubble=null;Object.assign(this.p,{x:station.x,y:0,vy:0,onGround:true});
    this.cam=Math.max(0,Math.min(this.levelW-this.viewW,this.p.x-this.viewW*.45));if(this.levelW<this.viewW)this.cam=(this.levelW-this.viewW)/2;
    this.syncEnginePause();this.refreshReview();this.reviewNav?.station(id);this.canvas.focus();
  }
  private reviewTalk(id:string){if(!this.reviewAllowed()||!this.content[this.here])return;const session=this.gameplayFor(this.here);if(!session?.definition.conversations[id])return;this.bubble=null;this.keys.clear();this.zh.closeAll();this.zh.presentConversation(new ConversationSession(session,id));}
  private reviewUse(id:string){if(!this.reviewAllowed()||!this.content[this.here])return;const use=this.def.uses?.find(u=>u.id===id);if(!use||use.available&&!use.available(this.save.flags))return;this.bubble=null;this.zh.closeAll();this.keys.clear();this.runUse(use,use.use);this.canvas.focus();}
  private reviewCommunication(id:CommunicationReview){
    if(!can('review'))return;
    this.keys.clear();this.zh.closeAll();this.bubble=null;this.hints.sceneChanged();
    runCommunicationReview(id,{
      status:(text,tone)=>this.notify(text,tone),
      remote:()=>{const r=this.reviewDoc.communication.remote;this.reviewJump(r.station);this.zh.react(r.device,['','Remote device reply example.']);this.zh.ping(r.device,'look');},
      dialogue:()=>{this.say('REVIEWER',['A character is speaking. Press E to finish.'],this.p.x,60);this.hints.show('review.waiting','Optional help waited until the character finished.',{repeat:true,first:true});},
      repeat:()=>{const receipt=mintFeedback('demo','review-repeat','info');for(let n=0;n<4;n++)this.hints.notify('One signal, delivered four times.','info',receipt);this.term.print('One signal, delivered four times.','out',false);},
      motion:()=>this.reduced=!this.reduced,
    });this.canvas.focus();
  }
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  /** The scene the player is in. */
  private here: SceneId = playProfile().home as SceneId;
  /** Every key and what it does, along the top. */
  private keyBar: KeyBar;
  /** The hint lane under the scene title (ui/hints.ts); control hints are sent from `controlHints`. */
  private hints = new Hints(() => (this.save.seenHints ??= []));
  private shiftGuidance?: ShiftGuidance;
  /** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */
  private hosts = new Map<SceneId, SceneHost>();
  private gameplaySessions = new Map<SceneId, GameplaySession>();
  private compiledScenes=new Map<SceneId,SceneDef>();
  /** Where a saved game may resume: any scene, except a `stage.sudoOnly` one (the sandbox) without sudo. */
  private resumable(id: string): boolean { return this.hasScene(id) && (!this.sceneDefinition(id).sudoOnly || SUDO); }
  /** Scenes the deck can start over (`stage.resettable`; `stage.sudoOnly` ones only under sudo), in scene order. */
  private resettableScenes(): [string, SceneDef][] { return Object.entries({ ...SCENES, ...this.content } as Record<string, SceneDef | undefined>).filter((e): e is [string, SceneDef] => !!e[1]?.resettable && (!e[1].sudoOnly || SUDO)); }
  private get companionDoc(){return this.sources?.companion??COMPANION_SOURCE;}
  private get critters(){return this.sources?.critters??CRITTER_REACTIONS;}
  private get openingStory(){return this.sources?.openingStory??openingStoryModel;}
  private get contacts():ContactsModel{return this.sources?.contacts??contactsModel;}
  private get endCard():EndCardSource{return this.sources?.endCard??END_CARD;}
  private get sequenceDocuments(){return this.sources?.sequences??runtimeSequenceDocuments;}
  private get networkContext(){return this.sources?.network??defaultNetworkContext;}
  private cutsceneRegistry?:ReturnType<typeof createCutscenes>;
  private get nativeCutscenes(){return this.cutsceneRegistry??=createCutscenes(this.sequenceDocuments.cinematics);}
  private metroInstance?:LineSystem;
  private get metro(){return this.metroInstance??=createLineSystem(this.world,this.metroSource);}
  private get world():CityModel{return this.cityModel??defaultCity;}
  private cityMapInstance?:ReturnType<typeof createCityMap>;
  private get worldMap(){return this.cityMapInstance??=createCityMap(this.world);}
  private hasScene(id:string):id is SceneId{return Object.prototype.hasOwnProperty.call(this.content,id)||isSceneId(id);}
  private sceneDefinition(id:SceneId):SceneDef {let scene=this.compiledScenes.get(id);if(!scene){const source=this.content[id]??SCENES[id];if(!source)throw new Error('Unknown scene '+id);scene=withCompanionConversations(withBotConversations(source.bindWorld?.({city:this.world,metro:this.metro})??source,this.botReactions),this.sources?.companionGameplay??COMPANION_GAMEPLAY);this.compiledScenes.set(id,scene);}return scene;}
  /** One common state port for scene commands and source-authored global story workflows. */
  private gameplayStatePort(id?:SceneId):import('../engine/gameplay/types').StatePort {
    return {
        read:()=>{const state:import('../engine/gameplay/types').GameplayState={world:{day:city.day,minute:city.min,weather:weatherNow(sceneClimate(id??this.here)).kind},player:{handle:this.save.handle,jump:this.save.jump,controlled:this.save.controlled,keyring:this.save.keyring},flags:{...this.save.flags},items:this.save.items,tokens:this.save.tokens,values:this.save.gameplay};return state;},
        write:state=>{this.save.flags=state.flags;this.save.items=state.items;this.save.tokens=state.tokens;if(state.player){this.save.keyring=[...state.player.keyring];this.save.controlled=[...state.player.controlled];this.save.jump=state.player.jump;}mergeValues(this.save.gameplay??={},state.values??{});},
      };
  }
  private openingGameplaySession?:GameplaySession;
  /** The cinematic primitive reports a milestone; shared commands own flags and rewards. */
  private runOpeningWorkflow(role:import('../story/opening-source').OpeningWorkflow):boolean {
    let session=this.openingGameplaySession;
    if(!session){
      session=new GameplaySession(this.openingStory.GAMEPLAY,this.gameplayStatePort(),undefined,[],{keyring:new Set(this.networkContext.keyring.keys()),controlled:new Set(registryLabels(this.networkContext.net))});
      this.openingGameplaySession=session;
      if(session.definition.handoffs?.length)attachGameplayHandoffs(session,{schedule:(ms,run,canceled,detail)=>this.hostOf(this.here).model.later(ms,()=>{run();this.persistSave();this.syncHud();},detail,canceled),cutscene:id=>{this.pendingCut=id;},presentation:operation=>{if(operation==='end')this.showEnd=true;}});
    }
    return session.dispatch(this.openingStory.WORKFLOWS[role],'system').ok;
  }
  private gameplayFor(id:SceneId,providedModel?:SceneModel):GameplaySession|undefined {
    const definition=this.sceneDefinition(id).gameplay;
    if(!definition)return undefined;
    if(definition.native&&!providedModel&&!this.hosts.has(id)){this.hostOf(id);return this.gameplaySessions.get(id);}
    let session=this.gameplaySessions.get(id);
    if(!session){
      const port=this.gameplayStatePort(id);
      const model=()=>{const m=providedModel??this.hosts.get(id)?.model;if(!m)throw new Error('Native scene not ready');return m;};
      session=new GameplaySession(definition,definition.native?nativeGameplayPort(definition,port,model):port,()=>{
        if(definition.native){const m=model(),{state:scalar,...snapshot}=m.snapshot(),board=this.save.scenes[id]?.board;this.save.scenes[id]={...snapshot,...(board?{board}:{})};m.changed();}
        this.persistSave();this.syncHud();
      },this.sceneDefinition(id).objectives);
      const onEvent=this.sceneDefinition(id).gameplayEvent;if(onEvent)session.observe(event=>onEvent(event,this.t));
      this.gameplaySessions.set(id,session);
    }
    return session;
  }
  /** Serialization works on settled copies; live common blocks keep their identity and in-flight values. */
  private prepareSave(save:Save):Save{
    const values=cloneValues(save.gameplay),scenes={...save.scenes};
    for(const[id,host]of this.hosts){const {state,...engine}=host.model.snapshot();Object.assign(values[id]??={},state);scenes[id]={...engine,...(scenes[id]?.board?{board:scenes[id]!.board}:{})};}
    for(const id of new Set([...Object.keys(this.content),...Object.keys(SCENES)]))for(const[key,d]of Object.entries(this.sceneDefinition(id as SceneId).gameplay?.state??{}))if(d.lifetime!=='save')deleteStateValue(values,key);
    for(const[key,d]of Object.entries(this.openingStory.GAMEPLAY.state??{}))if(d.lifetime!=='save')deleteStateValue(values,key);
    return {...save,gameplay:values,scenes};
  }
  private persistSave(){storeSave(this.save,save=>this.prepareSave(save));}
  /** The companion body (engine/gameplay/companion.json): at home where a scene says so, at your heels once its flag is set. */
  private companionBody = new Companion();
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

  constructor(private host: GameHost, private content: Partial<Record<SceneId, SceneDef>> = {}, private editorClock:'story'|'fixed'|'running'='story',private botReactions:BotReactionDocument=BOT_REACTIONS,private cityModel:CityModel=defaultCity,private metroSource:MetroSource=METRO_SOURCE,metroStart?:MetroStart,private sources:GameRuntimeSources={}) {
    // sudo (developer) mode: browser checks read the player and the level, and place the player, through window.__game
    const game = this;
    if (SUDO || PROBE) (globalThis as { __game?: unknown }).__game = { get player() { return game.p; }, get level() { return game.level; }, get here() { return game.here; }, prompt: () => game.nearest(), probe: () => game.probeFrame(), ...(SUDO ? { place: (x: number) => { game.p.x = x; } } : {}) };
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    this.term.onLine = (text, kind) => { if (kind === 'err' && !this.term.isOpen) this.hints.notify(text.split('\n').pop() ?? text,'error'); };
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length) return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => this.canvas.focus();

    this.keyBar = new KeyBar(host.windowEl);
    if (playProfile().guidance.style === 'shift') this.shiftGuidance = new ShiftGuidance(host.windowEl, this.reduced, wx => {
      this.zh.clearPing('goal');
      this.goalAt = wx;
      if (wx !== null) this.zh.ping('goal', 'look');
    }, flags=>this.def.attention?.(flags,this.gameplayFor(this.here)?.state())??null, flags=>this.def.objective?.(flags,this.gameplayFor(this.here)?.state())??'');
    this.menu = new Menu(host.windowEl, {
      save: () => this.save,
      saveSnapshot:()=>this.prepareSave(this.save),
      scene: () => ({ id: this.here, name: sceneTitle(this.def) }),
      newGame: () => this.newGame(),
      continueGame: () => this.continueGame(undefined, true),
      hasSave: () => this.hasSave(),
      quit: () => host.onExit(),
      // the city map lives in the menu too (TAB and M still open it on a keyboard)
      ...(can('map') ? { map: () => this.showMap() } : {}),
      onClose: () => { this.syncEnginePause(); this.canvas.focus(); },
      ...(sudoOn() ? { levels, enter: (id: string) => this.enterLevel(id) } : {}),
      // the deck's JOBS, CARRY, CONTROLS (and TERM on touch); the Shift prototype keeps SYSTEM only
      ...(can('deck') ? { deck: this.deckData() } : {}),
    }, this.touch);
    // sudo: the time control over the title's sunrise, the glide and cutscenes (transport.ts); in a scene, the city clock's
    if (sudoOn()) {
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
    // Downtown is already the initial scene, so starting there does not call enter().
    this.p.x = this.def.spawn;
    // a private Play's train: boarded and run to the state its fixture asks for, on the car's own movers
    if (metroStart) this.startMetro(metroStart);
  }

  /**
   * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
   * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
   */
  private hostOf(id: SceneId): SceneHost {
    const had = this.hosts.get(id);
    if (had) return had;
    const def: SceneDef = this.sceneDefinition(id);
    const print = (text:string,kind?:LineKind,from?:string,receipt?:FeedbackReceipt)=>{this.term.print(text,kind,!from&&!receipt,receipt);};
    const rules = typeof def.rules === 'function' ? def.rules({
      save: () => this.save,
      persist: () => this.persist(),
      nodes: () => nodeCount(this.save),
      granted: (receipt) => sound.feedback(receipt??mintFeedback(this.here,'controller','success')),
      end: () => { this.showEnd = true; },
      // a story beat's cutscene (the stacks' ACT II card) waits for the screen to be free (`loop`)
      cutscene: (cut) => { this.pendingCut = cut; },
    }) : def.rules ?? NO_RULES;
    const zh = new SceneHost(this.host.windowEl, print, {
      notice:(text,tone,receipt)=>{this.hints.notify(text,tone,receipt);},
      feedbackCue:receipt=>sound.feedback(receipt),
      cue:cue=>{if(cue==='open')sound.open();else sound.close();},
      hints:this.hints,
      hintBusy:()=>document.hidden||this.menu.open||!!this.opening||!!this.cut||!!this.mapView||!!this.netView||!!this.flight||this.showEnd||!!this.sleep||this.term.isOpen||!!this.bubble||!!this.hosts.get(id)?.acknowledgmentPending,
      feedbackTime:()=>this.hints.notices.time,
      cutscene:cut=>{this.pendingCut=cut;},
      presentation:operation=>{if(operation==='end')this.showEnd=true;},
      state:()=>{const values=this.save.gameplay??={};if(def.gameplay)mergeValues(values,resolveValues(def.gameplay,{flags:this.save.flags,items:this.save.items,tokens:this.save.tokens,values}));return values[id]??={};},
      gameplay:model=>this.gameplayFor(id,model),
      conversation:(conversationId)=>{const session=this.gameplayFor(id);return session?.definition.conversations[conversationId]?new ConversationSession(session,conversationId):undefined;},
      conversationCompleted:cue=>{if(this.here===id)this.completeConversation(cue);},
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); this.persistSave(); },
      // scene steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => { if (!this.save.modules.includes(mod)) this.save.modules.push(mod); this.persistSave(); this.syncHud(); },
      tokens: (n) => { this.save.tokens += n; this.persistSave(); this.syncHud(); return this.save.tokens; },
      // what you carry (the HUD's HELD) and story flags, for scene effects (the laundromat's jacket)
      carry: (item, n) => {
        const now = Math.max(0, (this.save.items[item] ?? 0) + n);
        if (now) this.save.items[item] = now; else delete this.save.items[item];
        if (n) { this.persistSave(); this.syncHud(); }
        return now;
      },
      flag: (f) => { this.save.flags[f] = true; this.persistSave(); },
      drop: () => this.persistSave(),
      sudo: SUDO,
      // the net (NET.md): programs you own (scan.so), and the nodes that answer to you
      programs: () => this.save.programs,
      program: (p,receipt) => this.grantProgram(p,receipt),
      controlled: () => this.save.controlled,
      load: () => this.save.scenes[id],
      store: (z) => { this.save.scenes[id] = z; this.persistSave(); },
    }, def, rules,this.networkContext);
    // the companion is the game's, not the scene's: lines about it stand over it, and popups keep clear of it
    zh.where = (from) => {
      if(from===this.companionDoc.speaker&&this.companionPresent)return {x:this.companionBody.x,h:this.companionBody.h};
      if(from==='goal'&&this.goalAt!==null)return {x:this.goalAt,h:20};
      const source=from.startsWith('use:')?def.uses?.find(u=>u.id===from.slice(4)):from.startsWith('exit:')?def.exits.find(e=>e.id===from.slice(5)):undefined;
      return source?{x:source.x,h:'h'in source?source.h??0:0}:null;
    };
    // the opening (opening.ts): hacking is not yours until uplink.so, and some everyday actions say something else
    zh.hackLock = () => this.hackLocked();
    zh.story = (dev) => this.storyChips(id, dev);
    zh.extras = () => (this.companionDoc.avoidPopups && this.companionPresent ? [{ x: this.companionBody.x, h: this.companionBody.h }] : []);
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
    zh.netNew = () => false;
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
  private get def(): SceneDef { return this.sceneDefinition(this.here); }
  private get zh(): SceneHost { return this.hostOf(this.here); }

  /** Write current progress, refresh the HUD and evaluate source-authored persistence triggers. */
  private persist() {
    this.persistSave();
    this.syncHud();
    for(const id of new Set([...Object.keys(this.content),...Object.keys(SCENES)])){
      const definition=this.sceneDefinition(id as SceneId).gameplay;
      if(!Object.values(definition?.native?.triggers??{}).some(row=>row.phase==='onPersist'))continue;
      const host=this.hostOf(id as SceneId),session=this.gameplayFor(id as SceneId);
      if(session)nativeLiveConditionsTick(host.model,session,run=>run(),'onPersist');
    }
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
    this.disposePerformance??=mountPerformancePanel(this.host.windowEl,()=>({scene:this.here,clock:{...this.save.clock},weather:this.weatherHere().kind,camera:this.cam,scale:this.k,hostedScenes:[...this.hosts.keys()],actors:this.def.people?.length??0,devices:this.zh.model.data.devices.length}));
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame((n) => this.loop(n));
    this.canvas.focus();
    if (scene && isCutsceneId(scene)) { this.playCutscene(scene); return; }
    if (title) { this.showTitle(); return; }
    const first = !this.started;
    this.started = true;
    this.continueGame(scene && this.hasScene(scene) ? scene : undefined, first);
    if(this.reviewAllowed()&&!this.reviewNav){const stations=reviewStations(this.content,this.reviewDoc);if(stations.length)this.reviewNav=mountReviewNavigator(this.host.windowEl,{stations,actions:this.reviewDoc.actions,hint:this.reviewDoc.hint,open:!EDITOR_PLAY,communication:can('review')?id=>this.reviewCommunication(id):undefined,jump:id=>this.reviewJump(id),run:a=>this.reviewRun(a)});this.refreshReview();}
  }

  /**
   * Into the save (the title's CONTINUE, or a start in a scene). A save in the middle of the
   * saved scene takes precedence; older saves fall back to opening.ts or Downtown/the first scene.
   */
  private continueGame(scene: SceneId | undefined, first: boolean) {
    this.endTitle();
    const { routes, start } = playProfile();
    if(routes==='content')scene=(scene&&this.content[scene]?scene:this.save.scene&&this.content[this.save.scene as SceneId]?this.save.scene as SceneId:start.scene as SceneId);
    this.started = true;
    const resume = !scene && first ? this.openingStory.openingResumeDestination(this.save.flags) : null;let resumeEntrance:string|undefined;
    if (!scene && first && this.save.scene && this.resumable(this.save.scene)) scene = this.save.scene as SceneId;
    else if (resume && this.hasScene(resume.scene)) {scene=resume.scene;resumeEntrance=resume.entrance;}
    else if (!scene && first && !this.save.flags.arrived && !this.save.flags[this.world.seenFlag(this.openingStory.START.settled as SceneId)]) {
      // a save that never got going: the opening, on the train home (no glide: that is NEW GAME's)
      if (!this.save.flags[this.world.seenFlag(this.world.START_SCENE)]) { this.startOpening(); return; }
      scene = this.world.START_SCENE;
    }
    if (first && scene && scene === start.scene && !resumeEntrance) resumeEntrance = start.entrance;
    if (scene && (this.here !== scene||resumeEntrance)) this.enter(scene, true,resumeEntrance);
    this.showHost();
    this.markSeen(this.here);
    this.greet();
  }

  /** Is there a run to continue: a stored save that has been played? */
  private hasSave() {
    try {
      const raw = gameStorage.getItem(saveKey());
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
    this.hosts.forEach((h) => {h.cancelAcknowledgment?.('dismissed');h.closeAll();});
    this.term.close();
    this.opening = new Opening(this.reduced,this.sequenceDocuments.opening);
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
    this.hints.sceneChanged();sound.cancelFeedback();
    this.openingGameplaySession?.dispose();this.openingGameplaySession=undefined;
    this.save = sudoOn() ? unlockAll(newSave()) : newSave();
    city.bind(this.save.clock);
    // Every scene starts a first visit in the new save.
    this.save.gameplay={};
    this.hosts.forEach((h,id)=>{this.save.gameplay![id]=h.model.state;});
    this.hosts.forEach((h) => h.reset());
    this.persistSave();
    this.syncHud();
    this.started = true;
    // the story half of the opening takes over: `opening:home`, the train home (opening.ts)
    this.startOpening(destination);
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  private greet() {
    const arrival = arrivalFor(this.def.phases?.[this.story]?.arrival, { flags: this.save.flags, touch: this.touch, rain: this.weatherHere().rain, companion: this.save.flags[this.companionDoc.unlockFlag] ? this.companionDoc.greeting : null });
    if (!arrival) return;
    for (const flag of arrival.set) this.save.flags[flag] = true;
    this.say(arrival.speaker, arrival.pages, this.p.x, arrival.height);
  }

  /** The HACK and BOARD buttons belong to the scene you are in. */
  private showHost() {
    const here = this.zh;
    this.hosts.forEach((h) => h.show(h === here));
  }

  checkpoint(){this.hosts.forEach(host=>host.persist());this.persistSave();}

  /** Detached diagnostics for editor inspection; no mutable runtime references. */
  inspect() {
    const shared=this.gameplayFor(this.here);
    return structuredClone({scene:this.here, player:{x:this.p.x,y:this.p.y}, save:this.save,
      actors:EDITOR_PLAY?(this.def.people??[]).map((p,index)=>({index,id:p.id,seed:p.seed,look:p.look,x:p.x,h:p.h,act:p.act,range:p.range,speed:p.speed,facing:p.facing,when:p.when,visible:isHere(p),follow:p.follow?(this.def.people??[]).indexOf(p.follow):undefined,gap:p.gap})):undefined,
      engine:EDITOR_PLAY?this.zh.model.inspect():undefined,
      gameplay:shared?{state:shared.state(),purchases:Object.fromEntries(Object.keys(shared.definition.purchases??{}).map(id=>[id,shared.quote(id)]))}:null,conversation:this.zh.conversationFrame,
      environment:{weather:this.weatherHere().kind,clock:this.editorClock},
      capabilities:capabilityView(this.save,!this.hackLocked(),this.networkContext.net),access:{exits:this.def.exits.map(e=>({id:e.id,visibility:exitVisibility(e,this.save.flags),permission:exitPermission(e,this.save.keyring)})),interactions:this.def.uses?.map(u=>({id:u.id,result:u.eligibility?.(this.save.flags,shared)??{ok:true}}))},
      objective:this.def.objective?.(this.save.flags,this.gameplayFor(this.here)?.state()), paused:this.enginesPaused,
      dialogue:this.bubble?{speaker:this.bubble.name,pages:this.bubble.pages,page:this.bubble.page}:null, popup:this.zh.popupOpen,
      events:[...this.gameplaySessions].flatMap(([scene,session])=>session.events().map(event=>({scene,...event}))) });
  }

  stop() {
    this.cancelStoryTransitions();this.flight=null;this.hop=null;
    this.hints.sceneChanged();sound.cancelFeedback();
    this.disposePerformance?.();this.disposePerformance=undefined;
    this.reviewNav?.dispose();this.reviewNav=undefined;
    this.running = false;
    // Closing returns to the homepage; cached hosts and source sessions resume together.
    // Their scene clocks pause below. Private Play destroys the entire owning frame.
    this.openingGameplaySession?.dispose();this.openingGameplaySession=undefined;
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
    this.hosts.forEach((h) => { h.cancelAcknowledgment?.('disposed');h.closeAll(); h.persist(); });
    this.term.close();
    this.canvas.hidden = true;
    this.persistSave();
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
    // Squarish and tall windows: aim for MIN_VIEW_W of street across (Tommi, 2026-10-18). The scale
    // steps down instead, and the spare height shows above the street, but not past MAX_VIEW_H
    // (at a coarse scale one step can halve everything: 1000 × 1000 at 1x keeps 2, not 1).
    while (k > 1 && this.canvas.width / k < MIN_VIEW_W && px / (k - 1) <= MAX_VIEW_H) k--;
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
    this.gyBase = Math.round(this.viewH - Math.max(54, (padTop * dpr) / this.k + 8));
    this.gy = this.gyBase + Math.round(this.camH);
  }

  /** The level width the view was fitted to; a new place refits (see onResize). */
  private fitW = 0;
  /** How often the player has petted a scene's animals (which line comes next). */
  private petCount = 0;

  private loop(now:number){const span=perfBegin('game.frame',this.here);try{this.stepLoop(now);}finally{perfEnd(span);}}

  /** Readability stops while another surface covers the world; simulation clocks keep their own policy. */
  private get communicationCovered() {
    return document.hidden||this.menu.open||!!this.opening||!!this.cut||!!this.mapView||!!this.netView||!!this.flight||this.showEnd||!!this.sleep||this.term.isOpen||!!this.zh.overlayOpen;
  }

  private stepLoop(now: number) {
    if (!this.running) return;
    this.syncEnginePause();
    // the one tick: every scene's model moves on by this frame's time (a paused engine holds still)
    const sceneMs = this.last ? Math.min(250, Math.max(0, now - this.last)) : 0;
    this.hosts.forEach((h) => h.tick(sceneMs));
    if(this.last)perfSample('raf.gap',now-this.last);
    const readableBefore=this.hints.notices.time;
    this.hints.notices.frame(now,this.communicationCovered);
    const readableDelta=(this.hints.notices.time-readableBefore)/1000;
    const dt = this.last ? Math.min(3, (now - this.last) / 16.67) : 1;
    this.last = now;
    // sudo's time control follows whatever timed picture is up (none: it hides); in a scene, the city clock's bar
    this.transport?.attach(this.opening?.timeline ?? this.cut?.timeline ?? null);
    this.clockBar?.show(!this.opening && !this.cut && !this.menu.open && !this.term.focused);
    // The title and the glide: their own picture, with the title's menu over it.
    if (this.opening) { this.stepOpening(dt); this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // The deck: the world holds still under it (the last frame stays on the canvas).
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
      this.playCutscene(id, () => this.inbox(),'after-handoff');
    }
    if (!this.reduced || this.t < 1) this.t += dt;
    this.clock += dt;
    // the city clock: the opening's pins, then a tick if it runs here and now (clock.ts)
    this.pinStory();
    if (this.clockRuns()) city.tick(dt / 60);
    this.syncClock();
    const updateSpan=perfBegin('game.update');
    try{this.update(dt);}finally{perfEnd(updateSpan);}
    this.shiftGuidance?.update(this.save.flags, readableDelta,
      this.communicationCovered || !!this.bubble || !!this.zh.popupOpen,
      this.p.moving, this.p.x);
    this.checkGain();
    const renderSpan=perfBegin('game.render');
    try{this.draw();}finally{perfEnd(renderSpan);}
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
    if(zh?.acknowledgmentPending&&['e','E','Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)this.interact();return;}
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
      if(zh?.acknowledgmentPending){zh.cancelAcknowledgment('dismissed');return;}
      if (zh && zh.visionOn) { zh.toggleVision(); return; }
      // Nothing left to close: the deck, on its last tab (SYSTEM: QUIT TO HOMEPAGE leaves the game).
      this.openMenu();
      return;
    }
    // while someone is talking, Enter and Space go on with the talk (as E does); otherwise Enter opens the deck (the terminal)
    if ((k === 'Enter' || k === ' ') && this.bubble) { e.preventDefault(); this.interact(); return; }
    if (k === 'Enter') { e.preventDefault(); this.openDeck(); return; }
    // the deck's map app: the city as far as you know it
    if (k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); if (can('mapKey')) this.showMap(); return; }
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
    // in a level, ↑ and ↓ first mean a door, a flight, an escalator or the lift car; otherwise ↑ jumps
    if ((k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble && this.level && !this.levelLocked() && levelUp(this.level, this.p)) { this.keys.clear(); return; }
    if ((k === 'ArrowDown' || k === 's' || k === 'S') && !this.bubble && this.level && !this.levelLocked() && levelDown(this.level, this.p)) { this.keys.clear(); return; }
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble && !(this.level && levelRiding(this.level))) this.jump();
    this.keys.add(k.length === 1 ? k.toLowerCase() : k);
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key;
    this.keys.delete(k.length === 1 ? k.toLowerCase() : k);
    if (k === 'Shift') this.keys.delete('Shift');
  }

  private openDeck() {
    if (!can('deck')) return;
    if (!this.term.out.childElementCount) this.term.print('[DECK] ' + who(this.save) + ' · type help', 'head');
    const at = this.hackLocked() ? null : this.termMachine();
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

  /** Overlays, the deck, travel and talk hold the level's ↑/↓ as they hold walking. */
  private levelLocked() { return this.showEnd || this.term.focused || !!this.zh.overlayOpen || !!this.mapView || !!this.netView || !!this.flight || !!this.hop || !!this.beat || !!this.sleep; }

  private jump() {
    if (!can('jump')) return;
    if (!this.save.jump) { this.flash('[ERR] legs.so not found'); sound.denied(); return; }
    if (!this.p.onGround) return;
    this.p.vy = 4.6;
    this.p.onGround = false;
    sound.jump();
  }

  // ---------- the deck (menu.ts; SYSTEM is the former pause menu) ----------

  private menu: Menu;

  /** Esc with nothing else open: pause and show the menu. Progress is written first. */
  private openMenu() {
    this.keys.clear();
    this.p.moving = false;
    this.hints.done('ctl.deck');
    this.zh.persist();
    this.persistSave();
    this.menu.show();
    this.shiftGuidance?.hide();
    this.syncEnginePause();
  }

  /**
   * NEW GAME (the title's, or confirmed in the pause menu): the opening's glide. Nothing is reset
   * until it hands over (`openingDone`): leave mid-glide and the old run is still there. Slots are untouched.
   */
  private newGame() {
    if (EDITOR_PLAY || playProfile().routes !== 'world') {
      gameStorage.removeItem(saveKey());
      reloadRuntime();
      return;
    }
    if (!this.opening) { this.showTitle(true); return; }
    this.opening.go();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: the coast at sunrise, from the sea west to Downtown and LINE 0');
  }

  private notify(text:string,tone:import('../ui/communication').MessageTone='info'){this.hints.notify(text,tone);this.term.print(text,tone==='error'?'err':tone==='success'?'ok':'out',false);}
  private flash(text: string) { this.notify(text,text.startsWith('[ERR]')?'error':text.startsWith('+')?'success':'info'); }


  private get levelW() { return this.def.width; }
  /** The scene's name, for the HUD and the canvas label. */
  private get placeName() { return this.def.name; }
  private get platforms() { return this.def.platforms ?? []; }

  /**
   * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
   * The companion comes along where it follows you, or is at home; the first visit has the player say a few words.
   */
  private enter(id: SceneId, quiet = false, at?: string) {
    const { routes, start, label } = playProfile();
    if(routes==='content'&&!this.content[id]){this.flash(`This route is outside the ${label}.`);return;}
    if (routes === 'start') id = start.scene as SceneId;
    const s: SceneDef = this.sceneDefinition(id);
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
    // a level scene: arrive on the floor at the exit's (or the spawn's) height; the camera looks there at once
    this.level = s.level ? { source: s.level, state: levelArrive(s.level, this.p, (at ? s.exits.find((e) => e.id === at)?.arriveH : undefined) ?? s.spawnH ?? 0) } : null;
    this.camH = this.level ? Math.max(this.level.source.low, Math.min(this.level.source.high, this.p.y)) : 0; this.gy = this.gyBase + Math.round(this.camH);
    this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
    this.syncHud();
    setHereClimate(sceneClimate(id));
    if (!quiet) sound.open();
    // the companion: at home (coming in behind you through the door, or already asleep there), at your heels where it follows you
    if (s.perch) {
      const home = s.perch(this.zh.model);
      if (at && this.save.flags[companionFlag(s, this.companionDoc)]) this.companionBody.place(x - 14, 0, 'walk', 1);
      else this.companionBody.place(home.x, home.h, home.rest);
    } else if (this.companionPresent) this.companionBody.place(x - this.p.face * 20, 0, 'sit', this.p.face);
    // the opening: the train home runs into Downtown; arriving, the player says the opening's words instead
    const st = this.story, phase = s.phases?.[st], said = phase?.intro;
    if (phase?.ride) this.runRide(id, phase.ride);
    this.hints.sceneChanged();sound.cancelFeedback();
    const flag = 'scene:' + id, intro = typeof s.intro === 'function' ? s.intro(this.touch) : s.intro;
    if (said) {
      const once = 'opening:said:' + st + ':' + id;
      if (said.consume) this.save.flags[flag] = true;
      if (!this.save.flags[once]) { this.save.flags[once] = true; this.persistSave(); this.say(said.speaker,this.touch?said.touchPages??said.pages:said.pages,this.p.x,said.height); }
    } else if (intro && !this.save.flags[flag]) {
      this.save.flags[flag] = true;
      this.persistSave();
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
    zh.hover = this.hackLocked() ? null : id;
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
      scanProgram:this.networkContext.net.scanProgram,
      machine: this.termMachine(),
      // the deck's commands reach the scene's machines, when it has any
      shell: zh.model.devices.size && !this.hackLocked() ? sceneShell(zh, this.def.buzz ? (text, kind) => this.buzzPrint(text, kind) : (text, kind) => this.term.print(text, kind)) : null,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.term.close(),
      persist: () => this.persist(),
      resettable: this.resettableScenes().map(([id, s]) => ({ id, ...s.resettable!, reset: () => this.hostOf(id as SceneId).reset() })),
      // your own deck, while you still exist
      deck: this.openingStory.persona(this.save.flags)?.deck,
      // the Registry's forecast, where you are
      weather: () => reportLines(sceneClimate(this.here)),
      // the net from where you stand (NET.md): scan, connect (needs scan.so, except what a port here knows)
      net: this.hackLocked() ? undefined : {
        scan: () => this.deckScan(),
        connect: (name) => this.deckConnect(name),
        names: () => this.zh.model.nodesHere().filter((id) => this.zh.model.net.has(id) || this.zh.model.ports().length),
      },
    };
  }

  private syncHud() {
    this.refreshReview();
    this.host.setNodes(nodeCount(this.save));
    this.host.setScene(playProfile().chrome.minimalHud ? sceneTitle(this.def) : sceneTitle(this.def) + this.clockText + ' · ' + this.me.toUpperCase());
  }

  /**
   * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
   * people, the devices and the scene's own targets on the engine, the scene's life, and the companion.
   */
  private targets(): Target[] {
    const s = this.def, list: Target[] = [...this.exitTargets(s)];
    const life=this.lifeTargets(s),before=new Set((s.uses??[]).filter(u=>u.targetOrder==='before-devices').map(u=>'use:'+u.id));
    list.push(...life.filter(t=>before.has(t.id)));
    // a device is reached from the ground, or from the ledge under it (the relay, from the low roof)
    const stand = (x: number, y = 0) => Math.max(0, ...this.platforms.filter((p) => x > p.x && x < p.x + p.w && p.h <= y).map((p) => p.h));
    for (const t of this.zh.targets()) {
      const query=s.data?.devices.find(d=>d.id===t.id)?.targetQuery;
      if(query!==undefined&&this.zh.model.gameplayQuery?.(query)!==true)continue;
      list.push({ kind: 'device', id: t.id, x: t.x, h: stand(t.x, t.y), label: t.label, promptH: t.promptH });
    }
    list.push(...life.filter(t=>!before.has(t.id)));
    // the story's own things to press E on in this phase (the bed)
    for (const [id, t] of Object.entries(this.def.phases?.[this.story]?.targets ?? {})) {
      const target = this.openingStory.resolveTarget(t, this.def);
      if (target) list.push({ kind: 'life', id: 'story:' + id, ...target });
    }
    // a level's doors, flights, escalators and lifts where the player stands
    if (this.level) for (const t of levelHints(this.level, this.p, this.zh.model)) list.push({ kind: 'level', ...t });
    // the companion can always be petted, wherever it is with you
    if (this.companionPresent&&this.def.companion?.pet) list.push({ kind: 'companion', id: this.companionDoc.id, x: this.companionBody.x, h: 0, label: this.def.companion.pet.prompt, promptH: this.companionBody.h + 24 });
    return list;
  }

  private nearest(): Target | null { return nearestPrompt(this.targets(), this.p); }

  /** What the HUD's hint lane drew last (the probe reads it; nothing else does). */
  private hudHint = '';
  /** `?probe` / `?sudo`: a read-only snapshot of the story for scripts (scripts/opening-playthrough). It writes nothing and advances nothing. */
  private probeFrame() {
    const t = this.nearest(), b = this.bubble;
    return {
      here: this.here, phase: this.story, flags: { ...this.save.flags },
      clock: { day: city.day, min: Math.round(city.min * 100) / 100, text: city.text, pinned: city.pinned },
      title: !!this.opening, glide: !!this.opening?.gliding, menu: this.menu.open, cut: !!this.cut, end: this.showEnd, map: !!this.mapView,
      bubble: b ? { name: b.name, text: b.pages[b.page], page: b.page, pages: b.pages.length, full: b.chars >= b.pages[b.page].length } : null,
      prompt: t ? { kind: t.kind, id: t.id, label: t.label, x: Math.round(t.x) } : null,
      targets: this.targets().map(z => ({ kind: z.kind, id: z.id, label: z.label, x: Math.round(z.x) })),
      hint: this.hudHint, goal: this.goalText(), popup: this.zh.popupOpen, acknowledging: this.zh.acknowledgmentText ?? null,
      gate: this.probeGate(), card: this.probeCard(),
      player: { x: Math.round(this.p.x * 10) / 10, y: Math.round(this.p.y * 10) / 10 },
      term: (this.term.out.textContent ?? '').slice(-700),
    };
  }

  private say(name: string, pages: string[], x: number, h: number) {
    if(!pages.length)return;
    this.bubble = { name, pages, page: 0, chars: 0, x, h };
    if(pages.length)this.term.print(name+': '+pages.join('\n'),'out',false);
  }

  private completeConversation(cue:NonNullable<import('../engine/gameplay/conversation').ConversationFrame['completion']>) {
    this.term.prefill(cue.terminalPrefill);
  }

  /** Completion belongs to advancing the final page; replacing or abandoning a bubble cancels it. */
  private dialogueCompletion(cue:import('../engine/gameplay/conversation').ConversationFrame['completion']) {
    if(cue&&this.bubble){const scene=this.here;this.bubble.then=()=>{if(this.here===scene)this.completeConversation(cue);};}
  }

  private interact() {
    this.hints.done('ctl.use');
    const b = this.bubble;
    if (b) {
      const full = b.pages[b.page].length;
      if (b.chars < full) { b.chars = full; return; }
      if (b.page < b.pages.length - 1) { b.page++; b.chars = 0; return; }
      this.bubble = null;
      b.then?.();
      return;
    }
    if(this.zh.acknowledgmentPending){this.zh.advanceAcknowledgment();return;}
    const target = this.nearest();
    if (!target) return;
    if (target.kind === 'level') { if (this.level) levelInteract(this.level, target.id, this.p, this.zh.model); return; }
    if (target.kind === 'exit' || target.kind === 'life') { this.useLife(target.id); return; }
    // a device opens its popup; the scene's own target may be a way out (its code returns the exit)
    if (target.kind === 'device') {
      // the opening: a scene's own way out (the flat's door) may say something else in this state
      const rule = this.def.phases?.[this.story]?.exits?.[target.id];
      if (rule && this.storyExit(rule, target.x, null, undefined, target.id)) return;
    }
    if (target.kind === 'device') { const out = this.zh.use(target.id), e = out ? this.def.exits.find((z) => z.id === out) : undefined; if (e) this.useExit(e); return; }
    if (target.kind === 'companion') { const pet=this.def.companion?.pet;if(!pet)return;const conversation=new ConversationSession(this.gameplayFor(this.here)!,this.companionBody.pet(pet)),frame=conversation.frame();sound.blip();if(frame.choices?.length){this.zh.presentConversation(conversation);}else{conversation.close();this.say(frame.speaker,frame.pages,this.companionBody.x,this.companionBody.h+14);this.dialogueCompletion(frame.completion);}return; }
  }

  private update(dt: number) {
    const p = this.p, b = this.bubble;
    if (b && b.chars < b.pages[b.page].length) {
      const before = Math.floor(b.chars);
      b.chars = Math.min(b.pages[b.page].length, b.chars + 1.2 * dt);
      if (Math.floor(b.chars) !== before && Math.floor(b.chars) % 2 === 0) sound.blip();
    }
    this.updateTravel();
    this.updateStory();
    const locked = this.showEnd || this.term.focused || !!this.zh.overlayOpen || !!this.mapView || !!this.netView || !!this.flight || !!this.hop || !!this.beat || !!this.sleep;
    const left = !locked && (this.keys.has('ArrowLeft') || this.keys.has('a'));
    const right = !locked && (this.keys.has('ArrowRight') || this.keys.has('d'));
    const speed = this.keys.has('Shift') ? 2.3 : 1.3;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { p.face = dir; if (this.bubble && Math.abs(p.x - this.bubble.x) > 140) this.bubble = null; }
    p.moving = !!dir;
    // a level ride (stairs, escalator, lift) carries the player; walking waits until it ends
    const riding = !!this.level && levelStep(this.level, p, locked ? 0 : dir, dt, this.zh.model);
    const [minX, maxX] = this.level && !riding ? levelBounds(this.level, this.levelW) : [12, this.levelW - 12];
    if (!riding) p.x = Math.max(minX, Math.min(maxX, p.x + dir * speed * dt));
    // Walking into an open border (the yard's passage, a street's end) leaves without E.
    if (dir < 0 && p.x <= 12) this.walkOff('left');
    else if (dir > 0 && p.x >= this.levelW - 12) this.walkOff('right');

    // Vertical: gravity, platforms and the street (a level's floor under the player)
    const prevY = p.y, floorH = this.level ? levelFloor(this.level).h : 0;
    if (riding) { /* the ride sets the height */ }
    else if (!p.onGround) {
      p.y += p.vy * dt;
      p.vy -= 0.22 * dt;
      for (const pl of this.platforms) {
        if (p.vy <= 0 && prevY >= pl.h && p.y <= pl.h && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2) { p.y = pl.h; p.vy = 0; p.onGround = true; }
      }
      if (p.y <= floorH) { p.y = floorH; p.vy = 0; p.onGround = true; }
    } else if (p.y > floorH && !this.platforms.some((pl) => pl.h === p.y && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2)) {
      p.onGround = false; p.vy = 0;
    }

    // zones (engine/zones.ts) watch where the player stands
    this.zh.model.player = { x: p.x, h: p.y, ...(this.level && !levelRiding(this.level) ? { building: levelFloor(this.level).building } : {}) };
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
    // a level's camera also follows the height of the floor (or the ride), within its lowest and highest floor
    if (this.level) {
      const goalH = Math.max(this.level.source.low, Math.min(this.level.source.high, p.onGround || riding ? p.y : levelFloor(this.level).h));
      this.camH += (goalH - this.camH) * Math.min(1, 0.1 * dt); this.gy = this.gyBase + Math.round(this.camH);
    }
    if (this.companionPresent) this.companionBody.update(dt, { px: p.x, face: p.face, moving: p.moving, follow: this.companionDoc.follow, perch: this.def.perch?.(this.zh.model) ?? null, warm: this.def.companion?.warm });
    this.host.setNodes(nodeCount(this.save));
    // the opening's idle ping: standing still a while, the next goal's target pings (opening.ts)
    const aim = this.shiftGuidance ? null : this.def.phases?.[this.story]?.ping ?? null;
    if (!aim || locked || p.moving || !p.onGround || this.bubble || this.zh.popupOpen) this.still = this.clock;
    else if (attentionDue(this.clock, this.still, this.openingStory.ATTENTION.after)) { this.still = this.clock; this.pingGoal(aim); }
  }

  /** The companion is drawn at home (`companion.mode: home`), and where it follows you (`along`) once its flag is set (companion-source.ts). */
  private get companionPresent() { return companionHere(this.def, this.save.flags, this.companionDoc); }

  // ---------- drawing ----------

  private sx(worldX: number, parallax = 1) { return Math.round(worldX - this.cam * parallax); }
  private y(h: number) { return this.gy - h; }

  /**
   * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
   * the scene has them (`ambient`), the scene's own drawing, the player and the companion, the scene's
   * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
   * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
   * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
   */
  private draw() {
    // a person whose speech bubble is open gestures while they talk (the player's own bubble sits at the player)
    setSpeaker(this.bubble && Math.abs(this.bubble.x - this.p.x) > 2 ? this.bubble.x : null);
    const x = this.x, k = this.k;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.imageSmoothingEnabled = false;
    clearWorld(x, this.viewW, this.viewH);
    if (this.flight) { drawFlight(x, this.viewW, this.viewH, Math.min(1, (this.clock - this.flight.start) / (taxiDurationFor(this.sequenceDocuments.cinematics) * 60)), this.clock, this.world.STANDS[this.flight.to].name,light(),this.sequenceDocuments.cinematics); return; }
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
      weather: () => this.weatherHere(), lighting: W => this.lightHere(W),
      preparePresentation: () => this.zh.preparePresentation(v, this.zh.visionOn && this.def.layers ? 'devices' : 'all'),
      skyTraffic: (x, view) => drawSkyShips(x, view, this.ships),
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
    return Math.max(this.level ? Math.min(h, levelFloor(this.level).h) : 0, ...this.platforms.filter((pl) => wx > pl.x && wx < pl.x + pl.w && pl.h <= h + 0.5).map((pl) => pl.h));
  }

  /**
   * The weather a scene has now: its district's (weather.ts). Dawn, before you are deleted, is
   * dry whatever the forecast says ("Rain's late today": the opening is scripted).
   */
  private weatherOf(scene: string): Weather {
    const w = weatherNow(sceneClimate(scene));
    if (!this.openingStory.persona(this.save.flags)?.calmWeather || (w.rain < 0.01 && w.storm < 0.01)) return w;
    return { ...w, kind: w.kind === 'rain' || w.kind === 'storm' ? 'cloudy' : w.kind, rain: 0, storm: 0, wet: Math.min(w.wet, 0.4), wind: Math.min(w.wind, 0.3) };
  }
  private weatherHere() { return this.weatherOf(this.here); }



  private drawCharacters() {
    const x = this.x, p = this.p;
    if (this.companionPresent) this.companionBody.draw(x, (wx) => this.sx(wx), (h) => this.y(h), this.t, COMPANION_LOOKS[this.companionDoc.look]);
    // jacked in: a machine's schematic is open and you stand at it, so the deck's cable runs to it (any scene)
    const open = this.zh.viewing;
    const jack = open ? this.zh.model.spots().find((sp) => sp.id === open && Math.abs(sp.x - p.x) < 40 && Math.abs(this.p.y - (sp.y > 40 ? sp.y : 0)) < 8) : undefined;
    if (jack) p.face = jack.x >= p.x ? 1 : -1;
    AVATAR_PAINTERS[playProfile().player.avatar]({ x, view: this.view(), p, t: this.t, jack, shadowGround: () => this.zh.visionOn ? null : this.groundUnder(p.x, p.y), carry: this.def.dockworkerCarry?.(this.save.flags) ?? null });
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
    const h = t.promptH ?? 62;
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
   * The bars follow the mode (render.tsx): walking (arrows; HACK, JMP, ACT, DECK) or hack vision
   * (EXIT, BOARD, LOGIC, UNFOLD), as classes on the page; HACK only once hacking is yours here.
   */
  private syncModeUi() {
    const zh = this.zh, on = zh.visionOn;
    this.controlHints(on);
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
    x.fillStyle = b.name === 'YOU' ? '#7ff' : '#ffd9a5'; x.fillText(b.name !== 'YOU' ? b.name : (playProfile().player.name !== undefined || this.openingStory.persona(this.save.flags)) ? 'YOU' : who(this.save).toUpperCase(), bx + 10, by + 15);
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
      if(!playProfile().chrome.minimalHud){x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(sceneTitle(this.def) + this.clockText, 8, top + 10);}
      y = top + 10;
      // what you own is not here (Tommi, 2026-10-15): hack vision's LOGIC drawer has it, and a short
      // line shows when something comes

    }
    // the hint lane (ui/hints.ts): one line at a time, on a dark strip so it reads over any scene
    const hint = this.hints.step(this.hints.notices.time,this.communicationCovered||!!this.bubble||!!this.zh.popupOpen||this.zh.acknowledgmentPending);
    this.hudHint = hint?.text ?? '';
    if (hint) {
      y += 11;
      x.fillStyle = 'rgba(0,0,0,' + 0.6 * hint.alpha + ')'; x.fillRect(6, y - 8, x.measureText(hint.text).width + 4, 11);
      x.fillStyle = (hint.tone==='error'?'rgba(255,90,110,':hint.tone==='success'?'rgba(34,197,94,':'rgba(255,217,165,') + 0.95 * hint.alpha + ')'; x.fillText(hint.text, 8, y);
    }
    // the scene's goal, where it has goals (a scene without a data file has none)
    // (the opening has its own: opening.ts)
    const zh = this.zh.model.data.goals.length ? this.zh : null, story = this.def.objective?.(this.save.flags,this.gameplayFor(this.here)?.state()) ?? this.def.phases?.[this.story]?.goal ?? this.libraryGoal();
    if (story || zh) {
      y += 11;
      if (this.shiftGuidance) this.shiftGuidance.draw(x, this.viewW, this.viewH, y);
      else { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + (story ?? zh!.objective()), 8, y); }
    }
    // the keys and what they do: the key bar along the top (keybar.ts)
    // how far down the HUD's lines reach (world units under the key bar): captions and popups keep below
    this.hudH = vision ? y + 4 - top : Math.max(46, y + 11 + 4 - top);
    x.restore();
  }

  /**
   * What hack vision's LOGIC drawer lists: modules, programs and the key chips that do something.
   * Not tokens and not what you carry (Tommi, 2026-10-15): those show where they are used (a price
   * on the prompt, "show the maglev pass" in the brake's popup) and in the deck's CARRY tab.
   */
  private owned(): [string, string] {
    const s = this.save;
    const own = 'MODULES ' + (ownedModules(s).join(' ') || '-') + (s.programs.length ? ' · PROGRAMS ' + s.programs.join(' ') : '') + (SUDO ? ' · SUDO' : '');
    const keys = s.keyring.map((id) => this.networkContext.keyring.get(id)).filter((k) => k?.kind === 'key').map((k) => (/^\S+$/.test(k!.label) ? k!.label : k!.id));
    return [own, keys.length ? 'KEYS ' + keys.join(' ') : ''];
  }
  // ---------- the deck's tabs and the control hints ----------

  /** The current goal as the HUD shows it (the scene's, the opening's, the library's, or the data's next). */
  private goalText(): string | null {
    const zh = this.zh.model.data.goals.length ? this.zh : null;
    return this.def.objective?.(this.save.flags,this.gameplayFor(this.here)?.state()) ?? this.def.phases?.[this.story]?.goal ?? this.libraryGoal() ?? (zh ? zh.objective() : null);
  }

  /** What the deck's JOBS, CARRY, CONTROLS (and TERM on touch) tabs read (ui/menu.ts). */
  private deckData(): DeckData {
    return {
      jobs: () => {
        const m = this.zh.model;
        return { now: this.goalText(), hint: this.hints.latest, done: m.data.goals.filter((g) => m.goals.has(g.id)).map((g) => g.text) };
      },
      carry: () => {
        const s = this.save;
        return {
          tokens: s.tokens,
          items: Object.entries(s.items).filter(([, n]) => n > 0).map(([id, n]): [string, number] => [ITEMS[id as ItemId] ?? id, n]),
          keys: s.keyring.map((id) => this.networkContext.keyring.get(id)).filter((k) => k?.kind === 'key').map((k) => k!.label),
          modules: ownedModules(s),
          programs: s.programs,
        };
      },
      controls: () => this.controls(),
      ...(this.touch ? { terminal: () => this.openDeck() } : {}),
    };
  }

  /** Every key that is yours now, grouped (the deck's CONTROLS tab). Touch names its buttons instead. */
  private controls(): [string, [string, string][]][] {
    const t = this.touch, jump = this.save.jump;
    const walk: [string, string][] = t
      ? [['◀ ▶', 'walk'], ...(jump ? [['JMP', 'jump'] as [string, string]] : []), ['ACT', 'use what shows [E]; go on talking']]
      : [['← → · A D', 'walk'], ['SHIFT', 'run'], ...(jump ? [['SPACE', 'jump'] as [string, string]] : []), ['E', 'use what shows [E]'], ['ENTER · SPACE', 'go on talking']];
    const deck: [string, string][] = t
      ? [['DECK', 'this deck'], ['>_', 'terminal']]
      : [['ESC', 'this deck; first closes what is open'], ['ENTER', 'terminal'], ['TAB · M', 'city map'], ...(this.netOk ? [['N', 'net map'] as [string, string]] : [])];
    const hack: [string, string][] = t
      ? [['NOUN', 'tap for verbs; drag an orange dot onto a noun to wire'], ['HACK', 'hack vision'], ['BOARD', 'the board'], ['LOGIC', 'logic parts (in vision)'], ['UNFOLD', 'every circuit (in vision)'], ['DRAG · PINCH', 'pan · zoom (in vision)']]
      : [['NOUN', 'tap for verbs; drag an orange dot onto a noun to wire'], ['H', 'hack vision'], ['B', 'the board'], ['L', 'logic drawer (in vision)'], ['U', 'every circuit unfolded (in vision)'], ['DRAG · WHEEL · 0', 'pan · zoom · reset (in vision)']];
    return [['WALKING', walk], ['THE DECK', deck], ...(this.zh.hackable ? [['HACKING', hack] as [string, [string, string][]]] : [])];
  }

  /**
   * The controls, taught once in the hint lane (what the key bar's labels used to say): walking, then
   * using, then the deck; hack vision's keys the first time it is open. Each stays until you have done it.
   * Touch buttons are labelled, so touch only gets the deck and hack vision.
   */
  private controlHints(vision: boolean) {
    if(!playProfile().guidance.controlHints)return; // Review cases own attention; campaign control lessons stay in the campaign.
    const h = this.hints;
    if (this.p.moving) h.done('ctl.walk');
    if (!this.touch) {
      if (!h.has('ctl.walk')) h.show('ctl.walk', '← → WALK · SHIFT RUN', { sticky: true });
      else if (!h.has('ctl.use')) h.show('ctl.use', 'E USES WHAT SHOWS [E]', { sticky: true });
    }
    if ((this.touch || h.has('ctl.use')) && !h.has('ctl.deck')) h.show('ctl.deck', (this.touch ? 'DECK' : 'ESC') + ' OPENS THE DECK: GOALS, WHAT YOU CARRY, CONTROLS', { sticky: true });
    if (vision) h.show('ctl.vision', this.touch ? 'DRAG PANS · PINCH ZOOMS · EXIT LEAVES' : 'DRAG PANS · WHEEL ZOOMS · 0 RESETS · ESC LEAVES', { sticky: true, first: true });
    else if (h.pending('ctl.vision')) h.done('ctl.vision');
  }

  private ownLine() { const [own, more] = this.owned(); return more ? own + ' · ' + more : own; }

  /** What you own, as a set of words, to see what came (or went) since the last frame. */
  private gainWords = '';
  private checkGain() {
    const s = this.save, words = [...ownedModules(s), ...s.programs, ...s.keyring.map((id) => this.networkContext.keyring.get(id)?.label ?? id), ...Object.entries(s.items).filter(([, n]) => n > 0).map(([id]) => ITEMS[id as ItemId] ?? id)];
    const now = words.join('|');
    if (this.gainWords && now !== this.gainWords) {
      const before = new Set(this.gainWords.split('|')), added = words.filter((w) => !before.has(w));
      if (added.length) this.notify('+ ' + added.join(' · '),'success');
    }
    this.gainWords = now;
  }

  private drawEnd() {
    const x = this.x, cx = this.viewW / 2, cy = this.viewH / 2 - 30;
    x.save();
    x.fillStyle = 'rgba(0,0,0,.78)'; x.fillRect(0, 0, this.viewW, this.viewH);
    x.textAlign = 'center';
    x.font = '600 16px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,.95)'; x.shadowColor = 'rgba(255,136,0,.8)'; x.shadowBlur = 10;
    const card = endCardText(this.endCard, { controlled: this.save.controlled.length, handle: who(this.save) });
    x.fillText(card.title, cx, cy);
    x.shadowBlur = 0; x.font = '10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,.9)';
    card.lines.forEach((l, i) => x.fillText(l, cx, cy + 26 + 16 * i));
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillText(card.prompt, cx, cy + 34 + 16 * card.lines.length);
    x.restore();
  }

  // ---------- the opening (opening.ts) ----------
  // The opening is story data (story/opening.json) plus each scene's `phases` (scene.json): the save's flags pick the phase
  // (story/story-rules.ts holds the pure rules; this loop applies them: gates, cards, triggers, the clock pin, the attention ping).

  private get story(): OpeningState { return this.openingStory.openingState(this.save.flags); }
  /** Who you are in the HUD and your bubbles: a courier while you still exist, then your handle (or "ghost"). */
  private get me() { const fixed = playProfile().player.name; if (fixed !== undefined) return fixed; return this.openingStory.persona(this.save.flags)?.name ?? who(this.save); }
  /** The city clock, after the scene's name in the HUD (" · 21:40"; the opening's times are its pins). */
  private get clockText() { return playProfile().chrome.minimalHud ? '' : ' · ' + city.text; }

  /** When the player last moved or did something (clock frames), for the attention ping. */
  private still = 0;
  /** Where the attention ping points when it is not a device (world x): the scene's 'goal' speaker. */
  private goalAt: number | null = null;
  /** A checkpoint gate taking its time (story-rules.ts `GateRule`): when it started, where it stands, and where the player goes once it says ok. */
  private beat: { start: number; checkpoint: { x: number; h: number }; gate: GateRule; go: { to: string; at?: string } | null } | null = null;
  /**
   * A card transition (story-rules.ts `CardSpec`; the opening's sleep, or "wait until…" at a bench or the bed): when the fade started,
   * the card (timings, the two clock readings, the label, and the cues that run in the dark `mid`, once: `woke`, and once it is light again `end`).
   */
  private sleep: { start: number; woke: boolean; card: CardSpec } | null = null;
  /** The story's counters (story-rules.ts `applyCounter`): plain numbers named by the source (the morning's failed tries, when it last happened). The loop's own, cleared with the story's transitions. */
  private counters: Record<string, number> = {};
  /** Scratch callbacks belong to this run; disposal never acknowledges or completes them. */
  private cancelStoryTransitions(){this.hosts?.forEach(h=>h.cancelAcknowledgment?.('dismissed'));this.bubble=null;this.beat=null;this.sleep=null;this.pendingCut=null;this.counters={};}


  /** NEW GAME (until the glide lands) and a first launch: the opening, on the train home. */
  private startOpening(destination?: Handoff) {
    this.cancelStoryTransitions();
    this.counters = {};
    if(!this.runOpeningWorkflow('home'))return;
    this.persistSave();
    const target=destination??this.openingStory.START.start;this.handTo(target.scene,target.entrance);
  }

  /** Sudo's LEVELS: the opening from one of its points (opening.json `OPENING_LEVELS`), its scenes started over. */
  private openingFrom(level: { flags: string[]; reset?: string[]; end?: string }) {
    this.cancelStoryTransitions();
    for(const f of this.openingStory.OPENING_FLAGS)delete this.save.flags[f];
    level.flags.forEach((f) => { this.save.flags[f] = true; });
    for (const scene of level.reset ?? []) this.hostOf(scene as SceneId).reset();
    this.counters = {};
    this.persistSave();
    const to = this.openingStory.openingResumeDestination(this.save.flags) ?? this.openingStory.START.fallback;
    this.handTo(to.scene,to.entrance);
    if (level.end) this.runCues(this.openingStory.CARDS[level.end].end ?? []);
  }

  /** A scripted ride (a scene phase's `ride`): send the scene's mover along its path, on the model's own tick. */
  private runRide(scene: SceneId, ride: { mover: string; path: string }) {
    const [device, noun] = ride.mover.split('.');
    if (this.hostOf(scene).model.runPath(device, noun, ride.path) !== 'started') throw new Error('The mover ' + ride.mover + ' has no path ' + ride.path);
  }

  /** The Train scene's movers: the ride lives there (world/transport/line.ts reads it). */
  private get ride() { return this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model.movers; }

  /** The platform clock of the scene on screen: its own scene time and shift (a station's). */
  private get platformTime() { return timelineOf(this.zh.model); }

  /** A private Play's train: boarded at its station and run to the starting state by the car's own movers. */
  private startMetro(start: MetroStart) {
    Object.assign(this.metro.lineOpen, start.lineOpen);
    const host = this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId);
    startRide(host.model, this.metro, start);
    host.setPaused(this.enginesPaused);
  }

  /** A device's everyday actions in this state (its scene's `phases[phase].everyday`), as popup chips; null: its data's. */
  private storyChips(scene: SceneId, dev: string): PopupItem[] | null {
    const chips = this.sceneDefinition(scene).phases?.[this.story]?.everyday?.[dev];
    if (!chips) return null;
    const zh = this.hostOf(scene);
    return chips.map((c) => ({
      label: c.label,
      run: () => {
        if (c.act) zh.model.act(dev, c.act[0], c.act[1]);
        if (c.set) { zh.model.set(c.set[0], c.set[1]); zh.model.changed(); }
        if (c.say) {const receipt=zh.react(dev,c.say);if(c.say[2]==='ok')sound.feedback(receipt);}
        if (c.cues) this.runCues(c.cues);
      },
    }));
  }

  /** A way out that does something else in this phase (story-rules.ts `ExitRule`); `go` is where the player ends up. False: use it as usual. */
  private storyExit(rule: ExitRule, x: number, go: { to: string; at?: string } | null, checkpoint?: SceneExit['checkpoint'], origin?: string): boolean {
    if ('say' in rule) { this.say(rule.say.name, rule.say.pages, x, 60); return true; }
    if ('react' in rule) { this.zh.react(rule.react, rule.line); this.runCues(rule.cues ?? []); return true; }
    if ('gate' in rule) {
      // a checkpoint: one beat too long on "verifying", then ok. Nobody else waits.
      this.keys.clear();
      this.beat = { start: this.clock, checkpoint: { x: checkpoint?.x ?? x, h: checkpoint?.h ?? 0 }, gate: rule.gate, go };
      this.runCues(rule.gate.begin ?? []);
      return true;
    }
    // an acknowledgment: the device speaks (it knows you), the player continues, then the milestone runs and the way opens
    if (!origin) throw Error('Device acknowledgment requires its real scene anchor');
    const scene = this.here, ack = rule.acknowledge, id = 'opening.acknowledge:' + origin;
    if (this.zh.acknowledgmentId === id) return true;
    this.runCues(ack.begin ?? []);
    this.zh.acknowledgeDevice({ id, from: origin, speaker: ack.speaker, pages: ack.pages, height: ack.height, tone: 'ok' }, () => { if (this.here !== scene) return; if (!this.runCues(ack.then)) return; this.finishExit(go); });
    return true;
  }

  /** The gate or the acknowledgment is over: walk through the way out. */
  private finishExit(go: { to: string; at?: string } | null) { if (go && this.hasScene(go.to)) this.travel(go.to, go.at); }

  /**
   * Run a cue list (story-rules.ts `Cue`) in order. A milestone the story refuses ends it (false). Says are spoken, chained, once the other
   * cues have run. The save is written and the HUD refreshed when a milestone, a restaging or the clock moved.
   */
  private runCues(cues: readonly Cue[]): boolean {
    const says: Say[] = []; let ok = true, changed = false;
    for (const cue of cues) {
      if ('milestone' in cue) { if (!this.runOpeningWorkflow(cue.milestone)) { ok = false; break; } changed = true; }
      else if ('say' in cue) says.push(cue.say);
      else if ('print' in cue) cue.print.lines.forEach((l) => this.term.print((cue.print.prefix ?? '') + l, cue.print.tone ?? 'out'));
      else if ('sound' in cue) sound[cue.sound]();
      else if ('stage' in cue) { this.restage(cue.stage); changed = true; }
      else if ('counter' in cue) applyCounter(this.counters, cue.counter, this.clock);
      else if ('advance' in cue) { city.advance(cue.advance); this.syncClock(true); changed = true; }
    }
    if (changed) { this.persistSave(); this.syncHud(); }
    if (ok) this.sayChain(says);
    return ok;
  }

  /** A `stage` cue: the player in the scene at its spawn, the scene back at the start of its puzzles, the companion at home. */
  private restage(s: { scene: string; reset?: true; face?: -1 | 1 }) {
    const id = s.scene as SceneId;
    if (this.here !== id) this.enter(id, false);
    if (s.reset) this.hostOf(id).reset();
    Object.assign(this.p, { x: this.sceneDefinition(id).spawn, y: 0, vy: 0, onGround: true, ...(s.face ? { face: s.face } : {}) });
    const home = this.def.perch?.(this.zh.model);
    if (home) this.companionBody.place(home.x, home.h, home.rest);
  }

  /** Speak these in turn: each opens when the one before has been read. */
  private sayChain(says: readonly Say[]) {
    const [first, ...rest] = says;
    if (!first) return;
    this.say(first.speaker, this.touch ? first.touchPages ?? first.pages : first.pages, this.p.x, first.height);
    if (rest.length && this.bubble) this.bubble.then = () => this.sayChain(rest);
  }

  /** The story's clock, every frame: a checkpoint's beat, a card, the triggers (the morning's message, jacking in). */
  private updateStory() {
    const gate = this.beat;
    if (gate && gateFrame(gate.gate, this.clock - gate.start).done) {
      this.beat = null;
      if (this.runCues(gate.gate.then)) this.finishExit(gate.go);
    }
    if (this.sleep) {
      const card = this.sleep.card, f = cardFrame(card, this.clock - this.sleep.start);
      if (!this.sleep.woke && f.mid) { this.sleep.woke = true; this.runCues(card.mid ?? []); }
      if (f.done) { this.sleep = null; this.runCues(card.end ?? []); }
      return;
    }
    const st = this.story, triggers = this.openingStory.TRIGGERS;
    for (const key of triggerStarts(triggers, st, this.here, this.counters)) this.counters[key] = this.clock;
    for (const t of triggers) {
      if (triggerFires(t, { phase: st, scene: this.here, clock: this.clock, counters: this.counters, bubble: !!this.bubble, popup: this.zh.popupOpen, viewing: this.zh.viewing ?? null })) this.runCues(t.do);
    }
  }

  /** A card transition begins (the opening's bed, or a wait): dark, the card, light again. */
  private startCard(card: CardSpec, closeAll: boolean) {
    this.keys.clear();
    this.bubble = null;
    if (closeAll) this.zh.closeAll();
    this.sleep = { start: this.clock, woke: false, card };
    sound.close();
  }

  // ---------- the city clock (clock.ts): when it runs, the opening's pins, waiting ----------

  /** Sudo's city clock bar (transport.ts); null without `?sudo`. */
  private clockBar: ClockBar | null = null;
  /** The footer's timestamp in game mode (DAY 3 · 21:40), and what it and the HUD showed last. */
  private stampEl: HTMLElement;
  private shownClock = '';
  /** The story holds the clock (a phase's `time` in each scene's `phases`); true while it does. */
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
   * The story pins the clock to its times (each scene's `phases[phase].time`: the train 05:41 … the
   * morning after 09:40) from the train home until Moth's uplink.so; then it runs, from 09:42.
   */
  private pinStory() {
    if(EDITOR_PLAY&&this.editorClock!=='story'){if(this.editorClock==='fixed')city.pin(this.save.clock.min);return;}
    if (playProfile().clock.rule === 'scene') {
      const day=this.def.storyDay?.(this.save.flags);
      if(day!==undefined)this.save.clock.day=day;
      const at = this.def.storyMinute?.(this.save.flags);
      if(at===undefined){city.release();return;}
      if (city.pinned !== at) city.pin(at);
      return;
    }
    const st = this.story, release = this.openingStory.CLOCK.release;
    const pin = clockPin({ pinned: this.openingStory.isPinned(this.save.flags), minute: parseHM(this.def.phases?.[st]?.time ?? ''), wasPinned: this.storyPinned, releaseMinute: parseHM(this.sceneDefinition(release.scene as SceneId).phases?.[release.phase]?.time ?? '') });
    if (pin.kind === 'hold') {
      if (pin.minute !== null) { if (city.pinned !== pin.minute) city.pin(pin.minute); }
      else if (city.pinned === null) city.pin(Math.floor(city.min));
      this.storyPinned = true;
    } else if (pin.kind === 'release') {
      this.storyPinned = false;
      city.release(pin.minute ?? undefined);
      this.persistSave();
    }
  }

  /** The HUD's and the footer's clock, when the minute changes (`force`: now). The save is written now and then. */
  private syncClock(force = false) {
    const t = city.stamp;
    if (force || t !== this.shownClock) {
      this.shownClock = t;
      this.stampEl.textContent = playProfile().chrome.minimalHud ? '' : t;
      if (!this.cut && !this.opening) this.syncHud();
    }
    if (this.clock - this.clockSaved > CLOCK_SAVE) { this.clockSaved = this.clock; this.persistSave(); }
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
    const label = (r.kind === 'bed' ? 'SLEEPING · ' : 'WAITING · ') + this.placeName.toUpperCase();
    this.startCard({ ...WAIT_CARD, from, to: hmOf(to), label, mid: [{ advance: minutes }] }, false);
  }

  /** The attention ping: the next goal's target (the phase's `ping`): a device, or a point (a door, an exit, a story target such as the bed). */
  private pingGoal(t: PingTarget) {
    const aim = attentionAim(t, this.def, this.p.x, (id) => { const target = this.def.phases?.[this.story]?.targets?.[id]; return target ? this.openingStory.resolveTarget(target, this.def)?.x : undefined; });
    if (!aim) return;
    if ('device' in aim) { this.zh.ping(aim.device, 'look'); return; }
    this.goalAt = aim.x;
    this.zh.ping('goal', 'look');
  }

  /** The room's light cue (the scene's `wash` rules): under the player, over the room. */
  private drawLight() {
    if (this.zh.visionOn) return;
    const tone = washTone(this.def.wash, { phase: this.story, flags: this.save.flags, state: (key) => this.zh.model.get(key) });
    if (tone) drawCapsuleWash(this.x, this.viewW, this.viewH, tone);
  }

  /** The probe's view of the gate's line and the card's stage. */
  private probeGate() { return this.beat ? gateFrame(this.beat.gate, this.clock - this.beat.start).bare : null; }
  private probeCard() { if (!this.sleep) return null; const f = cardFrame(this.sleep.card, this.clock - this.sleep.start); return { stage: f.stage, text: f.reading === 'from' ? this.sleep.card.from : this.sleep.card.to, label: this.sleep.card.label }; }

  /** The checkpoint gate, over the gate: dots, one beat too long, then ok. */
  private drawBeat() {
    if (!this.beat) return;
    const x = this.x, g = gateFrame(this.beat.gate, this.clock - this.beat.start), ok = g.ok, line = g.text;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'middle';
    const w = x.measureText(this.beat.gate.ok).width + 16, cx = Math.max(w / 2 + 4, Math.min(this.viewW - w / 2 - 4, this.sx(this.beat.checkpoint.x)));
    const top = this.y(96 + this.beat.checkpoint.h), gate = this.y(36 + this.beat.checkpoint.h);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - w / 2, top, w, 20);
    x.strokeStyle = ok ? 'rgba(34,197,94,.8)' : 'rgba(255,217,165,.45)'; x.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, 19);
    x.fillStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.92)'; x.fillText(line, cx - w / 2 + 8, top + 10.5);
    x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(this.sx(this.beat.checkpoint.x), top + 20, 1, gate - top - 20);
    x.restore();
  }

  /** A card transition (the sleep or a wait): dark, a card with the clock (06:04, then 09:40; now, then later), light again. */
  private drawSleep() {
    if (!this.sleep) return;
    const x = this.x, card = this.sleep.card, f = cardFrame(card, this.clock - this.sleep.start);
    x.fillStyle = 'rgba(0,0,0,' + f.dark + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
    if (!f.showing) return;
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '600 18px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,' + 0.95 * f.fade + ')';
    x.fillText(f.reading === 'from' ? card.from : card.to, this.viewW / 2, this.viewH / 2 - 6);
    x.font = '8px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + 0.7 * f.fade + ')';
    x.fillText(card.label, this.viewW / 2, this.viewH / 2 + 14);
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
    const contacts=this.contacts,news=contacts.unread(this.save.flags);if(!news.length)return;
    const who=[...new Set(news.map(n=>n.contact))],source=contacts.INBOX.announce,t=contacts.INBOX.terminal;
    who.forEach(c=>this.term.print(t.prefix+c.name+t.separator+c.status+t.separator+contacts.messagesOf(c,this.save.flags).length+t.countSuffix+t.commandPrefix+c.id,'ok'));
    if(who.some(c=>c.id===source.contact))this.say(source.speaker,this.touch?source.touchPages:source.pages,this.p.x,source.height);
  }

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's authored destination. Story triggers
   * use after-handoff so their postlude follows travel, retaining a same-scene native interlude.
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(id: CutsceneId | string, then?: () => void,continuation:'replace'|'after-handoff'='replace') {
    const scene = isCutsceneId(id)?this.nativeCutscenes[id]:undefined;
    const handoff=()=>{if(!scene)return;const destination=scene.handoff??{scene:scene.next};
      // A story interlude returning to its current scene preserves native runtime state.
      if(continuation==='after-handoff'&&destination.scene===this.here&&destination.entrance===undefined)return;
      this.handTo(destination.scene,destination.entrance);
    };
    const after=then?(continuation==='after-handoff'?()=>{handoff();then();}:then):handoff;
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
    const opening = this.openingStory.openingLevel(id);
    if (opening) { this.openingFrom(opening); return; }
    if (isCutsceneId(id)) { this.playCutscene(id); return; }
    this.handTo(startLevel(id,{board:(station,left)=>boardRide(this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model,station,left)}) ?? id);
    this.markSeen(this.here);
    this.persistSave();
  }

  /** Arrive in a scene by id (anything else is Downtown), at its spawn. */
  handTo(id: string, entrance?: string) {
    this.enter(this.hasScene(id) ? id : playProfile().home as SceneId, true, entrance);
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
      if (e.edge || e.engine || !exitVisibility(e,this.save.flags).ok) continue;
      if (e.action === 'board') {
        const st = this.world.stationAt(this.here);
        if (st) for (const dx of this.metro.platformDoors(st, this.platformTime, this.cam, s.platformStop ?? this.metro.STOP)) list.push({ kind: 'exit', id: 'exit:' + e.id, x: dx, h: 0, label: e.label + ' · LINE 0 > ' + this.world.STATIONS[this.metro.nextStation(st)].name, promptH: e.promptH ?? 70 });
        continue;
      }
      // The train's door: only while it stands at a stop with the doors open.
      if (e.action === 'out' && !this.metro.rideOpen(this.ride)) continue;
      // a taxi stand shows its fare and what you have (tokens show only where you pay)
      const label = e.action === 'out' ? '[E] STEP OUT · ' + (this.metro.rideAtSiding(this.ride) ? 'SIDING' : this.world.STATIONS[this.metro.rideStop(this.ride)].name)
        : e.action === 'taxi' ? e.label + ' · ' + priceTag(this.world.FARE, this.save.tokens) : e.label;
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
    for (const u of s.uses ?? []) {if(u.available&&!u.available(this.save.flags))continue;const permission=u.eligibility?.(this.save.flags,this.gameplayFor(this.here));if(permission&&!permission.ok&&permission.hidden)continue;list.push({ kind: 'life', id: 'use:' + u.id, x: u.x, h: 0, label: this.useLabel(u), promptH: u.promptH ?? 70 });}
    // benches, stools and the bed: wait until… (not while a story beat holds the clock: the opening's own bed is its sleep)
    if (city.pinned === null) for (const r of s.rests ?? []) list.push({ kind: 'life', id: 'rest:' + r.id, x: r.x, h: r.h ?? 0, label: r.kind === 'bed' ? '[E] SLEEP · WAIT' : '[E] SIT · WAIT', promptH: r.promptH ?? 60 });
    // the scene's people with something to say (characters.ts): the target follows a walker (nobody outside their time window)
    for (const p of s.people ?? []) if (p.id && p.talk && isHere(p)) list.push({ kind: 'life', id: 'talk:' + p.id, x: characterX(p, this.t), h: 0, label: '[E] TALK', promptH: p.promptH ?? characterHeight(p) + 16 });
    // animals: people always want to pet the cat (and the pigeon gets shooed)
    (s.people ?? []).forEach((p, i) => {
      if (!isHere(p)) return;
      const critter = critterReaction(p, this.critters);
      if (!p.talk && critter) list.push({ kind: 'life', id: 'pet:' + i, x: characterX(p, this.t), h: 0, label: critter.prompt, promptH: characterHeight(p) + 14 });
      // robots without talk still answer: a beep, a status, a polite refusal
      else if (!p.talk && isBot(p)) list.push({ kind: 'life', id: 'bot:' + i, x: characterX(p, this.t), h: 0, label: botVoice(p,this.botReactions).label, promptH: characterHeight(p) + 14 });
    });
    return list;
  }

  /** E next to a scene's exit or something of its life (`kind:id`, as `exitTargets` and `lifeTargets` make them). */
  private useLife(target: string) {
    const s = this.def, [kind, id] = target.split(':');
    if (kind === 'story') { const card = s.phases?.[this.story]?.targets?.[id]?.card; if (card) this.startCard(this.openingStory.CARDS[card], true); return; }
    if (kind === 'rest') { const r = s.rests?.find((z) => z.id === id); if (r) this.offerWait(r); return; }
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!, o = s.phases?.[this.story]?.lines?.[id];
      this.say(o?.name ?? r.name, o?.pages ?? r.pages, r.x, r.h ?? 70);
      return;
    }
    if (kind === 'pet') {
      const p = s.people![Number(id)], critter = critterReaction(p, this.critters), n = this.petCount++;
      if (!critter) return;
      sound.blip();
      this.say(critter.name, critterReply(critter, n), characterX(p, this.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'bot') {
      const index=Number(id),p=s.people![index],conversation=new ConversationSession(this.gameplayFor(this.here)!,botConversationId(this.here,p,index));
      const frame=conversation.frame(),said={name:frame.speaker,pages:frame.pages};conversation.close();
      sound.blip();
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) + 4);
      this.dialogueCompletion(frame.completion);
      return;
    }
    if (kind === 'talk') {
      const p = s.people!.find((z) => z.id === id)!, said = talkTo(p,this.gameplayFor(this.here));
      this.persistSave();
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) - 10);
      this.dialogueCompletion(said.completion);
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
  private useLabel(u: SceneUse) { const n = this.usePrice(u); return n ? (u.pricedLabel!==undefined?u.pricedLabel+' ':u.label+' · ') + priceTag(n, this.save.tokens) : u.label; }

  /** Run a use (or what it does with something you carry), say what comes of it, write the save. */
  private runUse(u: SceneUse, fn: (c: UseCtx) => SceneSaid) {
    const save = this.save;
    const opening=this.def.phases?.[this.story]?.lines?.[u.id];
    if(opening){this.say(opening.name??'YOU',opening.pages,u.x,u.h??60);return;}
    const gameplay=this.gameplayFor(this.here),tokensBefore=save.tokens;
    const permission=u.eligibility?.(save.flags,gameplay);if(permission&&!permission.ok){this.zh.react('use:'+u.id,['',permission.reason,'err']);return;}
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
    this.persistSave();
    this.syncHud();
    const said = Array.isArray(out) ? { name: u.name, pages: out } : out;
    if(said.conversation){if(!gameplay)throw new Error('Conversation requires gameplay session');const conversation=new ConversationSession(gameplay,said.conversation,{objective:this.def.objective?.(save.flags,gameplay.state())??''}),frame=conversation.frame();if(u.conversationPresentation==='bubble'&&!frame.choices?.length&&!frame.acceptsText){conversation.close();this.say(frame.speaker,frame.pages,u.x,u.h??60);this.dialogueCompletion(frame.completion);}else this.zh.presentConversation(conversation);return;}
    if(said.pages.length){if(u.speakerKind==='device')this.zh.react('use:'+u.id,['',said.pages.join('\n')]);else if(u.speakerKind==='system')this.notify(said.pages.join(' '));else this.say(said.name,said.pages,u.x,u.h??60);}
  }

  /** Leave through an exit: board, step out, hail a taxi, look at the map, or walk to its scene, landing at its matching exit there. */
  private useExit(e: SceneExit) {
    // the story: some ways out do something else in this phase (a checkpoint, an acknowledgment, "bed first")
    const rule = this.def.phases?.[this.story]?.exits?.[e.id];
    if (rule && this.storyExit(rule, e.x, { to: e.to, at: e.at }, e.checkpoint,'exit:'+e.id)) return;
    // a door that reads key chips (Moth's building): only the right one opens it
    if (e.needs && !exitPermission(e,this.save.keyring).ok) { this.zh.react('exit:'+e.id,['',e.needs.pages.join('\n'),'err']); return; }
    if (e.action === 'board') { const st = this.world.stationAt(this.here); if (st && this.metro.platformOpen(st, this.platformTime)) this.enterTrain(st); return; }
    if (e.action === 'out') { this.stepOut(); return; }
    if (e.action === 'taxi') { this.hailTaxi(); return; }
    if (e.action === 'map') { this.showMap(); sound.open(); return; }
    if (!this.hasScene(e.to)) return;
    // the flat's door: the companion comes along from now on
    if (e.sets) { this.save.flags[e.sets] = true; this.persistSave(); }
    this.travel(e.to, e.at);
  }

  /** The scene view, refreshed for this frame. */
  private view(): SceneView {
    const v = (this.sceneView ??= { ...frameView(0), sx: (wx, p = 1) => this.sx(wx, p), y: (h) => this.y(h), flags: this.save.flags });
    v.t = this.t; v.viewW = this.viewW; v.viewH = this.viewH; v.cam = this.cam; v.gy = this.gy; v.flags = this.save.flags; v.level = this.level ? levelView(this.level, this.zh.model) : undefined;
    v.timetable = this.world.stationAt(this.here) ? this.platformTime : undefined;
    return v;
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a scene, landing at its exit `at` there. */
  private travel(id: SceneId, at?: string) {
    this.mapView = null;
    this.enter(id, false, at);
  }

  /** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const e = this.def.exits.find((z) => z.edge === edge && exitVisibility(z,this.save.flags).ok);
    if (!e || !this.hasScene(e.to)) return;
    this.travel(e.to, e.at);
    this.p.face = edge === 'left' ? -1 : 1;
  }

  /** Remember a scene for the city map: `flags['seen:<scene>']`. */
  private markSeen(id: SceneId) {
    this.save.scene = id;
    const f = this.world.seenFlag(id);
    this.save.flags[f] = true;
    this.persistSave();
  }

  /** Board the train standing at a station's platform: in the car by its door, which stays open as long as it would have on the platform. */
  private enterTrain(at: Station) {
    boardRide(this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model, at, this.metro.platformLeft(at, this.platformTime));
    this.travel(this.world.TRANSPORT.boarding.scene,this.world.TRANSPORT.boarding.entrance);
  }

  /** E at the train's open door: out onto the platform of the stop it stands at, the train still there behind you until it leaves. */
  private stepOut() {
    if (!this.metro.rideOpen(this.ride)) return;
    // P14: the old siding has no station, only a service stair up to the harbor's pier
    if (this.metro.rideAtSiding(this.ride)) { this.travel(this.world.TRANSPORT.siding.scene,this.world.TRANSPORT.siding.entrance); this.say('YOU', this.world.SIDING_OUT, this.p.x, 50); return; }
    const st = this.metro.rideStop(this.ride), left = this.metro.rideLeft(this.ride);
    this.travel(this.world.STATIONS[st].scene,this.world.STATIONS[st].at);
    // the train you stepped off stands at this platform until it leaves: the platform's own clock is set to it
    const platform = this.zh.model;
    platform.set(PLATFORM_SHIFT, this.metro.platformShiftFor(st, timelineOf(platform).t, left));
  }

  /** The taxi answers at its stand; an unavailable anchor falls back to system feedback. */
  private driverReply(pages:string[]){const text='DRIVER: '+pages.join('\n'),taxi=this.def.exits.find(e=>e.action==='taxi');if(taxi)this.zh.react('exit:'+taxi.id,['',text,'err']);else {this.notify(text,'error');sound.denied();}}

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < this.world.FARE) {
      this.driverReply(this.world.DRIVER_BROKE);
      return;
    }
    this.mapView = this.worldMap.openMap('taxi', this.here, this.here === this.world.TRANSPORT.boarding.scene ? this.metro.rideStop(this.ride) : null);
    this.keys.clear();
    this.syncEnginePause();
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (!can('map')) return;
    if (!this.running || this.flight || this.hop) return;
    this.keys.clear();
    this.bubble = null;
    // the map takes the screen: hack vision closes first
    if (this.zh.visionOn) this.zh.toggleVision();
    this.mapView = this.worldMap.openMap('view', this.here, this.here === this.world.TRANSPORT.boarding.scene ? this.metro.rideStop(this.ride) : null);
    this.syncEnginePause();
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.mapView; }

  private mapKey(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.mapAct(this.worldMap.mapKey(this.mapState(), k));
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
    if (to === this.world.standOf(this.here)) { this.flash('you are already here'); return; }
    // a destination lock (city.json `LOCKS`; the harbor: P14): no flights to a shut destination
    if (!this.world.transportAccess(to, this.save.flags).ok) { this.driverReply(this.world.DRIVER_HARBOR); return; }
    this.save.tokens -= this.world.FARE;
    this.persistSave();
    this.syncHud();
    this.flight = { to, start: this.clock };
    sound.open();
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  private mapState(): MapState {
    const m = this.mapView ?? this.worldMap.openMap('view', this.here, null);
    return {
      view: m, touch: this.touch, scene: this.here, reduced: this.reduced,
      // the smallest touch target, 44 CSS px, in view units
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.k,
      avoid: this.mapAvoid(),
      ride: this.here === this.world.TRANSPORT.boarding.scene ? { from: this.metro.rideStop(this.ride), to: this.metro.rideNext(this.ride), f: this.metro.rideRun(this.ride) } : null,
      seen: (z) => !!this.save.flags[this.world.seenFlag(z)], flag: (f) => !!this.save.flags[f], exitAccess:(scene,id)=>sceneExitAccess(this.hasScene(scene)?this.sceneDefinition(scene).exits.find(e=>e.id===id):undefined,this.save.flags,this.save.keyring), harborOpen: this.world.harborOpen(this.save.flags), tokens: this.save.tokens, t: this.clock,
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
    const { act, pointer } = this.worldMap.mapPointer(this.mapState(), this.viewW, this.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.mapAct(act);
  }

  /** Quick travel to a place you know, from the map: no fare, a short fade; or say why not. */
  private quickTravel(place: MapPlace) {
    if (this.hackLocked()) { this.flash('not now: ' + (this.def.phases?.[this.story]?.goal ?? 'later')); sound.denied(); return; }
    const why = this.world.placeBlocked(place, this.mapState());
    if (why) { this.flash(why.toLowerCase()); sound.denied(); return; }
    this.mapView = null;
    this.canvas.style.cursor = '';
    this.hop = { place, start: this.clock, done: false };
    sound.close();
  }

  /** Flights land; on board, the train stands, closes its doors, runs to the next stop on the loop and opens them (line.ts). */
  private updateTravel() {
    // Maps hold the ride as well as the engine that reads its position (P14).
    if (this.mapView || this.netView) return;
    // locked stations (metro source `locked`): LINE 0 stops there only once the city lock opens (the harbor: P14)
    this.metro.syncLocks(this.world, this.save.flags);
    if (this.flight && this.clock - this.flight.start >= taxiDurationFor(this.sequenceDocuments.cinematics) * 60) {
      const to = this.flight.to;
      this.flight = null;
      // the flight costs its fixed time on the city clock (clock.ts TRAVEL)
      city.advance(TRAVEL.taxi);
      this.travel(this.world.STANDS[to].scene,this.world.STANDS[to].at);
      this.flash('-' + this.world.FARE + ' token · ' + this.world.STANDS[to].name);
    }
    // a quick trip moves you while the screen is dark, half way through its fade
    if (this.hop) {
      const e = this.clock - this.hop.start;
      if (!this.hop.done && e >= this.world.HOP / 2) { this.hop.done = true; city.advance(TRAVEL.quick); this.travel(this.hop.place.entrance, this.hop.place.at); }
      if (e >= this.world.HOP) this.hop = null;
    }
  }

  // ---------- the net map (netmap.ts, NET.md) ----------

  /** NET is yours: scan.so owned, and hacking yours (not in the opening's locked part). */
  private get netOk() { return capabilityView(this.save,!this.hackLocked(),this.networkContext.net).network; }

  /** A program came (scan.so from the library): saved, and NET shows in hack vision's bar, pinging until used. */
  private grantProgram(id: string,receipt?:FeedbackReceipt) {
    const acquired=!this.save.programs.includes(id);
    if (acquired) this.save.programs.push(id);
    this.persistSave();
    this.syncHud();
    if (id === this.networkContext.net.scanProgram&&acquired) {
      this.flash(this.touch ? 'NET: in hack vision, the net map' : 'NET: N, the net map'); sound.feedback(receipt??mintFeedback(this.here,'program','success'));
      // This program already announced its acquisition. Advance only that word in the
      // ownership observer so its next pass still reports any other simultaneous gains.
      if(this.gainWords&&!this.gainWords.split('|').includes(id))this.gainWords+='|'+id;
    }
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
    const here = this.networkContext.net.networks.filter((n) => n.from.some((r) => 'port' in r && r.port.startsWith(this.here + ':'))).map((n) => n.id);
    for (const n of [...reached, ...here]) if (!this.save.nets.includes(n)) this.save.nets.push(n);
    if (zh.model.ports().length || reached.size) zh.typed(() => zh.scanHere());
    this.save.flags[NET_OPENED] = true;
    this.persistSave();
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
      const d = s === 'net' ? this.networkContext.net.nodes.find((x) => x.id === m.id) : [...(this.hasScene(s)?this.sceneDefinition(s).data?.devices??[]:[]), ...(this.hasScene(s)?this.sceneDefinition(s).data?.nodes??[]:[])].find((x) => x.id === m.id);
      if (d) return d.name;
    }
    return m.id.toUpperCase();
  }

  /** What the net map draws from: the networks you reach from here, those found, each machine's state from here. */
  private netState(): NetState {
    const zh = this.zh, model = zh.model, reached = model.netsHere();
    const portKeys = new Set(model.ports().map((p) => p.key));
    const plugged = new Set(this.networkContext.net.networks.filter((n) => n.from.some((r) => 'port' in r && portKeys.has(r.port))).map((n) => n.id));
    const state = (m: MachineData, n: NetworkData): MachineState => {
      if (!reached.has(n.id)) return 'out';
      if (!m.in.includes(this.here) && !m.in.includes('net')) return 'far';
      const d = model.devices.get(m.id);
      if (d && !d.node) return 'here';
      return model.net.get(m.id) === 'connected' ? 'board' : 'reach';
    };
    return {
      view: this.netView ?? openNet(), scanner: this.networkContext.net.scanProgram, nets: this.networkContext.net.networks, reached, plugged, found: new Set(this.save.nets),
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
      const place = a.machine.in.filter((s) => this.hasScene(s)).map((s) => sceneTitle(this.sceneDefinition(s as SceneId)))[0] ?? 'another place';
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
    this.persistSave();
    const l = zh.model.scanHere();
    this.term.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : 'dim');
    if (l[2] !== 'err' && reached.size) this.term.print('networks in reach: ' + this.networkContext.net.networks.filter((n) => reached.has(n.id)).map((n) => n.name).join(', '), 'dim');
  }

  /** The deck's `connect <machine>` (by id or name): onto the board, and the deck talks to it from then on. */
  private deckConnect(name: string) {
    const zh = this.zh, want = name.toLowerCase().replace(/\s+/g, '');
    const all = this.networkContext.net.networks.flatMap((n) => n.machines);
    const m = all.find((x) => x.id.toLowerCase() === want || this.machineName(x).toLowerCase().replace(/\s+/g, '') === want);
    const id = m?.id ?? name;
    if (!zh.model.devices.has(id) && !zh.model.nodesHere().includes(id) && !m) { this.term.print('connect: no machine called ' + (name || '?') + ' in reach. try scan.', 'err'); return; }
    zh.typed(() => zh.plugIn(id));
  }

  /** The GOAL after Capsule 7B, until scan.so is yours: the library (Act I: Capsule 7B → the library → Downtown). */
  private libraryGoal(): string | null {
    return goalHint(this.openingStory.GOAL_HINTS, {
      hackLocked: this.hackLocked(), scene: this.here, programs: this.save.programs,
      goalsDone: (scene) => this.hosts.get(scene as SceneId)?.model.goals ?? new Set(this.save.scenes[scene]?.goals ?? []),
      goalsLeft: () => this.zh.model.data.goals.some((g) => !this.zh.model.goals.has(g.id)),
    });
  }

  /** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
  private drawMap() {
    if (this.hop) {
      const x = this.x, f = (this.clock - this.hop.start) / this.world.HOP;
      x.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1.2 - Math.abs(f * 2 - 1) * 1.2) + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
      if (f > 0.3 && f < 0.7) { x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('> ' + this.hop.place.name, this.viewW / 2, this.viewH / 2); x.restore(); }
    }
    if (this.mapView) this.worldMap.drawCityMap(this.x, this.viewW, this.viewH, this.mapState());
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
/** The least street the view shows across (world units); a squarish window drops a scale step to keep it. */
const MIN_VIEW_W = 460;
/** …but never by making the view taller than this (world units). */
const MAX_VIEW_H = 440;

/** How often the clock's progress is written to the save while it runs (frames, ~10 s). */
const CLOCK_SAVE = 600;
/** A minute of the day as HH:MM (any number of minutes on). */
const hmOf = (min: number) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
