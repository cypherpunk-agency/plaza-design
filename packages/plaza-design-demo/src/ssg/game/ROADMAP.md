# ACCESS DENIED: roadmap

Single priority overview, consolidated 2026-10-23. Everything remains in design.
This roadmap owns status and order; the [engine handbook](./docs/reference/ENGINE-HANDBOOK.md)
owns implementation guidance. Design documents are working context, not competing roadmaps.

## Current sequence unification work

S1 is complete: each sequence composition owns its contents and temporal
controls. The separate world/composition/editor sequence adapters and separately stored timeline
documents are removed. Game and editor prepare the same frame and render through renderWorldFrame.
The timeline is an editing interface for the composition's `sequence` field, not another document.

Opening-glide objects can be selected, dragged and edited in their actual source scene/backdrop
without leaving the sequence preview. Cinematic objects edit their own composition. The inspector
identifies the source; edits also appear wherever that source is used in the game. Transient drags
respect catalogue projections before pointer release; history is committed once on release.

Acceptance checks passed: source-owned world/cinematic bounds and movement, real browser selection,
field edit/undo and pointer drag, history/bundles/protected Save/fresh native reload (including timing),
128/128 unchanged canonical paint samples across all five sequences, and 84/84 Canvas2D animation
lifecycle comparisons. Opening skip/handoff, package TypeScript, focused checks and both builds pass.
No old-format bridge or second renderer was added. Continuous world across chunks is the next bounded engineering package; C3 follows it.

S2: visual keyframe authoring is implemented locally. The same editor now has a bottom time grid,
expandable object/property rows, moving playhead, keyframe selection/retiming and typed right-side
inspectors for keys, shots, cards, fades and beats. The dock resizes/collapses and supports temporal
zoom. Space/comma/period/Left/Right control visible editor/viewer animation, with typing guards and
Alt+arrows for artwork nudging. No renderer adapter or persisted source model was added.
Verified actual browser key selection/drag/history, object and duration-bar selection, dock collapse,
all four viewers, typing guards, and protected Save/fresh-native reload of a retimed camera key.
Focused checks, package TypeScript and both builds pass; the native Play bundle is unchanged.
The sequence outline now retains controls, all referenced scenes and shared backdrops on selection
and deselection. Source-scoped identities connect preview hover/click to the correct row; browser
verification covers the reported beach-person select/deselect case and retained expansion.

Editor usability/performance follow-up is implemented locally: remembered collapsed outline groups,
active-scene labels/borders, sequence viewport zoom/pan/Fit, time-grid wheel navigation, undoable
Discard all changes, speed controls and render-rate/CPU-time readout. The drag path caches the
validated registry and rebuilds only the affected scene during transient movement; commits retain
full validation. A local browser CPU sample improved from 125–141 ms to 18–22 ms per drag update;
this is a measured workload, not a cross-device FPS guarantee. Browser checks cover these controls,
clean-source navigation, preference reload and discard/undo. No publication is implied.

Independent camera inspection is implemented locally: Workspace owns editor navigation and shows
the authored camera as a guide, including the opening's final playFit/height blend. Camera preview
retains the exact finished player picture; Frame camera is explicit navigation. Object outlines
remains in the viewport toolbar and remembers its state. The shared frame preparation accepts an
optional inspection camera; no separate renderer or persisted sequence model was introduced.
Player rendering matches 128/128 sampled canonical paints. Focused tests cover fixed scenery bounds
while the shot moves/zooms, and browser checks cover mode switching, framing and preference reload.

## Architecture cleanup (2026-10-24, local)

The five unreferenced migration/alias modules and twelve unused helpers from the code review are
removed. Source validation, condition/query evaluation, frame contracts, sky layout and character
recipe metadata have acyclic runtime dependencies. Downtown device painters use an explicit table.
The composer document model/contracts, field controls, temporal inspector and navigation math are
separate from the application shell. Stateless prompt and HUD projections are extracted from Game;
the existing state owners, loop, rendering, gameplay permissions and save path remain authoritative.
Workspace sky layout uses authored camera dimensions/facing independently of editor pan/zoom.
Verified locally: 24/24 current scene pixel references match; 84/84 native intro lifecycle comparisons
pass; focused document/history/bundle/protected Save/native reload, gameplay/query/conversation, actor,
keyframe, prompt/HUD and camera-relative sky checks pass. Real-browser camera/keyframe editing and
undo/redo pass. Both builds and package TypeScript pass. No campaign redesign or new runtime was
introduced. Publishing is separate.

