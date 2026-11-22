/** The editor's shared context: state, DOM parts and the functions every area exposes. mountComposer (app.ts) creates it once per editor. */
import { type InspectorTask } from '../inspector-task';
import { type WorldMemberAddress } from '../world-members';
import { type WorldWorkspaceControls } from '../world-workspace-controls';
import { type ChunkStatus } from '../../runtime/chunk-status';
import { createInspector } from '../inspector';
import { type SearchEntry } from '../command-search';
import {
  mountTimelineGrid,
  type TimelineSelection,
  type TimelineViewState,
} from '../timeline-view';
import {
  type ChunkDocument,
  type AssetInstance,
  type Field,
  type Value,
  type Properties,
} from '../../art/core/composition';
import {
  type TimelineProgram,
  type TimelineFrame,
  type Sequence,
  type Target,
} from '../../art/core/timeline';
import { type AssetBrowserSession, type AssetEntry } from '../asset-browser';
import { type KitPreset, type KitPresets } from '../kit-presets';
import { ComposerModel } from '../composer-model';
import type {
  EditorDocument,
  PreviewRequest,
  PreviewResult,
  EnvironmentControl,
  WorkbenchContext,
  WorkbenchHandle,
  ComposerConfig,
  WorkbenchConfig,
} from '../contracts';

export const copy = <T>(value: T): T => structuredClone(value);
/** The outline's mark for a level barrier (a padlock), so barriers and their Access rules are easy to find. */
export const BARRIER_ICON =
  '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
export const flatten = (doc: ChunkDocument) => {
  const list: { node: AssetInstance; depth: number }[] = [];
  const visit = (nodes: AssetInstance[], depth: number) =>
    nodes.forEach((node) => {
      list.push({ node, depth });
      visit(node.children ?? [], depth + 1);
    });
  visit(doc.instances, 0);
  return list;
};
export const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Dock layout per workspace: widths, closed docks and a maximised region. View preferences (localStorage), never source. */
export type DockState = {
  left?: number;
  right?: number;
  leftClosed?: boolean;
  rightClosed?: boolean;
  max?: string;
};
export type Workspace = 'world' | 'animate' | 'layout' | 'logic' | 'labs';
export type Group = 'world' | 'layout' | 'logic' | 'labs' | 'library';

