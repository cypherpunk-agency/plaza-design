/** Isolated artwork views use resolved runtime inputs, never a separate drawing implementation. */
import { compositionAppearance, drawCompositionSlot, resolveComposition, type ArtRegistry, type Composition, type Environment } from '../art/core/composition';
import { frameView } from '../art/core/view';
import { lightAt } from '../world/light';
import type { PreviewRequest, EditorDocument, PreviewResult } from './app';
import type { AssetEntry, AssetUsage } from './asset-browser';
import { previewBounds } from './native-preview';
import type { AssetPreviewReport } from './asset-browser';
import { centerNativePreview } from './native-camera';

export function isolateArtwork(registry: ArtRegistry, composition: Composition, environment: Environment, id: string) {
  const rows = resolveComposition(registry, composition, environment), included = new Set([id]);
  if (!rows.some(row => row.instance.id === id)) throw new Error(`Missing source instance ${id}`);
  // Include descendants and dependent attachments; retain resolved transforms without painting ancestors.
  let changed = true;
  while (changed) { changed = false; for (const row of rows) {
    const parent = row.instance.attach?.instance ?? rows.find(owner => owner.instance.children?.some(child => child.id === row.instance.id))?.instance.id;
    if (parent && included.has(parent) && !included.has(row.instance.id)) { included.add(row.instance.id); changed = true; }
  } }
  const selected = rows.filter(row => included.has(row.instance.id));
  const document: Composition = { version: 1, scene: composition.scene, instances: selected.map(row => ({
    id: row.instance.id, type: row.instance.type, props: row.props, placement: row.placement, layer: row.instance.layer, order: row.instance.order,
  })) };
  const appearance = compositionAppearance(composition, environment);
  return { composition: document, environment: { ...environment, clips: undefined,
    visibility: Object.fromEntries(selected.map(row => [row.instance.id, appearance.get(row.instance.id)!.visible])),
    opacity: Object.fromEntries(selected.map(row => [row.instance.id, appearance.get(row.instance.id)!.opacity])),
    state: Object.fromEntries(selected.map(row => [row.instance.id, row.state])) } };
}

/** Moments sampled for a cutscene piece: the first frame where it has a box on screen is shown. */
const SEQUENCE_TIMES = [0, 1, 2.5, 4, 6, 9, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 78];
/** The opening composition plays as three sequences; its far town and lamps appear in the later ones. */
const OPENING_SEQUENCES = ['glide', 'rise', 'title'];

/**
 * Cutscene pieces are drawn by their sequence's own renderer as one picture, so they cannot be painted alone.
 * The preview renders the sequence frame and shows the piece's box cut from it, with whatever is behind it.
 */
function sequenceCutout(canvas: HTMLCanvasElement, render: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult | null, composition: Composition, instance: string, settings: Pick<PreviewRequest, 'reduced' | 'environment'>): AssetPreviewReport | string {
  const frame = document.createElement('canvas'); frame.width = 960; frame.height = 540;
  const ids = composition.scene === 'sequence-opening' ? OPENING_SEQUENCES : [undefined];
  for (const sequenceId of ids) for (const time of SEQUENCE_TIMES) {
    let result: PreviewResult | null;
    try { result = render(frame, { composition, time, sequenceId, reduced: settings.reduced, overlays: false, selectedId: instance, environment: { ...settings.environment, renderScale: 1 } }); } catch { break; }
    if (!result) return 'This sequence has no editor renderer. Open this usage to inspect it.';
    const box = result.bounds.find(b => b.id === instance); if (!box) continue;
    const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y)), x1 = Math.min(frame.width, Math.ceil(box.x + box.width)), y1 = Math.min(frame.height, Math.ceil(box.y + box.height));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const ctx = canvas.getContext('2d')!, scale = Math.min(canvas.width / (x1 - x0), canvas.height / (y1 - y0), 6), w = (x1 - x0) * scale, h = (y1 - y0) * scale;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(frame, x0, y0, x1 - x0, y1 - y0, Math.round((canvas.width - w) / 2), Math.round((canvas.height - h) / 2), Math.round(w), Math.round(h));
    return { message: `Cut from the ${sequenceId ?? composition.scene.replace('sequence-', '')} sequence at ${time} s, with what is drawn behind it. Open this usage to see it move.` };
  }
  return 'Not on screen in the sampled moments of its sequence. Open this usage to find it on the timeline.';
}

