/**
 * Set piece (ART-GUIDE §12): the open sea at dawn, the title's water. Two drafts combined (Tommi,
 * 2026-10-15): the MIRROR (a glassy sea the colour of the sky above it, long slow swells, the sun's
 * path broken into shimmering dashes) and the PIXEL SWELL (rows of waves in perspective, each crest
 * catching the sun where it crosses its path). At night (`warm` 0) it is dark and the sun's path is
 * gone; the city's haze (`haze`) dims it toward Downtown. Register: sets/index.ts (`sea`).
 *
 * Unlike most sets it draws a band of the screen, not a thing in its own frame: from the horizon
 * (`top`) to the near water (`bottom`), across `W`, in whatever units the caller draws in (the
 * glide: its view units). Everything is a function of `t`, so the picture can be sought.
 */

export interface SeaLook {
  W: number;
  /** The horizon and the bottom of the water band. */
  top: number;
  bottom: number;
  /** The sun's x and radius (its path runs down from it); how much of its light is on the water (0..1). */
  sunX: number;
  sunR: number;
  refl: number;
  /** Animation clock in frames; `still` holds the swell. */
  t: number;
  still?: boolean;
  /** 0 night .. 1 dawn. */
  warm: number;
  /** 0 open sea .. 1 the city's grey haze over it. */
  haze?: number;
  /** Shift the swell with the camera (the far layer's offset, view units), so waves stay put as it moves. */
  shift?: number;
}

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const mixc = (a: number[], b: number[], f: number) => a.map((v, i) => Math.round(lerp(v, b[i], f)));
const rgb = (c: number[], a = 1) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';

/** The mirror's colours top to bottom, at night and at dawn. */
const NIGHT = [[26, 15, 52], [20, 10, 42], [12, 6, 28], [7, 3, 15]];
const DAWN = [[192, 80, 122], [122, 42, 106], [52, 18, 74], [20, 7, 31]];
const TOWN = [[140, 70, 96], [92, 40, 84], [40, 18, 52], [16, 8, 24]];

export function drawSea(x: CanvasRenderingContext2D, o: SeaLook) {
  const { W, top, bottom, warm } = o, Hs = bottom - top, haze = o.haze ?? 0;
  const t = o.still ? 0 : o.t, sh = o.shift ?? 0;
  const col = (i: number) => mixc(mixc(NIGHT[i], DAWN[i], warm), TOWN[i], haze);
  // the mirror: the sky's colours, darker toward you
  const g = x.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, rgb(col(0))); g.addColorStop(0.12, rgb(col(1))); g.addColorStop(0.5, rgb(col(2))); g.addColorStop(1, rgb(col(3)));
  x.fillStyle = g; x.fillRect(0, top, W, Hs);
  const light = lerp(0.3, 1, warm) * (1 - haze * 0.4);
  // long slow swells: a light crest over a dark trough, spacing growing toward you
  for (let i = 0; i < 14; i++) {
    const d = (i / 14 + t * 0.0006) % 1, yy = Math.round(top + Hs * d * d);
    for (let sx = -((sh % 3) + 3) % 3; sx < W; sx += 3) {
      const n = Math.sin((sx + sh) * (0.05 - d * 0.03) + t * 0.02 + i * 2.1); if (n < 0.2) continue;
      x.fillStyle = 'rgba(255,190,200,' + ((0.04 + d * 0.13 * n) * light).toFixed(3) + ')'; x.fillRect(sx, yy, 3, 1);
      x.fillStyle = 'rgba(10,2,20,' + (0.08 + d * 0.18 * n).toFixed(3) + ')'; x.fillRect(sx, yy + 1, 3, 1);
    }
  }
  // the pixel swell: rows of waves in perspective; the crests catch the light, most on the sun's path
  const rows = 16;
  for (let i = 1; i < rows; i++) {
    const d = i / (rows - 1), y0 = top + Hs * d * d, amp = 0.3 + d * 2.2, wl = 18 + d * 40, ph = t * (0.012 + d * 0.02) + i * 1.7;
    const base = mixc([120, 48, 110], [26, 8, 40], d);
    for (let sx = 0; sx < W; sx += 2) {
      const s = Math.sin(((sx + sh * (0.4 + d * 0.6)) / wl) * Math.PI * 2 + ph);
      if (s > 0.2) { x.fillStyle = rgb(base, (0.18 + d * 0.22) * light); x.fillRect(sx, Math.round(y0 + s * amp) + 1, 2, 1); }
      if (s > -0.6) continue;
      const near = Math.max(0, 1 - Math.abs(sx - o.sunX) / (o.sunR * 1.2 + d * 40)) * o.refl, a = (0.1 + near * 0.75) * light;
      x.fillStyle = near > 0.05 ? 'rgba(255,' + (200 + Math.round(near * 40)) + ',140,' + a.toFixed(3) + ')' : 'rgba(255,170,190,' + ((0.06 + d * 0.1) * light).toFixed(3) + ')';
      x.fillRect(sx, Math.round(y0 + s * amp), 2, 1);
    }
  }
  // the sun's path: dashes breaking and shimmering down from it
  if (o.refl > 0.01) {
    for (let yy = top + 1; yy < bottom; yy++) {
      const f = (yy - top) / Hs, wob = Math.sin(yy * 0.9 + t * 0.07) * (1 + f * 6);
      const k = hash(yy * 7 + Math.floor(t / 7)); if (k < 0.3) continue;
      const w = (o.sunR * 1.1 + f * 30) * (0.35 + k * 0.65);
      x.fillStyle = 'rgba(255,214,150,' + ((0.75 - f * 0.45) * k * o.refl * (1 - haze * 0.5)).toFixed(3) + ')';
      x.fillRect(Math.round(o.sunX - w / 2 + wob), yy, Math.round(w), 1);
    }
  }
  // the horizon's bright line
  x.fillStyle = 'rgba(255,220,160,' + (0.5 * lerp(0.25, 1, warm)).toFixed(3) + ')'; x.fillRect(0, top, W, 1);
}
