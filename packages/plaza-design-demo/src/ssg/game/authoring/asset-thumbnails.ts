import type { AssetEntry, AssetPreviewReport } from './asset-browser';

export type ThumbnailRender = (canvas: HTMLCanvasElement, entry: AssetEntry) => Promise<string | AssetPreviewReport> | string | AssetPreviewReport;

/**
 * Small pictures of registered artwork for the Add picker and the Library grid. Each piece is
 * drawn once through the editor's own isolated preview (the game renderer), cropped to its
 * painted pixels and scaled with nearest-neighbour sampling. Pieces render one at a time and
 * only once their tile scrolls into view, so opening a list of 800 types stays cheap.
 */
export function createThumbnails(render: ThumbnailRender, size = { width: 160, height: 96 }) {
  const cache = new Map<string, HTMLCanvasElement | null>(), waiting = new Map<string, Set<HTMLCanvasElement>>();
  const queue: AssetEntry[] = []; let busy = false, disposed = false;
  const work = document.createElement('canvas'); work.width = 960; work.height = 540;
  const paint = (target: HTMLCanvasElement, source: HTMLCanvasElement | null) => {
    const ctx = target.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, target.width, target.height);
    if (!source) { target.dataset.empty = ''; return; } delete target.dataset.empty;
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
        const entry = queue.shift()!; if (cache.has(entry.id)) continue;
        let result: HTMLCanvasElement | null = null;
        try { work.getContext('2d')?.clearRect(0, 0, work.width, work.height); await render(work, entry); result = crop(work); } catch { result = null; }
        cache.set(entry.id, result); for (const target of waiting.get(entry.id) ?? []) paint(target, result); waiting.delete(entry.id);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { busy = false; }
  }
  const observer = new IntersectionObserver(rows => {
    for (const row of rows) {
      if (!row.isIntersecting) continue; const canvas = row.target as HTMLCanvasElement & { entry?: AssetEntry }; observer.unobserve(canvas);
      const entry = canvas.entry; if (!entry) continue;
      if (cache.has(entry.id)) { paint(canvas, cache.get(entry.id)!); continue; }
      const set = waiting.get(entry.id) ?? new Set(); set.add(canvas); waiting.set(entry.id, set); if (!queue.some(e => e.id === entry.id)) queue.push(entry);
    }
    void pump();
  }, { rootMargin: '120px' });
  return {
    /** A canvas that fills in once it becomes visible. */
    thumbnail(entry: AssetEntry) {
      const canvas = Object.assign(document.createElement('canvas'), { entry }); canvas.width = size.width; canvas.height = size.height; canvas.className = 'asset-thumb'; canvas.setAttribute('aria-hidden', 'true');
      if (cache.has(entry.id)) paint(canvas, cache.get(entry.id)!); else observer.observe(canvas); return canvas;
    },
    dispose() { disposed = true; observer.disconnect(); queue.length = 0; waiting.clear(); },
  };
}
