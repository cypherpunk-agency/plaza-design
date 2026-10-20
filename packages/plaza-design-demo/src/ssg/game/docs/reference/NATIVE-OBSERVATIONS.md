# Native observations and shared goal workflows

2026-10-20. Native observations are read-only projections of existing model state. They
have no condition list, goal-award loop, scheduler or saved values of their own.

`SceneData.observations` contains only `aliases`. An alias is one of:

- `{kind:"nodeConnected",node}`
- `{kind:"sectorOpen",node,sector}`
- `{kind:"keyHeld",key}`
- `{kind:"goalComplete",goal}`

The completed-goal observation reads the model's existing goal set. It does not create a
second progress flag. Aliases cannot shadow state, native derived names or builtins, and
source actions cannot write them. Validation uses prospective node/key/sector/goal sources.
The retired `observations.goals` field is rejected rather than backfilled or translated.

Capsule, Library and Moth's nine former observed-goal rows now use the ordinary shared
workflow: read aliases/queries, test a `native.triggers` condition, dispatch a system-only
command, emit an event, and bind it through `native.goals` to the existing model goal.
The condition includes a read of the completed goal, so repeated live ticks do not repeat
awards or commands. Shared goal state is visible immediately to subsequent ordered triggers.
The workflows run after the native tick and existing source intervals, preserving the prior
observation position. Inactive ticks do not award goals.

The device editor's Observations section offers typed alias kind/node/sector/key/goal CRUD.
Logic / Commands & dialogue edits the conditions, commands, events and native goal bindings
through the existing typed shared controls. Removing referenced aliases rejects until their
shared read bindings are changed in the same grouped transaction. There is no separate
observed-goal editor or native goal-condition evaluator.

Verification: `check-native-observations.mts` compares 128 immutable-original Library/Moth
network/sector/keyring combinations with active/inactive/repeated ticks and native save/reload.
It checks one shared award event per new goal, typed alias CRUD and invalid references.
`check-native-observation-save.mts` covers grouped history/bundles, observation changes plus
a shared Library goal-target edit, protected Save, actual pending execution, fresh shipping
JSON import/execution, atomic invalid reference rejection and byte Undo.
Current evidence: `.scene-system/native-observation-save/run-nkzR7G`.

Capsule uses 1,728 immutable-original thermal/boot/Pixel/door/goal timelines plus 108 original
router timelines and 12 kettle timelines. Goal order is recorded at insertion into the
canonical goal set on both old and current models. The obsolete native-only mock verifier
has been replaced by those real shared-session suites and current controller schema checks.
Typed shared goal-condition edits and protected Save/fresh import/Undo are checked by
`check-capsule-source-workflow-forms.mts` and `check-capsule-source-workflow-save.mts`.
Evidence: `.scene-system/capsule-workflow-save-QIZMdu`.

These focused checks do not sign the full controller/editor/preservation gates.
