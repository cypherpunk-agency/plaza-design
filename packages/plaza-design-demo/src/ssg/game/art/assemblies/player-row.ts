import { PLAYER_ROW, type Element } from '../core/composition';
/** The player: where the player and engine-drawn walkers sit in the playfield's draw order, and its
 * position is where the player arrives (a scene manifest's spawn). The engine draws the figure. */
export const playerRowElement: Element = {
  type: PLAYER_ROW, version: 1, label: 'Player', category: 'scene', parts: [], role: 'player', fields: {},
  bounds: () => ({ x: -8, h: 42, w: 16, tall: 42 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
