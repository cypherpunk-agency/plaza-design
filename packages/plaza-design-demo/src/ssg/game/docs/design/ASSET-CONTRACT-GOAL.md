# Whole-game asset contract goal conditions

2026-10-27. ROADMAP.md owns priority/status. ASSET-DIRECT-MANIPULATION.md owns the implemented
authoring contract. This contract defines completion, not another runtime or roadmap.

## Authorization and review boundary

The user authorized goal formulation for phases A1-A6 and execution of A1 only. A1 must STOP
with the complete classification/unification proposal for user review. A2-A6 may later execute
as one autonomous implementation goal after that review; they are not authorized by merely
completing A1. Publishing is excluded. Preserve all pre-existing working-tree changes.
The subsequent design review accepted opposite-edge anchoring, stable seeds, coherent semantics,
height-driven buildings and separate independently configurable traffic generators. The user
then authorized A2–A6 as one active goal. Publishing remains excluded.

## Accepted design requirements

- Dragged edges change dimensions while the opposite edge stays fixed. Preserve the seed and
  regenerate artwork rather than stretching an image.
- Buildings use authored height and floorHeight. The number of complete floors is derived from
  available height after ground-floor and roof/parapet reservations. Roof dragging changes height
  continuously, never floorHeight or an independently saved floor count. Keep incomplete leftover
  space above the last complete floor, below the roof; expose the derived count read-only.
- Independently configurable traffic behaviors become ordinary separate assets: one traffic lane,
  patrol generator or drone stream per asset. Individual blimps/scheduled craft reuse ordinary
  vehicles and existing motion/sequence mechanisms where they preserve the actual behavior.
  An ordinary group provides collective movement; presets can add a complete arrangement.
- Lists of independently behaving lanes/patrols become separate authoring units. Internal particle
  configuration remains inside its generator: the sky fleet is one selectable generator, not nine
  scene instances. Reuse generation/drawing code; do not split individual particles or invent an
  ambiguous whole-group resize.

## A1 — Classify and propose (complete locally; design direction accepted)

A1 classified 886 definitions, 5,837 property rows, 4,481 source uses and 19 sequence targets.
Its disposable proposal snapshots and generator were retired after full reconciliation; current
registry/source checks and the acceptance ledger replace them.
This completes proposal coverage; renderer semantics and actual handles are verified in A3–A6.

Completion requires all of the following, with exact counts from the current checkout:

- Every live ArtRegistry type has exactly one inventory entry, with registered source module
  evidence, scope/family, current properties, dimensions/geometry model, proposed spatial handles
  or a concrete exclusion/decision, inspector organization and preservation constraints.
- Every authored and prepared property has a proposal row: existing path/schema/default, proposed
  identity/semantic meaning/type/unit/group, preservation/conversion rule, source evidence and
  a declared review status. Include declared nested fields and identify structured opaque inputs
  explicitly; native snapshots are not mislabeled as authored editable objects.
- Inventory actual source uses, explicit/implicit properties, presets, sequence targets and
  bindings against the existing source-document allowlist. Distinguish current production-like
  source references from arbitrary text matches; count unique files/documents/instances.
- Names with several meanings are split by semantics. Identical concepts receive a proposed
  common name/type/unit. Do not present regex/label inference as individually verified renderer
  semantics. Any unresolved naming, geometry or lifecycle decision is an explicit review item,
  tied to affected assets/properties and a recommended resolution.
- The proposal fixes a common inspector-group vocabulary, field/capability ownership, stable
  nested identity strategy, constraints/anchor behavior, animation policy, new-asset admission
  rules, migration order and preservation exclusions. It defines which input the edge changes,
  not merely whether the drawing has a rectangle.
- A repeatable audit checks exact registry/property/reference coverage, duplicate/missing rows,
  proposed key collisions, valid groups and traceable source evidence. Generated artifacts are
  clearly proposal data; game/editor builds never consume them as another registry.
- Produce a human review packet with exact totals, family coverage, concrete examples, proposed
  conventions and all decisions requiring user input. Describe evidence limits honestly.
- No engine/content schema migration, resizing implementation, renderer/adapter, current source
  value rewrite, save-format compatibility layer or deployment is performed during A1.

A1 completion means a complete, inspectable proposal ready for approval. It does not mean all
proposals are approved, all 440 preliminary candidates are resizable, or implementation has begun.

## A2 — Shared property and geometry contracts

- Accepted vocabulary/group/unit/space metadata lives in existing AssetDefinition/Field contracts
  and shared constructors, with explicit mutable/authored versus prepared/read-only semantics.
- Existing registry/source validation rejects invalid groups, dimensional-unit combinations,
  defaults, handle targets and field/capability inconsistencies. No duplicate metadata store.
- Every newly added definition satisfies the shared contract; finite existing migration entries
  are tracked explicitly, and A5 removes exemptions.
- Projection/capability metadata is consumed by existing inspector and geometry paths. No new
  renderer, adapter, runtime, animation runner or independent camera computation.
- Declare building height/floorHeight inputs and derived count through existing field/inspection
  contracts. One pure layout calculation supplies drawing, anchors, bounds and diagnostics.
