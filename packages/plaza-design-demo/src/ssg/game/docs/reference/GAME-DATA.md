# ACCESS DENIED: game data

Every place in the game is a **scene**, and every scene runs on the engine (`game/engine/`):
Puzzle scenes (including the train car, library, laundromat and stacks) have data files;
market, shop, mall, harbor and the metro platforms currently have no devices. Which place and
district a scene belongs to is the city's data (`world/city.ts`, CITY.md).

This is the technical reference for the current iteration, not a fixed specification.
Everything remains open to redesign. Historical decisions below explain how the code got
here; README.md maps the other documents and ROADMAP.md tracks implemented/proposed work.

## Current approach (revisable)

- **JSON source, editable by hand or the local composer.** No YAML step.
- **Data vs code: learned case by case.** No big rule up front; each time something
  moves across the line (or stays put on purpose), it goes in the **Boundary log** below.
- **A local scene and animation composer exists.** Run
  `pnpm --filter plaza-design-demo compose-scenes` from the repository root and open
  `http://127.0.0.1:4192` (save service 4193). It edits allowlisted composition/timeline JSON,
  with typed validation and the native shipping preview path. Device nouns, verbs and rule code
  remain outside that editor. See [composer instructions](../../authoring/README.md).
- **Logic modules are shared unlockables.** TIMER and SWITCH live in `data/logic.json`,
  not in a scene. Each is a module the player owns, like `legs.so`: `timer.so`, `switch.so`.
  Owned modules are in the save (`Save.modules`; `legs.so` stays `Save.jump`). The board
  shows owned ones as `+ TIMER`, the rest as a dashed `???` slot ("not found yet").
  A new game owns `timer.so`. A scene hands a module out with a `give` step (see **Giving
  things**); `foundIn` names that scene, and the check holds the two together. `switch.so` is
  found in MOTH-PC's drawer in Moth's place (`foundIn: "moth"`, P09).
- **Yard progress is saved**, in the same save as Downtown: `save.scenes.yard` (see **Saves**).
- **No hints in the yard for now.** Goals stay (the GOAL line in the HUD); Downtown's fixer
  hints are untouched.
- **Fan-out:** one event can feed several cables (a breaker trip stops every washer). `connect`
  replaces only a cable between the same event and noun; `emit` fires all of them.
- **Combining clues:** both ways: drag one fragment chip onto another on the keyring, or type
  the result at a login's keyboard (see **Keyring**).

## Boundary log

Append one line per decision: what, which side, why. Entries record the implementation at the
time, including superseded filenames and designs. Use **Where things are** below for current
paths; old `data/<scene>.json` files are now `scenes/<id>/devices.json`.

- Scene/sequence appearance and placement: **composition JSON** (`scenes/<id>/composition.json`,
  `story/title/composition.json`, `story/cutscenes/*.composition.json`). Registered art kernels,
  typed field validation, bounds and anchors: **code** in `art/`. Scene factories/adapters derive
  gameplay geometry and immutable visual snapshots from the same document as the renderer.
  Timeline shots, tracks, cards, fades and handoffs: **JSON** in `story/title/timeline.json` and
  `story/cutscenes/timeline.json`; trusted nonlinear motion evaluators remain **code**. The local
  save service validates the complete prospective allowlisted source set; it never writes rules,
  device data, player storage or world geography. This is implemented coverage, not a declaration
  that all scene-system acceptance gates have passed.

- Logic parts (TIMER, SWITCH): **data**, in a shared file (`logic.json`), because every scene
  uses them and they are items the player owns.
- Settling a save (a parcel mid-slide comes back on the hook at the chute): **code**
  (`settleYard` in `yard/effects.ts`), next to the chute effect it mirrors.
- Board layout defaults (`DEFAULT_DIR`, `BOARD_HOME` in `schematic.ts`): **code** for now;
  the player's own layout is saved. *Superseded:* now **data** (`layout` on each device), see below.
- The engine (`game/engine/`): **code**, one for every scene. A scene was its data file plus
  rules (effects, derived values, settle, what it needs) and a view (drawing, own panels, extra
  E targets); since the merge (below) all of that is one `SceneDef` (scenes/kit.ts), and the
  game hosts every scene with `new SceneHost(…, def, rules)`.
- Where devices stand in the world (`layout.spot`), their board home (`layout.board`) and noun
  directions (`layout.dir`, `layout.vision`): **data**.
- Hack vision's noun order (`layout.row`): **data**, optional; the default order by kind is
  **code** (`RANK` in `schematic.ts`). Where a logic part floats in the world: the **save**
  (`logic[].at`), placed beside the player by the host. Where the player dragged a device's
  core or a noun in hack vision: the **save** (`board.vision`: `device` → the core's offset from
  its spot over the device, `device.noun` → the noun's offset from its core; world units).
- What a click or E does to a thing: a popup beside it. Its everyday actions (`everyday`) and
  whether it is a computer you jack into (`deck`): **data**. The popup and `⌁ hack it`: **code**
  (`engine/popup.ts`, `SceneHost.pick`); its words (`menu.*`): **data** in `engine.json`. Exits and things that come and go (the
  pickup tray): **code** (`SceneDef.targets`), since they follow scene art and state.
- State keys: the data owns them; the code lists only the keys it relies on (`needs.state`),
  and the check requires those. Data may add its own keys freely (before: exactly the code's).
- `timer.wait`: **code**, moved from the yard to the engine (`ENGINE_EFFECTS`): TIMER is a
  shared module, so every scene needs it. Its line moved to `engine.json`.
- Generic wording (wiring, talk, guards, seals, trace, net, keyring): **data**, in
  `data/engine.json`; any scene may override a key with the same kind (line or label).
- Guards, sealed sectors, trace, the net, the keyring and combining: **engine code** with
  **data** switches (`guard`, `sectors`, `log`, `link`, `keyring`, `give`/`trace`/`unseal`
  steps). How a seal opens, how trace moves and how fragments combine are a fixed set of
  engine rules; which device has what, the numbers and every word are data.
- Fragment transforms (`reverse`, `upper`, `lower`, and joining): **code** (a small fixed
  set); which rules exist and what recipes make (`from`): **data**.
- Settling (`settleYard`) and the yard's own check (crates, the parcel's crate): **code**, in
  `YARD_RULES` (`settle`, `check`), next to the effects they mirror.
- A scene's own clock (`SceneRules.tick(w, dt)`): **engine code** hook, run by `SceneModel.tick` while
  the scene is on screen. Capsule 7B uses it for the plug's schedule (`night` every `nightEveryMs`),
  the router's temperature and thermal reboots, and Pixel moving to the warmest spot. What it does is
  **code** (`capsule/rules.ts`); its numbers are **data** (`tuning`). Stands in for `clock.every`.
- A LINK that can be down (`link.when`, a condition): **data** switch on an **engine** rule: while
  it does not hold, `scan` and `connect` say `net.down` (the router is off, it scans nothing).
- Pre-wired cables when a node connects: the engine now lays only the cables touching that node
  (before: every missing pre-wired cable came back, so a cut one reappeared). **Engine code** fix.
- The plug's `off` (silent when the schedule's signal hits a plug that is already off): **code**
  (`plug.off` effect), since data cases cannot test `signal` and a state key together.
