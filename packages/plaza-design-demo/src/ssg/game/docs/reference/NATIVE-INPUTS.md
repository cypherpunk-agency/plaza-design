# Native lifecycle inputs

Native algorithms can report a finite physical milestone to the existing shared
command session. GUARD success steps can use the same dispatcher at their exact
position in the existing step interpreter. Inputs do not own another evaluator,
scheduler, state block or general device-operation system.

```json
{
  "native": {
    "inputs": {
      "stacks.crane.landed": {
        "origin": {"kind": "physical"},
        "cases": [
          {"when": {"flag": "stacks:reeferTrajectory"}, "command": "stacks.crane.land.reefer"},
          {"command": "stacks.crane.land.regular"}
        ]
      },
      "example.guard.passed": {
        "origin": {"kind": "guard", "device": "machine", "noun": "login"},
        "cases": [{"command": "example.guard.reward"}]
      }
    }
  }
}
```

All cases reference system-only commands and require one final unconditional
fallback. They share the deadline due-case validator and typed controls. Cases
use the existing common condition evaluator and select one command; reactions
are not misused as mutually exclusive branches.

Physical IDs come from `SceneRules.inputs`, a readonly finite vocabulary. Every
registered milestone requires a physical mapping, and extra physical mappings
are rejected. Native code calls `World.input(id)` or `SceneModel.input(id)`.
The API returns the shared result, including busy/disposed/refused outcomes;
it neither synthesizes denial captions nor defers execution.

Guard inputs need no TypeScript registration. A source action `{input: id}` is
permitted only inside the matching guard's `guard.do`. Static validation checks
that exact origin against the prospective source. The private guard interpreter
supplies the trusted origin at runtime; ordinary ACT steps, item uses, other
guards, generic apply and physical calls cannot impersonate it. A player cable
cannot invoke an arbitrary system command by naming an input.

Guard order stays: mark guard passed, guard.ok, each authored step, opened event,
sector-unseal reply. Replacing an effect with an input preserves that insertion
point and the existing feedback cue. Keep a following native goal step when its
original position is after the control reply; moving it into the same shared
transaction would change that order.

Physical callbacks invoke input only after their existing cancellation check and
mechanical updates. The source command is atomic over ordinary shared state,
grants and committed communication. Prior physical or guard facts are not rolled
back on a source refusal. Reentrant dispatch returns busy; there is no hidden
nested transaction or deferred queue. Current guard/physical entrypoints run
outside an active shared transaction. Session disposal clears the model hook.

The editor exposes physical case conditions/order/commands and guard-input
create/rename/rebind/remove controls. Referenced origin changes/removal reject
atomically; remove/rebind guard steps first. Physical IDs remain code vocabulary.
The device guard-action picker lists only mappings for that guard, including an
explicit Add input action control. No raw JSON input is needed.

Verification: `check-native-inputs.mts`, Stacks immutable histories and the actual
input/case/Step form + protected Save/fresh shipping JSON/byte Undo regression.
Deadline histories and form regressions also pass after shared case extraction.
