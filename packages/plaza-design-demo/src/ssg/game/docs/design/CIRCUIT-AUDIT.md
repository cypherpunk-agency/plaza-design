# ACCESS DENIED: Circuit audit (proposal for review)

Stage 1a of the scene migration plan, 2026-10-20. A working audit, open to revision; nothing
here is implemented yet. Paths are relative to `src/ssg/game/`.

**The Circuit** is the proposed name for the logic, hacking and connection system as a whole:
devices made of nouns, verbs on nouns, events, cables, guards, clocks and logic parts, edited in
the editor's Devices and Wiring panels and played on the schematic. "The net" keeps its meaning
from [NET.md](../reference/NET.md): which networks you can reach from where.

The question this audit answers: how much scene behaviour can the Circuit already express, and
which few new parts would let the rest move out of per-scene code?

## 1. What the Circuit has today

### Noun kinds in the scenes

Counted from `"kind"` in `scenes/*/devices.json`.

| Kind | Count | Scenes | Engine behaviour |
|---|---|---|---|
| STORE | 97 | all ten device scenes; sandbox 23, downtown 19, moth 19 | none (a label) |
| ACT | 65 | all ten; sandbox 26 | none (a label) |
| SENSE | 24 | all ten; downtown 8 | none (a label) |
| LINK | 11 | capsule, downtown, library, moth, sandbox | port onto the net: `scan`, `connect` (`engine/model.ts:1001`) |
| GUARD | 10 | downtown 3, library 1, sandbox 6 | a login: passwords or a lock toy, tries, lockout, trace (`model.ts:1254`) |
| DAEMON | 6 | capsule, laundromat, library, sandbox, stacks, yard | none; by convention a `talk` verb opening a conversation |
| CLOCK | 4 | beach, laundromat, moth, sandbox | repeating events every `every` ms, `start`/`stop`, `set` writes the phase (`engine/clock.ts`) |
| LOG | 3 | downtown 1, sandbox 2 | fills the trace meter while you are inside (`model.ts:849`) |

The engine also adds SEAL (a sequence-sealed sector) and WATCH (the watchdog). SENSE, ACT,
STORE and DAEMON only decide row order in hack vision (`engine/schematic.ts:68`) and which nouns
may bind shared commands.

### Verbs, cases and steps

A verb is one or more cases. The first case whose `if` and `when` hold runs its steps, then its
line (`model.ts:1277`). The steps are set, open (a panel), emit, goal, effect (named code), give,
take, trace, unseal, input and command. Conditions are `key`, `!key`, `key=value` and `signal`
(the verb arrived by cable). The shared gameplay layer has richer conditions (all, any, not,
compare, player, item).

### Cables

`{from: "device.noun:event", to: "device.noun", verb, fixed?}`. An event fires the verb after a
fixed 150 ms (`model.ts:466`). Cables carry **no delay and no condition of their own**; both
live on the target verb's cases. Players wire on the schematic; authors pre-wire in the editor's
Wiring tab.

### Time

There are four ways to wait, made at different times:

- **CLOCK noun:** repeats, no one-shot, no time-of-day schedule, no catch-up after a pause.
- **TIMER logic part** (`data/logic.json:3`): "wait 1/2/3 s", then `done`.
- **Gameplay deadlines** (`engine/gameplay/native-deadlines.ts`): start and cancel on events,
  durations from tuning. The laundromat washers use these.
- **Gameplay intervals** (`native-workflows.ts:52`).

Separately, `when: {from, to, days}` gates cases by city time.

### State machines

Nothing is dedicated to them, but the pattern is there and in use: device-local state, cases
guarded by `key=value`, `set` steps, `current` (the highlighted verb follows a state key), the
SWITCH logic part, and gameplay `enum` state with options. Sequence seals are a small ordered
machine.

### Position

**Nothing in the Circuit senses where the player or any object is.** SENSE events come from
scene code (the train raises `train.position:tunnel` from its own position), from taps, or from
cables. `layout.spot.presence` only shows or hides a device.

