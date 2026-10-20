# Opening phase selection

The opening story selects its phase from ordered `PHASE_RULES` in `story/opening.json`.
Each conditional row uses the common gameplay flag conditions (`flag`, `all`, `any`, `not`)
and selects an existing phase. The last row is an unconditional fallback. The first matching
row wins. Phase metadata still owns hack availability, clock pinning and resume destinations.

The default source expresses the previous selection order: free before the opening or after
jacking in, then uplinked, deleted, flat, and home. No separate coded selection chain remains.
These rules select the current phase; this slice does not migrate every story action, cinematic
completion or reward still performed in Game.

In the editor's opening-story Phases group, conditions use the existing typed flag-condition
controls. Authors can change the selected phase, add/remove conditional rows and reorder them.
The fallback stays last. Validation rejects missing/early fallbacks, unknown phases/flags and
conditions requiring context that the opening phase selector does not receive.