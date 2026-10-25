# ACCESS DENIED: roadmap

Single priority overview, consolidated 2026-10-25. Everything remains in design.
This roadmap owns status and order; the [engine handbook](./docs/reference/ENGINE-HANDBOOK.md)
owns implementation guidance. Design documents are working context, not competing roadmaps.

## Completed goal: simplify and consolidate the existing engine (2026-10-25, local)

This bounded goal applied `$simplify-and-consolidate` to the six reviewed areas and completed
the named C3 dependency audit. All seven gates are verified locally. Existing S/B/C1/C2 work
remains complete; this work does not restart their migrations. Publication is separate.

| Gate | Bounded deliverable | Completion conditions | Status |
| --- | --- | --- | --- |
| G1 Scene sources | One resolved scene bundle/identity contract for folder, catalogue and demo sources | Ordinary preview, validation and private Play use common assembly; duplicate factory lookup/signature branches removed; source identities and pending source roundtrips preserved | Complete |
| G2 Interactions | Shared resolved uses/exits and their presentation | Prompts, popups and execution read common moving positions, prices and labels; execution rechecks permission/eligibility; cross-owner interactions, purchases and moving popup anchors pass | Complete |
| G3 World geometry | Shared connected placements, route envelopes and source views | Runtime residency, sequence preparation and editor preview use the common pure spatial calculations; loading policies remain explicit; native boundary continuity and workspace alignment pass | Complete |
| G4 Context | Explicit compilation and preview inputs at reviewed boundaries | Scene assembly consumes its shared-state/network context explicitly; preview supplies time/weather/light inputs without replacing unrelated global state; retained runtime owners and necessary scoped dependencies are named and verified for isolation | Complete |
| G5 Capabilities | One native-target capability vocabulary and limits | Target forms and validation share operations, placement/reset capabilities and collection limits; valid edits roundtrip; invalid operations and unauthorized resets still reject | Complete |
| G6 C3 artwork | Resolve Mall fronts/escalators, Harbor stalls/ordinary fixtures, ordinary train fittings, and QA/Laundry/Moth/Capsule endpoint-connected bodies | Inventory exact registered candidates; each is extracted to properties/anchors/bindings or verified as intrinsically contextual with its owner named; independently supported pieces pass add/move/duplicate/property-state editing, history/bundle/protected Save/native reload; approved visuals preserved | Complete |
| G7 Closure | Remove obsolete in-scope code and document final ownership | All gates above pass; replacement references/dead paths and stale guidance removed; package TypeScript/homepage build, focused workflow checks, 24 approved images and 84 intro consistency cases pass; final report names retained exceptions | Complete |

Preserve: existing appearance, seeded variation, animation cadence, story/gameplay, permissions,
current save behavior, model-owned simulation, pausing and physical ownership. Game, SceneModel,
GameplaySession, ComposerModel and renderWorldFrame remain the owners. No second renderer,
adapter hierarchy, scheduler, compatibility save bridge, universal schema framework, new campaign
content, campaign playthrough, broad performance project or CI expansion. Publication is separate.

Verification uses current contracts and approved visuals; expectations cannot be regenerated to
hide differences. Read-only inspection is insufficient for authoring completion: exercise pending
source, history/bundles/protected Save and native reload where the gate changes those workflows.
Stop when G1-G7 are verified; record unrelated opportunities without expanding the goal. If a real
product choice blocks a gate, ask with a concrete example while continuing independent gates.

Verified results: package TypeScript and homepage build pass; focused source/interaction,
capability, shared-state, scene-layer/bounds and authoring workflows pass. The 13 independent
fittings pass add/move/duplicate/property and bound visual-input editing, atomic invalid-edit
refusal, history/bundle, protected Save and fresh native source reload. Browser checks confirm
typed inspector edits/undo and private native Play crossing. All 24 approved images are exact;
all 84 intro native/editor lifecycle comparisons pass. No expected images were replaced.

Retained by design: protected demo identities; actual actor/machinery owners; connection-only
wiring; adaptive storey/viewport scenery; synchronous clock/weather scopes for existing schedule
and public-screen readers; editor-wide shared-declaration scopes for protected demo/form
validators. The main source compiler takes declarations/network explicitly, preview lighting is
explicit, and the [handbook](./docs/reference/ENGINE-HANDBOOK.md) names these boundaries. There
is no renderer, adapter hierarchy, scheduler, save-format bridge or copied scalar owner added.

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
No old-format bridge or second renderer was added. The continuous-world package B1–B6 is complete; the bounded C3 audit is included in the consolidation goal above.

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

## Shared artwork preparation and inspection (2026-10-25, local)

Implemented: painting, picking and scene visibility share resolved visibility, clipping, projection
and mobile membership. The existing renderer captures actual submitted artwork and final paint order
for both ordinary and sequence previews. Hidden station actors no longer have hit targets; joined
sources pick equal-area overlaps in paint order. Shared slots reject late submissions. Level bounds
use named edges, and current selection bounds remain distinct from travel envelopes.

