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


## October 19 working-backend recheck

A fresh owned loopback tab on the Chrome backend that passed the nineteen-scene native editor check reproduces the no-Game blocker. These are finite independent diagnostics, not workload retries or current-game baselines. Exact copied payload hashes, case definitions, observations and response-completion logs are in `.performance/performance-startup-recheck-20261019/`.

| Control | First idle realm | Second document |
| --- | --- | --- |
| Same accepted normal name, remove/recreate | 169 RAF callbacks in 3004.9 ms | Empty `about:blank`; no parser, runtime request or ready |
| Same element, committed `about:blank` load, then fresh navigation | 168 callbacks in 3001.6 ms | Same failure |
| Different already accepted names: normal, then bare private name | 169 callbacks in 3003 ms | Same failure |

Every second URL already differs (`?realm=1` then `?realm=2`); the payload does not consume that parameter. Every second HTML response completes all 212993 bytes, while only the first realm requests the runtime script. Both child viewports remain 960×540 and fully visible. The normal-to-bare test changes the existing private-mode flag (`SHIFT_PROTOTYPE` is true for the bare name), so it is only a discriminator, not a valid replacement for workload identity. Arbitrary unique name suffixes are rejected by the existing exact private-name contract and were not run; that guard was not changed.

The pinned archived diagnostic HTML SHA256 is `b5f8d3f997cb90c0c28fa2be55df1e2585491e5bf245c7c1d13ad89802a6798b`; runtime SHA256 is `05ca52e1f1f07eb7b4a7a65f05d88f25904b13fa5882f9bfae60c34e367d34f4`. Its embedded old source identity is `49ab7b73f145e846481826a0f9ca9224e33f03f1ee648cf0e5b9019977e23531`, not the current integrated game. No gameplay or performance-runner production code changed in this recheck. The failure mechanism is still unknown; G6 six-workload/baseline evidence remains open.


### One full selected repeat

The unchanged UI-supported `downtown-quiet/run-1` was run once in a fresh parent document with its original five-second warmup and thirty-second recording. Raw report: `.performance/native-workloads/recordings/run-1792440893496/downtown-quiet-1.json`; separate interpretation: `diagnostic-assessment.json`. Exact built source is `988fc69d4582f3a6a2f5e008810c58c4b8ceef3e285ef10f4a23a47c823225b3`, harness `5d286b023c522c2036c56b389f9564bc1f3c3b6cd43db2f4fe1d40985668f668`; this is an existing older build, not the latest integrated game.

The report completes 30013.4 ms with 510 raw span samples and no overflow, incomplete spans or invalid ends. Its current structural validator labels it `BASELINE` with no issues. That label is insufficient: only 30 native frame/render callbacks occur, RAF-gap median is 1004.8 ms (p95 1016.8 ms), and simulation play time advances only 1500.3 ms during that wall interval. Child visibility remains recorded false-for-hidden, canvas visible, viewport 960×540, backing canvas 1440×810 at DPR 1.5; activation is truthfully parent-owned and trusted. Sparse scheduling is observed; its mechanism is not established. This is complete diagnostic evidence, **not an accepted performance baseline**. Cadence/environment quality acceptance remains necessary before baseline signoff. No workload definition, lifecycle operation, sandbox or production runtime was changed, and the warmed second-realm failure remains unresolved.


### Trusted child interaction control

`.performance/child-activation-control-20261019/observations.json` records a bounded before/after control using that same archived full runtime, unchanged private sandbox/name and native Game. Before a child gesture, the three-second window has ten RAF callbacks, including a 1014.2 ms gap; child activation and focus are false. A real browser-controlled pointer click on a visible child button records `event.isTrusted=true`, `navigator.userActivation.isActive=true`, `hasBeenActive=true`, `document.hasFocus()=true` and active element BUTTON. The following 3007.6 ms still has only eight callbacks, including 1000.3 and 1016.8 ms gaps, with hidden false and focus true. Thus proven child activation does not resolve the observed sparse cadence. This negative control does not justify changing harness activation provenance or repeating the second-realm experiment. No game production code changed.


The validator now separates structural validity from baseline eligibility. For non-smoke live-game recordings it reports exact active-play/wall and measured frame-CPU/wall ratios, unadvanced wall duration and RAF time beyond the native `3 × 16.67 ms` step clamp. Missing/malformed active-play clocks make a recording invalid. A structurally valid recording is baseline-ineligible when active-play advances less than 50% of wall duration **and** measured game-frame CPU occupies less than 25% of wall duration. These finite measurement-quality guard thresholds are neither a frame-rate/performance SLA nor causal proof; GPU/presentation work remains unmeasured. CPU-heavy slow/clamped recordings remain eligible. Raw diagnostics are retained, and the UI exposes eligibility/ratios and stops an ineligible suite without retrying. Revalidation of the complete sparse Downtown recording is saved separately as `run-1792440893496/revalidated-quality.json`; original raw bytes and original validator result remain intact.
