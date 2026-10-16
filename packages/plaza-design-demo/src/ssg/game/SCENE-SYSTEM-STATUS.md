# Scene system execution ledger

S0-S7 acceptance complete. Updated 2026-10-16. Scope and completion conditions: [plan](./SCENE-SYSTEM-PLAN.md).

All G1-G8 gates pass. See the [final requirement audit](./docs/reference/SCENE-SYSTEM-FINAL-AUDIT.md)
and [evidence guide](./docs/reference/SCENE-SYSTEM-EVIDENCE.md). The checkpoint and milestone narratives below preserve history;
their earlier open-item descriptions do not supersede the later isolated verification records.

Final delivery is in `.scene-system/development`, with its local composer at
`http://127.0.0.1:4196` (API 4197). Main's working checkpoint/editor at 4192 is untouched.
Final candidate pixel bundle SHA-256:
`042fe7609b2e0af2f960f22bd2e816d20b8298e15a111ab87a78f1464dd11e8c`.
All 17,130 final pairs have explicit image references and independent PNG verification:
489 original scenes, 489 game/editor pairs, 15,308 animation frames, eight map states,
32 harbor prototype cases and 804 taxi frames. All pixel/channel differences are zero.
No further publication, campaign playthrough, art redesign or CI work occurred. S8-S13 remain
planned stretch milestones and are not implemented or included in this completion claim.

## Working editor checkpoint for main

All 19 registered scenes now have validated source compositions and canonical shipping/editor
factories. The source Save allowlist includes these 19 scenes, four sequence compositions and
two timeline documents. Revision conflicts, prospective references, bound identity, exact journal
undo and shared-catalog additions pass focused checks. Both builds pass for this checkpoint.

`S5-nineteen-final-controller-protocol-parity-20261016.json` records 489 original scene cases with
zero differences. `S6-nineteen-scenes-native-street-fixed-20261016.json` records 372 game/editor
world-frame comparisons with zero differences; Yard now includes its native street underlay.
The latter fixture compares direct world draws with shadows disabled on both sides; it is not
yet evidence for the editor's full in-game shadow context. That stronger check remains required.

`S5-sequence-metadata-full-parity-20261016.json` passes 15,308 animation frames, normal and reduced.
The later SALT/pier/buffer decomposition also passes 15,308 frames in
`S5-salt-pier-buffer-full-parity-20261016.json`, with its exact bundle SHA-256 retained. Useful
furniture, lamps, kiosk, signs and machinery are separate pieces within inherited assembly groups.
Hub, ship, bridge and Galleria sequence internals still require decomposition.

The real map panel is wired to the shipping map renderer and a live validated world index.
`S6-real-documents-world-map-contracts-20261016.json` checks all 19 actual scene compositions,
17 places, 37 scene-open callbacks and 14 rejected invalid world/reference edits. Browser evidence
`S6-world-map-browser-navigation-20261016.json` opens Harbor Shift from Harbor, preserves selection,
and confirms no source revision or player storage changes. The read-only inspection snapshot is
`world/composition-index.json`; the panel derives current references directly rather than using
that generated file as a second geography authority.

Transport markers now bind source train-stop positions to painting, actual boarding targets and
arrival markers; Metro's exit checkpoint follows its authored verification anchor. Focused evidence
is `S5-transport-marker-contracts.json`. Unsupported physical transforms remain explicit.

This is a working checkpoint, not completion of G1-G8. The boundary audit maps 565 original owners
to library destinations, but identifies remaining light/shadow/lamp global context coupling.
An unfinished explicit-lighting refactor was set aside before publication. Large assembly and
metadata refinements, full browser-operation acceptance, the stronger shadow-context comparison
and final evidence/documentation reconciliation remain required. No campaign playthrough or CI
expansion has been performed. The user requested main only; production remains separate.

## Historical milestone progression

