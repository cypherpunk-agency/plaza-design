import type { AssetDefinition } from '../core/composition';
/**
 * How a proposal scene (a style frame, authoring/proposal-scenes.ts) uses its base scene. Logic layer;
 * draws nothing. Without it, or with `use: play`, the proposal plays as its base scene and must carry
 * every piece the base's manifest names (its devices, people, exits). With `use: look` it takes only
 * the base's look: sky, weather, the district's climate and time, facing and the base's typed lamps,
 * and none of its gameplay; `width` is then the frame's width. Shipping scenes ignore it.
 */
export const SCENE_BASE = 'scene.base';
export const sceneBaseElement: AssetDefinition = {
  type: SCENE_BASE, version: 1, label: 'Base scene use (style frames)', category: 'scene', parts: [],
  fields: {
    use: { kind: 'select', label: 'Use of the base scene (look: sky, weather and light only; play: its gameplay too)', options: ['look', 'play'], default: 'look' },
    width: { kind: 'number', label: 'Frame width (look)', default: 1600, min: 240, max: 10000, step: 1, unit: 'units', showIf: p => p.use !== 'play' },
  },
  bounds: () => ({ x: -6, h: 0, w: 12, tall: 12 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