export function createAssetPreview(registry: ArtRegistry, native: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult }, sequence?: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult | null) {
  return (canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, documents: EditorDocument[], settings: Pick<PreviewRequest, 'time' | 'reduced' | 'environment'>): string | AssetPreviewReport => {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const renderScale = Number(settings.environment.renderScale ?? 1);
    if (!Number.isFinite(renderScale) || renderScale <= 0) throw new Error('Preview scale must be positive');
    const width = canvas.width / renderScale, height = canvas.height / renderScale;
    let composition: Composition, environment: Environment;
    if (usage) {
      const source = documents.find(doc => doc.id === usage.document && doc.kind === 'composition'); if (!source) throw new Error('Source composition is unavailable');
      const document = source.value as Composition;
      if (document.scene.startsWith('sequence-')) return sequence ? sequenceCutout(canvas, sequence, document, usage.instance, settings) : 'Requires cinematic controller context. Open this usage to inspect it in the native sequence preview.';
      const scratch = documentCanvas(canvas);
      const focused = centerNativePreview(native.render, scratch, { ...settings, composition: document, overlays: false }, result => {
        if (!result.artwork) return undefined;
        const isolated = isolateArtwork(registry, result.artwork.composition, result.artwork.environment, usage.instance);
        const bounds = previewBounds(resolveComposition(registry, isolated.composition, isolated.environment), isolated.environment.view, isolated.environment, isolated.composition).bounds.filter(box => box.width > 0 && box.height > 0);
        if (!bounds.length) return undefined;
        const left = Math.min(...bounds.map(b => b.x)), right = Math.max(...bounds.map(b => b.x + b.width)), top = Math.min(...bounds.map(b => b.y)), bottom = Math.max(...bounds.map(b => b.y + b.height));
        return { x: left * renderScale, y: top * renderScale, width: (right - left) * renderScale, height: (bottom - top) * renderScale };
      });
      const prepared = focused.result.artwork;
      if (!prepared) throw new Error('Scene did not supply a prepared artwork snapshot');
      ({ composition, environment } = isolateArtwork(registry, prepared.composition, prepared.environment, usage.instance));
    } else {
      if (entry.preview === 'prepared-context') return 'Requires a prepared scene/controller snapshot. Select an existing usage below.';
      composition = { version: 1, scene: 'asset-preview', instances: [{ id: 'asset', type: entry.id, props: {}, placement: { x: width / 2, h: 0 }, order: 0, layer: registry.get(entry.id).parts.length ? 'backdrop' : 'logic' }] };
      const view = { ...frameView(settings.time * 60, lightAt(Number(settings.environment.day ?? 1), Number(settings.environment.minute ?? 580), 90, null)), viewW: width, viewH: height,
        gy: height / 2, y: (h: number) => height / 2 - h };
      environment = { view, state: {}, reduced: settings.reduced, sequenceTime: settings.time };
    }
    ctx.save(); ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    // All three slots now, in order; the isolated piece is not part of a game frame, so nothing is queued for one.
    try { for (const slot of ['behind-player', 'over-player', 'foreground'] as const) drawCompositionSlot(ctx, registry, composition, environment, slot); }
    finally { ctx.restore(); }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = false; for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) { visible = true; break; }
    const appearance = compositionAppearance(composition, environment);
    const snapshot = { time: settings.time, reduced: settings.reduced, day: settings.environment.day, minute: settings.environment.minute, seed: settings.environment.seed,
      cameraX: environment.view.cam, lighting: environment.view.lighting,
      instances: resolveComposition(registry, composition, environment).map(row => ({ id: row.instance.id, type: row.instance.type, placement: row.placement,
        ...appearance.get(row.instance.id), parts: row.element.parts, layer: row.instance.layer, order: row.instance.order, anchors: row.element.anchors(row.props, row.state) })) };
    const message = !visible && usage ? `No visible pixels for this ${settings.time.toFixed(3)} s snapshot. This may be conditional artwork, a marker, a light collector, or outside the visible layers. Open instance for its scene context and supported state controls.`
      : entry.preview === 'structural' && !usage ? 'Structural assembly: no standalone pixels. Select a source usage to inspect its children.' : `Isolated registered passes at ${settings.time.toFixed(3)} s. Native camera centered on selection; scene grading/reflections are visible in Open instance.`;
    return { message, snapshot };
  };
}
function documentCanvas(source: HTMLCanvasElement) { const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height; return canvas; }
