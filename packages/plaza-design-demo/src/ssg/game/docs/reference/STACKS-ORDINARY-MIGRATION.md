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
- Alarm Case lists own manual versus signal behavior and empty versus airborne
  cargo. The empty signal case uses the shared exclusive command step to emit a
  cosmetic pulse. The airborne case selects a physical return endpoint; it
  captures return position/time and invalidates the lift ticket before dispatching
  the registered return-start input. Source owns the alarms increment and pulse.
  Both alarm captions remain ordinary Case.say responses, preserving the original
  noun/verb/signal context and signal-arrow prefix. The 1900 ms physical callback
  updates only its rest position/ticket bookkeeping; the returned input owns
  boxAt=stack and the authored box.back caption. Replaced native decisions,
  counter/state writes and caption branches were deleted.
- Crane and ferry status strings/conditions now use source select queries. Native
  busy/return observations expose physical occupancy only. Status text uses
  explicit `{query:crane}` / `{query:ferryStatus}` references. Removing a referenced
  query therefore rejects at prospective validation rather than leaving an
  unknown native placeholder. Source output/condition edits remain ordinary
  authoring changes; there is no protected query allowlist.
- The shared query editor's Add case action clones the existing fallback scalar
  value. New cases therefore begin inside the current output domain instead of
  inserting an invalid empty string. Conditions, outputs and order remain typed.

The existing common scalar owner, source checkpoint policy, scope commands,
Moth conversation, scene composition and physical drawing were preserved.

## Remaining ordinary code and exact contract gaps

The following decisions remain in native code and must not be counted as
migrated merely because their containing callback also handles geometry:

- Lift start still writes boxAt=air, emits lifted before scheduling the scan and
  landing callbacks, and chooses lift.box after scheduling. These placements
  require their own exact-order source milestone migration; they are not hidden
  inside the landing slice's completion claim.
- Thermal scan still records cold/warm presentation time, checks whether the
  port is frozen before the warm caption, and emits the warm scanner event.
  Cold timestamp expiry still refreshes on the native tick. Frozen-device
  observability and authored presentation expiry need a separately covered slice.
- Watchdog restoration is now source-owned through shared transactional wire and
  trace actions; see SCENE-DOMAIN-ACTIONS.md. The physical frozen observation and
  existing clock remain native, while its prior cable check/reconnect/trace/reply
  branch was deleted.
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
46 additional coalescible redraw marks across these histories (597 original,
643 current); this is not redraw identity. Physical callback timing, scene clock,
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
and exact byte Undo. Latest evidence: `.scene-system/stacks-permission-save-9e3YN1`. The edited source also
contains a guard lifecycle input created and bound through actual typed controls;
its saved/fresh command behavior is exercised. Invalid ACT/item/other-guard input
steps and missing required physical mappings reject atomically.
Forced package TypeScript check passes at this checkpoint.

Shared input contracts and failure boundaries: [NATIVE-INPUTS.md](NATIVE-INPUTS.md).

## Alarm/return and explicit native text proof

`check-stacks-return-source.mts` adds 21 immutable timelines with 101 sampled
frames each: empty/airborne/delivered cargo, repeated alarms before the 1900 ms
return, manual interleaving, pause/resume, reset and disposal. Live status strings,
trajectory/rest positions, ticket cancellation, counter/state, caption context and
time, and the actual composition alarm-painter timestamp match. After session
disposal, query-backed UI is intentionally no longer sampled; physical/state/cue
cleanup remains checked. Native alarm's private scratch timestamp was replaced by
`pulse.port.alarm`, projected into the same existing paint snapshot field. Its
normalized timestamp is identical. Physical return scratch is valid before a
source commit can request a redraw.

Typed controls exercise the new return input command, pulse target and crane
status output, plus an edited box.back source caption. Paired Save/fresh shipping
models execute the 1900 ms physical callback and consume those edited status and
caption fields. Missing return input, text or explicit status query rejects
atomically. Actual editor callbacks also prove that removing the status reference
first permits deleting the unused query; there is no canonical query floor. Byte Undo restores exact source documents.

`check-native-query-text.mts` covers generic explicit native query reads in label,
status, description/action text validation and actual action captions. It uses the
existing shared query context; strings, numbers, booleans and null retain native
String formatting. A known query with absent read context retains its unresolved
token, matching existing native missing-value behavior. Ordinary unqualified
placeholders keep their prior behavior; vars cannot shadow explicit query reads.
Unknown explicit IDs reject before attachment/Save. This adds no new evaluator,
state owner or scene-specific status registry.

## Transactional watchdog repair

The source beforeNative trigger checks physical port-frozen status and an
explicit false wirePresent result, then dispatches the system-only wire/trace
command and restore reply. It runs before cold expiry, the model trace loop and
watchdog movement, matching the original tick order. The existing tamperTrace
source value is read through a query; it is not duplicated. Actual typed edits to
the wire target, trace device/delta and restore caption reach pending and fresh
saved-source models. Generic domain reducers preserve fixed/live/cut/queued-signal
semantics and atomic command failure. There is no hidden event-to-native repair
callback. The registered physical `portFrozen` read is transient observation,
not another saved scalar.

480 immutable watchdog histories and published receipt comparisons cover this
slice; the threshold kick and restore retain distinct error causes. Additional
shared commit refresh marks can coalesce. The separate lift-start/scan/visibility
items above remain open.


## Primitive roles and optional pictures

Stacks now declares only the actual native thermal dependency: device `port`,
its SENSE noun `scanner`, and event `warm`. The physical scan emits that exact
endpoint and tests PORT AUTHORITY freeze. The shared primitive contract checks
required event IDs alongside noun kinds. Removing the event still rejects after
every ordinary cable/query/action reference has been rebound elsewhere.

The alarm endpoint, crane/ferry/reefer devices and watchdog itinerary are authored
references. Their original IDs and three-stop route are no longer protected by a
historical snapshot. Existing cross-reference checks still reject dangling wires,
layout rows, everyday actions, pulses and route stops. Reefer placement only
filters a spot when it exists; deleting that ordinary device does not remove the
physical box or its terminal trajectory.

Device-marker pictures are optional. The native factory accepts prospective
device data before applying optional marker geometry, and explicit manifest
bindings take priority. Structural terminal geometry, blocks, slot and crane
trajectory points remain required by the actual physical/art consumers. The
terminal alarm flash reads the target of the same authored
`stacks.alarm.pulse` presentation binding used by shared dispatch; rebinding the
alarm noun therefore updates both the mechanical pulse and native frame.

`check-stacks-primitive-roles.mts` exercises actual typed artwork binding, ordinary
ferry/log removal, authored alarm-to-siren rebinding, a one-stop itinerary, removal
of all four device-marker pictures, strict physical dependency rejection, pending
and direct source-first factories, saved fresh shipping models and exact source
history/byte Undo. It checks the native frame's alarm timestamp after rebinding,
alongside the unchanged source caption. Default trajectories/timing remain covered
by the 288 permission, 480 watchdog and 21 return histories.
