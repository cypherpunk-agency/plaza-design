import {assetPictureLimits} from '../world/render-settings';
import {renderSettingsAuthoring} from './render-settings-authoring';
import {renderPolicy} from '../world/render-policy';
import type {CitySource} from '../world/city';
import {mountSpatialHandles} from './spatial-handles';
import {PROPERTY_GROUPS,fieldUnit,fieldIsContinuous} from '../art/core/fields';
import {windowEdges,framingBounds} from './visibility';
import {mountNumericScrubbing} from './numeric-scrub';
import {inspectorTask,type InspectorTask} from './inspector-task';
import {worldChunkPlacements,compileWorldComposition} from '../world/compositions';
import {worldCompositionContext} from '../world/compiled-world';
import {pendingRegistry} from './pending-registry';
import {worldMemberAt,addressForChunk,moveWorldMember,linkedWorldMembers,type WorldMemberAddress} from './world-members';
import {workspaceSource,openCompositionRendering,editMemberConnection,renderWorldConnections,renderWorldMembers,renderWorldMemberInspector,openMountPicker,type WorldWorkspaceControls} from './world-workspace-controls';
import {validationSnapshot} from './validation-snapshot';
import {keyframeControl,keyframeState,setKeyAtPlayhead} from './keyframe-control';
import {createViewMemory,viewMatchesLocation} from './view-memory';
import {preparedChunkStatus,type ChunkStatus} from '../runtime/chunk-status';
import {renderChunkStatus,renderRuntimeChunks} from './chunk-status';
import {renderWorldDirectionAuthoring} from './world-direction-authoring';
import {renderSequenceCommandsAuthoring} from './sequence-commands-authoring';
import {clippingControls,peopleControls} from './mobile-controls';
import {hitTestArtwork,hitsAt,sourceSelection,createSelection} from './selection';
import {createPreviewState,createPreviewRenderer} from './preview-integration';
import {createInspector} from './inspector';
import {createViewportState,mountViewportInput} from './viewport-input';
import {canvasPoint} from '../art/core/geometry';
import {zoomWorkspace,workspaceZoom,resizeWorkspace} from './viewport-navigation';
import {element,button,select,label,createFieldControls,enhanceLongSelects,demoteLeadingNotes} from './controls';
import {mountCommandSearch,type SearchEntry} from './command-search';
import {renderTimelineInspector} from './temporal-inspector';
import {outlineDocuments} from './outline-documents';
import {compositionWorkspaces,workspaceDocuments,workspaceSequences,sequenceSource} from './workspace';
import {animationShortcut} from './animation-shortcuts';
import {mountTimelineGrid,moveKey,type TimelineSelection,type TimelineViewState} from './timeline-view';
import {sequenceProgram} from '../art/core/sequence';
import {perfMeasure,perfBegin,perfEnd} from '../runtime/diagnostics/performance';
import {mountPerformancePanel} from '../runtime/diagnostics/performance-panel';

/** Local static/animated composition editor. Drawing belongs to the injected game preview. */
import {type ChunkDocument,type AssetInstance,type Field,type Value,type Properties} from '../art/core/composition';
import {evaluateTimeline,timelineArtwork,targetComposition,type TimelineProgram,type TimelineFrame,type Sequence,type Target} from '../art/core/timeline';
import { composerStyles } from './styles';
import { createFrame, frameStyles, sectionNavigator } from './frame';

import {mountAssetBrowser,ARTWORK_DRAG,type AssetBrowserSession,type AssetEntry,type AssetPreset} from './asset-browser';
import { createThumbnails } from './asset-thumbnails';
import { PRESETS_DOCUMENT, presetId, presetProps, presetsFor, type KitPreset, type KitPresets } from './kit-presets';

import { createDocumentBundle, readDocumentBundle } from './document-bundle';
import { KIND_HINTS, LAYER_ROLES, layerRole } from './layer-roles';
import { chipStyles } from './kind-chips';
import {LAYER_HINTS,LAYER_LABELS,VISUAL_LAYERS,isPlayerRow,layerRows} from './layer-stack';
import type { Layer } from '../art/core/composition';

import {ComposerModel} from './composer-model';
import type {EditorDocument,PreviewRequest,PreviewResult,EnvironmentControl,WorkbenchContext,WorkbenchHandle,ComposerConfig,WorkbenchConfig} from './contracts';
const copy = <T>(value: T): T => structuredClone(value);
/** The outline's mark for a level barrier (a padlock), so barriers and their Access rules are easy to find. */
const BARRIER_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const flatten = (doc: ChunkDocument) => { const list: { node: AssetInstance; depth: number }[] = []; const visit = (nodes: AssetInstance[], depth: number) => nodes.forEach(node => { list.push({ node, depth }); visit(node.children ?? [], depth + 1); }); visit(doc.instances, 0); return list; };
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