S0 is complete. S1's foundation contracts and first assembly checks pass. S2 Downtown extraction
passes all 489 scene/environment pixel comparisons and both builds. No art redesign, publication or campaign playthrough
has occurred. Later milestones and all overall goal gates remain incomplete.

S3 is complete: 23 existing shared modules were moved into art/, 26 visual exports left
scenes/kit.ts, the shared skyline moved to art/environment/, and harbor distance/gull artwork
left scene modules. Character appearance/baking/rendering is separated into art/characters/
appearance.ts; scheduling, pose evaluation and dialogue remain in characters.ts. All 489
scene/environment fixtures and 32 actual harbor-prototype fixtures still match the originals.
Full animation parity replay after these moves passed all 15,308 frames with zero mismatches.
Both builds passed again. S3b directory/logic organization passed its verification checkpoint.

S4 extraction has passed combined 489-scene and 32-prototype parity after moving the remaining
scene artwork, runtime sky traffic/player/companion appearance, metro/train drawing and animated
presentation artwork into art/. Transit simulation retains 28 verbatim declarations and matches
96 platform cases, 26,000 ride frames and 66 canvas-command cases. Initial sequence artwork moves
matched all 15,308 original animation frames; taxi-flight extraction matched 804 additional
original/current frames. These stage-specific checks are not the final goal gates.

S5 and S6 are now in progress with user-authorized parallel agents. Library, Capsule, Moth and
Downtown have editable compositions with source-derived geometry and independently placed pieces.
`S5-integrated-native-fresh-scene-parity.json` matches all 489 original scene/environment cases
after these integrations and the shared native frame extraction. The fresh-page capture schedule
matters: a preceding cinematic diagnostic changes initial canvas readback behavior; its two
Capsule mismatches are retained separately in `S5-integrated-native-scene-parity.json` and are not
accepted evidence. Laundromat/Beach/Sandbox and station compositions are the next parallel batches.

Native frame orchestration is shared in runtime/render-scene.ts. The isolated composer preview
provider is being wired to it without constructing Game, accessing player saves, or stepping rules.
The shared contract checks now also exercise structured snapshot validation/copying, strict visual
bindings, native camera identity, absolute clip seeking and hidden-instance paint suppression.

Existing sequences now have composition/timeline documents and native dispatchers. All 15,308
post-decomposition animation frames match the original reference in normal and reduced motion:
`S5-composed-opening-cinematics-full-parity.json`. Its exact candidate bundle is retained as
`S5-sequence-pinned-candidate.js` (SHA-256 recorded in the manifest). The opening currently exposes
151 pieces and the other cinematics 28. Several bounds/appearance schemas are still incomplete;
this passing replay is pixel evidence, not acceptance of G4. Title-zero diagnostics show identical
original/native/composed artwork under the same history and a whole-canvas readback transition
across repeated captures; preserve the pinned reference schedule and failed diagnostics.

Beach has 101 source instances and Sandbox 153. `S5-beach-sandbox-fresh-parity.json` retains eight
initial far-end Sandbox failures. Its extracted tea-table lost the stool's source position; the
stool and plant now follow the authored table. Focused original-command checks cover the failed
cameras, and `S5-nine-scenes-fresh-parity.json` passes all 489 cases with zero differences after
the correction. Nine scene compositions are now integrated; ten scene documents remain.

The real local composer now runs through `pnpm --filter plaza-design-demo compose-scenes`, with
loopback-only source Save. Browser Save moved the Library counter and a fresh runtime import
moved the printer by exactly 20 units; Undo/Save restored the original source SHA-256. Evidence:
`S6-source-save-runtime.json`, `S6-browser-save-undo-reload.json`. The first undo attempt was safely
rejected when an agent added new sequence types after the server started; the test source was
restored byte-for-byte, then the launcher restarted and the complete save/undo/reload loop passed.
Restart after TypeScript/schema changes is documented in authoring/README.md.

