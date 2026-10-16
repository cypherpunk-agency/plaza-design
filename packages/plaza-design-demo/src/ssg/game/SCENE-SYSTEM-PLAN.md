# Unified artwork library, scene composer and animated scene composer

Status: S0-S7/G1-G8 and the authorized S8-S13/F1-F6 stretch goal are complete within their frozen inventories. Updated 2026-10-16.
This is a separate engineering track alongside ROADMAP.md. It does not implement or renumber
story milestones. Execution was subsequently authorized as a persistent goal; publication is
excluded. Verified batches and remaining work are recorded in SCENE-SYSTEM-STATUS.md.

## Executable goal condition

Complete only when ALL gates G1-G8 pass with recorded evidence:

| Gate | Required result |
| --- | --- |
| G1 Coverage | Every existing world drawing implementation has an inventoried library destination; no unresolved exclusions |
| G2 Separation | No Downtown-specific drawing in game.ts; no inline world drawing in scene definitions, rules or state adapters |
| G3 Documents | All registered scenes, including sandbox and harborShift, have validated, versioned, serializable compositions with stable instance ids |
| G4 Contracts | Elements expose typed properties, visual state, bounds, anchors and ordered drawing parts, with matching editor metadata |
| G5 Pixel identity | Every baseline render case has zero differing pixels under identical inputs and environment; existing animation timing is preserved |
| G6 Behavior | Existing saves, interaction coordinates, exits, platforms, devices, discovery/access rules and sequence handoffs retain their behavior |
| G7 Composer | Local static and animated scene composers use the game renderer, round-trip documents, support the operations below and integrate with the world/map registry |
| G8 Delivery | Both builds pass, coverage and evidence ledgers are complete, authoring instructions are updated and no migration-only rendering path remains |

Do not substitute visual similarity for pixel identity or claim completion with missing evidence.
The harbor/tutorial prop redesign is a subsequent task, using the resulting contracts.

## Accepted execution decisions (2026-10-16)

- Pixel identity is mandatory within the pinned comparison environment. If reproducing an
  existing effect requires an appearance change, stop that migration, preserve the last verified
  version and report the blocker. Continue independent work where safe; never relax parity.
- The first world/map panel is read-only for geography, place membership, transport and gameplay
  connections. It selects places and opens scenes. World-structure editing is a later task.
- Direct local Save to source documents is required, with validation, undo and external-change
  conflict protection. Download/import alone does not satisfy the composer goal.
- Preserve and record the accepted starting working tree, including uncommitted quieter goal
  guidance. Each verified migration batch needs a recoverable checkpoint before continuing.
- Bring material scope changes or deviations from these decisions back to the user. Routine
  implementation choices within the contracts do not need additional approval.
- Include repository organization requested during execution: scene-owned bundles belong under
  scenes/, and root-level implementation files are grouped by responsibility. File organization
  must preserve module behavior, save keys, scene/device ids and virtual terminal paths.

## Scope

Include architecture, surfaces, furniture, props, machinery, electronics, signs, characters,
vehicles, scenery, lighting and weather, even when an element appears only once. Include world
art used by title/glide, travel and cutscenes. Keep their sequencing in controllers.

HUD, menus, dialogue, board/network/map UI and editor overlays remain interface rendering.
Explicitly classify these boundaries in the inventory. Shared world art shown by an interface
still comes from the library. Rendering orchestration may remain in game.ts.

Preserve scene/device/exit ids, saves, progression, collision, drawing order, algorithms, seeds,
colors and timings. No story expansion, prop redesign, campaign playthrough, broad regression
suite, CI expansion or publishing. Use bounded fixtures and focused checks for this migration.
The editor is a local development tool. Cloud storage, collaboration, arbitrary script editing,
quest-rule authoring, skeletal-animation authoring and geographic street editing are excluded.
Animated scene composition and timeline editing ARE included.

## System design

Runtime -> composition + typed state adapter -> shared renderer -> artwork library.
Editor -> same composition + preview state -> same renderer, with separate editing overlays.

### Game directory and logic ownership

Keep index.ts as the public integration entry. Group implementation by responsibility:

| Directory | Owns |
| --- | --- |
| runtime/ | Game orchestration, input/camera, launch modes, save/slots, audio and actor controllers |
| scenes/ | Every scene's definition, composition, local devices, custom rules, interactions and visual-state adapter |
| engine/ | Reusable noun/verb execution, wiring, guards, clocks, rule contracts and engine-specific interface components |
| art/ | All world drawing, specialized kits, elements and assemblies; no save or progression ownership |
| world/ | City/place registry, geography, transport, city clock, weather, lighting calculations and network topology |
| story/ | Cross-scene progression, opening, contacts and sequence controllers/timeline documents |
| ui/ | Menus, HUD, keybar, terminal, map views, task guidance and developer transport controls |
| authoring/ | Local scene/timeline editor and development-only save integration |
| data/ | Shared authoring schemas, validation and global data registries; scene-specific JSON moves beside its scene |
| docs/ | Design/reference documents, migration ledgers and historical archive; root README/CLAUDE remain navigation entry points |

Use one folder per scene, including simple scenes; do not create empty rules/dialogue files for
scenes that do not need them. A typical scene package contains index.ts (definition),
composition.json, devices.json where needed, rules.ts, visual-state.ts and optional local
interactions/dialogue modules. Existing top-level capsule, downtown, yard, Moth, laundromat,
library, beach, stacks and sandbox bundles move under scenes/, alongside the currently flat
scene modules. Read-only map navigation still uses their stable scene ids.

Separate three kinds of logic by ownership, not by creating one general logic/ dumping ground:

1. Engine mechanisms: reusable execution of verbs, wires, state transitions, guards and timers.
2. Scene rules: what a particular washer, crane, door or local interaction does. They use engine
   contracts and explicit player/world services, with no canvas drawing or editor implementation.
3. Story/world rules: prerequisites, discovery, travel access and cross-scene progression. These
   stay in story/world modules; scenes refer to named rules or explicit services.

Expose scene packages through their public definitions/contracts. Avoid importing another scene's
internal rules or using a scene-specific player interface as the engine-wide service contract.
Move the current shared dependency on Downtown's Player type to a neutral runtime contract
without changing its capabilities. Art receives visual snapshots rather than calling scene rules.
Scene adapters bind serialized ids/markers to typed behavior. Preserve the existing data-driven
rules format and custom effects; a scripting-language redesign is outside scope.

Split the mixed responsibilities of level.ts: save/mode helpers to runtime, Downtown layout and
dialogue to its scene/art definitions, and terminal command handling to ui with explicit services.
Likewise separate title/cutscene artwork from their story controllers before relocating them.
Maintain explicit import boundaries; a focused dependency check should reject world drawing
outside art/ and runtime imports of authoring code. Interface drawing is classified separately.

Record old-to-new paths and public entry points in a directory map. Apply moves in bounded,
recoverable batches and prove unchanged function bodies/data plus pixel/behavior parity.
Update build tooling, fixture resolution, documentation links and source-path metadata together.

### One library, specialized kits

Create game/art/ with core/, architecture/, surfaces/, furniture/, props/, machinery/,
electronics/, signage/, characters/, vehicles/, environment/, atmosphere/ and assemblies/.
Move existing kits into this system, avoiding competing implementations. Categorize by what
an element is, not the scene that uses it. Unique elements receive specific names and catalog
entries. Track temporary import re-exports and remove migration-only ones before completion.

Consolidate primitives/materials, placement transforms, deterministic variation, attachment
handling, selection, property validation and render context. Preserve specialized construction:
building storeys, stall merchandise/awning/vendor placement, character poses, crane cables and
loads, train doors/couplings, room cutaways and water/reflections. One contract does not imply
one universal renderer. Consolidate equivalent helpers only after proving identical output.

### Element and assembly contract

- Stable element type, schema version and catalog description.
- Typed appearance properties: defaults, units, ranges, validation and editor controls.
- Placement: local position, scale, facing, parallax, pass and explicit sibling order.
- Bounds/selection geometry and declared dynamic extents.
- Named anchors: position, orientation and role (surface, mount, handle, entrance).
- Typed visual state such as powered, open, loaded and clampEngaged.
- Explicit viewport, camera, clock, seeded variation, lighting and weather inputs.
- Named drawing parts for interleaving background, interior, foreground and devices. Preserve
  hack-vision passes and characters drawn between assembly parts.

