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
  Contextual source assembly must accept both folder and catalogue registrations with their actual
  composition, scene, gameplay, devices and shared declarations. Reuse the already validated pending
  registry for inspection and cross-source validation rather than independently rebuilding scenes.
- Use GameplaySession for commands/conditions/atomic reactions and ConversationSession for
  character chatter, choices and device dialogue. Name native talk graphs explicitly. Native
  DialogueData is inspection metadata, not permission to add another dialogue runner.
- Shared robot/animal interaction metadata references ordinary graphs in bot-gameplay.json and
  critter-gameplay.json; names/pages belong to those graphs. Edit them through the conversation
  library or selected character controls, not another reply-list panel. Robot graph specialization
  is a pure compiler into stable per-actor state addresses. Default animal cycling uses ordinary
  session state in the existing global GameplaySession; do not add a presentation counter or
  reset that state merely because a different chunk is entered.
- Companion follow availability is an ordinary `when` condition in the shared definition.
  Chunks inherit it unless they supply an override (`null` explicitly means always). Home
  residence and physical following remain distinct. Declare writable exit flags in gameplay;
  do not restore a companion-specific flag exception or an `unlockFlag` field.
- One world state stores scalar values in Save.gameplay[keyPrefix][localKey]. A declaration's
  qualified ID is its default address; optional `binding` names an explicit saved world-state key.
  Native fields access that value through sceneStateView; never serialize alias copies.
  Alternate chunk presentations can access the same keys. State-owner/entity-reference/copy-mode
  selectors and automatic state migration are not authoring concepts. Scene checkpoints keep
  engine metadata and once-trigger receipts, not another scalar copy. Declare defaults,
  types and save/session/interaction lifetimes. Saved shop rotation and dialogue progress do
  not reset just because the browser session ends. Queries and eligibility must be pure.
  The World variables browser indexes pending source declarations and typed references, not
  campaign storage. Reuse the shared schema controls and checkpoint key helper; do not create
  another variable store or infer references from arbitrary page/literal strings.
  Game settings edits the default campaign configuration; Developer tools edits explicit test
  overrides. Profiles reference starting checkpoints in world/checkpoints.json; do not add profile
  seed objects or duplicate start scene/entrance fields. Reuse Starting state controls in both
  the inspector and private Play. Validate pending references together, initialize from actual
  gameplay declarations, and never reapply starting inventory/placement on Continue.
  New Game consumes checkpoint location, environment, transport and optional sequence through
  world/checkpoint-state.ts and the shared runtime/sequence-state.ts sampler. Native Play and
  editor reconstruction use the same mover snapshots/receipts. Do not restore a hardcoded New
  Game glide or another story start destination. Starting direction resumes reconstructed receipts
  without replaying launch workflows. Private Play's Run configuration is an explicit scoped
  choice; changing it disposes the old private realm.
  Use the same profile/schema controls for both. Global story rules are in Library
  → Story logic; per-chunk phases are edited on the chunk, never in a second global chunk picker.
  City map owns place/district/discovery/travel editing beside the native map preview. Its forms
  require a contextual scope; do not restore a standalone catch-all city screen. Stage connected
  station routes until Apply, keep preview conditions separate from source, and reuse a single
  scene-reference snapshot per render rather than copying all documents for each nested field.
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
  Global story triggers also use ordinary `when`/`watch` predicates evaluated by the existing
  global GameplaySession. Runtime presentation supplies registered read-only story observations.
  Counts belong in declared state/commands; only pausable timestamps stay in presentation.stamps
  (`stamp`/`clearStamps` cues). Do not restore CounterTest or special quiet/once/viewing predicates.
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
- World composition membership is separate from residency. Use world/compositions.ts and
  world/compiled-world.ts; do not duplicate placement in raw seams and a composition. Commands
  stage a coherent edit; lifecycle defers unsafe disposal internally. Loading alone is not a
  blocker. Keep player and directing-camera references independent, including disconnected
  interiors. Camera residency must not merge unrelated floors or trigger player discovery.
- Sequences keep controls with their composition. World direction uses sequence.world-control,
  normal Game/SceneModel ticks and named mover-path system actions. Events request source-discovered
  sequences through existing handoffs. Markers carry skip policy; completion/cancellation use
  system commands and persisted receipts. Painting consumes prepared models and never constructs
  an implicit inspection world. Editor scrub reconstructs isolated state/movers without native
  trigger/storage/reward hooks; full simulation is private Play. Do not reinstate the opening's
  end reset, handoff refit or visual train-position/door substitutes.
- Keep runtime/game.ts as the composition root and single frame owner. Input, movement, camera,
  scene lifecycle, interactions, story/travel and presentation live in the focused runtime modules
  listed in the handbook. Bind directly to those functions instead of adding private forwarding
  methods. Scene lifecycle owns both residency and departure/visibility decisions. Camera projection
  is derived without temporarily mutating camera state. Their typed ports refer to the existing owned records in runtime/state.ts;
  do not add another state copy, loop or scheduler. Preserve frame-stage order when extracting code.
  Phase arrival narration uses the same once/occupied-vehicle deferral policy on seam crossings,
  door entry and alighting. Active phase goals precede base objectives. Keep that behavior in the
  existing shared arrival operation rather than implementing separate entry announcements.
  Editor input/selection/inspector/preview modules route edits through ComposerModel and dispose
  their listeners and mounted controls. Shared projection/bounds belong in art/core/geometry.ts.
