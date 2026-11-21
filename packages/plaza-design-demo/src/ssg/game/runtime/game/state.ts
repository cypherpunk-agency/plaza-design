/** Game: world edits, scene definitions, gameplay sessions and saving. */
import { readStoryObservation } from '../../story/observations';
import { setStateValue } from '../../engine/gameplay/state';
import { changedWorldChunks, worldEditBlockers } from '../world-composition';
import { editWorldMembership, type CompositionEdit } from '../../world/compositions';
import * as SceneLifecycle from '../scene-lifecycle';
import { ownedSummary } from '../hud-data';
import { nativeLiveConditionsTick } from '../../engine/gameplay/native-live-conditions';
import { attachGameplayHandoffs } from '../../engine/gameplay/handoffs';
import { registryLabels } from '../../engine/gameplay/rewards';
import { cloneValues, mergeValues, deleteStateValue } from '../../engine/gameplay/state';
import { type SceneModel } from '../../engine/model';
import {
  withCompanionConversations,
  COMPANION_GAMEPLAY,
} from '../../engine/gameplay/companion-conversations';
import { withBotConversations } from '../../engine/gameplay/bot-conversations';
import { nativeGameplayPort } from '../../engine/gameplay/native-bindings';
import { saveVehicle } from '../../engine/level-vehicles';
import { GameplaySession } from '../../engine/gameplay/session';
import {
  isSceneId,
  ITEMS,
  SCENES,
  type ItemId,
  type SceneDef,
  type SceneId,
} from '../../scenes/index';
import { SUDO } from '../../ui/sudo';
import { city } from '../../world/clock';
import { sceneClimate, weatherNow } from '../../world/weather';
import { ownedModules, storeSave, type Save } from '../save';
import { levelFloor, levelRiding } from '../../engine/level';
import type { Game } from '../game';

export function prepareWorldEdits(game: Game, edits: readonly CompositionEdit[]) {
  const batch = [...(game.save.worldEdit ?? []), ...structuredClone(edits)];
  if (batch.length > 64) throw Error('World edit batch limit');
  const result = editWorldMembership(
    game.worldCompositions,
    game.save.worldMembership ?? {},
    batch,
    game.worldCompositionContext,
    game.worldBaseGraph,
  );
  return {
    commit: () => {
      game.save.worldEdit = batch;
      game.preparedWorldEdit = { edits: batch, result };
    },
  };
}

export function reconcileWorldEdits(game: Game) {
  const edits = game.save.worldEdit;
  if (!edits?.length) return;
  // Reuse the validated compilation while dependencies change; deferred edits do no recompilation per frame.
  const result =
    game.preparedWorldEdit?.edits === edits
      ? game.preparedWorldEdit.result
      : editWorldMembership(
          game.worldCompositions,
          game.save.worldMembership ?? {},
          edits,
          game.worldCompositionContext,
          game.worldBaseGraph,
        );
  const cached = game.preparedWorldEdit;
  void game.zoneGraph;
  const changed =
    cached?.edits === edits && cached.changed
      ? cached.changed
      : changedWorldChunks(game.appliedWorldSource!, result.source, game.worldCompositionContext);
  game.preparedWorldEdit = { edits, result, changed };
  if (
    worldEditBlockers(changed, SceneLifecycle.compositionDependencies(game.sceneLifecyclePort))
      .length
  )
    return;
  game.save.worldMembership = result.membership;
  delete game.save.worldEdit;
  game.appliedWorldSource = result.source;
  game.compiledWorld = result.graph;
  game.preparedWorldEdit = undefined;
  SceneLifecycle.refreshWorldMembership(game.sceneLifecyclePort);
  game.persistSave();
}

/** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */

/** Where a saved game may resume: any scene, except a `stage.sudoOnly` one (the sandbox) without sudo. */
export function resumable(game: Game, id: string): boolean {
  return game.hasScene(id) && (!game.sceneDefinition(id).sudoOnly || SUDO);
}

/** Scenes the deck can start over (`stage.resettable`; `stage.sudoOnly` ones only under sudo), in scene order. */
export function resettableScenes(game: Game): [string, SceneDef][] {
  return Object.entries({ ...SCENES, ...game.content } as Record<
    string,
    SceneDef | undefined
  >).filter((e): e is [string, SceneDef] => !!e[1]?.resettable && (!e[1].sudoOnly || SUDO));
}

export function hasScene(game: Game, id: string): id is SceneId {
  return Object.prototype.hasOwnProperty.call(game.content, id) || isSceneId(id);
}

