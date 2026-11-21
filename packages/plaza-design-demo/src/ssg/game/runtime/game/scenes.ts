/** Game: scene hosts, entering scenes and levels, following the player, travel and seams. */
import { sceneStateView } from '../../engine/gameplay/scene-state';
import { projectX, type CameraProjection } from '../../art/core/geometry';
import * as InteractionRouting from '../interaction-routing';
import * as StoryTransitions from '../story-transitions';
import * as Camera from '../camera';
import * as SceneLifecycle from '../scene-lifecycle';
import { movingInteractions } from '../../engine/gameplay/moving-interactions';
import { mergeValues, resolveValues } from '../../engine/gameplay/state';
import { companionCondition } from '../../engine/gameplay/companion-source';
import { mintFeedback, type FeedbackReceipt } from '../../engine/feedback-receipt';
import { exitVisibility } from '../../world/access';
import { ConversationSession } from '../../engine/gameplay/conversation';
import { arriveVehicleLevel } from '../../engine/level-vehicles';
import { NO_RULES, SceneHost } from '../../engine/index';
import { type SceneDef, type SceneId, type SceneView } from '../../scenes/index';
import { isCutsceneId } from '../../story/cutscenes/index';
import { startLevel, SUDO } from '../../ui/sudo';
import { type LineKind } from '../../ui/terminal';
import { frameView } from '../../art/core/view';
import { boardRide } from '../../engine/gameplay/mechanisms/line-ride';
import { sceneClimate, setHereClimate } from '../../world/weather';
import { sound } from '../audio';
import { EDITOR_PLAY } from '../mode';
import { startCheckpoint, can, playProfile } from '../play-profile';
import { nodeCount } from '../save';
import { levelArrive, savedForLevel } from '../../engine/level';
import { placeFrom } from '../../world/zone-graph';
import type { Game } from '../game';

/**
 * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
 * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
 */
