import { mountSpatialHandles } from './spatial-handles';
import { mountNumericScrubbing } from './numeric-scrub';
import { createViewMemory } from './view-memory';
import { createSelection } from './selection';
import { createPreviewState, createPreviewRenderer } from './preview-integration';
import { createInspector } from './inspector';
import { createViewportState, mountViewportInput } from './viewport-input';
import {
  element,
  button,
  createFieldControls,
  enhanceLongSelects,
  demoteLeadingNotes,
} from './controls';
import { mountCommandSearch } from './command-search';
import { workspaceDocuments } from './workspace';
import { sequenceProgram } from '../art/core/sequence';
import { mountPerformancePanel } from '../runtime/diagnostics/performance-panel';
import { composerStyles } from './styles';
import { frameStyles } from './frame';
import { ARTWORK_DRAG } from './asset-browser';
import { createThumbnails } from './asset-thumbnails';
import { presetsFor } from './kit-presets';
import { chipStyles } from './kind-chips';
import { ComposerModel } from './composer-model';
import type { WorkbenchHandle, ComposerConfig } from './contracts';
import { message, type Group, type Composer } from './app/context';
import { chromeArea } from './app/chrome';
import { navigationArea } from './app/navigation';
import { workspacesArea } from './app/workspaces';
import { viewportArea } from './app/viewport';
import { editingArea } from './app/editing';
import { playArea } from './app/play';
import { persistenceArea } from './app/persistence';
import { timelineArea } from './app/timeline';
import { headerArea } from './app/header';
import { inspectorArea } from './app/inspector';
import { outlineArea } from './app/outline';
import { appearanceArea } from './app/appearance';
import { worldArea } from './app/world';

/**
 * Local static/animated composition editor. Drawing belongs to the injected game preview.
 *
 * mountComposer builds the editor shell in order (DOM, state, event wiring) around one shared
 * `app` context (app/context.ts). Each module in app/ adds one area's functions to it: chrome,
 * navigation, persistence, workspaces, play, header, outline, inspector, appearance, timeline,
 * viewport, world and editing. Within an area, functions call each other directly; shared state
 * and calls into other areas go through `app`.
 */
