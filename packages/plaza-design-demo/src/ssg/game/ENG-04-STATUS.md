# ENG-04 execution evidence

2026-10-18. Scope: [ENG-04-PLAN.md](./ENG-04-PLAN.md). Status: TECHNICALLY COMPLETE locally.
Demo feedback remains pending. No commit, push, deployment, campaign playthrough or CI expansion.

## Gate evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| I1 | PASS | Frozen game/demo corpus, intentional changes and native sequential/timed exceptions recorded in ENG-04-PLAN |
| I2 | PASS | check-eng04: repeated command/native preflight changes no state/history/timers; permission/resource refusals; late resource failure rolls back native/shared state and success emissions |
| I3 | PASS | Same check: shared manual, dialogue and signal commands; manual lockout, signal bypass, sealed noun and watchdog refusal; 48 exact Beach text/state/goal cases against legacy native execution |
| I4 | PASS | Typed source endpoint/verb validation, protected fixed conduits, invalid runtime connection leaves cables unchanged, native logic/cables/save round-trip |
| I5 | PASS | ComposerModel edit/Undo/Redo/portable bundle; mixed invalid import leaves all documents unchanged; actual AuthoringStore grouped Beach/Workshop Save/reload/Undo; mixed invalid grouped save leaves all sources unchanged; browser pending wire verified in private native Play |
| I6 | PASS | Same-runtime Workshop connected to Desk; browser navigation and standalone reload; direct sensor interaction, shared hatch/fan chain, permission failure/recovery; deterministic native timer/switch chain and real pausable scheduler/reset cancellation |
| I7 | PASS | 48 Beach legacy cases, recurring billing/danger checks, Market paid-sequence reload/failure; existing Beach immutable-baseline paint comparison: 60 exact command cases / 101 instances; Market geometry/actor/attachment checks; rendering source/art untouched by this phase |
| I8 | PASS | Updated feature coverage/docs; homepage and design builds; public packaging validates 41 documents / 86 source references; scoped existing foundation/conversation/commerce/Harbor/editor checks; git diff --check and local document links |

## Delivered

Shared command definitions may declare explicit native state, verb, committed event/goal and initial
wire bindings. Native state retains one owner in SceneSave through nativeStatePort. Shared eligibility
uses the same bounded transaction without committing; native eligibility preserves manual versus
signal access rules. The command session's native guard also applies to conversation/system callers.
Native goals receive committed event metadata with the state transaction, avoiding accidental awards
from reading state or running an unrelated operation.

SceneHost attaches the adapter only for explicitly registered bindings. Beach meter run/pause and
mixer pour/repeat use it. Native legacy steps remain reference/fallback data but are bypassed for
these verbs. Market fortunes charge and advance a saved cursor atomically. Existing gameplay
validators reject unregistered native bindings; native source validators protect IDs, ownership,
permissions and fixed conduits. Typed route/response and initial-wire controls use normal editor
history, bundles, protected source Save and pending Play.

Workshop uses the existing Sandbox artwork and native signal/logic system with its own gameplay
source. Its entrance board opens shared permission choices. Revoking permission refuses hatch open
without changing hatch/fan state or emitting success; restoring permission allows it. First benches
show direct use, the 150ms native cable, hatch-to-fan chain, and a pressure-plate/timer/switch circuit.
Off switches stop signals. Original QA guard/watchdog/fixed-cable stations remain native examples.
Ordinary Sandbox/S13 behavior authoring is unchanged. Demo-only switch availability is supplied to
older demo saves too; campaign capabilities are unchanged.

The Desk's new Workshop route uses a fixed demo-only binding. This is not generic scene/map creation
or ENG-08 completion. Editor Demo world selects library/shop/sandbox; ordinary Play adds Market/Beach.
Events resolves Beach's migrated native routes and pending initial wires to gameplay JSON. The live
Play inspector reports native and shared results, plus pure manual/signal eligibility.

## Verification performed

Commands from repository root:

```
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-eng04.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-public-editor-build.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-market.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-beach-composition.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-scene-batch.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-editor-milestone.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-gameplay-foundation.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-persistent-commerce.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-unified-conversations.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-demo-district.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-scene-pilot-parity.mts
pnpm --filter plaza-design-demo exec tsx scripts/scene-system/check-play-storage.mts
pnpm build:homepage
pnpm build:design-demo
```

All passed. Harbor preserves 1,100 legacy cases. Public packaging left source documents/homepage
unchanged and created no source journal. Protected source tests used disposable copies and removed
them after verification. Vite retains its large-chunk advisory; no optimization claim is made.

Browser: edited Workshop sensor wire to hatch in the typed editor; private Play showed the pending
endpoint. Ordinary E -> wave triggered hatch open and fan spin. Standalone `/?demo` traversed Desk
to Workshop, retained location on reload, lit the lamp via a sensor signal, and retained the lit
native state after another reload. In private Play, the entrance board's Revoke/Open choices showed
`Operation refused: conditions`, with permit false and hatch/fan false. Allow/Open plus closing the
panel yielded permit/hatch/fan true. No JavaScript console errors were observed. A stale pre-build
editor initially requested a removed hashed iframe asset; discarding its test-only draft and reloading
the editor loaded the current build. Temporary browser test tabs were closed; existing preview servers
were left running. No player-comprehension claim follows from these focused checks.

## Source identity and next scope

Base HEAD `6c15fc98572eed2d353ee32ae820060e464a64ce`, with uncommitted local work.
Final editor application `app-SLE5G5PK.js`, SHA256
`624b7a8641b9df8f16b6051e159d6e93a1590bfe4095acc344236b1788b5787c`.
Private Play entry `play-f4468ed8d9ab3bb6.html`, script `play-573AO23V.js`, SHA256
`df0feae961255ae67030d95795b8b78ff7ccc7d94fd04590ac3f2145268c63c4`.
The generated manifest binds 41 document revisions and runtime assets. No publication was requested.

Next engineering scope is ENG-05 objectives/guidance/capabilities/access, with a frozen corpus and
detailed gates still required. ENG-06 retains clock/lifecycle/performance work. Market haggling,
Beach rental/danger/other verbs, native condition strings, other dialogue adapters and most device
action lists remain explicitly unmigrated. Not every legacy operation is atomic. Story M2 pacing
review and user demo feedback remain pending; no story milestone was advanced.
