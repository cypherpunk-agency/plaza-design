/**
 * Mechanism `streetCamera` (scene.json `stage.mechanisms`): Downtown's camera, looking through CAM-3
 * (engine/camera-panel.ts). Tap the feed to aim; ZOOM reads what is under the crosshair, TAG marks
 * it, LOOP plays the footage back, which raises the lens's `frame` event: wire that to the
 * billboard and the street gets Pigeon TV.
 * What it can see and every word come from devices.json (`camera`, `texts`);
 * the picture is art/assemblies/street-camera-feed.ts.
 */

import { drawStreetCameraFeed } from '../../../art/assemblies/street-camera-feed';
import { cameraPanel, registerCameraPainter, zoomButton } from '../../camera-panel';
import { cameraFeed, cameraLoop } from '../../controllers/camera-bindings';
import type { SceneRules } from '../../rules';
import type { SceneData } from '../../../data/types';
import type { SceneMechanism } from '../scene-mechanisms';

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

/** The camera's words (the panel's texts) and what the crosshair needs. */
const RULES: SceneRules = {
  effects: {},
  panels: ['cam3'],
  needs: {
    texts: {
      'cam.zoom': 'label', 'cam.tag': 'label', 'cam.loop': 'label', 'cam.hud': 'label', 'cam.on': 'label', 'cam.aim': 'label',
      'cam.zoom.wall': 'line', 'cam.zoom.out': 'line', 'cam.tag.none': 'line', 'cam.tag.ok': 'line',
    },
  },
  /** CAM-3 needs things to look at, and a word for each. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    if (!z.camera?.crates.length) errs.push('camera: CAM-3 needs things under its crosshair ("crates")');
    for (const c of z.camera?.crates ?? []) if (!(('cam.zoom.' + c.id) in z.texts)) errs.push(`texts: missing "cam.zoom.${c.id}" (what CAM-3 says zoomed onto ${c.id})`);
    return errs;
  },
};

export const streetCamera: SceneMechanism = {
  face: {function: 'sense'},
  label: 'CAM-3 (the street camera: aim, zoom, tag, loop)', requires: [], world: false,
  rulesShape: () => RULES,
  apply: () => ({ rules: RULES, panels: { cam3: cam3Panel } }),
};
