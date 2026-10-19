# Shared gameplay engine: execution plan

2026-10-18. Supporting plan for the single [ROADMAP.md](./ROADMAP.md).
ENG IDs do not renumber story M1-M9 or completed artwork/workbench S0-S13.
The target is one programmable world with specialized simulation and presentation subsystems.
Current implementation is a foundation, not a reason to start again.

## Authorized all-game consolidation (2026-10-18)

[ENGINE-CONSOLIDATION-GOAL.md](./ENGINE-CONSOLIDATION-GOAL.md) supersedes the smaller proposal:
all 19 existing scenes, full typed editor support, shared content/device/controller/world/network
contracts and removal of replaced paths. G0–G13 are mandatory. The user authorized execution;
full editor UI integration is included, preserving the latest scene-centered rework. Deferred hooks
or opaque legacy content wrappers do not satisfy completion. Historical completed scopes remain
valid evidence but are not claims that all-game migration is already done.

## What makes a valid goal condition

A goal is a finite deliverable, not "improve the engine", "keep optimizing", or a list of activity.
Before execution, identify: starting implementation; exact target paths/scenes/features; intended
behavior changes; dependencies; observable gates; evidence method; exclusions; and a stopping rule.

A gate has a reproducible input and expected result, with status PASS, FAIL, NOT RUN or BLOCKED.
An implementation claim, registered document, green build or screenshot alone does not prove every
behavior, pixel comparison, persistence or performance gate. Do not mark unmeasured outcomes passed.
Record source revision or local diff identity and fixture/schema versions for evidence.

A selected execution scope is complete only when every required gate for those ENG IDs passes,
required documentation is current, no mandatory exceptions remain, and final limitations are reported.
Feedback awaiting the user is recorded separately from technical completion. If feedback is made a
required approval gate for a specific migration, it remains pending until answered. Time passing is
not approval. Budget exhaustion or an unresolved failure does not mean the goal is achieved.

Use focused implementation checks and existing appearance fixtures. A campaign playthrough,
regression/CI expansion, publishing, player-facing custom packs and the later-act story proposals
are not implicitly included. Do not expand a bounded goal by discovering more possible features.

## Working foundation and targeted extensions

| Keep and extend | Actual gap |
| --- | --- |
| engine/gameplay command permissions, bounded atomic actions, events and reactions | Integrate existing native paths; avoid a third competing execution engine |
| flags, carried quantities and tokens | Declared typed entity/scene state, numeric cursors, ownership and lifetime |
| conditions all/any/not and resource checks | Typed contextual references to device/world/time/capabilities as needed |
| shared conversation nodes/choices | Sequential/cyclic/repeating conversations, persistent progress, legacy device semantics |
| four scene documents and native composition adapters | More declared bindings and generic registration after contracts are proven |
| private real-Game editor Play, fixtures, inspectors, protected source history/bundles | Demo-world routing and authoring for each exposed capability |
| device verbs/events/cables, pausable timers and scene rules | Shared operation adapters with explicit sequential/timed boundaries |

Conditions are pure reads. Commands own common state mutation and emit accepted facts after commit.
Invocation source and permissions stay explicit. Entities have stable identities; capabilities compose
on an entity without requiring a new inheritance hierarchy. Continuous simulations own their updates.
Long-running operations use explicit start/completion/cancellation, not one transaction lasting minutes.

## Approved changes versus preservation

Approved changes: shop rotation becomes persistent; default displayed/charged prices derive from one
purchase definition; divergence uses explicit modifiers; chatter, branching dialogue and device dialogue
share one model/runner; persist authored conversation progress where declared. No reset of player saves.
Old saves without a newly persistent cursor receive a declared initial value once: an unsaved historical
cursor cannot be reconstructed. All other migration behavior is preserved unless separately agreed.

Preserve existing scene IDs, destinations, item/flag keys, actor appearance/order, geometry, seeded art,
render commands/pixels and animation timing on the pinned comparison cases. New demo content has no
legacy picture to match; it must use the native library and render path. Do not rewrite an immutable
baseline to hide a regression. Record intentional behavior deltas outside the parity results.

