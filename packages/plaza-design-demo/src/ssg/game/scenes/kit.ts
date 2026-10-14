/**
 * Shared shapes and types for the explorable scenes. A scene is mostly data
 * (positions, sizes, texts as plain objects) plus two draw functions; this file
 * holds what every scene draws the same way, so they all follow ART-GUIDE.md:
 * dim far band, medium middle band, the play band brightest; signs on plates;
 * cyan only on things you can use.
 */

/** What a scene's draw functions get from the engine, refreshed every frame. */
export interface View {
  /** World x to screen x; `parallax` < 1 for things further away, > 1 for the foreground. */
  sx: (wx: number, parallax?: number) => number;
  /** Height above the ground to screen y. */
  y: (h: number) => number;
  t: number;
  viewW: number;
  viewH: number;
  cam: number;
  /** Screen y of the ground; the strip below it (about 54 units) is the near floor. */
  gy: number;
}

/** A way out. `to` is a zone: 'downtown' or another scene's id. */
export interface SceneExit { id: string; x: number; to: string; label: string; promptH?: number }

/** Something to read (or a person who says a line) with E. */
export interface SceneReadable { id: string; x: number; name: string; pages: string[]; label?: string; h?: number; promptH?: number }

export interface Scene {
  id: string;
  /** Shown in the HUD. */
  name: string;
  width: number;
  spawn: number;
  exits: SceneExit[];
  readables?: SceneReadable[];
  /** `sky`: the engine's stars and ships behind everything; `rain`: the engine's rain in front. */
  ambient?: { sky?: boolean; rain?: boolean };
  /** What the player says on the first visit. */
  intro?: string[];
  /** Everything behind the player: far, middle and play band. */
  drawBackdrop: (x: CanvasRenderingContext2D, v: View) => void;
  /** Foreground in front of the player (near pillars, passers-by). */
  drawFront?: (x: CanvasRenderingContext2D, v: View) => void;
}

/** The player sprite is 14 rows of 3 px: the unit of scale for every scene. */
export const PLAYER_H = 42;
/** A door is about 1.2× the player, a storey 1.6–2×. */
export const DOOR_H = 52;
export const STOREY = 76;

export const O = '255,136,0', RUST = '194,65,12', C = '0,255,255', PAPER = '255,217,165', RED = '255,42,68', GREEN = '34,197,94';

/** Small seeded random, so a scene looks the same on every visit. */
export const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

export const mono = (size: number, weight = '') => (weight ? weight + ' ' : '') + size + 'px "IBM Plex Mono", monospace';

export function text(x: CanvasRenderingContext2D, s: string, cx: number, cy: number, col: string, size = 7, weight = '', align: CanvasTextAlign = 'center') {
  x.save(); x.font = mono(size, weight); x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, cx, cy); x.restore();
}

/** A filled box with a 1px outline inside it. */
export function box(x: CanvasRenderingContext2D, sx: number, top: number, w: number, h: number, fill: string, stroke?: string) {
  x.fillStyle = fill; x.fillRect(sx, top, w, h);
  if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, w - 1, h - 1); }
}

export const onScreen = (v: View, sx: number, w: number) => sx + w > -4 && sx < v.viewW + 4;

/** Neon letters with a glow, like the street's signs. Always put a plate or bracket behind them. */
export function neon(x: CanvasRenderingContext2D, t: number, s: string, cx: number, cy: number, col: string, opt: { size?: number; dead?: number; phase?: number } = {}) {
  const size = opt.size ?? 9, dead = opt.dead ?? -1;
  const flick = (t + (opt.phase ?? 0)) % 300 > 293 && Math.floor(t) % 4 < 2;
  x.save();
  x.font = mono(size, '600'); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < s.length; i++) {
    const off = flick || i === dead;
    x.fillStyle = 'rgba(' + col + ',' + (off ? 0.15 : 0.95) + ')';
    x.shadowColor = 'rgba(' + col + ',.85)'; x.shadowBlur = off ? 0 : 7;
    x.fillText(s[i], cx + (i - (s.length - 1) / 2) * size * 0.64, cy);
  }
  x.restore();
}

