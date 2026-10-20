# Starting evidence reconciliation

2026-10-19 original reconciliation; accepted 2026-10-20 under the user-approved retrospective
audit condition. G0 PASS. This records recovered evidence without rewriting history.

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
explicit. The chronology itself is not certified; acceptance uses the revised retrospective rule.

The original/current producer mapping and exact 66-row conversation reconciliation are now in
[COMMUNICATION-ACCEPTANCE.md](./COMMUNICATION-ACCEPTANCE.md). They derive from the untouched capture.
The all-scene inventory remains `scripts/scene-system/fixtures/all-game-initial-inventory.json`;
the six fixed technical workload definitions remain `scripts/performance/workloads.ts`.
Their existence alone is not measurement evidence. G6 was subsequently accepted in
PERFORMANCE-CHECKPOINT-2026-10-19-C.md; the historical chronology limitations above remain documented.


## G0 acceptance, 2026-10-20

The user explicitly accepted verification against the untouched451-file capture instead of an
unprovable requirement that every fixture and ledger predated implementation. No rendering or
behavior requirement was relaxed. Current raw receipt:
`.scene-system/authoring-stage-audit/g0-retrospective.json`, inspected source
`sha256:9f895b8a67cf4528aa4c66662b60eef86c30878fba590d4fcd33cb7ca5242f61`.

| Requirement | Verified evidence |
| --- | --- |
| Starting revision, source bytes, scoped dirty diff | reconstruct-starting-diff.mts rechecked all451 hashes and the23 added/350 modified/0 deleted reconstruction above |
| All19 starting scene inventories and compiled snapshots | Initial inventory equals the immutable manifest projection; every snapshot and native function fingerprint remains in manifest.json |
| Exact retired producer inventory | Receipt records all15 original flash callsites, gain observer and touch mirror locations; COMMUNICATION-ACCEPTANCE.md maps their shared destinations |
| Frozen conversations and stale Market rows | Exact66 original/current ID tuples, zero additions/removals/duplicates; cook/fish/repair/sleeper are migrated; check-migration-progress.mts verifies58 actor/17 bot bindings and zero legacy rows |
| Scene/controller destinations | All19 IDs match the historical controller inventory and current source registry; receipt maps all13 original callback categories to their shared source/registered primitive destinations |
| Preservation fixtures | Untouched serialized scene definitions/function hashes and baseline source remain the oracle used by the recorded raster and original/controller outcome comparisons; acceptance of their existence does not sign G12 |
| Six workload manifests | scripts/performance/workloads.ts retains the six fixed workloads, fixture settings/windows/counts; G6 measurements remain independently accepted |
| Limits and scope | Captured game subtree only; retrospective fixture/ledger chronology; no implementation or whole-goal completion claim |

G0 is inventory/baseline acceptance. G4/G7/G8/G9/G10/G12/G13 retain their own requirements.
