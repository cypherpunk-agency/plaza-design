/**
 * The yard's camera: looking through CAM-1 (engine/camera-panel.ts). Tap to
 * aim, zoom to read the small print on the crates; zooming onto the parcel's
 * crate finds it. The crates and every word come from yard.json (`camera`,
 * `texts`); the picture (the approach, panned by the gate) is this file's.
 */

import { cameraPanel as sharedCameraPanel, registerCameraPainter, zoomButton } from '../../engine/camera-panel';
import { cameraPan, cameraParcel } from '../../engine/controllers/camera-bindings';

registerCameraPainter('yard.approach', (g, { m, things, tags }) => {
  const dx = cameraPan(m), W = 320, H = 150;
  g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#140818'; g.fillRect(-dx, 20, 90, 80); g.fillRect(200 - dx, 10, 140, 90);
  g.fillStyle = '#1d0e05'; g.fillRect(0, 126, W, 24);
  for (const k of things) {
    const x = k.x - dx;
    g.fillStyle = '#6a3f12'; g.fillRect(x, k.y, k.w, k.h); g.strokeStyle = '#c98a3f'; g.lineWidth = 1; g.strokeRect(x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
    g.fillStyle = '#ffd9a5'; g.fillRect(x + 4, k.y + 4, 22, 9);
    g.fillStyle = '#1d0e05'; g.font = '600 7px "IBM Plex Mono", monospace'; g.fillText(k.id, x + 6, k.y + 11);
    g.font = '2.6px "IBM Plex Mono", monospace'; g.fillStyle = '#ffd9a5'; g.fillText(k.label, x + 3, k.y + k.h - 4);
    if (tags.has(k.id)) { g.strokeStyle = '#ff3df2'; g.setLineDash([2, 2]); g.strokeRect(x - 2, k.y - 2, k.w + 4, k.h + 4); g.setLineDash([]); }
  }
});

export const cameraPanel = sharedCameraPanel({
  painter: 'yard.approach',
  texts: 'cam',
  offset: cameraPan,
  buttons: [
    zoomButton('cam.zoom', 'cam.zoom.out', (k, { m, say }) => {
      if (!k) return say(m.line('cam.zoom.gravel'));
      const mine = k.id === cameraParcel(m);
      say(m.line(mine ? 'cam.zoom.parcel' : 'cam.zoom.crate', { id: k.id, label: k.label.toLowerCase() }));
      // found: the first time you read your own name on a crate
      if (mine && m.data.camera?.actions?.inspectOwned) m.runCommand(m.data.camera.actions.inspectOwned);
    }),
    {
      label: 'cam.tag',
      press: ({ m, say, under, tag }) => {
        const k = under();
        if (!k) return say(m.line('cam.tag.none'));
        tag(k.id); say(m.line('cam.tag.ok', { id: k.id }));
      },
    },
  ],
});
