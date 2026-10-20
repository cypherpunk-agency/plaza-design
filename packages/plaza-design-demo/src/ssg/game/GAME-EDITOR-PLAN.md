# Game editor plan: from scene composer to full game editor

Current status2026-10-20: all19 existing scenes and full source/native editor coverage accepted under G0-G13.
See [final acceptance](./docs/reference/FINAL-INTEGRATION-ACCEPTANCE.md). The historical pilot/phase notes below retain their original scope; they are not a current backlog.

Historical status: direction approved2026-10-17. The shared-gameplay pilot and four-part Harbor Shift/Sandbox milestone are implemented: selected-scene Play, authored starting fixtures, native inspection and a Harbor scene-document pilot. Shop, Library and Laundromat now also use registered scene/gameplay documents, typed authoring and isolated Play. ENG-02/03 adds persistent commerce, shared conversation paths and a two-area Test District with editor preview. The broader editor phases below remain an evolving roadmap.
This is a supporting requirements and execution-reference document, not an independent priority list.
[ROADMAP.md](./ROADMAP.md) owns delivery order; [GAMEPLAY-ENGINE-PLAN.md](./GAMEPLAY-ENGINE-PLAN.md)
incorporates the shared systems, authoring and demo-world gates. Existing phase numbers below remain
reference labels. Completed [scene-system](./SCENE-SYSTEM-PLAN.md) evidence and story M1-M9 stand.

## Reconciliation with the consolidated roadmap (2026-10-18)

| Historical editor phase | Current destination |
| --- | --- |
| 0 Groundwork | Existing pilot plus ENG-01 reconciliation and ENG-02 state declarations |
| 1 Play | Existing five-scene private Play retained; demo/feature coverage extended per ENG delivery |
| 2 Content model | Partial implementation retained; ENG-02 commerce, ENG-03 dialogue, ENG-04 interactions and ENG-05 objectives/access |
| 3 Registration | ENG-08 declared bindings and manifests |
| 4 Tools | Delivered with each ENG mechanic rather than postponed until the whole model is complete |
| 5 World/story | ENG-05/06/07 and actual dependencies of story M3-M9 |
| 6 Packs | Deferred open product decision; no current implementation goal |

ENG-01–04 have bounded technical evidence. The subsequent feedback-ready package extends objective/access
authoring, private inspection and a declared-scene pilot; see [its scope](./ENG-05-08-PACKAGE.md).
The parent roadmap retains priority ownership. Broad world registration and custom packs remain later work.

## Authorized all-game consolidation (2026-10-18)

[ENGINE-CONSOLIDATION-GOAL.md](./ENGINE-CONSOLIDATION-GOAL.md) supersedes the smaller proposal:
all 19 existing scenes, full typed editor support, shared content/device/controller/world/network
contracts and removal of replaced paths. G0–G13 are mandatory. The user authorized execution;
full editor UI integration is included, preserving the latest scene-centered rework. Deferred hooks
or opaque legacy content wrappers do not satisfy completion. Historical completed scopes remain
valid evidence but are not claims that all-game migration is already done.

## Goal

The editor should let us **review** the game as it plays, **set up** scenes visually and logically,
and eventually **click our own levels together** without writing TypeScript for ordinary content.
New mechanics remain code, exposed to the editor as typed building blocks.

## Decisions (2026-10-17)

- The editor's purpose widens from an art, composition and timeline tool to a full game editor.
- For this track, the following `SCENE-SYSTEM-PLAN.md` exclusions are lifted: behaviour editing
  beyond the S13 Sandbox inventory, quest/objective and story-state authoring, and world,
  membership, transport and access editing. They are still out of scope for the completed
  S0-S13 work, whose evidence stays valid. Each phase below defines its own scope.
- Order: **play mode first**, then a **scene-document pilot** on one simple scene.
- Still not authorized: arbitrary scripting or code in documents, publishing as a side effect
  of editing, and changing art or story as part of migration.

### Open decision

- Are custom levels **internal authoring only**, or eventually a **player-facing feature**?
  Phases 1-5 are the same either way. Phase 6 depends on the answer.

## Where we start (review findings, 2026-10-17)

Line counts and file lists here are approximate.

Each scene is three layers held together by string ids:

| Layer | Source | Editor today |
| --- | --- | --- |
| Visual | `scenes/<id>/composition.json` | Editable: transforms, typed props, anchors, decorative add/duplicate/delete |
| Device logic | `scenes/<id>/devices.json` (`data/types.ts`, run by `engine/model.ts`) | Sandbox only (`authoring/inventories/S13.json`: 5 nouns, 10 handlers, 2 cables) |
| Everything else | `index.ts` `SceneDef`, `rules.ts`, `composition.ts`, `scene.ts`, registries | TypeScript; read-only or "opaque" in the event inspector |

