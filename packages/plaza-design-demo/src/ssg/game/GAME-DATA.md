# ACCESS DENIED: game data

The back yard runs on it, through the zone engine (`game/zone/`); Downtown and Capsule 7B
are next. Started as a proposal; what Tommi has settled is under **Decided**, what is still
open under **Open questions**.

## Decided

- **JSON, written by hand** (by us). No YAML step for now.
- **Data vs code: learned case by case.** No big rule up front; each time something
  moves across the line (or stays put on purpose), it goes in the **Boundary log** below.
- **No editor for now.** JSON plus the build-time check is enough.
- **Logic modules are shared unlockables.** TIMER and SWITCH live in `data/logic.json`,
  not in a zone. Each is a module the player owns, like `legs.so`: `timer.so`, `switch.so`.
  Owned modules are in the save (`Save.modules`; `legs.so` stays `Save.jump`). The board
  shows owned ones as `+ TIMER`, the rest as a dashed `???` slot ("not found yet").
  A new game owns `timer.so`. A zone hands a module out with a `give` step (see **Giving
  things**); `foundIn` names that zone, and the check holds the two together. Nothing hands out
  `switch.so` yet (`foundIn: null`): P09's drawer on MOTH-PC is where it goes.
- **Yard progress is saved**, in the same save as Downtown: `save.zones.yard` (see **Saves**).
- **No hints in the yard for now.** Goals stay (the GOAL line in the HUD); Downtown's fixer
  hints are untouched.
- **Fan-out:** one event can feed several cables (a breaker trip stops every washer). `connect`
  replaces only a cable between the same event and noun; `emit` fires all of them.
- **Combining clues:** both ways: drag one fragment chip onto another on the keyring, or type
  the result at a login's keyboard (see **Keyring**).

## Boundary log

Append one line per decision: what, which side, why.

- Logic parts (TIMER, SWITCH): **data**, in a shared file (`logic.json`), because every zone
  uses them and they are items the player owns.
- Settling a save (a parcel mid-slide comes back on the hook at the chute): **code**
  (`settleYard` in `yard/effects.ts`), next to the chute effect it mirrors.
- Board layout defaults (`DEFAULT_DIR`, `BOARD_HOME` in `schematic.ts`): **code** for now;
  the player's own layout is saved. *Superseded:* now **data** (`layout` on each device), see below.
- The zone engine (`game/zone/`): **code**, one for every zone. A zone is its data file plus
  `ZoneRules` (effects, derived values, settle, what it needs) and `ZoneView` (drawing, own
  panels, extra E targets), bundled as a `ZoneDef`. The game hosts one with `new ZoneHost(…, def)`.
- Where devices stand in the world (`layout.spot`), their board home (`layout.board`) and noun
  directions (`layout.dir`, `layout.vision`): **data**. Exits and things that come and go (the
  pickup tray): **code** (`ZoneView.targets`), since they follow scene art and state.
- State keys: the data owns them; the code lists only the keys it relies on (`needs.state`),
  and the check requires those. Data may add its own keys freely (before: exactly the code's).
- `timer.wait`: **code**, moved from the yard to the engine (`ENGINE_EFFECTS`): TIMER is a
  shared module, so every zone needs it. Its line moved to `engine.json`.
- Generic wording (wiring, talk, guards, seals, trace, net, keyring): **data**, in
  `data/engine.json`; any zone may override a key with the same kind (line or label).
- Guards, sealed sectors, trace, the net, the keyring and combining: **engine code** with
  **data** switches (`guard`, `sectors`, `log`, `link`, `keyring`, `give`/`trace`/`unseal`
  steps). How a seal opens, how trace moves and how fragments combine are a fixed set of
  engine rules; which device has what, the numbers and every word are data.
- Fragment transforms (`reverse`, `upper`, `lower`, and joining): **code** (a small fixed
  set); which rules exist and what recipes make (`from`): **data**.
- Settling (`settleYard`) and the yard's own check (crates, the parcel's crate): **code**, in
  `YARD_RULES` (`settle`, `check`), next to the effects they mirror.
- The watchdog: **engine code** (`zone/watchdog.ts`: its walk, the freeze, its sprite) with a
  **data** switch (`watchdog: { route, dwellMs, moveMs }` in a zone or `net.json`). What freezing
  means (no verbs, no signals in or out, sequence seals forget) is a fixed engine rule; where it
  walks and how fast is data. Its events are an **engine noun** (`watchdog`, kind WATCH) on each
  device of the route, so puzzles wire "while it's away" with ordinary cables.
