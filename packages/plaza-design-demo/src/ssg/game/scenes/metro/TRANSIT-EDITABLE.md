# Transit source and editor contract

Metro, Galleria Station, Harbor Station and Train use the shared scene manifest and actor collection. Their default source retains the original geometry, IDs, timing and procedural rider recipes.

## Editable ordinary content

The scene manifest owns width, spawn, exits, readables, uses and rests. These resolve through composition bindings and `compileManifestDocument`; removing or rebinding the old marker does not leave an executable copy behind. Scene conversations use the shared gameplay graph. The native world-binding closure retains the selected source documents and compiled bodies when a pending scene is bound to the live city and metro.

The four scenes contain 36 source rider bodies: Metro 5, Galleria Station 6, Harbor Station 6 and Train 19. They use the same actor collection, source placement, duplication, rebinding, deletion, schedule and conversation controls as Character bodies, with a typed rider presentation instead of a Character look. The original regular passengers' talk text remains manifest-backed readable content. A readable explicitly attached to an actor must be removed or rebound before that artwork can be deleted.

## Rider recipes and controllers

`presentation.kind: "rider"` selects the native pixel renderer. Its fixed recipe contains rider kind, seated state, facing, phase and optional regular-passenger designation. Moving a fixed body preserves its phase. Character-only appearance and motion fields cannot coexist with a rider recipe; original protected identity metadata remains available when changing presentation family.

The typed `platformQueue` controller stores station, slot and count. The typed `trainCrowd` controller stores slot, count and standing state. Count and slot are explicit source values, validated together; deleting a body does not renumber and reseed its siblings. The native metro seed, train arrival seed, boarding visibility, access policy and standing offset remain unchanged. Their fields are inspectable and editable in the actor form. Switching to a fixed recipe exposes its fixed appearance controls.

A station bench owns a drawing slot, not a second passenger. It receives the prepared source body between the bench's back and front drawing passes. Embedding requires the source body to be attached to that bench and the bench to reference that body's embedded pose. Detaching or reparenting the body renders it independently at its edited placement. Removing a body clears its registered presentation consumer; dangling or mismatched consumers fail source validation. Protected platform controller bindings remain protected.

## Verification

`check-transit-editable.mts` covers ordinary rebinding and deletion, new content, source actors and conversations, mixed Character/rider bodies, duplication, attachment changes, removal of all 36 bodies, protected-controller rejection, native world binding, pending scenes, grouped history, bundle, protected Save, fresh saved-JSON module loading and exact-byte Undo. The passing evidence directory is `.scene-system/transit-editable/run-aBjOIJ`.

`check-transit-editable-forms.mts` exercises the actual actor form callbacks, including recipe/controller/schedule edits and atomic rejection of invalid slots. `check-transit-content.mts` checks ordinary metadata and original gameplay. Immutable native rendering checks pass 72 Metro, 144 station and 270 Train cases. `check-metro-sessions.mts` passes 11,088 original platform/departure/queue/door cases and 211,200 ride frames. The package TypeScript build also passes. These are automated checks; the parent integration run owns browser Play and the all-game raster gate.

## Remaining specialist work

This migration does not replace the native transit state machine, captured skyline animation, braking logic, turnstile checkpoint or world route controllers with fully authored controller graphs. Their existing behavior and presentation remain active. Required architectural/controller composition IDs remain protected. These specialist controls need their own typed editor contracts before transit can be described as wholly authored gameplay.

The one-time transit extraction scripts were retired after the source lift. Their history remains in Git; use the authored documents and preservation checks for ongoing work.
