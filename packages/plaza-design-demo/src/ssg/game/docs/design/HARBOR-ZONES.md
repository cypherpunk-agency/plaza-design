# Harbor zones: the harbor replan

> **Proposal, 2026-10-22. Not implemented.** A design pass for step 5 of
> [SEAMLESS-WORLD.md](./SEAMLESS-WORLD.md) (§4 "Harbor replan", §7), for review with Tommi.
> No engine, gameplay or scene changes are made here. The style frames are editor-only proposals
> (`art/proposals/harbor-*.composition.json`, Library › proposals, "Harbor zones · …").


## Decided (Tommi, 2026-10-22, after the first review)

- **Mirrored, train first.** The prologue begins with the player stepping off the train at the raised Harbor Station at
  dusk, on the way to work. The harbor runs **west → east: station → quay → checkout → yard → shed**. The checkout's
  turnstile is the staff entrance at dusk and the way out at dawn. The night shift is worked eastward, and at dawn the
  player walks back west and takes the train home. Arriving by sky taxi is kept for later.
- **P0** is the title glide: the main menu is the beach scene, mirrored; the camera glides **east across the city** as
  the sun goes down, a first look at some districts, and ends at the Harbor Station as the train comes in. Hand-over on
  the platform.
- **The city map:** the beach is in the **west**, the harbor in the **east**. The beach no longer joins the quay.
- **Coffee machine:** optional, a side mention ("the coffee machine doesn't work again") with a small bonus if fixed.
  The trolley clamp stays the required lesson.
- **The old pier's later content** stays in reserve; keep what is good for somewhere else.
- **One-screen checkout zone:** keep it and see.
- **Train:** 2 cars, a 1,440-unit platform.

The sections below were drafted before these decisions (shed in the west, beach seam east of the quay). They are being
redrawn to the mirrored order.

## Direction this follows (Tommi, 2026-10-22)

- The prologue runs **seamless** from the harbor to Downtown and shows off the engine. Individual
  cuts are allowed.
