# Stacks ordinary runtime migration

This is a bounded completed slice, not a claim that the Stacks controller is
fully consolidated.

## Completed source ownership

- Device Case lists own the lift's manual refusal, busy refusal and the alarm's
  manual-test refusal. The corresponding native branches and text requirements
  were deleted. Built-in watchdog/lock/seal checks still run before these cases.
- Native `craneBusy` exposes only physical trajectory occupancy (lift or return
  in progress). Source chooses whether that fact refuses a lift.
- Gameplay select query `stacks.liftKind` owns reefer-versus-regular selection.
  Its default condition is found and boxAt=stack. The physical controller reads
  its result and accepts exactly regular=1 or reefer=2; missing attachment does
  not silently select a default. The scene source validator requires select
  outputs in that finite physical enum, without imposing the original policy.
- The registered physical milestone `stacks.crane.landed` now calls the common
  input dispatcher after its existing ticket check and physical rest-position
  update. Source cases choose the reefer or regular command from the readonly
  physical trajectory fact. Source owns boxAt=ferry, loaded increment, lift goal
  and box.landed reply; the replaced native ordinary callback tail was deleted.
- The shared query editor's Add case action clones the existing fallback scalar
  value. New cases therefore begin inside the current output domain instead of
  inserting an invalid empty string. Conditions, outputs and order remain typed.

The existing common scalar owner, source checkpoint policy, scope commands,
Moth conversation, scene composition and physical drawing were preserved.

## Remaining ordinary code and exact contract gaps

The following decisions remain in native code and must not be counted as
migrated merely because their containing callback also handles geometry:

- Signal alarm records the presentation timestamp, decides empty versus airborne
  cargo, increments alarms and chooses its reply. Actual return position,
  cancellation ticket and timed trajectory are physical. The return completion's
  boxAt=stack and box.back reply are ordinary outcomes. The new common native
  input mechanism can cover them in a future slice; they remain unchanged here.
- Watchdog restoration decides whether the port's alarm cable is absent, then
  connects it, adds configured trace and says watchdog.restore in that order.
  wirePresent can already express membership; the shared command action set does
  not yet author model connection/trace operations. Keep that missing operation
  contract explicit rather than duplicate an evaluator or hide the old branch.
- Ferry status strings/selection remain native derived presentation. Existing
  select/label queries can cover them in a later bounded source slice.
- Reefer world presence still uses the native place predicate (on ferry and not
  departed). That requires a common source visibility binding before removal.

Trajectory easing, route geometry, scan crossing time, alarm return trajectory,
physical busy occupancy, ticket invalidation and cold/warm visual timestamps are
mechanical calculations that remain native.

## Verification

`check-stacks-source-permissions.mts` compares 288 immutable-original histories:
manual/signal, found/not-found, each cargo location, idle/lift/return occupancy,
alarm/no-alarm, watchdog-frozen/unfrozen and alarm-cable present/cut. It checks chronological deadlines,
physical trolley positions, live scalar state, transient scratch, exact replies,
goals and their presence at each exact caption time. Shared commits introduce
16 additional coalescible redraw marks across these histories (597 original,
613 current); this is not redraw identity. Physical callback timing, scene clock,
visible reaction ordering and state are equal. Live state is compared directly because the
separately migrated checkpoint serializer intentionally settles airborne cargo;
that independent policy has its own frozen-baseline verification. Missing shared
query attachment explicitly rejects rather than silently falling back.

`check-stacks-source-permission-forms.mts` uses actual editor callbacks for case
conditions/replies/add/delete/order, query condition rebind and output edits,
query case CRUD, invalid refs/fallback order/domain rejection and history Undo.
An edited query selects a regular trajectory even for a discovered reefer,
proving the physical calculation consumes the pending source result.

`check-stacks-source-permission-save.mts` covers protected paired device/gameplay
Save, malformed physical refs and out-of-domain trajectory output rejected
atomically, actual pending model, fresh shipping SCENES import with saved JSON,
and exact byte Undo. Evidence: `.scene-system/stacks-permission-save-9X8ytj`. The edited source also
contains a guard lifecycle input created and bound through actual typed controls;
its saved/fresh command behavior is exercised. Invalid ACT/item/other-guard input
steps and missing required physical mappings reject atomically.
Forced package TypeScript check passes at this checkpoint.

Shared input contracts and failure boundaries: [NATIVE-INPUTS.md](NATIVE-INPUTS.md).
