# ACCESS DENIED: agent guidance

Read README.md here for preview commands, the code map and documentation roles.

## Design is open

Everything is still being designed together: story, puzzles, visuals, controls and architecture.
Treat existing code and documents as the current iteration. Historical "decided", "canonical"
or "source of truth" language does not make a design immutable. The user's current direction
takes precedence. Investigate contradictions and update stale descriptions rather than
silently restoring an obsolete design or automatically asking for permission.

For story and teaching progression, read [PROGRESSION-CONCEPT.md](./docs/design/PROGRESSION-CONCEPT.md).
It records the newer direction and explicitly open proposals; it does not mean the redesign
is implemented or authorize implementing all of it. Older act-order notes are historical context.
Use ROADMAP.md for the active milestones and docs/design/PROLOGUE-ACT-I-PLAN.md for the detailed first
design pass. The prior roadmap is preserved under archive/ and is not the active build order.

## Keep changes coherent

- For behavior, start with `runtime/game.ts`, the relevant `scenes/<id>/` package and its
  `devices.json`/rules. Read `docs/reference/MODULES.md` for ownership and dependencies.
- For scenery, use the registered pieces in `art/` and scene-owned `composition.json` plus
  `composition.ts` adapters. `runtime/render-scene.ts` is the shared game/editor frame path.
  Keep gameplay updates and history preparation outside painting; bind explicit validated visual
  snapshots. Supply the frame's `View.lighting` and `View.illumination` to artwork rather than
  reading or changing a global light/shadow frame.
- Read `authoring/README.md` before composer work. Its local launcher is
  `pnpm --filter plaza-design-demo compose-scenes` (repository root; UI 4192, save service 4193).
  Saved composition/timeline JSON and the scoped Sandbox behavior document are game source,
  not player saves. Workbench viewing is read-only; behavior edits must stay within the frozen
  `authoring/inventories/S13.json` contract and existing protected Save. Restart after code/schema
  changes and rebuild the homepage after saving source edits.
- Appearance preservation is an acceptance gate for scene-system changes. Preserve seeded
  variation, coordinates, canvas state and draw order; use the immutable baseline and execution
  ledger for the scoped comparisons. Registered/editor-visible coverage alone is not a passed gate.
- Use docs/reference/GAME-DATA.md for the authoring format and docs/reference/ART-GUIDE.md for current visual intent.
  Use ROADMAP.md to distinguish implemented work from proposed work, not to lock priorities.
- Register new scenes/data and include their code contracts in the homepage generator's
  validation where applicable. The regular React demo build is not the game build.
- Keep player progress compatible unless the user requests a reset/version change. Validate
  saved scene ids before entering them and keep a fallback for older saves.
- Scene clocks, watchdogs and delayed signals/actions share pausable scene time. Lockout
  deadlines use wall time intentionally; do not accidentally pause them with puzzle time.
- When changing behavior, correct the relevant implementation description. Label older
  sketches and historical feedback so they cannot be mistaken for current instructions.

## Validation and publishing

Run appropriate builds and focused checks for the requested change. The user wants to discuss
playthroughs before a playthrough or regression-suite/CI expansion is undertaken. Do not add
those implicitly. Do not treat a successful build as proof that every puzzle can be completed.

A request to edit or review does not itself authorize publishing. Homepage and design builds
are separate outputs; production workflows run when the production branch is pushed.
