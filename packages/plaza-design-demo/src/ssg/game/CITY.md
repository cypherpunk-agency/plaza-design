# ACCESS DENIED: the city

Decided with Tommi, 2026-10-15. The source of truth for how the city is built and how places
connect. ROADMAP.md says what gets built when; SCENES.md and STORY.md say what the places are.

## Four levels, the Monkey Island way

1. **City**: seven districts, stacked vertically as well as side by side.
2. **District**: a part of the city with its own character. Inside a district you walk between
   its places.
3. **Place**: a location. It has one scene or several (a rich person's house: the hall, the
   office, the kitchen, the cellar, the back yard). Inside a place you move by doors and stairs,
   with no map. Whether a place gets several scenes is decided case by case, as the story and
   the play need it; nothing forces it.
4. **Scene**: one walkable screen, on the hacking engine (devices, wiring, hack view), with its
   people, things to use, readables and exits. A scene with no devices is still a scene.

In code: `city.ts` has the districts (`DISTRICTS`), the places (`PLACES`: id, name, district,
entrance scene) and every scene's place (`SCENE_PLACE`); every scene is a `SceneDef` in
`scenes/index.ts` (`SCENES`), hosted on the engine whether it has devices or not.

## The vertical city

The city is a cross-section with three strata.

- **Overworld (the Spire)**: elite, high-tech, cold, few people and many robots. Reached only
  by sky elevator, sky taxi or dropship.
- **Street level**: regular life, all the classes side by side.
- **Underworld (the Undercity)**: canals, sewers and flooded basements, where the deleted live.
  Reached by drains, canal boats, service lifts and the metro's service tunnels.

## The seven districts

| District | Stratum | Character | Places (now ✓, and planned) |
| --- | --- | --- | --- |
| **Downtown** | street | working class, mixed, rain and neon | the street ✓ (noodle stall, kiosk); Capsule 7B tower ✓ (your flat; later the lobby and roof); the fixer's back yard ✓; Moth's building ✓ (flat 4C; later the stairwell); the corner shop ✓; J's penthouse; the billboard catwalk |
| **Neon Market / Old Quarter** | street | low life, packed, low-tech | the market ✓; the laundromat ✓; the ripperdoc clinic; the arcade and karaoke; the pawn shop; club VOID |
| **Galleria** | street (and up) | middle and upper-middle class, consumer, shiny | the mall ✓; the rooftop garden; gated condos; the Church of the Algorithm |
| **Harbor & Shore** | street (and water) | industrial and leisure, busy against calm | the harbor pier ✓; the warehouse; the beach ✓ (SALT, the pier, Moth's boat); the bridge |
| **The Spire / Plaza Central** | overworld | elite, cold, almost lifeless | Plaza Holdings HQ (lobby, floors, Sorel's office, the penthouse); the Registry office; the antenna; the sky-taxi depot |
| **Undercity** | underworld | the Ghosts, lantern-lit, low-tech | the canals; the sewer market; the flooded server basement; Ghost homes in the arches |
| **The Fringe** | street, edge | devoid of life, robots only | a dead automated factory; the data cemetery; the recycling plant |

The metro (LINE 0) runs through the street districts; its stations are places of their own
(Downtown ✓, Galleria ✓, Harbor ✓).

## Contrast is planned, not left to chance

- **Calm against packed**: the beach at sunset and the data cemetery against the market and the
  club.
- **Alive against dead**: the market and the beach against the Fringe and the Spire's empty
  floors.
- **High tech against low tech**: the Spire against the Undercity.
- **Class conflict at the seams**: the Galleria's gated condos border the market; the Spire's
  service lifts come down into the Undercity; cleaning robots and staff commute both ways.

## Ways between districts

- **On foot**: within a district, and across seams that touch (Downtown ↔ the market gate,
  the harbor pier ↔ the beach).
- **Metro**: between the street districts' stations.
- **Sky taxi, dropship, sky elevator**: up to the Spire.
- **Drains, canal boats, service lifts, metro service tunnels**: down to the Undercity.
- **The bridge**: Harbor & Shore to the Spire's foot.
- **Quick travel on the map**: to places you have visited, while you are not riding.

## The map

- The city map is the cross-section itself: the Spire on top, the street districts in the
  middle, the Undercity below. The ways between them are drawn as links: the metro, elevators,
  canals and taxi routes.
- Two zoom levels: the city shows districts; tapping a district shows its places. Quick travel
  goes to places.
- Inside a place there is no map: its scenes connect by doors.
- To be tested in the game and adjusted.

Built (test, 2026-10-15): `citymap.ts` draws it from `city.ts`'s map data.

- **City view**: each district a silhouette in its band (`DISTRICT_MAP`). LINE 0 runs in a tunnel
  under the street as a loop, its stations with stairs up; the market gate is green or red. A title
  block beside it names the district picked: stratum, character, places, ways.
- **You discover the map as you travel** (decided with Tommi, 2026-10-15; `city.ts`, "what you
  know of the city"). Each district has a stage (`districtStage`):
  - *unknown*: a dim block and `???`, no record;
  - *heard*: its short name and a dark silhouette (its shape as seen from the street), no record;
  - *known*: lit, its full name and its note.

  A district is known once you have been in one of its places (or the flag `mapped:<district>`),
  heard once you have been in a district listed in its `near` (`DISTRICT_REVEAL`: the street
  districts see their neighbours) or by the flag `heard:<district>`. The Undercity has no `near`:
  it stays unknown until the story sets `heard:undercity` or you find a way down.
  **The Spire is a mystery at first**: it is a landmark, so its silhouette is drawn from the start,
  but its tag says `???` and its record says nothing. It is *heard* once you have stood in the
  Galleria (the sky elevator's housing is on the mall's roof) or at the harbor (its foot stands in
  the bay), or when the story sets `heard:spire`; *known* once you have been up there (a Spire
  place) or the story sets `mapped:spire`.
  Places show once seen: visited, or their way in in plain view from a scene you have been in
  (`PLACE_IN_VIEW`); the counter reads "N OF M KNOWN PLACES VISITED". Ways show once seen (a
  link's `at` scenes); planned ways (`LINKS` with state 'planned': sky elevator, taxi depot, bridge,
  drain, service tunnel, canal outfall, service lift, the road to the Fringe) are not drawn at all.
  LINE 0's loop shows once you have stood on a platform or ridden it; from the street, only the
  station under its stairs. Taxi pads show once seen (in taxi mode all of them). Sudo (`unlockAll`)
  sets `heard:` and `mapped:` for every district.
- **District view**: arrows or a tap pick a district, E or the tap zooms into it. The places you
  know of hang on pins (`PLACE_MAP`) with a card each along the bottom; a visited place you can reach is cyan
  and E, a click or a second tap goes there. ESC, `< CITY` or a tap outside goes back; TAB or M
  closes.
- **Taxi**: the city view with the pads cyan; pick a stand and fly. **On the metro**: the train runs
  on the loop with you on it; quick travel says why not while it moves.
- The map draws in its own units (about 300 tall), so its text reads the same at 1280 × 720 as on
  a phone; on a phone the strip and footer keep clear of the ESC button.
