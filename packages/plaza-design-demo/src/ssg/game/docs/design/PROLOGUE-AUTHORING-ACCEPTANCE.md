# Prologue and authoring acceptance

Current acceptance record for ROADMAP.md P1–P4, authorized and completed locally 2026-10-26. This is a bounded
verification and repair pass over the implemented engine, not a new migration roadmap.
Publication is excluded. Scratch test outputs are disposable and are not historical fixtures.

## Completion gates

- P1: current world/save fixtures exercise the actual opening, shift and vehicle contracts.
- P2: observe launch, natural glide completion, Harbor work, checkout, boarding, tunnel travel,
  alighting and stairs into Downtown; separately exercise Escape and save/resume boundaries.
- P3: demonstrate the seven editing tasks below, including actual preview/pending Play where
  applicable, application/rejection, Undo and source persistence.
- P4: fix demonstrated blockers through existing owners, remove directly superseded paths,
  update guidance and report behavior, usability and verification separately.

## Runtime behavior observed

In an isolated ordinary Full game browser session (`?play&probe`, without sudo or player placement),
New Game played the glide naturally and released the player at Harbor Station. Normal keyboard
movement crossed the platform stairs, quay, staff turnstile, yard and shed. The supervisor issued
the tag; parcel pickup/delivery, empty-case collection/return, the trolley assignment, clamp refusal,
clamp release, trolley movement, checkout and the wage statement all advanced their actual state.
Checkout credited three tokens. The same run returned to Harbor Station, boarded the service,
crossed the tunnel chunks, alighted in Metro and climbed into Downtown.

The run revealed two product faults, corrected in ordinary source/runtime paths:

- `commute.present` hid the shuttle as soon as the wage statement set `opening:home`, before
  boarding. The shuttle now remains through the home journey; `opening:flat` hands service
  presentation back to the regular line while the player is indoors. `opening:street` at the metro
  turnstile cannot make a visible vehicle/passengers disappear. Both physical floors and artwork
  consume the same presence queries. No extra vehicle simulation was added.
- Seam entry called base arrival narration while door entry honored phase narration. Both now use
  `introduceScene`, including once receipts, touch text and occupied-vehicle deferral. Active phase
  goals take precedence over base objectives. Browser re-entry into Downtown showed the authored
  morning speech and `go home (7B)` instead of the Act I fixer objective.

A separate clean browser session verified Escape ends the glide, releases playable Harbor and
records the completion receipts. Mid-shift reload/Continue preserved the saved chunk and all shift
progress. Existing on-foot saves store the chunk, not exact walking coordinates: Continue uses that
chunk's arrival spawn. This pass does not add an on-foot position persistence feature. Exact occupied
vehicle position, attachment and passenger restoration are checked by `seamless-commute` and
`train-physical-source`; do not describe those fixture checks as an observed browser reload aboard.

## Seven editor tasks

Browser actions used the normal editor controls and source history in an isolated session. Source
editing tests use disposable copies; the publicly served snapshot offers downloads rather than
repository Save credentials. All temporary browser edits were undone and private Play realms stopped.

| Task | Demonstration | Persistence evidence |
| --- | --- | --- |
| Camera key | Opening glide, select the 9-second camera-east key; change X 1952 → 1970. Preview changed; Undo restored the exact previous canvas image and value. Typed keyframe controls were sufficient. | `catalogue-inspector`: actual opening key survives portable bundle and protected Save/reconstruction. `keyframe-editor`, `inline-keyframes`: temporal editing contracts. |
| Chunk placement | Boundary example's independent display chunk, Member X 0 → 40. Its border moved in the correct direction; Undo restored the value. | `composition-workspace` and `catalogue-inspector`: original projected source, bundle, protected Save, native reconstruction and Undo. |
| Connections and refusal | Select the boundary walk connection in the right inspector. A From Y offset of 5 rejected with the draft retained and an explanation. Restore zero and change the From endpoint to the coincident surface.end; Apply and Undo succeed. | `catalogue-inspector`, `world-compositions`, `world-member-editing`, `editor-hit-targets`: source persistence, topology checks and blocked transient/release behavior. |
| Harbor task and dialogue | Select use-boss → Behaviour → Edit conversation definition; edit the first supervisor line. Native private Play displayed the edited line. Scene → first Objective exposes typed text/condition controls; its edited text appeared as the native Play goal. Stop/Undo restores source. | `catalogue-inspector`: real actor/interaction mount, graph link, actual supervisor/objective source, bundle, protected Save/native reconstruction/byte Undo. |
| Train configuration | Service → Vehicle, Door threshold 0.9 → 0.85. Pending native Play runs the actual service. A disconnected route-leg height rejected without changing source. Undo restored the threshold. | `vehicle-authoring`, `catalogue-inspector`: typed route/car/door edits, refusals, portable/protected persistence and actual boarding. |
| Passenger flow | Passengers → Passengers, interval 12 → 9. Pending Play produced live passengers. Interval 0 rejected; valid edits and Undo restored 12. | `vehicle-authoring`, `catalogue-inspector`: real flow compiler, saved interval/appearance, native reconstruction and Undo. |
| Checkpoint | Starting state, morning-commute tokens 3 → 11. Native private Play reported 11 tokens at the authored boarding spawn. Stop/Undo restored 3. | `starting-state-inspector`, `preview-checkpoints`, `catalogue-inspector`: source references, bundle/protected Save, checkpoint reconstruction and Undo. |