- Pixel, the companion: **code** (`companion.ts`): sprite, moves, warm spots outside (`WARM`). Whether
  Pixel follows you is a save flag (`flags.pixel`); in the flat, where Pixel naps is the scene's
  state (`pixelAt`).
- How high a device sits in the world (`layout.spot.y`: a sign on a wall, a relay on a roof):
  **data**, next to `x`, `w`, `h`. Hack vision frames it there, taps find it there, and its E
  target says how high it is (`SceneTarget.y`) so the game can tell which ledge you reach it from.
- A device that moves in the world (DLV-9 driving to the market gate): **code**, `SceneRules.place`
  (where it stands now, or null while it is out of the world). Its home stays `layout.spot`.
- Typing in the deck (the terminal, last resort) on a scene: **engine**, `SceneHost.typed(fn)` runs
  what was typed without echoing the shell line a second time; `SceneHost.viewing` is the device
  whose schematic is open. What the commands mean (`ls`, `cat`, `login`) is the scene's code.
- Downtown's progress stays in the save's own fields (`handle`, `tokens`, `jump`, `controlled`,
  `flags.till`, `flags.end`), as before the engine: **code** reads them as derived values
  (`till`, `controlled2F`, `jump`, `end`, `handle`, …) and its effects write them (`node.control`,
  `legs.install`, `till.pay`, `dlv.drive`), in `downtown/rules.ts`. The scene's own `state` is only
  what is new on the street (the gate's lock, DLV-9, the billboard's feed). `downtown/save.ts`
  `reconcile` makes the scene agree with the fields on every load, so old saves keep everything.
- Which node a Registry box frees and the shell's login users: **data**, as Downtown texts
  (`node.box: "0x2F"`, `login.user.box: "maint"`), read by the effects and the shell.
