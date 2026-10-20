import type { LevelSource } from '../engine/level';
import type { View } from '../art/core/view';
/**
 * The level kit as an editor diagram over the preview: each floor as a dashed line with its name,
 * doors into buildings, where flights and escalators start and land, and each lift's stops.
 * Floors and doors never draw in the game; this is how the author sees them.
 */
export function drawLevelOverlay(ctx: CanvasRenderingContext2D, level: LevelSource, view: View, scale: number) {
  ctx.save();
  try {
    ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.lineWidth = 1; ctx.font = '600 7px "IBM Plex Mono", monospace'; ctx.textBaseline = 'bottom';
    for (const f of level.floors) {
      const a = view.sx(f.x), b = view.sx(f.x + f.w), y = Math.round(view.y(f.h)) + 0.5, outdoors = !f.building;
      ctx.strokeStyle = outdoors ? 'rgba(114,219,202,.55)' : 'rgba(255,200,90,.75)'; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(a, y - 3, 1, 6); ctx.fillRect(b - 1, y - 3, 1, 6);
      ctx.fillText((f.label || f.id) + (f.building ? ' · ' + f.building : ''), a + 3, y - 2);
    }
    ctx.fillStyle = 'rgba(255,200,90,.9)';
    for (const d of level.doors) { const x = view.sx(d.x), y = view.y(d.h); ctx.strokeStyle = 'rgba(255,200,90,.9)'; ctx.strokeRect(Math.round(x - d.w / 2) + 0.5, Math.round(y - 44) + 0.5, d.w, 44); ctx.fillText('door → ' + d.building, x - d.w / 2, y - 46); }
    for (const l of level.links) for (const end of [l.low, l.high]) { ctx.fillStyle = 'rgba(114,219,202,.95)'; ctx.fillRect(view.sx(end.x) - 2, view.y(end.h) - 2, 5, 5); }
    for (const lift of level.lifts) for (const s of lift.stops) { const x = view.sx(lift.x + lift.w / 2) + 4, y = view.y(s.h); ctx.fillStyle = 'rgba(124,255,154,.9)'; ctx.fillRect(x, y - 1, 6, 2); ctx.fillText(s.label, x + 8, y + 3); }
  } finally { ctx.restore(); }
}