- Clocks: **engine code** (`zone/clock.ts`), a noun kind (`CLOCK`) with **data** `clock: { every }`.
  PUZZLES.md had proposed a named effect `clock.every`; a noun kind won because the schedule must
  be a thing on the schematic you can read, stop and cut cables from, and it needs no zone code.
- Lock toys: **engine code** (`zone/toys/`, one panel and one pure rule per toy: rings, cipher,
  cryptex, morse) with **data** parameters on the guard (`toy` plus `rings` / `cipher` / `cryptex`
  / `morse`). How a toy plays is code (geometry, timing); every number, word and line is data.
- Cards (SLOW, PING for the shield rings): **data** keyring items (`kind: "card"`); what a card
  does is **code** (a fixed set, like fragment rules).
- Giving modules and tokens: **data** (`{ "give": "switch.so" }`, `{ "give": "tokens", "count": 3 }`);
  the save fields they land in are **code** (`ZoneStore.grant` / `tokens`, `game.ts`).
- Fixed cables: **data** (`fixed: true` on a pre-wired cable); refusing the cut is **engine code**.
- A guard's own success line: **data** (`guard.say`), so P05/P06/P08 keep their grant lines
  without an `opened` handler. (The PUZZLES.md sketches had used `on.opened`; the engine never
  ran verbs for events, so the line moved onto the guard.)
- What the save keeps (trace, lockouts, clocks, the watchdog's place, cut cables by id):
  **engine code** (`ZoneModel.snapshot` / `restore`), decided below under **Saves**.

## The idea in one paragraph

A zone is a data file that says **what** is there: devices, their nouns and verbs,
which events they raise, which cables exist, what everything says, the dialogue,
goals. The code says **how** the few fiddly rules work (the claw, a timer,
the hatch opening for one second) as **named effects**, and the data points at them
by name. Writing a new device, rewording a reply or adding a dialogue branch is a
data change. A new kind of behaviour is a code change: one new effect.

## The zone engine

`game/zone/` runs any zone file. Pieces:

- `model.ts` (`ZoneModel`): the rules, no DOM. State, devices, nouns, verbs, cables, logic
  parts, and the hacking layer (guards, sectors, trace, net, keyring). Node can run it; `now`
  is swappable for tests.
- `rules.ts`: `ZoneRules`, what a zone's code gives the engine (`effects`, `panels`,
  `derived`, `settle`, `needs`, `check`), the engine's own effects (`timer.wait`), and
  `contractOf`, which turns rules into the contract the build checks.
