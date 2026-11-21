/** Game: start, title, New Game and Continue, opening direction and checkpoints. */
import { checkpointSequenceState } from '../../world/checkpoint-state';
import { matches } from '../../engine/gameplay/queries';
import { advanceSequenceCommands } from '../sequence-commands';
import type { OpeningDocuments } from '../../story/title/documents';
import { sequenceWorldLayout } from '../prepare-frame';
import { changedWorldChunks } from '../world-composition';
import * as StoryTransitions from '../story-transitions';
import * as Camera from '../camera';
import * as SceneLifecycle from '../scene-lifecycle';
import { COMPANION_GAMEPLAY } from '../../engine/gameplay/companion-conversations';
import { perfBegin, perfEnd, performanceRecording } from '../diagnostics/performance';
import { mountPerformancePanel } from '../diagnostics/performance-panel';
import { mountReviewNavigator } from '../../demo/review-navigator';
import { reviewStations } from '../../demo/review-stations';
import { gameStorage, reloadRuntime } from '../storage';
import { saveVehicle, restoreVehicle } from '../../engine/level-vehicles';
import { SCENES, type SceneDef, type SceneId } from '../../scenes/index';
import { arrivalFor } from '../../story/story-rules';
import { isCutsceneId, type CutsceneId } from '../../story/cutscenes/index';
import { Opening } from '../../story/title/index';
import { unlockAll } from '../../ui/sudo';
import { city } from '../../world/clock';
import { light } from '../../world/light';
import { setOverride } from '../../world/weather';
import { sound } from '../audio';
import { EDITOR_PLAY } from '../mode';
import { startCheckpoint, can, playProfile, saveKey, sudoOn } from '../play-profile';
import { newSave, type Save } from '../save';
import { levelArrive, savedForLevel } from '../../engine/level';
import { placeFrom } from '../../world/zone-graph';
import type { Game } from '../game';

// ---------- lifecycle ----------

/**
 * Start the game. `title`: launching it (the Konami code, `?play` or `?sudo` without a scene):
 * the title screen first (title/). A scene, a cutscene or a LOAD GAME reload goes straight there.
 */
export function start(
  game: Game,
  scene?: SceneId | CutsceneId,
  title = false,
  spawn?: number,
  entrance?: string,
) {
  game.canvas.hidden = false;
  game.canvas.tabIndex = 0;
  game.onResize();
  window.addEventListener('keydown', game.onKeyDown);
  window.addEventListener('keyup', game.onKeyUp);
  window.addEventListener('resize', game.onResize);
  game.syncHud();
  game.disposePerformance ??= mountPerformancePanel(game.host.windowEl, () => ({
    scene: game.scenes.here,
    clock: { ...game.save.clock },
    weather: game.weatherHere().kind,
    camera: game.camera.cam,
    scale: game.camera.k,
    hostedScenes: [...game.scenes.hosts.keys()],
    actors: game.def.people?.length ?? 0,
    devices: game.zh.model.data.devices.length,
  }));
  game.timing.running = true;
  game.timing.last = 0;
  game.timing.raf = requestAnimationFrame((n) => game.loop(n));
  game.canvas.focus();
  if (scene && isCutsceneId(scene)) {
    game.playCutscene(scene);
    return;
  }
  if (title) {
    game.showTitle();
    return;
  }
  const first = !game.timing.started;
  game.timing.started = true;
  game.continueGame(scene && game.hasScene(scene) ? scene : undefined, first, entrance, spawn);
  const initial = game.host.initialCamera;
  if (first && initial?.scene === game.scenes.here) {
    game.camera.cam = initial.x;
    game.camera.camH = initial.h;
    game.camera.gy = game.camera.gyBase + initial.h;
  }
  if (game.reviewAllowed() && !game.reviewNav) {
    const stations = reviewStations(game.content, game.reviewDoc);
    if (stations.length)
      game.reviewNav = mountReviewNavigator(game.host.windowEl, {
        stations,
        actions: game.reviewDoc.actions,
        hint: game.reviewDoc.hint,
        open: !EDITOR_PLAY,
        communication: can('review') ? (id) => game.reviewCommunication(id) : undefined,
        jump: (id) => game.reviewJump(id),
        run: (a) => game.reviewRun(a),
      });
    game.refreshReview();
  }
}

/** Starting placement uses the entered chunk's actual floor or occupied vehicle. It is never
 * reapplied on Continue; both authored New Game and private Play use this arrival operation. */
