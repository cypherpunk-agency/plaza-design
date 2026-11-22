/** Workspaces, panel groups, workbenches, the tool row and the mode banner. */
import { element, button, select } from '../controls';
import { workspaceSequences } from '../workspace';
import { type ChunkDocument } from '../../art/core/composition';
import { createFrame, sectionNavigator } from '../frame';
import type {
  WorkbenchContext,
  WorkbenchHandle,
  WorkbenchConfig,
  SceneSnapshot,
} from '../contracts';
import { message, type Workspace, type Group, type Composer } from './context';

export function workspacesArea(
  app: Composer,
): Pick<
  Composer,
  | 'hiddenIn'
  | 'speedControl'
  | 'panelGroup'
  | 'showLayout'
  | 'openPanel'
  | 'showGroup'
  | 'activeWorkspace'
  | 'sequenceChoices'
  | 'openWorkspace'
  | 'refreshTools'
  | 'refreshMode'
  | 'emptyState'
  | 'mountWorkbench'
  | 'sameDocuments'
  | 'refreshWorkbench'
  | 'closeOthers'
> {
  const hiddenIn = (id: string | undefined) => {
    if (!id) return new Set<string>();
    let set = app.hiddenByDocument.get(id);
    if (!set) app.hiddenByDocument.set(id, (set = new Set()));
    return set;
  };
  const speedControl = () =>
    select(
      [0.25, 0.5, 1, 1.5, 2, 4].map((value) => ({ value: String(value), label: value + '×' })),
      String(app.playbackSpeed),
      (value) => (app.playbackSpeed = Number(value)),
    );
  const panelGroup = (item: WorkbenchConfig): Group =>
    item.area === 'scene' || app.LOGIC_LIBRARY.has(item.id) ? 'logic' : (item.area ?? 'library');
  const showLayout = () => {
    app.group = 'layout';
    app.panels.forEach((item) => (item.details.open = false));
    refreshTools();
  };
  const openPanel = (details: HTMLDetailsElement) => {
    const item = app.panels.find((p) => p.details === details);
    if (!item) return;
    app.stopPlay();
    app.group = item.group;
    app.chosen.set(app.group, details);
    details.open = true;
    refreshTools();
  };
  const showGroup = (id: Group) => {
    if (id === 'layout') {
      showLayout();
      return;
    }
    if (!app.panels.some((p) => p.group === id)) {
      showLayout();
      return;
    }
    const target = app.chosen.get(id) ?? app.panels.find((p) => p.group === id)?.details;
    if (target) openPanel(target);
  };
  const activeWorkspace = (): Workspace =>
    app.group === 'layout' || app.group === 'library'
      ? app.directionDocumentId
        ? 'animate'
        : 'layout'
      : app.group;
  const sequenceChoices = () =>
    app.workspaceId
      ? workspaceSequences(app.workspaceId, app.documentsForView())
      : app
          .documentsForView()
          .filter(
            (d) =>
              d.id === app.currentId &&
              d.kind === 'composition' &&
              !!(d.value as ChunkDocument).sequence,
          );
  /** Layout edits base values; Animate enters the composition's sequence (the last one used, else the first). */
  function openWorkspace(ws: Workspace) {
    if (ws !== 'layout' && ws !== 'animate') {
      showGroup(ws);
      return;
    }
    showLayout();
    const directing = !!app.directionDocumentId;
    if (ws === 'layout' && directing && app.workspaceId) {
      app.lastDirection = app.directionDocumentId;
      app.selectDirection(undefined);
      app.refresh();
      app.rememberView();
      return;
    }
    if (ws === 'animate' && !directing) {
      const choices = sequenceChoices(),
        pick = choices.find((d) => d.id === app.lastDirection) ?? choices[0];
      if (pick) {
        app.selectDirection(pick);
        app.refresh();
        app.rememberView();
      } else
        app.notice(
          'This composition has no sequence to animate. Open a checkpoint or composition that has one.',
        );
    }
  }
  function refreshTools() {
    const active = app.panels.find((item) => item.details.open),
      beside = !!active?.details.classList.contains('stage-panel');
    // The open panel is in the URL (#style-frames, #characters, …) so it can be linked and survives reloads.
    app.syncEditorLocation();
    app.root.dataset.tool = active && !beside ? (active.details.dataset.tool ?? 'scene') : 'scene';
    app.root.dataset.group = app.group;
    if (beside) app.root.dataset.stagePanel = active!.details.dataset.tool!;
    else delete app.root.dataset.stagePanel;
    const ws = activeWorkspace();
    if (app.root.dataset.tool === 'scene' && app.lastTool !== 'scene' && app.lastTool)
      app.refreshOptions();
    // A Logic panel hides the stage; keep its last picture for the rule view's scene strip.
    if (app.lastTool === 'scene' && app.root.dataset.tool !== 'scene') captureStage();
    app.lastTool = app.root.dataset.tool;
    app.tools.replaceChildren();
    for (const item of app.groups) {
      if (
        item.id === 'library' ||
        (item.id !== 'layout' &&
          item.id !== 'animate' &&
          !app.panels.some((p) => p.group === item.id))
      )
        continue;
      const tab = button(item.label, () => openWorkspace(item.id), item.title);
      tab.dataset.group = item.id;
      tab.setAttribute('aria-pressed', String(item.id === ws));
      app.tools.append(tab);
    }
    // One strip of the workspace's panels; the scene views have none. Logic panels act on the chunk chosen at its start.
    const members = app.panels.filter((p) => p.group === app.group);
    app.subtools.replaceChildren();
    app.subtools.hidden =
      app.group === 'layout' ||
      (app.group !== 'logic' && app.group !== 'library' && members.length < 2);
    if (app.group === 'logic')
      app.subtools.append(app.sceneContext, element('span', 'strip-divider'));
    if (app.group === 'library')
      app.subtools.append(button('◂ Scene', showLayout, 'Back to the scene'));
    if (app.group !== 'layout')
      for (const item of members) {
        const tab = button(item.label, () => openPanel(item.details), item.title);
        tab.dataset.tool = item.details.dataset.tool;
        tab.setAttribute('aria-pressed', String(item.details.open));
        app.subtools.append(tab);
      }
    if (app.group === 'layout' && app.sceneContext.parentElement !== app.left)
      app.left.insertBefore(
        app.sceneContext,
        app.left.querySelector('.dock-head')?.nextSibling ?? app.left.firstChild,
      );
    if (app.root.dataset.tool === 'scene' && app.layoutDirty) {
      app.layoutDirty = false;
      app.refreshLeft();
      app.refreshRight();
    }
    refreshMode();
  }
  function refreshMode() {
    const ws = activeWorkspace();
    app.root.dataset.workspace = ws;
    if (ws !== app.dockWorkspace) app.applyDocks(ws);
    for (const tab of app.tools.children)
      tab.setAttribute('aria-pressed', String((tab as HTMLElement).dataset.group === ws));
    const playingNow = !app.playHost.hidden,
      scene = app.root.dataset.tool === 'scene',
      seq = scene && !!app.directionDocumentId;
    app.modeChip.className = 'mode-chip' + (playingNow ? ' playing' : seq ? ' sequence' : '');
    app.modeChip.textContent = playingNow
      ? 'PLAYING'
      : seq
        ? `SEQUENCE · ${app.sequenceId} @ ${app.time.toFixed(1)} s`
        : scene
          ? 'BASE EDITING'
          : (app.groups.find((g) => g.id === app.group)?.label ?? '').toUpperCase();
    const mode = playingNow ? 'playing' : seq ? 'sequence' : '',
      entering = mode === 'sequence' && app.root.dataset.mode !== 'sequence';
    if (mode) app.root.dataset.mode = mode;
    else delete app.root.dataset.mode;
    // Entering a sequence, the inspector opens on the sequence's own settings rather than the checkpoint's starting state.
    if (entering && app.inspector.selectSection('world-sequence')) app.refreshRight();
    app.modeBanner.hidden = !mode;
    app.stageWrap.toggleAttribute('data-banner', !!mode);
    app.modeBanner.className = 'mode-banner ' + mode;
    if (mode === 'playing') {
      app.bannerTitle.textContent = '● Playing · private run';
      app.bannerDetail.textContent = 'Edits made now are not part of this run';
      app.bannerAction.textContent = '■ Stop';
      app.bannerAction.hidden = false;
    } else if (mode === 'sequence') {
      app.bannerTitle.textContent = `● Sequence editing · ${app.sequenceId}`;
      app.bannerDetail.textContent = `Changes record keys at ${app.time.toFixed(1)} s`;
      app.bannerAction.textContent = 'Exit to base editing';
      app.bannerAction.hidden = !app.workspaceId;
    }
    if (!scene) app.contextLine.textContent = app.panels.find((p) => p.details.open)?.title ?? '';
  }
  function emptyState(item: WorkbenchConfig, scene: string) {
    const box = element('div', 'empty-state');
    box.append(
      element('h2', '', item.title.split(' · ')[0]),
      element(
        'p',
        '',
        item.unsupported ??
          `${scene ? app.sceneName(scene) : 'This document'} has nothing to edit here yet.`,
      ),
    );
    const others = app
      .documentsForView()
      .filter(
        (doc) =>
          doc.kind === 'composition' &&
          item.supports!((doc.value as ChunkDocument).scene, app.documentsForView()),
      );
    if (others.length) {
      box.append(element('p', 'muted', 'Available for'));
      const row = element('div', 'row');
      for (const doc of others)
        row.append(
          button(app.sceneName((doc.value as ChunkDocument).scene), () => app.openDocument(doc.id)),
        );
      box.append(row);
    }
    return box;
  }
  /** Sectioned forms mount into the frame's stage; the navigator lists their sections and follows re-renders. */
  const mountWorkbench = (
    item: (typeof app.workbenches)[number],
    context: WorkbenchContext,
  ): WorkbenchHandle => {
    if (item.config.layout !== 'sections') return item.config.mount(item.panel, context);
    const frame = createFrame(item.panel, {}, item.config.label ?? item.config.title),
      handle = item.config.mount(frame.stage, context),
      stop = sectionNavigator(frame.nav, frame.stage, item.config.id);
    const dispose = (() => {
      stop();
      handle();
      item.panel.classList.remove('framed');
      item.panel.replaceChildren();
    }) as WorkbenchHandle;
    if (handle.refresh) dispose.refresh = () => handle.refresh!();
    return dispose;
  };
  const sameDocuments = (a: readonly unknown[], b: readonly unknown[]) =>
    a === b || (a.length === b.length && a.every((doc, index) => doc === b[index]));
  const refreshWorkbench = (item: (typeof app.workbenches)[number], changed = false) => {
    if (!item.details.open) {
      item.dispose?.();
      item.dispose = undefined;
      return;
    }
    const documents = app.documentsForView(),
      relevant = item.config.documentIds
        ? documents.filter((doc) => item.config.documentIds!.includes(doc.id))
        : documents;
    // Document views are frozen and change identity only when their source changes, so identity is the version.
    const version: readonly unknown[] = item.config.documentDependent ? relevant : [],
      scene = app.sceneId(),
      sceneBound = item.config.area === 'scene';
    if (sceneBound && item.dispose && item.scene !== scene) {
      item.dispose();
      item.dispose = undefined;
    } else if (
      changed &&
      item.config.documentDependent &&
      !sameDocuments(version, item.documentsVersion) &&
      item.dispose
    ) {
      if (item.dispose.refresh) {
        item.documentsVersion = version;
        item.dispose.refresh();
      } else {
        item.dispose();
        item.dispose = undefined;
      }
    }
    if (item.details.open && !item.dispose) {
      item.documentsVersion = version;
      item.scene = scene;
      if (sceneBound && item.config.supports && !item.config.supports(scene, documents)) {
        item.panel.replaceChildren(emptyState(item.config, scene));
        item.dispose = (() => item.panel.replaceChildren()) as WorkbenchHandle;
        return;
      }
      if (sceneBound) item.config.showScene?.(scene, documents);
      const autostart = item.autostart;
      item.autostart = false;
      try {
        item.dispose = mountWorkbench(item, {
          get documents() {
            return app.documentsForView();
          },
          openConversation: app.openConversation,
          playScene: app.canPlay() ? app.playScene : undefined,
          sceneSnapshot,
          openComposition: app.openComposition,
          openCheckpoint: app.openCheckpoint,
          editCheckpoint: app.editCheckpoint,
          openSequence: app.openSequence,
          openScene: app.openScene,
          openInstance: app.openInstance,
          ...(sceneBound ? { scene } : {}),
          ...(autostart ? { autostart } : {}),
          ...(item.config.authoring ? { authoring: app.authoringApi() } : {}),
        });
      } catch (error) {
        item.panel.replaceChildren(
          element('p', 'error', `Workbench unavailable: ${message(error)}`),
        );
      }
    }
  };
  /** Copy the stage as last drawn, with its bounds, rather than render the chunk a second time. */
  function captureStage() {
    const result = app.painting.result,
      from = app.canvas;
    if (!result || !from.width || !from.height || !from.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.width = from.width;
    canvas.height = from.height;
    canvas.getContext('2d')?.drawImage(from, 0, 0);
    app.stagePicture = { canvas, result, document: app.currentId };
  }
  function sceneSnapshot(chunk: string, instances: readonly string[]): SceneSnapshot | undefined {
    if (app.root.dataset.tool === 'scene') captureStage();
    const picture = app.stagePicture;
    if (!picture) return undefined;
    const { result } = picture;
    // A picture of another chunk would mislead; show none until Layout draws this one.
    if (
      picture.document !== chunk &&
      !Object.values(result.sources ?? {}).some((source) => source.document === chunk)
    )
      return undefined;
    // Crop to the chunk's own region (else everything drawn) so the strip shows the scene, not the workspace margin.
    const full = { x: 0, y: 0, width: picture.canvas.width, height: picture.canvas.height },
      region = result.regions?.find((r) => r.document === chunk),
      drawn = result.bounds.reduce<typeof full | undefined>((box, b) => {
        if (!box) return { x: b.x, y: b.y, width: b.width, height: b.height };
        const x = Math.min(box.x, b.x),
          y = Math.min(box.y, b.y);
        return {
          x,
          y,
          width: Math.max(box.x + box.width, b.x + b.width) - x,
          height: Math.max(box.y + box.height, b.y + b.height) - y,
        };
      }, undefined),
      want = region ?? drawn ?? full,
      x = Math.max(0, Math.floor(want.x)),
      y = Math.max(0, Math.floor(want.y)),
      crop = {
        x,
        y,
        width: Math.max(1, Math.min(full.width, Math.ceil(want.x + want.width)) - x),
        height: Math.max(1, Math.min(full.height, Math.ceil(want.y + want.height)) - y),
      };
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    canvas
      .getContext('2d')
      ?.drawImage(
        picture.canvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
    const boxes = result.bounds
      .filter((box) => {
        const source = result.sources?.[box.id];
        return source
          ? source.document === chunk && instances.includes(source.instance)
          : instances.includes(box.id);
      })
      .map(({ x, y, width, height }) => ({ x: x - crop.x, y: y - crop.y, width, height }));
    return { canvas, boxes };
  }
  /** One panel at a time: opening any closes the others. */
  const closeOthers = (details: HTMLDetailsElement) => {
    if (details.open)
      app.panels.forEach((other) => {
        if (other.details !== details) other.details.open = false;
      });
  };
  return {
    hiddenIn,
    speedControl,
    panelGroup,
    showLayout,
    openPanel,
    showGroup,
    activeWorkspace,
    sequenceChoices,
    openWorkspace,
    refreshTools,
    refreshMode,
    emptyState,
    mountWorkbench,
    sameDocuments,
    refreshWorkbench,
    closeOthers,
  };
}