An assembly groups children around a shared origin and exposes anchors and child overrides.
Moving it keeps its parts aligned. A whole-scene wrapper is acceptable during extraction but
not as the final editable composition: independently placeable furniture, architecture, props
and machines must become addressable instances/children. Screws, pixels and individual book
spines can remain procedural details inside an element.

Artwork cannot read/write saves, award items, own DOM UI or advance simulation. State adapters
map gameplay to visual state without drawing. Rendering does not mutate simulation state.

### Code-rendered art, environment and animation ownership

Code-rendered pieces are first-class library elements, not assets that must be rasterized.
Retain the existing Canvas 2D renderer. Its gradients, alpha, shadows and multiply/screen/additive
blending are existing effects, not custom GPU shaders. WebGL/shader conversion and replacing
art with bitmaps are outside this migration. Future image/sprite-sheet elements may use the same
placement/state/environment contract; importing assets is not required for this goal.

Use one explicit environment context: city day/time, scene facing, sun/moon, daylight and color
grade, local lights/shadows, weather/wind/wetness and shelter coverage, plus reduced motion.
Preserve existing window-light schedules, sky/water colors, reflections, rain, fog, smog,
lightning and heat effects. Some are element responses and some scene-wide passes; preserve
their original order. Editor previews expose these inputs without changing live game state.
Include day/night, weather, shelter, local-light and reduced-motion cases in the parity manifest.

Animation ownership has three explicit forms:

- Ambient kit animation: waves, rain, flicker and idle loops. Kits implement them from controlled
  clocks/seeds; the composer configures, freezes and steps them without keyframing every detail.
- Gameplay-driven animation: doors, equipment, movement and carried objects. Typed state/action
  adapters drive visual clips; preview fixtures simulate them without performing gameplay effects.
- Authored sequences: shots, camera tracks, entrances, text cards and transitions are authored
  on timeline documents using the same elements and environmental rendering.

Do not flatten these into one timeline or reset ambient phase accidentally on a shot boundary.
All three forms need deterministic preview and must retain current runtime timing and appearance.

### Serializable composition

Use validated versioned JSON-compatible documents containing scene ids, instance ids, element
types, properties, transforms, attachments, order and typed binding references. Do not serialize
functions or arbitrary expressions. Define explicit document migrations. Reject unknown types,
invalid properties, dangling references and attachment cycles with actionable errors.

Gameplay stays in TypeScript: dialogue, uses, exits, goals, devices and rules. Documents place
named interaction/exit/platform markers; adapters bind them to existing behavior. Anchors replace
duplicated coordinates incrementally. Visual bounds do not imply collision geometry. Preserve
stable gameplay ids. Failed imports or edits keep the previous valid document intact.

### Static scene composer

Use the actual game renderer, fonts, scaling, camera transforms, parallax, lighting, weather,
animation and hack-vision passes. Add selection handles in a separate overlay pass.

Required operations: scene selector, catalog, hierarchy/layers, select, drag, numeric transforms,
typed property editing, duplicate/delete, attachment/anchor tools, marker placement, undo/redo,
dirty-state indication and validated import/export. Gameplay-bound elements cannot be deleted
without resolving their references. Parallax editing must use the correct layer transform.
Provide frozen/stepped preview time and explicit state fixtures without touching real saves.

Provide a local Save action that writes validated composition/timeline documents to their source
files. Keep import/export as additional operations. The game consumes those exact documents
without hand translation. Unsaved edits stay in the editor until Save is invoked.

The local write service binds to loopback, restricts requests to its editor origin/session and
allowlisted document roots, and resolves paths to prevent writes outside those roots. It is
excluded from production builds. Compare the loaded file revision/hash at save time; on external
changes, refuse to overwrite and offer reload or export of the pending edits. Validate before
writing and replace atomically so failed writes preserve the original. Mark saved only after
confirmed success. Undo remains usable after Save; undoing a saved edit makes the document dirty
and saving again writes the reverted version. Warn before discarding unsaved work.