- A **zone** is the unit that is authored, saved and loaded (today's scene), about 1–4 screens wide
  (a view is 640 units). A **seam** joins zones with no cut; an **exit** has a cut.
- The **Harbor Station is raised**. Downtown Metro is underground. The train has 2 cars (3 possible).
- The prologue has **no hacking view**. P1–P6 are ordinary item use, plus at most one priming fix.
- The P14 siding may later join the harbor by a seam.
- Time runs dusk → night shift → dawn commute.

## Summary

The harbor becomes five new zones joined by seams. Walked west to east, they follow the
prologue's order: you arrive at the staff gate at dusk and work the night in the shed and yard. At dawn you
check out onto the public quay and climb to the raised station above it. The shift never walks
back past where it started, except for the one deliberate return in P4.

```
 dusk ──────────────────────── night ─────────────────────────── dawn ───────────────────────────▶

                                                               ┌──────── harbor-station (raised, +160) ─────────┐
                                                               │ platform · 2-car train · canopy · departures   │
                                                               └──────┬───── stairs + lift seam ────────────────┘
 port road ┊                                                          │
 (hard)    ┊                                                          │
 ┌──────── harbor-shed ─────────┬──────── harbor-yard ─────────┬─ checkout ─┬────────── harbor-quay ──────────────┬─ beach ─▶
 │ gate · lockers · staff room↑ │ receiving · trolley bay ·    │ board ·    │ station foot · stalls under arches · │ (existing
 │ supervisor · dispatch · rack │ loading bay 2 · berth        │ reader ·   │ taxi rank · ferry steps              │  zone)
 └──────────────────────────────┴─────────────┬────────────────┴─ slip ─────┴──────────────────────────────────────┴─────────
          walk seam                 walk seam │      walk seam (turnstile)           walk seam
                                              └─ Terminal 2 gate: ordinary exit (cut) to `stacks` → `warehouse`
                                                 later: P14 siding stair (stairs seam) lands at the yard's east end
```

## Zones

All zones share one ground line, h 0 at quay level. The exception is the station, whose platform is
160 units above the quay. Offsets are measured from the shed's west edge. The zones' shared facing
is 90°, as the harbor's facing is today.

| # | Zone (scene id) | Width | Offset `{dx, dh}` | What is in it | Prologue beats |
| --- | --- | --- | --- | --- | --- |
| 1 | `harbor-shed` | 1,280 (2 views) | 0, 0 | West edge: the port road and the staff gate in the perimeter fence, where the glide's sky taxi sets down. Transit Shed 3's long front and canopy. Lockers and a bench. The **staff room** on a glazed mezzanine up a steel stair (`level.floor` building `shed`, indoor), with the coffee machine. The supervisor's glass booth, the dispatch window and counter with the parcel, the BAY 3 pace ticker, the case-return rack. Masts, cranes, ship and the far shore behind. | P0 (landing at the gate), P1, P2, P3 pick-up, P4 return, the break |
| 2 | `harbor-yard` | 1,280 (2 views) | 1,280, 0 | Receiving at Shed 3's east end, with Mara's window and counter and the empty case. Trolley parking T3–T5, the clamped trolley and its release, LOADING BAY 2 with its beacon. A cut-open straddle carrier and crates. The berth with the container ship and three STS cranes. East: the Terminal 2 fence gate, an ordinary exit to `stacks`. | P3 hand-over, P4 pick-up, P5 |
| 3 | `harbor-checkout` | 640 (1 view) | 2,560, 0 | The shift board (SHIFT OPEN → COMPLETE), the tag reader with its turnstile and shelter, and the wage-slip printer. The staff-side fence, then the STAFF EXIT gate. East of the gate, the public quay starts: a lamp, a camera, and a sign "HARBOR STATION · LINE 0 →". | P6 |
| 4 | `harbor-quay` | 1,600 (2.5 views) | 3,200, 0 | The public quay under the raised station's viaduct, with the piers and deck underside. The station foot: a concrete stair (run 200, rise 160) and a glass lift. The HARBOR STATION sign post. Tea and fish stalls under the arches, the Registry checkpoint notice, the SKY TAXI rank, the ferry steps with a moored ferry, bollards, a sleeping cat. East: "BEACH →". | P7 start (dawn), and the dusk view of the same quay if the glide passes it |
| 5 | `harbor-station` | 1,440 (2.25 views) | 3,200, +160 | The raised LINE 0 platform: canopy, posts and lamps, HARBOR nameplates, departures, a bench. The 2-car train standing, cut open (1,086 units). A WAY OUT sign at the stair head. People waiting, Mara among them going home. | P7: board towards Downtown |
| – | `beach` (existing) | 1,530 | 4,800, 0 | Unchanged content. It joins the quay's east end by a walk seam. | Optional dawn detour |
| – | Siding ledge (P14, later) | ≈ 300 | on the line | Stays a temporary ordinary exit for now (decided 12). The yard's east end is left clear, so its stair can land there later by a stairs seam. | Act II |

Walk length from the gate to the platform is about 3,600 units, or roughly 46 s of plain walking at 78
units/s, spread over the whole shift. The longest single task walk is P3: dispatch (shed x 820) →
receiving (x 1,430), 610 units or 8 s. It is also the first seam crossing, and nothing
announces it.

### Seams

| Seam | Kind | Between | Notes |
| --- | --- | --- | --- |
| `shed-yard` | walk | shed east edge ↔ yard west edge | Open yard floor. Shed 3 runs on into its receiving end, so the wall continues across the seam. |
| `yard-checkout` | walk | yard east ↔ checkout west | The staff side of the fence. |
| `checkout-quay` | walk, with a **barrier** | checkout east ↔ quay west | The turnstile is a world barrier (§6.6): it opens once the tag is returned. At dusk it is the staff *entrance* from the public side; P0 lands west of the shed instead, so the barrier only matters at dawn. |
| `quay-station` | stairs + lift | quay (150, 0) → station (350, +160); lift at quay x 410 | The station owns the stair and the lift. The lift is a Circuit mover with stops at 0 and 160. |
| `quay-beach` | walk | quay east ↔ beach west | The beach's harbor end today is its left edge (`< HARBOR`), so it already faces the right way. |
| Terminal 2 gate | **exit** (cut) | yard → `stacks` | Ordinary travel stays as it is. `stacks` → `warehouse` is unchanged. |
| Port road | hard edge | shed west | The glide/taxi cinematic sets down here (P0). Leaving by taxi later is an ordinary `taxi` action exit. |

The station overlaps the quay, which is allowed because the two are stacked by a seam. A camera on the
stair sees both, as the quay frame and the station frame each show.

### Where P0–P9 happen

| Beat | Zone and place | Time |
| --- | --- | --- |
| P0 glide → harbor | The sky taxi sets down at the shed's port-road gate. Hand-over at spawn (shed x 110). | Dusk, about 19:00 |
| P1 work bay | Walk right past the lockers to the booth (shed x 640). | Dusk |
| P2 supervisor | Work tag and assignment at the booth. | Dusk → night |
| P3 bay → counter | Parcel from DISPATCH (shed x 820), across the first seam, to Mara at RECEIVING (yard x 150). | Night |
| P4 counter → rack | The empty case from Mara's counter, back across the seam to CASE RETURNS (shed x 1,010). Then report to the booth. | Night |
| Break (priming fix) | Up the staff-room stair: the coffee machine (below). Mara takes her break there. | Night |
| P5 trolley bay | Clamp, release, push T4 to LOADING BAY 2 (yard x 520 → 720). | Night |
| P6 checkout | Return the tag at the reader, pass the turnstile, read the wage slip, board reads SHIFT COMPLETE. | Dawn, about 06:10 |
| P7 platform/train | Onto the public quay, up the stair or lift, board the 2-car train towards Downtown. Until SEAMLESS steps 8–9 the ride may be a cut (`boardRide`); after them it is not. | Dawn |
| P8–P9 | Downtown and Capsule 7B (not harbor). | Morning |

The time skips between beats stay story data (`opening.json` phases, `timeDay`). The night falls
while the player is in the shed and yard. Dawn is first seen through the checkout gate onto the
quay, so the contrast between the closed night bay and the morning quay is the reward.

## The priming fix: recommend the staff-room coffee machine

**Recommendation: the coffee machine in the staff room**, as a short beat between P4 and P5. The supervisor or
Mara sends you for a break, and the machine shows `OUT OF ORDER`. Its own display says why, in one readable
state ("NO WATER · VALVE CLOSED"). The fix is an ordinary physical action: open the
isolation valve under the counter, then press BREW. The machine then visibly works and Mara gets her coffee.

Why this one and not the others:

- **It primes the hacking model without hacking.** It is a device with a readable state, one cause and
  one action, which is exactly what A3 later turns into "inspect one device, invoke `open`". The
  kettle (P9, A6) and the shutter (A3) then feel like the same world.
- **It is warm, not procedural.** It gives Mara a small personal moment before the clamp task, and it
  justifies the staff room. The staff room in turn shows the engine off: a stair to an indoor mezzanine
  inside the shed zone.
- **It blocks nothing.** The **broken lift** on the commute would stop the last beat. Because the stair
  always works, it becomes either trivial or a nag. It can stay as scenery: on some days the lift reads OUT
  OF ORDER (`level.elevator` style `broken`).
- **It sets no wrong precedent.** The **back door** teaches a way around a rule before deletion, which is
  Act I's theme and the wrong note for a worker who still has an identity.

It overlaps P5 a little, since P5 also has "readable state → ordinary action". P5 is about a machine that
will not *move*, and the coffee machine is about one that will not *work*. If the two feel redundant in
review, make the coffee machine optional and cue it lightly (open question 2).

## What is reused and what is new

| Reused as it is (kit, `libraryUse: reusable`) | Where |
| --- | --- |
| Harbor shift kit `shift.*`: far shore, ship, cranes, quay apron, stacks, reefer rack, masts, fog, shed, booth, counters, hatches, rack, parcel, case, trolley, release, clamp, reader, printer, board, signs, lockers, trolley park, bay, ends, wet floor | Shed, yard, checkout, distance in all zones |
| Level kit: `level.floor` (outdoor floors cyan, building floors yellow in the overlay), `level.stairs`, `level.elevator`, `level.lift-button`, `level.slab`, `level.section-wall` | Staff room, station foot, viaduct |
| Metro kit `metro.cutaway-train` (2 cars) and `metro.scale-ruler` (annotations) | Station |
| Station pieces `station.track-base`, `track-edge`, `harbor-canopy`, `canopy-post`, `canopy-lamp`, `bench` (from today's Harbor Station) | Station |
| Market kit stalls and crates, `interior.dt-room` (kitchen), `interior.railing`, `sign.*`, `street.fence`, `street.lamp`, `vehicle.air` (taxi), `vehicle.boat` (ferry), `vehicle.road` (straddle, forklift), `character.resident`, `character.flock` | Quay, staff room, gate |
| The `beach` scene | Joined by a walk seam, unchanged |
| `stacks` and `warehouse` | Unchanged, behind the Terminal 2 exit |

| Stand-in in the frames → new art needed for the build | Notes |
| --- | --- |
| Viaduct deck and piers (`level.slab` and thick `level.section-wall`) | A proper **raised-station kit preset** (SEAMLESS §2): deck girder, pier heads, under-deck lights, drip and stains. |
| Coffee machine (`station.snacks` with a taped note) | A small coffee-machine element with state (`water`, `brewing`, display text). |
| Staff gate (`street.fence` with a gate, borrowed from the Skyport) | A harbor perimeter fence with a staff gate. |
| Departures (`sign.screen`) | Today's `station.departures` needs the transport snapshot. A look frame has none, so the build uses the real one. |
| Quay edge at the player's plane | The sea wall and quay edge in front of the quay (today's `harbor.nearWater` and `frontBollard` are scene-bound). A kit version is needed. |
| Train livery | The cut-open metro car is Downtown's. It may want a harbor or LINE 0 surface variant now that it rides in daylight. |

| Retired with the old harbor scenes | Where it goes (proposal) |
| --- | --- |
| `harbor` (the 2,480-unit pier) and its `harbor.*` scene-bound artwork | Replaced by the five zones. Its stalls, taxi rank, ferry and beach exit move to `harbor-quay`, and its cranes and ship to the yard. The customs arch, bonded store, den, ghost mark and bribe (later-act content) need a home: open question 4. |
| `harborStation` (ground-level platform behind a pier gate) | Replaced by the raised `harbor-station`. The `station-harbor` entry in `city.json` points to it, with `elevation: "raised"`. |
| `harborShift` (`?play=harborShift`, the M2 prototype) | Its JSON, task flags, objectives, uses and actors carry over onto `harbor-shed` and `harbor-yard`. The **stations keep their ids** (`dispatch-post`, `rack-post`, `receiving-post`, `checkout-post`, `office`, `trolley`, `clamp`, …), now split across three zones. The scene's gameplay owner (the shift's flags) needs one zone or a world-level owner: open question 3. |

