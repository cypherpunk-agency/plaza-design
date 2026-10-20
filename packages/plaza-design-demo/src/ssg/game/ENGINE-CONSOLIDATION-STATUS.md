# All-game consolidation: execution evidence

2026-10-18. ACTIVE. Scope: [ENGINE-CONSOLIDATION-GOAL.md](./ENGINE-CONSOLIDATION-GOAL.md).
Per-scene coverage: [ALL-GAME-MIGRATION.json](./ALL-GAME-MIGRATION.json).
Last verified deployment: `ffe3d4a` on main and production.
Production/main homepage jobs39346800192/39346800107 and design job39346800184 succeeded.
Earlier checkpoint3d6e21b was verified live against its successful CI artifact app-AEG6ZUR2.js.
The gate table describes current acceptance; dated sections retain their original checkpoint scope.
Checkpoint B is integration-verified at source `0928013b951c`: both builds,
173 zero-difference raster cases and all19 actual packaged-editor Play/Stop checks PASS.
See docs/reference/ENGINE-CHECKPOINT-2026-10-19-B.md for the bounded evidence and remaining work.
This does not promote the remaining whole-goal acceptance gates.

Starting main: `31616f6d45adf2238ceccd9ca69f8a49e08450f3`, plus preserved pre-existing local work.
Source baseline: `4d646c8add7a13b4687bd85fc5dae517376df47234666623351896bf974dc805`.
451 original files and complete serialized SceneDef content/function fingerprints captured once under
`.scene-system/all-game-baseline-2026-10-18/` (ignored local evidence). Never overwrite this directory.
Reproducible summary: scripts/scene-system/fixtures/all-game-initial-inventory.json.
This source capture is not evidence of pixel parity or playable outcomes.

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| G0 | IN PROGRESS | Immutable451-file capture verified; original game-subtree dirty diff reconstructed with explicit historical timing limits. BASELINE-RECONCILIATION.md records recovered evidence; final inventory reconciliation remains open |
| G1 | PASS | Retired producer/source routing audit and actual Game/Host/Panels/Schematic/history/causal checks; exact scope and source identity in docs/reference/COMMUNICATION-ACCEPTANCE.md |
| G2 | PASS | Actual readable-clock, reduced-motion/covered-screen, bounded priority/cancellation/guidance and on/off-screen device checks; COMMUNICATION-ACCEPTANCE.md |
| G3 | PASS | Exact frozen66-row corpus migrated, zero legacy rows,58 actor/17 bot bindings; original variants/effects/permissions/cursor/retry/rollback checks; COMMUNICATION-ACCEPTANCE.md |
| G4 | IN PROGRESS | Contextual source Save/history/bundles/recovery and bot source checks pass; full authoring/isolation acceptance pending |
| G5 | IN PROGRESS | Shared handoff reset/restore/disposal checks pass; whole-runtime lifecycle inventory/cases pending |
| G6 | PASS | Source839777ab5e10: all six workloads, three eligible repeats each, raw samples/environment/calibration and independent summary validation; top-three exclusive contributor inspection, no optimization retained. See PERFORMANCE-CHECKPOINT-2026-10-19-C.md. Earlier failed Chrome diagnostics remain immutable |
| G7 | IN PROGRESS | Both builds and source packaging pass; focused editor/browser checks recorded; full integration/handoff pending |
| G8 | IN PROGRESS | 19/19 ordinary manifests and actor collections now support source CRUD/rebinding/Save; new ordinary catalogue scenes run without TS registration. Native controllers/world/network/story and integrated acceptance remain |
| G9 | IN PROGRESS | Metro sessions/config/native rules/render bindings checked; full controller/network contracts remain pending |
| G10 | IN PROGRESS | Typed actor CRUD/source bindings now cover all19 native scenes; catalogue creation/history/bundles/Save are checked. Current combined source still requires all-scene browser Play, controller/network/device entity controls and complete lifecycle acceptance |
| G11 | IN PROGRESS | Moth Act transition authored through shared handoffs; full world/story/transport source integration pending |
| G12 | IN PROGRESS | Latest published native raster173/173 has zero differing pixels/errors; focused immutable outcome/current-save checks pass. Full state/actor/HUD/save acceptance remains pending |
| G13 | IN PROGRESS | Legacy conversation evaluators/counters removed; remaining old execution paths and all-gate audit pending |

Package `tsc -b` and `check-communication.mts` pass after the initial communication clock/lane change.
These are focused implementation checks, not campaign playthrough or final visual acceptance.

## 2026-10-19 continuation: Mall and real raster preservation

- Mall: seven native callback interactions and five NPC chatter sources migrated to shared
  scene/gameplay documents. Old purchase counters/callback bodies removed from mall/index.ts.
  Explicit paid-service purchase definitions charge through the same atomic commerce operation.
  `check-mall-content.mts`: PASS for 26 immutable original interaction sequences, displayed
  prices, resource/flag outcomes, failed-payment atomicity, saved meal rotation and pending edits.
- Warehouse: shared content and actor conversation bindings pass `check-warehouse-content.mts`,
  including original geometry/door/readables, pending changes, saved dialogue and four draw transcripts.
- Package TypeScript and `check-scene-batch.mts`: PASS. Public editor packaging: PASS with 48 source
  documents / 93 source references. Full editor entity creation/deletion is still outstanding.
- Browser native raster fixture: PASS, 95 cases across all 19 scenes; zero differing pixels and
  zero render errors. Observed in Chrome on 2026-10-19 from http://127.0.0.1:4204/. Source fingerprint
  `sha256:3d886a863a549c985ea6dce6ab4325e4771d2a3cad8ea7dabb4596f45e1cf0c8` versus the original
  baseline above. Cases include day/night, weather, portrait, reduced-motion and hack layers.
  Reproduce with `build-all-game-pixel-check.mts` and the native browser fixture. This compares
  native preview raster output; it does not certify gameplay/HUD overlays or all controller states.
  Browser evidence download timed out; the report was observed on-page, not successfully archived
  as a raw downloadable report. Full G12 remains incomplete.
- Private Play fixture validation now covers all 19 registered scenes; current native adapters serve
  unmigrated scenes. This is an inspection foundation, not evidence of full content authoring.

The active goal remains incomplete. G0/G1/G2/G3/G8/G10/G12 have partial progress; no full all-game
completion gate is promoted solely from these checks. No commit, push, publication or campaign playthrough.

## 2026-10-19 continuation: transit, Stacks and Market

- Four transit scenes now take arrival/readable/exit descriptions from shared documents. Their
  native placement adapters, platform behavior and train/device rules remain in place. Original
  inline transit content arrays are removed; train/dialogue.ts is now a compatibility view over
  the single authored content source. `check-transit-content.mts`: PASS for original geometry,
  boarding actions and device definitions; pending scene edits, fixtures, atomic history and bundles.
- Stacks: seven NPC sources and tea-urn content use shared documents. Old actor words/callback
  removed. `check-stacks-content.mts`: PASS, including 22 original NPC page cases and tea refusal/
  granting. Crane/security controllers remain outside this completed content slice.
- Market: haggling and fortune execute shared commands/purchase definitions; the six remaining
  NPC chatter sources moved to scene.json. `check-market-ordinary.mts`: PASS, 14 original ordinary
  cases / prices / consequences, 20 NPC page cases, saved cursor/haggle and pending native edits.
  `check-market-conversations.mts`: PASS for the prior four actors and 64 draw-command comparisons.
- Shared conditions now expose read-only time/weather context; contextual chatter precedes the
  ordinary cursor without advancing it. Typed conditions and contextual response controls are
  integrated in the editor. `check-world-conversations.mts`: PASS including 144 clock comparisons,
  missing-context refusal under negation, saved progress and invalid input rejection.
- `check-migration-progress.mts`: 12/19 registered scene-content definitions, 38 verified migrated
  NPC bindings and 25 remaining recorded legacy rows. It explicitly reports fullGoalComplete:false.
- Source packaging: 59 documents / 104 source references. Homepage and design-demo builds PASS;
  package tsc, check-eng04 and check-eng05 PASS. Existing Vite large-chunk advisory remains.
- Native browser raster: 95/95 PASS, zero differing pixels, now archived from the browser under
  `.scene-system/all-game-pixel-check/evidence/cc12ae828f06a1653252fdcc1fbafe4832f6ea30c76955c81b4efbcf403068e5-1792386457771.json`.
  This precedes the later missing-world-context negation hardening and progress documentation.
  Its fingerprint is scoped to that checkpoint. Native initial-state raster is not final G12.

Remaining source-content scenes: capsule, downtown, yard, moth, beach, harbor, sandbox. Full editor
creation/deletion is still blocked by existing placement identity contracts; those contracts must be
replaced with validated declared bindings, not relabelled complete. Most controller/world/network,
full communication demo and six measured performance workloads remain. No gate G0–G13 is complete
solely because a scene is registered or the above narrow checks pass. Goal remains ACTIVE.

## 2026-10-19 continuation: declared interior targets and Sandbox

- Capsule, Yard and Moth arrival/exits and native target definitions moved to scene.json.
  Targets use existing native conditions/actions/text validation and SceneModel execution, with
  no duplicate rules evaluator or state store. Inline target/use bodies removed from indexes.
  Target visibility, prompt labels/heights, response references/inline lines, action fields and
  engine exits have typed Logic controls; touch-specific arrival pages are supported.
- `check-interior-content.mts`: PASS, ten immutable original door/parcel state cases, exact
  outcomes/repeated uses/rewards, old-save reload settling, geometry, desktop/touch arrivals,
  pending native response/height edits and shifted anchors, malformed-reference rejection,
  three-document atomic portable history. Original Yard settling on reload is preserved.
- Sandbox cards/arrival/exit, chip interaction and three NPC chatter sources migrated. Reset is
  an explicit permission on the existing native reset lifecycle; resets keep player inventory.
  `check-sandbox-content.mts`: PASS for original content/actor appearance, chip grants, 12 NPC
  page cases, nine weather/time cases and reset behavior. Private Play now combines pending
  Sandbox scene/gameplay documents and the existing pending behavior document in one factory.
  `check-sandbox.mts` and `check-demo-district.mts`: PASS, including the pre-existing scoped lab.
- Source registration now 16/19; remaining Downtown, Beach and Harbor. Three Sandbox NPC corpus
  rows migrated; 22 legacy paths remain. Full entity creation/deletion, controller and world
  authoring, communication, measured workloads and final G0–G13 audit remain outstanding.
- Package TypeScript, world conversations, transit, scene-batch and public editor packaging
  checks PASS. Public package: 67 source documents / 112 source references.
- Browser native raster PASS again: all 95 cases across all 19 scenes, zero differing pixels.
  Raw browser report archived at
  `.scene-system/all-game-pixel-check/evidence/bb917f378b29491113aee7f20f20f817949f4e6d917dce8e0ae78f200f2d11c9-1792387412650.json`.
  Native preview fixtures exclude gameplay/HUD/controller outcome coverage; this is not full G12.
  Source identity predates the later documentation/corpus status updates and cleanup.

No full completion gate is promoted from these focused results. Goal remains ACTIVE. No publication.

Follow-up integration verification at this checkpoint: homepage and design-demo builds PASS;
check-eng04 (48 Beach cases/security/native wiring) and check-eng05 (64 Downtown stages /
2048 Harbor attention states) PASS. Browser checked Capsule Logic target fields, valid field
edit entering Undo history and successful undo; Sandbox Logic exposes its migrated content,
and the real private Play frame reports “Playing pending sandbox snapshot” without an alert.
Stop disposes the session. Only technical fixture tabs were used; no campaign playthrough.
Later cleanup removes an unavailable “set” action option for scenes without writable state;
the archived raster fingerprint predates that editor-only change.

## 2026-10-19 continuation: contextual Save and Beach

- Fixed protected source validation to use companion gameplay from the complete prospective
  snapshot. Adding a command and connecting a scene route in one transaction is now accepted;
  dangling references are refused before writes. Read/reload, undo and partially replaced-pair
  recovery use coherent snapshots. Byte preservation, conflicts, outside-writer protection and
  allowlisted paths remain checked. Static editor packaging validates the paired snapshot too.
- `check-contextual-source-save.mts`: PASS for import/history/bundle/Save/reload/native execution,
  exact-byte undo/redo, failed second replacement and recovery from a temporarily dangling pair.
  Evidence copy: `.scene-system/contextual-source-save/run-llv4Bx`. Existing authoring-save,
  behavior-authoring-save and scene-batch checks PASS. The first authoring-save retry required
  the existing workspace junction / loopback check outside the filesystem/socket sandbox.
- Beach ordinary purchases, animal reactions and seven NPC text sources moved to shared
  documents. Original inline use callbacks and animal counters removed. Shared commands own
  saved response rotation; a declared cosmetic event stamp drives the existing gull flight.
  The runtime observer supplies the same `View.t` clock formerly passed through UseCtx.t.
- `check-beach-content.mts`: PASS for original geometry, four price/resource cases, eight
  animal-response/timestamp cases, 23 NPC pages, saved rotation/pending edits, invalid references
  and four exact original gull-flight paint transcripts. Native device rules remain on the
  existing engine. ENG-04 native contract/security/wiring checks also PASS after this migration.
- `check-presentation-signals.mts`: PASS for committed-event-only cosmetics, manual/signal
  parity, pure eligibility, failed-commit/resource isolation, capture/restore/disposal and strict
  declared tokens/item/state text fields. Ordinary denial text preserves the original token count.
- Source registration is now 17/19 (Downtown and Harbor remain), with 48 migrated NPC bindings
  and 15 recorded legacy paths. Full editor entity creation, controller/network/world authoring,
  remaining communication, measured workloads and the final all-gate audit remain unfinished.

Goal stays ACTIVE; no complete G0–G13 acceptance is claimed from this checkpoint. No publication.

Checkpoint verification: homepage and design-demo builds PASS; public editor package has 68
source documents / 113 source references. Interior, Sandbox, world-context and communication
focused checks PASS after the shared additions. Fresh browser raster: 95/95 cases PASS over
all 19 scenes, zero differing pixels. Raw report:
`.scene-system/all-game-pixel-check/evidence/e340045913a6264651a4555b898a5eb5785bb83da948fbac92768a20eea22f75-1792388348334.json`.
The full source-tree fingerprint is `sha256:e340045913a6264651a4555b898a5eb5785bb83da948fbac92768a20eea22f75`
prior to this evidence-ledger update. Native initial-state raster does not certify gameplay/HUD
or every controller state; the four Beach flight transcripts cover a separate transition slice.
The temporary technical browser tab and loopback fixture server were closed after verification.

## 2026-10-19 continuation: Harbor and Downtown source content

- Harbor ordinary callbacks/counters/text arrays removed from index.ts; scene/gameplay source
  documents own shops, rainy-day tea, bribe introduction/payment, the painted mark and carried
  fish/tea handovers. Ten actor text sources moved to the shared conversation compiler. A
  declared committed-event cue stamps the original crane frame clock. Goods and dialogue
  progress save; the original first-tea token reward stays session scoped (not promoted to a
  new permanently claimed reward). Silent missing-item refusals remain silent.
- `check-harbor-content.mts`: PASS for 26 captured immutable original response/quote/resource/
  crane timestamp cases, 37 NPC pages, three fisher weather variants, native geometry, pending
  translated bindings, saved shop rotations and five exact original crane animation transcripts.
  The initial test caught a doubled resolved cat-marker height; source heights were normalized
  before applying native placement, and the corrected original geometry now passes.
- Downtown exits/readable text moved to source documents; duplicated plaque text removed from
  layout.ts. Market flag visibility, Moth key/refusal data and no-intro behavior are preserved.
  Shared exit fields validate registered flags/keyring ids and expose typed requirement/refusal
  controls. Empty authored arrivals compile to undefined, preserving scene-flag behavior.
- `check-downtown-content.mts`: PASS for original shipping/native data/geometry/exit/arrival,
  access requirements, pending private Play/history, malformed-reference rejection and four
  original device-paint/old-state comparisons. Runtime Downtown story, sprite NPCs and fixer
  are NOT converted by this source slice.
- All 19 scenes now have source-content registrations. This is explicitly not full all-scene
  content/controller/editor acceptance: ordinary entity creation/deletion, full world/network/
  controller authoring, five legacy device dialogues, generic bot reactions, remaining ENG-09,
  six measured workloads and final preservation/cleanup gates remain unfinished.
- Public packaging check PASS: 72 documents / 117 source references. Harbor, Downtown, Beach,
  interiors, Sandbox, contextual source Save, ENG-04 and ENG-05 focused checks PASS after the
  shared response/access changes. Contextual Save evidence copy: run-PYBj7o under its evidence dir.

The original G0–G13 objective stays ACTIVE, with no gate completed merely from registrations.
No commit, push or publication.

Follow-up verification: homepage and design-demo builds PASS (72 documents / 117 references).
Shared gameplay foundation, contextual source Save, native ENG-04 and objectives/access ENG-05
checks PASS. Browser raster again passes 95/95, zero differing pixels or render errors:
`.scene-system/all-game-pixel-check/evidence/5523ba37ce8213b2f336ec66d080f388f34478eab3ac770233e974d6ad2fade7-1792389583264.json`.
Source fingerprint: `sha256:5523ba37ce8213b2f336ec66d080f388f34478eab3ac770233e974d6ad2fade7`,
before this ledger update. This remains native initial-state raster, not full G12.

New all-scene private Play startup check is NOT passing and does not close G10. It uses the real
packaged Play asset in opaque frames, with test-only native-storage/error/paint observers. The
first full report has six successful startups and thirteen timeouts:
`.scene-system/all-game-play-check/evidence/1792389715963.json`.
Subsequent diagnostic runs reproduced the failure without concurrent raster work. Later frame
requests finish serving HTML but browser documents remain about:blank: load=false, script=false,
ready=false, with the parent visible. No game error or native-storage access was reported.
Explicit frame-disposal turns, unique navigation URLs/context-identity probing and explicit HTTP
response lengths/closed connections did not fix the observed pre-script navigation stall.
This narrows the symptom; it does NOT establish whether the fixture, browser environment or editor
frame lifecycle owns the cause. The initial failure report is retained; diagnostic retries were
stopped after reproducing terminal per-case failures. No all-scene Play success is claimed.
The identity probe was removed; no production mode or sandbox policy was changed. Temporary tabs
and fixture servers were closed. Continue other required engine/editor migrations while retaining
this open integration issue, then finish the real editor lifecycle acceptance before completing G10.

## 2026-10-19 continuation: shared free-text dialogue and Capsule concierge

- Shared ConversationSession now supports bounded literal, case-insensitive substring input,
  typed miss/retry behavior and an optional terminal echo template. A miss does not dispatch
  entry commands; retry and matched transitions reuse atomic command/redirect processing.
  Terminal/closed nodes reject input. The typed gameplay editor exposes these fields.
- Capsule concierge words, choices and free-input settings now have one authored owner in
  gameplay.json. Native dialogue metadata is a read-only projection for existing inspection.
  Both explicit and default/bare talk dispatch select the shared runner. The legacy panel
  evaluator remains temporarily for the other four device conversations, not for this one.
- Capsule doorOpen remains owned by its original native SceneSave via a declared alias;
  no second gameplay-save copy is introduced. Original default cable moved to the shared
  native wiring source. Optional legacy cable IDs are preserved, including implicit from>to
  cut/rewire identity. Pending wire edits reach the real Capsule factory and typed editor.
- check-capsule-conversation.mts PASS: 20 original dialogue/state cases, 24 original choice
  transitions, pure frames, free-input match/miss/retry, pending text/matcher/wire edits,
  native door state ownership, malformed bindings and real explicit/default talk dispatch.
- check-free-conversations.mts PASS: transactional resource/commit failure isolation,
  retry/no-echo semantics, closed/terminal guards, strict authored fields, escaped metadata
  projection and 61 immutable-original matcher comparisons. Interior content, ENG-04,
  world conversations and shared gameplay foundation checks PASS. TypeScript build PASS.
- Homepage and design-demo builds PASS after the core migration. A subsequent small change
  routes bare talk through the shared resolver and is covered by the direct panel dispatch
  check; final end-to-end browser/dialogue UI and new all-scene raster acceptance remain open.
- Coverage check: 19 registered scenes, 72 documents, 58 verified NPC bindings,
  four recorded legacy dialogue rows. This does not close the full G0-G13 gates.

Goal remains ACTIVE. Private Play startup issue and the previously listed full-editor,
controller/world/network, communication, workload and final preservation gates remain open.
No commit, push or publication.

## 2026-10-19 continuation: HINGE and UNIT 7 shared entry commands

- Yard/HINGE and Sandbox/UNIT 7 dialogue words, choices, literal free-input rules and node
  effects moved from devices.json to gameplay.json. HINGE's deal uses one shared command
  to set saved gateAllowed and emit the mapped existing talk goal. UNIT 7's on/off nodes
  use shared commands to change the original saved lampOn value. Frames never repeat effects.
- Native dialogue metadata projects declared entry state/goal actions for existing validation
  and inspection. Unsupported entry command projections fail explicitly. It is not a new
  evaluator; actual interactions dispatch ConversationSession and GameplaySession commands.
- Shared nativeContentContract now serves Capsule, Yard and Sandbox. It preserves original
  native alias/permission identities while allowing new ordinary shared command/state entries.
  An initially overstrict command-key check was caught by contextual Save acceptance, corrected,
  and rerun successfully; adding a new command plus a scene route remains supported.
- Yard default cables now have one source in gameplay.json and pending wire edits are consumed
  by its native factory. Sandbox cables deliberately remain owned by its existing behavior
  source/tools pending the required wider controller/wiring consolidation; its native command
  binding declares no owned cables. No claim of full Sandbox Wiring completion is made.
- Sandbox pending Play assembles derived dialogue metadata from pending gameplay plus pending
  device behavior. Behavior validation accepts its exact current runtime projection only as
  input compatibility, strips it from canonical validated behavior output, and validates native
  talk references against the shared projection. Raw authored behavior contains no dialogue copy.
- check-native-conversation-actions.mts PASS: 28 immutable original node/state cases, 33
  choice/action transitions through the actual native interpreter, state/goal parity, pure
  frames, free-input/miss/retry, pending dialogue and original native save reload.
- Interior content, Sandbox content/geometry, behavior-authoring timing/security/observer and
  mounted refresh checks PASS. Behavior protected Save/reload/conflicts/undo/redo/recovery PASS
  using the canonical authored source document (rather than bundled runtime metadata).
- Contextual source Save PASS after the permission fix: paired new command/scene route,
  bundle/history/native Play, dangling-reference rejection, exact-byte undo/redo, failed
  second replacement rollback and partial-pair crash recovery. Evidence: run-4IiUXW.
- Capsule/free-text conversation, ENG-04 native behavior/security/wiring checks PASS.
  TypeScript, homepage and design-demo builds PASS. Coverage: 19 scenes, 72 documents,
  58 verified NPC bindings and two remaining legacy device dialogues (SUDS and stacks Moth).

Full objective remains ACTIVE. New browser/pixel and full editor/controller/world/network,
remaining communication/performance/cleanup acceptance is not implied by these focused checks.
No commit, push or publication.

## 2026-10-19 continuation: SUDS and source-declared native reads

- SUDS words, choices, variants and literal free-input/miss/retry settings moved from native
  devices.json into the shared gameplay conversation. Its current jacket and breaker-trip
  variants are driven by source-declared read-only native truthiness bindings.
- Added native.reads to the shared native contract and port. Read flags come from the live
  model, override stale historical saved flags, are stripped from writes, and cannot be assigned
  by shared commands. Native counters retain their existing range; no bounded duplicate numeric
  state was introduced just to test truthiness. Native read endpoints/identity are validated.
