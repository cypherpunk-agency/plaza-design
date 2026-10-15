# ACCESS DENIED: the first three levels (proposal)

A draft for discussion. It builds on the system we have: devices made of nouns,
verbs on nouns, events on nouns, cables that carry a verb, logic modules on the
board, daemons you talk to, the keyboard as the last resort.

This is a hacking game. Getting into systems you shouldn't be in is the point;
it is told as fiction and played as puzzles, never as a manual for real
systems.

## The hacking layer

**Passwords are clue puzzles.** A login is a GUARD noun. Its password hides in
the world as clues: a pet's name on a food bowl, a birthday in a message, a
pattern people reuse. Clues you read become fragments on your keyring; drag
fragments onto a login to try them, or type a guess at the keyboard. Wrong
guesses cost: the guard locks for a while, or raises the trace.

**Trace.** Being where you shouldn't leaves tracks. A system's `log` noun
records your visit and a trace meter fills while you stay. Ways out: leave in
time, cut the log's cable to its archive, switch it off for a moment, or reach
root and clean it. If the trace fills, the system kicks you and locks you out
until you find another way in.

**NEOBANK** is a node: balances, statements, a chatbot with feelings, and
records that tell stories (who paid for whose ticket).

## New mechanics

**Things come pre-wired.** Devices in the world already have cables: a smart
plug obeys a schedule, a door obeys its daemon. Reading the existing wiring,
cutting a cable and rewiring it is half the game.

**Sealed sectors.** A computer's schematic shows its core, a few public nouns
and *sealed sectors*: dashed brackets of `???` nouns. A seal opens with a key
chip (an item someone gives you or you find in the story) or by solving the
seal's own logic puzzle. The sector then unfolds in place, so progress is
visible on the schematic itself.

**The network appears as you reach it.** A LINK noun (`router`, `uplink`) has
the verb `scan`: nodes in reach fade onto the board as silhouettes; `connect`
brings them in as full schematics. The board becomes the map of the little net
you have found.

**The watchdog.** The Registry runs a watchdog process you can see on the board,
moving from node to node on a rhythm. A node it sits on freezes: no verbs, no
signals. You plan around it with timing, like crossing a street.

**Modules.** Logic parts are modules you own (`timer.so`, later `switch.so`),
found or given in the story, like `legs.so` today.

## The fake net

Nodes you can meet on the board, each with a joke or two:

| Node | What it is |
| --- | --- |
| HOME-PC | your own computer: messages, notes, your deck's settings |
| CONCIERGE | your building's door daemon; polite, petty, loves paperwork |
| FRIENDNET | a chat service; everyone's status line is a little too honest |
| MOTH-PC | your friend's computer |
| NEOBANK | balances, statements, a chatbot with feelings |
| MAGLEV | the train line's public board: departures, delays, apologies |
| LOST+FOUND | the city's lost-property office; it has found everything except love |
| UNDERNET | a forum of rumours; reading it is free, believing it costs extra |
| WEATHER SAT | always says rain; always right |
| REGISTRY | the city's identity system; you only ever see its watchdog |

## Quest: where is Moth?

Your friend Moth went quiet. Before that, Moth sent you a message: "if I go
dark, my place is yours. my key is with the noodle fixer. follow the trains."
Each level adds one layer of the system and one step of the story.

### Level 1: Capsule 7B (home)

*Now preceded by the opening (ROADMAP.md, `opening.ts`): the train home, the turnstile,
Downtown before, this flat the night before. The level itself starts the morning after: the
door says "identity: not found", Moth's message brings `uplink.so` (hacking unlocks), and the
puzzles below follow once you jack in to HOME-PC.*

*Teaches: tap and read, verbs, pre-wired devices, cutting a cable, scanning a
network, one cable between two devices, talking to a daemon.*

You wake up in your capsule flat. CONCIERGE has locked your door: rent shows
"pending". You paid; the receipt is stuck in HOME-PC's outbox because the
router is off.

