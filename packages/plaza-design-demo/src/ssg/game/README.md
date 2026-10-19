# ACCESS DENIED

A browser hacking adventure inside the cypherpunk.agency homepage. Devices have nouns, verbs
and events; the player rewires them to solve puzzles and explore the city.

The whole game is in active design. Implemented behavior, story, mechanics, visuals and
architecture can all change. "Built" means present in the current code, not final or approved
forever. Historical "decided" notes record context, not constraints on further design.

## Build and preview

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:homepage
python -m http.server 4174 --bind 127.0.0.1 --directory packages/plaza-design-demo/dist-homepage
```

The server command requires Python. Any static server pointed at `dist-homepage/` works too.
Open `http://127.0.0.1:4174/?play` for the title screen. Rebuild and reload after source edits;
this preview has no hot reload. `pnpm dev` serves the separate React design showcase.

- `?play=library` (or another id in `scenes/index.ts`) opens a scene directly for inspection.
  Direct scene entry bypasses normal travel, so it is not evidence of story progression.
- `?sudo` opens developer mode with separate saves, unlocks, the LEVELS menu and time controls.
- `?play=sandbox&sudo` opens the engine's manual demonstration bay.
- The regular homepage also accepts the Konami code to enter the game.

Arrow keys walk, E interacts, H opens hack vision, B the board, Enter the terminal, TAB/M the
city map, N the net map once `scan.so` is owned, and Escape closes overlays or opens the menu.
Touch has on-screen controls and currently requires landscape orientation.

## Harbor shift prototype (milestone 2)

Open `http://127.0.0.1:4174/?play=harborShift` after the homepage build and local server above.
This is a separate playable work bay, not the campaign opening. Walk with arrows/A/D, interact
with E, and use E/Enter to advance dialogue. Item handovers use the existing contextual popup.

New tasks briefly show the pink GOAL text near the centre after dialogue closes. After two
seconds it moves and shrinks into the original small HUD line beneath the scene name, over
0.65 seconds. There is no persistent card or click hint. Contextual location pings remain;
off-screen targets use the existing edge arrow.
Automatic reminders wait for 20 seconds of inactivity, stop near the target, and never move
the camera. The independent empty-case task skips its initial ping and waits 30 seconds for
a reminder. The clamp is highlighted only after trying the blocked trolley. Menus pause the
announcement, dialogue/popups hide it, and reduced motion uses a fade instead of travel.

The supervisor assigns a parcel for Mara; return her empty case, report back, release the
loading trolley's clamp, park it, return the work tag and read the wage statement. The final
objective reads SHIFT COMPLETE. There is no commute in this slice.

The prototype has a separate autosave (`access-denied-harbor-shift-v1`), manual slots and
resume key. Reload resumes task progress at the work-bay spawn. MENU → NEW GAME resets only
this prototype's autosave; its manual slots remain. The campaign and sudo saves are unchanged.
No hacking, map, terminal or jump controls are available in the prototype, including with sudo.

Implemented with `scenes/harbor-shift/index.ts`, ordinary `SceneUse` interactions and carried items;
no engine device data or rule contract is added. `SceneUse.available` stages interactions,
`SceneDef.objective` supplies the goal. Time is pinned to completed story beats, and wages
are granted once. The player and workers use the existing character kit; distant water,
ships, containers and the crane reuse harbor sets.

Validation: both builds and focused task-state checks (including serialised reloads, premature
checkout, repeated handovers and one-time pay). Initial/completed browser states are inspected
separately; a complete player playthrough and comprehension assessment remain pending.

## Test District

After the homepage build, open `http://127.0.0.1:4174/?demo` using the static server above.
This separate saved demo world has three plain review areas: Purchases, Conversations, and Devices & wiring.
Only the people and objects needed for an example remain. Use **Review shortcuts** to jump directly;
**Buy at counter**, **Pricing & stock**, both **Talk** buttons, and **Hatch permissions** work in place.
H opens hacking; L offers timer and switch parts. MENU -> NEW GAME resets only the demo autosave.
Demo slots and resume are separate too. The editor's **Demo world** tab uses these compact areas
and previews pending definitions with disposable private progress.

Feedback to focus on:

- **Purchases:** buy once, then open Pricing & stock here. Are price, availability and purchase feedback clear?
- **Conversations:** talk to the nearby librarian or SHELF-E. Is the speaker clear? Do choices read naturally and responses feel useful?
- **Guidance/access:** open Guidance example at Purchases. Start the task, try buying before permission, authorize, then buy. Is the refusal useful and the objective change noticeable?
- **Devices:** jump here, press H, try the sensor and lamp. Is the cause of each change visible?
- **Wiring & chains:** jump here, press H and L. Try linking the plate through a timer or switch to the hatch/fan. Is connecting and following a chain understandable?
- **Editor:** open Demo world after changing a supported definition. Does previewing and iterating feel straightforward?

Technical checks for pricing arithmetic, atomic failure, source permissions, saved state and campaign isolation
are maintained by the agent; user feedback should focus on clarity, appeal and interaction quality.
The editor also has an isolated **Manifest pilot**. Edit `demo-manifest` artwork, then
`demo-manifest-scene` objectives/manifest bindings in Scene logic, and launch the pilot tab.
It adds no campaign location. [Binding inventory](./docs/reference/SCENE-BINDING-INVENTORY.md).

Opt-in performance recording: [local workflow](./docs/reference/PERFORMANCE-RECORDING.md).
See [shared gameplay](./docs/reference/GAMEPLAY-SYSTEM.md#test-district) for system scope.

## Code map

| File or directory | Current responsibility |
| --- | --- |
| `index.ts` | Homepage entry, URL shortcuts, touch controls |
| `runtime/` | Main controller, audio, save/slots, actor simulation and shared native frame orchestration |
| `engine/` | Scene model/host, hacking UI, cables, guards, clocks, watchdogs and pausable scene time |
| `data/` | Shared engine/logic/network data, types, scene-data registry and build-time validation |
| `scenes/index.ts`, `scenes/kit.ts` | Scene registry and shared scene interface |
| `scenes/<id>/` | Location definitions/rules, device data, composition JSON and adapters binding gameplay state to artwork |
| `art/` | Code-rendered pieces and assemblies, character appearance, environmental effects, sequences and composition/timeline contracts |
| `authoring/` | Local scene/animation editor, native preview adapters and validated source-save service |
| `world/` | Geography, city time/weather/light and shared transport simulation |
| `story/` | Contacts, opening progression, title/glide and cutscene controllers |
| `ui/` | The deck (menu.ts), hint lane, terminal, maps, developer controls, key bar and task guidance |
| `docs/` | Design concepts, technical references and historical scene feedback |

See [module organization](./docs/reference/MODULES.md) for logic ownership and dependency rules.
All 19 registered scenes have composition adapters; opening, intro, Act II and taxi pictures
also use composition documents. This coverage does not establish completion of the artwork/composer
plan. `SCENE-SYSTEM-STATUS.md` records verified evidence and remaining gates.

The enclosing `../render.tsx` supplies the static page and shared game styles.
`../../../scripts/generate-demos.tsx` validates data and bundles the homepage; the generator
and the scene/data registries must include new content where applicable.

## Documentation guide

These documents have different jobs; none freezes the design. Check code for what actually
runs and update the relevant document when behavior changes. Resolve disagreements against
the user's latest direction, not whichever old note sounds most authoritative.

| Document | Use it for |
| --- | --- |
| [PROGRESSION-CONCEPT.md](./docs/design/PROGRESSION-CONCEPT.md) | New story and learning direction: harbor prologue, Downtown Act I, later embodiment proposals; comparison with current material |
| [PROLOGUE-ACT-I-PLAN.md](./docs/design/PROLOGUE-ACT-I-PLAN.md) | Milestone 1: encounter matrices, teaching dependencies, access and puzzle dispositions |
| [ROADMAP.md](./ROADMAP.md) | Single project priority/status overview, preserving story M1-M9 and engineering ENG IDs |
| [GAMEPLAY-ENGINE-PLAN.md](./GAMEPLAY-ENGINE-PLAN.md) | Shared engine, authoring, demo-world and migration execution gates |
| [GAMEPLAY-ENGINE-STATUS.md](./GAMEPLAY-ENGINE-STATUS.md) | Current goal scope, gate evidence, exceptions and pending feedback |
| [SCENE-SYSTEM-PLAN.md](./SCENE-SYSTEM-PLAN.md) | Executable artwork-library migration and visual composer plan, with appearance-preservation gates |
| [GAME-EDITOR-PLAN.md](./GAME-EDITOR-PLAN.md) | Approved direction from composer to full game editor: play mode, data-driven scenes, logic, story and world authoring |
| [GAME-DATA.md](./docs/reference/GAME-DATA.md) | Technical authoring reference: data/code boundary, engine and saves |
| [ART-GUIDE.md](./docs/reference/ART-GUIDE.md) | Working visual and readability principles |
| [CITY.md](./docs/reference/CITY.md) | Current city structure and proposed places |
| [NET.md](./docs/reference/NET.md) | Network mechanics, current implementation and future ideas |
| [GAMEPLAY-SYSTEM.md](./docs/reference/GAMEPLAY-SYSTEM.md) | Implemented command/event/conversation pilot, harbor compatibility and isolated Gameplay editor lab |
| [HACKING-SYSTEM-REVIEW.md](./docs/reference/HACKING-SYSTEM-REVIEW.md) | Source review of hacking/wiring/network boundaries, confirmed probes and proposed consolidation |
| [DECK-SCREEN-PLAN.md](./docs/design/DECK-SCREEN-PLAN.md) | The Esc deck (jobs, carry, controls, system; built) replacing the pause menu and key bar, and one hint system; [mockup](./docs/design/deck-mockup.html) |
| [PERFORMANCE-HARNESS-PLAN.md](./docs/design/PERFORMANCE-HARNESS-PLAN.md) | Proposed live-game, native-render and simulation measurements, milestones and appearance-preservation gates |
| [TIME.md](./docs/reference/TIME.md) | City time/weather/light design and implemented parts |
| [PUZZLES.md](./docs/reference/PUZZLES.md) | Puzzle catalogue; distinguish implemented solutions from sketches |
| [LEVELS.md](./docs/design/LEVELS.md), [STORY.md](./docs/design/STORY.md) | Story/level design, including historical proposals |
| [SCENES.md](./docs/history/SCENES.md) | Historical scene feedback and ideas for future locations |

## Pause and saves: current behavior

The deck (Esc; it replaced the pause menu), city/net maps, title, cutscenes and leaving the game hold puzzle scene time
and delayed actions. Wiring in hack vision/the board stays live. Wall-clock lockouts keep
expiring while paused or away. The city clock has its own additional pauses (dialogue panels,
lock toys and travel/wait transitions); see TIME.md.

The autosave uses `access-denied-save-v3` in localStorage and now remembers its scene for
Continue. Older v3 saves without a scene keep the existing opening/Downtown fallback; removed
or invalid scene ids use that fallback too. Resume starts at the scene's spawn, not an exact
saved player position or train timestamp. Manual slots also retain their scene. Sudo uses
separate storage keys. This change does not reset saves or introduce a new save version.

## Validation scope

The [public editor](https://cypherpunk.agency/editor/) uses the same renderer and workbenches.
Browser changes can be downloaded as an edit bundle and imported into either editor. Repository
writes remain in the local composer; the public page does not publish edits or change player saves.

The local [scene and animation composer](./authoring/README.md) starts with
`pnpm --filter plaza-design-demo compose-scenes` from the repository root. Open
`http://127.0.0.1:4192`; its separate loopback save service uses port 4193. Stop both with Ctrl+C.
Its preview uses the native game renderer and isolated models. Validated **Save to source** writes
allowlisted composition/timeline JSON, the narrowly validated Sandbox behavior document and
Harbor Shift gameplay/scene documents (dialogue, objectives, guidance and ordinary interactions),
and reusable Play fixtures;
rebuild the game to use saved edits in the homepage. Asset, character, vehicle, signage and
event-inspection asset panels are read-only. Play runs Harbor Shift or Sandbox from pending
source with typed starting fixtures and live native device/signal/condition inspection. See the [stretch evidence ledger](./docs/reference/SCENE-SYSTEM-STRETCH-EVIDENCE.md)
for their frozen support inventories and acceptance limits.
The world/map panel inspects registry-derived places and links; geography and access rules remain
code-owned. Restart the composer after renderer/schema changes. See its README and the execution
ledger for controls, source-save constraints and outstanding acceptance gates.

`pnpm build:homepage` checks game data and produces the playable page.
`pnpm build:design-demo` runs TypeScript checking and builds the React showcase.
Neither build proves that a story route is playable from beginning to end. Playthrough scope
and regression-suite/CI work are pending discussion with the user; do not start them as an
implicit part of routine work. Focused checks of a requested behavior change remain appropriate.
