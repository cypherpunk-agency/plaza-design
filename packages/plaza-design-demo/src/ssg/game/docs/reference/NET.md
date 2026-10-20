# ACCESS DENIED: the net

> The [progression concept](../design/PROGRESSION-CONCEPT.md) (2026-10-16) proposes staged hacking interfaces, discovery and logic tools, with remote presence later. This is not implemented; the network rules and built-state notes below describe the current iteration.

Working design (Tommi, from 2026-10-15), still open to revision. "As built" below describes
current code; later ideas are proposals. See README.md for the documentation map.

Currently the net is not a place you walk through: you connect through
networks **on the board**, and **where you plug in decides what you can reach**.

## Networks

A network is a group of machines with its own **access rule**: from which physical ports (or
controlled nodes) it can be reached.

| Network | Reached from |
| --- | --- |
| Home (Capsule 7B) | your PC |
| The library's LAN | inside the library only |
| The public net (street boxes, ads, metro timetables, cameras) | any public port, a street box you control |
| FRIENDNET | the public net |
| The Galleria's retail net | a port in the Galleria, or a node you control there |
| NEOBANK | the public net, then its gateway |
| The Registry | through the public net's boxes, layer by layer |
| Corporate nets (Plaza Holdings) | air-gapped: from inside the building only |
| The Ghosts' mesh | from nodes you control |

## Controlled nodes

What used to be "freeing a node" is now **taking control** of it: a Registry device you hacked
(the junction box 0x2F, the relay 0x31, the billboard 0x3C, …) answers to you. A **controlled
node is an access point**: its networks are reachable from anywhere you can reach it. Your
controlled nodes are where the Ghosts' mesh starts, and how your reach grows. Saves: the list
is `controlled` (saves reset, no migration).

## Programs

You start with nothing and earn programs (`.so` modules) over time:

1. **`scan.so`** (the library, the first hacking job): find the machines reachable from where you
   are plugged in, and connect to them. Until you own it, LINK nouns don't scan or connect.
2. Later: `sniff` (listen on a network), `spoof` (wear someone else's identity), `decrypt` (the
   lock toys), `proxy` (slower trace), `worm`. Where each is earned: with Act II.

### Existing scanner binding in the editor

`net.json.scanProgram` names the program that grants the existing scanner capability, or is
`null` to disable that capability. The shipping binding remains `scan.so`. Edit it through
**World → Networks → Scanner program**. It must reference a registered program; owning a
similarly named file does not grant access. Known-node connections retain their existing rules.
The device model, runtime NET access, acquisition announcement, net-map header and terminal
manual use the same binding. New scene/Play starting states use the pending binding; existing
starting states keep their explicitly authored inventory.

Program distribution, story guidance and starting-state inventory are separate authored
references. Rebind or remove those references in the same grouped edit before deleting a
program. Network and program entries have no protected historical-ID list. Dangling references
reject the edit atomically; Undo, bundles and protected Save use the ordinary document system.
No save-format translation or second persisted ability state is involved.

## The NET button and the net map

- **NET** in hack vision's bar (EXIT, BOARD, LOGIC, NET, UNFOLD) and the **N** key; it appears
  once you own `scan.so` (pinged the first time).
- It opens the **net map**, full screen like the city map: the networks and machines you have
  found, how they link, where you are plugged in now, your controlled nodes. Picking a reachable
  machine brings it onto your board; one you can't reach says what kind of place you would need
  to plug in from.

## The library (first hacking job)

On Downtown's street, right after Capsule 7B: Capsule 7B → the library → Downtown's net
puzzles. The books were digitized years ago; the building is kept for the chairs. A librarian,
regulars who come for the heating, the catalog Daemon. The public terminals give each verified
identity 30 minutes; you have no identity. The puzzle is the library's own LAN (reachable only
from inside) through the room's devices: the card reader, the session timer, the printer queue.
The reward is `scan.so`, from the "software lending" archive, long overdue.

## As built (2026-10-15)

- **Networks** are net.json `networks` (GAME-DATA.md, "The net"): home, the library's LAN, the
  public net (Downtown's 0x2F, 0x31, 0x3C, CAM-3, MAGLEV, WEATHER SAT, UNDERNET), the delivery
  fleet (DISPATCH), FRIENDNET, Moth's flat 4C. The Galleria, NEOBANK, the Registry, the corporate
  nets and the Ghosts' mesh come with their places. Metro and ad screens are scenery, not devices,
  so they are not on the public net yet.
- **Reach** = the LINKs up on the board where you are + your controlled nodes (one standing here,
  or on a network you reach). A LINK's own scan reaches what its port leads to, so Downtown's and
  Moth's puzzles see the same nodes as before.
- **Controlled nodes:** `save.controlled` (`node.control`, Downtown's code). Taking 0x2F makes
  Downtown's street a port onto the public net (and through it the fleet and FRIENDNET).
- **scan.so:** `save.programs`. Before it a LINK connects only to what it `known`s (the home PC's
  CONCIERGE, the library's reader and printer), so Capsule 7B's P02 and the library work without it.
- **NET** (hack vision's bar and N; the touch bar's NET) shows once scan.so is yours and pings until
  the map has been opened (`flags["net:opened"]`). The net map is netmap.ts: networks on a fixed
  grid (net.json order), lit where you reach them, found ones (`save.nets`) and rumours (one step
  away: name and where to plug in). Opening it is a scan from here. A machine in reach comes onto
  the board; one out of reach says where to plug in from.
- **The deck:** `scan`, `connect <machine>` (by id or name; the deck then talks to it: `ls`, `cat`).
- **The library:** P16 in PUZZLES.md.

## Also

- **The terminal** works on the same net: `scan`, `connect`, `ls`, `cat`.
- **Time:** machines have busy hours and maintenance windows on the city clock (TIME.md).
- **Danger:** trace in the net raises your **heat** in the city: stricter doors, a watchdog that
  learns your habits, checkpoints that look harder.
