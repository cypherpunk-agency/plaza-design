/** Library puzzle dependency checks. Its connected-node goal observations live in devices.json. */

import type { SceneData } from "../../data/types";
import type { SceneRules } from "../../engine/rules";

/** The library's machines on its LAN, as net.json lists them: the ports and what they know. */
export const LIBRARY_PORTS = { reader: 'lan', printer: 'spool' } as const;


export const LIBRARY_RULES: SceneRules = {
  effects: {},
  needs: { state: ['renewed'], goals: ['lan'] },
  /** P16's own: the reader and the printer are LINKs that know their machine without a scan (the puzzle comes before scan.so). */
  check: (z: SceneData) => {
    const errs: string[] = [];
    for (const [dev, noun] of Object.entries(LIBRARY_PORTS)) {
      const n = z.devices.find((d) => d.id === dev)?.nouns.find((x) => x.id === noun);
      if (n?.kind !== 'LINK' || !n.link?.known?.length) errs.push(`devices[${dev}] › ${noun}: must be a LINK that knows its machine ("known"): P16 comes before scan.so`);
    }
    if (!z.nodes?.some((d) => d.nouns.some((n) => n.id === 'scan.so' && JSON.stringify(n.on ?? {}).includes('"give":"scan.so"')))) errs.push('nodes: something must give scan.so (P16\'s reward)');
    return errs;
  },
};
