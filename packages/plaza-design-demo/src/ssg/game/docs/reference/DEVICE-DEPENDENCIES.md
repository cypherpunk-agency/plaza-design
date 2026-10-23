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
device objects. General device checks cover this ownership distinction across the current scene catalogue.

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

The former Downtown `reconcile` function reconstructed authentication, key grants and gate state from player flags/controlled nodes. It has been deleted entirely. Current-format saves already serialize guard `passed` and sector `open` metadata; `SceneHost.restore` restores that metadata after checking current references. Loading progress now preserves what was actually saved rather than manufacturing authentication/resources from flags. The six goal-marker predicates now live in Downtown gameplay onPersist triggers; the hardcoded syncGoals implementation and save.ts are removed.

This intentionally changes historical/injected-flags behavior: setting `till`, controlled-node or `end` flags alone no longer authenticates devices, grants clues or forces gate scalar state. Such shortcuts are not current-format save compatibility requirements. No replacement codec, alias or reconciliation evaluator was introduced.

## Proof

## Capsule explicit artwork ownership

## Five further geometry adapters removed

Yard3, Moth7, Library3, Laundry7 and Stacks4 positions now use explicit shared manifest.devices
bindings. The Library printer's -2 offset belongs to that source binding. The five corresponding
shipping helpers and editor adapter registry entries are deleted. Native factories and pending
Play consume the same common projector. Actual bound artwork must exist; detaching uses explicit
device source coordinates. It never infers a marker name from a device ID.

check-shared-device-geometry.mts PASS (`shared-device-geometry-9tc9nJ`) through actual typed forms,
old-marker deletion, native models, invalid refs, history/bundle/protected Save/fresh import/byte
Undo. Ten device source defaults/cables/primitive checks and the five original scene fixtures PASS.
Interiors10, Stacks22/NPC/tea, Yard native source/controller proof and both builds/tsc PASS.
Sourcead7e72626a90 passes173 original raster rows without differences/errors and targeted five-scene
native Play/Stop without warnings. Four size/offset-derived adapters remain to migrate through a
shared typed device extent/property contract; none is declared complete by this checkpoint.

## One device artwork projection

2026-10-20: all ten placement adapters and their editor routing table are removed. Common device
bindings optionally select widthProperty, heightProperty and heightOffsetProperty from their bound
artwork. Dimensions must resolve positive; offsets finite; scale/anchors and authored local offsets
use the existing world-point bounds. Controls are in the selected artwork's Device inspector.
Rebinding keeps compatible property refs; detaching copies the current projected spot into explicit
device source coordinates. No controller, old marker identity or fallback source is inferred.
