/**
 * The yard's own panel: looking through CAM-1. Tap to aim, zoom to read the
 * small print on the crates; zooming onto the parcel's crate finds it.
 * The crates and every word come from yard.json (`camera`, `texts`).
 */

import { button, el, type PanelFn } from '../engine/panels';

export const cameraPanel: PanelFn = ({ body, m, say, frame }) => {
  body.classList.add('cam');
  const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
  const btns = el('div', 'cam-btns');
  body.append(c, btns);
  const W = 320, H = 150;
  const crates = m.data.camera?.crates ?? [];
  let s = 1, ox = 0, oy = 0, zoom = 1, focus = { x: 160, y: 75 }, cross = { x: 160, y: 80 }, aim = { x: 160, y: 80 };
  const tags = new Set<string>();
  const hud = m.label('cam.hud'), aimText = m.label('cam.aim');
  const pan = () => (m.get('pan') as number) * 40;
  const under = (p: { x: number; y: number }) => crates.find((k) => p.x >= k.x - pan() - 3 && p.x <= k.x - pan() + k.w + 3 && p.y >= k.y - 3 && p.y <= k.y + k.h + 3);
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
    button(m.label('cam.zoom'), 'hack-btn', () => {
      const k = under(cross);
      if (zoom === 1) {
        zoom = 3; focus = { ...cross };
        if (!k) return say(m.line('cam.zoom.gravel'));
        const mine = k.id === m.get('parcel');
        say(m.line(mine ? 'cam.zoom.parcel' : 'cam.zoom.crate', { id: k.id, label: k.label.toLowerCase() }));
        // found: the first time you read your own name on a crate
        if (mine && !m.get('found')) { m.set('found', true); m.goal('find'); m.changed(); }
      } else { zoom = 1; focus = { x: 160, y: 75 }; say(m.line('cam.zoom.out')); }
    }),
    button(m.label('cam.tag'), 'hack-btn', () => {
      const k = under(cross);
      if (!k) return say(m.line('cam.tag.none'));
      tags.add(k.id); say(m.line('cam.tag.ok', { id: k.id }));
    }),
  );
  let fitted = false;
  frame((t) => {
    if (!fitted || c.width !== Math.round(c.clientWidth * (window.devicePixelRatio || 1))) { fit(); fitted = true; }
    cross.x += (aim.x - cross.x) * 0.2; cross.y += (aim.y - cross.y) * 0.2;
    const dx = pan();
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(s * zoom, 0, 0, s * zoom, ox + s * (160 - focus.x * zoom), oy + s * (75 - focus.y * zoom));
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#140818'; g.fillRect(-dx, 20, 90, 80); g.fillRect(200 - dx, 10, 140, 90);
    g.fillStyle = '#1d0e05'; g.fillRect(0, 126, W, 24);
    for (const k of crates) {
      const x = k.x - dx;
      g.fillStyle = '#6a3f12'; g.fillRect(x, k.y, k.w, k.h); g.strokeStyle = '#c98a3f'; g.lineWidth = 1; g.strokeRect(x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
      g.fillStyle = '#ffd9a5'; g.fillRect(x + 4, k.y + 4, 22, 9);
      g.fillStyle = '#1d0e05'; g.font = '600 7px "IBM Plex Mono", monospace'; g.fillText(k.id, x + 6, k.y + 11);
      g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = '#ffd9a5'; g.fillText(k.label, x + 3, k.y + k.h - 4);
      if (tags.has(k.id)) { g.strokeStyle = '#ff3df2'; g.setLineDash([2, 2]); g.strokeRect(x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
    }
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
    g.fillStyle = Math.floor(t / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText(hud + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
    g.fillStyle = '#00ffff'; g.fillText(k ? m.label('cam.on', { id: k.id }) : aimText, ox + fs * 0.6, oy + fs * 2.8);
  });
};
