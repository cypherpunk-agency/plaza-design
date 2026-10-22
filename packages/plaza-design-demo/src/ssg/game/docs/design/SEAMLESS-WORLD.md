# Seamless world: joined zones, vehicles and moving people

> **Proposal, 2026-10-22. Not implemented.** This is an engine design for discussion with Tommi.
> It was revised the same day with his answers, listed under **Decided** below. Nothing here changes
> current code or contracts until it is built. [ROADMAP.md](../../ROADMAP.md) owns priorities, and
> [ENGINE-HANDBOOK.md](../reference/ENGINE-HANDBOOK.md) describes the engine as it is.

Tommi's direction, 2026-10-22:

- The metro should be "a properly supported feature", not an engine hack.
- Passengers need "a proper subsystem for letting people move".
- Between station and street, "ideally no cuts".

How it works underneath is the engine's choice; what matters is how it plays. The first real pairing is
**Downtown street + Downtown Metro**. The station is underground, reached by real stairs down from the
street, and the turnstile is a barrier in the world, not a scene border.

## Decided (Tommi, 2026-10-22)

| # | Question | Answer |
| --- | --- | --- |
| 1 | Chunk size | No limit. The metro could connect the whole city. Loading is driven by proximity and visibility. Joining stays opt-in per place. |
| 2 | Moving shells | Not "moving buildings". **Vehicles** are a first-class engine concept (cars, boats, planes, sky-taxis, trains), all on one system. |
| 3 | People state | *Revised by 14.* People on screen keep their state. If you come back within about a minute you see the same people; after that, new people are fine. Off-screen people are pure functions of seed and time. |
| 4 | Station elevation | A per-station property. **Downtown is underground**: a subway under the street, reached by stairs down. |
| 5 | Train cars | The whole train is walkable, with gangways between cars. |
| 6 | Sun and weather | *Revised by 15.* |
| 7 | Quick-travel fades | Keep them. |
| 8 | Hack vision | *Revised by 13.* Hacking happens in the zone you are in. Whether you can hack across a seam is open, and depends on zone sizes. |
| 9 | Trains on the loop | Keep today's service as the player experiences it, with the same timing and frequency. No extra-trains design. |
| 10 | Interiors | An interior inside a connected scene is part of the chunk. Other scenes stay separate, with ordinary travel. |
| 11 | Memory | What is not visible need not be loaded. It loads when the player is near enough for it to matter. |
| 12 | Siding puzzle | The temporary exit to the pier is fine. |
| 13 | Cross-zone puzzles | **None for now.** No cross-zone cables or wiring ("we can cross the bridge when we confront it"). Hacking across a seam stays an open question until zone sizes are agreed. |
| 14 | Unloaded zones | **Reloaded, not replayed or frozen.** Persistent state comes back as saved. Transient things are rebuilt from the current time and seeds. Nothing that happened while unloaded is replayed. Consistency is not over-engineered. |
| 15 | Weather and sun | **Weather is city-wide.** Each chunk, or a zone within it, has a 360° compass facing. The sun is always worked out from the time of day and that facing. |
| 16 | Platform length | Open. Tommi wants to see train and platform sizes compared; a visual comparison is being made. |
| 17 | Stations | The **Galleria** station is inside the mall, the **Harbor** station is raised, and **Downtown** is underground. Other stations are decided per district. |
| 18 | Harbor replan | **Before M3.** The harbor, including the prologue's harbor shift, is replanned as several joined scenes. |
| 19 | Prologue | **Seamless from harbor to Downtown**, to show the engine; individual cuts are allowed. The harbor comes before Downtown + Metro. |
| 20 | Train length | **Two cars**, keeping three possible. |
| 21 | Names | **city → district → place** is logical (a place is a named area; a zone may hold several, a place may span zones). A **zone** is the one unit authored, saved, loaded and unloaded (today's scene). A **seam** joins two zones with no cut; an **exit** joins them with a cut. The **world** is the graph of zones over seams and exits. Storeys are **storeys/floors**, not levels. "Chunk" is dropped. Interiors may be split into more zones later; the zone graph must allow it. |
| 22 | Hacking across a seam | *Open.* Proposed: what is on screen can be hacked, since visible zones are loaded; wires between zones stay out (13). |

## 1. Goals and non-goals

**Goals**

1. Walk between joined places with no cut. Downtown street to Downtown Metro comes first.
2. Board, walk through, ride and leave vehicles with no cut. Platform, train and ride are one
   continuous experience.
3. Moving people: routes, waiting, queueing, boarding, sitting or standing, alighting and walking on. This
   replaces today's spawn and despawn: `platformQueue` hides waiting riders once they have `boarded`, and
   `trainCrowd` reseeds the car at each stop.
4. Turnstiles, gates and doors become access barriers in the world, using the same access rules as exits.
5. Joined places of any size, up to a city-wide metro network, with only the nearby part loaded.
6. Everything is authored in the editor through typed controls that save.

**What "no cut" means.** Inside a *chunk* (§2), between any two frames:

- the player's position, the camera and every visible object move continuously;
- nothing teleports, and there is no black frame, fade, wipe or held input;
- a barrier may stop the player, but in the world (a turnstile visibly shut), not as a transition;
- the HUD's place name may change. That is a label, not a cut.

| Transition | Policy |
| --- | --- |
| Joined zones in one chunk (street ↔ station, platform ↔ train, train ↔ next station, an interior inside a joined scene) | **Never** a fade or a cut. Continuity is required. |
| Ordinary scene travel to places outside any chunk | Stays as today: an instant change (`travel`). |
| Explicit quick travel (the map hop, `HOP` = 40 frames of fade) and the taxi flight cinematic | **Keep** the fade and the cinematic (decided). |
| Story cards (sleep, "wait until…") and cutscenes | Out of scope. They cut time, not place. |

**Rejected alternative: a seam exit with a short fade.** It is the cut Tommi wants gone, and it hides
continuity problems instead of solving them.

**Non-goals.** Physics for people, and compatibility with historic save formats (already excluded). The
whole city is *not* required to be one chunk: chunks are opt-in. But the engine must not stop a chunk from
becoming that large.

## 2. World model: zones and chunks

### Terms

- **Zone**: today's scene, unchanged. It keeps its scene id, folder (`scenes/<id>/`), SceneModel,
  SceneHost, save block (`save.scenes.<id>`, `save.gameplay.<id>`), its place in `SCENE_PLACE` and its seen flag.
- **Chunk**: an authored, connected **graph** of zones joined by seams. It can have any number of zones.
  A zone belongs to at most one chunk.
- **Seam**: an edge of that graph. It fixes how two zones sit relative to each other (an offset `{dx, dh}`)
  and how the player crosses between them (walk, stairs or door).
- **Vehicle**: a first-class entity that moves through the zones of a chunk along a route (§4).

**There are no global coordinates.** A chunk such as the metro network loops (LINE 0 is a ring) and can grow
city-sized, so it has no single fixed frame. The engine uses a **floating origin** instead. The active zone
(where the player stands) is at `(0, 0)`, and every other *resident* zone is placed by walking seams outward
from it, shortest path first. This keeps numbers small, makes loops harmless (only nearby zones are placed)
and makes a chunk's size irrelevant to the frame. Each authored seam offset is validated by
`chunkProblems`; for example, two paths to the same nearby zone must agree.

### Source

The chunk source is a new world document, `world/chunks.json`, registered in
`authoring/source-documents.ts` beside `city.json` and `metro.json`. A pure module, `world/chunks.ts`, holds
`compileChunk`, `chunkOf(sceneId)`, `placeFrom(chunk, activeZone, radius)` and `chunkProblems`.

```json
{ "version": 1, "chunks": { "downtown": {
  "zones": ["downtown", "metro"],
  "seams": [ { "id": "metro-stairs", "kind": "stairs", "dx": 1180, "dh": -110,
               "high": { "zone": "downtown", "piece": "metro-stairs" }, "low": { "zone": "metro", "piece": "street-stairs" } } ],
  "facing": 80
} } }
```

In this example the Metro zone sits 110 units *below* the street. A zone may override `facing`.

**Station elevation** is a per-station property:
`elevation: "underground" | "raised" | "indoor" | "surface"`, set on `city.json` `STATIONS` and edited in
City & travel › Stations. It has three effects:

- it sets how the station joins its street: stairs down, stairs up, or a door or walk seam into the building
  around it;
- it picks the station kit preset:
  - underground: a ceiling slab, tiled walls and no sky;
  - raised: piers, a canopy and the `citySkyline` view;
  - indoor: the host building's interior;
- it sets whether the station's floors are `indoor` for lighting.

The decided stations are:

- **Downtown**: `underground`. The current Metro art (piers, girder, skyline) is a raised platform, so step 4
  redraws it, with before/after shown for review.
- **Harbor**: `raised`.
- **Galleria**: `indoor`, inside the mall. By the interiors rule it joins the mall's chunk.

Other stations are decided per district.

### What a zone owns and what the chunk owns

| Owned by the zone (unchanged) | Owned by the chunk |
| --- | --- |
| Composition, scene.json, gameplay.json, devices.json | Seams and their offsets |
| SceneModel: devices, movers, zones, clocks, watchdogs | **A 360° compass facing** (decided), which a zone may override |
| Level pieces (floors, stairs, lifts, shells), compiled locally | The merged level the player walks over resident zones (`mergeLevels`) |
| Its lights, casters and shade bands | One camera and its clamps (union of resident zone rects) |
| Its distance and backdrop layers, clipped to its window | Sky, weather sky, sky traffic, weather front and grade, drawn **once** |
| Phases, intro, objectives, people flows | Residency: which zones are loaded (§3) |

**Weather is city-wide** (decided). It is one world-level weather, no longer chosen per scene: the per-scene
choice through `setHereClimate(sceneClimate(id))` goes, as does any per-chunk weather. The city clock and time
stay world-level, as now.

**The sun** is always worked out from the time of day and the facing of the chunk or zone. This is what
`lightAt(day, min, facing, weather, outdoor)` already does. `lightHere` reads the chunk's facing, or the
zone's override, instead of `SceneDef.facing`. The light therefore changes between chunks believably, and
inside a chunk an override is only used where the change makes sense, such as around a corner or indoors. At
Downtown the old flip (street 80°, platform 270°) goes away: the platform is underground and indoor.

### Interiors

An interior inside a connected scene is part of the chunk. A shophouse interior or a lobby that sits inside
a joined zone's level (a `level.shell` with `level.interior`) is walked into as today; no change is needed.
An interior that is currently a separate scene behind a door joins the chunk through a `door` seam when it
sits inside a connected scene. All other scenes stay separate, with ordinary travel.

### Joining

- **Horizontal** (`kind: "walk"`): zone A's right edge meets zone B's left edge. Inside a chunk,
  `walkOff` does not fire there, and the edge exits it uses today (`SceneExit.edge`) become seams.
- **Vertical** (`kind: "stairs"`): one end of a `level.stairs` piece lies in each zone. `mergeLevels` (new,
  in `engine/level.ts`) translates each resident zone's `LevelSource` by its placement and joins the two
  ends into one `LevelLink`. `levelStep`, `levelUp`/`levelDown`, `levelHints` and `nearestPrompt` then work
  unchanged. The flight is real: ↑ steps on and ←/→ walk it.
- **Door** (`kind: "door"`): a `level.door` whose floors are in two zones, as for interiors.

**Which zone is "here".** It is the zone that owns the floor the player stands on. On a flight, it is the
zone of the end the player left from, and it flips at the midpoint. Each host receives `model.player` in its
local coordinates when the player is in it, and `null` otherwise. A zone that watches the player therefore
never fires across a seam.

### Saves, ids, places, travel and access

| Concern | Mapping |
| --- | --- |
| Scene ids and save blocks | Unchanged. The chunk document is source, never save. |
| `save.scene` (Continue) | The zone the player stands in. Resume uses its spawn and makes its neighbourhood resident. |
| Seen flags | `markSeen` runs on each crossing that changes `here`, and persists once. |
| City places | `SCENE_PLACE` is unchanged. |
| Quick travel | `placeBlocked` is unchanged except that "YOU ARE HERE" checks the active zone's place. A hop into a chunk zone is an ordinary `enter` with its fade (kept). |
| World access policy | `city.json` `ACCESS` may name a barrier (`{ "barrier": { "scene", "id" } }`) as well as an exit. `accessPolicy` calls a new `barrierAccess` in `world/access.ts`, built on `nativeAccess`/`evaluateAccess` like `sceneExitAccess`. |
| Exits between joined zones | Removed in favour of the seam: Downtown `metro` and Metro `downtown`. `validateDeclaredDestinations` and `all-scene-world-routes` learn about seams. |

### Backdrops across a seam

Sky, `weatherSky`, `skyTraffic`, `weatherFront` and `drawGrade` move out of the zone and are drawn once per
chunk frame. Each zone's distance layers are drawn clipped to its **window**, which is its rect projected at
each layer's parallax.

For Downtown the handover is simple because the station is underground. Downtown's street, with its
`streetLayers` city and street moments, is above the ground line. The station's walls and slab are below it.
The street's ground is the station's ceiling, so a camera on the stairs sees both in cross-section. Raised
stations (the Harbor) keep `citySkyline`, which advances once per painted frame while its zone is drawn.
`renderDowntownStreet`, the borrower path the back yard uses today, is the precedent for sharing a zone's
backdrop.

## 3. Runtime

The **one runtime** rule holds. `runtime/game.ts` `stepLoop` stays the only loop, and the existing
`this.hosts.forEach(h => h.tick(sceneMs))` ticks whatever is hosted. A chunk is data plus pure functions that
the loop reads. There is no chunk manager with its own tick.

### Residency: load by proximity and visibility

Residency is decided each frame by the pure function `residency(chunk, camera, player, vehicles)` in
`world/chunks.ts`. The loop applies its answer through `hostOf` and a new `evict`.

| Tier | Rule | What happens |
| --- | --- | --- |
| **Active** | The zone the player stands in | Today's behaviour. |
| **Visible** | The zone's window intersects the camera rect plus 64 units | Hosted, ticking `live` (cues and captions), drawn. |
| **Near** | Within the prefetch distance: 1.5 × view width of the camera rect along seams, or a vehicle carrying the player arriving within 10 s (`movers.etaTo`) | Hosted and ticking, not drawn. Compiled one zone per loop frame, then its caches are warmed with one offscreen `preparePresentation`. |
| **Unloaded** | Beyond the eviction distance (3 × view width), with no panel or dialogue open | `persist()`, then the host is disposed. Its save block stays. |

**A zone stays loaded only while the player is in it or near it, or while one of its panels or dialogues is
open.** Nothing else keeps it loaded: running timers, mover trips, trace and watchdogs do not.

- **Budget**: at most 8 hosted zones. If the near set would exceed that, the prefetch distance shrinks,
  nearest zones first. Active and visible zones are never unloaded. Measure retained heap with the existing
  recorder over repeated walks, and tune the number from that.
- **Visited scenes outside chunks** follow the same rule. Today every visited host is kept and ticks forever;
  under this proposal they unload after you leave.

### Unloaded zones are reloaded (decided)

"Unloaded zones neither keep running nor pause, they're sort of reloaded" (Tommi). **Unloading a zone does to
it exactly what reloading the page does to a scene today.** `persist()` writes the save, and loading rebuilds
the host from that save, as Continue already does (GAME-DATA.md "Saves"). Nothing that happened while it was
unloaded is replayed. The system is built so that as little as possible depends on time passing:

| Kind | On reload | Examples |
| --- | --- | --- |
| **Persistent state** | Restored exactly as saved. No simulation on return. | Doors opened, devices set, cables, items taken, puzzle progress, goals, mover stops (a trip under way is saved settled, as today), trace (as saved) |
| **Transient things** | Rebuilt from the current time and seeds | People, traffic, ambient motion, trains on the timetable (the station's `service` path is placed at its phase for the current time), watchdog patrols and clocks (placed by time, so leaving is no way to freeze or reset a patrol), the skyline |
| **In flight** | Dropped, as on a page reload today | A timer counting, a delayed signal, a parcel in the chute, which comes back on its hook |
| **Wall-clock lockouts** | Unchanged: they already follow wall time | A lockout ending at a stored `Date.now` time |

Consistency is not over-engineered (decided). Tommi will say if something bothers him.

| Example | What happens |
| --- | --- |
| **A timer puzzle you walk away from.** A `timer.so` part holds a service door at the Metro open for 20 s, and you go up to the street. | The Metro is near, so it stays loaded and the door shuts on time. If you go far enough for it to unload before the timer ends, the timer is dropped, as on a page reload, and the door is in its saved state when you return. |
| **A train in transit you are not on.** The Galleria platform's service keeps running. | The Galleria station is unloaded. When you ride towards it, it loads at 10 s ETA and its `service` path is placed at the phase for the current time. The train due there is where today's timetable would put it. |
| **The train you ride.** | Its zone stays loaded, because you are on it. The stations it leaves become near, then unloaded. |
| **A kettle boiling** in a capsule that is part of the chunk. | If you stay near, it boils. If you go far, the capsule unloads, and the boil is in flight, so it is dropped: the kettle is in its saved state when you come back. |
| **People walking.** A commuter goes off camera down the stairs, and you leave. | Back within about a minute: the same people (§5). Later: new people, from seed and time. People with routines (a neighbour who leaves for work at 07:40) are derived from seed and city time, so they are consistent for free. |

The rejected alternatives are **replaying** the time away (catch-up) and **freezing** a zone's time while
unloaded (the world visibly waits, which can be exploited). Neither is a mode.

### Changes in `runtime/game.ts`

- **`enter(id, quiet, at)`** stays the cut path for ordinary travel and quick travel.
- **`crossInto(zone)`** (new) handles a seam crossing. It sets `here` and runs `markSeen`, the host tiers,
  `syncHud`, the first-visit intro and the phase `ride`. It does not call `closeAll`, reposition the player,
  place the companion, play `sound.open()` or clear the bubble. It re-bases the floating origin: resident
  zones are re-placed relative to the new active zone, and the player, camera and companion are shifted by
  the same offset in the same frame. That keeps the shift invisible.
- **`walkOff`**: an edge with a seam is open floor.
- **The camera** (the follow block near line 1190, and `onResize`'s `fitW`/`levelW`): clamps to the union of
  resident zone rects, and `camH` to the merged level's `low`/`high`. A zone may mark an edge `hard`.
- **`view()`**: one `SceneView` per drawn zone, with `cam - placement.x` and `gy + placement.h`.
- **Prompts**: candidates come from all visible zones within `PROMPT_REACH`, and the owning host acts.

`engine/host.ts`: `show(on)` becomes `show(tier)`, and `tick` passes `live` for the visible tier as well.

### Drawing: `runtime/render-scene.ts`

Add `renderChunkFrame(frame: ChunkFrame)`. `renderSceneFrame` becomes its one-zone case, so every existing
scene paints as before and the `scene-parity` goldens stay valid. The order of passes:

1. Prepare: the chunk light (compass direction and weather), and `preparePresentation` for visible zones.
2. Sky, `weatherSky` and `skyTraffic`, once.
3. For each visible zone, back to front, clipped to its window: city and street moments, `zh.draw`,
   puddles, `weatherMid` and casters. Vehicles in that zone are drawn here (§4).
4. Zone actors, then the player and the companion once and unclipped.
5. Front passes, clipped. Then shade, grade, merged lights, `weatherFront`, prompts and bubbles, once.

### Hack vision near a seam

There are no cross-zone puzzles for now (decided): no cross-zone cables and no wiring across a seam.

- Vision belongs to the active zone's host (`SceneHost.vision`, `visionCamera`).
- Neighbouring visible zones are drawn fully muted (`muteWorld` with no device holes).
- Cables stay within a zone, saved in its `links` as today.
- Crossing a seam closes vision, as leaving a scene does today.

Whether you may hack a device you can see across a seam ("if I can see across the zone it would be
unreasonable not to hack") is an open question. It depends on how large zones are, and that needs agreeing first.

### Performance budget near a seam

The baseline (PERFORMANCE-RECORDING.md, 2026-10-19, 960×540 CSS, DPR 1.25) is Downtown render CPU p50 11.6 ms
and p95 14.2 ms, and Market p50 5.2 ms. The Metro has not been measured. A 60 Hz frame is 16.67 ms.

| Rule | Budget |
| --- | --- |
| Shared passes drawn once; zones culled to their windows | Neighbouring zone ≤ 2.5 ms p50 extra |
| Seam frame, Downtown + Metro | ≤ 16 ms p95 render CPU on the reference machine |
| Near and unloaded zones | No render cost. Near-zone ticks ≤ 0.5 ms per zone. A reload compiles over spread-out loop frames, one zone per frame. |

Add the workloads "Downtown seam walk" and "metro ride, two stations" to `scripts/performance/workloads.ts`.
The recording doc warns that the harness ran at about 1 s RAF cadence, so these are CPU-submission numbers,
not FPS promises. No quality, DPR or population cuts are made to meet the budget.

## 4. Vehicles

A **vehicle** is a first-class level and world entity: a **shell with its own frame of reference**, whose
pose (x, h and optionally tilt) is driven by a Circuit mover. It may have an interior, doors and seats. Anything
standing in its interior, the player and people alike, is held *in the vehicle's frame*. The player is
therefore carried without drift: their position is stored in vehicle-local coordinates, not nudged frame by
frame. It is not a building that happens to move. Buildings and vehicles share the level kit's floors, shells
and reveal, and the vehicle adds the moving frame, a route, doors, seats and gangways.

### Source

- A vehicle is authored as its own composition. The Train scene (`scenes/train/`) is the train's.
- A new `vehicle` block in scene.json `stage` holds:
  - `mover` (the frame driver, e.g. `train.car`);
  - `cars` (segments joined by gangways);
  - `doors` (each bound to a doors mover and an opening threshold);
  - `seats` (rests);
  - `route` (below).
- The pieces `level.vehicle-door`, `level.gangway` and `level.seat` join the level kit in
  `art/levels/elements.ts`. `compileLevel` emits `LevelSource.vehicle`.
- **Route**: maps the mover's position to a zone and a local x and h. For example:
  `[{ "from": "downtown", "zone": "metro", "x": 640 }, { "between": ["downtown", "galleria"], "zone": "tunnel-dg" }, …]`.
  This is how a train on a ring of 9000 passes through station and tunnel zones.

### How it generalises

| Vehicle | Mover | Interior | Notes |
| --- | --- | --- | --- |
| Metro train | `train.car` on a ring, x axis | Walkable, several cars with gangways | Doors driven by its legs (`drives: "doors:shut"`) |
| Lift cabin | Mover on `h` (today's `LevelLift.device`) | Walkable, one floor | Level lifts can move onto vehicles later |
| Ferry, boat | Point stops `{x, h}` | Walkable deck | A bob from the water function is presentation only |
| Sky-taxi, plane | Point stops, multi-leg paths | Walkable cabin, or none | `tilt` from the path tangent |
| Street car, DLV-9 van | `dlv9.chassis` | None (shell only) | It can still carry riders seen through its windows |

Curved paths are multi-leg point paths. A new leg option, `via` (one control point), smooths a leg into a
curve. Drops are legs with `ease-in` or a timing table. Both are extensions to `engine/movers.ts` that its
existing mover forms edit.

### Doors, gangways, carrying

- **Doors**: a door edge of a vehicle floor is passable only while its door mover reads at or above the
  door's threshold. This is today's `platformOpen` rule, read from the mover.
- **Gangways (decided: the whole train is walkable)**: a `level.gangway` joins the floors of neighbouring
  cars into one walk.
  - The Train composition grows from one 1200-unit car to the full consist.
  - Platform and train length is open (decided 16). A visual comparison of train and platform sizes is being
    made for Tommi. The options are to lengthen station zones, to shorten the cars, or to let a shorter
    platform show the rest of the train in the tunnel mouth.
- **The camera** rides with the vehicle while the player is in it.
- **The shell's reveal** works like a building's: walking in fades the exterior to its `ghost`.

### The metro without a cut, keeping today's service

Today, three separate things make up the metro:

- the platform train is a timetable (`line.ts` `platformTrain`, drawn at track parallax 0.94);
- the ride is the Train scene's `train.car`;
- boarding is a cut (`enterTrain` → `boardRide` → `travel`).

The player-facing service stays as it is, with the same timing and frequency (decided).

1. **The platform train becomes a vehicle in the station zone.** Its mover runs one `service` path built from
   today's `TIMETABLE`: arrive, dwell, leave, wait, repeat. The path starts at today's `OFFSET`, so each
   platform keeps its rhythm. It is drawn at the player's plane (parallax 1), using the Train composition's
   shell, so its doors are where the player walks. `platformDoors`' parallax correction goes away.
2. **The swap, in one sentence:** when you step aboard a train standing at a platform, the engine makes it
   the train you ride, the Train scene's car, at the same spot, with the same open doors and the same
   people, so nothing on screen changes.

   This is today's `boardRide(from, ahead)`. When you arrive at a station, the reverse happens: the station's
   `service` mover is set to the dwell, which replaces `platformShiftFor`/`PLATFORM_SHIFT`.
3. **Departure**: the camera rides with the car. The station slides away and the train runs on along its
   route into the tunnel zone, which is an authored zone using `train-scenery.ts` and the `train` provider.
   The station becomes near, then unloaded.
4. **Arrival**: the next station is prefetched once `etaTo` is under 10 s, and becomes visible as the car
   runs in. The doors open and the player walks out across an ordinary seam. Each station's `elevation`
   decides how it joins its street. Harbor's raised platform has stairs down to the pier. Galleria's indoor
   platform opens into the mall, which then belongs to the same chunk.

**P14, brake and siding.** The brake (`SceneModel.brake`, snap to `siding`) is untouched. A small siding zone,
a service ledge, sits on the route at `SIDING` (ring 5350). With the doors cable rewired, the player steps out
onto it without a cut. Its stair to the pier is a **temporary ordinary exit** to `harbor`
(`TRANSPORT.siding`), which is acceptable (decided). If the replanned harbor (step 5) leaves room for it, the
stair becomes a seam into the harbor chunk. `train.car` saves are unchanged, the scene id stays `train`, and
`startRide` fixtures keep working.

**Harbor replan, before M3 (decided).** The harbor, including the prologue's harbor shift
(`?play=harborShift`), is replanned as several joined scenes: the pier, the raised Harbor Station, the work bay
and the checkout. It is a design pass followed by a build (step 5). It comes before M3 (shift → commute → home),
so M3's commute starts from a joined harbor.

## 5. People movement

### Model

- **Route** (a composition piece, `people.route`): a polyline of waypoints, possibly crossing seams or
  boarding a vehicle. Each waypoint has a behaviour:
  - `walk`;
  - `wait` (a dwell);
  - `queue` (a line of slots that shuffles forward);
  - `board` (a vehicle door);
  - `sit` / `stand` (the seats and standing spots of a vehicle or a bench);
  - `alight`;
  - `leave` (an edge or a door, out of view).
- **Flow** (a piece, `people.flow`): a route, a spawn rate by city hour, a density cap per zone and a kit
  preset.
- **Cohort**: the people a flow produced for one vehicle trip or spawn interval.

### State: kept while on screen, briefly remembered, otherwise seed and time

| Where the cohort is | State | Kept |
| --- | --- | --- |
| In a **visible** zone, or aboard a visible vehicle | Declared: `{ flow, step, since, seed, at, vehicle? }` in a `Flows` table inside the zone's SceneModel, on the existing tick (`engine/people.ts`, pure rules; like `Zones` in `engine/model.ts`). Transitions fire on mover events that already exist (`train.doors` arriving `open`/`shut`). | Yes, while the zone is loaded |
| The zone has just unloaded, or the page was just reloaded | A **short memory** of the people last on screen: a new `SceneSave.people` field with an expiry stamp (city time + `peopleMemory`, default 60 s) | Within the memory: the same people, where they were. After it expires the memory is ignored and cleared. |
| Off screen, or after the memory expires | A pure function `routeAt(route, seed, phaseStart, now)`. Ambient walkers keep `walkAt`. | No. People are rebuilt from seed and time, so after a while they are new people. |

- **Routines are free.** A person with a routine (lives in 4B, walks to the metro at 07:40, comes back at
  18:10) is a flow whose seed and timetable come from the city clock. They are where their routine says
  whenever you look.
- **Handover**: when a zone becomes visible, its pure cohorts are *materialised* into declared state at their
  pure pose, so nothing jumps. When it stops being visible, its declared cohorts go into the short memory.
- **The vehicle carries cohorts** in its frame, so the same seed is seen on the platform, through the window
  and inside. That removes today's mismatch between the platform seed and the car seed.
- **Named regulars** (MAN WITH A PAPER) keep fixed actor routes in scene.json.
- **Density cap**: a proposed 12 people per visible zone.

### Editor

See §6.5. Actor authoring replaces the rider controllers `platformQueue` and `trainCrowd` (in
`actor-authoring.ts`, `actor-presentation.ts` and `actor-frame.ts`) with `flow`.

## 6. Editor: everything is authored here

Editability is the priority (Tommi, 2026-10-22: "It has to work all with the editor."). Tommi authors
everything in the editor, and nothing in this design requires hand-editing JSON. Every control below is typed
and edits the same source that private Play runs. Every change goes through ComposerModel history, document
bundle validation and protected Save, as the existing editor does (authoring/README.md). There is no
editor-only evaluator: previews call the same `renderChunkFrame`, `mergeLevels`, `residency`, mover and flow
functions as the game.

### 6.1 Chunks and seams (steps 1, 4 and 5)

**World › Chunks** (`authoring/chunk-authoring.ts`, registering `world/chunks.json` in `source-documents.ts`):

- **Create a chunk** with *New chunk* and a name. *Add zone* opens a picker of catalogue scenes. A scene
  already in another chunk is shown greyed, with its owner.
- **Place zones** on a layout canvas that shows each zone live, at its real size, painted by
  `renderChunkFrame`. Drag a zone to place it:
  - beside another, its edge snaps edge to edge and its ground line to the neighbour's;
  - above or below another, its ground line snaps to one of the other zone's floor heights, chosen from a
    list of that zone's floors.

  The offsets (`dx`, `dh`) are shown as number fields for fine adjustment, so they are never typed blind.
- **Draw seams** with a seam tool:
  - *Walk*: click the shared edge.
  - *Stairs*: pick an existing `level.stairs` piece in one zone and a landing floor in the other, or choose
    *Add stairs seam*. That places a new stair piece whose high end lands on the upper zone's floor and whose
    low end lands on the lower zone's floor, owned by the zone you pick.
  - *Door*: pick a `level.door`, which is how a separate interior scene joins the chunk.
- **Live neighbours while editing one zone.** In the scene composer, the *Neighbours* toggle (on by default
  for chunk zones) paints every adjoining zone live beyond the seams. They are animated, slightly dimmed and
  labelled with the zone's name. Double-clicking a neighbour opens it in the composer at the same chunk
  position, so the view does not jump.
- **Alignment check.** Selecting a seam opens an inspector with both sides' numbers, for example:
  - "street floor h 0 ↔ stair top h 0 ✓"
  - "stair foot h −110 ↔ platform floor h −104 ✗ (6 units)"

  A tolerance of 0.75 units (engine/level.ts `near`) decides ✓ or ✗. The layout canvas marks a ✗ in red at
  the landing. *Align* fixes it in one undoable command, either by moving the seam offset or by moving the
  stair end, as you choose.

### 6.2 Editing across zones (step 1, with moving pieces in step 4)

- **Every piece belongs to exactly one zone**, the composition it is saved in. The outline groups pieces by
  zone. Selection boxes and handles are tinted with the zone's colour, with a badge naming it.
- **Selecting near a seam**: a click picks the topmost piece under the cursor, in whichever zone it is.
  *Alt*-click cycles through overlapping pieces. Selections may span several zones.
- **Moving a piece across a seam**: dragging a piece over a seam shows "Move to metro?". Confirming is one
  grouped command. It removes the piece from one composition, adds it to the other at translated
  coordinates, and carries along its attachments. If the piece is bound to the old zone's manifest roles,
  devices or actors, the command is refused with the reason, and the existing rebinding helpers are offered.
- **Undo and Save across zones**: an edit touching several documents (two compositions and `chunks.json`) is
  one ComposerModel history step and one prospective bundle. Protected Save writes all of them or none. That
  is the existing atomic-rejection rule, extended to the whole chunk.

### 6.3 Chunk settings (step 1, with residency in step 3)

| Setting | Control |
| --- | --- |
| Facing | A **compass dial** (0–359°, with N/E/S/W marks) on the chunk, and an optional override per zone. A sun preview scrubs the time of day and shows the light and shadow direction. Weather is city-wide, so it is not set here. |
| Residency | Number fields with defaults and *reset*: prefetch distance (1.5 view widths), eviction distance (3), vehicle ETA prefetch (10 s), hosted budget (8) |
| People memory | How long the people last on screen are remembered after a zone unloads (default 60 s) |

### 6.4 Vehicles (steps 6, 8 and 9)

- **A vehicle is a kit.** *Add artwork › Vehicles* offers kit presets (train consist, shuttle, lift cabin,
  boat, sky-taxi, shell-only van), following the kit-presets direction. Choosing one creates a vehicle scene
  from the catalogue, with shell, interior and default mover.
- **The vehicle workbench** (`vehicle-workbench.ts`, extended) edits the vehicle as one object:
  - **cars**: add, remove and reorder cars, each with a length and an interior preset; gangways are created
    between neighbouring cars automatically;
  - **doors**: door pieces snap to the car's door bays, each bound to a doors mover with an opening threshold;
  - **seats and standing spots**;
  - **the shell's** `ghost` and reveal speed;
  - **the frame**: pick or create the mover part (stops, paths, legs, curved `via`, drops) through the
    existing mover forms of Logic › Devices, opened in place.
- **Route**: a strip along the mover's axis, with zone segments (stations and tunnels) dragged onto stops. It
  shows ring wrap for a loop line.
- **Binding to stations**: in a station zone, a `vehicle.berth` piece marks where the vehicle stands. The stop's
  place is measured from it (`{ "place": "berth" }`). The berth inspector checks that the vehicle's doors meet
  the platform's queue spots and barriers. The station's `service` path (today's timetable values) is edited
  as mover legs.
- **Preview**: a play button and scrub slider run the mover's paths in the workbench and in the chunk canvas.
  Both show the vehicle passing through zones, doors opening and docking. A *ride along* camera follows it.

### 6.5 People flows (step 7)

- **The route tool**: click waypoints onto floors. They snap to floors, stairs, vehicle doors, seats, benches
  and queue spots, including in neighbouring zones across seams. Each waypoint is a chip with a behaviour
  select (walk, wait, queue, board, sit, stand, alight, leave) and its parameters: dwell seconds, queue slot
  count, which door.
- **The flow inspector**: its route; a rate-by-hour curve (24 bars, dragged); a density cap per zone; a look
  preset (kit presets).
- **Preview**: a time scrub and *play flow* animate cohorts in the composer, including boarding a vehicle
  previewed at its berth. An optional density heat strip shows where people bunch. The preview never writes save
  state.

### 6.6 Barriers and access rules (step 2, with the turnstile in step 4)

- **Pieces**: `barrier.turnstile`, `barrier.gate` and `barrier.door`, each with styles, a passage width and an
  optional opening device.
- **Readable rules**: the inspector writes the access list as sentences, for example "Opens when: you carry
  MAGLEV PASS · Refuses with: 'CARD NOT VALID'". Each row is edited with the existing gameplay condition picker
  (`validateAccess`), and has a *hidden while shut* checkbox.
- **Phase overrides**: in Scene › Story phases, for example "In phase home: verify 150 frames, ok 50,
  milestone street". These use the existing `ExitRule` shapes on `phases.<p>.barriers.<id>`.
- **Try it**: a fixture panel (flag and item toggles) shows the result sentence the barrier would give.
  Evaluation is pure, so nothing is committed.
- **The world access policy**: City & travel › Access can name a barrier instead of an exit.

### 6.7 Residency and debug (step 3)

- **The overlay**, in the chunk canvas, in private Play and with `?perf`, colours each zone outline by tier:
  active green, visible cyan, near amber, unloaded grey. A held icon marks a zone kept by an open panel or
  dialogue. Hovering lists the reasons, for example:
  - "near: 640 from camera < prefetch 1440"
  - "held: CAM-3 panel open"
  - "unloaded at 02:14 · people memory expires in 0:40"
  - "reloaded from save · timer dropped: door.hold"

  Rings show the prefetch and eviction distances around the camera, and the hosted count is shown against the
  budget. Anything dropped on unload is listed, so loading never hides surprises.
- **Simulate a walk**: in the chunk canvas, drag the player marker, or pick two zones for a shortest-path walk
  (or a vehicle ride), and press play. The editor runs the real `residency()` over the path. It shows a timeline
  of loads and unloads, the predicted hosted count, and any frame that would exceed the budget. The simulation moves only the marker, never gameplay. *Play from here* opens private Play at that point
  with the overlay on.

### 6.8 Validation on Save (each step adds its rules)

`chunkProblems` and the existing bundle validation run on every edit and on protected Save, through the
validation panel (`validation-snapshot.ts`). Errors reject the whole grouped edit. Warnings do not block.

| Check | Severity |
| --- | --- |
| Broken seam: a missing or renamed piece, a deleted zone, a zone in two chunks | Error |
| Mismatched floors: a stair end off its landing, walk-seam ground lines that differ, door floors at different heights (tolerance 0.75) | Error |
| Unreachable zone: the seam graph is not connected, or a zone is reachable only one way (an up-only escalator) | Error, or a warning if intended |
| Inconsistent loop: two seam paths to the same zone disagree on its offset | Error |
| Overlapping zone rects that are not stacked by a seam | Error |
| A station's `elevation` disagrees with its stair seam's direction | Error |
| A vehicle route names a zone outside the chunk; a berth's doors do not meet its platform | Error |
| A flow waypoint not on a floor, or unreachable from the flow's start | Error |
| A barrier whose rules can never open it; an exit duplicating a seam | Warning |

The opening's turnstile is today `metro` `phases.home.exits.downtown.gate` (verify 150 frames, ok 50,
milestone `street`). It becomes `phases.home.barriers.turnstile.gate`. `storyExit`'s gate path ends in
"release the barrier" instead of `finishExit` → `travel`. The beat and the words stay the same; only the cut goes.

## 7. Migration in shippable steps

Each step keeps `scene-parity`, saves, `city-locks`, `all-scene-world-routes`, `opening-from-data` and
`story-rules` green. It also adds focused checks:

- `chunks`: graph validation and placement;
- `residency`: tiers, unloading, and reload from save, including each mechanism's unload-and-reload round trip;
- `chunk-render`: each zone alone paints its golden;
- `vehicles`;
- `people-flow`: including the save round-trip.

The opening-playthrough recording is re-recorded only with Tommi's go-ahead.

Each engine step ships with its editor support in the same step. A step is not done until Tommi can author
its feature in the editor and Save it (the "features configurable in editor" rule).

| # | Step | Editor support in the same step (§6) | Size | What Tommi sees |
| --- | --- | --- | --- | --- |
| 1 | **Tower-lab pilot**: `world/chunks.json`/`chunks.ts` (graph, floating origin), `mergeLevels`, `renderChunkFrame`, `crossInto`, a camera over the union, chunk facing and city-wide weather. A second lab zone joined horizontally and by stairs. | World › Chunks: create a chunk, add zones, the layout canvas with snapping, the seam tool (walk, stairs), the alignment inspector, live neighbours in the composer, zone ownership and multi-zone undo/Save, the compass dial and per-zone override, seam/floor/reach validation (6.1–6.3, 6.8) | L | Build the pilot chunk himself in the editor, then walk from the Tower lab into the annex and up its stairs with no cut. Turn the compass dial and watch the sun move across both zones. |
| 2 | **Barrier pieces** in the lab. | Barrier pieces, readable rules, *Try it*, phase overrides (6.6) | M | Place a turnstile, set "opens when you carry X", try it in the editor, then play it: it refuses, verifies and lets you through, in the world. |
| 3 | **Residency and reload**: tiers, prefetch, unloading, reload from save, transient rebuild from time. A lab chain of six zones. | Residency settings, the overlay with reasons and dropped items, the walk simulation, *Play from here* (6.3, 6.7) | L | Simulate a walk along the chain and see the loads ahead of time. Play it and the overlay agrees. A door you opened far away is still open when you return, and the lab's patrol is where the time says. |
| 4 | **Downtown + Downtown Metro (underground)**: redraw the Metro as a subway (before/after for review), the stairs-down seam, the turnstile as a barrier, the seam-walk workload. | Station `elevation` select; moving pieces across a seam; the opening's turnstile as a barrier phase rule; the elevation-vs-seam check (6.1, 6.2, 6.6, 6.8) | XL | Walk through the turnstile and up the stairs onto the street, and back, with no cut, including in the opening's home phase. Edit the street with the station live below it. |
| 5 | **Harbor replan, before M3**: a design pass with Tommi, then the pier, the raised Harbor Station, and the harbor shift's work bay and checkout as joined zones. Leaves room for the siding stair to join later. | Authoring with steps 1–4; the raised-station kit preset (6.1, 6.6) | XL (design first) | The harbor and the prologue's shift walk as one place, from the pier up to the raised station, with no cut. |
| 6 | **Vehicles pilot** in the lab: a shuttle with an interior, doors and seats; a lift cabin as a vehicle; a shell-only cart on a curved path with a drop. | Vehicle kit presets, the vehicle workbench (cars, doors, seats, frame mover, `via` and drops), the route strip, berths, the moving preview (6.4) | L | Make a shuttle from a preset, put it on a curved path, preview it, then walk in, sit, ride and walk out. |
| 7 | **People flows** with short memory and routines, at Downtown + Metro. | The route tool, the flow inspector, people memory, the flow preview, `flow` replacing the rider controllers (6.5) | L | Draw a commuter route from the street to the platform doors and preview it. In play, people queue and board. Pop out and back within a minute and the same people are there. |
| 8 | **The walkable train**: the full consist with gangways; the platform train as a station `service` vehicle at today's timing; walk-in boarding through the swap. Train and platform lengths follow Tommi's choice after the visual comparison. | Cars and gangways in the workbench; the `service` path legs; berth door checks at Downtown Metro (6.4) | XL | Walk into the train standing at Downtown Metro and through the gangways car to car, with the same people as on the platform. |
| 9 | **The seamless ride**: tunnel zones, the route, arrival at the Harbor (raised) and the Galleria (inside the mall). | Route segments over station and tunnel zones; *ride along* preview; residency simulation of a ride (6.4, 6.7) | XL | Ride from Downtown to the Galleria, watch the platform slide away and the next one arrive, and walk out into the mall, with no cut. |
| 10 | **P14 in the seamless line**: the siding ledge zone, with the temporary exit to the pier, or a seam into the replanned harbor if step 5 made room. | The siding zone placed on the route; its exit or seam (6.1) | M | The brake puzzle plays as before, and stepping out at the siding is continuous. |
| 11 | Later: other stations and their streets join the metro chunk, each with its district's elevation. | Authoring only | M each | More of the city connects. |

## 8. Risks and open questions for Tommi

**Risks**

- **Seam frame cost**: Downtown is already the heaviest scene. The mitigation is window culling and the
  shared passes, measured before step 4 ships.
- **Unloading changes off-screen behaviour.** Today visited scenes keep ticking. Under the reload rule, an
  unloaded zone loses its timers in flight, as on a page reload. A mechanism that assumes it keeps running, or
  that keeps transient state only in memory, needs checking; the `residency` check runs each mechanism through
  an unload-and-reload round trip. Watchdogs and clocks move from "saved place" to "placed by time".
- **Harbor timing**: the harbor replan (step 5) must land before M3, so the vehicle and train steps follow it.
- **Editor scope**: multi-zone editing and moving pieces across seams are the biggest editor changes. They
  extend ComposerModel from one scene document to a set of documents.
- **Splitting `crossInto` from `enter()`** risks missing a side effect (hints, guidance, phase rides).
- **Story rules that assume "scene = place"** (exit rules, `here` comparisons in `finishExit` and
  acknowledgments) need a review.
- **Art continuity**: zones drawn together must agree on ground line, scale and palette. The underground
  Metro and the full-consist Train are real art work, with before/after review.

**Open questions**

1. **Zone sizes.** How large should a zone be (one screen, a block, a whole street)? This needs agreeing
   first, because it decides the next question and the residency distances.
2. **Hacking across a seam.** "If I can see across the zone it would be unreasonable not to hack." Should a
   device you can see in a neighbouring zone be hackable? Cross-zone puzzles stay out until this is settled.
3. **Platform and train length.** A visual comparison of train and platform sizes is being made for Tommi to
   choose from before step 8.
4. **Harbor replan scope**: which harbor places become zones (pier, stacks, work bay, checkout, Harbor Station,
   the beach seam)? This is to be settled in step 5's design pass.
