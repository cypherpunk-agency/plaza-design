# Ordinary controller logic consolidation

2026-10-19. Complements CONTROLLER-MIGRATION.json; this semantic audit supersedes its historical
remaining-field lists where source migrations have since landed. No whole-scene or goal gate is signed.

Ordinary conditions, permissions, state changes, rewards, dialogue and reactions belong in the shared
gameplay model. Moving them to another native function or exposing configuration alone is insufficient.
Delete replaced execution paths. Keep calculations such as thermal integration, movement and collision
in registered reusable primitives; expose inputs and observable events through typed authoring.

## Verified first migration

Capsule `plug.power off` is now a shared native route and atomic command. The original native effect,
its device `on.off` steps and its three obsolete controller text bindings are deleted. Shared routes
support optional manual/signal source selection and explicit `say:null` for silent success. Selection
is identical for eligibility and dispatch; watchdog/lock/seal checks still precede command execution.
The final fallback must cover both sources. Typed authoring exposes source selection and silence.

Scalar state now has one common owner in `Save.gameplay[owner]`; SceneModel directly references that
block. There is no scalar bridge or second scene-state save. The actual immutable-original and current SceneModels agree for on/off initial states, both
input sources, repeated actions, exact replies/speakers/silence and restored saved state.

Evidence: `check-capsule-shared-off.mts`; `check-capsule-controller.mts` (1,728 unchanged simulation
cases); typed binding/controller forms; native conversation parity; network validation;
protected Save/fresh shipping import/byte Undo in `.scene-system/capsule-controller/run-6TE4O0`.

Capsule's door edge reaction, goal conditions and Pixel's delayed selection/wait behavior have also
moved to source queries, triggers and intervals. The thermal simulation samples its physical readiness
at the original tick position. These additional checks cover 1,728 original/current histories and
typed pending execution, protected Save/fresh import/Undo in `.scene-system/capsule-workflow-save-qjR3iY`.
The schedule now uses an explicit `beforeNative` interval on the same scene tick; typed phase edits,
pre-thermal event ordering, protected Save/fresh import/Undo pass in
`.scene-system/capsule-workflow-save-3BbuuD`. Complete scene acceptance remains open.

## Remaining semantic work

| Area | Ordinary behavior to move | Calculation to retain |
| --- | --- | --- |
| Sandbox | Counter/resource commands and ordered environmental reactions migrated with common state | Cosmetic pulse rendering |
| Beach | Rent/end/billing/danger-clear workflows migrated with common state | Existing physical presentation |
| Laundromat | Start/stop, completion, overload and jacket rewards moved to commands/deadlines; full scene acceptance remains | Machine animation |
| Downtown | Till, legs installation, Registry ownership, billboard/peer timers and controlled-status queries migrated; gate and delivery outcomes remain | Delivery interpolation and scanner geometry |
| Yard | Grab/drop, hatch permission/deadline, parcel rewards and camera discovery migrated; final scene acceptance remains | Crane/parcel movement and collision |
| Stacks | Discovery, lift/alarm refusal, lift-kind selection and landing rewards migrated; alarm/return/watchdog/trace integration remains | Trolley/lift trajectories and thermal calculation |
| Train | Pass/door permissions and unpaid refusal alternation migrated; paid responses, halt/resume and harbor unlock remain | Travel/braking/siding geometry and rider motion |
| Harbor Shift | Supervisor conversation and acceptance/tag decisions migrated; verify full lifecycle and common state integration | Existing staging/animation |
| Capsule | Schedule, door reaction, goals, Pixel delayed choices and online readiness/replies migrated; full scene gates remain | Temperature integration, boot timers and companion movement |
| Opening | Flag/reward/phase orchestration currently in Game and opening model | Cinematic playback and camera motion |

The other ten native scenes had no additional imperative scene-rule bodies in this read-only audit.
That does not prove full editor coverage, transport integration, cleanup or all-scene acceptance.

## Contract policy

Extend existing commands, conditions, native bindings, conversations and scene-clock lifecycle APIs.
Do not add a parallel evaluator. Remaining needs include cancellation/restart for timed workflows,
read-only simulation projections, state comparison where required, guarded-noun success events and
narrow operations against existing saved owners. Cosmetic events may request presentation changes;
they must not become hidden gameplay state transitions.

