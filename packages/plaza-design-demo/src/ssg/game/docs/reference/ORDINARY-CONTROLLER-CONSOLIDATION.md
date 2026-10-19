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

The native `plugOn` key remains the sole saved owner. The command bridge does not persist a second
copy. The actual immutable-original and current SceneModels agree for on/off initial states, both
input sources, repeated actions, exact replies/speakers/silence and restored saved state.

Evidence: `check-capsule-shared-off.mts`; `check-capsule-controller.mts` (1,728 unchanged simulation
cases); typed binding/controller forms; native conversation parity; network validation;
protected Save/fresh shipping import/byte Undo in `.scene-system/capsule-controller/run-6TE4O0`.

This slice does not claim that all Capsule ordinary tick behavior is migrated. Its door edge reaction,
goal decisions and companion delayed decisions still need shared lifecycle/event contracts.

## Remaining semantic work

| Area | Ordinary behavior to move | Calculation to retain |
| --- | --- | --- |
| Sandbox | Counters, stamp/brew, chip consumption, till rewards, environmental reactions | Cosmetic pulse rendering |
| Beach | Rent/start/end decisions, billing, insufficient-funds termination | Existing physical presentation |
| Laundromat | Start/stop permissions, completion/reward, overload/reset workflow | Animation and any continuous machine calculations |
| Downtown | Ownership, install/rewards, till, gate and peer outcomes | Delivery interpolation and scanner geometry |
| Yard | Grab/drop permissions and resulting state; discovery reward | Crane/parcel movement and collision |
| Stacks | Discovery/rewards, watchdog reset/consequence | Trolley/lift trajectories and thermal calculation |
| Train | Pass/door permissions, refusal alternation, harbor unlock and siding goal | Travel/braking/siding geometry and rider motion |
| Harbor Shift | Conversation routing, automatic accept/replacement-tag decisions | Existing staging/animation |
| Capsule | Door-change reaction, goals and delayed ordinary choices | Temperature integration and companion movement |
| Opening | Flag/reward/phase orchestration currently in Game and opening model | Cinematic playback and camera motion |

The other ten native scenes had no additional imperative scene-rule bodies in this read-only audit.
That does not prove full editor coverage, transport integration, cleanup or all-scene acceptance.

## Contract policy

Extend existing commands, conditions, native bindings, conversations and scene-clock lifecycle APIs.
Do not add a parallel evaluator. Remaining needs include cancellation/restart for timed workflows,
read-only simulation projections, state comparison where required, guarded-noun success events and
narrow operations against existing saved owners. Cosmetic events may request presentation changes;
they must not become hidden gameplay state transitions.

Sandbox is the next bounded migration. It needs post-commit response templates through the existing
text renderer and typed committed-event pulse bindings using the native scene clock. Preserve pulse
timing under pause/reduced motion; do not substitute an unrelated animation clock.
