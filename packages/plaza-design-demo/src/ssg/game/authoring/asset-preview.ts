/** Isolated artwork views use resolved runtime inputs, never a separate drawing implementation. */
import { compositionAppearance, drawCompositionSlot, resolveComposition, type ArtRegistry, type Composition, type Environment } from '../art/core/composition';
import { frameView } from '../art/core/view';
import { lightAt } from '../world/light';
import type { PreviewRequest, EditorDocument, PreviewResult } from './app';
import type { AssetEntry, AssetUsage } from './asset-browser';
import { previewBounds } from './native-preview';
import type { AssetPreviewReport } from './asset-browser';
import { centerNativePreview } from './native-camera';
import { drawHelperPreview, exampleState, helperArtwork } from './asset-examples';

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

/** Moments sampled for a cutscene piece: skip its black opening fade, not just off-screen bounds. */
const SEQUENCE_TIMES = [0, 1, 2.5, 4, 6, 9, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 78];
/** The opening composition plays as three sequences; its far town and lamps appear in the later ones. */
const OPENING_SEQUENCES = ['glide', 'rise', 'title'];

/**
 * Cutscene pieces are drawn by the directed shared world frame as one picture, so they cannot be painted alone.
 * The preview renders the sequence frame and shows the piece's box cut from it, with whatever is behind it.
 */
function sequenceCutout(canvas: HTMLCanvasElement, render: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult | null, composition: Composition, instance: string, settings: Pick<PreviewRequest, 'reduced' | 'environment'>, showcase = false): AssetPreviewReport | string {
  const frame = document.createElement('canvas'); frame.width = 960; frame.height = 540;
  const ids = composition.scene === 'sequence-opening' ? OPENING_SEQUENCES : [undefined];
  for (const sequenceId of ids) for (const time of SEQUENCE_TIMES) {
    const request = { composition, time, sequenceId, reduced: settings.reduced, overlays: false, selectedId: instance, environment: { ...settings.environment, renderScale: 1 } };
    let result = render(frame, request);
    if (!result) return 'This sequence has no editor renderer. Open this usage to inspect it.';
    let box = result.bounds.find(b => b.id === instance); if (!box) continue;
    if (showcase && result.deltaToLocal && (box.x + box.width < 0 || box.x > frame.width || box.y + box.height < 0 || box.y > frame.height)) {
      const delta = result.deltaToLocal(instance, frame.width / 2 - box.x - box.width / 2, frame.height / 2 - box.y - box.height / 2);
      const framed = structuredClone(composition);
      const move = (nodes: Composition['instances']) => nodes.forEach(n => { if (n.id === instance) { n.placement.x += delta.x; n.placement.h += delta.h; } move(n.children ?? []); });
      move(framed.instances);
      result = render(frame, { ...request, composition: framed });
      box = result?.bounds.find(b => b.id === instance); if (!box) continue;
    }
    const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y)), x1 = Math.min(frame.width, Math.ceil(box.x + box.width)), y1 = Math.min(frame.height, Math.ceil(box.y + box.height));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const pixels = frame.getContext('2d')!.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let picture = false;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 8 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 12) { picture = true; break; }
    }
    if (!picture) continue;
    const ctx = canvas.getContext('2d')!, scale = Math.min(canvas.width / (x1 - x0), canvas.height / (y1 - y0), 6), w = (x1 - x0) * scale, h = (y1 - y0) * scale;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(frame, x0, y0, x1 - x0, y1 - y0, Math.round((canvas.width - w) / 2), Math.round((canvas.height - h) / 2), Math.round(w), Math.round(h));
    return { message: `Cut from the ${sequenceId ?? composition.scene.replace('sequence-', '')} sequence at ${time} s, with what is drawn behind it. Open this usage to see it move.` };
  }
  return 'No visible picture in the sampled moments (off-screen, transparent or black fade). Open this usage to inspect its timeline.';
}

