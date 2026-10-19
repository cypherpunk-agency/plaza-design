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
