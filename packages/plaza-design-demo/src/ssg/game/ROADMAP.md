# ACCESS DENIED: roadmap

Current status and order of work, rewritten 2026-11-21 against `main` at `7f14765`. Everything
remains in design. This file owns priorities; the [engine handbook](./docs/reference/ENGINE-HANDBOOK.md)
owns implementation guidance, and design documents are working context rather than competing
roadmaps. The user's current direction takes precedence over anything recorded here.

## Where things stand

- **Engine and editor foundation: complete.** Every engine/editor track below has met its
  acceptance gates. No engine migration is open.
- **Editor redesign: phases 1–6 shipped 2026-10-28**; phase 7 is authorized (2026-11-21) and is
  the next editor work.
- **Story content: the new prologue is implemented** (harbor shift → commute → Downtown → home)
  and waits for the user's experience review. After home, the game still runs the **old
  campaign** from `story/opening.json` (sleep → deletion → uplink → old districts). The
  redesigned Act I (M4–M6) is designed (agreed 2026-11-22,
  [ACT-I-REDESIGN.md](./docs/design/ACT-I-REDESIGN.md)) and exists only as art sets in
  `art/proposals/`.

## Status by area

| Area | Status | Notes |
| --- | --- | --- |
| Shared gameplay and editor foundation | Complete | One Game loop, SceneModel, GameplaySession, ConversationSession and canonical state. Folder and catalogue scenes share source, validation, typed editing and private native Play. |
| One render path | Complete | Game, editor, title, cutscenes and taxi all use `renderWorldFrame`. |
| Animation lifecycle and light (C1) | Complete | Playback owns animation; seeking reconstructs in isolation; painting is read-only. |
| Transport (C2) | Complete | Regular train, P14 siding, Downtown, Galleria and Harbor use shared vehicles, movers, floors, seats and passenger flows. |
| Independent artwork placement (C3) | Complete for the named audit | Detail in [artwork authoring](./docs/reference/ARTWORK-ROLE-AUTHORING.md). Contextual primitives that remain are intentional. |
| Continuous world across chunks (B1–B6) | Complete | Mobile lifetime, clipping, bounds, shared layers and sky coordinates across chunk seams. [Boundary example](./docs/design/BOUNDARY-EXAMPLE.md). |
| Engine consolidation (G1–G7) | Complete | Shared scene sources, interactions, geometry, context and capabilities. |
| Sequence unification (S1–S2) | Complete | Sequences are compositions with a `sequence` field; visual keyframe editor on the same viewport. |
| World-first runtime (W1–W6) | Complete | [WORLD-FIRST-RUNTIME.md](./docs/design/WORLD-FIRST-RUNTIME.md). |
| Composition-centred world editor (E1–E6) | Complete | [COMPOSITION-EDITOR-GOAL.md](./docs/design/COMPOSITION-EDITOR-GOAL.md). |
| Contextual authoring workflows (U1–U3) | Complete | [AUTHORING-WORKFLOW-GOAL.md](./docs/design/AUTHORING-WORKFLOW-GOAL.md). Remaining debt: some structured asset properties still use raw JSON controls (tower roof gear/setbacks/signs, skyline rows, shed columns/lights, traffic/air-lane lists, sign/window masks). |
| Asset contracts and direct manipulation (A1–A6) | Complete | [ASSET-CONTRACT-PROGRESS.md](./docs/design/ASSET-CONTRACT-PROGRESS.md). |
| Prologue and authoring acceptance (P1–P4) | Complete | [PROLOGUE-AUTHORING-ACCEPTANCE.md](./docs/design/PROLOGUE-AUTHORING-ACCEPTANCE.md). The seven editor tasks listed there are the reference set for "nothing lost" checks. |
| Location and sequence configuration (L1–L5) | Complete | [LOCAL-PRESENTATION-PROGRESS.md](./docs/design/LOCAL-PRESENTATION-PROGRESS.md). |
| Editor redesign phases 1–6 | Complete (2026-10-28) | Neutral grey look, workspaces (Layout, Animate, Logic, World, Review, Library), docks, status bar, scene toolbar, inspector anatomy, Ctrl K search and shortcuts. [Plan](./docs/design/EDITOR-REDESIGN-PLAN.md), [Editor UI](./docs/reference/EDITOR-UI.md). |
| Editor redesign phase 7 | 7a–7d built 2026-11-22 (Play pause/step/speed not built) | Logic rules, conversation graph, World and Review workspace content. [Notes](./docs/design/EDITOR-PHASE-7-NOTES.md). |
| M1 Progression design | Complete as a design pass | Prologue matrix, teaching spine and revised Act I route. |
| M2 Harbor shift | Implemented | Boss/coworker, deliveries, trolley/clamp, checkout and completion in the connected harbor. |
| M3 Prologue journey and home | Implemented; experience review pending | Title glide → Harbor shift → two-car commute through four tunnel zones → underground Metro → Downtown → home. |
| M4–M6 Redesigned Downtown Act I | Designed 2026-11-22 | [ACT-I-REDESIGN.md](./docs/design/ACT-I-REDESIGN.md). Art sets only; gameplay not started. |
| M7–M9 Robot body, Act II, remote Act III | Future | Story/body decisions and mechanic prototypes come first. |

