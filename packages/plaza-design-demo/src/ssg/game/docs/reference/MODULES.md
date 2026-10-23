# Game module organization

The directories express ownership. For current extension recipes read
[ENGINE-HANDBOOK.md](./ENGINE-HANDBOOK.md) and [AGENTS.md](../../AGENTS.md).
All 19 current folder scenes and catalogue scenes use the shared engine and editor contracts.

| Location | Owns |
| --- | --- |
| `index.ts` at the game root | Homepage integration and launch controls |
| `runtime/` | Game lifecycle, input/movement orchestration, saves, slots, audio and actor simulation |
| `engine/` | Shared commands, conditions, conversations, purchases and state; device execution, signals, scene time and hacking interfaces |
| `scenes/<id>/` | Authored scene/gameplay/device/composition JSON definitions; registered physical/presentation primitives live in engine/art |
| `world/` | Geography, climate, clock, lighting and transport shared between locations |
| `story/` | Cross-scene progression, contacts and presentation controllers |
| `art/` | Procedural artwork and visual construction/composition contracts |
| `authoring/` | Local editor, isolated native previews, source document allowlist and loopback save service |
| `ui/` | Player/developer interfaces: menus, maps, terminal, goal guidance and controls |
| `data/` | Shared schemas, validation, loading and global engine/network/logic definitions |
| `docs/design/` | Current design proposals and progression concepts |
| `docs/reference/` | Technical authoring references and visual principles |

The root keeps the entry point, README, agent guidance and active roadmap. New ordinary locations
use catalogue documents; new registered primitives belong in engine/art, not in per-scene runtimes.

## Packaging logic

A reusable mechanism belongs in `engine/`: evaluating a condition, sending a signal, delaying
an action or running a device verb. A particular machine's story conditions/rewards/dialogue belong in its scene's authored
gameplay document. Native rules retain physical calculation and observation, not an alternate
story evaluator. Stacks lift/return outcomes, for example, are shared source commands.
Cross-location timetables belong in `world/transport/`; campaign progression belongs in
`story/`. Do not put unrelated logic in a generic helpers directory.

`engine/gameplay/` owns the common command, condition, event, conversation, commerce and state
contracts across the current scene catalogue. The runtime supplies player/world ports; native device integration
uses explicit authorized bindings to the same owner blocks. Ordinary content is not a pilot-only
capability. engine/shell.ts is the shared terminal adapter onto SceneModel.

`authoring/play-workbench.ts` owns disposable sandboxed Game frames. Pending scene/gameplay/
device/world documents feed the actual native Game and authored Play fixtures. All19 existing
scenes and catalogue-created ordinary scenes use that route. Typed source editing uses one
ComposerModel history, validated portable bundles and protected grouped source Save. Native
inspection returns bounded copies; it does not mutate source or supply a second evaluator.
`runtime/storage.ts` selects private memory for opaque-origin Play and native storage for the
shipping mode. `ui/touch-controls.ts` is shared by the homepage and Play entry.

`scenes/kit.ts` defines the shared scene contract. Rule factories receive the neutral
`runtime/player.ts` services contract; they do not import Downtown's implementation or the
Game class. The runtime connects those services to the current save and presentation.
Scene-owned `devices.json` files remain loaded and checked through `data/index.ts` and
`data/check.ts`; the central registry prevents silently omitting a scene's validation.

The old `level.ts` mixed several owners. Its responsibilities are now:

| Responsibility | Module |
| --- | --- |
| Launch modes and storage key selection | `runtime/mode.ts` |
| Player save schema, initialization, loading and persistence | `runtime/save.ts` |
| Downtown world coordinates and readable/NPC placement | `scenes/downtown/composition.json` (artwork) and `scene.json` (manifest bindings) |
| Downtown NPC/fixer dialogue | `scenes/downtown/scene.json` and `gameplay.json`, compiled into shared conversations |
| Downtown objectives/progress markers | Authored objectives and gameplay onPersist triggers, shared evaluators |
| Deck command execution and completion | `ui/terminal/commands.ts` |

Filesystem moves do not rename scene IDs, storage keys, device/noun/verb/event IDs,
destination IDs or the virtual files presented by the deck. Those are gameplay contracts.

## Rendering and authoring boundary

`art/` owns the visible pieces, including code-rendered sprites and animated artwork.
Scene definitions own placements and gameplay bindings; controllers supply time, state and
environment. Specialized artwork may keep its own construction algorithms while exposing
the common placement, property and anchor contracts. Animation and environmental response
must use explicit inputs so the game and composer can draw the same frame.

All 20 registered scenes are folder scenes: `scenes/<id>/` holds `composition.json`, `scene.json`,
`gameplay.json` and `devices.json`, listed in `scenes/folder-scenes.ts` and built by
`engine/gameplay/folder-scene.ts` on the declared-scene path. The composition's placement resolves into
gameplay geometry and the picture; what the code decides about the picture comes from binding sources
(`engine/gameplay/binding-sources.ts`, `binding-providers/`), and the SceneDef fields and rules a scene
takes from code come from registered mechanisms (`engine/gameplay/mechanisms/`), named in
`scene.json` `stage.mechanisms`. See ENGINE-HANDBOOK.md, "Recipe: a scene made of JSON only".

`art/index.ts` registers typed elements, with bounds, semantic anchors and explicit visual fields.
`art/catalog.ts` supplies authoring catalog descriptions. Kernels live under `art/architecture/`,
`assemblies/`, `atmosphere/`, `characters/`, `electronics/`, `environment/`, `furniture/`,
`machinery/`, `props/`, `signage/` and `vehicles/`. `art/core/` owns composition, timeline and
view contracts; `art/sequences/` owns animated pictures. Specialized kits retain their own
construction algorithms behind those common contracts. Most artwork is Canvas 2D code,
including procedural/cached character graphics, rather than image files or a shader pipeline.

`runtime/render-scene.ts` supplies shared native frame ordering for Game and the composer:
lighting, prepared presentation, world/device passes, weather, actors, shadows, grade and UI hooks.
`View.lighting` and `View.illumination` carry the selected frame's light and lighting accumulator.
The scene adapter prepares state before paint; `SceneDef.preparePresentation`,
`presentationState` and `visualEnvironment` support explicit decorative history and its read-only
bindings. Painting and bounds evaluation must not advance simulation or presentation history.

`world/transport/line.ts` reads departures and journey state from the actual train model's movers.
The car is `train.car`, doors are `train.doors`; platforms have no independent timetable or phase offset.
Shared vehicle geometry owns boarding, alighting and passenger continuity. Departure-board artwork lives
in `art/signage/line-departures.ts`; `art/vehicles/platform-train.ts` remains a stateless library drawing.
`story/title/` and `story/cutscenes/` own animation scheduling, actor preparation, timeline documents
and gameplay handoffs; their pictures use `art/sequences/`. Preview seeking uses independent sessions.

The editor uses these same scene factories, native frame path and sequence dispatchers through
`authoring/scene-adapters.ts`, `native-preview.ts` and `sequence-preview.ts`. The source allowlist is
`authoring/source-documents.ts`: composition, scene, gameplay, devices, world/network/transport,
fixtures and timeline documents. Validated saves update those authored sources, including supported
world edits; they do not rewrite TypeScript or player saves. World uses the same source model.
