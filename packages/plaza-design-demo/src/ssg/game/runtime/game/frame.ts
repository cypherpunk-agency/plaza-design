/** Game: the frame loop, resize, update, drawing and frame inspection. */
import { changedWorldChunks, worldEditBlockers } from '../world-composition';
import { sourceProjection } from '../../art/core/geometry';
import type { ScenePlacement } from '../state';
import { projectX, type CameraProjection } from '../../art/core/geometry';
import * as StoryTransitions from '../story-transitions';
import * as PresentationFrame from '../presentation-frame';
import { stepPlayer } from '../movement';
import * as Camera from '../camera';
import * as SceneLifecycle from '../scene-lifecycle';
import { runtimeChunkStatuses } from '../chunk-status';
import { MIN_VIEW_W, MAX_VIEW_H } from '../tuning';
import { perfBegin, perfEnd, perfSample } from '../diagnostics/performance';
import { capabilityView, exitVisibility, exitPermission } from '../../world/access';
import { type ZoneFrame } from '../frame';
import { drawFlight, taxiDurationFor } from '../../story/cutscenes/taxi';
import { sceneShell } from '../../engine/shell';
import { type SceneId, type SceneView } from '../../scenes/index';
import { attentionDue } from '../../story/story-rules';
import { drawNetMap } from '../../ui/netmap';
import { type Ctx } from '../../ui/terminal/commands';
import { city } from '../../world/clock';
import { light, lightAt, setLight, type Light } from '../../world/light';
import { frameView } from '../../art/core/view';
import { reportLines, sceneClimate, weatherNow, type Weather } from '../../world/weather';
import { sound } from '../audio';
import { characterHeight, characterX, isHere, setSpeaker } from '../characters';
import { EDITOR_PLAY, PROBE } from '../mode';
import { nodeCount } from '../save';
import { levelFloor, levelIndoor } from '../../engine/level';
import type { Game } from '../game';

/** Detached diagnostics for editor inspection; no mutable runtime references. */
export function inspect(game: Game) {
  const shared = game.gameplayFor(game.scenes.here),
    mobiles = SceneLifecycle.inspectMobiles(game.sceneLifecyclePort);
  return structuredClone({
    scene: game.scenes.here,
    residency:
      EDITOR_PLAY || PROBE
        ? {
            chunks: runtimeChunkStatuses(
              game.scenes,
              (id) => game.sceneDefinition(id as SceneId).name,
              mobiles,
            ),
            camera: {
              x: game.camera.cam,
              h: game.camera.camH,
              width: game.camera.viewW,
              height: game.camera.viewH,
              scale: game.camera.k,
            },
            models: [...game.scenes.hosts].map(([id, host]) => ({
              id,
              tier: game.scenes.zoneTiers.get(id),
              time: host.model.now(),
            })),
            retained: [...game.scenes.mobiles.keys()],
          }
        : undefined,
    worldComposition: EDITOR_PLAY
      ? {
          pending: game.save.worldEdit,
          membership: game.save.worldMembership,
          blockers: game.preparedWorldEdit
            ? worldEditBlockers(
                game.preparedWorldEdit.changed ??
                  changedWorldChunks(
                    game.appliedWorldSource!,
                    game.preparedWorldEdit.result.source,
                    game.worldCompositionContext,
                  ),
                SceneLifecycle.compositionDependencies(game.sceneLifecyclePort),
              )
            : [],
        }
      : undefined,
    mobiles,
    player: { x: game.p.x, y: game.p.y },
    save: game.save,
    level:
      (EDITOR_PLAY || PROBE) && game.scenes.level
        ? {
            floor: game.scenes.level.state.floor,
            vehicle: game.scenes.level.state.vehicle,
            frames: game.scenes.level.source.vehicleFrames?.map((f) => ({
              id: f.vehicle.id,
              x: f.part.dx,
              h: f.part.dh,
              zone: f.pose.zone,
              berth: f.berth?.id,
              doors: f.doors,
              boarding: f.boarding,
            })),
            prompt: game.nearest(),
          }
        : undefined,
    actors: EDITOR_PLAY
      ? (game.def.people ?? []).map((p, index) => ({
          index,
          id: p.id,
          seed: p.seed,
          look: p.look,
          x: p.x,
          h: p.h,
          act: p.act,
          range: p.range,
          speed: p.speed,
          facing: p.facing,
          when: p.when,
          visible: isHere(p),
          follow: p.follow ? (game.def.people ?? []).indexOf(p.follow) : undefined,
          gap: p.gap,
        }))
      : undefined,
    engine: EDITOR_PLAY || PROBE ? game.zh.model.inspect() : undefined,
    gameplay: shared
      ? {
          state: shared.state(),
          purchases: Object.fromEntries(
            Object.keys(shared.definition.purchases ?? {}).map((id) => [id, shared.quote(id)]),
          ),
        }
      : null,
    conversation: game.zh.conversationFrame,
    environment: { weather: game.weatherHere().kind, clock: game.clockMode },
    capabilities: capabilityView(game.save, !game.hackLocked(), game.networkContext.net),
    access: {
      exits: game.def.exits.map((e) => ({
        id: e.id,
        visibility: exitVisibility(e, game.save.flags),
        permission: exitPermission(e, game.save.keyring),
      })),
      interactions: game.def.uses?.map((u) => ({
        id: u.id,
        result: u.eligibility?.(game.save.flags, shared) ?? { ok: true },
      })),
    },
    objective: game.def.objective?.(game.save.flags, game.gameplayFor(game.scenes.here)?.state()),
    paused: game.enginesPaused,
    dialogue: game.presentation.bubble
      ? {
          speaker: game.presentation.bubble.name,
          pages: game.presentation.bubble.pages,
          page: game.presentation.bubble.page,
        }
      : null,
    popup: game.zh.popupOpen,
    events: [...game.scenes.gameplaySessions].flatMap(([scene, session]) =>
      session.events().map((event) => ({ scene, ...event })),
    ),
  });
}

