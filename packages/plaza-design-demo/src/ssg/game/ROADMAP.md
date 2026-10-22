# ACCESS DENIED: roadmap

This is the single priority overview for the engine, editor and game experience. Everything
remains in design. Use [ENGINE-HANDBOOK.md](./docs/reference/ENGINE-HANDBOOK.md) for implementation,
[README.md](./README.md) for launch commands and current tests for verification. Design docs
own design detail; this file owns order and status.

## Current foundation

All 20 existing scenes use shared gameplay, conversations, state, devices, composition and
world/story source, with typed editor controls and private native Play. Ordinary scene creation
uses the catalogue rather than a new TypeScript registry entry. New artwork and physical
calculations may require registered code primitives. Public editing downloads bundles; only
the local source service writes validated repository files.

The opening no longer has its own controller: its phases, checkpoint gate, sleep card, morning trigger, clock pins, attention ping and light cue are
story data (opening.json, each scene's `phases`) applied by the one game loop through pure rules (story/story-rules.ts), so the milestone 3
timeline (shift, commute, home) can be authored without new loop code. Contacts and the END card are documents too.

ENG-01 through ENG-05, ENG-08 and ENG-09 consolidation is implemented across the existing game.
ENG-06 measurement tools are available; no optimization is implied. ENG-07 remote identity/reach
and future body/remote-presence mechanics remain future work. Completed engineering migration
gates are retired; current contract tests own regression coverage. Current-format saves are
supported; historic save-format compatibility is outside scope.

## Terms

Decided with Tommi, 2026-10-22; detail in [SEAMLESS-WORLD.md](./docs/design/SEAMLESS-WORLD.md).
A **zone** is the unit that is authored, saved, loaded and unloaded (today's "scene"; code keeps
"scene" for now). A **seam** joins two zones with no cut, an **exit** with a cut; the **world**
is the graph of zones. City → district → place stays the logical layout. One engine, one
renderer: a scene that joins nothing is a world with one zone. (A scene model's trigger `Zones` in engine/model.ts are a
different thing.)

## Next work

1. **Seamless world, steps 1–9** (order and detail in
   [SEAMLESS-WORLD.md](./docs/design/SEAMLESS-WORLD.md) §7): lab pilot of zones and seams with one
   renderer over several zones; barriers; residency and reload by zone; harbor replan (a design
   pass with Tommi, then the harbor as joined zones with the shift P0–P6 moved in); vehicles
   pilot; people flows; Downtown and the underground Downtown Metro; a walkable train of two cars
   (three kept possible); the seamless ride from the raised Harbor station to underground
   Downtown, with P7–P9 authored on top. Step 9 completes milestone 3.
2. **Parallel track: Act I sets** (below).
3. Later seamless steps: the P14 siding (step 10), then the other stations (step 11).
4. Keep gathering feedback on editor authoring comfort and communication clarity. Preserve the
   current scene-centred editor and ongoing rendering/layer work.
5. Prototype remote-presence requirements only when needed for M7 through M9. Settle body
   location, transfer versus copy and Kessel's fate before M7.

Tommi reviews frames and scenes to give feedback; that is how review checkpoints are met. The
Harbor Shift pacing review is done this way during the harbor replan, not as a separate player
test. Playthrough scope and regression-suite/CI expansion are separate discussions; agents may
add focused checks for a fix.

Purchases, objectives/access, conversations and devices received positive functional feedback.
Wiring mostly works; revisit concrete details when reported. Player-facing level packs, loading
and sharing require an explicit product decision; internal ordinary scene creation is already
supported. A future pack must remain data-only and validate atomically through existing bundle
contracts.

## Parallel track: Act I sets

Act I plays only in Downtown. For now its places are built as **sets**: art and layout, no
gameplay. Tommi reviews each set. The places and their order are in the
[revised Act I route](./docs/design/PROLOGUE-ACT-I-PLAN.md#revised-act-i-route-2026-10-22).
Wiring and hacking puzzles are not built yet; M4–M6 gameplay waits until the prologue is done.

## Current position

- **Milestone 1: design pass complete.** [PROLOGUE-ACT-I-PLAN.md](./docs/design/PROLOGUE-ACT-I-PLAN.md)
  holds the prologue matrix, the teaching spine and the revised Act I route (2026-10-22).
  It is a design deliverable, not evidence of player comprehension or implemented progression.
- **Milestone 2: prototype implemented locally.** Launch `?play=harborShift`; see
  [preview and validation notes](./README.md#harbor-shift-prototype-milestone-2). Boss, coworker,
  deliveries, trolley/clamp, checkout and completion are present with isolated saves. Brief
  centre-to-HUD goal text and contextual pings are in; the persistent task card was removed after
  feedback. Its scenes move into the replanned harbor zones in seamless step 4.
- **Milestone 3: not started.** It waits on seamless steps 1–9.
- **Recent kit work:** rooms open on arrival; remembered rooms are shown darkened without their
  people; street doors have inside faces; Act I place style frames are in their second round;
  the storyboard is in the editor's Library.
- The running game still uses the previous train-first opening and multi-district Act I.
  Existing saves may be reset when the prologue replaces it. Staged augmentation and body
  transitions are not implemented.
- No test session, regression-suite expansion, CI work or publication is implied by this roadmap.

## Build sequence

| Milestone | Deliverable | Completion criterion | Dependencies / status |
| --- | --- | --- | --- |
| 1. Design prologue and Act I | Scene matrix, teaching dependencies, access model, Act I route, puzzle dispositions | Every required ability has an introduction before use and independent practice before combinations | Design pass complete; Act I route revised 2026-10-22 |
| 2. Harbor shift prototype | Small work area, boss, coworker, delivery, independent task, physical disruption, checkout | Complete miniature work story; teaches movement, interaction and carrying without hacking or real deadlines | M1; prototype implemented; reviewed by Tommi through scenes during the harbor replan |
| 3. Seamless prologue | Glide lands at the dusk harbor; night shift in joined harbor zones; seamless ride from the raised Harbor station to underground Downtown; Downtown route and home/rest. No hacking view or wiring; ordinary item use, and at most one fix or way around something to prime hacking | One unbroken harbor → commute → Downtown → home experience that shows the engine (single cuts allowed), with recurring people and working services | M2; seamless steps 1–9 ([SEAMLESS-WORLD.md](./docs/design/SEAMLESS-WORLD.md) §7) |
| 4. Deletion and first agency | Morning denial, human help, Kessel's room, limited augmentation, first direct hack and independent application | Loss is legible; no access deadlock; hacking improves a familiar circumstance | M3; gameplay waits; Act I sets in parallel |
| 5. Foundational Downtown hacking | Guided wire, independent wire, cut/replace practice, clue guards, known connections | Each concept is rehearsed before combination; interfaces expand with actual need | M4; gameplay waits |
| 6. Revised Act I | Moth's trail and empty hideout, the dark Registry back office combination, the sweep and Kessel's emergency transfer into a DLV-9 body | Complete Downtown arc; the player cannot leave Downtown while the identity is revoked | M5; gameplay waits |
| 7. Robot transition and Act II opening | Waking in the DLV-9 body, continuity between bodies, Moth as Act II's lead | Embodiment changes play meaningfully while knowledge, relationships and progress survive | M6; settle body location, transfer versus copy and Kessel's fate first |
| 8. Act II chapters | Selected district leads toward recovering the body; separate lessons for logic, time, resources and security | Each chapter advances body recovery and teaches a manageable new concept | M7; bounded branching rather than all districts at once |
| 9. Remote presence and Act III | Limited remote precursor in Act II, body-loss transition, network/ally play, resolution (the harbor finale may end it) | Remote rules are understood before dependence on them; ending addresses personal and Registry stakes | Prototype remote play before writing/building full Act III |

## Milestone 2 scope

Use P1–P6 in the [scene plan](./docs/design/PROLOGUE-ACT-I-PLAN.md). The prototype shares
existing harbor sets and starts directly at shift arrival. It has one boss, one recurring
coworker, two transport tasks, one ordinary physical problem, checkout and a clear end. The
boss gives concise contextual instructions; fictional productivity pressure must not punish
player learning speed. No new mechanics, security puzzles, robot abilities or hacking UI.
Retargeting the cinematic, the harbor replan and the commute belong to milestone 3.

## Review checkpoints

Tommi reviews frames and scenes at each checkpoint.

- Harbor replan (seamless step 4): can players move, interact and carry independently? Does the
  boss guide without rushing?
- After M3: does the seamless ride read as one journey, and does home give breathing room?
- After M4 / early M5: is deletion understandable, and can players predict a verb or wire?
- After M6: does Downtown sustain interest, and does the transfer land?
- Before M8: does the robot body justify its narrative and mechanical cost?
- Before M9: is remote action readable and enjoyable in familiar places?

These are review questions, not claims that a playthrough occurred. Existing districts, devices,
maps, transport and weather are reusable; availability does not require exposing all in Act I.

## Design references

- [Seamless world](./docs/design/SEAMLESS-WORLD.md): zones, seams, vehicles, people flows and the step order.
- [Progression concept](./docs/design/PROGRESSION-CONCEPT.md): story and learning direction.
- [Prologue and Act I](./docs/design/PROLOGUE-ACT-I-PLAN.md): encounters and teaching dependencies.
- [Puzzles](./docs/reference/PUZZLES.md): current puzzles and proposed dispositions.
- [Story](./docs/design/STORY.md), [levels](./docs/design/LEVELS.md), [city](./docs/reference/CITY.md)
  and [scene ideas](./docs/design/SCENE-IDEAS.md): design material; this roadmap owns priorities.

Future goals need finite deliverables, named current contracts, verifiable completion conditions,
exclusions and a stopping condition. Test current behavior and approved current visuals; do not
retain an old engine or a migration ledger to prove ongoing correctness.
