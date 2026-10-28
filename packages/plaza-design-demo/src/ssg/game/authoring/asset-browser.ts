/** Read-only catalog projections. References point into source documents, never a second scene graph. */
import { LAYER_ROLES, KIND_HINTS, layerRole } from './layer-roles';
import { type ArtRegistry, type ChunkDocument, type AssetInstance, type Field, type Value, type Properties } from '../art/core/composition';
import type {EditorDocument} from './contracts';

import { helperArtwork } from './asset-examples';

/** Drag payload of a library card: its kit and optional preset. The scene adds it where it is dropped. */
export const ARTWORK_DRAG = 'application/x-composer-artwork';
export interface AssetUsage { document: string; scene: string; instance: string; parent?: string; path: string[]; node: AssetInstance }
/** `family` is the broad kind (layer-roles.ts); the registered category remains a tag. */
/**
 * Source grouping inferred from registration names and usages, not a reusability guarantee.
 */
export type AssetOrigin = 'kit' | 'scene' | 'cutscene' | 'engine';
export const ORIGINS: readonly { id: AssetOrigin; label: string; badge: string; hint: string }[] = [
  { id: 'kit', label: 'Shared libraries', badge: 'Library', hint: 'Filed under a shared code library; this alone does not guarantee independent use' },
  { id: 'scene', label: 'Scene libraries', badge: 'Scene', hint: 'Filed under a scene’s code library; some entries draw independently, others need that scene’s state' },
  { id: 'cutscene', label: 'Cutscenes', badge: 'Cutscene', hint: 'Used by an animated sequence; inspect its source usages' },
  { id: 'engine', label: 'Markers & engine', badge: 'Engine', hint: 'Markers and the player row: logic helpers' },
];
export type AssetStructure = 'object' | 'composition';
export type AssetUsability = 'reusable' | 'context' | 'helper';
export const STRUCTURES: readonly { id: AssetStructure; label: string; hint: string }[] = [
  { id: 'object', label: 'Object', hint: 'One asset definition, such as a person, stool, building or sign' },
  { id: 'composition', label: 'Assembly', hint: 'An asset made from several objects' },
];
export const USABILITY: readonly { id: AssetUsability; label: string; hint: string }[] = [
  { id: 'reusable', label: 'Reusable anywhere', hint: 'Add to any scene. Uses its own properties and shared lighting/time; no source-scene bindings required' },
  { id: 'context', label: 'Requires source context', hint: 'Its supported contract uses source layout, prepared state or a whole scene frame. Inspect its existing usages; a gallery example does not establish independent placement' },
  { id: 'helper', label: 'Scene helper', hint: 'An invisible marker, light/shadow source, player layer or grouping tool; the preview is an editor diagram' },
];
/** Namespaces of the shared kits (people, buildings, signs, vehicles, furniture, the station kit). */
const KIT_NAMESPACES = new Set(['actor', 'building', 'character', 'furniture', 'sign', 'station', 'vehicle']);
const originOf = (type: string, family: string, usages: AssetUsage[]): AssetOrigin => {
  const namespace = type.split('.')[0];
  if (family === 'Marker' || namespace === 'scene' || namespace === 'assembly') return 'engine';
  if (namespace === 'sequence' || usages.length > 0 && usages.every(u => u.scene.startsWith('sequence-'))) return 'cutscene';
  return KIT_NAMESPACES.has(namespace) ? 'kit' : 'scene';
};
export interface AssetEntry { id: string; label: string; family: string; origin: AssetOrigin; structure: AssetStructure; usability: AssetUsability; tags: string[]; preview: 'standalone' | 'prepared-context' | 'structural'; usages: AssetUsage[] }
export interface AssetPreviewReport { message: string; snapshot?: unknown }
export function assetInventory(registry: ArtRegistry, documents: EditorDocument[]): AssetEntry[] {
  const usages = new Map<string, AssetUsage[]>();
  for (const document of documents) {
    if (document.kind !== 'composition') continue;
    const composition = document.value as ChunkDocument;
    const visit = (nodes: AssetInstance[], path: string[]) => nodes.forEach(node => {
      const row = { document: document.id, scene: composition.scene, instance: node.id, parent: path.at(-1), path: [...path, node.id], node: structuredClone(node) };
      usages.set(node.type, [...usages.get(node.type) ?? [], row]); visit(node.children ?? [], row.path);
    });
    visit(composition.instances, []);
  }
  return registry.catalog().map<AssetEntry>(element => {
    const family = layerRole(element.type, element.label, element.category), used = usages.get(element.type) ?? [], origin = originOf(element.type, family, used);
    const structure: AssetStructure = element.role === 'group' ? 'composition' : 'object';
    // logic pieces a kit offers for placing (the level kit's floors, doors, building handles) are reusable too
    const reusableGroup=element.role==='group'&&element.libraryUse==='reusable';
    const usability: AssetUsability = !reusableGroup&&(!element.parts.length && element.libraryUse !== 'reusable' || element.role === 'player' || element.role === 'group' || helperArtwork(element.type)) ? 'helper'
      : element.libraryUse === 'reusable' ? 'reusable' : 'context';
    return { id: element.type, label: element.label, family, origin, structure, usability,
    tags: [...new Set([ORIGINS.find(o => o.id === origin)!.badge.toLowerCase(), element.category, ...element.type.split('.'), ...element.parts,
      ...(element.animationClips ? ['animated'] : []), ...(element.visualFields ? ['visual-state'] : []),
      ...(element.coordinates === 'world' ? ['world'] : ['local'])])],
    preview: !element.parts.length ? 'structural' : element.coordinates === 'world' && element.libraryUse !== 'reusable' ? 'prepared-context' : 'standalone',
    usages: used };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
export function filterAssets(entries: AssetEntry[], query = '', family = '') {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (!family || entry.family === family) && terms.every(term =>
    [entry.id, entry.label, ...entry.tags].join(' ').toLocaleLowerCase().includes(term)));
}

export interface AssetBrowserOptions {
  registry: ArtRegistry; documents: EditorDocument[];
  openUsage(usage: AssetUsage): void;
  preview(canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, zoom: number, overrides?:AssetPreviewOverrides): Promise<string | AssetPreviewReport> | string | AssetPreviewReport;
  /** The same typed field controls as the scene inspector; preview changes never edit documents. */
  fieldControl?(field:Field,value:Value,apply:(value:Value)=>void):HTMLElement;
  /** Picture tiles for the list; without it the list is plain names. */
  thumbnail?(entry: AssetEntry): HTMLCanvasElement;
  /** Adds the piece to the scene open in the editor (label names that scene). */
  useInScene?: { label: string; run(entry: AssetEntry): void };
  /** City districts for the filter bar; `of` names a scene's district. */
  districts?: { list: { id: string; name: string }[]; of(scene: string): string | undefined };
  /** Saved settings of kit pieces: kits list first, each followed by its presets. */
  presets?: { of(kit: AssetEntry): AssetPreset[]; add(kit: AssetEntry, preset: AssetPreset): void };
}
export interface AssetPreviewOverrides {props?:Properties;state?:Properties}
/** A kit preset as the browser lists it; `family` is the Kind it files under. */
export interface AssetPreset { id: string; label: string; note?: string; family: string }
export interface AssetBrowserSession { query?: string; family?: string; district?: string; origin?: AssetOrigin | ''; structure?: AssetStructure | ''; usability?: 'reusable' | 'context' | ''; section?: 'artwork' | 'helpers'; collapsedFilters?: Record<string, boolean>; selected?: string; preset?: string; usage?: string; zoom?: number }
/** No model edit/save API is accepted by this panel. All preview changes are temporary. */
export function mountAssetBrowser(host: HTMLElement, options: AssetBrowserOptions, session: AssetBrowserSession) {
  let disposed = false, generation = 0;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const button = (text: string, action: () => void) => { const node = el('button', text); node.type = 'button'; node.onclick = action; return node; };
  const entries = assetInventory(options.registry, options.documents), search = el('input');
  session.usability ??= 'reusable';
  session.collapsedFilters ??= { District: true, Kind: true, Source: true, Other: true };
  let family = session.family ?? '';
  search.type = 'search'; search.placeholder = 'Find type, name or tag'; search.setAttribute('aria-label', 'Search asset assets'); search.value = session.query ?? '';
  const kinds = LAYER_ROLES.filter(kind => entries.some(entry => entry.family === kind));
  const count = el('p'), list = el('div'), inspector = el('section'); list.className = 'catalog-list'; inspector.setAttribute('aria-label', 'Asset inspection');
  const navigation = el('div'), tabs = el('div'); tabs.setAttribute('aria-label', 'Library sections');
  tabs.className = 'toolbar';
  navigation.append(tabs, search, count, list);
  // District bar: a piece belongs to every district whose scenes use it. "Elsewhere" is unused or sequence-only artwork.
  const districtsOf = (entry: AssetEntry) => new Set(entry.usages.flatMap(u => { const d = options.districts?.of(u.scene); return d ? [d] : []; }));
  const bar = el('nav'); bar.className = 'district-bar'; bar.setAttribute('aria-label', 'Asset filters');
  const inDistrict = (entry: AssetEntry, id: string) => id === '__none__' ? districtsOf(entry).size === 0 : districtsOf(entry).has(id);

  host.classList.add('asset-browser-grid'); host.classList.add('with-districts'); host.append(bar); host.append(navigation, inspector);
  const cardKey = (entry: AssetEntry, preset?: AssetPreset) => preset ? `${entry.id}#${preset.id}` : entry.id;
  function inspect(entry: AssetEntry, preset?: AssetPreset) {
    if (session.selected !== entry.id) session.usage = undefined;
    session.selected = entry.id; session.preset = preset?.id; const source = ORIGINS.find(o => o.id === entry.origin)!, use = USABILITY.find(o => o.id === entry.usability)!;
    inspector.replaceChildren(el('h3', entry.label), el('code', entry.id), el('p', `${use.label}: ${use.hint}.`), el('p', `Structure: ${STRUCTURES.find(s => s.id === entry.structure)!.label}. Kind: ${entry.family}.`), el('p', `Source — ${source.badge}: ${source.hint}.`));
    if (preset) inspector.prepend(el('h3', `Preset: ${preset.label}`), el('p', `Saved settings of ${entry.label}${preset.note ? ': ' + preset.note : ''}. It places an ordinary kit piece; the preview below shows the kit's defaults.`));
    if (preset && options.useInScene && options.presets) { const add = button(`${options.useInScene.label} as ${preset.label}`, () => options.presets!.add(entry, preset)); add.className = 'primary'; inspector.append(add); }
    else if (options.useInScene && entry.usability === 'reusable') { const add = button(options.useInScene.label, () => options.useInScene!.run(entry)); add.className = 'primary'; inspector.append(add); }
    else if (entry.usability === 'context') inspector.append(el('p', 'Open an existing instance to edit this piece with its source layout and state. Independent placement is outside its current supported contract.'));
    for (const card of list.children) (card as HTMLElement).setAttribute('aria-pressed', String((card as HTMLElement).dataset.asset === cardKey(entry, preset)));
    const definition = options.registry.get(entry.id), detail = el('pre');
    detail.style.whiteSpace = 'pre-wrap';
    detail.textContent = JSON.stringify({ preview: entry.preview, coordinates: definition.coordinates ?? 'local', parts: definition.parts,
      fields: Object.fromEntries(Object.entries(definition.fields).map(([key, field]) => [key, { kind: field.kind, default: field.default }])),
      visualState: Object.keys(definition.visualFields ?? {}), clips: Object.keys(definition.animationClips ?? {}),
      anchors: definition.anchors(options.registry.properties(entry.id, {}), options.registry.visualProperties(entry.id, {})),
    }, null, 2); const metadata = el('details'); metadata.append(el('summary', 'Default fields, anchors and render passes'), detail);
    const canvas = el('canvas'), status = el('p'); canvas.width = 960; canvas.height = 540; canvas.setAttribute('aria-label', `${entry.label} isolated preview`);
    const usageSelect = el('select'); usageSelect.setAttribute('aria-label', 'Asset preview usage');
    const initial = el('option', 'Default isolated piece'); initial.value = ''; usageSelect.append(initial);
    entry.usages.forEach((usage, i) => { const option = el('option', `${usage.document} / ${usage.path.join(' / ')}`); option.value = String(i); usageSelect.append(option); });
    const reference = (usage: AssetUsage) => JSON.stringify([usage.document, usage.instance]);
    const savedUsage = entry.usages.findIndex(usage => reference(usage) === session.usage);
    const firstNative = entry.usages.findIndex(usage => !usage.scene.startsWith('sequence-'));
    if (session.usage === '') usageSelect.value = '';
    else if (savedUsage >= 0) usageSelect.value = String(savedUsage);
    else if (entry.preview !== 'standalone' && entry.usages.length) usageSelect.value = String(firstNative >= 0 ? firstNative : 0);
    const zoom = el('select'); zoom.setAttribute('aria-label', 'Isolated preview zoom');
    for (const scale of [.25, .5, 1, 2, 4, 8]) { const option = el('option', `${scale}× preview zoom`); option.value = String(scale); zoom.append(option); } zoom.value = String(session.zoom ?? 1);
    const snapshot = el('details'), resolved = el('pre'); resolved.style.whiteSpace = 'pre-wrap'; snapshot.append(el('summary', 'Resolved preview transforms, visibility and anchors'), resolved);
    let overrides:AssetPreviewOverrides={};
    const controls=el('details');controls.className='logic-detail';controls.append(el('summary','Preview settings'));
    const render = async () => { controls.hidden=usageSelect.value!==''; const epoch = ++generation; status.textContent = 'Preparing preview…'; resolved.textContent = ''; session.usage = usageSelect.value === '' ? '' : reference(entry.usages[Number(usageSelect.value)]); session.zoom = Number(zoom.value); try { const result = await options.preview(canvas, entry, usageSelect.value === '' ? undefined : entry.usages[Number(usageSelect.value)], Number(zoom.value),usageSelect.value===''?structuredClone(overrides):undefined); if (!disposed && epoch === generation) { status.textContent = typeof result === 'string' ? result : result.message; resolved.textContent = typeof result === 'string' ? 'No prepared snapshot for this support mode.' : JSON.stringify(result.snapshot, null, 2); } } catch (error) { if (!disposed && epoch === generation) status.textContent = `Preview unavailable: ${error instanceof Error ? error.message : String(error)}`; } };
    const previewFields=()=>{
      controls.replaceChildren(el('summary','Preview settings'),el('p','Temporary appearance only. Add artwork and saved scenes keep their own settings.'));
      for(const [group,fields] of [['props',definition.fields],['state',definition.visualFields??{}]] as const){
        if(!Object.keys(fields).length)continue;
        const section=el('details'),advanced=el('details');section.append(el('summary',group==='props'?'Properties':'Visual state'));advanced.append(el('summary','Advanced inputs'));
        for(const [key,field] of Object.entries(fields)){
          const label=el('label',field.label+' '),value=Object.prototype.hasOwnProperty.call(overrides[group]??{},key)?overrides[group]![key]:field.default;
          const input=options.fieldControl!(field,value,next=>{
            try{const proposed={...overrides[group],[key]:next};if(group==='props')options.registry.properties(entry.id,proposed);else options.registry.visualProperties(entry.id,proposed);
              overrides={...overrides,[group]:proposed};void render();
            }catch(error){generation++;status.textContent='Preview unchanged: '+(error instanceof Error?error.message:String(error));}
          });input.setAttribute('aria-label',`Preview ${group==='props'?'property':'state'} ${field.label}`);label.append(input);
          (field.kind==='json'&&!field.editor?advanced:section).append(label);
        }
        if(advanced.children.length>1)section.append(advanced);controls.append(section);
      }
      controls.append(button('Reset preview settings',()=>{overrides={};previewFields();void render();}));
    };
    usageSelect.onchange = zoom.onchange = () => { void render(); }; inspector.append(usageSelect, zoom, canvas, status);
    if(options.fieldControl&&entry.usability==='reusable'){previewFields();inspector.append(controls);}
    const usages = el('div');
    for (const usage of entry.usages) {
      const row = el('details'), summary = el('summary', `${usage.document} / ${usage.path.join(' / ')}`), data = el('pre');
      data.style.whiteSpace = 'pre-wrap'; data.textContent = JSON.stringify({ placement: usage.node.placement, layer: usage.node.layer, order: usage.node.order,
        parent: usage.parent, attachment: usage.node.attach, bindings: usage.node.bindings, children: usage.node.children?.map(child => ({ id: child.id, type: child.type })) ?? [] }, null, 2);
      row.append(summary, button('Open instance', () => options.openUsage(usage)), data); usages.append(row);
    }
    inspector.append(metadata, snapshot, el('h3', `Usages (${entry.usages.length})`), usages); void render();
  }
  const searchTerms = () => search.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  function refresh() {
    session.query = search.value; session.family = family;
    const helpers = session.section === 'helpers';
    const sectionEntries = entries.filter(e => (e.usability === 'helper') === helpers);
    tabs.replaceChildren(...(['artwork', 'helpers'] as const).map(id => {
      const tab = button(id === 'artwork' ? 'Artwork' : 'Scene helpers', () => { session.section = id; search.value = ''; family = ''; session.structure = ''; session.origin = ''; session.district = ''; inspector.replaceChildren(); session.selected = undefined; refresh(); });
      tab.setAttribute('aria-pressed', String(id === (session.section ?? 'artwork'))); return tab;
    }));
    const base = sectionEntries.filter(e => helpers || !session.usability || e.usability === session.usability);
    const matching = filterAssets(base, search.value, family), district = session.district ?? '';
    // Each facet count respects the other filters, excluding its own selection.
    const chip = (name: string, n: number, pressed: boolean, choose: () => void, title = name) => { const b = button('', choose); b.append(el('span', name), el('small', String(n))); b.className = 'chip'; b.title = title; b.setAttribute('aria-pressed', String(pressed)); b.disabled = !n && !pressed; return b; };
    const section = (name: string, selected: string, chips: HTMLElement[]) => {
      const group = el('details'), summary = el('summary', selected ? `${name} · ${selected}` : name), body = el('div');
      group.className = 'asset-filter'; body.className = 'asset-filter-options';
      group.open = !session.collapsedFilters?.[name];
      group.ontoggle = () => { if (group.isConnected) (session.collapsedFilters ??= {})[name] = !group.open; };
      body.append(...chips); group.append(summary, body); return group;
    };
    const structure = session.structure ?? '', organized = (e: AssetEntry) => !structure || e.structure === structure;
    const sections: HTMLElement[] = [], fromOriginEarly = (e: AssetEntry) => (!session.origin || e.origin === session.origin) && organized(e);
    if (!helpers) {
      const forUse = filterAssets(sectionEntries, search.value, family).filter(e => (!district || inDistrict(e, district)) && fromOriginEarly(e));
      const useChip = (id: 'reusable' | 'context' | '', label: string, title?: string) => chip(label, forUse.filter(e => !id || e.usability === id).length, session.usability === id, () => { session.usability = id; refresh(); }, title);
      sections.push(section('Usability', USABILITY.find(u => u.id === session.usability)?.label ?? '', [useChip('', 'All artwork'), ...USABILITY.filter(u => u.id !== 'helper').map(u => useChip(u.id as 'reusable' | 'context', u.label, u.hint))]));
    }
    if (options.districts) {
      const districtChip = (id: string, name: string) => chip(name, matching.filter(e => fromOriginEarly(e) && (!id || inDistrict(e, id))).length, id === district, () => { session.district = id; refresh(); });
      sections.push(section('District', options.districts.list.find(d => d.id === district)?.name ?? (district ? 'Elsewhere' : ''), [districtChip('', 'All'), ...options.districts.list.map(d => districtChip(d.id, d.name)), districtChip('__none__', 'Elsewhere')]));
    }
    const origin = session.origin ?? '', fromOrigin = (e: AssetEntry) => !origin || e.origin === origin;
    const located = filterAssets(base, search.value, '').filter(e => (!district || inDistrict(e, district)) && fromOrigin(e) && organized(e));
    const kindChip = (kind: string, name: string, title?: string) => chip(name, kind ? located.filter(e => e.family === kind).length : located.length, family === kind, () => { family = kind === family ? '' : kind; refresh(); }, title);
    sections.push(section('Kind', family, [kindChip('', 'All'), ...kinds.map(kind => kindChip(kind, kind, KIND_HINTS[kind]))]));
    const byPlace = filterAssets(base, search.value, family).filter(e => !district || inDistrict(e, district));
    const structureChip = (id: AssetStructure | '', name: string, title?: string) => chip(name, byPlace.filter(e => fromOrigin(e) && (!id || e.structure === id)).length, structure === id, () => { session.structure = id; refresh(); }, title);
    if (!helpers) sections.push(section('Structure', STRUCTURES.find(o => o.id === structure)?.label ?? '', [structureChip('', 'All'), ...STRUCTURES.map(o => structureChip(o.id, o.label, o.hint))]));
    const originChip = (id: AssetOrigin | '', name: string, title?: string) => chip(name, byPlace.filter(e => organized(e) && (!id || e.origin === id)).length, origin === id, () => { session.origin = id === origin ? '' : id; refresh(); }, title);
    sections.push(section('Source', ORIGINS.find(o => o.id === origin)?.label ?? '', [originChip('', 'All'), ...ORIGINS.map(o => originChip(o.id, o.label, o.hint))]));
    bar.replaceChildren(...sections);
    const placed = (entry: AssetEntry) => (!district || inDistrict(entry, district)) && fromOrigin(entry) && organized(entry);
    const filtered = matching.filter(placed); list.replaceChildren();
    list.classList.toggle('asset-grid', !!options.thumbnail);
    const card = (entry: AssetEntry, preset?: AssetPreset) => {
      const key = cardKey(entry, preset), pick = button('', () => inspect(entry, preset)); pick.dataset.asset = key;
      if (options.useInScene) { pick.ondblclick = () => preset ? options.presets!.add(entry, preset) : options.useInScene!.run(entry); pick.draggable = true; pick.ondragstart = event => { event.dataTransfer?.setData(ARTWORK_DRAG, JSON.stringify({ kit: entry.id, preset: preset?.id })); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'; }; }
      pick.title = preset ? `${entry.id} · preset ${preset.id}${preset.note ? ': ' + preset.note : ''}` : `${entry.id} · ${entry.preview}`;
      pick.setAttribute('aria-pressed', String(entry.id === session.selected && (preset?.id ?? undefined) === session.preset));
      // A tag only where it tells something: presets, pieces that need their scene, cutscene parts. Plain reusable pieces carry none.
      const use = USABILITY.find(o => o.id === entry.usability)!;
      const tag = preset ? ['Preset', `${entry.label} with saved settings`] : entry.origin === 'cutscene' ? ['Cutscene part', ORIGINS.find(o => o.id === 'cutscene')!.hint] : entry.usability === 'context' ? ['Scene piece', use.hint] : undefined;
      const badge = tag ? el('small', tag[0]) : undefined; if (badge) { badge.className = 'tag'; badge.title = tag![1]; }
      const name = preset?.label ?? entry.label;
      if (options.thumbnail) { pick.className = 'asset-card'; pick.append(options.thumbnail(entry), el('span', name)); if (badge) pick.append(badge); } else { pick.textContent = name; pick.style.display = 'block'; pick.style.width = '100%'; }
      list.append(pick);
    };
    // Kits first, each followed by its presets; a preset matches the search by its own name and note, and the Kind by its own family.
    let presetCount = 0;
    const kitPool = helpers || !options.presets ? [] : base.filter(e => e.usability==='reusable' && placed(e));
    for (const kit of kitPool) {
      if (filtered.includes(kit)) card(kit);
      for (const preset of options.presets!.of(kit)) {
        const text = `${preset.label} ${preset.note ?? ''} ${kit.label} ${kit.id}`.toLocaleLowerCase();
        if (family && preset.family !== family || !searchTerms().every(term => text.includes(term))) continue;
        card(kit, preset); presetCount++;
      }
    }
    for (const entry of filtered) if (!kitPool.includes(entry)) card(entry);
    count.textContent = `${filtered.length} / ${sectionEntries.length} ${helpers ? 'scene helpers' : 'asset entries'}${presetCount ? ` · ${presetCount} presets` : ''}`;
  }
  search.oninput = refresh; refresh();
  const selected = entries.find(entry => entry.id === session.selected);
  if (selected) inspect(selected, session.preset ? options.presets?.of(selected).find(p => p.id === session.preset) : undefined);
  return () => { disposed = true; generation++; };
}