Acceptance includes save/reload, undo/save/reload, malformed documents, external-edit conflicts,
failed writes and path restrictions. Check multi-document references before saving an edit;
do not leave partially updated references if a grouped save fails.

### Animated scene composer

Use the same registry, elements, compositions and renderer. Add versioned timeline documents,
not a separate cinematic art pipeline. Inventory every existing animated presentation, including
intro/glide and Act II cutscene, rather than assuming only one sequence exists in code.

Required capabilities:

- Multiple sequences with stable ids, duration, shots and composition references.
- Play/pause, frame stepping, scrub, loop range and timecode.
- Keyframes for camera position/zoom, instance transforms, visibility, opacity and explicitly
  animatable kit properties; discrete visual states and named animation clips.
- Explicit easing/interpolation; registered typed motion tracks for existing custom paths where
  approximation by keyframes would change pixels. No executable code embedded in documents.
- Text cards, fades, transitions, named beats, reduced-motion previews and handoff destinations.
- Attachment-aware motion, keyframe editing, undo/redo and validated timeline import/export.
- Separate decorative animation, sequence time and pausable simulation clocks.

Seeking must not award items, write saves or trigger gameplay events. Runtime skip/completion
commits a handoff exactly once; seeking never completes a sequence. For frame-dependent legacy
effects, preserve seeded initial state and replay the original fixed-step simulation/input
schedule, optionally with checkpoints. Do not replace motion formulas for convenience. Moving
mutation out of drawing must preserve update order and original output.

Acceptance: existing sequences match original frames throughout their duration, including
boundaries, fades and text timing. Direct, forward and backward seeking to the same frame yields
identical pixels. Pause/resume, skip, completion and reduced motion preserve current behavior.
Author at least two temporary multi-shot sequences with shared elements, including an attached
moving object and text card. Round-trip and play them through the runtime without adding them
to the shipping story. The composer must support new sequences, not only edit a hard-coded intro.

## World/map integration

Current code: city.ts owns districts, places, scene membership, map positions, transport links,
discovery and access rules. cityplan.ts produces deterministic geographic geometry. citymap.ts
implements custom projection, drawing, input and cached backgrounds; it already reuses some
landmark artwork. Its street plan is not generated from the side-view scene layouts.

Keep the map as a specialized view of the same world registry. Preserve geography and map
appearance. Do not infer map distances from scene widths or generate top-down buildings from
side-view placements. Map coordinates, scene coordinates and sequence-camera coordinates are
separate spaces connected by stable references.

Provide a validated world manifest/adapter connecting district -> place -> scene composition,
entry scene/exit, map position, transport links and sequence references. Start by adapting the
existing city.ts data, not duplicating it. Named typed rules retain discovery and access behavior;
the editor previews their states. Decorative map buildings do not become enterable scenes.
Shared landmark visuals come from art/; projection, map symbols/labels and input stay in map UI.

Required composer world/map panel: select a place using the actual map, open its scenes and
inspect membership, map position, transport and exit connections without editing them. Preview
known/unknown/blocked/accessible states through the real rules. Local placement of existing
interaction/exit/platform markers remains editable, with visible attachment relationships and
validation; their gameplay ids, destination links and behavior remain unchanged. Timeline
authoring may select a valid existing scene/entrance as a sequence handoff without rewiring
the world's existing connections. Preserve all shipping sequence destinations during migration.
Validate ids, destinations, membership, map bounds/land/district constraints and rule references.
Preserve deliberate one-way connections. New or hidden scenes must not become accessible merely
because they have an editor entry.

Acceptance: current membership, map pins, travel, exits, discovery and locks remain equivalent;
fixed-state map images are pixel-identical. Verify selection opens the correct scene and that
world structure cannot be edited through the first composer. Round-trip a temporary local marker
placement edit, verify runtime placement and unchanged destination, then restore shipping data.
Sequence handoff and skip resolve a valid destination once. Editing world membership, map pins,
transport links, exit destinations or geographic street generation is outside this goal.

## Execution milestones