### Editor

The Devices and Wiring panels (`authoring/device-authoring.ts`) can add and remove devices,
nouns (all eight kinds plus the four toys), sectors, cases, steps, events, local state, texts,
goals and pre-wired cables. Gaps: new verbs can only be a generic `readN`; effects and panels
can only be picked from code-registered lists; cables have no delay or condition field because
the data model has none.

## 2. Scene controllers

One controller per scene, in the device document's `controller` record, each with its own
hand-written editor form. No controller writes game state directly. The physical ones keep
transient values in scratch and **announce what happens as inputs**; gameplay data then changes
state. `engine/schematic.ts` never mentions controllers: they couple to the Circuit only through
shared state names, verbs whose `effect` they handle, and clock nouns.

| Controller | Scene | Kind of behaviour | Seen on the schematic | Circuit today can express | Needs |
|---|---|---|---|---|---|
| `stacks` (`engine/controllers/motion.ts`) | stacks | **mover**: trolley path over → hoist → travel → lower, and return; **zone**: the scan moment where the load crosses the gate; **delays** with tickets so a newer lift cancels an older one | the `sts2.lift` and `port.return` verbs and the cable that triggers the lift; the motion is only drawn | the trigger, the inputs' consequences | mover with stops and timed legs; a zone on the mover's path |
| `downtown` (`motion.ts` + `downtown-visual.ts`) | downtown | **mover**: dlv9's legs home → gate → market at a set speed; **zone**: scan at the gate edge, pass-or-bonk at the door; a short signal wait; visual: lock, billboard feed, sign pulse | the `dlv.inward`/`dlv.outward` verbs, the gate scanner and door events are cabled; visuals by name only | triggers, gate logic, door decision | mover; zones on its path; the visual half belongs to stage 2's artwork state |
| `capsule` (`capsule.ts`) | capsule | **simulation**: router temperature heats under Pixel, cools otherwise, reboots when too hot; boot and reboot **delays**; booting → up → rebooting | `router.boot` and `kettle.boil` verbs; temperature and boot state hidden | the delays (with a one-shot timer), the small state machine | a registered thermal mechanism shown as a device (a gauge noun with `hot`/`cooled` events) |
| `yard` (`yard.ts`) | yard | **mover**, presentation only: the hook eases between named slots; the parcel slides along the chute while a deadline runs | `yard.gateOpen` used in a verb condition; the rest by name | all the logic already | a mover would let the hook be a device; otherwise this is artwork state |
| `laundromat` (`laundromat.ts`) | laundromat | draw-only: washer status and progress from gameplay deadlines; the clock countdown | the `clock` noun | everything (it reads only) | stage 2 artwork state |
| `sandbox` (`sandbox.ts`) | sandbox | draw-only: QA artwork mirroring 37 devices' state, pulses, opened sectors | every reference is a real device, noun or event | everything | stage 2 artwork state |
| `moth`, `beach` (`visual.ts`) | moth, beach | draw-only: compares state values to booleans for artwork; Moth reads the record clock | the `turntable.record` clock | everything | stage 2 artwork state |
| camera bindings (`camera-bindings.ts`, under `camera`) | yard, downtown | draw-only pan, parcel and feed, plus **one action**: CAM-3's LOOP fires `cam3.lens/loop` | the `loop` verb | everything | folds into the camera panel |

**Result:** of eight controller kinds, only three carry behaviour (stacks, downtown, capsule),
and two of those are the same thing: something travelling a path, crossing points on the way.
Five are draw-only and are not Circuit work at all; stage 2's "live artwork state" replaces them.

## 3. Panels (special screens)

Panels are registered by name (`engine/host.ts:224`) and opened by an `open` step.