export function placeStartingPlayer(game: Game, spawn: number | undefined) {
  if (spawn !== undefined) {
    if (!Number.isFinite(spawn) || spawn < 12 || spawn > game.def.width - 12)
      throw Error('Starting X is outside the scene');
    const vehicle = saveVehicle(game.scenes.level, game.p, game.scenes.here);
    if (vehicle && game.scenes.level) {
      if (!restoreVehicle(game.scenes.level, game.p, game.movers, { ...vehicle, x: spawn }))
        throw Error('Starting X has no vehicle floor');
    } else {
      game.p.x = spawn;
      if (game.scenes.level)
        game.scenes.level.state = levelArrive(
          game.scenes.level.source,
          game.p,
          game.def.spawnH ?? 0,
          SceneLifecycle.seenRooms(
            game.sceneLifecyclePort,
            game.scenes.level.source,
            game.scenes.here,
          ),
          savedForLevel(game.scenes.level.source, game.scenes.here, game.save.barriers),
        );
    }
    game.camera.cam = Camera.camFollow(game.cameraPort, game.p.x);
    game.camera.camH = game.p.y;
    game.camera.gy = game.camera.gyBase + Math.round(game.camera.camH);
  }
}

/**
 * Into the save (the title's CONTINUE, or a start in a scene). A save in the middle of the
 * saved scene takes precedence; an unstarted run follows the authored story destination.
 */
export function continueGame(
  game: Game,
  scene: SceneId | undefined,
  first: boolean,
  entrance?: string,
  spawn?: number,
) {
  const freshArrival = first && !game.save.scene;
  const vehicle = first && (!scene || scene === game.save.scene) ? game.save.vehicle : undefined;
  delete game.save.vehicle;
  const leavingLaunch = !!game.presentation.opening && !game.presentation.opening.gliding;
  game.endTitle();
  if (leavingLaunch && game.openingStory.WORKFLOWS.resume && !game.runOpeningWorkflow('resume'))
    throw Error('Launch resume workflow refused');
  // Continue an interrupted new-game direction through its authored skip completion, not by
  // replaying timeline frames or treating loading as a fresh trigger activation.
  const interrupted =
    game.save.sequenceActions && !game.save.sequenceActions.finished
      ? game.save.sequenceActions.sequence
      : undefined;
  const pendingDirection = interrupted
    ? (game.worldSequences[interrupted]?.sequence ??
      game.sequenceDocuments.opening.timeline.sequences.find(
        (s) => s.id === interrupted && s.id !== 'title',
      ))
    : undefined;
  if (pendingDirection && !game.sequenceActions(pendingDirection.duration, 'skip'))
    throw Error('Interrupted sequence completion refused: ' + pendingDirection.id);
  const pendingOpening =
    pendingDirection &&
    game.sequenceDocuments.opening.timeline.sequences.some((s) => s.id === pendingDirection.id);
  if (freshArrival && !scene) {
    game.startNewRun();
    return;
  }
  const { routes } = playProfile(),
    start = startCheckpoint();
  if (routes === 'content')
    scene =
      scene && game.content[scene]
        ? scene
        : game.save.scene && game.content[game.save.scene as SceneId]
          ? (game.save.scene as SceneId)
          : (start.scene as SceneId);
  game.timing.started = true;
  const resume =
    !scene && first ? game.openingStory.openingResumeDestination(game.save.flags) : null;
  let resumeEntrance: string | undefined = entrance;
  if (pendingDirection && !pendingOpening && pendingDirection.handoff) {
    scene = pendingDirection.handoff.scene as SceneId;
    resumeEntrance = pendingDirection.handoff.entrance;
  }
  if (!scene && first && game.save.scene && game.resumable(game.save.scene))
    scene = game.save.scene as SceneId;
  else if (resume && game.hasScene(resume.scene)) {
    scene = resume.scene;
    resumeEntrance = resume.entrance;
  }
  if (first && !game.save.scene && scene && scene === start.scene && !resumeEntrance)
    resumeEntrance = start.entrance;
  if (scene && (game.scenes.here !== scene || resumeEntrance))
    game.enter(scene, true, resumeEntrance);
  game.placeStartingPlayer(
    spawn ??
      (freshArrival && game.scenes.here === start.scene ? (start.spawn ?? undefined) : undefined),
  );
  if (
    vehicle &&
    game.scenes.level &&
    restoreVehicle(game.scenes.level, game.p, game.movers, vehicle)
  ) {
    game.camera.cam = Camera.camFollow(game.cameraPort, game.p.x);
    game.camera.camH = game.p.y;
    game.camera.gy = game.camera.gyBase + Math.round(game.camera.camH);
  }
  SceneLifecycle.showHosts(game.sceneLifecyclePort);
  game.markSeen(game.scenes.here);
  if (pendingOpening) game.introduceScene();
  game.greet();
}