Run in order. On implementation start create SCENE-SYSTEM-STATUS.md with per-gate status,
coverage inventory and links to evidence. Preserve unrelated local work, including task guidance.
Before each batch, retain a recoverable source checkpoint and its baseline/evidence references.
Do not reset or discard pre-existing user changes to create a clean baseline. A failed batch
must be reversible independently of already verified batches and unrelated work.

| Milestone | Work | Exit condition |
| --- | --- | --- |
| S0 Baseline and inventory | Inventory every drawing owner, consumers, state dependencies, passes and proposed destinations; classify interface exclusions; capture original renders and animation schedules | Every scene/drawing owner accounted for; original baseline reproducible before moving code |
| S1 Common contract | Implement registry, document schemas, render context, transforms, anchors, drawing parts and metadata; adapt a simple element and multi-part assembly | Both render identically from validated data; round-trip and invalid-reference checks pass |
| S2 Downtown extraction | Move Downtown skyline/fronts/windows/bays, alley, doors, stall, street and other Downtown-only art out of game.ts without changing algorithms or layout | Downtown pixel comparisons and focused entrance/platform/device checks pass; no Downtown drawing remains in game.ts |
| S3 Existing kits | Consolidate build/kit/screens, sets, characters and vehicles into art/; move shared scene exports such as harbor backdrop/gull; separate controllers from drawing | One implementation per shared element; affected baselines pass; adapters tracked |
| S3b Directory and logic organization | Consolidate scene packages under scenes/; group root modules into runtime/world/story/ui; colocate scene data; split level.ts and neutralize shared services; organize docs and update all consumers | Directory map and import boundaries verified; stable ids/saves/virtual paths and current rendering/behavior preserved; no legacy facade kept solely to hide an incomplete move |
| S4 Remaining artwork | Extract inline and local scene art in bounded batches; include animated presentation art; split temporary scene wrappers into useful assemblies | G1/G2 pass; every batch has pixel and focused behavior evidence |
| S5 Editable compositions | Externalize all placements/properties, typed bindings and markers; replace duplicated coordinates with anchors; migrate world/sequence references without changing rules | G3/G4 pass across all registered scenes and sequences; round-trip and parity checks pass |
| S6 Composer | Build static editing, animated timelines and world/map panel with the shared renderer; prove temporary edits through the runtime and restore shipping data | All static, animation and map acceptance cases pass; saving workflow documented; player saves untouched |
| S7 Final verification | Reconcile inventory, remove migration-only paths, run complete bounded comparison manifest and focused checks, update authoring docs and build | G1-G8 all pass with linked evidence and no required open work |

Suggested S4 batches: harbor/tutorial/warehouse/stacks; market/shop/mall; capsule/Moth;
library/laundromat/yard; beach/stations/trains/remaining scenes; title/travel/cutscenes.
The complete inventory determines coverage, not this illustrative grouping.

S6 must demonstrate independently editing an architectural assembly, stall, character,
stateful machine, multi-pass device, anchor attachment, parallax object and gameplay marker.
Undo/redo and import/export must restore exact document data. Verify game/editor pixels match
with editor overlays disabled. Completing static editing alone does not satisfy S6.
Direct local Save and its conflict/failure checks are mandatory for the S6 exit condition;
export/import alone is insufficient. The world/map panel's editing limits are also mandatory.

## Pixel-identity evidence: hard requirement

Capture baseline BEFORE refactoring, pinned to the exact source revision AND local diff.
Store baseline assets outside generated build output and never regenerate them from migrated
code. Record browser/version, fonts, viewport/DPR, camera, seeds, time, weather, visual/gameplay
state and input/update schedule in a machine-readable render-case manifest.
Pixel identity is asserted in this pinned environment, not between different browser versions,
operating systems or machines. Functional browser portability is separate from that assertion.

Cover every scene across its full width with overlapping views, representative small landscape
viewports, distinct scene states, open/closed doors, carried objects, device states, normal/hack
vision and foreground overlaps. Capture existing sequences across their duration with boundary
frames, animation phases, fades and reduced motion. Include fixed map states affected by shared
asset extraction. A few attractive screenshots are not sufficient coverage.

