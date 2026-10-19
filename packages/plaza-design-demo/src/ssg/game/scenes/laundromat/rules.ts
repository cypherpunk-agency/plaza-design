/** Laundromat shared source owns washer start/stop, cycle deadlines, breaker reset,
 * counts, door selection, jacket rewards and completion communication.
 * Current checkpoint normalization is authored in the same shared source. */

import type { SceneData } from "../../data/types";
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
    state: ['w1', 'w2', 'w3', 'w4', 'breaker', 'trips', 'jacket'],
    goals: ['run', 'jacket'],
    texts: {},
  },
  /** Washer events and controller tuning; default cable topology is authored content. */
  check: (z: SceneData) => {
    const errs: string[] = [];
    for (const d of WASHERS) {
      const dev = z.devices.find((x) => x.id === d);
      if (!dev?.nouns.some((n) => n.id === 'drum' && n.events?.includes('done'))) errs.push(`devices[${d}]: needs a "drum" noun that raises "done" (P13)`);
    }
    return errs;
  },
};