Things an editor cannot reach today, because they are code:

- **Scene contents:** exits, spawn, people and talk, readables, `SceneUse` closures, intro, rests.
  Seven scenes have no `devices.json` and are entirely TypeScript.
- **Logic limits:** named effects, `tick` and `derived` values. Data conditions are a single atom
  (`key`, `!key`, `key=value`, `signal`) with no AND/OR, so compound logic moves into code. Data
  cannot read or set save flags, and there is no `wait` step and no item `give`.
- **Bindings:** each `composition.ts` hard-codes required gameplay instance ids and its own allowed
  binding sources, and maps placements onto `devices.json` spots.
- **Registration:** a new scene touches about 6-8 TypeScript files: `scenes/index.ts`,
  `world/city.ts`, `data/index.ts`, `authoring/scene-adapters.ts` (which feeds
  `authoring/source-documents.ts`) and `scripts/generate-demos.tsx`.
- **Story and progression:** `Save.flags` is an undeclared flat namespace. Objectives are
  if-ladders (`shiftGoal`, Downtown `progression.ts`, `SceneDef.objective`), the opening is
  tables in `story/opening.ts`, and `runtime/game.ts` holds about 11 scene-specific special cases.
  Cross-scene links exist only through flags set and read in code.
- **World:** `world/city.ts` is TypeScript. Access rules such as the harbor gate are evaluated in
  about four places (`placeBlocked`, `fly`, `updateTravel`, `lineOpen`). `world/document.ts` is a
  read-only mirror.
- **Review:** `authoring/native-preview.ts` deliberately never constructs `Game`. Gameplay runs only
  in the Sandbox behaviour lab.

What already works in our favour:

- The device vocabulary is finite and data-driven: 9 action types, guards, toys, sectors, clocks,
  watchdog, dialogue, goals and texts. `data/check.ts` validates it.
- The Sandbox runner (`authoring/behavior-sandbox.ts`) proves logic can run on the real
  `SceneModel` with an isolated clock and save.
- `ComposerModel` is pure (history, validation, transactions), rendering is injected, and
  workbenches use a plugin interface.
- The public editor accepts data only and never code, so a data-first model keeps it safe.
- The appearance baseline, ledger and native preview give us a way to prove a migration
  changed nothing.

The root cause: **the editor is ahead of the content model.** Until levels are data, new editor
features remain viewers or narrow exceptions like S13.

## Target architecture

- **Data:** places, exits, people, dialogue, interactions, devices, wiring, flags, objectives,
  cutscenes and world links.
- **Typed blocks:** a small registered library of effects with parameter schemas (for example
  timer, wait, move along path, play cutscene, set flag, give or take item). The editor places
  them and validates their parameters.
- **Code:** genuinely new mechanics only (a new lock toy, the crane simulation), exposed as new
  blocks or element types.

### Implemented shared-gameplay pilot (2026-10-17)

The subsequent mechanics discussion adds a common command/event boundary for interactions,
conversation choices and native hacking signals. See [GAMEPLAY-SYSTEM.md](./docs/reference/GAMEPLAY-SYSTEM.md).
It implements validated conditions/actions, atomic reactions, invocation permissions, bounded
execution and a conversation runner. Harbor Shift uses its legacy flags/items through this
foundation; its ordinary presentation and artwork are preserved. An isolated **Gameplay** editor
tab exercises explicit choices and a native wired delivery terminal using the same operation.

This is a prerequisite/pilot contribution, not completion of Phase 1 Game play mode or Phase 2's
scene-document migration. The follow-up authoring milestone registers `harbor-shift-gameplay`
as a `gameplay` document and adds typed dialogue/choice/condition/action/reaction controls.
Pending edits drive the same isolated native laboratory; global history, portable bundles and
the protected local service handle import/save/reload. Existing pilot IDs and invocation
permissions are validated against a code-owned contract. S13's inventory remains unchanged.
Specialized device controllers, network/access rules and async timing retain their current
implementation until explicitly migrated.

Authoring acceptance: edited assignment text/choices, conditions, item actions and event wiring
were exercised through ordinary and native wired delivery. Model and actual-browser undo/redo,
download/import, invalid import rejection and zero player-storage access passed. Protected
source Save/reload/native execution, token enforcement, revision conflicts and grouped invalid
save rollback passed against temporary copies of the real source allowlist. Default harbor
behavior and appearance remain separate preservation checks; this does not start a campaign playthrough.

