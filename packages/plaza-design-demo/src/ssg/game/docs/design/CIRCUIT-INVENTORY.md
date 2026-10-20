# ACCESS DENIED: Circuit inventory (working notes for review)

2026-10-20. Every part of every device in the game, sorted by two questions, to test a new
vocabulary before anything is renamed. Companion to [CIRCUIT-AUDIT.md](./CIRCUIT-AUDIT.md).
Nothing here is implemented. The sorting is a first reading; the notes column says where a
part did not fit.

## The two questions

Today every part (a "noun") has one **kind**: SENSE, ACT, STORE, CLOCK, GUARD, LINK, LOG or
DAEMON. The kind tries to answer two different questions at once:

- **Layer: where does the part live?**
  - **hardware**: a physical component (a camera, a lever, a port, a combination lock);
  - **software**: a program running on a device or on your board (a login, a log, a
    character, TIMER, SWITCH, a network service);
  - **data**: information on a device (a note, a schedule, a program file you can take).
- **Function: what does it do?**
  - **sense**: notices something; **act**: does something to the world;
  - **hold**: keeps information; **program**: a file that becomes a capability once taken;
  - **time**: waits or repeats; **gate**: lets a signal or a person through, or not;
  - **connect**: reaches a network; **record**: writes down what you do (trace);
  - **talk**: a character; **logic**: works on signals (counting).

Physical or logical is then not a kind of part, it is the layer. A wall switch and SWITCH share
a function (gate) and differ in layer (hardware, software). A clock box and TIMER share time.

## What the game has: 222 parts on 101 devices

| Function | Hardware | Software | Data | Total |
|---|---|---|---|---|
| hold | | | 92 | 92 |
| act | 63 | 3 | | 66 |
| sense | 20 | 1 | | 21 |
| connect | 11 | | | 11 |
| gate | 4 | 7 | | 11 |
| time | 5 | 3 | | 8 |
| talk | | 6 | | 6 |
| record | | 3 | | 3 |
| program | | | 3 | 3 |
| logic | 1 | | | 1 |
| **Total** | **104** | **23** | **95** | **222** |

How today's kinds map: STORE is hold (92), program (3) or a physical compartment (2). ACT is
act (64), plus TIMER (time), SWITCH (gate) and a press counter (logic). SENSE is sense (21),
plus three timers in disguise. GUARD, LINK, LOG, DAEMON and CLOCK each map to one function.

## What the inventory shows

1. **Function mostly matches the kind; layer is the missing word.** Sense, act and hold line
   up with SENSE, ACT and STORE for 177 of 188 parts. What no kind says is whether a part is
   hardware, software or data, and that is what made GUARD, TIMER and CLOCK feel inconsistent:
   - gates exist in both layers: four physical combination locks (the lock toys) and seven
     software gates (six logins and SWITCH);
   - time exists in both layers: five clock boxes and records, three software schedules.
2. **Some parts are labelled by accident.** The library's session timer and the smart plug's
   schedule are SENSE; the laundromat's is CLOCK. The fridge's inside and the answering
   machine's tape are STORE but are things you open and play. The billboard's ad rotation is
   a SENSE but is a timer.
