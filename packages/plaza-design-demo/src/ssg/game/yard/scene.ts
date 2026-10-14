/**
 * The back yard on the canvas: the fixer's yard behind the noodle stall.
 * World units match the street: x along the yard, h above the ground.
 */

import { SLIDE_MS, type YardModel } from './model';

export const YARD_W = 760;
export const YARD_SPAWN = 48;
export const YARD_EXIT_X = 18;
export const TRAY_X = 668;

const SLOT: Record<string, number> = { home: 350, 'A-3': 290, 'B-5': 350, 'C-7': 410, chute: 452 };
const CHUTE = { x0: 452, h0: 40, x1: 604, h1: 14 };

/** Where each device stands, for tapping and for the E prompt. */
export interface Spot { id: string; x: number; w: number; h: number }
export function spots(m: YardModel): Spot[] {
  const list: Spot[] = [
    { id: 'cam', x: 90, w: 26, h: 86 },
    { id: 'bench', x: 170, w: 50, h: 30 },
    { id: 'crane', x: 350, w: 186, h: 130 },
    { id: 'gate', x: 615, w: 36, h: 68 },
  ];
  craftedIds(m).forEach((id, i) => list.push({ id, x: craftedX(i), w: 20, h: 18 }));
  return list;
}
export const craftedIds = (m: YardModel) => [...m.devices.values()].filter((d) => d.crafted).map((d) => d.id);
const craftedX = (i: number) => 482 + i * 28;

export function spotAt(m: YardModel, wx: number, h: number): string | null {
  const hit = spots(m).filter((s) => Math.abs(wx - s.x) <= s.w / 2 + 3 && h >= -4 && h <= s.h + 4);
  // the crane's frame is big; prefer smaller things standing in front of it
  hit.sort((a, b) => a.w - b.w);
  return hit[0]?.id ?? null;
}

interface View { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number }
let hookX = SLOT.home;

