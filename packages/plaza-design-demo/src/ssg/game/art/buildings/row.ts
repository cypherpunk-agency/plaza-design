/**
 * BUILDING KIT: a row of buildings at a distance (skyline and midground level of detail). It is the
 * Downtown tower generator (`architecture/downtown-towers.ts`: skins, setbacks, crowns, roof gear,
 * grime, signs) at a small storey, picking from the kit's skins, so the far city and the street fronts
 * share one vocabulary. The kit's `tenement` reads as the towers' `brick` walk-up at this size.
 */
import { drawTower, towerRow, type Skin as TowerSkin, type Tower, type TowerLook } from '../architecture/downtown-towers';
import type { Light } from '../../world/light';
import { SKINS, type Skin } from './front';

export const ROW_SKINS = ['mixed', ...SKINS, 'capsule'] as const;
export type RowSkin = typeof ROW_SKINS[number];
export interface RowSpec {
  width: number; seed: number; storey: number;
  minHeight: number; maxHeight: number; minWidth: number; maxWidth: number; gap: number;
  /** Chance of a low walk-up between the towers, 0..1. */
  low: number;
  skin: RowSkin;
  lit: number; haze: number;
  /** Signs per building, at most (0 for a quiet back row). */
  signs: number;
}
const asTower = (s: Skin | 'capsule'): TowerSkin => s === 'tenement' ? 'brick' : s;
const MIXED: TowerSkin[] = ['concrete', 'glass', 'panel', 'brick', 'capsule'];
const ROWS = new Map<string, (Tower & { x: number })[]>();
/** The row's buildings (left edges in `x`), seeded and cached by spec. */
export function rowTowers(s: RowSpec): (Tower & { x: number })[] {
  const key = JSON.stringify(s), had = ROWS.get(key); if (had) return had;
  const n = Math.max(1, Math.ceil(s.width / ((s.minWidth + s.maxWidth) / 2 + s.gap)) + 1);
  const towers = towerRow(s.seed, n, [s.minWidth, s.maxWidth], [s.minHeight, s.maxHeight], [], {
    storey: s.storey, gap: [Math.round(s.gap * 0.4), Math.round(s.gap * 1.6)], low: s.low, signs: s.signs,
    skins: s.skin === 'mixed' ? MIXED : [asTower(s.skin)],
  }).filter(t => t.x < s.width);
  if (ROWS.size > 200) ROWS.clear();
  ROWS.set(key, towers); return towers;
}
export function rowLook(s: RowSpec, t: number, lighting: Light, still = false): TowerLook {
  return { t, still, fill: '#0a0604', edge: 0.08 + 0.3 * (1 - s.haze), lit: s.lit, glow: 0.85, storey: s.storey, haze: s.haze, hazeCol: '#1c1222', clock: true, lighting };
}
/**
 * Paint the row: `left(x)` gives the canvas x of a building's left edge at row offset `x`, `base` the
 * canvas row of the ground; buildings off the canvas (`width` wide) are skipped.
 */
export function paintRow(x: CanvasRenderingContext2D, s: RowSpec, look: TowerLook, left: (dx: number) => number, base: number, width: number) {
  for (const t of rowTowers(s)) {
    const l = left(t.x);
    if (l + t.w + 20 < 0 || l - 20 > width) continue;
    x.save(); x.translate(l, base);
    try { drawTower(x, t, look); } finally { x.restore(); }
  }
}
