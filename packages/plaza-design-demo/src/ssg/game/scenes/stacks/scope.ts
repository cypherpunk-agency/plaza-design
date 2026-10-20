import {stacksState} from './rules';
/**
 * The stacks' camera: STS-2's scope (engine/camera-panel.ts), looking straight
 * down from the trolley on blocks A, B and C. Every container's roof carries
 * its code, too small to read until you zoom; TAG FOR LIFT gives STS-2 the
 * slot under the crosshair (only 0451's is on tonight's schedule). Reefers wear
 * frost on their roofs; 0451, warm inside, does not. The boxes, which slots
 * hold reefers (`camera.bindings.reefers`) and every word come from
 * stacks.json (`camera`, `texts`); the look is this file's.
 */

import type { SceneModel } from '../../engine/model';
import { cameraPanel, registerCameraPainter, zoomButton, type CameraView } from '../../engine/camera-panel';

/** Roof paints for the dry boxes: faded, earthy, none cyan. */
const PAINT = ['#6a2a12', '#24484a', '#5a1a20', '#5a4a14', '#2e4a26', '#3a3a48', '#4e3020', '#585048'];

const mine = (m: SceneModel) => stacksState(m, 'box') as string;
/** 0451 still in its slot (it leaves the picture once lifted). */
const home = (m: SceneModel) => stacksState(m, 'boxAt') === 'stack' || stacksState(m, 'boxAt') === 'air';

registerCameraPainter('stacks.roofs', (g, { m, things: boxes, zoom, t }: CameraView) => {
  const W = 320, H = 150;
  /** Slots that hold reefers (white roofs, a unit at one end). 0451's is one of them. */
  const reefers = new Set(m.data.camera?.bindings?.reefers ?? []);
  /** A container's roof, seen from above: corrugation, corner castings, its code stencilled small. */
  const roof = (k: (typeof boxes)[number], i: number) => {
    const reefer = reefers.has(k.id), warm = k.id === mine(m);
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
  // wet asphalt, lane lines, the block letters painted on the ground
  g.fillStyle = '#0c0a0a'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(232,200,58,.35)'; for (let x = 0; x < W; x += 12) g.fillRect(x, 112, 7, 1);
  g.fillStyle = 'rgba(255,217,165,.18)'; g.fillRect(0, 22, W, 1); g.fillRect(0, 106, W, 1);
  g.font = '600 9px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,217,165,.35)';
  for (const [l, x] of [['A', 48], ['B', 152], ['C', 256]] as [string, number][]) g.fillText(l, x, 18);
  // the quay at the bottom: the chassis lane and the water's edge
  g.fillStyle = '#04060c'; g.fillRect(0, 134, W, 16);
  g.fillStyle = 'rgba(170,210,255,.12)'; for (let x = (t / 40) % 20; x < W; x += 20) g.fillRect(x, 140 + Math.sin(x) * 2, 8, 1);
  boxes.forEach((k, i) => { if (k.id !== mine(m) || home(m)) roof(k, i); else { g.fillStyle = '#060504'; g.fillRect(k.x, k.y, k.w, k.h); g.strokeStyle = 'rgba(255,217,165,.25)'; g.setLineDash([1.5, 1.5]); g.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1); g.setLineDash([]); } });
  // a straddle carrier crossing the lane, seen from above: four legs and a frame
  const sc = ((t / 30) % (W + 60)) - 30;
  g.fillStyle = '#c8641e'; g.fillRect(sc, 114, 26, 3); g.fillRect(sc, 126, 26, 3); g.fillStyle = '#2a2624'; g.fillRect(sc + 2, 117, 22, 9);
  // a gull on a roof
  g.fillStyle = '#e8e4dc'; g.fillRect(230, 52, 3, 2); g.fillStyle = '#e8b030'; g.fillRect(233, 52, 1, 1);
  // the tag: STS-2's target
  if (stacksState(m, 'found') && home(m)) {
    const k = boxes.find((b) => b.id === mine(m));
    if (k) { g.strokeStyle = '#ff3df2'; g.lineWidth = 0.8; g.setLineDash([2, 2]); g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
  }
});

export const scopePanel = cameraPanel({
  painter: 'stacks.roofs',
  texts: 'scope',
  start: { x: 160, y: 66 },
  reach: 2,
  /** 0451 leaves the picture once lifted. */
  visible: (k, m) => k.id !== mine(m) || home(m),
  buttons: [
    zoomButton('scope.zoom', 'scope.zoom.out', (k, { m, say }) => {
      if (!k) return say(m.line('scope.zoom.ground'));
      say(m.line(k.id === mine(m) ? 'scope.zoom.found' : 'scope.zoom.box', { id: k.id, label: k.label }));
    }),
    {
      label: 'scope.tag',
      press: ({ m, say, under }) => {
        if (!home(m)) return say(m.line('scope.tag.done'));
        const k = under();
        if (!k) return say(m.line('scope.tag.none'));
        if (k.id !== mine(m)) return say(m.line('scope.tag.wrong', { id: k.id, label: k.label }));
        const command = m.data.camera?.actions?.tagOwned;
        const result = command ? m.runCommand(command) : { ok: false, reason: 'unknown-command' } as const;
        if (!result.ok) return say(m.line('scope.tag.refused', { reason: result.reason, id: k.id }));
        say(m.line('scope.tag.ok', { id: k.id }));
      },
    },
  ],
});
