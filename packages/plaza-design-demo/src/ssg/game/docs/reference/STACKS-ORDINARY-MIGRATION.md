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
- The shared query editor's Add case action clones the existing fallback scalar
  value. New cases therefore begin inside the current output domain instead of
  inserting an invalid empty string. Conditions, outputs and order remain typed.

The existing common scalar owner, source checkpoint policy, scope commands,
Moth conversation, scene composition and physical drawing were preserved.

## Remaining ordinary code and exact contract gaps

The following decisions remain in native code and must not be counted as
migrated merely because their containing callback also handles geometry:

- Lift completion sets reefer boxAt=ferry, grants lift, then says box.landed;
  regular completion increments loaded. The cancellation ticket and physical
  rest position are mechanical, while those state/reward/reply outcomes are
  ordinary content. Current native.events maps shared events to model emissions;
  it does not map physical completion back to a system command. Model.runCommand
  currently exposes interaction commands. A justified generic physical-completion
  input to the same session, preserving cancellation and exact ordering, is the
  missing bridge. No second event evaluator or controller-only content wrapper
  was introduced for this slice.
- Signal alarm records the presentation timestamp, decides empty versus airborne
  cargo, increments alarms and chooses its reply. Actual return position,
  cancellation ticket and timed trajectory are physical. The return completion's
  boxAt=stack and box.back reply are ordinary outcomes with the same bridge need.
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

`check-stacks-source-permissions.mts` compares 144 immutable-original histories:
manual/signal, found/not-found, each cargo location, idle/lift/return occupancy,
alarm/no-alarm and watchdog-frozen/unfrozen. It checks chronological deadlines,
physical trolley positions, live scalar state, transient scratch, exact replies,
goals and redraw notification order. Live state is compared directly because the
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
and exact byte Undo. Evidence: `.scene-system/stacks-permission-save-FPIRrh`.
Forced package TypeScript check passes at this checkpoint.
