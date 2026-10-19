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
  Composition, scene, gameplay, devices, world, network and timeline documents are authored game
  source, not player saves. ENGINE-CONSOLIDATION-GOAL.md expands the earlier Sandbox/ENG-04 pilot
  to all 19 existing scenes and ordinary authored scene creation. Earlier frozen pilot inventories
  describe their historical scopes, not a present restriction on the authorized goal.
  Use registered prospective validators and shared typed controls; preserve default identities and
  invocation behavior while supporting required creation, removal and rebinding. Authors can edit
  ordinary source permissions after validation; actual physical-input origins, system-only workflows,
  locks, seals and watchdog authorization remain enforced. Do not protect every historical vocabulary
  or state ID merely because it appeared in the original document. Pending documents
  must drive the actual runtime rather than a parallel editor evaluator. Restart after code/schema
  changes and rebuild the homepage after source edits.
  The scene-centered Layout/Logic/Wiring/Play editor runs pending native Game scenes in disposable
  opaque-origin iframes. Keep storage private through runtime/storage.ts; do not give frames same-origin
  privileges or source-service credentials. Stop/reset/tab closure must destroy the realm. Test-only
  input hooks belong in focused fixture scripts.
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
- Scalar state has one common owner: Save.gameplay[owner][localKey]. Gameplay declarations own
  defaults/types/lifetimes; SceneModel.state directly references its scene block. Engine snapshots
  contain device metadata, not another scalar store. Preserve unrelated values. Purchases own their quote/charge definitions. Migrated chatter uses the shared
  conversation runner with explicit progress/entry commands; painting a frame must never give rewards.
  /?demo has separate autosave/slot/resume keys; editor Demo world retains opaque private Play.
- Device bindings cover the existing scene corpus through validated gameplay sources. Shared commands
  and native simulation mutate the same common state blocks; no scalar alias map or save-owner bridge.
  Current Save serializes settled copies without mutating live state. Read-only queries use the common
  evaluator and never acquire saved values. Committed event metadata carries native goal changes.
  Bindings and source wires validate against the prospective graph and registered native dependencies. Eligibility must remain pure, and dialogue
  commands must respect native lock/seal/watchdog rules. Existing signal time stays authoritative.
- Preserve normal current-format progress and validate saved scene IDs before entering them.
  The user explicitly excluded historic save-format compatibility; do not add codecs, migration
  bridges or old-format acceptance gates. Keep safe invalid-destination handling.
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


## Feedback-ready ENG-05/06/08 package

See ENG-05-08-PACKAGE.md and ENG-05-08-STATUS.md for the bounded scope. Objective selection lives
in engine/gameplay/objectives.ts; access conditions/command eligibility in access.ts; native
capability/door/harbor adapters in world/access.ts. Do not duplicate their evaluation in UI code.
Scene logic supports optional ordinary-interaction access requirements. Manifest fields require
the registered declared-scene adapter; other factories must not silently accept them.

scenes/demo-manifest supplies three protected source documents and an isolated editor pilot.
Its runtime shop role is private to the opaque Play frame; it is not a campaign scene/save/map entry.
Native scene controllers and world registration remain code-owned outside the explicit pilot.
Market cook/fish/repair/sleeper text now lives in gameplay.json shared nodes, not inline talk arrays.

Performance recording is opt-in via ?perf, bounded, local-only and disposed with its owning session.
Keep real measurement time separate from game clocks. Normal rendering, saves and inactive-scene
policies must not change merely to improve a measurement. No CI expansion, campaign playthrough,
publication or new story/pacing decisions follow from this package.


## Active all-game migration (authorized 2026-10-18)

ENGINE-CONSOLIDATION-GOAL.md expands existing source/editor support to all 19 scenes, G0–G13.
The old pilot-only editing restrictions describe historical completed scope; the user explicitly
approved typed wider authoring and full editor integration for this goal. Preserve the latest
scene-centered UI. ENGINE-CONSOLIDATION-STATUS.md and ALL-GAME-MIGRATION.json distinguish source
registration, actual editable behavior and preservation evidence. Do not call an opaque native
content wrapper or read-only source panel full authoring. Immutable original source is under
.scene-system/all-game-baseline-2026-10-18 at the repository root; never overwrite it.
Scene content registration currently covers all 19 scenes; the private Play fixture generator supports all 19. Ordinary
entity creation/deletion, world/controller contracts and some device dialogue remain unfinished.
Shared conditions now support pure time-window/weather reads through GameplayState.world. Game
supplies live context; missing context remains unknown under negation and cannot grant permission.
Actor contextual lines compile to shared conversation entries without advancing ordinary cursors.
Paid service purchases use explicit service:true (no fake inventory goods) and atomic commands.
Browser raster evidence can be archived with build-all-game-pixel-check.mts and the loopback-only
serve-all-game-pixel-check.mts. Native preview pixel parity is not full gameplay/HUD verification.

Declared engine targets live in scene.json nativeTargets, validated through the existing device
condition/action checker and executed through SceneModel. No independent native state evaluator.
Capsule/Yard/Moth/Sandbox use this adapter; only Sandbox grants its explicit reset lifecycle operation.
Private Play uses authoring/pending-scene.ts to assemble pending content and behavior together.

Source descriptors may supply validateContext for references into companion documents. Protected
Save/read/reload and recovery validate paired snapshots; never validate a pending scene against
its compiled original gameplay document when a prospective companion is available. Native action
authorization remains enforced at execution. Optional source fields must stay removed; do not
restore canonical actors, manifests, reaction IDs or configuration for incomplete older bundles.
Required current fields reject when missing. Scene cues are cosmetic committed-event frame stamps, never rewards.
Beach uses the same shared native event observer for the gull animation and keeps its existing frame
clock; templates are explicit, read-only tokens/item/state fields, validated before execution.

Harbor ordinary interactions now share scene/gameplay documents, with a committed crane cue.
Goods rotation and bribe dialogue progress are saved; the native first-tea reward remains session
scoped. Empty ordinary response pages mean intentional silence (never an empty bubble). Route
speaker overrides preserve named objects such as the painted mark. Optional use heights remain
local to their composition anchors. Downtown exits/readable text are authored, including key/flag
requirements; empty arrival pages compile to no intro. Downtown runtime story/people, device
controllers and generic bot reactions remain outstanding despite all 19 source registrations.
