/** Play inside the editor: starting and stopping a private run and following its chunks. */
import { type ChunkStatus } from '../../runtime/chunk-status';
import { renderRuntimeChunks } from '../chunk-status';
import { element } from '../controls';
import { workspaceDocuments } from '../workspace';
import { message, type Composer } from './context';

export function playArea(
  app: Composer,
): Pick<
  Composer,
  'playWorkbench' | 'canPlay' | 'inspectChunk' | 'receiveResidency' | 'playScene' | 'stopPlay'
> {
  /** Scene toolbar's Play: open the Play panel and start the scene immediately. */
  const playWorkbench = () =>
    app.workbenches.find((item) => item.config.area === 'scene' && item.config.mode === 'play');
  const canPlay = () => {
    if (
      app.workspaceId &&
      !workspaceDocuments(
        app.workspaceId,
        app.documentsForView(),
        app.worldState()?.checkpoint?.membership,
      ).length
    )
      return false;
    const item = playWorkbench(),
      scene = app.worldState()?.checkpoint?.scene ?? app.sceneId();
    return (
      !!item &&
      !!scene &&
      (!item.config.supports || item.config.supports(scene, app.documentsForView()))
    );
  };
  const inspectChunk = (id: string) => {
    app.editorSelection.world = undefined;
    app.editorSelection.chunk = id;
    app.editorSelection.document = '';
    app.editorSelection.instance = '';
    app.editorSelection.timeline = undefined;
    app.refreshRight();
  };
  function receiveResidency(rows: readonly ChunkStatus[] | undefined) {
    app.liveChunkRows = rows;
    app.left.classList.toggle('live-residency', !!rows);
    app.runtimeOutline.hidden = !rows;
    const signature = JSON.stringify(rows);
    if (signature === app.chunkSignature) return;
    app.chunkSignature = signature ?? '';
    if (rows) renderRuntimeChunks(app.runtimeOutline, rows, inspectChunk);
    if (app.editorSelection.chunk) app.refreshRight();
  }
  /** Pick object → edit: stop the run and show the interaction's rule in Logic → Rules. */
  function openRule(scene: string, rule: string) {
    const item = app.workbenches.find((entry) => entry.config.selectRule);
    if (!item) {
      app.notice('Logic → Rules is unavailable.', true);
      return;
    }
    stopPlay();
    if (app.sceneId() !== scene) app.openScene(scene);
    item.config.selectRule!(scene, rule);
    if (item.details.open) item.dispose?.refresh?.();
    else app.openPanel(item.details);
  }
  const playScene = () => {
    const item = playWorkbench(),
      scene = app.worldState()?.checkpoint?.scene ?? app.sceneId();
    if (!item || !canPlay()) return;
    stopPlay();
    app.playing = false;
    app.animating = false;
    app.showLayout();
    // In Animate the run starts at the playhead; otherwise it starts as the checkpoint is authored.
    app.playStartMode = app.sequence() ? 'preview' : 'checkpoint';
    const viewport = app.gameViewport(
      app.playStartMode === 'checkpoint'
        ? !!app.worldState()?.checkpoint?.sequence
        : !!app.sequence(),
    );
    app.playHost.style.setProperty('--play-ratio', String(viewport.width / viewport.height));
    app.playCheckpointId = app.worldState()?.id;
    app.playHost.hidden = false;
    app.playRun.hidden = false;
    app.stage.hidden = true;
    app.viewportTools.hidden = true;
    app.root.dataset.playing = '';
    item.config.showScene?.(scene, app.documentsForView());
    try {
      app.playHandle = item.config.mount(app.playHost, {
        documents: app.documentsForView(),
        checkpoint: app.playCheckpointId,
        onCheckpoint: (id) => {
          app.playCheckpointId = id;
        },
        openScene: app.openScene,
        openInstance: app.openInstance,
        scene,
        autostart: true,
        playSettings: app.playSettings,
        playDock: app.playRun,
        openRule,
        stopPlay,
        playStart: {
          mode: app.playStartMode,
          viewport,
          sequence: app.sequence() ? { id: app.sequenceId, time: app.time } : undefined,
          camera: app.painting.result?.gameCamera,
        },
        onResidency: receiveResidency,
        ...(item.config.authoring ? { authoring: app.authoringApi() } : {}),
      });
    } catch (error) {
      app.playHost.replaceChildren(element('p', 'error', `Play unavailable: ${message(error)}`));
    }
    app.refreshOptions();
    app.refreshTimeline();
    app.refreshRight();
  };
  function stopPlay() {
    if (app.playHost.hidden) return;
    app.playHandle?.();
    app.playHandle = undefined;
    app.playHost.replaceChildren();
    app.playHost.hidden = true;
    app.stage.hidden = false;
    delete app.root.dataset.playing;
    const checkpoint = app.playCheckpointId;
    app.playCheckpointId = undefined;
    app.playSettings.replaceChildren();
    app.playRun.replaceChildren();
    app.playRun.hidden = true;
    if (checkpoint && checkpoint !== app.activeCheckpointId) {
      app.openCheckpoint(checkpoint);
      return;
    }
    app.refreshViewportTools();
    app.refreshOptions();
    app.refreshTimeline();
    app.refreshRight();
    void app.draw();
  }
  return { playWorkbench, canPlay, inspectChunk, receiveResidency, playScene, stopPlay };
}
