import { mergeGameplayLibrary } from '../engine/gameplay/libraries';
import {
  advanceSequenceCommands,
  authoredSequenceSources,
  validateSequenceHandoffs,
} from './sequence-commands';
import type { OpeningDocuments } from '../story/title/documents';
import {
  compileWorldGraph,
  validateWorldCompositions,
  worldWithMembership,
  editWorldMembership,
  type WorldCompositions,
  type CompositionEdit,
} from '../world/compositions';
import { worldCompositionContext } from '../world/compiled-world';
import worldCompositionSource from '../world/compositions.json';
import baseGraphSource from '../world/zone-graph.json';
import { validateZoneGraph } from '../world/zone-graph';
import { validateWorldPeople } from '../engine/people';
import type { ScenePlacement } from './state';
import { type CameraProjection } from '../art/core/geometry';
import * as InteractionRouting from './interaction-routing';
import * as StoryTransitions from './story-transitions';
import * as PresentationFrame from './presentation-frame';
import { type MovementPort } from './movement';
import * as Camera from './camera';
import * as InputRouting from './input-routing';
import * as SceneLifecycle from './scene-lifecycle';
import type { GameHost } from './contracts';
import {
  createCameraState,
  createInputState,
  createScenesState,
  createTimingState,
  createPresentationState,
} from './state';
import { type InteractionTarget as Target } from './interaction-targets';

import { type CommunicationReview } from '../demo/communication-review';
import { type SceneModel } from '../engine/model';
import { COMPANION_GAMEPLAY } from '../engine/gameplay/companion-conversations';
import { COMPANION_SOURCE, companionHere } from '../engine/gameplay/companion-source';
import type { GameRuntimeSources } from './game-sources';
import { runtimeSequenceDocuments } from '../story/sequence-documents';
import { defaultNetworkContext } from '../engine/network-context';
import { type FeedbackReceipt } from '../engine/feedback-receipt';
import type { MetroStart } from '../world/transport/metro-start';
import { METRO_SOURCE, type MetroSource } from '../world/transport/metro-source';
import { CRITTER_REACTIONS, CRITTER_GAMEPLAY } from '../engine/gameplay/critter-reactions';
import { BOT_REACTIONS, type BotReactionDocument } from '../engine/gameplay/bot-conversations';
import { capabilityView } from '../world/access';
import type { HackStage } from '../engine/hack-stages';
import { mountReviewNavigator } from '../demo/review-navigator';
import { REVIEW_STATIONS, type ReviewActionSource } from '../demo/review-stations';

import { validateWorldVehicles } from '../engine/level-vehicles';

import { type ZoneFrame } from './frame';
import { GameplaySession } from '../engine/gameplay/session';
/** Composition root for the one game runtime. Owns services, current state, save
 * serialization and frame ordering. Domain work is called through the focused
 * runtime modules; ordinary scene behavior remains in authored gameplay source. */

import { type MachineData } from '../data/index';

import { CITY, SceneHost } from '../engine/index';

import { SCENES, sceneTitle, type SceneDef, type SceneId, type SceneView } from '../scenes/index';
import { contactsModel, type ContactsModel } from '../story/contacts';
import { END_CARD, type EndCardSource } from '../story/end-card';
import { createCutscenes, type CutsceneId } from '../story/cutscenes/index';
import { openingStoryModel, type OpeningState } from '../story/opening';
import { createCityMap, type MapAct, type MapState } from '../ui/citymap';
import { KeyBar } from '../ui/keybar';
import { Hints } from '../ui/hints';
import { Menu, type DeckData } from '../ui/menu';
import { type NetAct, type NetState } from '../ui/netmap';
import { ShiftGuidance } from '../ui/shift-guidance';
import { levels, SUDO, unlockAll } from '../ui/sudo';
import { Terminal, type LineKind } from '../ui/terminal';
import { commands, NO_ARGS, run, suggest, type Ctx } from '../ui/terminal/commands';
import { ClockBar, Transport } from '../ui/transport';
import * as defaultCity from '../world/city';
import type { CityModel } from '../world/city';
import { city } from '../world/clock';
import { type Light } from '../world/light';
import { createLineSystem, type LineSystem } from '../world/transport/line';
import { sceneClimate, setOverride, type Weather } from '../world/weather';
import { Companion } from './companion';
import { EDITOR_PLAY, PROBE } from './mode';
import { startCheckpoint, can, playProfile, sudoOn } from './play-profile';
import { loadSave, who, type Save } from './save';
import { type Movers } from '../engine/level';
import * as StateMethods from './game/state';
import * as ReviewMethods from './game/review';
import * as ScenesMethods from './game/scenes';
import * as RunMethods from './game/run';
import * as FrameMethods from './game/frame';
import * as InteractionMethods from './game/interaction';
import * as HudMethods from './game/hud';
import * as CutscenesMethods from './game/cutscenes';
import * as MapMethods from './game/map';
import * as NetMethods from './game/net';

/**
 * The game loop. This class holds the runtime state, the ports handed to the runtime systems and
 * the constructor; method bodies live in runtime/game/ by area (run, state, scenes, frame,
 * interaction, hud, cutscenes, map, net, review) and take the game as their first argument. Each
 * method here is a one-line delegate, so `this.method()` calls, bound listeners and tests that
 * reach Game.prototype keep working. Members without `private` are read by those area modules;
 * they are internal to runtime/game.ts and runtime/game/, not public API.
 */
export class Game {
  save: Save;
  readonly camera = createCameraState();
  readonly input = createInputState();
  readonly scenes = createScenesState();
  readonly timing = createTimingState();
  readonly presentation = createPresentationState();

  private interactionRoutingPortValue?: InteractionRouting.InteractionRoutingPort;
  get interactionRoutingPort(): InteractionRouting.InteractionRoutingPort {
    return (this.interactionRoutingPortValue ??= (() => {
      const game = this;
      return {
        get hints() {
          return game.hints;
        },
        get presentation() {
          return game.presentation;
        },
        get interactionHost() {
          return game.interactionHost;
        },
        nearest: (...args) => game.nearest(...args),
        get scenes() {
          return game.scenes;
        },
        get p() {
          return game.p;
        },
        get movers() {
          return game.movers;
        },
        introduceScene: (...args) => game.introduceScene(...args),
        persistSave: (...args) => game.persistSave(...args),
        hostOf: (...args) => game.hostOf(...args),
        get def() {
          return game.def;
        },
        get story() {
          return game.story;
        },
        get zh() {
          return game.zh;
        },
        gameplayFor: (...args) => game.gameplayFor(...args),
        globalGameplay: () => game.globalGameplay(),
        get companionBody() {
          return game.companionBody;
        },
        say: (...args) => game.say(...args),
        dialogueCompletion: (...args) => game.dialogueCompletion(...args),
        sceneDefinition: (...args) => game.sceneDefinition(...args),
        startCard: (...args) => StoryTransitions.startCard(game.storyTransitionsPort, ...args),
        get openingStory() {
          return game.openingStory;
        },
        offerWait: (...args) => StoryTransitions.offerWait(game.storyTransitionsPort, ...args),
        get critters() {
          return game.critters;
        },
        get timing() {
          return game.timing;
        },
        get save() {
          return game.save;
        },
        flash: (...args) => game.flash(...args),
        weatherHere: (...args) => game.weatherHere(...args),
        syncHud: (...args) => game.syncHud(...args),
        notify: (...args) => game.notify(...args),
        hailTaxi: (...args) => game.hailTaxi(...args),
        showMap: (...args) => game.showMap(...args),
        hasScene: (id): id is SceneId => game.hasScene(id),
        travel: (...args) => game.travel(...args),
        gameplayStatePort: (...args) => game.gameplayStatePort(...args),
        runCues: (...args) => StoryTransitions.runCues(game.storyTransitionsPort, ...args),
        get input() {
          return game.input;
        },
      };
    })());
  }

