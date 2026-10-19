# Capsule ordinary source workflows

Completed source migration after common scalar ownership and readonly queries.
The native controller now retains physical simulation; ordinary companion decisions, door notices and goal eligibility live
in editable shared gameplay/device source.

## Current ownership

- The schedule is a `beforeNative` source interval using the existing live tick,
  elapsed scratch `clock`, `nightEveryMs` tuning and native event mapping. It
  emits before thermal work, discards overshoot and adds no CLOCK noun or controls.
- `gameplay.json` owns the `capsule.pixelTarget` select query, Pixel movement
  interval, movement commands and captions. The interval compares actual location
  with the query, then uses that same query to select its due outcome. Editing
  the target therefore changes actual behavior. Active target changes preserve
  elapsed wait; matching the target resets it; due overshoot is discarded.
- A source rising-edge trigger owns the door-unlocked event and committed reply.
  The first live sample is silent. Previous edge state is transient scratch,
  cleared on reset/restore/disposal; background ticks do not prime it.
- `devices.json` observations own router, concierge and Pixel goal readiness in
  their original order. Existing idempotent native goal grants prevent repeated
  commits while readiness stays true. No goalDone query or saved latch was added.
- `capsule.scheduleConnected` is a generic `wirePresent` query reading the same
  live cables as the model. Omitting its optional verb deliberately matches any
  verb at the authored endpoints, preserving the original predicate.
- Pixel captions reuse the validated Capsule controller's existing Pixel speaker
  role. This is an editable registered simulation role, not an arbitrary actor
  speaker catalogue. Ordinary lock replies reference the actual lock device.

Native thermal work exposes `routerUpAtTickStart`, an ephemeral physical sample
stored only in scratch. The readonly source flag binds that sample. The router
goal's ordinary conjunction (sampled ready and schedule absent) remains in source.
This preserves the case where a router starts up, crosses the thermal reboot
threshold, and still earns the goal on that tick despite becoming unready.

Runtime order remains: source beforeNative schedule emission, thermal update/reboot notices,
Pixel interval/movement reply, door rising-edge reply, router goal, concierge
goal, Pixel goal. There is no second evaluator, scheduler or scalar owner.
The companion's separate authored home-state binding remains independent.

## Native work still present

Temperature integration, warming/cooling bounds, reboot threshold crossing,
boot deadlines, delayed online readiness checks, temperature display buckets,
steam presentation remain native. This slice does not claim those remaining
physical branches migrated. The former native schedule branch and its controller
role/tuning aliases were deleted.

## Verification

- `check-capsule-source-workflows.mts`: 1,728 three-step histories compare real
  current models with the immutable original rules/model. State, normalized
  transient scratch, exact visible replies, emitted events and goal order match.
  Explicit cases cover sampled-up thermal crossing, target changes while waiting,
  initial/open/repeated door edges, background policy, alternate cable verbs,
  sustained goals, existing pause/background schedule policy and disposal.
- `check-capsule-source-workflow-forms.mts`: real typed query/interval/trigger/
  reply/speaker/goal and phase/duration controls change pending runtime behavior. Invalid references
  reject atomically; form history restores exact source. An edited target to
  router and ten-unit interval produce the edited router caption and no sun goal.
- `check-capsule-source-workflow-save.mts`: protected paired gameplay/device Save,
  malformed physical-derived reference rejected at the final semantic boundary,
  pending actual runtime, fresh shipping `SCENES` import with saved JSON, and
  exact byte Undo all pass. Evidence:
  `.scene-system/capsule-workflow-save-3BbuuD`. The saved edited schedule is
  also checked to emit before the actual thermal reboot caption.
- `check-native-workflow-phases.mts`: pre/native/post ordering, omitted phase
  defaulting to afterNative, one evaluation per phase, same-tick state visibility,
  resetOn once per event, overshoot, offscreen/disposal/restore and invalid phases.
- Forced package TypeScript build passes at this source checkpoint.

Initial `data/index.ts` catalogue materialization uses pure state/native data
projection because rule-derived facts cannot be validated before rule modules
exist. Final source assembly and prospective Save still validate the complete
rule contract. The malformed-derived-reference regression explicitly protects
that boundary; there is no permissive allowlist or import-cycle workaround.
