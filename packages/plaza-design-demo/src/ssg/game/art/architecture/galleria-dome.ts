/**
 * Set piece (ART-GUIDE §12): the Galleria's glass dome, the mall's landmark on the skyline. A
 * half-ellipse of glass on a base block, its ribs lit warm from inside, GALLERIA on the base.
 * Register: sets/index.ts (`galleria-dome`).
 *
 * Drawn in its own frame: origin at the middle of its base, heights up (y = -h). 160 wide, 74 tall.
 * `lit`: how much the ribs glow (1 at night; the morning glide runs it a little brighter).
 *
 * `glazed` (the glide's close view, Tommi 2026-10-22: "the Galleria is a purple blob"): the dome as
 * the mall's own skylight shows it from inside (assemblies/mall-details.ts: glass on orange mullions
 * over a lit atrium): a glass shell over the galleries' warm light, meridian ribs and ring beams in
 * the structure's orange, a few panes lit brighter, the low sun along its west shoulder, a lantern
 * on the crown with its red light, and a drum of tall lit windows on the base block.
 */

import { text } from '../core/primitives';

export interface DomeLook { fill?: string; lit?: number; label?: boolean; glazed?: boolean; warm?: number; t?: number; still?: boolean }

export function drawGalleriaDome(x: CanvasRenderingContext2D, o: DomeLook = {}) {
  if (o.glazed) { glazedDome(x, o); return; }
  const lit = o.lit ?? 1;
  x.fillStyle = o.fill ?? '#0e0806'; x.beginPath(); x.ellipse(0, -40, 70, 34, 0, Math.PI, 0); x.fill(); x.fillRect(-80, -40, 160, 40);
  x.strokeStyle = 'rgba(255,190,110,' + 0.4 * lit + ')'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, -40, 70, 34, 0, Math.PI, 0); x.stroke();
  x.fillStyle = 'rgba(255,190,110,' + 0.16 * lit + ')'; for (let k = -60; k <= 60; k += 15) x.fillRect(k, -40 - Math.sqrt(Math.max(0, 1 - (k / 70) ** 2)) * 30, 1, 30);
  if (o.label !== false) text(x, 'GALLERIA', 0, -28, 'rgba(255,217,165,.5)', 7, '600');
}