- Library's existing renewed binding moved from SceneDef.gameplayReads into native.reads.
  Removed the separate Game read/write adapter and the old SceneDef property. Library pending
  dialogue metadata now follows pending shared source, with its original terminal echo template
  explicitly authored. The room-only Test District variant continues to use its own shared graph.
- Native wire ownership is now explicit: an omitted wires field preserves the subsystem's existing
  source/defaults; an authored empty array deliberately removes defaults. The source contract
  protects that ownership boundary. Sandbox now omits wires rather than declaring an unused
  empty owner. Typed native controls display read bindings without offering nonexistent wiring
  ownership, and Library/Laundromat supply their native vocabulary to those controls.
- check-native-read-bindings.mts PASS: 104 original SUDS node/state cases and 152 choice
  transitions; counts including 2,000,001; live changes overriding stale flags; no duplicate
  saved read flags; commerce/resource isolation; free input/miss/retry; pending words; malformed
  or writable read binding rejection; read-only adapters preserving native cable ownership.
- Library/Laundromat gameplay, composition and native device parity checks PASS. Unified
  conversations, native entry-action conversations, contextual source Save, ENG-04 and Test
  District/save-isolation checks PASS. The Test District VM harness now supplies the real
  structuredClone API used by bundled native-data assembly (no production workaround).
- TypeScript, homepage/design-demo builds and public editor packaging check PASS. This is not
  fresh browser pixel/dialogue/lifecycle acceptance. One legacy device conversation remains:
  stacks/Moth, whose last node invokes the Act I end sequence.

Trace of the remaining Moth handoff: current native moth.end guards talked, sets talked and the
moth goal; sets act1:done/heard:spire/contact:moth; persists; requests the deferred act2 cutscene;
schedules departed after 1500ms on the existing model clock; requests redraw. Migrating the words
alone must not hide this sequence in another opaque content wrapper or claim G9/G11 completion.
The shared state/command and authored timeline/controller handoff still need implementation.

Goal stays ACTIVE, with full editor/controller/world/network, remaining communication, six
measured workloads and final browser/preservation/cleanup acceptance open. No publication.

## 2026-10-19 continuation: Moth conversation and authored event handoffs

- Added shared handoffs: committed events may request a registered existing cutscene and/or
  schedule system commands with authored delays. Typed editor controls expose event, cinematic,
  delay and command references. Strict validation rejects unknown cinematics/events/commands,
  missing system permission, duplicate event bindings and zero/empty delays.
- The runtime reuses SceneModel/SceneTime for delayed commands and Game's existing pendingCut
  presenter (which waits until dialogue/panels are closed). No new clock or visual timeline
  evaluator was added. SceneTime now returns cancellation handles and notifies owned cleanup
  on reset/restore; GameplaySession supports disposal-owned cleanup. Existing isolated editor
  clocks implement the corresponding cancellation handle contract.
- Moth's intercom words, choices and contextual variants moved to gameplay.json. A guarded
  shared entry command sets the original talked state, act1:done/heard:spire/contact:moth and
  the mapped moth goal. Its event requests act2 and schedules departed after 1500ms. Repeated
  final-node entry redirects to the same line without effects; the original moth.end closure
  has been removed. Pending delay edits affect actual dispatch timing.
- Derived spratFed is an explicitly registered read-only native dependency; alarms is read as
  native truthiness, preserving native counter range. Talked/departed/box position remain in
  their original native SceneSave. Read-only projected Moth dialogue metadata contains text
  and choices; authoritative entry commands/handoffs are inspected in the shared graph.
- Removed the old Panels.talk node picker, native action execution, independent retry handling
  and regular-expression input evaluator. All recorded device dialogue IDs now resolve through
  ConversationSession. Missing registered wiring fails explicitly rather than using old code.
- check-stacks-conversation.mts PASS: 312 immutable original dialogue/state cases and 256
  choice transitions; native state/goals/flags/cutscene and 1499/1500ms timing parity; pure
  frames, idempotent re-entry, old native snapshot reload, pending 2300ms delay and removed effect.
- check-gameplay-handoffs.mts PASS: actual SceneTime boundary/pause/resume, pure eligibility,
  failed-commit isolation, repeat guard, 100 clock-clear/reuse and 100 actual Model reset/restore
  cycles, disposal cancellation and strict invalid references. Pending work is bounded to 64.
- Stacks ordinary content, Capsule, SUDS/native reads, behavior-authoring, contextual source
  Save (run-AJwQ9F), native ENG-04 and Test District checks PASS around this migration. Both
  builds and TypeScript PASS after the legacy evaluator removal.
- Coverage verifier now reports zero legacy row adapters, 58 verified NPC bindings and all
  19 scene document registrations. Procedural bot reactions remain legacy and G3 is not closed
  from row counts. Runtime Downtown story/fixer and broader controller/world authoring remain.

Goal remains ACTIVE. No fresh browser/dialogue/pixel result is claimed here, and the unresolved
all-scene private Play startup issue plus full editor/controller/world/network, ENG-09, workload,
compatibility and cleanup gates remain open. No commit, push or publication.

## 2026-10-19 continuation: procedural bots and one conversation progression owner

- Extracted all 21 robot/legacy-robot voice templates (names, prompts, replies/pages) out of
  appearance.ts into engine/gameplay/bot-reactions.json. Artwork specs retain appearance/motion
  fields only. Original voice extraction is captured in fixtures/bot-reactions-baseline.json.
- withBotConversations expands templates with the existing withSceneConversations compiler;
  Game caches expanded definitions per scene. Prompts use pure voice metadata; actual bot
  interaction creates/closes the same ConversationSession used by other actors. Existing
  serial/name overrides, cycle order and text are preserved. Saved cursors initialize for old
  saves; unnamed existing actors use stable scene-slot identities pending full entity creation.
- Removed the process-local REACTED bot counter. Verified all id+talk actors in registered
  scenes already have shared bindings and removed the SAID counter/weather-text fallback too.
  There is no fallback conversation evaluator; missing actor bindings fail explicitly.
- Registered a conversations source-document kind across the editor model, bundles and source
  service. Assets -> Bot dialogue provides typed voice/name/prompt/page/reply editing and a
  production-runner preview with private progress. Pending bot source is carried into native
  private Play. Its document belongs to every Play workbench's dependency set.
- check-bot-conversations.mts PASS: 834 immutable-original prompt/name/page/seed/override
  comparisons; pure prompts/frames, cycling across save/reload, unrelated resources unchanged,
  pending source replies/prompts and malformed-source rejection. All 17 actual procedural bot
  bindings compile (Warehouse 1, Market 14, Shop 2); other robots already use authored dialogue.
- check-bot-source-save.mts PASS after source-kind integration: actual ComposerModel
  edits/undo/redo/bundle, protected Save/reload, pending Warehouse factory/robot/name/prompt/text,
  invalid-before-write and exact-byte undo/redo. Evidence: run-7eHdMf under bot-source-save.
- Unified/Market conversations (including 64 original actor paint transcripts), migration
  coverage, Test District isolation and contextual source Save checks PASS. Public packaging
  has 73 documents / 118 source references. Both builds and TypeScript PASS.
- Browser verification caught the new document being incorrectly routed as a game scene
  (Unsupported authored scene: bot-reactions). Introduced its explicit conversations kind,
  rebuilt/reloaded, and the real editor loads. Checked Assets -> Bot dialogue, original preview,
  a pending reply entering Undo history and appearing in the shared preview, then successful Undo
  returning to Published snapshot. Nothing was downloaded or saved from the browser test.
- The real built editor created a temporary Warehouse starting fixture and private Game started
  successfully. DOM-backed diagnostics report scene warehouse and
  talk.warehouse.bot.slot-3.cursor=0. Stopped Play and undid the temporary fixture; Published
  snapshot restored. This is a technical startup check, not a campaign playthrough or proof of
  the full all-scene Play batch. The earlier multi-frame startup issue remains open.
- Fresh browser native raster: 95/95 PASS, zero differing pixels/errors, immutable baseline
  unchanged. Report:
  .scene-system/all-game-pixel-check/evidence/5e7f5e816a60a9e29051a337d5a0cc4907fa1498a93e5c5dc58ad323f6acbf46-1792392985043.json
  Source: sha256:5e7f5e816a60a9e29051a337d5a0cc4907fa1498a93e5c5dc58ad323f6acbf46
  before the editor-only document-kind/tooltip fixes and this ledger update. No subsequent
  world/actor paint code changed. Raster remains sampled native initial states, not full G12.
- Both temporary browser tabs and the loopback servers on 4205/4206 were closed/stopped.
  Roadmap, authoring reference and top gate table now reflect this implementation progress;
  gates remain IN PROGRESS/NOT RUN, with no full-goal completion inferred from corpus counts.

Goal stays ACTIVE. Remaining scope includes runtime Downtown story/fixer, full controller/network/
world authoring, ordinary creation/deletion/rebinding, writable Wiring, the full Play lifecycle
batch, remaining ENG-09 and six measured workloads plus final compatibility/cleanup acceptance.
No commit, push or publication.

## 2026-10-19 continuation: feedback timing, repeat limits and recoverable history

Source-bound checkpoint: sha256:2e86798c8486c5c7c124322c4febf180f84375e694c2cdd8ef4c272c4e63a272.

- Revalidated guidance ownership: opening idle help is already suppressed when ShiftGuidance
  exists. No second replacement guidance controller was introduced for that solved path.
- Game now supplies the same readable-time clock used by status/help to each SceneHost Feedback
  presenter. Caption/ring/arrow lifetime no longer consumes menu/hidden/suspended reading time;
  simulation and artwork clocks are unchanged. Standalone presenters retain their default clock.
- Identical current/pending device replies collapse without resetting readable lifetime or
  creating pings. Latest changed text still wins during swaps. Pings are one per source, capped
  at 16, and lower-priority noise cannot evict an alert. Ring/left/right arrow representation
  follows the live target across screen edges without resetting birth time. Caption queue bounds
  remain two shown/eight waiting, with original alert preemption and lane layout preserved.
- Feedback clear resets its admission stagger, so a new scene can immediately show its first
  reply. Status capacity now includes the current notice (previously could admit 33 total).
  Help queue is bounded too. Corrected initial-time-zero preemption accounting and cancellation
  of previously seen but explicitly repeated queued help.
- Character speech and entered choice-panel response/miss/retry frames now archive their words
  to terminal history. Status/reward/system results archive too; terminal writes explicitly
  disable notification forwarding, avoiding a second notification. Failed choices, paint reads,
  and panel close do not replay dialogue history. Existing terminal's 200-line bound is retained.
- Reacquiring an already-owned scan.so does not repeat its acquisition notice/chime. Taxi fare
  and harbor denials are device feedback anchored to the taxi exit, with a source-labelled status
  fallback if no stand anchor exists. They do not create a character bubble at the player.
- Empty-board feedback now reaches the status lane plus one history entry. Open-device trace
  lock refusals identify their device and route to its caption/anchor rather than an anonymous
  terminal-only path. Existing Model act/offer refusals already retain their device context.
- check-device-feedback-timing.mts PASS against the actual Feedback presenter and a controlled
  layout: pause/readable expiry, duplicate caption/ping collapse, latest swaps, dynamic screen-edge
  transitions, 16-ping/8-wait bounds, alert priority, clear/reuse, missing anchors and exact
  status/help capacity. check-communication PASS including completed queued repeat cancellation.
- check-communication-history.mts PASS against actual Game/SceneHost/Panel methods: history
  without notification echo, one scan acquisition announcement, taxi source routing, empty-board
  visible status, trace-lock device source, entered panel/miss/retry logging and failed/closed
  frame purity. ENG-05 (64 Downtown + 2048 Harbor snapshots), native conversation actions and
  unified conversation checks PASS. TypeScript and both builds PASS (73 documents/118 references).

G1/G2 remain IN PROGRESS: this does not prove a complete shared message-envelope/log-policy/sound
facade, all producer routing, busy-screen caption behavior, remote inactive-source handling,
CONCIERGE story handoff integration, guidance/demo cases or full browser lifecycle acceptance.
Routine native signal-log filtering also needs the remaining producer/log-policy audit. Latest
world raster evidence remains the preceding 95/95 checkpoint; this batch changes approved feedback
presentation/history, not artwork or simulation, and no fresh overlay-browser comparison is claimed.
Full controller/world/network/editor/creation, Play batch, workloads and final gates remain open.
Goal stays ACTIVE. No commit, push or publication; no temporary server/tab was started this turn.


## 2026-10-19 continuation: canonical city source and pending world instances

- Extracted original city registries to world/city.json, preserving original values/order.
  createCityModel validates and isolates source instances; existing exports remain the shipping
  facade. createCityPlan and createCityMap retain original algorithms/caches inside per-world
  instances. No replacement geography or map renderer was introduced.
- City validation rejects invalid JSON/schema, duplicate scene membership, missing entrance/
  arrival references, ambiguous taxi/platform scene mappings and malformed map/discovery data.
  Protected grouped Save additionally resolves prospective scene documents and checks actual
  pending exit anchors plus land/district/frame constraints before any write.
- Registered city-source as a writable city document across model, bundle, source service and
  public packaging. Assets -> City & travel provides typed fare/duration/start/name/place-arrival
  editing. The city index/map preview consumes pending source; Game receives a private world
  model through Play and uses it for map, taxi fare, names, arrivals and quick-travel timing.
- check-city-source PASS: 26 immutable-original registry values; all 19 scene lookups; 13,824
  district knowledge/name cases; 7,752 travel refusals; exact original traced city plan and
  sampled geography; 532 original map keyboard/pointer cases; independent pending data and
  invalid source rejection. Taxi fare admission belongs to Game, not the map action emitter.
- check-city-source-save PASS: actual ComposerModel history/bundle, protected Save/reload,
  exact-byte undo/redo, pending map inspection and actual Game taxi admission with pending fare,
  invalid arrival rejection and shipping isolation. Evidence: city-source-save/run-uhFx9c.
- Existing world-map contracts, bot source Save, communication history, ENG-05, contextual source
  Save and migration coverage checks PASS. TypeScript and both builds PASS. Public editor now
  packages 74 documents / 119 source references.
- Chrome: built public editor opens City & travel; native keyboard fare edit enters pending
  history, Undo restores fare 1 and Published snapshot. Temporary edits were undone; no Save,
  download or publication. Temporary browser tabs and loopback servers were closed/stopped.
- Fresh immutable-original native raster PASS: 95 scene cases + 8 actual city-map raster cases,
  zero differing pixels/errors. Source sha256:e1f2574cc7f039f5cfff341c7ed6d8f6f38ef79e27a0ab2ad7efabc1538290b9.
  Evidence: .scene-system/all-game-pixel-check/evidence/e1f2574cc7f039f5cfff341c7ed6d8f6f38ef79e27a0ab2ad7efabc1538290b9-1792395719311.json.
  This certifies sampled native initial states/map views, not full G12 controller/HUD/save cases.

World integration remains IN PROGRESS: metro timetable/ride state still has its original singleton
owner; route/order edits are not yet exposed as a complete authoring flow. Geographic silhouettes
(coast/island/canal etc.) remain code constants. Full district geometry/membership/route creation
controls, private Play lifecycle batch, controller/network migration, creation/rebinding/Wiring,
remaining ENG-09 and all six measured workloads/final gates remain mandatory. No gate promoted
from this slice; goal ACTIVE. No commit, push or publication.


## 2026-10-19 continuation: isolated metro controller and authored timings

- createLineSystem owns ride, platform phase shifts and open-station state per Game. Existing
  transport exports remain a standalone-preview facade over the same implementation. No second
  movement evaluator was introduced. Game map state, boarding/exit prompts, movement, home ride
  and P14 level setup use the Game-owned instance.
- SceneDef.bindWorld binds existing source factories to their world/controllers once per Game.
  Metro, Galleria, Harbor station and Train renderers consume that instance. TRAIN-0's emergency
  brake/doors/derived values bind to it too, preserving their original engine effect path.
  Native Layout preview now receives pending source documents and binds the same adapters;
  timing/name edits therefore reach both ordinary preview and private Play.
- world/transport/metro.json owns platform timetable/phase offsets, ride timings/long-run factor,
  brake parameters and halt durations. Explicit validation enforces finite bounded values,
  positive braking/acceleration, known fields/stations and coherent platform loop durations.
  Assets -> City & travel offers typed fields for these settings plus station names. Registered
  transport documents use normal pending history, bundles and protected grouped Save. Public
  source packaging now contains 75 documents / 120 references.
- check-metro-sessions PASS: 11,088 original platform/train/door/queue/departure cases and 211,200
  immutable-original ride frames across all stops/open-station masks and emergency-brake times.
  Independent phase/ride/open-state mutation, pending route/name in actual station/train visuals
  and TRAIN rules, and isolated P14 setup pass. Pending first-station name initializes the sign.
- check-metro-source-save PASS: actual ComposerModel/history/bundle, protected Save/reload,
  exact-byte undo/redo, actual Game session/bound TRAIN rules, pending native phase timing,
  shipping isolation and eight invalid-before-write cases. Evidence: metro-source-save/run-d22tgd.
- City source Save, communication history, transit content, ENG-05 and public packaging checks
  PASS. TypeScript, both final-source builds, public packaging and immutable-original metro/session
  checks PASS after the first-station-name initialization fix.
- Chrome: City & travel displays the new timing/brake fields; native keyboard edit enters Undo
  and Undo restores Ride run 780. Temporary train starting fixture creates and actual private
  train Game starts successfully. Stop then Undo returns Published snapshot. No browser source
  Save/download, campaign playthrough or publication. This verifies train startup, not all-scene
  lifecycle acceptance. Temporary tabs and loopback servers stopped/closed.
- Final source-bound native raster PASS: 95 scene cases, 8 map cases, and 20 extra transit cases
  that explicitly bind per-world controllers through the new native-preview adapter. All zero
  differing pixels/errors versus immutable original. Source:
  sha256:bd810994ce0057e1f576302a14a0af6fd7c48b58a096eed1ccd5056ad28c2658.
  Report: .scene-system/all-game-pixel-check/evidence/bd810994ce0057e1f576302a14a0af6fd7c48b58a096eed1ccd5056ad28c2658-1792396435190.json.

G9 now IN PROGRESS for this controller slice, not complete. Remaining mandatory work includes
controller snapshot/restore/fixture authoring for in-flight states, full world geography/route
composition and new scene registration, other controllers/network, entity creation/rebinding,
writable Wiring, full Play lifecycle batch, remaining ENG-09, six measured workloads and final
G0-G13 compatibility/removal audit. Track/land geometry remains code; this is not full world
creation. Existing player-save shape and shipping default timing are unchanged. Goal ACTIVE.
No commit, push or publication.


## 2026-10-19 continuation: controller snapshots and authored train starting states

Checkpoint source: sha256:fdd53ad162ba4e4603d13711d05280dcf539fc1992f1d3ba70a14bf8e648a8e2.

- Metro sessions expose detached JSON capture/validated atomic restore/reset. Snapshots name their
  route order; mismatched pending routes cannot reinterpret station indexes. Validation checks
  phase/halt/door consistency, track-position/distance agreement, bounded finite values and
  platform shifts against prospective timing. Reset preserves ride/open-state object identities
  held by bound rules. Player Save/slot schema is unchanged.
- PlayFixture accepts optional metro snapshots; old fixture documents remain valid. Both editor
  history and protected grouped source Save validate snapshots against pending world/metro data.
  Four persisted train fixtures now exist: Galleria departure, approaching siding, stopped siding
  and siding doors released. Presets include running/braking/track stop as well. Each fixture
  includes the maglev pass; the solved door-release fixture includes harbor access.
- Starting-state controls can enable/remove metro override, apply presets, edit stations, phase,
  timing/distance/speed/brake/doors/announcement/platform shifts, and capture current private Play
  metro state into the fixture/history. Harbor availability remains governed by the game flag.
  Native device-state fields now appear for every scene with device data, not Sandbox alone;
  number controls support fractional native values.
- Private Game restores the validated snapshot before binding scene controllers. Diagnostics expose
  detached metro state. Private restart messages carry controller state only when retaining an
  autosave; reset/new-game and slot-load paths do not retain a stale controller or blindly
  reapply fixture state over a loaded save. Full terminal/slot browser lifecycle remains unproven.
- check-metro-snapshots PASS: 2,106 capture/restore/continued-frame comparisons, all seven train
  phases, six presets, 100 reset/restore identity cycles, detached data and 12 invalid atomic
  restores. check-metro-sessions continues PASS for 11,088 original platform cases and 211,200
  original ride frames. No movement formula or native default timing changed in this slice.
- check-metro-fixture-save PASS: actual model/history/bundle, protected Save/reload/exact-byte
  undo/redo, siding-open restore, unchanged player-save shape, old fixtures and incompatible
  prospective route rejection before writes. Evidence: metro-fixture-save/run-sLF84l.
- TypeScript, transit content, ENG-05, communication history and public packaging checks PASS.
  Both builds PASS before the final editor-only fractional-native-field/coverage ledger update;
  TypeScript/snapshot checks PASS after it. Public packaging remains 75 documents/120 references.
- Browser: built editor exposes all four train fixtures. Actual private Play restored the
  siding-open fixture: halted/siding, position 5350, doors true/open 1. Live capture enters pending
  history; Undo restores source. Reset Play starts a fresh realm and restores halted/siding,
  doors true/open 1 again. Stop succeeds. No browser source Save/download/publication.
- A terminal-input automation attempt timed out despite a visible input; no terminal command was
  entered and no terminal-reset acceptance is claimed. The parent Reset Play flow above was
  separately observed working. Temporary browser tab and own loopback server closed/stopped.

Per-scene ledger now records metro controllers and train fixture/Play/save work IN PROGRESS with
scoped evidence; no final acceptance gate is promoted. Latest raster evidence remains the prior
95 scene + 8 map + 20 bound-metro checkpoint; no fresh raster run is claimed for these snapshot/
fixture/editor changes. Full controller/world/network composition, entity creation/rebinding,
writable Wiring, all-scene Play lifecycle, ENG-09 completion, six measured workloads and final
G0-G13 compatibility/removal acceptance remain mandatory. Goal ACTIVE. No commit/push/publication.


## 2026-10-19 continuation: device sources and writable scene connections

Checkpoint: sha256:50d5e9aa1eb1af0a8b63b5b963c44c46f0d50fbe4dad152cbe1a8f2e3f0af64f.

- Nine existing device documents are registered: Capsule, Yard, Downtown, Moth, Beach, Laundromat,
  Library, Stacks and Train. They use SceneData/checkScene/registered native rules and composition
  geometry adapters, with strict finite JSON/source bounds, original controller-bound IDs/kinds,
  state types and timing/rate constraints. Original device/node/noun identity requirements are
  captured from the immutable baseline in data/device-contracts.json; newly added nouns do not
  become undeletable just because the server restarts after Save.
- Logic -> Devices offers typed existing device/noun/guard/clock/log/controller fields, state,
  tuning, texts and other existing native parameters. New STORE nouns, native read verbs, events
  and state/emit/effect/trace actions can be authored without TS edits. Registered effects are a
  selection, not arbitrary code. Original bound identities and fixed native contracts remain
  protected. Shared-bound native verb bodies direct authors to Commands & dialogue.
- Wiring -> Starting cables edits event/target/verb, adds/removes ordinary cables and retains stable
  IDs. It writes the existing owner: shared gameplay native.wires when present, else devices.json.
  Fixed conduits remain protected/read-only in this slice. Beach's duplicated raw default cable
  array was removed; data/index.ts projects the one shared gameplay source for build/runtime too.