export function createAssetPreview(registry: ArtRegistry, native: { render(canvas: HTMLCanvasElement, request: PreviewRequest): PreviewResult }, sequence?: (canvas: HTMLCanvasElement, request: PreviewRequest) => PreviewResult | null, options: { showcase?: boolean } = {}) {
  return (canvas: HTMLCanvasElement, entry: AssetEntry, usage: AssetUsage | undefined, documents: EditorDocument[], settings: Pick<PreviewRequest, 'time' | 'reduced' | 'environment'>): string | AssetPreviewReport => {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (options.showcase && helperArtwork(entry.id)) return drawHelperPreview(canvas, entry.id);
    if (options.showcase && /sequence\.(opening\.tunnel-fade|taxi\.fade)$/.test(entry.id)) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#d2dfeb'); gradient.addColorStop(1, '#000');
      ctx.fillStyle = gradient; ctx.fillRect(canvas.width * .2, canvas.height * .3, canvas.width * .6, canvas.height * .4);
      return { message: 'Fade overlay shown over a light reference background so its darkening is visible.' };
    }
    if (options.showcase && entry.id === 'metro.skyline-part') usage = entry.usages.find(u => u.node.props.part === 'far') ?? usage;
    // Unused registered pieces still get the same prepared scene inputs as their siblings.
    if (options.showcase && !usage && entry.preview === 'prepared-context' && !entry.id.startsWith('sequence.')) {
      const namespace = entry.id.split('.')[0], scene = namespace === 'station' ? 'galleriaStation' : namespace;
      const source = documents.find(d => d.kind === 'composition' && (d.value as Composition).scene === scene);
      if (source) {
        const doc = structuredClone(source.value as Composition), definition = registry.get(entry.id);
        const nodes = (xs: Composition['instances']): Composition['instances'] => xs.flatMap(n => [n, ...nodes(n.children ?? [])]);
        const siblings = nodes(doc.instances).filter(n => n.type.startsWith(namespace + '.'));
        const bindings = entry.id === 'station.waiting-passenger' ? {} : Object.fromEntries(siblings.flatMap(n => Object.entries(n.bindings ?? {})).filter(([key]) => key in (definition.visualFields ?? {})));
        const node = { id: '__gallery_example__', type: entry.id, props: {}, placement: { x: 400, h: 0 }, order: 9999, layer: definition.parts.length ? 'set' as const : 'logic' as const, bindings };
        doc.instances.push(node);
        const id = '__gallery_source__'; documents = [...documents, { ...source, id, value: doc }];
        usage = { document: id, scene, instance: node.id, path: [node.id], node };
      }
    }
    const isolate = (document: Composition, env: Environment, id: string) => {
      const result = isolateArtwork(registry, document, env, id);
      if (options.showcase) {
        result.environment.state = Object.fromEntries(resolveComposition(registry, result.composition, result.environment).map(row => [row.instance.id, exampleState(row)]));
        result.environment.visibility = Object.fromEntries(result.composition.instances.map(n => [n.id, true]));
        result.environment.opacity = Object.fromEntries(result.composition.instances.map(n => [n.id, 1]));
        result.environment.view = { ...result.environment.view, gy: Math.round(result.environment.view.y(0)) };
      }
      return result;
    };
    const renderNative = (target: HTMLCanvasElement, request: PreviewRequest): PreviewResult => {
      if (usage?.instance !== '__gallery_example__') return native.render(target, request);
      const base = { ...request.composition, instances: request.composition.instances.filter(n => n.id !== usage!.instance) };
      const result = native.render(target, { ...request, composition: base });
      if (result.artwork) result.artwork = { ...result.artwork, composition: request.composition };
      return result;
    };
    const renderScale = Number(settings.environment.renderScale ?? 1);
    if (!Number.isFinite(renderScale) || renderScale <= 0) throw new Error('Preview scale must be positive');
    const width = canvas.width / renderScale, height = canvas.height / renderScale;
    let composition: Composition, environment: Environment, fit = 1;
    if (usage) {
      const source = documents.find(doc => doc.id === usage.document && doc.kind === 'composition'); if (!source) throw new Error('Source composition is unavailable');
      const document = source.value as Composition;
      if (document.scene.startsWith('sequence-')) return sequence ? sequenceCutout(canvas, sequence, document, usage.instance, settings, options.showcase) : 'Requires cinematic controller context. Open this usage to inspect it in the native sequence preview.';
      const scratch = documentCanvas(canvas);
      const focused = centerNativePreview(renderNative, scratch, { ...settings, composition: document, overlays: false }, result => {
        if (!result.artwork) return undefined;
        const isolated = isolate(result.artwork.composition, result.artwork.environment, usage!.instance);
        const bounds = previewBounds(resolveComposition(registry, isolated.composition, isolated.environment), isolated.environment.view, isolated.environment, isolated.composition).bounds.filter(box => box.width > 0 && box.height > 0);
        if (!bounds.length) return undefined;
        const left = Math.min(...bounds.map(b => b.x)), right = Math.max(...bounds.map(b => b.x + b.width)), top = Math.min(...bounds.map(b => b.y)), bottom = Math.max(...bounds.map(b => b.y + b.height));
        return { x: left * renderScale, y: top * renderScale, width: (right - left) * renderScale, height: (bottom - top) * renderScale };
      });
      const prepared = focused.result.artwork;
      if (!prepared) throw new Error('Scene did not supply a prepared artwork snapshot');
      ({ composition, environment } = isolate(prepared.composition, prepared.environment, usage.instance));
    } else {
      if (entry.preview === 'prepared-context') return 'Requires a prepared scene/controller snapshot. Select an existing usage below.';
      composition = { version: 1, scene: 'asset-preview', instances: [{ id: 'asset', type: entry.id, props: {}, placement: { x: 0, h: 0 }, order: 0, layer: registry.get(entry.id).parts.length ? 'backdrop' : 'logic' }] };
      const view = { ...frameView(settings.time * 60, lightAt(Number(settings.environment.day ?? 1), Number(settings.environment.minute ?? 580), 90, null)), viewW: width, viewH: height,
        gy: height / 2, y: (h: number) => height / 2 - h };
      environment = { view, state: {}, reduced: settings.reduced, sequenceTime: settings.time };
      const row = resolveComposition(registry, composition, environment)[0];
      const bounds = row.element.bounds(row.props, row.state, { view, placement: row.placement });
      if (bounds.w > 0 && bounds.tall > 0 && [bounds.x, bounds.h, bounds.w, bounds.tall].every(Number.isFinite)) {
        fit = Math.min(1, (width - 24) / bounds.w, (height - 24) / bounds.tall);
        const viewportWidth = width / fit, viewportHeight = height / fit;
        const centerX = bounds.x + bounds.w / 2, centerH = bounds.h - bounds.tall / 2;
        environment.view = { ...view, viewW: viewportWidth, viewH: viewportHeight,
          sx: x => Math.round(x - centerX + viewportWidth / 2),
          y: h => viewportHeight / 2 - (h - centerH), gy: viewportHeight / 2 + centerH };
      }
    }
    ctx.save(); ctx.setTransform(renderScale * fit, 0, 0, renderScale * fit, 0, 0);
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
      : entry.preview === 'structural' && !usage ? 'Structural assembly: no standalone pixels. Select a source usage to inspect its children.'
      : !usage ? `Standalone artwork with default properties at ${settings.time.toFixed(3)} s, fitted to its bounds.`
      : options.showcase ? 'Gallery display example: conditional artwork is shown, character window clips are removed, and the camera is centered. Source and gameplay state are unchanged.'
      : `Isolated registered layers at ${settings.time.toFixed(3)} s. Native camera centered on selection; scene grading/reflections are visible in Open instance.`;
    return { message, snapshot };
  };
}
function documentCanvas(source: HTMLCanvasElement) { const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height; return canvas; }