/** A neon sign on its backing plate, with the glow it throws on the wall around it. */
export function sign(x: CanvasRenderingContext2D, t: number, s: string, cx: number, cy: number, col: string, opt: { size?: number; dead?: number; phase?: number; plate?: string } = {}) {
  const size = opt.size ?? 9, w = Math.round(s.length * size * 0.64 + 12), h = size + 8;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, w * 0.7);
  g.addColorStop(0, 'rgba(' + col + ',.12)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  x.fillStyle = g; x.fillRect(cx - w, cy - w * 0.5, w * 2, w);
  box(x, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h, opt.plate ?? '#0d0705', 'rgba(' + col + ',.35)');
  neon(x, t, s, cx, cy + 0.5, col, opt);
}

/** The tell for "you can use this": a small cyan LED with a slow blink (ART-GUIDE §7). */
export function tell(x: CanvasRenderingContext2D, t: number, cx: number, cy: number, phase = 0) {
  const on = Math.sin(t * 0.05 + phase) > -0.3;
  x.save();
  x.fillStyle = 'rgba(' + C + ',' + (on ? 0.95 : 0.3) + ')';
  if (on) { x.shadowColor = 'rgba(' + C + ',.9)'; x.shadowBlur = 5; }
  x.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 2);
  x.restore();
}

/** A paper notice on a board, with a cyan LED so it reads as something to read. */
export function notice(x: CanvasRenderingContext2D, t: number, cx: number, top: number, w: number, h: number, lines: string[], phase = 0) {
  box(x, cx - w / 2, top, w, h, '#1a120b', 'rgba(' + O + ',.7)');
  box(x, cx - w / 2 + 3, top + 3, w - 6, h - 6, 'rgba(' + PAPER + ',.16)');
  lines.forEach((l, i) => text(x, l, cx, top + 9 + i * 9, 'rgba(' + PAPER + ',.9)', 7, '600'));
  tell(x, t, cx + w / 2 - 5, top + h - 4, phase);
}

/** The way back to Downtown at a scene's left edge: a door in the wall with a cyan plate. */
export function exitDoor(x: CanvasRenderingContext2D, v: View, wx: number, wall: string, label = '< DOWNTOWN') {
  const sx = v.sx(wx);
  if (!onScreen(v, sx - 30, 60)) return;
  box(x, sx - 14, v.y(DOOR_H + 4), 28, DOOR_H + 4, '#020100', 'rgba(' + O + ',.75)');
  box(x, sx - 11, v.y(DOOR_H), 22, DOOR_H, wall, 'rgba(' + O + ',.45)');
  x.fillStyle = 'rgba(' + C + ',.85)'; x.fillRect(sx + 6, v.y(28), 2, 6);
  box(x, sx - 30, v.y(DOOR_H + 18), 60, 12, '#04100f', 'rgba(' + C + ',.6)');
  text(x, label, sx - 2, v.y(DOOR_H + 12), 'rgba(' + C + ',.95)', 7, '600');
  tell(x, v.t, sx + 26, v.y(DOOR_H + 12));
}

/**
 * A person in silhouette, `h` tall (the player is 42), standing on screen y `base`.
 * `step` swings the legs for walkers. `rim` is a lighter edge so a figure never
 * vanishes into a dark wall.
 */
export function figure(x: CanvasRenderingContext2D, cx: number, base: number, h: number, fill: string, step = 0, rim?: string) {
  const u = h / 14, top = base - h, c = Math.round(cx);
  const hw = Math.round(u * 1.7), sw = Math.round(u * 3), lw = Math.max(1, Math.round(u * 1.2)), sp = Math.round(step * u);
  x.fillStyle = fill;
  x.fillRect(c - hw, Math.round(top), hw * 2, Math.round(u * 3.4));
  x.fillRect(c - sw, Math.round(top + u * 3.6), sw * 2, Math.round(u * 5.6));
  x.fillRect(c - sw + 1 + sp, Math.round(top + u * 9), lw, Math.round(u * 5));
  x.fillRect(c + sw - 1 - lw - sp, Math.round(top + u * 9), lw, Math.round(u * 5));
  if (rim) {
    x.fillStyle = rim;
    x.fillRect(c - hw, Math.round(top), hw * 2, 1);
    x.fillRect(c - sw, Math.round(top + u * 3.6), 1, Math.round(u * 5.6));
  }
}