The inspector's live **Resolved rendering** disclosure shows authored/resolved placement, effective
clipping, visibility reasons, opacity, depth, paint order, source ownership and resolved scalar
properties. Edits stay in Appearance and timeline controls. Verified: 15 focused checks, unchanged
24/24 current scene rasters, 84/84 intro lifecycle comparisons, real-browser edits/undo/resolved
updates and native boundary Play. Package TypeScript and homepage build pass. No new renderer,
adapter, runtime or save format was introduced. These changes are local, not yet published.

Follow-up cleanup is implemented locally: no-op composition passes removed; character window masks
centralized; helper bounds, region borders and drag transforms captured by the native frame;
inspection no longer re-resolves visual sources. One prepared-command collection replaces the
pending source callbacks plus ordered queue. Explicit foreground draws replace queued commands,
and gallery previews dispose the same collector. Focused checks cover masked hit areas,
mirrored-parent helper dragging, source-free inspection and resolution-free, duplicate-free flushes.

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

| Area | Status | What this means |
| --- | --- | --- |
| Shared gameplay and editor foundation | Implemented | One Game loop, SceneModel, GameplaySession, ConversationSession and canonical state ownership. Folder and catalogue scenes use shared source, pending-document validation, typed editing and private native Play. |
| One render path | Complete | Game, editor, title, cutscenes and taxi use renderWorldFrame; the former opening renderer and artwork wrappers are removed. |
| C1: animation lifecycle and light | Complete | Playback owns animation advancement; seeking reconstructs in isolation; painting/bounds are read-only. Explicit View lighting replaces presentation reads of global light; unused citySkyline is removed. |
| C2: transport consolidation | Complete | Regular train, P14 siding, Downtown, Galleria and Harbor use shared vehicles, movers, floors, seats and passenger flows. Old boarding cuts, platform clocks and replacement crowds are removed. |
| C3: independent artwork placement | Complete for the named audit | 13 further types have independent inputs; existing ordinary fixtures/fittings are verified. Connection-only rows, prepared actors, adaptive scenery and physical machinery retain explicit context. See G6 and the exact artwork inventory. |
| Continuous world across chunks | Complete | B1–B6 and the boundary-artwork follow-up below are verified: mobile lifetime, clipping, prepared bounds, shared layers and sky coordinates use the real engine. |
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

1. **Review M3's experience**, using the [prologue review guide](./docs/design/PROLOGUE-REVIEW-GUIDE.md) and frames/scenes: does the boss guide without rushing,
   does travel read as one journey, and does home give breathing room? Mechanical verification
   belongs to agents; Tommi's feedback concerns clarity, appeal, pacing and editor comfort.
2. **Build M4**, then M5 and M6 using the progression table below. Introduce each mechanic through
   an actual gameplay need, shared source, typed authoring, a compact demo and a real scene.
   Keep Test District examples immediately reachable and free of unrelated clutter.
3. **Continue Downtown sets in parallel.** Their artwork/layout can evolve before gameplay is
   attached. The precinct's required versus optional role remains undecided.
4. **Prototype later embodiment/remote mechanics when needed.** Before M7 settle body location,
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
| B2. Mobile ownership | Existing people/vehicle systems own live identity, progress and attachments independently of the spawn chunk. Cross and return without reset, duplication or disappearance, including when the origin leaves the loaded view. Authored spawn/sink rules remain explicit. | Complete; audited moving-artwork follow-up fixed |
| B3. Visibility and bounds | Logical chunk bounds differ from visual bounds and explicit clips. Overhanging artwork remains visible while its actual bounds intersect the frame. Foreground occlusion is deliberate; a seam never clips a person by itself. | Complete; flock clipping and live prepared bounds fixed |
| B4. Shared layers/background | Cross-chunk mobiles and static pieces share correct depth/order; background continuity survives view movement. Preserve interiors and existing approved art. | Complete; stable sky coordinates and independent Ring lanes verified |
| B5. Editor contracts | Existing editor exposes logical bounds versus explicit clip/occluder geometry and mobile spawn/routes/sinks/current location. Pending sources, typed editing, undo/redo, bundles, protected Save and native Play agree. No second evaluator or renderer. | Complete |
| B6. Real-scene application and cleanup | Apply verified contracts to opening/prologue; remove replaced scene-local lifetime/clipping workarounds. Verify travel, pause/seek, re-entry and visible boundary behavior. | Complete; prologue flocks fixed and five redundant train copies removed |

Acceptance verified on 2026-10-24 against the current sources: 16 focused checks pass, including
exact real-model/session detach/reattach and cleanup, current checkpoints, cross/return, actual
Harbor rider carry through four tunnel zones, alighting and passengers climbing into Downtown.
Overhangs and explicit clips use registered bounds; joined commands sort across source chunks.
Typed route/clip browser edits drive private native Play. History, bundles, protected scratch
Save/undo and fresh native compilation agree; invalid pending routes reject atomically.