| Panel | Where | What it does |
|---|---|---|
| `talk` | engine, any scene | conversations; opened by DAEMON `talk` verbs |
| `toy` | engine | lock toys for GUARDs: rings, cipher, cryptex, morse; share `engine/toys/common.ts` |
| `camera` | yard (`scenes/yard/camera.ts`) | the gate camera: aim, zoom reads a crate, TAG; zooming on the owned parcel runs a command |
| `scope` | stacks (`scenes/stacks/scope.ts`) | STS-2's top-down camera over blocks A–C: zoom to read roof codes, TAG FOR LIFT runs a command; reefer slots in `camera.bindings.reefers` |
| `cam3` | downtown (`scenes/downtown/camera.ts`) | street camera: aim, zoom, TAG, LOOP fires the lens `loop` verb, which emits `frame` (cable it to the billboard) |

The toys already share one frame. **The three camera panels share nothing but the CSS**: the
320×150 canvas, fitting, aim maths, hit test, zoom transform, crosshair, scanlines and HUD are
copied in all three (about 35–40 lines each). What differs is the picture and what ZOOM, TAG
and LOOP do, and those are already data-shaped: `camera.crates`, `texts`, and a command or verb.

## 4. Building blocks: what exists, what is missing

| Block | Exists | Gap | Proposal |
|---|---|---|---|
| **Mover** | nothing general; three controllers and the level lift each roll their own | **the main gap** | new noun kind MOVER (below) |
| **Zone** | nothing; scene code computes crossings | **gap**, needed by every mover scene and by levels | new noun kind ZONE (below) |
| **Clock / timer** | CLOCK (repeat), TIMER part, deadlines, intervals | no one-shot on a noun; four overlapping mechanisms | CLOCK gains `once`; document which to use when; no new kind |
| **State machine** | the pattern (local state, guarded cases, `current`, SWITCH, enum state) | only how it is shown and edited | an editor view; no runtime change |
| **Camera panel** | three copies | duplication; screens can't be made without code | one engine `camera` panel fed by data, with a registered painter per picture |
| **Simulation** | capsule temperature | unique | stays a registered mechanism, but shown as a device |

## 5. Proposed parts

Names are proposals for review. Like CLOCK, LINK, GUARD and LOG, the new kinds get engine
behaviour; they appear in hack vision and on the schematic, and their events can be cabled.

### MOVER: something that travels a path with stops

- **Placed as:** a noun on a device, with a path in the scene: named stops at positions
  (x, or x and height for lifts), and for each leg either a speed or a duration with easing.
  The level lift's stops come from floors as today.
- **State:** `at` (the stop it is at, or the last one left), `moving` (true/false), `to`.
- **Verbs:** `go <stop>` (one per stop), `call` (go to the nearest stop to the player),
  `stop`, `return` (back to its home stop).
- **Events:** `started`, `arrived` (with `set` able to write the stop, as CLOCK does),
  `left`, and `blocked` when a guard condition on a leg refuses.
- **Artwork:** the mover's position and progress are visual values that artwork binds to,
  like the elevator's `car` and `doors` today.
- **Replaces:** the stacks lift and return path, dlv9's legs, the yard hook, the level lift,
  later the harbor crane call and the train ride.
- **Editor:** stops editable on the stage as handles; legs as a list with speed or duration.

### ZONE: a stretch of the scene that notices who is in it

- **Placed as:** an x range (and optionally a floor) in the scene, drawn as an editor diagram
  like `level.floor`.
- **Watches:** the player, a named mover, or both.
- **State:** `inside` (true/false), `who`.
- **Events:** `enters`, `leaves`.
- **Verbs:** `arm`, `disarm` (an unarmed zone raises nothing).
- **Replaces:** the stacks scan gate, Downtown's gate scan and door decision (a zone the mover
  crosses, with the door verb's cases deciding pass or bonk), the train's tunnel SENSE, and
  later level doors and "you walked in" triggers that are now scene code.

### CLOCK `once`

- `once: true` plus `after` ms: raises its event once after `start`, then stops. Covers the
  capsule boot and reboot waits and Downtown's signal wait.
