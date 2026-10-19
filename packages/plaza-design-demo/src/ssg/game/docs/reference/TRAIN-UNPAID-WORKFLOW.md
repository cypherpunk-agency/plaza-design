# Train unpaid brake workflow

Unpaid brake pulls now use ordinary shared commands. Source queries select the
original preincrement counter remainder, and noun cases invoke the exclusive
`command` step before formatting their existing response text. The native
`train.brake` effect no longer checks inventory, increments the counter or
selects unpaid refusals.

The generic remainder query reads an existing numeric ScalarRead and applies
JavaScript `%` with an authored finite nonzero divisor. It preserves negative
and fractional remainder semantics. Missing or nonfinite operands are unknown,
including under negation. Train's unpaid-even, unpaid-other and paid source
cases use positive query guards; their final fallback refuses when the shared
source is unavailable. Each increment command also checks pass absence and its
own counter condition, so direct command dispatch cannot skip that guard.

An ordinary `command` step is deliberately bounded:

- It is the only action in a noun `on` case, without action-level conditions.
- Its command permits exactly interaction and signal invocation. Runtime
  dispatch uses the actual caller context and repeats native eligibility.
- Eligibility and execution select the same case through the existing pure
  selector. Preflight does not call the public eligibility path recursively.
- A refused transaction produces one refusal response, skips the case's success
  line, and executes no other steps. There are no preceding physical mutations
  to undo. Successful source lines retain the real noun, verb and signal prefix.
- Guard actions keep their separate privileged input contract. Commands in
  guards, item uses, mixed step lists and other unsupported sites are rejected.

The existing common numeric safety bound remains intentional. At
`Number.MAX_SAFE_INTEGER`, an unpaid increment refuses atomically instead of
producing the native effect's out-of-range value. Normal finite current values,
including negative and fractional counters with safe increment results, retain
original behavior. No numeric safety policy or save compatibility layer was
introduced.

This is a partial Train migration. Paid brake physics and paid wording and position reporting remain native.
The subsequent live-source slice moved halt/resume replies and the ordinary
harbor flag write into source; see `TRAIN-LIVE-SOURCE-WORKFLOWS.md`. Door physics
remains native. No outcome interpreter or new physical simulation was added.

`check-train-command-steps.mts` covers 840 immutable phase/halt/pass/count/manual
and signal histories, pure eligibility, refusal ordering, invalid source
permissions/sites, missing session and explicit numeric-bound refusal. Existing
Train door permission tests retain 672 immutable histories. The real typed
workbench proof rebinds, removes and adds command steps, changes the divisor,
executes the result and rejects invalid edits.

Paired Save evidence: `.scene-system/train-command-save-YKg6rr/evidence.json`.
It verifies pending source execution, strict reference and permission rejection,
fresh saved JSON shipping imports, and byte-exact Undo. Integrated build and
raster verification remains a separate goal checkpoint.
