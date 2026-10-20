# Local performance recording

This is the measurement-only ENG-06 slice. It does not change rendering quality, scene clocks,
inactive-scene policy or save scheduling, and it sends no telemetry.

1. Build with `pnpm build:homepage` and use the existing static preview.
2. Open `http://127.0.0.1:4202/?demo&perf` (replace the port if necessary).
   Use a disposable demo session, not a player campaign save. `perf` only adds local controls;
   it does not reset or replace that session's progress. `/editor/?perf` forwards the opt-in to private Play.
3. Open **Performance**, then **Measure recorder overhead** before recording. This interleaves
   five synthetic recorder-on/off pairs in the current browser. The output is overhead per
   synthetic span, not a game-speed or GPU result.
4. Choose the real scene/example and wait for assets and first-use work to settle if measuring
   warmed gameplay. Set **Recording name**, click **Start**, perform the short workload, then **Stop**. Keep cold
   start, transitions, steady scenes and first-use cases separate.
5. **Download JSON** preserves raw bounded samples, source fingerprint, environment, visibility
   events, counts, percentiles and overflow/incomplete diagnostics. Put recordings in ignored
   `.performance/`. The recorder caps at 32,768 samples; overflow means the recording is partial.

Optional local report command, from the repository root:

```
pnpm --filter plaza-design-demo exec tsx scripts/performance/report.mts ../../.performance/my-run.json
```

Spans cover RAF gaps, Game frame/update/render, native render preparation/world/actors/finish,
all hosted-scene ticks, and save serialization/write. Owner tags identify scene frames/hosts.
Inclusive nested costs overlap; do not sum them. Host callbacks may occur outside a frame and
have parent -1. Raw RAF gaps retain stalls and hidden-tab gaps; visibility events support later
classification rather than silently deleting inconvenient samples.

Canvas timing is CPU command submission, not raster/GPU completion or actual frame presentation.
CPU/GPU and refresh rate are explicitly unavailable unless supplied by another diagnostic. The
source fingerprint hashes the game TS/TSX/JSON tree, including uncommitted files. Shader changes,
resolution cuts and cache rewrites are not implied by any recording.

The first browser smoke recording captured 50.55 seconds with no overflow, incomplete spans or
invalid endings. It proves that the harness can observe/export the real runtime; it is not a
repeatable baseline, an optimization result, a mobile claim or a frame-budget promise. The report
predates the final UI/owner-metadata refinements; its own fingerprint identifies that source.
Repeated controlled workloads, trace attribution and measured optimizations remain later ENG-06.


## Finite local workloads

From `packages/plaza-design-demo`, after building the homepage fonts:

```
pnpm exec tsx scripts/performance/build.mts
pnpm exec tsx scripts/performance/serve.mts 4210
```

Open `http://127.0.0.1:4210/`. The runner is built only under ignored `.performance/`;
its loopback report receiver is not part of the public editor or game. **Validate fixtures**
produces smoke records which are never accepted as baselines. **Run selected repeat** supports
independent fresh-page runs. Choose a workload and repeat1–3; click **Begin native workload**
inside live-game frames, then keep the page visible until the repeat is archived. Use the same
built acquisition bundle for all repeats. **Run all six** is available, but an observed later-frame
ready-acknowledgement failure currently prevents treating its unattended batch path as reliable.
Do not restart a live frame merely because an observer timed out; wait for its explicit error/status.

The six definitions are `scripts/performance/workloads.ts`. They use fixed day1/seed3/time/weather,
960×540 CSS dimensions, native DPR/full rendering quality, 5s warmup and three30s windows for
Downtown/Market/native-model fan-out. Board and scene visits use twelve fixed operations;
private Play uses five fresh start/checkpoint/stop/destroy realms per repeat. A private realm never
reads campaign browser storage. Every run includes synthetic interleaved span calibration.
The fan-out is the actual demo model with its fixed counter cable plus authored lamp/fan branches.
It is explicitly a native-model lane, not a Canvas/render workload.