export function onResize(game: Game) {
  if (game.host.viewport) {
    const { width, height, scale } = game.host.viewport;
    game.host.windowEl.style.setProperty('--game-top', '0px');
    game.host.windowEl.style.setProperty('--game-bottom', '0px');
    game.canvas.width = width;
    game.canvas.height = height;
    game.camera.k = scale;
    game.camera.viewW = width / scale;
    game.camera.viewH = height / scale;
    game.camera.gyBase = game.host.viewport.ground ?? game.camera.viewH - 54;
    game.camera.gy = game.camera.gyBase + Math.round(game.camera.camH);
    game.camera.fitW = game.spanW;
    return;
  }
  const win = game.host.windowEl.getBoundingClientRect();
  // a hidden header or footer (phones) takes no room
  const shown = (el: HTMLElement) => el.getClientRects().length > 0;
  const top = shown(game.host.header)
    ? game.host.header.getBoundingClientRect().bottom - win.top
    : 0;
  const bottom = shown(game.host.footer)
    ? win.bottom - game.host.footer.getBoundingClientRect().top
    : 0;
  game.host.windowEl.style.setProperty('--game-top', top + 'px');
  game.host.windowEl.style.setProperty('--game-bottom', bottom + 'px');
  const cssW = win.width,
    cssH = Math.max(120, win.height - top - bottom);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  game.canvas.width = Math.round(cssW * dpr);
  game.canvas.height = Math.round(cssH * dpr);
  // Small screens (phones in landscape) show a shorter slice of the street at a larger scale (tuned: leave as is).
  // Larger screens take the integer scale nearest to a view about 300 units tall (so 1280×720 draws at 2,
  // not 1, and people read), but never under 240 units, so wide places still show enough.
  const px = cssH * dpr,
    phone = cssH < 420;
  let k = phone ? Math.max(1, Math.floor(px / 230)) : Math.max(1, Math.round(px / 300));
  if (!phone && k > 1 && px / k < 240) k--;
  // Squarish and tall windows: aim for MIN_VIEW_W of street across (Tommi, 2026-10-18). The scale
  // steps down instead, and the spare height shows above the street, but not past MAX_VIEW_H
  // (at a coarse scale one step can halve everything: 1000 × 1000 at 1x keeps 2, not 1).
  while (k > 1 && game.canvas.width / k < MIN_VIEW_W && px / (k - 1) <= MAX_VIEW_H) k--;
  // A place narrower than the view (a flat, the yard) is shown closer, so it fills the width,
  // as long as enough height stays in view for its rooms and signs.
  const fit = Math.floor(game.canvas.width / (game.spanW + 24));
  if (fit > k) k = Math.max(k, Math.min(fit, Math.floor(game.canvas.height / 170)));
  game.camera.k = k;
  game.camera.fitW = game.spanW;
  game.camera.viewW = game.canvas.width / game.camera.k;
  game.camera.viewH = game.canvas.height / game.camera.k;
  // On phones the ground sits above the touch buttons, so the floor and what stands on it stay in view.
  const pad = document.getElementById('touch');
  const padTop =
    game.touch && pad && shown(pad)
      ? Math.max(0, game.canvas.getBoundingClientRect().bottom - pad.getBoundingClientRect().top)
      : 0;
  game.camera.gyBase = Math.round(
    game.camera.viewH - Math.max(54, (padTop * dpr) / game.camera.k + 8),
  );
  game.camera.gy = game.camera.gyBase + Math.round(game.camera.camH);
}

