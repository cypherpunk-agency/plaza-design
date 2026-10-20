# ACCESS DENIED: Circuit vocabulary

2026-10-20, approved by Tommi: "kind" is replaced by **layer** and **function**. Background:
[CIRCUIT-INVENTORY.md](./CIRCUIT-INVENTORY.md) (every part sorted this way) and
[CIRCUIT-AUDIT.md](./CIRCUIT-AUDIT.md). Working vocabulary, open to revision.

## Words

| Word | Meaning | In the data |
|---|---|---|
| **the Circuit** | the whole logic, hacking and connection system | – |
| **device** | a machine in the world, a network machine, or a logic part on your board | `devices`, `nodes` |
| **part** | anything on a device you can address: a component, a program, a file | `nouns` |
| **action** | what you can do to a part | `verbs` |
| **signal** | what a part raises; wires start here | `events` |
| **wire** / cable | a signal carried to an action | `cables` |
| **layer** | where a part lives: `hardware`, `software`, `data` | `layer` |
| **function** | what a part does (below) | `function` |

The data keys `nouns`, `verbs` and `events` stay as they are for now; renaming them is a
separate, mechanical decision. Player-facing words are unchanged apart from the hack-vision
label (below).

## Functions

| Function | What it does | Engine behaviour when the part carries |
|---|---|---|
| `sense` | notices something | a `zone` (planned) |
| `act` | does something to the world | a `mover` (planned) |
| `hold` | keeps information | – |
| `program` | a file that becomes a capability once taken | – |
| `time` | waits or repeats | a `clock` |
| `gate` | lets a signal or a person through, or not | a `guard` (a login or a lock toy) |
| `connect` | reaches a network | a `link` |
| `record` | writes down what you do; fills trace | a `log` |
| `talk` | a character you talk to | – |
| `logic` | works on signals (counting, combining) | – |

A settings block belongs to one function: `guard` only on a gate part, `clock` only on a
time part, `link` only on a connect part, `log` only on a record part. A part with that
function but no block is ordinary: SWITCH is a gate without a guard, TIMER and the library's
session timer are time parts without a clock.

## Layer

Layer says nothing to the engine. It is what the player and the author read: a wall switch
and SWITCH are both gates, one hardware and one software. Logic parts are software; network
machines' services are software; lock toys are hardware.

## Shown to the player

- Hack vision labels each part with its function instead of its kind, coloured by layer.
- Hack vision's default order is by function: sense, hold, program first; then act and logic;
  then time, gate, connect, record; talk last.
- The sandbox's teaching stations label each station with its function.

## Conversion (done with this note)

Every part in the scenes, the network and the logic parts was converted from its kind using
the inventory's reading. The changes from a plain kind mapping are the accidental labels:

- the library's session timer, the smart plug's schedule and the billboard's ad rotation
  become `time` (they were SENSE);
- the fridge's inside and the answering machine's tape become `act` (they were STORE);
- the sandbox's press counter becomes `logic`; TIMER becomes `time` and SWITCH `gate`;
- program files (`legs.so`, `switch.so`, `scan.so`) become `program`;
- files named `.log` stay `hold`; only the three recorders are `record`.

## Open

- Whether to rename the data keys `nouns`, `verbs`, `events` to `parts`, `actions`, `signals`.
- How hack vision should show the layer beyond colour (position on the device).