/** Is there a run to continue: a stored save that has been played? */
export function hasSave(_game: Game) {
  try {
    const raw = gameStorage.getItem(saveKey());
    if (!raw) return false;
    const s = JSON.parse(raw) as Partial<Save>;
    return (s.playMs ?? 0) > 0 || Object.keys(s.flags ?? {}).length > 0;
  } catch {
    return false;
  }
}

/**
 * The title screen: the sun comes up out of the sea, then the main menu pops in over it
 * (`stepOpening`; reduced motion: settled, menu up at once). `gliding`: straight into the glide
 * from the settled shot (NEW GAME from the pause menu).
 */
export function showTitle(game: Game, gliding = false, launchWorkflow = true) {
  game.endCutscene(false);
  if (!game.scenes.level) {
    const saved = game.save.scene;
    game.enter(
      saved && game.resumable(saved) ? (saved as SceneId) : game.scenes.here,
      true,
      undefined,
      false,
    );
  }
  game.presentation.bubble = null;
  game.input.keys.clear();
  game.scenes.hosts.forEach((h) => {
    h.cancelAcknowledgment?.('dismissed');
    h.closeAll();
  });
  game.term.close();
  if (launchWorkflow && game.openingStory.WORKFLOWS.launch) {
    if (!game.runOpeningWorkflow('launch')) throw Error('Launch composition workflow refused');
    game.reconcileWorldEdits();
  }

  game.presentation.opening = new Opening(game.reduced, game.sequenceDocuments.opening, {
    scenes: { ...SCENES, ...game.content },
    get graph() {
      return game.zoneGraph;
    },
    citySource: game.world.source,
    get compositions() {
      void game.zoneGraph;
      return game.appliedWorldSource;
    },
    backdrops: game.sources.backdrops,
    model: (id) =>
      game.scenes.hosts.get(id as SceneId)?.model ?? game.scenes.mobiles.get(id as SceneId)?.model,
    get flags() {
      return game.save.flags;
    },
  });
  game.syncEnginePause();
  document.documentElement.classList.add('cutscene');
  game.host.setScene('ACCESS DENIED');
  game.canvas.setAttribute('aria-label', 'ACCESS DENIED: a sunrise over the sea');
  if (gliding) {
    game.menu.hide();
    game.newGame();
  } else if (game.presentation.opening.risen) game.menu.showTitle();
  else game.menu.hide();
}

/** Any key or click while the sun comes up: the settled shot, and the menu with it. */
export function skipRise(game: Game) {
  const o = game.presentation.opening;
  if (!o || o.gliding || o.risen) return;
  o.skipRise();
  game.menu.showTitle(true);
}

export function endTitle(game: Game, completed = false) {
  if (!game.presentation.opening) return;
  const directed = game.presentation.opening.gliding;
  if (directed && !completed)
    game.sequenceActions(game.presentation.opening.timeline.time(), 'cancel');
  game.presentation.opening = null;
  game.scenes.directedZones.clear();
  game.scenes.directedOrigin = undefined;
  if (!directed || !completed) {
    game.camera.viewW = game.canvas.width / game.camera.k;
    game.camera.viewH = game.canvas.height / game.camera.k;
    game.camera.camH = game.p.y;
    game.camera.gy = game.camera.gyBase + game.p.y;
    game.camera.cam = Camera.camFollow(game.cameraPort, game.p.x);
    SceneLifecycle.refreshWorldMembership(game.sceneLifecyclePort);
  }
  document.documentElement.classList.remove('cutscene');
  game.syncHud();
  game.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + game.placeName);
}

export function sequenceSource(game: Game, id: string) {
  return (
    game.worldSequences[id]?.sequence ??
    [
      ...game.sequenceDocuments.opening.timeline.sequences,
      ...game.sequenceDocuments.cinematics.timeline.sequences,
    ].find((s) => s.id === id)
  );
}

