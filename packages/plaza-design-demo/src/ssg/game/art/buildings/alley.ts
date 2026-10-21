/**
 * BUILDING KIT alley: the gap between two fronts, seen straight in from the street. Side walls run back
 * to a back wall with one light (a doorway, a lamp over a yard), wet ground catches it, and the usual
 * clutter fills the gap: a fire escape on one side wall, bins, steam from a grate, cables across the top,
 * laundry strung over a yard. Tommi, 2026-10-21: a street of fronts needs somewhere to look into.
 *
 * Drawn in its own frame: origin at its foot, left edge; x to the right, heights up (y = -h).
 */
import { addLight } from '../atmosphere/lighting';
import type { Element } from '../core/composition';

const rgba = (c: string, a: number) => 'rgba(' + c + ',' + a + ')';
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

export interface AlleySpec {
  w: number; h: number;
  /** Where the back wall stands: 0 right at the street, 1 far back (narrow and small). */
  depth: number;
  /** The back light's colour (r,g,b) and how bright (0: dark). */
  light: string; bright: number;
  escape: 'none' | 'left' | 'right'; bins: boolean; steam: boolean; cables: boolean;
  /** A yard behind: open sky over the back wall and laundry on lines. */
  yard: boolean;
  seed: number;
}

/** Paint an alley in its own frame; returns the back light's position for the scene's light layer. */
export function paintAlley(x: CanvasRenderingContext2D, a: AlleySpec, t: number) {
  const y = (h: number) => -h, { w, h } = a, k = 0.35 + 0.4 * (1 - a.depth);
  // the back wall: narrower and lower the further back it stands, lifted a little off the ground line
  const bw = Math.max(8, Math.round(w * k)), bx = Math.round((w - bw) / 2), floor = Math.round(10 * a.depth), bh = Math.round(h * (0.55 + 0.35 * (1 - a.depth)));
  x.fillStyle = '#050304'; x.fillRect(0, y(h), w, h);
  // side walls: two dim trapezoids converging on the back wall
  const side = (l: number, r: number, inner: number, shade: string) => {
    x.fillStyle = shade; x.beginPath(); x.moveTo(l, y(0)); x.lineTo(inner, y(floor)); x.lineTo(inner, y(floor + bh)); x.lineTo(l, y(h)); x.closePath(); x.fill();
    void r;
  };
  side(0, bx, bx, '#160d0a'); side(w, bx + bw, bx + bw, '#110a08');
  // brick courses on the side walls, converging
  x.strokeStyle = 'rgba(194,65,12,.08)'; x.lineWidth = 1;
  for (let k2 = 1; k2 < 9; k2++) { const f = k2 / 9; x.beginPath(); x.moveTo(0, y(h * f)); x.lineTo(bx, y(floor + bh * f)); x.moveTo(w, y(h * f)); x.lineTo(bx + bw, y(floor + bh * f)); x.stroke(); }
  // the back: a yard's sky or a wall, with the light
  if (a.yard) { x.fillStyle = '#120a14'; x.fillRect(bx, y(floor + bh), bw, Math.round(bh * 0.45)); }
  x.fillStyle = '#0f0907'; x.fillRect(bx, y(floor + bh * (a.yard ? 0.55 : 1)), bw, Math.round(bh * (a.yard ? 0.55 : 1)));
  const dw = Math.max(8, Math.round(bw * 0.4)), dx = bx + Math.round((bw - dw) / 2), dh = Math.max(16, Math.round(bh * 0.2));
  const flicker = a.bright * (0.85 + 0.15 * Math.sin(t / 37 + a.seed));
  if (a.bright > 0) {
    const g = x.createRadialGradient(dx + dw / 2, y(floor + dh), 0, dx + dw / 2, y(floor + dh), Math.max(bw * 1.6, w * 0.9));
    g.addColorStop(0, rgba(a.light, 0.6 * flicker)); g.addColorStop(0.45, rgba(a.light, 0.16 * flicker)); g.addColorStop(1, rgba(a.light, 0));
    x.fillStyle = g; x.fillRect(0, y(floor + bh), w, bh + floor);
  }
  x.fillStyle = a.bright > 0 ? rgba(a.light, 0.8 * flicker) : '#140c08'; x.fillRect(dx, y(floor + dh), dw, dh);
  if (a.bright > 0) { x.fillStyle = 'rgba(20,10,6,.7)'; x.fillRect(dx + 2, y(floor + dh - 3), Math.max(2, Math.round(dw / 3)), dh - 3); }
  x.fillStyle = rgba(a.light, 0.9 * flicker); x.fillRect(dx + dw / 2 - 1, y(floor + dh + 4), 3, 1);
  // laundry over the yard
  if (a.yard) for (let r = 0; r < 2; r++) {
    const ly = floor + bh * (0.62 + r * 0.16); x.strokeStyle = 'rgba(255,217,165,.15)'; x.beginPath(); x.moveTo(bx, y(ly)); x.quadraticCurveTo(bx + bw / 2, y(ly - 3), bx + bw, y(ly)); x.stroke();
    for (let c = bx + 2; c < bx + bw - 3; c += 4) if (hash(c + r * 7 + a.seed) < 0.6) { x.fillStyle = rgba(['200,70,60', '230,180,90', '150,160,190', '220,210,190'][Math.floor(hash(c * 3 + a.seed) * 4)], 0.45); x.fillRect(c, y(ly - 1), 3, 3 + Math.floor(hash(c) * 3)); }
  }
  // wet ground: a strip that catches the back light
  x.fillStyle = '#080506'; x.beginPath(); x.moveTo(0, y(0)); x.lineTo(w, y(0)); x.lineTo(bx + bw, y(floor)); x.lineTo(bx, y(floor)); x.closePath(); x.fill();
  if (a.bright > 0) { x.fillStyle = rgba(a.light, 0.28 * flicker); x.fillRect(dx - 1, y(floor), dw + 2, Math.max(2, floor)); x.fillStyle = rgba(a.light, 0.18 * flicker); x.fillRect(Math.round(w / 2) - 3, y(4), 6, 3); }
  // a fire escape zigzagging up one side wall
  if (a.escape !== 'none') {
    const left = a.escape === 'left', outer = left ? 2 : w - 2, inner = left ? bx - 2 : bx + bw + 2;
    x.strokeStyle = 'rgba(194,65,12,.45)';
    for (let l = 0; l < 4; l++) {
      const f0 = 0.22 + l * 0.18, f1 = f0 + 0.09, xo = outer + (inner - outer) * 0.15, xi = outer + (inner - outer) * 0.75;
      const hAt = (f: number, xx: number) => { const p = (xx - outer) / (inner - outer); return h * f * (1 - p) + (floor + bh * f) * p; };
      x.beginPath(); x.moveTo(xo, y(hAt(f0, xo))); x.lineTo(xi, y(hAt(f0, xi))); x.stroke();
      x.beginPath(); x.moveTo(xi, y(hAt(f0, xi))); x.lineTo(xo, y(hAt(f1, xo))); x.stroke();
    }
  }
  // bins at the mouth, steam from a grate
  if (a.bins) {
    const bxs = a.seed % 2 ? 3 : w - 17;
    x.fillStyle = '#1a1410'; x.fillRect(bxs, y(14), 14, 14); x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(bxs, y(14), 14, 1);
    x.fillStyle = '#120e0a'; x.fillRect(bxs + (a.seed % 2 ? 15 : -9), y(9), 8, 9);
  }
  if (a.steam) for (let s = 0; s < 6; s++) {
    const rise = (t * 0.3 + s * 9 + a.seed * 5) % 40, sx2 = Math.round(w / 2 + Math.sin((t + s * 30) / 30) * 4 + (s % 3) - 1);
    x.fillStyle = 'rgba(220,210,200,' + Math.max(0, 0.12 - rise * 0.003) + ')'; x.fillRect(sx2 - 2, y(4 + rise), 5, 4);
  }
  // cables slung across the top of the gap
  if (a.cables) { x.strokeStyle = 'rgba(0,0,0,.85)'; for (let c = 0; c < 3; c++) { const ch = h - 8 - c * 14; x.beginPath(); x.moveTo(-2, y(ch)); x.quadraticCurveTo(w / 2, y(ch - 8 - c * 3), w + 2, y(ch + 2)); x.stroke(); } }
  return { x: dx + dw / 2, h: floor + dh / 2, w: dw, hh: dh };
}