- Pending sources feed native Layout and private Play through existing geometry projection and
  real SceneModel execution. Train world binding preserves the pending source instead of replacing
  it with shipping defaults. Shared conversation projections remain generated, never a second
  dialogue authoring owner. Native binding validation now accepts explicitly registered derived
  reads and exposes LINK/clock/watchdog endpoints needed by these connections.
- Removed hard-coded original starting-cable topology assertions from five native rule checkers.
  Structural endpoint/effect/event/tuning checks remain. Original puzzle topology is separately
  compared to the immutable baseline, rather than blocking an intentional authored connection
  change at Save/build. No shipping default cable, movement formula or puzzle outcome changed.
- check-device-source-baselines PASS for all nine source contracts and exact pending default
  projection equality with current shipping scenes; every default cable array matches the
  immutable original. Invalid zero-duration tuning and missing original local nodes are rejected.
- check-device-source-save PASS: all nine documents grouped Save -> actual scene factory reload ->
  exact-byte undo; normal model/history/bundle/source Save/reload/undo/redo; new ordinary STORE
  read/event and cable survive Train world binding. Actual SceneModel delivery is absent at 149ms
  and executes at 150ms, updating real metro doors/harbor flag/siding goal. Added noun can be
  removed after Save. Bound-ID removal, dangling endpoints and unknown effects fail before writes.
  Evidence: device-source-save/run-BxbmVF.
- TypeScript and both builds PASS; public packaging 84 documents / 120 source references. Beach
  original content/paint, native read/SUDS, native conversation actions, metro original sessions,
  contextual paired-source recovery and public packaging checks PASS. Final validator/node-ID
  hardening has TypeScript, default projection/cable checks and both builds PASS afterward.
- Chrome raster PASS at source b8d85e06c7b6c55af8384f7c27886381f120da3952e9cedd48ba1c8c93197f80:
  95 scene + 8 map + 20 bound-metro + 45 explicitly applied pending-device cases, all zero differing
  pixels/errors. Report:
  .scene-system/all-game-pixel-check/evidence/b8d85e06c7b6c55af8384f7c27886381f120da3952e9cedd48ba1c8c93197f80-1792398034112.json.
  This precedes final source-validator hardening/coverage metadata/comments; no later paint or
  simulation change. It remains sampled initial-state parity, not full G12.
- Built editor browser: train cable safety verb changed lock -> open; private Game diagnostics
  show that exact live cable and stable wired ID. Stop/Undo returns Published snapshot. Added
  STORE noun through Logic -> Devices; actual private Game lists it as usable read noun. Stop/
  Undo again restores Published snapshot. No browser source Save/download/publication. Own
  temporary tabs and loopback servers closed/stopped.

G8/G9/G10 and nine per-scene device/logic/wiring/save rows remain IN PROGRESS. Sandbox retains its
older bounded behavior authoring path; scenes with no native device data are not covered by this
new workbench yet. Full optional-field/block creation, ordinary device/entity/scene creation,
removal/rebinding of original identities, fixed-conduit authoring, all controller snapshots/hooks,
network/world authoring, all-scene Play lifecycle, ENG-09, six measured workloads and final gate/
old-save/removal acceptance remain required. This is not full device/editor completion. Goal ACTIVE.
No commit, push or publication.


## 2026-10-19 continuation: Sandbox consolidation, native block/seal creation and Events

Final checkpoint: sha256:15bdbb10d552cfb27bd7aa667a33bfcde1f6690f2dd920742342743185cccf3a.

- Sandbox is the tenth device scene in the general source/geometry/Logic/Starting cables path.
  Its document ID sandbox-behavior and legacy behavior bundle kind are retained, with one source
  descriptor/file owner. The restrictive five-handler source validator is no longer the runtime
  authoring boundary. Legacy Play calls carrying only the recognized generated dialogue metadata
  normalize that metadata away; arbitrary duplicate dialogue is still rejected. Shared dialogue
  remains generated from gameplay source. Original Sandbox source/default behavior is unchanged.
- Retired the separate Sandbox behavior Lab from the editor. Its strict S13 helpers/workbench
  moved out of game source to scripts/scene-system/legacy-s13, with historical regression imports
  updated. They still exercise the production SceneModel, but are not shipped authoring paths.
  Original S12/S13 inventory/acceptance snapshots remain historical and were not rewritten.
- Typed creation supports all eight native noun classes plus four toy guard templates, with
  optional meaningful new IDs. Four sector templates (key, guard, sequence, condition) create a
  valid content noun atomically. Noun-sector assignment and ordinary sector removal are provided.
  Existing native fields configure these blocks; LINKs can gain a known registered node. Native
  verb renaming updates its handler key atomically. State/emit/registered-effect/trace actions
  remain engine data; no new evaluator or user code execution.
- Removed Sandbox's demonstration-inventory assertions from structural rule validation. Mechanical
  pulse tuning and engine schema checks remain; exact original feature/cable/layout defaults are
  verified by the immutable baseline/default-projection checks instead of forbidding authored edits.
- Events now reads validated pending device sources for all ten device scenes. It no longer applies
  the old Sandbox subset validator. Shared device conversations are shown from actual gameplay
  nodes/choices/entry commands/redirects/literal free-input/retry, not executed legacy projection
  metadata. Starting-cable source pointers follow the actual owner (native.wires only when declared).
  This fixes wrong Stacks/native-wires pointers and stale generated dialogue-source pointers.
- check-native-blocks PASS: 160 noun/seal template x scene schema cases; actual native sense/act/
  store/daemon handlers, password guard, four toy handoffs/solve effects, key and signal-sequence
  seals, exact clock boundary/start/stop, LOG trace, LINK scan vocabulary and native-format saves.
- check-native-block-save PASS: Sandbox legacy ID/kind, one source owner, new named clock/toy/seal,
  actual model/history/bundle/Save/reload/byte undo/redo, pending Events projection, clock event +
  150ms native memo handler, invalid-before-write. Evidence: native-block-save/run-XqPSUr.
- check-device-source-save PASS expanded to all ten documents in grouped Save/factory reload/byte
  undo, plus actual TRAIN signal/flag/goal checks. Evidence: device-source-save/run-wV2Cx3.
  Sandbox immutable content/reset/timer/inventory and pending content+command+device checks PASS.
- check-event-inspector PASS: 19 scenes/10 declarative device scenes/24 compositions/6 sequences,
  3,931 nodes/3,166 edges, zero missing references; real file/JSON pointers, immutable drafts,
  captured condition semantics and model/storage/callback traps. Count checks now distinguish
  active native actions from shared replacements rather than counting inactive proxy effects.
  This is still read-only declaration inspection, not all actor/bot/story graph completion.
- Historical S13 evaluator and protected subset Save/recovery regression fixtures PASS after their
  move. General source-default projection/original cables, Demo District isolation and public
  packaging checks PASS. Final TypeScript and both builds PASS; 84 documents /120 source references.
- Browser: Sandbox -> Logic -> Devices creates named CLOCK review-clock through the new controls.
  Actual private Game exposes its start/stop verbs, tick event and stopped timer registration.
  Stop then Undo returns Published snapshot; no source Save/download/publication. Temporary own
  tabs and loopback servers closed/stopped.
- Raster checkpoint before final legacy-DTO compatibility/Events edges/coverage metadata:
  sha256:78669f5f7d6b82b58a0fb596fddd18a6627de4f5ca9769d50036f9842fdead06.
  95 native scene + 8 map + 20 bound-metro + 50 pending-device cases PASS, zero differing pixels/
  errors. Report:
  .scene-system/all-game-pixel-check/evidence/78669f5f7d6b82b58a0fb596fddd18a6627de4f5ca9769d50036f9842fdead06-1792399384204.json.
  No subsequent paint/movement/default device input change. This is sampled parity, not full G12.

G8/G9/G10/G13 and ten scene rows remain IN PROGRESS. Remaining scope includes full optional-field/
block-list controls, general device/entity/scene creation and original identity removal/rebinding,
full actor/bot/story Events graph, broader controller snapshots/hooks and network/world authoring,
all-scene private Play lifecycle, remaining ENG-09, six measured workloads and final compatibility/
removal audit. Native templates and Sandbox consolidation do not certify full editor coverage.
Goal ACTIVE. No commit, push or publication.


## 2026-10-19 continuation: ordinary manifest content and standalone actors

Final source checkpoint: sha256:b1bebb088c42247744742aea336d91f9766c677e9bfeebcb4f49431491b64a6e.

- Manifest version 1 remains compatible with its original interaction-only documents. Optional
  people/readables/rests/exits maps bind every authored entry exactly once to the composition.
  The shared factory now builds their native interaction metadata, shared persistent character
  conversations and authored story-minute progression. Default response heights and pilot artwork
  remain unchanged. Engine/transport exits require a controller; unknown destination scenes/arrival
  anchors and undeclared exit-set flags are rejected. Pending destination identities are resolved
  from the entire prospective authored source snapshot, using one shared helper.
- Added standalone character.resident artwork around the existing seeded character/robot/animal
  renderer. Typed body kind/seed/activity/pixel-size/brightness fields reuse current animation and
  lighting. A bounded appearance cache retains renderer identity across frames. Existing scene
  actor art is untouched; full appearance overrides, schedules and moving actors remain future work.
- Scene Logic has typed add/remove/rebind controls for these ordinary manifest groups, plus resting
  place kind and typed exit destinations/arrivals. Content removal keeps artwork; removing an
  interaction also removes its objective attention target. Native scene content contracts continue
  to protect their original identities pending migration, including the new rests field.
- Corrected manifest composition-to-workbench selection aliases: selecting demo-manifest now opens
  scene-centered Logic/Commands/Play instead of claiming its content is code-only. Private Play
  retains the existing isolated Shop role. Native preview adapters can resolve pending content
  before construction, so removing/rebinding original artwork does not evaluate old default refs.
- Expanded check-manifest-pilot PASS: native actor position/appearance/conversation cursor across
  sessions, readable/rest/exit positions, story-minute, ordinary addition/removal, objective outcome,
  duplicate/reserved IDs, missing/wrong/extraneous bindings, unknown exit destinations/arrivals,
  whole-model atomic rejection, history/bundle/protected Save/reload/undo and unchanged campaign
  registry. Bot conversations (834 original comparisons), interior content (10 original cases),
  Events/source pointers (19 scenes, zero missing references), TypeScript and both builds PASS.
  Public packaging remains 84 documents /120 source references; check-public-editor-build PASS,
  evidence public-editor-build-check/run-u9ZL7R.
- Chrome built editor: added readable review-notice through Logic, added/placed a loader through
  Layout and bound review-loader dialogue through Logic. Scene-mode private Play starts the actual
  Game at X320 and exposes talk.shop.review-loader.cursor in shared state. Stop then rebind and
  delete the original checkpoint artwork succeeds without preview errors. Undo restores all ten
  disposable edits to Published snapshot. No browser source Save, download or publication.
  Browser keyboard dialogue advancement was not conclusively established from inspected frames;
  native ConversationSession progression is verified by the automated integration test instead.
- Final native baseline raster PASS: 95 scene +8 map +20 bound-metro +50 pending-device cases,
  zero differing pixels/errors. Report:
  .scene-system/all-game-pixel-check/evidence/b1bebb088c42247744742aea336d91f9766c677e9bfeebcb4f49431491b64a6e-1792401088193.json.
  New build-manifest-actor-check independently compares declaredScene drawing with the original
  drawReviewRoom + drawCharacter call: 25 body kinds x4 activities x2 heights x3 animation frames
  =600 browser raster cases, zero differing pixels/errors, same final source checkpoint.
  Summary evidence: .scene-system/manifest-actor-check/2026-10-19-summary.json.
- An accidental repository-root tsc invocation emitted sibling JS/MJS artifacts and failed on
  unrelated workspace configuration. Removed only its 647 untracked emitted files, verified by
  workspace path, corresponding TS/MTS sources and the invocation timestamp window. No tracked
  JS/MJS changes. Correct package-scoped TypeScript and both builds subsequently pass.

G8/G10/G12/G13 remain IN PROGRESS; this foundation does not certify any complete native-scene row.
Next: use the creation/binding model to migrate native ordinary entities and add dynamic ordinary
scene registration/source ownership without TypeScript edits. Unit scale/normal depth/right-facing
interactive bindings, isolated pilot role and review-room default remain explicit current limits.
Remaining original scope includes specialized controllers/world/network/Events, all-scene lifecycle,
ENG-09, six measured workloads, full old-save/outcome/HUD compatibility and legacy-path removal.
Goal ACTIVE. No commit, push or publication.


## 2026-10-19 continuation: source-owned scene creation and pending world registries

Code/browser checkpoint: sha256:a3dea81faf644fedc98464fb2fcb501ed74f99e110ca1d1063fed5ce2ccc88d2.
The per-scene play evidence metadata was updated afterward; no subsequent paint, simulation or default
source-content change. G0–G13 remain IN PROGRESS except G6 NOT RUN.

- Added empty scenes/authored.json catalogue, validated through the same declared scene/gameplay/art
  contracts. A single source owner supports new scene creation/removal without filesystem paths or
  individual TypeScript entries. Rejects native-ID shadowing, duplicate IDs, unknown destinations/
  arrivals and native-controller metadata in ordinary scenes. createSceneRegistry makes independent
  registries; shipping SCENES remains the original 19 while the catalogue is empty. SceneId now also
  supports validated dynamic IDs. Game lookup/start/resume/travel recognizes its private registry.
- ComposerModel supports registered document projections. Authored composition/scene/gameplay documents
  use normal Layout/Logic editing while only their catalogue owner enters Save/bundles/history. A
  projected edit cannot rename its composition identity. Grouped imports cannot mix a source owner
  and its children. Saved revisions remain owner metadata; logical dirty state, Undo/Redo, removal
  of a selected projection and first-class grouped workbench edits are handled atomically.
- Assets -> Scenes creates a scene, default starting fixture and membership in an existing city place
  in one transaction. Removal removes those together; incoming routes and city-start/entrance references
  must be reassigned first. Typed ordinary content and Commands & dialogue reuse their existing editors.
  New scene previews use the generic declared factory; no new procedural drawing path was added.
- Pending registry assembly now builds all 19 existing native scene snapshots plus catalogue rooms.
  Private Play, fixture IDs/bounds, city construction, arrival validation and world snapshot/map
  inspection share it. Authoring map validation accepts the prospective registry rather than only
  shipping globals. Existing transport and source validation use that same prospective world.
  New rooms start with their own scene IDs; the old manifest pilot keeps its isolated Shop role.
  Empty ordinary arrival text no longer creates an empty player bubble.
- check-scene-catalogue PASS: two connected new rooms, actual Game registry lookup, projected layout/
  logic edits, complete 21-scene pending registry/world index, original world-place membership,
  prospective starting fixture, atomic history/portable bundle/grouped protected Save/reload/exact-byte
  Undo, native-shadow/duplicate/dangling-route/mixed-owner rejection. Evidence: scene-catalogue-check/
  run-EaKeld (before final Play-context-only correction); final rerun recorded below when complete.
- Composer model and public bundle regression checks PASS; original world/map contract (19 scenes,
  17 places, 14 invalid references, 37 callbacks) PASS. Generic authoring Save/security regression
  initially hit sandbox EPERM creating its junction escape fixture; authorized unsandboxed retry PASS
  for conflict, rollback, concurrent outside-edit recovery, crash recovery, path allowlist and local
  authenticated HTTP. No weakening/skipping of the junction assertion.
- Built editor Chrome: Assets -> Scenes creates review-room with its starting fixture and Downtown
  membership in one edit. Its native Game starts at X120, saves scene=review-room and has no empty
  arrival bubble. Map inspector selects Downtown and exposes Open review-room. Earlier iteration
  also verified ordinary interaction creation and atomic scene removal/Undo; final automated source
  checks verify the world-inclusive ownership. No source Save/download/publication in the browser.
- Final browser regression with that pending room present: all 19 original scenes start through the
  actual editor, report their correct scene/save IDs, and Stop removes each iframe. Report:
  .scene-system/scene-catalogue-check/2026-10-19-private-play-summary.json. This supersedes the older
  6-PASS/13-observation-timeout batch for startup/disposal only. It does not prove all Reset/restore/
  save-slot/controller/event-disposal/puzzle/HUD lifecycle cases; per-scene play rows stay IN PROGRESS.
- Raster at the code checkpoint: 95 original scene +8 map +20 bound-metro +50 pending-device cases
  PASS, zero differing pixels/errors. Report:
  .scene-system/all-game-pixel-check/evidence/a3dea81faf644fedc98464fb2fcb501ed74f99e110ca1d1063fed5ce2ccc88d2-1792403151469.json.
  All 600 authored actor/native renderer comparisons also PASS, zero differing pixels/errors, same
  source checkpoint. These remain sampled parity, not the complete G12 state/actor/HUD/save audit.
- Both builds and TypeScript pass at the corrected world-registry checkpoint. Public packaging is
  now 85 source documents /121 source references. Latest final build/packaging checks are recorded
  below after completion. Existing shipping catalogue/default city/fixture content was not changed.

Remaining: migrate original native entity identities and content closures to this editable model;
full actor appearance/scheduling and environment composition; controller/security/ambient/story hooks;
complete Wiring/network/world creation; shared Events graph; ENG-09; six measured workloads; full
old-save/outcome/HUD/lifecycle parity and replaced-path removal. Current ordinary scenes retain the
review-room interior default and unit-scale/normal-depth/right-facing interactive binding limits.
This is not all-19-scene authoring completion. Goal ACTIVE. No commit, push or publication.


Final verification for the catalogue continuation:

- Final source (including per-scene play evidence metadata):
  sha256:0c8bc2fa6950a1daebeadb872c968efe50e3927d1ef31cc2e543558bbd0c6219.
- check-scene-catalogue final PASS: scene-catalogue-check/run-er0iiC. Includes prospective city
  membership and the full 21-scene world index, plus grouped catalogue/city/fixture Save and Undo.
- Source authoring PASS for all 85 real documents; composer-model/public-bundle original regressions
  PASS; manifest content/native persistent dialogue PASS; city source Save and metro fixture Save
  PASS (city-source-save/run-cOrP7Q and metro-fixture-save/run-CI0tNq).
- Final TypeScript, homepage and design-demo builds PASS. Public editor packaging PASS at
  public-editor-build-check/run-OhHZfG: 85 documents /121 source references, no source changes or
  journal creation. Final editor app app-VXPGZXZE.js; native Play bundle play-PHVRC4NV.js is the
  same Game bundle exercised by the 19-scene browser batch (the editor's generated frame URL changes
  with source/evidence metadata, not Game behavior).
- Repeated preservation checks after evidence metadata update: all 173 original native/map/metro/
  pending-device cases and all 600 actor cases PASS, zero differing pixels/errors, final source.
  Native report: .scene-system/all-game-pixel-check/evidence/
  0c8bc2fa6950a1daebeadb872c968efe50e3927d1ef31cc2e543558bbd0c6219-1792403362181.json.
  Actor summary: .scene-system/scene-catalogue-check/2026-10-19-actor-summary.json.
- Browser final world-aware run verifies Downtown membership/map navigation, own runtime/save ID and
  empty-arrival behavior for review-room, followed by all 19 native startup/disposal cases. Undo
  restores all 14 disposable source/fixture/city edits to Published snapshot; no source Save/download
  or publication. Temporary own browser tabs and loopback services are closed/stopped afterward.

No broad gate is promoted to PASS by this slice. Full original native scene/content/controller
migration and remaining G0–G13 acceptance still apply. Goal ACTIVE; no commit/push/publication.


## 2026-10-19 continuation: first native ordinary-content manifest migration (Shop)

Final source checkpoint: sha256:f2aaadfc054dbbc8653636f3facbac24f028e5d3067b5c23f244d1f620cb3623.

- Extended the existing manifest contract, rather than introducing another content system: targets
  support registered artwork anchors, finite offsets and text heights; width can reference a numeric
  artwork property. Original string/number manifests remain valid. The shared geometry/content
  compiler now serves catalogue scenes and the native Corner Shop. It emits native interactions,
  readables, rests, exits, objectives and story minutes from the same source bindings.
- Shop scene.json now owns its width/spawn/use/readable/rest/exit bindings. Vending uses a registered
  size-derived use anchor (width/2,height). Removed Shop's inline ordinary base definitions and its
  per-ID position/height calculations. Native character templates/rendering and their required actor/
  structural artwork dependencies remain registered code and are not claimed migrated.
- Typed Content & bindings controls expose anchors, horizontal/height offsets and applicable text
  heights. Shop supports creating/removing/rebinding ordinary uses/readables/rests/exits. Width follows
  the wall's Layout property. Ordinary till/limit/vending/door/spawn identities are no longer blanket
  composition requirements; real pending content references and incoming route anchors protect them.
  Retained wall/counter/window-back and native actor dependencies remain necessary for current code.
- Shop gameplay uses the shared compatibility contract with explicitly extended vocabulary/content:
  original command permissions/state identity/rotation/goods and single purchase owner remain protected;
  new shared flags/events/state/commands/conversations can be authored. Legacy Shop scene documents
  without manifests inherit canonical bindings, with no second legacy geometry evaluator.
- Shop's native preview resolves pending content before construction. Browser deletion exposed a
  fixture-bounds validator that still constructed shipping content; replaced that shortcut with the
  complete pending registry. Added whole-model/removal-Save regressions for the exact failure.
  Shared scene registry validation now rejects dangling native as well as catalogue exit destinations.
- A Shop artwork source uses legacy encoding. Its anchor addition was an ASCII byte replacement;
  existing bytes/text were preserved. No artwork was redrawn or recolored.
- Immutable original Shop metadata hash remains 8ce90de2a8c785f8acde1d78c86d038bf19a3af76913208321ab72de7b5497de.
  The checker now hashes that unchanged frozen reference and compares current metadata structurally,
  ignoring only object-key insertion order introduced by generic projection. Every actor property,
  readable/exit coordinate/height and use/price field still compares. Original paint-operation checks
  at four camera/time/light/viewport cases PASS. No expected baseline was replaced.
- check-shop-gameplay PASS: 12 purchases across recreated factories, 36 failed attempts with no
  resource/cursor mutation, original actor/prompt/geometry preservation and old permission protection.
  check-shop-manifest-save PASS: added use/readable/rest/exit, purchase rebind, removed original use/
  readable/till/limit artwork, shared command/event/objective, width and size-derived anchor geometry,
  legacy source input, atomic history/bundle/grouped protected Save/native reload/exact-byte Undo and
  invalid references before writes. Final evidence: shop-manifest-save/run-a4HQg0; prior full removal
  run shop-manifest-save/run-xSA4vR. Catalogue regression PASS: scene-catalogue-check/run-l4skD9.
- Bot conversations (834 original comparisons), native read/SUDS bindings (104 original cases plus
  152 transitions), Test District, Events (19 scenes, zero missing pointers), composer model and public
  bundle regressions PASS. TypeScript and both builds PASS. Public packaging PASS at
  public-editor-build-check/run-L3dGyn: 85 documents /121 source references; no source/journal writes.
- Built editor browser: added review-action on the native counter, rebound buy from till to counter,
  deleted old till artwork, and ran the actual private Shop Game. Both interactions are eligible;
  shop.goods quote=1 and charge=1. Stop plus Undo restores all three disposable edits to Published
  snapshot. No browser source Save/download/publication. Initial Undo observation timed out during
  raster load; inspecting the existing tab confirmed it had committed, then the two remaining edits
  were undone. No Game restart or baseline reset was used to hide that observation timeout.
- Final raster: 95 original scene +8 map +20 bound-metro +50 pending-device cases PASS, zero differing
  pixels/errors. Report:
  .scene-system/all-game-pixel-check/evidence/f2aaadfc054dbbc8653636f3facbac24f028e5d3067b5c23f244d1f620cb3623-1792405174349.json.
  All 600 authored actor/native renderer comparisons also PASS, same source, zero differing pixels/
  errors. Summary: .scene-system/shop-manifest-save/2026-10-19-browser-summary.json.

