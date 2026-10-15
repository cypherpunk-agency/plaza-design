# ACCESS DENIED: roadmap

One list for the story levels (LEVELS.md, PUZZLES.md, STORY.md) and the new places
(SCENES.md). Story first: Act I has priority, and the places come in when the story or the
city needs them. Built places are marked ✓.

The city's structure (city → district → place → scene, the vertical cross-section, the map) is
decided: see CITY.md. New places wait for the map redesign, so each lands in its district.

## Now: the engine and the screen

1. Popup feedback: everyday actions close the popup; device captions with a leader line; pings;
   the popup beside the device, away from what it affects; max 3 everyday actions. (running)
2. One kind of place, called **scene**: every place is a scene (`SceneDef`, scenes/index.ts),
   hosted one way on the engine (engine/). ✓ (The people kit is now the **character kit**,
   characters.ts: done.)
3. The camera nudge (test): when something reacts off-screen, the view leans toward it, or an
   edge ping points there.
4. A tone pass over older content (the world is dry, the characters have the humour), and the
   small known issues.

## Then: the city

5. The city in code (districts → places → scenes, CITY.md: city.ts `DISTRICTS`, `PLACES`,
   `SCENE_PLACE`) ✓, then the map redesign as a vertical cross-section with two zoom levels (to
   be tested and adjusted).

## Act I: where is Moth?

| # | Level | Puzzle | Place (district) | Status |
| --- | --- | --- | --- | --- |
| 1 | Capsule 7B | P01–P03 | your flat (Downtown) | ✓ |
| 2 | Downtown I–III | handle, till, 0x2F, relay, the market gate (P12) | the street (Downtown) | ✓ |
| 3 | The back yard | the parcel | the fixer's yard (Downtown) | ✓ |
| 4 | Moth's place | P09, P10 | flat 4C (Downtown) | ✓ |
| 5 | **Washer 3** | P13 | the laundromat (Neon Market) | next |
| 6 | **The stop that isn't on the map** | P14 | the metro line | next |
| 7 | **NRLU 404 0451** (Act I finale) | P15 | the harbor stacks, STS-2, and the **warehouse** (Harbor & Shore) | next |

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