- Contextual editor work belongs in the existing right inspector: properties, connections,
  group endpoints, creation/mount drafts, unmount/delete confirmation and actionable validation.
  Selecting a relationship in the viewport must select/highlight its context and expose its typed
  controls beside the world. Reuse WorkbenchContext.inspect and inspector-task.ts for staged
  Apply/Cancel forms; do not introduce modal form helpers, native prompt/confirm calls, detached
  catch-all screens or raw JSON as substitutes for designed controls. Keep the viewport usable.
  Validation must say what failed, whether an edit was applied and how to recover; persistent,
  wrapping inspector messages own the explanation. Header status is only a short summary.
  Creation/draft opening and cancellation must not alter source/history. Invalid Apply keeps the
  draft and its values visible. Deliberate selection/source changes close obsolete drafts.
  Shared libraries and global configuration retain their established homes. File pickers and
  browser leave-page warnings have different purposes and are not contextual editing forms.
- Numeric editor fields use standard number inputs with accurate min/max/step metadata and the
  shared numeric-scrub.ts root interaction. Do not add per-panel drag handlers or commit each
  pointer sample as an Undo step. ComposerModel.beginInteraction owns validated preview/history
  grouping and rollback; staged inspector forms remain drafts. Artwork samples validate composition
  shape and reuse the existing transient preview/source version; full prospective validation runs
  once on release and rolls back a refused gesture. Never recompile the entire world per pixel. Stop animation before changing
  animated values and retain the existing keyframe semantics at the fixed playhead. Dispose the
  gesture listeners, cancel on navigation/disposal and defer inspector/thumbnail rebuilds until
  release. Preserve click-to-type, keyboard entry, whole-number constraints and field ranges.
- Hover and press use the same authoring hit query. Do not add a stricter painted-pixel gate only
  for clicking: gaps in an outlined group and bounded editor handles remain selectable. Respect
  authoritative clips/visibility and paint-order ties. Native pixel probing is a fallback, not a
  second click policy. Borrowed scene behavior must retain the edited document's source identity
  for object and chunk-border selection; never redirect proposal artwork to a base scene.
- Reuse the existing editor interaction and its styling before implementing another presentation.
  Hover and selected labels share the same compact control and screen-space sizing. Selection
  remains identifiable without consulting another panel. Handles, cursors and drag previews must
  represent supported actions: no resize handles without resizing. Check known world-connection
  and procedural-motion constraints before displaying a changed placement, using authoritative
  rules rather than a parallel lock list. Retain full validation at commit and immediately repaint
  committed state after rejection or cancellation; never leave a refused edit visible until deselection.
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
   For editor changes, demonstrate the complete affected task: find/select, inspect, change,
   preview, commit or reject, recover and Undo where applicable. Check interaction responsiveness
   when relevant. A field being exposed is not proof that it is practical to use. Reuse existing
   focused checks; fixtures must use current compiled-world and save contracts rather than obsolete
   raw-source assumptions. Do not broaden a small change into an unrelated campaign playthrough.
4. Run focused checks appropriate to the change and the relevant build. Run package tsc -b from
   packages/plaza-design-demo, not the repository root. The handbook maps mechanics to checks.
5. For preservation-sensitive changes, use current contract checks and approved current visual
   snapshots. Update expectations only for a deliberate behavior/appearance change; never regenerate
   an expectation merely to silence a failed test. Do not depend on historical engine copies,
   captured old source, milestone hash pins or migration reports.
6. Remove replaced execution paths and update current docs. Keep test inputs small and purposeful;
   fixtures describe current contracts, not a second engine. Name any retained primitive and explain
   why it is the sole owner of that calculation or drawing.
7. Report engine capability, editor workflow usability and verification separately. Distinguish
   source review, focused automated checks and actual browser interaction. Mark untested tasks,
   raw-JSON authoring gaps and subjective design decisions explicitly; do not treat engine
   consolidation or source coverage as completion of the editing experience.


The agent owns mechanical checks. User feedback should concern clarity, appeal, timing and editor
workflow, using direct Test District shortcuts rather than walking between examples. Do not add
campaign playthroughs, CI/regression-suite expansion, endless performance work or new chapters to
a bounded task without authorization. Performance instrumentation is opt-in, local and disposed
with its owner; do not change simulation or quality to improve a measurement.

Builds from repository root: pnpm build:homepage and pnpm build:design-demo. pnpm dev is the React
showcase, not the game. Publishing is separate from editing; honor any explicit standing session
authorization, inspect upstream changes, preserve concurrent work and report deployment truthfully.
