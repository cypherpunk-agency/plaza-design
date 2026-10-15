/**
 * The net's networks (NET.md, net.json `networks`): which networks you reach from where you are
 * plugged in, and what is on them. Pure: the model, the net map, the terminal and the build-time
 * check all ask the same question the same way.
 *
 * You reach a network when any one of its access rules holds:
 * - `{ port }`: you are plugged in at that LINK (`scene:device.noun`, up);
 * - `{ net }`: you reach that other network;
 * - `{ controlled }`: a node you control (its Registry label, `0x2F`) that you reach: it stands
 *   in the scene you are in (`standing`), or it is a machine of a network you reach. A controlled
 *   node is an access point: the networks behind it come with it.
 */

import type { AccessRule, MachineData, NetworkData } from '../data/types';

export interface Plug {
  /** The ports you are plugged in at: `scene:device.noun`. */
  ports: Iterable<string>;
  /** Your controlled nodes, by label. */
  controlled: readonly string[];
  /** A machine standing where you are (a device of this scene): a controlled one there is an access point. */
  standing?: (m: MachineData) => boolean;
}

/** The networks reached from a plug, in the order they were reached. */
export function reachNets(nets: readonly NetworkData[], plug: Plug): Set<string> {
  const ports = new Set(plug.ports), out = new Set<string>();
  const holds = (r: AccessRule) => {
    if ('port' in r) return ports.has(r.port);
    if ('net' in r) return out.has(r.net);
    if (!plug.controlled.includes(r.controlled)) return false;
    return nets.some((n) => n.machines.some((m) => m.node === r.controlled && (out.has(n.id) || !!plug.standing?.(m))));
  };
  for (let grew = true; grew;) {
    grew = false;
    for (const n of nets) if (!out.has(n.id) && n.from.some(holds)) { out.add(n.id); grew = true; }
  }
  return out;
}

/** The machines of some networks (once each, by `in`+`id`). */
export function machinesOf(nets: readonly NetworkData[], ids: Iterable<string>): MachineData[] {
  const want = new Set(ids), out: MachineData[] = [];
  for (const n of nets) if (want.has(n.id)) for (const m of n.machines) if (!out.includes(m)) out.push(m);
  return out;
}

/** The network a machine (in a scene) is on, if any. */
export const networkOf = (nets: readonly NetworkData[], scene: string, id: string) =>
  nets.find((n) => n.machines.some((m) => m.id === id && m.in.includes(scene)));

/** Networks one step from these (by a `net` rule either way, or a controlled node on them): the net map shows them as rumours. */
export function nextTo(nets: readonly NetworkData[], ids: Iterable<string>): Set<string> {
  const have = new Set(ids), out = new Set<string>();
  for (const n of nets) {
    if (have.has(n.id)) continue;
    const near = n.from.some((r) => ('net' in r && have.has(r.net))
      || ('controlled' in r && nets.some((o) => have.has(o.id) && o.machines.some((m) => m.node === r.controlled)))
      // a port on a machine of a network you know (FRIENDNET's link home)
      || ('port' in r && nets.some((o) => have.has(o.id) && o.machines.some((m) => r.port.startsWith(m.in.find((s) => r.port.startsWith(s + ':')) + ':' + m.id + '.')))))
      || nets.some((o) => have.has(o.id) && o.from.some((r) => 'net' in r && r.net === n.id));
    if (near) out.add(n.id);
  }
  return out;
}
