# Game performance harness proposal

2026-10-17. Design against source revision `66cc854`. Proposed implementation work;
this document does not claim current FPS, measured bottlenecks or completed milestones.
Related [system review](../reference/HACKING-SYSTEM-REVIEW.md).
Priority and status now belong to [ROADMAP.md](../../ROADMAP.md), ENG-06. This document supplies
detailed measurement requirements, not a separate active roadmap. No harness is claimed implemented.

## Outcome

Make an optimization answerable: on the same workload and device, which work got faster,
by how much, at which tail percentiles, without changing pixels or gameplay outcomes?
Cover startup, animation, simulation, hacking DOM/SVG, saves and lifecycle. Keep measurements
local and opt-in; do not add production telemetry or publish a diagnostic endpoint implicitly.

Do not replace Canvas with WebGL, reduce DPR, reduce weather quality, simplify artwork or
alter game clocks as an initial optimization. Those change product behavior or appearance.
Most artwork is Canvas 2D procedural drawing with existing caches, not a custom shader engine.

## Three complementary lanes

| Lane | Exercises | What it answers | What it cannot establish |
| --- | --- | --- | --- |
| Live game/browser | Production-built game, native RAF, real intervals/timeouts, actual Canvas, DOM/SVG, input and storage | Player-visible cadence, stalls, interaction response, asynchronous work, layout/paint/raster/composite and lifecycle | Perfect determinism; RAF interval alone is not proof that a frame was presented |
| Isolated native render | Prepared scene/model/presentation snapshots through `renderSceneFrame`, shipping context attributes and controlled frame inputs | CPU submission cost by render pass; effect/scene comparisons; cold/warm cache behavior | Full game cost, GPU completion time or input latency |
| Isolated simulation | Actual SceneModel/rules/network algorithms with controlled clock/scheduler/input stream and bounded workloads | Rule/event/queue scaling, repeatability, resulting state and timing | Real browser scheduling, DOM or rendering cost |

Measure the editor separately when desired: full `native-preview.render` includes validation,
definition/model creation, canvas reset, resolution/bounds and selection overlays. It must not
be reported as the game's steady render cost. Reuse the native renderer and factories rather
than copying their artwork or substituting a simplified benchmark renderer.

Keep startup/load-to-control, first-frame/first-use cache cost, scene entry, steady-state
frames and transition spikes as distinct measurements. Report build/loading bytes and
asset/font readiness separately from warmed gameplay.

## Instrumentation boundaries

Use a small optional recorder with a no-op/absent path in normal runs. Allocate bounded,
preallocated numeric buffers; aggregate/export after the timed window. Count buffer overflow
and unsupported data explicitly. Avoid per-frame console output, object snapshots or JSON.
Measure recorder-on versus recorder-off overhead before interpreting small improvements.

Suggested ownership (new modules, names provisional):

- `runtime/diagnostics/performance.ts`: recorder/span IDs/counters and session lifecycle.
- `scripts/performance/`: local runner, scenario manifests and report generation.
- `.performance/`: ignored raw samples, environment manifests and trace files.
- Existing editor/world/event panels may display reports later; no dependency on editor UI
  is required to run a game benchmark.

Proposed spans and counters:

| Entry point | Attribution |
| --- | --- |
| `runtime/game.ts` RAF callback | Raw RAF gap, uncapped elapsed time, capped game dt, update, story/travel/city, render, HUD/maps, followHost/feedback |
| `runtime/render-scene.ts` | Preparation, lighting setup, sky/city/street, scene world/devices, weather/puddles, actors, shadows/grade/lights, front/prompt/bubble passes |
| `engine/host.ts` interval | Host ID, active/paused state, actual dt, model tick, meters, drift, save work; include every visited host |
| `engine/time.ts` callbacks | Pending/max callbacks, intended deadline, actual dispatch lateness, pause/resume/cancel; do not reschedule work just to measure it |
| `engine/model.ts` | Acts, emits, deliveries/drops, fan-out, live links/logic/nodes, trace/guard changes, expensive reach queries when diagnosed |
| `engine/schematic.ts` | Full redraw/meter/geometry counts and CPU time; visible device/noun/link/DOM counts |
| `runtime/save.ts` and caller | Snapshot, stringify, storage-write CPU time/bytes/count, reason; read-only operations causing writes |
| Lifecycle | Hosted scenes, active callbacks/listeners where owned, DOM/canvas/cache counts, retained heap between equivalent settled checkpoints |

