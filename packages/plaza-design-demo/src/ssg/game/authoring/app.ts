import {mutableActorArtwork} from '../engine/gameplay/native-actor-bindings';
import type {DocumentProjection} from './document-projection';
/** Local static/animated composition editor. Drawing belongs to the injected game preview. */
import { ArtRegistry, type Composition, type Instance, type Field, type Value, type Point, type Properties } from '../art/core/composition';
import { evaluateTimeline, validateTimeline, type TimelineContext, type TimelineDocument, type TimelineFrame, type Sequence, type Target, type Keyframe } from '../art/core/timeline';
import { composerStyles } from './styles';
import { preserveBoundIdentity } from './bound-identity';
import type { Light } from '../world/light';
import type { Climate, Weather } from '../world/weather';
import { mountAssetBrowser, assetInventory, filterAssets, type AssetBrowserSession, type AssetEntry, type AssetUsage, type AssetPreviewReport } from './asset-browser';
import { createThumbnails } from './asset-thumbnails';
import type { Environment } from '../art/core/composition';
import { createDocumentBundle, readDocumentBundle } from './document-bundle';
import { LAYER_ROLES, layerRole } from './layer-roles';

export interface EditorDocument { id: string; kind: 'composition' | 'timeline' | 'world' | 'behavior' | 'gameplay' | 'scene' | 'fixtures' | 'conversations' | 'city' | 'transport' | 'devices'; revision: string; value: unknown }
export interface PreviewRequest { documents?:ReadonlyMap<string,unknown>; composition: Composition; frame?: TimelineFrame; timeline?: TimelineDocument; sequenceId?: string; time: number; reduced: boolean; overlays: boolean; selectedId?: string; lighting?: Light; weather?: Weather; climate?: Climate | null; environment: Record<string, string | number | boolean> }
export interface PreviewResult { bounds: { id: string; x: number; y: number; width: number; height: number }[]; deltaToLocal?(id: string, dx: number, dy: number): Point; artwork?: { composition: Composition; environment: Environment } }
/** `quick` controls sit in the Scene toolbar; `choices` render as a segmented row of named presets. The rest live under More. */
export interface EnvironmentControl { key: string; label: string; kind: 'number' | 'boolean' | 'select' | 'text'; options?: string[]; min?: number; max?: number; step?: number; quick?: boolean; choices?: { label: string; value: number | string }[] }
/** One inspector tab beside Appearance: the logic, device or wiring that belongs to the selection (or to the scene when nothing is selected). */
export interface InspectorSection { id: string; label: string; title?: string; mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle }
export interface WorkbenchContext {
  documents: EditorDocument[]; openScene(scene: string): void; openInstance(document: string, instance: string): void;
  /** The scene chosen in the header; scene-mode workbenches follow it instead of keeping their own picker. */
  scene?: string;
  /** Set when the panel was opened by an action that asks it to start (the Scene toolbar's Play). */
  autostart?: boolean;
  authoring?: { get(id: string): EditorDocument; edit(id: string, label: string, value: unknown): void; editDocuments?(changes:{id:string;value:unknown}[],label:string):void; undo(): void; redo(): void; save(): Promise<void>; reload(): Promise<void>; dirty(id: string): boolean };
}
export type WorkbenchHandle = (() => void) & { refresh?(): void };
export interface ComposerConfig {
  registry: ArtRegistry; api?: { url: string; token: string }; documents?: EditorDocument[]; viewport?: { width: number; height: number };
  preview: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult | Promise<PreviewResult> };
  destinations?: TimelineContext['destinations']; motionTracks?: TimelineContext['motionTracks']; clips?: TimelineContext['clips'];
  timelineContext?(base: TimelineContext, preview: { time: number; reduced: boolean; sequenceId: string; environment: Record<string, string | number | boolean>; viewport: { width: number; height: number }; timeline?: TimelineDocument }): TimelineContext;
  projections?:readonly DocumentProjection[];
  destinationsFor?(documents:EditorDocument[]):TimelineContext['destinations'];
  validateDocument?(document: EditorDocument, documents: EditorDocument[]): void;
  initialEnvironment?: Record<string, string | number | boolean>; environmentControls?: EnvironmentControl[];
  worldPanel?(host: HTMLElement, openScene: (scene: string) => void, documents: EditorDocument[], scene?: string): void | (() => void);
  assetPreview?(canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, documents: EditorDocument[], settings: Pick<PreviewRequest, 'time' | 'reduced' | 'environment'>): string | AssetPreviewReport | Promise<string | AssetPreviewReport>;
  /** Display name for a composition's scene id in the scene picker and empty states. */
  sceneLabel?(scene: string): string;
  /** Source documents that belong to a scene beyond its composition, for unsaved-change markers. */
  sceneDocuments?(scene: string,documents:readonly EditorDocument[]): string[];
  /** The scene picker's structure: districts, their places, each place's scenes. Scenes left out are listed under "Other scenes". */
  sceneTree?(documents: readonly EditorDocument[]): { label: string; places: { label: string; scenes: string[] }[] }[];
  workbenches?: WorkbenchConfig[];
  /** Tabs for the Scene inspector. Called for the open scene with the selected instance, or none for the scene itself. */
  inspector?(scene: string, instance: Instance | undefined, documents: readonly EditorDocument[]): InspectorSection[];
}
/**
 * `area: 'scene'` panels are modes of the selected scene (Logic, Play; `wiring` panels sit under Logic)
 * and receive it through `showScene` before mounting; `supports` decides whether the scene has
 * anything to show. `library` panels are artwork viewers, `world` panels edit what is shared between
 * scenes (city, travel, opening, networks, shared dialogue), and `labs` panels are developer test beds.
 */
