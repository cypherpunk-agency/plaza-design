/**
 * Downtown's camera: looking through CAM-3 (engine/camera-panel.ts).
 * Tap the feed to aim; ZOOM reads what is under the crosshair, TAG marks it,
 * LOOP plays the footage back, which raises the lens's `frame` event: wire
 * that to the billboard and the street gets Pigeon TV.
 * What it can see and every word come from downtown.json (`camera`, `texts`);
 * the picture is art/assemblies/street-camera-feed.ts.
 */

import { drawStreetCameraFeed } from '../../art/assemblies/street-camera-feed';
import { cameraPanel, registerCameraPainter, zoomButton } from '../../engine/camera-panel';
import { cameraFeed, cameraLoop } from '../../engine/controllers/camera-bindings';

registerCameraPainter('downtown.street', (g, { m, things, t, tags }) => {
  drawStreetCameraFeed(g, things, t, cameraFeed(m), tags);
  g.textAlign = 'left';
});

export const cam3Panel = cameraPanel({
  painter: 'downtown.street',
  texts: 'cam',
  buttons: [
    zoomButton('cam.zoom', 'cam.zoom.out', (k, { m, say }) => say(m.line(k ? 'cam.zoom.' + k.id : 'cam.zoom.wall'))),
    {
      label: 'cam.tag',
      press: ({ m, say, under, tag }) => {
        const k = under();
        if (!k) return say(m.line('cam.tag.none'));
        tag(k.id);
        say(m.line(('cam.tag.' + k.id) in m.texts ? 'cam.tag.' + k.id : 'cam.tag.ok', { id: k.id }));
      },
    },
    // the same as the lens's `loop` verb: its `frame` event goes wherever it is wired
    { label: 'cam.loop', when: (m) => !!m.data.camera?.bindings?.loop, press: ({ m }) => cameraLoop(m) },
  ],
});