Shop content/layout/logic/save/cleanup rows are IN PROGRESS, with this scoped evidence; no broad gate
is marked complete. Remaining native Shop actor appearance/scheduling/controllers, full optional-field
and graph authoring, other scene migrations, ENG-09, six measured workloads and final full old-save/
state/HUD/outcome/lifecycle/removal acceptance remain required. Goal ACTIVE. No commit/push/publication.


## 2026-10-19 continuation: native Shop actor source

Source checkpoint: sha256:16c421dcade3ec4581419591ef0deae06c58bcb05c81d3f90e5a03db07549dfb.

- Added shared validated ActorDefinition/compileActors: composition owns position, relative travel
  endpoints follow artwork movement, and the existing Character renderer/behavior owns animation.
  Actor body data supports seeded human/animal/robot appearance, native actions, motion, following,
  time/day windows and presentation settings. Dialogue remains in the existing scene people source.
  No second animation, clock, conversation or behavior runner.
- Moved all nine Shop bodies from index.ts into scene.json, removed the now-unused Shop-specific
  placement binder, and wired pending preview/native Game through the shared compiler. Older source
  bundles inherit canonical defaults. The initial migration protects actor IDs/order/target/band and
  original composition dependencies; add/remove/rebind and clipping/controller authoring remain open.
- Typed Logic actor controls expose appearance/extras/colors, robot variant/wear/face, actions,
  speed/ranges, following/gap, facing, height/pixel size/dimming/parallax and city-clock schedules.
  Private Play diagnostics expose detached actual world actor bodies and schedule visibility, only
  inside editor Play. No player save format or shipping render behavior changed.
- check-shop-actors PASS: 22 invalid-definition cases, protected identity/order, relative movement,
  human/robot edits, native follow links, day/night/day-filter visibility, missing artwork rejection
  and old scene-source defaults. Existing Shop gameplay/immutable metadata and four original paint-
  command comparisons PASS; bot conversation regression still passes all 834 comparisons and the
  original two Shop bot keys. No frozen reference or expected hash was changed.
- Extended the actual manifest Save regression with appearance/speed/schedule edits, native reload,
  bundle/history, grouped protected source Save and exact-byte Undo. PASS evidence:
  .scene-system/shop-manifest-save/run-PEaIlP (prior unchanged regression run-jVQ1Ud).
- TypeScript and both builds PASS. Public editor packaging PASS at
  .scene-system/public-editor-build-check/run-aQ9VUA: 85 documents /121 references, no source/journal
  writes. Built app-Q4HPTW37.js and private play-KUKZ2YXP.js.
- Actual built browser: set browser actor body=wide and schedule=18:00–06:00; private Game inspect
  confirms edited body, original range/speed/seed and visible=false at minute580. Both original
  bot.slot-4 and bot.slot-6 keys remain present. Stop plus two Undo operations restores Published
  snapshot. No source Save/download/publication; console errors empty. Summary:
  .scene-system/shop-manifest-save/2026-10-19-actor-source-browser.json.
- Immutable-vs-current raster PASS: 95 original scenes +8 map +20 metro +50 pending-device cases,
  zero differing pixels/errors, same final source. Evidence:
  .scene-system/all-game-pixel-check/evidence/
  16c421dcade3ec4581419591ef0deae06c58bcb05c81d3f90e5a03db07549dfb-1792406406809.json.
  The initial browser observation timed out during rasterization; the same live tab completed PASS
  and its archived report was inspected. It was not restarted. Disposable tabs/services stopped.

No broad gate is promoted to PASS. Full actor creation/removal, remaining native scenes/controllers,
ENG-09, six measured workloads and full G0–G13 acceptance remain required. Goal ACTIVE. No commit,
push or publication. A general diff check still reports a pre-existing trailing blank line in
unrelated authoring/gameplay-scenes.ts; changed slice type/build/targeted checks pass.


## 2026-10-19 continuation: second native actor migration (Library)

Final source checkpoint: sha256:a15b4c4bd781998ed28ff19974e6579720111ef35367e4a58db1d19ed8992f08.

- Reused the same actor schema/compiler and typed controls for eight Library actors. Removed the
  inline body definitions from scene.ts and its separate bindLibraryActors placement evaluator.
  Furniture attachments, seated heights, SHELF-E relative movement, names/talk/hint mark and actor
  order remain exact. Older scene documents inherit canonical actor defaults only when omitted;
  explicit null/invalid actor content is rejected. Shop uses the same identity protection helper.
- Library dialogue presentation merges construct final actor objects; following links now rebind to
  those exact live objects after the merge. This affects newly authored follow links; shipping actors
  have none. No second movement/schedule renderer was added.
- check-library/check-library-gameplay PASS for original metadata/content/geometry/devices, original
  dialogue pages, shared saved progress, pure chair interactions, pending dialogue and prepared hint
  marks. Updated the stale older test that still called the removed transient chatter API; it now
  tests the approved persistent shared conversation behavior against the same original page fixture.
  Native read/SUDS regression PASS (104 original cases, 152 transitions); Shop actor/metadata/paint
  regressions remain PASS. Bot corpus remains 834 original comparisons PASS, 17 original bindings.
- check-native-actor-save PASS: attached chair moves resident, edited human/robot looks, movement,
  schedule, following, legacy omission defaults, invalid actor rejection, grouped history/bundle/
  protected source Save/native reload/exact-byte Undo. Final evidence:
  .scene-system/native-actor-save/run-deTAJf; prior full pass run-bRSh9j. The first harness attempt
  redundantly validated the whole project per document; it was stopped, its validation hook corrected
  to the existing single-owner pattern, and the corrected full scenarios passed. No failure was
  hidden through a baseline change.
- Final TypeScript/homepage/design-demo builds PASS. Public packaging PASS at
  .scene-system/public-editor-build-check/run-wurEsJ: 85 documents /121 source references, source
  documents untouched and no journal creation. Built app-CYWLILGC.js /play-5M6CEELR.js.
- Actual built editor: changed knitter garb to coat and schedule to18:00–06:00; private native Game
  diagnostics confirm changed body, original seed7105/x744/h12/sit/facing1 and visible=false at the
  daytime fixture. Stop plus two Undo restores Published snapshot, no browser console errors, no
  source Save/download/publication. Summary:
  .scene-system/native-actor-save/2026-10-19-library-browser.json.
- Final immutable raster PASS: 95 original scene +8 map +20 metro +50 pending-device comparisons,
  zero differing pixels/errors, final source. Report:
  .scene-system/all-game-pixel-check/evidence/
  a15b4c4bd781998ed28ff19974e6579720111ef35367e4a58db1d19ed8992f08-1792406907172.json.
  An observation timeout occurred during raster load; the same run completed PASS and its archived
  JSON plus live title were inspected. No restart. Disposable browser tabs/services are closed.

Shared source body authoring now covers 17 native actors across Shop and Library. This is partial
all-game progress: native entity/controller migrations, actor creation/removal/rebinding, remaining
scenes, full graph/network/world tools, ENG-09, six performance workloads and full G0–G13 acceptance
remain open. Goal ACTIVE. No commit/push/publication. Changed slice diff checks pass.


## 2026-10-19 continuation: native Library ordinary-content manifest

Final source checkpoint: sha256:7f8cd4b6759703598a87b019747e6bb3410dc55019151b7c61b0b2085e4a4619.

- Library now compiles width/spawn/use/readable/rest/exit content with the same manifest compiler as
  Shop/catalogue scenes. Terminal3 binds its existing seat anchor plus offsets, preserving its exact
  original x/prompt height while following authored seat-offset changes. Removed inline baseLibrary,
  per-ID readable/use/exit geometry and the unused legacy Library layout projection/exports. Artwork
  and existing native LAN/rules/controllers were not redrawn or redesigned.
- Typed Content & bindings supports ordinary add/remove/rebind. Original notice/book/chair4/door/
  spawn artwork identities are no longer blanket required; pending content references and incoming
  destinations protect live bindings. Room, device and original actor/controller dependencies remain
  protected. The native preview adapter constructs from the real pending scene/gameplay before it
  validates geometry, so deleting rebound artwork works without a shipping-default shortcut.
- Library permits new shared gameplay vocabulary/content while retaining original native ownership,
  catalog projection permissions and actor identity/order. New command/event/objective/story-time
  content compiles through the existing shared runtime. Shared inheritSceneDefaults now owns the
  backward-compatible actor/manifest omission migration for both Shop and Library; new IDs require
  explicit bindings. Invalid supplied fields are not replaced by defaults.
- Manifest scenes gain typed Goals & time creation/removal for objectives and story-clock milestones,
  using one unconditional final fallback. Dedicated existing detail forms edit conditions/text/target/
  minutes. Arrival can enable separate touch pages. Creation/removal is exercised with the actual
  Library command/objective compilation and protected Save, rather than UI-only model snapshots.
- check-library-manifest-save PASS: new use/readable/rest/exit, original chair rebind, Terminal3 anchor
  and seat-offset change, width, shared flag/event/command/objective/time, removal of original notice/
  book plus old notice/reference-book/chair4/door/spawn artwork after rebinding. Real ComposerModel,
  pending native registry, bundle/history, grouped protected Save/native reload/exact-byte Undo and
  atomic invalid-reference rejection. Final evidence: library-manifest-save/run-cXC6uh; prior full
  runs cLygTm and QI9x7h. Shared-defaults Shop Save regression PASS: shop-manifest-save/run-ZvXHC2.
- Library original metadata/content/geometry/device/shared dialogue checks PASS; no original fixture
  changed. Tests formerly asserting the pilot’s fixed content/time/command restrictions now assert
  invalid bindings/negative minutes/missing native flags and allow the intentionally expanded shared
  authoring surface. Native read/SUDS PASS (104 original cases,152 transitions). Actor Save regression
  PASS at native-actor-save/run-W0iyeV. Shop actor/metadata/paint regressions PASS.
- TypeScript, homepage and design-demo builds PASS. Public packaging PASS at
  public-editor-build-check/run-EyvoF1: 85 documents/121 source references, no source/journal writes.
  Events regression PASS:3931 nodes/3166 edges,19 scenes,zero missing pointers; full actor/controller
  graph authoring still remains separate acceptance work.
- Actual built editor: rebound chair use to radiator, added a goal and clock milestone, deleted
  armchair4 artwork; private native Game starts Library, reports objective New objective,minute580
  and chair eligibility. Stop plus four Undo operations restores Published snapshot; no console
  errors/source Save/download/publication. Summary:
  .scene-system/library-manifest-save/2026-10-19-browser-summary.json.
- Final raster PASS:95 original scene+8 map+20 metro+50 pending-device comparisons,zero differing
  pixels/errors,same source. Evidence:
  .scene-system/all-game-pixel-check/evidence/
  7f8cd4b6759703598a87b019747e6bb3410dc55019151b7c61b0b2085e4a4619-1792407481269.json.

No broad gate is promoted to PASS. Other native scene migrations, actor creation/removal/rebinding,
remaining controller/network/world/graph work,ENG-09,six measured workloads and final G0–G13
acceptance remain open. Goal ACTIVE. No commit/push/publication. Changed slice diff checks pass.

Final registry regression PASS: scene-catalogue-check/run-eEfos5 (connected scenes, independent
registries, actual Game lookup, projected edits, atomic history/bundle/source Save/reload/byte Undo
and invalid graph/collision rejection). Agent-created browser tabs and loopback services closed.


## 2026-10-19 continuation: native Laundromat actors and ordinary content

Final source checkpoint: sha256:200c32d77e573525f9a10d0dc47f9986be99d0706947f29deafbd850e134bcb8.

- Moved all eight native Laundromat bodies, including three outside walkers, into scene.json and the
  existing shared actor compiler. Removed inline bodies, the separate actor binder, legacy layout/
  width exports and the render-actor stitching helper. Dialogue remains shared scene content; the
  same final actor objects supply native interactions and painting, including authored follow links.
- Ordinary width/spawn/use/readable/rest/exit geometry now uses the shared manifest compiler. Removed
  baseLaundromat and per-ID ordinary geometry/height calculations. Default metadata, heights, prices,
  actor order and both rule/device simulation owners remain unchanged. New shared flags/events/
  commands/state/conversations/objectives/time are authorable while original soap purchase command,
  native mappings, SUDS projection permissions and original actor identities/order remain protected.
- Native pending preview uses prospective scene/gameplay before construction. Optional old soap/
  notice/sock/door/spawn markers can be removed once content/attachments are rebound. Required room,
  window/device/washer/actor/controller IDs and artwork types remain protected. Washer simulation,
  snapshot preparation and their full lifecycle/controller-authoring migration remain open.
- Added trusted registered Element.bindingIdentity=presentation for visual consumers without instance-
  owned simulation state. Laundromat snapshot elements declare it. Shared update protection allows
  their deletion, while retained bound instances keep exact type/bindings. Both ComposerModel entry
  points, source Save and actual Layout Delete/Duplicate use the same rule. Duplicated artwork does
  not create a second device. Source input cannot grant this permission; the registry owns it.
- check-laundromat-manifest-save PASS: actor look/schedule/follow, use/readable/rest/exit additions,
  rebind, objectives/time/shared commands/events, original content/art removal and source omission
  compatibility; actual ComposerModel remove/duplicate, no duplicated devices, history/bundle/grouped
  protected Save/native reload/exact-byte Undo. Rejects missing refs, required washer removal/type
  replacement, retained binding substitution and forged document permission; source rejection is
  atomic. Final evidence: laundromat-manifest-save/run-0z7UnO; prior H8ejIm and USu7jN.
- Original frozen source metadata comparisons PASS for people/readables/exits/width/spawn/facing.
  Existing gameplay checks PASS:75 original purchase boundaries/repeats plus reload/unrelated resource
  preservation. Composition checks PASS:52-instance roundtrip, device geometry, washer/note and bench/
  resident attachments, native snapshot/clip. Native read/SUDS PASS:104 original cases/152 transitions.
  All10 device-source projections and immutable original cables PASS. ComposerModel regression PASS.
- Browser found an additional Delete-button blanket guard despite passing grouped import/Save; fixed
  it and added direct ComposerModel remove/duplicate coverage. Actual edited browser subsequently
  deletes soap artwork after rebind, changes gran garb/schedule and runs native Game:seed6102,x706,h10,
  sit/facing-1,garb=dress,visible=false during daytime; soap quote=charge=1 and interaction eligible.
  Stop plus four Undo restores Published snapshot; successful run console errors empty.
- Initial browser Play attempt reached the host’s terminal15s timeout and its frame was removed.
  Exact underlying cause is unconfirmed. Rebuilt default/edited runs succeeded. Improved lifecycle
  reporting independently: bootstrap/runtime errors are forwarded before module initialization; the
  loading watchdog now keeps a pending frame alive after15s with a waiting status instead of treating
  delay as failure. Final real18s script-delay fixture observes waiting with one frame, eventual
  native Laundromat Play on that same frame, and zero frames after Stop. A separate injected early
  module failure reports sandbox-redacted Script error. and disposes the frame. Observer selector
  deadlines did not trigger restarts; the same delayed/error runs were inspected to completion.
- Final TypeScript/homepage/design-demo builds PASS. Public packaging PASS at
  public-editor-build-check/run-UqnDI7:85 documents/121 references,no source/journal writes. Final app
  app-CTBWUYLG.js,private runtime play-PZNQ5SUV.js. Edited source browser run used app-KQQT57XL.js
  with that same Play runtime; the final app’s additional loading-status policy was separately tested
  by both lifecycle fixtures. Events regression:3931nodes/3166edges,19scenes,zero missing pointers.
- Final frozen raster PASS:95 original scene+8map+20metro+50pending-device comparisons,zero differing
  pixels/errors,final source. Report:
  .scene-system/all-game-pixel-check/evidence/
  200c32d77e573525f9a10d0dc47f9986be99d0706947f29deafbd850e134bcb8-1792408681451.json.
  Browser/lifecycle summary:.scene-system/laundromat-manifest-save/2026-10-19-browser-summary.json.

Shared body authoring now covers25 native actors across three scenes; ordinary content manifests now
cover Shop,Library,Laundromat in addition to ordinary catalogue scenes. This does not complete those
scenes or any broad G0–G13 gate. Actor creation/removal/rebinding,remaining native migrations/full
controllers/world/network/graph,ENG-09,six measured workloads and final compatibility/lifecycle audit
remain open. Goal ACTIVE. No commit/push/publication. Changed slice diff checks pass.

All disposable browser tabs and all four agent-owned loopback services were closed after verification.


## 2026-10-19 continuation: native Warehouse actors and ordinary content

Final source checkpoint: sha256:975380306f694f1fa74c220b495ca3dc21f6cb3b530f06134e2328037c715ee9.

- Warehouse’s four actor bodies now live in scene.json and use the shared compiler. Removed inline
  body templates and per-factory actor placement/range copies. The runtime/rendering path uses the
  same final objects and shared conversation bindings, preserving the original mech’s slot3 save key.
- Added compileSceneActors and reused it in Shop,Library,Laundromat,Warehouse, removing four bespoke
  actor/dialogue merging implementations and separate per-scene conversation-binding loops. Follow
  links remain attached to the exact actors used for interaction and native preparation.
- Ordinary width/spawn/use/readable/rest/exit data now uses shared manifests. Removed baseWarehouse,
  per-ID ordinary geometry/height calculations and the old shipping layout projection. The latter
  lives only as warehouse-layout-fixture.mts for the immutable old paint-function comparison; no
  shipping/editor module imports it. Original light/caster helpers, wall-based shading and ambient
  setup remain registered native presentation code; full environment/controller authoring is open.
- Native validators now require only current scene/wall/dock/van/actor dependencies; ordinary artwork
  and content can be removed/rebound, with pending cross-reference and attachment validation. Pending
  preview constructs from prospective scene/gameplay before checking geometry. Typed actor/content/
  milestone controls are available; actor IDs/order/targets remain protected in this migration slice.
- Added an explicit shared manifest responseAboveFloor policy, with typed checkbox and source schema.
  Numeric response height is required; floor-level bindings omit the override, elevated bindings add
  the offset. Warehouse’s door stores offset0 with this policy, preserving absent h at floor level and
  h=door elevation when moved upward. Readable/exit default heights remain unchanged. Existing numeric
  bindings keep their original semantics. Invalid marker/missing height combinations reject atomically.
- check-warehouse PASS:36 exact command transcripts,43 original instances, source metadata, lights/
  casters and attached geometry, including door response h10 when raised10 and undefined at ground.
  Its older fake View was missing the current required illumination context; updated that test fixture
  to frameView for both comparison paths. No original source body/expected metadata was replaced.
- check-warehouse-content PASS: original geometry/readables/door, shared saved dialogue/pending edits
  and four frozen-source paint comparisons. Existing Shop/Library/Laundromat metadata/purchase/dialogue
  checks PASS after the common actor-binding refactor. Bot corpus PASS:834 original comparisons and
  all17 original bindings. Native read/SUDS PASS:104 original cases/152 transitions. ComposerModel and
  Shop actor malformed-source/follow/schedule regressions PASS.
- check-warehouse-manifest-save PASS: added/rebound/removed ordinary content, new shared commands/
  flags/events/objectives/time, actor appearance/schedule/follow, wall shadow, width and conditional
  response heights, original plaque/shoe/exit/spawn art removal after rebind, legacy omissions,
  history/bundle/grouped protected Save/native reload/exact-byte Undo. Required wall deletion/type
  changes and invalid references reject atomically. Final evidence:warehouse-manifest-save/run-5IF4yo;
  prior full run7qEvCg. No baseline was updated.
- Actual built editor: remove plaque readable then artwork, set mender garb=apron and night schedule,
  create its supported starting fixture and run actual private Game. Diagnostics confirm original
  seed7401/x136/h10/sit/facing1,edited garb,daytime visible=false,door eligible and original bot.slot-3
  cursor. Stop plus five Undo restores Published snapshot; console errors empty. An initial selector
  wait assumed a default fixture that was absent; inspecting the same UI revealed Create starting
  state, which supplied the disposable fixture. No startup restart or hidden state injection.
  Summary:.scene-system/warehouse-manifest-save/2026-10-19-browser-summary.json.
- Final TypeScript/homepage/design-demo builds PASS. Public packaging PASS at
  public-editor-build-check/run-J2UKoI:85documents/121references,no source/journal writes. Built
  app-RLKOEM5O.js/private play-532QUUW6.js. Events:3931nodes/3166edges,19scenes,zero missing pointers;
  complete actor/controller graph authoring remains goal work.
- Final immutable raster PASS:95 original scene+8map+20metro+50pending-device comparisons,zero
  differing pixels/errors,final source. Report:
  .scene-system/all-game-pixel-check/evidence/
  975380306f694f1fa74c220b495ca3dc21f6cb3b530f06134e2328037c715ee9-1792409499678.json.

Shared source body and ordinary-content migration now covers29 native actors across four scenes.
None is claimed fully migrated: actor creation/removal/rebinding,remaining native content/controllers,
world/network/graph authoring,ENG-09,six performance workloads and full G0–G13 acceptance remain open.
Goal ACTIVE. No commit/push/publication. Changed slice diff checks pass.


## 2026-10-19 continuation: stable actor reaction identities and editable order

Final source checkpoint: sha256:e22cf17170035fb243f1e994ad9e85da64d96e2d72de61a08d907515b8c5bdde.

- Added optional validated actor-source reaction identity and runtime-only WeakMap binding. Native
  Character snapshots/player save schemas remain unchanged. Bot person/conversation IDs use that
  registered key, retaining the old name/index fallback for unmigrated actors. All original world
  actors in the four migrated scenes carry their existing name/slot keys; anonymous new generic
  source definitions default to an actor-ID namespace. No new dialogue runner or progress store.
- Source omission migration fills original reaction keys by canonical actor ID, never current array
  index. Invalid/null/colliding IDs reject. Native identity validation permits reordered arrays while
  retaining exact original IDs/targets/bands/instances/reaction keys. Actor earlier/later typed controls
  are available in all four scenes. This changes interaction priority; drawing order remains Layout.
  Entity creation/removal/rebinding is still unfinished and not claimed by this slice.
- check-actor-identities PASS:all17 original procedural bot IDs unchanged; actual Shop stockbot moves
  from world index4 to3 and retains talk.shop.bot.slot-4. Shared ConversationSession/GameplaySession
  state advances before reorder, survives JSON serialization/factory recreation, and resumes at the
  expected next page afterward. Tokens/items/flags unchanged. Old source with identity fields omitted
  and reordered also resolves the old key. New source actor keys remain stable on reorder. Tests
  reject original alias mutation,null,collisions,invalid move bounds and duplicate default namespaces.
  Character metadata has no enumerable reaction/key property or serialized slot string.
- Extended check-native-actor-save with an actual Library actor reorder and native people-order
  assertion, alongside its appearance/schedule/follow/attachment scenarios. Grouped history/bundle/
  protected Save/native reload/exact-byte Undo PASS at native-actor-save/run-s3Fu01. Tests previously
  protecting fixed order now protect native identity/reaction keys; old defaults were not changed.
- Bot corpus PASS:834 original prompt/name/page/seed/override comparisons,17 original bindings. Shop
  immutable metadata/purchase/actor checks,Library shared content and Laundromat75 purchase cases
  PASS. Warehouse frozen content and four draw transcripts PASS. No frozen expected data was updated.
- Initial browser run reached waiting status. Inspected the same live frame:DOM remained about:blank
  with no scripts,while its assigned src was present. It was not treated as a completed runtime or
  restarted due to a selector deadline. Explicitly stopped it to apply a navigation change:append
  sandboxed frame first,then assign an absolute URL with loading=eager. Exact underlying browser cause
  is not established; no sandbox/storage/CSP protections were removed.
