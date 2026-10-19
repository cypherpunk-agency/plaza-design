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
| Downtown | Till and legs installation migrated; node ownership, gate and peer outcomes remain | Delivery interpolation and scanner geometry |
| Yard | Drop/chute/slide/bounce and camera discovery migrated; grab/hatch remain | Crane/parcel movement and collision |
| Stacks | Scope discovery, lift/alarm refusal cases and lift-kind selection migrated; landing/rewards/watchdog remain | Trolley/lift trajectories and thermal calculation |
| Train | Pass/door permissions, refusal alternation, harbor unlock and siding goal | Travel/braking/siding geometry and rider motion |
| Harbor Shift | Supervisor conversation and acceptance/tag decisions migrated; verify full lifecycle and common state integration | Existing staging/animation |
| Capsule | Schedule, door reaction, goals and Pixel delayed choices migrated; full scene gates remain | Temperature integration and companion movement |
| Opening | Flag/reward/phase orchestration currently in Game and opening model | Cinematic playback and camera motion |

The other ten native scenes had no additional imperative scene-rule bodies in this read-only audit.
That does not prove full editor coverage, transport integration, cleanup or all-scene acceptance.

## Contract policy

Extend existing commands, conditions, native bindings, conversations and scene-clock lifecycle APIs.
Do not add a parallel evaluator. Remaining needs include cancellation/restart for timed workflows,
read-only simulation projections, state comparison where required, guarded-noun success events and
narrow operations against existing saved owners. Cosmetic events may request presentation changes;
they must not become hidden gameplay state transitions.

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
