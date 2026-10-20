# Registered artwork geometry roles

2026-10-20. A continuation of the all19 goal; not whole-goal acceptance.

`SceneDocument.manifest.artwork` binds finite registered picture roles to composition instance IDs.
`engine/gameplay/artwork-roles.ts` owns the role/property contracts; `manifestGeometry` resolves
current pending artwork and rejects unknown roles, missing instances and incompatible properties.
There is no second state, simulation, evaluator, arbitrary expression or executable document.
Optional removal disables the derived feature; it never restores an original artwork ID.

Warehouse is the first ordinary scene using these shared roles:

| Role | Input | Native consumer |
| --- | --- | --- |
| orientation | artwork with numeric facing 0-360 | scene facing |
| frontShade | artwork with positive height, resolved placement/scale | front shade height/gap |
| casterWidth | artwork with positive width and scale | existing caster widths |

The Scene Content & bindings inspector renders typed role selectors filtered by property contracts.
The same inspector now exposes width source, artwork and numeric property selectors. A width that
would strand an interaction still fails native manifest validation atomically. Existing numeric
widths remain editable. This replaces the previous read-only width-reference note.

Warehouse no longer enforces historical scene/wall/dock/van IDs/types globally. Actual manifest,
attachment, actor and role references remain checked. Its drawing primitives are unchanged.
The native factory supplies the explicit current width owner to shadow calculation. No omitted
binding silently picks the original van. Shared actor/composition operations still own attachments.

## Evidence

Run commands from `packages/plaza-design-demo`:

## Remaining

Extend this same stateless role contract for real geometry dependencies in other native scenes.
Do not delete a validator without replacing its actual consumers. Controller-specific physical
anchors can remain typed controller inputs; ordinary picture geometry should reuse this contract.
Then reconcile the matrix, lifecycle/current-state/world/network evidence and final removal ledger.
G4/G8/G9/G10/G12/G13 remain open overall.

## Library and Moth follow-through, 2026-10-20

Library orientation now uses the same typed role. Its catalog.connected picture input reads the
existing editable catalogConnected observation, so changing the observed node changes the picture.
Removed duplicated observation backfills from source validation and the redundant Sandbox dialogue
normalization. Omission stays omission; remaining dependent references fail current-source validation.

Moth orientation, desk surface and door interaction also use shared roles. The real native door
follows authored elevation. Desk/door artwork can be replaced and its former IDs removed after
reanchoring children. Unused static layout exports and the superseded base definition are removed.
The retained spawn helper derives only from the current manifest. Native interaction roles enforce
supported unit transforms/depth and current scene bounds; invalid edits reject atomically and the
inspector filters unsuitable artwork. Optional picture roles do not restore old IDs.

## Beach geometry, 2026-10-20

Beach now uses the same nine typed role bindings for horizon, waterline, bar/pier/boardwalk sightlines,
tower, drink, shore and the stairs interaction. Its former blanket required-prop map is removed;
actual manifest, attachment, actor and role references still validate. Optional absent bar input is
invisible with zero width, with no original-ID fallback. Stairs require a valid physical role anchor.
Removed unused shipping layout/width helpers; original kernel layout exists only in its test fixture.
The retained edge helper reads the current stairs role rather than an obsolete exit ID.

Beach still has native actor-role identity branches (`lime-talk`, `ashore-*`); these are explicitly
remaining work, not hidden by the geometry proof. Move their configurable role references into the
existing scene presentation source with typed actor selectors and atomic actor-removal cleanup.
The danger predicate remains the one existing source-controlled Beach visual state read.

The Beach actor-role follow-through is now independently verified in [SCENE-PRESENTATION-ACTORS.md](./SCENE-PRESENTATION-ACTORS.md); the earlier geometry-only scope above remains historical.

## Capsule geometry inputs

Capsule now exposes Orientation artwork, Desk cable surface artwork, Sun patch extent artwork,
Cable router artwork and Door interaction artwork through the shared Scene inspector. The native
factory and renderer consume these pending references. Physical door bounds/transforms are checked;
its native capability requires a placement. Optional picture inputs may be absent without finding
old geometry. The independent exit and dependent device/companion artwork still use real shared
bindings/attachments, which must be reanchored before removing former geometry.

## Mall geometry inputs

Atrium geometry artwork selects the registered room dimension properties; Escalator motion artwork
selects physical route geometry. Both are typed Scene inspector fields. The scene manifest owns
width. Room and escalator roles are required by the native atrium controller and missing roles
reject atomically. Escalator height drives rider elevation; non-unit physical transforms reject.
Nine unused layout fields/lookup dependencies and the blanket prop ID floor were removed. Existing
actors/ordinary interactions/attachments remain source validated. Motion group/phase and embedded
vendor actor references remain a separate open continuation.

## Harbor Shift position inputs

## Harbor registered geometry

Harbor's30 inputs now select source artwork for its regions, booths, crane slots/loads, forklift,
stack culling, horizon/shade and decorative positions. Shared property contracts include finite
numbers/positive dimensions, text and explicit numeric/string choices. Slot filters prevent the
first crane/load from binding the second index; gantry choices are the existing registered types.
Required native inputs reject absent refs. Width comes from the manifest; actual actor/ordinary/
attachment dependencies must be rebound before deleting old artwork. Six unused layout fields
were removed. Native actor IDs/prefixes remain a separate continuation, explicitly still open.

## Stacks terminal geometry

## Downtown geometry and parented fronts

## Train car geometry and window readers