- The deck's commands on a scene (`ls`, `cat`, `login`, `install`, `use <noun> --<verb>`):
  **code**, `downtown/shell.ts` (nothing Downtown-only in it; the yard's deck uses it too).
- The fixer's stepped hints: still **code** (`level.ts` `HINTS`), as before; moving them into
  `downtown.json` would need a `hints` field (open).
- The market gate (P12): the gate's logic is **data** (pre-wired `scanner:matched → lock open`,
  `door:passed → lock shut`; the lock opens only on the scanner's word, `scanned`); DLV-9's drive
  is **code** (`dlv.drive`, `place`). DISPATCH's shield rings are, for now, a `sequence` seal
  (outer, middle, inner); when the rings toy exists, that sector's seal becomes `{ "guard":
  "shields" }` on a toy GUARD: a data change. COPY between nodes stands in as a verb on DISPATCH's
  `routes` (`send to dlv9`). The watchdog is not used yet.
- The watchdog: **engine code** (`engine/watchdog.ts`: its walk, the freeze, its sprite) with a
  **data** switch (`watchdog: { route, dwellMs, moveMs }` in a scene or `net.json`). What freezing
  means (no verbs, no signals in or out, sequence seals forget) is a fixed engine rule; where it
  walks and how fast is data. Its events are an **engine noun** (`watchdog`, kind WATCH) on each
  device of the route, so puzzles wire "while it's away" with ordinary cables.
- Clocks: **engine code** (`engine/clock.ts`), a noun kind (`CLOCK`) with **data** `clock: { every }`.
  PUZZLES.md had proposed a named effect `clock.every`; a noun kind won because the schedule must
  be a thing on the schematic you can read, stop and cut cables from, and it needs no scene code.
- Lock toys: **engine code** (`engine/toys/`, one panel and one pure rule per toy: rings, cipher,
  cryptex, morse) with **data** parameters on the guard (`toy` plus `rings` / `cipher` / `cryptex`
  / `morse`). How a toy plays is code (geometry, timing); every number, word and line is data.
- Cards (SLOW, PING for the shield rings): **data** keyring items (`kind: "card"`); what a card
  does is **code** (a fixed set, like fragment rules).
- Giving modules and tokens: **data** (`{ "give": "switch.so" }`, `{ "give": "tokens", "count": 3 }`);
  the save fields they land in are **code** (`SceneStore.grant` / `tokens`, `game.ts`).
- Fixed cables: **data** (`fixed: true` on a pre-wired cable); refusing the cut is **engine code**.
- A guard's own success line: **data** (`guard.say`), so P05/P06/P08 keep their grant lines
  without an `opened` handler. (The PUZZLES.md sketches had used `on.opened`; the engine never
  ran verbs for events, so the line moved onto the guard.)
- What the save keeps (trace, lockouts, clocks, the watchdog's place, cut cables by id):
  **engine code** (`SceneModel.snapshot` / `restore`), decided below under **Saves**.
- Moth's place (`moth.json`, story Level 3, P09 and P10): all **data** on the engine as it was; no
  engine change. FRIENDNET and MOTH-PC are the scene's own `nodes` (PUZZLES had said `mothnet.json`;
  the scene id is `moth`). The rig's LINK `when: uplink` and MOTH-PC's status read two **code**
  derived values (`moth/rules.ts`: `uplink` = the `uplink` chip is on the keyring, `journalOpen`);
  the goals a node or a sector ticks are code there too, as in the capsule.
- `uplink.so` is a keyring chip (`uplink`, label "uplink.so", from the yard's parcel), not a module:
  modules are logic parts you place on the board, and keyring ids may not end in `.so`. The parcel
  hands out it and `moth.key` in **code** (`yard/index.ts` `PARCEL`, the tray's `use`); a save that
  took the parcel earlier gets both when the game loads (`game.ts`).
- Hooks outside engine/ for a new zone (Moth's place, before the merge): `game.ts` hosted it like
  the capsule (its own branches for width, name, arrival, the door's key check, first-visit lines
  and drawing); `city.ts` `DOORS.moth` (1496, the residents' door of the shuttered front at 1420,
  next to the metro stairs); `companion.ts` `WARM.moth` (the tank lid). *Superseded* by the merge:
  Moth's place is a `SceneDef` (`moth/index.ts`), the residents' door is Downtown's exit `moth`
  with `needs` (the key chip and the refusal's words, **data** on the exit).

- **A place's life on any zone** (the beach, 2026-10-15, before the merge): a zone's view took the
  explorable scenes' shape, `people` (characters.ts), `uses` and `readables` (scenes/kit.ts
  `SceneUse`, `SceneReadable`), and the game hosted them exactly as a scene's: [E] TALK on people
  with `id` + `talk`, [E] PET / SHOO on cats and pigeons, uses that pay or give tokens (`UseCtx`),
  readables in a bubble; a tap within reach is E. **Code** (`game.ts`: `lifeTargets`, `useLife`,
  `tapLife`). It was the first step of the merge below. Who stands where and what they say is
  code-side data (the definition's lists).
- `SceneModel.pay(n)`: **engine code**, the counterpart of `give tokens`: a scene effect spends
  tokens (true and taken, or false and nothing). The beach's sunbed kiosk bills with it
  (`sunbed.rent`, then one a minute from `BEACH_RULES.tick`); the price and the minute are data
  (`tuning.minuteMs`), the billing rule is code. A one-off purchase with E (SALT's drink) is a
  `use` instead, which already pays through `UseCtx.pay`.
- Hooks outside engine/ for the beach (before the merge): `game.ts` hosted it beside the other
  zones (its own branches), its stairs travelled to the harbor, and `city.ts` had an edge table
  for its left edge. *Superseded* by the merge: the beach is a `SceneDef` (`beach/index.ts`), the
  stairs an engine exit, the left edge an edge exit (landing at the harbor's exit `beach` once it
  has one). Still outside: `companion.ts` `WARM.beach` (the jukebox's top) and a map place `BEACH`.
- **One kind of place: scenes and zones merged** (2026-10-15). "Zone" is gone; every place is a
  scene, one `SceneDef` each (scenes/kit.ts), listed in `SCENES` (scenes/index.ts). What a
  definition holds: **data-like code** for what is there (`width`, `spawn`, `exits`, `people`,
  `uses`, `readables`, `intro`, `ambient`, `pixel`, `platforms`), its data file and rules on the
  engine where it has devices (`data`, `rules`, `panels`, `targets`, `use`, `hideDevice`), and its
  drawing (`drawBackdrop`, `drawFront`). The game has **one path** for every scene (`game.ts`:
  `hostOf`, `enter`, `targets`, `useLife` / `useExit`, `draw`, `travel`), no zone-or-scene
  branches. Decisions on the way:
  - Every scene is hosted on the engine (`SceneHost`, made the first time the scene is needed); a
    scene without a data file gets an empty one (`emptyData`): zero devices, no goals. HACK and
    BOARD show only in a scene with devices; with zero devices they are hidden and H and B do
    nothing (2026-10-15: muting the market with nothing to hack read as a bug). **Code**.
  - Ways out are all `exits`: doors with E, open borders (`edge`), actions (`board`, `out`, `taxi`,
    `map`), and **engine exits** (`engine: true`): a door whose prompt and lock are the scene's
    own code (the flat's door until CONCIERGE opens it) returns the exit's id from `use`. An exit
    may set a save flag on leaving (`sets`: the flat's door sets `pixel`) and need a keyring item
    (`needs`: Moth's residents' door). Downtown's doors and its map kiosk are its exits; `at` is
    always an exit id in the destination. **Data** on the definition.
  - What the engine draws around a scene (`ambient`: `sky`, Downtown's `city` walls, the wet
    `street`, `rain`) and whether hack vision draws its devices in a second pass (`layers`, the
    yard): **data** switches; the drawing is **code**. Current frame ordering is shared in
    `runtime/render-scene.ts`; visible kernels are in `art/`.
  - First-visit lines: **data**, each scene's `intro` (a function where it depends on a touch
    screen), remembered as `flags['scene:<id>']` for every scene.
  - Downtown's street people and fixer behavior remain **code**. Their current owners are
    `scenes/downtown/dialogue.ts`, `progression.ts` and `composition.ts`; appearance belongs in
    `art/`. Downtown's sign is a readable. The original game.ts/level.ts placement is superseded.
- **Effects that hand over what you carry, and story flags** (the laundromat, P13): `SceneModel.carry(item,
  n)` (the save's `items`; 0 asks, negative takes) and `SceneModel.flag(name)` (a save
  flag), through the hooks `carry` / `flag` (`SceneStore`, game.ts). **Engine code**; which item and
  which flag is the scene's code (`washer.take`: `maglev.pass`, `p13`). Using an item up is a data
  step now (`take`, see **Using what you carry**); handing one out is not yet (`give` stays keyring,
  modules, tokens); if items get handed out from data often, `give` can learn them.
- **What you carry shows where it is used** (Tommi, 2026-10-15): no inventory screen, no HELD line.
  Which thing takes which item, its popup words and what happens: **data** for devices (`items` on a
  device, `take` step), **code-side data** for a scene's code uses (`SceneUse.items`, `price`, `act`,
  scenes/kit.ts). The popup's "items first, three at most" rule and the dashed chip: **code**
  (`SceneHost.popupItems`, `MAX_EVERYDAY`; game.ts `useLife`). Tokens show only where you pay
  (`priceTag`: uses' `price`, the taxi stand, the fixer's hint, a `{tokens}` in a popup label).
- The laundromat (P13): the washers, breaker, schedule and SUDS are **data** (`laundromat.json`); a
  cycle's timing, the trip and the jacket are **code** (`laundromat/rules.ts`, `washer.run` /
  `washer.stop` / `washer.take`, the breaker's self-reset in `tick`, `door3` derived). A running
  cycle is not saved: it comes back stopped, its load still in (`settle`).
- **The stacks (P15) and the end of Act I** (2026-10-15): STS-2, the thermal gate, the ferry, the
  reefer and the watchdog are **data** (`stacks.json`; the scope's boxes reuse the yard's `camera`
  field); the lift's timeline, the gate's moment, the watchdog's wiring check and the ending are
  **code** (`stacks/rules.ts`; the trolley is a pure function of the clock, `trolley`, read by the
  drawing). The rules are made for the player (`rules(player)`, like Downtown's): two new optional
  `Player` hooks, **engine-side code** in game.ts: `cutscene(id)` (a story beat asks for a cutscene;
  the game plays it once nothing is open: `pendingCut`) and `sceneState(scene, key)` (another
  scene's state: Moth asks whether Sprat was fed). **Contacts on the deck** (`contacts.ts`): who and
  which messages, released by save flags, are **code-side data** for now (move to
  `data/contacts.json` when they grow); the deck commands `contacts` / `msg <id>` are **code**
  (level.ts), reading flags `read:<message>`.
- **The city as data** (2026-10-15, CITY.md): city → district → place → scene. `city.ts`
  `DISTRICTS` (seven, each with its stratum), `PLACES` (every existing place: id, name, district,
  entrance scene and the exit quick travel lands at) and `SCENE_PLACE` (each scene's place; a place
  can have several scenes). **Typed code, not JSON**, so the type-check holds every scene id to a
  place; the build checks the rest (`cityProblems`). The map and quick travel read places
  (`MAP_PLACES`: those with a spot on today's map). LINE 0's car is a place with no district.

- **The sandbox** (2026-10-15, sudo only; see **Sandbox**): every bench is **data**
  (`sandbox.json`); the few effects with a counter, an item, a token or a flash are **code**
  (`sandbox/rules.ts`), and so is what acts by the clock and the weather on its own (the night light
  going off at daybreak, the vent shutting in rain: its `tick`). Sudo-only is **code** in three
  small places: `index.ts` refuses `?play=sandbox` without `?sudo`, sudo's LEVELS lists it first,
  the deck's `reset sandbox --yes` exists only in sudo. Its place (`city.ts` `sandbox`) has no
  district and no map pin, so it is never on the map or in quick travel.

## The idea in one paragraph

A scene is a data file that says **what** is there: devices, their nouns and verbs,
which events they raise, which cables exist, what everything says, the dialogue,
goals. The code says **how** the few fiddly rules work (the claw, a timer,
the hatch opening for one second) as **named effects**, and the data points at them
by name. Writing a new device, rewording a reply or adding a dialogue branch is a
data change. A new kind of behaviour is a code change: one new effect.

## The engine

`game/engine/` runs any scene file. Pieces:

- `model.ts` (`SceneModel`): the rules, no DOM. State, devices, nouns, verbs, cables, logic
  parts, and the hacking layer (guards, sectors, trace, net, keyring). Node can run it; `now`
  is swappable for tests.
- `rules.ts`: `SceneRules`, what a scene's code gives the engine (`effects`, `panels`,
  `derived`, `settle`, `needs`, `check`, `place`), the engine's own effects (`timer.wait`), and
  `contractOf`, which turns rules into the contract the build checks.
- `schematic.ts`, `panels.ts`: the overlay (device, board, hack vision) and the full-screen
  panels (the engine's `talk`; a scene's own, like the yard's `camera`, via `PanelFn`).
- `watchdog.ts` (its walk, pure), `watchdog-view.ts` (its sprite and badge on the schematic),
  `clock.ts` (CLOCK nouns, pure), `toys/` (the lock toys: `rings.ts`, `cipher.ts`, `cryptex.ts`,
  `morse.ts`, each a pure rule plus its panel; `index.ts` is the engine panel `toy`),
  `styles.ts` (their CSS, inlined by `render.tsx`).
- `host.ts` (`SceneHost`): one scene on screen: model, overlays, HACK/BOARD buttons, trace
  ticking, save. It runs a scene's definition (`SceneDef`, scenes/kit.ts): its data file (or an
  empty one, `emptyData`), its rules (or `NO_RULES`), its panels, extra E targets and drawing.

A new scene: a `SceneDef` (its size, spawn, exits, life and drawing) in `SCENES`
(scenes/index.ts), and its place in `world/city.ts` (`SCENE_PLACE`, and a new place in `PLACES` if it
is one). With devices, also `scenes/<id>/devices.json` (add it to `SCENE_FILES` in `data/index.ts` and to
the `checkGame` list in `scripts/generate-demos.tsx`) and a `SceneRules` with its effects (often
none) on the definition. `game.ts` hosts it like every other (`hostOf`); its progress goes to
`save.scenes.<id>`. Add its composition, shared artwork elements and canonical scene factory;
the editor also needs its adapter in `authoring/scene-adapters.ts`, whose entries feed the source
allowlist. Keep gameplay-bound identities stable when editing that composition.

## What the data describes

One device file per puzzle scene: `game/scenes/yard/devices.json`,
`game/scenes/capsule/devices.json`. This format describes engine devices and rules, separately
from each scene's artwork `composition.json`. Top level:

| Field | What it holds |
|---|---|
| `state` | Every state key and its starting value (`armAt: "home"`, `gateAllowed: false`). |
| `tuning` | Numbers effects read: `gateOpenMs`, `slideMs`, … |
| `devices` | The scene's devices. Each: `id`, `name`, `look`, `status`, `nouns`, optional `state`, `sectors`, `layout`. |
| `nodes` | Computers on the net, not in the world (same shape as devices, no `layout.spot`). |
| `cables` | Cables present from the start (`from: "crane.claw:dropped"`, `to`, `verb`). Empty in the yard. |
| `keyring` | Keyring items this scene hands out: clue fragments, key chips, rules. |
| `camera` | The yard's: the crates CAM-1 sees (position, size, label). |
| `dialogue` | Conversation trees, one per daemon (`hinge`). |
| `goals` | In order: `id` and the objective `text`. |
| `texts` | Every other line and label the code asks for, by key (and overrides of `engine.json`). |
| `watchdog` | Optional: the Registry's watchdog walking this scene's devices and nodes (see **The watchdog**). |

Shared files: `logic.json` (modules), `net.json` (`nodes`, `cables`, `keyring`, `watchdog` any scene
may reach), `engine.json` (`texts`: the engine's own wording).

The logic modules are one shared file, `game/data/logic.json`: `modules`, each with an
`id` (`timer.so`), `start` (owned in a new game), `foundIn` (where it is found; `null` for
now) and `part`, a device like a scene's. A placed copy is `timer1`, `timer2`, … and gets
its own `state`. The check runs it in each scene it is used in, and reports it as `logic.json`.

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
  `effect`, `give` something (a keyring item, a module, or `tokens` with a `count`), `take` an item
  the player carries (`{ "take": "soap" }`, optional `count`; see **Using what you carry**), raise or
  lower this device's `trace` (%), `unseal` a sector (`sector` or `device/sector`). Any step may
  have an `if`.
- **Conditions**: `key`, `!key`, `key=value`, and `signal` (the verb came over a cable). The
  city adds keys every scene has (TIME.md): `weather` (the scene's district now: `weather=rain`,
  `!weather=clear`; clear, cloudy, rain, storm, fog, smog, heat), `hour` (0–23) and `day`. A
  scene's own state key of the same name wins; the check knows the weather's states.
- **Time windows** (TIME.md): a case, a step or a dialogue variant may carry
  `"when": { "from": "06:00", "to": "09:00" }` (to is not included; `"22:00"` to `"04:00"`
  crosses midnight; optional `"days": ["odd" | "even" | 3, …]`). It runs only inside the window;
  with `if`, both must hold. A case or variant with `when` (and no `if`) may stand before the
  last. Example: beach.json's lifeguard drone reads differently in a storm and at night. People in
  code (characters.ts) take `when` (present only then) and `lines` (variants by `when` and
  `weather` before `talk`): the harbor's jogger (06:00–09:00) and fisherman.
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
  "dir": { "arm": "down", "claw": "up" },            // which side each noun sits on (board)
  "row": ["job.log", "arm", "claw"]                  // hack vision: noun order, left to right (optional)
}
```

