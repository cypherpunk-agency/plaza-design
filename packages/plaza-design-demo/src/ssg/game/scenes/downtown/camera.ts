import { drawStreetCameraFeed } from '../../art/assemblies/street-camera-feed';
/**
 * Downtown's own panel: looking through CAM-3 (the yard's CAM-1 approach).
 * Tap the feed to aim; ZOOM reads what is under the crosshair, TAG marks it,
 * LOOP plays the footage back, which raises the lens's `frame` event: wire
 * that to the billboard and the street gets Pigeon TV.
 * What it can see and every word come from downtown.json (`camera`, `texts`).
 */

import { button, el, type PanelFn } from "../../engine/panels";



export const cam3Panel: PanelFn = ({ body, m, say, frame }) => {
  body.classList.add('cam');
  const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
  const btns = el('div', 'cam-btns');
  body.append(c, btns);
  const W = 320, H = 150;
  const things = m.data.camera?.crates ?? [];
  let s = 1, ox = 0, oy = 0, zoom = 1, focus = { x: 160, y: 75 }, cross = { x: 160, y: 80 }, aim = { x: 160, y: 80 };
  const tags = new Set<string>();
  const under = (p: { x: number; y: number }) => things.find((k) => p.x >= k.x - 3 && p.x <= k.x + k.w + 3 && p.y >= k.y - 3 && p.y <= k.y + k.h + 3);
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
      if (zoom > 1) { zoom = 1; focus = { x: 160, y: 75 }; say(m.line('cam.zoom.out')); return; }
      zoom = 3; focus = { ...cross };
      const k = under(cross);
      say(m.line(k ? 'cam.zoom.' + k.id : 'cam.zoom.wall'));
    }),
    button(m.label('cam.tag'), 'hack-btn', () => {
      const k = under(cross);
      if (!k) return say(m.line('cam.tag.none'));
      tags.add(k.id);
      say(m.line(('cam.tag.' + k.id) in m.texts ? 'cam.tag.' + k.id : 'cam.tag.ok', { id: k.id }));
    }),
    // the same as the lens's `loop` verb: its `frame` event goes wherever it is wired
    button(m.label('cam.loop'), 'hack-btn', () => m.act('cam3', 'lens', 'loop')),
  );
  let fitted = false;
  frame((t) => {
    if (!fitted || c.width !== Math.round(c.clientWidth * (window.devicePixelRatio || 1))) { fit(); fitted = true; }
    cross.x += (aim.x - cross.x) * 0.2; cross.y += (aim.y - cross.y) * 0.2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(s * zoom, 0, 0, s * zoom, ox + s * (160 - focus.x * zoom), oy + s * (75 - focus.y * zoom));
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    drawStreetCameraFeed(g, things, t, m.get('feed') === 'cam3', tags);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(0,255,255,.04)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
    g.restore();
    const k = under(cross), r = 8 / zoom;
    g.strokeStyle = k ? '#00ffff' : 'rgba(0,255,255,.6)'; g.lineWidth = 1 / zoom;
    g.beginPath(); g.arc(cross.x, cross.y, r, 0, 7);
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { g.moveTo(cross.x + a * r * 0.5, cross.y + b * r * 0.5); g.lineTo(cross.x + a * r * 1.8, cross.y + b * r * 1.8); }
    g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
    const fs = Math.round(11 * (window.devicePixelRatio || 1));
    g.font = fs + 'px "IBM Plex Mono", monospace';
    g.fillStyle = Math.floor(t / 600) % 2 ? '#ff2a44' : '#5a0a14'; g.fillText(m.label('cam.hud') + (zoom > 1 ? ' ×3' : ''), ox + fs * 0.6, oy + fs * 1.4);
    g.fillStyle = '#00ffff'; g.fillText(k ? m.label('cam.on', { id: k.id }) : m.label('cam.aim'), ox + fs * 0.6, oy + fs * 2.8);
  });
};
