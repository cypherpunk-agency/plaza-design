import { PLAYER_ROW, type Element } from '../core/composition';
/** Marks where the player and engine-drawn walkers sit in a layered scene's playfield. Draws nothing itself. */
export const playerRowElement: Element = {
  type: PLAYER_ROW, version: 1, label: 'Player', category: 'scene', parts: [], role: 'player', fields: {},
  bounds: () => ({ x: 0, h: 0, w: 0, tall: 0 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
