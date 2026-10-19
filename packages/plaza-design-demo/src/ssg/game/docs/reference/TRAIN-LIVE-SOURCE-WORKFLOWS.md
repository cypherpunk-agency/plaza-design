# Train live replies and world flag references

The Train mechanical controller still detects position crossings and physical
phase changes on its existing live tick. It reports registered `train.halted`
and `train.resumed` milestones at the former reply positions. Source input cases
and system commands now own the resulting reply events. The stopped cable event
still precedes the halt caption and its cable still arrives after 150 ms.
Geometry classification stays native; location and status words are source
labels rendered by the existing formatter.

The successful door operation calls `rideDoors(true)` exactly once, then reports
`train.doors.opened`. Its source command writes the ordinary declared harbor
flag. The existing following noun goal and source line retain their original
interaction/signal context and ordering. No new outcome interpreter, flag alias
or saved state owner exists. Paid brake result selection remains native and is
explicitly outside this slice.

`CitySource.HARBOR_FLAG` references an existing ordinary writable gameplay flag
in the complete prospective registry. The city editor offers that vocabulary;
readonly native observations are excluded. Its grouped rename updates declared
gameplay flags, conditions/actions, scene references, current starting fixtures
and the city reference together. Renaming does not convert player saves. An
unbound world flag or removed declaration rejects source Save.

Pending Play fixtures now receive an explicit vocabulary from actual prospective
owners: gameplay declarations, opening roles, exit references, companion unlocks,
the city role, current builtin flags, and pending network keys/programs. This
context replaces shipping allowlists. The pending validator, Play controls and
Play frame's validation and fresh Save use the same contract. Registered logic
modules retain their existing vocabulary. Source validation without prospective
context retains the existing shipping defaults.

Proofs:

- `check-train-live-workflows.mts`: 188 immutable location/phase/halt/cable/world
  flag histories, exact stopped/caption/cable boundaries and state/goals/changes,
  pause, offscreen, reset/restore and disposal.
- `check-train-world-flag-forms.mts` and `check-train-live-forms.mts`: actual typed
  grouped flag renaming, source label/input/reply edits, rejected references,
  deletion without hidden fallback and Undo.
- `check-pending-fixture-vocabulary.mts`: new prospective flags, keys and programs,
  fresh Save, removed references and replacement of shipping vocabularies.
- Existing 672 Train door histories and 840 unpaid brake histories also pass.

Four-source Save evidence:
`.scene-system/train-live-save-xBgoWH/evidence.json`. It covers actual bound world
execution, prospective fixture Save, invalid role/input/label/fixture rejection,
protected source targets, fresh saved JSON shipping import and byte-exact Undo.
Integrated builds, Play and pixel gates remain a separate goal checkpoint.