export interface Composer {
  // state and parts shared across areas
  config: ComposerConfig;
  /** The stage's last picture, kept while a Logic panel hides it (rule view scene strip). */
  stagePicture?: { canvas: HTMLCanvasElement; result: PreviewResult; document: string };
  painting: {
    result: PreviewResult | undefined;
    resultDocument: string;
    previewGeneration: number;
    previewPending: boolean;
    renderAgain: boolean;
    workspaceAnchor: { document: string; x: number; h: number } | undefined;
    lastPaintMs: number;
    renderCount: number;
  };
  viewport: import('../viewport-input').ViewportState;
  numberInput: (
    value: number,
    apply: (n: number) => void,
    min?: number,
    step?: string,
  ) => HTMLInputElement;
  fieldInput: (
    field: Field,
    value: Value,
    apply: (v: Value) => void,
    identity?: string,
  ) => HTMLElement;
  model: ComposerModel;
  commandTargetsVersion: object | undefined;
  commandTargetsCache: NonNullable<
    import('../../art/core/timeline').TimelineContext['commandTargets']
  >;
  viewDocuments: EditorDocument[] | undefined;
  documentSnapshotVersion: object | undefined;
  documentSnapshot: EditorDocument[];
  root: HTMLElement;
  header: HTMLElement;
  status: HTMLDivElement;
  workspace: HTMLDivElement;
  left: HTMLElement;
  center: HTMLDivElement;
  right: HTMLElement;
  dockWorkspace: string;
  modeChip: HTMLSpanElement;
  contextLine: HTMLSpanElement;
  errorChip: HTMLButtonElement;
  errorList: HTMLDivElement;
  errorLog: { text: string; where: string; detail: string; count: number }[];
  dockButtons: HTMLButtonElement[];
  DOCK_DEFAULTS: Record<string, DockState>;
  pointerRegion: string;
  documentSwitch: HTMLDivElement;
  searchField: HTMLButtonElement;
  errorsTab: HTMLButtonElement;
  options: HTMLDivElement;
  stageWrap: HTMLDivElement;
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  joinedLayer: HTMLDivElement;
  viewportTools: HTMLDivElement;
  hoverBox: HTMLDivElement;
  selectionBox: HTMLDivElement;
  picker: HTMLDivElement;
  baseWidth: number;
  baseHeight: number;
  timelineHost: HTMLElement;
  tools: HTMLElement;
  layerQuery: string;
  layerSort: 'kind' | 'order';
  roleOpen: Map<string, boolean>;
  revealed: string;
  hiddenByDocument: Map<string, Set<string>>;
  animating: boolean;
  ambientLabel: HTMLElement | undefined;
  updateContextSummary: () => void;
  inspector: ReturnType<typeof createInspector>;
  previewBar: HTMLDivElement;
  cameraMenu: { menu: HTMLDetailsElement; panel: HTMLDivElement };
  showMenu: { menu: HTMLDetailsElement; panel: HTMLDivElement };
  showSlot: HTMLDivElement;
  viewMenus: HTMLDivElement;
  modeBanner: HTMLDivElement;
  bannerTitle: HTMLElement;
  bannerDetail: HTMLSpanElement;
  bannerAction: HTMLButtonElement;
  crumb: HTMLSpanElement;
  pickList: HTMLDivElement;
  playHost: HTMLDivElement;
  playSettings: HTMLElement;
  compareCanvas: HTMLCanvasElement;
  renderStatus: HTMLOutputElement;
  searchUi: { open(): void; close: () => void; readonly open_: boolean; dispose(): void };
  linkQuery: URLSearchParams | undefined;
  linkedPanel: string;
  linked: boolean;
  activeCheckpointId: string | undefined;
  workspaceId: string;
  directionDocumentId: string;
  compareId: string;
  currentId: string;
  sequenceId: string;
  time: number;
  playing: boolean;
  loop: boolean;
  loopFrom: number;
  loopTo: number;
  reduced: boolean;
  overlays: boolean;
  snap: number;
  saving: boolean;
  disposed: boolean;
  boundaryFor: string;
  sequenceNav: { zoom: number; x: number; y: number };
  cameraPreview: boolean;
  followCamera: boolean;
  showObjectOutlines: boolean;
  showSceneBounds: boolean;
  showChunkStatus: boolean;
  renderWindow: number;
  renderFps: number;
  statusUpdatedAt: number;
  timeLabel: HTMLElement | undefined;
  transportPlay: HTMLButtonElement | undefined;
  timelineGrid: ReturnType<typeof mountTimelineGrid> | undefined;
  editorSelection: import('../selection').EditorSelection;
  inspectorDraft:
    { request: InspectorTask; host: HTMLElement; selection: string; version: object } | undefined;
  placementIssue: { address: WorldMemberAddress; reason: string } | undefined;
  inspectorError: string;
  numericScrubbing: boolean;
  cancelNumericScrub: () => void;
  cancelWorldDrag: (() => void) | undefined;
  workspaceOrigin: { key: string; x: number; h: number } | undefined;
  worldDrag:
    | {
        source: import('../../world/compositions').WorldCompositions;
        address: WorldMemberAddress;
        at: { x: number; h: number };
        x: number;
        y: number;
        scale: number;
        pending?: import('../../world/compositions').WorldCompositions;
      }
    | undefined;
  timelineView: TimelineViewState;
  timelineCollapsed: boolean;
  timelineHeight: number;
  playbackSpeed: number;
  dragPreviewDirty: boolean;
  environment: Record<string, string | number | boolean>;
  viewMemory: {
    lastScene(): string;
    read(scene: string): import('../view-memory').EditorViewSnapshot | undefined;
    write(scene: string, view: import('../view-memory').EditorViewSnapshot): void;
  };
  sequenceTimes: Map<string, number>;
  ambientOffset: number;
  timelineSettingsOpen: boolean;
  viewReady: boolean;
  lastViewSample: number;
  restoredScroll: { x: number; y: number } | undefined;
  pixelatedScaling: boolean;
  cleanupWorld: void | (() => void);
  cleanupAssets: void | (() => void);
  assetSession: AssetBrowserSession;
  assetHost: HTMLDetailsElement;
  assetPanel: HTMLDivElement;
  cityDistrict: string | undefined;
  layoutDirty: boolean;
  mapHost: HTMLDetailsElement;
  mapPanel: HTMLDivElement;
  thumbnailDocuments: EditorDocument[] | undefined;
  thumbnails:
    | {
        prune: () => void;
        invalidate(): void;
        thumbnail(entry: AssetEntry): HTMLCanvasElement & { entry: AssetEntry };
        dispose(): void;
      }
    | undefined;
  workbenches: {
    config: WorkbenchConfig;
    details: HTMLDetailsElement;
    panel: HTMLElement;
    dispose: WorkbenchHandle | undefined;
    documentsVersion: readonly unknown[];
    scene: string;
    autostart: boolean;
  }[];
  groups: readonly [
    {
      readonly id: 'layout';
      readonly label: 'Layout';
      readonly title: 'Arrange chunks and artwork: scene preview, outline and inspector';
    },
    {
      readonly id: 'animate';
      readonly label: 'Animate';
      readonly title: 'Edit a sequence over the same scene: timeline, keys and camera';
    },
    {
      readonly id: 'logic';
      readonly label: 'Logic';
      readonly title: 'Interactions, story, dialogue, devices and wiring for the chosen chunk';
    },
    {
      readonly id: 'world';
      readonly label: 'World';
      readonly title: 'The city map, travel and shared world definitions';
    },
    {
      readonly id: 'labs';
      readonly label: 'Review';
      readonly title: 'Run configurations, review shortcuts and test worlds';
    },
    {
      readonly id: 'library';
      readonly label: 'Library';
      readonly title: 'Artwork, characters, vehicles and other shared pieces';
    },
  ];
  LOGIC_LIBRARY: Set<string>;
  panels: {
    details: HTMLDetailsElement;
    label: string;
    title: string;
    group: 'world' | 'layout' | 'logic' | 'labs' | 'library';
  }[];
  chosen: Map<'world' | 'layout' | 'logic' | 'labs' | 'library', HTMLDetailsElement>;
  group: Group;
  subtools: HTMLElement;
  sceneContext: HTMLDivElement;
  playHandle: WorkbenchHandle | undefined;
  playCheckpointId: string | undefined;
  playStartMode: 'preview' | 'checkpoint';
  locateCameraPending: boolean;
  liveChunkRows: readonly ChunkStatus[] | undefined;
  chunkSignature: string;
  runtimeOutline: HTMLDivElement;
  lastDirection: string;
  lastTool: string;
  refreshHeaderActions: () => void;
  timelines: WeakMap<object, TimelineProgram>;
  evaluatedContext:
    | { key: string; version: object; value: import('../../art/core/timeline').TimelineContext }
    | undefined;
  sceneLinked: boolean;
  outlineSceneOwners: Map<string, string>;
  outlineSourceOpen: Map<string, boolean>;
  outlineVersion: string;
  outlineSnapshot: object | undefined;
  outlineView: string;
  updateOutlineSelection: () => void;
  leftTab: 'outline' | 'library';
  cleanupDockLibrary: void | (() => void);
  libraryShown: readonly unknown[];
  mapShown: readonly unknown[];
  disposeInspector: () => void;
  propertyUpdates: (() => void)[];
  chunkInspectorHandle: WorkbenchHandle | undefined;
  showInternalAttach: boolean;
  inspectorFolds: Map<string, boolean>;
  displayedPropertyLinks: string;
  cleanupPicker: void | (() => void);
  cachedInspectorFrame:
    | {
        document: string;
        time: number;
        version: object;
        sequence: string;
        reduced: boolean;
        frame: TimelineFrame;
      }
    | undefined;
  focusMotion:
    | {
        from: { x: number; y: number; zoom: number };
        to: { x: number; y: number; zoom: number };
        elapsed: number;
        document: string;
      }
    | undefined;
  previewRenderer: { draw: (advance?: boolean) => Promise<void> };
  pickListOpened: number;
  spatialHandles: {
    update(handles: PreviewResult['handles'], visible: boolean): void;
    dispose(): void;
  };
  resizeFeedback: HTMLOutputElement;
  previous: number;
  frameId: number;
  // area functions
  commandTargets: () => Readonly<Record<string, readonly string[]>>;
  documentsForView: () => EditorDocument[];
  withViewDocuments: <T>(work: () => T) => T;
  panelHandles: () => HTMLDivElement[];
  readDock: (ws: string) => {
    left?: number;
    right?: number;
    leftClosed?: boolean;
    rightClosed?: boolean;
    max?: string;
  };
  writeDock: (patch: {
    left?: number;
    right?: number;
    leftClosed?: boolean;
    rightClosed?: boolean;
    max?: string;
  }) => void;
  renderErrors: () => void;
  reportError: (error: unknown, where: string) => void;
  onWindowError: (event: ErrorEvent) => void;
  onRejection: (event: PromiseRejectionEvent) => void;
  refreshDockToggles: () => void;
  setDockClosed: (side: 'left' | 'right', closed: boolean) => void;
  dockStrips: () => HTMLButtonElement[];
  applyDocks: (ws: string) => void;
  resetLayout: () => void;
  toggleMaximized: () => void;
  hiddenIn: (id: string | undefined) => Set<string>;
  overlayMenu: (text: string, title: string) => { menu: HTMLDetailsElement; panel: HTMLDivElement };
  frameSelection: () => void;
  duplicateSelected: () => void;
  focusField: (key: string, text: string) => void;
  collectSearch: () => SearchEntry[];
  speedControl: () => HTMLSelectElement;
  viewScene: () => string;
  navigable: () => boolean;
  viewKey: () => string;
  rememberView: () => void;
  restoreView: () => void;
  syncEditorLocation: () => void;
  panelGroup: (item: WorkbenchConfig) => 'world' | 'layout' | 'logic' | 'labs' | 'library';
  showLayout: () => void;
  openPanel: (details: HTMLDetailsElement) => void;
  playWorkbench: () =>
    | {
        config: WorkbenchConfig;
        details: HTMLDetailsElement;
        panel: HTMLElement;
        dispose: WorkbenchHandle | undefined;
        documentsVersion: readonly unknown[];
        scene: string;
        autostart: boolean;
      }
    | undefined;
  canPlay: () => boolean;
  inspectChunk: (id: string) => void;
  receiveResidency: (rows: readonly ChunkStatus[] | undefined) => void;
  playScene: () => void;
  stopPlay: () => void;
  showGroup: (id: 'world' | 'layout' | 'logic' | 'labs' | 'library') => void;
  activeWorkspace: () => 'world' | 'animate' | 'layout' | 'logic' | 'labs';
  sequenceChoices: () => EditorDocument[];
  openWorkspace: (ws: 'world' | 'animate' | 'layout' | 'logic' | 'labs') => void;
  refreshTools: () => void;
  refreshMode: () => void;
  sceneName: (scene: string) => string;
  sceneId: () => string;
  openInstance: (document: string, instance: string) => void;
  emptyState: (item: WorkbenchConfig, scene: string) => HTMLDivElement;
  mountWorkbench: (
    item: {
      config: WorkbenchConfig;
      details: HTMLDetailsElement;
      panel: HTMLElement;
      dispose: WorkbenchHandle | undefined;
      documentsVersion: readonly unknown[];
      scene: string;
      autostart: boolean;
    },
    context: WorkbenchContext,
  ) => WorkbenchHandle;
  sameDocuments: (a: readonly unknown[], b: readonly unknown[]) => boolean;
  refreshWorkbench: (
    item: {
      config: WorkbenchConfig;
      details: HTMLDetailsElement;
      panel: HTMLElement;
      dispose: WorkbenchHandle | undefined;
      documentsVersion: readonly unknown[];
      scene: string;
      autostart: boolean;
    },
    changed?: boolean,
  ) => void;
  requestReload: () => Promise<void>;
  authoringApi: () => NonNullable<WorkbenchContext['authoring']>;
  openConversation: (document: string, conversation: string) => void;
  closeOthers: (details: HTMLDetailsElement) => void;
  notice: (text: string, error?: boolean) => void;
  run: (action: () => void, propagate?: boolean, scope?: 'all' | 'artwork') => void;
  current: () => EditorDocument | undefined;
  activeDocument: () => EditorDocument | undefined;
  directionDocument: () => EditorDocument | undefined;
  currentTimeline: () => TimelineProgram | undefined;
  sequence: () => Sequence | undefined;
  evaluationContext: () => import('../../art/core/timeline').TimelineContext;
  viewCompositionDocument: () => EditorDocument | undefined;
  compositionDocument: () => EditorDocument | undefined;
  selected: () => AssetInstance | undefined;
  editInstance: (
    name: string,
    action: (node: AssetInstance) => void,
    scope?: 'all' | 'artwork',
  ) => void;
  editTimeline: (name: string, action: (doc: TimelineProgram) => void) => void;
  api: (path: string, body?: unknown) => Promise<any>;
  applyLinkedContext: (query: URLSearchParams) => void;
  openLinkedScene: () => void;
  openLinkedPanel: () => void;
  navigateEditorLink: () => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
  syncSequence: () => void;
  openDocument: (id: string, composition?: string) => void;
  selectDirection: (
    source: EditorDocument | undefined,
    at?: number,
    preserveAmbient?: boolean,
  ) => void;
  openSequence: (id: string, at?: number) => void;
  openCheckpoint: (id: string, requestedComposition?: string) => void;
  editCheckpoint: (id: string) => void;
  focusCheckpointRoot: (reset?: boolean) => void;
  openComposition: (id: string) => void;
  openScene: (scene: string, compare?: string) => void;
  refreshHeader: () => void;
  updateCrumb: () => void;
  refreshOptions: () => void;
  environmentControl: (control: EnvironmentControl, inToolbar: boolean) => HTMLElement;
  mountArtwork: (
    host: HTMLElement,
    scene: string,
    add: (entry: AssetEntry) => void,
    addPreset: (kit: AssetEntry, settings: Properties, children?: AssetInstance[]) => void,
  ) => () => void;
  refreshLibrary: () => void;
  refreshLibraryContent: () => void;
  refreshMap: () => void;
  readFolds: (key: string) => Map<string, boolean>;
  saveFolds: () => void;
  leftDockHead: () => HTMLDivElement;
  renderLibraryDock: () => HTMLDivElement;
  refreshLeft: () => void;
  renderOutlineDocument: (
    doc: EditorDocument,
    container: HTMLElement,
  ) => { selection: () => void; filter: () => void };
  liveContext: (scene: string) => WorkbenchContext;
  inspectorContext: () => string;
  openInspector: (request: InspectorTask) => void;
  renderInspectorMessages: () => void;
  refreshRight: () => void;
  renderPresets: (host: HTMLElement, node: AssetInstance) => void;
  propertyLinkSignature: (node: AssetInstance) => string;
  guardLinkedProperties: (
    document: string,
    node: AssetInstance,
    before: Properties,
    bindings: AssetInstance['bindings'],
  ) => void;
  syncLinkedProperties: () => void;
  renderAppearance: (host: HTMLElement, node: AssetInstance) => void;
  openPicker: () => void;
  closePicker: () => void;
  renderPicker: () => void;
  presetsDoc: () => KitPresets | undefined;
  presetFamily: (preset: KitPreset, kit: AssetEntry) => string;
  addAtView: (
    type: string,
    settings?: Properties,
    children?: AssetInstance[],
    clientX?: number,
  ) => Promise<void>;
  editArray: <T>(
    container: HTMLElement,
    title: string,
    value: T,
    apply: (v: T) => void,
    help?: string,
  ) => void;
  seekTime: (seconds: number) => void;
  toggleAnimation: () => void;
  selectTimeline: (selection: TimelineSelection | undefined, target?: Target) => void;
  inspectorFrame: () => TimelineFrame;
  animatedControl: (control: HTMLElement, target: Target, name: string) => HTMLDivElement;
  keyField: (target: Target) => Field;
  cameraSelected: () => boolean;
  openRenderingSource: (source: import('../../world/render-settings').RenderSource) => void;
  openSequenceRendering: () => void;
  refreshTimeline: () => void;
  thisTargets: () => { value: string; label: string }[];
  keyValue: (frame: TimelineFrame, target: Target) => { value: Value; discrete: boolean };
  addKey: (target: Target, explicitValue?: Value) => void;
  validateDrag: (pending: ChunkDocument) => void;
  commitDrag: (pending: ChunkDocument) => void;
  updateTime: () => void;
  workspaceNavigation: (transient?: boolean) => { x: number; h: number; zoom: number };
  gameViewport: (directed?: boolean) => {
    ground?: number | undefined;
    width: number;
    height: number;
    scale: number;
  };
  dynamicWorkspace: () => boolean;
  previewSize: () => { width: number; height: number };
  stopFollowing: () => void;
  locateCamera: () => void;
  previewRequest: (
    composition: ChunkDocument,
    overlay: boolean,
    frame?: TimelineFrame,
  ) => PreviewRequest;
  resolvedArtwork: (
    document: string,
    id: string,
    result?: PreviewResult | undefined,
  ) => import('../../art/core/presentation').ArtworkInspection | undefined;
  editDrawingBoundary: (field?: string) => void;
  showDrawingBoundary: () => void;
  placeDrawingBoundary: () => void;
  draw: (advance?: boolean) => Promise<void>;
  refresh: () => void;
  syncWorldState: () => void;
  worldState: () => import('../contracts').WorldState | undefined;
  compareOptions: () => { id: string; label: string }[];
  comparing: () => boolean;
  sizeCanvas: (width: number, height: number) => void;
  coordinates: (event: { clientX: number; clientY: number }) => { x: number; y: number };
  hitTest: (point: { x: number; y: number }) =>
    | {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        clip?: { x: number; y: number; width: number; height: number };
      }
    | undefined;
  hitsUnder: (point: { x: number; y: number }) => {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    clip?: { x: number; y: number; width: number; height: number };
  }[];
  isSelectedHit: (id: string) => boolean;
  hitLabel: (id: string) => string;
  cycleAt: (point: { x: number; y: number }) => void;
  listAt: (point: { x: number; y: number }, client: { clientX: number; clientY: number }) => void;
  spatialFeedback: (
    phase: 'start' | 'preview' | 'finish' | 'cancel',
    fields: readonly string[],
    node?: AssetInstance,
  ) => void;
  placeHover: () => void;
  placeObjectLabel: (target: HTMLElement, box: PreviewResult['bounds'][number] | undefined) => void;
  updateRenderStatus: () => void;
  zoomTo: (next: number, anchor?: { clientX: number; clientY: number }) => void;
  selectWorldMember: (address: WorldMemberAddress) => void;
  worldControls: (documents?: () => readonly EditorDocument[]) => WorldWorkspaceControls;
  startWorldDrag: (event: PointerEvent, address: WorldMemberAddress) => void;
  fitJoined: () => void;
  placeJoined: () => void;
  focusArtwork: (documentId: string, id: string) => Promise<void>;
  fit: () => void;
  refreshViewportTools: () => void;
  openNewScene: () => void;
  deletionProblem: (problem: string, removed: AssetInstance[]) => string;
  deleteSelected: () => void;
  select_: (id: string) => void;
  unload: (event: BeforeUnloadEvent) => void;
  keyboard: (event: KeyboardEvent) => void;
  shortcuts: (event: KeyboardEvent) => void;
  closeMenu: (event: Event) => void;
  tick: (now: number) => void;
  step: (now: number) => void;
}
