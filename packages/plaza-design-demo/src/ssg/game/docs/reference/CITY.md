# ACCESS DENIED: the city

See [ROADMAP.md](../../ROADMAP.md) for the consolidated build sequence and
[PROLOGUE-ACT-I-PLAN.md](../design/PROLOGUE-ACT-I-PLAN.md) for the detailed new encounter order.

> For revised act access, see [PROGRESSION-CONCEPT.md](../design/PROGRESSION-CONCEPT.md) (2026-10-16): guided harbor employment in the prologue, Downtown as the Act I focus, and broader travel later. The act assignments and job-location discussion below reflect the older design. Earlier harbor access is compatible with losing permission to return after deletion.

Working city design, developed with Tommi from 2026-10-15. It describes the current structure
and proposed places; everything remains open to redesign. Code (`city.ts`, `cityplan.ts`) shows
what is implemented. ROADMAP.md tracks status; SCENES.md and STORY.md add ideas and context.

## Four levels, the Monkey Island way

1. **City**: nine districts, stacked vertically as well as side by side.
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

## The nine districts and their places

Decided with Tommi, 2026-10-15 (the catalogue). Every district gets interesting things; essential
kinds (streets, homes, shops, bars and food, police, care) appear in several districts at their
own class level, so the same need looks different across the city. The Old Quarter is its own
district now (no longer part of the Neon Market), and the **Skyport** is a ninth. Code has
all nine districts in `city.ts`; some have no playable places yet.

### How much the player is asked to take in

Not every place is a level. Each place has a **tier**:

- **H, hero**: several scenes, puzzles, story. About 15–20 in the whole game.
- **V, visit**: one scene with people, look-ats, one small use, maybe an optional puzzle. About 30–40.
- **B, backdrop**: seen, not entered: scenery in a scene or the glide, a sign with a dry line, a
  pin on the map with one line. Any B can be promoted to V later.