/** A row of buildings for the far or middle band, laid out once. */
export interface Tower { x: number; w: number; h: number; lit: number[] }
export function towers(seed: number, span: number, w: [number, number], h: [number, number], lit: number): Tower[] {
  const r = rng(seed), list: Tower[] = [];
  for (let wx = -40; wx < span;) {
    const tw = Math.round(w[0] + r() * (w[1] - w[0])), th = Math.round(h[0] + r() * (h[1] - h[0])), cells: number[] = [];
    for (let yy = 6; yy < th - 6; yy += 7) for (let xx = 4; xx < tw - 4; xx += 6) if (r() < lit) cells.push(xx, yy);
    list.push({ x: wx, w: tw, h: th, lit: cells });
    wx += tw + 2 + Math.round(r() * 8);
  }
  return list;
}

/** Draws a tower row standing on screen y `base`. Far rows: low `alpha`; middle rows: higher. */
export function drawTowers(x: CanvasRenderingContext2D, v: View, list: Tower[], parallax: number, base: number, alpha: number, fill = '#040200', win = 2) {
  for (const b of list) {
    const sx = v.sx(b.x, parallax);
    if (!onScreen(v, sx, b.w)) continue;
    x.fillStyle = fill; x.fillRect(sx, base - b.h, b.w, b.h);
    x.strokeStyle = 'rgba(' + RUST + ',' + alpha + ')'; x.lineWidth = 1; x.strokeRect(sx + 0.5, base - b.h + 0.5, b.w - 1, b.h);
    x.fillStyle = 'rgba(' + O + ',' + (alpha * 0.9 + 0.05) + ')';
    for (let i = 0; i < b.lit.length; i += 2) x.fillRect(sx + b.lit[i], base - b.h + b.lit[i + 1], win, win);
  }
}

/** A wet floor: the play band's ground line and faint streaks below it. */
export function wetFloor(x: CanvasRenderingContext2D, v: View, fill = '#030201') {
  x.fillStyle = fill; x.fillRect(0, v.gy, v.viewW, v.viewH - v.gy);
  x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, v.gy, v.viewW, 1);
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,100,0,' + (0.12 - i * 0.022) + ')'; x.fillRect(0, v.gy + 6 + i * i * 2 + i * 4, v.viewW, 1); }
}

/** A light's reflection in the wet floor, straight below it. */
export function reflect(x: CanvasRenderingContext2D, v: View, sx: number, col: string, strength = 1, w = 12) {
  if (!onScreen(v, sx - w, w * 2)) return;
  for (let i = 0; i < 9; i++) {
    const wob = Math.sin(v.t * 0.05 + i + sx * 0.1) * 1.5;
    x.fillStyle = 'rgba(' + col + ',' + 0.1 * strength * (1 - i / 9) + ')';
    x.fillRect(Math.round(sx - w / 2 + wob), v.gy + 3 + i * 4, w, 3);
  }
}

/** Covers everything above an interior's ceiling, so tall screens never see past it. */
export function ceiling(x: CanvasRenderingContext2D, v: View, h: number, fill = '#050302') {
  const top = v.y(h);
  if (top <= 0) return;
  x.fillStyle = fill; x.fillRect(0, 0, v.viewW, top);
  // dim beams and a duct, so a tall screen sees a ceiling, not a void
  x.fillStyle = 'rgba(' + O + ',.07)';
  for (let wx = Math.floor(v.cam / 64) * 64; wx < v.cam + v.viewW + 64; wx += 64) x.fillRect(v.sx(wx), 0, 2, top);
  if (top > 24) { x.fillStyle = '#0b0705'; x.fillRect(0, top - 18, v.viewW, 8); x.fillStyle = 'rgba(' + O + ',.18)'; x.fillRect(0, top - 18, v.viewW, 1); }
  x.fillStyle = 'rgba(' + O + ',.35)'; x.fillRect(0, top, v.viewW, 1);
}
