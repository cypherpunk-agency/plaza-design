/** Game: cutscenes and checkpoint direction. */
import { renderWorldFrame } from '../render-scene';
import { art } from '../../art';
import type { OpeningDocuments } from '../../story/title/documents';
import type { Cutscene } from '../../story/cutscenes/types';
import * as Camera from '../camera';
import * as SceneLifecycle from '../scene-lifecycle';
import { SCENES, type SceneId } from '../../scenes/index';
import { CutscenePlay, isCutsceneId, type CutsceneId } from '../../story/cutscenes/index';
import { light } from '../../world/light';
import { playProfile } from '../play-profile';
import type { Game } from '../game';

/**
 * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
 * `then`, the game hands over to the cutscene's authored destination. Story triggers
 * use after-handoff so their postlude follows travel, retaining a same-scene native interlude.
 * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
 */
export function playCutscene(
  game: Game,
  id: CutsceneId | string,
  then?: () => void,
  continuation: 'replace' | 'after-handoff' = 'replace',
  initial?: { time: number; receipts: readonly string[] },
) {
  const authoredSequence = game.sequenceDocuments.cinematics.timeline.sequences.find(
      (s) => s.id === id,
    ),
    standalone =
      authoredSequence &&
      game.sequenceDocuments.cinematics.compositions[authoredSequence.composition];
  const source =
    game.worldSequences[id] ??
    (!isCutsceneId(id) && standalone
      ? { composition: standalone, sequence: authoredSequence! }
      : undefined);
  let scene: Cutscene | undefined = isCutsceneId(id) ? game.nativeCutscenes[id] : undefined;
  if (source) {
    const { composition, sequence } = source,
      documents: OpeningDocuments = {
        compositionId: composition.scene,
        composition,
        compositions: { [composition.scene]: composition },
        timeline: { version: 1, sequences: [sequence] },
      };
    const liveWorld = composition.instances.some((n) => n.type === 'sequence.world-control');
    scene = {
      id,
      title: id,
      duration: sequence.duration,
      next: sequence.handoff?.scene ?? '',
      handoff: sequence.handoff,
      ownsFade: true,
      liveWorld,
      cards: sequence.text.map((c) => ({
        at: c.from,
        until: c.to,
        text: c.text,
        x: c.x,
        h: c.h,
      })),
      beats: sequence.beats.map((b) => ({ at: b.time, name: b.id })),
      ...(liveWorld
        ? {
            advance: (time: number) =>
              game.directWorld(documents, id, time, game.timing.t / 60, false),
          }
        : {}),
      render: (context, view, time, scale, director) => {
        renderWorldFrame({
          kind: 'sequence',
          context,
          documents,
          sequenceId: id,
          registry: art,
          scale,
          width: view.viewW,
          height: view.viewH,
          reduced: game.reduced,
          lighting: view.lighting,
          time,
          director,
          cards: false,
          world: {
            citySource: game.world.source,
            scenes: { ...SCENES, ...game.content },
            graph: game.zoneGraph,
            compositions: game.appliedWorldSource,
            ambientTime: game.timing.t / 60,
            flags: game.save.flags,
            model: (id) =>
              game.scenes.hosts.get(id as SceneId)?.model ??
              game.scenes.mobiles.get(id as SceneId)?.model,
            backdrops: game.sources.backdrops,
          },
        });
      },
    };
  }
  const handoff = () => {
    if (!scene) return;
    const destination = scene.handoff ?? { scene: scene.next };
    // A story interlude returning to its current scene preserves native runtime state.
    if (
      continuation === 'after-handoff' &&
      destination.scene === game.scenes.here &&
      destination.entrance === undefined
    )
      return;
    if (destination.scene) game.handTo(destination.scene, destination.entrance);
  };
  const after = then
    ? continuation === 'after-handoff'
      ? () => {
          handoff();
          then();
        }
      : then
    : handoff;
  if (!scene) {
    after();
    return;
  }
  game.endCutscene(false);
  game.presentation.bubble = null;
  game.input.keys.clear();
  game.scenes.hosts.forEach((h) => h.closeAll());
  game.term.close();
  game.beginSequenceActions(scene.id);
  if (initial && game.save.sequenceActions)
    game.save.sequenceActions.receipts = [...initial.receipts];
  game.presentation.cut = new CutscenePlay(scene, {
    reduced: game.reduced,
    touch: game.touch,
    startAt: initial?.time,
  });
  game.sequenceActions(initial?.time ?? 0);
  game.presentation.cut.prepare(game.x, game.camera.viewW, game.camera.viewH, light());
  game.syncEnginePause();
  game.presentation.cutThen = after;
  document.documentElement.classList.add('cutscene');
  game.canvas.setAttribute(
    'aria-label',
    'ACCESS DENIED: ' + scene.cards.map((c) => c.text).join(' '),
  );
  game.host.setScene(scene.title);
}