- Keep TIMER as the player-placeable logic part; recommend deadlines only for gameplay that
  must survive saves with tuning-based durations.

### State view (editor only)

- A STORE whose value has a declared list of options (`enum`) gets a "states" view in the
  inspector: its states as boxes, and every case that `set`s it as an arrow labelled with the
  verb and its `if`. Editing an arrow edits the case. No new runtime.

### Camera panel

- One engine panel `camera`, opened as today, configured per device from data: the feed's
  things (`camera.crates`), texts, which buttons it shows (ZOOM, TAG, LOOP), and what each does
  (a shared command, or a verb on a noun).
- The picture stays code: a registered painter chosen by name (yard approach, stacks roofs,
  street feed), the same rule as registered artwork. The scope's hard-coded reefer slots move
  to data.
- Replaces `scenes/yard/camera.ts`, `scenes/stacks/scope.ts` and `scenes/downtown/camera.ts`
  and the camera bindings.

### Registered mechanisms as devices

- What cannot be built from these parts (capsule temperature) stays registered code, but is
  shown as a device: its values as nouns (a gauge `temp` with events `hot` and `cooled`) and its
  triggers as verbs, so it is wired with cables, and its numbers are edited in the inspector
  instead of a per-scene form.

## 6. What this means for the migration

- Stage 1b builds MOVER, ZONE, CLOCK `once`, the state view and the camera panel, and shows
  them in the Tower lab: the lift rebuilt as a mover, a zone at the door.
- The draw-only controllers (laundromat, sandbox, yard visuals, moth, beach, Downtown's visual
  half) leave the Circuit plan; stage 2's artwork state replaces them.
- Stage 6 then holds only Capsule's thermal mechanism, the metro timetable session and the
  train ride's remaining pieces.

## 7. Review (Tommi, 2026-10-20)

1. **New kinds or behaviour on old ones?** Superseded: "kind" is replaced by two properties,
   **layer** (hardware, software, data) and **function** (sense, act, hold, time, gate, connect,
   record, talk, logic, program); see [CIRCUIT-INVENTORY.md](./CIRCUIT-INVENTORY.md). A mover is
   an act part with a `mover` block, a zone a sense part with a `zone` block.
2. **Hack vision:** every noun is, in principle, visible in hack vision; a per-noun `hidden`
   flag can hide one.
3. **Cable delays:** no. Cables carry no delay of their own; waiting is TIMER and CLOCK.
4. **Physics:** out of scope while the migration does not need it; added when a scene does.
5. **Name:** "the Circuit", for now.

## 8. Kinds or behaviours

Every noun runs its verbs' cases (`perform`, `model.ts:1274`). A noun gets extra engine
behaviour when it carries a settings block: `clock: {every, first}`, `guard`, `link`. The engine
runs that code only when the kind matches too (`model.ts:1228-1230`:
`n.kind === 'CLOCK' && n.clock`). SENSE, ACT, STORE and DAEMON have no block and no extra code;
for them the kind only orders rows in hack vision and limits which nouns bind shared commands.

So a mover is a `mover: {...}` block and a zone is a `zone: {...}` block either way, with the
same engine code. The only choice is which kind the block requires:

| | New kinds (MOVER, ZONE) | SENSE with `zone`, ACT with `mover` |
|---|---|---|
| What the player reads in hack vision | "ZONE", "MOVER" | "SENSE", "ACT" |
| Engine check | `kind === 'MOVER' && n.mover` | `kind === 'ACT' && n.mover` |
| Combining (a scanner riding a crane) | two nouns on one device | two nouns on one device |
| Add noun list | MOVER, ZONE | "Act: path", "Sense: area" |

Recommendation: **SENSE with `zone`, ACT with `mover`**, on the wording alone: a gate
scanner senses and a lift motor acts, and the player's list stays at eight kinds. CLOCK, GUARD,
LINK and LOG stay as they are.