- The flat: a door lock, the blinds, a kettle (event `boiled`), a smart plug,
  the router, HOME-PC, a fridge note, and Pixel, a robot cat who sleeps on
  whatever is warm.
- The router sits on the smart plug, and the plug is pre-wired to a schedule:
  `night → plug off`. The fridge note grumbles about it. Cut that cable, turn
  the plug on, and the router wakes.
- On the router, `scan` brings CONCIERGE onto the board.
- HOME-PC's outbox raises `ready` when you open it. Wire `outbox ready →
  CONCIERGE verify`, and the door unlocks with a smug message.
- Scenic bit: Pixel sleeps on the warm router and keeps it from cooling, so it
  overheats and reboots. Wire `kettle boiled → blinds open`: the sun lands on
  the floor, Pixel moves to the sunny spot, and the router stays up.
- CONCIERGE can be talked to for flavour, and to learn that its paperwork has
  paperwork.

### Level 2: the back yard (built)

*Teaches: events, a logic module (TIMER), timing, a daemon granting
permission, the camera.*

The fixer kept a parcel for you. Inside: Moth's key chip and a note: "Moth
asked me to give you this." (`uplink.so`, which lets your deck reach past your
building, now arrives earlier, in Moth's message on the morning you are deleted;
the parcel keeps a spare.)

### Level 3: Moth's place

*Built (2026-10-15), as PUZZLES.md P09 and P10 describe; the journal now points to washer 3 at the
market laundromat (PUZZLES story thread step 5), not straight to the train.*

*Teaches: a key chip opening a sealed sector, hops across nodes, the
watchdog, a second module (SWITCH), reading a story out of systems.*

- Through `uplink.so`, FRIENDNET appears; Moth's status: "gone fishing (not
  fishing)". From FRIENDNET you reach MOTH-PC.
- Moth's key chip opens MOTH-PC's first sector: notes, photos, a drawer file
  with `switch.so` in it (your second module).
- The journal sector has Moth's own seal: three switches whose signals must
  reach the seal in the order Moth's favourite song plays them (the song title
  is a photo caption). Build it with switches and timers on the board.
- The REGISTRY watchdog walks across FRIENDNET and MOTH-PC on a rhythm; while
  it sits on a node, that node freezes. Time your wiring so the sequence runs
  while it is away.
- The journal: Moth booked a ride on the maglev to the harbor and left a note
  for you. The MAGLEV board shows the train. Level 3 ends on the platform (the
  metro scene), with the harbor as the next destination.

## More puzzles for the scenes

- **Laundromat (market):** four networked washers on one breaker that trips
  above two running machines. Your jacket, with a note from Moth in its
  pocket, is in washer 3, and every machine has a queue. Route power with
  switches and timers so 3 finishes without tripping the breaker.
- **Rooftop garden (mall roof):** a pump, a moisture sensor, a rain sensor and
  a neighbour's party tonight. Make the flowers bloom by sunset: the rain
  sensor lies (WEATHER SAT always says rain), so you wire around it.
- **Lost and found (metro):** a commuter lost a music box on the train. The
  LOST+FOUND locker opens for the owner's face on the platform camera. Wire
  `camera sees owner → locker open`, but the camera only looks at the edge of
  the platform while the train is in, so the timing rides the train's loop.
- **SNACKOMAT (practice device):** a vending machine you can always poke at:
  an outer layer (coils, display, grudge log), a service panel opened with a
  key chip the vendor technician left behind, and a sulking daemon. A place
  to try things without story pressure.

## Open questions

1. Is the watchdog the right kind of tension, or do you want something else
   (a timer per level, a character who interrupts)?
2. Should Pixel the cat come along as a companion (warm laps, sabotage)?
3. Level order: does the yard stay level 2, or do we build Capsule 7B first
   and make the yard a later errand?
