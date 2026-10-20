import {perfBegin,perfEnd} from '../runtime/diagnostics/performance';
import type { AssetEntry, AssetPreviewReport } from './asset-browser';

export type ThumbnailRender = (canvas: HTMLCanvasElement, entry: AssetEntry) => Promise<string | AssetPreviewReport> | string | AssetPreviewReport;

/**
 * Small pictures of registered artwork for the Add picker and the Library grid. Each piece is
 * drawn once through the editor's own isolated preview (the game renderer), cropped to its
 * painted pixels and scaled with nearest-neighbour sampling. Pieces render one at a time and
 * only once their tile scrolls into view, so opening a list of 800 types stays cheap.
 */
export function createThumbnails(render: ThumbnailRender, size = { width: 160, height: 96 }) {
  type Thumbnail = { image: HTMLCanvasElement | null; message: string; label: string };
  const cache = new Map<string, Thumbnail>(), waiting = new Map<string, Set<HTMLCanvasElement>>();
  const observed = new Set<HTMLCanvasElement>();
  const queue: AssetEntry[] = []; let busy = false, disposed = false, generation = 0;
  const prune = () => {
    for (const target of observed) if (!target.isConnected) { observer.unobserve(target); observed.delete(target); }
    for (const [id, targets] of waiting) {
      for (const target of targets) if (!target.isConnected) { observer.unobserve(target); targets.delete(target); }
      if (!targets.size) waiting.delete(id);
    }
    for (let i = queue.length - 1; i >= 0; i--) if (!waiting.has(queue[i].id)) queue.splice(i, 1);
  };
  const work = document.createElement('canvas'); work.width = 960; work.height = 540;
  const paint = (target: HTMLCanvasElement, result: Thumbnail) => {
    const ctx = target.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, target.width, target.height);
    const source = result.image; target.title = result.message;
    if (!source) {
      target.dataset.empty = ''; ctx.fillStyle = '#a9b9c9'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(result.label, target.width / 2, target.height / 2, target.width - 12); return;
    } delete target.dataset.empty;
    const scale = Math.min(target.width / source.width, target.height / source.height, 6), w = source.width * scale, h = source.height * scale;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(source, Math.round((target.width - w) / 2), Math.round((target.height - h) / 2), Math.round(w), Math.round(h));
  };
  /** Crop to non-transparent pixels with a small margin; null when the piece paints nothing on its own. */
  const crop = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return null;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height); let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null; const pad = 4; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d')!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height); return out;
  };
  async function pump() {
    if (busy || disposed) return; busy = true;
    try {
      while (queue.length && !disposed) {
        prune(); if (!queue.length) break;
        const entry = queue.shift()!; if (cache.has(entry.id)) continue;
        const version = generation;
        let image: HTMLCanvasElement | null = null, message = '', label = entry.preview === 'structural' ? 'No drawing of its own' : 'Needs scene state';
        const token = perfBegin('editor.thumbnail', entry.id);
        try {
          work.getContext('2d')?.clearRect(0, 0, work.width, work.height);
          const report = await render(work, entry); message = typeof report === 'string' ? report : report.message;
          if (disposed || version !== generation) continue;
          image = crop(work);
          if (!image && entry.usages.length && entry.preview !== 'structural') label = 'Not visible in this state';
        } catch (error) { message = error instanceof Error ? error.message : String(error); label = 'Preview error'; } finally { perfEnd(token); }
        if (disposed || version !== generation) continue;
        const result = { image, message, label };
        cache.set(entry.id, result); for (const target of waiting.get(entry.id) ?? []) paint(target, result); waiting.delete(entry.id);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { busy = false; }
  }
  const observer = new IntersectionObserver(rows => {
    for (const row of rows) {
      if (!row.isIntersecting) continue; const canvas = row.target as HTMLCanvasElement & { entry?: AssetEntry }; observer.unobserve(canvas); observed.delete(canvas); if (!canvas.isConnected) continue;
      const entry = canvas.entry; if (!entry) continue;
      if (cache.has(entry.id)) { paint(canvas, cache.get(entry.id)!); continue; }
      const set = waiting.get(entry.id) ?? new Set(); set.add(canvas); waiting.set(entry.id, set); if (!queue.some(e => e.id === entry.id)) queue.push(entry);
    }
    void pump();
  }, { rootMargin: '120px' });
  return {
    prune,
    /** Source changes invalidate scene-dependent previews and any in-flight result. */
    invalidate() { generation++; cache.clear(); queue.length = 0; waiting.clear(); observer.disconnect(); observed.clear(); },
    /** A canvas that fills in once it becomes visible. */
    thumbnail(entry: AssetEntry) {
      const canvas = Object.assign(document.createElement('canvas'), { entry }); canvas.width = size.width; canvas.height = size.height; canvas.className = 'asset-thumb'; canvas.setAttribute('aria-hidden', 'true');
      if (cache.has(entry.id)) paint(canvas, cache.get(entry.id)!); else { observed.add(canvas); observer.observe(canvas); } return canvas;
    },
    dispose() { disposed = true; generation++; observer.disconnect(); observed.clear(); queue.length = 0; waiting.clear(); },
  };
}