- Actual rebuilt editor:Actor earlier moves stockbot to index3; private native Game reports original
  seed5105/look/position/range/speed and original slot4/slot6 cursor keys. Three repeated native Play
  cycles PASS; each Stop removes its frame,including both explicit subsequent start/stop checks.
  Final Stop+Undo restores Published snapshot; successful run console errors empty. Summary:
  .scene-system/actor-identities/2026-10-19-browser-summary.json. This is scoped normal-frame evidence,
  not the full G5/G13 lifecycle corpus or a claim that all possible navigation failures are fixed.
- Final TypeScript/homepage/design-demo builds PASS. Public packaging PASS at
  public-editor-build-check/run-qoCyjo:85documents/121references,no source/journal writes. Final
  app-MTTRDBPS.js/private play-MUOVFPXX.js. Changed slice diff checks PASS.
- Final immutable raster PASS:95 original scene+8map+20metro+50pending-device cases,zero differing
  pixels/errors,final source. Evidence:
  .scene-system/all-game-pixel-check/evidence/
  e22cf17170035fb243f1e994ad9e85da64d96e2d72de61a08d907515b8c5bdde-1792410788628.json.

No broad gate is promoted to PASS.29 source actors/four native scenes remain partially migrated.
Creation/removal/rebinding,remaining native content/controllers/world/network/graph,ENG-09,six
performance workloads and full G0–G13 audit remain mandatory. Goal ACTIVE. No commit/push/publication.


## 2026-10-19 continuation: native actor entity ownership

- Shop, Library, Laundromat and Warehouse now share registered actor placement controllers and
  typed actor collection controls: create human/animal/robot, duplicate, remove, enable/disable
  conversation, attach/detach to composition anchors and edit local offsets/world participation.
  Body/dialogue and artwork edits use one grouped source transaction. Layout alone cannot leave
  an orphan actor. Renderer device/architecture requirements remain independently validated.
- Removed the four scenes' fixed actor-count/placement/name lists from content validators.
  Source actors own the artwork reference; compilation validates one matching artwork per actor,
  its renderer element, prepared-pose source and drawing pass. Surviving canonical actor IDs retain
  their saved reaction aliases; new actors use stable actor-ID namespaces. Original named targets
  remain stable. Dialogue source order can change without changing actor identity or priority.
- Warehouse's original mech used an implicit appearance seed derived from its initial x position.
  A source bakeSeed and runtime-only WeakMap retain that original seed3923 after moving/attaching.
  Native Character enumerable metadata and player-save schema remain unchanged. Duplicates copy
  appearance with an explicit seed and receive their own reaction namespace.
- check-actor-entities PASS at .scene-system/actor-entities/run-LrcUrl: Warehouse human/robot
  duplication, original named actor removal, conversation toggle, attachment/detachment, identity,
  follower/dangling/cyclic/unknown-anchor rejection; all four scenes create/duplicate/remove/rebind
  and survive grouped protected Save/native reload/history/bundle/exact-byte Undo. Additional
  empty-collection coverage also PASS at run-0kYeEv: all original actors/dialogue/artwork can be
  removed from all four scenes together, with empty native people lists and no hidden renderer
  requirement. Latest full eight-document entity Save/history/bundle/native reload/byte Undo PASS
  at the same run. Library actor regression Save PASS at native-actor-save/run-wy5J5Y.
- Shop22 malformed-body cases and original purchases, Library original content/device geometry,
  Laundromat75 purchase cases, Warehouse4 frozen draw transcripts, original17bot identities and
  ComposerModel checks PASS. Tests previously forbidding dialogue source reordering now reject
  unbound dialogue IDs; original golden data was not rewritten. Laundromat presentation-forgery
  test now checks retained washer binding mutation; registered mutable actor removal is intentional.
  Laundromat manifest Save PASS at .scene-system/laundromat-manifest-save/run-F0Nf4c.
- Built-editor Chrome check: Warehouse create servbot actor-1, attach to dock, duplicate to
  actor-1-copy. Actual private Game reports seed73/servbot, x180 and204, separate conversation
  cursors and the original talk.warehouse.bot.slot-3 key. Stop removes iframe; remove duplicate
  leaves five actors/three people; five Undo returns Published snapshot. Library keyboard-entered
  review-reader creates its own actor; two Undo restores Published snapshot. No source writes.
  Synthetic textbox fill did not commit the ID; real keyboard input/blur was verified instead.
  Only observed console error was an extension receiver message, not an application script error.
- TypeScript, homepage/design-demo builds and public packaging PASS (85documents/121references,
  app-5Y52SAV2.js, play-NZSPDPON.js, packaging run-yHXxGm). Existing Vite chunk advisory remains.
- Final source raster PASS:173 comparisons (95scene+8map+20metro+50pending-device), zero differing
  pixels/errors. Source sha256:a324e5c066b97576b2b346e811bfc16aa39ae4f26c9e51f554f8c12b9455ec67.
  Archived browser report: .scene-system/all-game-pixel-check/evidence/
  a324e5c066b97576b2b346e811bfc16aa39ae4f26c9e51f554f8c12b9455ec67-1792412362223.json
  (exact timestamped report filename is recorded in the evidence directory).

Full19-scene migration/controller/world/network/graph authoring, remaining ENG-09, six measured
workloads and all G0–G13 acceptance remain mandatory. Goal ACTIVE; no commit/push/publication.


## 2026-10-19 continuation: Sandbox source actors and ordinary bindings

- Five Sandbox bodies now live in scene.json: lead,unit0,tech,cat and the background passerby.
  The shared compiler/controller validates their artwork bindings and creates the same native objects
  for drawing and interactions. Legacy sources missing actors/manifest inherit canonical defaults.
  Stable target/reaction IDs preserve named saved conversation state. Total:34 source actors/five
  native scenes with actor CRUD/rebinding; this does not complete any whole-scene acceptance gate.
- Sandbox now uses the same typed ordinary manifest for width/spawn/uses/readables/rests/exits.
  New source interactions/commands, actor bodies/schedules, content add/remove/rebind, objective/time
  controls and placement ownership are available through existing shared forms. Registered native
  reset and machine/snapshot controllers remain intact and protected. Full editable machine/controller
  source contracts remain unfinished.
- Generalized the existing content contract to opt into registered actors/ordinary manifests. Scenes
  without that explicit opt-in retain their prior identity restrictions. No new dialogue/rules engine.
  Removed Sandbox's inline bodies, mutating bindSandboxActors/clone path, unused actor geometry fields
  and duplicate base ordinary content. Preview resolves pending source before construction and uses
  the scene's native visual environment. Artwork snapshots are registered presentation consumers;
  machine/zone/sign/reset requirements are validated independently. A station may omit its test card;
  removing a readable/card does not require an invisible original drawing to remain.
- check-sandbox-content PASS:immutable geometry/readables/rests/exits/device spots and actor metadata,
  original chip grants,12NPC pages,nine time/weather variants and reset inventory/timer cancellation.
  check-sandbox PASS:155-instance defaults,37device positions,attachments,read-only weather/clock/net/
  trace/watchdog/pulse snapshots and original tea-table transcripts. Bot corpus834/17 PASS;
  native read bindings104cases/152transitions PASS. No frozen expected data was rewritten.
- check-sandbox-manifest-save PASS at sandbox-manifest-save/run-y4ZIy1: three-document source edits,
  original plan/card1/spawn/exit/dispenser/bench artwork removed after rebind, new readable/interaction/
  command, pending actor robe/night schedule, native execution, malformed machine rejection, omission
  migration, grouped history/bundle/protected Save/native reload/exact-byte Undo.
- check-actor-entities PASS at actor-entities/run-5ohyqf: five-scene entity CRUD/bindings, complete
  original actor removal, dangling/follow/cycle rejection, source Save/reload/bundle/history/byte Undo.
  check-scene-batch PASS for grouped native source transactions. Its legacy rejection assertion now
  accepts the current protected-contract diagnostic as well as the former migration diagnostic;
  invalid legacy content still rejects atomically.
- Actual built Chrome editor: create loader sandbox-review, attach to reset, switch to Layout
  (artwork exists,no preview alert),run private native Sandbox. Diagnostics show seed73,look=loader,
  x175 and its separate saved conversation cursor. Original actors retain seeds9101/9103/9102/31,
  positions235/900/3275/3370,unit0's range900–1580/speed.18 and original heights/actions. Stop removes
  iframe; two Undo restores Published snapshot; console errors empty. Browser summary:
  .scene-system/sandbox-manifest-save/2026-10-19-browser-summary.json.
- Final TypeScript/homepage/design-demo builds PASS; public packaging PASS at run-ArZgxW:
  85documents/121source references,no source/journal writes. app-NBP5Y7SL.js/private play-IYKIKVRT.js.
  Existing Vite chunk advisory remains. Scoped diff check PASS.
- Final immutable raster PASS:173 comparisons,zero differing pixels/errors; source
  sha256:b80075e5dc37bfd1b6500512713d0f46cd6bc9e4d027e6b4aeed15b8baf10542.
  Archived report:.scene-system/all-game-pixel-check/evidence/b80075e5dc37bfd1b6500512713d0f46cd6bc9e4d027e6b4aeed15b8baf10542-1792413034700.json.

The full19-scene/controller/world/network/graph and ENG-09 migration,six measured workloads and
G0–G13 completion audit remain open. Goal ACTIVE. No commit/push/publication.


## 2026-10-19 continuation: six finite performance workloads

- Added local-only production-style native Game/model runner under scripts/performance; builds
  below ignored .performance and never enters public editor/game source services. Fixed fixtures,
  source/harness hashes, real measurement clock, native DPR/quality, warmup and finite operations.
  Independent repeat UI works; unattended multi-case batch encountered later-frame ready timeouts.
  No timeout was treated as completed Play. Original sandbox/storage protections remain in place.
- Added bounded opt-in SceneTime callback CPU/lateness spans with unchanged disabled execution.
  Performance workload checks PASS:raw/source/summary integrity,overflow/incomplete/finite diagnostics,
  missing native rendering/activation/visibility and actual timer callback reporting. Existing recorder,
  gameplay-handoff1500ms/pause/reset/disposal and Sandbox original-content checks PASS. Package and
  strict browser-harness TypeScript PASS. No shader/resolution/population/clock-policy optimization.
- All18full recordings archived at .performance/native-workloads/recordings/run-1792414247023:
  quiet Downtown,rainy Market,demo-model fan-out,board cycles,host visits and private Play;three repeats
  each. Native fan-out final outcomes count30/lampOn/fanOn;36board open/close pairs;36expected visits;
  15fresh private realms with empty initial storage and zero remaining frames. Raw samples,source,
  environment,synthetic calibration,quality and repeat variability retained. Summary recomputes
  raw integrity and excludes waits/lifecycle latency from exclusive CPU contributors.
- Source checkpoint:sha256:bb7d83aba22db2e6fdb69759e714353d56d8922147fe9b366a190b30e61ea99c;
  acquisition harness:sha256:71377d6a968704bfe244da159ad52c184e6affc62f5df3503668bb325605d467.
  Environment:Chrome155/Windows,DPR1.25,960×540CSS/1200×675canvas,reduced motionfalse. CPU/GPU,
  display cadence,thermal state and actual frame presentation unavailable.
- Major limitation:only30render samples in each30s steady run,with roughly1s RAF gaps despite
  visible documents/trusted frame interaction. Recordings are measured CPU evidence in this browser
  environment,not normal gameplay FPS or final representative-cadence acceptance. p99 is unstable.
  Top exclusive contributors:world rendering,board opening and scene visits. No candidate retained:
  no matched interleaved evidence establishes a safe gain above noise. Full G6 remains IN PROGRESS.
  Detailed instructions/results:docs/reference/PERFORMANCE-RECORDING.md.

The main work remains all19scene/editor/controller migration. Performance does not advance a scene's
migration status. All remaining gates remain mandatory. Goal ACTIVE; no commit/push/publication.


## 2026-10-19 continuation: Capsule, Yard and Moth ordinary scene bindings

- All three now compile ordinary uses/readables/rests/exits, width and spawn from the shared
  manifest. Logic exposes the existing typed creation/removal and artwork/anchor/offset controls.
  Original spawn/exit/rest markers can be removed after rebinding; native door/perch/crane/device
  requirements remain protected. This does not claim the remaining special controllers are migrated.
- Capsule's code-owned bed moved to scene.json with its original 46px prompt height; older source
  documents that omit the manifest and bed retain the original rest. Existing native targets and
  controller timing remain unchanged. Elevated attached spawn markers preserve the old horizontal
  projection; new scenes keep the default ground-spawn validation.
- Scene-module spawn exports derive from source manifests, and morning reset uses the actual runtime
  Capsule definition, including private Play edits. No fallback dependency on the old spawn marker.
- check-interior-content PASS: ten frozen original door/parcel state, repeat, old-save and geometry
  cases, desktop/touch arrivals, pending target heights and translated anchors. Capsule conversation
  PASS:20 original nodes/24 transitions. Shared handoffs and package TypeScript PASS.
- check-interior-manifest-save PASS: all three ordinary content add/remove/rebind, shared token
  command, original marker deletion, invalid binding/controller atomic rejection, legacy defaults,
  grouped history and bundle, protected Save, native reload and exact byte Undo. A fresh bundled
  module graph reads the saved JSON and verifies all three scene/spawn exports, preventing cached
  native imports from hiding removed-marker dependencies. Evidence:
  .scene-system/interior-manifest-save/run-HaFX6h/evidence.json.
- Built editor browser check: all three Content & bindings controls present; Capsule spawn rebind
  commits and Undo restores Published snapshot; no browser console errors. This is scoped UI evidence,
  not full all-scene editor acceptance. Public packaging check PASS:85 documents/121 references,
  no source mutation or journal creation. Both builds PASS before the final spawn-export adjustment;
  final source verification continues below.

Remaining mandatory work includes all-scene actors/entities/controllers, complete world/network/graph
and story authoring, ENG-09, representative performance acceptance and full G0-G13 audit. None of these
are waived by this checkpoint. Goal ACTIVE; no commit/push/publication.

Final interior checkpoint verification:
- Final TypeScript/homepage/design-demo builds PASS (app-WUSITV37.js/play-HUOYPRPI.js).
- Final native raster PASS:173 comparisons (95 scenes,8 map,20 metro-bound,50 device-source),
  zero differing pixels/errors. Source:sha256:99630bd79f5bf547f80731b2b2453969e0e0f27521f2e09e79b894f87fb3a6a4.
  Evidence:.scene-system/all-game-pixel-check/evidence/99630bd79f5bf547f80731b2b2453969e0e0f27521f2e09e79b894f87fb3a6a4-1792415973524.json.
- Final built editor native Capsule Play starts at authored stool x352; Stop removes all private
  iframes; both disposable edits undone to Published snapshot; no browser console errors.
  Scoped browser/build/Save evidence:.scene-system/interior-manifest-save/2026-10-19-checkpoint.json.


## 2026-10-19 continuation: parallel Stacks, Beach, Mall and Harbor source migration

- User explicitly authorized parallel sub-agents. Parent migrated Stacks and integrated shared
  profiles/scene-centered binding controls/native pending adapters; three agents independently
  migrated Beach, Mall and Harbor. No commits or publication.
- Stacks:13 source actors plus ordinary urn/notice/exits/spawn/width. Runtime interaction/rendering
  share compiled actor objects; operator trolley motion/clip and Moth reveal remain native. Removed
  unused visual-layout actor/ordinary fields that made deleted art remain a hidden dependency.
  Existing geometry/device/controller snapshot,22 NPC pages,tea reward/refusal and conversation checks
  pass. New editable check covers actor/ordinary CRUD/rebinding,deleted original markers,implicit
  appearance seed/reaction continuity,empty actors,legacy defaults,fresh edited JSON module graph
  and nine frozen operator/Moth paint transcripts. Six-scene grouped actor history/bundle/protected
  Save/native reload/byte Undo PASS:.scene-system/actor-entities/run-8XJaBL/evidence.json.
- Beach:24 source bodies and ordinary manifest. LIME's native sprite follows source placement,
  deletion hides it and setting an appearance switches to shared character artwork; independent
  culling keeps a moved LIME visible beyond the bar. Native gull timestamp/ashore-danger logic remains.
  Existing immutable bodies/content/prices/animal timestamps/23 NPC pages/four gull paints and
  60 composition command comparisons pass. Fresh saved-source and all-actors-empty module graphs,
  protected Save/history/bundle/byte Undo PASS:.scene-system/beach-manifest-save/run-h0nTfj/evidence.json.
- Mall:77 source bodies,including two formerly embedded booth people represented by explicit
  source-owned artwork records. Attached booth actors preserve original layering; detaching renders
  them independently. Ordinary content/actors share source bindings and pending native objects.
  26 immutable outcomes,original bodies/six pose sample configurations,geometry,creation/removal/
  rebinding/dialogue,empty actors and fresh saved JSON module graphs pass; protected Save/byte Undo
  evidence:.scene-system/mall-editable/run-GTHTFH/evidence.json.
- Harbor:30 source bodies including fish/tea vendors; original embedded painting only while attached
  to the native stall. Detached/rebound vendors/operators use ordinary source pose/visibility/clipping.
  Corrected pre-existing mojibake in source text to match immutable originals. Existing 26 outcomes,
  37 NPC pages,three weather variants,five crane flight paints and original composition/tea/foreground
  checks pass. New tests cover far detached vendor,detached operator,empty actors after dependent
  attachment cleanup,source bindings,history/bundle/Save/fresh JSON reload/byte Undo:
  .scene-system/harbor-manifest-save/run-IsqBxm/evidence.json.
- Raster fixture now explicitly compares frozen original source composition with current source
  composition. Previously feeding the frozen composition to both missed changes in shipping source;
  this migration adds/replaces invisible actor records without changing the original image. Immutable
  goldens were not rewritten. Integrated first checkpoint PASS:all173 comparisons,zero differences.

There are now178 registered source actor bodies across nine partially migrated scenes; ordinary
manifest bindings cover twelve of19 native scenes. These counts do not mean nine or twelve scenes
are fully migrated. Remaining native special controllers,world/network/story authoring,ENG-09,
representative performance and all G0-G13 completion conditions remain mandatory. LIME native sprite
selection still uses its original omitted appearance; explicit renderer-style authoring remains an
open controller/content design detail. Goal ACTIVE; nothing committed or pushed.

Integrated actor batch validation:
- Nine-scene shared actor entity check PASS,including empty actor collections after detaching
  surviving dependents,creation/duplication/removal/dialogue/rebinding,grouped history/bundle,
  protected source Save/native reload and byte-exact Undo:
  .scene-system/actor-entities/run-FYrQL1/evidence.json.
- Actor save identity regression PASS:17 original bot keys,reorder/reload,legacy source identity
  backfill and unchanged enumerable Character metadata. Moth/Stacks shared conversation handoff
  regression PASS:312 state cases,256 transitions,1499/1500ms boundary and pending timing.
- Capsule/Yard/Moth original ten outcome/oldsave/geometry cases PASS again.

Next-scene audit (read-only sub-agent findings; no migration claims):
- Market:67 bodies (58 prepared+9 embedded),41 interactive;2uses/3readables/3exits and one inline
  rest. Needs explicit shared person-to-existing-conversation reference:four vendors already have
  editable gameplay graphs; copying them into chatter would duplicate ownership/change pending graph
  behavior. Preserve graph/cursor/advance IDs,followers street24->21/street25->20 and implicit seeds.
  Signature marketScene(doc,state,options,gameplay,sceneDocument). Existing market/conversations/
  ordinary checks provide outcomes and64 native actor paint cases.
- Harbor Shift:two visual bodies boss/Mara,9uses,12objective stages,6clockrules. Keep actor bodies
  background initially; dialogue belongs to uses. shiftConversation auto-accept,tag replacement and
  objective substitution must become explicit shared behavior without duplicating targets. Lift
  ordinary manifest,relax fixed lists for new content while protecting acceptance choices,remove
  eager spawn/use lookups. Detach surviving use/glint/light dependents before actor deletion.
- Downtown:four SPR sprite recipes bypass SceneDef.people;counter shares people pass. Needs typed
  registered sprite/recipe presentation support (not replacing native sprites with different shared
  character looks). Runtime heads/targets/interact/draw branches must migrate together. Fixer has
  paid hints,handle substitution/prefill and saved flags;capture full branch outcomes before moving
  it into shared conversations/commands and typed state/handoff hooks. Ordinary manifest lift must
  actually compile new uses,not merely expose controls. Existing143 composition comparisons and
  native device metadata/paint cases are available. Source signature includes overrides rather than
  environment state; keep its existing authored wrapper.

Final parallel batch verification:
- Homepage and design-demo builds PASS:app-44UCHSQA.js/play-BWSLHDHO.js. Native read104 state/
  152 transition cases,scene batch and composer-model regressions PASS.
- All173 final raster comparisons PASS against untouched originals,zero differences/errors.
  Source:sha256:66b17ae6322016c7d755e25eda661f8c02d580c08e1fa96384a22ef460e7d541.
  Report:.scene-system/all-game-pixel-check/evidence/66b17ae6322016c7d755e25eda661f8c02d580c08e1fa96384a22ef460e7d541-1792416776573.json.
- Final built editor creates Mall android review-bot through actual typed controls,including
  artwork/source/dialogue ownership; no validation alert. New fixture+native Play attempt remained
  Loading in an existing opaque iframe. Server saw frame HTML200 but no game script request;
  parent console had no error. Trusted frame focus did not resolve. Cause unresolved; neither
  product regression nor environment cause is established. Native browser Play is NOT VERIFIED
  for this attempt and G4/G5/G10 remain open. No restart was used to claim success. Explicit Stop
  removed all iframes; two disposable edits undone to Published snapshot.
  Evidence:.scene-system/parallel-scene-batch/2026-10-19-checkpoint.json.
- Next integration priorities:explicit references from source people to existing shared conversation
  graphs (Market),typed sprite/recipe presentation and state/handoff bridge (Downtown),then Harbor
  Shift ordinary/actor migration preserving use-owned conversations. All remaining goal gates stay.


## 2026-10-19 continuation: Market, Harbor Shift and Downtown ordinary source

- Parallel continuation: Market source bodies/ordinary content, Harbor Shift source bodies/ordinary
  content and Downtown ordinary manifest. Parent integrated shared conversation references, placement
  policies, typed controls and pending native adapters. No commits or publication.
- Shared ScenePerson now chooses authored chatter pages OR a reference to an existing shared graph.
  References preserve original graph/command/state/cursor IDs; compiler does not copy graph pages or
  invent progress storage. Native/declared/presentation paths honor the reference; an empty runtime
  talk marker preserves key-person drawing,without duplicate authored text. Explicit robot graphs do
  not also get procedural bot graphs. Typed person controls select pages vs existing graph and point
  authors to Commands & dialogue. New focused reference checks cover saved cursor/reward guard,
  pending graph edits,mixed chatter,identity and invalid/double-owned definitions.
- Shared manifest promptAboveFloor mirrors responseAboveFloor: omit zero-floor overrides but retain
  elevated prompt heights. Explicit zero remains available without the policy. Optional transformed
  exits preserve Downtown's existing mirrored/scaled anchor contract; interaction/spawn/parallax
  restrictions remain unchanged. Focused contract checks PASS. Alley doorOffset is now a typed art
  property,independent of the ordinary exit marker.
