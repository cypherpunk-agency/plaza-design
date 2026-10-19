# Current source owns removal

Native source validation no longer fills in missing manifests, actors, environment,
companion settings, reaction identities or appearance seeds from a canonical copy.
Required fields reject when missing. Optional settings stay absent. Existing source
documents retain their original values, so this does not change default game content.

The actor inspector exposes reaction identity and appearance-seed overrides. Removing
an override uses the normal actor default. Changing reaction identity starts separate
conversation progress; reordering an unchanged actor retains its existing identity.
Actual interaction targets, unique identities, valid fields and source references
continue to validate.

`check-source-removal.mts` verifies typed override removal, the compiled native actor
metadata, absent companion/environment settings, strict missing-manifest rejection,
history, bundles, protected Save, fresh shipping imports and byte-exact Undo. Focused
proof: `.scene-system/source-removal-SeWPuh/evidence.json` at repository root.

`check-actor-identities.mts` preserves all17 default bot identities and saved dialogue
across reordering/reload. The separate malformed-source checks no longer expect an
older incomplete source document to regain canonical actors or bindings silently.