export function mountComposer(host: HTMLElement, config: ComposerConfig) {
  const painting=createPreviewState();

  const viewport=createViewportState();

  const {numberInput,fieldInput}=createFieldControls((text,error)=>notice(text,error),section=>{inspector.selectSection(section);refreshRight();},()=>JSON.stringify([currentId,editorSelection.document,editorSelection.instance,editorSelection.timeline?.kind]));
  const model = new ComposerModel(config.registry, { destinations: config.destinations, clips: config.clips, motionTracks: config.motionTracks }, config.validateDocument, config.projections,config.destinationsFor,config.validationInputs);
  let commandTargetsVersion:object|undefined,commandTargetsCache:NonNullable<import('../art/core/timeline').TimelineContext['commandTargets']>={};
  const commandTargets=()=>{if(commandTargetsVersion!==model.sourceVersion){commandTargetsCache=config.commandTargetsFor?.(model.inspectDocuments())??{};commandTargetsVersion=model.sourceVersion;}return commandTargetsCache;};
  let viewDocuments: EditorDocument[] | undefined;
  let documentSnapshotVersion:object|undefined,documentSnapshot:EditorDocument[]=[];
  const documentsForView = () => {if(viewDocuments)return viewDocuments;if(documentSnapshotVersion!==model.sourceVersion){documentSnapshot=model.inspectDocuments();documentSnapshotVersion=model.sourceVersion;}return documentSnapshot;};
  const withViewDocuments = <T,>(work: () => T): T => {
    if (viewDocuments) return work();
    viewDocuments = documentsForView();
    try { return work(); } finally { viewDocuments = undefined; }
  };
  const root = element('section', 'scene-composer'); root.setAttribute('aria-label', 'World and animation composer');
  const style = element('style'); style.textContent = composerStyles + frameStyles + chipStyles; root.append(style);
  const header = element('header'), status = element('div', 'status', 'Loading authoring documents…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const workspace = element('div', 'workspace'), left = element('aside'), center = element('div', 'preview-column'), right = element('aside', 'inspector-dock');
  left.setAttribute('aria-label', 'World outline'); right.setAttribute('aria-label', 'Inspector');
  /** Drag handles on the panels' inner edges. Widths are a per-browser convenience (localStorage), never source. */
  function panelHandles() {
    const sides = [{ side: 'left', variable: '--left-w', min: 160, max: 560 }, { side: 'right', variable: '--right-w', min: 220, max: 680 }] as const;
    return sides.map(({ side, variable, min, max }) => {
      const handle = element('div', `panel-handle ${side}`);
      handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical'); handle.title = 'Drag to resize; double-click to reset';
      const apply = (width: number | null) => { if (width === null) workspace.style.removeProperty(variable); else workspace.style.setProperty(variable, `${Math.round(Math.min(max, Math.max(min, width)))}px`); };
      handle.onpointerdown = event => {
        if (event.button !== 0) return; event.preventDefault(); handle.setPointerCapture(event.pointerId); handle.classList.add('dragging');
        const move = (e: PointerEvent) => { const box = workspace.getBoundingClientRect(); apply(side === 'left' ? e.clientX - box.left : box.right - e.clientX); };
        const up = () => { handle.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); writeDock({ [side]: Number.parseFloat(workspace.style.getPropertyValue(variable)) || undefined }); };
        handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
      };
      handle.ondblclick = () => { apply(null); writeDock({ [side]: undefined }); applyDocks(dockWorkspace); void draw(); };
      return handle;
    });
  }
  /** Dock layout per workspace: widths, closed docks and a maximised region. View preferences (localStorage), never source. */
  type DockState = { left?: number; right?: number; leftClosed?: boolean; rightClosed?: boolean; max?: string };
  let dockWorkspace = '';
  const readDock = (ws: string): DockState => { try { return JSON.parse(localStorage.getItem(`composer.dock.${ws}`) ?? '{}') as DockState; } catch { return {}; } };
  const writeDock = (patch: DockState) => { const next = { ...readDock(dockWorkspace), ...patch }; try { localStorage.setItem(`composer.dock.${dockWorkspace}`, JSON.stringify(next)); } catch { /* storage unavailable: layout lasts for this visit */ } };
  const statusBar = element('footer', 'status-bar'), modeChip = element('span', 'mode-chip'), contextLine = element('span', 'status-context'), dockToggles = element('span', 'dock-toggles');
  /** Errors never pass silently: the frame loop, uncaught errors and rejected promises show here with their details. */
  const errorChip = button('', () => { errorList.hidden = !errorList.hidden; if (!errorList.hidden) renderErrors(); }, 'Show editor errors'); errorChip.className = 'error-chip'; errorChip.hidden = true;
  const errorList = element('div', 'error-list'); errorList.hidden = true; errorList.setAttribute('role', 'dialog'); errorList.setAttribute('aria-label', 'Editor errors');
  const errorLog: { text: string; where: string; detail: string; count: number }[] = [];
  function renderErrors() {
    const head = element('div', 'error-list-head'), copyAll = button('Copy', () => void navigator.clipboard?.writeText(errorLog.map(row => `${row.where} ×${row.count}: ${row.detail}`).join('\n\n')), 'Copy all errors with details'), clear = button('Clear', () => { errorLog.length = 0; errorChip.hidden = true; errorList.hidden = true; errorsTab.textContent = 'Errors'; errorsTab.classList.remove('has-errors'); }, 'Clear the error list');
    head.append(element('strong', '', 'Editor errors'), element('span', 'status-spacer'), copyAll, clear);
    errorList.replaceChildren(head, ...errorLog.map(row => { const item = element('details', 'error-row'), summary = element('summary', '', `${row.where}${row.count > 1 ? ` ×${row.count}` : ''} · ${row.text}`); item.append(summary, element('pre', '', row.detail)); return item; }));
  }
  function reportError(error: unknown, where: string) {
    const text = message(error), detail = error instanceof Error && error.stack ? error.stack : text, row = errorLog.find(item => item.text === text && item.where === where);
    if (row) row.count++; else { errorLog.push({ text, where, detail, count: 1 }); if (errorLog.length > 20) errorLog.shift(); console.error(error); }
    errorsTab.textContent = `Errors ${errorLog.length}`; errorsTab.classList.add('has-errors');
    errorChip.hidden = false; errorChip.textContent = `! ${errorLog.length === 1 ? 'Error' : `${errorLog.length} errors`} · ${text}`; errorChip.title = `${where}: ${text} (click for details)`;
    if (!errorList.hidden) renderErrors();
  }
  const onWindowError = (event: ErrorEvent) => reportError(event.error ?? event.message, 'Uncaught error');
  const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason, 'Failed promise');
  const saveState = element('span', 'save-state', config.api ? 'Local · saves to source' : 'Public · edits download as a file'); statusBar.setAttribute('aria-label', 'Editor status');
  const dockButtons = (['left', 'right'] as const).map(side => { const toggle = button(side === 'left' ? 'Outline' : 'Inspector', () => setDockClosed(side, !root.hasAttribute(`data-${side}-closed`)), `Show or hide the ${side === 'left' ? 'outline' : 'inspector'} dock`); dockToggles.append(toggle); return toggle; });
  function refreshDockToggles() { dockButtons.forEach((toggle, index) => toggle.setAttribute('aria-pressed', String(!root.hasAttribute(`data-${index ? 'right' : 'left'}-closed`)))); }
  function setDockClosed(side: 'left' | 'right', closed: boolean) { root.toggleAttribute(`data-${side}-closed`, closed); writeDock(side === 'left' ? { leftClosed: closed } : { rightClosed: closed }); refreshDockToggles(); void draw(); }
  /** A closed dock leaves a narrow strip at its edge that reopens it. */
  function dockStrips() { return (['left', 'right'] as const).map(side => { const strip = button(side === 'left' ? 'Outline ▸' : '◂ Inspector', () => setDockClosed(side, false), `Open the ${side === 'left' ? 'outline' : 'inspector'}`); strip.className = `dock-strip ${side}`; return strip; }); }
  /** Workspace defaults before the author resizes anything: Animate trades dock width for the timeline. */
  const DOCK_DEFAULTS: Record<string, DockState> = { animate: { left: 220, right: 280 } };
  function applyDocks(ws: string) {
    dockWorkspace = ws; const state = { ...DOCK_DEFAULTS[ws], ...readDock(ws) };
    for (const side of ['left', 'right'] as const) { const width = state[side]; if (width) workspace.style.setProperty(`--${side}-w`, `${width}px`); else workspace.style.removeProperty(`--${side}-w`); }
    root.toggleAttribute('data-left-closed', !!state.leftClosed); root.toggleAttribute('data-right-closed', !!state.rightClosed);
    if (state.max) root.dataset.maximized = state.max; else delete root.dataset.maximized; refreshDockToggles();
  }
  function resetLayout() { try { for (const key of Object.keys(localStorage)) if (key.startsWith('composer.dock.') || key.startsWith('composer.panel.')) localStorage.removeItem(key); } catch { /* storage unavailable */ } applyDocks(dockWorkspace); void draw(); }
  /** Ctrl+Space maximises the region under the pointer and restores it again. */
  let pointerRegion = 'center';
  function toggleMaximized() { const next = root.dataset.maximized ? undefined : pointerRegion; if (next) root.dataset.maximized = next; else delete root.dataset.maximized; writeDock({ max: next }); void draw(); }
  const documentSwitch = element('div', 'document-switch');
  const searchField = button('', () => searchUi.open(), 'Search objects, commands, settings and library (Ctrl K)'); searchField.className = 'search-field'; searchField.append(element('span', '', 'Search objects, commands, settings…'), element('kbd', '', 'Ctrl K'));
  /** Layout's folded bottom dock: the timeline and the editor's errors. */
  const bottomStrip = element('div', 'bottom-strip'), timelineTab = button('▴ Timeline', () => openWorkspace('animate'), 'Open the timeline (Animate workspace)'), errorsTab = button('Errors', () => { errorList.hidden = !errorList.hidden; if (!errorList.hidden) renderErrors(); }, 'Show editor errors');
  bottomStrip.append(timelineTab, errorsTab);
  const options = element('div', 'preview-options'), stageWrap = element('div', 'stage-wrap'), stage = element('div', 'preview-stage'), canvas = element('canvas'), previewError = element('div', 'preview-error');
  const joinedLayer = element('div', 'joined-tags'); joinedLayer.setAttribute('aria-label', 'Joined scenes');
  const viewportTools = element('div', 'viewport-tools'), hoverBox = element('div', 'hover-box'), selectionBox = element('div', 'hover-box selection-box'); selectionBox.hidden = true; viewportTools.setAttribute('role', 'group'); viewportTools.setAttribute('aria-label', 'Preview zoom'); hoverBox.hidden = true;
  const picker = element('div', 'add-picker'); picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Add asset'); picker.hidden = true;
  const baseWidth = config.viewport?.width ?? 960, baseHeight = config.viewport?.height ?? 540;
  canvas.width = baseWidth; canvas.height = baseHeight; canvas.setAttribute('aria-label', 'Game renderer preview. Click assets to select it, click empty space to deselect, drag the selected asset to move it, drag elsewhere to pan, Ctrl+wheel or pinch to zoom, Delete removes the selection.'); canvas.tabIndex = 0; previewError.hidden = true;
  const timelineHost = element('section', 'timeline'); timelineHost.setAttribute('aria-label', 'Animation timeline');
  const tools = element('nav', 'tools'); tools.setAttribute('aria-label', 'Editor tools');
  let layerQuery = '', layerSort: 'kind' | 'order' = 'order'; const roleOpen = new Map<string, boolean>();
  /** The selection the outline last unfolded for; a section folded after that stays folded. */
  let revealed = '';
  /** The outline's eyes: objects hidden in the editor preview, per composition document. View state only. */
  const hiddenByDocument = new Map<string, Set<string>>();
  const hiddenIn = (id: string | undefined) => { if (!id) return new Set<string>(); let set = hiddenByDocument.get(id); if (!set) hiddenByDocument.set(id, set = new Set()); return set; };
  let animating = false, ambientLabel: HTMLElement | undefined;
  let updateContextSummary=()=>{};
  const inspector=createInspector();
  canvas.style.setProperty('--ratio', String(canvas.width / canvas.height));
  /** Scene overlays. Preview-only settings sit in their own dashed bar; Camera and Show menus keep their open state across refreshes. */
  const previewBar = element('div', 'preview-bar'); previewBar.setAttribute('role', 'group'); previewBar.setAttribute('aria-label', 'Preview settings');
  const overlayMenu = (text: string, title: string) => { const menu = element('details', 'ov-menu'), summary = element('summary', '', text), panel = element('div', 'ov-menu-panel'); summary.title = title; menu.append(summary, panel); return { menu, panel }; };
  const cameraMenu = overlayMenu('Camera', 'Locate, follow or look through the game camera'), showMenu = overlayMenu('Show', 'Borders, outlines, neighbours, comparison and preview settings');
  const showSlot = element('div', 'ov-menu-extra'), viewMenus = element('div', 'view-menus'); viewMenus.append(cameraMenu.menu, showMenu.menu);
  const modeBanner = element('div', 'mode-banner'), bannerTitle = element('strong'), bannerDetail = element('span'), bannerAction = button('', () => { if (!playHost.hidden) stopPlay(); else openWorkspace('layout'); });
  modeBanner.append(bannerTitle, bannerDetail, element('span', 'status-spacer'), bannerAction); modeBanner.hidden = true; modeBanner.setAttribute('role', 'status');
  const crumb = element('span', 'crumb'); crumb.setAttribute('aria-label', 'Selection');
  const pickList = element('div', 'pick-list'); pickList.hidden = true; pickList.setAttribute('role', 'menu'); pickList.setAttribute('aria-label', 'Objects under the pointer');
  const playHost = element('div', 'stage-play'); playHost.hidden = true; playHost.setAttribute('aria-label', 'Play session');
  const playSettings = element('section', 'play-settings');
  const compareCanvas = element('canvas'); compareCanvas.hidden = true; compareCanvas.className = 'compare'; compareCanvas.setAttribute('aria-label', 'Comparison preview, read-only');
  stage.append(canvas, compareCanvas); const renderStatus=element('output','render-status');renderStatus.setAttribute('aria-label','Preview render rate');stageWrap.append(stage,playHost,joinedLayer,hoverBox,selectionBox,modeBanner,previewBar,viewportTools,viewMenus,pickList,picker,previewError,renderStatus); center.append(options, stageWrap, timelineHost, bottomStrip); workspace.append(center, left, right, ...panelHandles(), ...dockStrips()); header.append(tools); statusBar.append(modeChip, crumb, contextLine, status, element('span','status-spacer'), errorChip, dockToggles, saveState); root.append(header, workspace, statusBar, errorList);
  /** Ctrl K: objects in the open composition, editor commands, settings with their location, and library pieces. */
  const searchUi = mountCommandSearch(root, () => withViewDocuments(collectSearch));
  function frameSelection() { const doc = compositionDocument(); if (editorSelection.instance && doc) void focusArtwork(editorSelection.document || doc.id, editorSelection.instance); else fit(); }
  function duplicateSelected() { const doc = compositionDocument(); if (!doc || !editorSelection.instance) return; run(() => { editorSelection.instance = model.duplicate(doc.id, editorSelection.instance); }); }
  /** Opens the selected artwork's Appearance and focuses one of its fields. */
  function focusField(key: string, text: string) {
    inspector.appearance(); refreshRight();
    const control = right.querySelector<HTMLElement>(`[data-asset-property="${key}"]`) ?? [...right.querySelectorAll('label')].find(row => row.querySelector('span')?.textContent?.startsWith(text))?.querySelector<HTMLElement>('input,select,textarea') ?? null;
    if (!control) return; let parent = control.parentElement; while (parent && parent !== right) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    control.scrollIntoView({ block: 'center' }); control.focus();
  }
  function collectSearch(): SearchEntry[] {
    const list: SearchEntry[] = [], docs = documentsForView(), command = (text: string, act: () => void, keys?: string) => list.push({ group: 'Commands', label: text, run: act, keys });
    if (current()?.kind === 'composition') {
      const sources = workspaceId ? workspaceDocuments(workspaceId, docs) : [compositionDocument()].filter((doc): doc is EditorDocument => !!doc);
      for (const source of sources) for (const { node } of flatten(source.value as ChunkDocument)) { let kind = node.type; try { kind = config.registry.get(node.type).label; } catch { /* unknown types still list by id */ } list.push({ group: 'Objects', label: node.id, where: `${sceneName((source.value as ChunkDocument).scene)} · ${kind}`, run: () => { editorSelection.timeline = undefined; openInstance(source.id, node.id); } }); }
    }
    command(config.api ? 'Save to source' : 'Download edits', () => void save(), 'Ctrl S'); command('Undo', () => run(() => model.undo()), 'Ctrl Z'); command('Redo', () => run(() => model.redo()), 'Ctrl Shift Z');
    if (current()?.kind === 'composition') { command('Add artwork', () => openPicker(), 'Shift A'); command('Frame selection', frameSelection, 'F'); }
    if (editorSelection.instance) { command('Duplicate selection', duplicateSelected, 'Ctrl D'); command('Delete selection', deleteSelected, 'Delete'); command('Deselect', () => select_(''), 'Esc'); }
    groups.filter(g => g.id !== 'library').forEach((g, index) => command(`Workspace · ${g.label}`, () => openWorkspace(g.id as Workspace), `Alt ${index + 1}`));
    if (canPlay()) command('Play', playScene); command('Locate camera', locateCamera);
    command('Show or hide the outline dock', () => setDockClosed('left', !root.hasAttribute('data-left-closed'))); command('Show or hide the inspector dock', () => setDockClosed('right', !root.hasAttribute('data-right-closed')));
    command('Maximise the panel under the pointer', toggleMaximized, 'Ctrl Space'); command('Reset layout', resetLayout);
    for (const control of config.environmentControls ?? []) if (control.kind === 'boolean' && control.shortcut) command(`Preview · ${control.label}`, () => { environment[control.key] = !environment[control.key]; refreshOptions(); void draw(); }, control.shortcut.toUpperCase());
    for (const item of panels) list.push({ group: 'Settings', label: item.label, where: `${groups.find(g => g.id === item.group)?.label ?? ''} › ${item.label}`, run: () => openPanel(item.details) });
    for (const control of config.environmentControls ?? []) list.push({ group: 'Settings', label: control.label, where: control.quick ? 'Scene › Preview bar' : 'Scene › Show menu', run: () => { if (control.quick) previewBar.querySelector<HTMLElement>(`[aria-label="${control.label}"]`)?.focus(); else showMenu.menu.open = true; } });
    const node = selected(); if (node) { let fields: [string, Field][] = []; try { fields = Object.entries(config.registry.get(node.type).fields); } catch { /* unknown type */ } for (const [key, field] of fields) list.push({ group: 'Settings', label: field.label, where: `Inspector › ${field.semantics?.group ?? 'Properties'} · ${node.id}`, run: () => focusField(key, field.label) }); }
    for (const doc of documentsForView()) if (doc.kind === 'composition' && !doc.id.startsWith('authored.')) list.push({ group: 'Commands', label: `Open ${sceneName((doc.value as ChunkDocument).scene)}`, where: 'Chunk', run: () => openDocument(doc.id) });
    for (const row of compositionWorkspaces(documentsForView())) list.push({ group: 'Commands', label: `Open ${row.name}`, where: 'Composition', run: () => openComposition(row.id) });
    if (current()?.kind === 'composition') for (const definition of config.registry.catalog()) if (definition.libraryUse === 'reusable') list.push({ group: 'Library', label: definition.label, where: definition.type, run: () => void addAtView(definition.type) });
    return list;
  }
  /** Presentation passes over freshly rendered panels: long option lists get search; leading explanations fold away. */
  let tidyQueued = false;
  const tidy = new MutationObserver(() => { if (tidyQueued) return; tidyQueued = true; queueMicrotask(() => { tidyQueued = false; tidy.disconnect(); try { enhanceLongSelects(root); demoteLeadingNotes(right); for (const name of right.querySelectorAll<HTMLElement>('label>span:first-child:not([title])')) if ((name.textContent ?? '').length > 16) name.title = name.textContent!; for (const panel of root.querySelectorAll<HTMLElement>('.inspector-body,.inspector-mount,.inspector-task')) demoteLeadingNotes(panel); } finally { tidy.observe(root, { childList: true, subtree: true }); } }); });
  tidy.observe(root, { childList: true, subtree: true });
  stageWrap.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes(ARTWORK_DRAG) && playHost.hidden) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; stageWrap.dataset.dropping = ''; } });
  stageWrap.addEventListener('dragleave', () => { delete stageWrap.dataset.dropping; });
  stageWrap.addEventListener('drop', event => {
    delete stageWrap.dataset.dropping; const raw = event.dataTransfer?.getData(ARTWORK_DRAG); if (!raw) return; event.preventDefault();
    const { kit, preset } = JSON.parse(raw) as { kit: string; preset?: string }, saved = preset ? presetsFor(presetsDoc(), kit).find(p => p.id === preset) : undefined;
    void addAtView(kit, saved?.props, saved?.children, event.clientX);
  });
  workspace.addEventListener('pointermove', event => { const target = event.target as Node; pointerRegion = left.contains(target) ? 'left' : right.contains(target) ? 'right' : timelineHost.contains(target) ? 'timeline' : 'center'; }); host.append(root);
  /** The panel named in the URL at startup; the URL is only rewritten once it has been opened. */
  // An editor link: `#characters` opens a panel; `#scene=downtown-next&compare=downtown&panel=characters` also opens a scene.
  const linkQuery = location.hash.includes('=') ? new URLSearchParams(location.hash.slice(1)) : undefined;
  const linkedPanel = linkQuery ? linkQuery.get('panel') ?? '' : decodeURIComponent(location.hash.slice(1)); let linked = false;
  let activeCheckpointId:string|undefined;
  let workspaceId='',directionDocumentId='', compareId = '', currentId = '', sequenceId = '', time = 0, playing = false, loop = false, loopFrom = 0, loopTo = 0, reduced = false, overlays = true, snap = 1, saving = false, disposed = false;

  /** Editor-only framing: persisted as a workspace preference, never authored source or a game save. */
  let boundaryFor='';
  const sequenceNav={zoom:1,x:0,y:0};let cameraPreview=false,followCamera=false,showObjectOutlines=false,showSceneBounds=true,showChunkStatus=false,renderWindow=performance.now(),renderFps=0,statusUpdatedAt=0;
  try{showObjectOutlines=localStorage.getItem('access-denied.editor.object-outlines')==='true';}catch{/* optional preview preference */}



  let timeLabel: HTMLElement | undefined, transportPlay:HTMLButtonElement|undefined, timelineGrid:ReturnType<typeof mountTimelineGrid>|undefined;
  const editorSelection=createSelection();
  let inspectorDraft:{request:InspectorTask;host:HTMLElement;selection:string;version:object}|undefined;
  let placementIssue:{address:WorldMemberAddress;reason:string}|undefined;
  let inspectorError='';
  let numericScrubbing=false,cancelNumericScrub=()=>{},numericSourceVersion:object|undefined;
  let cancelWorldDrag:(()=>void)|undefined;
  let workspaceOrigin:{key:string;x:number;h:number}|undefined;
  let worldDrag:{source:import('../world/compositions').WorldCompositions;address:WorldMemberAddress;at:{x:number;h:number};x:number;y:number;scale:number;pending?:import('../world/compositions').WorldCompositions}|undefined;
  const timelineView:TimelineViewState={zoom:1,collapsed:new Set(),scrollX:0,scrollY:0};let timelineCollapsed=false,timelineHeight=240;let playbackSpeed=1,dragPreviewDirty=false;
  const speedControl=()=>select([.25,.5,1,1.5,2,4].map(value=>({value:String(value),label:value+'×'})),String(playbackSpeed),value=>playbackSpeed=Number(value));
  const environment: Record<string, string | number | boolean> = { cameraX: 0, zoom: 1, ...config.initialEnvironment };
  const viewMemory=createViewMemory({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
  const sequenceTimes=new Map<string,number>();
  let ambientOffset=0;
  let timelineSettingsOpen = false;
  let viewReady=false,lastViewSample=0,restoredScroll:{x:number;y:number}|undefined;
  const viewScene=()=>{const doc=current();return doc?.kind==='composition'?(doc.value as ChunkDocument).scene:'';};
  let pixelatedScaling=true;
  const navigable=()=>current()?.kind==='composition';
  const viewKey=()=>workspaceId?'composition:'+workspaceId:viewScene();
  function rememberView(){
    const scene=viewKey();if(!viewReady||!scene||!playHost.hidden)return;
    const anchor=painting.workspaceAnchor?.document===currentId?{x:painting.workspaceAnchor.x,h:painting.workspaceAnchor.h}:undefined;
    if(directionDocumentId)sequenceTimes.set(directionDocumentId,time);
    viewMemory.write(scene,{checkpoint:activeCheckpointId,sequence:sequenceId,time,ambientTime:time+ambientOffset,sequenceTimes:Object.fromEntries(sequenceTimes),compare:compareId,workspace:{x:workspaceNavigation(false).x,y:workspaceNavigation(false).h,zoom:sequenceNav.zoom,anchor},cameraPreview,environment:{...environment},
      timeline:{zoom:timelineView.zoom,collapsed:[...timelineView.collapsed],scrollX:timelineView.scrollX,scrollY:timelineView.scrollY,height:timelineHeight,folded:timelineCollapsed},
      speed:playbackSpeed,snap,loop:{enabled:loop,from:loopFrom,to:loopTo},outlines:showObjectOutlines,borders:showSceneBounds,chunkStatus:showChunkStatus,reduced,overlays,pixelatedScaling,followCamera,
      scroll:restoredScroll??{x:stage.scrollLeft,y:stage.scrollTop},selection:{...editorSelection},outline:{sort:layerSort,query:layerQuery}});
    syncEditorLocation();
  }
  function restoreView(){
    const saved=viewMemory.read(viewKey());if(!saved)return;activeCheckpointId=saved.checkpoint;focusCheckpointRoot();selectDirection(sequenceSource(saved.sequence,documentsForView(),workspaceId),saved.time);for(const [id,at]of Object.entries(saved.sequenceTimes??{}))sequenceTimes.set(id,at);
    const duration=sequence()?.duration;
    ambientOffset=(saved.ambientTime??saved.time)-time;
    Object.assign(sequenceNav,{x:saved.workspace.x,y:saved.workspace.y,zoom:saved.workspace.zoom});if(saved.workspace.anchor)painting.workspaceAnchor={document:currentId,...saved.workspace.anchor};
    cameraPreview=saved.cameraPreview;followCamera=saved.followCamera??false;pixelatedScaling=saved.pixelatedScaling??true;Object.assign(environment,saved.environment);
    Object.assign(timelineView,{zoom:saved.timeline.zoom,collapsed:new Set(saved.timeline.collapsed),scrollX:saved.timeline.scrollX,scrollY:saved.timeline.scrollY});
    timelineHeight=saved.timeline.height;timelineCollapsed=saved.timeline.folded;playbackSpeed=saved.speed;snap=saved.snap;
    loop=saved.loop.enabled;loopTo=Math.min(saved.loop.to,duration??saved.loop.to);loopFrom=Math.min(saved.loop.from,loopTo);if(loopFrom>=loopTo){loopFrom=0;loopTo=duration??0;}
    showObjectOutlines=saved.outlines;showSceneBounds=saved.borders;showChunkStatus=saved.chunkStatus;reduced=saved.reduced;overlays=saved.overlays;
    compareId=documentsForView().some(d=>d.id===saved.compare)?saved.compare:'';restoredScroll=saved.scroll;layerSort=saved.outline.sort;layerQuery=saved.outline.query;
    const selectedDoc=documentsForView().find(d=>d.id===(saved.selection.document||currentId)&&d.kind==='composition');
    const validInstance=selectedDoc&&flatten(selectedDoc.value as ChunkDocument).some(r=>r.node.id===saved.selection.instance);
    Object.assign(editorSelection,{document:validInstance?saved.selection.document:'',instance:validInstance?saved.selection.instance:'',timeline:undefined,chunk:undefined,world:saved.selection.world?.composition===workspaceId?saved.selection.world:undefined});
    if(saved.selection.chunk&&documentsForView().some(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===saved.selection.chunk))editorSelection.chunk=saved.selection.chunk;
    const t=saved.selection.timeline,seq=sequence();
    if(t?.kind==='camera')editorSelection.timeline=t;
    if(t&&seq){const track=(t.kind==='key'||t.kind==='track')?seq.tracks.find(r=>r.id===t.track):undefined;
      if(t.kind==='camera'||t.kind==='track'&&track||t.kind==='key'&&track?.keys[t.index]||'id'in t&&(t.kind==='shot'?seq.shots:t.kind==='text'?seq.text:t.kind==='fade'?seq.fades:t.kind==='beat'?seq.beats:seq.commands??[]).some(r=>r.id===t.id))editorSelection.timeline=t;
    }
    playing=false;animating=false;outlineSnapshot=undefined;outlineVersion='';
  }
  function syncEditorLocation(){
    if(!linked||!viewScene())return;const query=new URLSearchParams(workspaceId?{composition:workspaceId}:{scene:viewScene()}),panel=panels.find(p=>p.details.open)?.details.dataset.tool;
    if(activeCheckpointId)query.set('checkpoint',activeCheckpointId);if(currentTimeline()){query.set('sequence',sequenceId);query.set('time',String(time));}if(compareId)query.set('compare',compareId);if(panel)query.set('panel',panel);
    const hash='#'+query.toString();if(location.hash!==hash)history.replaceState(null,'',location.pathname+location.search+hash);
  }

  let cleanupWorld: void | (() => void);
  let cleanupAssets: void | (() => void); const assetSession: AssetBrowserSession = {};
  const assetHost = element('details', 'asset-browser tool-panel'); assetHost.dataset.tool = 'assets'; assetHost.append(element('summary', '', 'Asset library')); const assetPanel = element('div'); assetHost.append(assetPanel); if (config.assetPreview) root.insertBefore(assetHost, workspace);
  let cityDistrict:string|undefined,layoutDirty=false;
  const mapHost = element('details', 'world-map tool-panel'); mapHost.dataset.tool = 'world-map'; mapHost.append(element('summary', '', 'City map')); const mapPanel = element('div'); mapHost.append(mapPanel); if (config.worldPanel) root.insertBefore(mapHost, workspace);
  /** Artwork pictures for the Add picker and the Library, drawn by the same isolated game preview. */
  let thumbnailDocuments: EditorDocument[] | undefined;
  const thumbnails = config.assetPreview ? createThumbnails((target, entry) => config.assetPreview!(target, entry, entry.preview === 'standalone' ? undefined : entry.usages.find(usage => !usage.scene.startsWith('sequence-')) ?? entry.usages[0], thumbnailDocuments ??= model.list(), { time: 0, reduced: true, environment: { ...config.initialEnvironment, renderScale: 1 } })) : undefined;
  const workbenches = (config.workbenches ?? []).map(workbench => {
    const details = element('details', 'workbench-screen tool-panel'), panel = element('section'); details.dataset.workbench = details.dataset.tool = workbench.id; details.append(element('summary', '', workbench.title), panel); if (workbench.beside) { details.classList.add('stage-panel'); workspace.append(details); } else root.insertBefore(details, workspace);
    return { config: workbench, details, panel, dispose: undefined as WorkbenchHandle | undefined, documentsVersion: [] as readonly unknown[], scene: '', autostart: false };
  });
  /**
   * Scene is the editor itself: outline, viewport and an inspector for the selection. Logic lists all of
   * the scene's logic at once and Play runs it; both act on the scene chosen in the header. Library,
   * World and Labs are not tied to a scene. The header has one tab for the scene (Layout and Logic are its two views,
   * chosen in the row below beside the scene picker) and one each for Library, World and Labs.
   */
  const groups = [
    { id: 'layout', label: 'Layout', title: 'Arrange chunks and artwork: scene preview, outline and inspector' },
    { id: 'animate', label: 'Animate', title: 'Edit a sequence over the same scene: timeline, keys and camera' },
    { id: 'logic', label: 'Logic', title: 'Interactions, story, dialogue, devices and wiring for the chosen chunk' },
    { id: 'world', label: 'World', title: 'The city map, travel and shared world definitions' },
    { id: 'labs', label: 'Review', title: 'Run configurations, review shortcuts and test worlds' },
    { id: 'library', label: 'Library', title: 'Artwork, characters, vehicles and other shared pieces' },
  ] as const;
  type Workspace = Exclude<typeof groups[number]['id'], 'library'>;
  type Group = Exclude<typeof groups[number]['id'], 'animate'>;
  /** Shared logic definitions live with the chunk logic that uses them. */
  const LOGIC_LIBRARY = new Set(['conversations', 'story-logic']);
  const panelGroup = (item: WorkbenchConfig): Group => item.area === 'scene' || LOGIC_LIBRARY.has(item.id) ? 'logic' : item.area ?? 'library';
  const panels = [...(config.assetPreview ? [{ details: assetHost, label: 'Assets', title: 'Asset library', group: 'library' as Group }] : []), ...(config.worldPanel ? [{ details: mapHost, label: 'City map', title: 'City map · open a place to edit it', group: 'world' as Group }] : []),
    // Wiring panels follow the logic panels under Logic.
    // Play is not a panel: it runs on the Scene stage in place of the canvas.
    ...[...workbenches].filter(item => !(item.config.area === 'scene' && item.config.mode === 'play')).sort((a, b) => Number(LOGIC_LIBRARY.has(a.config.id)) - Number(LOGIC_LIBRARY.has(b.config.id)) || Number(a.config.mode === 'wiring') - Number(b.config.mode === 'wiring')).map(item => ({ details: item.details, label: item.config.label ?? item.config.title.split(' · ')[0], title: item.config.title, group: panelGroup(item.config) }))];
  const chosen = new Map<Group, HTMLDetailsElement>(); let group: Group = 'layout';
  const subtools = element('nav', 'subtools'); subtools.setAttribute('aria-label', 'Panels in this workspace'); root.insertBefore(subtools, header.nextSibling);
  /** The scene picker, filled by refreshHeader; it leads the second row while the Scene tab is open. */
  const sceneContext = element('div', 'scene-context');
  const showLayout = () => { group = 'layout'; panels.forEach(item => item.details.open = false); refreshTools(); };
  const openPanel = (details: HTMLDetailsElement) => { const item = panels.find(p => p.details === details); if (!item) return; stopPlay(); group = item.group; chosen.set(group, details); details.open = true; refreshTools(); };
  /** Scene toolbar's Play: open the Play panel and start the scene immediately. */
  const playWorkbench = () => workbenches.find(item => item.config.area === 'scene' && item.config.mode === 'play');
  const canPlay = () => { if(workspaceId&&!workspaceDocuments(workspaceId,documentsForView(),worldState()?.checkpoint?.membership).length)return false;const item = playWorkbench(), scene = worldState()?.checkpoint?.scene??sceneId(); return !!item && !!scene && (!item.config.supports || item.config.supports(scene, documentsForView())); };
  /** Play runs the game on the Scene stage, in place of the canvas; Stop returns to editing at the same spot. */
  let playHandle: WorkbenchHandle | undefined;
  let playCheckpointId:string|undefined;
  let playStartMode:'preview'|'checkpoint'='preview';
  let locateCameraPending=false;
  let liveChunkRows:readonly ChunkStatus[]|undefined,chunkSignature='';
  const runtimeOutline=element('div','runtime-chunks');runtimeOutline.hidden=true;
  const inspectChunk=(id:string)=>{editorSelection.world=undefined;editorSelection.chunk=id;editorSelection.document='';editorSelection.instance='';editorSelection.timeline=undefined;refreshRight();};
  function receiveResidency(rows:readonly ChunkStatus[]|undefined){
    liveChunkRows=rows;left.classList.toggle('live-residency',!!rows);runtimeOutline.hidden=!rows;
    const signature=JSON.stringify(rows);if(signature===chunkSignature)return;chunkSignature=signature??'';
    if(rows)renderRuntimeChunks(runtimeOutline,rows,inspectChunk);
    if(editorSelection.chunk)refreshRight();
  }
  const playScene = () => {
    const item = playWorkbench(), scene = worldState()?.checkpoint?.scene??sceneId(); if (!item || !canPlay()) return; stopPlay(); playing = false; animating = false; showLayout();
    const viewport=gameViewport(playStartMode==='checkpoint'?!!worldState()?.checkpoint?.sequence:!!sequence());playHost.style.setProperty('--play-ratio',String(viewport.width/viewport.height));
    playCheckpointId=worldState()?.id;
    playHost.hidden = false; stage.hidden = true; viewportTools.hidden = true; root.dataset.playing = '';
    item.config.showScene?.(scene, documentsForView());
    try { playHandle = item.config.mount(playHost, { documents: documentsForView(),checkpoint:playCheckpointId,onCheckpoint:id=>{playCheckpointId=id;}, openScene, openInstance, scene, autostart: true, playSettings, stopPlay, playStart:{mode:playStartMode,viewport,sequence:sequence()?{id:sequenceId,time}:undefined,camera:painting.result?.gameCamera}, onResidency:receiveResidency, ...(item.config.authoring ? { authoring: authoringApi() } : {}) }); }
    catch (error) { playHost.replaceChildren(element('p', 'error', `Play unavailable: ${message(error)}`)); }
    refreshOptions(); refreshTimeline(); refreshRight();
  };
  function stopPlay() {
    if (playHost.hidden) return; playHandle?.(); playHandle = undefined; playHost.replaceChildren(); playHost.hidden = true; stage.hidden = false; delete root.dataset.playing;
    const checkpoint=playCheckpointId;playCheckpointId=undefined;playSettings.replaceChildren();
    if(checkpoint&&checkpoint!==activeCheckpointId){openCheckpoint(checkpoint);return;}
    refreshViewportTools(); refreshOptions(); refreshTimeline(); refreshRight(); void draw();
  }
  const showGroup = (id: Group) => { if (id === 'layout') { showLayout(); return; } if (!panels.some(p => p.group === id)) { showLayout(); return; } const target = chosen.get(id) ?? panels.find(p => p.group === id)?.details; if (target) openPanel(target); };
  const activeWorkspace = (): Workspace => group === 'layout' || group === 'library' ? (directionDocumentId ? 'animate' : 'layout') : group;
  const sequenceChoices = () => workspaceId ? workspaceSequences(workspaceId, documentsForView()) : documentsForView().filter(d => d.id === currentId && d.kind === 'composition' && !!(d.value as ChunkDocument).sequence);
  let lastDirection = '', lastTool = '';
  /** Layout edits base values; Animate enters the composition's sequence (the last one used, else the first). */
  function openWorkspace(ws: Workspace) {
    if (ws !== 'layout' && ws !== 'animate') { showGroup(ws); return; }
    showLayout(); const directing = !!directionDocumentId;
    if (ws === 'layout' && directing && workspaceId) { lastDirection = directionDocumentId; selectDirection(undefined); refresh(); rememberView(); return; }
    if (ws === 'animate' && !directing) {
      const choices = sequenceChoices(), pick = choices.find(d => d.id === lastDirection) ?? choices[0];
      if (pick) { selectDirection(pick); refresh(); rememberView(); } else notice('This composition has no sequence to animate. Open a checkpoint or composition that has one.');
    }
  }
  function refreshTools() {
    const active = panels.find(item => item.details.open), beside = !!active?.details.classList.contains('stage-panel');
    // The open panel is in the URL (#style-frames, #characters, …) so it can be linked and survives reloads.
    syncEditorLocation();
    root.dataset.tool = active && !beside ? active.details.dataset.tool ?? 'scene' : 'scene'; root.dataset.group = group; if (beside) root.dataset.stagePanel = active!.details.dataset.tool!; else delete root.dataset.stagePanel;
    const ws = activeWorkspace();
    if (root.dataset.tool === 'scene' && lastTool !== 'scene' && lastTool) refreshOptions(); lastTool = root.dataset.tool;
    tools.replaceChildren();
    for (const item of groups) {
      if (item.id === 'library' || item.id !== 'layout' && item.id !== 'animate' && !panels.some(p => p.group === item.id)) continue;
      const tab = button(item.label, () => openWorkspace(item.id), item.title); tab.dataset.group = item.id; tab.setAttribute('aria-pressed', String(item.id === ws)); tools.append(tab);
    }
    // One strip of the workspace's panels; the scene views have none. Logic panels act on the chunk chosen at its start.
    const members = panels.filter(p => p.group === group); subtools.replaceChildren();
    subtools.hidden = group === 'layout' || group !== 'logic' && group !== 'library' && members.length < 2;
    if (group === 'logic') subtools.append(sceneContext, element('span', 'strip-divider'));
    if (group === 'library') subtools.append(button('◂ Scene', showLayout, 'Back to the scene'));
    if (group !== 'layout') for (const item of members) { const tab = button(item.label, () => openPanel(item.details), item.title); tab.dataset.tool = item.details.dataset.tool; tab.setAttribute('aria-pressed', String(item.details.open)); subtools.append(tab); }
    if (group === 'layout' && sceneContext.parentElement !== left) left.insertBefore(sceneContext, left.querySelector('.dock-head')?.nextSibling ?? left.firstChild);
    if(root.dataset.tool==='scene'&&layoutDirty){layoutDirty=false;refreshLeft();refreshRight();}
    refreshMode();
  }
  function refreshMode() {
    const ws = activeWorkspace(); root.dataset.workspace = ws; if (ws !== dockWorkspace) applyDocks(ws);
    for (const tab of tools.children) tab.setAttribute('aria-pressed', String((tab as HTMLElement).dataset.group === ws));
    const playingNow = !playHost.hidden, scene = root.dataset.tool === 'scene', seq = scene && !!directionDocumentId;
    modeChip.className = 'mode-chip' + (playingNow ? ' playing' : seq ? ' sequence' : '');
    modeChip.textContent = playingNow ? 'PLAYING' : seq ? `SEQUENCE · ${sequenceId} @ ${time.toFixed(1)} s` : scene ? 'BASE EDITING' : (groups.find(g => g.id === group)?.label ?? '').toUpperCase();
    const mode = playingNow ? 'playing' : seq ? 'sequence' : '', entering = mode === 'sequence' && root.dataset.mode !== 'sequence'; if (mode) root.dataset.mode = mode; else delete root.dataset.mode;
    // Entering a sequence, the inspector opens on the sequence's own settings rather than the checkpoint's starting state.
    if (entering && inspector.selectSection('world-sequence')) refreshRight();
    modeBanner.hidden = !mode; stageWrap.toggleAttribute('data-banner', !!mode); modeBanner.className = 'mode-banner ' + mode;
    if (mode === 'playing') { bannerTitle.textContent = '● Playing · private run'; bannerDetail.textContent = 'Edits made now are not part of this run'; bannerAction.textContent = '■ Stop'; bannerAction.hidden = false; }
    else if (mode === 'sequence') { bannerTitle.textContent = `● Sequence editing · ${sequenceId}`; bannerDetail.textContent = `Changes record keys at ${time.toFixed(1)} s`; bannerAction.textContent = 'Exit to base editing'; bannerAction.hidden = !workspaceId; }
    if (!scene) contextLine.textContent = panels.find(p => p.details.open)?.title ?? '';
  }
  const sceneName = (scene:string)=>{const names:Record<string,string>={'sequence-title':'Title','sequence-opening':'Opening glide','sequence-intro':'Act I cinematic','sequence-act2':'Act II cinematic','sequence-taxi':'Taxi flight'};if(names[scene])return names[scene];const doc=documentsForView().find(d=>d.id.startsWith('authored.')&&d.kind==='scene'&&(d.value as {id?:string}).id===scene);return doc?(doc.value as {name:string}).name:config.sceneLabel?.(scene)??scene;};
  const sceneId = () => { const doc = compositionDocument(); return doc ? (doc.value as ChunkDocument).scene : ''; };
  const openInstance = (document: string, instance: string) => { editorSelection.world=undefined; if(workspaceId&&workspaceDocuments(workspaceId,documentsForView()).some(d=>d.id===document)){editorSelection.document=document;editorSelection.instance=instance;editorSelection.chunk=undefined;showLayout();refresh();return;}openDocument(document); currentId = document; editorSelection.chunk=undefined;editorSelection.document=''; editorSelection.instance = instance; playing = false; syncSequence(); showLayout(); refresh(); };
  function emptyState(item: WorkbenchConfig, scene: string) {
    const box = element('div', 'empty-state'); box.append(element('h2', '', item.title.split(' · ')[0]), element('p', '', item.unsupported ?? `${scene ? sceneName(scene) : 'This document'} has nothing to edit here yet.`));
    const others = documentsForView().filter(doc => doc.kind === 'composition' && item.supports!((doc.value as ChunkDocument).scene,documentsForView()));
    if (others.length) { box.append(element('p', 'muted', 'Available for')); const row = element('div', 'row'); for (const doc of others) row.append(button(sceneName((doc.value as ChunkDocument).scene), () => openDocument(doc.id))); box.append(row); }
    return box;
  }
  /** Sectioned forms mount into the frame's stage; the navigator lists their sections and follows re-renders. */
  const mountWorkbench = (item: typeof workbenches[number], context: WorkbenchContext): WorkbenchHandle => {
    if (item.config.layout !== 'sections') return item.config.mount(item.panel, context);
    const frame = createFrame(item.panel, {}, item.config.label ?? item.config.title), handle = item.config.mount(frame.stage, context), stop = sectionNavigator(frame.nav, frame.stage, item.config.id);
    const dispose = (() => { stop(); handle(); item.panel.classList.remove('framed'); item.panel.replaceChildren(); }) as WorkbenchHandle;
    if (handle.refresh) dispose.refresh = () => handle.refresh!();
    return dispose;
  };
  const sameDocuments = (a: readonly unknown[], b: readonly unknown[]) => a === b || a.length === b.length && a.every((doc, index) => doc === b[index]);
  const refreshWorkbench = (item: typeof workbenches[number], changed = false) => {
    if (!item.details.open) { item.dispose?.(); item.dispose = undefined; return; }
    const documents = documentsForView(), relevant = item.config.documentIds ? documents.filter(doc => item.config.documentIds!.includes(doc.id)) : documents;
    // Document views are frozen and change identity only when their source changes, so identity is the version.
    const version: readonly unknown[] = item.config.documentDependent ? relevant : [], scene = sceneId(), sceneBound = item.config.area === 'scene';
    if (sceneBound && item.dispose && item.scene !== scene) { item.dispose(); item.dispose = undefined; }
    else if (changed && item.config.documentDependent && !sameDocuments(version, item.documentsVersion) && item.dispose) {
      if (item.dispose.refresh) { item.documentsVersion = version; item.dispose.refresh(); }
      else { item.dispose(); item.dispose = undefined; }
    }
    if (item.details.open && !item.dispose) {
      item.documentsVersion = version; item.scene = scene;
      if (sceneBound && item.config.supports && !item.config.supports(scene,documents)) { item.panel.replaceChildren(emptyState(item.config, scene)); item.dispose = (() => item.panel.replaceChildren()) as WorkbenchHandle; return; }
      if (sceneBound) item.config.showScene?.(scene,documents);
      const autostart = item.autostart; item.autostart = false;
      try { item.dispose = mountWorkbench(item, {get documents(){return documentsForView();},openConversation,openComposition,openCheckpoint,editCheckpoint,openSequence, openScene, openInstance, ...(sceneBound ? { scene } : {}), ...(autostart ? { autostart } : {}), ...(item.config.authoring ? { authoring: authoringApi() } : {}) }); }
      catch (error) { item.panel.replaceChildren(element('p', 'error', `Workbench unavailable: ${message(error)}`)); }
    }
  };
  async function requestReload(){
    if(!model.dirty()){await load();return;}
    openInspector({title:'Reload source',action:'Discard edits and reload',build:body=>{body.append(element('p','','Reloading discards unsaved edits and their Undo history. Download edits first if you want to keep them.'));return async()=>{await load();};}});
  }
  function authoringApi(): NonNullable<WorkbenchContext['authoring']> {
    return { snapshot:()=>model.inspectDocuments(), get: (id: string) => model.get(id), edit: (id: string, label: string, value: unknown) => run(() => model.edit(id, label, () => value),true),
      editDocuments: (changes: { id: string; value: unknown }[], label: string) => run(() => model.importDocuments(changes, label),true),
      undo: () => run(() => model.undo()), redo: () => run(() => model.redo()), save,
      reload: requestReload,
      dirty: (id: string) => model.dirty(id) };
  }
  function openConversation(document:string,conversation:string){
    const item=workbenches.find(item=>item.config.selectConversation);if(!item){notice('Conversation library is unavailable.',true);return;}
    item.config.selectConversation!(document,conversation);if(item.details.open)item.dispose?.refresh?.();else openPanel(item.details);
  }
  /** One panel at a time: opening any closes the others. */
  const closeOthers = (details: HTMLDetailsElement) => { if (details.open) panels.forEach(other => { if (other.details !== details) other.details.open = false; }); };
  workbenches.forEach(item => item.details.ontoggle = () => { closeOthers(item.details); refreshWorkbench(item); refreshTools(); });
  assetHost.ontoggle = () => { closeOthers(assetHost); refreshLibrary(); refreshTools(); };
  mapHost.ontoggle = () => { closeOthers(mapHost); refreshMap(); refreshTools(); };
  refreshTools();
  const notice = (text: string, error = false) => { if(error){inspectorError=text;refreshRight();right.scrollTop=0;} status.textContent = error?'Edit blocked · see inspector':text; status.title = text; status.className = 'status' + (error ? ' error' : ''); };
  let refreshHeaderActions=()=>{};
  const run = (action: () => void,propagate=false,scope:'all'|'artwork'='all') => perfMeasure('editor.command', () => { try { notice(''); perfMeasure('editor.action', action); inspectorError='';placementIssue=undefined;if(!numericScrubbing){thumbnailDocuments = undefined; thumbnails?.invalidate();}if(scope==='artwork'&&!numericScrubbing){withViewDocuments(()=>{refreshHeaderActions();perfMeasure('editor.inspector',refreshRight);perfMeasure('editor.timeline',refreshTimeline);void draw();});}else refresh(); if (!picker.hidden&&!numericScrubbing) renderPicker(); } catch (e) { notice(message(e), true);if(propagate)throw e; } });
  const current = () => currentId ? documentsForView().find(d=>d.id===currentId) : undefined;
  /** The document an open panel edits (Export/Import JSON), otherwise the current composition. */
  const activeDocument = () => { const id = workbenches.find(item => item.details.open)?.config.primaryDocumentId; return id && documentsForView().some(doc => doc.id === id) ? model.get(id) : current(); };
  const directionDocument=()=>documentsForView().find(d=>d.id===directionDocumentId);
  // The frame loop and every draw ask for the open sequence; it is compiled once per document version.
  const timelines = new WeakMap<object, ReturnType<typeof sequenceProgram>>();
  const currentTimeline = () => { const doc = directionDocument(); if (!(doc?.kind === 'composition' && (doc.value as ChunkDocument).sequence)) return undefined; if (!Object.isFrozen(doc.value)) return sequenceProgram({[doc.id]:doc.value as ChunkDocument}); let program = timelines.get(doc.value as object); if (!program) { program = sequenceProgram({[doc.id]:doc.value as ChunkDocument}); timelines.set(doc.value as object, program); } return program; };
  const sequence = () => currentTimeline()?.sequences.find(s => s.id === sequenceId);
  let evaluatedContext:{key:string;version:object;value:import('../art/core/timeline').TimelineContext}|undefined;
  const evaluationContext = () => {const key=JSON.stringify([currentId,time,reduced,sequenceId,environment,canvas.width,canvas.height]);if(evaluatedContext?.version===model.sourceVersion&&evaluatedContext.key===key)return evaluatedContext.value;const base=model.timelineContext(),value=config.timelineContext?.(base,{time,reduced,sequenceId,environment:{...environment},viewport:{width:baseWidth,height:baseHeight},timeline:currentTimeline()})??base;evaluatedContext={key,version:model.sourceVersion,value};return value;};
  const viewCompositionDocument = () => { const doc = directionDocument()??current(); return doc?.kind === 'composition'?doc:undefined; };
  const compositionDocument = () => editorSelection.document ? documentsForView().find(d=>d.id===editorSelection.document) : viewCompositionDocument();
  const selected = () => { const doc = compositionDocument(); return doc ? flatten(doc.value as ChunkDocument).find(x => x.node.id === editorSelection.instance)?.node : undefined; };
  const editInstance = (name: string, action: (node: AssetInstance) => void, scope:'all'|'artwork'='all') => run(() => { const doc = compositionDocument(); if (!doc || !editorSelection.instance) return; model.updateInstance(doc.id, editorSelection.instance, name, n=>{const before={...n.props},bindings={...n.bindings};action(n);guardLinkedProperties(doc.id,n,before,bindings);}); },false,scope);
  const editTimeline = (name: string, action: (doc: TimelineProgram) => void) => { playing = false; run(() => model.edit(viewCompositionDocument()!.id, name, value => { const composition=value as ChunkDocument,program=sequenceProgram({[viewCompositionDocument()!.id]:composition});action(program);const {composition:reference,...sequence}=program.sequences[0];composition.sequence=sequence;return composition; })); };
  async function api(path: string, body?: unknown) {
    if (!config.api) throw new Error('This browser editor has no repository write service. Download edits instead.');
    const response = await fetch(config.api.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-authoring-token': config.api.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit' });
    const value = await response.json(); if (!response.ok) throw new Error(response.status === 409 ? `Source changed outside the editor. Pending edits are kept. Export them or reload. ${value.error ?? ''}` : value.error ?? `Authoring service returned ${response.status}`); return value;
  }
  /** Opens the panel named in the URL once, on the first load. */
  /** A link can open a scene (`#scene=downtown-next`), optionally beside another (`&compare=downtown`), once on load. */
  let sceneLinked = false;
  function applyLinkedContext(query:URLSearchParams){
    const checkpoint=query.get('checkpoint'),composition=query.get('composition'),scene=query.get('scene');
    if(checkpoint)openCheckpoint(checkpoint,composition??undefined);
    else if(composition)openComposition(composition);
    else if(scene)openScene(scene,query.get('compare')??undefined);
    const direction=query.get('sequence');if(direction){const at=query.has('time')?Number(query.get('time')):undefined;openSequence(direction,at!==undefined&&Number.isFinite(at)&&at>=0?at:undefined);}
  }
  function openLinkedScene(){
    if(sceneLinked)return;sceneLinked=true;
    if(linkQuery?.has('checkpoint')||linkQuery?.has('composition')||linkQuery?.has('scene')){applyLinkedContext(linkQuery);const saved=viewMemory.read(viewKey());if(saved&&viewMatchesLocation(saved,linkQuery)){restoreView();refresh();}return;}
    const last=viewMemory.lastScene();if(last.startsWith('composition:'))openComposition(last.slice(12));
    else if(documentsForView().some(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===last))openScene(last);
    else{restoreView();refresh();}
  }
  function openLinkedPanel() { if (linked) return; linked = true; const tool = linkedPanel; const target = tool && panels.find(p => p.details.dataset.tool === tool); if (target) openPanel(target.details); }
  const navigateEditorLink=()=>{
    if(!viewReady)return;
    const query=location.hash.includes('=')?new URLSearchParams(location.hash.slice(1)):undefined;
    if(query)applyLinkedContext(query);const scene=query?.get('scene'),panel=query?.get('panel')??(query?'':decodeURIComponent(location.hash.slice(1)));
    const target=panels.find(p=>p.details.dataset.tool===panel);
    if(target)openPanel(target.details);else if(scene)showLayout();
  };
  async function load() {
    playing = false;
    try {
      const documents = config.api ? await api('/documents') as EditorDocument[] : copy(config.documents ?? []); model.load(documents); thumbnailDocuments = undefined; thumbnails?.invalidate();
      if (!documents.some(d => d.id === currentId)) currentId = documents.find(d => d.kind === 'composition')?.id ?? documents[0]?.id ?? '';
      editorSelection.instance = ''; editorSelection.document=''; syncSequence(); refresh(); openLinkedScene(); openLinkedPanel(); viewReady=true;rememberView();notice(documents.length ? config.api ? 'Source documents loaded. Edits stay local until Save.' : '' : 'No authoring documents are available.');
    } catch (e) { notice(`Could not load authoring documents: ${message(e)}`, true); }
  }
  async function save() {
    if (saving) return; const edits = model.edits(); if (!edits.length) return;
    if (!config.api) {
      try {
        const blob = new Blob([JSON.stringify(createDocumentBundle(edits, documentsForView()))], { type: 'application/json' });
        if (blob.size > 2 * 1024 * 1024) throw new Error('Edit bundle exceeds 2 MiB. Export individual documents instead.');
        const url = URL.createObjectURL(blob), link = element('a'); link.href = url; link.download = 'access-denied-editor-edits.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        notice('Edits downloaded. Import edits to continue later, or import them into the local composer to save to repository source.');
      } catch (error) { notice(`Download failed: ${message(error)}`, true); } return;
    }
    saving = true; refreshHeader(); notice('Validating and saving source documents…');
    try { const result = await api('/save', { edits }) as { documents: EditorDocument[] }; model.confirmSaved(result.documents); notice('Saved to source. Undo remains available.'); }
    catch (e) { notice(message(e), true); }
    finally { saving = false; refresh(); }
  }
  function syncSequence() { const doc = currentTimeline(); if (!doc?.sequences.some(s => s.id === sequenceId)) sequenceId = doc?.sequences[0]?.id ?? ''; const seq = sequence(); time = Math.min(time, seq?.duration ?? time); loopFrom = 0; loopTo = seq?.duration ?? 0; }
  function openDocument(id:string,composition=''){
    cancelNumericScrub();
    return perfMeasure('editor.scene-switch',()=>{
      rememberView();cancelWorldDrag?.();
      if(id!==currentId||composition!==workspaceId){compareId='';stopPlay();painting.workspaceAnchor=undefined;Object.assign(sequenceNav,{x:0,y:0,zoom:1});}
      workspaceId=composition;currentId=id;activeCheckpointId=undefined;
      editorSelection.world=undefined;editorSelection.chunk=undefined;editorSelection.document='';editorSelection.instance='';
      const doc=current();selectDirection(!composition&&doc?.kind==='composition'&&(doc.value as ChunkDocument).sequence?doc:undefined);
      restoreView();refresh();rememberView();
    });
  }
  /** All direction entry points establish the same paused temporal context. */
  function selectDirection(source:EditorDocument|undefined,at?:number,preserveAmbient=at===undefined){
    const ambient=time+ambientOffset;
    if(directionDocumentId)sequenceTimes.set(directionDocumentId,time);
    directionDocumentId=source?.id??'';sequenceId='';time=at??(source?sequenceTimes.get(source.id)??0:time);playing=false;animating=false;
    editorSelection.timeline=undefined;outlineSnapshot=undefined;outlineVersion='';syncSequence();
    ambientOffset=preserveAmbient?ambient-time:0;
  }
  function openSequence(id:string,at?:number){
    const source=sequenceSource(id,documentsForView(),workspaceId);
    if(!source){notice('Sequence '+id+' does not exist in this workspace.',true);return;}
    const playhead=at??(directionDocumentId===source.id?time:sequenceTimes.get(source.id));
    if(!workspaceId&&source.id!==currentId)openDocument(source.id);
    selectDirection(source,playhead,at===undefined);refresh();rememberView();
  }
  function openCheckpoint(id:string,requestedComposition?:string){
    stopPlay();
    if(!id){activeCheckpointId='';config.worldStates?.select(viewScene(),'');refresh();return;}
    const state=config.worldStates?.list('',documentsForView()).find(s=>s.id===id),checkpoint=state?.checkpoint;if(!checkpoint){notice('Checkpoint '+id+' does not exist.',true);return;}
    const composition=checkpoint.composition??requestedComposition;
    if(composition){const workspace=compositionWorkspaces(documentsForView(),checkpoint.membership).find(w=>w.id===composition);if(!workspace?.chunks.some(d=>(d.value as ChunkDocument).scene===checkpoint.scene)){notice('This checkpoint does not start in composition '+composition,true);return;}if(composition!==workspaceId)openComposition(composition);}
    else openScene(checkpoint.scene);
    const source=checkpoint.sequence?sequenceSource(checkpoint.sequence.id,documentsForView(),workspaceId):undefined;
    if(source&&!workspaceId&&source.id!==currentId)openDocument(source.id);
    selectDirection(source,checkpoint.sequence?.time??0);
    activeCheckpointId=id;focusCheckpointRoot(true);config.worldStates!.select(checkpoint.scene,id);refresh();rememberView();
  }
  function editCheckpoint(id:string){openCheckpoint(id);inspector.selectSection('starting-state');refresh();}
  /** A checkpoint frames its player chunk without changing the composition's identity. */
  function focusCheckpointRoot(reset=false){
    if(!workspaceId||!activeCheckpointId)return;
    const checkpoint=config.worldStates?.list('',documentsForView()).find(s=>s.id===activeCheckpointId)?.checkpoint;
    if(!checkpoint)return;
    const root=workspaceDocuments(workspaceId,documentsForView(),checkpoint.membership).find(d=>(d.value as ChunkDocument).scene===checkpoint.scene);
    if(root&&root.id!==currentId){currentId=root.id;if(reset){painting.workspaceAnchor=undefined;Object.assign(sequenceNav,{x:0,y:0,zoom:1});editorSelection.document='';editorSelection.instance='';editorSelection.timeline=undefined;editorSelection.chunk=undefined;}}
  }
  function openComposition(id:string){const workspace=compositionWorkspaces(documentsForView()).find(w=>w.id===id);if(!workspace){notice('Unknown composition '+id,true);return;}const source=workspace.chunks[0]??documentsForView().find(d=>d.id===currentId&&d.kind==='composition')??documentsForView().find(d=>d.kind==='composition');if(!source)return;if(!root.dataset.stagePanel)showLayout();openDocument(source.id,id);}
  function openScene(scene: string, compare?: string) { const doc = documentsForView().find(d => d.kind === 'composition' && (d.value as ChunkDocument).scene === scene); if (doc) { if (!root.dataset.stagePanel) showLayout(); openDocument(doc.id); if (compare) { compareId = compare; refreshOptions(); void draw(); } } else notice(`Chunk ${scene} has no editable source in this session.`, true); }
  function refreshHeader() {
    const brand = element('div', 'brand'); brand.append(element('strong', '', 'ACCESS DENIED')); brand.title = config.api ? 'Local composer' : 'Public editor'; header.replaceChildren(brand, tools, documentSwitch, searchField, element('span', 'header-spacer'));
    const actions = element('div', 'actions'), menu = element('details', 'menu'), menuItems = element('div', 'menu-items'); menu.append(element('summary', '', 'More'), menuItems);
    const docs = documentsForView(), chooser = element('select', 'document-picker'); chooser.setAttribute('aria-label', 'Composition or chunk');
    const unsaved = (doc: EditorDocument) => model.dirty(doc.id) || doc.kind === 'composition' && (config.sceneDocuments?.((doc.value as ChunkDocument).scene,docs) ?? []).some(id => model.dirty(id));
    const sequenceDoc = (doc: EditorDocument) => doc.kind === 'composition' && !!(doc.value as ChunkDocument).sequence;
    const label = (doc: EditorDocument, text?: string) => `${unsaved(doc) ? '● ' : ''}${text ?? sceneName((doc.value as ChunkDocument).scene)}`;
    const option = (doc: EditorDocument, text?: string) => { const node = element('option', '', label(doc, text)); node.value = doc.id; return node; };
    const arrangements=compositionWorkspaces(docs);if(arrangements.length){const group=element('optgroup');group.label='Compositions';for(const row of arrangements){const option=element('option','',row.name+' · '+row.chunks.length+' chunks');option.value='@composition/'+row.id;group.append(option);}chooser.append(group);}
    const places = docs.filter(d => d.kind === 'composition' && !sequenceDoc(d)), listed = new Set<string>();
    // District → place → scene. A place with one scene is one entry; a place with several gets a heading and indented scenes.
    let tree: ReturnType<NonNullable<ComposerConfig['sceneTree']>> = [];
    try { tree = config.sceneTree?.(docs) ?? []; } catch { tree = []; }
    for (const district of tree) {
      const optgroup = element('optgroup'); optgroup.label = district.label;
      for (const place of district.places) {
        const found = place.scenes.flatMap(scene => places.filter(d => (d.value as ChunkDocument).scene === scene && !listed.has(d.id)));
        if (!found.length) continue; found.forEach(d => listed.add(d.id));
        if (found.length === 1) { optgroup.append(option(found[0], place.label)); continue; }
        const heading = element('option', '', place.label); heading.disabled = true; heading.className = 'place-heading'; optgroup.append(heading);
        for (const doc of found) optgroup.append(option(doc, '\u00a0\u00a0\u00a0' + sceneName((doc.value as ChunkDocument).scene)));
      }
      if (optgroup.children.length) chooser.append(optgroup);
    }
    for (const [title, list] of [[tree.length ? 'Other chunks' : 'Chunks', places.filter(d => !listed.has(d.id))], ['Sequences', docs.filter(sequenceDoc)]] as const) {
      if (!list.length) continue; const optgroup = element('optgroup'); optgroup.label = title;
      for (const doc of list) optgroup.append(option(doc));
      chooser.append(optgroup);
    }
    chooser.value = workspaceId?'@composition/'+workspaceId:currentId; chooser.onchange = () => chooser.value.startsWith('@composition/')?openComposition(chooser.value.slice(13)):openDocument(chooser.value); sceneContext.replaceChildren(); const newMenu = element('details', 'menu new-menu'), newItems = element('div', 'menu-items'); newMenu.append(element('summary', '', '＋'), newItems); newMenu.querySelector('summary')!.title = 'New chunk or composition'; documentSwitch.replaceChildren(chooser, newMenu);
    if (config.newScene) { const blocked = config.newScene.blocked(authoringApi()), add = button('＋ Chunk', openNewScene, blocked || 'Create a new chunk source and open it here'); add.className = 'new-scene'; add.textContent = 'New chunk…'; add.disabled = !!blocked; newItems.append(add); }
    if (current()?.kind === 'composition') { const composition = button('New composition…', () => openMountPicker(worldControls(), true), 'Start a new composition'); newItems.append(composition); if (workspaceId) { const mount = button('Mount chunk or group…', () => openMountPicker(worldControls()), 'Mount a chunk or group into this composition'); newItems.append(mount); } }
    const dirty = element('span', 'state ' + (model.dirty() ? 'dirty' : 'muted'), model.dirty() ? 'Unsaved changes' : config.api ? 'Saved' : 'Published snapshot'); header.append(actions);
    const saveButton = button(saving ? 'Saving…' : config.api ? 'Save' : 'Download edits', () => void save(), config.api ? 'Save to source (Ctrl S)' : 'Download your edits as a file'); saveButton.className = 'primary'; saveButton.disabled = saving || !model.dirty();
    const undo = button('Undo', () => run(() => model.undo()), model.undoLabel), redo = button('Redo', () => run(() => model.redo())); undo.disabled = !model.canUndo; redo.disabled = !model.canRedo; const discard=button('Discard all changes',()=>{stopPlay();playing=false;animating=false;editorSelection.chunk=undefined;editorSelection.timeline=undefined;editorSelection.instance='';editorSelection.document='';run(()=>model.discard());},'Restore the last loaded or saved snapshot; Undo can recover discarded edits');discard.disabled=saving||!model.dirty();undo.textContent='↶';undo.className='icon';undo.setAttribute('aria-label','Undo');redo.textContent='↷';redo.className='icon';redo.setAttribute('aria-label','Redo');actions.append(undo,redo,dirty,saveButton,menu);
    menuItems.append(discard,button(config.api ? 'Reload source' : 'Reset edits', () => void requestReload()),button('Reset layout', resetLayout, 'Restore default dock sizes and open docks in every workspace'));
    // A geometry gesture cannot change composition membership, checkpoints or toolbar choices.
    // Update its status/history without recompiling all of those unrelated menus on release.
    refreshHeaderActions=()=>{const changed=model.dirty();dirty.textContent=changed?'Unsaved changes':config.api?'Saved':'Published snapshot';dirty.className='state '+(changed?'dirty':'muted');saveButton.disabled=discard.disabled=saving||!changed;undo.disabled=!model.canUndo;undo.title=model.undoLabel??'';redo.disabled=!model.canRedo;
      const ids=new Set([compositionDocument()?.id,viewCompositionDocument()?.id]);for(const row of chooser.options)if(ids.has(row.value)){const doc=documentsForView().find(d=>d.id===row.value);if(doc)row.textContent=(unsaved(doc)?'● ':'')+(row.textContent??'').replace(/^● /,'');}
    };
    const bundleFile = element('input'); bundleFile.type = 'file'; bundleFile.accept = 'application/json,.json'; bundleFile.hidden = true; bundleFile.setAttribute('aria-label', 'Import downloaded edits');
    bundleFile.onchange = async () => { const file = bundleFile.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const changes = readDocumentBundle(JSON.parse(await file.text()), documentsForView()); run(() => { model.importDocuments(changes); syncSequence(); }); } catch (error) { notice(`Import failed: ${message(error)}`, true); } finally { bundleFile.value = ''; } };
    menuItems.append(button('Import edits', () => bundleFile.click()), bundleFile);
    if(config.newScene?.remove&&config.newScene.removable?.(authoringApi()).includes(viewScene()))menuItems.append(button('Remove chunk source',()=>{
      const id=viewScene();openInspector({title:'Remove source · '+id,action:'Remove source',build:body=>{body.append(element('p','','This deletes the authored chunk source and its default checkpoints. To keep the source and remove it from this composition, use Unmount in the chunk inspector.'));return()=>{config.newScene!.remove!(authoringApi(),id);refresh();};}});
    }));
    menuItems.append(button('Export JSON', () => { const doc = activeDocument(); if (!doc) return; const url = URL.createObjectURL(new Blob([JSON.stringify(doc.value, null, 2) + '\n'], { type: 'application/json' })); const link = element('a'); link.href = url; link.download = doc.id + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.onchange = async () => { const selectedFile = file.files?.[0]; if (!selectedFile) return; try { if (selectedFile.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const value: unknown = JSON.parse(await selectedFile.text()); run(() => { const doc = activeDocument(); if (!doc || doc.kind === 'world') throw new Error('Select an editable document to import'); model.edit(doc.id, 'Import document', () => value); syncSequence(); }); } catch (e) { notice(`Import failed: ${message(e)}`, true); } };
    const importButton = button('Import JSON', () => file.click()); importButton.disabled = activeDocument()?.kind === 'world'; menuItems.append(importButton, file);
  }
  function updateCrumb() {
    const scene = sceneId(), node = editorSelection.instance && selected() ? editorSelection.instance : '';
    crumb.textContent = !scene ? '' : [sceneName(scene), editorSelection.chunk && !node ? 'chunk' : '', node].filter(Boolean).join(' › ');
  }
  function refreshOptions() {
    updateContextSummary=()=>refreshMode();contextLine.textContent='';
    options.replaceChildren(); ambientLabel = undefined; syncWorldState(); previewBar.replaceChildren(); showSlot.replaceChildren();
    const bar = element('div', 'scene-toolbar'), composition = current()?.kind === 'composition';
    const cluster = (name: string) => { const node = element('div', 'toolbar-group'); node.setAttribute('role', 'group'); node.setAttribute('aria-label', name); bar.append(node); return node; };
    if (!playHost.hidden) {
      bar.append(element('span', 'toolbar-label', `Playing ${sceneName(worldState()?.checkpoint?.scene??sceneId())} · game camera · from ${playStartMode==='preview'?'preview':'checkpoint start'}`)); options.append(bar); previewBar.hidden = true; refreshMode(); return;
    }
    previewBar.hidden = !composition; updateCrumb();
    if (composition) {
      const add = button('＋ Add', () => openPicker(), 'Add artwork where you are looking (A)'); add.disabled=!!workspaceId&&!workspaceDocuments(workspaceId,documentsForView()).length; cluster('Assets').append(add);
      const animation = cluster('Ambient animation'), toggle = button((sequence()?playing:animating) ? '❚❚ Pause' : sequence() ? '▶ Play sequence' : '▶ Live motion', toggleAnimation, (sequence()?playing:animating) ? 'Pause (Space)' : 'Run ambient animation, such as people, lights and signs, without playing the game (Space). Home returns to the first frame.');
      toggle.setAttribute('aria-pressed', String(sequence()?playing:animating)); ambientLabel = element('span', 'time', `${time.toFixed(1)} s`);
      animation.append(toggle,ambientLabel,...(!currentTimeline()?[speedControl()]:[]));
      const choices = sequenceChoices();
      if (directionDocumentId && choices.length > 1) { const pick = select(choices.map(d => ({ value: d.id, label: 'Sequence · ' + (d.value as ChunkDocument).sequence!.id })), directionDocumentId, value => { selectDirection(choices.find(d => d.id === value)); refresh(); rememberView(); }); pick.setAttribute('aria-label', 'Sequence'); cluster('Sequence').append(pick); }
      const grid = select([{ value: '0', label: 'Snap off' }, ...[1, 2, 4, 8, 16].map(n => ({ value: String(n), label: `Snap ${n} px` }))], String(snap), value => { snap = Number(value); });
      grid.title = 'Dragging and arrow keys snap to this grid'; grid.setAttribute('aria-label', 'Snap'); cluster('Snap').append(grid);
    }
    const controls: EnvironmentControl[] = (config.environmentControls ?? [{ key: 'cameraX', label: 'Camera X', kind: 'number', step: 10 }, { key: 'zoom', label: 'Game camera zoom', kind: 'number', min: 0.1, max: 8, step: 0.1 }]).filter(control=>!['cameraX','cameraH','zoom'].includes(control.key)||!currentTimeline());
    const quick = controls.filter(control => control.quick);
    const states = composition && config.worldStates ? config.worldStates.list('', documentsForView()) : [];
    if (states.length) {
      const chosen = worldState()?.id??'';
      const pick = select([...states.map(state => ({ value: state.id, label: `Checkpoint · ${state.name}` })), { value: '', label: 'Checkpoint · none' }], chosen, value=>openCheckpoint(value));
      pick.title = 'The world this scene is shown in and Play starts from: time, weather and story flags. With a checkpoint chosen, time and weather edit it.';
      pick.setAttribute('aria-label', 'Starting state'); cluster('Starting state').append(pick);
    }
    if (canPlay()) { const origin=select([{value:'preview',label:'From preview'},{value:'checkpoint',label:'From checkpoint start'}],playStartMode,value=>{playStartMode=value as typeof playStartMode;refreshOptions();});origin.setAttribute('aria-label','Play starting point');origin.title='Preview uses the selected sequence/playhead (or base editing). Checkpoint start uses its authored sequence/time. Both use the checkpoint world state.';const play = button('▶ Play', playScene, 'Run the real game here from the chosen starting point, with the same logical camera viewport'); play.className = 'play-button'; cluster('Play').append(origin, play); }
    // With a checkpoint chosen, time and weather are part of it (saved, undoable); otherwise they only change the preview.
    if (composition && quick.length) {
      const stored = !!worldState(); previewBar.classList.toggle('stored', stored);
      previewBar.title = stored ? 'Time and weather here edit the chosen checkpoint (saved, undoable).' : 'These settings change only the preview; nothing is saved.';
      previewBar.append(element('span', 'preview-label', stored ? 'Checkpoint world' : 'Preview only')); for (const control of quick) previewBar.append(environmentControl(control, true));
    }
    // Named compositions always show their members. Standalone chunks may reveal connected neighbours.
    const joinedList = !workspaceId && composition && config.joinedScenes ? config.joinedScenes(sceneId(), documentsForView()) : [];
    if (joinedList.length) {
      const on = environment.showJoined !== false, names = joinedList.map(j => j.label).join(', ');
      const toggle = button('Neighbours', () => { environment.showJoined = !on; refreshOptions(); void draw(); }, `${on ? 'Hide' : 'Show'} ${names}, joined to this scene with no cut, beside it`);
      toggle.className = 'toggle'; toggle.setAttribute('aria-pressed', String(on));
      const frame = button('Fit visible chunks', fitJoined, `Zoom out to show this scene with ${names}`); frame.disabled = !on;
      showSlot.append(toggle, frame);
    }
    const comparable = composition&&!workspaceId&&!currentTimeline()?compareOptions():[];
    if (comparable.length) {
      const pick = select([{ value: '', label: 'Compare · off' }, ...comparable.map(o => ({ value: o.id, label: `Compare · ${o.label}` }))], compareId, value => { compareId = value; void draw(); });
      pick.title = 'Show another version beside this one, with the same camera, zoom, time and weather'; pick.setAttribute('aria-label', 'Compare'); showSlot.append(pick);
    }
    const motion = element('input'); motion.type = 'checkbox'; motion.checked = reduced; motion.onchange = () => { reduced = motion.checked; void draw(); }; showSlot.append(label('Reduced motion', motion));
    const pixels=element('input');pixels.type='checkbox';pixels.checked=pixelatedScaling;pixels.setAttribute('aria-label','Pixelated scaling');pixels.onchange=()=>{pixelatedScaling=pixels.checked;refreshViewportTools();rememberView();};const pixelSetting=label('Pixelated scaling',pixels);pixelSetting.title='Use crisp pixel edges when scaling the preview canvas. Off smooths canvas scaling; authored pixel shapes and the game remain unchanged.';showSlot.append(pixelSetting);
    for (const control of controls) if (!control.quick) showSlot.append(environmentControl(control, false));
    if(composition){const checkpoint=worldState()?.checkpoint,summary=contextLine,prefix='Checkpoint: '+(checkpoint?.name??'none')+(checkpoint?' (starts '+(checkpoint.sequence?checkpoint.sequence.id+' at '+checkpoint.sequence.time+' s':'without a sequence')+')':'')+' · Editing: ',editing=sequence()?sequenceId:undefined,suffix=' · View: '+(cameraPreview?'game camera':'independent workspace');updateContextSummary=()=>{refreshMode();summary.textContent=prefix+(editing?editing+' at '+time.toFixed(3)+' s':'base values')+suffix;};updateContextSummary();summary.title='Selecting a sequence changes the editing context, not the checkpoint definition. Locate camera navigates the workspace explicitly.';}
    options.append(bar); refreshMode();
  }
  function environmentControl(control: EnvironmentControl, inToolbar: boolean): HTMLElement {
    const change = (value: string | number | boolean) => {
      environment[control.key] = value;
      // With a starting state chosen, time and weather are part of it: the change is a saved, undoable edit.
      const state = worldState(), stored = state && config.worldStates!.edit(sceneId(), state.id, control.key, value, documentsForView());
      if (state && stored) { run(() => model.edit(stored.id, `${state.name}: ${control.label}`, () => stored.value)); return; }
      void draw(); if (inToolbar) refreshOptions();
    };
    if (control.choices && inToolbar) {
      const current = environment[control.key], known = control.choices.some(choice => choice.value === current);
      const options = [...(known ? [] : [{ value: String(current ?? ''), label: typeof current === 'number' ? `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}` : String(current ?? '') }]), ...control.choices.map(choice => ({ value: String(choice.value), label: choice.label }))];
      const input = select(options, String(current ?? ''), value => { const choice = control.choices!.find(item => String(item.value) === value); if (choice) change(choice.value); }); input.setAttribute('aria-label', control.label); return input;
    }
    if (control.choices) {
      const row = element('div', 'segmented'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', control.label);
      for (const choice of control.choices) { const pick = button(choice.label, () => change(choice.value), `${control.label}: ${choice.label}`); pick.setAttribute('aria-pressed', String(environment[control.key] === choice.value)); row.append(pick); }
      return inToolbar ? row : label(control.label, row);
    }
    if (control.kind === 'boolean' && inToolbar) { const toggle = button(control.label, () => change(!environment[control.key]), control.shortcut ? `${control.label} (${control.shortcut.toUpperCase()})` : undefined); toggle.className = 'toggle'; toggle.setAttribute('aria-pressed', String(!!environment[control.key])); return toggle; }
    if (control.kind === 'select') { const input = select((control.options ?? []).map(v => ({ value: v, label: inToolbar ? `${control.label} · ${v}` : v })), String(environment[control.key] ?? ''), change); input.setAttribute('aria-label', control.label); return inToolbar ? input : label(control.label, input); }
    const input = element('input'); input.type = control.kind === 'boolean' ? 'checkbox' : control.kind === 'text' ? 'text' : 'number'; input.checked = !!environment[control.key]; input.value = String(environment[control.key] ?? (control.kind === 'text' ? '' : 0));
    if (control.min !== undefined) input.min = String(control.min); if (control.max !== undefined) input.max = String(control.max); if (control.step !== undefined) input.step = String(control.step);
    input.onchange = () => { const value = control.kind === 'boolean' ? input.checked : control.kind === 'text' ? input.value : Number(input.value); if (typeof value === 'number' && !Number.isFinite(value)) return; change(value); };
    const row = label(control.label, input); if (control.kind === 'text') row.classList.add('wide'); return row;
  }
  /** The artwork browser, shared by Library › Artwork and the Scene view's Add asset picker (same filters, same session). */
  function mountArtwork(host: HTMLElement, scene: string, add: (entry: AssetEntry) => void, addPreset: (kit: AssetEntry, settings: Properties,children?:AssetInstance[]) => void) {
    return mountAssetBrowser(host, { registry: config.registry, documents: documentsForView(),
      openUsage(usage) { closePicker(); openInstance(usage.document, usage.instance); },
      preview: (canvas, entry, usage, zoom, overrides) => config.assetPreview!(canvas, entry, usage, documentsForView(), { time, reduced, environment: { ...environment, renderScale: zoom },...overrides }),
      fieldControl:fieldInput,
      ...(config.assetDistricts ? { districts: config.assetDistricts(documentsForView()) } : {}),
      ...(thumbnails ? { thumbnail: (entry: AssetEntry) => thumbnails.thumbnail(entry) } : {}),
      ...(scene ? { useInScene: { label: `Add to ${sceneName(scene)}`, run: add } } : {}),
      ...(presetsDoc() ? { presets: { of: (kit: AssetEntry) => presetsFor(presetsDoc(), kit.id).map(pr => ({ id: pr.id, label: pr.label, note: pr.note, family: presetFamily(pr, kit) })),
        add: (kit: AssetEntry, preset: AssetPreset) => { const pr = presetsFor(presetsDoc(), kit.id).find(x => x.id === preset.id); if (pr) addPreset(kit, pr.props,pr.children); } } } : {}),
    }, assetSession);
  }
  function refreshLibrary() { return perfMeasure('editor.library', refreshLibraryContent); }
  function refreshLibraryContent() {
    cleanupAssets?.(); cleanupAssets = undefined; assetPanel.replaceChildren(); thumbnails?.prune(); if (!config.assetPreview || !assetHost.open) return;
    const scene = current()?.kind === 'composition' ? sceneId() : '';
    cleanupAssets = mountArtwork(assetPanel, scene, entry => { showLayout(); void addAtView(entry.id); }, (kit, settings,children) => { showLayout(); void addAtView(kit.id, settings,children); });
  }
  function refreshMap() { cleanupWorld?.(); cleanupWorld = undefined; mapPanel.replaceChildren(); if (config.worldPanel && mapHost.open) cleanupWorld = config.worldPanel(mapPanel, openScene, documentsForView(), sceneId(),liveContext(sceneId())); cityDistrict=undefined; }
  const readFolds=(key:string)=>{try{return new Map<string,boolean>(JSON.parse(localStorage.getItem('access-denied.editor.'+key)??'[]'));}catch{return new Map<string,boolean>();}};
  const outlineSceneOwners=new Map<string,string>();const outlineSourceOpen=readFolds('source-folds');for(const [key,value]of readFolds('kind-folds'))roleOpen.set(key,value);
  const saveFolds=()=>{try{localStorage.setItem('access-denied.editor.source-folds',JSON.stringify([...outlineSourceOpen]));localStorage.setItem('access-denied.editor.kind-folds',JSON.stringify([...roleOpen]));}catch{/* optional editor preferences */}};
  let outlineVersion='',outlineSnapshot:object|undefined,outlineView='',updateOutlineSelection=()=>{};
  let leftTab: 'outline' | 'library' = 'outline';
  function leftDockHead() {
    const head = element('div', 'dock-head'); head.setAttribute('role', 'tablist'); head.setAttribute('aria-label', 'Left dock');
    for (const [id, text] of [['outline', 'Outline'], ['library', 'Library']] as const) { const tab = button(text, () => { if (leftTab === 'library' && id !== 'library') { cleanupDockLibrary?.(); cleanupDockLibrary = undefined; } leftTab = id; outlineVersion = ''; outlineSnapshot = undefined; outlineView = ''; left.replaceChildren(); refreshLeft(); }); tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(leftTab === id)); head.append(tab); }
    return head;
  }
  /** Library entries open as panels in the Layout workspace; ◂ Scene returns to the scene. */
  let cleanupDockLibrary: void | (() => void);
  function renderLibraryDock() {
    cleanupDockLibrary?.(); cleanupDockLibrary = undefined;
    const body = element('div', 'library-dock'), browser = element('div', 'library-browser'), list = element('ul', 'library-list');
    if (config.assetPreview && current()?.kind === 'composition') { body.append(element('div', 'library-hint', 'Drag a piece into the scene, or double-click to add it in view.'), browser); cleanupDockLibrary = mountArtwork(browser, sceneId(), entry => void addAtView(entry.id), (kit, settings, children) => void addAtView(kit.id, settings, children)); }
    for (const item of panels.filter(p => p.group === 'library')) { const row = element('li'), open = button(item.label, () => openPanel(item.details), item.title); row.append(open); list.append(row); }
    body.append(element('h3', '', 'Library screens'), list); return body;
  }
  // The library and world map rebuild only when what they show changed: the source version, the chunk or their open state.
  let libraryShown: readonly unknown[] = [], mapShown: readonly unknown[] = [];
  function refreshLeft() {
    workbenches.forEach(item=>refreshWorkbench(item,true));
    { const docs = documentsForView(), library = [docs, sceneId(), assetHost.open, current()?.kind], map = [docs, sceneId(), mapHost.open, cityDistrict];
      if (!sameDocuments(library, libraryShown)) { libraryShown = library; refreshLibrary(); }
      if (!sameDocuments(map, mapShown)) { mapShown = map; refreshMap(); } }
    if(root.dataset.tool!=='scene'){layoutDirty=true;return;}
    if(leftTab==='library'){if(left.querySelector('.library-dock')&&outlineView===currentId)return;outlineVersion='';outlineSnapshot=undefined;outlineView=currentId;left.replaceChildren(leftDockHead(),renderLibraryDock());return;}
    if(outlineSnapshot===model.sourceVersion&&outlineView===currentId){updateOutlineSelection();return;}
    outlineSnapshot=model.sourceVersion;outlineView=currentId;
    const docs=documentsForView(),sources=workspaceId?[...new Map([...(currentTimeline()?outlineDocuments(viewCompositionDocument(),docs):[]),...workspaceDocuments(workspaceId,docs),...workspaceDocuments(workspaceId,docs,worldState()?.checkpoint?.membership)].map(d=>[d.id,d])).values()]:outlineDocuments(viewCompositionDocument(),docs,config.joinedScenes?.(viewScene(),docs).map(r=>r.zone)??[]);outlineSceneOwners.clear();for(const source of sources)outlineSceneOwners.set((source.value as ChunkDocument).scene,source.id);
    const version=(workspaceId?JSON.stringify(docs.find(d=>d.id==='world-compositions')?.value):'')+JSON.stringify(sources,(key,value)=>key==='sequence'?!!value:key==='placement'?{...value,x:undefined,h:undefined,scale:undefined,facing:undefined}:value)+JSON.stringify(sources.flatMap(source=>(config.sceneDocuments?.((source.value as ChunkDocument).scene,docs)??[]).map(id=>docs.find(d=>d.id===id))));
    if(version===outlineVersion){updateOutlineSelection();return;}
    outlineVersion=version;left.replaceChildren();left.append(leftDockHead(),sceneContext,runtimeOutline);
    const updates:(()=>void)[]=[],filters:(()=>void)[]=[];
    if(workspaceId){renderWorldMembers(left,worldControls());updates.push(()=>{for(const row of left.querySelectorAll<HTMLElement>('[data-world-member]'))row.setAttribute('aria-pressed',String(row.dataset.worldMember===editorSelection.world?.member&&row.dataset.worldChild===editorSelection.world?.child));});}
    if(!sources.length)left.append(element('p','muted','Open a scene to inspect its assets.'));
    if(navigable()){
      const camera=button('Camera',()=>selectTimeline({kind:'camera'}),'Inspect the authored game camera');camera.setAttribute('aria-label','Camera in outline');
      left.append(camera);updates.push(()=>camera.setAttribute('aria-pressed',String(cameraSelected())));
      
      const tools=element('div','layer-tools'),search=element('input'),sort=element('div','segmented');sort.setAttribute('role','group');sort.setAttribute('aria-label','Arrange the outline');search.type='search';search.placeholder='Filter all sources';search.value=layerQuery;search.setAttribute('aria-label','Filter the outline');search.oninput=()=>{layerQuery=search.value;filters.forEach(render=>render());};
      for(const mode of ['kind','order']as const){const pick=button(mode==='kind'?'Kind':'Order',()=>{layerSort=mode;for(const child of sort.children)child.setAttribute('aria-pressed',String((child as HTMLElement).dataset.mode===mode));filters.forEach(render=>render());});pick.dataset.mode=mode;pick.setAttribute('aria-pressed',String(layerSort===mode));sort.append(pick);}tools.append(search,sort);left.append(tools);
    }
    for(const source of sources){
      const group=element('details','outline-source'),composition=source.value as ChunkDocument;
      group.dataset.document=source.id;group.open=outlineSourceOpen.get(source.id)??false;
      const summary=element('summary','',source.id===viewCompositionDocument()?.id?(currentTimeline()&&sources.length>1?'Sequence controls':sceneName(composition.scene)):source.id.startsWith('backdrop-')?'Shared backdrop · '+source.id.slice(9):sceneName(composition.scene));summary.title=source.id;
      
      if(workspaceId){summary.title=source.id+' · double-click to frame this chunk';summary.ondblclick=event=>{event.preventDefault();event.stopPropagation();const region=painting.result?.regions?.find(r=>r.document===source.id);if(region){stopFollowing();sequenceNav.x+=(region.x+region.width/2-canvas.width/2)/(painting.result?.workspaceScale??1);editorSelection.world=undefined;editorSelection.document=source.id;editorSelection.instance='';editorSelection.chunk=composition.scene;refreshRight();refreshViewportTools();void draw();}};}
      const container=element('div');group.append(summary,container);left.append(group);
      group.ontoggle=()=>{if(!layerQuery.trim()){outlineSourceOpen.set(source.id,group.open);saveFolds();}};
      const handle=renderOutlineDocument(source,container);filters.push(()=>{handle.filter();if(layerQuery.trim())group.open=true;else group.open=outlineSourceOpen.get(source.id)??false;});
      updates.push(()=>{if(compositionDocument()?.id===source.id&&editorSelection.instance){group.open=true;outlineSourceOpen.set(source.id,true);}handle.selection();});
    }
    updateOutlineSelection=()=>updates.forEach(update=>update());updateOutlineSelection();
  }
  function renderOutlineDocument(doc:EditorDocument,container:HTMLElement):{selection:()=>void;filter:()=>void}{

      const composition = doc.value as ChunkDocument, rows = flatten(composition), parents = new Map<string, string>();
      const visit = (nodes: AssetInstance[], parent?: string) => nodes.forEach(node => { if (parent) parents.set(node.id, parent); visit(node.children ?? [], node.id); }); visit(composition.instances);
      const within = (id: string, ancestor: string) => { for (let at = parents.get(id); at; at = parents.get(at)) if (at === ancestor) return true; return false; };
      const art = (node: AssetInstance) => config.registry.get(node.type);
      // Actor looks from the scene's own documents decide Human / Animal / Robot for characters.
      const docs = documentsForView(), looks = new Map<string, unknown>();
      for (const id of config.sceneDocuments?.(composition.scene, docs) ?? []) { const actors = (docs.find(d => d.id === id)?.value as { actors?: { id: string; instance?: string; look?: unknown }[] } | undefined)?.actors; for (const a of Array.isArray(actors) ? actors : []) looks.set(a.instance ?? a.id, a.look); }
      const kind = (node: AssetInstance) => layerRole(node.type, art(node).label, art(node).category, looks.get(node.id));
      const matches = (node: AssetInstance) => { const query = layerQuery.trim().toLowerCase(); return compositionDocument()?.id===doc.id&&node.id===editorSelection.instance||!query || `${node.id} ${node.type} ${art(node).label}`.toLowerCase().includes(query); };
      const listHost=element('div');container.append(listHost);
      const hidden = hiddenIn(doc.id), allIds = rows.map(r => r.node.id);
      /** Click hides or shows; Alt-click shows only these (Alt-click again shows everything). */
      const eye = (ids: () => string[], label: string) => {
        const node = element('button', 'eye'), set = ids(), off = set.length > 0 && set.every(id => hidden.has(id));
        node.type = 'button'; node.title = `${off ? 'Show' : 'Hide'} ${label} in the preview (Alt-click: show only this)`; node.dataset.off = String(off); node.setAttribute('aria-label', node.title);
        node.innerHTML = off ? '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" opacity=".5"/><path d="M2 14 14 2" stroke="currentColor"/></svg>' : '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" fill="none" stroke="currentColor"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>';
        node.onclick = event => {
          event.preventDefault(); event.stopPropagation(); const chosen = ids();
          if (event.altKey) { const others = allIds.filter(id => !chosen.includes(id)), soloed = others.length > 0 && others.every(id => hidden.has(id)) && chosen.every(id => !hidden.has(id)); hidden.clear(); if (!soloed) others.forEach(id => hidden.add(id)); }
          else if (chosen.every(id => hidden.has(id))) chosen.forEach(id => hidden.delete(id)); else chosen.forEach(id => hidden.add(id));
          renderLayers(); void draw();
        };
        return node;
      };
      // Hovering a row outlines the artwork in the preview, the same box the preview shows on hover.
      const item = (node: AssetInstance, depth: number) => {
        const key=JSON.stringify([doc.id,node.id]),active=()=>compositionDocument()?.id===doc.id&&node.id===editorSelection.instance;
        const li = element('li'), pick = button('', () => { if(active())select_('');else{editorSelection.world=undefined;editorSelection.chunk=undefined;editorSelection.timeline=undefined;editorSelection.document=doc.id;editorSelection.instance=node.id;timelineView.collapsed.delete(node.id);refreshRight();updateOutlineSelection();refreshTimeline();void draw();} }, `${art(node).label} · ${node.type} · ${LAYER_LABELS[node.layer]}${parents.has(node.id) ? ` · in ${parents.get(node.id)}` : ''}`);
        const selectRow=pick.onclick!;pick.onclick=event=>{if(event.detail<2)selectRow.call(pick,event);};
        pick.ondblclick=event=>{event.preventDefault();if(!active())selectRow.call(pick,event);void focusArtwork(doc.id,node.id);};pick.title+=' · Double-click to frame asset';
        pick.onmouseenter = pick.onfocus = () => { viewport.hoverId=painting.result?.sources?.[key]?key:doc.id===currentId?node.id:key;placeHover(); }; pick.onmouseleave = pick.onblur = () => { if (viewport.hoverId === key||viewport.hoverId===node.id) { viewport.hoverId = ''; placeHover(); } };
        const parallax = node.placement.parallax ?? 1;
        if (node.type === 'level.barrier') { const mark = element('span', 'layer-badge'); mark.innerHTML = BARRIER_ICON; mark.title = 'Barrier: select it to edit who may pass (Access)'; pick.append(mark); }
        pick.append(element('span', 'layer-name', node.id), element('span', 'layer-kind', (parallax !== 1 && layerSort === 'order' ? `×${parallax} · ` : '') + kind(node))); pick.style.paddingLeft = `${10 + depth * 14}px`; pick.dataset.instance=node.id;pick.dataset.document=doc.id;pick.setAttribute('aria-pressed',String(active()));
        if (hidden.has(node.id)) li.classList.add('is-hidden');
        li.append(pick, eye(() => [node.id], node.id)); return li;
      };
      /** A new selection (often picked in the preview) unfolds the section that holds it, so the row can be scrolled to. */
      const reveal = () => {
        if(compositionDocument()?.id!==doc.id||!editorSelection.instance||JSON.stringify([doc.id,editorSelection.instance])===revealed)return false; const node = rows.find(row => row.node.id === editorSelection.instance)?.node; if (!node) return false; revealed=JSON.stringify([doc.id,editorSelection.instance]);
        let top = node; for (let at = parents.get(node.id); at; at = parents.get(at)) top = rows.find(row => row.node.id === at)?.node ?? top;
        const layer = node.layer ?? top.layer;
        if (layerSort === 'kind') roleOpen.set(kind(top), true); else if (layer === 'logic') roleOpen.set('logic-layer', true); else if (layer) roleOpen.set('stack:' + layer, true);
        return true;
      };
      function renderLayers() {
        const scroll=left.scrollTop;reveal(); listHost.replaceChildren(); let shown = 0;
        if (hidden.size) { const reveal = button(`Show all (${hidden.size})`, () => { hidden.clear(); renderLayers(); void draw(); }, 'Show everything hidden with the eyes'); reveal.className = 'show-all'; listHost.append(reveal); }
        if (layerSort === 'order') shown = renderStack();
        else for (const role of LAYER_ROLES) {
          const list = element('ul', 'hierarchy'); let count = 0;
          for (const top of rows.filter(row => !parents.has(row.node.id) && kind(row.node) === role)) {
            const nested = rows.filter(row => within(row.node.id, top.node.id)); if (!matches(top.node) && !nested.some(row => matches(row.node))) continue;
            list.append(item(top.node, 0)); count++; for (const row of nested) if (matches(row.node) || matches(top.node)) list.append(item(row.node, row.depth - top.depth));
          }
          if (!count) continue; shown += count;
          const group = element('details', 'layer-group'); group.open = layerQuery.trim() ? true : roleOpen.get(role) ?? false; group.ontoggle = () => { if (!layerQuery.trim()) roleOpen.set(role,group.open);saveFolds(); };
          const summary = element('summary', '', `${role} · ${count}`); summary.title = KIND_HINTS[role]; group.append(summary, list); listHost.append(group);
        }
        if (!shown) listHost.append(element('p', 'muted', layerQuery.trim() ? 'Nothing matches this filter.' : 'This scene has no assets yet. Use ＋ Add asset in the toolbar.'));
        left.scrollTop=scroll;
        // Selection never scrolls the outline; the user owns its scroll position.
      }
      /** Front at the top, like a paint program's layer list. */
      function renderStack() {
        let shown = 0, dragged = '';
        const stack = element('div', 'layer-stack');
        const drop = (target: HTMLElement, place: (event: DragEvent) => { layer: Layer; index: number } | undefined) => {
          target.ondragover = event => { if (!dragged || !place(event)) return; event.preventDefault(); target.classList.add('drop-target'); };
          target.ondragleave = () => target.classList.remove('drop-target');
          target.ondrop = event => { event.preventDefault(); target.classList.remove('drop-target'); const at = place(event); if (!at || !dragged) return; const id = dragged; dragged = ''; run(() => model.restack(doc!.id, id, at.layer, at.index)); };
        };
        const draggedNode = () => rows.find(r => r.node.id === dragged)?.node;
        const accepts = (layer: Layer) => { const node = draggedNode(); if (!node) return false; const e = art(node); return isPlayerRow(node) ? layer === 'playfield' : e.role === 'group' ? layer !== 'logic' : (e.parts.length === 0) === (layer === 'logic'); };
        const row = (node: AssetInstance) => {
          const li = item(node, 0);
          if (isPlayerRow(node)) li.classList.add('player-row');
          li.draggable = true; li.ondragstart = event => { dragged = node.id; event.dataTransfer?.setData('text/plain', node.id); li.classList.add('dragging'); };
          li.ondragend = () => { dragged = ''; li.classList.remove('dragging'); };
          drop(li, event => { const layer = node.layer!; if (!accepts(layer) || dragged === node.id) return; const others = layerRows(composition, layer).filter(n => n.id !== dragged), box = li.getBoundingClientRect(), front = event.clientY < box.top + box.height / 2; return { layer, index: others.indexOf(node) + (front ? 1 : 0) }; });
          return li;
        };
        const section = (layer: Layer, body: (list: HTMLElement) => number) => {
          const box = element('section', 'stack-layer'), head = element('div', 'stack-head'), list = element('ul', 'hierarchy'), key = 'stack:' + layer, open = !!layerQuery.trim() || (roleOpen.get(key) ?? false);
          const toggleLayer=()=>{roleOpen.set(key,!open);saveFolds();renderLayers();};
          const fold = button(open ? '▾' : '▸', toggleLayer, `${open ? 'Collapse' : 'Expand'} the ${LAYER_LABELS[layer]} layer`); fold.className = 'fold'; fold.setAttribute('aria-expanded', String(open)); list.hidden = !open;
          const count = body(list); shown += count;
          const ids = () => layerRows(composition, layer).map(n => n.id);
          const name=button(LAYER_LABELS[layer],toggleLayer,`${open?'Collapse':'Expand'} the ${LAYER_LABELS[layer]} layer`);name.className='stack-name';name.setAttribute('aria-expanded',String(open));
          head.append(fold, name, element('span', 'muted', String(ids().length)), ...(ids().length ? [eye(ids, `the ${LAYER_LABELS[layer]} layer`)] : [element('span', 'eye-space')])); head.title = LAYER_HINTS[layer];
          drop(head, () => accepts(layer) ? { layer, index: layerRows(composition, layer).filter(n => n.id !== dragged).length } : undefined);
          box.append(head, list); stack.append(box);
        };
        const list = (target: HTMLElement, nodes: AssetInstance[]) => { let n = 0; for (const node of [...nodes].reverse()) if (matches(node)) { target.append(row(node)); n++; } return n; };
        for (const layer of [...VISUAL_LAYERS].reverse()) {
          section(layer, target => list(target, layerRows(composition, layer)));
        }
        const logic = element('details', 'layer-group logic-group'); logic.open = roleOpen.get('logic-layer') ?? false; logic.ontoggle=()=>{roleOpen.set('logic-layer',logic.open);saveFolds();};
        const logicList = element('ul', 'hierarchy'); shown += list(logicList, layerRows(composition, 'logic'));
        const logicIds = () => layerRows(composition, 'logic').map(n => n.id), summary = element('summary', '', `${LAYER_LABELS.logic} · ${logicIds().length}`);
        if (logicIds().length) summary.append(eye(logicIds, 'the Logic layer'));
        logic.append(summary, logicList); logic.title = LAYER_HINTS.logic;
        listHost.append(stack, logic); return shown;
      }
      const updateSelection = () => {
        const fresh = reveal(); let selectedRow: HTMLElement | undefined;
        container.querySelectorAll<HTMLElement>('[data-instance]').forEach(row => { const active=row.dataset.document===compositionDocument()?.id&&row.dataset.instance===editorSelection.instance; row.setAttribute('aria-pressed', String(active)); if (active) selectedRow = row; });
        if(fresh&&!selectedRow){renderLayers();return;}
        if (fresh && selectedRow && (selectedRow.closest('details:not([open])') || selectedRow.closest('[hidden]'))) { renderLayers(); return; }

      };
      renderLayers();

      return{selection:updateSelection,filter:renderLayers};
  }
  const disposeInspector=inspector.dispose;
  /** Sections read the live documents, so a section's own refresh always sees the latest edit. */
  const liveContext = (scene: string): WorkbenchContext => ({ get documents() { return documentsForView(); }, scene,get checkpoint(){return activeCheckpointId||worldState()?.id;},openCheckpoint,editCheckpoint,openScene, openInstance,openConversation,openRenderingSource,cityDistrict,inspect:openInspector, authoring: authoringApi() });
  let propertyUpdates:(()=>void)[]=[],chunkInspectorHandle:WorkbenchHandle|undefined;
  const inspectorContext=()=>JSON.stringify([currentId,workspaceId,editorSelection]);
  function openInspector(request:InspectorTask){
    showLayout();if(request.id&&inspectorDraft?.request.id===request.id&&inspectorDraft.selection===inspectorContext()&&inspectorDraft.version===model.sourceVersion){refreshRight();return;}inspectorError='';const draft={request,host:element('section'),selection:inspectorContext(),version:model.sourceVersion};
    draft.host=inspectorTask(request,()=>{if(inspectorDraft===draft)inspectorDraft=undefined;inspectorError='';refreshRight();placeJoined();});
    inspectorDraft=draft;refreshRight();right.scrollTop=0;placeJoined();
  }
  function renderInspectorMessages(){
    if(placementIssue){const {address,reason}=placementIssue,source=workspaceSource(documentsForView());
      if(address.composition!==workspaceId){placementIssue=undefined;return;}
      let location;try{location=worldMemberAt(source,address);}catch{placementIssue=undefined;return;}
      const {definition,member}=location,connections=definition.connections.filter(c=>c.a.member===member.id||c.b.member===member.id),warning=element('section','inspector-warning');warning.setAttribute('role','alert');
      warning.append(element('h3','','Move blocked · '+member.id),element('p','',connections.length?'This member is connected to '+linkedWorldMembers(definition,member.id).filter(id=>id!==member.id).join(', ')+'. Moving it alone would separate the connected endpoints. Your placement was not changed.':'This placement conflicts with a world constraint. Your placement was not changed.'),element('p','','Hold Shift while dragging to move connected members together, or edit a connection before rearranging them.'));
      if(address.child)warning.append(button('Select containing group',()=>selectWorldMember({composition:address.composition,member:address.member})));
      for(const connection of connections)warning.append(button('Select connection · '+connection.id,()=>editMemberConnection(worldControls(),address,connection)));
      const details=element('details');details.append(element('summary','','Technical details'),element('p','',reason));warning.append(details,button('Dismiss warning',()=>{placementIssue=undefined;refreshRight();}));right.append(warning);
    }else if(inspectorError){const warning=element('section','inspector-warning');warning.setAttribute('role','alert');warning.append(element('h3','','Edit blocked'),element('p','',inspectorError),button('Dismiss message',()=>{inspectorError='';refreshRight();}));right.append(warning);}
  }
  let showInternalAttach = false;
  function refreshRight() {
    updateCrumb();
    if(numericScrubbing)return;
    if(root.dataset.tool!=='scene'){layoutDirty=true;propertyUpdates=[];chunkInspectorHandle?.();chunkInspectorHandle=undefined;disposeInspector();right.replaceChildren();return;}
    propertyUpdates=[];chunkInspectorHandle?.();chunkInspectorHandle=undefined;
    const node = selected(), scene = sceneId(), doc = compositionDocument(); right.replaceChildren();
    if(!playHost.hidden&&!editorSelection.chunk){disposeInspector();right.append(playSettings);return;}
    renderInspectorMessages();
    if(inspectorDraft&&(inspectorDraft.selection!==inspectorContext()||inspectorDraft.version!==model.sourceVersion))inspectorDraft=undefined;
    if(inspectorDraft){disposeInspector();right.append(inspectorDraft.host);return;}
    if(editorSelection.world){const address=editorSelection.world,source=workspaceSource(documentsForView()),row=source.compositions[address.composition]?.members.find(m=>m.id===address.member);if(!row||address.child&&(!row.group||!source.groups[row.group].members.some(m=>m.id===address.child)))editorSelection.world=undefined;}
    if(editorSelection.world){disposeInspector();renderWorldMemberInspector(right,worldControls(),editorSelection.world);const source=worldMemberAt(workspaceSource(documentsForView()),editorSelection.world).member.chunk;if(source){const sections=config.inspector?.(source,undefined,documentsForView()).filter(s=>s.id==='chunk-connections'||s.id==='scene')??[],handles:WorkbenchHandle[]=[];for(const section of sections){const host=element('section');right.append(host);handles.push(section.mount(host,liveContext(source)));}chunkInspectorHandle=()=>{for(const handle of handles)handle();};}return;}
    if(editorSelection.chunk){
      const id=editorSelection.chunk,row=liveChunkRows?.find(r=>r.id===id)??(!liveChunkRows?preparedChunkStatus(id,sceneName(id)):undefined);
      disposeInspector();if(row)renderChunkStatus(right,row,()=>{editorSelection.chunk=undefined;refreshRight();},playHost.hidden?()=>{editorSelection.chunk=undefined;openScene(id);}:undefined);else right.append(element('p','muted','Waiting for this chunk in the next runtime snapshot.'));return;
    }
    if(editorSelection.timeline?.kind==='camera'&&!sequence()){
      disposeInspector();right.append(element('h2','','Game camera'),element('p','muted','Base preview camera. This is distinct from editor pan/zoom. Normal gameplay follows the player; a selected sequence can direct this same frame. These preview settings do not author a new camera entity.'));
      for(const [key,name]of [['cameraX','Camera X'],['cameraH','Camera Y']]as const){const input=numberInput(Number(environment[key]??0),value=>{environment[key]=value;void draw();});input.setAttribute('aria-label',name);right.append(label(name,input));}
      const zoom=numberInput(Number(environment.zoom??1),value=>{environment.zoom=value;void draw();},.1);zoom.max='8';zoom.setAttribute('aria-label','Game camera zoom');right.append(label('Game camera zoom',zoom));
      right.append(element('p','muted','Logical frame: '+baseWidth+' × '+baseHeight),button('Locate camera',locateCamera),button(cameraPreview?'Return to Workspace':'Look through camera',()=>{cameraPreview=!cameraPreview;refreshOptions();refreshViewportTools();refreshRight();void draw();}));return;
    }
    if(editorSelection.timeline&&renderTimelineInspector(right,{selection:editorSelection.timeline,sequence:sequence(),commandTargets:commandTargets(),time,playing,fieldInput,numberInput,keyField,keyValue,editTimeline,addKey,animatedControl,selectTimeline,seekTime,notice,setSelection:value=>{editorSelection.timeline=value;},close:()=>{editorSelection.timeline=undefined;refreshRight();refreshTimeline();},getFrame:()=>evaluateTimeline(currentTimeline()!,sequenceId,time,evaluationContext(),{reduced})})){disposeInspector();return;}
    inspector.render(right,{node,scene,doc,sceneName:sceneName(scene),sharedSource:!!editorSelection.document&&editorSelection.document!==currentId,registry:config.registry,
      duplicate:()=>run(()=>{editorSelection.instance=model.duplicate(doc!.id,editorSelection.instance);}),remove:deleteSelected,deselect:()=>select_(''),openSource:()=>openDocument(editorSelection.document),refresh:refreshRight,
      resolved:()=>{const data=resolvedArtwork(doc!.id,node?.id??'');return data&&node?{...data,authored:node.placement}:undefined;},
      visibility:{missingReason:()=>hiddenIn(doc!.id).has(node?.id??'')?'Hidden with the outline eye. Use its eye button to show it again.':undefined,showBoundary:()=>showDrawingBoundary()},
      sections:()=>scene&&config.inspector?config.inspector(scene,node,documentsForView()):[],context:()=>liveContext(scene),appearance:renderAppearance});
  }

  /** Save this kit piece's settings as a named preset, or update, rename and delete this kit's presets. */
  function renderPresets(host: HTMLElement, node: AssetInstance) {
    const doc = presetsDoc()!, mine = presetsFor(doc, node.type), settings = presetProps(config.registry, node.type, config.registry.properties(node.type, node.props));
    const editPresets = (labelText: string, change: (d: KitPresets) => void) => run(() => model.edit(PRESETS_DOCUMENT, labelText, value => { const next = copy(value) as KitPresets; change(next); return next; }));
    const children=node.type==='assembly.group'?node.children:undefined;
    const same = mine.find(p => JSON.stringify(presetProps(config.registry, node.type, config.registry.properties(node.type, p.props))) === JSON.stringify(settings)&&JSON.stringify(p.children)===JSON.stringify(children));
    host.append(element('p', 'muted', same ? `These settings are the preset “${same.label}”.` : 'A preset saves these settings under a name; Add asset lists it under this kit.'));
    const name = element('input'); name.type = 'text'; name.placeholder = 'Preset name'; name.setAttribute('aria-label', 'Preset name');
    host.append(label('Name', name), button('Save as new preset', () => { const text = name.value.trim(); if (!text) { notice('Give the preset a name first.', true); return; } editPresets('Save preset', d => { d.presets.push({ id: presetId(d, text), label: text, kit: node.type, props: settings,...(children?{children:copy(children)}:{}) }); }); }));
    if (!mine.length) return;
    let chosen = same?.id ?? mine[0].id;
    const pick = select(mine.map(p => ({ value: p.id, label: p.label })), chosen, v => { chosen = v; }); host.append(label('Existing preset', pick));
    const row = element('div', 'row');
    row.append(
      button('Update with these settings', () => editPresets('Update preset', d => { const p=d.presets.find(p => p.id === chosen)!;p.props = settings;if(children)p.children=copy(children);else delete p.children; }), 'Replace the chosen preset’s settings with this piece’s'),
      button('Rename', () => { const text = name.value.trim(); if (!text) { notice('Type the new name in Name first.', true); return; } editPresets('Rename preset', d => { d.presets.find(p => p.id === chosen)!.label = text; }); }, 'Give the chosen preset the name typed above'),
      button('Delete', () => editPresets('Delete preset', d => { d.presets = d.presets.filter(p => p.id !== chosen); }), 'Delete the chosen preset (pieces placed from it stay as they are)'),
    );
    host.append(row);
  }
  const inspectorFolds=readFolds('inspector-folds');
  let displayedPropertyLinks='';
  function propertyLinkSignature(node:AssetInstance){const fields=config.registry.get(node.type).fields,values=resolvedArtwork(compositionDocument()?.id??currentId,node.id)?.properties;return JSON.stringify(Object.entries(fields).filter(([,f])=>f.stateOverride).map(([key])=>[key,!!values?.[key]?.readOnly,values?.[key]?.source??null]));}
  function guardLinkedProperties(document:string,node:AssetInstance,before:Properties,bindings:AssetInstance['bindings']){
    const values=resolvedArtwork(document,node.id)?.properties;
    for(const[key,field]of Object.entries(config.registry.get(node.type).fields))if(field.stateOverride&&values?.[key]?.readOnly&&(before[key]??field.default)!==(node.props[key]??field.default)&&node.bindings?.[field.stateOverride.state]===bindings?.[field.stateOverride.state])throw Error(field.label+' is linked. Edit its shared source parameter instead.');
  }
  function syncLinkedProperties(){const node=selected();if(!node||!Object.values(config.registry.get(node.type).fields).some(f=>f.stateOverride))return;
    if(propertyLinkSignature(node)!==displayedPropertyLinks){refreshRight();return;}
    const values=resolvedArtwork(compositionDocument()?.id??currentId,node.id)?.properties;
    for(const output of right.querySelectorAll<HTMLOutputElement>('output[data-linked-property]')){const key=output.dataset.linkedProperty!,unit=fieldUnit(config.registry.get(node.type).fields[key]),value=values?.[key]?.value;if(value===undefined)continue;const text=String(value)+(unit?' '+unit:'');if(output.textContent!==text)output.textContent=text;}
  }
  function renderAppearance(host: HTMLElement, node: AssetInstance) {
    displayedPropertyLinks=propertyLinkSignature(node);
    const art = config.registry.get(node.type), part = (title: string, open: boolean) => { const box = element('details', 'inspector-part'), inner = element('div'),key=node.type+':'+title; box.open = inspectorFolds.get(key)??open; box.append(element('summary', '', title), inner); box.addEventListener('toggle',()=>{if(!box.isConnected)return;inspectorFolds.set(key,box.open);try{localStorage.setItem('access-denied.editor.inspector-folds',JSON.stringify([...inspectorFolds]));}catch{/* Optional workspace preference. */}});host.append(box); return inner; };
    const canAnimate=!!sequence();
    const qualify=(target:Target):Target=>target.kind==='camera'||compositionDocument()?.id===viewCompositionDocument()?.id?target:{...target,scene:(compositionDocument()!.value as ChunkDocument).scene};
    host.append(element('p','muted',canAnimate?'Use the diamond to add or remove a key at the playhead. Colored diamonds indicate animation. Arrows jump between keys.':'Y is height above the floor; positive values move upward.'));
    const propertyRow=(parent:HTMLElement,name:string,target:Target,field:Field,base:Value,apply:(v:Value)=>void)=>{
      target=qualify(target);const track=canAnimate?keyframeState(sequence()!,target,time).track:undefined;
      const value=canAnimate?keyValue(inspectorFrame(),target).value:base;
      const control=fieldInput(field,value,v=>track?addKey(target,v):apply(v));control.setAttribute('aria-label',name);
      if(target.kind==='property')control.dataset.assetProperty=target.property;
      if(canAnimate)parent.append(label(name,animatedControl(control,target,name)));else{const row=element('div','animated-property'),icon=button('◇',()=>{},'Animatable property: open a sequence to add keyframes');icon.className='property-key';icon.disabled=true;icon.setAttribute('aria-label',name+' supports animation in a sequence');row.append(control,icon);parent.append(label(name,row));}
    };
    const position = part('Position', true);
    for(const [key,name,value,min] of [['x','X',node.placement.x,undefined],['h','Y',node.placement.h,undefined],['scale','Scale',node.placement.scale??1,.0001],['parallax','Parallax',node.placement.parallax??1,0]] as const){
      propertyRow(position,name,{kind:'instance',instance:node.id,property:key},{kind:'number',label:name,default:value,...(min!==undefined?{min}:{})},value,v=>editInstance('Change '+key,n=>n.placement[key]=v as number,'artwork'));
    }
    propertyRow(position,'Facing',{kind:'instance',instance:node.id,property:'facing'},{kind:'select',label:'Facing',default:1,options:[-1,1]},node.placement.facing??1,v=>editInstance('Change facing',n=>n.placement.facing=v as 1|-1,'artwork'));
    if(canAnimate)for(const property of ['visible','opacity'] as const)propertyRow(position,property==='visible'?'Visible':'Opacity',{kind:'instance',instance:node.id,property},keyField({kind:'instance',instance:node.id,property}),property==='visible'?true:1,value=>addKey({kind:'instance',instance:node.id,property},value));
    const composed = compositionDocument()!;
    const drawn = art.parts.length > 0 || art.role === 'group', choices: Layer[] = art.framePhase==='sky'?['distance']:isPlayerRow(node) ? ['playfield'] : drawn ? [...VISUAL_LAYERS] : ['logic'];
    const pick = select(choices.map(v => ({ value: v, label: LAYER_LABELS[v] })), node.layer, v => run(() => model.restack(composed.id, node.id, v as Layer, layerRows(composed.value as ChunkDocument, v as Layer).length)));
    if (choices.length < 2) (pick as HTMLSelectElement).disabled = true; pick.title = LAYER_HINTS[node.layer];
    position.append(label('Layer', pick));
    if(drawn)clippingControls(part('Visibility at chunk boundaries',false),node,editInstance,numberInput);
    if(art.spatial?.reason)host.append(element('p','muted',art.spatial.reason));
    if(node.type==='character.flow')peopleControls(part('People · spawn, route and sink',true),node,documentsForView().filter(d=>d.kind==='composition'&&!(d.value as ChunkDocument).sequence).map(d=>(d.value as ChunkDocument).scene),editInstance,numberInput);
    const siblings = layerRows(composed.value as ChunkDocument, node.layer), at = siblings.findIndex(n => n.id === node.id), stepper = element('div', 'row');
    const forward = button('Bring forward', () => run(() => model.restack(composed.id, node.id, node.layer, at + 1)), 'Draw in front of the next item in this layer'), backward = button('Send backward', () => run(() => model.restack(composed.id, node.id, node.layer!, at - 1)), 'Draw behind the previous item in this layer');
    forward.disabled = at >= siblings.length - 1; backward.disabled = at <= 0; stepper.append(backward, forward); position.append(stepper);
    if(node.type==='sequence.world-control')renderWorldDirectionAuthoring(part('World direction',true),node,documentsForView(),editInstance,e=>notice(String(e),true));
    const fields = Object.entries(art.fields).filter(([key])=>node.type!=='sequence.world-control'||!['origin','zones','worldComposition'].includes(key));
    if (fields.length) {
      const shown=config.registry.properties(node.type,node.props);
      for(const group of PROPERTY_GROUPS){
        const entries=fields.filter(([,field])=>field.semantics?.group===group);
        if(!entries.length)continue;const section=part(group,true);
        for(const[key,field]of entries){
          if(node.type==='character.flow'&&(key==='flow'||key==='exit')||field.showIf&&!field.showIf(shown))continue;
          const value=node.props[key]??field.default,name=field.label+(fieldUnit(field)?` (${fieldUnit(field)})`:'');
          const linked=resolvedArtwork(compositionDocument()?.id??currentId,node.id)?.properties[key];
          if(linked?.readOnly){const row=element('div','linked-property'),output=element('output','',String(linked.value)+(fieldUnit(field)?' '+fieldUnit(field):''));output.dataset.linkedProperty=key;output.setAttribute('aria-label',field.label+' · linked value');row.append(label(field.label,output));
            const source=linked.source,owner=source&&documentsForView().find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===source.scene);
            if(source&&owner)row.append(button('Edit shared '+field.label,()=>{if(owner.id!==compositionDocument()?.id){openInstance(owner.id,source.instance);return;}editorSelection.document=owner.id;editorSelection.instance=source.instance;editorSelection.timeline=undefined;refreshRight();updateOutlineSelection();void draw();},'Select '+source.instance+' · '+source.property));
            else row.append(element('p','muted','Controlled by '+(linked.binding??field.stateOverride?.state??'prepared input')+'.'));
            section.append(row);continue;
          }
          if(field.animatable)propertyRow(section,name,{kind:'property',instance:node.id,property:key},field,value,v=>editInstance(`Change ${field.label}`,n=>n.props[key]=v,art.spatial?.fields.includes(key)?'artwork':'all'));
          else{const control=fieldInput(field,value,v=>editInstance(`Change ${field.label}`,n=>n.props[key]=v,art.spatial?.fields.includes(key)?'artwork':'all'));control.dataset.assetProperty=key;section.append(label(name,control));}
          // A value set away from its default is marked, with a reset back to the default.
          if(node.props[key]!==undefined&&JSON.stringify(node.props[key])!==JSON.stringify(field.default)&&section.lastElementChild){const row=section.lastElementChild,reset=button('↺',()=>editInstance(`Reset ${field.label}`,n=>n.props[key]=copy(field.default),art.spatial?.fields.includes(key)?'artwork':'all'),`Reset ${field.label} to its default`);reset.className='reset-field';reset.setAttribute('aria-label',`Reset ${field.label}`);row.classList.add('changed');row.append(reset);}
        }
      }
      if(art.derived){const section=part('Derived geometry',true);for(const value of Object.values(art.derived(shown))){const output=element('output','',String(value.value)+(value.unit?' '+value.unit:''));section.append(label(value.label,output));}}
    }
    if(canAnimate){const fields=Object.entries(art.visualFields??{}).filter(([,field])=>field.animatable);if(fields.length){const state=part('Animated state',true);for(const [property,field] of fields){const target:Target=qualify({kind:'state',instance:node.id,property});state.append(label(field.label,animatedControl(fieldInput(field,keyValue(inspectorFrame(),target).value,value=>addKey(target,value)),target,field.label)));}}}
    if (art.libraryUse === 'reusable' && presetsDoc()) renderPresets(part('Preset', false), node);
    const composition = compositionDocument()!.value as ChunkDocument, anchorDetails = part('Attachment and anchors', !!node.attach);
    const all = flatten(composition).filter(x => x.node.id !== node.id), candidates = all.map(x => x.node);
    // Generated parts of assemblies (windows, bays, trims) stay out of the list unless asked for or already chosen.
    const listed = all.filter(x => x.depth === 0 || showInternalAttach || x.node.id === node.attach?.instance).map(x => x.node), internal = all.length - all.filter(x => x.depth === 0).length;
    if (internal) { const box = element('input'); box.type = 'checkbox'; box.checked = showInternalAttach; box.onchange = () => { showInternalAttach = box.checked; refreshRight(); }; anchorDetails.append(label(`Show ${internal} internal parts`, box)); }
    const attachTo = select([{ value: '', label: 'None / parent origin' }, ...listed.map(n => ({ value: n.id, label: n.id }))], node.attach?.instance ?? '', v => editInstance('Change attachment', n => { if (!v) { delete n.attach; return; } const owner = candidates.find(x => x.id === v)!; const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); const anchor = Object.keys(anchors)[0]; if (!anchor) throw new Error('The selected owner exposes no anchors'); n.attach = { instance: v, anchor }; })); anchorDetails.append(label('Attach to', attachTo));
    if (node.attach) { const owner = candidates.find(n => n.id === node.attach!.instance); if (owner) { const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); anchorDetails.append(label('Owner anchor', select(Object.keys(anchors).map(v => ({ value: v, label: `${v} · ${anchors[v].role}` })), node.attach.anchor, v => editInstance('Change anchor', n => n.attach!.anchor = v)))); } }
    const ownAnchors = art.anchors(config.registry.properties(node.type, node.props), {}); for (const [name, anchor] of Object.entries(ownAnchors)) anchorDetails.append(element('p', 'muted', `${name}: (${anchor.x}, ${anchor.h}) · ${anchor.role}`));
    anchorDetails.append(element('p', 'muted', 'Attachment offsets are local. Changing an owner keeps the existing local offset; review the preview before saving.'));
    if (Object.keys(node.bindings ?? {}).length) { const choices=art.bindingIdentity==='presentation'?art.bindingChoices?.(composition):undefined,binding = part(choices?'Visual inputs':'Gameplay bindings · read-only', false); for (const [key, value] of Object.entries(node.bindings ?? {})) { const sources=choices?.[key];if(sources){binding.append(label(art.visualFields?.[key]?.label??key,select(sources.map(value=>({value,label:value})),value,source=>editInstance('Rebind '+key,n=>{n.bindings![key]=source;}))));}else{const row = element('p', 'binding-row'); row.append(element('span', 'muted', key), element('code', '', value)); binding.append(row);} } }
  }
  /** The Add picker: searchable pictures of every registered piece, placed at the centre of the view. */
  let cleanupPicker: void | (() => void);
  function openPicker() { if (current()?.kind !== 'composition' || !config.assetPreview) return; picker.style.setProperty('--picker-top', `${Math.round(workspace.getBoundingClientRect().top + 8)}px`); picker.hidden = false; renderPicker(); picker.querySelector<HTMLInputElement>('input[type=search]')?.focus(); }
  function closePicker() { if (picker.hidden) return; picker.hidden = true; cleanupPicker?.(); cleanupPicker = undefined; picker.replaceChildren(); thumbnails?.prune(); }
  /** Add asset shows the Library's browser over the stage: pick with its button or a double-click on a card. */
  function renderPicker() {
    const scene = sceneId(), head = element('div', 'picker-head'), body = element('div', 'picker-browser');
    head.append(element('strong', '', `Add asset to ${sceneName(scene)}`), element('span', 'muted', 'Double-click a piece, or select it and use Add'), button('✕', closePicker, 'Close (Esc)'));
    picker.replaceChildren(head, body); cleanupPicker?.();
    cleanupPicker = mountArtwork(body, scene, entry => { closePicker(); void addAtView(entry.id); }, (kit, settings,children) => { closePicker(); void addAtView(kit.id, settings,children); });
  }
  picker.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closePicker(); canvas.focus(); } });
  /** The editable kit presets document, when this editor has one. */
  const presetsDoc = () => documentsForView().find(d => d.id === PRESETS_DOCUMENT)?.value as KitPresets | undefined;
  /** A people-kit preset is a human, an animal or a robot by its body kind; other presets share their kit's kind. */
  const presetFamily = (preset: KitPreset, kit: AssetEntry) => kit.id !== 'character.resident' ? kit.family : preset.props.kind === undefined || preset.props.kind === 'human' ? 'Human' : ['cat', 'pigeon', 'gull', 'crab'].includes(String(preset.props.kind)) ? 'Animal' : 'Robot';
  async function addAtView(type: string, settings?: Properties,children?:AssetInstance[],clientX?:number) { const token = perfBegin('editor.add'); try {
    const doc = compositionDocument(); if (!doc || current()?.kind !== 'composition') { notice('Open a chunk to add assets.', true); return; }
    let x = 0;
    try {
      // Draw the new piece once off-screen at x = 0, then move it by its measured distance to the centre of the view.
      const draft = model.draftAdd(doc.id, type, settings,children), probe = element('canvas'); probe.width = canvas.width; probe.height = canvas.height;
      const result = await config.preview.render(probe, previewRequest(draft.composition, false)), box = result.bounds.find(b => b.id === draft.instanceId);
      if (box && result.deltaToLocal) { const rect = canvas.getBoundingClientRect(), view = stage.getBoundingClientRect(), centre = ((clientX ?? (Math.max(rect.left, view.left) + Math.min(rect.right, view.right)) / 2) - rect.left) * canvas.width / Math.max(1, rect.width); x = result.deltaToLocal(draft.instanceId, centre - (box.x + box.width / 2), 0).x; }
    } catch { x = 0; }
    x = snap ? Math.round(x / snap) * snap : Math.round(x);
    let added = false; run(() => { editorSelection.instance = model.add(doc.id, type, { x, h: 0 }, settings,children); inspector.appearance(); added = true; });
    if (added) { notice(`Added ${config.registry.get(type).label}. Drag it into place or set its position in the inspector.`); }
  } finally { perfEnd(token); }
  }
  function editArray<T>(container: HTMLElement, title: string, value: T, apply: (v: T) => void, help?: string) {
    const details = element('details'); details.append(element('summary', '', title)); if (help) details.append(element('p', 'muted', help)); const input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', title + ' JSON'); details.append(input, button('Apply ' + title.toLowerCase(), () => { try { apply(JSON.parse(input.value) as T); } catch (e) { notice(`Invalid ${title.toLowerCase()}: ${message(e)}`, true); } })); container.append(details);
  }
  function seekTime(seconds:number){const wasPlaying=playing||animating;playing=false;animating=false;time=Math.max(0,Math.min(sequence()?.duration??Infinity,seconds));updateTime();if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='camera')refreshRight();if(wasPlaying)refreshOptions();void draw();}
  function toggleAnimation(){
    if(sequence()){animating=false;playing=!playing;if(playing&&time>=sequence()!.duration)time=loop?loopFrom:0;refreshTimeline();}
    else{playing=false;animating=!animating;}
    refreshOptions();if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='camera')refreshRight();
  }
  function selectTimeline(selection:TimelineSelection|undefined,target?:Target){
    editorSelection.world=undefined;editorSelection.chunk=undefined;editorSelection.timeline=selection;playing=false;animating=false;
    if(selection?.kind==='camera'){editorSelection.document='';editorSelection.instance='';timelineView.collapsed.delete('Camera');}
    if(target){editorSelection.document=target.kind!=='camera'&&target.scene?documentsForView().find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===target.scene)?.id??'':'';editorSelection.instance=target.kind==='camera'?'':target.instance;}
    if((selection?.kind==='key'||selection?.kind==='track')&&target)timelineView.collapsed.delete(target.kind==='camera'?'Camera':target.scene?JSON.stringify([target.scene,target.instance]):target.instance);
    refreshLeft();refreshRight();refreshTimeline();void draw();
  }
  let cachedInspectorFrame: {document:string;time:number;version:object;sequence:string;reduced:boolean;frame:TimelineFrame}|undefined;
  function inspectorFrame(){
    if(!cachedInspectorFrame||cachedInspectorFrame.document!==currentId||cachedInspectorFrame.time!==time||cachedInspectorFrame.version!==model.sourceVersion||cachedInspectorFrame.sequence!==sequenceId||cachedInspectorFrame.reduced!==reduced)cachedInspectorFrame={document:currentId,time,version:model.sourceVersion,sequence:sequenceId,reduced,frame:evaluateTimeline(currentTimeline()!,sequenceId,time,evaluationContext(),{reduced})};
    return cachedInspectorFrame.frame;
  }
  function animatedControl(control:HTMLElement,target:Target,name:string){return keyframeControl(control,target,name,{sequence:()=>sequence()!,time:()=>time,playing:()=>playing,value:()=>keyValue(inspectorFrame(),target).value,addKey,seekTime,editTimeline,update:fn=>propertyUpdates.push(fn)});}
  function keyField(target:Target):Field{
    if(target.kind==='property'||target.kind==='state'||target.kind==='clip'){
      const source=targetComposition(evaluationContext(),viewCompositionDocument()!.value as ChunkDocument,target),node=flatten(source).find(n=>n.node.id===target.instance)!.node,entry=config.registry.get(node.type);
      if(target.kind==='clip')return{kind:'select',label:'Clip',default:'',options:[...(config.clips?.[node.type]??[])]};
      return(target.kind==='property'?entry.fields:entry.visualFields!)[target.property];
    }
    if(target.kind==='instance'&&target.property==='visible')return{kind:'boolean',label:'Visible',default:true};
    if(target.kind==='instance'&&target.property==='facing')return{kind:'select',label:'Facing',default:1,options:[-1,1]};
    return{kind:'number',label:target.kind==='camera'?(target.property==='h'?'Camera Y':target.property==='x'?'Camera X':'Camera zoom'):target.property==='x'?'X':target.property==='h'?'Y':'Value',default:0,...(target.property==='zoom'||target.property==='scale'?{min:.0001}:target.property==='opacity'?{min:0,max:1}:{})};
  }
  function cameraSelected():boolean{
    if(editorSelection.timeline?.kind==='camera')return true;
    if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='key')return sequence()?.tracks.find(t=>t.id===(editorSelection.timeline as {track:string}).track)?.target.kind==='camera';
    return false;
  }
  function openRenderingSource(source:import('../world/render-settings').RenderSource){
    inspectorDraft=undefined;refreshRight();
    if(source.kind==='district'){cityDistrict=source.id;mapHost.open=true;refreshMap();return;}
    if(source.kind==='chunk'){openScene(source.id);return;}
    if(source.kind==='sequence'||source.kind==='sequence-member'){openSequence(source.id);openSequenceRendering();return;}
    if(source.kind==='composition'){openComposition(source.id);openCompositionRendering(worldControls());return;}
    if(source.kind==='member'){if(workspaceId!==source.composition)openComposition(source.composition);selectWorldMember({composition:source.composition,member:source.member,...(source.child?{child:source.child}:{})});return;}
    if(source.kind==='group'){const world=workspaceSource(documentsForView());for(const [composition,definition]of Object.entries(world.compositions)){const member=definition.members.find(m=>m.group===source.id);if(member){if(workspaceId!==composition)openComposition(composition);selectWorldMember({composition,member:member.id});return;}}}
  }
  function openSequenceRendering(){
    const sequenceSource=sequence();if(!sequenceSource)return;
    openInspector({title:'Sequence rendering · '+sequenceSource.id,build:(body,form)=>{
      const draft=structuredClone(sequenceSource),documents=validationSnapshot(documentsForView()),city=documents.get('city-source') as CitySource,world=documents.get('world-compositions') as import('../world/compositions').WorldCompositions,scenes=pendingRegistry(documents);
      const worldDirected=(viewCompositionDocument()!.value as ChunkDocument).instances.some(n=>n.type==='sequence.world-control');
      const available=worldDirected?(workspaceId?worldChunkPlacements(world,workspaceId).map(c=>c.chunk):Object.keys(scenes)):[];let target='';
      const render=()=>{body.replaceChildren();form.select(body,'Rendering target',['',...available],target,value=>{target=value;render();});
        const note=element('p','muted','The empty target applies to the whole picture. A named chunk overrides only that member. Inherit removes this sequence override.');body.append(note);
        const local=target?draft.memberRendering?.[target]:draft.rendering,scene=scenes[target||painting.result?.activeScene||viewScene()]??{id:target||viewScene()};
        body.append(element('p','muted','Effective values shown for '+(scene.name??scene.id)+'. Other members may inherit different settings.'));
        const effective=renderPolicy(scene,city,world,draft,workspaceId||undefined,worldDirected?undefined:assetPictureLimits);
        renderSettingsAuthoring(form,body,local,value=>{if(target){if(value)(draft.memberRendering??={})[target]=value;else{delete draft.memberRendering?.[target];if(!Object.keys(draft.memberRendering??{}).length)delete draft.memberRendering;}}else if(value)draft.rendering=value;else delete draft.rendering;render();},effective,'Rendering',openRenderingSource);
      };render();return()=>editTimeline('Edit sequence rendering',program=>{const index=program.sequences.findIndex(s=>s.id===draft.id);program.sequences[index]=draft;});
    }});
  }
  function refreshTimeline() {
    timelineGrid?.dispose();timelineGrid=undefined;timelineHost.replaceChildren();timeLabel=undefined;transportPlay=undefined;
    const seq=sequence();if(!seq||!playHost.hidden){timelineHost.hidden=true;return;}timelineHost.hidden=false;timelineHost.classList.toggle('collapsed',timelineCollapsed);timelineHost.style.height=timelineCollapsed?'42px':timelineHeight+'px';
    const resize=element('div','timeline-resize');resize.tabIndex=0;resize.setAttribute('role','separator');resize.setAttribute('aria-label','Resize timeline');resize.setAttribute('aria-orientation','horizontal');
    let drag:{y:number;height:number}|undefined;resize.onpointerdown=e=>{drag={y:e.clientY,height:timelineHost.clientHeight};resize.setPointerCapture(e.pointerId);};resize.onpointermove=e=>{if(!drag)return;timelineHeight=Math.max(150,Math.min(center.clientHeight-200,drag.height+drag.y-e.clientY));timelineHost.style.height=timelineHeight+'px';};resize.onpointerup=e=>{drag=undefined;if(resize.hasPointerCapture(e.pointerId))resize.releasePointerCapture(e.pointerId);};resize.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();timelineHeight=Math.max(150,timelineHeight+(e.key==='ArrowUp'?30:-30));timelineHost.style.height=timelineHeight+'px';}};
    timelineHost.append(resize);
    const transport=element('div','timeline-transport');transportPlay=button(playing?'Pause':'Play',toggleAnimation,'Space: play / pause');transport.append(button(timelineCollapsed?'▸ Timeline':'▾ Timeline',()=>{timelineCollapsed=!timelineCollapsed;refreshTimeline();}),transportPlay,button('−1 frame',()=>seekTime((Math.round(time*60)-1)/60),'Comma: previous frame'),button('+1 frame',()=>seekTime((Math.round(time*60)+1)/60),'Period: next frame'));
    timeLabel=element('span','time');transport.append(timeLabel);timelineHost.append(transport);updateTime();if(timelineCollapsed)return;
    const zoom=numberInput(timelineView.zoom,value=>{timelineView.zoom=Math.max(1,Math.min(16,value));refreshTimeline();},1);const speed=speedControl();speed.setAttribute('aria-label','Playback speed');transport.append(speed);zoom.max='16';zoom.setAttribute('aria-label','Timeline zoom');transport.append(label('Zoom',zoom));
    const settings=element('details','timeline-settings'),dataPanel=element('div');settings.append(element('summary','','Settings'),dataPanel);transport.append(settings,button('Rendering',openSequenceRendering,'Inspect sequence overrides and their inherited source'));
    const trackSelect=select([{value:'',label:'Add keyframe…'},...thisTargets()],'',value=>{if(value)addKey(JSON.parse(value) as Target);});trackSelect.setAttribute('aria-label','Add keyframe target');transport.append(trackSelect);
    timelineGrid=mountTimelineGrid(timelineHost,{sequence:seq,state:timelineView,time,onZoom:value=>zoom.value=String(Math.round(value*100)/100),selected:editorSelection.timeline,instance:editorSelection.document?JSON.stringify([(compositionDocument()!.value as ChunkDocument).scene,editorSelection.instance]):editorSelection.instance,label:id=>{let scene='',instance=id;if(id.startsWith('[')){[scene,instance]=JSON.parse(id) as string[];}const doc=scene?documentsForView().find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===scene):viewCompositionDocument(),node=doc&&flatten(doc.value as ChunkDocument).find(n=>n.node.id===instance)?.node;return (scene?sceneName(scene)+' / ':'')+instance+(node?' · '+config.registry.get(node.type).label:'');},select:selectTimeline,seek:seekTime,moveKey:(track,index,seconds)=>{editTimeline('Move keyframe',d=>{editorSelection.timeline={kind:'key',track,index:moveKey(d.sequences[0],track,index,seconds)};});refreshTimeline();refreshRight();}});
    // Settings is folded by default: its forms are built when it is first opened, and it stays open across refreshes.
    let settingsBuilt=false;const buildSettings=()=>{if(settingsBuilt)return;settingsBuilt=true;
    dataPanel.append(label('Duration',numberInput(seq.duration,value=>editTimeline('Change duration',d=>d.sequences[0].duration=value),1/60)));
    const loopInput=element('input');loopInput.type='checkbox';loopInput.checked=loop;loopInput.onchange=()=>loop=loopInput.checked;
    dataPanel.append(label('Loop range',loopInput),label('From',numberInput(loopFrom,v=>{if(v>=(loopTo||seq.duration)){notice('Loop start must precede loop end.',true);return;}loopFrom=v;},0)),label('To',numberInput(loopTo||seq.duration,v=>{if(v<=loopFrom||v>seq.duration){notice('Loop end must follow its start and remain within the sequence.',true);return;}loopTo=v;},0)));
    const apply = <K extends keyof Sequence>(key: K, value: Sequence[K]) => editTimeline(`Edit ${key}`, d => { d.sequences.find(s => s.id === sequenceId)![key] = value; });
    editArray(dataPanel, 'Shots', seq.shots, value => apply('shots', value), 'Ordered {id,from,to,camera:{x,h,zoom}}. Times are seconds. Shots must not overlap.');
    editArray(dataPanel, 'Text cards', seq.text, value => apply('text', value), '{id,from,to,text,x,h}. Cards are rendered by the shared preview provider.');
    editArray(dataPanel, 'Fades', seq.fades, value => apply('fades', value), '{id,from,to,color,start,end}. Opacity stays within 0–1.');
    renderSequenceCommandsAuthoring(dataPanel,seq,commandTargets(),(label,change)=>editTimeline(label,d=>change(d.sequences.find(s=>s.id===sequenceId)!)),e=>notice(e instanceof Error?e.message:String(e),true));
    editArray(dataPanel, 'Named beats', seq.beats, value => apply('beats', value), '{id,time}. Previewing these never dispatches gameplay events.');
    const handoff = element('details'); handoff.append(element('summary', '', 'Handoff destination')); const destinations = Object.keys(model.timelineContext().destinations ?? {}); handoff.append(label('Chunk', select([{ value: '', label: 'No handoff' }, ...destinations.map(v => ({ value: v, label: v }))], seq.handoff?.scene ?? '', v => apply('handoff', v ? { scene: v } : undefined))));
    if (seq.handoff) handoff.append(label('Entrance', select([{ value: '', label: 'Default entrance' }, ...(model.timelineContext().destinations?.[seq.handoff.scene] ?? []).map(v => ({ value: v, label: v }))], seq.handoff.entrance ?? '', v => apply('handoff', { scene: seq.handoff!.scene, ...(v ? { entrance: v } : {}) })))); handoff.append(element('p', 'muted', 'Preview never travels or changes player progress.')); dataPanel.append(handoff);
    editArray(dataPanel, 'Sequence document', seq, value => editTimeline('Edit sequence', d => { const i = d.sequences.findIndex(s => s.id === sequenceId); d.sequences[i] = value; sequenceId = value.id; }), 'Advanced full sequence data, including registered exact motion tracks and clips. No code is accepted.');
    };
    settings.open=timelineSettingsOpen;if(settings.open)buildSettings();settings.ontoggle=()=>{timelineSettingsOpen=settings.open;if(settings.open)buildSettings();};
  }
  function thisTargets(): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    const add = (target: Target, text: string) => result.push({ value: JSON.stringify(target.kind==='camera'||compositionDocument()?.id===viewCompositionDocument()?.id?target:{...target,scene:(compositionDocument()!.value as ChunkDocument).scene}), label: text });
    for (const property of ['x', 'h', 'zoom'] as const) add({ kind: 'camera', property }, `Camera · ${property}`);
    const node = selected(); if (node) { for (const property of ['x', 'h', 'scale', 'facing', 'parallax', 'visible', 'opacity'] as const) add({ kind: 'instance', instance: node.id, property }, `${node.id} · ${property}`); const entry = config.registry.get(node.type); for (const [property, field] of Object.entries(entry.fields)) if (field.animatable&&!resolvedArtwork(compositionDocument()?.id??currentId,node.id)?.properties[property]?.readOnly) add({ kind: 'property', instance: node.id, property }, `${node.id} · ${field.label}`); for (const [property, field] of Object.entries(entry.visualFields ?? {})) { if (field.animatable) add({ kind: 'state', instance: node.id, property }, `${node.id} state · ${field.label}`); if (config.clips?.[node.type]?.length) add({ kind: 'clip', instance: node.id, property }, `${node.id} clip · ${field.label}`); } }
    return result;
  }
  function keyValue(frame:TimelineFrame,target:Target):{value:Value;discrete:boolean}{
      const source=target.kind==='camera'?frame:timelineArtwork(frame,target.scene??frame.composition.scene),composition=source?.composition??targetComposition(evaluationContext(),frame.composition,target);
      const node = target.kind === 'camera' ? undefined : flatten(composition).find(n => n.node.id === target.instance)?.node;
      let value: Value, discrete = false;
      if (target.kind === 'camera') value = frame.camera[target.property];
      else if (target.kind === 'instance') { value = target.property === 'visible' ? source?.visibility[target.instance] ?? true : target.property === 'opacity' ? source?.opacity[target.instance] ?? 1 : node!.placement[target.property] ?? 1; discrete = ['visible', 'facing'].includes(target.property); }
      else if (target.kind === 'property' || target.kind === 'state') { const entry = config.registry.get(node!.type), field = (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property]; value = target.kind === 'property' ? node!.props[target.property] ?? field.default : source?.state[target.instance]?.[target.property] ?? field.default; discrete = !fieldIsContinuous(field); }
      else { value = source?.clips[target.instance]?.[target.property] ?? config.clips?.[node!.type]?.[0] ?? ''; discrete = true; }
    return{value,discrete};
  }
  function addKey(target: Target, explicitValue?:Value) {
    editTimeline('Add / update keyframe', doc => {
      const seq = doc.sequences.find(s => s.id === sequenceId)!; const frame = evaluateTimeline(doc, sequenceId, time, evaluationContext(), { reduced });
      const sampled=keyValue(frame,target),value=explicitValue===undefined?sampled.value:explicitValue,discrete=sampled.discrete;
      setKeyAtPlayhead(seq,target,time,value,discrete);
    });
  }
  function validateDrag(pending:ChunkDocument){
    const node=flatten(pending).find(n=>n.node.id===editorSelection.instance)?.node;
    if(!node)return;
    const base=selected(),seq=sequence(),sequenceDoc=viewCompositionDocument(),doc=compositionDocument();
    if(base&&doc)guardLinkedProperties(doc.id,node,base.props,base.bindings);
    for(const property of ['x','h'] as const){
      const target:Target={kind:'instance',instance:node.id,property,...(doc?.id!==sequenceDoc?.id?{scene:pending.scene}:{})};
      if(base&&node.placement[property]!==base.placement[property]&&seq&&keyframeState(seq,target,time).track?.motion)throw Error(property+' is controlled by procedural motion.');
    }
    for(const [property,value] of Object.entries(node.props)){
      const target:Target={kind:'property',instance:node.id,property,...(doc?.id!==sequenceDoc?.id?{scene:pending.scene}:{})};
      if(base&&value!==(base.props[property]??config.registry.get(node.type).fields[property]?.default)&&seq&&keyframeState(seq,target,time).track?.motion)throw Error(property+' is controlled by procedural motion.');
    }
    config.validatePlacement?.(pending,documentsForView());
  }
  function commitDrag(pending:ChunkDocument){
    run(()=>{
      const doc=compositionDocument()!,sequenceDoc=viewCompositionDocument(),currentSequence=sequence(),node=flatten(pending).find(n=>n.node.id===editorSelection.instance)!.node;
      const base=flatten(doc.value as ChunkDocument).find(n=>n.node.id===node.id)!.node;
      const directed=sequenceDoc&&currentSequence?copy(sequenceDoc.value as ChunkDocument):undefined;
      let keyed=false;
      for(const property of ['x','h'] as const){const target:Target={kind:'instance',instance:node.id,property,...(doc.id!==sequenceDoc?.id?{scene:pending.scene}:{})};const track=currentSequence&&keyframeState(currentSequence,target,time).track;
        if(!track)continue;if(track.motion)throw Error(property+' is controlled by procedural motion.');setKeyAtPlayhead(directed!.sequence!,target,time,node.placement[property],false);node.placement[property]=base.placement[property];keyed=true;
      }
      for(const[property,value]of Object.entries(node.props)){
        if(value===(base.props[property]??config.registry.get(node.type).fields[property]?.default))continue;
        const target:Target={kind:'property',instance:node.id,property,...(doc.id!==sequenceDoc?.id?{scene:pending.scene}:{})};
        const track=currentSequence&&keyframeState(currentSequence,target,time).track;
        if(!track)continue;if(track.motion)throw Error(property+' is controlled by procedural motion.');
        setKeyAtPlayhead(directed!.sequence!,target,time,value,!fieldIsContinuous(config.registry.get(node.type).fields[property]));
        if(Object.prototype.hasOwnProperty.call(base.props,property))node.props[property]=base.props[property];else delete node.props[property];keyed=true;
      }
      if(keyed){if(doc.id===sequenceDoc!.id)pending.sequence=directed!.sequence;model.importDocuments([{id:doc.id,value:pending},...(doc.id!==sequenceDoc!.id?[{id:sequenceDoc!.id,value:directed}]:[])],'Drag artwork');}
      else model.edit(doc.id,'Drag artwork',()=>pending);
    },false,'artwork');
  }
  function updateTime() { updateContextSummary();for(const update of propertyUpdates)update(); timelineGrid?.update(time);if(transportPlay){transportPlay.textContent=playing?'Pause':'Play';transportPlay.setAttribute('aria-pressed',String(playing));}if(ambientLabel)ambientLabel.textContent=`${time.toFixed(3)} s`; if (timeLabel) timeLabel.textContent = `${time.toFixed(3)} / ${(sequence()?.duration ?? 0).toFixed(3)} s · frame ${Math.round(time * 60)}`; }
  function workspaceNavigation(transient=true){
    // Rendering uses chunk-local coordinates; membership moves must not move the editor view.
    let originDelta={x:0,h:0};
    if(workspaceId){const pending=(transient?worldDrag?.pending:undefined)??workspaceSource(documentsForView()),origin=viewScene(),at=worldChunkPlacements(pending,workspaceId).find(c=>c.chunk===origin),key=currentId+':'+workspaceId+':'+origin;
      if(at){if(workspaceOrigin?.key!==key)workspaceOrigin={key,x:at.x,h:at.h};originDelta={x:at.x-workspaceOrigin.x,h:at.h-workspaceOrigin.h};}
    }else workspaceOrigin=undefined;
    return {x:sequenceNav.x-originDelta.x,h:sequenceNav.y-originDelta.h,zoom:sequenceNav.zoom};
  }
  function gameViewport(directed=!!sequence()){const scale=Number(environment.renderScale??1),zoom=directed?1:Number(environment.zoom??1);return{width:baseWidth,height:baseHeight,scale:scale*zoom,...(zoom===1?{}:{ground:(baseHeight/scale-54)/zoom})};}
  function dynamicWorkspace(){return navigable()&&!cameraPreview&&!comparing();}
  function previewSize(){return dynamicWorkspace()?{width:Math.max(120,Math.round(stage.clientWidth-16)),height:Math.max(120,Math.round(stage.clientHeight-16))}:{width:baseWidth,height:baseHeight};}
  let focusMotion:{from:{x:number;y:number;zoom:number};to:{x:number;y:number;zoom:number};elapsed:number;document:string}|undefined;
  function stopFollowing(){focusMotion=undefined;if(followCamera){followCamera=false;refreshViewportTools();rememberView();}}
  function locateCamera(){const focus=painting.result?.camera?.focus;if(cameraPreview||!focus){cameraPreview=false;locateCameraPending=true;refreshViewportTools();refreshOptions();void draw();return;}sequenceNav.x=focus.x;sequenceNav.y=focus.h;sequenceNav.zoom=focus.zoom;refreshViewportTools();refreshOptions();void draw();}
  function previewRequest(composition: ChunkDocument, overlay: boolean, frame?: TimelineFrame): PreviewRequest { return perfMeasure('editor.preview-request',()=>{
    const interaction=model.interactionPreview(),timeline = currentTimeline(),documents=worldDrag?.pending?model.previewDocuments('world-compositions',worldDrag.pending):viewport.dragging&&editorSelection.document?model.previewDocuments(editorSelection.document,viewport.dragging.pending):validationSnapshot(documentsForView());
    return {viewport:gameViewport(),direction:currentTimeline()?'sequence':'base',checkpoint:worldState()?.checkpoint,scope:workspaceId?{composition:workspaceId,origin:viewScene(),chunks:workspaceDocuments(workspaceId,documentsForView(),worldState()?.checkpoint?.membership).map(d=>(d.value as ChunkDocument).scene)}:undefined,workspace:navigable()&&!cameraPreview?{...workspaceNavigation(),followCamera,...(painting.workspaceAnchor?.document===currentId?{anchorX:painting.workspaceAnchor.x,anchorH:painting.workspaceAnchor.h}:{})}:undefined,sourceVersion:worldDrag?.pending??interaction?.sourceVersion??model.sourceVersion,transient:interaction?.transient??(viewport.dragging?{document:compositionDocument()!.id,composition:viewport.dragging.pending}:undefined),documents, composition: copy(composition), frame, timeline, sequenceId: timeline ? sequenceId : undefined, time,ambientTime:time+ambientOffset+Number(environment.titleOffset??0), reduced,overlays:overlay,objectOutlines:overlay&&showObjectOutlines,selectedId:Object.entries(painting.result?.sources??{}).find(([,source])=>source.document===compositionDocument()?.id&&source.instance===editorSelection.instance)?.[0]??editorSelection.instance, player: true, hidden: [...hiddenIn(compositionDocument()?.id)], environment: { ...environment } };
  });}
    const previewRenderer=createPreviewRenderer({get reduced(){return reduced;},get disposed(){return disposed;},get emptyWorkspace(){return !!workspaceId&&!workspaceDocuments(workspaceId,documentsForView(),worldState()?.checkpoint?.membership).length;},get painting(){return painting;},get viewCompositionDocument(){return viewCompositionDocument;},get previewError(){return previewError;},get current(){return current;},get canvas(){return canvas;},get syncWorldState(){return syncWorldState;},get currentTimeline(){return currentTimeline;},get selectedDocumentId(){return editorSelection.document;},get viewport(){return viewport;},get evaluationContext(){return evaluationContext;},get sequence(){return sequence;},get sequenceId(){return sequenceId;},get time(){return time;},get previewRequest(){return previewRequest;},get currentId(){return currentId;},get sizeCanvas(){return sizeCanvas;},get baseWidth(){return previewSize().width;},get baseHeight(){return previewSize().height;},get config(){return config;},get overlays(){return overlays;},get updateRenderStatus(){return updateRenderStatus;},get placeHover(){return placeHover;},get placeJoined(){return placeJoined;},get presented(){return ()=>{inspector.updateResolved();syncLinkedProperties();if(followCamera&&!cameraPreview&&painting.result?.camera){const focus=painting.result.camera.focus,nav=workspaceNavigation();sequenceNav.x+=focus.x-nav.x;sequenceNav.y+=focus.h-nav.h;sequenceNav.zoom=focus.zoom;const readout=viewportTools.querySelector<HTMLElement>('[data-workspace-zoom]');if(readout)readout.textContent=Math.round(sequenceNav.zoom*100)+'%';}if(locateCameraPending&&painting.result?.camera){locateCameraPending=false;locateCamera();}};},get comparing(){return comparing;},get documentsForView(){return documentsForView;},get compareId(){return compareId;},get stage(){return stage;},get compareCanvas(){return compareCanvas;}});
  function resolvedArtwork(document:string,id:string,result=painting.result){
    const key=Object.keys(result?.resolved??{}).find(k=>result?.sources?.[k]?result.sources[k].document===document&&result.sources[k].instance===id:document===currentId&&k===id);
    return key?result?.resolved?.[key]:undefined;
  }
  function editDrawingBoundary(field?:string){
    const a=resolvedArtwork(compositionDocument()?.id??currentId,editorSelection.instance),key=field??a?.drawingWindow?.from;
    inspector.appearance();refreshRight();
    const label=key&&a?.properties[key]?.label;
    if(label)queueMicrotask(()=>{const input=[...right.querySelectorAll<HTMLInputElement>('input[aria-label]')].find(e=>e.getAttribute('aria-label')===label);input?.focus({preventScroll:true});input?.scrollIntoView({block:'nearest'});});
  }
  function showDrawingBoundary(){
    const doc=compositionDocument()?.id??currentId,id=editorSelection.instance,a=resolvedArtwork(doc,id);if(!a?.drawingWindow)return;
    const key=JSON.stringify([doc,id]);if(boundaryFor===key){boundaryFor='';placeJoined();return;}
    boundaryFor=key;stopFollowing();
    const x=windowEdges(a)[0].x;
    if(!cameraPreview&&(x<40||x>canvas.width-40)){sequenceNav.x+=(x-canvas.width/2)/(painting.result?.workspaceScale??1);void draw();}else placeJoined();
  }
  function placeDrawingBoundary(){
    if(!overlays||boundaryFor!==JSON.stringify([compositionDocument()?.id??currentId,editorSelection.instance]))return;
    const a=resolvedArtwork(compositionDocument()?.id??currentId,editorSelection.instance);if(!a?.drawingWindow)return;
    const rect=canvas.getBoundingClientRect(),frame=stageWrap.getBoundingClientRect(),scale=rect.width/canvas.width,left=rect.left-frame.left,top=rect.top-frame.top,w=a.drawingWindow.bounds;
    const lo=Math.max(0,w.x),hi=Math.min(canvas.width,w.x+w.width);
    if(hi>lo){const area=element('div');area.dataset.visibilityArea='';Object.assign(area.style,{position:'absolute',pointerEvents:'none',left:(left+lo*scale)+'px',top:top+'px',width:(hi-lo)*scale+'px',height:rect.height+'px',background:'rgba(80,210,230,.07)'});joinedLayer.append(area);}
    for(const edge of windowEdges(a)){if(edge.x<0||edge.x>canvas.width)continue;const line=element('div');line.dataset.visibilityBoundary=edge.field;Object.assign(line.style,{position:'absolute',pointerEvents:'none',left:(left+edge.x*scale)+'px',top:top+'px',height:rect.height+'px',borderLeft:'2px dashed #50d2e6'});const label=button((edge.field===a.drawingWindow.from?'Drawing starts':'Drawing ends')+' · X '+String(a.properties[edge.field]?.value),()=>editDrawingBoundary(edge.field),'Select this drawing boundary to edit its value in the inspector');Object.assign(label.style,{position:'absolute',pointerEvents:'auto',left:'4px',top:'40px',whiteSpace:'nowrap'});line.append(label);joinedLayer.append(line);}
  }
  function draw(advance=false){return previewRenderer.draw(advance);}
  const viewportObserver=new ResizeObserver(()=>{if(!disposed&&playHost.hidden&&group==='layout'&&dynamicWorkspace())void draw();});viewportObserver.observe(stage);
  function refresh() { if(numericScrubbing){void draw();return;}return withViewDocuments(() => { if (disposed) return; if(workspaceId){const members=workspaceDocuments(workspaceId,documentsForView(),worldState()?.checkpoint?.membership);if(members.length&&!members.some(d=>d.id===currentId)){const next=members[0],at=painting.result?.projectChunk?.((next.value as ChunkDocument).scene,0,0),previous=painting.result?.projectChunk?.(viewScene(),0,0),scale=painting.result?.workspaceScale??1;if(at&&previous&&!currentTimeline()){sequenceNav.x-=(at.x-previous.x)/scale;sequenceNav.y+=(at.y-previous.y)/scale;}currentId=next.id;painting.workspaceAnchor=undefined;}} if(currentId&&!documentsForView().some(d=>d.id===currentId)){currentId=documentsForView().find(d=>d.kind==='composition')?.id??'';editorSelection.instance='';editorSelection.document='';stopPlay();} const timeline = currentTimeline(); if (timeline && !timeline.sequences.some(s => s.id === sequenceId)) sequenceId = timeline.sequences[0]?.id ?? ''; const seq = sequence(); if (seq) { time = Math.max(0, Math.min(time, seq.duration)); loopTo = Math.min(loopTo || seq.duration, seq.duration); if (loopFrom >= loopTo) loopFrom = 0; } perfMeasure('editor.header', refreshHeader); perfMeasure('editor.options', refreshOptions); refreshViewportTools(); perfMeasure('editor.outline', refreshLeft); playHandle?.refresh?.(); perfMeasure('editor.inspector', refreshRight); perfMeasure('editor.timeline', refreshTimeline); void draw(); }); }
  /** The chosen saved world state, if any; its values override the preview environment on every draw. */
  function syncWorldState() { const state = worldState(); if (state) Object.assign(environment, state.environment); }
  function worldState() { const scene = viewScene(); if (!config.worldStates || !scene || current()?.kind !== 'composition') return undefined;if(activeCheckpointId!==undefined)return config.worldStates.list('',documentsForView()).find(s=>s.id===activeCheckpointId); const id = config.worldStates.selected(scene, documentsForView()); return id ? config.worldStates.list(scene, documentsForView()).find(state => state.id === id) : undefined; }
  function compareOptions() { const doc = compositionDocument(); return doc && config.compareWith ? config.compareWith((doc.value as ChunkDocument).scene, documentsForView()) : []; }
  function comparing() { return !!compareId && !workspaceId && !currentTimeline() && compareOptions().some(o => o.id === compareId); }
  function sizeCanvas(width:number,height:number){if(canvas.width!==width||canvas.height!==height){
    if(dynamicWorkspace()&&painting.resultDocument===currentId&&painting.result?.workspaceScale){Object.assign(sequenceNav,resizeWorkspace(sequenceNav,canvas,{width,height},painting.result.workspaceScale));rememberView();}
    canvas.width=width;canvas.height=height;
  }canvas.style.setProperty('--ratio',String(width/height));canvas.style.setProperty('--fit-ratio',String(width/height));}
  const coordinates = (event: { clientX: number; clientY: number }) => { return canvasPoint(event,canvas.getBoundingClientRect(),canvas.width,canvas.height); };
  /** Small artwork gets a minimum target; the smallest box under the pointer wins over the room behind it. */
  const hitTest=(point:{x:number;y:number})=>hitTestArtwork(painting.result,point,16*canvas.width/Math.max(1,canvas.getBoundingClientRect().width));
  const hitsUnder=(point:{x:number;y:number})=>hitsAt(painting.result,point,16*canvas.width/Math.max(1,canvas.getBoundingClientRect().width));
  const isSelectedHit=(id:string)=>{const source=painting.result?.sources?.[id];return source?source.instance===editorSelection.instance&&source.document===compositionDocument()?.id:id===editorSelection.instance;};
  const hitLabel=(id:string)=>painting.result?.sources?.[id]?.instance??id;
  function cycleAt(point:{x:number;y:number}){const hits=hitsUnder(point),index=hits.findIndex(hit=>isSelectedHit(hit.id));if(hits.length<2||index<0)return;const next=hits[(index+1)%hits.length];select_(next.id);notice(`${hitLabel(next.id)} · ${(index+1)%hits.length+1} of ${hits.length} here · click again for the next`);}
  let pickListOpened=0;
  function listAt(point:{x:number;y:number},client:{clientX:number;clientY:number}){
    const hits=hitsUnder(point);if(!hits.length)return;const box=stageWrap.getBoundingClientRect();
    pickList.replaceChildren(element('div','pick-head',`${hits.length} here`),...hits.map(hit=>{const item=button(hitLabel(hit.id),()=>{pickList.hidden=true;select_(hit.id);});item.setAttribute('role','menuitem');item.setAttribute('aria-pressed',String(isSelectedHit(hit.id)));return item;}));
    pickList.style.left=`${Math.min(client.clientX-box.left,box.width-240)}px`;pickList.style.top=`${Math.min(client.clientY-box.top,box.height-40)}px`;pickListOpened=performance.now();pickList.hidden=false;(pickList.querySelector('button:not([aria-pressed=true])') as HTMLElement|null)?.focus();
  }
  const spatialHandles=mountSpatialHandles(stageWrap,canvas);
  const resizeFeedback=element('output','spatial-feedback');resizeFeedback.hidden=true;resizeFeedback.setAttribute('aria-label','Resize values');stageWrap.append(resizeFeedback);
  /** Presentation only: candidate values belong to the viewport gesture, committed values to ComposerModel. */
  function spatialFeedback(phase:'start'|'preview'|'finish'|'cancel',fields:readonly string[],node?:AssetInstance){
    if(phase==='start'){
      const changed=inspector.selectSection('appearance'),timeline=!!editorSelection.timeline;editorSelection.timeline=undefined;if(changed||timeline)refreshRight();
    }
    if(phase==='start'||phase==='finish'||phase==='cancel'){
      for(const row of right.querySelectorAll<HTMLElement>('[data-spatial-active]'))delete row.dataset.spatialActive;
      const controls=[...right.querySelectorAll<HTMLElement>('[data-asset-property]')].filter(control=>fields.includes(control.dataset.assetProperty!));
      if(phase!=='cancel')for(const control of controls){const row=control.closest<HTMLElement>('label')??control;row.dataset.spatialActive='true';let parent:HTMLElement|null=control;while(parent&&parent!==right){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}}
      if(phase==='finish'){
        
        const control=controls[0];if(control){const area=right.getBoundingClientRect(),at=control.getBoundingClientRect();if(at.top<area.top)right.scrollTop+=at.top-area.top-12;else if(at.bottom>area.bottom)right.scrollTop+=at.bottom-area.bottom+12;control.focus({preventScroll:true});}
      }
    }
    resizeFeedback.hidden=phase==='finish'||phase==='cancel'||!node;
    if(!resizeFeedback.hidden&&node){const schema=config.registry.get(node.type).fields;resizeFeedback.textContent=fields.map(key=>{const field=schema[key],value=node.props[key]??field.default,shown=typeof value==='number'?String(Number(value.toFixed(3))):String(value);return field.label+' '+shown+(fieldUnit(field)?' '+fieldUnit(field):'');}).join(' · ');}
  }
  function placeHover() {
    const selected=painting.result?.bounds.find(box=>{
      const source=painting.result?.sources?.[box.id];
      return source?source.document===editorSelection.document&&source.instance===editorSelection.instance:box.id===editorSelection.instance;
    });
    spatialHandles.update(painting.result?.handles,overlays&&playHost.hidden);
    placeObjectLabel(selectionBox,overlays?selected:undefined);
    placeObjectLabel(hoverBox,viewport.hoverId!==selected?.id?painting.result?.bounds.find(box=>box.id===viewport.hoverId):undefined);
  }
  function placeObjectLabel(target:HTMLElement,box:PreviewResult['bounds'][number]|undefined) {
    target.hidden=!box;if(!box)return;
    // Hover and selection share CSS sizing, independent of canvas resolution and zoom.
    const frame=stageWrap.getBoundingClientRect(),at=canvas.getBoundingClientRect(),scale=at.width/canvas.width;
    const source=painting.result?.sources?.[box.id],document=source?model.get(source.document):compositionDocument();
    const node=document&&flatten(document.value as ChunkDocument).find(x=>x.node.id===(source?.instance??box.id))?.node;
    const left=at.left-frame.left+box.x*scale,top=at.top-frame.top+box.y*scale;
    Object.assign(target.style,{left:`${left}px`,top:`${top}px`,width:`${box.width*scale}px`,height:`${box.height*scale}px`});
    target.dataset.label=node?`${node.id} · ${config.registry.get(node.type).label}`:source?.instance??box.id;
    target.toggleAttribute('data-below',top<22);target.toggleAttribute('data-right',left>frame.width*.6);
  }

  function updateRenderStatus(){renderStatus.hidden=!playHost.hidden;if(renderStatus.hidden)return;const now=performance.now();if(now-statusUpdatedAt<250)return;statusUpdatedAt=now;if(now-renderWindow>=500){renderFps=painting.renderCount*1000/(now-renderWindow);painting.renderCount=0;renderWindow=now;}const scene=painting.result?.camera??painting.result?.regions?.find(region=>region.active);renderStatus.textContent=(scene?'Chunk: '+scene.label+' · ':'')+(!(playing||animating||viewport.dragging?.armed)?'Paused':renderFps.toFixed(0)+' render fps')+' · '+painting.lastPaintMs.toFixed(1)+' ms';renderStatus.title='Completed editor renders per second and CPU render submission time; not GPU/display FPS';}
  function zoomTo(next: number, anchor?: { clientX: number; clientY: number }) {
    stopFollowing();
    if(navigable()){if(cameraPreview)return;const rect=canvas.getBoundingClientRect(),point=anchor??{clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};Object.assign(sequenceNav,zoomWorkspace(sequenceNav,next,{x:point.clientX-rect.left-rect.width/2,y:point.clientY-rect.top-rect.height/2},canvas.width/rect.width/(painting.result?.workspaceScale??1)));refreshViewportTools();void draw();return;}
  }
  function selectWorldMember(address:WorldMemberAddress){
    if(workspaceId!==address.composition){const workspace=compositionWorkspaces(documentsForView()).find(w=>w.id===address.composition);if(!workspace?.chunks.length)return;openDocument(workspace.chunks[0].id,address.composition);}
    editorSelection.world=address;editorSelection.chunk=undefined;editorSelection.timeline=undefined;editorSelection.instance='';editorSelection.document='';
    refreshRight();for(const row of left.querySelectorAll<HTMLElement>('[data-world-member]'))row.setAttribute('aria-pressed',String(row.dataset.worldMember===address.member&&row.dataset.worldChild===address.child));
    void draw();
  }
  function worldControls(documents:()=>readonly EditorDocument[]=documentsForView):WorldWorkspaceControls{return{openRenderingSource,inspect:openInspector,activeInspector:()=>inspectorDraft?.request.id,registry:config.registry,documents,composition:()=>workspaceId,selection:()=>editorSelection.world,select:selectWorldMember,openChunk:openScene,
    apply:(label,source)=>{model.edit('world-compositions',label,()=>source);if(!numericScrubbing){thumbnailDocuments=undefined;thumbnails?.invalidate();}},changed:()=>{outlineSnapshot=undefined;refresh();}};}
  function startWorldDrag(event:PointerEvent,address:WorldMemberAddress){
    if(event.button!==0||cameraPreview||!playHost.hidden)return;event.preventDefault();event.stopPropagation();selectWorldMember(address);
    cancelWorldDrag?.();const source=workspaceSource(documentsForView()),at={...worldMemberAt(source,address).member.placement},rect=canvas.getBoundingClientRect();
    worldDrag={source,address,at,x:event.clientX,y:event.clientY,scale:(painting.result?.workspaceScale??1)*rect.width/canvas.width};
    // Document listeners survive replacing the overlay on each real-engine render.
    const cancel=()=>{cancelWorldDrag=undefined;worldDrag=undefined;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);void draw();};
    const context=worldCompositionContext(pendingRegistry(validationSnapshot(documentsForView())));
    const linked=event.shiftKey;const move=(e:PointerEvent)=>{if(!worldDrag)return;const dx=(e.clientX-worldDrag.x)/worldDrag.scale,dh=(worldDrag.y-e.clientY)/worldDrag.scale;
      const quantize=(value:number)=>snap?Math.round(value/snap)*snap:value;
      try{const candidate=moveWorldMember(source,address,{x:quantize(at.x+dx),h:quantize(at.h+dh)},linked);
      // Drawing consumes only the latest pointer sample per animation frame; the native
      // preview validates its graph and the final edit passes full ComposerModel validation.
      compileWorldComposition(candidate,address.composition,context);
      worldDrag.pending=candidate;if(placementIssue){placementIssue=undefined;refreshRight();}notice('Release to move chunk.');dragPreviewDirty=true;}catch(e){worldDrag.pending=undefined;placementIssue={address,reason:message(e)};inspectorError='';refreshRight();right.scrollTop=0;notice('Move blocked · see inspector');dragPreviewDirty=true;}
    };
    const up=()=>{const pending=worldDrag?.pending;cancel();if(pending)run(()=>model.edit('world-compositions','Drag world member',()=>pending));};
    cancelWorldDrag=cancel;document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});document.addEventListener('pointercancel',cancel,{once:true});
  }
  /** Fit the actual prepared chunk regions using the shared workspace navigation. */
  function fitJoined(){
    stopFollowing();
    const regions=painting.result?.regions;if(!regions?.length||cameraPreview)return;
    const left=Math.min(...regions.map(r=>r.x)),right=Math.max(...regions.map(r=>r.x+r.width)),top=Math.min(...regions.map(r=>r.y)),bottom=Math.max(...regions.map(r=>r.y+r.height)),scale=painting.result?.workspaceScale??1;
    sequenceNav.x+=((left+right)/2-canvas.width/2)/scale;sequenceNav.y-=((top+bottom)/2-canvas.height/2)/scale;
    sequenceNav.zoom=workspaceZoom(sequenceNav.zoom*Math.min(canvas.width/Math.max(1,right-left),canvas.height/Math.max(1,bottom-top))*.94);
    refreshViewportTools();void draw();
  }
  /** A tag over each joined scene in the preview: its name, which side it joins on, and a button that opens it. */
  function placeJoined() {
    if(restoredScroll){stage.scrollLeft=restoredScroll.x;stage.scrollTop=restoredScroll.y;restoredScroll=undefined;}joinedLayer.replaceChildren();placeDrawingBoundary();if(navigable()){const rect=canvas.getBoundingClientRect(),frame=stageWrap.getBoundingClientRect(),scale=rect.width/canvas.width;if(painting.result?.camera){const camera=painting.result.camera,box=element('div','sequence-camera-guide');const pick=button('Camera · '+camera.label,()=>selectTimeline({kind:'camera'}),'Select the game camera');pick.setAttribute('aria-label','Select game camera');pick.style.pointerEvents='auto';pick.setAttribute('aria-pressed',String(cameraSelected()));box.append(pick);for(const edge of ['top','right','bottom','left']){const handle=button('',()=>selectTimeline({kind:'camera'}),'Select the game camera');handle.className='camera-border-hit '+edge;handle.setAttribute('aria-label','Select camera '+edge+' border');box.append(handle);}Object.assign(box.style,{left:(rect.left-frame.left+camera.x*scale)+'px',top:(rect.top-frame.top+camera.y*scale)+'px',width:camera.width*scale+'px',height:camera.height*scale+'px'});joinedLayer.append(box);}for(const group of left.querySelectorAll('.outline-source.active-scene'))group.classList.remove('active-scene');for(const region of painting.result?.regions??[]){left.querySelector<HTMLElement>(`.outline-source[data-document="${region.document}"]`)?.classList.toggle('active-scene',region.active);if(!showSceneBounds)continue;const box=element('div','scene-boundary'+(region.active?' active':'')+(inspectorDraft?.request.highlightChunks?.includes(region.scene)?' connection-endpoint':''));const address=workspaceId?addressForChunk(workspaceSource(documentsForView()),workspaceId,region.scene):undefined;const caption=button(region.label+(showChunkStatus?' · Prepared for editing':''),()=>address?selectWorldMember(address):inspectChunk(region.scene),'Select chunk; drag to move, Shift-drag moves connected members together');caption.className='chunk-boundary-label';caption.style.pointerEvents='auto';if(address){caption.setAttribute('aria-pressed',String(editorSelection.world?.member===address.member&&editorSelection.world?.child===address.child));caption.onpointerdown=event=>startWorldDrag(event,address);}box.append(caption);if(address?.child){const parent={composition:address.composition,member:address.member},group=button('Group · '+address.member,()=>selectWorldMember(parent),'Select or drag the containing group; Shift-drag moves connected groups together');group.className='chunk-boundary-label';group.style.pointerEvents='auto';group.onpointerdown=event=>startWorldDrag(event,parent);box.append(group);}Object.assign(box.style,{left:(rect.left-frame.left+region.x*scale)+'px',top:(rect.top-frame.top+region.y*scale)+'px',width:region.width*scale+'px',height:region.height*scale+'px'});joinedLayer.append(box);}if(showSceneBounds&&workspaceId&&painting.result)renderWorldConnections(joinedLayer,worldControls(()=>model.interactionPreview()?.documents??documentsForView()),painting.result,{x:rect.left-frame.left,y:rect.top-frame.top,scale});const cameraOwner=painting.result?.camera&&outlineSceneOwners.get(painting.result.camera.scene);if(cameraOwner)left.querySelector<HTMLElement>(`.outline-source[data-document="${cameraOwner}"]`)?.classList.add('active-scene');updateRenderStatus();return;}
  }
  /** Explicit framing never changes the authored game camera or timeline. */
  async function focusArtwork(documentId:string,id:string){
    if(!navigable()||!playHost.hidden)return;
    stopFollowing();
    if(cameraPreview){cameraPreview=false;refreshViewportTools();refreshOptions();}
    const rootDocument=currentId;
    await draw();
    if(disposed||currentId!==rootDocument)return;
    let result=painting.result,a=resolvedArtwork(documentId,id);
    if(!a){
      const doc=documentsForView().find(d=>d.id===documentId&&d.kind==='composition'),at=doc&&result?.projectChunk?.((doc.value as ChunkDocument).scene,0,0);
      if(at){const scale=result?.workspaceScale??1;sequenceNav.x+=(at.x-canvas.width/2)/scale;sequenceNav.y-=(at.y-canvas.height/2)/scale;await draw();if(disposed||currentId!==rootDocument)return;result=painting.result;a=resolvedArtwork(documentId,id);}
    }
    const box=a?framingBounds(a):undefined;
    if(!box||box.width<=0||box.height<=0)return;
    const scale=result?.workspaceScale??1;
    const target={x:sequenceNav.x+(box.x+box.width/2-canvas.width/2)/scale,y:sequenceNav.y-(box.y+box.height/2-canvas.height/2)/scale,zoom:workspaceZoom(sequenceNav.zoom*Math.min(canvas.width/Math.max(80,box.width),canvas.height/Math.max(80,box.height))*.8)};
    if(reduced){Object.assign(sequenceNav,target);refreshViewportTools();void draw();}
    else focusMotion={from:{...sequenceNav},to:target,elapsed:0,document:currentId};
  }
  function fit(){stopFollowing();sequenceNav.zoom=1;sequenceNav.x=0;sequenceNav.y=0;refreshViewportTools();void draw();}
  function refreshViewportTools() {
    canvas.style.imageRendering=compareCanvas.style.imageRendering=pixelatedScaling?'pixelated':'auto';
    stage.classList.toggle('workspace-view',dynamicWorkspace());
    const zoomReadout=button(Math.round(sequenceNav.zoom*100)+'%',()=>fit(),'Fit (F)');zoomReadout.dataset.workspaceZoom='';
    const toggle=(text:string,on:boolean,act:()=>void,title?:string)=>{const item=button(text,act,title);item.className='toggle';item.setAttribute('aria-pressed',String(on));return item;};
    const follow=toggle('Follow camera',followCamera,()=>{followCamera=!followCamera;refreshViewportTools();rememberView();void draw();},'Keep the game camera centred with a margin during playback and scrubbing. Pan or zoom to stop following.');
    const objectBounds=toggle('Object outlines',showObjectOutlines,()=>{showObjectOutlines=!showObjectOutlines;try{localStorage.setItem('access-denied.editor.object-outlines',String(showObjectOutlines));}catch{/* optional preview preference */}refreshViewportTools();void draw();},'Show bounds of all visible objects; the selected outline remains visible');
    viewportTools.hidden=viewMenus.hidden=!navigable();if(!navigable())return;
    const boundaries=toggle('Chunk borders',showSceneBounds,()=>{showSceneBounds=!showSceneBounds;placeJoined();refreshViewportTools();});
    const statuses=toggle('Chunk status',showChunkStatus,()=>{showChunkStatus=!showChunkStatus;placeJoined();refreshViewportTools();},'Show editing preparation labels beside scene borders; runtime loading is shown in the Play outline');
    const look=toggle('Look through game camera',cameraPreview,()=>{cameraPreview=!cameraPreview;refreshViewportTools();refreshOptions();void draw();},'Camera preview looks through the authored game camera; the workspace keeps independent pan and zoom.');
    cameraMenu.panel.replaceChildren(look,...(cameraPreview?[]:[button('Locate camera',locateCamera,'Frame the game camera without changing its properties'),follow]));
    showMenu.panel.replaceChildren(boundaries,statuses,objectBounds,showSlot);
    if(cameraPreview){viewportTools.replaceChildren(button('Back to workspace',()=>{cameraPreview=false;refreshViewportTools();refreshOptions();void draw();}));return;}
    viewportTools.replaceChildren(button('−',()=>zoomTo(sequenceNav.zoom/1.25),'Zoom out'),zoomReadout,button('+',()=>zoomTo(sequenceNav.zoom*1.25),'Zoom in'),button('Frame',fit,'Frame the scene (F)'));
  }
  /** Creation stays beside the world; nothing is inserted until the complete draft applies. */
  function openNewScene() {
    const setup=config.newScene;if(!setup)return;const api=authoringApi(),where=setup.places(api);
    openInspector({title:'New chunk',action:'Create chunk',build:(body,form)=>{
      let name='New chunk',id='new-chunk',place=where.initial,preset='',idEdited=false;
      const slug=(text:string)=>text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      body.append(element('p','','Create a chunk source with a default starting state, then arrange and edit it in the world.'));
      form.text(body,'Name',name,v=>{name=v;if(!idEdited){id=slug(v);const input=body.querySelector<HTMLInputElement>('[aria-label="ID"]');if(input)input.value=id;}});
      form.text(body,'ID',id,v=>{id=v;idEdited=true;});form.select(body,'Place',where.places,place,v=>place=v);
      if(setup.presets){const picker=select([{value:'',label:'Empty chunk'},...setup.presets],preset,v=>preset=v);form.field(body,'Preset',picker);}
      return()=>{setup.create(api,id.trim(),name.trim(),place,preset||undefined);refresh();openScene(id.trim());};
    }});
  }
  /** Validation reasons for a refused deletion, in the terms of the editor. */
  function deletionProblem(problem: string, removed: AssetInstance[]) {
    const actors = removed.filter(node => { try { const e = config.registry.get(node.type); return ['Human', 'Animal', 'Robot'].includes(layerRole(node.type, e.label, e.category)); } catch { return false; } }).map(node => node.id);
    if (/Actor source\/artwork count mismatch/.test(problem) && actors.length) return `${actors.join(', ')} ${actors.length === 1 ? 'is a character' : 'are characters'} of this scene. Remove ${actors.length === 1 ? 'it' : 'them'} in Logic › Interactions & story first, or attach ${actors.length === 1 ? 'it' : 'them'} to something else.`;
    const missing = /Missing (manifest|device) artwork: (\S+)/.exec(problem);
    if (missing) return `${missing[2]} is used by ${missing[1] === 'device' ? 'a device' : 'the scene’s manifest (an exit, device or spawn)'} in Logic. Remove that use there first, or attach ${missing[2]} to something else.`;
    return `${problem}. Remove or move that use first (in Logic, or the scene’s exits).`;
  }
  /** Deletes the selection. When attached artwork would go with it, the inspector lists it and asks first. */
  function deleteSelected() {
    const doc = compositionDocument(), id = editorSelection.instance; if (!doc || !id) return;
    let ids: string[]; try { ids = model.removal(doc.id, id, true); } catch (error) { notice(message(error), true); return; }
    const remove = () => run(() => { model.remove(doc.id, id, true); if (editorSelection.instance === id) editorSelection.instance = ''; },true);
    if (ids.length === 1) { remove(); return; }
    // Attached pieces first (what the user may not expect to lose), then the piece's own parts.
    const nodes = flatten(doc.value as ChunkDocument).map(row => row.node), own = new Set<string>(), collect = (node: AssetInstance) => { own.add(node.id); node.children?.forEach(collect); }; collect(nodes.find(node => node.id === id)!);
    const others = [...ids.filter(other => !own.has(other)), ...ids.filter(other => own.has(other) && other !== id)].map(other => nodes.find(node => node.id === other)!), problem = model.trial(() => model.remove(doc.id, id, true));
    openInspector({title:`Delete ${id}?`,action:'Delete all',build:body=>{
      body.append(element('p','',`This also deletes ${others.length} other items attached to or contained in it:`));const list=element('ul');
      for(const node of others){let label=node.type;try{label=config.registry.get(node.type).label;}catch{}list.append(element('li','',`${node.id} · ${label}`));}body.append(list);
      if(problem)body.append(element('p','inspector-error',`It cannot be deleted yet: ${deletionProblem(problem,others)}`));
      return()=>{if(problem)throw Error(deletionProblem(problem,others));remove();};
    }});
  }
  const select_ = (id: string) => perfMeasure('editor.selection', () => withViewDocuments(() => { editorSelection.world=undefined;editorSelection.chunk=undefined;editorSelection.timeline=undefined;if(!id)revealed='';const resolved=sourceSelection(painting.result,id,viewCompositionDocument()?.id??currentId);editorSelection.document=resolved.document;editorSelection.instance=resolved.instance;if(painting.result?.sources?.[id])timelineView.collapsed.delete(editorSelection.instance); viewport.hoverId = ''; refreshRight(); updateOutlineSelection(); if (currentTimeline()) {refreshLeft();refreshTimeline();} void draw(); }));
  /**
   * Stage input: a left press on artwork selects it at once and drags it after a 3 px move; a left press on empty
   * space (the picture, the dark area around it or the comparison) deselects. Middle and right drag pan (right also
   * covers a pen's barrel button); one finger pans on empty space and two fingers pinch-zoom.
   */
  const disposeViewportInput=mountViewportInput({spatialFeedback,beginGesture:()=>{if(playing||animating){playing=false;animating=false;refreshOptions();}},focusArtwork:id=>{const source=painting.result?.sources?.[id];void focusArtwork(source?.document??compositionDocument()?.id??currentId,source?.instance??id);},manualNavigation:stopFollowing,get navigable(){return navigable;},get viewport(){return viewport;},get sequenceNav(){return sequenceNav;},get stage(){return stage;},get canvas(){return canvas;},get selectedId(){return editorSelection.instance;},get select_(){return select_;},get closePicker(){return closePicker;},get coordinates(){return coordinates;},get hitTest(){return hitTest;},cycleAt,listAt,get preview(){return painting.result;},get compositionDocument(){return compositionDocument;},get zoomTo(){return zoomTo;},get cameraPreview(){return cameraPreview;},get draw(){return draw;},get placeHover(){return placeHover;},get snap(){return snap;},get config(){return config;},get dragPreviewDirty(){return dragPreviewDirty;},set dragPreviewDirty(value){dragPreviewDirty=value;},get notice(){return notice;},get refreshOptions(){return refreshOptions;},get run(){return run;},get commitDrag(){return commitDrag;},get validateDrag(){return validateDrag;},get model(){return model;},get placeJoined(){return placeJoined;},get compareCanvas(){return compareCanvas;},get editInstance(){return editInstance;},get current(){return current;},get openPicker(){return openPicker;},get fit(){return fit;}});
  const disposeNumericScrubbing=mountNumericScrubbing(root,{
    begin:label=>{numericSourceVersion=model.sourceVersion;const edit=model.beginInteraction(label);playing=false;animating=false;numericScrubbing=true;updateTime();return{commit:edit.commit,cancel:edit.cancel};},
    changed:()=>{numericScrubbing=false;const sourceChanged=model.sourceVersion!==numericSourceVersion;if(sourceChanged){thumbnailDocuments=undefined;thumbnails?.invalidate();}refresh();if(sourceChanged&&!picker.hidden)renderPicker();},
    error:error=>notice(message(error),true),
  });
  cancelNumericScrub=disposeNumericScrubbing.cancel;
  const unload = (event: BeforeUnloadEvent) => { rememberView();if (model.dirty()) { event.preventDefault(); event.returnValue = ''; } };
  const keyboard = (event: KeyboardEvent) => {
    // Also when focus fell back to the page after a panel re-rendered under the pointer.
    const focused = document.activeElement; if (!(event.ctrlKey || event.metaKey) || !root.isConnected || focused && focused !== document.body && !root.contains(focused)) return;
    if (event.key === ' ' && root.dataset.tool === 'scene') { event.preventDefault(); toggleMaximized(); return; }
    const tag = (event.target as HTMLElement).tagName; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && event.key.toLowerCase() !== 's') return;
    if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    else if (event.key.toLowerCase() === 'z') { event.preventDefault(); run(() => event.shiftKey ? model.redo() : model.undo()); }
    else if (event.key.toLowerCase() === 'y') { event.preventDefault(); run(() => model.redo()); }
    else if (event.key.toLowerCase() === 'd' && editorSelection.instance && current()?.kind === 'composition' && playHost.hidden) { event.preventDefault(); duplicateSelected(); }
  };
  /** Single keys in the Scene view (Delete, H for hack vision…), unless the user is typing in a field or an inspector field is active. */
  const shortcuts = (event: KeyboardEvent) => {
    if (!root.isConnected) return;
    if (searchUi.open_) { if (event.key === 'Escape') { event.preventDefault(); searchUi.close(); } return; }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') { event.preventDefault(); searchUi.open(); return; }
    if (event.altKey && !event.ctrlKey && !event.metaKey && /^[1-5]$/.test(event.key)) { event.preventDefault(); openWorkspace((['layout', 'animate', 'logic', 'world', 'labs'] as const)[Number(event.key) - 1]); return; }
    if (event.key === 'Escape' && !pickList.hidden) { pickList.hidden = true; return; }
    if(group==='layout'&&playHost.hidden&&root.isConnected&&current()?.kind==='composition'){const action=animationShortcut(event);if(action&&(action==='toggle'||!('boundary'in action)||sequence())){event.preventDefault();if(action==='toggle')toggleAnimation();else seekTime('boundary'in action?(action.boundary==='start'?0:sequence()!.duration):'frames'in action?(Math.round(time*60)+action.frames)/60:time+action.seconds);return;}}
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat || group !== 'layout' || !root.isConnected) return;
    const target = event.target as HTMLElement; if (target.closest('input, textarea, select, dialog, [contenteditable=""], [contenteditable="true"]')) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && editorSelection.instance && current()?.kind === 'composition' && playHost.hidden) { event.preventDefault(); deleteSelected(); return; }
    if (playHost.hidden && current()?.kind === 'composition') {
      if (event.key === 'f' || event.key === 'F' && !event.shiftKey) { event.preventDefault(); frameSelection(); return; }
      if (event.key === 'A' && event.shiftKey) { event.preventDefault(); openPicker(); return; }
      if (event.key === 'Escape' && (editorSelection.instance || editorSelection.world || editorSelection.chunk || editorSelection.timeline)) { event.preventDefault(); select_(''); return; }
    }
    const control = (config.environmentControls ?? []).find(c => c.kind === 'boolean' && c.shortcut?.toLowerCase() === event.key.toLowerCase()); if (!control) return;
    event.preventDefault(); environment[control.key] = !environment[control.key]; refreshOptions(); void draw();
  };
  const closeMenu = (event: Event) => {
    for (const menu of root.querySelectorAll<HTMLDetailsElement>('details.menu[open],details.ov-menu[open]')) if (!menu.contains(event.target as Node) || (event.target as HTMLElement).closest('.menu-items button')) menu.open = false;
    if (!pickList.hidden && !pickList.contains(event.target as Node) && performance.now() - pickListOpened > 250) pickList.hidden = true;
  };
  window.addEventListener('beforeunload', unload);window.addEventListener('error', onWindowError);window.addEventListener('unhandledrejection', onRejection);window.addEventListener('hashchange',navigateEditorLink); document.addEventListener('keydown', keyboard); document.addEventListener('keydown', shortcuts); document.addEventListener('click', closeMenu);
  let previous = performance.now(), frameId = 0;
  /** The frame loop: waits for the first document load, and one failing frame never stops it. */
  const tick = (now: number) => { if (disposed) return; frameId = requestAnimationFrame(tick); if (!viewReady) { previous = now; return; } try { step(now); } catch (error) { reportError(error, 'Frame loop'); } };
  const step = (now: number) => { const delta = Math.min(0.1, (now - previous) / 1000); previous=now;if(focusMotion){const m=focusMotion;if(m.document!==currentId)focusMotion=undefined;else{m.elapsed+=delta;const t=Math.min(1,m.elapsed/.32),ease=t*t*(3-2*t);sequenceNav.x=m.from.x+(m.to.x-m.from.x)*ease;sequenceNav.y=m.from.y+(m.to.y-m.from.y)*ease;sequenceNav.zoom=Math.exp(Math.log(m.from.zoom)+(Math.log(m.to.zoom)-Math.log(m.from.zoom))*ease);if(t===1){focusMotion=undefined;refreshViewportTools();}void draw();}}if(now-lastViewSample>=500){lastViewSample=now;rememberView();}updateRenderStatus();if(dragPreviewDirty){dragPreviewDirty=false;void draw();}const seq=sequence(); if (animating && !seq && group === 'layout' && current()?.kind === 'composition') { time += delta*playbackSpeed; updateTime();void draw(true); } if (playing && seq && group==='layout' && playHost.hidden) { const end = loop ? loopTo || seq.duration : seq.duration; time += delta*playbackSpeed; if (time >= end) { if (loop) time = loopFrom + (time - loopFrom) % Math.max(1 / 60, end - loopFrom); else { time = seq.duration; playing = false; refreshTimeline(); if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='camera')refreshRight(); } } updateTime(); void draw(playing); } };
  frameId = requestAnimationFrame(tick); void load();
  const disposePerformance = mountPerformancePanel(root, () => ({ editor: true, scene: sceneId(), selected: editorSelection.instance, zoom: sequenceNav.zoom, comparison: compareId }), new URLSearchParams(location.search).has('perf')||!!linkQuery?.has('profile-editor'));
  return { model, openScene, reload: load, save, dispose() { rememberView();disposed = true;viewportObserver.disconnect();disposeNumericScrubbing();chunkInspectorHandle?.();cancelWorldDrag?.();disposeViewportInput();tidy.disconnect();searchUi.dispose();spatialHandles.dispose();timelineGrid?.dispose(); disposePerformance(); playHandle?.(); playHandle = undefined; cancelAnimationFrame(frameId); cleanupWorld?.(); cleanupAssets?.(); disposeInspector(); thumbnails?.dispose(); workbenches.forEach(item => item.dispose?.()); window.removeEventListener('beforeunload', unload);window.removeEventListener('error', onWindowError);window.removeEventListener('unhandledrejection', onRejection);window.removeEventListener('hashchange',navigateEditorLink); document.removeEventListener('keydown', keyboard); document.removeEventListener('keydown', shortcuts); document.removeEventListener('click', closeMenu); root.remove(); } };
}