- `schematic.ts`, `panels.ts`: the overlay (device, board, hack vision) and the full-screen
  panels (the engine's `talk`; a zone's own, like the yard's `camera`, via `PanelFn`).
- `watchdog.ts` (its walk, pure), `watchdog-view.ts` (its sprite and badge on the schematic),
  `clock.ts` (CLOCK nouns, pure), `toys/` (the lock toys: `rings.ts`, `cipher.ts`, `cryptex.ts`,
  `morse.ts`, each a pure rule plus its panel; `index.ts` is the engine panel `toy`),
  `styles.ts` (their CSS, inlined by `render.tsx`).
- `host.ts` (`ZoneHost`): one zone on screen: model, overlays, HACK/BOARD buttons, trace
  ticking, save. `ZoneView` is a zone's drawing, own panels and extra E targets; `ZoneDef`
  is `{ data, rules, view }`.

A new zone: `data/<id>.json` (add it to `ZONE_FILES` in `data/index.ts` and to the
`checkGame` list in `scripts/generate-demos.tsx`), a `ZoneRules` with its effects (often
none), and a `ZoneView` that draws it. `game.ts` hosts it with `hostZone(def)`; its progress
goes to `save.zones.<id>`.

## What the data describes

One file per zone: `game/data/yard.json`. Top level:

| Field | What it holds |
|---|---|
| `state` | Every state key and its starting value (`armAt: "home"`, `gateAllowed: false`). |
| `tuning` | Numbers effects read: `gateOpenMs`, `slideMs`, … |
| `devices` | The zone's devices. Each: `id`, `name`, `look`, `status`, `nouns`, optional `state`, `sectors`, `layout`. |
| `nodes` | Computers on the net, not in the world (same shape as devices, no `layout.spot`). |
| `cables` | Cables present from the start (`from: "crane.claw:dropped"`, `to`, `verb`). Empty in the yard. |
| `keyring` | Keyring items this zone hands out: clue fragments, key chips, rules. |
| `camera` | The yard's: the crates CAM-1 sees (position, size, label). |
| `dialogue` | Conversation trees, one per daemon (`hinge`). |
| `goals` | In order: `id` and the objective `text`. |
| `texts` | Every other line and label the code asks for, by key (and overrides of `engine.json`). |
| `watchdog` | Optional: the Registry's watchdog walking this zone's devices and nodes (see **The watchdog**). |

Shared files: `logic.json` (modules), `net.json` (`nodes`, `cables`, `keyring`, `watchdog` any zone
may reach), `engine.json` (`texts`: the engine's own wording).

The logic modules are one shared file, `game/data/logic.json`: `modules`, each with an
`id` (`timer.so`), `start` (owned in a new game), `foundIn` (where it is found; `null` for
now) and `part`, a device like a zone's. A placed copy is `timer1`, `timer2`, … and gets
its own `state`. The check runs it in each zone it is used in, and reports it as `logic.json`.

A **noun** has an `id`, a `kind` (SENSE / ACT / STORE / DAEMON; GUARD, LOG, LINK and CLOCK
add engine behaviour, below), `verbs`, optional
`events`, optional `current` (the state key the highlighted verb follows) and `on`:
what each verb does. A verb runs a **case**: optional `if`, some `do` steps, and a line
to `say`. A list of cases means "the first whose `if` holds":

```json
"lock": { "kind": "ACT", "verbs": ["open"], "on": { "open": [
  { "if": "!signal",      "say": ["use lock --open", "HINGE: \"hands off the lock…\"", "err"] },
  { "if": "!gateAllowed", "say": ["signal → lock --open", "HINGE ignores the signal…", "err"] },
  { "do": [{ "effect": "hatch.open" }], "say": ["signal → lock --open", "HINGE: \"opening. one second.\""] }
] } }
```

The small vocabulary, all of it:

- **Steps** (`do`): `set` a state key `to` a value, `open` a panel (`talk`, optionally
  `with` a dialogue id; `camera`), `emit` one of this noun's events, tick a `goal`, run an
  `effect`, `give` something (a keyring item, a module, or `tokens` with a `count`), raise or
  lower this device's `trace` (%), `unseal` a sector (`sector` or `device/sector`). Any step may
  have an `if`.
- **Conditions**: `key`, `!key`, `key=value`, and `signal` (the verb came over a cable).
- **Templates**: `{verb}`, `{via}` (`"signal → "` when a cable sent it), any state key.
- **Lines**: `["command", "reply", "ok" | "err" | "dim"]`, written out or as a key into `texts`.
- **Status**: a string, or parts like `{ "if": "held", "then": " · holding {held}" }`.

**Dialogue** nodes have `text`, `choices` (`[what you say, next node]`), optional `do`
steps (HINGE's "Deal." sets `gateAllowed` and ticks the `talk` goal), and may be a list
of variants picked by `if`. `free` says what typing your own line does (a regex → node).

## Layout

Each device may carry `layout`:

```json
"layout": {
  "spot": { "x": 350, "w": 186, "h": 130 },          // in the world: tap, E, hack vision
  "board": { "x": 0.5, "y": 0.3 },                   // home on the board (fractions)
  "dir": { "arm": "down", "claw": "up" },            // which side each noun sits on
  "vision": { "arm": "down", "claw": "up" }          // the same in hack vision
}
```

A zone device needs `spot`; a node must not have one. Without `board`, devices and nodes take
the next free slot under the zone's own; logic parts land by the palette.

## Pre-wired cables

`cables` (zone and `net.json`) are laid at the start, look like the player's and cut the same
(tap the cable). A cable touching a node arrives when that node is connected. The check refuses
a cable into a GUARD, or into the watchdog's noun.

```json
"cables": [
  { "from": "clock.clock:night", "to": "plug.power", "verb": "off" },
  { "id": "door.safety", "from": "train.brake:stopped", "to": "train.doors", "verb": "lock", "fixed": true }
]
```

- `id`: optional; saves remember cuts by it (default `from>to`, which is fine until you move a
  cable's ends). The check refuses two with the same id.
- `fixed: true`: a **conduit**: drawn as a solid casing, and a tap on it only says it cannot be
  cut (`wire.fixed`); a new cable between the same event and noun is refused too. For puzzles
  where you must work around wiring you can't change (cut something else, freeze the device with
  the watchdog, switch a log off). Saves never lose a fixed cable.
- **Saves merge by id**: a pre-wired cable the save has keeps its place; one the player cut stays
  cut (the save lists cut ids under `cut`); one added to the data after the save was written
  appears. (Saves from before `cut` existed get every pre-wired cable back; none of them had one.)

## Keyring

The player's keyring (`Save.keyring`, item ids) travels across zones. Items live in a zone's
or `net.json`'s `keyring`; ids are global (the check refuses a duplicate across files).

```json
"keyring": [
  { "id": "pet",  "kind": "fragment", "label": "cat's name", "text": "pixel" },
  { "id": "moth.key", "kind": "key", "label": "moth's key" },
  { "id": "rule.reverse", "kind": "rule", "label": "policy 7", "rule": "reverse" },
  { "id": "moth.pass", "kind": "fragment", "label": "moth's password", "text": "sprat0412", "from": ["sprat", "bday"] }
]
```

- A step `{ "give": "pet" }` (reading a food bowl) puts one on the keyring, once.
- **Combining** (drag a chip onto another): a fragment whose `from` names the two is made
  (a recipe, either order); else a fragment on a `rule` makes `reverse(pet)`; else two
  fragments join, the dragged one first: `join(pet,bday)`. Made fragments are stored by that
  expression (nothing else to save) and can be thrown away with the **×** next to their chip
  (`discard`; the data's own items have no ×: they are evidence). Rules: `reverse`, `upper`,
  `lower`. A made fragment stops at 40 characters.
- At a login's keyboard, tapping a chip types its text, so a combination can also be typed.
- **Cards** (`"kind": "card"`, `"card": "slow" | "ping"`): one-shot tricks a lock toy accepts,
  once per try, while they are on the keyring. Today the shield rings take both: SLOW (rings at
  0.35× for 4 s), PING (the next lock counts ±38° instead of the tolerance).

  ```json
  { "id": "card.slow", "kind": "card", "label": "SLOW", "card": "slow" }
  ```
- The keyring strip sits at the bottom right of the board (the logic palette is bottom left), so
  it no longer covers the devices.
- Ids `tokens` and `*.so` are not allowed on the keyring: `give` would read them as tokens or a
  module.

## Guards

A GUARD noun is a login. Its verbs come from the engine: `try <label>` per fragment on the
keyring, and `type…` (a small input in the schematic). Dragging a fragment chip onto it
tries the fragment too.

```json
{ "id": "login", "kind": "GUARD", "events": ["opened"],
  "guard": { "password": ["pixel0412"], "tries": 2, "lockMs": 4000, "trace": 30,
             "near": { "pixel": ["login pixel", "half right. the other half is a date.", "err"] },
             "do": [{ "goal": "in" }] } }
```

- `password`: a string or a list; compared without case, spaces, `-` or `_`.
- Wrong guesses: after `tries` in a row (default 1) it locks for `lockMs` (default 5000; 0
  never locks); each adds `trace` % to the device. A `near` guess gets its own reply.
- Right: `say` (optional, a line or a text key) is said instead of the engine's `guard.ok`,
  `do` runs, an `opened` event fires (if listed in `events`), and every sector sealed with this
  guard opens. Guards passed are saved. Signals cannot log in.
- `toy` instead of `password`: a lock toy (see **Lock toys**).
- A guard on a frozen device (the watchdog sits on it) takes no guesses.

## Lock toys

One toy per lock type (PUZZLES.md, Decided 4). A GUARD with `toy` has no password and no
keyboard: its verb is `probe` (the text `toy.verb`), which opens the toy full screen. Solving it
opens the guard exactly like a right password (`say`, `do`, `opened`, its sectors). A wrong
answer (a cryptex word, a Morse message, a cipher read out at the wrong shift) is a wrong guess:
`tries`, `lockMs`, `trace` and `near` all apply. A fragment dropped on a toy guard is refused
(`toy.hands`). Signals cannot play it; a frozen or locked-out device cannot either. Keyboard,
mouse and touch all work; Escape closes the panel.

```json
{ "id": "shields", "kind": "GUARD", "guard": { "toy": "rings", "say": ["probe dispatch", "guard down. DISPATCH uplink reachable.", "ok"],
  "rings": { "rings": [{ "speed": 70, "gap": 50, "start": 30 }, { "speed": -95, "gap": 50, "start": 150 }, { "speed": 120, "gap": 50, "start": 260 }], "tolerance": 20 } } }
{ "id": "cipher", "kind": "GUARD", "guard": { "toy": "cipher", "cipher": { "text": "KVU'A AYBZA. CLYPMF.", "shift": 7 }, "lockMs": 8000 } }
{ "id": "case", "kind": "GUARD", "guard": { "toy": "cryptex", "cryptex": { "word": "ghost", "rings": ["FGHJ", "AEHO", "OUIA", "RSTN", "TKLM"] } } }
{ "id": "bulb", "kind": "GUARD", "guard": { "toy": "morse", "morse": { "message": "ghost", "unitMs": 220 } } }
```

| Toy | Parameters | How it plays |
|---|---|---|
| `rings` (shield rings) | `rings`: 1–5 rings, outermost first: `speed` °/s (negative: the other way, at most 360), `gap` ° (10–180), `start` ° (where the gap starts; 0 = at the port). `tolerance` ° (default 20). | Lock each ring (Space, Enter, a tap, LOCK) while its gap is at the port on top. A miss: that ring flinches, spins the other way 15 % faster (up to 220 °/s). Cards SLOW and PING (S, P) if on the keyring. |
| `cipher` (Caesar wheel) | `text`: the line as shown, enciphered; `shift` 1–25: each letter goes back this many places. | Turn the inner ring (← →, drag it round, ◀ ▶); the lens shows the line read through it. READ IT (Enter) at the right shift opens it. |
| `cryptex` | `word` (2–8 letters or digits); `rings`: each ring's letters (default A–Z), one per letter, each must hold its letter. | ← → pick a ring, ↑ ↓ turn it, or type the letters; ▲ ▼, drag or the wheel on a ring. PULL (Enter). It never starts on the word. |
| `morse` (blinking lamp) | `message` (letters, digits, spaces); `unitMs`: one unit (default 220; a dash is 3, 1 between marks, 3 between letters, 10 before it repeats). | Watch the lamp; tap it back: hold Space, the lamp or TAP (short ·, long –), or `.` `-`; a pause, `/` or → ends a letter; Backspace; SEND (Enter). |

Texts (engine.json, overridable): `toy.verb`, `toy.open`, `toy.hands`, `toy.solved`, `toy.locked`,
and per toy `toy.<kind>.title`, `toy.<kind>.hint`, its buttons, `toy.rings.hit` / `.miss`,
`toy.card.slow` / `.ping`. The check: `toy` one of the four, its parameters present and sane,
no `password` beside it, parameters of another toy refused.

## Sealed sectors

```json
"sectors": [
  { "id": "core", "label": "CORE", "seal": { "guard": "login" } },
  { "id": "drawer", "seal": { "key": "moth.key" } },
  { "id": "journal", "seal": { "sequence": ["red", "green", "blue"], "withinMs": 3000, "signal": true } },
  { "id": "flag", "seal": { "if": "doorOpen" } }
]
```

Nouns with `"sector": "core"` show as dashed `???` until it opens, then unfold in place. A tap
on one says what the seal wants (and opens a `key` seal if the chip is on the keyring; dragging
the chip there works too). A `sequence` seal is itself a noun named like the sector (kind SEAL,
verbs = the sequence): wire signals into it; in order, each within `withinMs`, it opens; a
wrong one resets. `signal: true` ignores fingers. An `if` seal opens as soon as its condition
holds. A step `{ "unseal": "core" }` opens one from data (a root verb). Opened sectors are saved.

## Trace

A LOG noun records you while you are inside its device: its schematic is open, or you used one
of its verbs on the board in the last `linger` ms.

```json
{ "id": "log", "kind": "LOG", "verbs": ["off", "on"], "events": ["entry"],
  "log": { "rate": 20, "fall": 10, "when": "logging", "archive": "relay.archive", "lockMs": 10000 },
  "on": { "off": { "do": [{ "set": "logging", "to": false }], "say": ["log --off", "log: off."] }, … } }
```

- `rate`: % per second while recording; `fall`: % per second it drains otherwise (default
  rate / 2). It records only while `when` holds and a cable from the log to its `archive`
  exists (the check requires a pre-wired one): cut it, or switch the log off.
- A `{ "trace": -100 }` step cleans it (a root verb). Wrong guesses add theirs.
- At 100 %: the player is kicked out of the device (its schematic closes) and locked out for
  `lockMs` (default 10 s; signals still run). The meter shows on the device's core, on the
  board and in hack vision, with its number (`trace.meter`: TRACE 42%); it pulses red from 70 %.
  While a lockout runs, the meter turns into a red striped countdown (`lock.meter`: LOCKED · 7 s)
  that empties as the lock runs out; a locked guard shows its countdown among its verbs.
- Trace and lockouts **are saved** (see **Saves**): reloading is not a way out.

## The net

A LINK noun (`"link": { "reach": ["concierge"] }`) has the engine's verbs `scan` (nodes in reach
appear on the board as dashed silhouettes) and `connect <node>` (the node comes in as a full
schematic, on the board only, with its pre-wired cables). A node may have its own LINK: that is
a hop. Nodes are in a zone's `nodes` or in `net.json`. Seen and connected nodes are saved.

## The watchdog

The Registry runs a watchdog process (LEVELS.md). It walks a route of devices and nodes on a
fixed rhythm; the one it sits on is **frozen**.

```json
"watchdog": { "route": ["friendnet", "mothpc"], "dwellMs": 4000, "moveMs": 8000 }
```

- In a zone file (its devices and nodes) or in `net.json` (net nodes only). Optional `id`
  (default `watchdog`; saves keep its place by it) and `name` (default: the text `watchdog.name`).
  A device may be on one route only.
- It sits on each stop for `dwellMs`, walks `moveMs` to the next, and loops; it starts sitting on
  the first stop.
- **Frozen**: the device's verbs refuse (`watchdog.frozen`), a signal into it is dropped with a
  dry line (`watchdog.drop`), nothing leaves it (`watchdog.mute`: its events, its clocks), its
  guards take no guesses and its toys cannot be played, and a sequence seal on it forgets what it
  heard when the watchdog arrives. Trace and lockouts carry on as usual.
- **Its events**: every device on the route gets an engine noun `watchdog` (kind WATCH, verb
  `read`: where it is and when it moves) with events `arrives` and `leaves`. They fire even on the
  frozen device. Wire "while it's away" (`friendnet.watchdog:leaves → switch1 turn on`) or "use the
  freeze" (the scanner is frozen, so its alarm cable is dead for `dwellMs`). The check refuses a
  noun of your own called `watchdog` on a route device, and cables into the watchdog's noun.
- **On screen**: a small red dog sits on the corner of the frozen device's core with the seconds
  until it moves, and trots from core to core while it walks (when both are on screen; otherwise
  it hops off and on). The board has a badge: `watchdog.badge.at` / `watchdog.badge.walk`. In hack
  vision it shows where its device is on screen. A frozen device's core is red and dashed, its
  status says FROZEN.
- Saved: how far into its loop it is, so a reload does not reset it.

## Clocks

A CLOCK noun is an event source on a rhythm (PUZZLES P01's schedule, P10's music box clock, P13's
laundromat opening).

```json
{ "id": "clock", "kind": "CLOCK", "events": ["night", "day"],
  "clock": { "every": 4000, "first": 1000, "set": "phase", "start": true },
  "verbs": ["read"], "on": { "read": { "say": ["cat clock", "rule 1: at night, plug off."] } } }
```

- Every `every` ms (100 or more) it raises its next event: `events` in turn (`night`, `day`,
  `night`, …; one event just repeats). `first`: the first beat comes after this many ms (default
  `every`). `set`: a state key that holds the last event (`phase=night` in a condition). `start`:
  false to begin stopped.
- Engine verbs `start` and `stop` (a finger or a cable); your own verbs (`read`) come after. A
  schedule is beaten by cutting its cables, stopping it, or by the watchdog freezing its device.
- A long pause (a tab in the background) does not make it catch up: one beat, then on rhythm.
- Clocks of a node start when the node is connected; a logic part may carry one too.
- Saved: which event is next, how far into the beat, stopped or not.

## Giving things

A `give` step hands the player one of three things:

```json
{ "give": "moth.key" }              // a keyring item (fragment, key chip, rule, card): once
{ "give": "switch.so" }             // a logic module from logic.json: into save.modules, once
{ "give": "tokens", "count": 3 }    // noodle tokens: into save.tokens, every time it runs
```

Each says its line (`keyring.*`, `give.module` / `give.module.have`, `give.tokens` with `{n}` and
`{total}`). A module given shows up in the board's palette at once. The check: an unknown id says
whether it looked like a module (`*.so`) or a keyring item; `tokens` needs a whole `count` from 1;
`count` goes with nothing else. **`foundIn`** in `logic.json` must name the zone (or `net`) whose
data gives the module, and a module some file gives must say so in `foundIn` (unless `start`).

## What stays code

- **Named effects** (`yard/effects.ts`): `crane.claw` (what can be grabbed, dropping into
  the chute), `hatch.open` (open for `gateOpenMs`), plus the parcel's slide that the claw
  starts. The engine's `timer.wait` (wait, then raise `done`) is in `zone/rules.ts`. They read
  their wording from `texts`.
- **Panels and drawing**: how CAM-1 zooms, how the board drags cables, the canvas scene.
  They read their words and crate positions from data, but the look is code.
- **The contract**: `YARD_RULES` in `effects.ts` lists what the code provides and expects
  (effects, panels, state keys, computed values like `gateOpen`, goals it ticks, text keys);
  `contractOf` adds the engine's. The build (`checkGame`) checks every zone, `logic.json`,
  `net.json` and the keyring against them.

Rule of thumb: if a designer would want to change it without a programmer, it is data.
If it needs a loop, geometry or timing logic beyond "wait N ms", it is an effect.
I kept the vocabulary small on purpose; when a pattern repeats in effects, it can
graduate to a step (a `wait` step is the obvious next one).

## File format

| Option | For | Against |
|---|---|---|
| **JSON**, typed and checked | Any tool reads and writes it (a future editor, a script, an LLM); bundled by esbuild as is; no build step | No comments; strict quoting |
| TS objects (`satisfies ZoneData`) | Full type-checking and autocomplete; comments | Code, not data: an editor can't save it back; tempts people to write closures into it |
| YAML / TOML → JSON at build | Pleasant to write by hand; comments | A converter step and a dependency; YAML's surprises (`no` → false) |

**Recommendation: JSON**, bundled into the page by esbuild (no fetches, so the strict
CSP and offline play are unaffected). If hand-writing JSON gets tiresome, YAML can be
added later as a source that compiles to the same JSON; nothing else changes.

## Validation: where errors show

Two layers, neither a manual step:

1. **Type-check** (`tsc`, your editor): `data/index.ts` assigns the JSON to
   `Loose<ZoneData>`, so a missing field or a string where a list belongs is a red squiggle.
2. **Build** (`pnpm build:homepage`): `data/check.ts` runs first and fails the build
   with one readable line per problem:

   ```
   yard.json › devices[gate] › nouns[lock] › on.open[2] › do[0]: unknown effect "hatch.opne" (code has: crane.claw, hatch.open, timer.wait)
   yard.json › cables[0]: verb "shut" is not one of gate.lock's verbs
   yard.json › dialogue.hinge › nodes.ping › choices[0]: leads to "deall", which is not a node
   ```

   It checks references (cables, effects, panels, goals, dialogue links, text keys),
   enums (noun kinds, tones), state keys against the code, unknown fields (typos),
   duplicate ids and unreachable cases.

At runtime a missing text shows as `[missing text key]` in the terminal rather than crashing.

## How authoring can grow

- **One file per zone** (`yard.json`, later `downtown.json`), plus shared files when
  something repeats across zones (logic parts, common replies).
- **Ids are the glue**: `device.noun:event` for cables, node ids for dialogue, goal ids,
  text keys. Keep them short and stable; rename with care since saves will store them.
- **Downtown** fits the same shape later: machines are devices, its terminal commands
  become nouns and verbs (`ls`, `cat`, `login` as cases with conditions), NPC lines are
  dialogue, objectives are `goals` (the fixer's stepped hints would bring `hints` back, for Downtown). Its save (`flags`, `freed`) is `state`.
- **Localisation**: all wording is already in data. Next step is moving `texts`,
  dialogue and `look`s into `texts.en.json` keyed by id, with the zone file holding keys only.
- **Layout**: done: `layout` on each device (see **Layout**).
- **Crafting**: removed with the workbench. The format keeps an optional
  `bench: { parts, recipes }` whose recipes make logic parts, so it can return.
- **A visual editor** (not now, see Decided): JSON plus the checker is the foundation.
  A first editor could be the game's own board in an "author mode" that saves the zone file back.

## Saves

One localStorage object (`access-denied-save-v1`). Besides Downtown's fields:

```ts
modules: string[]            // owned logic modules: ["timer.so"]; legs.so stays `jump`
keyring: string[]            // keyring item ids, and made fragments as `join(a,b)`
zones: { [id]: ZoneSave }    // each zone's progress, by zone id

interface ZoneSave {
  state: { found, armAt, held, parcel, parcelAt, gateAllowed, pan }   // the zone's state keys, settled
  goals: string[]                                   // goal ids reached
  links: { from, to, verb }[]                       // every cable (pre-wired ones you cut are missing)
  logic: { id, kind, state? }[]                     // placed parts: timer1, switch1 (+ its on/off)
  local?: { [device]: state }                       // devices' and nodes' own state
  open?: string[]                                   // sectors opened: "pc/core"
  passed?: string[]                                 // guards passed: "pc.login"
  net?: { seen: string[]; connected: string[] }     // nodes met
  cut?: string[]                                    // pre-wired cables the player cut, by id
  trace?: { [device]: number }                      // trace %, above 0
  locks?: { [device | "device.noun"]: number }      // running lockouts: when they end (Date.now ms)
  clocks?: { ["device.noun"]: { next, ms, off? } }  // CLOCK nouns: next event, ms into the beat, stopped
  watchdog?: { [id]: number }                       // each watchdog: ms into its loop
  board?: { known: string[]; pos; offsets; vision } // board positions, noun offsets, devices known
}
```

Older saves get `modules` from the new-game default, an empty `keyring` and an empty `zones`.
Empty engine fields are left out, so the yard's save looks as before. The yard writes
its part a moment after things go quiet, when you leave it, when the game stops and when the
page is hidden (`pagehide`); while trace or a lockout moves it also writes every 2 s at most.
Things in flight are not stored: a parcel in the chute or sliding comes back on the hook at the
chute, a timer counting is simply gone. On load, anything that no longer fits the data
(a removed noun, a renamed part) is dropped. `reset yard --yes` in the terminal starts the
yard over and keeps the rest.

Decided (save details):

- **Trace and lockouts survive a reload**, so reloading is not a way out. Trace comes back as it
  was written. A lockout is stored as the wall-clock time it ends, so time away counts: a lock
  that ran out while the game was closed is gone, one that did not comes back with what is left.
- **Pre-wired cables merge by id** (see **Pre-wired cables**): the player's cuts are kept, cables
  new in the data appear, fixed ones always come back.
- **Clocks and the watchdog keep their place** (cheap, and a reload should not be a way to reset
  a patrol either). Timers counting and signals in flight are still not stored.

## Where things are

- `game/data/types.ts`: the format, as TypeScript types.
- `game/data/yard.json`: the back yard. `game/data/logic.json`: the shared logic modules.
  `game/data/net.json`: the shared net (empty for now). `game/data/engine.json`: engine wording.
- `game/data/check.ts`: the build-time check (`checkGame`). `game/data/index.ts`: bundles the JSON.
- `game/zone/`: the engine (see **The zone engine**).
- `game/yard/`: the yard's own code: `effects.ts` (`YARD_RULES`), `camera.ts` (CAM-1),
  `scene.ts` (drawing), `index.ts` (`YARD_ZONE`).

## Cutscenes

`game/data/cutscenes.json`: one entry per cutscene, keyed by its id (`intro`). The picture
is code (`game/cutscenes/`, one draw function per id); everything said and timed is here:

```json
"intro": {
  "title": "ACCESS DENIED",          // shown in the window header while it plays
  "duration": 26,                    // seconds; then it hands over
  "next": "downtown",                // the zone it hands over to: "downtown", "yard" or a scene id
  "cards": [ { "at": 2.5, "until": 9, "text": "The city never logs off. …" } ]
}
```

Cards are typed out in the bottom letterbox bar from `at` to `until` (seconds), one at a time;
keep them to one or two short lines. A new cutscene needs an entry here and a draw function in
`cutscenes/index.ts` (`DRAW`). Code plays one with `game.playCutscene(id, then?)`; without `then`
it hands over to `next`. `?play=<id>` plays it on start.

Boundary: the picture (layout, motion) is **code**; titles, timing, cards and the next zone are **data**.

## Open questions

1. **A `wait` step?** Should a `wait` step replace the timer effect? (Decided per case:
   record the answer in the Boundary log when it comes up.)
2. **Where is `switch.so` found?** The step exists now (`{ "give": "switch.so" }`, see **Giving
   things**); PUZZLES P09 puts it in MOTH-PC's drawer. It stays `foundIn: null` until that zone is
   built (the check then requires `foundIn` to name it).
3. **Localisation**: when, if ever, do `texts` move to `texts.en.json`?
4. ~~PUZZLES.md's format sketches~~ **Closed (2026-10-14):** the sketches now use the engine's
   format (`give`, `password`, LOG with `rate`, `sector` on each noun, `seal.key`, `link.reach`,
   CLOCK nouns, the engine's `watchdog` noun, `guard.toy`). Where a sketch was clearly better the
   engine took it: a guard's own success line (`guard.say`, from the sketches' `on.opened` lines).
5. Built since: the watchdog, `give` for modules and tokens, the lock toys, `fixed` cables, CLOCK
   nouns. Not built: the `effect`s the sketches name (`node.free`, `pixel.move`,
   `dlv.drive`, `washer.run`, `train.brake`, …): zone code, written with each zone.
6. **Toys and trace:** playing a toy does not count as being inside the device (only `probe` and
   answers touch it). Should a LOG fill while a toy panel is open?
