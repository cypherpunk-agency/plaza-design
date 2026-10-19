# Laundromat ordinary workflow migration

The breaker's automatic reset is now shared source: `gameplay.json` declares a
live interval over the existing `tripped` scratch elapsed value, a system command
that sets the breaker on, and a committed reply anchored to the breaker. It uses
the current common native state integration. The old scene tick and duplicate
automatic-reset text have been deleted.

Inactive elapsed time is held, matching current behavior. An actual overload still
sets that elapsed value to zero in the washer start operation. The interval uses
the referenced positive duration tuning, retains one-fire/discarded-overshoot
semantics and stops when its gameplay session is disposed. No timer, scheduler,
player-save format converter or washer-specific state adapter was added.

`check-laundromat-breaker-workflow.mts` compares 24 actual model/session cases with
immutable original behavior, including actual overloads, manual reset, fractional
and default durations, hidden updates, elapsed hold, exact replies, restore and
disposal. `check-laundromat-breaker-forms.mts` exercises real typed controls and
pending scenes: duration/device/text edits change behavior, invalid edits are
atomic, and deleting the interval removes automatic reset with no code fallback.
Existing composition and purchase/gameplay checks remain in place.

## Pure queries

Load counts and door-state selection now live in `gameplay.queries`, with their
old `rules.derived` callbacks deleted. `laundromat.running` and
`laundromat.waiting` count authored conditions; `laundromat.door3` selects the
first eligible result. The same source includes tuning, rounded cycle seconds
and the existing `name.washerN` text-label references. Native conditions, device
status text and the composition consume these exact query IDs, without an alias
map or saved derived values.

Queries use the existing shared condition evaluator. A session supplies readonly
source context; command and reaction checks read the current transaction draft,
and committed reply templates read the committed state. No cached query results,
new scheduler or second mutable state owner is introduced. Graph cycles, dangling
state/query/tuning/label references, invalid numeric operations and declaration
collisions are rejected. Native query writes are rejected; disposal removes the
session's query/context hooks. Source validation runs before installing hooks.

The gameplay workbench has typed count-row controls, ordered selection conditions
and values, tuning/label selectors, duration reads, scalar comparisons and query
creation/removal. `{query:id}` is the shared text-template spelling. Referenced
queries must be rebound before deletion; source validation keeps invalid edits
atomic. Labels remain owned by the device text source.

`check-laundromat-queries.mts` compares all 162 washer/jacket combinations with the
immutable original derived functions and checks transactional recomputation,
source edits, readonly behavior and lifecycle cleanup.
`check-laundromat-query-forms.mts` exercises the actual typed callbacks, invalid
edits and Undo/Redo. `check-laundromat-query-save.mts` verifies paired registered
source Save, pending runtime, a fresh module import using saved JSON and exact
byte Undo. Evidence: `.scene-system/laundromat-query-save-Zi8qR1/evidence.json`.

## Washer commands and cancelable deadlines

Washer start/stop permissions, overload writes, cycle completion, goals, native
events and replies now live in the gameplay source. The `washer.run` and
`washer.stop` bodies, their eight native `on` routes and thirteen duplicate text
rows have been deleted. All four devices use the same shared command evaluator
and named deadline mechanism.

`native.deadlines[id]` declares start/cancel events, a duration tuning reference,
an optional cosmetic progress timestamp, an arm condition, a condition checked
when due and ordered system-command outcomes. It keeps one existing
`SceneTime.later` cancellation handle per ID. A restart replaces that handle;
stop events, reset, restore and session disposal cancel it. No tick scheduler or
saved timer state was added. Source progress timestamps retain the exact native
clock. The obsolete global cancellation ticket and `scratch.run.*` values are
gone; they did not drive visible progress.

The arm condition and due condition are separate intentionally. An overloaded
new start stamps its progress origin but does not arm a cycle. Previously started
cycles can still finish during the 150 ms before the breaker stop cables arrive,
even while the breaker is tripped. Pausing freezes deadlines; hiding the scene
retains the existing deadline behavior.

Committed replies may have ordered condition cases evaluated against the final
transaction state. This lets completion select the exact original washer/SUDS
speaker and open/held/queue-clear wording after the washer becomes done, without
duplicating projected door-state logic. The reply precedes the existing native
`drum:done` event.

`check-laundromat-deadlines.mts` covers 2,592 immutable manual/signal start-stop
cases and 28 exact reply/event/timing timelines, including fractional durations,
queue clearance, trip-wire latency, pause/offscreen, stop/restart and lifecycle
cancellation. Only obsolete internal cancellation-ticket fields are excluded from
the scratch comparison; progress origins and elapsed state remain exact.
`check-laundromat-deadline-forms.mts` exercises actual typed deadline/reply edits,
replacement, creation/removal, invalid edits and Undo. The Save proof verifies
pending execution, fresh saved JSON imports and byte-exact Undo:
`.scene-system/laundromat-deadline-save-HNe8V0/evidence.json`.

## Jacket rewards and current-save checkpoints

Jacket rewards now use shared atomic commands. The source keeps the original
notice, keyring grant, optional pass, progress flag, goal and final reply order.
Existing passes remain unchanged; repeated openings give no additional reward.
Missing reward context refuses the entire transaction. The native `washer.take`
effect, duplicate text and device `on` route have been removed. The grant uses
the existing committed caption/receipt path without calling a mutating give hook.

`check-laundromat-jacket.mts` covers 576 original/current manual/signal histories,
queue/door states, existing passes/gloves, reply ordering and repeated input.
Actual typed grant/quantity edits, pending execution, invalid-reference rejection,
source Save, fresh shipping import and byte Undo pass in
`.scene-system/laundromat-jacket-save-S9lW4l`.

Current-save checkpoint policies now use source-owned state-only commands on a
copied scene block through the existing interpreter. Running washers serialize
as idle and the breaker as on; live state stays unchanged. The native settle
closure and its engine API have been removed. This is current-format snapshot
normalization, without historical save conversion. Cross-scene policy parity,
typed policy controls, actual pending Game Save/reload, invalid edits,
bundle/history/Save/fresh import and Undo pass in
`.scene-system/checkpoint-policies/run-rWs6Yq` (274 preservation cases).
