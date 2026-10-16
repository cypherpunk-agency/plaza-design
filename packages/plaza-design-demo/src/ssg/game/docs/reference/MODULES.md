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

## Rendering boundary during migration

`art/` owns the visible pieces, including code-rendered sprites and animated artwork.
Scene definitions own placements and gameplay bindings; controllers supply time, state and
environment. Specialized artwork may keep its own construction algorithms while exposing
the common placement, property and anchor contracts. Animation and environmental response
must use explicit inputs so the game and composer can draw the same frame.

The shared kits and Downtown artwork have moved. Other scene-local drawing and animated
presentation artwork still await extraction. `world/transport/line.ts` also still contains
train/board drawing awaiting that extraction; the final boundary must remove these mixed
responsibilities. A directory move alone is not evidence that this boundary is complete.
