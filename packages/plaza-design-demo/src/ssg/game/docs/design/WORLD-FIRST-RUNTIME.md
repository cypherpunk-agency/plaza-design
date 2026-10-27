# World-first runtime: technical goal and acceptance

2026-10-25. **Technical goal complete: all 14 acceptance gates below verified.** W1–W4, technical W5 and W6
review are complete. Final opening design remains deferred as agreed.
[ROADMAP.md](../../ROADMAP.md) owns overall priority and status. This document owns this finite
technical goal’s acceptance conditions. The game remains in design.

## Goal

Use one loaded world, one world state, the existing Game/SceneModel/GameplaySession and the
single `renderWorldFrame` renderer for world composition changes and live sequence direction.
Expose the same contracts through typed editor controls and native private Play. Remove the
execution paths actually replaced. Finish every decision-independent item below; stop without
choosing the new opening’s districts, distances, landmarks or choreography.

The [terminology](../reference/TERMINOLOGY.md), [composition contract](./WORLD-COMPOSITION-CONTRACT.md)
and [42-entry inventory](./WORLD-CONTENT-INVENTORY.md) define the shared model. A chunk is a
technical source/residency partition; a Place is meaningful geography. World compositions place
chunks/groups. Artwork compositions arrange artwork. A sequence is authored direction; the
timeline is its editing view. Variants and state owners are not additional authoring concepts.

## Agreed boundaries

- There is one world state. A saved declaration’s qualified ID supplies its default storage
  address; `binding` optionally supplies an explicit world key. Native local fields access that
  key directly. Alternate presentations do not copy values. Authors/agents configure bindings
  when copying content. Character facts and spawned physical instances are different concerns:
  facts can access the same key; a moving instance retains its existing runtime identity.
- Group definitions are named placed chunks, not indivisible loading units. Single chunks and
  groups use the same atomic mount/unmount command batch. Membership is distinct from residency.
  Unsafe physical edits defer internally while the player, visible geometry, an interaction or
  an active mobile route depends on affected chunks. Being merely loaded is not a blocker.
  Pending intent and applied membership persist; restoring a save does not re-dispatch commands.
- Camera and player have independent references. Connected geography retains floating-origin
  arithmetic. A camera can also view a disconnected component while retaining a saved interior;
  those floors are not merged or the player teleported to fabricate a spatial relationship.
- Existing zones observe spatial crossings; conditions/events activate existing permission-checked
  commands. Loading/painting/selection is not arrival. Once receipts persist; a restored condition
  establishes a baseline without replaying its action. Meaningful region-based arrivals use the
  same source, rather than inferring a new story event from technical residency.
- Live world direction withholds player input and keeps the ordinary physical models ticking.
  Standalone interludes retain their intentional paused-world presentation. Command markers
  carry explicit `run`/`omit` skip policy; completion and cancellation use authored command lists.
  Receipts prevent repeated committed actions. Interrupted world direction settles its authored
  skip completion on Continue, without simulating skipped frames.
- Editor scrubbing explicitly reconstructs isolated state and movers with the existing reducer
  and mover implementation. It installs no live trigger, reward, storage or external observer
  hooks. The renderer consumes prepared models and never constructs or advances them. Native
  private Play remains the full runtime and stays isolated from campaign saves.
- Launch shows the coast above the loaded run with simulation paused. An in-run pause keeps the
  current view. Confirming New Game initializes the run before direction. Harbor release retains
  that run, models, clocks, physical train and camera; it does not create another save or re-enter.
- No automatic geometry rollback, state migration, historical-save compatibility, second runtime,
  renderer, adapter, scheduler, fleet-management system or player-facing engine blocker UI.
- The current coast/glide geography is a technical placeholder. Choosing the final opening
  remains with the user and designer. Other cutscenes are reviewed individually, not forcibly migrated.

## Acceptance conditions and evidence

A gate passes on concrete execution evidence, not a source registration or build alone.

