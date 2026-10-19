# Feedback-ready package: evidence

2026-10-18. Scope: [ENG-05-08-PACKAGE.md](./ENG-05-08-PACKAGE.md).
**Technically complete within the named package. User experience feedback is pending.**
Starting HEAD: `256d497`; all new changes remain local and uncommitted. No publication occurred.
Final game-source fingerprint: `sha256:73176950a0b9c85bf64227fd75376660b1a0035aaa38b902cf6bd23bdddbbb34`.
This hashes the current game TS/TSX/JSON tree, including new/uncommitted files; it is not a claim
that a deployed branch contains this source.

Run checks from the repository root with
`pnpm --filter plaza-design-demo exec tsx scripts/scene-system/<name>.mts`.

| Gate | Status | Evidence |
| --- | --- | --- |
| F1 | PASS | check-eng05: shared condition/command-reference validation, unknown/forbidden references, unsupported scene version; check-manifest-pilot: missing binding/version rejection and atomic source/history rollback |
| F2 | PASS | check-eng05: 64 Downtown combinations, 2,048 Harbor objective/attention combinations, all map places over location/visibility/gate/harbor/ride combinations, detached capabilities and pure door/key permission; check-scene-pilot-parity: 1,100 immutable Harbor cases |
| F3 | PASS | Native Game uses shared objective/access adapters; check-eng05 actual command refusal/authorization/purchase/objective/reload; check-demo-district isolates actual save/slot/resume modules with campaign sentinels; browser real counter refusal/authorization/completion exercised |
| F4 | PASS | check-manifest-pilot round-trips pending Harbor objectives and counter access requirements through model history, portable bundle and grouped protected source Save/reload/undo; check-eng05 executes pending resource requirements; browser typed objective edit appears in real private Play and Undo closes the stale frame |
| F5 | PASS | check-performance-recorder covers disabled path, bounded buffers, overflow, nested/async parents, scene owner tags, incomplete samples, invalid endings, stop/disposal and interleaved synthetic overhead; actual browser capture/export/report command and final smoke described below |
| F6 | PASS | check-market-conversations preserves four page sequences/final-repeat, cursor reload, unrelated state/resources and fortune cursor; pending gameplay text reaches native factory; 64 exact native actor paint transcripts. check-unified-conversations and check-eng04 retain their scoped behavior checks |
| F7 | PASS | check-manifest-pilot adds registered art/rebinds an interaction without TypeScript edits, executes native completion, rejects invalid references atomically, and exercises history/bundles/protected source persistence; browser private Play completed/reset the pilot and consumed an edited objective. Campaign remains 19 scenes |
| F8 | PASS | Binding inventory, coverage and authoring/runtime guidance updated; homepage/design builds pass; check-public-editor-build reports 44 documents/89 source references, source preservation and no journal creation; check-play-storage, check-native-preview, check-authored-actor-paint (8 native transcripts), and git diff --check pass |

## Player feedback update (2026-10-18)

The user reports purchases, objectives/access, conversations and devices working; wiring mostly
works with details deferred. Editor usability review awaits their ongoing editor rework. Harbor
pacing/comprehension remains unreviewed. Earlier pending-feedback statements describe the original
technical delivery; this update supersedes them for these demo mechanics only. No new technical
gates or full campaign acceptance are implied. Next proposed scope: [consolidation goal](./ENGINE-CONSOLIDATION-GOAL.md).

## Performance evidence and practical limits

- First browser export: `.performance/package-evidence/browser-demo-first-recording.json` (ignored local
  artifact), source `sha256:5d42a54cb9824645d4cf071f33e071f27a1f854037adaf3385dd684620cad2b6`.
  50,546.5 ms; 3,031 frame/render samples, 808 host ticks and 9 save samples; overflow/incomplete/
  invalid endings all zero. JSON download and the local report command passed. This predates the
  final owner/environment/UI refinements and is labelled with its own source.
- Final-source browser smoke: scenario `?demo&perf`, matching the final fingerprint above;
  979 frame/render samples, 195 host ticks, two saves; zero overflow/incomplete/invalid endings.
  Environment includes 1280x720 CSS viewport, DPR 1.5, 1818x850 backing canvas, scene/camera/scale,
  native population, hosted-scene list, city/weather and visibility metadata. CPU/GPU/refresh rate
  remain explicitly unavailable. This was a short harness smoke, not a repeatable baseline.
- Browser synthetic overhead calibration: five interleaved 10,000-span pairs; final median additional
  cost about 0.31 microseconds/span in this browser. A Node run measured about 0.09 microseconds/span.
  Timer resolution/JIT/workload affect these probes; they are not game-speed improvements or a
  number to blindly subtract. No optimization, mobile or actual-presentation latency claim is made.
- Renderer pass order, clocks, host scheduling and save scheduling retain their owners. Hosted-scene
  counters can reveal existing background work; changing that policy is outside this package.

## Review entry points

- `http://127.0.0.1:4202/?demo`: Purchases -> Guidance example. The example is optional; normal purchase
  testing remains available. Start, try the refused action, authorize in place, then buy.
- `/editor/`: Scene logic exposes objective and access controls. Market Gameplay contains the four
  migrated conversations; native Market Play has direct actor bookmarks.
- `/editor/` -> Manifest pilot: edit the three demo-manifest documents, then launch private Play.
  Stop/reset/leaving destroys that realm. The pilot's runtime shop role does not enter campaign saves.
- `/?demo&perf` or `/editor/?perf`: opt-in local CPU recorder; see the recording guide.

## Scope retained for later work

Downtown's save-field bridge, native world/access policy declarations, specialized scene controllers,
remaining 45 inventoried legacy conversation paths and generic bot reactions remain code-owned where
listed in the binding inventory. The isolated manifest pilot is not whole-world registration or
player-facing packs. Full ENG-06 baselines/diagnosis/optimization and broader ENG-08 remain open.
Story M2 pacing feedback is still pending; no story milestone was advanced. Campaign playthrough,
CI/regression expansion and publication were not undertaken. Vite retains its existing large-chunk
advisory; the build succeeds. These scope limits are not unpassed gates of the selected package.
