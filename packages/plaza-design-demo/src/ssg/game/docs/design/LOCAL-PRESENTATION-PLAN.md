# Location and sequence configuration: implementation plan and goal conditions

Authorized 2026-10-28. [ROADMAP.md](../../ROADMAP.md) owns status and priority.
The user authorized running L1–L5 as a goal after reviewing this plan. Publishing is excluded.
Completed locally 2026-10-28; see [coverage and acceptance](./LOCAL-PRESENTATION-PROGRESS.md)
for the eight outcomes, scope counts, preservation evidence and measured limitations.

## Outcome and scope

An author can inspect and edit every existing setting that intentionally differs between
districts, chunks, compositions or sequences, including switches that enable or disable effects.
The inspector shows the effective value, its source and any override. Selecting a sequence does
not silently install another set of rendering defaults.

Shared behavior that is identical everywhere can remain in code. This is not a project to expose
every numeric literal, rewrite procedural drawing algorithms or build a general engine settings UI.

The confirmed starting families are:

| Family | Authorable differences | Shared implementation that can remain code |
| --- | --- | --- |
| Rendering | Applicable sky, weather, shadow/caster, grading, light, actor and presentation switches | Pass implementation, ordering and compositing algorithms |
| Lighting and grading | Existing local tints, strengths, exposure-like adjustments, facing and indoor/outdoor treatment | Common daylight, twilight and moonlight calculations |
| Climate | District weights, locally fixed weather and roofed/weather-excluded places | Forecast algorithm, shared block/transition mechanics and deterministic sampling |
| Camera | Existing local framing, bounds, zoom and follow overrides; sequence camera direction | Shared follow algorithm, smoothing and input behavior where identical |

L1 must also trace any existing per-location/per-sequence exceptions in movement, interaction,
feedback, guidance, clock or sound policy. Such exceptions are in scope even if they sit outside
the four starting families. Their globally shared constants remain out of scope. A drawing
algorithm specialized for an asset is not automatically a configurable location exception.

## Source and resolution rules

- Reuse the existing scene, city/district, world-composition and sequence documents and their
  compilers. Extend their typed contracts where necessary; do not create a parallel settings store.
- Each value has one declared default and explicit supported scopes. Absence means inherit;
  `false` and zero are real overrides, not absence. Clear override restores inheritance.
- For overlapping settings, precedence is: shared default → district → chunk source → active
  composition override → active sequence override. A composition override applies only inside
  that composition's mounted context; opening a chunk source alone shows its underlying settings.
  Values with narrower supported scopes do not gain unused copies at every level.
- Composition-wide overrides apply to its members; a member-specific override wins over the
  composition-wide value. A sequence override must declare whether it affects the whole directed
  picture or named members. Do not invent another spatial region type for these settings.
- Different districts visible together retain their local values. The camera's current chunk
  does not silently supply every visible chunk's weather, grading or lighting policy.
- Resolve effective settings and provenance once through existing compilation/frame preparation.
  Game, editor, private Play and sequence direction consume that result. Picking/inspection reads
  it rather than reconstructing precedence independently.
- A sequence inherits the world unless its source explicitly overrides a supported value.
  Existing cinematic differences migrate into visible authored overrides to preserve the game.
  Necessary restrictions of a standalone cutscene are explicit capabilities, not editable switches
  that appear to work while doing nothing.
- Presentation switches affect presentation. Hiding actors, prompts or vision does not delete
  entities, grant access, bypass native guards or change world state. Existing shared commands
  remain the route for actual gameplay changes.
- Ordinary static overrides need typed controls. Existing eligible scalar keyframes remain on
  the existing timeline targets; do not add nested animation paths or another animation runner.
  Shared weather-generation mechanics are not exposed merely to make every value animatable.

L1 verifies these rules against actual source ownership and identifies any concrete conflict
before dependent changes. No unreported precedence rule may be introduced during migration.

## L1 — Inventory actual differences and fix the finite migration scope

Trace source-controlled settings and code branches selected by scene, district, composition,
sequence or presentation mode. Inspect scene ambient configuration, FrameDirector/FramePass,
prepare-frame, the lighting model, climate definitions, camera policies and contextual editor forms.

Produce one finite checklist. For each distinct setting or exceptional branch record:

- actual producer and consumers, source location and all affected places/sequences;
- current values/defaults, type, unit, constraints and actual scope;
- classification: already editable, missing authoring control, missing source field, shared engine
  implementation, or an unsupported/non-applicable feature;
- proposed authoritative source, precedence, inspector location and any existing animation target;
- preservation case and any intentional correction, including its expected visual effect.

Count distinct contracts separately from repeated uses. Do not use keyword matches as proof of
semantics. Include the current Glide/base grading mismatch, the whole-workspace screen wash,
sequence pass presets and district climate differences as named cases.

**L1 gate:** every identified location-dependent setting and exceptional branch has a disposition;
all four starting families and the other seven policy areas have been inspected. Every in-scope
row has an editor/migration destination. Unknown ownership, unresolved precedence and unclassified
rows are zero before dependent migrations. Do not expand the scope with hypothetical new overrides.

## L2 — Shared typed settings, resolution and frame consumption

Add the minimum typed fields required by the inventory to existing contracts. Validate supported
scopes, values, reference targets and unsupported pass combinations. Reuse existing Field/form
controls, source validation and frame preparation.

Replace implicit sequence-mode defaults with resolved settings. Preserve necessary differences
between a standalone cutscene and a directed world composition explicitly. Keep the current game
pictures by initially migrating their actual switches/values, rather than enabling grading on
Glide as an incidental consequence of unification.

