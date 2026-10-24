import {hitTestArtwork,sourceSelection,createSelection} from './selection';
import {createPreviewState,createPreviewRenderer} from './preview-integration';
import {createInspector} from './inspector';
import {createViewportState,mountViewportInput} from './viewport-input';
import {canvasPoint} from '../art/core/geometry';
import {zoomWorkspace} from './viewport-navigation';
import {element,button,select,label,createFieldControls} from './controls';
import {renderTimelineInspector} from './temporal-inspector';
import {outlineDocuments} from './outline-documents';
import {animationShortcut} from './animation-shortcuts';
import {mountTimelineGrid,moveKey,type TimelineSelection,type TimelineViewState} from './timeline-view';
import {sequenceProgram} from '../art/core/sequence';
import {perfMeasure,perfBegin,perfEnd} from '../runtime/diagnostics/performance';
import {mountPerformancePanel} from '../runtime/diagnostics/performance-panel';

/** Local static/animated composition editor. Drawing belongs to the injected game preview. */
import {type Composition,type Instance,type Field,type Value,type Properties} from '../art/core/composition';
import {evaluateTimeline,type TimelineProgram,type TimelineFrame,type Sequence,type Target,type Keyframe} from '../art/core/timeline';
import { composerStyles } from './styles';
import { createFrame, frameStyles, sectionNavigator } from './frame';

import {mountAssetBrowser,type AssetBrowserSession,type AssetEntry,type AssetPreset} from './asset-browser';
import { createThumbnails } from './asset-thumbnails';
import { PRESETS_DOCUMENT, presetId, presetProps, presetsFor, type KitPreset, type KitPresets } from './kit-presets';

import { createDocumentBundle, readDocumentBundle } from './document-bundle';
import { KIND_HINTS, LAYER_ROLES, layerRole } from './layer-roles';
import { chipStyles } from './kind-chips';
import {LAYER_HINTS,LAYER_LABELS,VISUAL_LAYERS,isPlayerRow,layerRows} from './layer-stack';
import type { Layer } from '../art/core/composition';

import {ComposerModel} from './composer-model';
import type {EditorDocument,PreviewRequest,EnvironmentControl,WorkbenchContext,WorkbenchHandle,ComposerConfig,WorkbenchConfig} from './contracts';
const copy = <T>(value: T): T => structuredClone(value);
/** The outline's mark for a level barrier (a padlock), so barriers and their Access rules are easy to find. */
const BARRIER_ICON = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const flatten = (doc: Composition) => { const list: { node: Instance; depth: number }[] = []; const visit = (nodes: Instance[], depth: number) => nodes.forEach(node => { list.push({ node, depth }); visit(node.children ?? [], depth + 1); }); visit(doc.instances, 0); return list; };
const message = (e: unknown) => e instanceof Error ? e.message : String(e);