- Market:67 actor bodies (9 former embedded vendor bodies),four existing graph refs,six source
  chatter entries,source stool and authentic end-gated Downtown exit. Preserve foreground actors,
  followers,five implicit seeds and saved bot indices. Legacy source omission lifts vendor refs/rest/
  gate and the already-used global end declaration. Existing geometry,64 actor paints,14 ordinary
  interactions/20 chatter cases PASS. Entity/ordinary/command edits,blank actors,removed original
  art,fresh saved JSON graph,history/bundle/Save/byte Undo PASS:
  .scene-system/market-editable/run-7b3NJX/evidence.json.
- Harbor Shift:two background source bodies,nine uses and all ordinary binding groups editable.
  Dialogue remains use-owned,including original autoaccept,tag replacement and objective substitution.
  Removed obsolete hardcoded layout/use/adapt functions. New command/conversation/actor/content/
  objective/time/guidance edits preserve protected acceptance wiring and native glints. Legacy1100
  cases,36Shift paintings and full work-chain foundation PASS; Save/fresh saved and empty-actor
  imports/history/bundle/byte Undo PASS:
  .scene-system/harbor-shift-manifest-save/run-vmxd34/evidence.json.
- Downtown:shared ordinary width/spawn/nine exits/plaque,new uses/readables/rests/conversations;
  default exports/source reload no longer depend on original ordinary markers. Existing metadata,
  access and143 native drawing comparisons PASS. SourceSave/fresh import/history/bundle/byte Undo
  PASS:.scene-system/downtown-manifest-save/run-1NlZLi/evidence.json. Captured/checked6240Fixer
  outcomes,64NPCcontrolled cases,21repeated histories,final-page nameprefill and two old-v3 saves.
  Four original SPR actors and native Fixer/story/device runtime remain explicitly unmigrated.
- Fixed compact demo regression:render-only Library factory no longer requests native catalog data
  when its supplied gameplay has no native contract. Shipping native Library is unchanged. Library
  gameplay,TestDistrict,ENG05(64Downtown/2048Harbor snapshots) and834bot/17binding checks PASS.

Source actors now total247 across eleven partially migrated scenes; ordinary manifests cover15of19.
This is not fullscene/controller/world/network/story/ENG09/performance completion. The four transit
scenes still need ordinary/actor migration,empty interiors still need entity authoring,and Downtown
needs typed preserved sprite recipes and shared Fixer state/handoff. All G0-G13 requirements remain.

Next-source batch combined checks:
- Eleven-scene actor entity check PASS:source creation/duplication/removal/rebinding/dialogue,
  blank collections after dependent attachment cleanup,identity preservation,atomic history/bundle/
  protected Save/native reload/byte Undo:.scene-system/actor-entities/run-9I8o1b/evidence.json.
- Shared person graph reference and manifest placement policy checks PASS. TestDistrict,Library
  gameplay,ENG05 and834bot comparison/17runtimebinding checks PASS. Both builds PASS at first source
  checkpoint7092f4964f49650ecffd67339b3bc5ba837979d241f48c54ed6cb1a8c39b512d.
- Built editor Market person controls show existing graph source; rebinding NOODLECOOK from its graph
  to talk.market.fish commits without error. This is source/control evidence,not native Play proof.
- Added bounded parent-side private Play startup observations (fonts/navigation/document-load/
  runtime-ready/start/running/error/stop),one-shot start payload,stale/superseded callback guards and
  src-before-insertion. Sandbox remains allow-scripts only; no automatic retries. Actual workbench
  lifecycle test passes font/clone/navigation/runtime failures,staged waits and Stop/reset/disposal
  cleanup. Notes:scripts/scene-system/play-startup-notes.md.
- Browser symptom persists on observed built attempt:fonts ready136ms,navigation requested153ms,
 15s wait classified document-load; iframeHTML200 served,no game JSrequest or parent error observed.
  No document-load/ready/running event. Thus src-before-insertion is not a demonstrated rootcause
  fix. Explicit Stop removed all frames; two owned edits undone to Published snapshot. Browser Play
  remains NOT VERIFIED;G4/G5/G10 remain open. Further bootstrap/navigation diagnosis is mandatory.
- First integrated173raster cases PASS at7092f496...,zero differing pixels/errors; final source
  identity/build/raster refresh follows because a late startup phase guard and evidence ledger landed.

Final next-source checkpoint:
- Final builds and public packaging PASS:app-5OTPWDG2.js/play-EJFPFGZS.js;85documents/121references,
  source documents/homepage unchanged by packaging verification and no journal creation.
- Final173 raster comparisons PASS:zero differing pixels/errors against untouched frozen sources.
  Source:sha256:8157e64c969c6ba48c921bd6ce397f89562a2a7816d0af363629b4168d3d59ae.
  Report:.scene-system/all-game-pixel-check/evidence/8157e64c969c6ba48c921bd6ce397f89562a2a7816d0af363629b4168d3d59ae-1792418079317.json.
- Final typed Market graph controls verified in browser; a graph-owned person does not offer an
  invalid pages switch that would collide with that existing graph. Rebinding remains available.
- Source-reader boundary/junction regression PASS outside Windows sandbox after sandbox directory
  rename EPERM; no product source change needed. All79 inspector-derived paths verified.
- Browser private Play remains unverified as described above. This supporting startup diagnostic
  work does not close any scene/controller or full lifecycle gate.
  Consolidated evidence:.scene-system/next-source-batch/2026-10-19-checkpoint.json.
Goal ACTIVE. No commit/push/publication. Continue remaining scene/entity/controller/world/network/
communication migration and native Play diagnosis before any completion claim.

## 2026-10-19 all-scene actor and environment integration checkpoint

- Ordinary manifests and shared actor definitions now cover all19 native scenes:287 source actor
  bodies, excluding the separately controlled player/Pixel. Capsule,Yard and Moth retain empty default
  actor collections with tested authoring support. Fullscene/controller completion is not implied.
- Transit:36 original rider recipes retain native seeded queue/slot behavior and embedded bench
  draw order. Source CRUD, typed forms, grouped history/bundles/Save,fresh imports and byte Undo pass
  (.scene-system/transit-editable/run-aBjOIJ). Original Metro72/station144/Train270 paint comparisons
  and11,088 platform/211,200 ride-frame checks pass.
- Downtown:4 original sprite recipes retain bob/glow/shadows/head metadata and the Fixer/counter
  ordering.70 isolated and8 complete people-pass comparisons pass; actor Save/fresh imports/empty
  actors/Undo pass (.scene-system/downtown-actors/run-MfLw06).6,240 Fixer cases,64 NPC cases,21 repeated
  histories,old-v3 saves and76,230 original/current nearest-target comparisons pass. Duplicate
  production dialogue runner removed; oracle adapters now live only in scripts.
- The shared SceneDef.drawActors pass replaces Game's Downtown-specific people draw/head paths and
  the separate editor pass. Normal actor additions use the same source body and rendering bridge.
- New typed scene.environment owns fixed sky/weather/facing/shade/keep-face settings formerly in
 31 factory properties. Artwork-derived facing/horizon/shade/covers retain one Layout owner rather
  than copying geometry into another source. Default19 metadata equals the pre-change snapshot;
  full original/source-Save/legacy-bundle checks and integrated raster are still running.
- ENG09: scan acquisition deduplicated across actual ownership observation;22 real-callsite readable
  clock cases preserve time while covered/hidden and under reduced motion. Device reply routing
  passes42 desktop/touch/remote/missing-anchor cases,with single history and visible fallback.
  Typed receipts carry source/tone/scope/identity across history/status/denial audio; muted sounds
  schedule no timers and delayed cues cancel on scene change/stop. Shared saved noun/wiring lessons
  replace the Schematic opens counter. Success-service causal receipt plumbing remains open.
- A mistaken root compiler invocation emitted adjacent compiler files. The scoped cleanup verified
  the immutable baseline is exactly451 files again and every original hash/fingerprint is unchanged.
  Evidence:.scene-system/tsc-emission-cleanup/{before,audit}.json. Native parity above was rerun after
  cleanup. No baseline was regenerated.
- Both builds pass at the initial combined checkpoint. Updated source-bound all-game raster and
  browser Play verification follow; this section does not claim those final checks have passed.

All G0-G13 remain open pending full requirement acceptance. No commit/push/publication.

All-scene combined source checks now PASS:
- check-actor-entities.mts covers all19 native scenes,including consistent removal of bound uses/
  readables/rests/exits,decorative attachment detachment,structural/follower blockers,grouped
  history/bundle/Save/native reload and byte Undo:.scene-system/actor-entities/run-0aIJUt/evidence.json.
- check-scene-environment.mts verifies original frozen metadata for19 scenes,pending settings,
  one artwork geometry owner,legacy source defaults,atomic import,bundle/protected Save/reload/Undo:
  .scene-system/scene-environment/run-RJdEHy/evidence.json. Test validation uses one prospective-world
  check per transaction; an earlier redundant per-document full-world callback was corrected.
- Initial integrated173raster cases PASS at d4d66647353edc6982f70a0e2fb04f91d54f7d4c5b7da41da17c499bbdb84287,
  report .scene-system/all-game-pixel-check/evidence/d4d66647353edc6982f70a0e2fb04f91d54f7d4c5b7da41da17c499bbdb84287-1792420928294.json.
  A late presentation-only Train artwork Save/Undo binding correction and evidence ledger update
  require final source/hash/build/raster refresh.

Final all-scene source checkpoint:
- Both builds PASS:app-YHS3Y7TT.js/play-XFV6VBKI.js. Final173 browser raster comparisons PASS
  with zero differing pixels/errors against untouched originals. Source
  sha256:2b67aa171a3fb9279430c9bbb0b66b80f848ff3e074128295be1efadbf42f573.
  Report:.scene-system/all-game-pixel-check/evidence/2b67aa171a3fb9279430c9bbb0b66b80f848ff3e074128295be1efadbf42f573-1792421252090.json.
- This proves sampled native world/actor/map/device rendering at this checkpoint,not all puzzle
  states/HUD/lifecycle/controller authoring. Native Play of the rebuilt editor remains next.
- Combined checkpoint:.scene-system/all-scene-source-checkpoint/2026-10-19.json.
- Remaining controller and world/story/network contracts are now enumerated in
  docs/reference/CONTROLLER-MIGRATION.json and WORLD-STORY-NETWORK-MIGRATION.md.


## Pending world/story/network controller integration checkpoint (2026-10-19)

The all-scene raster/build checkpoint above remains the last built snapshot. The following
source changes are newer; they require a new combined build/raster/native-Play pass before
being included in any final gate claim.

- Native sequence documents now enter each private Game instance through GameRuntimeSources.
  Title/glide, intro/Act II and taxi duration/picture use that instance's validated documents.
  Composer timeline validation and handoff pickers resolve prospective destinations, including
  new ordinary scenes and edited arrivals. Story-triggered cutscenes honor authored handoffs
  before their inbox continuation; the native same-scene/no-arrival return does not reset it.
  check-cinematic-pending PASS: .scene-system/cinematic-pending/run-j10rsU.
  Sequence runtime/commands/contexts/documents checks also PASS against their stated scopes.
- Global network data is an allowlisted source document (network, data/net.json), with typed
  Networks controls. Prospective native device projections validate existing network semantics;
  private network/keyring contexts reach SceneModel/SceneHost, device editors, event inspection,
  native network map, machine names and terminal scan/connect. Globals remain independent.
  Network source/forms checks PASS; grouped Save/history/bundle/native method and saved module
  reload/byte Undo PASS: .scene-system/network-source-save/run-yaga5F.
- Moth/Library native observations now use source-owned aliases and goal conditions over the
  existing engine read/Cond/tick/goal owners. Their replaced derived/tick maps were removed.
  Source baseline parity, typed edits, grouped Save/native module reload/Undo PASS:
  .scene-system/native-observation-save/run-tlVllF. This is two controller slices, not all19.
- City source version2 makes boarding, platform, siding and taxi arrival bindings explicit.
  Version1 source upgrades its former implicit destinations/arrivals at the validation boundary;
  in version2 an omitted arrival intentionally selects spawn. Actual Game transport methods use
  these bindings. check-transport-destinations PASS, check-city-source PASS (original registry
  fields, 13824 knowledge cases, 7752 refusals, exact plan and532 map input cases), and grouped
  source Save/history/bundle/reload/byte Undo PASS: .scene-system/city-source-save/run-Dba3c6.
- Package-only pnpm exec tsc -b PASS after this integration. No root compiler invocation was used
  for parent checks. No publication or final goal-gate promotion.

In progress: complete typed city map/link/membership controls; source-owned companion policy,
perches and shared pet conversation content; opening-story controller inputs and editor controls.
Remaining controller contracts, final ENG09 coverage, all-scene native Play, G6 measurements,
cleanup and the G0-G13 completion audit remain mandatory.

Built2b67aa17 checkpoint follow-up: actual Chrome private native Play startup verified for all19
scenes. Each native diagnostic matched its selected scene; Stop removed frames, temporary fixtures
were undone, final dirty=false and no console errors. Report:
.scene-system/all-scene-source-checkpoint/native-play-19-2b67aa17.json. This covers startup/disposal
of the older built checkpoint only, not puzzle outcomes or newer unbuilt controller changes.


Further controller/editor source progress (newer than the last built snapshot):
- Full typed city controls now cover dimensions, district geography/reveal, map paths/links/planned
  lines/stops, place membership operations, map markers, station/taxi/boarding/siding destinations,
  arrival-or-spawn, permission flag and transport dialogue. check-city-forms PASS via actual callbacks.
- Scene companion config is source-owned for all19 native scenes (one home, eight along, ten off),
  with six source-bound warm spots and a shared ordinary gameplay conversation library. Native
  movement/purr/RNG/local recurrence remains code, with7347 original comparisons PASS and actual
  Game conversation frame/completion/choice behavior tested. Typed form/perch rebind/removal,
  grouped source Save/fresh JSON module/history/bundle/byte Undo PASS:
  .scene-system/companion-source-save/run-ldCOTC. Source registration, Play injection and the
  Companion dialogue workbench now use this shared library; no nineteen copied dialogue tables.
- Opening source/model and typed controller editor now exist and feed private native Game through
  the same prospective registry/network/contact context. Immutable source/facade and initial runtime
  comparisons pass; expanded runtime and source Save tests remain in progress. Ordinary intro,
  greeting, sleep/turnstile/Moth/inbox/guidance content is moving out of Game rather than being hidden
  in a native adapter. Do not claim this slice final before those tests and the combined build pass.
- Capsule controller parameters/references are migrating into the registered SceneData.controller
  schema, preserving the existing thermal primitive/tick order. Focused parity and typed forms pass;
  grouped Save/scheduling tests remain in progress.
- CONCIERGE device-caption acknowledgment/continuation is an active ENG09 slice. It must preserve
  explicit acknowledgment before entering and exact-once cancellation/scene-change semantics.
- Newly verified mandatory authoring gap: device source eligibility is currently limited to ten
  native geometry adapters; new authored catalogue scenes have no device-source owner. Generalize
  shared device assembly/editing/projections to all19 and new ordinary scenes before claiming full
  editor coverage. The gap is recorded in CONTROLLER-MIGRATION.json; it is not an exclusion.


### Required authoring gap closure and communication checkpoint

- General device sources now cover all19 native scenes and projected catalogue scenes. Native
  geometry adapters retain registered baseline placement; extra ordinary devices can bind arbitrary
  library artwork or explicit positions. Catalogue records accept legacy three-field sources and
  optional device sources; the same data-only native command bridge is available without TS hooks.
- Shipping SCENES now attaches the same source documents/bindings and preserves bindWorld behavior;
  the global default keyring catalog includes all19 and authored scene device sources. This closes
  the private-Play-only trap identified during review. Fresh saved JSON shipping imports, actual
  native models, history/bundle/Save/reload/byte Undo PASS: .scene-system/general-devices/run-6xH8ED.
  Typed forms cover Harbor, the HarborShift prefix and projected authored documents. All19 ordinary
  device runtime cases, native10 baseline projections/cables and128 observation compatibility cases
  pass. Existing catalogue grouped Save coverage PASS: .scene-system/scene-catalogue-check/run-wnaU97.
- Opening source Save/fresh module/byte Undo now PASS: .scene-system/opening-story-save/run-hWgIO0.
  Four focused opening suites cover64 old-save states,42 original Game timing/transcript/paint cases,
  explicit home relocation, source-bound bed target/ping after Layout edits and cancellation of stale
  run callbacks. A new opening or stop cannot complete an old speech/turnstile/sleep/travel callback.
- CONCIERGE acknowledgment and causal success feedback are implemented. The pinned real-source
  caption requires explicit rendered-page acknowledgment; completion/cancel ordering is tested.
  One causal sound identity may span several distinct reply receipts, while separate actions and
  scheduled callbacks keep distinct identities. Immediate errors, mute/dispose cancellation and
  native Downtown state/event/service order pass. See DEVICE-ACKNOWLEDGMENT.md and CAUSAL-FEEDBACK.md.
- Capsule registered controller source completed focused parity/forms/native scheduling/Save evidence:
  .scene-system/capsule-controller/run-HZib2Y. This does not cover the remaining specialized controllers.

All statements above describe focused source checkpoints. They do not supersede the older built/raster
identity until the next combined build/browser pass. Generic shared state/command/native binding CRUD
and its final prospective validation integration are the remaining active part of this batch.


Final focused shared-command authoring checkpoint: typed state/vocabulary/command CRUD, native
state/read/event/goal/route/case/denial/wire authoring and runtime-derived reference pickers PASS.
Pending native metadata refreshes without resetting the editor's selected conversation. Existing
native validators preserve saved identities/permission sources/fixed conduits while cross-document
binding refs validate only after the complete prospective device/gameplay set is assembled; partial
factory projection is not a source-acceptance boundary. Actual Yard paired binding + new ordinary
scene shared command dispatch/events/goals, no duplicate saved state, atomic invalid endpoints,
history/bundle/protected Save/fresh shipping module/byte Undo PASS:
.scene-system/gameplay-binding-save-hUnO67. Package TypeScript and the focused causal feedback suite
PASS again after integration. Source implementation is frozen for a new combined build and browser
checkpoint. Whole specialized-controller coverage and G0-G13 remain unproven.


2026-10-19 integrated checkpoint and ordinary-controller follow-through:
- The preceding frozen integration (source sha256 8f62e62a0fd1d501168d4c2d4f1774888d1683e18073483610c25e9c73fb8d59)
  passed both builds and all173 raster comparisons (95scene,20transit,8map,50device), zero pixels/errors.
  Evidence: .scene-system/all-game-pixel-check/evidence/8f62e62a0fd1d501168d4c2d4f1774888d1683e18073483610c25e9c73fb8d59-1792424535192.json.
  Browser-created Harbor device bound to call-box artwork appeared in actual native Play diagnostics;
  Stop removed the iframe; Undo restored clean documents; browser console errors were empty. This
  is scoped Harbor evidence, not a new all19 native-startup or all-scene completion claim.
- Subsequent Capsule ordinary plug-off logic now uses shared commands/native routes; the replaced
  custom effect, native steps and obsolete controller text bindings are deleted. Manual/signal case
  selection and explicit silent success have typed editor controls. Shared-route-only verbs remain
  visible in the event inspector and count as implementations in semantic source validation.
- Package TypeScript,12 real-model immutable-original plug comparisons,1,728 simulation comparisons,
  binding/controller forms, native conversation parity, network and event-inspector checks PASS.
  Protected controller Save/fresh shipping import/byte Undo: .scene-system/capsule-controller/run-6TE4O0.
  Source-reader junction/security test PASS outside filesystem sandbox after local EPERM; no guard
  was weakened. Event inspector's historical10scene assertion updated to the authorized19scene corpus.
- Both builds PASS after this Capsule slice: editor app-5LMFGVR6.js, Play play-XHFZXR7T.js; this newer
  snapshot has not yet received a new raster/all19 browser pass. The preceding173comparisons do not
  prove pixel identity for subsequent edits.
- Concrete remaining ordinary-code audit: docs/reference/ORDINARY-CONTROLLER-CONSOLIDATION.md.
  Sandbox counter/reward migration is delegated next. Whole G0-G13 and19scene rows remain unsigned.


2026-10-19 semantic integration checkpoint:
- All173 raster comparisons PASS again on source a832e88c9e157bec22f544eeb4b54f388c6b2a54ad6a6a3c6f5871263942f418:
  95scene +20boundtransit +8map +50device; zero differing pixels or errors. Report:
  .scene-system/all-game-pixel-check/evidence/a832e88c9e157bec22f544eeb4b54f388c6b2a54ad6a6a3c6f5871263942f418-1792426371480.json.
  Includes Capsule shared off, Sandbox five ordinary operations, Harbor Shift authored conversations
  and Train source permission cases. Both builds PASS (app-7B2MY45M.js; play-YRJIHYT4.js).
- Focused shared/typed/runtime parity PASS: Capsule12, Sandbox109, Shift48, Train672 histories,
  atomic conversation entry refusal sinks, current source Save/fresh imports and exact byte Undo.
  Artifacts: .scene-system/gameplay-binding-save-Zv4QOh and .scene-system/harbor-shift-manifest-save/run-OjJs6T.
- Communication suite PASS including22 actual callsite clock cases; its test fixture now supplies
  the injected opening story model, without weakening actual getter/loop/HUD checks.
- User correction: old-save-format support was not requested and is removed from acceptance.
  Do not build new compatibility layers or per-scene state adapters. The common gameplay state
  and shared actions are the target; normal current-format persistence remains required.
- Beach timed-workflow source migration now in progress. The173comparison checkpoint above
  precedes Beach changes. Whole gates and scene rows remain unsigned; partial prior-browser startup
  checks are not a current all19 Play acceptance result.


Publication checkpoint preparation (user-authorized main + production):
- Actual public editor app-7B2MY45M.js / play-YRJIHYT4.js: all19 selected scenes started native
  Game with matching scene identity; each Stop removed its iframe; console errors empty.
  Evidence: .scene-system/all-scene-source-checkpoint/native-play-19-app-7B2MY45M.json.
  Source a832e88c9e157bec22f544eeb4b54f388c6b2a54ad6a6a3c6f5871263942f418.
  This proves startup/disposal only and predates Beach/common-state source changes.
- Fetched upstream main/production. Main has63e70c5 hover-overlay scrollbar fix; applied its exact
  patch successfully to the dirty worktree, preserving local editor changes. Ancestry integration
  and a new combined build/verification are required before pushing. No publication has happened.


Stable publication candidate,2026-10-19:
- Source75dbde1afb8a0e1db7de19593ea1b90b59cb8585e98c1891eb3b8badeaf21d29:173raster comparisons PASS,
  zero differing pixels/errors. Evidence .scene-system/all-game-pixel-check/evidence/75dbde1afb8a0e1db7de19593ea1b90b59cb8585e98c1891eb3b8badeaf21d29-1792427510160.json.
- Both builds and package TypeScript PASS. Editor app-D5N5FQWH.js / Play play-VKIZJQUI.js.
  Public build guard PASS97documents/131source refs, no source writes/journal/server imports.
- New common state/current-persistence/context tests PASS, including default/live native values,
  objective guidance, reaction/choice/action/purchase draft refresh and atomic refusal rollback.
  Downtown corpus:6240Fixer+64NPC+21histories;76230target comparisons. Source Save/freshgraph/Undo:
  .scene-system/downtown-manifest-save/run-ggJB80. Custom Downtown port/hook/progression selector removed.
- Beach512behavior cases, typed interval/reply controls and protected Save/fresh import PASS:
  .scene-system/beach-workflow-save-ILGaRO. Full ENG04 check PASS after integration.
- Final built editor native startup smoke: Downtown,Beach,HarborShift exactscene/Stop0iframe PASS.
  Earlier a832 checkpoint covers19startups; that evidence remains scoped to its own source snapshot.
