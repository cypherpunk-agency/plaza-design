# Shared gameplay engine: current execution evidence

2026-10-18. Parent: [ROADMAP.md](./ROADMAP.md). Goal definitions:
[GAMEPLAY-ENGINE-PLAN.md](./GAMEPLAY-ENGINE-PLAN.md).

This ledger records ENG-01 through ENG-03. The subsequent ENG-04 delivery and current build evidence
are recorded separately in [ENG-04-STATUS.md](./ENG-04-STATUS.md).

## Result and scope

ENG-01 through ENG-03 are technically complete within the approved finite corpus. This is local,
uncommitted evidence. ENG-04 onward, campaign playthrough, CI expansion and publication were excluded.
Demo feedback remains pending. Story M1 remains design-complete; M2 awaits pacing/comprehension review.
Artwork/workbench S0-S13 retain their original bounded records. No story milestone was advanced.

## Gate ledger

Check names below are scripts in `packages/plaza-design-demo/scripts/scene-system/`, run with
`pnpm --filter plaza-design-demo exec tsx scripts/scene-system/<name>.mts`.

| Gate | Status | Evidence |
| --- | --- | --- |
| E1 | PASS | Parent links reconciled; obsolete editor-not-started claim removed; story M1-M9 retained; local Markdown links checked |
| E2 | PASS | ENG-01 through ENG-08 crosswalk and finite E/C/D gates; later scopes require detailed corpora before execution |
| E3 | PASS | Approved scope recorded in persistent goal, plan and ledger |
| C1 | PASS | check-persistent-commerce, check-demo-district, check-play-storage in private/native modes: legacy defaults, actual save/slot/resume/reset modules, lifetimes and unrelated resources |
| C2 | PASS | Commerce/Shop/Laundromat checks: atomic charge/grant/stock/cursor; failure preserves state; reload and repeated factories preserve rotation |
| C3 | PASS | Commerce check: default quote equals charge, explicit discount/fee divergence, actual-charge affordability, bounded stock/cursor/state validation |
| C4 | PASS | Scene-batch/editor checks: pending typed edits, portable/history operations and protected grouped save/reload/rejection/undo; actual HTTP authorization/conflict checks; browser price edit and Undo |
| C5 | PASS | Demo uses native factories and actual isolated storage modules with campaign/Harbor sentinels; browser navigation/reload verified; native paint/geometry checks |
| C6 | PASS | demo/coverage.json, behavior ledger below, public packaging check and both builds |
| D1 | PASS | Unified-conversations check: sequences/final-repeat, cycles, conditional entries/redirects, choices, persistent cursors and commands; Harbor behavior parity |
| D2 | PASS | Pure frames/close, explicit guarded entry rewards, atomic choice plus post-choice redirect plus entry; failure retains node/state/events. Library catalog has no legacy entry effects; remaining effects inventoried |
| D3 | PASS | 17 scoped paths use shared runner and native bubble/panel adapters without duplicate migrated cursor maps; native actor/paint/Harbor parity |
| D4 | PASS | Typed controls/private Play inspect pending definitions and transactions; editor checks cover bundle/history/protected persistence; browser purchase and insufficient-funds rejection |
| D5 | PASS | Shared two-area demo includes simple/cyclic talk, choices, failures and combined purchases; standalone reload retains state; private Play remains disposable |
| D6 | PASS | Conversation corpus lists 17 migrated paths, 49 legacy paths and generic bot reactions separately; appearance checks and both builds pass |
| ENG-04-08 | PROPOSED | Detailed scopes/gates required before execution |

## Delivered behavior

- Saved typed numeric/boolean/enum state with owner, default and lifetime. Legacy saves gain missing
  values lazily without a reset; foreign state is preserved.
- Common purchases derive displayed and charged prices. Explicit modifiers target both, quote or
  charge. Stock/rotation/payment/rewards commit atomically. Shop rotation and authored NPC progress
  persist across sessions; Laundromat uses the same operation.
- One conversation runner supports NPC sequences and native choice panels, explicit entry commands
  and atomic transitions. Library catalog text has one source in its gameplay document.
- Typed controls, pending native Play, inspection, bundles/history and protected source validation.
  Incompatible old literal-payment bundles reject atomically with migration guidance; compatible
  older composition-only bundles remain supported.
- Test District links a Library-based Desk and Shop-based Counter with one gameplay definition.
  `?demo` has isolated autosave/slot/resume keys. New Game resets only demo autosave. Editor **Demo
  world** previews pending sources/compositions in disposable private storage. Entry is restricted
  to the two supplied roles; generic scene/map authoring remains ENG-08.

Local demo: `http://127.0.0.1:4202/?demo`. Editor: `http://127.0.0.1:4202/editor/`.
These are existing local services, not deployment evidence.

## Focused verification

Final source after state-bound validation changes passed:

- check-persistent-commerce, check-unified-conversations, check-demo-district,
  check-gameplay-foundation, check-scene-batch and check-editor-milestone.
- check-authored-actor-paint: eight exact native paint transcripts including nested character
  canvases across camera/time/light/height. Shop/Library/Laundromat geometry/actor checks also pass.
  Shop covers 12 cyclic purchases and 36 failed attempts; Laundromat covers 75 boundaries/repeats.
- check-public-editor-build: 38 documents, 83 source references; hashed assets valid, homepage and
  source documents unchanged, no authoring journal created.
- check-play-storage with and without --native.
- pnpm build:homepage and pnpm build:design-demo (TypeScript plus Vite). Vite retains its large-chunk
  advisory; this delivery makes no performance improvement claim.

Also passed during this delivery: 1,100-case Harbor legacy behavior parity; Shop baseline paint;
Harbor/tea/foreground/shift paint comparisons; protected authoring HTTP token rejection, save/reload,
stale conflict and invalid-permission rejection against disposable source copies. An initial sandbox
bind restriction was resolved by an authorized rerun; its temporary server closed. No blocker remains.

Browser verification: Desk-to-Counter travel, BLUE purchase, reload, then crisps with retained
balance/rotation. Demo New Game returned to Desk. Private editor Play combined discount and hidden
fee into quote 1 / charge 3; purchase changed tokens 5 -> 2, rotation 0 -> 1, stock 8 -> 7 and emitted a
conversation-sourced event. Next purchase failed without mutation. Pending base-price edit changed
the private quote; Undo restored it without source Save. No console errors observed. This is focused
demo verification, not a campaign playthrough or comprehensive pixel corpus.

## Evidence identity and limits

Base HEAD: `6c15fc98572eed2d353ee32ae820060e464a64ce`, with uncommitted changes.
Final public editor: `app-5VNQWFPA.js`, SHA256
`4ca776b9e97e2aded791cdc9e942b09b95c61d5bdefe0d7b11cfa6240b410bd9`.
Private Play entry: `play-ed54effca5f7ceb0.html`; script `play-EJMG3BBW.js`, SHA256
`99486c7e0a041f3c8d3a492006bfb981a5e8b06b62a74f493787c9d963446158`.
Generated build-manifest.json binds 38 source document revisions and runtime assets.

[CONVERSATION-MIGRATION.json](./docs/reference/CONVERSATION-MIGRATION.json) records the corpus.
Remaining legacy NPC/device paths and bot reactions keep native adapters. This is a unified foundation
and scoped migration, not removal of every legacy dialogue system. Unmigrated device operations are
not claimed transactional. Generic scene registration/map authoring, objectives/access unification,
performance harness and remote networking remain later deliveries.

User demo feedback and M2 pacing review remain separate from technical acceptance. Nothing was
committed, pushed or deployed by this execution.
