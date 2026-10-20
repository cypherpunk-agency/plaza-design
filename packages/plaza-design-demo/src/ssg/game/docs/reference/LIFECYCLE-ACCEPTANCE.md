# Existing-runtime lifecycle acceptance

2026-10-20. **G5 PASS** at runtime source
`sha256:a3fac97efcb8b300260b1b12296586cf5ae150629c617b2694749001f34f92a4`.
This gate covers lifetime and clock ownership, not full authoring/controller/network/persistence gates.
Ownership inventory: [LIFECYCLE-OWNERSHIP.md](./LIFECYCLE-OWNERSHIP.md).
Raw combined report: `.scene-system/evidence/lifecycle-a3fac97e-20261020.json`.

## Required cases and observed results

| Requirement | Evidence and observed result |
| --- | --- |
| Repeated scene visits | Actual packaged Test District: nine verified visits across three areas after warm-up; cached panel/schematic/vision counts stay4/4/4; no warning/error log. Cached hosts belong to the Game/page, not individual visits. |
| Repeated private Play | Actual packaged editor: two passes across all19 native scenes,38 running acknowledgments and38 Stop operations with iframe count zero afterwards. No warnings/errors. App app-TTSRIDEC.js, Play play-2NOVKDM4.js. |
| Stopped cached Game | `check-game-reopen-lifecycle.mts`:20 actual stop/start cycles retain the paired source session/model and remaining600ms handoff across9000ms stopped time. No stopped writes; three input handlers/one RAF return without accumulation. True session disposal cancels work and detaches hooks. |
| Closed/replaced panels | `check-panel-lifecycle.mts`:20 actual panel/toy close/replacement cycles remove global keys, solved timeout, pointer handlers and RAF. Saved stale callbacks cannot draw, close replacements or act through detached controls. Normal1299/1300ms solved boundary unchanged. |
| Interrupted gestures | `check-schematic-gesture-lifecycle.mts`:567 actual cases across seven gesture paths/eight interruptions. Shared PointerGesture owns hacking and lock-toy window drag handlers. Foreign pointers, stale callbacks and replacement cannot commit an old tap/drop. |
| Focus and menu callbacks | `check-schematic-focus-lifecycle.mts`:seven interruption paths, replaced/stale focus guards and1400ms expiry. `check-menu-lifecycle.mts`:20 fade/hide/reopen cycles,899/900ms and reduced-motion0ms boundaries; actual current slot loading249/250ms and canceled stale load. |
| Private startup/disposal | `check-play-startup.mts`:actual mount ignores stale/superseded messages, load/error callbacks and stopped font continuations; Stop/reset/dispose remove owned timer/listener/frame work; failure does not silently retry or edit source. Partial-registry VM fixture now supplies its current explicit control dependencies. |
| Shared deadlines/handoffs | `check-gameplay-handoffs.mts`:1499/1500ms, pause/resume, failed commits, repeat guard,100 clock-clear cycles and100 actual model reset/restore cycles, disposal cancellation. |
| Communication ownership | `check-communication-callsite-clocks.mts`:22 actual Game/HUD/guidance cases for hidden/covered/reduced-motion pause/resume. `check-communication-ownership.mts`:real Schematic/Host/Game receipts, scoped chimes and no muted timers. Existing G1/G2 evidence remains separate. |
| Interaction/paint preservation | Conversation completion/native actions,28 original camera histories, Game opening42 histories and both builds pass. Native raster173/173 has zero pixel differences/errors. This does not certify all G12 states. |
| Save isolation | `check-play-storage.mts` in private and native modes:actual save/slot/resume/reset paths use the intended store; private mode performs zero browser-store reads/writes. Demo sentinel checks also pass. |

The real packaged Sandbox cipher panel was turned/closed/reopened three times and private Stop
removed its owning frame, with no warning/error log. Mechanical tests own cancellation and timing;
this browser check verifies the real panel is integrated.

## Preserved simulation policy

- Game.stop suspends a cached Game. Hosts/source sessions resume together; private Play disposal
  destroys its realm. No per-visit teardown/rebuild or secondary state copy is introduced.
- Active scene ticks run native rules and source workflows. Other hosted scenes retain original
  trace decay, watchdog and CLOCK behavior. Existing delayed physical work uses SceneTime.
- Pause holds SceneTime and pending actions; wall lockouts still use Date.now. Hidden documents
  pause communication readability, while simulation retains its existing browser-throttled policy.
- Reduced motion changes presentation, not communication expiry. Native Metro/city/weather/
  economy timing policy is preserved. Pure sampled controllers own no extra timer/listener.
- Panel/toy UI timers retain their original wall-time boundaries while open. Closing/replacing
  their owner cancels them; RAF callbacks cannot run against replacement panels.

No new story, renderer, remote ability, clock policy, historical-save translation or CI service.
Other goal gates remain independently open.
