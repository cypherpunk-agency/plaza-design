/**
 * Depth bands (ART-GUIDE "Depth bands"): one shared answer to "how far from the camera is this?" for
 * people and vehicles. The game stays a strict side view; depth is only how something is drawn.
 *
 * - `ps` is the people kit's pixel size. People can only change size in whole pixels, so the bands
 *   use 2 (⅔ of the player), 3 (the player's own size) and 5.
 * - `scale` is the same size as a factor, for vector art (vehicles) that can scale smoothly, so a
 *   back-band bus matches back-band people.
 * - `parallax` is how fast the band scrolls against the play band (1).
 * - `dim` darkens the band (0..1), so back bands stay calmer than the play band and the near band
 *   reads as a dark silhouette in front of it.
 *
 * The values are the ones the scenes already use: Market's back crowd (back), Mall's far crowd (far)
 * and Market's foreground walkers (near). Those scenes map onto bands without a pixel changing.
 */
export type DepthBand = 'far' | 'back' | 'play' | 'near';
export interface DepthSpec { label: string; ps: number; scale: number; parallax: number; dim: number; note: string }
export const DEPTH_BANDS: Readonly<Record<DepthBand, DepthSpec>> = {
  far: { label: 'Far', ps: 2, scale: 2 / 3, parallax: 0.55, dim: 0.55, note: 'across the square; scrolls slowly' },
  back: { label: 'Back', ps: 2, scale: 2 / 3, parallax: 0.9, dim: 0.5, note: 'behind the play band' },
  play: { label: 'Play', ps: 3, scale: 1, parallax: 1, dim: 0, note: 'the player’s band; everything you can use' },
  near: { label: 'Near', ps: 5, scale: 5 / 3, parallax: 1.3, dim: 0.78, note: 'in front of the play band; a dark silhouette' },
};
export const DEPTH_ORDER: readonly DepthBand[] = ['far', 'back', 'play', 'near'];
export const isDepthBand = (value: unknown): value is DepthBand => typeof value === 'string' && Object.prototype.hasOwnProperty.call(DEPTH_BANDS, value);

/** The band whose values these are (missing values are the play band's), or 'custom'. */
export function depthOf(values: { ps?: number; parallax?: number; dim?: number }): DepthBand | 'custom' {
  const ps = values.ps ?? 3, parallax = values.parallax ?? 1, dim = values.dim ?? 0;
  for (const band of DEPTH_ORDER) { const d = DEPTH_BANDS[band]; if (d.ps === ps && Math.abs(d.parallax - parallax) < 1e-6 && Math.abs(d.dim - dim) < 1e-6) return band; }
  return 'custom';
}