## Original editor phase requirements (reference, not independent priorities)

Sizes are relative (S/M/L). Each phase ends with the listed acceptance checks.

### Phase 0: groundwork (S)

- Split `authoring/app.ts` `mountComposer` into modules (header and menu, layers, inspector,
  timeline, preview input) without behaviour change. New editors build on these pieces.
- Add an aggregate `check-editor` package script that runs the existing focused editor checks.
  It replaces running scripts one by one. It is not a game regression suite (see Verification).

Acceptance: identical public-editor browser check and build check results before and after.

### Implemented Harbor Shift Play slice (2026-10-18)

The **Play** tab constructs the real `Game` with validated copies of the pending Harbor Shift
composition and gameplay documents. Movement, conversations, carried-item handover, objectives,
pings and drawing use shipping code. The existing ordinary-game conversation adapter retains its
automatic assignment continuation; explicit choice presentation is still exercised in the Gameplay lab.
The inspector shows detached player/save, objective, dialogue/pause/popup and committed event snapshots.

An opaque-origin iframe (`sandbox="allow-scripts"`, without same-origin access) owns the runtime,
world globals, clocks, timers, audio, inputs and memory-only save/slot adapters. Stop, reset and
leaving the tab destroy that frame; every fresh Play starts a new save with weather seed 3.
Slot resume requests restart the private frame. The game never reads or writes player storage.
Native scene-time versus wall-time behavior remains unchanged within a session. Pending source
is immutable during Play and undo/redo/import appear on the next launch. Local and static public
packaging use hashed frame/script files, the shipping CSS/tokens and binary-loaded game fonts.

Focused browser acceptance passed pending spawn/placement, dialogue and item action edits, real
movement/pickup/handover, objective/event updates, reset/replay, repeated mount destruction,
source-document preservation and undo/redo, with zero native storage accesses in editor and frame.
Protected local editor launch passed its real CSP; shared storage checks cover both native-default
and editor-memory save/slot/resume/reset paths. Harbor effective drawing-command checks pass;
this is not a full campaign playthrough or a new whole-game pixel corpus.

The follow-up four-part milestone completes selected-scene launch for **Harbor Shift and Sandbox**,
typed reusable starting fixtures, and live native device/trace inspection. It also adds Harbor's
scene-document pilot. This does not migrate every scene or claim all of Phase 2 is complete.

### Implemented combined follow-up (2026-10-18)

- **Scene selection:** Play launches Harbor Shift or Sandbox. Both use pending compositions;
  Harbor additionally consumes pending gameplay/scene data; Sandbox consumes pending validated
  S13 behavior data through its native scene factory. Runtime wire edits stay private to Play.
- **Starting fixtures:** `authoring/play-fixtures.json` (`play-fixtures`, kind `fixtures`) supplies
  reusable profiles. Typed controls cover declared flags, inventory, tokens, logic modules,
  programs, keyring, primitive native scene state, day/minute/seed, weather, spawn, and story/fixed/
  running city clocks. Duplicate/delete, editor history, portable bundles and protected Save all
  use the existing source pipeline. Every fresh Play/reset reenters the selected fixture.
- **Native inspection:** select a device to see current nouns/verbs, state/goals, links, trace,
  lockouts, watchdogs, clock beats, pending native signals/callbacks and remaining times, and a
  bounded action/condition/result history. Failed conditions show their actual evaluated result.
  Inspection is enabled only in editor frames and returns copies. Scene time pauses with menus;
  wall-clock locks retain native behavior. No new signal semantics or action evaluator is introduced.
- **Harbor scene pilot:** `scenes/harbor-shift/scene.json` (`harbor-shift-scene`, kind `scene`)
  owns name/arrival, ordered objectives/guidance/time, interaction availability, command/response
  branches, conversations and carried-item routes. **Scene logic** edits these through typed
  controls. A reusable compiler connects them to the same gameplay session; spatial anchors,
  actor artwork, specialized controllers and existing stable interaction IDs remain code-owned.
  Permission/reference checks reject privileged commands, unknown symbols and missing fallbacks.

Acceptance passed: 1,100 captured pre-migration objective/attention/time/visibility/interaction/
message/state/event cases; Harbor effective drawing-command comparisons (including 36 Shift
frames); grouped scene/fixture source save/reload/undo/conflict and invalid transaction rollback;
actual typed UI and download/import; real Harbor pickup; native Sandbox hacking/wiring, paused
signal delivery and failed conditions; fixture reset and source preservation; zero parent/frame
native storage calls. `scripts/scene-system/fixtures/harbor-scene-before.json.gz` preserves the
legacy behavior baseline (raw SHA-256 `b6250c5abac33c037b9e2045f80cec27e2d70b46a93781886173b2424144cf33`).
These are focused milestone checks, not a campaign playthrough, a new whole-game pixel corpus,
or performance evidence. Remaining work includes other scene migration, a complete flag registry,
exits/people authoring, generic conversation presentation and broader typed subsystem blocks.