export function drawYard(x: CanvasRenderingContext2D, m: YardModel, v: View, highlight: string | null) {
  const { sx, y, t } = v;
  const mono = (size: number, weight = '') => (weight ? weight + ' ' : '') + size + 'px "IBM Plex Mono", monospace';
  const text = (s: string, cx: number, cy: number, col: string, size = 7, weight = '') => {
    x.save(); x.font = mono(size, weight); x.textAlign = 'center'; x.fillStyle = col; x.fillText(s, cx, cy); x.restore();
  };
  const glow = (id: string, x0: number, top: number, w: number, h: number) => {
    if (highlight !== id) return;
    x.save(); x.strokeStyle = 'rgba(255,61,242,.85)'; x.shadowColor = 'rgba(255,61,242,.8)'; x.shadowBlur = 8;
    x.strokeRect(x0 - 3.5, top - 3.5, w + 7, h + 7); x.restore();
  };

  // back fence and the yard sign
  x.strokeStyle = 'rgba(194,65,12,.35)';
  for (let wx = 0; wx < YARD_W; wx += 12) { const s = sx(wx); if (s < -2 || s > v.viewW + 2) continue; x.beginPath(); x.moveTo(s + 0.5, y(0)); x.lineTo(s + 0.5, y(92)); x.stroke(); }
  x.beginPath(); x.moveTo(sx(0), y(92) + 0.5); x.lineTo(sx(YARD_W), y(92) + 0.5); x.stroke();
  text("FIXER'S YARD · NO LOGS KEPT", sx(230), y(100), 'rgba(255,136,0,.75)', 8, '600');
  text('< DOWNTOWN', sx(YARD_EXIT_X + 22), y(60), 'rgba(0,255,255,.85)', 8, '600');

  // CAM-1 on its pole
  const cx = sx(90);
  x.fillStyle = '#2a1405'; x.fillRect(cx - 1, y(72), 3, 72);
  x.fillStyle = '#1a0c04'; x.fillRect(cx - 12, y(84), 24, 12); x.strokeStyle = 'rgba(255,217,165,.5)'; x.strokeRect(cx - 11.5, y(84) + 0.5, 23, 11);
  x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(255,42,68,.95)' : 'rgba(255,42,68,.3)'; x.fillRect(cx - 9 + m.pan * 3, y(80), 3, 3);
  glow('cam', cx - 12, y(86), 24, 86);

  // workbench
  const bx = sx(170);
  x.fillStyle = '#3a1d0a'; x.fillRect(bx - 24, y(26), 48, 4); x.fillRect(bx - 22, y(22), 3, 22); x.fillRect(bx + 19, y(22), 3, 22);
  x.fillStyle = 'rgba(255,61,242,.6)'; x.fillRect(bx - 8, y(30), 6, 4); x.fillStyle = 'rgba(0,255,255,.6)'; x.fillRect(bx + 4, y(30), 6, 4);
  glow('bench', bx - 24, y(30), 48, 30);

  // crates under the crane
  (['A-3', 'B-5', 'C-7'] as const).forEach((id) => {
    const c = sx(SLOT[id]);
    x.fillStyle = '#5a3410'; x.fillRect(c - 13, y(22), 26, 22); x.strokeStyle = 'rgba(201,138,63,.9)'; x.strokeRect(c - 12.5, y(22) + 0.5, 25, 21);
    x.beginPath(); x.moveTo(c - 12, y(22)); x.lineTo(c + 12, y(0)); x.moveTo(c + 12, y(22)); x.lineTo(c - 12, y(0)); x.strokeStyle = 'rgba(40,20,5,.8)'; x.stroke();
    x.fillStyle = '#ffd9a5'; x.fillRect(c - 9, y(19), 18, 7); text(id, c, y(13.5), '#1d0e05', 6, '600');
  });

  // the crane: gantry, trolley, hook
  const g0 = sx(262), g1 = sx(438);
  x.fillStyle = '#4a2408'; x.fillRect(g0, y(128), 4, 128); x.fillRect(g1 - 4, y(128), 4, 128); x.fillRect(g0, y(128), g1 - g0, 5);
  hookX += (SLOT[m.armAt] - hookX) * 0.08;
  const hx = sx(hookX);
  x.fillStyle = '#ff8800'; x.fillRect(hx - 6, y(124), 12, 4);
  x.strokeStyle = 'rgba(201,168,127,.9)'; x.beginPath(); x.moveTo(hx + 0.5, y(120)); x.lineTo(hx + 0.5, y(66)); x.stroke();
  x.beginPath(); x.moveTo(hx - 5, y(66)); x.lineTo(hx - 5, y(62)); x.lineTo(hx + 5, y(62)); x.lineTo(hx + 5, y(66)); x.stroke();
  glow('crane', g0, y(128), g1 - g0, 128);

  // chute down to the hatch
  x.strokeStyle = 'rgba(255,136,0,.55)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(sx(CHUTE.x0), y(CHUTE.h0 - 4)); x.lineTo(sx(CHUTE.x1), y(CHUTE.h1 - 4)); x.stroke(); x.lineWidth = 1;
  x.fillStyle = '#2a1405'; x.fillRect(sx(CHUTE.x0) - 2, y(CHUTE.h0 - 4), 3, CHUTE.h0 - 4);

  // the hatch in the fence, HINGE's face on it
  const gx = sx(615), open = m.gateOpen();
  x.fillStyle = open ? '#000' : '#1d0e05'; x.fillRect(gx - 16, y(64), 32, 64);
  x.strokeStyle = open ? 'rgba(34,197,94,.9)' : 'rgba(255,136,0,.75)'; x.strokeRect(gx - 15.5, y(64) + 0.5, 31, 63);
  if (!open) { for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,136,0,.18)'; x.fillRect(gx - 14, y(60) + i * 15, 28, 2); } }
  text(open ? '◕‿◕' : m.gateAllowed ? '◔_◔' : '◔︵◔', gx, y(40), open ? 'rgba(34,197,94,.95)' : 'rgba(255,136,0,.95)', 9);
  glow('gate', gx - 16, y(64), 32, 64);

  // pickup tray past the hatch
  const tx = sx(TRAY_X);
  x.fillStyle = '#1a0c04'; x.fillRect(tx - 14, y(8), 28, 8); x.strokeStyle = 'rgba(34,197,94,.6)'; x.strokeRect(tx - 13.5, y(8) + 0.5, 27, 7);
  text('PICKUP', tx, y(12), 'rgba(34,197,94,.7)', 6);

  // things you crafted
  craftedIds(m).forEach((id, i) => {
    const c = sx(craftedX(i)), delay = id.startsWith('delay');
    x.fillStyle = '#160416'; x.fillRect(c - 8, y(14), 16, 14); x.strokeStyle = 'rgba(255,61,242,.85)'; x.strokeRect(c - 7.5, y(14) + 0.5, 15, 13);
    x.fillStyle = delay ? 'rgba(0,255,255,.9)' : 'rgba(255,210,63,.9)'; x.fillRect(c - 3, y(10), 6, 3 + (Math.floor(t / 20) % 2));
    glow(id, c - 8, y(14), 16, 14);
  });

  // the parcel
  const p = parcelPos(m);
  if (p) {
    const px = sx(p[0]);
    x.fillStyle = '#c98a3f'; x.fillRect(px - 7, y(p[1] + 10), 14, 10); x.strokeStyle = '#ffd9a5'; x.strokeRect(px - 6.5, y(p[1] + 10) + 0.5, 13, 9);
    x.fillStyle = '#6a3f12'; x.fillRect(px - 7, y(p[1] + 6), 14, 2);
  }
}

function parcelPos(m: YardModel): [number, number] | null {
  const a = m.parcelAt;
  if (a === 'A-3' || a === 'B-5' || a === 'C-7') return [SLOT[a], 22];
  if (a === 'hook') return [hookX, 51];
  if (a === 'chute') return [CHUTE.x0, CHUTE.h0];
  if (a === 'sliding') {
    const f = Math.min(1, (performance.now() - m.slideStart) / SLIDE_MS);
    return [CHUTE.x0 + (CHUTE.x1 - CHUTE.x0) * f, CHUTE.h0 + (CHUTE.h1 - CHUTE.h0) * f];
  }
  if (a === 'bounced') return [CHUTE.x1 - 4, CHUTE.h1];
  if (a === 'tray') return [TRAY_X, 8];
  return null;
}