export interface WorkbenchConfig {
  id: string; title: string; label?: string; documentDependent?: boolean; documentIds?: string[]; primaryDocumentId?: string; authoring?: boolean;
  area?: 'scene' | 'library' | 'world' | 'labs'; mode?: 'logic' | 'wiring' | 'play'; supports?(scene: string,documents:readonly EditorDocument[]): boolean; showScene?(scene: string,documents:readonly EditorDocument[]): void; unsupported?: string;
  mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle;
}
interface Snapshot { id: string; value: unknown }
interface Command { label: string; before: Snapshot[]; after: Snapshot[] }
const copy = <T>(value: T): T => structuredClone(value);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const flatten = (doc: Composition) => { const list: { node: Instance; depth: number }[] = []; const visit = (nodes: Instance[], depth: number) => nodes.forEach(node => { list.push({ node, depth }); visit(node.children ?? [], depth + 1); }); visit(doc.instances, 0); return list; };
const message = (e: unknown) => e instanceof Error ? e.message : String(e);
/** Pure editing history; saved revisions are metadata and are deliberately outside undo history. */
export class ComposerModel {
  private documents = new Map<string, EditorDocument>();
  private saved = new Map<string, unknown>();
  private past: Command[] = [];
  private future: Command[] = [];
  constructor(readonly registry: ArtRegistry, readonly context: Omit<TimelineContext, 'registry' | 'compositions'> = {}, readonly validateDocument?: ComposerConfig['validateDocument'],readonly projections:readonly DocumentProjection[]=[],readonly destinationsFor?:ComposerConfig['destinationsFor']) {}
  load(documents: EditorDocument[]) {
    const next = new Map<string, EditorDocument>();
    for (const doc of documents) { if (next.has(doc.id)) throw new Error('Duplicate document id'); next.set(doc.id, copy(doc)); }
    this.validate(next); this.documents = next; this.saved = new Map([...next].map(([id, d]) => [id, copy(d.value)])); this.past = []; this.future = [];
  }
  private expanded(documents:ReadonlyMap<string,EditorDocument>){
    const result=new Map(documents);for(const projection of this.projections){const source=documents.get(projection.sourceId);if(!source)throw new Error('Missing projection source: '+projection.sourceId);
      for(const child of projection.children(source)){if(result.has(child.id))throw new Error('Duplicate projected document ID: '+child.id);result.set(child.id,child);}
    }return result;
  }
  private projected(id:string,documents:ReadonlyMap<string,EditorDocument>=this.documents){
    for(const projection of this.projections){const source=documents.get(projection.sourceId);if(source&&projection.children(source).some(d=>d.id===id))return projection;}
  }
  list() { return [...this.expanded(this.documents).values()].map(copy); }
  get(id: string) { const doc = this.expanded(this.documents).get(id); if (!doc) throw new Error(`Unknown document: ${id}`); return copy(doc); }
  timelineContext(documents = this.documents): TimelineContext {
    const compositions: Record<string, Composition> = {};
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'composition') compositions[doc.id] = doc.value as Composition;
    return { ...this.context, ...(this.destinationsFor?{destinations:this.destinationsFor([...this.expanded(documents).values()])}:{}), registry: this.registry, compositions };
  }
  private validate(documents: Map<string, EditorDocument>) {
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'composition') this.registry.validate(doc.value);
    const ctx = this.timelineContext(documents);
    for (const doc of this.expanded(documents).values()) if (doc.kind === 'timeline') validateTimeline(doc.value, ctx);
    const all = [...this.expanded(documents).values()];
    for (const doc of all) {
      if ((['behavior','gameplay','scene','fixtures','conversations','city','transport','devices'].includes(doc.kind)) && !this.validateDocument) throw new Error('Behavior/gameplay/scene/fixture documents require their registered validator');
      this.validateDocument?.(doc, all);
    }
  }
  edit(id: string, label: string, operation: (value: unknown) => unknown) {
    const projection=this.projected(id);if(projection){const value=operation(this.get(id).value);this.checkCompositionEdit(this.get(id),value);this.edit(projection.sourceId,label,source=>projection.replace(source,id,value));return;}
    const doc = this.get(id); if (doc.kind === 'world') throw new Error('World structure is read-only in this composer');
    const value = operation(copy(doc.value)); if (equal(value, doc.value)) return;
    if (doc.kind === 'composition') {
      const before = doc.value as Composition, after = this.registry.validate(value);
      if (after.scene !== before.scene) throw new Error('Scene identity cannot be changed by the local composer');
      preserveBoundIdentity(before, after,this.registry);
    }
    const next = new Map(this.documents); next.set(id, { ...doc, value }); this.validate(next);
    this.documents = next; this.past.push({ label, before: [{ id, value: doc.value }], after: [{ id, value: copy(value) }] });
    if (this.past.length > 100) this.past.shift(); this.future = [];
  }
  private checkCompositionEdit(doc:EditorDocument,value:unknown){
    if(doc.kind==='composition'){const composition=this.registry.validate(value);if(composition.scene!==(doc.value as Composition).scene)throw new Error('Scene identity cannot be changed');preserveBoundIdentity(doc.value as Composition,composition,this.registry);}
  }
  /** Downloaded edits enter one validated history transaction; projected edits update their source owner. */
  importDocuments(changes: { id: string; value: unknown }[],label='Import downloaded edits') {
    const next=new Map(this.documents),ids=new Set<string>(),roots=new Set<string>();
    for(const item of changes){if(ids.has(item.id))throw new Error('Duplicate imported document');ids.add(item.id);
      const doc=this.get(item.id);if(doc.kind==='world')throw new Error('World structure is read-only');const value=copy(item.value);this.checkCompositionEdit(doc,value);
      const projection=this.projected(item.id),rootId=projection?.sourceId??item.id;
      if((projection&&ids.has(rootId))||(!projection&&changes.some(c=>this.projected(c.id)?.sourceId===item.id)))throw new Error('Import must use source owners or projected children, not both');
      const root=next.get(rootId)!;next.set(rootId,{...root,value:projection?projection.replace(copy(root.value),item.id,value):value});roots.add(rootId);
    }
    const before:Snapshot[]=[],after:Snapshot[]=[];for(const id of roots){if(equal(next.get(id)!.value,this.documents.get(id)!.value))continue;before.push({id,value:copy(this.documents.get(id)!.value)});after.push({id,value:copy(next.get(id)!.value)});}
    if(!before.length)return;this.validate(next);this.documents=next;this.past.push({label,before,after});if(this.past.length>100)this.past.shift();this.future=[];
  }
  private restore(snapshots: Snapshot[]) { const next = new Map(this.documents); for (const item of snapshots) next.set(item.id, { ...this.get(item.id), value: copy(item.value) }); this.validate(next); this.documents = next; }
  undo() { const command = this.past[this.past.length - 1]; if (!command) return; this.restore(command.before); this.past.pop(); this.future.push(command); }
  redo() { const command = this.future[this.future.length - 1]; if (!command) return; this.restore(command.after); this.future.pop(); this.past.push(command); }
  get canUndo() { return !!this.past.length; } get canRedo() { return !!this.future.length; }
  get undoLabel() { return this.past[this.past.length - 1]?.label ?? ''; }
  dirty(id?:string){if(!id)return [...this.documents].some(([key,d])=>!equal(d.value,this.saved.get(key)));
    const saved=new Map([...this.documents].map(([key,d])=>[key,{...d,value:this.saved.get(key)}]));return !equal(this.expanded(this.documents).get(id)?.value,this.expanded(saved).get(id)?.value);
  }
  edits() { return [...this.documents.values()].filter(d => d.kind !== 'world' && this.dirty(d.id)).map(d => ({ id: d.id, revision: d.revision, value: copy(d.value) })); }
  confirmSaved(documents: EditorDocument[]) { for (const saved of documents) { const current = this.documents.get(saved.id); if (!current) throw new Error('Save returned an unknown document'); current.revision = saved.revision; this.saved.set(saved.id, copy(saved.value)); } }
  updateInstance(id: string, instanceId: string, label: string, edit: (node: Instance) => void) {
    this.edit(id, label, value => { const doc = value as Composition, node = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!node) throw new Error('Selected instance no longer exists'); edit(node); return doc; });
  }
  add(id: string, type: string, placement: Instance['placement'] = { x: 0, h: 0 }) {
    let instanceId = '';
    this.edit(id, 'Add artwork', value => { const doc = value as Composition; instanceId = this.insert(doc, type, placement); return doc; }); return instanceId;
  }
  /** The composition as it would be after `add`, without touching history (used to measure placement). */
  draftAdd(id: string, type: string) { const doc = copy(this.get(id).value as Composition), instanceId = this.insert(doc, type, { x: 0, h: 0 }); return { composition: this.registry.validate(doc), instanceId }; }
  private insert(doc: Composition, type: string, placement: Instance['placement']) {
    const element = this.registry.get(type), instanceId = this.unique(doc, type.replace(/[^a-zA-Z0-9_-]/g, '-')), props: Properties = {};
    for (const [key, field] of Object.entries(element.fields)) props[key] = copy(field.default) as Value;
    const bindings=element.bindingIdentity==='presentation'?Object.fromEntries(Object.entries(element.bindingChoices?.(doc)??{}).filter(([,choices])=>choices.length).map(([key,choices])=>[key,choices[0]])):{};
    doc.instances.push({ id: instanceId, type, props,...(Object.keys(bindings).length?{bindings}:{}), placement: { ...placement }, order: Math.max(-1, ...flatten(doc).map(x => x.node.order)) + 1, pass: element.parts[0] ?? 'backdrop' }); return instanceId;
  }
  private unique(doc: Composition, prefix: string) { const ids = new Set(flatten(doc).map(x => x.node.id)); let i = 1; while (ids.has(`${prefix}-${i}`)) i++; return `${prefix}-${i}`; }
  duplicate(id: string, instanceId: string) {
    let created = '';
    this.edit(id, 'Duplicate artwork', value => {
      const doc = value as Composition, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const duplicate = copy(source), ids = new Map<string, string>();
      const walk = (node: Instance) => { if (Object.keys(node.bindings ?? {}).length&&this.registry.get(node.type).bindingIdentity!=='presentation') throw new Error('Gameplay-bound artwork cannot be duplicated; add a decorative catalog element instead'); const old = node.id; node.id = this.unique(doc, old + '-copy'); ids.set(old, node.id); node.children?.forEach(walk); };
      walk(duplicate); const attach = (node: Instance) => { if (node.attach && ids.has(node.attach.instance)) node.attach.instance = ids.get(node.attach.instance)!; node.children?.forEach(attach); }; attach(duplicate);
      const siblings = (nodes: Instance[]): Instance[] | undefined => nodes.includes(source) ? nodes : nodes.map(n => siblings(n.children ?? [])).find(Boolean);
      duplicate.placement.x += 12; duplicate.order += 1; siblings(doc.instances)!.push(duplicate); created = duplicate.id; return doc;
    }); return created;
  }
  remove(id: string, instanceId: string) {
    this.edit(id, 'Delete artwork', value => {
      const doc = value as Composition, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const removed = new Set<string>(); const visit = (node: Instance) => { if (Object.keys(node.bindings ?? {}).length&&!mutableActorArtwork(doc.scene,node)&&this.registry.get(node.type).bindingIdentity!=='presentation') throw new Error('Resolve gameplay bindings before deleting this artwork'); removed.add(node.id); node.children?.forEach(visit); }; visit(source);
      for (const { node } of flatten(doc)) if (!removed.has(node.id) && node.attach && removed.has(node.attach.instance)) throw new Error(`${node.id} is attached here; detach it first`);
      const filter = (nodes: Instance[]): Instance[] => nodes.filter(node => !removed.has(node.id)).map(node => { if (node.children) node.children = filter(node.children); return node; }); doc.instances = filter(doc.instances); return doc;
    });
  }
}

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const button = (text: string, action: () => void, title?: string) => { const node = element('button', '', text); node.type = 'button'; node.onclick = action; if (title) node.title = title; return node; };
const select = (values: { value: string; label: string }[], value: string, onChange: (v: string) => void) => { const node = element('select'); for (const item of values) { const option = element('option', '', item.label); option.value = item.value; node.append(option); } node.value = value; node.onchange = () => onChange(node.value); return node; };
const label = (text: string, control: HTMLElement) => { const node = element('label'); node.append(element('span', '', text), control); return node; };