export function mountComposer(host: HTMLElement, config: ComposerConfig) {
  const painting=createPreviewState();

  const viewport=createViewportState();

  const {numberInput,fieldInput}=createFieldControls((text,error)=>notice(text,error));
  const model = new ComposerModel(config.registry, { destinations: config.destinations, clips: config.clips, motionTracks: config.motionTracks }, config.validateDocument, config.projections,config.destinationsFor,config.validationInputs);
  let viewDocuments: EditorDocument[] | undefined;
  const documentsForView = () => viewDocuments ?? model.list();
  const withViewDocuments = <T,>(work: () => T): T => {
    if (viewDocuments) return work();
    viewDocuments = model.list();
    try { return work(); } finally { viewDocuments = undefined; }
  };
  const root = element('section', 'scene-composer'); root.setAttribute('aria-label', 'Scene and animation composer');
  const style = element('style'); style.textContent = composerStyles + frameStyles + chipStyles; root.append(style);
  const header = element('header'), status = element('div', 'status', 'Loading authoring documents…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const workspace = element('div', 'workspace'), left = element('aside'), center = element('div', 'preview-column'), right = element('aside');
  left.setAttribute('aria-label', 'Scene outline'); right.setAttribute('aria-label', 'Inspector');
  /** Drag handles on the panels' inner edges. Widths are a per-browser convenience (localStorage), never source. */
  function panelHandles() {
    const sides = [{ side: 'left', variable: '--left-w', min: 160, max: 560 }, { side: 'right', variable: '--right-w', min: 220, max: 680 }] as const;
    return sides.map(({ side, variable, min, max }) => {
      const handle = element('div', `panel-handle ${side}`), key = `composer.panel.${side}`;
      handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical'); handle.title = 'Drag to resize; double-click to reset';
      const apply = (width: number | null) => { if (width === null) workspace.style.removeProperty(variable); else workspace.style.setProperty(variable, `${Math.round(Math.min(max, Math.max(min, width)))}px`); };
      try { const saved = Number(localStorage.getItem(key)); if (saved) apply(saved); } catch { /* storage unavailable: default widths */ }
      handle.onpointerdown = event => {
        if (event.button !== 0) return; event.preventDefault(); handle.setPointerCapture(event.pointerId); handle.classList.add('dragging');
        const move = (e: PointerEvent) => { const box = workspace.getBoundingClientRect(); apply(side === 'left' ? e.clientX - box.left : box.right - e.clientX); };
        const up = () => { handle.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); try { localStorage.setItem(key, workspace.style.getPropertyValue(variable).replace('px', '')); } catch { /* ignore */ } void draw(); };
        handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
      };
      handle.ondblclick = () => { apply(null); try { localStorage.removeItem(key); } catch { /* ignore */ } void draw(); };
      return handle;
    });
  }
  const options = element('div', 'preview-options'), stageWrap = element('div', 'stage-wrap'), stage = element('div', 'preview-stage'), canvas = element('canvas'), previewError = element('div', 'preview-error');
  const joinedLayer = element('div', 'joined-tags'); joinedLayer.setAttribute('aria-label', 'Joined scenes');
  const viewportTools = element('div', 'viewport-tools'), hoverBox = element('div', 'hover-box'); viewportTools.setAttribute('role', 'group'); viewportTools.setAttribute('aria-label', 'Preview zoom'); hoverBox.hidden = true;
  const picker = element('div', 'add-picker'); picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Add artwork'); picker.hidden = true;
  const baseWidth = config.viewport?.width ?? 960, baseHeight = config.viewport?.height ?? 540;
  canvas.width = baseWidth; canvas.height = baseHeight; canvas.setAttribute('aria-label', 'Game renderer preview. Click artwork to select it, click empty space to deselect, drag the selected artwork to move it, drag elsewhere to pan, Ctrl+wheel or pinch to zoom, Delete removes the selection.'); canvas.tabIndex = 0; previewError.hidden = true;
  const timelineHost = element('section', 'timeline'); timelineHost.setAttribute('aria-label', 'Animation timeline');
  const panelSwitch = element('div', 'panel-switch'); panelSwitch.setAttribute('role', 'group'); panelSwitch.setAttribute('aria-label', 'Editor panel');
  const tools = element('nav', 'tools'); tools.setAttribute('aria-label', 'Editor tools');
  const compact = window.matchMedia('(max-width: 760px)');
  let layerQuery = '', layerSort: 'kind' | 'order' = 'kind'; const roleOpen = new Map<string, boolean>();
  /** The selection the outline last unfolded for; a section folded after that stays folded. */
  let revealed = '';
  /** The outline's eyes: objects hidden in the editor preview, per composition document. View state only. */
  const hiddenByDocument = new Map<string, Set<string>>();
  const hiddenIn = (id: string | undefined) => { if (!id) return new Set<string>(); let set = hiddenByDocument.get(id); if (!set) hiddenByDocument.set(id, set = new Set()); return set; };
  let moreOpen = false, animating = false, ambientLabel: HTMLElement | undefined;
  const inspector=createInspector();
  const showPanel = (panel: 'layers' | 'properties') => { root.dataset.panel = panel; for (const item of panelSwitch.children) item.setAttribute('aria-pressed', String((item as HTMLElement).dataset.panel === panel)); };
  for (const [panel, text] of [['layers', 'Outline'], ['properties', 'Inspector']] as const) { const tab = button(text, () => showPanel(panel)); tab.dataset.panel = panel; panelSwitch.append(tab); }
  canvas.style.setProperty('--ratio', String(canvas.width / canvas.height)); showPanel('layers');
  const playHost = element('div', 'stage-play'); playHost.hidden = true; playHost.setAttribute('aria-label', 'Play session');
  const compareCanvas = element('canvas'); compareCanvas.hidden = true; compareCanvas.className = 'compare'; compareCanvas.setAttribute('aria-label', 'Comparison preview, read-only');
  stage.append(canvas, compareCanvas); const renderStatus=element('output','render-status');renderStatus.setAttribute('aria-label','Preview render rate');stageWrap.append(stage,playHost,joinedLayer,hoverBox,viewportTools,picker,previewError,renderStatus); center.append(options, stageWrap, timelineHost); workspace.append(center, panelSwitch, left, right, ...panelHandles()); header.append(tools, status); root.append(header, workspace); host.append(root);
  /** The panel named in the URL at startup; the URL is only rewritten once it has been opened. */
  // An editor link: `#characters` opens a panel; `#scene=downtown-next&compare=downtown&panel=characters` also opens a scene.
  const linkQuery = location.hash.includes('=') ? new URLSearchParams(location.hash.slice(1)) : undefined;
  const linkedPanel = linkQuery ? linkQuery.get('panel') ?? '' : decodeURIComponent(location.hash.slice(1)); let linked = false;
  let compareId = '', currentId = '', sequenceId = '', time = 0, playing = false, loop = false, loopFrom = 0, loopTo = 0, reduced = false, overlays = true, snap = 1, saving = false, disposed = false;

  /** Editor-only framing: renderScale zoom, native camera pan and a crop to the artwork's height. Never saved. */
  const sequenceNav={zoom:1,x:0,y:0};let cameraPreview=false,showObjectOutlines=false,showSceneBounds=true,renderWindow=performance.now(),renderFps=0,statusUpdatedAt=0;
  try{showObjectOutlines=localStorage.getItem('access-denied.editor.object-outlines')==='true';}catch{/* optional preview preference */}
  let viewZoom = compact.matches ? 2 : 1,crop = true;



  let timeLabel: HTMLElement | undefined, transportPlay:HTMLButtonElement|undefined, timelineGrid:ReturnType<typeof mountTimelineGrid>|undefined;
  const editorSelection=createSelection();
  const timelineView:TimelineViewState={zoom:1,collapsed:new Set(),scrollX:0,scrollY:0};let timelineCollapsed=false,timelineHeight=300;let playbackSpeed=1,dragPreviewDirty=false;
  const speedControl=()=>select([.25,.5,1,1.5,2,4].map(value=>({value:String(value),label:value+'×'})),String(playbackSpeed),value=>playbackSpeed=Number(value));
  const environment: Record<string, string | number | boolean> = { cameraX: 0, zoom: 1, ...config.initialEnvironment };
  let cleanupWorld: void | (() => void);
  let cleanupAssets: void | (() => void); const assetSession: AssetBrowserSession = {};
  const assetHost = element('details', 'asset-browser tool-panel'); assetHost.dataset.tool = 'assets'; assetHost.append(element('summary', '', 'Artwork library')); const assetPanel = element('div'); assetHost.append(assetPanel); if (config.assetPreview) root.insertBefore(assetHost, workspace);
  const mapHost = element('details', 'world-map tool-panel'); mapHost.dataset.tool = 'world-map'; mapHost.append(element('summary', '', 'City map')); const mapPanel = element('div'); mapHost.append(mapPanel); if (config.worldPanel) root.insertBefore(mapHost, workspace);
  /** Artwork pictures for the Add picker and the Library, drawn by the same isolated game preview. */
  let thumbnailDocuments: EditorDocument[] | undefined;
  const thumbnails = config.assetPreview ? createThumbnails((target, entry) => config.assetPreview!(target, entry, entry.preview === 'standalone' ? undefined : entry.usages.find(usage => !usage.scene.startsWith('sequence-')) ?? entry.usages[0], thumbnailDocuments ??= model.list(), { time: 0, reduced: true, environment: { ...config.initialEnvironment, renderScale: 1 } })) : undefined;
  const workbenches = (config.workbenches ?? []).map(workbench => {
    const details = element('details', 'workbench-screen tool-panel'), panel = element('section'); details.dataset.workbench = details.dataset.tool = workbench.id; details.append(element('summary', '', workbench.title), panel); if (workbench.beside) { details.classList.add('stage-panel'); workspace.append(details); } else root.insertBefore(details, workspace);
    return { config: workbench, details, panel, dispose: undefined as WorkbenchHandle | undefined, documentsVersion: '', scene: '', autostart: false };
  });
  /**
   * Scene is the editor itself: outline, viewport and an inspector for the selection. Logic lists all of
   * the scene's logic at once and Play runs it; both act on the scene chosen in the header. Library,
   * World and Labs are not tied to a scene. The header has one tab for the scene (Layout and Logic are its two views,
   * chosen in the row below beside the scene picker) and one each for Library, World and Labs.
   */
  const groups = [
    { id: 'layout', label: 'Scene', title: 'Edit this scene: select artwork to change how it looks and what it does' },
    { id: 'logic', label: 'Logic', title: 'All of this scene’s interactions, dialogue, devices and wiring as lists' },
    { id: 'library', label: 'Library', title: 'Every piece of artwork, independent of scenes' },
    { id: 'world', label: 'World', title: 'The city map, travel, the opening and everything shared between scenes' },
    { id: 'labs', label: 'Labs', title: 'Developer test beds outside the scene workflow' },
  ] as const;
  type Group = typeof groups[number]['id'];
  const panelGroup = (item: WorkbenchConfig): Group => item.area === 'scene' ? 'logic' : item.area ?? 'library';
  const panels = [...(config.assetPreview ? [{ details: assetHost, label: 'Artwork', title: 'Artwork library', group: 'library' as Group }] : []), ...(config.worldPanel ? [{ details: mapHost, label: 'City map', title: 'City map · open a place to edit it', group: 'world' as Group }] : []),
    // Wiring panels follow the logic panels under Logic.
    // Play is not a panel: it runs on the Scene stage in place of the canvas.
    ...[...workbenches].filter(item => !(item.config.area === 'scene' && item.config.mode === 'play')).sort((a, b) => Number(a.config.mode === 'wiring') - Number(b.config.mode === 'wiring')).map(item => ({ details: item.details, label: item.config.label ?? item.config.title.split(' · ')[0], title: item.config.title, group: panelGroup(item.config) }))];
  const chosen = new Map<Group, HTMLDetailsElement>(); let group: Group = 'layout';
  const subtools = element('nav', 'subtools'); subtools.setAttribute('aria-label', 'Panels in this mode'); root.insertBefore(subtools, header.nextSibling);
  /** The scene picker, filled by refreshHeader; it leads the second row while the Scene tab is open. */
  const sceneContext = element('div', 'scene-context');
  const sceneGroup = (id: Group) => id === 'layout' || id === 'logic';
  let sceneView: 'layout' | 'logic' = 'layout';
  const showLayout = () => { group = 'layout'; panels.forEach(item => item.details.open = false); refreshTools(); };
  const openPanel = (details: HTMLDetailsElement) => { const item = panels.find(p => p.details === details); if (!item) return; stopPlay(); group = item.group; chosen.set(group, details); details.open = true; refreshTools(); };
  /** Scene toolbar's Play: open the Play panel and start the scene immediately. */
  const playWorkbench = () => workbenches.find(item => item.config.area === 'scene' && item.config.mode === 'play');
  const canPlay = () => { const item = playWorkbench(), scene = sceneId(); return !!item && !!scene && (!item.config.supports || item.config.supports(scene, documentsForView())); };
  /** Play runs the game on the Scene stage, in place of the canvas; Stop returns to editing at the same spot. */
  let playHandle: WorkbenchHandle | undefined;
  const playScene = () => {
    const item = playWorkbench(), scene = sceneId(); if (!item || !canPlay()) return; stopPlay(); animating = false; showLayout();
    playHost.hidden = false; stage.hidden = true; viewportTools.hidden = true; root.dataset.playing = '';
    item.config.showScene?.(scene, documentsForView());
    try { playHandle = item.config.mount(playHost, { documents: documentsForView(), openScene, openInstance, scene, autostart: true, ...(item.config.authoring ? { authoring: authoringApi() } : {}) }); }
    catch (error) { playHost.replaceChildren(element('p', 'error', `Play unavailable: ${message(error)}`)); }
    refreshOptions();
  };
  function stopPlay() {
    if (playHost.hidden) return; playHandle?.(); playHandle = undefined; playHost.replaceChildren(); playHost.hidden = true; stage.hidden = false; delete root.dataset.playing;
    refreshViewportTools(); refreshOptions(); void draw();
  }
  const showGroup = (id: Group) => { if (id === 'layout') { showLayout(); return; } if (id === 'logic' && !panels.some(p => p.group === 'logic')) { showLayout(); return; } const target = chosen.get(id) ?? panels.find(p => p.group === id)?.details; if (target) openPanel(target); };
  function refreshTools() {
    const active = panels.find(item => item.details.open), beside = !!active?.details.classList.contains('stage-panel');
    // The open panel is in the URL (#style-frames, #characters, …) so it can be linked and survives reloads.
    const hash = active?.details.dataset.tool ? `#${active.details.dataset.tool}` : ''; if (linked && location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
    root.dataset.tool = active && !beside ? active.details.dataset.tool ?? 'scene' : 'scene'; root.dataset.group = group; if (beside) root.dataset.stagePanel = active!.details.dataset.tool!; else delete root.dataset.stagePanel;
    if (sceneGroup(group)) sceneView = group as 'layout' | 'logic';
    tools.replaceChildren();
    for (const item of groups) {
      if (item.id === 'logic' || item.id !== 'layout' && !panels.some(p => p.group === item.id)) continue;
      const scene = item.id === 'layout', tab = button(item.label, () => showGroup(scene ? sceneView : item.id), scene ? 'Edit the scene chosen in the row below: its layout and its logic' : item.title);
      tab.dataset.group = item.id; tab.setAttribute('aria-pressed', String(scene ? sceneGroup(group) : item.id === group)); tools.append(tab);
    }
    const members = panels.filter(p => p.group === group); subtools.replaceChildren();
    if (sceneGroup(group)) {
      subtools.hidden = false; subtools.append(sceneContext);
      if (panels.some(p => p.group === 'logic')) {
        const views = element('div', 'scene-views'); views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'Scene view');
        for (const item of groups.filter(g => sceneGroup(g.id))) { const tab = button(item.id === 'layout' ? 'Layout' : item.label, () => showGroup(item.id), item.title); tab.dataset.group = item.id; tab.setAttribute('aria-pressed', String(item.id === group)); views.append(tab); }
        subtools.append(views);
      }
    } else subtools.hidden = members.length < 2;
    if (group !== 'layout' && members.length > 1 || group === 'logic') for (const item of members) { const tab = button(item.label, () => openPanel(item.details), item.title); tab.dataset.tool = item.details.dataset.tool; tab.setAttribute('aria-pressed', String(item.details.open)); subtools.append(tab); }
  }
  const sceneName = (scene:string)=>{const names:Record<string,string>={'sequence-title':'Title','sequence-opening':'Opening glide','sequence-intro':'Act I cinematic','sequence-act2':'Act II cinematic','sequence-taxi':'Taxi flight'};if(names[scene])return names[scene];const doc=documentsForView().find(d=>d.id.startsWith('authored.')&&d.kind==='scene'&&(d.value as {id?:string}).id===scene);return doc?(doc.value as {name:string}).name:config.sceneLabel?.(scene)??scene;};
  const sceneId = () => { const doc = compositionDocument(); return doc ? (doc.value as Composition).scene : ''; };
  const openInstance = (document: string, instance: string) => { currentId = document; editorSelection.document=''; editorSelection.instance = instance; playing = false; syncSequence(); showLayout(); showPanel('properties'); refresh(); };
  function emptyState(item: WorkbenchConfig, scene: string) {
    const box = element('div', 'empty-state'); box.append(element('h2', '', item.title.split(' · ')[0]), element('p', '', item.unsupported ?? `${scene ? sceneName(scene) : 'This document'} has nothing to edit here yet.`));
    const others = documentsForView().filter(doc => doc.kind === 'composition' && item.supports!((doc.value as Composition).scene,documentsForView()));
    if (others.length) { box.append(element('p', 'muted', 'Available for')); const row = element('div', 'row'); for (const doc of others) row.append(button(sceneName((doc.value as Composition).scene), () => openDocument(doc.id))); box.append(row); }
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
  const refreshWorkbench = (item: typeof workbenches[number], changed = false) => {
    if (!item.details.open) { item.dispose?.(); item.dispose = undefined; return; }
    const documents = documentsForView(), relevant = item.config.documentIds ? documents.filter(doc => item.config.documentIds!.includes(doc.id)) : documents;
    const version = item.config.documentDependent ? JSON.stringify(relevant) : '', scene = sceneId(), sceneBound = item.config.area === 'scene';
    if (sceneBound && item.dispose && item.scene !== scene) { item.dispose(); item.dispose = undefined; }
    else if (changed && item.config.documentDependent && version !== item.documentsVersion && item.dispose) {
      if (item.dispose.refresh) { item.documentsVersion = version; item.dispose.refresh(); }
      else { item.dispose(); item.dispose = undefined; }
    }
    if (item.details.open && !item.dispose) {
      item.documentsVersion = version; item.scene = scene;
      if (sceneBound && item.config.supports && !item.config.supports(scene,documents)) { item.panel.replaceChildren(emptyState(item.config, scene)); item.dispose = (() => item.panel.replaceChildren()) as WorkbenchHandle; return; }
      if (sceneBound) item.config.showScene?.(scene,documents);
      const autostart = item.autostart; item.autostart = false;
      try { item.dispose = mountWorkbench(item, { documents, openScene, openInstance, ...(sceneBound ? { scene } : {}), ...(autostart ? { autostart } : {}), ...(item.config.authoring ? { authoring: authoringApi() } : {}) }); }
      catch (error) { item.panel.replaceChildren(element('p', 'error', `Workbench unavailable: ${message(error)}`)); }
    }
  };
  function authoringApi(): NonNullable<WorkbenchContext['authoring']> {
    return { get: (id: string) => model.get(id), edit: (id: string, label: string, value: unknown) => run(() => model.edit(id, label, () => value)),
      editDocuments: (changes: { id: string; value: unknown }[], label: string) => run(() => model.importDocuments(changes, label)),
      undo: () => run(() => model.undo()), redo: () => run(() => model.redo()), save,
      reload: async () => { if (!model.dirty() || window.confirm('Discard all unsaved edits and reload source? Download or export first to keep them.')) await load(); },
      dirty: (id: string) => model.dirty(id) };
  }
  /** One panel at a time: opening any closes the others. */
  const closeOthers = (details: HTMLDetailsElement) => { if (details.open) panels.forEach(other => { if (other.details !== details) other.details.open = false; }); };
  workbenches.forEach(item => item.details.ontoggle = () => { closeOthers(item.details); refreshWorkbench(item); refreshTools(); });
  assetHost.ontoggle = () => { closeOthers(assetHost); refreshLibrary(); refreshTools(); };
  mapHost.ontoggle = () => { closeOthers(mapHost); refreshMap(); refreshTools(); };
  refreshTools();
  const notice = (text: string, error = false) => { status.textContent = text; status.title = text; status.className = 'status' + (error ? ' error' : ''); };
  const run = (action: () => void) => perfMeasure('editor.command', () => { try { notice(''); perfMeasure('editor.action', action); thumbnailDocuments = undefined; thumbnails?.invalidate(); refresh(); if (!picker.hidden) renderPicker(); } catch (e) { notice(message(e), true); } });
  const current = () => currentId ? model.get(currentId) : undefined;
  /** The document an open panel edits (Export/Import JSON), otherwise the current composition. */
  const activeDocument = () => { const id = workbenches.find(item => item.details.open)?.config.primaryDocumentId; return id && documentsForView().some(doc => doc.id === id) ? model.get(id) : current(); };
  const currentTimeline = () => { const doc = current(); return doc?.kind === 'composition' && (doc.value as Composition).sequence ? sequenceProgram({[doc.id]:doc.value as Composition}) : undefined; };
  const sequence = () => currentTimeline()?.sequences.find(s => s.id === sequenceId);
  const evaluationContext = () => { const base = model.timelineContext(); return config.timelineContext?.(base, { time, reduced, sequenceId, environment: { ...environment }, viewport: { width: canvas.width, height: canvas.height }, timeline: currentTimeline() }) ?? base; };
  const viewCompositionDocument = () => { const doc = current(); return doc?.kind === 'composition'?doc:undefined; };
  const compositionDocument = () => editorSelection.document ? model.get(editorSelection.document) : viewCompositionDocument();
  const selected = () => { const doc = compositionDocument(); return doc ? flatten(doc.value as Composition).find(x => x.node.id === editorSelection.instance)?.node : undefined; };
  const editInstance = (name: string, action: (node: Instance) => void) => run(() => { const doc = compositionDocument(); if (!doc || !editorSelection.instance) return; model.updateInstance(doc.id, editorSelection.instance, name, action); });
  const editTimeline = (name: string, action: (doc: TimelineProgram) => void) => { playing = false; run(() => model.edit(currentId, name, value => { const composition=value as Composition,program=sequenceProgram({[currentId]:composition});action(program);const {composition:reference,...sequence}=program.sequences[0];composition.sequence=sequence;return composition; })); };
  async function api(path: string, body?: unknown) {
    if (!config.api) throw new Error('This browser editor has no repository write service. Download edits instead.');
    const response = await fetch(config.api.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-authoring-token': config.api.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit' });
    const value = await response.json(); if (!response.ok) throw new Error(response.status === 409 ? `Source changed outside the editor. Pending edits are kept. Export them or reload. ${value.error ?? ''}` : value.error ?? `Authoring service returned ${response.status}`); return value;
  }
  /** Opens the panel named in the URL once, on the first load. */
  /** A link can open a scene (`#scene=downtown-next`), optionally beside another (`&compare=downtown`), once on load. */
  let sceneLinked = false;
  function openLinkedScene() { if (sceneLinked) return; sceneLinked = true; const scene = linkQuery?.get('scene'); if (scene) openScene(scene, linkQuery!.get('compare') ?? undefined); }
  function openLinkedPanel() { if (linked) return; linked = true; const tool = linkedPanel; const target = tool && panels.find(p => p.details.dataset.tool === tool); if (target) openPanel(target.details); }
  async function load() {
    playing = false;
    try {
      const documents = config.api ? await api('/documents') as EditorDocument[] : copy(config.documents ?? []); model.load(documents); thumbnailDocuments = undefined; thumbnails?.invalidate();
      if (!documents.some(d => d.id === currentId)) currentId = documents.find(d => d.kind === 'composition')?.id ?? documents[0]?.id ?? '';
      editorSelection.instance = ''; editorSelection.document=''; syncSequence(); refresh(); openLinkedScene(); openLinkedPanel(); notice(documents.length ? config.api ? 'Source documents loaded. Edits stay local until Save.' : '' : 'No authoring documents are available.');
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
  function openDocument(id: string) { return perfMeasure('editor.scene-switch', () => { if(id!==currentId){compareId='';stopPlay();painting.workspaceAnchor=undefined;sequenceNav.x=0;sequenceNav.y=0;sequenceNav.zoom=1;} currentId = id; editorSelection.document=''; editorSelection.instance = ''; editorSelection.timeline=undefined;animating=false;playing = false; time = 0; syncSequence(); refresh(); }); }
  function openScene(scene: string, compare?: string) { const doc = documentsForView().find(d => d.kind === 'composition' && (d.value as Composition).scene === scene); if (doc) { if (!root.dataset.stagePanel) showLayout(); openDocument(doc.id); if (compare) { compareId = compare; refreshOptions(); void draw(); } } else notice(`Scene ${scene} has no editable composition in this session.`, true); }
  function refreshHeader() {
    const brand = element('div', 'brand'); brand.append(element('strong', '', 'ACCESS DENIED'), element('span', '', config.api ? 'Composer' : 'Editor')); header.replaceChildren(brand, tools);
    const actions = element('div', 'actions'), menu = element('details', 'menu'), menuItems = element('div', 'menu-items'); menu.append(element('summary', '', 'More'), menuItems);
    const docs = documentsForView(), chooser = element('select', 'document-picker'); chooser.setAttribute('aria-label', 'Scene');
    const unsaved = (doc: EditorDocument) => model.dirty(doc.id) || doc.kind === 'composition' && (config.sceneDocuments?.((doc.value as Composition).scene,docs) ?? []).some(id => model.dirty(id));
    const sequenceDoc = (doc: EditorDocument) => doc.kind === 'composition' && !!(doc.value as Composition).sequence;
    const label = (doc: EditorDocument, text?: string) => `${unsaved(doc) ? '● ' : ''}${text ?? sceneName((doc.value as Composition).scene)}`;
    const option = (doc: EditorDocument, text?: string) => { const node = element('option', '', label(doc, text)); node.value = doc.id; return node; };
    const places = docs.filter(d => d.kind === 'composition' && !sequenceDoc(d)), listed = new Set<string>();
    // District → place → scene. A place with one scene is one entry; a place with several gets a heading and indented scenes.
    let tree: ReturnType<NonNullable<ComposerConfig['sceneTree']>> = [];
    try { tree = config.sceneTree?.(docs) ?? []; } catch { tree = []; }
    for (const district of tree) {
      const optgroup = element('optgroup'); optgroup.label = district.label;
      for (const place of district.places) {
        const found = place.scenes.flatMap(scene => places.filter(d => (d.value as Composition).scene === scene && !listed.has(d.id)));
        if (!found.length) continue; found.forEach(d => listed.add(d.id));
        if (found.length === 1) { optgroup.append(option(found[0], place.label)); continue; }
        const heading = element('option', '', place.label); heading.disabled = true; heading.className = 'place-heading'; optgroup.append(heading);
        for (const doc of found) optgroup.append(option(doc, '\u00a0\u00a0\u00a0' + sceneName((doc.value as Composition).scene)));
      }
      if (optgroup.children.length) chooser.append(optgroup);
    }
    for (const [title, list] of [[tree.length ? 'Other scenes' : 'Places', places.filter(d => !listed.has(d.id))], ['Sequences', docs.filter(sequenceDoc)]] as const) {
      if (!list.length) continue; const optgroup = element('optgroup'); optgroup.label = title;
      for (const doc of list) optgroup.append(option(doc));
      chooser.append(optgroup);
    }
    chooser.value = currentId; chooser.onchange = () => openDocument(chooser.value); sceneContext.replaceChildren(chooser);
    if (config.newScene) { const blocked = config.newScene.blocked(authoringApi()), add = button('＋ New scene', openNewScene, blocked || 'Create a scene and open it here'); add.className = 'new-scene'; add.disabled = !!blocked; sceneContext.append(add); }
    const dirty = element('span', 'state ' + (model.dirty() ? 'dirty' : 'muted'), model.dirty() ? 'Unsaved changes' : config.api ? 'Saved' : 'Published snapshot'); header.append(actions);
    const saveButton = button(saving ? 'Saving…' : config.api ? 'Save to source' : 'Download edits', () => void save()); saveButton.className = 'primary'; saveButton.disabled = saving || !model.dirty();
    const undo = button('Undo', () => run(() => model.undo()), model.undoLabel), redo = button('Redo', () => run(() => model.redo())); undo.disabled = !model.canUndo; redo.disabled = !model.canRedo; const discard=button('Discard all changes',()=>{stopPlay();playing=false;animating=false;editorSelection.timeline=undefined;editorSelection.instance='';editorSelection.document='';run(()=>model.discard());},'Restore the last loaded or saved snapshot; Undo can recover discarded edits');discard.disabled=saving||!model.dirty();actions.append(status,dirty,undo,redo,saveButton,discard,menu);
    menuItems.append(button(config.api ? 'Reload source' : 'Reset edits', () => { if (!model.dirty() || window.confirm('Discard unsaved edits and reload the source snapshot? Download or export first to keep them.')) void load(); }));
    const bundleFile = element('input'); bundleFile.type = 'file'; bundleFile.accept = 'application/json,.json'; bundleFile.hidden = true; bundleFile.setAttribute('aria-label', 'Import downloaded edits');
    bundleFile.onchange = async () => { const file = bundleFile.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const changes = readDocumentBundle(JSON.parse(await file.text()), documentsForView()); run(() => { model.importDocuments(changes); syncSequence(); }); } catch (error) { notice(`Import failed: ${message(error)}`, true); } finally { bundleFile.value = ''; } };
    menuItems.append(button('Import edits', () => bundleFile.click()), bundleFile);
    menuItems.append(button('Export JSON', () => { const doc = activeDocument(); if (!doc) return; const url = URL.createObjectURL(new Blob([JSON.stringify(doc.value, null, 2) + '\n'], { type: 'application/json' })); const link = element('a'); link.href = url; link.download = doc.id + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.onchange = async () => { const selectedFile = file.files?.[0]; if (!selectedFile) return; try { if (selectedFile.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const value: unknown = JSON.parse(await selectedFile.text()); run(() => { const doc = activeDocument(); if (!doc || doc.kind === 'world') throw new Error('Select an editable document to import'); model.edit(doc.id, 'Import document', () => value); syncSequence(); }); } catch (e) { notice(`Import failed: ${message(e)}`, true); } };
    const importButton = button('Import JSON', () => file.click()); importButton.disabled = activeDocument()?.kind === 'world'; menuItems.append(importButton, file);
  }
  function refreshOptions() {
    options.replaceChildren(); ambientLabel = undefined; syncWorldState();
    const bar = element('div', 'scene-toolbar'), composition = current()?.kind === 'composition';
    const cluster = (name: string) => { const node = element('div', 'toolbar-group'); node.setAttribute('role', 'group'); node.setAttribute('aria-label', name); bar.append(node); return node; };
    if (!playHost.hidden) {
      const stop = button('■ Stop', stopPlay, 'Stop playing and return to editing this scene'); stop.className = 'play-button';
      bar.append(element('span', 'toolbar-label', `Playing ${sceneName(sceneId())}`), stop); options.append(bar); return;
    }
    if (composition) {
      const add = button('＋ Add artwork', () => openPicker(), 'Add a piece of artwork where you are looking (A)'); add.className = 'primary'; cluster('Artwork').append(add);
      const animation = cluster('Scene animation'), toggle = button((sequence()?playing:animating) ? '❚❚ Pause' : '▶ Animate', toggleAnimation, (sequence()?playing:animating) ? 'Pause the scene’s ambient animation (Space)' : 'Run the scene’s ambient animation, such as people, lights and signs, without playing the game (Space)');
      toggle.setAttribute('aria-pressed', String(sequence()?playing:animating)); ambientLabel = element('span', 'time', `${time.toFixed(1)} s`);
      animation.append(toggle,ambientLabel,...(!currentTimeline()?[speedControl()]:[]), button('⟲', () => seekTime(0), 'Back to the first frame'));
    }
    const controls: EnvironmentControl[] = config.environmentControls ?? [{ key: 'cameraX', label: 'Camera X', kind: 'number', step: 10 }, { key: 'zoom', label: 'Zoom', kind: 'number', min: 0.1, max: 8, step: 0.1 }];
    const quick = controls.filter(control => control.quick);
    const states = composition && config.worldStates ? config.worldStates.list(sceneId(), documentsForView()) : [];
    if (states.length) {
      const scene = sceneId(), chosen = config.worldStates!.selected(scene, documentsForView());
      const pick = select([...states.map(state => ({ value: state.id, label: `State · ${state.name}` })), { value: '', label: 'State · preview only' }], chosen, value => { config.worldStates!.select(scene, value); refreshOptions(); void draw(); });
      pick.title = 'The world this scene is shown in and Play starts from: time, weather and story flags. Changing time or weather edits this state; "preview only" changes nothing saved.';
      pick.setAttribute('aria-label', 'Starting state'); cluster('Starting state').append(pick);
    }
    if (quick.length) { const preview = cluster('Preview as'); preview.append(element('span', 'toolbar-label', states.length ? '' : 'Preview')); for (const control of quick) preview.append(environmentControl(control, true)); }
    if(currentTimeline()){const mode=select([{value:'workspace',label:'Workspace'},{value:'camera',label:'Camera preview'}],cameraPreview?'camera':'workspace',value=>{cameraPreview=value==='camera';refreshViewportTools();refreshOptions();void draw();});mode.setAttribute('aria-label','Sequence view');cluster('Sequence view').append(mode);}
    if (composition) {
      const grid = select([{ value: '0', label: 'Grid off' }, ...[1, 2, 4, 8, 16].map(n => ({ value: String(n), label: `Grid ${n} px` }))], String(snap), value => { snap = Number(value); });
      grid.title = 'Dragging and arrow keys snap to this grid'; grid.setAttribute('aria-label', 'Grid'); cluster('Grid').append(grid);
    }
    const comparable = composition ? compareOptions() : [];
    if (comparable.length) {
      const pick = select([{ value: '', label: 'Compare · off' }, ...comparable.map(o => ({ value: o.id, label: `Compare · ${o.label}` }))], compareId, value => { compareId = value; void draw(); });
      pick.title = 'Show another version beside this one, with the same camera, zoom, time and weather'; pick.setAttribute('aria-label', 'Compare'); cluster('Compare').append(pick);
    }
    // scenes joined with no cut: drawn beside this one (read-only), on by default; Fit joined frames them all
    const joinedList = composition && config.joinedScenes ? config.joinedScenes(sceneId(), documentsForView()) : [];
    if (joinedList.length) {
      const group = cluster('Joined scenes'), on = environment.showJoined !== false, names = joinedList.map(j => j.label).join(', ');
      const toggle = button('Show joined scenes', () => { environment.showJoined = !on; refreshOptions(); void draw(); }, `${on ? 'Hide' : 'Show'} ${names}, joined to this scene with no cut, beside it (read-only)`);
      toggle.className = 'toggle'; toggle.setAttribute('aria-pressed', String(on));
      const frame = button('⤢ Fit joined', fitJoined, `Zoom out to show this scene with ${names}`); frame.disabled = !on;
      group.append(toggle, frame);
    }
    const more = element('details', 'more-menu'), panel = element('div', 'more-panel'); more.open = moreOpen; more.ontoggle = () => { moreOpen = more.open; };
    more.append(element('summary', '', 'More preview settings'), panel); bar.append(more);
    const motion = element('input'); motion.type = 'checkbox'; motion.checked = reduced; motion.onchange = () => { reduced = motion.checked; void draw(); }; panel.append(label('Reduced motion', motion));
    for (const control of controls) if (!control.quick) panel.append(environmentControl(control, false));
    if (canPlay()) { const play = button('▶ Play scene', playScene, 'Run this scene in the game from its starting state, here on the stage'); play.className = 'play-button'; bar.append(play); }
    options.append(bar);
  }
  function environmentControl(control: EnvironmentControl, inToolbar: boolean): HTMLElement {
    const change = (value: string | number | boolean) => {
      environment[control.key] = value;
      // With a starting state chosen, time and weather are part of it: the change is a saved, undoable edit.
      const state = worldState(), stored = state && config.worldStates!.edit(sceneId(), state.id, control.key, value, documentsForView());
      if (state && stored) { run(() => model.edit(stored.id, `${state.name}: ${control.label}`, () => stored.value)); return; }
      void draw(); if (inToolbar) refreshOptions();
    };
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
  /** The artwork browser, shared by Library › Artwork and the Scene view's Add artwork picker (same filters, same session). */
  function mountArtwork(host: HTMLElement, scene: string, add: (entry: AssetEntry) => void, addPreset: (kit: AssetEntry, settings: Properties) => void) {
    return mountAssetBrowser(host, { registry: config.registry, documents: documentsForView(),
      openUsage(usage) { closePicker(); openInstance(usage.document, usage.instance); },
      preview: (canvas, entry, usage, zoom, overrides) => config.assetPreview!(canvas, entry, usage, documentsForView(), { time, reduced, environment: { ...environment, renderScale: zoom },...overrides }),
      fieldControl:fieldInput,
      ...(config.assetDistricts ? { districts: config.assetDistricts(documentsForView()) } : {}),
      ...(thumbnails ? { thumbnail: (entry: AssetEntry) => thumbnails.thumbnail(entry) } : {}),
      ...(scene ? { useInScene: { label: `Add to ${sceneName(scene)}`, run: add } } : {}),
      ...(presetsDoc() ? { presets: { of: (kit: AssetEntry) => presetsFor(presetsDoc(), kit.id).map(pr => ({ id: pr.id, label: pr.label, note: pr.note, family: presetFamily(pr, kit) })),
        add: (kit: AssetEntry, preset: AssetPreset) => { const pr = presetsFor(presetsDoc(), kit.id).find(x => x.id === preset.id); if (pr) addPreset(kit, pr.props); } } } : {}),
    }, assetSession);
  }
  function refreshLibrary() { return perfMeasure('editor.library', refreshLibraryContent); }
  function refreshLibraryContent() {
    cleanupAssets?.(); cleanupAssets = undefined; assetPanel.replaceChildren(); thumbnails?.prune(); if (!config.assetPreview || !assetHost.open) return;
    const scene = current()?.kind === 'composition' ? sceneId() : '';
    cleanupAssets = mountArtwork(assetPanel, scene, entry => { showLayout(); void addAtView(entry.id); }, (kit, settings) => { showLayout(); void addAtView(kit.id, settings); });
  }
  function refreshMap() { cleanupWorld?.(); cleanupWorld = undefined; mapPanel.replaceChildren(); if (config.worldPanel && mapHost.open) cleanupWorld = config.worldPanel(mapPanel, openScene, documentsForView(), sceneId()); }
  const readFolds=(key:string)=>{try{return new Map<string,boolean>(JSON.parse(localStorage.getItem('access-denied.editor.'+key)??'[]'));}catch{return new Map<string,boolean>();}};
  const outlineSceneOwners=new Map<string,string>();const outlineSourceOpen=readFolds('source-folds');for(const [key,value]of readFolds('kind-folds'))roleOpen.set(key,value);
  const saveFolds=()=>{try{localStorage.setItem('access-denied.editor.source-folds',JSON.stringify([...outlineSourceOpen]));localStorage.setItem('access-denied.editor.kind-folds',JSON.stringify([...roleOpen]));}catch{/* optional editor preferences */}};
  let outlineVersion='',outlineSnapshot:object|undefined,outlineView='',updateOutlineSelection=()=>{};
  function refreshLeft() {
    workbenches.forEach(item=>refreshWorkbench(item,true));refreshLibrary();refreshMap();
    if(outlineSnapshot===model.sourceVersion&&outlineView===currentId){updateOutlineSelection();return;}
    outlineSnapshot=model.sourceVersion;outlineView=currentId;
    const docs=documentsForView(),sources=outlineDocuments(viewCompositionDocument(),docs);outlineSceneOwners.clear();for(const source of sources)outlineSceneOwners.set((source.value as Composition).scene,source.id);
    const version=JSON.stringify(sources,(key,value)=>key==='sequence'?!!value:key==='placement'?{...value,x:undefined,h:undefined,scale:undefined,facing:undefined}:value)+JSON.stringify(sources.flatMap(source=>(config.sceneDocuments?.((source.value as Composition).scene,docs)??[]).map(id=>docs.find(d=>d.id===id))));
    if(version===outlineVersion){updateOutlineSelection();return;}
    outlineVersion=version;left.replaceChildren();left.append(element('h2','','Outline'));
    const updates:(()=>void)[]=[],filters:(()=>void)[]=[];
    if(!sources.length)left.append(element('p','muted','Open a scene to inspect its artwork.'));
    const assembled=!!currentTimeline();
    if(assembled){
      const camera=button('Camera',()=>selectTimeline({kind:'camera'}),'Inspect the authored game camera');camera.setAttribute('aria-label','Camera in outline');
      left.append(camera);updates.push(()=>camera.setAttribute('aria-pressed',String(cameraSelected())));
      left.append(element('p','outline-context','The sequence and its referenced scenes. Selection does not change this list.'));
      const tools=element('div','layer-tools'),search=element('input'),sort=element('div','segmented');search.type='search';search.placeholder='Filter all sources';search.value=layerQuery;search.setAttribute('aria-label','Filter the outline');search.oninput=()=>{layerQuery=search.value;filters.forEach(render=>render());};
      for(const mode of ['kind','order']as const){const pick=button(mode==='kind'?'Kind':'Order',()=>{layerSort=mode;for(const child of sort.children)child.setAttribute('aria-pressed',String((child as HTMLElement).dataset.mode===mode));filters.forEach(render=>render());});pick.dataset.mode=mode;pick.setAttribute('aria-pressed',String(layerSort===mode));sort.append(pick);}tools.append(search,sort);left.append(tools);
    }
    for(const source of sources){
      if(!assembled){updates.push(renderOutlineDocument(source,left,true).selection);continue;}
      const group=element('details','outline-source'),composition=source.value as Composition;
      group.dataset.document=source.id;group.open=outlineSourceOpen.get(source.id)??false;
      const summary=element('summary','',source.id===currentId?(sources.length>1?'Sequence controls':sceneName(composition.scene)):source.id.startsWith('backdrop-')?'Shared backdrop · '+source.id.slice(9):sceneName(composition.scene));summary.title=source.id;
      const container=element('div');group.append(summary,container);left.append(group);
      group.ontoggle=()=>{if(!layerQuery.trim()){outlineSourceOpen.set(source.id,group.open);saveFolds();}};
      const handle=renderOutlineDocument(source,container,false);filters.push(()=>{handle.filter();if(layerQuery.trim())group.open=true;else group.open=outlineSourceOpen.get(source.id)??false;});
      updates.push(()=>{if(compositionDocument()?.id===source.id&&editorSelection.instance){group.open=true;outlineSourceOpen.set(source.id,true);}handle.selection();});
    }
    updateOutlineSelection=()=>updates.forEach(update=>update());updateOutlineSelection();
  }
  function renderOutlineDocument(doc:EditorDocument,container:HTMLElement,showTools:boolean):{selection:()=>void;filter:()=>void}{

      const composition = doc.value as Composition, rows = flatten(composition), parents = new Map<string, string>();
      const visit = (nodes: Instance[], parent?: string) => nodes.forEach(node => { if (parent) parents.set(node.id, parent); visit(node.children ?? [], node.id); }); visit(composition.instances);
      const within = (id: string, ancestor: string) => { for (let at = parents.get(id); at; at = parents.get(at)) if (at === ancestor) return true; return false; };
      const art = (node: Instance) => config.registry.get(node.type);
      // Actor looks from the scene's own documents decide Human / Animal / Robot for characters.
      const docs = documentsForView(), looks = new Map<string, unknown>();
      for (const id of config.sceneDocuments?.(composition.scene, docs) ?? []) { const actors = (docs.find(d => d.id === id)?.value as { actors?: { id: string; instance?: string; look?: unknown }[] } | undefined)?.actors; for (const a of Array.isArray(actors) ? actors : []) looks.set(a.instance ?? a.id, a.look); }
      const kind = (node: Instance) => layerRole(node.type, art(node).label, art(node).category, looks.get(node.id));
      const matches = (node: Instance) => { const query = layerQuery.trim().toLowerCase(); return compositionDocument()?.id===doc.id&&node.id===editorSelection.instance||!query || `${node.id} ${node.type} ${art(node).label}`.toLowerCase().includes(query); };
      const layerTools = element('div', 'layer-tools'), search = element('input'), order = element('div', 'segmented'), listHost = element('div');
      search.type = 'search'; search.placeholder = 'Filter'; search.value = layerQuery; search.setAttribute('aria-label', 'Filter the outline'); search.oninput = () => { layerQuery = search.value; renderLayers(); };
      order.setAttribute('role', 'group'); order.setAttribute('aria-label', 'Arrange the outline');
      for (const [mode, text, title] of [['kind', 'Kind', 'Group by kind of artwork'], ['order', 'Order', 'Draw order: the layer stack, front at the top (older scenes: document order)']] as const) {
        const toggle = button(text, () => { layerSort = mode; for (const other of order.children) other.setAttribute('aria-pressed', String((other as HTMLElement).dataset.mode === mode)); renderLayers(); }, title);
        toggle.dataset.mode = mode; toggle.setAttribute('aria-pressed', String(mode === layerSort)); order.append(toggle);
      }
      layerTools.append(search,order);if(showTools)container.append(layerTools);container.append(listHost);
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
      const item = (node: Instance, depth: number) => {
        const key=JSON.stringify([doc.id,node.id]),active=()=>compositionDocument()?.id===doc.id&&node.id===editorSelection.instance;
        const li = element('li'), pick = button('', () => { if(active())select_('');else{editorSelection.timeline=undefined;editorSelection.document=doc.id;editorSelection.instance=node.id;timelineView.collapsed.delete(node.id);refreshRight();updateOutlineSelection();refreshTimeline();void draw();} }, `${art(node).label} · ${node.type} · ${LAYER_LABELS[node.layer]}${parents.has(node.id) ? ` · in ${parents.get(node.id)}` : ''}`);
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
        const fresh = reveal(); listHost.replaceChildren(); let shown = 0;
        layerTools.querySelector('.show-all')?.remove();
        if (hidden.size) { const reveal = button(`Show all (${hidden.size})`, () => { hidden.clear(); renderLayers(); void draw(); }, 'Show everything hidden with the eyes'); reveal.className = 'show-all'; layerTools.append(reveal); }
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
        if (!shown) listHost.append(element('p', 'muted', layerQuery.trim() ? 'Nothing matches this filter.' : 'This scene has no artwork yet. Use ＋ Add artwork in the toolbar.'));
        // Once the outline is attached (the left column is rebuilt around this list). A new selection is centred; later refreshes only keep it in view.
        queueMicrotask(() => listHost.querySelector<HTMLElement>('.hierarchy button[aria-pressed=true]')?.scrollIntoView({ block: fresh ? 'center' : 'nearest' }));
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
        const row = (node: Instance) => {
          const li = item(node, 0);
          if (isPlayerRow(node)) li.classList.add('player-row');
          li.draggable = true; li.ondragstart = event => { dragged = node.id; event.dataTransfer?.setData('text/plain', node.id); li.classList.add('dragging'); };
          li.ondragend = () => { dragged = ''; li.classList.remove('dragging'); };
          drop(li, event => { const layer = node.layer!; if (!accepts(layer) || dragged === node.id) return; const others = layerRows(composition, layer).filter(n => n.id !== dragged), box = li.getBoundingClientRect(), front = event.clientY < box.top + box.height / 2; return { layer, index: others.indexOf(node) + (front ? 1 : 0) }; });
          return li;
        };
        const section = (layer: Layer, body: (list: HTMLElement) => number) => {
          const box = element('section', 'stack-layer'), head = element('div', 'stack-head'), list = element('ul', 'hierarchy'), key = 'stack:' + layer, open = !!layerQuery.trim() || (roleOpen.get(key) ?? false);
          const fold = button(open ? '▾' : '▸', () => { roleOpen.set(key,!open);saveFolds();renderLayers(); }, `${open ? 'Collapse' : 'Expand'} the ${LAYER_LABELS[layer]} layer`); fold.className = 'fold'; fold.setAttribute('aria-expanded', String(open)); list.hidden = !open;
          const count = body(list); shown += count;
          const ids = () => layerRows(composition, layer).map(n => n.id);
          head.append(fold, element('span', 'stack-name', LAYER_LABELS[layer]), element('span', 'muted', String(ids().length)), ...(ids().length ? [eye(ids, `the ${LAYER_LABELS[layer]} layer`)] : [element('span', 'eye-space')])); head.title = LAYER_HINTS[layer];
          head.ondblclick = event => { if ((event.target as HTMLElement).closest('button')) return; roleOpen.set(key,!open);saveFolds();renderLayers(); };
          drop(head, () => accepts(layer) ? { layer, index: layerRows(composition, layer).filter(n => n.id !== dragged).length } : undefined);
          box.append(head, list); stack.append(box);
        };
        const list = (target: HTMLElement, nodes: Instance[]) => { let n = 0; for (const node of [...nodes].reverse()) if (matches(node)) { target.append(row(node)); n++; } return n; };
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
        if (fresh) selectedRow?.scrollIntoView({ block: 'center' });
      };
      renderLayers();

      return{selection:updateSelection,filter:renderLayers};
  }
  const disposeInspector=inspector.dispose;
  /** Sections read the live documents, so a section's own refresh always sees the latest edit. */
  const liveContext = (scene: string): WorkbenchContext => ({ get documents() { return documentsForView(); }, scene, openScene, openInstance, authoring: authoringApi() });
  function refreshRight() {
    const node = selected(), scene = sceneId(), doc = compositionDocument(); right.replaceChildren();
    if(renderTimelineInspector(right,{selection:editorSelection.timeline,sequence:sequence(),time,playing,fieldInput,numberInput,keyField,keyValue,editTimeline,addKey,selectTimeline,seekTime,notice,setSelection:value=>{editorSelection.timeline=value;},close:()=>{editorSelection.timeline=undefined;refreshRight();refreshTimeline();},getFrame:()=>evaluateTimeline(currentTimeline()!,sequenceId,time,evaluationContext(),{reduced})})){disposeInspector();return;}
    inspector.render(right,{node,scene,doc,sceneName:sceneName(scene),sharedSource:!!editorSelection.document&&editorSelection.document!==currentId,registry:config.registry,
      duplicate:()=>run(()=>{editorSelection.instance=model.duplicate(doc!.id,editorSelection.instance);}),remove:deleteSelected,deselect:()=>select_(''),openSource:()=>openDocument(editorSelection.document),refresh:refreshRight,
      sections:()=>scene&&config.inspector?config.inspector(scene,node,documentsForView()):[],context:()=>liveContext(scene),appearance:renderAppearance});
  }

  /** Save this kit piece's settings as a named preset, or update, rename and delete this kit's presets. */
  function renderPresets(host: HTMLElement, node: Instance) {
    const doc = presetsDoc()!, mine = presetsFor(doc, node.type), settings = presetProps(config.registry, node.type, config.registry.properties(node.type, node.props));
    const editPresets = (labelText: string, change: (d: KitPresets) => void) => run(() => model.edit(PRESETS_DOCUMENT, labelText, value => { const next = copy(value) as KitPresets; change(next); return next; }));
    const same = mine.find(p => JSON.stringify(presetProps(config.registry, node.type, config.registry.properties(node.type, p.props))) === JSON.stringify(settings));
    host.append(element('p', 'muted', same ? `These settings are the preset “${same.label}”.` : 'A preset saves these settings under a name; Add artwork lists it under this kit.'));
    const name = element('input'); name.type = 'text'; name.placeholder = 'Preset name'; name.setAttribute('aria-label', 'Preset name');
    host.append(label('Name', name), button('Save as new preset', () => { const text = name.value.trim(); if (!text) { notice('Give the preset a name first.', true); return; } editPresets('Save preset', d => { d.presets.push({ id: presetId(d, text), label: text, kit: node.type, props: settings }); }); }));
    if (!mine.length) return;
    let chosen = same?.id ?? mine[0].id;
    const pick = select(mine.map(p => ({ value: p.id, label: p.label })), chosen, v => { chosen = v; }); host.append(label('Existing preset', pick));
    const row = element('div', 'row');
    row.append(
      button('Update with these settings', () => editPresets('Update preset', d => { d.presets.find(p => p.id === chosen)!.props = settings; }), 'Replace the chosen preset’s settings with this piece’s'),
      button('Rename', () => { const text = name.value.trim(); if (!text) { notice('Type the new name in Name first.', true); return; } editPresets('Rename preset', d => { d.presets.find(p => p.id === chosen)!.label = text; }); }, 'Give the chosen preset the name typed above'),
      button('Delete', () => editPresets('Delete preset', d => { d.presets = d.presets.filter(p => p.id !== chosen); }), 'Delete the chosen preset (pieces placed from it stay as they are)'),
    );
    host.append(row);
  }
  function renderAppearance(host: HTMLElement, node: Instance) {
    const art = config.registry.get(node.type), part = (title: string, open: boolean) => { const box = element('details', 'inspector-part'), inner = element('div'); box.open = open; box.append(element('summary', '', title), inner); host.append(box); return inner; };
    if (currentTimeline()) host.append(element('p', 'muted', 'These edit the base composition. Timeline keys can override these values; use track keyframes to animate.'));
    const position = part('Position', true);
    const placementLabels: Record<string, string> = { x: 'X position', h: 'Height above floor', scale: 'Scale', parallax: 'Parallax' };
    for (const [key, value, min] of [['x', node.placement.x], ['h', node.placement.h], ['scale', node.placement.scale ?? 1, 0.0001], ['parallax', node.placement.parallax ?? 1, 0]] as [keyof Instance['placement'], number, number?][]) position.append(label(placementLabels[key], numberInput(value, v => editInstance(`Change ${key}`, n => { n.placement[key] = v as never; }), min)));
    position.append(label('Facing', select([{ value: '1', label: 'Right' }, { value: '-1', label: 'Left' }], String(node.placement.facing ?? 1), v => editInstance('Change facing', n => n.placement.facing = Number(v) as 1 | -1))));
    const composed = compositionDocument()!;
    const drawn = art.parts.length > 0 || art.role === 'group', choices: Layer[] = isPlayerRow(node) ? ['playfield'] : drawn ? [...VISUAL_LAYERS] : ['logic'];
    const pick = select(choices.map(v => ({ value: v, label: LAYER_LABELS[v] })), node.layer, v => run(() => model.restack(composed.id, node.id, v as Layer, layerRows(composed.value as Composition, v as Layer).length)));
    if (choices.length < 2) (pick as HTMLSelectElement).disabled = true; pick.title = LAYER_HINTS[node.layer];
    position.append(label('Layer', pick));
    const siblings = layerRows(composed.value as Composition, node.layer), at = siblings.findIndex(n => n.id === node.id), stepper = element('div', 'row');
    const forward = button('Bring forward', () => run(() => model.restack(composed.id, node.id, node.layer, at + 1)), 'Draw in front of the next item in this layer'), backward = button('Send backward', () => run(() => model.restack(composed.id, node.id, node.layer!, at - 1)), 'Draw behind the previous item in this layer');
    forward.disabled = at >= siblings.length - 1; backward.disabled = at <= 0; stepper.append(backward, forward); position.append(stepper);
    const fields = Object.entries(art.fields);
    if (fields.length) { const look = part('Look', true); const shown = config.registry.properties(node.type, node.props); for (const [key, field] of fields) { if (field.showIf && !field.showIf(shown)) continue; const value = node.props[key] ?? field.default; const control = fieldInput(field, value, v => editInstance(`Change ${field.label}`, n => n.props[key] = v)); look.append(label(field.label + (field.unit ? ` (${field.unit})` : ''), control)); } }
    if (art.libraryUse === 'reusable' && presetsDoc()) renderPresets(part('Preset', false), node);
    const composition = compositionDocument()!.value as Composition, anchorDetails = part('Attachment and anchors', !!node.attach);
    const candidates = flatten(composition).map(x => x.node).filter(n => n.id !== node.id);
    const attachTo = select([{ value: '', label: 'None / parent origin' }, ...candidates.map(n => ({ value: n.id, label: n.id }))], node.attach?.instance ?? '', v => editInstance('Change attachment', n => { if (!v) { delete n.attach; return; } const owner = candidates.find(x => x.id === v)!; const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); const anchor = Object.keys(anchors)[0]; if (!anchor) throw new Error('The selected owner exposes no anchors'); n.attach = { instance: v, anchor }; })); anchorDetails.append(label('Attach to', attachTo));
    if (node.attach) { const owner = candidates.find(n => n.id === node.attach!.instance); if (owner) { const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); anchorDetails.append(label('Owner anchor', select(Object.keys(anchors).map(v => ({ value: v, label: `${v} · ${anchors[v].role}` })), node.attach.anchor, v => editInstance('Change anchor', n => n.attach!.anchor = v)))); } }
    const ownAnchors = art.anchors(config.registry.properties(node.type, node.props), {}); for (const [name, anchor] of Object.entries(ownAnchors)) anchorDetails.append(element('p', 'muted', `${name}: (${anchor.x}, ${anchor.h}) · ${anchor.role}`));
    anchorDetails.append(element('p', 'muted', 'Attachment offsets are local. Changing an owner keeps the existing local offset; review the preview before saving.'));
    if (Object.keys(node.bindings ?? {}).length) { const choices=art.bindingIdentity==='presentation'?art.bindingChoices?.(composition):undefined,binding = part(choices?'Visual inputs':'Gameplay bindings · read-only', false); for (const [key, value] of Object.entries(node.bindings ?? {})) { const sources=choices?.[key];if(sources){binding.append(label(art.visualFields?.[key]?.label??key,select(sources.map(value=>({value,label:value})),value,source=>editInstance('Rebind '+key,n=>{n.bindings![key]=source;}))));}else{const row = element('p', 'binding-row'); row.append(element('span', 'muted', key), element('code', '', value)); binding.append(row);} } }
  }
  /** The Add picker: searchable pictures of every registered piece, placed at the centre of the view. */
  let cleanupPicker: void | (() => void);
  function openPicker() { if (current()?.kind !== 'composition' || !config.assetPreview) return; picker.style.setProperty('--picker-top', `${Math.round(workspace.getBoundingClientRect().top + 8)}px`); picker.hidden = false; renderPicker(); picker.querySelector<HTMLInputElement>('input[type=search]')?.focus(); }
  function closePicker() { if (picker.hidden) return; picker.hidden = true; cleanupPicker?.(); cleanupPicker = undefined; picker.replaceChildren(); thumbnails?.prune(); }
  /** Add artwork shows the Library's browser over the stage: pick with its button or a double-click on a card. */
  function renderPicker() {
    const scene = sceneId(), head = element('div', 'picker-head'), body = element('div', 'picker-browser');
    head.append(element('strong', '', `Add artwork to ${sceneName(scene)}`), element('span', 'muted', 'Double-click a piece, or select it and use Add'), button('✕', closePicker, 'Close (Esc)'));
    picker.replaceChildren(head, body); cleanupPicker?.();
    cleanupPicker = mountArtwork(body, scene, entry => { closePicker(); void addAtView(entry.id); }, (kit, settings) => { closePicker(); void addAtView(kit.id, settings); });
  }
  picker.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closePicker(); canvas.focus(); } });
  /** The editable kit presets document, when this editor has one. */
  const presetsDoc = () => model.list().find(d => d.id === PRESETS_DOCUMENT)?.value as KitPresets | undefined;
  /** A people-kit preset is a human, an animal or a robot by its body kind; other presets share their kit's kind. */
  const presetFamily = (preset: KitPreset, kit: AssetEntry) => kit.id !== 'character.resident' ? kit.family : preset.props.kind === undefined || preset.props.kind === 'human' ? 'Human' : ['cat', 'pigeon', 'gull', 'crab'].includes(String(preset.props.kind)) ? 'Animal' : 'Robot';
  async function addAtView(type: string, settings?: Properties) { const token = perfBegin('editor.add'); try {
    const doc = compositionDocument(); if (!doc || current()?.kind !== 'composition') { notice('Open a scene to add artwork.', true); return; }
    let x = 0;
    try {
      // Draw the new piece once off-screen at x = 0, then move it by its measured distance to the centre of the view.
      const draft = model.draftAdd(doc.id, type, settings), probe = element('canvas'); probe.width = canvas.width; probe.height = canvas.height;
      const result = await config.preview.render(probe, previewRequest(draft.composition, false, viewZoom)), box = result.bounds.find(b => b.id === draft.instanceId);
      if (box && result.deltaToLocal) { const rect = canvas.getBoundingClientRect(), view = stage.getBoundingClientRect(), centre = ((Math.max(rect.left, view.left) + Math.min(rect.right, view.right)) / 2 - rect.left) * canvas.width / Math.max(1, rect.width); x = result.deltaToLocal(draft.instanceId, centre - (box.x + box.width / 2), 0).x; }
    } catch { x = 0; }
    x = snap ? Math.round(x / snap) * snap : Math.round(x);
    let added = false; run(() => { editorSelection.instance = model.add(doc.id, type, { x, h: 0 }, settings); inspector.appearance(); added = true; });
    if (added) { if (compact.matches) showPanel('properties'); notice(`Added ${config.registry.get(type).label}. Drag it into place or set its position in the inspector.`); }
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
    editorSelection.timeline=selection;playing=false;animating=false;
    if(selection?.kind==='camera'){editorSelection.document='';editorSelection.instance='';timelineView.collapsed.delete('Camera');}
    if(target){editorSelection.document='';editorSelection.instance=target.kind==='camera'?'':target.instance;}
    if((selection?.kind==='key'||selection?.kind==='track')&&target)timelineView.collapsed.delete(target.kind==='camera'?'Camera':target.instance);
    if(compact.matches)showPanel('properties');refreshLeft();refreshRight();refreshTimeline();void draw();
  }
  function keyField(target:Target):Field{
    if(target.kind==='property'||target.kind==='state'||target.kind==='clip'){
      const node=flatten(viewCompositionDocument()!.value as Composition).find(n=>n.node.id===target.instance)!.node,entry=config.registry.get(node.type);
      if(target.kind==='clip')return{kind:'select',label:'Clip',default:'',options:[...(config.clips?.[node.type]??[])]};
      return(target.kind==='property'?entry.fields:entry.visualFields!)[target.property];
    }
    if(target.kind==='instance'&&target.property==='visible')return{kind:'boolean',label:'Visible',default:true};
    if(target.kind==='instance'&&target.property==='facing')return{kind:'select',label:'Facing',default:1,options:[-1,1]};
    return{kind:'number',label:target.kind==='camera'?(target.property==='h'?'Camera height (H)':target.property==='x'?'Camera X':'Camera zoom'):'Value',default:0,...(target.property==='zoom'||target.property==='scale'?{min:.0001}:target.property==='opacity'?{min:0,max:1}:{})};
  }
  function cameraSelected():boolean{
    if(editorSelection.timeline?.kind==='camera')return true;
    if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='key')return sequence()?.tracks.find(t=>t.id===(editorSelection.timeline as {track:string}).track)?.target.kind==='camera';
    return false;
  }
  function refreshTimeline() {
    timelineGrid?.dispose();timelineGrid=undefined;timelineHost.replaceChildren();timeLabel=undefined;transportPlay=undefined;
    const seq=sequence();if(!seq){timelineHost.hidden=true;return;}timelineHost.hidden=false;timelineHost.classList.toggle('collapsed',timelineCollapsed);timelineHost.style.height=timelineCollapsed?'42px':timelineHeight+'px';
    const resize=element('div','timeline-resize');resize.tabIndex=0;resize.setAttribute('role','separator');resize.setAttribute('aria-label','Resize timeline');resize.setAttribute('aria-orientation','horizontal');
    let drag:{y:number;height:number}|undefined;resize.onpointerdown=e=>{drag={y:e.clientY,height:timelineHost.clientHeight};resize.setPointerCapture(e.pointerId);};resize.onpointermove=e=>{if(!drag)return;timelineHeight=Math.max(150,Math.min(center.clientHeight-200,drag.height+drag.y-e.clientY));timelineHost.style.height=timelineHeight+'px';};resize.onpointerup=e=>{drag=undefined;if(resize.hasPointerCapture(e.pointerId))resize.releasePointerCapture(e.pointerId);};resize.onkeydown=e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();timelineHeight=Math.max(150,timelineHeight+(e.key==='ArrowUp'?30:-30));timelineHost.style.height=timelineHeight+'px';}};
    timelineHost.append(resize);
    const transport=element('div','timeline-transport');transportPlay=button(playing?'Pause':'Play',toggleAnimation,'Space: play / pause');transport.append(button(timelineCollapsed?'▸ Timeline':'▾ Timeline',()=>{timelineCollapsed=!timelineCollapsed;refreshTimeline();}),transportPlay,button('−1 frame',()=>seekTime((Math.round(time*60)-1)/60),'Comma: previous frame'),button('+1 frame',()=>seekTime((Math.round(time*60)+1)/60),'Period: next frame'));
    timeLabel=element('span','time');transport.append(timeLabel);timelineHost.append(transport);updateTime();if(timelineCollapsed)return;
    const zoom=numberInput(timelineView.zoom,value=>{timelineView.zoom=Math.max(1,Math.min(16,value));refreshTimeline();},1);const speed=speedControl();speed.setAttribute('aria-label','Playback speed');transport.append(speed);zoom.max='16';zoom.setAttribute('aria-label','Timeline zoom');transport.append(label('Zoom',zoom));
    const settings=element('details','timeline-settings'),dataPanel=element('div');settings.append(element('summary','','Settings'),dataPanel);transport.append(settings);
    dataPanel.append(label('Duration',numberInput(seq.duration,value=>editTimeline('Change duration',d=>d.sequences[0].duration=value),1/60)));
    const loopInput=element('input');loopInput.type='checkbox';loopInput.checked=loop;loopInput.onchange=()=>loop=loopInput.checked;
    dataPanel.append(label('Loop range',loopInput),label('From',numberInput(loopFrom,v=>{if(v>=(loopTo||seq.duration)){notice('Loop start must precede loop end.',true);return;}loopFrom=v;},0)),label('To',numberInput(loopTo||seq.duration,v=>{if(v<=loopFrom||v>seq.duration){notice('Loop end must follow its start and remain within the sequence.',true);return;}loopTo=v;},0)));
    const trackSelect=select([{value:'',label:'Add keyframe…'},...thisTargets()],'',value=>{if(value)addKey(JSON.parse(value) as Target);});trackSelect.setAttribute('aria-label','Add keyframe target');transport.append(trackSelect);
    timelineGrid=mountTimelineGrid(timelineHost,{sequence:seq,state:timelineView,time,onZoom:value=>zoom.value=String(Math.round(value*100)/100),selected:editorSelection.timeline,instance:compositionDocument()?.id===viewCompositionDocument()?.id?editorSelection.instance:undefined,label:id=>{const node=flatten(viewCompositionDocument()!.value as Composition).find(n=>n.node.id===id)?.node;return node?id+' · '+config.registry.get(node.type).label:id;},select:selectTimeline,seek:seekTime,moveKey:(track,index,seconds)=>{editTimeline('Move keyframe',d=>{editorSelection.timeline={kind:'key',track,index:moveKey(d.sequences[0],track,index,seconds)};});refreshTimeline();refreshRight();}});
    const apply = <K extends keyof Sequence>(key: K, value: Sequence[K]) => editTimeline(`Edit ${key}`, d => { d.sequences.find(s => s.id === sequenceId)![key] = value; });
    editArray(dataPanel, 'Shots', seq.shots, value => apply('shots', value), 'Ordered {id,from,to,camera:{x,h,zoom}}. Times are seconds. Shots must not overlap.');
    editArray(dataPanel, 'Text cards', seq.text, value => apply('text', value), '{id,from,to,text,x,h}. Cards are rendered by the shared preview provider.');
    editArray(dataPanel, 'Fades', seq.fades, value => apply('fades', value), '{id,from,to,color,start,end}. Opacity stays within 0–1.');
    editArray(dataPanel, 'Named beats', seq.beats, value => apply('beats', value), '{id,time}. Previewing these never dispatches gameplay events.');
    const handoff = element('details'); handoff.append(element('summary', '', 'Handoff destination')); const destinations = Object.keys(model.timelineContext().destinations ?? {}); handoff.append(label('Scene', select([{ value: '', label: 'No handoff' }, ...destinations.map(v => ({ value: v, label: v }))], seq.handoff?.scene ?? '', v => apply('handoff', v ? { scene: v } : undefined))));
    if (seq.handoff) handoff.append(label('Entrance', select([{ value: '', label: 'Default entrance' }, ...(model.timelineContext().destinations?.[seq.handoff.scene] ?? []).map(v => ({ value: v, label: v }))], seq.handoff.entrance ?? '', v => apply('handoff', { scene: seq.handoff!.scene, ...(v ? { entrance: v } : {}) })))); handoff.append(element('p', 'muted', 'Preview never travels or changes player progress.')); dataPanel.append(handoff);
    editArray(dataPanel, 'Sequence document', seq, value => editTimeline('Edit sequence', d => { const i = d.sequences.findIndex(s => s.id === sequenceId); d.sequences[i] = value; sequenceId = value.id; }), 'Advanced full sequence data, including registered exact motion tracks and clips. No code is accepted.');
  }
  function thisTargets(): { value: string; label: string }[] {
    const result: { value: string; label: string }[] = [];
    const add = (target: Target, text: string) => result.push({ value: JSON.stringify(target), label: text });
    for (const property of ['x', 'h', 'zoom'] as const) add({ kind: 'camera', property }, `Camera · ${property}`);
    const node = selected(); if (node && (!currentTimeline()||compositionDocument()?.id===viewCompositionDocument()?.id)) { for (const property of ['x', 'h', 'scale', 'facing', 'parallax', 'visible', 'opacity'] as const) add({ kind: 'instance', instance: node.id, property }, `${node.id} · ${property}`); const entry = config.registry.get(node.type); for (const [property, field] of Object.entries(entry.fields)) if (field.animatable) add({ kind: 'property', instance: node.id, property }, `${node.id} · ${field.label}`); for (const [property, field] of Object.entries(entry.visualFields ?? {})) { if (field.animatable) add({ kind: 'state', instance: node.id, property }, `${node.id} state · ${field.label}`); if (config.clips?.[node.type]?.length) add({ kind: 'clip', instance: node.id, property }, `${node.id} clip · ${field.label}`); } }
    return result;
  }
  function keyValue(frame:TimelineFrame,target:Target):{value:Value;discrete:boolean}{
      const node = target.kind === 'camera' ? undefined : flatten(frame.composition).find(n => n.node.id === target.instance)?.node;
      let value: Value, discrete = false;
      if (target.kind === 'camera') value = frame.camera[target.property];
      else if (target.kind === 'instance') { value = target.property === 'visible' ? frame.visibility[target.instance] ?? true : target.property === 'opacity' ? frame.opacity[target.instance] ?? 1 : node!.placement[target.property] ?? 1; discrete = ['visible', 'facing'].includes(target.property); }
      else if (target.kind === 'property' || target.kind === 'state') { const entry = config.registry.get(node!.type), field = (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property]; value = target.kind === 'property' ? node!.props[target.property] ?? field.default : frame.state[target.instance]?.[target.property] ?? field.default; discrete = field.kind !== 'number'; }
      else { value = frame.clips[target.instance]?.[target.property] ?? config.clips?.[node!.type]?.[0] ?? ''; discrete = true; }
    return{value,discrete};
  }
  function addKey(target: Target, explicitValue?:Value) {
    editTimeline('Add / update keyframe', doc => {
      const seq = doc.sequences.find(s => s.id === sequenceId)!; const frame = evaluateTimeline(doc, sequenceId, time, evaluationContext(), { reduced });
      const sampled=keyValue(frame,target),value=explicitValue===undefined?sampled.value:explicitValue,discrete=sampled.discrete;
      const key: Keyframe = { time: Math.round(time * 60000) / 60000, value, ease: discrete ? 'hold' : 'linear' };
      let track = seq.tracks.find(t => equal(t.target, target)); if (!track) { let i = 1; while (seq.tracks.some(t => t.id === `track-${i}`)) i++; track = { id: `track-${i}`, target, keys: [] }; seq.tracks.push(track); }
      const existing = track.keys.findIndex(k => Math.abs(k.time - key.time) < 1 / 120000); if (existing >= 0) track.keys[existing] = {...key,ease:track.keys[existing].ease??key.ease}; else track.keys.push(key); track.keys.sort((a, b) => a.time - b.time);
    });
  }
  function updateTime() { timelineGrid?.update(time);if(transportPlay){transportPlay.textContent=playing?'Pause':'Play';transportPlay.setAttribute('aria-pressed',String(playing));}if(ambientLabel)ambientLabel.textContent=`${time.toFixed(3)} s`; if (timeLabel) timeLabel.textContent = `${time.toFixed(3)} / ${(sequence()?.duration ?? 0).toFixed(3)} s · frame ${Math.round(time * 60)}`; }
  function previewRequest(composition: Composition, overlay: boolean, scale: number, frame?: TimelineFrame): PreviewRequest {
    const timeline = currentTimeline(),documents=viewport.dragging&&editorSelection.document?model.previewDocuments(editorSelection.document,viewport.dragging.pending):new Map(documentsForView().map(d=>[d.id,d.value]));
    return {workspace:timeline&&!cameraPreview?{x:sequenceNav.x,h:sequenceNav.y,zoom:sequenceNav.zoom,...(painting.workspaceAnchor?.document===currentId?{anchorX:painting.workspaceAnchor.x,anchorH:painting.workspaceAnchor.h}:{})}:undefined,sourceVersion:model.sourceVersion,transient:viewport.dragging?{document:compositionDocument()!.id,composition:viewport.dragging.pending}:undefined,documents, composition: copy(composition), frame, timeline, sequenceId: timeline ? sequenceId : undefined, time, reduced,overlays:overlay,objectOutlines:overlay&&showObjectOutlines,selectedId:Object.entries(painting.result?.sources??{}).find(([,source])=>source.document===compositionDocument()?.id&&source.instance===editorSelection.instance)?.[0]??editorSelection.instance, player: true, hidden: [...hiddenIn(compositionDocument()?.id)], environment: { ...environment, ...(zoomable() ? { renderScale: scale } : {}) } };
  }
    const previewRenderer=createPreviewRenderer({get reduced(){return reduced;},get disposed(){return disposed;},get painting(){return painting;},get viewCompositionDocument(){return viewCompositionDocument;},get previewError(){return previewError;},get current(){return current;},get canvas(){return canvas;},get syncWorldState(){return syncWorldState;},get currentTimeline(){return currentTimeline;},get selectedDocumentId(){return editorSelection.document;},get viewport(){return viewport;},get evaluationContext(){return evaluationContext;},get sequence(){return sequence;},get sequenceId(){return sequenceId;},get time(){return time;},get previewRequest(){return previewRequest;},get zoomable(){return zoomable;},get crop(){return crop;},get currentId(){return currentId;},get sizeCanvas(){return sizeCanvas;},get baseWidth(){return baseWidth;},get baseHeight(){return baseHeight;},get config(){return config;},get viewZoom(){return viewZoom;},get overlays(){return overlays;},get updateRenderStatus(){return updateRenderStatus;},get placeHover(){return placeHover;},get placeJoined(){return placeJoined;},get comparing(){return comparing;},get documentsForView(){return documentsForView;},get compareId(){return compareId;},get stage(){return stage;},get compareCanvas(){return compareCanvas;}});
  function draw(advance=false){return previewRenderer.draw(advance);}
  function refresh() { return withViewDocuments(() => { if (disposed) return; if(currentId&&!documentsForView().some(d=>d.id===currentId)){currentId=documentsForView().find(d=>d.kind==='composition')?.id??'';editorSelection.instance='';editorSelection.document='';stopPlay();} const timeline = currentTimeline(); if (timeline && !timeline.sequences.some(s => s.id === sequenceId)) sequenceId = timeline.sequences[0]?.id ?? ''; const seq = sequence(); if (seq) { time = Math.max(0, Math.min(time, seq.duration)); loopTo = Math.min(loopTo || seq.duration, seq.duration); if (loopFrom >= loopTo) loopFrom = 0; } perfMeasure('editor.header', refreshHeader); perfMeasure('editor.options', refreshOptions); refreshViewportTools(); perfMeasure('editor.outline', refreshLeft); playHandle?.refresh?.(); perfMeasure('editor.inspector', refreshRight); perfMeasure('editor.timeline', refreshTimeline); void draw(); }); }
  /** The chosen saved world state, if any; its values override the preview environment on every draw. */
  function syncWorldState() { const state = worldState(); if (state) Object.assign(environment, state.environment); }
  function worldState() { const scene = sceneId(); if (!config.worldStates || !scene || current()?.kind !== 'composition') return undefined; const id = config.worldStates.selected(scene, documentsForView()); return id ? config.worldStates.list(scene, documentsForView()).find(state => state.id === id) : undefined; }
  function compareOptions() { const doc = compositionDocument(); return doc && config.compareWith ? config.compareWith((doc.value as Composition).scene, documentsForView()) : []; }
  function comparing() { return !!compareId && zoomable() && compareOptions().some(o => o.id === compareId); }
  function zoomable() { return current()?.kind === 'composition' && !currentTimeline(); }
  function sizeCanvas(width: number, height: number) { if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; } canvas.style.setProperty('--ratio', String(width / height)); canvas.style.setProperty('--fit-ratio', String(width / (zoomable() && crop && painting.cropHeight ? painting.cropHeight : baseHeight))); }
  const coordinates = (event: { clientX: number; clientY: number }) => { return canvasPoint(event,canvas.getBoundingClientRect(),canvas.width,canvas.height); };
  /** Small artwork gets a minimum target; the smallest box under the pointer wins over the room behind it. */
  const hitTest=(point:{x:number;y:number})=>hitTestArtwork(painting.result,point,16*canvas.width/Math.max(1,canvas.getBoundingClientRect().width));
  function placeHover() {
    const hovered=painting.result?.sources?.[viewport.hoverId],isSelected=hovered?hovered.document===compositionDocument()?.id&&hovered.instance===editorSelection.instance:viewport.hoverId===editorSelection.instance;
    const box = viewport.hoverId && !isSelected ? painting.result?.bounds.find(b => b.id === viewport.hoverId) : undefined; hoverBox.hidden = !box; if (!box) return;
    // The overlay lives outside the scrolling stage so it can never add scrollbars; the frame clips it.
    const frame = stageWrap.getBoundingClientRect(), at = canvas.getBoundingClientRect(), scale = at.width / canvas.width, source=painting.result?.sources?.[box.id],document=source?model.get(source.document):compositionDocument(),node=document&&flatten(document.value as Composition).find(x=>x.node.id===(source?.instance??box.id))?.node;
    const left = at.left - frame.left + box.x * scale, top = at.top - frame.top + box.y * scale;
    Object.assign(hoverBox.style, { left: `${left}px`, top: `${top}px`, width: `${box.width * scale}px`, height: `${box.height * scale}px` });
    hoverBox.dataset.label = node ? `${node.id} · ${config.registry.get(node.type).label}` : box.id;
    hoverBox.toggleAttribute('data-below', top < 22); hoverBox.toggleAttribute('data-right', left > frame.width * .6);
  }
  function updateRenderStatus(){renderStatus.hidden=!playHost.hidden;if(renderStatus.hidden)return;const now=performance.now();if(now-statusUpdatedAt<250)return;statusUpdatedAt=now;if(now-renderWindow>=500){renderFps=painting.renderCount*1000/(now-renderWindow);painting.renderCount=0;renderWindow=now;}const scene=painting.result?.camera??painting.result?.regions?.find(region=>region.active);renderStatus.textContent=(scene?'Scene: '+scene.label+' · ':'')+(!(playing||animating||viewport.dragging?.armed)?'Paused':renderFps.toFixed(0)+' render fps')+' · '+painting.lastPaintMs.toFixed(1)+' ms';renderStatus.title='Completed editor renders per second and CPU render submission time; not GPU/display FPS';}
  const navigable=()=>current()?.kind==='composition';
  function zoomTo(next: number, anchor?: { clientX: number; clientY: number }) {
    if(currentTimeline()){if(cameraPreview)return;const rect=canvas.getBoundingClientRect(),point=anchor??{clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};Object.assign(sequenceNav,zoomWorkspace(sequenceNav,next,{x:point.clientX-rect.left-rect.width/2,y:point.clientY-rect.top-rect.height/2},canvas.width/rect.width/(painting.result?.workspaceScale??1)));refreshViewportTools();void draw();return;}
    if (!zoomable()) return; const previous = viewZoom; viewZoom = Math.round(Math.min(8, Math.max(.25, next)) * 100) / 100; if (viewZoom === previous) return;
    const rect = canvas.getBoundingClientRect(), stageRect = stage.getBoundingClientRect(), at = anchor ?? { clientX: Math.max(rect.left, stageRect.left) + Math.min(rect.width, stageRect.width) / 2, clientY: Math.max(rect.top, stageRect.top) + Math.min(rect.height, stageRect.height) / 2 };
    const ax = (at.clientX - rect.left) * canvas.width / rect.width, fromBottom = rect.bottom - at.clientY;
    environment.cameraX = Math.round((Number(environment.cameraX ?? 0) + ax / previous - ax / viewZoom) * 100) / 100;
    sizeCanvas(baseWidth, Math.round((crop && painting.cropHeight ? painting.cropHeight : baseHeight) * viewZoom));
    const after = canvas.getBoundingClientRect(); stage.scrollTop += after.bottom - (at.clientY + fromBottom * viewZoom / previous);
    refreshViewportTools(); refreshOptions(); void draw();
  }
  /** Frames the scene and the scenes joined to it (the preview's extent), zooming out as far as needed. */
  function fitJoined() {
    const extent = painting.result?.extent; if (!extent || !zoomable()) return; environment.showJoined = true;
    const span = Math.max(1, extent.to - extent.from); viewZoom = Math.round(Math.min(1, Math.max(.25, baseWidth / (span * 1.04))) * 100) / 100;
    environment.cameraX = Math.round(extent.from - (baseWidth / viewZoom - span) / 2); stage.scrollTop = 0; refreshViewportTools(); refreshOptions(); void draw();
  }
  /** A tag over each joined scene in the preview: its name, which side it joins on, and a button that opens it. */
  function placeJoined() {
    joinedLayer.replaceChildren();if(currentTimeline()){const rect=canvas.getBoundingClientRect(),frame=stageWrap.getBoundingClientRect(),scale=rect.width/canvas.width;if(painting.result?.camera){const camera=painting.result.camera,box=element('div','sequence-camera-guide');const pick=button('Camera · '+camera.label,()=>selectTimeline({kind:'camera'}),'Select the game camera');pick.setAttribute('aria-label','Select game camera');pick.style.pointerEvents='auto';pick.setAttribute('aria-pressed',String(cameraSelected()));box.append(pick);Object.assign(box.style,{left:(rect.left-frame.left+camera.x*scale)+'px',top:(rect.top-frame.top+camera.y*scale)+'px',width:camera.width*scale+'px',height:camera.height*scale+'px'});joinedLayer.append(box);}for(const group of left.querySelectorAll('.outline-source.active-scene'))group.classList.remove('active-scene');for(const region of painting.result?.regions??[]){left.querySelector<HTMLElement>(`.outline-source[data-document="${region.document}"]`)?.classList.toggle('active-scene',region.active);if(!showSceneBounds)continue;const box=element('div','scene-boundary'+(region.active?' active':''),region.label);Object.assign(box.style,{left:(rect.left-frame.left+region.x*scale)+'px',top:(rect.top-frame.top+region.y*scale)+'px',width:region.width*scale+'px',height:region.height*scale+'px'});joinedLayer.append(box);}const cameraOwner=painting.result?.camera&&outlineSceneOwners.get(painting.result.camera.scene);if(cameraOwner)left.querySelector<HTMLElement>(`.outline-source[data-document="${cameraOwner}"]`)?.classList.add('active-scene');updateRenderStatus();return;}const list = painting.result?.joined ?? []; if (!list.length || !playHost.hidden || comparing()) return;
    const frame = stageWrap.getBoundingClientRect(), at = canvas.getBoundingClientRect(), scale = at.width / canvas.width, arrow = { left: '←', right: '→', above: '↑', below: '↓' } as const;
    for (const j of list) {
      const left = Math.max(at.left, frame.left, at.left + j.x * scale), right = Math.min(at.right, frame.right, at.left + (j.x + j.width) * scale); if (right - left < 60) continue;
      const top = Math.max(frame.top + 6, at.top + j.y * scale + 6), tag = element('div', 'joined-tag');
      tag.append(element('span', '', `${j.label} · joined ${arrow[j.side]}`), button(`Go to ${j.label}`, () => openScene(j.zone), `Open ${j.label} in the editor (or double-click it in the preview). Joined scenes are read-only here.`));
      tag.setAttribute('aria-label', `${j.label}, joined scene`); Object.assign(tag.style, { left: `${left - frame.left + 6}px`, top: `${top - frame.top}px`, maxWidth: `${Math.max(60, right - left - 12)}px` }); joinedLayer.append(tag);
    }
  }
  function fit() {if(currentTimeline()){sequenceNav.zoom=1;sequenceNav.x=0;sequenceNav.y=0;refreshViewportTools();void draw();return;}viewZoom = 1; environment.cameraX = 0; painting.cropFor = ''; stage.scrollTop = 0; refreshViewportTools(); refreshOptions(); void draw(); }
  function refreshViewportTools() {
    const objectBounds=button('Object outlines',()=>{showObjectOutlines=!showObjectOutlines;try{localStorage.setItem('access-denied.editor.object-outlines',String(showObjectOutlines));}catch{/* optional preview preference */}refreshViewportTools();void draw();},'Show bounds of all visible objects; selection handles remain visible');objectBounds.setAttribute('aria-pressed',String(showObjectOutlines));
    viewportTools.hidden=!navigable();if(!navigable())return;if(currentTimeline()){const boundaries=button('Scene borders',()=>{showSceneBounds=!showSceneBounds;placeJoined();refreshViewportTools();});boundaries.setAttribute('aria-pressed',String(showSceneBounds));if(cameraPreview){viewportTools.replaceChildren(button('Workspace',()=>{cameraPreview=false;refreshViewportTools();refreshOptions();void draw();}),boundaries,objectBounds);return;}viewportTools.replaceChildren(button('−',()=>zoomTo(sequenceNav.zoom/1.25)),button(Math.round(sequenceNav.zoom*100)+'%',()=>fit()),button('+',()=>zoomTo(sequenceNav.zoom*1.25)),button('Fit',fit),button('Frame camera',()=>{if(painting.result?.camera){const focus=painting.result.camera.focus;sequenceNav.x=focus.x;sequenceNav.y=focus.h;sequenceNav.zoom=focus.zoom;refreshViewportTools();void draw();}}),boundaries,objectBounds);return;}
    const level = button(`${Math.round(viewZoom * 100)}%`, () => zoomTo(1), 'Actual size (0)'); level.className = 'zoom-level';
    const cropToggle = button('Crop', () => { crop = !crop; painting.cropFor = ''; refreshViewportTools(); void draw(); }, 'Crop the preview to the artwork height'); cropToggle.setAttribute('aria-pressed', String(crop));
    viewportTools.replaceChildren(button('−', () => zoomTo(viewZoom / 1.25), 'Zoom out (−)'), level, button('+', () => zoomTo(viewZoom * 1.25), 'Zoom in (+)'), button('Fit', fit, 'Fit the scene (F)'),cropToggle,objectBounds);
  }
  /** A small dialog beside the scene picker: name, ID (follows the name until edited) and place, then the scene opens. */
  function openNewScene() {
    const setup = config.newScene; if (!setup) return; const api = authoringApi(), where = setup.places(api);
    const dialog = element('dialog', 'confirm-dialog'), error = element('p', 'error'), name = element('input'), id = element('input'), place = select(where.places.map(value => ({ value, label: value })), where.initial, () => {});
    const preset=select([{value:'',label:'Empty scene'},...(setup.presets??[])],'',()=>{});
    error.setAttribute('role', 'alert'); name.value = 'New scene'; let idEdited = false;
    const slug = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    id.value = slug(name.value); name.oninput = () => { if (!idEdited) id.value = slug(name.value); }; id.oninput = () => { idEdited = true; };
    const field = (text: string, input: HTMLElement) => { const row = element('label'); row.append(element('span', '', text), input); return row; };
    const cancel = button('Cancel', () => dialog.close()), create = button('Create scene', () => {
      try { setup.create(api, id.value.trim(), name.value.trim(), place.value,preset.value||undefined); } catch (e) { error.textContent = message(e); return; }
      dialog.close(); refresh(); openScene(id.value.trim());
    }); create.className = 'primary';
    const actions = element('div', 'dialog-actions'); actions.append(cancel, create);
    const form = element('form'); form.onsubmit = event => { event.preventDefault(); create.click(); };
    form.append(element('h2', '', 'New scene'), element('p', '', 'An ordinary scene with a default starting state, in the place you choose. Build it with Layout, Logic and Play.'), field('Name', name), field('ID', id), field('Place', place), ...(setup.presets?[field('Preset',preset)]:[]), error, actions);
    dialog.append(form); dialog.onclose = () => dialog.remove(); root.append(dialog); dialog.showModal(); name.select();
  }
  /** Validation reasons for a refused deletion, in the terms of the editor. */
  function deletionProblem(problem: string, removed: Instance[]) {
    const actors = removed.filter(node => { try { const e = config.registry.get(node.type); return ['Human', 'Animal', 'Robot'].includes(layerRole(node.type, e.label, e.category)); } catch { return false; } }).map(node => node.id);
    if (/Actor source\/artwork count mismatch/.test(problem) && actors.length) return `${actors.join(', ')} ${actors.length === 1 ? 'is a character' : 'are characters'} of this scene. Remove ${actors.length === 1 ? 'it' : 'them'} in Logic › Interactions & story first, or attach ${actors.length === 1 ? 'it' : 'them'} to something else.`;
    const missing = /Missing (manifest|device) artwork: (\S+)/.exec(problem);
    if (missing) return `${missing[2]} is used by ${missing[1] === 'device' ? 'a device' : 'the scene’s manifest (an exit, device or spawn)'} in Logic. Remove that use there first, or attach ${missing[2]} to something else.`;
    return `${problem}. Remove or move that use first (in Logic, or the scene’s exits).`;
  }
  /** Deletes the selection. When attached artwork would go with it, a dialog lists it and asks first. */
  function deleteSelected() {
    const doc = compositionDocument(), id = editorSelection.instance; if (!doc || !id) return;
    let ids: string[]; try { ids = model.removal(doc.id, id, true); } catch (error) { notice(message(error), true); return; }
    const remove = () => run(() => { model.remove(doc.id, id, true); if (editorSelection.instance === id) editorSelection.instance = ''; });
    if (ids.length === 1) { remove(); return; }
    // Attached pieces first (what the user may not expect to lose), then the piece's own parts.
    const nodes = flatten(doc.value as Composition).map(row => row.node), own = new Set<string>(), collect = (node: Instance) => { own.add(node.id); node.children?.forEach(collect); }; collect(nodes.find(node => node.id === id)!);
    const others = [...ids.filter(other => !own.has(other)), ...ids.filter(other => own.has(other) && other !== id)].map(other => nodes.find(node => node.id === other)!), problem = model.trial(() => model.remove(doc.id, id, true));
    const dialog = element('dialog', 'confirm-dialog'), list = element('ul');
    for (const node of others) { let label = node.type; try { label = config.registry.get(node.type).label; } catch { /* unregistered: show the type */ } list.append(element('li', '', `${node.id} · ${label}`)); }
    let body: HTMLElement = list;
    if (others.length > 6) { const fold = element('details'); fold.append(element('summary', '', `${others.slice(0, 3).map(node => node.id).join(', ')} and ${others.length - 3} more`), list); body = fold; }
    const cancel = button('Cancel', () => dialog.close()), confirm = button('Delete all', () => { dialog.close(); remove(); }); confirm.className = 'danger'; confirm.disabled = !!problem;
    const actions = element('div', 'dialog-actions'), attached = ids.length - own.size; actions.append(cancel, confirm);
    dialog.append(element('h2', '', `Delete ${id}?`), element('p', '', `Deleting this will also delete ${others.length} other item${others.length === 1 ? '' : 's'}${attached ? ` (${attached} attached to it)` : ''}:`), body);
    if (problem) dialog.append(element('p', 'error', `It can’t be deleted yet: ${deletionProblem(problem, others)}`));
    dialog.append(actions);
    dialog.onclose = () => { dialog.remove(); canvas.focus({ preventScroll: true }); }; root.append(dialog); dialog.showModal(); cancel.focus();
  }
  const select_ = (id: string) => perfMeasure('editor.selection', () => withViewDocuments(() => { editorSelection.timeline=undefined;if(!id)revealed='';const resolved=sourceSelection(painting.result,id,viewCompositionDocument()?.id??currentId);editorSelection.document=resolved.document;editorSelection.instance=resolved.instance;if(painting.result?.sources?.[id])timelineView.collapsed.delete(editorSelection.instance); viewport.hoverId = ''; if (compact.matches && id) showPanel('properties'); refreshRight(); updateOutlineSelection(); if (currentTimeline()) {refreshLeft();refreshTimeline();} void draw(); }));
  /**
   * Stage input: a left press on artwork selects it at once and drags it after a 3 px move; a left press on empty
   * space (the picture, the dark area around it or the comparison) deselects. Middle and right drag pan (right also
   * covers a pen's barrel button); one finger pans on empty space and two fingers pinch-zoom.
   */
  const disposeViewportInput=mountViewportInput({get navigable(){return navigable;},get viewport(){return viewport;},get currentTimeline(){return currentTimeline;},get sequenceNav(){return sequenceNav;},get environment(){return environment;},get stage(){return stage;},get canvas(){return canvas;},get selectedId(){return editorSelection.instance;},get select_(){return select_;},get closePicker(){return closePicker;},get viewZoom(){return viewZoom;},get coordinates(){return coordinates;},get hitTest(){return hitTest;},get preview(){return painting.result;},get compositionDocument(){return compositionDocument;},get zoomTo(){return zoomTo;},get cameraPreview(){return cameraPreview;},get draw(){return draw;},get placeHover(){return placeHover;},get snap(){return snap;},get config(){return config;},get dragPreviewDirty(){return dragPreviewDirty;},set dragPreviewDirty(value){dragPreviewDirty=value;},get notice(){return notice;},get refreshOptions(){return refreshOptions;},get run(){return run;},get model(){return model;},get placeJoined(){return placeJoined;},get openScene(){return openScene;},get compareCanvas(){return compareCanvas;},get editInstance(){return editInstance;},get current(){return current;},get openPicker(){return openPicker;},get fit(){return fit;}});
  const unload = (event: BeforeUnloadEvent) => { if (model.dirty()) { event.preventDefault(); event.returnValue = ''; } };
  const keyboard = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || !root.contains(document.activeElement)) return;
    const tag = (event.target as HTMLElement).tagName; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && event.key.toLowerCase() !== 's') return;
    if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    else if (event.key.toLowerCase() === 'z') { event.preventDefault(); run(() => event.shiftKey ? model.redo() : model.undo()); }
    else if (event.key.toLowerCase() === 'y') { event.preventDefault(); run(() => model.redo()); }
  };
  /** Single keys in the Scene view (Delete, H for hack vision…), unless the user is typing in a field or a dialog is open. */
  const shortcuts = (event: KeyboardEvent) => {
    if(group==='layout'&&playHost.hidden&&root.isConnected&&current()?.kind==='composition'){const action=animationShortcut(event);if(action){event.preventDefault();if(action==='toggle')toggleAnimation();else seekTime('frames'in action?(Math.round(time*60)+action.frames)/60:time+action.seconds);return;}}
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat || group !== 'layout' || !root.isConnected) return;
    const target = event.target as HTMLElement; if (target.closest('input, textarea, select, dialog, [contenteditable=""], [contenteditable="true"]')) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && editorSelection.instance && current()?.kind === 'composition' && playHost.hidden) { event.preventDefault(); deleteSelected(); return; }
    const control = (config.environmentControls ?? []).find(c => c.kind === 'boolean' && c.shortcut?.toLowerCase() === event.key.toLowerCase()); if (!control) return;
    event.preventDefault(); environment[control.key] = !environment[control.key]; refreshOptions(); void draw();
  };
  const closeMenu = (event: Event) => { const menu = header.querySelector<HTMLDetailsElement>('details.menu'); if (menu?.open && (!menu.contains(event.target as Node) || (event.target as HTMLElement).closest('.menu-items button'))) menu.open = false; };
  window.addEventListener('beforeunload', unload); root.addEventListener('keydown', keyboard); document.addEventListener('keydown', shortcuts); document.addEventListener('click', closeMenu);
  let previous = performance.now(), frameId = 0;
  const tick = (now: number) => { if (disposed) return; const delta = Math.min(0.1, (now - previous) / 1000); previous=now;updateRenderStatus();if(dragPreviewDirty){dragPreviewDirty=false;void draw();}const seq=sequence(); if (animating && !seq && group === 'layout' && current()?.kind === 'composition') { time += delta*playbackSpeed; updateTime();void draw(true); } if (playing && seq && group==='layout' && playHost.hidden) { const end = loop ? loopTo || seq.duration : seq.duration; time += delta*playbackSpeed; if (time >= end) { if (loop) time = loopFrom + (time - loopFrom) % Math.max(1 / 60, end - loopFrom); else { time = seq.duration; playing = false; refreshTimeline(); if(editorSelection.timeline?.kind==='track'||editorSelection.timeline?.kind==='camera')refreshRight(); } } updateTime(); void draw(playing); } frameId = requestAnimationFrame(tick); };
  frameId = requestAnimationFrame(tick); void load();
  const disposePerformance = mountPerformancePanel(root, () => ({ editor: true, scene: sceneId(), selected: editorSelection.instance, zoom: viewZoom, comparison: compareId }), location.hash.includes('profile-editor'));
  return { model, openScene, reload: load, save, dispose() { disposed = true;disposeViewportInput();timelineGrid?.dispose(); disposePerformance(); playHandle?.(); playHandle = undefined; cancelAnimationFrame(frameId); cleanupWorld?.(); cleanupAssets?.(); disposeInspector(); thumbnails?.dispose(); workbenches.forEach(item => item.dispose?.()); window.removeEventListener('beforeunload', unload); root.removeEventListener('keydown', keyboard); document.removeEventListener('keydown', shortcuts); document.removeEventListener('click', closeMenu); root.remove(); } };
}