### Historical three-scene migration batch (2026-10-18, before ENG-02/03)

After inspecting the candidates together, Shop, Library and Laundromat were migrated in parallel
against one shared contract. Market and Beach remain later work because they combine more
transient counters, dynamic pricing, timed billing and animation effects.

- **Shop:** four rotating purchase outcomes, atomic token/item/flag commands, original failed-payment
  dialogue, NPC dialogue, two readables and the Downtown exit presentation.
- **Library:** seven speakers with native ordered dialogue, three readables, chair interaction,
  plain exit and the existing touch-specific arrival hint. No artificial resource commands.
- **Laundromat:** soap purchase, four speakers, two readables and Market exit presentation;
  washer/breaker/timing/reward controllers remain native.
- **Shared contract:** optional objective/time sections; prices and action labels; successful-outcome
  rotation with an explicit cursor port; typed readable, speaker and plain-exit content. Geometry,
  actor appearance/order and specialized mechanics remain code-owned adapters.
- **Editor:** the explicit migrated-scene registry feeds source validation, Scene logic, Gameplay
  selection and five-scene Play. There are 35 editable source documents. All six new documents
  participate in existing history, portable bundles and protected grouped Save.
- **Compatibility:** native NPC dialogue advances and then repeats its last set; it is not converted
  into persistent conversation rewards. Shop retains its original module-lifetime purchase cursor,
  including across factory calls; failures do not advance it. Existing saves need no version change.

Focused acceptance: three scene-specific gameplay checks; existing Shop/Library/Laundromat artwork
checks; Harbor's 1,100-case parity check; batch pending-factory/history/bundle/fixture and protected
Save/reload/rejection/undo checks; static public packaging and both application builds. Browser
inspection exercises pending Shop purchase text with real input, five-scene Play and typed authoring.
This is not a campaign playthrough or a new full-game pixel baseline.

Remaining: generic instance/binding declarations and data-only registration, unrestricted device
and world editing, other scene migrations, general conversation presentation, and the performance
harness. Phase 2 and Phase 3 are not complete merely because four scenes have documents.

### ENG-02/03 follow-up (2026-10-18)

The shared foundation now includes typed persistent state, transactional purchase definitions,
explicit pricing modifiers, persistent actor dialogue compiled to one runner, and shared device
conversation presentation for Library catalog. Shop's previous transient rotation is superseded by
saved rotation. NPC final-repeat/cycle is explicit. The native Library dialogue projection is
read-only compatibility data generated from one shared text source.

The Test District has two native-artwork areas and one shared gameplay definition. `/?demo` uses
separate persistent demo save/slot/resume keys; Demo world previews pending source in disposable
Play. It exposes minimum, failure and combination scenarios with a coverage catalogue. Gameplay
and Scene logic author the new definitions; the inspector reports resolved state and prices.
The source registry now has 38 documents. No generic scene registration or campaign migration is
implied by role overrides. The engine ledger records technical gates and pending user feedback;
17 conversation paths are migrated and 49 legacy paths remain explicitly inventoried.

### Phase 1: play mode (M)

- **Play** a selected scene inside the editor with the real `Game`, isolated from player
  storage (in-memory save, its own clock).
- **Play from here** with fixture state: flags, items, tokens, modules, programs, scene state,
  city time and weather. The existing environment fixtures become the starting save.
- A live **state panel**: flags, scene state, goals, and the last events or trace, plus reset.
- Return to editing with the document untouched; edits apply on the next Play.
- Works in the local and public editor. Player saves (`access-denied-save-v3` and slots) are
  never read or written.

Acceptance: playing the Sandbox and one story scene works in both editors; storage checks show
player keys unchanged; an edited composition is visible on the next Play.

### Phase 2: content model pilot (L)

- **Scene document** (`scenes/<id>/scene.json`): spawn, exits (`requires`, `needs`, `sets`),
  readables, people and talk, and use interactions expressed as condition plus actions instead
  of closures. The `SceneDef` factory reads it. Code hooks remain for anything not yet expressible.
- **Flag registry** (`data/flags.json`): id, description, owner, and expected setters and readers.
  The build rejects undeclared flags in data.
