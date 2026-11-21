/** Opening documents, scenes, sequences, checkpoints and linked editor locations; the view memory; the current document and selection. */
import { viewMatchesLocation } from '../view-memory';
import { compositionWorkspaces, workspaceDocuments, sequenceSource } from '../workspace';
import { perfMeasure } from '../../runtime/diagnostics/performance';
import { type ChunkDocument, type AssetInstance } from '../../art/core/composition';
import type { EditorDocument } from '../contracts';
import { flatten, type Composer } from './context';

export function navigationArea(
  app: Composer,
): Pick<
  Composer,
  | 'documentsForView'
  | 'withViewDocuments'
  | 'viewScene'
  | 'navigable'
  | 'viewKey'
  | 'rememberView'
  | 'restoreView'
  | 'syncEditorLocation'
  | 'sceneName'
  | 'sceneId'
  | 'openInstance'
  | 'openConversation'
  | 'current'
  | 'activeDocument'
  | 'directionDocument'
  | 'sequence'
  | 'evaluationContext'
  | 'viewCompositionDocument'
  | 'compositionDocument'
  | 'selected'
  | 'editInstance'
  | 'applyLinkedContext'
  | 'openLinkedScene'
  | 'openLinkedPanel'
  | 'navigateEditorLink'
  | 'openDocument'
  | 'selectDirection'
  | 'openSequence'
  | 'openCheckpoint'
  | 'editCheckpoint'
  | 'focusCheckpointRoot'
  | 'openComposition'
  | 'openScene'