`S6-native-preview-rules-differential.json` matches all 103 native-game/editor world-frame cases
for the seven initially migrated scenes, including hack vision and selected state variants.
The extended `S6-nine-scenes-native-preview-differential.json` passes all 172 cases including
Beach and Sandbox. Browser timeline selection and scrubbing render title/intro previews without
errors or changes to localStorage; complete editor-operation acceptance remains outstanding.
`check-native-preview.mts` verifies mirrored/attached selection bounds, inverse dragging,
fractional zoom and weather restoration on render failure. `check-source-authoring.mts` exercises
the real source allowlist, prospective reference validation, conflicts, stable ids and exact undo
in isolated copies. The world/map panel, remaining scenes and complete UI/sequence operations
still need integration and acceptance. No overall gate is complete from these subset checks.

Timeline contracts, local revision-protected Save backend, composer UI/model, and read-only map
preview are implemented as foundations with focused checks. The actual local launcher/preview,
complete scene/sequence migration, Save-to-runtime demonstrations, browser UI verification and
final all-scene/all-frame comparisons remain outstanding. Do not mark the overall goal complete.

## Source checkpoint and local evidence

The repository-root `.scene-system/` directory is deliberately excluded from generated output
and Git. It contains original source copies, baseline PNGs and raw pixel hashes. It is a local
evidence archive, not a substitute for committing implementation sources.

- `baseline/checkpoint.json`: source HEAD and SHA-256 of every copied source file.
- `baseline/starting.diff`: original tracked working-tree changes, including quiet task guidance.
- `baseline/source/ssg/`: original renderer and data; never overwrite with migrated code.
- `evidence/drawing-inventory.json`: initial AST inventory, 63 drawing files / 471 owners.
  Interface/world classification and destinations still need reconciliation.
- `evidence/baseline-results.json`: 372 fixed scene cases across the 19 registered scenes,
  two view sizes, overlapping camera coverage, normal/hack views and selected state variants.
- `evidence/baseline-reproducibility.json`: all 372 cases reproduced identical raw pixel hashes
  in a fresh page. Baseline PNGs exist for each case. This does not establish exhaustive state
  coverage or the remaining weather/map/animation checks.
- Animated capture is in progress, not yet accepted. Original sequences: title (7s), glide
  (78.5s), intro (26s), Act II (16s), normal and reduced motion at 60 frames/second.
- The first complete animation replay found 495 mismatching intro text-card frames. Diagnosis:
  fonts.ready did not request cinematic font weight 500 before capture. No art code changed.
  `animation-reproducibility-initial.json` and `debug-intro-diff.png` preserve the failure.
  Fixture version 2 explicitly loads weights 400/500/600/700; new original-source captures will
  use distinct v2 names. The initial animation run is invalid evidence, not an accepted baseline.
- S1 unit contracts and a two-stool nested assembly pixel check pass (zero different pixels).
  `checkpoints/S1-contract-foundation` retains the foundation before any game integration.
- Accepted v2 baseline: explicit loading of font weights 400/500/600/700. Fresh-page replays
  have zero mismatches across 489 scene/environment cases, 32 actual harbor-prototype cases,
  eight map states, and 15,308 animation frames (60fps, normal and reduced motion). References:
  `v2-scenes.json`, `v2-prototype.json`, `v2-map.json`, `v2-animations.json` and corresponding
  `v2-*-reproducibility.json` files. Static cases have PNGs; sequences have frame hashes plus
  PNGs at one-second intervals. Original sources remain available for any additional diff frame.
- `coverage-inventory.json` includes indirect composition calls: 73 files / 565 owners,
  classified into 60 world files, 12 interface files and one Array.fill false positive.
  It includes import dependencies and proposed library destinations. Raw-operation inventory
  remains separately retained; classification does not mean migration is complete.
- `S0-evidence-index.json` hashes the accepted manifests and original fixture bundle. The
  `checkpoints/S0-verified-baseline-and-S1` checkpoint precedes the Downtown runtime switch.
