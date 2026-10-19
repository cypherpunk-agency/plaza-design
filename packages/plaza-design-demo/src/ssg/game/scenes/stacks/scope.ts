/**
 * The stacks' own panel: STS-2's camera, looking straight down from the
 * trolley on blocks A, B and C. Every container's roof carries its code, too
 * small to read until you zoom; TAG FOR LIFT gives STS-2 the slot under the
 * crosshair (only 0451's is on tonight's schedule). Reefers wear frost on their
 * roofs; 0451, warm inside, does not. The boxes and every word come from
 * stacks.json (`camera`, `texts`); the look is this file's.
 *
 * The CSS is the yard camera's (`.cam`, `.cam-feed`, `.cam-btns`, render.tsx).
 */

import { button, el, type PanelFn } from "../../engine/panels";

/** Slots that hold reefers (white roofs, a unit at one end). 0451's is one of them. */
const REEFERS = new Set(['A-4', 'B-5', 'B-6', 'C-2', 'C-7']);
/** Roof paints for the dry boxes: faded, earthy, none cyan. */
const PAINT = ['#6a2a12', '#24484a', '#5a1a20', '#5a4a14', '#2e4a26', '#3a3a48', '#4e3020', '#585048'];

export const scopePanel: PanelFn = ({ body, m, say, frame }) => {
  body.classList.add('cam');
  const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
  const btns = el('div', 'cam-btns');
  body.append(c, btns);
  const W = 320, H = 150;
  const boxes = m.data.camera?.crates ?? [];
  const mine = () => m.get('box') as string;
  /** 0451 still in its slot (it leaves the picture once lifted). */
  const home = () => m.get('boxAt') === 'stack' || m.get('boxAt') === 'air';
  let s = 1, ox = 0, oy = 0, zoom = 1, focus = { x: 160, y: 75 }, cross = { x: 160, y: 66 }, aim = { x: 160, y: 66 };
  const under = (p: { x: number; y: number }) => boxes.find((k) => (k.id !== mine() || home()) && p.x >= k.x - 2 && p.x <= k.x + k.w + 2 && p.y >= k.y - 2 && p.y <= k.y + k.h + 2);
  const fit = () => {
    const d = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(c.clientWidth * d)); c.height = Math.max(1, Math.round(c.clientHeight * d));
    s = Math.min(c.width / W, c.height / H); ox = (c.width - W * s) / 2; oy = (c.height - H * s) / 2;
  };
  c.addEventListener('pointerdown', (e) => {
    const r = c.getBoundingClientRect(), d = c.width / r.width;
    const vx = ((e.clientX - r.left) * d - ox) / s, vy = ((e.clientY - r.top) * d - oy) / s;
    aim = { x: (vx - 160) / zoom + focus.x, y: (vy - 75) / zoom + focus.y };
  });
  btns.append(
    button(m.label('scope.zoom'), 'hack-btn', () => {
      if (zoom > 1) { zoom = 1; focus = { x: 160, y: 75 }; return say(m.line('scope.zoom.out')); }
      const k = under(cross);
      zoom = 3; focus = { ...cross };
      if (!k) return say(m.line('scope.zoom.ground'));
      say(m.line(k.id === mine() ? 'scope.zoom.found' : 'scope.zoom.box', { id: k.id, label: k.label }));
    }),
    button(m.label('scope.tag'), 'hack-btn', () => {
      if (!home()) return say(m.line('scope.tag.done'));
      const k = under(cross);
      if (!k) return say(m.line('scope.tag.none'));
      if (k.id !== mine()) return say(m.line('scope.tag.wrong', { id: k.id, label: k.label }));
      const command=m.data.camera?.actions?.tagOwned;
      const result=command?m.runCommand(command):{ok:false,reason:'unknown-command'} as const;
      if(!result.ok)return say(m.line('scope.tag.refused',{reason:result.reason,id:k.id}));
      say(m.line('scope.tag.ok', { id: k.id }));
    }),
  );

  /** A container's roof, seen from above: corrugation, corner castings, its code stencilled small. */
  const roof = (k: (typeof boxes)[number], i: number, t: number) => {
    const reefer = REEFERS.has(k.id), warm = k.id === mine();
    g.fillStyle = reefer ? '#c8c4b8' : PAINT[i % PAINT.length]; g.fillRect(k.x, k.y, k.w, k.h);
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let x = k.x + 3; x < k.x + k.w - 2; x += 3) g.fillRect(x, k.y + 1, 1, k.h - 2);
    g.strokeStyle = reefer ? '#f2eee4' : 'rgba(255,217,165,.55)'; g.lineWidth = 0.6; g.strokeRect(k.x + 0.3, k.y + 0.3, k.w - 0.6, k.h - 0.6);
    g.fillStyle = 'rgba(255,217,165,.5)'; for (const [dx, dy] of [[0, 0], [k.w - 2, 0], [0, k.h - 2], [k.w - 2, k.h - 2]]) g.fillRect(k.x + dx, k.y + dy, 2, 2);
    if (reefer) {
      // the refrigeration unit at one end, its fan turning
      g.fillStyle = '#5a5a5e'; g.fillRect(k.x + k.w - 7, k.y + 2, 5, k.h - 4);
      const a = t / (warm ? 90 : 160);
      g.strokeStyle = '#2a2a2e'; g.beginPath(); g.moveTo(k.x + k.w - 4.5 + Math.cos(a) * 2, k.y + k.h / 2 + Math.sin(a) * 2); g.lineTo(k.x + k.w - 4.5 - Math.cos(a) * 2, k.y + k.h / 2 - Math.sin(a) * 2); g.stroke();
      // frost on the cold ones; 0451 is warm inside, so none (and the rain steams off it)
      if (!warm) { g.fillStyle = 'rgba(235,245,255,.55)'; for (let j = 0; j < 9; j++) g.fillRect(k.x + 3 + ((j * 13 + i * 5) % (k.w - 12)), k.y + 2 + ((j * 7) % (k.h - 4)), 1, 1); }
      else { g.fillStyle = 'rgba(235,240,245,' + (0.06 + 0.04 * Math.sin(t / 300)) + ')'; g.fillRect(k.x + 4, k.y + 1, k.w - 12, k.h - 2); }
    }
    // the code, stencilled: at ×1 the camera only resolves smudges; at ×3 it reads
    g.fillStyle = reefer ? '#1a1410' : '#ffd9a5';
    if (zoom > 1) { g.font = '600 2.6px "IBM Plex Mono", monospace'; g.fillText(k.label, k.x + 3, k.y + k.h / 2 + 1); }
    else { g.globalAlpha = 0.55; for (let j = 0; j < 4; j++) g.fillRect(k.x + 3 + j * 6, k.y + k.h / 2 - 1, 4 + ((i + j) % 2), 1.4); g.globalAlpha = 1; }
  };

  let fitted = false;
  frame((t) => {
    if (!fitted || c.width !== Math.round(c.clientWidth * (window.devicePixelRatio || 1))) { fit(); fitted = true; }
    cross.x += (aim.x - cross.x) * 0.2; cross.y += (aim.y - cross.y) * 0.2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(s * zoom, 0, 0, s * zoom, ox + s * (160 - focus.x * zoom), oy + s * (75 - focus.y * zoom));
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    // wet asphalt, lane lines, the block letters painted on the ground
    g.fillStyle = '#0c0a0a'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(232,200,58,.35)'; for (let x = 0; x < W; x += 12) g.fillRect(x, 112, 7, 1);
    g.fillStyle = 'rgba(255,217,165,.18)'; g.fillRect(0, 22, W, 1); g.fillRect(0, 106, W, 1);
    g.font = '600 9px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,217,165,.35)';
    for (const [l, x] of [['A', 48], ['B', 152], ['C', 256]] as [string, number][]) g.fillText(l, x, 18);
    // the quay at the bottom: the chassis lane and the water's edge
    g.fillStyle = '#04060c'; g.fillRect(0, 134, W, 16);
    g.fillStyle = 'rgba(170,210,255,.12)'; for (let x = (t / 40) % 20; x < W; x += 20) g.fillRect(x, 140 + Math.sin(x) * 2, 8, 1);
    boxes.forEach((k, i) => { if (k.id !== mine() || home()) roof(k, i, t); else { g.fillStyle = '#060504'; g.fillRect(k.x, k.y, k.w, k.h); g.strokeStyle = 'rgba(255,217,165,.25)'; g.setLineDash([1.5, 1.5]); g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1); g.setLineDash([]); } });
    // a straddle carrier crossing the lane, seen from above: four legs and a frame
    const sc = ((t / 30) % (W + 60)) - 30;
    g.fillStyle = '#c8641e'; g.fillRect(sc, 114, 26, 3); g.fillRect(sc, 126, 26, 3); g.fillStyle = '#2a2624'; g.fillRect(sc + 2, 117, 22, 9);
    // a gull on a roof
    g.fillStyle = '#e8e4dc'; g.fillRect(230, 52, 3, 2); g.fillStyle = '#e8b030'; g.fillRect(233, 52, 1, 1);
    // the tag: STS-2's target
    if (m.get('found') && home()) {
      const k = boxes.find((b) => b.id === mine());
      if (k) { g.strokeStyle = '#ff3df2'; g.lineWidth = 0.8; g.setLineDash([2, 2]); g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
    }
    // scanlines
    g.fillStyle = 'rgba(0,255,255,0.04)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
    g.restore();
    const k = under(cross), r = 8 / zoom;
    g.strokeStyle = k ? '#00ffff' : 'rgba(0,255,255,.6)'; g.lineWidth = 1 / zoom;
    g.beginPath(); g.arc(cross.x, cross.y, r, 0, 7);
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.moveTo(cross.x + a * r * 0.5, cross.y + b * r * 0.5); g.lineTo(cross.x + a * r * 1.8, cross.y + b * r * 1.8); }
    g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const fs = Math.round(11 * (window.devicePixelRatio || 1));
    g.font = fs + 'px "IBM Plex Mono", monospace';
    g.fillStyle = Math.floor(t / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText(m.label('scope.hud') + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
    g.fillStyle = '#00ffff'; g.fillText(k ? m.label('scope.on', { id: k.id }) : m.label('scope.aim'), ox + fs * 0.6, oy + fs * 2.8);
  });
};
