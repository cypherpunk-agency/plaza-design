# Camera discovery command evidence

Yard `camera.actions.inspectOwned` and Stacks `camera.actions.tagOwned` bind the
existing panel inputs to ordinary interaction commands. Qualified declarations own each scene's `found` value in its common owner block
(`values.yard.found` / `values.stacks.found`); native rules and shared commands
reference the same live block. Engine scene saves do not duplicate these scalars.
Emitted source events grant the `find` goal through the existing native goal map. Panels
retain camera aiming, zooming, physical ownership/home checks and their replies.

Its 28 histories cover both scenes, initial discovery/goal combinations,
Yard camera pan, Stacks stack/air/chassis/out positions, ground/wrong/owned
objects, zoom/tag/repeat actions, current scene-save reload and disposed command
sessions. Replies, state, goals and effective canvas commands match the immutable
original panels exactly. An edited pending source command that sets found but
omits the goal proves that panels no longer own discovery outcomes.

Redundant redraw counts differ as expected: across the full histories including
fixture setup/reload/reset, Yard original/current counts are 33/30 and Stacks
52/48. Original first discoveries call both `goal()` and `changed()`; shared goals
commit directly with one Game-style notification. Committed outcomes, replies and
painting remain equal.

Stacks shows its source-authored `scope.tag.refused` response when a bound
command refuses, or when the binding is removed, and displays tag success only
after a successful commit. The typed pending-source test exercises a resource
guard and an unbound action, verifying no found/goal mutation and no false
success. Yard's inspection reply and repeated inspection behavior remain equal
to the original.