Nested spans need inclusive/exclusive attribution; do not add overlapping totals together.
Callbacks outside RAF must be included in session costs without pretending they ran inside
the current frame. The existing SceneModel observer serializes/deep-freezes events; use it
for short explanatory traces, not as the default per-action performance recorder.

JavaScript timers around Canvas measure command submission and any synchronous work, not
completion of all browser raster/GPU work. Supplement lightweight runs with separate Chrome
Performance traces for style/layout/paint/raster/composite, GC and long stalls. Trace-enabled
runs are diagnostic and must be labelled separately because recording has overhead.
See [Chrome Performance reference](https://developer.chrome.com/docs/devtools/performance/reference/).

Use `PerformanceObserver` only after checking supported entry types. Long animation frame
entries provide additional attribution where supported; they are not a substitute for frame
distributions. See [Long animation frame timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing).
Memory APIs are optional: `measureUserAgentSpecificMemory` needs a secure, cross-origin-isolated
document. Do not change public hosting isolation headers solely to obtain a benchmark number.
Use feature detection and browser heap diagnostics when appropriate; mark missing memory
measurements unavailable. See [memory API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory).

## Measurement discipline

1. Use a production build and a dedicated browser context/save fixture. Never benchmark
   against a player's live save. Record commit, dirty diff hash, build mode and scenario hash.
2. Record browser/version, OS/device/CPU/GPU where available, power mode, hardware acceleration,
   CSS viewport, backing resolution, DPR, game scale/zoom, refresh rate, reduced-motion/audio
   settings, seed, time/weather, camera, entities, links and hosted-scene history. Unknown
   environment facts stay unknown. A desktop throttle is not evidence of mobile GPU performance.
3. Keep a real monotonic measurement clock. Control simulation time and random inputs
   independently in isolated lanes. Existing `scripts/scene-system/serve.mts` freezes Date,
   performance.now and RAF: that fixture is unsuitable as a performance runner.
4. Keep shipping Canvas attributes/backend for speed runs. Do not inherit the correctness
   fixtures' readback-oriented context policy. Capture getImageData/PNG/hash outside timed
   runs, ideally in a separate context/process. Record backend differences explicitly.
5. Wait for fonts/assets and a declared warmup (initial proposal: 5 s), then record a fixed
   interval (initial proposal: 30 s). Use fixed simulated duration/input in isolated runs.
   Collect at least five independent runs for the main scenarios; extend if tails are noisy.
6. Separate cold and warm cache results. For A/B comparisons, interleave baseline/candidate
   runs on the same machine/browser; record thermal/load conditions where practical. Exclude
   hidden-tab intervals from steady-frame metrics but retain visibility events and test
   background/resume behavior as its own lifecycle scenario. Do not silently discard stalls.
7. Export raw bounded samples, per-run percentiles, median run summaries and variability.
   Compare against the observed noise floor. Do not pool all samples and erase run variance.
   P99 at short sample counts is unstable; report sample counts and extend tail investigations.

Initial report metrics: p50/p95/p99 RAF gaps and CPU spans, gap distribution against the
recorded display cadence, long tasks/frames where supported, input-to-handler and
handler-to-next-render opportunity, callback lateness/queue peaks, save cost/count/bytes,
load/entry times and retained memory/counters after repeated equivalent cycles.
Do not label next-RAF timing as actual screen presentation latency; use browser trace/input
timing attribution where available. A 60 Hz target gives 16.67 ms per frame; 30 Hz gives
33.33 ms. Targets are per device/scenario, not promises before baseline data exists.

## Initial scenario set

These are short controlled performance scenarios, not a campaign playthrough. Review the
scenario manifests before introducing browser automation or a broader regression/CI suite.

| Scenario | Purpose |
| --- | --- |
| Capsule idle and ordinary popups | Small indoor baseline; first use, label/save overhead |
| Downtown fixed camera and pan, day/night, dry/rain | Large scene, weather/light/character mix, camera and culling cost |
| Downtown hack vision with controlled open groups and wire drag | Combined Canvas, DOM/SVG, geometry, input and feedback |
| Sandbox board/vision at documented native population | Device vocabulary, clocks, trace, watchdog and baseline circuit activity |
| Bounded simulation growth: links, fan-out, timers, feedback | Scaling curves; explicit event/time ceilings; abort with diagnostic rather than hanging |
| Moth and Stacks timed-state fixtures | Watchdog/sequence/timed-machine costs and deadline stability |
| One existing animated sequence | Sequence/controller cost, startup/warm-cache behavior and handoff |
| Repeated scene visits, pause/resume and game close/reopen | Visited-host overhead, callback/DOM/heap retention and background policy |
| Optional editor workload | Preview/model rebuild, timeline seek and selection costs, reported separately |

Start with one desktop viewport and one phone landscape profile with recorded DPR. Use a
real phone for mobile conclusions. Expand only when data reveals a missing workload.

## Optimization candidates, not established bottlenecks

- Avoid writes/HUD refresh on `tokens(0)`; batch save notifications per real transaction.
- Coalesce model invalidations; preserve keyed schematic nodes; batch geometry reads/writes.
- Reduce unnecessary visited-host/background work after its gameplay policy is explicit.
- Inspect render allocation/culling and immutable derived geometry before adding caches.
- Extend existing character/glow/puddle caches only with complete invalidation keys for
  environment, pose, state, camera/scale, animation and source edits; bound cache memory.
- Investigate duplicate clears/full-screen blends only with trace evidence. Preserve canvas
  state, draw order and native pixel results; apparently redundant operations can matter.

Do not default to worker/offscreen rendering, WebGL/shaders or a fixed-step engine rewrite.
Those have larger compatibility/appearance/scheduling costs and need measured justification.

## Milestones and acceptance

| Milestone | Deliverable | Completion gate |
| --- | --- | --- |
| P1: observable live pipeline | Opt-in bounded recorder, game/host/save/overlay spans, environment and raw JSON report | Accounts for RAF and async work; no player-save contamination; recorder overhead quantified; disabled path verified |
| P2: reproducible render/simulation lanes | Prepared native renderer sessions and controlled native-model workloads; separate real/simulation clocks | Repeatable outputs, declared cache policy, bounded feedback; no frozen measurement clock or readback in timed region |
| P3: baseline and diagnosis | Reviewed finite scenarios, repeated runs, CPU/browser trace attribution and a ranked bottleneck report | Raw data + manifests + variability; separate desktop/mobile and cold/warm claims; unsupported metrics explicit |
| P4: measured optimization | One bottleneck per change with matched before/after reports | Gain exceeds measured noise on target workload; representative workloads do not materially regress; pixels and observable behavior preserved |
| P5: usable workflow | Local command/report viewer, run instructions, baseline update policy | Another developer can repeat comparison and explain an optimization's result; CI remains a separate discussed decision |

Proposed overall goal condition: all P1-P5 deliverables accepted; representative baseline and
candidate reports reproducible; at least one measured optimization accepted; pixel identity,
save compatibility and agreed timing/interaction behavior retained; no mandatory production
telemetry. Do not mark completion because a dashboard exists or average FPS improves.

Before implementation, choose target device(s)/performance budget and review the short
scenario scope with the user, respecting the existing playthrough/automation discussion.
Implementation can begin with P1 without committing to renderer or gameplay redesigns.