Guard success and physical milestones now enter source-owned commands through declared native inputs.
Each input declares its exact origin. Guard inputs cannot be invoked from ordinary noun actions or
player wiring; physical inputs must be declared by the registered primitive. The shared transaction
owns rewards and replies, while the primitive retains trajectories and the original milestone timing.
This is an event contract, not a second state owner or a historical-save adapter.

Completed bounded slices now include Sandbox post-commit response templates and cosmetic pulses,
Beach live intervals, Harbor Shift conversation entry refusal handling, Train door permission cases,
Laundromat breaker reset and Yard/Stacks camera discovery commands. Their focused reports are not
whole-scene acceptance. Shared commands, native simulation and current-format serialization now use
the same common state blocks. Snapshot normalization uses source-owned commands on copied blocks;
it does not mutate live in-flight state or translate historical save formats.

Shared contracts now include cancelable scene-clock deadlines, count/select/tuning/label reads,
wire-presence queries, scalar expression action values and atomic keyring grants. The typed editor
exposes these through the same source documents used by native Play. Preserve off-screen progress,
overload timing and exact replies as additional controller slices move onto them.

Laundromat evidence: 2,592 start/stop combinations plus 28 deadline timelines;
`.scene-system/laundromat-deadline-save-HNe8V0` for typed deadlines/replies and protected Save.
Jacket: 576 original/current histories and `.scene-system/laundromat-jacket-save-S9lW4l` for actual
typed grant/quantity edits, pending execution, Save/fresh import, repeat guards and byte Undo.

Downtown till: 128 original/current histories include guard permissions, manual/signal inputs,
tuning amounts, empty handles and repeated input. `.scene-system/downtown-till-save-xwfYdx` proves
typed token edits, missing-query atomic rejection, actual pending execution, Save/fresh import and
byte Undo. The old native till reward effect and device `on` steps have been deleted.

Yard drop evidence:432 original/current cases and19 timing/visual/event histories;
`.scene-system/yard-drop-save-r2houh` for typed pending/sourceSave/fresh import/Undo.
Stacks refusal/selection evidence:144 original/current physical histories;
`.scene-system/stacks-permission-save-FPIRrh` for typed cases/query CRUD, domain validation,
pending execution, paired Save/fresh import and Undo. Neither scope signs the full scene.

The next integrated checkpoint extends Yard evidence to 864 grab/drop cases and 33 timing histories,
including strict hatch expiry, reopening, pause/off-screen progress and reset/restore cancellation.
Typed collection reads, bounded source text references and deadlines are proved through protected
Save/fresh import/Undo in `.scene-system/yard-full-save-sHAgNB/evidence.json`.

Stacks now has 288 immutable-original physical histories, including successful landing, reward,
caption and goal ordering. `.scene-system/stacks-permission-save-9X8ytj` covers source guard inputs,
case/step editing, origin rejection, protected Save/fresh import/Undo. Shared commits add 16 redraw
notifications across those histories; the checks establish unchanged physical timing and event order,
not identical redraw notification counts. Whole-scene lifecycle and acceptance gates remain open.

Downtown Registry: 128 original histories and 128 published feedback comparisons preserve fresh/repeat
grants, peer replies, parallel billboard callback timing and status. Typed node label edits drive the
grant, caption and actual lamp painter from the same source field. Protected Save/fresh import/Undo:
`.scene-system/downtown-registry-save-sweAfC`. DLV access and finale tails remain native and pending.

Train unpaid source commands preserve 840 immutable histories, including negative/fractional
remainder behavior. Current common numeric safety explicitly refuses MAX_SAFE overflow without
writes, a documented boundary difference from the original increment. Source Save proof:
`.scene-system/train-command-save-YKg6rr/evidence.json`. Paid mechanics remain outside this slice.

Capsule online source outcomes preserve 108 boot/reboot/power/parallel timer histories. The same
physical timers report one declared input; source commands own readiness and static replies.
`.scene-system/capsule-router-online-save-8LHluu` proves actual typed edits, pending execution,
Save/bundle/fresh import/Undo. One additional success redraw is explicit; original caption times,
world state, timer ownership and native event/goal order remain unchanged.