export function beginSequenceActions(game: Game, id: string) {
  const sequence = game.sequenceSource(id);
  if (
    sequence &&
    [sequence.commands, sequence.onComplete, sequence.onCancel].some((rows) => rows?.length)
  )
    game.save.sequenceActions = { sequence: id, receipts: [] };
  else delete game.save.sequenceActions;
}

export function sequenceActions(
  game: Game,
  time: number,
  mode: Parameters<typeof advanceSequenceCommands>[4] = 'play',
) {
  const run = game.save.sequenceActions;
  if (!run) return true;
  const sequence = game.sequenceSource(run.sequence);
  if (!sequence) throw Error('Unknown active sequence ' + run.sequence);
  const ok = advanceSequenceCommands(
    sequence,
    time,
    run,
    (command) => {
      // A previous command's pure additions are already safe and can be made available before
      // a later, independently deferred retirement. Never split one atomic edit batch.
      if (game.preparedWorldEdit) {
        void game.zoneGraph;
        if (
          !changedWorldChunks(
            game.appliedWorldSource!,
            game.preparedWorldEdit.result.source,
            game.worldCompositionContext,
          ).size
        )
          game.reconcileWorldEdits();
      }
      return (
        game.gameplayFor(command.scene as SceneId)?.dispatch(command.command, 'system').ok ?? false
      );
    },
    mode,
  );
  if (ok && ['complete', 'skip', 'cancel'].includes(mode)) {
    run.finished = true;
    game.persistSave();
  }
  return ok;
}

export function directOpeningWorld(game: Game) {
  const opening = game.presentation.opening!;
  game.directWorld(
    game.sequenceDocuments.opening,
    opening.gliding ? 'glide' : 'title',
    opening.timeline.time(),
    opening.t,
    opening.gliding,
  );
}

export function directWorld(
  game: Game,
  documents: OpeningDocuments,
  id: string,
  time: number,
  ambient: number,
  pinClock: boolean,
) {
  const width = game.canvas.width / game.camera.k,
    height = game.canvas.height / game.camera.k;
  const layout = sequenceWorldLayout(
    documents,
    id,
    time,
    {
      width,
      height,
      reduced: game.reduced,
      lighting: light(),
      ambientTime: ambient,
      playGround: game.camera.gyBase,
      scenes: { ...SCENES, ...game.content },
      graph: game.zoneGraph,
      compositions: game.appliedWorldSource,
    },
    game.camera.k,
  );
  const player = placeFrom(game.zoneGraph, layout.origin, Infinity).get(game.scenes.here) ?? {
    dx: 0,
    dh: 0,
  };
  game.scenes.directedOrigin = layout.origin;
  game.scenes.directedZones = new Set(layout.zones);
  game.camera.cam = layout.authoredCam - player.dx;
  game.camera.viewW = layout.width;
  game.camera.viewH = layout.height;
  game.camera.gy = layout.gy + layout.frame.camera.h - player.dh;
  game.camera.camH = game.camera.gy - game.camera.gyBase;
  SceneLifecycle.followResidency(game.sceneLifecyclePort);
  if (pinClock) {
    game.timing.t = ambient * 60;
    game.timing.clock = ambient * 60;
    city.pin(layout.minute);
  }
}

export function stepOpening(game: Game, dt: number) {
  const o = game.presentation.opening!;
  o.step((dt / 60) * (game.transport?.rate ?? 1));
  if (o.gliding) game.sequenceActions(o.timeline.time(), o.skipped ? 'skipping' : 'play');
  // the title's menu is up exactly while the sun has settled (sudo can seek back into the sunrise)
  if (!o.gliding) {
    if (o.risen && !game.menu.open) game.menu.showTitle(true);
    else if (!o.risen && game.menu.open) game.menu.hide();
  }
  game.transport?.sync();
  game.directOpeningWorld();
  const x = game.x;
  x.setTransform(game.camera.k, 0, 0, game.camera.k, 0, 0);
  x.imageSmoothingEnabled = false;
  // opt-in recording: the title's or the glide's beat owns the frame's render span
  const span = performanceRecording()
    ? perfBegin('game.render', o.gliding ? 'glide:' + o.beat : 'title')
    : -1;
  try {
    o.draw(
      x,
      game.canvas.width / game.camera.k,
      game.canvas.height / game.camera.k,
      game.camera.gyBase,
      light(),
    );
  } finally {
    perfEnd(span);
  }
  if (o.done) game.openingDone();
}

