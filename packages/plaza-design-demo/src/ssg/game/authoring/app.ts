/** Local static/animated composition editor. Drawing belongs to the injected game preview. */
import { ArtRegistry, type Composition, type Instance, type Field, type Value, type Point, type Properties } from '../art/core/composition';
import { evaluateTimeline, validateTimeline, type TimelineContext, type TimelineDocument, type TimelineFrame, type Sequence, type Target, type Keyframe } from '../art/core/timeline';
import { composerStyles } from './styles';
import { preserveBoundIdentity } from './bound-identity';
import type { Light } from '../world/light';
import type { Climate, Weather } from '../world/weather';
import { mountAssetBrowser, type AssetBrowserSession, type AssetEntry, type AssetUsage, type AssetPreviewReport } from './asset-browser';
import type { Environment } from '../art/core/composition';
import { createDocumentBundle, readDocumentBundle } from './document-bundle';

export interface EditorDocument { id: string; kind: 'composition' | 'timeline' | 'world' | 'behavior'; revision: string; value: unknown }
export interface PreviewRequest { composition: Composition; frame?: TimelineFrame; timeline?: TimelineDocument; sequenceId?: string; time: number; reduced: boolean; overlays: boolean; selectedId?: string; lighting?: Light; weather?: Weather; climate?: Climate | null; environment: Record<string, string | number | boolean> }
export interface PreviewResult { bounds: { id: string; x: number; y: number; width: number; height: number }[]; deltaToLocal?(id: string, dx: number, dy: number): Point; artwork?: { composition: Composition; environment: Environment } }
export interface EnvironmentControl { key: string; label: string; kind: 'number' | 'boolean' | 'select' | 'text'; options?: string[]; min?: number; max?: number; step?: number }
export interface WorkbenchContext {
  documents: EditorDocument[]; openScene(scene: string): void; openInstance(document: string, instance: string): void;
  authoring?: { get(id: string): EditorDocument; edit(id: string, label: string, value: unknown): void; undo(): void; redo(): void; save(): Promise<void>; reload(): Promise<void>; dirty(id: string): boolean };
}
export type WorkbenchHandle = (() => void) & { refresh?(): void };
export interface ComposerConfig {
  registry: ArtRegistry; api?: { url: string; token: string }; documents?: EditorDocument[]; viewport?: { width: number; height: number };
  preview: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult | Promise<PreviewResult> };
  destinations?: TimelineContext['destinations']; motionTracks?: TimelineContext['motionTracks']; clips?: TimelineContext['clips'];
  timelineContext?(base: TimelineContext, preview: { time: number; reduced: boolean; sequenceId: string; environment: Record<string, string | number | boolean>; viewport: { width: number; height: number }; timeline?: TimelineDocument }): TimelineContext;
  validateDocument?(document: EditorDocument, documents: EditorDocument[]): void;
  initialEnvironment?: Record<string, string | number | boolean>; environmentControls?: EnvironmentControl[];
  worldPanel?(host: HTMLElement, openScene: (scene: string) => void, documents: EditorDocument[]): void | (() => void);
  assetPreview?(canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, documents: EditorDocument[], settings: Pick<PreviewRequest, 'time' | 'reduced' | 'environment'>): string | AssetPreviewReport | Promise<string | AssetPreviewReport>;
  workbenches?: { id: string; title: string; label?: string; documentDependent?: boolean; documentIds?: string[]; authoring?: boolean; mount(host: HTMLElement, context: WorkbenchContext): WorkbenchHandle }[];
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
  constructor(readonly registry: ArtRegistry, readonly context: Omit<TimelineContext, 'registry' | 'compositions'> = {}, readonly validateDocument?: ComposerConfig['validateDocument']) {}
  load(documents: EditorDocument[]) {
    const next = new Map<string, EditorDocument>();
    for (const doc of documents) { if (next.has(doc.id)) throw new Error('Duplicate document id'); next.set(doc.id, copy(doc)); }
    this.validate(next); this.documents = next; this.saved = new Map([...next].map(([id, d]) => [id, copy(d.value)])); this.past = []; this.future = [];
  }
  list() { return [...this.documents.values()].map(copy); }
  get(id: string) { const doc = this.documents.get(id); if (!doc) throw new Error(`Unknown document: ${id}`); return copy(doc); }
  timelineContext(documents = this.documents): TimelineContext {
    const compositions: Record<string, Composition> = {};
    for (const doc of documents.values()) if (doc.kind === 'composition') compositions[doc.id] = doc.value as Composition;
    return { ...this.context, registry: this.registry, compositions };
  }
  private validate(documents: Map<string, EditorDocument>) {
    for (const doc of documents.values()) if (doc.kind === 'composition') this.registry.validate(doc.value);
    const ctx = this.timelineContext(documents);
    for (const doc of documents.values()) if (doc.kind === 'timeline') validateTimeline(doc.value, ctx);
    const all = [...documents.values()];
    for (const doc of all) {
      if (doc.kind === 'behavior' && !this.validateDocument) throw new Error('Behavior documents require their registered validator');
      this.validateDocument?.(doc, all);
    }
  }
  edit(id: string, label: string, operation: (value: unknown) => unknown) {
    const doc = this.get(id); if (doc.kind === 'world') throw new Error('World structure is read-only in this composer');
    const value = operation(copy(doc.value)); if (equal(value, doc.value)) return;
    if (doc.kind === 'composition') {
      const before = doc.value as Composition, after = this.registry.validate(value);
      if (after.scene !== before.scene) throw new Error('Scene identity cannot be changed by the local composer');
      preserveBoundIdentity(before, after);
    }
    const next = new Map(this.documents); next.set(id, { ...doc, value }); this.validate(next);
    this.documents = next; this.past.push({ label, before: [{ id, value: doc.value }], after: [{ id, value: copy(value) }] });
    if (this.past.length > 100) this.past.shift(); this.future = [];
  }
  /** Downloaded edits enter one validated history transaction; saved revisions stay local. */
  importDocuments(changes: { id: string; value: unknown }[]) {
    const next = new Map(this.documents), ids = new Set<string>(), before: Snapshot[] = [], after: Snapshot[] = [];
    for (const item of changes) {
      if (ids.has(item.id)) throw new Error('Duplicate imported document'); ids.add(item.id);
      const doc = this.get(item.id); if (doc.kind === 'world') throw new Error('World structure is read-only');
      const value = copy(item.value); if (equal(value, doc.value)) continue;
      if (doc.kind === 'composition') {
        const composition = this.registry.validate(value);
        if (composition.scene !== (doc.value as Composition).scene) throw new Error('Scene identity cannot be changed');
        preserveBoundIdentity(doc.value as Composition, composition);
      }
      next.set(item.id, { ...doc, value }); before.push({ id: item.id, value: doc.value }); after.push({ id: item.id, value });
    }
    if (!before.length) return; this.validate(next);
    this.documents = next; this.past.push({ label: 'Import downloaded edits', before, after });
    if (this.past.length > 100) this.past.shift(); this.future = [];
  }
  private restore(snapshots: Snapshot[]) { const next = new Map(this.documents); for (const item of snapshots) next.set(item.id, { ...this.get(item.id), value: copy(item.value) }); this.validate(next); this.documents = next; }
  undo() { const command = this.past[this.past.length - 1]; if (!command) return; this.restore(command.before); this.past.pop(); this.future.push(command); }
  redo() { const command = this.future[this.future.length - 1]; if (!command) return; this.restore(command.after); this.future.pop(); this.past.push(command); }
  get canUndo() { return !!this.past.length; } get canRedo() { return !!this.future.length; }
  get undoLabel() { return this.past[this.past.length - 1]?.label ?? ''; }
  dirty(id?: string) { return id ? !equal(this.documents.get(id)?.value, this.saved.get(id)) : [...this.documents].some(([key, d]) => !equal(d.value, this.saved.get(key))); }
  edits() { return this.list().filter(d => d.kind !== 'world' && this.dirty(d.id)).map(d => ({ id: d.id, revision: d.revision, value: d.value })); }
  confirmSaved(documents: EditorDocument[]) { for (const saved of documents) { const current = this.documents.get(saved.id); if (!current) throw new Error('Save returned an unknown document'); current.revision = saved.revision; this.saved.set(saved.id, copy(saved.value)); } }
  updateInstance(id: string, instanceId: string, label: string, edit: (node: Instance) => void) {
    this.edit(id, label, value => { const doc = value as Composition, node = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!node) throw new Error('Selected instance no longer exists'); edit(node); return doc; });
  }
  add(id: string, type: string) {
    const element = this.registry.get(type); let instanceId = '';
    this.edit(id, 'Add artwork', value => { const doc = value as Composition; instanceId = this.unique(doc, type.replace(/[^a-zA-Z0-9_-]/g, '-')); const props: Properties = {}; for (const [key, field] of Object.entries(element.fields)) props[key] = copy(field.default) as Value; doc.instances.push({ id: instanceId, type, props, placement: { x: 0, h: 0 }, order: Math.max(-1, ...flatten(doc).map(x => x.node.order)) + 1, pass: element.parts[0] ?? 'backdrop' }); return doc; }); return instanceId;
  }
  private unique(doc: Composition, prefix: string) { const ids = new Set(flatten(doc).map(x => x.node.id)); let i = 1; while (ids.has(`${prefix}-${i}`)) i++; return `${prefix}-${i}`; }
  duplicate(id: string, instanceId: string) {
    let created = '';
    this.edit(id, 'Duplicate artwork', value => {
      const doc = value as Composition, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const duplicate = copy(source), ids = new Map<string, string>();
      const walk = (node: Instance) => { if (Object.keys(node.bindings ?? {}).length) throw new Error('Gameplay-bound artwork cannot be duplicated; add a decorative catalog element instead'); const old = node.id; node.id = this.unique(doc, old + '-copy'); ids.set(old, node.id); node.children?.forEach(walk); };
      walk(duplicate); const attach = (node: Instance) => { if (node.attach && ids.has(node.attach.instance)) node.attach.instance = ids.get(node.attach.instance)!; node.children?.forEach(attach); }; attach(duplicate);
      const siblings = (nodes: Instance[]): Instance[] | undefined => nodes.includes(source) ? nodes : nodes.map(n => siblings(n.children ?? [])).find(Boolean);
      duplicate.placement.x += 12; duplicate.order += 1; siblings(doc.instances)!.push(duplicate); created = duplicate.id; return doc;
    }); return created;
  }
  remove(id: string, instanceId: string) {
    this.edit(id, 'Delete artwork', value => {
      const doc = value as Composition, source = flatten(doc).find(x => x.node.id === instanceId)?.node; if (!source) throw new Error('Missing instance');
      const removed = new Set<string>(); const visit = (node: Instance) => { if (Object.keys(node.bindings ?? {}).length) throw new Error('Resolve gameplay bindings before deleting this artwork'); removed.add(node.id); node.children?.forEach(visit); }; visit(source);
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
  const model = new ComposerModel(config.registry, { destinations: config.destinations, clips: config.clips, motionTracks: config.motionTracks }, config.validateDocument);
  const root = element('section', 'scene-composer'); root.setAttribute('aria-label', 'Scene and animation composer');
  const style = element('style'); style.textContent = composerStyles; root.append(style);
  const header = element('header'), status = element('div', 'status', 'Loading authoring documents…'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const workspace = element('div', 'workspace'), left = element('aside'), center = element('div', 'preview-column'), right = element('aside');
  left.setAttribute('aria-label', 'Documents and artwork hierarchy'); right.setAttribute('aria-label', 'Selected artwork properties');
  const options = element('div', 'preview-options'), stage = element('div', 'preview-stage'), canvas = element('canvas'), previewError = element('div', 'preview-error');
  canvas.width = config.viewport?.width ?? 960; canvas.height = config.viewport?.height ?? 540; canvas.setAttribute('aria-label', 'Game renderer preview. Select artwork to edit.'); canvas.tabIndex = 0; previewError.hidden = true;
  const timelineHost = element('section', 'timeline'); timelineHost.setAttribute('aria-label', 'Animation timeline');
  const panelSwitch = element('div', 'panel-switch'); panelSwitch.setAttribute('role', 'group'); panelSwitch.setAttribute('aria-label', 'Editor panel');
  const tools = element('nav', 'tools'); tools.setAttribute('aria-label', 'Editor tools');
  const compact = window.matchMedia('(max-width: 760px)');
  let worldOpen = !compact.matches, catalogOpen = false, environmentOpen = false;
  const showPanel = (panel: 'layers' | 'properties') => { root.dataset.panel = panel; for (const item of panelSwitch.children) item.setAttribute('aria-pressed', String((item as HTMLElement).dataset.panel === panel)); };
  for (const [panel, text] of [['layers', 'Layers'], ['properties', 'Properties']] as const) { const tab = button(text, () => showPanel(panel)); tab.dataset.panel = panel; panelSwitch.append(tab); }
  canvas.style.setProperty('--ratio', String(canvas.width / canvas.height)); showPanel('layers');
  stage.append(canvas, previewError); center.append(options, stage, timelineHost); workspace.append(center, panelSwitch, left, right); root.append(header, tools, status, workspace); host.append(root);
  let currentId = '', selectedId = '', sequenceId = '', time = 0, playing = false, loop = false, loopFrom = 0, loopTo = 0, reduced = false, overlays = true, snap = 1, saving = false, disposed = false;
  let preview: PreviewResult | undefined, previewGeneration = 0, previewPending = false, renderAgain = false;
  let dragging: { before: Composition; pending: Composition; x: number; y: number; id: string; delta: PreviewResult['deltaToLocal'] } | undefined;
  let scrub: HTMLInputElement | undefined, timeLabel: HTMLElement | undefined;
  const environment: Record<string, string | number | boolean> = { cameraX: 0, zoom: 1, ...config.initialEnvironment };
  let cleanupWorld: void | (() => void), worldHost: HTMLElement | undefined;
  let cleanupAssets: void | (() => void); const assetSession: AssetBrowserSession = {};
  const assetHost = element('details', 'asset-browser tool-panel'); assetHost.dataset.tool = 'assets'; assetHost.append(element('summary', '', 'Asset browser · read-only')); const assetPanel = element('div'); assetHost.append(assetPanel); if (config.assetPreview) root.insertBefore(assetHost, workspace);
  const workbenches = (config.workbenches ?? []).map(workbench => {
    const details = element('details', 'workbench-screen tool-panel'), panel = element('section'); details.dataset.workbench = details.dataset.tool = workbench.id; details.append(element('summary', '', workbench.title), panel); root.insertBefore(details, workspace);
    return { config: workbench, details, panel, dispose: undefined as WorkbenchHandle | undefined, documentsVersion: '' };
  });
  const panels = [...(config.assetPreview ? [{ details: assetHost, label: 'Assets', title: 'Asset browser · read-only' }] : []), ...workbenches.map(item => ({ details: item.details, label: item.config.label ?? item.config.title.split(' · ')[0], title: item.config.title }))];
  const showScene = () => panels.forEach(item => item.details.open = false);
  const refreshTools = () => {
    const active = panels.find(item => item.details.open); root.dataset.tool = active?.details.dataset.tool ?? 'scene';
    for (const tab of tools.children) tab.setAttribute('aria-pressed', String((tab as HTMLElement).dataset.tool === root.dataset.tool));
  };
  const sceneTab = button('Scene', showScene, 'Scene and timeline editor'); sceneTab.dataset.tool = 'scene'; tools.append(sceneTab);
  for (const item of panels) { const tab = button(item.label, () => { item.details.open = true; }, item.title); tab.dataset.tool = item.details.dataset.tool; tools.append(tab); }
  const openInstance = (document: string, instance: string) => { currentId = document; selectedId = instance; playing = false; syncSequence(); showScene(); showPanel('properties'); refresh(); };
  const refreshWorkbench = (item: typeof workbenches[number], changed = false) => {
    const documents = model.list(), relevant = item.config.documentIds ? documents.filter(doc => item.config.documentIds!.includes(doc.id)) : documents;
    const version = item.config.documentDependent ? JSON.stringify(relevant) : '';
    if (!item.details.open) { item.dispose?.(); item.dispose = undefined; }
    else if (changed && item.config.documentDependent && version !== item.documentsVersion && item.dispose) {
      if (item.dispose.refresh) { item.documentsVersion = version; item.dispose.refresh(); }
      else { item.dispose(); item.dispose = undefined; }
    }
    if (item.details.open && !item.dispose) {
      item.documentsVersion = version;
      try { item.dispose = item.config.mount(item.panel, { documents, openScene, openInstance,
        ...(item.config.authoring ? { authoring: { get: (id: string) => model.get(id), edit: (id: string, label: string, value: unknown) => run(() => model.edit(id, label, () => value)),
          undo: () => run(() => model.undo()), redo: () => run(() => model.redo()), save, reload: load, dirty: (id: string) => model.dirty(id) } } : {}),
      }); }
      catch (error) { item.panel.replaceChildren(element('p', 'error', `Workbench unavailable: ${message(error)}`)); }
    }
  };
  workbenches.forEach(item => item.details.ontoggle = () => { if (item.details.open) { assetHost.open = false; workbenches.filter(other => other !== item).forEach(other => other.details.open = false); } refreshWorkbench(item); refreshTools(); });
  assetHost.ontoggle = () => { if (assetHost.open) workbenches.forEach(item => item.details.open = false); refreshTools(); };
  refreshTools();
  const notice = (text: string, error = false) => { status.textContent = text; status.className = 'status' + (error ? ' error' : ''); };
  const run = (action: () => void) => { try { action(); refresh(); } catch (e) { notice(message(e), true); } };
  const current = () => currentId ? model.get(currentId) : undefined;
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
  function openScene(scene: string) { const doc = model.list().find(d => d.kind === 'composition' && (d.value as Composition).scene === scene); if (doc) { showScene(); openDocument(doc.id); } else notice(`Scene ${scene} has no editable composition in this session.`, true); }
  function refreshHeader() {
    const brand = element('div', 'brand'); brand.append(element('strong', '', 'ACCESS DENIED'), element('span', '', config.api ? 'Composer' : 'Editor')); header.replaceChildren(brand);
    const actions = element('div', 'actions'), menu = element('details', 'menu'), menuItems = element('div', 'menu-items'); menu.append(element('summary', '', 'More'), menuItems);
    const docs = model.list(); const chooser = select(docs.map(d => ({ value: d.id, label: `${model.dirty(d.id) ? '● ' : ''}${d.kind}: ${d.id}` })), currentId, openDocument); chooser.setAttribute('aria-label', 'Authoring document'); chooser.className = 'document-picker'; header.append(chooser);
    const dirty = element('span', 'state ' + (model.dirty() ? 'dirty' : 'muted'), model.dirty() ? 'Unsaved changes' : config.api ? 'Saved' : 'Published snapshot'); header.append(dirty, actions);
    const saveButton = button(saving ? 'Saving…' : config.api ? 'Save to source' : 'Download edits', () => void save()); saveButton.className = 'primary'; saveButton.disabled = saving || !model.dirty();
    const undo = button('Undo', () => run(() => model.undo()), model.undoLabel), redo = button('Redo', () => run(() => model.redo())); undo.disabled = !model.canUndo; redo.disabled = !model.canRedo; actions.append(undo, redo, saveButton, menu);
    menuItems.append(button(config.api ? 'Reload source' : 'Reset edits', () => { if (!model.dirty() || window.confirm('Discard unsaved edits and reload the source snapshot? Download or export first to keep them.')) void load(); }));
    const bundleFile = element('input'); bundleFile.type = 'file'; bundleFile.accept = 'application/json,.json'; bundleFile.hidden = true; bundleFile.setAttribute('aria-label', 'Import downloaded edits');
    bundleFile.onchange = async () => { const file = bundleFile.files?.[0]; if (!file) return; try { if (file.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const changes = readDocumentBundle(JSON.parse(await file.text()), model.list()); run(() => { model.importDocuments(changes); syncSequence(); }); } catch (error) { notice(`Import failed: ${message(error)}`, true); } finally { bundleFile.value = ''; } };
    menuItems.append(button('Import edits', () => bundleFile.click()), bundleFile);
    menuItems.append(button('Export JSON', () => { const doc = current(); if (!doc) return; const url = URL.createObjectURL(new Blob([JSON.stringify(doc.value, null, 2) + '\n'], { type: 'application/json' })); const link = element('a'); link.href = url; link.download = doc.id + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
    const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    file.onchange = async () => { const selectedFile = file.files?.[0]; if (!selectedFile) return; try { if (selectedFile.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB'); const value: unknown = JSON.parse(await selectedFile.text()); run(() => { const doc = current(); if (!doc || doc.kind === 'world') throw new Error('Select a composition or timeline document to import'); model.edit(doc.id, 'Import document', () => value); syncSequence(); }); } catch (e) { notice(`Import failed: ${message(e)}`, true); } };
    const importButton = button('Import JSON', () => file.click()); importButton.disabled = current()?.kind === 'world'; menuItems.append(importButton, file);
  }
  function refreshOptions() {
    const quick = element('div', 'quick'), settings = element('details', 'environment'), grid = element('div', 'environment-grid');
    settings.open = environmentOpen; settings.ontoggle = () => { environmentOpen = settings.open; };
    settings.append(element('summary', '', 'Preview environment'), grid); options.replaceChildren(quick, settings);
    const check = (text: string, value: boolean, change: (v: boolean) => void) => { const input = element('input'); input.type = 'checkbox'; input.checked = value; input.onchange = () => { change(input.checked); void draw(); }; quick.append(label(text, input)); };
    check('Selection overlays', overlays, v => overlays = v); check('Reduced motion', reduced, v => reduced = v);
    const snapInput = element('input'); snapInput.type = 'number'; snapInput.min = '0'; snapInput.step = '1'; snapInput.value = String(snap); snapInput.onchange = () => { const v = Number(snapInput.value); if (Number.isFinite(v) && v >= 0) snap = v; }; quick.append(label('Snap', snapInput));
    if (current()?.kind === 'composition') { const input = element('input'); input.type = 'number'; input.min = '0'; input.step = '0.0166666667'; input.value = time.toFixed(3); input.onchange = () => { const v = Number(input.value); if (Number.isFinite(v) && v >= 0) { time = v; void draw(); } }; const frames = element('div', 'frame-step'); frames.append(button('−1 frame', () => { time = Math.max(0, time - 1 / 60); refreshOptions(); void draw(); }), button('+1 frame', () => { time += 1 / 60; refreshOptions(); void draw(); })); quick.append(label('Preview seconds', input), frames); }
    const controls: EnvironmentControl[] = config.environmentControls ?? [{ key: 'cameraX', label: 'Camera X', kind: 'number', step: 10 }, { key: 'zoom', label: 'Zoom', kind: 'number', min: 0.1, max: 8, step: 0.1 }];
    for (const control of controls) {
      if (control.kind === 'select') grid.append(label(control.label, select((control.options ?? []).map(v => ({ value: v, label: v })), String(environment[control.key] ?? ''), value => { environment[control.key] = value; void draw(); })));
      else { const input = element('input'); input.type = control.kind === 'boolean' ? 'checkbox' : control.kind === 'text' ? 'text' : 'number'; input.checked = !!environment[control.key]; input.value = String(environment[control.key] ?? (control.kind === 'text' ? '' : 0)); if (control.min !== undefined) input.min = String(control.min); if (control.max !== undefined) input.max = String(control.max); if (control.step !== undefined) input.step = String(control.step); input.onchange = () => { const value = control.kind === 'boolean' ? input.checked : control.kind === 'text' ? input.value : Number(input.value); if (typeof value === 'number' && !Number.isFinite(value)) return; environment[control.key] = value; void draw(); }; const row = label(control.label, input); if (control.kind === 'text') row.classList.add('wide'); grid.append(row); }
    }
  }
  function refreshLeft() {
    cleanupWorld?.(); cleanupWorld = undefined; cleanupAssets?.(); cleanupAssets = undefined; left.replaceChildren();
    workbenches.forEach(item => refreshWorkbench(item, true));
    if (config.assetPreview) {
      assetPanel.replaceChildren(); cleanupAssets = mountAssetBrowser(assetPanel, { registry: config.registry, documents: model.list(),
        openUsage(usage) { openInstance(usage.document, usage.instance); },
        preview: (canvas, entry, usage, zoom) => config.assetPreview!(canvas, entry, usage, model.list(), { time, reduced, environment: { ...environment, renderScale: zoom } }),
      }, assetSession);
    }
    if (config.worldPanel) { const details = element('details', 'world'); details.open = worldOpen; details.ontoggle = () => { worldOpen = details.open; }; details.append(element('summary', '', 'World and scenes · read-only')); worldHost = element('div'); details.append(worldHost); left.append(details); cleanupWorld = config.worldPanel(worldHost, openScene, model.list()); }
    left.append(element('h2', '', 'Artwork layers'));
    const doc = compositionDocument();
    if (doc) {
      const list = element('ul', 'hierarchy');
      for (const { node, depth } of flatten(doc.value as Composition)) { const item = element('li'); const pick = button(node.id, () => { selectedId = node.id; if (compact.matches) showPanel('properties'); refreshRight(); refreshLeft(); void draw(); }, `${node.type} · ${node.pass} · order ${node.order}`); pick.style.paddingLeft = `${10 + depth * 14}px`; pick.setAttribute('aria-pressed', String(node.id === selectedId)); item.append(pick); list.append(item); }
      left.append(list); const row = element('div', 'row'); const duplicate = button('Duplicate', () => run(() => { selectedId = model.duplicate(doc.id, selectedId); })), remove = button('Delete', () => run(() => { model.remove(doc.id, selectedId); selectedId = ''; })); duplicate.disabled = remove.disabled = !selected(); row.append(duplicate, remove); left.append(row);
      const details = element('details'); details.open = catalogOpen; details.ontoggle = () => { catalogOpen = details.open; }; details.append(element('summary', '', 'Artwork catalog'));
      const catalog = element('div', 'catalog-list'); for (const entry of config.registry.catalog()) { const add = button(`+ ${entry.label}`, () => run(() => selectedId = model.add(doc.id, entry.type)), `${entry.category}: ${entry.type}`); catalog.append(add); } details.append(catalog); left.append(details);
    } else left.append(element('p', 'muted', 'Select a composition or a timeline with a composition reference.'));
  }
  function numberInput(value: number, apply: (n: number) => void, min?: number, step = 'any') { const input = element('input'); input.type = 'number'; input.step = step; if (min !== undefined) input.min = String(min); input.value = String(value); input.onchange = () => { const number = Number(input.value); if (!Number.isFinite(number) || min !== undefined && number < min) { notice('Enter a finite number within the field range.', true); return; } apply(number); }; return input; }
  function fieldInput(field: Field, value: Value, apply: (v: Value) => void): HTMLElement {
    const kind = field.kind as string;
    if (kind === 'select') return select((field.options ?? []).map(v => ({ value: String(v), label: String(v) })), String(value), v => { const actual = field.options?.find(x => String(x) === v); if (actual !== undefined) apply(actual); });
    if (kind === 'number') { const input = numberInput(value as number, apply, field.min, String(field.step ?? 'any')); if (field.max !== undefined) input.max = String(field.max); return input; }
    if (kind === 'boolean') { const input = element('input'); input.type = 'checkbox'; input.checked = value as boolean; input.onchange = () => apply(input.checked); return input; }
    if (kind === 'json') { const wrap = element('div'), input = element('textarea'); input.value = JSON.stringify(value, null, 2); input.setAttribute('aria-label', field.label); wrap.append(input, button('Apply JSON field', () => { try { apply(JSON.parse(input.value) as Value); } catch (e) { notice(message(e), true); } })); return wrap; }
    const input = element('input'); input.type = 'text'; input.value = String(value); input.onchange = () => apply(input.value); return input;
  }
  function refreshRight() {
    right.replaceChildren(element('h2', '', 'Selected artwork')); const node = selected();
    if (!node) { right.append(element('p', 'muted', 'Select an item in the hierarchy or click it in the preview.')); return; }
    const art = config.registry.get(node.type); right.append(element('strong', '', node.id), element('p', 'muted', `${art.label} · ${node.type}`));
    if (current()?.kind === 'timeline') right.append(element('p', 'muted', 'These edit the base composition. Timeline keys can override these values; use track keyframes to animate.'));
    right.append(element('h3', '', 'Local transform'));
    for (const [key, value, min] of [['x', node.placement.x], ['h', node.placement.h], ['scale', node.placement.scale ?? 1, 0.0001], ['parallax', node.placement.parallax ?? 1, 0]] as [keyof Instance['placement'], number, number?][]) right.append(label(key, numberInput(value, v => editInstance(`Change ${key}`, n => { n.placement[key] = v as never; }), min)));
    right.append(label('Facing', select([{ value: '1', label: 'Right' }, { value: '-1', label: 'Left' }], String(node.placement.facing ?? 1), v => editInstance('Change facing', n => n.placement.facing = Number(v) as 1 | -1))));
    right.append(label('Order', numberInput(node.order, v => editInstance('Change layer order', n => n.order = v))));
    right.append(label('Pass', select(['backdrop', 'devices', 'people', 'foreground'].map(v => ({ value: v, label: v })), node.pass, v => editInstance('Change drawing pass', n => n.pass = v as Instance['pass']))));
    right.append(element('h3', '', 'Appearance'));
    for (const [key, field] of Object.entries(art.fields)) { const value = node.props[key] ?? field.default; const control = fieldInput(field, value, v => editInstance(`Change ${field.label}`, n => n.props[key] = v)); right.append(label(field.label + (field.unit ? ` (${field.unit})` : ''), control)); }
    const composition = compositionDocument()!.value as Composition;
    const anchorDetails = element('details'); anchorDetails.append(element('summary', '', 'Attachment and anchors'));
    const candidates = flatten(composition).map(x => x.node).filter(n => n.id !== node.id);
    const attachTo = select([{ value: '', label: 'None / parent origin' }, ...candidates.map(n => ({ value: n.id, label: n.id }))], node.attach?.instance ?? '', v => editInstance('Change attachment', n => { if (!v) { delete n.attach; return; } const owner = candidates.find(x => x.id === v)!; const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); const anchor = Object.keys(anchors)[0]; if (!anchor) throw new Error('The selected owner exposes no anchors'); n.attach = { instance: v, anchor }; })); anchorDetails.append(label('Attach to', attachTo));
    if (node.attach) { const owner = candidates.find(n => n.id === node.attach!.instance); if (owner) { const anchors = config.registry.get(owner.type).anchors(config.registry.properties(owner.type, owner.props), {}); anchorDetails.append(label('Owner anchor', select(Object.keys(anchors).map(v => ({ value: v, label: `${v} · ${anchors[v].role}` })), node.attach.anchor, v => editInstance('Change anchor', n => n.attach!.anchor = v)))); } }
    const ownAnchors = art.anchors(config.registry.properties(node.type, node.props), {}); for (const [name, anchor] of Object.entries(ownAnchors)) anchorDetails.append(element('p', 'muted', `${name}: (${anchor.x}, ${anchor.h}) · ${anchor.role}`));
    anchorDetails.append(element('p', 'muted', 'Attachment offsets are local. Changing an owner keeps the existing local offset; review the preview before saving.')); right.append(anchorDetails);
    if (Object.keys(node.bindings ?? {}).length) { const binding = element('div', 'readonly'); binding.append(element('strong', '', 'Gameplay bindings · read-only'), element('p', 'muted', JSON.stringify(node.bindings))); right.append(binding); }
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
    const handoff = element('details'); handoff.append(element('summary', '', 'Handoff destination')); const destinations = Object.keys(config.destinations ?? {}); handoff.append(label('Scene', select([{ value: '', label: 'No handoff' }, ...destinations.map(v => ({ value: v, label: v }))], seq.handoff?.scene ?? '', v => apply('handoff', v ? { scene: v } : undefined))));
    if (seq.handoff) handoff.append(label('Entrance', select([{ value: '', label: 'Default entrance' }, ...(config.destinations?.[seq.handoff.scene] ?? []).map(v => ({ value: v, label: v }))], seq.handoff.entrance ?? '', v => apply('handoff', { scene: seq.handoff!.scene, ...(v ? { entrance: v } : {}) })))); handoff.append(element('p', 'muted', 'Preview never travels or changes player progress.')); dataPanel.append(handoff);
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
  async function draw() {
    if (disposed) return; if (previewPending) { renderAgain = true; return; } const doc = compositionDocument(); if (!doc) { preview = undefined; previewError.textContent = current()?.kind === 'world' ? 'World structure is read-only. Open a scene from the world panel to preview it.' : 'No composition selected.'; previewError.hidden = false; canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); return; }
    previewPending = true; const generation = ++previewGeneration;
    try {
      const timeline = currentTimeline(); const frame = timeline && sequence() ? evaluateTimeline(timeline, sequenceId, time, evaluationContext(), { reduced }) : undefined;
      const composition = dragging?.pending ?? frame?.composition ?? doc.value as Composition;
      const result = await config.preview.render(canvas, { composition: copy(composition), frame, timeline, sequenceId: timeline ? sequenceId : undefined, time, reduced, overlays, selectedId, environment: { ...environment } });
      if (!disposed && generation === previewGeneration) { preview = result; previewError.hidden = true; }
    } catch (e) { preview = undefined; previewError.textContent = `Preview unavailable: ${message(e)}`; previewError.hidden = false; }
    finally { previewPending = false; if (renderAgain) { renderAgain = false; void draw(); } }
  }
  function refresh() { if (disposed) return; const timeline = currentTimeline(); if (timeline && !timeline.sequences.some(s => s.id === sequenceId)) sequenceId = timeline.sequences[0]?.id ?? ''; const seq = sequence(); if (seq) { time = Math.max(0, Math.min(time, seq.duration)); loopTo = Math.min(loopTo || seq.duration, seq.duration); if (loopFrom >= loopTo) loopFrom = 0; } refreshHeader(); refreshOptions(); refreshLeft(); refreshRight(); refreshTimeline(); void draw(); }
  const coordinates = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
  canvas.onpointerdown = event => {
    if (event.button !== 0) return; const point = coordinates(event), hit = [...(preview?.bounds ?? [])].reverse().find(b => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height); selectedId = hit?.id ?? ''; refreshRight(); refreshLeft(); refreshTimeline(); void draw();
    const doc = compositionDocument(); if (!hit || !doc) return;
    if (current()?.kind === 'timeline') { notice('Timeline preview selection is enabled. Edit local placement in the inspector or add transform keys; dragging is available in the scene document.'); return; }
    if (!preview?.deltaToLocal) { notice('This renderer has not supplied coordinate conversion; numeric transforms remain available.', true); return; }
    dragging = { before: copy(doc.value as Composition), pending: copy(doc.value as Composition), x: point.x, y: point.y, id: hit.id, delta: preview.deltaToLocal }; canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = event => { if (!dragging) return; try { const point = coordinates(event), delta = dragging.delta!(dragging.id, point.x - dragging.x, point.y - dragging.y), source = flatten(dragging.before).find(x => x.node.id === dragging!.id)!.node, next = copy(dragging.before), target = flatten(next).find(x => x.node.id === dragging!.id)!.node; target.placement.x = snap ? Math.round((source.placement.x + delta.x) / snap) * snap : source.placement.x + delta.x; target.placement.h = snap ? Math.round((source.placement.h + delta.h) / snap) * snap : source.placement.h + delta.h; dragging.pending = config.registry.validate(next); void draw(); } catch (e) { notice(message(e), true); } };
  canvas.onpointerup = event => { if (!dragging) return; const pending = dragging.pending; dragging = undefined; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); run(() => model.edit(compositionDocument()!.id, 'Drag artwork', () => pending)); };
  canvas.onpointercancel = () => { dragging = undefined; void draw(); };
  const unload = (event: BeforeUnloadEvent) => { if (model.dirty()) { event.preventDefault(); event.returnValue = ''; } };
  const keyboard = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || !root.contains(document.activeElement)) return;
    const tag = (event.target as HTMLElement).tagName; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && event.key.toLowerCase() !== 's') return;
    if (event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
    else if (event.key.toLowerCase() === 'z') { event.preventDefault(); run(() => event.shiftKey ? model.redo() : model.undo()); }
    else if (event.key.toLowerCase() === 'y') { event.preventDefault(); run(() => model.redo()); }
  };
  const closeMenu = (event: Event) => { const menu = header.querySelector<HTMLDetailsElement>('details.menu'); if (menu?.open && (!menu.contains(event.target as Node) || (event.target as HTMLElement).closest('.menu-items button'))) menu.open = false; };
  const keepPanelShape = () => { if (!compact.matches) worldOpen = true; };
  window.addEventListener('beforeunload', unload); root.addEventListener('keydown', keyboard); document.addEventListener('click', closeMenu); compact.addEventListener('change', keepPanelShape);
  let previous = performance.now(), frameId = 0;
  const tick = (now: number) => { if (disposed) return; const delta = Math.min(0.1, (now - previous) / 1000); previous = now; const seq = sequence(); if (playing && seq) { const end = loop ? loopTo || seq.duration : seq.duration; time += delta; if (time >= end) { if (loop) time = loopFrom + (time - loopFrom) % Math.max(1 / 60, end - loopFrom); else { time = seq.duration; playing = false; refreshTimeline(); } } updateTime(); void draw(); } frameId = requestAnimationFrame(tick); };
  frameId = requestAnimationFrame(tick); void load();
  return { model, openScene, reload: load, save, dispose() { disposed = true; cancelAnimationFrame(frameId); cleanupWorld?.(); cleanupAssets?.(); workbenches.forEach(item => item.dispose?.()); window.removeEventListener('beforeunload', unload); root.removeEventListener('keydown', keyboard); document.removeEventListener('click', closeMenu); compact.removeEventListener('change', keepPanelShape); root.remove(); } };
}
