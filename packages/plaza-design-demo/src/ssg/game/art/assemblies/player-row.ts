import {fixedGeometry} from '../core/spatial';
import { PLAYER_ROW, type AssetDefinition } from '../core/composition';
/** The player: where the player and engine-drawn walkers sit in the playfield's draw order, and its
 * position is where the player arrives (a scene manifest's spawn). The engine draws the figure. */
export const playerRowElement: AssetDefinition = {
  spatial:fixedGeometry('This non-drawing row locates the player in native paint order and supplies the spawn anchor. Character proportions come from the player kit, not this marker.'),
  type: PLAYER_ROW, version: 1, label: 'Player', category: 'scene', parts: [], role: 'player', fields: {},
  bounds: () => ({ x: -8, h: 42, w: 16, tall: 42 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
