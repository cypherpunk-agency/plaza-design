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

- `check-artwork-role-source.mts`: PASS, `.scene-system/artwork-role-source-ADDuq3`.
  Actual mounted Scene forms rebind orientation, shade, shadow width and scene width. Real native
  metadata changes; the former wall can be deleted after preserving child placements. Unknown roles,
  bad property types and dangling refs reject atomically. Explicit shade removal, history, bundle,
  protected Save, fresh shipping import and byte Undo pass.
- `check-warehouse.mts`: all36 original native Canvas-command comparisons and43 independent
  instances pass. Shadow metadata is checked through the native factory, its current owner.
- `check-interior-content.mts`: ten original state/outcome/repeat cases, geometry, arrivals, pending
  target edits and atomic bundle/history pass. Its obsolete raw rule-body equality is replaced by
  existing outcome checks; the added shared Yard gateUntil=0 field is explicitly asserted separately
  from the immutable old-state projection. Reload checks use the current save shape. No old-save
  format support is required or introduced.
- Package tsc and both builds pass. Public package has97 documents /128 source references.
- Browser raster at `sha256:90acba454a99b69bcf3cdc94f5e80078e029546e71c2b02f24ed88df0b310ce4`:
  all173 comparisons have zero differing pixels/max delta/errors. Artifact under
  `.scene-system/all-game-pixel-check/evidence/90acba454a99b69bcf3cdc94f5e80078e029546e71c2b02f24ed88df0b310ce4-*`.
- Actual packaged Warehouse Play/Stop passes with matching scene status, visible native Terminal,
  and no warning/error logs. Local app-U6TIHOTB.js / play-HWFCCEB3.js /
  play-2891c7ddd6a218aa.html. This targeted run follows the earlier all19 native Play checkpoint.

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

`check-artwork-role-source.mts` PASS: `.scene-system/artwork-role-source-Ct9TGB` covers actual mounted
Scene/Device forms, all three native factories, Library observation-to-picture rebinding, Moth's
raised native door and desk height, real former-art deletion, invalid transform/bounds/ref atomicity,
optional shade removal, history/bundle/protected Save/fresh shipping/byte Undo.
Library and Moth default checks, ten interior outcomes/current-format reloads and128 immutable
observation cases PASS. Package TypeScript and both builds PASS.

Integrated source before the Moth-only follow-up `759699b704f147207a2868596cd327ac977e81c842342433a203fe997275b5d3`
has all19 actual packaged editor native Play/Stop cases, no warning/error logs:
`.scene-system/evidence/editor-native-play-759699b7-20261020.json`. Its173 browser pixel cases also PASS.
Final source `67428f2c6ed0394c25e77e9d2378a46e1fcf86c13312e2768b2e8e4f40510326` passes all173
browser pixel comparisons with zero differing pixels/max delta/errors. Actual final-package Moth,
Library and Warehouse native Play/Stop PASS, no warning/error logs. The Moth inspector's width and
all three artwork-role controls are confirmed reachable in the actual browser UI.
Local package app-ODSCT226.js / play-UYS3YGBM.js / play-b173443a513df86c.html.
This bounded checkpoint does not sign the remaining all-game gates.

## Beach geometry, 2026-10-20

Beach now uses the same nine typed role bindings for horizon, waterline, bar/pier/boardwalk sightlines,
tower, drink, shore and the stairs interaction. Its former blanket required-prop map is removed;
actual manifest, attachment, actor and role references still validate. Optional absent bar input is
invisible with zero width, with no original-ID fallback. Stairs require a valid physical role anchor.
Removed unused shipping layout/width helpers; original kernel layout exists only in its test fixture.
The retained edge helper reads the current stairs role rather than an obsolete exit ID.

`check-artwork-role-source.mts` PASS: `.scene-system/artwork-role-source-d2f0nS` (earlier eKlKT8).
The actual Scene controls rebind all9 roles and the dependent exit. Old horizon/waterline/shore/stairs/
bar instances are removed after child and exit rebinding; native environment values, real elevated
stairs and exit match new inputs. Explicit bar removal, atomic bad edits, grouped source history,
bundle, protected Save, fresh shipping import (including the edge helper) and byte Undo pass.
`check-beach-composition.mts` retains all60 original command comparisons and101 independent pieces;
`check-beach-live-workflows.mts` retains512 original timing/outcome cases. TypeScript and both builds
pass. Source `5f5cb79b3c7c980eddb9a9ba1285b6ce5894f8972f55ac810c6aee89343f1671` passes173/173 browser
raster comparisons with zero differences/max delta/errors. Actual packaged Beach Play/Stop passes,
no warning/error logs. Local app-HIGWCLLU.js / play-VMODMF2A.js / play-c89cdd77a3900670.html.

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
