# Seamless world: joined zones, vehicles and moving people

> **Proposal, 2026-10-22. Not implemented.** This is an engine design for discussion with Tommi.
> It was revised the same day with his answers, listed under **Decided** below, and again for the
> names, the principles and the step order. Nothing here changes current code or contracts until it is
> built. [ROADMAP.md](../../ROADMAP.md) owns priorities, and
> [ENGINE-HANDBOOK.md](../reference/ENGINE-HANDBOOK.md) describes the engine as it is.

Tommi's direction, 2026-10-22:

- The metro should be "a properly supported feature", not an engine hack.
- Passengers need "a proper subsystem for letting people move".
- Between station and street, "ideally no cuts".

How it works underneath is the engine's choice; what matters is how it plays. After a pilot in the Tower
lab, the first real joins are at the **harbor**. The prologue runs seamless from the harbor to Downtown and
is the engine's showcase. **Downtown street + Downtown Metro** follow. The Downtown station is underground,
reached by real stairs down from the street, and the turnstile is a barrier in the world, not a scene border.
The ride from the raised Harbor Station to Downtown joins the two.

## Principles: one engine, one renderer, one main way

- **One engine.** An unjoined scene is a world with one zone. There is no separate seamless mode: every
  scene runs through the same zone graph, residency and frame.
- **One renderer.** `renderWorldFrame` (§3) is the only frame renderer, for one zone or many. There is no
  second render path for joined zones.
- **One main way for each thing.** Trains and lifts are vehicles (§4). Waiting and riding people are people
  flows (§5), replacing `platformQueue` and `trainCrowd`. No special-case controllers.
- **Interiors may become their own zones later.** The zone graph allows a building's interior to be one or
  more zones joined by seams. Nothing commits to it now; we build it and see (§2 "Interiors").

## Decided (Tommi, 2026-10-22)

| # | Question | Answer |
| --- | --- | --- |
| 1 | World size | No limit. The metro could connect the whole city. Loading is driven by proximity and visibility. Joining stays opt-in per pair of zones. |
| 2 | Moving shells | Not "moving buildings". **Vehicles** are a first-class engine concept (cars, boats, planes, sky-taxis, trains), all on one system. |
| 3 | People state | *Revised by 14.* People on screen keep their state. If you come back within about a minute you see the same people; after that, new people are fine. Off-screen people are pure functions of seed and time. |
| 4 | Station elevation | A per-station property. **Downtown is underground**: a subway under the street, reached by stairs down. |
| 5 | Train cars | The whole train is walkable, with gangways between cars. |
| 6 | Sun and weather | *Revised by 15.* |
| 7 | Quick-travel fades | Keep them. |
| 8 | Hack vision | *Revised by 13 and 22.* Hacking happens in the zone you are in. Whether you can hack across a seam is open. |
| 9 | Trains on the loop | Keep today's service as the player experiences it, with the same timing and frequency. No extra-trains design. |
| 10 | Interiors | An interior inside a joined zone is part of that zone, or joined to it by a seam. Other scenes stay separate, behind ordinary exits. See 21. |
| 11 | Memory | What is not visible need not be loaded. It loads when the player is near enough for it to matter. |
| 12 | Siding puzzle | The temporary exit to the pier is fine. |
| 13 | Cross-zone puzzles | **None for now.** No cross-zone cables or wiring ("we can cross the bridge when we confront it"). Hacking across a seam stays open (22). |
| 14 | Unloaded zones | **Reloaded, not replayed or frozen.** Persistent state comes back as saved. Transient things are rebuilt from the current time and seeds. Nothing that happened while unloaded is replayed. Consistency is not over-engineered. |
| 15 | Weather and sun | **Weather is city-wide.** Each zone has a 360° compass facing. The sun is always worked out from the time of day and that facing. |
| 16 | Platform length | *Resolved by 20.* |
| 17 | Stations | The **Galleria** station is inside the mall, the **Harbor** station is raised, and **Downtown** is underground. Other stations are decided per district. |
| 18 | Harbor replan | **Before M3.** The harbor, including the prologue's harbor shift, is replanned as several joined zones. |
| 19 | Prologue | **Seamless from harbor to Downtown**, to show the engine; individual cuts are allowed. The harbor comes before Downtown + Metro. |
| 20 | Train length | **Two cars**, keeping three possible. |
| 21 | Names | **city → district → place** is logical (a place is a named area; a zone may hold several, a place may span zones). A **zone** is the one unit authored, saved, loaded and unloaded (today's scene). A **seam** joins two zones with no cut; an **exit** joins them with a cut. The **world** is the graph of zones over seams and exits. Storeys are **storeys/floors**, not levels. "Chunk" is dropped: what is loaded is the zones near or visible to the player. A zone is about 1–4 screens wide (the view is 640 units; Downtown's 2000-unit street is the upper end). Interiors may be split into more, smaller zones later; the zone graph must allow it. |
| 22 | Hacking across a seam | *Open.* Proposed: what is on screen can be hacked, since visible zones are loaded; wires between zones stay out (13). |

