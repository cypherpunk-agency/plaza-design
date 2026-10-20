/**
 * Library › Buildings: the building kit (art/buildings/) at a glance. Viewing only: it paints the same
 * kernels the registered elements use (`building.front`, `building.row`) with explicit inputs, next to
 * the player for scale. Nothing here saves or changes artwork.
 */
import { WorkbenchPlayback, mountWorkbenchPlayback } from './workbench-playback';
import { frameView, type View } from '../art/core/view';
import { lightAt } from '../world/light';
import { SPR } from '../art/core/sprites';
import { drawPlayer } from '../art/characters/player';
import { FRONT_DEFAULTS, ROOFS, SIDES, SKINS, WINDOW_KINDS, paintFront, shapeOf, type FrontSpec } from '../art/buildings/front';
import { ROW_SKINS, paintRow, rowLook, type RowSpec } from '../art/buildings/row';

type Mode = 'lineup' | 'single' | 'rows';
interface BenchState { mode: Mode; seed: number; minute: number; density: number; lit: number; front: FrontSpec; row: RowSpec['skin'] }
const frame = (t: number, minute: number, width: number, height: number): View => ({ ...frameView(t, lightAt(1, minute, 90, null)), viewW: width, viewH: height, sx: x => x, y: h => -h, cam: 0, gy: 0 });
const backdrop = (x: CanvasRenderingContext2D, w: number, h: number, ground: number) => {
  const g = x.createLinearGradient(0, 0, 0, ground); g.addColorStop(0, '#07060c'); g.addColorStop(1, '#1a0f14');
  x.fillStyle = g; x.fillRect(0, 0, w, ground); x.fillStyle = '#030201'; x.fillRect(0, ground, w, h - ground); x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(0, ground, w, 1);
};

/** One front per skin side by side at true scale, the player first. Returns each front's span in canvas pixels. */
export function paintBuildingLineup(x: CanvasRenderingContext2D, width: number, height: number, s: BenchState, t: number) {
  const fronts = SKINS.map((skin, i): FrontSpec => ({ ...FRONT_DEFAULTS, skin, w: [150, 120, 140, 160, 110][i], h: 276 + (i % 2) * 66, seed: s.seed * 10 + i, density: s.density, lit: s.lit }));
  const gap = 14, start = 50, total = start + fronts.reduce((sum, f) => sum + f.w + gap, 0), ground = Math.round(height * 0.88);
  const scale = Math.min(width / total, ground / 400), view = frame(t, s.minute, width, height), spans: { skin: string; x0: number; x1: number }[] = [];
  x.save(); backdrop(x, width, height, ground); x.translate(0, ground); x.scale(scale, scale);
  let at = start;
  for (const f of fronts) { x.save(); x.translate(at, 0); paintFront(x, f, { t, lighting: view.lighting, view }); x.restore(); spans.push({ skin: String(f.skin), x0: at * scale, x1: (at + f.w) * scale }); at += f.w + gap; }
  drawPlayer(x, view, SPR.stand, { x: start / 2, y: 0, face: 1 }, undefined, 0);
  x.restore();
  x.fillStyle = 'rgba(143,162,185,.75)'; x.font = '10px "IBM Plex Mono", monospace';
  for (const sp of spans) x.fillText(sp.skin, sp.x0, ground + 14);
  return spans;
}
/** One front with every choice explicit, large. */
export function paintBuildingSingle(x: CanvasRenderingContext2D, width: number, height: number, s: BenchState, t: number) {
  const f = { ...s.front, seed: s.seed, density: s.density, lit: s.lit }, ground = Math.round(height * 0.9), scale = Math.min((width - 40) / (f.w + 80), ground / (f.h + 60)), view = frame(t, s.minute, width, height);
  x.save(); backdrop(x, width, height, ground); x.translate(Math.round((width - (f.w + 60) * scale) / 2), ground); x.scale(scale, scale);
  x.save(); x.translate(60, 0); paintFront(x, f, { t, lighting: view.lighting, view }); x.restore();
  drawPlayer(x, view, SPR.stand, { x: 30, y: 0, face: 1 }, undefined, 0);
  x.restore();
  const S = shapeOf(f);
  return `skin ${S.skin} · windows ${S.windows} · roof ${S.roof} · ${S.storeys} storeys · bays ${S.bays.map(b => b.kind).join(', ') || 'none'} · gear ${S.gear.map(g => g.kind).join(', ') || 'none'}${S.escape ? ' · fire escape' : ''}${S.conduit ? ' · cables' : ''}${S.screens.length ? ' · screen' : ''}`;
}
/** Rows at three distances (far, middle, near) in one skyline, as `building.row` draws them. */
export function paintBuildingRows(x: CanvasRenderingContext2D, width: number, height: number, s: BenchState, t: number) {
  const ground = Math.round(height * 0.92), lighting = lightAt(1, s.minute, 90, null);
  x.save(); backdrop(x, width, height, ground);
  const rows: [RowSpec, number][] = [
    [{ width, seed: s.seed + 1, storey: 9, minHeight: 140, maxHeight: 300, minWidth: 30, maxWidth: 70, gap: 4, low: 0.2, skin: s.row, lit: s.lit * 0.5, haze: 0.6, signs: 0 }, ground - 30],
    [{ width, seed: s.seed + 2, storey: 14, minHeight: 110, maxHeight: 240, minWidth: 40, maxWidth: 90, gap: 8, low: 0.3, skin: s.row, lit: s.lit * 0.6, haze: 0.35, signs: 1 }, ground - 12],
    [{ width, seed: s.seed + 3, storey: 22, minHeight: 90, maxHeight: 180, minWidth: 60, maxWidth: 130, gap: 10, low: 0.4, skin: s.row, lit: s.lit * 0.7, haze: 0.1, signs: 2 }, ground],
  ];
  for (const [r, base] of rows) paintRow(x, r, rowLook(r, t, lighting), dx => dx, base, width);
  x.restore();
}