The combined Game/editor decomposition is also implemented locally. Game retains the frame loop,
services and save ownership, with focused input, movement, camera, scene lifecycle, interaction,
story/travel and presentation modules. Editor viewport listeners, source-aware selection, inspector
lifecycle and pending-preview coalescing are separated from the shell; ComposerModel remains the
only document/history owner. Game and editor share projection/canvas/bounds geometry and frame
preparation. There are no additional render adapters, runtimes, saved models or historical codecs.

Preservation checks: 24/24 approved scene rasters and 84/84 intro playback/seek rasters match.
The real browser covers movement/release, jump/landing, menu locks, timeline transport, typed keys,
drag/undo/redo and independent camera/workspace controls. Focused checks cover opening workflows,
joined interactions/residency, lifecycle stop/start, current saves, source history/bundles/protected
Save and fresh native reload. This is structural work; C3's portability audit and campaign experience
review remain separate work. Current module ownership is documented in the handbook and authoring
README; new features should extend those modules rather than growing the two shells again.

Follow-up consolidation is implemented locally: asynchronous previews reject stale results/errors
and crop measurements while continuous playback still progresses; outline/viewport/timeline selection
uses one source-aware record; inspector mounts distinguish repeated local IDs across documents.
Scene lifecycle now owns departure disposal and visibility as well as residency. Rendering, picking
and host positioning consume immutable camera projections; temporary hack-camera mutation is removed.
41 private forwarding methods and six internal-only exports were removed; player/scene-placement
contracts are shared. Current tests exercise the extracted functions rather than removed Game aliases.

## Current status

The pre-boundary baseline `9f486f2` was verified on main before this work. B1 is implemented
and verified; this release includes the compact example and roadmap update.

| Area | Status | What this means |
| --- | --- | --- |
| Shared gameplay and editor foundation | Implemented | One Game loop, SceneModel, GameplaySession, ConversationSession and canonical state ownership. Folder and catalogue scenes use shared source, pending-document validation, typed editing and private native Play. |
| One render path | Complete | Game, editor, title, cutscenes and taxi use renderWorldFrame; the former opening renderer and artwork wrappers are removed. |
| C1: animation lifecycle and light | Complete | Playback owns animation advancement; seeking reconstructs in isolation; painting/bounds are read-only. Explicit View lighting replaces presentation reads of global light; unused citySkyline is removed. |
| C2: transport consolidation | Complete | Regular train, P14 siding, Downtown, Galleria and Harbor use shared vehicles, movers, floors, seats and passenger flows. Old boarding cuts, platform clocks and replacement crowds are removed. |
| C3: independent artwork placement | Partially implemented; follows boundary package | Many scene fittings now have independent properties and placement. Remaining context-dependent families still need the bounded audit below. A registered preview alone does not prove portability. |
| Continuous world across chunks | B1 complete; B2–B6 pending | Compact native boundary example is ready. Mobile lifetime, visual bounds, shared ordering and prologue application remain the next engineering work. |
| C4: guidance and current checks | Current for this release | Agent entry point, handbook and focused checks describe the shared engine. Keep them current with each change; this is not a separate historical migration project. |
| M1: progression design | Complete as a design pass | Prologue matrix, teaching spine and revised Act I route are documented; comprehension is reviewed in the game. |
| M2: Harbor shift | Implemented | Boss/coworker, deliveries, trolley/clamp, checkout and completion run in the connected harbor. |
| M3: prologue journey and home | Implemented; experience review pending | Title lands at Harbor, shift leads into the two-car commute through four tunnel zones, underground Metro, Downtown and home/rest. This is not a claim of a full campaign playthrough. |
| M4–M6: redesigned Downtown Act I | Planned | Sets/artwork can progress in parallel. The new deletion, augmentation and gradual hacking curriculum are not yet the completed campaign. |
| M7–M9: robot body, Act II and remote Act III | Future | Story/body decisions and focused mechanics prototypes precede full chapters. |

The existing multi-district game remains playable content; it is not evidence that the redesigned
Downtown-only Act I or later body transitions have been implemented. Ordinary interactions,
dialogue, objectives, access, rewards, prices and progression use shared source. Registered art
and physical calculations may remain code primitives; arbitrary algorithm editing is not promised.

## Release and verification

The prior C1/C2 release was published to main and production at `c14a9d9`. Publication of the
sequence unification above is authorized for main and production. Confirm the resulting commit
and workflow outcomes in the release response; a local green build is not a deployment.

