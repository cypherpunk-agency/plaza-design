# Yard parcel workflow migration

The claw's drop operation and the parcel's chute, slide, arrival, bounce and
return transitions are authored gameplay commands and existing SceneTime
deadlines. The old native drop branch, `dropIntoChute`, `arrive` and
`BACK_ON_HOOK` implementation have been deleted. Five moved response rows are
owned solely by the gameplay source.

The drop route handles an empty claw, placement at the current arm position and
placement into the chute. Ordinary placement copies `yard.armAt` through the
shared action-value contract. The chute route clears the claw, moves the parcel,
records its goal and raises the existing `crane.claw:dropped` event. A deadline
starts sliding after `chuteDropMs`; the next deadline stamps `slideStart` on the
existing clock and waits `slideMs`. Arrival either enters the tray or says the
original bounce response and waits `bounceBackMs` before returning to the hook.

Return reuses the existing state-only `checkpoint.yard.parcel` command rather
than duplicating the three recovery assignments. It has no new state owner,
evaluator, scheduler or controller callback. The typed workbench edits the same
commands, state-copy references, deadlines, duration references, outcome commands
and replies used by the game.

Grab and hatch opening now use the same authored source path. The Yard native
rules contain no effects or derived gameplay callbacks.

- Grab reads membership directly from the camera source's crate collection;
  crate IDs are not copied into a second condition list. An optional
  crate-specific source line falls back to the existing default source line.
  Static and dynamic source references use the existing native formatter with
  the actual device, noun, verb and signal context. A missing collection/text
  context refuses before any command commits.
- Hatch opening copies a readonly SceneTime query into the session-owned
  `yard.gateUntil` value, then adds the existing duration tuning. Its open query
  preserves the strict `now < gateUntil` predicate. The redraw deadline uses
  the same duration plus an authored 50 ms offset; it does not decide whether
  the gate is open. Reopening replaces the pending redraw without changing
  expiry semantics. The existing source checkpoint clears the copied session
  value on restore without altering the live running value.
- A gameplay transaction samples readonly context once, so conditions,
  sequential expressions and reactions see the same scene-clock instant.
  Inspection samples the live clock again. Pause and offscreen policies remain
  those of the existing SceneTime clock; no second timer or evaluator exists.

Physical hook easing and parcel-coordinate interpolation remain presentation
code. Neither decides a migrated gameplay outcome.

`check-yard-drop-workflows.mts` compares 432 drop cases and 19 full timing
histories with immutable original code. Histories include actual state, scratch
progress, visual bindings, replies, speakers, goals and native events. Tests cover
strict hatch expiry, fractional and late timers, reopening, pause/offscreen,
reset/restore and disposal. `check-yard-drop-forms.mts` drives actual typed edits,
including removing a deadline without a native fallback and rebinding the copy
that controls physical parcel placement. The Save test checks paired registered
sources, pending execution, a fresh shipping module using saved JSON, rejection
of invalid references and byte-exact Undo.

The full grab/hatch proof adds 432 immutable grab cases and 14 hatch timing
histories, including strict expiry, fractional durations, late callbacks,
reopening, reset and restore. Query tests cover missing-context negation,
optional/fallback source text validation, preflight refusal without mutation,
and once-per-transaction clock sampling. Full typed-form tests edit membership,
source-line selection and deadline offsets, execute the changed behavior, reject
invalid references, and check exact Undo/Redo.

Full paired source Save evidence:
`.scene-system/yard-full-save-sHAgNB/evidence.json`. This proof executes pending
sources, imports a fresh shipping module using the saved JSON, checks the live
versus checkpoint hatch value, and restores byte-exact source Undo. The earlier
drop-only Save evidence remains `.scene-system/yard-drop-save-r2houh/evidence.json`.
These focused proofs establish the Yard source migration; broad integrated
build, startup and raster gates are reported separately by the main goal.
