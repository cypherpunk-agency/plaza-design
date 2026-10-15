# ACCESS DENIED: the net

Decided (Tommi, 2026-10-15). The net is not a place you walk through: you connect through
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

## Also

- **The terminal** works on the same net: `scan`, `connect`, `ls`, `cat`.
- **Time:** machines have busy hours and maintenance windows on the city clock (TIME.md).
- **Danger:** trace in the net raises your **heat** in the city: stricter doors, a watchdog that
  learns your habits, checkpoints that look harder.