3. **"Log" means two things.** Five parts are files called log (deliveries.log, receipts.log,
   the port log, the crane's job.log, the gate log); three are LOG recorders that trace you.
4. **Most of the Circuit is text.** 82 parts (37%) can only be read and send nothing. Only 13
   data parts do more than read: copy (footage, route.dat, root.frag), install (legs.so,
   switch.so), renew (scan.so), save, store, write (the sandbox memo, the only writable
   text) and send (Dispatch's routes, sent to DLV-9: the nearest thing to data flowing).
5. **Few parts can start a wire.** 38 parts send a signal. Thirteen sensors send none, so
   nothing can be wired from them: the drone's eye, the router's temperature, the sign's
   tubes, DLV-9's eyes, the identity scanner, the weather feed, the library thermostat, the
   tank lamp, the pot's soil, the night light's cell, the rain gauge, and the crane and yard
   cameras (they open screens instead).
6. **Logical devices already exist.** Thirteen network machines have no body (Concierge,
   Dispatch, Catalog, Software Lending, Moth-PC, the QA servers, and more), and the two logic
   parts sit on your board.
7. **Physical to digital already happened once.** SWITCH is unlocked by `switch.so`, found on
   Moth's PC; the scan program comes from Software Lending. Both are data parts you take that
   become software.

## Physical and digital twins

The idea: a physical device the player meets can later be built as software at a workbench and
deployed. What exists per function:

| Function | Met in the world (hardware) | Software today | A twin to build |
|---|---|---|---|
| gate | mains lever, smart plug, combination locks | SWITCH; logins | a software lock that guards your own devices |
| time | laundromat schedule, metronome, pier clock | TIMER; plug schedule | a repeating clock on your board |
| sense | motion sensor, pressure plate, scanners | weather feed | a watcher: signals when a value changes |
| act | buttons, horn, hatch, lamps | network services (ping, print) | a relay that repeats or splits a signal |
| record | tape recorder | LOG recorders | your own log, to catch the watchdog |
| logic | press counter | none | a counter; AND and OR |
| connect | wall port, net jack | none | a bridge between two networks |
| talk | intercom, hinge | daemons | a decoy that answers for you |

Read down the first column and it is a progression: each physical thing met teaches a
function, and its twin is the tool that function becomes.

## Puzzles

### Possible now

- **Find the clue, use the password.** Read notes, receipts and memos; type the password at a
  login (near-miss replies help).
- **Open a physical lock.** The lock toys (rings, cipher, cryptex, morse); only on the sandbox
  bench so far, in no story scene.
- **Wire a signal to an action.** For example CAM-3's loop to the billboard, the gate scanner
  to the lock. 38 sources to wire from.
- **Cut a cable.** Pre-wired cables you remove, except fixed ones (laundromat, sandbox).
- **Delay or block a signal.** TIMER and SWITCH on your board.
- **Open a sealed sector.** With a key, a login, a condition, or signals in the right order
  (Downtown, Moth, sandbox).
- **Stay off the record.** LOG trace, wiping, cutting the archive (Downtown, sandbox, Stacks).
- **Reach a network.** Ports, scan, connecting to machines, controlled boxes extending the
  public net.
- **Take something.** Copy footage or routes, install a program, take a card or fragment.
- **Talk your way in.** Daemons (six characters).
- **Use time.** Clocks that repeat, washers on deadlines, things open only at certain hours.
- **Avoid the watchdog.** It patrols and freezes devices (Moth, sandbox, Stacks).
- **Use a camera.** Aim, zoom, tag (yard, Stacks, Downtown).

### Possible after stage 1b (movers and zones)

- **Something moving through a place you control:** time a gate for a robot, send a lift to the
  wrong floor, catch a crane's load as it crosses a scanner.
- **Being somewhere:** a sensor notices you or a robot entering an area; wire it to a lamp, an
  alarm or a door.
- **Waiting once or repeating** on any device, not only on the board.

### Possible with bigger additions

- **Data that flows** (signals that carry a value): read the schedule, change it, and the crane
  lifts the wrong box; feed a fake temperature to the scanner. Needs values on wires and
  writable data; today only a trigger travels.
- **Your own programs on other devices** (the workbench): build a twin, deploy it through a
  port and a login, and leave it running.
- **Logic beyond delay and block:** count, combine (AND, OR), compare.
- **Sensors that signal:** the 13 read-only sensors given signals.

### Not possible, and not planned yet

- **Physics:** falling, swinging, pushing.
- **Being in two places:** remote presence comes later in the progression concept.

## What this suggests for the words (provisional)

- Replace **kind** with two properties: **layer** (hardware, software, data) and **function**
  (sense, act, hold, time, gate, connect, record, talk, logic, program).
- Hack vision could show the layer by *where* a part sits on the device and the function as an
  icon, so players read neither word.
- Fix the accidental labels, and split "log" (a file) from "recorder" (trace), whatever the
  words become.
- **Noun and verb:** undecided. Settle layer and function first.

## Every part

Scene `(net)` means a network machine; `logic:` means a logic part and where it is found.

| Scene | Device | Part | Today | Layer | Function | Actions | Signals | Note |
|---|---|---|---|---|---|---|---|---|
| beach | SUNBED RENTAL | rent | ACT | hardware | act | rent, end | – |  |
| beach | SUNBED RENTAL | meter | ACT | hardware | act | run, pause | – |  |
| beach | SUNBED RENTAL | terms | STORE | data | hold | read | – |  |
| beach | SALT JUKEBOX | songs | ACT | hardware | act | play | played |  |
| beach | SALT JUKEBOX | card | STORE | data | hold | read | – |  |
| beach | COCKTAIL MIXER | lights | ACT | hardware | act | flash | – |  |
| beach | COCKTAIL MIXER | pump | ACT | hardware | act | pour | poured |  |
| beach | COCKTAIL MIXER | menu | STORE | data | hold | read | – |  |
| beach | LIFEGUARD DRONE | eye | SENSE | hardware | sense | read | – |  |
| beach | LIFEGUARD DRONE | flag | ACT | hardware | act | danger, clear | – |  |
| beach | PIER LIGHTS | clock | CLOCK | hardware | time | read | on, off |  |
| beach | PIER LIGHTS | lamps | ACT | hardware | act | on, off | – |  |
| beach | PIER LIGHTS | plate | STORE | data | hold | read | – |  |
| beach | BOAT · BERTH 9 | notice | STORE | data | hold | read | – |  |
| beach | BOAT · BERTH 9 | name | STORE | data | hold | read | – |  |
| beach | BOAT · BERTH 9 | hatch | ACT | hardware | act | open | – |  |
| capsule | DOOR LOCK | bolt | ACT | hardware | act | open | – |  |
| capsule | DOOR LOCK | plate | STORE | data | hold | read | – |  |
| capsule | FRIDGE | note | STORE | data | hold | read | – |  |
| capsule | FRIDGE | inside | STORE | hardware | act | open | – | a compartment you open, labelled STORE |
| capsule | KETTLE | kettle | ACT | hardware | act | boil | boiled |  |
| capsule | BLINDS | motor | ACT | hardware | act | open, close | – |  |
| capsule | HOME-PC | outbox | STORE | data | hold | read, open | ready |  |
| capsule | HOME-PC | inbox | STORE | data | hold | read | – |  |
| capsule | HOME-PC | notes | STORE | data | hold | read | – |  |
| capsule | HOME-PC | net | LINK | hardware | connect | – | – | a port onto a network |
| capsule | SMART PLUG | power | ACT | hardware | act | on, off | – |  |
| capsule | SMART PLUG | schedule | SENSE | software | time | read | night | a schedule that signals night, labelled SENSE |
| capsule | ROUTER | uplink | LINK | hardware | connect | – | – | a port onto a network |
| capsule | ROUTER | temp | SENSE | hardware | sense | read | – |  |
| capsule(net) | CONCIERGE | desk | ACT | software | act | verify | – | a network service |
| capsule(net) | CONCIERGE | ledger | STORE | data | hold | read | – |  |
| capsule(net) | CONCIERGE | concierge | DAEMON | software | talk | talk | – | a character you talk to |
| downtown | NEON MARKET GATE | scanner | SENSE | hardware | sense | read | matched |  |
| downtown | NEON MARKET GATE | lock | ACT | hardware | act | open, shut | – |  |
| downtown | NEON MARKET GATE | door | SENSE | hardware | sense | read | passed |  |
| downtown | NEON MARKET GATE | deliveries.log | STORE | data | hold | read | – |  |
| downtown | JUNCTION BOX 0x2F | README | STORE | data | hold | read | – |  |
| downtown | JUNCTION BOX 0x2F | login | GUARD | software | gate | – | – | a login |
| downtown | JUNCTION BOX 0x2F | legs.so | STORE | data | program | read, install | – | a program you take and run |
| downtown | VERIFY SIGN | tubes | SENSE | hardware | sense | read, test | – | a test you run on the tubes |
| downtown | CAM-3 | lens | SENSE | hardware | sense | view, loop | frame |  |
| downtown | CAM-3 | footage | STORE | data | hold | read, copy | – |  |
| downtown | BILLBOARD | screen | ACT | hardware | act | show ad, show feed | – |  |
| downtown | BILLBOARD | ads | SENSE | software | time | read | next | rotates ads, signals next, labelled SENSE |
| downtown | BILLBOARD | terms | STORE | data | hold | read | – |  |
| downtown | NOODLE TILL | receipts.log | STORE | data | hold | read | – |  |
| downtown | NOODLE TILL | quickstart | STORE | data | hold | read | – |  |
| downtown | NOODLE TILL | login | GUARD | software | gate | – | – | a login |
| downtown | NOODLE TILL | drawer | ACT | hardware | act | open | – |  |
| downtown | DLV-9 | eyes | SENSE | hardware | sense | read | – |  |
| downtown | DLV-9 | route.dat | STORE | data | hold | read, copy | – |  |
| downtown | DLV-9 | wheels | ACT | hardware | act | go home, follow you, spin | – |  |
| downtown | DLV-9 | hatch | ACT | hardware | act | open, close | – |  |
| downtown | DLV-9 | speaker | ACT | hardware | act | say hi | – |  |
| downtown | DLV-9 | uplink | LINK | hardware | connect | – | – | a port onto a network |
| downtown | ROOFTOP RELAY 0x31 | notes.txt | STORE | data | hold | read | – |  |
| downtown | ROOFTOP RELAY 0x31 | log | LOG | software | record | read | entry | writes you down; fills trace |
| downtown | ROOFTOP RELAY 0x31 | archive | STORE | data | hold | save, read | – |  |
| downtown | ROOFTOP RELAY 0x31 | login | GUARD | software | gate | – | – | a login |
| downtown | ROOFTOP RELAY 0x31 | gate.memo | STORE | data | hold | read | – |  |
| downtown | ROOFTOP RELAY 0x31 | root.frag | STORE | data | hold | read, copy | – |  |
| downtown | ROOFTOP RELAY 0x31 | uplink | LINK | hardware | connect | – | – | a port onto a network |
| downtown | REGISTRY PROPERTY | plate | STORE | data | hold | read | – |  |
| downtown | REGISTRY PROPERTY | gate | ACT | hardware | act | open | – |  |
| downtown | IDENTITY SCAN | scanner | SENSE | hardware | sense | read | – |  |
| downtown | IDENTITY SCAN | door | ACT | hardware | act | enter | – |  |
| downtown(net) | DISPATCH | fleet | STORE | data | hold | read | – |  |
| downtown(net) | DISPATCH | manual | STORE | data | hold | read | – |  |
| downtown(net) | DISPATCH | routes | STORE | data | hold | read, send to dlv9 | – | data you can send to a robot: the closest thing to data flow |
| downtown(net) | FRIENDNET | feed | STORE | data | hold | read | – |  |
| downtown(net) | MAGLEV | board | STORE | data | hold | read | – |  |
| downtown(net) | WEATHER SAT | forecast | SENSE | software | sense | read | – | a network feed |
| downtown(net) | UNDERNET | rumours | STORE | data | hold | read | – |  |
| laundromat | SCHEDULE | clock | CLOCK | hardware | time | read | open |  |
| laundromat | SCHEDULE | hours | STORE | data | hold | read | – |  |
| laundromat | WASHER 1 | drum | ACT | hardware | act | start, stop | done |  |
| laundromat | WASHER 1 | queue | STORE | data | hold | read | – |  |
| laundromat | WASHER 2 | drum | ACT | hardware | act | start, stop | done |  |
| laundromat | WASHER 2 | queue | STORE | data | hold | read | – |  |
| laundromat | WASHER 3 | drum | ACT | hardware | act | start, stop | done |  |
| laundromat | WASHER 3 | queue | STORE | data | hold | read | – |  |
| laundromat | WASHER 3 | door | ACT | hardware | act | open | – |  |
| laundromat | WASHER 4 | drum | ACT | hardware | act | start, stop | done |  |
| laundromat | WASHER 4 | queue | STORE | data | hold | read | – |  |
| laundromat | BREAKER | load | SENSE | hardware | sense | read, reset | tripped |  |
| laundromat | SUDS | suds | DAEMON | software | talk | talk | – | a character you talk to |
| laundromat | SUDS | rules | STORE | data | hold | read | – |  |
| library | CARD READER | slot | ACT | hardware | act | tap | – |  |
| library | CARD READER | lan | LINK | hardware | connect | – | – | a port onto a network |
| library | SESSION TIMER | clock | SENSE | hardware | time | read | – | a countdown, labelled SENSE; the laundromat one is CLOCK |
| library | SESSION TIMER | policy | STORE | data | hold | read | – |  |
| library | PRINTER | tray | ACT | hardware | act | look | – |  |
| library | PRINTER | queue | STORE | data | hold | read | – |  |
| library | PRINTER | spool | LINK | hardware | connect | – | – | a port onto a network |
| library(net) | CATALOG | catalog | DAEMON | software | talk | talk | – | a character you talk to |
| library(net) | CATALOG | index | STORE | data | hold | read | – |  |
| library(net) | CATALOG | patrons | STORE | data | hold | read | – |  |
| library(net) | SOFTWARE LENDING | shelf | STORE | data | hold | read | – |  |
| library(net) | SOFTWARE LENDING | login | GUARD | software | gate | – | – | a login |
| library(net) | SOFTWARE LENDING | loans | STORE | data | hold | read | – |  |
| library(net) | SOFTWARE LENDING | scan.so | STORE | data | program | read, renew | – | a program you take and run |
| library(net) | HEATING | thermostat | SENSE | hardware | sense | read | – |  |
| library(net) | HEATING | budget | STORE | data | hold | read | – |  |
| moth | HALL TABLE | notice | STORE | data | hold | read | – |  |
| moth | HALL TABLE | post | STORE | data | hold | read | – |  |
| moth | CORKBOARD | photo | STORE | data | hold | read | – |  |
| moth | CORKBOARD | list | STORE | data | hold | read | – |  |
| moth | CORKBOARD | rod | STORE | data | hold | read | – |  |
| moth | RECORD PLAYER | record | CLOCK | hardware | time | read | played | a record whose length is a clock |
| moth | RECORD PLAYER | sleeve | STORE | data | hold | read | – |  |
| moth | MOTH'S RIG | screen | STORE | data | hold | read | – |  |
| moth | MOTH'S RIG | sticky | STORE | data | hold | read | – |  |
| moth | MOTH'S RIG | net | LINK | hardware | connect | – | – | a port onto a network |
| moth | SPRAT'S TANK | sprat | STORE | data | hold | read | – |  |
| moth | SPRAT'S TANK | feeder | ACT | hardware | act | feed | – |  |
| moth | SPRAT'S TANK | lamp | SENSE | hardware | sense | read | – |  |
| moth | SMART POT | soil | SENSE | hardware | sense | read | – |  |
| moth | SMART POT | pump | ACT | hardware | act | water | – |  |
| moth | ANSWERING MACHINE | tape | STORE | hardware | act | play | – | a tape you play, labelled STORE |
| moth(net) | FRIENDNET | moth | STORE | data | hold | read | – |  |
| moth(net) | FRIENDNET | you | STORE | data | hold | read | – |  |
| moth(net) | FRIENDNET | fixer | STORE | data | hold | read | – |  |
| moth(net) | FRIENDNET | wall | STORE | data | hold | read | – |  |
| moth(net) | FRIENDNET | home | LINK | hardware | connect | – | – | a port onto a network |
| moth(net) | MOTH-PC | motd | STORE | data | hold | read | – |  |
| moth(net) | MOTH-PC | notes.txt | STORE | data | hold | read | – |  |
| moth(net) | MOTH-PC | photos | STORE | data | hold | read | – |  |
| moth(net) | MOTH-PC | switch.so | STORE | data | program | read, install | – | a program you take and run |
| moth(net) | MOTH-PC | journal.txt | STORE | data | hold | read | – |  |
| sandbox | MOTION SENSOR | eye | SENSE | hardware | sense | wave, read | motion |  |
| sandbox | TEST LAMP | lamp | ACT | hardware | act | on, off | – |  |
| sandbox | MEMO SCREEN | memo | STORE | data | hold | read, write | – | the only writable text |
| sandbox | WALL PORT | lan | LINK | hardware | connect | – | – | a port onto a network |
| sandbox | WALL PORT | label | STORE | data | hold | read | – |  |
| sandbox | UNIT 7 | unit7 | DAEMON | software | talk | talk | – | a character you talk to |
| sandbox | METRONOME | beat | CLOCK | hardware | time | read | tick, tock |  |
| sandbox | METRONOME | dial | STORE | data | hold | read | – |  |
| sandbox | TAPE RECORDER | log | LOG | software | record | off, on | entry | writes you down; fills trace |
| sandbox | TAPE RECORDER | reel | STORE | data | hold | read, store | – |  |
| sandbox | TEST BUTTON | button | ACT | hardware | act | press | pressed |  |
| sandbox | BEACON | beacon | ACT | hardware | act | on, off | – |  |
| sandbox | HORN | horn | ACT | hardware | act | buzz | – |  |
| sandbox | PRESS COUNTER | count | ACT | hardware | logic | count, read, zero | – | counts presses: a counter, labelled ACT |
| sandbox | PRESSURE PLATE | plate | SENSE | hardware | sense | step | pressed |  |
| sandbox | TEST HATCH | hatch | ACT | hardware | act | open, shut | opened |  |
| sandbox | FAN | fan | ACT | hardware | act | spin, stop | – |  |
| sandbox | QA LOGIN | login | GUARD | software | gate | – | opened | a login |
| sandbox | QA LOGIN | note | STORE | data | hold | read | – |  |
| sandbox | QA LOGIN | results | STORE | data | hold | read | – |  |
| sandbox | SHIELD LOCKER | shields | GUARD | hardware | gate | – | – | a physical combination lock (lock toy) |
| sandbox | SHIELD LOCKER | tag | STORE | data | hold | read | – |  |
| sandbox | CIPHER BOX | wheel | GUARD | hardware | gate | – | – | a physical combination lock (lock toy) |
| sandbox | CIPHER BOX | tag | STORE | data | hold | read | – |  |
| sandbox | CRYPTEX CASE | case | GUARD | hardware | gate | – | – | a physical combination lock (lock toy) |
| sandbox | CRYPTEX CASE | tag | STORE | data | hold | read | – |  |
| sandbox | MORSE LAMP | bulb | GUARD | hardware | gate | – | – | a physical combination lock (lock toy) |
| sandbox | MORSE LAMP | tag | STORE | data | hold | read | – |  |
| sandbox | KEY CUTTER | blank | ACT | hardware | act | cut | – |  |
| sandbox | SECURE CABINET | panel | STORE | data | hold | read | – |  |
| sandbox | SECURE CABINET | a | STORE | data | hold | read | – |  |
| sandbox | SECURE CABINET | b | STORE | data | hold | read | – |  |
| sandbox | SECURE CABINET | c | STORE | data | hold | read | – |  |
| sandbox | RGB PANEL | red | ACT | hardware | act | press | pressed |  |
| sandbox | RGB PANEL | green | ACT | hardware | act | press | pressed |  |
| sandbox | RGB PANEL | blue | ACT | hardware | act | press | pressed |  |
| sandbox | MAINS LEVER | lever | ACT | hardware | act | up, down | – |  |
| sandbox | AUDIT DESK | log | LOG | software | record | off, on | entry | writes you down; fills trace |
| sandbox | AUDIT DESK | login | GUARD | software | gate | – | – | a login |
| sandbox | AUDIT DESK | policy | STORE | data | hold | read | – |  |
| sandbox | AUDIT DESK | wipe | ACT | hardware | act | wipe | – |  |
| sandbox | ARCHIVE SPOOL | reel | STORE | data | hold | store, read | – |  |
| sandbox | NET JACK | lan | LINK | hardware | connect | – | – | a port onto a network |
| sandbox | NET JACK | label | STORE | data | hold | read | – |  |
| sandbox | NET BELL | bell | ACT | hardware | act | ring | – |  |
| sandbox | LABEL PRINTER | feed | ACT | hardware | act | print | – |  |
| sandbox | STAMP PRESS | press | ACT | hardware | act | stamp | – |  |
| sandbox | CONVEYOR | belt | ACT | hardware | act | run, stop | – |  |
| sandbox | SIREN | siren | ACT | hardware | act | test | – |  |
| sandbox | COFFEE MACHINE | cup | ACT | hardware | act | brew | – |  |
| sandbox | COFFEE MACHINE | boiler | ACT | hardware | act | descale | – |  |
| sandbox | COFFEE MACHINE | screen | STORE | data | hold | read | – |  |
| sandbox | COFFEE MACHINE | firmware | STORE | data | hold | read | – |  |
| sandbox | CHIP READER | slot | ACT | hardware | act | insert | – |  |
| sandbox | CHIP READER | screen | STORE | data | hold | read | – |  |
| sandbox | TEST TILL | drawer | ACT | hardware | act | pay | – |  |
| sandbox | TEST TILL | receipt | STORE | data | hold | read | – |  |
| sandbox | NIGHT LIGHT | lamp | ACT | hardware | act | on, off | – |  |
| sandbox | NIGHT LIGHT | cell | SENSE | hardware | sense | read | – |  |
| sandbox | WEATHER SENSOR | gauge | SENSE | hardware | sense | read | – |  |
| sandbox | WINDOW VENT | louvre | ACT | hardware | act | open, shut | – |  |
| sandbox(net) | QA-SRV 01 | motd | STORE | data | hold | read | – |  |
| sandbox(net) | QA-SRV 01 | ping | ACT | software | act | ping | pinged | a network service |
| sandbox(net) | QA-SRV 01 | hop | LINK | hardware | connect | – | – | a port onto a network |
| sandbox(net) | QA-PRN 2 | job | ACT | software | act | print | queued | a network service |
| sandbox(net) | QA-VAULT | readme | STORE | data | hold | read | – |  |
| stacks | STS-2 | camera | SENSE | hardware | sense | view | – |  |
| stacks | STS-2 | schedule | STORE | data | hold | read | – |  |
| stacks | STS-2 | spreader | ACT | hardware | act | lift | lifted |  |
| stacks | PORT AUTHORITY | scanner | SENSE | hardware | sense | read | warm |  |
| stacks | PORT AUTHORITY | log | STORE | data | hold | read | – |  |
| stacks | PORT AUTHORITY | alarm | ACT | hardware | act | sound | – |  |
| stacks | NIGHT FERRY | manifest | STORE | data | hold | read | – |  |
| stacks | NIGHT FERRY | horn | ACT | hardware | act | sound | – |  |
| stacks | NRLU 404 0451 | panel | STORE | data | hold | read | – |  |
| stacks | NRLU 404 0451 | intercom | DAEMON | software | talk | talk | – | a character you talk to |
| train | TRAIN-0 | position | SENSE | hardware | sense | read | tunnel, harbor siding | raised by scene code from where the train is |
| train | TRAIN-0 | emergency.reg | STORE | data | hold | read | – |  |
| train | TRAIN-0 | plate | STORE | data | hold | read | – |  |
| train | TRAIN-0 | brake | ACT | hardware | act | pull | stopped |  |
| train | TRAIN-0 | doors | ACT | hardware | act | open, lock | – |  |
| yard | CAM-1 | lens | SENSE | hardware | sense | view | – |  |
| yard | CAM-1 | motor | ACT | hardware | act | left, centre, right | – |  |
| yard | CAM-1 | footage | STORE | data | hold | read, copy | – |  |
| yard | CRANE | arm | ACT | hardware | act | A-3, B-5, C-7, chute | – |  |
| yard | CRANE | claw | ACT | hardware | act | grab, drop | dropped |  |
| yard | CRANE | job.log | STORE | data | hold | read | – |  |
| yard | HATCH · HINGE | lock | ACT | hardware | act | open | – |  |
| yard | HATCH · HINGE | log | STORE | data | hold | read | – |  |
| yard | HATCH · HINGE | hinge | DAEMON | software | talk | talk | – | a character you talk to |
| logic:start | TIMER | timer | ACT | software | time | wait 1 s, wait 2 s, wait 3 s | done | a logic part on your board |
| logic:moth | SWITCH | switch | ACT | software | gate | pass, turn on, turn off | out | a logic part on your board |