Raw reports and the captured acquisition manifest are archived below
`.performance/native-workloads/recordings/run-<timestamp>/`. The validator checks raw samples against
summaries/source/finite counts, rejects overflow/incomplete records, and diagnoses missing rendering,
hidden visibility, missing trusted activation, wrong board/visit counts or fan-out outcomes. Model
callbacks are opt-in spans; `timer.lateness` records deadline delay separately from `timer.callback`
CPU. `play.start` and `play.stop` are elapsed lifecycle latencies including asynchronous waits;
they must never be ranked as CPU contributors. The ordinary disabled timer path preserves its
execution order, cancellation and pause semantics.

```
pnpm exec tsx scripts/performance/summarize.mts ../../.performance/native-workloads/recordings/run-<timestamp>
```

This recomputes quality, keeps repeats separate, reports per-run variability and ranks exclusive
recorded CPU (excluding RAF gaps, callback lateness and elapsed lifecycle spans). Inclusive totals
must not be added together. Reports do not include uninstrumented browser layout/raster/GPU cost.

### Measured checkpoint, 2026-10-19

Acquisition source `sha256:bb7d83aba22db2e6fdb69759e714353d56d8922147fe9b366a190b30e61ea99c`;
raw18reports/summary at `.performance/native-workloads/recordings/run-1792414247023/`.
Windows Chrome155,960×540CSS,1200×675backing canvas,DPR1.25,reduced motion false.
CPU/GPU model, refresh rate, thermal state and presented-frame timing unavailable.

| Workload | Three-repeat result |
| --- | --- |
| Downtown clear noon | Render CPU median-of-run p50=11.6ms;p95=14.2ms;p95 range14.1–14.4ms |
| Market rainy evening | Render CPU p50=5.2ms;p95=7.2ms;p95 range6.8–7.3ms |
| Demo fan-out | Thirty actions per run;counter30/lampOn/fanOn in every final state;action CPU p95=.3ms |
| Board | Twelve actual open/close pairs per run;action CPU p95≈1.6ms |
| Scene/host visits | Twelve exact Library→Shop→Laundromat→Market jumps per run;action CPU p95≈3.3ms |
| Private Play | Five fresh realms per run;all15 start with empty private storage and leave zero frames;elapsed start median-of-run p95≈420.6ms,stop≈8.4ms |

The live-game recorder observed only30render samples per30s steady run (and12per transition run),
with roughly one-second RAF cadence despite visible documents and trusted frame activation.
**These are environment-limited CPU measurements, not a normal gameplay FPS baseline.** Short-sample
p95/p99 and this scheduler make optimization acceptance inappropriate. Preliminary brief recordings
without render samples were rejected; later missing-frame acknowledgements remain a batch-runner
limitation, not a proven game bug or a reason to weaken frame sandboxing.

The three largest exclusive recorded contributors in this corpus were `render.world`, board-open
work and scene-visit work. Investigate scene composition/geometry and overlay rebuilds once the
migrations settle. No optimization candidate was retained or claimed: the scheduler/sample limits
and lack of matched interleaved A/B evidence do not establish a safe improvement. Renderer quality,
DPR,population,clock policy and source baselines were not altered to obtain these measurements.
Final representative-cadence performance acceptance remains open alongside the full engine goal.

### Standard editor tasks, 2026-10-20

Measured against `6a47840` with additional opt-in task spans in a separate composer session;
no source documents were saved. Downtown proposal, animation stopped, 1280×720 viewport,
DPR1.25, 960×540 preview canvas. These are short diagnostic samples of instrumented work,
not input-to-presented-frame latency, GPU timings, or a statistical performance gate.

| Task | Samples | Median / observed duration |
| --- | --- | --- |
| Open Downtown proposal, first use | 1 | 157.9ms |
| Select a building | 3 | 110.8ms |
| Change X by one unit | 3 | 176.7ms |
| Change height by one unit | 3 | 174.4ms |
| Undo | 3 | 163.7ms |
| Redo | 3 | 168.2ms |
| Add a stool | 1 | 269.7ms elapsed, including preview probe |
| Delete stool | 1 | 190.9ms |
| Open library, partly warmed thumbnail cache | 1 | 35.6ms synchronous library rebuild |
| Switch Downtown ↔ proposal | 2 | 138.6ms and 222.0ms |

