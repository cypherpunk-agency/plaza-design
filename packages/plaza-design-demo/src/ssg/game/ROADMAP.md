# ACCESS DENIED: roadmap

One list for the story levels (LEVELS.md, PUZZLES.md, STORY.md) and the new places
(SCENES.md). Story first: Act I has priority, and the places come in when the story or the
city needs them. Built places are marked ✓.

The city's structure (city → district → place → scene, the vertical cross-section, the map) is
decided: see CITY.md. New places wait for the map redesign, so each lands in its district.

## Now: the engine and the screen

1. Popup feedback: everyday actions close the popup; captions in a lane with a leader line and a
   paced queue; pings; max 3 everyday actions; the popup as a plate on a line up from the thing
   (5B, engine/popup.ts). ✓
2. One kind of place, called **scene**: every place is a scene (`SceneDef`, scenes/index.ts),
   hosted one way on the engine (engine/). ✓ (The people kit is now the **character kit**,
   characters.ts: done.)
3. The camera nudge (test): when something reacts off-screen, the view leans toward it, or an
   edge ping points there. ✓
4. A tone pass over older content (the world is dry, the characters have the humour), and the
   small known issues. ✓

## Then: the city

5. The city in code (districts → places → scenes, CITY.md: city.ts `DISTRICTS`, `PLACES`,
   `SCENE_PLACE`) ✓, then the map redesign as a vertical cross-section with two zoom levels ✓
   (citymap.ts), revealed as you travel (the Spire a mystery at first) ✓. Open: the district
   crop on a landscape phone, whether TAB opens your own district.

## The opening: intro and tutorial (decided, Tommi 2026-10-15)

The game opens on the night you are deleted. Exposition by showing: the city works for you
once, then stops.

1. **The glide (title + intro).** Launching the game shows a sunrise over the sea (retrowave
   palms, water, parallax); the main menu appears over it. NEW GAME: the menu fades and the same
   shot starts moving, no cut, no flicker, not skippable. The camera glides west: beach → harbor
   (STS-2, the stacks) → the Spire's foot as a nameless silhouette → the Galleria → Downtown's
   towers swallowing the sun → it catches LINE 0 diving into its tunnel. CONTINUE / LOAD: a cut
   straight into the save.
2. **The train home (teach walking, talking).** Dawn, the end of your night shift as a courier.
   Passengers, news, ads. Nothing else to do. Get off at Downtown.
3. **Downtown, before (the full working street).** The turnstile hesitates ("verifying… ok"),
   the till takes your key, doors open, CONCIERGE greets you by name. Scenes take a `before`
   state from a save flag.
4. **The flat, the breather (teach everyday actions).** Kettle, blinds, Pixel. You sleep.
5. **Morning: deleted.** The door says "rent: pending"; everyday actions don't help. Moth's
   message brings `uplink.so`: hacking unlocks as the first quest. Then Capsule 7B's puzzles.

Guidance: the scene leads (one way on, people facing it, signs), the GOAL line, and an **idle
ping** on the next goal target after ~20 s standing still, in the opening scenes only for now.

## Act I: where is Moth?

| # | Level | Puzzle | Place (district) | Status |
| --- | --- | --- | --- | --- |
| 1 | Capsule 7B | P01–P03 | your flat (Downtown) | ✓ |
| 2 | Downtown I–III | handle, till, 0x2F, relay, the market gate (P12) | the street (Downtown) | ✓ |
| 3 | The back yard | the parcel | the fixer's yard (Downtown) | ✓ |
| 4 | Moth's place | P09, P10 | flat 4C (Downtown) | ✓ |
| 5 | Washer 3 | P13 | the laundromat (Neon Market) | ✓ |
| 6 | **The stop that isn't on the map** | P14 | the metro line | next |
| 7 | **NRLU 404 0451** (Act I finale) | P15 | the harbor stacks, STS-2, and the **warehouse** (Harbor & Shore) | next |

**Decided for the rest of Act I (Tommi, 2026-10-15):**
- **The harbor is locked until P14.** LINE 0 passes the harbor station (STATION CLOSED) and the
  sky taxi won't fly there; the only way in is pulling the brake at the siding. After that the
  harbor station (and the taxi) open for good. Downtown ↔ Galleria runs as now.
- **Moth's jacket (P13)** holds the maglev pass (`maglev.pass`) and the right glove. The pass is
  what makes the brake accept your pull: the emergency is registered in Moth's name, the pass
  says you're the friend. Without it: "emergency registered to another passenger."
- **The finale is the stacks:** find NRLU 404 0451 with STS-2's camera, get it lifted past the
  scanner, Moth answers from the reefer. The **warehouse** is built now as a locked place by the
  stacks; its evidence locker is Act II (fragment 3).
- **The ending:** a short talk with Moth at the container (deleted on purpose; the list is split
  into seven root fragments; the Registry knows Moth has it), an ACT II card, Moth joins your
  deck as a contact, and the Spire gets its name on the map (`heard:spire`).

Optional puzzles that sit on Act I's way: O05 the market billboard cipher, O07 the metro
junction cabinet, O08/O09 the mall lift and the **rooftop garden**, O10 the music box (metro
LOST+FOUND), O11 the wishing fountain. The beach (✓) and its locked boat lead into Act II.

## Act II: seven fragments (an open hub)

The city opens. Each fragment sits with a faction and a place; Moth helps from your deck.

| Fragment | Place (district) | Faction |
| --- | --- | --- |
| 1 | rooftop relay 0x31 (Downtown) ✓ | the Registry |
| 2 | J's penthouse, O04 (Downtown) | the Registry, an insider |
| 3 | the **warehouse**'s evidence locker (Harbor & Shore) | the Tide / the Registry |
| 4 | **club VOID**'s back room (Neon Market) | the Ghosts, Lux |
| 5 | the **Church of the Algorithm** (Galleria) | the Church |
| 6 | NEOBANK's vault of dead accounts (the net) | PENNY |
| 7 | Sorel's office in Plaza Central (the Spire) | Plaza Holdings |

Places that open with Act II: **the canals** and the **sewer market** (the Undercity, the Ghosts'
home), Moth's boat at the beach (inside), the **bridge** (Harbor ↔ the Spire), the **sky-taxi
depot** and the **dropship** (travel to the Spire), the **ripperdoc clinic** and the
**arcade/karaoke** (Neon Market), the **billboard catwalk** (Downtown's roofs), the **flooded
server basement** (the Undercity).

## Act III: the antenna

The **Registry office** (a bureaucracy maze, the watchdog's home), Plaza Holdings HQ floor by
floor, the antenna, and the server room where you were revoked: `> free` or `> take` (and the
Daemons' third way).

## Side places, any time they fit

The Fringe (a dead automated factory, the data cemetery, the recycling plant), a capsule hotel,
a food court, a hospital ward, a police checkpoint.
