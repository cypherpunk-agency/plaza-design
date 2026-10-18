# ACCESS DENIED: roadmap

Updated 2026-10-18. This is the single priority and status overview for the game, its gameplay
systems, authoring tools and demo world. Detailed plans inherit priorities from here.
Everything remains in design. Milestones are deliverables, not dates; later story proposals remain provisional.
Story M1-M9 retain their existing identities. Completed artwork S0-S13 gates are not reopened or renumbered.

## Current delivery order

1. **ENG-01: technically complete. Roadmap reconciliation and finite contracts.** Consolidate existing evidence and
   specify the agreed extensions to the working command/event/conversation pilot. Do not rebuild it.
2. **ENG-02: technically complete. Persistent commerce and the demo-world foundation.** Extend saved state, unify prices
   and purchases, expose authoring, prove the mechanic in the demo district, then update Shop and
   Laundromat. Demo acceptance precedes broad scene migration.
3. **ENG-03: technically complete within its named corpus. Unified conversations.** Consolidate NPC, device and shared conversation behavior,
   expose the editor and demo scenarios, then migrate the explicitly listed representative paths.
4. **ENG-04: technically complete within its named corpus.** Shared native device bindings,
   eligibility, typed wiring and the connected Test Workshop; scoped Market fortune and Beach
   meter/mixer migration. [Frozen scope](./ENG-04-PLAN.md), [evidence](./ENG-04-STATUS.md).
5. **Next: ENG-05**, with its corpus and detailed gates to be specified before implementation.
   ENG-01 through ENG-03 evidence is in [the execution ledger](./GAMEPLAY-ENGINE-STATUS.md).
   Demo feedback remains pending; 49 legacy conversation paths and bot reactions remain inventoried.
   The current run is authorized through ENG-04.
   Listing later work is not authorization to execute or publish it.

The experience checkpoint remains **M2 pacing review**, followed by **M3 ordinary-life prologue**.
Story design can continue in parallel; M3 needs only its actual dependencies, not a finished engine.
A campaign playthrough, CI/regression expansion and publication remain separately scoped.

## Current position

- **Milestone 1: design pass complete.** [PROLOGUE-ACT-I-PLAN.md](./docs/design/PROLOGUE-ACT-I-PLAN.md)
  specifies the proposed encounters, prerequisites, learning practice, interfaces, scene
  permissions, failure recovery and disposition of existing puzzles. This is a completed
  design deliverable, not evidence of player comprehension or implemented progression.