C1/C2 acceptance is complete, including Tommi's final approval of Train, Galleria Station,
Harbor Station and Tower. Verification:

- **24/24 current scene visual references match**, including accepted people/vehicle-kit changes,
  requested seated-pose fixes, restored compliance sign and far gull silhouettes.
- **84/84 actual Canvas2D lifecycle comparisons pass** across native/editor playback, isolated
  seeking, repeated paused paint, resize, scales and reduced-motion settings.
- **6/6 saved-source/fresh-native-reload cases pass**: Downtown, Galleria, Harbor, moving,
  safety-locked siding and released-door siding. A real editor door edit passes protected Save,
  a fresh source-store read and a fresh opaque native Play realm. Alighting/reboarding and unsafe
  refusal use the shipping interaction path; private saves remain isolated.
- Focused checks cover pass authorization, brake snap, safety rewiring, locks, dialogue after
  alighting, passenger identity, source editing/history/bundles, read-only inspection and the
  original prologue commute. Package TypeScript and builds are release checks.

The reload verification found and fixed conditional mover paths restarting at their previous
station. Current checkpoints keep an address to the chosen leg in validated source, elapsed time
and halt identity; future choices stay in the ordinary mover queue. No saved executable steps,
old-format codec, second runtime or fleet-management feature is added.

## Next work, in order

1. **Continuous world across chunks.** Start with the compact native boundary example below,
   then consolidate mobile ownership, visibility/bounds and shared ordering before applying it
   to the opening/prologue. Chunk boundaries are authoring/loading boundaries, not automatic
   clipping planes or the lifetime of a person or vehicle.
2. **Finish C3 in bounded asset families.** Audit remaining Mall fronts/escalators and parent
   geometry, Harbor stalls/ordinary fixtures, and any remaining train fittings against actual
   consumers. Extract independent objects; retain context only when it is intrinsic. Do not
   restart completed extractions or mistake every context entry for missing artwork.
3. **Review M3's experience**, using the [prologue review guide](./docs/design/PROLOGUE-REVIEW-GUIDE.md) and frames/scenes: does the boss guide without rushing,
   does travel read as one journey, and does home give breathing room? Mechanical verification
   belongs to agents; Tommi's feedback concerns clarity, appeal, pacing and editor comfort.
4. **Build M4**, then M5 and M6 using the progression table below. Introduce each mechanic through
   an actual gameplay need, shared source, typed authoring, a compact demo and a real scene.
   Keep Test District examples immediately reachable and free of unrelated clutter.
5. **Continue Downtown sets in parallel.** Their artwork/layout can evolve before gameplay is
   attached. The precinct's required versus optional role remains undecided.
6. **Prototype later embodiment/remote mechanics when needed.** Before M7 settle body location,
   transfer versus copy and Kessel's fate. Prove remote rules before building full Act III.

## Continuous world across chunks: bounded delivery

Accepted direction, 2026-10-24. Extend the existing people/crowd and vehicle systems, Game loop,
SceneModel, source catalogue and renderer. No new renderer, adapter, simulation, scheduler or
parallel live-state owner. A mobile has a stable identity and current world position; its current
chunk follows that position. Its authored spawn chunk does not own its lifetime. Fixtures/devices
remain chunk-local. Ambient people may leave at explicit off-screen sinks; this does not require
simulating an entire city or adding fleet management.

| Step | Deliverable and completion condition | Status |
| --- | --- | --- |
| B1. Compact native example | Two adjacent chunks; one crossing walker, one routed vehicle, one overhanging prop and a foreground occluder. Direct Test District jump and ordinary editable catalogue sources/private native Play. Verify real source compilation, seam crossing and current behavior without a separate preview. | Complete; [review guide](./docs/design/BOUNDARY-EXAMPLE.md) |
| B2. Mobile ownership | Existing people/vehicle systems own live identity, progress and attachments independently of the spawn chunk. Cross and return without reset, duplication or disappearance, including when the origin leaves the loaded view. Authored spawn/sink rules remain explicit. | Pending |
| B3. Visibility and bounds | Logical chunk bounds differ from visual bounds and explicit clips. Overhanging artwork remains visible while its actual bounds intersect the frame. Foreground occlusion is deliberate; a seam never clips a person by itself. | Pending |
| B4. Shared layers/background | Cross-chunk mobiles and static pieces share correct depth/order; background continuity survives view movement. Preserve interiors and existing approved art. | Pending |
| B5. Editor contracts | Existing editor exposes logical bounds versus explicit clip/occluder geometry and mobile spawn/routes/sinks/current location. Pending sources, typed editing, undo/redo, bundles, protected Save and native Play agree. No second evaluator or renderer. | Pending |
| B6. Real-scene application and cleanup | Apply verified contracts to opening/prologue; remove replaced scene-local lifetime/clipping workarounds. Verify travel, pause/seek, re-entry and visible boundary behavior. | Pending |

