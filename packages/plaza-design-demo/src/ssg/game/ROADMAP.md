# ACCESS DENIED: roadmap

Updated 2026-10-16. This is the active build sequence for the
[progression concept](./PROGRESSION-CONCEPT.md). Everything remains in design. Milestones
are deliverables, not dates; later story proposals remain provisional.

## Current position

- **Milestone 1: design pass complete.** [PROLOGUE-ACT-I-PLAN.md](./PROLOGUE-ACT-I-PLAN.md)
  specifies the proposed encounters, prerequisites, learning practice, interfaces, scene
  permissions, failure recovery and disposition of existing puzzles. This is a completed
  design deliverable, not evidence of player comprehension or implemented progression.
- **Next: milestone 2, the harbor shift prototype.** Build only after a request to implement;
  the current task consolidates documentation and completes milestone 1.
- The running game still uses the previous train-first opening and multi-district Act I.
  The harbor shift, staged augmentation and body transitions are not implemented.
- Player testing and playthrough scope are to be discussed separately. No test session,
  regression-suite expansion, CI work or publication is implied by this roadmap.

## Build sequence

| Milestone | Deliverable | Completion criterion | Dependencies / status |
| --- | --- | --- | --- |
| 1. Design prologue and Act I | Scene matrix, teaching dependencies, access model, clinic route, puzzle dispositions | Every required ability has an introduction before use and independent practice before combinations; unresolved finale decisions isolated | Design pass complete; see linked plan |
| 2. Harbor shift prototype | Small work area, boss, coworker, delivery, independent task, physical disruption, checkout | Complete miniature work story; teaches movement, interaction and carrying without hacking or real deadlines | M1; next implementation slice |
| 3. Ordinary-life prologue | Glide lands at dusk harbor; night shift connects to dawn commute, Downtown and home/rest | Coherent shift-to-home experience with recurring people, working services and breathing room | M2 plus pacing review |
| 4. Deletion and first agency | Morning denial, human help, ordinary clinic route, limited augmentation, first direct hack and independent application | Loss is legible; no clinic access deadlock; hacking improves a familiar circumstance | M3; use M1 working defaults |
| 5. Foundational Downtown hacking | Guided wire, independent wire, cut/replace practice, clue guards, known connections | Each concept is rehearsed before combination; interfaces expand with actual need | M4 |
| 6. Revised Act I | Local Moth investigation, combination challenge, consistent travel restrictions, motivated finale | Complete local arc; departure uses established abilities; no accidental district bypass | M5; choose finale and transfer causality before implementing ending |
| 7. Robot transition and Act II opening | Incident, continuity between bodies, safe body introduction, first recovery lead | Embodiment changes play meaningfully while knowledge, relationships and progress survive | M6; settle body location and Kessel's role |
| 8. Act II chapters | Selected district leads; separate lessons for logic, time, resources and security | Each chapter advances body recovery and teaches a manageable new concept | M7; bounded branching rather than all districts at once |
| 9. Remote presence and Act III | Limited remote precursor in Act II, body-loss transition, network/ally play, resolution | Remote rules are understood before dependence on them; ending addresses personal and Registry stakes | Prototype remote play before writing/building full Act III |

## Milestone 2 scope

Use P1–P6 in the [scene plan](./PROLOGUE-ACT-I-PLAN.md). A work bay and connected checkout
area can share existing harbor sets; no full district rebuild is required. Start directly at
shift arrival during development. Retargeting the cinematic and integrating the commute
belong to milestone 3.

Deliver one boss, one recurring coworker, two transport tasks, one ordinary physical
problem, checkout and a clear end to the prototype. Give the boss concise contextual
instructions; fictional productivity pressure must not punish player learning speed.
Preserve the current story route while the prototype is isolated. Do not put new mechanics,
security puzzles, robot abilities or the full hacking UI into this slice.

## Engineering alongside the chapters

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
of it in Act I. The [puzzle disposition table](./PROLOGUE-ACT-I-PLAN.md#existing-puzzle-disposition)
assigns the old catalogue to this plan.

Existing local reliability work pauses scene clocks and delayed actions with interruptions,
blocks movement/time under NET, and restores a valid saved scene on Continue. It is separate
from the progression redesign; it does not provide resumable harbor tasks or exact-position saves.

## Records and documentation roles

- [PROGRESSION-CONCEPT.md](./PROGRESSION-CONCEPT.md): story direction, principles and open embodiment ideas.
- [PROLOGUE-ACT-I-PLAN.md](./PROLOGUE-ACT-I-PLAN.md): milestone 1 encounter plan and dependencies.
- [PUZZLES.md](./PUZZLES.md): existing puzzle catalogue and implemented mechanics.
- [GAME-DATA.md](./GAME-DATA.md): current authoring and engine behaviour.
- [STORY.md](./STORY.md), [CITY.md](./CITY.md), [LEVELS.md](./LEVELS.md): reusable world/story material; older act orders are superseded by this roadmap.
- [Archived previous roadmap](./archive/ROADMAP-BEFORE-PROGRESSION-2026-10-16.md): detailed earlier builds, glide notes and former act structure, preserved for reference.

The archive preserves the old record; its checkmarks and dated decisions are not completion
claims for these new milestones. No production state is inferred from this document.