  private storyTransitionsPortValue?: StoryTransitions.StoryTransitionsPort;
  get storyTransitionsPort(): StoryTransitions.StoryTransitionsPort {
    return (this.storyTransitionsPortValue ??= (() => {
      const game = this;
      return {
        runOpeningWorkflow: (...args) => game.runOpeningWorkflow(...args),
        get term() {
          return game.term;
        },
        get presentation() {
          return game.presentation;
        },
        get timing() {
          return game.timing;
        },
        persistSave: (...args) => game.persistSave(...args),
        syncHud: (...args) => game.syncHud(...args),
        get scenes() {
          return game.scenes;
        },
        enter: (...args) => game.enter(...args),
        hostOf: (...args) => game.hostOf(...args),
        get p() {
          return game.p;
        },
        sceneDefinition: (...args) => game.sceneDefinition(...args),
        get def() {
          return game.def;
        },
        get zh() {
          return game.zh;
        },
        get companionBody() {
          return game.companionBody;
        },
        say: (...args) => game.say(...args),
        get touch() {
          return game.touch;
        },
        finishExit: (...args) =>
          InteractionRouting.finishExit(game.interactionRoutingPort, ...args),
        get story() {
          return game.story;
        },
        get openingStory() {
          return game.openingStory;
        },
        get input() {
          return game.input;
        },
        get clockMode() {
          return game.clockMode;
        },
        globalGameplay: () => game.globalGameplay(),
        get save() {
          return game.save;
        },
        gameplayFor: (...args) => game.gameplayFor(...args),
        get stampEl() {
          return game.stampEl;
        },
        get placeName() {
          return game.placeName;
        },
        get metro() {
          return game.metro;
        },
        get world() {
          return game.world;
        },
        get sequenceDocuments() {
          return game.sequenceDocuments;
        },
        travel: (...args) => game.travel(...args),
        flash: (...args) => game.flash(...args),
        get canvas() {
          return game.canvas;
        },
        driverReply: (...args) => game.driverReply(...args),
        hackLocked: (...args) => game.hackLocked(...args),
        mapState: (...args) => game.mapState(...args),
        get enginesPaused() {
          return game.enginesPaused;
        },
      };
    })());
  }

  private presentationFramePortValue?: PresentationFrame.PresentationFramePort;
  get presentationFramePort(): PresentationFrame.PresentationFramePort {
    return (this.presentationFramePortValue ??= (() => {
      const game = this;
      return {
        view: (...args) => game.view(...args),
        get citySource() {
          return game.world.source;
        },
        get worldCompositions() {
          void game.zoneGraph;
          return game.appliedWorldSource!;
        },
        get x() {
          return game.x;
        },
        get camera() {
          return game.camera;
        },
        get def() {
          return game.def;
        },
        get scenes() {
          return game.scenes;
        },
        get zh() {
          return game.zh;
        },
        get reduced() {
          return game.reduced;
        },
        get timing() {
          return game.timing;
        },
        get sources() {
          return game.sources;
        },
        weatherHere: (...args) => game.weatherHere(...args),
        lightHere: (...args) => game.lightHere(...args),
        zoneFrame: (...args) => game.zoneFrame(...args),
        get p() {
          return game.p;
        },
        get companionPresent() {
          return game.companionPresent;
        },
        get companionBody() {
          return game.companionBody;
        },
        get companionDoc() {
          return game.companionDoc;
        },
        get interactionHost() {
          return game.interactionHost;
        },
        hostPlacement: (...args) => game.hostPlacement(...args),
        get openingStory() {
          return game.openingStory;
        },
        get save() {
          return game.save;
        },
        groundUnder: (...args) => game.groundUnder(...args),
        get presentation() {
          return game.presentation;
        },
        nearest: (...args) => game.nearest(...args),
        get keyBar() {
          return game.keyBar;
        },
        get canvas() {
          return game.canvas;
        },
        get clockText() {
          return game.clockText;
        },
        get hints() {
          return game.hints;
        },
        get communicationCovered() {
          return game.communicationCovered;
        },
        gameplayFor: (...args) => game.gameplayFor(...args),
        get story() {
          return game.story;
        },
        libraryGoal: (...args) => game.libraryGoal(...args),
        get shiftGuidance() {
          return game.shiftGuidance;
        },
        get endCard() {
          return game.endCard;
        },
        get zoneGraph() {
          return game.zoneGraph;
        },
      };
    })());
  }

  private movementPortValue?: MovementPort;
  get movementPort(): MovementPort {
    return (this.movementPortValue ??= (() => {
      const game = this;
      return {
        get p() {
          return game.p;
        },
        get scenes() {
          return game.scenes;
        },
        get input() {
          return game.input;
        },
        get presentation() {
          return game.presentation;
        },
        get movers() {
          return game.movers;
        },
        get zh() {
          return game.zh;
        },
        hostOf: (id) => game.hostOf(id),
        hasScene: (id): id is SceneId => game.hasScene(id),
        followResidency: () => SceneLifecycle.followResidency(game.sceneLifecyclePort),
        crossInto: (id) => SceneLifecycle.crossInto(game.sceneLifecyclePort, id),
        keepSeenRooms: () => SceneLifecycle.keepSeenRooms(game.sceneLifecyclePort),
        get levelW() {
          return game.levelW;
        },
        get platforms() {
          return game.platforms;
        },
        seamAt: (edge) => SceneLifecycle.seamAt(game.sceneLifecyclePort, edge),
        walkOff: (edge) => game.walkOff(edge),
      };
    })());
  }
  private cameraPortValue?: Camera.CameraPort;
  get cameraPort(): Camera.CameraPort {
    return (this.cameraPortValue ??= (() => {
      const game = this;
      return {
        get camera() {
          return game.camera;
        },
        get timing() {
          return game.timing;
        },
        get scenes() {
          return game.scenes;
        },
        get term() {
          return game.term;
        },
        get levelW() {
          return game.levelW;
        },
        get interactionHost() {
          return game.interactionHost;
        },
        get zh() {
          return game.zh;
        },
        worldSpan: (...args) => SceneLifecycle.worldSpan(game.sceneLifecyclePort, ...args),
        get presentation() {
          return game.presentation;
        },
        get input() {
          return game.input;
        },
        get p() {
          return game.p;
        },
        get canvas() {
          return game.canvas;
        },
        hostPlacement: (...args) => game.hostPlacement(...args),
        get menu() {
          return game.menu;
        },
      };
    })());
  }

