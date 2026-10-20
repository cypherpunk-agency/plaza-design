# Starting evidence reconciliation

2026-10-19. G0 remains open. This records recovered evidence without rewriting history.

The immutable capture was taken on 2026-10-18 at 21:26:30.747 UTC, with Git HEAD
`31616f6d45adf2238ceccd9ca69f8a49e08450f3`. Its 451 game source files retain fingerprint
`4d646c8add7a13b4687bd85fc5dae517376df47234666623351896bf974dc805`.

`scripts/scene-system/reconstruct-starting-diff.mts` validates every captured file against the
original manifest and compares its bytes to that original Git tree. It never changes the baseline.
The resulting scoped diff has 23 added files, 350 byte-modified files and zero deleted files;
byte modifications include line-ending differences. Its identity is
`625a6dfed41d2fbd22a43636bf6174dffdbd6083f3123fb657fbb48627a9ae30`.
Raw file paths, before/after hashes and method are retained in
`.scene-system/all-game-baseline-reconciliation/starting-diff.json`.

This is a reconstruction of the captured game TS/TSX/JSON/MD subtree, not a contemporaneous whole
repository Git diff. It does not recover uncaptured paths or prove that all behavior fixtures and
the producer ledger were written before dependent migrations. Those timing limitations remain
explicit rather than being labelled PASS retrospectively.

The original/current producer mapping and exact 66-row conversation reconciliation are now in
[COMMUNICATION-ACCEPTANCE.md](./COMMUNICATION-ACCEPTANCE.md). They derive from the untouched capture.
The all-scene inventory remains `scripts/scene-system/fixtures/all-game-initial-inventory.json`;
the six fixed technical workload definitions remain `scripts/performance/workloads.ts`.
Their existence alone is not measurement evidence. G6 was subsequently accepted in
PERFORMANCE-CHECKPOINT-2026-10-19-C.md; the historical G0 chronology limitations above remain open.
