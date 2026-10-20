# ACCESS DENIED: instructions for agents

## Start here

The game is in active design. The user's latest direction overrides historical decisions.
Read [ENGINE-HANDBOOK.md](./docs/reference/ENGINE-HANDBOOK.md) before changing gameplay or adding
content. It explains ownership, concrete extension recipes, examples and verification.
Read [README.md](./README.md) for launch commands and [authoring/README.md](./authoring/README.md)
for editor work. ROADMAP.md owns current priorities. Completed migration plans and evidence
have been retired; do not recreate them or restart the completed consolidation.


## Required implementation boundaries

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
- Art belongs in the registered art library, placements in composition sources. Game and editor
  share runtime/render-scene.ts. Painting/bounds/queries never advance gameplay or give rewards.
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
