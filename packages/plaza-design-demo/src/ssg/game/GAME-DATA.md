# ACCESS DENIED: game data

A proposal for discussion. The back yard already runs on it; Downtown does not yet.

## The idea in one paragraph

A zone is a data file that says **what** is there: devices, their nouns and verbs,
which events they raise, which cables exist, what everything says, the dialogue,
goals and hints. The code says **how** the few fiddly rules work (the claw, a timer,
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
| `catalogue` | Device templates placed at runtime: the board's logic parts (TIMER, SWITCH). A placed copy is `timer1`, `timer2`, … and gets its own `state`. |
| `cables` | Cables present from the start (`from: "crane.claw:dropped"`, `to`, `verb`). Empty in the yard. |
| `camera` | The crates CAM-1 sees: position, size, label. |
| `dialogue` | Conversation trees, one per daemon (`hinge`). |
| `goals` | In order: `id`, the objective `text`, `hints` (gentlest first). |
| `texts` | Every other line and label the code asks for, by key. |

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
  dialogue, objectives with stepped hints are `goals`. Its save (`flags`, `freed`) is `state`.
- **Localisation**: all wording is already in data. Next step is moving `texts`,
  dialogue and `look`s into `texts.en.json` keyed by id, with the zone file holding keys only.
- **Layout**: device positions in the scene and default noun directions on the board
  still live in `scene.ts` / `schematic.ts`; they belong in the zone file (`layout`).
  Left for now because other work is in those files.
- **Crafting**: removed with the workbench. The format keeps an optional
  `bench: { parts, recipes }` whose recipes make `catalogue` devices, so it can return.
- **A visual editor**: JSON plus the checker is the foundation. A first editor could be
  the game's own board in an "author mode" that saves the zone file back.

## Where things are

- `game/data/types.ts`: the format, as TypeScript types.
- `game/data/yard.json`: the back yard.
- `game/data/check.ts`: the build-time check. `game/data/index.ts`: bundles the JSON.
- `game/yard/effects.ts`: named effects and the `YARD_CODE` contract.
- `game/yard/model.ts`: turns the data into live devices (public API unchanged).

## Open questions for Tommi

1. **JSON by hand, or YAML that compiles to JSON?** How much will you write directly?
2. **How much logic in data?** Today: conditions, `set`, `emit`, `goal`, named effects.
   Should a `wait` step replace the timer effect, or should data stay dumb and code grow?
3. **Who reads the data?** Just us and Claude, or a future editor or other writers?
   That decides how soon the visual editor and localisation matter.
4. **Saves**: should zone state persist like Downtown's save, and is a placed TIMER
   (and its cables) part of the save?
5. **Hints in the yard**: the goals now carry hints (the last points at the board's
   logic parts). Should the yard surface them like Downtown (ask the fixer), or on a timer?
6. **Shared catalogue**: will TIMER and SWITCH exist in every zone? Then the catalogue
   moves to a shared file.
