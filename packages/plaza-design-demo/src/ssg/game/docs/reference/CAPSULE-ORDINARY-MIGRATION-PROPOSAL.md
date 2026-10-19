# Capsule ordinary behavior: next source slices

Read-only audit after common scalar-owner and readonly-query consolidation.
This is a proposal, not completed migration. No production code changed for it.

## Slice A: Pixel with existing contracts

The target decision is ordinary authored content: a `select` query chooses sun
when `capsule.sun`, router when `capsule.plugOn`, otherwise bed. It intentionally
uses plug power, not router boot readiness or temperature.

Use one existing live interval with elapsed `pixelWait`, duration tuning
`pixelMoveMs`, active `compare(state capsule.pixelAt, query pixelTarget, ne)`,
and inactive policy `reset`. Its ordered due cases set `capsule.pixelAt` to
sun/router/bed and emit the corresponding committed reply. The source owns the
three existing captions and speaker references. Remove the replaced native
`pixelWants` decision and Pixel wait/movement branch; remove controller fields
used only by those ordinary choices.

Important parity: elapsed wait does **not** reset when the desired target changes
while remaining different from the actual location. Existing interval behavior
already matches this. It resets when the actual location matches the target or
when one due outcome fires; overshoot is discarded. Thermal update runs before
Pixel movement, so the current post-native interval hook preserves that order.

The companion's separate authored home-state binding and native thermal role
must continue to reference the intended common block; no second Pixel state,
role alias or saved decision latch should be introduced.

## Generic contracts needed for the remaining ordinary branches

- Door edge: extend a live condition trigger with optional rising-edge mode and
  initial observation policy. Store only transient previous observation per
  trigger, clear on model reset/restore/session disposal, and retain current
  live/background/pause policy. Initial already-open state must be observed
  without emitting an unlock caption. Source event/reply owns the lock caption.
- Goal guards: readonly query `{kind: "goalDone", goal: "pixel"}` reads the
  existing native goal set. Source triggers guard `not goalDone`, avoiding
  repeated commits, persistence and notices while a condition remains true.
  Goal IDs validate against prospective `data.goals` and have typed controls.
- Scheduled-wire predicate: readonly query
  `{kind: "wirePresent", from: "plug.schedule:night", to: "plug.power"}` reads
  actual live cables. Optional `verb` may constrain it; omitting it deliberately
  matches any verb, exactly as the current scheduled-wire check does. Validate
  source/target/optional verb against prospective device vocabulary. Expose only
  readonly cables in the existing query context, not another graph or evaluator.
- Concierge connectivity can reuse the existing `nodeConnected` observation;
  no new connectivity evaluator is needed.

Post-native source trigger order should be door notice, router goal, concierge
 goal, Pixel goal, after the Pixel interval's committed movement reply.

## Exact timing traps

The router goal currently uses local `up` sampled **before** the thermal update.
A tick can therefore start with the router up, cross the reboot threshold,
restart its boot deadline, and still grant the router goal when the schedule is
cut. A post-native trigger reading live `routerUp` would wrongly deny that goal.

Resolve this explicitly before migrating the router goal: expose a transient
physical frame observation of router readiness at tick start, or provide a
well-defined workflow sampling stage. The observation must not become a saved
alias or a new ordinary predicate hidden in controller code. Keep the actual
ordinary conjunction (ready and no scheduled wire) in source.

The periodic schedule event is also ordinary, but it currently emits **before**
thermal work and its notices. Moving it into the existing post-native interval
hook changes observable event order. A generic `beforeNative` interval phase on
the same existing tick could preserve it. Do not change the schedule noun from
SENSE to CLOCK, add new scheduling infrastructure or conceal the old order.

## Genuine physical work that remains native

Keep temperature integration, warming/cooling bounds, reboot threshold crossing,
boot deadlines, conditional delayed online notices, temperature display buckets
and short-lived steam presentation. These are the mechanical algorithms, not an
excuse to retain Pixel target choices, goal eligibility or door-edge dialogue.
The boot callback's exact extra notice delay and readiness recheck must remain
unchanged until separately covered by a bounded shared deadline contract.

## Immutable verification plan

Compare the frozen original rules against real current models sharing the
common scalar owner, using plug power, sun, each Pixel position, temperature,
boot deadline, wire membership, connectivity and live/background combinations.

- Pixel durations: zero, duration minus one, exact duration and overshoot. Change
  desired targets during the wait without resetting it; reaching the desired
  location resets it. Compare state, scratch, replies and source order.
- Door: initially open is silent; closed live tick then open produces one notice;
  repeated open is silent; closing then reopening produces another. Background
  ticks do not prime the edge; reset/restore starts without a previous sample.
- Goals: sustained eligible conditions grant once; current goal sets survive
  current-format reload; connected differs from merely seen. Cut/rewire the
  schedule, including the same endpoints carrying a different verb.
- Mandatory sampled-readiness case: powered router, Pixel on router, temperature
  just below reboot, crossing delta, schedule cut. The original grants the router
  goal even though live readiness becomes false after that thermal update.
- Schedule: compare event/caption ordering when night threshold, thermal reboot,
  Pixel movement and door opening coincide. Preserve discarded overshoot.
- Verify pause, background scene policy, disposal, source edits, typed CRUD,
  prospective reference rejection, protected Save, fresh shipping-source import
  and exact byte Undo. Test current save ownership; no old-format adapter gate.
