# Current device dependencies

Registered physical algorithms declare their current endpoint requirements in `SceneRules.needs.devices`. A requirement can name a world spot and actual noun/kind dependencies. `contractOf` carries these requirements into the shared data checker. The device editor uses the same requirements to protect primitive endpoints/nouns; ordinary endpoints are checked against the complete pending source graph instead of their historical presence.

Downtown is the first completed inventory: its DLV trajectory requires the `gate` and `dlv9` spots. Other endpoint references belong to editable routes, replies, network links and story content. Removing an ordinary endpoint requires changing those referring source documents atomically. It does not silently rewrite the story.

Beach and Yard declare empty static endpoint requirements. Beach billing/danger and Yard crane/parcel outcomes are authored workflows; Yard's native camera panel and physical hook presentation consume camera/state/geometry inputs rather than fixed device identities. Their physical drawing anchors remain protected independently. Pending factories receive actual device documents before projection, including Yard's inspection-only Hinge dialogue projected from the actual shared conversation.

Library, Moth and Laundromat likewise declare empty static endpoint requirements. Their former fixed puzzle policies (P16 port/reward layout; Moth's particular key/sequence seals and watchdog visit; four particular washer `done` events) are editable source decisions. Existing source references still validate the actual keys, sectors, watchdog nodes, event mappings, cables and rewards. Moth's desk/window/door geometry and Laundromat's washer/breaker/window drawing inputs remain native presentation dependencies. Laundromat projects inspection-only SUDS dialogue from the pending shared graph before native validation.

Downtown electronics drawings are presentation consumers. Their removal is permitted by bound-identity validation; actual primitive marker requirements remain enforced by composition validation. Device projection uses explicit `manifest.devices` bindings first. An unbound device can inherit geometry from an existing original marker; absence of that optional marker leaves its authored spot intact. The pending factory receives the actual device source before geometry projection, so a removed ordinary endpoint cannot be recreated from canonical defaults.

## Current primitive inventory

The historical device/noun/state floor and ID-filtered geometry path have been removed from
`authoring/device-sources.ts`. The unused `data/device-contracts.json` and its capture generator
are deleted. Native shipping assembly retains source device content and receives only projected
spot geometry from its native factory; it no longer replaces authored devices with whole default
device objects. General device checks cover this ownership distinction in all19 scenes.

Capsule and Sandbox also declare empty static endpoint requirements. Capsule's configurable
controller validates its actual router, companion, state and text references. Sandbox's pulse and
environment primitives do not require the original device collection. Actual present artwork
supplies its visual geometry; removing artwork also removes its optional conduit.

Train requires `train.position` (SENSE, tunnel and harbor siding events) and `train.brake`
(ACT, stopped event). Stacks requires `port.scanner` (SENSE, warm event) for its thermal simulation.
These event dependencies use the same noun-role contract as kind dependencies. Other endpoint,
watchdog itinerary and circuit dependencies are validated from their current source references.
Rebinding the circuit does not impose an original alarm noun identity.

This completes the endpoint-dependency inventory, not full all-scene authoring acceptance.
Architectural/presentation dependencies and the separate native gameplay vocabulary/state
identity restrictions still need final completeness review. Scene controllers, lifecycle and
source-bound whole-game visual verification retain their own gates.

## Persistence correction

The former Downtown `reconcile` function reconstructed authentication, key grants and gate state from player flags/controlled nodes. It has been deleted entirely. Current-format saves already serialize guard `passed` and sector `open` metadata; `SceneHost.restore` restores that metadata after checking current references. Loading progress now preserves what was actually saved rather than manufacturing authentication/resources from flags. `syncGoals` remains separate and still synchronizes goal markers with player progress.

This intentionally changes historical/injected-flags behavior: setting `till`, controlled-node or `end` flags alone no longer authenticates devices, grants clues or forces gate scalar state. Such shortcuts are not current-format save compatibility requirements. No replacement codec, alias or reconciliation evaluator was introduced.

## Proof

`check-downtown-endpoint-crud.mts` exercises real guard authentication, the actual Game save preparation and Host restore paths, repeated payout refusal and reset. It also covers explicit placement without the old marker, paired endpoint/art/story deletion, missing primitive and dangling-source rejection, source history/bundle/protected Save, a fresh saved-JSON shipping module graph and exact-byte Undo. `check-downtown-till.mts` retains the immutable original/current payout histories. This pilot does not sign off deletion/rebinding for the remaining corpus.

`check-beach-yard-endpoint-crud.mts` covers explicit default geometry, rebinding Kiosk/CAM-1 without original device markers, actual typed binding and endpoint deletion, strict remaining physical anchors and dangling references, native model/frame preparation, grouped history/bundle/protected Save/fresh shipping and exact-byte Undo. The kiosk deletion explicitly removes its billing workflow and replies; it does not silently retain invisible billing. Existing Beach workflow and Yard grab/hatch/drop parity suites preserve the unchanged default mechanics, including danger timing and parcel trajectories.

`check-moth-laundromat-endpoint-crud.mts` covers the same pending/runtime/editor/Save lifecycle for Mail/Clock endpoints and their optional pictures. Clock-owned cables are removed with the endpoint; dangling clock cables still fail. Alternate Moth seals/watchdog routing and a renamed washer completion event with its corresponding source mapping are accepted, saved and freshly imported, while a stale event mapping fails. The original Moth geometry/snapshot and Laundromat deadline/breaker/jacket parity suites preserve default presentation and outcomes.

## Capsule explicit artwork ownership

2026-10-20: all seven Capsule devices now bind their position through scene.manifest.devices.
Shipping uses the same shared projection as pending Play. Removed capsuleDeviceData and its
editor fallback entry; detaching/rebinding does not consult device-ID-derived marker names.
Dimensions remain in the device source. check-capsule-artwork-roles.mts now drives the actual
Device router artwork control, removes the old marker and observes the new spot through runtime,
history/bundle/protected Save/fresh shipping import/byte Undo (`capsule-actor-role-source-MRYxoN`).
Ten device source baseline/primitive/cable checks PASS with full scene source context. Capsule
controller/current-save proof PASS (`capsule-controller/run-UKFs3u`), interiors10 PASS, tsc/both
builds PASS; source3c2235688a3d has173 zero-difference/error raster rows and native Capsule Play/Stop.
Nine other scene geometry adapters remain; size/height property sources must migrate through a
shared typed contract before those adapters are removed. No old-save conversion or new owner.
