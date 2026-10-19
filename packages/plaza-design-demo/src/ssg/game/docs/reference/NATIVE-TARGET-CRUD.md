# Editable native target collections

The registered Capsule, Beach, Sandbox, Moth and Yard primitive bindings now expose their target collections as ordinary editable source content. No shipping scene JSON was changed.

The editor supports:

- Target creation, duplication, stable ID editing, deletion and ordering; placement rebinding through the primitive's registered anchor picker.
- Ordered conditional prompts and outcomes: add, duplicate, remove and reorder conditional rows; the final fallback stays explicit and last.
- Response, action-list and engine-exit steps, plus reset steps only for primitives that already permit reset. Steps and action lists support add, duplicate, remove and reorder. An exit remains the final step. Native action state/text/goal/key/program/panel/effect/sector metadata comes from the assembled pending source; action windows include day editing.
- Empty collections and recreation after deletion. Omitting `nativeTargets` also means no targets, without restoring historical content.

Registered capability metadata is frozen at the existing `nativeTargetValidator`: permitted anchors and reset permission. `contentContract` forwards that same object and `compileNativeTargets` exposes it on `SceneDef.nativeTargetBindings`. The editor does not maintain a second historical target-ID list or a second capability registry. The existing primitive's placement dictionary must provide every registered anchor. Target IDs cannot collide with actual pending device/node IDs, because the real Host routes those identities to devices.

Historical target identity/order protection was removed only for contracts that already have a registered native-target adapter. Unregistered scenes cannot inject native targets. Existing shape, bounds, conditions, text/action references, registered anchors, reset permissions and exit foreign-reference checks remain active. The runtime still uses the same compiled native condition/action/text operations.

Fresh blank-source testing uncovered an older Yard `PARCEL` export indexing target zero and a Game constructor repair that retroactively granted rewards to older saves. Those two obsolete dependencies were removed by the integration owner. Current parcel rewards remain the authored target actions and existing persisted keyring owner.

## Evidence

- `scripts/scene-system/check-native-target-crud.mts`: all five collections, direct typed target controls and actual mounted Scene workbench collection entry; create/duplicate/rename/delete/order, ordered prompt/outcome/step/action edits, actual Host dispatch and replies, engine exits, reset capability, collision/invalid-anchor atomic rejection, empty/omitted collections and recreation.
- `scripts/scene-system/check-native-target-crud-save.mts`: portable bundle, protected grouped Save across 15 registered sources, invalid Save atomicity, actual pending runtime, fresh authored and fully blank saved-JSON imports, no canonical fallback, Undo of blank collections restoring authored behaviour and exact initial byte Undo.
- Evidence directory: `.scene-system/native-target-crud-save-phqjxa`.
- Package `tsc -b` passes.

This completes collection editing within existing primitive capabilities. Creating new physical placement anchors or granting a primitive a new reset permission is engine/artwork capability work, rather than ordinary content CRUD.
