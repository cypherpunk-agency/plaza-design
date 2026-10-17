# ACCESS DENIED: roadmap

Updated 2026-10-16. This is the active build sequence for the
[progression concept](./docs/design/PROGRESSION-CONCEPT.md). Everything remains in design. Milestones
are deliverables, not dates; later story proposals remain provisional.

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

## Engineering alongside the chapters

The [unified scene system plan](./SCENE-SYSTEM-PLAN.md) defines a separate engineering track:
one artwork library, no scene-specific drawing in game.ts, serializable compositions and a
local visual composer using the game renderer. S0–S7 and G1–G8 are complete in the isolated
development checkout; main retains its earlier working checkpoint. The completion gates preserve
current appearance; see [execution status](./SCENE-SYSTEM-STATUS.md) for evidence and open work.
Later harbor/tutorial prop redesign is separate. This track does not renumber or complete any
story milestone. The follow-up [game editor plan](./GAME-EDITOR-PLAN.md) (approved 2026-10-17, not
yet started) extends the editor towards play mode and data-driven scenes, logic, story and world.

After composer completion, the [follow-on engineering roadmap](./SCENE-SYSTEM-PLAN.md#follow-on-roadmap-asset-workbenches-and-scene-behavior)
adds separately scoped stretch goals:

| Milestone | Scope | Completion gate |
| --- | --- | --- |
| S8 | Shared asset browser and complex-composition inspector | F1: complete frozen catalog coverage, assembly inspection and usage navigation |
| S9 | Humans, animals and robots: animation/action workbench | F2: supported state matrix, runtime parity and isolated deterministic playback |
| S10 | Ground, flying and boat vehicle workbench | F3: supported vehicle/route/state matrix and runtime parity |
| S11 | Signs, neon, screens and architectural assemblies | F4: catalog coverage and runtime-equivalent environment/state previews |
| S12 | Read-only scripted event, trigger and connection inspector | F5: truthful coverage, real runtime references and no inspection side effects |
| S13 | Bounded declarative behavior editing and sandbox preview | F6: validated rule round-trip, safe runtime semantics and protected source saving |

These are planned, not implemented or added to the active goal. Viewing comes before editing;
S13 requires an explicit supported-rule scope. Existing pixel-identity requirements continue.

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
from the progression redesign; it does not provide resumable harbor tasks or exact-position saves.

## Records and documentation roles

- [PROGRESSION-CONCEPT.md](./docs/design/PROGRESSION-CONCEPT.md): story direction, principles and open embodiment ideas.
- [PROLOGUE-ACT-I-PLAN.md](./docs/design/PROLOGUE-ACT-I-PLAN.md): milestone 1 encounter plan and dependencies.
- [PUZZLES.md](./docs/reference/PUZZLES.md): existing puzzle catalogue and implemented mechanics.
- [GAME-DATA.md](./docs/reference/GAME-DATA.md): current authoring and engine behaviour.
- [STORY.md](./docs/design/STORY.md), [CITY.md](./docs/reference/CITY.md), [LEVELS.md](./docs/design/LEVELS.md): reusable world/story material; older act orders are superseded by this roadmap.
- [Archived previous roadmap](./archive/ROADMAP-BEFORE-PROGRESSION-2026-10-16.md): detailed earlier builds, glide notes and former act structure, preserved for reference.

The archive preserves the old record; its checkmarks and dated decisions are not completion
claims for these new milestones. No production state is inferred from this document.
