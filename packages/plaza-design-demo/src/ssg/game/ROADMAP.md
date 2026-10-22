# ACCESS DENIED: roadmap

This is the single priority overview for the engine, editor and game experience. Everything
remains in design. Use [ENGINE-HANDBOOK.md](./docs/reference/ENGINE-HANDBOOK.md) for implementation,
[README.md](./README.md) for launch commands and current tests for verification.

## Current foundation

All 20 existing scenes use shared gameplay, conversations, state, devices, composition and
world/story source, with typed editor controls and private native Play. Ordinary scene creation
uses the catalogue rather than a new TypeScript registry entry. New artwork and physical
calculations may require registered code primitives. Public editing downloads bundles; only
the local source service writes validated repository files.

ENG-01 through ENG-05, ENG-08 and ENG-09 consolidation is implemented across the existing game.
ENG-06 measurement tools are available; no optimization is implied. ENG-07 remote identity/reach
and future body/remote-presence mechanics remain future work. Completed engineering migration
gates are retired; current contract tests own regression coverage. Current-format saves are
supported; historic save-format compatibility is outside scope.

## Next work

1. Gather feedback on editor authoring comfort and communication clarity. Preserve the current
   scene-centered editor and ongoing rendering/layer work.
2. Review Harbor Shift pacing before M3. Mechanical checks belong to the agent; player feedback
   should address appeal, comprehension and timing. Use direct demo shortcuts, not long walks.
3. Deliver M3 through M6 in small vertical slices: gameplay need, shared system, typed authoring,
   compact demo, real scene, feedback. Reuse current contracts before extending them.
4. Prototype remote-presence requirements only when needed for M7 through M9. Settle body
   continuity, finale causality and Kessel's role before dependent story work.

Purchases, objectives/access, conversations and devices received positive functional feedback.
Wiring mostly works; revisit concrete details when reported. This does not establish editor
comfort or the campaign learning curve. Player-facing level packs, loading and sharing require
an explicit product decision; internal ordinary scene creation is already supported. A future
pack must remain data-only and validate atomically through existing bundle contracts.

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


## Review checkpoints

- After M2: can players move, interact and carry independently? Does the boss guide without rushing?
- After M4 / early M5: is deletion understandable, and can players predict a verb or wire?
- After M6: does Downtown sustain interest, and is departure earned?
- Before M8: does the robot body justify its narrative and mechanical cost?
- Before M9: is remote action readable and enjoyable in familiar places?

These are review questions, not claims that a playthrough occurred. Existing districts, devices,
maps, transport and weather are reusable; availability does not require exposing all in Act I.

## Design references

- [Progression concept](./docs/design/PROGRESSION-CONCEPT.md): story and learning direction.
- [Prologue and Act I](./docs/design/PROLOGUE-ACT-I-PLAN.md): encounters and teaching dependencies.
- [Puzzles](./docs/reference/PUZZLES.md): current puzzles and proposed dispositions.
- [Story](./docs/design/STORY.md), [levels](./docs/design/LEVELS.md), [city](./docs/reference/CITY.md)
  and [scene ideas](./docs/design/SCENE-IDEAS.md): design material; this roadmap owns priorities.

Future goals need finite deliverables, named current contracts, verifiable completion conditions,
exclusions and a stopping condition. Test current behavior and approved current visuals; do not
retain an old engine or a migration ledger to prove ongoing correctness.