The example is a small diagnostic scene, not proof that B2–B6 are already solved. Its walker uses
registered character-flow artwork; its cart uses actual Circuit mover time and the vehicle route
compiler. It deliberately keeps current ownership so later fixes can be assessed against a real
case. Campaign/story redesign, new chapters, city-wide simulation and artwork changes unrelated
to boundary defects are excluded. Stop the current task after B1 and a review guide; do not quietly
expand it into the full package. Preserve the current game look and behavior outside deliberate
boundary corrections. Mechanics are agent-verified; user review concerns readability and comfort.

## C3 completion conditions

Detailed dependency findings live in [artwork authoring](./docs/reference/ARTWORK-ROLE-AUTHORING.md).
The Library retains Reusable anywhere / Requires source context / Scene helpers; no new taxonomy.

Already implemented: independent fittings across the reviewed scene families; source-controlled
sky traffic; property-based shelves/lights/rooms; standalone brake and train fittings; scalar
bar/hut dimensions; explicit optional cable endpoints; temporary typed Library property/state
controls; removal of the copied embedded listing and snapshot-wrapper classes.

For each remaining family:

- Inspect actual dependencies and decide independent piece versus explicit required context.
- Use registered artwork with explicit properties, anchors, bounds, state inputs and normal
  composition placements; share drawing kernels and the shipping renderer.
- Prove add/move/duplicate/property/state editing in another supported scene, invalid-edit refusal,
  undo/redo, bundles, protected Save, native source reload and pending native Play as applicable.
- Preserve approved drawing order, seeded appearance, animation cadence and selection geometry;
  remove replaced registrations/wrappers only after checking consumers.
- Keep prepared actors, sequence frames, connected machinery and endpoint-based wiring with
  their actual owners. Their context does not justify a second simulation or copied state.

Stop C3 when all named remaining candidates are resolved and the supported contracts are verified.
Do not claim every asset independently portable, or complete engine/asset consolidation, before then.
The completed C1/C2 goal does not certify C3.

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

## Review checkpoints

- M3: independent movement/interaction/carrying, readable boss guidance, continuous journey,
  breathing room at home.
- M4 / early M5: deletion is understandable; a player can predict a verb or wire.
- M6: Downtown sustains interest and the emergency transfer lands.
- Before M8: robot embodiment justifies its narrative and mechanical cost.
- Before M9: remote action is readable and enjoyable in familiar places.

These are experience questions, not claims that a playthrough occurred. Purchases,
objectives/access, conversations and devices received positive functional feedback. Wiring
mostly works; revisit concrete issues when reported. Player-facing level-pack loading/sharing
requires a product decision. Current-format saves are supported; historic compatibility is excluded.

## Plan ownership and references

- This file owns C1–C4 status, M1–M9 priorities and next-work order.
- [Seamless world](./docs/design/SEAMLESS-WORLD.md) owns zones/seams/vehicle implementation detail;
  its steps are not a second milestone roadmap. A zone is authored/saved/loaded independently;
  seams join zones continuously and exits join them with a cut.
- [Progression concept](./docs/design/PROGRESSION-CONCEPT.md) and
  [Prologue and Act I](./docs/design/PROLOGUE-ACT-I-PLAN.md) own story and learning design.
- [Harbor zones](./docs/design/HARBOR-ZONES.md) owns harbor layout;
  [Puzzles](./docs/reference/PUZZLES.md) describes existing puzzles and proposed dispositions.
- [Engine handbook](./docs/reference/ENGINE-HANDBOOK.md), [AGENTS.md](./AGENTS.md),
  [README](./README.md) and [authoring guidance](./authoring/README.md) describe current use.
- SESSION-HANDOVER is a short session summary. DECK-SCREEN-PLAN describes a built feature;
  PERFORMANCE-HARNESS-PLAN is an inactive optimization proposal. Neither is a parallel active goal.

Future goals need finite deliverables, named current contracts, completion conditions, exclusions
and a stopping condition. Use current tests and approved visuals, not historical engine copies or
migration ledgers. No campaign playthrough, CI expansion, optimization campaign or publication is
implied by future roadmap edits; the user's current instructions control scope.