Require zero differing pixels for each case. Store before/after/diff images and numeric results.
First establish that the original baseline reproduces itself. If not, pin environment and replay
inputs until it does. Do not use tolerances, masks, changed baselines or visual approval as a
substitute. A non-reproducible case remains incomplete and blocks the parity gate. Inspect frame
sequences as well as sampled stills to detect changed timing. No silent aesthetic improvements.
If an effect cannot be migrated without changing appearance, stop that affected migration and
report the exact cause and evidence to the user. Never approve an exception automatically or
allow dependent work to obscure the mismatch; safe independent batches may continue.

Use focused fixtures for interaction reachability, anchor positions, exits, platforms, devices,
old-save compatibility, animation pause/resume and handoffs. These are not a campaign playthrough
or proof of player comprehension. Run pnpm build:homepage and pnpm build:design-demo at relevant
integration gates and final delivery, plus git diff --check. Add only checks necessary for this
bounded migration; broad regression/CI work remains outside scope.

If a gate is blocked, record missing evidence and continue safe independent work; do not report
the overall goal complete. Final handoff includes source changes, editor access, catalog/authoring
instructions, updated README/GAME-DATA/ART-GUIDE/agent guidance, and the evidence ledger.

## Ready-to-use future goal instruction

> Execute SCENE-SYSTEM-PLAN.md S0-S7 and achieve G1-G8. Consolidate all existing world artwork
> into one library; remove Downtown drawing from game.ts and inline drawing from scenes;
> preserve pixel identity and gameplay; deliver validated scene/timeline/world documents and
> local static and animated scene composers using the game renderer, direct local saving with
> conflict protection, and read-only world/map navigation. Preserve recoverable checkpoints.
> Maintain the coverage and evidence ledger. Require zero-pixel-difference comparisons. Do not
> redesign props, expand the story, run a campaign playthrough, add CI or publish. Finish only
> when every required gate has evidence.

## Follow-on roadmap: asset workbenches and scene behavior

Requested and authorized as the new S8-S13/F1-F6 goal on 2026-10-16, after S0-S7/G1-G8
acceptance and publication of `d619294` to main. These extend that completed delivery;
they do not reopen its acceptance. Each milestone has a separately frozen finite inventory
and evidence gate. See SCENE-SYSTEM-STATUS.md for actual progress. The story roadmap remains
independent and all content design remains open. F1-F6 now pass; acceptance manifests, source
pins and bounded evidence are recorded in SCENE-SYSTEM-STATUS.md and the stretch evidence ledger.
No further publication is authorized by this goal.

Use one composer shell with focused sub-screens, one shared catalog and the actual game
renderers. Avoid separate implementations of character, vehicle, sign or building artwork.
Start with viewing and inspection; authoring is required only where explicitly listed below.

| Milestone | Deliverable | Exit gate |
| --- | --- | --- |
| S8 Asset browser and composition inspector | Search/filter by asset family and tags; isolated previews; inspect a complex assembly, its children, anchors, passes and scene usages; open its source scene | F1: every asset in the frozen catalog inventory is discoverable, has an honest preview/support status and stable reference; selecting a usage opens the correct instance; assembly and scene previews agree |
| S9 Character workbench | Humans, animals and robots; appearance variants; supported animation states and actions; deterministic playback, pause, step, seek, loop and reduced-motion preview | F2: the supported class/variant/action matrix is documented and covered; representative transitions and held/carried props match runtime; scrubbing/replay reproduces the same poses without advancing the game |
| S10 Vehicle workbench | Ground vehicles, flying vehicles and boats; supported movement/animation states and attachments; consistent preview routes and camera controls | F3: every inventoried vehicle family has a runtime-equivalent preview; supported route, facing, speed and passenger/cargo states are reproducible; unsupported combinations are visibly unavailable |
| S11 Signs, lighting and architecture workbench | Browse signs, neon, screens, buildings and embedded architectural assemblies; preview existing typed variants, text, lighting and environment responses | F4: all inventoried families have previews using their actual drawing parts; supported day/night, weather, power and animation states agree with runtime, including overlaps and illumination; no source edits are needed for viewing |
| S12 Scene event and connection inspector | Read-only view of scripted events, triggers, conditions, actions, targets, sequence handoffs and existing connections; selection links graph, scene and source | F5: every event/connection in the frozen scene inventory is represented or explicitly identified as opaque controller code; actual ids and runtime conditions are used; inactive, blocked and missing references are distinguishable; inspection has no game-state side effects |
| S13 Scoped behavior authoring | Edit a bounded, typed set of existing declarative triggers, conditions, actions and connections; safe sandbox preview and direct local Save | F6: the agreed supported-rule inventory round-trips through source and runtime, validates before saving, supports undo/redo and conflicts, and rejects invalid references and unsupported rule edits; no arbitrary code execution |