Three rules keep it readable: **one goal at a time** (the HUD's GOAL; everything else is optional,
and a place you can't use yet says why in one line); **acts open districts** (below); **the map
reveals as you go** (above). Sets (`sets/`, ART-GUIDE.md §12) make the B places cheap.

**Act** is when a place opens: I, II, III, or *any* (open whenever its district is).

### 1. Downtown: working class, the core (Act I)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The street ✓ (noodle stall, kiosk) | H | I | rain, neon, the Ring highway's shadow overhead |
| Capsule 7B ✓ (your flat; later the lobby, the courtyard with washing lines, the roof) | H | I | capsule living |
| Moth's building ✓ (flat 4C; later the stairwell) | H | I | the old walk-up |
| The back yard ✓ | H | I | |
| The corner shop ✓ | V | I | |
| The public library ✓ | H | I | P16 |
| The metro station ✓ (LINE 0) | V | I | |
| FRESHCO supermarket | V | any | the self-checkout that accuses you |
| The 24h diner | V | any | the night shift's breakfast at dawn |
| The Registry service point | V | II | a job centre with a queue |
| The police precinct | V | II | |
| The substation | B | any | hums; the relay's power |
| J's penthouse ○ | H | II | fragment 2, rich and poor in one block |
| The billboard catwalk ○ | V | II | change what the city reads |

### 2. Old Quarter: the old town on the canal (Act II)

The Old Quarter runs along the canal to its mouth on the west shore, where the beach is (Tommi,
2026-10-22: the beach in the west, the harbor in the east; the beach no longer joins the quay).

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The beach ✓ (SALT, the pier), on the west shore | H | I | moved here from the harbor, 2026-10-22 |
| The surf school, the beach hotel | B | any | |
| Canal Street | H | II | stone bridges, banks, LINE 1's station |
| Tenements and houseboats | V | II | old living, old neighbours |
| St. Agnes | V | II | the last church that takes cash; an ageing congregation |
| The residents' association | V | II | against demolition; meets in a back room |
| The chess club, the pigeon fanciers (O06), the allotments | B/V | any | special interests |
| The variety theatre | V | II | old stage, new holo-acts |
| The family restaurant | V | any | |
| The old school | B | any | half closed |
| The public bathhouse | V | any | the poor's spa; everyday: wash day |
| The volunteer fire brigade | V | II | the city's robots don't come here |

### 3. Neon Market: nightlife, low life (Act I)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The market ✓ | H | I | |
| The laundromat ✓ | H | I | P13; everyday: waiting for the wash |
| The dive bar | V | any | |
| The capsule hotel | V | any | |
| The pachinko and casino hall | V | II | the illegal one |
| The hackers' meetup | V | II | a front for the Ghosts |
| The cyborg fight club | V | II | |
| The rooftop shacks | B | any | |
| The unlicensed sky-taxi pad | V | II | |
| The ripperdoc ○ | V | II | how Moth got the deck implant |
| The arcade and karaoke ○ | V | II | |
| The pawn shop ○ | V | II | buys memories by the megabyte |
| Club VOID ○ | H | II | fragment 4 |

### 4. Galleria: middle class, consumer, culture (Act I via the metro)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The mall ✓, its metro station ✓ | H | I | O08 |
| The plaza and wishing fountain (O11) | V | I | the ID gate, the escalator (as in the glide); everyday: the score-check queue |
| The rooftop garden ○ | V | I | O09 |
| The premium grocer, the food court | V | any | |
| The NEOBANK branch | V | II | fragment 6's door in the real world |
| The Church of the Algorithm ○ | H | II | fragment 5 |
| The museum (of the analogue age) | V | II | |
| The cinema and concert hall | B | any | |
| Plaza Academy | V | II | admission by score |
| The conference centre | V | II | VERIFYCON is on |
| The business hotel | B | any | |
| The wellness spa | V | II | tiers by score |
| The park | V | any | grass rented by the hour |
| The gated condos ○ | V | II | the seam with the market |
| The private hospital | V | II | |
| The police checkpoint | V | II | at the market seam |

### 5. Harbor & Shore: logistics and leisure (Act I, after P14)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The harbor pier ✓ and the stacks ✓ | H | I | P15 |
| Warehouse 4 ✓ (outside; the hall and locker ○) | H | II | fragment 3 |
| The port gate and port office | V | I | everyday: shift change at the gate |
| The drone logistics hub | V | II | the delivery fleet (DISPATCH) |
| The dry dock, the desalination plant | B | any | |
| The container ship | V | II | boardable |
| The cruise terminal and liner | V | II | |
| The ferry pier | V | II | to the Spire's foot |
| The fish market and fishing boats | V | any | |
| The sailors' bar | V | any | |
| The harbor patrol | B | any | customs |
| Moth's boat ○ | V | II | |
| The bridge ○ | V | II | |

### 6. The Spire / Plaza Central: the elite (Act II up, Act III)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| Plaza Holdings HQ ○ (lobby, floors, the penthouse) | H | III | |
| Sorel's office ○ | H | II | fragment 7 |
| The Registry office ○ | H | III | the watchdog's home |
| The antenna ○, the server room ○ | H | III | the ending |
| The sky-taxi depot ○, decks 1 and 2 | V | II | |
| The sky elevator | V | II | its housing on the mall's roof |
| The sky apartments | B | any | |
| The luxury hotel | V | II | |
| The high-roller casino | V | II | the legal one |
| The oxygen spa | B | any | |
| The sky garden | V | II | real trees |
| The robot restaurant | V | II | served by robots only |
| Wingsuits off the decks | B | any | gliding |

### 7. Undercity: the deleted (Act II)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The canals ○ (boat taxis) | H | II | |
| The Ghosts' homes in the arches ○ | H | II | the slum |
| The sewer market ○ | V | II | everyday: trading |
| The flooded server basement ○ | H | II | the UNDERNET's home |
| The pumping station and the outfall | V | II | a way down from the bay |
| The shrine of the deleted | V | II | |
| The free clinic | V | II | run by the Ghosts |

### 8. The Fringe: industry and waste (Act II, side)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The dead automated factory ○ | V | II | |
| The recycling plant ○ | V | II | |
| The power plant | B | any | |
| The landfill | V | II | garbage robots; everyday: the garbage run |
| The data cemetery ○ | H | II | memorial servers of the dead |
| The vertical farms | V | II | robot-run, one human farmer |
| The cargo field, Fringe Depot (LINE 1's end) | V | II | |
| The truck stop | V | II | the Ring highway's end: a diner and a motel |
| The wastelands and the camp of the deleted | V | II | |

### 9. Skyport and the Exclusion Zone (backdrop; late)

| Place | Tier | Act | What |
| --- | --- | --- | --- |
| The space port (launch pads, terminal) | B | any | launches seen from all over the city |
| The military exclusion zone (fence, checkpoint, barracks, drones) | B | III? | beyond the Fringe; may open late |

### Open

- **Your night job.** The opening has you come home on LINE 0 at dawn after a night shift. The
  harbor is shut until P14 (its station is "closed until the siding"), so the job can't be there in
  Act I. Proposal: the Galleria's night cleaning crew (on LINE 0, open in Act I; working class
  cleaning up after the middle class).
- Whether the Fringe holds a story piece (the data cemetery, a list of names?).

The metro runs through the street districts: LINE 0 (the loop: Downtown ✓, Galleria ✓, Harbor ✓)
and LINE 1, the Canal Line (Beach, Fringe Depot, Old Quarter, Canal Street, Harbor Shore), with bus 7
and the ferry; interchanges are marked on the map (the street-map draft).

## Ways to move

- **On the ground**: walking, LINE 0 and LINE 1, bus 7, cabs, the Ring highway and its trucks.
- **Flying**: sky taxis between pads, dropships, drones, the shuttle from the space port.
- **On the water**: the ferry, canal boat taxis, swimming out to the buoy, diving at the harbor.
- **Gliding**: wingsuits off the Spire's decks, a paraglider at the beach.
- **Elevators**: the sky elevator, the Spire's service lifts into the Undercity, freight lifts.

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
  and, until the harbor zones are rebuilt, the harbor pier's BEACH exit; the map no longer draws a
  shore path, since the beach is now at the other end of the city).