export function hostOf(game: Game, id: SceneId): SceneHost {
  const had = game.scenes.hosts.get(id);
  if (had) return had;
  const def: SceneDef = game.sceneDefinition(id);
  const print = (text: string, kind?: LineKind, from?: string, receipt?: FeedbackReceipt) => {
    game.term.print(text, kind, !from && !receipt, receipt);
  };
  const rules =
    typeof def.rules === 'function'
      ? def.rules({
          save: () => game.save,
          persist: () => game.persist(),
          nodes: () => nodeCount(game.save),
          granted: (receipt) =>
            sound.feedback(receipt ?? mintFeedback(game.scenes.here, 'controller', 'success')),
          end: () => {
            game.presentation.showEnd = true;
          },
          // a story beat's cutscene (the stacks' ACT II card) waits for the screen to be free (`loop`)
          cutscene: (cut) => {
            game.presentation.pendingCut = cut;
          },
        })
      : (def.rules ?? NO_RULES);
  const zh = new SceneHost(
    game.host.windowEl,
    print,
    {
      notice: (text, tone, receipt) => {
        game.hints.notify(text, tone, receipt);
      },
      feedbackCue: (receipt) => sound.feedback(receipt),
      cue: (cue) => {
        if (cue === 'open') sound.open();
        else sound.close();
      },
      hints: game.hints,
      hintBusy: () =>
        document.hidden ||
        game.menu.open ||
        !!game.presentation.opening ||
        !!game.presentation.cut ||
        !!game.presentation.mapView ||
        !!game.presentation.netView ||
        !!game.presentation.flight ||
        game.presentation.showEnd ||
        !!game.presentation.sleep ||
        game.term.isOpen ||
        !!game.presentation.bubble ||
        !!game.scenes.hosts.get(id)?.acknowledgmentPending,
      feedbackTime: () => game.hints.notices.time,
      cutscene: (cut) => {
        game.presentation.pendingCut = cut;
      },
      presentation: (operation) => {
        if (operation === 'end') game.presentation.showEnd = true;
      },
      state: () => {
        const values = (game.save.gameplay ??= {});
        if (def.gameplay)
          mergeValues(
            values,
            resolveValues(def.gameplay, {
              flags: game.save.flags,
              items: game.save.items,
              tokens: game.save.tokens,
              values,
            }),
          );
        return sceneStateView(values, id, def.gameplay);
      },
      gameplay: (model) => game.gameplayFor(id, model),
      conversation: (conversationId) => {
        const session = game.gameplayFor(id);
        return session?.definition.conversations[conversationId]
          ? new ConversationSession(session, conversationId)
          : undefined;
      },
      conversationCompleted: (cue) => {
        if (game.scenes.here === id) game.completeConversation(cue);
      },
      modules: () => game.save.modules,
      keyring: () => game.save.keyring,
      give: (k) => {
        if (!game.save.keyring.includes(k)) game.save.keyring.push(k);
        game.persistSave();
      },
      // scene steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => {
        if (!game.save.modules.includes(mod)) game.save.modules.push(mod);
        game.persistSave();
        game.syncHud();
      },
      tokens: (n) => {
        game.save.tokens += n;
        game.persistSave();
        game.syncHud();
        return game.save.tokens;
      },
      // what you carry (the HUD's HELD) and story flags, for scene effects (the laundromat's jacket)
      carry: (item, n) => {
        const now = Math.max(0, (game.save.items[item] ?? 0) + n);
        if (now) game.save.items[item] = now;
        else delete game.save.items[item];
        if (n) {
          game.persistSave();
          game.syncHud();
        }
        return now;
      },
      flag: (f) => {
        game.save.flags[f] = true;
        game.persistSave();
      },
      drop: () => game.persistSave(),
      sudo: SUDO,
      // the net (NET.md): programs you own (scan.so), and the nodes that answer to you
      programs: () => game.save.programs,
      program: (p, receipt) => game.grantProgram(p, receipt),
      controlled: () => game.save.controlled,
      load: () => game.save.scenes[id],
      store: (z) => {
        game.save.scenes[id] = z;
        game.persistSave();
      },
    },
    def,
    rules,
    game.networkContext,
    game.scenes.mobiles.get(id),
  );
  game.scenes.mobiles.delete(id);
  // the companion is the game's, not the scene's: lines about it stand over it, and popups keep clear of it
  zh.where = (from) => {
    if (from === game.companionDoc.speaker && game.companionPresent)
      return { x: game.companionBody.x, h: game.companionBody.h };
    if (from === 'goal' && game.presentation.goalAt !== null)
      return { x: game.presentation.goalAt, h: 20 };
    const source = from.startsWith('use:')
      ? movingInteractions(def, zh.model).uses?.find((u) => u.id === from.slice(4))
      : from.startsWith('exit:')
        ? movingInteractions(def, zh.model).exits.find((e) => e.id === from.slice(5))
        : undefined;
    return source ? { x: source.x, h: 'h' in source ? (source.h ?? 0) : 0 } : null;
  };
  // the opening (opening.ts): hacking is not yours until uplink.so, and some everyday actions say something else
  zh.hackLock = () => game.hackLocked();
  zh.story = (dev) => InteractionRouting.storyChips(game.interactionRoutingPort, id, dev);
  zh.extras = () =>
    game.companionDoc.avoidPopups && game.companionPresent
      ? [{ x: game.companionBody.x, h: game.companionBody.h }]
      : [];
  // captions never cover the player's speech bubble, and keep their lane over people's heads
  zh.shield = () => {
    const b = game.presentation.bubbleBox,
      s = game.cssScale;
    return b ? [{ l: b.x * s, t: b.y * s, r: (b.x + b.w) * s, b: (b.y + b.h) * s }] : [];
  };
  zh.crowd = () => game.heads();
  // something reacted where you cannot see it: the camera may lean that way for a moment
  zh.onReact = (from, text, tone) => {
    if (game.scenes.here === id) game.nudgeTo(from, text, tone);
  };
  zh.onClose = () => game.canvas.focus();
  // hack vision: the reset button and what the LOGIC drawer says you own (the HUD keeps only the goal there)
  zh.onResetView = () => Camera.resetVision(game.cameraPort);
  zh.onVisionUi = () => game.syncModeUi();
  zh.drawerInfo = () => game.ownLine();
  // NET in hack vision's bar: once scan.so is yours, pinging until the net map has been opened once
  zh.netOk = () => game.netOk;
  zh.netNew = () => false;
  zh.onNet = () => game.showNet();
  if (EDITOR_PLAY) zh.model.enableInspection();
  game.scenes.hosts.set(id, zh);
  zh.setPaused(game.enginesPaused);
  // each scene host has its own HACK/BOARD strip, in the key bar; only the current scene's shows
  game.host.windowEl
    .querySelectorAll<HTMLElement>('#scene-btns')
    .forEach((el) => game.keyBar.adopt(el));
  return zh;
}

/** A scene's lines in the deck that buzz (Downtown's ACCESS DENIED and friends), as the old terminal did. */
export function buzzPrint(game: Game, text: string, kind?: LineKind) {
  game.term.print(text, kind);
  if (kind === 'err') sound.denied();
}

/** Scene hosts keep local coordinates even when their vehicle is in another zone. */
export function hostPlacement(game: Game, host: SceneHost) {
  return host === game.zh
    ? { id: game.scenes.here, dx: 0, dh: 0 }
    : (game.scenes.joinedZones.find((z) => game.scenes.hosts.get(z.id) === host) ??
        (() => {
          const at = placeFrom(game.zoneGraph, game.scenes.here, Infinity).get(host.id);
          return at ? { id: host.id as SceneId, ...at } : undefined;
        })());
}