  private inputRoutingPortValue?: InputRouting.InputRoutingPort;
  get inputRoutingPort(): InputRouting.InputRoutingPort {
    return (this.inputRoutingPortValue ??= (() => {
      const game = this;
      return {
        get presentation() {
          return game.presentation;
        },
        openingDone: (...args) => game.openingDone(...args),
        get term() {
          return game.term;
        },
        get transport() {
          return game.transport;
        },
        get menu() {
          return game.menu;
        },
        skipRise: (...args) => game.skipRise(...args),
        netKeyDown: (...args) => game.netKeyDown(...args),
        mapKey: (...args) => game.mapKey(...args),
        get interactionHost() {
          return game.interactionHost;
        },
        interact: (...args) => InteractionRouting.interact(game.interactionRoutingPort, ...args),
        openMenu: (...args) => game.openMenu(...args),
        openDeck: (...args) => game.openDeck(...args),
        showMap: (...args) => game.showMap(...args),
        get netOk() {
          return game.netOk;
        },
        showNet: (...args) => game.showNet(...args),
        resetVision: (...args) => Camera.resetVision(game.cameraPort, ...args),
        get scenes() {
          return game.scenes;
        },
        levelLocked: (...args) => game.levelLocked(...args),
        get p() {
          return game.p;
        },
        get input() {
          return game.input;
        },
        jump: (...args) => game.jump(...args),
        netPointerAt: (...args) => game.netPointerAt(...args),
        mapPointer: (...args) => game.mapPointer(...args),
        visionPointer: (...args) => Camera.visionPointer(game.cameraPort, ...args),
        get canvas() {
          return game.canvas;
        },
        get camera() {
          return game.camera;
        },
        deviceAt: (...args) => game.deviceAt(...args),
        // hover's pink bracket belongs to hack vision: locked until the `inspect` stage is yours
        hackLocked: () => !game.hackStage('inspect'),
        get zh() {
          return game.zh;
        },
        targets: (...args) => game.targets(...args),
        useLife: (...args) => InteractionRouting.useLife(game.interactionRoutingPort, ...args),
      };
    })());
  }

  private sceneLifecyclePortValue?: SceneLifecycle.SceneLifecyclePort;
  get sceneLifecyclePort(): SceneLifecycle.SceneLifecyclePort {
    return (this.sceneLifecyclePortValue ??= (() => {
      const game = this;
      return {
        get ambientTime() {
          return game.presentation.opening ? game.presentation.opening.t * 60 : game.timing.t;
        },
        get camera() {
          return game.camera;
        },
        sceneDefinition: (...args) => game.sceneDefinition(...args),
        get scenes() {
          return game.scenes;
        },
        get zoneGraph() {
          return game.zoneGraph;
        },
        hasScene: (id): id is SceneId => game.hasScene(id),
        hostOf: (...args) => game.hostOf(...args),
        get content() {
          return game.content;
        },
        get save() {
          return game.save;
        },
        get p() {
          return game.p;
        },
        get movers() {
          return game.movers;
        },
        get interactionHost() {
          return game.interactionHost;
        },
        get platformOwner() {
          return game.world.stationAt(game.scenes.here)
            ? (game.world.TRANSPORT.boarding.scene as SceneId)
            : undefined;
        },
        persistSave: (...args) => game.persistSave(...args),
        get zh() {
          return game.zh;
        },
        get presentation() {
          return game.presentation;
        },
        get companionBody() {
          return game.companionBody;
        },
        get spanW() {
          return game.spanW;
        },
        markSeen: (...args) => game.markSeen(...args),
        get canvas() {
          return game.canvas;
        },
        get def() {
          return game.def;
        },
        syncHud: (...args) => game.syncHud(...args),
        get hints() {
          return game.hints;
        },
        introduceScene: (...args) => game.introduceScene(...args),
        get levelW() {
          return game.levelW;
        },
      };
    })());
  }

  canvas: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  term: Terminal;

  /** The world's seams (world/zone-graph.json): zones joined to each other with no cut. */
  compiledWorld?: import('../world/zone-graph').ZoneGraphSource;
  appliedWorldSource?: WorldCompositions;
  preparedWorldEdit?: {
    edits: readonly CompositionEdit[];
    result: ReturnType<typeof editWorldMembership>;
    changed?: Set<string>;
  };
  get worldCompositions() {
    return this.sources?.worldCompositions ?? validateWorldCompositions(worldCompositionSource);
  }
  get worldBaseGraph() {
    return this.sources?.zoneGraph ?? validateZoneGraph(baseGraphSource);
  }
  get worldCompositionContext() {
    return worldCompositionContext({ ...SCENES, ...this.content });
  }
  get zoneGraph() {
    if (!this.compiledWorld) {
      this.appliedWorldSource = worldWithMembership(
        this.worldCompositions,
        this.save.worldMembership,
      );
      this.compiledWorld = compileWorldGraph(
        this.appliedWorldSource,
        this.worldBaseGraph,
        this.worldCompositionContext,
      );
    }
    return this.compiledWorld;
  }
  prepareWorldEdits(edits: readonly CompositionEdit[]) {
    return StateMethods.prepareWorldEdits(this, edits);
  }
  reconcileWorldEdits() {
    return StateMethods.reconcileWorldEdits(this);
  }

  p = { x: SCENES.downtown.spawn, y: 0, vy: 0, face: 1, onGround: true, moving: false };

