# Market source dependencies

The Market validator now uses the same prospective gameplay contract as other fully editable
scenes. It no longer silently restores the `end` flag or requires the original cook cursor ID.
Actual scene-exit flag references, conversation conditions and command state writes still validate.
The shipping scene/gameplay JSON is unchanged.

This is a bounded authoring proof, not a complete Market or G10/G12 acceptance claim. These local
changes follow published checkpoint edc6007 and need a new integrated build/raster/editor checkpoint.