- Separate traffic assets use ordinary instance identity, groups, shared fields/projection and
  source references. Density/clearance dependencies remain explicit; splitting cannot silently
  discard the old generator's quiet areas, landmark clearance or density ramps.

## A3 — Direct manipulation and representative workflows

- Shared rectangle/range/endpoint/radius interactions change existing typed values;
  no app.ts per-asset switches and no stretching substitute for dimensional generation.
- Prove rectangular, height-driven building, cloud-field, separate traffic-lane, masked Far Shore,
  attached/mirrored/scaled and different-parallax examples through the actual editor.
- Supported handles only; constraints apply before preview; opposite edges/anchors obey the
  approved policy. Inspector values and handle edits produce equivalent validated changes.
- Stable nested selection survives list insert/reorder/delete; unsupported nested animation
  cannot silently create handle-only tracks or state. Supported animation uses shared targets.
- Live preview, pointer capture, snapping, cancel/disposal, one Undo per drag, invalid rejection
  and source save/reload work. Workspace navigation leaves game-camera data unchanged.
- Demonstrate continuous roof dragging across floor thresholds with floorHeight unchanged,
  correct derived count/remainder, ground anchor fixed and inspector/handle agreement.
- Demonstrate Add/select/inspect a lane, drag its endpoints/altitude, duplicate/delete it and
  move a group of independently configured lanes together. Prove patrol-radius and stream-endpoint
  controls as well. Selection, labels and handles must be discoverable in the real viewport and
  outline; inspector row forms alone do not satisfy this gate.

## A4 — Full asset and content migration

- All A1 inventory entries are migrated or have an approved explicit exclusion. No unclassified
  registered assets and no source uses still targeting removed property names.
- Definitions, defaults, nested rows, presets, authored compositions, sequence targets/key values,
  visual bindings, current compilers and tests migrate atomically per family.
- Unit/type changes preserve numerical meaning, random seeds, palette choices, native timing,
  physical geometry and source/world-state identity. No legacy codecs or alias maps.
- Convert floor-derived sources to height from their exact old layout formula, including ground
  and top reservations. Preserve all unedited floors, roofs, windows, anchors and bindings. Update
  floor-count tracks/dependencies to equivalent height/layout behavior atomically; no second
  writable floor count or silent rounding of animated existing behavior.
- Expand compound lists of independent traffic behaviors into separate ordinary assets/groups;
  retain internal particle configurations in their generator. Preserve
  placement/depth, per-row variation and seed inputs, density/clearance, timing, binding/sequence
  targets and original paint order, including overlapping vehicles. New instance IDs are stable.
  Reuse existing vehicle motion only when equivalent; retain necessary pure artwork kernels
  without adding another simulator. Audit old rows versus new assets and all incoming references.
- Shared inspector groups/capabilities cover the full eligible library and all affected folder,
  catalogue, backdrop, demo and sequence sources, not only six showcase assets.

## A5 — Consolidation and obsolete code removal

- Remove displaced Look/grouping paths, duplicate field constructors, one-off forms, renamed-key
  aliases and temporary admission exemptions. No silent unclassified-field fallback remains.
- Prepared values remain diagnostics; controls do not copy derived state into editable source.
- All assets have supported spatial controls or an approved concrete no-resize explanation.
- Current agent/authoring documentation describes the implemented admission/extension workflow;
  existing library category/source filters retain their intended meaning.
- Remove superseded independent-behavior bundles/list-only controls/source forms after full
  migration, and writable floor-count paths replaced by height. Do not retain live aliases or
  old/new competing editors. Ordinary groups/presets replace the bundled traffic arrangement.

## A6 — Whole-system acceptance

- Repeatable registry/reference audits confirm complete current coverage and no stale names.
- Focused tests and native workflows verify projection, facing, attachment, depth, masks,
  constraints, Undo/cancel, source persistence and eligible keyframes across migrated families.
- Verify building threshold/remainder cases, existing unedited layouts and floor-height edits;
  traffic splitting preserves seeded placement, overlap order, clearance and schedule behavior.
  Report exact migrated building/source and traffic-row/reference totals against the inventory.
- Unedited current scenes/sequences retain intended visuals and gameplay/animation cadence;
  deliberate generation changes occur only when dimensions are edited. Report genuine differences
  for user acceptance; do not change baselines simply to pass.
- Measure drag responsiveness on an actual heavy composition; eliminate full-world-per-pointer
  work. Validate required TypeScript/homepage builds and relevant current checks.
- Report exact asset/reference/workflow results, material limitations and any remaining approved
  exclusions. Subjective design feedback remains distinct from agent-owned mechanical checks.

## Progress reporting

Report counts per condition (classified/total, mapped/total, decisions, migrated/total,
validated references/total and demonstrated workflows/required). No unexplained percentages.
A2-A6 passed the final local acceptance audit on2026-10-28. The acceptance ledger records
current results and limitations. The following requirement remains the completion standard:all required
work must pass,not just schema registration,a green build or proximity to a token/time limit.

## Sky generator clarification

The original separation of every sky particle was unnecessary and has been removed. One
`environment.sky-traffic` generator owns its typed particle configuration and shared native paint.
Independent lanes/patrols/streams remain ordinary separate assets. The restored generator matches
48/48 native comparisons exactly; the previously accepted glow exception is no longer needed.
