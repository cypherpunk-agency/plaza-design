/**
 * The public library's code side (P16 Long overdue). Everything else is data/library.json on the
 * engine: the card reader and the printer are ports onto the LIBRARY LAN (net.json), each knowing
 * one machine (`known`: no scan.so needed), the printer's stuck job names the borrower's staff card,
 * SOFTWARE LENDING's login takes it, and renewing the loan gives `scan.so`. What is left here is the
 * one goal only the code can see: you are on the LAN (CATALOG or LENDING connected).
 *
 * Pure: no DOM, so node can run it (the build's check).
 */

import type { SceneData } from '../data/types';
import type { SceneRules, World } from '../engine/rules';

/** The library's machines on its LAN, as net.json lists them: the ports and what they know. */
export const LIBRARY_PORTS = { reader: 'lan', printer: 'spool' } as const;

function tick(w: World) {
  const m = w.m;
  if (m.net.get('catalog') === 'connected' || m.net.get('lending') === 'connected') w.goal('lan');
}

export const LIBRARY_RULES: SceneRules = {
  effects: {},
  tick,
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
