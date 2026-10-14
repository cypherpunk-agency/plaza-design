# ACCESS DENIED: game data

The back yard runs on it; Downtown does not yet. Started as a proposal; what Tommi
has settled is under **Decided**, what is still open under **Open questions**.

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

## Boundary log

Append one line per decision: what, which side, why.

- Logic parts (TIMER, SWITCH): **data**, in a shared file (`logic.json`), because every zone
  uses them and they are items the player owns.
- Settling a save (a parcel mid-slide comes back on the hook at the chute): **code**
  (`settleYard` in `yard/effects.ts`), next to the chute effect it mirrors.
- Board layout defaults (`DEFAULT_DIR`, `BOARD_HOME` in `schematic.ts`): **code** for now;
  the player's own layout is saved.

## The idea in one paragraph

A zone is a data file that says **what** is there: devices, their nouns and verbs,
which events they raise, which cables exist, what everything says, the dialogue,
goals. The code says **how** the few fiddly rules work (the claw, a timer,
the hatch opening for one second) as **named effects**, and the data points at them
by name. Writing a new device, rewording a reply or adding a dialogue branch is a
data change. A new kind of behaviour is a code change: one new effect.

## What the data describes

One file per zone: `game/data/yard.json`. Top level:

| Field | What it holds |
|---|---|
| `state` | Every state key and its starting value (`armAt: "home"`, `gateAllowed: false`). |
| `tuning` | Numbers effects read: `gateOpenMs`, `slideMs`, … |
| `devices` | The zone's devices. Each: `id`, `name`, `look`, `status`, `nouns`. |
| `cables` | Cables present from the start (`from: "crane.claw:dropped"`, `to`, `verb`). Empty in the yard. |
| `camera` | The crates CAM-1 sees: position, size, label. |
| `dialogue` | Conversation trees, one per daemon (`hinge`). |
| `goals` | In order: `id` and the objective `text`. |
| `texts` | Every other line and label the code asks for, by key. |

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

- **Steps** (`do`): `set` a state key `to` a value, `open` a panel (`camera`, `talk`),
  `emit` one of this noun's events, tick a `goal`, run an `effect`. Any step may have an `if`.
- **Conditions**: `key`, `!key`, `key=value`, and `signal` (the verb came over a cable).
- **Templates**: `{verb}`, `{via}` (`"signal → "` when a cable sent it), any state key.
- **Lines**: `["command", "reply", "ok" | "err" | "dim"]`, written out or as a key into `texts`.
- **Status**: a string, or parts like `{ "if": "held", "then": " · holding {held}" }`.

**Dialogue** nodes have `text`, `choices` (`[what you say, next node]`), optional `do`
steps (HINGE's "Deal." sets `gateAllowed` and ticks the `talk` goal), and may be a list
of variants picked by `if`. `free` says what typing your own line does (a regex → node).

## What stays code

- **Named effects** (`yard/effects.ts`): `crane.claw` (what can be grabbed, dropping into
  the chute), `hatch.open` (open for `gateOpenMs`), `timer.wait` (wait, then raise `done`),
  plus the parcel's slide that the claw starts. They read their wording from `texts`.
- **Panels and drawing**: how CAM-1 zooms, how the board drags cables, the canvas scene.
  They read their words and crate positions from data, but the look is code.
- **The contract**: `YARD_CODE` in `effects.ts` lists what the code provides and expects
  (effects, panels, state keys, computed values like `gateOpen`, goals it ticks, text keys).
  The build checks the data against it.

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
- **Layout**: device positions in the scene and default noun directions on the board
  still live in `scene.ts` / `schematic.ts`; they belong in the zone file (`layout`).
  Left for now because other work is in those files.
- **Crafting**: removed with the workbench. The format keeps an optional
  `bench: { parts, recipes }` whose recipes make logic parts, so it can return.
- **A visual editor** (not now, see Decided): JSON plus the checker is the foundation.
  A first editor could be the game's own board in an "author mode" that saves the zone file back.

## Saves

One localStorage object (`access-denied-save-v1`). Besides Downtown's fields:

```ts
modules: string[]            // owned logic modules: ["timer.so"]; legs.so stays `jump`
zones: { yard?: ZoneSave }   // each zone's progress, by zone id

interface ZoneSave {
  state: { found, armAt, held, parcel, parcelAt, gateAllowed, pan }   // the zone's state keys, settled
  goals: string[]                                   // goal ids reached
  links: { from, to, verb }[]                       // every cable
  logic: { id, kind, state? }[]                     // placed parts: timer1, switch1 (+ its on/off)
  board?: { known: string[]; pos; offsets; vision } // board positions, noun offsets, devices known
}
```

Older saves get `modules` from the new-game default and an empty `zones`. The yard writes
its part a moment after things go quiet, when you leave it and when the game stops. Things
in flight are not stored: a parcel in the chute or sliding comes back on the hook at the
chute, a timer counting is simply gone. On load, anything that no longer fits the data
(a removed noun, a renamed part) is dropped. `reset yard --yes` in the terminal starts the
yard over and keeps the rest.

## Where things are

- `game/data/types.ts`: the format, as TypeScript types.
- `game/data/yard.json`: the back yard. `game/data/logic.json`: the shared logic modules.
- `game/data/check.ts`: the build-time check. `game/data/index.ts`: bundles the JSON.
- `game/yard/effects.ts`: named effects and the `YARD_CODE` contract.
- `game/yard/model.ts`: turns the data into live devices (public API unchanged).

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
