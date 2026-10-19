# Scene bindings after the declared-scene pilot

2026-10-18. Scope: [feedback-ready package](../../ENG-05-08-PACKAGE.md).
All 19 shipping scenes retain registered compositions and their native scene factories. The table
describes remaining code ownership, not missing artwork. Existing simulation is retained rather
than forced into ordinary atomic commands.

| Scene | Shared authored behavior | Remaining native bindings/controllers |
| --- | --- | --- |
| harborShift | Scene routes, conversations, objectives/attention, story times | Carry presentation, actor poses, trolley/clamp drawing and prologue clock bridge |
| shop | Scene routes, persistent commerce, actor conversations | Shop geometry, actor/prop presentation |
| library | Scene routes, actor conversations, shared catalog | Native library device rules, terminal/session/security and visual bindings |
| laundromat | Scene routes, purchase/state, actor conversations | Washer cycle, puzzle callbacks, native device state and presentation |
| market | Shared paid fortune; cook/fish/repair/sleeper conversations | Other chatter/bot reactions, stall/actor geometry and native scene assembly |
| beach | Scoped native verb bindings, eligibility and initial wiring | Meter timing, ongoing billing/danger, remaining devices and scene controllers |
| sandbox | Frozen S13 source editing; separate demo device subset | Full QA device vocabulary, handlers, clocks, watchdog and native geometry |
| downtown | Shared objective-stage selector and access adapters | Save-field/capability bridge, native device rules, street actors, fixer dialogue, delivery/camera and geometry |
| capsule | Common runtime/access adapters | Opening/breakfast, native device rules, props and story transitions |
| yard | Common runtime/access adapters | Native puzzles, parcel/guard effects, actor reactions and geometry |
| moth | Common runtime/access adapters | Native puzzle sequence, watchdog/door state, narrative reactions and geometry |
| stacks | Common runtime/access adapters | Timed-state puzzle, native rules, geometry and narrative reactions |
| harbor | Common runtime/access adapters | Crane/vehicle/cargo simulation, actors and scene assembly |
| warehouse | Common runtime/access adapters | Cargo/workplace interactions, actors and scene assembly |
| mall | Common runtime/access adapters | Native vendors/ordinary interactions, actors and scene assembly |
| metro | Shared harbor transport permission | Platform timetable, boarding/arrival and native station assembly |
| galleriaStation | Shared harbor transport permission | Platform timetable, boarding/arrival and native station assembly |
| harborStation | Shared harbor transport permission | Platform timetable, boarding/arrival and native station assembly |
| train | Shared harbor transport permission | Continuous ride, siding puzzle, door timing and car assembly |

Generic bot reactions and other legacy chatter remain explicit exceptions. The further Market
batch does not claim to migrate those paths. Timing/security/physics controllers need declared
typed adapters before wider scene construction; ordinary manifest content cannot embed scripts.

## Isolated manifest pilot

`scenes/demo-manifest/{composition,scene,gameplay}.json` is registered with the source service,
portable bundles/history, Scene/Scene logic/Gameplay tools and the **Manifest pilot** Play tab.
The generic factory resolves spawn and interaction positions from composition instance IDs,
draws registered artwork through the shipping renderer, and uses shared objectives/commands.
Adding artwork or rebinding an ordinary interaction requires no per-instance TypeScript.

The initial contract supports ground-level ordinary interactions, objectives, registered standalone
art, and the existing private starting fixture. Scene-specific visual bindings, people, native
devices, readables, exits, timelines and world membership are outside this pilot. Validation rejects
unsupported controller bindings rather than silently substituting a native scene.

The pilot occupies the `shop` runtime role only inside an opaque private frame. It adds no campaign
scene ID, save destination or map membership. The map continues to index the shipping 19-scene
registry. Full scene creation/registration and world editing remain broader ENG-08 work.
