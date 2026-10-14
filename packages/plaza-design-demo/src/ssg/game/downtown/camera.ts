/**
 * Downtown's own panel: looking through CAM-3 (the yard's CAM-1 approach).
 * Tap the feed to aim; ZOOM reads what is under the crosshair, TAG marks it,
 * LOOP plays the footage back, which raises the lens's `frame` event: wire
 * that to the billboard and the street gets Pigeon TV.
 * What it can see and every word come from downtown.json (`camera`, `texts`).
 */

import { button, el, type PanelFn } from '../zone/panels';

/** Morse for GHOST, the penthouse lamp's reminder (O03): 1 = on for a beat. */
const MORSE = '--. .... --- ... -'.split('').flatMap((c) => (c === '-' ? [1, 1, 1, 0] : c === '.' ? [1, 0] : [0, 0]));

export const cam3Panel: PanelFn = ({ body, m, say, frame }) => {
  body.classList.add('cam');
  const c = el('canvas', 'cam-feed'); const g = c.getContext('2d')!;
  const btns = el('div', 'cam-btns');
  body.append(c, btns);
  const W = 320, H = 150;
  const things = m.zone.camera?.crates ?? [];
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
    // the street from across the road: walls, the penthouse tower, the wet street
    g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#150a06'; g.fillRect(0, 10, 140, 116); g.fillRect(160, 0, 48, 126); g.fillRect(226, 40, 94, 86);
    g.strokeStyle = 'rgba(194,65,12,.5)'; g.lineWidth = 0.6; g.strokeRect(160.5, 0.5, 47, 126);
    g.fillStyle = '#1d0e05'; g.fillRect(0, 126, W, 24);
    for (const k of things) {
      if (k.id === 'billboard') {
        const tv = m.get('feed') === 'cam3';
        g.fillStyle = tv ? '#0c1414' : '#1a0710'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(255,90,110,.8)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
        g.font = '600 9px "IBM Plex Mono", monospace'; g.textAlign = 'center';
        g.fillStyle = tv ? 'rgba(0,255,255,.8)' : 'rgba(255,90,110,.95)';
        g.fillText(tv ? '● CAM-3' : 'REGISTRY PREMIUM', k.x + k.w / 2, k.y + 16);
        g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,217,165,.8)';
        g.fillText('Terms: forever. Cancellation: see Terms. The password is NOT pigeon.', k.x + k.w / 2, k.y + k.h - 5);
      } else if (k.id === 'window') {
        const beat = Math.floor(t / 260) % (MORSE.length + 6);
        g.fillStyle = (MORSE[beat] ?? 0) ? 'rgba(255,217,165,.95)' : 'rgba(40,24,10,1)'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(194,65,12,.8)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
      } else if (k.id === 'pigeon') {
        const bob = Math.round(Math.sin(t / 300) * 1);
        g.fillStyle = '#8a8f9a'; g.fillRect(k.x + 3, k.y + 4 + bob, 9, 6); g.fillRect(k.x + 10, k.y + 2 + bob, 4, 4);
        g.fillStyle = '#ffd25a'; g.fillRect(k.x + 14, k.y + 3 + bob, 2, 1);
        g.fillStyle = '#5a5f6a'; g.fillRect(k.x + 5, k.y + 10, 1, 2); g.fillRect(k.x + 9, k.y + 10, 1, 2);
      } else {
        g.fillStyle = '#050201'; g.fillRect(k.x, k.y, k.w, k.h);
        g.strokeStyle = 'rgba(255,136,0,.6)'; g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
        g.font = '600 7px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,61,242,.9)';
        g.fillText(k.label, k.x + k.w / 2, k.y - 3);
      }
      if (tags.has(k.id)) { g.strokeStyle = '#ff3df2'; g.setLineDash([2, 2]); g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
    }
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
