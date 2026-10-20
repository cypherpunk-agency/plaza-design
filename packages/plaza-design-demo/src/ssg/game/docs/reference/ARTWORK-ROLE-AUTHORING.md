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

Source proof check-capsule-artwork-roles.mts (`capsule-actor-role-source-Uo3VDz`) changes the real
door height/position, cable endpoints, sun extent and orientation through mounted controls, deletes
former artwork, rejects invalid edits, and covers history/bundle/protected Save/fresh import/Undo.
Default Capsule geometry/device/boot/heat/steam checks and ten immutable interior outcome/current-save
cases PASS. Both builds/tsc and173 zero-difference/error browser raster cases PASS at sourcedb81f87e1f74.
Actual latest packaged Capsule Play/Stop PASS without warnings/errors. Removed baseCapsule and the
older missing-bed source backfill; no old-save conversion was introduced.

## Mall geometry inputs

Atrium geometry artwork selects the registered room dimension properties; Escalator motion artwork
selects physical route geometry. Both are typed Scene inspector fields. The scene manifest owns
width. Room and escalator roles are required by the native atrium controller and missing roles
reject atomically. Escalator height drives rider elevation; non-unit physical transforms reject.
Nine unused layout fields/lookup dependencies and the blanket prop ID floor were removed. Existing
actors/ordinary interactions/attachments remain source validated. Motion group/phase and embedded
vendor actor references remain a separate open continuation.

check-mall-artwork-roles.mts PASS (`mall-actor-role-source-g546tY`): actual forms, replaced/deleted
former geometry, native adaptive floors/rider routes, atomic rejection, bundle/protected Save/fresh
shipping/byte Undo. Original77 bodies/six people/interactions/booth/adaptive poses and tsc/both builds
PASS. Source8235dad37ca6 passes173 zero-difference/error browser raster cases; actual native Mall
Play/Stop and inspector fields PASS with no warning/error logs.

## Harbor Shift position inputs

Trolley rest position artwork, Trolley parked position artwork and Horizon artwork use the same
Scene manifest inspector. Native picture bindings read the authored trolley X positions; the
horizon reads authored height. Missing required trolley inputs reject; optional absent horizon
stays absent. Old geometry can be deleted after ordinary uses/children have been rebound.
check-shift-artwork-roles.mts PASS (`harborShift-actor-role-source-9phmES`) through actual forms,
native outputs, invalid absence, history/bundle/protected Save/fresh import/byte Undo. Original2048
objective/carry/time cases,768 visual snapshots and manifest/actor Save checks PASS. Both builds/tsc
and all173 zero-difference/error raster cases PASS at sourceed098aacf729; actual native Play/Stop
and packaged controls PASS without warnings. The inspector's prefix/composition-ID bug is fixed
with the shared document identity helper; all19 actual manifest/companion/actor form mounts pass
(`scene-inspector-identities-5FDHpk`).

## Harbor registered geometry

Harbor's30 inputs now select source artwork for its regions, booths, crane slots/loads, forklift,
stack culling, horizon/shade and decorative positions. Shared property contracts include finite
numbers/positive dimensions, text and explicit numeric/string choices. Slot filters prevent the
first crane/load from binding the second index; gantry choices are the existing registered types.
Required native inputs reject absent refs. Width comes from the manifest; actual actor/ordinary/
attachment dependencies must be rebound before deleting old artwork. Six unused layout fields
were removed. Native actor IDs/prefixes remain a separate continuation, explicitly still open.

check-harbor-artwork-roles.mts PASS (`harbor-actor-role-source-eA6F29`) through actual forms, nine
replacement inputs, attachment rebind/deletion, native layout/motion/loads/clips/vendor/culling/
shade, strict index/ref validation, history/bundle/protected Save/fresh shipping/byte Undo.
Original Harbor40/tea14/foreground5/shift36 drawing cases and1674 coastal bounds cases PASS;
26 interactions/37 NPC pages/weather/persistence and five crane-flight paint transcripts PASS.
Both builds/tsc, all19 inspector mounts and173 zero-difference/error raster rows PASS at
source6a0fdc397d3e; actual packaged Harbor Play/Stop/slot-filter controls pass without warnings.

## Stacks terminal geometry

Stacks uses shared artwork roles for rest/slot/chassis/gate/hatch/deck trajectory geometry,
three cargo-bay culling origins, ladder/kiosk watchdog positions, quay and bridge. Required
controller inputs reject absent refs; width uses the shared manifest and horizon is optional.
The native crane/ferry simulation remains the sole registered implementation. Removed unused
layout inputs and fixed artwork identity/type restrictions. Actual typed source edits, removal,
protected Save/fresh shipping/Undo proof: check-stacks-artwork-roles.mts,
`stacks-actor-role-source-442wyn`. Original drawings/outcomes and173 browser raster rows unchanged
at source6c855527c33d. Actor roles are documented in SCENE-PRESENTATION-ACTORS.md.

## Downtown geometry and parented fronts

Typed source roles select stall metrics, alley offset, vehicle home, platform points/extents,
shadow point/extent and ten reflection anchors. Every registered native draw pass receives the
actual SceneDocument; old instance IDs/types do not lock ordinary artwork. Real refs must be
rebound before removal. Window/front visibility follows parent/attachment hierarchy with ordinary
source IDs. Missing actor collections reject instead of injecting shipping actors.
Actual Scene geometry/width, Device artwork and Companion perch controls, native outputs,
replacement/deletion/renamed front, protected Save/fresh import/Undo PASS:
check-downtown-artwork-roles.mts (`downtown-artwork-role-source-r6ejgu`).143 original command cases
and173 browser raster rows unchanged at source0343b7b81a3e. See the execution ledger for scope.

## Train car geometry and window readers

Train frame roles select ceiling, roof parameters, news text, window style, line map, handrail,
staff door, gangway wall/door and brake. Required native inputs validate eagerly; width remains
manifest-owned. Per-window frame-width streams refer to real window artwork with ordinary IDs;
retained same-type registered presentation readers can rebind while gameplay bindings and kernel
types remain protected. Source manifests/attachments must be rebound before old artwork deletion.
Actual frame/exit controls, native outputs, replacement/deletion/read rebinding, protected Save/
fresh import/Undo: check-train-artwork-roles.mts (`train-artwork-role-source-hvwBeP`).270 original
command cases and1490 controller histories PASS;173 raster rows unchanged at sourceb1636f78da49.

Finite registered visual-input pickers use Element.bindingChoices. The shared Add/draft path
initializes declared presentation inputs, and the Appearance inspector can select their finite
sources. Train parts receive their live frame; seats can choose an existing window's width.
The unused attachment-dependent seatWidths map is removed. Actual catalogue creation, pending
Play, source Save/fresh import/Undo and173 unchanged rasters PASS at source0d1a6738fb29;
check-train-artwork-roles.mts (`train-artwork-role-source-OsoNO2`). This registration supplies
presentation values, never scripts, gameplay state or a second controller.