- **Data language upgrades:**
  - conditions with `all`/`any`/`not` and flag reads;
  - actions: set or clear a flag, give or take an item, wait, play cutscene.
- **Typed blocks:** register the existing named effects with parameter schemas where feasible.
  The rest stay opaque, but are listed.
- **Pilot** one code-only scene (shop or market are candidates).

Acceptance:
- Pixel identity on the baseline cases for the pilot scene.
- Identical interaction positions, exits, flags and saves.
- `data/check.ts` covers the new schema.
- Existing saves load unchanged.

### Phase 3: generic wiring and registration (M)

- Declare required gameplay instances and binding sources in the scene document. Replace the
  per-scene `composition.ts` adapters with one generic adapter.
- Add a **scene manifest** so a new scene is one folder of data. `SCENES`, the editor allowlist
  and the build checks derive from it.

Acceptance: the pilot scene has no hand-written adapter. A data-only test scene registers, builds,
validates and plays without TypeScript changes.

### Phase 4: editor tooling on the new model (L, incremental)

- **New scene** from a template.
- **Interaction inspector:** exits, people, readables and uses, with conditions built from
  dropdowns.
- **Device palette:** add devices, nouns, verbs, events and state keys within the vocabulary.
- **Editable wiring graph:** the event inspector becomes an editor for cases, cables and blocks.
  Cycle detection comes from S13.
- **Objective editor:** consider `PROGRESSION-CONCEPT.md` §9's scene matrix as the schema.
- **Dialogue editor** for people.
- Replace the remaining raw JSON boxes (shots, text cards, fades, beats) with typed forms.

Acceptance per tool: round-trip through `ComposerModel` history, validated save, and Play
reflects the change.

### Phase 5: world and story (L)

- Make the world document the runtime source for districts, places, links, transport and gates.
  Use **one** access evaluator instead of the copies in `placeBlocked`, `fly`, `updateTravel` and
  `lineOpen`.
- Map editing: places, pins, links and gates.
- Move the opening tables, objective ladders, contacts and the `game.ts` special cases into data.
- Save compatibility: migrate per chapter, as ROADMAP's foundations already suggest.

Acceptance: travel, discovery and access behave identically; old saves load or migrate explicitly.

### Phase 6: custom level packs (depends on the open decision)

- Export and import a pack of new scenes and their world links, built on the existing
  `access-denied-editor-edits` bundle format.
- Data only, validated atomically, and never code.
- If player-facing: decide on loading and sharing separately.

## Migration order

1. Pilot scene (Phase 2), proven by the appearance and behaviour checks.
2. Remaining code-only scenes.
3. Device scenes, whose `devices.json` is already data and which need scene documents for
   their interactions.
4. Downtown, the opening and the train, which carry the most special cases.

Migrate bounded batches after inspecting their mechanics together and establishing a shared contract. Independent scene adapters can be implemented in parallel; shared engine/editor contracts have one owner. Verify each scene separately. A scene that cannot be expressed keeps its code hooks and is listed,
rather than getting a weakened replacement.

## Invariants

- Appearance preservation remains an acceptance gate: seeded variation, coordinates, canvas
  state and draw order.
- Player progress stays compatible unless a reset or version change is explicitly requested.
- The public editor keeps static snapshots and downloads only. The loopback write service and its
  credentials are never published.
- Imports and bundles validate atomically before entering pending state.
- Publishing is a separate action from editing or committing.

## Verification

Each phase uses builds and focused checks of its own changes. Game playthroughs and a regression
suite or CI expansion are pending discussion. Play mode makes manual playthroughs easier, but
this plan does not itself start them.

## Risks

- **Migration cost:** proving look and behaviour per scene is real work.
- **Over-generalising:** generalise from two or three real scenes. ROADMAP warns against an early
  generic tutorial framework.
- **Block sprawl:** keep blocks few, typed and inspectable so they don't become a scripting
  language through the back door.
- **Save compatibility** when flags and objectives move into data.


## ENG-04 delivery cross-reference, 2026-10-18

[ENG-04-PLAN.md](./ENG-04-PLAN.md) bounds the native device/interaction/wiring extension;
[ENG-04-STATUS.md](./ENG-04-STATUS.md) records acceptance. Gameplay now includes protected
Market, Beach and Test Workshop sources, typed native bindings/initial wires and live eligibility
inspection. Native Play adds Market/Beach; Demo world adds the connected Workshop. The source
registry has 41 documents. This does not complete generic scene registration, world authoring,
clock/lifecycle unification or all remaining gameplay migrations. Parent priority remains ROADMAP.
