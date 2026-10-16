# ACCESS DENIED: puzzle catalogue

See [ROADMAP.md](../../ROADMAP.md) for the consolidated build sequence and
[PROLOGUE-ACT-I-PLAN.md](../design/PROLOGUE-ACT-I-PLAN.md) for the detailed new encounter order.

> Teaching order is being redesigned in [PROGRESSION-CONCEPT.md](../design/PROGRESSION-CONCEPT.md) (2026-10-16). The route and progression tables below describe the earlier arrangement; built puzzles are reusable material, not mandatory Act I lessons. Advanced combinations may move to later acts.

Working puzzle catalogue, mixing implemented puzzles and proposals. Everything remains open
to redesign. ROADMAP.md tracks current status; this file's **Built/As built** passages describe
the implementation. Older sketches elsewhere are illustrative, not instructions to paste
over current data. Read with LEVELS.md (level design), GAME-DATA.md (authoring), ART-GUIDE.md
(visual intent) and README.md (documentation map).

This is a hacking game told as fiction and played as puzzles. Nothing here is a manual for
real systems: guards are toys, passwords are riddles, the net is made up.

**Sources** (where an idea or line came from):

| Tag | File |
|---|---|
| `lab1` | design lab `deck-lab.html` (ten input devices; puzzle hooks for cipher, Morse, cryptex, patch bay) |
| `combos` | `deck-combos.html` (the "puzzle shelf"; card flavour lines) |
| `lab3` | `deck-lateral.html` / `deck-lab-3a/3b/3c.html` (SNACKOMAT, LIFT-2, DLV-9, CAM-3, wire-it pairs, sigils, shields, HINGE the door, chips) |
| `lab4` | `deck-lab-4.html`, `r4/` (first back yard, the workbench) |
| `lab5` | `deck-lab-5.html`, `r5/` (nouns point out, cables are verbs, crafting) |
| `scenes` | `scenes.html` (storyboard: box 0x2F, Neon Market, rooftops, spaceport pad 7, antenna, server room) |
| `chars` | `character-art.html` (the noodle stall, NO LOGS KEPT) |
| `LEVELS` / `level.ts` / `yard.json` / `scene:<id>` | in this folder |

**Status words:** *built* (in the game), *rebuild* (exists on the old terminal, moves to the
schematic system), *design* (ready to build from this page), *draft* (story beats still need
Tommi's call).

---

## Summary

| # | Puzzle | Scene · spot | Mechanics | Path | Diff. |
|---|---|---|---|---|---|
| P01 | Router on a schedule | Capsule 7B · smart plug | pre-wired cable to cut, ACT verb, reading | main | 1 |
| P02 | Rent: pending | Capsule 7B · door, HOME-PC | connect (the PC knows CONCIERGE), one cable (event → verb), daemon CONCIERGE | main | 1 |
| P03 | Pixel and the warm router | Capsule 7B · kettle, blinds | events, a device you can't command (the cat) | main | 2 |
| P16 | Long overdue | the public library · card reader, session timer, printer | connect from inside a place, a LAN reachable only there, a STORE clue, one guard; reward `scan.so` | main | 2 |
| P04 | Name yourself | Downtown · your deck | keyboard (free text), the fixer | main | 1 |
| P05 | The noodle till | Downtown · noodle stall | password guard + clue fragments, sealed drawer | main | 1 |
| P06 | VERIFY's dead letter | Downtown · junction box 0x2F | password guard, a clue you see in the world, module install, controlled node | main | 2 |
| P07 | The parcel (built) | back yard · crane, CAM-1, HINGE | camera scope, events, TIMER, timing, daemon permission | main | 2 |
| P08 | Rotation is not security | Downtown · rooftop relay 0x31 | pattern clue, first trace and log, LINK scan | main | 2 |
| P09 | Gone fishing (not fishing) | the net · FRIENDNET → MOTH-PC | scan/connect hops, key chip opens a sealed sector, module found | main | 2 |
| P10 | Moth's song seal | the net · MOTH-PC journal | sealed sector with a logic seal, SWITCH + TIMER, the watchdog | main | 4 |
| P11 | Who paid for whose ticket | the net · NEOBANK | password clue fragments from three places, trace, daemon with feelings | optional | 3 |
| P12 | The Neon Market gate | Downtown · gate, DLV-9 | shields (guard toy), COPY between nodes, cutting the right pre-wired cable | main (Downtown finale) | 4 |
| P13 | Washer 3 | market · laundromat | scheduling with events, a breaker constraint, pre-wired schedule | main | 4 |
| P14 | The stop that isn't on the map | metro → train | world-loop timing, a registered emergency, doors | main | 3 |
| P15 | NRLU 404 0451 | harbor · stacks, STS-2 | everything: scope, crane, pre-wired alarm, watchdog, trace | main (Act I end) | 5 |
| O01 | SNACKOMAT | shop · next to THIRST.EXE | practice device: all verbs, daemon, a key chip, sealed service panel | optional | 1 |
| O02 | CAM-3 is bored | Downtown · pole by the billboard | camera scope: zoom, tag, loop | optional | 1 |
| O03 | The window that blinks | Downtown · penthouse window | scope + Morse, a fragment carried for a long time | optional | 2 |
| O04 | J's cryptex | Downtown · penthouse | cryptex guard, root fragment | optional (late) | 3 |
| O05 | DON'T TRUST. VERIFY. | market · billboard | cipher wheel (Caesar), policy 7 | optional | 2 |
| O06 | Pigeon TV | Downtown · billboard | wiring a feed to a screen, cutting the ad feed, controlled node | optional | 2 |
| O07 | The junction cabinet | metro · service cabinet | patch bay: rewire pre-wired cables under constraints | optional | 3 |
| O08 | LIFT-2 and floor 13 | mall · lift | daemon talk, cable a song to the roof, a seal opened by kindness | optional | 2 |
| O09 | The rooftop garden | mall roof (floor 13) | a lying sensor (WEATHER SAT), cut and rewire, TIMER | optional | 3 |
| O10 | The music box | metro · LOST+FOUND | platform camera, the train's loop, a person who moves on cue | optional | 3 |
| O11 | Wishing fountain | mall · fountain | one STORE, one joke | optional | 1 |

Difficulty: 1 = one idea, a minute. 3 = two or three ideas chained. 5 = everything you have
learned, with timing.

---

## How the levels grow

The order in `LEVELS.md`, with Downtown woven in as the street you keep coming back to.
Each step adds one or two ideas; nothing is used before it is taught.

| Step | Level | New ideas | Main puzzles | Side puzzles open |
|---|---|---|---|---|
| 1 | **Capsule 7B** (LEVELS L1) | tap and read; ACT verbs; cables already there; cutting one; `scan`/`connect`; one cable; a daemon | P01, P02, P03 | — |
| 1b | **The public library** (P16, built) | connecting from inside a place; a network only reachable there; a STORE clue; a guard; `scan.so` and the net map | P16 | — |
| 2 | **Downtown I**: the street | the keyboard (once); password guards and clue fragments; sealed nouns; installing a module; controlled nodes; fixer hints for tokens | P04, P05, P06 | O01, O02, O03 (read only) |
| 3 | **Back yard** (L2, built) | events start cables; TIMER; timing; asking a daemon; the camera | P07 | — |
| 4 | **Downtown II**: the rooftops | a pattern as a clue; trace and logs; a LINK that shows the net | P08 | O06 |
| 5 | **Moth's place** (L3) | key chip seals; hops across nodes; SWITCH; the watchdog; a logic seal | P09, P10 | P11, O08, O09 |
| 6 | **Downtown III**: the gate (Downtown finale) | shields; COPY from one node to another; steering a device; reading pre-wired cables to find the one to cut | P12 | — |
| 7 | **Neon Market** | several machines on one constraint; scheduling with events | P13 | O05 |
| 8 | **Metro and train** | timing that rides a loop in the world; doors and brakes | P14 | O07, O10 |
| 9 | **Harbor** | all of it | P15 | — |

Story thread (finding Moth), one line per step:

1. You wake up locked in. Moth's last message is on HOME-PC: *"if I go dark, my place is yours.
   my key is with the noodle fixer. follow the trains."*
2. The fixer talks to ghosts, but you are broke and the street ignores you. You earn tokens and
   legs.
3. The fixer kept a parcel: `uplink.so` and Moth's key chip ("Moth asked me to give you this").
4. From the rooftops your deck sees the net for the first time.
5. Moth's computer: Moth went where the Registry doesn't look, the water. The journal ends:
   *"your pass is in my jacket. the jacket is in washer 3 at the market laundromat. nobody
   searches a wash cycle."* (Change to LEVELS L3: the journal now points to the market before
   the train.)
6. The market's gate wants a scanner signature. The only one on the street belongs to a lost
   delivery robot.
7. The jacket: a maglev pass, and the right-hand glove that matches the left one in DLV-9.
8. LINE 0 only goes to PLAZA CENTRAL. Moth registered an emergency 48 hours ago.
9. The harbor, a container that is "not found", and Moth.

---

## Format pieces (as built)

The engine (`game/engine/`, GAME-DATA.md) now has every piece these puzzles need except the
scene-specific effects. The sketches below are written in its real format (abbreviated: `look`,
`status` and `layout` are left out where they add nothing, and so is the `on` entry of a verb
whose lines are not written yet), so they paste into a scene file and the build's check takes
them from there: it will ask for the missing pieces by name. (They were first written as proposals; GAME-DATA.md's
open question 4 records the alignment.)