Visual preservation: 24/24 approved current scene images match exactly; 84/84 opening seek,
pause/resume, resize and reduced-motion comparisons pass. Expectations were not replaced. Native
browser checks cover player cross/return, direct Test District navigation and unloaded mobile-core
pause/resume. Package TypeScript and both builds pass. The build retains its existing large-chunk
advisory. The [boundary review guide](./docs/design/BOUNDARY-EXAMPLE.md) links the relevant examples.

Traffic follow-up from visual review: the opening's procedural road strips were missed by the
mobile classification and remained clipped background rows. They now use mobile route/window
bounds, disjoint whole-vehicle ownership windows, separate far/near Playfield rows and a corridor
through Harbor Station to an off-screen sink. Turning traffic retains explicit mouth/portal
occlusion. `title-traffic` samples all six chunks for unique vehicle ownership and exact poses.
Native Opening frames at Downtown, Galleria and Harbor were inspected before/after this correction.

The implementation retains the existing Game loop, SceneModel/Circuit, GameplaySession and
renderWorldFrame. Replaced vehicle-origin scenery pinning, fixed opening visibility margin and
obsolete per-document layer-flush helpers are removed. Stable source identity does not imply
scenery residency. Current-format checkpoints remain validated; no historic save adapter was added.
Campaign/story redesign, new chapters, city-wide simulation and unrelated artwork changes are
excluded. B2–B6 were authorized together on 2026-10-24. The B2–B6 release is on main and production; the boundary artwork follow-up is included in the 2026-10-25 release. Mechanics are agent-verified; user review concerns readability and comfort.

### Boundary artwork follow-up (2026-10-25)

All six audited constructions are corrected. This closes the bounded follow-up; it does
not create new seams for the original Harbor, Stacks or Beach, which remain unjoined scenes.

| Construction | Resolution | Verification |
| --- | --- | --- |
| Prologue gull flocks | Registered mobile sources, live bird bounds and full parallax travel envelopes. Chunk edges do not mask birds; explicit wrapping remains intentional. | Quay/Yard mobile classification and no implicit clip; shared native renderer/editor checks. |
| Prepared roaming actors | Selection bounds follow the actual native pose, including depth and rider offsets. Movement/following membership and full travel extents derive from scene.actors, with attachment closure. Static window occupants retain their masks. | 1,325 pose/camera samples, including 602 mobile samples, pass; the original 98 out-of-bounds actors now yield zero failures. |
| Playable sky ships | The sky pass uses the shared backdrop's world camera, independently of the active chunk. | Native Station/Quay seam gives camera 14,190 on both sides at the same world position. |
| Ring highway traffic | Road structure, independent far/near traffic and front barriers are ordered across sources. Vehicle-centre ownership never clips bodies. Lamps have one span owner. Traffic/front fittings attach to the road origin; real portals remain occluders. The embedded composition traffic option is removed. | 25 native camera/time comparisons match one continuous road exactly; previously two samples differed by 583/585 vehicle-area pixels. Focused ownership checks find no missing or duplicated vehicle. |
| Old arrival-train artwork | Removed five redundant opening train placements. The live service remains the existing vehicle frame; static library/proposal trains remain available. | Nine native Opening captures are pixel-identical before/after removal at 19, 26, 35, 44, 50, 55, 60, 62.7 and 64.5 seconds. |
| Legacy port motion | Harbor ferry, patrol, forklift parts, flocks and drone gull, Stacks' straddle and Beach flocks use registered mobility and explicit full travel envelopes. Fixed cranes/architecture keep their current ownership. | Registered metadata and source compilation checks pass. No new city connections or simulation are introduced. |

The street-truck correction above is included. The existing Game/SceneModel lifecycle and sole
renderWorldFrame path remain authoritative. Windows, interiors, portal masks and physical part
occlusion are preserved. The stale signage isolation fixture now reads current trainVisualState
rather than importing the removed platformTrain function.

Validation: 13 focused checks, package TypeScript and homepage build pass; 24/24 approved scene
images remain exact, and 84/84 native/editor opening lifecycle comparisons pass. No expected
images were replaced. Publication targets are main and production; deployment is verified separately after push.

## C3 supported contracts

The completed bounded C3 inventory is owned by G6 above; detailed type-by-type results live in
[artwork authoring](./docs/reference/ARTWORK-ROLE-AUTHORING.md). The Library retains Reusable
anywhere / Requires source context / Scene helpers. No new taxonomy or second engine is introduced.

This batch makes 13 additional registered types independently placeable: eight Mall local fittings,
two Harbor stalls, Moth's monitor/router shelf and Capsule's plug. Their native sources bind only
required dimensions, optional prepared vendors, supports or cable endpoints. The existing ordinary
Train, Harbor, QA and Laundry bodies are audited alongside them. Connection-only wires, prepared
actors, adaptive storey/frame scenery and actual physical machinery retain named owners.

Verified completion includes real add/move/duplicate/property/visual-input editing, invalid-edit refusal,
undo/redo, bundle export, protected Save and native reload, plus approved visual preservation.
That certifies these supported contracts, not universal portability of every registered artwork.
Do not restart completed extractions because an intentionally contextual primitive remains.

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

- This file owns completed G1–G7 and C1–C4 status, M1–M9 priorities and next-work order.
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