- **Metro**: between the street districts' stations.
- **Sky taxi, dropship, sky elevator**: up to the Spire.
- **Drains, canal boats, service lifts, metro service tunnels**: down to the Undercity.
- **The bridge**: Harbor & Shore to the Spire's foot.
- **Quick travel on the map**: to places you have visited, while you are not riding.

## The map

- The city map is a **street plan** of the whole city, tilted back so the towers stand up (or
  flat), with four layers: STREET, METRO, ABOVE, BELOW. The strata are layers now, not bands of
  a cross-section: ABOVE is the Spire's airspace and the air traffic, BELOW the tunnels, canals
  and the Undercity.
- Two zoom levels: the city shows districts; tapping a district zooms the same map into it and
  shows its places. Quick travel goes to places.
- Inside a place there is no map: its scenes connect by doors.

Built (2026-10-15, from the approved draft E): `cityplan.ts` traces the plan, `citymap.ts` draws
it, both from `city.ts`'s map data.

- **The plan** (`cityplan.ts`, plan units 844 × 390, x east, y south): the coast with the sea
  east of it (the harbor), the west shore with the open sea in the south-west (`WEST`: the beach),
  the Spire's island in the bay, the canal from its mouth on the west shore through the Old Quarter
  into the bay, the avenues (AVENUE 0, REGISTRY ROAD, OLD QUARTER LANE, GALLERIA WAY, SKYLINE DRIVE,
  DOCK ROAD, THE RING highway, LAUNCH ROAD to the Skyport), Circle Park, the Skyport's fence.
  Each district has a centre its streets grow from (`DISTRICT_MAP`); the land is shared out to
  the nearest centre (`districtAt`).