The compact Boundary example is used for independent chunk/connection manipulation so those tasks
do not require breaking the prologue's connected geography. It uses the same editor, world compiler
and history. No required JSON step was found in these seven tasks: existing timeline selection opens
typed controls. Advanced whole-sequence JSON and other asset-property debt remain outside this scope.

## Direct repairs and consolidation

- Catalogue actors previously failed Behaviour with `Unknown Play scene harbor-shed`.
  The existing prospective source assembler now accepts the actual catalogue registration, and
  contextual authoring supplies projected composition/devices plus shared declarations explicitly.
- Interaction conversation outcomes now link directly to their existing graph editor, as person
  conversations already did. There is no second conversation editor or runner.
- Scene inspector reads share the model's immutable document snapshot. Existing prospective
  registry results are reused by catalogue/native-target validation and target inspection rather
  than assembling the same scene repeatedly. Full source and commit validation remain enforced.
- Door and seam arrival narration no longer have independent implementations. Obsolete selection
  handle wording was corrected; no resize handles were reintroduced.
- Commute, Harbor-zone and physical-train fixtures now consume compiled world topology for queries,
  current checkpoint references and current vehicle/save contracts. Raw source stays at the runtime
  compilation boundary; assertions were retained and extended to cover the post-checkout service.

## Remaining limits

Final district/landmark choices, opening spacing and pacing remain designer decisions. Routes and
waypoints are typed numeric inspector controls, not a new graphical route drawing tool. The character
body and its separately authored interaction marker can have separate selections; use `use-boss`
for the supervisor interaction and `boss` for its appearance/actor properties. This record covers
the prologue through Downtown, not a full campaign or every possible editor task. Rebuilds require
reloading the editor before starting a new private Play runtime; pending edits should be downloaded
or undone first. No push or deployment is part of this goal.

## Final verification

P1–P4 meet the gates above. The final 22/22 focused checks pass:

- `catalogue-inspector`, `prologue-arrival`, `seamless-commute`, `train-physical-source`,
  `harbor-zones`, `harbor-composition-lifecycle`, `opening-skip`, `opening-workflows`.
- `configured-new-run`, `checkpoint-arrival`, `vehicle-authoring`, `composition-workspace`,
  `conversation-library`, `preview-checkpoints`, `starting-state-inspector`, `contextual-triggers`.
- `editor-validation-snapshot`, `editor-hit-targets`, `numeric-scrub`, `inline-keyframes`,
  `keyframe-editor`, `sequence-command-authoring`.

The separate `native-target-context-save` check also passed its real typed-form, protected Save,
fresh native reconstruction and exact source-Undo cases. Package `tsc -b`, `pnpm build:homepage`
and scoped whitespace checks pass. No approved expected image was regenerated. The browser
camera-key Undo comparison was exact; this pass does not claim a new all-scene visual campaign.

The existing opt-in local performance recorder identified repeated registry/scene assembly in
validation. Sharing inspector snapshots alone did not improve the measured 416 ms objective edit.
Reusing the already validated registry removed duplicate builds; three later edit callbacks took
263.6, 184.5 and 172.9 ms with all temporary changes undone. The recorder's six edit/Undo commands
showed median full validation around 152 ms and inspector refresh around 1.9 ms. These small local
CPU samples are not controlled benchmarks or GPU/display measurements. Full validated source
commits retain a synchronous pause; source validation was not bypassed to improve the number.
Recording was stopped and its opt-in page closed/reloaded for normal use.

The reviewed gameplay data, typed source controls, one renderer/runtime and ComposerModel remain
the implementation owners. The catalogue assembler retains native-only behavior where native
registrations require it; catalogue sources supply their ordinary registered source bundle. No
new renderer, adapter, progression executor, historical fixture or save migration layer was added.
