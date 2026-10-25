# Registered artwork geometry roles

Current reference, 2026-10-23. [ROADMAP.md](../../ROADMAP.md) owns priorities and completion status.
Retired migration gate numbers are not an active acceptance process.

`SceneDocument.manifest.artwork` binds registered picture roles to composition instance IDs.
`engine/gameplay/artwork-roles.ts` owns role/property contracts; `manifestGeometry` resolves
pending artwork and rejects unknown roles, missing instances and incompatible properties.
There is no second state, simulation, evaluator or executable document. Optional removal disables
its feature; it must not recover an original artwork ID from a fallback.

The Scene Content & bindings inspector exposes typed role selectors filtered by property contracts,
plus width source/artwork/property controls. Geometry that would strand an interaction rejects
atomically. Controller-specific physical anchors remain typed controller inputs; ordinary picture
geometry should use the shared role contract.

Examples include Warehouse orientation, shade and casters; Library orientation; Moth desk/door;
Beach sightlines and stairs; Capsule cable/door geometry; Mall atrium/escalator geometry; Harbor
cranes/loads/regions; Downtown surfaces/reflections; and Train car/window geometry. Actual bindings,
attachments and actor references must be rebound before their artwork can be removed.

Device position and extent projection uses `manifest.devices`, including explicit property names
for width, height and height offset. The former per-scene placement adapter registry is removed;
see [DEVICE-DEPENDENCIES.md](./DEVICE-DEPENDENCIES.md). Current consumers and validation, rather
than original object names or old migration fixtures, determine which dependencies are necessary.

Geometry roles do not certify independent asset reuse or complete editor coverage of algorithm
internals. Context-dependent drawing wrappers and embedded components remain a separate C3 audit.
Independent train fittings use `art/vehicles/train-fittings.ts`: cameras/poles receive a ceiling,
window frames receive width/sill/top, seats receive width, and the staff door needs only placement.
The native car and standalone registered pieces call these same functions. Prepared native state
can supply ceiling or window width; another scene can use explicit properties without a train frame.
The emergency brake similarly uses `art/electronics/emergency-brake.ts` with pulled/highlight inputs.
Ceiling lights, adverts/tells, car plates, Registry screens, handrails and straps now consume
their own properties and scalar visual inputs, including in the native train. Their source binds
width, ceiling, morning/news and motion values explicitly; these seven types have no room-frame
input or room-factory method. Registry pages use validated text arrays. The handrail has no
special geometry role, and the prepared layout no longer copies advert arrays or its height.
`check-train-scalar-fittings.mts` covers geometry, news scrolling, seeded swing and native scalar
binding; the ordinary authoring check exercises the new types and edited screen pages through Save.
SALT's independent bar layers use their own width unless a source binds the shared bar width;
the existing beach retains that link. The drink is its own `props.drink` instance attached to
the stool. Its presence binds to the existing device state, rather than the mixer painting at
another object's coordinates. Do not reintroduce drink-coordinate stage values or a proxy marker.
Use existing scene/vehicle geometry for behavior; these are drawing kernels with no state ownership.
Registered simulation mechanisms remain necessary where they own physical calculations; ordinary
conditions, dialogue and rewards belong in shared gameplay source.

Focused checks include `shared-device-geometry`, `artwork-role`, `scene-presentation`,
`scene-batch` and `all-scene-layers` (use `pnpm test:game --list` for current selector names).
Checks must exercise pending source, invalid edits, history/bundles and protected Save as applicable.

## C3 dependency audit: exact supported and retained contracts

These findings describe dependencies, not new library categories. The library keeps Reusable
anywhere / Requires source context / Scene helpers. No whole-scene snapshot is a certificate of reuse.

| Audited candidates | Result and owner |
| --- | --- |
| `mall.shop-front`, `mall.shop-interior`, `mall.shop-stock`, `mall.escalator-back`, `mall.escalator-front`, `mall.metro-door`, `mall.food-sign`, `mall.pillar` | Independent own ceiling/fascia/rise dimensions where needed; shop stock uses only its own style and width. Native source binds scalar room dimensions; no atrium snapshot input. Painting, bounds and landing/sign anchors use those same dimensions. |
| `harbor.fishStall`, `harbor.teaStall` | Own placement/width plus optional `vendorPose`. Native Harbor binds its prepared vendors; an unbound stall is usable without an actor or pier layout. Actor schedules remain with the actor compiler. |
| Harbor ordinary fixtures | `denInside`, `denTable`, `denDoors`, `denLamp`, `metroDoor`, `noticePost`, `podium`, `manifest`, `callBox`, `crates`, `bollard`, `rod`, `fishingBox`, `berthSign`, `taxi`, `ferryNotice`, `rails`, `beacon`, `portCamera`, `drawTerminalGate`, `hutBack`, `hutFront` already cancel source geometry/use own dimensions. The hut layers link width/height explicitly. |
| Train ordinary fittings | `drawCam`, `drawPole`, `windowFrame`, `staffDoor`, `seatBack`, `seatFront`, `ceilingLight`, `advert`, `adTell`, `carPlate`, `registryScreen`, `handrail`, `strap`, and the emergency brake use shared independent kernels. Optional native frame/scalar bindings supply dimensions, motion or news; default placement works without a car controller. |
| QA `sandbox.server-cables`, `sandbox.button-counter-conduit`, `sandbox.spool-cable` | Retain endpoint context: their entire drawing is a connection between actual device spots, not an embedded device body. The server rack, button/counter and spool bodies are already separate independently placed rows. |
| `laundromat.conduits` | Retain explicit breaker/washer endpoints. This row contains only conduits; breaker and washers are already independent bodies. `laundromat.schedule` has optional scalar cable inputs and draws no cable by default. |
| `moth.rig-shelf`, `moth.monitor` | Independent shelf/router body with optional desk cables; independent monitor with own stand height. Native source opts into linked desk cable/support geometry explicitly. |
| `moth.desk-signal` | Retain source context: only the workstation tell/hover bracket, located from the actual desk surface, with no embedded body to extract. The desk is already an independent row. |
| `capsule.plug` | Independent plug body; optional cable explicitly enabled by native source, with router/desk endpoints from scalar bindings. The router and desk are separate bodies. |
| Mall far-shell/shops/rails, gallery-back/front, ground-wall, floor, foreground-pillar | Retain room/storey context where they draw adaptive multi-storey or viewport-spanning architecture. Local fronts/interiors/stock, doorway/sign/pillars and escalators are the independently supported pieces above; shop/fountain/pillar reflections have their existing own dimensions. |
| Harbor cranes, arch machinery, forklift and connected cargo | Retain actual mover/cargo/source geometry. Their owner is SceneModel and the registered physical mechanism; do not introduce an artwork simulation. |
| Prepared characters, sequence parts and scene envelopes | Retain their explicit prepared-pose, sequence-frame or viewport contract. Use `character.resident` for independently authored people/animals/robots; never start an actor clock in artwork. |

`check-independent-fittings.mts` exercises the 13 newly independent registered types, source
scalar dimensions, shared projection, add/move/duplicate/property editing, undo/redo, bundle,
protected Save and fresh native reload. Existing train-fitting, train-scalar-fitting, Harbor hut,
wash-schedule, QA-fitting and artwork-role checks cover the already independent families. Approved
current visuals are checked separately without accepting regenerated snapshots.

Optional linked dimensions/endpoints remain presentation inputs, not saved state or hidden
fallback IDs. Native source opts in where the existing game uses a connection. Independent bodies
have visible unbound defaults; connection-only rows require actual endpoints. Preserve body → cable
→ tell/hover order when changing their shared kernels.
