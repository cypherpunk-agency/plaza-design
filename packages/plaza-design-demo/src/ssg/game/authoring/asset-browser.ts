/** Read-only catalog projections. References point into source documents, never a second scene graph. */
import { LAYER_ROLES, KIND_HINTS, layerRole } from './layer-roles';
import { type ArtRegistry, type Composition, type Instance } from '../art/core/composition';
import type { EditorDocument } from './app';
import { SETS } from '../art/catalog';
import { helperArtwork } from './asset-examples';

export interface AssetUsage { document: string; scene: string; instance: string; parent?: string; path: string[]; node: Instance }
/** `family` is the broad kind (layer-roles.ts); the registered category remains a tag. */
/**
 * Source grouping inferred from registration names and usages, not a reusability guarantee.
 */
export type AssetOrigin = 'kit' | 'scene' | 'cutscene' | 'engine';
export const ORIGINS: readonly { id: AssetOrigin; label: string; badge: string; hint: string }[] = [
  { id: 'kit', label: 'Shared libraries', badge: 'Library', hint: 'Filed under a shared code library; this alone does not guarantee independent use' },
  { id: 'scene', label: 'Scene libraries', badge: 'Scene', hint: 'Filed under a scene’s code library; some entries draw independently, others need that scene’s state' },
  { id: 'cutscene', label: 'Cutscenes', badge: 'Cutscene', hint: 'Used by an animated sequence; inspect its source usages' },
  { id: 'engine', label: 'Markers & engine', badge: 'Engine', hint: 'Markers and the player row: logic, not artwork' },
];
export type AssetStructure = 'object' | 'composition';
export type AssetUsability = 'reusable' | 'context' | 'helper';
export const STRUCTURES: readonly { id: AssetStructure; label: string; hint: string }[] = [
  { id: 'object', label: 'Object', hint: 'One artwork definition, such as a person, stool, building or sign' },
  { id: 'composition', label: 'Composition', hint: 'An arrangement of several objects' },
];
export const USABILITY: readonly { id: AssetUsability; label: string; hint: string }[] = [
  { id: 'reusable', label: 'Reusable anywhere', hint: 'Add to any scene. Uses its own properties and shared lighting/time; no source-scene bindings required' },
  { id: 'context', label: 'Requires source context', hint: 'Depends on source inputs or has not been extracted for independent placement. Inspect its existing usages; its gallery example does not make it placeable' },
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
    const composition = document.value as Composition;
    const visit = (nodes: Instance[], path: string[]) => nodes.forEach(node => {
      const row = { document: document.id, scene: composition.scene, instance: node.id, parent: path.at(-1), path: [...path, node.id], node: structuredClone(node) };
      usages.set(node.type, [...usages.get(node.type) ?? [], row]); visit(node.children ?? [], row.path);
    });
    visit(composition.instances, []);
  }
  return registry.catalog().map<AssetEntry>(element => {
    const family = layerRole(element.type, element.label, element.category), used = usages.get(element.type) ?? [], origin = originOf(element.type, family, used);
    const structure: AssetStructure = element.role === 'group' ? 'composition' : 'object';
    const usability: AssetUsability = !element.parts.length || element.role === 'player' || element.role === 'group' || helperArtwork(element.type) ? 'helper'
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
  preview(canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, zoom: number): Promise<string | AssetPreviewReport> | string | AssetPreviewReport;
  /** Picture tiles for the list; without it the list is plain names. */
  thumbnail?(entry: AssetEntry): HTMLCanvasElement;
  /** Adds the piece to the scene open in the editor (label names that scene). */
  useInScene?: { label: string; run(entry: AssetEntry): void };
  /** City districts for the filter bar; `of` names a scene's district. */
  districts?: { list: { id: string; name: string }[]; of(scene: string): string | undefined };
}
export interface AssetBrowserSession { query?: string; family?: string; district?: string; origin?: AssetOrigin | ''; structure?: AssetStructure | ''; usability?: 'reusable' | 'context' | ''; section?: 'artwork' | 'helpers'; collapsedFilters?: Record<string, boolean>; selected?: string; usage?: string; zoom?: number }
/** No model edit/save API is accepted by this panel. All preview changes are temporary. */
export function mountAssetBrowser(host: HTMLElement, options: AssetBrowserOptions, session: AssetBrowserSession) {
  let disposed = false, generation = 0;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const button = (text: string, action: () => void) => { const node = el('button', text); node.type = 'button'; node.onclick = action; return node; };
  const entries = assetInventory(options.registry, options.documents), search = el('input');
  session.usability ??= 'reusable';
  session.collapsedFilters ??= { District: true, Kind: true, Source: true, Other: true };
  let family = session.family ?? '';
  search.type = 'search'; search.placeholder = 'Find type, name or tag'; search.setAttribute('aria-label', 'Search artwork assets'); search.value = session.query ?? '';
  const kinds = LAYER_ROLES.filter(kind => entries.some(entry => entry.family === kind));
  const count = el('p'), list = el('div'), inspector = el('section'); list.className = 'catalog-list'; inspector.setAttribute('aria-label', 'Asset inspection');
  const navigation = el('div'), tabs = el('div'); tabs.setAttribute('aria-label', 'Library sections');
  tabs.className = 'toolbar';
  navigation.append(tabs, search, count, list);
  // District bar: a piece belongs to every district whose scenes use it. "Elsewhere" is unused or sequence-only artwork.
  const districtsOf = (entry: AssetEntry) => new Set(entry.usages.flatMap(u => { const d = options.districts?.of(u.scene); return d ? [d] : []; }));
  const bar = el('nav'); bar.className = 'district-bar'; bar.setAttribute('aria-label', 'Artwork filters');
  const inDistrict = (entry: AssetEntry, id: string) => id === '__none__' ? districtsOf(entry).size === 0 : districtsOf(entry).has(id);
  const sets = el('details');
  navigation.append(sets); host.classList.add('asset-browser-grid'); host.classList.add('with-districts'); host.append(bar); host.append(navigation, inspector);
  function inspect(entry: AssetEntry) {
    if (session.selected !== entry.id) session.usage = undefined;
    session.selected = entry.id; const source = ORIGINS.find(o => o.id === entry.origin)!, use = USABILITY.find(o => o.id === entry.usability)!;
    inspector.replaceChildren(el('h3', entry.label), el('code', entry.id), el('p', `${use.label}: ${use.hint}.`), el('p', `Structure: ${STRUCTURES.find(s => s.id === entry.structure)!.label}. Kind: ${entry.family}.`), el('p', `Source — ${source.badge}: ${source.hint}.`));
    if (options.useInScene && entry.usability === 'reusable') { const add = button(options.useInScene.label, () => options.useInScene!.run(entry)); add.className = 'primary'; inspector.append(add); }
    else if (entry.usability === 'context') inspector.append(el('p', 'Inspect this artwork through Open instance below. Adding it independently is not supported yet.'));
    for (const card of list.children) (card as HTMLElement).setAttribute('aria-pressed', String((card as HTMLElement).dataset.asset === entry.id));
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
    const render = async () => { const epoch = ++generation; status.textContent = 'Preparing preview…'; resolved.textContent = ''; session.usage = usageSelect.value === '' ? '' : reference(entry.usages[Number(usageSelect.value)]); session.zoom = Number(zoom.value); try { const result = await options.preview(canvas, entry, usageSelect.value === '' ? undefined : entry.usages[Number(usageSelect.value)], Number(zoom.value)); if (!disposed && epoch === generation) { status.textContent = typeof result === 'string' ? result : result.message; resolved.textContent = typeof result === 'string' ? 'No prepared snapshot for this support mode.' : JSON.stringify(result.snapshot, null, 2); } } catch (error) { if (!disposed && epoch === generation) status.textContent = `Preview unavailable: ${error instanceof Error ? error.message : String(error)}`; } };
    usageSelect.onchange = zoom.onchange = () => { void render(); }; inspector.append(usageSelect, zoom, canvas, status);
    const usages = el('div');
    for (const usage of entry.usages) {
      const row = el('details'), summary = el('summary', `${usage.document} / ${usage.path.join(' / ')}`), data = el('pre');
      data.style.whiteSpace = 'pre-wrap'; data.textContent = JSON.stringify({ placement: usage.node.placement, pass: usage.node.pass, order: usage.node.order,
        parent: usage.parent, attachment: usage.node.attach, bindings: usage.node.bindings, children: usage.node.children?.map(child => ({ id: child.id, type: child.type })) ?? [] }, null, 2);
      row.append(summary, button('Open instance', () => options.openUsage(usage)), data); usages.append(row);
    }
    inspector.append(metadata, snapshot, el('h3', `Usages (${entry.usages.length})`), usages); void render();
  }
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
    sections.push(section('Kind', family === '__embedded__' ? '' : family, [kindChip('', 'All'), ...kinds.map(kind => kindChip(kind, kind, KIND_HINTS[kind]))]));
    const byPlace = filterAssets(base, search.value, family).filter(e => !district || inDistrict(e, district));
    const structureChip = (id: AssetStructure | '', name: string, title?: string) => chip(name, byPlace.filter(e => fromOrigin(e) && (!id || e.structure === id)).length, structure === id, () => { session.structure = id; refresh(); }, title);
    if (!helpers) sections.push(section('Structure', STRUCTURES.find(o => o.id === structure)?.label ?? '', [structureChip('', 'All'), ...STRUCTURES.map(o => structureChip(o.id, o.label, o.hint))]));
    const originChip = (id: AssetOrigin | '', name: string, title?: string) => chip(name, byPlace.filter(e => organized(e) && (!id || e.origin === id)).length, origin === id, () => { session.origin = id === origin ? '' : id; refresh(); }, title);
    sections.push(section('Source', ORIGINS.find(o => o.id === origin)?.label ?? '', [originChip('', 'All'), ...ORIGINS.map(o => originChip(o.id, o.label, o.hint))]));
    if (!helpers && session.usability !== 'reusable') sections.push(section('Other', family === '__embedded__' ? 'Embedded components' : '', [chip('Embedded components', SETS.length, family === '__embedded__', () => { family = family === '__embedded__' ? '' : '__embedded__'; refresh(); }, 'Code-drawn component sets that are not registered artwork')]));
    bar.replaceChildren(...sections);
    const filtered = matching.filter(entry => (!district || inDistrict(entry, district)) && fromOrigin(entry) && organized(entry)); count.textContent = `${filtered.length} / ${sectionEntries.length} ${helpers ? 'scene helpers' : 'artwork entries'}`; list.replaceChildren();
    list.classList.toggle('asset-grid', !!options.thumbnail);
    for (const entry of filtered) {
      const pick = button('', () => inspect(entry)); pick.dataset.asset = entry.id; pick.title = `${entry.id} · ${entry.preview}`; pick.setAttribute('aria-pressed', String(entry.id === session.selected));
      const use = USABILITY.find(o => o.id === entry.usability)!, badge = el('small', use.label); badge.className = `origin origin-${entry.origin}`; badge.title = use.hint;
      if (options.thumbnail) { pick.className = 'asset-card'; pick.append(options.thumbnail(entry), el('span', entry.label), badge); } else { pick.textContent = entry.label; pick.style.display = 'block'; pick.style.width = '100%'; }
      list.append(pick);
    }
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const embedded = SETS.filter(set => !helpers && session.usability !== 'reusable' && (!family || family === '__embedded__') && terms.every(term => `${set.id} ${set.file} ${set.what}`.toLowerCase().includes(term)));
    sets.hidden = helpers || session.usability === 'reusable';
    sets.replaceChildren(el('summary', `Embedded library components (${embedded.length} / ${SETS.length})`));
    for (const set of embedded) { const row = el('details'); row.append(el('summary', set.id), el('code', set.file), el('p', set.what), el('p', 'Embedded component; inspect a registered assembly or source usage. No independent registered preview.')); sets.append(row); }
    if (family === '__embedded__') sets.open = true;
  }
  search.oninput = refresh; refresh();
  const selected = entries.find(entry => entry.id === session.selected); if (selected) inspect(selected);
  return () => { disposed = true; generation++; };
}