Scope local effects correctly in joined rendering. In particular, grading must not recolor the
editor's empty background or bleed a neighbor's policy across the entire canvas. Determine coverage
from the existing world/frame geometry and native compositing, including transparent artwork,
overlapping chunks and moving entities. Document how a crossing entity receives local effects;
do not tie its appearance permanently to its spawning chunk. Preserve the current world/entity
model and use the single renderer. Any required native compositing work stays inside that renderer.

**L2 gate:** one authoritative resolution path supplies effective values and provenance to game,
editor and sequences. Focused checks prove inheritance, explicit false/zero, clearing an override,
composition/member precedence, sequence precedence, invalid rejection and two differing visible
neighbors. No new renderer, adapter, runtime, scheduler, settings store or legacy alias is added.

## L3 — Contextual authoring in the existing inspector

Expose settings on the selected district/chunk/composition/member/sequence using the existing
inspector and City map context. Reuse current selection, typed forms and Apply/Cancel workflows.

- Group controls under Rendering, Lighting, Climate and Camera where applicable.
- Show effective value and provenance, for example “Grading: Off — overridden by Glide”.
- Make inherited/local/sequence overrides distinguishable. Provide an explicit override control,
  reset-to-inherited action and navigation to the source of an inherited value.
- Show only supported controls. A disabled control explains its dependency or capability limit;
  do not offer a switch whose renderer ignores it.
- Distinguish saved authoring changes from existing temporary time/weather preview controls.
- Keep source editing in the inspector; no modal forms, catch-all configuration screen or required
  JSON. Preview navigation, ambient continuity and remembered sequence playheads remain intact.

**L3 gate:** real native editor workflows demonstrate setting, inheritance, override, reset,
invalid rejection, Cancel, one-step Undo/Redo and source persistence in each applicable scope.
The user can find the cause of the original grey wash from the inspector without reading code.

## L4 — Full migration and removal of competing settings

Migrate every missing-control/source row and every repeated use from L1, including real world
content, opening, standalone cinematics, proposals, demos and presets wherever affected.
Already editable settings reuse their controls; do not add a second editor for the same values.
Keep existing keys/references where they already express the intended concept.

Remove displaced scene/sequence-ID branches, pass presets and duplicate policy declarations.
Retain registered algorithms and true capability limits where required, with a concrete reason.
No old/new reader, silent fallback or compatibility conversion remains. Update current agent,
engine and authoring guidance. Retire disposable inventories after reconciliation.

**L4 gate:** migrated missing rows/total and affected uses/total equal the fixed L1 scope; unresolved
rows and stale consumers are zero. All source references validate. Every retained code-only item
is shared implementation or a documented capability limit, not an undisclosed local configuration.

## L5 — Native acceptance, preservation and cleanup

Verify these named cases through the real engine/editor:

1. **Original report:** inspect Glide at its end and base editing. The inspector identifies their
   actual grading sources. Matching their authored effective settings produces matching treatment;
   different authored overrides remain visible and intentional. The empty workspace is never graded.
2. **Adjacent differences:** two simultaneously visible chunks/districts with different local
   settings; neither inherits the other's active-camera policy. Check overlap and a crossing entity.
3. **Precedence:** edit a district default, override one chunk, apply a composition/member override,
   then a sequence override; clear each and confirm the expected source/value returns.
4. **Climate:** edit district weights/fixed weather through typed controls; deterministic native
   sampling uses the pending source. Temporary preview weather does not save an authoring override.
5. **Camera:** edit an actual local camera override. Preview/Play use it while Workspace pan/zoom,
   camera-frame selection and independent sequence switching remain coherent.
6. **Persistence:** actual bundle/protected Save/fresh reload, Undo/Redo, rejection and Cancel;
   private Play and game reconstruction consume the same settings. Use disposable test state.
7. **Preservation:** current real scenes and all affected sequences retain intended pictures,
   timing, seeds, ordering and world-state identity. Record approved changes separately from the
   deliberate correction that keeps the editor background outside grading. Never replace a
   reference just to pass. A preservation mismatch needs investigation or an explicit decision.
8. **Responsiveness:** use the existing CPU recorder on a heavy composition for representative
   toggle/value/override edits. Report sample counts, median and maximum, compare a matched workload,
   and verify no full-world compilation per pointer update or duplicate setting evaluation.

**L5 gate:** all eight named cases have direct outcomes, all inventory rows and references pass
current audits, relevant focused checks pass, package TypeScript and homepage build pass, temporary
test edits/artifacts are cleaned, and current usage guidance is complete. Report limitations and
intentional exclusions precisely. A settings form, green registry scan or screenshot alone cannot
establish completion. No broad gameplay playthrough or unrelated regression-suite expansion.

## Goal formulation for a later run

> Complete L1–L5 of LOCAL-PRESENTATION-PLAN.md. Inventory and expose all existing location-,
> composition- and sequence-dependent switches/values through the current contextual editor;
> retain globally shared engine behavior in code. Implement one typed resolution/provenance path
> across existing sources, native game/editor rendering and sequences. Migrate every affected use,
> remove displaced implicit policies, prevent grading of empty editor background, preserve intended
> game appearance and behavior, and demonstrate the eight native acceptance cases. Complete current
> coverage/reference checks, focused verification, TypeScript/homepage build, measured responsiveness,
> cleanup and guidance. Preserve unrelated work. Add no renderer, adapter, runtime, property store
> or compatibility layer. Publishing is excluded unless separately requested.

Completion means all L1–L5 gates pass. Report actual contracts/uses migrated, supported scopes,
native cases passed/8, pending decisions, retained exclusions and measured timings. Do not substitute
an unexplained percentage. If inventory finds a material design choice, finish independent work and
present the concrete choice; do not silently invent the policy or declare the full goal complete.
