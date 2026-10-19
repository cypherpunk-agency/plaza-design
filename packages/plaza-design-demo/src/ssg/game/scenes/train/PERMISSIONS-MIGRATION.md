# Train permission source migration

The door open/lock permission chain now belongs to `devices.json` native cases,
using the engine's existing condition/action evaluator. The source owns refusal
order, reply references and the `siding` goal. Physical observations
`trainBetween`, `trainHalted` and `trainAtSiding` are read-only projections of the
injected line system; they create no saved state or second condition evaluator.

The `train.doors` operation retains only `rideDoors(true)` and writing the injected
city's `HARBOR_FLAG`. `train.lock` retains only `rideDoors(false)`. City flag names
remain source editable through the existing CitySource contract. The saved-world
flag write is **not yet consolidated** into an ordinary authored action. It should write
the common game-state flag selected by the pending city definition. It does not justify
a legacy save-format adapter or another scene-specific state bridge; the user explicitly
excluded that extra compatibility requirement on2026-10-19.


Remaining native controller work: brake pass/counter permissions and transport
result replies; live position interpolation/text; braking, tunnel and siding
threshold observation; halt/resume notices and scratch phase tracking. The brake
refusal uses the original unbounded saved `pulls` count modulo two; replacing it
with a second parity flag would break old saves. A future shared migration needs
an explicit read-only projection of that counter and a bounded synchronous native
transport operation bridge with result selection. Delayed event/cable dispatch
cannot preserve the current operation and reply timing.

Typed device forms edit case conditions, reply/goal/effect references, and support
case insertion, deletion and reorder. New conditional rows insert before a final
fallback. The existing source validator rejects invalid references and an
unconditional fallback preceding another row atomically. Legacy single-object
cases remain supported and can explicitly expand to a list.

Verification:

- `pnpm exec tsx scripts/scene-system/check-train-permissions.mts`: 672 histories
  against the immutable pre-migration rule body, covering every phase, halt kind,
  manual/signal use, pass ownership, old `pulls` values, edited city flag names,
  repeated uses and legacy save reload. Exact replies, change ordering, goals,
  flags, transport and saves are compared.
- `pnpm exec tsx scripts/scene-system/check-train-permission-forms.mts`: actual
  typed callbacks, atomic invalid order/reference rejection, list CRUD, legacy
  single-case expansion, JSON reload execution and exact source history undo.
- Package-local `pnpm exec tsc -b --force`.

No rendering or visual source changed.