export function sceneDefinition(game: Game, id: SceneId): SceneDef {
  let scene = game.scenes.compiledScenes.get(id);
  if (!scene) {
    const source = game.content[id] ?? SCENES[id];
    if (!source) throw new Error('Unknown scene ' + id);
    scene = withCompanionConversations(
      withBotConversations(
        source.bindWorld?.({ city: game.world, metro: game.metro }) ?? source,
        game.botReactions,
        game.sources?.botGameplay,
      ),
      game.sources?.companionGameplay ?? COMPANION_GAMEPLAY,
    );
    game.scenes.compiledScenes.set(id, scene);
  }
  return scene;
}

/** One common state port for scene commands and source-authored global story workflows. */
export function gameplayStatePort(
  game: Game,
  id?: SceneId,
): import('../../engine/gameplay/types').StatePort {
  return {
    prepareWorld: (edits) => game.prepareWorldEdits(edits),
    read: () => {
      const state: import('../../engine/gameplay/types').GameplayState = {
        world: {
          day: city.day,
          minute: city.min,
          weather: weatherNow(
            sceneClimate(id ?? game.scenes.here, game.world.source),
            game.world.source,
          ).kind,
        },
        player: {
          handle: game.save.handle,
          jump: game.save.jump,
          controlled: game.save.controlled,
          keyring: game.save.keyring,
        },
        flags: { ...game.save.flags },
        items: game.save.items,
        tokens: game.save.tokens,
        values: game.save.gameplay,
      };
      return state;
    },
    write: (state) => {
      game.save.flags = state.flags;
      game.save.items = state.items;
      game.save.tokens = state.tokens;
      if (state.player) {
        game.save.keyring = [...state.player.keyring];
        game.save.controlled = [...state.player.controlled];
        game.save.jump = state.player.jump;
      }
      mergeValues((game.save.gameplay ??= {}), state.values ?? {});
    },
  };
}

export function globalGameplay(game: Game): GameplaySession {
  let session = game.globalGameplaySession;
  if (!session) {
    session = new GameplaySession(
      game.globalGameplayDefinition,
      game.gameplayStatePort(),
      undefined,
      [],
      {
        keyring: new Set(game.networkContext.keyring.keys()),
        controlled: new Set(registryLabels(game.networkContext.net)),
      },
    );
    session.readContext = () => ({
      nativeRead: (key) =>
        readStoryObservation(key, {
          phase: game.story,
          scene: game.scenes.here,
          viewing: game.zh.viewing ?? null,
          bubble: !!game.presentation.bubble,
          popup: game.zh.popupOpen,
          clock: game.timing.clock,
          stamps: game.presentation.stamps,
        }),
    });
    game.globalGameplaySession = session;
    if (session.definition.handoffs?.length)
      attachGameplayHandoffs(session, {
        schedule: (ms, run, canceled, detail) =>
          game.hostOf(game.scenes.here).model.later(
            ms,
            () => {
              run();
              game.persistSave();
              game.syncHud();
            },
            detail,
            canceled,
          ),
        cutscene: (id) => {
          game.presentation.pendingCut = id;
        },
        presentation: (operation) => {
          if (operation === 'end') game.presentation.showEnd = true;
        },
      });
  }
  return session;
}

/** The cinematic primitive reports a milestone; shared commands own flags and rewards. */
export function runOpeningWorkflow(
  game: Game,
  role: import('../../story/opening-source').OpeningWorkflow,
): boolean {
  return game.globalGameplay().dispatch(game.openingStory.WORKFLOWS[role], 'system').ok;
}

export function gameplayFor(
  game: Game,
  id: SceneId,
  providedModel?: SceneModel,
): GameplaySession | undefined {
  const definition = game.sceneDefinition(id).gameplay;
  if (!definition) return undefined;
  if (definition.native && !providedModel && !game.scenes.hosts.has(id)) {
    game.hostOf(id);
    return game.scenes.gameplaySessions.get(id);
  }
  let session = game.scenes.gameplaySessions.get(id);
  if (!session) {
    const port = game.gameplayStatePort(id);
    const model = () => {
      const m = providedModel ?? game.scenes.hosts.get(id)?.model;
      if (!m) throw new Error('Native scene not ready');
      return m;
    };
    session = new GameplaySession(
      definition,
      definition.native ? nativeGameplayPort(definition, port, model) : port,
      () => {
        if (definition.native) {
          const m = model(),
            { state: scalar, ...snapshot } = m.snapshot(),
            board = game.save.scenes[id]?.board;
          game.save.scenes[id] = { ...snapshot, ...(board ? { board } : {}) };
          m.changed();
        }
        game.persistSave();
        game.syncHud();
      },
      game.sceneDefinition(id).objectives,
    );
    const onEvent = game.sceneDefinition(id).gameplayEvent;
    if (onEvent) session.observe((event) => onEvent(event, game.timing.t));
    game.scenes.gameplaySessions.set(id, session);
  }
  return session;
}

