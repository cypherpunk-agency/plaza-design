/** Read-only catalog projections. References point into source documents, never a second scene graph. */
import { type ArtRegistry, type Composition, type Instance } from '../art/core/composition';
import type { EditorDocument } from './app';
import { SETS } from '../art/catalog';

export interface AssetUsage { document: string; scene: string; instance: string; parent?: string; path: string[]; node: Instance }
export interface AssetEntry { id: string; label: string; family: string; tags: string[]; preview: 'local' | 'prepared-context' | 'structural'; usages: AssetUsage[] }
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
  return registry.catalog().map<AssetEntry>(element => ({
    id: element.type, label: element.label, family: element.category,
    tags: [...new Set([element.category, ...element.type.split('.'), ...element.parts,
      ...(element.animationClips ? ['animated'] : []), ...(element.visualFields ? ['visual-state'] : []),
      ...(element.coordinates === 'world' ? ['world'] : ['local'])])],
    preview: !element.parts.length ? 'structural' : element.coordinates === 'world' ? 'prepared-context' : 'local',
    usages: usages.get(element.type) ?? [],
  })).sort((a, b) => a.id.localeCompare(b.id));
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
}
export interface AssetBrowserSession { query?: string; family?: string; selected?: string; usage?: string; zoom?: number }
/** No model edit/save API is accepted by this panel. All preview changes are temporary. */
export function mountAssetBrowser(host: HTMLElement, options: AssetBrowserOptions, session: AssetBrowserSession) {
  let disposed = false, generation = 0;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const button = (text: string, action: () => void) => { const node = el('button', text); node.type = 'button'; node.onclick = action; return node; };
  const entries = assetInventory(options.registry, options.documents), search = el('input'), family = el('select');
  search.type = 'search'; search.placeholder = 'Find type, name or tag'; search.setAttribute('aria-label', 'Search artwork assets'); search.value = session.query ?? '';
  for (const value of ['', ...new Set(entries.map(entry => entry.family))].sort()) { const option = el('option', value || 'All families'); option.value = value; family.append(option); }
  const embeddedOption = el('option', 'Embedded library components'); embeddedOption.value = '__embedded__'; family.append(embeddedOption);
  family.value = session.family ?? ''; family.setAttribute('aria-label', 'Asset family');
  const count = el('p'), list = el('div'), inspector = el('section'); list.className = 'catalog-list'; inspector.setAttribute('aria-label', 'Asset inspection');
  const navigation = el('div'); navigation.append(search, family, count, list);
  const sets = el('details');
  navigation.append(sets); host.classList.add('asset-browser-grid'); host.append(navigation, inspector);
  function inspect(entry: AssetEntry) {
    if (session.selected !== entry.id) session.usage = undefined;
    session.selected = entry.id; inspector.replaceChildren(el('h3', entry.label), el('code', entry.id), el('p', `Tags: ${entry.tags.join(', ')}`));
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
    else if (entry.preview !== 'local' && entry.usages.length) usageSelect.value = String(firstNative >= 0 ? firstNative : 0);
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
    session.query = search.value; session.family = family.value;
    const filtered = filterAssets(entries, search.value, family.value); count.textContent = `${filtered.length} / ${entries.length} registered assets`; list.replaceChildren();
    for (const entry of filtered) { const pick = button(entry.label, () => inspect(entry)); pick.style.display = 'block'; pick.style.width = '100%'; pick.title = `${entry.id} · ${entry.preview}`; list.append(pick); }
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const embedded = SETS.filter(set => (!family.value || family.value === '__embedded__' || set.file.split('/')[1] === family.value) && terms.every(term => `${set.id} ${set.file} ${set.what}`.toLowerCase().includes(term)));
    sets.replaceChildren(el('summary', `Embedded library components (${embedded.length} / ${SETS.length})`));
    for (const set of embedded) { const row = el('details'); row.append(el('summary', set.id), el('code', set.file), el('p', set.what), el('p', 'Embedded component; inspect a registered assembly or source usage. No independent registered preview.')); sets.append(row); }
    if (family.value === '__embedded__') sets.open = true;
  }
  search.oninput = refresh; family.onchange = refresh; refresh();
  const selected = entries.find(entry => entry.id === session.selected); if (selected) inspect(selected);
  return () => { disposed = true; generation++; };
}
