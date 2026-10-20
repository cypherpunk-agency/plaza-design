# Causal feedback receipts

Messages retain individual delivery identities (`FeedbackReceipt.id`): history and visible
presenters consume these once. Audio consumes `cueId`, the identity of the native action
or scheduled callback that caused the reply. Equal text and elapsed time never determine
identity. Two separate actions saying the same thing therefore remain audible.

`SceneModel` supplies one cue scope for a native device action, guess/item action, or shared
`apply` batch. Nested work shares it; each actual `later` callback starts a new scope.
This metadata does not alter `Ctx`, authored JSON, saved state, scheduling, or trace fields.
Shared gameplay commands own ordinary state changes; native physical calculations retain their
declared inputs and lifecycle. Receipts carry presentation identity across both paths.

`World.say` returns the actual delivery receipt. A controller that must acknowledge
success before returning its line uses `World.receipt(line)` and passes that receipt to
`PlayerServices.granted(receipt)`. The next delivery of that exact line object consumes
the reservation. Unused scoped reservations are discarded at scope exit, and model
reset clears the reservation map. Reusing the line on another action never reuses the
delivery identity. An unscoped direct `give` reservation is weakly held until delivery.

SceneHost forwards both successful and failed actual replies to the audio owner.
Multiple successful replies from one action keep distinct history entries but play one
cue. An immediate error wins over a pending success from that same cue, canceling only
its queued success notes. Muting or scene disposal cancels queued notes; muted receipts
are consumed and do not replay on unmute. The bounded audio identity cache contains
at most 512 causes, matching the existing bounded delivery cache policy.

Program acquisition reserves the real `give.program` reply before calling the program
hook, so Game's acquisition cue and the actual device reply use one causal identity.
The existing NET notice and gain-observer suppression remain unchanged; the receipt
does not itself print another log or notice. Standalone `granted()` controller cues
remain valid when no device line owns a result. Title/menu, turnstile, concierge and
Moth story cues retain their existing ownership.

Downtown's four success-service paths (controlled node, installed legs, paid till and
finished gate) explicitly forward their reply receipts. No success service is disabled.

Current checks: `check-causal-feedback.mts`, communication ownership/history and device
acknowledgment/timing checks. Run through `pnpm test:game causal-feedback`.