export function mountComposer(host: HTMLElement, config: ComposerConfig) {
  const model = new ComposerModel(config.registry, { destinations: config.destinations, clips: config.clips, motionTracks: config.motionTracks }, config.validateDocument, config.projections,config.destinationsFor);
  const root = element('section', 'scene-composer'); root.setAttribute('aria-label', 'Scene and animation composer');
  const style = element('style'); style.textContent = composerStyles; root.append(style);
  const header = element('header'), status = element('div', 'status', 'Loading authoring documents…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const workspace = element('div', 'workspace'), left = element('aside'), center = element('div', 'preview-column'), right = element('aside');
  left.setAttribute('aria-label', 'Scene outline'); right.setAttribute('aria-label', 'Inspector');
  const options = element('div', 'preview-options'), stageWrap = element('div', 'stage-wrap'), stage = element('div', 'preview-stage'), canvas = element('canvas'), previewError = element('div', 'preview-error');
  const viewportTools = element('div', 'viewport-tools'), hoverBox = element('div', 'hover-box'); viewportTools.setAttribute('role', 'group'); viewportTools.setAttribute('aria-label', 'Preview zoom'); hoverBox.hidden = true;
  const picker = element('div', 'add-picker'); picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Add artwork'); picker.hidden = true;
  const baseWidth = config.viewport?.width ?? 960, baseHeight = config.viewport?.height ?? 540;
  canvas.width = baseWidth; canvas.height = baseHeight; canvas.setAttribute('aria-label', 'Game renderer preview. Click artwork to select it, click empty space to deselect, drag the selected artwork to move it, drag elsewhere to pan, Ctrl+wheel or pinch to zoom, Delete removes the selection.'); canvas.tabIndex = 0; previewError.hidden = true;
  const timelineHost = element('section', 'timeline'); timelineHost.setAttribute('aria-label', 'Animation timeline');
  const panelSwitch = element('div', 'panel-switch'); panelSwitch.setAttribute('role', 'group'); panelSwitch.setAttribute('aria-label', 'Editor panel');
  const tools = element('nav', 'tools'); tools.setAttribute('aria-label', 'Editor tools');
  const compact = window.matchMedia('(max-width: 760px)');
  let layerQuery = '', layerSort: 'kind' | 'order' = 'kind'; const roleOpen = new Map<string, boolean>();
  let moreOpen = false, inspectorTab = 'appearance', animating = false, ambientLabel: HTMLElement | undefined;
  let inspectorMount: { key: string; host: HTMLElement; handle?: WorkbenchHandle } | undefined;
  const showPanel = (panel: 'layers' | 'properties') => { root.dataset.panel = panel; for (const item of panelSwitch.children) item.setAttribute('aria-pressed', String((item as HTMLElement).dataset.panel === panel)); };
  for (const [panel, text] of [['layers', 'Outline'], ['properties', 'Inspector']] as const) { const tab = button(text, () => showPanel(panel)); tab.dataset.panel = panel; panelSwitch.append(tab); }
  canvas.style.setProperty('--ratio', String(canvas.width / canvas.height)); showPanel('layers');
  stage.append(canvas); stageWrap.append(stage, hoverBox, viewportTools, picker, previewError); center.append(options, stageWrap, timelineHost); workspace.append(center, panelSwitch, left, right); root.append(header, tools, status, workspace); host.append(root);
  let currentId = '', selectedId = '', sequenceId = '', time = 0, playing = false, loop = false, loopFrom = 0, loopTo = 0, reduced = false, overlays = true, snap = 1, saving = false, disposed = false;
  let preview: PreviewResult | undefined, previewGeneration = 0, previewPending = false, renderAgain = false;
  /** Editor-only framing: renderScale zoom, native camera pan and a crop to the artwork's height. Never saved. */
  let viewZoom = compact.matches ? 2 : 1, crop = true, cropHeight = 0, cropFor = '', hoverId = '';
  let panning: { x: number; y: number; camera: number; scroll: number; moved: boolean; target?: string } | undefined;
  const touches = new Map<number, { x: number; y: number }>(); let pinch: { distance: number; zoom: number } | undefined;
  let dragging: { before: Composition; pending: Composition; x: number; y: number; id: string; delta: PreviewResult['deltaToLocal'] } | undefined;
  let scrub: HTMLInputElement | undefined, timeLabel: HTMLElement | undefined;
  const environment: Record<string, string | number | boolean> = { cameraX: 0, zoom: 1, ...config.initialEnvironment };
  let cleanupWorld: void | (() => void);
  let cleanupAssets: void | (() => void); const assetSession: AssetBrowserSession = {};
  const assetHost = element('details', 'asset-browser tool-panel'); assetHost.dataset.tool = 'assets'; assetHost.append(element('summary', '', 'Artwork library')); const assetPanel = element('div'); assetHost.append(assetPanel); if (config.assetPreview) root.insertBefore(assetHost, workspace);
  const mapHost = element('details', 'world-map tool-panel'); mapHost.dataset.tool = 'world-map'; mapHost.append(element('summary', '', 'City map')); const mapPanel = element('div'); mapHost.append(mapPanel); if (config.worldPanel) root.insertBefore(mapHost, workspace);
  /** Artwork pictures for the Add picker and the Library, drawn by the same isolated game preview. */
  const thumbnails = config.assetPreview ? createThumbnails((target, entry) => config.assetPreview!(target, entry, entry.preview === 'local' ? undefined : entry.usages.find(usage => !usage.scene.startsWith('sequence-')) ?? entry.usages[0], model.list(), { time: 0, reduced: true, environment: { ...config.initialEnvironment, renderScale: 1 } })) : undefined;
  const workbenches = (config.workbenches ?? []).map(workbench => {
    const details = element('details', 'workbench-screen tool-panel'), panel = element('section'); details.dataset.workbench = details.dataset.tool = workbench.id; details.append(element('summary', '', workbench.title), panel); root.insertBefore(details, workspace);
    return { config: workbench, details, panel, dispose: undefined as WorkbenchHandle | undefined, documentsVersion: '', scene: '', autostart: false };
  });
  /**
   * Scene is the editor itself: outline, viewport and an inspector for the selection. Logic lists all of
   * the scene's logic at once and Play runs it; both act on the scene chosen in the header. Library,
   * World and Labs are not tied to a scene.
   */
  const groups = [
    { id: 'layout', label: 'Scene', title: 'Edit this scene: select artwork to change how it looks and what it does' },
    { id: 'logic', label: 'Logic', title: 'All of this scene’s interactions, dialogue, devices and wiring as lists' },
    { id: 'play', label: 'Play', title: 'Play this scene from a starting state' },
    { id: 'library', label: 'Library', title: 'Every piece of artwork, independent of scenes' },
    { id: 'world', label: 'World', title: 'The city map, travel, the opening and everything shared between scenes' },
    { id: 'labs', label: 'Labs', title: 'Developer test beds outside the scene workflow' },
  ] as const;
  type Group = typeof groups[number]['id'];
  const panelGroup = (item: WorkbenchConfig): Group => item.area === 'scene' ? item.mode === 'play' ? 'play' : 'logic' : item.area ?? 'library';
  const panels = [...(config.assetPreview ? [{ details: assetHost, label: 'Artwork', title: 'Artwork library', group: 'library' as Group }] : []), ...(config.worldPanel ? [{ details: mapHost, label: 'City map', title: 'City map · open a place to edit it', group: 'world' as Group }] : []),
    // Wiring panels follow the logic panels under Logic.
    ...[...workbenches].sort((a, b) => Number(a.config.mode === 'wiring') - Number(b.config.mode === 'wiring')).map(item => ({ details: item.details, label: item.config.label ?? item.config.title.split(' · ')[0], title: item.config.title, group: panelGroup(item.config) }))];
  const chosen = new Map<Group, HTMLDetailsElement>(); let group: Group = 'layout';
  const subtools = element('nav', 'subtools'); subtools.setAttribute('aria-label', 'Panels in this mode'); root.insertBefore(subtools, status);
  const showLayout = () => { group = 'layout'; panels.forEach(item => item.details.open = false); refreshTools(); };
  const openPanel = (details: HTMLDetailsElement) => { const item = panels.find(p => p.details === details); if (!item) return; group = item.group; chosen.set(group, details); details.open = true; refreshTools(); };
  /** Scene toolbar's Play: open the Play panel and start the scene immediately. */
  const playWorkbench = () => workbenches.find(item => item.config.area === 'scene' && item.config.mode === 'play');
  const canPlay = () => { const item = playWorkbench(), scene = sceneId(); return !!item && !!scene && (!item.config.supports || item.config.supports(scene, model.list())); };
  const playScene = () => { const item = playWorkbench(); if (!item) return; animating = false; item.autostart = true; if (item.details.open) { item.dispose?.(); item.dispose = undefined; refreshWorkbench(item); } else openPanel(item.details); };
  const showGroup = (id: Group) => { if (id === 'layout') { showLayout(); return; } const target = chosen.get(id) ?? panels.find(p => p.group === id)?.details; if (target) openPanel(target); };
  function refreshTools() {
    const active = panels.find(item => item.details.open); root.dataset.tool = active?.details.dataset.tool ?? 'scene'; root.dataset.group = group;
    tools.replaceChildren();
    for (const item of groups) { if (item.id !== 'layout' && !panels.some(p => p.group === item.id)) continue; const tab = button(item.label, () => showGroup(item.id), item.title); tab.dataset.group = item.id; tab.setAttribute('aria-pressed', String(item.id === group)); if (item.id === 'library') tab.classList.add('secondary'); tools.append(tab); }
    const members = panels.filter(p => p.group === group); subtools.replaceChildren(); subtools.hidden = members.length < 2;
    for (const item of members) { const tab = button(item.label, () => openPanel(item.details), item.title); tab.dataset.tool = item.details.dataset.tool; tab.setAttribute('aria-pressed', String(item.details.open)); subtools.append(tab); }
  }
  const sceneName = (scene:string)=>{const doc=model.list().find(d=>d.id.startsWith('authored.')&&d.kind==='scene'&&(d.value as {id?:string}).id===scene);return doc?(doc.value as {name:string}).name:config.sceneLabel?.(scene)??scene;};
  const sceneId = () => { const doc = compositionDocument(); return doc ? (doc.value as Composition).scene : ''; };
  const openInstance = (document: string, instance: string) => { currentId = document; selectedId = instance; playing = false; syncSequence(); showLayout(); showPanel('properties'); refresh(); };
  function emptyState(item: WorkbenchConfig, scene: string) {
    const box = element('div', 'empty-state'); box.append(element('h2', '', item.title.split(' · ')[0]), element('p', '', item.unsupported ?? `${scene ? sceneName(scene) : 'This document'} has nothing to edit here yet.`));
    const others = model.list().filter(doc => doc.kind === 'composition' && item.supports!((doc.value as Composition).scene,model.list()));
    if (others.length) { box.append(element('p', 'muted', 'Available for')); const row = element('div', 'row'); for (const doc of others) row.append(button(sceneName((doc.value as Composition).scene), () => openDocument(doc.id))); box.append(row); }
    return box;
  }
  const refreshWorkbench = (item: typeof workbenches[number], changed = false) => {
    const documents = model.list(), relevant = item.config.documentIds ? documents.filter(doc => item.config.documentIds!.includes(doc.id)) : documents;
    const version = item.config.documentDependent ? JSON.stringify(relevant) : '', scene = sceneId(), sceneBound = item.config.area === 'scene';
    if (!item.details.open) { item.dispose?.(); item.dispose = undefined; }
    else if (sceneBound && item.dispose && item.scene !== scene) { item.dispose(); item.dispose = undefined; }
    else if (changed && item.config.documentDependent && version !== item.documentsVersion && item.dispose) {
      if (item.dispose.refresh) { item.documentsVersion = version; item.dispose.refresh(); }
      else { item.dispose(); item.dispose = undefined; }
    }
    if (item.details.open && !item.dispose) {
      item.documentsVersion = version; item.scene = scene;
      if (sceneBound && item.config.supports && !item.config.supports(scene,documents)) { item.panel.replaceChildren(emptyState(item.config, scene)); item.dispose = (() => item.panel.replaceChildren()) as WorkbenchHandle; return; }
      if (sceneBound) item.config.showScene?.(scene,documents);
      const autostart = item.autostart; item.autostart = false;
      try { item.dispose = item.config.mount(item.panel, { documents, openScene, openInstance, ...(sceneBound ? { scene } : {}), ...(autostart ? { autostart } : {}), ...(item.config.authoring ? { authoring: authoringApi() } : {}) }); }
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
  const notice = (text: string, error = false) => { status.textContent = text; status.className = 'status' + (error ? ' error' : ''); };
  const run = (action: () => void) => { try { notice(''); action(); refresh(); } catch (e) { notice(message(e), true); } };
  const current = () => currentId ? model.get(currentId) : undefined;
  /** The document an open panel edits (Export/Import JSON), otherwise the scene's composition or timeline. */
  const activeDocument = () => { const id = workbenches.find(item => item.details.open)?.config.primaryDocumentId; return id && model.list().some(doc => doc.id === id) ? model.get(id) : current(); };
  const currentTimeline = () => { const doc = current(); return doc?.kind === 'timeline' ? doc.value as TimelineDocument : undefined; };
  const sequence = () => currentTimeline()?.sequences.find(s => s.id === sequenceId);
  const evaluationContext = () => { const base = model.timelineContext(); return config.timelineContext?.(base, { time, reduced, sequenceId, environment: { ...environment }, viewport: { width: canvas.width, height: canvas.height }, timeline: currentTimeline() }) ?? base; };
  const compositionDocument = () => { const doc = current(); if (doc?.kind === 'composition') return doc; const seq = sequence(); return seq ? model.get(seq.composition) : undefined; };
  const selected = () => { const doc = compositionDocument(); return doc ? flatten(doc.value as Composition).find(x => x.node.id === selectedId)?.node : undefined; };
  const editInstance = (name: string, action: (node: Instance) => void) => run(() => { const doc = compositionDocument(); if (!doc || !selectedId) return; model.updateInstance(doc.id, selectedId, name, action); });
  const editTimeline = (name: string, action: (doc: TimelineDocument) => void) => { playing = false; run(() => model.edit(currentId, name, value => { action(value as TimelineDocument); return value; })); };
  async function api(path: string, body?: unknown) {
    if (!config.api) throw new Error('This browser editor has no repository write service. Download edits instead.');
    const response = await fetch(config.api.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-authoring-token': config.api.token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit' });
    const value = await response.json(); if (!response.ok) throw new Error(response.status === 409 ? `Source changed outside the editor. Pending edits are kept. Export them or reload. ${value.error ?? ''}` : value.error ?? `Authoring service returned ${response.status}`); return value;
  }
  async function load() {
    playing = false;
    try {
      const documents = config.api ? await api('/documents') as EditorDocument[] : copy(config.documents ?? []); model.load(documents);
      if (!documents.some(d => d.id === currentId)) currentId = documents.find(d => d.kind === 'composition')?.id ?? documents[0]?.id ?? '';
      selectedId = ''; syncSequence(); refresh(); notice(documents.length ? config.api ? 'Source documents loaded. Edits stay local until Save.' : '' : 'No authoring documents are available.');
    } catch (e) { notice(`Could not load authoring documents: ${message(e)}`, true); }
  }
  async function save() {
    if (saving) return; const edits = model.edits(); if (!edits.length) return;
    if (!config.api) {
      try {
        const blob = new Blob([JSON.stringify(createDocumentBundle(edits, model.list()))], { type: 'application/json' });
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
  function openDocument(id: string) { currentId = id; selectedId = ''; playing = false; time = 0; syncSequence(); refresh(); }
  function openScene(scene: string) { const doc = model.list().find(d => d.kind === 'composition' && (d.value as Composition).scene === scene); if (doc) { showLayout(); openDocument(doc.id); } else notice(`Scene ${scene} has no editable composition in this session.`, true); }
  function refreshHeader() {
    const brand = element('div', 'brand'); brand.append(element('strong', '', 'ACCESS DENIED'), element('span', '', config.api ? 'Composer' : 'Editor')); header.replaceChildren(brand);
    const actions = element('div', 'actions'), menu = element('details', 'menu'), menuItems = element('div', 'menu-items'); menu.append(element('summary', '', 'More'), menuItems);
    const docs = model.list(), chooser = element('select', 'document-picker'); chooser.setAttribute('aria-label', 'Scene');
    const unsaved = (doc: EditorDocument) => model.dirty(doc.id) || doc.kind === 'composition' && (config.sceneDocuments?.((doc.value as Composition).scene,docs) ?? []).some(id => model.dirty(id));
    const sequenceDoc = (doc: EditorDocument) => doc.kind === 'timeline' || doc.kind === 'composition' && (doc.value as Composition).scene.startsWith('sequence-');
    const label = (doc: EditorDocument, text?: string) => `${unsaved(doc) ? '● ' : ''}${text ?? (doc.kind === 'timeline' ? `Timeline · ${doc.id}` : sceneName((doc.value as Composition).scene))}`;
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
    chooser.value = currentId; chooser.onchange = () => openDocument(chooser.value); header.append(chooser);
    const dirty = element('span', 'state ' + (model.dirty() ? 'dirty' : 'muted'), model.dirty() ? 'Unsaved changes' : config.api ? 'Saved' : 'Published snapshot'); header.append(dirty, actions);
    const saveButton = button(saving ? 'Saving…' : config.api ? 'Save to source' : 'Download edits', () => void save()); saveButton.className = 'primary'; saveButton.disabled = saving || !model.dirty();
    const undo = button('Undo', () => run(() => model.undo()), model.undoLabel), redo = button('Redo', () => run(() => model.redo())); undo.disabled = !model.canUndo; redo.disabled = !model.canRedo; actions.append(undo, redo, saveButton, menu);
    menuItems.append(button(config.api ? 'Reload source' : 'Reset edits', () => { if (!model.dirty() || window.confirm('Discard unsaved edits and reload the source snapshot? Download or export first to keep them.')) void load(); }));
    const bundleFile = element('input'); bundleFile.type = 'file'; bundleFile.accept = 'application/json,.json'; bundleFile.hidden = true; bundleFile.setAttribute('aria-label', 'Import downloaded edits');
    bundleFile.onchange = async () => { const file = bundleFile.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const changes = readDocumentBundle(JSON.parse(await file.text()), model.list()); run(() => { model.importDocuments(changes); syncSequence(); }); } catch (error) { notice(`Import failed: ${message(error)}`, true); } finally { bundleFile.value = ''; } };
    menuItems.append(button('Import edits', () => bundleFile.click()), bundleFile);
    menuItems.append(button('Export JSON', () => { const doc = activeDocument(); if (!doc) return; const url = URL.createObjectURL(new Blob([JSON.stringify(doc.value, null, 2) + '\n'], { type: 'application/json' })); const link = element('a'); link.href = url; link.download = doc.id + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.onchange = async () => { const selectedFile = file.files?.[0]; if (!selectedFile) return; try { if (selectedFile.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const value: unknown = JSON.parse(await selectedFile.text()); run(() => { const doc = activeDocument(); if (!doc || doc.kind === 'world') throw new Error('Select an editable document to import'); model.edit(doc.id, 'Import document', () => value); syncSequence(); }); } catch (e) { notice(`Import failed: ${message(e)}`, true); } };
    const importButton = button('Import JSON', () => file.click()); importButton.disabled = activeDocument()?.kind === 'world'; menuItems.append(importButton, file);
  }
  function refreshOptions() {
    options.replaceChildren(); ambientLabel = undefined;
    const bar = element('div', 'scene-toolbar'), composition = current()?.kind === 'composition';
    const cluster = (name: string) => { const node = element('div', 'toolbar-group'); node.setAttribute('role', 'group'); node.setAttribute('aria-label', name); bar.append(node); return node; };
    if (composition) {
      const add = button('＋ Add artwork', () => openPicker(), 'Add a piece of artwork where you are looking (A)'); add.className = 'primary'; cluster('Artwork').append(add);
      const animation = cluster('Scene animation'), toggle = button(animating ? '❚❚ Pause' : '▶ Animate', () => { animating = !animating; refreshOptions(); }, animating ? 'Pause the scene’s ambient animation (Space)' : 'Run the scene’s ambient animation, such as people, lights and signs, without playing the game (Space)');
      toggle.setAttribute('aria-pressed', String(animating)); ambientLabel = element('span', 'time', `${time.toFixed(1)} s`);
      animation.append(toggle, ambientLabel, button('⟲', () => { time = 0; refreshOptions(); void draw(); }, 'Back to the first frame'));
    }
    const controls: EnvironmentControl[] = config.environmentControls ?? [{ key: 'cameraX', label: 'Camera X', kind: 'number', step: 10 }, { key: 'zoom', label: 'Zoom', kind: 'number', min: 0.1, max: 8, step: 0.1 }];
    const quick = controls.filter(control => control.quick);
    if (quick.length) { const preview = cluster('Preview as'); preview.append(element('span', 'toolbar-label', 'Preview')); for (const control of quick) preview.append(environmentControl(control, true)); }
    if (composition) {
      const grid = select([{ value: '0', label: 'Grid off' }, ...[1, 2, 4, 8, 16].map(n => ({ value: String(n), label: `Grid ${n} px` }))], String(snap), value => { snap = Number(value); });
      grid.title = 'Dragging and arrow keys snap to this grid'; grid.setAttribute('aria-label', 'Grid'); cluster('Grid').append(grid);
    }
    const more = element('details', 'more-menu'), panel = element('div', 'more-panel'); more.open = moreOpen; more.ontoggle = () => { moreOpen = more.open; };
    more.append(element('summary', '', 'More preview settings'), panel); bar.append(more);
    const motion = element('input'); motion.type = 'checkbox'; motion.checked = reduced; motion.onchange = () => { reduced = motion.checked; void draw(); }; panel.append(label('Reduced motion', motion));
    for (const control of controls) if (!control.quick) panel.append(environmentControl(control, false));
    if (canPlay()) { const play = button('▶ Play scene', playScene, 'Run this scene in the game from its starting state'); play.className = 'play-button'; bar.append(play); }
    options.append(bar);
  }
  function environmentControl(control: EnvironmentControl, inToolbar: boolean): HTMLElement {
    const change = (value: string | number | boolean) => { environment[control.key] = value; void draw(); if (inToolbar) refreshOptions(); };
    if (control.choices) {
      const row = element('div', 'segmented'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', control.label);
      for (const choice of control.choices) { const pick = button(choice.label, () => change(choice.value), `${control.label}: ${choice.label}`); pick.setAttribute('aria-pressed', String(environment[control.key] === choice.value)); row.append(pick); }
      return inToolbar ? row : label(control.label, row);
    }
    if (control.kind === 'boolean' && inToolbar) { const toggle = button(control.label, () => change(!environment[control.key])); toggle.className = 'toggle'; toggle.setAttribute('aria-pressed', String(!!environment[control.key])); return toggle; }
    if (control.kind === 'select') { const input = select((control.options ?? []).map(v => ({ value: v, label: inToolbar ? `${control.label} · ${v}` : v })), String(environment[control.key] ?? ''), change); input.setAttribute('aria-label', control.label); return inToolbar ? input : label(control.label, input); }
    const input = element('input'); input.type = control.kind === 'boolean' ? 'checkbox' : control.kind === 'text' ? 'text' : 'number'; input.checked = !!environment[control.key]; input.value = String(environment[control.key] ?? (control.kind === 'text' ? '' : 0));
    if (control.min !== undefined) input.min = String(control.min); if (control.max !== undefined) input.max = String(control.max); if (control.step !== undefined) input.step = String(control.step);
    input.onchange = () => { const value = control.kind === 'boolean' ? input.checked : control.kind === 'text' ? input.value : Number(input.value); if (typeof value === 'number' && !Number.isFinite(value)) return; change(value); };
    const row = label(control.label, input); if (control.kind === 'text') row.classList.add('wide'); return row;
  }
  function refreshLibrary() {
    cleanupAssets?.(); cleanupAssets = undefined; assetPanel.replaceChildren(); if (!config.assetPreview || !assetHost.open) return;
    const scene = current()?.kind === 'composition' ? sceneId() : '';
    cleanupAssets = mountAssetBrowser(assetPanel, { registry: config.registry, documents: model.list(),
      openUsage(usage) { openInstance(usage.document, usage.instance); },
      preview: (canvas, entry, usage, zoom) => config.assetPreview!(canvas, entry, usage, model.list(), { time, reduced, environment: { ...environment, renderScale: zoom } }),
      ...(thumbnails ? { thumbnail: (entry: AssetEntry) => thumbnails.thumbnail(entry) } : {}),
      ...(scene ? { useInScene: { label: `Add to ${sceneName(scene)}`, run: (entry: AssetEntry) => { showLayout(); void addAtView(entry.id); } } } : {}),
    }, assetSession);
  }
  function refreshMap() { cleanupWorld?.(); cleanupWorld = undefined; mapPanel.replaceChildren(); if (config.worldPanel && mapHost.open) cleanupWorld = config.worldPanel(mapPanel, openScene, model.list(), sceneId()); }
  function refreshLeft() {
    left.replaceChildren();
    workbenches.forEach(item => refreshWorkbench(item, true)); refreshLibrary(); refreshMap();
    left.append(element('h2', '', 'Outline'));
    const doc = compositionDocument();
    if (doc) {
      const composition = doc.value as Composition, rows = flatten(composition), parents = new Map<string, string>();
      const visit = (nodes: Instance[], parent?: string) => nodes.forEach(node => { if (parent) parents.set(node.id, parent); visit(node.children ?? [], node.id); }); visit(composition.instances);
      const within = (id: string, ancestor: string) => { for (let at = parents.get(id); at; at = parents.get(at)) if (at === ancestor) return true; return false; };
      const art = (node: Instance) => config.registry.get(node.type);
      const matches = (node: Instance) => { const query = layerQuery.trim().toLowerCase(); return !query || `${node.id} ${node.type} ${art(node).label}`.toLowerCase().includes(query); };
      const layerTools = element('div', 'layer-tools'), search = element('input'), order = element('div', 'segmented'), listHost = element('div');
      search.type = 'search'; search.placeholder = 'Filter'; search.value = layerQuery; search.setAttribute('aria-label', 'Filter the outline'); search.oninput = () => { layerQuery = search.value; renderLayers(); };
      order.setAttribute('role', 'group'); order.setAttribute('aria-label', 'Arrange the outline');
      for (const [mode, text, title] of [['kind', 'Kind', 'Group by kind of artwork'], ['order', 'Order', 'Document and draw order, back to front']] as const) {
        const toggle = button(text, () => { layerSort = mode; for (const other of order.children) other.setAttribute('aria-pressed', String((other as HTMLElement).dataset.mode === mode)); renderLayers(); }, title);
        toggle.dataset.mode = mode; toggle.setAttribute('aria-pressed', String(mode === layerSort)); order.append(toggle);
      }
      layerTools.append(search, order); left.append(layerTools, listHost);
      // Hovering a row outlines the artwork in the preview, the same box the preview shows on hover.
      const item = (node: Instance, depth: number) => {
        const li = element('li'), pick = button('', () => select_(node.id === selectedId ? '' : node.id), `${node.type} · ${node.pass} · order ${node.order}`);
        pick.onmouseenter = pick.onfocus = () => { hoverId = node.id; placeHover(); }; pick.onmouseleave = pick.onblur = () => { if (hoverId === node.id) { hoverId = ''; placeHover(); } };
        pick.append(element('span', 'layer-name', node.id), element('span', 'layer-kind', art(node).label)); pick.style.paddingLeft = `${10 + depth * 14}px`; pick.setAttribute('aria-pressed', String(node.id === selectedId)); li.append(pick); return li;
      };
      function renderLayers() {
        listHost.replaceChildren(); let shown = 0;
        if (layerSort === 'order') { const list = element('ul', 'hierarchy'); for (const { node, depth } of rows) if (matches(node)) { list.append(item(node, depth)); shown++; } if (shown) listHost.append(list); }
        else for (const role of LAYER_ROLES) {
          const list = element('ul', 'hierarchy'); let count = 0;
          for (const top of rows.filter(row => !parents.has(row.node.id) && layerRole(row.node.type, art(row.node).label, art(row.node).category) === role)) {
            const nested = rows.filter(row => within(row.node.id, top.node.id)); if (!matches(top.node) && !nested.some(row => matches(row.node))) continue;
            list.append(item(top.node, 0)); count++; for (const row of nested) if (matches(row.node) || matches(top.node)) list.append(item(row.node, row.depth - top.depth));
          }
          if (!count) continue; shown += count;
          const group = element('details', 'layer-group'); group.open = layerQuery.trim() ? true : roleOpen.get(role) ?? true; group.ontoggle = () => { if (!layerQuery.trim()) roleOpen.set(role, group.open); };
          group.append(element('summary', '', `${role} · ${count}`), list); listHost.append(group);
        }
        if (!shown) listHost.append(element('p', 'muted', layerQuery.trim() ? 'Nothing matches this filter.' : 'This scene has no artwork yet. Use ＋ Add artwork in the toolbar.'));
        listHost.querySelector<HTMLElement>('button[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' });
      }
      renderLayers();
    } else left.append(element('p', 'muted', 'Open a scene, or a timeline that refers to one.'));
  }
  function numberInput(value: number, apply: (n: number) => void, min?: number, step = 'any') { const input = element('input'); input.type = 'number'; input.step = step; if (min !== undefined) input.min = String(min); input.value = String(value); input.onchange = () => { const number = Number(input.value); if (!Number.isFinite(number) || min !== undefined && number < min) { notice('Enter a finite number within the field range.', true); return; } apply(number); }; return input; }
  function fieldInput(field: Field, value: Value, apply: (v: Value) => void): HTMLElement {
    const kind = field.kind as string;
    if (kind === 'select') return select((field.options ?? []).map(v => ({ value: String(v), label: String(v) })), String(value), v => { const actual = field.options?.find(x => String(x) === v); if (actual !== undefined) apply(actual); });
    if (kind === 'number') { const input = numberInput(value as number, apply, field.min, String(field.step ?? 'any')); if (field.max !== undefined) input.max = String(field.max); return input; }
    if (kind === 'boolean') { const input = element('input'); input.type = 'checkbox'; input.checked = value as boolean; input.onchange = () => apply(input.checked); return input; }
    if (kind === 'color') { const input = element('input'); input.type = 'color'; input.value = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#808080'; input.onchange = () => apply(input.value); return input; }
    if (kind === 'json') { const wrap = element('div'), input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', field.label); wrap.append(input, button('Apply JSON field', () => { try { apply(JSON.parse(input.value) as Value); } catch (e) { notice(message(e), true); } })); return wrap; }
    const input = element('input'); input.type = 'text'; input.value = String(value); input.onchange = () => apply(input.value); return input;
  }
  const disposeInspector = () => { inspectorMount?.handle?.(); inspectorMount = undefined; };
  /** Sections read the live documents, so a section's own refresh always sees the latest edit. */
  const liveContext = (scene: string): WorkbenchContext => ({ get documents() { return model.list(); }, scene, openScene, openInstance, authoring: authoringApi() });
  function refreshRight() {
    const node = selected(), scene = sceneId(), doc = compositionDocument(); right.replaceChildren();
    if (!doc) { disposeInspector(); right.append(element('h2', '', 'Inspector'), element('p', 'muted', 'Open a scene to inspect it.')); return; }
    const head = element('div', 'inspector-head');
    if (node) {
      const art = config.registry.get(node.type), actions = element('div', 'row');
      head.append(element('h2', '', node.id), element('p', 'muted', `${art.label} · ${node.type}`));
      actions.append(button('Duplicate', () => run(() => { selectedId = model.duplicate(doc.id, selectedId); })), button('Delete', () => run(() => { model.remove(doc.id, selectedId); selectedId = ''; }), 'Delete this artwork (Delete)'), button('Deselect', () => select_(''), 'Back to the scene’s own settings (Esc)'));
      if (current()?.kind === 'timeline') actions.querySelectorAll('button').forEach((b, i) => { if (i < 2) (b as HTMLButtonElement).disabled = true; });
      head.append(actions);
    } else head.append(element('h2', '', sceneName(scene) || 'Scene'), element('p', 'muted', 'Nothing selected, so these are the scene’s own settings. Click artwork in the preview or the outline to inspect it.'));
    right.append(head);
    let sections: InspectorSection[] = [];
    try { sections = scene && config.inspector ? config.inspector(scene, node, model.list()) : []; } catch (e) { right.append(element('p', 'error', `Inspector unavailable: ${message(e)}`)); }
    const tabs = [...(node ? [{ id: 'appearance', label: 'Appearance', title: 'Position, look and attachment' }] : []), ...sections];
    if (!tabs.length) { disposeInspector(); right.append(element('p', 'muted', 'This scene has no editable logic yet.')); return; }
    if (!tabs.some(tab => tab.id === inspectorTab)) inspectorTab = tabs[0].id;
    if (tabs.length > 1) {
      const strip = element('div', 'inspector-tabs'); strip.setAttribute('role', 'tablist'); strip.setAttribute('aria-label', 'Inspector sections');
      for (const tab of tabs) { const pick = button(tab.label, () => { inspectorTab = tab.id; refreshRight(); }, tab.title); pick.setAttribute('role', 'tab'); pick.setAttribute('aria-selected', String(tab.id === inspectorTab)); strip.append(pick); }
      right.append(strip);
    }
    const body = element('div', 'inspector-body'); body.setAttribute('role', 'tabpanel'); right.append(body);
    if (inspectorTab === 'appearance' && node) { disposeInspector(); renderAppearance(body, node); return; }
    const section = sections.find(item => item.id === inspectorTab)!, key = `${scene}|${node?.id ?? ''}|${section.id}|${section.title ?? section.label}`;
    if (inspectorMount?.key === key && inspectorMount.handle?.refresh) { body.append(inspectorMount.host); inspectorMount.handle.refresh(); return; }
    disposeInspector(); const host = element('div', 'inspector-mount'); body.append(host); inspectorMount = { key, host };
    try { inspectorMount.handle = section.mount(host, liveContext(scene)); } catch (e) { host.replaceChildren(element('p', 'error', `Unavailable: ${message(e)}`)); }
  }
  function renderAppearance(host: HTMLElement, node: Instance) {
    const art = config.registry.get(node.type), part = (title: string, open: boolean) => { const box = element('details', 'inspector-part'), inner = element('div'); box.open = open; box.append(element('summary', '', title), inner); host.append(box); return inner; };
    if (current()?.kind === 'timeline') host.append(element('p', 'muted', 'These edit the base composition. Timeline keys can override these values; use track keyframes to animate.'));
    const position = part('Position', true);
    const placementLabels: Record<string, string> = { x: 'X position', h: 'Height above floor', scale: 'Scale', parallax: 'Parallax' };
    for (const [key, value, min] of [['x', node.placement.x], ['h', node.placement.h], ['scale', node.placement.scale ?? 1, 0.0001], ['parallax', node.placement.parallax ?? 1, 0]] as [keyof Instance['placement'], number, number?][]) position.append(label(placementLabels[key], numberInput(value, v => editInstance(`Change ${key}`, n => { n.placement[key] = v as never; }), min)));
    position.append(label('Facing', select([{ value: '1', label: 'Right' }, { value: '-1', label: 'Left' }], String(node.placement.facing ?? 1), v => editInstance('Change facing', n => n.placement.facing = Number(v) as 1 | -1))));
    position.append(label('Draw order', numberInput(node.order, v => editInstance('Change layer order', n => n.order = v))));
    position.append(label('Drawing pass', select(['backdrop', 'devices', 'people', 'foreground'].map(v => ({ value: v, label: v })), node.pass, v => editInstance('Change drawing pass', n => n.pass = v as Instance['pass']))));
    const fields = Object.entries(art.fields);
    if (fields.length) { const look = part('Look', true); for (const [key, field] of fields) { const value = node.props[key] ?? field.default; const control = fieldInput(field, value, v => editInstance(`Change ${field.label}`, n => n.props[key] = v)); look.append(label(field.label + (field.unit ? ` (${field.unit})` : ''), control)); } }
    const composition = compositionDocument()!.value as Composition, anchorDetails = part('Attachment and anchors', !!node.attach);
    const candidates = flatten(composition).map(x => x.node).filter(n => n.id !== node.id);
    const attachTo = select([{ value: '', label: 'None / parent origin' }, ...candidates.map(n => ({ value: n.id, label: n.id }))], node.attach?.instance ?? '', v => editInstance('Change attachment', n => { if (!v) { delete n.attach; return; } const owner = candidates.find(x => x.id === v)!; const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); const anchor = Object.keys(anchors)[0]; if (!anchor) throw new Error('The selected owner exposes no anchors'); n.attach = { instance: v, anchor }; })); anchorDetails.append(label('Attach to', attachTo));
    if (node.attach) { const owner = candidates.find(n => n.id === node.attach!.instance); if (owner) { const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); anchorDetails.append(label('Owner anchor', select(Object.keys(anchors).map(v => ({ value: v, label: `${v} · ${anchors[v].role}` })), node.attach.anchor, v => editInstance('Change anchor', n => n.attach!.anchor = v)))); } }
    const ownAnchors = art.anchors(config.registry.properties(node.type, node.props), {}); for (const [name, anchor] of Object.entries(ownAnchors)) anchorDetails.append(element('p', 'muted', `${name}: (${anchor.x}, ${anchor.h}) · ${anchor.role}`));
    anchorDetails.append(element('p', 'muted', 'Attachment offsets are local. Changing an owner keeps the existing local offset; review the preview before saving.'));
    if (Object.keys(node.bindings ?? {}).length) { const choices=art.bindingIdentity==='presentation'?art.bindingChoices?.(composition):undefined,binding = part(choices?'Visual inputs':'Gameplay bindings · read-only', false); for (const [key, value] of Object.entries(node.bindings ?? {})) { const sources=choices?.[key];if(sources){binding.append(label(art.visualFields?.[key]?.label??key,select(sources.map(value=>({value,label:value})),value,source=>editInstance('Rebind '+key,n=>{n.bindings![key]=source;}))));}else{const row = element('p', 'binding-row'); row.append(element('span', 'muted', key), element('code', '', value)); binding.append(row);} } }
  }
  /** The Add picker: searchable pictures of every registered piece, placed at the centre of the view. */
  let pickerQuery = '', pickerFamily = '';
  function openPicker() { if (current()?.kind !== 'composition') return; picker.hidden = false; renderPicker(); picker.querySelector<HTMLInputElement>('input[type=search]')?.focus(); }
  function closePicker() { if (picker.hidden) return; picker.hidden = true; picker.replaceChildren(); }
  function renderPicker() {
    const entries = assetInventory(config.registry, model.list()), used = new Set(flatten(compositionDocument()!.value as Composition).map(x => x.node.type));
    const head = element('div', 'picker-head'), search = element('input'), grid = element('div', 'picker-grid'), count = element('p', 'muted');
    search.type = 'search'; search.placeholder = 'Search artwork: name, kind or tag'; search.value = pickerQuery; search.setAttribute('aria-label', 'Search artwork'); search.oninput = () => { pickerQuery = search.value; fill(); };
    const family = select([{ value: '', label: 'All kinds' }, ...[...new Set(entries.map(e => e.family))].sort().map(f => ({ value: f, label: f }))], pickerFamily, value => { pickerFamily = value; fill(); }); family.setAttribute('aria-label', 'Kind of artwork');
    head.append(element('strong', '', 'Add artwork'), search, family, button('✕', closePicker, 'Close (Esc)')); picker.replaceChildren(head, count, grid);
    function fill() {
      const list = filterAssets(entries, pickerQuery, pickerFamily).sort((a, b) => Number(used.has(b.id)) - Number(used.has(a.id))), shown = list.slice(0, 300);
      count.textContent = `${list.length} pieces${list.length > shown.length ? ` · showing ${shown.length}, search to narrow` : ''} · pieces already in this scene come first`; grid.replaceChildren();
      for (const entry of shown) { const card = button('', () => { closePicker(); void addAtView(entry.id); }, entry.id); card.className = 'asset-card'; if (thumbnails) card.append(thumbnails.thumbnail(entry)); card.append(element('span', '', entry.label)); if (used.has(entry.id)) card.append(element('small', '', 'in this scene')); grid.append(card); }
    }
    fill();
  }
  picker.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closePicker(); canvas.focus(); } });
  async function addAtView(type: string) {
    const doc = compositionDocument(); if (!doc || current()?.kind !== 'composition') { notice('Open a scene to add artwork.', true); return; }
    let x = 0;
    try {
      // Draw the new piece once off-screen at x = 0, then move it by its measured distance to the centre of the view.
      const draft = model.draftAdd(doc.id, type), probe = element('canvas'); probe.width = canvas.width; probe.height = canvas.height;
      const result = await config.preview.render(probe, previewRequest(draft.composition, false, viewZoom)), box = result.bounds.find(b => b.id === draft.instanceId);
      if (box && result.deltaToLocal) { const rect = canvas.getBoundingClientRect(), view = stage.getBoundingClientRect(), centre = ((Math.max(rect.left, view.left) + Math.min(rect.right, view.right)) / 2 - rect.left) * canvas.width / Math.max(1, rect.width); x = result.deltaToLocal(draft.instanceId, centre - (box.x + box.width / 2), 0).x; }
    } catch { x = 0; }
    x = snap ? Math.round(x / snap) * snap : Math.round(x);
    let added = false; run(() => { selectedId = model.add(doc.id, type, { x, h: 0 }); inspectorTab = 'appearance'; added = true; });
    if (added) { if (compact.matches) showPanel('properties'); notice(`Added ${config.registry.get(type).label}. Drag it into place or set its position in the inspector.`); }
  }
  function editArray<T>(container: HTMLElement, title: string, value: T, apply: (v: T) => void, help?: string) {
    const details = element('details'); details.append(element('summary', '', title)); if (help) details.append(element('p', 'muted', help)); const input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', title + ' JSON'); details.append(input, button('Apply ' + title.toLowerCase(), () => { try { apply(JSON.parse(input.value) as T); } catch (e) { notice(`Invalid ${title.toLowerCase()}: ${message(e)}`, true); } })); container.append(details);
  }
  function refreshTimeline() {
    timelineHost.replaceChildren(); scrub = undefined; timeLabel = undefined;
    const doc = current(); if (doc?.kind !== 'timeline') { timelineHost.hidden = true; return; } timelineHost.hidden = false;
    const timeline = doc.value as TimelineDocument, seq = sequence(); const row = element('div', 'row');
    row.append(element('strong', '', 'Timeline'), select(timeline.sequences.map(s => ({ value: s.id, label: s.id })), sequenceId, v => { sequenceId = v; playing = false; time = 0; syncSequence(); refresh(); }));
    row.append(button('New sequence', () => editTimeline('Add sequence', d => { const comp = model.list().find(x => x.kind === 'composition'); if (!comp) throw new Error('Create a composition before a sequence'); let i = 1; while (d.sequences.some(s => s.id === `sequence-${i}`)) i++; sequenceId = `sequence-${i}`; d.sequences.push({ id: sequenceId, duration: 5, composition: comp.id, shots: [{ id: 'shot-1', from: 0, to: 5, camera: { x: 0, h: 0, zoom: 1 } }], tracks: [], text: [], fades: [], beats: [] }); time = 0; loopFrom = 0; loopTo = 5; selectedId = ''; })));
    timelineHost.append(row); if (!seq) { timelineHost.append(element('p', 'muted', 'Add a sequence to begin timeline authoring.')); return; }
    const transport = element('div', 'row'); transport.append(button(playing ? 'Pause' : 'Play', () => { playing = !playing; if (playing && time >= seq.duration) time = loop ? loopFrom : 0; refreshTimeline(); }), button('−1 frame', () => { playing = false; time = Math.max(0, time - 1 / 60); refreshTimeline(); void draw(); }), button('+1 frame', () => { playing = false; time = Math.min(seq.duration, time + 1 / 60); refreshTimeline(); void draw(); }));
    scrub = element('input'); scrub.type = 'range'; scrub.min = '0'; scrub.max = String(seq.duration); scrub.step = String(1 / 60); scrub.value = String(time); scrub.setAttribute('aria-label', 'Sequence time'); scrub.oninput = () => { playing = false; time = Number(scrub!.value); updateTime(); void draw(); }; transport.append(scrub); timeLabel = element('span', 'time'); transport.append(timeLabel); timelineHost.append(transport); updateTime();
    const controls = element('div', 'row'); controls.append(label('Duration', numberInput(seq.duration, v => editTimeline('Change duration', d => { d.sequences.find(s => s.id === sequenceId)!.duration = v; }), 1 / 60)));
    const comps = model.list().filter(d => d.kind === 'composition'); controls.append(label('Composition', select(comps.map(d => ({ value: d.id, label: d.id })), seq.composition, v => editTimeline('Change sequence composition', d => { d.sequences.find(s => s.id === sequenceId)!.composition = v; selectedId = ''; }))));
    const loopInput = element('input'); loopInput.type = 'checkbox'; loopInput.checked = loop; loopInput.onchange = () => loop = loopInput.checked; controls.append(label('Loop range', loopInput), label('From', numberInput(loopFrom, v => { if (v >= loopTo) { notice('Loop start must precede loop end.', true); return; } loopFrom = v; }, 0)), label('To', numberInput(loopTo || seq.duration, v => { if (v <= loopFrom || v > seq.duration) { notice('Loop end must follow its start and remain within the sequence.', true); return; } loopTo = v; }, 0))); timelineHost.append(controls);
    const grid = element('div', 'timeline-grid'), trackPanel = element('div'), dataPanel = element('div'); grid.append(trackPanel, dataPanel); timelineHost.append(grid);
    trackPanel.append(element('h3', '', 'Tracks and keyframes'));
    const trackSelect = select([{ value: '', label: 'Choose a target…' }, ...thisTargets()], '', value => { if (!value) return; try { const target = JSON.parse(value) as Target; addKey(target); } catch (e) { notice(message(e), true); } }); trackSelect.setAttribute('aria-label', 'Add keyframe target'); trackPanel.append(trackSelect);
    for (const track of seq.tracks) {
      const details = element('details'); details.append(element('summary', '', `${track.id} · ${track.keys.length} keys`)); const targetText = track.target.kind === 'camera' ? `camera.${track.target.property}` : `${track.target.instance}.${track.target.kind}.${track.target.property}`; details.append(element('p', 'muted', targetText));
      details.append(button('Key at playhead', () => addKey(track.target)), button('Remove track', () => editTimeline('Delete track', d => { const s = d.sequences.find(x => x.id === sequenceId)!; s.tracks = s.tracks.filter(t => t.id !== track.id); })));
      details.append(label('Reduced motion', select([{ value: 'normal', label: 'Keep motion' }, { value: 'freeze', label: 'Freeze at start' }], track.reduced ?? 'normal', value => editTimeline('Change reduced motion', d => { d.sequences.find(s => s.id === sequenceId)!.tracks.find(t => t.id === track.id)!.reduced = value as 'normal' | 'freeze'; }))));
      for (let index = 0; index < track.keys.length; index++) {
        const key = track.keys[index], keyRow = element('div', 'row');
        const change = (operation: (key: Keyframe) => void) => editTimeline('Edit keyframe', d => { const keys = d.sequences.find(s => s.id === sequenceId)!.tracks.find(t => t.id === track.id)!.keys; operation(keys[index]); keys.sort((a, b) => a.time - b.time); });
        keyRow.append(button(`${key.time.toFixed(3)}s`, () => { time = key.time; playing = false; updateTime(); void draw(); }), button('Delete', () => editTimeline('Delete key', d => { const seq = d.sequences.find(s => s.id === sequenceId)!, item = seq.tracks.find(t => t.id === track.id)!; if (item.keys.length === 1) seq.tracks = seq.tracks.filter(t => t.id !== item.id); else item.keys.splice(index, 1); })));
        details.append(keyRow, label('Key time', numberInput(key.time, value => change(k => k.time = value), 0)));
        const target = track.target; let field: Field;
        if (target.kind === 'property' || target.kind === 'state') { const node = flatten(compositionDocument()!.value as Composition).find(n => n.node.id === target.instance)!.node, entry = config.registry.get(node.type); field = (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property]; }
        else if (target.kind === 'clip') { const node = flatten(compositionDocument()!.value as Composition).find(n => n.node.id === target.instance)!.node; field = { kind: 'select', label: 'Clip', default: '', options: [...(config.clips?.[node.type] ?? [])] }; }
        else if (target.kind === 'instance' && target.property === 'visible') field = { kind: 'boolean', label: 'Visible', default: true };
        else if (target.kind === 'instance' && target.property === 'facing') field = { kind: 'select', label: 'Facing', default: 1, options: [-1, 1] };
        else field = { kind: 'number', label: 'Value', default: 0, ...(target.property === 'zoom' || target.property === 'scale' ? { min: 0.0001 } : target.property === 'opacity' ? { min: 0, max: 1 } : {}) };
        details.append(label(field.label, fieldInput(field, key.value, value => change(k => k.value = value))), label('Easing', select(['linear', 'hold', 'smooth', 'in', 'out'].map(v => ({ value: v, label: v })), key.ease ?? 'linear', value => change(k => k.ease = value as Keyframe['ease']))));
      }
      editArray(details, 'Keyframes', track.keys, keys => editTimeline('Edit keyframes', d => { d.sequences.find(s => s.id === sequenceId)!.tracks.find(t => t.id === track.id)!.keys = keys; }), 'Keys: {time,value,ease}. Easing belongs to the outgoing segment. Discrete values use hold.');
      trackPanel.append(details);
    }
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
    const node = selected(); if (node) { for (const property of ['x', 'h', 'scale', 'facing', 'parallax', 'visible', 'opacity'] as const) add({ kind: 'instance', instance: node.id, property }, `${node.id} · ${property}`); const entry = config.registry.get(node.type); for (const [property, field] of Object.entries(entry.fields)) if (field.animatable) add({ kind: 'property', instance: node.id, property }, `${node.id} · ${field.label}`); for (const [property, field] of Object.entries(entry.visualFields ?? {})) { if (field.animatable) add({ kind: 'state', instance: node.id, property }, `${node.id} state · ${field.label}`); if (config.clips?.[node.type]?.length) add({ kind: 'clip', instance: node.id, property }, `${node.id} clip · ${field.label}`); } }
    return result;
  }
  function addKey(target: Target) {
    editTimeline('Add keyframe', doc => {
      const seq = doc.sequences.find(s => s.id === sequenceId)!; const frame = evaluateTimeline(doc, sequenceId, time, evaluationContext(), { reduced });
      const node = target.kind === 'camera' ? undefined : flatten(frame.composition).find(n => n.node.id === target.instance)?.node;
      let value: Value, discrete = false;
      if (target.kind === 'camera') value = frame.camera[target.property];
      else if (target.kind === 'instance') { value = target.property === 'visible' ? frame.visibility[target.instance] ?? true : target.property === 'opacity' ? frame.opacity[target.instance] ?? 1 : node!.placement[target.property] ?? 1; discrete = ['visible', 'facing'].includes(target.property); }
      else if (target.kind === 'property' || target.kind === 'state') { const entry = config.registry.get(node!.type), field = (target.kind === 'property' ? entry.fields : entry.visualFields!)[target.property]; value = target.kind === 'property' ? node!.props[target.property] ?? field.default : frame.state[target.instance]?.[target.property] ?? field.default; discrete = field.kind !== 'number'; }
      else { value = frame.clips[target.instance]?.[target.property] ?? config.clips?.[node!.type]?.[0] ?? ''; discrete = true; }
      const key: Keyframe = { time: Math.round(time * 60000) / 60000, value, ease: discrete ? 'hold' : 'linear' };
      let track = seq.tracks.find(t => equal(t.target, target)); if (!track) { let i = 1; while (seq.tracks.some(t => t.id === `track-${i}`)) i++; track = { id: `track-${i}`, target, keys: [] }; seq.tracks.push(track); }
      const existing = track.keys.findIndex(k => Math.abs(k.time - key.time) < 1 / 120000); if (existing >= 0) track.keys[existing] = key; else track.keys.push(key); track.keys.sort((a, b) => a.time - b.time);
    });
  }
  function updateTime() { if (scrub) scrub.value = String(time); if (timeLabel) timeLabel.textContent = `${time.toFixed(3)} / ${(sequence()?.duration ?? 0).toFixed(3)} s · frame ${Math.round(time * 60)}`; }
  function previewRequest(composition: Composition, overlay: boolean, scale: number, frame?: TimelineFrame): PreviewRequest {
    const timeline = currentTimeline();
    return { documents: new Map(model.list().map(d => [d.id, d.value])), composition: copy(composition), frame, timeline, sequenceId: timeline ? sequenceId : undefined, time, reduced, overlays: overlay, selectedId, environment: { ...environment, ...(zoomable() ? { renderScale: scale } : {}) } };
  }
  async function draw() {
    if (disposed) return; if (previewPending) { renderAgain = true; return; } const doc = compositionDocument(); if (!doc) { preview = undefined; previewError.textContent = current()?.kind === 'world' ? 'World structure is read-only. Open a scene from the world panel to preview it.' : 'No composition selected.'; previewError.hidden = false; canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); return; }
    previewPending = true; const generation = ++previewGeneration;
    try {
      const timeline = currentTimeline(); const frame = timeline && sequence() ? evaluateTimeline(timeline, sequenceId, time, evaluationContext(), { reduced }) : undefined;
      const composition = dragging?.pending ?? frame?.composition ?? doc.value as Composition;
      const request = (overlay: boolean, scale: number) => previewRequest(composition, overlay, scale, frame);
      if (zoomable() && crop && cropFor !== currentId) {
        // Measure once per document at the full frame; the floor stays anchored to the bottom edge.
        sizeCanvas(baseWidth, baseHeight); const measured = await config.preview.render(canvas, request(false, 1));
        const top = Math.min(baseHeight, ...measured.bounds.filter(b => b.x + b.width > 0 && b.x < baseWidth && b.height > 0).map(b => b.y));
        cropHeight = Math.max(Math.min(baseHeight, 200), Math.min(baseHeight, Math.ceil(baseHeight - Math.max(0, top) + 12))); cropFor = currentId;
      }
      sizeCanvas(baseWidth, zoomable() ? Math.round((crop && cropHeight ? cropHeight : baseHeight) * viewZoom) : baseHeight);
      const result = await config.preview.render(canvas, request(overlays, viewZoom));
      if (!disposed && generation === previewGeneration) { preview = result; previewError.hidden = true; placeHover(); }
    } catch (e) { preview = undefined; previewError.textContent = `Preview unavailable: ${message(e)}`; previewError.hidden = false; }
    finally { previewPending = false; if (renderAgain) { renderAgain = false; void draw(); } }
  }
  function refresh() { if (disposed) return; if(currentId&&!model.list().some(d=>d.id===currentId)){currentId=model.list().find(d=>d.kind==='composition')?.id??'';selectedId='';} const timeline = currentTimeline(); if (timeline && !timeline.sequences.some(s => s.id === sequenceId)) sequenceId = timeline.sequences[0]?.id ?? ''; const seq = sequence(); if (seq) { time = Math.max(0, Math.min(time, seq.duration)); loopTo = Math.min(loopTo || seq.duration, seq.duration); if (loopFrom >= loopTo) loopFrom = 0; } refreshHeader(); refreshOptions(); refreshViewportTools(); refreshLeft(); refreshRight(); refreshTimeline(); void draw(); }
  function zoomable() { return current()?.kind === 'composition'; }
  function sizeCanvas(width: number, height: number) { if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; } canvas.style.setProperty('--ratio', String(width / height)); canvas.style.setProperty('--fit-ratio', String(width / (zoomable() && crop && cropHeight ? cropHeight : baseHeight))); }
  const coordinates = (event: { clientX: number; clientY: number }) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
  /** Small artwork gets a minimum target; the smallest box under the pointer wins over the room behind it. */
  function hitTest(point: { x: number; y: number }) {
    const rect = canvas.getBoundingClientRect(), min = 16 * canvas.width / Math.max(1, rect.width);
    const grow = (b: PreviewResult['bounds'][number]) => { const w = Math.max(b.width, min), h = Math.max(b.height, min); return { ...b, x: b.x - (w - b.width) / 2, y: b.y - (h - b.height) / 2, width: w, height: h, area: b.width * b.height }; };
    return (preview?.bounds ?? []).map(grow).filter(b => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height).sort((a, b) => a.area - b.area)[0];
  }
  function placeHover() {
    const box = hoverId && hoverId !== selectedId ? preview?.bounds.find(b => b.id === hoverId) : undefined; hoverBox.hidden = !box; if (!box) return;
    // The overlay lives outside the scrolling stage so it can never add scrollbars; the frame clips it.
    const frame = stageWrap.getBoundingClientRect(), at = canvas.getBoundingClientRect(), scale = at.width / canvas.width, node = compositionDocument() && flatten(compositionDocument()!.value as Composition).find(x => x.node.id === box.id)?.node;
    const left = at.left - frame.left + box.x * scale, top = at.top - frame.top + box.y * scale;
    Object.assign(hoverBox.style, { left: `${left}px`, top: `${top}px`, width: `${box.width * scale}px`, height: `${box.height * scale}px` });
    hoverBox.dataset.label = node ? `${node.id} · ${config.registry.get(node.type).label}` : box.id;
    hoverBox.toggleAttribute('data-below', top < 22); hoverBox.toggleAttribute('data-right', left > frame.width * .6);
  }
  function zoomTo(next: number, anchor?: { clientX: number; clientY: number }) {
    if (!zoomable()) return; const previous = viewZoom; viewZoom = Math.round(Math.min(8, Math.max(.5, next)) * 100) / 100; if (viewZoom === previous) return;
    const rect = canvas.getBoundingClientRect(), stageRect = stage.getBoundingClientRect(), at = anchor ?? { clientX: Math.max(rect.left, stageRect.left) + Math.min(rect.width, stageRect.width) / 2, clientY: Math.max(rect.top, stageRect.top) + Math.min(rect.height, stageRect.height) / 2 };
    const ax = (at.clientX - rect.left) * canvas.width / rect.width, fromBottom = rect.bottom - at.clientY;
    environment.cameraX = Math.round((Number(environment.cameraX ?? 0) + ax / previous - ax / viewZoom) * 100) / 100;
    sizeCanvas(baseWidth, Math.round((crop && cropHeight ? cropHeight : baseHeight) * viewZoom));
    const after = canvas.getBoundingClientRect(); stage.scrollTop += after.bottom - (at.clientY + fromBottom * viewZoom / previous);
    refreshViewportTools(); refreshOptions(); void draw();
  }
  function fit() { viewZoom = 1; environment.cameraX = 0; cropFor = ''; stage.scrollTop = 0; refreshViewportTools(); refreshOptions(); void draw(); }
  function refreshViewportTools() {
    viewportTools.hidden = !zoomable(); if (!zoomable()) return;
    const level = button(`${Math.round(viewZoom * 100)}%`, () => zoomTo(1), 'Actual size (0)'); level.className = 'zoom-level';
    const cropToggle = button('Crop', () => { crop = !crop; cropFor = ''; refreshViewportTools(); void draw(); }, 'Crop the preview to the artwork height'); cropToggle.setAttribute('aria-pressed', String(crop));
    viewportTools.replaceChildren(button('−', () => zoomTo(viewZoom / 1.25), 'Zoom out (−)'), level, button('+', () => zoomTo(viewZoom * 1.25), 'Zoom in (+)'), button('Fit', fit, 'Fit the scene (F)'), cropToggle);
  }
  const select_ = (id: string) => { selectedId = id; hoverId = ''; if (compact.matches && id) showPanel('properties'); refreshRight(); refreshLeft(); refreshTimeline(); void draw(); };
  // Clicking the dark area around the scene deselects, like clicking empty space in it.
  stage.addEventListener('pointerdown', event => { if (event.target !== stage || event.button !== 0) return; closePicker(); if (selectedId) select_(''); });
  canvas.onpointerdown = event => {
    closePicker();
    if (event.pointerType === 'touch') { touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: viewZoom }; dragging = undefined; panning = undefined; return; } }
    // Only the already-selected artwork can be dragged; any other press selects on release and pans while moving.
    const pressed = event.button === 0 ? hitTest(coordinates(event)) : undefined;
    if (event.button === 1 || (event.button === 0 && (!pressed || pressed.id !== selectedId))) {
      event.preventDefault(); if (!zoomable()) { if (event.button === 0) select_(pressed?.id ?? ''); return; }
      panning = { x: event.clientX, y: event.clientY, camera: Number(environment.cameraX ?? 0), scroll: stage.scrollTop, moved: false, target: event.button === 0 ? pressed?.id ?? '' : undefined }; canvas.setPointerCapture(event.pointerId); canvas.dataset.panning = ''; return;
    }
    if (event.button !== 0) return; const hit = pressed!; const point = coordinates(event);
    const doc = compositionDocument(); if (!doc) return;
    if (current()?.kind === 'timeline') { notice('Timeline preview selection is enabled. Edit local placement in the inspector or add transform keys; dragging is available in the scene document.'); return; }
    if (!preview?.deltaToLocal) { notice('This renderer has not supplied coordinate conversion; numeric transforms remain available.', true); return; }
    dragging = { before: copy(doc.value as Composition), pending: copy(doc.value as Composition), x: point.x, y: point.y, id: hit.id, delta: preview.deltaToLocal }; canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => {
    if (touches.has(event.pointerId)) { touches.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; zoomTo(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.distance), { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); return; } }
    if (panning) { const rect = canvas.getBoundingClientRect(), dx = event.clientX - panning.x, dy = event.clientY - panning.y; if (Math.abs(dx) + Math.abs(dy) > 3) panning.moved = true; environment.cameraX = Math.round(panning.camera - dx * canvas.width / rect.width / viewZoom); stage.scrollTop = panning.scroll - dy; void draw(); return; }
    if (!dragging) { if (event.pointerType === 'mouse') { const hit = hitTest(coordinates(event)); canvas.dataset.hover = hit?.id === selectedId ? 'selected' : hit ? 'artwork' : 'empty'; if ((hit?.id ?? '') !== hoverId) { hoverId = hit?.id ?? ''; placeHover(); } } return; }
    try { const point = coordinates(event), delta = dragging.delta!(dragging.id, point.x - dragging.x, point.y - dragging.y), source = flatten(dragging.before).find(x => x.node.id === dragging!.id)!.node, next = copy(dragging.before), target = flatten(next).find(x => x.node.id === dragging!.id)!.node; target.placement.x = snap ? Math.round((source.placement.x + delta.x) / snap) * snap : source.placement.x + delta.x; target.placement.h = snap ? Math.round((source.placement.h + delta.h) / snap) * snap : source.placement.h + delta.h; dragging.pending = config.registry.validate(next); void draw(); } catch (e) { notice(message(e), true); }
  };
  canvas.onpointerup = event => {
    touches.delete(event.pointerId); if (touches.size < 2) pinch = undefined;
    if (panning) { const { moved, target } = panning; panning = undefined; delete canvas.dataset.panning; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); if (!moved && target !== undefined) select_(target); else refreshOptions(); return; }
    if (!dragging) return; const pending = dragging.pending, unchanged = equal(pending, dragging.before); dragging = undefined; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); if (!unchanged) run(() => model.edit(compositionDocument()!.id, 'Drag artwork', () => pending));
  };
  canvas.onpointercancel = event => { touches.delete(event.pointerId); pinch = undefined; panning = undefined; delete canvas.dataset.panning; dragging = undefined; void draw(); };
  stage.addEventListener('scroll', () => placeHover(), { passive: true });
  canvas.onpointerleave = () => { if (hoverId) { hoverId = ''; placeHover(); } };
  canvas.addEventListener('wheel', event => {
    if (!zoomable()) return;
    if (event.ctrlKey || event.metaKey) { event.preventDefault(); zoomTo(viewZoom * Math.exp(-event.deltaY * .002), event); }
    else if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { event.preventDefault(); environment.cameraX = Math.round(Number(environment.cameraX ?? 0) + (event.deltaX || event.deltaY) / viewZoom); void draw(); }
  }, { passive: false });
  canvas.onkeydown = event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return; const key = event.key;
    if (key === 'Escape' && selectedId) { event.preventDefault(); select_(''); }
    else if ((key === 'Delete' || key === 'Backspace') && selectedId && current()?.kind === 'composition') { event.preventDefault(); const doc = compositionDocument()!; run(() => { model.remove(doc.id, selectedId); selectedId = ''; }); }
    else if (key.toLowerCase() === 'a' && current()?.kind === 'composition') { event.preventDefault(); openPicker(); }
    else if (key === ' ' && current()?.kind === 'composition') { event.preventDefault(); animating = !animating; refreshOptions(); }
    else if (zoomable() && (key === '+' || key === '=')) { event.preventDefault(); zoomTo(viewZoom * 1.25); }
    else if (zoomable() && (key === '-' || key === '_')) { event.preventDefault(); zoomTo(viewZoom / 1.25); }
    else if (zoomable() && key === '0') { event.preventDefault(); zoomTo(1); }
    else if (zoomable() && key.toLowerCase() === 'f') { event.preventDefault(); fit(); }
    else if (selectedId && key.startsWith('Arrow') && current()?.kind === 'composition') {
      event.preventDefault(); const step = event.shiftKey ? 10 : snap || 1, dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0, dh = key === 'ArrowUp' ? step : key === 'ArrowDown' ? -step : 0;
      editInstance('Nudge artwork', n => { n.placement.x += dx; n.placement.h += dh; }); canvas.focus();
    }
  };
  const unload = (event: BeforeUnloadEvent) => { if (model.dirty()) { event.preventDefault(); event.returnValue = ''; } };
  const keyboard = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || !root.contains(document.activeElement)) return;
    const tag = (event.target as HTMLElement).tagName; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && event.key.toLowerCase() !== 's') return;
    if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    else if (event.key.toLowerCase() === 'z') { event.preventDefault(); run(() => event.shiftKey ? model.redo() : model.undo()); }
    else if (event.key.toLowerCase() === 'y') { event.preventDefault(); run(() => model.redo()); }
  };
  const closeMenu = (event: Event) => { const menu = header.querySelector<HTMLDetailsElement>('details.menu'); if (menu?.open && (!menu.contains(event.target as Node) || (event.target as HTMLElement).closest('.menu-items button'))) menu.open = false; };
  window.addEventListener('beforeunload', unload); root.addEventListener('keydown', keyboard); document.addEventListener('click', closeMenu);
  let previous = performance.now(), frameId = 0;
  const tick = (now: number) => { if (disposed) return; const delta = Math.min(0.1, (now - previous) / 1000); previous = now; const seq = sequence(); if (animating && group === 'layout' && current()?.kind === 'composition') { time += delta; if (ambientLabel) ambientLabel.textContent = `${time.toFixed(1)} s`; void draw(); } if (playing && seq) { const end = loop ? loopTo || seq.duration : seq.duration; time += delta; if (time >= end) { if (loop) time = loopFrom + (time - loopFrom) % Math.max(1 / 60, end - loopFrom); else { time = seq.duration; playing = false; refreshTimeline(); } } updateTime(); void draw(); } frameId = requestAnimationFrame(tick); };
  frameId = requestAnimationFrame(tick); void load();
  return { model, openScene, reload: load, save, dispose() { disposed = true; cancelAnimationFrame(frameId); cleanupWorld?.(); cleanupAssets?.(); disposeInspector(); thumbnails?.dispose(); workbenches.forEach(item => item.dispose?.()); window.removeEventListener('beforeunload', unload); root.removeEventListener('keydown', keyboard); document.removeEventListener('click', closeMenu); root.remove(); } };
}