> {
  const documentsForView = () => {
    if (app.viewDocuments) return app.viewDocuments;
    if (app.documentSnapshotVersion !== app.model.sourceVersion) {
      app.documentSnapshot = app.model.inspectDocuments();
      app.documentSnapshotVersion = app.model.sourceVersion;
    }
    return app.documentSnapshot;
  };
  const withViewDocuments = <T>(work: () => T): T => {
    if (app.viewDocuments) return work();
    app.viewDocuments = documentsForView();
    try {
      return work();
    } finally {
      app.viewDocuments = undefined;
    }
  };
  const viewScene = () => {
    const doc = current();
    return doc?.kind === 'composition' ? (doc.value as ChunkDocument).scene : '';
  };
  const navigable = () => current()?.kind === 'composition';
  const viewKey = () => (app.workspaceId ? 'composition:' + app.workspaceId : viewScene());
  function rememberView() {
    const scene = viewKey();
    if (!app.viewReady || !scene || !app.playHost.hidden) return;
    const anchor =
      app.painting.workspaceAnchor?.document === app.currentId
        ? { x: app.painting.workspaceAnchor.x, h: app.painting.workspaceAnchor.h }
        : undefined;
    if (app.directionDocumentId) app.sequenceTimes.set(app.directionDocumentId, app.time);
    app.viewMemory.write(scene, {
      checkpoint: app.activeCheckpointId,
      sequence: app.sequenceId,
      time: app.time,
      ambientTime: app.time + app.ambientOffset,
      sequenceTimes: Object.fromEntries(app.sequenceTimes),
      compare: app.compareId,
      workspace: {
        x: app.workspaceNavigation(false).x,
        y: app.workspaceNavigation(false).h,
        zoom: app.sequenceNav.zoom,
        anchor,
      },
      cameraPreview: app.cameraPreview,
      environment: { ...app.environment },
      timeline: {
        zoom: app.timelineView.zoom,
        collapsed: [...app.timelineView.collapsed],
        scrollX: app.timelineView.scrollX,
        scrollY: app.timelineView.scrollY,
        height: app.timelineHeight,
        folded: app.timelineCollapsed,
      },
      speed: app.playbackSpeed,
      snap: app.snap,
      loop: { enabled: app.loop, from: app.loopFrom, to: app.loopTo },
      outlines: app.showObjectOutlines,
      borders: app.showSceneBounds,
      chunkStatus: app.showChunkStatus,
      reduced: app.reduced,
      overlays: app.overlays,
      pixelatedScaling: app.pixelatedScaling,
      followCamera: app.followCamera,
      scroll: app.restoredScroll ?? { x: app.stage.scrollLeft, y: app.stage.scrollTop },
      selection: { ...app.editorSelection },
      outline: { sort: app.layerSort, query: app.layerQuery },
    });
    syncEditorLocation();
  }
  function restoreView() {
    const saved = app.viewMemory.read(viewKey());
    if (!saved) return;
    app.activeCheckpointId = saved.checkpoint;
    focusCheckpointRoot();
    selectDirection(
      sequenceSource(saved.sequence, documentsForView(), app.workspaceId),
      saved.time,
    );
    for (const [id, at] of Object.entries(saved.sequenceTimes ?? {})) app.sequenceTimes.set(id, at);
    const duration = sequence()?.duration;
    app.ambientOffset = (saved.ambientTime ?? saved.time) - app.time;
    Object.assign(app.sequenceNav, {
      x: saved.workspace.x,
      y: saved.workspace.y,
      zoom: saved.workspace.zoom,
    });
    if (saved.workspace.anchor)
      app.painting.workspaceAnchor = { document: app.currentId, ...saved.workspace.anchor };
    app.cameraPreview = saved.cameraPreview;
    app.followCamera = saved.followCamera ?? false;
    app.pixelatedScaling = saved.pixelatedScaling ?? true;
    Object.assign(app.environment, saved.environment);
    Object.assign(app.timelineView, {
      zoom: saved.timeline.zoom,
      collapsed: new Set(saved.timeline.collapsed),
      scrollX: saved.timeline.scrollX,
      scrollY: saved.timeline.scrollY,
    });
    app.timelineHeight = saved.timeline.height;
    app.timelineCollapsed = saved.timeline.folded;
    app.playbackSpeed = saved.speed;
    app.snap = saved.snap;
    app.loop = saved.loop.enabled;
    app.loopTo = Math.min(saved.loop.to, duration ?? saved.loop.to);
    app.loopFrom = Math.min(saved.loop.from, app.loopTo);
    if (app.loopFrom >= app.loopTo) {
      app.loopFrom = 0;
      app.loopTo = duration ?? 0;
    }
    app.showObjectOutlines = saved.outlines;
    app.showSceneBounds = saved.borders;
    app.showChunkStatus = saved.chunkStatus;
    app.reduced = saved.reduced;
    app.overlays = saved.overlays;
    app.compareId = documentsForView().some((d) => d.id === saved.compare) ? saved.compare : '';
    app.restoredScroll = saved.scroll;
    app.layerSort = saved.outline.sort;
    app.layerQuery = saved.outline.query;
    const selectedDoc = documentsForView().find(
      (d) => d.id === (saved.selection.document || app.currentId) && d.kind === 'composition',
    );
    const validInstance =
      selectedDoc &&
      flatten(selectedDoc.value as ChunkDocument).some(
        (r) => r.node.id === saved.selection.instance,
      );
    Object.assign(app.editorSelection, {
      document: validInstance ? saved.selection.document : '',
      instance: validInstance ? saved.selection.instance : '',
      timeline: undefined,
      chunk: undefined,
      world:
        saved.selection.world?.composition === app.workspaceId ? saved.selection.world : undefined,
    });
    if (
      saved.selection.chunk &&
      documentsForView().some(
        (d) =>
          d.kind === 'composition' && (d.value as ChunkDocument).scene === saved.selection.chunk,
      )
    )
      app.editorSelection.chunk = saved.selection.chunk;
    const t = saved.selection.timeline,
      seq = sequence();
    if (t?.kind === 'camera') app.editorSelection.timeline = t;
    if (t && seq) {
      const track =
        t.kind === 'key' || t.kind === 'track'
          ? seq.tracks.find((r) => r.id === t.track)
          : undefined;
      if (
        t.kind === 'camera' ||
        (t.kind === 'track' && track) ||
        (t.kind === 'key' && track?.keys[t.index]) ||
        ('id' in t &&
          (t.kind === 'shot'
            ? seq.shots
            : t.kind === 'text'
              ? seq.text
              : t.kind === 'fade'
                ? seq.fades
                : t.kind === 'beat'
                  ? seq.beats
                  : (seq.commands ?? [])
          ).some((r) => r.id === t.id))
      )
        app.editorSelection.timeline = t;
    }
    app.playing = false;
    app.animating = false;
    app.outlineSnapshot = undefined;
    app.outlineVersion = '';
  }
  function syncEditorLocation() {
    if (!app.linked || !viewScene()) return;
    const query = new URLSearchParams(
        app.workspaceId ? { composition: app.workspaceId } : { scene: viewScene() },
      ),
      panel = app.panels.find((p) => p.details.open)?.details.dataset.tool;
    if (app.activeCheckpointId) query.set('checkpoint', app.activeCheckpointId);
    if (app.currentTimeline()) {
      query.set('sequence', app.sequenceId);
      query.set('time', String(app.time));
    }
    if (app.compareId) query.set('compare', app.compareId);
    if (panel) query.set('panel', panel);
    const hash = '#' + query.toString();
    if (location.hash !== hash)
      history.replaceState(null, '', location.pathname + location.search + hash);
  }
  const sceneName = (scene: string) => {
    const names: Record<string, string> = {
      'sequence-title': 'Title',
      'sequence-opening': 'Opening glide',
      'sequence-intro': 'Act I cinematic',
      'sequence-act2': 'Act II cinematic',
      'sequence-taxi': 'Taxi flight',
    };
    if (names[scene]) return names[scene];
    const doc = documentsForView().find(
      (d) =>
        d.id.startsWith('authored.') &&
        d.kind === 'scene' &&
        (d.value as { id?: string }).id === scene,
    );
    return doc ? (doc.value as { name: string }).name : (app.config.sceneLabel?.(scene) ?? scene);
  };
  const sceneId = () => {
    const doc = compositionDocument();
    return doc ? (doc.value as ChunkDocument).scene : '';
  };
  const openInstance = (document: string, instance: string) => {
    app.editorSelection.world = undefined;
    if (
      app.workspaceId &&
      workspaceDocuments(app.workspaceId, documentsForView()).some((d) => d.id === document)
    ) {
      app.editorSelection.document = document;
      app.editorSelection.instance = instance;
      app.editorSelection.chunk = undefined;
      app.showLayout();
      app.refresh();
      return;
    }
    openDocument(document);
    app.currentId = document;
    app.editorSelection.chunk = undefined;
    app.editorSelection.document = '';
    app.editorSelection.instance = instance;
    app.playing = false;
    app.syncSequence();
    app.showLayout();
    app.refresh();
  };
  function openConversation(document: string, conversation: string) {
    const item = app.workbenches.find((item) => item.config.selectConversation);
    if (!item) {
      app.notice('Conversation library is unavailable.', true);
      return;
    }
    item.config.selectConversation!(document, conversation);
    if (item.details.open) item.dispose?.refresh?.();
    else app.openPanel(item.details);
  }
  const current = () =>
    app.currentId ? documentsForView().find((d) => d.id === app.currentId) : undefined;
  /** The document an open panel edits (Export/Import JSON), otherwise the current composition. */
  const activeDocument = () => {
    const id = app.workbenches.find((item) => item.details.open)?.config.primaryDocumentId;
    return id && documentsForView().some((doc) => doc.id === id) ? app.model.get(id) : current();
  };
  const directionDocument = () => documentsForView().find((d) => d.id === app.directionDocumentId);
  const sequence = () => app.currentTimeline()?.sequences.find((s) => s.id === app.sequenceId);
  const evaluationContext = () => {
    const key = JSON.stringify([
      app.currentId,
      app.time,
      app.reduced,
      app.sequenceId,
      app.environment,
      app.canvas.width,
      app.canvas.height,
    ]);
    if (
      app.evaluatedContext?.version === app.model.sourceVersion &&
      app.evaluatedContext.key === key
    )
      return app.evaluatedContext.value;
    const base = app.model.timelineContext(),
      value =
        app.config.timelineContext?.(base, {
          time: app.time,
          reduced: app.reduced,
          sequenceId: app.sequenceId,
          environment: { ...app.environment },
          viewport: { width: app.baseWidth, height: app.baseHeight },
          timeline: app.currentTimeline(),
        }) ?? base;
    app.evaluatedContext = { key, version: app.model.sourceVersion, value };
    return value;
  };
  const viewCompositionDocument = () => {
    const doc = directionDocument() ?? current();
    return doc?.kind === 'composition' ? doc : undefined;
  };
  const compositionDocument = () =>
    app.editorSelection.document
      ? documentsForView().find((d) => d.id === app.editorSelection.document)
      : viewCompositionDocument();
  const selected = () => {
    const doc = compositionDocument();
    return doc
      ? flatten(doc.value as ChunkDocument).find((x) => x.node.id === app.editorSelection.instance)
          ?.node
      : undefined;
  };
  const editInstance = (
    name: string,
    action: (node: AssetInstance) => void,
    scope: 'all' | 'artwork' = 'all',
  ) =>
    app.run(
      () => {
        const doc = compositionDocument();
        if (!doc || !app.editorSelection.instance) return;
        app.model.updateInstance(doc.id, app.editorSelection.instance, name, (n) => {
          const before = { ...n.props },
            bindings = { ...n.bindings };
          action(n);
          app.guardLinkedProperties(doc.id, n, before, bindings);
        });
      },
      false,
      scope,
    );
  function applyLinkedContext(query: URLSearchParams) {
    const checkpoint = query.get('checkpoint'),
      composition = query.get('composition'),
      scene = query.get('scene');
    if (checkpoint) openCheckpoint(checkpoint, composition ?? undefined);
    else if (composition) openComposition(composition);
    else if (scene) openScene(scene, query.get('compare') ?? undefined);
    const direction = query.get('sequence');
    if (direction) {
      const at = query.has('time') ? Number(query.get('time')) : undefined;
      openSequence(direction, at !== undefined && Number.isFinite(at) && at >= 0 ? at : undefined);
    }
  }
  function openLinkedScene() {
    if (app.sceneLinked) return;
    app.sceneLinked = true;
    if (
      app.linkQuery?.has('checkpoint') ||
      app.linkQuery?.has('composition') ||
      app.linkQuery?.has('scene')
    ) {
      applyLinkedContext(app.linkQuery);
      const saved = app.viewMemory.read(viewKey());
      if (saved && viewMatchesLocation(saved, app.linkQuery)) {
        restoreView();
        app.refresh();
      }
      return;
    }
    const last = app.viewMemory.lastScene();
    if (last.startsWith('composition:')) openComposition(last.slice(12));
    else if (
      documentsForView().some(
        (d) => d.kind === 'composition' && (d.value as ChunkDocument).scene === last,
      )
    )
      openScene(last);
    else {
      restoreView();
      app.refresh();
    }
  }
  function openLinkedPanel() {
    if (app.linked) return;
    app.linked = true;
    const tool = app.linkedPanel;
    const target = tool && app.panels.find((p) => p.details.dataset.tool === tool);
    if (target) app.openPanel(target.details);
  }
  const navigateEditorLink = () => {
    if (!app.viewReady) return;
    const query = location.hash.includes('=')
      ? new URLSearchParams(location.hash.slice(1))
      : undefined;
    if (query) applyLinkedContext(query);
    const scene = query?.get('scene'),
      panel = query?.get('panel') ?? (query ? '' : decodeURIComponent(location.hash.slice(1)));
    const target = app.panels.find((p) => p.details.dataset.tool === panel);
    if (target) app.openPanel(target.details);
    else if (scene) app.showLayout();
  };
  function openDocument(id: string, composition = '') {
    app.cancelNumericScrub();
    return perfMeasure('editor.scene-switch', () => {
      rememberView();
      app.cancelWorldDrag?.();
      if (id !== app.currentId || composition !== app.workspaceId) {
        app.compareId = '';
        app.stopPlay();
        app.painting.workspaceAnchor = undefined;
        Object.assign(app.sequenceNav, { x: 0, y: 0, zoom: 1 });
      }
      app.workspaceId = composition;
      app.currentId = id;
      app.activeCheckpointId = undefined;
      app.editorSelection.world = undefined;
      app.editorSelection.chunk = undefined;
      app.editorSelection.document = '';
      app.editorSelection.instance = '';
      const doc = current();
      selectDirection(
        !composition && doc?.kind === 'composition' && (doc.value as ChunkDocument).sequence
          ? doc
          : undefined,
      );
      restoreView();
      app.refresh();
      rememberView();
    });
  }
  /** All direction entry points establish the same paused temporal context. */
  function selectDirection(
    source: EditorDocument | undefined,
    at?: number,
    preserveAmbient = at === undefined,
  ) {
    const ambient = app.time + app.ambientOffset;
    if (app.directionDocumentId) app.sequenceTimes.set(app.directionDocumentId, app.time);
    app.directionDocumentId = source?.id ?? '';
    app.sequenceId = '';
    app.time = at ?? (source ? (app.sequenceTimes.get(source.id) ?? 0) : app.time);
    app.playing = false;
    app.animating = false;
    app.editorSelection.timeline = undefined;
    app.outlineSnapshot = undefined;
    app.outlineVersion = '';
    app.syncSequence();
    app.ambientOffset = preserveAmbient ? ambient - app.time : 0;
  }
  function openSequence(id: string, at?: number) {
    const source = sequenceSource(id, documentsForView(), app.workspaceId);
    if (!source) {
      app.notice('Sequence ' + id + ' does not exist in this workspace.', true);
      return;
    }
    const playhead =
      at ?? (app.directionDocumentId === source.id ? app.time : app.sequenceTimes.get(source.id));
    if (!app.workspaceId && source.id !== app.currentId) openDocument(source.id);
    selectDirection(source, playhead, at === undefined);
    app.refresh();
    rememberView();
  }
  function openCheckpoint(id: string, requestedComposition?: string) {
    app.stopPlay();
    if (!id) {
      app.activeCheckpointId = '';
      app.config.worldStates?.select(viewScene(), '');
      app.refresh();
      return;
    }
    const state = app.config.worldStates?.list('', documentsForView()).find((s) => s.id === id),
      checkpoint = state?.checkpoint;
    if (!checkpoint) {
      app.notice('Checkpoint ' + id + ' does not exist.', true);
      return;
    }
    const composition = checkpoint.composition ?? requestedComposition;
    if (composition) {
      const workspace = compositionWorkspaces(documentsForView(), checkpoint.membership).find(
        (w) => w.id === composition,
      );
      if (!workspace?.chunks.some((d) => (d.value as ChunkDocument).scene === checkpoint.scene)) {
        app.notice('This checkpoint does not start in composition ' + composition, true);
        return;
      }
      if (composition !== app.workspaceId) openComposition(composition);
    } else openScene(checkpoint.scene);
    const source = checkpoint.sequence
      ? sequenceSource(checkpoint.sequence.id, documentsForView(), app.workspaceId)
      : undefined;
    if (source && !app.workspaceId && source.id !== app.currentId) openDocument(source.id);
    selectDirection(source, checkpoint.sequence?.time ?? 0);
    app.activeCheckpointId = id;
    focusCheckpointRoot(true);
    app.config.worldStates!.select(checkpoint.scene, id);
    app.refresh();
    rememberView();
  }
  function editCheckpoint(id: string) {
    openCheckpoint(id);
    app.inspector.selectSection('starting-state');
    app.refresh();
  }
  /** A checkpoint frames its player chunk without changing the composition's identity. */
  function focusCheckpointRoot(reset = false) {
    if (!app.workspaceId || !app.activeCheckpointId) return;
    const checkpoint = app.config.worldStates
      ?.list('', documentsForView())
      .find((s) => s.id === app.activeCheckpointId)?.checkpoint;
    if (!checkpoint) return;
    const root = workspaceDocuments(
      app.workspaceId,
      documentsForView(),
      checkpoint.membership,
    ).find((d) => (d.value as ChunkDocument).scene === checkpoint.scene);
    if (root && root.id !== app.currentId) {
      app.currentId = root.id;
      if (reset) {
        app.painting.workspaceAnchor = undefined;
        Object.assign(app.sequenceNav, { x: 0, y: 0, zoom: 1 });
        app.editorSelection.document = '';
        app.editorSelection.instance = '';
        app.editorSelection.timeline = undefined;
        app.editorSelection.chunk = undefined;
      }
    }
  }
  function openComposition(id: string) {
    const workspace = compositionWorkspaces(documentsForView()).find((w) => w.id === id);
    if (!workspace) {
      app.notice('Unknown composition ' + id, true);
      return;
    }
    const source =
      workspace.chunks[0] ??
      documentsForView().find((d) => d.id === app.currentId && d.kind === 'composition') ??
      documentsForView().find((d) => d.kind === 'composition');
    if (!source) return;
    if (!app.root.dataset.stagePanel) app.showLayout();
    openDocument(source.id, id);
  }
  function openScene(scene: string, compare?: string) {
    const doc = documentsForView().find(
      (d) => d.kind === 'composition' && (d.value as ChunkDocument).scene === scene,
    );
    if (doc) {
      if (!app.root.dataset.stagePanel) app.showLayout();
      openDocument(doc.id);
      if (compare) {
        app.compareId = compare;
        app.refreshOptions();
        void app.draw();
      }
    } else app.notice(`Chunk ${scene} has no editable source in this session.`, true);
  }
  return {
    documentsForView,
    withViewDocuments,
    viewScene,
    navigable,
    viewKey,
    rememberView,
    restoreView,
    syncEditorLocation,
    sceneName,
    sceneId,
    openInstance,
    openConversation,
    current,
    activeDocument,
    directionDocument,
    sequence,
    evaluationContext,
    viewCompositionDocument,
    compositionDocument,
    selected,
    editInstance,
    applyLinkedContext,
    openLinkedScene,
    openLinkedPanel,
    navigateEditorLink,
    openDocument,
    selectDirection,
    openSequence,
    openCheckpoint,
    editCheckpoint,
    focusCheckpointRoot,
    openComposition,
    openScene,
  };
}