## 1. Goals and non-goals

**Goals**

1. Walk between joined zones with no cut. The harbor comes first, then Downtown street to Downtown Metro.
2. Board, walk through, ride and leave vehicles with no cut. Platform, train and ride are one
   continuous experience.
3. Moving people: routes, waiting, queueing, boarding, sitting or standing, alighting and walking on. This
   replaces today's spawn and despawn: `platformQueue` hides waiting riders once they have `boarded`, and
   `trainCrowd` reseeds the car at each stop.
4. Turnstiles, gates and doors become access barriers in the world, using the same access rules as exits.
5. Any number of joined zones, up to a city-wide metro network, with only the zones near or visible to the
   player loaded.
6. Everything is authored in the editor through typed controls that save.

**What "no cut" means.** Across a *seam* (§2), between any two frames:

- the player's position, the camera and every visible object move continuously;
- nothing teleports, and there is no black frame, fade, wipe or held input;
- a barrier may stop the player, but in the world (a turnstile visibly shut), not as a transition;
- the HUD's place name may change. That is a label, not a cut.

| Transition | Policy |
| --- | --- |
| A seam (street ↔ station, platform ↔ train, train ↔ next station, an interior joined to its street) | **Never** a fade or a cut. Continuity is required. |
| An exit: ordinary travel between zones not joined by a seam | Stays as today: an instant change (`travel`). The prologue may use an exit where a cut makes sense. |
| Explicit quick travel (the map hop, `HOP` = 40 frames of fade) and the taxi flight cinematic | **Keep** the fade and the cinematic (decided). These are exits too. |
| Story cards (sleep, "wait until…") and cutscenes | Out of scope. They cut time, not place. |

**Rejected alternative: a seam with a short fade.** It is the cut Tommi wants gone, and it hides
continuity problems instead of solving them.

**Non-goals.** Physics for people, and compatibility with historic save formats (already excluded). The
whole city is *not* required to be joined by seams: seams are opt-in, and exits stay. But the engine must
not stop the seam-joined part of the world from becoming that large.

## 2. World model: zones, seams and exits

### Terms

- **City → district → place**: the logical names. A place is a named area (`SCENE_PLACE`, the HUD label).
  A zone may hold several places, and one place may span zones.
- **Zone**: today's scene, unchanged. It is the one unit that is authored, saved, loaded and unloaded. It
  keeps its scene id, folder (`scenes/<id>/`), SceneModel, SceneHost, save block (`save.scenes.<id>`,
  `save.gameplay.<id>`), its place in `SCENE_PLACE` and its seen flag. Code keeps the word *scene* until a
  later rename. A zone is about 1–4 screens wide (the view is 640 units; Downtown's 2000-unit street is the
  upper end).
- **Seam**: joins two zones with no cut. It fixes how they sit relative to each other (an offset `{dx, dh}`)
  and how the player crosses between them (walk, stairs or door).
- **Exit**: joins two zones with a cut: a door fade, the taxi, quick travel. Today's scene exits and
  `city.json` transport, unchanged.
- **World**: the graph of all zones over seams and exits. A zone with no seams is a one-zone part of it.
- **Storeys/floors**: the heights inside a zone or across zones. The code's `level.*` pieces, `LevelSource`
  and `mergeLevels` keep their names for now.
- **Vehicle**: a first-class entity that moves through zones along a route (§4).

SceneModel's own trigger `zones` (places that notice the player, `Zones` in `engine/model.ts`) keep their
name in code. In this document "zone" means the world unit unless written as `Zones`.

**There are no global coordinates.** The seam-joined part of the world, such as the metro network, loops
(LINE 0 is a ring) and can grow city-sized, so it has no single fixed frame. The engine uses a **floating
origin** instead. The active zone (where the player stands) is at `(0, 0)`, and every other *resident* zone
is placed by walking seams outward from it, shortest path first. This keeps numbers small, makes loops
harmless (only nearby zones are placed) and makes the world's size irrelevant to the frame. Each authored
seam offset is validated by `worldProblems`; for example, two paths to the same nearby zone must agree.