const num = (label: string, value: number, min: number, max: number, step = 1, unit?: string) => ({ kind: 'number' as const, label, default: value, min, max, step, ...(unit ? { unit } : {}) });

export const alleyElement: Element = {
  type: 'building.alley', version: 1, label: 'Alley or back yard (kit)', category: 'architecture', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: {
    width: num('Width', 48, 16, 400, 1, 'units'), height: num('Height (to the roofs either side)', 240, 40, 2000, 1, 'units'),
    depth: num('Depth (0 shallow, 1 far back)', 0.6, 0, 1, 0.05),
    light: { kind: 'select', label: 'Back light', options: ['warm', 'neon', 'cold', 'red', 'none'], default: 'warm' },
    escape: { kind: 'select', label: 'Fire escape', options: ['left', 'right', 'none'], default: 'left' },
    bins: { kind: 'boolean', label: 'Bins', default: true }, steam: { kind: 'boolean', label: 'Steam from a grate', default: true },
    cables: { kind: 'boolean', label: 'Cables across the top', default: true }, yard: { kind: 'boolean', label: 'A yard behind (sky and laundry)', default: false },
    seed: num('Seed', 1, 0, 1000000),
  },
  bounds: p => ({ x: 0, h: Number(p.height), w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, mouth: { x: Number(p.width) / 2, h: 0, role: 'entrance' }, top: { x: Number(p.width) / 2, h: Number(p.height), role: 'surface' } }),
  draw(ctx, v, p, _s, _pass, at) {
    const sx = v.sx(at.x), w = Number(p.width);
    if (sx + w * at.scale + 20 < 0 || sx - 20 > v.viewW) return;
    const lights: Record<string, [string, number]> = { warm: ['255,170,80', 1], neon: ['255,61,242', 0.9], cold: ['200,210,235', 0.8], red: ['230,60,50', 0.9], none: ['0,0,0', 0] };
    const [light, bright] = lights[String(p.light)] ?? lights.warm;
    ctx.save(); ctx.translate(sx, v.y(at.h));
    let lamp: ReturnType<typeof paintAlley> | undefined;
    try { lamp = paintAlley(ctx, { w, h: Number(p.height), depth: Number(p.depth), light, bright, escape: p.escape as AlleySpec['escape'], bins: p.bins !== false, steam: p.steam !== false, cables: p.cables !== false, yard: p.yard === true, seed: Number(p.seed) }, v.t); }
    finally { ctx.restore(); }
    if (lamp && bright > 0 && at.parallax === 1) addLight(v, { x: at.x + lamp.x * at.scale * at.facing, h: at.h + lamp.h * at.scale, kind: 'window', w: lamp.w, hh: lamp.hh, r: 26, col: light, a: 0.5 });
  },
};