export function mountBuildingWorkbench(host: HTMLElement): () => void {
  const root = document.createElement('section'), heading = document.createElement('h2'), modes = document.createElement('div'), common = document.createElement('div'), single = document.createElement('div'), rowControls = document.createElement('div');
  const transport = document.createElement('div'), canvas = document.createElement('canvas'), status = document.createElement('output');
  heading.textContent = 'Building kit'; modes.className = 'segmented'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'View'); modes.style.margin = '8px 0';
  canvas.width = 960; canvas.height = 420; canvas.style.maxWidth = '100%'; canvas.style.background = '#0c0a12';
  root.append(heading, modes, common, single, rowControls, transport, canvas, status); host.append(root);
  const s: BenchState = { mode: 'lineup', seed: 3, minute: 1260, density: 0.5, lit: 0.45, front: { ...FRONT_DEFAULTS, w: 160, h: 340 }, row: 'mixed' };
  const ctx = canvas.getContext('2d')!; let disposed = false, raf = 0, ui: ReturnType<typeof mountWorkbenchPlayback> | undefined, spans: { skin: string; x0: number; x1: number }[] = [];
  const draw = () => {
    if (disposed) return; const t = clock.reduced ? 0 : clock.time * 60;
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (s.mode === 'lineup') { spans = paintBuildingLineup(ctx, canvas.width, canvas.height, s, t); status.value = 'One seeded front per skin (Library › Artwork › Building front), true scale beside the player. Click one to open it in Single.'; }
      else if (s.mode === 'single') status.value = paintBuildingSingle(ctx, canvas.width, canvas.height, s, t);
      else { paintBuildingRows(ctx, canvas.width, canvas.height, s, t); status.value = 'Building row (Library › Artwork › Building row) at three distances: storey 9, 14 and 22, hazier further back.'; }
    } catch (e) { status.value = String(e); }
    ui?.refresh();
  };
  const clock = new WorkbenchPlayback(50, draw); ui = mountWorkbenchPlayback(transport, clock);
  const label = (text: string, input: HTMLElement, parent: HTMLElement) => { const l = document.createElement('label'); l.style.marginRight = '12px'; l.append(text + ' ', input); parent.append(l); };
  const number = (text: string, get: () => number, set: (n: number) => void, min: number, max: number, step: number, parent: HTMLElement) => {
    const el = document.createElement('input'); el.type = 'number'; el.min = String(min); el.max = String(max); el.step = String(step); el.value = String(get());
    el.onchange = () => { const n = Number(el.value); if (Number.isFinite(n)) { set(Math.max(min, Math.min(max, n))); draw(); } }; label(text, el, parent);
  };
  const choice = (text: string, options: readonly string[], get: () => string, set: (v: string) => void, parent: HTMLElement) => {
    const el = document.createElement('select'); for (const o of options) { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; el.append(opt); }
    el.value = get(); el.onchange = () => { set(el.value); draw(); }; label(text, el, parent); return el;
  };
  number('Seed', () => s.seed, n => { s.seed = Math.round(n); }, 0, 1000000, 1, common);
  number('Minute of day', () => s.minute, n => { s.minute = Math.round(n); }, 0, 1439, 30, common);
  number('Retrofit', () => s.density, n => { s.density = n; }, 0, 1, 0.1, common);
  number('Rooms lit', () => s.lit, n => { s.lit = n; }, 0, 1, 0.05, common);
  const skin = choice('Skin', ['auto', ...SKINS], () => String(s.front.skin), v => { s.front = { ...s.front, skin: v as FrontSpec['skin'] }; }, single);
  choice('Windows', ['auto', ...WINDOW_KINDS], () => String(s.front.windows), v => { s.front = { ...s.front, windows: v as FrontSpec['windows'] }; }, single);
  choice('Roof', ['auto', ...ROOFS], () => String(s.front.roof), v => { s.front = { ...s.front, roof: v as FrontSpec['roof'] }; }, single);
  choice('Fire escape', SIDES, () => s.front.escape, v => { s.front = { ...s.front, escape: v as FrontSpec['escape'] }; }, single);
  choice('Balconies', ['auto', 'none', 'some'], () => s.front.balconies, v => { s.front = { ...s.front, balconies: v as FrontSpec['balconies'] }; }, single);
  number('Width', () => s.front.w, n => { s.front = { ...s.front, w: Math.round(n) }; }, 40, 400, 10, single);
  number('Height', () => s.front.h, n => { s.front = { ...s.front, h: Math.round(n) }; }, 62, 800, 22, single);
  choice('Row skins', ROW_SKINS, () => s.row, v => { s.row = v as RowSpec['skin']; }, rowControls);
  const setMode = (mode: Mode) => {
    s.mode = mode; for (const b of modes.children) b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.mode === mode));
    // style.display, not hidden: the workbench stylesheet sets display on these rows
    single.style.display = mode === 'single' ? '' : 'none'; rowControls.style.display = mode === 'rows' ? '' : 'none'; draw();
  };
  for (const [id, text] of [['lineup', 'Lineup'], ['single', 'Single'], ['rows', 'Rows']] as const) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.mode = id; b.onclick = () => setMode(id); modes.append(b); }
  canvas.onclick = event => {
    if (s.mode !== 'lineup') return; const r = canvas.getBoundingClientRect(), px = (event.clientX - r.left) * canvas.width / r.width, hit = spans.find(sp => px >= sp.x0 && px < sp.x1);
    if (!hit) return; s.front = { ...s.front, skin: hit.skin as FrontSpec['skin'] }; skin.value = hit.skin; setMode('single');
  };
  setMode('lineup');
  const loop = (now: number) => { if (disposed) return; clock.tick(now); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
  return () => { disposed = true; cancelAnimationFrame(raf); clock.dispose(); ui?.dispose(); root.remove(); };
}