In hack vision a device's nouns sit in one row above its name plate. Without `row` (or for
nouns it leaves out) they go by kind: SENSE and STORE, then ACT, then LINK / GUARD / LOG,
then DAEMON. The old `vision` directions are still accepted but no longer read.

A scene device needs `spot`; a node must not have one. Without `board`, devices and nodes take
the next free slot under the scene's own; logic parts land by the palette.

## Everyday actions and the popup

A click or E on a device opens a small popup right next to it in the world. It lists what you
do with the thing without hacking anything, then `⌁ jack in` for a computer, then `⌁ hack it`
(hack view, this device's circuit unfolded):

```json
{ "id": "kettle", "everyday": [{ "noun": "kettle", "verb": "boil" }] }
{ "id": "blinds", "everyday": [{ "noun": "motor", "verb": "open" }, { "noun": "motor", "verb": "close" }] }
{ "id": "pc", "deck": true, "everyday": [{ "noun": "inbox", "verb": "read", "label": "check mail" }] }
```

- An everyday action runs the noun's verb exactly as a tap on its schematic would (same cases,
  same effects, `signal` false). `label` is the popup's wording (default: the verb).
- Hacking is not everyday: the check refuses GUARD, LINK, LOG, SEAL and CLOCK nouns and nouns in
  a sector. A device with no everyday action shows only `⌁ hack it`. Talking to a daemon is
  everyday (`hinge: talk`).