| Gate | Required result | Evidence / current status |
| --- | --- | --- |
| W2.1 | One validated placement authority for compositions/groups, source anchors, exports and connections; invalid or ambiguous references reject prospectively. | Verified: `check-world-compositions`, `check-world-composition-authoring`; boundary geometry compiles at 0/320, layout links do not invent walk seams. |
| W2.2 | Coherent chunk/group command edits; internal dependency deferral, safe reload and one lifecycle commit. | Verified: `check-world-edit-commands`, `check-boundary-world-flow`; native browser unlock → blue group swap → reload, with no player blocker messages. |
| W2.3 | Default and explicit bindings access one world state; alternate door/character facts survive reload without scalar copies. | Verified: `check-state-bindings`, `check-world-direction-authoring`, state scalar/read Save checks; native browser preserves `boundary-door.open` through alternate presentation and reload. |
| W2.4 | Camera may leave player residency and return; moving instances retain identity; disconnected interiors remain independent. | Verified: residency/unload/joined-player checks, `check-directed-residency`; native boundary camera follows the existing cart/walker while the player stays at x195; saved Capsule launch/Continue/pause passes. |
| W2.5 | Typed composition/binding controls, history, bundle, prospective validation, protected Save/reload and native private Play agree. | Verified: composition/direction authoring and sequence source-selection checks; public editor’s World panel and opaque-origin native Play exercised. |
| W3.1 | Conditions/zones/events invoke shared commands; camera/loading does not produce discovery or player arrival. | Verified: boundary-world flow, native workflow phases and trigger-history checks; natural opening keeps Harbor’s seen/intro flags unset until control is released. Source-authored per-chunk intro text remains deliberate narrative content, not a residency callback. |
| W3.2 | Once/history/baselines survive save/reload; failed commands do not consume activation; maintained conditions obey their explicit policy. | Verified: `check-trigger-history`, boundary flow, native phase checks. |
| W3.3 | Typed spatial/condition/action authoring and inspection of actual armed/inside/result state. | Verified: existing sensor/trigger controls plus once option, `SceneModel.inspect` zones/trigger results, native Play tables and event inspector/source checks. |
| W4.1 | Live sequences direct normal camera/models; physical mover, picture, picking and inspector agree. | Verified: directed mover/inspection/source-selection checks and native boundary direction; opening train uses authored named mover paths, not visual position/door substitutes. |
| W4.2 | Typed command markers, completion/skip/cancel receipts and correct control release. | Verified: sequence command/runtime/handoff/authoring checks; native natural boundary completion and opening Escape/natural completion. Finished receipts persist after terminal commands. |
| W4.3 | Isolated scrub and pending source/history/bundle/protected Save/native Play share contracts. | Verified: sequence inspection/source-selection/command/direction authoring checks. Composition-driven sequence scope follows current membership; the stable outline includes authored alternatives. |
| W5.T | Launch coast, pause current view, preinitialized New Game and uninterrupted Harbor release. | Verified: full 68-second natural opening and Escape browser runs, saved-interior launch/Continue/pause, opening workflow/source/runtime checks. Harbor model advances to roughly 68 seconds rather than restarting; canvas CSS height remains 300px across release in the tested desktop viewport. |
| W6.R | Assess intro, act2 and taxi individually; remove only replaced paths. | Verified: dispositions below. Standalone contents retain the common renderer. |
| Closure | Current guidance, appropriate focused checks, package TypeScript and both builds; no publication implied. | Passed: focused checks, package TypeScript, both builds and native browser verification; see closure below. |

Mechanical tests belong to the agent. Feedback concerns clarity, appeal, pace and editor workflow.
Do not reopen all earlier engineering milestones or create a campaign-wide regression/performance project.

## Current implementation map

- `world/compositions.ts` validates/compiles groups, placements, connections, membership batches
  and prospective references. `world/compiled-world.ts` assembles the same graph for Game,
  source validation and editor inspection. `world/zone-graph.json` still declares ordinary
  seams outside composition-owned sources; a chunk cannot have both placement authorities.
- Save stores applied `worldMembership`, a bounded pending `worldEdit` batch and current
  `sequenceActions` receipts. Game prepares/commits existing commands; scene lifecycle handles
  dependency checks, residency and disposal. Existing SceneModels/movers keep their identities.
- `engine/gameplay/state.ts` resolves `binding`; `sceneStateView` gives native local field names
  access without serializing aliases. Inspection materializes that view before cloning.
- Native trigger once receipts live in engine checkpoint metadata. Transient edge observations
  do not become persistent flags. Existing native phases and pausable scene clocks are retained.
- `runtime/sequence-commands.ts` discovers ordinary source-authored world sequences and validates
  event handoff targets. Existing CutscenePlay owns live sequence time; no second playback loop.
  Typed markers dispatch existing system commands; movers remain the physical calculation.
- `runtime/prepare-frame.ts` supplies pure layout and the selected composition’s current scope.
  Game supplies actual resident models. Shared `runtime/sequence-state.ts` prepares isolated samples
  before the common renderer; backward seeks reconstruct, forward samples reuse prepared models.
  Paint has no implicit inspection-model fallback. Obsolete train visual overrides are removed.