/**
 * Prepare the fresh run and its authored Harbor player before the first glide frame.
 */
export function initializeNewRun(game: Game) {
  game.cancelStoryTransitions();
  game.globalGameplaySession?.dispose();
  game.globalGameplaySession = undefined;
  game.scenes.hosts.forEach((h) => h.dispose());
  game.scenes.hosts.clear();
  for (const core of game.scenes.mobiles.values()) {
    core.gameplay?.dispose();
    core.model.dispose();
  }
  game.scenes.gameplaySessions.forEach((s) => s.dispose());
  game.scenes.gameplaySessions.clear();
  game.scenes.mobiles.clear();
  game.scenes.mobileOwners.clear();
  game.scenes.compiledScenes.clear();
  game.scenes.joinedZones = [];
  game.scenes.zoneTiers.clear();
  game.scenes.level = null;
  const fresh = newSave({
    scenes: Object.fromEntries(
      Object.entries({ ...SCENES, ...game.content }).filter(
        (entry): entry is [string, SceneDef] => !!entry[1],
      ),
    ),
    vocabulary: game.sources.checkpointVocabulary,
  });
  game.save = sudoOn() ? unlockAll(fresh) : fresh;
  city.bind(game.save.clock);
  game.compiledWorld = undefined;
  game.appliedWorldSource = undefined;
  game.preparedWorldEdit = undefined;
  game.camera.viewW = game.canvas.width / game.camera.k;
  game.camera.viewH = game.canvas.height / game.camera.k;
  game.term.clear();
  game.presentation.bubble = null;
  game.presentation.showEnd = false;
  game.presentation.stamps = {};
  game.hints.sceneChanged();
  sound.cancelFeedback();
  if (playProfile().routes === 'world' && !game.runOpeningWorkflow('home'))
    throw Error('New Game opening initialization refused');
  const start = startCheckpoint();
  game.clockMode = start.clock;
  setOverride('city', start.weather === 'forecast' ? null : start.weather);
  let direction: { id: string; time: number; receipts: string[] } | undefined;
  if (start.sequence) {
    const sequence = game.sequenceSource(start.sequence.id);
    const composition =
      sequence &&
      (game.worldSequences[sequence.id]?.composition ??
        game.sequenceDocuments.opening.compositions?.[sequence.composition] ??
        game.sequenceDocuments.cinematics.compositions[sequence.composition]);
    if (!sequence || !composition)
      throw Error('Missing starting checkpoint sequence ' + start.sequence.id);
    const result = checkpointSequenceState(
      game.save,
      start,
      sequence,
      composition,
      new Map<string, unknown>([
        ['world-compositions', game.worldCompositions],
        ['zone-graph', game.worldBaseGraph],
      ]),
      Object.fromEntries(
        Object.entries({ ...SCENES, ...game.content }).filter(
          (entry): entry is [string, SceneDef] => !!entry[1],
        ),
      ),
    );
    game.save = result.save;
    city.bind(game.save.clock);
    direction = result.sequence;
  }
  if (start.metro) StoryTransitions.startMetro(game.storyTransitionsPort, start.metro);
  game.enter(start.scene as SceneId, true, start.entrance, false);
  game.placeStartingPlayer(start.spawn ?? undefined);
  game.onResize();
  game.timing.started = true;
  game.persistSave();
  return direction;
}

/** Complete direction over the existing run: no save/model replacement or camera refit. */
export function openingDone(game: Game) {
  if (!game.presentation.opening?.gliding) return;
  if (
    !game.sequenceActions(
      game.presentation.opening.timeline.time(),
      game.presentation.opening.skipped ? 'skip' : 'complete',
    )
  )
    return;
  game.directOpeningWorld();
  game.endTitle(true);
  SceneLifecycle.refreshWorldMembership(game.sceneLifecyclePort);
  game.camera.fitW = game.spanW;
  game.releaseNewRun();
}

/** Release the initialized world, whether it began with direction or directly in play. */
export function releaseNewRun(game: Game) {
  game.markSeen(game.scenes.here);
  game.introduceScene();
  game.greet();
  game.syncEnginePause();
  game.syncHud();
  game.persistSave();
}