/** The level width the view was fitted to; a new place refits (see onResize). */

export function loop(game: Game, now: number) {
  const span = perfBegin('game.frame', game.scenes.here);
  try {
    game.stepLoop(now);
  } finally {
    perfEnd(span);
  }
}

export function stepLoop(game: Game, now: number) {
  if (!game.timing.running) return;
  game.reconcileWorldEdits();
  game.syncEnginePause();
  // the one tick: every scene's model moves on by this frame's time (a paused engine holds still)
  const sceneMs = game.timing.last ? Math.min(250, Math.max(0, now - game.timing.last)) : 0;
  const modelMs =
    game.presentation.opening?.gliding || game.presentation.cut?.scene.liveWorld
      ? sceneMs * (game.transport?.rate ?? 1)
      : sceneMs;
  game.scenes.hosts.forEach((h, id) => h.tick(modelMs, game.scenes.mobileOwners.has(id)));
  if (!game.enginesPaused) game.scenes.mobiles.forEach((c) => c.model.tick(modelMs, true));
  if (game.timing.last) perfSample('raf.gap', now - game.timing.last);
  const readableBefore = game.hints.notices.time;
  game.hints.notices.frame(now, game.communicationCovered);
  const readableDelta = (game.hints.notices.time - readableBefore) / 1000;
  const dt = game.timing.last ? Math.min(3, (now - game.timing.last) / 16.67) : 1;
  game.timing.last = now;
  // sudo's time control follows whatever timed picture is up (none: it hides); in a scene, the city clock's bar
  game.transport?.attach(
    game.presentation.opening?.timeline ?? game.presentation.cut?.timeline ?? null,
  );
  game.clockBar?.show(
    !game.presentation.opening && !game.presentation.cut && !game.menu.open && !game.term.focused,
  );
  // The title and the glide: their own picture, with the title's menu over it.
  if (game.presentation.opening) {
    game.stepOpening((sceneMs * 60) / 1000);
    game.timing.raf = requestAnimationFrame((n) => game.loop(n));
    return;
  }
  // The deck: the world holds still under it (the last frame stays on the canvas).
  if (game.menu.open) {
    game.timing.raf = requestAnimationFrame((n) => game.loop(n));
    return;
  }
  game.save.playMs = (game.save.playMs ?? 0) + dt * 16.67;
  if (game.spanW !== game.camera.fitW) game.onResize(); // a new place: fit the view to it
  // the city map (and a taxi flight) owns the screen: the key bar and touch buttons step aside (render.tsx)
  document.documentElement.classList.toggle(
    'game-map',
    !!game.presentation.mapView || !!game.presentation.flight || !!game.presentation.netView,
  );
  Camera.visionCamera(game.cameraPort);
  game.syncModeUi();
  game.syncLevelArrows();
  if (game.presentation.cut) {
    game.stepCutscene((sceneMs * 60) / 1000);
    game.timing.raf = requestAnimationFrame((n) => game.loop(n));
    return;
  }
  // a story beat asked for a cutscene: it plays once nothing is open (the talk that asked for it has closed)
  if (
    game.presentation.pendingCut &&
    !game.interactionHost.overlayOpen &&
    !game.interactionHost.popupOpen &&
    !game.presentation.bubble &&
    !game.presentation.mapView &&
    !game.term.focused
  ) {
    const id = game.presentation.pendingCut;
    game.presentation.pendingCut = null;
    game.playCutscene(id, () => game.inbox(), 'after-handoff');
  }
  if (!game.reduced || game.timing.t < 1) game.timing.t += dt;
  game.timing.clock += dt;
  // the city clock: the opening's pins, then a tick if it runs here and now (clock.ts)
  StoryTransitions.pinStory(game.storyTransitionsPort);
  if (StoryTransitions.clockRuns(game.storyTransitionsPort)) city.tick(dt / 60);
  StoryTransitions.syncClock(game.storyTransitionsPort);
  const updateSpan = perfBegin('game.update');
  try {
    game.update(dt);
  } finally {
    perfEnd(updateSpan);
  }
  game.shiftGuidance?.update(
    game.save.flags,
    readableDelta,
    game.communicationCovered || !!game.presentation.bubble || !!game.interactionHost.popupOpen,
    game.p.moving,
    game.p.x,
  );
  game.checkGain();
  const renderSpan = perfBegin('game.render');
  try {
    game.draw();
  } finally {
    perfEnd(renderSpan);
  }
  game.syncCarList();
  game.followHost();
  game.timing.raf = requestAnimationFrame((n) => game.loop(n));
}