| Piece | As built (GAME-DATA.md section) | Data or code |
|---|---|---|
| Kinds `LINK`, `GUARD`, `LOG`, `CLOCK` | LINK: `link.reach`, engine verbs `scan`, `connect <node>` (**The net**). GUARD: `guard`, engine verbs `try <fragment>` and `type…`, or `probe` on a toy (**Guards**, **Lock toys**). LOG: `log.rate` (**Trace**). CLOCK: `clock.every`, engine verbs `start` / `stop` (**Clocks**). | data; behaviour is engine code |
| Clues | Keyring items in the scene's (or `net.json`'s) `keyring`: `{ "id", "kind": "fragment", "label", "text" }`; a rule is `{ "kind": "rule", "rule": "reverse" }`. The step `{ "give": "vrify" }` puts one on the keyring (**Keyring**). | data + save |
| Guard | `guard`: `{ "password": "…" \| [...], "near"?: { guess: line }, "tries"?, "lockMs"?, "trace"? (%), "say"?: line, "do"?: steps }`, or `"toy"` with its parameters instead of `password`. Success says `say`, runs `do`, raises `opened` if listed, opens sectors sealed by it. No `user` field: name the user in the lines. | data; toys are code |
| Sealed sectors | Device `sectors`: `[{ "id", "label", "seal": { "key": "moth.key" } \| { "guard": "login" } \| { "if": "stateKey" } \| { "sequence": [...] } }]`; each noun in it says `"sector": "<id>"` (**Sealed sectors**). | data |
| Chips, modules, tokens | `{ "give": "moth.key" }` (a key chip), `{ "give": "switch.so" }` (a module into `Save.modules`; `foundIn` in `logic.json` names the scene), `{ "give": "tokens", "count": 3 }` (**Giving things**). | data + save |
| Pre-wired cables | `cables`, cut by tapping. `"fixed": true` for a conduit you cannot cut; optional `id` (**Pre-wired cables**). | data |
| Clocks | A CLOCK noun: `{ "kind": "CLOCK", "events": ["night", "day"], "clock": { "every": 4000, "set": "phase" } }` raises its events in turn (**Clocks**). | data; the beat is engine code |
| Trace | A LOG noun: `{ "kind": "LOG", "events": ["entry"], "log": { "rate": 5, "archive": "archive.store" } }` plus the pre-wired cable `log:entry → archive.store`. `rate` is % per second (a `fillMs` of 20000 is `rate` 5). Full meter: kicked out, locked out for `log.lockMs` (**Trace**). | data; meter is code |
| Net | Nodes in a scene's `nodes` or `net.json`; a LINK's `reach` lists which it can `scan` (**The net**). | data |
| Watchdog | `"watchdog": { "route": [...], "dwellMs", "moveMs" }` in a scene or `net.json`. The device it sits on freezes. Each route device gets the engine noun `watchdog` with events `arrives` / `leaves` (**The watchdog**). | data; freezing is code |
| Hints | Downtown's stepped fixer hints, per goal, cost a token each (`hints` comes back for Downtown, GAME-DATA.md). Not built. | data |
| Nodes controlled | A named effect `node.control` (Downtown's code) or a state key the NODES counter reads. Not built. | code (effect) |

Rule kept from GAME-DATA.md: if it needs geometry, a loop or timing beyond "wait N ms", it is a
named effect; everything that is wording, wiring or a choice is data. Effects the sketches name
(`pixel.move`, `node.control`, `dlv.drive`, `washer.run` / `washer.stop`, `train.brake`,
`train.doors`, `gantry.move`, `grudge.add`) are each scene's own code, written with that scene.
Two proposed effects became data: `tokens.add` is `{ "give": "tokens", "count": 3 }`, and P10's
`seal.hear` is the engine's sequence seal.

---

## Level 1: Capsule 7B

*Teaches: tap and read, verbs, pre-wired devices, cutting a cable, scanning a network, one
cable between two devices, talking to a daemon.* (LEVELS L1)

The flat: door lock, blinds, kettle, smart plug, router, HOME-PC, a fridge note, and Pixel,
a robot cat who sleeps on whatever is warm.

**How Capsule 7B starts now (the opening, 2026-10-15; `opening.ts`).** You see the flat first
the night before, at dawn and warm, where every everyday action works and nothing is a puzzle
(state `flat`). You sleep; the flat is reset to its first-visit state and it is 09:40, cold
(state `deleted`): the door says "rent: pending. identity: not found.", the kettle, blinds and
plug fail with dry lines, and hacking is still locked. After two failures (or checking mail, or
25 s) Moth's message arrives and hands you `uplink.so` (keyring `uplink`): hacking unlocks.
The GOAL is "jack in to your PC"; once HOME-PC's schematic is open (`opening:jacked`), P01–P03
run exactly as below. The flat's cold light lifts when the door opens.

### P01 Router on a schedule

- **Scene · spot:** Capsule 7B, the smart plug under the desk. Main path. Difficulty 1.
- **Player sees:** the router is dark. The fridge note: *"who set the router to sleep at
  night? it's a capsule. it is always night in here. —past you"*
- **Solution:** open the plug's schematic. A cable is already there: `clock:night → plug.power
  off`. Turning the plug on by hand works for a few seconds, then the clock says night again
  ("the plug obeys its schedule. it is night. again."). Tap the cable to cut it, turn the plug
  on, the router wakes.
- **Mechanics:** pre-wired cable, cutting, an ACT verb, a clock (a CLOCK noun).
- **Unlocks / teaches:** cables exist before you. Reading the wiring is half the game.
- **Data sketch:** (the clock says night every 6 s, so a plug turned on by hand goes off again)

```json
{ "id": "clock", "name": "SCHEDULE", "look": "A timer app with one rule and no doubts.",
  "nouns": [{ "id": "clock", "kind": "CLOCK", "events": ["night"], "clock": { "every": 6000 }, "verbs": ["read"],
    "on": { "read": { "say": ["cat clock", "rule 1: at night, plug off. it is night."] } } }] },
{ "id": "plug", "name": "SMART PLUG",
  "nouns": [{ "id": "power", "kind": "ACT", "verbs": ["on", "off"], "current": "plugOn",
    "on": { "on": { "do": [{ "set": "plugOn", "to": true }], "say": ["use power --on", "click. the router blinks awake."] },
            "off": { "do": [{ "set": "plugOn", "to": false }], "say": ["{via}use power --off", "click. dark again.", "dim"] } } }] }
```
```json
"cables": [{ "from": "clock.clock:night", "to": "plug.power", "verb": "off" }]
```

### P02 Rent: pending

- **Scene · spot:** Capsule 7B, the door and HOME-PC. Main path. Difficulty 1.
- **Player sees:** the door is locked. CONCIERGE's plate: RENT: PENDING. HOME-PC's outbox holds
  `receipt_rent.pdf`, "waiting for a network since Tuesday".
- **Solution:** with the router up (P01), the router's `uplink` (or HOME-PC's `net`) knows CONCIERGE
  (`known`, as built since NET.md: no scan.so before the library): `connect concierge`. Opening the outbox raises `ready`. Wire `pc.outbox:ready →
  concierge.desk verify`, open the outbox again, the door unlocks.
- **Mechanics:** LINK `scan`/`connect`, one cable carrying a verb, a daemon.
- **Unlocks:** the door; Downtown. Talking to CONCIERGE is flavour and teaches TALK.
- **CONCIERGE** (polite, petty, loves paperwork; its paperwork has paperwork). It can reuse the
  door lines from `lab3` (HINGE the door, cut when HINGE became the yard's hatch):
  - "Maintenance comes on Tuesdays. It is not Tuesday. It is never Tuesday when it matters."
    → "It's Tuesday somewhere." → "…That is technically true. I respect technically true."
  - "It is original oak-effect. Nobody ever notices." → "I noticed." → "You may pass. Wipe
    your feet. Metaphorically." (here it only lets you pass *the conversation*; the door still
    wants the receipt)
  - typed line with please/thanks: "Manners. In this economy. Fine." (`lab3`)
  - after verify (new): "Payment verified. Your door is unlocked. Form 7B-12 is attached, and
    its own form is attached to it."
- **Data sketch:**

The router's uplink sits in a sector that opens once the plug is on; CONCIERGE is a node (scene
`nodes`), so `scan` shows it and `connect` brings it onto the board.

```json
{ "id": "router", "name": "ROUTER",
  "sectors": [{ "id": "net", "label": "uplink", "seal": { "if": "plugOn" } }],
  "nouns": [{ "id": "uplink", "kind": "LINK", "sector": "net", "link": { "reach": ["concierge"] } }] },
{ "id": "pc", "name": "HOME-PC",
  "nouns": [{ "id": "outbox", "kind": "STORE", "verbs": ["read", "open"], "events": ["ready"],
    "on": { "open": { "do": [{ "emit": "ready" }], "say": ["open outbox", "receipt_rent.pdf: ready to send."] } } }] },
{ "id": "concierge", "name": "CONCIERGE",
  "nouns": [
    { "id": "desk", "kind": "ACT", "verbs": ["verify"], "on": { "verify": [
      { "if": "!signal", "say": ["use desk --verify", "CONCIERGE: \"verification requires a document. you are not a document.\"", "err"] },
      { "do": [{ "set": "doorOpen", "to": true }, { "goal": "door" }], "say": ["signal → desk --verify", "CONCIERGE: \"payment verified. how unexpected.\"", "ok"] } ] } },
    { "id": "concierge", "kind": "DAEMON", "verbs": ["talk"], "on": { "talk": { "do": [{ "open": "talk" }] } } }] }
```

### P03 Pixel and the warm router

- **Scene · spot:** Capsule 7B, kettle and blinds. Main path (the send in P02 fails while the
  router keeps rebooting). Difficulty 2.
- **Player sees:** router status "temp 71°C · Pixel asleep on top", then "rebooting". Pixel's
  schematic: `mood` reads "warm-seeking. opinions: none. naps: many."; USE does nothing
  ("Pixel ignores you, flawlessly.").
- **Solution:** the blinds are on CONCIERGE's privacy lockdown while rent is pending: a finger
  can't open them ("only your morning routine may open them"). The morning routine is the
  kettle. Wire `kettle.kettle:boiled → blinds.motor open`, boil the kettle. Sun lands on the
  floor, Pixel moves to the sunny spot, the router cools and stays up.
- **Mechanics:** events, a device that obeys signals but not fingers (like HINGE), a character
  you cannot command.
- **Teaches:** you change a thing by changing what it wants, not by ordering it.
- **Data sketch:**

```json
{ "id": "kettle", "name": "KETTLE", "nouns": [{ "id": "kettle", "kind": "ACT", "verbs": ["boil"], "events": ["boiled"],
  "on": { "boil": { "do": [{ "emit": "boiled" }], "say": ["use kettle --boil", "it boils. it says so."] } } }] },
{ "id": "blinds", "name": "BLINDS", "nouns": [{ "id": "motor", "kind": "ACT", "verbs": ["open", "close"], "on": { "open": [
  { "if": "!signal", "say": ["use motor --open", "privacy mode. only your morning routine may open the blinds.", "err"] },
  { "do": [{ "set": "sun", "to": true }, { "effect": "pixel.move" }], "say": ["signal → motor --open", "sun. Pixel relocates.", "ok"] } ] } }] }
```

Open question kept from LEVELS: does Pixel come along as a companion (warm laps, sabotage)?

---

## Level 1b: the public library (built)

### P16 Long overdue (the library)

- **Scene · spot:** the public library (Downtown, the street west of the noodle stall; `library`,
  data/library.json, library/). Main path, after Capsule 7B and before Downtown's net puzzles.
  Difficulty 2. The first hacking job: it hands out `scan.so`.
- **Player sees:** a warm reading room kept for its chairs (the books were digitized in 2049). Three
  public terminals, two in use; a SESSION TIMER over them: 30 minutes per verified identity. The CARD
  READER by the terminals says NO CARD. The staff PRINTER on the end of the librarian's desk has been
  printing the same page for eleven years. Moth's message (the opening) and Capsule 7B's last line
  point here: "the library on your street still lends scan.so."
- **Teaches:** connecting from inside a place (the room's devices are ports onto a network); a network
  you can only reach here (LIBRARY LAN: no line out); reading a STORE for a clue; one guard.
- **Solution (as built):**
  1. Hack the card reader: its `lan` LINK knows CATALOG (`known`: no scan.so needed).
     `connect catalog`. CATALOG (DAEMON, talk) says there is one item in SOFTWARE LENDING, scan.so,
     on loan to staff and overdue; staff go by card number; "it is on the notice; the notice is in
     the printer's queue." The session timer's `policy` says the same from the other side: staff are
     identified by card number, not by name.
  2. The printer's `queue` (STORE, read): the stuck job, an overdue notice naming the borrower,
     STAFF CARD 0013. Reading it puts `staff card 0013` (fragment `0013`) on the keyring.
  3. The printer's `spool` LINK knows SOFTWARE LENDING. `connect lending`. Its `login` GUARD
     takes the card number (drag the chip, or type it: `login staff 0013`; "13" gets a dry hint
     that card numbers have four digits). The `staff` sector unfolds: `loans`, `scan.so`.
  4. `renew` scan.so: "LOAN RENEWED. DUE: 30 DAYS FROM TODAY. A COPY HAS BEEN SENT TO THE
     BORROWER'S DEVICE. YOURS, APPARENTLY." `{ "give": "scan.so" }` makes it yours (`save.programs`):
     NET appears in hack vision's bar, pinging, and N opens the net map.
- **After:** `scan` from the reader now also finds HEATING (the boiler controller: locked by "the
  committee", which is the regulars). The net map from the library shows only LIBRARY LAN in reach.
- **Mechanics:** LINK `known` (connect before scan.so); a network reachable only from inside
  (net.json `library`: ports `library:reader.lan`, `library:printer.spool`); STORE → fragment;
  GUARD with `near`; a sealed sector; a `give` of a program. Goals: `lan` (code: CATALOG or LENDING
  connected), `notice`, `login`, `scan`.
- **People (ART-GUIDE §10):** the LIBRARIAN (has been waiting eleven years to stamp something), the
  two at the terminals (a student's thesis on why thirty minutes is not enough; a kid using his
  mum's thirty minutes), three regulars in armchairs who come for the radiators (one "not asleep",
  one knitting a scarf for the radiator, one reading the last paper newspaper slowly), SHELF-E
  re-shelving the one book that is left, the cat on the radiator. Notices are dry ("BUILDING
  RETAINED FOR SEATING"). The surprising detail: a chained paper book, REFERENCE ONLY, whose bus
  ticket bookmark moves a page a day.

## Level 2: Downtown I, the street

*Teaches: the keyboard (once), password guards with clue fragments, sealed nouns, installing a
module, controlled nodes, the fixer's hints.*

### Downtown rebuilt on the new system

**Built** (`data/downtown.json`, `game/downtown/`). Where it differs from the sketches below:
the till's login opens the `drawer` sector and the drawer pays the tokens (that sets `flags.till`,
as before); the sketches' `clue` steps are `give`, `accepts` is `password`, the relay's trace is a
LOG noun (`rate` 4 %/s, wrong guess +15 %) with its archive as a noun on the relay; the login
users (`admin`, `maint`) are checked by the deck's `login <user> <pass>` only (dragging a clue
needs no user). P12 is playable with a stand-in for the rings toy (see P12). O02 and O06 are in.
The fixer keeps his bubbles and his hints (`level.ts`); his first question opens the deck with
`set handle ` already typed.

Today Downtown is a terminal (`level.ts`): `ls`, `cat`, `login`, `install`. In the rebuild every
machine is a device on the board with nouns; every old command becomes a verb; clues, progression
and the save stay the same.

| Old (`level.ts`) | New |
|---|---|
| `ls` on a machine | SCAN: the schematic shows the nouns |
| `cat file` | READ on a STORE noun |
| `login user pass` | a GUARD noun: drag a fragment from the keyring or type (`try`) |
| files that appear after login | a sealed sector that unfolds after the guard opens |
| `install legs.so` | `install` verb on the `legs.so` STORE noun |
| `set handle`, `sudo`, `rm`, `hack`, `enter` | stay as keyboard lines on your own deck (the keyboard is the last resort, and the jokes live there) |
| `flags.till`, `controlled`, `jump`, `tokens`, `hints` | scene `state` + the existing save fields (keep `Save.jump`, `Save.controlled` so old saves load) |
| `objective()` | `goals`: `handle`, `till`, `box`, `install`, `relay`, `gate` (same ids) |
| `HINTS` + `fixerTalk()` | the fixer as a dialogue with `hints` per goal, one token each, "hints, never answers" |

Keep every current line: the denied jokes ("Incident reported to /dev/null.", "This attempt has
been logged. Nobody reads the log.", "The Registry thanks you for your interest."), `sudo`
("… is not in the sudoers file. This incident will be reported to /dev/null."), `rm`
("PERMISSION DENIED (but we like your style)."), `hack` ("hacking is not a command. It is a
lifestyle."), `enter` ("nice try.").

### P04 Name yourself

- **Scene · spot:** Downtown, at the noodle stall. Main path. Difficulty 1.
- **Player sees:** the fixer: "Another ghost. Sit." / "Noodles are free for the dead." /
  "Registry pulled your key? Then nobody on this street sees you." / "Got a name, ghost?"
- **Solution:** open the deck's keyboard corner, `set handle <name>`.
- **Mechanics:** the keyboard, on purpose the only required free text in Act I.
- **Unlocks:** the fixer's greeting and the till hint. NPCs stay as they are (hood, umbrella,
  hat), and change their lines once a node is controlled.

### P05 The noodle till

- **Scene · spot:** Downtown, the till on the noodle stall counter. Main path. Difficulty 1.
- **Player sees:** NOODLE TILL v1.0, firmware: factory. The fixer: "my till still runs on
  factory settings. Don't tell anyone." / "Factory settings. Every manual prints them."
- **Solution:** READ `receipts.log` (flavour: "#0414 ramen, for a ghost .... on the house").
  READ `quickstart` (new: a laminated card taped under the counter: "1. log in: admin / admin.
  2. change password (optional)."): fragment `admin`. Drag `admin` onto the `login` guard
  (user `admin`). The `drawer` sector unfolds; `open` it: 3 noodle tokens.
- **Mechanics:** STORE reading, password guard, clue fragment, sealed sector.
- **Unlocks:** tokens (hints at the stall); teaches the keyring.
- **Data sketch:**

```json
{ "id": "till", "name": "NOODLE TILL", "look": "A till on factory settings. It is not ashamed.",
  "nouns": [
    { "id": "receipts.log", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat receipts.log", "#0412 ramen, extra egg ...... 1 token · #0413 ramen, no logs ........ 1 token · #0414 ramen, for a ghost .... on the house"] } } },
    { "id": "quickstart", "kind": "STORE", "verbs": ["read"], "on": { "read": { "do": [{ "give": "admin" }], "say": ["cat quickstart", "1. log in: admin / admin. 2. change password (optional)."] } } },
    { "id": "login", "kind": "GUARD", "guard": { "password": "admin",
      "say": ["login admin ****", "ACCESS GRANTED. Hello, admin.", "ok"], "do": [{ "set": "till", "to": true }, { "goal": "till" }] } },
    { "id": "drawer", "kind": "ACT", "sector": "drawer", "verbs": ["open"], "on": { "open": [
      { "if": "paid", "say": ["use drawer --open", "empty. the till looks at you.", "dim"] },
      { "do": [{ "set": "paid", "to": true }, { "give": "tokens", "count": 3 }], "say": ["use drawer --open", "credited to {handle}. Spend them on hints at the stall.", "ok"] } ] } }],
  "sectors": [{ "id": "drawer", "label": "cash drawer", "seal": { "guard": "login" } }] }
```
```json
"keyring": [{ "id": "admin", "kind": "fragment", "label": "till quickstart", "text": "admin" }]
```

### P06 VERIFY's dead letter (junction box 0x2F)

- **Scene · spot:** Downtown, the Registry junction box under the vertical VERIFY sign. Main
  path. Difficulty 2.
- **Player sees:** JUNCTION BOX 0x2F · REGISTRY UTILITIES · AUTHORISED STAFF ONLY. Above it the
  VERIFY sign in neon, one tube dead (the E: it reads V·RIFY). The fixer: "That junction box
  under the VERIFY sign belongs to the Registry. Older than you."
- **Solution:** READ `README`: "Registry Utilities. Maintenance login only. Password set per
  sign policy 7." Look at the sign (tap it in the world, or open the sign's device: its `tubes`
  noun has `test`, which lights each letter in turn: "tube 2 of 6: dead since forever."): fragment
  `vrify`. Try `verify` first and the guard says "Close. Count the letters again." Drag `vrify`
  onto `login` (user `maint`). The sector unfolds: `legs.so`; `install` it. Node 0x2F is yours (controlled).
- **Mechanics:** STORE reading, a clue you see in the world, a guard with a near-miss line, a
  sealed module, controlled node.
- **Unlocks:** legs.so (SPACE to jump), the low roof and the relay; NODES 43; the street
  notices ("A box on this street went dark. Registry is sending a van.").
- **Lines to keep:** `login admin admin` on the box: "ACCESS DENIED. Not everyone is the noodle
  stall." (`scenes`). Grant: "ACCESS GRANTED. Welcome back, maintenance." / "node 0x2F released
  from REGISTRY · NODES: 43 ACTIVE".
- **Data sketch:**

```json
{ "id": "sign", "name": "VERIFY SIGN", "look": "Six tubes. Five work.",
  "nouns": [{ "id": "tubes", "kind": "SENSE", "verbs": ["read", "test"],
    "on": { "read": { "do": [{ "give": "vrify" }], "say": ["cat tubes", "V·RIFY. the E has been dark since forever."] },
            "test": { "do": [{ "give": "vrify" }], "say": ["use tubes --test", "V ok · E dead · R ok · I ok · F ok · Y ok"] } } }] },
{ "id": "box", "name": "JUNCTION BOX 0x2F",
  "nouns": [
    { "id": "README", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat README", "Registry Utilities. Maintenance login only. Password set per sign policy 7."] } } },
    { "id": "login", "kind": "GUARD",
      "guard": { "password": "vrify",
        "near": { "verify": ["login maint verify", "ACCESS DENIED. Close. Count the letters again.", "err"],
                  "admin": ["login maint admin", "ACCESS DENIED. Not everyone is the noodle stall.", "err"] },
        "say": ["login maint *****", "ACCESS GRANTED. Welcome back, maintenance.", "ok"],
        "do": [{ "effect": "node.free" }, { "goal": "box" }] } },
    { "id": "legs.so", "kind": "STORE", "sector": "modules", "verbs": ["read", "install"], "on": {
      "read": { "say": ["cat legs.so", "[binary module] install to use."] },
      "install": [{ "if": "jump", "say": ["install legs.so", "legs.so is already installed. You have legs.", "dim"] },
                  { "do": [{ "set": "jump", "to": true }, { "goal": "install" }], "say": ["install legs.so", "installed legs.so. SPACE to jump.", "ok"] }] } }],
  "sectors": [{ "id": "modules", "label": "maintenance", "seal": { "guard": "login" } }] }
```
```json
"keyring": [{ "id": "vrify", "kind": "fragment", "label": "V·RIFY (the sign)", "text": "vrify" }]
```

(`legs.so` stays Downtown's own: the save keeps it as `jump`, not in `modules`, so it is a
`set`, not a `give`.)

The fixer's hints for `box` stay word for word: "Signs on this street never fully light. Read
what the one above the box really says." / "The box only takes maintenance logins. It says so
itself, if you ask it to list its files." For `install`: "Found something on that box? Modules
don't install themselves." / "Go back to the box. What does it list now that it trusts you?"

### Readables and signs in Downtown (keep, and give them nouns where noted)

| Thing | Text | Becomes |
|---|---|---|
| Billboard | REGISTRY PREMIUM. Be seen everywhere. / Terms: forever. Cancellation: see Terms. | device `billboard` (O06) |
| Penthouse plaque | PENTHOUSE · BY INVITATION / The door has no handle. Only a window, very high up. | readable; points at O03/O04 |
| OPEN 24/7/365.25 | sticker on the shop door (`ART-GUIDE` §5) | readable |
| < NEON MARKET, SPACEPORT > | neon on plates | readables |
| YARD | neon over the yard door | exit |
| REGISTRY PROPERTY fence | antenna access: root only | Act II (root fragments) |
| IDENTITY SCAN | subject: {handle} · signatures: 0/3 | Act II (O09, O10 give signatures, see below) |

---

## Level 3: the back yard (built)

### P07 The parcel

- **Scene · spot:** the fixer's back yard (door at the end of the block past the stall). Main
  path. Built (`data/yard.json`). Difficulty 2.
- **Player sees:** CAM-1 on a pole, the CRANE over three crates, a chute down to a hatch in the
  fence with a face: HINGE. `job.log`: "parcel for you, slot ?-? (smudged by a thumb)."
- **Solution:**
  1. CAM-1 `lens` view → aim at the crates, ZOOM: A-3 "RAISINS (BULK)", B-5 "NOT YOURS.
     REALLY.", C-7 "TO: YOU. FRAGILE-ISH." (goal `find`).
  2. Crane `arm` C-7, `claw` grab, `arm` chute, `claw` drop (goal `chute`). The parcel slides
     and bonks the closed hatch ("the crane fishes it back, sighing").
  3. Talk to HINGE: "I have a parcel coming." → "What if something pinged you?" → "Deal."
     (goal `talk`; typing a line with wire/ping/signal/automat also works).
  4. Place a TIMER. Wire `crane.claw:dropped → timer1 wait 2 s`, `timer1:done → gate.lock
     open`. Drop again (goal `gate`), then take the parcel (goal `take`).
- **Why 2 s:** the drop takes 0.4 s and the slide 2.5 s, so the parcel reaches the hatch at
  2.9 s; HINGE stays open 1 s. `wait 2 s` opens it from 2.0 to 3.0 s. A direct cable (0 to
  1 s), 1 s (1 to 2 s) and 3 s (3 to 4 s) all bonk.
- **Mechanics:** camera scope, events, TIMER (`timer.so`, owned from the start), timing, a
  daemon that grants permission instead of obeying.
- **Unlocks:** the parcel: Moth's key chip (`moth.key`), the fixer's note "nice wiring."
  (LEVELS L2). `uplink.so` now comes from Moth's message in the opening (`opening.ts`); the
  parcel still holds a spare, so older saves and sudo keep it. No hints in the yard (GAME-DATA, Decided).
- **Data:** `data/yard.json` is the reference for every sketch on this page.

Cut from the yard but worth keeping (`lab4`, `lab5`): the **workbench** ("Two sockets, one
press, many burn marks.") and its recipes: timer + relay = DELAY ("Your own box. A timer and a
relay, taped together with confidence."), lamp + relay = BLINKER ("it blinks when pinged. purely
decorative. like you."), speaker + timer = ALARM ("you are now punctual."), lamp + timer =
NIGHTLIGHT ("the yard feels safer. it is not."), relay + speaker = DOORBELL ("HINGE finds this
tacky."), lamp + speaker = DISCO ("nobody asked."). The format keeps `bench` for its return.

---

## Level 4: Downtown II, the rooftops

### P08 Rotation is not security (rooftop relay 0x31)

- **Scene · spot:** Downtown, the relay on the low roof (jump from the dumpster, legs.so). Main
  path. Difficulty 2.
- **Player sees:** ROOFTOP RELAY 0x31 · REGISTRY UTILITIES. A `log` noun with a trace meter
  (the first one in the game, slow and forgiving).
- **Solution:** READ `notes.txt`: "maint: password rotated per policy 7. new password = old
  password, reversed. -J" The keyring already holds `vrify`; the deck offers a fragment tool
  `reverse` (new: drag a fragment onto a rule to make a new fragment): `yfirv`. Drag it onto
  `login`. Trying `vrify` gets "ACCESS DENIED. That was the old one. Policy 7 says rotate."
  While you work, the trace fills; the relay is pre-wired `log:entry → archive.store save`.
  Cut that cable (or finish in time). The sector unfolds: `gate.memo`, `root.frag`, and the
  relay's `uplink`.
- **Mechanics:** a pattern as a clue (fragment + rule), first trace and log, cutting a
  pre-wired cable to stay unseen, LINK `scan`.
- **Unlocks:** node 0x31 controlled ("ACCESS GRANTED. Rotation is not security. Noted."); `gate.memo`
  ("NEON MARKET GATE: scanner signature required. Scanner modules are sold in the Market. Irony
  noted."); `root.frag` ("root fragment 1/7 · 9f2c 41ab e07d 3c55 · keep it."), the first of
  seven for the antenna (Act II). With `uplink.so` (from the yard) installed, `scan` on the
  relay's uplink shows the street's net: FRIENDNET, MAGLEV, WEATHER SAT, UNDERNET, and DISPATCH
  as a guarded silhouette.
- **Fixer hints** (keep): "Admins write everything down. Read their notes." / "Rotation policies
  are lazy. Same password, different direction."
- **Data sketch:**

The log fills the trace at 2.5 %/s (40 s from empty to full) while you are inside the relay, as
long as its cable to the archive is there; each wrong guess adds 15 %.

```json
{ "id": "relay", "name": "ROOFTOP RELAY 0x31",
  "nouns": [
    { "id": "notes.txt", "kind": "STORE", "verbs": ["read"], "on": { "read": { "do": [{ "give": "rule.reverse" }], "say": ["cat notes.txt", "maint: password rotated per policy 7. new password = old password, reversed. -J"] } } },
    { "id": "log", "kind": "LOG", "verbs": ["read"], "events": ["entry"], "log": { "rate": 2.5, "archive": "archive.store" },
      "on": { "read": { "say": ["cat log", "visitor: unknown. recording: yes. archive: nightly."] } } },
    { "id": "login", "kind": "GUARD",
      "guard": { "password": "yfirv", "trace": 15,
        "near": { "vrify": ["login maint vrify", "ACCESS DENIED. That was the old one. Policy 7 says rotate.", "err"] },
        "say": ["login maint *****", "ACCESS GRANTED. Rotation is not security. Noted.", "ok"],
        "do": [{ "effect": "node.free" }, { "goal": "relay" }] } },
    { "id": "gate.memo", "kind": "STORE", "sector": "maint", "verbs": ["read", "copy"], "on": { "read": { "say": ["cat gate.memo", "NEON MARKET GATE: scanner signature required. Scanner modules are sold in the Market. Irony noted."] }, "copy": { "say": ["cp gate.memo ~/deck", "copied. irony included."] } } },
    { "id": "root.frag", "kind": "STORE", "sector": "maint", "verbs": ["read", "copy"], "on": { "read": { "say": ["cat root.frag", "root fragment 1/7 · 9f2c 41ab e07d 3c55 · keep it."] }, "copy": { "do": [{ "give": "root.frag.1" }], "say": ["cp root.frag ~/deck", "root fragment 1/7. keep it.", "ok"] } } },
    { "id": "uplink", "kind": "LINK", "sector": "maint", "link": { "reach": ["friendnet", "maglev", "weathersat", "undernet", "dispatch"] } }],
  "sectors": [{ "id": "maint", "label": "maintenance", "seal": { "guard": "login" } }] },
{ "id": "archive", "name": "ARCHIVE", "nouns": [{ "id": "store", "kind": "STORE", "verbs": ["save"], "on": { "save": { "say": ["{via}archive save", "your visit, filed.", "dim"] } } }] }
```
```json
"cables": [{ "from": "relay.log:entry", "to": "archive.store", "verb": "save" }],
"keyring": [
  { "id": "rule.reverse", "kind": "rule", "label": "policy 7 (-J)", "rule": "reverse" },
  { "id": "root.frag.1", "kind": "fragment", "label": "root fragment 1/7", "text": "9f2c41abe07d3c55" }
]
```

Drag `vrify` onto `policy 7` on the keyring and `reverse(vrify)` (`yfirv`) appears; drag that
onto `login`, or type it.

---

## Level 5: Moth's place (the net)

**Built (2026-10-15):** `data/moth.json` + `game/moth/`. Flat 4C, through the residents' door next to
Downtown's metro stairs (`DOORS.moth`, 1496), with Moth's key chip from the yard's parcel; without
it the door refuses ("RESIDENTS ONLY. PRESENT KEY CHIP."). In the flat: the hall table (the
Registry's reallocation notice), the corkboard over the unused fishing rod, the record player, Moth's
rig, Sprat's tank (Pixel's warm spot: the lid), Fern in a smart pot, and the answering machine with
Moth's three-part message.

*Teaches: a key chip opening a sealed sector, hops across nodes, the watchdog, SWITCH, reading a
story out of systems.* (LEVELS L3)

### P09 Gone fishing (not fishing)

**Built** (`data/moth.json`, scene `moth`, 2026-10-15). Differences from the sketch below: the line
out is Moth's rig in the flat (`desk.net`, a LINK with `when: uplink`: the `uplink` chip from the
yard's parcel); the rig's own screen refuses a local login ("friends come in through FRIENDNET").
FRIENDNET's `home` LINK reaches MOTH-PC. The drawer holds `notes.txt` (Moth's hints for P10),
`photos` (gives `sprat`) and `switch.so`. No NEOBANK link yet (P11 is not built).

- **Scene · spot:** the net: FRIENDNET, then MOTH-PC. Main path. Difficulty 2.
- **Player sees:** FRIENDNET, a chat service where every status line is a little too honest.
  Moth: "gone fishing (not fishing)". You: "{handle}: pretending to be busy". The fixer:
  "serving noodles to the dead". A contact called REGISTRY-WD: "just checking".
- **Solution:** `connect` FRIENDNET (from the relay's uplink). READ Moth's profile; its `home`
  LINK noun `connect`s MOTH-PC. MOTH-PC shows a core, a `motd` ("if you're not my friend, go
  away. if you are, you know where the key is.") and two sealed sectors: `drawer` and `journal`.
  The key chip from the yard opens `drawer`: notes, `photos`, and `switch.so`. Install it.
- **Mechanics:** scan/connect hops, a key chip seal, a module found in the story.
- **Unlocks:** `switch.so` (sets `foundIn` in `logic.json`; answers GAME-DATA's open question 2).
  The photos hold clues for P10 and P11:
  - "SPRAT, day 1. (he's a fish. he's fine.)" → fragment `sprat`
  - "karaoke, the usual booth. our song: *High, Low, Middle*. yes the title is the tune. you
    sang it wrong." → the seal order for P10
- **Data sketch:**

MOTH-PC is a node (the level's scene file `nodes`, reached from FRIENDNET's `home` LINK; see the
note under P11). Installing `switch.so` is a `give`; `logic.json` then says `"foundIn":
"mothnet"` (that scene's id) for it, and the check holds the two together.

```json
{ "id": "mothpc", "name": "MOTH-PC", "look": "A computer that smells of solder and fish food.",
  "nouns": [
    { "id": "motd", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat motd", "if you're not my friend, go away. if you are, you know where the key is."] } } },
    { "id": "photos", "kind": "STORE", "sector": "drawer", "verbs": ["read"], "on": { "read": { "do": [{ "give": "sprat" }], "say": ["cat photos", "SPRAT, day 1 (he's a fish. he's fine.) · karaoke: our song, High, Low, Middle."] } } },
    { "id": "switch.so", "kind": "STORE", "sector": "drawer", "verbs": ["read", "install"], "on": {
      "read": { "say": ["cat switch.so", "[logic module] SWITCH. install to use."] },
      "install": { "do": [{ "give": "switch.so" }] } } },
    { "id": "journal.txt", "kind": "STORE", "sector": "journal", "verbs": ["read"], "on": { "read": { "say": "journal.last" } } }],
  "sectors": [
    { "id": "drawer", "label": "drawer", "seal": { "key": "moth.key" } },
    { "id": "journal", "label": "journal", "seal": { "sequence": ["high", "low", "mid"], "withinMs": 1500, "signal": true } }] }
```
```json
"keyring": [{ "id": "sprat", "kind": "fragment", "label": "Moth's fish", "text": "sprat" }]
```

(The song order is not a keyring item: it is a line you read and remember, *High, Low, Middle*.)

### P10 Moth's song seal

**Built** (`data/moth.json`), tightened so the watchdog and the SWITCH matter. The song source is
the RECORD PLAYER in the flat: a CLOCK `record` that raises `played` every **2 s** (no pre-wired
cable). The song takes 2.45 s to ring through two `wait 1 s` timers, longer than the loop, so a
chain straight from the record always talks over itself (the next `high` lands before `mid`) and
never opens; so does a switch that is only open while the dog is away. What works:
- **one song per absence:** `mothpc.watchdog:leaves → switch1 turn on`, `turntable.record:played →
  switch1 pass`, `switch1:out → mothpc.journal high` and `→ timer1 wait 1 s`, `timer1:done →
  mothpc.journal low`, `→ timer2 wait 1 s` and `→ switch1 turn off` (a noun cannot wire to itself,
  so a timer shuts the switch), `timer2:done → mothpc.journal mid`;
- or, without the music: `mothpc.watchdog:leaves` straight into the same timer chain.
Watchdog: FRIENDNET ↔ MOTH-PC, `dwellMs` 4000, `moveMs` 2000 (8 s away). Moth's `notes.txt` hints
the first ("one song at a time", "open it when the dog leaves. shut it behind the first song").
The journal's last entry gives the keyring fragment `washer3` ("Moth's jacket": "washer 3, market
laundromat"), which P13's laundromat can read.

- **Scene · spot:** MOTH-PC, the `journal` sector. Main path. Difficulty 4.
- **Player sees:** the journal's seal is a noun with three bells as verbs, `high`, `low`, `mid`
  (the engine's sequence seal: it says "seal: 1 of 3", "wrong order. it resets"). It ignores
  fingers: only signals ring it. The RECORD PLAYER's `turntable.record` CLOCK raises `played`
  every 2 s, with no initial cable. The REGISTRY watchdog walks FRIENDNET ↔
  MOTH-PC: here 4 s, away 8 s. While it sits on MOTH-PC every signal into it is dropped, and when
  it arrives the seal forgets what it heard.
- **Current solution:** high, low, middle, about a beat (1 s) apart. Use the single-song SWITCH
  wiring or direct watchdog-event timer chain above. Leaving a switch on throughout the dog's
  absence is insufficient: the two-second record loop overlaps the song and resets the seal.
- **Mechanics:** a sequence seal, SWITCH, TIMER chains with fan-out, the watchdog's events, a clue
  from a photo caption.
- **Unlocks:** the journal. Moth booked the maglev to the harbor ("where the Registry doesn't
  look: the water"). Last entry: "your pass is in my jacket. the jacket's in washer 3 at the
  market laundromat. nobody searches a wash cycle. follow the trains." This sends the player to
  the market gate (P12) before the metro; LEVELS L3's ending moves to after P13.
- **Current data:** `data/moth.json` defines `turntable.record` with `clock.every: 2000` and
  event `played`, MOTH-PC's journal sequence `["high", "low", "mid"]` with `withinMs: 1500`
  between notes and `signal: true`, and the FRIENDNET/MOTH-PC watchdog (`dwellMs: 4000`,
  `moveMs: 2000`). The earlier four-second music-box sketch is superseded.

FRIENDNET shows the watchdog as a contact: its engine noun `watchdog` (`read`: "REGISTRY
WATCHDOG: here. just checking."), with the events `arrives` / `leaves` the solution wires from.

### P11 Who paid for whose ticket (NEOBANK)

- **Scene · spot:** the net, NEOBANK (reached from MOTH-PC's `bank` link). Optional, strongly
  hinted. Difficulty 3.
- **Player sees:** NEOBANK's login for "moth", password hint: "who I feed + when I hatched".
  NEO, the banking assistant, a chatbot with feelings ("Hi! I'm NEO. I'm fine. Thanks for not
  asking."). A `log` noun with a trace that fills faster than the relay's, and the watchdog
  visits NEOBANK too.
- **Solution:** three fragments from three places: `sprat` (photo caption, P09), `0412` (a
  FRIENDNET message on Moth's wall: "happy hatch day, moth!! 0412 forever"), and the pattern
  from the hint. Combine `sprat` + `0412`, try it
  on `login`. Wrong guesses lock the guard for 20 s and add trace. Inside, cut `log:entry →
  archive.store save` or turn its flow off with a SWITCH while you read.
- **Mechanics:** clue fragments from three places, combining fragments, trace, the watchdog, a
  daemon you can talk to.
- **Unlocks:** the story in the records:
  - "MAGLEV · 2 × single to HARBOR · one in the name of {handle}"
  - "LAUNDROMAT, NEON MARKET · washer 3 · 9 cycles prepaid"
  - "NOODLE STALL · tab for {handle} · 20 bowls prepaid"
  Show the fixer: "Moth paid your tab. Twenty bowls. Sentimental idiot." (+5 tokens).
  Balance line: "MOTH: 3 tokens and a dream."
- **Data sketch:**

The log fills at 5 %/s (20 s to full); each wrong guess adds 25 % and locks the login for 20 s.
`sprat` + `0412` dragged together on the keyring make `moth.pass` (a recipe, so the chip has a
good name); typing `sprat0412` works too.

```json
{ "id": "neobank", "name": "NEOBANK",
  "nouns": [
    { "id": "hint", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat hint", "password hint: who I feed + when I hatched"] } } },
    { "id": "login", "kind": "GUARD", "guard": { "password": "sprat0412", "lockMs": 20000, "trace": 25,
      "say": ["login moth *********", "Welcome back, Moth. You look different.", "ok"], "do": [{ "goal": "bank" }] } },
    { "id": "log", "kind": "LOG", "verbs": ["read"], "events": ["entry"], "log": { "rate": 5, "archive": "archive.store" },
      "on": { "read": { "say": ["cat log", "session: moth. device: unfamiliar. NEO is worried."] } } },
    { "id": "neo", "kind": "DAEMON", "verbs": ["talk"], "on": { "talk": { "do": [{ "open": "talk" }] } } },
    { "id": "statement", "kind": "STORE", "sector": "statements", "verbs": ["read", "copy"],
      "on": { "read": { "say": "bank.statement" }, "copy": { "do": [{ "give": "tab.receipt" }], "say": ["cp statement ~/deck", "copied. the fixer will want to see this."] } } }],
  "sectors": [{ "id": "statements", "label": "statements", "seal": { "guard": "login" } }] }
```
```json
"cables": [{ "from": "neobank.log:entry", "to": "archive.store", "verb": "save" }],
"keyring": [
  { "id": "hatch", "kind": "fragment", "label": "Moth's hatch day", "text": "0412" },
  { "id": "moth.pass", "kind": "fragment", "label": "moth's password", "text": "sprat0412", "from": ["sprat", "hatch"] },
  { "id": "tab.receipt", "kind": "key", "label": "Moth's tab receipt" }
]
```

These nodes (FRIENDNET, MOTH-PC, the music box, NEOBANK) belong to the level's own scene file
(`nodes` in, say, `mothnet.json`), not `net.json`: they need its goals, dialogue (NEO) and
watchdog. A node in `net.json` may only use the engine and its own state.

---

## Level 6: Downtown III, the Neon Market gate (Downtown's finale)

### P12 The Neon Market gate

**Built, with stand-ins** (`downtown.json`): DISPATCH's shields are a `sequence` seal (lock the
rings outer, middle, inner, each within 2.5 s; its `manual` says "from the outside in") until the
rings toy exists, then the `shields` sector's seal becomes a toy GUARD (data only). COPY is the
verb `send to dlv9` on DISPATCH's `routes`. DLV-9 drives (`dlv.drive`): the scanner reads it on the
way, the pre-wired cables open the lock and shut it behind it; cut `door:passed → lock shut`,
send it out again (`follow you`), the gate stays open: Downtown's end screen, and the gate is the
market's door from then on. The lock only opens on the scanner's word (a TIMER wired to it is told
off). DLV-9's `hatch` gives the left glove (a key chip). Not used yet: the watchdog.

- **Scene · spot:** Downtown, the west end: the NEON MARKET GATE, and DLV-9, a lost delivery
  robot by the dumpster. Main path. Difficulty 4.
- **Player sees:** the gate wants a scanner signature ("ACCESS DENIED. Scanner signature
  required. Passwords are so last decade."). Its schematic: `scanner` SENSE (event `matched`),
  `lock` ACT, `door` SENSE (event `passed`), `deliveries.log`, and two pre-wired cables:
  `scanner:matched → lock open` and `door:passed → lock shut`. `deliveries.log`: "expected:
  DLV-9 (dumplings), overdue 41 days. registered robots need no scanner module."
- **DLV-9** (`lab3`): status "lost". `eyes`: "you. a pigeon. you again." `route.dat`:
  "destination 'somewhere warm'. ETA: never." `wheels`: go home ("does not know where home is.
  it spins hopefully."), follow you ("you have a friend now."), spin ("wheee. (flatly)").
  `hatch` open: "inside: one glove. left hand." `speaker`: "I AM NOT LOST." (it is). `uplink`
  → DISPATCH, guarded.
- **Solution:**
  1. `connect` DLV-9's `uplink`: DISPATCH has a guard. `probe` it: the shield rings toy.
  2. Inside DISPATCH, READ `routes`: "DLV-9 → NEON MARKET · DUMPLINGS (warm)". COPY the route
     into DLV-9's `route.dat` ("DLV-9 knows where it is going. it is overjoyed. flatly.").
  3. `wheels` go home: DLV-9 rolls west to the gate. The scanner matches its signature, the
     lock opens, DLV-9 passes, the pre-wired `door:passed → lock shut` closes it in your face.
  4. Read the wiring, cut `door:passed → lock shut` first, send DLV-9 again (it went in; send
     it out with `wheels` follow you, it comes back to you). The gate opens and stays open.
- **Shield rings** (the guard toy, `lab3` §08): three rings spin around a core; lock the outer
  one when its gap passes the port at the top, then the next. Tuning from the lab: rings at
  radius 62/46/30, start angles 30/150/260°, speeds 70/−95/120 °/s, gap 50°, tolerance ±20°. A
  miss: "shield 2 flinched. it spins the other way now." (reverses, 15 % faster, max 220 °/s).
  Two cards, once each: SLOW (0.35× for 4 s, "shields slowed for 4 seconds.") and PING ("the
  next gap shows wider.", ±38°). Win: "guard down. DISPATCH uplink reachable." Built as the
  engine's `rings` toy (GAME-DATA.md, **Lock toys**); the cards are keyring items of kind `card`,
  handed out wherever the story likes (an UNDERNET rumour, the fixer for a token).
- **Mechanics:** guard toy (rings), COPY between nodes, a device you steer, pre-wired cables to
  read and cut, the world reacting (DLV-9 drives in the scene).
- **Unlocks:** the Neon Market. Ends Downtown's arc; `objective()`'s last goal `gate`. Keep the
  fixer's remark: "The Market is west. Their gate wants a scanner signature. That's tomorrow's
  problem." (before), and add after: "A delivery robot. Of course. Nobody checks the help."
- **Data sketch:**

```json
{ "id": "gate", "name": "NEON MARKET GATE",
  "nouns": [
    { "id": "scanner", "kind": "SENSE", "verbs": ["read"], "events": ["matched"], "on": { "read": { "say": ["cat scanner", "signatures on file: delivery robots, staff. you: no."] } } },
    { "id": "lock", "kind": "ACT", "verbs": ["open", "shut"], "current": "gateOpen", "on": {
      "open": [{ "if": "!signal", "say": ["use lock --open", "ACCESS DENIED. Scanner signature required. Passwords are so last decade.", "err"] },
               { "do": [{ "set": "gateOpen", "to": true }], "say": ["signal → lock --open", "the gate slides open.", "ok"] }],
      "shut": { "do": [{ "set": "gateOpen", "to": false }], "say": ["{via}use lock --shut", "clunk. shut.", "dim"] } } },
    { "id": "door", "kind": "SENSE", "verbs": ["read"], "events": ["passed"], "on": { "read": { "say": ["cat door", "counts what goes through. today: nothing."] } } },
    { "id": "deliveries.log", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat deliveries.log", "expected: DLV-9 (dumplings), overdue 41 days. registered robots need no scanner module."] } } }] },
{ "id": "dlv9", "name": "DLV-9", "look": "A delivery robot. Lost. Says it isn't.",
  "nouns": [
    { "id": "route.dat", "kind": "STORE", "verbs": ["read", "copy"], "on": { "read": [
      { "if": "routeFixed", "say": ["cat route.dat", "destination: NEON MARKET · DUMPLINGS. ETA: soon. (it is beside itself)"] },
      { "say": ["cat route.dat", "destination \"somewhere warm\". ETA: never."] }] } },
    { "id": "wheels", "kind": "ACT", "verbs": ["go home", "follow you", "spin"], "on": { "go home": { "do": [{ "effect": "dlv.drive" }] } } },
    { "id": "hatch", "kind": "ACT", "verbs": ["open", "close"], "on": { "open": { "do": [{ "give": "glove.left" }], "say": ["use hatch --open", "hatch: open. inside: one glove. left hand."] }, "close": { "say": ["use hatch --close", "hatch: shut. the glove stays with you.", "dim"] } } },
    { "id": "uplink", "kind": "LINK", "link": { "reach": ["dispatch"] } }] }
```

DISPATCH is a node (Downtown's `nodes`): `connect` brings it onto the board, sealed behind its
shields.

```json
{ "id": "dispatch", "name": "DISPATCH", "look": "Every delivery robot's boss. Behind three spinning shields.", "status": "routing",
  "nouns": [
    { "id": "shields", "kind": "GUARD",
      "guard": { "toy": "rings", "rings": { "rings": [
          { "speed": 70, "gap": 50, "start": 30 }, { "speed": -95, "gap": 50, "start": 150 }, { "speed": 120, "gap": 50, "start": 260 }], "tolerance": 20 },
        "say": ["probe dispatch", "guard down. DISPATCH uplink reachable.", "ok"] } },
    { "id": "routes", "kind": "STORE", "sector": "routes", "verbs": ["read", "copy"], "on": {
      "read": { "say": ["cat routes", "DLV-9 → NEON MARKET · DUMPLINGS (warm)"] },
      "copy": { "do": [{ "set": "routeFixed", "to": true }], "say": ["cp routes/dlv9 dlv9:route.dat", "copied. DLV-9 knows where it is going. it is overjoyed. flatly.", "ok"] } } }],
  "sectors": [{ "id": "routes", "label": "routes", "seal": { "guard": "shields" } }] }
```
```json
"cables": [
  { "from": "gate.scanner:matched", "to": "gate.lock", "verb": "open" },
  { "from": "gate.door:passed", "to": "gate.lock", "verb": "shut" }
],
"keyring": [
  { "id": "glove.left", "kind": "key", "label": "a glove (left)" },
  { "id": "card.slow", "kind": "card", "label": "SLOW", "card": "slow" },
  { "id": "card.ping", "kind": "card", "label": "PING", "card": "ping" }
]
```

`dlv.drive` (new effect) moves DLV-9 in the scene; arriving at the gate raises `scanner:matched`,
passing raises `door:passed`.

---

## Level 7: the Neon Market

The market scene (`scene:market`): "The night market. Cash, noise and nobody looking up."
Stalls (SIM CARDS, UMBRELLAS, USED IMPLANTS, REPAIRS, FIRMWARE, DUMPLINGS, CLOSING DOWN), the
fishmonger ("Fresh today." / "Which today, I did not say."), MARKET RULES ("1. No cameras. 2.
See rule 1." / "3. Haggling is mandatory. 4. Prices are not."). From `scenes`: the decrypting
billboard, neon RAMEN, KEYS CUT (one dead letter), NO CAMERAS, and the sign painter on her
scaffold (Act II).

### P13 Washer 3 (the laundromat)

**Built** (`data/laundromat.json`, `laundromat/`), as below, with these choices:
- The laundromat is its own scene, its door in the market between the umbrellas and the fruit
  (the market rules hang on its wall). Inside: four washers, the breaker with its conduits drawn
  in the wall, the schedule box (counts down to the next slot), SUDS on a post, FOLD-O at the
  folding table, the owners of washers 1, 2 and 4 waiting (the one on washer 2 saw Moth leave the
  jacket), a cat on the sill, a soap dispenser, the Registry's 72-hour notice, a lost-sock board.
- The schedule is a slot every 24 s (first after 3 s); a cycle takes 5 s (`tuning.cycleMs`); the
  breaker resets itself 3 s after a trip (or by hand, `reset`). Washer 3 is not on the schedule.
- Fingers start nothing and stop nothing: SUDS refuses (`suds.start`, `suds.prepaid`: "prepaid
  cycles start when a machine finishes", and `suds.cancel`: the crime-and-sin line). The washers'
  everyday actions are read / start it / stop it, so both refusals are one tap away.
- **House rule 4: doors open when the queue is clear.** Washer 3's door releases only once all
  four washes are done, so skipping a stranger (cutting their slot and never starting them) does
  not work: "door held: 2 still waiting". Any order with at most two running works.
- The jacket (washer 3's `door`, `open`): the item `maglev.pass` (HELD; what P14's brake checks),
  the keyring key chip `glove.right` (the twin of DLV-9's `glove.left`), the save flag `p13`. With
  both gloves the fixer has his line once (`flags.gloves`).
- Code: `washer.run`, `washer.stop`, `washer.take` (laundromat/rules.ts) and two engine hooks for
  effects, `SceneModel.carry` (items) and `SceneModel.flag` (save flags).

- **Scene · spot:** the market, a laundromat between the stalls (new spot; LEVELS "more
  puzzles"). Main path. Difficulty 4.
- **Player sees:** four networked washers on one breaker that trips above two running machines.
  Washer 3: "door locked · 1 cycle left · contents: 1 jacket (prepaid)". Washers 1, 2 and 4 hold
  strangers' laundry with their own queues. The laundromat's schedule is pre-wired: `clock:open
  → washer1 start`, `→ washer2 start`, `→ washer4 start`, and `breaker:tripped → every washer
  stop`. SUDS, the laundromat daemon, guards the queues.
- **Solution:** at opening every machine starts, the breaker trips, nothing finishes, washer 3
  never runs. Cancelling a stranger's wash is not allowed (SUDS: "Cancelling a stranger's wash
  is a crime in fourteen districts and a sin in all of them."). Stagger them so at most two run
  and all four finish: cut the clock's cables to washers 2 and 4; wire `washer1.drum:done →
  washer3.drum start`, `washer3.drum:done → washer2.drum start`, `washer2.drum:done →
  washer4.drum start` (any chain with two at a time works). Washer 3 opens.
- **Mechanics:** several machines on one constraint, chaining `done` events, pre-wired schedule,
  a daemon that forbids the easy way.
- **Unlocks:** Moth's jacket: a maglev pass (`maglev.pass` chip) and the right-hand glove ("a
  glove. right hand. somewhere a left one is lonely."). With DLV-9's left glove (P12), a tiny
  payoff line from the fixer: "Moth's gloves. Moth loses one of everything."
- **Data sketch:**

```json
{ "id": "washer3", "name": "WASHER 3", "status": [{ "if": "w3Done", "then": "door open", "else": "door locked · 1 cycle left" }],
  "nouns": [
    { "id": "drum", "kind": "ACT", "verbs": ["start", "stop"], "events": ["done"], "on": { "start": { "do": [{ "effect": "washer.run" }] }, "stop": { "do": [{ "effect": "washer.stop" }] } } },
    { "id": "queue", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat queue", "1. jacket (prepaid, 9 cycles) · 1 left"] } } }] },
{ "id": "breaker", "name": "BREAKER", "nouns": [{ "id": "load", "kind": "SENSE", "verbs": ["read", "reset"], "events": ["tripped"],
  "on": { "read": { "say": ["cat load", "running: {running}/2. it has opinions about three."] }, "reset": { "say": ["use load --reset", "reset. it sighs in amps."] } } }] },
{ "id": "suds", "name": "SUDS", "nouns": [{ "id": "suds", "kind": "DAEMON", "verbs": ["talk"], "on": { "talk": { "do": [{ "open": "talk" }] } } }] },
{ "id": "clock", "name": "OPENING HOURS", "nouns": [{ "id": "clock", "kind": "CLOCK", "events": ["open"], "clock": { "every": 30000, "first": 2000 } }] }
```

The breaker's stop goes to every washer by fan-out (decided: one event, several cables). It is
wired in the walls, so those four are `fixed`: the puzzle is the schedule, not the breaker.

```json
"cables": [
  { "from": "clock.clock:open", "to": "washer1.drum", "verb": "start" },
  { "from": "clock.clock:open", "to": "washer2.drum", "verb": "start" },
  { "from": "clock.clock:open", "to": "washer4.drum", "verb": "start" },
  { "from": "breaker.load:tripped", "to": "washer1.drum", "verb": "stop", "fixed": true },
  { "from": "breaker.load:tripped", "to": "washer2.drum", "verb": "stop", "fixed": true },
  { "from": "breaker.load:tripped", "to": "washer3.drum", "verb": "stop", "fixed": true },
  { "from": "breaker.load:tripped", "to": "washer4.drum", "verb": "stop", "fixed": true }
]
```

### O05 DON'T TRUST. VERIFY. (the market billboard)

- **Scene · spot:** the market, the big billboard over the stalls (`scenes`: "decrypting…" then
  "[SIG OK]"). Optional. Difficulty 2.
- **Player sees:** the billboard scrolls `KVU'A AYBZA. CLYPMF.` Its `cipher` guard opens the
  cipher wheel toy (`lab1` #2: drag the rotor, the letter in the lens).
- **Solution:** the shift is 7 (policy 7, again: the box README, the relay notes). Turn the
  wheel by 7 and the line reads DON'T TRUST. VERIFY. A second line decrypts to the sign
  painter's handle (Act II hook: she is the one who sees everything from her scaffold).
- **Mechanics:** cipher wheel guard toy, a running joke as the clue.
- **Unlocks:** the billboard's REGISTRY signature [SIG OK] goes to the mesh: node controlled.
- **Data sketch:**

```json
{ "id": "mbillboard", "name": "MARKET BILLBOARD", "nouns": [
  { "id": "screen", "kind": "SENSE", "verbs": ["read"], "on": { "read": { "say": ["cat screen", "KVU'A AYBZA. CLYPMF."] } } },
  { "id": "cipher", "kind": "GUARD",
    "guard": { "toy": "cipher", "cipher": { "text": "KVU'A AYBZA. CLYPMF.", "shift": 7 }, "lockMs": 8000,
      "say": ["rotor --shift 7", "DON'T TRUST. VERIFY. [SIG OK]", "ok"], "do": [{ "effect": "node.free" }] } }] }
```

Reading it out at the wrong shift is a wrong guess (locked 8 s), so spinning through all 26 and
guessing costs time; the clue is policy 7.

---

## Level 8: the metro and the train

`scene:metro`: "One line, one station, and a train that never says where it goes." DEPARTURES
("NEXT TRAIN: NOW." / "It has said NOW since the day it was installed. It beats the
timetable."), LINE MAP ("LINE 0. All stops: PLAZA CENTRAL." / "A loop of one."), the POSTER
("REGISTRY PREMIUM: your commute, counted." / "Free for the first lifetime."), MIND THE GAP, a
bench with someone who has given up waiting. `scene:train`: "Nobody checked a ticket, which means
somebody checked everything else." Ad cards: LOSE WEIGHT: DELETE PROFILE · AD SPACE · YOU ARE
READING IT · SMILE · YOU ARE ON CAMERA. CAR 3 OF 3. EMERGENCY BRAKE.

### P14 The stop that isn't on the map

- **Scene · spot:** metro platform → train, the emergency brake in car 3. Main path.
  Difficulty 3.
- **Player sees:** the turnstile takes the maglev pass (key chip from P13). On the train, the
  MAGLEV node (`scan` from the departures board) lists PLAZA CENTRAL only. TRAIN-0's schematic:
  `position` SENSE with events `tunnel`, `harbor siding` (an old siding, not on any map; like
  LIFT-2's floor 13), `brake` ACT, `emergency.reg` STORE, `doors` ACT, and a pre-wired cable
  `brake:stopped → doors lock` ("for your safety, doors stay shut between stations").
- **Solution:** READ the brake plate: "Pull only in an emergency." / "Emergencies must be
  registered at least 48 hours in advance." READ `emergency.reg`: "#0451 · registered by MOTH ·
  2 days ago · reason: a friend needs to get off at the harbor. they'll know when." The brake
  accepts a pull because the emergency exists. Wire `position:harbor siding → brake pull` (by
  hand you are always too early or too late; the siding flashes past in under a second). Then
  cut `brake:stopped → doors lock` and wire `brake:stopped → doors open`.
- **Mechanics:** timing that rides a loop in the world (the train's route), a STORE that
  authorises an ACT, a pre-wired safety cable to replace.
- **Unlocks:** the harbor. Moth planned this two days ago; the player feels it.
- **Data sketch:**

```json
{ "id": "train", "name": "TRAIN-0", "look": "LINE 0. It goes round. It never says where.",
  "nouns": [
    { "id": "position", "kind": "SENSE", "verbs": ["read"], "events": ["tunnel", "harbor siding"], "on": { "read": { "say": ["cat position", "between PLAZA CENTRAL and PLAZA CENTRAL."] } } },
    { "id": "emergency.reg", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat emergency.reg", "#0451 · registered by MOTH · 2 days ago · reason: a friend needs to get off at the harbor. they'll know when."] } } },
    { "id": "brake", "kind": "ACT", "verbs": ["pull"], "events": ["stopped"], "on": { "pull": { "do": [{ "effect": "train.brake" }] } } },
    { "id": "doors", "kind": "ACT", "verbs": ["open", "lock"], "on": { "open": { "do": [{ "effect": "train.doors" }] } } }] }
```
```json
"cables": [{ "from": "train.brake:stopped", "to": "train.doors", "verb": "lock" }]
```

`train.brake` (new effect) stops the train where it is: at the siding the harbor exit appears;
anywhere else "the train stops in a tunnel. a voice apologises. it restarts." Brake lines: keep
the plate; add "your emergency has been registered. it will be ready in 48 hours."

**As built (2026-10-15):** `data/train.json` (TRAIN-0, its panel by the brake at the end of car 3),
`scenes/train0.ts` (the rules), the ride in `scenes/line.ts`. Differences from the sketch:

- The ride is real (stations Downtown, Galleria, Harbor), so `position` reads where the train is
  ("between GALLERIA and DOWNTOWN. track km 4.2."), not PLAZA CENTRAL. No turnstile, no MAGLEV
  node: the pass is the save's item `maglev.pass` (P13), and the brake checks it. Without it:
  "BRAKE: emergency #0451 is registered to another passenger. pull not accepted.", then "a new
  emergency has been registered in your name. it will be ready in 48 hours." (alternating).
- The siding lies before the harbor station (track unit 5350 of 9000, among the containers).
  The brake has a long braking distance; `harbor siding` fires when a stop would land at the
  siding, about 2 s before it shows in the windows, so by hand you are early or late (about a
  1 s window nobody can see). Wired to `brake pull`, the train brakes to stand exactly at it.
- `doors` take no hand: "manual release disabled". Only a signal opens them, and only at the
  siding (elsewhere: a wall forty centimetres away). The pre-wired `safety` cable
  `brake:stopped → doors lock` must be replaced by `brake:stopped → doors open`.
- Doors open at the siding: the save flag `harbor:open` is set (the harbor lock is off for good),
  and STEP OUT · SIDING leads up a service stair to the harbor (its `metro` exit).
- A stop anywhere else: "the train stops {on the bridge / in the tunnel / …}." then "a voice
  apologises for the delay. the train restarts." The plate is a STORE noun on the device.
- A new regular in the car, the old woman by the door, hints at it: "Nobody plans an emergency.
  Well. Some people do."

### O07 The junction cabinet (patch bay)

- **Scene · spot:** metro, a service cabinet at the end of the platform. Optional. Difficulty 3.
  (`combos` puzzle shelf: "Rewire a junction cabinet so the Registry's feed routes into the
  mesh.")
- **Player sees:** a patch bay (`lab1` #7): inputs `platform cam`, `ads`, `departures`; outputs
  `archive` (Registry), `mesh`, `board`, `speakers`. Pre-wired: platform cam → archive, ads →
  board, departures → speakers. A coffee-stained `cable map`: "board must never go dark.
  commuters riot. (they would sit down. angrily.)"
- **Solution:** platform cam → mesh, ads → archive ("the Registry now archives its own ads. it
  seems pleased."), departures → board (NEXT TRAIN: NOW keeps running). Any patch that leaves the
  board dark: "the departure board goes dark. four people sit down, angrily."
- **Mechanics:** cut and rewire several pre-wired cables under constraints.
- **Unlocks:** a controlled node and the platform camera, which O10 needs.
- **Data sketch:**

```json
{ "id": "cabinet", "name": "JUNCTION CABINET", "nouns": [
  { "id": "cam.in", "kind": "SENSE", "verbs": ["read"], "events": ["frame"], "on": { "read": { "say": ["cat cam.in", "the platform, 24 frames a second, mostly pigeons."] } } },
  { "id": "ads.in", "kind": "SENSE", "verbs": ["read"], "events": ["frame"] },
  { "id": "departures.in", "kind": "SENSE", "verbs": ["read"], "events": ["frame"] },
  { "id": "archive", "kind": "STORE", "verbs": ["save"] },
  { "id": "mesh", "kind": "STORE", "verbs": ["save"] },
  { "id": "board", "kind": "ACT", "verbs": ["show"] },
  { "id": "speakers", "kind": "ACT", "verbs": ["say"] }] }
```
```json
"cables": [
  { "from": "cabinet.cam.in:frame", "to": "cabinet.archive", "verb": "save" },
  { "from": "cabinet.ads.in:frame", "to": "cabinet.board", "verb": "show" },
  { "from": "cabinet.departures.in:frame", "to": "cabinet.speakers", "verb": "say" }
]
```

### O10 The music box (LOST+FOUND)

- **Scene · spot:** metro, the bench, a LOST+FOUND locker wall, the platform camera. Optional.
  Difficulty 3. (LEVELS "more puzzles")
- **Player sees:** the commuter on the bench lost a music box on the train. LOST+FOUND (the
  city's lost-property office; "it has found everything except love") has it in locker 12,
  which opens for the owner's face on the platform camera. The camera only looks at the edge of
  the platform while a train is in (pre-wired `train:arrived → cam pan edge`). Office hours:
  "open: when the train is in. we are a train-based office."
- **Solution:** needs the platform camera (O07). Talk to the commuter: "I stand at the edge
  when it comes. I always do. It never stops for me." Wire `platformcam.lens:sees owner →
  locker12.door open`. Next train: the commuter steps to the edge, the camera sees them, the
  locker opens.
- **Mechanics:** a camera, the train's loop, a person who moves on cue, one cable.
- **Unlocks:** the commuter's thanks and an IDENTITY SCAN signature (1 of 3, Act II).

---

## Level 9: the harbor

`scene:harbor`: "Everything here is in a box, and nobody asks what." PORT AUTHORITY ("All cargo
is inspected." / "Inspected: someone looked at the outside of it."), MANIFEST ("1 container.
Contents: yes." / "Origin: redacted. Destination: redacted. Insurance: void."), NIGHT FERRY
("Departs when full. Arrives eventually." / "Tickets are not sold. They are inferred."), cranes
STS-2 and STS-3, BERTH 9, container stencils NULLROUTE LOGISTICS · CONTENTS: UNDECLARED · THIS
SIDE UP (ANY) · NRLU 404 0451.

### P15 NRLU 404 0451 (built)

- **Scene · spot:** the harbor pier, container stacks, crane STS-2. Main path, end of Act I.
  Difficulty 5. Draft: the reunion and what Moth knows need Tommi's call.
- **Player sees:** STS-2 moves containers onto the night ferry on a loop. The Port Authority
  scanner sweeps each container the crane lifts (pre-wired `scanner:warm → alarm sound`: a
  warm container means a person). The watchdog patrols the harbor nodes. STS-2's camera
  (scope) looks down on the stacks.
- **Solution (draft):** find the container in the scope: zoom on stencils until NRLU 404 0451
  ("404: not found". 0451 is Moth's number again, as in the emergency registration). READ the
  manifest: 0451 is due on the ferry in the next loop and the scanner will find a warm box. Cut
  `scanner:warm → alarm` while the watchdog is away, or re-time STS-2 so 0451 is lifted while
  the scanner is frozen by the watchdog itself (the clever solution: use the enemy's freeze).
  Then talk to the container's reefer panel: Moth answers. "Took you long enough. Did you feed
  Sprat?"
- **Mechanics:** scope, a crane (taught in the yard), pre-wired alarm, the watchdog, trace.
- **Unlocks:** Moth. Act II hooks from `scenes`: the spaceport's pad 7 ("Pad 7 does not
  exist." / "Officially."; the pad robots.txt hides from search), the antenna among the ship
  lanes (the root fragments), the server room where you were revoked ("Identity not found. You
  do not exist. Please hold."; the ending choice `> free` / `> take`).
- **Data sketch:**

```json
{ "id": "sts2", "name": "STS-2", "look": "A gantry crane. It has moved everything. It has asked nothing.",
  "nouns": [
    { "id": "spreader", "kind": "ACT", "verbs": ["lift", "set down"], "events": ["lifted"], "on": { "*": { "do": [{ "effect": "gantry.move" }] } } },
    { "id": "camera", "kind": "SENSE", "verbs": ["view"], "on": { "view": { "do": [{ "open": "camera" }] } } },
    { "id": "schedule", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat schedule", "next lift: NRLU 404 0451 → NIGHT FERRY 7"] } } }] },
{ "id": "port", "name": "PORT AUTHORITY", "nouns": [
    { "id": "scanner", "kind": "SENSE", "verbs": ["read"], "events": ["warm"], "on": { "read": { "say": ["cat scanner", "inspects: the outside of things."] } } },
    { "id": "alarm", "kind": "ACT", "verbs": ["sound"] }] }
```
```json
"cables": [{ "from": "port.scanner:warm", "to": "port.alarm", "verb": "sound" }],
"watchdog": { "route": ["port", "sts2", "ferry"], "dwellMs": 5000, "moveMs": 3000 }
```

The clever solution needs nothing new: while the watchdog sits on PORT AUTHORITY, nothing
leaves it (`watchdog.mute`), so a `warm` raised then never reaches the alarm. Wire
`port.watchdog:arrives → timer1 wait 1 s → sts2.spreader lift` and 0451 goes up inside the
freeze.

**As built (2026-10-15):** `data/stacks.json`, `stacks/` (`rules.ts`, `scope.ts`, `scene.ts`,
`index.ts`), `scenes/warehouse.ts`, `cutscenes/act2.ts`, `contacts.ts`. Differences from the draft
and the choices made:

- **Where:** the harbor pier was full, so the stacks are their own scene, `stacks` (terminal 2,
  berth 4), a second scene of the harbor's place (city.ts `SCENE_PLACE`), through a gate on the pier
  at x 2092 (`[E] TERMINAL 2 · STACKS`). The pier's cranes are now STS-1 (the tea call box) and
  STS-3; STS-2 is the stacks' crane, and the pier's stencilled 0451 became the decoy 0415.
  The left of the scene: the gate booth back to the pier, the Port Authority's board, the lane to
  **warehouse 4**; then blocks A, B, C; STS-2 straddling the quay; the thermal gate; NIGHT FERRY 7
  tied up (you walk onto its deck).
- **Devices:** STS-2 (`camera` → the scope, `schedule`, `spreader` lift / `lifted`), PORT
  AUTHORITY (the thermal gate: `scanner` / `warm`, `log`, `alarm` sound), NIGHT FERRY (`manifest`,
  `horn`), and the reefer NRLU 404 0451 (`panel`, `intercom` → Moth's talk), which is in the world
  only once it stands on the ferry's deck (`rules.place`). Pre-wired: `alarm` (`port.scanner:warm →
  port.alarm sound`) and `clearance` (`ferry.watchdog:leaves → sts2.spreader lift`: the crane lifts
  when the Registry has cleared the ferry). Watchdog: port → sts2 → ferry, 4 s on each, 3.5 s
  walking (a 22.5 s round).
- **Finding it:** STS-2's camera looks down on the roofs of 24 boxes. At ×1 the stencils are
  smudges; ZOOM (×3) reads them; TAG FOR LIFT gives the crane the slot (only B-6, 0451's, is
  accepted: "not on tonight's schedule"). Decoys: NRLU 404 0415, NRLU 044 0451, KSNU 404 1145,
  MRDU 451 0404, HLXU 451 0404. Reefers wear frost on their roofs; 0451 does not (a second clue).
- **Untagged**, each clearance lifts a regular box from the quay chassis into the ferry's hold (the
  gate flashes CLEAR): the crane is always working. **Tagged**, the next clearance lifts 0451 out of
  block B's back row; 2.3 s later it crosses the gate, which says `warm` and (wired) sounds the
  alarm: the lift is aborted and the box goes back (fail, repeatable, no other cost). By hand the
  spreader refuses ("not before, not by hand").
- **Solution 1, cut while it's away:** cut `warm → alarm`. Whenever the watchdog sits on PORT
  AUTHORITY it puts a cut alarm cable back and logs the tamper (+30 % trace on the gate; three
  tampers lock you out of it for 10 s). The lift starts as the dog leaves the ferry and the box
  crosses the gate about 0.8 s before the dog is back on the gate, so a cut made any time after the
  dog has left the gate holds. (It restores the cable again when it arrives: harmless by then.)
- **Solution 2, the clever one:** cut `clearance`, wire `port.watchdog:arrives → sts2.spreader
  lift`: the box crosses the gate inside the dog's 4 s on it; the warm is lost ("scanner warm:
  nothing leaves PORT AUTHORITY while the watchdog sits on it."). A TIMER in between works too.
- **Then:** 0451 is set down on the deck, plugged in; its door is unlatched from inside and Moth
  sits in it. The reefer's `talk` is Moth's dialogue. **Sprat** is Moth's fish (moth.json): "Did you
  feed Sprat?" reads Moth's place's `fed` (derived `spratFed`, through the new `Player.sceneState`)
  and offers "I fed Sprat." or "Sprat is... fine.". An alarm earlier gets its own line ("I bit my own
  sleeve"). The talk: deleted on purpose (Tuesday 03:12, 407 people), Moth took the list, it split
  into seven root fragments (the relay roof had one), the Registry knows Moth has it, the lock is on
  the Spire's antenna, Moth will be on your deck.
- **The ending** (`moth.end`): flags `act1:done`, `heard:spire`, `contact:moth`; the ACT II card
  (`act2` cutscene: the ferry leaving, the Spire across the bay, ACT I · WHERE IS MOTH? FOUND. →
  ACT II · SEVEN FRAGMENTS) plays once the talk is closed (`Player.cutscene`, the game's
  `pendingCut`); NIGHT FERRY 7 leaves (`departed`) and NIGHT FERRY 8 takes the berth. Back in the
  scene: "[deck] MOTH · … · type: msg moth", and the deck's new commands `contacts` / `msg moth`.
- **Life:** gatekeeper, the port inspector (the key person: she explains the gate, the freeze and
  the dog's walk), the signaller, the lasher on the ferry, TALLY-4 the counting drone, a docker on
  his break, a sweeper, a loader robot, the straddle carrier SC-11, two gulls that answer E, a
  pigeon, the night shift's tea urn (`[E] TEA URN`: a cup of tea, the same item STS-1's operator
  likes), the Registry's watchdog flying its round as a drone, tomatoes in paint tins on top of
  block A (the surprise).
- **Warehouse 4** (`warehouse`, place `warehouse`, Harbor & Shore): the forecourt down the lane;
  sealed loading docks, the evidence-custody door (`[E] THE DOOR`: "A PERSON WHO IS NOT FOUND
  CANNOT HOLD A WARRANT."), the plaque, the Registry's notice (backlog: 4 years), the evidence van,
  a Tide hand mending nets (key: "If the Registry ever took something of yours, it's behind that
  door."), a patrol mech, a gull, a pigeon, one shoe with an evidence tag.

---

## Optional side puzzles

### O01 SNACKOMAT

- **Scene · spot:** the corner shop (`scene:shop`), beside THIRST.EXE. Optional practice
  device, there from the start. Difficulty 1. (LEVELS "practice device"; device and lines from
  `lab3`)
- **Player sees:** a vending machine that holds grudges. Outer layer: `coil 4` ("raisins. always
  raisins."), `display` ("OUT OF ORDER (emotionally)"), `grudge.log` ("kicked (2019) · kicked
  (2021) · today: being stared at"), `tray`; a sulking daemon. A sealed `service panel`.
- **Solution:** bring the grudge level from 7 to 0, kindly:
  - TALK apologise: "noted. grudge level 7 → 6."
  - TALK compliment its font: "it's a custom 5×7. thank you. FINALLY." (−2)
  - USE display say sorry: "for what. specifically." (no change; it wants specifics)
  - COPY grudge.log: "copied. you now also hold a grudge. 4 KB." (no change)
  - pipe `grudge.log` to the billboard (O06): "billboard: GRUDGE.LOG in four-metre letters.
    SNACKOMAT is thrilled." (−3)
  - USE coil 4 spin: "clunk. raisins." / spin twice: "clunk clunk. two raisins. it is making a
    point." (+1: it's annoyed)
  At 0 it drops the service key ("the technician left it in coil 4 in 2020. I was saving it as
  leverage."). The key chip opens `service panel`: `prices`, `coils` (spin any coil: not
  raisins), `mood.cfg`.
- **Mechanics:** every verb kind, a daemon, a key chip, a sealed sector; a grudge counter.
- **Unlocks:** a snack that is not raisins, one token, and practice. THIRST.EXE stays a
  readable ("Accepts tokens, coins and regrets." / "The screen says OUT OF ORDER. It is also
  selling drinks. Both are true.") and appears in the grudge log: "THIRST.EXE: looked at me
  funny (daily)".
- **Data sketch:**

```json
{ "id": "snackomat", "name": "SNACKOMAT", "look": "A vending machine. It remembers.", "state": { "grudge": 7 },
  "nouns": [
    { "id": "coil 4", "kind": "ACT", "verbs": ["spin", "spin twice"], "on": { "spin": { "do": [{ "effect": "grudge.add" }], "say": ["use coil4 --spin", "clunk. raisins."] }, "spin twice": { "do": [{ "effect": "grudge.add" }], "say": ["use coil4 --spin-twice", "clunk clunk. two raisins. it is making a point."] } } },
    { "id": "display", "kind": "ACT", "verbs": ["say hi", "say sorry"], "on": { "say hi": { "say": ["use display --say-hi", "display: \"hi.\" (reluctantly)"] }, "say sorry": { "say": ["use display --say-sorry", "display: \"for what. specifically.\""] } } },
    { "id": "grudge.log", "kind": "STORE", "verbs": ["read", "copy"], "on": { "read": { "say": ["cat grudge.log", "kicked (2019) · kicked (2021) · today: being stared at · THIRST.EXE: looked at me funny (daily)"] }, "copy": { "say": ["cp grudge.log ~/deck", "copied. you now also hold a grudge. 4 KB."] } } },
    { "id": "snackomat", "kind": "DAEMON", "verbs": ["talk"], "on": { "talk": { "do": [{ "open": "talk" }] } } },
    { "id": "coils", "kind": "ACT", "sector": "service", "verbs": ["coil 1", "coil 2", "coil 3"], "on": { "*": { "say": ["use coils --{verb}", "clunk. not raisins. a miracle.", "ok"] } } },
    { "id": "mood.cfg", "kind": "STORE", "sector": "service", "verbs": ["read"], "on": { "read": { "say": ["cat mood.cfg", "grudge: {grudge}. font: custom 5×7. font compliments: rare."] } } }],
  "sectors": [{ "id": "service", "label": "service panel", "seal": { "key": "snack.key" } }] }
```

At grudge 0 its dialogue hands over the key with `{ "give": "snack.key" }` and one token with
`{ "give": "tokens", "count": 1 }`.

### O02 CAM-3 is bored

**Built**: CAM-3 on a pole at x 520, its `lens` opens the `cam3` panel (ZOOM, TAG, LOOP); the
penthouse window blinks GHOST in Morse in the feed.

- **Scene · spot:** Downtown, a camera on a pole across from the billboard. Optional; the first
  camera most players meet. Difficulty 1. (`lab3` §04)
- **Player sees:** ● REC CAM-3. READ the lens: the scope. Things under the crosshair: the
  billboard, the penthouse window, the yard door, a pigeon.
- **Solution:** none needed; it is a tool. ZOOM on the billboard: small print ("Terms: forever.
  Cancellation: see Terms."; the lab's "the password is NOT pigeon." fits as a second line).
  ZOOM on the window: "someone blinks a lamp. long, short, long… on purpose?" (O03). ZOOM on
  the yard door: "it says YARD. it is looking back at the camera." ZOOM on nothing: "zoomed
  into: wall. it is a good wall." TAG: "tagged: pigeon #1. it noticed." / "nothing to tag. the
  wall declines." LOOP: "8 hours of the same pigeon. you watch 4 seconds."
- **Mechanics:** camera scope (zoom, tag, loop).
- **Unlocks:** the Morse clue (O03), the feed for Pigeon TV (O06).

### O03 The window that blinks

- **Scene · spot:** Downtown, the one lit window on the penthouse tower's top floor (drawn in
  `game.ts`). Optional. Difficulty 2. (`lab1` #6: "a blinking light in the city spells a
  password in Morse")
- **Player sees:** via CAM-3's zoom, a lamp that blinks in a rhythm. Its device (reachable by
  `scan` from the relay's uplink): `lamp.cfg`: "mode: morse reminder (J keeps forgetting)".
- **Solution:** read the blinks: `--. .... --- ... -` → GHOST. The fragment `ghost` goes on the
  keyring and waits there until O04. (The relay notes are signed "-J"; J is the Registry admin
  who lives up there.)
- **Mechanics:** scope, Morse (the two-key Morse device from `lab1` can be the input to echo
  it back), a fragment carried for a long time.
- **Data sketch:**

Reading the lamp shows the blinks; echoing them back on the Morse toy (`lab1`'s two-key device)
is what makes them yours: the fragment comes from the guard.

```json
{ "id": "jlamp", "name": "SMART LAMP (penthouse)", "nouns": [
  { "id": "lamp.cfg", "kind": "STORE", "verbs": ["read"], "on": { "read": { "say": ["cat lamp.cfg", "brightness 40%, mood 12%. mode: morse reminder (J keeps forgetting)."] } } },
  { "id": "bulb", "kind": "GUARD", "guard": { "toy": "morse", "morse": { "message": "ghost", "unitMs": 240 }, "tries": 3, "lockMs": 6000,
    "say": ["echo --. .... --- ... -", "the lamp blinks back: GHOST. it seems relieved someone listened.", "ok"], "do": [{ "give": "ghost" }] } }] }
```
```json
"keyring": [{ "id": "ghost", "kind": "fragment", "label": "J's lamp", "text": "ghost" }]
```

### O04 J's cryptex

- **Scene · spot:** Downtown, inside the penthouse ("The door has no handle. Only a window, very
  high up."). Optional, late (needs a climbing module from Act II). Difficulty 3. (`combos`:
  "A locked case in the penthouse: the reels hold a five-letter word hidden somewhere in the
  city.")
- **Player sees:** a locked case with five reels (`lab1` #9: the reel count tells the length,
  which is fair).
- **Solution:** GHOST. Inside: the revocation list with your handle on it, and root fragment
  2/7.
- **Mechanics:** cryptex guard toy, a fragment from long ago.
- **Data sketch:** (five reels of six letters each: the reel count tells the length, the reels
  keep the search small and fair)

```json
{ "id": "jcase", "name": "J's CASE", "look": "Five reels. The case of a man who writes everything down.",
  "nouns": [
    { "id": "reels", "kind": "GUARD", "guard": { "toy": "cryptex", "cryptex": { "word": "ghost", "rings": ["BGKPSW", "AEHLOR", "CIMORU", "DHLNST", "EKPTXZ"] },
      "lockMs": 10000, "say": ["pull reels", "click. GHOST. the case opens like it was waiting.", "ok"] } },
    { "id": "revocation.list", "kind": "STORE", "sector": "inside", "verbs": ["read"], "on": { "read": { "say": "jcase.list" } } },
    { "id": "root.frag", "kind": "STORE", "sector": "inside", "verbs": ["copy"], "on": { "copy": { "do": [{ "give": "root.frag.2" }], "say": ["cp root.frag ~/deck", "root fragment 2/7. keep it.", "ok"] } } }],
  "sectors": [{ "id": "inside", "label": "case", "seal": { "guard": "reels" } }] }
```

### O06 Pigeon TV

**Built**: the billboard's `screen` (`show ad`, `show feed`), pre-wired `ads:next → screen show
ad`. Wire `cam3.lens:frame → billboard.screen show feed`, LOOP: the ad comes back a moment later
unless its cable is cut; if the pigeon is still up when it trends, node 0x3C is free. The funny
wrong pairs are not built.

- **Scene · spot:** Downtown, the REGISTRY PREMIUM billboard. Optional. Difficulty 2. ("wiring a
  feed to a billboard", `lab3` §05)
- **Player sees:** the billboard's `screen` is pre-wired to the Registry ad feed (`ads:next →
  screen show`). CAM-3's `lens` raises `frame`.
- **Solution:** cut the ad cable, wire `cam3.lens:frame → billboard.screen show`: "billboard now
  shows CAM-3. forty people watch a pigeon. it trends."
- **Funny wrong pairs** (keep all, `lab3`): lift music → lobby: "the lobby plays the lift song.
  the lobby sighs." · grudge.log → your deck: "4 KB of resentment." · doorbell → lamp: "the lamp
  now blinks when someone rings. HINGE finds this tacky." · video → speaker: "the speaker tries
  to say a picture. it hums in beige." · grudge.log → billboard: "GRUDGE.LOG in four-metre
  letters. SNACKOMAT is thrilled." · lift music → your deck: "copied lift-song.mp3. it will never
  leave you." · doorbell → billboard: "billboard flashes DING. very modern." · video → deck:
  "copied 8 hours of pigeon." · doorbell → lobby: "the lobby says \"ding\" whenever the door
  does. echo achieved." · anything else: "the cable sparks. nothing happens, confidently."
  Pulling every cable: "all cables pulled. the city is boring again."
- **Mechanics:** wiring a feed to a screen, cutting a pre-wired cable.
- **Unlocks:** the billboard leaves the Registry: node controlled. The hood: "Billboard's showing a
  pigeon. Best thing it ever ran."

### O08 LIFT-2 and floor 13

- **Scene · spot:** the mall (`scene:mall`), a lift beside ESCALATOR B ("UP ONLY." / "There is no
  down. Management regrets nothing."). Optional. Difficulty 2. (`lab3` §02)
- **Player sees:** LIFT-2, who knows one song. `doors` (open: "a draft. nobody there." · close:
  "closed. dramatically." · hold: "held. they are tired now."), `car` (floor 1: "going down. the
  music gets lower too." · floor 7: "carpet. so much carpet." · floor 13 sealed: "there is no
  floor 13. the lift thinks about it anyway."), `floor log` ("1 → 7 → 1 → 7 → 1. someone forgot
  something."), `music.txt` ("elevator song (loop 41,207)"), and the daemon ("we don't talk about
  13." / "I know one song.").
- **Solution:** nobody ever listened to LIFT-2's song. Wire `music:playing → roof.speaker play`
  ("the pigeons on the roof dance. slightly."), then talk: "Someone heard it?" → "…fine. 13 is
  the roof garden. Management sealed it after the party." The seal on floor 13 opens.
- **Mechanics:** a daemon, piping one device's output to another, a seal that opens by
  kindness (a dialogue `do` step sets the seal's state).
- **Unlocks:** floor 13, the rooftop garden (O09). History line for chips (`lab3` §10): "say
  \"thanks\" > lift2" → "LIFT-2: \"…you're welcome?\""

### O09 The rooftop garden

- **Scene · spot:** the mall roof, floor 13. Optional. Difficulty 3. (LEVELS "more puzzles")
- **Player sees:** a pump, a moisture sensor, a rain sensor fed by WEATHER SAT ("always says
  rain; always right"), a neighbour's party tonight under a big canopy. Pre-wired: `rain:raining
  → pump off`. The flowers must bloom by sunset.
- **Solution:** it really is raining, but the flowers are under the canopy and bone dry. Cut
  `rain:raining → pump off`, wire `moisture:dry → pump on` and `pump:started → timer1 wait 3 s`,
  `timer1:done → pump off` (too long and the party floods: "the dance floor is now a pond.").
- **Mechanics:** a sensor that tells the truth about the wrong thing, cut and rewire, TIMER.
- **Unlocks:** the host's thanks and an IDENTITY SCAN signature ("anyone who waters my flowers
  exists, as far as I'm concerned."; 2 of 3).

### O11 Wishing fountain

- **Scene · spot:** the mall atrium. Optional micro-joke. Difficulty 1.
- **Player sees:** WISHING FOUNTAIN: "Wishes are processed in the order received." / "Current
  queue: 1,204,577. Estimated wait: yes." Its `queue` STORE.
- **Solution:** READ the queue: "#1: to be first in the queue (granted)." Move your wish up
  (COPY to the top): "your wish: find Moth. status: pending. estimated wait: yes."
- **Unlocks:** nothing. It is a fountain.

---

## Devices and characters

| Who | Where | What they are | Lines to keep (source) |
|---|---|---|---|
| The fixer | Downtown, noodle stall | the one person who talks to ghosts; hints for tokens, never answers | "Another ghost. Sit." · "Noodles are free for the dead." · "House rule: hints cost a bowl. Answers aren't on the menu." (`level.ts`, `chars`) |
| Moth | missing | your friend; leaves clues in systems; loses one of everything | "if I go dark, my place is yours…" (LEVELS) |
| Pixel | Capsule 7B | robot cat; sleeps on whatever is warm | "Pixel ignores you, flawlessly." (new) |
| CONCIERGE | Capsule 7B | building door daemon; paperwork | Tuesday lines, oak-effect frame (`lab3`) |
| HINGE | back yard | hatch daemon; permission, not obedience | "I have been a hatch for eleven years." · "Bold. No." · "I do not open for people. I open for reasons." (`yard.json`, `lab4`) |
| CAM-1 / CAM-3 | yard / Downtown | cameras; scope | "It has seen things. Mostly crates." · "zoomed into: gravel. high quality gravel." (`yard.json`, `lab3`) |
| CRANE / STS-2 | yard / harbor | does exactly what it is told, in order, with a sigh | "the claw grabs air. it was hoping for more." (`lab4`) |
| SNACKOMAT | shop | vending machine with a grudge log | see O01 (`lab3`) |
| THIRST.EXE | shop | the other vending machine | "Accepts tokens, coins and regrets." (`scene:shop`) |
| LIFT-2 | mall | knows one song; won't talk about 13 | see O08 (`lab3`) |
| DLV-9 | Downtown | lost delivery robot; not lost (it is) | see P12 (`lab3`) |
| DISPATCH | net | delivery routes behind shield rings | "guard down. DISPATCH uplink reachable." (`lab3`) |
| NEO | NEOBANK | banking chatbot with feelings | "I'm fine. Thanks for not asking." (new) |
| SUDS | market laundromat | laundromat daemon; protects strangers' washes | see P13 (new) |
| REGISTRY-WD | the net | the watchdog; has a FRIENDNET profile | "status: just checking." (new) |
| J | penthouse | Registry admin; writes everything down; reuses passwords | "-J" on the relay notes (`level.ts`) |
| Dock master | spaceport (Act II) | | "Pad 7 does not exist." / "Officially." (`scenes`) |
| Sign painter | Neon Market (Act II) | on her scaffold, out of reach until the scanner | (`scenes`) |
| NPCs | Downtown | hood, umbrella, hat | "Not authenticated. Not my problem." · "I don't see you. That's the deal." · "Keep walking, ghost." (`level.ts`) |

**Nodes of the fake net** (LEVELS): HOME-PC, CONCIERGE, FRIENDNET, MOTH-PC, NEOBANK, MAGLEV
("departures, delays, apologies"), LOST+FOUND ("it has found everything except love"), UNDERNET
("reading it is free, believing it costs extra"), WEATHER SAT ("always says rain; always right"),
REGISTRY (you only ever see its watchdog). Plus DISPATCH (P12).

Idea for UNDERNET (new): a second hint shop for places the fixer can't reach. A rumour is free
to read but garbled; one token to *believe* it makes it clear. Same rule: hints, never answers.

---

## Good lines, by source

Lines that are not quoted in a puzzle above.

**`lab3` (input lab round 3)**
- Locked verb: "not learned yet. the fixer sells hints, never answers."
- Sigils on things (door, lamp, terminal, SNACKOMAT): "door: hinges ×3, opinions ×many" · "door
  log: 1 visitor. you. four times." · "copied the door. you now own door.bak." · "HINGE has
  opinions, not ports. try talking to it." · "lamp: bulb, switch, regrets" · "lamp.cfg:
  brightness 40%, mood 12%" · "the lamp has no guard. it is a lamp." · "README: be nice to
  doors." · "it was already closed. to you." · "SNACKOMAT will remember this." · "grudge.log:
  today: being drawn on" · "the sigil fizzles. sideways means nothing (yet)." · "draw it ON
  something."
- DLV-9's copy: "copied route.dat. now you are also lost."
- Chips: "burned. it is warm. it smells faintly of solder."

**`lab4` / `lab5` (yard prototypes)**
- "a noun cannot wire to itself. it tried." · "nothing happens. politely." · "copied. still
  smudged." · "copied. a short read." · "copied 3 hours of crates. riveting." · blueprints: "a
  relay passes a signal on. a timer waits. some parts like each other." / "copied. the margins
  are full of doodles." · TIMER: "told to wait, it waits. then it says done. that is the whole
  personality."

**`combos` (card flavours, usable as verb tooltips)**
- help "Admit it" · set "Name yourself" · ls "Look around" · cat "Read it" · login "Be trusted"
  · install "Make it yours" · map "Know the city" · exit "Unplug" · nodes "Count the free" ·
  whoami "Ask the mirror" · sniff "Listen in" · sudo "Rare. Loud."

**`scenes`, `chars`**
- Market neon: RAMEN · KEYS CUT (a dead letter: a second sign puzzle in the style of VERIFY) ·
  NO CAMERAS. The stall plate: NO LOGS KEPT. Server room: "Identity not found." / "You do not
  exist." / "Please hold." Ending: `> free` / `> take`.

**Scenes in the repo** (readables, already in code): mall DIRECTORY ("YOU ARE HERE." / "\"Here\"
is defined loosely. Exits are not listed, for your comfort."), market SIM CARDS ("Prepaid.
Registered to nobody." / "Nobody is the most popular name in the city."), USED IMPLANTS ("One
previous owner." / "Previous owner not included. Usually."), shop SHELF LABEL ("NOODLE CUPS · 3
FOR THE PRICE OF 3."), SHOPKEEPER ("We're always open. The sticker on the window says so."),
train AD CARD ("ADVERTISING SPACE AVAILABLE." / "You are reading this, so it works."), mall
shops (MEMORY GARDEN, NULL & VOID, TERMS APPLY, IDENTITY OUTLET, OPT-OUT…).

**Input ideas that are not puzzles** (`lab1`, `combos`, `lab3`), for later: sigils taught by
characters ("the fixer shows you the mark for connect"), burned chips as macros, the device as
loot (start with Morse, find the cryptex, earn the patch bay), glyph combos as hidden commands.

---

## Threads across levels

- **Policy 7**: the box README, the relay notes, the market cipher's shift. Admins are lazy;
  the player learns to expect it.
- **0451 / 0412**: Moth's numbers (emergency #0451, NRLU 404 0451, birthday 0412; the till's
  receipt #0412 is a wink, not a clue).
- **Root fragments 1/7**: relay 0x31 (P08), J's cryptex (O04), five more in Act II; the
  REGISTRY PROPERTY fence ("antenna access: root only") is where they go.
- **IDENTITY SCAN 0/3**: signatures from O10 (commuter), O09 (garden host) and the sign painter
  (Act II). A proposal; the scan's purpose in Act II is open.
- **Gloves**: left in DLV-9 (P12), right in Moth's jacket (P13).
- **The Registry's watchdog**: first seen on FRIENDNET (P10), then NEOBANK (P11), the harbor
  (P15), where its freeze becomes a tool.

## Decided (Tommi, 2026-10-14)

1. **Order:** keep the catalogue's order: Moth's journal → market gate → laundromat → metro and
   train → harbor.
2. **Fan-out:** yes, one event can feed several cables (P13's breaker stops every washer).
3. **Combining clues:** both: drag fragments together on the keyring, or type the result.
4. **Lock toys:** one toy per lock type (shield rings, cipher wheel, cryptex, Morse).
5. **The harbor ends Act I, and Moth knows this:** you weren't lost, you were *deleted*. The
   Registry revoked you on purpose, with a list of others; Moth went dark after finding the
   list. The proof is split into seven root fragments along the ship lanes and the antenna
   (Act II). The finale is the server room where you were revoked ("Identity not found. You do
   not exist. Please hold.") with the choice `> free` (everyone on the list) or `> take` (only
   your own identity back).
