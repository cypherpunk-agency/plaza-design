# Sandbox live environment conditions

The daylight switch-off and weather-driven vent closure now live in
`gameplay.json` as two ordered `native.triggers` rows. They reuse shared time,
weather and state predicates, system-only commands, and post-commit device
replies. The night-light row executes before the vent row, as in the original
native tick. Each command clears its native-backed boolean, so the condition
stops matching without a separate latch, timer, saved owner or evaluator.

Generic live triggers run once in source order from the existing native live
scene tick hook, after intervals. They do not run for hidden/background scene
updates and stop with their owning session. Each row reads the previous row's
committed result. They are level conditions: an authored command that leaves its
condition true may execute again on the next live tick.

`SANDBOX_RULES.tick` and its obsolete night/vent text and state requirements are
removed. Qualified gameplay declarations own `nightLight` and `ventOpen` in the common
`values.sandbox` block. Native rules and shared commands reference that same live
block; engine scene saves do not duplicate the scalar values. The original `night` derived value remains a physical display
projection for status and drawing. Device pulse presentation remains native.

Committed replies support the bounded read-only `{world:weather}`, `{world:day}`
and `{world:minute}` template fields. Missing world context renders these fields
empty and cannot authorize time/weather trigger conditions. The running game
always supplies the same current city time and local weather used by devices.
The original scene-only test fallback to noon is not a second gameplay clock.

Typed gameplay forms support trigger condition editing, system command rebinding,
rename, insertion, deletion and order, plus committed reply editing. All edits
pass prospective source validation atomically. The existing vocabulary rename
helper updates trigger predicates too.

Evidence:

- `check-sandbox-live-conditions.mts`: 504 histories against immutable original
  model/rules, covering fractional dawn/dusk boundaries, all seven weather kinds,
  both booleans, live/background policy, repeated ticks, replies/order/state/save,
  unknown world context, template fields and invalid references.
- `check-sandbox-live-condition-forms.mts`: real typed callbacks and select
  options, trigger CRUD/order, predicates, reply templates, atomic invalid
  references/duplicate names and undo to the original source.
- `check-sandbox-live-condition-save.mts`: registered protected source Save,
  invalid-reference atomic rejection, actual pending model execution, fresh
  saved-JSON import of shipping `SCENES`, and exact byte Undo.
- Existing `check-sandbox-ordinary.mts`: 109 counter/stamp/brew/chip/till histories
  and presentation/state checks remain green. Its state-delta assertion follows
  the shared declaration bounds; token/item limits remain separate.

No visual source or rendering behavior changed.
