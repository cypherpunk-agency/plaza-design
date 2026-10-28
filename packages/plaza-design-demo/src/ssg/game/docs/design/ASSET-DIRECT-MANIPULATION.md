# Asset properties and direct manipulation

Current authoring contract. [ROADMAP.md](../../ROADMAP.md) owns priority;
[ASSET-CONTRACT-GOAL.md](ASSET-CONTRACT-GOAL.md) owns acceptance. The active goal's
[evidence ledger](ASSET-CONTRACT-PROGRESS.md) records verification and remaining work.

## One source of editable values

An asset declares its authored fields on AssetDefinition.fields. Each Field supplies the existing
storage/control kind, default, constraints, animation eligibility and semantic metadata. The registry
validates these declarations and source values. Prepared inputs live in visualFields; they are not
another editable copy. ComposerModel owns document edits, validation, history and persistence.

Use art/core/fields.ts constructors/decorators. The inspector groups are Transform, Shape / Area,
Generation, Appearance, Motion, Depth, and Visibility & Drawing. Required semantics describe quantity,
unit and coordinate space where applicable. They are consumed directly; no parallel metadata table,
name-based classifier or fallback Look group is involved.

- Physical lengths use world units, motion uses world units / second, durations use seconds and
  angles use degrees. Convert only at the native drawing/compiler boundary.
- Integer units mean whole numbers. Registry input and sequence keys share fieldValueValid;
  fieldIsContinuous gives integer fields discrete hold animation. Fractional variation is a factor,
  not an integer seed. Prepared fields retain their actual native domains.
- Color is distinct from text and a palette index. Use shared colorField, appearanceColor or
  optionalColor where appropriate. Declare existing RGB-string units explicitly. Palette selectors
  use discrete choices. Structured palettes/automatic settings keep typed controls and native meaning.
- Structured authored values require typed list/array/tuple or contextual controls. Nested editing
  uses the existing row controls and ComposerModel history. Structured configuration is not an
  independently keyframeable scalar; do not create hidden nested animation state.

Use descriptive camelCase names, preserving distinct meanings:

| Concept | Examples |
| --- | --- |
| Physical size | width, height, thickness, trunkHeight, roofHeight |
| Position or route | minX/maxX for an ordered region; startX/endX for directed endpoints; altitude |
| Drawing restriction | drawingMinX/drawingMaxX, distinct from generated width |
| Building layout | height, floorHeight, groundFloorHeight, parapetHeight; derived complete floors |
| Repetition | spacing, columnGap, seed, count |
| Motion | speed, velocityX, loopDuration, startTime/endTime |
| Orientation | bearing in degrees, mirrored boolean, facing for body orientation, direction for travel |
| Depth | depthBand and parallax; depthBelowGround is a physical dimension |
| Appearance | paintColor, lightColor, textColor, fillColor, paletteIndex, bodyStyle |
| Visibility | opacity or role-specific lightOpacity/textOpacity; visible |

Placement remains placement.x/h internally. The UI calls these X/Y, with positive Y upward.
Placement scale does not substitute for changing an asset's physical dimensions or generator area.
Do not rename native kernel parameters merely because their authored input has a clearer name.

## Supported spatial controls

Every production definition explicitly declares AssetDefinition.spatial, either supported controls
from art/core/spatial.ts or fixedGeometry(reason). A fieldless asset needs a disposition too.
Explain fixed artwork, typography, gameplay-bound geometry or heterogeneous groups concretely;
absence of controls is never inferred from a missing width/height name.

Reuse rectangle/range/endpoint/radius/repeated-width controls and their depth/baseline/conditional
combinators. Declare the actual fields an edge changes. Return a sparse property patch and an optional
origin correction; do not measure a rendered silhouette to guess a source property. A rectangle's
origin fractions express its real anchor. Opposite edges stay fixed; resizing is not centre-based.

The existing viewport captures native projection, including attachments, scale, mirroring, depth and
parallax. Shared geometry maps pointer deltas into source changes. Source constraints validate before
preview. Handles and inspector controls edit the same values. A drag shows affected labels/values,
opens their inspector group, keeps canvas pointer capture, commits one history step, and restores
source on cancel. Unsupported, hidden or linked fields have no ineffective handles.

Generator selection regions describe configured extents, independent of emitted samples/time.
Generated content regenerates from unchanged seeds at new dimensions; it is not stretched.
Drawing-window controls change permitted output, not physical size. The inspector explains an
invisible object and can show its visibility boundary.

Prepared dimensions that replace authored fallbacks declare Field.stateOverride. The normal resolver
supplies effective local values and provenance once. Paint, bounds, anchors and inspection consume
those props. Linked values are read-only and link to their source; independent copies retain editable
fallbacks. Never save an effective-value alias or restore self-links/chained fallbacks.

## Height-driven buildings

art/buildings/layout.ts owns floorLayout. Author height and floorHeight, reserve the actual ground
floor and roof/parapet portions, and derive complete upper floors and remainder. Leftover space stays
above the highest complete floor and below the roof. Roof dragging changes height continuously,
leaving floorHeight, ground anchor and seed fixed. Drawing, bounds, anchors and read-only inspection
use the same layout. There is no second writable floor-count input. Special fixed landmarks expose
only dimensions supported by their actual drawing.

## Independent traffic behaviors

One independently configurable lane, patrol or stream is one ordinary asset. Existing types are
vehicle.traffic-lane, vehicle.air-patrol, vehicle.drone-stream, vehicle.ad-blimp and
vehicle.scheduled-craft. Their pure native kernels preserve routes, depth, schedules, clearance and
paint order. Several behaviors can form an ordinary group and reusable group preset. No generator
runtime or combined vehicle.air-lanes authoring path remains.

Generated particles stay internal. environment.sky-traffic remains one selectable generator with
typed craft settings. Splitting particles into individual scene objects is not required for reuse
or selection. Collective groups move their children; a heterogeneous group has no invented resize.

## Extending and checking the library

1. Register the definition in the existing art library. Declare precise fields/defaults, semantics,
   typed structured controls, state overrides if needed, and explicit geometry disposition.
2. Keep paint/bounds/anchors on the same resolved inputs and native projection. New dimensions must
   affect generation meaningfully. Expose derived diagnostics through derived(), not editable copies.
3. Add content through ordinary sources/presets. Preserve identities, bindings, state keys, seeded
   variation and relative paint order. Do not add aliases, compatibility readers or per-type app.ts UI.
4. Verify native Add/select/inspect/edit, the supported handles, rejection, cancel, one-step Undo,
   source bundle/save/reload and eligible animation. Check masking, attachment, scale/facing and depth
   where relevant. A green registry scan alone does not establish usability or visual preservation.
5. Run the focused asset-source-contracts, asset-spatial-contracts and keyframe-editor checks as
   relevant, TypeScript and the required homepage build. Compare native rendering for drawing changes.
   Use the existing opt-in performance recorder on a heavy composition for interaction changes.

Continuous dimensions can fall between numeric scrub increments. Validation comes from the registered
field/domain, not HTML step rounding. At fractional workspace zoom, existing pixel snapping can move
a displayed edge by up to one projection snap step although the source opposite edge is exact.
CPU recorder timings describe submission work; they do not measure GPU/presented-frame completion.