- S2 moved 14 Downtown drawing methods and their constants/cache into
  `art/assemblies/downtown.ts`, retaining original bodies, coordinates and ordering. game.ts
  supplies the current view and delegates. This is a temporary assembly extraction; useful
  child elements/compositions still need decomposition in S4/S5.
- `S2-scene-parity.json` and `S2-pixel-diffs.json`: all 489 cases match exact original RGBA
  pixels. Before/after/diff PNGs are retained. Both builds passed after runtime integration.
  `verify-downtown.mts` also checks body identity and unaffected runtime methods.
- S3: `S3-final-parity.json`, `S3-prototype-parity.json`, `S3-animation-parity.json` and
  `S3-exact-png-comparisons.json` record matching scenes, prototype states and animated frames.
- Map fixture correction: the v2 map-only fixture used a transparent canvas and DOM-derived
  hit-target size rather than the game's world-plus-map rendering. After shared-kit migration
  those captures were history-sensitive. `S3-final-parity.json` and `S3-map-fresh-parity.json`
  preserve these failures; they are not accepted map parity evidence. Direct original/current
  renderers in one controlled context matched zero differing pixels.
- `v3-map-original.json` is a fresh capture from the immutable original sources, using the actual
  world-then-map order, fixed time/viewport and explicit hit-target size. All eight states
  reproduce in a fresh original page (`v3-map-reproducibility.json`) and match the migrated
  renderer (`S3-v3-map-parity.json`). Exact before/after/diff PNGs are retained. No tolerances,
  masks or art changes were used. Use composedMap, not the diagnostic map-only fixture, onward.

## Gates

### Directory organization checkpoint (S3b)

- Moved 85 modules/data files. All scene packages now live under `scenes/`; root implementation
  modules are grouped into `runtime/`, `world/`, `story/` and `ui/`. Scene device JSON lives
  beside its owner; central data validation remains in place. The two station definitions and
  shared passenger artwork still need separation during S4.
- Split `level.ts` into mode/save, Downtown layout/dialogue/progression and terminal commands.
  Shared scene rule services now use `runtime/player.ts`, removing their Downtown dependency.
- `S3b-module-moves.json` and `S3b-level-symbol-map.json` record ownership changes.
  `S3b-code-equivalence.json` verifies 85 moves and 40 split declarations: no non-import code
  or device-data changes. Type checking, composition contracts, both builds and Downtown
  body-equivalence checks pass.
- `S3b-scene-parity.json` (489), `S3b-prototype-parity.json` (32), and
  `S3b-map-fresh-parity.json` (8) all have zero hash mismatches. The map fixture requires a
  fresh page, as recorded in its reproducibility schedule; running after the complete scene
  suite changes its first frame (`S3b-map-parity.json` retains that diagnostic failure).
- Grouped 11 documents into design/reference/history and updated incoming Markdown links.
  README, agent guidance, roadmap and active execution plan/status stay at the root for
  navigation. `docs/reference/MODULES.md` describes ownership and remaining mixed boundaries.

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| G1 | Pass | `final-boundary-audit.json`: 73 original drawing files / 565 owners mapped, concrete destinations and explicit interface exclusions, zero findings |
| G2 | Pass | Strict drawing/import/state audit; Downtown extraction and S3b equivalence; explicit light/weather/clock context; unused Shop paths removed |
| G3 | Pass | 19 source scenes + four sequence compositions + two timelines; version/reference/binding validation, source-authoring and world/map checks |
| G4 | Pass | Typed contracts, 247 sequence pieces, native/coastal bounds, meaningful assemblies; final Harbor supported-field/range checks and six independent Mall stools |
| G5 | Pass | Final scene/native capture reports plus final-link animation/map/prototype/flight reports: all 17,130 pairs match, decoded images and final source pins independently verified |
| G6 | Pass | Save/body equivalence, physical marker and transport checks, preview isolation, seek/pause/skip/completion and exactly-once handoffs |
| G7 | Pass | Actual static UI across eight categories and attachment/layer tools; source Save/undo/reload/conflicts/failures; two authored multi-shot runtime sequences; read-only native map |
| G8 | Pass | Both final integration builds and whitespace checks pass; audit/evidence ledgers and authoring/agent/module docs reconciled; recoverable source checkpoints retained |

