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
  the platform. *Built (2026-10-22, first pass):* story/title/timeline.json glides east from the mirrored beach
  through Downtown and the Galleria to a raised Harbor Station drawn in the opening picture (finale.ts), the
  sun setting by the city clock, a two-car train arriving; the hand-over onto the platform waits for these
  zones, so the glide still hands over to the current opening.
- **The city map:** the beach is in the **west**, the harbor in the **east**. The beach no longer joins the quay.
- **Coffee machine:** optional, a side mention ("the coffee machine doesn't work again") with a small bonus if fixed.
  The trolley clamp stays the required lesson.
- **The old pier's later content** stays in reserve; keep what is good for somewhere else.
- **One-screen checkout zone:** keep it and see.
- **Train:** 2 cars, a 1,440-unit platform.

The zone, seam and beat tables and the style frames below follow these decisions (redrawn 2026-10-22).

## Direction this follows (Tommi, 2026-10-22)

- The prologue runs **seamless** from the harbor to Downtown and shows off the engine. Individual
  cuts are allowed.
- A **zone** is the unit that is authored, saved and loaded (today's scene), about 1–4 screens wide
  (a view is 640 units). A **seam** joins zones with no cut; an **exit** has a cut.
- The **Harbor Station is raised**. Downtown Metro is underground. The train has 2 cars (3 possible).
- The prologue has **no hacking view**. P1–P6 are ordinary item use, plus at most one optional priming fix.
- The P14 siding may later join the harbor by a seam.
- Time runs dusk → night shift → dawn commute.

## Summary

The harbor becomes five new zones joined by seams. Walked west to east, they follow the walk to
work: you step off the train at dusk, come down the stair or lift to the public quay, enter through
the staff gate at the checkout and work the night eastward in the yard and the shed. At dawn you
walk back west the same way, check out through the turnstile onto the quay and climb to the
platform. The deliberate returns inside the shift are P4 (the empty case back to the shed) and the
dawn walk home.

```
 dusk: train in, walk east to work ─────────── night: the shift, worked eastward ────────────────────────▶
 ◀──────────────────────────────────────────────────────────── dawn: walk back west, train home

 ┌──────── harbor-station (raised, +160) ──────────┐
 │ departures · 2-car train · canopy · WAY OUT     │──── LINE 0 runs on east (P14 siding, later)
 └─┬───── stairs + lift seam ──────────────────────┘
   │ (stair head x 150, foot x 350; lift x 410)
 ┌─┴─────────── harbor-quay ─────────────┬─ checkout ─┬────────── harbor-yard ──────────┬──────── harbor-shed ──────────┐
 │ station foot · tea and fish under the │ staff gate │ Terminal 2 gate · loading bay 2 │ case returns · dispatch ·     │ port road
 │ arches · ferry steps · sky taxi rank  │ turnstile ·│ · trolley bay · RECEIVING       │ supervisor · lockers ·        │ gate (shut;
 │                                       │ reader ·   │ (Shed 3's west end) · berth     │ staff room↑ (coffee machine)  │ taxi later)
 └───────────────────────────────────────┴─ slip ─────┴┬────────────────────────────────┴───────────────────────────────┘
 hard edge          walk seam (turnstile)      walk seam│                walk seam                                hard edge
                                                        └─ Terminal 2 gate: ordinary exit (cut) to `stacks` → `warehouse`
                                                           later: P14 siding stair (stairs seam) lands at the yard's west end
```

## Zones

All zones share one ground line, h 0 at quay level. The exception is the station, whose platform is
160 units above the quay. Offsets are measured from the quay's west edge, the harbor's west end. The
zones' shared facing is 90°, as the harbor's facing is today.

| # | Zone (scene id) | Width | Offset `{dx, dh}` | What is in it | Prologue beats |
| --- | --- | --- | --- | --- | --- |
| 1 | `harbor-station` | 1,440 (2.25 views) | 0, +160 | The raised LINE 0 platform over the quay's west part: canopy, posts and lamps, HARBOR nameplates, departures, a bench. The 2-car train standing, cut open (1,086 units, x 230–1,316). The stair head at the platform's west end (x 150) with a WAY OUT sign; the lift's top stop at x 410. People waiting, Mara among them going home at dawn. West: the line to Downtown. East: the line runs on over the harbor. | P0 hand-over (dusk, off the train), P7 board towards Downtown (dawn) |
| 2 | `harbor-quay` | 1,600 (2.5 views) | 0, 0 | The public quay under the raised station's viaduct (deck x 0–1,440), with the piers and deck underside. The station foot at the west end: a concrete stair rising west (foot x 350, head x 150, rise 160) and a glass lift (x 410), the HARBOR STATION sign post. The Registry checkpoint notice, tea and fish stalls under the arches, a sleeping cat, the ferry steps with a moored ferry, and the SKY TAXI rank at the east end, past the deck. West: a fence, the harbor's hard edge. | P0 down to the quay (dusk), P7 back up (dawn) |
| 3 | `harbor-checkout` | 640 (1 view) | 1,600, 0 | West, the public side: a sodium lamp, a sign "← HARBOR STATION · LINE 0", a camera, the STAFF GATE (TAG REQUIRED). The tag reader with its turnstile and shelter, the wage-slip printer, then the staff side: its fence and the shift board (SHIFT OPEN → COMPLETE). | Staff entrance (dusk), P6 (dawn) |
| 4 | `harbor-yard` | 1,280 (2 views) | 2,240, 0 | West: the Terminal 2 fence gate, an ordinary exit to `stacks`, and room for the P14 siding stair. A straddle carrier and crates, LOADING BAY 2 with its beacon (x 560), trolley parking T3–T5, the clamped trolley T4 and its release (x 760). Receiving at Shed 3's west end (x 970–1,300), with Mara's window and counter and the empty case. The berth with the container ship and three STS cranes. | P1 walk-in, P3 hand-over, P4 pick-up, P5 |
| 5 | `harbor-shed` | 1,280 (2 views) | 3,520, 0 | Transit Shed 3's long front and canopy (x 0–1,110), continuing Receiving across the seam. CASE RETURNS rack (x 270), the BAY 3 pace ticker, the DISPATCH window and counter with the parcel (x 460), the supervisor's glass booth (x 640). A steel stair (x 750–860) to the **staff room** on a glazed mezzanine (`level.floor` building `shed`, indoor, x 864–1,094) with the coffee machine; lockers and a bench below. East edge: the perimeter fence and the PORT ROAD staff gate, shut (a taxi stand later). Masts, cranes, ship and the far shore behind. | P1, P2, P3 pick-up, P4 return, the optional coffee machine |
| – | Siding ledge (P14, later) | ≈ 300 | on the line | Stays a temporary ordinary exit for now (decided 12). The yard's west end is left clear, so its stair can land there later by a stairs seam. | Act II |

The `beach` no longer joins the harbor: it is in the west of the city now (decided above).

Walk length from the platform's stair head (station x 150) down to the quay and east to the
supervisor's booth (world x 4,160) is about 4,000 units, or roughly 51 s of plain walking at 78
units/s, the whole of it at dusk on the way in. The dawn walk back from the checkout reader (world
x 1,940) to the stair head is about 1,800 units, 23 s. The longest single task walk is P3: dispatch
(shed x 460, world 3,980) → receiving (yard x 1,129, world 3,369), 610 units or 8 s, back across
the shed–yard seam, and nothing announces it.

### Seams

| Seam | Kind | Between | Notes |
| --- | --- | --- | --- |
| `station-quay` | stairs + lift | station (150, +160) → quay (350, 0); lift at quay x 410 | The station owns the stair and the lift. The stair rises west, so the dawn walk west runs straight up it; at dusk you step off the train and come down it eastward. The lift is a Circuit mover with stops at 0 and 160. |
| `quay-checkout` | walk, with a **barrier** | quay east ↔ checkout west | The turnstile is a world barrier (§6.6). At dusk it is the staff *entrance* from the public side (the tag lets you in); at dawn it opens once the tag is returned. |
| `checkout-yard` | walk | checkout east ↔ yard west | The staff side of the fence. |
| `yard-shed` | walk | yard east edge ↔ shed west edge | Open yard floor. Shed 3 runs on from its receiving end, so the wall continues across the seam. |
| Terminal 2 gate | **exit** (cut) | yard → `stacks` | Ordinary travel stays as it is. `stacks` → `warehouse` is unchanged. |
| Quay west end | hard edge | quay west | A fence. The beach is no longer here. |
| Port road | hard edge | shed east | The staff gate onto the port road, shut. Arriving or leaving by taxi later is an ordinary `taxi` action exit here or at the quay's rank. |

The station overlaps the quay, which is allowed because the two are stacked by a seam. A camera on the
stair sees both, as the quay frame and the station frame each show.

### Where P0–P9 happen

| Beat | Zone and place | Time |
| --- | --- | --- |
| P0 glide → harbor | The title glide ends at the Harbor Station as the train comes in. Hand-over on the platform as the player steps off (station x 420). | Dusk, about 19:00 |
| Walk to work | Down the stair (station x 150 → quay x 350) or the lift, east along the quay past the stalls, in through the staff gate and turnstile at the checkout (checkout x 240–400). | Dusk |
| P1 work bay | East through the yard, past receiving and across the seam into Shed 3, to the booth (shed x 640). | Dusk |
| P2 supervisor | Work tag and assignment at the booth. | Dusk → night |
| P3 bay → counter | Parcel from DISPATCH (shed x 460), back west across the seam, to Mara at RECEIVING (yard x 1,129). | Night |
| P4 counter → rack | The empty case from Mara's counter, east across the seam to CASE RETURNS (shed x 270). Then report to the booth. | Night |
| Coffee machine (optional) | A side mention ("the coffee machine doesn't work again"): up the staff-room stair (shed x 750 → 860) to the machine, a small bonus if fixed. Mara takes her break there. | Night |
| P5 trolley bay | Clamp, release, push T4 west to LOADING BAY 2 (yard x 760 → 560). | Night |
| P6 checkout | West to the checkout: return the tag at the reader, read the wage slip, the board reads SHIFT COMPLETE, pass the turnstile and the staff gate onto the public quay. | Dawn, about 06:10 |
| P7 platform/train | West along the quay, up the stair or lift, board the 2-car train towards Downtown. Until SEAMLESS steps 8–9 the ride may be a cut (`boardRide`); after them it is not. | Dawn |
| P8–P9 | Downtown and Capsule 7B (not harbor). | Morning |

The time skips between beats stay story data (`opening.json` phases, `timeDay`). Dusk is seen
from the platform and the quay on the way in, the night falls while the player is in the shed and
yard, and dawn is first seen through the staff gate onto the quay, so the contrast between the closed
night bay and the morning quay is the reward.

## The priming fix: the staff-room coffee machine (optional)

**Decided: optional.** The coffee machine in the staff room is a side mention between P4 and P5 ("the coffee
machine doesn't work again"), with a small bonus if fixed; the trolley clamp stays the required lesson. The
original recommendation follows. The supervisor or Mara sends you for a break, and the machine shows `OUT OF ORDER`. Its own display says why, in one readable
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
review, make the coffee machine optional and cue it lightly. (Decided: optional.)

## What is reused and what is new

| Reused as it is (kit, `libraryUse: reusable`) | Where |
| --- | --- |
| Harbor shift kit `shift.*`: far shore, ship, cranes, quay apron, stacks, reefer rack, masts, fog, shed, booth, counters, hatches, rack, parcel, case, trolley, release, clamp, reader, printer, board, signs, lockers, trolley park, bay, ends, wet floor | Shed, yard, checkout, distance in all zones |
| Level kit: `level.floor` (outdoor floors cyan, building floors yellow in the overlay), `level.stairs`, `level.elevator`, `level.lift-button`, `level.slab`, `level.section-wall` | Staff room, station foot, viaduct |
| Metro kit `metro.cutaway-train` (2 cars) and `metro.scale-ruler` (annotations) | Station |
| Station pieces `station.track-base`, `track-edge`, `harbor-canopy`, `canopy-post`, `canopy-lamp`, `bench` (from today's Harbor Station) | Station |
| Market kit stalls and crates, `interior.dt-room` (kitchen), `interior.railing`, `sign.*`, `street.fence`, `street.lamp`, `vehicle.air` (taxi), `vehicle.boat` (ferry), `vehicle.road` (straddle, forklift), `character.resident`, `character.flock` | Quay, staff room, gate |
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
| `harbor` (the 2,480-unit pier) and its `harbor.*` scene-bound artwork | Replaced by the five zones. Its stalls, taxi rank and ferry move to `harbor-quay`, and its cranes and ship to the yard. Its beach exit goes (the beach is in the west of the city now). The customs arch, bonded store, den, ghost mark and bribe (later-act content) stay in reserve (decided). |
| `harborStation` (ground-level platform behind a pier gate) | Replaced by the raised `harbor-station`. The `station-harbor` entry in `city.json` points to it, with `elevation: "raised"`. |
| `harborShift` (`?play=harborShift`, the M2 prototype) | Its JSON, task flags, objectives, uses and actors carry over onto `harbor-shed` and `harbor-yard`. The **stations keep their ids** (`dispatch-post`, `rack-post`, `receiving-post`, `checkout-post`, `office`, `trolley`, `clamp`, …), now split across three zones. The scene's gameplay owner (the shift's flags) needs one zone or a world-level owner: open question 3. |

## Style frames

`authoring/proposal-scenes.ts` registers them like the Downtown frames, all as look frames on the
harbor's look (`scene.base` `use: look`, base `harbor`: sky, weather, facing 90), listed west to east.
The time of day comes from the editor's clock. Captures were taken at dusk (19:00), night (23:00) and
dawn (06:10).

| Proposal id | Zone | Best viewed |
| --- | --- | --- |
| `harbor-station` | 1 (zone-local h 0 = the platform; the quay drawn 160 below as its neighbour) | dusk (arrival), dawn |
| `harbor-quay` | 2 | dusk, dawn |
| `harbor-checkout` | 3 | dusk (in), dawn (out) |
| `harbor-yard` | 4 | night |
| `harbor-shed` | 5 | night |

Each frame has a cyan heading with the zone's width and contents, and yellow seam marks at its edges.
The frames were redrawn mirrored from the first draft (shed in the west): layouts are mirrored piece by
piece, never as a flipped image, so every sign reads. The stair to the station stays at the quay's west
end and now rises west. The checkout's turnstile sits on the reader's east side (the reader kit's
`side` option) and its gate sign stays readable on a fence running west (the `shift.end` kit). The
trolley turns round so its handle trails the westward push to the loading bay. The shed's sky-taxi
landing is gone; its east end is the shut port-road gate. The zones' frames placed side by side
(night: checkout | yard | shed; dawn: station | quay | checkout) show the same ground line, scale,
concrete, sodium and work-light palette across the seams.

## Open questions for Tommi

1. **Order of the walk**: decided (Tommi, 2026-10-22): mirrored, train first (station → quay → checkout →
   yard → shed).
2. **Coffee machine**: decided: optional, a side mention with a small bonus.
3. **Gameplay owner across zones.** The shift's flags live in one scene's gameplay today. Should the shift belong
   to `harbor-shed` and be read by the yard and checkout, or should a world-level owner be added?
4. **The old pier's later-act content** (customs arch, bonded store, den, bribe, ghost mark): decided: in
   reserve, keep what is good for somewhere else.
5. **Train length**: decided (Tommi, 2026-10-22): 2 cars, a 1,440-unit platform for now.
6. **P0**: decided: the glide ends at the Harbor Station as the train comes in. A sky-taxi arrival is kept for
   later (the quay's rank or the shed's port-road gate).
7. **Zone sizes**: decided: keep the one-screen checkout zone and see.
8. **The stair's direction** (new): it rises west, so the dawn walk runs straight up it and the dusk arrival turns
   once at the stair head. If the dusk arrival should not turn, the stair would have to move to the platform's
   east end, away from the quay's west end.

## Where the shift's state lives

*Answers open question 3 (2026-10-22). Engine support is built; the harbor shift itself has not moved.*

**What existed.** All scalar state is already one common root, `Save.gameplay[owner][localKey]`. Every scene's
`GameplaySession` reads and writes that root, and a state ID splits at its last dot into owner and key. A
declaration names its owner explicitly (`{owner, type, default, lifetime}`), so the owner never had to be the
scene. What was missing was a home for a declaration that belongs to no single scene. A scene could only declare
state in its own `gameplay.json`. Another scene could read it through `stateReads` (type only, read-only) or
declare an identical copy. The copy route meant one declaration in three files, kept equal only by a conflict
check. The prototype's progress is `shift:*` **flags** in `Save.flags`. Flags are global names with no owner,
type, default or lifetime, so they reach across zones, but they do not answer the question.

**Chosen approach: a world-level owner document.** [`world/state-owners.json`](../../world/state-owners.json)
(source document `state-owners`, editor *World › Shared state*) is a gameplay document that only declares state.
It declares `shift.tagReceived`, `shift.parcelDelivered`, `shift.caseReturned`, `shift.trolleyMoved` and
`shift.checkedOut` once. A zone's gameplay opts in with `"sharedState": ["shift"]`. Its commands, conditions,
queries and pickers then use those keys like their own. `validateGameplay` adds the owner's declarations to
the compiled definition. Source keeps only the reference: `sourceGameplay` strips the declarations again on
every typed edit. The rules:

- Only declared keys can be used. An unknown owner, a key missing from the document, a wrong value type,
  using a key without opting in, or a scene redeclaring or copying a `shift.*` declaration is rejected.
- Values live in `Save.gameplay.shift`. There is no new save field and no per-zone copy. Game serialization and
  lifetimes work as they do for any owner.
- Lifetime is `save` (or `interaction`). `session` is refused because each zone's session starts at first entry
  and would reset the key.
- Editor validation, grouped Save and private Play see the pending owners document (`withSharedState`).

**Why this is the one way.** It is the existing scalar owner with its declaration in one place. A shift object,
a story-level session, flags or a `harbor-shed` owner read by the others would each be a second store, or would
make two zones depend on a third. `stateReads` remains the way to only *look* at another scene's own state.
`shift:*` flags should become `shift.*` state when the prototype is split across the three zones.

**Not done yet.** Moving `harborShift`'s flags onto `shift.*`, and splitting its stations across
`harbor-checkout`, `harbor-yard` and `harbor-shed`. Play-fixture state presets cover only scene-owned keys so
far. Check: `pnpm test:game shared-state-owner`.
