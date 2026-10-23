# Transit authoring

Current C2 implementation, local and unpublished, 2026-10-23. ROADMAP.md owns acceptance status.

## One physical service

The regular line is `vehicle.frame` / `line0` in `scenes/train/composition.json`. Its cars,
doors, seats, route legs and berths use the shared vehicle contract. `train.car` and
`train.doors` are Circuit movers in `scenes/train/devices.json`; their paths and tuning
own dwell, travel, braking, siding snap and door safety. Boarding never restarts the train.
Platforms and departure signs observe that same model, including DELAYED during an emergency stop.
There is no platform timetable, phase offset or separate platform train simulation.

The regular line joins Downtown Metro, Galleria Station, Harbor Station and the P14 siding
through `world/zone-graph.json`. Physical boarding/alighting uses level floors and actual car
doors, preserving the player's position. Engine exit markers retain source geometry; they do
not execute old BOARD/OUT scene-cut actions. Ordinary stairs and doors remain scene exits.

Presence queries select the prologue service before the home transition and the regular line
afterwards. The same query gates the vehicle's floors, prompts and attached artwork.

## Passengers and narrative

Three `character.flow` instances in the train composition produce passengers at Downtown,
Galleria and Harbor. SceneModel owns their live queue, vehicle attachment, seats and alighting;
identity and appearance persist through travel and current-format restore. Named regulars
remain authored actors. The removed `platformQueue` and `trainCrowd` controllers have no runtime.
Rider looks retain their procedural recipe, clothing phase and pixel size in typed flow controls.

Station introductions use `introOnFoot`: passing through aboard the car does not consume the
one-time introduction. Successful alighting presents it through the existing dialogue path.
The siding's original response is authored in its scene introduction, not an alighting helper.
Goal-door pings use the actual vehicle door positions rather than obsolete OUT actions.

## Editor, inspection and native Play

Typed vehicle forms edit route, berth, doors, seats, authorization and presence inputs.
Companion documents validate together through the protected source store; private Play runs
those pending documents in the shipping Game. Frozen inspection uses the same world placement
and read-only query contracts, without ticking simulation. Prepared vehicle state also drives
selection bounds, so the picture and editor handles agree.

The `station` provider prepares departure and canopy artwork without a stop-artwork dependency.
The obsolete platform-stop roles/markers are removed; source berths own the train stops. The `train` provider prepares car
and named-rider presentation. `lineRide` supplies model rules for brake/door effects, journey
read-outs and the prologue's home run. `startRide` prepares explicit private-Play fixtures;
normal boarding does not call it. Stateless train drawing remains available as library artwork.

## Verification

Focused checks cover source geometry, four destinations, pass/brake/door branches, siding
introduction timing, passenger identity/restore, typed authoring, pending berth edits,
protected Save, read-only inspection and the original prologue commute. The six-case native
matrix now passes using protected saved sources and fresh opaque Play realms;
final visual acceptance is recorded in ROADMAP.md, with all 24 scene comparisons matching. Historic save compatibility is excluded.

Physical vehicle checkpoints retain a source address for the active leg, including a chosen
conditional branch, its elapsed time and its halt identity. The mover reconstructs that leg
from current validated source and leaves future choices in the normal queue. This prevents
mid-journey reload from parking a train at its previous station.
