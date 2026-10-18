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
Use ROADMAP.md as the single active priority/status overview; story M1-M9 retain their IDs and
shared engine/authoring/demo work uses ENG IDs. GAMEPLAY-ENGINE-PLAN.md defines finite execution
gates; GAMEPLAY-ENGINE-STATUS.md records selected scope and evidence. GAME-EDITOR-PLAN.md supplies
supporting requirements rather than competing priorities. Use docs/design/PROLOGUE-ACT-I-PLAN.md for
the detailed first design pass. The prior roadmap is preserved under archive/ and is not the active build order.

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
  Saved composition/timeline JSON, the scoped Sandbox behavior document and Harbor Shift's
  `gameplay.json`/`scene.json` plus registered `authoring/play-fixtures.json` are game source,
  not player saves. Workbench viewing is read-only; behavior edits must stay within the frozen
  `authoring/inventories/S13.json` contract and existing protected Save until a phase of
  `GAME-EDITOR-PLAN.md` (the approved full-game-editor direction) defines a wider scope. Restart
  after code/schema changes and rebuild the homepage after saving source edits.
  The Gameplay workbench may edit the registered `harbor-shift-gameplay` document through
  `validateShiftGameplay`; retain its protected IDs and invocation permissions. Its laboratory
  executes pending documents without accessing player storage. Shop, Library and Laundromat also have explicitly registered scene/gameplay documents in
  `authoring/gameplay-scenes.ts`; their validators protect existing IDs and invocation permissions.
  The Test District registers demo-counter-scene, demo-desk-scene and their single shared
  demo-counter-gameplay document; validators preserve role bindings and permissions. Other gameplay
  files are not implicitly editable. Scene logic may edit `harbor-shift-scene` through `validateShiftScene`;
  Play fixture edits use `validatePlayFixtures`. Both use protected Save/history/bundles.
  The Play tab runs the real Harbor Shift, Sandbox, Shop, Library or Laundromat Game from pending snapshots
  in a disposable opaque-origin iframe. Keep its storage private through `runtime/storage.ts`;
  do not give the frame same-origin privileges or a source-service credential. Stop/reset/tab
  closure must destroy its realm. Test-only input hooks belong only in focused fixture scripts.
- The homepage build also emits the static public `/editor/`. Keep its snapshots/read-only
  source viewer and edit downloads independent of the loopback source-write service. Never
  publish that service or its session credentials. Portable edit bundles use the existing
  model validation/history and must validate atomically before entering pending state.
- Appearance preservation is an acceptance gate for scene-system changes. Preserve seeded
  variation, coordinates, canvas state and draw order; use the immutable baseline and execution
  ledger for the scoped comparisons. Registered/editor-visible coverage alone is not a passed gate.
- Use docs/reference/GAME-DATA.md for the authoring format and docs/reference/ART-GUIDE.md for current visual intent.
  Use ROADMAP.md to distinguish implemented work from proposed work, not to lock priorities.
- Register new scenes/data and include their code contracts in the homepage generator's
  validation where applicable. The regular React demo build is not the game build.
- Shared saved values live in optional Save.gameplay; preserve unrelated values and native scene
  snapshots. Purchases own their quote/charge definitions. Migrated chatter uses the shared
  conversation runner with explicit progress/entry commands; painting a frame must never give rewards.
  /?demo has separate autosave/slot/resume keys; editor Demo world retains opaque private Play.
- ENG-04 native bindings are registered only for Beach and the demo Workshop; Market has a shared
  paid fortune sequence. See ENG-04-PLAN.md for exact verbs/exclusions. Native state keeps one owner
  in SceneSave via nativeStatePort; committed event metadata carries native goal changes atomically.
  Bindings and source wires use protected validators in native-gameplay-scenes.ts. Do not attach
  native bindings to other gameplay documents implicitly. Eligibility must remain pure, and dialogue
  commands must respect native lock/seal/watchdog rules. Existing signal time stays authoritative.
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