Detailed acceptance evidence for completed tracks lives in the linked documents and in Git
history. Do not restart a completed track because an intentionally contextual primitive remains.

## Next work, in order

1. **Code health, authorized 2026-11-21.**
   - Split `authoring/app.ts` (the `mountComposer` closure) and `runtime/game.ts` into modules
     by area: viewport, timeline, world, Play and persistence on the editor side; the matching
     areas on the game side. Formatting alone does not fix this.
   - Adopt Prettier, enforced by a **local pre-commit hook, not CI**. Land the one-time reformat
     when no other branches are open and add it to `.git-blame-ignore-revs`.
2. **Testing, authorized 2026-11-21. CI stays build-and-deploy only.**
   - Done 2026-11-21: `pnpm test:game:visuals` runs headless and exits non-zero on a difference;
     approved images are kept per platform (`fixtures/visuals/<platform>/`) because text
     antialiasing differs between operating systems. `win32/` may need one `--accept` on Windows.
   - Done 2026-11-21: `pnpm test:game:prologue` plays New Game through the night shift, commute,
     Downtown and home to the first morning, asserting scene, story phase and goal at each beat
     (`scripts/opening-playthrough/`, which no longer targets the old train opening).
   - Done 2026-11-22: `check-scene-batch` removes and restores the review content of all 19
     scenes in one grouped edit and one undo instead of 19 each; about 170 s down to about 64 s
     with the same per-scene assertions.
3. **Editor phase 7, authorized 2026-11-21.** 7a Logic rules and 7b Conversation graph matter
   most for Act I, which is mostly rules and dialogue. 7a–7d were built 2026-11-22; pause, step
   and speed controls for Play were left out. The
   [notes](./docs/design/EDITOR-PHASE-7-NOTES.md) hold the mockup intent and open questions.