Document schema changes require explicit version handling. Existing portable edits either migrate
atomically with a documented mapping or are rejected clearly without partially applying them. Editor
history, protected source Save, private Play storage and existing player saves are separate concerns.

## Demo world: Test District

Current presentation follows player feedback: compact plain Purchases, Conversations, and Devices & wiring
areas, with direct review shortcuts and in-place controls. No travel routes or decorative district
scenery are required. The optional guidance/access task uses the same counter, not another room.
The isolated manifest scene is a separate editor pilot, not a fourth required testing destination.

Use the shipping Game, scene factories, renderer, schemas, command engine and conversation presenter.
No duplicated demo evaluator, test-only resource rules or simplified fake rendering. Private demo
progress must survive its supported reload path while remaining separate from campaign and Harbor
saves; explicit reset affects only demo progress. Editor Play remains disposable and private.

Each exposed feature has a registry row: mechanic ID, owning subsystem, authoring surface, demo scene
and scenario, minimal case, failure/boundary case, composition case, migrated game usages, and evidence.
Rows may explicitly state not applicable with a reason; absent coverage is not PASS. Scope is frozen
per ENG delivery rather than promising every conceivable mechanic. Integrate existing Sandbox examples
without weakening its historical frozen S13 editing contract.

## ENG-01: reconciliation and contracts

Deliver ROADMAP as the only priority list; retain story and completed-engineering IDs; map the editor
phases and performance proposal; record the baseline, approved changes, demo design and finite gates.
Gate E1: every existing plan points to the parent roadmap; stale "not started" statuses are reconciled.
Gate E2: every ENG delivery has scope, dependencies, demo/editor/game outcomes and explicit exclusions.
Gate E3: selected execution scope is recorded independently from later proposals before dependent code.
No goal to rewrite already working contracts or complete new chapter design in this documentation step.

## ENG-02: persistent commerce and demo foundation

Scope: typed persistent numeric/boolean/enum state needed by commerce and conversation cursors;
entity ownership/defaults and save adaptation; purchase definitions with availability, stock/rotation,
base price and explicit quote/charge modifiers; existing Shop and Laundromat purchases only.
Demo: entrance plus counter, insufficient funds, repeats, price modifier, deliberate divergence,
reload/reset and one combined example. Author all scenario definitions with the shared model.

Gates:
- C1: valid old campaign, Harbor and slot saves load; missing new state defaults deterministically;
  new state survives save/load without colliding with device state or unrelated resources.
- C2: successful purchase atomically charges/grants/advances once; failed purchase changes nothing;
  Shop rotation survives leaving and reloading; repeated source factory construction cannot reset it.
- C3: default quote equals charge; explicit modifiers explain and produce intended divergence;
  insufficient funds are checked against the actual charge and boundary values are validated.
- C4: typed editor edits, Undo/Redo, portable import/export and protected grouped source Save/reload
  exercise the new definitions. Invalid imports/grouped saves leave the prior set unchanged.
- C5: navigable demo and real Shop/Laundromat use the same operation implementation; demo storage/reset
  and private Play never access campaign player keys. Native rendering/actor/geometry gates pass.
- C6: demo coverage rows and scoped behavior-change evidence are recorded; both builds pass.

Excludes generic crafting, production chains, arbitrary expressions, new campaign economics, world
editing and every remaining scene. Build the demo before broad migration; demonstrations do not
replace real-scene checks. Do not claim demo reload persistence from disposable Play alone.

## ENG-03: unified conversations

Depends on ENG-02 state. Scope is one runner/model covering NPC talk, current shared dialogue and
native device dialogue. One presenter supports bubbles or panels as adapters. Include pure readables
as presentation-only content where appropriate, not mandatory fictional speakers/rewards.

Freeze the corpus before migration: all talk/talk-variant/bot-reaction and native dialogue call paths
must have a destination or explicit unconverted exception. Required initial migrations are Shop,
Library and Laundromat NPC dialogue; Harbor supervisor/Mara; and every native device dialogue ID in
Library. Reusable support covers the remaining dialogue catalog, whose later migration stays listed.
This bounded delivery must not be called removal of all legacy dialogue while exceptions remain.

