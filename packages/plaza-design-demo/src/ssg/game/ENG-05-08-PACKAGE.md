# Feedback-ready engineering package

Authorized 2026-10-18. Parent: [ROADMAP.md](./ROADMAP.md). This is a finite subset of
ENG-05/06/08 plus a further ENG-03 conversation batch, not completion of all later ENG IDs.
User experience review can remain pending after technical acceptance. No publication is included.

## Starting point and scope

ENG-01–04 supply commands/events, persistent state/commerce, conversations, native bindings,
typed wires, private real-Game Play and protected source history/bundles. Harbor scene documents
already supply ordered objectives, targets and story times. Extend these instead of introducing
another command evaluator. The local compact Test District changes are retained.

1. **ENG-05:** shared ordered objective evaluation and pure reason-bearing capability/access
   evaluation. Corpus: Harbor Shift's existing authored objectives/attention; Downtown's seven
   progression stages; existing flag/key exit requirements; current quick-travel and harbor
   transport requirements. Preserve presentation, identifiers, ordering, messages and rules.
   Add editable objective/access examples, inspection and an immediately reachable compact demo
   mission. No new district restrictions or story rewards.
2. **ENG-06 measurement slice:** opt-in bounded recorder covering Game RAF/update/render,
   native render passes, host ticks and saves. Include local JSON reports, environment/source
   identity, overflow and overhead evidence. Instrumentation must be disabled normally and
   dispose cleanly. No performance target claims, policy changes or optimizations required.
3. **Conversation batch:** Market's cook, fish, repair and sleeper chatter (four actors),
   preserving page order, final repeat, geometry/appearance and existing fortune interaction.
   Use the shared runner and expose authored content/Play. Existing saves obtain missing
   conversation cursors lazily; persistent progress follows the already approved model.
   Bot reactions and every other unmigrated conversation remain outside this batch.
4. **ENG-08 pilot:** inventory code-owned scene bindings and exceptions; one isolated small
   demo scene defined by validated manifests, existing art and shared gameplay. Support
   protected source/history/bundle and private Play round-trip without adding TypeScript for
   each instance. Do not replace the campaign registry or expose arbitrary document scripts.

Order: freeze scope -> ENG-05 contracts and integration -> editor/demo -> conversation batch
-> manifest pilot. Measurement instrumentation can be implemented independently of the contracts.
One owner changes shared contracts; no parallel agent work is implied.

## Required technical gates

| Gate | Reproducible expectation |
| --- | --- |
| F1 | Objective/access validation rejects invalid references, malformed conditions and unsupported schema versions atomically; existing documents remain valid |
| F2 | Harbor objective/attention outputs and Downtown stage selection match pinned legacy cases; access eligibility is pure and preserves existing reasons/priority |
| F3 | Actual scoped runtime paths consume shared evaluators; demo success/refusal/prerequisite examples run through the shared game; no campaign save contamination |
| F4 | Pending objective/access edits affect private Play; undo/redo, bundle import/export and protected source validation preserve atomicity and permissions |
| F5 | Recorder buffers are bounded; off path, overflow, nesting/async attribution, export and disposal are checked; recorder overhead is measured and labelled with limits |
| F6 | Four Market chatter paths preserve authored text/repeat/actors, use shared progress and survive reload without disturbing native puzzle state or fortune purchases |
| F7 | Manifest pilot validates bindings and cross-references; edits round-trip through existing source/history/bundle pipeline and run in isolated native Play |
| F8 | Binding/exception inventory, demo coverage and evidence ledger are current; focused checks, homepage/design builds and diff checks pass |

Each gate records PASS/FAIL/NOT RUN/BLOCKED, source identity, command/fixture and limitations in
[the package ledger](./ENG-05-08-STATUS.md). A build alone is not behavioral or pixel evidence.
Use existing scoped appearance checks; new demo content uses native art and has no legacy pixels.
Stop when F1–F8 pass. Report feedback still needed without claiming comprehension was observed.

Excluded: M3–M9 implementation, new prologue pacing/teaching decisions, new unlock policies,
economy/danger rebalance, inactive-scene timing changes, broad networking semantics, renderer
rewrites, full ENG-06 optimization/baseline programme, whole-world generic registration,
campaign playthrough, regression/CI expansion and publication.