### Common contracts and evidence for F1-F6

At the start of each milestone, freeze its finite asset/scene inventory, supported state matrix,
operations and explicit exclusions in SCENE-SYSTEM-STATUS.md. Record unsupported runtime
capabilities rather than inventing actions to fill a category. New content does not silently
expand an in-progress goal. Report completion only against that inventory with linked evidence.

Viewers use explicit preview snapshots: seed, time, lighting, weather, camera, relevant visual
state and prepared animation/behavior inputs. Controllers prepare these inputs using the same
logic as the game. Inspecting a character's schedule or a vehicle's route must not run live
quests, grant rewards, change player saves or mutate the active world. Keep procedural motion,
environment-sensitive effects and any existing shader/render passes in the shared render path.
Do not add a second animation engine or shader implementation for the workbenches.

For viewing-only milestones, preserve source files and use controlled temporary preview
overrides. Existing artwork must remain pixel-identical under matching inputs; pin comparison
cases and retain source revision, environment and numeric results. For new preview controls,
prove the selected state reaches the real renderer and replays deterministically. Do not claim
every theoretical state combination has been tested: record the bounded matrix explicitly.

Any later property editing reuses typed properties, validation, undo/redo, import/export and
direct local Save conflict/recovery protections from S6. An edit must change the corresponding
runtime instance after reload. Restore shipping data after acceptance fixtures. These milestones
do not authorize art redesign, story changes, publication or world-geography editing.

### Complex compositions

Inspect the existing group/child/anchor relationships first, including inherited transforms,
visibility, pass order and embedded attachments. Make repeated versus scene-specific uses
visible. A reusable composition asset referenced by other documents is a further schema feature,
not something to assume already exists. Before enabling that authoring, specify stable ids,
dependency and cycle validation, version/migration rules, instance overrides and whether an edit
affects one placement or every use. Show affected usages before saving a shared definition.
Do not convert existing assemblies merely to populate the browser.

### Behavior authoring boundary

S12 inspects both declarative data and controller-owned behavior. Opaque code appears with a
source link and an explanation; a visual graph must not imply it can safely edit arbitrary
TypeScript. Distinguish spatial attachments, physical travel connections, event subscriptions
and conditional actions. Use actual runtime references, not a second manually maintained graph.

Before S13 implementation, select a small concrete scene/rule inventory and document evaluation
order, one-shot/repeat semantics, persistence, entry/exit behavior and failure recovery. Expose
only registered typed conditions/actions. Validate targets, destinations and required inputs;
diagnose unsafe loops or repeated side effects according to those semantics. Sandbox runs need
resettable state and a trace of trigger -> condition -> action -> result. Verify reload/resume
and exactly-once effects where required. Keep unrelated rules and player saves unchanged.

S13 is the separately authorized extension beyond S0-S7's exclusion of quest-rule
authoring, bounded by `authoring/inventories/S13.json`. World membership, geographic layout, map pins and transport topology remain outside
scope unless a future goal explicitly includes them. A scene connection inspector does not
implicitly authorize rewriting the game map.

### Ready-to-use follow-on goal instruction

> After S0-S7/G1-G8 are complete, execute only the explicitly selected milestone(s) S8-S13.
> Freeze the finite coverage inventory and supported operations before implementation. Achieve
> the corresponding F1-F6 gates with runtime-equivalent rendering, deterministic isolated
> previews and recorded evidence. Keep viewing-only milestones read-only; use the existing
> validated authoring/save workflow wherever editing is explicitly in scope. Preserve shipping
> appearance and behavior. Do not implement later milestones, redesign content or publish.
