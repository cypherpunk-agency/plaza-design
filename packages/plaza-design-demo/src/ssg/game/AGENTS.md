# ACCESS DENIED: instructions for agents

## Start here

The game is in active design. The user's latest direction overrides historical decisions.
Read [ENGINE-HANDBOOK.md](./docs/reference/ENGINE-HANDBOOK.md) before changing gameplay or adding
content. It explains ownership, concrete extension recipes, examples and verification.
Read [README.md](./README.md) for launch commands and [authoring/README.md](./authoring/README.md)
for editor work. ROADMAP.md owns current priorities. Completed migration plans and evidence
have been retired; do not recreate them or restart the completed consolidation.


## Required implementation boundaries

- There is one runtime: the game loop (runtime/game.ts) and the scene model (SceneModel: the
  Circuit's devices, movers, zones, clocks). A new feature never brings its own runtime, engine,
  update loop, scheduler or class that keeps per-frame state beside them. It is source data compiled
  into what exists, plus pure functions the game loop or the model call: player movement state lives
  with the player in the game loop, anything that moves is a mover, any place that notices is a zone.
  Levels are the example: engine/level.ts compiles the kit and holds pure rules; a lift car is only
  its mover.
- Ordinary interactions, dialogue, objectives, access, rewards, prices, state and progression are
  authored scene/gameplay/device/world documents executed by existing shared compilers and
  engine/gameplay. Start there. runtime/game.ts orchestrates systems; it is not the place for a
  scene-specific condition, reward, text substitution or progression switch.
- Use GameplaySession for commands/conditions/atomic reactions and ConversationSession for
  character chatter, choices and device dialogue. Name native talk graphs explicitly. Native
  DialogueData is inspection metadata, not permission to add another dialogue runner.
- Save.gameplay[owner][localKey] is the single scalar owner. SceneModel references the same live
  block; scene checkpoints keep engine metadata, not another scalar copy. Declare defaults,
  types and save/session/interaction lifetimes. Saved shop rotation and dialogue progress do
  not reset just because the browser session ends. Queries and eligibility must be pure.
- The user excluded historic save compatibility. Do not invent old-format codecs, scalar alias
  maps, save-owner bridges or canonical backfill. Keep safe current-format validation. Removed
  optional authoring fields stay removed; missing required current fields reject explicitly.
- Keep invocation sources and native origin checks explicit. System-only physical workflows,
  locks, guards, seals and watchdogs remain enforced. A typed form must not bypass authorization.
- New physical calculations or drawing kernels may remain registered code primitives with typed,
  validated source inputs and explicit lifecycle ownership. Ordinary predicates, rewards,
  dialogue and timers do not become native controllers just because a scene is unusual.
  Existing trigger phases include beforeNative, afterNative and onPersist; choose the phase
  that preserves the relevant behavior. Do not add an independent evaluator or scheduler.
- Art belongs in the registered art library, placements in composition sources. Game, editor and every
  sequence (title glide, cutscenes, travel pictures) share runtime/render-scene.ts `renderWorldFrame`: there is
  one render path, configured (a sequence's camera, passes and overlays are settings of that frame), never a
  second frame renderer, projection or pass order (Tommi, 2026-10-22). The opening and cinematic frame
  paths and separate sequence adapters have been removed. Use runtime/prepare-frame.ts to prepare the
  common frame; sequence controls live with their composition, never in a second saved timeline document. Painting/bounds/queries never advance gameplay or give rewards.
  Preserve seeded variation, canvas state, geometry, draw order and animation cadence unless
  the user requests a visual change. Supply explicit View.lighting/View.illumination and prepared
  state; do not read or mutate a global lighting frame inside artwork.
- Character bubbles, device captions/pings, the shared status/help lane and goal guidance have
  distinct roles. Reuse their routing, readable clock, receipt identity, cancellation and terminal
  history. Do not reintroduce toast/gain/touch-mirror overlays or make a device speak as the player.
  Scene timers use pausable scene time; wall-clock lockouts intentionally have another policy.
- Pending companion documents validate as one prospective graph. The same pending source drives
  native Game Play; never maintain a simpler editor-only evaluator. Add typed authoring together
  with a shared feature, a compact demo example and the real scene change.
- Keep runtime/game.ts as the composition root and single frame owner. Input, movement, camera,
  scene lifecycle, interactions, story/travel and presentation live in the focused runtime modules
  listed in the handbook. Bind directly to those functions instead of adding private forwarding
  methods. Scene lifecycle owns both residency and departure/visibility decisions. Camera projection
  is derived without temporarily mutating camera state. Their typed ports refer to the existing owned records in runtime/state.ts;
  do not add another state copy, loop or scheduler. Preserve frame-stage order when extracting code.
  Editor input/selection/inspector/preview modules route edits through ComposerModel and dispose
  their listeners and mounted controls. Shared projection/bounds belong in art/core/geometry.ts.
- Import editor types from authoring/contracts.ts and pending-document/history operations from
  authoring/composer-model.ts. Keep frame contracts in runtime/frame.ts and pure gameplay reads
  in engine/gameplay/queries.ts; avoid circular imports between validators, execution and painting.
- Use ComposerModel history, document-bundle validation and the protected source store. Invalid
  grouped edits must reject atomically. Public editor downloads cannot write repository files.
  Keep the local source service/credentials off public bundles. Private Play keeps opaque-origin
  frames and runtime/storage.ts memory isolation; Stop/reset/disposal must destroy the realm.

## Work and verification

1. Inspect current source and choose an existing shared contract before introducing an abstraction.
2. Make the source, shared behavior and typed controls agree. Ordinary scenes use the existing
   catalogue/manifest pipeline and must not require a new per-scene TypeScript registry entry.
3. Verify the actual pending behavior and applicable history/bundle/protected Save/native reload.
   A source panel, registered JSON, screenshot or green build alone does not prove full authoring.
4. Run focused checks appropriate to the change and the relevant build. Run package tsc -b from
   packages/plaza-design-demo, not the repository root. The handbook maps mechanics to checks.
5. For preservation-sensitive changes, use current contract checks and approved current visual
   snapshots. Update expectations only for a deliberate behavior/appearance change; never regenerate
   an expectation merely to silence a failed test. Do not depend on historical engine copies,
   captured old source, milestone hash pins or migration reports.
6. Remove replaced execution paths and update current docs. Keep test inputs small and purposeful;
   fixtures describe current contracts, not a second engine. Name any retained primitive and explain
   why it is the sole owner of that calculation or drawing.


The agent owns mechanical checks. User feedback should concern clarity, appeal, timing and editor
workflow, using direct Test District shortcuts rather than walking between examples. Do not add
campaign playthroughs, CI/regression-suite expansion, endless performance work or new chapters to
a bounded task without authorization. Performance instrumentation is opt-in, local and disposed
with its owner; do not change simulation or quality to improve a measurement.

Builds from repository root: pnpm build:homepage and pnpm build:design-demo. pnpm dev is the React
showcase, not the game. Publishing is separate from editing; honor any explicit standing session
authorization, inspect upstream changes, preserve concurrent work and report deployment truthfully.