- User-authorized main/production publication is a stable intermediate checkpoint. Native shared-state
  unification,remaining controllers/timed workflows,all19finalacceptance,sixworkloads and G0-G13
  completion remain open. No whole-goal completion is claimed.

Published intermediate checkpoint,2026-10-19:
- Commit28888d62ef1867ff257e38322d668051cafb288d was atomically pushed and both remote main and
  production were verified at that commit. Production homepage deployment39286739765 succeeded.
  Design-demo deployment39286740530 was last observed queued; later status lookup was unavailable.
  The source75dbde1 raster/build evidence above applies to this checkpoint, not subsequent changes.
- Subsequent uncommitted work: Laundromat breaker reset uses the shared interval/command/reply
  contract (24 immutable behavior cases); Sandbox ordered environmental triggers use existing
  conditions/commands (504 actual-world histories); Yard/Stacks discovery uses configured shared
  commands (28 actual panel histories with effective canvas-op parity). Typed pending edits and
  scoped source Save checks pass. These are focused checks, not full all19 acceptance.
- Nullable and finite-decimal scalar declarations now support native state representation while
  preserving integer commerce/cursor rules. This representation work alone does not unify owners.
  Common state ownership, canonical scene fields and deletion of the mapping bridge are in progress.
- Retired the one-use downtown-migrate-conversations generator: it reconstructed obsolete projected
  player/goal facts. Authored conversations remain the source; their immutable fixture stays intact.
- Ordinary washer deadlines/queries/rewards, other native ordinary decisions, final typed-editor
  coverage/lifecycle, six measured workloads, cleanup and all G0-G13 gates remain open.

Common state/query integration checkpoint,2026-10-19:
- One common scalar root now owns save/session values. Native models hold direct scene-block references;
  commands commit in place, reset/restore preserve identity, and autosave/slots settle copied values.
  Removed native.state alias maps, nativeStatePort and the separate temporary value store. All19 device
  sources compile scalar defaults from shared declarations;67 immutable original defaults are preserved.
  Devices and Gameplay share one typed declaration editor. Current-format ownership/lifetimes/reset/
  restore/menu-slot/persistence tests PASS. No historic-format compatibility layer was added.
- Shared read-only count/select/tuning/label/duration queries, comparisons and typed query controls
  replace Laundromat count/door callbacks.162 immutable query cases, post-action/reaction reads,
  refusal/readonly/cycle/reference/cleanup cases PASS. Native preview uses the same read evaluator.
- Opening phase selection is now ordered source rules using common flag conditions;64 immutable flag
  histories, typed CRUD/reorder/nested conditions, protected Save/fresh shipping module/Undo PASS.
  Actual story effects and timing still need further consolidation. Workshop counter uses the shared
  source command after its obsolete native effect was removed; direct/signal replies and pulses PASS.
- Integrated package TypeScript, both builds and public build guard PASS. Editor app-ZSNKQRZ7.js,
  Play play-BGZTSE5Q.js. Source2b006c014979824956f299d328fdbf977e2b2f3748ccc8052c30b4e264b71443.
- Raster repeat: all173 comparisons PASS, zero differing pixels/errors, report
  .scene-system/all-game-pixel-check/evidence/2b006c014979824956f299d328fdbf977e2b2f3748ccc8052c30b4e264b71443-1792429484434.json.
  The first unchanged run had2 differing pixels in the below-map case; its failed report is retained
  at the same prefix with timestamp1792429412694. It did not repeat. No source or baseline changed.
- Actual built public editor:19 native Game startups matched scene IDs, every Stop removed its iframe,
  console errors empty. .scene-system/all-scene-source-checkpoint/native-play-19-app-ZSNKQRZ7.json.
  This is startup/disposal evidence, not all19 full-authoring or controller acceptance.
- Protected Save/fresh import/byte Undo: state-scalars/run-hAv0PE,scene-state-source-save-RA3B2I,
  gameplay-binding-save-L7J5zl,laundromat-query-save-Zi8qR1,opening-story-save/run-p65t5Q,
  beach-workflow-save-GKeDqV,sandbox-live-condition-save-Z1oZq8 (all under .scene-system).
- Further ordinary controller migration, final full-authoring/lifecycle/communication acceptance,
  six measured workloads, removal audit and G0-G13 remain open. Capsule temporal traps and next
  contracts are specified in docs/reference/CAPSULE-ORDINARY-MIGRATION-PROPOSAL.md.

Further controller/source work,2026-10-19 (not yet published):
- Cancelable shared deadlines now own washer start/stop/overload/completion. Removed native washer
  effects, duplicate routes/text and obsolete cancellation tickets.2,592 original/current cases plus
  28 timing histories PASS; typed pending/Save/fresh import/Undo:laundromat-deadline-save-HNe8V0.
- Atomic keyring grants commit with other command actions and notify through the existing receipt
  path. Jacket reward effect removed;576 original/current cases and source Save/fresh import/Undo
  PASS in laundromat-jacket-save-S9lW4l. Shared numeric actions accept existing scalar reads;
  46 expression cases and actual typed/sourceSave proof PASS in action-expression-save-420kPg.
- All4 current-save settle callbacks and SceneRules.settle API removed. Source checkpoint commands
  use the same interpreter on copied blocks, preserving live identity.274 original/current variants,
  typed controls/inspector and actual pending Game Save/reload/bundle/history/sourceSave/fresh import/
  Undo PASS:checkpoint-policies/run-rWs6Yq. No historical-save translation is included.
- Capsule door reaction,goal conditions and Pixel selection/wait now use source queries/triggers/
  intervals.1,728 original/current histories and typed/sourceSave/fresh import/Undo PASS in
  capsule-workflow-save-qjR3iY. Native thermal/trajectory calculations remain; schedule-before-thermal
  orchestration is still pending.
- Downtown till reward is source-owned.128 original/current guard/manual/signal/repeat histories
  PASS;typed tokens edit,missing-query rejection,pending/native/sourceSave/fresh import/Undo PASS in
  downtown-till-save-xwfYdx. Other Downtown controller rewards remain open.
- Twenty one-time migration scripts retired; authored JSON and focused preservation fixtures remain.
  Yard and Stacks controller slices are in progress. These are bounded results,not whole-scene gate
  signoffs. Final integrated builds/raster/editor checks must bind to the next stable source identity.
- Existing jump and Registry control grants now extend the same atomic resource action; Game commits
  canonical player fields together, preserving handle and unrelated progress. Typed metadata pickers,
  strict reference validation, Save/fresh import/Undo PASS:player-grants/run-37t2BT. Legs installation
  source route replaces its native effect;16 original/current STORE histories PASS. GUARD and billboard
  control callers remain open and are not counted as migrated by introducing the grant primitive.
- Existing workflow evaluation now has explicit beforeNative/afterNative phases on the same live
  tick, defaulting afterNative. Capsule schedule emission moved into a beforeNative interval and its
  native schedule branch was deleted. Original1,728 histories,phase ordering/pause/background/lifecycle
  checks and actual typed phase/duration Save/fresh import/Undo PASS:capsule-workflow-save-3BbuuD.

Merged editor/source checkpoint,2026-10-19:
- Engine batch302211f merged latest origin/main43d316b through9b2eca3. Preserved the new Scene/Logic/
  Play/Library/World editor organization. Both builds and package TypeScript PASS.
- Source294b0d4656d4762b6803e8c79e7984f2dca3995e0563bc9f2c8f17e93732ad7f:
  all173 raster comparisons PASS,zero differing pixels/errors. Evidence:
  .scene-system/all-game-pixel-check/evidence/294b0d4656d4762b6803e8c79e7984f2dca3995e0563bc9f2c8f17e93732ad7f-1792431886510.json.
- Built editor app-NMWPZ7D5.js / native Play play-PKGJODRP.js:all19 actual scene startups and Stop
  disposal PASS,console errors empty. .scene-system/all-scene-source-checkpoint/native-play-19-app-NMWPZ7D5.json.
  This is startup/disposal evidence,not full all-scene acceptance.
- Merged typed/sourceSave/fresh import/Undo checks PASS:player-grants/run-BnkxvQ,
  downtown-till-save-1jBucP,laundromat-jacket-save-sEBprD,yard-drop-save-PWd1xW,
  stacks-permission-save-pIfFa3,capsule-workflow-save-auii5e,checkpoint-policies/run-ekCgno.
  Common state owner,actual host startup,generic workflow phases and immutable controller checks PASS.
- Performance fixture adaptation now uses the shared Workshop command and current state root.
  One Downtown smoke report archived; repeated suites timed out waiting for the second opaque frame's
  ready acknowledgement. Cause unconfirmed; no measured baseline or optimization claim. Temporary
  diagnostic changes were reverted. Normal merged editor all19 Play did not reproduce that timeout.
- Remaining:ordinary controller/story/security tails,complete typed scene/world/entity coverage,
  final lifecycle/communication/removal audit,six measured workloads and all G0-G13 signoffs.
- Published checkpointee8cc6a73bde1cce87654d3e18444f40f8370d36:main and production remote SHAs
  verified equal. Production homepage39297355040 and design39297355309 deployments succeeded;
  main homepage check39297355704 succeeded. Publication does not sign the remaining goal gates.

Next unpublished authoring slice:
- Fully editable native binding contracts now permit removing an original command after all source
  references have been rebound. Dangling references still refuse atomically; existing command IDs
  retain their invocation permissions. Fixed-binding contracts keep their original command floor.
  Native scalar identities and existing vocabulary protection remain unchanged pending removal of
  external native/story consumers. Actual typed creation/rebinding/removal, pending manual/signal
  execution, protected Save/fresh shipping import and byte Undo PASS:
  .scene-system/rebound-command-removal-7cneBV. This removes an editor restriction; default gameplay
  source and outcomes are unchanged.
- Yard ordinary rules now live entirely in shared commands/queries/deadlines:collection membership,
  bounded optional text lookup,one readonly SceneTime sample per transaction,session hatch expiry and
  checkpoint reset preserve864 original cases and33 timing histories. Native gameplay effects and
  derived callbacks are removed; physical presentation and camera hit testing remain. Full typed/
  pending/sourceSave/fresh import/byteUndo PASS:yard-full-save-sHAgNB.
- Finite physical and guard-success inputs dispatch source-owned system commands through the existing
  interpreter. Static origin validation and runtime provenance reject ACT/items/otherguard/system
  bypasses. Stacks landing state/reward/reply tails moved to source;288 original histories preserve
  physical/state/reply scene-time/goal order.16 extra coalescible redraw notifications are documented,
  not claimed identical. Typed pending/sourceSave/fresh import/Undo PASS:stacks-permission-save-9X8ytj.
- Controlled grants and collection membership now accept existing scalar reads. Prospective finite
  label/select/enum outputs must all name actual pending Registry metadata; missing/unassociated
  contexts reject. Runtime uses the same draft and checks canonical metadata before committing.
  Typed selectors,actual Game root,Save/fresh shipping/Undo PASS:controlled-target-save-7V7sat.
- Committed replies may reference a validated static source line and use the existing native formatter
  after state commit. Dynamic postcommit line lookup is deliberately not accepted. Actual typed source/
  speaker edits,reply state/receipt,invalid-ref rejection and paired Save/fresh import/Undo PASS:
  committed-source-lines-aAuSfh. Existing inline/template controls remain.
- Downtown Registry and billboard native grant/timer bodies are removed. Source label queries own
  targets, freshness, captions and boolean lamp/status queries; peer and parallel billboard callbacks
  preserve128 original and128 published-feedback histories. Typed pending/sourceSave/fresh import/
  Undo PASS:downtown-registry-save-sweAfC. DLV ordinary tails remain open.
- Train unpaid count/refusal logic now uses an exclusive ordinary noun command step with actual
  interaction/signal permissions. Shared remainder reads preserve negative/fractional JS semantics.
  840 original histories and672 existing door histories PASS; typed paired Save/fresh import/Undo:
  train-command-save-YKg6rr. Paid motion/wording,halt reporting and harbor unlock remain open. At the
  existing MAX_SAFE numeric boundary the engine refuses overflow atomically; this is an explicit
  bounded difference from the original unrestricted increment, not a claim of boundary parity.
- Native session disposal now clears owned verb/eligibility callbacks and restores its prior
  authorization callback. check-native-session-disposal.mts proves20 repeated real model/session
  replacements, manual/signal progress, replies and idempotent release. Whole G5 remains open.
- Performance startup failure reproduces with the full private-frame payload kept alive for3seconds
  WITHOUT constructing a Game, then removed. The second HTML response completes but does not parse.
  Immediate replacement passes. Underlying browser lifecycle cause remains unresolved; no engine
  rendering change or six-workload baseline is justified. See PERFORMANCE-STARTUP-DIAGNOSIS.md.
- Capsule physical boot/reboot timers report a declared milestone; source owns readiness and the
  online caption. Obsolete controller online-text alias removed.108 immutable timing histories and
  existing1728 histories PASS; actual typed pending/Save/bundle/fresh import/Undo:
  capsule-router-online-save-8LHluu. Success has one extra redraw notification; exact caption times,
  state, timers and native goal/event order remain preserved. Thermal integration stays native.
- Existing handoffs now support finite presentation:end through the actual Game/SceneHost, using the
  same postcommit interpreter. Goal/caption/END ordering, refusal, missing-host rejection, disposal
  and non-replay on reload PASS; typed pending/sourceSave/fresh import/Undo:end-handoff-save-IjLi10.
  No source gameplay flag is converted into a persistent screen-takeover state.

Integrated checkpoint ready for publication,2026-10-19:
- Source377ff1fccc6c5374f2826002acd7e2b239e6af02af0a04f717f16a91168606f9:
  both builds and package TypeScript PASS. Raster173/173 PASS,zero differing pixels/errors:
  .scene-system/all-game-pixel-check/evidence/377ff1fccc6c5374f2826002acd7e2b239e6af02af0a04f717f16a91168606f9-1792434878052.json.
- Actual built public editor app-TWIUVSIB.js/native Play play-APE4UOCP.js:all19 scene startups,
  actual scene-state IDs and Stop iframe disposal PASS; no application console errors. One unrelated
  Chrome-extension connection error is recorded separately. Evidence:
  .scene-system/all-scene-source-checkpoint/native-play-19-app-TWIUVSIB.json.
- Downtown DLV access/refusal cases and sign pulse/grant/text are authored.64 immutable histories,
  causal feedback/full observable old outcomes and actual typed pending/Save/fresh import/Undo PASS:
  downtown-registry-save-qpVqbm. DLV mechanical scan/completion/finale tails remain open.
- G1/G2/G3 now PASS from explicit source/callsite/corpus audit and focused actual-runtime tests;
  docs/reference/COMMUNICATION-ACCEPTANCE.md records exact scope. Starting inventory bookkeeping,
  full authoring/world/controller/lifecycle/preservation/removal and performance gates remain open.
- Published as ad90b797a9ac67f7205e39dd9c40c0d237810be4 to main and production; both remote
  SHAs verified. Production design39303802957 and homepage39303803148 deployments succeeded;
  main homepage39303803044 succeeded. Publication is a checkpoint,not full goal completion.

Next unpublished consolidation:
- Downtown started/scan/door/completion/finale commands and END handoff are source-owned.115
  immutable histories with200 sampled trajectory frames each PASS,including outward completion,
  current-lock changes after the door sample and already-end no extra goal. Actual Game/Host END,
  typed conditions/inputs/caption edits,paired Save/fresh shipping/Undo:1tboUF Registry evidence.
- Stacks alarm/return/state/status text use source commands and select queries.288 histories and21
  return timelines with101 frames each PASS; exact1900ms return and visible alarm timestamp retained.
  Extra commit redraws are explicit (old597/current643 across288 histories). Source Save/Undo:
  stacks-permission-save-MLxxpj. Lift-start,scan and watchdog/circuit/trace remain native.
- Explicit native `{query:id}` tokens use the existing query reader and reject dangling references
  in prospective text/status/captions. Unqualified legacy placeholders retain their semantics.
- Train halt/resume/location wording and harbor flag now use source inputs/commands and labels;
  188 immutable live histories,672 door and840 unpaid histories PASS. World-role renaming uses actual
  declared flags; Play fixtures use actual pending flags/keys/programs,without old-name aliases.
  Typed/grouped Save/pending/fresh shipping/Undo:train-live-save-xBgoWH. Paid response selection remains.
- Interaction authoring adds outcome/carried-item CRUD/reorder,guarded rotation and purchase binding.
  Typed pending runtime/quote/purchase,history/bundle/protected Save/fresh registry/Undo PASS:
  interaction-crud-9qeVL6. Exit requirements now resolve pending Network metadata; actual Game access,
  typed picker,new-scene contexts,fixture vocabulary,atomic rejection and paired Save/fresh import/
  byteUndo PASS:pending-exit-keys-A0PjhW. Current catalogue check:run-CcvvJX; Network Save:run-XiUt29.
- Full source-bound build/raster/editor integration for this new batch remains pending.

Additional unpublished editor proofs,2026-10-19:
- Native target metadata in Capsule,Beach,Sandbox,Moth,Yard now validates against actual pending
  devices/gameplay/network at assembled-reference validation. Actual typed/runtime checks in all5,
  paired16-document protected Save,bundle,fresh shipping import and byteUndo PASS:
  native-target-context-save-eage0B. Target collection/route CRUD remains separate work.
- Presentation cue collection add/remove and event/artwork rebinding use the registered scene's
  readonly presentation vocabulary. Actual typed controls,committed Game event/native art reaction,
  duplicate/missing target refusal,history/bundle/Save/fresh shipping/byteUndo PASS:
  presentation-cue-crud-5Q7PHv. No new renderer or persistent cue owner.
- Pending exit-key proof rerun after metadata integration PASS:pending-exit-keys-rLJmn1.
  City typed controls,Opening source Save(run-vWnM76),Cinematic pending Save(run-QGT4v4) and
  world/map19scene/17place/14invalid-reference/37open-callback checks PASS. Full G11 remains open;
  City/Metro grouped Save currently expose a Yard dialogue-assembly regression in the next device
  editing slice. Repair is assigned before integration; do not count those failed runs as evidence.

Follow-up editor/runtime verification:
- Yard dialogue assembly repaired from the actual shared conversation source,without weakening
  validation. City source Save(run-Xn1tcT) and Metro source Save(run-QsiVgK) now PASS. Metro's old
  fixture supplies an actual SceneModel for Train source labels instead of an empty object.
- Native target CRUD is proved in all5 registered-capability scenes,including a completely blank
  target collection,actual Host routing,typed conditional routes/steps and15-document Save/fresh
  shipping imports/byteUndo:native-target-crud-save-phqjxa. Blank source exposed and removed the
  obsolete Yard PARCEL export/Game startup historic reward repair; no compatibility replacement.
- Beach/Yard endpoint editing:beach-yard-endpoint-crud-VAWkr2. Library ordinary device rebind/delete,
  actual model/frame/action,network dangling-reference rejection and Save/fresh shipping/byteUndo:
  library-endpoint-crud-9nhnuv. Its original puzzle reward layout is content,not a native permission.
- Train endpoint editing:train-endpoint-crud-7W4fU2. Only the actual native position/brake roles and
  emitted tunnel/siding/stopped events are intrinsically required; the old geometry marker and
  ordinary nouns are editable. Actual bound-world geometry,typed controls,Save/fresh shipping/Undo
  PASS. Existing Library geometry/content and general19-device-source checks PASS.
- Shared transactional wire/trace actions and Stacks repair use the existing canonical Model owners,
  one ephemeral per-dispatch draft and the existing commit interpreter. Rollback,eligibility,staged
  reads/locks,currentSave/reload and typed ordinary-catalogue Save/fresh import/Undo PASS:
  scene-domains-save-bD4ELU. Stacks480 watchdog histories and source action edits:
  stacks-permission-save-9e3YN1. Full integrated preservation for this batch remains pending.
- All10 former native device-floor inventories are now declared; central historic ID/noun/state
  floors and ID-filtered geometry are removed. The unused device-contracts JSON/capture generator
  are deleted. General19 source checks prove native spot projection does not overwrite authored
  device content. Default10 schema/projection/original-cable checks PASS after replacing their
  obsolete "first original node is always mandatory" assertion with actual primitive requirements.
  Capsule/Sandbox final endpoint/rebound Save proofs:lepyU3 andwJ63aU. Stacks final proof:TriYhO,
  including renamed circuit alarm reaching the actual native flash. Full G10 remains open.
- check-session-commit-disposal.mts first reproduced stale notifications after synchronous disposal.
  Session notification delivery now respects disposal and immediate unsubscription; handoffs cannot
  schedule new delayed work after their takeover disposes the owner.20 repeated cases,grants/domain
  notices,committed-state retention and afterCommit disposal PASS. Existing100-cycle shared handoff
  and domain atomicity checks PASS. This is focused G5 progress,not complete lifecycle acceptance.
- Read-only G11 audit found one concrete remaining ownership gap: map admission/gate paint still
  used flags.end after the corresponding authored exit requirement changed. The pending-world fix
  is in progress; world/story acceptance must not be signed from startup-only evidence.
- Map access now uses authored City policies referencing actual scene exits. Game/preview resolve
  normal flags and keys through the same access helpers; quick travel and gate paint use the same
  policy. Focused typed/runtime/renderer/bundle/Save/fresh/Undo proof:world-access-policy-yOnbB3.
  Original City access/knowledge/map-action checks PASS. Final G11 source-bound signoff is pending.
- Fully editable native contracts no longer require all historical vocabulary,state declarations,
  command permissions or fixed source cables. Actual registered scalar inputs and current graph
  references remain strict. Library renewal state/read/status/action/conversation replacement,
  typed permission checks and source Save/fresh/Undo PASS:editable-native-contract-L25yhP.
  Remaining scene-specific purchase/conversation/HarborShift floors are explicitly still open.
- Obsolete source default inheritance is removed. Optional actor reaction/appearance overrides,
  companion and environment settings stay removed; incomplete manifests/actors reject. Typed
  controls and actual native/sourceSave/fresh import/Undo:source-removal-SeWPuh. Default17 bot
  identities/reorder progress and native Library actor Save(run-ELXSim) PASS. This changes explicit
  source editing behavior; default shipping scene documents retain their original identities.

## Market source dependencies after checkpoint B

Market no longer restores `end` or floors the old cook cursor. Actual typed deletion, coherent
exit/cursor rebinding, pending conversation progress, grouped Save/fresh source/history/bundle/Undo
PASS in `.scene-system/market-editable/run-6me5KT`. Original14 interaction cases,20 NPC page cases
and64 paint transcripts pass. See docs/reference/MARKET-EDITABLE-STATE.md for exact scope.
This is local post-edc6007 work; no whole-scene gate is promoted.

## Opening milestone shared commands after checkpoint B

Six source milestone bindings now dispatch shared system commands against the common Game port;
the old direct flag/keyring writes and standalone UPLINK_KEY field are removed. Typed nested
command/reward/condition editing, command rebinding/removal, actual Game behavior, event handoffs,
private instance separation, bundle/history/protectedSave/fresh shipping/byteUndo PASS in
`.scene-system/opening-workflows-CtaNY0`. Default42 controller/timing/paint comparisons and64
phase/resume histories pass. See docs/reference/OPENING-WORKFLOWS.md for precise remaining scope.
No full gate promotion; this source follows published edc6007 and needs integrated preservation.

## Shared commerce authoring after checkpoint B

Laundromat no longer requires the original soap purchase/command/use binding or SUDS graph ID.
The real typed purchase editor now adds/copies/removes purchases, goods and rotation entries.
`.scene-system/laundromat-source-policies-WCTcFY` proves typed commerce/daemon rebinding and full
ordinary-graph removal, pending native behavior, guarded resource outcomes, bundle/history,
two protected Saves, fresh shipping imports and byte Undo. Default75 soap cases,2592 washer
cases/28 timelines,24 breaker cases and576 jacket cases pass unchanged.