- `deck: true`: a computer or terminal; `⌁ jack in` opens the full device screen (the
  schematic), where its LINK reaches the net. Nodes have neither (they are not in the world).

## Using what you carry

There is no inventory screen (Tommi, 2026-10-15). What you carry (the save's `items`: the maglev
pass, soap, a cup of tea; ids in `ITEMS`, scenes/kit.ts) appears **at the moment and place it is
used**: as an everyday action in the popup of the thing that takes it, only while you hold one.
Keys and modules stay where they were (key chips at guards and seals, modules and programs in hack
vision's LOGIC drawer).

A device says what it takes with `items`:

```json
"items": [
  { "item": "soap", "noun": "drum", "label": "pour in soap", "on": [
    { "if": "w1=running", "say": "soap.running" },
    { "do": [{ "take": "soap" }], "say": "soap.in" }
  ] }
]
```

- `item`: an `ITEMS` id. `label`: the popup's words (`{tokens}` and state keys are filled in).
  `noun`: whose voice it speaks in and whose events `emit` raises; it must be everyday (no
  GUARD / LINK / LOG / SEAL / CLOCK, nothing in a sector), like `everyday`.
- `on`: a case or a list of cases, exactly like a verb's (`if`, `when`, `do`, `say`). It runs as a
  finger would (`signal` is false); a device frozen by the watchdog or locked out by trace refuses.
- **Take or keep**: a `take` step uses the item up (`count`, default 1); without one you keep it
  (a pass you show). So a refusal can keep the item (soap into a running drum).
- **Three at most**: the popup still has three everyday actions. Item actions come first (dashed
  chips: from your pocket); when there are more than three, the device's last `everyday` entries
  make room. Order `everyday` so the ones that can go are last (TRAIN-0: pull the brake, read the
  register, read the plate: with the pass, the plate drops out).
- The check: the item exists, the noun is everyday, every case and step as a verb's; a node has
  no `items`.

The scenes' code uses (`SceneUse`, scenes/kit.ts: a stall, a call box, a cat) say the same in TS:

```ts
{ id: 'crane', x: L.callBox, label: '[E] CRANE CALL BOX', act: 'press the call button', name: 'STS-1 CAB',
  use: () => ["…unless you've got tea…"],
  items: [{ item: 'tea', label: 'hold up the tea', use: (c) => { c.take('tea'); … } }] }
```

While you hold one of its `items`, E opens a popup (the item actions first, then `act`, three at
most); otherwise E runs `use` straight away as before. The item's `use` takes it with `c.take` or
keeps it.

**Tokens** show only where you pay: a use's `price` (a number, or a function of the save's flags
for prices that come and go: the florist charges once you have asked) puts `· 1 TOKEN · YOU HAVE 7`
on its prompt (and, lower case, on its popup entry); the taxi stand shows the fare the same way, the
fixer's TALK shows `HINT 1 TOKEN · YOU HAVE n` when the next thing he says is a hint
(`fixerPrice`, level.ts), and a device's popup label can say `{tokens}` (the beach's sunbed: "rent a
sunbed · 1 token a minute · you have {tokens}"). Spending still flashes `-n tokens`.

Today's items and where they are used:

| Item | From | Used at |
|---|---|---|
| `maglev.pass` | washer 3's jacket (P13) | TRAIN-0's brake popup: "show the maglev pass" (kept; the pull itself, by finger or cable, still needs it held) |
| `tea` | the harbor's tea cart, the stacks' urn | the harbor's crane call box: "hold up the tea" (taken) |
| `fish` | the harbor's fish stall | the harbor's dock cat: "give it the fish" (taken) |
| `soap` | the laundromat's dispenser | any washer: "pour in soap" (taken; refused while the drum turns) |
| `basil`, `blankchip`, `blue`, `crisps`, `noodlecup`, `gum` | the mall's florist and key cutter, the corner shop | no use yet |

## Pre-wired cables

`cables` (scene and `net.json`) are laid at the start, look like the player's and cut the same
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

The player's keyring (`Save.keyring`, item ids) travels across scenes. Items live in a scene's
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

The design is NET.md. Where you plug in decides what you reach.