/** A joined zone in this frame: its own view (the camera moved by where it lies), scene, host and light. */
export function zoneFrame(
  game: Game,
  z: ScenePlacement,
  camera: CameraProjection = game.camera,
): ZoneFrame {
  const scene = game.sceneDefinition(z.id),
    core = game.scenes.mobiles.get(z.id),
    ui = game.scenes.hosts.get(z.id),
    host = ui ?? (core ? { model: core.model, visionOn: false } : game.hostOf(z.id)),
    gy = camera.gy - z.dh;
  const view: SceneView = {
    ...frameView(0),
    t: game.timing.t,
    viewW: camera.viewW,
    viewH: camera.viewH,
    gy,
    ...sourceProjection(camera, z),
    flags: game.save.flags,
    values: game.save.gameplay,
    level: game.scenes.level
      ? SceneLifecycle.levelViewOf(game.sceneLifecyclePort, z.id)
      : undefined,
  };
  const station = game.world.stationAt(z.id);
  if (station) view.transit = { station, ...game.metro.stationFrame(station, game.ride) };
  const outdoor = scene.outdoor ?? !!(scene.ambient?.weather || scene.ambient?.sky);
  return {
    view,
    scene,
    sceneId: z.id,
    host,
    ...(z.dh < 0 ? { below: true } : {}),
    preparePresentation: (prepared) => {
      if (ui) ui.preparePresentation(prepared, 'all');
      else scene.preparePresentation?.(prepared, { m: host.model, hover: null, layer: 'all' });
    },
    weather: () => game.weatherOf(z.id),
    lighting: (W) => {
      const L = lightAt(
        city.day,
        city.min,
        scene.facing ?? 180,
        W ?? game.weatherOf(z.id),
        outdoor,
      );
      setLight(L);
      return L;
    },
  };
}

/** The heads of the people on screen (the scene's, Downtown's street people and the fixer), CSS px. */
export function heads(game: Game) {
  const s = game.cssScale,
    list: { x: number; h: number }[] = [];
  for (const p of game.def.people ?? [])
    if (isHere(p)) list.push({ x: characterX(p, game.timing.t), h: characterHeight(p) });
  return list
    .map(({ x, h }) => ({
      l: (game.sx(x) - 9) * s,
      t: game.y(h) * s,
      r: (game.sx(x) + 9) * s,
      b: game.y(h - 14) * s,
    }))
    .filter((b) => b.r > 0 && b.l < game.canvas.clientWidth);
}

// ---------- world logic ----------

export function ctx(game: Game): Ctx {
  const zh = game.interactionHost,
    scene = game.sceneDefinition(game.hostPlacement(zh)?.id ?? game.scenes.here);
  return {
    save: game.save,
    scanProgram: game.networkContext.net.scanProgram,
    machine: game.termMachine(),
    // the deck's commands reach the scene's machines, when it has any
    shell:
      zh.model.devices.size && !game.hackLocked()
        ? sceneShell(
            zh,
            scene.buzz
              ? (text, kind) => game.buzzPrint(text, kind)
              : (text, kind) => game.term.print(text, kind),
          )
        : null,
    print: (text, kind) => game.term.print(text, kind),
    denied: () => sound.denied(),
    granted: () => sound.granted(),
    toggleSound: () => sound.toggle(),
    clear: () => game.term.clear(),
    leaveMachine: () => game.term.close(),
    persist: () => game.persist(),
    resettable: game.resettableScenes().map(([id, s]) => ({
      id,
      ...s.resettable!,
      reset: () => game.hostOf(id as SceneId).reset(),
    })),
    // your own deck, while you still exist
    deck: game.openingStory.persona(game.save.flags)?.deck,
    // the Registry's forecast, where you are
    weather: () =>
      reportLines(sceneClimate(game.scenes.here, game.world.source), 12, game.world.source),
    // the net from where you stand (NET.md): scan, connect (needs scan.so, except what a port here knows)
    net: game.hackLocked()
      ? undefined
      : {
          scan: () => game.deckScan(),
          connect: (name) => game.deckConnect(name),
          names: () =>
            zh.model.nodesHere().filter((id) => zh.model.net.has(id) || zh.model.ports().length),
        },
  };
}