4. **Review M3's experience** with the [prologue review guide](./docs/design/PROLOGUE-REVIEW-GUIDE.md):
   does the boss guide without rushing, does travel read as one journey, does home give
   breathing room? Mechanics are agent-verified; the user's feedback concerns clarity, appeal
   and pacing.
   - Polish pass 2026-11-22 (Tommi's direction): the player is a harbor worker; the deck, train and
     Downtown lines match one parcel, one case, one trolley; the home PC before sleep shows payroll
     and rent mail.
   - Time runs freely from the intro on (Tommi 2026-11-22): no story beat pins the clock. The run
     starts at 19:00 on day 1 (a Monday); the HUD shows the weekday (WED 21:40). Bed runs the clock
     on to 08:00 (`waitUntil` cue in the sleep card). A scene that needs a time of day lets the
     player wait for it rather than pinning the clock.
   - Moth replaces Mara at receiving ([ACT-I-REDESIGN.md](./docs/design/ACT-I-REDESIGN.md), "Prologue setup"): takes the parcel,
     nags about the coffee machine, asks you to cover and is gone until the trolley is parked
     (`stage.actors.hide` by actor id), comes back quiet. Moth calls on the ride home ("noodles
     at ten"), voice only; the player rides alone. A photo of you and Moth is on the fridge.
5. **Old-campaign cutover, decided 2026-11-22:** no "to be continued" card. The prologue keeps
   flowing into the old campaign for now; that campaign is to be reworked into the new Act I.
6. **Build M4**, then M5 and M6, using the build sequence below. Introduce each mechanic through
   a real gameplay need, shared source, typed authoring, a compact demo and a real scene. Keep
   Test District examples reachable and uncluttered.
   - Done 2026-11-22, approved by the user: hacking capability stages (`inspect`, `wire`, `cut`,
     `board`, `guard`, `link`; `engine/hack-stages.ts`, OPENING-PHASE-RULES.md). The story grants
     them through a phase's `hackStages` or `hack:<stage>` flags; the old campaign still gets every
     stage at the uplink. Act I's unlock order is in ACT-I-REDESIGN.md ("Hacking curriculum"); TIMER is not given in
     Act I, so moving `timer.so` off `start:true` belongs to the switch-over.
7. **Continue Downtown sets in parallel.** The precinct's required versus optional role is open.
8. **Prototype embodiment/remote mechanics when needed.** Decided 2026-11-22: the transfer is a
   copy and Kessel dies in the sweep. Before M7, settle where the city takes the body. Prove remote rules before building Act III.

## Build sequence

| Milestone | Deliverable | Completion criterion | Status |
| --- | --- | --- | --- |
| 1. Design prologue and Act I | Scene matrix, teaching dependencies, access model, Act I route, puzzle dispositions | Every required ability is introduced before use and practised independently before combinations | Design pass complete; Act I redesigned 2026-11-22 (ACT-I-REDESIGN.md) |
| 2. Harbor shift | Small work area, boss, coworker, delivery, independent task, physical disruption, checkout | A complete miniature work story teaching movement, interaction and carrying, without hacking or real deadlines | Implemented |
| 3. Seamless prologue | Glide to the dusk harbor; night shift in joined harbor zones; seamless ride to underground Downtown; Downtown route and home/rest. No hacking view or wiring | One unbroken harbor → commute → Downtown → home experience with recurring people and working services ([SEAMLESS-WORLD.md](./docs/design/SEAMLESS-WORLD.md) §7) | Implemented; experience review pending |
| 4. Deletion and first agency | Act I Chapter 1 (beats 1–8): the refusals, CONCIERGE, the missed meeting, the Registry and Ines, Kessel's room, the implant, first inspect and its solo use | Loss is legible; no access deadlock; hacking improves a familiar circumstance | Next content milestone |
| 5. Foundational Downtown hacking | Act I Chapters 2–3 (beats 9–19): getting by, DLV-9, Moth's parcel and flat, the library list; guided and solo wire, cut, board, clue guards, known connections | Each concept is rehearsed before combination; interfaces expand with actual need | After M4 |
| 6. Revised Act I | Act I Chapter 4 (beats 20–22): substation, the dark Registry back office, the sweep, CONCIERGE's lie, Kessel's copy into DLV-9's frame; then the switch-over from the old campaign | Complete Downtown arc; the player cannot leave Downtown while the identity is revoked | After M5 |
| 7. Robot transition and Act II opening | Waking in the DLV-9 body, continuity between bodies, Moth as Act II's lead | Embodiment changes play while knowledge, relationships and progress survive | Settle body questions first |
| 8. Act II chapters | District leads toward recovering the body; separate lessons for logic, time, resources and security | Each chapter advances body recovery and teaches one manageable new concept | Bounded branching, not all districts at once |
| 9. Remote presence and Act III | Remote precursor in Act II, body-loss transition, network/ally play, resolution (the harbor finale may end it) | Remote rules are understood before play depends on them; the ending addresses personal and Registry stakes | Prototype remote play first |

## Review checkpoints

- M3: independent movement/interaction/carrying, readable boss guidance, continuous journey,
  breathing room at home.
- M4 / early M5: deletion is understandable; a player can predict a verb or wire.
- M6: Downtown sustains interest and the emergency transfer lands.
- Before M8: robot embodiment justifies its narrative and mechanical cost.
- Before M9: remote action is readable and enjoyable in familiar places.

These are experience questions, not claims that a playthrough occurred. Purchases,
objectives/access, conversations and devices received positive functional feedback; wiring
mostly works. Player-facing level-pack loading/sharing needs a product decision. Current-format
saves are supported; historic save compatibility is excluded.

## Verification

- `pnpm test:game` runs the node contract checks; see [scripts/game-tests/README.md](../../../scripts/game-tests/README.md).
- `pnpm test:game:visuals` renders 24 scene views headless and compares them (plus 36 sky-group
  cases) with this platform's approved images; a few seconds.
- `pnpm test:game:prologue` plays the prologue from New Game to the first morning headless and
  fails at the first beat that does not arrive; about five minutes.
- `tsc -b` from `packages/plaza-design-demo` and `pnpm build:homepage` are the build checks.
- CI builds and deploys only. Keep heavier checks local.

## Plan ownership and references

- This file owns status, priorities and the M1–M9 order.
- [Seamless world](./docs/design/SEAMLESS-WORLD.md) owns zone/seam/vehicle implementation detail.
- [Progression concept](./docs/design/PROGRESSION-CONCEPT.md) and
  [Prologue and Act I](./docs/design/PROLOGUE-ACT-I-PLAN.md) own story and learning design;
  [Act I redesign](./docs/design/ACT-I-REDESIGN.md) owns Act I's story and beat order.
- [Harbor zones](./docs/design/HARBOR-ZONES.md) owns harbor layout;
  [Puzzles](./docs/reference/PUZZLES.md) describes existing puzzles and proposed dispositions.
- [Editor redesign plan](./docs/design/EDITOR-REDESIGN-PLAN.md), [Editor UI](./docs/reference/EDITOR-UI.md)
  and [phase 7 notes](./docs/design/EDITOR-PHASE-7-NOTES.md) own editor design.
- [Engine handbook](./docs/reference/ENGINE-HANDBOOK.md), [AGENTS.md](./AGENTS.md),
  [README](./README.md) and [authoring guide](./authoring/README.md) describe current use.
- [Pending user review](./docs/design/USER-REVIEW-GUIDE.md) collects review checkpoints.
- DECK-SCREEN-PLAN describes a built feature; PERFORMANCE-HARNESS-PLAN is an inactive proposal.

Future goals need finite deliverables, named contracts, completion conditions, exclusions and a
stopping condition. Publication is always a separate instruction.