Task spans: `editor.scene-switch`, `editor.selection`, `editor.command`, `editor.library`,
`editor.add`, and `editor.thumbnail`. Add/thumbnail spans include asynchronous waits and
must not be ranked as exclusive CPU. The first Add operation overlapped queued thumbnail
work. Library timing excludes later asynchronous thumbnail painting. All nested totals overlap.
These measurements used UI controls in a separate browser tab; automation round-trip time is excluded.

Review findings, in suggested investigation order (1–3 addressed below):

1. `authoring/app.ts:refreshWorkbench` serializes document dependencies even for closed panels.
   `refreshLeft` invokes every workbench on each refresh. Position edits spend about 40ms in
   the whole outline/workbench refresh; serialization's isolated share has not been measured.
2. Selection rebuilds the inspector, outline and timeline; coordinate edits rebuild the whole
   header/options/outline. Update unchanged UI in place, retaining full rebuilds for structural changes.
3. Queued thumbnails call `documentsForView()` outside the synchronous view snapshot. Opening
   Add caused ten complete document copies totaling 73.9ms and nine thumbnail operations totaling
   132.3ms, with copying nested inside thumbnail work. Share a versioned snapshot for each batch;
   cancel obsolete queued tiles when their view closes or changes. Preserve state-dependent previews.
4. `authoring/native-preview.ts` validates, assembles a definition and creates a fresh SceneModel
   on every preview render. Investigate reuse of immutable compiled inputs while preserving preview
   isolation, pending edits and animation clocks. No isolated saving is established yet.
5. `art/core/composition.ts` resolves composition rows separately for drawing slots, and native
   preview resolves them again for bounds. Investigate frame-scoped reuse across drawing and picking.
6. `authoring/server/store.ts:read` loads and validates the entire document set through `list()`;
   save validates the prospective set and reloads/revalidates it afterward. Investigate transaction-scoped
   reuse; retain cross-document validation, conflict detection and recovery guarantees. Not timed here.

The task measurements confirm aggregate delays; code inspection identifies the repeated operations.
It does not establish how much each proposed change would save. Compare matched before/after task
recordings and behavior checks before retaining an optimization.

### Editor refresh and thumbnail improvements, 2026-10-20

Closed workbenches now dispose/return before reading or serializing documents. The outline keeps
its DOM when composition structure, non-placement fields and scene companion documents are unchanged;
selection updates pressed states in place. Selecting a hidden row can still rebuild to reveal it.
Timeline selection still refreshes target controls. The inspector continues to read current documents,
and structural edits continue to rebuild rows. Validation and protected Save behavior are unchanged.

Thumbnails share one detached document snapshot until the next successful edit or source reload.
Source edits invalidate the thumbnail generation, including in-flight results. Disconnected queued
and offscreen tiles are pruned; disposal prevents later painting. An open Add picker rebuilds after
an edit so it cannot retain invalidated thumbnails.

Repeated the same Downtown proposal UI tasks in a fresh isolated editor session, same viewport/DPR
and stopped animation. Three samples each, medians; these are diagnostic comparisons between runs,
not controlled interleaved benchmarks or presented-frame guarantees.

| Task | Before | After |
| --- | --- | --- |
| Select building | 110.8ms | 52.9ms |
| Change X | 176.7ms | 130.0ms |
| Undo | 163.7ms | 126.4ms |
| Redo | 168.2ms | 110.3ms |
| Outline refresh during X edit | 41.5ms | 0.8ms |

First Add picker: full document copies decreased from ten (73.9ms cumulative) to two (16.9ms).
Nine thumbnail operations decreased from 132.3ms to 68.8ms cumulative; document copying is nested
inside thumbnail work, so these totals must not be added. This is not the entire picker latency.
UI checks confirmed added rows, delete/undo restoration, selection highlighting and switching to
Order mode. Focused thumbnail checks cover cache reuse, invalidation during asynchronous rendering,
detached queued/offscreen tiles and disposal. Preview/model rebuilds, repeated composition resolution
and source-store work (findings4–6) remain separate follow-up work.