## Reproduction tooling

See [evidence and reproduction](./docs/reference/SCENE-SYSTEM-EVIDENCE.md) for the final pinned
scope, preserved reproducible original bundle, exact image capture and independent verification.
The generic source-reassembled `baseline.html` below is diagnostic; the accepted G5 original
capture uses `baseline-original-capture.html` from the preserved compiled bundle.

### Isolated S7 verification checkpoint (2026-10-16)

Further work is in `.scene-system/development`, preserving the published working checkpoint
and the user's editor at port 4192. The verification editor uses 4196/API 4197. No further
publication is authorized by this goal. Follow-on S8-S13 remain outside its completion gates.

- `S7-explicit-lighting-247-full-replay.json` records all 15,308 original animation frames
  matching the pinned intermediate bundle exactly. Later controller/preview changes still need
  a final rebuilt replay; this evidence does not claim those later sources are pixel-verified.
- `S7-static-browser-operations.json` records actual UI editing across eight required categories,
  real pointer dragging, add/duplicate/delete, property editing, import/export, invalid-reference
  rejection and exact undo/redo/restoration.
- Browser checks found and fixed New sequence selecting the previous sequence because selection
  synchronization ran before the draft committed. `S7-new-timeline-browser-operations.json`
  verifies the new selection, shots/cards/fades/beats/camera keys, easing, frame steps, play/pause,
  bounded looping, exact reverse-seek pixels and reduced-motion replay. All edits were undone
  exactly; this case did not save source data.
- Native-scene timelines previously discarded evaluated text/fades. The shared frame renderer
  now accepts these overlays through a pure library painter. `check-native-timeline.mts` passes
  an arbitrary evaluated sequence through the actual native preview/shared renderer, checking
  interval boundaries, interpolation, scaling, camera-independent placement, reduced motion,
  unchanged static canvas commands and canvas-state restoration. Type checking passes.
- `check-native-preview.mts` passes required weather-field/range checks and nested reporting
  climate restoration, including failures. Complete source snapshots are validated before
  rendering begins.

Fresh-bundle verification subsequently completed with candidate SHA-256
`a1e21d6ab08d4f970fa740f5221c672affee9beb5dcc978232f030f7ed7ee80f`:

- `S7-final-scenes-and-native-editor.json`: 489 original scene cases match; all 489 direct
  game/editor comparisons match, including custom weather and enabled world shadows.
- `S7-final-sequences.json`: all 15,308 original animation frames match.
- `S7-final-map.json`: all eight fixed original composed-map states match in a fresh page.
- `S7-final-prototype.json`: all 32 actual harborShift launch cases match.
- `S7-final-taxi-flight.json`: all 804 direct original/candidate taxi-flight frames match.
- `S7-direct-save-browser.json`: actual UI Save, undo-after-save, saving the undo and source
  reload pass. A second writer causes a conflict without losing pending work or overwriting
  external source. Local player storage is unchanged. Test source was restored to its original
  bytes from its recovery journal after validation that document data still matched.
- `pnpm build:homepage` and `pnpm build:design-demo` pass for these renderer sources.

README, agent guidance, GAME-DATA, ART-GUIDE, MODULES and authoring instructions have been
reconciled with current paths and implementation. Final requirement-by-requirement evidence
reconciliation and remaining targeted acceptance cases are still required. No gate is declared
complete by this checkpoint alone.

Further final audit work:

- `S7-attachment-layer-browser.json` verifies actual owner/anchor selection, local offsets,
  pass/order edits and exact undo. `check-animated-authoring.mts` verifies two temporary
  multi-shot sequences through the actual preview/renderer/playback, shared furniture and
  attached motion, clips/discrete state, text/fades, roundtrip, deterministic seek, reduced
  motion, pause/resume and skip/completion handoff exactly once with no save access.
  The clip catalog is derived from registry definitions by the shared sequence validation
  context and supplied to the real editor; source/prospective Save validation uses that same
  catalog. The integration check uses these actual providers and rejects unknown clip names.
- Preview city-clock binding is now scoped/restored alongside weather/light, including original
  save-reference identity, pin/speed and nested failure handling. All 489 game/editor pairs pass
  again in `S7-clock-scoped-native-editor.json`.
- Removed unused aggregate shop rendering paths; `S7-shop-retained-art-proof.json` verifies
  all 32 retained function bodies unchanged. Both integration builds pass after these changes.
- G5 is still incomplete: full hash replays pass, but final before/after/diff image references
  do not yet cover every case. A content-addressed capture/index is being added; original
  expected hashes remain immutable and must reproduce before any new capture is accepted.
  The capture smoke stopped at original fixture case two: the newly assembled baseline bundle
  fails to reproduce its reference while the older preserved baseline bundle reproduces the
  first three exactly. `S7-artifact-smoke-diagnostic.json` records this distinction and the
  retained failed chunks. Fix the capture fixture/instrumentation; do not replace references.
  Subsequently resolved using the preserved baseline bundle with two read-only insertions;
  removing them recovers the exact original bytes (`G5-original-bundle-capture-proof.json`).
  Actual image capture and independent Pillow verification now cover all 489 scenes, eight
  map states, 32 prototype cases, 804 taxi frames and 489 game/editor pairs. Completion indexes
  are `S7-artifact-{scenes,map,prototype,native-editor}-20261016-v1-complete.json` and
  `S7-artifact-flight-20261016-v2-complete.json`; corresponding independent-verification reports
  check every image file hash, decoded RGBA, expected case id and zero difference image.
  The flight v1 failure retained an incorrect small-screen height; v2 uses the original 240px
  height for 420px width and preserves the expected hashes. Full animation capture and independent
  decoding are now complete: `S7-artifact-animations-20261016-v1-complete.json` and
  `S7-artifact-animations-independent-verification.json` verify all 15,308 frames, 13,305 unique
  PNGs and original/candidate bundle pins. Together the six families cover 17,130 image pairs.
  Final Harbor/Mall metadata corrections identified below require bounded delta evidence.
- A malformed non-ASCII session token could previously throw during constant-time comparison.
  The local HTTP service now rejects non-hex tokens before comparison; its focused check proves
  HTTP 403 and continued valid-session availability, alongside all existing save protections.
- Final independent G4 review identified unsupported Harbor property controls/ranges and two
  stools still embedded in each Mall table. Corrections are underway after checkpoint
  `S7-before-final-harbor-fields-mall-stools-20261016`; current image evidence remains pinned to
  the preceding source until affected-case parity and source equivalence are recorded.
- Save rollback now preserves concurrent outside edits rather than restoring over them, rolls
  back other safely owned files, and retains an ambiguous prepared journal for explicit recovery.
  Focused two/three-file failure and restart checks reproduce the former bug and pass after repair.

From repository root, build the existing homepage first. Then:

```
node packages/plaza-design-demo/scripts/scene-system/inventory.mjs
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/serve.mts
```

The loopback fixture server is at port 4190. `/baseline.html` loads the immutable original
source bundle; `/candidate.html` loads the current working tree. These pages are isolated from
the real game's origin/storage. They suppress the normal RAF loop and provide controlled
fixture rendering. `serve.mts --build-only` rebuilds bundles without restarting the server.

The fixture records one layout pass before capture because the original HUD computes its height
while drawing. All inputs and render schedules must match between original and migrated code.
The original baseline environment is Chrome 155 on Windows, DPR 1.25, loaded IBM Plex Mono,
with explicit canvas size and scale per case. Exact comparison is within that environment.
