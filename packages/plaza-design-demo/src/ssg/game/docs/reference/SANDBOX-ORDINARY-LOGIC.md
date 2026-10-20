# Sandbox ordinary commands

Counter count, stamp, coffee brew, chip insertion and till payment now execute through
`scenes/sandbox/gameplay.json`: shared commands own increments, item consumption, token
charges, conditions and responses. Qualified `sandbox.*` declarations own the
scalar defaults; `Save.gameplay.sandbox` is the common live/persisted block shared
by native model reads and command drafts. Device sources and engine scene saves
do not duplicate these scalars. The five old effect bodies, their device `on` routes and their seven
duplicate response texts have been deleted.

Two small shared binding capabilities preserve presentation:

- A native case may opt into `template: true`. The existing gameplay text validator and
  renderer resolve `{state:...}`, `{item:...}` and `{tokens}` after successful commit.
  Existing `{via}` handling remains unchanged. Silent cases cannot enable templates.
- `native.presentation[event] = {kind: "pulse", target: "device.or.noun"}` stamps the
  existing cosmetic `scratch["pulse." + target]` using `model.now()`. It accepts declared
  events and real native device/noun references only. It cannot mutate gameplay state,
  dispatch actions, evaluate conditions or create timers. Successful Sandbox commands
  emit the device and noun pulse events; refused actions emit neither.

The gameplay inspector exposes template switches and pulse add/rebind/remove controls.
Event renaming also updates presentation bindings. Source and prospective native
validation reject unknown template fields, pulse events, targets and unsupported kinds.

Numeric declarations may explicitly use safe-integer minimum/maximum bounds. Action
state increments follow declaration bounds and finite/integer semantics; token/item
quantities and dispatch budgets retain their separate limits.
This preserves negative and greater-than-one-million native counters without clamping
or resetting them. Boundary: the historical native effect accepts injected fractional,
nonfinite and unsafe numeric counters; the shared numeric state contract rejects those.
Shipping defaults and increment-only paths produce integers. This migration does not
claim compatibility for manually altered fractional/nonfinite/unsafe counters, or an
increment beyond `Number.MAX_SAFE_INTEGER`.