- World → Compositions edits definitions. Selecting a world-sequence settings object edits
  composition/origin/explicit zone references with typed controls. Timeline command rows edit
  system targets, time and skip/completion/cancel policy. Event handoffs select source-discovered
  world sequences as well as existing standalone interludes.
- The vehicle workbench’s train composition also delegates frame slot ordering to
  `renderWorldFrame`; its former private queue flushes have been removed.

## Compact review example

Use the existing Boundary example · west, not a new test district:

1. At x35, use **SHARED DOOR** to unlock the reader fact.
2. At x115, use **SWITCH DISPLAY**. Its presentation at x960 changes between the original
   and blue chunk groups. Both access `boundary-door.open` in world state.
3. At x195, use **LOOK ACROSS BOUNDARY**. The eight-second sequence pans to the display and
   returns while the player stays put and the existing cart/walker keep moving across 0/320.
4. Reload: the chosen group and door state remain. In private Play, Stop/Reset destroys only
   that test realm; it cannot overwrite a campaign save.

Local compiled preview: [boundary example](http://127.0.0.1:64422/?sudo&play=boundary-west),
[editor](http://127.0.0.1:64422/editor/), [normal opening](http://127.0.0.1:64422/?play).
These are local links, not a production deployment. In the editor, select **Boundary example · west**
and use Play scene; inspect actual regions, trigger results, mobile sources and world edits in Play.
The reader demonstrates a shared door/access fact; it is not a newly designed physical door puzzle.

## Remaining cutscene dispositions

| Sequence | Actual content | Disposition |
| --- | --- | --- |
| `intro` | 26-second skyline/network illustration; 15 parts, 3 tracks; Capsule handoff. | Retain standalone on the common renderer. Packet/skyline presentation is not playable geography. |
| `act2` | 16-second ferry/city composition; 7 parts, 6 tracks; Stacks handoff. | Retain standalone. A physical ferry/world journey would be a separate content decision. |
| `taxi` | 3⅓-second travel picture; 6 parts, 3 tracks; destination comes from the existing travel workflow. | Retain standalone and the existing travel authority. Do not add a fleet or parallel progression runner. |

## What still needs design input

Only the rebuilt opening’s selected districts/landmarks, spatial relationships, use of actual gameplay
chunks, final route, duration and atmosphere. W5 creative approval is not claimed by technical completion.
No further engine decisions are required to review the implemented example and author these sources.

## Closure — 2026-10-25

- `pnpm build:homepage`, `pnpm build:design-demo` (including package `tsc -b`) and
  `git diff --check` pass. The existing bundle-size advisory remains; no performance work is added.
- All 15 checks in the focused world/sequence gate run pass. Additional affected checks pass:
  shared handoffs; joined player zones; scene domain forms/Save; state scalar/read Save;
  common game state; train shared vehicle/service; vehicle workbench and 64 machinery geometry
  cases; sequence documents/editing/runtime; opening workflow/source Save; native preview clock;
  zone graph authoring; event inspector and protected source-store checks. The strengthened
  typed direction/binding Save check and renamed-control direction check also pass separately.
- Native browser: natural 68-second opening and Escape release; boundary group swap with shared
  state, remote camera, continuing movers and reload; saved disconnected Capsule → launch coast
  → Continue → pause current view, all verified without runtime errors in the isolated test runs.
- The in-app browser separately verifies the actual editor controls and opaque-origin private
  Play. Cart moves west → east and successive walker identities advance (#2 to #14/#15), native
  region diagnostics report inside, and Stop returns to editing. A separate headless Chrome
  instance did not deliver iframe animation frames; that startup-only observation was not used
  as simulation proof. In-app browser Play supplies that proof without changing product clocks.
- Updated stale constructor-free test fixtures to current Game records. The off-screen seam
  test now compares effective paint within the implicit canvas viewport, rather than treating
  redundant clip/state calls as artwork. Invalid unrelated test geography was repaired; no
  visual golden was regenerated to hide a difference.
- Guidance is current in AGENTS.md, ENGINE-HANDBOOK.md and authoring/README.md. No historical
  runtime copy, save-format codec, alternate renderer or action scheduler has been added.
- Changes remain local and uncommitted. No main/production publication is part of this goal.

This closes the finite technical goal. New opening art/geography/choreography and further campaign
work require their own scope; they do not keep the completed engineering gates open indefinitely.