**Networks** (`net.json` `networks`): a group of machines and its access rule. Any one rule in
`from` is enough: `{ "port": "scene:device.noun" }` (a LINK you are plugged in at, up: its
`when` holds, its sector open), `{ "net": "public" }` (another network you reach), or
`{ "controlled": "0x2F" }` (a node you control that you reach: it stands in the scene you are in,
or it is a machine of a network you reach; a controlled node is an access point). `machines`:
`{ id, in: [scene ids or "net"], node?: "0x2F" }`, a device or node of those files. `need`: what
kind of place you would plug in from (the net map says it when you can't reach the network).
`note`: one dry line. Pure logic: `engine/net.ts` (`reachNets`, `machinesOf`, `nextTo`).

| Network | Machines | Reached from |
| --- | --- | --- |
| `home` HOME · CAPSULE 7B | CONCIERGE, HOME-PC, ROUTER, SMART PLUG | `capsule:pc.net`, `capsule:router.uplink` |
| `library` LIBRARY LAN | CATALOG, SOFTWARE LENDING, HEATING, the reader, the timer, the printer | `library:reader.lan`, `library:printer.spool` (inside only) |
| `public` THE PUBLIC NET | box 0x2F, relay 0x31, billboard 0x3C, CAM-3, MAGLEV, WEATHER SAT, UNDERNET | `downtown:relay.uplink`; controlled 0x2F, 0x31, 0x3C |
| `fleet` DELIVERY FLEET | DISPATCH, DLV-9 | `downtown:dlv9.uplink`; the public net |
| `friendnet` FRIENDNET | FRIENDNET (Downtown's view and Moth's) | the public net; `moth:desk.net` |
| `mothnet` FLAT 4C | MOTH-PC | `moth:friendnet.home` (a hop) |

**A LINK noun** (`"link": {}`, optional `reach`, `known`, `when`) has the engine's verbs
`scan` (nodes in reach appear on the board as dashed silhouettes) and `connect <node>` (the node
comes in as a full schematic, on the board only, with its pre-wired cables). What it reaches: the
nodes of the networks its own port leads to (and theirs, by `net` and `controlled` rules), plus
its own `reach` and `known`. A node may have its own LINK: that is a hop. Nodes are in a scene's
`nodes` or in `net.json`. Seen and connected nodes are saved (per scene). A link's `when` (the
router's and the home PC's: `routerUp`): while it does not hold, it neither scans nor connects.

