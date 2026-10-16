# Game module organization

The directories express ownership. This is an evolving structure; the scene-system plan at
the game root tracks the artwork and composer work still outstanding.

| Location | Owns |
| --- | --- |
| `index.ts` at the game root | Homepage integration and launch controls |
| `runtime/` | Game lifecycle, input/movement orchestration, saves, slots, audio and actor simulation |
| `engine/` | Reusable device execution, signals, rules, scene time and hacking interfaces |
| `scenes/<id>/` | One location's definition, local effects/rules, data, layout and interactions |
| `world/` | Geography, climate, clock, lighting and transport shared between locations |
| `story/` | Cross-scene progression, contacts and presentation controllers |
| `art/` | Procedural artwork and visual construction/composition contracts |
| `authoring/` | Local editor, isolated native previews, source document allowlist and loopback save service |
| `ui/` | Player/developer interfaces: menus, maps, terminal, goal guidance and controls |
| `data/` | Shared schemas, validation, loading and global engine/network/logic definitions |
| `docs/design/` | Current design proposals and progression concepts |
| `docs/reference/` | Technical authoring references and visual principles |
| `docs/history/`, `archive/` | Earlier feedback and superseded plans |

The root keeps the entry point, README, agent guidance and active roadmap/scene-system plan
and execution ledger. New location code belongs in its scene package, not at the root.

## Packaging logic

A reusable mechanism belongs in `engine/`: evaluating a condition, sending a signal, delaying
an action or running a device verb. A particular machine's story effect belongs beside its
scene: `scenes/stacks/rules.ts`, for example, decides what loading that ferry means.
Cross-location timetables belong in `world/transport/`; campaign progression belongs in
`story/`. Do not put unrelated logic in a generic helpers directory.

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
| Downtown world coordinates and readable/NPC placement | `scenes/downtown/layout.ts` |
| Downtown NPC/fixer dialogue | `scenes/downtown/dialogue.ts` |
| Downtown objective selection | `scenes/downtown/progression.ts` |
| Deck command execution and completion | `ui/terminal/commands.ts` |

Filesystem moves do not rename scene IDs, storage keys, device/noun/verb/event IDs,
destination IDs or the virtual files presented by the deck. Those are gameplay contracts.

## Rendering and authoring boundary

`art/` owns the visible pieces, including code-rendered sprites and animated artwork.
Scene definitions own placements and gameplay bindings; controllers supply time, state and
environment. Specialized artwork may keep its own construction algorithms while exposing
the common placement, property and anchor contracts. Animation and environmental response
must use explicit inputs so the game and composer can draw the same frame.

All 19 registered scenes have `composition.json` documents and canonical scene factories/adapters.
`scenes/<id>/composition.ts` resolves authored placement into gameplay geometry and immutable visual
bindings. A retained `scene.ts` holds scene-specific actors, perches or a visual-state adapter;
its filename does not imply that it owns raw canvas artwork. The implementation uses a mixture
of those adapters and exports from `index.ts`; follow imports rather than assuming identical files.

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

`world/transport/line.ts` owns timetables, ride state and visual snapshots. Train and departure-board
pictures live in `art/vehicles/platform-train.ts` and `art/signage/line-departures.ts`.
`story/title/` and `story/cutscenes/` own animation scheduling, actor preparation, timeline documents
and gameplay handoffs; their pictures use `art/sequences/`. Preview seeking uses independent sessions.

The editor uses these same scene factories, native frame path and sequence dispatchers through
`authoring/scene-adapters.ts`, `native-preview.ts` and `sequence-preview.ts`. The source allowlist is
`authoring/source-documents.ts`: 19 scenes, four sequence compositions and two timelines. Validated
saves update those JSON sources; they do not change TypeScript, player saves or world geography.
The world panel derives its inspection model from `world/city.ts` and current source documents.

See [local composer instructions](../../authoring/README.md) for startup and save behavior and
[the execution ledger](../../SCENE-SYSTEM-STATUS.md) for accepted coverage and remaining gates.
A directory move or finite bounds check alone does not establish pixel identity, full editable
addressability, editor-operation acceptance or overall plan completion.