Shop removes only historical catalogue/command/route/rotation floors; shipping JSON is unchanged.
`.scene-system/shop-source-owned-dWvbk7` proves48 immutable histories with12 attempts each,
actual typed replacement and complete deletion, conditional nonrotating routes, quote/charge,
refusal/persisted rotation, pending/bundle/history/protected Save/fresh shipping/byte Undo.
Neither slice promotes whole-scene or whole-editor acceptance; dynamic native dialogue and
remaining common conversation structure controls are subsequent work.

## Harbor Shift source freedom and retained presentation primitive

Historical vocabulary/graph/accept-choice floors and the mounted synthetic Harbor lab were
removed. Registered scene gameplay now uses the normal shared typed editor and native Play.
Typed presentation flag roles and independent source day rules drive actual artwork/carry and
Game clock; absent mappings/time/day stay absent instead of restoring canonical defaults.
Source Save proof `.scene-system/shift-editable-save-5cRNld` includes actual typed graph/choice/
command removal and rebinding, pending execution, bundle/history, atomic invalid references,
fresh shipping Game day/clock behavior and byte Undo. Default2048 carry/objective/time/day cases,
768 visual snapshots,48 actual Game interactions and1100 immutable pilot cases PASS.
A source-only off-duty reissue condition fixes an original migration omission found in case326;
the original baseline is unchanged. See docs/reference/HARBOR-SHIFT-AUTHORING.md.
All of this remains local after edc6007 and requires a new integrated preservation checkpoint.

Opening source Save also PASSes independently at `.scene-system/opening-story-save/run-nb5a0Y`.
The current progress verifier reports19 registered scenes,97 documents,58 source actor bindings,
17 bot bindings and zero legacy conversation rows; it correctly reports fullGoalComplete:false.

## Further source-authoring verification

Native dialogue metadata now projects currently declared graphs in source order, with actual
device bindings validated against the shared conversation runner. Historical graph names no
longer constrain six native scene factories. Typed node copy/rename/remove and redirect/entry
controls are integrated. `check-native-dialogue-source.mts` PASS at
`.scene-system/native-dialogue-source-X88l8o`; all eight frozen metadata/default regressions and
the conversation-structure check also PASS. Poisoned display metadata cannot execute rewards
or replace shared-session dialogue behavior.

Play fixture state now uses prospective declarations, including newly authored ordinary scenes,
nullable/decimal/enum values and bounds. No historical state keys are appended to explicitly
empty pending vocabularies. `.scene-system/pending-fixture-state-nLLFAP` records typed controls,
atomic reference failures, grouped Save, fresh shipping Game state and byte Undo.

Motion-controller configuration and ordinary Stacks lift/scanner replies passed typed editing,
Save/fresh-import and default preservation checks. See docs/reference/MOTION-SOURCE-AUTHORING.md
and `.scene-system/motion-controller-source-MdU0mF/evidence.json`.
Opening workflows passed again after integration at `.scene-system/opening-workflows-MsuG1Z`.

The integrated c58679885211 raster checkpoint passed all173 cases with zero differing pixels
or render errors, archived in `.scene-system/all-game-pixel-check/evidence/`.
A subsequent public-entry-only change disables HTTP caching of stable documents/sources URLs;
the previously failing public editor loads successfully after that change. Source839777ab5e10
has both builds and TypeScript passing; all19 native Play/Stop and the six-workload/three-repeat
suite PASS. Checkpoint C records the formatting-only publication identity separately. G6 is
signed at that checkpoint; full scene/editor/lifecycle/removal gates remain open.

## Camera and visual source continuation

Yard/Downtown camera bindings and Moth/Beach procedural-picture state/value/clock inputs now
have finite typed source controls, actual native consumers and atomic validation. Optional
removal stays removed; fixed Moth/Beach state floors are deleted. Both builds,120 original
visual snapshots,60 immutable Beach drawing comparisons,512 Beach workflow histories and the
173-case browser raster check PASS at source50dca405499f. Actual packaged Moth/Beach native
Play/Stop also PASS. Scope and Save/fresh-import/Undo artifacts:
docs/reference/CAMERA-VISUAL-SOURCE-AUTHORING.md. This continuation is local after dbf8dec.
Yard/Downtown world-picture inputs and the final controller/scene acceptance inventory remain open.

## Yard and Downtown picture continuation

Yard now reads state/query/deadline/slot/anchor/place/easing parameters from its registered
source controller. The slide picture reads the same shared deadline definition and progress
stamp as the executing program. Typed slot creation and artwork rebinding are integrated.
Historical required-picture IDs are removed; real controller/manifest references validate
dependencies. Yard artwork is marked presentation-only, and unused fixed tray/exit exports
are removed. `.scene-system/yard-controller-source-moaari` verifies replacing/deleting the old
tray, matching elevated pickup metadata, native motion and shared deadline progress, strict
reference rejection, pending/history/bundle/protected Save/fresh shipping and byte Undo.
The 864 immutable grab/drop cases and33 timing histories and native pose checks also PASS.

Downtown picture state/truthy reads, lock comparison, trace device, sign duration and pulse
target now have typed source bindings inside the existing motion controller. Billboard and
camera pictures consume one camera-feed binding, avoiding duplicate feed predicates.
`.scene-system/downtown-visual-source-4C1rXK` verifies actual drawing changes, shared trace/event
execution, optional removal, strict references and the same Save/fresh-import/Undo path.
143 frozen Canvas-command comparisons and actual Game DLV/END/lifecycle checks PASS.
Old composition test fixtures now use current source actors and supply both documented
reference/current pulse stamps; no original expected artwork or source capture was changed.

These changes are local after dbf8dec. A further source scan found remaining direct picture
inputs in Laundromat and Sandbox, plus Market's fixed exit-open flag. Those are the next bounded
binding migrations before the final integrated browser/coverage audit. Capsule's temperature/
steam reads are outputs of its retained registered physical algorithm, not ordinary quest state.

## 2026-10-20 integrated picture-input checkpoint D

Source `55ba9a26bd958a15be6df6146568aa24802a6d8ed08c6ced86b33c866ee080d4`:
TypeScript and both builds PASS; all173 browser raster comparisons have zero differences;
all19 actual packaged native Play/Stop checks PASS with no console errors.
See [checkpoint D](./docs/reference/ENGINE-CHECKPOINT-2026-10-20-D.md) for artifacts and exact scope.
Laundromat/Sandbox typed picture inputs now survive actual forms, pending runtime, bundle,
protected Save, fresh shipping import and byte Undo (`laundry-sandbox-picture-source-C7Hykt`).
Market typed visual flag and reference-preserving former-wall removal pass (`run-iSFwKV`).
109 Sandbox ordinary cases, 2592 washer deadline cases plus28 timelines and24 breaker cases match
immutable outcomes. G4/G8/G9/G10/G12 advance in scope; their whole-goal gates remain open.
Remaining: full matrix/inventory reconciliation, remaining native geometry/content dependencies,
world/network/lifecycle/current persistence and final removal/handoff acceptance.

## 2026-10-20 Sandbox artwork geometry follow-through

Typed Sandbox window/reset roles and station zone/sign/card bindings now replace fixed-ID
geometry floors. Window clipping/visibility and station labels use current bindings; the actual
reset interaction follows elevation. The former reset artwork can be deleted after reassignment.
Clearing controller geometry requires removing its dependent reset target atomically; absent
roles do not restore the original IDs. Target creation disables when no anchor is available.
Unused shipping SB/STATIONS/width/layout exports removed; legacy kernel fixture parameters
now live only in the existing test. Nested artwork also receives validated visual bindings.

`check-laundry-sandbox-picture-source.mts`: PASS, artifact
`.scene-system/laundry-sandbox-picture-source-1trIMk`; actual typed geometry plus native target,
clip and label assertions, bundle/protected Save/fresh shipping/byte Undo. Package tsc, both
builds, check-sandbox (including nested picture), 109 Sandbox ordinary cases and all five native
target CRUD/form cases PASS. Source `2eaee9414bcf3f988730765ecf579ca0b62d408eac2fe3edb3282edb23dc444b`
passes all173 browser raster comparisons with zero differences/errors. Actual current-package
Sandbox native Play/Stop passes with no warning/error logs. Publication status is reported separately from this local evidence.

The remaining geometry audit found fixed-ID floors in Capsule, Moth, Beach, Library, Warehouse,
Downtown, Stacks, Harbor/Shift, Mall, Shop and transit compositions. These are not all removable
scenery: some feed width, shade, clipping, covers, physical anchors or actor parents. Replace
those real dependencies with typed source roles before removing floors. Do not merely delete
validation or introduce another runtime state owner. Whole-goal gates remain open.

## 2026-10-20 shared artwork role contract / Warehouse

A shared stateless manifest.artwork contract now resolves registered typed artwork roles from
pending composition rows. Warehouse orientation, front shade and shadow widths use it; replaced
fixed-ID/type floors are gone while real dependencies remain validated. The Scene inspector now
also edits scene-width artwork/property references. Source transaction and actual mounted-form
proof PASS (`artwork-role-source-ADDuq3`), including native changes, former-wall removal, explicit
feature disable, fresh shipping import and byte Undo. All36 original Warehouse draw-command
comparisons PASS; ten original interior outcome cases and current-format reloads PASS after
repairing obsolete raw-source equality expectations. Both builds and tsc PASS. Source90acba454a99
passes all173 browser raster cases with zero differences/errors and actual native Warehouse
Play/Stop, no warning/error logs. See docs/reference/ARTWORK-ROLE-AUTHORING.md.
Whole-goal acceptance remains open; apply the shared contract to remaining real geometry floors.

## 2026-10-20 Library / observation cleanup integrated checkpoint

Library orientation now uses the shared registered artwork-role contract. Its picture reads the
same catalogConnected observation as authored native behavior, so rebinding the observed node
changes the actual indicator without a second node predicate. The historical room-ID floor is
removed; actual width/attachment/actor references remain checked. Removed canonical observation
backfills in both source validation layers and the redundant Sandbox raw-dialogue normalization.
Absent optional data stays absent; actual dependent references reject rather than resurrecting
shipping definitions. No historic save conversion or new saved owner was added.

Actual mounted Scene/Device controls, pending native picture outputs, bundles, protected Save,
fresh shipping import and byte Undo PASS: `artwork-role-source-koAtFX` (also earlier BhMebC/J50aTN).
Library default geometry/bindings/gameplay checks PASS. Native observation checks PASS128 original
cases plus actual typed operations, absence/no-backfill and current-source collision checks;
Sandbox ordinary109 cases PASS. Package tsc and both builds PASS.
Source `759699b704f147207a2868596cd327ac977e81c842342433a203fe997275b5d3` passes all173
browser raster rows with zero differing pixels/max delta/errors, independently verified.
All19 actual native packaged-editor Play/Stop checks PASS with no warning/error logs;
`.scene-system/evidence/editor-native-play-759699b7-20261020.json` records exact package identity.
Default command/core behavior gates are bounded here; remaining all-game gates remain open.

## 2026-10-20 Moth artwork-role continuation

Moth's orientation, desk surface and native door now resolve shared typed manifest roles.
Former fixed-ID floors, static width/door/facing helpers and the redundant base definition are
removed. Actual source replacements can delete the old desk/door after reanchoring children;
real elevated target and desk height follow the new artwork. Interaction roles reject unsupported
transforms/depth and out-of-scene anchors; valid choices are filtered in the actual inspector.
`artwork-role-source-Ct9TGB` proves the three-scene typed form/native/bundle/Save/fresh import/Undo
flow and invalid-edit atomicity. Moth defaults, ten interior outcomes/current-format reloads,
TypeScript and both builds PASS. Latest source67428f2c6ed0 has173/173 zero-difference/error browser
raster cases and actual Moth/Library/Warehouse native Play/Stop, no warning/error logs. Actual
Moth Scene inspector exposes width binding and all three artwork-role selectors. Earlier all19
Play evidence remains bound to source759699b704f1; do not relabel it as latest-source evidence.
See ARTWORK-ROLE-AUTHORING.md. Whole-goal gates remain open; remaining geometry contracts and the
all19 inventory/lifecycle/current-save/world/network/removal audit still need completion.

## 2026-10-20 Beach geometry role checkpoint

Nine shared typed artwork roles replace Beach's blanket prop identity/type floor. New source
references drive horizon/water, sightlines, drink/shore and the real elevated stairs. Existing
exit/attachment/actor refs remain strict. Optional absent bar input disables its visibility/width
without restoring old IDs. Unused shipping layout/width helpers removed; retained edge helper
reads the current stairs role. Actual form/Save/fresh shipping/Undo proof `artwork-role-source-d2f0nS`
passes after deleting former geometry and rebinding the real dependent exit. Original Beach60
Canvas-command and512 model/session history cases pass, as do tsc and both builds. Source5f5cb79b3c7c
has173/173 zero-difference/error browser raster cases and actual native Beach Play/Stop, no warnings.
See ARTWORK-ROLE-AUTHORING.md for exact scope. Beach's fixed bartender/ashore actor-role branches are
still open; expose their references through shared scene presentation rather than claiming scene
completeness from geometry alone. All remaining whole-goal gates stay open.

## 2026-10-20 Beach actor references / shared CRUD

Shared scene.presentation now exposes typed source actor-role references. Beach bartender and
ashore membership no longer depend on old IDs/prefixes. Danger remains the existing sole visual
state read. Shared duplicate/remove operations inherit group membership and prune removed refs;
actual UI, native pose/kit output, invalid refs, optional removal, source Save/fresh import/Undo
PASS (`beach-actor-role-source-4MPOcw`). All19 actor CRUD/history/bundle/protected Save/native reload
checks PASS (`actor-entities/run-5XGdEn`), Market shared presentation PASS (`run-Uty2SN`), Beach60
original drawing and512 gameplay/timing cases PASS. Removed redundant LIME/draw helper/global GULL
state and preview fallback: native scene PresentationSignals is the sole active owner.
Sourcea7aee7d9c0d0 passes173/173 browser raster comparisons with zero differences/errors, both builds,
tsc, actual Beach Play/Stop and actual actor-role inspector controls. No whole-goal gate promotion.
See SCENE-PRESENTATION-ACTORS.md; next Shop's geometry/clipping and actor-role inputs, then remaining
native consumers and the final all19 acceptance inventory/lifecycle/current-state/world/removal audit.

## 2026-10-20 Shop geometry and actor roles

Shop window clipping/counter sightlines now resolve shared typed artwork roles; keeper/outside
membership uses source actor references. No former geometry or actor IDs/prefixes select behavior.
Shared actor creation/duplication emits the optional registered clip binding, so new outside actors
receive the same clipping as shipping actors. All shop art kernels are presentation-only consumers;
real manifest/actor/attachment references still validate before replacement or deletion.

Actual Scene forms, duplicate/removal, scaled replacement window clipping, culling, deletion of
former window/counter, explicit optional absence, invalid-edit atomicity, portable bundle, protected
Save/fresh shipping import and byte Undo PASS: `shop-actor-role-source-p3asuo`.
Default Shop four Canvas-command comparisons, twelve cyclic purchases and36 refusal/no-mutation
cases PASS. TypeScript and both builds PASS. Source04c1aa71e826 has173/173 browser pixel comparisons
with zero differences/errors, independently verified. Actual packaged Shop native Play/Stop and
geometry/actor inspector controls PASS without warning/error logs. Package app-KDYDPDLP.js /
play-QWKO4ICL.js / play-a92368162884aec8.html. All19 actor helper regression PASS (`actor-entities/run-v1pQT7`); all19 actual packaged
editor Play/Stop PASS with no warning/error logs (`editor-native-play-04c1aa71-20261020.json`). Whole-goal gates remain open; this is bounded Shop evidence, not all-scene signoff.

## 2026-10-20 Capsule artwork-role continuation

Five typed shared roles now own Capsule orientation, desk cable surface, sun extent, cable router
and physical door placement. The broad canonical artwork identity floor is removed. Dependent
attachments, manifest exits, companion perches and native target placement remain validated.
The factory passes actual pending source to the picture adapter; absent optional picture roles
remain absent. Removing the door role rejects because the registered native target needs its
placement. New roles may target replacement artwork; former geometry may be deleted after real
children are reanchored. Removed redundant baseCapsule and old source bed-content backfill.

Actual mounted Scene fields, moved/replaced/deleted artwork, elevated real door target, picture
endpoints/orientation, invalid ref/physical transform atomic rejection, bundle, protected Save,
fresh shipping import and byte Undo PASS (`capsule-actor-role-source-Uo3VDz`). Default Capsule
geometry/device/boot/heat/steam snapshots and ten original interior outcome/current-save cases
PASS. TypeScript and both builds PASS. Source db81f87e1f74e20577d8667acf2a314b30844bd3358bc2e0c6d8069b971f80fd
passes all173 browser raster comparisons with zero differences/errors (independently verified).
Actual packaged Capsule inspector and native Play/Stop PASS, no warnings/errors. Package
app-3ZSBGOBC.js / play-4ZEX4BOK.js / play-d0be40f1038b0789.html. The previous all19 Play proof remains
bound to source04c1aa71e826. No remaining whole-goal gate is promoted by this targeted continuation.

Capsule controller persistence proof also PASS (`capsule-controller/run-paLuCP`): changed shared
state declarations and native controller role refs, exact boot+notice timing, current snapshot
scratch clearing/callback cancellation, companion binding, invalid device rejection, grouped
history/bundle/protected Save/fresh module import/byte Undo. Updated stale fixtures to declare
state in gameplay and use current controller text/device fields; original timing assertions remain.

## 2026-10-20 Mall geometry continuation

Mall atrium dimensions and escalator motion use two shared typed artwork roles. The broad former
artwork ID floor is removed; actual manifest/actor/attachment dependencies remain checked. Nine
unused layout fields and their lookup dependencies were deleted rather than exposed as spurious
controls. Scene width comes from the shared manifest; moved elevated escalator geometry drives real
rider positions. Missing required motion roles and unsupported physical transforms reject before
history/source commit. Actual Scene selectors, replacement/deletion of former room/escalator,
adaptive floor and escalator native poses, invalid-edit atomicity, bundles, protected Save/fresh
shipping import and byte Undo PASS (`mall-actor-role-source-g546tY`).

Original Mall77 poses, six people, native interaction coordinates, booth attachments and adaptive
floor cases PASS; tsc/both builds PASS. Source8235dad37ca6a8bacd3952dea67e65040a43fdd2c11259a2bac3917f575ea664
passes173/173 original browser raster comparisons with zero differences/errors (independently
verified). Actual packaged inspector fields/native Mall Play/Stop PASS without warnings/errors;
app-36ASNHAE.js / play-BHX7EADN.js / play-985a12552f05d6c5.html.
Mall actor motion grouping/ordinal phases and embedded-vendor identities still need source contracts;
this geometry checkpoint does not close that scene or any remaining whole-goal gate.

## 2026-10-20 Mall actor-role continuation

Shared presentation now supports validated per-actor slot/phase mappings. Mall adaptive far floors,
gallery baseline heights, escalator phases and both embedded booth vendors are explicit source
inputs with typed Scene controls. Removed old actor ID/prefix/ordinal parsing and booth instance-ID
branches; authored attachment plus registered vendor visual slot determines embedding. Shared CRUD
copies exact numeric settings and removes deleted references without renumbering other actors.
Missing optional presentation never restores canonical IDs. Continuous art timing/paint order stays
with the existing sole Mall implementation; no new state owner or simulation evaluator.

Actual slot/phase/vendor forms, duplicate/removal, noncanonical actor IDs, unbound former IDs,
replacement booth/delete old booth, native elevations/routes/vendor poses, invalid refs/phase/slots,
absence/no backfill, history/bundle/protected Save/fresh shipping import/byte Undo PASS
(`mall-actor-role-source-IhzrYe`). Mall geometry proof PASS (`mall-actor-role-source-O1NvDA`), Beach
and Shop role regression PASS (`beach-actor-role-source-7kNE0A`, `shop-actor-role-source-YhNeUk`).
All19 actor CRUD/Save/native reload/Undo PASS (`actor-entities/run-WyCTmf`). Original Mall77 body,
interaction/booth/height/timing checks PASS, tsc/both builds PASS. Source2992ba89a94c40c8061acf7769869f8572b8f6ec1ea700741aea34864c85f19c
has173/173 zero-difference/error browser raster cases, independently verified; all19 actual packaged
editor Play/Stop PASS with no warning/error logs (`editor-native-play-2992ba89-20261020.json`).
Actual Mall inspector exposes slot/phase fields and vendor pickers. Package app-BDLUXCO5.js /
play-JG6OLUHC.js / play-69c30798feecc0b3.html. Remaining whole-goal gates remain open.

## 2026-10-20 Capsule shared device placement

Capsule's seven native device placements are explicit manifest.devices bindings consumed by the
existing common projectDeviceBindings path in shipping and pending Play. Deleted capsuleDeviceData
and its authoring geometry registry entry; no per-scene fallback finds old marker names. Native
device-scene enumeration now derives from registered definitions with physical devices. Current
layout dimensions remain source-owned; normal missing zero-height metadata is materialized as0.
Actual Device router artwork control rebinds to a new source instance; deleting the old marker
then follows that new geometry in native runtime, portable bundle, protected Save/fresh shipping
import and byte Undo (`capsule-actor-role-source-MRYxoN`). Ten device-source default/primitive/cable
checks PASS with full source context, Capsule boot/notice/current-format reload PASS
(`capsule-controller/run-UKFs3u`), ten interior outcome/save cases PASS. tsc/both builds PASS.
Source3c2235688a3dd90b12605cc08948677e8989a01c043cec3cd855469f44dedbfe passes173/173 browser raster
cases with zero differences/errors (independently verified), and actual packaged Capsule Play/Stop
without warning/error logs; app-OD4X3KIY.js / play-GDHEXZY7.js / play-4f0f47722d7714b3.html.
Remaining nine device geometry adapters still need migration, including property-driven extents
and offsets in Downtown/Beach/Sandbox/Train. Whole-goal gates and final all19 inventory remain open.

## 2026-10-20 Five more shared device-placement migrations

Yard, Moth, Library, Laundromat and Stacks now declare their24 device positions through the same
manifest.devices projection. Library printer height offset is explicit source data. Removed all
five per-scene adapters and authoring geometry entries; default source remains byte-owned by its
normal documents, with no new state owner or old-save conversion. Real device bindings/attachments
still validate; detachment explicitly restores source coordinates rather than silently finding old
artwork. Fixture-only helpers use the shared projector and normalize absent zero-height metadata.

Actual Device artwork fields in all five scenes rebind to replacements, then delete former markers.
Native models observe the changed spots; dangling refs reject atomically; grouped history/bundle,
protected Save/fresh shipping import/byte Undo PASS (`shared-device-geometry-9tc9nJ`). All ten
native device default/primitive/cable checks PASS. The five original geometry/visual fixtures,
interiors10 original outcome/current-save cases, Stacks22 NPC/tea/refusal cases and Yard controller
source proof (`yard-controller-source-LXzjZf`) PASS. tsc/both builds PASS. Sourcead7e72626a906c81000462950bb46ede3ea751c43a0408588d0f09b3f7c53cd7 has173/173 browser raster rows with zero
differences/errors (independently verified). Actual Yard/Moth/Library/Laundry/Stacks packaged native
Play/Stop PASS, no warning/error logs. Package app-O4XKOBGX.js / play-Q4T6C5OV.js /
play-90c93642992aeee9.html. Remaining device adapters: Downtown, Beach, Sandbox, Train (property-driven
size/height inputs). All remaining whole-goal gates remain open.
