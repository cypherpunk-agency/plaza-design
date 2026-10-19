# Private performance-frame readiness blocker

The six-workload fixture gate remains open. These artifacts are startup diagnostics and smoke recordings, not performance baselines. No game-engine fix is justified by the current evidence.

## Reproducible condition

With the full performance HTML/CSS/runtime, opaque `sandbox="allow-scripts"`, the existing private window name and a fully visible 960×540 child viewport:

- A first realm removed immediately after `ready` allows the next realm to parse and become ready.
- A first realm kept alive for three seconds and then removed repeatedly leaves the next realm at `about:blank`, without the first-head parser probe, runtime-script request or ready message. The loopback server completes the entire 212993-byte second HTML response.
- This reproduces without constructing any Game. That first idle child runs 181 RAF callbacks in three seconds, and computed HTML/body/section styles are visible, opacity 1, transform none, content-visibility visible.

Therefore Game construction, Game.start, rendering, checkpoint, Game.stop, calibration, recording and report transport are not necessary to cause the readiness failure. The underlying browser/opaque-frame replacement mechanism remains unidentified. Restoring parent focus and keeping the iframe fully in the viewport do not resolve it. Isolation has not been weakened, and attempts are never automatically retried.

## Evidence

Ignored fixtures, exact payload identities, transport logs and finite observations live under `.performance/performance-startup-discriminator/`:

| Observation | Result |
| --- | --- |
| `child-idle-observations.json` | No Game created; first child 60 Hz; second frame fails after three-second dwell |
| `constructor-observations.json` | Constructor without start; second frame also fails |
| `parent-cadence-observations.json` | Parent without Game/payload/iframe runs 180 callbacks in 3007 ms, focused/visible throughout |
| `visible-dwell-observations.json` | Native dwell fails with frame intersection 1 and visible child/parent |
| `parent-checkpoint-stop-observations.json` | Rapid parent-activated native start/checkpoint/Stop succeeds |
| `focus-observations.json` | Moving focus from child iframe to parent button before removal does not resolve failure |
| `identity.json` | Exact full-payload hashes and source/build identity |

The early `.performance/startup-probe/run-1792432502868/transport.jsonl` shows two tiny realms passing. Its replacement is immediate, so it does not exclude a tiny-payload dwell dependency.

Full harness `.performance/native-workloads/recordings/run-1792433524968/frame-geometry.json` confirms both actual 960×540 frames fit entirely within the parent viewport; the failure is not caused by the diagnostic probe's growing log. The first Downtown recording contains 34 smoke samples; Market then fails before parsing. No full suite passed.

Native Game cadence in a three-second child dwell was separately sparse, including two approximately 1000 ms gaps despite visible CSS/geometry. This is not evidence of expensive CPU rendering. The no-Game child and parent controls run at 60 Hz, but the native cadence issue is not established as the cause of the replacement failure.

## Retained source changes

- The performance build reuses the editor's exact CSP-hashed pre-CSS bootstrap, changing only its message channel.
- The runner reuses `PlayStartup` observations, source-window checks and bounded lifecycle cleanup. Its diagnostic panel distinguishes missing document/parser/runtime stages. Errors take precedence over stale early ready packets.
- Optional `serve.mts ... --startup-diagnostics` records stream bytes/end/finish/abort without changing transport headers or normal response content.
- Workload Begin controls are parent-owned and report actual `{owner:'parent', parentTrusted, childTrusted:false}` provenance. Synthetic input is never promoted to trusted input. This is not claimed as a fix: the full harness still reproduces the failure.
- A tiny standalone probe and focused lifecycle/CSP/activation tests remain available. No game production source changed.

Checks: `check-performance-startup.mts` and `check-performance-workloads.mts` pass. The source build used for these browser diagnostics is captured in each artifact; concurrent scene work means it must not be treated as the latest integrated gameplay checkpoint. Full six-workload and baseline gates remain unsatisfied.