/** What the HUD's hint lane drew last (the probe reads it; nothing else does). */

/** `?probe` / `?sudo`: a read-only snapshot of the story for scripts (scripts/opening-playthrough). It writes nothing and advances nothing. */
export function probeFrame(game: Game) {
  const t = game.nearest(),
    b = game.presentation.bubble;
  return {
    here: game.scenes.here,
    phase: game.story,
    flags: { ...game.save.flags },
    clock: {
      day: city.day,
      min: Math.round(city.min * 100) / 100,
      text: city.text,
      pinned: city.pinned,
    },
    title: !!game.presentation.opening,
    glide: !!game.presentation.opening?.gliding,
    menu: game.menu.open,
    cut: !!game.presentation.cut,
    end: game.presentation.showEnd,
    map: !!game.presentation.mapView,
    bubble: b
      ? {
          name: b.name,
          text: b.pages[b.page],
          page: b.page,
          pages: b.pages.length,
          full: b.chars >= b.pages[b.page].length,
        }
      : null,
    prompt: t ? { kind: t.kind, id: t.id, label: t.label, x: Math.round(t.x) } : null,
    targets: game.targets().map((z) => ({
      kind: z.kind,
      id: z.id,
      label: z.label,
      x: Math.round(z.x),
    })),
    hint: game.presentation.hudHint,
    goal: game.goalText(),
    popup: game.zh.popupOpen,
    acknowledging: game.zh.acknowledgmentText ?? null,
    gate: PresentationFrame.probeGate(game.presentationFramePort),
    card: PresentationFrame.probeCard(game.presentationFramePort),
    player: { x: Math.round(game.p.x * 10) / 10, y: Math.round(game.p.y * 10) / 10 },
    term: (game.term.out.textContent ?? '').slice(-700),
  };
}

export function update(game: Game, dt: number) {
  const p = game.p,
    b = game.presentation.bubble;
  if (b && b.chars < b.pages[b.page].length) {
    const before = Math.floor(b.chars);
    b.chars = Math.min(b.pages[b.page].length, b.chars + 1.2 * dt);
    if (Math.floor(b.chars) !== before && Math.floor(b.chars) % 2 === 0) sound.blip();
  }
  StoryTransitions.updateTravel(game.storyTransitionsPort);
  StoryTransitions.updateStory(game.storyTransitionsPort);
  const locked =
    game.presentation.showEnd ||
    game.term.focused ||
    !!game.interactionHost.overlayOpen ||
    !!game.presentation.mapView ||
    !!game.presentation.netView ||
    !!game.presentation.flight ||
    !!game.presentation.hop ||
    !!game.presentation.beat ||
    !!game.presentation.sleep;
  const riding = stepPlayer(game.movementPort, dt, locked);

  // zones (engine/zones.ts) watch where the player stands
  // (a joined level names buildings zone/building; the scene's own zones know them by their own name)
  game.syncPlayerLocations();
  Camera.stepFollowCamera(game.cameraPort, dt, riding);
  if (game.companionPresent)
    game.companionBody.update(dt, {
      px: p.x,
      face: p.face,
      moving: p.moving,
      follow: game.companionDoc.follow,
      perch: game.def.perch?.(game.zh.model) ?? null,
      warm: game.def.companion?.warm,
    });
  game.host.setNodes(nodeCount(game.save));
  // the opening's idle ping: standing still a while, the next goal's target pings (opening.ts)
  const aim = game.shiftGuidance ? null : (game.def.phases?.[game.story]?.ping ?? null);
  if (!aim || locked || p.moving || !p.onGround || game.presentation.bubble || game.zh.popupOpen)
    game.presentation.still = game.timing.clock;
  else if (
    attentionDue(game.timing.clock, game.presentation.still, game.openingStory.ATTENTION.after)
  ) {
    game.presentation.still = game.timing.clock;
    StoryTransitions.pingGoal(game.storyTransitionsPort, aim);
  }
}

