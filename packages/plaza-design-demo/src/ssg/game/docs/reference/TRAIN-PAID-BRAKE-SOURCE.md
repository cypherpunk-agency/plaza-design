# Train paid brake response ownership

The paid brake still invokes the real `LineSystem.brakeRide()` exactly once. Its native effect now owns only that physical call and the accepted-stop redraw. The standing/already-braking/accepted response selection and text references live in ordinary scene source.

Three positive readonly physical observations describe the same phase classification as the existing brake primitive: standing, already braking, and ready to brake. Existing `native.reads` bindings expose them to shared select queries. Those queries combine the existing paid-pass query with the physical observation. The device's ordered `noun.on` cases select a response, call the one physical effect, then use the existing `Case.say` path.

This retains the actual manual/signal action context, command prefix, speaker, tone, causal receipt and change/reply order. There is no saved last-result field, extra event runner, synthetic privileged player input or postcommit reply context reconstruction. Eligibility only observes state. Missing shared/physical context reaches the explicit unavailable response without invoking physics.

The native effect's hardcoded brake text selection and its static text requirements were deleted. Source authors can rebind those responses and delete replaced text keys. The subsequent TRAIN-POSITION-SOURCE.md slice removes the native position report effect too. The spontaneous mechanical tick remains native.

## Verification

- `check-train-paid-brake.mts`: 630 histories compared with immutable original Train rules and the actual LineSystem, including all four physical return values, inclusive/exclusive siding-window boundaries, repeated manual/signal actions, lock/watchdog refusals, exact state/transport/reply/change order and receipt ownership. Also verifies that the actual `brakeRide` implementation body matches the immutable original and that eligibility never calls it.
- Existing regressions: 840 unpaid command histories, 188 live halt/cable/timing histories and 672 door permission histories pass.
- `check-train-paid-brake-forms.mts`: real device/gameplay workbench callbacks create/rebind/delete response text, change the ordinary query and readonly physical mapping, preserve action context and reject invalid edits. Undo/Redo restores the authored behaviour.
- `check-train-paid-brake-save.mts`: bundle roundtrip, protected paired source Save, invalid-reference atomicity, actual pending model, fresh saved-JSON shipping imports and byte-exact Undo.
- Package `tsc -b` passes.

Paid-brake Save evidence: `.scene-system/train-paid-brake-save-qxesTb/evidence.json`.