/** Start an already reconstructed situation through the normal playback owners.
 * Loading it is not New Game and never invokes preceding sequence commands a second time. */
export function startCheckpointDirection(
  game: Game,
  start: { id: string; time: number; receipts: readonly string[] },
) {
  const sequence = game.sequenceSource(start.id),
    allowed = new Set(
      (sequence?.commands ?? []).filter((c) => c.time <= start.time).map((c) => c.id),
    );
  if (
    !sequence ||
    !Number.isFinite(start.time) ||
    start.time < 0 ||
    start.time > sequence.duration ||
    new Set(start.receipts).size !== start.receipts.length ||
    start.receipts.some((id) => !allowed.has(id))
  )
    throw Error('Invalid preview sequence start');
  if (game.sequenceDocuments.opening.timeline.sequences.some((s) => s.id === start.id)) {
    // New Game continues the launch shot's ambient clock. A reconstructed private start
    // creates that presentation only when none exists; neither path reruns launch commands.
    if (!game.presentation.opening || start.id !== 'glide') game.showTitle(false, false);
    const opening = game.presentation.opening!;
    if (start.id === 'glide') {
      opening.go();
      game.menu.hide();
    }
    opening.timeline.seek(start.time);
    game.beginSequenceActions(start.id);
    if (game.save.sequenceActions) game.save.sequenceActions.receipts = [...start.receipts];
    game.directOpeningWorld();
    game.syncEnginePause();
    return;
  }
  game.playCutscene(start.id, undefined, 'replace', start);
}

export function stepCutscene(game: Game, dt: number) {
  const c = game.presentation.cut!;
  c.prepare(game.x, game.camera.viewW, game.camera.viewH, light());
  c.step((dt / 60) * (game.transport?.rate ?? 1));
  if (c.scene.liveWorld) {
    game.timing.t += dt * (game.transport?.rate ?? 1);
    game.timing.clock += dt * (game.transport?.rate ?? 1);
  }
  game.sequenceActions(c.t, c.skipped ? 'skipping' : 'play');
  game.transport?.sync();
  const x = game.x;
  x.imageSmoothingEnabled = false;
  c.draw(x, game.camera.viewW, game.camera.viewH, light(), game.camera.k);
  if (c.done) game.endCutscene(true);
}

/** Stop the cutscene; `andThen` runs what comes after it (false when the game stops mid-scene). */
export function endCutscene(game: Game, andThen: boolean) {
  if (!game.presentation.cut) return;
  if (
    andThen &&
    !game.sequenceActions(
      game.presentation.cut.t,
      game.presentation.cut.skipped ? 'skip' : 'complete',
    )
  )
    return;
  if (!andThen) game.sequenceActions(game.presentation.cut.t, 'cancel');
  const then = game.presentation.cutThen;
  const directed = game.presentation.cut.scene.liveWorld;
  game.presentation.cut = null;
  game.presentation.cutThen = null;
  if (directed) {
    game.scenes.directedZones.clear();
    game.scenes.directedOrigin = undefined;
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
  if (andThen) then?.();
}

/** Arrive in a scene by id (anything else is Downtown), at its spawn. */
export function handTo(game: Game, id: string, entrance?: string) {
  game.enter(game.hasScene(id) ? id : (playProfile().home as SceneId), true, entrance);
}