### Source

The seams are held in a new world document, `world/zone-graph.json`, registered in
`authoring/source-documents.ts` beside `city.json` and `metro.json`. Exits stay where they are authored
today; the world graph reads them, so the document holds only seams. A pure module, `world/zone-graph.ts`,
holds `compileWorld`, `seamsOf(zoneId)`, `placeFrom(world, activeZone, radius)` and `worldProblems`.

```json
{ "version": 1, "seams": [
  { "id": "metro-stairs", "kind": "stairs", "dx": 1180, "dh": -110,
    "high": { "zone": "downtown", "piece": "metro-stairs" }, "low": { "zone": "metro", "piece": "street-stairs" } }
] }
```

In this example the Metro zone sits 110 units *below* the street.

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

- **Harbor**: `raised`. It is built in the harbor replan (step 4).
- **Downtown**: `underground`. The current Metro art (piers, girder, skyline) is a raised platform, so step 7
  redraws it, with before/after shown for review.
- **Galleria**: `indoor`, inside the mall. By the interiors rule it joins the mall's zone by a seam.

Other stations are decided per district.

### What a zone owns and what the world owns

| Owned by the zone (unchanged) | Owned by the world (the zone graph and the frame) |
| --- | --- |
| Composition, scene.json, gameplay.json, devices.json | Seams and their offsets |
| SceneModel: devices, movers, `Zones`, clocks, watchdogs | The merged floors the player walks over resident zones (`mergeLevels`) |
| **A 360° compass facing** (decided; today's `SceneDef.facing`) | One camera and its clamps (union of resident zone rects) |
| Level pieces (floors, stairs, lifts, shells), compiled locally | Sky, weather sky, sky traffic, weather front and grade, drawn **once** per frame |
| Its lights, casters and shade bands | Residency: which zones are loaded (§3) |
| Its distance and backdrop layers, clipped to its window | City-wide weather, the city clock and time |
| Phases, intro, objectives, people flows | |

**Weather is city-wide** (decided). It is one world-level weather, no longer chosen per scene: the per-scene
choice through `setHereClimate(sceneClimate(id))` goes. The city clock and time stay world-level, as now.

**The sun** is always worked out from the time of day and the zone's facing. This is what
`lightAt(day, min, facing, weather, outdoor)` already does, and `lightHere` keeps reading the zone's facing.
Zones joined by seams normally share one facing; the editor sets it on a selection of joined zones at once
(§6.3). A joined zone differs only where the change makes sense, such as around a corner or indoors, so the
light changes believably. At Downtown the old flip (street 80°, platform 270°) goes away: the platform is
underground and indoor.

### Interiors

An interior inside a zone's level (a `level.shell` with `level.interior`), such as a shophouse interior or a
lobby, is part of that zone and is walked into as today; no change is needed. An interior that is currently a
separate scene behind a door may join its building's zone through a `door` seam. All other interiors stay
separate, behind ordinary exits.

Interiors are being designed more heavily, so they may later be split into more, smaller zones. The zone
graph allows a building's interior to be one or more zones, joined to the street and to each other by door,
stair and walk seams, with storeys across zones. Nothing here commits to splitting; how far to go is judged
by building it (§8).

### Joining

- **Horizontal** (`kind: "walk"`): zone A's right edge meets zone B's left edge. At a seam edge `walkOff`
  does not fire, and the edge exits used there today (`SceneExit.edge`) become seams.
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
| Scene ids and save blocks | Unchanged. The zone graph is source, never save. |
| `save.scene` (Continue) | The zone the player stands in. Resume uses its spawn and makes its neighbourhood resident. |
| Seen flags | `markSeen` runs on each crossing that changes `here`, and persists once. |
| City places | `SCENE_PLACE` is unchanged. |
| Quick travel | `placeBlocked` is unchanged except that "YOU ARE HERE" checks the active zone's place. A hop into a seam-joined zone is an ordinary `enter` with its fade (kept). |
| World access policy | `city.json` `ACCESS` may name a barrier (`{ "barrier": { "scene", "id" } }`) as well as an exit. `accessPolicy` calls a new `barrierAccess` in `world/access.ts`, built on `nativeAccess`/`evaluateAccess` like `sceneExitAccess`. |
| Exits between joined zones | Removed in favour of the seam: for example Downtown `metro` and Metro `downtown`. `validateDeclaredDestinations` and `all-scene-world-routes` learn about seams. |

### Backdrops across a seam

Sky, `weatherSky`, `skyTraffic`, `weatherFront` and `drawGrade` move out of the zone and are drawn once per
frame. Each zone's distance layers are drawn clipped to its **window**, which is its rect projected at
each layer's parallax.

For Downtown the handover is simple because the station is underground. Downtown's street, with its
`streetLayers` city and street moments, is above the ground line. The station's walls and slab are below it.
The street's ground is the station's ceiling, so a camera on the stairs sees both in cross-section. Raised
stations (the Harbor) keep `citySkyline`, which advances once per painted frame while its zone is drawn.
`renderDowntownStreet`, the borrower path the back yard uses today, is the precedent for sharing a zone's
backdrop.

## 3. Runtime

The **one runtime** rule holds. `runtime/game.ts` `stepLoop` stays the only loop, and the existing
`this.hosts.forEach(h => h.tick(sceneMs))` ticks whatever is hosted. The world is data plus pure functions
that the loop reads. There is no world manager with its own tick.

### Residency: load by proximity and visibility

Residency is decided each frame by the pure function `residency(world, camera, player, vehicles)` in
`world/zone-graph.ts`. The loop applies its answer through `hostOf` and a new `evict`.

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
- **Zones with no seams** follow the same rule, as the one-zone case. Today every visited host is kept and
  ticks forever; under this proposal they unload after you leave.

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
| **A kettle boiling** in a capsule joined by a seam. | If you stay near, it boils. If you go far, the capsule unloads, and the boil is in flight, so it is dropped: the kettle is in its saved state when you come back. |
| **People walking.** A commuter goes off camera down the stairs, and you leave. | Back within about a minute: the same people (§5). Later: new people, from seed and time. People with routines (a neighbour who leaves for work at 07:40) are derived from seed and city time, so they are consistent for free. |

The rejected alternatives are **replaying** the time away (catch-up) and **freezing** a zone's time while
unloaded (the world visibly waits, which can be exploited). Neither is a mode.

### Changes in `runtime/game.ts`

- **`enter(id, quiet, at)`** stays the cut path, for exits and quick travel.
- **`crossInto(zone)`** (new) handles a seam crossing. It sets `here` and runs `markSeen`, the host tiers,
  `syncHud`, the first-visit intro and the phase `ride`. It does not call `closeAll`, reposition the player,
  place the companion, play `sound.open()` or clear the bubble. It re-bases the floating origin: resident
  zones are re-placed relative to the new active zone, and the player, camera and companion are shifted by
  the same offset in the same frame. That keeps the shift invisible.
- **`walkOff`**: an edge with a seam is open floor.
- **The camera** (the follow block near line 1190, and `onResize`'s `fitW`/`levelW`): clamps to the union of
  resident zone rects, and `camH` to the merged floors' `low`/`high`. A zone may mark an edge `hard`.
- **`view()`**: one `SceneView` per drawn zone, with `cam - placement.x` and `gy + placement.h`.
- **Prompts**: candidates come from all visible zones within `PROMPT_REACH`, and the owning host acts.

`engine/host.ts`: `show(on)` becomes `show(tier)`, and `tick` passes `live` for the visible tier as well.

### Drawing: `runtime/render-scene.ts`

Add `renderWorldFrame(frame: WorldFrame)`, the single frame renderer for one zone or many. Today's
`renderSceneFrame` folds into it: a scene with no seams is drawn as a one-zone frame, so every existing scene
paints as before and the `scene-parity` goldens stay valid. Game and editor share it, as they share
`render-scene.ts` today. The order of passes:

1. Prepare: the light (each visible zone's facing and the city weather), and `preparePresentation` for
   visible zones.
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
unreasonable not to hack") is still open (decided 22). Zone sizes are now agreed provisionally (1–4 screens),
which makes a proposal possible: **what is on screen can be hacked**, because visible zones are loaded. The
neighbour's device holes would then open in `muteWorld`, and the owning host would act, as for prompts. Wires
between zones stay out. The prologue has no hacking view, so this does not block it.

### Performance budget near a seam

The baseline (PERFORMANCE-RECORDING.md, 2026-10-19, 960×540 CSS, DPR 1.25) is Downtown render CPU p50 11.6 ms
and p95 14.2 ms, and Market p50 5.2 ms. The Metro and the harbor have not been measured. A 60 Hz frame is
16.67 ms.

| Rule | Budget |
| --- | --- |
| Shared passes drawn once; zones culled to their windows | Neighbouring zone ≤ 2.5 ms p50 extra |
| Seam frame, Downtown + Metro | ≤ 16 ms p95 render CPU on the reference machine |
| Near and unloaded zones | No render cost. Near-zone ticks ≤ 0.5 ms per zone. A reload compiles over spread-out loop frames, one zone per frame. |

Add the workloads "harbor seam walk" (step 4), "Downtown seam walk" (step 7) and "metro ride, Harbor to
Downtown" (step 9) to `scripts/performance/workloads.ts`. The recording doc warns that the harness ran at
about 1 s RAF cadence, so these are CPU-submission numbers, not FPS promises. No quality, DPR or population
cuts are made to meet the budget.

## 4. Vehicles

A **vehicle** is a first-class level and world entity: a **shell with its own frame of reference**, whose
pose (x, h and optionally tilt) is driven by a Circuit mover. It may have an interior, doors and seats. Anything
standing in its interior, the player and people alike, is held *in the vehicle's frame*. The player is
therefore carried without drift: their position is stored in vehicle-local coordinates, not nudged frame by
frame. It is not a building that happens to move. Buildings and vehicles share the level kit's floors, shells
and reveal, and the vehicle adds the moving frame, a route, doors, seats and gangways.

Trains and lifts are both vehicles. There is no separate train or lift controller.

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
| Metro train | `train.car` on a ring, x axis | Walkable, two cars with a gangway (a third possible) | Doors driven by its legs (`drives: "doors:shut"`) |
| Lift cabin | Mover on `h` (today's `LevelLift.device`) | Walkable, one floor | Today's level lifts move onto this in the vehicles pilot (step 5) |
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
  - The Train composition grows from one 1200-unit car to a **two-car** consist (decided 20), built so a
    third car can be added.
  - Station zones are sized to the two-car train. A third car must still fit, by lengthening the station
    zone, or by letting the platform show the end of the train in the tunnel mouth.
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
   decides how it joins its street. Harbor's raised platform has stairs down to the pier. Downtown's
   underground platform has stairs up to the street. Galleria's indoor platform (later) opens into the mall,
   joined to the station by a seam.

**P14, brake and siding.** The brake (`SceneModel.brake`, snap to `siding`) is untouched. A small siding zone,
a service ledge, sits on the route at `SIDING` (ring 5350). With the doors cable rewired, the player steps out
onto it without a cut. Its stair to the pier is a **temporary ordinary exit** to `harbor`
(`TRANSPORT.siding`), which is acceptable (decided). If the replanned harbor (step 4) leaves room for it, the
stair becomes a seam into the harbor's zones. `train.car` saves are unchanged, the scene id stays `train`, and
`startRide` fixtures keep working.

**Harbor replan, before Downtown + Metro (decided).** The harbor, including the prologue's harbor shift
(`?play=harborShift`), is replanned as several joined zones: the pier, the raised Harbor Station, the work bay
and the checkout. It is a design pass with Tommi followed by a build (step 4), and the prologue shift's beats
P0–P6 move into those zones. It comes first among the real places because the prologue runs seamless from the
harbor to Downtown. Milestone 3 is done when the seamless ride (step 9) carries the prologue's P7–P9.

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

Waiting and riding people are flows. They replace `platformQueue` and `trainCrowd`; there is no rider
controller beside them.

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
editor-only evaluator: previews call the same `renderWorldFrame`, `mergeLevels`, `residency`, mover and flow
functions as the game.

### 6.1 Zones and seams (steps 1, 4 and 7)

**World › Zones** (`authoring/zone-graph-authoring.ts`, registering `world/zone-graph.json` in
`source-documents.ts`):

- **Join zones.** Open a zone on the world canvas; it shows that zone and every zone joined to it by seams.
  *Join zone* opens a picker of catalogue scenes. A zone already joined elsewhere can be joined again only
  where the offsets agree (the loop check, 6.8).
- **Place zones** on the world canvas, which shows each zone live, at its real size, painted by
  `renderWorldFrame`. Drag a zone to place it:
  - beside another, its edge snaps edge to edge and its ground line to the neighbour's;
  - above or below another, its ground line snaps to one of the other zone's floor heights, chosen from a
    list of that zone's floors.

  The offsets (`dx`, `dh`) are shown as number fields for fine adjustment, so they are never typed blind.
- **Draw seams** with a seam tool:
  - *Walk*: click the shared edge.
  - *Stairs*: pick an existing `level.stairs` piece in one zone and a landing floor in the other, or choose
    *Add stairs seam*. That places a new stair piece whose high end lands on the upper zone's floor and whose
    low end lands on the lower zone's floor, owned by the zone you pick.
  - *Door*: pick a `level.door`, which is how a separate interior scene joins its building's zone.
- **Live neighbours while editing one zone.** In the scene composer, the *Neighbours* toggle (on by default
  for seam-joined zones) paints every adjoining zone live beyond the seams. They are animated, slightly dimmed
  and labelled with the zone's name. Double-clicking a neighbour opens it in the composer at the same world
  position, so the view does not jump.
- **Alignment check.** Selecting a seam opens an inspector with both sides' numbers, for example:
  - "street floor h 0 ↔ stair top h 0 ✓"
  - "stair foot h −110 ↔ platform floor h −104 ✗ (6 units)"

  A tolerance of 0.75 units (engine/level.ts `near`) decides ✓ or ✗. The world canvas marks a ✗ in red at
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
  This is also how an interior is later split into its own zones.
- **Undo and Save across zones**: an edit touching several documents (two compositions and `zone-graph.json`)
  is one ComposerModel history step and one prospective bundle. Protected Save writes all of them or none.
  That is the existing atomic-rejection rule, extended to every document in the edit.

### 6.3 Zone and world settings (step 1, with residency in step 3)

| Setting | Control |
| --- | --- |
| Facing | A **compass dial** (0–359°, with N/E/S/W marks) on the zone. *Apply to joined zones* sets it on a selection of seam-joined zones at once. A sun preview scrubs the time of day and shows the light and shadow direction. Weather is city-wide, so it is not set here. |
| Residency | World-level number fields with defaults and *reset*: prefetch distance (1.5 view widths), eviction distance (3), vehicle ETA prefetch (10 s), hosted budget (8) |
| People memory | How long the people last on screen are remembered after a zone unloads (default 60 s) |

### 6.4 Vehicles (steps 5, 8 and 9)

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
- **Preview**: a play button and scrub slider run the mover's paths in the workbench and in the world canvas.
  Both show the vehicle passing through zones, doors opening and docking. A *ride along* camera follows it.

### 6.5 People flows (step 6)

- **The route tool**: click waypoints onto floors. They snap to floors, stairs, vehicle doors, seats, benches
  and queue spots, including in neighbouring zones across seams. Each waypoint is a chip with a behaviour
  select (walk, wait, queue, board, sit, stand, alight, leave) and its parameters: dwell seconds, queue slot
  count, which door.
- **The flow inspector**: its route; a rate-by-hour curve (24 bars, dragged); a density cap per zone; a look
  preset (kit presets).
- **Preview**: a time scrub and *play flow* animate cohorts in the composer, including boarding a vehicle
  previewed at its berth. An optional density heat strip shows where people bunch. The preview never writes save
  state.

### 6.6 Barriers and access rules (step 2, with the turnstile in step 7)

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

- **The overlay**, in the world canvas, in private Play and with `?perf`, colours each zone outline by tier:
  active green, visible cyan, near amber, unloaded grey. A held icon marks a zone kept by an open panel or
  dialogue. Hovering lists the reasons, for example:
  - "near: 640 from camera < prefetch 1440"
  - "held: CAM-3 panel open"
  - "unloaded at 02:14 · people memory expires in 0:40"
  - "reloaded from save · timer dropped: door.hold"

  Rings show the prefetch and eviction distances around the camera, and the hosted count is shown against the
  budget. Anything dropped on unload is listed, so loading never hides surprises.
- **Simulate a walk**: in the world canvas, drag the player marker, or pick two zones for a shortest-path walk
  (or a vehicle ride), and press play. The editor runs the real `residency()` over the path. It shows a timeline
  of loads and unloads, the predicted hosted count, and any frame that would exceed the budget. The simulation moves only the marker, never gameplay. *Play from here* opens private Play at that point
  with the overlay on.

### 6.8 Validation on Save (each step adds its rules)

`worldProblems` and the existing bundle validation run on every edit and on protected Save, through the
validation panel (`validation-snapshot.ts`). Errors reject the whole grouped edit. Warnings do not block.

| Check | Severity |
| --- | --- |
| Broken seam: a missing or renamed piece, a deleted zone, two seams on one piece | Error |
| Mismatched floors: a stair end off its landing, walk-seam ground lines that differ, door floors at different heights (tolerance 0.75) | Error |
| Unreachable zone: a seam-joined zone reachable only one way (an up-only escalator) | Error, or a warning if intended |
| Inconsistent loop: two seam paths to the same zone disagree on its offset | Error |
| Overlapping zone rects that are not stacked by a seam | Error |
| A station's `elevation` disagrees with its stair seam's direction | Error |
| A vehicle route names a missing zone, or its segments are not joined in order; a berth's doors do not meet its platform | Error |
| A flow waypoint not on a floor, or unreachable from the flow's start | Error |
| A barrier whose rules can never open it; an exit duplicating a seam | Warning |

The opening's turnstile is today `metro` `phases.home.exits.downtown.gate` (verify 150 frames, ok 50,
milestone `street`). It becomes `phases.home.barriers.turnstile.gate`. `storyExit`'s gate path ends in
"release the barrier" instead of `finishExit` → `travel`. The beat and the words stay the same; only the cut
goes. When the prologue replaces the opening, the rule moves with it; existing saves may be reset.

## 7. Migration in shippable steps

Each step keeps `scene-parity`, saves, `city-locks`, `all-scene-world-routes`, `opening-from-data` and
`story-rules` green. It also adds focused checks:

- `zone-graph`: graph validation and placement;
- `residency`: tiers, unloading, and reload from save, including each mechanism's unload-and-reload round trip;
- `world-render`: each zone alone paints its golden through `renderWorldFrame`;
- `vehicles`;
- `people-flow`: including the save round-trip.

The opening-playthrough recording is re-recorded only with Tommi's go-ahead.

Each engine step ships with its editor support in the same step. A step is not done until Tommi can author
its feature in the editor and Save it (the "features configurable in editor" rule).

| # | Step | Needs | Editor support in the same step (§6) | Size | What Tommi sees |
| --- | --- | --- | --- | --- | --- |
| 1 | **Tower-lab pilot**: `world/zone-graph.json`/`zone-graph.ts` (graph, floating origin), `mergeLevels` (merged floors), `renderWorldFrame` as the one renderer for every scene, `crossInto`, a camera over the union, zone facing and city-wide weather. A second lab zone joined horizontally and by stairs. | — | World › Zones: join zones, the world canvas with snapping, the seam tool (walk, stairs), the alignment inspector, live neighbours in the composer, zone ownership and multi-zone undo/Save, the compass dial applied across joined zones, seam/floor/reach validation (6.1–6.3, 6.8) | L | Join the pilot zones himself in the editor, then walk from the Tower lab into the annex and up its stairs with no cut. Turn the compass dial and watch the sun move across both zones. Every other scene looks as before. |
| 2 | **Barrier pieces** in the lab. | 1 | Barrier pieces, readable rules, *Try it*, phase overrides (6.6) | M | Place a turnstile, set "opens when you carry X", try it in the editor, then play it: it refuses, verifies and lets you through, in the world. |
| 3 | **Residency and reload by zone**: tiers, prefetch, unloading, reload from save, transient rebuild from time. A lab chain of six zones. | 1 | Residency settings, the overlay with reasons and dropped items, the walk simulation, *Play from here* (6.3, 6.7) | L | Simulate a walk along the chain and see the loads ahead of time. Play it and the overlay agrees. A door you opened far away is still open when you return, and the lab's patrol is where the time says. |
| 4 | **Harbor replan**: a design pass with Tommi first, then the pier, the raised Harbor Station, the work bay and the checkout as joined zones. The prologue shift, P0–P6, moves into them. Leaves room for the siding stair to join later. The harbor seam-walk workload. | 1–3, the design pass | Station `elevation` select and the raised-station kit preset; moving pieces across a seam; the elevation-vs-seam check (6.1, 6.2, 6.8) | XL (design first) | Reviews frames of the design pass before the build. Then plays the prologue shift from the pier up to the raised station as one place, with no cut. |
| 5 | **Vehicles pilot** in the lab: a shuttle with an interior, doors and seats; a lift cabin as a vehicle (today's level lifts move onto it); a shell-only cart on a curved path with a drop. | 1, 3 | Vehicle kit presets, the vehicle workbench (cars, doors, seats, frame mover, `via` and drops), the route strip, berths, the moving preview (6.4) | L | Make a shuttle from a preset, put it on a curved path, preview it, then walk in, sit, ride and walk out. Ride a lift that is now a vehicle. |
| 6 | **People flows** with short memory and routines, at the harbor. `flow` replaces `platformQueue` and `trainCrowd`. | 3, 4, 5 | The route tool, the flow inspector, people memory, the flow preview, `flow` replacing the rider controllers (6.5) | L | Draw a commuter route from the pier up to Harbor Station's platform and preview it. In play, people queue and wait. Pop out and back within a minute and the same people are there. |
| 7 | **Downtown + underground Downtown Metro**: redraw the Metro as a subway (before/after for review), the stairs-down seam, the turnstile as a barrier, flows from street to platform, the Downtown seam-walk workload. | 2, 3, 6 | The opening's turnstile as a barrier phase rule; Downtown flows; station elevation for Downtown (6.1, 6.5, 6.6) | XL | Walk through the turnstile and up the stairs onto the street, and back, with no cut. Edit the street with the station live below it. |
| 8 | **The walkable train**: a two-car consist with a gangway, a third car possible; the platform train as a station `service` vehicle at today's timing; walk-in boarding through the swap. | 5, 6, 7 | Cars and gangways in the workbench; the `service` path legs; berth door checks at Harbor Station and Downtown Metro (6.4) | XL | Walk into the train standing at Downtown Metro and through the gangway car to car, with the same people as on the platform. |
| 9 | **The seamless ride, Harbor (raised) → Downtown (underground)**: tunnel zones and the route. The prologue's P7–P9 are authored on top, which completes milestone 3. The Galleria joins later (step 11). | 4, 7, 8 | Route segments over station and tunnel zones; *ride along* preview; residency simulation of a ride (6.4, 6.7) | XL | Board at the raised Harbor Station, watch the platform slide away, ride into the underground Downtown Metro and walk up onto the street, with no cut, as the prologue plays it. |
| 10 | **P14 in the seamless line**: the siding ledge zone, with the temporary exit to the pier, or a seam into the harbor's zones if step 4 made room. | 4, 9 | The siding zone placed on the route; its exit or seam (6.1) | M | The brake puzzle plays as before, and stepping out at the siding is continuous. |
| 11 | Later: other stations and districts, including the Galleria inside the mall, each with its district's elevation. | 9 | Authoring only | M each | More of the city connects. |

## 8. Risks and open questions for Tommi

**Risks**

- **One renderer for everything**: step 1 moves every existing scene onto `renderWorldFrame`. The
  `scene-parity` goldens must stay identical, or the step is not done.
- **Seam frame cost**: Downtown is already the heaviest scene. The mitigation is window culling and the
  shared passes, measured at the harbor in step 4 and before step 7 ships.
- **Unloading changes off-screen behaviour.** Today visited scenes keep ticking. Under the reload rule, an
  unloaded zone loses its timers in flight, as on a page reload. A mechanism that assumes it keeps running, or
  that keeps transient state only in memory, needs checking; the `residency` check runs each mechanism through
  an unload-and-reload round trip. Watchdogs and clocks move from "saved place" to "placed by time".
- **Harbor first**: the harbor replan (step 4) comes before Downtown + Metro and gates the steps after it. Its
  design pass with Tommi has to happen before the build.
- **Editor scope**: multi-zone editing and moving pieces across seams are the biggest editor changes. They
  extend ComposerModel from one scene document to a set of documents.
- **Splitting `crossInto` from `enter()`** risks missing a side effect (hints, guidance, phase rides).
- **Story rules that assume "scene = place"** (exit rules, `here` comparisons in `finishExit` and
  acknowledgments) need a review. Under the new names a place may span zones.
- **Art continuity**: zones drawn together must agree on ground line, scale and palette. The raised Harbor
  Station, the underground Metro and the two-car Train are real art work, with before/after review.

**Answered provisionally**: zone size is about 1–4 screens (decided 21), and the train is two cars, keeping
three possible (decided 20).

**Open questions**

1. **Hacking across a seam** (decided 22). "If I can see across the zone it would be unreasonable not to
   hack." The proposal is that what is on screen can be hacked, because visible zones are loaded, while wires
   between zones stay out. Cross-zone puzzles stay out until this is settled.
2. **Harbor replan scope**: which harbor places become zones (pier, stacks, work bay, checkout, Harbor Station,
   the beach seam), and where the prologue uses a cut? This is settled in step 4's design pass.
3. **How far to split interiors into zones.** A building's interior can be its own zone or zones, joined by
   seams. Whether to split, and how small, is judged by building it, starting where interiors are designed
   most heavily.