// ---------- drawing ----------

export function sx(game: Game, worldX: number, parallax = 1) {
  return projectX(worldX, game.camera.cam, parallax);
}

export function y(game: Game, h: number) {
  return game.camera.gy - h;
}

/**
 * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
 * the scene has them (`ambient`), the scene's own drawing, the player and the companion, the scene's
 * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
 * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
 * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
 */
export function draw(game: Game) {
  // a person whose speech bubble is open gestures while they talk (the player's own bubble sits at the player)
  setSpeaker(
    game.presentation.bubble && Math.abs(game.presentation.bubble.x - game.p.x) > 2
      ? game.presentation.bubble.x
      : null,
  );
  const x = game.x,
    k = game.camera.k;
  x.imageSmoothingEnabled = false;
  // a taxi flight is the one frame too, directed by its timeline (story/cutscenes/taxi.ts)
  if (game.presentation.flight) {
    drawFlight(
      x,
      game.camera.viewW,
      game.camera.viewH,
      Math.min(
        1,
        (game.timing.clock - game.presentation.flight.start) /
          (taxiDurationFor(game.sequenceDocuments.cinematics) * 60),
      ),
      game.timing.clock,
      game.world.STANDS[game.presentation.flight.to].name,
      light(),
      game.sequenceDocuments.cinematics,
      k,
    );
    return;
  }
  // the world, at hack vision's pan and zoom; the HUD and the overlays over it at the usual scale
  PresentationFrame.drawWorld(game.presentationFramePort);
  x.setTransform(k, 0, 0, k, 0, 0);
  PresentationFrame.drawHud(game.presentationFramePort);
  if (game.presentation.showEnd) PresentationFrame.drawEnd(game.presentationFramePort);
  PresentationFrame.drawBeat(game.presentationFramePort);
  PresentationFrame.drawSleep(game.presentationFramePort);
  game.drawMap();
  if (game.presentation.netView)
    drawNetMap(game.x, game.camera.viewW, game.camera.viewH, game.netState());
}

/**
 * This frame's light for the scene on screen (light.ts): its facing, outdoors or in, the weather
 * (indoors: the district's, for what the windows show). Sets it for characters and sets to read,
 * and works out the shade bands and the lamps for night shadows.
 */
export function lightHere(game: Game, W: Weather | null): Light {
  const s = game.def,
    amb = s.ambient ?? {};
  // an indoor floor of a level (a tunnel, a cellar) is lit as indoors while the player stands on it
  const outdoor =
    game.scenes.level && levelIndoor(game.scenes.level)
      ? false
      : (s.outdoor ?? !!(amb.weather || amb.sky));
  const L = lightAt(city.day, city.min, s.facing ?? 180, W ?? game.weatherHere(), outdoor);
  setLight(L);
  return L;
}

/** The ground under the player at world x (a ledge they are over, or the street): where their shadow lies. */
export function groundUnder(game: Game, wx: number, h: number) {
  return Math.max(
    game.scenes.level ? Math.min(h, levelFloor(game.scenes.level).h) : 0,
    ...game.platforms
      .filter((pl) => wx > pl.x && wx < pl.x + pl.w && pl.h <= h + 0.5)
      .map((pl) => pl.h),
  );
}

/**
 * The weather a scene has now: its district's (weather.ts). Dawn, before you are deleted, is
 * dry whatever the forecast says ("Rain's late today": the opening is scripted).
 */
export function weatherOf(game: Game, scene: string): Weather {
  const w = weatherNow(sceneClimate(scene, game.world.source), game.world.source);
  if (!game.openingStory.persona(game.save.flags)?.calmWeather || (w.rain < 0.01 && w.storm < 0.01))
    return w;
  return {
    ...w,
    kind: w.kind === 'rain' || w.kind === 'storm' ? 'cloudy' : w.kind,
    rain: 0,
    storm: 0,
    wet: Math.min(w.wet, 0.4),
    wind: Math.min(w.wind, 0.3),
  };
}

export function weatherHere(game: Game) {
  return game.weatherOf(game.scenes.here);
}