/** Overlays, the deck, travel and talk hold the level's ↑/↓ as they hold walking. */
export function levelLocked(game: Game) {
  return (
    game.presentation.showEnd ||
    game.term.focused ||
    !!game.interactionHost.overlayOpen ||
    !!game.presentation.mapView ||
    !!game.presentation.netView ||
    !!game.presentation.flight ||
    !!game.presentation.hop ||
    !!game.presentation.beat ||
    !!game.presentation.sleep
  );
}

export function jump(game: Game) {
  if (!can('jump')) return;
  if (!game.save.jump) {
    game.flash('[ERR] legs.so not found');
    sound.denied();
    return;
  }
  if (!game.p.onGround || game.scenes.level?.state.vehicle?.seat) return;
  game.p.vy = 4.6;
  game.p.onGround = false;
  sound.jump();
}

/**
 * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
 * The companion comes along where it follows you, or is at home; the first visit has the player say a few words.
 */
export function enter(game: Game, id: SceneId, quiet = false, at?: string, announce = true) {
  const { routes, label } = playProfile(),
    start = startCheckpoint();
  if (routes === 'content' && !game.content[id]) {
    game.flash(`This route is outside the ${label}.`);
    return;
  }
  if (routes === 'start') id = start.scene as SceneId;
  const s: SceneDef = game.sceneDefinition(id);
  if (game.scenes.hosts.has(game.scenes.here)) game.zh.persist();
  game.scenes.hosts.forEach((h) => h.closeAll());
  game.presentation.bubble = null;
  game.scenes.here = id;
  game.save.scene = id;
  game.camera.nudge = null;
  game.camera.easeBack = false;
  game.nudged.clear();
  game.hostOf(id);
  SceneLifecycle.showHosts(game.sceneLifecyclePort);
  const x = (at && s.exits.find((e) => e.id === at)?.x) || s.spawn;
  Object.assign(game.p, {
    x,
    y: 0,
    vy: 0,
    onGround: true,
    face: s.keepFace ? game.p.face : x > s.width / 2 ? -1 : 1,
  });
  // a level scene: arrive on the floor at the exit's (or the spawn's) height; the camera looks there at once
  const source = SceneLifecycle.joinLevel(
      game.sceneLifecyclePort,
      id,
      game.p.x - game.camera.viewW * 0.45,
    ),
    arriveH = (at ? s.exits.find((e) => e.id === at)?.arriveH : undefined) ?? s.spawnH ?? 0;
  const vehicleOnly = s.level && !s.level.floors.length ? s.level.vehicles : undefined;
  if (vehicleOnly && vehicleOnly.length !== 1)
    throw Error('Vehicle-only arrival requires one source vehicle');
  game.scenes.level = source
    ? vehicleOnly
      ? arriveVehicleLevel(source, game.p, game.movers, id, vehicleOnly[0].source.id, arriveH)
      : {
          source,
          state: levelArrive(
            source,
            game.p,
            arriveH,
            SceneLifecycle.seenRooms(game.sceneLifecyclePort, source, id),
            savedForLevel(source, id, game.save.barriers),
          ),
        }
    : null;
  game.camera.camH = game.scenes.level
    ? Math.max(game.scenes.level.source.low, Math.min(game.scenes.level.source.high, game.p.y))
    : 0;
  game.camera.gy = game.camera.gyBase + Math.round(game.camera.camH);
  game.camera.cam = Camera.camFollow(game.cameraPort, game.p.x);
  game.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
  game.syncHud();
  setHereClimate(sceneClimate(id));
  if (!quiet) sound.open();
  // the companion: at home (coming in behind you through the door, or already asleep there), at your heels where it follows you
  if (s.perch) {
    const home = s.perch(game.zh.model);
    if (at && game.gameplayFor(id)?.matches(companionCondition(s, game.companionDoc)))
      game.companionBody.place(x - 14, 0, 'walk', 1);
    else game.companionBody.place(home.x, home.h, home.rest);
  } else if (game.companionPresent)
    game.companionBody.place(x - game.p.face * 20, 0, 'sit', game.p.face);
  // the opening: the train home runs into Downtown; arriving, the player says the opening's words instead
  if (!announce) return;
  game.markSeen(id);
  const phase = s.phases?.[game.story];
  if (phase?.ride) StoryTransitions.runRide(game.storyTransitionsPort, id, phase.ride);
  game.hints.sceneChanged();
  sound.cancelFeedback();
  game.introduceScene();
  game.greet();
}

