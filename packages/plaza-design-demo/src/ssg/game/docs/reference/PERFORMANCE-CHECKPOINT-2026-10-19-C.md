# Six native workload baselines

Source `sha256:839777ab5e10b3a358ad0435cd0f3d33206db3254a2f6116b84a17e2480166f7`,
harness `sha256:4f9f30c3018122a63ae68928987764f8f90ce17c0a04260fd95dd9259e0a9f22`.
Raw evidence and environment/calibration for every repeat:
`.performance/native-workloads/recordings/run-1792443247334/`.
`summarize.mts` independently revalidates all 18 reports and produces `summary.json` with
status MEASURED. All six workloads have three structurally valid, baseline-eligible repeats.

The fixed manifest is unchanged: 5-second warmup and 30-second steady measurements for quiet
Downtown, rainy Market and native model fan-out; 12 board open/close pairs and 12 scene visits
per transition repeat; 5 fresh opaque private Play realms per lifecycle repeat. The latter
checks 15 starts/stops total, empty initial private storage, private stopped saves and zero
remaining frames. No parent/campaign save is used. Viewport stays 960 by 540 at native DPR 1.5.
Actual UI clicks supply trusted parent activation for live-game workloads.

Every raw report retains visibility, workload/fixture, source, browser, summary, bounded samples,
clock progression and five recorder calibration rounds. No samples overflow or remain incomplete.
Steady-game active/wall ratios are approximately 1.0. Earlier sparse-scheduling and empty-frame
Chrome diagnostics remain untouched; these new measurements were taken in the in-app browser.
This establishes a usable environment, not the cause of the earlier failures.

## Contributor inspection and optimization decision

The summary ranks exclusive recorded CPU time, excluding RAF gaps, timer lateness and elapsed
private-Play start/stop waits. Nested totals are not added as independent costs.

| Contributor | Median CPU ms per recorded second | Inspection |
| --- | ---: | --- |
| render.world | 153.64 | `runtime/render-scene.ts`: sky/city/street, the registered native scene drawing, weather and shadows. Time, camera, lighting and scene state affect this work. |
| render.finish | 37.26 | Same renderer: shade/front/grade/lights/weather, prompts, bubbles and timeline overlays. Alpha order and current state matter. |
| game.frame@downtown | 5.75 | Exclusive remainder in `runtime/game.ts`: pause/communication clocks, transport/UI synchronization, story/city clock and scheduling outside the separately recorded update/render spans. |

These medians summarize the available repeats for each span (12 rendered runs for the first
two, 3 Downtown runs for the third), not a claim about every scene or a hardware benchmark.
Per-run distributions, sample counts and spread remain in the summary. For example, the first
Downtown repeat records 1674 native frames in 30 seconds, with frame CPU p50 11.3 ms and p95
14.3 ms. Its synthetic median recorder cost is 0.25 microseconds per recorded span; that cost
is reported, not blindly subtracted from measurements.

No optimization candidate is retained or performance gain claimed. The goal permits at most
three isolated attempts, not a required speculative rewrite. The measured leaders are stateful
procedural drawing and ordered compositing; caching or skipping them during ongoing scene
migration needs explicit invalidation and paired pixel-preserving evidence. The much smaller
unattributed frame remainder does not justify changing clock/UI semantics. This checkpoint
therefore keeps the baseline and unchanged implementation. Future changes require paired runs
against repeat variation and recorder overhead before claiming an improvement.

CPU submission timings are not presented FPS. GPU model/time, CPU model, refresh rate, thermal
behavior and mobile performance are unavailable. No rendering quality, DPR, actor population,
workload operations, durations or inactive-host policy was reduced.