Gates:
- D1: one runner handles single/multipage, conditional entries, sequential-final-repeat, cycles,
  choices, conditions, persistent cursors and explicit commands using stable conversation IDs.
- D2: opening, reading, cancelling and reopening have defined effects. Legacy device node-entry
  actions are audited and represented as explicit one-time entry commands or explicit choices;
  repeated redraw/reopen cannot accidentally repeat rewards. Don't silently delete legacy consequences.
- D3: native presenters use that runner; no duplicate progress maps remain for migrated conversations.
  Existing scene lines, speakers, interaction positions and appearance remain equivalent except
  declared persistence changes. Harbor's ordinary acceptance flow remains unless separately changed.
- D4: typed authoring and private Play exercise pending definitions, choice permissions, progression,
  failure, cancellation, save/reload and atomic bundle/protected Save behavior.
- D5: demo conversation area has minimal, failure and combined conversation/purchase cases; progress
  and consequences survive supported reload; demo and game share runner/commands, not copied logic.
- D6: corpus ledger lists migrated IDs, adapters and exceptions; relevant appearance checks and both
  builds pass. Technical completion and user feedback remain separately visible.

Excludes rewriting all story text, introducing a new tutorial flow, generated dialogue, voice systems
and full campaign playthrough. Remaining legacy dialogue migration is finite catalog work under later
ENG deliveries; "unified foundation" and "all content migrated" are different completion claims.

## Later delivery scopes (not silently part of ENG-02/03)

ENG-04 now has its frozen corpus and I1-I8 gates in [ENG-04-PLAN.md](./ENG-04-PLAN.md),
with execution evidence in [ENG-04-STATUS.md](./ENG-04-STATUS.md).

| ID | Required bounded outcome | Demo and game acceptance |
| --- | --- | --- |
| ENG-04 | Shared interaction/device command adapters, pure conditions, eligibility/results and typed wiring; inventory sequential/timed effects before migration | Workshop of physical/manual/signal routes, chains/switch/timer; permission and lockout parity; freeze Market/Beach IDs/effects before their migration |
| ENG-05 | Objective/guidance source, capability view and travel/access evaluation | Guided demo mission; HUD/map/door/transport agree on eligibility reasons; scoped Harbor/Downtown progression and old saves preserved |
| ENG-06 | Explicit clock domains, active/inactive policy, lifecycle disposal and opt-in performance harness | Timing/weather/pause/reload demos; pinned native workloads with distributions and recorder overhead; no unmeasured speed claims or visual quality cuts |
| ENG-07 | Global remote identity, discovery/reach/connection lifetime and permissions | Two connected demo locations with path loss/restore; same remote entity state across entry points; scoped native network puzzle migration |
| ENG-08 | Declared bindings/manifests, generic registration and remaining frozen content migrations | Build a small scene in editor without TypeScript registration edits; protected save/bundle/Play round-trip; explicit exception inventory and scoped appearance parity |

Before any later delivery runs, freeze its scene/feature corpus and measurable sub-gates at the
same specificity as ENG-02/03. "Whole engine" is not a sufficient stopping condition. Story M3-M9
are enabled according to actual dependencies, not automatically implemented by ENG completion.

The subsequent bounded ENG-05/06/08 package and four-actor Market batch are authorized and scoped in
[ENG-05-08-PACKAGE.md](./ENG-05-08-PACKAGE.md), with their own evidence ledger. This does not
authorize all of ENG-06 or ENG-08.

## Execution and evidence

One owner changes shared contracts; independent scene migrations can run in parallel only when
explicitly authorized. Do not let parallel agents invent incompatible state or transaction models.
Use [GAMEPLAY-ENGINE-STATUS.md](./GAMEPLAY-ENGINE-STATUS.md) for each gate's status, command/fixture,
expected/observed results, source identity and limitations. Keep historical artwork ledgers immutable.
Use appropriate existing focused checks and builds; add checks for meaningful new persistence,
transaction or adapter semantics. Schema registration alone is not acceptance.

Stop at the selected finite deliverable. Report implementation, demo/editor entry points, evidence,
exceptions and publication state. Publishing requires separate authorization. No background monitoring
or automation is implied by an execution goal.