/** Serialization works on settled copies; live common blocks keep their identity and in-flight values. */
export function prepareSave(game: Game, save: Save): Save {
  const values = cloneValues(save.gameplay),
    scenes = { ...save.scenes };
  for (const [id, host] of [...game.scenes.hosts, ...game.scenes.mobiles]) {
    const { state, ...engine } = host.model.snapshot();
    for (const [key, value] of Object.entries(state))
      setStateValue(values, id + '.' + key, value, game.sceneDefinition(id).gameplay);
    scenes[id] = { ...engine, ...(scenes[id]?.board ? { board: scenes[id]!.board } : {}) };
  }
  for (const id of new Set([...Object.keys(game.content), ...Object.keys(SCENES)]))
    for (const [key, d] of Object.entries(
      game.sceneDefinition(id as SceneId).gameplay?.state ?? {},
    ))
      if (d.lifetime !== 'save') deleteStateValue(values, key);
  for (const [key, d] of Object.entries(game.globalGameplayDefinition.state ?? {}))
    if (d.lifetime !== 'save') deleteStateValue(values, key);
  return {
    ...save,
    gameplay: values,
    scenes,
    vehicle: saveVehicle(game.scenes.level, game.p, game.scenes.here),
  };
}

export function persistSave(game: Game) {
  storeSave(game.save, (save) => game.prepareSave(save));
}

/** The one player, expressed in each resident model's local coordinates for its native zones. */
export function syncPlayerLocations(game: Game) {
  const floor =
    game.scenes.level && !levelRiding(game.scenes.level)
      ? levelFloor(game.scenes.level)
      : undefined;
  for (const host of game.scenes.hosts.values()) {
    const at = game.hostPlacement(host);
    if (!at) {
      host.model.player = null;
      continue;
    }
    const building = floor
      ? !floor.building
        ? ''
        : floor.zone === at.id || !floor.zone
          ? floor.building.replace(at.id + '/', '')
          : undefined
      : undefined;
    host.model.player = {
      x: game.p.x - at.dx,
      h: game.p.y - at.dh,
      ...(building === undefined ? {} : { building }),
    };
  }
}

/** Write current progress, refresh the HUD and evaluate source-authored persistence triggers. */
export function persist(game: Game) {
  game.persistSave();
  game.syncHud();
  for (const id of new Set([...Object.keys(game.content), ...Object.keys(SCENES)])) {
    const definition = game.sceneDefinition(id as SceneId).gameplay;
    if (!Object.values(definition?.native?.triggers ?? {}).some((row) => row.phase === 'onPersist'))
      continue;
    const host = game.hostOf(id as SceneId),
      session = game.gameplayFor(id as SceneId);
    if (session) nativeLiveConditionsTick(host.model, session, (run) => run(), 'onPersist');
  }
}

export function syncEnginePause(game: Game) {
  game.scenes.hosts.forEach((h) => h.setPaused(game.enginesPaused));
  game.scenes.mobiles.forEach((c) => c.model.setPaused(game.enginesPaused));
}

/**
 * What hack vision's LOGIC drawer lists: modules, programs and the key chips that do something.
 * Not tokens and not what you carry (Tommi, 2026-10-15): those show where they are used (a price
 * on the prompt, "show the maglev pass" in the brake's popup) and in the deck's CARRY tab.
 */
export function owned(game: Game): [string, string] {
  return ownedSummary(game.save, game.networkContext.keyring, SUDO);
}

/** What you own, as a set of words, to see what came (or went) since the last frame. */

export function checkGain(game: Game) {
  const s = game.save,
    words = [
      ...ownedModules(s),
      ...s.programs,
      ...s.keyring.map((id) => game.networkContext.keyring.get(id)?.label ?? id),
      ...Object.entries(s.items)
        .filter(([, n]) => n > 0)
        .map(([id]) => ITEMS[id as ItemId] ?? id),
    ];
  const now = words.join('|');
  if (game.presentation.gainWords && now !== game.presentation.gainWords) {
    const before = new Set(game.presentation.gainWords.split('|')),
      added = words.filter((w) => !before.has(w));
    if (added.length) game.notify('+ ' + added.join(' · '), 'success');
  }
  game.presentation.gainWords = now;
}
