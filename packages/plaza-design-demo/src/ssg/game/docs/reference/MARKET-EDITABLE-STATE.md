# Market source dependencies

The Market validator now uses the same prospective gameplay contract as other fully editable
scenes. It no longer silently restores the `end` flag or requires the original cook cursor ID.
Actual scene-exit flag references, conversation conditions and command state writes still validate.
The shipping scene/gameplay JSON is unchanged.

`check-market-editable.mts` proves a coherent exit-flag change and cook progress-state rebinding,
then removes the unused historical flag/state through the actual typed gameplay forms. Deleting
the still-referenced replacement state rejects without changing pending history. The actual cook
conversation writes the replacement owner block and does not recreate the removed cursor.

Pending native assembly, history Undo/Redo, portable bundle round-trip, protected grouped source
Save, fresh shipping module import and byte Undo PASS in `.scene-system/market-editable/run-6me5KT`.
The fresh import verifies the retained replacement declaration and absence of both removed IDs;
the actual conversation execution check is against the pending native scene, not a browser Play.

Default preservation checks also PASS: 14 original interactions/prices/resource outcomes, 20 NPC
page cases and 64 original actor drawing transcripts (`check-market-ordinary.mts` and
`check-market-conversations.mts`). Their old flat-state fixture assertions were updated to the
current shared owner-block state shape; immutable expected lines, charges and artwork were retained.

This is a bounded authoring proof, not a complete Market or G10/G12 acceptance claim. These local
changes follow published checkpoint edc6007 and need a new integrated build/raster/editor checkpoint.
