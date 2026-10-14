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
  A new game owns `timer.so`; nothing hands out `switch.so` yet (`foundIn: null`, TODO).
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
- How high a device sits in the world (`layout.spot.y`: a sign on a wall, a relay on a roof):
  **data**, next to `x`, `w`, `h`. Hack vision frames it there, taps find it there, and its E
  target says how high it is (`ZoneTarget.y`) so the game can tell which ledge you reach it from.
- A device that moves in the world (DLV-9 driving to the market gate): **code**, `ZoneRules.place`
  (where it stands now, or null while it is out of the world). Its home stays `layout.spot`.
- Typing in the deck (the terminal, last resort) on a zone: **engine**, `ZoneHost.typed(fn)` runs
  what was typed without echoing the shell line a second time; `ZoneHost.viewing` is the device
  whose schematic is open. What the commands mean (`ls`, `cat`, `login`) is the zone's code.

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
  `derived`, `settle`, `needs`, `check`, `place`), the engine's own effects (`timer.wait`), and
  `contractOf`, which turns rules into the contract the build checks.
- `schematic.ts`, `panels.ts`: the overlay (device, board, hack vision) and the full-screen
  panels (the engine's `talk`; a zone's own, like the yard's `camera`, via `PanelFn`).
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

Shared files: `logic.json` (modules), `net.json` (`nodes`, `cables`, `keyring` any zone may
reach), `engine.json` (`texts`: the engine's own wording).

The logic modules are one shared file, `game/data/logic.json`: `modules`, each with an
`id` (`timer.so`), `start` (owned in a new game), `foundIn` (where it is found; `null` for
now) and `part`, a device like a zone's. A placed copy is `timer1`, `timer2`, … and gets
its own `state`. The check runs it in each zone it is used in, and reports it as `logic.json`.

A **noun** has an `id`, a `kind` (SENSE / ACT / STORE / DAEMON), `verbs`, optional
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
  `effect`, `give` a keyring item, raise or lower this device's `trace` (%), `unseal` a
  sector (`sector` or `device/sector`). Any step may have an `if`.
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
  "spot": { "x": 350, "w": 186, "h": 130, "y": 0 },  // in the world: tap, E, hack vision (y: its bottom above the street)
  "board": { "x": 0.5, "y": 0.3 },                   // home on the board (fractions)
  "dir": { "arm": "down", "claw": "up" },            // which side each noun sits on
  "vision": { "arm": "down", "claw": "up" }          // the same in hack vision
}
```

A zone device needs `spot`; a node must not have one. Without `board`, devices and nodes take
the next free slot under the zone's own; logic parts land by the palette.

## Pre-wired cables

`cables` (zone and `net.json`) are laid at the start, look like the player's and cut the same
(tap the cable). A cable touching a node arrives when that node is connected. The save keeps
the cables as they are, so a cut one stays cut. The check refuses a cable into a GUARD.

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
  expression (nothing else to save) and can be dropped again (`discard`). Rules: `reverse`,
  `upper`, `lower`. A made fragment stops at 40 characters.
- At a login's keyboard, tapping a chip types its text, so a combination can also be typed.

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
- Right: `do` runs, an `opened` event fires (if listed in `events`), and every sector sealed
  with this guard opens. Guards passed are saved. Signals cannot log in.

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
  board and in hack vision. Trace and lockouts are not saved.

## The net

A LINK noun (`"link": { "reach": ["concierge"] }`) has the engine's verbs `scan` (nodes in reach
appear on the board as dashed silhouettes) and `connect <node>` (the node comes in as a full
schematic, on the board only, with its pre-wired cables). A node may have its own LINK: that is
a hop. Nodes are in a zone's `nodes` or in `net.json`. Seen and connected nodes are saved.

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
  board?: { known: string[]; pos; offsets; vision } // board positions, noun offsets, devices known
}
```

Older saves get `modules` from the new-game default, an empty `keyring` and an empty `zones`.
Empty engine fields are left out, so the yard's save looks as before. The yard writes
its part a moment after things go quiet, when you leave it and when the game stops. Things
in flight are not stored: a parcel in the chute or sliding comes back on the hook at the
chute, a timer counting is simply gone. On load, anything that no longer fits the data
(a removed noun, a renamed part) is dropped. `reset yard --yes` in the terminal starts the
yard over and keeps the rest.

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
2. **Where is `switch.so` found?** Nothing hands it out yet (`foundIn: null` in `logic.json`).
3. **Localisation**: when, if ever, do `texts` move to `texts.en.json`?
4. **PUZZLES.md's format sketches** differ in places from what the engine built (`clue` step →
   `give`; `accepts` → `password` list; a STORE with `trace.fillMs` → a LOG noun with `rate`;
   sector `nouns` inside the sector → `sector` on each noun). Align the sketches, or the engine?
5. Not built yet: the watchdog, `{ "module": … }` (granting a module), guard toys, `fixed`
   cables, `clock.every`.
