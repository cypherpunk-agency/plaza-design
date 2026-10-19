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

This is a partial ordinary-logic migration. Grab and hatch opening remain native:

- Grab checks the camera source's crate collection and selects an optional
  crate-specific text with a fallback. Replacing it needs an appropriate shared
  source-collection membership and text lookup contract; crate IDs must not be
  copied into a second list of conditions.
- Hatch opening uses the strict native scene-clock predicate
  `now < gateOpenUntil`, including delayed event-loop boundaries and repeated
  opens. The existing readonly native observation projects this value for shared
  arrival conditions. It does not persist another flag. A later migration needs
  an explicit shared readonly clock contract; a closing boolean timer would
  change boundary behavior.

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

Evidence: `.scene-system/yard-drop-save-r2houh/evidence.json`. Existing Yard
composition and all 274 checkpoint-preservation cases also pass. This slice does
not mark all Yard ordinary logic complete.
