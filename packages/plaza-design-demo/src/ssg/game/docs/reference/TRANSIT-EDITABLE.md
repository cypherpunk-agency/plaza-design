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

## Remaining specialist work

The metro ride is no longer native: the car is a Circuit mover (`train.car`, with its doors `train.doors` and the zones `tunnel` and `approach`) in the Train scene's own model, saved with the scene; its stations, siding, dwell, run, brake and halts are stops, paths and tuning in `scenes/train/devices.json`, all editable in the mover forms. The platform timetable is a function of the station scene's own scene time and its `platformShift` state. This migration does not replace the captured skyline animation, turnstile checkpoint or world route controllers with fully authored controller graphs. Their existing behavior and presentation remain active. Required architectural/controller composition IDs remain protected. These specialist controls need their own typed editor contracts before transit can be described as wholly authored gameplay.

The one-time transit extraction scripts were retired after the source lift. Their history remains in Git; use the authored documents and preservation checks for ongoing work.

## Where the transit code lives

Metro and Train are folder scenes (JSON only). The platform pictures come from the `station` binding provider (`station.train`, `station.departure`, `station.roof`, `station.pose.<actor>`, and for Downtown's platform `station.city`, `station.daylight`, `station.truss`, `station.roofLocal`), the car from the `train` provider (`train.frame`, `train.pose.<actor>`). The `transitPlatform` mechanism owns the train stop and the canopy cover, `citySkyline` the animated skyline that is saved with the scene, and `lineRide` the rules around the car (engine/gameplay/mechanisms/line-ride.ts: the brake and door effects, the read-outs, boarding and the home run); the car itself is the mover `train.car` (scenes/train/devices.json). The ride read-outs are pure functions of the movers in world/transport/line.ts; there is no ride state outside the model, and the platform timetable reads a `Timeline` of the station scene's time and `platformShift` (`View.timetable`). Rider preparation is engine/gameplay/transit-actors.ts and the platform frame world/transport/platform-frame.ts.
