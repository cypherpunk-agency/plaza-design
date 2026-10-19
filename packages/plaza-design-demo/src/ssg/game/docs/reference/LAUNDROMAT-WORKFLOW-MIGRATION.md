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

Still ordinary logic awaiting migration: washer start/stop permissions and
completion branches, cycle deadlines and jacket rewards. Their presence is not
a continuous-simulation exemption. Named cancelable deadlines should reuse the
existing `SceneTime` cancellation API. Keyring rewards need an atomic shared
writable action contract; they must not be hidden in a post-commit scene callback.
