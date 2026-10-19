/** Laundromat shared source owns washer start/stop, cycle deadlines, breaker reset,
 * counts, door selection, jacket rewards and completion communication.
 * Current checkpoint normalization is authored in the same shared source. */

import type { SceneRules } from "../../engine/rules";

/** The four washers, by device id, and their state keys. */
export const WASHERS = ['washer1', 'washer2', 'washer3', 'washer4'] as const;
/** What Moth's jacket holds: the maglev pass (an item you carry) and the right glove (a key chip). */
export const MAGLEV_PASS = 'maglev.pass';
export const RIGHT_GLOVE = 'glove.right';
/** The save flag for "P13 done": the jacket is out of washer 3. */
export const P13_FLAG = 'p13';

export const LAUNDROMAT_RULES: SceneRules = {
  effects: {},
  needs: {
    devices:[],
    state: [],
  },
};
