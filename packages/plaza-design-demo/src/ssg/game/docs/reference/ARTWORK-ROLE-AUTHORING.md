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

## C3 dependency audit: retained context and remaining extraction

These are dependency findings, not additional library categories. The current library keeps the
existing Reusable anywhere / Requires source context / Scene helpers choices.

| Family | Why some entries still require context | Remaining work |
| --- | --- | --- |
| Prepared characters | `actor.prepared`, `character.prepared`, `library.person`, train riders, platform passengers and the native LIME sprite consume an actor-owned pose and position. | Retain that explicit contract. Place ordinary people/animals/robots with `character.resident`; do not create a second actor clock in artwork. |
| Sequence parts | The intro network/skyline, fades, titles and taxi/act pictures consume their prepared sequence frame or viewport. | Retain sequence ownership and the shared frame director. Do not label an isolated screenshot as a portable object. |
| Scene envelopes | Whole-room fills, floors, sky/water bands, street surfaces and cutaway envelopes intentionally span the source frame. | Keep the supported scene/frame contract explicit; independent furniture belongs in its own row. |
| Connected machinery | Harbor cranes/forklifts and Terminal loads/gantries/watchdogs consume actual movers, cargo and shared source geometry. | Preserve physical ownership. Continue reviewing ordinary fixtures and actor-bearing stalls inside those assemblies for extraction. |
| Connected wiring | QA cable rows, the laundry conduits and Moth/Capsule desk cables use other authored endpoints. | Retain explicit endpoint references; separate a device body when that connection prevents independent placement. Preserve hover drawing order during any split. |
| Parent geometry | Window cutouts, wall trim, roof fittings, reflections and some Mall fronts/escalators use parent dimensions or source layout. | Review which dimensions can become own properties or scalar bindings. Remaining candidates include Mall fronts/escalators, Harbor stalls and ordinary train fittings. |

Audited local station signs/lamps/posts, Market stalls/booths/tickers, the QA trace meter, beach
stairs and the two Mall reflection patches do not require a source scene. Their registered
defaults are sufficient; native source bindings remain optional presentation inputs. Station
selection bounds now include their actual rods, mounting heights and spans down to the floor.
The remaining contexts are not all certified intrinsic: C3 remains open until those extraction
candidates and visual preservation have been resolved.

Harbor hut rear/front are independently placeable layers with width/height properties. Their
native front follows rear dimensions through explicit `scene.hutWidth` / `scene.hutHeight`
bindings; neither consumes the Harbor snapshot. Draw and selection anchors use the same dimensions.

The laundry schedule has no cable by default. Its explicit `cableConnected` / `cableTo` inputs
draw an optional connection on the same wall; native scene values bind its endpoint to washer 1.
The original body → cable → hover paint order is retained. The kernel does not read room geometry.