## Style frames

`authoring/proposal-scenes.ts` registers them like the Downtown frames, all as look frames on the
harbor's look (`scene.base` `use: look`, base `harbor`: sky, weather, facing 90). The time of day comes
from the editor's clock. Captures were taken at dusk (19:00), night (23:00) and dawn (06:10).

| Proposal id | Zone | Best viewed |
| --- | --- | --- |
| `harbor-shed` | 1 | dusk (arrival), night |
| `harbor-yard` | 2 | night |
| `harbor-checkout` | 3 | night, dawn |
| `harbor-quay` | 4 | dawn, dusk |
| `harbor-station` | 5 (zone-local h 0 = the platform; the quay drawn 160 below as its neighbour) | dawn, night |

Each frame has a cyan heading with the zone's width and contents, and yellow seam marks at its edges.
The zones' frames placed side by side (night: shed | yard | checkout; dawn: checkout | quay) show the same
ground line, scale, concrete, sodium and work-light palette across the seams.

## Open questions for Tommi

1. **Order of the walk.** West to east: shed → yard → checkout → quay and station → beach. This keeps the shift
   walking right and puts the station on the dawn side. Is this right, or should the station be by the shed,
   so that the dusk arrival is also by train?
2. **Coffee machine**: required (a small beat of its own) or optional and lightly cued? Is it too close to P5?
3. **Gameplay owner across zones.** The shift's flags live in one scene's gameplay today. Should the shift belong
   to `harbor-shed` and be read by the yard and checkout, or should a world-level owner be added?
4. **The old pier's later-act content** (customs arch, bonded store, den, bribe, ghost mark): move it to
   the east end of the quay, put it in a separate `harbor-customs` zone, or keep it with `stacks`?
5. **Train length**: decided (Tommi, 2026-10-22): 2 cars, a 1,440-unit platform for now.
6. **P0**: does the glide land at the port-road gate as a sky taxi (as framed), or on the quay at dusk?
7. **Zone sizes**: is a one-screen zone (`harbor-checkout`, 640) acceptable, or should the checkout merge
   into the yard's east end?