/** First time in Downtown: the player says where they are (and, once, how its machines open now). */
export function greet(game: Game) {
  const arrival = arrivalFor(game.def.phases?.[game.story]?.arrival, {
    flags: game.save.flags,
    touch: game.touch,
    rain: game.weatherHere().rain,
    companion: matches(game.companionDoc.when, game.gameplayStatePort().read(), {
      definition: game.sources?.companionGameplay ?? COMPANION_GAMEPLAY,
    })
      ? game.companionDoc.greeting
      : null,
  });
  if (!arrival) return;
  for (const flag of arrival.set) game.save.flags[flag] = true;
  game.say(arrival.speaker, arrival.pages, game.p.x, arrival.height);
}

export function checkpoint(game: Game) {
  game.scenes.hosts.forEach((host) => host.persist());
  game.persistSave();
}

export function stop(game: Game) {
  game.cancelStoryTransitions();
  game.presentation.flight = null;
  game.presentation.hop = null;
  game.hints.sceneChanged();
  sound.cancelFeedback();
  game.disposePerformance?.();
  game.disposePerformance = undefined;
  game.reviewNav?.dispose();
  game.reviewNav = undefined;
  game.timing.running = false;
  // Closing returns to the homepage; cached hosts and source sessions resume together.
  // Their scene clocks pause below. Private Play destroys the entire owning frame.
  game.globalGameplaySession?.dispose();
  game.globalGameplaySession = undefined;
  game.shiftGuidance?.hide();
  game.syncEnginePause();
  game.endTitle();
  document.documentElement.classList.remove(
    'game-map',
    'hack-ok',
    'hack-on',
    'logic-open',
    'unfold-on',
    'level-scene',
    'level-up',
    'level-down',
  );
  game.presentation.modeKey = '';
  game.presentation.arrowsKey = '';
  game.menu.hide();
  game.endCutscene(false);
  game.transport?.attach(null);
  game.clockBar?.show(false);
  cancelAnimationFrame(game.timing.raf);
  window.removeEventListener('keydown', game.onKeyDown);
  window.removeEventListener('keyup', game.onKeyUp);
  window.removeEventListener('resize', game.onResize);
  game.input.keys.clear();
  game.presentation.mapView = null;
  game.presentation.netView = null;
  game.presentation.netBack = false;
  game.scenes.hosts.forEach((h) => {
    h.cancelAcknowledgment?.('disposed');
    h.closeAll();
    h.persist();
  });
  game.term.close();
  game.canvas.hidden = true;
  game.persistSave();
}

/**
 * Confirmed world-mode New Game initializes the run before direction starts. Completion releases
 * the same live Harbor models. Private editor Play instead resets its isolated checkpoint realm.
 */
export function newGame(game: Game) {
  if (EDITOR_PLAY || playProfile().routes !== 'world') {
    gameStorage.removeItem(saveKey());
    reloadRuntime();
    return;
  }
  if (!game.presentation.opening) {
    game.showTitle(true);
    return;
  }
  if (game.presentation.opening.gliding) return;
  game.startNewRun();
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
export function cancelStoryTransitions(game: Game) {
  game.scenes.hosts?.forEach((h) => h.cancelAcknowledgment?.('dismissed'));
  game.presentation.bubble = null;
  game.presentation.beat = null;
  game.presentation.sleep = null;
  game.presentation.pendingCut = null;
  game.presentation.stamps = {};
}

/** A run configuration references one complete authored starting situation. */
export function startNewRun(game: Game) {
  const direction = game.initializeNewRun();
  if (direction) game.startCheckpointDirection(direction);
  else {
    game.endTitle(true);
    SceneLifecycle.refreshWorldMembership(game.sceneLifecyclePort);
    game.releaseNewRun();
  }
}

/** Sudo's LEVELS: the opening from one of its points (opening.json `OPENING_LEVELS`), its scenes started over. */
export function openingFrom(
  game: Game,
  level: { flags: string[]; reset?: string[]; end?: string },
) {
  game.cancelStoryTransitions();
  for (const f of game.openingStory.OPENING_FLAGS) delete game.save.flags[f];
  level.flags.forEach((f) => {
    game.save.flags[f] = true;
  });
  for (const scene of level.reset ?? []) game.hostOf(scene as SceneId).reset();
  game.presentation.stamps = {};
  game.persistSave();
  const start = startCheckpoint(),
    to = game.openingStory.openingResumeDestination(game.save.flags) ?? {
      scene: start.scene,
      entrance: start.entrance,
    };
  game.handTo(to.scene, to.entrance);
  if (level.end)
    StoryTransitions.runCues(
      game.storyTransitionsPort,
      game.openingStory.CARDS[level.end].end ?? [],
    );
}
