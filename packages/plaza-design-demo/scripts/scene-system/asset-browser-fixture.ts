/** Browser-only bounded F1 evidence; load the bundle in the existing loopback fixture host. */
import { art, drawComposition, type Composition, type Environment, type Pass } from '../../src/ssg/game/art';
import { assetInventory } from '../../src/ssg/game/authoring/asset-browser';
import { createAssetPreview, isolateArtwork } from '../../src/ssg/game/authoring/asset-preview';
import { createNativePreview } from '../../src/ssg/game/authoring/native-preview';
import { nativeSceneAdapters } from '../../src/ssg/game/authoring/scene-adapters';
import type { EditorDocument } from '../../src/ssg/game/authoring/app';
import { city } from '../../src/ssg/game/world/clock';

export async function checkAssetPreviews(documents: EditorDocument[], capture = false, prefix = 'S8') {
  const native = createNativePreview(nativeSceneAdapters), preview = createAssetPreview(art, native), entries = assetInventory(art, documents);
  const canvas = () => { const c = document.createElement('canvas'); c.width = 960; c.height = 540; return c; };
  const target = canvas(), settings = { time: 0, reduced: false, environment: { day: 1, minute: 580, seed: 3, cameraX: 0, zoom: 1, flags: '{}', state: '{}', weather: 'clear' } };
  const before = JSON.stringify(documents), clock = JSON.stringify(city), storage = JSON.stringify(localStorage);
  const defaults: { id: string; status: string }[] = [], pairs: { scene: string; instance: string; time: number; reduced: boolean; differences: number; pixels: number }[] = [];
  for (const entry of entries) { const report = preview(target, entry, undefined, documents, settings); defaults.push({ id: entry.id, status: typeof report === 'string' ? report : report.message }); }
  const bytes = (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  // Independent full-source drawing keeps source hierarchy/bindings; projected drawing flattens only
  // the selection. Compare root leaves and structural groups from every native source scene.
  for (const doc of documents.filter(doc => doc.kind === 'composition' && nativeSceneAdapters[(doc.value as Composition).scene])) {
    const composition = doc.value as Composition;
    const roots = composition.instances.filter(node => !node.attach && (node.children?.length || art.get(node.type).parts.length));
    for (const selected of [roots.find(node => node.children?.length), roots.find(node => !node.children?.length)].filter(Boolean)) {
      for (const reduced of [false, true]) {
        const request = { ...settings, composition, overlays: false, time: reduced ? 1.25 : .5, reduced };
        const snapshot = native.render(canvas(), request).artwork!;
        const projection = isolateArtwork(art, snapshot.composition, snapshot.environment, selected!.id);
        const ids = new Set(projection.composition.instances.map(node => node.id));
        const visibility = { ...snapshot.environment.visibility };
        const walk = (nodes: Composition['instances']) => nodes.forEach(node => { visibility[node.id] = ids.has(node.id) && visibility[node.id] !== false; walk(node.children ?? []); }); walk(composition.instances);
        const expected = canvas(), actual = canvas();
        const paint = (c: HTMLCanvasElement, doc: Composition, env: Environment) => { for (const pass of ['backdrop', 'devices', 'people', 'foreground'] as Pass[]) drawComposition(c.getContext('2d')!, art, doc, env, pass); };
        paint(expected, snapshot.composition, { ...snapshot.environment, visibility }); paint(actual, projection.composition, projection.environment);
        const a = bytes(expected), b = bytes(actual); let differences = 0, pixels = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differences++;
        for (let i = 3; i < b.length; i += 4) if (b[i]) pixels++;
        const pair = { scene: composition.scene, instance: selected!.id, time: request.time, reduced, differences, pixels };
        if (capture) {
          const stem = `${prefix}-${composition.scene}-${selected!.id}-${reduced ? 'reduced' : 'normal'}`.replace(/[^a-zA-Z0-9_.-]/g, '-');
          for (const [kind, image] of [['source', expected], ['isolated', actual]] as const) {
            const response = await fetch('/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${stem}-${kind}.png`, data: image.toDataURL('image/png') }) });
            if (!response.ok) throw new Error(`Cannot retain ${stem}-${kind}: ${response.status}`);
          }
          Object.assign(pair, { sourceImage: `${stem}-source.png`, isolatedImage: `${stem}-isolated.png` });
        }
        pairs.push(pair);
        if (differences) throw new Error(`Projection differs from source hierarchy: ${doc.id}/${selected!.id}: ${differences}`);
      }
    }
  }
  if (JSON.stringify(documents) !== before || JSON.stringify(city) !== clock || JSON.stringify(localStorage) !== storage) throw new Error('Asset inspection changed source, clock or player storage');
  return { status: 'PASS', defaults: defaults.length, defaultSupport: defaults.reduce((counts, row) => { const key = row.status.startsWith('Requires') ? 'requires-context' : row.status.startsWith('Structural') ? 'structural' : 'isolated'; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {} as Record<string, number>), pairs, unchanged: ['documents', 'city clock', 'player storage'] };
}

export async function checkUsagePreviews(documents: EditorDocument[], start = 0, count = 100) {
  const native = createNativePreview(nativeSceneAdapters), preview = createAssetPreview(art, native);
  const entries = assetInventory(art, documents).filter(entry => entry.usages.some(usage => nativeSceneAdapters[usage.scene]));
  const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540; canvas.getContext('2d', { willReadFrequently: true });
  const settings = { time: .5, reduced: false, environment: { day: 1, minute: 580, seed: 3, cameraX: 0, zoom: 1, flags: '{}', state: '{}', weather: 'clear' } };
  const rows: { id: string; usage: string; pixels: number; differences: number; status: string }[] = [];
  const clock = JSON.stringify(city), storage = JSON.stringify(localStorage), before = JSON.stringify(documents);
  for (const entry of entries.slice(start, start + count)) {
    const usage = entry.usages.find(usage => nativeSceneAdapters[usage.scene])!;
    // Stabilize the browser readback backend before the measured repeated native snapshots.
    preview(canvas, entry, usage, documents, settings); canvas.getContext('2d')!.getImageData(0, 0, 960, 540);
    preview(canvas, entry, usage, documents, settings); canvas.getContext('2d')!.getImageData(0, 0, 960, 540);
    const report = preview(canvas, entry, usage, documents, settings), status = typeof report === 'string' ? report : report.message, first = canvas.getContext('2d')!.getImageData(0, 0, 960, 540).data;
    preview(canvas, entry, usage, documents, settings); const second = canvas.getContext('2d')!.getImageData(0, 0, 960, 540).data;
    let pixels = 0, differences = 0;
    for (let i = 0; i < first.length; i++) { if (first[i] !== second[i]) differences++; if (i % 4 === 3 && first[i]) pixels++; }
    if (differences) throw new Error(`${entry.id}: repeated native snapshot changed ${differences} channels`);
    rows.push({ id: entry.id, usage: `${usage.document}/${usage.instance}`, pixels, differences, status });
  }
  if (JSON.stringify(city) !== clock || JSON.stringify(localStorage) !== storage || JSON.stringify(documents) !== before) throw new Error('Usage preview changed source/clock/player storage');
  return { status: 'PASS', total: entries.length, start, rows };
}