const RX = 70, RY = 34, BASE = -40;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function glazedDome(x: CanvasRenderingContext2D, o: DomeLook) {
  const lit = o.lit ?? 1, warm = o.warm ?? 1, fill = o.fill ?? '#2a1830', a = (v: number) => Math.min(1, v).toFixed(3);
  const shell = () => { x.beginPath(); x.ellipse(0, BASE, RX, RY, 0, Math.PI, 0); x.closePath(); };
  // the drum under the dome: the base block, a cornice, a ring of tall lit windows
  x.fillStyle = fill; x.fillRect(-80, BASE, 160, -BASE);
  x.fillStyle = '#120a12'; x.fillRect(-82, BASE - 1, 164, 4);
  x.fillStyle = 'rgba(255,170,100,' + a(0.5 * lit) + ')'; x.fillRect(-82, BASE - 1, 164, 1);
  for (let i = 0, wx = -74; wx < 70; i++, wx += 10) {
    const on = hash(i * 3.7) > 0.22;
    x.fillStyle = on ? 'rgba(255,196,130,' + a(0.32 + 0.14 * lit + hash(i) * 0.12) + ')' : 'rgba(14,8,16,.85)'; x.fillRect(wx, BASE + 7, 6, 24);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(wx, BASE + 18, 6, 1);
  }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(-80, -6, 160, 6);
  // the glass: the dusk sky lying on its top, the galleries' warm light coming up through it
  x.save(); shell(); x.clip();
  const g = x.createLinearGradient(0, BASE - RY, 0, BASE);
  g.addColorStop(0, fill); g.addColorStop(0.5, 'rgba(96,40,72,1)'); g.addColorStop(1, 'rgba(196,104,78,1)');
  x.fillStyle = g; x.fillRect(-RX, BASE - RY, RX * 2, RY);
  // inside: the galleries' floors seen through the glass, their shopfronts lit
  for (let k = 0; k < 3; k++) {
    const fy = BASE - 4 - k * 8;
    x.fillStyle = 'rgba(30,14,26,.55)'; x.fillRect(-RX, fy, RX * 2, 2);
    for (let i = 0, sx = -RX + ((k * 7) % 11); sx < RX; i++, sx += 9 + ((i * 5 + k) % 4)) if (hash(k * 41 + i) > 0.35) { x.fillStyle = 'rgba(255,214,150,' + a((0.18 + hash(i + k) * 0.2) * lit) + ')'; x.fillRect(sx, fy - 5, 5, 4); }
  }
  // a few panes lit brighter (a gallery's lamps behind them), some dark
  for (let i = 0; i < 26; i++) {
    const px = Math.round((hash(i * 9.1) * 2 - 1) * RX * 0.9), ph = BASE - 6 - hash(i * 5.3) * RY * 0.85;
    if (((px / RX) ** 2 + ((ph - BASE) / RY) ** 2) > 0.85) continue;
    x.fillStyle = i % 3 ? 'rgba(255,200,140,' + a(0.12 * lit) + ')' : 'rgba(20,8,22,.35)'; x.fillRect(px, Math.round(ph), 7, 5);
  }
  // the low sun along its west shoulder (the left, the sea's side)
  const sg = x.createRadialGradient(-RX * 0.7, BASE - RY * 0.6, 2, -RX * 0.7, BASE - RY * 0.6, RX);
  sg.addColorStop(0, 'rgba(255,170,90,' + a(0.32 * warm) + ')'); sg.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = sg; x.fillRect(-RX, BASE - RY, RX * 2, RY);
  // the structure: meridian ribs (nested half-ellipses), ring beams, all in the structure's orange
  x.strokeStyle = 'rgba(255,150,80,' + a(0.32 + 0.12 * lit) + ')'; x.lineWidth = 1;
  for (const f of [0.18, 0.42, 0.64, 0.82, 0.95]) { x.beginPath(); x.ellipse(0, BASE, RX * f, RY, 0, Math.PI, 0); x.stroke(); }
  x.beginPath(); x.moveTo(0, BASE - RY); x.lineTo(0, BASE); x.stroke();
  for (const f of [0.28, 0.55, 0.8]) { const hy = BASE - RY * f, hw = RX * Math.sqrt(1 - f * f); x.fillStyle = 'rgba(255,150,80,' + a(0.28 + 0.1 * lit) + ')'; x.fillRect(Math.round(-hw), Math.round(hy), Math.round(hw * 2), 1); }
  x.restore();
  // its outline: a heavy edge beam, the sunset catching its top and west side
  x.strokeStyle = '#140a12'; x.lineWidth = 2; shell(); x.stroke();
  x.strokeStyle = 'rgba(255,190,110,' + a(0.55 * lit) + ')'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, BASE, RX, RY, 0, Math.PI, Math.PI * 1.5); x.stroke();
  x.strokeStyle = 'rgba(255,190,110,' + a(0.25 * lit) + ')'; x.beginPath(); x.ellipse(0, BASE, RX, RY, 0, Math.PI * 1.5, 0); x.stroke();
  // the lantern on the crown, its red light
  x.fillStyle = '#140a12'; x.fillRect(-6, BASE - RY - 6, 12, 7); x.fillRect(-8, BASE - RY - 7, 16, 2);
  x.fillStyle = 'rgba(255,210,150,' + a(0.5 * lit) + ')'; x.fillRect(-4, BASE - RY - 4, 8, 2);
  const on = o.still || Math.floor((o.t ?? 0) / 40) % 2 === 0;
  x.fillStyle = on ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.3)'; x.fillRect(-1, BASE - RY - 10, 2, 2);
  if (o.label !== false) text(x, 'GALLERIA', 0, -16, 'rgba(255,217,165,.6)', 7, '600');
}