  touch = (() => {
    try {
      return matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  })();
  disposePerformance?: () => void;
  reviewNav?: ReturnType<typeof mountReviewNavigator>;
  reviewAllowed() {
    return ReviewMethods.reviewAllowed(this);
  }
  /** Hack is out of reach: the profile has no hacking, or the story has not given it yet (the opening's phases). */
  hackLocked() {
    return ReviewMethods.hackLocked(this);
  }
  /** The hacking stages that are yours now (engine/hack-stages.ts). */
  hackStages() {
    return ReviewMethods.hackStages(this);
  }
  /** One hacking stage is yours (hack vision is `inspect`). */
  hackStage(stage: HackStage) {
    return this.hackStages().has(stage);
  }
  get reviewDoc() {
    return this.sources?.reviewStations ?? REVIEW_STATIONS;
  }
  refreshReview() {
    return ReviewMethods.refreshReview(this);
  }
  /** A review button (demo/review-stations.json `actions`): a use, a conversation or a person in the scene. */
  reviewRun(a: ReviewActionSource) {
    return ReviewMethods.reviewRun(this, a);
  }
  reviewActor(id: string) {
    return ReviewMethods.reviewActor(this, id);
  }
  /** Explicit review bookmarks; never available in campaign play. */
  reviewJump(id: string) {
    return ReviewMethods.reviewJump(this, id);
  }
  reviewTalk(id: string) {
    return ReviewMethods.reviewTalk(this, id);
  }
  reviewUse(id: string) {
    return ReviewMethods.reviewUse(this, id);
  }
  reviewCommunication(id: CommunicationReview) {
    return ReviewMethods.reviewCommunication(this, id);
  }
  reduced = (() => {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  })();
  /** The scene the player is in. */

  /** Every key and what it does, along the top. */
  keyBar: KeyBar;
  /** The hint lane under the scene title (ui/hints.ts); control hints are sent from `controlHints`. */
  hints = new Hints(() => (this.save.seenHints ??= []));
  shiftGuidance?: ShiftGuidance;
  /** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */

  /** Where a saved game may resume: any scene, except a `stage.sudoOnly` one (the sandbox) without sudo. */
  resumable(id: string): boolean {
    return StateMethods.resumable(this, id);
  }
  /** Scenes the deck can start over (`stage.resettable`; `stage.sudoOnly` ones only under sudo), in scene order. */
  resettableScenes(): [string, SceneDef][] {
    return StateMethods.resettableScenes(this);
  }
  get companionDoc() {
    return this.sources?.companion ?? COMPANION_SOURCE;
  }
  get critters() {
    return this.sources?.critters ?? CRITTER_REACTIONS;
  }
  get openingStory() {
    return this.sources?.openingStory ?? openingStoryModel;
  }
  get contacts(): ContactsModel {
    return this.sources?.contacts ?? contactsModel;
  }
  private get endCard(): EndCardSource {
    return this.sources?.endCard ?? END_CARD;
  }
  get sequenceDocuments() {
    return this.sources?.sequences ?? runtimeSequenceDocuments;
  }
  get networkContext() {
    return this.sources?.network ?? defaultNetworkContext;
  }
  private cutsceneRegistry?: ReturnType<typeof createCutscenes>;
  get nativeCutscenes() {
    return (this.cutsceneRegistry ??= createCutscenes(this.sequenceDocuments.cinematics));
  }
  private worldSequenceRegistry?: ReturnType<typeof authoredSequenceSources>;
  get worldSequences() {
    if (!this.worldSequenceRegistry) {
      const scenes = { ...SCENES, ...this.content },
        sequences = authoredSequenceSources(scenes);
      validateSequenceHandoffs(
        Object.values(scenes).flatMap((s) => (s.gameplay ? [s.gameplay] : [])),
        new Set(['intro', 'act2', ...Object.keys(sequences)]),
      );
      this.worldSequenceRegistry = sequences;
    }
    return this.worldSequenceRegistry;
  }
  private metroInstance?: LineSystem;
  get metro() {
    return (this.metroInstance ??= createLineSystem(this.world, this.metroSource));
  }
  get world(): CityModel {
    return this.cityModel ?? defaultCity;
  }
  private cityMapInstance?: ReturnType<typeof createCityMap>;
  get worldMap() {
    return (this.cityMapInstance ??= createCityMap(this.world));
  }
  hasScene(id: string): id is SceneId {
    return StateMethods.hasScene(this, id);
  }
  sceneDefinition(id: SceneId): SceneDef {
    return StateMethods.sceneDefinition(this, id);
  }
  /** One common state port for scene commands and source-authored global story workflows. */
  gameplayStatePort(id?: SceneId): import('../engine/gameplay/types').StatePort {
    return StateMethods.gameplayStatePort(this, id);
  }
  globalGameplaySession?: GameplaySession;
  get globalGameplayDefinition() {
    return mergeGameplayLibrary(
      this.openingStory.GAMEPLAY,
      this.sources?.critterGameplay ?? CRITTER_GAMEPLAY,
      'Shared critter gameplay',
    );
  }
  globalGameplay(): GameplaySession {
    return StateMethods.globalGameplay(this);
  }
  /** The cinematic primitive reports a milestone; shared commands own flags and rewards. */
  runOpeningWorkflow(role: import('../story/opening-source').OpeningWorkflow): boolean {
    return StateMethods.runOpeningWorkflow(this, role);
  }
  gameplayFor(id: SceneId, providedModel?: SceneModel): GameplaySession | undefined {
    return StateMethods.gameplayFor(this, id, providedModel);
  }
  /** Serialization works on settled copies; live common blocks keep their identity and in-flight values. */
  prepareSave(save: Save): Save {
    return StateMethods.prepareSave(this, save);
  }
  persistSave() {
    return StateMethods.persistSave(this);
  }
  /** The companion body (engine/gameplay/companion.json): at home where a scene says so, at your heels once its flag is set. */
  companionBody = new Companion();

  constructor(
    public host: GameHost,
    public content: Partial<Record<SceneId, SceneDef>> = {},
    public clockMode: 'story' | 'fixed' | 'running' = startCheckpoint().clock,
    public botReactions: BotReactionDocument = BOT_REACTIONS,
    private cityModel: CityModel = defaultCity,
    private metroSource: MetroSource = METRO_SOURCE,
    metroStart?: MetroStart,
    public sources: GameRuntimeSources = {},
  ) {
    const loaded = loadSave({
      scenes: Object.fromEntries(
        Object.entries({ ...SCENES, ...content }).filter(
          (entry): entry is [string, SceneDef] => !!entry[1],
        ),
      ),
      vocabulary: sources.checkpointVocabulary,
    });
    this.save = sudoOn() ? unlockAll(loaded) : loaded;
    if (!EDITOR_PLAY) {
      const weather = startCheckpoint().weather;
      setOverride('city', weather === 'forecast' ? null : weather);
    }
    validateWorldPeople(
      Object.fromEntries(
        Object.entries({ ...SCENES, ...content }).filter(
          (entry): entry is [string, SceneDef] => !!entry[1],
        ),
      ),
      this.zoneGraph,
    );
    validateWorldVehicles(
      Object.fromEntries(
        Object.entries({ ...SCENES, ...content }).filter(
          (entry): entry is [string, SceneDef] => !!entry[1],
        ),
      ),
      this.zoneGraph,
    );
    // sudo (developer) mode: browser checks read the player and the level, and place the player, through window.__game
    const game = this;
    if (SUDO || PROBE)
      (globalThis as { __game?: unknown }).__game = {
        get player() {
          return game.p;
        },
        get level() {
          return game.scenes.level;
        },
        get here() {
          return game.scenes.here;
        },
        prompt: () => game.nearest(),
        inspect: () => game.inspect(),
        probe: () => game.probeFrame(),
        ...(SUDO
          ? {
              place: (x: number) => {
                game.p.x = x;
              },
            }
          : {}),
      };
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    this.term.onLine = (text, kind) => {
      if (kind === 'err' && !this.term.isOpen)
        this.hints.notify(text.split('\n').pop() ?? text, 'error');
    };
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length)
        return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => this.canvas.focus();

    this.keyBar = new KeyBar(host.windowEl);
    if (playProfile().guidance.style === 'shift')
      this.shiftGuidance = new ShiftGuidance(
        host.windowEl,
        this.reduced,
        (wx) => {
          this.zh.clearPing('goal');
          this.presentation.goalAt = wx;
          if (wx !== null) this.zh.ping('goal', 'look');
        },
        (flags) => this.def.attention?.(flags, this.gameplayFor(this.scenes.here)?.state()) ?? null,
        (flags) => this.def.objective?.(flags, this.gameplayFor(this.scenes.here)?.state()) ?? '',
      );
    this.menu = new Menu(
      host.windowEl,
      {
        save: () => this.save,
        saveSnapshot: () => this.prepareSave(this.save),
        scene: () => ({ id: this.scenes.here, name: sceneTitle(this.def) }),
        newGame: () => this.newGame(),
        continueGame: () => this.continueGame(undefined, true),
        hasSave: () => this.hasSave(),
        quit: () => host.onExit(),
        // the city map lives in the menu too (TAB and M still open it on a keyboard)
        ...(can('map') ? { map: () => this.showMap() } : {}),
        onClose: () => {
          this.syncEnginePause();
          this.canvas.focus();
        },
        ...(sudoOn() ? { levels, enter: (id: string) => this.enterLevel(id) } : {}),
        // the deck's JOBS, CARRY, CONTROLS (and TERM on touch); the Shift prototype keeps SYSTEM only
        ...(can('deck') ? { deck: this.deckData() } : {}),
      },
      this.touch,
    );
    // sudo: the time control over the title's sunrise, the glide and cutscenes (transport.ts); in a scene, the city clock's
    if (sudoOn()) {
      this.transport = new Transport(host.windowEl);
      this.clockBar = new ClockBar(
        host.windowEl,
        () => sceneClimate(this.scenes.here, this.world.source),
        () => StoryTransitions.syncClock(this.storyTransitionsPort, true),
        () => this.world.source,
      );
    }
    // the city clock: the save's, and what every scene's conditions read of the city (engine/model.ts CITY)
    city.bind(this.save.clock);
    CITY.read = (key, scene) =>
      key === 'weather' ? this.weatherOf(scene).kind : key === 'hour' ? city.hour : city.day;
    CITY.when = (w) => city.within(w);
    // the footer's timestamp shows the city's time while the game runs (render.tsx hides the page's UTC clock)
    const stampHost = host.footer.querySelector('.footer-timestamp');
    this.stampEl = document.createElement('span');
    this.stampEl.id = 'game-clock';
    stampHost?.appendChild(this.stampEl);
    // a click or tap during the title's sunrise skips to the settled shot (on click, not pointerdown:
    // the menu comes up under the finger, and the release must not land on it)
    this.canvas.addEventListener('click', () => {
      if (
        this.presentation.opening &&
        !this.presentation.opening.gliding &&
        !this.presentation.opening.risen
      )
        this.skipRise();
    });
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e, true));
    this.canvas.addEventListener('pointermove', (e) => this.onCanvasPointer(e, false));
    // hack vision: drag pans, pinch and the wheel zoom (visionPointer)
    const lift = (e: PointerEvent) => Camera.visionLift(this.cameraPort, e);
    this.canvas.addEventListener('pointerup', lift);
    this.canvas.addEventListener('pointercancel', lift);
    this.canvas.addEventListener('wheel', (e) => Camera.visionWheel(this.cameraPort, e), {
      passive: false,
    });

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
    // Downtown is already the initial scene, so starting there does not call enter().
    this.p.x = this.def.spawn;
    // a private Play's train: boarded and run to the state its fixture asks for, on the car's own movers
    if (metroStart) StoryTransitions.startMetro(this.storyTransitionsPort, metroStart);
  }

  /**
   * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
   * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
   */
  hostOf(id: SceneId): SceneHost {
    return ScenesMethods.hostOf(this, id);
  }

  /** A scene's lines in the deck that buzz (Downtown's ACCESS DENIED and friends), as the old terminal did. */
  buzzPrint(text: string, kind?: LineKind) {
    return ScenesMethods.buzzPrint(this, text, kind);
  }

  /** The scene the player is in: its definition, and its host on the engine. */
  get def(): SceneDef {
    return this.sceneDefinition(this.scenes.here);
  }
  get zh(): SceneHost {
    return this.hostOf(this.scenes.here);
  }
  /** A joined owner's ordinary popup/conversation keeps its own input until it closes. */
  get interactionHost(): SceneHost {
    const here = this.zh;
    if (here.overlayOpen || here.popupOpen || here.acknowledgmentPending || here.visionOn)
      return here;
    for (const z of this.scenes.joinedZones) {
      const host = this.scenes.hosts.get(z.id);
      if (
        host &&
        (host.overlayOpen || host.popupOpen || host.acknowledgmentPending || host.visionOn)
      )
        return host;
    }
    const ride = this.scenes.level?.state.vehicle;
    const vehicle =
      ride &&
      (this.scenes.level!.source.vehicleBase ?? this.scenes.level!.source).vehicles?.find(
        (v) => v.id === ride.id,
      );
    const owner = vehicle && !vehicle.lift ? vehicle.zone : undefined;
    if (owner && owner !== this.scenes.here) {
      const host = this.hostOf(owner as SceneId);
      if (host) return host;
    }
    return here;
  }
  /** Scene hosts keep local coordinates even when their vehicle is in another zone. */
  hostPlacement(host: SceneHost) {
    return ScenesMethods.hostPlacement(this, host);
  }
  /** The one player, expressed in each resident model's local coordinates for its native zones. */
  syncPlayerLocations() {
    return StateMethods.syncPlayerLocations(this);
  }

  /** Write current progress, refresh the HUD and evaluate source-authored persistence triggers. */
  persist() {
    return StateMethods.persist(this);
  }

  /** Pause puzzle time wherever a full-screen interruption holds the world. Wall-clock locks still expire. */
  get enginesPaused() {
    return (
      !this.timing.running ||
      (!!this.presentation.opening &&
        (!this.presentation.opening.gliding || (this.transport?.rate ?? 1) === 0)) ||
      (!!this.menu?.open && !this.presentation.opening?.gliding) ||
      (!!this.presentation.cut &&
        (!this.presentation.cut.scene.liveWorld || (this.transport?.rate ?? 1) === 0)) ||
      !!this.presentation.mapView ||
      !!this.presentation.netView
    );
  }

  syncEnginePause() {
    return StateMethods.syncEnginePause(this);
  }

  // ---------- lifecycle ----------

  /**
   * Start the game. `title`: launching it (the Konami code, `?play` or `?sudo` without a scene):
   * the title screen first (title/). A scene, a cutscene or a LOAD GAME reload goes straight there.
   */
  start(scene?: SceneId | CutsceneId, title = false, spawn?: number, entrance?: string) {
    return RunMethods.start(this, scene, title, spawn, entrance);
  }

  /** Starting placement uses the entered chunk's actual floor or occupied vehicle. It is never
   * reapplied on Continue; both authored New Game and private Play use this arrival operation. */
  placeStartingPlayer(spawn: number | undefined) {
    return RunMethods.placeStartingPlayer(this, spawn);
  }

  /**
   * Into the save (the title's CONTINUE, or a start in a scene). A save in the middle of the
   * saved scene takes precedence; an unstarted run follows the authored story destination.
   */
  continueGame(scene: SceneId | undefined, first: boolean, entrance?: string, spawn?: number) {
    return RunMethods.continueGame(this, scene, first, entrance, spawn);
  }

  /** Is there a run to continue: a stored save that has been played? */
  private hasSave() {
    return RunMethods.hasSave(this);
  }

  // ---------- the opening: the title screen and the glide (title/) ----------

  /** The launch coast pauses simulation; confirmed New Game direction runs the real world. */

  /** Sudo's time control (transport.ts); null without `?sudo`. */
  transport: Transport | null = null;

  /**
   * The title screen: the sun comes up out of the sea, then the main menu pops in over it
   * (`stepOpening`; reduced motion: settled, menu up at once). `gliding`: straight into the glide
   * from the settled shot (NEW GAME from the pause menu).
   */
  showTitle(gliding = false, launchWorkflow = true) {
    return RunMethods.showTitle(this, gliding, launchWorkflow);
  }

  /** Any key or click while the sun comes up: the settled shot, and the menu with it. */
  private skipRise() {
    return RunMethods.skipRise(this);
  }

  endTitle(completed = false) {
    return RunMethods.endTitle(this, completed);
  }

  sequenceSource(id: string) {
    return RunMethods.sequenceSource(this, id);
  }
  beginSequenceActions(id: string) {
    return RunMethods.beginSequenceActions(this, id);
  }
  sequenceActions(time: number, mode: Parameters<typeof advanceSequenceCommands>[4] = 'play') {
    return RunMethods.sequenceActions(this, time, mode);
  }

  directOpeningWorld() {
    return RunMethods.directOpeningWorld(this);
  }
  directWorld(
    documents: OpeningDocuments,
    id: string,
    time: number,
    ambient: number,
    pinClock: boolean,
  ) {
    return RunMethods.directWorld(this, documents, id, time, ambient, pinClock);
  }

  stepOpening(dt: number) {
    return RunMethods.stepOpening(this, dt);
  }

  /**
   * Prepare the fresh run and its authored Harbor player before the first glide frame.
   */
  initializeNewRun() {
    return RunMethods.initializeNewRun(this);
  }
  /** Complete direction over the existing run: no save/model replacement or camera refit. */
  openingDone() {
    return RunMethods.openingDone(this);
  }

  /** Release the initialized world, whether it began with direction or directly in play. */
  releaseNewRun() {
    return RunMethods.releaseNewRun(this);
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  greet() {
    return RunMethods.greet(this);
  }

  checkpoint() {
    return RunMethods.checkpoint(this);
  }

  /** Detached diagnostics for editor inspection; no mutable runtime references. */
  inspect() {
    return FrameMethods.inspect(this);
  }

  stop() {
    return RunMethods.stop(this);
  }

  onResize() {
    return FrameMethods.onResize(this);
  }

  /** The level width the view was fitted to; a new place refits (see onResize). */

  loop(now: number) {
    return FrameMethods.loop(this, now);
  }

  /** Readability stops while another surface covers the world; simulation clocks keep their own policy. */
  get communicationCovered() {
    return (
      document.hidden ||
      this.menu.open ||
      !!this.presentation.opening ||
      !!this.presentation.cut ||
      !!this.presentation.mapView ||
      !!this.presentation.netView ||
      !!this.presentation.flight ||
      this.presentation.showEnd ||
      !!this.presentation.sleep ||
      this.term.isOpen ||
      !!this.interactionHost.overlayOpen
    );
  }

  stepLoop(now: number) {
    return FrameMethods.stepLoop(this, now);
  }

  // ---------- input ----------

  onKeyDown(e: KeyboardEvent) {
    return InteractionMethods.onKeyDown(this, e);
  }

  onKeyUp(e: KeyboardEvent) {
    return InteractionMethods.onKeyUp(this, e);
  }

  openDeck() {
    return InteractionMethods.openDeck(this);
  }

  /** The machine the deck talks to: the scene's device whose schematic is open, else the one you stand at. */
  termMachine(): string | null {
    return InteractionMethods.termMachine(this);
  }

  /** Overlays, the deck, travel and talk hold the level's ↑/↓ as they hold walking. */
  levelLocked() {
    return ScenesMethods.levelLocked(this);
  }

  private jump() {
    return ScenesMethods.jump(this);
  }

  // ---------- the deck (menu.ts; SYSTEM is the former pause menu) ----------

  menu: Menu;

  /** Esc with nothing else open: pause and show the menu. Progress is written first. */
  private openMenu() {
    return HudMethods.openMenu(this);
  }

  /**
   * Confirmed world-mode New Game initializes the run before direction starts. Completion releases
   * the same live Harbor models. Private editor Play instead resets its isolated checkpoint realm.
   */
  newGame() {
    return RunMethods.newGame(this);
  }

  notify(text: string, tone: import('../ui/communication').MessageTone = 'info') {
    return HudMethods.notify(this, text, tone);
  }
  flash(text: string) {
    return HudMethods.flash(this, text);
  }

  get levelW() {
    return this.def.width;
  }
  /**
   * E at a level barrier (engine/level.ts `LevelBarrier`): a phase rule for it (story-rules.ts `barrierPhaseRule`) runs as an exit's; else
   * its rule over the save (world/access.ts `barrierAccess`) refuses with its words, or it opens and stays open on this save
   * (`Save.barriers`, by scene). `granted`: a phase rule's beat is over. False: the prompt is not a barrier's.
   */
  /** Each lift reads its own zone's movers. */
  readonly movers: Movers = (zone) =>
    zone && zone !== this.scenes.here && this.hasScene(zone)
      ? (this.scenes.mobiles.get(zone)?.model ?? this.hostOf(zone).model)
      : this.zh.model;
  get spanW() {
    const [lo, hi] = SceneLifecycle.worldSpan(this.sceneLifecyclePort);
    return hi - lo;
  }
  /** A joined zone in this frame: its own view (the camera moved by where it lies), scene, host and light. */
  private zoneFrame(z: ScenePlacement, camera: CameraProjection = this.camera): ZoneFrame {
    return FrameMethods.zoneFrame(this, z, camera);
  }
  /** The scene's name, for the HUD and the canvas label. */
  get placeName() {
    return this.def.name;
  }
  get platforms() {
    return this.def.platforms ?? [];
  }

  /**
   * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
   * The companion comes along where it follows you, or is at home; the first visit has the player say a few words.
   */
  enter(id: SceneId, quiet = false, at?: string, announce = true) {
    return ScenesMethods.enter(this, id, quiet, at, announce);
  }

  /** Arrival speech belongs to scene source; an occupied vehicle can defer it until alighting. */
  introduceScene() {
    return ScenesMethods.introduceScene(this);
  }

  /** Tap or click a thing to open its popup (in hack vision: its verbs); hovering lights it up. A tap on the scene's life within reach is E on it. */
  private onCanvasPointer(e: PointerEvent, press: boolean) {
    return InteractionMethods.onCanvasPointer(this, e, press);
  }

  private deviceAt(x: number, h: number) {
    return InteractionMethods.deviceAt(this, x, h);
  }

  /** Canvas world units (the view, after the pixel scale) → CSS px of the game view. */
  get cssScale() {
    return (this.camera.k * this.canvas.clientWidth) / (this.canvas.width || 1);
  }

  /** The heads of the people on screen (the scene's, Downtown's street people and the fixer), CSS px. */
  heads() {
    return FrameMethods.heads(this);
  }

  /** Hack vision hangs in the world: give the scene this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  followHost() {
    return ScenesMethods.followHost(this);
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    return FrameMethods.ctx(this);
  }

  syncHud() {
    return HudMethods.syncHud(this);
  }

  /**
   * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
   * people, the devices and the scene's own targets on the engine, the scene's life, and the companion.
   */
  targets(): Target[] {
    return InteractionMethods.targets(this);
  }

  nearest(): Target | null {
    return InteractionMethods.nearest(this);
  }

  /** What the HUD's hint lane drew last (the probe reads it; nothing else does). */

  /** `?probe` / `?sudo`: a read-only snapshot of the story for scripts (scripts/opening-playthrough). It writes nothing and advances nothing. */
  private probeFrame() {
    return FrameMethods.probeFrame(this);
  }

  say(name: string, pages: string[], x: number, h: number) {
    return InteractionMethods.say(this, name, pages, x, h);
  }

  completeConversation(
    cue: NonNullable<import('../engine/gameplay/conversation').ConversationFrame['completion']>,
  ) {
    return InteractionMethods.completeConversation(this, cue);
  }

  /** Completion belongs to advancing the final page; replacing or abandoning a bubble cancels it. */
  private dialogueCompletion(
    cue: import('../engine/gameplay/conversation').ConversationFrame['completion'],
  ) {
    return InteractionMethods.dialogueCompletion(this, cue);
  }

  update(dt: number) {
    return FrameMethods.update(this, dt);
  }

  /** The companion is drawn at home (`companion.mode: home`), and where it follows you (`along`) once its flag is set (companion-source.ts). */
  get companionPresent() {
    const gameplay = this.scenes.gameplaySessions.get(this.scenes.here);
    return companionHere(
      this.def,
      gameplay?.state() ?? this.gameplayStatePort().read(),
      this.companionDoc,
      gameplay?.queryContext() ?? {
        definition: this.def.gameplay ?? this.sources?.companionGameplay ?? COMPANION_GAMEPLAY,
      },
    );
  }

  // ---------- drawing ----------

  sx(worldX: number, parallax = 1) {
    return FrameMethods.sx(this, worldX, parallax);
  }
  y(h: number) {
    return FrameMethods.y(this, h);
  }

  /**
   * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
   * the scene has them (`ambient`), the scene's own drawing, the player and the companion, the scene's
   * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
   * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
   * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
   */
  draw() {
    return FrameMethods.draw(this);
  }

  /**
   * This frame's light for the scene on screen (light.ts): its facing, outdoors or in, the weather
   * (indoors: the district's, for what the windows show). Sets it for characters and sets to read,
   * and works out the shade bands and the lamps for night shadows.
   */
  private lightHere(W: Weather | null): Light {
    return FrameMethods.lightHere(this, W);
  }

  /** The ground under the player at world x (a ledge they are over, or the street): where their shadow lies. */
  private groundUnder(wx: number, h: number) {
    return FrameMethods.groundUnder(this, wx, h);
  }

  /**
   * The weather a scene has now: its district's (weather.ts). Dawn, before you are deleted, is
   * dry whatever the forecast says ("Rain's late today": the opening is scripted).
   */
  weatherOf(scene: string): Weather {
    return FrameMethods.weatherOf(this, scene);
  }
  weatherHere() {
    return FrameMethods.weatherHere(this);
  }

  /**
   * The bars follow the mode (render.tsx): walking (arrows; HACK, JMP, ACT, DECK) or hack vision
   * (EXIT, BOARD, LOGIC, UNFOLD), as classes on the page; HACK only once hacking is yours here.
   */
  syncModeUi() {
    return HudMethods.syncModeUi(this);
  }

  /** The list menu beside the lift car is showing (the car's own prompt steps aside), and the player closed it (Esc): it stays shut until they use the panel's keys again or leave the car. */

  /**
   * In a lift car the floors are a list menu beside it (engine/popup.ts 'list', through the scene's host), not a floating
   * prompt: it reflects the panel (engine/level.ts `levelLiftList`: `ride.pick` is its one state), ↑ ↓ move the choice
   * as `levelUp`/`levelDown` do, a row or E sends the car through `levelInteract`; stepping out closes it.
   */
  syncCarList() {
    return HudMethods.syncCarList(this);
  }

  /** The last `level-up`/`level-down` pair set on the page (syncLevelArrows). */

  /**
   * Touch's ▲ ▼ (ui/touch-controls.ts) keep their places in a level scene (`html.level-scene`) and show only while
   * ↑ or ↓ does something there (`html.level-up`, `html.level-down`; render.tsx): the rule the keys follow
   * (engine/level.ts `levelArrows`). Elsewhere the bar is as it was.
   */
  syncLevelArrows() {
    return HudMethods.syncLevelArrows(this);
  }

  // ---------- the camera nudge ----------

  /** The camera leaning towards something that reacted off the view: where it leans to, until when (clock frames), where you stood. */

  /** Coming back from a nudge: the camera eases gently until it is on you again. */

  /** When the last nudge started (clock frames), and what has drawn the eye already this visit (`from|line`). */

  nudged = new Set<string>();

  /**
   * Something said it reacted (`from`, with a line in green or red). If it is off the view but
   * near, the camera leans that way for a moment so you see it happen, keeping you in view; the
   * ping (an edge arrow) already points at anything further. Never during a conversation, the deck
   * or a panel, never while you walk, never with reduced motion; each thing and line once a visit,
   * and not more often than every few seconds.
   */
  nudgeTo(from: string, text: string, tone?: string) {
    return HudMethods.nudgeTo(this, from, text, tone);
  }

  /**
   * What hack vision's LOGIC drawer lists: modules, programs and the key chips that do something.
   * Not tokens and not what you carry (Tommi, 2026-10-15): those show where they are used (a price
   * on the prompt, "show the maglev pass" in the brake's popup) and in the deck's CARRY tab.
   */
  owned(): [string, string] {
    return StateMethods.owned(this);
  } // ---------- the deck's tabs and the control hints ----------

  /** The current goal as the HUD shows it (the scene's, the opening's, the library's, or the data's next). */
  goalText(): string | null {
    return HudMethods.goalText(this);
  }

  /** What the deck's JOBS, CARRY, CONTROLS (and TERM on touch) tabs read (ui/menu.ts). */
  private deckData(): DeckData {
    return HudMethods.deckData(this);
  }

  /** Every key that is yours now, grouped (the deck's CONTROLS tab). Touch names its buttons instead. */
  controls() {
    return HudMethods.controls(this);
  }
  /**
   * The controls, taught once in the hint lane (what the key bar's labels used to say): walking, then
   * using, then the deck; hack vision's keys the first time it is open. Each stays until you have done it.
   * Touch buttons are labelled, so touch only gets the deck and hack vision.
   */
  controlHints(vision: boolean) {
    return HudMethods.controlHints(this, vision);
  }

  ownLine() {
    return HudMethods.ownLine(this);
  }

  /** What you own, as a set of words, to see what came (or went) since the last frame. */

  checkGain() {
    return StateMethods.checkGain(this);
  }

  // ---------- the opening (opening.ts) ----------
  // The opening is story data (story/opening.json) plus each scene's `phases` (scene.json): the save's flags pick the phase
  // (story/story-rules.ts holds the pure rules; this loop applies them: gates, cards, triggers, the clock pin, the attention ping).

  get story(): OpeningState {
    return this.openingStory.openingState(this.save.flags);
  }
  /** Who you are in the HUD and your bubbles: a harbor worker while you still exist, then your handle (or "ghost"). */
  get me() {
    const fixed = playProfile().player.name;
    if (fixed !== undefined) return fixed;
    return this.openingStory.persona(this.save.flags)?.name ?? who(this.save);
  }
  /** The city clock, after the scene's name in the HUD (" · WED 21:40"). */
  get clockText() {
    return playProfile().chrome.minimalHud ? '' : ' · ' + city.stamp;
  }

  /** When the player last moved or did something (clock frames), for the attention ping. */

  /** Where the attention ping points when it is not a device (world x): the scene's 'goal' speaker. */

  /** A checkpoint gate taking its time (story-rules.ts `GateRule`): when it started, where it stands, and where the player goes once it says ok. */

  /**
   * A card transition (story-rules.ts `CardSpec`; the opening's sleep, or "wait until…" at a bench or the bed): when the fade started,
   * the card (timings, the two clock readings, the label, and the cues that run in the dark `mid`, once: `woke`, and once it is light again `end`).
   */

  /** Presentation timestamps use the existing pausable story clock and clear with transitions. Counts and progression live in ordinary gameplay state. */

  /** Scratch callbacks belong to this run; disposal never acknowledges or completes them. */
  cancelStoryTransitions() {
    return RunMethods.cancelStoryTransitions(this);
  }

  /** A run configuration references one complete authored starting situation. */
  startNewRun() {
    return RunMethods.startNewRun(this);
  }

  /** Sudo's LEVELS: the opening from one of its points (opening.json `OPENING_LEVELS`), its scenes started over. */
  openingFrom(level: { flags: string[]; reset?: string[]; end?: string }) {
    return RunMethods.openingFrom(this, level);
  }

  /** The Train scene's movers: the ride lives there (world/transport/line.ts reads it). */
  get ride() {
    return this.hostOf(this.world.TRANSPORT.boarding.scene as SceneId).model.movers;
  }

  // ---------- the city clock (clock.ts): when it runs, the opening's pins, waiting ----------

  /** Sudo's city clock bar (transport.ts); null without `?sudo`. */
  clockBar: ClockBar | null = null;
  /** The footer's timestamp in game mode (WED 21:40), and what it and the HUD showed last. */
  private stampEl: HTMLElement;

  // ---------- cutscenes (cutscenes/) ----------
  // While one plays, the scene's update and draw are skipped entirely; any key or tap skips it.

  /** A cutscene a story beat asked for, waiting for the screen to be free. */

  /**
   * Contacts on your deck (contacts.ts): after a story beat, say what came in. The messages stay
   * unread until `msg <contact>` in the deck.
   */
  inbox() {
    return InteractionMethods.inbox(this);
  }

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's authored destination. Story triggers
   * use after-handoff so their postlude follows travel, retaining a same-scene native interlude.
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(
    id: CutsceneId | string,
    then?: () => void,
    continuation: 'replace' | 'after-handoff' = 'replace',
    initial?: { time: number; receipts: readonly string[] },
  ) {
    return CutscenesMethods.playCutscene(this, id, then, continuation, initial);
  }

  /** Start an already reconstructed situation through the normal playback owners.
   * Loading it is not New Game and never invokes preceding sequence commands a second time. */
  startCheckpointDirection(start: { id: string; time: number; receipts: readonly string[] }) {
    return CutscenesMethods.startCheckpointDirection(this, start);
  }

  stepCutscene(dt: number) {
    return CutscenesMethods.stepCutscene(this, dt);
  }

  /** Stop the cutscene; `andThen` runs what comes after it (false when the game stops mid-scene). */
  endCutscene(andThen: boolean) {
    return CutscenesMethods.endCutscene(this, andThen);
  }

  /** Sudo's LEVELS: play a cutscene (then its next scene), or arrive in a scene at its spawn. */
  private enterLevel(id: string) {
    return ScenesMethods.enterLevel(this, id);
  }

  /** Arrive in a scene by id (anything else is Downtown), at its spawn. */
  handTo(id: string, entrance?: string) {
    return CutscenesMethods.handTo(this, id, entrance);
  }

  // ---------- a scene's ways out and its life ----------

  /**
   * A scene's ways out as E targets: its doors, stairs and pads (an open border is walked
   * into instead; one its code offers is an engine target). A platform's BOARD is one
   * target at each of the train's doors, only while it stands there with them open.
   */
  exitTargets(s: SceneDef): Target[] {
    return InteractionMethods.exitTargets(this, s);
  }
  /**
   * A scene's life as E targets: readables, uses, the people who talk, and the animals
   * (cats to pet, pigeons to shoo) and robots. E on one runs `useLife`.
   */
  /** The floor a use or readable is offered on: in a scene with levels, the floor under where it answers (a mezzanine's machine); else the street. */
  promptFloor(s: SceneDef, x: number, h: number | undefined) {
    return InteractionMethods.promptFloor(this, s, x, h);
  }
  lifeTargets(s: SceneDef, host = this.zh, owner = this.scenes.here): Target[] {
    return InteractionMethods.lifeTargets(this, s, host, owner);
  }

  /** What a use costs now (0: nothing to pay this time). */

  /** Use an authored scene exit, taxi or map. Physical vehicle transfers belong to the level. */

  /** The scene view, refreshed for this frame. */
  private view(camera: CameraProjection = this.camera): SceneView {
    return ScenesMethods.view(this, camera);
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a scene, landing at its exit `at` there. */
  travel(id: SceneId, at?: string) {
    return ScenesMethods.travel(this, id, at);
  }

  /** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    return ScenesMethods.walkOff(this, edge);
  }

  /** Remember a scene for the city map: `flags['seen:<scene>']`. */
  markSeen(id: SceneId) {
    return ScenesMethods.markSeen(this, id);
  }

  /** The taxi answers at its stand; an unavailable anchor falls back to system feedback. */
  driverReply(pages: string[]) {
    return InteractionMethods.driverReply(this, pages);
  }

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    return InteractionMethods.hailTaxi(this);
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    return MapMethods.showMap(this);
  }

  /** True while the city map is open. */
  get mapOpen() {
    return !!this.presentation.mapView;
  }

  private mapKey(e: KeyboardEvent) {
    return MapMethods.mapKey(this, e);
  }

  /** Do what the map asks: close, a sound, quick travel to a place, a taxi to a stand. */
  mapAct(a: MapAct) {
    return MapMethods.mapAct(this, a);
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  mapState(): MapState {
    return MapMethods.mapState(this);
  }

  /** The phone's ESC button, which stays over the open map, in view units (null when it is not shown). */
  mapAvoid() {
    return MapMethods.mapAvoid(this);
  }

  /** The pointer on the open map (citymap.ts reads it: districts, places, pads, back, outside). */
  private mapPointer(e: PointerEvent, press: boolean) {
    return MapMethods.mapPointer(this, e, press);
  }

  // ---------- the net map (netmap.ts, NET.md) ----------

  /** NET is yours: scan.so owned, and hacking yours (not in the opening's locked part). */
  get netOk() {
    return capabilityView(this.save, this.hackStages(), this.networkContext.net).network;
  }

  /** A program came (scan.so from the library): saved, and NET shows in hack vision's bar, pinging until used. */
  grantProgram(id: string, receipt?: FeedbackReceipt) {
    return NetMethods.grantProgram(this, id, receipt);
  }

  /**
   * N or NET: the net map, full screen. Opening it is a scan from where you are plugged in (scan.so):
   * the networks you reach go into the save as found, the nodes in reach onto the board as silhouettes.
   */
  showNet() {
    return NetMethods.showNet(this);
  }

  closeNet(back = this.presentation.netBack) {
    return NetMethods.closeNet(this, back);
  }

  /** A machine's name, from the scene file (or net.json) that has it. */
  machineName(m: MachineData) {
    return NetMethods.machineName(this, m);
  }

  /** What the net map draws from: the networks you reach from here, those found, each machine's state from here. */
  netState(): NetState {
    return NetMethods.netState(this);
  }

  private netKeyDown(e: KeyboardEvent) {
    return NetMethods.netKeyDown(this, e);
  }

  private netPointerAt(e: PointerEvent, press: boolean) {
    return NetMethods.netPointerAt(this, e, press);
  }

  /** Do what the net map asks: close, or a machine picked (onto the board, or why not). */
  netAct(a: NetAct) {
    return NetMethods.netAct(this, a);
  }

  /** The deck's `scan`: what you reach from where you are plugged in (needs scan.so). */
  deckScan() {
    return NetMethods.deckScan(this);
  }

  /** The deck's `connect <machine>` (by id or name): onto the board, and the deck talks to it from then on. */
  deckConnect(name: string) {
    return NetMethods.deckConnect(this, name);
  }

  /** The GOAL after Capsule 7B, until scan.so is yours: the library (Act I: Capsule 7B → the library → Downtown). */
  libraryGoal(): string | null {
    return NetMethods.libraryGoal(this);
  }

  /** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
  drawMap() {
    return MapMethods.drawMap(this);
  }
}

/**
 * The camera nudge: how long it leans towards an event (clock frames, ~1.6 s), how gently it moves
 * (ease per frame, against the follow's 0.12), the margin kept round the event and the player (world
 * units), and the least time between two nudges (frames, ~5 s).
 */

/** Hack vision zooms out at least this far, even where the scene already fits the view (room over its devices for the circuits). */

/** The least street the view shows across (world units); a squarish window drops a scale step to keep it. */

/** …but never by making the view taller than this (world units). */

/** How often the clock's progress is written to the save while it runs (frames, ~10 s). */

/** A minute of the day as HH:MM (any number of minutes on). */
