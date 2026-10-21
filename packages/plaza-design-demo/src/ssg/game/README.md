# ACCESS DENIED

A browser hacking adventure inside the cypherpunk.agency homepage. Devices have nouns, verbs
and events; the player rewires them to solve puzzles and explore the city.

The whole game is in active design. Implemented behavior, story, mechanics, visuals and
architecture can all change. "Built" means present in the current code, not final or approved
forever. Historical "decided" notes record context, not constraints on further design.

## Engine work: start here

Read [AGENTS.md](./AGENTS.md) and the [engine handbook](./docs/reference/ENGINE-HANDBOOK.md).
Use [ROADMAP.md](./ROADMAP.md) for priorities and current tests for verification.

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

Implemented with `scenes/harbor-shift/` (JSON plus the `dockworkerCarry` mechanism), ordinary `SceneUse` interactions and carried items;
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
Demo slots and resume are separate too. The editor's **Demo world** lab uses these compact areas
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
It adds no campaign location. [Authoring recipes](./docs/reference/ENGINE-HANDBOOK.md).

Opt-in performance recording: [local workflow](./docs/reference/PERFORMANCE-RECORDING.md).
See [shared gameplay](./docs/reference/GAMEPLAY-SYSTEM.md#test-district) for system scope.

## Code map

| File or directory | Current responsibility |
| --- | --- |
| `index.ts` | Homepage entry, URL shortcuts, touch controls |
| `runtime/` | Main controller, audio, save/slots, actor simulation and shared native frame orchestration |
| `engine/` | Scene model/host, hacking UI, cables, guards, clocks, watchdogs and pausable scene time |
| `data/` | Shared engine/logic/network data, types, scene-data registry and build-time validation |
| `scenes/index.ts`, `scenes/folder-scenes.ts`, `scenes/kit.ts` | Scene registry, the folder-scene list and the shared scene interface |
| `scenes/<id>/` | One folder per scene, JSON only: `composition.json`, `scene.json`, `gameplay.json`, `devices.json`. Code a scene needs lives in `engine/gameplay/binding-providers/` and `engine/gameplay/mechanisms/` |
| `art/` | Code-rendered pieces and assemblies, character appearance, environmental effects, sequences and composition/timeline contracts |
| `authoring/` | Local scene/animation editor, native preview adapters and validated source-save service |
| `world/` | Geography, city time/weather/light and shared transport simulation |
| `story/` | Contacts, opening progression, title/glide and cutscene controllers |
| `ui/` | The deck (menu.ts), hint lane, terminal, maps, developer controls, key bar and task guidance |
| `docs/` | Design concepts and current technical references |

See [module organization](./docs/reference/MODULES.md) for logic ownership and dependency rules.
All 20 registered scenes have composition adapters and typed source authoring. Opening, intro,
Act II and taxi pictures also use composition documents. Game and editor share rendering.

The enclosing `../render.tsx` supplies the static page and shared game styles.
`../../../scripts/generate-demos.tsx` validates data and bundles the homepage. Ordinary scenes
use the authored catalogue without per-scene TypeScript registration; new native implementations
need their appropriate registered contracts.

## Documentation guide

- [Engine handbook](./docs/reference/ENGINE-HANDBOOK.md): architecture, extension recipes and checks.
- [Roadmap](./ROADMAP.md): one current priority list and story M1-M9.
- [Composer guide](./authoring/README.md): scene, animation and gameplay authoring.
- [Progression concept](./docs/design/PROGRESSION-CONCEPT.md) and
  [prologue/Act I](./docs/design/PROLOGUE-ACT-I-PLAN.md): story and teaching design.
- [Art guide](./docs/reference/ART-GUIDE.md), [module map](./docs/reference/MODULES.md),
  [game data](./docs/reference/GAME-DATA.md): implementation references.
- [Review guide](./docs/reference/REVIEW-GUIDE.md): compact UX feedback routes.

Completed migration plans, source captures and acceptance ledgers are retired. Current tests and
source define supported behavior; historical Git revisions remain available through Git.

## Pause and saves: current behavior

The deck (Esc; it replaced the pause menu), city/net maps, title, cutscenes and leaving the game hold puzzle scene time
and delayed actions. Wiring in hack vision/the board stays live. Wall-clock lockouts keep
expiring while paused or away. The city clock has its own additional pauses (dialogue panels,
lock toys and travel/wait transitions); see TIME.md.

The autosave uses `access-denied-save-v3` in localStorage and now remembers its scene for
Continue. Missing or invalid scene ids use the current opening/Downtown fallback. Resume starts at the scene's spawn, not an exact
saved player position or train timestamp. Manual slots also retain their scene. Sudo uses
separate storage keys. This change does not reset saves or introduce a new save version.

## Validation scope

The [public editor](https://cypherpunk.agency/editor/) uses the same renderer and workbenches.
Browser changes can be downloaded as an edit bundle and imported into either editor. Repository
writes remain in the local composer; the public page does not publish edits or change player saves.

The local [scene and animation composer](./authoring/README.md) starts with
`pnpm --filter plaza-design-demo compose-scenes` from the repository root. Open
`http://127.0.0.1:4192`; its separate loopback save service uses port 4193. Stop both with Ctrl+C.
Its preview and private Play use the actual game renderer and pending validated source. Typed
controls cover all 20 scenes, existing gameplay/device/controller definitions, world/story settings
and ordinary scene creation. History, bundles and protected source Save validate companion documents
together. The public editor downloads bundles; it cannot write repository files. New art or physical
algorithms remain registered code. Restart the composer after renderer/schema changes.

From packages/plaza-design-demo, use `pnpm test:game --list` to discover current checks,
`pnpm test:game conversation` for a focused selection, or `pnpm test:game` for all.
Disposable outputs go to `.game-test-output/` at repository root. No old engine, migration evidence,
or prior output is required. See the handbook for visual checks and expected-image update policy.

`pnpm build:homepage` checks game data and produces the playable page.
`pnpm build:design-demo` runs TypeScript checking and builds the React showcase.
Neither build proves that a story route is playable from beginning to end. Playthrough scope
and regression-suite/CI work are pending discussion with the user; do not start them as an
implicit part of routine work. Focused checks of a requested behavior change remain appropriate.