**Programs** (`net.json` `programs`, `save.programs`): `scan.so` (from the library, P16). Without
it a LINK does not scan, and connects only to what it `known`s (the home PC's CONCIERGE, the
library's reader and printer): `net.noscan`. A `{ "give": "scan.so" }` step hands one out; the
check holds `foundIn` to that, as for modules. uplink.so stays a keyring chip.

**From the scene** (the net map and the deck): you are plugged in at every LINK on the board that is
up; the networks you reach are those, plus your controlled nodes standing here (Downtown's street
with 0x2F yours reaches the public net). The deck's `scan` and `connect <machine>` and the net map
(N, NET in hack vision) use it (`SceneModel.ports`, `netsHere`, `nodesHere`, `scanHere`, `plugIn`).
A machine whose data lives in another scene's file is shown, but its board is there.

In sudo mode (`?sudo`) every LINK reaches every node there is (the scene's and `net.json`'s), its
`when` and scan.so still apply; the net map and the deck use the true reach. `?sudo&noscan`: no
scan.so (the state before the library).

## The watchdog

The Registry runs a watchdog process (LEVELS.md). It walks a route of devices and nodes on a
fixed rhythm; the one it sits on is **frozen**.

```json
"watchdog": { "route": ["friendnet", "mothpc"], "dwellMs": 4000, "moveMs": 8000 }
```

- In a scene file (its devices and nodes) or in `net.json` (net nodes only). Optional `id`
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
`count` goes with nothing else. **`foundIn`** in `logic.json` must name the scene (or `net`) whose
data gives the module, and a module some file gives must say so in `foundIn` (unless `start`).

## What stays code

- **Named effects** (`yard/effects.ts`): `crane.claw` (what can be grabbed, dropping into
  the chute), `hatch.open` (open for `gateOpenMs`), plus the parcel's slide that the claw
  starts. The engine's `timer.wait` (wait, then raise `done`) is in `engine/rules.ts`. They read
  their wording from `texts`.
- **Panels and drawing**: how CAM-1 zooms, how the board drags cables, the canvas scene.
  They read their words and crate positions from data, but the look is code.
- **The contract**: `YARD_RULES` in `effects.ts` lists what the code provides and expects
  (effects, panels, state keys, computed values like `gateOpen`, goals it ticks, text keys);
  `contractOf` adds the engine's. The build (`checkGame`) checks every scene, `logic.json`,
  `net.json` and the keyring against them.

Rule of thumb: if a designer would want to change it without a programmer, it is data.
If it needs a loop, geometry or timing logic beyond "wait N ms", it is an effect.
I kept the vocabulary small on purpose; when a pattern repeats in effects, it can
graduate to a step (a `wait` step is the obvious next one).

## File format

| Option | For | Against |
|---|---|---|
| **JSON**, typed and checked | Any tool reads and writes it (a future editor, a script, an LLM); bundled by esbuild as is; no build step | No comments; strict quoting |
| TS objects (`satisfies SceneData`) | Full type-checking and autocomplete; comments | Code, not data: an editor can't save it back; tempts people to write closures into it |
| YAML / TOML → JSON at build | Pleasant to write by hand; comments | A converter step and a dependency; YAML's surprises (`no` → false) |

**Recommendation: JSON**, bundled into the page by esbuild (no fetches, so the strict
CSP and offline play are unaffected). If hand-writing JSON gets tiresome, YAML can be
added later as a source that compiles to the same JSON; nothing else changes.

## Validation: where errors show

Two layers, neither a manual step:

1. **Type-check** (`tsc`, your editor): `data/index.ts` assigns the JSON to
   `Loose<SceneData>`, so a missing field or a string where a list belongs is a red squiggle.
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

- **One file per scene** (`yard.json`, `downtown.json`), plus shared files when
  something repeats across scenes (logic parts, common replies).
- **Ids are the glue**: `device.noun:event` for cables, node ids for dialogue, goal ids,
  text keys. Keep them short and stable; rename with care since saves will store them.
- **Downtown** is built (`downtown.json`): machines are devices, its terminal commands are
  nouns and verbs (and still type, `downtown/shell.ts`), objectives are `goals`. People and the
  fixer stay speech bubbles in `level.ts` for now; its save stays the save's own fields (above).
- **Localisation**: all wording is already in data. Next step is moving `texts`,
  dialogue and `look`s into `texts.en.json` keyed by id, with the scene file holding keys only.
- **Layout**: done: `layout` on each device (see **Layout**).
- **Crafting**: removed with the workbench. The format keeps an optional
  `bench: { parts, recipes }` whose recipes make logic parts, so it can return.
- **A visual editor** (not now, see Decided): JSON plus the checker is the foundation.
  A first editor could be the game's own board in an "author mode" that saves the scene file back.

## Saves

One localStorage object (`access-denied-save-v3`; sudo's is `access-denied-save-sudo-v3`, slots
`access-denied-v3-slot-<n>`). v3 came with the net (NET.md: `freed` became `controlled`), v2 with
the merge of zones into scenes: saves from those earlier versions are not read.

The autosave also stores `scene` for Continue, validated against the current scene registry.
Older v3 saves without it (or with a removed/invalid id) retain the opening/Downtown fallback.
Manual slots keep their own scene too. Resume uses the scene's spawn, not an exact saved
player position or train timestamp; no save reset or version bump is needed for this field.

Besides Downtown's fields, the current save contains:

```ts
scene?: string              // Continue's last scene; absent in older v3 saves
modules: string[]            // owned logic modules: ["timer.so"]; legs.so stays `jump`
controlled: string[]         // Registry nodes that answer to you, by label: ["0x2F"] (NET.md: access points)
programs: string[]           // programs owned: ["scan.so"]
nets: string[]               // networks found (net.json ids): the net map draws them
keyring: string[]            // keyring item ids, and made fragments as `join(a,b)`
items: { [id]: number }      // what you carry, bought or given: { fish: 2, tea: 1 } (ids: scenes/kit.ts ITEMS)
scenes: { [id]: SceneSave }    // each scene's progress, by scene id

interface SceneSave {
  state: { found, armAt, held, parcel, parcelAt, gateAllowed, pan }   // the scene's state keys, settled
  goals: string[]                                   // goal ids reached
  links: { from, to, verb }[]                       // every cable (pre-wired ones you cut are missing)
  logic: { id, kind, state?, at? }[]                // placed parts: timer1, switch1 (+ its on/off, + where it floats in hack vision)
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

A stored save missing a field gets it from a new game (`modules`, an empty `keyring`, empty `items`, empty `scenes`).

**Items** (2026-10-15): things you carry that are not keyring chips (the harbor's fish and tea, the
mall's basil leaf and blank chip, the corner shop's goods). A scene's `use` reads them through
`UseCtx`: `has(id, n)`, `take(id, n)` (true and taken, or false and nothing), `add(id, n)`. The ids
and their names are **code** (`ITEMS`, scenes/kit.ts). Nothing lists them (no inventory, no HUD
line): a short green `+ name` line shows when one comes, and they appear where they are used (see
**Using what you carry**). The terminal's `whoami` still lists tokens and modules, on purpose (a deliberate command).
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
- **Pause:** `engine/time.ts` holds scene time and pending actions/signals together while the
  menu, city/net maps, title or cutscene is up, or the game is stopped. Hack vision and the
  board stay live. Lockout deadlines still use wall time and expire while paused or away.

## Where things are

- `game/data/types.ts`: the format, as TypeScript types.
- `game/scenes/<id>/devices.json`: scene device data (including yard, capsule, Downtown, Moth,
  beach, train, laundromat, stacks, library and sandbox). `game/data/logic.json`: shared logic
  modules; `game/data/net.json`: networks/programs; `game/data/engine.json`: engine wording.
- `game/data/check.ts`: the build-time check (`checkGame`). `game/data/index.ts`: bundles the JSON.
- `game/engine/`: the engine (see **The engine**).
- `game/scenes/capsule/`: `rules.ts` (clock, router and Pixel), `scene.ts` (perches and visual
  adapter), `composition.ts`/`composition.json`, and `index.ts` (canonical scene factory).
  Pixel's simulation is `game/runtime/companion.ts`. `START_SCENE` in `world/city.ts` remains
  the older-save fallback; the current new-run controller uses `story/title/` and `story/opening.ts`.
  The separate `scenes/harbor-shift/` prototype is not yet the campaign opening.
- `game/scenes/yard/`: `effects.ts` (`YARD_RULES`), `camera.ts`, presentation/controller state,
  composition source/adapters and the scene factory. Its crane presentation prepares once per
  logical native frame before pure drawing; isolated previews capture/restore decorative history.
- `game/scenes/moth/`: rules for `uplink`, `journalOpen` and goals; device data for the flat,
  FRIENDNET, MOTH-PC and watchdog; composition source, actors and scene factory.
- `game/scenes/beach/`: rules for billing and the drone flag; actors, device data for SALT and
  beach machines; composition source/adapters and scene factory. Pictures are in `art/assemblies/`.
- `game/scenes/downtown/`: rules, save reconciliation, shell, camera, layout, dialogue,
  progression, composition source/adapters and scene factory. `scenes/train/rules.ts` owns car rules.
- `game/scenes/sandbox/`: REGISTRY QA BAY 3 (sudo only; see **Sandbox**).
- `game/scenes/kit.ts`: `SceneDef`, exits/uses/readables, presentation preparation and visual
  environment contracts. `game/scenes/index.ts`: `SCENES`, including locations without devices.
- `game/art/`: shared visible kernels, typed registry/catalog, composition/timeline contracts,
  environmental effects and animated sequences. `game/runtime/characters.ts` prepares actor
  simulation; `game/art/characters/appearance.ts` paints its prepared appearance.
- `game/runtime/render-scene.ts`: native frame composition shared by shipping Game and editor.
  `game/authoring/`: composer UI, native/sequence preview, world inspection and validated local saves.
- `game/world/city.ts`: districts, places, scene membership and map registry.
  `game/world/transport/`: route/ride state; reusable transit pictures live under `game/art/`.

## Sandbox

REGISTRY QA BAY 3: a test hall for the engine, outside the story (the yard stays a story level).
**Sudo only**: LEVELS › `SANDBOX · QA BAY 3 (ENGINE TEST)`, or `?sudo&play=sandbox` (without
`?sudo` the parameter is ignored). Not on the city map, no story flags, no goals; its progress is
its own scene save (`save.scenes.sandbox`, in sudo's save). **Reset**: E at the RESET BAY 3
console by the door (the model back to the data file: devices, cables, parts, sectors, trace,
lockouts, the net, the watchdog), or `reset sandbox --yes` in the deck (that also forgets the
board layout). The keyring, tokens and what you carry are the player's and stay.

Files (relative to the game root): `scenes/sandbox/devices.json` (devices, nodes, cables,
keyring chips `sbx.*`, watchdog and UNIT 7 dialogue); `scenes/sandbox/rules.ts` (effects,
tick, derived state and station checks); `scenes/sandbox/scene.ts` (people and visual adapter);
`scenes/sandbox/composition.ts`/`composition.json` (stations and independently placed machines);
`scenes/sandbox/index.ts` (scene factory, test cards, dispenser and reset console). Raw pictures
live in `art/assemblies/sandbox*.ts`. Networks `sandbox` and `sandbox-back` are in `data/net.json`.

Left to right, one bench per feature, each under a plate (`BAY 3·0N` and what it tests) with a
test card at its foot (E: how to test it):

| Bay | Tests | What is there |
| --- | --- | --- |
| 01 NOUN KINDS | SENSE, ACT, STORE, LINK, DAEMON, CLOCK, LOG | motion sensor (pre-wired to the lamp), test lamp, memo screen (write cycles 3 memos), wall port (LINK, `known` QA-SRV 01), UNIT 7 (talk; a dialogue step switches the lamp; free text "hello"), metronome (CLOCK tick/tock 1.5 s, `set: phase`), tape recorder (LOG 6 %/s, archive on its own reel) |
| 02 CABLES | pre-wired, fixed, fan-out, a chain through logic parts | test button → beacon, horn and press counter (one event, three cables; the counter's is `fixed`, a conduit drawn in the wall); pressure plate and test hatch for the chain plate → TIMER → SWITCH → hatch (wire it; both modules are in sudo's drawer); hatch `opened` → fan (pre-wired) |
| 03 GUARDS | password guard, the four lock toys | QA LOGIN (`bay3-qa`, 2 tries, locks 5 s, trace 10, near `bay3`; its sticky note gives both fragments; opens a `guard` sector), shield locker (rings), cipher box (shift 3), cryptex case (`test`), Morse lamp (`ok`); each tag says its answer |
| 04 SEALED SECTORS | key, sequence (signal), `if` | key cutter (gives `sbx.key`), secure cabinet (drawer A key, B sequence red-green-blue by cable within 3 s, C `if: mains`), RGB panel (pre-wired into B), mains lever |
| 05 TRACE | LOG, meter, lockout | audit desk (LOG 20 %/s to the archive spool, guard `auditor` adding 30 % a miss, root sector with a `trace: -100` wipe), archive spool (cut its cable and the log records nothing), a big meter on the wall |
| 06 THE NET | known, scan, hop, node → world cables | net jack (port of `sandbox`: knows QA-SRV 01, a scan finds QA-PRN 2), QA-SRV 01's own LINK is the port of `sandbox-back` (QA-VAULT, one hop; its readme gives `sbx.vault`); ping on QA-SRV 01 rings the net bell, a job on QA-PRN 2 prints on the label printer (cables from nodes into world devices) |
| 07 WATCHDOG | route, freeze, its events | QA-WD walks stamp press → conveyor → siren (3.5 s each, 1.5 s between); a red lamp over the frozen one, the belt stops while it is checked |
| 08 EVERYDAY USE | the full popup, an item used on a thing, a till | coffee machine (3 everyday actions + jack in + hack it), chip reader (eats one carried `blankchip`; the dispenser beside it is a `use` that hands them out), test till (one token a payment, `SceneModel.pay`) |
| 09 LIFE | talk, pet, a robot with a job | QA lead, night tech (lines by weather and by night), TEST UNIT 0 carrying a device between benches, the cat on the radiator |
| 10 TIME AND WEATHER | `when`, `weather`, waiting | a big window (the city clock's sky, the district's weather, a clock and the forecast ticker); night light (`when` 18:00–06:00, off by itself at daybreak), weather sensor (cases by `weather`), window vent (refuses rain, storm, smog, shuts itself), a bench to wait |

Notes: items use the code API of today (`SceneModel.carry`, `UseCtx.add`); when items get a data
step or everyday action of their own, the chip reader and the till are the benches to move onto it.

## Cutscenes

`game/data/cutscenes.json` maps each cutscene id to a title and a named timeline sequence:

```json
"intro": {
  "title": "ACCESS DENIED",          // shown in the window header while it plays
  "timeline": "sequence-cinematics",
  "sequence": "intro"
}
```

`story/cutscenes/timeline.json` owns duration, shots, cards, tracks, fades, beats and handoff.
The pictures use `intro.composition.json`, `act2.composition.json` and `taxi.composition.json`
beside that timeline. `story/title/` has the opening composition and its separate timeline.
Cards carry `from`/`to` times in seconds and optional placement; keep them to one or two short
lines. The local animation composer previews and saves these same source documents.

`story/cutscenes/index.ts` builds `CUTSCENES`, schedules intro presentation and calls
`art/sequences/cinematics.ts`; taxi's travel controller is `story/cutscenes/taxi.ts`.
`story/cutscenes/skyline-session.ts` separates continuous intro playback from isolated seeking.
Code plays a cutscene with `game.playCutscene(id, then?)`; absent a callback, the timeline's named
handoff selects the destination. `?play=<id>` can start a registered cutscene directly.

Boundary: composition, text/timing and named handoff are **JSON**; trusted drawing and nonlinear
motion kernels are **code** in `art/`. Controllers own scheduling and gameplay transitions; preview
seeks do not commit handoffs. Adding a new sequence also requires registry/validation and source
allowlist updates where applicable, rather than only adding an arbitrary drawing function.

## Open questions

1. **A `wait` step?** Should a `wait` step replace the timer effect? (Decided per case:
   record the answer in the Boundary log when it comes up.)
2. ~~Where is `switch.so` found?~~ **Closed (2026-10-15):** MOTH-PC's drawer in Moth's place
   (`foundIn: "moth"`).
3. **Localisation**: when, if ever, do `texts` move to `texts.en.json`?
4. ~~PUZZLES.md's format sketches~~ **Closed (2026-10-14):** the sketches now use the engine's
   format (`give`, `password`, LOG with `rate`, `sector` on each noun, `seal.key`, `link.reach`,
   CLOCK nouns, the engine's `watchdog` noun, `guard.toy`). Where a sketch was clearly better the
   engine took it: a guard's own success line (`guard.say`, from the sketches' `on.opened` lines).
5. Built since: the watchdog, `give` for modules and tokens, the lock toys, `fixed` cables, CLOCK
   nouns. Not built: the `effect`s the sketches name (`node.control`, `pixel.move`,
   `dlv.drive`, `washer.run`, `train.brake`, …): scene code, written with each scene.
6. **Toys and trace:** playing a toy does not count as being inside the device (only `probe` and
   answers touch it). Should a LOG fill while a toy panel is open?
7. Should the fixer's hints move into `downtown.json` (a `hints` field per goal)?