export function mountComposer(host: HTMLElement, config: ComposerConfig) {
  const app = {} as Composer;
  app.config = config;
  Object.assign(
    app,
    chromeArea(app),
    navigationArea(app),
    workspacesArea(app),
    viewportArea(app),
    editingArea(app),
    playArea(app),
    persistenceArea(app),
    timelineArea(app),
    headerArea(app),
    inspectorArea(app),
    outlineArea(app),
    appearanceArea(app),
    worldArea(app),
  );
  app.painting = createPreviewState();
  app.viewport = createViewportState();
  ({ numberInput: app.numberInput, fieldInput: app.fieldInput } = createFieldControls(
    (text, error) => app.notice(text, error),
    (section) => {
      app.inspector.selectSection(section);
      app.refreshRight();
    },
    () =>
      JSON.stringify([
        app.currentId,
        app.editorSelection.document,
        app.editorSelection.instance,
        app.editorSelection.timeline?.kind,
      ]),
  ));
  app.model = new ComposerModel(
    config.registry,
    { destinations: config.destinations, clips: config.clips, motionTracks: config.motionTracks },
    config.validateDocument,
    config.projections,
    config.destinationsFor,
    config.validationInputs,
  );
  app.commandTargetsCache = {};

  app.documentSnapshot = [];
  app.root = element('section', 'scene-composer');
  app.root.setAttribute('aria-label', 'World and animation composer');
  const style = element('style');
  style.textContent = composerStyles + frameStyles + chipStyles;
  app.root.append(style);
  app.header = element('header');
  app.status = element('div', 'status', 'Loading authoring documents…');
  app.status.setAttribute('role', 'status');
  app.status.setAttribute('aria-live', 'polite');
  app.workspace = element('div', 'workspace');
  app.left = element('aside');
  app.center = element('div', 'preview-column');
  app.right = element('aside', 'inspector-dock');
  app.left.setAttribute('aria-label', 'World outline');
  app.right.setAttribute('aria-label', 'Inspector');
  app.dockWorkspace = '';
  const statusBar = element('footer', 'status-bar');
  app.modeChip = element('span', 'mode-chip');
  app.contextLine = element('span', 'status-context');
  const dockToggles = element('span', 'dock-toggles');
  /** Errors never pass silently: the frame loop, uncaught errors and rejected promises show here with their details. */
  app.errorChip = button(
    '',
    () => {
      app.errorList.hidden = !app.errorList.hidden;
      if (!app.errorList.hidden) app.renderErrors();
    },
    'Show editor errors',
  );
  app.errorChip.className = 'error-chip';
  app.errorChip.hidden = true;
  app.errorList = element('div', 'error-list');
  app.errorList.hidden = true;
  app.errorList.setAttribute('role', 'dialog');
  app.errorList.setAttribute('aria-label', 'Editor errors');
  app.errorLog = [];
  const saveState = element(
    'span',
    'save-state',
    config.api ? 'Local · saves to source' : 'Public · edits download as a file',
  );
  statusBar.setAttribute('aria-label', 'Editor status');
  app.dockButtons = (['left', 'right'] as const).map((side) => {
    const toggle = button(
      side === 'left' ? 'Outline' : 'Inspector',
      () => app.setDockClosed(side, !app.root.hasAttribute(`data-${side}-closed`)),
      `Show or hide the ${side === 'left' ? 'outline' : 'inspector'} dock`,
    );
    dockToggles.append(toggle);
    return toggle;
  });
  /** Workspace defaults before the author resizes anything: Animate trades dock width for the timeline. */
  app.DOCK_DEFAULTS = { animate: { left: 220, right: 280 } };
  /** Ctrl+Space maximises the region under the pointer and restores it again. */
  app.pointerRegion = 'center';
  app.documentSwitch = element('div', 'document-switch');
  app.searchField = button(
    '',
    () => app.searchUi.open(),
    'Search objects, commands, settings and library (Ctrl K)',
  );
  app.searchField.className = 'search-field';
  app.searchField.append(
    element('span', '', 'Search objects, commands, settings…'),
    element('kbd', '', 'Ctrl K'),
  );
  /** Layout's folded bottom dock: the timeline and the editor's errors. */
  const bottomStrip = element('div', 'bottom-strip');
  const timelineTab = button(
    '▴ Timeline',
    () => app.openWorkspace('animate'),
    'Open the timeline (Animate workspace)',
  );
  app.errorsTab = button(
    'Errors',
    () => {
      app.errorList.hidden = !app.errorList.hidden;
      if (!app.errorList.hidden) app.renderErrors();
    },
    'Show editor errors',
  );
  bottomStrip.append(timelineTab, app.errorsTab);
  app.options = element('div', 'preview-options');
  app.stageWrap = element('div', 'stage-wrap');
  app.stage = element('div', 'preview-stage');
  app.canvas = element('canvas');
  const previewError = element('div', 'preview-error');
  app.joinedLayer = element('div', 'joined-tags');
  app.joinedLayer.setAttribute('aria-label', 'Joined scenes');
  app.viewportTools = element('div', 'viewport-tools');
  app.hoverBox = element('div', 'hover-box');
  app.selectionBox = element('div', 'hover-box selection-box');
  app.selectionBox.hidden = true;
  app.viewportTools.setAttribute('role', 'group');
  app.viewportTools.setAttribute('aria-label', 'Preview zoom');
  app.hoverBox.hidden = true;
  app.picker = element('div', 'add-picker');
  app.picker.setAttribute('role', 'dialog');
  app.picker.setAttribute('aria-label', 'Add asset');
  app.picker.hidden = true;
  app.baseWidth = config.viewport?.width ?? 960;
  app.baseHeight = config.viewport?.height ?? 540;
  app.canvas.width = app.baseWidth;
  app.canvas.height = app.baseHeight;
  app.canvas.setAttribute(
    'aria-label',
    'Game renderer preview. Click assets to select it, click empty space to deselect, drag the selected asset to move it, drag elsewhere to pan, Ctrl+wheel or pinch to zoom, Delete removes the selection.',
  );
  app.canvas.tabIndex = 0;
  previewError.hidden = true;
  app.timelineHost = element('section', 'timeline');
  app.timelineHost.setAttribute('aria-label', 'Animation timeline');
  app.tools = element('nav', 'tools');
  app.tools.setAttribute('aria-label', 'Editor tools');
  app.layerQuery = '';
  app.layerSort = 'order';
  app.roleOpen = new Map<string, boolean>();
  /** The selection the outline last unfolded for; a section folded after that stays folded. */
  app.revealed = '';
  /** The outline's eyes: objects hidden in the editor preview, per composition document. View state only. */
  app.hiddenByDocument = new Map<string, Set<string>>();
  app.animating = false;
  app.updateContextSummary = () => {};
  app.inspector = createInspector();
  app.canvas.style.setProperty('--ratio', String(app.canvas.width / app.canvas.height));
  /** Scene overlays. Preview-only settings sit in their own dashed bar; Camera and Show menus keep their open state across refreshes. */
  app.previewBar = element('div', 'preview-bar');
  app.previewBar.setAttribute('role', 'group');
  app.previewBar.setAttribute('aria-label', 'Preview settings');
  app.cameraMenu = app.overlayMenu('Camera', 'Locate, follow or look through the game camera');
  app.showMenu = app.overlayMenu(
    'Show',
    'Borders, outlines, neighbours, comparison and preview settings',
  );
  app.showSlot = element('div', 'ov-menu-extra');
  app.viewMenus = element('div', 'view-menus');
  app.viewMenus.append(app.cameraMenu.menu, app.showMenu.menu);
  app.modeBanner = element('div', 'mode-banner');
  app.bannerTitle = element('strong');
  app.bannerDetail = element('span');
  app.bannerAction = button('', () => {
    if (!app.playHost.hidden) app.stopPlay();
    else app.openWorkspace('layout');
  });
  app.modeBanner.append(
    app.bannerTitle,
    app.bannerDetail,
    element('span', 'status-spacer'),
    app.bannerAction,
  );
  app.modeBanner.hidden = true;
  app.modeBanner.setAttribute('role', 'status');
  app.crumb = element('span', 'crumb');
  app.crumb.setAttribute('aria-label', 'Selection');
  app.pickList = element('div', 'pick-list');
  app.pickList.hidden = true;
  app.pickList.setAttribute('role', 'menu');
  app.pickList.setAttribute('aria-label', 'Objects under the pointer');
  app.playHost = element('div', 'stage-play');
  app.playHost.hidden = true;
  app.playHost.setAttribute('aria-label', 'Play session');
  app.playSettings = element('section', 'play-settings');
  app.compareCanvas = element('canvas');
  app.compareCanvas.hidden = true;
  app.compareCanvas.className = 'compare';
  app.compareCanvas.setAttribute('aria-label', 'Comparison preview, read-only');
  app.stage.append(app.canvas, app.compareCanvas);
  app.renderStatus = element('output', 'render-status');
  app.renderStatus.setAttribute('aria-label', 'Preview render rate');
  app.stageWrap.append(
    app.stage,
    app.playHost,
    app.joinedLayer,
    app.hoverBox,
    app.selectionBox,
    app.modeBanner,
    app.previewBar,
    app.viewportTools,
    app.viewMenus,
    app.pickList,
    app.picker,
    previewError,
    app.renderStatus,
  );
  app.center.append(app.options, app.stageWrap, app.timelineHost, bottomStrip);
  app.workspace.append(app.center, app.left, app.right, ...app.panelHandles(), ...app.dockStrips());
  app.header.append(app.tools);
  statusBar.append(
    app.modeChip,
    app.crumb,
    app.contextLine,
    app.status,
    element('span', 'status-spacer'),
    app.errorChip,
    dockToggles,
    saveState,
  );
  app.root.append(app.header, app.workspace, statusBar, app.errorList);
  /** Ctrl K: objects in the open composition, editor commands, settings with their location, and library pieces. */
  app.searchUi = mountCommandSearch(app.root, () => app.withViewDocuments(app.collectSearch));
  /** Presentation passes over freshly rendered panels: long option lists get search; leading explanations fold away. */
  let tidyQueued = false;
  const tidy = new MutationObserver(() => {
    if (tidyQueued) return;
    tidyQueued = true;
    queueMicrotask(() => {
      tidyQueued = false;
      tidy.disconnect();
      try {
        enhanceLongSelects(app.root);
        demoteLeadingNotes(app.right);
        for (const name of app.right.querySelectorAll<HTMLElement>(
          'label>span:first-child:not([title])',
        ))
          if ((name.textContent ?? '').length > 16) name.title = name.textContent!;
        for (const panel of app.root.querySelectorAll<HTMLElement>(
          '.inspector-body,.inspector-mount,.inspector-task',
        ))
          demoteLeadingNotes(panel);
      } finally {
        tidy.observe(app.root, { childList: true, subtree: true });
      }
    });
  });
  tidy.observe(app.root, { childList: true, subtree: true });
  app.stageWrap.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes(ARTWORK_DRAG) && app.playHost.hidden) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      app.stageWrap.dataset.dropping = '';
    }
  });
  app.stageWrap.addEventListener('dragleave', () => {
    delete app.stageWrap.dataset.dropping;
  });
  app.stageWrap.addEventListener('drop', (event) => {
    delete app.stageWrap.dataset.dropping;
    const raw = event.dataTransfer?.getData(ARTWORK_DRAG);
    if (!raw) return;
    event.preventDefault();
    const { kit, preset } = JSON.parse(raw) as { kit: string; preset?: string },
      saved = preset ? presetsFor(app.presetsDoc(), kit).find((p) => p.id === preset) : undefined;
    void app.addAtView(kit, saved?.props, saved?.children, event.clientX);
  });
  app.workspace.addEventListener('pointermove', (event) => {
    const target = event.target as Node;
    app.pointerRegion = app.left.contains(target)
      ? 'left'
      : app.right.contains(target)
        ? 'right'
        : app.timelineHost.contains(target)
          ? 'timeline'
          : 'center';
  });
  host.append(app.root);
  /** The panel named in the URL at startup; the URL is only rewritten once it has been opened. */
  // An editor link: `#characters` opens a panel; `#scene=downtown-next&compare=downtown&panel=characters` also opens a scene.
  app.linkQuery = location.hash.includes('=')
    ? new URLSearchParams(location.hash.slice(1))
    : undefined;
  app.linkedPanel = app.linkQuery
    ? (app.linkQuery.get('panel') ?? '')
    : decodeURIComponent(location.hash.slice(1));
  app.linked = false;

  app.workspaceId = '';
  app.directionDocumentId = '';
  app.compareId = '';
  app.currentId = '';
  app.sequenceId = '';
  app.time = 0;
  app.playing = false;
  app.loop = false;
  app.loopFrom = 0;
  app.loopTo = 0;
  app.reduced = false;
  app.overlays = true;
  app.snap = 1;
  app.saving = false;
  app.disposed = false;
  /** Editor-only framing: persisted as a workspace preference, never authored source or a game save. */
  app.boundaryFor = '';
  app.sequenceNav = { zoom: 1, x: 0, y: 0 };
  app.cameraPreview = false;
  app.followCamera = false;
  app.showObjectOutlines = false;
  app.showSceneBounds = true;
  app.showChunkStatus = false;
  app.renderWindow = performance.now();
  app.renderFps = 0;
  app.statusUpdatedAt = 0;
  try {
    app.showObjectOutlines =
      localStorage.getItem('access-denied.editor.object-outlines') === 'true';
  } catch {
    /* optional preview preference */
  }

  app.editorSelection = createSelection();

  app.inspectorError = '';
  app.numericScrubbing = false;
  app.cancelNumericScrub = () => {};
  let numericSourceVersion: object | undefined;

  app.timelineView = { zoom: 1, collapsed: new Set(), scrollX: 0, scrollY: 0 };
  app.timelineCollapsed = false;
  app.timelineHeight = 240;
  app.playbackSpeed = 1;
  app.dragPreviewDirty = false;
  app.environment = {
    cameraX: 0,
    zoom: 1,
    ...config.initialEnvironment,
  };
  app.viewMemory = createViewMemory({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  app.sequenceTimes = new Map<string, number>();
  app.ambientOffset = 0;
  app.timelineSettingsOpen = false;
  app.viewReady = false;
  app.lastViewSample = 0;
  app.pixelatedScaling = true;

  app.assetSession = {};
  app.assetHost = element('details', 'asset-browser tool-panel');
  app.assetHost.dataset.tool = 'assets';
  app.assetHost.append(element('summary', '', 'Asset library'));
  app.assetPanel = element('div');
  app.assetHost.append(app.assetPanel);
  if (config.assetPreview) app.root.insertBefore(app.assetHost, app.workspace);
  app.layoutDirty = false;
  app.mapHost = element('details', 'world-map tool-panel');
  app.mapHost.dataset.tool = 'world-map';
  app.mapHost.append(element('summary', '', 'City map'));
  app.mapPanel = element('div');
  app.mapHost.append(app.mapPanel);
  if (config.worldPanel) app.root.insertBefore(app.mapHost, app.workspace);
  /** Artwork pictures for the Add picker and the Library, drawn by the same isolated game preview. */

  app.thumbnails = config.assetPreview
    ? createThumbnails((target, entry) =>
        config.assetPreview!(
          target,
          entry,
          entry.preview === 'standalone'
            ? undefined
            : (entry.usages.find((usage) => !usage.scene.startsWith('sequence-')) ??
                entry.usages[0]),
          (app.thumbnailDocuments ??= app.model.list()),
          { time: 0, reduced: true, environment: { ...config.initialEnvironment, renderScale: 1 } },
        ),
      )
    : undefined;
  app.workbenches = (config.workbenches ?? []).map((workbench) => {
    const details = element('details', 'workbench-screen tool-panel'),
      panel = element('section');
    details.dataset.workbench = details.dataset.tool = workbench.id;
    details.append(element('summary', '', workbench.title), panel);
    if (workbench.beside) {
      details.classList.add('stage-panel');
      app.workspace.append(details);
    } else app.root.insertBefore(details, app.workspace);
    return {
      config: workbench,
      details,
      panel,
      dispose: undefined as WorkbenchHandle | undefined,
      documentsVersion: [] as readonly unknown[],
      scene: '',
      autostart: false,
    };
  });
  /**
   * Scene is the editor itself: outline, viewport and an inspector for the selection. Logic lists all of
   * the scene's logic at once and Play runs it; both act on the scene chosen in the header. Library,
   * World and Labs are not tied to a scene. The header has one tab for the scene (Layout and Logic are its two views,
   * chosen in the row below beside the scene picker) and one each for Library, World and Labs.
   */
  app.groups = [
    {
      id: 'layout',
      label: 'Layout',
      title: 'Arrange chunks and artwork: scene preview, outline and inspector',
    },
    {
      id: 'animate',
      label: 'Animate',
      title: 'Edit a sequence over the same scene: timeline, keys and camera',
    },
    {
      id: 'logic',
      label: 'Logic',
      title: 'Interactions, story, dialogue, devices and wiring for the chosen chunk',
    },
    { id: 'world', label: 'World', title: 'The city map, travel and shared world definitions' },
    { id: 'labs', label: 'Review', title: 'Run configurations, review shortcuts and test worlds' },
    {
      id: 'library',
      label: 'Library',
      title: 'Artwork, characters, vehicles and other shared pieces',
    },
  ] as const;
  /** Shared logic definitions live with the chunk logic that uses them. */
  app.LOGIC_LIBRARY = new Set(['conversations', 'story-logic']);
  app.panels = [
    ...(config.assetPreview
      ? [
          {
            details: app.assetHost,
            label: 'Assets',
            title: 'Asset library',
            group: 'library' as Group,
          },
        ]
      : []),
    ...(config.worldPanel
      ? [
          {
            details: app.mapHost,
            label: 'City map',
            title: 'City map · open a place to edit it',
            group: 'world' as Group,
          },
        ]
      : []),
    // Wiring panels follow the logic panels under Logic.
    // Play is not a panel: it runs on the Scene stage in place of the canvas.
    ...[...app.workbenches]
      .filter((item) => !(item.config.area === 'scene' && item.config.mode === 'play'))
      .sort(
        (a, b) =>
          Number(app.LOGIC_LIBRARY.has(a.config.id)) - Number(app.LOGIC_LIBRARY.has(b.config.id)) ||
          Number(a.config.mode === 'wiring') - Number(b.config.mode === 'wiring'),
      )
      .map((item) => ({
        details: item.details,
        label: item.config.label ?? item.config.title.split(' · ')[0],
        title: item.config.title,
        group: app.panelGroup(item.config),
      })),
  ];
  app.chosen = new Map<Group, HTMLDetailsElement>();
  app.group = 'layout';
  app.subtools = element('nav', 'subtools');
  app.subtools.setAttribute('aria-label', 'Panels in this workspace');
  app.root.insertBefore(app.subtools, app.header.nextSibling);
  /** The scene picker, filled by refreshHeader; it leads the second row while the Scene tab is open. */
  app.sceneContext = element('div', 'scene-context');
  /** Play runs the game on the Scene stage, in place of the canvas; Stop returns to editing at the same spot. */

  app.playStartMode = 'preview';
  app.locateCameraPending = false;
  app.chunkSignature = '';
  app.runtimeOutline = element('div', 'runtime-chunks');
  app.runtimeOutline.hidden = true;
  app.lastDirection = '';
  app.lastTool = '';
  app.workbenches.forEach(
    (item) =>
      (item.details.ontoggle = () => {
        app.closeOthers(item.details);
        app.refreshWorkbench(item);
        app.refreshTools();
      }),
  );
  app.assetHost.ontoggle = () => {
    app.closeOthers(app.assetHost);
    app.refreshLibrary();
    app.refreshTools();
  };
  app.mapHost.ontoggle = () => {
    app.closeOthers(app.mapHost);
    app.refreshMap();
    app.refreshTools();
  };
  app.refreshTools();
  app.refreshHeaderActions = () => {};
  // The frame loop and every draw ask for the open sequence; it is compiled once per document version.
  app.timelines = new WeakMap<object, ReturnType<typeof sequenceProgram>>();

  /** Opens the panel named in the URL once, on the first load. */
  /** A link can open a scene (`#scene=downtown-next`), optionally beside another (`&compare=downtown`), once on load. */
  app.sceneLinked = false;
  app.outlineSceneOwners = new Map<string, string>();
  app.outlineSourceOpen = app.readFolds('source-folds');
  for (const [key, value] of app.readFolds('kind-folds')) app.roleOpen.set(key, value);
  app.outlineVersion = '';
  app.outlineView = '';
  app.updateOutlineSelection = () => {};
  app.leftTab = 'outline';
  /** Library entries open as panels in the Layout workspace; ◂ Scene returns to the scene. */

  // The library and world map rebuild only when what they show changed: the source version, the chunk or their open state.
  app.libraryShown = [];
  app.mapShown = [];
  app.disposeInspector = app.inspector.dispose;
  app.propertyUpdates = [];
  app.showInternalAttach = false;
  app.inspectorFolds = app.readFolds('inspector-folds');
  app.displayedPropertyLinks = '';
  /** The Add picker: searchable pictures of every registered piece, placed at the centre of the view. */

  app.picker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      app.closePicker();
      app.canvas.focus();
    }
  });

  app.previewRenderer = createPreviewRenderer({
    get reduced() {
      return app.reduced;
    },
    get disposed() {
      return app.disposed;
    },
    get emptyWorkspace() {
      return (
        !!app.workspaceId &&
        !workspaceDocuments(
          app.workspaceId,
          app.documentsForView(),
          app.worldState()?.checkpoint?.membership,
        ).length
      );
    },
    get painting() {
      return app.painting;
    },
    get viewCompositionDocument() {
      return app.viewCompositionDocument;
    },
    get previewError() {
      return previewError;
    },
    get current() {
      return app.current;
    },
    get canvas() {
      return app.canvas;
    },
    get syncWorldState() {
      return app.syncWorldState;
    },
    get currentTimeline() {
      return app.currentTimeline;
    },
    get selectedDocumentId() {
      return app.editorSelection.document;
    },
    get viewport() {
      return app.viewport;
    },
    get evaluationContext() {
      return app.evaluationContext;
    },
    get sequence() {
      return app.sequence;
    },
    get sequenceId() {
      return app.sequenceId;
    },
    get time() {
      return app.time;
    },
    get previewRequest() {
      return app.previewRequest;
    },
    get currentId() {
      return app.currentId;
    },
    get sizeCanvas() {
      return app.sizeCanvas;
    },
    get baseWidth() {
      return app.previewSize().width;
    },
    get baseHeight() {
      return app.previewSize().height;
    },
    get config() {
      return config;
    },
    get overlays() {
      return app.overlays;
    },
    get updateRenderStatus() {
      return app.updateRenderStatus;
    },
    get placeHover() {
      return app.placeHover;
    },
    get placeJoined() {
      return app.placeJoined;
    },
    get presented() {
      return () => {
        app.inspector.updateResolved();
        app.syncLinkedProperties();
        if (app.followCamera && !app.cameraPreview && app.painting.result?.camera) {
          const focus = app.painting.result.camera.focus,
            nav = app.workspaceNavigation();
          app.sequenceNav.x += focus.x - nav.x;
          app.sequenceNav.y += focus.h - nav.h;
          app.sequenceNav.zoom = focus.zoom;
          const readout = app.viewportTools.querySelector<HTMLElement>('[data-workspace-zoom]');
          if (readout) readout.textContent = Math.round(app.sequenceNav.zoom * 100) + '%';
        }
        if (app.locateCameraPending && app.painting.result?.camera) {
          app.locateCameraPending = false;
          app.locateCamera();
        }
      };
    },
    get comparing() {
      return app.comparing;
    },
    get documentsForView() {
      return app.documentsForView;
    },
    get compareId() {
      return app.compareId;
    },
    get stage() {
      return app.stage;
    },
    get compareCanvas() {
      return app.compareCanvas;
    },
  });
  const viewportObserver = new ResizeObserver(() => {
    if (!app.disposed && app.playHost.hidden && app.group === 'layout' && app.dynamicWorkspace())
      void app.draw();
  });
  viewportObserver.observe(app.stage);
  app.pickListOpened = 0;
  app.spatialHandles = mountSpatialHandles(app.stageWrap, app.canvas);
  app.resizeFeedback = element('output', 'spatial-feedback');
  app.resizeFeedback.hidden = true;
  app.resizeFeedback.setAttribute('aria-label', 'Resize values');
  app.stageWrap.append(app.resizeFeedback);
  /**
   * Stage input: a left press on artwork selects it at once and drags it after a 3 px move; a left press on empty
   * space (the picture, the dark area around it or the comparison) deselects. Middle and right drag pan (right also
   * covers a pen's barrel button); one finger pans on empty space and two fingers pinch-zoom.
   */
  const disposeViewportInput = mountViewportInput({
    spatialFeedback: app.spatialFeedback,
    beginGesture: () => {
      if (app.playing || app.animating) {
        app.playing = false;
        app.animating = false;
        app.refreshOptions();
      }
    },
    focusArtwork: (id) => {
      const source = app.painting.result?.sources?.[id];
      void app.focusArtwork(
        source?.document ?? app.compositionDocument()?.id ?? app.currentId,
        source?.instance ?? id,
      );
    },
    manualNavigation: app.stopFollowing,
    get navigable() {
      return app.navigable;
    },
    get viewport() {
      return app.viewport;
    },
    get sequenceNav() {
      return app.sequenceNav;
    },
    get stage() {
      return app.stage;
    },
    get canvas() {
      return app.canvas;
    },
    get selectedId() {
      return app.editorSelection.instance;
    },
    get select_() {
      return app.select_;
    },
    get closePicker() {
      return app.closePicker;
    },
    get coordinates() {
      return app.coordinates;
    },
    get hitTest() {
      return app.hitTest;
    },
    cycleAt: app.cycleAt,
    listAt: app.listAt,
    get preview() {
      return app.painting.result;
    },
    get compositionDocument() {
      return app.compositionDocument;
    },
    get zoomTo() {
      return app.zoomTo;
    },
    get cameraPreview() {
      return app.cameraPreview;
    },
    get draw() {
      return app.draw;
    },
    get placeHover() {
      return app.placeHover;
    },
    get snap() {
      return app.snap;
    },
    get config() {
      return config;
    },
    get dragPreviewDirty() {
      return app.dragPreviewDirty;
    },
    set dragPreviewDirty(value) {
      app.dragPreviewDirty = value;
    },
    get notice() {
      return app.notice;
    },
    get refreshOptions() {
      return app.refreshOptions;
    },
    get run() {
      return app.run;
    },
    get commitDrag() {
      return app.commitDrag;
    },
    get validateDrag() {
      return app.validateDrag;
    },
    get model() {
      return app.model;
    },
    get placeJoined() {
      return app.placeJoined;
    },
    get compareCanvas() {
      return app.compareCanvas;
    },
    get editInstance() {
      return app.editInstance;
    },
    get current() {
      return app.current;
    },
    get openPicker() {
      return app.openPicker;
    },
    get fit() {
      return app.fit;
    },
  });
  const disposeNumericScrubbing = mountNumericScrubbing(app.root, {
    begin: (label) => {
      numericSourceVersion = app.model.sourceVersion;
      const edit = app.model.beginInteraction(label);
      app.playing = false;
      app.animating = false;
      app.numericScrubbing = true;
      app.updateTime();
      return { commit: edit.commit, cancel: edit.cancel };
    },
    changed: () => {
      app.numericScrubbing = false;
      const sourceChanged = app.model.sourceVersion !== numericSourceVersion;
      if (sourceChanged) {
        app.thumbnailDocuments = undefined;
        app.thumbnails?.invalidate();
      }
      app.refresh();
      if (sourceChanged && !app.picker.hidden) app.renderPicker();
    },
    error: (error) => app.notice(message(error), true),
  });
  app.cancelNumericScrub = disposeNumericScrubbing.cancel;
  window.addEventListener('beforeunload', app.unload);
  window.addEventListener('error', app.onWindowError);
  window.addEventListener('unhandledrejection', app.onRejection);
  window.addEventListener('hashchange', app.navigateEditorLink);
  document.addEventListener('keydown', app.keyboard);
  document.addEventListener('keydown', app.shortcuts);
  document.addEventListener('click', app.closeMenu);
  app.previous = performance.now();
  app.frameId = 0;
  app.frameId = requestAnimationFrame(app.tick);
  void app.load();
  const disposePerformance = mountPerformancePanel(
    app.root,
    () => ({
      editor: true,
      scene: app.sceneId(),
      selected: app.editorSelection.instance,
      zoom: app.sequenceNav.zoom,
      comparison: app.compareId,
    }),
    new URLSearchParams(location.search).has('perf') || !!app.linkQuery?.has('profile-editor'),
  );
  return {
    model: app.model,
    openScene: app.openScene,
    reload: app.load,
    save: app.save,
    dispose() {
      app.rememberView();
      app.disposed = true;
      viewportObserver.disconnect();
      disposeNumericScrubbing();
      app.chunkInspectorHandle?.();
      app.cancelWorldDrag?.();
      disposeViewportInput();
      tidy.disconnect();
      app.searchUi.dispose();
      app.spatialHandles.dispose();
      app.timelineGrid?.dispose();
      disposePerformance();
      app.playHandle?.();
      app.playHandle = undefined;
      cancelAnimationFrame(app.frameId);
      app.cleanupWorld?.();
      app.cleanupAssets?.();
      app.disposeInspector();
      app.thumbnails?.dispose();
      app.workbenches.forEach((item) => item.dispose?.());
      window.removeEventListener('beforeunload', app.unload);
      window.removeEventListener('error', app.onWindowError);
      window.removeEventListener('unhandledrejection', app.onRejection);
      window.removeEventListener('hashchange', app.navigateEditorLink);
      document.removeEventListener('keydown', app.keyboard);
      document.removeEventListener('keydown', app.shortcuts);
      document.removeEventListener('click', app.closeMenu);
      app.root.remove();
    },
  };
}