- **Milestone 2: prototype implemented locally.** Launch `?play=harborShift`; see
  [preview and validation notes](./README.md#harbor-shift-prototype-milestone-2). Boss, coworker,
  deliveries, trolley/clamp, checkout and completion are present with isolated saves.
  Feedback iteration: brief centre-to-HUD goal text and contextual pings are implemented;
  the persistent task card was removed after player feedback. The independent return task
  has lighter guidance.
  Pacing/comprehension review remains pending; milestone 3 integrates the commute and home.
- The running game still uses the previous train-first opening and multi-district Act I.
  The harbor shift is available separately; staged augmentation and body transitions are not implemented.
- Player testing and playthrough scope are to be discussed separately. No test session,
  regression-suite expansion, CI work or publication is implied by this roadmap.

## Build sequence

| Milestone | Deliverable | Completion criterion | Dependencies / status |
| --- | --- | --- | --- |
| 1. Design prologue and Act I | Scene matrix, teaching dependencies, access model, clinic route, puzzle dispositions | Every required ability has an introduction before use and independent practice before combinations; unresolved finale decisions isolated | Design pass complete; see linked plan |
| 2. Harbor shift prototype | Small work area, boss, coworker, delivery, independent task, physical disruption, checkout | Complete miniature work story; teaches movement, interaction and carrying without hacking or real deadlines | M1; prototype implemented, player review pending |
| 3. Ordinary-life prologue | Glide lands at dusk harbor; night shift connects to dawn commute, Downtown and home/rest | Coherent shift-to-home experience with recurring people, working services and breathing room | M2 plus pacing review |
| 4. Deletion and first agency | Morning denial, human help, ordinary clinic route, limited augmentation, first direct hack and independent application | Loss is legible; no clinic access deadlock; hacking improves a familiar circumstance | M3; use M1 working defaults |
| 5. Foundational Downtown hacking | Guided wire, independent wire, cut/replace practice, clue guards, known connections | Each concept is rehearsed before combination; interfaces expand with actual need | M4 |
| 6. Revised Act I | Local Moth investigation, combination challenge, consistent travel restrictions, motivated finale | Complete local arc; departure uses established abilities; no accidental district bypass | M5; choose finale and transfer causality before implementing ending |
| 7. Robot transition and Act II opening | Incident, continuity between bodies, safe body introduction, first recovery lead | Embodiment changes play meaningfully while knowledge, relationships and progress survive | M6; settle body location and Kessel's role |
| 8. Act II chapters | Selected district leads; separate lessons for logic, time, resources and security | Each chapter advances body recovery and teaches a manageable new concept | M7; bounded branching rather than all districts at once |
| 9. Remote presence and Act III | Limited remote precursor in Act II, body-loss transition, network/ally play, resolution | Remote rules are understood before dependence on them; ending addresses personal and Registry stakes | Prototype remote play before writing/building full Act III |

## Milestone 2 scope and delivery

Use P1–P6 in the [scene plan](./docs/design/PROLOGUE-ACT-I-PLAN.md). A work bay and connected checkout
area can share existing harbor sets; no full district rebuild is required. Start directly at
shift arrival during development. Retargeting the cinematic and integrating the commute
belong to milestone 3.

Deliver one boss, one recurring coworker, two transport tasks, one ordinary physical
problem, checkout and a clear end to the prototype. Give the boss concise contextual
instructions; fictional productivity pressure must not punish player learning speed.
Preserve the current story route while the prototype is isolated. Do not put new mechanics,
security puzzles, robot abilities or the full hacking UI into this slice.

## Shared engineering deliveries

Detailed scope and finite goal conditions: [GAMEPLAY-ENGINE-PLAN.md](./GAMEPLAY-ENGINE-PLAN.md).
Current gate evidence: [GAMEPLAY-ENGINE-STATUS.md](./GAMEPLAY-ENGINE-STATUS.md).

| ID | Complete delivery across systems, authoring, demo and game | Dependency / story use |
| --- | --- | --- |
| ENG-01 | Reconciled plans, baseline inventory, contract extensions and preservation/change ledger | Technically complete locally; builds on existing pilot |
| ENG-02 | Persistent typed state, purchase/price definitions, editor, demo shop, Shop/Laundromat migration | Technically complete locally; demo feedback pending; reusable for M3 |
| ENG-03 | One conversation runner/model, authoring, demo conversations, representative NPC/device/Harbor migration | Technically complete for 17 scoped paths; remaining legacy corpus deferred; supports M3-M4 |
| ENG-04 | Common interaction/device operations and eligibility; typed wiring; workshop; bounded Market/Beach migration | Technically complete locally for named corpus; demo feedback pending; supports M4-M5 |
| ENG-05 | Objectives/guidance, capability lookup and world access; demo mission; Harbor/Downtown integration | ENG-04; supports M3-M6 as required |
| ENG-06 | Clock/lifecycle contracts and performance harness; timing/environment demos; scoped puzzle alignment | ENG-04; scope dependencies per feature, supports M3/M8 |
| ENG-07 | Remote entity identity, discovery/reach/connection semantics; network demo and puzzle integration | ENG-04/05/06; foundations for M8-M9, not Act III implementation |
| ENG-08 | Declared bindings, manifests and generic scene creation; editor-built demo; remaining scoped migrations | Established ENG contracts; supports all chapters |

Each delivery follows **need -> system -> authoring -> demo -> scoped game migration -> feedback**.
The demo uses the real runtime, model and renderer. Feedback may remain explicitly pending after
technical gates pass; never claim observed comprehension from implementation checks.

### Existing work retained

| Existing identifier | Reconciled status | Continuing role |
| --- | --- | --- |
| Story M1 | Design pass complete | Encounter/teaching plan; not player validation |
| Story M2 | Prototype implemented; pacing review pending | Harbor reference scene; no automatic M3 completion |
| Artwork S0-S7 / G1-G8 | Completed within recorded inventories | Artwork/composition/render foundation; preserve evidence |
| Workbenches S8-S13 / F1-F6 | Completed within recorded inventories | Viewers, inspector and bounded Sandbox authoring; wider editing is new scope |
| Editor phases 0-1 | Substantial implemented slices: isolated Play, fixtures, native inspection | Existing capabilities reused; outstanding acceptance stays explicit |
| Editor phase 2 | Partial: Harbor, Shop, Library and Laundromat documents and shared gameplay | Extended by ENG-01/02/03/04/05; no restart |
| Editor phases 3-5 | Broader binding/registration, tools and world work remains | Executed through ENG-04 through ENG-08, not a separate priority queue |
| Editor phase 6 | Custom packs/player distribution undecided | Deferred; not required for internal authoring |
| Performance proposal | Plan exists; harness not implemented | Detailed work under ENG-06; measurement before optimization |

[SCENE-SYSTEM-PLAN.md](./SCENE-SYSTEM-PLAN.md) and its ledgers preserve completed artwork/workbench
scope. [GAME-EDITOR-PLAN.md](./GAME-EDITOR-PLAN.md) retains detailed editor requirements and historical
phase labels. Neither is an independent active roadmap. Engineering implementation status is local
source status; do not infer main, production or deployed versions without checking them.

| Foundation | First needed | Scope |
| --- | --- | --- |
| Story beats and resumable objectives | M2 | Resume a completed or active task coherently; prevent duplicate item handovers/rewards |
| Authored time and opening handoff | M3 | Dusk → night → dawn → home → morning; no real-time deadline for lessons |
| Capability and interface availability | M4–5 | Separate direct use, wiring, board, connection, scanning and logic; one unlock must not expose everything |
| Knowledge versus travel permission | M3–6 | Remember visited harbor while later entry is denied; align walking, metro, taxi and quick travel |
| Save compatibility | Before each integrated chapter | Keep older saves on a valid route or explicitly design migration; never silently discard progress |
| Body and remote-presence state | M7 and M9 | Build only once the fiction and first playable use are specified |

Prefer small explicit conditions and reusable scene behaviour. Do not build a generic tutorial
framework or mastery-scoring system before the prototype demonstrates a need. Technical
completion and observed player understanding are different evidence.

## Review checkpoints

These define questions for a separately agreed player-test plan, not tests already run.

1. **After M2:** can players move, interact and carry items independently? Does the supervisor
   guide without rushing? Is the shift interesting in its own right?
2. **After M4 / first M5 lessons:** is deletion understandable? Does the first hack feel useful?
   Can players predict what a verb or wire will do?
3. **After M6:** does Downtown sustain interest? Are combinations fair? Is departure earned?
4. **Before expanding M8:** does the robot body justify its narrative and mechanical cost?
5. **Before full M9:** is remote action readable and enjoyable with known devices and places?

Use appropriate focused implementation checks and builds when code changes. These do not
replace an agreed playthrough or demonstrate that the learning curve works.

## Existing material to reuse

The current game supplies the harbor/stacks art, train and stations, Downtown, Capsule 7B,
library, yard, Moth's flat, other districts, everyday interactions, device engine, wiring,
guards, logic, maps, time/weather and saves. Availability is not an obligation to expose all
of it in Act I. The [puzzle disposition table](./docs/design/PROLOGUE-ACT-I-PLAN.md#existing-puzzle-disposition)
assigns the old catalogue to this plan.

Existing local reliability work pauses scene clocks and delayed actions with interruptions,
blocks movement/time under NET, and restores a valid saved scene on Continue. It is separate
from the progression redesign; Harbor now has resumable task state through its separate prototype save; exact-position campaign resume remains outside that work.

## Records and documentation roles

- [GAMEPLAY-ENGINE-PLAN.md](./GAMEPLAY-ENGINE-PLAN.md): execution contracts and acceptance gates for ENG deliveries.
- [GAMEPLAY-ENGINE-STATUS.md](./GAMEPLAY-ENGINE-STATUS.md): current evidence, failures, exceptions and feedback.
- [PROGRESSION-CONCEPT.md](./docs/design/PROGRESSION-CONCEPT.md): story direction, principles and open embodiment ideas.
- [PROLOGUE-ACT-I-PLAN.md](./docs/design/PROLOGUE-ACT-I-PLAN.md): milestone 1 encounter plan and dependencies.
- [PUZZLES.md](./docs/reference/PUZZLES.md): existing puzzle catalogue and implemented mechanics.
- [GAME-DATA.md](./docs/reference/GAME-DATA.md): current authoring and engine behaviour.
- [STORY.md](./docs/design/STORY.md), [CITY.md](./docs/reference/CITY.md), [LEVELS.md](./docs/design/LEVELS.md): reusable world/story material; older act orders are superseded by this roadmap.
- [Archived previous roadmap](./archive/ROADMAP-BEFORE-PROGRESSION-2026-10-16.md): detailed earlier builds, glide notes and former act structure, preserved for reference.

The archive preserves the old record; its checkmarks and dated decisions are not completion
claims for these new milestones. No production state is inferred from this document.
