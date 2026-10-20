# Shared action values

The existing `state.set`, `state.add`, `item.add` and `tokens` actions accept a
literal or the existing `ScalarRead` shape. This supports copying a current state
value or consuming an authored query without a scene effect or new evaluator.

```json
[
  {"state":"yard.heldX","set":{"state":"yard.parcelX"}},
  {"state":"review.total","add":{"query":"review.quantity"}},
  {"item":"soap","add":{"state":"review.quantity"}},
  {"tokens":{"query":"review.credit"}}
]
```

These illustrate the contract; Yard and Downtown source migration is separate.
Each read uses the current transaction draft and the session's readonly query
context. Earlier actions and authored reactions therefore see each other's
changes. Nothing is cached or persisted as another owner.

Declaration types, enum membership, string lengths, nullable values and numeric
bounds still govern `state.set`. Numeric increments retain the declaration's
integer/decimal semantics and safe numeric limits. Item and token increments
remain bounded safe integers, and their resulting balances remain between zero
and one million. A missing query context, wrong runtime type, invalid value or
insufficient resource refuses the entire transaction, including earlier writes,
emitted events and grant notifications.

The gameplay workbench preserves its literal controls and adds a
literal/state/query source picker. Numeric actions offer only numeric state and
query references. All nested references pass the same prospective validator:
deleting a referenced declaration/query, or renaming only its declaration, fails
atomically. Existing state/query authoring uses creation, explicit rebinding and
removal; this change does not invent a second rename mechanism.

Native dialogue's read-only metadata projection still accepts literal entry
actions only. Actual conversation execution uses the shared session; a later
scene migration using expression-valued conversation entry actions must remove
or explicitly omit that redundant native metadata projection rather than add a
second expression interpreter.
