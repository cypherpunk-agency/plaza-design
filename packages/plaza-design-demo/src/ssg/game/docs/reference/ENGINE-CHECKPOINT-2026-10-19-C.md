# Consolidation checkpoint C

Verified source: `sha256:839777ab5e10b3a358ad0435cd0f3d33206db3254a2f6116b84a17e2480166f7`.
This is an integration checkpoint, not whole-goal completion or a publication receipt.

Both builds and package TypeScript pass. The packaged editor has 97 documents and 128 source
references: `app-WRL5F5JZ.js`, native runtime `play-4XJMVNIS.js`, and
`play-4158f8a5978df8a5.html`.

Actual in-app-browser checks pass for all 19 scene Play/Stop cycles. Each scene reaches its
matching running status and native Terminal; Stop returns to editing. Missing starting fixtures
were created through the typed UI in the disposable browser history. No source Save or campaign
reset occurred, and no application console errors were observed. Evidence:
`.scene-system/evidence/editor-native-play-839777ab-20261019.json`.

The immutable raster comparison passes all 173 cases: 95 scene, 50 device, 20 bound transit and
8 map cases. Every row has zero differing pixels, zero channel delta and no error. Evidence:
`.scene-system/all-game-pixel-check/evidence/839777ab5e10b3a358ad0435cd0f3d33206db3254a2f6116b84a17e2480166f7-1792443526110.json`.
These initial/state fixture comparisons do not certify every possible gameplay/HUD state.

Publication preparation removes one extra blank line at the end of content-contract.ts so
`git diff --check` passes. The resulting source identity is
`sha256:ea99643fd9d8c9c38fe5b1b71dc1c0f75016c99ff49c8aee9208f03877275afb`.
Both builds pass again. Native runtime remains byte-identical `play-4XJMVNIS.js`, SHA256
`2dbddf8b6705014dadd6bca056c809112945d1834b30b84862c5cc525d481eb7`.
The source-stamped HTML/app become `play-b59965c0bd30e65a.html` / `app-RLQZ7J4V.js`.
The browser and performance results above retain their measured839777ab source identity;
they are not relabelled as new measurements of the formatting-only identity.

The source-authoring changes since checkpoint B include Shop and Laundromat commerce freedom,
Market state/cursor replacement, shared Opening workflow commands and editable milestone roles,
Harbor Shift source/presentation/day rules, native dialogue graph projection and structural
controls, prospective Play fixture state, and Stacks/Downtown physical controller parameters.
Their bounded pending/history/bundle/protected-Save/fresh-import/Undo evidence is linked from
ENGINE-CONSOLIDATION-STATUS.md and the individual source-authoring notes.

Public document/source requests now bypass HTTP cache. An observed stale document/new script
validation failure was independently controlled with a fresh origin; the previously failing
public editor loads successfully after the change. No game simulation or drawing changes are
part of that cache policy adjustment.

Performance recordings for this same source pass all six workloads with three eligible repeats
each in `.performance/native-workloads/recordings/run-1792443247334/`. Independent summary
validation and top-three contributor inspection are recorded in
PERFORMANCE-CHECKPOINT-2026-10-19-C.md. No optimization is retained or gain claimed.

Remaining whole-goal work includes camera/visual state bindings, final ordinary-content and
controller inventories, complete lifecycle/current-format persistence acceptance, per-scene
coverage reconciliation and final removal/handoff. Historical baseline-timing limitations
remain explicit in BASELINE-RECONCILIATION.md. No gate is passed solely by this checkpoint.