- **The streets** are one network traced through a direction field (one term per district's
  character: Downtown's warped grid and the ring round Circle Park, the market's skew, the
  Galleria's diagonal, streets following the shore and the canal, the Fringe loose, the Skyport a
  military grid). A spatial hash keeps streets of a family apart (`sep` per district); each dead
  end is carried on until it meets another street, the shore or the canal's bank; Chaikin
  smoothing. Streets never cross water; only the avenues cross the canal, on bridges. No
  randomness but a hash, so it is the same every time. It is traced once, lazily, the first time
  the map opens (well under a frame's budget on a desktop), and each view's ground (land,
  streets, towers) is painted once into an offscreen canvas and only blitted after; what moves is
  drawn each frame.
- **Tilted** (default, T toggles FLAT): towers extruded by the district's density, windows lit in
  its colour where the district is known, black where it is only heard of. The Spire stands on its
  island (the set from `sets/spire.ts`). Landmarks stand as scenery once their district is heard:
  the Galleria's dome and the Church of the Algorithm, the harbor's cranes, SALT and its palms,
  the market's arch and Club VOID, the Registry's sign, St. Agnes and the variety theatre, the
  Fringe's chimneys and vertical farm, the Skyport's gantry and its launches. Boats on the water:
  barges on the canal, ships at the quay and out at sea, the patrol, fishing boats (the ferry only
  once known).
- **Layers** (tabs, 1–4 or L): STREET. METRO: LINE 0's loop and its moving trains once you have
  stood on a platform (else only the stations seen from the street); interchange roundels with
  chips (L0, TAXI, and the other lines once known); the harbor station says CLOSED UNTIL THE
  SIDING until P14. LINE 1 (Canal Line), bus 7 and the ferry are not travel yet: each is drawn only
  once the story sets `heard:line1` / `heard:bus7` / `heard:ferry` (`LINES_PLANNED`; sudo sets
  them). ABOVE: the pads you have stood at, air traffic by kind (taxis, Registry patrols, delivery
  drones, corporate shuttles, cargo, medevac) between districts you have heard of, the Spire's
  restricted airspace. BELOW: LINE 0's tunnel, the canal and (once heard of) the culverts and the
  Undercity's arches.
- **You discover the map as you travel** (decided with Tommi, 2026-10-15; `city.ts`, "what you
  know of the city"). Each district has a stage (`districtStage`):
  - *unknown*: veiled, `???`, no record;
  - *heard*: dark (faint dashed streets, black towers) and its short name, no record;
  - *known*: lit, its full name and its note.

  A district is known once you have been in one of its places (or the flag `mapped:<district>`),
  heard once you have been in a district listed in its `near` (`DISTRICT_REVEAL`) or by the flag
  `heard:<district>`. The Old Quarter is heard from the market and from Downtown. The Undercity
  has no `near`: it stays unknown until the story sets `heard:undercity` or you find a way down.
  **The Spire and the Skyport are landmarks**: drawn from the start (you see them from anywhere),
  but `???` until heard. The Spire is heard from the Galleria or the harbor (or `heard:spire`),
  known once you have been up there; the Skyport only by the story (`heard:skyport`).
  Places show once seen: visited, or their way in in plain view from a scene you have been in
  (`PLACE_IN_VIEW`); the counter reads "N OF M KNOWN PLACES VISITED". Ways show once seen (a
  link's `at` scenes); planned ways are not drawn. Sudo (`unlockAll`) sets `heard:` and `mapped:`
  for all nine districts and the not-yet lines.
- **District view**: arrows or a tap pick a district (hover names it, and names a place's pin),
  E or the tap zooms into it with a smooth pan and zoom of the same map. The places you know of
  hang on pins (`PLACE_MAP`) with a card each along the bottom; a visited place you can reach is
  cyan and E, a click or a second tap goes there. ESC, `< CITY` or a tap outside goes back; TAB or
  M closes.
- **Taxi** (a stand): the ABOVE layer with the pads cyan (the harbor's red until P14); pick one and
  fly. **On the metro**: the METRO layer, the train on the loop with you on it; quick travel says
  why not while it moves.
- The map draws in its own units (about 300 tall), so its text reads the same at 1280 × 720 as on
  a phone; on a phone the strip and footer keep clear of the ESC/MENU button. Reduced motion
  stills everything that moves.
- The build checks the plan (`planProblems`): every place, station and pad stands on land, in its
  own district and inside its district's frame.