/** Arrival speech belongs to scene source; an occupied vehicle can defer it until alighting. */
export function introduceScene(game: Game) {
  const scene = game.def;
  if (scene.introOnFoot && game.scenes.level?.state.vehicle) return;
  const flag = 'scene:' + game.scenes.here,
    said = scene.phases?.[game.story]?.intro;
  if (said) {
    const once = 'opening:said:' + game.story + ':' + game.scenes.here;
    if (said.consume) game.save.flags[flag] = true;
    if (!game.save.flags[once]) {
      game.save.flags[once] = true;
      game.persistSave();
      game.say(
        said.speaker,
        game.touch ? (said.touchPages ?? said.pages) : said.pages,
        game.p.x,
        said.height,
      );
    }
    return;
  }
  const intro = typeof scene.intro === 'function' ? scene.intro(game.touch) : scene.intro;
  if (!intro?.length || game.save.flags[flag]) return;
  game.save.flags[flag] = true;
  game.persistSave();
  game.say('YOU', intro, game.p.x, 46);
}

/** Hack vision hangs in the world: give the scene this frame's world → CSS px mapping (as `sx` and `y` draw it). */
export function followHost(game: Game) {
  // (in hack vision the view may be panned and zoomed: the same mapping the world was drawn with)
  const camera = Camera.projection(game.camera);
  const s = (camera.k * game.canvas.clientWidth) / (game.canvas.width || 1),
    top = game.keyBar.root.offsetHeight + 8 + game.presentation.hudH * s;
  const follow = (host: SceneHost, dx: number, dh: number) => {
    // The host retains local manifest coordinates, just like zoneFrame's artwork.
    // Project both its anchors and the player through the same seam placement.
    host.uiTop = top;
    host.follow(
      (wx, h) => ({ x: Math.round(wx + dx - camera.cam) * s, y: (camera.gy - h - dh) * s }),
      game.canvas.clientWidth,
      { x: game.p.x - dx, h: game.p.y - dh },
    );
  };
  follow(game.zh, 0, 0);
  for (const z of game.scenes.joinedZones) {
    const host = game.scenes.hosts.get(z.id);
    if (host && game.scenes.zoneTiers.get(z.id) === 'visible') follow(host, z.dx, z.dh);
  }
}

/** Sudo's LEVELS: play a cutscene (then its next scene), or arrive in a scene at its spawn. */
export function enterLevel(game: Game, id: string) {
  if (id === 'title') {
    game.showTitle();
    return;
  }
  game.endTitle();
  game.presentation.bubble = null;
  const opening = game.openingStory.openingLevel(id);
  if (opening) {
    game.openingFrom(opening);
    return;
  }
  if (isCutsceneId(id)) {
    game.playCutscene(id);
    return;
  }
  game.handTo(
    startLevel(id, {
      board: (station, left) =>
        boardRide(game.hostOf(game.world.TRANSPORT.boarding.scene as SceneId).model, station, left),
    }) ?? id,
  );
  game.markSeen(game.scenes.here);
  game.persistSave();
}

/** What a use costs now (0: nothing to pay this time). */

/** Use an authored scene exit, taxi or map. Physical vehicle transfers belong to the level. */

/** The scene view, refreshed for this frame. */
export function view(game: Game, camera: CameraProjection = game.camera): SceneView {
  const v = (game.presentation.sceneView ??= { ...frameView(0), flags: game.save.flags });
  v.sx = (wx, p = 1) => projectX(wx, camera.cam, p);
  v.y = (h) => camera.gy - h;
  v.t = game.timing.t;
  v.viewW = camera.viewW;
  v.viewH = camera.viewH;
  v.cam = camera.cam;
  v.gy = camera.gy;
  v.flags = game.save.flags;
  v.values = game.save.gameplay;
  v.level = game.scenes.level
    ? SceneLifecycle.levelViewOf(game.sceneLifecyclePort, game.scenes.here)
    : undefined;
  const station = game.world.stationAt(game.scenes.here);
  v.transit = station ? { station, ...game.metro.stationFrame(station, game.ride) } : undefined;
  return v;
}

// ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

/** Go to a scene, landing at its exit `at` there. */
export function travel(game: Game, id: SceneId, at?: string) {
  game.presentation.mapView = null;
  game.enter(id, false, at);
}

/** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
export function walkOff(game: Game, edge: 'left' | 'right') {
  const e = game.def.exits.find((z) => z.edge === edge && exitVisibility(z, game.save.flags).ok);
  if (!e || !game.hasScene(e.to)) return;
  game.travel(e.to, e.at);
  game.p.face = edge === 'left' ? -1 : 1;
}

/** Remember a scene for the city map: `flags['seen:<scene>']`. */
export function markSeen(game: Game, id: SceneId) {
  game.save.scene = id;
  const f = game.world.seenFlag(id);
  game.save.flags[f] = true;
  game.persistSave();
}
